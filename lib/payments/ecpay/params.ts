import { generateCheckMacValue } from "./checkMacValue";
import type {
  CreateCheckoutParams,
  CreatePeriodCheckoutParams,
} from "../types";

// 綠界 AioCheckOut 參數組裝(純函式,可測試)。
// 注意:TotalAmount 必為整數、MerchantTradeNo ≤20 英數、日期格式 yyyy/MM/dd HH:mm:ss。

export function formatTradeDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export interface EcpayCredentials {
  merchantId: string;
  hashKey: string;
  hashIV: string;
}

export function buildAioCheckOutParams(
  p: CreateCheckoutParams,
  cred: EcpayCredentials,
  now: Date
): Record<string, string> {
  const params: Record<string, string> = {
    MerchantID: cred.merchantId,
    MerchantTradeNo: p.merchantTradeNo,
    MerchantTradeDate: formatTradeDate(now),
    PaymentType: "aio",
    TotalAmount: String(Math.round(p.amountTwd)),
    TradeDesc: p.tradeDesc,
    ItemName: p.itemName,
    ReturnURL: p.returnUrl,
    ClientBackURL: p.clientBackUrl,
    ChoosePayment: "Credit",
    EncryptType: "1",
  };
  params.CheckMacValue = generateCheckMacValue(params, cred.hashKey, cred.hashIV);
  return params;
}

export function buildPeriodParams(
  p: CreatePeriodCheckoutParams,
  cred: EcpayCredentials,
  now: Date
): Record<string, string> {
  const params: Record<string, string> = {
    MerchantID: cred.merchantId,
    MerchantTradeNo: p.merchantTradeNo,
    MerchantTradeDate: formatTradeDate(now),
    PaymentType: "aio",
    TotalAmount: String(Math.round(p.amountTwd)), // 定期定額:此為「每期」金額
    TradeDesc: p.tradeDesc,
    ItemName: p.itemName,
    ReturnURL: p.returnUrl,
    ClientBackURL: p.clientBackUrl,
    ChoosePayment: "Credit",
    EncryptType: "1",
    PeriodAmount: String(Math.round(p.amountTwd)),
    PeriodType: p.periodType,
    Frequency: String(p.frequency),
    ExecTimes: String(p.execTimes),
    PeriodReturnURL: p.periodReturnUrl,
  };
  params.CheckMacValue = generateCheckMacValue(params, cred.hashKey, cred.hashIV);
  return params;
}
