import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext 把 `next build` 的產出包成一個 Worker。
// 這裡刻意保持空設定:沒有用 ISR、沒有 "use cache",不需要快取後端。
// 這個站的動態部分全是 API 路由(每次都要真的跑),靜態部分走 assets。
export default defineCloudflareConfig();
