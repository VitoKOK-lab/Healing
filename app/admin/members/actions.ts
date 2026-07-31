"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

/** 強制登出:清除該會員所有 session(裝置)。 */
export async function forceLogoutMember(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  await prisma.session.deleteMany({ where: { userId } });
  revalidatePath(`/admin/members/${userId}`);
}
