import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

// 使用狀況統計頁。密碼登入,沒有帳號系統——只有店主一個人用。
//
// 這一頁看得到的所有數字都來自 TarotEvent,而那張表刻意不存 IP、
// User-Agent、session id 與客人打的字。所以這裡也不可能顯示「誰問了什麼」,
// 就算想也做不到——那是店主要求的(2026-08-23:「不要記是誰問的」)。

export const dynamic = "force-dynamic";

const COOKIE = "tarot_admin";

function token(): string {
  return createHmac("sha256", env.ADMIN_PASSWORD).update("tarot-admin-v1").digest("hex");
}

function authed(): boolean {
  if (!env.ADMIN_PASSWORD) return false;
  const got = cookies().get(COOKIE)?.value ?? "";
  const want = token();
  if (got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

async function login(formData: FormData) {
  "use server";
  const pw = String(formData.get("password") ?? "");
  if (env.ADMIN_PASSWORD && pw === env.ADMIN_PASSWORD) {
    cookies().set(COOKIE, token(), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/admin",
      maxAge: 60 * 60 * 24 * 7,   // 七天
    });
  }
}

async function logout() {
  "use server";
  cookies().delete(COOKIE);
}

function since(days: number): Date {
  return new Date(Date.now() - days * 86400_000);
}

async function counts(from: Date) {
  const rows = await prisma.tarotEvent.groupBy({
    by: ["kind"],
    where: { at: { gte: from } },
    _count: { _all: true },
  });
  const m: Record<string, number> = {};
  for (const r of rows) m[r.kind] = r._count._all;
  return m;
}

async function byField(field: "topic" | "scenario" | "detail", kind: string, from: Date) {
  const rows = await prisma.tarotEvent.groupBy({
    by: [field],
    where: { kind, at: { gte: from }, NOT: { [field]: null } },
    _count: { _all: true },
    orderBy: { _count: { [field]: "desc" } },
    take: 12,
  });
  return rows.map((r) => ({ label: String(r[field] ?? ""), n: r._count._all }));
}

const TOPIC_LABEL: Record<string, string> = { love: "感情", career: "工作", money: "金錢" };

function pct(a: number, b: number): string {
  if (!b) return "—";
  return Math.round((a / b) * 100) + "%";
}

export default async function AdminPage() {
  if (!env.ADMIN_PASSWORD) {
    return (
      <Shell>
        <p style={S.note}>
          統計頁還沒開啟。請先在 Vercel 的環境變數加一個 <code>ADMIN_PASSWORD</code>,
          設成你要用的密碼,重新部署之後這一頁才會出現登入框。
        </p>
      </Shell>
    );
  }

  if (!authed()) {
    return (
      <Shell>
        <form action={login} style={{ display: "grid", gap: 12, maxWidth: 320 }}>
          <label style={S.label}>密碼</label>
          <input name="password" type="password" autoFocus style={S.input} />
          <button type="submit" style={S.btn}>進去</button>
        </form>
      </Shell>
    );
  }

  const [d1, d7, d30] = [since(1), since(7), since(30)];
  const [c1, c7, c30] = await Promise.all([counts(d1), counts(d7), counts(d30)]);
  const [topics, scenarios, confirms, privacy, shares, unsuit] = await Promise.all([
    byField("topic", "topic", d30),
    byField("scenario", "scenario", d30),
    byField("detail", "confirm", d30),
    byField("detail", "privacy", d30),
    byField("detail", "share", d30),
    byField("detail", "unsuitable", d30),
  ]);

  const funnel = [
    ["進到占卜流程", "enter"],
    ["選了主題", "topic"],
    ["選了處境", "scenario"],
    ["送出問題", "ask"],
    ["看到解讀", "reading"],
  ] as const;
  const top = c30["enter"] ?? 0;

  return (
    <Shell>
      <div style={S.row}>
        <h1 style={S.h1}>使用狀況</h1>
        <form action={logout}><button type="submit" style={S.link}>登出</button></form>
      </div>

      <h2 style={S.h2}>算了幾次</h2>
      <div style={S.cards}>
        <Card label="今天" n={c1["reading"] ?? 0} />
        <Card label="最近 7 天" n={c7["reading"] ?? 0} />
        <Card label="最近 30 天" n={c30["reading"] ?? 0} />
        <Card label="失敗(罐頭文案)" n={c30["fallback"] ?? 0}
              sub={`30 天內,佔 ${pct(c30["fallback"] ?? 0, (c30["reading"] ?? 0) + (c30["fallback"] ?? 0))}`} />
      </div>

      <h2 style={S.h2}>在哪一步跑掉(最近 30 天)</h2>
      <table style={S.table}>
        <tbody>
          {funnel.map(([label, kind]) => {
            const n = c30[kind] ?? 0;
            return (
              <tr key={kind}>
                <td style={S.td}>{label}</td>
                <td style={{ ...S.td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{n}</td>
                <td style={{ ...S.td, width: "50%" }}>
                  <div style={{ ...S.bar, width: top ? `${Math.round((n / top) * 100)}%` : 0 }} />
                </td>
                <td style={{ ...S.td, textAlign: "right", opacity: .7 }}>{pct(n, top)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p style={S.note}>
        同一位客人重抽會各算一次——為了不留下任何識別碼,這裡不追蹤個別造訪。
        比例仍然看得出哪一步掉最多。
      </p>

      <h2 style={S.h2}>問哪一類(最近 30 天)</h2>
      <Bars rows={topics.map((t) => ({ ...t, label: TOPIC_LABEL[t.label] ?? t.label }))} />

      <h2 style={S.h2}>選了哪個處境(最近 30 天)</h2>
      <Bars rows={scenarios} />

      <h2 style={S.h2}>本喵聽不聽得懂(最近 30 天)</h2>
      <Bars rows={confirms.map((r) => ({ ...r, label: r.label === "yes" ? "複述對了" : "客人說不是,重寫" }))} />

      <h2 style={S.h2}>我自己看 vs 直接告訴我</h2>
      <Bars rows={privacy.map((r) => ({ ...r, label: r.label === "self" ? "我自己看" : "直接告訴我" }))} />

      <h2 style={S.h2}>帶走與回訪</h2>
      <div style={S.cards}>
        <Card label="按了加 LINE" n={c30["line"] ?? 0} sub={`30 天內,佔看到解讀的 ${pct(c30["line"] ?? 0, c30["reading"] ?? 0)}`} />
        <Card label="再抽一次" n={c30["again"] ?? 0} />
      </div>
      <Bars rows={shares.map((r) => ({ ...r, label: r.label === "qr" ? "傳給客人 QR" : "存成圖片" }))} />

      {unsuit.length > 0 && (
        <>
          <h2 style={S.h2}>被擋下的題目類別(最近 30 天)</h2>
          <Bars rows={unsuit} />
          <p style={S.note}>只記類別,不記客人打的字。</p>
        </>
      )}

      <p style={{ ...S.note, marginTop: 40 }}>
        這一頁的所有數字都來自去識別化的事件紀錄:沒有 IP、沒有瀏覽器資訊、
        沒有任何識別碼,也沒有客人打的問題內容。就算資料外洩,也拼不出任何一位客人。
      </p>
    </Shell>
  );
}

function Card({ label, n, sub }: { label: string; n: number; sub?: string }) {
  return (
    <div style={S.card}>
      <div style={S.cardLabel}>{label}</div>
      <div style={S.cardN}>{n}</div>
      {sub && <div style={S.cardSub}>{sub}</div>}
    </div>
  );
}

function Bars({ rows }: { rows: Array<{ label: string; n: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <p style={S.note}>還沒有資料。</p>;
  return (
    <table style={S.table}>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td style={S.td}>{r.label}</td>
            <td style={{ ...S.td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.n}</td>
            <td style={{ ...S.td, width: "55%" }}>
              <div style={{ ...S.bar, width: `${Math.round((r.n / max) * 100)}%` }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={S.page}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px" }}>{children}</div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100dvh", background: "#16081f", color: "#f6eeff",
          fontFamily: "'Noto Sans TC', system-ui, sans-serif" },
  row: { display: "flex", alignItems: "baseline", justifyContent: "space-between" },
  h1: { fontSize: 26, margin: 0 },
  h2: { fontSize: 15, margin: "34px 0 10px", color: "#ffd98c", fontWeight: 700 },
  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 },
  card: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 14, padding: "14px 16px" },
  cardLabel: { fontSize: 12, opacity: .7 },
  cardN: { fontSize: 30, fontWeight: 700, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" },
  cardSub: { fontSize: 11.5, opacity: .6, marginTop: 2 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  td: { padding: "7px 8px 7px 0", borderBottom: "1px solid rgba(255,255,255,.07)", verticalAlign: "middle" },
  bar: { height: 8, borderRadius: 99, background: "linear-gradient(90deg,#b98cf0,#f5cd82)", minWidth: 2 },
  note: { fontSize: 12.5, opacity: .6, lineHeight: 1.8, marginTop: 10 },
  label: { fontSize: 13, opacity: .8 },
  input: { padding: "11px 13px", borderRadius: 10, border: "1px solid rgba(255,255,255,.2)",
           background: "rgba(255,255,255,.06)", color: "#fff", fontSize: 15 },
  btn: { padding: "11px 0", borderRadius: 10, border: 0, background: "#e8b04b",
         color: "#1c1428", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  link: { background: "none", border: 0, color: "#ffd98c", fontSize: 13, cursor: "pointer" },
};
