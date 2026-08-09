import type { Config } from "tailwindcss";

// Buzz design tokens — see docs/DESIGN_SYSTEM.md for the full rationale.
// Do not add Tailwind's default indigo/purple/violet/blue palettes for
// brand-related UI — use these tokens instead.

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#0E1116",
          900: "#12161C",
          800: "#181D24",
          700: "#232A34",
        },
        paper: {
          50: "#F7F6F3",
          100: "#FFFFFF",
          200: "#ECEAE4",
        },
        campus: {
          ember: {
            400: "#F58762",
            500: "#F0653C",
          },
        },
        skills: {
          teal: {
            400: "#4FAE9B",
            500: "#2F8F7D",
          },
        },
        builds: {
          violet: {
            400: "#8A73DE",
            500: "#6E56CF",
          },
        },
        success: { 500: "#22C55E" },
        warning: { 500: "#F5A623" },
        danger: { 500: "#EF4444" },
        text: {
          "primary-dark": "#F5F6F7",
          "primary-light": "#14181C",
          muted: "#8A93A6",
        },
      },
      fontFamily: {
        display: ["var(--font-general-sans)", "Space Grotesk", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      fontSize: {
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem",
        "5xl": "3rem",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
      boxShadow: {
        // Intentionally minimal — prefer 1px borders over shadow.
        // See DESIGN_SYSTEM.md Section 2 (Elevation) and Section 3
        // (no large "floating card" shadows).
        tight: "0 1px 3px rgba(0,0,0,0.12)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
