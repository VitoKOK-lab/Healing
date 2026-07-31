import { NextResponse, type NextRequest } from "next/server";

// 注意:這裡只做「有沒有 session cookie」的 UX 導轉。
// 真正的存取控制在 lib/auth/dal.ts(requireUser/requireAdmin,node runtime)——
// Prisma 不能跑 edge runtime,請勿把 auth() 搬進 middleware。

const PROTECTED_PREFIXES = ["/my", "/watch", "/account", "/gift", "/admin", "/checkout"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // 品牌靜態站(public/ 內的 *.html,含 /checkout/tarot.html、/watch/*.html)免登入
  if (pathname.endsWith(".html")) {
    return NextResponse.next();
  }
  if (!PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("reason", "auth-required");
    url.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/my/:path*", "/watch/:path*", "/account", "/gift/:path*", "/admin/:path*", "/checkout/:path*"],
};
