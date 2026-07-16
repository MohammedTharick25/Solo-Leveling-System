import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Ghost, Lock } from "lucide-react";
import api from "../../lib/api.js";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";
import {
  SectionHeader,
  EmptyState,
  Badge,
} from "../../components/ui/PageLoader.jsx";

const SHADOW_TYPE_INFO = {
  discipline: {
    emoji: "🛡️",
    color: "from-purple-600/30 to-purple-900/30",
    border: "border-purple-500/40",
  },
  focus: {
    emoji: "👁️",
    color: "from-cyan-600/30 to-cyan-900/30",
    border: "border-cyan-500/40",
  },
  knowledge: {
    emoji: "📚",
    color: "from-indigo-600/30 to-indigo-900/30",
    border: "border-indigo-500/40",
  },
  health: {
    emoji: "❤️",
    color: "from-emerald-600/30 to-emerald-900/30",
    border: "border-emerald-500/40",
  },
  consistency: {
    emoji: "🔁",
    color: "from-blue-600/30 to-blue-900/30",
    border: "border-blue-500/40",
  },
  communication: {
    emoji: "💬",
    color: "from-pink-600/30 to-pink-900/30",
    border: "border-pink-500/40",
  },
  leadership: {
    emoji: "👑",
    color: "from-red-600/30 to-red-900/30",
    border: "border-red-500/40",
  },
  creativity: {
    emoji: "✨",
    color: "from-fuchsia-600/30 to-fuchsia-900/30",
    border: "border-fuchsia-500/40",
  },
  finance: {
    emoji: "💰",
    color: "from-yellow-600/30 to-yellow-900/30",
    border: "border-yellow-500/40",
  },
  problemSolving: {
    emoji: "🧩",
    color: "from-sky-600/30 to-sky-900/30",
    border: "border-sky-500/40",
  },
  emotionalControl: {
    emoji: "🧘",
    color: "from-orange-600/30 to-orange-900/30",
    border: "border-orange-500/40",
  },
  timeManagement: {
    emoji: "⏱️",
    color: "from-teal-600/30 to-teal-900/30",
    border: "border-teal-500/40",
  },
};

const ALL_SHADOW_TYPES = Object.keys(SHADOW_TYPE_INFO);

const EVOLUTION_THRESHOLDS = {
  Initiate: 0,
  Elite: 500,
  Commander: 2000,
  Monarch: 6000,
};
const EVOLUTION_NEXT = {
  Initiate: "Elite",
  Elite: "Commander",
  Commander: "Monarch",
  Monarch: null,
};

export default function ShadowsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["shadows"],
    queryFn: async () => {
      const { data } = await api.get("/shadows");
      return data.data;
    },
  });

  const shadows = data?.shadows || [];
  const unlockedTypes = new Set(shadows.map((s) => s.type));

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="mb-8">
        <p className="text-system mb-1">The Abyss</p>
        <h1 className="font-heading font-bold text-2xl text-slate-100">
          Shadow Army
        </h1>
        <p className="font-body text-sm text-slate-500 mt-1">
          {shadows.length} of {ALL_SHADOW_TYPES.length} shadows extracted
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton h-56 rounded-2xl" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {ALL_SHADOW_TYPES.map((type) => {
            const shadow = shadows.find((s) => s.type === type);
            const info = SHADOW_TYPE_INFO[type];
            return shadow ? (
              <ShadowCard key={type} shadow={shadow} info={info} />
            ) : (
              <LockedShadowCard key={type} type={type} info={info} />
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}

function ShadowCard({ shadow, info }) {
  const nextStage = EVOLUTION_NEXT[shadow.evolutionStage];
  const currentThreshold = EVOLUTION_THRESHOLDS[shadow.evolutionStage];
  const nextThreshold = nextStage ? EVOLUTION_THRESHOLDS[nextStage] : null;
  const progress = nextThreshold
    ? ((shadow.xp - currentThreshold) / (nextThreshold - currentThreshold)) *
      100
    : 100;

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -4 }}
      className={`relative rounded-2xl p-5 bg-gradient-to-br ${info.color}
                  border ${info.border} overflow-hidden`}
    >
      {/* Glow particle effect */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-current opacity-10 rounded-full blur-2xl" />

      <div className="relative text-center">
        <div
          className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-950/40 border border-white/10
                        flex items-center justify-center text-3xl animate-float"
        >
          {info.emoji}
        </div>

        <h4 className="font-display text-sm font-bold text-slate-100 mb-1">
          {shadow.name}
        </h4>

        <Badge color="purple" className="mb-3">
          {shadow.evolutionStage.toUpperCase()}
        </Badge>

        <div className="text-left">
          <div className="flex justify-between items-center mb-1">
            <span className="text-hud text-[9px]">XP</span>
            <span className="font-display text-[10px] text-slate-300">
              {shadow.xp}
              {nextThreshold ? `/${nextThreshold}` : " (MAX)"}
            </span>
          </div>
          <div className="h-1 bg-slate-900/60 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>

        {shadow.bonuses?.length > 0 && (
          <p className="font-body text-[10px] text-slate-400 mt-3 leading-relaxed">
            {shadow.bonuses[0].description}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function LockedShadowCard({ type, info }) {
  return (
    <motion.div
      variants={staggerItem}
      className="relative rounded-2xl p-5 bg-slate-900/40 border border-slate-800/60
                 flex flex-col items-center justify-center text-center min-h-[220px]"
    >
      <div
        className="w-16 h-16 rounded-2xl bg-slate-800/40 border border-slate-700/40
                      flex items-center justify-center mb-3"
      >
        <Lock size={20} className="text-slate-600" />
      </div>
      <p className="font-heading text-sm font-semibold text-slate-600 mb-1">
        Unidentified Shadow
      </p>
      <p className="font-body text-[10px] text-slate-700 uppercase tracking-wider">
        {type} type
      </p>
    </motion.div>
  );
}
