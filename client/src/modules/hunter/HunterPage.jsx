import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Share2, Copy, Check } from "lucide-react";
import { useState } from "react";
import api from "../../lib/api.js";
import { useHunterStore } from "../../stores/hunterStore.js";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";
import {
  STAT_LABELS,
  STAT_COLORS,
  STAT_ICONS,
  formatXP,
} from "../../lib/xpFormulas.js";
import {
  RankBadge,
  StatBar,
  SectionHeader,
  Card,
  Badge,
  XPBar,
} from "../../components/ui/PageLoader.jsx";

const ALL_STATS = [
  "strength",
  "agility",
  "intelligence",
  "vitality",
  "sense",
  "discipline",
  "communication",
  "leadership",
  "creativity",
  "financialIntelligence",
  "problemSolving",
  "emotionalControl",
  "timeManagement",
];

export default function HunterPage() {
  const { hunter, stats, setHunter } = useHunterStore();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: futureSelfData } = useQuery({
    queryKey: ["future-self"],
    queryFn: async () => {
      const { data } = await api.get("/hunter/future-self");
      return data.data;
    },
  });

  const equipTitleMutation = useMutation({
    mutationFn: (title) => api.patch("/hunter/title", { title }),
    onSuccess: ({ data }) => {
      setHunter(data.data.hunter);
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    },
  });

  const handleShare = async () => {
    const url = `${window.location.origin}/h/${hunter?._id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${hunter?.hunterName} — Solo Leveling`,
          text: `Check out my Hunter Profile! Level ${hunter?.level} ${hunter?.rank} Rank.`,
          url,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!hunter) return null;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-system mb-1">Hunter Profile</p>
          <h1 className="font-heading font-bold text-2xl text-slate-100">
            {hunter.hunterName}
          </h1>
        </div>
        {/* Share button */}
        <button
          onClick={handleShare}
          className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
        >
          {copied ? (
            <>
              <Check size={14} /> Copied!
            </>
          ) : (
            <>
              <Share2 size={14} /> Share Profile
            </>
          )}
        </button>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        {/* Hunter Card */}
        <motion.div variants={staggerItem}>
          <div className="glass-cyan rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div
                className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30
                              border-2 border-cyan-500/50 shadow-glow-cyan flex items-center justify-center shrink-0"
              >
                <span className="font-display text-4xl text-cyan-300">
                  {hunter.hunterName?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                  <RankBadge rank={hunter.rank} />
                  <Badge color="purple">{hunter.title}</Badge>
                </div>
                <h2 className="font-display text-2xl font-black text-gradient-hero mb-1">
                  {hunter.hunterName}
                </h2>
                <p className="font-heading text-sm text-slate-400 mb-4">
                  Level {hunter.level} · {formatXP(hunter.totalXP)} Total XP ·
                  Power Score {hunter.powerScore}
                </p>
                <XPBar hunter={hunter} className="max-w-xs" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <StatChip
                    label="Quests Done"
                    value={hunter.totalQuestCompletions}
                  />
                  <StatChip label="Streak" value={`${hunter.currentStreak}d`} />
                  <StatChip
                    label="Best Streak"
                    value={`${hunter.longestStreak}d`}
                  />
                  <StatChip
                    label="Focus Hours"
                    value={`${Math.floor((hunter.totalFocusMinutes || 0) / 60)}h`}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Achievements */}
        {hunter.achievements?.length > 0 && (
          <motion.div variants={staggerItem}>
            <SectionHeader
              label="Hall of Records"
              title={`Achievements (${hunter.achievements.length})`}
            />
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3">
              {hunter.achievements
                .sort(
                  (a, b) =>
                    (({ legendary: 0, epic: 1, rare: 2, common: 3 })[
                      a.rarity
                    ] ?? 3) -
                    ({ legendary: 0, epic: 1, rare: 2, common: 3 }[b.rarity] ??
                      3),
                )
                .map((a) => (
                  <div
                    key={a.id}
                    title={`${a.name}: ${a.description}`}
                    className={`flex flex-col items-center p-3 rounded-xl border text-center cursor-help
                                ${a.rarity === "legendary" ? "border-yellow-500/40 bg-yellow-950/20" : a.rarity === "epic" ? "border-purple-500/30 bg-purple-950/15" : a.rarity === "rare" ? "border-blue-500/30 bg-blue-950/15" : "border-slate-700/40 bg-slate-800/20"}`}
                  >
                    <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>
                      {a.icon}
                    </span>
                    <p className="font-heading text-[9px] text-slate-500 mt-1.5 leading-tight">
                      {a.name}
                    </p>
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        {/* Titles */}
        {hunter.titles?.length > 0 && (
          <motion.div variants={staggerItem}>
            <SectionHeader label="Earned Titles" title="Equip a Title" />
            <div className="flex flex-wrap gap-2">
              {hunter.titles.map((title) => (
                <button
                  key={title}
                  onClick={() => equipTitleMutation.mutate(title)}
                  className={`px-4 py-2 rounded-lg font-heading text-sm font-semibold border transition-all
                              ${hunter.title === title ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-400 shadow-glow-cyan-sm" : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-600"}`}
                >
                  {title}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* All Life Stats */}
        <motion.div variants={staggerItem}>
          <Card>
            <SectionHeader label="Character Sheet" title="Life Stats" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {ALL_STATS.map((key) => (
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
            </div>
          </Card>
        </motion.div>

        {/* Future Self */}
        {futureSelfData?.projections && (
          <motion.div variants={staggerItem}>
            <Card>
              <SectionHeader
                label="Predictive System"
                title="Future Self Simulator"
              />
              <p className="font-body text-sm text-slate-500 mb-5">
                Based on your current pace, here's where you're headed.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {futureSelfData.projections.map((p) => (
                  <div
                    key={p.daysAhead}
                    className="glass rounded-xl p-4 text-center"
                  >
                    <p className="text-hud mb-2">
                      {p.daysAhead < 365 ? `${p.daysAhead} Days` : "1 Year"}
                    </p>
                    <p className="font-display text-xl font-bold text-gradient-cyan mb-1">
                      LV.{p.projectedLevel}
                    </p>
                    <RankBadge
                      rank={p.projectedRank}
                      className="text-[9px] px-1.5 py-0.5"
                    />
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Share card */}
        <motion.div variants={staggerItem}>
          <div className="glass rounded-xl p-5 border border-slate-700/50 flex items-center justify-between gap-4">
            <div>
              <p className="font-heading font-semibold text-sm text-slate-200 mb-1">
                Share your Hunter Profile
              </p>
              <p className="font-body text-xs text-slate-500">
                {`${window.location.origin}/h/${hunter?._id}`}
              </p>
            </div>
            <button
              onClick={handleShare}
              className="btn-secondary py-2 px-4 text-sm flex items-center gap-2 shrink-0"
            >
              {copied ? (
                <>
                  <Check size={13} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={13} /> Copy Link
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function StatChip({ label, value }) {
  return (
    <div className="bg-slate-900/40 rounded-lg p-3 text-center sm:text-left">
      <p className="text-hud text-[9px] mb-1">{label}</p>
      <p className="font-display text-lg text-slate-100">{value}</p>
    </div>
  );
}
