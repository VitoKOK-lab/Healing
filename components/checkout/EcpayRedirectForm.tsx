"use client";

import { useEffect, useRef } from "react";
import type { CheckoutRedirect } from "@/lib/payments/types";

// 綠界標準跳轉模式:渲染隱藏欄位表單並自動送出(mock 與真綠界皆同)。
export default function EcpayRedirectForm({ redirect }: { redirect: CheckoutRedirect }) {
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    ref.current?.submit();
  }, []);

  return (
    <form ref={ref} method="POST" action={redirect.actionUrl}>
      {Object.entries(redirect.fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <p className="text-center text-sm text-inkdim">正在前往付款頁面⋯</p>
    </form>
  );
}
