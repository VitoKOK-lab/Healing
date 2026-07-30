import { NextRequest, NextResponse } from "next/server";
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

// mock 直傳端點:後台上傳影片檔到 dev-uploads/(僅管理員、僅 mock 模式)。
// 上傳完成即把 VideoAsset 標為 READY(mock 無轉檔)。

export async function PUT(
  req: NextRequest,
  { params }: { params: { assetId: string } }
) {
  if (env.VIDEO_PROVIDER !== "mock") {
    return new NextResponse("mock upload disabled", { status: 404 });
  }
  await requireAdmin();

  if (!/^up-[0-9a-f]{16}$/.test(params.assetId)) {
    return new NextResponse("bad asset id", { status: 400 });
  }
  if (!req.body) return new NextResponse("empty body", { status: 400 });

  const dir = path.join(process.cwd(), "dev-uploads");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${params.assetId}.mp4`);
  await pipeline(
    Readable.fromWeb(req.body as import("node:stream/web").ReadableStream),
    createWriteStream(file)
  );

  await prisma.videoAsset.updateMany({
    where: { provider: "mock", providerAssetId: params.assetId },
    data: { status: "READY" },
  });

  return NextResponse.json({ ok: true });
}
