import { randomBytes } from "node:crypto";

// 禮物碼:16 碼 Crockford Base32(避開易混淆的 I L O U),
// 儲存不含連字號,顯示時以 XXXX-XXXX-XXXX-XXXX 呈現。

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateGiftCode(): string {
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) out += ALPHABET[bytes[i] % 32];
  return out;
}

/** 使用者輸入正規化:去空白/連字號、轉大寫、易混淆字元映射(O→0、I/L→1、U→V) */
export function normalizeGiftCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/I/g, "1")
    .replace(/L/g, "1")
    .replace(/U/g, "V");
}

export function formatGiftCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, "$1-");
}

export function isValidGiftCodeFormat(code: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{16}$/.test(code);
}
