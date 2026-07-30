import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import {
  SERIES_CATEGORY_LABEL,
  formatTwd,
  type SeriesCategory,
} from "@/lib/types";
import {
  AdminHeading,
  AdminTable,
  EmptyRow,
  ErrorBanner,
  StatusPill,
} from "@/components/admin/ui";

export const metadata = { title: "系列管理|管理後台" };
export const dynamic = "force-dynamic";

export default async function AdminSeriesPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireAdmin();
  const seriesList = await prisma.series.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { courses: true } } },
  });

  return (
    <div>
      <AdminHeading
        eyebrow="Series"
        title="系列管理"
        action={
          <Link href="/admin/series/new" className="btn-primary">
            新增系列
          </Link>
        }
      />
      <ErrorBanner code={searchParams.error} />

      <AdminTable head={["標題", "分類", "月費", "上架", "課程數", "排序", ""]}>
        {seriesList.length === 0 ? (
          <EmptyRow colSpan={7} />
        ) : (
          seriesList.map((s) => (
            <tr key={s.id} className="hover:bg-mist/40">
              <td className="px-5 py-3.5">
                <p className="font-medium">{s.title}</p>
                <p className="num mt-0.5 text-xs text-inkdim">{s.slug}</p>
              </td>
              <td className="px-5 py-3.5">
                {SERIES_CATEGORY_LABEL[s.category as SeriesCategory] ?? s.category}
              </td>
              <td className="num px-5 py-3.5">
                {s.monthlyPriceTwd ? `${formatTwd(s.monthlyPriceTwd)}/月` : "—"}
              </td>
              <td className="px-5 py-3.5">
                <StatusPill
                  label={s.published ? "已上架" : "草稿"}
                  tone={s.published ? "success" : "neutral"}
                />
              </td>
              <td className="num px-5 py-3.5">{s._count.courses}</td>
              <td className="num px-5 py-3.5">{s.sortOrder}</td>
              <td className="px-5 py-3.5 text-right">
                <Link
                  href={`/admin/series/${s.id}`}
                  className="text-xs text-inkdim underline underline-offset-4 transition hover:text-gold"
                >
                  編輯
                </Link>
              </td>
            </tr>
          ))
        )}
      </AdminTable>
    </div>
  );
}
