import { describe, expect, it } from "vitest";
import { generateMerchantTradeNo } from "@/lib/orders/orderNo";

describe("generateMerchantTradeNo", () => {
  const fixed = new Date(2026, 6, 30, 13, 45, 59);

  it("長度恰為 20(綠界上限)", () => {
    expect(generateMerchantTradeNo("OD", fixed)).toHaveLength(20);
    expect(generateMerchantTradeNo("SB", fixed)).toHaveLength(20);
  });

  it("僅含英數字", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateMerchantTradeNo("OD", fixed)).toMatch(/^[A-Z0-9]{20}$/i);
    }
  });

  it("含前綴與時間戳", () => {
    const no = generateMerchantTradeNo("OD", fixed);
    expect(no.startsWith("OD260730134559")).toBe(true);
  });

  it("高機率不重複", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateMerchantTradeNo("OD", fixed));
    expect(seen.size).toBeGreaterThan(990);
  });
});
