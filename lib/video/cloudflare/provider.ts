import { createSign } from "node:crypto";
import { env } from "@/lib/env";
import type { AssetStatus, DirectUpload, SignedPlayback, VideoProvider } from "../types";
import type { VideoStatus } from "@/lib/types";

// Cloudflare Stream provider(正式環境):
// - 影片一律 requireSignedURLs,播放用自簽 JWT(RS256,金鑰見 CF_STREAM_SIGNING_KEY_*)
// - 建立簽名金鑰:POST /accounts/{id}/stream/keys(一次性,存入環境變數)

const API = "https://api.cloudflare.com/client/v4";

function headers() {
  return {
    Authorization: `Bearer ${env.CF_STREAM_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signStreamToken(videoUid: string, expSec: number): string {
  const header = b64url(
    JSON.stringify({ alg: "RS256", kid: env.CF_STREAM_SIGNING_KEY_ID })
  );
  const payload = b64url(
    JSON.stringify({ sub: videoUid, kid: env.CF_STREAM_SIGNING_KEY_ID, exp: expSec, accessRules: [{ type: "any", action: "allow" }] })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  // 環境變數中的 PEM 以 \n 表示換行
  const pem = env.CF_STREAM_SIGNING_KEY_PEM.replace(/\\n/g, "\n");
  const signature = signer.sign(pem);
  return `${header}.${payload}.${b64url(signature)}`;
}

export const cloudflareVideoProvider: VideoProvider = {
  async createDirectUpload(): Promise<DirectUpload> {
    const res = await fetch(
      `${API}/accounts/${env.CF_ACCOUNT_ID}/stream/direct_upload`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          maxDurationSeconds: 3600 * 4,
          requireSignedURLs: true,
        }),
      }
    );
    const data = await res.json();
    if (!data?.success) {
      throw new Error(`Cloudflare direct_upload 失敗:${JSON.stringify(data?.errors)}`);
    }
    return { uploadUrl: data.result.uploadURL, providerAssetId: data.result.uid };
  },

  async getAssetStatus(uid: string): Promise<AssetStatus> {
    const res = await fetch(`${API}/accounts/${env.CF_ACCOUNT_ID}/stream/${uid}`, {
      headers: headers(),
    });
    const data = await res.json();
    if (!data?.success) return { status: "ERROR" };
    const state = data.result?.status?.state as string;
    const map: Record<string, VideoStatus> = {
      pendingupload: "UPLOADING",
      downloading: "PROCESSING",
      queued: "PROCESSING",
      inprogress: "PROCESSING",
      ready: "READY",
      error: "ERROR",
    };
    return {
      status: map[state] ?? "PROCESSING",
      durationSec: data.result?.duration
        ? Math.round(data.result.duration)
        : undefined,
      thumbnailUrl: data.result?.thumbnail,
    };
  },

  async getSignedPlayback(
    uid: string,
    opts: { ttlSeconds: number }
  ): Promise<SignedPlayback> {
    const exp = Math.floor(Date.now() / 1000) + opts.ttlSeconds;
    const token = signStreamToken(uid, exp);
    return {
      url: `https://customer-${env.CF_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${token}/manifest/video.m3u8`,
      isHls: true,
      expiresAt: new Date(exp * 1000),
    };
  },

  async deleteAsset(uid: string): Promise<void> {
    await fetch(`${API}/accounts/${env.CF_ACCOUNT_ID}/stream/${uid}`, {
      method: "DELETE",
      headers: headers(),
    });
  },
};
