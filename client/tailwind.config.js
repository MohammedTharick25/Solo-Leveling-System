/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      transitionTimingFunction: {
        "out-expo": "var(--ease-out)",
        spring: "var(--ease-spring)",
      },
      colors: {
        // Base backgrounds
        slate: {
          950: "rgb(var(--surface-950) / <alpha-value>)",
          900: "rgb(var(--surface-900) / <alpha-value>)",
          850: "rgb(var(--surface-850) / <alpha-value>)",
          800: "rgb(var(--surface-800) / <alpha-value>)",
          700: "rgb(var(--surface-700) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
        },
        // Semantic aliases (prefer these in new code)
        surface: {
          950: "rgb(var(--surface-950) / <alpha-value>)",
          900: "rgb(var(--surface-900) / <alpha-value>)",
          850: "rgb(var(--surface-850) / <alpha-value>)",
          800: "rgb(var(--surface-800) / <alpha-value>)",
          700: "rgb(var(--surface-700) / <alpha-value>)",
        },
        accent: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => [n, `rgb(var(--accent-${n}) / <alpha-value>)`]),
        ),
        accent2: "rgb(var(--accent-2) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        // Brand accents
        // "cyan-*" is kept as the class name used across the app; it now follows the active palette.
        cyan: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => [n, `rgb(var(--accent-${n}) / <alpha-value>)`]),
        ),
        
        purple: {
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
        },
        indigo: {
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
        },
      },
      fontFamily: {
        display: ["Orbitron Variable", "Orbitron", "ui-monospace", "monospace"],
        heading: ["Sora Variable", "Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "glow-cyan": "0 0 24px rgb(var(--accent-400) / 0.35), 0 0 60px rgb(var(--accent-400) / 0.12)",
        "glow-cyan-sm": "0 0 14px rgb(var(--accent-400) / 0.28)",
        "glow-purple": "0 0 24px rgb(var(--accent-2) / 0.35), 0 0 60px rgb(var(--accent-2) / 0.12)",
        "glow-purple-sm": "0 0 14px rgb(var(--accent-2) / 0.28)",
        "glow-indigo": "0 0 20px rgb(99 102 241 / 0.4)",
        "inner-glow": "inset 0 0 20px rgb(var(--accent-400) / 0.06)",
        card: "0 12px 32px -12px rgb(0 0 0 / 0.6)",
      },
            animation: {
        float: "float 3s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "scan-line": "scanLine 3s linear infinite",
        "particle-rise": "particleRise 4s ease-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        flicker: "flicker 4s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseGlow: {
          "0%,100%": { opacity: "0.6", filter: "brightness(1)" },
          "50%": { opacity: "1", filter: "brightness(1.3)" },
        },
        scanLine: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        particleRise: {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0.8" },
          "100%": { transform: "translateY(-120px) scale(0)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        flicker: {
          "0%,95%,100%": { opacity: "1" },
          "96%": { opacity: "0.6" },
          "97%": { opacity: "1" },
          "98%": { opacity: "0.4" },
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgb(var(--accent-400) / 0.03) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--accent-400) / 0.03) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(ellipse at center, rgb(var(--accent-400) / 0.08) 0%, transparent 70%)",
        "hero-gradient":
          "radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.12) 0%, rgba(168,85,247,0.06) 40%, transparent 70%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(34,211,238,0.05) 0%, rgba(168,85,247,0.05) 100%)",
        "shimmer-gradient":
          "linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.15) 50%, transparent 100%)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
