export const SUPPORTED_STRIPE_WEBHOOK_TYPES = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
] as const;

export type SupportedStripeWebhookType = (typeof SUPPORTED_STRIPE_WEBHOOK_TYPES)[number];

export interface StripeWebhookProcessingResult {
  duplicate: boolean;
  processed: boolean;
}

export interface StripeWebhookResponse extends StripeWebhookProcessingResult {
  received: true;
}

export function isSupportedStripeWebhookType(
  eventType: string,
): eventType is SupportedStripeWebhookType {
  return (SUPPORTED_STRIPE_WEBHOOK_TYPES as readonly string[]).includes(eventType);
}
