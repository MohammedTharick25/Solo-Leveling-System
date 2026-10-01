import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronLeft,
  Zap,
  Check,
  Sparkles,
  Clock3,
  Target,
  Brain,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  UserRound,
  Gauge,
  Flame,
  ArrowRight,
} from "lucide-react";
import api from "../../lib/api.js";
import { useHunterStore } from "../../stores/hunterStore.js";

const DRAFT_KEY = "solo-leveling-awakening-draft";

const STEPS = [
  {
    id: "basics",
    eyebrow: "01 · FOUNDATION",
    title: "Start with the basics",
    subtitle: "A few details help the System build quests that fit your life.",
    icon: ShieldCheck,
    fields: [
      { key: "age", label: "Age", type: "number", placeholder: "22", min: 10, max: 100 },
      { key: "occupation", label: "Occupation / field", type: "text", placeholder: "Software Engineer" },
      {
        key: "isStudent",
        label: "Are you currently a student?",
        type: "select",
        options: [
          { value: "true", label: "Yes, I'm a student" },
          { value: "false", label: "No, I'm not a student" },
        ],
      },
    ],
  },
  {
    id: "schedule",
    eyebrow: "02 · RHYTHM",
    title: "Tell us your daily rhythm",
    subtitle: "Your available time and routine shape realistic daily quests.",
    icon: Clock3,
    fields: [
      { key: "wakeTime", label: "Usual wake time", type: "time", parent: "dailySchedule" },
      { key: "sleepTime", label: "Usual sleep time", type: "time", parent: "dailySchedule" },
      {
        key: "availableDailyMinutes",
        label: "Daily time for self-improvement",
        type: "number",
        placeholder: "60",
        min: 10,
        max: 1440,
      },
      {
        key: "fitnessLevel",
        label: "Current activity level",
        type: "select",
        options: [
          { value: "sedentary", label: "Sedentary · little to no exercise" },
          { value: "light", label: "Light · 1–3 days/week" },
          { value: "moderate", label: "Moderate · 3–5 days/week" },
          { value: "active", label: "Active · 6–7 days/week" },
          { value: "athlete", label: "Athlete · intense daily training" },
        ],
      },
    ],
  },
  {
    id: "goals",
    eyebrow: "03 · DIRECTION",
    title: "Choose your direction",
    subtitle: "Your goals are the strongest signal for what the System should prioritize.",
    icon: Target,
    fields: [
      {
        key: "longTermVision",
        label: "Long-term vision",
        hint: "Where would you like to be in 1–3 years?",
        type: "textarea",
        placeholder: "Build my own company, become a stronger developer, publish a book…",
      },
      {
        key: "goals",
        label: "Top 3 goals",
        hint: "One goal per line · up to 3",
        type: "textarea",
        placeholder: "Learn system design\nBuild a consistent workout habit\nRead 24 books this year",
        maxLines: 3,
      },
    ],
  },
  {
    id: "self-analysis",
    eyebrow: "04 · PERSONALIZE",
    title: "Know what helps you grow",
    subtitle: "These answers help the System choose the right difficulty, topics and habits.",
    icon: Brain,
    fields: [
      {
        key: "biggestWeaknesses",
        label: "Biggest weaknesses",
        hint: "One per line",
        type: "textarea",
        placeholder: "Procrastination\nLack of consistency\nPoor sleep habits",
      },
      {
        key: "biggestStrengths",
        label: "Biggest strengths",
        hint: "One per line",
        type: "textarea",
        placeholder: "Quick learner\nStrong analytical skills\nHigh motivation when focused",
      },
      {
        key: "learningInterests",
        label: "What do you want to learn?",
        hint: "One per line",
        type: "textarea",
        placeholder: "Programming\nPublic speaking\nFinancial literacy",
      },
    ],
  },
];

const splitLines = (value) =>
  String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const getValue = (formData, field) =>
  field.parent ? formData[field.parent]?.[field.key] || "" : formData[field.key] || "";

const isFilled = (value) => String(value ?? "").trim().length > 0;

const starterHints = [
  "The System adapts to your real schedule.",
  "Your goals become the foundation for future quests.",
  "Honest answers create better recommendations.",
];

