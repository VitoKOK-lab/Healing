// 煙霧測試:禮物碼兌換(單次使用驗證)。
// 用法:npx tsx --env-file=.env scripts/smoke-redeem.ts <code> <email>
import { PrismaClient } from "@prisma/client";
import { redeemGiftCode } from "../lib/gifts/service";

const prisma = new PrismaClient();

async function main() {
  const [code, email] = process.argv.slice(2);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`no user ${email}`);
  console.log("first redeem:", JSON.stringify(await redeemGiftCode(code, user.id)));
  console.log("second redeem:", JSON.stringify(await redeemGiftCode(code, user.id)));
  const ents = await prisma.entitlement.findMany({ where: { userId: user.id } });
  console.log(`entitlements: ${ents.length}`, ents.map((e) => e.kind).join(","));
}

main().finally(() => prisma.$disconnect());
