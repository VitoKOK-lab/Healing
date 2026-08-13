import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { verifyLineToken } from "@/lib/line/verify";
import { amountFor, isPurchaseKind } from "@/lib/payments/pricing";

// 建立付款單(規格 §5)。provider:
//   mock    — 開發/驗收用假付款頁,confirm 端點入帳
//   linepay — 店主的 LINE Pay 商家審核下來後接上(request/confirm API);
//             金鑰未設定前回 503,前端顯示「付款即將開放」
// 金額由伺服器依 kind 決定,客戶端傳來的任何金額都不採信。

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const { accessToken, kind, readingId } = (body ?? {}) as {
    accessToken?: unknown;
    kind?: unknown;
    readingId?: unknown;
  };
  if (typeof accessToken !== "string" || !isPurchaseKind(kind)) {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const identity = await verifyLineToken(accessToken);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const user = await prisma.tarotUser.findUnique({ where: { lineUserId: identity.userId } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // deep 必須綁一筆自己的占卜(付這張牌陣的錢)
  let boundReadingId: string | null = null;
  if (kind === "deep") {
    if (typeof readingId !== "string") {
      return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
    }
    const reading = await prisma.reading.findUnique({ where: { id: readingId } });
    if (!reading || reading.userId !== user.id || reading.level !== "deep") {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }
    boundReadingId = reading.id;
  }

  // LINE Pay 金鑰未設定 → 只有 stub/開發環境能用 mock;正式環境回「即將開放」
  const useMock = env.LINE_STUB === "1";
  if (!useMock) {
    return NextResponse.json({ ok: false, error: "payment_not_available" }, { status: 503 });
  }

  const purchase = await prisma.purchase.create({
    data: {
      userId: user.id,
      kind,
      amount: amountFor(kind),
      provider: "mock",
      readingId: boundReadingId,
    },
  });

  return NextResponse.json({
    ok: true,
    purchaseId: purchase.id,
    amount: purchase.amount,
    paymentUrl: `/liff/mock-pay.html?purchaseId=${purchase.id}&amount=${purchase.amount}`,
  });
}
