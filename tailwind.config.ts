import type { Config } from "tailwindcss";

// 解憂商店色系 — 薰衣草紫為主體、暖橘霓虹點綴、奶白為底(依店主提供的 App 封面配色)。
// token 名稱維持語意穩定:gold = 主要點綴色(現為暖橘)、ink = 主文字(深梅紫)。
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        porcelain: "#faf8fd",
        paper: "#ffffff",
        mist: "#f3eef9",
        ink: "#3a2d52",
        inkdim: "#8d82a6",
        gold: "#ef8f2f",
        goldsoft: "#f7bd7a",
        goldline: "#f2ddc4",
        hairline: "#e9e2f3",
        blush: "#f5effb",
        lavender: "#a78bdb",
        plum: "#7c5fb8",
        danger: "#b3564f",
        success: "#5f7d63",
      },
      fontFamily: {
        // serif-tc 為歷史類名,現映射到圓體標題字(Huninn)
        "serif-tc": ["var(--font-display)", "sans-serif"],
        display: ["var(--font-display)", "sans-serif"],
        "sans-tc": ["var(--font-sans-tc)", "sans-serif"],
      },
      borderRadius: {
        sm: "10px",
        DEFAULT: "16px",
        lg: "26px",
      },
      boxShadow: {
        soft: "0 2px 16px rgba(58, 45, 82, 0.06)",
        card: "0 10px 40px rgba(58, 45, 82, 0.09)",
        gold: "0 8px 24px rgba(239, 143, 47, 0.32)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
