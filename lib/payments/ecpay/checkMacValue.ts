import { createHash } from "node:crypto";

// 綠界 CheckMacValue(EncryptType=1, SHA256)。
// 這裡的編碼規則是綠界整合最常出錯的地方:必須模擬 .NET HttpUtility.UrlEncode 的行為
// (空格→+、特定七個符號不編碼),再全字串轉小寫後做 SHA256、輸出大寫。

/** 模擬 .NET UrlEncode:先標準 encodeURIComponent,再還原 .NET 不編碼的字元,空格用 + */
export function dotNetUrlEncode(input: string): string {
  return encodeURIComponent(input)
    .replace(/%20/g, "+")
    .replace(/%2D/gi, "-")
    .replace(/%5F/gi, "_")
    .replace(/%2E/gi, ".")
    .replace(/%21/gi, "!")
    .replace(/%2A/gi, "*")
    .replace(/%28/gi, "(")
    .replace(/%29/gi, ")");
}

/** 依綠界規則計算 CheckMacValue(params 內若含 CheckMacValue 會先剔除) */
export function generateCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIV: string
): string {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== "CheckMacValue")
    .sort((a, b) =>
      a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0
    );
  const query = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");
  const raw = `HashKey=${hashKey}&${query}&HashIV=${hashIV}`;
  const encoded = dotNetUrlEncode(raw).toLowerCase();
  return createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

/** 驗證 webhook / 表單回傳的 CheckMacValue */
export function verifyCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIV: string
): boolean {
  const received = params["CheckMacValue"];
  if (!received) return false;
  const expected = generateCheckMacValue(params, hashKey, hashIV);
  return received.toUpperCase() === expected;
}
