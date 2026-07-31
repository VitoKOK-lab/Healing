"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { SERIES_CATEGORIES } from "@/lib/types";
import { isUniqueConflict } from "../_lib/utils";

const seriesSchema = z.object({
  title: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim(),
  category: z.enum(SERIES_CATEGORIES),
  monthlyPriceTwd: z.number().int().min(1).nullable(),
  published: z.boolean(),
  sortOrder: z.number().int(),
});

function parseSeriesForm(formData: FormData) {
  const priceRaw = String(formData.get("monthlyPriceTwd") ?? "").trim();
  return seriesSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: String(formData.get("description") ?? ""),
    category: formData.get("category"),
    monthlyPriceTwd: priceRaw === "" ? null : Number(priceRaw),
    published: formData.get("published") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  });
}

export async function createSeries(formData: FormData) {
  await requireAdmin();
  const parsed = parseSeriesForm(formData);
  if (!parsed.success) redirect("/admin/series/new?error=invalid");

  try {
    await prisma.series.create({ data: parsed.data });
  } catch (e) {
    if (isUniqueConflict(e)) redirect("/admin/series/new?error=slug");
    throw e;
  }
  revalidatePath("/admin/series");
  redirect("/admin/series");
}

export async function updateSeries(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/series?error=notfound");

  const parsed = parseSeriesForm(formData);
  if (!parsed.success) redirect(`/admin/series/${id}?error=invalid`);

  try {
    await prisma.series.update({ where: { id }, data: parsed.data });
  } catch (e) {
    if (isUniqueConflict(e)) redirect(`/admin/series/${id}?error=slug`);
    throw e;
  }
  revalidatePath("/admin/series");
  revalidatePath(`/admin/series/${id}`);
  redirect("/admin/series");
}
