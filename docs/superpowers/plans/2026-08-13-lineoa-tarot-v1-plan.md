# LINE OA 喵喵占卜 v1 — 實作計畫

> 依 `../specs/2026-08-13-lineoa-tarot-design.md` 拆解。
> 原則:每階段結束時 build 綠、測試綠、可獨立合併;外部依賴(LINE Pay 商家、LIFF channel)
> 全部先以 mock/stub 頂住,店主的申請下來即插即用。

## 階段總覽與依賴

```
P1 核心引擎(deck 吉凶分 + tier)────┐
P2 審核管線(guards + direction)──┤→ P3 API v2(draw/reading/credits)
                                  │        ↓
P4 日抽/streak/圖鑑(DB 邏輯)────┘→ P5 LIFF 前端(移植+接新 API)
                                           ↓
P6 特效分級 → P7 分享卡 → P8 金流(LINE Pay mock 先行)→ P9 整合驗收
```

## P1 核心引擎

1. `package.json` 加回 `vitest`,`npm run test` 可跑(空測試綠)
2. `prisma/schema.prisma` 新增 `User`(lineUserId unique)、`Reading`(牌面 JSON、tier、層級、文本、狀態)、`Purchase`、`DailyDraw`(date、streak)、`CardSeen`;`prisma migrate dev` 產 migration
3. `lib/tarot/deck.ts`:78 張牌資料移植自 `site-static/tarot/assets/tarot-data.js`,每張加 `score: { upright: number, reversed: number }`(-2~+2,依牌義標定);純資料無邏輯
4. `lib/tarot/draw.ts`:`makeRng(seed)` 與洗牌移植成 TS 純函數;種子由伺服器以 `crypto` 混合客端切牌手勢產生
5. `lib/tarot/tier.ts`:`tierOf(cards, spreadId): T1..T5`
   - 加權:大牌 ×1.5、位置權重表(終點類位置 ×1.4、過去類 ×0.8)
   - 門檻用分位數常數(見 6),同副牌恆同 tier
6. `scripts/calibrate-tier.ts`:蒙地卡羅 10 萬次,輸出加權分的分位數 → 把 T1..T5 門檻常數寫死進 `tier.ts`,使 T4+T5 ≈ 34%(±3%)
7. `__tests__/tier.test.ts`:固定牌組 → 固定 tier;分布測試(1 萬次抽樣落在目標區間);全逆位不會是 T1、全太陽類正位不會是 T5

**驗收**:`npm test` 綠;`npx tsx scripts/calibrate-tier.ts` 印出的分布 T4+T5 在 31–37%。

## P2 審核管線

1. `lib/tarot/guards.ts`:規格 §4.1 的 1–7 條逐條實作為 `check(text, level): Violation[]`;
   罐頭句/降溫套話清單、「阿德勒/納瓦爾/心理學」、標點、語尾助詞(付費層)、逐張報牌句型、四段結構
2. `lib/tarot/direction.ts`:`classifyDirection(text): -1|0|1`(呼叫 Haiku,JSON 輸出);`verifyDirection(text, tier)` T4/T5 專用
3. `__tests__/guards.test.ts`:每條規則正反例各至少一例

**驗收**:測試綠;guards 為純函數(direction 以注入的 client 呼叫,測試用 fake)。

## P3 API v2

