import Link from "next/link";
import { brand } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="mt-auto px-3 pb-4 pt-16 sm:px-5">
      <div
        className="mx-auto max-w-6xl rounded-[30px] px-6 py-12 text-center text-white"
        style={{
          background: "linear-gradient(160deg, #8f6fc9 0%, #6c4fa8 100%)",
          boxShadow:
            "inset 0 2px 0 rgba(255,255,255,.25), 0 24px 56px -16px rgba(108,79,168,.55)",
        }}
      >
        <div className="font-display text-2xl">{brand.name}</div>
        <p className="mt-1 text-xs font-medium tracking-[0.22em] text-[#ffcf9e]">
          {brand.nameEn}
        </p>
        <p className="mt-4 font-display text-sm text-white/90">{brand.tagline}</p>

        <nav className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/85">
          <Link href="/series" className="transition hover:text-white">
            課程系列
          </Link>
          <Link href="/about" className="transition hover:text-white">
            我是誰
          </Link>
          <Link href="/faq" className="transition hover:text-white">
            常見問題
          </Link>
          <Link href="/gift/redeem" className="transition hover:text-white">
            兌換禮物
          </Link>
        </nav>

        <div className="mt-5 flex items-center justify-center gap-4">
          <a
            href={brand.social.instagram}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Instagram"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4.5 w-4.5">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
            </svg>
          </a>
        </div>

        <div
          className="mx-auto my-6 h-px w-44"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(255,207,158,.8), transparent)",
          }}
        />
        <p className="text-xs leading-6 text-white/70">
          © {new Date().getFullYear()} {brand.fullName}
          <br className="sm:hidden" />
          <span className="hidden sm:inline">·</span>
          課程影片僅限購買帳號觀看,禁止側錄與轉載
        </p>
      </div>
    </footer>
  );
}
