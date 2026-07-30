import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/dal";
import { getCourseAccess } from "@/lib/entitlements/queries";
import { SERIES_CATEGORY_LABEL, formatTwd, type SeriesCategory } from "@/lib/types";

export default async function CourseDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    include: {
      series: true,
      lessons: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!course || !course.published) notFound();

  const user = await getSessionUser();
  const access = user
    ? await getCourseAccess(user.id, course.id)
    : { hasAccess: false, reason: "none" as const };

  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <Link href={`/series/${course.series.slug}`} className="eyebrow hover:text-ink">
        {SERIES_CATEGORY_LABEL[course.series.category as SeriesCategory]}·
        {course.series.title}
      </Link>
      <h1 className="mt-3 font-serif-tc text-3xl font-semibold">{course.title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-inkdim">{course.description}</p>

      <div className="card mt-8 flex flex-col items-start justify-between gap-5 p-8 sm:flex-row sm:items-center">
        {access.hasAccess ? (
          <>
            <p className="text-sm text-inkdim">
              {access.reason === "subscription"
                ? "您正在訂閱此系列,可觀看全部單元。"
                : "您已擁有此課程,可永久觀看。"}
            </p>
            <Link href={`/watch/${course.slug}`} className="btn-primary whitespace-nowrap">
              開始觀看
            </Link>
          </>
        ) : (
          <>
            <div>
              <div className="num text-2xl">{formatTwd(course.priceTwd)}</div>
              <p className="mt-1 text-xs text-inkdim">
                單堂購買,永久觀看·僅限購買帳號
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/checkout/${course.slug}`} className="btn-primary">
                立即購買
              </Link>
              <Link href={`/checkout/${course.slug}?gift=1`} className="btn-secondary">
                買來送禮
              </Link>
            </div>
          </>
        )}
      </div>

      <hr className="rule-gold my-12" />

      <h2 className="font-serif-tc text-xl font-semibold">課程單元</h2>
      <ol className="mt-6 space-y-3">
        {course.lessons.map((l, i) => (
          <li
            key={l.id}
            className="card flex items-center justify-between px-6 py-4 text-sm"
          >
            <div className="flex items-center gap-4">
              <span className="num w-6 text-inkdim">{String(i + 1).padStart(2, "0")}</span>
              <span>{l.title}</span>
            </div>
            {l.isFreePreview ? (
              <Link
                href={`/watch/${course.slug}?lesson=${l.id}`}
                className="text-gold transition hover:text-ink"
              >
                免費試看
              </Link>
            ) : (
              <span className="text-xs text-inkdim">{access.hasAccess ? "" : "購買後觀看"}</span>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-10 text-xs leading-6 text-inkdim">
        ※ 課程影片僅限購買帳號本人觀看,帳號同時間僅能於一台裝置登入;播放畫面帶有觀看者識別浮水印,禁止側錄、翻攝與轉載。
      </p>
    </div>
  );
}
