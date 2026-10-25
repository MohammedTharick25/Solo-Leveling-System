import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
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
  CheckSquare,
  Trophy,
  Calendar,
  Bot,
  CreditCard,
  LockKeyhole,
  Clock3,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useHunterStore } from "../../stores/hunterStore.js";
import { RANK_COLORS } from "../../lib/xpFormulas.js";
import api from "../../lib/api.js";
import { hasTierAccess, PREMIUM_FEATURES } from "../../lib/planAccess.js";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Command Center" },
  { to: "/hunter", icon: User, label: "Hunter Profile" },
  { to: "/quests", icon: Scroll, label: "Daily Quests" },
  { to: "/shadows", icon: Ghost, label: "Shadow Army", feature: "shadows" },
  { to: "/bosses", icon: Sword, label: "Boss Battles", feature: "bosses" },
  { to: "/dungeons", icon: Castle, label: "Dungeons", feature: "dungeons" },
  { divider: true },
  { to: "/focus", icon: Timer, label: "Focus Mode" },
  { to: "/raids", icon: Target, label: "Task Raids", feature: "raids" },
  { to: "/habits", icon: CheckSquare, label: "Habits" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/journal", icon: BookOpen, label: "Journal" },
  { to: "/brain", icon: Brain, label: "Second Brain", feature: "brain" },
  { divider: true },
  { to: "/analytics", icon: BarChart3, label: "Analytics", feature: "analytics" },
  { to: "/ai-coach", icon: Bot, label: "AI Hunter Coach", feature: "ai-coach" },
  { to: "/achievements", icon: Trophy, label: "Achievements" },
  { to: "/social", icon: Users, label: "Guild & Social" },
  { to: "/billing", icon: CreditCard, label: "Plans & Billing" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar({ open, onClose, triggerRef }) {
  // 1. Get user from store to access avatar
  const { hunter, user, clearAuth } = useHunterStore();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);
  const closeButtonRef = useRef(null);
  const billingQuery = useQuery({
    queryKey: ["billing-me"],
    queryFn: async () => (await api.get("/billing/me")).data.data,
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: Boolean(useHunterStore.getState().token),
    retry: 1,
  });
  const effectiveTier = billingQuery.data?.effectiveTier || "free";

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = sidebarRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !sidebarRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sidebarRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef?.current?.focus();
    };
  }, [open, onClose, triggerRef]);

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
          billing={billingQuery.data}
          effectiveTier={effectiveTier}
          rankColor={rankColor}
          onLogout={handleLogout}
        />
      </aside>
      <AnimatePresence>
        {open && (
          <motion.aside
            id="mobile-sidebar"
            ref={sidebarRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 z-30 w-60 flex flex-col bg-slate-950/98 border-r border-slate-800/60 lg:hidden"
          >
            <button
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
              aria-label="Close navigation menu"
              className="absolute top-3 right-3 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              <X size={18} />
            </button>
            {/* Pass user prop here too */}
            <SidebarContent
              hunter={hunter}
              user={user}
              billing={billingQuery.data}
              effectiveTier={effectiveTier}
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
function SidebarContent({ hunter, user, billing, rankColor, onLogout, onNav, effectiveTier }) {
  const tier = billing?.effectiveTier || effectiveTier || "free";
  const accessEnd = billing?.isTrialing
    ? billing.trialEndsAt
    : billing?.upgradeAccessUntil || billing?.currentPeriodEnd;
  const accessDate = accessEnd
    ? new Date(accessEnd).toLocaleDateString(undefined, { day: "numeric", month: "short" })
    : null;
  const daysRemaining = Number(billing?.daysRemaining || 0);
  const isPaidTier = tier !== "free";
  const planCaption = billing?.isTrialing
    ? `Trial · ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`
    : isPaidTier
      ? `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`
      : billing?.hasChosenPlan
        ? "Free plan active"
        : "Choose your plan";
  const renewalCaption = accessDate
    ? `${billing?.cancelAtCycleEnd ? "Access until" : billing?.isTrialing ? "Trial ends" : "Next billing"} ${accessDate}`
    : isPaidTier
      ? "Plan access is active"
      : "Core quests, goals and focus";

  return (
    <>
      <div className="p-5 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Solo Leveling"
            className="w-8 h-8 rounded-lg shadow-glow-cyan-sm"
          />
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

      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto no-scrollbar py-3 px-2">
        {NAV_ITEMS.map((item, i) => {
          if (item.divider)
            return <div key={i} className="divider mx-2 my-1" />;
          const Icon = item.icon;
          const requiredTier = item.feature ? PREMIUM_FEATURES[item.feature]?.requiredTier : null;
          const locked = requiredTier && !hasTierAccess(effectiveTier, requiredTier);
          return (
            <NavLink
              key={item.to}
              to={locked ? `/billing?feature=${encodeURIComponent(item.feature)}&required=${requiredTier}` : item.to}
              state={locked ? { from: item.to } : undefined}
              onClick={onNav}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-200 font-heading font-medium text-sm tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300
                 ${isActive ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-glow-cyan-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`
              }
            >
              <Icon size={16} className="shrink-0" />
              <span className="min-w-0 flex-1">{item.label}</span>
              {locked && <LockKeyhole size={13} aria-label={`${requiredTier} plan feature`} title={`Included in ${requiredTier === "monarch" ? "Monarch" : "Hunter"}`} className={`shrink-0 ${requiredTier === "monarch" ? "text-amber-300" : "text-slate-200"}`} />}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800/60">
        {billing && (
          <Link
            to="/billing"
            onClick={onNav}
            className={`mb-2 block rounded-xl border p-3 transition-colors ${
              billing?.isTrialing
                ? "border-violet-300/20 bg-violet-300/[0.06] hover:bg-violet-300/[0.1]"
                : isPaidTier
                  ? "border-cyan-300/15 bg-cyan-300/[0.04] hover:bg-cyan-300/[0.08]"
                  : "border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                {billing?.isTrialing ? (
                  <Sparkles size={14} className="shrink-0 text-violet-200" />
                ) : isPaidTier ? (
                  <Clock3 size={14} className="shrink-0 text-cyan-200" />
                ) : (
                  <CreditCard size={14} className="shrink-0 text-slate-400" />
                )}
                <span className="truncate font-heading text-[11px] font-bold capitalize text-slate-100">
                  {billing?.isTrialing ? "Monarch trial" : `${tier} plan`}
                </span>
              </span>
              {!isPaidTier && <ArrowUpRight size={13} className="shrink-0 text-cyan-300" />}
            </div>
            <p className={`mt-1 pl-[22px] text-[10px] font-semibold ${billing?.isTrialing ? "text-violet-100" : isPaidTier ? "text-cyan-100" : "text-slate-400"}`}>
              {planCaption}
            </p>
            <p className="mt-0.5 pl-[22px] text-[9px] text-slate-500">{renewalCaption}</p>
          </Link>
        )}
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
