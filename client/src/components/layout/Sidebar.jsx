import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  User,
  Scroll,
  Ghost,
  Sword,
  Castle,
  Timer,
  Target,
  BookOpen,
  Brain,
  BarChart3,
  Users,
  Settings,
  LogOut,
  X,
  Zap,
  CheckSquare,
  Trophy,
  Calendar,
} from "lucide-react";
import { useHunterStore } from "../../stores/hunterStore.js";
import { RANK_COLORS } from "../../lib/xpFormulas.js";
import api from "../../lib/api.js";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Command Center" },
  { to: "/hunter", icon: User, label: "Hunter Profile" },
  { to: "/quests", icon: Scroll, label: "Daily Quests" },
  { to: "/shadows", icon: Ghost, label: "Shadow Army" },
  { to: "/bosses", icon: Sword, label: "Boss Battles" },
  { to: "/dungeons", icon: Castle, label: "Dungeons" },
  { divider: true },
  { to: "/focus", icon: Timer, label: "Focus Mode" },
  { to: "/raids", icon: Target, label: "Task Raids" },
  { to: "/habits", icon: CheckSquare, label: "Habits" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/journal", icon: BookOpen, label: "Journal" },
  { to: "/brain", icon: Brain, label: "Second Brain" },
  { divider: true },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/achievements", icon: Trophy, label: "Achievements" },
  { to: "/social", icon: Users, label: "Guild & Social" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar({ open, onClose }) {
  // 1. Get user from store to access avatar
  const { hunter, user, clearAuth } = useHunterStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    clearAuth();
    navigate("/login");
  };

  const rankColor = RANK_COLORS[hunter?.rank] || "text-slate-400";

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 bg-slate-950/95 border-r border-slate-800/60 shrink-0">
        {/* Pass user prop here */}
        <SidebarContent
          hunter={hunter}
          user={user}
          rankColor={rankColor}
          onLogout={handleLogout}
        />
      </aside>
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 z-30 w-60 flex flex-col bg-slate-950/98 border-r border-slate-800/60 lg:hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
            {/* Pass user prop here too */}
            <SidebarContent
              hunter={hunter}
              user={user}
              rankColor={rankColor}
              onLogout={handleLogout}
              onNav={onClose}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

// 2. Update SidebarContent to receive and render the user image
function SidebarContent({ hunter, user, rankColor, onLogout, onNav }) {
  return (
    <>
      <div className="p-5 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shadow-glow-cyan-sm">
            <Zap size={16} className="text-cyan-400" />
          </div>
          <div>
            <p className="font-display text-xs text-cyan-400 tracking-widest">
              SOLO LEVELING
            </p>
            <p className="font-heading text-[10px] text-slate-500 tracking-wider uppercase">
              The System
            </p>
          </div>
        </div>
      </div>

      {hunter && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <div className="flex items-center gap-2.5">
            {/* 3. Updated Image Circle Logic */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-500/30 flex items-center justify-center shrink-0 overflow-hidden">
              {user?.avatar?.url ? (
                <img
                  src={user.avatar.url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // If image fails, revert to initial
                    e.target.style.display = "none";
                    e.target.parentElement.innerHTML = `<span class="font-display text-sm text-cyan-400">${hunter.hunterName?.[0]?.toUpperCase()}</span>`;
                  }}
                />
              ) : (
                <span className="font-display text-sm text-cyan-400">
                  {hunter.hunterName?.[0]?.toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="font-heading font-semibold text-sm text-slate-100 truncate">
                {hunter.hunterName}
              </p>
              <p
                className={`font-display text-[10px] tracking-wider ${rankColor}`}
              >
                {hunter.rank} RANK · LV.{hunter.level}
              </p>
            </div>
          </div>
          <div className="mt-2.5 xp-bar-track">
            <div
              className="xp-bar-fill"
              style={{ width: `${hunter.xpProgress || 0}%` }}
            />
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto no-scrollbar py-3 px-2">
        {NAV_ITEMS.map((item, i) => {
          if (item.divider)
            return <div key={i} className="divider mx-2 my-1" />;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNav}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-200 font-heading font-medium text-sm tracking-wide
                 ${isActive ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-glow-cyan-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`
              }
            >
              <Icon size={16} className="shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800/60">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-heading text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </>
  );
}
