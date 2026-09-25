import { useMemo, useState } from "react";
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
} from "lucide-react";
import api from "../../lib/api.js";
import { useHunterStore } from "../../stores/hunterStore.js";

const STEPS = [
  {
    id: "basics",
    eyebrow: "01 · FOUNDATION",
    title: "Start with the basics",
    subtitle: "A few details help the System build quests that fit your life.",
    icon: ShieldCheck,
    fields: [
      { key: "age", label: "Age", type: "number", placeholder: "22", min: 10, max: 100 },
      {
        key: "occupation",
        label: "Occupation / field",
        type: "text",
        placeholder: "Software Engineer",
      },
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
      {
        key: "wakeTime",
        label: "Usual wake time",
        type: "time",
        parent: "dailySchedule",
      },
      {
        key: "sleepTime",
        label: "Usual sleep time",
        type: "time",
        parent: "dailySchedule",
      },
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

export default function AwakeningPage() {
  const { setUser, setHunter, setStats } = useHunterStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState({});
  const [stepError, setStepError] = useState("");

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;
  const StepIcon = currentStep.icon;

  const completionText = useMemo(() => {
    if (step === STEPS.length - 1) return "Your profile is ready to personalize your System.";
    return `${Math.round(progress)}% complete`;
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
      navigate("/dashboard");
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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20 pointer-events-none" />
      <motion.div
        className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="w-full max-w-2xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 sm:mb-7"
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ boxShadow: ["0 0 0 rgba(34,211,238,0)", "0 0 24px rgba(34,211,238,.22)", "0 0 0 rgba(34,211,238,0)"] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center"
              >
                <Zap size={18} className="text-cyan-400" />
              </motion.div>
              <div>
                <p className="font-display text-[10px] text-cyan-400 tracking-[0.28em] uppercase">Awakening Protocol</p>
                <p className="font-heading text-sm text-slate-300">Personalize your System</p>
              </div>
            </div>
            <span className="text-xs font-heading text-slate-500 whitespace-nowrap">Step {step + 1} of {STEPS.length}</span>
          </div>

          <div className="h-1.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-purple-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-600">
            <span>{completionText}</span>
            <span>Required profile setup</span>
          </div>
        </motion.div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep.id}
            custom={direction}
            variants={{
              initial: (d) => ({ opacity: 0, x: d > 0 ? 32 : -32, scale: 0.985 }),
              animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
              exit: (d) => ({ opacity: 0, x: d > 0 ? -32 : 32, scale: 0.985, transition: { duration: 0.2 } }),
            }}
            initial="initial"
            animate="animate"
            exit="exit"
            className="glass border border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl shadow-black/20"
          >
            <div className="p-6 sm:p-8 border-b border-slate-800/70 bg-slate-900/35">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
                  <StepIcon size={19} className="text-cyan-400" />
                </div>
                <div>
                  <p className="font-display text-[10px] tracking-[0.22em] text-cyan-400 mb-1">{currentStep.eyebrow}</p>
                  <h1 className="font-heading font-bold text-2xl text-slate-100 tracking-tight">{currentStep.title}</h1>
                  <p className="font-body text-sm text-slate-400 mt-1.5 max-w-xl leading-6">{currentStep.subtitle}</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {stepError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-center gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3.5 py-3"
                >
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
                    <motion.div
                      key={field.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06, duration: 0.25 }}
                    >
                      <div className="flex items-end justify-between gap-3 mb-1.5">
                        <label htmlFor={fieldId} className="input-label mb-0">
                          {field.label} <span className="text-cyan-400">*</span>
                        </label>
                        {field.hint && <span className="text-[10px] text-slate-600">{field.hint}</span>}
                      </div>

                      {field.type === "select" ? (
                        <select
                          id={fieldId}
                          value={value}
                          className={`input cursor-pointer ${hasValue ? "border-slate-600" : "border-slate-700/60"}`}
                          onChange={(e) => updateField(field.key, e.target.value, field.parent)}
                        >
                          <option value="">Choose one…</option>
                          {field.options.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      ) : field.type === "textarea" ? (
                        <textarea
                          id={fieldId}
                          value={value}
                          rows={field.key === "longTermVision" ? 3 : 4}
                          maxLength={field.key === "longTermVision" ? 500 : 600}
                          placeholder={field.placeholder}
                          className="input resize-none leading-6"
                          onChange={(e) => updateField(field.key, e.target.value, field.parent)}
                        />
                      ) : (
                        <input
                          id={fieldId}
                          type={field.type}
                          value={value}
                          min={field.min}
                          max={field.max}
                          placeholder={field.placeholder}
                          className="input"
                          onChange={(e) => updateField(field.key, e.target.value, field.parent)}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-8 pt-5 border-t border-slate-800/70 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={prev}
                  disabled={step === 0 || isPending}
                  className="btn-ghost disabled:opacity-30 flex items-center gap-2"
                >
                  <ChevronLeft size={16} /> Back
                </button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={next}
                  disabled={isPending}
                  className="btn-primary min-w-36 justify-center flex items-center gap-2"
                >
                  {isPending ? (
                    <><span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" /> Building profile…</>
                  ) : step === STEPS.length - 1 ? (
                    <><Sparkles size={16} /> Complete setup</>
                  ) : (
                    <>Continue <ChevronRight size={16} /></>
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

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="flex items-center justify-center gap-2 mt-5 text-[11px] text-slate-600">
          <Check size={12} className="text-cyan-500" />
          <span>Your answers are used to personalize daily quests and recommendations.</span>
        </motion.div>
      </div>
    </div>
  );
}
