import { z } from "zod";

// 環境變數合約:啟動時驗證一次,缺漏立即報錯而不是在深處炸開。
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  // 對外公開的完整網址(share API 組取圖連結的絕對路徑用)
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),

  // ── 舊塔羅站(site-static/tarot)仍在用的 Gemini,LIFF 版穩定後退場 ──

  // ── LINE OA v1(規格 §4、§5)──────────────────────────
  // 免費日抽的生成供應商:claude | kimi(Moonshot API,省成本)。
  // 只管免費層——付費層(deepen/deep)在 generate.ts 寫死用 Claude,
  // 不受這個變數影響(Kimi 關閉思考模式後複雜牌陣格式遵守率不到五成,
  // 不適合收錢場合)。
  MODEL_PROVIDER: z.enum(["claude", "kimi"]).default("claude"),
  // Claude API 金鑰(console.anthropic.com);留空則解讀走本地降級文案
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  ANTHROPIC_MODEL_FREE: z.string().optional().default("claude-haiku-4-5"),
  ANTHROPIC_MODEL_PAID: z.string().optional().default("claude-sonnet-5"),
  // Kimi/Moonshot(platform.kimi.ai);免費/付費層共用同一顆模型
  // 統計頁的密碼。沒設就等於整頁關閉(不是「沒有密碼可以進」)。
  ADMIN_PASSWORD: z.string().optional().default(""),
  KIMI_API_KEY: z.string().optional().default(""),
  KIMI_MODEL: z.string().optional().default("kimi-k2.6"),
  KIMI_BASE_URL: z.string().url().default("https://api.moonshot.ai/v1"),
  // 深度占卜定價(TWD)。NT$20 加深與免費日抽不在此;見規格 §1
  PRICE_DEEP: z.coerce.number().int().positive().default(149),
  // LINE Login channel ID(LIFF 的 token 驗證用);LINE_STUB=1 時跳過真驗證(開發/測試)
  LINE_CHANNEL_ID: z.string().optional().default(""),
  LINE_STUB: z.enum(["0", "1"]).optional().default("0"),
});

export const env = envSchema.parse(process.env);
