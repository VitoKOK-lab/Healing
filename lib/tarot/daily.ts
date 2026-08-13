// 日抽與 streak(規格 §6 v1):「一天」以台北時區為準;
// 連續抽滿 7 天送一次免費加深解讀(deepenCredits +1),之後每滿 7 天再送。

export function taipeiDateString(now: Date = new Date()): string {
  // en-CA locale 的日期格式剛好是 YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// 由 YYYY-MM-DD 算前一天(直接對日期字串算,避免再過一次時區)
export function previousDateString(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d) - 86_400_000);
  return prev.toISOString().slice(0, 10);
}

// 今天抽牌後的 streak 狀態。純函數,好測。
// - 昨天有抽 → 連續 +1;昨天沒抽(或第一次)→ 重新從 1 起算
// - 每連滿 7 天 rewarded=true(呼叫端發一點 deepenCredits)
export function nextStreak(
  lastDailyDate: string | null,
  today: string,
  prevStreak: number
): { streak: number; rewarded: boolean } {
  const streak = lastDailyDate === previousDateString(today) ? prevStreak + 1 : 1;
  return { streak, rewarded: streak > 0 && streak % 7 === 0 };
}
