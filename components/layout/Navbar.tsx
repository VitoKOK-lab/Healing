import Link from "next/link";
import { brand } from "@/lib/brand";
import { getSessionUser } from "@/lib/auth/dal";

export default async function Navbar() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="wordmark text-lg text-ink">{brand.nameEn}</span>
          <span className="font-serif-tc text-sm text-inkdim">{brand.name}</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/series" className="hidden text-ink transition hover:text-gold sm:block">
            課程系列
          </Link>
          <Link href="/gift/redeem" className="hidden text-ink transition hover:text-gold sm:block">
            兌換禮物
          </Link>
          {user ? (
            <>
              <Link href="/my/courses" className="text-ink transition hover:text-gold">
                我的課程
              </Link>
              {user.isAdmin && (
                <Link href="/admin" className="text-gold transition hover:text-ink">
                  後台
                </Link>
              )}
              <Link
                href="/account"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-goldline text-xs text-inkdim transition hover:border-gold"
                title={user.name ?? user.email ?? "會員"}
              >
                {(user.name ?? user.email ?? "會")[0]}
              </Link>
            </>
          ) : (
            <Link href="/login" className="btn-secondary !px-5 !py-2">
              登入
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
