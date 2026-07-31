import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/dal";
import { getVideoProvider } from "@/lib/video";
import { prisma } from "@/lib/prisma";

// 後台「重新整理影片狀態」:向 provider 查詢轉檔進度並回寫 DB。

export async function POST(
  _req: Request,
  { params }: { params: { assetId: string } }
) {
  await requireAdmin();

  const asset = await prisma.videoAsset.findUnique({
    where: { id: params.assetId },
  });
  if (!asset) return NextResponse.json({ error: "not found" }, { status: 404 });

  const status = await getVideoProvider().getAssetStatus(asset.providerAssetId);
  const updated = await prisma.videoAsset.update({
    where: { id: asset.id },
    data: {
      status: status.status,
      durationSec: status.durationSec ?? asset.durationSec,
      thumbnailUrl: status.thumbnailUrl ?? asset.thumbnailUrl,
    },
  });
  return NextResponse.json({ status: updated.status, durationSec: updated.durationSec });
}
