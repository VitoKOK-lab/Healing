import Link from "next/link";
import { brand } from "@/lib/brand";

export const metadata = { title: "我是誰" };

// 大頭照佔位:店主之後可把真實照片放到 public/brand/about-photo.jpg,
// 並把下方 <div className="clay-dot..."> 區塊換成 <img src="/brand/about-photo.jpg" .../>。
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <div className="text-center">
        <p className="eyebrow">✦ About ✦</p>
        <h1 className="mt-3 font-display text-4xl text-ink">我是誰</h1>
      </div>

      <div className="card mt-10 p-8 sm:p-12">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div
            className="clay-dot h-28 w-28 shrink-0 text-plum"
            aria-label="Jessica 大頭照佔位"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-12 w-12">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path strokeLinecap="round" d="M5 11a7 7 0 0014 0M12 18v3m-3 0h6" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-2xl text-ink">嗨,我是 {brand.nameEn}</h2>
            <p className="mt-4 text-[15px] leading-8 text-inkdim">
              我在 Instagram 分享 ASMR 內容,喜歡用聲音、節奏與安靜的陪伴,
              幫助大家在忙碌的日常裡找回一點點安定感。這幾年收到很多訊息,
              問我有沒有更完整、可以反覆回放的內容——{brand.name}就是這樣開始的:
              把舒壓與補運的練習整理成一堂堂課程,讓好好休息這件事,
              不用等到滑到限動才想起來。
            </p>
            <p className="mt-4 text-[15px] leading-8 text-inkdim">
              這裡沒有絕對正確的療癒方式,只有慢慢找到適合自己的節奏。
              希望{brand.name}能成為你需要安靜片刻時,隨時可以推開的那扇門。
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 text-center">
        <p className="eyebrow">Find me</p>
        <h2 className="mt-2 font-display text-xl text-ink">在其他地方找到我</h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href={brand.social.instagram}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-secondary"
          >
            Instagram
          </a>
          <span
            className="soon inline-flex items-center justify-center rounded-full border-2 border-lavender/40 px-8 py-3 text-sm font-bold text-inkdim/70"
            title="連結整理中"
          >
            TikTok(即將公開)
          </span>
        </div>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-3">
        {[
          {
            title: "陪伴,不是說教",
            body: "每堂課都像朋友坐下來陪你練習,不追求完美,只求你願意留給自己一點時間。",
          },
          {
            title: "看得到、聽得到",
            body: "延續 ASMR 的細膩感受,課程一樣重視聲音品質與節奏,讓耳朵也能放鬆。",
          },
          {
            title: "保護你的隱私",
            body: "課程僅限購買帳號觀看,單一裝置登入、觀看浮水印,守住你安靜的空間。",
          },
        ].map((v) => (
          <div key={v.title} className="card p-6 text-center">
            <h3 className="font-display text-lg text-ink">{v.title}</h3>
            <p className="mt-2 text-sm leading-6 text-inkdim">{v.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <Link href="/series" className="btn-primary">
          一起逛逛課程
        </Link>
      </div>
    </div>
  );
}
