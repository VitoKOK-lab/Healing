import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { formatTwd } from "@/lib/types";
import {
  AdminHeading,
  AdminTable,
  EmptyRow,
  ErrorBanner,
  StatusPill,
} from "@/components/admin/ui";

export const metadata = { title: "課程管理|管理後台" };
export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: { seriesId?: string; error?: string };
}) {
  await requireAdmin();
  const seriesId = searchParams.seriesId || undefined;

  const [seriesOptions, courses] = await Promise.all([
    prisma.series.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true },
    }),
    prisma.course.findMany({
      where: seriesId ? { seriesId } : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { series: true, _count: { select: { lessons: true } } },
    }),
  ]);

  return (
    <div>
      <AdminHeading
        eyebrow="Courses"
        title="課程管理"
        action={
          <Link href="/admin/courses/new" className="btn-primary">
            新增課程
          </Link>
        }
      />
      <ErrorBanner code={searchParams.error} />

      <form method="get" className="mt-8 flex items-center gap-3">
        <label className="text-xs text-inkdim" htmlFor="seriesId">
          系列篩選
        </label>
        <select
          id="seriesId"
          name="seriesId"
          defaultValue={seriesId ?? ""}
          className="input max-w-56"
        >
          <option value="">全部系列</option>
          {seriesOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary !px-5 !py-2 text-xs">
          套用
        </button>
      </form>

      <AdminTable head={["標題", "系列", "價格", "上架", "單元數", "排序", ""]}>
        {courses.length === 0 ? (
          <EmptyRow colSpan={7} />
        ) : (
          courses.map((c) => (
            <tr key={c.id} className="hover:bg-mist/40">
              <td className="px-5 py-3.5">
                <p className="font-medium">{c.title}</p>
                <p className="num mt-0.5 text-xs text-inkdim">{c.slug}</p>
              </td>
              <td className="px-5 py-3.5">{c.series.title}</td>
              <td className="num px-5 py-3.5">{formatTwd(c.priceTwd)}</td>
              <td className="px-5 py-3.5">
                <StatusPill
                  label={c.published ? "已上架" : "草稿"}
                  tone={c.published ? "success" : "neutral"}
                />
              </td>
              <td className="num px-5 py-3.5">{c._count.lessons}</td>
              <td className="num px-5 py-3.5">{c.sortOrder}</td>
              <td className="px-5 py-3.5 text-right">
                <Link
                  href={`/admin/courses/${c.id}`}
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
