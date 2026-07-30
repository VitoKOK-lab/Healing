import { env } from "@/lib/env";
import { verifyCheckMacValue } from "../ecpay/checkMacValue";
import {
  buildAioCheckOutParams,
  buildPeriodParams,
  type EcpayCredentials,
} from "../ecpay/params";
import type {
  CheckoutRedirect,
  CreateCheckoutParams,
  CreatePeriodCheckoutParams,
  PaymentNotification,
  PaymentProvider,
} from "../types";
import { ecpayProvider } from "../ecpay/provider";

// 模擬綠界:走「完全相同」的參數組裝與 CheckMacValue 簽章程式路徑,
// 只是把跳轉目標換成本站的假綠界付款頁(/api/mock-ecpay/checkout)。
// 因此之後切換到真綠界時,所有上下游程式(結帳、webhook、履約)都不需要改。

export const MOCK_CREDENTIALS: EcpayCredentials = {
  merchantId: "2000132",
  hashKey: "5294y06JbISpM5x9",
  hashIV: "v77hoKGq4kWxNNIS",
};

export const mockEcpayProvider: PaymentProvider = {
  async createCheckout(p: CreateCheckoutParams): Promise<CheckoutRedirect> {
    return {
      actionUrl: `${env.APP_BASE_URL}/api/mock-ecpay/checkout`,
      method: "POST",
      fields: buildAioCheckOutParams(p, MOCK_CREDENTIALS, new Date()),
    };
  },

  async createPeriodCheckout(p: CreatePeriodCheckoutParams): Promise<CheckoutRedirect> {
    return {
      actionUrl: `${env.APP_BASE_URL}/api/mock-ecpay/checkout`,
      method: "POST",
      fields: buildPeriodParams(p, MOCK_CREDENTIALS, new Date()),
    };
  },

  verifyWebhook(body: Record<string, string>): boolean {
    return verifyCheckMacValue(body, MOCK_CREDENTIALS.hashKey, MOCK_CREDENTIALS.hashIV);
  },

  // 回傳欄位格式與真綠界一致,解析邏輯直接沿用
  parseWebhook(body, kind): PaymentNotification {
    return ecpayProvider.parseWebhook(body, kind);
  },

  async cancelPeriod(_gwPeriodTradeNo: string): Promise<void> {
    // 模擬環境無真實約定可解,直接視為成功
  },

  webhookAck(): string {
    return "1|OK";
  },
};
