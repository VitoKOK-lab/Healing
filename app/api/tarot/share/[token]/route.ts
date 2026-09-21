import { NextRequest, NextResponse } from "next/server";
import { one } from "@/lib/db";
import { shareBucket } from "@/lib/share-store";

// 客人掃 QR 後打到的就是這裡。
//
// 這支刻意只吐圖片位元組——沒有 HTML、沒有連結、沒有任何導覽。
// 掃到的人看到的就是一張圖,長按存起來或轉傳 LINE 都可以,
// 但不會因此多一個回到占卜流程繼續玩的入口。這是店主的要求,
// 也是為什麼 QR 指向這裡而不是站上任何一頁。

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  // token 是 base64url 的 16 bytes,長度固定;形狀不對就不必查資料庫
  if (!/^[A-Za-z0-9_-]{20,24}$/.test(token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // 先查索引:過期與否由資料庫說了算,不是看 R2 裡還在不在。
  // 這樣「已過期」跟「根本沒這張」回的是同一句話,外面看不出差別。
  const row = await one<{ mimeType: string; expiresAt: string }>(
    `SELECT mimeType, expiresAt FROM TarotShare WHERE token = ?`,
    token
  );
  if (!row || new Date(row.expiresAt).getTime() < Date.now()) {
    return new NextResponse("這張占卜結果已經過期了", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 索引在但圖不在,代表清理清到一半或上傳時斷掉。
  // 對客人來說結果一樣(拿不到圖),所以講同一句話。
  const obj = await shareBucket().get(token);
  if (!obj) {
    return new NextResponse("這張占卜結果已經過期了", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new NextResponse(obj.body, {
    status: 200,
    headers: {
      "Content-Type": row.mimeType,
      // 手機瀏覽器直接顯示,客人長按就能存
      "Content-Disposition": "inline",
      // 快取不能長過保留時間(24h),否則資料刪掉了 CDN 還在供圖,
      // 就違背了「24 小時自動刪除」。壓到一小時,重看也還算快。
      "Cache-Control": "public, max-age=3600",
      // 這是私人的占卜結果,不希望被搜尋引擎收錄
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