1. `lib/env.ts` 加 `ANTHROPIC_API_KEY`、`ANTHROPIC_MODEL_FREE`(haiku)、`ANTHROPIC_MODEL_PAID`(sonnet)、`PRICE_DEEP`(預設 149)
2. `lib/tarot/prompts.ts`:免費短評(本喵型)與付費四段式(收斂型)兩套 prompt;方向鎖定句;歷史摘要注入
3. `lib/tarot/generate.ts`:生成 → guards → 不合格重生成一次(換切入角度)→ T4/T5 跑 direction → 全敗走本地降級文案;去識別化在此層保證(單測驗證請求體無 userId/暱稱)
4. `app/api/v2/draw/route.ts`:POST {liffToken, spreadId?, gesture} → 驗 LINE token → 伺服器抽牌+tier → 存 `Reading(pending)` → 回牌面(不含解讀)
5. `app/api/v2/reading/route.ts`:POST {readingId} → 依層級與付款狀態走生成管線 → 回文本
6. `app/api/v2/credits/route.ts`:GET 額度/streak/圖鑑計數
7. LINE token 驗證:`lib/line/verify.ts`(打 LINE verify API;開發模式 `LINE_STUB=1` 直接回測試 userId)

**驗收**:`next build` 綠;本機 curl 走通 draw→reading(LINE_STUB + 假 ANTHROPIC key 走降級路徑)。

## P4 日抽 / streak / 圖鑑

1. `lib/tarot/daily.ts`:每日一次判定(台北時區換日)、streak 計算(斷簽歸零、連 7 送一次加深)、`CardSeen` upsert
2. draw API 整合:免費日抽走單張、標記新牌
3. `__tests__/daily.test.ts`:跨日、斷簽、連七、時區邊界(23:59/00:01)

## P5 LIFF 前端

1. `app/liff/page.tsx` 起步:載 LIFF SDK(`LINE_STUB` 時跳過)、拿 token
2. 移植 `site-static/tarot/index.html` 的流程編排為模組化 JS(對話框、主題選單、洗牌切牌、翻牌),素材路徑沿用 `site-static/tarot/assets/`
3. 抽牌改接 `/api/v2/draw`(送手勢,收牌面);解讀接 `/api/v2/reading`
4. 新頁:圖鑑(78 格點亮)、streak 顯示
5. 日抽結果頁掛 NT$20 升級入口(P8 前先顯示「即將開放」)

**驗收**:Playwright 走通「進站→日抽→看短評→開圖鑑」(LINE_STUB 模式)。

## P6 特效分級

`assets` 加 `fx.css` + `fx.js`:L1 金暈星塵(大牌)、L2 全螢幕光爆+貓撲+`navigator.vibrate`(五張關鍵牌)、初遇揭幕、T1 撒花。全 CSS/SVG,無外部庫。逐級 Playwright 截圖人工確認。

## P7 分享卡

`lib/tarot/share-card.ts`:直式 1080×1920 canvas 合成(牌面+一句話+QR 到 LINE OA);沿用既有 `TarotShare` 存圖回 QR 的模式或直接前端 canvas 下載+LINE share。

## P8 金流(LINE Pay)

1. `lib/payments/linepay/provider.ts` + `mock/provider.ts`(介面仿舊 ECPay 模式:request/confirm/webhook)
2. `app/api/v2/payments/linepay/{request,confirm}/route.ts`;`Purchase` 入帳 → 解鎖 reading 或加額度
3. 商家金鑰未下來前 `PAYMENT_PROVIDER=mock`:假付款頁一鍵成功/失敗,全流程可測
4. `__tests__/payments.test.ts`:入帳冪等(webhook 重送不重複加值)、金額竄改拒絕

## P9 整合驗收

- 20 組牌面生成品質人工審核(五級各 4,T3/T5 重點;通過率 ≥85%、T4/T5 中性化 ≤20%)
- Playwright 全流程:日抽→NT$20(mock 付款)→四段式;深度占卜(mock 付款)→牌陣→長文
- 部署 Vercel 後 curl 驗證;現有 `/tarot/index.html`、`/tarot/desk.html` 不受影響(回歸)

## 店主前置作業(平行進行,不擋 P1–P7)

- LINE Developers:開 LIFF channel(拿 liffId)+ Messaging API channel(推播用)
- LINE Pay 商家申請(審核期最長,先送)
- Vercel 環境變數:`ANTHROPIC_API_KEY`(Claude API 金鑰)
