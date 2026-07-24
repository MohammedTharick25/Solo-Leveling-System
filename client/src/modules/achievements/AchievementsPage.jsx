import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { RefreshCw, Lock } from "lucide-react";
import api from "../../lib/api.js";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";
import { SectionHeader, Button, PageLoader } from "../../components/ui/PageLoader.jsx";

const RARITY_STYLES = {
  common: {
    border: "border-slate-600/60",
    bg: "bg-slate-800/40",
    badge: "bg-slate-700/60 text-slate-300",
    glow: "",
  },
  rare: {
    border: "border-blue-500/50",
    bg: "bg-blue-950/20",
    badge: "bg-blue-900/50 text-blue-300",
    glow: "shadow-[0_0_18px_rgba(96,165,250,0.25)]",
  },
  epic: {
    border: "border-purple-500/50",
    bg: "bg-purple-950/20",
    badge: "bg-purple-900/50 text-purple-300",
    glow: "shadow-[0_0_18px_rgba(168,85,247,0.3)]",
  },
  legendary: {
    border: "border-yellow-500/60",
    bg: "bg-yellow-950/20",
    badge: "bg-yellow-900/50 text-yellow-300",
    glow: "shadow-[0_0_22px_rgba(234,179,8,0.4)]",
  },
};

const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 };

export default function AchievementsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const response = await api.get("/achievements");
      // Explicitly return the content inside data.data
      return response.data.data;
    },
    retry: 1,
    staleTime: 5000,
  });

  const checkMutation = useMutation({
    mutationFn: () => api.post("/achievements/check"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    },
  });

  const sort = (arr) =>
    [...arr].sort(
      (a, b) => (RARITY_ORDER[a.rarity] ?? 3) - (RARITY_ORDER[b.rarity] ?? 3),
    );

  // Check if loading or if we have no data
  if (isLoading) return <PageLoader />;

  if (isError)
    return (
      <EmptyState
        title="System Link Interrupted"
        description="Failed to retrieve achievements."
      />
    );

  const unlocked = sort(data?.unlocked || []);

  const locked = sort(data?.locked || []);
  const total = data?.total || 0;
  const pct = total > 0 ? Math.round((unlocked.length / total) * 100) : 0;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-system mb-1">Hall of Records</p>
          <h1 className="font-heading font-bold text-2xl text-slate-100">
            Achievements
          </h1>
          <p className="font-body text-sm text-slate-500 mt-1">
            {unlocked.length} / {total} unlocked · {pct}% complete
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={checkMutation.isPending}
          onClick={() => checkMutation.mutate()}
        >
          <RefreshCw size={13} /> Check Progress
        </Button>
      </div>

      {/* Progress bar */}
      <div className="glass rounded-xl p-5 mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-hud">Overall Completion</span>
          <span className="font-display text-sm text-cyan-400">{pct}%</span>
        </div>
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["legendary", "epic", "rare", "common"].map((r) => {
            const count = unlocked.filter((a) => a.rarity === r).length;
            const s = RARITY_STYLES[r];
            return (
              <span
                key={r}
                className={`px-2.5 py-1 rounded-lg font-heading text-xs font-semibold border
                            ${s.border} ${s.badge}`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)} · {count}
              </span>
            );
          })}
        </div>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-10"
      >
        {/* Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="skeleton h-40 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Unlocked */}
        {unlocked.length > 0 && (
          <motion.div variants={staggerItem}>
            <SectionHeader
              label="Claimed"
              title={`Unlocked (${unlocked.length})`}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {unlocked.map((a) => (
                <AchievementCard key={a.id} achievement={a} unlocked />
              ))}
            </div>
          </motion.div>
        )}

        {/* Locked */}
        {locked.length > 0 && (
          <motion.div variants={staggerItem}>
            <SectionHeader
              label="Remaining"
              title={`Locked (${locked.length})`}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {locked.map((a) => (
                <AchievementCard key={a.id} achievement={a} unlocked={false} />
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function AchievementCard({ achievement, unlocked }) {
  const s = RARITY_STYLES[achievement.rarity] || RARITY_STYLES.common;

  return (
    <motion.div
      variants={staggerItem}
      whileHover={unlocked ? { y: -4, transition: { duration: 0.15 } } : {}}
      className={`relative rounded-2xl p-5 border transition-all duration-300
                  ${s.border} ${s.bg}
                  ${unlocked ? s.glow : "opacity-40"}`}
    >
      {/* Rarity badge */}
      <span
        className={`absolute top-3 right-3 px-2 py-0.5 rounded-md
                        font-display text-[9px] tracking-widest uppercase
                        border ${s.border} ${s.badge}`}
      >
        {achievement.rarity}
      </span>

      {/* Icon — rendered as plain text, no wrapper box */}
      <div className="mb-3">
        {unlocked ? (
          <span
            style={{ fontSize: "2.5rem", lineHeight: 1, display: "block" }}
            role="img"
            aria-label={achievement.name}
          >
            {achievement.icon}
          </span>
        ) : (
          <div
            className="w-10 h-10 rounded-xl border border-slate-700/50 bg-slate-800/50
                          flex items-center justify-center"
          >
            <Lock size={18} className="text-slate-600" />
          </div>
        )}
      </div>

      {/* Name */}
      <p
        className={`font-heading font-bold text-sm leading-snug mb-1
                      ${unlocked ? "text-slate-100" : "text-slate-600"}`}
      >
        {achievement.name}
      </p>

      {/* Description */}
      <p
        className={`font-body text-xs leading-relaxed
                      ${unlocked ? "text-slate-400" : "text-slate-700"}`}
      >
        {achievement.description}
      </p>

      {/* Unlock date */}
      {unlocked && achievement.unlockedAt && (
        <p className="font-body text-[10px] text-slate-600 mt-2">
          {new Date(achievement.unlockedAt).toLocaleDateString()}
        </p>
      )}

      {/* Legendary shimmer overlay */}
      {unlocked && achievement.rarity === "legendary" && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/8 via-transparent to-orange-500/8" />
        </div>
      )}
    </motion.div>
  );
}
