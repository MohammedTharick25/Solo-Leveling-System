import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Plus,
  Play,
  CheckCircle2,
  Trash2,
  ChevronDown,
  RefreshCw,
  Repeat,
  LayoutGrid,
  List,
  Zap,
  Clock,
  AlertCircle,
  Briefcase,
  Book,
  Dumbbell,
  Sword,
  Palette,
  MessageSquare,
  MoreHorizontal,
  Terminal,
} from "lucide-react";
import { useForm } from "react-hook-form";
import api from "../../lib/api.js";
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
  DiffBadge,
  Input,
} from "../../components/ui/PageLoader.jsx";

const PRIORITY_THEMES = {
  low: {
    color: "text-slate-400",
    border: "border-slate-500/30",
    bg: "bg-slate-500/5",
    glow: "",
  },
  medium: {
    color: "text-blue-400",
    border: "border-blue-500/40",
    bg: "bg-blue-500/10",
    glow: "shadow-glow-blue-sm",
  },
  high: {
    color: "text-yellow-400",
    border: "border-yellow-500/40",
    bg: "bg-yellow-500/10",
    glow: "shadow-glow-yellow-sm",
  },
  critical: {
    color: "text-red-400",
    border: "border-red-500/50",
    bg: "bg-red-500/15",
    glow: "shadow-glow-red-sm",
  },
};

const CATEGORY_ICONS = {
  work: <Briefcase size={14} />,
  study: <Book size={14} />,
  project: <Terminal size={14} />,
  reading: <Book size={14} />,
  fitness: <Dumbbell size={14} />,
  personal: <Target size={14} />,
  creative: <Palette size={14} />,
  communication: <MessageSquare size={14} />,
  other: <Sword size={14} />,
};

const STATUS_FILTER = ["all", "pending", "inProgress", "completed"];

