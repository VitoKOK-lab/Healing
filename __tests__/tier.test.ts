import { describe, expect, it } from "vitest";
import { drawSpread, seedFrom } from "@/lib/tarot/draw";
import { tierOf, weightedScore, TIER_DIRECTION } from "@/lib/tarot/tier";
import { CARDS } from "@/lib/tarot/deck";
import { SPREADS } from "@/lib/tarot/spreads";

type C = { n: number; orientation: "upright" | "reversed" };
const up = (n: number): C => ({ n, orientation: "upright" });
const rev = (n: number): C => ({ n, orientation: "reversed" });

describe("tier 是牌面的純函數", () => {
  it("同一副牌永遠同一個 tier", () => {
    const cards = [up(19), rev(52), up(64)]; // 太陽正、寶劍三逆、錢幣一正
    const first = tierOf(cards, "flow");
    for (let i = 0; i < 50; i++) expect(tierOf(cards, "flow")).toBe(first);
  });

  it("同一個種子抽出同一副牌(可回溯)", () => {
    const seed = seedFrom("cut:0.42|trail:abc", "nonce-1");
    const a = drawSpread("celtic", seed, 0.42);
    const b = drawSpread("celtic", seed, 0.42);
    expect(a).toEqual(b);
    // 換 nonce 就是另一副牌
    const c = drawSpread("celtic", seedFrom("cut:0.42|trail:abc", "nonce-2"), 0.42);
    expect(c).not.toEqual(a);
  });
});

describe("tier 方向與牌面吉凶一致", () => {
  it("滿手大吉牌不會落在 T4/T5", () => {
    // 太陽、世界、聖杯十 全正位
    const t = tierOf([up(19), up(21), up(45)], "flow");
    expect(TIER_DIRECTION[t]).toBe(1);
  });

  it("滿手沉重牌不會落在 T1/T2", () => {
    // 高塔、寶劍三、寶劍十 全正位
    const t = tierOf([up(16), up(52), up(59)], "flow");
    expect(TIER_DIRECTION[t]).toBe(-1);
  });

  it("大牌加權:同分的大牌比小牌更能拉動方向", () => {
    // 太陽(+2 大牌)在未來位 vs 錢幣九(+2 小牌)在未來位,其餘相同
    const base: C[] = [rev(51), up(53)]; // 寶劍二逆、寶劍四正(中性偏弱)
    const withMajor = weightedScore([...base, up(19)], "flow");
    const withMinor = weightedScore([...base, up(72)], "flow");
    expect(withMajor).toBeGreaterThan(withMinor);
  });

  it("張數不符牌陣直接丟錯", () => {
    expect(() => tierOf([up(0)], "flow")).toThrow();
  });
});

describe("長期分布落在校準目標(規格 §2.1)", () => {
  // 多牌陣目標:T1 10%、T2 26%、T3 30%、T4 24%、T5 10%,容差 ±3 個百分點。
  // single 是離散分布(78×2 種分數)切不出精確分位,免費日抽偏溫和是產品決定,
  // 只驗證它 T4+T5 不高於 34%。
  const sample = (spreadId: string, n: number) => {
    const counts: Record<string, number> = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };
    let x = 12345;
    const rnd = () => {
      // 測試自帶簡單 LCG,避免依賴 Math.random 的不可重現
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      return x / 0x80000000;
    };
    for (let i = 0; i < n; i++) {
      const cards = drawSpread(spreadId, Math.floor(rnd() * 2 ** 31), rnd());
      counts[tierOf(cards, spreadId)]++;
    }
    return counts;
  };

  for (const id of ["flow", "choice", "relation", "celtic", "tree"]) {
    it(`${id}:T4+T5 在 31–37%`, () => {
      const c = sample(id, 10_000);
      const badRate = (c.T4 + c.T5) / 10_000;
      expect(badRate).toBeGreaterThan(0.31);
      expect(badRate).toBeLessThan(0.37);
      expect(c.T1 / 10_000).toBeGreaterThan(0.07);
      expect(c.T1 / 10_000).toBeLessThan(0.13);
    });
  }

  it("single(免費日抽):偏溫和,T4+T5 不高於 34%", () => {
    const c = sample("single", 10_000);
    expect((c.T4 + c.T5) / 10_000).toBeLessThanOrEqual(0.34);
  });
});

describe("資料完整性", () => {
  it("78 張牌齊全且編號連續", () => {
    expect(CARDS).toHaveLength(78);
    CARDS.forEach((c, i) => expect(c.n).toBe(i));
  });

  it("每張牌都有 -2~+2 的吉凶分", () => {
    for (const c of CARDS) {
      for (const s of [c.score.up, c.score.rev]) {
        expect(s).toBeGreaterThanOrEqual(-2);
        expect(s).toBeLessThanOrEqual(2);
        expect(Number.isInteger(s)).toBe(true);
      }
    }
  });

  it("六個牌陣的位置權重都是正數", () => {
    for (const s of Object.values(SPREADS)) {
      expect(s.positions.length).toBeGreaterThan(0);
      for (const p of s.positions) expect(p.weight).toBeGreaterThan(0);
    }
  });
});
