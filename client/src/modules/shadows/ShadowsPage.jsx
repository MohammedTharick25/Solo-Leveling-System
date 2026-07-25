import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Ghost,
  Lock,
  Info,
  HelpCircle,
  Shield,
  Zap,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
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
  Modal,
  Button,
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

  const [infoModal, setInfoModal] = useState(false);
  const shadows = data?.shadows || [];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pb-12"
    >
      {/* Header & Lore Intro */}
      <div className="relative mb-10 p-6 glass-dark border-l-4 border-purple-500 rounded-r-2xl overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Ghost size={120} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-system mb-1">Monarch's Dominion</p>
            <h1 className="font-heading font-black text-3xl text-white italic tracking-tighter uppercase mb-3">
              Shadow Army
            </h1>
            <p className="font-body text-sm text-slate-400 leading-relaxed">
              Shadows are the crystallized remnants of your{" "}
              <span className="text-purple-400">Greatest Triumphs</span>. Once
              extracted, they do not fight in dungeons; they manifest as{" "}
              <span className="text-cyan-400 font-bold">
                Passive Authorities
              </span>
              that permanently augment your reality. The stronger the Shadow,
              the more the System bends to your will.
            </p>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setInfoModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/40 rounded-xl text-purple-400 hover:bg-purple-500/20 transition-all font-heading text-xs font-bold uppercase tracking-widest"
            >
              <HelpCircle size={16} /> Technical Intel
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={infoModal}
        onClose={() => setInfoModal(false)}
        title="System Intel: Shadow Mechanics"
      >
        <div className="space-y-6 font-body text-sm text-slate-300">
          <section className="space-y-2">
            <h4 className="font-heading text-cyan-400 font-bold uppercase text-xs flex items-center gap-2">
              <Zap size={14} /> Extraction (Unlocking)
            </h4>
            <p className="text-slate-400">
              Shadows are "Born" when you hit peak performance. For example, the{" "}
              <span className="text-white">Ironclad Guard</span> is extracted
              when you maintain a 7-day streak. If you haven't unlocked a
              shadow, keep pushing your daily limits.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-heading text-purple-400 font-bold uppercase text-xs flex items-center gap-2">
              <TrendingUp size={14} /> Evolution & XP
            </h4>
            <p className="text-slate-400">
              Shadows level up through your actions. If you have a{" "}
              <span className="text-white">Focus Shadow</span>, every Focus
              Session you complete awards XP to that shadow. Higher ranks (
              <span className="text-purple-300 italic">Elite, Commander</span>)
              multiply the potency of their passive buffs.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-heading text-emerald-400 font-bold uppercase text-xs flex items-center gap-2">
              <Sparkles size={14} /> Authority (Buffs)
            </h4>
            <p className="text-slate-400">
              Unlike active skills, Shadow buffs are **always on**. They
              increase your XP gain, boost stat efficiency, or improve recovery
              rates. A full army makes the climb to National Rank 50% faster.
            </p>
          </section>

          <Button
            variant="primary"
            className="w-full"
            onClick={() => setInfoModal(false)}
          >
            Close Archive
          </Button>
        </div>
      </Modal>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-2xl" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {Object.keys(SHADOW_TYPE_INFO).map((type) => {
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
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative rounded-3xl p-6 bg-gradient-to-br ${info.color} border ${info.border} overflow-hidden shadow-2xl transition-all duration-300`}
    >
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full blur-3xl" />

      <div className="relative">
        <div className="flex justify-between items-start mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-center text-4xl shadow-inner animate-float">
            {info.emoji}
          </div>
          <div className="text-right">
            <Badge color="purple" className="text-[10px] px-2 py-0.5">
              {shadow.evolutionStage.toUpperCase()}
            </Badge>
            <p
              className={`text-[10px] font-black uppercase mt-1 ${info.accent}`}
            >
              {info.buff}
            </p>
          </div>
        </div>

        <h4 className="font-heading font-black text-lg text-white mb-1 uppercase tracking-tight">
          {info.name}
        </h4>
        <p className="font-body text-[10px] text-slate-400 mb-6 leading-tight italic">
          "{info.description}"
        </p>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-slate-500 uppercase tracking-widest">
              Authority XP
            </span>
            <span className="text-slate-200">
              {shadow.xp}{" "}
              <span className="text-slate-600">/ {nextThreshold || "MAX"}</span>
            </span>
          </div>
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Shield size={12} className={info.accent} />
            <span className="text-[9px] font-heading font-bold text-slate-300 uppercase tracking-tighter">
              Current Authority Active
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function LockedShadowCard({ type, info }) {
  return (
    <motion.div
      variants={staggerItem}
      className="relative rounded-3xl p-6 bg-slate-900/40 border border-slate-800/60 border-dashed
                 flex flex-col items-center justify-center text-center min-h-[260px] group transition-all"
    >
      <div className="w-16 h-16 rounded-full bg-slate-800/40 border border-slate-700/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Lock size={24} className="text-slate-600" />
      </div>
      <p className="font-heading text-xs font-black text-slate-500 mb-1 uppercase tracking-widest">
        Extraction Available
      </p>
      <p className="font-body text-[10px] text-slate-600 px-4">
        Reach the milestone for{" "}
        <span className="text-slate-400 font-bold">{type}</span> to manifest
        this shadow.
      </p>
      <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none" />
    </motion.div>
  );
}
