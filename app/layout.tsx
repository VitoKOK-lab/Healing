import type { Metadata } from "next";
import "./globals.css";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    default: `${brand.fullName}|線上療癒課程`,
    template: `%s|${brand.fullName}`,
  },
  description: brand.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
