-- 店主追加:記客人手動打的問題原文,以及「有沒有回來算第二次」。
--
-- question 是這張表裡唯一可能認得出人的東西,所以它跟著 90 天自動刪除
-- (lib/tarot/events.ts 的 sweep())。visitor 是瀏覽器本機的隨機字串,
-- 不是身分——清瀏覽器資料或換裝置就是新的。
ALTER TABLE "TarotEvent" ADD COLUMN "question" TEXT;
ALTER TABLE "TarotEvent" ADD COLUMN "visitor" TEXT;

CREATE INDEX "TarotEvent_visitor_idx" ON "TarotEvent"("visitor");
