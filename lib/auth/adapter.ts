import type { Adapter, AdapterSession } from "@auth/core/adapters";
import { prisma } from "@/lib/prisma";

/**
 * 單一裝置登入:包裝 Auth.js 的 Prisma adapter,
 * 建立新 session 前先刪除該使用者的所有既有 session——
 * 新登入即踢掉其他裝置;被踢裝置的 token 解析不到 session,
 * requireUser() 會導回 /login?reason=session-replaced。
 */
export function singleSessionAdapter(base: Adapter): Adapter {
  return {
    ...base,
    async createSession(data: {
      sessionToken: string;
      userId: string;
      expires: Date;
    }): Promise<AdapterSession> {
      await prisma.session.deleteMany({ where: { userId: data.userId } });
      return base.createSession!(data);
    },
  };
}
