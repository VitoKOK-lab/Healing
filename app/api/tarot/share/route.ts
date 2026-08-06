import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

// 收下現場占卜的結果圖,存起來並回傳一組 QR 給螢幕顯示。
// 客人用自己的手機掃走圖,店主的畫面完全不動,可以直接接下一位。
//
// 這支只做「存圖 + 產 QR」,沒有任何會員或額度概念——桌面版是店主
// 自己在現場用的工具,不計次。

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// 圖太大就不收:一張占卜結果圖正常在 300KB 上下,
// 給到 4MB 已經很寬鬆,再大幾乎可以確定是誤送或濫用。
const MAX_BYTES = 4 * 1024 * 1024;

// 保留 30 天。現場掃走的圖沒有長期保存的理由,
// 留太久只是讓資料庫一直長大。
const KEEP_DAYS = 30;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let dataUrl: string;
  try {
    const body = await req.json();
    dataUrl = String(body?.image || "");
  } catch {
    return NextResponse.json({ error: "格式不正確" }, { status: 400, headers: CORS_HEADERS });
  }

  const m = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(dataUrl);
  if (!m) {
    return NextResponse.json({ error: "只接受 PNG 或 JPEG 的 data URL" }, { status: 400, headers: CORS_HEADERS });
  }

  const mimeType = m[1];
  const image = Buffer.from(m[2], "base64");
  if (image.byteLength === 0 || image.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "圖片大小不合理" }, { status: 413, headers: CORS_HEADERS });
  }

  // 猜不到也列舉不出來的 token——這是唯一保護,因為取圖那支不需要登入
  const token = randomBytes(16).toString("base64url");
  const expiresAt = new Date(Date.now() + KEEP_DAYS * 24 * 60 * 60 * 1000);

  try {
    await prisma.tarotShare.create({ data: { token, image, mimeType, expiresAt } });
    // 順手清掉過期的,不另外養一支排程
    await prisma.tarotShare.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  } catch (e) {
    console.error("[tarot/share] 存圖失敗", e);
    return NextResponse.json({ error: "存圖失敗" }, { status: 500, headers: CORS_HEADERS });
  }

  // QR 指向圖片本身,不是網站。掃到的人只會看到一張圖,
  // 沒有導覽也沒有連結,不會多出一個回站繼續占卜的入口。
  const origin = req.nextUrl.origin;
  const url = `${origin}/api/tarot/share/${token}`;

  const qr = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#1e0e2d", light: "#ffffff" },
  });

  return NextResponse.json({ url, qr, expiresAt }, { headers: CORS_HEADERS });
}
