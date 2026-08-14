# TAHIR ZAINAB TAROT — 喵喵占卜

Jessica 解憂商店的塔羅占卜站。2026-08 起整個 repo 只做這一件事:
原本的課程影音平台(會員、金流、影片、後台)已整站下線清除,
正式版將以 **LINE 官方帳號(LINE OA)App** 重新設計,這裡是它的地基。

## 現在線上有什麼

| 網址 | 誰在用 |
|---|---|
| `/tarot/index.html` | 客人自己的手機(直式、計次) |
| `/tarot/desk.html` | 店主現場的電腦/iPad(橫式、不計次、傳客人 QR) |
| `/` | 轉址到 `/tarot/index.html` |

前端細節(流程引擎、牌庫、寶石推薦、影片資產)見 `site-static/tarot/README.md`。

## 後端(Next.js 只剩四支 API)

- `POST /api/tarot/reading` — Gemini 產生解讀
- `POST /api/tarot/clarify` — 本喵沒聽懂時的追問
- `POST /api/tarot/share` — 存結果圖,回傳 QR(24 小時後過期)
- `GET  /api/tarot/share/<token>`、`GET /r/<token>` — 客人掃 QR 取圖

資料表只剩 `TarotShare`(`prisma/schema.prisma`)。課程平台的舊表
仍留在資料庫裡(schema 移除但未 DROP),`prisma/migrations/` 保留完整歷史。

## 開發

```bash
npm install
cp .env.example .env   # 填 DATABASE_URL / DIRECT_URL / GEMINI_API_KEY
npm run dev            # http://localhost:3000
```

靜態站在本機不會自動掛上:Vercel 的 build(見 `vercel.json`)才會把
`site-static/` 複製進 `public/`。本機看頁面可直接
`python3 -m http.server -d site-static`。

## 部署(Vercel + Supabase)

Vercel(專案 `healingasmr`,production 網域 `healingasmr.vercel.app`),
push 到 `main` 自動部署。build 流程:`prisma generate && prisma migrate deploy
&& cp -r site-static/. public/ && next build`。

資料庫用 Supabase(就是 Postgres,Prisma 直接連,程式不需任何改動):

1. supabase.com 建專案(區域選 Singapore/Tokyo,離台灣近)
2. 專案首頁 **Connect** → 選 **ORMs / Prisma**,會給兩條連線字串:
   - Transaction pooler(port 6543)→ 填進 Vercel 的 `DATABASE_URL`
     (結尾記得帶 `?pgbouncer=true`,serverless 必須走連線池)
   - Direct connection(port 5432)→ 填進 `DIRECT_URL`(migrate 專用)
3. Redeploy——build 裡的 `prisma migrate deploy` 會自動把所有表建好,
   不用手動跑任何 SQL

## 下一步(LINE OA 版)

- 抽牌與 tier 判定移到伺服器端計算(方向由系統鎖定,模型只負責表達)
- 額度綁真實購買紀錄,取代 localStorage 計次
- 解讀引擎依新版規格書重寫(tier 機制、禁用詞攔截、輸出審核)
