import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";
import { processPeriodNotification } from "@/lib/orders/fulfillment";

// 綠界定期定額「每期」扣款結果 webhook(PeriodReturnURL,第 2 期起)。
// 以 gwsr(每期唯一編號)做冪等鍵。

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const body: Record<string, string> = {};
  for (const [k, v] of form.entries()) body[k] = String(v);

  const provider = getPaymentProvider();
  if (!provider.verifyWebhook(body)) {
    return new NextResponse("0|CheckMacValue verify failed", { status: 400 });
  }

  const n = provider.parseWebhook(body, "period");
  const dedupeKey = `ecpay:period:${n.merchantTradeNo}:${n.gwAuthCode ?? n.gwTradeNo}`;

  try {
    await prisma.webhookEvent.create({
      data: { provider: "ecpay", dedupeKey, payload: JSON.stringify(body) },
    });
  } catch {
    return new NextResponse(provider.webhookAck());
  }

  const result = await processPeriodNotification(n);
  await prisma.webhookEvent.update({
    where: { dedupeKey },
    data: { processedAt: new Date(), result },
  });

  return new NextResponse(provider.webhookAck());
}
