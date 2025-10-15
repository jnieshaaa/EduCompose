/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand Core
        primary: {
          DEFAULT: "#0791B2", // main
          50: "#10C9F6",
          100: "#09B9E3",
          200: "#08A5CB",
          300: "#067D99",
          400: "#056981",
          500: "#045568",
        },
        secondary: {
          DEFAULT: "#8CB5B9", // main
          50: "#BCD4D6",
          100: "#ACC9CC",
          200: "#9CBFC3",
          300: "#7CABAF",
          400: "#6CA1A6",
          500: "#5E959A",
        },

        tertiary: {
          DEFAULT: "#B22807", // main
          50: "#E06345",
          100: "#DC512F",
          200: "#CF4423",
          300: "#A3361B",
          400: "#8D2F18",
          500: "#772714",
        },

        accent: {
          DEFAULT: "#B98F8C", // main
          50: "#D6BDBC",
          100: "#CCAEAC",
          200: "#C39E9C",
          300: "#AF807C",
          400: "#A6706C",
          500: "#9A625E",
        },
        support: {
          DEFAULT: "#00E5FF", // keep
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
