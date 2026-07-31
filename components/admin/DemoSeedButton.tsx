"use client";

import { useState, useTransition } from "react";
import { loadDemoContent } from "@/app/admin/actions";

export default function DemoSeedButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        className="btn-secondary !px-5 !py-2 text-xs"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await loadDemoContent();
            setMessage(result.message);
          })
        }
      >
        {pending ? "載入中⋯" : "一鍵載入示範課程資料"}
      </button>
      {message && <p className="text-xs text-inkdim">{message}</p>}
    </div>
  );
}
