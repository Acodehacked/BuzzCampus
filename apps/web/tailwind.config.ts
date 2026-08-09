import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

// Buzz design tokens — see docs/DESIGN_SYSTEM.md.
//
// Two registers, on purpose:
//
//   ENTRY surfaces (landing, onboarding, auth, empty states, the tour)
//   use the `pop-*` palette: saturated flat colour blocks, heavy black
//   type, chunky pills. Loud, and meant to be.
//
//   WORKING surfaces (feed, post detail, wallet, admin) keep the graphite
//   ground and use colour to MEAN something — which category a post is,
//   whether an SLA is breached. Full-bleed acid green behind a data table
//   is unreadable, and the feed is where people actually live.
//
// Never introduce Tailwind's default indigo/purple/blue for brand UI.

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
          600: "#313A46",
        },
        paper: {
          50: "#F7F6F3",
          100: "#FFFFFF",
          200: "#ECEAE4",
        },

        // ── the loud register ──────────────────────────────────────
        // Flat, saturated, used as full panels with near-black type on
        // top. These are for entry surfaces only.
        pop: {
          lime: "#C6F832",
          "lime-deep": "#A8DC12",
          pink: "#FF4D8D",
          "pink-deep": "#E62E71",
          yellow: "#FFE24D",
          "yellow-deep": "#F5C400",
          violet: "#8B5CF6",
          "violet-deep": "#6D3EE0",
          sky: "#5CC8F5",
          "sky-deep": "#22A8E0",
        },
        // Near-black for type sitting on a pop panel. Not pure #000 —
        // pure black on saturated colour vibrates.
        ink: "#0B0D10",

        // ── category accents (semantic, not decorative) ────────────
        campus: {
          ember: {
            300: "#FFB396",
            400: "#F58762",
            500: "#F0653C",
            600: "#D14A22",
          },
        },
        skills: {
          teal: {
            300: "#8AD9C8",
            400: "#4FAE9B",
            500: "#2F8F7D",
            600: "#1F6E5F",
          },
        },
        builds: {
          violet: {
            300: "#B9A8F0",
            400: "#8A73DE",
            500: "#6E56CF",
            600: "#5740B0",
          },
        },

        success: { 400: "#4ADE80", 500: "#22C55E" },
        warning: { 400: "#FBBF24", 500: "#F5A623" },
        danger: { 400: "#F87171", 500: "#EF4444" },
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
        // The loud register needs sizes the old scale didn't have.
        "6xl": "3.75rem",
        "7xl": "4.5rem",
        "8xl": "6rem",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
        // Chunky, for the entry register.
        xl: "20px",
        "2xl": "28px",
        "3xl": "36px",
      },
      boxShadow: {
        tight: "0 1px 3px rgba(0,0,0,0.12)",
        // A hard offset instead of a soft blur — reads as a physical
        // object rather than the usual floating-card blur.
        pop: "4px 4px 0 0 rgb(11 13 16)",
        "pop-sm": "2px 2px 0 0 rgb(11 13 16)",
        "pop-light": "4px 4px 0 0 rgb(255 255 255 / 0.9)",
        lift: "0 12px 32px -8px rgb(0 0 0 / 0.45)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.35", transform: "scale(1.6)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-from-bottom-2": {
          from: { transform: "translateY(0.5rem)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "enter-row": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "wiggle-in": {
          "0%": { transform: "rotate(-6deg) scale(0.9)", opacity: "0" },
          "60%": { transform: "rotate(2deg) scale(1.02)", opacity: "1" },
          "100%": { transform: "rotate(0deg) scale(1)", opacity: "1" },
        },
        "ring-ping": {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "fade-in-0": "fade-in 150ms ease-out",
        "slide-in-from-bottom-2": "slide-in-from-bottom-2 180ms ease-out",
        "enter-row": "enter-row 220ms ease-out",
        marquee: "marquee 28s linear infinite",
        "wiggle-in": "wiggle-in 420ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        "ring-ping": "ring-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
      transitionTimingFunction: {
        // The overshoot that makes a press feel physical.
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      // Dark is the default shell. Light mode is opt-in via `html.light`,
      // used by the public-facing pages — so components write `light:`.
      addVariant("light", "html.light &");
      addVariant("open", '&[data-state="open"]');
    }),
  ],
};

export default config;
