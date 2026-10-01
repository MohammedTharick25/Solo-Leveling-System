import { AnimatePresence, motion } from "framer-motion";
import { useHunterStore } from "../../stores/hunterStore.js";
import { useAudio } from "../../hooks/useAudio.js";
import { useEffect, useMemo, useState } from "react";
import { Zap, Sparkles, ArrowUp, X } from "lucide-react";

const PARTICLES = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 61) % 100}%`,
  delay: (index % 9) * 0.08,
  duration: 1.8 + (index % 5) * 0.35,
  size: 2 + (index % 3),
}));

export default function LevelUpCinematic() {
  const { levelUpData, clearLevelUp } = useHunterStore();
  const { playLevelUp } = useAudio();
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!levelUpData) return;
    setShowDetails(false);
    playLevelUp();

    const detailsTimer = setTimeout(() => setShowDetails(true), 900);
    const closeTimer = setTimeout(clearLevelUp, 6000);

    return () => {
      clearTimeout(detailsTimer);
      clearTimeout(closeTimer);
    };
  }, [levelUpData, clearLevelUp, playLevelUp]);

  const xp = Number(levelUpData?.xpEarned || 0);
  const previousLevel = levelUpData?.previousLevel;
  const newLevel = levelUpData?.newLevel;

  const xpLabel = useMemo(() => {
    if (xp >= 1000) return `+${(xp / 1000).toFixed(1)}K XP`;
    return `+${xp} XP`;
  }, [xp]);

  return (
    <AnimatePresence>
      {levelUpData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[100] overflow-hidden bg-slate-950/95 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label={`Level ${newLevel} achieved`}
        >
          {/* Atmospheric energy */}
          <motion.div
            className="absolute left-1/2 top-1/2 h-[55vw] w-[55vw] max-h-[620px] max-w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[90px]"
            animate={{ scale: [0.85, 1.12, 0.95], opacity: [0.25, 0.5, 0.3] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {PARTICLES.map((particle) => (
              <motion.span
                key={particle.id}
                className="absolute rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.9)]"
                style={{
                  left: particle.left,
                  top: particle.top,
                  width: particle.size,
                  height: particle.size,
                }}
                initial={{ opacity: 0, scale: 0, y: 20 }}
                animate={{
                  opacity: [0, 0.9, 0],
                  scale: [0, 1, 0.4],
                  y: [-10, -90 - particle.id * 2],
                }}
                transition={{
                  delay: particle.delay,
                  duration: particle.duration,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={clearLevelUp}
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-500 transition hover:border-cyan-400/20 hover:bg-cyan-400/10 hover:text-white sm:right-6 sm:top-6"
            aria-label="Close level up"
          >
            <X size={16} />
          </button>

          <div className="relative z-10 flex min-h-full items-center justify-center px-5 py-10 pointer-events-none">
            <div className="w-full max-w-2xl text-center pointer-events-auto">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="mb-7 flex items-center justify-center gap-3"
              >
                <span className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-400/70 sm:w-20" />
                <Sparkles size={14} className="text-cyan-400" />
                <p className="font-display text-[9px] font-black uppercase tracking-[0.45em] text-cyan-400 sm:text-[10px]">
                  System Notification
                </p>
                <Sparkles size={14} className="text-cyan-400" />
                <span className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-400/70 sm:w-20" />
              </motion.div>

              {/* Core level emblem */}
              <div className="relative mx-auto h-56 w-56 sm:h-64 sm:w-64">
                <motion.div
                  initial={{ scale: 0.3, opacity: 0, rotate: -90 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.1 }}
                  className="absolute inset-0 rounded-full border border-cyan-300/20"
                />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-3 rounded-full border border-dashed border-cyan-400/30"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-9 rounded-full border border-violet-400/20"
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  className="absolute inset-16 rounded-full bg-cyan-400/10 shadow-[0_0_80px_rgba(34,211,238,.28)]"
                />

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="mb-1 text-[9px] font-black uppercase tracking-[0.35em] text-slate-500">
                    Level
                  </span>
                  <motion.span
                    initial={{ opacity: 0, scale: 1.8, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ delay: 0.45, duration: 0.75, ease: "easeOut" }}
                    className="font-display text-7xl font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-200 to-cyan-500 drop-shadow-[0_0_25px_rgba(34,211,238,.55)] sm:text-8xl"
                  >
                    {newLevel}
                  </motion.span>
                  <div className="mt-2 flex items-center gap-1.5 text-cyan-400">
                    <ArrowUp size={12} />
                    <span className="text-[8px] font-black uppercase tracking-[0.25em]">
                      Ascended
                    </span>
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="mt-7"
              >
                <p className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
                  Level Up
                </p>
                <p className="mt-2 text-xs font-medium text-slate-500 sm:text-sm">
                  {previousLevel ? `Level ${previousLevel} → Level ${newLevel}` : `Level ${newLevel} achieved`}
                </p>
              </motion.div>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mx-auto mt-7 grid max-w-md grid-cols-2 gap-3"
                  >
                    <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 px-4 py-4">
                      <Zap size={16} className="mx-auto mb-2 text-cyan-400" />
                      <p className="font-display text-lg font-black text-cyan-300">{xpLabel}</p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">
                        Reward Earned
                      </p>
                    </div>
                    <div className="rounded-2xl border border-violet-400/10 bg-violet-400/5 px-4 py-4">
                      <ArrowUp size={16} className="mx-auto mb-2 text-violet-400" />
                      <p className="font-display text-lg font-black text-violet-300">+1</p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">
                        Level
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6 }}
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
