import { describe, expect, it } from "vitest";
import { amountFor, isPurchaseKind } from "@/lib/payments/pricing";

describe("定價(伺服器單方面決定,不採信客戶端)", () => {
  it("deepen 固定 NT$20", () => {
    expect(amountFor("deepen")).toBe(20);
  });

  it("deep 走 env 預設 149", () => {
    expect(amountFor("deep")).toBe(149);
  });

  it("kind 白名單", () => {
    expect(isPurchaseKind("deepen")).toBe(true);
    expect(isPurchaseKind("deep")).toBe(true);
    expect(isPurchaseKind("free")).toBe(false);
    expect(isPurchaseKind(20)).toBe(false);
    expect(isPurchaseKind(null)).toBe(false);
  });
});
