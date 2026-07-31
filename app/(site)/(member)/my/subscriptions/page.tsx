import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_STATUS_LABEL, formatTwd, type SubscriptionStatus } from "@/lib/types";
import { cancelMySubscription } from "./actions";

export const metadata = { title: "我的訂閱" };

export default async function MySubscriptionsPage() {
  const user = await requireUser("/my/subscriptions");
  const subs = await prisma.subscription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { series: true, payments: { orderBy: { paidAt: "desc" }, take: 3 } },
  });

  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">Subscriptions</p>
      <h1 className="mt-3 font-serif-tc text-3xl font-semibold">我的訂閱</h1>

      {subs.length === 0 ? (
        <p className="mt-10 text-sm text-inkdim">目前沒有訂閱紀錄。</p>
      ) : (
        <div className="mt-10 space-y-5">
          {subs.map((s) => {
            const active = ["ACTIVE", "PAST_DUE"].includes(s.status);
            const stillWatchable =
              s.currentPeriodEnd && s.currentPeriodEnd > new Date();
            return (
              <div key={s.id} className="card p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif-tc text-lg font-semibold">
                      {s.series.title}
                    </h2>
                    <p className="num mt-1 text-xs text-inkdim">
                      {s.series.monthlyPriceTwd
                        ? `${formatTwd(s.series.monthlyPriceTwd)}/月·`
                        : ""}
                      {s.currentPeriodEnd
                        ? `本期至 ${s.currentPeriodEnd.toLocaleDateString("zh-Hant-TW")}`
                        : ""}
                    </p>
                    {s.status === "CANCELED" && stillWatchable && (
                      <p className="mt-2 text-xs text-gold">
                        已取消,仍可觀看至本期結束。
                      </p>
                    )}
                  </div>
                  <span className="whitespace-nowrap rounded-full border border-goldline px-4 py-1.5 text-xs text-gold">
                    {SUBSCRIPTION_STATUS_LABEL[s.status as SubscriptionStatus] ?? s.status}
                  </span>
                </div>

                {active && (
                  <form
                    action={async () => {
                      "use server";
                      await cancelMySubscription(s.id);
                    }}
                    className="mt-5"
                  >
                    <button className="text-xs text-inkdim underline underline-offset-4 transition hover:text-danger">
                      取消訂閱(觀看權保留至本期結束)
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
