import { randomBytes } from "node:crypto";

// 禮物碼產生(server-only:有 node:crypto 依賴)。
// 16 碼 Crockford Base32(避開易混淆的 I L O U);
// 格式化/正規化的純字串邏輯在 ./format(client 可用)。

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateGiftCode(): string {
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) out += ALPHABET[bytes[i] % 32];
  return out;
}

export { normalizeGiftCode, formatGiftCode, isValidGiftCodeFormat } from "./format";
