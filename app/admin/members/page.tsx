import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { AdminHeading, AdminTable, EmptyRow } from "@/components/admin/ui";
import { fmtDateTime } from "../_lib/utils";

export const metadata = { title: "會員管理|管理後台" };
export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  await requireAdmin();
  const members = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { entitlements: true, subscriptions: true } },
    },
    take: 500,
  });

  return (
    <div>
      <AdminHeading eyebrow="Members" title="會員管理" />

      <AdminTable head={["姓名", "Email", "註冊時間", "課程授權", "訂閱", ""]}>
        {members.length === 0 ? (
          <EmptyRow colSpan={6} />
        ) : (
          members.map((m) => (
            <tr key={m.id} className="hover:bg-mist/40">
              <td className="px-5 py-3.5 font-medium">{m.name ?? "—"}</td>
              <td className="px-5 py-3.5">{m.email ?? "—"}</td>
              <td className="num whitespace-nowrap px-5 py-3.5 text-xs text-inkdim">
                {fmtDateTime(m.createdAt)}
              </td>
              <td className="num px-5 py-3.5">{m._count.entitlements}</td>
              <td className="num px-5 py-3.5">{m._count.subscriptions}</td>
              <td className="px-5 py-3.5 text-right">
                <Link
                  href={`/admin/members/${m.id}`}
                  className="text-xs text-inkdim underline underline-offset-4 transition hover:text-gold"
                >
                  詳情
                </Link>
              </td>
            </tr>
          ))
        )}
      </AdminTable>
    </div>
  );
}
