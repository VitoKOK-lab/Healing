// 煙霧測試:建立訂單並輸出綠界跳轉欄位(模擬結帳第一步)。
// 用法:npx tsx --env-file=.env scripts/smoke-checkout.ts <userEmail> <course|gift|subscribe> <slug>
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [email, mode, slug] = process.argv.slice(2);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`no user ${email}`);

  const { startCoursePurchase, startSeriesSubscription } = await import(
    "../lib/orders/create"
  );

  let result;
  if (mode === "subscribe") {
    const series = await prisma.series.findUnique({ where: { slug } });
    if (!series) throw new Error(`no series ${slug}`);
    result = await startSeriesSubscription(user.id, series.id);
  } else {
    const course = await prisma.course.findUnique({ where: { slug } });
    if (!course) throw new Error(`no course ${slug}`);
    result = await startCoursePurchase(user.id, course.id, {
      gift: mode === "gift",
      giftMessage: mode === "gift" ? "祝你天天好運" : undefined,
    });
  }
  console.log(JSON.stringify(result));
}

main().finally(() => prisma.$disconnect());
