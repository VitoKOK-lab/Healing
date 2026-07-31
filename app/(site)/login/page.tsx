import { signIn } from "@/lib/auth/config";
import { brand } from "@/lib/brand";
import DemoLoginForm from "@/components/auth/DemoLoginForm";

// 登入頁:示範登入(免金鑰,預設開放)+ LINE / Google(選填,設定金鑰後才顯示)。
// 權益綁定登入帳號,頁面明確提醒固定使用同一種方式。

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
  const lineEnabled = Boolean(process.env.AUTH_LINE_ID);
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID);
  const demoEnabled = process.env.DEMO_LOGIN !== "false";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-20 text-center">
      <p className="eyebrow">Sign in</p>
      <h1 className="mt-3 font-display text-3xl text-ink">登入 {brand.name}</h1>
      {reason && (
        <p className="mt-6 w-full rounded-2xl bg-blush px-4 py-3 text-sm text-plum">
          {reason}
        </p>
      )}

      {demoEnabled && (
        <div className="card mt-9 w-full p-7">
          <p className="eyebrow">Demo · 免金鑰</p>
          <h2 className="mt-2 font-display text-lg text-ink">示範登入</h2>
          <p className="mt-1.5 text-xs leading-5 text-inkdim">
            不需要 Google/LINE 帳號,輸入名稱即可體驗完整平台(單一裝置登入、購買、觀看、送禮皆為真實流程)。
          </p>
          <div className="mt-5">
            <DemoLoginForm />
          </div>
        </div>
      )}

      {(lineEnabled || googleEnabled) && (
        <>
          <div className="mt-8 flex w-full items-center gap-3 text-xs text-inkdim">
            <span className="h-px flex-1 bg-hairline" />
            正式登入方式
            <span className="h-px flex-1 bg-hairline" />
          </div>
          <div className="mt-5 w-full space-y-3">
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
          </div>
        </>
      )}

      {!demoEnabled && !lineEnabled && !googleEnabled && (
        <p className="mt-8 rounded-2xl bg-blush px-4 py-3 text-sm text-inkdim">
          尚未設定任何登入方式。
        </p>
      )}

      <p className="mt-8 text-xs leading-6 text-inkdim">
        課程與訂閱權益綁定您登入的帳號,請每次固定使用同一種方式登入。
        <br />
        帳號同一時間僅能在一台裝置登入,新登入將使其他裝置自動登出。
      </p>
    </div>
  );
}
