import { useState } from "react";
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
} from "lucide-react";
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
  DiffBadge,
  Button,
  Badge,
} from "../../components/ui/PageLoader.jsx";
import { useHunterStore } from "../../stores/hunterStore.js";

const CATEGORY_CONFIG = {
  focus: {
    icon: Target,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    glow: "shadow-glow-cyan-sm",
  },
  discipline: {
    icon: Shield,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    glow: "shadow-glow-purple-sm",
  },
  health: {
    icon: Activity,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    glow: "shadow-glow-emerald-sm",
  },
  learning: {
    icon: BookOpen,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    glow: "shadow-glow-indigo-sm",
  },
  communication: {
    icon: MessageSquare,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    glow: "shadow-glow-blue-sm",
  },
  leadership: {
    icon: Crown,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    glow: "shadow-glow-rose-sm",
  },
  default: {
    icon: Zap,
    color: "text-slate-400",
    bg: "bg-slate-800/10",
    border: "border-slate-700/50",
    glow: "",
  },
};

export default function QuestsPage() {
  const [tab, setTab] = useState("today");
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

  const { data: historyData } = useQuery({
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
      if (res.data.data.allDone) {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    },
  });

  const progressMutation = useMutation({
    mutationFn: ({ id, value }) =>
      api.patch(`/quests/${id}/progress`, { value }),
    onSuccess: (res) => {
      if (res.data.data.autoCompleted) playQuestComplete();
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    },
  });

  const quests = questData?.quests || [];
  const total = questData?.total || 0;
  const completed = questData?.completed || 0;
  const allDone = questData?.allDone || false;

  const activeQuests = quests.filter((q) => q.status === "active");
  const completedQuests = quests.filter((q) => q.status === "completed");

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pb-20"
    >
      {/* Dynamic Header */}
      <div className="relative mb-10">
        <div className="absolute -left-4 top-0 w-1 h-full bg-cyan-500 shadow-glow-cyan" />
        <p className="text-system mb-1 ml-2">System Directives</p>
        <h1 className="font-heading font-black text-4xl text-white ml-2 tracking-tighter uppercase italic">
          Daily Quests
        </h1>
        <div className="flex items-center gap-2 mt-2 ml-2">
          <div className="h-px w-12 bg-slate-700" />
          <p className="font-body text-xs text-slate-500 uppercase tracking-widest">
            Failure is not an option.
          </p>
        </div>
      </div>

      <DailyProgressHUD
        total={total}
        completed={completed}
        allDone={allDone}
        streak={hunter?.currentStreak || 0}
      />

      <div className="flex gap-4 mb-8 bg-black/20 p-1 rounded-xl w-fit border border-slate-800/50">
        <TabBtn
          active={tab === "today"}
          onClick={() => setTab("today")}
          icon={Sword}
          label="Current Missions"
        />
        <TabBtn
          active={tab === "history"}
          onClick={() => setTab("history")}
          icon={History}
          label="Completed Logs"
        />
      </div>

      {tab === "today" ? (
        isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-64 rounded-2xl" />
            ))}
          </div>
        ) : quests.length === 0 ? (
          <EmptyState
            icon={Sword}
            title="Registry Empty"
            description="The System has not yet assigned your daily tasks. Awaiting signal."
            action={
              <Button
                variant="primary"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["quests"] })
                }
              >
                Initialize Scan
              </Button>
            }
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-10"
          >
            {activeQuests.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {activeQuests.map((quest) => (
                    <QuestCard
                      key={quest._id}
                      quest={quest}
                      onComplete={() => completeMutation.mutate(quest._id)}
                      onProgress={(value) =>
                        progressMutation.mutate({ id: quest._id, value })
                      }
                      completing={completeMutation.isPending}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {completedQuests.length > 0 && (
              <div className="pt-8 border-t border-slate-800/50">
                <p className="text-hud mb-6 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  Archive: Successfully Cleared ({completedQuests.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedQuests.map((quest) => (
                    <QuestCard key={quest._id} quest={quest} completed />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )
      ) : (
        <QuestHistoryList history={historyData?.quests || []} />
      )}
    </motion.div>
  );
}

function DailyProgressHUD({ total, completed, allDone, streak }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      className={`glass-dark rounded-2xl p-6 mb-10 border-l-4 transition-all duration-700
      ${allDone ? "border-emerald-500 shadow-glow-emerald-sm" : "border-cyan-500 shadow-glow-cyan-sm"}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="font-display text-[10px] text-slate-500 tracking-[0.3em] uppercase">
            Progression Status
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-heading font-black text-4xl text-white italic">
              {completed}
              <span className="text-slate-600 mx-1">/</span>
              {total}
            </h3>
            <span className="text-slate-400 font-heading text-sm uppercase">
              Quests Cleared
            </span>
          </div>
        </div>

        <div className="flex items-center gap-8 bg-black/40 p-4 rounded-2xl border border-white/5">
          <div className="flex flex-col items-center">
            <p className="text-hud mb-1">Streak</p>
            <div className="flex items-center gap-1.5">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Flame
                  size={20}
                  className={
                    streak > 0
                      ? "text-orange-500 shadow-glow-orange"
                      : "text-slate-700"
                  }
                />
              </motion.div>
              <span className="font-display text-2xl font-black text-white">
                {streak}
              </span>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-800" />

          <div className="space-y-2">
            <p className="text-hud text-center">Sync</p>
            <div className="flex gap-2">
              {Array.from({ length: total || 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{
                    scale: i < completed ? [1, 1.3, 1] : 1,
                    backgroundColor: i < completed ? "#10b981" : "#1e293b",
                  }}
                  className={`w-3.5 h-3.5 rounded-sm border ${i < completed ? "border-emerald-400 shadow-glow-emerald" : "border-slate-700"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 relative h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/5">
        <motion.div
          className={`h-full rounded-full ${allDone ? "bg-emerald-500" : "bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "circOut" }}
        >
          <div className="w-full h-full opacity-30 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-shimmer" />
        </motion.div>
      </div>

      {!allDone && streak > 0 && (
        <div className="flex items-center gap-2 mt-4 text-orange-400/80 animate-pulse">
          <AlertTriangle size={14} />
          <p className="font-heading text-[10px] uppercase tracking-widest">
            Warning: Mission incompleteness will result in streak termination at
            00:00
          </p>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-heading text-xs font-black
                  uppercase tracking-widest transition-all duration-300
                  ${
                    active
                      ? "bg-cyan-500 text-slate-950 shadow-glow-cyan"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  }`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

function QuestCard({ quest, onComplete, onProgress, completing, completed }) {
  const [inputValue, setInputValue] = useState(quest.currentValue || 0);
  const cfg = CATEGORY_CONFIG[quest.category] || CATEGORY_CONFIG.default;
  const Icon = cfg.icon;

  const progress =
    quest.targetValue > 0
      ? Math.min((quest.currentValue / quest.targetValue) * 100, 100)
      : 0;

  return (
    <motion.div
      layout
      variants={staggerItem}
      whileHover={!completed ? { y: -5, scale: 1.02 } : {}}
      className={`relative glass-dark rounded-2xl overflow-hidden border-t-2 transition-all duration-500
        ${completed ? "opacity-50 border-emerald-500/50" : `${cfg.border} ${cfg.glow} hover:bg-slate-900/80`}`}
    >
      {/* Background Icon Watermark */}
      <div className="absolute -right-4 -top-4 opacity-[0.03] pointer-events-none">
        <Icon size={120} />
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div
            className={`p-2 rounded-xl ${cfg.bg} ${cfg.color} border border-white/5`}
          >
            <Icon size={18} />
          </div>
          <div className="flex flex-col items-end gap-1">
            <DiffBadge diff={quest.difficulty} />
            <span className="text-[9px] font-black uppercase tracking-tighter text-slate-600">
              {quest.category} type
            </span>
          </div>
        </div>

        <h4
          className={`font-heading font-black text-lg mb-2 tracking-tight leading-tight ${completed ? "text-slate-500 line-through" : "text-white"}`}
        >
          {quest.title}
        </h4>

        <p className="font-body text-xs text-slate-400 mb-4 line-clamp-2 h-8 leading-relaxed">
          {quest.description}
        </p>

        {quest.generatedReason && !completed && (
          <div className="bg-cyan-500/5 p-2 rounded-lg border border-cyan-500/10 mb-4">
            <p className="font-body text-[10px] text-cyan-400/80 italic">
              ↳ Analysis: {quest.generatedReason}
            </p>
          </div>
        )}

        <div className="space-y-2 mb-6">
          <div className="flex justify-between items-end">
            <span className="font-display text-[10px] text-slate-500 uppercase tracking-widest">
              Progress:{" "}
              <span className="text-white">
                {quest.currentValue}/{quest.targetValue}
              </span>{" "}
              {quest.unit}
            </span>
            <div className="flex items-center gap-1">
              <Zap size={10} className="text-yellow-400" />
              <span className="font-display text-xs font-bold text-yellow-400">
                +{quest.xpReward} XP
              </span>
            </div>
          </div>
          <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
            <motion.div
              className={`h-full ${completed ? "bg-emerald-500" : `bg-gradient-to-r from-white to-${cfg.color.split("-")[1]}-400`}`}
              style={{
                backgroundColor: !completed ? cfg.color.split(" ")[0] : "",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        {!completed && (
          <div className="space-y-3">
            {quest.targetValue > 1 && (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(Number(e.target.value))}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-heading w-20 focus:border-cyan-500 outline-none transition-colors"
                />
                <button
                  onClick={() => onProgress(inputValue)}
                  className="flex-1 text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Update Log
                </button>
              </div>
            )}
            <button
              onClick={onComplete}
              disabled={completing}
              className="w-full btn-primary py-3 text-[10px] font-black uppercase tracking-[0.2em] flex justify-center items-center gap-2 group"
            >
              <CheckCircle2
                size={14}
                className="group-hover:scale-110 transition-transform"
              />
              Mission Accomplished
            </button>
          </div>
        )}

        {completed && (
          <div className="flex items-center justify-center gap-2 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="font-display text-[10px] text-emerald-400 font-black uppercase tracking-widest">
              Mission Complete
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function QuestHistoryList({ history }) {
  if (!history.length) {
    return (
      <EmptyState
        icon={History}
        title="History Encrypted"
        description="Records of your past triumphs will appear here once archived."
      />
    );
  }

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {history.map((quest) => (
        <motion.div
          key={quest._id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-dark border-white/5 p-4 flex items-center justify-between group hover:border-white/10 transition-colors"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={`w-1 h-8 rounded-full ${quest.status === "completed" ? "bg-emerald-500" : "bg-red-500"}`}
            />
            <div>
              <p className="font-heading font-bold text-sm text-slate-100">
                {quest.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  {quest.category}
                </span>
                <span className="text-[9px] text-slate-700">•</span>
                <span className="text-[9px] text-slate-500 uppercase">
                  {new Date(quest.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <DiffBadge diff={quest.difficulty} />
            {quest.status === "completed" && (
              <span className="font-display text-sm font-bold text-yellow-500/80">
                +{quest.xpReward} XP
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
