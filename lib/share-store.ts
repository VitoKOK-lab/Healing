import { getCloudflareContext } from "@opennextjs/cloudflare";

// 現場占卜結果圖的存放處。
//
// 2026-09-21 從資料庫搬到 R2。理由很實際:一張結果圖 300KB 起跳、
// 上限 4MB,而 D1 是 SQLite、查詢結果要經 HTTP 傳回來。把幾 MB 的
// 二進位塞進去是誤用它。R2 本來就是放這種東西的地方,而且便宜很多。
//
// 圖在 R2 的 key 就是 token,所以不需要另外記路徑——
// 有 token 就找得到圖,沒 token 就誰也猜不到(16 bytes 亂數)。

export function shareBucket(): R2Bucket {
  const bucket = getCloudflareContext().env.SHARE_BUCKET;
  if (!bucket) {
    // 設定問題要立刻講清楚,不要變成一句沒頭沒尾的 undefined 錯誤
    throw new Error(
      "找不到 R2 binding(env.SHARE_BUCKET)。檢查 wrangler.jsonc 的 r2_buckets 設定。"
    );
  }
  return bucket;
}
