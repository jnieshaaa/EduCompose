/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 🌊 Brand Core
        primary: {
          default: "#0791B2",
          light: "#67E8F9",
          dark: "#0E7490",
          hover: "#00A4C9",
          focus: "#06B6D4",
          muted: "#A5F3FC",
        },
        secondary: {
          default: "#67E8F9",
          light: "#A5F3FC",
          dark: "#38BDF8",
        },
        accent: {
          default: "#0E7490",
          light: "#14B8A6",
          dark: "#164E63",
        },
        support: {
          default: "#00E5FF",
          light: "#5EE2FF",
          dark: "#00B7CC",
        },
        success: {
          default: "#10B981",
          light: "#6EE7B7",
          dark: "#047857",
        },
        warning: {
          default: "#F59E0B",
          light: "#FCD34D",
          dark: "#B45309",
        },
        error: {
          default: "#EF4444",
          light: "#FCA5A5",
          dark: "#991B1B",
        },
        info: {
          default: "#38BDF8",
          light: "#BAE6FD",
          dark: "#0284C7",
        },
        neutral: {
          50: "#FFFFFF",
          100: "#F0FDFE",
          200: "#E0F2FE",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          900: "#0F172A",
        },
      },

      keyframes: {
        shine: {
          "0%": { transform: "translateX(-80%)" },
          "100%": { transform: "translateX(300%)" },
        },
      },

      animation: {
        shine: "shine 0.5s ease-in-out forwards",
      },

      backgroundImage: {
        "shine-gradient":
          "linear-gradient(130deg, rgba(0, 0, 0, 0) 0%, rgba(255,255,255,1) 50%, rgba(0, 0, 0, 0) 100%)",
      },
    },
  },
  plugins: [],
};
