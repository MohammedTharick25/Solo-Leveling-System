import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Play, Pause, Square } from "lucide-react";
import api from "../../lib/api.js";
import { useAudio } from "../../hooks/useAudio.js";
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

export default function PomodoroPage() {
  const queryClient = useQueryClient();
  const { playQuestComplete, playNotification } = useAudio();
  const intervalRef = useRef(null);

  const [selectedType, setSelectedType] = useState(SESSION_TYPES[0]);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [resumed, setResumed] = useState(false);

  // ── On mount: check for an existing open session ─────────────────────────
  useQuery({
    queryKey: ["focus-active"],
    queryFn: async () => {
      const { data } = await api.get("/focus/active");
      return data.data.session;
    },
    onSuccess: (session) => {
      if (session && !activeSession) {
        // Calculate how many seconds have already elapsed since startedAt
        const elapsedSecs = Math.floor(
          (Date.now() - new Date(session.startedAt).getTime()) / 1000,
        );
        // Find matching session type config for display
        const match =
          SESSION_TYPES.find((t) => t.type === session.type) ||
          SESSION_TYPES[0];
        setSelectedType(match);
        setActiveSession(session);
        setElapsed(elapsedSecs);
        setRunning(true);
        setResumed(true);
      }
    },
    // Only run once on mount — don't keep refetching while timer is running
    staleTime: Infinity,
    retry: false,
  });

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

  const startMutation = useMutation({
    mutationFn: (body) => api.post("/focus/start", body),
    onSuccess: ({ data }) => {
      setActiveSession(data.data.session);
      setElapsed(0);
      setRunning(true);
      setResumed(false);
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
      queryClient.invalidateQueries({ queryKey: ["focus-history"] });
      queryClient.invalidateQueries({ queryKey: ["focus-skill"] });
      queryClient.invalidateQueries({ queryKey: ["focus-active"] });
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
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
              <div className="flex flex-wrap gap-2 mb-8 justify-center">
                {SESSION_TYPES.map((st) => (
                  <button
                    key={st.type}
                    onClick={() => setSelectedType(st)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-heading text-sm
                                font-semibold border transition-all
                                ${
                                  selectedType.type === st.type
                                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
                                    : "border-slate-700 text-slate-500 hover:text-slate-300"
                                }`}
                  >
                    <span>{st.emoji}</span>
                    {st.label}
                  </button>
                ))}
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
                  <Badge color="cyan" className="mt-2">
                    {running ? "● RUNNING" : "⏸ PAUSED"}
                  </Badge>
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
                    onClick={() => setRunning((r) => !r)}
                  >
                    {running ? <Pause size={16} /> : <Play size={16} />}
                    {running ? "Pause" : "Resume"}
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
