import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarDays, Check, ChevronDown, Loader2, Plus, Sparkles, Target, Trash2, WandSparkles } from "lucide-react";
import api from "../../lib/api.js";
import { pageVariants, staggerContainer, staggerItem } from "../../lib/animations.js";

const CATEGORIES = [
  ["learning", "Learning"],
  ["career", "Career"],
  ["health", "Health"],
  ["fitness", "Fitness"],
  ["finance", "Finance"],
  ["personal", "Personal"],
  ["productivity", "Productivity"],
  ["other", "Other"],
];

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("personal");
  const [targetDate, setTargetDate] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [message, setMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => (await api.get("/goals")).data.data,
  });

  const createMutation = useMutation({
    mutationFn: async () => (await api.post("/goals", { title, category, targetDate: targetDate || null })).data.data,
    onSuccess: () => {
      setTitle("");
      setTargetDate("");
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const planMutation = useMutation({
    mutationFn: async (id) => (await api.post(`/goals/${id}/plan`)).data.data,
    onSuccess: ({ goal }) => {
      setExpanded(goal._id);
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const addQuestMutation = useMutation({
    mutationFn: async ({ goalId, milestoneId, goalQuestId }) =>
      (await api.post(`/goals/${goalId}/quests`, { milestoneId, goalQuestId })).data.data,
    onSuccess: (result) => {
      setMessage(result.alreadyAdded ? "That quest is already in your missions." : "Quest added to today's missions.");
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      setTimeout(() => setMessage(""), 2500);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/goals/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });

  const goals = data?.goals || [];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="pb-16 space-y-7">
      <header className="relative overflow-hidden rounded-3xl border border-cyan-500/15 bg-slate-950/50 p-6 md:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative">
          <p className="text-system mb-1">Your direction</p>
          <h1 className="font-heading font-black text-3xl md:text-4xl text-white tracking-tight">Goals</h1>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl">
            Choose what you want to improve. The coach turns it into milestones and small actions you can actually finish.
          </p>
        </div>
      </header>

      <section className="glass rounded-3xl border border-cyan-500/15 p-5 md:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Plus size={19} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-white">Create a goal</h2>
            <p className="text-xs text-slate-500">Keep it specific enough to turn into actions.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_170px_170px_auto] gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && title.trim() && createMutation.mutate()} placeholder="e.g. Learn JavaScript" className="input" maxLength={120} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="input" />
          <button onClick={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending} className="px-5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
            {createMutation.isPending ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />} Add
          </button>
        </div>
      </section>

      {message && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">{message}</div>}

      {isLoading ? (
        <div className="grid gap-4">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}</div>
      ) : goals.length === 0 ? (
        <div className="glass rounded-3xl border border-slate-800 p-10 text-center">
          <Target className="mx-auto text-slate-600" size={34} />
          <h3 className="font-heading font-bold text-white mt-3">No goals yet</h3>
          <p className="text-sm text-slate-500 mt-1">Create your first goal and let the coach build your path.</p>
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
          {goals.map((goal) => {
            const isOpen = expanded === goal._id;
            return (
              <motion.section key={goal._id} variants={staggerItem} className="glass rounded-3xl border border-slate-800/80 overflow-hidden">
                <div className="p-5 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/15 text-[10px] uppercase tracking-widest text-cyan-300">{goal.category}</span>
                        {goal.targetDate && <span className="text-[10px] text-slate-500 flex items-center gap-1"><CalendarDays size={12} /> {new Date(goal.targetDate).toLocaleDateString()}</span>}
                      </div>
                      <h2 className="font-heading font-bold text-xl text-white mt-2 truncate">{goal.title}</h2>
                      {goal.whyItMatters && <p className="text-sm text-slate-400 mt-1 max-w-2xl">{goal.whyItMatters}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => planMutation.mutate(goal._id)} disabled={planMutation.isPending} className="px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold text-sm flex items-center gap-2 hover:bg-purple-500/15 disabled:opacity-50">
                        {planMutation.isPending && planMutation.variables === goal._id ? <Loader2 size={16} className="animate-spin" /> : <WandSparkles size={16} />} {goal.aiGenerated ? "Refresh plan" : "Build plan"}
                      </button>
                      <button onClick={() => setExpanded(isOpen ? null : goal._id)} className="w-10 h-10 rounded-xl border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center" aria-label="Toggle goal plan">
                        <ChevronDown size={17} className={isOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                      </button>
                      <button onClick={() => deleteMutation.mutate(goal._id)} disabled={deleteMutation.isPending} className="w-10 h-10 rounded-xl border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-500/20 flex items-center justify-center" aria-label="Delete goal">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-800/70 p-5 md:p-6 bg-slate-950/30">
                    {!goal.milestones?.length ? (
                      <div className="text-center py-8"><Sparkles className="mx-auto text-purple-400" size={25} /><p className="text-sm text-slate-400 mt-2">Build the plan to see your milestones.</p></div>
                    ) : (
                      <div className="space-y-4">
                        {goal.milestones.map((milestone, index) => (
                          <div key={milestone._id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                            <div className="flex gap-3">
                              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">{String(index + 1).padStart(2, "0")}</div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-heading font-bold text-white">{milestone.title}</h3>
                                <p className="text-xs text-slate-500 mt-1">{milestone.description}</p>
                                <div className="mt-3 space-y-2">
                                  {(milestone.quests || []).map((quest) => (
                                    <div key={quest._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-900/60 border border-slate-800/70 p-3">
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-200">{quest.title}</p>
                                        {quest.description && <p className="text-xs text-slate-500 mt-0.5">{quest.description}</p>}
                                      </div>
                                      <button onClick={() => addQuestMutation.mutate({ goalId: goal._id, milestoneId: milestone._id, goalQuestId: quest._id })} disabled={addQuestMutation.isPending} className="shrink-0 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold hover:bg-cyan-500/15 disabled:opacity-50">
                                        {addQuestMutation.isPending && addQuestMutation.variables?.goalQuestId === quest._id ? "Adding…" : <><Check size={13} className="inline mr-1" /> Add quest</>}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.section>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
