import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/dal";
import CheckoutClient from "@/components/checkout/CheckoutClient";
import { createSubscriptionCheckout } from "../../actions";

export const metadata = { title: "訂閱" };

export default async function SubscribeCheckoutPage({
  params,
}: {
  params: { seriesSlug: string };
}) {
  await requireUser(`/checkout/subscribe/${params.seriesSlug}`);
  const series = await prisma.series.findUnique({
    where: { slug: params.seriesSlug },
  });
  if (!series || !series.published || !series.monthlyPriceTwd) notFound();

  const seriesId = series.id;

  async function submit() {
    "use server";
    return createSubscriptionCheckout(seriesId);
  }

  return (
    <div className="px-5 py-16">
      <CheckoutClient
        mode="subscription"
        demoMode={process.env.PAYMENT_PROVIDER !== "ecpay"}
        title={`訂閱:${series.title}`}
        subtitle="每月自動扣款(綠界定期定額),訂閱期間系列課程看到飽,可隨時取消。"
        amountTwd={series.monthlyPriceTwd}
        onSubmit={submit}
      />
    </div>
  );
}
