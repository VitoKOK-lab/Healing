"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { cancelSubscription } from "@/lib/subscriptions/service";

/** 管理員取消訂閱(asAdmin,金流端解約 + 狀態改 CANCELED)。 */
export async function adminCancelSubscription(formData: FormData) {
  const admin = await requireAdmin();
  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  if (!subscriptionId) redirect("/admin/subscriptions?error=notfound");

  const result = await cancelSubscription(subscriptionId, admin.id, {
    asAdmin: true,
  });
  revalidatePath("/admin/subscriptions");
  if (!result.ok) {
    redirect(`/admin/subscriptions?error=${encodeURIComponent(result.error)}`);
  }
}
