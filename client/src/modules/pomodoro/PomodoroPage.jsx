import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Play, Pause, Square } from "lucide-react";
import api from "../../lib/api.js";
import { useAudio } from "../../hooks/useAudio.js";
import { syncProgressionQueries } from "../../lib/systemSync.js";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";
import {
  SectionHeader,
  Card,
  Button,
  Badge,
} from "../../components/ui/PageLoader.jsx";

const SESSION_TYPES = [
  { type: "pomodoro", label: "Pomodoro", emoji: "🍅", duration: 25 },
  { type: "deepWork", label: "Deep Work", emoji: "🧠", duration: 90 },
  { type: "study", label: "Study", emoji: "📚", duration: 45 },
  { type: "reading", label: "Reading", emoji: "📖", duration: 30 },
];

const clampMinutes = (minutes) => Math.min(45, Math.max(5, Math.round(minutes)));

const questFocusMinutes = (quest) => {
  if (!quest) return SESSION_TYPES[0].duration;
  const unit = String(quest.unit || "").toLowerCase();
  if (["minute", "minutes", "min"].includes(unit)) {
    return clampMinutes(Number(quest.targetValue) || 25);
  }

  const text = `${quest.title || ""} ${quest.description || ""}`;
  const explicitMinutes = text.match(/\b(\d{1,3})\s*[- ]?\s*(?:focused\s*)?(?:minutes?|mins?)\b/i);
  if (explicitMinutes) return clampMinutes(Number(explicitMinutes[1]));

  const baseByCategory = {
    learning: 25,
    productivity: 25,
    focus: 25,
    creativity: 30,
    communication: 20,
    leadership: 25,
    discipline: 20,
    health: 20,
    finance: 25,
    emotionalControl: 15,
    timeManagement: 20,
  };
  const base = baseByCategory[quest.category] || 25;
  const difficultyBonus = ["B", "A", "S"].includes(quest.difficulty) ? 5 : 0;
  return clampMinutes(base + difficultyBonus);
};

const sessionTypeForQuest = (quest) => {
  const duration = questFocusMinutes(quest);
  const closest = SESSION_TYPES.reduce((best, item) =>
    Math.abs(item.duration - duration) < Math.abs(best.duration - duration) ? item : best,
  SESSION_TYPES[0]);
  return { ...closest, duration };
};

