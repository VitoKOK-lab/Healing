import type { Metadata } from "next";
import "./globals.css";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    default: `${brand.fullName}|線上療癒課程`,
    template: `%s|${brand.name}`,
  },
  description: brand.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
