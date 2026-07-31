import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { getPaymentProvider, type CheckoutRedirect } from "@/lib/payments";
import { generateMerchantTradeNo } from "./orderNo";
import { generateGiftCode } from "@/lib/gifts/codes";

export type StartCheckoutResult =
  | { ok: true; redirect: CheckoutRedirect; orderNo: string }
  | { ok: false; error: string };

/** 建立單堂課程訂單(自購或送禮)並產生綠界跳轉表單 */
export async function startCoursePurchase(
  userId: string,
  courseId: string,
  opts: { gift: boolean; giftMessage?: string }
): Promise<StartCheckoutResult> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { series: true },
  });
  if (!course || !course.published) {
    return { ok: false, error: "課程不存在或未上架。" };
  }

  if (!opts.gift) {
    const owned = await prisma.entitlement.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (owned) return { ok: false, error: "您已擁有此課程,無需重複購買。" };
  }

  const orderNo = generateMerchantTradeNo("OD");
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNo,
        userId,
        kind: opts.gift ? "GIFT" : "PURCHASE",
        status: "PENDING",
        amountTwd: course.priceTwd,
        items: {
          create: {
            itemKind: "COURSE",
            courseId: course.id,
            seriesId: course.seriesId,
            titleSnapshot: course.title,
            unitPriceTwd: course.priceTwd,
          },
        },
      },
    });
    if (opts.gift) {
      await tx.giftCode.create({
        data: {
          code: generateGiftCode(),
          orderId: order.id,
          courseId: course.id,
          purchaserUserId: userId,
          status: "PENDING_PAYMENT",
          message: opts.giftMessage?.slice(0, 200) || null,
        },
      });
    }
  });

  const provider = getPaymentProvider();
  const redirect = await provider.createCheckout({
    merchantTradeNo: orderNo,
    amountTwd: course.priceTwd,
    itemName: course.title.slice(0, 100),
    tradeDesc: opts.gift ? "課程禮物" : "課程購買",
    returnUrl: `${env.APP_BASE_URL}/api/payments/ecpay/return`,
    clientBackUrl: `${env.APP_BASE_URL}/checkout/result/${orderNo}`,
  });
  return { ok: true, redirect, orderNo };
}

/** 建立系列訂閱訂單(定期定額)並產生綠界跳轉表單 */
export async function startSeriesSubscription(
  userId: string,
  seriesId: string
): Promise<StartCheckoutResult> {
  const series = await prisma.series.findUnique({ where: { id: seriesId } });
  if (!series || !series.published || !series.monthlyPriceTwd) {
    return { ok: false, error: "此系列不存在或未開放訂閱。" };
  }

  const existing = await prisma.subscription.findFirst({
    where: {
      userId,
      seriesId,
      status: { in: ["ACTIVE", "PAST_DUE"] },
      currentPeriodEnd: { gt: new Date() },
    },
  });
  if (existing) return { ok: false, error: "您已訂閱此系列。" };

  const orderNo = generateMerchantTradeNo("SB");
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNo,
        userId,
        kind: "SUBSCRIPTION_INIT",
        status: "PENDING",
        amountTwd: series.monthlyPriceTwd!,
        items: {
          create: {
            itemKind: "SUBSCRIPTION",
            seriesId: series.id,
            titleSnapshot: `${series.title}(月訂閱)`,
            unitPriceTwd: series.monthlyPriceTwd!,
          },
        },
      },
    });
    await tx.subscription.create({
      data: {
        userId,
        seriesId,
        status: "PENDING",
        initOrderId: order.id,
        gwPeriodTradeNo: orderNo,
      },
    });
  });

  const provider = getPaymentProvider();
  const redirect = await provider.createPeriodCheckout({
    merchantTradeNo: orderNo,
    amountTwd: series.monthlyPriceTwd,
    itemName: `${series.title}(月訂閱)`.slice(0, 100),
    tradeDesc: "系列訂閱",
    returnUrl: `${env.APP_BASE_URL}/api/payments/ecpay/return`,
    periodReturnUrl: `${env.APP_BASE_URL}/api/payments/ecpay/period-return`,
    clientBackUrl: `${env.APP_BASE_URL}/checkout/result/${orderNo}`,
    periodType: "M",
    frequency: 1,
    execTimes: 99,
  });
  return { ok: true, redirect, orderNo };
}
