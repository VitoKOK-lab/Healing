import type { Config } from "tailwindcss";

// 純白高級系 design tokens — porcelain white base, champagne gold details, soft ink text.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        porcelain: "#fafaf8",
        paper: "#ffffff",
        mist: "#f3f1ec",
        ink: "#2b2b2b",
        inkdim: "#8b857b",
        gold: "#b79a63",
        goldsoft: "#d8c9a3",
        goldline: "#e9e2d0",
        hairline: "#eceae4",
        blush: "#f7f0ea",
        danger: "#b3564f",
        success: "#5f7d63",
      },
      fontFamily: {
        "serif-tc": ["var(--font-serif-tc)", "serif"],
        "sans-tc": ["var(--font-sans-tc)", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "14px",
        lg: "22px",
      },
      boxShadow: {
        soft: "0 2px 16px rgba(43, 43, 43, 0.05)",
        card: "0 10px 40px rgba(43, 43, 43, 0.07)",
        gold: "0 8px 24px rgba(183, 154, 99, 0.28)",
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
