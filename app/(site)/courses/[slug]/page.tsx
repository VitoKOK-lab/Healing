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
    <div className="mx-auto max-w-5xl px-5 py-12">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        {/* 封面 */}
        <div className="neon-frame overflow-hidden">
          <div className="relative aspect-[16/10] bg-blush">
            {course.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.coverUrl}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        </div>

        {/* 資訊 + CTA */}
        <div>
          <Link
            href={`/series/${course.series.slug}`}
            className="tag-lavender transition hover:bg-lavender/25"
          >
            {SERIES_CATEGORY_LABEL[course.series.category as SeriesCategory]}·
            {course.series.title}
          </Link>
          <h1 className="mt-4 font-display text-3xl leading-snug text-ink sm:text-4xl">
            {course.title}
          </h1>
          <p className="mt-4 text-[15px] leading-8 text-inkdim">{course.description}</p>

          <div className="card mt-7 p-7">
            {access.hasAccess ? (
              <>
                <p className="text-sm text-inkdim">
                  {access.reason === "subscription"
                    ? "您正在訂閱此系列,可觀看全部單元。"
                    : "您已擁有此課程,可永久觀看。"}
                </p>
                <Link href={`/watch/${course.slug}`} className="btn-primary mt-5 w-full">
                  開始觀看
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="num font-display text-3xl text-gold">
                    {formatTwd(course.priceTwd)}
                  </span>
                  <span className="text-xs text-inkdim">單堂購買·永久觀看</span>
                </div>
                <div className="mt-5 grid gap-3">
                  <Link href={`/checkout/${course.slug}`} className="btn-primary w-full">
                    帶回家(立即購買)
                  </Link>
                  <Link
                    href={`/checkout/${course.slug}?gift=1`}
                    className="btn-secondary w-full"
                  >
                    包成禮物送人
                  </Link>
                </div>
              </>
            )}
            <p className="mt-4 text-center text-[11px] leading-5 text-inkdim">
              僅限購買帳號觀看·畫面含觀看者浮水印·禁止側錄轉載
            </p>
          </div>
        </div>
      </div>

      {/* 單元列表 */}
      <div className="mt-16">
        <h2 className="text-center font-display text-2xl text-ink">課程單元</h2>
        <ol className="mx-auto mt-8 max-w-3xl space-y-4">
          {course.lessons.map((l, i) => (
            <li key={l.id} className="card flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <span className="clay-dot num h-10 w-10 text-sm font-bold text-plum">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-ink">{l.title}</span>
              </div>
              {l.isFreePreview ? (
                <Link
                  href={`/watch/${course.slug}?lesson=${l.id}`}
                  className="tag-orange transition hover:brightness-95"
                >
                  免費試看
                </Link>
              ) : (
                <span className="text-xs text-inkdim">
                  {access.hasAccess ? "" : "購買後觀看"}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
