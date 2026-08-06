# TAHIR ZAINAB TAROT

Jessica 解憂商店的塔羅占卜,已經從課程站切出來獨立成一站。
整包放在這個資料夾底下,不依賴課程站的任何樣式或腳本。

## 兩個版面

| 檔案 | 誰在用 | 差別 |
|---|---|---|
| `index.html` | 客人自己的手機 | 直式單欄、計次(抽完三次要加購)、沒有 QR |
| `desk.html` | 店主現場的電腦／iPad | 橫式左右並排、不計次、有「傳給客人 · QR」 |

兩頁**共用同一份流程引擎**(`assets/tarot-engine.js`),也共用同一套
元件樣式(`assets/tarot.css`)。差異靠 `<body data-mode="desk|phone">`
與各自的版面樣式表處理。改流程只要改引擎那一支,不會兩邊不同步。

## 檔案

```
index.html            手機版(客人)
desk.html             桌機版(店主)
assets/
  base.css            設計代幣、重置、按鈕/卡片/輸入框
  tarot.css           占卜元件(對話框、牌面、洗牌、切牌、解讀、寶石、QR、等待畫面)
  mobile.css          手機版面
  desk.css            桌機版面
  tarot-engine.js     流程引擎(兩個版面共用)
  tarot-data.js       牌庫、牌陣、額度、音效
  gem-data.js         寶石庫存與推薦邏輯
  tarot-report.js     把結果畫成一張可下載的圖
  cards/              78 張牌面(jpg + webp)
  videos/             等待、進場、洗牌、唱歌
  audio/              背景音樂
  stones/             寶石實拍照(有就用,沒有就用 CSS 畫的)
```

## 後端

四支 API 仍然由同一個 Next.js 專案提供,同網域所以不必處理 CORS:

- `POST /api/tarot/reading` — 產生解讀
- `POST /api/tarot/clarify` — 本喵沒聽懂時的追問
- `POST /api/tarot/share` — 存結果圖,回傳 QR(24 小時後自動刪除)
- `GET  /api/tarot/share/<token>` — 取回結果圖
- `GET  /r/<token>` — 客人掃 QR 之後看到的那一頁

## 還留在課程站的東西

`../checkout/tarot.html`(加購 3 次)還在課程站,因為它共用課程站的
付款表單與樣式。它會載入這裡的 `assets/tarot-data.js` 來加額度——
額度存在 localStorage,同網域讀寫,兩邊看到的是同一份。

## 舊網址

`/tarot.html` 與 `/tarot-desktop.html` 留著當轉址頁,先前印出去、
傳出去的連結不會死掉。

## 直式影片

等待與進場影片目前用的還是橫式那兩支,靠 `object-fit: cover` 填滿直式
畫面(左右會被裁掉)。直式版本進來之後,把 `index.html` 裡註解標好的
那兩行檔名換掉即可;洗牌影片則是改 `tarot-engine.js` 裡 `SHUFFLE.portrait`。
