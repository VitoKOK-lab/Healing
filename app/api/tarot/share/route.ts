import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { run, all, newId, now } from "@/lib/db";
import { shareBucket } from "@/lib/share-store";

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
// 不能用「請求進來的網域」:預覽部署的網址跟正式站不一樣,客人掃到
// 預覽網址的 QR,等預覽被清掉就變成死連結。所以正式環境一律用固定網域,
// 完全不看請求來源。換自訂網域時設 PUBLIC_SITE_URL 環境變數即可,不必改程式。
const FALLBACK_SITE = "https://healingasmr.vitokok.workers.dev";

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

// 把過期的結果圖真的刪掉——R2 的圖與 D1 的索引都要。
// 一次最多處理 100 筆:這是順手做的清理,不能讓它拖慢客人那一下。
// 沒清完也沒關係,下一次上傳會接著清。
async function sweepExpired(): Promise<void> {
  try {
    const dead = await all<{ token: string }>(
      `SELECT token FROM TarotShare WHERE expiresAt < ? LIMIT 100`,
      now()
    );
    if (dead.length === 0) return;
    const bucket = shareBucket();
    const tokens = dead.map((r) => r.token);
    await Promise.all(tokens.map((t) => bucket.delete(t)));
    // IN (?,?,?…):參數個數跟著筆數走,所以佔位符要動態組
    await run(
      `DELETE FROM TarotShare WHERE token IN (${tokens.map(() => "?").join(",")})`,
      ...tokens
    );
  } catch (e) {
    // 清理失敗不該影響客人剛剛存的那張圖
    console.error("[tarot/share] 清過期失敗", e);
  }
}

export async function POST(req: NextRequest) {
  let dataUrl: string;
  try {
    const body = (await req.json()) as { image?: unknown } | null;
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
    // 圖進 R2(key 就是 token),資料庫只留「有這張、什麼格式、什麼時候過期」。
    // 順序很重要:先把圖放好再寫索引。反過來的話,中間失敗會留下一筆
    // 指向不存在的圖的紀錄,客人掃了得到 404 卻不知道為什麼。
    await shareBucket().put(token, image, {
      httpMetadata: { contentType: mimeType },
    });
    await run(
      `INSERT INTO TarotShare (id, token, mimeType, createdAt, expiresAt)
       VALUES (?, ?, ?, ?, ?)`,
      newId(),
      token,
      mimeType,
      now(),
      expiresAt.toISOString()
    );

    // 順手把過期的清掉,不另外養一支排程。
    // 過期的在 GET 那邊本來就取不到,這一步是真的把東西刪掉——
    // 圖跟索引都要刪,只刪索引的話 R2 會一直長大而且沒人看得到。
    void sweepExpired();
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
