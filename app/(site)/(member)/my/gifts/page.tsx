import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { formatGiftCode } from "@/lib/gifts/codes";
import { GIFT_CODE_STATUS_LABEL, type GiftCodeStatus } from "@/lib/types";
import CopyButton from "@/components/ui/CopyButton";

export const metadata = { title: "我的禮物" };

export default async function MyGiftsPage() {
  const user = await requireUser("/my/gifts");
  const gifts = await prisma.giftCode.findMany({
    where: { purchaserUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      redeemedBy: { select: { name: true, email: true } },
    },
  });
  const courses = await prisma.course.findMany({
    where: { id: { in: gifts.map((g) => g.courseId) } },
    select: { id: true, title: true },
  });
  const courseTitle = new Map(courses.map((c) => [c.id, c.title]));

  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <p className="eyebrow">Gifts</p>
      <h1 className="mt-3 font-serif-tc text-3xl font-semibold">我的禮物</h1>
      <p className="mt-3 text-sm text-inkdim">
        您購買的每份禮物都有一組專屬禮物碼,僅限一人兌換;把禮物碼或兌換連結傳給對方即可。
      </p>

      {gifts.length === 0 ? (
        <p className="mt-10 text-sm text-inkdim">還沒有送出過禮物。</p>
      ) : (
        <div className="mt-10 space-y-5">
          {gifts.map((g) => {
            const link = `${env.APP_BASE_URL}/gift/redeem?code=${g.code}`;
            return (
              <div key={g.id} className="card p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif-tc text-lg font-semibold">
                      {courseTitle.get(g.courseId) ?? "課程"}
                    </h2>
                    <p className="mt-1 text-xs text-inkdim">
                      {g.createdAt.toLocaleDateString("zh-Hant-TW")}
                      {g.status === "REDEEMED" &&
                        g.redeemedBy &&
                        `·已由 ${g.redeemedBy.name ?? g.redeemedBy.email ?? "對方"} 兌換`}
                    </p>
                  </div>
                  <span
                    className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs ${
                      g.status === "ACTIVE"
                        ? "border-goldline text-gold"
                        : g.status === "REDEEMED"
                          ? "border-hairline text-success"
                          : "border-hairline text-inkdim"
                    }`}
                  >
                    {GIFT_CODE_STATUS_LABEL[g.status as GiftCodeStatus] ?? g.status}
                  </span>
                </div>
                {g.status === "ACTIVE" && (
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="num flex-1 select-all rounded-sm border border-goldline bg-blush px-4 py-2.5 text-sm tracking-widest">
                        {formatGiftCode(g.code)}
                      </code>
                      <CopyButton text={formatGiftCode(g.code)} label="複製禮物碼" />
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="num flex-1 select-all truncate rounded-sm bg-mist px-4 py-2.5 text-xs">
                        {link}
                      </code>
                      <CopyButton text={link} label="複製連結" />
                    </div>
                  </div>
                )}
                {g.message && (
                  <p className="mt-4 border-l-2 border-goldline pl-4 text-sm italic text-inkdim">
                    {g.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
