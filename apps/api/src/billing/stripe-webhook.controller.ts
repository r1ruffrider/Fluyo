import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import type { Request } from "express";

import { StripeWebhookService } from "./stripe-webhook.service";
import type { StripeWebhookResponse } from "./stripe-webhook.types";

@Controller("billing/webhooks")
export class StripeWebhookController {
  constructor(private readonly webhooks: StripeWebhookService) {}

  @Post("stripe")
  @HttpCode(HttpStatus.OK)
  receiveStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature?: string,
  ): Promise<StripeWebhookResponse> {
    if (!request.rawBody) {
      throw new BadRequestException("Stripe webhook body is unavailable");
    }

    return this.webhooks.receive(request.rawBody, signature);
  }
}
