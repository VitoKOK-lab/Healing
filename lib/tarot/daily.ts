// 日抽的「一天」以台北時區為準(規格 §6 v1)。
// streak 完整邏輯(斷簽、連七送加深)在 P4;這裡先提供換日基準。

export function taipeiDateString(now: Date = new Date()): string {
  // en-CA locale 的日期格式剛好是 YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
