import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  Radio,
  Sparkles,
  Target,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import api from "../../lib/api.js";
import { Button } from "../../components/ui/PageLoader.jsx";

const memberId = (value) => String(value?._id || value || "");

const refreshActivities = async (queryClient, guildId) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["guild-activities", guildId] }),
    queryClient.invalidateQueries({ queryKey: ["my-guild"] }),
  ]);
};

export default function GuildActivityHub({ guildId, userId }) {
  const [duration, setDuration] = useState(25);
  const [checkInGoal, setCheckInGoal] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const activitiesQuery = useQuery({
    queryKey: ["guild-activities", guildId],
    queryFn: async () => (await api.get(`/guilds/${guildId}/activities`)).data.data,
    enabled: Boolean(guildId),
    refetchInterval: 30_000,
  });
  const activities = activitiesQuery.data;
  const todayKey = new Intl.DateTimeFormat("en-CA").format(new Date());
  const todaysCheckIn = activities?.checkIns?.find(
    (checkIn) => memberId(checkIn.userId) === String(userId) && checkIn.dateKey === todayKey,
  );
  const weeklyQuest = activities?.weeklyQuest;
  const weeklyOptedIn = weeklyQuest?.participants?.some(
    (participant) => memberId(participant.userId) === String(userId),
  );
  const activeSprints = (activities?.sprints || []).filter((sprint) => sprint.status === "active");

  const createSprintMutation = useMutation({
    mutationFn: (durationMinutes) => api.post(`/guilds/${guildId}/sprints`, { durationMinutes }),
    onSuccess: async ({ data }) => {
      await refreshActivities(queryClient, guildId);
      startFocus(data.data.sprint);
    },
  });
  const joinSprintMutation = useMutation({
    mutationFn: (sprintId) => api.post(`/guilds/${guildId}/sprints/${sprintId}/join`),
    onSuccess: async ({ data }) => {
      await refreshActivities(queryClient, guildId);
      startFocus(data.data.sprint);
    },
  });
  const joinQuestMutation = useMutation({
    mutationFn: () => api.post(`/guilds/${guildId}/weekly-quest/join`),
    onSuccess: () => refreshActivities(queryClient, guildId),
  });
  const checkInMutation = useMutation({
    mutationFn: (goal) => api.post(`/guilds/${guildId}/check-ins`, {
      goal,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    }),
    onSuccess: async () => {
      setCheckInGoal("");
      await refreshActivities(queryClient, guildId);
    },
  });
  const completeCheckInMutation = useMutation({
    mutationFn: (checkInId) => api.post(`/guilds/${guildId}/check-ins/${checkInId}/complete`),
    onSuccess: () => refreshActivities(queryClient, guildId),
  });

  function startFocus(sprint) {
    navigate("/focus", {
      state: {
        guildSprintId: sprint._id,
        recommendedAction: {
          title: sprint.title || "Guild Focus Sprint",
          durationMinutes: sprint.durationMinutes,
        },
      },
    });
  }

  const error = [
    createSprintMutation.error,
    joinSprintMutation.error,
    joinQuestMutation.error,
    checkInMutation.error,
    completeCheckInMutation.error,
  ].find(Boolean);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950/55 p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      <div className="pointer-events-none absolute -right-20 top-0 h-48 w-48 rounded-full bg-cyan-400/[0.07] blur-3xl" />
      <div className="relative mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-2 font-display text-[10px] uppercase tracking-[0.22em] text-cyan-300">
            <Radio size={12} className="animate-pulse" /> Party link active
          </p>
          <h3 className="font-heading text-xl font-bold text-slate-100 sm:text-2xl">The study party</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Users size={14} /> Shared effort, personal quests
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-300">
          {error.response?.data?.message || "That guild activity could not be updated."}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <motion.article layout className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-2 flex items-center gap-2 font-display text-[10px] uppercase tracking-[0.18em] text-cyan-300"><Timer size={13} /> Guild sprint</p>
              <h4 className="font-heading text-lg font-semibold text-slate-100">One block. Your own mission.</h4>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">Opt in, focus on your own goal, and earn guild credit when your linked session is complete.</p>
            </div>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><Flame size={18} /></div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[25, 50].map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-pressed={duration === minutes}
                onClick={() => setDuration(minutes)}
                className={`rounded-lg border px-3 py-2 font-display text-xs transition-colors ${duration === minutes ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100" : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"}`}
              >
                {minutes} min
              </button>
            ))}
            <Button size="sm" variant="primary" disabled={activeSprints.length > 0} loading={createSprintMutation.isPending} onClick={() => createSprintMutation.mutate(duration)}>
              <Timer size={13} /> {activeSprints.length ? "Sprint is open" : "Start a sprint"}
            </Button>
          </div>

          <div className="mt-5 space-y-2">
            {activeSprints.slice(0, 3).map((sprint) => {
              const participant = sprint.participants?.find((entry) => memberId(entry.userId) === String(userId));
              const completed = Boolean(participant?.completedAt);
              const contributionCount = sprint.participants?.filter((entry) => entry.completedAt).length || 0;
              const joinedCount = sprint.participants?.length || 0;
              return (
                <motion.div layout key={sprint._id} className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/55 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-200">{sprint.title || "Guild Focus Sprint"}</p>
                    <p className="mt-1 flex items-center gap-2 text-[11px] text-slate-500"><Clock3 size={12} /> {sprint.durationMinutes} min <span className="text-slate-700">/</span> {contributionCount} of {joinedCount} checked in</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(sprint.participants || []).slice(0, 4).map((entry) => (
                        <span key={memberId(entry.userId)} className={`rounded-md px-1.5 py-1 text-[9px] ${entry.completedAt ? "bg-emerald-300/[0.08] text-emerald-200" : "bg-slate-900 text-slate-500"}`}>
                          {entry.userId?.hunterName || "Hunter"} - {entry.completedAt ? `${entry.minutes || sprint.durationMinutes} min done` : "joined"}
                        </span>
                      ))}
                      {joinedCount > 4 && <span className="self-center text-[9px] text-slate-600">+{joinedCount - 4}</span>}
                    </div>
                  </div>
                  {completed ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300"><CheckCircle2 size={14} /> Complete</span>
                  ) : participant ? (
                    <Button size="sm" variant="secondary" onClick={() => startFocus(sprint)}><ArrowUpRight size={13} /> Focus now</Button>
                  ) : (
                    <Button size="sm" variant="secondary" loading={joinSprintMutation.isPending} onClick={() => joinSprintMutation.mutate(sprint._id)}><Users size={13} /> Join & focus</Button>
                  )}
                </motion.div>
              );
            })}
            {!activitiesQuery.isLoading && !activeSprints.length && (
              <p className="rounded-lg border border-dashed border-slate-800 px-3 py-4 text-center text-xs text-slate-600">No active block. Be the one who starts the next room.</p>
            )}
          </div>
        </motion.article>

        <motion.article layout className="rounded-xl border border-amber-300/15 bg-amber-300/[0.025] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-2 flex items-center gap-2 font-display text-[10px] uppercase tracking-[0.18em] text-amber-200"><Target size={13} /> Weekly guild quest</p>
              <h4 className="font-heading text-lg font-semibold text-slate-100">{weeklyQuest?.title || "Loading this week's objective"}</h4>
              <p className="mt-1 text-xs text-slate-500">Every completed focus session counts equally. No hour-stacking required.</p>
            </div>
            <span className="shrink-0 rounded-md border border-amber-200/15 bg-amber-200/[0.06] px-2 py-1 font-display text-[10px] text-amber-100">+{weeklyQuest?.rewardXP || 300} XP</span>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-end justify-between gap-3">
              <p className="font-display text-2xl font-bold text-amber-100">{weeklyQuest?.progress || 0}<span className="ml-1 text-sm font-medium text-slate-500">/ {weeklyQuest?.targetSessions || 40}</span></p>
              <p className="text-right text-[10px] uppercase tracking-wider text-slate-500">focus sessions<br />this week</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-900">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, ((weeklyQuest?.progress || 0) / Math.max(1, weeklyQuest?.targetSessions || 40)) * 100)}%` }} transition={{ duration: 0.7, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-emerald-300" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex -space-x-2">
              {(weeklyQuest?.participants || []).slice(0, 6).map((entry) => (
                <span key={memberId(entry.userId)} title={entry.userId?.hunterName || "Guild member"} className="grid h-7 w-7 place-items-center rounded-full border-2 border-slate-950 bg-emerald-400/15 font-display text-[9px] text-emerald-100">{entry.userId?.hunterName?.[0]?.toUpperCase() || "H"}</span>
              ))}
              <span className="ml-3 self-center text-[11px] text-slate-500">{weeklyQuest?.participants?.length || 0} opted in</span>
            </div>
            {weeklyQuest?.status === "completed" ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300"><Sparkles size={14} /> Quest cleared</span>
            ) : weeklyOptedIn ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-200"><Check size={14} /> You're in</span>
            ) : (
              <Button size="sm" variant="secondary" loading={joinQuestMutation.isPending} onClick={() => joinQuestMutation.mutate()}><ArrowUpRight size={13} /> Join quest</Button>
            )}
          </div>
          {(weeklyQuest?.participants || []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[...weeklyQuest.participants]
                .sort((first, second) => (second.sessions || 0) - (first.sessions || 0))
                .slice(0, 5)
                .map((entry) => (
                  <span key={memberId(entry.userId)} className="rounded-md border border-slate-800 bg-slate-950/50 px-2 py-1 text-[10px] text-slate-400">
                    <span className="text-slate-200">{entry.userId?.hunterName || "Hunter"}</span> - {entry.sessions || 0} sessions
                  </span>
                ))}
              {weeklyQuest.participants.length > 5 && <span className="self-center text-[10px] text-slate-600">+{weeklyQuest.participants.length - 5} more</span>}
            </div>
          )}
        </motion.article>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.article layout className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.025] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 flex items-center gap-2 font-display text-[10px] uppercase tracking-[0.18em] text-emerald-200"><Sparkles size={13} /> Daily check-in</p>
              <h4 className="font-heading text-lg font-semibold text-slate-100">What's your main quest today?</h4>
            </div>
            <span className="font-display text-[10px] text-emerald-200/80">+10 guild XP on done</span>
          </div>
          {todaysCheckIn?.completedAt ? (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] p-3">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-300" />
              <div><p className="text-sm font-medium text-emerald-100">Quest complete</p><p className="mt-0.5 text-xs text-slate-400">{todaysCheckIn.goal}</p></div>
            </div>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); if (checkInGoal.trim()) checkInMutation.mutate(checkInGoal.trim()); }} className="flex flex-col gap-2 sm:flex-row">
              <input value={checkInGoal} onChange={(event) => setCheckInGoal(event.target.value)} maxLength={160} placeholder={todaysCheckIn?.goal || "One thing you want to move forward..."} aria-label="Your main quest today" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-emerald-300/50" />
              <Button type="submit" size="sm" variant="secondary" loading={checkInMutation.isPending} disabled={!checkInGoal.trim()}>{todaysCheckIn ? "Update goal" : "Post goal"}</Button>
            </form>
          )}
          {todaysCheckIn && !todaysCheckIn.completedAt && (
            <button onClick={() => completeCheckInMutation.mutate(todaysCheckIn._id)} disabled={completeCheckInMutation.isPending} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-200 transition hover:text-emerald-100 disabled:opacity-50"><CheckCircle2 size={14} /> Mark my quest done</button>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {(activities?.checkIns || []).filter((entry) => entry.dateKey === todayKey).slice(0, 5).map((entry) => (
              <span key={entry._id} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-800 bg-slate-950/50 px-2.5 py-1 text-[10px] text-slate-400">
                <span className="shrink-0 text-emerald-300">{entry.userId?.hunterName || "Hunter"}</span><span className="truncate">{entry.goal}</span>{entry.completedAt && <Check size={11} className="shrink-0 text-emerald-300" />}
              </span>
            ))}
            {!activitiesQuery.isLoading && !(activities?.checkIns || []).some((entry) => entry.dateKey === todayKey) && <span className="text-[11px] text-slate-600">Your party's first check-in is waiting.</span>}
          </div>
        </motion.article>

        <motion.article layout className="rounded-xl border border-slate-800 bg-slate-950/35 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="mb-1 flex items-center gap-2 font-display text-[10px] uppercase tracking-[0.18em] text-slate-400"><Zap size={13} className="text-cyan-300" /> Party log</p>
              <h4 className="font-heading text-lg font-semibold text-slate-100">Small wins, seen</h4>
            </div>
            <span className="text-[10px] text-slate-600">Recent contributions</span>
          </div>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {(activities?.activityFeed || []).slice(0, 4).map((activity) => (
                <motion.div key={activity._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-2.5 border-l border-cyan-300/20 py-1 pl-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.6)]" />
                  <div className="min-w-0"><p className="text-xs leading-relaxed text-slate-300"><span className="font-semibold text-slate-100">{activity.userId?.hunterName || "A hunter"}</span> {activity.message}</p><p className="mt-1 text-[10px] text-slate-600">{new Date(activity.createdAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</p></div>
                </motion.div>
              ))}
            </AnimatePresence>
            {!activitiesQuery.isLoading && !(activities?.activityFeed || []).length && <p className="py-5 text-center text-xs text-slate-600">The next small win starts here.</p>}
          </div>
        </motion.article>
      </div>
      <p className="mt-3 text-[10px] text-slate-600">Come back when you can. Missed days never remove guild XP or check-in progress.</p>
    </section>
  );
}