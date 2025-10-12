/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 🌊 Brand Core
        primary: {
          DEFAULT: "#0791B2", // main brand tone
          light: "#67E8F9", // same as secondary – for light backgrounds
          dark: "#0E7490", // same as accent – for hover/active states
          hover: "#00A4C9", // slightly brighter for hover
          focus: "#06B6D4", // focus ring / outline color
          muted: "#A5F3FC", // very soft tint for subtle backgrounds
        },

        secondary: {
          DEFAULT: "#67E8F9", // keep
          light: "#A5F3FC", // gentle tint for cards/sections
          dark: "#38BDF8", // slightly deeper version
        },

        accent: {
          DEFAULT: "#0E7490", // keep
          light: "#14B8A6", // teal accent variant
          dark: "#164E63", // deep cyan-teal
        },

        support: {
          DEFAULT: "#00E5FF", // keep
          light: "#5EE2FF", // bright highlight
          dark: "#00B7CC", // deeper tone for balance
        },

        // ✅ Functional Colors
        success: {
          DEFAULT: "#10B981",
          light: "#6EE7B7",
          dark: "#047857",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FCD34D",
          dark: "#B45309",
        },
        error: {
          DEFAULT: "#EF4444",
          light: "#FCA5A5",
          dark: "#991B1B",
        },
        info: {
          DEFAULT: "#38BDF8",
          light: "#BAE6FD",
          dark: "#0284C7",
        },

        // ⚪ Neutral / Base
        neutral: {
          50: "#FFFFFF", // pure white
          100: "#F0FDFE", // background with faint aqua tint
          200: "#E0F2FE", // light blue-gray
          300: "#CBD5E1", // neutral borders
          400: "#94A3B8", // muted text
          500: "#64748B", // normal text
          600: "#475569", // dark text
          900: "#0F172A", // headings
        },
      },
    },
  },
  plugins: [],
};
