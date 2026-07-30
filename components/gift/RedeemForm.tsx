"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { redeemGiftAction } from "@/app/(site)/(member)/gift/redeem/actions";

export default function RedeemForm({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [successTitle, setSuccessTitle] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (successTitle) {
    return (
      <div className="card mt-10 p-10">
        <p className="font-serif-tc text-xl font-semibold text-gold">兌換成功</p>
        <p className="mt-3 text-sm text-inkdim">
          「{successTitle}」已加入您的課程,祝您有段美好的療癒時光。
        </p>
        <Link href="/my/courses" className="btn-primary mt-8 w-full">
          前往我的課程
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <input
        className="input num text-center text-lg tracking-[0.2em]"
        placeholder="XXXX-XXXX-XXXX-XXXX"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={23}
        autoComplete="off"
      />
      {error && (
        <p className="mt-4 rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      <button
        className="btn-primary mt-6 w-full"
        disabled={pending || code.trim().length === 0}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await redeemGiftAction(code);
            if (result.ok) setSuccessTitle(result.courseTitle);
            else setError(result.error);
          })
        }
      >
        {pending ? "兌換中⋯" : "兌換"}
      </button>
    </div>
  );
}
