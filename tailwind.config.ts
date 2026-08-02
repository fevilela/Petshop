import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff9f1",
          100: "#d7f0dc",
          500: "#2f9e5c",
          600: "#24824a",
          700: "#1c653a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
