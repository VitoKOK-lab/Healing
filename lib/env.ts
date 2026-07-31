import { z } from "zod";

// 環境變數合約:啟動時驗證一次,缺漏立即報錯而不是在深處炸開。
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(16),
  AUTH_GOOGLE_ID: z.string().optional().default(""),
  AUTH_GOOGLE_SECRET: z.string().optional().default(""),
  AUTH_LINE_ID: z.string().optional().default(""),
  AUTH_LINE_SECRET: z.string().optional().default(""),
  ADMIN_EMAILS: z.string().optional().default(""),
  // 示範登入(免 Google/LINE 金鑰,直接輸入名稱即可體驗全站功能)。正式上線前設為 "false" 關閉。
  DEMO_LOGIN: z.enum(["true", "false"]).default("true"),
  PAYMENT_PROVIDER: z.enum(["mock", "ecpay"]).default("mock"),
  ECPAY_MERCHANT_ID: z.string().optional().default(""),
  ECPAY_HASH_KEY: z.string().optional().default(""),
  ECPAY_HASH_IV: z.string().optional().default(""),
  ECPAY_BASE_URL: z
    .string()
    .optional()
    .default("https://payment-stage.ecpay.com.tw"),
  VIDEO_PROVIDER: z.enum(["mock", "cloudflare"]).default("mock"),
  CF_ACCOUNT_ID: z.string().optional().default(""),
  CF_STREAM_API_TOKEN: z.string().optional().default(""),
  CF_STREAM_SIGNING_KEY_ID: z.string().optional().default(""),
  CF_STREAM_SIGNING_KEY_PEM: z.string().optional().default(""),
  CF_STREAM_CUSTOMER_CODE: z.string().optional().default(""),
  // 塔羅 AI 占卜:Google AI Studio(aistudio.google.com/apikey)取得的 Gemini 金鑰,留空則該功能停用。
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().optional().default("gemini-flash-lite-latest"),
});

export const env = envSchema.parse(process.env);

export function assertProviderConfig(): void {
  if (env.PAYMENT_PROVIDER === "ecpay") {
    if (!env.ECPAY_MERCHANT_ID || !env.ECPAY_HASH_KEY || !env.ECPAY_HASH_IV) {
      throw new Error("PAYMENT_PROVIDER=ecpay 但缺少 ECPAY_MERCHANT_ID / ECPAY_HASH_KEY / ECPAY_HASH_IV");
    }
  }
  if (env.VIDEO_PROVIDER === "cloudflare") {
    if (
      !env.CF_ACCOUNT_ID ||
      !env.CF_STREAM_API_TOKEN ||
      !env.CF_STREAM_SIGNING_KEY_ID ||
      !env.CF_STREAM_SIGNING_KEY_PEM ||
      !env.CF_STREAM_CUSTOMER_CODE
    ) {
      throw new Error("VIDEO_PROVIDER=cloudflare 但 CF_* 設定不完整");
    }
  }
}
