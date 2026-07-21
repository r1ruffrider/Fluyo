import type { AuthenticatedIdentity, CreatePortalSessionResponse } from "@fluyo/shared";
import {
  BadGatewayException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

import { STRIPE_CLIENT } from "./billing.tokens";
import { StripeCustomerMappingsService } from "./stripe-customer-mappings.service";

@Injectable()
export class StripeCustomerPortalService {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe | null,
    private readonly customerMappings: StripeCustomerMappingsService,
    private readonly config: ConfigService,
  ) {}

  async createSession(identity: AuthenticatedIdentity): Promise<CreatePortalSessionResponse> {
    if (!this.stripe) {
      throw new ServiceUnavailableException("Billing is not configured");
    }

    let customerId: string | null;

    try {
      customerId = await this.customerMappings.findCustomerId(identity.id);
    } catch {
      throw new BadGatewayException("Billing account lookup is temporarily unavailable");
    }

    if (!customerId) {
      throw new NotFoundException("No billing account exists for this user");
    }

    try {
      const portalConfigurationId = this.config.get<string>("billing.stripePortalConfigurationId");
      const webOrigin = this.config.getOrThrow<string>("app.webOrigin");
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${webOrigin}/billing`,
        ...(portalConfigurationId ? { configuration: portalConfigurationId } : {}),
      });

      if (!session.url) {
        throw new Error("Stripe did not return a Portal URL");
      }

      return { url: session.url };
    } catch {
      throw new BadGatewayException("Customer Portal is temporarily unavailable");
    }
  }
}
