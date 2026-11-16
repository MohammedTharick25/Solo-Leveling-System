import { useCallback, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import Sidebar from "./Sidebar.jsx";
import TopNav from "./TopNav.jsx";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api.js";
import { useHunterStore } from "../../stores/hunterStore.js";

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const { user, setUser, setHunter, setStats, setSettings } = useHunterStore();
  const reduceMotion = useReducedMotion();

  useQuery({
    queryKey: ["user-me", user?._id || user?.id || "current"],
    queryFn: async () => {
      const { data } = await api.get("/users/me");
      setUser(data.data.user);
      return data.data.user;
    },
    staleTime: user ? 1000 * 60 * 5 : 0,
  });


  // Fetch server-side settings on every authenticated app mount so notification
  // and preference changes survive refreshes and are never based only on localStorage.
  useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const { data } = await api.get("/users/me/settings");
      setSettings(data.data.settings);
      return data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch hunter profile on mount
  useQuery({
    queryKey: ["hunter"],
    queryFn: async () => {
      const { data } = await api.get("/hunter/me");
      setHunter(data.data.hunter);
      setStats(data.data.stats);
      return data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="flex h-screen min-h-0 bg-slate-950 overflow-hidden" style={{ height: "100dvh" }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-xl focus:bg-cyan-300 focus:px-4 focus:py-3 focus:font-bold focus:text-slate-950"
      >
        Skip to main content
      </a>
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={closeSidebar} triggerRef={menuButtonRef} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          aria-hidden="true"
          role="presentation"
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <TopNav onMenuClick={() => setSidebarOpen((open) => !open)} menuOpen={sidebarOpen} menuButtonRef={menuButtonRef} />

        <main id="main-content" tabIndex={-1} className="flex-1 min-h-0 overflow-y-auto focus:outline-none">
          {/* Background radial glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 opacity-70"
            style={{
              background: "radial-gradient(ellipse at 86% 0%, rgb(var(--accent-300) / 16%), transparent 32%), radial-gradient(ellipse at 3% 78%, rgb(var(--accent-2) / 10%), transparent 34%)",
              animation: reduceMotion ? "none" : "aurora-drift 22s var(--ease-in-out) infinite",
            }}
          />

          <div className="relative z-10 p-4 lg:p-6 max-w-7xl mx-auto">
            <div className="route-view">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
