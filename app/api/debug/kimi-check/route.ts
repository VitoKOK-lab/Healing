import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { drawSpread, seedFrom, type Drawn } from "@/lib/tarot/draw";
import { tierOf, type Tier } from "@/lib/tarot/tier";
import { buildPrompt, kimiCaller } from "@/lib/tarot/generate";
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

  let text: string;
  try {
    text = await kimiCaller(prompt, { paid: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }

  const violations = check(text, "paid");
  return NextResponse.json({ ok: true, tier, spreadId, cardCount: cards.length, text, violations });
}
