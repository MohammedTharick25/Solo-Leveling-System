import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, Sword, Target, TrendingUp, Star } from "lucide-react";
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

export default function DashboardPage() {
  const { hunter, stats } = useHunterStore();

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
    { label: "Focus", key: "focusScore", icon: "🎯", color: "text-cyan-400" },
    {
      label: "Discipline",
      key: "disciplineScore",
      icon: "🛡️",
      color: "text-purple-400",
    },
    {
      label: "Momentum",
      key: "momentumScore",
      icon: "⚡",
      color: "text-yellow-400",
    },
    {
      label: "Performance",
      key: "performanceScore",
      icon: "📊",
      color: "text-emerald-400",
    },
  ];

  const TOP_STATS = [
    "discipline",
    "intelligence",
    "sense",
    "vitality",
    "timeManagement",
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <OnboardingTutorial />
      <DailyBonusWidget />

      <div className="mb-8">
        <p className="text-system mb-1">Command Center</p>
        <h1 className="font-heading font-bold text-2xl text-slate-100">
          Welcome back,{" "}
          <span className="text-gradient-cyan">{hunter?.hunterName}</span>
        </h1>
        {hunter && (
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <RankBadge rank={hunter.rank} />
            <span className="font-heading text-sm text-slate-500">
              Level {hunter.level} · {formatXP(hunter.totalXP)} Total XP
            </span>
            {hunter.currentStreak > 0 && (
              <span className="flex items-center gap-1 font-heading text-sm text-orange-400">
                <Flame size={13} /> {hunter.currentStreak}d streak
              </span>
            )}
          </div>
        )}
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        {/* Hunter card + Score cards */}
        <motion.div variants={staggerItem}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-cyan rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-hud mb-1">Power Score</p>
                  <p className="font-display text-3xl font-black text-gradient-cyan">
                    {hunter?.powerScore || 0}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/20 border-2 border-cyan-500/40 flex items-center justify-center">
                  <span className="font-display text-lg text-cyan-300">
                    {hunter?.hunterName?.[0]?.toUpperCase()}
                  </span>
                </div>
              </div>
              <XPBar hunter={hunter} className="mb-3" />
              <div className="grid grid-cols-2 gap-3 mt-4">
                <MiniStat
                  icon={<Star size={12} className="text-yellow-400" />}
                  label="Level"
                  value={hunter?.level}
                />
                <MiniStat
                  icon={<Flame size={12} className="text-orange-400" />}
                  label="Streak"
                  value={`${hunter?.currentStreak || 0}d`}
                />
                <MiniStat
                  icon={<Target size={12} className="text-emerald-400" />}
                  label="Quests"
                  value={hunter?.totalQuestCompletions || 0}
                />
                <MiniStat
                  icon={<TrendingUp size={12} className="text-purple-400" />}
                  label="Best"
                  value={`${hunter?.longestStreak || 0}d`}
                />
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-2 gap-3">
              {SCORE_CARDS.map((sc) => (
                <div key={sc.key} className="glass rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-hud">{sc.label}</span>
                    <span className="text-lg">{sc.icon}</span>
                  </div>
                  <p className={`font-display text-2xl font-bold ${sc.color}`}>
                    {stats?.[sc.key] || 0}
                    <span className="text-slate-600 text-sm font-normal">
                      /100
                    </span>
                  </p>
                  <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: sc.color.includes("cyan")
                          ? "#22d3ee"
                          : sc.color.includes("purple")
                            ? "#a855f7"
                            : sc.color.includes("yellow")
                              ? "#facc15"
                              : "#34d399",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${stats?.[sc.key] || 0}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Daily quest progress */}
        <motion.div variants={staggerItem}>
          <SectionHeader
            label="Today's Mission"
            title="Daily Quests"
            action={
              <a
                href="/quests"
                className="font-heading text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View all →
              </a>
            }
          />
          <div className="glass rounded-xl p-4 border border-slate-700/50 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-heading text-sm text-slate-300">
                {completed}/{total} completed
              </span>
              {completed === total && total > 0 && (
                <span className="font-heading text-sm text-emerald-400">
                  ✅ All done!
                </span>
              )}
            </div>
            <div className="flex gap-1.5 mb-2">
              {Array.from({ length: total || 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full transition-all duration-300
                  ${i < completed ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : "bg-slate-800"}`}
                />
              ))}
            </div>
          </div>
          {quests.filter((q) => q.status === "active").length === 0 ? (
            <EmptyState
              icon={Sword}
              title="No active quests"
              description="The System is preparing your next challenges."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {quests
                .filter((q) => q.status === "active")
                .slice(0, 3)
                .map((quest) => (
                  <div
                    key={quest._id}
                    className="glass rounded-xl p-4 border border-slate-700/50"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <DiffBadge diff={quest.difficulty} />
                      <span className="font-heading text-[10px] text-slate-500 uppercase">
                        {quest.category}
                      </span>
                    </div>
                    <h4 className="font-heading font-semibold text-sm text-slate-200 mb-1 leading-snug">
                      {quest.title}
                    </h4>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-body text-[10px] text-slate-500">
                        {quest.currentValue}/{quest.targetValue} {quest.unit}
                      </span>
                      <span className="font-display text-[10px] text-yellow-400">
                        +{quest.xpReward} XP
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                        style={{
                          width: `${quest.targetValue > 0 ? Math.min((quest.currentValue / quest.targetValue) * 100, 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </motion.div>

        {/* Stats + Boss */}
        <motion.div
          variants={staggerItem}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <SectionHeader label="Character Stats" title="Life Stats" />
            <div className="space-y-4">
              {TOP_STATS.map((key) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-heading text-sm text-slate-300 flex items-center gap-1.5">
                      <span>{STAT_ICONS[key]}</span> {STAT_LABELS[key]}
                    </span>
                    <span className="font-display text-xs text-slate-400">
                      {stats?.[key]?.value || 0}/100
                    </span>
                  </div>
                  <StatBar
                    value={stats?.[key]?.value || 0}
                    color={STAT_COLORS[key]}
                  />
                </div>
              ))}
              <a
                href="/hunter"
                className="font-heading text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-2 block"
              >
                View all 13 stats →
              </a>
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            {boss ? (
              <div>
                <SectionHeader label="⚠️ Boss Alert" title={boss.name} />
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-hud">Boss HP</span>
                    <span className="font-display text-xs text-red-400">
                      {boss.currentHp}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                      animate={{ width: `${boss.currentHp}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
                <p className="font-body text-xs text-slate-400 mb-3 line-clamp-3">
                  {boss.description}
                </p>
                <a
                  href="/bosses"
                  className="btn-danger text-xs w-full flex justify-center py-2"
                >
                  Enter Battle →
                </a>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <SectionHeader label="System Status" title="No Active Boss" />
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl">✓</span>
                    </div>
                    <p className="font-heading text-sm text-slate-400">
                      Stay consistent to keep bosses away.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div variants={staggerItem}>
          <SectionHeader label="System Menu" title="Quick Actions" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                href: "/focus",
                icon: "⏱️",
                label: "Start Focus",
                color: "border-cyan-500/30 hover:border-cyan-500/60",
              },
              {
                href: "/raids",
                icon: "⚔️",
                label: "Task Raids",
                color: "border-purple-500/30 hover:border-purple-500/60",
              },
              {
                href: "/dungeons",
                icon: "🏰",
                label: "Dungeons",
                color: "border-indigo-500/30 hover:border-indigo-500/60",
              },
              {
                href: "/calendar",
                icon: "📅",
                label: "Calendar",
                color: "border-emerald-500/30 hover:border-emerald-500/60",
              },
            ].map((a) => (
              <a
                key={a.href}
                href={a.href}
                className={`glass rounded-xl p-4 flex flex-col items-center gap-2 border text-center transition-all duration-200 group ${a.color}`}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">
                  {a.icon}
                </span>
                <span className="font-heading text-sm text-slate-300 font-semibold">
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
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-hud text-[9px]">{label}</p>
        <p className="font-display text-sm text-slate-200">{value}</p>
      </div>
    </div>
  );
}
