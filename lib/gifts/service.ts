import { prisma } from "@/lib/prisma";
import { normalizeGiftCode, isValidGiftCodeFormat } from "./codes";

export type RedeemResult =
  | { ok: true; courseId: string; courseTitle: string }
  | { ok: false; error: string };

/**
 * 兌換禮物碼:單次使用的原子性靠 updateMany 條件搶佔
 * (status 仍為 ACTIVE 才搶得到,count===1 即為唯一贏家;SQLite/Postgres 皆安全)。
 */
export async function redeemGiftCode(
  rawCode: string,
  userId: string
): Promise<RedeemResult> {
  const code = normalizeGiftCode(rawCode);
  if (!isValidGiftCodeFormat(code)) {
    return { ok: false, error: "禮物碼格式不正確,請確認後再試一次。" };
  }

  const gift = await prisma.giftCode.findUnique({
    where: { code },
    include: { order: false },
  });
  if (!gift) return { ok: false, error: "找不到這組禮物碼,請確認輸入是否正確。" };
  if (gift.status === "REDEEMED")
    return { ok: false, error: "這組禮物碼已被兌換過了。" };
  if (gift.status === "VOID") return { ok: false, error: "這組禮物碼已失效。" };
  if (gift.status === "PENDING_PAYMENT")
    return { ok: false, error: "這組禮物碼的訂單尚未完成付款。" };

  const course = await prisma.course.findUnique({
    where: { id: gift.courseId },
    select: { id: true, title: true },
  });
  if (!course) return { ok: false, error: "此禮物對應的課程已下架。" };

  // 先確認收禮人尚未擁有該課(擁有則不消耗禮物碼,可轉贈他人)
  const existing = await prisma.entitlement.findUnique({
    where: { userId_courseId: { userId, courseId: gift.courseId } },
  });
  if (existing) {
    return {
      ok: false,
      error: "您已擁有此課程,禮物碼未被使用,可轉贈給其他人。",
    };
  }

  const now = new Date();
  const claimed = await prisma.giftCode.updateMany({
    where: { code, status: "ACTIVE" },
    data: { status: "REDEEMED", redeemedByUserId: userId, redeemedAt: now },
  });
  if (claimed.count !== 1) {
    return { ok: false, error: "這組禮物碼剛剛已被兌換,晚了一步。" };
  }

  try {
    await prisma.entitlement.create({
      data: {
        userId,
        courseId: gift.courseId,
        kind: "GIFT",
        sourceGiftCodeId: gift.id,
      },
    });
  } catch (e) {
    // 極端競態(同帳號同時兌換+購買):把碼還原為可用,避免白白燒掉
    await prisma.giftCode.updateMany({
      where: { code, status: "REDEEMED", redeemedByUserId: userId },
      data: { status: "ACTIVE", redeemedByUserId: null, redeemedAt: null },
    });
    return { ok: false, error: "您已擁有此課程,禮物碼未被使用。" };
  }

  return { ok: true, courseId: course.id, courseTitle: course.title };
}
