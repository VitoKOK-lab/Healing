import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

// 喵喵占卜:接收前端(靜態站)抽好的 3 張牌,請 Gemini 綜合寫一段解讀。
// 純無狀態代理——不落地任何個資,允許跨網域呼叫(靜態站與本站不同網域)。

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// 大阿爾克那編號:用來看牌陣的數字走勢(遞增=能量向外推進,遞減=向內收斂)。
const MAJOR_NUMBERS: Record<string, number> = {
  愚者: 0, 魔術師: 1, 女祭司: 2, 皇后: 3, 皇帝: 4, 教皇: 5, 戀人: 6,
  戰車: 7, 力量: 8, 隱者: 9, 命運之輪: 10, 正義: 11, 吊人: 12, 死神: 13,
  節制: 14, 惡魔: 15, 高塔: 16, 星星: 17, 月亮: 18, 太陽: 19, 審判: 20, 世界: 21,
};

const POSITIONS = [
  { label: "現況", hint: "事情此刻真正的樣子" },
  { label: "挑戰", hint: "卡住的地方,或需要留意的事" },
  { label: "指引", hint: "可以從哪裡著手" },
];

// 逆位多寡是整副牌陣的能量訊號,不是單張牌的吉凶。
function reversalSignal(reversed: number): string {
  if (reversed === 0) return "全為正位——能量順暢,事情正朝外開展,適合直接行動";
  if (reversed === 1) return "一張逆位——大致順暢,但有一處需要調整";
  if (reversed === 2) return "兩張逆位——阻力偏多,力量比較往內走,得先處理內在";
  return "全為逆位——整體卡住,提醒先停下來向內看,別急著推進";
}

function numberTrend(nums: number[]): string {
  const known = nums.filter((n) => n >= 0);
  if (known.length < 3) return "";
  const seq = known.join(" → ");
  if (known[0] < known[1] && known[1] < known[2]) return `牌號 ${seq}(遞增,能量逐步向外推進)`;
  if (known[0] > known[1] && known[1] > known[2]) return `牌號 ${seq}(遞減,能量往內收斂、回頭整理)`;
  return `牌號 ${seq}(起伏,過程中有轉折)`;
}

const TOPIC_LABELS: Record<string, string> = {
  love: "感情",
  career: "工作",
  money: "金錢",
  decision: "抉擇",
  other: "生活",
};

type DrawnCard = {
  name: string;
  orientation: "upright" | "reversed";
  keyword: string;
};

function isDrawnCard(v: unknown): v is DrawnCard {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.name === "string" &&
    (c.orientation === "upright" || c.orientation === "reversed") &&
    typeof c.keyword === "string"
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

class GeminiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function askGemini(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        // 思考型模型的內部推理也吃這個上限(實測可到 ~2000 tokens),
        // 留得不夠寬正文就會以 MAX_TOKENS 被腰斬。
        generationConfig: { temperature: 0.9, maxOutputTokens: 4096 },
      }),
    }
  );

  if (!res.ok) {
    throw new GeminiError(`Gemini ${res.status}: ${await res.text()}`, res.status);
  }

  const data = await res.json();
  // 回應可能含多個 part;標記 thought 的是推理內容,不要放進正文。
  const parts: Array<{ text?: string; thought?: boolean }> =
    data?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim();
}

// 正常解讀幾乎全是中文;推理外洩的內容充滿數字、括號與英文檢查字樣。
function looksLikeReading(text: string): boolean {
  if (text.length < 60) return false;
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  if (cjk / text.length < 0.72) return false;
  if (/\(\d+\)|\d+\.\s/.test(text)) return false;
  return true;
}

