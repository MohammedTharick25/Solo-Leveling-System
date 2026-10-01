import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Flame,
  Sword,
  Target,
  TrendingUp,
  Star,
  Shield,
  Zap,
  Award,
  Activity,
  Timer,
  ArrowRight,
  Loader2,
  Play,
} from "lucide-react";
import CountUp from "react-countup";

// Stores & Logic
import api from "../../lib/api.js";
import { useHunterStore } from "../../stores/hunterStore.js";
import {
  staggerContainer,
  staggerItem,
  pageVariants,
} from "../../lib/animations.js";
import {
  STAT_LABELS,
  STAT_COLORS,
  STAT_ICONS,
  formatXP,
} from "../../lib/xpFormulas.js";

// UI Components
import {
  RankBadge,
  XPBar,
  StatBar,
  SectionHeader,
  EmptyState,
  DiffBadge,
  PageLoader,
} from "../../components/ui/PageLoader.jsx";
import DailyBonusWidget from "../../components/ui/DailyBonusWidget.jsx";
import OnboardingTutorial from "../../components/ui/OnboardingTutorial.jsx";

// Professional Rank Assets (Verified URLs)
const RANK_INSIGNIAS = {
  Unawakened:
    "https://res.cloudinary.com/di5reah7g/image/upload/v1784732149/F_Rank_gzgzmy.png",
  E: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732086/E_Rank_ljcatr.png",
  D: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732086/D_Rank_ofo1x0.png",
  C: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732086/C_Rank_cjbn89.png",
  B: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732086/B_Rank_yce5fe.png",
  A: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732085/A_Rank_c0pwnx.png",
  S: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732085/S_Rank_ursozu.png",
  National:
    "https://res.cloudinary.com/di5reah7g/image/upload/v1784733748/National_Rank_btbfmm.png",
  Monarch:
    "https://res.cloudinary.com/di5reah7g/image/upload/v1784733748/Monarch_Rank_soykht.png",
  "Shadow Monarch":
    "https://res.cloudinary.com/di5reah7g/image/upload/v1784733748/Shadow_Monarch_Rank_quuouq.png",
};


