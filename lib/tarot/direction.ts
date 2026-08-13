// 方向二次檢查(規格 §4.1 第 8 條):政策降溫最隱蔽的形式不是加免責,
// 是把 T5 寫成 T3。T4/T5 的產出 100% 過這一關,不抽驗。
//
// 分類器以注入的 caller 呼叫(正式環境接 Claude Haiku,測試注入 fake),
// 這層只負責「分類 → 與 tier 對照」的邏輯。

import type { Tier } from "./tier";
import { TIER_DIRECTION } from "./tier";

export type Direction = -1 | 0 | 1;

// caller:丟 prompt 回純文字。由呼叫端決定接哪個模型。
export type ClassifyCaller = (prompt: string) => Promise<string>;

const CLASSIFY_PROMPT = (text: string) => `以下是一段塔羅解讀。判斷它對問卜者整體處境的方向:
- 有利、順遂、鼓勵推進 → 回答 +1
- 中性、有變數、視條件而定 → 回答 0
- 不利、有阻力、勸退或需要停下 → 回答 -1

只回答 +1、0 或 -1,不要任何其他文字。

解讀全文:
${text}`;

export function parseDirection(raw: string): Direction | null {
  const m = raw.trim().match(/^[+]?(-?1|0)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n === 1 || n === 0 || n === -1 ? (n as Direction) : null;
}

export async function classifyDirection(text: string, call: ClassifyCaller): Promise<Direction | null> {
  return parseDirection(await call(CLASSIFY_PROMPT(text)));
}

// true = 方向與 tier 相符;false = 被中性化(或反向),要重生成
export async function verifyDirection(text: string, tier: Tier, call: ClassifyCaller): Promise<boolean> {
  const expected = TIER_DIRECTION[tier];
  const actual = await classifyDirection(text, call);
  if (actual === null) return false; // 分類器答非所問,保守視為未通過
  return actual === expected;
}

// 只有 T4/T5 需要必查(T1-T3 被「降溫」沒有商業傷害)
export function needsDirectionCheck(tier: Tier): boolean {
  return tier === "T4" || tier === "T5";
}
