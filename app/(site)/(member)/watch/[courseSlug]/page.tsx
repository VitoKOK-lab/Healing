import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/dal";
import { getCourseAccess } from "@/lib/entitlements/queries";
import VideoPlayer from "@/components/player/VideoPlayer";

// 觀看頁:左側播放器、右側單元列表。
// 無權限者只能看免費試看單元;播放授權仍由播放 API 逐次把關。

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: { courseSlug: string };
  searchParams: { lesson?: string };
}) {
  const user = await requireUser(`/watch/${params.courseSlug}`);
  const course = await prisma.course.findUnique({
    where: { slug: params.courseSlug },
    include: {
      series: true,
      lessons: {
        orderBy: { sortOrder: "asc" },
        include: { videoAsset: { select: { status: true, durationSec: true } } },
      },
    },
  });
  if (!course || !course.published || course.lessons.length === 0) notFound();

  const access = await getCourseAccess(user.id, course.id);

  const playable = (l: (typeof course.lessons)[number]) =>
    access.hasAccess || l.isFreePreview;

  const current =
    course.lessons.find((l) => l.id === searchParams.lesson && playable(l)) ??
    course.lessons.find(playable);

  if (!current) {
    // 沒有任何可播單元:導去課程頁購買
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-serif-tc text-2xl font-semibold">尚未擁有此課程</h1>
        <p className="mt-3 text-sm text-inkdim">購買或訂閱後即可觀看全部單元。</p>
        <Link href={`/courses/${course.slug}`} className="btn-primary mt-8">
          前往課程頁
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <p className="eyebrow">{course.series.title}</p>
      <h1 className="mt-2 font-serif-tc text-2xl font-semibold">{course.title}</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <VideoPlayer key={current.id} lessonId={current.id} />
          <h2 className="mt-5 font-serif-tc text-lg font-semibold">{current.title}</h2>
          {current.description && (
            <p className="mt-2 text-sm leading-7 text-inkdim">{current.description}</p>
          )}
          <p className="mt-6 text-xs leading-5 text-inkdim">
            ※ 本影片僅供您的帳號觀看,畫面含帳號識別浮水印;側錄、翻攝或散布將依法追究。
          </p>
        </div>

        <aside>
          <h3 className="eyebrow">Lessons</h3>
          <ol className="mt-4 space-y-2">
            {course.lessons.map((l, i) => {
              const isCurrent = l.id === current.id;
              const canPlay = playable(l) && l.videoAsset?.status === "READY";
              return (
                <li key={l.id}>
                  {canPlay ? (
                    <Link
                      href={`/watch/${course.slug}?lesson=${l.id}`}
                      className={`card flex items-center gap-3 px-4 py-3 text-sm transition hover:border-gold ${
                        isCurrent ? "border-gold text-gold" : ""
                      }`}
                    >
                      <span className="num w-6 text-inkdim">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1">{l.title}</span>
                      {l.isFreePreview && !access.hasAccess && (
                        <span className="text-[10px] text-gold">試看</span>
                      )}
                    </Link>
                  ) : (
                    <div className="card flex items-center gap-3 px-4 py-3 text-sm opacity-50">
                      <span className="num w-6 text-inkdim">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1">{l.title}</span>
                      <span className="text-[10px] text-inkdim">
                        {l.videoAsset?.status !== "READY" ? "準備中" : "未解鎖"}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {!access.hasAccess && (
            <Link href={`/courses/${course.slug}`} className="btn-primary mt-6 w-full">
              解鎖完整課程
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
