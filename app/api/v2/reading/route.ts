import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

// 付費四段式最壞情況 = 生成 3 次 + 方向二次分類,30~60 秒;
// Vercel 函式預設 10 秒會砍頭,這裡放寬到 60。
export const maxDuration = 60;
import { one, run, newId, now } from "@/lib/db";
import { findUserByLine } from "@/lib/tarot/users";
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
  const user = await findUserByLine(identity.userId);
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  type ReadingRow = {
    id: string; userId: string; level: string; spreadId: string;
    topic: string | null; question: string | null; cardsJson: string;
    tier: string; seedNonce: string; status: string; text: string | null;
  };
  let reading = await one<ReadingRow>(`SELECT * FROM Reading WHERE id = ?`, readingId);
  if (!reading || reading.userId !== user.id) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  // NT$20 加深:日抽那張牌展開成四段式。扣一點 deepenCredits,開新 Reading。
  if (upgrade === "deepen") {
    if (reading.level !== "daily") {
      return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
    }
    // 扣額度用「WHERE deepenCredits > 0」一句解決。
    //
    // 原本是先查餘額再扣,那中間有空隙:兩個請求同時進來會雙雙看到還有 1 點、
    // 雙雙扣掉,變成用一點換兩次加深。把條件寫進 UPDATE 就沒有那個空隙——
    // 只有真正改到列的那一次算數。
    const took = await run(
      `UPDATE TarotUser SET deepenCredits = deepenCredits - 1
        WHERE id = ? AND deepenCredits > 0`,
      user.id
    );
    if (took === 0) {
      return NextResponse.json({ ok: false, error: "no_credits" }, { status: 402 });
    }

    const deepenId = newId();
    await run(
      `INSERT INTO Reading
         (id, userId, level, spreadId, topic, question, cardsJson, tier, seedNonce, status, createdAt)
       VALUES (?, ?, 'deepen', ?, ?, ?, ?, ?, ?, 'drawn', ?)`,
      deepenId,
      user.id,
      reading.spreadId,
      reading.topic,
      reading.question,
      reading.cardsJson,
      reading.tier,
      reading.seedNonce,
      now()
    );
    reading = { ...reading, id: deepenId, level: "deepen", status: "drawn", text: null };
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
    const paid = await one<{ id: string }>(
      `SELECT id FROM Purchase
        WHERE userId = ? AND kind = 'deep' AND status = 'paid' AND readingId = ?
        LIMIT 1`,
      user.id,
      reading.id
    );
    if (!paid) {
      return NextResponse.json({ ok: false, error: "payment_required" }, { status: 402 });
    }
  }

  const cards = JSON.parse(reading.cardsJson) as Drawn[];

  // 本喵記得你(v1):上一筆已生成占卜的匿名摘要
  let historySummary: string | null = null;
  if (reading.level !== "daily") {
    const prev = await one<{ cardsJson: string; topic: string | null; tier: string }>(
      `SELECT cardsJson, topic, tier FROM Reading
        WHERE userId = ? AND status != 'drawn' AND id != ?
        ORDER BY createdAt DESC
        LIMIT 1`,
      user.id,
      reading.id
    );
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

  await run(
    `UPDATE Reading SET text = ?, status = ? WHERE id = ?`,
    result.text,
    result.fallback ? "fallback" : "generated",
    reading.id
  );

  return NextResponse.json({
    ok: true,
    readingId: reading.id,
    level: reading.level,
    tier: reading.tier,
    text: result.text,
    fallback: result.fallback,
  });
}
