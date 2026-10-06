import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Mastery / status accents reused across the app.
        mastery: {
          weak: "#ef4444",
          mid: "#f59e0b",
          strong: "#22c55e",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
