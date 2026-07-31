/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // mock 影片串流 route 以 fs 讀取範例影片;Vercel serverless 需明確把檔案打包進 function
    outputFileTracingIncludes: {
      "/api/mock-video/[assetId]": ["./public/dev-videos/**"],
    },
  },
};

export default nextConfig;
