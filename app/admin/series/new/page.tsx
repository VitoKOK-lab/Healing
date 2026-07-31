import { requireAdmin } from "@/lib/auth/dal";
import { AdminHeading, BackLink, ErrorBanner } from "@/components/admin/ui";
import { SeriesForm } from "@/components/admin/series-form";
import { createSeries } from "../actions";

export const metadata = { title: "新增系列|管理後台" };

export default async function AdminSeriesNewPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireAdmin();

  return (
    <div>
      <BackLink href="/admin/series" label="回系列列表" />
      <div className="mt-4">
        <AdminHeading eyebrow="Series" title="新增系列" />
      </div>
      <ErrorBanner code={searchParams.error} />
      <SeriesForm action={createSeries} />
    </div>
  );
}
