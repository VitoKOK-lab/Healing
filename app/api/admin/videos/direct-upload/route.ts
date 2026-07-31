import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/dal";
import { getVideoProvider } from "@/lib/video";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

// 後台索取影片直傳 URL:建立 VideoAsset(UPLOADING)並回傳上傳位址。
// mock = 本站 PUT 端點;cloudflare = CF Stream direct_upload(requireSignedURLs)。

export async function POST() {
  await requireAdmin();

  const upload = await getVideoProvider().createDirectUpload();
  const asset = await prisma.videoAsset.create({
    data: {
      provider: env.VIDEO_PROVIDER,
      providerAssetId: upload.providerAssetId,
      status: "UPLOADING",
    },
  });

  return NextResponse.json({
    assetId: asset.id,
    uploadUrl: upload.uploadUrl,
    provider: env.VIDEO_PROVIDER,
  });
}
