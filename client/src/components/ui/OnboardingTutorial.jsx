import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Zap,
  Check,
  Compass,
  Sparkles,
  Target,
  Brain,
  Users,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";

const STEPS = [
  {
    title: "Initialize your System",
    description: "Your dashboard is a personal command center. Follow quests, habits, focus sessions and progression from one place without losing your next action.",
    emoji: "⚡",
    accent: "SYSTEM",
    icon: Compass,
    tips: ["Start with one small action", "Use the sidebar to explore", "Your progress is saved automatically"],
  },
  {
    title: "Turn actions into XP",
    description: "Quests and habits convert real-world effort into XP. Complete the next visible task, watch the progress update, then choose your next move.",
    emoji: "🎯",
    accent: "PROGRESSION",
    icon: Target,
    tips: ["Complete today's quests", "Build habit streaks", "Watch your level progress"],
  },
  {
    title: "Build your daily protocol",
    description: "Habits are your repeatable system. Create routines, choose a frequency, earn XP and protect your streak. The goal is consistency, not perfection.",
    emoji: "🔥",
    accent: "HABITS",
    icon: Check,
    tips: ["Keep habits realistic", "Use streaks as motivation", "Missed a day? Restart immediately"],
  },
  {
    title: "Focus without friction",
    description: "Use Pomodoro or Deep Work when you need momentum. Start a session, work until the timer ends, and let the System record the result.",
    emoji: "⏱️",
    accent: "FOCUS",
    icon: Zap,
    tips: ["Pick one task before starting", "Silence distractions", "Finish the session before switching"],
  },
  {
    title: "Your Second Brain",
    description: "Capture ideas, notes and useful knowledge before they disappear. Search, favorite and revisit information from a single responsive workspace.",
    emoji: "🧠",
    accent: "KNOWLEDGE",
    icon: Brain,
    tips: ["Capture ideas quickly", "Add tags for retrieval", "Open long notes safely on mobile"],
  },
  {
    title: "Enter the Guild",
    description: "Social progression gives your effort a shared purpose. Join a guild, contribute XP, complete guild challenges and keep your team moving.",
    emoji: "🏰",
    accent: "SOCIAL",
    icon: Users,
    tips: ["Find a guild that fits your goals", "Contribute regularly", "Use challenges for team momentum"],
  },
  {
    title: "You are ready",
    description: "You never need to know everything before starting. If you feel stuck, return to the next clear action, use the guidance on each screen, and keep moving.",
    emoji: "🌑",
    accent: "AWAKEN",
    icon: Sparkles,
    tips: ["Do one thing now", "Explore at your own pace", "Come back whenever you need direction"],
  },
];

const TOUR_KEY = "solo-leveling-tour-complete";

export default function OnboardingTutorial() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      const timer = setTimeout(() => setVisible(true), 700);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") dismiss();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, "true");
    setVisible(false);
  };
  const next = () => (step < STEPS.length - 1 ? setStep((s) => s + 1) : dismiss());
  const prev = () => step > 0 && setStep((s) => s - 1);

  if (!visible) return null;
  const current = STEPS[step];
  const Icon = current.icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center p-3 sm:p-6"
        style={{ zIndex: 99997, background: "rgba(2,6,23,0.92)", backdropFilter: "blur(12px)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto glass-cyan rounded-[28px] border border-cyan-500/20 shadow-[0_30px_100px_rgba(0,0,0,0.85)]"
        >
          <button onClick={dismiss} aria-label="Close tutorial" className="absolute top-4 right-4 z-10 p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-800/70 transition-all">
            <X size={17} />
          </button>

          <div className="p-5 sm:p-8 md:p-10">
            <div className="flex items-center justify-between gap-4 mb-5 pr-10">
              <div>
                <p className="text-system">System onboarding</p>
                <p className="text-[11px] text-slate-600 mt-1">Use ← → to navigate · Esc to exit</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                <span>{step + 1}</span><span>/</span><span>{STEPS.length}</span>
              </div>
            </div>

            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mb-8">
              <motion.div animate={{ width: `${progress}%` }} className="h-full rounded-full bg-cyan-400" />
            </div>

            <div className="grid md:grid-cols-[0.85fr_1.15fr] gap-7 md:gap-10 items-center">
              <motion.div
                key={`visual-${step}`}
                initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                className="relative min-h-[210px] sm:min-h-[250px] rounded-3xl border border-cyan-500/20 bg-slate-950/70 overflow-hidden flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_55%)]" />
                <div className="relative text-center">
                  <div className="mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-5xl sm:text-6xl shadow-[0_0_45px_rgba(34,211,238,0.12)]">
                    {current.emoji}
                  </div>
                  <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[10px] uppercase tracking-[0.18em]">
                    <Icon size={12} /> {current.accent}
                  </div>
                </div>
              </motion.div>

              <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
                <p className="text-cyan-400 text-[10px] uppercase tracking-[0.2em] mb-2">Step {step + 1} · {current.accent}</p>
                <h2 className="font-heading font-black text-2xl sm:text-3xl text-slate-100 mb-3 leading-tight">{current.title}</h2>
                <p className="font-body text-sm text-slate-400 leading-7 mb-6">{current.description}</p>

                <div className="space-y-2.5">
                  {current.tips.map((tip) => (
                    <div key={tip} className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 px-3 py-2.5">
                      <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0"><Check size={13} /></span>
                      <span className="text-xs text-slate-300">{tip}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <button key={i} onClick={() => setStep(i)} aria-label={`Go to step ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === step ? "w-7 bg-cyan-400" : i < step ? "w-3 bg-cyan-700" : "w-3 bg-slate-700 hover:bg-slate-600"}`} />
                ))}
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <button onClick={prev} disabled={step === 0} className="btn-ghost flex items-center gap-1 disabled:opacity-25"><ChevronLeft size={15} /> Back</button>
                <button onClick={dismiss} className="font-body text-xs text-slate-600 hover:text-slate-300 px-3 py-2 transition-colors">Skip</button>
                <button onClick={next} className="btn-primary flex items-center gap-1.5 min-w-[112px] justify-center">
                  {step === STEPS.length - 1 ? <><ArrowUpRight size={14} /> Enter System</> : <>Continue <ChevronRight size={15} /></>}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export const resetTour = () => localStorage.removeItem(TOUR_KEY);
