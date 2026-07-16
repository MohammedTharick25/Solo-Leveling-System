import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, Shield, CheckCircle2, Trophy } from "lucide-react";
import api from "../../lib/api.js";
import { useAudio } from "../../hooks/useAudio.js";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";
import {
  SectionHeader,
  EmptyState,
  Button,
  Badge,
} from "../../components/ui/PageLoader.jsx";

export default function BossesPage() {
  const queryClient = useQueryClient();
  const { playQuestComplete } = useAudio();

  const { data: activeData, isLoading } = useQuery({
    queryKey: ["boss"],
    queryFn: async () => {
      const { data } = await api.get("/bosses/active");
      return data.data;
    },
  });

  const { data: defeatedData } = useQuery({
    queryKey: ["bosses-defeated"],
    queryFn: async () => {
      const { data } = await api.get("/bosses/defeated");
      return data.data;
    },
  });

  const challengeMutation = useMutation({
    mutationFn: ({ bossId, challengeId }) =>
      api.patch(`/bosses/${bossId}/challenges/${challengeId}/complete`),
    onSuccess: (res) => {
      if (res.data.data.defeated) playQuestComplete();
      queryClient.invalidateQueries({ queryKey: ["boss"] });
      queryClient.invalidateQueries({ queryKey: ["bosses-defeated"] });
      queryClient.invalidateQueries({ queryKey: ["hunter"] });
    },
  });

  const boss = activeData?.boss;
  const defeated = defeatedData?.bosses || [];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="mb-8">
        <p className="text-system mb-1">Raid Gate</p>
        <h1 className="font-heading font-bold text-2xl text-slate-100">
          Boss Battles
        </h1>
        <p className="font-body text-sm text-slate-500 mt-1">
          Bosses emerge from your failures. Defeat them to claim rare rewards.
        </p>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-8"
      >
        {/* Active boss */}
        <motion.div variants={staggerItem}>
          <SectionHeader label="Active Threat" title="Current Boss" />
          {isLoading ? (
            <div className="skeleton h-64 rounded-2xl" />
          ) : !boss ? (
            <EmptyState
              icon={Shield}
              title="No active bosses"
              description="The System is monitoring your behaviour. Stay consistent to keep bosses away."
            />
          ) : (
            <ActiveBossCard
              boss={boss}
              onChallengeComplete={(challengeId) =>
                challengeMutation.mutate({ bossId: boss._id, challengeId })
              }
              completing={challengeMutation.isPending}
            />
          )}
        </motion.div>

        {/* Defeated bosses */}
        {defeated.length > 0 && (
          <motion.div variants={staggerItem}>
            <SectionHeader label="Hall of Conquest" title="Defeated Bosses" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {defeated.map((b) => (
                <DefeatedBossCard key={b._id} boss={b} />
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function ActiveBossCard({ boss, onChallengeComplete, completing }) {
  const hpPercent = (boss.currentHp / boss.hp) * 100;
  const completedCount = boss.challenges.filter((c) => c.completed).length;

  return (
    <div className="glass rounded-2xl border border-red-500/30 overflow-hidden">
      {/* Boss header */}
      <div className="relative p-6 bg-gradient-to-r from-red-950/50 to-slate-900/50 border-b border-red-500/20">
        <div className="absolute inset-0 bg-radial-glow opacity-30 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <Badge color="red" className="mb-2">
              ⚠️ BOSS THREAT
            </Badge>
            <h3 className="font-display text-xl font-black text-red-300 mb-1">
              {boss.name}
            </h3>
            <p className="font-body text-sm text-slate-400">
              {boss.description}
            </p>
          </div>
          <div
            className="w-16 h-16 rounded-2xl bg-red-900/30 border border-red-500/30
                          flex items-center justify-center text-3xl shrink-0 animate-float"
          >
            💀
          </div>
        </div>

        {/* HP bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-hud">Boss HP</span>
            <span className="font-display text-sm text-red-400">
              {boss.currentHp}%
            </span>
          </div>
          <div className="h-3 bg-slate-900/60 rounded-full overflow-hidden border border-red-900/40">
            <motion.div
              className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
              initial={{ width: "100%" }}
              animate={{ width: `${hpPercent}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <p className="font-body text-xs text-slate-500 mt-1">
            {completedCount}/{boss.challenges.length} challenges completed
          </p>
        </div>
      </div>

      {/* Challenges */}
      <div className="p-6">
        <p className="text-system mb-4">Challenge Chain</p>
        <div className="space-y-3">
          {boss.challenges.map((challenge, i) => (
            <ChallengeRow
              key={challenge._id}
              challenge={challenge}
              index={i}
              onComplete={() => onChallengeComplete(challenge._id)}
              completing={completing}
            />
          ))}
        </div>

        <div className="mt-5 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
          <p className="font-heading text-xs text-yellow-400 font-semibold mb-1">
            Rewards upon defeat
          </p>
          <p className="font-body text-xs text-slate-400">
            +{boss.xpReward} XP · Title: "{boss.titleReward}"
          </p>
        </div>
      </div>
    </div>
  );
}

function ChallengeRow({ challenge, index, onComplete, completing }) {
  return (
    <motion.div
      layout
      className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-300
                  ${
                    challenge.completed
                      ? "bg-emerald-500/5 border-emerald-500/20 opacity-60"
                      : "bg-slate-800/30 border-slate-700/40"
                  }`}
    >
      <div
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0
                        ${
                          challenge.completed
                            ? "bg-emerald-500/20 border-emerald-500"
                            : "border-slate-600"
                        }`}
      >
        {challenge.completed ? (
          <CheckCircle2 size={14} className="text-emerald-400" />
        ) : (
          <span className="font-display text-[10px] text-slate-500">
            {index + 1}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`font-heading text-sm font-semibold mb-0.5
                        ${challenge.completed ? "text-slate-500 line-through" : "text-slate-200"}`}
        >
          {challenge.title}
        </p>
        {challenge.description && (
          <p className="font-body text-xs text-slate-500">
            {challenge.description}
          </p>
        )}
        <p className="font-display text-xs text-yellow-400 mt-1">
          +{challenge.xpReward} XP
        </p>
      </div>

      {!challenge.completed && (
        <Button
          size="sm"
          variant="danger"
          loading={completing}
          onClick={onComplete}
        >
          Done
        </Button>
      )}
    </motion.div>
  );
}

function DefeatedBossCard({ boss }) {
  return (
    <div className="glass rounded-xl p-5 border border-slate-700/40">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20
                        flex items-center justify-center text-xl shrink-0"
        >
          💀
        </div>
        <div>
          <h4 className="font-heading font-bold text-sm text-slate-200 mb-0.5">
            {boss.name}
          </h4>
          <p className="font-body text-xs text-slate-500">
            Defeated {new Date(boss.defeatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      {boss.titleReward && (
        <div className="flex items-center gap-1.5">
          <Trophy size={12} className="text-yellow-400" />
          <span className="font-heading text-xs text-yellow-400">
            "{boss.titleReward}"
          </span>
        </div>
      )}
    </div>
  );
}
