// 20 組品質審核(規格 §8):五級各 4 組,自動蒐集 + 自動指標 + 人工審核底稿。
//
// 兩種跑法:
//   本機直連模型:ANTHROPIC_API_KEY=sk-... npx tsx scripts/quality-review.ts
//     (不需要資料庫;provider 依 MODEL_PROVIDER,預設 claude)
//   打已部署的站:npx tsx scripts/quality-review.ts --remote https://healingasmr.vercel.app
//     (需要該站 LINE_STUB=1 + 資料庫 + 模型金鑰;走 mock 金流付 deep 單)
//
// 產出 qa-report.md:摘要指標 + 20 篇全文 + 人工勾選清單。
// 通過標準(規格):人工通過率 ≥85%;T4/T5 中性化率 ≤20%。

import { writeFileSync } from "fs";
import { drawSpread, seedFrom, type Drawn } from "../lib/tarot/draw";
import { tierOf, type Tier } from "../lib/tarot/tier";
import { generateReading } from "../lib/tarot/generate";
import { check } from "../lib/tarot/guards";

type Sample = {
  idx: number;
  tier: Tier;
  spreadId: string;
  topic: string;
  question: string;
  cards: Drawn[];
  text: string;
  fallback: boolean;
  attempts: number;
};

// 每級 4 組;牌陣與問題輪著配(問題都避開 unsuitable 詞庫)
const PLAN: Array<{ tier: Tier; spreadId: string; topic: string; question: string }> = [
  { tier: "T1", spreadId: "flow", topic: "感情", question: "這段關係接下來會怎麼發展" },
  { tier: "T1", spreadId: "choice", topic: "工作", question: "該留在現在的公司還是接受新的邀約" },
  { tier: "T1", spreadId: "relation", topic: "感情", question: "我們之間最近變得有點安靜" },
  { tier: "T1", spreadId: "tree", topic: "生活", question: "想整體看看自己現在的狀態" },
  { tier: "T2", spreadId: "flow", topic: "工作", question: "新的專案值不值得投入" },
  { tier: "T2", spreadId: "celtic", topic: "感情", question: "想把這段關係看得徹底一點" },
  { tier: "T2", spreadId: "choice", topic: "生活", question: "搬去新城市還是留在熟悉的地方" },
  { tier: "T2", spreadId: "relation", topic: "感情", question: "和家人的關係想修復" },
  { tier: "T3", spreadId: "flow", topic: "金錢", question: "最近的財務走向" },
  { tier: "T3", spreadId: "choice", topic: "工作", question: "要不要自己出來接案" },
  { tier: "T3", spreadId: "relation", topic: "感情", question: "曖昧了一陣子,想知道彼此的心" },
  { tier: "T3", spreadId: "tree", topic: "生活", question: "覺得卡卡的,想認識自己一次" },
  { tier: "T4", spreadId: "flow", topic: "感情", question: "他最近的態度讓我不安" },
  { tier: "T4", spreadId: "choice", topic: "工作", question: "留下來撐還是趁早離開" },
  { tier: "T4", spreadId: "relation", topic: "感情", question: "我們一直為同一件事吵" },
  { tier: "T4", spreadId: "celtic", topic: "工作", question: "整個團隊的狀況想全面看一次" },
  { tier: "T5", spreadId: "flow", topic: "感情", question: "這段感情還走得下去嗎" },
  { tier: "T5", spreadId: "choice", topic: "工作", question: "這個合作案要不要簽" },
  { tier: "T5", spreadId: "relation", topic: "感情", question: "對方好像越來越遠了" },
  { tier: "T5", spreadId: "celtic", topic: "生活", question: "最近諸事不順,想看清楚原因" },
];

// 找一副落在目標 tier 的牌(tier 是牌面純函數,掃種子就好)
function findCards(spreadId: string, tier: Tier, salt: number): Drawn[] {
  for (let i = 0; i < 200_000; i++) {
    const seed = seedFrom(`qa:${salt}:${i}`, "qa-nonce");
    const cards = drawSpread(spreadId, seed, (i % 97) / 97);
    if (tierOf(cards, spreadId) === tier) return cards;
  }
  throw new Error(`找不到 ${spreadId}/${tier} 的牌組`);
}

