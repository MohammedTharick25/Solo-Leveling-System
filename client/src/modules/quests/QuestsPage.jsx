import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sword,
  History,
  CheckCircle2,
  Flame,
  AlertTriangle,
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
      // If all daily quests done, show celebration
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
    >
      {/* Header */}
      <div className="mb-8">
        <p className="text-system mb-1">System Assignment</p>
        <h1 className="font-heading font-bold text-2xl text-slate-100">
          Daily Quests
        </h1>
        <p className="font-body text-sm text-slate-500 mt-1">
          Complete all 5 daily quests to maintain your streak. Failing breaks
          it.
        </p>
      </div>

      {/* Daily Progress HUD */}
      <DailyProgressHUD
        total={total}
        completed={completed}
        allDone={allDone}
        streak={hunter?.currentStreak || 0}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <TabBtn
          active={tab === "today"}
          onClick={() => setTab("today")}
          icon={Sword}
          label="Today's Quests"
        />
        <TabBtn
          active={tab === "history"}
          onClick={() => setTab("history")}
          icon={History}
          label="History"
        />
      </div>

      {tab === "today" ? (
        isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-52 rounded-xl" />
            ))}
          </div>
        ) : quests.length === 0 ? (
          <EmptyState
            icon={Sword}
            title="No quests assigned yet"
            description="The System will assign your 5 daily quests. Check back shortly or refresh."
            action={
              <Button
                variant="primary"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["quests"] })
                }
              >
                Refresh
              </Button>
            }
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            {/* Active quests */}
            {activeQuests.length > 0 && (
              <div>
                <p className="text-hud mb-3">Active ({activeQuests.length})</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              </div>
            )}

            {/* Completed quests */}
            {completedQuests.length > 0 && (
              <div>
                <p className="text-hud mb-3">
                  Completed today ({completedQuests.length})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      className={`glass rounded-2xl p-5 mb-6 border transition-all duration-500
                      ${
                        allDone
                          ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                          : "border-slate-700/50"
                      }`}
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div>
          <p className="text-system mb-0.5">Daily Progress</p>
          <div className="flex items-center gap-3">
            <p className="font-heading font-bold text-xl text-slate-100">
              {completed} / {total} Quests
            </p>
            {allDone && <Badge color="emerald">✅ All Complete!</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Streak */}
          <div className="text-center">
            <p className="text-hud mb-0.5">Current Streak</p>
            <div className="flex items-center gap-1">
              <Flame
                size={16}
                className={streak > 0 ? "text-orange-400" : "text-slate-600"}
              />
              <p className="font-display text-xl font-black text-slate-100">
                {streak}
              </p>
              <span className="font-heading text-xs text-slate-500">days</span>
            </div>
          </div>

          {/* Completion dots */}
          <div className="flex gap-1.5">
            {Array.from({ length: total || 5 }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full border transition-all duration-300
                              ${
                                i < completed
                                  ? "bg-emerald-400 border-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                                  : "bg-slate-800 border-slate-700"
                              }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full transition-all duration-700
                      ${
                        allDone
                          ? "bg-emerald-400"
                          : "bg-gradient-to-r from-cyan-500 to-purple-500"
                      }`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Warning if streak active but not all done */}
      {!allDone && streak > 0 && total > 0 && (
        <div className="flex items-center gap-2 mt-3">
          <AlertTriangle size={13} className="text-yellow-400 shrink-0" />
          <p className="font-heading text-xs text-yellow-400">
            Complete all {total} quests today or your {streak}-day streak will
            be broken at midnight.
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
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-heading text-sm font-semibold
                  border transition-all duration-200
                  ${
                    active
                      ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                      : "border-slate-800 text-slate-500 hover:text-slate-300"
                  }`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

const CATEGORY_STYLES = {
  focus: { border: "border-cyan-500/30" },
  discipline: { border: "border-purple-500/30" },
  health: { border: "border-emerald-500/30" },
  learning: { border: "border-indigo-500/30" },
  communication: { border: "border-blue-500/30" },
  leadership: { border: "border-red-500/30" },
  default: { border: "border-slate-700/50" },
};

function QuestCard({ quest, onComplete, onProgress, completing, completed }) {
  const [inputValue, setInputValue] = useState(quest.currentValue || 0);
  const progress =
    quest.targetValue > 0
      ? Math.min((quest.currentValue / quest.targetValue) * 100, 100)
      : 0;
  const style = CATEGORY_STYLES[quest.category] || CATEGORY_STYLES.default;

  if (completed || quest.status === "completed") {
    return (
      <motion.div
        layout
        variants={staggerItem}
        className="glass rounded-xl p-5 border border-emerald-500/20 bg-emerald-500/5 opacity-70"
      >
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <p className="font-heading font-semibold text-sm text-slate-400 line-through">
            {quest.title}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <Badge color="emerald">Completed</Badge>
          <span className="font-display text-xs text-yellow-400">
            +{quest.xpReward} XP
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      variants={staggerItem}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`glass rounded-xl p-5 border ${style.border} transition-all duration-300`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <DiffBadge diff={quest.difficulty} />
        <span
          className="font-heading text-[10px] text-slate-500 uppercase tracking-wider
                          px-2 py-0.5 bg-slate-800/60 rounded"
        >
          {quest.category}
        </span>
      </div>

      <h4 className="font-heading font-bold text-sm text-slate-100 mb-1.5 leading-snug">
        {quest.title}
      </h4>
      <p className="font-body text-xs text-slate-500 mb-2 leading-relaxed line-clamp-2">
        {quest.description}
      </p>

      {quest.generatedReason && (
        <p className="font-body text-[11px] text-cyan-500/70 italic mb-3">
          ↳ {quest.generatedReason}
        </p>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-heading text-[10px] text-slate-500">
            {quest.currentValue}/{quest.targetValue} {quest.unit}
          </span>
          <span className="font-display text-[10px] text-yellow-400">
            +{quest.xpReward} XP
          </span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Progress input for trackable quests */}
      {quest.targetValue > 1 && (
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            min={0}
            max={quest.targetValue}
            value={inputValue}
            onChange={(e) => setInputValue(Number(e.target.value))}
            className="input py-1.5 text-xs flex-1"
          />
          <button
            onClick={() => onProgress(inputValue)}
            className="btn-ghost py-1.5 px-3 text-xs border border-slate-700"
          >
            Update
          </button>
        </div>
      )}

      <button
        onClick={onComplete}
        disabled={completing}
        className="w-full btn-primary py-2 text-xs justify-center flex items-center gap-1.5"
      >
        <CheckCircle2 size={13} /> Mark Complete
      </button>
    </motion.div>
  );
}

function QuestHistoryList({ history }) {
  if (!history.length) {
    return (
      <EmptyState
        icon={History}
        title="No quest history yet"
        description="Completed quests from previous days appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {history.map((quest) => (
        <div
          key={quest._id}
          className="glass rounded-lg p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                quest.status === "completed"
                  ? "bg-emerald-400"
                  : quest.status === "failed"
                    ? "bg-red-400"
                    : "bg-slate-500"
              }`}
            />
            <div className="min-w-0">
              <p className="font-heading text-sm text-slate-200 truncate">
                {quest.title}
              </p>
              <p className="font-body text-xs text-slate-500">
                {quest.category} ·{" "}
                {new Date(quest.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DiffBadge diff={quest.difficulty} />
            {quest.status === "completed" && (
              <span className="font-display text-xs text-yellow-400">
                +{quest.xpReward}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
