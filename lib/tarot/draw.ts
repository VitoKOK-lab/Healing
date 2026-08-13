import { createHash } from "crypto";
import { CARDS, cardByN, isMajor } from "./deck";
import { spreadOf } from "./spreads";

// 伺服器端抽牌。前端只送「切牌手勢」(切點與滑動軌跡),
// 洗牌、發牌、正逆位全部在這裡決定——客戶端沒有可竄改的空間。
//
// 亂數與正位機率(0.65)沿用原前端引擎(tarot-data.js 的 makeRng/drawSpread),
// 讓新舊版抽牌手感一致。

export type Drawn = {
  n: number;
  name: string;
  keyword: string;
  position: string;
  positionHint: string;
  orientation: "upright" | "reversed";
  meaning: string;
  major: boolean;
};

// mulberry32:與原前端相同的可回溯亂數
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWith<T>(arr: readonly T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 手勢 + 伺服器 nonce → 種子。nonce 由呼叫端產生並存進 Reading,
// 之後同一筆占卜重算必得同一副牌(可回溯),但客戶端無法預測。
export function seedFrom(gesture: string, nonce: string): number {
  const h = createHash("sha256").update(gesture).update(":").update(nonce).digest();
  return h.readUInt32BE(0);
}

export function drawSpread(spreadId: string, seed: number, cutPoint: number): Drawn[] {
  const spread = spreadOf(spreadId);
  const rnd = makeRng(seed);
  const deck = shuffleWith(CARDS, rnd);
  const start = Math.floor(Math.max(0, Math.min(1, cutPoint || 0)) * deck.length);

  return spread.positions.map((pos, i) => {
    const c = deck[(start + i) % deck.length];
    const upright = rnd() > 0.35;
    return {
      n: c.n,
      name: c.name,
      keyword: c.keyword,
      position: pos.label,
      positionHint: pos.hint,
      orientation: upright ? "upright" : "reversed",
      meaning: upright ? c.upright : c.reversed,
      major: isMajor(c.n),
    };
  });
}

export { cardByN };
