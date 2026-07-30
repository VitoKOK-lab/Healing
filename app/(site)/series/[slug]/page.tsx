import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/dal";
import { subscriptionGrantsAccess } from "@/lib/entitlements/access";
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
    <div className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">
        {SERIES_CATEGORY_LABEL[series.category as SeriesCategory] ?? series.category}
      </p>
      <h1 className="mt-3 font-serif-tc text-3xl font-semibold">{series.title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-inkdim">{series.description}</p>

      {series.monthlyPriceTwd && (
        <div className="card mt-8 flex flex-col items-start justify-between gap-4 p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif-tc text-lg font-semibold">系列訂閱</h2>
            <p className="mt-1 text-sm text-inkdim">
              訂閱期間,本系列所有課程(含日後新增)看到飽,可隨時取消。
            </p>
          </div>
          {subscribed ? (
            <span className="rounded-full border border-goldline px-5 py-2 text-sm text-gold">
              訂閱中
            </span>
          ) : (
            <Link href={`/checkout/subscribe/${series.slug}`} className="btn-primary whitespace-nowrap">
              <span className="num">{formatTwd(series.monthlyPriceTwd)}</span>
              <span className="ml-1">/月 訂閱</span>
            </Link>
          )}
        </div>
      )}

      <hr className="rule-gold my-12" />

      <div className="space-y-6">
        {series.courses.map((c) => (
          <Link
            key={c.id}
            href={`/courses/${c.slug}`}
            className="card group flex items-center justify-between gap-6 p-8 transition hover:shadow-card"
          >
            <div>
              <h3 className="font-serif-tc text-xl font-semibold group-hover:text-gold">
                {c.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-inkdim">
                {c.description}
              </p>
              <p className="num mt-3 text-xs text-inkdim">{c.lessons.length} 個單元</p>
            </div>
            <div className="num whitespace-nowrap text-lg text-ink">
              {formatTwd(c.priceTwd)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
