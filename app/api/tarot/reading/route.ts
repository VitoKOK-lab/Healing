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

// 小牌的牌組與元素。牌名開頭即牌組,不需前端多送欄位。
const SUITS: Array<{ prefix: string; element: string; domain: string }> = [
  { prefix: "權杖", element: "火", domain: "行動與熱情" },
  { prefix: "聖杯", element: "水", domain: "情感與關係" },
  { prefix: "寶劍", element: "風", domain: "思緒與溝通" },
  { prefix: "錢幣", element: "土", domain: "現實與資源" },
];

function suitOf(name: string) {
  return SUITS.find((s) => name.startsWith(s.prefix));
}

// 大牌多寡:大牌講的是人生層級的主題,小牌講的是日常裡的事。
// 用比例判斷,才能同時適用 1 / 3 / 5 張的牌陣。
function majorSignal(majors: number, total: number): string {
  if (majors === 0) return "全部都是小牌——這件事屬於日常層面,可以從具體的行動下手,不必想得太重";
  if (majors === total) return "全部都是大牌——這是人生層級的主題,背後有更大的功課在推動";
  if (majors / total >= 0.5) return `${majors} 張大牌——這件事比表面看起來更重要,值得認真對待`;
  return `${majors} 張大牌——日常中的一個轉折點,關鍵落在大牌所在的位置上`;
}

// 同一牌組出現兩張以上,代表整件事的重心落在那個面向。
function suitSignal(names: string[]): string {
  const counts = new Map<string, number>();
  for (const n of names) {
    const s = suitOf(n);
    if (s) counts.set(s.prefix, (counts.get(s.prefix) ?? 0) + 1);
  }
  for (const [prefix, count] of counts) {
    if (count >= 2) {
      const s = SUITS.find((x) => x.prefix === prefix)!;
      return `${count} 張${prefix}(${s.element}元素)——重心明顯落在${s.domain}上`;
    }
  }
  return "";
}

// 牌陣定義。前端只送 spread id,位置語意由伺服器決定——客人改不動。
// 這份表必須與 site-static/assets/tarot-data.js 的 SPREADS 對齊。
const SPREADS: Record<
  string,
  { name: string; positions: Array<{ label: string; hint: string }>; how: string }
> = {
  single: {
    name: "核心指引",
    positions: [{ label: "核心指引", hint: "此刻最需要知道的一件事" }],
    how: "只有一張牌,把它講透:這張牌對客人的問題到底在說什麼,以及可以怎麼做。",
  },
  flow: {
    name: "時間之流",
    positions: [
      { label: "過去", hint: "事情的根源,已經造成的影響" },
      { label: "現在", hint: "當前的狀況與正在發展的能量" },
      { label: "未來", hint: "接下來一到三個月的走向" },
    ],
    how: "三張是一條時間線,要讀成因果:過去種下什麼,所以現在是這個樣子,於是會往那個方向去。",
  },
  choice: {
    name: "二擇一",
    positions: [
      { label: "現況", hint: "客人此刻整體的處境" },
      { label: "選 A 的過程", hint: "走 A 這條路會遇到什麼" },
      { label: "選 B 的過程", hint: "走 B 這條路會遇到什麼" },
      { label: "選 A 的結果", hint: "A 最後會走到哪裡" },
      { label: "選 B 的結果", hint: "B 最後會走到哪裡" },
    ],
    how:
      "這是在比較兩條路。先看現況,再把 A 與 B 各自的「過程 + 結果」當成一組整體來比," +
      "說清楚兩邊各自要付出什麼、得到什麼。可以有傾向,但不要替客人做決定。",
  },
};

// 逆位多寡是整副牌陣的能量訊號,不是單張牌的吉凶。
function reversalSignal(reversed: number, total: number): string {
  if (reversed === 0) return "全為正位——能量順暢,事情正朝外開展,適合直接行動";
  if (reversed === total) return "全為逆位——整體卡住,提醒先停下來向內看,別急著推進";
  if (reversed / total > 0.5) return `${reversed} 張逆位——阻力偏多,力量比較往內走,得先處理內在`;
  return `${reversed} 張逆位——大致順暢,但有需要調整的地方`;
}

