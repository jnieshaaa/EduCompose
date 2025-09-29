/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1E40AF", // Blue
        secondary: "#9333EA", // Purple
        success: "#16A34A", // Green
        warning: "#F59E0B", // Orange
        error: "#DC2626", // Red
        info: "#0EA5E9", // Cyan
      },
    },
  },
  plugins: [],
};
