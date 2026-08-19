import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { unsuitable } from "@/lib/tarot/unsuitable";

// 開牌之前先確認「本喵真的聽懂了嗎」。
// 客人常會用只有自己懂的說法(公司名、職稱、圈內用語、代稱「他」),
// 硬著頭皮解就會解錯方向,或是掰出根本不存在的東西。
// 真正的占卜師會先問清楚再翻牌,這支 API 就是那個追問。
//
// 純無狀態:不落地任何內容,回一個問題或 null 而已。

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// 追問最多兩輪。再多就變成盤問,客人是來占卜不是來做問卷的。
const MAX_ROUNDS = 2;

const TOPIC_LABELS: Record<string, string> = {
  love: "感情",
  career: "工作",
  money: "金錢",
  decision: "抉擇",
  other: "生活",
};

type Round = { q: string; a: string };

function isRound(v: unknown): v is Round {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return typeof r.q === "string" && typeof r.a === "string";
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  // 沒設金鑰時直接放行:追問是加分項,不能因此擋住付費流程
  if (!env.GEMINI_API_KEY) {
    return NextResponse.json({ ok: true, question: null }, { headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true, question: null }, { headers: CORS_HEADERS });
  }

  const { topic, scenario, question, rounds } = (body ?? {}) as {
    topic?: unknown;
    scenario?: unknown;
    question?: unknown;
    rounds?: unknown;
  };

  const q = typeof question === "string" ? question.trim().slice(0, 200) : "";
  if (!q) {
    return NextResponse.json({ ok: true, question: null }, { headers: CORS_HEADERS });
  }

  // 不適合的題目不追問——追問只會把客人往下帶。
  // 這裡回 null(不追問)而不是報錯:真正的攔截與 1925 專線由 /api/tarot/reading 負責,
  // 追問這支的責任只是「不要參與」。
  if (unsuitable([q, typeof scenario === "string" ? scenario : ""].join(" "))) {
    return NextResponse.json({ ok: true, question: null }, { headers: CORS_HEADERS });
  }

  const asked: Round[] = Array.isArray(rounds) ? rounds.filter(isRound).slice(0, MAX_ROUNDS) : [];
  if (asked.length >= MAX_ROUNDS) {
    return NextResponse.json({ ok: true, question: null }, { headers: CORS_HEADERS });
  }

  const topicLabel = TOPIC_LABELS[String(topic)] ?? "生活";
  const scenarioLabel = typeof scenario === "string" ? scenario.trim().slice(0, 40) : "";
  const history = asked.length
    ? asked.map((r, i) => `第${i + 1}次追問:「${r.q}」\n客人回答:「${r.a}」`).join("\n")
    : "(還沒問過)";

  const prompt = `你是「解憂商店」的塔羅占卜師。客人剛說了他想問的事,你正要開牌。
在翻牌之前,先誠實檢查一件事:你真的聽懂他在說什麼嗎?

【客人的主題】${topicLabel}${scenarioLabel ? `\n【客人選的處境】${scenarioLabel}` : ""}
【客人說的】${q}

【已經追問過的】
${history}

【一定要問的兩種情況】(這是本步驟存在的理由,遇到就不可以放過)
  A. 句子裡出現你「無法百分之百確定是什麼」的專有名詞——公司名、產品名、
     職稱、證照、方法論、系統、遊戲、圈內用語、縮寫。
     判準很簡單:如果要你用一句話解釋那是什麼,你會需要猜,那就是要問。
     不准假裝知道,也不准用上下文推測混過去。
     例:澤庫法則、緹瑪斯認證、鴻晟科技、PMO、OKR、那套系統
  B. 出現代稱或指示詞,但指的是什麼並不明確,而且指誰會直接改變解讀方向。
     例:「他」(伴侶?主管?)、「那個案子」、「這件事」、「他們公司」

【除此之外,一律輸出 OK】
大部分客人講的話已經夠清楚了,問太多會讓人覺得被盤問。
唯一的例外是整句話短到完全看不出在問什麼。

【這些一律不問,直接輸出 OK】
✗ 只是想知道更多細節、想解得更深入 —— 那是牌要做的事,不是問客人
✗ 問客人的感受、想法、打算、底線、期待
   (「你打算再撐多久?」「你心裡比較想選哪個?」)
✗ 問時間長短、次數、頻率這類補充資料
✗ 客人已經說了「交往三年」「常常加班」這種具體描述,就不要再挖

【絕對禁止】
在你的問題裡塞進客人沒說過的資訊。
✗「你說的男朋友,是指這三年來一直同居的那位嗎?」——客人沒說過同居
只能用客人自己講過的字去問。

【輸出規則】
- 要問的話,只提出「一個」最關鍵的問題。用占卜師對客人說話的口吻,
  一句話,不超過 30 字,不要解釋你為什麼問,不要加開場白。
  例:你說的澤庫法則是什麼呀?本喵沒聽過這個說法。
  例:你說的「他」是指伴侶還是同事呢?
- 不需要問就只輸出兩個字:OK
- 不要輸出任何其他內容,不要解釋你的判斷。
${asked.length >= 1 ? "- 你已經問過一次了。除非真的完全看不懂,否則直接輸出 OK。" : ""}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}`);

    const data = await res.json();
    const parts: Array<{ text?: string; thought?: boolean }> =
      data?.candidates?.[0]?.content?.parts ?? [];
    const out = parts
      .filter((p) => !p.thought && typeof p.text === "string")
      .map((p) => p.text)
      .join("")
      .trim();

    // 夠清楚就開牌。回傳的東西不像一句追問時也直接放行,不要卡住客人。
    const clear = !out || /^ok\b/i.test(out) || out.length > 40 || !/[?？]/.test(out);
    return NextResponse.json(
      { ok: true, question: clear ? null : out },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    // 追問失敗不該擋住付費流程,直接開牌
    console.error("clarify failed", err);
    return NextResponse.json({ ok: true, question: null }, { headers: CORS_HEADERS });
  }
}
