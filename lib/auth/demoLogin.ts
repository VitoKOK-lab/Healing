"use server";

import { cookies, headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

// 示範登入(不需要 Google/LINE 金鑰):直接建立 Session row + 設同名 cookie,
// 與 Auth.js database session 策略完全相容(cookie 名稱、useSecureCookies 判斷邏輯
// 皆比照 @auth/core 原生行為),因此單一裝置登入等機制不需另外處理即可沿用。
// 正式上線前把 DEMO_LOGIN 設為 "false" 即可關閉此登入方式。

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "guest"
  );
}

export type DemoSignInResult = { ok: true } | { ok: false; error: string };

export async function demoSignIn(formData: FormData): Promise<DemoSignInResult> {
  if (env.DEMO_LOGIN !== "true") {
    return { ok: false, error: "示範登入目前未開放。" };
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const emailInput = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!name) return { ok: false, error: "請輸入顯示名稱。" };

  const email = emailInput || `demo+${slugify(name)}@demo.local`;

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name },
  });

  // 單一裝置登入:比照 lib/auth/adapter.ts 的規則,新登入踢掉舊 session
  await prisma.session.deleteMany({ where: { userId: user.id } });
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });

  const proto =
    headers().get("x-forwarded-proto") ??
    (env.APP_BASE_URL.startsWith("https") ? "https" : "http");
  const useSecureCookies = proto === "https";
  const cookieName = useSecureCookies
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  cookies().set(cookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: useSecureCookies,
    expires,
  });

  redirect("/my/courses");
}
