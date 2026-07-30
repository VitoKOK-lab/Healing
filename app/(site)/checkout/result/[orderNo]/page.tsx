import { requireUser } from "@/lib/auth/dal";
import ResultPoller from "@/components/checkout/ResultPoller";

export const metadata = { title: "付款結果" };

// 不信任瀏覽器返回(ClientBackURL 不帶結果):此頁輪詢訂單狀態,
// 由 webhook 寫入的 DB 狀態為唯一事實來源。

export default async function CheckoutResultPage({
  params,
}: {
  params: { orderNo: string };
}) {
  await requireUser(`/checkout/result/${params.orderNo}`);
  return (
    <div className="px-5 py-24">
      <ResultPoller orderNo={params.orderNo} />
    </div>
  );
}
