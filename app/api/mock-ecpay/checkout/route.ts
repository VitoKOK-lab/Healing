import { NextRequest, NextResponse } from "next/server";
import { verifyCheckMacValue } from "@/lib/payments/ecpay/checkMacValue";
import { MOCK_CREDENTIALS } from "@/lib/payments/mock/provider";
import { env } from "@/lib/env";

// 假綠界入口:接收 AioCheckOut 的 POST 表單(頁面元件讀不到 POST body,所以用 route handler),
// 驗證 CheckMacValue 後 303 轉向假付款頁(參數放 query)。

export async function POST(req: NextRequest) {
  if (env.PAYMENT_PROVIDER !== "mock") {
    return new NextResponse("mock gateway disabled", { status: 404 });
  }
  const form = await req.formData();
  const body: Record<string, string> = {};
  for (const [k, v] of form.entries()) body[k] = String(v);

  if (!verifyCheckMacValue(body, MOCK_CREDENTIALS.hashKey, MOCK_CREDENTIALS.hashIV)) {
    return new NextResponse("0|CheckMacValue verify failed", { status: 400 });
  }

  const url = new URL("/mock-ecpay/checkout", env.APP_BASE_URL);
  const passthrough = [
    "MerchantTradeNo",
    "TotalAmount",
    "ItemName",
    "TradeDesc",
    "ReturnURL",
    "ClientBackURL",
    "PeriodReturnURL",
    "PeriodAmount",
    "PeriodType",
  ];
  for (const key of passthrough) {
    if (body[key]) url.searchParams.set(key, body[key]);
  }
  return NextResponse.redirect(url, 303);
}
