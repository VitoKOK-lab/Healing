-- 占卜結果分享圖:現場掃 QR 把圖帶走用的暫存
CREATE TABLE "TarotShare" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "image" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TarotShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TarotShare_token_key" ON "TarotShare"("token");
CREATE INDEX "TarotShare_expiresAt_idx" ON "TarotShare"("expiresAt");
