"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WatermarkOverlay from "./WatermarkOverlay";

// 播放器:向播放 API 取「簽名短效連結」後播放(HLS 用 hls.js,mock 為 mp4 直連)。
// 防護(嚇阻級):簽名連結+伺服器逐次授權、觀看者浮水印、禁右鍵/下載/子母畫面。
// 簽名快到期或播放出錯時自動重新取得新連結。

interface PlaybackData {
  url: string;
  isHls: boolean;
  expiresAt: string;
  watermark: string;
}

export default function VideoPlayer({ lessonId }: { lessonId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy(): void } | null>(null);
  const [data, setData] = useState<PlaybackData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/playback`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "無法取得播放權限");
        return;
      }
      setData(json);
    } catch {
      setError("連線失敗,請重試");
    }
  }, [lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !data) return;

    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (data.isHls) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = data.url; // Safari 原生 HLS
      } else {
        import("hls.js").then(({ default: Hls }) => {
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(data.url);
            hls.attachMedia(video);
            hlsRef.current = hls;
          }
        });
      }
    } else {
      video.src = data.url;
    }

    // 簽名到期前 5 分鐘自動換新連結(避免長片中途 seek 失效)
    const msLeft = new Date(data.expiresAt).getTime() - Date.now() - 5 * 60 * 1000;
    const refresh = setTimeout(() => load(), Math.max(msLeft, 30_000));
    return () => {
      clearTimeout(refresh);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [data, load]);

  if (error) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg bg-ink text-center">
        <p className="text-sm text-white/80">{error}</p>
        <button onClick={load} className="btn-secondary mt-4 !border-white/30 !bg-transparent !text-white">
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg bg-ink"
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        className="aspect-video w-full"
        controls
        playsInline
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onError={() => {
          // 簽名過期等播放錯誤:嘗試換新連結
          if (data) load();
        }}
      />
      {data && <WatermarkOverlay text={data.watermark} />}
    </div>
  );
}
