import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SERIES_CATEGORY_LABEL, formatTwd, type SeriesCategory } from "@/lib/types";

export const metadata = { title: "課程系列" };

export default async function SeriesListPage() {
  const series = await prisma.series.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
    include: { courses: { where: { published: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <p className="eyebrow">Collections</p>
      <h1 className="mt-3 font-serif-tc text-3xl font-semibold">課程系列</h1>
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {series.map((s) => (
          <Link key={s.id} href={`/series/${s.slug}`} className="card group p-10 transition hover:shadow-card">
            <p className="eyebrow">
              {SERIES_CATEGORY_LABEL[s.category as SeriesCategory] ?? s.category}
            </p>
            <h2 className="mt-3 font-serif-tc text-2xl font-semibold group-hover:text-gold">
              {s.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-inkdim">{s.description}</p>
            <div className="num mt-6 flex items-center gap-4 text-sm text-inkdim">
              <span>{s.courses.length} 堂課程</span>
              {s.monthlyPriceTwd && (
                <span className="text-gold">月訂閱 {formatTwd(s.monthlyPriceTwd)}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
