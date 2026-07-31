import { env } from "@/lib/env";
import { verifyCheckMacValue } from "./checkMacValue";
import {
  buildAioCheckOutParams,
  buildPeriodParams,
  type EcpayCredentials,
} from "./params";
import type {
  CheckoutRedirect,
  CreateCheckoutParams,
  CreatePeriodCheckoutParams,
  PaymentNotification,
  PaymentProvider,
} from "../types";

// 真綠界 provider:填好 ECPAY_* 環境變數即可使用(測試環境 payment-stage.ecpay.com.tw)。

function cred(): EcpayCredentials {
  return {
    merchantId: env.ECPAY_MERCHANT_ID,
    hashKey: env.ECPAY_HASH_KEY,
    hashIV: env.ECPAY_HASH_IV,
  };
}

function parsePaymentDate(s: string | undefined): Date | null {
  if (!s) return null;
  // 綠界格式 yyyy/MM/dd HH:mm:ss(台北時間)
  const m = s.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  return new Date(
    `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+08:00`
  );
}

export const ecpayProvider: PaymentProvider = {
  async createCheckout(p: CreateCheckoutParams): Promise<CheckoutRedirect> {
    return {
      actionUrl: `${env.ECPAY_BASE_URL}/Cashier/AioCheckOut/V5`,
      method: "POST",
      fields: buildAioCheckOutParams(p, cred(), new Date()),
    };
  },

  async createPeriodCheckout(p: CreatePeriodCheckoutParams): Promise<CheckoutRedirect> {
    return {
      actionUrl: `${env.ECPAY_BASE_URL}/Cashier/AioCheckOut/V5`,
      method: "POST",
      fields: buildPeriodParams(p, cred(), new Date()),
    };
  },

  verifyWebhook(body: Record<string, string>): boolean {
    return verifyCheckMacValue(body, env.ECPAY_HASH_KEY, env.ECPAY_HASH_IV);
  },

  parseWebhook(body, kind): PaymentNotification {
    if (kind === "period") {
      // 定期定額每期結果:RtnCode=1 成功;gwsr 為每期唯一編號
      return {
        kind,
        merchantTradeNo: body.MerchantTradeNo ?? "",
        success: body.RtnCode === "1",
        gwTradeNo: body.gwsr ?? body.TradeNo ?? "",
        amountTwd: Number(body.amount ?? body.TradeAmt ?? 0),
        paidAt: parsePaymentDate(body.process_date ?? body.PaymentDate),
        gwAuthCode: body.gwsr ?? undefined,
        raw: body,
      };
    }
    return {
      kind,
      merchantTradeNo: body.MerchantTradeNo ?? "",
      success: body.RtnCode === "1",
      gwTradeNo: body.TradeNo ?? "",
      amountTwd: Number(body.TradeAmt ?? 0),
      paidAt: parsePaymentDate(body.PaymentDate),
      raw: body,
    };
  },

  async cancelPeriod(gwPeriodTradeNo: string): Promise<void> {
    // 綠界信用卡定期定額解約:CreditCardPeriodAction(Action=Cancel)。
    const params: Record<string, string> = {
      MerchantID: env.ECPAY_MERCHANT_ID,
      MerchantTradeNo: gwPeriodTradeNo,
      Action: "Cancel",
      TimeStamp: String(Math.floor(Date.now() / 1000)),
    };
    const { generateCheckMacValue } = await import("./checkMacValue");
    params.CheckMacValue = generateCheckMacValue(
      params,
      env.ECPAY_HASH_KEY,
      env.ECPAY_HASH_IV
    );
    const res = await fetch(
      `${env.ECPAY_BASE_URL}/Cashier/CreditCardPeriodAction`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params).toString(),
      }
    );
    const text = await res.text();
    if (!text.includes("RtnCode=1")) {
      throw new Error(`綠界定期定額解約失敗:${text}`);
    }
  },

  webhookAck(): string {
    return "1|OK";
  },
};
