/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // 站上只剩塔羅:根網址直接帶去手機版占卜頁。
    // 用 redirect 而非 rewrite——占卜頁的資源全是 ./assets/ 相對路徑,
    // rewrite 停在 / 會讓瀏覽器把資源解析到根目錄而全數 404。
    return [{ source: "/", destination: "/tarot/index.html", permanent: false }];
  },
};

export default nextConfig;
