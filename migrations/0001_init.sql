-- 喵喵占卜的資料表。2026-09-21 從 Supabase Postgres 搬到 Cloudflare D1。
--
-- 舊資料沒有搬——店主決定從空的開始。Supabase 那邊留著當備份沒有刪。
--
-- 兩個全站一致的存法(見 lib/db.ts):
--   ・時間一律存 ISO 8601 字串(2026-09-21T08:30:00.000Z),欄位宣告 TEXT。
--     不用 DATETIME 是因為 SQLite 根本沒有日期型別,DATETIME 只是數值親和性,
--     會試著把字串轉成數字。用 TEXT 才是它真正在做的事,而且字典序就是時間序。
--   ・布林存 0 / 1(SQLite 也沒有布林)。

-- 現場占卜結果圖的索引。圖片本體在 R2,key 就是 token。
-- 只留 24 小時——這是給現場客人當下掃走用的,不是相簿。
CREATE TABLE TarotShare (
  id        TEXT PRIMARY KEY,
  token     TEXT NOT NULL UNIQUE,
  mimeType  TEXT NOT NULL DEFAULT 'image/jpeg',
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL
);
CREATE INDEX TarotShare_expiresAt_idx ON TarotShare(expiresAt);

-- ── LINE OA 版 ────────────────────────────────────────────

-- LIFF 進站的客人,以 LINE userId 為身分。額度與連續簽到都掛在這裡。
CREATE TABLE TarotUser (
  id            TEXT PRIMARY KEY,
  lineUserId    TEXT NOT NULL UNIQUE,
  displayName   TEXT,
  birthday      TEXT,
  deepenCredits INTEGER NOT NULL DEFAULT 0,  -- 加深解讀額度(連七天簽到也發這個)
  streak        INTEGER NOT NULL DEFAULT 0,
  lastDailyDate TEXT,                        -- YYYY-MM-DD(台北時區),換日與斷簽判定用
  createdAt     TEXT NOT NULL
);

-- 一次占卜。抽牌當下就建立(status=drawn),生成完再補文本。
-- 牌面與 tier 在抽牌時就定死——同一副牌永遠同一個方向,事後不會變。
CREATE TABLE Reading (
  id        TEXT PRIMARY KEY,
  userId    TEXT NOT NULL REFERENCES TarotUser(id),
  level     TEXT NOT NULL,              -- daily | deepen | deep
  spreadId  TEXT NOT NULL,
  topic     TEXT,
  question  TEXT,
  cardsJson TEXT NOT NULL,              -- 抽到的牌,序列化
  tier      TEXT NOT NULL,              -- T1..T5
  seedNonce TEXT NOT NULL,              -- 伺服器亂數,同一筆可回溯重算
  status    TEXT NOT NULL DEFAULT 'drawn',  -- drawn | generated | fallback
  text      TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX Reading_userId_createdAt_idx ON Reading(userId, createdAt);

-- 付款訂單。providerTxId 設 UNIQUE,所以金流商重送通知天然不會重複入帳。
CREATE TABLE Purchase (
  id           TEXT PRIMARY KEY,
  userId       TEXT NOT NULL REFERENCES TarotUser(id),
  kind         TEXT NOT NULL,           -- deepen | deep
  amount       INTEGER NOT NULL,        -- TWD
  provider     TEXT NOT NULL,           -- linepay | mock
  providerTxId TEXT UNIQUE,
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | failed | refunded
  readingId    TEXT,
  createdAt    TEXT NOT NULL,
  paidAt       TEXT
);
CREATE INDEX Purchase_userId_createdAt_idx ON Purchase(userId, createdAt);

-- 免費日抽:一人一天一筆(台北時區)。
CREATE TABLE DailyDraw (
  id        TEXT PRIMARY KEY,
  userId    TEXT NOT NULL REFERENCES TarotUser(id),
  date      TEXT NOT NULL,              -- YYYY-MM-DD(台北)
  readingId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE(userId, date)
);

-- 78 張牌收集圖鑑:第一次抽到才寫入。
-- UNIQUE 讓重複抽到的牌用 INSERT OR IGNORE 安靜跳過(見 api/v2/draw)。
CREATE TABLE CardSeen (
  id          TEXT PRIMARY KEY,
  userId      TEXT NOT NULL REFERENCES TarotUser(id),
  cardN       INTEGER NOT NULL,
  firstSeenAt TEXT NOT NULL,
  UNIQUE(userId, cardN)
);

-- ── 使用狀況統計 ──────────────────────────────────────────
--
-- 店主的指示是「不要記是誰問的」。這張表的欄位就是那句話的實作:
--   ✗ 沒有 IP、沒有 User-Agent、沒有 cookie、沒有 session id
--   ✗ 沒有帳號可以對得起來
--   ✓ 只有:什麼時候、走到哪一步、選了哪個分類
--
-- 兩個 2026-08-23 追加的欄位要另外說明:
--
--   question —— 客人手動打的問題原文。店主要知道大家到底在問什麼。
--     這是整張表唯一「有可能認得出人」的東西(有人會寫「我跟阿明」
--     「我在 XX 公司」)。所以配套是硬的:只有 /admin 進得去,
--     而且 90 天自動刪除(lib/tarot/events.ts 的 sweep())。
--     2026-09-21 補記:Supabase 時代還有一層資料庫的 RLS,D1 沒有這個東西,
--     搬過來之後保護少了一層,只剩密碼與自動刪除。
--
--   visitor —— 瀏覽器本機產生的隨機字串,用來看「有沒有回來算第二次」。
--     它不是身分:不含姓名或裝置資訊,清瀏覽器資料就換一個,換裝置也是新的。
--     它回答得了「有多少人算過不只一次」,回答不了「這個人是誰」。
CREATE TABLE TarotEvent (
  id       TEXT PRIMARY KEY,
  at       TEXT NOT NULL,
  kind     TEXT NOT NULL,   -- 白名單見 lib/tarot/events.ts
  topic    TEXT,            -- love | career | money
  scenario TEXT,            -- 處境的標題(固定選項,不是客人自由輸入)
  tier     TEXT,            -- T1..T5
  wide     INTEGER,         -- 1=寬螢幕(店面) 0=窄螢幕(手機)
  detail   TEXT,            -- 每個 kind 自己的小標籤,例:confirm 的 yes / no
  question TEXT,            -- 客人打的原話。90 天自動刪除,說明見上面
  visitor  TEXT             -- 瀏覽器亂數代號,不是身分,說明見上面
);
CREATE INDEX TarotEvent_at_idx ON TarotEvent(at);
CREATE INDEX TarotEvent_kind_at_idx ON TarotEvent(kind, at);
CREATE INDEX TarotEvent_visitor_idx ON TarotEvent(visitor);
