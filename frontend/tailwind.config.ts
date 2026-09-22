import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#faf8f5",
          100: "#f5f3ee",
          200: "#edeae3",
          300: "#e5e2da",
          400: "#d7d3c8",
          500: "#c4bfb2",
        },
        charcoal: {
          900: "#1c2024",
          800: "#272c34",
          700: "#373e47",
          600: "#48505c",
          500: "#555e6c",
          400: "#747e8f",
          300: "#98a2b3",
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          900: "#1e1b4b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
