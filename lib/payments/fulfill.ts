import { prisma } from "@/lib/prisma";

// 入帳(冪等):同一筆 Purchase 只有第一次從 pending → paid 會發放權益。
// LINE Pay 真接上後 webhook/confirm 重送也不會重複加值——
// updateMany 帶 status: "pending" 條件,搶到的那一次才算數。

export async function fulfillPurchase(purchaseId: string): Promise<"fulfilled" | "already" | "not_found"> {
  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) return "not_found";
  if (purchase.status === "paid") return "already";

  const claimed = await prisma.purchase.updateMany({
    where: { id: purchaseId, status: "pending" },
    data: { status: "paid", paidAt: new Date() },
  });
  if (claimed.count === 0) return "already"; // 並發下輸給另一個請求:對方已入帳

  if (purchase.kind === "deepen") {
    await prisma.tarotUser.update({
      where: { id: purchase.userId },
      data: { deepenCredits: { increment: 1 } },
    });
  }
  // kind === "deep":不加額度——reading 路由直接查這筆 paid Purchase 解鎖
  return "fulfilled";
}
