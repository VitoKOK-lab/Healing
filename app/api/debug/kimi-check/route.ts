import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { drawSpread, seedFrom, type Drawn } from "@/lib/tarot/draw";
import { tierOf, type Tier } from "@/lib/tarot/tier";
import { buildPrompt } from "@/lib/tarot/generate";
import { dailyPrompt } from "@/lib/tarot/prompts";
import { check } from "@/lib/tarot/guards";

export const maxDuration = 60;

// 臨時診斷端點:直接看 Kimi 針對付費層 prompt 的原始輸出跟被哪條 guards 規則擋下,
// 不寫資料庫、不觸發金流。只在 LINE_STUB=1(開發/測試環境)開放,驗完就會移除。

function findCards(spreadId: string, tier: Tier): Drawn[] {
  for (let i = 0; i < 200_000; i++) {
    const seed = seedFrom(`debug:${spreadId}:${tier}:${i}`, "debug-nonce");
    const cards = drawSpread(spreadId, seed, (i % 97) / 97);
    if (tierOf(cards, spreadId) === tier) return cards;
  }
  throw new Error(`找不到 ${spreadId}/${tier} 的牌組`);
}

export async function POST(req: Request) {
  if (env.LINE_STUB !== "1") {
    return NextResponse.json({ ok: false, error: "debug endpoint disabled" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const level = (body.level ?? "deep") as "deep" | "daily";
  const tier = (body.tier ?? "T4") as Tier;
  const spreadId = body.spreadId ?? "flow";
  const angleIndex = body.angleIndex ?? 0;
  const disableThinking = body.disableThinking !== false; // 預設帶上,跟正式路徑一致

  const cards = level === "daily" ? findCards("flow", "T1").slice(0, 1) : findCards(spreadId, tier);
  const prompt =
    level === "daily"
      ? dailyPrompt(cards, angleIndex)
      : buildPrompt(
          { level: "deep", cards, spreadId, tier, topic: "感情", question: "這段關係接下來會怎麼發展" },
          angleIndex
        );

  // 直接打原始 API,看完整回應(含 finish_reason、可能的 reasoning 欄位),
  // 不透過 kimiCaller,才能診斷空字串/逾時是不是思考模式造成的。
  const requestBody: Record<string, unknown> = {
    model: env.KIMI_MODEL,
    max_tokens: level === "daily" ? 3000 : 16000,
    // 思考模式開啟只接受 temperature:1,關閉後只接受 0.6,兩者不共用。
    temperature: disableThinking ? 0.6 : 1,
    messages: [{ role: "user", content: prompt }],
  };
  if (disableThinking) requestBody.thinking = { type: "disabled" };

  let raw: unknown;
  const startedAt = Date.now();
  try {
    const res = await fetch(`${env.KIMI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.KIMI_API_KEY}` },
      body: JSON.stringify(requestBody),
    });
    const elapsedMs = Date.now() - startedAt;
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, elapsedMs, requestBody, error: `kimi ${res.status}: ${await res.text()}` },
        { status: 500 }
      );
    }
    raw = await res.json();
    const text =
      (raw as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content ?? "";
    const violations = level === "daily" ? [] : check(text, "paid");
    return NextResponse.json({
      ok: true,
      level,
      tier,
      spreadId,
      cardCount: cards.length,
      elapsedMs,
      requestBody,
      text,
      violations,
      raw,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, elapsedMs: Date.now() - startedAt, requestBody, error: String(e) },
      { status: 500 }
    );
  }
}
