import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/dal";
import { getCourseAccess } from "@/lib/entitlements/queries";
import { getVideoProvider } from "@/lib/video";

// 取得單元影片的簽名播放連結。授權在伺服器端逐次檢查:
// 免費試看單元放行,其餘需購買/受贈/訂閱中。TTL 取 max(2×片長, 1 小時),
// 避免長片中途 seek 時簽名過期。

export async function POST(
  _req: Request,
  { params }: { params: { lessonId: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    include: {
      videoAsset: true,
      course: { select: { id: true, published: true } },
    },
  });
  if (!lesson || !lesson.course.published) {
    return NextResponse.json({ error: "單元不存在" }, { status: 404 });
  }
  if (!lesson.videoAsset || lesson.videoAsset.status !== "READY") {
    return NextResponse.json({ error: "影片尚未就緒" }, { status: 409 });
  }

  if (!lesson.isFreePreview) {
    const access = await getCourseAccess(user.id, lesson.course.id);
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "您尚未擁有此課程的觀看權限" },
        { status: 403 }
      );
    }
  }

  const ttlSeconds = Math.max((lesson.videoAsset.durationSec ?? 0) * 2, 3600);
  const playback = await getVideoProvider().getSignedPlayback(
    lesson.videoAsset.providerAssetId,
    { ttlSeconds }
  );

  return NextResponse.json({
    url: playback.url,
    isHls: playback.isHls,
    expiresAt: playback.expiresAt.toISOString(),
    // 浮水印文字由伺服器決定,前端不可自訂
    watermark: `${user.email ?? user.name ?? "會員"} · ${user.id.slice(0, 8)}`,
  });
}
