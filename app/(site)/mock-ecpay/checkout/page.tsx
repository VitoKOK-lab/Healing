import { formatTwd } from "@/lib/types";

export const metadata = { title: "綠界付款(模擬)" };

// 假綠界付款頁:僅開發用。按鈕把結果 POST 給 /api/mock-ecpay/pay,
// 由伺服器模擬綠界背景 webhook 後再把瀏覽器帶回商店。

export default function MockEcpayCheckoutPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const amount = Number(searchParams.TotalAmount ?? 0);
  const fields = {
    MerchantTradeNo: searchParams.MerchantTradeNo ?? "",
    TotalAmount: searchParams.TotalAmount ?? "",
    ReturnURL: searchParams.ReturnURL ?? "",
    ClientBackURL: searchParams.ClientBackURL ?? "",
    PeriodType: searchParams.PeriodType ?? "",
    PeriodAmount: searchParams.PeriodAmount ?? "",
  };

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <div className="rounded-lg border-2 border-[#00a651]/30 bg-white p-8 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-[#00a651]">綠界科技 ECPay</span>
          <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">
            模擬環境
          </span>
        </div>
        <hr className="my-5" />
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-inkdim">商品</dt>
            <dd className="max-w-[60%] text-right">{searchParams.ItemName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-inkdim">訂單編號</dt>
            <dd className="num">{fields.MerchantTradeNo}</dd>
          </div>
          {fields.PeriodType && (
            <div className="flex justify-between">
              <dt className="text-inkdim">扣款方式</dt>
              <dd>每月定期定額 {formatTwd(Number(fields.PeriodAmount || amount))}</dd>
            </div>
          )}
          <div className="flex justify-between border-t pt-3 text-base">
            <dt>應付金額</dt>
            <dd className="num font-bold text-[#00a651]">{formatTwd(amount)}</dd>
          </div>
        </dl>

        <form method="POST" action="/api/mock-ecpay/pay" className="mt-8 space-y-3">
          {Object.entries(fields).map(([k, v]) =>
            v ? <input key={k} type="hidden" name={k} value={v} /> : null
          )}
          <button
            name="outcome"
            value="success"
            className="w-full rounded bg-[#00a651] py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            模擬付款成功
          </button>
          <button
            name="outcome"
            value="fail"
            className="w-full rounded border border-red-300 py-3 text-sm text-red-500 transition hover:bg-red-50"
          >
            模擬付款失敗
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-inkdim">
          此頁面僅在 PAYMENT_PROVIDER=mock 時存在,上線後由真正的綠界付款頁取代。
        </p>
      </div>
    </div>
  );
}
