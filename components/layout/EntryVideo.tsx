"use client";

import { useCallback, useState } from "react";

export default function EntryVideo() {
  const [leaving, setLeaving] = useState(false);
  const [visible, setVisible] = useState(true);

  const finish = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 350);
  }, [leaving]);

  if (!visible) return null;

  return (
    <section
      className={`entry-video-overlay ${leaving ? "entry-video-overlay--leaving" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="播放網站進入動畫，點一下可跳過"
      onClick={finish}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") finish();
      }}
    >
      <video
        className="entry-video"
        src="/assets/videos/entry-animation.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
      />
      <span className="entry-video-skip">點一下跳過</span>
    </section>
  );
}
