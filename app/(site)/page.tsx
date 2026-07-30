import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { brand } from "@/lib/brand";
import { SERIES_CATEGORY_LABEL, formatTwd, type SeriesCategory } from "@/lib/types";

export default async function HomePage() {
  const series = await prisma.series.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
    include: {
      courses: {
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        take: 2,
      },
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-24 text-center">
        <p className="eyebrow animate-rise">Online Healing Studio</p>
        <h1 className="mt-6 animate-rise font-serif-tc text-4xl font-semibold leading-relaxed sm:text-5xl">
          {brand.tagline}
        </h1>
        <p className="mx-auto mt-6 max-w-xl animate-rise text-sm leading-7 text-inkdim">
          {brand.description}
        </p>
        <div className="mt-10 flex animate-rise items-center justify-center gap-4">
          <Link href="/series" className="btn-primary">
            探索課程
          </Link>
          <Link href="/gift/redeem" className="btn-secondary">
            我收到禮物
          </Link>
        </div>
      </section>

      <hr className="rule-gold mx-auto w-2/3" />

      {/* 系列 */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="eyebrow text-center">Collections</p>
        <h2 className="mt-3 text-center font-serif-tc text-3xl font-semibold">
          課程系列
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {series.map((s) => (
            <Link
              key={s.id}
              href={`/series/${s.slug}`}
              className="card group p-10 transition hover:shadow-card"
            >
              <p className="eyebrow">
                {SERIES_CATEGORY_LABEL[s.category as SeriesCategory] ?? s.category}
              </p>
              <h3 className="mt-3 font-serif-tc text-2xl font-semibold group-hover:text-gold">
                {s.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-inkdim">{s.description}</p>
              <div className="mt-6 flex items-center justify-between text-sm">
                <span className="text-inkdim">
                  {s.courses.length > 0 ? `${s.courses.map((c) => c.title).join("、")} ⋯` : ""}
                </span>
              </div>
              {s.monthlyPriceTwd && (
                <p className="num mt-4 text-sm text-gold">
                  月訂閱 {formatTwd(s.monthlyPriceTwd)} 起
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* 三步驟 */}
      <section className="border-t border-hairline bg-paper py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="eyebrow text-center">How it works</p>
          <h2 className="mt-3 text-center font-serif-tc text-3xl font-semibold">
            三步開始你的療癒時光
          </h2>
          <div className="mt-12 grid gap-10 text-center sm:grid-cols-3">
            {[
              ["01", "登入", "使用 LINE 或 Google 帳號,一鍵登入。"],
              ["02", "選課", "單堂購買永久觀看,或訂閱整個系列看到飽。"],
              ["03", "觀看", "隨時隨地播放。也可以買一份課程,送給重要的人。"],
            ].map(([n, t, d]) => (
              <div key={n}>
                <div className="num text-3xl text-goldsoft">{n}</div>
                <h3 className="mt-3 font-serif-tc text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-6 text-inkdim">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
