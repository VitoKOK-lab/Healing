import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  formatTwd,
  type OrderStatus,
} from "@/lib/types";
import { AdminHeading, AdminTable, EmptyRow, StatusPill } from "@/components/admin/ui";
import { ORDER_KIND_LABEL } from "@/components/admin/labels";
import { fmtDateTime } from "../_lib/utils";

export const metadata = { title: "訂單管理|管理後台" };
export const dynamic = "force-dynamic";

function orderTone(status: string): "gold" | "success" | "danger" | "neutral" {
  if (status === "PAID") return "success";
  if (status === "PENDING") return "gold";
  if (status === "FAILED" || status === "EXPIRED") return "danger";
  return "neutral";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireAdmin();
  const statusParam = searchParams.status ?? "";
  const status = (ORDER_STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as OrderStatus)
    : undefined;

  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { user: true, items: true },
    take: 200,
  });

  return (
    <div>
      <AdminHeading eyebrow="Orders" title="訂單管理" />

      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href="/admin/orders"
          className={`rounded-full border px-4 py-1.5 text-xs transition ${
            !status
              ? "border-gold text-gold"
              : "border-hairline text-inkdim hover:border-gold hover:text-gold"
          }`}
        >
          全部
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`rounded-full border px-4 py-1.5 text-xs transition ${
              status === s
                ? "border-gold text-gold"
                : "border-hairline text-inkdim hover:border-gold hover:text-gold"
            }`}
          >
            {ORDER_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <AdminTable head={["訂單編號", "會員", "類型", "內容", "金額", "狀態", "建立時間", ""]}>
        {orders.length === 0 ? (
          <EmptyRow colSpan={8} />
        ) : (
          orders.map((o) => (
            <tr key={o.id} className="hover:bg-mist/40">
              <td className="num px-5 py-3.5">{o.orderNo}</td>
              <td className="px-5 py-3.5">
                <p>{o.user.name ?? "—"}</p>
                <p className="mt-0.5 text-xs text-inkdim">{o.user.email}</p>
              </td>
              <td className="whitespace-nowrap px-5 py-3.5">
                {ORDER_KIND_LABEL[o.kind] ?? o.kind}
              </td>
              <td className="max-w-56 truncate px-5 py-3.5">
                {o.items.map((i) => i.titleSnapshot).join("、") || "—"}
              </td>
              <td className="num px-5 py-3.5">{formatTwd(o.amountTwd)}</td>
              <td className="px-5 py-3.5">
                <StatusPill
                  label={ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                  tone={orderTone(o.status)}
                />
              </td>
              <td className="num whitespace-nowrap px-5 py-3.5 text-xs text-inkdim">
                {fmtDateTime(o.createdAt)}
              </td>
              <td className="px-5 py-3.5 text-right">
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="text-xs text-inkdim underline underline-offset-4 transition hover:text-gold"
                >
                  明細
                </Link>
              </td>
            </tr>
          ))
        )}
      </AdminTable>
    </div>
  );
}
