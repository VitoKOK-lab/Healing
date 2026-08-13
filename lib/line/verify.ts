import { env } from "@/lib/env";

// LIFF access token → LINE userId。
// 真驗證走 LINE 官方兩步:verify(確認 token 有效且屬於我們的 channel)→ profile(拿 userId)。
// 開發與測試環境設 LINE_STUB=1,token 格式 "stub:<userId>" 直接放行——
// 不用真的開 LIFF 也能跑整條 API。

export type LineIdentity = { userId: string; displayName?: string };

export async function verifyLineToken(accessToken: string): Promise<LineIdentity | null> {
  if (!accessToken) return null;

  if (env.LINE_STUB === "1" && accessToken.startsWith("stub:")) {
    const userId = accessToken.slice(5);
    return userId ? { userId } : null;
  }

  // 1) token 是否有效、是否為我們 channel 簽發
  const verifyRes = await fetch(
    `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!verifyRes.ok) return null;
  const verify = (await verifyRes.json()) as { client_id?: string; expires_in?: number };
  if (env.LINE_CHANNEL_ID && verify.client_id !== env.LINE_CHANNEL_ID) return null;
  if (!verify.expires_in || verify.expires_in <= 0) return null;

  // 2) 拿 userId(與顯示名稱,存 DB 供店主後台辨識用;不會送去生成模型)
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) return null;
  const profile = (await profileRes.json()) as { userId?: string; displayName?: string };
  if (!profile.userId) return null;
  return { userId: profile.userId, displayName: profile.displayName };
}
