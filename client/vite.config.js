import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        rollupFormat: "iife",
      },
      manifest: {
        name: "Solo Leveling — Personal Evolution OS",
        short_name: "Solo Leveling",
        description: "The System. Your Personal Evolution Operating System.",
        start_url: "/",
        display: "standalone",
        background_color: "#020617",
        theme_color: "#22d3ee",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
        categories: ["productivity", "lifestyle", "health"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run\/router)\//.test(id)) return "framework";
          if (/node_modules\/(recharts|d3(?:-[^/]+)?|internmap|delaunator|robust-predicates)\//.test(id)) return "charts";
          if (id.includes("/node_modules/framer-motion/")) return "motion";
          if (id.includes("/node_modules/lucide-react/")) return "icons";
          if (id.includes("/node_modules/@tanstack/")) return "query";
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
