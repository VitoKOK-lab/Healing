import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import {
  SUBSCRIPTION_STATUS_LABEL,
  formatTwd,
  type SubscriptionStatus,
} from "@/lib/types";
import { AdminHeading, BackLink, StatusPill } from "@/components/admin/ui";
import { ENTITLEMENT_KIND_LABEL } from "@/components/admin/labels";
import { fmtDate, fmtDateTime } from "../../_lib/utils";
import { forceLogoutMember } from "../actions";

export const metadata = { title: "會員詳情|管理後台" };

export default async function AdminMemberDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();
  const [member, activeSessionCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.id },
      include: {
        entitlements: {
          orderBy: { grantedAt: "desc" },
          include: { course: true },
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: { series: true },
        },
      },
    }),
    prisma.session.count({
      where: { userId: params.id, expires: { gt: new Date() } },
    }),
  ]);
  if (!member) notFound();

  return (
    <div>
      <BackLink href="/admin/members" label="回會員列表" />
      <div className="mt-4">
        <AdminHeading
          eyebrow="Members"
          title={member.name ?? member.email ?? "會員詳情"}
        />
      </div>

      <div className="card mt-8 flex flex-wrap items-center justify-between gap-4 p-7">
        <dl className="grid grid-cols-1 gap-x-10 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-inkdim">Email</dt>
            <dd className="mt-0.5">{member.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-inkdim">註冊時間</dt>
            <dd className="num mt-0.5">{fmtDateTime(member.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-inkdim">有效登入 Session</dt>
            <dd className="num mt-0.5">{activeSessionCount}</dd>
          </div>
        </dl>
        <form action={forceLogoutMember}>
          <input type="hidden" name="userId" value={member.id} />
          <button className="btn-secondary !px-5 !py-2 text-xs hover:!border-danger hover:!text-danger">
            強制登出
          </button>
        </form>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card p-7">
          <h2 className="font-serif-tc text-base font-semibold">
            課程授權
            <span className="num ml-2 text-sm font-normal text-inkdim">
              ({member.entitlements.length})
            </span>
          </h2>
          {member.entitlements.length === 0 ? (
            <p className="mt-4 text-sm text-inkdim">尚無課程授權。</p>
          ) : (
            <div className="mt-4 divide-y divide-hairline text-sm">
              {member.entitlements.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <Link
                      href={`/admin/courses/${e.courseId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {e.course.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-inkdim">
                      {ENTITLEMENT_KIND_LABEL[e.kind] ?? e.kind}·
                      {fmtDate(e.grantedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-7">
          <h2 className="font-serif-tc text-base font-semibold">
            訂閱
            <span className="num ml-2 text-sm font-normal text-inkdim">
              ({member.subscriptions.length})
            </span>
          </h2>
          {member.subscriptions.length === 0 ? (
            <p className="mt-4 text-sm text-inkdim">尚無訂閱紀錄。</p>
          ) : (
            <div className="mt-4 divide-y divide-hairline text-sm">
              {member.subscriptions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p>{s.series.title}</p>
                    <p className="num mt-0.5 text-xs text-inkdim">
                      {s.series.monthlyPriceTwd
                        ? `${formatTwd(s.series.monthlyPriceTwd)}/月·`
                        : ""}
                      {s.currentPeriodEnd
                        ? `本期至 ${fmtDate(s.currentPeriodEnd)}`
                        : "—"}
                    </p>
                  </div>
                  <StatusPill
                    label={
                      SUBSCRIPTION_STATUS_LABEL[s.status as SubscriptionStatus] ??
                      s.status
                    }
                    tone={
                      s.status === "ACTIVE"
                        ? "success"
                        : s.status === "PAST_DUE"
                          ? "danger"
                          : "neutral"
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
