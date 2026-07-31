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
