-- 使用狀況統計。刻意不存任何可以追溯到人的欄位:
-- 沒有 IP、沒有 User-Agent、沒有 session 識別碼、沒有客人打的問題內容。
CREATE TABLE "TarotEvent" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "topic" TEXT,
    "scenario" TEXT,
    "tier" TEXT,
    "wide" BOOLEAN,
    "detail" TEXT,

    CONSTRAINT "TarotEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TarotEvent_at_idx" ON "TarotEvent"("at");
CREATE INDEX "TarotEvent_kind_at_idx" ON "TarotEvent"("kind", "at");

-- 跟其他表一致:開 RLS。只有伺服器端用 service role 連線,前端碰不到。
ALTER TABLE "TarotEvent" ENABLE ROW LEVEL SECURITY;
