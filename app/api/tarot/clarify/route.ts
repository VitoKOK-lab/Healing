import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { unsuitable } from "@/lib/tarot/unsuitable";
import { record } from "@/lib/tarot/events";

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
// 複述確認最多三輪。第三輪還沒對上就直接開牌——再問下去客人會覺得
// 在被盤問,而且牌本來就有能力處理模糊的問題。
const MAX_ROUNDS = 3;

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
  if (!env.KIMI_API_KEY) {
    return NextResponse.json({ ok: true, question: null }, { headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true, question: null }, { headers: CORS_HEADERS });
  }

  const { topic, scenario, question, rounds, visitor } = (body ?? {}) as {
    topic?: unknown;
    scenario?: unknown;
    question?: unknown;
    rounds?: unknown;
    visitor?: unknown;
  };
  const who = typeof visitor === "string" ? visitor : null;

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

  const prompt = `你是「解憂商店」的貓咪塔羅占卜師,自稱「本喵」。
客人剛寫下他想問的事,你正要開牌。翻牌之前只做一件事:
把「你以為他在問什麼」複述一次,讓他確認你有沒有聽懂。

【客人的主題】${topicLabel}${scenarioLabel ? `\n【客人選的處境】${scenarioLabel}` : ""}
【客人寫的】${q}

【前面確認過的】
${history}

【什麼時候要複述確認】
只有在「聽不懂就會算錯方向」的時候才問。遇到這三種一定要問:
  A. 出現你無法百分之百確定是什麼的專有名詞——公司名、產品名、職稱、
     證照、方法論、系統、遊戲、圈內用語、縮寫。
     判準:要你用一句話解釋那是什麼,你會需要猜,那就是要問。
     例:澤庫法則、緹瑪斯認證、鴻晟科技、PMO、那套系統
  B. 出現代稱或指示詞,指誰會直接改變解讀方向。
     例:「他」(伴侶?主管?)、「那個案子」、「這件事」
  C. 整句話短到看不出他在問什麼。
     例:「工作」「他」「怎麼辦」

【這些一律輸出 OK,不要問】
✗ 只是想解得更深入 —— 那是牌要做的事,不是問客人
✗ 問感受、想法、打算、底線、期待
✗ 問時間長短、次數、頻率這類補充資料
✗ 客人已經講清楚的事再挖一次

【複述的寫法】(這是重點,不要寫成開放式問題)
一定要是「是非題」——客人只會按「對」或「不是」,他沒有辦法打字回你。
所以你必須自己先猜一個具體的意思,把它講出來,讓他判斷對不對。

  ✓ 你說的「他」,是指你的另一半嗎?
  ✓ 你想問的是:要不要離開現在這份工作,對嗎?
  ✓ 「澤庫法則」本喵沒聽過——你說的是某種工作方法嗎?
  ✗ 你說的「他」是誰呢?                ← 開放式,客人沒辦法回答
  ✗ 可以多說一點嗎?                    ← 沒有具體的猜測
  ✗ 你的意思是 A 還是 B?               ← 二選一也不行,只有對/不對兩顆鈕

【絕對禁止】
在複述裡塞進客人沒說過的資訊。只能用他自己講過的字,加上你的一個猜測。
✗「你說的男朋友,是指這三年來一直同居的那位嗎?」——客人沒說過同居

【輸出規則】
- 要確認:只輸出那一句複述,占卜師對客人說話的口吻,一句話,不超過 35 字。
  不要解釋你為什麼問,不要加開場白,不要加選項。
- 不需要確認:只輸出兩個字 OK
- 不要輸出任何其他內容。
${asked.length >= 1 ? `- 你已經確認過 ${asked.length} 次了。上面「前面確認過的」裡面客人答「不是」的猜測不可以再猜一次。除非真的完全看不懂,否則直接輸出 OK。` : ""}`;

  try {
    const res = await fetch(`${env.KIMI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.KIMI_MODEL,
        max_tokens: 400,
        temperature: 0.6,
        thinking: { type: "disabled" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`kimi ${res.status}`);

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const out = (data.choices?.[0]?.message?.content ?? "").trim();

    // 夠清楚就開牌。回傳的東西不像一句複述確認時也直接放行,不要卡住客人。
    // 上限放到 45 字:複述本身會把客人的原話帶進去,比開放式追問長一點。
    const clear = !out || /^ok\b/i.test(out) || out.length > 45 || !/[?？]/.test(out);
    // 記客人打的原話(店主要看大家到底在問什麼)、有沒有需要複述確認、
    // 以及這是第幾輪。複述的內容本身不記——那是本喵講的,不是客人講的。
    // question 90 天自動刪(見 lib/tarot/events.ts)。
    void record({ kind: "ask", topic: String(topic || ""), scenario: scenarioLabel || null,
      detail: clear ? "clear" : "need-confirm", question: q, visitor: who });
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
