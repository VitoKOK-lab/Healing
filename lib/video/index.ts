import { env } from "@/lib/env";
import type { VideoProvider } from "./types";
import { mockVideoProvider } from "./mock/provider";
import { cloudflareVideoProvider } from "./cloudflare/provider";

export function getVideoProvider(): VideoProvider {
  return env.VIDEO_PROVIDER === "cloudflare"
    ? cloudflareVideoProvider
    : mockVideoProvider;
}

export * from "./types";
