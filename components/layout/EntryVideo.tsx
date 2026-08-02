"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function EntryVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [visible, setVisible] = useState(true);
  const [needsTap, setNeedsTap] = useState(false);

  const finish = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 350);
  }, [leaving]);

  const attemptPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.ended) return;

    // iOS 與部分 App 內建瀏覽器必須同時看到 muted property 與 attribute，
    // 才會允許直式影片自動播放。
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    void video.play().then(
      () => setNeedsTap(false),
      () => setNeedsTap(true)
    );
  }, []);

  useEffect(() => {
    const resumeWhenVisible = () => {
      if (document.visibilityState === "visible") attemptPlay();
    };

    attemptPlay();
    window.addEventListener("pageshow", attemptPlay);
    document.addEventListener("visibilitychange", resumeWhenVisible);
    return () => {
      window.removeEventListener("pageshow", attemptPlay);
      document.removeEventListener("visibilitychange", resumeWhenVisible);
    };
  }, [attemptPlay]);

  if (!visible) return null;

  return (
    <section
      className={`entry-video-overlay ${leaving ? "entry-video-overlay--leaving" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="播放網站進入動畫，點一下可跳過"
      onClick={() => (needsTap ? attemptPlay() : finish())}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          needsTap ? attemptPlay() : finish();
        }
      }}
    >
      <video
        ref={videoRef}
        className="entry-video"
        src="/assets/videos/entry-animation.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onCanPlay={attemptPlay}
        onPlaying={() => setNeedsTap(false)}
        onEnded={finish}
        onError={finish}
      />
      <span className="entry-video-skip">
        {needsTap ? "點一下播放" : "點一下跳過"}
      </span>
    </section>
  );
}
