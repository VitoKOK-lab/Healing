import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { AdminHeading, BackLink, ErrorBanner } from "@/components/admin/ui";
import { SeriesForm } from "@/components/admin/series-form";
import { updateSeries } from "../actions";

export const metadata = { title: "編輯系列|管理後台" };

export default async function AdminSeriesEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  await requireAdmin();
  const series = await prisma.series.findUnique({ where: { id: params.id } });
  if (!series) notFound();

  return (
    <div>
      <BackLink href="/admin/series" label="回系列列表" />
      <div className="mt-4">
        <AdminHeading eyebrow="Series" title={`編輯系列:${series.title}`} />
      </div>
      <ErrorBanner code={searchParams.error} />
      <SeriesForm action={updateSeries} series={series} />
    </div>
  );
}
