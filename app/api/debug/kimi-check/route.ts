import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { drawSpread, seedFrom, type Drawn } from "@/lib/tarot/draw";
import { tierOf, type Tier } from "@/lib/tarot/tier";
import { buildPrompt } from "@/lib/tarot/generate";
import { check } from "@/lib/tarot/guards";

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
  const tier = (body.tier ?? "T4") as Tier;
  const spreadId = body.spreadId ?? "flow";
  const angleIndex = body.angleIndex ?? 0;

  const cards = findCards(spreadId, tier);
  const prompt = buildPrompt(
    { level: "deep", cards, spreadId, tier, topic: "感情", question: "這段關係接下來會怎麼發展" },
    angleIndex
  );

  // 直接打原始 API,看完整回應(含 finish_reason、可能的 reasoning 欄位),
  // 不透過 kimiCaller,才能診斷空字串是不是被 thinking mode 吃光 token。
  let raw: unknown;
  try {
    const res = await fetch(`${env.KIMI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.KIMI_API_KEY}` },
      body: JSON.stringify({
        model: env.KIMI_MODEL,
        max_tokens: 8192,
        temperature: 1,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `kimi ${res.status}: ${await res.text()}` }, { status: 500 });
    }
    raw = await res.json();
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }

  const text =
    (raw as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content ?? "";
  const violations = check(text, "paid");
  return NextResponse.json({ ok: true, tier, spreadId, cardCount: cards.length, text, violations, raw });
}
