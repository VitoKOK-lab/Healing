import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import {
  GIFT_CODE_STATUS_LABEL,
  type GiftCodeStatus,
} from "@/lib/types";
import { formatGiftCode } from "@/lib/gifts/format";
import {
  AdminHeading,
  AdminTable,
  EmptyRow,
  ErrorBanner,
  StatusPill,
} from "@/components/admin/ui";
import { fmtDate } from "../_lib/utils";
import { voidGiftCode } from "./actions";

export const metadata = { title: "禮物碼管理|管理後台" };
export const dynamic = "force-dynamic";

function giftTone(status: string): "gold" | "success" | "danger" | "neutral" {
  if (status === "ACTIVE") return "gold";
  if (status === "REDEEMED") return "success";
  if (status === "VOID") return "danger";
  return "neutral";
}

export default async function AdminGiftsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireAdmin();
  const gifts = await prisma.giftCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      purchaser: true,
      redeemedBy: true,
      order: { include: { items: true } },
    },
    take: 200,
  });

  const courseTitles = new Map<string, string>();
  const courseIds = Array.from(new Set(gifts.map((g) => g.courseId)));
  if (courseIds.length > 0) {
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true },
    });
    for (const c of courses) courseTitles.set(c.id, c.title);
  }

  return (
    <div>
      <AdminHeading eyebrow="Gift Codes" title="禮物碼管理" />
      <ErrorBanner code={searchParams.error} />

      <AdminTable
        head={["禮物碼", "課程", "購買人", "狀態", "兌換人", "建立/兌換時間", ""]}
      >
        {gifts.length === 0 ? (
          <EmptyRow colSpan={7} />
        ) : (
          gifts.map((g) => (
            <tr key={g.id} className="hover:bg-mist/40">
              <td className="num whitespace-nowrap px-5 py-3.5 text-xs tracking-wider">
                {formatGiftCode(g.code)}
              </td>
              <td className="px-5 py-3.5">
                {courseTitles.get(g.courseId) ??
                  g.order.items[0]?.titleSnapshot ??
                  g.courseId}
              </td>
              <td className="px-5 py-3.5">
                {g.purchaser.name ?? g.purchaser.email ?? "—"}
              </td>
              <td className="px-5 py-3.5">
                <StatusPill
                  label={GIFT_CODE_STATUS_LABEL[g.status as GiftCodeStatus] ?? g.status}
                  tone={giftTone(g.status)}
                />
              </td>
              <td className="px-5 py-3.5">
                {g.redeemedBy ? (g.redeemedBy.name ?? g.redeemedBy.email) : "—"}
              </td>
              <td className="num whitespace-nowrap px-5 py-3.5 text-xs text-inkdim">
                {fmtDate(g.createdAt)}
                {g.redeemedAt ? `/${fmtDate(g.redeemedAt)}` : ""}
              </td>
              <td className="px-5 py-3.5 text-right">
                {g.status === "ACTIVE" && (
                  <form action={voidGiftCode}>
                    <input type="hidden" name="giftCodeId" value={g.id} />
                    <button className="text-xs text-inkdim underline underline-offset-4 transition hover:text-danger">
                      作廢
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))
        )}
      </AdminTable>
    </div>
  );
}
