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
    // 350~550 字的解讀,1024 token 綽綽有餘;開到 16000 只是給思考留空間,
    // 而我們不要思考(見下)——留 4000 當安全邊際即可。
    max_tokens: paid ? 4000 : 1024,
    // 關閉思考模式。Sonnet 5 起,省略 thinking 參數 = 預設開啟 adaptive thinking,
    // 複雜牌陣(賽爾特十字 10 張)實測會跑超過 60 秒 → Vercel 504。
    // 這跟 Kimi K2.6 踩到的是同一個坑,只是預設值藏得更深。
    // 品質由 guards 機械審核 + 換角度重試 + T4/T5 方向二次分類承接,不靠模型自審。
    ...(paid ? { thinking: { type: "disabled" as const } } : {}),
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

// ── Kimi/Moonshot(測試/備援供應商;OpenAI 相容端點)────────
// 大陸用語與政策降溫的風險由 guards 的 cn-term/filler 規則 + 方向二次
// 分類承接(增補篇 §2–§5 的 code 層攔截),不靠 prompt 自律。
async function kimiChat(prompt: string, maxTokens: number): Promise<string> {
  const res = await fetch(`${env.KIMI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.KIMI_API_KEY}`,
    },
    body: JSON.stringify({
      // 關閉思考模式:預設開啟會佔用大量 max_tokens、耗時常常超過 60 秒,
      // 在 Vercel 的 maxDuration 限制下容易整批逾時失敗;拿掉之後靠 guards
      // 機械審核 + 重試機制頂,而不是靠模型自我檢查。文風變化跟 Claude
      // 一樣靠角度輪替。K2.6 每個模式只接受固定 temperature,非該值直接
      // 400——思考模式開啟要 1,關閉後變成只接受 0.6,兩個模式不共用。
      model: env.KIMI_MODEL,
      max_tokens: maxTokens,
      temperature: 0.6,
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`kimi ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

// K2.6 有思考模式,思考過程也算進 max_tokens——4096 常常被思考吃光,
// 導致正文變空字串(表面上像是 guards 沒過,其實是額度不夠)。
export const kimiCaller: ModelCaller = (prompt, { paid }) => kimiChat(prompt, paid ? 16000 : 3000);
export const kimiClassifier: ClassifyCaller = (prompt) => kimiChat(prompt, 500);

// 2026-08-17:付費層取消寫死 Claude,改回一律聽 MODEL_PROVIDER。
// 先前鎖 Claude 的理由(「Kimi 格式遵守率不到五成」)是錯的——那是
// guards 把「后」誤判成簡體字造成的:皇后與四張王后一抽到就整篇退回。
// 修掉誤判後同牌陣公平比較,兩者單次通過率都是 5/6,速度也同級
// (Kimi 14~22s / Claude 15~20s),沒有理由為付費層多付這筆錢。
function providerReady(): boolean {
  return env.MODEL_PROVIDER === "kimi" ? Boolean(env.KIMI_API_KEY) : Boolean(env.ANTHROPIC_API_KEY);
}

function defaultCaller(): ModelCaller {
  return env.MODEL_PROVIDER === "kimi" ? kimiCaller : claudeCaller;
}

function defaultClassifier(): ClassifyCaller {
  // 方向二次分類優先用 Haiku(便宜且不會替 Kimi 的降溫護短);沒有 Claude 金鑰才用 Kimi 自查
  if (env.ANTHROPIC_API_KEY) return claudeClassifier;
  return kimiClassifier;
}

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
// tone 依 tier 決定,不能只看正逆位比例——否則 T4/T5 的降級文案會把
// 明確不利的牌面講成中性,違反規格 §4.1 的中性化禁令(這裡是最後一道防線)。
const FALLBACK_TONE: Record<Tier, string> = {
  T1: "整體能量是【順的】,想做的事可以往前推",
  T2: "整體偏順,只有一處要留意",
  T3: "牌面中性、有變數,關鍵要看接下來怎麼選",
  T4: "這一輪確實有阻力,得先面對卡住的地方",
  T5: "老實說,這一輪明確不利,現在不是順風的時候",
};

export function fallbackText(input: GenerateInput): string {
  const spread = spreadOf(input.spreadId);
  const tone = FALLBACK_TONE[input.tier];
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
  const paid = input.level !== "daily";
  const call = deps.call ?? defaultCaller();
  const classify = deps.classify ?? defaultClassifier();
  const guardLevel = paid ? "paid" : "free";
  // 角度輪替(不用 Math.random:可測、可回溯;正式呼叫端以 readingId 雜湊當 seed)
  const seedAngle = deps.seedAngle ?? 0;

  if (!deps.call && !providerReady()) {
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
