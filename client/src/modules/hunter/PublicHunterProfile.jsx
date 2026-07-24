import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Share2,
  Zap,
  Download,
  Trophy,
  Target,
  Activity,
  Shield,
} from "lucide-react";
import { useRef } from "react";
import { toPng } from "html-to-image";
import api from "../../lib/api.js";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";
import { RankBadge, Badge } from "../../components/ui/PageLoader.jsx";
import { RANK_COLORS, RANK_GLOW, formatXP } from "../../lib/xpFormulas.js";
import { RankAura } from "../../components/ui/RankAura.jsx";
import { PowerRadar } from "../../components/ui/HunterVisuals.jsx";

export default function PublicHunterProfile() {
  const { hunterId } = useParams();
  const cardRef = useRef(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-hunter", hunterId],
    queryFn: async () => {
      const { data } = await api.get(`/hunter/${hunterId}/card`);
      return data.data;
    },
  });

  const handleDownload = async () => {
    if (cardRef.current === null) return;
    const dataUrl = await toPng(cardRef.current, { cacheBust: true });
    const link = document.createElement("a");
    link.download = `Hunter-${data?.hunter.hunterName}-Card.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${data?.hunter.hunterName} | System Profile`,
          text: `Check out my progress on The System. Level ${data?.hunter.level} ${data?.hunter.rank} Rank Hunter.`,
          url: window.location.href,
        })
        .catch(() => {});
    }
  };

  if (isLoading) return <LoadingScreen />;
  if (isError || !data) return <NotFoundScreen />;

  const hunter = data?.hunter || {};
  const stats = data?.stats || {};

  const rankColor = RANK_COLORS[hunter.rank] || "text-slate-400";
  const rankGlow = RANK_GLOW[hunter.rank] || "";

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col items-center">
      {/* Dynamic Background Aura based on Rank */}
      <RankAura rank={hunter.rank} />

      <div className="relative z-10 w-full max-w-4xl px-4 py-12">
        {/* Floating Top Controls */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shadow-glow-cyan-sm">
              <Zap size={20} className="text-cyan-400" />
            </div>
            <div>
              <p className="font-display text-[10px] text-cyan-400 tracking-[0.3em] uppercase">
                System Link
              </p>
              <p className="font-heading text-xs text-slate-400 uppercase tracking-widest">
                Public Record
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="btn-ghost p-2.5 rounded-xl border border-slate-800 flex items-center gap-2"
            >
              <Download size={16} />{" "}
              <span className="hidden sm:inline text-xs">Download</span>
            </button>
            <button
              onClick={handleShare}
              className="btn-primary p-2.5 rounded-xl flex items-center gap-2"
            >
              <Share2 size={16} />{" "}
              <span className="hidden sm:inline text-xs">Share</span>
            </button>
          </div>
        </div>

        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          className="space-y-6"
        >
          {/* THE HUNTER CARD - THIS PART IS DOWNLOADED */}
          <div
            ref={cardRef}
            className={`relative rounded-[2.5rem] p-1 bg-slate-900 border overflow-hidden ${rankGlow}`}
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            {/* Inner Gradient Shine */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <div className="glass-dark rounded-[2.4rem] p-8 sm:p-12 relative overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left Column: Avatar & Main Identity */}
                <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
                  <div className="relative mb-8">
                    <div
                      className={`w-40 h-40 rounded-3xl border-2 p-1 overflow-hidden ${rankGlow}`}
                    >
                      <div className="w-full h-full rounded-[1.3rem] bg-slate-800 flex items-center justify-center overflow-hidden">
                        {/* This will now find hunter.avatar.url because of the backend change above */}
                        {hunter.avatar?.url ? (
                          <img
                            src={hunter.avatar.url}
                            alt={hunter.hunterName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-display text-6xl text-slate-100">
                            {hunter.hunterName?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4">
                      <RankBadge
                        rank={hunter.rank}
                        className="scale-125 shadow-2xl"
                      />
                    </div>
                  </div>

                  <h1
                    className={`font-display text-4xl sm:text-5xl font-black mb-2 tracking-tighter ${rankColor}`}
                  >
                    {hunter.hunterName}
                  </h1>
                  <div className="flex flex-wrap gap-2 mb-6 justify-center lg:justify-start items-center">
                    {/* Official System Rank */}
                    <Badge
                      color="cyan"
                      className="py-1 px-3 uppercase font-bold tracking-widest border border-cyan-500/30"
                    >
                      {hunter.rank} RANK
                    </Badge>

                    {/* Current Level */}
                    <Badge color="slate" className="py-1 px-3 bg-slate-800/50">
                      LV. {hunter.level}
                    </Badge>

                    {/* Display the Equipped Title with a different color (Purple) */}
                    {hunter.title && (
                      <Badge
                        color="purple"
                        className="py-1 px-3 uppercase text-[10px] tracking-widest italic opacity-80"
                      >
                        T: {hunter.title}
                      </Badge>
                    )}
                  </div>

                  <div className="w-full space-y-4">
                    <StatItem
                      icon={<Activity size={14} />}
                      label="Power Score"
                      value={hunter.powerScore}
                      color="text-cyan-400"
                    />
                    <StatItem
                      icon={<Target size={14} />}
                      label="Quests Cleared"
                      value={hunter.totalQuestCompletions}
                      color="text-yellow-400"
                    />
                    <StatItem
                      icon={<Shield size={14} />}
                      label="Global Standing"
                      value={`Top ${hunter.percentile || 1}%`}
                      color="text-purple-400"
                    />
                  </div>
                </div>

                {/* Right Column: Radar Chart & Sub-Stats */}
                <div className="lg:col-span-7 space-y-8">
                  <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5 backdrop-blur-sm">
                    <p className="font-display text-[10px] text-slate-500 tracking-[0.3em] uppercase mb-4 text-center">
                      Attribute Distribution
                    </p>
                    <div className="h-64 sm:h-80">
                      <PowerRadar stats={stats} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <MiniMetric
                      label="Total XP"
                      value={formatXP(hunter.totalXP)}
                      sub="Lifetime"
                    />
                    <MiniMetric
                      label="Daily Streak"
                      value={`${hunter.currentStreak}d`}
                      sub="Current"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Achievements Section - Non-Downloaded */}
          <SectionHeader
            title="Top Achievements"
            icon={<Trophy className="text-yellow-500" />}
          />
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4"
          >
            {hunter.achievements?.slice(0, 12).map((a) => (
              <AchievementIcon key={a.id} achievement={a} />
            ))}
          </motion.div>

          <p className="text-center font-display text-[10px] text-slate-600 tracking-[0.5em] uppercase pt-8">
            ── End of system record ──
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/* Helper Components */

function StatItem({ icon, label, value, color }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
      <div className="flex items-center gap-3 text-slate-400 font-heading text-sm">
        {icon} <span>{label}</span>
      </div>
      <span className={`font-display text-lg font-bold ${color}`}>{value}</span>
    </div>
  );
}

function MiniMetric({ label, value, sub }) {
  return (
    <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5">
      <p className="font-heading text-[10px] text-slate-500 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="font-display text-xl font-bold text-slate-200">{value}</p>
      <p className="font-body text-[9px] text-slate-600 uppercase mt-1">
        {sub}
      </p>
    </div>
  );
}

function AchievementIcon({ achievement }) {
  return (
    <motion.div
      variants={staggerItem}
      className="group relative flex flex-col items-center p-4 rounded-2xl bg-slate-900/40 border border-white/5 hover:bg-slate-800/60 transition-all"
    >
      <span className="text-3xl mb-2 grayscale group-hover:grayscale-0 transition-all">
        {achievement.icon}
      </span>
      <p className="font-heading text-[9px] text-slate-500 text-center uppercase tracking-tighter line-clamp-1">
        {achievement.name}
      </p>
    </motion.div>
  );
}

function SectionHeader({ title, icon }) {
  return (
    <div className="flex items-center gap-3 mt-12 mb-6">
      {icon}
      <h2 className="font-display text-sm font-bold text-slate-400 tracking-widest uppercase">
        {title}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-slate-800 to-transparent" />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      <p className="font-display text-xs text-cyan-500 tracking-[0.3em] animate-pulse">
        Syncing Public Database...
      </p>
    </div>
  );
}

function NotFoundScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6">
      <div className="text-6xl mb-6">👁️</div>
      <h2 className="font-display text-xl text-slate-200 tracking-widest uppercase mb-2">
        Record Restricted
      </h2>
      <p className="font-body text-sm text-slate-500 max-w-xs">
        The System could not locate the hunter file for this ID.
      </p>
    </div>
  );
}
