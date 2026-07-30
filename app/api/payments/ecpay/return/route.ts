import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";
import { processOneTimeNotification } from "@/lib/orders/fulfillment";

// 綠界一次性付款結果 webhook(ReturnURL)。
// 冪等:WebhookEvent.dedupeKey unique;重複通知直接回 1|OK 不重複履約。
// 成功必須回應字面 "1|OK",否則綠界會持續重送。

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const body: Record<string, string> = {};
  for (const [k, v] of form.entries()) body[k] = String(v);

  const provider = getPaymentProvider();
  if (!provider.verifyWebhook(body)) {
    return new NextResponse("0|CheckMacValue verify failed", { status: 400 });
  }

  const n = provider.parseWebhook(body, "one-time");
  const dedupeKey = `ecpay:aio:${n.merchantTradeNo}:${n.gwTradeNo}:${n.success ? 1 : 0}`;

  try {
    await prisma.webhookEvent.create({
      data: { provider: "ecpay", dedupeKey, payload: JSON.stringify(body) },
    });
  } catch {
    // unique 衝突 = 已處理過
    return new NextResponse(provider.webhookAck());
  }

  const result = await processOneTimeNotification(n);
  await prisma.webhookEvent.update({
    where: { dedupeKey },
    data: { processedAt: new Date(), result },
  });

  return new NextResponse(provider.webhookAck());
}
