"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { seedDemoContent } from "@/lib/seed-demo";

/** 一鍵載入示範課程資料(idempotent,重複按不會重複建立) */
export async function loadDemoContent(): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  try {
    const message = await seedDemoContent(prisma);
    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/series");
    return { ok: true, message };
  } catch (e) {
    return { ok: false, message: `載入失敗:${e instanceof Error ? e.message : String(e)}` };
  }
}
