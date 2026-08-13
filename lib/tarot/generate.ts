import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import type { Drawn } from "./draw";
import type { Tier } from "./tier";
import { spreadOf } from "./spreads";
import { check } from "./guards";
import { needsDirectionCheck, verifyDirection, type ClassifyCaller } from "./direction";
import { dailyPrompt, paidPrompt, ANGLES, type Level } from "./prompts";

// 生成管線(規格 §4):生成 → guards 機械審核 → 不合格換角度重生成一次 →
// T4/T5 必跑方向二次分類,被中性化再重生成 → 全敗走本地降級文案。
// 不出爛文案收錢;降級時 result.fallback = true,呼叫端據此處理退款/補償。
//
// 去識別化在這一層結構性保證:buildPrompt 的輸入型別裡根本沒有 userId/暱稱。

export type GenerateInput = {
  level: Level;
  cards: Drawn[];
  spreadId: string;
  tier: Tier;
  topic?: string | null;
  question?: string | null;
  historySummary?: string | null;
};

export type GenerateResult = {
  text: string;
  fallback: boolean;
  attempts: number;
};

// 呼叫端可注入(測試用 fake);正式環境用 Claude。
export type ModelCaller = (prompt: string, opts: { paid: boolean }) => Promise<string>;

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

export const claudeCaller: ModelCaller = async (prompt, { paid }) => {
  const res = await client().messages.create({
    model: paid ? env.ANTHROPIC_MODEL_PAID : env.ANTHROPIC_MODEL_FREE,
    max_tokens: paid ? 16000 : 1024,
    messages: [{ role: "user", content: prompt }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
};

// 方向二次分類固定走免費層模型(Haiku):便宜、夠準
export const claudeClassifier: ClassifyCaller = async (prompt) => {
  const res = await client().messages.create({
    model: env.ANTHROPIC_MODEL_FREE,
    max_tokens: 16,
    messages: [{ role: "user", content: prompt }],
  });
  const block = res.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return block?.text ?? "";
};

export function buildPrompt(input: GenerateInput, angleIndex: number): string {
  if (input.level === "daily") return dailyPrompt(input.cards, angleIndex);
  return paidPrompt({
    cards: input.cards,
    spreadId: input.spreadId,
    tier: input.tier,
    topic: input.topic,
    question: input.question,
    angleIndex,
    historySummary: input.historySummary,
  });
}

// 本地降級文案:模型全滅時至少讓客人拿到東西(移植自舊前端 localReading)。
export function fallbackText(input: GenerateInput): string {
  const spread = spreadOf(input.spreadId);
  const reversed = input.cards.filter((c) => c.orientation === "reversed").length;
  const tone =
    reversed === 0
      ? "整體能量是【順的】,想做的事可以往前推"
      : reversed >= input.cards.length - reversed
        ? "牌面偏向【先向內看】,急著推進反而卡手"
        : "大方向還算順,只是有一處【需要調整】";
  const body = input.cards
    .map(
      (c) =>
        `${c.position}落在「${c.name}」${c.orientation === "upright" ? "" : "逆位"},說的是【${c.keyword}】——${c.meaning}`
    )
    .join(";");
  return `本喵先用${spread.name}替你看過一遍。${tone}。${body}。這一輪本喵的靈感有點淡,先給你這些,晚點再來讓本喵好好說一次。`;
}

export async function generateReading(
  input: GenerateInput,
  deps: { call?: ModelCaller; classify?: ClassifyCaller; seedAngle?: number } = {}
): Promise<GenerateResult> {
  const call = deps.call ?? claudeCaller;
  const classify = deps.classify ?? claudeClassifier;
  const paid = input.level !== "daily";
  const guardLevel = paid ? "paid" : "free";
  // 角度輪替(不用 Math.random:可測、可回溯;正式呼叫端以 readingId 雜湊當 seed)
  const seedAngle = deps.seedAngle ?? 0;

  if (!env.ANTHROPIC_API_KEY && !deps.call) {
    return { text: fallbackText(input), fallback: true, attempts: 0 };
  }

  // 最多 3 次生成:1 次原始 + guards 失敗換角度 1 次 + 方向中性化再 1 次
  let attempts = 0;
  let best: string | null = null;

  for (let round = 0; round < 3; round++) {
    const angle = (seedAngle + round * 3) % ANGLES.length;
    let text: string;
    try {
      attempts++;
      text = await call(buildPrompt(input, angle), { paid });
    } catch {
      continue; // API 錯誤:下一輪再試,全敗走降級
    }

    if (check(text, guardLevel).length > 0) continue;

    // T4/T5 全查方向(規格 §4.1 第 8 條);其他 tier 過 guards 即出貨
    if (paid && needsDirectionCheck(input.tier)) {
      try {
        const ok = await verifyDirection(text, input.tier, classify);
        if (!ok) {
          best = best ?? null; // 被中性化的文案不保留
          continue;
        }
      } catch {
        // 分類器掛了:保守起見不出這篇,再試一輪
        continue;
      }
    }

    return { text, fallback: false, attempts };
  }

  return { text: fallbackText(input), fallback: true, attempts };
}
