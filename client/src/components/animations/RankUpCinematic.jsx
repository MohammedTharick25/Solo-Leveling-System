import { AnimatePresence, motion } from "framer-motion";
import { useHunterStore } from "../../stores/hunterStore.js";
import { useAudio } from "../../hooks/useAudio.js";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Crown, Sparkles, X, Zap } from "lucide-react";
import { RANK_COLORS, RANK_GLOW } from "../../lib/xpFormulas.js";

const RANK_TIER = {
  Unawakened: 0,
  E: 1,
  D: 2,
  C: 3,
  B: 4,
  A: 5,
  S: 6,
  National: 7,
  Monarch: 8,
  "Shadow Monarch": 9,
};

export default function RankUpCinematic() {
  const { rankUpData, clearRankUp, levelUpData } = useHunterStore();
  const { playRankUp } = useAudio();
  const [showDetails, setShowDetails] = useState(false);

  // If a level-up and rank-up happen together, let the level-up cinematic finish first.
  // The rank cinematic then takes over without two full-screen overlays fighting each other.
  const visible = Boolean(rankUpData && !levelUpData);

  useEffect(() => {
    if (!visible) return;
    setShowDetails(false);
    playRankUp();

    const detailsTimer = setTimeout(() => setShowDetails(true), 1000);
    const closeTimer = setTimeout(clearRankUp, 6500);

    return () => {
      clearTimeout(detailsTimer);
      clearTimeout(closeTimer);
    };
  }, [visible, clearRankUp, playRankUp]);

  const previousRank = rankUpData?.previousRank;
  const newRank = rankUpData?.newRank;
  const rankColor = RANK_COLORS[newRank] || "text-cyan-400";
  const rankGlow = RANK_GLOW[newRank] || "";
  const previousTier = RANK_TIER[previousRank] || 0;
  const newTier = RANK_TIER[newRank] || 0;
  const steps = Math.max(1, newTier - previousTier);

  const message = useMemo(() => {
    if (newRank === "Shadow Monarch") return "The highest throne now recognizes you.";
    if (newRank === "Monarch") return "A realm of power has opened before you.";
    if (newRank === "National") return "Your presence now exceeds ordinary Hunter limits.";
    return "A new threshold has been crossed. Your system has evolved.";
  }, [newRank]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] overflow-hidden bg-slate-950/96 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label={`${newRank} rank achieved`}
        >
          <button type="button" onClick={clearRankUp} className="absolute inset-0 cursor-default" aria-label="Continue" />

          <motion.div
            className="absolute left-1/2 top-1/2 h-[55vw] w-[55vw] max-h-[650px] max-w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
            animate={{ scale: [0.8, 1.15, 0.9], opacity: [0.2, 0.45, 0.25] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ background: "rgba(139,92,246,.16)" }}
          />

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[min(80vw,700px)] w-[min(80vw,700px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/10 border-dashed"
          />

          <button
            type="button"
            onClick={clearRankUp}
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-500 transition hover:border-violet-400/20 hover:bg-violet-400/10 hover:text-white sm:right-6 sm:top-6"
            aria-label="Close rank up"
          >
            <X size={16} />
          </button>

          <div className="relative z-10 flex min-h-full items-center justify-center px-5 py-10 pointer-events-none">
            <div className="w-full max-w-3xl text-center pointer-events-auto">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex items-center justify-center gap-3"
              >
                <span className="h-px w-12 bg-gradient-to-r from-transparent to-violet-400/70 sm:w-24" />
                <Crown size={15} className="text-violet-300" />
                <p className="font-display text-[9px] font-black uppercase tracking-[0.45em] text-violet-300 sm:text-[10px]">
                  Rank Promotion Detected
                </p>
                <Crown size={15} className="text-violet-300" />
                <span className="h-px w-12 bg-gradient-to-l from-transparent to-violet-400/70 sm:w-24" />
              </motion.div>

              <div className="flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-10">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 0.45, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="order-2 text-center sm:order-1"
                >
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-600">Previous Rank</p>
                  <p className="mt-2 font-display text-3xl font-black text-slate-500 sm:text-4xl">{previousRank}</p>
                </motion.div>

                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.55 }}
                  className="order-3 flex items-center gap-2 sm:order-2"
                >
                  <span className="h-px w-10 bg-gradient-to-r from-transparent to-cyan-400/70" />
                  <ArrowRight size={18} className="text-cyan-400" />
                  <span className="h-px w-10 bg-gradient-to-l from-transparent to-cyan-400/70" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 30, scale: 0.75 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 110, damping: 14, delay: 0.4 }}
                  className={`order-1 relative flex h-48 w-48 items-center justify-center rounded-full border border-white/10 bg-slate-950 shadow-2xl sm:order-3 sm:h-56 sm:w-56 ${rankGlow}`}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-3 rounded-full border border-dashed border-violet-400/25"
                  />
                  <div className="absolute inset-9 rounded-full bg-violet-400/5 shadow-[0_0_90px_rgba(167,139,250,.22)]" />
                  <div className="relative">
                    <Sparkles size={18} className={`mx-auto mb-2 ${rankColor}`} />
                    <p className={`font-display text-6xl font-black ${rankColor} drop-shadow-[0_0_22px_rgba(167,139,250,.45)]`}>
                      {newRank}
                    </p>
                    <p className="mt-1 text-[8px] font-black uppercase tracking-[0.3em] text-slate-600">Rank</p>
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="mt-8"
              >
                <h2 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
                  Rank Ascension
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-slate-500 sm:text-sm">{message}</p>
              </motion.div>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-auto mt-7 grid max-w-md grid-cols-2 gap-3"
                  >
                    <div className="rounded-2xl border border-violet-400/10 bg-violet-400/5 px-4 py-4">
                      <Zap size={16} className="mx-auto mb-2 text-violet-300" />
                      <p className="font-display text-lg font-black text-white">+{steps}</p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">Rank Tier</p>
                    </div>
                    <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 px-4 py-4">
                      <Crown size={16} className="mx-auto mb-2 text-cyan-300" />
                      <p className="font-display text-lg font-black text-cyan-300">{newRank}</p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">New Status</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
                className="mt-8 text-[8px] font-black uppercase tracking-[0.3em] text-slate-700"
              >
                Tap anywhere or close to continue
              </motion.p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
