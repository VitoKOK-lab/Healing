import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const user = await prisma.tarotUser.upsert({
    where: { lineUserId: identity.userId },
    update: {},
    create: { lineUserId: identity.userId, displayName: identity.displayName },
  });

  const today = taipeiDateString();
  const [todayDraw, seen] = await Promise.all([
    prisma.dailyDraw.findUnique({ where: { userId_date: { userId: user.id, date: today } } }),
    prisma.cardSeen.findMany({ where: { userId: user.id }, select: { cardN: true } }),
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
