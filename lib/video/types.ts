import type { VideoStatus } from "@/lib/types";

// 影片供應商抽象:mock(本機檔案+HMAC 簽名)與 Cloudflare Stream(signed URL)同介面。

export interface DirectUpload {
  uploadUrl: string;
  /** provider 端資產 ID(CF Stream UID 或 mock 檔名鍵) */
  providerAssetId: string;
}

export interface AssetStatus {
  status: VideoStatus;
  durationSec?: number;
  thumbnailUrl?: string;
}

export interface SignedPlayback {
  /** HLS manifest 或可直接播放的 URL */
  url: string;
  /** mp4 直連(mock 用;HLS 環境為 undefined) */
  isHls: boolean;
  expiresAt: Date;
}

export interface VideoProvider {
  createDirectUpload(): Promise<DirectUpload>;
  getAssetStatus(providerAssetId: string): Promise<AssetStatus>;
  getSignedPlayback(
    providerAssetId: string,
    opts: { ttlSeconds: number }
  ): Promise<SignedPlayback>;
  deleteAsset(providerAssetId: string): Promise<void>;
}
