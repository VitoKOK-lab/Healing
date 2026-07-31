import { describe, expect, it } from "vitest";
import { resolveCourseAccess } from "@/lib/entitlements/access";

const NOW = new Date("2026-07-30T12:00:00Z");
const FUTURE = new Date("2026-08-15T12:00:00Z");
const PAST = new Date("2026-07-01T12:00:00Z");

describe("resolveCourseAccess", () => {
  it("購買授權:永久可看", () => {
    const r = resolveCourseAccess({
      entitlement: { kind: "PURCHASE" },
      subscription: null,
      now: NOW,
    });
    expect(r).toEqual({ hasAccess: true, reason: "purchase" });
  });

  it("受贈授權:永久可看", () => {
    const r = resolveCourseAccess({
      entitlement: { kind: "GIFT" },
      subscription: null,
      now: NOW,
    });
    expect(r).toEqual({ hasAccess: true, reason: "gift" });
  });

  it("有效訂閱:可看", () => {
    const r = resolveCourseAccess({
      entitlement: null,
      subscription: { status: "ACTIVE", currentPeriodEnd: FUTURE },
      now: NOW,
    });
    expect(r).toEqual({ hasAccess: true, reason: "subscription" });
  });

  it("已取消但期未滿:仍可看(付到期滿)", () => {
    const r = resolveCourseAccess({
      entitlement: null,
      subscription: { status: "CANCELED", currentPeriodEnd: FUTURE },
      now: NOW,
    });
    expect(r.hasAccess).toBe(true);
  });

  it("扣款失敗但期未滿:仍可看", () => {
    const r = resolveCourseAccess({
      entitlement: null,
      subscription: { status: "PAST_DUE", currentPeriodEnd: FUTURE },
      now: NOW,
    });
    expect(r.hasAccess).toBe(true);
  });

  it("訂閱期已過:不可看", () => {
    const r = resolveCourseAccess({
      entitlement: null,
      subscription: { status: "ACTIVE", currentPeriodEnd: PAST },
      now: NOW,
    });
    expect(r).toEqual({ hasAccess: false, reason: "none" });
  });

  it("PENDING 訂閱即使有期限也不可看", () => {
    const r = resolveCourseAccess({
      entitlement: null,
      subscription: { status: "PENDING", currentPeriodEnd: FUTURE },
      now: NOW,
    });
    expect(r.hasAccess).toBe(false);
  });

  it("currentPeriodEnd 為 null 不可看", () => {
    const r = resolveCourseAccess({
      entitlement: null,
      subscription: { status: "ACTIVE", currentPeriodEnd: null },
      now: NOW,
    });
    expect(r.hasAccess).toBe(false);
  });

  it("什麼都沒有:不可看", () => {
    const r = resolveCourseAccess({ entitlement: null, subscription: null, now: NOW });
    expect(r).toEqual({ hasAccess: false, reason: "none" });
  });
});
