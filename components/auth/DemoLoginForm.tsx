"use client";

import { useState, useTransition } from "react";
import { demoSignIn } from "@/lib/auth/demoLogin";

export default function DemoLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="w-full"
      action={(formData: FormData) =>
        startTransition(async () => {
          setError(null);
          const result = await demoSignIn(formData);
          if (result && !result.ok) setError(result.error);
        })
      }
    >
      <div className="grid gap-3 text-left">
        <label className="text-xs font-medium text-inkdim">
          顯示名稱
          <input
            name="name"
            required
            maxLength={40}
            placeholder="例如:小美"
            className="input mt-1.5"
          />
        </label>
        <label className="text-xs font-medium text-inkdim">
          Email(選填;要測試後台請填店主 Email)
          <input
            name="email"
            type="email"
            maxLength={80}
            placeholder="留空自動產生示範帳號"
            className="input mt-1.5"
          />
        </label>
      </div>
      {error && (
        <p className="mt-3 rounded-2xl bg-blush px-4 py-2.5 text-xs text-plum">{error}</p>
      )}
      <button className="btn-primary mt-4 w-full" disabled={pending}>
        {pending ? "登入中⋯" : "示範登入"}
      </button>
    </form>
  );
}
