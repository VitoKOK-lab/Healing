import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { AdminHeading, BackLink, ErrorBanner } from "@/components/admin/ui";
import { CourseForm } from "@/components/admin/course-form";
import { createCourse } from "../actions";

export const metadata = { title: "新增課程|管理後台" };

export default async function AdminCourseNewPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireAdmin();
  const seriesOptions = await prisma.series.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true },
  });

  return (
    <div>
      <BackLink href="/admin/courses" label="回課程列表" />
      <div className="mt-4">
        <AdminHeading eyebrow="Courses" title="新增課程" />
      </div>
      <ErrorBanner code={searchParams.error} />
      {seriesOptions.length === 0 ? (
        <p className="mt-8 text-sm text-inkdim">
          請先建立至少一個系列,才能新增課程。
        </p>
      ) : (
        <CourseForm action={createCourse} seriesOptions={seriesOptions} />
      )}
    </div>
  );
}
