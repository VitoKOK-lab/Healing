import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/dal";

// 結帳結果頁輪詢用:回傳訂單目前狀態(僅限訂單本人)。
// ClientBackURL 不帶付款結果,webhook 可能晚於瀏覽器返回——所以一律問 DB。

export async function GET(
  _req: Request,
  { params }: { params: { orderNo: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { orderNo: params.orderNo },
    include: { giftCode: { select: { code: true, status: true } } },
  });
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({
    orderNo: order.orderNo,
    status: order.status,
    kind: order.kind,
    amountTwd: order.amountTwd,
    giftCode:
      order.kind === "GIFT" && order.status === "PAID"
        ? order.giftCode?.code ?? null
        : null,
  });
}
