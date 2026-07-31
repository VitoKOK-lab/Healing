"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/lib/gifts/lifecycle";
import type { GiftCodeStatus } from "@/lib/types";

/** 作廢禮物碼(僅 ACTIVE 可作廢;狀態機檢查用 assertTransition)。 */
export async function voidGiftCode(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("giftCodeId") ?? "");
  const gift = await prisma.giftCode.findUnique({ where: { id } });
  if (!gift) redirect("/admin/gifts?error=notfound");

  try {
    assertTransition(gift.status as GiftCodeStatus, "VOID");
  } catch {
    redirect("/admin/gifts?error=transition");
  }

  await prisma.giftCode.update({
    where: { id: gift.id },
    data: { status: "VOID" },
  });
  revalidatePath("/admin/gifts");
}
