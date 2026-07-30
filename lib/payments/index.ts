import { env } from "@/lib/env";
import type { PaymentProvider } from "./types";
import { mockEcpayProvider } from "./mock/provider";
import { ecpayProvider } from "./ecpay/provider";

export function getPaymentProvider(): PaymentProvider {
  return env.PAYMENT_PROVIDER === "ecpay" ? ecpayProvider : mockEcpayProvider;
}

export * from "./types";