// ── 遠端模式:走部署站的完整 API(含 mock 金流)────────────
async function remoteSample(base: string, plan: (typeof PLAN)[number], idx: number): Promise<Sample> {
  const token = `stub:qa-${Date.now()}-${idx}`;
  const post = async (path: string, body: unknown) => {
    const res = await fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  // 抽到目標 tier 為止(deep 不限次數;只有選中的那副才付錢生成)
  let draw: any = null;
  for (let i = 0; i < 60; i++) {
    const r = await post("/api/v2/draw", {
      accessToken: token,
      level: "deep",
      spreadId: plan.spreadId,
      topic: plan.topic,
      question: plan.question,
      gesture: { cut: (i * 13 + idx) % 100 / 100, trail: `qa-${idx}-${i}` },
    });
    if (!r.ok) throw new Error(`draw 失敗: ${JSON.stringify(r)}`);
    if (r.tier === plan.tier) { draw = r; break; }
  }
  if (!draw) throw new Error(`60 次抽不到 ${plan.tier}(${plan.spreadId})`);

  const pay = await post("/api/v2/payments/request", {
    accessToken: token, kind: "deep", readingId: draw.readingId,
  });
  if (!pay.ok) throw new Error(`付款建單失敗: ${JSON.stringify(pay)}`);
  const confirm = await post("/api/v2/payments/confirm", {
    accessToken: token, purchaseId: pay.purchaseId, result: "success",
  });
  if (!confirm.ok) throw new Error(`付款確認失敗: ${JSON.stringify(confirm)}`);

  const reading = await post("/api/v2/reading", { accessToken: token, readingId: draw.readingId });
  if (!reading.ok) throw new Error(`生成失敗: ${JSON.stringify(reading)}`);

  return {
    idx, tier: plan.tier, spreadId: plan.spreadId, topic: plan.topic, question: plan.question,
    cards: draw.cards, text: reading.text, fallback: Boolean(reading.fallback), attempts: -1,
  };
}

// ── 本機模式:直連模型,不需要資料庫 ─────────────────────
async function localSample(plan: (typeof PLAN)[number], idx: number): Promise<Sample> {
  const cards = findCards(plan.spreadId, plan.tier, idx);
  const result = await generateReading(
    {
      level: "deep", cards, spreadId: plan.spreadId, tier: plan.tier,
      topic: plan.topic, question: plan.question,
    },
    { seedAngle: idx }
  );
  return {
    idx, tier: plan.tier, spreadId: plan.spreadId, topic: plan.topic, question: plan.question,
    cards, text: result.text, fallback: result.fallback, attempts: result.attempts,
  };
}

// ── 自動指標 ─────────────────────────────────────────────
function metrics(samples: Sample[]): string {
  const lines: string[] = [];
  const ok = samples.filter((s) => !s.fallback);
  lines.push(`- 成功生成:${ok.length}/${samples.length}(降級 ${samples.length - ok.length})`);

  const lens = ok.map((s) => s.text.length);
  if (lens.length) {
    lines.push(`- 長度:min ${Math.min(...lens)} / avg ${Math.round(lens.reduce((a, b) => a + b, 0) / lens.length)} / max ${Math.max(...lens)} 字`);
  }

  // 第四段開頭 6 字的重複度(抓「明天起床」這類單一化)
  const openers = new Map<string, number>();
  for (const s of ok) {
    const paras = s.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const last = paras[paras.length - 1] ?? "";
    const key = last.slice(0, 6);
    openers.set(key, (openers.get(key) ?? 0) + 1);
  }
  const dupOpeners = [...openers.entries()].filter(([, n]) => n >= 3);
  lines.push(
    dupOpeners.length
      ? `- ⚠ 結尾開頭重複:${dupOpeners.map(([k, n]) => `「${k}…」×${n}`).join("、")}`
      : `- 結尾開頭無明顯重複(${openers.size} 種)`
  );

  // 跨篇罐頭句:同一段 10 字視窗出現在 ≥3 篇
  const windowOwners = new Map<string, Set<number>>();
  for (const s of ok) {
    const clean = s.text.replace(/[\s【】〔〕「」『』,。;:!?、]/g, "");
    for (let i = 0; i + 10 <= clean.length; i++) {
      const w = clean.slice(i, i + 10);
      if (!windowOwners.has(w)) windowOwners.set(w, new Set());
      windowOwners.get(w)!.add(s.idx);
    }
  }
  const canned = [...windowOwners.entries()].filter(([, owners]) => owners.size >= 3);
  lines.push(
    canned.length
      ? `- ⚠ 跨篇重複句(${canned.length} 個 10 字視窗出現在 ≥3 篇),樣本:${canned.slice(0, 3).map(([w]) => `「${w}」`).join("、")}`
      : `- 無跨篇罐頭句(10 字視窗檢測)`
  );

  // guards 復查(理論上管線已保證,這裡是雙重確認)
  const dirty = ok.filter((s) => check(s.text, "paid").length > 0);
  lines.push(dirty.length ? `- ⚠ guards 復查未過:${dirty.map((s) => "#" + s.idx).join(",")}` : `- guards 復查全數通過`);

  return lines.join("\n");
}

function report(samples: Sample[], mode: string): string {
  const parts: string[] = [];
  parts.push(`# 20 組品質審核報告(${mode})`);
  parts.push(`\n## 自動指標\n\n${metrics(samples)}`);
  parts.push(`\n## 人工審核\n\n每篇依規格 §8 勾選;通過率 ≥85% 才放行付費層,T4/T5 中性化 >20% 一票否決。\n`);
  for (const s of samples) {
    parts.push(`---\n\n### #${s.idx} ${s.tier} · ${s.spreadId} · ${s.topic}`);
    parts.push(`問題:${s.question}`);
    parts.push(`牌面:${s.cards.map((c) => `${c.name}${c.orientation === "reversed" ? "(逆)" : ""}`).join("、")}`);
    if (s.fallback) parts.push(`**⚠ 此篇為降級文案**`);
    parts.push(`\n${s.text}\n`);
    parts.push(`- [ ] 定調段第一句就有方向`);
    parts.push(`- [ ] ${s.tier === "T4" || s.tier === "T5" ? "不利方向明確,未被中性化 ★必查" : s.tier === "T3" ? "有指出決定變數" : "方向明確不含糊"}`);
    parts.push(`- [ ] 讀成一個整體,非逐張報牌`);
    parts.push(`- [ ] 「一件事」具體可驗證、無罐頭開場`);
    parts.push(`- [ ] 台灣語感自然`);
  }
  return parts.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const remoteIdx = args.indexOf("--remote");
  const remote = remoteIdx !== -1 ? args[remoteIdx + 1]?.replace(/\/$/, "") : null;

  if (args.includes("--help") || (!remote && !process.env.ANTHROPIC_API_KEY && !process.env.KIMI_API_KEY)) {
    console.log("本機:ANTHROPIC_API_KEY=... npx tsx scripts/quality-review.ts");
    console.log("遠端:npx tsx scripts/quality-review.ts --remote https://healingasmr.vercel.app");
    process.exit(args.includes("--help") ? 0 : 1);
  }

  const samples: Sample[] = [];
  for (let i = 0; i < PLAN.length; i++) {
    const plan = PLAN[i];
    process.stderr.write(`[${i + 1}/${PLAN.length}] ${plan.tier} ${plan.spreadId} ⋯\n`);
    try {
      samples.push(remote ? await remoteSample(remote, plan, i) : await localSample(plan, i));
    } catch (e) {
      process.stderr.write(`  失敗:${(e as Error).message}\n`);
    }
  }

  const md = report(samples, remote ? `遠端 ${remote}` : `本機 ${process.env.MODEL_PROVIDER ?? "claude"}`);
  writeFileSync("qa-report.md", md);
  console.log(`\n完成:${samples.length}/${PLAN.length} 篇,報告在 qa-report.md`);
}

main();
