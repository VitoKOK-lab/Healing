import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { listAccessibleCourses } from "@/lib/entitlements/queries";

export const metadata = { title: "我的課程" };

const REASON_LABEL: Record<string, string> = {
  purchase: "已購買",
  gift: "受贈",
  subscription: "訂閱中",
};

export default async function MyCoursesPage() {
  const user = await requireUser("/my/courses");
  const items = await listAccessibleCourses(user.id);

  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">Library</p>
      <h1 className="mt-3 font-serif-tc text-3xl font-semibold">我的課程</h1>

      {items.length === 0 ? (
        <div className="card mt-10 p-12 text-center">
          <p className="text-sm text-inkdim">您還沒有可觀看的課程。</p>
          <Link href="/series" className="btn-primary mt-6">
            探索課程
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-5">
          {items.map(({ course, reason }) => (
            <Link
              key={course.id}
              href={`/watch/${course.slug}`}
              className="card group flex items-center justify-between gap-6 p-7 transition hover:shadow-card"
            >
              <div>
                <p className="eyebrow">{course.series.title}</p>
                <h2 className="mt-2 font-serif-tc text-xl font-semibold group-hover:text-gold">
                  {course.title}
                </h2>
              </div>
              <span className="whitespace-nowrap rounded-full border border-goldline px-4 py-1.5 text-xs text-gold">
                {REASON_LABEL[reason] ?? reason}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
