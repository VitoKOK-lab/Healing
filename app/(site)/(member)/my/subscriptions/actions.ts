"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { cancelSubscription } from "@/lib/subscriptions/service";

export async function cancelMySubscription(subscriptionId: string) {
  const user = await requireUser("/my/subscriptions");
  const result = await cancelSubscription(subscriptionId, user.id);
  revalidatePath("/my/subscriptions");
  return result;
}
