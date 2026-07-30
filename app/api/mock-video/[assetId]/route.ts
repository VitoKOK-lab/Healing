import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { env } from "@/lib/env";
import { verifyMockPlayback } from "@/lib/video/mock/sign";

// mock 簽名串流端點:驗 HMAC 簽名與效期後以 Range 支援串流本機 mp4。
// 行為對齊 Cloudflare 簽名網址——沒有有效簽名一律 403。

function resolveFile(assetId: string): string | null {
  const uploads = path.join(process.cwd(), "dev-uploads", `${assetId}.mp4`);
  if (existsSync(uploads)) return uploads;
  // seed 的範例資產(sample-*)共用同一支示範影片
  const sample = path.join(process.cwd(), "public", "dev-videos", "sample.mp4");
  if (assetId.startsWith("sample") && existsSync(sample)) return sample;
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { assetId: string } }
) {
  const assetId = params.assetId;
  const exp = Number(req.nextUrl.searchParams.get("exp"));
  const sig = req.nextUrl.searchParams.get("sig") ?? "";

  if (!verifyMockPlayback(assetId, exp, sig, env.AUTH_SECRET)) {
    return new NextResponse("簽名無效或已過期", { status: 403 });
  }

  const file = resolveFile(assetId);
  if (!file) return new NextResponse("not found", { status: 404 });

  const size = statSync(file).size;
  const range = req.headers.get("range");
  const common = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  } as Record<string, string>;

  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    const start = m ? Number(m[1]) : 0;
    const end = m && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    const stream = createReadStream(file, { start, end });
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        ...common,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = createReadStream(file);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: { ...common, "Content-Length": String(size) },
  });
}
