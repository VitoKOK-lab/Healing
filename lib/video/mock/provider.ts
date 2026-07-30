import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { signMockPlayback } from "./sign";
import type { AssetStatus, DirectUpload, SignedPlayback, VideoProvider } from "../types";

// mock provider:影片實體 = public/dev-videos/sample.mp4(seed 的資產)
// 或 dev-uploads/<assetId>.mp4(後台上傳的檔案)。串流一律經
// /api/mock-video/[assetId] 驗簽端點,行為對齊 Cloudflare 簽名網址。

export const mockVideoProvider: VideoProvider = {
  async createDirectUpload(): Promise<DirectUpload> {
    const providerAssetId = `up-${randomBytes(8).toString("hex")}`;
    return {
      uploadUrl: `${env.APP_BASE_URL}/api/mock-video/upload/${providerAssetId}`,
      providerAssetId,
    };
  },

  async getAssetStatus(): Promise<AssetStatus> {
    // mock 上傳完成即 READY(無轉檔程序)
    return { status: "READY" };
  },

  async getSignedPlayback(
    providerAssetId: string,
    opts: { ttlSeconds: number }
  ): Promise<SignedPlayback> {
    const exp = Math.floor(Date.now() / 1000) + opts.ttlSeconds;
    const sig = signMockPlayback(providerAssetId, exp, env.AUTH_SECRET);
    return {
      url: `/api/mock-video/${encodeURIComponent(providerAssetId)}?exp=${exp}&sig=${sig}`,
      isHls: false,
      expiresAt: new Date(exp * 1000),
    };
  },

  async deleteAsset(): Promise<void> {
    // dev 環境不實際刪檔
  },
};
