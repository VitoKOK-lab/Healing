// 金流抽象層:介面完全依綠界(ECPay)的實際流程塑形,
// mock 與真綠界共用同一套呼叫方式,上線只需切換 PAYMENT_PROVIDER。

/** AioCheckOut 跳轉:回傳一組要以 POST form 自動送出的欄位(含 CheckMacValue) */
export interface CheckoutRedirect {
  actionUrl: string;
  method: "POST";
  fields: Record<string, string>;
}

export interface CreateCheckoutParams {
  merchantTradeNo: string;
  amountTwd: number;
  itemName: string;
  tradeDesc: string;
  returnUrl: string; // server-to-server webhook
  clientBackUrl: string; // 付款完成後瀏覽器返回頁
}

export interface CreatePeriodCheckoutParams extends CreateCheckoutParams {
  periodReturnUrl: string; // 每期扣款結果 webhook
  periodType: "M";
  frequency: 1;
  execTimes: number; // 執行次數上限(綠界月繳最多 99)
}

export interface PaymentNotification {
  kind: "one-time" | "period";
  merchantTradeNo: string;
  success: boolean;
  gwTradeNo: string;
  amountTwd: number;
  paidAt: Date | null;
  /** 定期定額:每期扣款唯一編號(gwsr) */
  gwAuthCode?: string;
  raw: Record<string, string>;
}

export interface PaymentProvider {
  createCheckout(p: CreateCheckoutParams): Promise<CheckoutRedirect>;
  createPeriodCheckout(p: CreatePeriodCheckoutParams): Promise<CheckoutRedirect>;
  /** 驗證 webhook 的 CheckMacValue */
  verifyWebhook(body: Record<string, string>): boolean;
  parseWebhook(body: Record<string, string>, kind: "one-time" | "period"): PaymentNotification;
  /** 取消定期定額約定(mock 為 no-op;真綠界呼叫 CreditCardPeriodAction) */
  cancelPeriod(gwPeriodTradeNo: string): Promise<void>;
  /** 綠界要求 webhook 成功時回應的字面內容 */
  webhookAck(): string;
}
