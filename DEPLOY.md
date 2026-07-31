# 解憂商店 — 展示版上線指南(Vercel)

照著做約 15–20 分鐘,全程免費。完成後你會有一個公開網址(例如 `https://healing-xxx.vercel.app`),
訪客可以瀏覽、Google 登入、走模擬付款、看範例影片。**不會收真錢。**

> 之後要正式營運,只需再申請綠界與 Cloudflare Stream 金鑰填入環境變數,不用改程式(見 README「上線清單」)。

---

## 第 1 步:註冊 Vercel 並匯入專案

1. 打開 [vercel.com/signup](https://vercel.com/signup),選 **Continue with GitHub** 登入
2. 進入 Dashboard,按 **Add New… → Project**
3. 在清單找到 **VitoKOK-lab/Healing**,按 **Import**
   (找不到的話按 Adjust GitHub App Permissions,授權 Healing repo)
4. 先**不要**按 Deploy,繼續第 2 步

## 第 2 步:加免費資料庫(Neon Postgres)

1. 專案匯入畫面先隨便 Deploy 一次也沒關係(會失敗,正常——還沒有資料庫)
2. 到專案頁 → **Storage** 分頁 → **Create Database** → 選 **Neon (Postgres)** → Free 方案 → Create
3. 建好後按 **Connect Project**,把它連到這個專案——Vercel 會自動幫你加上 `DATABASE_URL` 環境變數

## 第 3 步:填環境變數

專案頁 → **Settings → Environment Variables**,逐筆新增(Environment 全選):

| 名稱 | 值 |
|---|---|
| `AUTH_SECRET` | 一串隨機文字(Claude 已幫你生成,見聊天訊息;或到 [generate-secret.vercel.app/32](https://generate-secret.vercel.app/32) 產一個) |
| `AUTH_URL` | 你的部署網址,例如 `https://healing-xxx.vercel.app`(第一次部署後到 Overview 看網址再回來填) |
| `APP_BASE_URL` | 同上,一樣填部署網址 |
| `AUTH_TRUST_HOST` | `true` |
| `ADMIN_EMAILS` | `taiwanstore365@gmail.com`(你的店主 Gmail,可逗號加多個) |
| `PAYMENT_PROVIDER` | `mock` |
| `VIDEO_PROVIDER` | `mock` |
| `AUTH_GOOGLE_ID` | 第 4 步取得 |
| `AUTH_GOOGLE_SECRET` | 第 4 步取得 |

## 第 4 步:建 Google 登入金鑰

1. 打開 [console.cloud.google.com](https://console.cloud.google.com) → 上方選單建立新專案(名稱隨意,例如 `jieyou-store`)
2. 左側選單 **API 和服務 → OAuth 同意畫面**:
   - User Type 選 **外部** → 建立
   - 填 App 名稱(解憂商店)、支援 email → 一路儲存(測試模式即可,記得在「測試使用者」加入你自己與朋友的 Gmail)
3. 左側 **憑證 → 建立憑證 → OAuth 用戶端 ID**:
   - 應用程式類型:**網頁應用程式**
   - 已授權的重新導向 URI 加一筆:
     `https://你的部署網址/api/auth/callback/google`
     (例如 `https://healing-xxx.vercel.app/api/auth/callback/google`)
4. 建立後會給你 **用戶端 ID** 和 **用戶端密碼**,分別填入 Vercel 的
   `AUTH_GOOGLE_ID` 與 `AUTH_GOOGLE_SECRET`

## 第 5 步:部署

1. 專案頁 → **Deployments** → 最新一筆右邊「⋯」→ **Redeploy**
2. 等 1–2 分鐘變成 Ready,點開網址
3. 到 **Settings → Environment Variables** 確認 `AUTH_URL`/`APP_BASE_URL` 已填成這個網址;若剛剛才補填,再 Redeploy 一次

## 第 6 步:載入示範內容

1. 打開你的網址,按右上「登入」→ 用**店主 Gmail** 的 Google 帳號登入
2. 右上會出現「後台」→ 進入 `/admin`
3. 總覽頁右上按 **「一鍵載入示範課程資料」** → 首頁就有 2 個系列、4 堂課了

## 驗收清單

- [ ] 首頁、系列、課程頁正常,封面圖有顯示
- [ ] Google 登入成功;換另一個瀏覽器登入,第一個會被登出(單一裝置)
- [ ] 買一堂課 → 假綠界付款頁 → 「模擬付款成功」→ 我的課程出現該課
- [ ] 觀看頁能播範例影片,畫面有你的帳號浮水印
- [ ] 非店主帳號打開 `/admin` 會看到 404

## 常見問題

- **登入轉圈圈/錯誤 `redirect_uri_mismatch`**:Google 憑證的重新導向 URI 跟部署網址不一致,回第 4 步核對(必須完全相同,含 https)
- **付款後結果頁一直轉**:確認 `APP_BASE_URL` 是部署網址(webhook 打回自己要用它),改完 Redeploy
- **影片播不出來**:展示版影片是內建範例片;若 403,重新整理讓播放器換新簽名連結
- **後台上傳影片**:展示版不會真的保存(雲端無持久磁碟),接 Cloudflare Stream 後才是真上傳

## 之後想加 LINE 登入

1. [developers.line.biz](https://developers.line.biz) 建 Provider + **LINE Login** channel
2. Callback URL 填 `https://你的網址/api/auth/callback/line`
3. 申請 **email 權限**(OpenID Connect → Email address permission,要附畫面截圖審核)
4. 把 Channel ID / Channel secret 填入 Vercel 的 `AUTH_LINE_ID` / `AUTH_LINE_SECRET` → Redeploy
   (填了之後登入頁才會出現 LINE 按鈕)
