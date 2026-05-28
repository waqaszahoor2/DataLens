import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./store/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "360px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      "3xl": "1920px",
      "4xl": "2560px",
    },
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1D9E75",
          50: "#F0FAF6",
          100: "#D1F0E5",
          200: "#A3E0CA",
          300: "#6DCBAA",
          400: "#3BB48B",
          500: "#1D9E75",
          600: "#177F5E",
          700: "#115F47",
          800: "#0B4031",
          900: "#05201A",
        },
        ai: {
          DEFAULT: "#533AB9",
          50: "#F1EEFF",
          100: "#DDD6FE",
          200: "#BDB4FD",
          300: "#9B8DFB",
          400: "#7965F9",
          500: "#533AB9",
          600: "#432EA0",
          700: "#332286",
          800: "#23166D",
          900: "#130B54",
        },
        surface: "#FFFFFF",
        surface2: "#F7F8FA",
        border: "#E4E7EC",
        muted: "#F2F4F7",
        "text-primary": "#101828",
        "text-secondary": "#475467",
        "text-tertiary": "#98A2B3",
      },
      fontFamily: {
        sans: ["DM Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "10px",
        "card-lg": "14px",
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)",
        "card-md": "0 4px 8px -2px rgba(16,24,40,0.10), 0 2px 4px -2px rgba(16,24,40,0.06)",
        "card-lg": "0 12px 24px -6px rgba(16,24,40,0.12), 0 6px 12px -4px rgba(16,24,40,0.08)",
        glow: "0 0 0 3px rgba(29,158,117,0.15)",
        "glow-ai": "0 0 0 3px rgba(83,58,185,0.15)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in-right": "slideInRight 0.25s ease-out",
        "slide-in-left": "slideInLeft 0.25s ease-out",
        "slide-up": "slideUp 0.2s ease-out",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
