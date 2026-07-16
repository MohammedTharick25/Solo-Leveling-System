/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Base backgrounds
        slate: {
          950: "#020617",
          900: "#0f172a",
          850: "#131f35",
          800: "#1e293b",
          700: "#334155",
          600: "#475569",
          500: "#64748b",
          400: "#94a3b8",
          300: "#cbd5e1",
        },
        // Brand accents
        cyan: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
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
        display: ["Orbitron", "monospace"],
        heading: ["Rajdhani", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      boxShadow: {
        "glow-cyan":
          "0 0 20px rgba(34,211,238,0.4), 0 0 40px rgba(34,211,238,0.1)",
        "glow-cyan-sm": "0 0 8px rgba(34,211,238,0.35)",
        "glow-purple":
          "0 0 20px rgba(168,85,247,0.4), 0 0 40px rgba(168,85,247,0.1)",
        "glow-purple-sm": "0 0 8px rgba(168,85,247,0.35)",
        "glow-indigo": "0 0 20px rgba(99,102,241,0.4)",
        "inner-glow": "inset 0 0 20px rgba(34,211,238,0.05)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
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
          "linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(ellipse at center, rgba(34,211,238,0.08) 0%, transparent 70%)",
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
