import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

// Gemini 解讀含重試可能超過 Vercel 預設 10 秒逾時(desk 現場版仍在用這支)
export const maxDuration = 60;

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
  // 牌多的時候好幾個牌組都會過 2 張,取最多的那個才有意義
  let top: [string, number] | null = null;
  for (const entry of counts) {
    if (!top || entry[1] > top[1]) top = entry;
  }
  if (top && top[1] >= 2) {
    const s = SUITS.find((x) => x.prefix === top![0])!;
    return `${top[1]} 張${top[0]}(${s.element}元素)——重心明顯落在${s.domain}上`;
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
      "說清楚兩邊各自要付出什麼、得到什麼,然後——牌面偏向哪一邊,就明講是哪一邊," +
      "並指出是哪幾張牌讓你這樣判斷。不准兩邊各打五十大板、用「沒有絕對的好壞」收尾," +
      "客人是為了拿到一個方向才來的。真的勢均力敵時,就給一個判斷用的標準" +
      "(「如果你更在意 X,選這邊;更在意 Y,選那邊」),而不是把問題丟回去。",
  },
  relation: {
    name: "關係十字",
    positions: [
      { label: "你的心", hint: "客人在這段關係裡的心態與期待" },
      { label: "對方的心", hint: "對方目前的想法或狀態" },
      { label: "橫在中間的", hint: "關係裡的障礙或挑戰" },
      { label: "關係的根", hint: "兩人之間真正的基礎" },
      { label: "往下走的樣子", hint: "這段關係的發展展望" },
    ],
    how:
      "這是在看兩個人之間的動力。重點是「你的心」與「對方的心」之間的落差——" +
      "兩人是朝同一個方向,還是各自看著別處?再看橫在中間的東西是外力還是誤解," +
      "以及底下那個根撐不撐得住。談對方時要留餘地,說的是牌面顯示的狀態,不是替對方下定論。",
  },
  celtic: {
    name: "賽爾特十字",
    positions: [
      { label: "現況", hint: "事情此刻的核心" },
      { label: "橫跨的挑戰", hint: "正面擋著客人的那股力量" },
      { label: "根源", hint: "潛意識裡的基礎,客人沒說出口的部分" },
      { label: "剛過去的", hint: "正在退場、但影響還在的事" },
      { label: "心裡想的", hint: "客人意識到的目標或期待" },
      { label: "快來的", hint: "短期內就要發生的變化" },
      { label: "你自己", hint: "客人在這件事裡的姿態" },
      { label: "周圍的人事", hint: "環境與他人帶來的影響" },
      { label: "希望與恐懼", hint: "客人既期待又害怕的那件事" },
      { label: "最後落點", hint: "這條路走下去的終點" },
    ],
    how:
      "十張牌不是十件事,而是同一件事的十個切面。骨架這樣抓:" +
      "現況與橫跨的挑戰是一組張力,根源與剛過去的解釋它為什麼會變成這樣," +
      "心裡想的與希望恐懼常常互相矛盾——那個矛盾往往就是整個牌陣的核心," +
      "你自己與周圍的人事說明力量在誰手上,最後落點是順著現在走下去的結果,不是判決。" +
      "只挑其中三到四個最關鍵的切面深講,其餘融進脈絡裡帶過,不要十個位置逐一交代。",
  },
  tree: {
    name: "生命之樹",
    positions: [
      { label: "王冠", hint: "這件事對客人最高的意義與目的" },
      { label: "智慧", hint: "推動客人的那股原始衝動" },
      { label: "理解", hint: "客人對它的認識與既有框架" },
      { label: "慈悲", hint: "客人願意付出、想擴張的部分" },
      { label: "嚴厲", hint: "客人需要節制或切斷的部分" },
      { label: "美", hint: "整件事的核心平衡點" },
      { label: "勝利", hint: "客人的熱情與人際能量" },
      { label: "榮耀", hint: "客人的理性與溝通方式" },
      { label: "基礎", hint: "潛意識與日常習慣" },
      { label: "王國", hint: "落實到現實生活裡的樣子" },
      { label: "總結", hint: "整棵樹合起來要告訴客人的事" },
    ],
    how:
      "生命之樹是由上往下的:從王冠的目的,一路落到王國的現實生活。" +
      "左柱(理解、嚴厲、榮耀)是收束與界限,右柱(智慧、慈悲、勝利)是擴張與給予," +
      "中柱(王冠、美、基礎、王國)是這兩股力量最後平衡出來的樣子。" +
      "看的重點是:哪一柱明顯偏重?偏重的地方就是客人失衡的地方。" +
      "最後用總結那張把整棵樹收成一句話。這是自我探索,不是預測,語氣要像陪人照鏡子。",
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

// 每次隨機挑一個切入角度。沒有這個,模型會每一次都用同一套起承轉合
// (招呼→喝茶→講牌→叫人早點睡),讀起來像罐頭。
const ANGLES = [
  "這一次:直接從牌陣裡最強烈的那張牌切進去,第一句就講出它在說什麼,不要寒暄。",
  "這一次:先點出客人自己可能還沒察覺的矛盾,再用牌去解釋這個矛盾從哪來。",
  "這一次:用一個具體的生活畫面開場(例如某個時刻、某個念頭),再把牌接上去。",
  "這一次:先給結論,再回頭用牌解釋你為什麼這樣說。",
  "這一次:從客人問題裡的某個字詞切入,問他是不是其實在意的是別的事。",
  "這一次:像在覆述你看到的東西那樣開場——你看到了什麼樣的能量在流動。",
  "這一次:先講這副牌裡最溫柔的部分,再帶到需要面對的地方。",
  "這一次:開門見山地說出這件事的核心是什麼,整段圍繞這一句展開。",
];

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
// 兩種標記各有用途:〔〕是牌名出處,【】是給客人看的重點(前端會放大變色)。
// 模型兩邊都會框錯——把牌名框成【】,也會把一般詞句框成〔〕,後者更麻煩,
// 會讓重點標記整個消失。這裡直接依內容判斷並換成正確的括號,不必重新生成。
function normalizeMarkers(text: string, cardNames: string[]): string {
  const isCardish = (s: string) =>
    cardNames.some((n) => s.includes(n)) || /正位|逆位/.test(s);
  return text
    .replace(/【([^】]*)】/g, (whole, inner: string) =>
      isCardish(inner) ? `〔${inner}〕` : whole
    )
    .replace(/〔([^〕]*)〕/g, (whole, inner: string) =>
      isCardish(inner) ? whole : `【${inner}】`
    );
}

// 對誰都成立、等於沒說的句子,以及一直重複的罐頭開場/收尾。
// 抓到就重生一次——這些話出現代表這次解讀在打太極,客人看完不知道要幹嘛。
const FILLER = [
  /相信(自己|直覺|answer|答案)/,
  /答案(就)?在你(的)?心(裡|中)/,
  /順著(你的)?直覺/,
  /好好(愛|疼)(自己|惜自己)/,
  /保持(開放|平常)的?心/,
  /沒有(絕對的?)?(好|對)(與|和|跟)?(壞|錯)/,
  /閉上(雙)?眼(睛)?,?\s*想像/,
  /喝杯?(熱)?茶|泡(了)?(一)?杯/,
  /歡迎(來到|光臨)解憂商店/,
  /(今晚|今天晚上)(先)?(別|不要)/,
  /好好睡(一)?(覺|個好覺)/,
  /明天(早上)?(再|醒來)/,
  /明天(起床|一早|睜開眼)/, // 店主實測:每篇結尾都「明天起床,你可以⋯」
];

function isConcrete(text: string): boolean {
  return !FILLER.some((re) => re.test(text));
}

// 正常解讀幾乎全是中文;推理外洩的內容充滿數字、括號與英文檢查字樣。
function looksLikeReading(text: string): boolean {
  if (text.length < 60) return false;
  // 標記符號不算進中文比例,否則出處標籤一多就會被誤判成雜訊
  const body = text.replace(/[【】〔〕]/g, "");
  const cjk = (body.match(/[一-鿿]/g) || []).length;
  if (cjk / body.length < 0.72) return false;
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

  const { topic, spread, scenario, question, cards, optionA, optionB, clarify } =
    (body ?? {}) as {
      topic?: unknown;
      spread?: unknown;
      scenario?: unknown;
      question?: unknown;
      cards?: unknown;
      optionA?: unknown;
      optionB?: unknown;
      clarify?: unknown;
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
  const optA = typeof optionA === "string" ? optionA.trim().slice(0, 60) : "";
  const optB = typeof optionB === "string" ? optionB.trim().slice(0, 60) : "";
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

  // 開牌前追問到的補充。這是客人親口說的,比任何猜測都準,一定要用進去。
  const clarifyLines = (Array.isArray(clarify) ? clarify : [])
    .filter(
      (r): r is { q: string; a: string } =>
        !!r && typeof r === "object" &&
        typeof (r as { q?: unknown }).q === "string" &&
        typeof (r as { a?: unknown }).a === "string"
    )
    .slice(0, 2)
    .map((r) => `你問:「${r.q.slice(0, 60)}」 客人答:「${r.a.slice(0, 120)}」`)
    .join("\n");

  const angleIndex = Math.floor(Math.random() * ANGLES.length);
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

  const prompt = `你是「解憂商店」的塔羅占卜師。語氣溫暖、細膩、給人安定感,但溫暖不等於含糊——
你敢說實話,也敢下判斷,只是說得讓人接得住。不恐嚇、不用宿命論嚇人,但也不和稀泥。
真正的占卜師每次開口都不一樣,因為每次的牌與每個人的處境都不一樣。
說話像現在的人:句子短、口語、自然,不用「命運的齒輪」「宇宙自有安排」這種老派命理腔,
也不堆四字成語;現代日常語彙(節奏、內耗、已讀)自然出現就用,但不硬塞網路梗。

【解牌立場——榮格取向的直覺心理學】
牌不是在預言外面會發生什麼,而是把客人心裡已經知道、卻還沒說出口的東西照出來。
所以你的角度永遠是「這張牌在說你內在的哪個部分」,不是「命運會怎麼對你」。
具體要做到:
1. 【投射】牌面是客人的內在投影。與其說「會有貴人出現」,不如說
   「你正在願意讓人靠近了,這是你自己的轉變」。把主導權交回客人手上。
2. 【陰影即資源】所有看起來負面的牌都是尚未整合的力量,不是壞事。
   高塔=你早就想拆掉的東西終於鬆動;死神=你已經準備好放下了;
   惡魔=你終於看見自己被什麼綁住,看見就是鬆綁的第一步;
   寶劍三=那份痛證明你真的在乎,那是活著的證據。
   一定要把它翻成「這股能量可以怎麼用」,而不是停在「這代表不好」。
3. 【共時性】不要解釋成因果報應或宿命,而是「此刻抽到這張,是因為你正好
   走到這個功課面前」。
4. 【整合而非對抗】不要叫客人去消滅、克服、戰勝什麼,要引導他把那部分
   認回來、放到對的位置上。
5. 【全篇正向積極】不預言壞事、不下負面斷語、不使用「危險」「失敗」「注定」
   「來不及」這類詞。逆位一律讀成「能量往內走 / 還沒被整合 / 需要換個方向」,
   絕不讀成凶兆。就算牌面沉重,也要落在「所以你現在可以怎麼做」上。
   ——但正向不等於粉飾:該指出的問題還是要指出,只是用「這是你的成長點」
   的角度說,不是用「這很糟」的角度說。
${ANGLES[angleIndex]}

【客人想問的】
主題:${topicLabel}${trimmedScenario ? `\n處境:${trimmedScenario}` : ""}${trimmedQuestion ? `\n問題:${trimmedQuestion}` : ""}${clarifyLines ? `\n\n【開牌前你已經問過、客人親口補充的】\n${clarifyLines}\n(這些是客人自己說的,比任何猜測都準,務必用進解讀裡)` : ""}

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

【不要裝懂——你不是百科全書】
客人會提到你不熟的公司、職稱、證照、方法論、遊戲、圈內用語、人名。
那些是「客人的世界」,不是你要解釋的東西,你也沒有能力查證。
- 絕對不要定義、解釋、評論那個名詞是什麼、有什麼特點、要求什麼、源自哪裡。
  ✗「澤庫法則要求你把時間切成固定區塊、不斷檢視效率」——你根本不知道那是什麼
  ✗「XX 認證在業界的含金量很高」——你不知道
- 需要提到時,只照客人的說法帶過,不加任何你「補充」的知識。
  ✓「你說那套方法一直讓你失敗——牌顯示問題不在方法本身」
  ✓「你想考的那張證照,牌看到的是你考它的動機」
- 你的專業是讀牌與讀人,不是讀資料。不確定的事就不要碰,把篇幅留給牌。

【講到徵兆就要說出處】
每當你指出一個徵兆、跡象或轉折(「有股力量在擋著你」「機會快來了」「你在硬撐」),
必須在同一句話裡交代兩件事:
  (a) 這是哪一張牌顯示出來的——牌名與正逆位要用〔〕框起來,例如〔寶劍八逆位〕;
  (b) 所以該往哪個方向走——一個明確的方向,不是感受。
寫法像這樣:
✓「你一直覺得是自己不夠努力,但〔寶劍八逆位〕說綁住你的是那個念頭不是處境,
　 方向很清楚:先去確認你以為的限制是不是真的存在,而不是繼續加班。」
✓「〔錢幣七正位〕顯示東西還在長,只是還沒到收成的時候——現在該做的是守住節奏,不是換跑道。」
這跟「不要逐張報牌」不衝突:重點是把牌名嵌進你正在講的那句話裡當證據,
而不是照位置順序一張一張交代過去。全篇至少要有三處這樣的「徵兆＋出處＋方向」。

【解讀必須落地——這是客人付錢的理由】
客人看完如果還是不知道該怎麼辦,這次占卜就是失敗的。所以:
1. 不要只描述心情與能量。每講一件事,都要能回答「所以呢?」
2. 敢下判斷。牌面指向哪裡就說哪裡,不要每個結論都加上「不過也可能⋯」來自保。
3. 結尾必須給一到兩件【很快就能做、而且做完看得出來有沒有做】的事。
   時間點依牌面自然選:今晚、這週、下次見到那個人時、三天內⋯⋯
   絕對禁止以「明天起床」「明天一早」開場,也不要每篇都用「明天」當時間點——
   同一個時間錨點連續出現就是罐頭。
   ✓「今晚就找主管把你想要的那個職位直接講出來,不要再等他問你」
   ✓「這週把兩份工作的薪水、通勤時間、加班時數寫成一張表,攤開來比」
   ✓「下次他又這樣說的時候,當場告訴他你不舒服,不要回家才生氣」
   ✗「閉上眼睛想像自己在哪裡比較快樂」——想像不是行動
   ✗「順著直覺去感受」「相信答案在你心裡」「好好愛自己」「保持開放的心」
     ——這些話對誰都成立,等於什麼都沒說
4. 那件事要是從這副牌長出來的,不是通用的心靈雞湯。
   說得出「因為牌面顯示 X,所以你該做 Y」的因果關係。

【每次都要不一樣——絕對禁止的罐頭寫法】
以下這些是上一版一直重複的毛病,一個都不准出現:
✗ 開場寒暄:「歡迎來到解憂商店」「先坐下來喝杯熱茶」「為你泡了一杯茶」
  ——不要招呼、不要奉茶、不要描述客人的表情或黑眼圈,直接進入正題。
✗ 結尾套路:「今晚先別想」「好好睡一覺」「明天早上再決定」「先泡個澡」
  ——不要用睡覺、洗澡、明天再說來收尾。
✗ 任何固定的起手式或收尾句型。結尾要從這副牌自己長出來,
  可以是一句提醒、一個問句、一個畫面、一句斷言,但不可以每次都同一種。

輸出規則(務必遵守):
- 繁體中文,單一段落散文,${total === 1 ? "大約四到五個句子" : total >= 8 ? "大約十到十四個句子" : total >= 5 ? "大約七到九個句子" : "大約五到七個句子"}
- 不要出現「第一張/第二張/第三張」這種逐張報牌的說法,要讀成一個整體
- 〔〕與【】是兩件獨立的事,都要做滿,不可以因為標了牌名就省略重點:
  ・〔〕只框牌名與正逆位(例如〔戀人正位〕),是這句話的根據
  ・【】框 3～5 個最關鍵的詞或短句(例如:心裡其實已經有了【自己的答案】),
    讓讀者一眼看到重點;每個【】內以 4～10 個字為宜
- 【】要框「有內容的判斷」,不要框空詞。【方向】【重點】【建議】這種是錯的,
  要框成【先確認限制是不是真的】【你捨不得的是那份熟悉】這種看得懂的話
- 【】不可以框牌名(【戀人正位】是錯的);牌名一律用〔〕,不要用引號或粗體
- 不要條列、不要編號、不要標題、不要星號或任何 Markdown 符號
- 不要計算或標註字數
- 直接輸出解讀本文,不要任何前言、說明或自我檢查`;

  try {
    let reading = await askGemini(prompt);
    // 兩種要重來的情況:
    // (a) 思考型模型把自我檢查(逐字編號、英文檢查清單)當答案吐出來,或被截斷;
    // (b) 內容是罐頭廢話——溫暖但什麼都沒說,客人看完還是不知道要幹嘛。
    if (!looksLikeReading(reading) || !isConcrete(reading)) {
      console.warn(
        `retrying: prose=${looksLikeReading(reading)} concrete=${isConcrete(reading)}`,
        reading.slice(0, 120)
      );
      // 重試時把罐頭寫法再點名一次,並換一個切入角度
      const retryPrompt =
        prompt.replace(ANGLES[angleIndex], ANGLES[(angleIndex + 3) % ANGLES.length]) +
        "\n\n(重要:上一次的產出是空泛的場面話。這次務必給出從牌面長出來的具體判斷與可執行的行動," +
        "不要出現「相信自己」「答案在你心裡」「沒有絕對的好壞」這類對誰都成立的句子。)";
      const second = await askGemini(retryPrompt);
      // 第二次若仍不合格,取兩者中比較好的那個,而不是直接失敗
      if (looksLikeReading(second)) reading = second;
    }

    if (!looksLikeReading(reading)) {
      return NextResponse.json(
        { ok: false, error: "本喵現在有點累,請稍後再試" },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    reading = normalizeMarkers(reading, drawn.map((c) => c.name));
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
