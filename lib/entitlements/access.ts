// 觀看授權規則(純函式,單元測試重點)。
// 規則:永久授權(購買/受贈)恆可看;否則看該課程所屬系列的訂閱——
// 只要 currentPeriodEnd 還沒過(含已取消、扣款失敗但期未滿)就可看。

export type AccessReason =
  | "purchase"
  | "gift"
  | "subscription"
  | "free-preview"
  | "none";

export interface AccessInput {
  entitlement: { kind: string } | null;
  subscription: { status: string; currentPeriodEnd: Date | null } | null;
  now: Date;
}

export interface AccessResult {
  hasAccess: boolean;
  reason: AccessReason;
}

export function resolveCourseAccess(input: AccessInput): AccessResult {
  if (input.entitlement) {
    return {
      hasAccess: true,
      reason: input.entitlement.kind === "GIFT" ? "gift" : "purchase",
    };
  }
  const sub = input.subscription;
  if (
    sub &&
    sub.currentPeriodEnd !== null &&
    sub.currentPeriodEnd.getTime() > input.now.getTime() &&
    ["ACTIVE", "PAST_DUE", "CANCELED"].includes(sub.status)
  ) {
    return { hasAccess: true, reason: "subscription" };
  }
  return { hasAccess: false, reason: "none" };
}

/** 訂閱是否應顯示為「可觀看中」(含取消未到期) */
export function subscriptionGrantsAccess(
  sub: { status: string; currentPeriodEnd: Date | null } | null,
  now: Date
): boolean {
  return resolveCourseAccess({ entitlement: null, subscription: sub, now }).hasAccess;
}
