import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import {
  SUBSCRIPTION_STATUS_LABEL,
  formatTwd,
  type SubscriptionStatus,
} from "@/lib/types";
import {
  AdminHeading,
  AdminTable,
  EmptyRow,
  ErrorBanner,
  StatusPill,
} from "@/components/admin/ui";
import { SimulatePeriodButtons } from "@/components/admin/simulate-period-buttons";
import { fmtDate } from "../_lib/utils";
import { adminCancelSubscription } from "./actions";

export const metadata = { title: "訂閱管理|管理後台" };
export const dynamic = "force-dynamic";

function subTone(status: string): "gold" | "success" | "danger" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "PAST_DUE") return "danger";
  if (status === "PENDING") return "gold";
  return "neutral";
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireAdmin();
  const isMockProvider = process.env.PAYMENT_PROVIDER === "mock";

  const subs = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      series: true,
      _count: { select: { payments: true } },
    },
    take: 200,
  });

  return (
    <div>
      <AdminHeading eyebrow="Subscriptions" title="訂閱管理" />
      <ErrorBanner code={searchParams.error} />

      <AdminTable
        head={["會員", "系列", "狀態", "本期至", "扣款次數", "操作"]}
      >
        {subs.length === 0 ? (
          <EmptyRow colSpan={6} />
        ) : (
          subs.map((s) => {
            const cancellable = ["PENDING", "ACTIVE", "PAST_DUE"].includes(s.status);
            return (
              <tr key={s.id} className="hover:bg-mist/40">
                <td className="px-5 py-3.5">
                  <Link
                    href={`/admin/members/${s.userId}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {s.user.name ?? s.user.email ?? "—"}
                  </Link>
                  {s.user.email && (
                    <p className="mt-0.5 text-xs text-inkdim">{s.user.email}</p>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <p>{s.series.title}</p>
                  {s.series.monthlyPriceTwd != null && (
                    <p className="num mt-0.5 text-xs text-inkdim">
                      {formatTwd(s.series.monthlyPriceTwd)}/月
                    </p>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <StatusPill
                    label={
                      SUBSCRIPTION_STATUS_LABEL[s.status as SubscriptionStatus] ??
                      s.status
                    }
                    tone={subTone(s.status)}
                  />
                </td>
                <td className="num whitespace-nowrap px-5 py-3.5 text-xs text-inkdim">
                  {fmtDate(s.currentPeriodEnd)}
                </td>
                <td className="num px-5 py-3.5">{s._count.payments}</td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-col items-start gap-2.5">
                    {cancellable && (
                      <form action={adminCancelSubscription}>
                        <input type="hidden" name="subscriptionId" value={s.id} />
                        <button className="text-xs text-inkdim underline underline-offset-4 transition hover:text-danger">
                          取消訂閱
                        </button>
                      </form>
                    )}
                    {isMockProvider &&
                      ["ACTIVE", "PAST_DUE"].includes(s.status) && (
                        <SimulatePeriodButtons subscriptionId={s.id} />
                      )}
                    {!cancellable && !isMockProvider && (
                      <span className="text-xs text-inkdim">—</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </AdminTable>
    </div>
  );
}
