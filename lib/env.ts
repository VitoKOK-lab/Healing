import { z } from "zod";

// 環境變數合約:啟動時驗證一次,缺漏立即報錯而不是在深處炸開。
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  // 對外公開的完整網址(share API 組取圖連結的絕對路徑用)
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  // 塔羅 AI 占卜:Google AI Studio(aistudio.google.com/apikey)取得的 Gemini 金鑰,留空則該功能停用。
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().optional().default("gemini-flash-lite-latest"),
});

export const env = envSchema.parse(process.env);
