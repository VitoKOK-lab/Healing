import { cardByN, isMajor } from "./deck";
import { spreadOf } from "./spreads";
import type { Drawn } from "./draw";
import { THRESHOLDS } from "./tier-thresholds";

// T1–T5 定調:tier 是牌面的純函數——同一副牌永遠同一個方向,不摻任何隨機。
// 生成模型只負責把已鎖定的方向表達出來(規格 §2.2)。
//
// 加權分 = Σ 牌分(正/逆位)×(大牌 1.5)× 位置權重,再除以 Σ 位置權重。
// 門檻不是拍腦袋:scripts/calibrate-tier.ts 以 10 萬次蒙地卡羅取每個牌陣
// 自己的分位數(10% / 34% / 64% / 90%),寫死進 tier-thresholds.ts,
// 使每種牌陣的長期分布都落在 T1 10%、T2 26%、T3 30%、T4 24%、T5 10%。
// 調整牌分後必須重跑校準腳本。

export type Tier = "T1" | "T2" | "T3" | "T4" | "T5";

export const TIER_DIRECTION: Record<Tier, -1 | 0 | 1> = {
  T1: 1,
  T2: 1,
  T3: 0,
  T4: -1,
  T5: -1,
};

export const MAJOR_MULTIPLIER = 1.5;

export function weightedScore(cards: Pick<Drawn, "n" | "orientation">[], spreadId: string): number {
  const spread = spreadOf(spreadId);
  if (cards.length !== spread.positions.length) {
    throw new Error(`spread ${spread.id} expects ${spread.positions.length} cards, got ${cards.length}`);
  }
  let sum = 0;
  let weightSum = 0;
  cards.forEach((c, i) => {
    const card = cardByN(c.n);
    const base = c.orientation === "upright" ? card.score.up : card.score.rev;
    const w = spread.positions[i].weight;
    sum += base * (isMajor(c.n) ? MAJOR_MULTIPLIER : 1) * w;
    weightSum += w;
  });
  return sum / weightSum;
}

export function tierOf(cards: Pick<Drawn, "n" | "orientation">[], spreadId: string): Tier {
  const spread = spreadOf(spreadId);
  const s = weightedScore(cards, spread.id);
  const t = THRESHOLDS[spread.id];
  if (!t) throw new Error(`no calibrated thresholds for spread ${spread.id}`);
  // t = [q10, q34, q64, q90]:低於 q10 → T5,依序往上
  if (s < t[0]) return "T5";
  if (s < t[1]) return "T4";
  if (s < t[2]) return "T3";
  if (s < t[3]) return "T2";
  return "T1";
}
