import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Flame,
  Gauge,
  Loader2,
  Plus,
  Pause,
  Pencil,
  Play,
  Save,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  WandSparkles,
  Zap,
} from "lucide-react";
import api from "../../lib/api.js";
import { pageVariants, staggerContainer, staggerItem } from "../../lib/animations.js";

const CATEGORIES = [
  ["all", "All"], ["learning", "Learning"], ["career", "Career"], ["health", "Health"],
  ["fitness", "Fitness"], ["finance", "Finance"], ["personal", "Personal"],
  ["productivity", "Productivity"], ["other", "Other"],
];

const CATEGORY_STYLE = {
  learning: { icon: "◈", color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  career: { icon: "◆", color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  health: { icon: "♥", color: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  fitness: { icon: "✦", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  finance: { icon: "◇", color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  personal: { icon: "✧", color: "text-fuchsia-300", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20" },
  productivity: { icon: "⚡", color: "text-sky-300", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  other: { icon: "•", color: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-500/20" },
};

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("personal");
  const [targetDate, setTargetDate] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCreator, setShowCreator] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => (await api.get("/goals")).data.data,
    // Goals depend on quest completion state, so never rely on the 2-minute
    // global cache when the Hunter enters this page. Always request the
    // current server state on mount/navigation.
    staleTime: 0,
    refetchOnMount: "always",
  });

  const createMutation = useMutation({
    mutationFn: async () => (await api.post("/goals", { title, category, targetDate: targetDate || null })).data.data,
    onSuccess: () => {
      setTitle(""); setTargetDate(""); setShowCreator(false);
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
      setMessage(result.alreadyAdded ? "That mission is already active." : "Mission added to today's objectives.");
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setTimeout(() => setMessage(""), 2500);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) =>
      (await api.patch(`/goals/${id}`, updates)).data.data,
    onSuccess: () => {
      setMessage("Objective updated.");
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setTimeout(() => setMessage(""), 2500);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/goals/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });

  const goals = data?.goals || [];
  const visibleGoals = useMemo(
    () => filter === "all" ? goals : goals.filter((goal) => goal.category === filter),
    [goals, filter]
  );

  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");
  const planned = goals.filter((g) => g.aiGenerated).length;
  const avgProgress = goals.length ? Math.round(goals.reduce((sum, g) => sum + Number(g.progress || 0), 0) / goals.length) : 0;

  const createGoal = () => {
    if (title.trim() && !createMutation.isPending) createMutation.mutate();
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="relative min-h-full overflow-hidden pb-20">
      <AmbientField />
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="relative space-y-6">
        <motion.header variants={staggerItem} className="relative overflow-hidden rounded-[30px] border border-cyan-400/10 bg-slate-950/75 p-6 shadow-2xl backdrop-blur-xl sm:p-8 lg:p-10">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }} className="absolute -right-10 -top-16 h-48 w-48 rounded-full border border-dashed border-cyan-400/10" />
          <div className="absolute right-8 top-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-3 flex items-center gap-2"><Sparkles size={13} className="text-cyan-400" /><span className="text-[9px] font-black uppercase tracking-[0.35em] text-cyan-400">Hunter Objectives</span></div>
              <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">Goals <span className="text-cyan-400">System</span></h1>
              <p className="mt-3 max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-sm">Turn long-term ambitions into milestones, then convert milestones into missions you can actually complete.</p>
              <div className="mt-6 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest">
                <span className="rounded-full border border-cyan-400/10 bg-cyan-400/5 px-3 py-2 text-cyan-400">{active.length} Active</span>
                <span className="rounded-full border border-violet-400/10 bg-violet-400/5 px-3 py-2 text-violet-300">{planned} Planned</span>
                <span className="rounded-full border border-emerald-400/10 bg-emerald-400/5 px-3 py-2 text-emerald-300">{completed.length} Cleared</span>
              </div>
            </div>
            <ProgressOrb value={avgProgress} />
          </div>
        </motion.header>

        <motion.section variants={staggerItem} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Active Goals" value={active.length} icon={Target} />
          <Metric label="Avg Progress" value={`${avgProgress}%`} icon={Gauge} />
          <Metric label="Plans Built" value={planned} icon={Sparkles} />
          <Metric label="Completed" value={completed.length} icon={Trophy} />
        </motion.section>

        <motion.section variants={staggerItem} className="rounded-[28px] border border-white/5 bg-slate-950/65 p-4 shadow-xl backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-3 text-cyan-400"><Target size={18} /></div>
              <div><h2 className="font-heading text-sm font-black uppercase tracking-wide text-white">Objective Board</h2><p className="mt-1 text-[9px] text-slate-600">Filter your current direction</p></div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map(([value, label]) => (
                <button key={value} onClick={() => setFilter(value)} className={`shrink-0 rounded-xl border px-3 py-2 text-[8px] font-black uppercase tracking-widest transition-all duration-300 ${filter === value ? "border-cyan-400/20 bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/10" : "border-white/5 bg-white/[0.02] text-slate-600 hover:text-slate-300"}`}>{label}</button>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section variants={staggerItem} className="rounded-[28px] border border-cyan-400/10 bg-slate-950/65 p-5 shadow-xl backdrop-blur-xl sm:p-6">
          <button onClick={() => setShowCreator((v) => !v)} className="flex w-full items-center justify-between text-left">
            <div className="flex items-center gap-3"><div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-3 text-cyan-400"><Plus size={18} /></div><div><h2 className="font-heading text-sm font-black uppercase text-white">Create Objective</h2><p className="mt-1 text-[9px] text-slate-600">Define the destination. The system can build the route.</p></div></div>
            <motion.div animate={{ rotate: showCreator ? 180 : 0 }}><ChevronDown size={17} className="text-slate-600" /></motion.div>
          </button>
          <AnimatePresence initial={false}>
            {showCreator && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-5 grid gap-3 border-t border-white/5 pt-5 md:grid-cols-[minmax(0,1fr)_170px_170px_auto]">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createGoal()} placeholder="e.g. Build a production-ready portfolio" className="input min-w-0" maxLength={120} />
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">{CATEGORIES.slice(1).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="input" />
                  <button onClick={createGoal} disabled={!title.trim() || createMutation.isPending} className="min-h-11 rounded-xl bg-cyan-400 px-5 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-40">{createMutation.isPending ? <Loader2 size={17} className="mx-auto animate-spin" /> : <><Plus size={16} className="mr-1 inline" /> Create</>}</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        <AnimatePresence>{message && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300"><Check size={15} />{message}</motion.div>}</AnimatePresence>

        {isLoading ? <div className="grid gap-4">{[1,2,3].map((i) => <div key={i} className="skeleton h-48 rounded-[26px]" />)}</div> : visibleGoals.length === 0 ? <EmptyState hasGoals={goals.length > 0} /> : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-5">
            {visibleGoals.map((goal) => <GoalCard key={goal._id} goal={goal} isOpen={expanded === goal._id} onToggle={() => setExpanded(expanded === goal._id ? null : goal._id)} planMutation={planMutation} addQuestMutation={addQuestMutation} updateMutation={updateMutation} deleteMutation={deleteMutation} />)}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function GoalCard({ goal, isOpen, onToggle, planMutation, addQuestMutation, updateMutation, deleteMutation }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", category: "personal", targetDate: "" });
  const style = CATEGORY_STYLE[goal.category] || CATEGORY_STYLE.other;

  const beginEditing = () => {
    setDraft({
      title: goal.title || "",
      description: goal.description || "",
      category: goal.category || "personal",
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : "",
    });
    setIsEditing(true);
  };

  const saveEdits = (event) => {
    event.preventDefault();
    if (!draft.title.trim() || updateMutation.isPending) return;
    updateMutation.mutate(
      {
        id: goal._id,
        updates: {
          title: draft.title.trim(),
          description: draft.description.trim(),
          category: draft.category,
          targetDate: draft.targetDate || null,
        },
      },
      { onSuccess: () => setIsEditing(false) },
    );
  };
  const milestones = goal.milestones || [];
  const questCount = milestones.reduce((sum, m) => sum + (m.quests?.length || 0), 0);
  const linkedMissionCount = Number(goal.totalGoalQuests || 0);
  const completedMissionCount = Number(goal.completedGoalQuests || 0);
  const missionProgress = linkedMissionCount ? Math.round((completedMissionCount / linkedMissionCount) * 100) : 0;
  const completedMilestones = milestones.filter((m) => m.status === "completed").length;
  const progress = Math.max(0, Math.min(100, Number(goal.progress || 0)));
  const days = goal.targetDate ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000) : null;
  const overdue = days !== null && days < 0 && goal.status !== "completed";

  return (
    <motion.section variants={staggerItem} layout className={`group overflow-hidden rounded-[28px] border bg-slate-950/70 shadow-xl backdrop-blur-xl transition-all duration-500 ${isOpen ? "border-cyan-400/15 shadow-cyan-500/[0.04]" : "border-white/5 hover:-translate-y-1 hover:border-white/10"}`}>
      <div className="p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center">
          <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-lg ${style.bg} ${style.border} ${style.color}`}><span>{style.icon}</span><span className="absolute -inset-1 rounded-2xl border border-white/5 opacity-0 transition group-hover:opacity-100" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${style.bg} ${style.border} ${style.color}`}>{goal.category}</span>
              <span className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${goal.status === "completed" ? "border-emerald-500/15 bg-emerald-500/5 text-emerald-300" : goal.status === "paused" ? "border-amber-500/15 bg-amber-500/5 text-amber-300" : overdue ? "border-red-500/15 bg-red-500/5 text-red-300" : "border-white/5 bg-white/[0.02] text-slate-600"}`}>{goal.status === "completed" ? "Cleared" : goal.status === "paused" ? "Paused" : overdue ? "Overdue" : "Active"}</span>
              {goal.targetDate && <span className="flex items-center gap-1 text-[9px] font-bold text-slate-600"><CalendarDays size={11} />{new Date(goal.targetDate).toLocaleDateString()}</span>}
            </div>
            <h2 className="mt-2 truncate font-heading text-xl font-black text-white sm:text-2xl">{goal.title}</h2>
            {goal.whyItMatters && <p className="mt-1 line-clamp-2 max-w-3xl text-xs leading-relaxed text-slate-500">{goal.whyItMatters}</p>}
          </div>
          <div className="w-full shrink-0 xl:w-56">
            <div className="mb-2 flex items-end justify-between"><span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Progress</span><span className="font-display text-xl font-black text-cyan-400">{progress}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-black/50"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-300 shadow-[0_0_16px_rgba(34,211,238,.25)]" /></div>
            <div className="mt-2 flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-700"><span>{completedMilestones}/{milestones.length || 0} milestones</span><span>{completedMissionCount}/{linkedMissionCount || questCount} missions cleared</span></div>
            {linkedMissionCount > 0 ? (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[7px] font-black uppercase tracking-widest text-slate-700"><span>Mission Completion</span><span>{missionProgress}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${missionProgress}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.2)]" />
                </div>
              </div>
            ) : milestones.length > 0 ? (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[7px] font-black uppercase tracking-widest text-slate-600">
                <span>Mission Status</span>
                <span>Ready to activate</span>
              </div>
            ) : null}
          </div>
        </div>

        {isEditing && (
          <form onSubmit={saveEdits} className="mt-6 rounded-2xl border border-cyan-400/10 bg-black/20 p-4 sm:p-5">
            <h3 className="mb-4 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">Edit Objective</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Title
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={120} required className="input w-full normal-case" />
              </label>
              <label className="space-y-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Category
                <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="input w-full normal-case">
                  {CATEGORIES.slice(1).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:col-span-2">
                Description
                <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} maxLength={500} rows={3} className="input w-full normal-case" />
              </label>
              <label className="space-y-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                Target date
                <input type="date" value={draft.targetDate} onChange={(event) => setDraft({ ...draft, targetDate: event.target.value })} className="input w-full normal-case" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setIsEditing(false)} className="rounded-xl border border-white/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" disabled={!draft.title.trim() || updateMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-950 disabled:opacity-50">
                {updateMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save changes
              </button>
            </div>
          </form>
        )}

        {goal.status === "completed" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex flex-col gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.045] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-2 text-emerald-300"><Check size={16} /></div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">Objective Cleared</p>
                <p className="mt-1 text-[10px] text-slate-500">Every linked mission has been completed. This objective is complete.</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-emerald-400/10 bg-emerald-400/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-emerald-300">100% Complete</span>
          </motion.div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <MiniStat icon={Trophy} label="Milestones" value={`${completedMilestones}/${milestones.length || 0}`} />
          <MiniStat icon={Zap} label="Missions" value={questCount} />
          <MiniStat icon={Clock3} label="Focus Minutes" value={(Number(goal.focusMinutes || 0)) + "m"} />
          <MiniStat icon={Clock3} label="Timeline" value={days === null ? "Open" : days < 0 ? `${Math.abs(days)}d late` : `${days}d`} />
          <MiniStat icon={Check} label="Mission Progress" value={linkedMissionCount ? `${completedMissionCount}/${linkedMissionCount}` : "Not started"} />
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {goal.status !== "completed" && (
            <button onClick={() => updateMutation.mutate({ id: goal._id, updates: { status: goal.status === "paused" ? "active" : "paused" } })} disabled={updateMutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-amber-300 transition hover:bg-amber-500/10 disabled:opacity-50">
              {updateMutation.isPending && updateMutation.variables?.id === goal._id ? <Loader2 size={14} className="animate-spin" /> : goal.status === "paused" ? <Play size={14} /> : <Pause size={14} />}
              {goal.status === "paused" ? "Resume" : "Pause"}
            </button>
          )}
          <button onClick={beginEditing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 transition hover:text-white">
            <Pencil size={14} /> Edit
          </button>
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => planMutation.mutate(goal._id)} disabled={planMutation.isPending} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-violet-500/15 bg-violet-500/5 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-violet-300 transition hover:bg-violet-500/10 disabled:opacity-50">{planMutation.isPending && planMutation.variables === goal._id ? <Loader2 size={15} className="animate-spin" /> : <WandSparkles size={15} />}{goal.aiGenerated ? "Rebuild Path" : "Build My Path"}</motion.button>
          <button onClick={onToggle} className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 transition hover:text-white sm:min-w-32"><ChevronDown size={15} className={isOpen ? "rotate-180 transition-transform" : "transition-transform"} />{isOpen ? "Collapse" : "Explore"}</button>
          <button onClick={() => deleteMutation.mutate(goal._id)} disabled={deleteMutation.isPending} className="rounded-xl border border-white/5 px-4 py-3 text-slate-600 transition hover:border-red-500/15 hover:bg-red-500/5 hover:text-red-400" aria-label="Delete goal"><Trash2 size={15} className="mx-auto" /></button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/5 bg-black/10">
          <div className="p-5 sm:p-6 lg:p-7">
            {!milestones.length ? <div className="rounded-2xl border border-dashed border-violet-400/10 py-10 text-center"><Sparkles className="mx-auto text-violet-400" size={25} /><p className="mt-2 text-xs text-slate-500">Build the path to generate milestones and missions.</p></div> : <div className="relative space-y-4">{milestones.map((milestone, index) => <Milestone key={milestone._id} milestone={milestone} index={index} goal={goal} addQuestMutation={addQuestMutation} />)}</div>}
          </div>
        </motion.div>}
      </AnimatePresence>
    </motion.section>
  );
}

function Milestone({ milestone, index, goal, addQuestMutation }) {
  const complete = milestone.status === "completed";
  const milestoneQuests = milestone.quests || [];
  const cleared = milestoneQuests.filter((quest) => quest.runtimeStatus === "completed").length;
  // Backend is authoritative, but treat a completed previous milestone as an
  // immediate unlock even if an old cached payload still says "locked".
  const previousMilestone = (goal.milestones || [])[index - 1];
  const isUnlocked = index === 0
    || previousMilestone?.status === "completed"
    || (previousMilestone?.quests?.length > 0
      && previousMilestone.quests.every((quest) => quest.runtimeStatus === "completed"));
  const effectiveStatus = complete ? "completed" : isUnlocked ? "active" : "locked";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`relative rounded-2xl border p-4 sm:p-5 ${complete ? "border-emerald-500/15 bg-emerald-500/[0.025]" : "border-white/5 bg-slate-950/55"}`}
    >
      <div className="flex gap-3 sm:gap-4">
        <motion.div
          animate={complete ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 1.8, repeat: complete ? Infinity : 0 }}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[10px] font-black ${complete ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-violet-500/15 bg-violet-500/5 text-violet-300"}`}
        >
          {complete ? <Check size={15} /> : String(index + 1).padStart(2, "0")}
        </motion.div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-sm font-black text-white sm:text-base">{milestone.title}</h3>
            <span className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-widest ${complete ? "border-emerald-500/15 bg-emerald-500/5 text-emerald-300" : "border-white/5 bg-white/[0.02] text-slate-600"}`}>
              {complete ? "Completed" : effectiveStatus === "active" ? "Available" : "Locked"}
            </span>
            {milestoneQuests.length > 0 && (
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-700">
                {cleared}/{milestoneQuests.length} cleared
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{milestone.description}</p>

          <div className="mt-4 space-y-2">
            {milestoneQuests.map((quest) => {
              const status = quest.runtimeStatus || "not_added";
              const isCompleted = status === "completed";
              const isActive = status === "active";
              const isFailed = status === "failed" || status === "expired";

              return (
                <motion.div
                  key={quest._id}
                  layout
                  className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
                    isCompleted
                      ? "border-emerald-500/15 bg-emerald-500/[0.035]"
                      : isActive
                        ? "border-cyan-400/10 bg-cyan-400/[0.025]"
                        : "border-white/5 bg-slate-900/60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${isCompleted ? "border-emerald-400/15 bg-emerald-400/10 text-emerald-300" : isActive ? "border-cyan-400/15 bg-cyan-400/10 text-cyan-300" : "border-white/5 bg-white/[0.02] text-slate-700"}`}>
                        {isCompleted ? <Check size={12} /> : <Target size={11} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-xs font-bold ${isCompleted ? "text-emerald-200 line-through decoration-emerald-400/40" : "text-slate-200"}`}>{quest.title}</p>
                          <span className={`rounded-md border px-2 py-1 text-[7px] font-black uppercase tracking-widest ${isCompleted ? "border-emerald-400/10 bg-emerald-400/5 text-emerald-300" : isActive ? "border-cyan-400/10 bg-cyan-400/5 text-cyan-300" : isFailed ? "border-red-400/10 bg-red-400/5 text-red-300" : "border-white/5 bg-white/[0.02] text-slate-600"}`}>
                            {isCompleted ? "Completed" : isActive ? "In Daily Quests" : isFailed ? "Needs Retry" : "Not Started"}
                          </span>
                        </div>
                        {quest.description && <p className="mt-1 text-[10px] leading-relaxed text-slate-600">{quest.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-md bg-cyan-500/5 px-2 py-1 text-[8px] font-black uppercase text-cyan-400">+{quest.xpReward} XP</span>
                          <span className="rounded-md bg-white/[0.03] px-2 py-1 text-[8px] font-black uppercase text-slate-600">Rank {quest.difficulty}</span>
                          {isCompleted && quest.completedAt && <span className="rounded-md bg-emerald-500/5 px-2 py-1 text-[8px] font-black uppercase text-emerald-300">Cleared {new Date(quest.completedAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isCompleted ? (
                    <div className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-400/10 bg-emerald-400/5 px-3 py-2.5 text-[8px] font-black uppercase tracking-widest text-emerald-300">
                      <Check size={12} /> Cleared
                    </div>
                  ) : isActive ? (
                    <div className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-400/10 bg-cyan-400/5 px-3 py-2.5 text-[8px] font-black uppercase tracking-widest text-cyan-300">
                      <Flame size={12} /> Active Mission
                    </div>
                  ) : (
                    <button
                      onClick={() => addQuestMutation.mutate({ goalId: goal._id, milestoneId: milestone._id, goalQuestId: quest._id })}
                      disabled={addQuestMutation.isPending || effectiveStatus === "locked"}
                      className="shrink-0 rounded-lg border border-cyan-400/15 bg-cyan-400/5 px-3 py-2.5 text-[8px] font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {addQuestMutation.isPending && addQuestMutation.variables?.goalQuestId === quest._id ? "Adding…" : <><Check size={12} className="mr-1 inline" /> Add Mission</>}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MiniStat({ icon: Icon, label, value }) { return <div className="rounded-xl border border-white/5 bg-white/[0.015] p-3"><Icon size={13} className="mb-2 text-slate-700" /><p className="font-display text-sm font-black text-slate-200">{value}</p><p className="mt-1 text-[7px] font-black uppercase tracking-widest text-slate-700">{label}</p></div>; }
function Metric({ label, value, icon: Icon }) { return <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 backdrop-blur-xl"><div className="mb-3 inline-flex rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-2 text-cyan-400"><Icon size={15} /></div><p className="font-display text-xl font-black text-white sm:text-2xl">{value}</p><p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</p></motion.div>; }
function ProgressOrb({ value }) { return <div className="relative mx-auto h-44 w-44"><motion.div animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} className="absolute inset-1 rounded-full border border-dashed border-cyan-400/15" /><div className="absolute inset-6 rounded-full border border-cyan-400/10 bg-cyan-400/[0.03] shadow-[0_0_55px_rgba(34,211,238,.08)]" /><div className="absolute inset-0 flex flex-col items-center justify-center"><Target size={17} className="mb-2 text-cyan-400" /><span className="font-display text-4xl font-black text-white">{value}%</span><span className="mt-1 text-[7px] font-black uppercase tracking-[0.25em] text-slate-600">Objective Sync</span></div></div>; }
function EmptyState({ hasGoals }) { return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[28px] border border-dashed border-white/5 bg-slate-950/50 p-12 text-center"><Target className="mx-auto text-slate-700" size={34} /><h3 className="mt-4 font-heading font-black uppercase text-white">{hasGoals ? "No objectives in this category" : "No objectives yet"}</h3><p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-600">{hasGoals ? "Switch the filter to see another direction." : "Choose one meaningful outcome. The system will help turn it into milestones and missions."}</p></motion.div>; }
function AmbientField() { return <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"><motion.div animate={{ x: [0, 30, 0], y: [0, 18, 0], opacity: [.18, .35, .18] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" /><motion.div animate={{ x: [0, -25, 0], opacity: [.15, .3, .15] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute right-0 top-[45%] h-80 w-80 rounded-full bg-violet-600/10 blur-[110px]" /></div>; }
