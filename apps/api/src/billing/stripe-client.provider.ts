import { type FactoryProvider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

import { STRIPE_API_VERSION } from "../config/billing.config";
import { STRIPE_CLIENT } from "./billing.tokens";

export const stripeClientProvider: FactoryProvider<Stripe | null> = {
  provide: STRIPE_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Stripe | null => {
    if (!config.get<boolean>("billing.enabled")) {
      return null;
    }

    return new Stripe(config.getOrThrow<string>("billing.stripeSecretKey"), {
      apiVersion: STRIPE_API_VERSION,
    });
  },
};
