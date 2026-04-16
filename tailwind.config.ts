import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        koi: {
          ink: "#07090d",
          carbon: "#0c1016",
          panel: "#111723",
          border: "#1d2535",
          muted: "#8892a6",
          gold: "#e6b450",
          goldDark: "#b8893a",
          red: "#d64545",
          redDeep: "#8a1e1e",
          jade: "#4ade80",
          platinum: "#c8d1df",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(230,180,80,0.4), 0 6px 24px -6px rgba(230,180,80,0.35)",
        panel: "0 1px 0 rgba(255,255,255,0.03) inset, 0 20px 40px -20px rgba(0,0,0,0.8)",
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg,#e6b450 0%,#f5d487 50%,#b8893a 100%)",
        "hero-radial":
          "radial-gradient(1200px 600px at 10% -10%, rgba(230,180,80,0.12), transparent), radial-gradient(900px 500px at 90% 10%, rgba(214,69,69,0.10), transparent)",
      },
      animation: {
        "pulse-gold": "pulseGold 2.2s ease-in-out infinite",
        shimmer: "shimmer 2.2s linear infinite",
      },
      keyframes: {
        pulseGold: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(230,180,80,0.45)" },
          "50%": { boxShadow: "0 0 0 10px rgba(230,180,80,0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
