import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABEL, formatTwd, type OrderStatus } from "@/lib/types";

export const metadata = { title: "我的訂單" };

const KIND_LABEL: Record<string, string> = {
  PURCHASE: "課程購買",
  GIFT: "禮物",
  SUBSCRIPTION_INIT: "訂閱",
};

export default async function MyOrdersPage() {
  const user = await requireUser("/my/orders");
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">Orders</p>
      <h1 className="mt-3 font-serif-tc text-3xl font-semibold">我的訂單</h1>

      {orders.length === 0 ? (
        <p className="mt-10 text-sm text-inkdim">目前沒有訂單紀錄。</p>
      ) : (
        <div className="card mt-10 divide-y divide-hairline">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-4 p-6 text-sm">
              <div>
                <p className="font-medium">
                  {o.items.map((i) => i.titleSnapshot).join("、")}
                </p>
                <p className="num mt-1 text-xs text-inkdim">
                  {o.orderNo}·{KIND_LABEL[o.kind] ?? o.kind}·
                  {o.createdAt.toLocaleDateString("zh-Hant-TW")}
                </p>
              </div>
              <div className="text-right">
                <div className="num">{formatTwd(o.amountTwd)}</div>
                <div
                  className={`mt-1 text-xs ${
                    o.status === "PAID"
                      ? "text-success"
                      : o.status === "PENDING"
                        ? "text-gold"
                        : "text-danger"
                  }`}
                >
                  {ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
