import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

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
        display: ["var(--font-display)", "Space Grotesk", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
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
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.35", transform: "scale(1.6)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in-from-bottom-2": {
          from: { transform: "translateY(0.5rem)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "enter-row": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "fade-in-0": "fade-in 150ms ease-out",
        "slide-in-from-bottom-2": "slide-in-from-bottom-2 180ms ease-out",
        "enter-row": "enter-row 220ms ease-out",
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      // Dark is the default shell (DESIGN_SYSTEM.md §6). Light mode is opt-in
      // via `html.light`, used by the public-facing pages only — so a
      // component writes `light:` for its light-mode treatment, not `dark:`.
      addVariant("light", "html.light &");
      // Radix state helpers used by the primitives.
      addVariant("open", '&[data-state="open"]');
    }),
  ],
};

export default config;
