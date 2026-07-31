"use client";

import { useEffect, useState } from "react";

// 動態觀看者浮水印:半透明顯示帳號識別,每 20–40 秒隨機移動位置,
// 使外流影像無法以固定裁切去除,可追溯到觀看帳號。
// pointer-events-none:不影響播放操作。文字內容由伺服器(播放 API)決定。

const ZONES = [
  { top: "8%", left: "6%" },
  { top: "8%", right: "8%" },
  { top: "42%", left: "12%" },
  { top: "38%", right: "14%" },
  { bottom: "14%", left: "8%" },
  { bottom: "10%", right: "6%" },
  { top: "60%", left: "40%" },
  { bottom: "30%", right: "30%" },
] as const;

export default function WatermarkOverlay({ text }: { text: string }) {
  const [zoneIndex, setZoneIndex] = useState(0);
  const [clock, setClock] = useState("");

  useEffect(() => {
    setZoneIndex(Math.floor(Math.random() * ZONES.length));
    let timer: ReturnType<typeof setTimeout>;
    const move = () => {
      setZoneIndex((prev) => {
        let next = Math.floor(Math.random() * ZONES.length);
        if (next === prev) next = (next + 1) % ZONES.length;
        return next;
      });
      timer = setTimeout(move, 20000 + Math.random() * 20000);
    };
    timer = setTimeout(move, 20000 + Math.random() * 20000);

    const tick = setInterval(() => {
      const d = new Date();
      setClock(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
      );
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, []);

  const zone = ZONES[zoneIndex];

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none overflow-hidden">
      <span
        className="absolute whitespace-nowrap text-[11px] tracking-wider text-white/40 transition-all duration-1000"
        style={{ ...zone, textShadow: "0 0 4px rgba(0,0,0,0.5)" }}
      >
        {text}
        {clock && ` · ${clock}`}
      </span>
    </div>
  );
}
