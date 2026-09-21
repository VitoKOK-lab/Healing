import { one, newId, now } from "@/lib/db";

// LIFF 會員的讀寫。集中在這裡,因為「找到或建立」這件事四支路由都要做,
// 各寫一份遲早會走鐘(尤其是 displayName 要不要覆蓋這種細節)。

export type TarotUser = {
  id: string;
  lineUserId: string;
  displayName: string | null;
  deepenCredits: number;
  streak: number;
  lastDailyDate: string | null;
  createdAt: string;
};

/**
 * 找到這個 LINE 使用者,沒有就建一個。
 *
 * displayName 用 COALESCE(新值, 舊值):LINE 有時候不給名字,
 * 那種時候不能把已經存好的名字蓋成空的。
 *
 * 用 ON CONFLICT 而不是「先查再決定要不要 INSERT」——後者在兩個請求
 * 同時進來時會雙雙認為自己該 INSERT,然後其中一個撞 unique 而失敗。
 */
export async function upsertUser(
  lineUserId: string,
  displayName?: string | null
): Promise<TarotUser> {
  const row = await one<TarotUser>(
    `INSERT INTO TarotUser (id, lineUserId, displayName, deepenCredits, streak, createdAt)
     VALUES (?, ?, ?, 0, 0, ?)
     ON CONFLICT(lineUserId) DO UPDATE SET
       displayName = COALESCE(excluded.displayName, TarotUser.displayName)
     RETURNING *`,
    newId(),
    lineUserId,
    displayName ?? null,
    now()
  );
  if (!row) {
    // RETURNING 一定會給一列,拿不到代表寫入本身失敗了
    throw new Error("建立會員失敗");
  }
  return row;
}

/** 只查不建。沒有就回 null(呼叫端通常要回 401)。 */
export function findUserByLine(lineUserId: string): Promise<TarotUser | null> {
  return one<TarotUser>(`SELECT * FROM TarotUser WHERE lineUserId = ?`, lineUserId);
}
