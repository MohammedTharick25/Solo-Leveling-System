import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft, Zap, Check } from "lucide-react";
import api from "../../lib/api.js";
import { useHunterStore } from "../../stores/hunterStore.js";
import { slideInRight, slideInLeft } from "../../lib/animations.js";

const STEPS = [
  {
    id: "basics",
    title: "Your Foundation",
    subtitle: "The System needs to understand who you are.",
    fields: [
      { key: "age", label: "Age", type: "number", placeholder: "22" },
      {
        key: "occupation",
        label: "Occupation / Field",
        type: "text",
        placeholder: "Software Engineer",
      },
      {
        key: "isStudent",
        label: "Are you currently a student?",
        type: "select",
        options: [
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ],
      },
    ],
  },
  {
    id: "schedule",
    title: "Your Daily Rhythm",
    subtitle: "The System adapts to your natural patterns.",
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
        label: "Available daily minutes for self-improvement",
        type: "number",
        placeholder: "60",
      },
      {
        key: "fitnessLevel",
        label: "Current fitness level",
        type: "select",
        options: [
          { value: "sedentary", label: "Sedentary — little to no exercise" },
          { value: "light", label: "Light — 1-3 days/week" },
          { value: "moderate", label: "Moderate — 3-5 days/week" },
          { value: "active", label: "Active — 6-7 days/week" },
          { value: "athlete", label: "Athlete — intense daily training" },
        ],
      },
    ],
  },
  {
    id: "goals",
    title: "Your Mission",
    subtitle: "Define what victory looks like for you.",
    fields: [
      {
        key: "longTermVision",
        label: "Long-term vision (1-3 years)",
        type: "textarea",
        placeholder:
          "Build my own company, become a top 1% developer, publish a book…",
      },
      {
        key: "goals",
        label: "Top 3 goals right now (one per line)",
        type: "textarea",
        placeholder:
          "Learn system design\nBuild consistent workout habit\nRead 24 books this year",
      },
    ],
  },
  {
    id: "self-analysis",
    title: "Know Thyself",
    subtitle: "Honest self-knowledge is the foundation of growth.",
    fields: [
      {
        key: "biggestWeaknesses",
        label: "Your biggest weaknesses (one per line)",
        type: "textarea",
        placeholder: "Procrastination\nLack of consistency\nPoor sleep habits",
      },
      {
        key: "biggestStrengths",
        label: "Your biggest strengths (one per line)",
        type: "textarea",
        placeholder:
          "Quick learner\nStrong analytical skills\nHigh motivation when focused",
      },
      {
        key: "learningInterests",
        label: "What do you want to learn? (one per line)",
        type: "textarea",
        placeholder: "Programming\nPublic speaking\nFinancial literacy",
      },
    ],
  },
];

export default function AwakeningPage() {
  const { setUser } = useHunterStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState({});

  const { mutate, isPending } = useMutation({
    mutationFn: (body) => api.patch("/auth/awakening", body),
    onSuccess: ({ data }) => {
      setUser(data.data.user);
      navigate("/dashboard");
    },
  });

  const updateField = (key, value, parent) => {
    setFormData((prev) => {
      if (parent) {
        return { ...prev, [parent]: { ...(prev[parent] || {}), [key]: value } };
      }
      return { ...prev, [key]: value };
    });
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      // Build final payload
      const payload = { ...formData };
      if (payload.goals)
        payload.goals = payload.goals.split("\n").filter(Boolean);
      if (payload.biggestWeaknesses)
        payload.biggestWeaknesses = payload.biggestWeaknesses
          .split("\n")
          .filter(Boolean);
      if (payload.biggestStrengths)
        payload.biggestStrengths = payload.biggestStrengths
          .split("\n")
          .filter(Boolean);
      if (payload.learningInterests)
        payload.learningInterests = payload.learningInterests
          .split("\n")
          .filter(Boolean);
      mutate(payload);
    }
  };

  const prev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30 pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Zap size={18} className="text-cyan-400" />
            <span className="font-display text-xs text-cyan-400 tracking-[0.3em] uppercase">
              Awakening Protocol
            </span>
          </div>
          <p className="font-heading text-slate-400 text-sm">
            Step {step + 1} of {STEPS.length}
          </p>

          {/* Progress bar */}
          <div className="mt-3 h-1 bg-slate-800 rounded-full overflow-hidden max-w-xs mx-auto">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-2 mt-3">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300
                ${i === step ? "bg-cyan-400 w-4" : i < step ? "bg-cyan-600" : "bg-slate-700"}`}
              />
            ))}
          </div>
        </div>

        {/* Card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={{
              initial: (d) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
              animate: {
                opacity: 1,
                x: 0,
                transition: { duration: 0.3, ease: "easeOut" },
              },
              exit: (d) => ({
                opacity: 0,
                x: d > 0 ? -40 : 40,
                transition: { duration: 0.2 },
              }),
            }}
            initial="initial"
            animate="animate"
            exit="exit"
            className="glass border border-slate-700/50 rounded-2xl p-8"
          >
            <h2 className="font-heading font-bold text-xl text-slate-100 mb-1">
              {currentStep.title}
            </h2>
            <p className="font-body text-sm text-slate-500 mb-7">
              {currentStep.subtitle}
            </p>

            <div className="space-y-5">
              {currentStep.fields.map((field) => (
                <div key={field.key}>
                  <label className="input-label">{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      className="input"
                      defaultValue={
                        field.parent
                          ? formData[field.parent]?.[field.key]
                          : formData[field.key] || ""
                      }
                      onChange={(e) =>
                        updateField(field.key, e.target.value, field.parent)
                      }
                    >
                      <option value="">Select an option…</option>
                      {field.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      className="input resize-none"
                      rows={4}
                      placeholder={field.placeholder}
                      defaultValue={formData[field.key] || ""}
                      onChange={(e) =>
                        updateField(field.key, e.target.value, field.parent)
                      }
                    />
                  ) : (
                    <input
                      type={field.type}
                      className="input"
                      placeholder={field.placeholder}
                      defaultValue={
                        field.parent
                          ? formData[field.parent]?.[field.key]
                          : formData[field.key] || ""
                      }
                      onChange={(e) =>
                        updateField(field.key, e.target.value, field.parent)
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={prev}
                disabled={step === 0}
                className="btn-ghost disabled:opacity-30 flex items-center gap-2"
              >
                <ChevronLeft size={16} /> Back
              </button>

              <button
                onClick={next}
                disabled={isPending}
                className="btn-primary flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                    Awakening…
                  </>
                ) : step === STEPS.length - 1 ? (
                  <>
                    <Check size={16} /> Complete Awakening
                  </>
                ) : (
                  <>
                    Next <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
