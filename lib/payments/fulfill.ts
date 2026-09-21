import { one, run, now } from "@/lib/db";

// 入帳(冪等):同一筆 Purchase 只有第一次從 pending → paid 會發放權益。
// LINE Pay 真接上後 webhook/confirm 重送也不會重複加值——
// updateMany 帶 status: "pending" 條件,搶到的那一次才算數。

export async function fulfillPurchase(purchaseId: string): Promise<"fulfilled" | "already" | "not_found"> {
  const purchase = await one<{ userId: string; kind: string; status: string }>(
    `SELECT userId, kind, status FROM Purchase WHERE id = ?`,
    purchaseId
  );
  if (!purchase) return "not_found";
  if (purchase.status === "paid") return "already";

  // WHERE 帶 status='pending':兩個請求同時進來時,只有一個會改到列。
  // 這就是那把鎖——不是靠先查再寫,那中間會有空隙。
  const claimed = await run(
    `UPDATE Purchase SET status = 'paid', paidAt = ? WHERE id = ? AND status = 'pending'`,
    now(),
    purchaseId
  );
  if (claimed === 0) return "already"; // 並發下輸給另一個請求:對方已入帳

  if (purchase.kind === "deepen") {
    await run(
      `UPDATE TarotUser SET deepenCredits = deepenCredits + 1 WHERE id = ?`,
      purchase.userId
    );
  }
  // kind === "deep":不加額度——reading 路由直接查這筆 paid Purchase 解鎖
  return "fulfilled";
}