export default function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const {
    hunter: storedHunter,
    stats: storedStats,
    user,
    setHunter,
    setStats,
  } = useHunterStore();
  const [isUploading] = useState(false);

  const {
    data: profileData,
    isLoading: profileLoading,
    isError: profileError,
    refetch: retryProfile,
  } = useQuery({
    queryKey: ["hunter"],
    queryFn: async () => {
      const { data } = await api.get("/hunter/me");
      return data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!profileData?.hunter) return;
    setHunter(profileData.hunter);
    setStats(profileData.stats);
  }, [profileData, setHunter, setStats]);

  const hunter = storedHunter || profileData?.hunter;
  const stats = storedStats || profileData?.stats;

  const { data: nextActionData } = useQuery({
    queryKey: ["ai-next-action"],
    queryFn: async () => (await api.post("/ai/next-action")).data.data,
    staleTime: 1000 * 60 * 5,
  });
  const { data: questData } = useQuery({
    queryKey: ["quests"],
    queryFn: async () => {
      const { data } = await api.get("/quests");
      return data.data;
    },
  });

  const { data: bossData } = useQuery({
    queryKey: ["boss"],
    queryFn: async () => {
      const { data } = await api.get("/bosses/active");
      return data.data;
    },
  });

  const { data: goalsData } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => (await api.get("/goals")).data.data,
  });

  const { data: focusData, isLoading: focusLoading, isError: focusError } = useQuery({
    queryKey: ["focus-active"],
    queryFn: async () => (await api.get("/focus/active")).data.data.session,
    staleTime: 0,
  });

  const startRecommendedFocus = useMutation({
    mutationFn: async () => {
      const action = nextActionData;
      const duration = Math.max(1, Math.min(240, Math.round(Number(action?.durationMinutes) || 25)));
      const type = duration >= 75 ? "deepWork" : duration >= 40 ? "study" : "pomodoro";
      const { data } = await api.post("/focus/start", {
        type,
        plannedDuration: duration,
        linkedQuestId: action?.questId || null,
        linkedGoalId: action?.goalId || null,
      });
      return data.data.session;
    },
    onSuccess: (session) => {
      queryClient.setQueryData(["focus-active"], session);
      queryClient.invalidateQueries({ queryKey: ["focus-active"] });
      navigate("/focus");
    },
  });

  const quests = questData?.quests || [];
  const total = questData?.total || 0;
  const completed = questData?.completed || 0;
  const boss = bossData?.boss;

  const activeQuests = quests.filter((q) => q.status === "active").slice(0, 3);
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  const goals = goalsData?.goals || [];
  const activeGoals = goals.filter((goal) => goal.status === "active");
  const goalProgress = activeGoals.length
    ? Math.round(
        activeGoals.reduce((sum, goal) => sum + Number(goal.progress || 0), 0) /
          activeGoals.length,
      )
    : 0;
  const activeFocusSession = focusData || null;
  const lastQuestMomentumAt = hunter?.lastActiveDate
    ? new Date(hunter.lastActiveDate).getTime()
    : Date.now();
  const recoveryDaysAway = Math.max(
    0,
    Math.floor((Date.now() - lastQuestMomentumAt) / 86400000),
  );
  const showRecoveryMode =
    (hunter?.totalQuestCompletions || 0) > 0 &&
    hunter?.currentStreak === 0 &&
    recoveryDaysAway >= 2;


  const TOP_STATS = [
    "discipline",
    "intelligence",
    "sense",
    "vitality",
    "timeManagement",
  ];

  const scoreCards = [
    { key: "focusScore", label: "Focus", icon: Target, tone: "cyan" },
    { key: "disciplineScore", label: "Discipline", icon: Shield, tone: "violet" },
    { key: "momentumScore", label: "Momentum", icon: Zap, tone: "amber" },
    { key: "performanceScore", label: "Performance", icon: TrendingUp, tone: "emerald" },
  ];

  if (!hunter) {
    if (profileLoading) return <PageLoader />;

    return (
      <div
        role="alert"
        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center"
      >
        <h2 className="font-heading text-lg font-bold text-slate-100">
          Command Center could not load
        </h2>
        <p className="mt-2 font-body text-sm text-slate-400">
          {profileError
            ? "Your Hunter profile could not be reached. Check your connection and try again."
            : "Your Hunter profile is not available yet. Try loading it again."}
        </p>
        <button
          type="button"
          onClick={() => retryProfile()}
          className="mt-5 rounded-lg border border-cyan-500/40 px-4 py-2 font-heading text-sm text-cyan-300 transition hover:bg-cyan-500/10"
        >
          Retry
        </button>
      </div>
    );
  }

  const xpToNext = Math.max((hunter.xpToNextLevel || 0) - (hunter.xp || 0), 0);
  const currentLevelXP = hunter.xp || 0;
  const levelProgress = Math.min(
    100,
    hunter.xpToNextLevel
      ? Math.round((currentLevelXP / hunter.xpToNextLevel) * 100)
      : 0
  );

  const strongestStat = TOP_STATS.reduce(
    (best, key) =>
      (stats?.[key]?.value || 0) > (stats?.[best]?.value || 0) ? key : best,
    TOP_STATS[0]
  );

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative min-h-full overflow-hidden pb-12"
    >
      <OnboardingTutorial />
      <DailyBonusWidget />

      {/* Ambient system field */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-[100px]"
          animate={{ x: [0, 35, 0], y: [0, 20, 0], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-0 top-72 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px]"
          animate={{ x: [0, -30, 0], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        {/* =========================================================
            HUNTER IDENTITY / STATUS
        ========================================================= */}
        <motion.section
          variants={staggerItem}
          className="relative overflow-hidden rounded-[28px] border border-cyan-400/15 bg-slate-950/75 p-5 shadow-2xl backdrop-blur-xl sm:p-7 lg:p-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,.10),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(139,92,246,.10),transparent_32%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4 sm:gap-6">
              <div className="relative shrink-0">
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  className="relative h-20 w-20 overflow-hidden rounded-2xl border border-cyan-400/30 bg-slate-900 shadow-[0_0_35px_rgba(34,211,238,.12)] sm:h-24 sm:w-24"
                >
                  {user?.avatar?.url ? (
                    <img
                      src={user.avatar.url}
                      alt="Hunter Avatar"
                      className={`h-full w-full object-cover transition duration-700 ${
                        isUploading ? "opacity-30 blur-sm" : "hover:scale-110"
                      }`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/10 to-violet-500/10">
                      <span className="font-display text-5xl font-black text-cyan-400/30">
                        {hunter.hunterName?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl border border-white/10 bg-slate-950 p-1.5 shadow-xl"
                >
                  <img
                    src={RANK_INSIGNIAS[hunter.rank] || RANK_INSIGNIAS.Unawakened}
                    alt={`${hunter.rank} Rank`}
                    className="h-full w-full object-contain"
                  />
                </motion.div>
              </div>

              <div className="min-w-0">
                <p className="mb-1 text-[9px] font-black uppercase tracking-[0.32em] text-cyan-400/80">
                  Hunter Status
                </p>
                <h1 className="truncate font-heading text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
                  {hunter.hunterName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <RankBadge rank={hunter.rank} size="sm" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Level {hunter.level}
                  </span>
                  <span className="text-slate-700">•</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {formatXP(hunter.totalXP)} Total XP
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <HeaderMetric label="Power" value={hunter.powerScore} icon={<Zap size={14} />} />
              <HeaderMetric label="Quests" value={hunter.totalQuestCompletions} icon={<Sword size={14} />} />
              <HeaderMetric label="Streak" value={hunter.currentStreak} icon={<Flame size={14} />} />
            </div>
          </div>
        </motion.section>

        {/* =========================================================
            HERO: LEVEL / XP CORE
        ========================================================= */}
        <motion.section
          variants={staggerItem}
          className="relative overflow-hidden rounded-[32px] border border-cyan-400/15 bg-slate-950/80 shadow-[0_20px_80px_rgba(0,0,0,.35)] backdrop-blur-xl"
        >
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(34,211,238,.05),transparent_42%,rgba(124,58,237,.06))]" />
          <div className="relative grid min-h-[300px] grid-cols-1 items-center gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_300px] lg:p-10">
            <div>
              <div className="mb-5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
                <span className="text-[9px] font-black uppercase tracking-[0.32em] text-cyan-400">
                  System Progression
                </span>
              </div>

              <div className="flex items-end gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7 }}
                  className="font-display text-7xl font-black leading-none text-white sm:text-8xl"
                >
                  <CountUp end={hunter.level} duration={1.8} />
                </motion.div>
                <div className="pb-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                    Current
                  </p>
                  <p className="font-heading text-lg font-black uppercase text-cyan-400">
                    Level
                  </p>
                </div>
              </div>

              <div className="mt-8 max-w-2xl">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Progress to Level {hunter.level + 1}
                  </span>
                  <span className="font-display text-sm font-bold text-cyan-300">
                    {levelProgress}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full border border-white/5 bg-slate-900">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgress}%` }}
                    transition={{ duration: 1.6, ease: "easeOut" }}
                    className="relative h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-violet-500 shadow-[0_0_18px_rgba(34,211,238,.45)]"
                  >
                    <motion.div
                      animate={{ x: ["-20%", "120%"] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-y-0 w-1/3 bg-white/30 blur-sm"
                    />
                  </motion.div>
                </div>
                <div className="mt-2 flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-600">
                  <span>{formatXP(currentLevelXP)} XP</span>
                  <span>{formatXP(xpToNext)} XP remaining</span>
                </div>
              </div>
            </div>

            <div className="relative mx-auto h-52 w-52 lg:h-60 lg:w-60">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-dashed border-cyan-400/20"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute inset-5 rounded-full border border-violet-400/20"
              />
              <div className="absolute inset-12 rounded-full bg-cyan-400/5 shadow-[0_0_70px_rgba(34,211,238,.12)]" />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#22d3ee ${levelProgress * 3.6}deg, rgba(30,41,59,.35) 0deg)`,
                  mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 0)",
                  WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 0)",
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Zap className="mb-1 text-cyan-400" size={20} />
                <span className="font-display text-3xl font-black text-white">{hunter.powerScore}</span>
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">
                  Power
                </span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* =========================================================
            OVERVIEW STRIP
        ========================================================= */}
        <motion.section variants={staggerItem} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <OverviewCard label="Daily Progress" value={`${completionRate}%`} detail={`${completed}/${total} quests`} icon={<Target size={18} />} tone="cyan" />
          <OverviewCard label="Current Streak" value={`${hunter.currentStreak}`} detail="consecutive days" icon={<Flame size={18} />} tone="orange" />
          <OverviewCard label="Strongest Stat" value={STAT_LABELS[strongestStat]} detail={`${stats?.[strongestStat]?.value || 0}%`} icon={<Star size={18} />} tone="violet" />
          <OverviewCard label="Total XP" value={formatXP(hunter.totalXP)} detail="earned overall" icon={<Award size={18} />} tone="emerald" />
        </motion.section>

        {showRecoveryMode && (
          <motion.section
            variants={staggerItem}
            className="relative overflow-hidden rounded-[28px] border border-violet-400/15 bg-gradient-to-r from-violet-950/40 to-slate-950/75 p-5 shadow-xl sm:p-6"
          >
            <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="rounded-xl border border-violet-400/15 bg-violet-400/10 p-2.5 text-violet-300">
                  <Flame size={18} />
                </span>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-violet-300">
                    Momentum Recovery
                  </p>
                  <h2 className="mt-1 font-heading text-lg font-bold text-white">
                    Start small. Your progress is still here.
                  </h2>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
                    A streak break does not undo what you have built. Pick one manageable quest or take a short focus session to restart at your own pace.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <a
                  href="/quests"
                  className="rounded-xl bg-violet-400 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-violet-300"
                >
                  Choose a quest
                </a>
                <a
                  href="/focus"
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-300 transition hover:bg-white/[0.07]"
                >
                  Focus session
                </a>
              </div>
            </div>
          </motion.section>
        )}
        {/* =========================================================
            COMMAND CENTER
        ========================================================= */}
        <motion.section
          variants={staggerItem}
          className="rounded-[28px] border border-white/5 bg-slate-950/65 p-5 shadow-xl backdrop-blur-xl sm:p-6"
        >
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400">
                System Command
              </p>
              <h2 className="mt-1 font-heading text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
                Today&apos;s Control Panel
              </h2>
            </div>
            <span className="hidden text-[8px] font-black uppercase tracking-[0.25em] text-slate-600 sm:block">
              Live module status
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CommandPanel
              icon={<Target size={16} />}
              label="Active Goals"
              value={activeGoals.length}
              detail={
                activeGoals.length
                  ? `${goalProgress}% average progress`
                  : "No active objectives"
              }
              tone="cyan"
              href="/goals"
            />

            <CommandPanel
              icon={<Timer size={16} />}
              label="Focus Chamber"
              value={activeFocusSession ? "ACTIVE" : "READY"}
              detail={
                activeFocusSession
                  ? `${activeFocusSession.type || "Focus"} session in progress`
                  : "No focus session running"
              }
              tone={activeFocusSession ? "violet" : "slate"}
              href="/focus"
            />

            <CommandPanel
              icon={<Sword size={16} />}
              label="Next Objective"
              value={activeQuests[0]?.title || "CLEAR"}
              detail={
                activeQuests[0]
                  ? `+${activeQuests[0].xpReward} XP · ${activeQuests.length} active missions`
                  : "All current missions cleared"
              }
              tone="amber"
              href="/quests"
            />
            <CommandPanel
              icon={<Zap size={16} />}
              label="Recommended Action"
              value={nextActionData?.title || "Finding your next step"}
              detail={nextActionData ? nextActionData.durationMinutes + " min · +" + nextActionData.xpEstimate + " XP" : "Personalized for your current progress"}
              tone="violet"
              href="/ai-coach"
              actionLabel={activeFocusSession ? "Return to focus" : "Start focus"}
              actionIcon={activeFocusSession ? <ArrowRight size={12} /> : startRecommendedFocus.isPending ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              actionDisabled={!activeFocusSession && (!nextActionData || focusLoading || focusError || startRecommendedFocus.isPending)}
              onAction={activeFocusSession ? () => navigate("/focus") : () => startRecommendedFocus.mutate()}
              actionError={startRecommendedFocus.error?.response?.data?.message}
            />
          </div>
        </motion.section>

        {/* =========================================================
            ATTRIBUTES + PERFORMANCE
        ========================================================= */}
        <motion.section variants={staggerItem} className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_.8fr]">
          <div className="rounded-[28px] border border-white/5 bg-slate-950/65 p-6 shadow-xl backdrop-blur-xl sm:p-8">
            <div className="mb-7 flex items-end justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400">
                  Character Development
                </p>
                <h2 className="mt-1 font-heading text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
                  Core Attributes
                </h2>
              </div>
              <Activity size={20} className="text-slate-700" />
            </div>

            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {TOP_STATS.map((key, index) => {
                const value = stats?.[key]?.value || 0;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span className="text-base">{STAT_ICONS[key]}</span>
                        {STAT_LABELS[key]}
                      </span>
                      <span className="font-display text-sm font-black text-white">{value}</span>
                    </div>
                    <StatBar value={value} color={STAT_COLORS[key]} />
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/5 bg-slate-950/65 p-6 shadow-xl backdrop-blur-xl sm:p-8">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-violet-400">
              Combat Metrics
            </p>
            <h2 className="mt-1 font-heading text-xl font-black uppercase tracking-tight text-white">
              Performance
            </h2>

            <div className="mt-6 space-y-5">
              {scoreCards.map(({ key, label, icon: Icon, tone }, index) => {
                const value = stats?.[key] || 0;
                const toneMap = {
                  cyan: "text-cyan-400 bg-cyan-400/10 border-cyan-400/10",
                  violet: "text-violet-400 bg-violet-400/10 border-violet-400/10",
                  amber: "text-amber-400 bg-amber-400/10 border-amber-400/10",
                  emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/10",
                };
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span className={`rounded-lg border p-1.5 ${toneMap[tone]}`}>
                          <Icon size={12} />
                        </span>
                        {label}
                      </span>
                      <span className="font-display text-sm font-black text-white">{value}/100</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-900">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 1.2, delay: index * 0.08 }}
                        className={`h-full rounded-full ${
                          tone === "cyan"
                            ? "bg-cyan-400"
                            : tone === "violet"
                            ? "bg-violet-400"
                            : tone === "amber"
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                        }`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* =========================================================
            MISSIONS + BOSS
        ========================================================= */}
        <motion.section variants={staggerItem} className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_.6fr]">
          <div>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400">
                  Current Objectives
                </p>
                <h2 className="mt-1 font-heading text-xl font-black uppercase tracking-tight text-white">
                  Active Missions
                </h2>
              </div>
              <a
                href="/quests"
                className="text-[9px] font-black uppercase tracking-widest text-cyan-400 transition hover:text-white"
              >
                Quest Board →
              </a>
            </div>

            <div className="mb-4 rounded-2xl border border-white/5 bg-slate-950/55 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Daily Synchronization
                </span>
                <span className="font-display text-xs font-black text-cyan-400">{completionRate}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-900">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 1.2 }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                />
              </div>
            </div>

            {activeQuests.length === 0 ? (
              <EmptyState
                icon={Sword}
                title="No Active Missions"
                description="Access the Quest Board to initiate your next objective."
              />
            ) : (
              <div className="space-y-3">
                {activeQuests.map((quest, index) => {
                  const progress = Math.min(
                    100,
                    quest.targetValue
                      ? (quest.currentValue / quest.targetValue) * 100
                      : 0
                  );
                  return (
                    <motion.div
                      key={quest._id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                      whileHover={{ x: 4 }}
                      className="group rounded-2xl border border-white/5 bg-slate-950/60 p-4 transition hover:border-cyan-400/15 hover:bg-slate-900/70"
                    >
                      <div className="flex items-center gap-4">
                        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/5 text-cyan-400 sm:flex">
                          <Sword size={17} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <DiffBadge diff={quest.difficulty} />
                            <span className="truncate text-[8px] font-black uppercase tracking-widest text-slate-600">
                              {quest.category}
                            </span>
                          </div>
                          <h3 className="truncate text-sm font-black uppercase tracking-tight text-slate-200">
                            {quest.title}
                          </h3>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1 }}
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                            />
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-display text-sm font-black text-cyan-400">
                            +{quest.xpReward}
                          </p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">
                            XP
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-red-500/10 bg-slate-950/65 p-6 shadow-xl backdrop-blur-xl sm:p-7">
            {boss ? (
              <>
                <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-red-500/10 blur-3xl" />
                <div className="relative">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-red-400">
                    Threat Detected
                  </p>
                  <h2 className="mt-1 font-heading text-xl font-black uppercase tracking-tight text-white">
                    {boss.name}
                  </h2>
                  <div className="mt-7">
                    <div className="mb-2 flex justify-between text-[9px] font-black uppercase tracking-widest">
                      <span className="text-red-400">Entity HP</span>
                      <span className="text-slate-500">{boss.currentHp}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full border border-red-500/10 bg-slate-900">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${boss.currentHp}%` }}
                        transition={{ duration: 1.2 }}
                        className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-400 shadow-[0_0_15px_rgba(248,113,113,.35)]"
                      />
                    </div>
                  </div>
                  <p className="mt-5 line-clamp-3 text-xs leading-relaxed text-slate-500">
                    {boss.description}
                  </p>
                  <a
                    href="/bosses"
                    className="mt-6 flex items-center justify-center rounded-xl bg-red-500/10 py-3 text-[9px] font-black uppercase tracking-[0.22em] text-red-400 transition hover:bg-red-500 hover:text-white"
                  >
                    Initiate Suppression
                  </a>
                </div>
              </>
            ) : (
              <div className="flex min-h-[230px] flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-4">
                  <Shield size={30} className="text-emerald-400/70" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400/70">
                  System Stable
                </p>
                <p className="mt-2 text-xs text-slate-600">No active boss threat detected.</p>
              </div>
            )}
          </div>
        </motion.section>

        {/* Minimal navigation, not a second dashboard */}
        <motion.section variants={staggerItem} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: "/focus", icon: "⏱️", label: "Focus" },
            { href: "/goals", icon: "🎯", label: "Goals" },
            { href: "/calendar", icon: "📅", label: "Calendar" },
            { href: "/analytics", icon: "📈", label: "Analytics" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group flex items-center justify-center gap-2 rounded-2xl border border-white/5 bg-slate-950/45 px-4 py-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400/15 hover:bg-slate-900/70"
            >
              <span className="text-lg transition duration-300 group-hover:scale-110">{item.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 transition group-hover:text-slate-200">
                {item.label}
              </span>
            </a>
          ))}
        </motion.section>
      </motion.div>
    </motion.div>
  );
}

function CommandPanel({ icon, label, value, detail, tone, href, actionLabel, actionIcon, actionDisabled, onAction, actionError }) {
  const tones = {
    cyan: "text-cyan-400 bg-cyan-400/10 border-cyan-400/10",
    violet: "text-violet-400 bg-violet-400/10 border-violet-400/10",
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/10",
    slate: "text-slate-400 bg-slate-400/10 border-slate-400/10",
  };

  return (
    <div className="group rounded-2xl border border-white/5 bg-slate-900/35 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400/15 hover:bg-slate-900/60">
      <Link to={href} className="block">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span
          className={`inline-flex rounded-xl border p-2 ${tones[tone] || tones.slate}`}
        >
          {icon}
        </span>
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-700 transition group-hover:text-cyan-400">
          Open →
        </span>
      </div>

      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate font-display text-lg font-black uppercase text-white">
        {value}
      </p>
      <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-widest text-slate-600">
        {detail}
      </p>
      </Link>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-violet-400/15 bg-violet-400/5 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-violet-200 transition hover:bg-violet-400/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {actionIcon}{actionLabel}
        </button>
      )}
      {actionError && <p role="alert" className="mt-2 text-[10px] text-red-300">{actionError}</p>}
    </div>
  );
}

function HeaderMetric({ icon, label, value }) {
  return (
    <div className="min-w-[82px] rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2.5 sm:min-w-[100px]">
      <div className="mb-1 flex items-center gap-1.5 text-cyan-400">{icon}</div>
      <p className="font-display text-lg font-black leading-none text-white">{value}</p>
      <p className="mt-1 text-[7px] font-black uppercase tracking-[0.2em] text-slate-600">{label}</p>
    </div>
  );
}

function OverviewCard({ label, value, detail, icon, tone }) {
  const tones = {
    cyan: "text-cyan-400 bg-cyan-400/10 border-cyan-400/10",
    orange: "text-orange-400 bg-orange-400/10 border-orange-400/10",
    violet: "text-violet-400 bg-violet-400/10 border-violet-400/10",
    emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/10",
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="rounded-2xl border border-white/5 bg-slate-950/55 p-4 backdrop-blur-xl transition hover:border-white/10"
    >
      <div className={`mb-4 inline-flex rounded-xl border p-2 ${tones[tone]}`}>{icon}</div>
      <p className="font-display text-xl font-black text-white sm:text-2xl">{value}</p>
      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 truncate text-[9px] text-slate-700">{detail}</p>
    </motion.div>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-900/50 p-3">
      <div className="rounded-lg bg-white/5 p-2">{icon}</div>
      <div className="leading-tight">
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">
          {label}
        </p>
        <p className="font-display text-xs font-bold text-slate-200">{value}</p>
      </div>
    </div>
  );
}
