import { randomBytes } from "node:crypto";

// 綠界 MerchantTradeNo 限制:唯一、英數字、最長 20 碼。
// 格式:前綴(2) + yyMMddHHmmss(12) + 隨機 base36(6) = 20 碼。

export type OrderNoPrefix = "OD" | "SB";

export function generateMerchantTradeNo(prefix: OrderNoPrefix, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts =
    String(now.getFullYear()).slice(2) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
  const rand = Array.from(randomBytes(6))
    .map((b) => (b % 36).toString(36))
    .join("")
    .toUpperCase();
  return `${prefix}${ts}${rand}`;
}
