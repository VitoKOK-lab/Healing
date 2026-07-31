import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/dal";
import { subscriptionGrantsAccess } from "@/lib/entitlements/access";
import CourseCard from "@/components/catalog/CourseCard";
import { SERIES_CATEGORY_LABEL, formatTwd, type SeriesCategory } from "@/lib/types";

export default async function SeriesDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const series = await prisma.series.findUnique({
    where: { slug: params.slug },
    include: {
      courses: {
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        include: { lessons: { select: { id: true } } },
      },
    },
  });
  if (!series || !series.published) notFound();

  const user = await getSessionUser();
  let subscribed = false;
  if (user) {
    const sub = await prisma.subscription.findFirst({
      where: { userId: user.id, seriesId: series.id },
      orderBy: { currentPeriodEnd: "desc" },
      select: { status: true, currentPeriodEnd: true },
    });
    subscribed = subscriptionGrantsAccess(sub, new Date());
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      {/* 系列封面横幅 */}
      <div className="neon-frame overflow-hidden">
        <div className="relative aspect-[21/9] bg-blush">
          {series.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={series.coverUrl}
              alt={series.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <span className="tag-orange">
          {SERIES_CATEGORY_LABEL[series.category as SeriesCategory] ?? series.category}
        </span>
        <h1 className="mt-3 font-display text-4xl text-ink">{series.title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-inkdim">
          {series.description}
        </p>
      </div>

      {series.monthlyPriceTwd && (
        <div className="card mt-10 flex flex-col items-center justify-between gap-5 p-8 sm:flex-row">
          <div className="text-center sm:text-left">
            <h2 className="font-display text-xl text-ink">整個系列看到飽</h2>
            <p className="mt-1 text-sm text-inkdim">
              訂閱期間本系列所有課程(含日後新增)無限觀看,隨時可取消。
            </p>
          </div>
          {subscribed ? (
            <span className="tag-lavender !px-6 !py-2.5 !text-sm">訂閱中 ✦</span>
          ) : (
            <Link
              href={`/checkout/subscribe/${series.slug}`}
              className="btn-primary whitespace-nowrap"
            >
              <span className="num">{formatTwd(series.monthlyPriceTwd)}</span>
              <span className="ml-1">/月 訂閱</span>
            </Link>
          )}
        </div>
      )}

      <div className="mt-14 grid gap-8 sm:grid-cols-2">
        {series.courses.map((c) => (
          <CourseCard
            key={c.id}
            slug={c.slug}
            title={c.title}
            description={c.description}
            coverUrl={c.coverUrl}
            priceTwd={c.priceTwd}
            lessonCount={c.lessons.length}
          />
        ))}
      </div>
    </div>
  );
}
