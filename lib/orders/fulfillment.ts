import { prisma } from "@/lib/prisma";
import type { PaymentNotification } from "@/lib/payments";

// 付款結果履約:由 webhook 呼叫。冪等由 WebhookEvent.dedupeKey unique 保證,
// 這裡再以訂單狀態做第二層防護(已 PAID 不重複發授權)。

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  const day = r.getDate();
  r.setMonth(r.getMonth() + months);
  // 月底溢位(1/31 + 1 月 → 3/3)修正為當月最後一天
  if (r.getDate() < day) r.setDate(0);
  return r;
}

export async function processOneTimeNotification(
  n: PaymentNotification
): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { orderNo: n.merchantTradeNo },
    include: { items: true, giftCode: true, subscription: true },
  });
  if (!order) return `unknown order ${n.merchantTradeNo}`;
  if (order.status === "PAID") return "already paid";

  const paidAt = n.paidAt ?? new Date();

  if (!n.success) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "FAILED", rawReturn: JSON.stringify(n.raw) },
      });
      if (order.giftCode && order.giftCode.status === "PENDING_PAYMENT") {
        await tx.giftCode.update({
          where: { id: order.giftCode.id },
          data: { status: "VOID" },
        });
      }
      if (order.subscription && order.subscription.status === "PENDING") {
        await tx.subscription.update({
          where: { id: order.subscription.id },
          data: { status: "CANCELED", canceledAt: paidAt },
        });
      }
    });
    return "marked failed";
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        gwTradeNo: n.gwTradeNo,
        paidAt,
        rawReturn: JSON.stringify(n.raw),
      },
    });

    if (order.kind === "PURCHASE") {
      const item = order.items.find((i) => i.itemKind === "COURSE");
      if (item?.courseId) {
        await tx.entitlement.upsert({
          where: {
            userId_courseId: { userId: order.userId, courseId: item.courseId },
          },
          update: {},
          create: {
            userId: order.userId,
            courseId: item.courseId,
            kind: "PURCHASE",
            sourceOrderId: order.id,
          },
        });
      }
    } else if (order.kind === "GIFT") {
      if (order.giftCode && order.giftCode.status === "PENDING_PAYMENT") {
        await tx.giftCode.update({
          where: { id: order.giftCode.id },
          data: { status: "ACTIVE" },
        });
      }
    } else if (order.kind === "SUBSCRIPTION_INIT") {
      if (order.subscription) {
        await tx.subscription.update({
          where: { id: order.subscription.id },
          data: {
            status: "ACTIVE",
            currentPeriodStart: paidAt,
            currentPeriodEnd: addMonths(paidAt, 1),
          },
        });
        await tx.subscriptionPayment.create({
          data: {
            subscriptionId: order.subscription.id,
            gwAuthCode: n.gwAuthCode ?? n.gwTradeNo ?? "init",
            amountTwd: n.amountTwd,
            status: "PAID",
            paidAt,
            raw: JSON.stringify(n.raw),
          },
        });
      }
    }
  });
  return "fulfilled";
}

/** 定期定額每期扣款結果(第 2 期起;第 1 期走 ReturnURL) */
export async function processPeriodNotification(
  n: PaymentNotification
): Promise<string> {
  const sub = await prisma.subscription.findFirst({
    where: { gwPeriodTradeNo: n.merchantTradeNo },
    include: { payments: true },
  });
  if (!sub) return `unknown period contract ${n.merchantTradeNo}`;

  const paidAt = n.paidAt ?? new Date();
  const authCode = n.gwAuthCode ?? n.gwTradeNo;
  if (authCode && sub.payments.some((p) => p.gwAuthCode === authCode)) {
    return "duplicate period payment";
  }

  if (!n.success) {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: "PAST_DUE" },
      });
      await tx.subscriptionPayment.create({
        data: {
          subscriptionId: sub.id,
          gwAuthCode: authCode || null,
          amountTwd: n.amountTwd,
          status: "FAILED",
          paidAt,
          raw: JSON.stringify(n.raw),
        },
      });
    });
    return "period payment failed";
  }

  await prisma.$transaction(async (tx) => {
    const base =
      sub.currentPeriodEnd && sub.currentPeriodEnd > paidAt
        ? sub.currentPeriodEnd
        : paidAt;
    await tx.subscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        currentPeriodEnd: addMonths(base, 1),
      },
    });
    await tx.subscriptionPayment.create({
      data: {
        subscriptionId: sub.id,
        gwAuthCode: authCode || null,
        amountTwd: n.amountTwd,
        status: "PAID",
        paidAt,
        raw: JSON.stringify(n.raw),
      },
    });
  });
  return "period extended";
}
