import type { AuthenticatedIdentity, CreateCheckoutSessionResponse } from "@fluyo/shared";
import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { CurrentIdentity } from "../auth/current-identity.decorator";
import { SupabaseJwtGuard } from "../auth/supabase-jwt.guard";
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";
import { StripeCheckoutService } from "./stripe-checkout.service";

@Controller("billing")
export class BillingController {
  constructor(private readonly checkout: StripeCheckoutService) {}

  @Post("checkout-sessions")
  @UseGuards(SupabaseJwtGuard)
  createCheckoutSession(
    @CurrentIdentity() identity: AuthenticatedIdentity,
    @Body() input: CreateCheckoutSessionDto,
  ): Promise<CreateCheckoutSessionResponse> {
    return this.checkout.createSession(identity, input);
  }
}
