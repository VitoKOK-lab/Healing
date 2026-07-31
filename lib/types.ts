// Domain 常數與型別集中處。
// 注意:Prisma + SQLite 不支援 enum,DB 欄位一律用 String,合法值以這裡的 as const 陣列為準。

export const SERIES_CATEGORIES = ["STRESS_RELIEF", "FORTUNE"] as const;
export type SeriesCategory = (typeof SERIES_CATEGORIES)[number];

export const SERIES_CATEGORY_LABEL: Record<SeriesCategory, string> = {
  STRESS_RELIEF: "舒壓",
  FORTUNE: "補運",
};

export const ORDER_KINDS = ["PURCHASE", "GIFT", "SUBSCRIPTION_INIT"] as const;
export type OrderKind = (typeof ORDER_KINDS)[number];

export const ORDER_STATUSES = ["PENDING", "PAID", "FAILED", "EXPIRED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  "PENDING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const ENTITLEMENT_KINDS = ["PURCHASE", "GIFT"] as const;
export type EntitlementKind = (typeof ENTITLEMENT_KINDS)[number];

export const GIFT_CODE_STATUSES = [
  "PENDING_PAYMENT",
  "ACTIVE",
  "REDEEMED",
  "VOID",
] as const;
export type GiftCodeStatus = (typeof GIFT_CODE_STATUSES)[number];

export const VIDEO_STATUSES = [
  "UPLOADING",
  "PROCESSING",
  "READY",
  "ERROR",
] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "待付款",
  PAID: "已付款",
  FAILED: "付款失敗",
  EXPIRED: "已逾期",
};

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  PENDING: "待付款",
  ACTIVE: "訂閱中",
  PAST_DUE: "扣款失敗",
  CANCELED: "已取消",
};

export const GIFT_CODE_STATUS_LABEL: Record<GiftCodeStatus, string> = {
  PENDING_PAYMENT: "待付款",
  ACTIVE: "可兌換",
  REDEEMED: "已兌換",
  VOID: "已作廢",
};

export function formatTwd(amount: number): string {
  return `NT$${amount.toLocaleString("zh-Hant-TW")}`;
}
