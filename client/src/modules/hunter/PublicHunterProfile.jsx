import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Share2, Zap } from "lucide-react";
import api from "../../lib/api.js";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";
import { RankBadge, Badge } from "../../components/ui/PageLoader.jsx";
import { RANK_COLORS, RANK_GLOW, formatXP } from "../../lib/xpFormulas.js";

export default function PublicHunterProfile() {
  const { hunterId } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-hunter", hunterId],
    queryFn: async () => {
      const { data } = await api.get(`/hunter/${hunterId}/card`);
      return data.data.hunter;
    },
  });

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${data?.hunterName} — Solo Leveling`,
          text: `Level ${data?.level} ${data?.rank} Rank Hunter`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-display text-xs text-slate-500 tracking-widest animate-pulse">
            Accessing Hunter Records…
          </p>
        </div>
      </div>
    );

  if (isError || !data)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-center p-6">
        <div>
          <p className="text-5xl mb-4">👁️</p>
          <h2 className="font-heading font-bold text-xl text-slate-300 mb-2">
            Hunter Not Found
          </h2>
          <p className="font-body text-sm text-slate-500">
            The System has no record of this hunter.
          </p>
        </div>
      </div>
    );

  const rankColor = RANK_COLORS[data.rank] || "text-slate-400";
  const rankGlow = RANK_GLOW[data.rank] || "";

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30 pointer-events-none" />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-cyan-400" />
            <span className="font-display text-xs text-cyan-400 tracking-widest uppercase">
              Solo Leveling — Hunter Card
            </span>
          </div>
          <button
            onClick={handleShare}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5"
          >
            <Share2 size={13} /> Share
          </button>
        </div>

        <motion.div variants={pageVariants} initial="initial" animate="animate">
          {/* Hunter Card */}
          <div
            className={`glass rounded-3xl p-8 border mb-6 relative overflow-hidden ${rankGlow}
                            ${data.rank === "Shadow Monarch" ? "border-cyan-500/60" : data.rank === "Monarch" ? "border-purple-500/40" : "border-slate-700/60"}`}
          >
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/5 rounded-full blur-3xl" />
            <div className="relative flex flex-col sm:flex-row items-center gap-6">
              <div
                className={`w-24 h-24 rounded-2xl border-2 flex items-center justify-center shrink-0
                                bg-gradient-to-br from-cyan-500/20 to-purple-500/20 ${rankGlow}`}
              >
                <span className="font-display text-4xl text-slate-200">
                  {data.hunterName?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                  <RankBadge rank={data.rank} />
                  {data.title && <Badge color="purple">{data.title}</Badge>}
                </div>
                <h1
                  className={`font-display text-3xl font-black mb-1 ${rankColor}`}
                >
                  {data.hunterName}
                </h1>
                <p className="font-heading text-slate-400">
                  Level {data.level} · {formatXP(data.totalXP)} Total XP
                </p>
              </div>
            </div>

            <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7">
              {[
                {
                  icon: "⚡",
                  label: "Power Score",
                  value: data.powerScore || 0,
                  color: "text-cyan-400",
                },
                {
                  icon: "🏆",
                  label: "Quests Done",
                  value: data.totalQuestCompletions || 0,
                  color: "text-yellow-400",
                },
                {
                  icon: "🔥",
                  label: "Streak",
                  value: `${data.currentStreak || 0}d`,
                  color: "text-orange-400",
                },
                {
                  icon: "📊",
                  label: "Level",
                  value: data.level,
                  color: "text-purple-400",
                },
              ].map(({ icon, label, value, color }) => (
                <div
                  key={label}
                  className="bg-slate-900/60 rounded-xl p-3 text-center border border-slate-800/60"
                >
                  <span className="text-xl block mb-1">{icon}</span>
                  <p className="text-hud text-[9px] mb-0.5">{label}</p>
                  <p className={`font-display text-lg font-bold ${color}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          {data.achievements?.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="glass rounded-2xl p-6 border border-slate-700/50"
            >
              <p className="text-system mb-4">
                Achievements ({data.achievements.length})
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {data.achievements
                  .sort(
                    (a, b) =>
                      (({ legendary: 0, epic: 1, rare: 2, common: 3 })[
                        a.rarity
                      ] ?? 3) -
                      ({ legendary: 0, epic: 1, rare: 2, common: 3 }[
                        b.rarity
                      ] ?? 3),
                  )
                  .slice(0, 15)
                  .map((a) => (
                    <motion.div
                      key={a.id}
                      variants={staggerItem}
                      title={`${a.name}: ${a.description}`}
                      className={`flex flex-col items-center p-3 rounded-xl border text-center
                                  ${a.rarity === "legendary" ? "border-yellow-500/40 bg-yellow-950/20" : a.rarity === "epic" ? "border-purple-500/30 bg-purple-950/15" : a.rarity === "rare" ? "border-blue-500/30 bg-blue-950/15" : "border-slate-700/40 bg-slate-800/20"}`}
                    >
                      <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>
                        {a.icon}
                      </span>
                      <p className="font-heading text-[9px] text-slate-500 mt-1.5 leading-tight">
                        {a.name}
                      </p>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          )}

          <p className="text-center font-body text-xs text-slate-700 mt-6">
            Solo Leveling — Personal Evolution Operating System
          </p>
        </motion.div>
      </div>
    </div>
  );
}