export default function PomodoroPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const recommendedAction = location.state?.recommendedAction;
  const guildSprintId = location.state?.guildSprintId;
  const recommendedDuration = Number(recommendedAction?.durationMinutes);
  const normalizedRecommendedDuration = Math.max(
    1,
    Math.min(240, Math.round(recommendedDuration || 25)),
  );
  const recommendedSessionType =
    SESSION_TYPES.find((type) => type.duration === normalizedRecommendedDuration) ||
    SESSION_TYPES[0];
  const { playQuestComplete, playNotification } = useAudio();
  const intervalRef = useRef(null);

  const [selectedType, setSelectedType] = useState(() =>
    recommendedAction
      ? { ...recommendedSessionType, duration: normalizedRecommendedDuration }
      : SESSION_TYPES[0],
  );

  const [linkedQuestId, setLinkedQuestId] = useState("");
  const [linkedGoalId, setLinkedGoalId] = useState("");
  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [resumed, setResumed] = useState(false);

  // ── On mount: check for an existing open session ─────────────────────────
  const {
    data: persistedSession,
    isFetchedAfterMount,
  } = useQuery({
    queryKey: ["focus-active"],
    queryFn: async () => {
      const { data } = await api.get("/focus/active");
      return data.data.session;
    },
    // Only run once on mount — don't keep refetching while timer is running
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });

  useEffect(() => {
    if (!isFetchedAfterMount) return;
    if (!persistedSession) {
      setActiveSession(null);
      setElapsed(0);
      setRunning(false);
      setResumed(false);
      return;
    }

    const match =
      SESSION_TYPES.find((type) => type.type === persistedSession.type) ||
      SESSION_TYPES[0];
    setSelectedType({ ...match, duration: persistedSession.plannedDuration });
    const linkedQuest = persistedSession.linkedQuestId;
    setLinkedQuestId(
      linkedQuest && typeof linkedQuest === "object"
        ? linkedQuest._id
        : linkedQuest || "",
    );
    const linkedGoal = persistedSession.linkedGoalId;
    setLinkedGoalId(
      linkedGoal && typeof linkedGoal === "object"
        ? linkedGoal._id
        : linkedGoal || "",
    );
    setActiveSession(persistedSession);
    const elapsedUntil = persistedSession.pausedAt
      ? new Date(persistedSession.pausedAt).getTime()
      : Date.now();
    setElapsed(
      Math.max(
        0,
        Math.floor(
          (elapsedUntil - new Date(persistedSession.startedAt).getTime()) / 1000,
        ) - Number(persistedSession.pausedDurationSeconds || 0),
      ),
    );
    setRunning(!persistedSession.pausedAt);
    setResumed(true);
  }, [isFetchedAfterMount, persistedSession]);

  // ── Tick every second ─────────────────────────────────────────────────────
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const { data: statsData } = useQuery({
    queryKey: ["focus-skill"],
    queryFn: async () => {
      const { data } = await api.get("/focus/skill-stats");
      return data.data;
    },
  });

  const { data: historyData } = useQuery({
    queryKey: ["focus-history"],
    queryFn: async () => {
      const { data } = await api.get("/focus");
      return data.data;
    },
  });

  const { data: questData } = useQuery({
    queryKey: ["quests"],
    queryFn: async () => {
      const { data } = await api.get("/quests");
      return data.data;
    },
  });
  const availableQuests = (questData?.quests || []).filter(
    (quest) => quest.status === "active",
  );

  useEffect(() => {
    if (!recommendedAction || !questData || persistedSession) return;
    if (recommendedAction.goalId) setLinkedGoalId(recommendedAction.goalId);
    const title = recommendedAction.title?.trim().toLowerCase();
    const matchingQuest = availableQuests.find(
      (quest) =>
        quest.status === "active" &&
        ((recommendedAction.questId &&
          String(quest._id) === String(recommendedAction.questId)) ||
          quest.title.trim().toLowerCase() === title),
    );
    if (matchingQuest) {
      setLinkedQuestId(matchingQuest._id);
      setSelectedType(sessionTypeForQuest(matchingQuest));
      if (matchingQuest.goalId) setLinkedGoalId(String(matchingQuest.goalId));
    }
  }, [recommendedAction, questData, persistedSession]);
  const { data: goalData } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => (await api.get("/goals")).data.data,
  });
  const availableGoals = (goalData?.goals || []).filter(
    (goal) => goal.status === "active",
  );
  const startMutation = useMutation({
    mutationFn: (body) => api.post("/focus/start", body),
    onSuccess: ({ data }) => {
      setActiveSession(data.data.session);
      setElapsed(0);
      setRunning(true);
      setResumed(false);
      queryClient.invalidateQueries({ queryKey: ["focus-active"] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (id) => api.patch("/focus/" + id + "/pause"),
    onSuccess: ({ data }) => {
      const session = data.data.session;
      setActiveSession(session);
      setRunning(false);
      queryClient.setQueryData(["focus-active"], session);
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id) => api.patch("/focus/" + id + "/resume"),
    onSuccess: ({ data }) => {
      const session = data.data.session;
      setActiveSession(session);
      setRunning(true);
      queryClient.setQueryData(["focus-active"], session);
    },
  });

  const endMutation = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/focus/${id}/end`, body),
    onSuccess: () => {
      playQuestComplete();
      setActiveSession(null);
      setRunning(false);
      setElapsed(0);
      setResumed(false);
      queryClient.setQueryData(["focus-active"], null);
      syncProgressionQueries(queryClient);
    },
  });

  const totalSeconds = selectedType.duration * 60;
  const remaining = Math.max(totalSeconds - elapsed, 0);
  const progressPct = Math.min((elapsed / totalSeconds) * 100, 100);
  const mins = String(Math.floor(remaining / 60)).padStart(2, "0");
  const secs = String(remaining % 60).padStart(2, "0");

  const handleStart = () => {
    startMutation.mutate({
      type: selectedType.type,
      plannedDuration: selectedType.duration,
      linkedQuestId: linkedQuestId || null,
      linkedGoalId: linkedGoalId || null,
      linkedGuildSprintId: guildSprintId || null,
    });
  };

  const handleEnd = (interrupted = false) => {
    if (!activeSession) return;
    clearInterval(intervalRef.current);
    endMutation.mutate({
      id: activeSession._id,
      body: { interrupted, interruptionCount: interrupted ? 1 : 0 },
    });
  };

  // Auto-complete when timer hits 0
  useEffect(() => {
    if (remaining === 0 && running && activeSession) {
      playNotification();
      handleEnd(false);
    }
  }, [remaining]);

  const skills = statsData?.stats;
  const activeLinkedQuestTitle =
    activeSession?.linkedQuestId?.title ||
    availableQuests.find(
      (quest) => String(quest._id) === String(linkedQuestId),
    )?.title;
  const activeLinkedGoalTitle =
    activeSession?.linkedGoalId?.title ||
    availableGoals.find(
      (goal) => String(goal._id) === String(linkedGoalId),
    )?.title;
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="mb-8">
        <p className="text-system mb-1">Concentration Chamber</p>
        <h1 className="font-heading font-bold text-2xl text-slate-100">
          Focus Mode
        </h1>
        {resumed && (
          <p className="font-heading text-sm text-cyan-400 mt-1">
            ↩ Resumed an existing session
          </p>
        )}
        {guildSprintId && (
          <p className="mt-2 inline-flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-2 font-heading text-xs text-cyan-100">
            Guild sprint linked <span className="text-cyan-300">·</span> finish at least 80% to count your contribution
          </p>
        )}
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Timer */}
        <motion.div variants={staggerItem} className="lg:col-span-2">
          <Card className="flex flex-col items-center py-10">
            {/* Session type selector — hide while session active */}
            {!activeSession && (
              <div className="mb-8 flex flex-col items-center gap-4">
                <div className="flex flex-wrap justify-center gap-2">
                  {SESSION_TYPES.map((st) => (
                    <button
                      key={st.type}
                      type="button"
                      onClick={() => setSelectedType(st)}
                      aria-pressed={selectedType.type === st.type}
                      className={
                        selectedType.type === st.type
                          ? "flex min-h-11 items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 font-heading text-sm font-semibold text-cyan-400 transition-all"
                          : "flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 font-heading text-sm font-semibold text-slate-500 transition-all hover:text-slate-300"
                      }
                    >
                      <span>{st.emoji}</span>
                      {st.label}
                    </button>
                  ))}
                </div>
                                <label className="flex w-full max-w-md flex-col gap-2 font-heading text-xs text-slate-400">
                  Focus toward a goal
                  <select
                    value={linkedGoalId}
                    onChange={(event) => {
                      const goalId = event.target.value;
                      setLinkedGoalId(goalId);
                      const goalQuest = availableQuests.find(
                        (quest) => String(quest.goalId || "") === String(goalId),
                      );
                      setLinkedQuestId(goalQuest?._id || "");
                      if (goalQuest) setSelectedType(sessionTypeForQuest(goalQuest));
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/60"
                  >
                    <option value="">No linked goal</option>
                    {availableGoals.map((goal) => (
                      <option key={goal._id} value={goal._id}>{goal.title}</option>
                    ))}
                  </select>
                </label>
<label className="flex w-full max-w-md flex-col gap-2 font-heading text-xs text-slate-400">
                  Focus toward a quest
                  <select
                    value={linkedQuestId}
                    onChange={(event) => {
                      const questId = event.target.value;
                      setLinkedQuestId(questId);
                      const quest = availableQuests.find(
                        (item) => String(item._id) === String(questId),
                      );
                      if (quest) setSelectedType(sessionTypeForQuest(quest));
                      setLinkedGoalId(quest?.goalId ? String(quest.goalId) : "");
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/60"
                  >
                    <option value="">No linked quest</option>
                    {availableQuests.map((quest) => (
                      <option key={quest._id} value={quest._id}>
                        {quest.title}
                        {quest.unit
                          ? " (" +
                            (quest.currentValue || 0) +
                            "/" +
                            quest.targetValue +
                            " " +
                            quest.unit +
                            ")"
                          : ""}
                      </option>
                    ))}
                  </select>
                  <span className="font-body text-[11px] text-slate-500">
                    Linking a quest picks a focused 5–45 minute session from its target, instructions, and difficulty. Choose another session above anytime.
                  </span>
                </label>
              </div>
            )}

            {/* Ring timer */}
            <div className="relative w-56 h-56 mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="rgba(34,211,238,0.08)"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="url(#timerGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 90}`}
                  strokeDashoffset={`${2 * Math.PI * 90 * (1 - progressPct / 100)}`}
                  transition={{ duration: 0.5 }}
                />
                <defs>
                  <linearGradient
                    id="timerGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-4xl font-black text-slate-100">
                  {mins}:{secs}
                </span>
                <span className="font-heading text-xs text-slate-500 mt-1">
                  {activeSession
                    ? selectedType.label
                    : `${selectedType.duration} min`}
                </span>
                {activeSession && (
                  <>
                  <Badge color="cyan" className="mt-2">
                    {running ? "● RUNNING" : "⏸ PAUSED"}
                  </Badge>
                  {activeLinkedGoalTitle && (
                    <span className="mt-2 max-w-48 truncate font-heading text-[10px] text-violet-300">
                      Goal: {activeLinkedGoalTitle}
                    </span>
                  )}
                  {activeLinkedQuestTitle && (
                    <span className="mt-1 max-w-48 truncate font-heading text-[10px] text-cyan-300">
                      Quest: {activeLinkedQuestTitle}
                    </span>
                  )}
                  </>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {!activeSession ? (
                <Button
                  variant="primary"
                  size="lg"
                  loading={startMutation.isPending}
                  onClick={handleStart}
                >
                  <Play size={16} /> Start Session
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="md"
                    loading={pauseMutation.isPending || resumeMutation.isPending}
                    onClick={() =>
                      activeSession.pausedAt
                        ? resumeMutation.mutate(activeSession._id)
                        : pauseMutation.mutate(activeSession._id)
                    }
                  >
                    {activeSession.pausedAt ? <Play size={16} /> : <Pause size={16} />}
                    {activeSession.pausedAt ? "Resume" : "Pause"}
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    loading={endMutation.isPending}
                    onClick={() => handleEnd(false)}
                  >
                    <Square size={14} /> Complete
                  </Button>
                  <Button
                    variant="danger"
                    size="md"
                    onClick={() => handleEnd(true)}
                  >
                    Abandon
                  </Button>
                </>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Skill panel */}
        <motion.div variants={staggerItem} className="space-y-4">
          <Card>
            <SectionHeader label="Focus Skill" title="Skill Stats" />
            {skills ? (
              <div className="space-y-3">
                <div className="text-center p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                  <p className="text-hud mb-1">Skill Level</p>
                  <p className="font-display text-xl text-cyan-400 font-bold">
                    {skills.skillLevel}
                  </p>
                </div>
                <StatRow label="Total Sessions" value={skills.totalSessions} />
                <StatRow label="Completed" value={skills.completedSessions} />
                <StatRow
                  label="Focus Minutes"
                  value={`${skills.totalFocusMinutes}m`}
                />
                <StatRow
                  label="Avg Score"
                  value={`${skills.averageFocusScore}/100`}
                />
              </div>
            ) : (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton h-8 rounded-lg" />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader label="Recent" title="Sessions" />
            <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
              {(historyData?.sessions || []).slice(0, 8).map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40"
                >
                  <div>
                    <p className="font-heading text-xs text-slate-300">
                      {s.type}
                    </p>
                    <p className="font-body text-[10px] text-slate-500">
                      {s.actualDuration}m
                    </p>
                    {s.linkedGoalId?.title && (
                      <p className="mt-1 max-w-40 truncate font-body text-[10px] text-violet-400/80">
                        Goal: {s.linkedGoalId.title}
                      </p>
                    )}
                    {s.linkedQuestId?.title && (
                      <p className="mt-1 max-w-40 truncate font-body text-[10px] text-cyan-500/80">
                        Quest: {s.linkedQuestId.title}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-display text-xs ${s.completed ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {s.completed ? "✓" : "✗"}
                    </p>
                    <p className="font-display text-[10px] text-yellow-400">
                      +{s.xpEarned}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
      <span className="font-heading text-xs text-slate-500">{label}</span>
      <span className="font-display text-xs text-slate-200">{value}</span>
    </div>
  );
}
