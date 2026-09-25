import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  Flame,
  BatteryCharging,
  Target,
  Lightbulb,
} from "lucide-react";
import api from "../../lib/api.js";
import { pageVariants, staggerContainer, staggerItem } from "../../lib/animations.js";
import { Button, Card } from "../../components/ui/PageLoader.jsx";

const MOODS = ["😫", "😔", "😐", "🙂", "😊", "😄", "🔥", "⚡", "🌟", "🏆"];
const SECTIONS = [
  { key: "wins", label: "Today's Wins", icon: "✦", placeholder: "One win per line…", tone: "cyan" },
  { key: "failures", label: "What Didn't Go Well", icon: "↺", placeholder: "What would you handle differently?", tone: "rose" },
  { key: "lessons", label: "Lessons Learned", icon: "✧", placeholder: "Capture the insight before you forget it…", tone: "purple" },
];

export default function JournalPage() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [formData, setFormData] = useState({ mood: 7, energyLevel: 7, wins: "", failures: "", lessons: "", freeText: "" });
  const [saved, setSaved] = useState(false);

  const { data: insightsData } = useQuery({
    queryKey: ["journal-insights"],
    queryFn: async () => (await api.get("/journal/insights")).data.data,
  });

  useQuery({
    queryKey: ["journal", selectedDate],
    queryFn: async () => {
      const { data } = await api.get(`/journal?date=${selectedDate}`);
      const e = data.data.entry;
      setFormData(e ? {
        mood: e.mood || 7,
        energyLevel: e.energyLevel || 7,
        wins: (e.wins || []).join("\n"),
        failures: (e.failures || []).join("\n"),
        lessons: (e.lessons || []).join("\n"),
        freeText: e.freeText || "",
      } : { mood: 7, energyLevel: 7, wins: "", failures: "", lessons: "", freeText: "" });
      setSaved(false);
      return data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (body) => api.post("/journal", body),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["journal", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["journal-insights"] });
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    },
  });

  const update = (key, value) => setFormData((p) => ({ ...p, [key]: value }));
  const handleSave = () => saveMutation.mutate({
    date: selectedDate,
    mood: formData.mood,
    energyLevel: formData.energyLevel,
    wins: formData.wins.split("\n").map((x) => x.trim()).filter(Boolean),
    failures: formData.failures.split("\n").map((x) => x.trim()).filter(Boolean),
    lessons: formData.lessons.split("\n").map((x) => x.trim()).filter(Boolean),
    freeText: formData.freeText,
  });

  const shiftDay = (amount) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + amount);
    if (amount > 0 && d > new Date()) return;
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const insights = insightsData?.insights;
  const entryCount = insightsData?.entryCount || 0;
  const wordCount = Object.values(formData).filter((v) => typeof v === "string").join(" ").trim().split(/\s+/).filter(Boolean).length;
  const completion = [formData.wins, formData.failures, formData.lessons, formData.freeText].filter((v) => v.trim()).length;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-w-0">
      <div className="mb-6 sm:mb-8">
        <p className="text-system mb-1">Reflection Protocol</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-slate-100">Daily Journal</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500">Turn your day into data. Capture the wins, learn from friction, and leave tomorrow a clearer path.</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-right">
              <p className="text-[9px] uppercase tracking-[0.18em] text-slate-600">This week</p>
              <p className="font-display text-sm text-cyan-300">{entryCount} entries</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-right">
              <p className="text-[9px] uppercase tracking-[0.18em] text-slate-600">Draft</p>
              <p className="font-display text-sm text-purple-300">{wordCount} words</p>
            </div>
          </div>
        </div>
      </div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <motion.div variants={staggerItem} className="min-w-0 space-y-5">
          <div className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-cyan-500/[0.08] via-slate-900/90 to-purple-500/[0.06] p-4 sm:p-5">
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative flex items-center justify-between gap-3">
              <button onClick={() => shiftDay(-1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-800 bg-slate-950/40 text-slate-500 transition hover:border-cyan-400/30 hover:text-cyan-300"><ChevronLeft size={18} /></button>
              <div className="min-w-0 text-center">
                <p className="truncate font-display text-sm sm:text-base text-slate-100">{new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                <span className="font-heading text-[9px] uppercase tracking-[0.2em] text-cyan-400">{selectedDate === today ? "Today" : "Archive Entry"}</span>
              </div>
              <button onClick={() => shiftDay(1)} disabled={selectedDate === today} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-800 bg-slate-950/40 text-slate-500 transition hover:border-cyan-400/30 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight size={18} /></button>
            </div>
          </div>

          <Card className="overflow-hidden !p-0">
            <div className="border-b border-slate-800/70 p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-hud">Daily state</p>
                  <h2 className="mt-1 font-heading text-lg font-bold text-slate-100">How are you entering this reflection?</h2>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/5 px-3 py-1.5 text-xs text-cyan-300"><BatteryCharging size={13} /> Energy {formData.energyLevel}/10</div>
              </div>
              <div className="mt-5 grid gap-5 md:grid-cols-[1fr_220px]">
                <div>
                  <label className="input-label">Mood · {formData.mood}/10</label>
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                    {MOODS.map((emoji, i) => (
                      <button key={emoji} type="button" onClick={() => update("mood", i + 1)} className={`grid aspect-square min-w-0 place-items-center rounded-xl border text-lg transition-all duration-200 hover:-translate-y-0.5 ${formData.mood === i + 1 ? "scale-105 border-cyan-400/60 bg-cyan-400/15 shadow-[0_0_22px_rgba(34,211,238,0.12)]" : "border-slate-800 bg-slate-950/30 hover:border-slate-700"}`}>{emoji}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="input-label">Energy · {formData.energyLevel}/10</label>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                    <input aria-label="Energy level" type="range" min={1} max={10} value={formData.energyLevel} onChange={(e) => update("energyLevel", Number(e.target.value))} className="w-full accent-cyan-400" />
                    <div className="mt-2 flex justify-between text-[9px] uppercase tracking-wider text-slate-600"><span>Low</span><span>Peak</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div><p className="text-hud">Reflection log</p><h2 className="mt-1 font-heading text-lg font-bold text-slate-100">Write it down before the day fades.</h2></div>
                <div className="hidden items-center gap-1.5 text-[10px] text-slate-600 sm:flex"><Target size={12} /> {completion}/4 sections</div>
              </div>

              <div className="space-y-4">
                {SECTIONS.map(({ key, label, icon, placeholder, tone }) => (
                  <div key={key} className={`rounded-2xl border p-4 transition-colors ${formData[key] ? (tone === "rose" ? "border-rose-500/20 bg-rose-500/[0.03]" : tone === "purple" ? "border-purple-500/20 bg-purple-500/[0.03]" : "border-cyan-500/20 bg-cyan-500/[0.03]") : "border-slate-800/80 bg-slate-950/20"}`}>
                    <div className="mb-2 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-800 text-xs text-slate-300">{icon}</span><label className="font-heading text-xs font-semibold uppercase tracking-wider text-slate-300">{label}</label></div>
                    <textarea rows={3} className="input min-h-[92px] resize-y border-0 bg-transparent p-1 shadow-none focus:ring-0" placeholder={placeholder} value={formData[key]} onChange={(e) => update(key, e.target.value)} />
                  </div>
                ))}
                <div className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.025] p-4">
                  <div className="mb-2 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-purple-500/10 text-purple-300"><Lightbulb size={13} /></span><label className="font-heading text-xs font-semibold uppercase tracking-wider text-slate-300">Free Write</label></div>
                  <textarea rows={6} className="input min-h-[150px] resize-y border-0 bg-transparent p-1 shadow-none focus:ring-0" placeholder="Thoughts, ideas, worries, plans… this space is yours." value={formData.freeText} onChange={(e) => update("freeText", e.target.value)} />
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-800/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-h-5">{saved && <p className="flex items-center gap-2 text-sm text-emerald-400"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/10"><Check size={12} /></span>Entry saved · +10 XP</p>}</div>
                <Button variant="primary" loading={saveMutation.isPending} onClick={handleSave} className="w-full justify-center sm:w-auto"><BookOpen size={14} /> Save Reflection</Button>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.aside variants={staggerItem} className="min-w-0 space-y-4">
          <div className="rounded-3xl border border-purple-400/15 bg-gradient-to-br from-purple-500/[0.08] via-slate-900/80 to-cyan-500/[0.04] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-system">System Analysis</p><h2 className="mt-1 font-heading text-lg font-bold text-slate-100">Weekly Insights</h2></div><div className="grid h-10 w-10 place-items-center rounded-xl border border-purple-400/20 bg-purple-400/10"><Sparkles size={17} className="text-purple-300" /></div></div>
            {insights ? <div className="space-y-5">
              {insights.patterns?.length > 0 && <InsightList title="Patterns detected" items={insights.patterns} dot="cyan" />}
              {insights.suggestions?.length > 0 && <InsightList title="System suggestions" items={insights.suggestions} dot="purple" icon={Sparkles} />}
              {insights.weaknessesDetected?.length > 0 && <div><p className="text-hud mb-2">Areas to watch</p><div className="flex flex-wrap gap-1.5">{insights.weaknessesDetected.map((w) => <span key={w} className="rounded-lg border border-red-500/15 bg-red-500/5 px-2.5 py-1.5 text-[10px] text-red-300">{w}</span>)}</div></div>}
            </div> : <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4"><p className="text-sm leading-relaxed text-slate-500">Write for 3+ days to unlock pattern analysis. The System will surface recurring strengths and friction points here.</p></div>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><Flame size={15} className="text-orange-300" /><p className="mt-3 font-display text-2xl font-black text-cyan-300">{entryCount}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">Entries this week</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><BookOpen size={15} className="text-cyan-300" /><p className="mt-3 font-display text-2xl font-black text-purple-300">{completion}/4</p><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">Draft progress</p></div>
          </div>
        </motion.aside>
      </motion.div>
    </motion.div>
  );
}

function InsightList({ title, items, dot, icon: Icon }) {
  return <div><p className="text-hud mb-2">{title}</p><ul className="space-y-2.5">{items.map((item, i) => <li key={`${item}-${i}`} className="flex items-start gap-2.5"><span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot === "purple" ? "bg-purple-300" : "bg-cyan-300"}`} />{Icon ? <Icon size={12} className="mt-0.5 shrink-0 text-purple-300" /> : null}<p className="min-w-0 break-words text-xs leading-relaxed text-slate-300">{item}</p></li>)}</ul></div>;
}
