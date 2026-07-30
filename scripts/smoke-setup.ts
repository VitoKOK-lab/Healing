// 煙霧測試前置:建立測試會員/管理員與 session(僅開發環境使用)。
// 用法:npx tsx --env-file=.env scripts/smoke-setup.ts
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

async function ensureUserWithSession(email: string, name: string) {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name },
  });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      sessionToken: token,
      userId: user.id,
      expires: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    },
  });
  return { userId: user.id, token };
}

async function main() {
  const member = await ensureUserWithSession("member@test.local", "測試會員");
  const member2 = await ensureUserWithSession("friend@test.local", "收禮朋友");
  const admin = await ensureUserWithSession(
    process.env.ADMIN_EMAILS?.split(",")[0]?.trim() || "admin@test.local",
    "店主"
  );
  console.log(
    JSON.stringify({ member, member2, admin }, null, 0)
  );
}

main().finally(() => prisma.$disconnect());
