import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { BillingController } from "./billing.controller";
import { billingPlanDefinitionsProvider } from "./billing-plan-definitions.provider";
import { BillingPlanCatalogService } from "./billing-plan-catalog.service";
import { EntitlementsService } from "./entitlements.service";
import { stripeClientProvider } from "./stripe-client.provider";
import { StripeCheckoutService } from "./stripe-checkout.service";
import { StripeCustomerPortalService } from "./stripe-customer-portal.service";
import { StripeCustomerMappingsService } from "./stripe-customer-mappings.service";
import { StripeWebhookController } from "./stripe-webhook.controller";
import { StripeWebhookEventLedgerService } from "./stripe-webhook-event-ledger.service";
import { StripeWebhookProcessorService } from "./stripe-webhook-processor.service";
import { StripeWebhookService } from "./stripe-webhook.service";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [BillingController, StripeWebhookController],
  providers: [
    billingPlanDefinitionsProvider,
    stripeClientProvider,
    BillingPlanCatalogService,
    EntitlementsService,
    StripeCheckoutService,
    StripeCustomerPortalService,
    StripeCustomerMappingsService,
    StripeWebhookEventLedgerService,
    StripeWebhookProcessorService,
    StripeWebhookService,
  ],
  exports: [
    BillingPlanCatalogService,
    EntitlementsService,
    StripeCheckoutService,
    StripeCustomerPortalService,
    StripeCustomerMappingsService,
    StripeWebhookEventLedgerService,
    StripeWebhookProcessorService,
    StripeWebhookService,
  ],
})
export class BillingModule {}
