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
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="text-center">
        <p className="eyebrow">✦ Collections ✦</p>
        <h1 className="mt-3 font-display text-4xl text-ink">課程系列</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-inkdim">
          每個系列都是一座小房間,推門進去,找到今天需要的那份安定。
        </p>
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-2">
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
              <h2 className="font-display text-2xl text-ink transition group-hover:text-plum">
                {s.title}
              </h2>
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
    </div>
  );
}
