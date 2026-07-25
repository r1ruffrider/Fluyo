import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type Stripe from "stripe";

import { STRIPE_CLIENT } from "./billing.tokens";
import { StripeWebhookProcessorService } from "./stripe-webhook-processor.service";
import {
  isSupportedStripeWebhookType,
  type StripeWebhookResponse,
  type SupportedStripeWebhookType,
} from "./stripe-webhook.types";

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe | null,
    private readonly processor: StripeWebhookProcessorService,
    private readonly config: ConfigService,
  ) {}

  async receive(rawBody: Buffer, signature: string | undefined): Promise<StripeWebhookResponse> {
    const webhookSecret = this.config.get<string>("billing.stripeWebhookSecret");

    if (!this.stripe || !webhookSecret) {
      throw new ServiceUnavailableException("Billing webhooks are not configured");
    }

    if (!signature) {
      this.logger.warn("Rejected Stripe webhook without a signature");
      throw new BadRequestException("Invalid Stripe webhook signature");
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      this.logger.warn("Rejected Stripe webhook with an invalid signature");
      throw new BadRequestException("Invalid Stripe webhook signature");
    }

    if (!isSupportedStripeWebhookType(event.type)) {
      this.logger.debug(`Ignored unsupported Stripe event ${event.id} (${event.type})`);
      return { received: true, duplicate: false, processed: false };
    }

    const subscription = await this.resolveSubscription(event, event.type);
    const result = await this.processor.process(
      event.id,
      event.type,
      subscription,
      new Date(event.created * 1_000),
    );

    this.logger.log(
      `${result.duplicate ? "Replayed" : "Processed"} Stripe event ${event.id} (${event.type})`,
    );

    return { received: true, ...result };
  }

  private async resolveSubscription(
    event: Stripe.Event,
    eventType: SupportedStripeWebhookType,
  ): Promise<Stripe.Subscription | null> {
    const subscriptionReference = this.subscriptionReference(event, eventType);

    if (!subscriptionReference) {
      return null;
    }

    const subscriptionId =
      typeof subscriptionReference === "string" ? subscriptionReference : subscriptionReference.id;

    try {
      return await this.stripe!.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      if (eventType === "customer.subscription.deleted") {
        return event.data.object as Stripe.Subscription;
      }

      throw error;
    }
  }

  private subscriptionReference(
    event: Stripe.Event,
    eventType: SupportedStripeWebhookType,
  ): string | Stripe.Subscription | null {
    switch (eventType) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        return session.mode === "subscription" ? session.subscription : null;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        return (event.data.object as Stripe.Subscription).id;
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        return invoice.parent?.subscription_details?.subscription ?? null;
      }
    }
  }
}
