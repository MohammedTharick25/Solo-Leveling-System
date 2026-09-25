import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sword,
  History,
  CheckCircle2,
  Flame,
  AlertTriangle,
  Target,
  Shield,
  Activity,
  BookOpen,
  MessageSquare,
  Crown,
  Zap,
  Clock3,
  Sparkles,
  Trophy,
  ChevronDown,
  CircleDot,
  Gauge,
  CalendarDays,
  ListChecks,
} from "lucide-react";
import api from "../../lib/api.js";
import { useAudio } from "../../hooks/useAudio.js";
import { pageVariants } from "../../lib/animations.js";
import { EmptyState, DiffBadge, Button } from "../../components/ui/PageLoader.jsx";
import { useHunterStore } from "../../stores/hunterStore.js";

const CATEGORY_CONFIG = {
  focus: { icon: Target, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/25", bar: "bg-cyan-400" },
  discipline: { icon: Shield, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/25", bar: "bg-purple-400" },
  health: { icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", bar: "bg-emerald-400" },
  learning: { icon: BookOpen, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/25", bar: "bg-indigo-400" },
  communication: { icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25", bar: "bg-blue-400" },
  leadership: { icon: Crown, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/25", bar: "bg-rose-400" },
  productivity: { icon: Gauge, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", bar: "bg-amber-400" },
  creativity: { icon: Sparkles, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/25", bar: "bg-pink-400" },
  finance: { icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/25", bar: "bg-yellow-400" },
  emotionalControl: { icon: CircleDot, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/25", bar: "bg-violet-400" },
  timeManagement: { icon: Clock3, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/25", bar: "bg-sky-400" },
  default: { icon: Zap, color: "text-slate-400", bg: "bg-slate-800/60", border: "border-slate-700/60", bar: "bg-slate-400" },
};

const FILTERS = [
  { id: "all", label: "All Quests" },
  { id: "active", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

export default function QuestsPage() {
  const [tab, setTab] = useState("today");
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();
  const { playQuestComplete } = useAudio();
  const { hunter } = useHunterStore();

  const { data: questData, isLoading } = useQuery({
    queryKey: ["quests"],
    queryFn: async () => {
      const { data } = await api.get("/quests");
      return data.data;
    },
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["quest-history"],
    queryFn: async () => {
      const { data } = await api.get("/quests/history");
      return data.data;
    },
    enabled: tab === "history",
  });

  const completeMutation = useMutation({
    mutationFn: (id) => api.patch(`/quests/${id}/complete`),
    onSuccess: (res) => {
      playQuestComplete();
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
      if (res.data.data.allDone) queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const progressMutation = useMutation({
    mutationFn: ({ id, value }) => api.patch(`/quests/${id}/progress`, { value }),
    onSuccess: (res) => {
      if (res.data.data.autoCompleted) playQuestComplete();
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    },
  });

  const quests = questData?.quests || [];
  const total = questData?.total || quests.length;
  const completed = questData?.completed || quests.filter((q) => q.status === "completed").length;
  const allDone = questData?.allDone || false;
  const activeQuests = quests.filter((q) => q.status === "active");
  const completedQuests = quests.filter((q) => q.status === "completed");
  const visibleQuests = filter === "active" ? activeQuests : filter === "completed" ? completedQuests : quests;

  const totalXp = useMemo(() => quests.reduce((sum, quest) => sum + Number(quest.xpReward || 0), 0), [quests]);
  const earnedXp = useMemo(() => completedQuests.reduce((sum, quest) => sum + Number(quest.xpReward || 0), 0), [completedQuests]);
  const progressPercent = total ? Math.round((completed / total) * 100) : 0;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="pb-20">
      <QuestHero
        completed={completed}
        total={total}
        progressPercent={progressPercent}
        streak={hunter?.currentStreak || 0}
        allDone={allDone}
        totalXp={totalXp}
        earnedXp={earnedXp}
      />

      <QuestNavigation tab={tab} setTab={setTab} />

      {tab === "today" ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays size={15} className="text-cyan-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Today&apos;s mission board</p>
              </div>
              <h2 className="font-heading font-black text-xl text-white">Your Daily Quests</h2>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filter === item.id ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <QuestSkeleton />
          ) : quests.length === 0 ? (
            <EmptyState
              icon={Sword}
              title="No Daily Quests"
              description="Your mission board is empty. Refresh the System to check for new assignments."
              action={<Button variant="primary" onClick={() => queryClient.invalidateQueries({ queryKey: ["quests"] })}>Refresh Missions</Button>}
            />
          ) : visibleQuests.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing Here" description={`There are no ${filter === "active" ? "active" : "completed"} quests right now.`} />
          ) : (
            <motion.div layout className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <AnimatePresence mode="popLayout">
                {visibleQuests.map((quest, index) => (
                  <QuestCard
                    key={quest._id}
                    quest={quest}
                    index={index}
                    completed={quest.status === "completed"}
                    onComplete={() => completeMutation.mutate(quest._id)}
                    onProgress={(value) => progressMutation.mutate({ id: quest._id, value })}
                    completing={completeMutation.isPending}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      ) : historyLoading ? (
        <QuestSkeleton compact />
      ) : (
        <QuestHistoryList history={historyData?.quests || []} />
      )}
    </motion.div>
  );
}

function QuestHero({ completed, total, progressPercent, streak, allDone, totalXp, earnedXp }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900/90 to-cyan-950/20 p-5 sm:p-7 mb-7 shadow-2xl shadow-black/20">
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_85%_20%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_10%_100%,rgba(168,85,247,0.10),transparent_30%)]" />
      <div className="absolute right-8 top-8 h-28 w-28 rounded-full border border-cyan-400/10 animate-pulse" />
      <div className="absolute right-14 top-14 h-16 w-16 rounded-full border border-cyan-400/10" />

      <div className="relative grid lg:grid-cols-[1fr_auto] gap-7 items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">
              <Sparkles size={11} /> Personalized Mission Board
            </span>
            {allDone && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                <CheckCircle2 size={11} /> Day Cleared
              </span>
            )}
          </div>

          <h1 className="font-heading font-black text-3xl sm:text-4xl text-white tracking-tight">Daily Quests</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Five focused missions built around your goals. Complete them one step at a time and turn today&apos;s effort into permanent progress.
          </p>

          <div className="mt-6 max-w-2xl">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Daily completion</p>
                <p className="font-heading font-black text-lg text-white mt-0.5">{completed} <span className="text-slate-600">/</span> {total} cleared</p>
              </div>
              <span className="font-display text-2xl font-black text-cyan-300">{progressPercent}%</span>
            </div>
            <div className="h-2.5 rounded-full border border-white/5 bg-black/50 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${allDone ? "bg-emerald-400" : "bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400"}`}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:min-w-[180px]">
          <HeroStat icon={Flame} label="Streak" value={streak} accent="text-orange-400" />
          <HeroStat icon={Zap} label="XP Available" value={totalXp} accent="text-yellow-400" />
          <HeroStat icon={Trophy} label="XP Earned" value={earnedXp} accent="text-emerald-400" />
        </div>
      </div>
    </section>
  );
}

function HeroStat({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/30 px-3 py-3 sm:px-4">
      <div className="flex items-center gap-2">
        <Icon size={14} className={accent} />
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{label}</span>
      </div>
      <p className="font-display font-black text-lg text-white mt-1">{value}</p>
    </div>
  );
}

function QuestNavigation({ tab, setTab }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
      <div className="flex gap-1 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-1.5 w-fit">
        <TabBtn active={tab === "today"} onClick={() => setTab("today")} icon={Sword} label="Today" />
        <TabBtn active={tab === "history"} onClick={() => setTab("history")} icon={History} label="Quest History" />
      </div>
      <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
        <ListChecks size={13} className="text-cyan-500" /> Small wins. Daily consistency. Long-term growth.
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-heading text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${active ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20" : "text-slate-500 hover:text-slate-200 hover:bg-white/5"}`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

function QuestCard({ quest, index, onComplete, onProgress, completing, completed }) {
  const [inputValue, setInputValue] = useState(quest.currentValue || 0);
  const [expanded, setExpanded] = useState(false);
  const cfg = CATEGORY_CONFIG[quest.category] || CATEGORY_CONFIG.default;
  const Icon = cfg.icon;
  const target = Number(quest.targetValue || 0);
  const current = Number(quest.currentValue || 0);
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : completed ? 100 : 0;
  const unit = quest.unit || "task";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: completed ? 0.78 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -8 }}
      whileHover={!completed ? { y: -4 } : undefined}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.25) }}
      className={`group relative overflow-hidden rounded-2xl border bg-slate-950/70 transition-all duration-300 ${completed ? "border-emerald-500/20" : `${cfg.border} hover:border-white/15 hover:bg-slate-900/80`}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${completed ? "bg-emerald-400" : cfg.bar}`} />
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-cyan-400/[0.025] blur-2xl pointer-events-none" />

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className={`relative shrink-0 flex h-11 w-11 items-center justify-center rounded-xl border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
            <Icon size={19} />
            <span className="absolute -bottom-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full border border-slate-950 bg-slate-800 text-[8px] font-black text-slate-400 flex items-center justify-center">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-[9px] font-black uppercase tracking-[0.18em] ${cfg.color}`}>{formatCategory(quest.category)}</span>
              <span className="text-slate-700">•</span>
              <DiffBadge diff={quest.difficulty} />
              {quest.isSystemGenerated && !completed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/5 border border-cyan-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-cyan-400">
                  <Sparkles size={9} /> Personalized
                </span>
              )}
            </div>

            <h3 className={`font-heading font-black text-lg sm:text-xl leading-snug tracking-tight ${completed ? "text-slate-500 line-through" : "text-white"}`}>
              {quest.title}
            </h3>
          </div>

          <div className="hidden sm:flex shrink-0 items-center gap-1 rounded-lg border border-yellow-500/10 bg-yellow-500/5 px-2.5 py-1.5">
            <Zap size={12} className="text-yellow-400" />
            <span className="font-display text-xs font-black text-yellow-300">+{quest.xpReward || 0}</span>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.025] p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600 mb-1.5">What to do</p>
          <p className="text-sm leading-6 text-slate-300 break-user-content">{quest.description}</p>
        </div>

        {quest.purpose && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="w-full flex items-center justify-between gap-3 text-left rounded-xl border border-transparent px-1 py-1.5 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <span className="text-[9px] font-black uppercase tracking-[0.18em]">Why this matters</span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <p className="px-1 pb-2 text-xs leading-5 text-slate-500 break-user-content">{quest.purpose}</p>
                  {quest.expectedOutcome && <p className="px-1 pb-1 text-xs leading-5 text-cyan-400/70 break-user-content"><span className="text-slate-600">Expected outcome:</span> {quest.expectedOutcome}</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <InfoPill label="Target" value={`${current}/${target || 1}`} icon={Target} />
          <InfoPill label="Unit" value={formatUnit(unit)} icon={Clock3} />
          <InfoPill label="Reward" value={`+${quest.xpReward || 0} XP`} icon={Zap} />
          <InfoPill label="Status" value={completed ? "Cleared" : "Active"} icon={completed ? CheckCircle2 : CircleDot} />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Mission progress</span>
            <span className="font-display text-[10px] font-black text-slate-300">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-black/60 border border-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className={`h-full rounded-full ${completed ? "bg-emerald-400" : cfg.bar}`}
            />
          </div>
        </div>

        {!completed ? (
          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            {target > 1 && (
              <div className="flex gap-2 sm:flex-1">
                <input
                  type="number"
                  min="0"
                  max={target}
                  value={inputValue}
                  onChange={(event) => setInputValue(Math.max(0, Number(event.target.value)))}
                  aria-label={`Progress for ${quest.title}`}
                  className="w-24 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => onProgress(inputValue)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-300 hover:bg-white/[0.07] hover:text-white transition-all"
                >
                  Update Progress
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onComplete}
              disabled={completing}
              className="flex-1 rounded-xl bg-cyan-400 px-4 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-950 hover:bg-cyan-300 active:scale-[0.99] disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/10"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <CheckCircle2 size={14} />
                {completing ? "Clearing..." : "Complete Quest"}
              </span>
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/5 py-3">
            <CheckCircle2 size={15} className="text-emerald-400" />
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-400">Mission Complete</span>
          </motion.div>
        )}
      </div>
    </motion.article>
  );
}

function InfoPill({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-slate-600">
        <Icon size={11} />
        <span className="text-[8px] font-black uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 truncate text-[10px] font-bold text-slate-300" title={String(value)}>{value}</p>
    </div>
  );
}

function QuestHistoryList({ history }) {
  if (!history.length) {
    return <EmptyState icon={History} title="No Quest History" description="Completed and expired missions will appear here once you build your record." />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-5 flex items-center gap-2">
        <History size={16} className="text-cyan-400" />
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Archive</p>
          <h2 className="font-heading font-black text-xl text-white">Quest History</h2>
        </div>
      </div>

      <div className="space-y-2">
        {history.map((quest, index) => (
          <motion.div
            key={quest._id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index * 0.035, 0.25) }}
            className="group rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 sm:p-5 hover:border-slate-700 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className={`h-10 w-1 rounded-full ${quest.status === "completed" ? "bg-emerald-400" : "bg-red-400"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading font-bold text-sm text-slate-100 break-user-content">{quest.title}</h3>
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-600">{formatCategory(quest.category)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] text-slate-600">
                  <span>{quest.updatedAt ? new Date(quest.updatedAt).toLocaleDateString() : "—"}</span>
                  <span>•</span>
                  <span>{quest.status === "completed" ? "Completed" : "Incomplete"}</span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                <DiffBadge diff={quest.difficulty} />
                {quest.status === "completed" && <span className="font-display text-xs font-black text-yellow-400">+{quest.xpReward || 0} XP</span>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function QuestSkeleton({ compact = false }) {
  return (
    <div className={compact ? "space-y-3 max-w-4xl mx-auto" : "grid grid-cols-1 xl:grid-cols-2 gap-5"}>
      {Array.from({ length: compact ? 6 : 5 }).map((_, index) => (
        <div key={index} className={`skeleton rounded-2xl ${compact ? "h-20" : "h-[430px]"}`} />
      ))}
    </div>
  );
}

function formatCategory(value = "quest") {
  return String(value).replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function formatUnit(value = "task") {
  const map = { minutes: "Minutes", minute: "Minute", session: "Session", sessions: "Sessions", entries: "Entries", entry: "Entry", task: "Task", tasks: "Tasks" };
  return map[value] || formatCategory(value);
}
