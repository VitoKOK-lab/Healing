"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatGiftCode } from "@/lib/gifts/format";

interface OrderStatus {
  orderNo: string;
  status: string;
  kind: string;
  amountTwd: number;
  giftCode: string | null;
}

export default function ResultPoller({ orderNo }: { orderNo: string }) {
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const res = await fetch(`/api/orders/${orderNo}/status`, { cache: "no-store" });
        if (res.ok) {
          const data: OrderStatus = await res.json();
          if (stop) return;
          setOrder(data);
          if (data.status !== "PENDING") return; // 終態,停止輪詢
        }
      } catch {}
      if (!stop) {
        setAttempts((a) => a + 1);
        setTimeout(poll, 2000);
      }
    }
    poll();
    return () => {
      stop = true;
    };
  }, [orderNo]);

  if (!order || order.status === "PENDING") {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-goldline border-t-gold" />
        <h1 className="mt-6 font-serif-tc text-xl font-semibold">正在確認付款結果⋯</h1>
        <p className="mt-2 text-sm text-inkdim">
          請稍候,我們正在等待金流回覆。
          {attempts > 15 && "若持續未完成,您可稍後在「我的訂單」查看狀態。"}
        </p>
      </div>
    );
  }

  if (order.status === "PAID") {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <p className="eyebrow">Thank you</p>
        <h1 className="mt-3 font-serif-tc text-2xl font-semibold">付款完成</h1>
        <p className="num mt-2 text-sm text-inkdim">訂單編號 {order.orderNo}</p>

        {order.kind === "GIFT" && order.giftCode ? (
          <div className="mt-8">
            <p className="text-sm text-inkdim">您的禮物碼</p>
            <p className="num mt-2 select-all rounded-sm border border-goldline bg-blush px-4 py-3 text-lg tracking-widest">
              {formatGiftCode(order.giftCode)}
            </p>
            <p className="mt-3 text-xs leading-5 text-inkdim">
              請將禮物碼(或下方連結)傳給對方;對方登入後即可兌換,僅限一人使用。
            </p>
            <p className="num mt-2 select-all break-all rounded-sm bg-mist px-3 py-2 text-xs">
              {`${typeof window !== "undefined" ? window.location.origin : ""}/gift/redeem?code=${order.giftCode}`}
            </p>
            <Link href="/my/gifts" className="btn-secondary mt-6 w-full">
              前往我的禮物
            </Link>
          </div>
        ) : order.kind === "SUBSCRIPTION_INIT" ? (
          <Link href="/my/courses" className="btn-primary mt-8 w-full">
            開始觀看課程
          </Link>
        ) : (
          <Link href="/my/courses" className="btn-primary mt-8 w-full">
            前往我的課程
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-md p-10 text-center">
      <h1 className="font-serif-tc text-2xl font-semibold text-danger">付款未完成</h1>
      <p className="num mt-2 text-sm text-inkdim">訂單編號 {order.orderNo}</p>
      <p className="mt-4 text-sm text-inkdim">
        這筆交易未成功,未產生任何費用。您可以回到課程頁重新購買。
      </p>
      <Link href="/series" className="btn-secondary mt-8 w-full">
        回課程列表
      </Link>
    </div>
  );
}
