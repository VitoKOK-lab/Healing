import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyLineToken } from "@/lib/line/verify";
import { generateReading } from "@/lib/tarot/generate";
import type { Drawn } from "@/lib/tarot/draw";
import type { Tier } from "@/lib/tarot/tier";
import type { Level } from "@/lib/tarot/prompts";
import { ANGLES } from "@/lib/tarot/prompts";

// 解讀生成(規格 §3、§4)。三個層級的付費門檻:
//   daily  → 免費
//   deepen → 建立時已扣 deepenCredits(NT$20 購買或 streak 連七獎勵入帳)
//   deep   → 需有已付款的 Purchase(P8 LINE Pay/mock 入帳);未付款回 402
// upgrade=deepen:把日抽那張牌展開成四段式——同一副牌、新的一筆 Reading。

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const { accessToken, readingId, upgrade } = (body ?? {}) as {
    accessToken?: unknown;
    readingId?: unknown;
    upgrade?: unknown;
  };
  if (typeof accessToken !== "string" || typeof readingId !== "string") {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const identity = await verifyLineToken(accessToken);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const user = await prisma.tarotUser.findUnique({ where: { lineUserId: identity.userId } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let reading = await prisma.reading.findUnique({ where: { id: readingId } });
  if (!reading || reading.userId !== user.id) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  // NT$20 加深:日抽那張牌展開成四段式。扣一點 deepenCredits,開新 Reading。
  if (upgrade === "deepen") {
    if (reading.level !== "daily") {
      return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
    }
    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.tarotUser.findUnique({ where: { id: user.id } });
      if (!fresh || fresh.deepenCredits <= 0) return null;
      await tx.tarotUser.update({
        where: { id: user.id },
        data: { deepenCredits: { decrement: 1 } },
      });
      return tx.reading.create({
        data: {
          userId: user.id,
          level: "deepen",
          spreadId: reading!.spreadId,
          topic: reading!.topic,
          question: reading!.question,
          cardsJson: reading!.cardsJson,
          tier: reading!.tier,
          seedNonce: reading!.seedNonce,
        },
      });
    });
    if (!result) {
      return NextResponse.json({ ok: false, error: "no_credits" }, { status: 402 });
    }
    reading = result;
  }

  if (reading.status !== "drawn") {
    // 已生成過:直接回存好的文本與牌面(冪等;前端重進頁面時要重現牌)
    return NextResponse.json({
      ok: true,
      readingId: reading.id,
      level: reading.level,
      tier: reading.tier,
      text: reading.text,
      cards: JSON.parse(reading.cardsJson),
      fallback: reading.status === "fallback",
    });
  }

  // 深度占卜要先付款(P8 之前只有 mock provider 能入帳)
  if (reading.level === "deep") {
    const paid = await prisma.purchase.findFirst({
      where: { userId: user.id, kind: "deep", status: "paid", readingId: reading.id },
    });
    if (!paid) {
      return NextResponse.json({ ok: false, error: "payment_required" }, { status: 402 });
    }
  }

  const cards = JSON.parse(reading.cardsJson) as Drawn[];

  // 本喵記得你(v1):上一筆已生成占卜的匿名摘要
  let historySummary: string | null = null;
  if (reading.level !== "daily") {
    const prev = await prisma.reading.findFirst({
      where: { userId: user.id, status: { not: "drawn" }, id: { not: reading.id } },
      orderBy: { createdAt: "desc" },
    });
    if (prev) {
      const prevCards = (JSON.parse(prev.cardsJson) as Drawn[])
        .slice(0, 3)
        .map((c) => `${c.name}${c.orientation === "reversed" ? "逆位" : ""}`)
        .join("、");
      historySummary = `${prev.topic ? `問${prev.topic}` : "占卜"},抽到${prevCards},定調 ${prev.tier}`;
    }
  }

  // 切入角度由 readingId 決定:可回溯、不用 Math.random
  const seedAngle = createHash("sha256").update(reading.id).digest()[0] % ANGLES.length;

  const result = await generateReading(
    {
      level: reading.level as Level,
      cards,
      spreadId: reading.spreadId,
      tier: reading.tier as Tier,
      topic: reading.topic,
      question: reading.question,
      historySummary,
    },
    { seedAngle }
  );

  await prisma.reading.update({
    where: { id: reading.id },
    data: { text: result.text, status: result.fallback ? "fallback" : "generated" },
  });

  return NextResponse.json({
    ok: true,
    readingId: reading.id,
    level: reading.level,
    tier: reading.tier,
    text: result.text,
    fallback: result.fallback,
  });
}