export default function AwakeningPage() {
  const { setUser, setHunter, setStats } = useHunterStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [stepError, setStepError] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [awakeningComplete, setAwakeningComplete] = useState(false);

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;
  const StepIcon = currentStep.icon;

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    } catch {
      // Draft persistence is best-effort only.
    }
  }, [formData]);

  const completion = useMemo(() => {
    const allFields = STEPS.flatMap((item) => item.fields);
    const completed = allFields.filter((field) => isFilled(getValue(formData, field))).length;
    return Math.round((completed / allFields.length) * 100);
  }, [formData]);

  const stepCompletion = useMemo(() => {
    const completed = currentStep.fields.filter((field) => isFilled(getValue(formData, field))).length;
    return Math.round((completed / currentStep.fields.length) * 100);
  }, [currentStep, formData]);

  const completionText = useMemo(() => {
    if (step === STEPS.length - 1) return "Your profile is ready to personalize your System.";
    return `${Math.round(progress)}% of the awakening path`;
  }, [progress, step]);

  const { mutate, isPending, error } = useMutation({
    mutationFn: (body) => api.patch("/auth/awakening", body),
    onSuccess: async ({ data }) => {
      setUser(data.data.user);
      try {
        const { data: profile } = await api.get("/hunter/me");
        setHunter(profile.data.hunter);
        setStats(profile.data.stats);
      } catch (err) {
        console.warn("[Awakening] Failed to preload hunter profile:", err.message);
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Ignore local storage failures.
      }
      setAwakeningComplete(true);
      window.setTimeout(() => navigate("/dashboard"), 1500);
    },
  });

  const updateField = (key, value, parent) => {
    setStepError("");
    setFormData((prev) => {
      if (parent) {
        return { ...prev, [parent]: { ...(prev[parent] || {}), [key]: value } };
      }
      return { ...prev, [key]: value };
    });
  };

  const validateStep = () => {
    const missing = currentStep.fields.filter((field) => !isFilled(getValue(formData, field)));
    if (missing.length) {
      setStepError(`Please complete ${missing[0].label.toLowerCase()} before continuing.`);
      return false;
    }

    if (currentStep.id === "basics") {
      const age = Number(formData.age);
      if (!Number.isInteger(age) || age < 10 || age > 100) {
        setStepError("Enter an age between 10 and 100.");
        return false;
      }
    }

    if (currentStep.id === "schedule") {
      const minutes = Number(formData.availableDailyMinutes);
      if (!Number.isInteger(minutes) || minutes < 10 || minutes > 1440) {
        setStepError("Enter between 10 and 1,440 available minutes.");
        return false;
      }
    }

    if (currentStep.id === "goals") {
      const goals = splitLines(formData.goals);
      if (goals.length === 0) {
        setStepError("Add at least one goal.");
        return false;
      }
      if (goals.length > 3) {
        setStepError("Keep your active goals to 3 or fewer.");
        return false;
      }
    }

    return true;
  };

  const next = () => {
    if (!validateStep()) return;

    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep((value) => value + 1);
      return;
    }

    const payload = {
      ...formData,
      age: Number(formData.age),
      isStudent: formData.isStudent === "true",
      availableDailyMinutes: Number(formData.availableDailyMinutes),
      goals: splitLines(formData.goals),
      biggestWeaknesses: splitLines(formData.biggestWeaknesses),
      biggestStrengths: splitLines(formData.biggestStrengths),
      learningInterests: splitLines(formData.learningInterests),
    };

    mutate(payload);
  };

  const prev = () => {
    setStepError("");
    if (step > 0) {
      setDirection(-1);
      setStep((value) => value - 1);
    }
  };

  const resetDraft = () => {
    setFormData({});
    setStep(0);
    setStepError("");
    setShowReset(false);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore local storage failures.
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-3 sm:p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20 pointer-events-none" />

      <motion.div
        className="absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-48 -left-40 w-[30rem] h-[30rem] rounded-full bg-purple-600/10 blur-3xl pointer-events-none"
        animate={{ scale: [1.08, 1, 1.08], opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <AnimatePresence mode="wait">
        {awakeningComplete ? (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-md text-center"
          >
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.08, 1] }}
              transition={{ rotate: { duration: 1.2 }, scale: { duration: 1.2, repeat: Infinity } }}
              className="mx-auto mb-7 w-24 h-24 rounded-3xl bg-cyan-400/10 border border-cyan-300/40 flex items-center justify-center shadow-[0_0_70px_rgba(34,211,238,.22)]"
            >
              <Sparkles size={40} className="text-cyan-300" />
            </motion.div>
            <p className="font-display text-[11px] tracking-[0.35em] text-cyan-400 uppercase mb-3">System initialized</p>
            <h1 className="font-heading text-3xl sm:text-4xl font-black text-slate-100">Awakening complete.</h1>
            <p className="mt-3 text-sm text-slate-400 leading-6">Your System is preparing your personal dashboard and progression path.</p>
            <div className="mt-7 h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.25, ease: "easeInOut" }} className="h-full bg-gradient-to-r from-cyan-400 to-purple-500" />
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-5xl relative z-10">
            <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} className="mb-5 sm:mb-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ boxShadow: ["0 0 0 rgba(34,211,238,0)", "0 0 28px rgba(34,211,238,.25)", "0 0 0 rgba(34,211,238,0)"] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-400/25 flex items-center justify-center shrink-0"
                  >
                    <Zap size={19} className="text-cyan-400" />
                  </motion.div>
                  <div>
                    <p className="font-display text-[10px] text-cyan-400 tracking-[0.28em] uppercase">Awakening Protocol</p>
                    <p className="font-heading text-sm text-slate-300">Build the System around you</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Draft auto-saved
                  </div>
                  <button type="button" onClick={() => setShowReset(true)} disabled={isPending} className="btn-ghost !px-3 !py-2 text-[11px] flex items-center gap-1.5">
                    <RotateCcw size={13} /> Reset
                  </button>
                </div>
              </div>

              <div className="relative h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                <motion.div className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 via-cyan-500 to-purple-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                <motion.div className="absolute inset-y-0 left-0 bg-white/25 blur-sm rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px]">
                <span className="text-slate-500">{completionText}</span>
                <span className="text-cyan-400/70">Profile data {completion}% complete</span>
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-[250px_minmax(0,1fr)] gap-4 lg:gap-5">
              <aside className="hidden lg:block glass rounded-3xl p-4 h-fit sticky top-5">
                <div className="px-2 pb-4 border-b border-slate-800/70">
                  <p className="font-display text-[10px] tracking-[0.22em] text-slate-500 uppercase">System initialization</p>
                  <p className="font-heading text-sm text-slate-200 mt-1">Your awakening path</p>
                </div>
                <div className="py-3 space-y-1">
                  {STEPS.map((item, index) => {
                    const Icon = item.icon;
                    const done = index < step;
                    const active = index === step;
                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (index <= step) {
                            setStepError("");
                            setDirection(index > step ? 1 : -1);
                            setStep(index);
                          }
                        }}
                        whileHover={index <= step ? { x: 3 } : undefined}
                        className={`w-full text-left rounded-2xl p-3 flex items-center gap-3 transition-all duration-300 ${active ? "bg-cyan-500/10 border border-cyan-400/20" : "border border-transparent hover:bg-slate-800/40"} ${index > step ? "opacity-45 cursor-default" : "cursor-pointer"}`}
                      >
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${done ? "bg-cyan-400/10 border-cyan-400/30 text-cyan-300" : active ? "bg-purple-500/10 border-purple-400/30 text-purple-300" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
                          {done ? <Check size={15} /> : <Icon size={15} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-heading text-xs text-slate-200">{item.eyebrow.split(" · ")[1]}</span>
                          <span className="block text-[10px] text-slate-500 truncate mt-0.5">{item.title}</span>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-2xl border border-purple-500/15 bg-purple-500/5 p-4">
                  <div className="flex items-center gap-2 text-purple-300">
                    <Gauge size={15} />
                    <span className="font-display text-[10px] tracking-[0.18em]">CURRENT READINESS</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="font-heading text-2xl font-bold text-slate-100">{completion}%</span>
                    <span className="text-[10px] text-slate-500">profile</span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div animate={{ width: `${completion}%` }} className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full" />
                  </div>
                </div>
              </aside>

              <main>
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep.id}
                    custom={direction}
                    variants={{
                      initial: (d) => ({ opacity: 0, x: d > 0 ? 34 : -34, scale: 0.985, filter: "blur(3px)" }),
                      animate: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.32, ease: "easeOut" } },
                      exit: (d) => ({ opacity: 0, x: d > 0 ? -34 : 34, scale: 0.985, filter: "blur(3px)", transition: { duration: 0.2 } }),
                    }}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="glass border border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl shadow-black/20"
                  >
                    <div className="p-5 sm:p-7 border-b border-slate-800/70 bg-slate-900/35">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <motion.div whileHover={{ rotate: 5, scale: 1.04 }} className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
                            <StepIcon size={20} className="text-cyan-400" />
                          </motion.div>
                          <div>
                            <p className="font-display text-[10px] tracking-[0.22em] text-cyan-400 mb-1">{currentStep.eyebrow}</p>
                            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-100 tracking-tight">{currentStep.title}</h1>
                            <p className="font-body text-sm text-slate-400 mt-1.5 max-w-2xl leading-6">{currentStep.subtitle}</p>
                          </div>
                        </div>
                        <div className="hidden sm:flex shrink-0 flex-col items-end">
                          <span className="font-display text-[10px] text-slate-600 tracking-widest">STEP</span>
                          <span className="font-heading text-lg font-bold text-slate-300">0{step + 1}<span className="text-slate-700">/0{STEPS.length}</span></span>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-3">
                        <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                          <motion.div animate={{ width: `${stepCompletion}%` }} className="h-full bg-cyan-400 rounded-full" transition={{ duration: 0.35 }} />
                        </div>
                        <span className="text-[10px] font-heading text-slate-500 whitespace-nowrap">{stepCompletion}% ready</span>
                      </div>
                    </div>

                    <div className="p-5 sm:p-7">
                      {stepError && (
                        <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mb-5 flex items-center gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3.5 py-3">
                          <AlertCircle size={15} className="text-amber-300 shrink-0" />
                          <p className="text-xs text-amber-200">{stepError}</p>
                        </motion.div>
                      )}

                      <div className="space-y-5">
                        {currentStep.fields.map((field, index) => {
                          const value = getValue(formData, field);
                          const fieldId = `${currentStep.id}-${field.key}`;
                          const hasValue = isFilled(value);
                          return (
                            <motion.div key={field.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.25 }}>
                              <div className="flex items-end justify-between gap-3 mb-1.5">
                                <label htmlFor={fieldId} className="input-label mb-0">{field.label} <span className="text-cyan-400">*</span></label>
                                {field.hint && <span className="text-[10px] text-slate-600 text-right">{field.hint}</span>}
                              </div>

                              {field.type === "select" ? (
                                <select id={fieldId} value={value} className={`input cursor-pointer ${hasValue ? "border-cyan-500/30 bg-cyan-500/[0.03]" : "border-slate-700/60"}`} onChange={(e) => updateField(field.key, e.target.value, field.parent)}>
                                  <option value="">Choose one…</option>
                                  {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                              ) : field.type === "textarea" ? (
                                <textarea id={fieldId} value={value} rows={field.key === "longTermVision" ? 3 : 4} maxLength={field.key === "longTermVision" ? 500 : 600} placeholder={field.placeholder} className={`input resize-none leading-6 ${hasValue ? "border-cyan-500/30 bg-cyan-500/[0.03]" : ""}`} onChange={(e) => updateField(field.key, e.target.value, field.parent)} />
                              ) : (
                                <input id={fieldId} type={field.type} value={value} min={field.min} max={field.max} placeholder={field.placeholder} className={`input ${hasValue ? "border-cyan-500/30 bg-cyan-500/[0.03]" : ""}`} onChange={(e) => updateField(field.key, e.target.value, field.parent)} />
                              )}
                            </motion.div>
                          );
                        })}
                      </div>

                      <motion.div layout className="mt-7 rounded-2xl border border-slate-800/80 bg-slate-950/35 px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-400/15 flex items-center justify-center shrink-0">
                          {step === 0 ? <UserRound size={14} className="text-purple-300" /> : step === 1 ? <Clock3 size={14} className="text-purple-300" /> : step === 2 ? <Target size={14} className="text-purple-300" /> : <Brain size={14} className="text-purple-300" />}
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.p key={step} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-[11px] leading-5 text-slate-500">{starterHints[step === 0 ? 0 : step === 1 ? 0 : step === 2 ? 1 : 2]}</motion.p>
                        </AnimatePresence>
                      </motion.div>

                      <div className="mt-7 pt-5 border-t border-slate-800/70 flex items-center justify-between gap-4">
                        <button type="button" onClick={prev} disabled={step === 0 || isPending} className="btn-ghost disabled:opacity-30 flex items-center gap-2">
                          <ChevronLeft size={16} /> Back
                        </button>

                        <motion.button type="button" whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} onClick={next} disabled={isPending} className="btn-primary min-w-36 sm:min-w-44 justify-center flex items-center gap-2 !py-3">
                          {isPending ? (
                            <><span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" /> Building profile…</>
                          ) : step === STEPS.length - 1 ? (
                            <><Sparkles size={16} /> Awaken my System</>
                          ) : (
                            <>Continue <ArrowRight size={16} /></>
                          )}
                        </motion.button>
                      </div>

                      {error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-2 text-xs text-red-400">
                          <AlertCircle size={14} />
                          <span>{error.response?.data?.message || "We couldn't save your profile. Please try again."}</span>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mt-4 text-[10px] text-slate-600 text-center">
                  <span className="inline-flex items-center gap-1.5"><Check size={12} className="text-cyan-500" /> Your answers personalize quests and recommendations.</span>
                  <span className="hidden sm:inline text-slate-800">•</span>
                  <span className="inline-flex items-center gap-1.5"><Flame size={11} className="text-purple-400" /> You can refine your profile later.</span>
                </motion.div>
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReset && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} className="w-full max-w-sm glass rounded-3xl p-6 border border-slate-700/70 shadow-2xl">
              <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-400/20 flex items-center justify-center mb-4">
                <RotateCcw size={18} className="text-red-300" />
              </div>
              <h2 className="font-heading text-lg font-bold text-slate-100">Reset awakening draft?</h2>
              <p className="text-sm text-slate-500 leading-6 mt-2">All answers entered on this device will be cleared. Your account will not be deleted.</p>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowReset(false)} className="btn-ghost flex-1">Keep draft</button>
                <button type="button" onClick={resetDraft} className="btn-danger flex-1 !px-3">Reset</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
