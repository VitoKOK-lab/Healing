import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyLineToken } from "@/lib/line/verify";
import { unsuitable } from "@/lib/tarot/unsuitable";
import { drawSpread, seedFrom } from "@/lib/tarot/draw";
import { tierOf } from "@/lib/tarot/tier";
import { spreadOf, SPREADS } from "@/lib/tarot/spreads";
import { taipeiDateString } from "@/lib/tarot/daily";
import { KEY_CARDS } from "@/lib/tarot/deck";

// 抽牌(規格 §2):前端只送切牌手勢,洗牌/正逆位/tier 全在這裡算。
// 回傳牌面與 tier(前端做特效分級用),不回解讀——解讀走 /api/v2/reading。

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const { accessToken, level, spreadId, topic, question, gesture } = (body ?? {}) as {
    accessToken?: unknown;
    level?: unknown;
    spreadId?: unknown;
    topic?: unknown;
    question?: unknown;
    gesture?: { cut?: unknown; trail?: unknown };
  };

  if (typeof accessToken !== "string" || (level !== "daily" && level !== "deep")) {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  const cut = typeof gesture?.cut === "number" ? gesture.cut : NaN;
  const trail = typeof gesture?.trail === "string" ? gesture.trail : "";
  if (!(cut >= 0 && cut <= 1) || !trail) {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const identity = await verifyLineToken(accessToken);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // 不適合占卜的題目:在任何扣款/扣額度之前擋下(規格 §1)
  const blocked = unsuitable(typeof question === "string" ? question : "");
  if (blocked) {
    return NextResponse.json(
      { ok: false, error: "unsuitable", kind: blocked.kind, lines: blocked.lines },
      { status: 422 }
    );
  }

  const user = await prisma.tarotUser.upsert({
    where: { lineUserId: identity.userId },
    update: identity.displayName ? { displayName: identity.displayName } : {},
    create: { lineUserId: identity.userId, displayName: identity.displayName },
  });

  // 免費日抽固定單張;深度占卜用客人選的牌陣(單張以外)
  const spread = level === "daily" ? SPREADS.single : spreadOf(typeof spreadId === "string" ? spreadId : "flow");
  if (level === "deep" && spread.id === "single") {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const today = taipeiDateString();
  if (level === "daily") {
    const existing = await prisma.dailyDraw.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
      });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "already_drawn_today", readingId: existing.readingId },
        { status: 409 }
      );
    }
  }

  // 種子 = 手勢 + 伺服器 nonce:同筆占卜可回溯重算,客戶端無法預測
  const nonce = randomUUID();
  const seed = seedFrom(`cut:${cut}|trail:${trail}`, nonce);
  const cards = drawSpread(spread.id, seed, cut);
  const tier = tierOf(cards, spread.id);

  const reading = await prisma.reading.create({
    data: {
      userId: user.id,
      level,
      spreadId: spread.id,
      topic: typeof topic === "string" ? topic.slice(0, 40) : null,
      question: typeof question === "string" ? question.slice(0, 200) : null,
      cardsJson: JSON.stringify(cards),
      tier,
      seedNonce: nonce,
    },
  });

  if (level === "daily") {
    await prisma.dailyDraw.create({
      data: { userId: user.id, date: today, readingId: reading.id },
    });
  }

  // 圖鑑:第一次抽到的牌點亮(skipDuplicates 讓重複牌零成本)
  await prisma.cardSeen.createMany({
    data: cards.map((c) => ({ userId: user.id, cardN: c.n })),
    skipDuplicates: true,
  });

  return NextResponse.json({
    ok: true,
    readingId: reading.id,
    spreadId: spread.id,
    tier,
    cards: cards.map((c) => ({
      n: c.n,
      name: c.name,
      keyword: c.keyword,
      position: c.position,
      positionHint: c.positionHint,
      orientation: c.orientation,
      meaning: c.meaning,
      major: c.major, // 特效 L1
      keyCard: KEY_CARDS.has(c.n), // 特效 L2
    })),
  });
}
