import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
} from "../../components/ui/PageLoader.jsx";
import DailyBonusWidget from "../../components/ui/DailyBonusWidget.jsx";
import OnboardingTutorial from "../../components/ui/OnboardingTutorial.jsx";

// Professional Rank Assets (Verified URLs)
const RANK_INSIGNIAS = {
  Unawakened:
    "https://res.cloudinary.com/di5reah7g/image/upload/v1784732149/F_Rank_gzgzmy.png",
  E: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732086/E_Rank_ljcatr.png",
  D: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732086/D_Rank_ofo1x0.png",
  C: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732086/C_Rank_kqjvqj.png",
  B: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732086/B_Rank_zkqjzk.png",
  A: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732086/A_Rank_qjzqjz.png",
  S: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732086/S_Rank_qjzqjz.png",
  National:
    "https://res.cloudinary.com/di5reah7g/image/upload/v1784733748/National_Rank_btbfmm.png",
  Monarch:
    "https://res.cloudinary.com/di5reah7g/image/upload/v1784733748/Monarch_Rank_soykht.png",
  "Shadow Monarch":
    "https://res.cloudinary.com/di5reah7g/image/upload/v1784733748/Shadow_Monarch_Rank_quuouq.png",
};

export default function DashboardPage() {
  const { hunter, stats, user } = useHunterStore();

  // Queries
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

  const quests = questData?.quests || [];
  const total = questData?.total || 0;
  const completed = questData?.completed || 0;
  const boss = bossData?.boss;

  const SCORE_CARDS = [
    {
      label: "Focus",
      key: "focusScore",
      icon: "🎯",
      color: "text-cyan-400",
      hex: "#22d3ee",
    },
    {
      label: "Discipline",
      key: "disciplineScore",
      icon: "🛡️",
      color: "text-purple-400",
      hex: "#a855f7",
    },
    {
      label: "Momentum",
      key: "momentumScore",
      icon: "⚡",
      color: "text-yellow-400",
      hex: "#facc15",
    },
    {
      label: "Performance",
      key: "performanceScore",
      icon: "📊",
      color: "text-emerald-400",
      hex: "#34d399",
    },
  ];

  const TOP_STATS = [
    "discipline",
    "intelligence",
    "sense",
    "vitality",
    "timeManagement",
  ];

  if (!hunter) return null;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pb-12"
    >
      <OnboardingTutorial />
      <DailyBonusWidget />

      {/* COMMAND CENTER HEADER */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar with Rank Glow */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl border-2 border-cyan-500/30 overflow-hidden shadow-glow-cyan-sm bg-slate-900">
              <img
                src={
                  user?.avatar?.url ||
                  "https://res.cloudinary.com/demo/image/upload/v1631711732/avatar-placeholder.png"
                }
                className="w-full h-full object-cover"
                alt="Hunter Avatar"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-950 rounded-lg border border-white/10 p-1">
              <img
                src={
                  RANK_INSIGNIAS[hunter.rank] || RANK_INSIGNIAS["Unawakened"]
                }
                alt="Rank"
              />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-cyan-500 tracking-[0.3em] uppercase mb-1">
              Command Center
            </p>
            <h1 className="font-heading font-bold text-3xl text-white flex items-center gap-2 tracking-tighter">
              WELCOME,{" "}
              <span className="text-gradient-cyan uppercase">
                {hunter.hunterName}
              </span>
              <Zap
                size={20}
                className="text-cyan-400 fill-cyan-400 animate-pulse"
              />
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <RankBadge rank={hunter.rank} size="sm" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Level {hunter.level} · {formatXP(hunter.totalXP)} Total XP
              </span>
            </div>
          </div>
        </div>

        {/* Streak Display */}
        {hunter.currentStreak > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 px-6 py-3 rounded-2xl flex items-center gap-3 text-orange-400 backdrop-blur-sm">
            <Flame size={20} className="fill-orange-500/20" />
            <div className="leading-none">
              <p className="text-[10px] font-black uppercase tracking-widest mb-1">
                Streak
              </p>
              <p className="font-display text-xl font-bold">
                {hunter.currentStreak} DAYS
              </p>
            </div>
          </div>
        )}
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        {/* ROW 1: POWER SCORE & SYSTEM PERFORMANCE */}
        <motion.div
          variants={staggerItem}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          {/* Main Power Score Card */}
          <div className="glass-cyan rounded-3xl p-8 border border-white/10 relative overflow-hidden bg-slate-950/40">
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                Total Power Score
              </p>
              <h2 className="font-display text-6xl font-black text-white mb-6">
                <CountUp end={hunter.powerScore} duration={2.5} />
              </h2>

              <XPBar hunter={hunter} className="mb-6" />

              <div className="grid grid-cols-2 gap-4">
                <MiniStat
                  icon={<Shield size={14} className="text-cyan-400" />}
                  label="Rank"
                  value={hunter.rank}
                />
                <MiniStat
                  icon={<Award size={14} className="text-purple-400" />}
                  label="Quests"
                  value={hunter.totalQuestCompletions}
                />
              </div>
            </div>
            {/* Visual Decoration */}
            <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
              <Activity size={200} />
            </div>
          </div>

          {/* Performance Grids */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3">
            {SCORE_CARDS.map((sc) => (
              <div
                key={sc.key}
                className="glass rounded-2xl p-6 border border-white/5 bg-slate-900/20 hover:border-white/10 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {sc.label}
                  </span>
                  <span className="text-xl group-hover:scale-125 transition-transform">
                    {sc.icon}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-3">
                  <p className={`font-display text-3xl font-bold ${sc.color}`}>
                    {stats?.[sc.key] || 0}
                  </p>
                  <span className="text-slate-600 text-xs font-bold uppercase">
                    /100
                  </span>
                </div>
                <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: sc.hex,
                      boxShadow: `0 0 10px ${sc.hex}66`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${stats?.[sc.key] || 0}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ROW 2: ACTIVE MISSIONS */}
        <motion.div variants={staggerItem}>
          <SectionHeader
            label="Tactical Objectives"
            title="Active Quests"
            action={
              <a
                href="/quests"
                className="text-[10px] font-black text-cyan-400 uppercase tracking-widest hover:text-cyan-300"
              >
                Open Quest Board →
              </a>
            }
          />

          <div className="glass rounded-2xl p-5 border border-white/5 mb-4 bg-slate-900/20">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                Daily Synchronization: {completed}/{total} Missions
              </p>
              {completed === total && total > 0 && (
                <span className="text-[10px] font-black text-emerald-400 uppercase animate-pulse tracking-widest">
                  Efficiency: 100%
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {Array.from({ length: Math.max(total, 5) }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full transition-all duration-500 ${i < completed ? "bg-cyan-500 shadow-glow-cyan-sm" : "bg-slate-800"}`}
                />
              ))}
            </div>
          </div>

          {quests.filter((q) => q.status === "active").length === 0 ? (
            <EmptyState
              icon={Sword}
              title="No Active Quests"
              description="Access the Quest Board to initiate new daily objectives."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quests
                .filter((q) => q.status === "active")
                .slice(0, 3)
                .map((quest) => (
                  <div
                    key={quest._id}
                    className="glass rounded-2xl p-5 border border-white/5 hover:border-cyan-500/20 transition-all bg-slate-900/40"
                  >
                    <div className="flex justify-between mb-3">
                      <DiffBadge diff={quest.difficulty} />
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                        {quest.category}
                      </span>
                    </div>
                    <h4 className="font-heading font-bold text-slate-100 mb-4 line-clamp-1 uppercase text-sm tracking-tight">
                      {quest.title}
                    </h4>
                    <div className="flex justify-between text-[10px] font-bold mb-2">
                      <span className="text-slate-500 uppercase">
                        {quest.currentValue} / {quest.targetValue} {quest.unit}
                      </span>
                      <span className="text-cyan-400">
                        +{quest.xpReward} XP
                      </span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-600"
                        style={{
                          width: `${(quest.currentValue / quest.targetValue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </motion.div>

        {/* ROW 3: STATS & BOSS */}
        <motion.div
          variants={staggerItem}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2 glass rounded-3xl p-8 bg-slate-900/40 border border-white/5">
            <SectionHeader label="Growth Tracking" title="Life Attributes" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {TOP_STATS.map((key) => (
                <div key={key}>
                  <div className="flex justify-between mb-2">
                    <span className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2">
                      {STAT_ICONS[key]} {STAT_LABELS[key]}
                    </span>
                    <span className="text-[11px] font-black text-white">
                      {stats?.[key]?.value || 0}%
                    </span>
                  </div>
                  <StatBar
                    value={stats?.[key]?.value || 0}
                    color={STAT_COLORS[key]}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* BOSS CARD */}
          <div className="glass rounded-3xl p-8 border border-red-500/10 bg-red-950/5 relative overflow-hidden">
            {boss ? (
              <div className="relative z-10">
                <SectionHeader label="⚠️ Threat Detected" title={boss.name} />
                <div className="mt-6 mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                      Entity Health
                    </span>
                    <span className="text-xs font-bold text-red-400">
                      {boss.currentHp}%
                    </span>
                  </div>
                  <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-red-500/20">
                    <motion.div
                      className="h-full bg-gradient-to-r from-red-700 to-red-400"
                      animate={{ width: `${boss.currentHp}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 italic mb-6 leading-relaxed">
                  "{boss.description}"
                </p>
                <a
                  href="/bosses"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all shadow-glow-red-sm"
                >
                  Initiate Suppression
                </a>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
                <Shield size={40} className="text-slate-700 mb-4" />
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">
                  No Hostile Entities Present
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* QUICK ACTIONS */}
        <motion.div variants={staggerItem}>
          <SectionHeader label="System Subroutines" title="Quick Access" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                href: "/focus",
                icon: "⏱️",
                label: "Focus Room",
                color: "border-cyan-500/20",
              },
              {
                href: "/raids",
                icon: "⚔️",
                label: "Task Raids",
                color: "border-purple-500/20",
              },
              {
                href: "/dungeons",
                icon: "🏰",
                label: "Gate Entrance",
                color: "border-indigo-500/20",
              },
              {
                href: "/calendar",
                icon: "📅",
                label: "Time Log",
                color: "border-emerald-500/20",
              },
            ].map((a) => (
              <a
                key={a.href}
                href={a.href}
                className={`glass rounded-2xl p-6 flex flex-col items-center gap-3 border ${a.color} hover:bg-white/5 transition-all group`}
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">
                  {a.icon}
                </span>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  {a.label}
                </span>
              </a>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-white/5">
      <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
      <div className="leading-tight">
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
          {label}
        </p>
        <p className="font-display text-xs font-bold text-slate-200">{value}</p>
      </div>
    </div>
  );
}
