import { describe, expect, it } from "vitest";
import {
  dotNetUrlEncode,
  generateCheckMacValue,
  verifyCheckMacValue,
} from "@/lib/payments/ecpay/checkMacValue";

// 綠界官方文件的完整範例(developers.ecpay.com.tw/?p=2902,EncryptType=1/SHA256):
const DOC_HASH_KEY = "pwFHCqoQZGmho4w6";
const DOC_HASH_IV = "EkRm7iFT261dpevs";

const docExampleParams: Record<string, string> = {
  MerchantID: "3002607",
  MerchantTradeNo: "ecpay20230312153023",
  MerchantTradeDate: "2023/03/12 15:30:23",
  PaymentType: "aio",
  TotalAmount: "30000",
  TradeDesc: "促銷方案",
  ItemName: "Apple iphone 15",
  ReturnURL: "https://www.ecpay.com.tw/receive.php",
  ChoosePayment: "ALL",
  EncryptType: "1",
};

describe("dotNetUrlEncode", () => {
  it("空格轉為 +", () => {
    expect(dotNetUrlEncode("a b")).toBe("a+b");
  });
  it(".NET 不編碼的七個符號原樣保留", () => {
    expect(dotNetUrlEncode("-_.!*()")).toBe("-_.!*()");
  });
  it("其餘保留字仍會編碼", () => {
    expect(dotNetUrlEncode("a=b&c/d")).toBe("a%3Db%26c%2Fd");
    expect(dotNetUrlEncode("網")).toBe("%E7%B6%B2");
  });
});

describe("generateCheckMacValue", () => {
  it("符合綠界官方文件範例值", () => {
    // 官方文件對上述參數計算出的 CheckMacValue
    expect(
      generateCheckMacValue(docExampleParams, DOC_HASH_KEY, DOC_HASH_IV)
    ).toBe("6C51C9E6888DE861FD62FB1DD17029FC742634498FD813DC43D4243B5685B840");
  });

  it("剔除傳入的 CheckMacValue 欄位後計算", () => {
    const withMac = { ...docExampleParams, CheckMacValue: "GARBAGE" };
    expect(generateCheckMacValue(withMac, DOC_HASH_KEY, DOC_HASH_IV)).toBe(
      generateCheckMacValue(docExampleParams, DOC_HASH_KEY, DOC_HASH_IV)
    );
  });

  it("鍵名排序不分大小寫(A→Z)", () => {
    const shuffled = Object.fromEntries(Object.entries(docExampleParams).reverse());
    expect(generateCheckMacValue(shuffled, DOC_HASH_KEY, DOC_HASH_IV)).toBe(
      generateCheckMacValue(docExampleParams, DOC_HASH_KEY, DOC_HASH_IV)
    );
  });
});

describe("verifyCheckMacValue", () => {
  it("round-trip:自己簽的自己驗得過", () => {
    const mac = generateCheckMacValue(docExampleParams, DOC_HASH_KEY, DOC_HASH_IV);
    expect(
      verifyCheckMacValue(
        { ...docExampleParams, CheckMacValue: mac },
        DOC_HASH_KEY,
        DOC_HASH_IV
      )
    ).toBe(true);
  });
  it("篡改金額後驗證失敗", () => {
    const mac = generateCheckMacValue(docExampleParams, DOC_HASH_KEY, DOC_HASH_IV);
    expect(
      verifyCheckMacValue(
        { ...docExampleParams, TotalAmount: "1", CheckMacValue: mac },
        DOC_HASH_KEY,
        DOC_HASH_IV
      )
    ).toBe(false);
  });
  it("缺 CheckMacValue 欄位直接失敗", () => {
    expect(verifyCheckMacValue(docExampleParams, DOC_HASH_KEY, DOC_HASH_IV)).toBe(false);
  });
});
