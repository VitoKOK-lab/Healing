import { brand } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-hairline bg-paper">
      <div className="mx-auto max-w-6xl px-5 py-10 text-center">
        <div className="wordmark text-sm text-ink">{brand.nameEn}</div>
        <p className="mt-2 font-serif-tc text-sm text-inkdim">{brand.tagline}</p>
        <hr className="rule-gold mx-auto my-6 w-40" />
        <p className="text-xs text-inkdim">
          © {new Date().getFullYear()} {brand.fullName}·課程影片僅限購買帳號觀看,禁止側錄與轉載
        </p>
      </div>
    </footer>
  );
}
