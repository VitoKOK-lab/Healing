# 解憂商店 — 展示版上線指南(Vercel)

照著做約 5–10 分鐘,全程免費。完成後你會有一個公開網址(例如 `https://healing-xxx.vercel.app`),
訪客可以瀏覽、**示範登入**(免 Google/LINE 金鑰)、走模擬付款、看範例影片、送禮兌換、逛後台。**不會收真錢。**

> 之後要正式營運,只需申請綠界、Cloudflare Stream、Google/LINE 金鑰填入環境變數,不用改程式(見 README「上線清單」)。

---

## 第 1 步:註冊 Vercel 並匯入專案

1. 打開 [vercel.com/signup](https://vercel.com/signup),選 **Continue with GitHub** 登入
2. 進入 Dashboard,按 **Add New… → Project**
3. 在清單找到 **VitoKOK-lab/Healing**,按 **Import**
   (找不到的話按 Adjust GitHub App Permissions,授權 Healing repo)
4. 先**不要**按 Deploy,繼續第 2 步

## 第 2 步:加免費資料庫(Vercel 內建 Postgres)

全程都在 Vercel 網站裡完成,不用另外註冊、找密碼。

1. 專案匯入畫面先隨便 Deploy 一次也沒關係(會失敗,正常——還沒有資料庫)
2. 到專案頁 → **Storage** 分頁 → **Create Database** → 選 **Postgres**(免費方案)→ Create
3. 建好後按 **Connect Project**,把它連到這個專案——Vercel 會自動幫你加上一批環境變數(`POSTGRES_PRISMA_URL`、`POSTGRES_URL_NON_POOLING` 等),密碼都幫你存好了,不用自己找
4. 到專案 **Settings → Environment Variables**,把剛剛自動加好的兩個值複製貼成我們程式要用的名字:
   - 找到 `POSTGRES_PRISMA_URL` 那一列,把它的值複製起來,新增一筆 Key 填 `DATABASE_URL`,Value 貼上
   - 找到 `POSTGRES_URL_NON_POOLING` 那一列,把它的值複製起來,新增一筆 Key 填 `DIRECT_URL`,Value 貼上
   (Environment 三個都打勾)

## 第 3 步:填環境變數

專案頁 → **Settings → Environment Variables**,逐筆新增(Environment 全選):

| 名稱 | 值 |
|---|---|
| `AUTH_SECRET` | 一串隨機文字(Claude 已幫你生成,見聊天訊息;或到 [generate-secret.vercel.app/32](https://generate-secret.vercel.app/32) 產一個) |
| `AUTH_URL` | 你的部署網址,例如 `https://healing-xxx.vercel.app`(第一次部署後到 Overview 看網址再回來填) |
| `APP_BASE_URL` | 同上,一樣填部署網址 |
| `AUTH_TRUST_HOST` | `true` |
| `DEMO_LOGIN` | `true` |
| `ADMIN_EMAILS` | `taiwanstore365@gmail.com`(你的店主 Gmail,可逗號加多個) |
| `PAYMENT_PROVIDER` | `mock` |
| `VIDEO_PROVIDER` | `mock` |

不用填任何 Google/LINE 金鑰——展示版靠「示範登入」就能完整體驗(登入頁輸入名稱即可,
要測後台就在 Email 欄填 `ADMIN_EMAILS` 裡的信箱)。

## 第 4 步:部署

1. 專案頁 → **Deployments** → 最新一筆右邊「⋯」→ **Redeploy**
2. 等 1–2 分鐘變成 Ready,點開網址
3. 到 **Settings → Environment Variables** 確認 `AUTH_URL`/`APP_BASE_URL` 已填成這個網址;若剛剛才補填,再 Redeploy 一次

## 第 5 步:載入示範內容

1. 打開你的網址,按右上「登入」→ 顯示名稱填「店主」、Email 填 `ADMIN_EMAILS` 裡的信箱 → 示範登入
2. 右上會出現「後台」→ 進入 `/admin`
3. 總覽頁右上按 **「一鍵載入示範課程資料」** → 首頁就有 2 個系列、4 堂課了

## 驗收清單

- [ ] 首頁、系列、課程頁正常,封面圖有顯示
- [ ] 示範登入成功;換另一個瀏覽器用同一個名稱登入,第一個會被登出(單一裝置)
- [ ] 買一堂課 → 假綠界付款頁 → 「模擬付款成功」→ 我的課程出現該課
- [ ] 觀看頁能播範例影片,畫面有你的帳號浮水印
- [ ] 買課送禮 → 拿到禮物碼 → 換一個示範帳號登入兌換成功
- [ ] 用店主 Email 示範登入,`/admin` 可進;換別的示範帳號則看到 404

## 常見問題

- **付款後結果頁一直轉**:確認 `APP_BASE_URL` 是部署網址(webhook 打回自己要用它),改完 Redeploy
- **影片播不出來**:展示版影片是內建範例片;若 403,重新整理讓播放器換新簽名連結
- **後台上傳影片**:展示版不會真的保存(雲端無持久磁碟),接 Cloudflare Stream 後才是真上傳
- **示範登入按鈕不見了**:檢查環境變數 `DEMO_LOGIN` 是不是被設成 `false`

## 之後想換成正式帳號登入(Google/LINE)

正式營運前,建議關掉示範登入、改用真帳號:

1. **Google**:[console.cloud.google.com](https://console.cloud.google.com) 建 OAuth 用戶端,
   重新導向 URI 填 `https://你的網址/api/auth/callback/google`,把用戶端 ID/密碼填入
   `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
2. **LINE**:[developers.line.biz](https://developers.line.biz) 建 LINE Login channel,
   Callback URL 填 `https://你的網址/api/auth/callback/line`,並申請 **email 權限**
   (OpenID Connect → Email address permission,需附畫面截圖審核),
   把 Channel ID / Channel secret 填入 `AUTH_LINE_ID` / `AUTH_LINE_SECRET`
3. 兩者填好後,把 `DEMO_LOGIN` 改成 `false` → Redeploy,登入頁就只剩正式登入方式
