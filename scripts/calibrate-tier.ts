// 蒙地卡羅校準 tier 門檻:每個牌陣抽 10 萬副,取加權分的
// 10% / 34% / 64% / 90% 分位數,寫進 lib/tarot/tier-thresholds.ts。
// 長期分布因此落在 T1 10%、T2 26%、T3 30%、T4 24%、T5 10%(T4+T5=34%,規格 §2.1)。
//
// 用法:npx tsx scripts/calibrate-tier.ts        # 印分布(驗證用,不寫檔)
//       npx tsx scripts/calibrate-tier.ts --write # 重算並覆寫 tier-thresholds.ts
//
// 改了 deck.ts 的牌分或 spreads.ts 的權重之後必須 --write 重跑。

import { writeFileSync } from "fs";
import { randomInt } from "crypto";
import { drawSpread } from "../lib/tarot/draw";
import { weightedScore } from "../lib/tarot/tier";
import { SPREADS } from "../lib/tarot/spreads";

const N = 100_000;
const QUANTILES = [0.1, 0.34, 0.64, 0.9];

function calibrate(spreadId: string): number[] {
  const scores: number[] = new Array(N);
  for (let i = 0; i < N; i++) {
    const cards = drawSpread(spreadId, randomInt(0, 2 ** 31), Math.random());
    scores[i] = weightedScore(cards, spreadId);
  }
  scores.sort((a, b) => a - b);
  return QUANTILES.map((q) => scores[Math.floor(q * N)]);
}

const rows: string[] = [];
const summary: string[] = [];

for (const id of Object.keys(SPREADS)) {
  const t = calibrate(id);
  rows.push(`  ${id}: [${t.map((v) => v.toFixed(4)).join(", ")}],`);

  // 用剛算好的門檻驗一輪分布
  const counts = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };
  for (let i = 0; i < 20_000; i++) {
    const cards = drawSpread(id, randomInt(0, 2 ** 31), Math.random());
    const s = weightedScore(cards, id);
    const tier = s < t[0] ? "T5" : s < t[1] ? "T4" : s < t[2] ? "T3" : s < t[3] ? "T2" : "T1";
    counts[tier as keyof typeof counts]++;
  }
  const pct = (n: number) => ((n / 20_000) * 100).toFixed(1);
  summary.push(
    `${id.padEnd(9)} T1 ${pct(counts.T1)}%  T2 ${pct(counts.T2)}%  T3 ${pct(counts.T3)}%  ` +
      `T4 ${pct(counts.T4)}%  T5 ${pct(counts.T5)}%  (T4+T5 ${pct(counts.T4 + counts.T5)}%)`
  );
}

console.log(summary.join("\n"));

if (process.argv.includes("--write")) {
  const file =
    "// 由 scripts/calibrate-tier.ts --write 產生,不要手改。\n" +
    "// 每列是該牌陣加權分的 [q10, q34, q64, q90] 分位數(10 萬次蒙地卡羅)。\n" +
    "export const THRESHOLDS: Record<string, number[]> = {\n" +
    rows.join("\n") +
    "\n};\n";
  writeFileSync("lib/tarot/tier-thresholds.ts", file);
  console.log("\nwrote lib/tarot/tier-thresholds.ts");
}
