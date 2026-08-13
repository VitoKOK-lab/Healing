import { env } from "@/lib/env";

// 產品階梯定價(規格 §1)。deepen 固定 NT$20(第一次付款的低門檻,不做浮動);
// deep 走 env 設定(預設 149,上線前可調)。

export type PurchaseKind = "deepen" | "deep";

export function amountFor(kind: PurchaseKind): number {
  return kind === "deepen" ? 20 : env.PRICE_DEEP;
}

export function isPurchaseKind(v: unknown): v is PurchaseKind {
  return v === "deepen" || v === "deep";
}
