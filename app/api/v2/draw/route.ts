import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { one, run, batch, newId, now } from "@/lib/db";
import { upsertUser } from "@/lib/tarot/users";
import { verifyLineToken } from "@/lib/line/verify";
import { unsuitable } from "@/lib/tarot/unsuitable";
import { drawSpread, seedFrom } from "@/lib/tarot/draw";
import { tierOf } from "@/lib/tarot/tier";
import { spreadOf, SPREADS } from "@/lib/tarot/spreads";
import { taipeiDateString, nextStreak } from "@/lib/tarot/daily";
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

  const user = await upsertUser(identity.userId, identity.displayName);

  // 免費日抽固定單張;深度占卜用客人選的牌陣(單張以外)
  const spread = level === "daily" ? SPREADS.single : spreadOf(typeof spreadId === "string" ? spreadId : "flow");
  if (level === "deep" && spread.id === "single") {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const today = taipeiDateString();
  if (level === "daily") {
    const existing = await one<{ readingId: string }>(
      `SELECT readingId FROM DailyDraw WHERE userId = ? AND date = ?`,
      user.id,
      today
    );
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

  // id 自己先產好,後面幾句要用到它(不必為了拿 id 多跑一次 RETURNING)
  const readingId = newId();
  await run(
    `INSERT INTO Reading
       (id, userId, level, spreadId, topic, question, cardsJson, tier, seedNonce, status, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'drawn', ?)`,
    readingId,
    user.id,
    level,
    spread.id,
    typeof topic === "string" ? topic.slice(0, 40) : null,
    typeof question === "string" ? question.slice(0, 200) : null,
    JSON.stringify(cards),
    tier,
    nonce,
    now()
  );

  // streak:昨天有抽 → 連續 +1,斷簽歸 1;每連滿 7 天送一點加深額度
  let streakInfo: { streak: number; rewarded: boolean } | null = null;
  if (level === "daily") {
    const s = nextStreak(user.lastDailyDate, today, user.streak);
    streakInfo = s;
    // 這兩句要嘛一起成功要嘛一起不算:只寫了日抽紀錄卻沒更新 streak,
    // 客人明天就會被當成斷簽。D1 的 batch() 會包在同一個交易裡。
    await batch([
      {
        sql: `INSERT INTO DailyDraw (id, userId, date, readingId, createdAt)
              VALUES (?, ?, ?, ?, ?)`,
        params: [newId(), user.id, today, readingId, now()],
      },
      {
        sql: `UPDATE TarotUser
                 SET streak = ?,
                     lastDailyDate = ?,
                     deepenCredits = deepenCredits + ?
               WHERE id = ?`,
        params: [s.streak, today, s.rewarded ? 1 : 0, user.id],
      },
    ]);
  }

  // 圖鑑:第一次抽到的牌點亮。
  //
  // INSERT OR IGNORE:已經收集過的牌會撞 UNIQUE(userId, cardN),
  // 這個寫法讓它安靜跳過而不是整筆失敗。少了它,客人一抽到重複的牌
  // 就會整個抽牌失敗——而重複幾乎一定會發生。
  await batch(
    cards.map((c) => ({
      sql: `INSERT OR IGNORE INTO CardSeen (id, userId, cardN, firstSeenAt)
            VALUES (?, ?, ?, ?)`,
      params: [newId(), user.id, c.n, now()],
    }))
  );

  return NextResponse.json({
    ok: true,
    readingId,
    spreadId: spread.id,
    tier,
    streak: streakInfo?.streak ?? null,
    streakReward: streakInfo?.rewarded ?? false,
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
