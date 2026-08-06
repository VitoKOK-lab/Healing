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

// 只保留 24 小時。這是給現場客人當下掃走用的臨時連結,
// 不是相簿——客人掃了就該立刻存到自己手機。
// 留短一點對雙方都好:客人的占卜內容不會一直躺在別人的伺服器上,
// 資料庫也不會越長越大。
const KEEP_HOURS = 24;

// 對外公開的網域。
//
// 不能用「請求進來的網域」:preview 部署有 Vercel 的存取保護,
// 客人掃了會被丟到 Vercel 登入頁。店主在 preview 上試玩時一定會踩到。
// 所以正式環境一律用固定網域,完全不看請求來源。
// 之後換自訂網域,設 PUBLIC_SITE_URL 環境變數即可,不必改程式。
const FALLBACK_SITE = "https://healingasmr.vercel.app";

function publicBase(req: NextRequest) {
  const env = process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/+$/, "");
  // 本機開發才用當下網域,不然掃了連不到自己的機器
  if (process.env.NODE_ENV !== "production") return req.nextUrl.origin;
  return FALLBACK_SITE;
}

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
  const expiresAt = new Date(Date.now() + KEEP_HOURS * 60 * 60 * 1000);

  try {
    await prisma.tarotShare.create({ data: { token, image, mimeType, expiresAt } });
    // 順手把過期的實際刪掉,不另外養一支排程。
    // 過期的在 GET 那邊本來就取不到,這一步是真的把資料清掉。
    await prisma.tarotShare.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  } catch (e) {
    console.error("[tarot/share] 存圖失敗", e);
    return NextResponse.json({ error: "存圖失敗" }, { status: 500, headers: CORS_HEADERS });
  }

  // QR 指向 /r/<token>:一頁極簡的結果頁,只有結果圖與一顆 LINE 按鈕。
  // 那一頁是 route handler 直接吐的 HTML,不套站台 layout,所以沒有
  // 導覽列、沒有回到占卜頁的連結——客人拿得走結果,但回不來繼續免費玩。
  //
  // 網域一定要用正式站,不能用 req 進來的那個:preview 部署有 Vercel 的
  // 存取保護,客人掃了會被丟到 Vercel 登入頁。店主在 preview 上試玩時
  // 尤其會踩到。正式站沒有保護,誰都打得開。
  const url = `${publicBase(req)}/r/${token}`;

  const qr = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#1e0e2d", light: "#ffffff" },
  });

  return NextResponse.json({ url, qr, expiresAt }, { headers: CORS_HEADERS });
}
