import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABEL, formatTwd, type OrderStatus } from "@/lib/types";
import { AdminHeading, BackLink, StatusPill } from "@/components/admin/ui";
import { ORDER_KIND_LABEL } from "@/components/admin/labels";
import { fmtDateTime } from "../../_lib/utils";

export const metadata = { title: "訂單明細|管理後台" };

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { user: true, items: true, giftCode: true, subscription: true },
  });
  if (!order) notFound();

  const tone =
    order.status === "PAID"
      ? ("success" as const)
      : order.status === "PENDING"
        ? ("gold" as const)
        : ("danger" as const);

  return (
    <div>
      <BackLink href="/admin/orders" label="回訂單列表" />
      <div className="mt-4">
        <AdminHeading
          eyebrow="Orders"
          title={`訂單 ${order.orderNo}`}
          action={
            <StatusPill
              label={ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status}
              tone={tone}
            />
          }
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card p-7">
          <h2 className="font-serif-tc text-base font-semibold">基本資訊</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-inkdim">會員</dt>
              <dd className="text-right">
                <Link
                  href={`/admin/members/${order.userId}`}
                  className="underline underline-offset-4 hover:text-gold"
                >
                  {order.user.name ?? order.user.email ?? order.userId}
                </Link>
                {order.user.email && (
                  <span className="block text-xs text-inkdim">{order.user.email}</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-inkdim">類型</dt>
              <dd>{ORDER_KIND_LABEL[order.kind] ?? order.kind}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-inkdim">金額</dt>
              <dd className="num">{formatTwd(order.amountTwd)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-inkdim">綠界交易編號</dt>
              <dd className="num">{order.gwTradeNo ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-inkdim">建立時間</dt>
              <dd className="num">{fmtDateTime(order.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-inkdim">付款時間</dt>
              <dd className="num">{fmtDateTime(order.paidAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-7">
          <h2 className="font-serif-tc text-base font-semibold">
            品項
            <span className="num ml-2 text-sm font-normal text-inkdim">
              ({order.items.length})
            </span>
          </h2>
          <div className="mt-4 divide-y divide-hairline text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 py-3">
                <div>
                  <p>{item.titleSnapshot}</p>
                  <p className="mt-0.5 text-xs text-inkdim">
                    {item.itemKind === "SUBSCRIPTION" ? "訂閱" : "課程"}
                  </p>
                </div>
                <p className="num">{formatTwd(item.unitPriceTwd)}</p>
              </div>
            ))}
            {order.items.length === 0 && (
              <p className="py-3 text-inkdim">沒有品項資料。</p>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-5 p-7">
        <h2 className="font-serif-tc text-base font-semibold">金流回傳 Payload</h2>
        {order.rawReturn ? (
          <pre className="num mt-4 overflow-x-auto rounded-sm bg-mist p-5 text-xs leading-relaxed text-ink">
            {prettyJson(order.rawReturn)}
          </pre>
        ) : (
          <p className="mt-4 text-sm text-inkdim">尚無金流回傳紀錄。</p>
        )}
      </div>
    </div>
  );
}
