import { AnimatePresence, motion } from "framer-motion";
import { useHunterStore } from "../../stores/hunterStore.js";
import {
  levelUpOverlay,
  levelUpContent,
  levelUpNumber,
} from "../../lib/animations.js";
import { useAudio } from "../../hooks/useAudio.js";
import { useEffect } from "react";

export default function LevelUpCinematic() {
  const { levelUpData, clearLevelUp } = useHunterStore();
  const { playLevelUp } = useAudio();

  useEffect(() => {
    if (levelUpData) {
      playLevelUp();
      const timer = setTimeout(clearLevelUp, 3500);
      return () => clearTimeout(timer);
    }
  }, [levelUpData]);

  return (
    <AnimatePresence>
      {levelUpData && (
        <motion.div
          variants={levelUpOverlay}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-[100] flex items-center justify-center
                     bg-slate-950/85 backdrop-blur-sm"
          onClick={clearLevelUp}
        >
          {/* Particle rings */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 2 + i * 0.5, opacity: 0 }}
                transition={{ delay: 0.2 + i * 0.15, duration: 1 }}
              >
                <div className="w-48 h-48 rounded-full border border-cyan-400/40" />
              </motion.div>
            ))}
          </div>

          <motion.div
            variants={levelUpContent}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center"
          >
            <p className="font-display text-xs text-cyan-400 tracking-[0.4em] uppercase mb-6">
              — System Alert —
            </p>

            <div className="relative w-48 h-48 mx-auto mb-6">
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-br
                              from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500/50
                              shadow-glow-cyan animate-pulse-glow"
              />
              <div
                className="absolute inset-4 rounded-full bg-slate-950/80
                              border border-cyan-500/30 flex items-center justify-center"
              >
                <div>
                  <p className="font-display text-[10px] text-slate-400 tracking-widest mb-1">
                    LEVEL
                  </p>
                  <motion.p
                    variants={levelUpNumber}
                    initial="initial"
                    animate="animate"
                    className="font-display text-5xl font-black text-gradient-hero"
                  >
                    {levelUpData?.newLevel}
                  </motion.p>
                </div>
              </div>
            </div>

            <motion.div
              variants={levelUpNumber}
              initial="initial"
              animate="animate"
            >
              <h2 className="font-display text-2xl font-bold text-gradient-cyan mb-2">
                LEVEL UP
              </h2>
              <p className="font-heading text-slate-400">
                +{levelUpData?.xpEarned} XP · The System acknowledges your
                growth.
              </p>
            </motion.div>

            <motion.p
              className="mt-6 font-body text-xs text-slate-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
            >
              Tap to continue
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
