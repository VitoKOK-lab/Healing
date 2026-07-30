import { requireUser } from "@/lib/auth/dal";
import RedeemForm from "@/components/gift/RedeemForm";

export const metadata = { title: "兌換禮物" };

export default async function GiftRedeemPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  await requireUser(
    `/gift/redeem${searchParams.code ? `?code=${searchParams.code}` : ""}`
  );

  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <p className="eyebrow">Gift</p>
      <h1 className="mt-3 font-serif-tc text-3xl font-semibold">兌換禮物</h1>
      <p className="mt-4 text-sm leading-6 text-inkdim">
        輸入您收到的禮物碼,課程將永久加入您目前登入的帳號。
        <br />
        每組禮物碼僅能由一位帳號兌換。
      </p>
      <RedeemForm initialCode={searchParams.code ?? ""} />
    </div>
  );
}
