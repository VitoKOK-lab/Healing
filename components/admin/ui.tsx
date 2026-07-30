// 後台共用 UI 元件(server components)。

import Link from "next/link";
import type { ReactNode } from "react";

/** 頁面標題區 */
export function AdminHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 font-serif-tc text-2xl font-semibold">{title}</h1>
      </div>
      {action}
    </div>
  );
}

/** 卡片包裹的資料表 */
export function AdminTable({
  head,
  children,
}: {
  head: string[];
  children: ReactNode;
}) {
  return (
    <div className="card mt-8 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline text-left text-xs text-inkdim">
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-5 py-3.5 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ colSpan, text = "目前沒有資料。" }: { colSpan: number; text?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-inkdim">
        {text}
      </td>
    </tr>
  );
}

/** 圓角小狀態標籤 */
export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "gold" | "success" | "danger";
}) {
  const toneClass = {
    neutral: "border-hairline text-inkdim",
    gold: "border-goldline text-gold",
    success: "border-goldline text-success",
    danger: "border-goldline text-danger",
  }[tone];
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs ${toneClass}`}
    >
      {label}
    </span>
  );
}

const ERROR_TEXT: Record<string, string> = {
  slug: "此 Slug 已被使用,請換一個。",
  invalid: "欄位格式不正確,請檢查後重新送出。",
  transition: "狀態不可變更(可能已被兌換或作廢)。",
  notfound: "找不到資料。",
};

/** 由 ?error= querystring 顯示的錯誤橫幅 */
export function ErrorBanner({ code }: { code?: string }) {
  if (!code) return null;
  return (
    <div className="mt-6 rounded-sm border border-danger/40 bg-blush px-5 py-3 text-sm text-danger">
      {ERROR_TEXT[code] ?? code}
    </div>
  );
}

/** 返回連結 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-xs text-inkdim underline underline-offset-4 transition hover:text-gold"
    >
      ← {label}
    </Link>
  );
}
