import { BILLING_INTERVALS, type BillingInterval } from "@fluyo/shared";
import { IsIn, IsString, Matches } from "class-validator";

export class CreateCheckoutSessionDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9_-]{1,99}$/u)
  planKey!: string;

  @IsIn(BILLING_INTERVALS)
  interval!: BillingInterval;
}
