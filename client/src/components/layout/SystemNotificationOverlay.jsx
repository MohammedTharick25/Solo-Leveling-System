/**
 * SystemNotificationOverlay
 *
 * Shows REAL-TIME toast popups ONLY — triggered by socket events.
 * These are items added to the store via addNotification() from useSocket.js.
 *
 * Does NOT show on bell panel click.
 * Auto-dismisses after 5s. Clicking × marks as read and removes.
 */
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useHunterStore } from "../../stores/hunterStore.js";
import {
  Zap,
  Star,
  Ghost,
  Sword,
  Shield,
  CheckCircle2,
  Trophy,
  Flame,
  X,
} from "lucide-react";
import api from "../../lib/api.js";

const TYPE_CONFIG = {
  levelUp: {
    icon: Star,
    color: "border-yellow-500/70",
    bg: "bg-yellow-950/95",
    iconColor: "text-yellow-400",
    label: "LEVEL UP",
  },
  rankUp: {
    icon: Zap,
    color: "border-purple-500/70",
    bg: "bg-purple-950/95",
    iconColor: "text-purple-400",
    label: "RANK UP",
  },
  shadowEvolved: {
    icon: Ghost,
    color: "border-cyan-500/70",
    bg: "bg-cyan-950/95",
    iconColor: "text-cyan-400",
    label: "SHADOW EVOLVED",
  },
  shadowUnlocked: {
    icon: Ghost,
    color: "border-cyan-500/70",
    bg: "bg-cyan-950/95",
    iconColor: "text-cyan-400",
    label: "SHADOW UNLOCKED",
  },
  bossAppeared: {
    icon: Sword,
    color: "border-red-500/70",
    bg: "bg-red-950/95",
    iconColor: "text-red-400",
    label: "BOSS ALERT",
  },
  bossDefeated: {
    icon: Trophy,
    color: "border-yellow-500/70",
    bg: "bg-yellow-950/95",
    iconColor: "text-yellow-400",
    label: "BOSS DEFEATED",
  },
  questCompleted: {
    icon: CheckCircle2,
    color: "border-emerald-500/70",
    bg: "bg-emerald-950/95",
    iconColor: "text-emerald-400",
    label: "QUEST COMPLETE",
  },
  achievementUnlocked: {
    icon: Trophy,
    color: "border-yellow-500/70",
    bg: "bg-yellow-950/95",
    iconColor: "text-yellow-400",
    label: "ACHIEVEMENT",
  },
  streakMilestone: {
    icon: Flame,
    color: "border-orange-500/70",
    bg: "bg-orange-950/95",
    iconColor: "text-orange-400",
    label: "STREAK",
  },
  systemAlert: {
    icon: Zap,
    color: "border-cyan-500/70",
    bg: "bg-slate-950/95",
    iconColor: "text-cyan-400",
    label: "SYSTEM",
  },
  systemWarning: {
    icon: Zap,
    color: "border-red-500/70",
    bg: "bg-red-950/95",
    iconColor: "text-red-400",
    label: "WARNING",
  },
};

// Types that should show as real-time toasts
const TOAST_TYPES = new Set([
  "levelUp",
  "rankUp",
  "shadowEvolved",
  "shadowUnlocked",
  "bossAppeared",
  "bossDefeated",
  "questCompleted",
  "achievementUnlocked",
  "streakMilestone",
  "dungeonCompleted",
]);

export default function SystemNotificationOverlay() {
  const { toastQueue, removeToast } = useHunterStore();

  return (
    <div
      className="fixed bottom-6 right-6 flex flex-col-reverse gap-3 pointer-events-none"
      style={{ zIndex: 99999, maxWidth: "340px", width: "calc(100vw - 3rem)" }}
    >
      <AnimatePresence mode="popLayout">
        {toastQueue.slice(0, 3).map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.systemAlert;
  const Icon = config.icon;

  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [toast.id]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={`pointer-events-auto w-full rounded-2xl border backdrop-blur-xl
                  shadow-[0_8px_40px_rgba(0,0,0,0.7)] overflow-hidden
                  ${config.color} ${config.bg}`}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0
                          bg-current/10 ${config.iconColor}`}
        >
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`font-display text-[9px] tracking-[0.2em] uppercase mb-0.5 ${config.iconColor}`}
          >
            {config.label}
          </p>
          <p className="font-heading text-sm font-semibold text-slate-100 leading-snug">
            {toast.title}
          </p>
          <p className="font-body text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
            {toast.message}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 text-slate-500 hover:text-slate-200 transition-colors
                     w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-800/60"
        >
          <X size={13} />
        </button>
      </div>

      {/* Countdown bar */}
      <div className="h-0.5 bg-slate-800/60 mx-4 mb-3 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${config.iconColor.replace("text-", "bg-")}`}
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 5, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}

export { TOAST_TYPES };
