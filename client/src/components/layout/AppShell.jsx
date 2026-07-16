import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import TopNav from "./TopNav.jsx";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api.js";
import { useHunterStore } from "../../stores/hunterStore.js";

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { setHunter, setStats } = useHunterStore();

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
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          {/* Background radial glow */}
          <div className="pointer-events-none fixed inset-0 bg-hero-gradient opacity-60" />

          <div className="relative z-10 p-4 lg:p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
