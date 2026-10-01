import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  CheckCircle2,
  Circle,
  Flame,
  Trash2,
  RotateCcw,
  Target,
  Gauge,
  Sparkles,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useForm } from "react-hook-form";
import api from "../../lib/api.js";
import { syncProgressionQueries } from "../../lib/systemSync.js";
import { useAudio } from "../../hooks/useAudio.js";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";
import {
  SectionHeader,
  EmptyState,
  Button,
  Badge,
  Modal,
  Input,
} from "../../components/ui/PageLoader.jsx";

const CATEGORY_OPTIONS = [
  "health",
  "learning",
  "discipline",
  "focus",
  "communication",
  "creativity",
  "finance",
  "other",
];
const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Every Day" },
  { value: "weekdays", label: "Weekdays Only" },
  { value: "weekends", label: "Weekends Only" },
  { value: "custom", label: "Custom Days" },
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CATEGORY_COLORS = {
  health: "text-emerald-400",
  learning: "text-indigo-400",
  discipline: "text-purple-400",
  focus: "text-cyan-400",
  communication: "text-blue-400",
  creativity: "text-fuchsia-400",
  finance: "text-yellow-400",
  other: "text-slate-400",
};

const ICON_OPTIONS = [
  "✅",
  "🏃",
  "📚",
  "💧",
  "🧘",
  "💪",
  "🥗",
  "🎯",
  "✍️",
  "🌅",
  "🧠",
  "🔥",
  "⚡",
  "💤",
  "🎸",
];

