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
        className="relative glass-cyan rounded-2xl p-5 overflow-hidden mb-6"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 text-slate-600 hover:text-slate-400 transition-colors"
        >
          <X size={14} />
        </button>

        {!claimed ? (
          <div className="relative grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
            <div className="relative mx-auto grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 sm:mx-0">
              <div className="absolute inset-0 rounded-2xl bg-cyan-400/10 blur-xl" />
              <Gift size={24} className="relative text-cyan-300" />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <div className="mb-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <p className="text-system">System Reward</p>
                <span className="rounded-full border border-yellow-400/20 bg-yellow-400/5 px-2 py-0.5 font-display text-[9px] tracking-wider text-yellow-300">DAILY DROP</span>
              </div>
              <p className="font-heading text-base font-bold text-slate-100">Daily Login Bonus</p>
              <p className="mt-1 text-xs text-slate-400">Your reward is shown before you claim it.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/15 bg-cyan-400/5 px-2.5 py-1.5 font-display text-[11px] text-cyan-300"><Zap size={11} /> +{baseReward} XP base</span>
                {streakBonusPreview > 0 ? <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-400/15 bg-purple-400/5 px-2.5 py-1.5 font-display text-[11px] text-purple-300">🔥 +{streakBonusPreview} streak</span> : <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/40 px-2.5 py-1.5 text-[10px] text-slate-500">🔥 Streak bonus unlocks every 7 days</span>}
                <span className="inline-flex items-center rounded-lg border border-yellow-400/15 bg-yellow-400/5 px-2.5 py-1.5 font-display text-[11px] font-bold text-yellow-300">= +{rewardPreview} XP</span>
              </div>
            </div>
            <button onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending} className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm sm:w-auto">
              {claimMutation.isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" /> : <><Gift size={14} /> Claim Reward</>}
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-yellow-500/40 bg-yellow-500/10"><Zap size={22} className="text-yellow-300" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[10px] tracking-[0.2em] text-yellow-300">BONUS CLAIMED</p>
              <p className="mt-0.5 font-heading text-xl font-black text-slate-100">+{result?.xpEarned || 0} XP acquired</p>
              <p className="mt-1 text-xs text-slate-400">{result?.streakBonus > 0 ? `Includes +${result.streakBonus} XP streak bonus.` : "Base daily reward secured. Return tomorrow for another drop."}</p>
            </div>
            <button onClick={() => setVisible(false)} className="btn-ghost self-start sm:self-auto">Close</button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
