// 使用狀況統計的白名單與寫入。
//
// 店主的指示:「不要記是誰問的」。這一層結構性地保證做得到——
// record() 的參數型別裡根本沒有 IP、User-Agent、session id、問題內容
// 這些欄位,想記也記不進去。
//
// 漏斗刻意用「各步驟的次數」比,不是追同一個人走完幾步:那需要給每次
// 造訪一個編號,而編號就是識別碼。少了它統計會粗一點(同一個人重抽會
// 各算一次),但換來的是「這張表外洩也拼不出任何一位客人」。

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
};

// 欄位長度上限:這些全都是固定選項或短標籤,超長就是有人在亂塞。
const LIMITS = { topic: 16, scenario: 40, tier: 4, detail: 24 };

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
      },
    });
  } catch {
    // 統計失敗不影響任何人
  }
}
