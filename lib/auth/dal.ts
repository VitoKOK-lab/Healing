import { redirect, notFound } from "next/navigation";
import { auth } from "./config";
import { isAdminEmail } from "./admin";

// Data Access Layer:所有受保護頁面/route handler/server action 的守門員。
// 注意:真正的存取控制在這裡(node runtime),middleware 只做 UX 導轉。

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin: boolean;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user ?? null;
}

/** 未登入(或 session 被新裝置取代)→ 導向登入頁 */
export async function requireUser(callbackUrl?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const cb = callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : "";
    redirect(`/login?reason=auth-required${cb}`);
  }
  return user;
}

/** 非管理員一律 404(不暴露後台存在) */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) notFound();
  return user;
}
