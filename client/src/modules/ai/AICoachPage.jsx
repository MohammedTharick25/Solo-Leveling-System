import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Clock3, Sparkles, Target } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/api.js";
import AICoachPanel from "../../components/ai/AICoachPanel.jsx";

export default function AICoachPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const { data: goalsData } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => (await api.get("/goals")).data.data,
  });
  const activeGoals = (goalsData?.goals || []).filter(
    (goal) => goal.status === "active",
  );

  const nextActionQuery = useQuery({
    queryKey: selectedGoalId
      ? ["ai-next-action", selectedGoalId]
      : ["ai-next-action"],
    queryFn: async () =>
      (await api.post("/ai/next-action", { goalId: selectedGoalId || null })).data.data,
    staleTime: 1000 * 60 * 5,
  });
  const focusSessionQuery = useQuery({
    queryKey: ["focus-active"],
    queryFn: async () => (await api.get("/focus/active")).data.data.session,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const action = nextActionQuery.data;
  const startFocusMutation = useMutation({
    mutationFn: async () => {
      const duration = Math.max(
        1,
        Math.min(240, Math.round(Number(action?.durationMinutes) || 25)),
      );
      const type =
        duration >= 75 ? "deepWork" : duration >= 40 ? "study" : "pomodoro";
      const { data } = await api.post("/focus/start", {
        type,
        plannedDuration: duration,
        linkedQuestId: action?.questId || null,
        linkedGoalId: selectedGoalId || action?.goalId || null,
      });
      return data.data.session;
    },
    onSuccess: (session) => {
      queryClient.setQueryData(["focus-active"], session);
      queryClient.invalidateQueries({ queryKey: ["focus-active"] });
      navigate("/focus");
    },
  });
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-12 space-y-6">
      <header>
        <p className="text-system mb-1">Personal guidance</p>
        <h1 className="font-heading font-black text-3xl text-white mt-1 flex items-center gap-3">
          AI Coach <Bot className="text-cyan-400" size={26} />
        </h1>
        <p className="text-sm text-slate-500 mt-2 max-w-2xl">
          Get practical advice based on your goals, quests, habits and recent progress.
        </p>
      </header>

      <div className="glass rounded-2xl border border-white/5 p-4">
        <label className="block max-w-xl space-y-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
          Choose the goal for your next focus session
          <select
            value={selectedGoalId}
            onChange={(event) => setSelectedGoalId(event.target.value)}
            className="input w-full normal-case"
          >
            <option value="">Let the System choose</option>
            {activeGoals.map((goal) => (
              <option key={goal._id} value={goal._id}>{goal.title}</option>
            ))}
          </select>
          <span className="block text-xs font-normal normal-case tracking-normal text-slate-500">
            System choice prioritizes an active quest linked to a goal, then the nearest goal deadline.
          </span>
        </label>
      </div>
      {action && (
        <section className="glass-cyan rounded-3xl border border-cyan-500/20 p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">Your next step</p>
              <h2 className="font-heading font-bold text-2xl text-white mt-1">{action.title}</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-2xl">{action.reason}</p>
              {action.goalTitle && <p className="mt-2 text-xs font-semibold text-violet-300">Goal: {action.goalTitle}</p>}
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center"><Clock3 size={16} className="mx-auto text-slate-500" /><p className="font-display text-lg text-white mt-1">{action.durationMinutes}m</p></div>
              <div className="text-center"><Sparkles size={16} className="mx-auto text-cyan-400" /><p className="font-display text-lg text-cyan-300 mt-1">+{action.xpEstimate}</p></div>
            </div>
          </div>
          <div className="mt-5 flex flex-col items-end gap-2 border-t border-white/10 pt-4">
            {focusSessionQuery.data ? (
              <Link
                to="/focus"
                className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-violet-200"
              >
                Return to running focus
                <ArrowRight size={14} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => startFocusMutation.mutate()}
                disabled={!action || nextActionQuery.isFetching || focusSessionQuery.isLoading || focusSessionQuery.isError || startFocusMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {startFocusMutation.isPending ? "Starting focus..." : "Start focus now"}
                <ArrowRight size={14} />
              </button>
            )}
            {startFocusMutation.isError && (
              <p role="alert" className="text-xs text-red-300">
                {startFocusMutation.error?.response?.data?.message || "Could not start the focus session. Try again."}
              </p>
            )}
          </div>
        </section>
      )}

      <AICoachPanel />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/goals" className="glass rounded-3xl border border-purple-500/15 p-5 hover:border-purple-500/30 transition-colors group">
          <Target className="text-purple-400" size={20} />
          <h2 className="font-heading font-bold text-white mt-3">Turn a goal into a plan</h2>
          <p className="text-sm text-slate-500 mt-1">Break a big goal into milestones and small quests.</p>
          <span className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-purple-300">Open Goals <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
        </Link>
        <div className="glass rounded-3xl border border-slate-800 p-5">
          <h2 className="font-heading font-bold text-white">Keep it simple</h2>
          <p className="text-sm text-slate-500 mt-2">Ask one question at a time. The coach uses your current progress to keep the answer practical.</p>
        </div>
      </section>
    </motion.div>
  );
}
