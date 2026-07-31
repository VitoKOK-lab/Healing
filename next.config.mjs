/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // mock 影片串流 route 以 fs 讀取範例影片;Vercel serverless 需明確把檔案打包進 function
    outputFileTracingIncludes: {
      "/api/mock-video/[assetId]": ["./public/dev-videos/**"],
    },
  },
  async rewrites() {
    // Vercel 上首頁直接出品牌靜態站(build 時已把 site-static/ 複製進 public/);
    // 本機開發沒有這份複製,維持原本的 Next 首頁。
    if (process.env.VERCEL !== "1") return [];
    return {
      beforeFiles: [{ source: "/", destination: "/index.html" }],
    };
  },
};

export default nextConfig;
