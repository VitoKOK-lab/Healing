import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TAHIR ZAINAB TAROT|喵喵占卜",
  description: "Jessica 解憂商店的塔羅占卜",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
