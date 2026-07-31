// 禮物碼格式化/正規化(純字串邏輯,無 node 依賴——client 端也會用到)。

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
