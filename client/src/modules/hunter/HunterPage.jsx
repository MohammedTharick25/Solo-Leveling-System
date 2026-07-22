import { useState } from "react";
import { motion } from "framer-motion";
import useSound from "use-sound";
import CountUp from "react-countup";

// Stores & Logic
import { useHunterStore } from "../../stores/hunterStore.js";
import { STAT_LABELS, STAT_COLORS, STAT_ICONS } from "../../lib/xpFormulas.js";
import { pageVariants } from "../../lib/animations.js";

// Custom UI Components
import { RankAura } from "../../components/ui/RankAura.jsx";
import {
  TiltCard,
  PowerRadar,
  SystemLog,
} from "../../components/ui/HunterVisuals.jsx";
import {
  RankBadge,
  StatBar,
  SectionHeader,
  Card,
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
  const { hunter, stats } = useHunterStore();
  const [activeTab, setActiveTab] = useState("overview");

  // NOTE: Ensure you have a click.mp3 in public/sounds/
  const [playClick] = useSound("/sounds/click.mp3", { volume: 0.1 });

  if (!hunter) return null;

  const logs = [
    { text: "Neural synchronization complete.", type: "system" },
    { text: `Hunter identified: ${hunter.hunterName}`, type: "system" },
    { text: "Mana circuits stabilized.", type: "system" },
    { text: `Current Status: ${hunter.rank} Rank`, type: "gain" },
  ];

  return (
    <div className="relative min-h-screen pb-20">
      <RankAura rank={hunter.rank} />

      <div className="relative z-10 max-w-7xl mx-auto p-4 lg:p-8">
        {/* TOP HUD BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-slate-900/80 p-4 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-cyan-500 font-bold tracking-widest uppercase">
                Level
              </span>
              <span className="text-2xl font-black italic text-white leading-none">
                <CountUp end={hunter.level} />
              </span>
            </div>
            <div className="h-10 w-px bg-slate-700/50" />
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Active Title
              </div>
              <div className="text-sm text-cyan-100 font-heading">
                {hunter.title}
              </div>
            </div>
          </div>

          <div className="flex bg-black/40 p-1 rounded-xl border border-slate-800">
            {["overview", "stats", "records"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  playClick();
                  setActiveTab(tab);
                }}
                className={`px-4 lg:px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab
                    ? "bg-cyan-600 text-white shadow-glow-cyan-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <motion.div
          key={activeTab}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-6">
                <TiltCard>
                  <div className="glass-cyan p-8 rounded-3xl border border-cyan-500/20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 text-4xl opacity-10 font-black italic">
                      {hunter.rank[0]}
                    </div>
                    <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl shadow-glow-cyan">
                      {hunter.hunterName[0].toUpperCase()}
                    </div>
                    <h2 className="text-2xl font-display font-bold text-white mb-2 tracking-tight">
                      {hunter.hunterName}
                    </h2>
                    <RankBadge rank={hunter.rank} />
                    <div className="mt-8">
                      <XPBar hunter={hunter} />
                    </div>
                  </div>
                </TiltCard>
                <SystemLog events={logs} />
              </div>

              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
                <SummaryCard
                  label="Power Score"
                  value={<CountUp end={hunter.powerScore} />}
                  desc="Combined combat effectiveness"
                />
                <SummaryCard
                  label="Global Percentile"
                  value={`Top ${hunter.percentile || 1}%`}
                  desc="Standing among all hunters"
                />
                <SummaryCard
                  label="Quest Mastery"
                  value={hunter.totalQuestCompletions}
                  desc="Total successful missions"
                />
                <SummaryCard
                  label="Active Streak"
                  value={`${hunter.currentStreak} Days`}
                  desc="Bonus multiplier active"
                />
              </div>
            </div>
          )}

          {/* STATS TAB */}
          {activeTab === "stats" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-slate-900/60 backdrop-blur-md">
                <SectionHeader
                  title="Ability Radar"
                  label="Mana Distribution"
                />
                <PowerRadar stats={stats} />
              </Card>
              <Card className="bg-slate-900/60 backdrop-blur-md">
                <SectionHeader
                  title="Physical & Mental Attributes"
                  label="Soul Stats"
                />
                <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {ALL_STATS.map((key) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold uppercase">
                        <span className="text-slate-400 flex items-center gap-2">
                          <span>{STAT_ICONS[key]}</span> {STAT_LABELS[key]}
                        </span>
                        <span className="text-cyan-400">
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
              </Card>
            </div>
          )}

          {/* RECORDS TAB */}
          {activeTab === "records" && (
            <div className="space-y-8">
              <SectionHeader
                title="Hall of Records"
                label="Achievements Unlocked"
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {hunter.achievements?.length > 0 ? (
                  hunter.achievements.map((a) => (
                    <div
                      key={a.id}
                      className={`p-4 rounded-xl border text-center transition-all hover:scale-105 bg-slate-900/40 ${a.rarity === "legendary" ? "border-yellow-500/50 shadow-glow-yellow-sm" : "border-slate-800"}`}
                    >
                      <div className="text-3xl mb-2">{a.icon || "🏆"}</div>
                      <div className="text-[10px] font-black uppercase text-white truncate">
                        {a.name}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-1 uppercase tracking-tighter">
                        {a.rarity}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center text-slate-600 font-display italic">
                    No records found in the system archives.
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// Helper component for Overview cards
function SummaryCard({ label, value, desc }) {
  return (
    <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-sm">
      <h4 className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
        {label}
      </h4>
      <p className="text-4xl font-display font-bold text-white mb-2">{value}</p>
      <p className="text-slate-500 text-xs tracking-tight">{desc}</p>
    </div>
  );
}
