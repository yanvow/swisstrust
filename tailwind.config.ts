import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        red: {
          DEFAULT: "#D0021B",
          dark: "#A50115",
        },
        charcoal: "#1A1A1A",
        gray: {
          800: "#2D2D2D",
          600: "#555555",
          500: "#6B6B6B",
          400: "#888888",
          300: "#BDBDBD",
          200: "#E5E5E5",
          100: "#F5F5F5",
        },
        green: "#0A7D44",
        amber: "#B45309",
        blue: "#1D4ED8",
      },
      fontFamily: {
        sans: ["Inter", "Helvetica Neue", "Arial", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "2px",
        sm: "2px",
      },
      maxWidth: {
        container: "1140px",
      },
      boxShadow: {
        subtle: "0 1px 4px rgba(0,0,0,.10)",
        lg: "0 4px 20px rgba(0,0,0,.12)",
      },
    },
  },
  plugins: [],
};

export default config;
