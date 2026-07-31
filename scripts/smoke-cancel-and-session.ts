// 煙霧測試:取消訂閱(保留至期滿)+ 單一裝置登入互踢。
// 用法:npx tsx --env-file=.env scripts/smoke-cancel-and-session.ts <subscriptionId>
import { PrismaClient } from "@prisma/client";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cancelSubscription } from "../lib/subscriptions/service";
import { singleSessionAdapter } from "../lib/auth/adapter";
import { resolveCourseAccess } from "../lib/entitlements/access";

const prisma = new PrismaClient();

async function main() {
  const [subId] = process.argv.slice(2);

  // 1) 取消訂閱:狀態 CANCELED,但期滿前仍可觀看
  const sub = await prisma.subscription.findUnique({ where: { id: subId } });
  if (!sub) throw new Error("no subscription");
  const result = await cancelSubscription(subId, sub.userId);
  const after = await prisma.subscription.findUnique({ where: { id: subId } });
  const access = resolveCourseAccess({
    entitlement: null,
    subscription: { status: after!.status, currentPeriodEnd: after!.currentPeriodEnd },
    now: new Date(),
  });
  console.log(
    `cancel: ${JSON.stringify(result)} → status=${after!.status}, ` +
      `periodEnd=${after!.currentPeriodEnd?.toISOString().slice(0, 10)}, ` +
      `stillHasAccess=${access.hasAccess}`
  );

  // 2) 單一裝置:同一使用者連續建立兩個 session,舊的必須被踢掉
  const user = await prisma.user.findUnique({ where: { email: "member@test.local" } });
  const adapter = singleSessionAdapter(PrismaAdapter(prisma));
  await adapter.createSession!({
    sessionToken: "device-A-token",
    userId: user!.id,
    expires: new Date(Date.now() + 86400000),
  });
  await adapter.createSession!({
    sessionToken: "device-B-token",
    userId: user!.id,
    expires: new Date(Date.now() + 86400000),
  });
  const sessions = await prisma.session.findMany({ where: { userId: user!.id } });
  console.log(
    `single-session: count=${sessions.length}, remaining=${sessions.map((s) => s.sessionToken).join(",")}`
  );
  if (sessions.length !== 1 || sessions[0].sessionToken !== "device-B-token") {
    throw new Error("single-session invariant broken!");
  }
  console.log("single-session: OK(舊裝置已被踢出)");
}

main().finally(() => prisma.$disconnect());
