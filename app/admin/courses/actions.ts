"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { isUniqueConflict } from "../_lib/utils";

// ── 課程 ─────────────────────────────────────────────

const courseSchema = z.object({
  title: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim(),
  seriesId: z.string().min(1),
  priceTwd: z.number().int().min(0),
  published: z.boolean(),
  sortOrder: z.number().int(),
});

function parseCourseForm(formData: FormData) {
  return courseSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: String(formData.get("description") ?? ""),
    seriesId: formData.get("seriesId"),
    priceTwd: Number(formData.get("priceTwd")),
    published: formData.get("published") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  });
}

export async function createCourse(formData: FormData) {
  await requireAdmin();
  const parsed = parseCourseForm(formData);
  if (!parsed.success) redirect("/admin/courses/new?error=invalid");

  let createdId = "";
  try {
    const created = await prisma.course.create({
      data: parsed.data,
      select: { id: true },
    });
    createdId = created.id;
  } catch (e) {
    if (isUniqueConflict(e)) redirect("/admin/courses/new?error=slug");
    throw e;
  }
  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${createdId}`);
}

export async function updateCourse(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/courses?error=notfound");

  const parsed = parseCourseForm(formData);
  if (!parsed.success) redirect(`/admin/courses/${id}?error=invalid`);

  try {
    await prisma.course.update({ where: { id }, data: parsed.data });
  } catch (e) {
    if (isUniqueConflict(e)) redirect(`/admin/courses/${id}?error=slug`);
    throw e;
  }
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${id}`);
  redirect(`/admin/courses/${id}`);
}

// ── 單元(Lesson)────────────────────────────────────

const lessonSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim(),
  sortOrder: z.number().int(),
  isFreePreview: z.boolean(),
});

export async function createLesson(formData: FormData) {
  await requireAdmin();
  const courseId = String(formData.get("courseId") ?? "");
  const parsed = lessonSchema.safeParse({
    courseId,
    title: formData.get("title"),
    description: String(formData.get("description") ?? ""),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
    isFreePreview: formData.get("isFreePreview") === "on",
  });
  if (!parsed.success) redirect(`/admin/courses/${courseId}?error=invalid`);

  const { description, ...rest } = parsed.data;
  await prisma.lesson.create({
    data: { ...rest, description: description || null },
  });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteLesson(formData: FormData) {
  await requireAdmin();
  const lessonId = String(formData.get("lessonId") ?? "");
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return;

  await prisma.lesson.delete({ where: { id: lessonId } });
  revalidatePath(`/admin/courses/${lesson.courseId}`);
}

/** 影片直傳完成後,把 VideoAsset 掛到單元上(client 端上傳流程最後一步呼叫) */
export async function attachVideoToLesson(lessonId: string, assetId: string) {
  await requireAdmin();

  const [lesson, asset] = await Promise.all([
    prisma.lesson.findUnique({ where: { id: lessonId } }),
    prisma.videoAsset.findUnique({ where: { id: assetId } }),
  ]);
  if (!lesson) return { ok: false as const, error: "找不到單元。" };
  if (!asset) return { ok: false as const, error: "找不到影片資產。" };

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { videoAssetId: assetId },
  });
  revalidatePath(`/admin/courses/${lesson.courseId}`);
  return { ok: true as const };
}
