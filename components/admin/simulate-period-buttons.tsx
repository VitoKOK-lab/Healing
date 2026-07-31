"use client";

// 開發工具(PAYMENT_PROVIDER=mock 才顯示):
// 對訂閱立即觸發「下一期扣款」模擬 webhook,測試續扣成功/失敗。

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SimulatePeriodButtons({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function simulate(outcome: "success" | "fail") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/mock-ecpay/simulate-period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, outcome }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "模擬扣款失敗");
      }
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "模擬扣款失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-inkdim">模擬下期扣款</span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void simulate("success")}
        className="rounded-full border border-goldline px-3 py-1 text-xs text-success transition hover:border-success disabled:pointer-events-none disabled:opacity-40"
      >
        成功
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void simulate("fail")}
        className="rounded-full border border-goldline px-3 py-1 text-xs text-danger transition hover:border-danger disabled:pointer-events-none disabled:opacity-40"
      >
        失敗
      </button>
      {message && <span className="text-xs text-danger">{message}</span>}
    </div>
  );
}
