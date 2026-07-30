// 管理員 = ADMIN_EMAILS 環境變數白名單(逗號分隔)。
// 每次呼叫都重讀環境值,不信任 session 裡的快照。

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
