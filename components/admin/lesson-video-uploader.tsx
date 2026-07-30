"use client";

// 單元影片直傳:
// 1. POST /api/admin/videos/direct-upload 取得 { assetId, uploadUrl }
// 2. 把選取的檔案 PUT 到 uploadUrl(mock provider 收原始 bytes)
// 3. 呼叫 server action attachVideoToLesson 把 assetId 掛上單元
// 另提供「重新整理狀態」按鈕打 refresh API 更新轉檔狀態。

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { attachVideoToLesson } from "@/app/admin/courses/actions";

export function LessonVideoUploader({
  lessonId,
  assetId,
}: {
  lessonId: string;
  assetId: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/videos/direct-upload", {
        method: "POST",
      });
      if (!res.ok) throw new Error("取得上傳位址失敗");
      const { assetId: newAssetId, uploadUrl } = (await res.json()) as {
        assetId: string;
        uploadUrl: string;
      };

      const put = await fetch(uploadUrl, { method: "PUT", body: file });
      if (!put.ok) throw new Error("影片上傳失敗");

      const attach = await attachVideoToLesson(lessonId, newAssetId);
      if (!attach.ok) throw new Error(attach.error);

      setMessage("上傳完成");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "上傳失敗,請重試");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function refreshStatus() {
    if (!assetId) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/videos/${assetId}/refresh`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("查詢影片狀態失敗");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "查詢失敗,請重試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="rounded-full border border-goldline bg-paper px-3.5 py-1.5 text-xs text-ink transition hover:border-gold hover:text-gold disabled:pointer-events-none disabled:opacity-40"
      >
        {busy ? "處理中…" : assetId ? "更換影片" : "上傳影片"}
      </button>
      {assetId && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void refreshStatus()}
          className="rounded-full border border-hairline bg-paper px-3.5 py-1.5 text-xs text-inkdim transition hover:border-gold hover:text-gold disabled:pointer-events-none disabled:opacity-40"
        >
          重新整理狀態
        </button>
      )}
      {message && <span className="text-xs text-inkdim">{message}</span>}
    </div>
  );
}
