import { describe, expect, it } from "vitest";
import { taipeiDateString, previousDateString, nextStreak } from "@/lib/tarot/daily";

describe("台北時區換日", () => {
  // 台北午夜 = UTC 16:00
  it("UTC 15:59 還是前一天,16:01 換日", () => {
    expect(taipeiDateString(new Date("2026-08-13T15:59:00Z"))).toBe("2026-08-13");
    expect(taipeiDateString(new Date("2026-08-13T16:01:00Z"))).toBe("2026-08-14");
  });

  it("台北 23:59 與 00:01 分屬兩天", () => {
    expect(taipeiDateString(new Date("2026-08-13T15:59:59Z"))).toBe("2026-08-13"); // 台北 23:59:59
    expect(taipeiDateString(new Date("2026-08-13T16:00:01Z"))).toBe("2026-08-14"); // 台北 00:00:01
  });

  it("前一天計算跨月跨年正確", () => {
    expect(previousDateString("2026-08-13")).toBe("2026-08-12");
    expect(previousDateString("2026-08-01")).toBe("2026-07-31");
    expect(previousDateString("2026-01-01")).toBe("2025-12-31");
    expect(previousDateString("2028-03-01")).toBe("2028-02-29"); // 閏年
  });
});

describe("streak 計算", () => {
  it("第一次抽:streak = 1", () => {
    expect(nextStreak(null, "2026-08-13", 0)).toEqual({ streak: 1, rewarded: false });
  });

  it("昨天有抽:連續 +1", () => {
    expect(nextStreak("2026-08-12", "2026-08-13", 3)).toEqual({ streak: 4, rewarded: false });
  });

  it("斷簽(前天抽、昨天沒抽):歸 1", () => {
    expect(nextStreak("2026-08-11", "2026-08-13", 6)).toEqual({ streak: 1, rewarded: false });
  });

  it("連滿 7 天:發獎勵", () => {
    expect(nextStreak("2026-08-12", "2026-08-13", 6)).toEqual({ streak: 7, rewarded: true });
  });

  it("連滿 14 天:再發一次(每 7 天一輪)", () => {
    expect(nextStreak("2026-08-12", "2026-08-13", 13)).toEqual({ streak: 14, rewarded: true });
    expect(nextStreak("2026-08-12", "2026-08-13", 7)).toEqual({ streak: 8, rewarded: false });
  });

  it("跨月的連續不中斷", () => {
    expect(nextStreak("2026-07-31", "2026-08-01", 2)).toEqual({ streak: 3, rewarded: false });
  });
});
