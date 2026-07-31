import { createHmac, timingSafeEqual } from "node:crypto";

// mock 影片的「簽名連結」:HMAC-SHA256(assetId + exp, AUTH_SECRET)。
// 形狀與語意(短效期、不可竄改)對齊真實 signed URL,串流端點會驗證。

export function signMockPlayback(
  assetId: string,
  expiresAtSec: number,
  secret: string
): string {
  return createHmac("sha256", secret)
    .update(`${assetId}:${expiresAtSec}`)
    .digest("hex");
}

export function verifyMockPlayback(
  assetId: string,
  expiresAtSec: number,
  sig: string,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000)
): boolean {
  if (!Number.isFinite(expiresAtSec) || expiresAtSec < nowSec) return false;
  const expected = signMockPlayback(assetId, expiresAtSec, secret);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig || "", "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
