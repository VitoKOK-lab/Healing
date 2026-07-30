import Link from "next/link";
import { brand } from "@/lib/brand";
import { getSessionUser } from "@/lib/auth/dal";

export default async function Navbar() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <div
        className="mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full border border-white bg-white/85 px-5 backdrop-blur-md sm:px-7"
        style={{
          boxShadow:
            "inset 0 2px 0 rgba(255,255,255,.9), 0 10px 30px -10px rgba(124,95,184,.35)",
        }}
      >
        <Link href="/" className="flex items-baseline gap-2.5">
          <span className="font-display text-xl text-plum">{brand.name}</span>
          <span className="hidden text-xs font-medium tracking-[0.18em] text-gold sm:block">
            {brand.nameEn}
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/series" className="text-ink transition hover:text-plum">
            課程系列
          </Link>
          <Link
            href="/gift/redeem"
            className="hidden text-ink transition hover:text-plum sm:block"
          >
            兌換禮物
          </Link>
          {user ? (
            <>
              <Link href="/my/courses" className="text-ink transition hover:text-plum">
                我的課程
              </Link>
              {user.isAdmin && (
                <Link href="/admin" className="text-gold transition hover:text-plum">
                  後台
                </Link>
              )}
              <Link
                href="/account"
                className="clay-dot h-10 w-10 text-sm font-bold text-plum transition hover:text-gold"
                title={user.name ?? user.email ?? "會員"}
              >
                {(user.name ?? user.email ?? "會")[0]}
              </Link>
            </>
          ) : (
            <Link href="/login" className="btn-primary !px-6 !py-2.5 text-xs">
              登入
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
