import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Zap } from "lucide-react";

const STEPS = [
  {
    title: "Welcome to The System",
    description:
      "You have been chosen. This platform tracks your growth, assigns daily quests, and transforms real habits into a leveling experience. Complete the tour to understand how The System works.",
    emoji: "⚡",
  },
  {
    title: "Daily Quests",
    description:
      "Every day The System assigns exactly 5 quests targeting your weakest stats. Complete ALL 5 before midnight to maintain your streak. Miss them and your streak resets with an XP penalty.",
    emoji: "📜",
  },
  {
    title: "Habit Tracker",
    description:
      'Habits are recurring daily actions that build your life stats over time. Create habits like "Read 20 pages" or "Morning workout". Complete them daily to build long streaks and earn XP.',
    emoji: "✅",
  },
  {
    title: "Focus Mode",
    description:
      "Use Pomodoro or Deep Work sessions to earn XP while you work. Link a focus session to a quest and it will automatically update your quest progress when the session ends.",
    emoji: "⏱️",
  },
  {
    title: "Task Raids",
    description:
      "Task Raids are real-world tasks — assignments, projects, meetings. Set a difficulty level and complete them to earn XP. Harder tasks give more XP and stat bonuses.",
    emoji: "⚔️",
  },
  {
    title: "Shadow Army",
    description:
      "As you progress, you unlock Shadows representing mastered disciplines. Each Shadow evolves through 4 stages: Initiate → Elite → Commander → Monarch. Unlock all 12 to become Shadow Monarch.",
    emoji: "👁️",
  },
  {
    title: "The System is Ready",
    description:
      "Your journey begins now. Complete your 5 daily quests, maintain your streak, and watch your stats climb. The System is always watching. Do not disappoint it.",
    emoji: "🌑",
  },
];

const TOUR_KEY = "solo-leveling-tour-complete";

export default function OnboardingTutorial() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      setTimeout(() => setVisible(true), 1000);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, "true");
    setVisible(false);
  };
  const next = () =>
    step < STEPS.length - 1 ? setStep((s) => s + 1) : dismiss();
  const prev = () => step > 0 && setStep((s) => s - 1);

  if (!visible) return null;
  const current = STEPS[step];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{
          zIndex: 99997,
          background: "rgba(2,6,23,0.88)",
          backdropFilter: "blur(6px)",
        }}
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          className="relative w-full max-w-md glass-cyan rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
        >
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all"
          >
            <X size={16} />
          </button>

          {/* Step bar */}
          <div className="flex gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${i === step ? "bg-cyan-400 flex-[2]" : i < step ? "bg-cyan-700 flex-1" : "bg-slate-700 flex-1"}`}
              />
            ))}
          </div>

          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-5 text-4xl">
            {current.emoji}
          </div>
          <p className="text-system mb-2">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="font-heading font-black text-2xl text-slate-100 mb-3 leading-snug">
            {current.title}
          </h2>
          <p className="font-body text-sm text-slate-400 leading-relaxed mb-8">
            {current.description}
          </p>

          <div className="flex items-center justify-between">
            <button
              onClick={prev}
              disabled={step === 0}
              className="btn-ghost flex items-center gap-1 disabled:opacity-30"
            >
              <ChevronLeft size={15} /> Back
            </button>
            <button
              onClick={dismiss}
              className="font-body text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              Skip tour
            </button>
            <button
              onClick={next}
              className="btn-primary flex items-center gap-1"
            >
              {step === STEPS.length - 1 ? (
                <>
                  <Zap size={14} /> Begin Hunt
                </>
              ) : (
                <>
                  Next <ChevronRight size={15} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export const resetTour = () => localStorage.removeItem(TOUR_KEY);
