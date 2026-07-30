import { prisma } from "@/lib/prisma";
import { resolveCourseAccess, type AccessResult } from "./access";

/** 判斷某使用者對某課程的觀看權(server 端唯一事實來源) */
export async function getCourseAccess(
  userId: string,
  courseId: string
): Promise<AccessResult> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { seriesId: true },
  });
  if (!course) return { hasAccess: false, reason: "none" };

  const [entitlement, subscription] = await Promise.all([
    prisma.entitlement.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { kind: true },
    }),
    prisma.subscription.findFirst({
      where: { userId, seriesId: course.seriesId },
      orderBy: { currentPeriodEnd: "desc" },
      select: { status: true, currentPeriodEnd: true },
    }),
  ]);

  return resolveCourseAccess({ entitlement, subscription, now: new Date() });
}

/** 我的課程:永久授權 + 訂閱期內系列課程(去重,附來源標籤) */
export async function listAccessibleCourses(userId: string) {
  const now = new Date();
  const [entitlements, subs] = await Promise.all([
    prisma.entitlement.findMany({
      where: { userId },
      include: { course: { include: { series: true } } },
    }),
    prisma.subscription.findMany({
      where: { userId, currentPeriodEnd: { gt: now } },
      include: { series: { include: { courses: { where: { published: true } } } } },
    }),
  ]);

  const byId = new Map<
    string,
    { course: (typeof entitlements)[number]["course"]; reason: string }
  >();
  for (const e of entitlements) {
    byId.set(e.courseId, {
      course: e.course,
      reason: e.kind === "GIFT" ? "gift" : "purchase",
    });
  }
  for (const s of subs) {
    if (!["ACTIVE", "PAST_DUE", "CANCELED"].includes(s.status)) continue;
    for (const c of s.series.courses) {
      if (!byId.has(c.id)) {
        byId.set(c.id, { course: { ...c, series: s.series }, reason: "subscription" });
      }
    }
  }
  return Array.from(byId.values());
}
