// 使用狀況統計的白名單與寫入。
//
// 店主的指示:「不要記是誰問的」。這一層結構性地保證做得到——
// record() 的參數型別裡根本沒有 IP、User-Agent、session id、問題內容
// 這些欄位,想記也記不進去。
//
// 2026-08-23 店主追加兩件事:記客人打的問題原文,以及「有沒有回來算第二次」。
//
//   question —— 這是整張表裡唯一可能認得出人的東西(有人會寫「我跟阿明」
//     「我在 XX 公司」)。所以配套是硬的:只有 /admin 進得去、資料庫層 RLS、
//     90 天自動刪除(sweep())——不是靠誰記得去清。
//
//   visitor —— 瀏覽器本機產生的隨機字串,用來看回訪。它不是身分:
//     不含姓名或裝置資訊,清瀏覽器資料就換一個,換裝置也是新的。
//     它回答得了「有多少人算過不只一次」,回答不了「這個人是誰」。
//
// 仍然不存的:IP、User-Agent、cookie、任何從裝置或網路推導出來的東西。

import { prisma } from "@/lib/prisma";

// 只收白名單內的事件。這支 API 是公開的(網頁版沒有登入),
// 不設白名單等於讓任何人往你的資料庫塞垃圾。
export const EVENT_KINDS = [
  "enter",        // 通過進場動畫,真的開始用
  "topic",        // 選了主題
  "scenario",     // 選了處境
  "ask",          // 送出問題
  "confirm",      // 本喵複述確認,detail = yes(對) / no(重寫)
  "reading",      // 解讀成功送達
  "fallback",     // 解讀失敗,出了罐頭文案
  "privacy",      // 岔路的選擇,detail = self(我自己看) / tell(直接告訴我)
  "share",        // 產了 QR 或存了圖,detail = qr / image
  "line",         // 按了加 LINE
  "unsuitable",   // 問了不適合占卜的題目,detail = 類別
  "again",        // 按了再抽一次
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export function isEventKind(v: unknown): v is EventKind {
  return typeof v === "string" && (EVENT_KINDS as readonly string[]).includes(v);
}

export type EventInput = {
  kind: EventKind;
  topic?: string | null;
  scenario?: string | null;
  tier?: string | null;
  wide?: boolean | null;
  detail?: string | null;
  question?: string | null;
  visitor?: string | null;
};

// 保留天數。到期的資料自動刪除,不靠人記得去清。
export const RETENTION_DAYS = 90;

// 欄位長度上限:這些全都是固定選項或短標籤,超長就是有人在亂塞。
const LIMITS = { topic: 16, scenario: 40, tier: 4, detail: 24, question: 300, visitor: 40 };

function clamp(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

// 統計不能拖慢客人,也不能因為統計掛掉就讓占卜失敗——
// 一律吞掉錯誤,不 await 也沒關係。
export async function record(e: EventInput): Promise<void> {
  try {
    await prisma.tarotEvent.create({
      data: {
        kind: e.kind,
        topic: clamp(e.topic, LIMITS.topic),
        scenario: clamp(e.scenario, LIMITS.scenario),
        tier: clamp(e.tier, LIMITS.tier),
        wide: typeof e.wide === "boolean" ? e.wide : null,
        detail: clamp(e.detail, LIMITS.detail),
        question: clamp(e.question, LIMITS.question),
        visitor: clamp(e.visitor, LIMITS.visitor),
      },
    });
    // 順手清過期資料。每 50 次寫入才跑一次——每次都跑太浪費,
    // 而流量再小也一定會跑到,不需要另外排程。
    if (Math.random() < 0.02) void sweep();
  } catch {
    // 統計失敗不影響任何人
  }
}

// 刪掉超過保留期的紀錄。question 欄位是唯一可能認得出人的東西,
// 這一段就是它的保存期限——寫在程式裡,不是寫在待辦清單裡。
export async function sweep(): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400_000);
    const r = await prisma.tarotEvent.deleteMany({ where: { at: { lt: cutoff } } });
    return r.count;
  } catch {
    return 0;
  }
}
