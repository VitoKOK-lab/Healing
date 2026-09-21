import { NextRequest, NextResponse } from "next/server";
import { one, all, run, newId, now } from "@/lib/db";
import { upsertUser } from "@/lib/tarot/users";
import { verifyLineToken } from "@/lib/line/verify";
import { taipeiDateString } from "@/lib/tarot/daily";

// 額度與狀態(LIFF 進站第一個呼叫):加深額度、streak、今天抽了沒、圖鑑進度。

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const accessToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const identity = await verifyLineToken(accessToken);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const user = await upsertUser(identity.userId, identity.displayName);

  const today = taipeiDateString();
  const [todayDraw, seen] = await Promise.all([
    one<{ readingId: string }>(
      `SELECT readingId FROM DailyDraw WHERE userId = ? AND date = ?`,
      user.id,
      today
    ),
    all<{ cardN: number }>(`SELECT cardN FROM CardSeen WHERE userId = ?`, user.id),
  ]);

  return NextResponse.json({
    ok: true,
    deepenCredits: user.deepenCredits,
    streak: user.streak,
    drawnToday: Boolean(todayDraw),
    todayReadingId: todayDraw?.readingId ?? null,
    collection: { seen: seen.length, total: 78, cards: seen.map((s) => s.cardN) },
  });
}
