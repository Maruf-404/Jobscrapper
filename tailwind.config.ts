import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0D81FC",
          hover: "#0B72DF",
          active: "#0963C4",
          light: "#EFF7FF",
          border: "#B2D7FE",
        },
        surface: "#FFFFFF",
        text: {
          DEFAULT: "#101828",
          secondary: "#475467",
          muted: "#667085",
        },
        border: {
          DEFAULT: "#EAECF0",
          subtle: "#F2F4F7",
        },
      },
      fontFamily: {
        sans: ["var(--font-noto-sans)", "Noto Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
