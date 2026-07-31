import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCheckMacValue } from "@/lib/payments/ecpay/checkMacValue";
import { MOCK_CREDENTIALS } from "@/lib/payments/mock/provider";
import { formatTradeDate } from "@/lib/payments/ecpay/params";
import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/auth/dal";

// 開發/管理工具:對某訂閱「立刻觸發下一期扣款」的模擬 webhook,
// 用來測試續扣與扣款失敗,不用等一個月。body: { subscriptionId, outcome? }

export async function POST(req: NextRequest) {
  if (env.PAYMENT_PROVIDER !== "mock") {
    return new NextResponse("mock gateway disabled", { status: 404 });
  }
  await requireAdmin();

  const { subscriptionId, outcome = "success" } = await req.json();
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { series: true },
  });
  if (!sub?.gwPeriodTradeNo) {
    return NextResponse.json({ error: "訂閱不存在或無定期定額約定" }, { status: 404 });
  }

  const now = new Date();
  const success = outcome === "success";
  const payload: Record<string, string> = {
    MerchantID: MOCK_CREDENTIALS.merchantId,
    MerchantTradeNo: sub.gwPeriodTradeNo,
    RtnCode: success ? "1" : "10100252",
    RtnMsg: success ? "定期定額扣款成功(模擬)" : "定期定額扣款失敗(模擬)",
    gwsr: `GW${Date.now().toString().slice(-8)}`,
    amount: String(sub.series.monthlyPriceTwd ?? 0),
    process_date: formatTradeDate(now),
    PeriodType: "M",
  };
  payload.CheckMacValue = generateCheckMacValue(
    payload,
    MOCK_CREDENTIALS.hashKey,
    MOCK_CREDENTIALS.hashIV
  );

  const res = await fetch(`${env.APP_BASE_URL}/api/payments/ecpay/period-return`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload).toString(),
  });
  const ack = await res.text();
  return NextResponse.json({ ok: ack === "1|OK", ack });
}
