"use server";

import { requireUser } from "@/lib/auth/dal";
import { redeemGiftCode, type RedeemResult } from "@/lib/gifts/service";

export async function redeemGiftAction(code: string): Promise<RedeemResult> {
  const user = await requireUser("/gift/redeem");
  return redeemGiftCode(code, user.id);
}
