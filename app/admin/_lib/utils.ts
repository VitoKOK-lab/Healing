// 後台 server 端小工具。

import { Prisma } from "@prisma/client";

/** Prisma unique 衝突(P2002),用於 slug 重複的友善錯誤 */
export function isUniqueConflict(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

export function fmtDateTime(d: Date | null | undefined): string {
  return d ? d.toLocaleString("zh-Hant-TW") : "—";
}

export function fmtDate(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString("zh-Hant-TW") : "—";
}
