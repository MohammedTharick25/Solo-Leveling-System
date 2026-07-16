import { useState, useRef } from "react";
import { Menu, Bell, Flame, Star } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useHunterStore } from "../../stores/hunterStore.js";
import { RANK_COLORS, formatXP } from "../../lib/xpFormulas.js";
import NotificationPanel from "./NotificationPanel.jsx";

export default function TopNav({ onMenuClick }) {
  const { hunter, unreadCount } = useHunterStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const rankColor = RANK_COLORS[hunter?.rank] || "text-slate-400";

  const handleBellClick = (e) => {
    e.stopPropagation();
    setNotifOpen((v) => !v);
  };

  return (
    <header
      className="h-14 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60
                  flex items-center px-4 gap-4 shrink-0"
      style={{ position: "relative", zIndex: 200 }}
    >
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 text-slate-400 hover:text-slate-200 transition-colors rounded-lg"
      >
        <Menu size={20} />
      </button>

      {/* System status pill */}
      <div className="hidden sm:flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-display text-[10px] text-emerald-400 tracking-widest uppercase">
          System Online
        </span>
      </div>

      <div className="flex-1" />

      {/* HUD stats — desktop only */}
      {hunter && (
        <div className="hidden md:flex items-center gap-4">
          <HudStat
            icon={<Star size={11} className="text-yellow-400" />}
            label="LV"
            value={hunter.level}
          />
          <HudStat
            icon={<Flame size={11} className="text-orange-400" />}
            label="STREAK"
            value={`${hunter.currentStreak || 0}d`}
          />
          <div className="h-4 w-px bg-slate-800" />
          <span
            className={`font-display text-[11px] tracking-widest ${rankColor}`}
          >
            {hunter.rank} RANK
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <span className="font-heading text-xs text-cyan-400 font-semibold">
            {formatXP(hunter.totalXP)} XP
          </span>
        </div>
      )}

      {/* Bell button + panel container */}
      <div className="relative flex items-center">
        <button
          onClick={handleBellClick}
          className="relative p-2 rounded-xl text-slate-400 hover:text-slate-100
                     hover:bg-slate-800/70 transition-all duration-200"
        >
          <Bell size={18} />

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1
                          rounded-full bg-red-500 border border-slate-950
                          text-white font-display text-[9px] font-bold
                          flex items-center justify-center
                          shadow-[0_0_8px_rgba(239,68,68,0.7)]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Panel renders here — inside the relative container */}
        <AnimatePresence>
          {notifOpen && (
            <NotificationPanel onClose={() => setNotifOpen(false)} />
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

function HudStat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="font-heading text-[10px] text-slate-600 tracking-wider uppercase">
        {label}
      </span>
      <span className="font-display text-[11px] text-slate-200 font-bold">
        {value}
      </span>
    </div>
  );
}
