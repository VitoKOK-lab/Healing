import { NextRequest, NextResponse } from "next/server";
import { isEventKind, record } from "@/lib/tarot/events";

// 前端回報「客人走到哪一步」。刻意做得很窄:
//   ・kind 走白名單,不在名單上的一律丟掉
//   ・其他欄位長度受限,而且都是固定選項或短標籤
//   ・不讀 IP、不讀 User-Agent、不發 cookie——這支不認識任何人
//
// 這是公開端點(網頁版沒有登入),所以它能做的事必須少到「被亂打也不痛」:
// 最壞情況是統計數字被灌水,不會外洩任何東西,也不會多花模型的錢。

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  const { kind, topic, scenario, tier, wide, detail } = (body ?? {}) as Record<string, unknown>;
  if (!isEventKind(kind)) {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  await record({
    kind,
    topic: typeof topic === "string" ? topic : null,
    scenario: typeof scenario === "string" ? scenario : null,
    tier: typeof tier === "string" ? tier : null,
    wide: typeof wide === "boolean" ? wide : null,
    detail: typeof detail === "string" ? detail : null,
  });

  // 一律回 204:前端不在乎結果,也不要讓外面從回應猜出任何事。
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
