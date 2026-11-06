import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#101F3A", royal: "#244C85", mist: "#A7B3C3", swan: "#F5EEE4",
        ivory: "#F5F1EA", teal: "#0C6F70", tealdeep: "#076966", sand: "#D9C2A2", sand2: "#E0C5A3",
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
