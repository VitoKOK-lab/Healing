import { signIn } from "@/lib/auth/config";
import { brand } from "@/lib/brand";

// 登入頁:LINE / Google。權益綁定登入帳號,頁面明確提醒固定使用同一種方式。

const REASON_MESSAGES: Record<string, string> = {
  "session-replaced": "您的帳號已在其他裝置登入,此裝置已自動登出。",
  "auth-required": "請先登入後繼續。",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { reason?: string; callbackUrl?: string };
}) {
  const reason = searchParams.reason ? REASON_MESSAGES[searchParams.reason] : null;
  const callbackUrl = searchParams.callbackUrl || "/my/courses";
  // 未設定金鑰的登入方式不顯示(展示版可先只開 Google,LINE channel 之後補)
  const lineEnabled = Boolean(process.env.AUTH_LINE_ID);
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-24 text-center">
      <p className="eyebrow">Sign in</p>
      <h1 className="mt-3 font-serif-tc text-3xl font-semibold">登入 {brand.name}</h1>
      {reason && (
        <p className="mt-6 w-full rounded-sm border border-goldline bg-blush px-4 py-3 text-sm text-ink">
          {reason}
        </p>
      )}
      <div className="mt-10 w-full space-y-4">
        {lineEnabled && (
          <form
            action={async () => {
              "use server";
              await signIn("line", { redirectTo: callbackUrl });
            }}
          >
            <button className="w-full cursor-pointer rounded-full bg-[#06C755] py-3.5 font-display text-sm tracking-wider text-white transition hover:opacity-90 active:scale-95">
              使用 LINE 登入
            </button>
          </form>
        )}
        {googleEnabled && (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: callbackUrl });
            }}
          >
            <button className="btn-secondary w-full">使用 Google(Gmail)登入</button>
          </form>
        )}
        {!lineEnabled && !googleEnabled && (
          <p className="rounded-2xl bg-blush px-4 py-3 text-sm text-inkdim">
            尚未設定登入服務(需在環境變數填入 Google/LINE 金鑰)。
          </p>
        )}
      </div>
      <p className="mt-8 text-xs leading-6 text-inkdim">
        課程與訂閱權益綁定您登入的帳號,請每次固定使用同一種方式登入。
        <br />
        帳號同一時間僅能在一台裝置登入,新登入將使其他裝置自動登出。
      </p>
    </div>
  );
}
