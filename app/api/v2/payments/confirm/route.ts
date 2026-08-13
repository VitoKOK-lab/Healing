import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { verifyLineToken } from "@/lib/line/verify";
import { fulfillPurchase } from "@/lib/payments/fulfill";

// mock 付款確認(只在 LINE_STUB=1 開放)。
// LINE Pay 真接上後這裡換成官方 confirm API 的回呼驗證,fulfillPurchase 不變——
// 入帳冪等已在那一層保證。

export async function POST(req: NextRequest) {
  if (env.LINE_STUB !== "1") {
    return NextResponse.json({ ok: false, error: "not available" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const { accessToken, purchaseId, result } = (body ?? {}) as {
    accessToken?: unknown;
    purchaseId?: unknown;
    result?: unknown;
  };
  if (
    typeof accessToken !== "string" ||
    typeof purchaseId !== "string" ||
    (result !== "success" && result !== "fail")
  ) {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const identity = await verifyLineToken(accessToken);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
  const user = await prisma.tarotUser.findUnique({ where: { lineUserId: identity.userId } });
  if (!purchase || !user || purchase.userId !== user.id) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  if (result === "fail") {
    await prisma.purchase.updateMany({
      where: { id: purchase.id, status: "pending" },
      data: { status: "failed" },
    });
    return NextResponse.json({ ok: true, status: "failed" });
  }

  const outcome = await fulfillPurchase(purchase.id);
  return NextResponse.json({ ok: true, status: outcome === "not_found" ? "error" : "paid" });
}
