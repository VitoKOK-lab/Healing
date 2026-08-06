import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 客人掃 QR 後打到的就是這裡。
//
// 這支刻意只吐圖片位元組——沒有 HTML、沒有連結、沒有任何導覽。
// 掃到的人看到的就是一張圖,長按存起來或轉傳 LINE 都可以,
// 但不會因此多一個回到占卜流程繼續玩的入口。這是店主的要求,
// 也是為什麼 QR 指向這裡而不是站上任何一頁。

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  // token 是 base64url 的 16 bytes,長度固定;形狀不對就不必查資料庫
  if (!/^[A-Za-z0-9_-]{20,24}$/.test(token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const row = await prisma.tarotShare.findUnique({ where: { token } });
  if (!row || row.expiresAt.getTime() < Date.now()) {
    return new NextResponse("這張占卜結果已經過期了", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new NextResponse(Buffer.from(row.image), {
    status: 200,
    headers: {
      "Content-Type": row.mimeType,
      // 手機瀏覽器直接顯示,客人長按就能存
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=86400, immutable",
      // 這是私人的占卜結果,不希望被搜尋引擎收錄
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