export async function POST(req: NextRequest) {
  if (!env.GEMINI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "本喵占卜師還沒準備好" },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "bad request" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { topic, question, cards } = (body ?? {}) as {
    topic?: unknown;
    question?: unknown;
    cards?: unknown;
  };

  if (
    typeof topic !== "string" ||
    !Array.isArray(cards) ||
    cards.length !== 3 ||
    !cards.every(isDrawnCard)
  ) {
    return NextResponse.json(
      { ok: false, error: "bad request" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const topicLabel = TOPIC_LABELS[topic] ?? "生活";
  const trimmedQuestion =
    typeof question === "string" ? question.trim().slice(0, 120) : "";

  const drawn = cards as DrawnCard[];
  const cardLines = drawn
    .map((c, i) => {
      const ori = c.orientation === "upright" ? "正位" : "逆位";
      const num = MAJOR_NUMBERS[c.name];
      const numText = num === undefined ? "" : `${num} 號,`;
      return `${POSITIONS[i].label}(${POSITIONS[i].hint}):「${c.name}」${ori}(${numText}關鍵字:${c.keyword})`;
    })
    .join("\n");

  const reversed = drawn.filter((c) => c.orientation === "reversed").length;
  const trend = numberTrend(drawn.map((c) => MAJOR_NUMBERS[c.name] ?? -1));

  const prompt = `你是「解憂商店」的塔羅占卜師,語氣溫暖、細膩、給人安定感,像在跟熟識的朋友聊天,絕不使用恐嚇或宿命式的斷言。

【客人想問的】
主題:${topicLabel}${trimmedQuestion ? `\n問題:${trimmedQuestion}` : ""}

【牌陣】三張一組
${cardLines}

【整體訊號】
${reversalSignal(reversed)}${trend ? `\n${trend}` : ""}

【解牌方法——最重要】
三張牌是「一個故事的三個章節」,不是三段各自獨立的牌義,請務必:
1. 先問自己:這三張合起來在說什麼?它們是互相呼應(彼此強化)、互相矛盾(內在拉扯),
   還是一因一果、一個問題配一個解方?
2. 找出主導這次占卜的那張牌,另外兩張是在補充它、還是在反駁它
3. 把三個位置串成因果:因為現況是這樣,所以才卡在那裡,於是可以從這裡著手
4. 全程扣著客人的問題回答,不要只是輪流背三張牌的牌義

最後給一句具體、溫柔可執行的小建議作結。

輸出規則(務必遵守):
- 繁體中文,單一段落散文,大約五到七個句子
- 不要出現「第一張/第二張/第三張」這種逐張報牌的說法,要讀成一個整體
- 挑出 3～5 個最關鍵的詞或短句,各用【】框起來(例如:心裡其實已經有了【自己的答案】),
  讓讀者一眼看到重點;每個【】內以 2～8 個字為宜,不要整句都框起來
- 框起來的必須是「對客人有意義的話」,不可以框牌名或正逆位(例如【戀人正位】是錯的)
- 不要條列、不要編號、不要標題、不要星號或任何 Markdown 符號
- 不要計算或標註字數
- 直接輸出解讀本文,不要任何前言、說明或自我檢查`;

  try {
    let reading = await askGemini(prompt);
    // 思考型模型偶爾會把自我檢查(逐字編號、英文檢查清單)當成答案吐出來,
    // 或因思考吃光額度而截斷。攔下來重試一次,通常第二次就正常。
    if (!looksLikeReading(reading)) {
      console.warn("Gemini returned non-prose output, retrying once:", reading.slice(0, 120));
      reading = await askGemini(prompt);
    }

    if (!looksLikeReading(reading)) {
      return NextResponse.json(
        { ok: false, error: "本喵現在有點累,請稍後再試" },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json({ ok: true, reading }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("Gemini request failed", err);
    // 免費方案有每日呼叫上限,講清楚比「暫時無法使用」有用
    if (err instanceof GeminiError && err.status === 429) {
      return NextResponse.json(
        { ok: false, error: "今天的占卜次數已達上限,請明天再來" },
        { status: 429, headers: CORS_HEADERS }
      );
    }
    return NextResponse.json(
      { ok: false, error: "本喵現在有點累,請稍後再試" },
      { status: 502, headers: CORS_HEADERS }
    );
  }
}