const FREQ_OPTIONS = [
  { value: "daily", label: "Every Day" },
  { value: "weekdays", label: "Weekdays Only" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function RaidsPage() {
  const [tab, setTab] = useState("raids");
  const [viewMode, setViewMode] = useState("grid");
  const [createModal, setCreateModal] = useState(false);
  const [recurringModal, setRecurringModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();
  const { playQuestComplete } = useAudio();

  const {
    register: reg,
    handleSubmit: hs,
    reset: rs,
    formState: { errors: e1 },
  } = useForm();
  const {
    register: regR,
    handleSubmit: hsR,
    reset: rsR,
    formState: { errors: e2 },
  } = useForm({ defaultValues: { recurringFrequency: "daily" } });

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ["raids", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const { data } = await api.get(`/raids${params}`);
      return data.data;
    },
  });

  const { data: recurringData } = useQuery({
    queryKey: ["raids-recurring"],
    queryFn: async () => {
      const { data } = await api.get("/raids/recurring");
      return data.data;
    },
    enabled: tab === "recurring",
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body) => api.post("/raids", body),
    onSuccess: () => {
      setCreateModal(false);
      rs();
      queryClient.invalidateQueries({ queryKey: ["raids"] });
    },
  });

  const createRecurringMutation = useMutation({
    mutationFn: (body) => api.post("/raids/recurring", body),
    onSuccess: () => {
      setRecurringModal(false);
      rsR();
      queryClient.invalidateQueries({ queryKey: ["raids-recurring"] });
      queryClient.invalidateQueries({ queryKey: ["raids"] });
    },
  });

  const startMutation = useMutation({
    mutationFn: (id) => api.patch(`/raids/${id}/start`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["raids"] }),
  });

  const completeMutation = useMutation({
    mutationFn: (id) => api.patch(`/raids/${id}/complete`),
    onSuccess: () => {
      playQuestComplete();
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
      queryClient.invalidateQueries({ queryKey: ["raids"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/raids/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["raids"] }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => api.delete(`/raids/recurring/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["raids-recurring"] }),
  });

  const raids = data?.raids || [];
  const templates = recurringData?.templates || [];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pb-20"
    >
      {/* Header */}
      <div className="relative mb-10 p-6 glass-dark border-l-4 border-cyan-500 rounded-r-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="text-system mb-1">Raid Command</p>
            <h1 className="font-heading font-black text-3xl text-white italic tracking-tighter uppercase">
              Task Raids
            </h1>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button
              variant="secondary"
              className="flex-1 md:flex-none py-2.5"
              onClick={() => setRecurringModal(true)}
            >
              <Repeat size={14} />{" "}
              <span className="text-[10px] font-black uppercase tracking-widest ml-1">
                Templates
              </span>
            </Button>
            <Button
              variant="primary"
              className="flex-1 md:flex-none py-2.5"
              onClick={() => setCreateModal(true)}
            >
              <Plus size={16} />{" "}
              <span className="text-[10px] font-black uppercase tracking-widest ml-1">
                New Raid
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex gap-2 bg-black/20 p-1 rounded-xl border border-white/5 w-fit">
          {[
            { id: "raids", label: "⚔️ Active Raids" },
            { id: "recurring", label: "🔁 Recurring" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg font-heading text-xs font-black uppercase tracking-widest transition-all
                          ${tab === t.id ? "bg-cyan-500 text-slate-950 shadow-glow-cyan" : "text-slate-500 hover:text-slate-300"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "raids" && (
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
              {STATUS_FILTER.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg font-heading text-[10px] font-black uppercase tracking-tighter border transition-all whitespace-nowrap
                              ${statusFilter === s ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400" : "border-slate-800 text-slate-600 hover:text-slate-400"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="h-6 w-px bg-slate-800 hidden md:block" />
            <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${viewMode === "grid" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-600"}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded ${viewMode === "list" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-600"}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {tab === "raids" ? (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton h-48 rounded-2xl" />
              ))}
            </div>
          ) : raids.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No active raids"
              description="Deploy a Task Raid to start accumulating XP for your real-world progress."
              action={
                <Button variant="primary" onClick={() => setCreateModal(true)}>
                  <Plus size={14} /> New Raid
                </Button>
              }
            />
          ) : (
            <motion.div
              layout
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "flex flex-col gap-3 max-w-5xl mx-auto"
              }
            >
              {raids.map((raid) => (
                <RaidCard
                  key={raid._id}
                  raid={raid}
                  viewMode={viewMode}
                  onStart={() => startMutation.mutate(raid._id)}
                  onComplete={() => completeMutation.mutate(raid._id)}
                  onDelete={() => deleteMutation.mutate(raid._id)}
                />
              ))}
            </motion.div>
          )}
        </>
      ) : (
        /* Recurring View */
        <div className="space-y-4 max-w-4xl mx-auto">
          {templates.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="No recurring logs"
              description="Set up recurring tasks that auto-generate daily, weekly, or monthly."
              action={
                <Button
                  variant="secondary"
                  onClick={() => setRecurringModal(true)}
                >
                  <Repeat size={14} /> Create Recurring
                </Button>
              }
            />
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-3"
            >
              {templates.map((t) => (
                <motion.div
                  key={t._id}
                  variants={staggerItem}
                  className="glass-dark rounded-2xl p-5 flex items-center gap-4 border border-purple-500/20 group hover:border-purple-500/40 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <Repeat
                      size={20}
                      className="text-purple-400 group-hover:rotate-180 transition-transform duration-700"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-heading font-black text-slate-100 tracking-tight uppercase">
                        {t.title}
                      </p>
                      <Badge color="purple" className="text-[8px]">
                        {t.recurringFrequency}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-body text-[10px] text-slate-500 uppercase tracking-widest">
                        +{t.xpReward} XP{" "}
                        <span className="mx-1 opacity-30">/</span> {t.category}
                      </p>
                      <DiffBadge diff={t.difficulty} />
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTemplateMutation.mutate(t._id)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={createModal}
        onClose={() => {
          setCreateModal(false);
          rs();
        }}
        title="Deploy New Raid"
      >
        <form
          onSubmit={hs((d) => createMutation.mutate(d))}
          className="space-y-5"
        >
          <Input
            label="Raid Objective"
            placeholder="Objective name..."
            error={e1.title?.message}
            {...reg("title", { required: "Objective required" })}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Threat Level</label>
              <select className="input" {...reg("difficulty")}>
                {["F", "E", "D", "C", "B", "A", "S"].map((d) => (
                  <option key={d} value={d}>
                    {d} Rank
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Priority</label>
              <select className="input" {...reg("priority")}>
                {["low", "medium", "high", "critical"].map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Class</label>
              <select className="input" {...reg("category")}>
                {Object.keys(CATEGORY_ICONS).map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Estimated Mana (Min)"
              type="number"
              placeholder="30"
              {...reg("estimatedMinutes", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="input-label">Expiring At (optional)</label>
            <input type="datetime-local" className="input" {...reg("dueAt")} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setCreateModal(false);
                rs();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={createMutation.isPending}
            >
              Deploy Raid
            </Button>
          </div>
        </form>
      </Modal>

      {/* Recurring Modal */}
      <Modal
        open={recurringModal}
        onClose={() => {
          setRecurringModal(false);
          rsR();
        }}
        title="Initialize Recurring Loop"
      >
        <form
          onSubmit={hsR((d) => createRecurringMutation.mutate(d))}
          className="space-y-4"
        >
          <Input
            label="Loop Objective"
            placeholder="Morning training, Daily Standup..."
            error={e2.title?.message}
            {...regR("title", { required: "Objective required" })}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Frequency</label>
              <select className="input" {...regR("recurringFrequency")}>
                {FREQ_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Threat Level</label>
              <select className="input" {...regR("difficulty")}>
                {["F", "E", "D", "C", "B", "A", "S"].map((d) => (
                  <option key={d} value={d}>
                    {d} Rank
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Priority</label>
              <select className="input" {...regR("priority")}>
                {["low", "medium", "high", "critical"].map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Class</label>
              <select className="input" {...regR("category")}>
                {Object.keys(CATEGORY_ICONS).map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setRecurringModal(false);
                rsR();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              type="submit"
              loading={createRecurringMutation.isPending}
            >
              <Repeat size={14} className="mr-2" />
              Initialize Loop
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}

function RaidCard({ raid, viewMode, onStart, onComplete, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const theme = PRIORITY_THEMES[raid.priority] || PRIORITY_THEMES.medium;
  const isRecurring = !!raid.parentRaidId;
  const isDone = raid.status === "completed";
  const isInProgress = raid.status === "inProgress";

  const subtaskTotal = raid.subtasks?.length || 0;
  const subtaskDone = raid.subtasks?.filter((s) => s.completed).length || 0;
  const progressPct = subtaskTotal > 0 ? (subtaskDone / subtaskTotal) * 100 : 0;

  if (viewMode === "grid") {
    return (
      <motion.div
        layout
        variants={staggerItem}
        whileHover={{ y: -5 }}
        className={`relative glass-dark rounded-2xl overflow-hidden border-t-2 transition-all duration-300 flex flex-col h-full
                    ${isDone ? "opacity-50 border-emerald-500/50" : `${theme.border} ${theme.glow}`}`}
      >
        <div className="p-5 flex-1">
          <div className="flex justify-between items-start mb-4">
            <div
              className={`p-2 rounded-xl ${theme.bg} ${theme.color} border border-white/5`}
            >
              {CATEGORY_ICONS[raid.category] || <Sword size={14} />}
            </div>
            <div className="flex flex-col items-end gap-1">
              <DiffBadge diff={raid.difficulty} />
              {isRecurring && (
                <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1">
                  <Repeat size={8} /> Loop
                </span>
              )}
            </div>
          </div>

          <h4
            className={`font-heading font-black text-lg mb-1 leading-tight tracking-tight uppercase italic ${isDone ? "text-slate-500 line-through" : "text-white"}`}
          >
            {raid.title}
          </h4>

          <div className="flex items-center gap-3 mb-4">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${theme.color}`}
            >
              {raid.priority}
            </span>
            <span className="text-[10px] text-slate-600 uppercase tracking-widest">
              {raid.category}
            </span>
          </div>

          {subtaskTotal > 0 && (
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                <span>Objective Sync</span>
                <span>
                  {subtaskDone}/{subtaskTotal}
                </span>
              </div>
              <div className="h-1 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <motion.div
                  className="h-full bg-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          )}

          {raid.dueAt && !isDone && (
            <div
              className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest mt-2 ${new Date(raid.dueAt) < new Date() ? "text-red-400 animate-pulse" : "text-slate-500"}`}
            >
              <Clock size={10} />
              {new Date(raid.dueAt) < new Date()
                ? "Raid Overdue"
                : `Due: ${new Date(raid.dueAt).toLocaleDateString()}`}
            </div>
          )}
        </div>

        <div className="p-4 bg-black/20 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1 text-yellow-500">
            <Zap size={10} className="fill-yellow-500" />
            <span className="font-display text-xs font-black">
              +{raid.xpReward}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isDone && (
              <>
                {!isInProgress && (
                  <button
                    onClick={onStart}
                    className="p-2 bg-white/5 rounded-lg text-cyan-400 hover:bg-cyan-500/20 transition-all"
                  >
                    <Play size={14} />
                  </button>
                )}
                <button
                  onClick={onComplete}
                  className="p-2 bg-cyan-500 text-slate-950 rounded-lg shadow-glow-cyan hover:scale-105 transition-all"
                >
                  <CheckCircle2 size={14} />
                </button>
              </>
            )}
            {!isInProgress && !isDone && (
              <button
                onClick={onDelete}
                className="p-2 text-slate-600 hover:text-red-400 transition-all"
              >
                <Trash2 size={14} />
              </button>
            )}
            {subtaskTotal > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className={`p-2 transition-all ${expanded ? "text-cyan-400" : "text-slate-500"}`}
              >
                <ChevronDown
                  size={14}
                  className={expanded ? "rotate-180" : ""}
                />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden bg-black/40 border-t border-white/5"
            >
              <div className="p-4 space-y-2">
                {raid.subtasks.map((sub) => (
                  <div key={sub._id} className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-sm border ${sub.completed ? "bg-cyan-500 border-cyan-500 shadow-glow-cyan-sm" : "border-slate-700"}`}
                    />
                    <span
                      className={`text-[10px] font-heading ${sub.completed ? "text-slate-500 line-through" : "text-slate-300"}`}
                    >
                      {sub.title}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      variants={staggerItem}
      className={`glass-dark rounded-xl p-3 border-l-4 flex flex-col md:flex-row md:items-center gap-4 transition-all
                  ${isDone ? "opacity-50 border-emerald-500" : `${theme.border} ${theme.glow.replace("sm", "xs")}`}`}
    >
      <div
        className={`w-10 h-10 rounded-lg ${theme.bg} ${theme.color} flex items-center justify-center shrink-0 hidden md:flex`}
      >
        {CATEGORY_ICONS[raid.category] || <Sword size={14} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4
            className={`font-heading font-black text-sm tracking-tight uppercase italic truncate ${isDone ? "text-slate-500 line-through" : "text-white"}`}
          >
            {raid.title}
          </h4>
          <DiffBadge diff={raid.difficulty} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className={`text-[9px] font-black uppercase ${theme.color}`}>
            {raid.priority}
          </span>
          <span className="text-[9px] text-slate-600 uppercase tracking-widest">
            {raid.category}
          </span>
          {raid.dueAt && (
            <span className="text-[9px] text-slate-500 uppercase">
              Due: {new Date(raid.dueAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
        <div className="flex items-center gap-1 text-yellow-500">
          <Zap size={10} className="fill-yellow-500" />
          <span className="font-display text-xs font-black">
            +{raid.xpReward}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isDone && (
            <>
              {!isInProgress && (
                <button
                  onClick={onStart}
                  className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-md transition-all"
                >
                  <Play size={14} />
                </button>
              )}
              <button
                onClick={onComplete}
                className="p-1.5 bg-cyan-500 text-slate-950 rounded-md shadow-glow-cyan"
              >
                <CheckCircle2 size={14} />
              </button>
            </>
          )}
          {!isInProgress && !isDone && (
            <button
              onClick={onDelete}
              className="p-1.5 text-slate-600 hover:text-red-400 transition-all"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
