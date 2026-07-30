import { describe, expect, it } from "vitest";
import { canTransition, assertTransition } from "@/lib/gifts/lifecycle";
import {
  generateGiftCode,
  normalizeGiftCode,
  formatGiftCode,
  isValidGiftCodeFormat,
} from "@/lib/gifts/codes";

describe("禮物碼狀態機", () => {
  it("合法轉移", () => {
    expect(canTransition("PENDING_PAYMENT", "ACTIVE")).toBe(true);
    expect(canTransition("PENDING_PAYMENT", "VOID")).toBe(true);
    expect(canTransition("ACTIVE", "REDEEMED")).toBe(true);
    expect(canTransition("ACTIVE", "VOID")).toBe(true);
  });
  it("非法轉移", () => {
    expect(canTransition("REDEEMED", "ACTIVE")).toBe(false);
    expect(canTransition("VOID", "ACTIVE")).toBe(false);
    expect(canTransition("PENDING_PAYMENT", "REDEEMED")).toBe(false);
    expect(canTransition("REDEEMED", "VOID")).toBe(false);
  });
  it("assertTransition 對非法轉移拋錯", () => {
    expect(() => assertTransition("VOID", "REDEEMED")).toThrow();
    expect(() => assertTransition("ACTIVE", "REDEEMED")).not.toThrow();
  });
});

describe("禮物碼產生與正規化", () => {
  it("產生 16 碼 Crockford Base32", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateGiftCode();
      expect(code).toHaveLength(16);
      expect(isValidGiftCodeFormat(code)).toBe(true);
    }
  });
  it("正規化:去連字號空白、轉大寫、易混淆映射", () => {
    expect(normalizeGiftCode("abcd-efgh 2345 6789")).toBe("ABCDEFGH23456789");
    expect(normalizeGiftCode("oOiIlLuU" + "23456789")).toBe("0011" + "11VV" + "23456789");
  });
  it("顯示格式 XXXX-XXXX-XXXX-XXXX", () => {
    expect(formatGiftCode("ABCDEFGH23456789")).toBe("ABCD-EFGH-2345-6789");
  });
  it("round-trip:產生→格式化→正規化→原碼", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateGiftCode();
      expect(normalizeGiftCode(formatGiftCode(code))).toBe(code);
    }
  });
});
