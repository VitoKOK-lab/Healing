import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABEL, formatTwd, type OrderStatus } from "@/lib/types";
import { AdminHeading, AdminTable, EmptyRow, StatusPill } from "@/components/admin/ui";
import { ORDER_KIND_LABEL } from "@/components/admin/labels";
import DemoSeedButton from "@/components/admin/DemoSeedButton";
import { fmtDateTime } from "./_lib/utils";

export const metadata = { title: "總覽|管理後台" };
export const dynamic = "force-dynamic";

function orderTone(status: string): "gold" | "success" | "danger" | "neutral" {
  if (status === "PAID") return "success";
  if (status === "PENDING") return "gold";
  if (status === "FAILED" || status === "EXPIRED") return "danger";
  return "neutral";
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [memberCount, paidOrderCount, revenue, activeSubCount, publishedCourseCount, latestOrders] =
    await Promise.all([
      prisma.user.count(),
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.order.aggregate({
        where: { status: "PAID" },
        _sum: { amountTwd: true },
      }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.course.count({ where: { published: true } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: true, items: true },
      }),
    ]);

  const stats: { label: string; value: string; sub?: string }[] = [
    { label: "會員數", value: memberCount.toLocaleString("zh-Hant-TW") },
    {
      label: "已付款訂單",
      value: paidOrderCount.toLocaleString("zh-Hant-TW"),
      sub: `營收 ${formatTwd(revenue._sum.amountTwd ?? 0)}`,
    },
    { label: "訂閱中", value: activeSubCount.toLocaleString("zh-Hant-TW") },
    { label: "已上架課程", value: publishedCourseCount.toLocaleString("zh-Hant-TW") },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <AdminHeading eyebrow="Dashboard" title="總覽" />
        <DemoSeedButton />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-6">
            <p className="text-xs text-inkdim">{s.label}</p>
            <p className="num mt-2 text-2xl font-medium">{s.value}</p>
            {s.sub && <p className="num mt-1 text-xs text-gold">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="mt-12 flex items-center justify-between">
        <h2 className="font-serif-tc text-lg font-semibold">最新訂單</h2>
        <Link
          href="/admin/orders"
          className="text-xs text-inkdim underline underline-offset-4 transition hover:text-gold"
        >
          查看全部
        </Link>
      </div>
      <AdminTable head={["訂單編號", "會員", "類型", "內容", "金額", "狀態", "建立時間"]}>
        {latestOrders.length === 0 ? (
          <EmptyRow colSpan={7} />
        ) : (
          latestOrders.map((o) => (
            <tr key={o.id} className="hover:bg-mist/40">
              <td className="num px-5 py-3.5">
                <Link href={`/admin/orders/${o.id}`} className="underline-offset-4 hover:underline">
                  {o.orderNo}
                </Link>
              </td>
              <td className="px-5 py-3.5">{o.user.name ?? o.user.email ?? "—"}</td>
              <td className="px-5 py-3.5">{ORDER_KIND_LABEL[o.kind] ?? o.kind}</td>
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
            </tr>
          ))
        )}
      </AdminTable>
    </div>
  );
}
