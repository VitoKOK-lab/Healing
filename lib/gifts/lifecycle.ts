// 禮物碼狀態機(純函式):所有狀態變更必須通過 canTransition 檢查。
// PENDING_PAYMENT ─付款成功→ ACTIVE ─兌換→ REDEEMED
//        │付款失敗/作廢              │管理員作廢
//        └────────→ VOID ←──────────┘

import type { GiftCodeStatus } from "@/lib/types";

const TRANSITIONS: Record<GiftCodeStatus, GiftCodeStatus[]> = {
  PENDING_PAYMENT: ["ACTIVE", "VOID"],
  ACTIVE: ["REDEEMED", "VOID"],
  REDEEMED: [],
  VOID: [],
};

export function canTransition(from: GiftCodeStatus, to: GiftCodeStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: GiftCodeStatus, to: GiftCodeStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`禮物碼狀態不可由 ${from} 變更為 ${to}`);
  }
}
