import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";

export type CancelResult = { ok: true } | { ok: false; error: string };

/**
 * 取消訂閱:向金流解除定期定額約定,狀態改 CANCELED。
 * 已付期間(currentPeriodEnd 之前)仍可觀看——授權規則在 lib/entitlements/access.ts。
 */
export async function cancelSubscription(
  subscriptionId: string,
  actingUserId: string,
  opts: { asAdmin?: boolean } = {}
): Promise<CancelResult> {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub) return { ok: false, error: "找不到訂閱紀錄。" };
  if (!opts.asAdmin && sub.userId !== actingUserId) {
    return { ok: false, error: "沒有權限操作此訂閱。" };
  }
  if (sub.status === "CANCELED") return { ok: true };
  if (sub.status === "PENDING") {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "CANCELED", canceledAt: new Date() },
    });
    return { ok: true };
  }

  if (sub.gwPeriodTradeNo) {
    try {
      await getPaymentProvider().cancelPeriod(sub.gwPeriodTradeNo);
    } catch (e) {
      return {
        ok: false,
        error: "金流端解約失敗,請稍後再試或聯繫客服。",
      };
    }
  }
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "CANCELED", canceledAt: new Date() },
  });
  return { ok: true };
}
