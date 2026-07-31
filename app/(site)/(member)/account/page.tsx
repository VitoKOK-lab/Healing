import { requireUser } from "@/lib/auth/dal";
import { signOut } from "@/lib/auth/config";
import Link from "next/link";

export const metadata = { title: "我的帳戶" };

export default async function AccountPage() {
  const user = await requireUser("/account");

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="eyebrow">Account</p>
      <h1 className="mt-3 font-serif-tc text-3xl font-semibold">我的帳戶</h1>

      <div className="card mt-10 space-y-4 p-8 text-sm">
        <div>
          <p className="text-xs text-inkdim">名稱</p>
          <p className="mt-1">{user.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-inkdim">Email</p>
          <p className="mt-1">{user.email ?? "(LINE 帳號未提供 Email)"}</p>
        </div>
        <hr className="rule-gold" />
        <nav className="space-y-2">
          <Link className="block transition hover:text-gold" href="/my/courses">我的課程</Link>
          <Link className="block transition hover:text-gold" href="/my/orders">我的訂單</Link>
          <Link className="block transition hover:text-gold" href="/my/subscriptions">我的訂閱</Link>
          <Link className="block transition hover:text-gold" href="/my/gifts">我的禮物</Link>
        </nav>
      </div>

      <p className="mt-6 text-xs leading-5 text-inkdim">
        您的帳號同一時間僅能在一台裝置登入;在其他裝置登入會使此裝置自動登出。
      </p>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
        className="mt-8"
      >
        <button className="btn-secondary w-full">登出</button>
      </form>
    </div>
  );
}