// 牌號走勢只在全部都是大牌時才有意義(小牌的數字不在同一個序列上)。
function numberTrend(nums: number[]): string {
  if (nums.length < 3 || nums.some((n) => n === undefined)) return "";
  const seq = nums.join(" → ");
  const rising = nums.every((n, i) => i === 0 || n > nums[i - 1]);
  const falling = nums.every((n, i) => i === 0 || n < nums[i - 1]);
  if (rising) return `牌號 ${seq}(遞增,能量逐步向外推進)`;
  if (falling) return `牌號 ${seq}(遞減,能量往內收斂、回頭整理)`;
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

// 逐張報牌的說法。三張牌要讀成一個故事,出現這些就是在輪流背牌義。
const PER_CARD_PHRASES = /第[一二三123]張|最後一張|中間那張|第[一二三123]個位置/;

// 重點該框「對客人有意義的話」,框到牌名或正逆位就只是報牌。
// 這種偶爾還是會漏出來,直接把框拆掉保留文字即可,不必為此重新生成。
function unwrapCardNameHighlights(text: string, cardNames: string[]): string {
  return text.replace(/【([^】]*)】/g, (whole, inner: string) => {
    const isCardish =
      cardNames.some((n) => inner.includes(n)) || /正位|逆位/.test(inner);
    return isCardish ? inner : whole;
  });
}

// 正常解讀幾乎全是中文;推理外洩的內容充滿數字、括號與英文檢查字樣。
function looksLikeReading(text: string): boolean {
  if (text.length < 60) return false;
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  if (cjk / text.length < 0.72) return false;
  if (/\(\d+\)|\d+\.\s/.test(text)) return false;
  if (PER_CARD_PHRASES.test(text)) return false;
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

  const { topic, spread, scenario, question, cards, optionA, optionB } = (body ??
    {}) as {
    topic?: unknown;
    spread?: unknown;
    scenario?: unknown;
    question?: unknown;
    cards?: unknown;
    optionA?: unknown;
    optionB?: unknown;
  };

  const layout =
    typeof spread === "string" && SPREADS[spread] ? SPREADS[spread] : SPREADS.flow;

  if (
    typeof topic !== "string" ||
    !Array.isArray(cards) ||
    cards.length !== layout.positions.length ||
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
  const trimmedScenario =
    typeof scenario === "string" ? scenario.trim().slice(0, 40) : "";

  // 二擇一時把「選 A / 選 B」換成客人自己講的兩條路,解讀才不會通篇 A 來 B 去。
  const optA = typeof optionA === "string" ? optionA.trim().slice(0, 20) : "";
  const optB = typeof optionB === "string" ? optionB.trim().slice(0, 20) : "";
  const named = Boolean(optA && optB);
  // 連同「選 A」後面那個空格一起吃掉,不然會變成「選「⋯」 的過程」
  const label = (raw: string) =>
    named ? raw.replace("選 A ", `選「${optA}」`).replace("選 B ", `選「${optB}」`) : raw;

  const drawn = cards as DrawnCard[];
  const cardLines = drawn
    .map((c, i) => {
      const ori = c.orientation === "upright" ? "正位" : "逆位";
      const num = MAJOR_NUMBERS[c.name];
      const numText = num === undefined ? "" : `${num} 號,`;
      const pos = layout.positions[i];
      return `${label(pos.label)}(${label(pos.hint)}):「${c.name}」${ori}(${numText}關鍵字:${c.keyword})`;
    })
    .join("\n");

  const total = drawn.length;
  const reversed = drawn.filter((c) => c.orientation === "reversed").length;
  const majors = drawn.filter((c) => MAJOR_NUMBERS[c.name] !== undefined).length;
  const trend = majors === total ? numberTrend(drawn.map((c) => MAJOR_NUMBERS[c.name])) : "";
  const suits = suitSignal(drawn.map((c) => c.name));
  const signals = [
    reversalSignal(reversed, total),
    majorSignal(majors, total),
    suits,
    trend,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `你是「解憂商店」的塔羅占卜師,語氣溫暖、細膩、給人安定感,像在跟熟識的朋友聊天,絕不使用恐嚇或宿命式的斷言。

【客人想問的】
主題:${topicLabel}${trimmedScenario ? `\n處境:${trimmedScenario}` : ""}${trimmedQuestion ? `\n問題:${trimmedQuestion}` : ""}

【牌陣】${layout.name}(${total} 張)
${cardLines}

【整體訊號】
${signals}

【解牌方法——最重要】
${label(layout.how)}${named ? `\n這兩條路是客人自己說的:A 是「${optA}」,B 是「${optB}」。全文都要直接講這兩個名字,絕對不要寫成「選項 A」「A 這條路」這種代號。` : ""}
不論幾張牌,都要當成「一件事的不同面向」,不是各自獨立的牌義,請務必:
1. 先問自己:這些牌合起來在說什麼?它們是互相呼應(彼此強化)、互相矛盾(內在拉扯),
   還是一因一果、一個問題配一個解方?
2. 找出主導這次占卜的那張牌,其他的是在補充它、還是在反駁它
3. 把各個位置串成一條線,讓客人讀得出前因後果
4. 全程扣著客人的問題回答,不要只是輪流背牌義

【絕對禁止】把牌拆開來輪流交代。以下寫法一律不合格:
✗「從你抽到的第一張牌來看⋯不過第二張牌提醒我們⋯至於最後一張牌⋯」
✗「現況這張是⋯挑戰這張是⋯指引這張是⋯」
合格的寫法是把牌義化進一段完整的話裡,像這樣:
✓「你在這件事上其實一直有往前衝的力氣,真正卡住的不是能力,而是你把它想成非黑即白的選擇;
　 先把眼光收回自己身上,答案會比你以為的更清楚。」
可以自然提到牌名(例如「逆位的教皇提醒著」),也可以提到位置的語意(例如「往前看的那一段」),
但不可以用「第幾張」來組織段落。

最後給一句具體、溫柔可執行的小建議作結。

輸出規則(務必遵守):
- 繁體中文,單一段落散文,${total === 1 ? "大約四到五個句子" : total >= 5 ? "大約七到九個句子" : "大約五到七個句子"}
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

    reading = unwrapCardNameHighlights(reading, drawn.map((c) => c.name));
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
