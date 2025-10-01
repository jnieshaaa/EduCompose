/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0791B2",
        secondary: "#67E8F9",
        accent: "#0E7490",
        support: "#00E5FF",
        success: "#16A34A",

        neutral1: "#FFFFFF",
        neutral2: "#F6F6F6",
        neutral3: "#E1E1E1",

        warning: "#F59E0B",
        error: "#DC2626",
        info: "#0EA5E9",
      },
    },
  },
  plugins: [],
};
