import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

// AI 塔羅占卜:接收前端(靜態站)抽好的 3 張牌,請 Gemini 綜合寫一段解讀。
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

export async function POST(req: NextRequest) {
  if (!env.GEMINI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "AI 占卜尚未設定金鑰" },
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

請綜合這三張牌,針對主題寫一段連貫的解讀(繁體中文,180～260 字,不要條列、不要標題、不要使用星號或其他 Markdown 符號),
內容需自然融合三張牌的意象,最後給一句具體、溫柔可執行的小建議作結。只輸出解讀本文。`;

  try {
    const model = env.GEMINI_MODEL;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          // 思考型模型的內部推理也吃這個上限(實測 ~900 tokens),設太低正文會被截斷
          generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error", res.status, errText);
      return NextResponse.json(
        { ok: false, error: "AI 解讀暫時無法使用,請稍後再試" },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const data = await res.json();
    // 思考型模型可能回傳多個 part(含標記 thought 的推理內容),只取正文
    const parts: Array<{ text?: string; thought?: boolean }> =
      data?.candidates?.[0]?.content?.parts ?? [];
    const reading = parts
      .filter((p) => !p.thought && typeof p.text === "string")
      .map((p) => p.text)
      .join("")
      .trim();

    if (!reading) {
      return NextResponse.json(
        { ok: false, error: "AI 解讀暫時無法使用,請稍後再試" },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { ok: true, reading: reading.trim() },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("Gemini request failed", err);
    return NextResponse.json(
      { ok: false, error: "AI 解讀暫時無法使用,請稍後再試" },
      { status: 502, headers: CORS_HEADERS }
    );
  }
}
