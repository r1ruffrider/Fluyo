import type {
  AuthenticatedIdentity,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
} from "@fluyo/shared";
import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

import { BillingPlanCatalogService } from "./billing-plan-catalog.service";
import { STRIPE_CLIENT } from "./billing.tokens";
import { StripeCustomerMappingsService } from "./stripe-customer-mappings.service";

@Injectable()
export class StripeCheckoutService {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe | null,
    private readonly catalog: BillingPlanCatalogService,
    private readonly customerMappings: StripeCustomerMappingsService,
    private readonly config: ConfigService,
  ) {}

  async createSession(
    identity: AuthenticatedIdentity,
    input: CreateCheckoutSessionRequest,
  ): Promise<CreateCheckoutSessionResponse> {
    if (!this.stripe) {
      throw new ServiceUnavailableException("Billing is not configured");
    }

    const plan = this.catalog.resolvePlan(input.planKey);
    const price = this.catalog.resolvePrice(input.planKey, input.interval);

    if (!plan || !price) {
      throw new BadRequestException("Unknown billing plan or interval");
    }

    try {
      const customerId = await this.findOrCreateCustomer(identity);
      const metadata = {
        plan_key: plan.key,
        supabase_user_id: identity.id,
      };
      const trial =
        plan.trialPeriodDays === null ? {} : { trial_period_days: plan.trialPeriodDays };
      const webOrigin = this.config.getOrThrow<string>("app.webOrigin");
      const session = await this.stripe.checkout.sessions.create({
        allow_promotion_codes: plan.promotionCodesAllowed,
        automatic_tax: { enabled: true },
        cancel_url: `${webOrigin}/pricing?checkout=cancelled`,
        client_reference_id: identity.id,
        customer: customerId,
        customer_update: { address: "auto" },
        line_items: [{ price: price.stripePriceId, quantity: 1 }],
        metadata,
        mode: "subscription",
        subscription_data: {
          metadata,
          ...trial,
        },
        success_url: `${webOrigin}/pricing?checkout=success`,
      });

      if (!session.url) {
        throw new Error("Stripe did not return a Checkout URL");
      }

      return { url: session.url };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException("Checkout is temporarily unavailable");
    }
  }

  private async findOrCreateCustomer(identity: AuthenticatedIdentity): Promise<string> {
    const existingCustomerId = await this.customerMappings.findCustomerId(identity.id);

    if (existingCustomerId) {
      return existingCustomerId;
    }

    const customer = await this.stripe!.customers.create({
      ...(identity.email ? { email: identity.email } : {}),
      metadata: { supabase_user_id: identity.id },
    });
    await this.customerMappings.createMapping(identity.id, customer.id);

    return customer.id;
  }
}
