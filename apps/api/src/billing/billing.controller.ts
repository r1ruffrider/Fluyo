import type {
  AuthenticatedIdentity,
  CreateCheckoutSessionResponse,
  CreatePortalSessionResponse,
} from "@fluyo/shared";
import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { CurrentIdentity } from "../auth/current-identity.decorator";
import { SupabaseJwtGuard } from "../auth/supabase-jwt.guard";
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";
import { CreatePortalSessionDto } from "./dto/create-portal-session.dto";
import { StripeCheckoutService } from "./stripe-checkout.service";
import { StripeCustomerPortalService } from "./stripe-customer-portal.service";

@Controller("billing")
export class BillingController {
  constructor(
    private readonly checkout: StripeCheckoutService,
    private readonly portal: StripeCustomerPortalService,
  ) {}

  @Post("checkout-sessions")
  @UseGuards(SupabaseJwtGuard)
  createCheckoutSession(
    @CurrentIdentity() identity: AuthenticatedIdentity,
    @Body() input: CreateCheckoutSessionDto,
  ): Promise<CreateCheckoutSessionResponse> {
    return this.checkout.createSession(identity, input);
  }

  @Post("portal-sessions")
  @UseGuards(SupabaseJwtGuard)
  createPortalSession(
    @CurrentIdentity() identity: AuthenticatedIdentity,
    @Body() input: CreatePortalSessionDto,
  ): Promise<CreatePortalSessionResponse> {
    void input;
    return this.portal.createSession(identity);
  }
}