export default function HabitsPage() {
  const [createModal, setCreateModal] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const queryClient = useQueryClient();
  const { playQuestComplete } = useAudio();
  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      frequency: "daily",
      icon: "✅",
      category: "other",
      xpReward: 20,
    },
  });
  const frequency = watch("frequency");

  const { data, isLoading } = useQuery({
    queryKey: ["habits"],
    queryFn: async () => {
      const { data } = await api.get("/habits");
      return data.data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["habit-stats"],
    queryFn: async () => {
      const { data } = await api.get("/habits/stats");
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.post("/habits", body),
    onSuccess: () => {
      setCreateModal(false);
      reset();
      setSelectedDays([]);
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habit-stats"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id) => api.post(`/habits/${id}/complete`),
    onSuccess: () => {
      playQuestComplete();
      syncProgressionQueries(queryClient);
    },
  });

  const uncompleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/habits/${id}/complete`),
    onSuccess: () => {
      syncProgressionQueries(queryClient);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/habits/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habit-stats"] });
    },
  });

  const habits = data?.habits || [];
  const stats = statsData?.stats;
  const dueToday = habits.filter((h) => h.isDueToday);
  const notDueToday = habits.filter((h) => !h.isDueToday);

  const onSubmit = (d) => {
    const payload = {
      ...d,
      xpReward: Number(d.xpReward),
      targetDays: frequency === "custom" ? selectedDays : [],
    };
    createMutation.mutate(payload);
  };

  const toggleDay = (i) => {
    setSelectedDays((prev) =>
      prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i],
    );
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="relative mb-7 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[30px] border border-cyan-400/10 bg-slate-950/75 p-5 shadow-2xl backdrop-blur-xl sm:p-7">
        <div className="relative">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={13} className="text-cyan-400" />
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400">Daily Protocol</p>
          </div>
          <h1 className="font-heading font-bold text-2xl text-slate-100">
            Habit Tracker
          </h1>
          <p className="font-body text-sm text-slate-500 mt-1">
            Small daily actions compound into extraordinary results.
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateModal(true)} className="relative z-10">
          <Plus size={14} /> New Habit
        </Button>
      </div>

      {/* Momentum header */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-cyan rounded-2xl p-4 sm:p-5 mb-5 overflow-hidden relative"
        >
          <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Target size={22} className="text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-system">Daily Momentum</p>
                  <p className="font-heading font-semibold text-sm text-slate-200">
                    {stats.completedToday}/{dueToday.length || 0} protocols completed
                  </p>
                </div>
                <span className="font-display text-lg text-cyan-400">
                  {Math.round((stats.completedToday / Math.max(dueToday.length, 1)) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (stats.completedToday / Math.max(dueToday.length, 1)) * 100)}%` }}
                  className="h-full rounded-full bg-cyan-400"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2">{dueToday.length === 0 ? "No habits are scheduled today. A rest day supports consistency." : stats.completedToday >= dueToday.length ? "Daily habits complete. Great work. Take time to recharge." : "Every small step counts. Choose one habit that feels manageable."}</p>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-4"
      >
        <StatCard label="Active Protocols" value={stats?.totalHabits ?? habits.length} icon={Target} />
        <StatCard label="Today's Completion" value={`${Math.round(((stats?.completedToday || 0) / Math.max(dueToday.length, 1)) * 100)}%`} color="text-cyan-400" icon={Gauge} />
        <StatCard label="Best Streak" value={`${stats?.longestCurrentStreak || 0}d`} color="text-orange-400" icon={Flame} />
        <StatCard label="XP Available" value={`+${habits.reduce((sum, h) => sum + Number(h.xpReward || 0), 0)}`} color="text-yellow-400" icon={Zap} />
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-8"
      >
        {/* Due today */}
        <motion.div variants={staggerItem}>
          <SectionHeader label="Today's Protocol" title="Due Today" />
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
          ) : dueToday.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No habits due today"
              description="Create habits to start building your daily protocol."
              action={
                <Button variant="primary" onClick={() => setCreateModal(true)}>
                  <Plus size={14} /> New Habit
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {dueToday.map((habit) => (
                  <HabitCard
                    key={habit._id}
                    habit={habit}
                    onComplete={() => completeMutation.mutate(habit._id)}
                    onUncomplete={() => uncompleteMutation.mutate(habit._id)}
                    onDelete={() => deleteMutation.mutate(habit._id)}
                    loading={
                      completeMutation.isPending || uncompleteMutation.isPending
                    }
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Not due today */}
        {notDueToday.length > 0 && (
          <motion.div variants={staggerItem}>
            <SectionHeader label="Other Habits" title="Not Due Today" />
            <div className="space-y-2 opacity-50">
              {notDueToday.map((habit) => (
                <div
                  key={habit._id}
                  className="glass rounded-xl p-4 flex items-center gap-3"
                >
                  <span className="text-xl">{habit.icon}</span>
                  <p className="font-heading text-sm text-slate-400">
                    {habit.name}
                  </p>
                  <Badge color="slate" className="ml-auto">
                    {habit.frequency}
                  </Badge>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Create modal */}
      <Modal
        open={createModal}
        onClose={() => {
          setCreateModal(false);
          reset();
          setSelectedDays([]);
        }}
        title="Create New Habit"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Icon picker */}
          <div>
            <label className="input-label">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((icon) => (
                <label
                  key={icon}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg cursor-pointer
                              border transition-all ${
                                watch("icon") === icon
                                  ? "border-cyan-500/60 bg-cyan-500/15"
                                  : "border-slate-700 hover:border-slate-500"
                              }`}
                >
                  <input
                    type="radio"
                    value={icon}
                    className="sr-only"
                    {...register("icon")}
                  />
                  {icon}
                </label>
              ))}
            </div>
          </div>

          <Input
            label="Habit Name"
            placeholder="Morning workout, Read 20 pages…"
            {...register("name", { required: true })}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Category</label>
              <select className="input" {...register("category")}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Frequency</label>
              <select className="input" {...register("frequency")}>
                {FREQUENCY_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom day picker */}
          {frequency === "custom" && (
            <div>
              <label className="input-label">Active Days</label>
              <div className="flex gap-2">
                {DAYS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`flex-1 py-1.5 rounded-lg font-heading text-xs font-semibold border transition-all
                                ${
                                  selectedDays.includes(i)
                                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                                    : "border-slate-700 text-slate-500"
                                }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="XP Reward"
              type="number"
              placeholder="20"
              {...register("xpReward", { valueAsNumber: true })}
            />
            <div>
              <label className="input-label">Stat Reward (optional)</label>
              <select className="input" {...register("statReward.stat")}>
                <option value="">None</option>
                {[
                  "discipline",
                  "sense",
                  "vitality",
                  "strength",
                  "intelligence",
                  "communication",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setCreateModal(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={createMutation.isPending}
            >
              Create Habit
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}

function HabitCard({ habit, onComplete, onUncomplete, onDelete, loading }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      whileHover={{ y: -2, scale: 1.005 }}
      className={`group relative overflow-hidden rounded-[22px] p-4 sm:p-5 flex items-center gap-3 sm:gap-4 border bg-slate-950/65 backdrop-blur-xl transition-all duration-300 shadow-xl shadow-black/10
                  ${
                    habit.completedToday
                      ? "border-emerald-500/25 bg-emerald-500/[0.06] shadow-emerald-500/[0.03]"
                      : "border-white/5 hover:-translate-y-0.5 hover:border-cyan-400/15 hover:bg-slate-900/80"
                  }`}
    >
      {/* Complete button */}
      <button
        aria-label={habit.completedToday ? `Undo ${habit.name}` : `Complete ${habit.name}`}
        onClick={habit.completedToday ? onUncomplete : onComplete}
        disabled={loading}
        className={`shrink-0 rounded-2xl border p-1 transition-all duration-300 active:scale-90 ${
          habit.completedToday
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.10)]"
            : "border-white/5 bg-white/[0.02] text-slate-600 hover:border-cyan-400/20 hover:text-cyan-400"
        }`}
      >
        {habit.completedToday ? (
          <CheckCircle2 size={28} />
        ) : (
          <Circle size={28} />
        )}
      </button>

      {/* Icon */}
      <span
        className={`text-2xl shrink-0 ${habit.completedToday ? "" : "animate-float"}`}
      >
        {habit.icon}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={`font-heading font-semibold text-sm
                          ${habit.completedToday ? "text-slate-400 line-through" : "text-slate-100"}`}
          >
            {habit.name}
          </p>
          <Badge color="slate" className="text-[9px]">
            {habit.frequency}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {habit.currentStreak > 0 && (
            <span className="flex items-center gap-1 font-heading text-xs text-orange-400">
              <Flame size={11} /> {habit.currentStreak}d streak
            </span>
          )}
          <span
            className={`font-heading text-xs ${CATEGORY_COLORS[habit.category] || "text-slate-500"}`}
          >
            {habit.category}
          </span>
          <span className="font-display text-[10px] text-yellow-400">
            +{habit.xpReward} XP
          </span>
        </div>
        <div className="mt-2 h-1.5 max-w-xs rounded-full bg-slate-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, ((habit.currentStreak || 0) % 7) / 7 * 100)}%` }}
            className={`h-full rounded-full ${habit.completedToday ? "bg-emerald-400" : "bg-cyan-400/70"}`}
          />
        </div>
      </div>

      {/* Streak best */}
      {habit.longestStreak > 0 && (
        <div className="hidden sm:block text-right shrink-0">
          <p className="text-hud">Best</p>
          <p className="font-display text-sm text-slate-300">
            {habit.longestStreak}d
          </p>
        </div>
      )}

      {/* Quick action */}
      <button
        onClick={habit.completedToday ? onUncomplete : onComplete}
        disabled={loading}
        className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-heading uppercase tracking-wider border transition-all ${habit.completedToday ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" : "border-cyan-500/20 text-cyan-400 bg-cyan-500/5 opacity-70 group-hover:opacity-100"}`}
      >
        {habit.completedToday ? <RotateCcw size={11} /> : <CheckCircle2 size={11} />}
        {habit.completedToday ? "Undo" : "Complete"}
      </button>

      {/* Delete */}
      <button
        aria-label={`Delete ${habit.name}`}
        onClick={onDelete}
        className="text-slate-700 hover:text-red-400 transition-colors p-1 shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}

function StatCard({ label, value, color = "text-slate-100", icon: Icon = Target }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="group rounded-2xl border border-white/5 bg-slate-950/65 p-4 backdrop-blur-xl transition-all hover:border-cyan-400/10 hover:shadow-xl hover:shadow-cyan-500/[0.03]">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-2 text-cyan-400 transition group-hover:scale-105">
          <Icon size={14} />
        </span>
        <TrendingUp size={13} className="text-slate-800" />
      </div>
      <p className={`font-display text-xl font-black ${color}`}>{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-600">{label}</p>
    </motion.div>
  );
}
