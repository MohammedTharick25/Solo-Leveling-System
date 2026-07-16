import { AnimatePresence, motion } from "framer-motion";
import { useHunterStore } from "../../stores/hunterStore.js";
import {
  rankUpOverlay,
  rankUpBadge,
  rankUpText,
} from "../../lib/animations.js";
import { useAudio } from "../../hooks/useAudio.js";
import { useEffect } from "react";
import { RANK_COLORS, RANK_GLOW } from "../../lib/xpFormulas.js";

export default function RankUpCinematic() {
  const { rankUpData, clearRankUp } = useHunterStore();
  const { playRankUp } = useAudio();

  useEffect(() => {
    if (rankUpData) {
      playRankUp();
      const timer = setTimeout(clearRankUp, 5000);
      return () => clearTimeout(timer);
    }
  }, [rankUpData]);

  const rankColor = RANK_COLORS[rankUpData?.newRank] || "text-cyan-400";
  const rankGlow = RANK_GLOW[rankUpData?.newRank] || "";

  return (
    <AnimatePresence>
      {rankUpData && (
        <motion.div
          variants={rankUpOverlay}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-[100] flex items-center justify-center
                     bg-slate-950/90 backdrop-blur-md"
          onClick={clearRankUp}
        >
          {/* Sweeping light beam */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{ delay: 0.5, duration: 1.5 }}
            style={{
              background:
                "conic-gradient(from 90deg at 50% 50%, transparent 30%, rgba(34,211,238,0.3) 50%, transparent 70%)",
            }}
          />

          <div className="text-center px-8">
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-xs text-slate-500 tracking-[0.5em] uppercase mb-10"
            >
              ─ Rank Promotion ─
            </motion.p>

            {/* Before → After */}
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="text-center opacity-40">
                <p className="font-display text-xs text-slate-500 tracking-widest mb-2">
                  BEFORE
                </p>
                <p className={`font-display text-2xl font-bold text-slate-400`}>
                  {rankUpData?.previousRank}
                </p>
              </div>

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="w-12 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              />

              <motion.div
                variants={rankUpBadge}
                initial="initial"
                animate="animate"
                className="text-center"
              >
                <p className="font-display text-xs text-cyan-400 tracking-widest mb-2">
                  NOW
                </p>
                <p
                  className={`font-display text-4xl font-black ${rankColor} ${rankGlow}`}
                >
                  {rankUpData?.newRank}
                </p>
                <p className="font-heading text-xs text-slate-500 tracking-widest mt-1">
                  RANK
                </p>
              </motion.div>
            </div>

            <motion.div
              variants={rankUpText}
              initial="initial"
              animate="animate"
            >
              <h2 className="font-display text-xl font-bold text-gradient-hero mb-3">
                RANK ASCENSION
              </h2>
              <p className="font-heading text-slate-400 max-w-xs mx-auto leading-relaxed">
                You have crossed the threshold. New power, new features, new
                challenges await.
              </p>
            </motion.div>

            <motion.p
              className="mt-8 font-body text-xs text-slate-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3 }}
            >
              Tap to continue
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
