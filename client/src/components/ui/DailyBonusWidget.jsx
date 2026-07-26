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

  // Also check server-side on mount in case localStorage was cleared
  useQuery({
    queryKey: ["daily-bonus-status"],
    queryFn: async () => {
      const { data } = await api.post("/auth/daily-bonus");
      return data.data;
    },
    enabled: visible && !claimed,
    onSuccess: (res) => {
      if (res.alreadyClaimed) {
        // Server says already claimed — mark locally and hide
        markClaimedToday();
        setVisible(false);
      }
    },
    retry: false,
    // Don't auto-claim on mount check — we use a separate claim button
    // This just checks status. We'll actually use the mutation for claiming.
  });

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
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40
                            flex items-center justify-center shrink-0 animate-float"
            >
              <Gift size={22} className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-system mb-0.5">System Reward</p>
              <p className="font-heading font-bold text-base text-slate-100">
                Daily Login Bonus
              </p>
              <p className="font-body text-xs text-slate-400 mt-0.5">
                {hunter?.currentStreak > 0
                  ? `${hunter.currentStreak}-day streak bonus available`
                  : "Claim your daily XP reward"}
              </p>
            </div>
            <button
              onClick={() => claimMutation.mutate()}
              disabled={claimMutation.isPending}
              className="btn-primary py-2 px-4 text-sm shrink-0 flex items-center gap-2"
            >
              {claimMutation.isPending ? (
                <span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              ) : (
                <>
                  <Gift size={14} /> Claim
                </>
              )}
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4"
          >
            <div
              className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40
                            flex items-center justify-center shrink-0"
            >
              <Zap size={22} className="text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="font-display text-xs text-yellow-400 tracking-widest mb-1">
                BONUS CLAIMED
              </p>
              <p className="font-heading font-bold text-xl text-slate-100">
                +{result?.xpEarned} XP
              </p>
              {result?.streakBonus > 0 && (
                <p className="font-body text-xs text-slate-400 mt-0.5">
                  Includes +{result.streakBonus} XP streak bonus
                </p>
              )}
            </div>
            <button
              onClick={() => setVisible(false)}
              className="btn-ghost py-2 px-3 text-sm"
            >
              Close
            </button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
