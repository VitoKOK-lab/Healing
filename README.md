# 解憂商店 JIEYOU STORE — 線上療癒課程影音平台

舒壓、補運課程影音平台:單堂購買 + 系列訂閱、示範/LINE/Google 登入(單一裝置)、
綠界 ECPay 金流(開發期為模擬)、送禮(一次性禮物碼)、觀看者浮水印防護、完整管理後台。

## 快速開始(開發模式,零金鑰)

```bash
npm install
cp .env.example .env          # 填 AUTH_SECRET(openssl rand -base64 32)、ADMIN_EMAILS、DATABASE_URL(Postgres,
                              # 可用 Neon 免費方案或 docker run -e POSTGRES_PASSWORD=pw -p 5432:5432 postgres)
npx prisma migrate deploy     # 建立資料表
npx prisma db seed            # 種子資料:2 系列、4 課程、12 單元
npm run dev                   # http://localhost:3000
```

開發模式下 `PAYMENT_PROVIDER=mock`、`VIDEO_PROVIDER=mock`、`DEMO_LOGIN=true`:

- **示範登入**:登入頁輸入顯示名稱即可(免 Google/LINE 金鑰);Email 欄留空會自動產生示範帳號,
  填入 `ADMIN_EMAILS` 裡的信箱則可測試後台。正式上線前把 `DEMO_LOGIN` 設為 `false` 關閉。
- **購買/訂閱模擬**:結帳會跳到「假綠界付款頁」,按「模擬付款成功/失敗」,
  伺服器會像真綠界一樣打 webhook 回本站完成開通。
- **影片模擬**:所有課程單元播放 `public/dev-videos/sample.mp4`,
  串流一樣走「簽名短效連結」驗證,行為與正式環境一致。
- **模擬續扣**:後台訂閱管理有「模擬下期扣款」按鈕(或 POST `/api/mock-ecpay/simulate-period`)。

## 測試

```bash
npm test          # vitest:CheckMacValue(綠界官方文件範例)、授權規則、禮物碼、訂單編號
npm run build     # 型別檢查 + 產線建置
```

`scripts/smoke-*.ts` 為端到端煙霧測試腳本(購買、兌換、取消訂閱、單一裝置互踢)。

## 架構速覽

| 層 | 位置 | 說明 |
|---|---|---|
| 資料模型 | `prisma/schema.prisma` | Postgres(開發可用 Neon 免費方案或本機 docker) |
| 登入 | `lib/auth/` | Auth.js v5(Google+LINE)+ `demoLogin.ts` 示範登入;`adapter.ts` 實作單一裝置登入(新登入踢舊裝置) |
| 金流 | `lib/payments/` | `PaymentProvider` 介面依真綠界塑形;`mock/` 與 `ecpay/` 可切換 |
| 影片 | `lib/video/` | `VideoProvider` 介面;`mock/`(本機簽名串流)與 `cloudflare/`(Stream signed URL) |
| 授權 | `lib/entitlements/access.ts` | 購買/受贈=永久;訂閱=至本期結束(含已取消) |
| 禮物 | `lib/gifts/` | 16 碼一次性禮物碼,原子兌換(僅限一人) |
| 品牌 | `lib/brand.ts` | 品牌名/標語/封面集中設定,改一檔全站生效 |

## 上線清單

1. **資料庫**:`DATABASE_URL` 指向正式 Postgres(部署見 `DEPLOY.md`,Vercel+Neon 會自動注入),建表由部署時的 `prisma migrate deploy` 完成。
2. **關閉示範登入**:`DEMO_LOGIN` 改為 `false`(正式營運不該讓任何人免驗證登入)。
3. **OAuth**:
   - Google Cloud Console 建 OAuth 用戶端,redirect URI:`https://你的網域/api/auth/callback/google`
   - LINE Developers 建 LINE Login channel,callback:`https://你的網域/api/auth/callback/line`,
     **記得申請 email 權限**(否則拿不到使用者 email,浮水印會退回顯示名稱+ID)
4. **綠界**:申請商店取得 MerchantID/HashKey/HashIV,
   `.env` 設 `PAYMENT_PROVIDER=ecpay` 並填入;先用測試環境
   `ECPAY_BASE_URL=https://payment-stage.ecpay.com.tw` 驗證(webhook 需要公開網址)。
5. **影片**:Cloudflare Stream 開通後 `VIDEO_PROVIDER=cloudflare`,
   建簽名金鑰(`POST /accounts/{id}/stream/keys`)填入 `CF_STREAM_SIGNING_KEY_*`。
6. `APP_BASE_URL`/`AUTH_URL` 改為正式網域,`ADMIN_EMAILS` 填店主 Gmail。

## 防錄影說明(重要)

本平台採「嚇阻級」防護:簽名短效連結(未授權/過期一律 403)、禁下載/右鍵/子母畫面、
**觀看者身分浮水印**(半透明、隨機移動,外流畫面可追溯到帳號)。
瀏覽器技術**無法 100% 阻止**螢幕錄影(如 OBS、手機翻拍);
若日後需要硬體級防護(錄影變黑畫面),可升級為 DRM 方案(如 Mux + Widevine/FairPlay),
`VideoProvider` 介面已預留擴充空間。
