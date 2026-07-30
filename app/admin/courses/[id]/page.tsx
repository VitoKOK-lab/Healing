import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { AdminHeading, BackLink, ErrorBanner, StatusPill } from "@/components/admin/ui";
import { CourseForm } from "@/components/admin/course-form";
import { LessonVideoUploader } from "@/components/admin/lesson-video-uploader";
import { VIDEO_STATUS_LABEL } from "@/components/admin/labels";
import { createLesson, deleteLesson, updateCourse } from "../actions";

export const metadata = { title: "編輯課程|管理後台" };

function videoTone(status: string): "gold" | "success" | "danger" | "neutral" {
  if (status === "READY") return "success";
  if (status === "ERROR") return "danger";
  return "gold";
}

export default async function AdminCourseEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  await requireAdmin();
  const [course, seriesOptions] = await Promise.all([
    prisma.course.findUnique({
      where: { id: params.id },
      include: {
        lessons: {
          orderBy: { sortOrder: "asc" },
          include: { videoAsset: true },
        },
      },
    }),
    prisma.series.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true },
    }),
  ]);
  if (!course) notFound();

  const nextSortOrder =
    course.lessons.reduce((max, l) => Math.max(max, l.sortOrder), 0) + 1;

  return (
    <div>
      <BackLink href="/admin/courses" label="回課程列表" />
      <div className="mt-4">
        <AdminHeading eyebrow="Courses" title={`編輯課程:${course.title}`} />
      </div>
      <ErrorBanner code={searchParams.error} />

      <CourseForm action={updateCourse} course={course} seriesOptions={seriesOptions} />

      {/* ── 單元管理 ─────────────────────────────── */}
      <hr className="rule-gold mt-14" />
      <h2 className="mt-10 font-serif-tc text-lg font-semibold">
        單元管理
        <span className="num ml-2 text-sm font-normal text-inkdim">
          ({course.lessons.length})
        </span>
      </h2>

      {course.lessons.length === 0 ? (
        <p className="mt-6 text-sm text-inkdim">尚未建立任何單元。</p>
      ) : (
        <div className="card mt-6 divide-y divide-hairline">
          {course.lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div className="min-w-48">
                <p className="text-sm font-medium">
                  <span className="num mr-2 text-xs text-inkdim">
                    #{lesson.sortOrder}
                  </span>
                  {lesson.title}
                  {lesson.isFreePreview && (
                    <span className="ml-2 rounded-full border border-goldline px-2 py-0.5 text-[11px] text-gold">
                      免費試看
                    </span>
                  )}
                </p>
                {lesson.description && (
                  <p className="mt-1 max-w-md truncate text-xs text-inkdim">
                    {lesson.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {lesson.videoAsset ? (
                  <StatusPill
                    label={`影片:${
                      VIDEO_STATUS_LABEL[lesson.videoAsset.status] ??
                      lesson.videoAsset.status
                    }${
                      lesson.videoAsset.durationSec
                        ? `(${lesson.videoAsset.durationSec} 秒)`
                        : ""
                    }`}
                    tone={videoTone(lesson.videoAsset.status)}
                  />
                ) : (
                  <StatusPill label="尚無影片" tone="neutral" />
                )}
                <LessonVideoUploader
                  lessonId={lesson.id}
                  assetId={lesson.videoAssetId}
                />
                <form action={deleteLesson}>
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <button className="text-xs text-inkdim underline underline-offset-4 transition hover:text-danger">
                    刪除
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 新增單元 ─────────────────────────────── */}
      <form action={createLesson} className="card mt-8 max-w-2xl space-y-5 p-8">
        <h3 className="font-serif-tc text-base font-semibold">新增單元</h3>
        <input type="hidden" name="courseId" value={course.id} />
        <div>
          <label className="mb-1.5 block text-xs text-inkdim" htmlFor="lesson-title">
            標題
          </label>
          <input id="lesson-title" name="title" required className="input" />
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs text-inkdim"
            htmlFor="lesson-description"
          >
            描述(選填)
          </label>
          <textarea
            id="lesson-description"
            name="description"
            rows={2}
            className="input"
          />
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label
              className="mb-1.5 block text-xs text-inkdim"
              htmlFor="lesson-sortOrder"
            >
              排序
            </label>
            <input
              id="lesson-sortOrder"
              name="sortOrder"
              type="number"
              step={1}
              defaultValue={nextSortOrder}
              className="input num w-28"
            />
          </div>
          <label className="flex items-center gap-2.5 pb-2.5 text-sm">
            <input
              type="checkbox"
              name="isFreePreview"
              className="h-4 w-4 accent-[#b79a63]"
            />
            開放免費試看
          </label>
        </div>
        <div className="pt-1">
          <button type="submit" className="btn-primary">
            新增單元
          </button>
        </div>
      </form>
    </div>
  );
}
