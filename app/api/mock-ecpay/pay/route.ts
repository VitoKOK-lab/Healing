import { NextRequest, NextResponse } from "next/server";
import { generateCheckMacValue } from "@/lib/payments/ecpay/checkMacValue";
import { MOCK_CREDENTIALS } from "@/lib/payments/mock/provider";
import { formatTradeDate } from "@/lib/payments/ecpay/params";
import { env } from "@/lib/env";

// 假綠界「確認付款」:模擬綠界背景行為——
// 由伺服器將 ECPay 格式的結果 POST 到本站 webhook(ReturnURL),
// 需讀到 "1|OK" 回應;之後把瀏覽器導回 ClientBackURL。

export async function POST(req: NextRequest) {
  if (env.PAYMENT_PROVIDER !== "mock") {
    return new NextResponse("mock gateway disabled", { status: 404 });
  }
  const form = await req.formData();
  const merchantTradeNo = String(form.get("MerchantTradeNo") ?? "");
  const totalAmount = String(form.get("TotalAmount") ?? "0");
  const returnUrl = String(form.get("ReturnURL") ?? "");
  const clientBackUrl = String(form.get("ClientBackURL") ?? "/");
  const outcome = String(form.get("outcome") ?? "success");
  const isPeriod = Boolean(form.get("PeriodType"));

  if (!merchantTradeNo || !returnUrl.startsWith(env.APP_BASE_URL)) {
    return new NextResponse("bad request", { status: 400 });
  }

  const now = new Date();
  const success = outcome === "success";
  const tradeNo = `MOCK${Date.now().toString().slice(-10)}`;

  const payload: Record<string, string> = {
    MerchantID: MOCK_CREDENTIALS.merchantId,
    MerchantTradeNo: merchantTradeNo,
    RtnCode: success ? "1" : "10100252",
    RtnMsg: success ? "交易成功" : "拒絕交易(模擬)",
    TradeNo: tradeNo,
    TradeAmt: totalAmount,
    PaymentDate: success ? formatTradeDate(now) : "",
    PaymentType: "Credit_CreditCard",
    TradeDate: formatTradeDate(now),
    SimulatePaid: "0",
  };
  if (isPeriod && success) {
    // 首期授權成功時,綠界會附上定期定額欄位
    payload.PeriodType = String(form.get("PeriodType"));
    payload.PeriodAmount = String(form.get("PeriodAmount") ?? totalAmount);
    payload.gwsr = `GW${Date.now().toString().slice(-8)}`;
    payload.amount = totalAmount;
    payload.process_date = formatTradeDate(now);
  }
  payload.CheckMacValue = generateCheckMacValue(
    payload,
    MOCK_CREDENTIALS.hashKey,
    MOCK_CREDENTIALS.hashIV
  );

  const res = await fetch(returnUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload).toString(),
  });
  const ack = await res.text();
  if (ack !== "1|OK") {
    return new NextResponse(`webhook 未回應 1|OK(收到:${ack})`, { status: 502 });
  }

  return NextResponse.redirect(clientBackUrl, 303);
}
