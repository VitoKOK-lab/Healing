import { brand } from "@/lib/brand";

export const metadata = { title: "常見問題" };

const FAQ = [
  {
    q: "課程要怎麼買?",
    a: "進入課程頁後可以「單堂購買」(永久觀看),或到系列頁「訂閱整個系列」(月繳,看到飽、可隨時取消)。付款都由綠界處理,本站不會儲存您的卡號。",
  },
  {
    q: "可以買課程送朋友嗎?",
    a: "可以。在課程頁選「包成禮物送人」,付款完成後會拿到一組專屬禮物碼與分享連結,傳給對方即可;每組禮物碼僅能被一個帳號兌換一次。",
  },
  {
    q: "訂閱後可以隨時取消嗎?",
    a: "可以,在「我的訂閱」頁按取消即可;取消後仍可觀看到當期結束,不會立刻失去觀看權。",
  },
  {
    q: "影片可以下載或截圖保存嗎?",
    a: "課程影片僅供線上觀看,不提供下載,畫面也會顯示您帳號的浮水印,請勿側錄或轉載。",
  },
  {
    q: "我可以在手機、平板、電腦上看嗎?",
    a: "都可以,但同一個帳號同一時間只能有一台裝置在線上,新裝置登入會讓舊裝置自動登出。",
  },
  {
    q: "忘記自己是用 LINE 還是 Google 登入怎麼辦?",
    a: "課程權益是綁定登入帳號的,請固定使用同一種方式登入;若不確定,兩種都試試看,通常其中一種會直接進到「我的課程」。",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <div className="text-center">
        <p className="eyebrow">✦ FAQ ✦</p>
        <h1 className="mt-3 font-display text-4xl text-ink">常見問題</h1>
        <p className="mt-4 text-sm leading-7 text-inkdim">
          還有其他問題嗎?歡迎透過 {brand.contactEmail} 聯繫我們。
        </p>
      </div>

      <div className="mt-10 space-y-4">
        {FAQ.map((item) => (
          <details key={item.q} className="card group p-6">
            <summary className="cursor-pointer list-none font-display text-[17px] text-ink marker:content-none">
              <span className="flex items-center justify-between gap-4">
                {item.q}
                <span className="clay-dot h-7 w-7 shrink-0 text-plum transition group-open:rotate-45">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </span>
            </summary>
            <p className="mt-4 text-sm leading-7 text-inkdim">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
