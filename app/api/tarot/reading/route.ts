import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

// 喵喵占卜:接收前端(靜態站)抽好的 3 張牌,請 Gemini 綜合寫一段解讀。
// 純無狀態代理——不落地任何個資,允許跨網域呼叫(靜態站與本站不同網域)。

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

  const cardLines = (cards as DrawnCard[])
    .map((c, i) => {
      const pos = ["第一張", "第二張", "第三張"][i];
      const ori = c.orientation === "upright" ? "正位" : "逆位";
      return `${pos}:「${c.name}」${ori}(關鍵字:${c.keyword}）`;
    })
    .join("\n");

  const prompt = `你是「解憂商店」的塔羅占卜師,語氣溫暖、細膩、給人安定感,像在跟熟識的朋友聊天,絕不使用恐嚇或宿命式的斷言。
占卜主題:${topicLabel}${trimmedQuestion ? `\n提問者的具體問題:${trimmedQuestion}` : ""}
抽到的三張牌(依序代表「現況」「挑戰」「指引」):
${cardLines}

請綜合這三張牌,針對主題寫一段連貫的解讀,自然融合三張牌的意象,最後給一句具體、溫柔可執行的小建議作結。

輸出規則(務必遵守):
- 繁體中文,單一段落散文,大約五到七個句子
- 挑出 3～5 個最關鍵的詞或短句,各用【】框起來(例如:心裡其實已經有了【自己的答案】),
  讓讀者一眼看到重點;每個【】內以 2～8 個字為宜,不要整句都框起來
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
