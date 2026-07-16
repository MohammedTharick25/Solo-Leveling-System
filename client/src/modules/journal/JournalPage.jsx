import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../lib/api.js";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";
import {
  SectionHeader,
  Button,
  Card,
} from "../../components/ui/PageLoader.jsx";

const MOODS = ["😫", "😔", "😐", "🙂", "😊", "😄", "🔥", "⚡", "🌟", "🏆"];

export default function JournalPage() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [formData, setFormData] = useState({
    mood: 7,
    energyLevel: 7,
    wins: "",
    failures: "",
    lessons: "",
    freeText: "",
  });
  const [saved, setSaved] = useState(false);

  const { data: entryData } = useQuery({
    queryKey: ["journal", selectedDate],
    queryFn: async () => {
      const { data } = await api.get(`/journal?date=${selectedDate}`);
      if (data.data.entry) {
        const e = data.data.entry;
        setFormData({
          mood: e.mood || 7,
          energyLevel: e.energyLevel || 7,
          wins: (e.wins || []).join("\n"),
          failures: (e.failures || []).join("\n"),
          lessons: (e.lessons || []).join("\n"),
          freeText: e.freeText || "",
        });
      }
      return data.data;
    },
    onSuccess: () => setSaved(false),
  });

  const { data: insightsData } = useQuery({
    queryKey: ["journal-insights"],
    queryFn: async () => {
      const { data } = await api.get("/journal/insights");
      return data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (body) => api.post("/journal", body),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["journal", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    },
  });

  const handleSave = () => {
    const payload = {
      date: selectedDate,
      mood: formData.mood,
      energyLevel: formData.energyLevel,
      wins: formData.wins.split("\n").filter(Boolean),
      failures: formData.failures.split("\n").filter(Boolean),
      lessons: formData.lessons.split("\n").filter(Boolean),
      freeText: formData.freeText,
    };
    saveMutation.mutate(payload);
  };

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) setSelectedDate(d.toISOString().split("T")[0]);
  };

  const insights = insightsData?.insights;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="mb-8">
        <p className="text-system mb-1">Reflection Protocol</p>
        <h1 className="font-heading font-bold text-2xl text-slate-100">
          Daily Journal
        </h1>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Main journal */}
        <motion.div variants={staggerItem} className="lg:col-span-2 space-y-5">
          {/* Date nav */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevDay}
              className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="font-display text-sm text-slate-200">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  },
                )}
              </p>
              {selectedDate === today && (
                <span className="font-heading text-[10px] text-cyan-400 tracking-wider">
                  TODAY
                </span>
              )}
            </div>
            <button
              onClick={nextDay}
              disabled={selectedDate === today}
              className="p-2 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <Card>
            {/* Mood */}
            <div className="mb-5">
              <label className="input-label mb-3">
                Mood — {formData.mood}/10
              </label>
              <div className="flex gap-2 flex-wrap">
                {MOODS.map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => setFormData((p) => ({ ...p, mood: i + 1 }))}
                    className={`w-9 h-9 rounded-lg text-lg transition-all border
                                ${
                                  formData.mood === i + 1
                                    ? "bg-cyan-500/20 border-cyan-500/50 scale-110"
                                    : "border-slate-700/50 hover:border-slate-600"
                                }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy slider */}
            <div className="mb-5">
              <label className="input-label">
                Energy Level — {formData.energyLevel}/10
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={formData.energyLevel}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    energyLevel: Number(e.target.value),
                  }))
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Fields */}
            {[
              {
                key: "wins",
                label: "Today's Wins",
                placeholder: "What went well today? (one per line)",
              },
              {
                key: "failures",
                label: "What Didn't Go Well",
                placeholder: "Be honest (one per line)",
              },
              {
                key: "lessons",
                label: "Lessons Learned",
                placeholder: "What did you learn? (one per line)",
              },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="mb-4">
                <label className="input-label">{label}</label>
                <textarea
                  rows={3}
                  className="input resize-none"
                  placeholder={placeholder}
                  value={formData[key]}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, [key]: e.target.value }))
                  }
                />
              </div>
            ))}

            <div className="mb-5">
              <label className="input-label">Free Write</label>
              <textarea
                rows={4}
                className="input resize-none"
                placeholder="Anything else on your mind…"
                value={formData.freeText}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, freeText: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              {saved && (
                <p className="font-heading text-sm text-emerald-400">
                  ✓ Saved · +10 XP
                </p>
              )}
              <Button
                variant="primary"
                loading={saveMutation.isPending}
                onClick={handleSave}
                className="ml-auto"
              >
                <BookOpen size={14} /> Save Entry
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* AI Insights */}
        <motion.div variants={staggerItem} className="space-y-4">
          <Card>
            <SectionHeader label="AI Analysis" title="Weekly Insights" />
            {insights ? (
              <div className="space-y-4">
                {insights.patterns?.length > 0 && (
                  <div>
                    <p className="text-hud mb-2">Patterns Detected</p>
                    <ul className="space-y-2">
                      {insights.patterns.map((p, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-cyan-400 mt-0.5">•</span>
                          <p className="font-body text-xs text-slate-300 leading-relaxed">
                            {p}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {insights.suggestions?.length > 0 && (
                  <div>
                    <p className="text-hud mb-2">System Suggestions</p>
                    <ul className="space-y-2">
                      {insights.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Sparkles
                            size={11}
                            className="text-purple-400 mt-0.5 shrink-0"
                          />
                          <p className="font-body text-xs text-slate-300 leading-relaxed">
                            {s}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {insights.weaknessesDetected?.length > 0 && (
                  <div>
                    <p className="text-hud mb-2">Weaknesses Detected</p>
                    <div className="flex flex-wrap gap-1.5">
                      {insights.weaknessesDetected.map((w, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20
                                                  font-heading text-[10px] text-red-400"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="font-body text-sm text-slate-500">
                Write in your journal for 3+ days to unlock AI pattern analysis.
              </p>
            )}
          </Card>

          {/* Entry count */}
          <Card>
            <p className="text-hud mb-1">Journal Streak</p>
            <p className="font-display text-3xl text-cyan-400 font-black">
              {insightsData?.entryCount || 0}
            </p>
            <p className="font-heading text-xs text-slate-500 mt-1">
              entries this week
            </p>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
