import Link from "next/link";
import { formatTwd } from "@/lib/types";

interface Props {
  slug: string;
  title: string;
  description: string;
  coverUrl?: string | null;
  priceTwd: number;
  lessonCount?: number;
  seriesTitle?: string;
  badge?: string;
}

export default function CourseCard({
  slug,
  title,
  description,
  coverUrl,
  priceTwd,
  lessonCount,
  seriesTitle,
  badge,
}: Props) {
  return (
    <Link href={`/courses/${slug}`} className="card card-hover group block overflow-hidden">
      <div className="relative aspect-[16/9] overflow-hidden bg-blush">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blush to-mist font-display text-3xl text-lavender">
            ✦
          </div>
        )}
        {badge && (
          <span className="tag-orange absolute left-4 top-4 shadow-soft">{badge}</span>
        )}
      </div>
      <div className="p-6">
        {seriesTitle && <p className="eyebrow">{seriesTitle}</p>}
        <h3 className="mt-1.5 font-display text-lg text-ink transition group-hover:text-plum">
          {title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-inkdim">{description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="num font-display text-lg text-gold">{formatTwd(priceTwd)}</span>
          {lessonCount !== undefined && (
            <span className="text-xs text-inkdim">{lessonCount} 個單元</span>
          )}
        </div>
      </div>
    </Link>
  );
}
