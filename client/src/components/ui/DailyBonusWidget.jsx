import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, X, Zap } from "lucide-react";
import api from "../../lib/api.js";
import { useAudio } from "../../hooks/useAudio.js";
import { useHunterStore } from "../../stores/hunterStore.js";

// ── Persist claim state in localStorage keyed by today's date ────────────────
const getTodayKey = () =>
  `daily-bonus-claimed-${new Date().toISOString().split("T")[0]}`;
const isClaimedToday = () => localStorage.getItem(getTodayKey()) === "true";
const markClaimedToday = () => localStorage.setItem(getTodayKey(), "true");

export default function DailyBonusWidget() {
  // If already claimed today (from localStorage), don't even mount the widget
  const [visible, setVisible] = useState(!isClaimedToday());
  const [claimed, setClaimed] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();
  const { playLevelUp } = useAudio();
  // NOTE: also pull setHunter/setStats so we can sync the store directly
  // instead of hoping invalidateQueries reaches whichever component owns
  // the "hunter" query.
  const { hunter, setHunter, setStats } = useHunterStore();

  const streak = hunter?.currentStreak || 0;
  const streakBonusPreview = Math.min(Math.floor(streak / 7) * 10, 100);
  const baseReward = 25;
  const rewardPreview = baseReward + streakBonusPreview;

  const claimMutation = useMutation({
    mutationFn: () => api.post("/auth/daily-bonus"),
    onSuccess: async ({ data }) => {
      const res = data.data;
      setResult(res);
      if (!res.alreadyClaimed) {
        setClaimed(true);
        markClaimedToday();
        playLevelUp();

        // ── Fix: pull the fresh hunter/stats and push straight into the
        // store. This guarantees powerScore/XP on screen update the moment
        // the claim resolves, instead of depending on some other mounted
        // query's onSuccess to eventually refresh Zustand.
        try {
          const { data: profile } = await api.get("/hunter/me");
          setHunter(profile.data.hunter);
          setStats(profile.data.stats);
        } catch (err) {
          console.warn(
            "[DailyBonus] Failed to refresh hunter profile after claim:",
            err.message,
          );
        }

        // Still invalidate so any other cached copies (e.g. React Query
        // consumers) eventually reconcile too.
        queryClient.invalidateQueries({ queryKey: ["hunter"] });
        queryClient.invalidateQueries({ queryKey: ["quests"] });
        // Auto-hide after 4 seconds
        setTimeout(() => setVisible(false), 4000);
      } else {
        markClaimedToday();
        setVisible(false);
      }
    },
  });

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.97 }}
        className="relative glass-cyan mb-4 overflow-hidden rounded-xl p-3 sm:p-3.5"
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-cyan-500/[0.07] blur-2xl" />

        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss daily reward"
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md text-slate-600 transition-colors hover:bg-slate-800/70 hover:text-slate-300"
        >
          <X size={13} />
        </button>

        {!claimed ? (
          <div className="relative grid gap-2.5 pr-7 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:pr-8">
            <div className="relative mx-auto grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] sm:mx-0">
              <Gift size={16} className="relative text-cyan-300" />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <div className="mb-0.5 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                <p className="font-display text-[9px] uppercase tracking-[0.16em] text-cyan-300">Daily reward</p>
                <span className="rounded-full border border-yellow-400/20 bg-yellow-400/[0.04] px-1.5 py-0.5 font-display text-[8px] tracking-wider text-yellow-300">LOGIN BONUS</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                <p className="font-heading text-sm font-bold text-slate-100">Daily login bonus</p>
                <span className="inline-flex items-center gap-1 rounded-md border border-cyan-400/15 bg-cyan-400/[0.04] px-1.5 py-1 font-display text-[10px] text-cyan-300"><Zap size={10} /> +{baseReward}</span>
                {streakBonusPreview > 0 && <span className="rounded-md border border-purple-400/15 bg-purple-400/[0.04] px-1.5 py-1 font-display text-[10px] text-purple-300">+{streakBonusPreview} streak</span>}
                <span className="rounded-md border border-yellow-400/15 bg-yellow-400/[0.04] px-1.5 py-1 font-display text-[10px] font-bold text-yellow-300">+{rewardPreview} XP total</span>
              </div>
            </div>
            <button onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending} className="btn-primary flex w-full items-center justify-center gap-2 px-3 py-2 text-xs sm:w-auto">
              {claimMutation.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" /> : <><Gift size={14} /> Claim Reward</>}
            </button>
            {claimMutation.isError && (
              <p role="alert" className="text-center text-[11px] text-red-300 sm:col-start-2 sm:col-span-2 sm:text-left">
                {claimMutation.error?.response?.data?.message || "Could not claim your reward. Check your connection and try again."}
              </p>
            )}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-yellow-500/30 bg-yellow-500/[0.06]"><Zap size={16} className="text-yellow-300" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[9px] tracking-[0.16em] text-yellow-300">BONUS CLAIMED</p>
              <p className="mt-0.5 font-heading text-base font-bold text-slate-100">+{result?.xpEarned || 0} XP acquired</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{result?.streakBonus > 0 ? `Includes +${result.streakBonus} XP streak bonus.` : "Base daily reward secured. Return tomorrow for another drop."}</p>
            </div>
            <button onClick={() => setVisible(false)} className="btn-ghost self-start px-3 py-1.5 text-xs sm:self-auto">Close</button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
