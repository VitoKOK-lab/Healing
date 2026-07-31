import { describe, expect, it } from "vitest";
import { addMonths } from "@/lib/orders/fulfillment";

describe("addMonths(訂閱期滿日計算)", () => {
  it("一般加一個月", () => {
    expect(addMonths(new Date(2026, 0, 15), 1)).toEqual(new Date(2026, 1, 15));
  });
  it("月底溢位修正:1/31 + 1 月 = 2/28(非 3/3)", () => {
    const r = addMonths(new Date(2026, 0, 31), 1);
    expect(r.getMonth()).toBe(1);
    expect(r.getDate()).toBe(28);
  });
  it("閏年 2/29", () => {
    const r = addMonths(new Date(2028, 0, 31), 1);
    expect(r.getMonth()).toBe(1);
    expect(r.getDate()).toBe(29);
  });
  it("12 月跨年", () => {
    expect(addMonths(new Date(2026, 11, 10), 1)).toEqual(new Date(2027, 0, 10));
  });
  it("保留時分秒", () => {
    const r = addMonths(new Date(2026, 5, 10, 14, 30, 45), 1);
    expect(r.getHours()).toBe(14);
    expect(r.getMinutes()).toBe(30);
  });
});
