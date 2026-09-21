import { getCloudflareContext } from "@opennextjs/cloudflare";

// D1 存取層。
//
// 2026-09-21:本來是用 Prisma 的,搬到 Cloudflare 之後拿掉了。原因不是
// Prisma 不好,是它在 Workers 上要塞一顆 3.2MB 的 WASM 查詢引擎——
// 而這個站總共 7 張表、查詢都很單純。為了保住既有寫法要付出的代價是:
// 3.2MB 的體積(Workers 免費方案上限才 3MB)、更慢的冷啟動,
// 以及跟兩套打包器打架(webpack 不認 .wasm?module、esbuild 解不到相對路徑)。
//
// D1 的原生介面就是 SQL,這一層只是把「拿 binding、綁參數、轉型」包起來。

export function db(): D1Database {
  const handle = getCloudflareContext().env.DB;
  if (!handle) {
    // 設定問題要立刻講清楚,不要變成一句沒頭沒尾的 undefined 錯誤
    throw new Error("找不到 D1 binding(env.DB)。檢查 wrangler.jsonc 的 d1_databases 設定。");
  }
  return handle;
}

type Param = string | number | null;

// ── 查詢 ────────────────────────────────────────────────

/** 取第一列,沒有就回 null。 */
export async function one<T>(sql: string, ...params: Param[]): Promise<T | null> {
  return db().prepare(sql).bind(...params).first<T>();
}

/** 取全部列。 */
export async function all<T>(sql: string, ...params: Param[]): Promise<T[]> {
  const r = await db().prepare(sql).bind(...params).all<T>();
  return r.results ?? [];
}

/** 取單一數字(COUNT、SUM⋯)。沒有結果時回 0,不回 null——呼叫端都是要拿來算的。 */
export async function num(sql: string, ...params: Param[]): Promise<number> {
  const v = await db().prepare(sql).bind(...params).first<number>();
  return typeof v === "number" ? v : 0;
}

/** 寫入。回傳影響了幾列。 */
export async function run(sql: string, ...params: Param[]): Promise<number> {
  const r = await db().prepare(sql).bind(...params).run();
  return r.meta?.changes ?? 0;
}

/** 一次送多句(D1 會一起送出,省往返)。 */
export async function batch(
  stmts: Array<{ sql: string; params?: Param[] }>
): Promise<void> {
  if (stmts.length === 0) return;
  const handle = db();
  await handle.batch(
    stmts.map((s) => handle.prepare(s.sql).bind(...(s.params ?? [])))
  );
}

// ── 型別轉換 ─────────────────────────────────────────────
//
// SQLite 沒有布林也沒有日期型別,所以進出都要自己轉。
// 規則只有一條、全站一致:
//   ・時間一律存 ISO 8601 字串(2026-09-21T08:30:00.000Z)
//     ——排序用字典序就正確,而且在 D1 主控台直接看得懂,
//     不像存毫秒數要自己心算。
//   ・布林存 0 / 1。

/** 現在時間,寫進資料庫用。 */
export function now(): string {
  return new Date().toISOString();
}

/** 幾天前的時間點,查「最近 N 天」用。 */
export function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

/** 資料庫讀出來的時間字串轉 Date。壞掉的值回 null 而不是 Invalid Date。 */
export function toDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 布林轉存檔用的 0/1;null 保持 null(欄位可以是「沒有這項資訊」)。 */
export function fromBool(v: boolean | null | undefined): number | null {
  return typeof v === "boolean" ? (v ? 1 : 0) : null;
}

/** 資料庫的 0/1 轉回布林;null 保持 null。 */
export function toBool(v: unknown): boolean | null {
  if (v === null || v === undefined) return null;
  return Boolean(v);
}

/**
 * 新的主鍵。
 *
 * Prisma 時代用 cuid,現在用 UUID——Workers 內建 crypto.randomUUID(),
 * 不必為了產 id 多帶一個套件。舊資料沒有搬過來,所以格式不一致的問題不存在。
 */
export function newId(): string {
  return crypto.randomUUID();
}
