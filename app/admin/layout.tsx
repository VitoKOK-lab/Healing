import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { brand } from "@/lib/brand";

export const metadata = { title: "管理後台" };

const NAV = [
  { href: "/admin", label: "總覽" },
  { href: "/admin/series", label: "系列" },
  { href: "/admin/courses", label: "課程" },
  { href: "/admin/orders", label: "訂單" },
  { href: "/admin/members", label: "會員" },
  { href: "/admin/gifts", label: "禮物碼" },
  { href: "/admin/subscriptions", label: "訂閱" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-hairline bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <Link href="/admin" className="flex items-baseline gap-2.5">
            <span className="wordmark text-sm">{brand.nameEn}</span>
            <span className="text-xs text-gold">管理後台</span>
          </Link>
          <div className="flex items-center gap-4 text-xs text-inkdim">
            <span className="hidden sm:inline">{admin.email}</span>
            <Link
              href="/"
              className="underline underline-offset-4 transition hover:text-gold"
            >
              回前台
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5 pb-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm text-inkdim transition hover:bg-mist hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        {children}
      </main>
    </div>
  );
}
