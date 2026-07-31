import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { brand } from "@/lib/brand";
import CourseCard from "@/components/catalog/CourseCard";
import { SERIES_CATEGORY_LABEL, formatTwd, type SeriesCategory } from "@/lib/types";

export default async function HomePage() {
  const series = await prisma.series.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
    include: {
      courses: {
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        include: { lessons: { select: { id: true } } },
      },
    },
  });
  const featured = series.flatMap((s) =>
    s.courses.slice(0, 2).map((c) => ({ ...c, seriesTitle: s.title }))
  );

  return (
    <div>
      {/* Hero:桌面橫幅/行動直式封面,霓虹外框呼應招牌 */}
      <section className="mx-auto max-w-6xl px-5 pt-8">
        <div className="neon-frame animate-rise overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.bannerImage}
            alt={`${brand.fullName} 主視覺`}
            className="hidden w-full sm:block"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.coverImage}
            alt={`${brand.fullName} 主視覺`}
            className="w-full sm:hidden"
          />
        </div>

        <div className="mx-auto mt-14 max-w-2xl text-center">
          <p className="eyebrow animate-rise">✦ Online Healing Studio ✦</p>
          <h1 className="mt-4 animate-rise font-display text-4xl leading-snug text-ink sm:text-5xl sm:leading-snug">
            把煩惱留在門外,
            <br className="sm:hidden" />
            把好運帶回家
          </h1>
          <p className="mx-auto mt-5 max-w-xl animate-rise text-[15px] leading-8 text-inkdim">
            歡迎光臨{brand.name}。這裡有為你準備的舒壓與補運影音課程,
            像走進一間溫暖的小店,挑一份適合今天心情的療癒。
          </p>
          <div className="mt-9 flex animate-rise items-center justify-center gap-4">
            <Link href="/series" className="btn-primary">
              進來逛逛
            </Link>
            <Link href="/gift/redeem" className="btn-secondary">
              我收到禮物
            </Link>
          </div>
        </div>
      </section>

      {/* 系列 */}
      <section className="mx-auto max-w-6xl px-5 pt-24">
        <div className="text-center">
          <p className="eyebrow">Collections</p>
          <h2 className="mt-3 font-display text-3xl text-ink">兩座療癒小房間</h2>
        </div>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {series.map((s) => (
            <Link
              key={s.id}
              href={`/series/${s.slug}`}
              className="card card-hover group block overflow-hidden"
            >
              <div className="relative aspect-[21/9] overflow-hidden bg-blush">
                {s.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.coverUrl}
                    alt={s.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                  />
                )}
                <span className="tag-orange absolute left-4 top-4 shadow-soft">
                  {SERIES_CATEGORY_LABEL[s.category as SeriesCategory] ?? s.category}
                </span>
              </div>
              <div className="p-7">
                <h3 className="font-display text-2xl text-ink transition group-hover:text-plum">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-sm leading-7 text-inkdim">{s.description}</p>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-inkdim">{s.courses.length} 堂課程</span>
                  {s.monthlyPriceTwd && (
                    <span className="tag-lavender num">
                      月訂閱 {formatTwd(s.monthlyPriceTwd)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 精選課程 */}
      <section className="mx-auto max-w-6xl px-5 pt-24">
        <div className="text-center">
          <p className="eyebrow">Featured</p>
          <h2 className="mt-3 font-display text-3xl text-ink">今日推薦</h2>
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((c) => (
            <CourseCard
              key={c.id}
              slug={c.slug}
              title={c.title}
              description={c.description}
              coverUrl={c.coverUrl}
              priceTwd={c.priceTwd}
              lessonCount={c.lessons.length}
              seriesTitle={c.seriesTitle}
            />
          ))}
        </div>
      </section>

      {/* 三步驟 */}
      <section className="mx-auto max-w-6xl px-5 pt-24">
        <div className="card p-10 sm:p-14">
          <div className="text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 font-display text-3xl text-ink">三步開始你的療癒時光</h2>
          </div>
          <div className="mt-12 grid gap-10 text-center sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "登入",
                d: "用 LINE 或 Google 帳號一鍵進門,不用記密碼。",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0" />
                  </svg>
                ),
              },
              {
                n: "2",
                t: "選課",
                d: "單堂買了永久看,或訂閱整個系列看到飽。",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.5l1.6 12.3a1.5 1.5 0 001.5 1.2h10.8a1.5 1.5 0 001.47-1.18L21 7.5H5.1M9 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                ),
              },
              {
                n: "3",
                t: "觀看",
                d: "隨時播放,也可以買一份送給重要的人。",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.65c0-1.16 1.26-1.88 2.26-1.3l11.05 6.35a1.5 1.5 0 010 2.6L7.51 19.65c-1 .58-2.26-.14-2.26-1.3V5.65z" />
                  </svg>
                ),
              },
            ].map((step) => (
              <div key={step.n}>
                <div className="clay-dot mx-auto h-16 w-16 text-plum">{step.icon}</div>
                <h3 className="mt-4 font-display text-xl text-ink">
                  {step.n}. {step.t}
                </h3>
                <p className="mx-auto mt-2 max-w-[220px] text-sm leading-6 text-inkdim">
                  {step.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
