import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 客人掃 QR 之後看到的畫面。
//
// 刻意用 route handler 直接吐 HTML,而不是做成一般的 page:
// page 會套上站台的 layout(導覽列、頁尾、各種連結),那等於給了客人
// 一條回到占卜流程繼續免費玩的路。這裡從零組一頁,畫面上只有兩樣東西:
//   1. 這次的占卜結果圖(長按就能存)
//   2. 「想成為線上珠寶商」的 LINE 按鈕
// 除此之外沒有任何連結,回不到占卜頁。

const LINE_OA = "https://lin.ee/pUaTWJg";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

function page(body: string, title: string) {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow" />
<title>${esc(title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px 18px calc(28px + env(safe-area-inset-bottom));
    min-height: 100dvh;
    font-family: "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif;
    color: #f6eeff; text-align: center;
    background:
      radial-gradient(circle at 15% 10%, rgba(175,119,238,.26), transparent 34%),
      radial-gradient(circle at 85% 16%, rgba(245,190,112,.15), transparent 30%),
      linear-gradient(160deg, #140c22 0%, #241539 52%, #150d24 100%);
  }
  .brand { font-size: 12px; letter-spacing: .28em; color: rgba(240,227,255,.55); }
  h1 { margin: 10px 0 0; font-size: 20px; font-weight: 500; }
  .sub { margin: 8px 0 0; font-size: 13px; line-height: 1.75; color: rgba(240,227,255,.62); }
  /* 圖片是主角:給它最大的寬度,長按就能存到相簿 */
  .shot { margin: 22px auto 0; max-width: 520px; }
  .shot img {
    width: 100%; height: auto; display: block;
    border-radius: 18px; border: 1px solid rgba(222,197,255,.2);
    box-shadow: 0 22px 60px rgba(0,0,0,.45);
  }
  .hint { margin: 12px 0 0; font-size: 12px; color: rgba(240,227,255,.5); }
  /* 24 小時就刪掉是這頁最重要的一件事——客人只會看一眼就滑走,
     所以講在圖片前面,而且用看得出是提醒的樣子,不是灰灰的小字。 */
  .keep {
    display: block; max-width: 520px; margin: 20px auto 0;
    padding: 13px 18px; border-radius: 14px;
    border: 1px solid rgba(245,190,112,.42);
    background: rgba(245,190,112,.12);
    color: #ffe0ae; font-size: 14px; line-height: 1.75; font-weight: 600;
  }
  .keep small { display: block; margin-top: 3px; font-size: 12.5px; font-weight: 400; opacity: .82; }
  .cta {
    display: block; max-width: 520px; margin: 30px auto 0;
    padding: 17px 24px; border-radius: 999px;
    background: linear-gradient(135deg, #ffd694, #f0a24f);
    color: #2d183c; font-size: 16px; font-weight: 700; text-decoration: none;
    box-shadow: 0 14px 34px rgba(240,162,79,.3);
  }
  .cta small { display: block; margin-top: 3px; font-size: 11.5px; font-weight: 400; opacity: .78; }
  .foot { margin: 26px 0 0; font-size: 11px; color: rgba(240,227,255,.34); line-height: 1.8; }
  .gone { margin: 60px auto 0; max-width: 420px; font-size: 15px; line-height: 1.9; color: rgba(240,227,255,.72); }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const ok = /^[A-Za-z0-9_-]{20,24}$/.test(token);
  const row = ok
    ? await prisma.tarotShare.findUnique({ where: { token }, select: { expiresAt: true } })
    : null;

  if (!row || row.expiresAt.getTime() < Date.now()) {
    return new NextResponse(
      page(
        `<p class="gone">這張占卜結果已經過期了喵。<br />連結只保留 24 小時。</p>
         <a class="cta" href="${LINE_OA}">想成為線上珠寶商<small>加 LINE 了解怎麼開始</small></a>`,
        "占卜結果已過期"
      ),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const body = `
  <p class="brand">JESSICA 解憂商店</p>
  <h1>你的喵喵占卜結果</h1>
  <p class="sub">長按下面的圖片就能存到手機相簿,<br />也可以直接轉傳給朋友。</p>

  <p class="keep">這個連結只保留 24 小時,請自行截圖<small>時間到就會自動刪除,之後這頁打不開了</small></p>

  <div class="shot"><img src="/api/tarot/share/${esc(token)}" alt="喵喵占卜結果圖" /></div>
  <p class="hint">長按圖片 → 儲存影像,或直接截圖</p>

  <a class="cta" href="${LINE_OA}">想成為線上珠寶商<small>加 LINE 了解怎麼開始</small></a>

  <p class="foot">連結只保留 24 小時,請自行截圖存下來<br />© 2026 Jessica 解憂商店</p>`;

  return new NextResponse(page(body, "你的喵喵占卜結果"), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
