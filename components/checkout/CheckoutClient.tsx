"use client";

import { useState, useTransition } from "react";
import type { CheckoutRedirect } from "@/lib/payments/types";
import EcpayRedirectForm from "./EcpayRedirectForm";
import { formatTwd } from "@/lib/types";

interface Props {
  mode: "course" | "subscription";
  gift?: boolean;
  title: string;
  subtitle: string;
  amountTwd: number;
  onSubmit: (giftMessage?: string) => Promise<
    { ok: true; redirect: CheckoutRedirect; orderNo: string } | { ok: false; error: string }
  >;
}

export default function CheckoutClient({ mode, gift, title, subtitle, amountTwd, onSubmit }: Props) {
  const [redirect, setRedirect] = useState<CheckoutRedirect | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  if (redirect) return <EcpayRedirectForm redirect={redirect} />;

  return (
    <div className="card mx-auto max-w-lg p-10">
      <p className="eyebrow">{gift ? "Gift" : mode === "subscription" ? "Subscribe" : "Checkout"}</p>
      <h1 className="mt-3 font-serif-tc text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-inkdim">{subtitle}</p>

      <div className="num mt-6 text-3xl">
        {formatTwd(amountTwd)}
        {mode === "subscription" && <span className="text-base text-inkdim"> /月</span>}
      </div>

      {gift && (
        <label className="mt-6 block text-sm">
          <span className="text-inkdim">禮物留言(選填,兌換時對方會看到)</span>
          <textarea
            className="input mt-2 h-24 resize-none"
            maxLength={200}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="願這份課程,陪你度過每個需要安靜的時刻。"
          />
        </label>
      )}

      {gift && (
        <p className="mt-4 rounded-sm bg-blush px-4 py-3 text-xs leading-5 text-inkdim">
          付款完成後會產生一組專屬禮物碼,您可以透過 LINE 或任何方式傳給對方;
          對方登入後兌換,課程將永久綁定其帳號(僅限一人兌換)。
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        className="btn-primary mt-8 w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await onSubmit(gift ? message : undefined);
            if (result.ok) setRedirect(result.redirect);
            else setError(result.error);
          })
        }
      >
        {pending ? "處理中⋯" : "前往綠界付款"}
      </button>
      <p className="mt-4 text-center text-xs text-inkdim">
        付款由綠界科技 ECPay 處理,本站不留存您的卡號。
      </p>
    </div>
  );
}
