"use server";

import { requireUser } from "@/lib/auth/dal";
import {
  startCoursePurchase,
  startSeriesSubscription,
  type StartCheckoutResult,
} from "@/lib/orders/create";

export async function createCourseCheckout(
  courseId: string,
  gift: boolean,
  giftMessage?: string
): Promise<StartCheckoutResult> {
  const user = await requireUser("/series");
  return startCoursePurchase(user.id, courseId, { gift, giftMessage });
}

export async function createSubscriptionCheckout(
  seriesId: string
): Promise<StartCheckoutResult> {
  const user = await requireUser("/series");
  return startSeriesSubscription(user.id, seriesId);
}
