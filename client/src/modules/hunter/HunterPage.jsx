import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSound from "use-sound";
import CountUp from "react-countup";
import {
  Camera,
  Zap,
  TrendingUp,
  Target,
  Shield,
  Flame,
  Award,
} from "lucide-react";
import {ActivityCalendar} from "react-activity-calendar";

// Stores & Logic
import { useHunterStore } from "../../stores/hunterStore.js";
import { STAT_LABELS, STAT_COLORS, STAT_ICONS } from "../../lib/xpFormulas.js";
import { pageVariants } from "../../lib/animations.js";
import api from "../../lib/api.js";

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

const RANK_INSIGNIAS = {
  Unawakened:
    "https://res.cloudinary.com/di5reah7g/image/upload/v1784732149/F_Rank_gzgzmy.png",
  E: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732086/E_Rank_ljcatr.png",
  D: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732086/D_Rank_ofo1x0.png",
  C: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732086/C_Rank_cjbn89.png",
  B: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732086/B_Rank_yce5fe.png",
  A: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732085/A_Rank_c0pwnx.png",
  S: "https://res.cloudinary.com/di5reah7g/image/upload/v1784732085/S_Rank_ursozu.png",
  National:
    "https://res.cloudinary.com/di5reah7g/image/upload/v1784733748/National_Rank_btbfmm.png",
  Monarch:
    "https://res.cloudinary.com/di5reah7g/image/upload/v1784733748/Monarch_Rank_soykht.png",
  "Shadow Monarch":
    "https://res.cloudinary.com/di5reah7g/image/upload/v1784733748/Shadow_Monarch_Rank_quuouq.png",
};

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
  const { hunter, stats, user, setHunter, setUser } = useHunterStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [isUploading, setIsUploading] = useState(false);

  const {
    hunter: storeHunter,
    stats: storeStats,
    setHunter,
    setStats,
  } = useHunterStore();

  const [playClick] = useSound("/sounds/click.mp3", { volume: 0.1 });

  if (!hunter || !user) return null;

  // Add a dedicated query that runs if the store is empty
  const { data: profile, isLoading } = useQuery({
    queryKey: ["hunter-full-profile"],
    queryFn: async () => {
      const { data } = await api.get("/hunter/me");
      // Sync with store if it's empty
      if (!storeHunter) {
        setHunter(data.data.hunter);
        setStats(data.data.stats);
      }
      return data.data;
    },
    enabled: true,
  });

  const hunter = profile?.hunter || storeHunter;
  const stats = profile?.stats || storeStats;

  if (isLoading && !hunter) return <PageLoader />;

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    const { data: profileData, isLoading } = useQuery({
      queryKey: ["hunter-profile"],
      queryFn: async () => {
        const { data } = await api.get("/hunter/me");
        return data.data;
      },
      enabled: !hunter, // Only run if store is empty
    });

    try {
      const { data } = await api.patch("/users/me/avatar", formData);

      // Update store safely
      if (user) {
        setUser({ ...user, avatar: data.data.avatar });
      }

      // Optional: Force a small delay to let Cloudinary propagate
      setTimeout(() => setIsUploading(false), 1000);
    } catch (err) {
      setIsUploading(false);
      console.error(
        "Upload failed:",
        err.response?.data?.message || err.message,
      );
      alert("System Error: Check Cloudinary credentials in backend .env");
    }
  };

  const logs = [
    { text: "System Interface Online.", type: "system" },
    {
      text: `Hunter: ${hunter.hunterName} | Rank: ${hunter.rank}`,
      type: "system",
    },
    { text: "Synchronizing daily progress...", type: "gain" },
  ];

  return (
    <div className="relative min-h-screen pb-20 overflow-hidden">
      <RankAura rank={hunter.rank} />

      <div className="relative z-10 max-w-7xl mx-auto p-4 lg:p-8">
        {/* HUD TOP HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-slate-900/80 p-4 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-cyan-500 font-black tracking-[0.2em] uppercase">
                Status
              </span>
              <span className="text-2xl font-black italic text-white leading-none tracking-tighter">
                LVL.{hunter.level}
              </span>
            </div>
            <div className="h-10 w-px bg-slate-700/50" />
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Active Title
              </div>
              <div className="text-sm text-cyan-100 font-heading tracking-wide italic">
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

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <>
                <div className="lg:col-span-4 space-y-6">
                  <TiltCard>
                    <div className="glass-cyan p-0 rounded-3xl border border-white/10 overflow-hidden bg-slate-950 shadow-2xl">
                      {/* Interactive Avatar Area */}
                      <div className="relative h-60 bg-gradient-to-t from-slate-950 to-cyan-900/40">
                        <img
                          src={
                            user?.avatar?.url ||
                            "https://res.cloudinary.com/demo/image/upload/v1631711732/avatar-placeholder.png"
                          }
                          alt="Hunter Avatar"
                          className={`w-full h-full object-cover transition-all duration-700 ${isUploading ? "opacity-30 blur-sm" : "hover:scale-110"}`}
                          onError={(e) => {
                            e.target.src =
                              "https://res.cloudinary.com/demo/image/upload/v1631711732/avatar-placeholder.png";
                          }}
                        />

                        <label className="absolute bottom-4 right-4 p-3 bg-black/70 rounded-full cursor-pointer hover:bg-cyan-600 transition-all border border-white/20 group">
                          {isUploading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Camera
                              size={18}
                              className="text-white group-hover:scale-110"
                            />
                          )}
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleAvatarUpload}
                            disabled={isUploading}
                            accept="image/*"
                          />
                        </label>

                        {/* Rank Badge Placement */}
                        <div className="absolute -bottom-10 left-8">
                          <div className="w-24 h-24 rounded-2xl bg-slate-900 border-4 border-slate-950 shadow-glow-cyan flex items-center justify-center overflow-hidden p-2">
                            <img
                              src={
                                RANK_INSIGNIAS[hunter.rank] ||
                                "https://res.cloudinary.com/di5reah7g/image/upload/v1784732149/F_Rank_gzgzmy.png"
                              }
                              alt="Rank"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-14 pb-8 px-8">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                          {hunter.hunterName}{" "}
                          <Zap
                            size={18}
                            className="text-cyan-400 fill-cyan-400"
                          />
                        </h2>
                        <p className="text-[10px] text-slate-500 font-mono mb-6 uppercase tracking-widest">
                          System_ID: {hunter._id.slice(-10)}
                        </p>
                        <XPBar hunter={hunter} />
                      </div>
                    </div>
                  </TiltCard>
                  <SystemLog events={logs} />
                </div>

                <div className="lg:col-span-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SummaryCard
                      label="Power Score"
                      value={hunter.powerScore}
                      icon={<Shield size={16} />}
                      color="text-cyan-400"
                    />
                    <SummaryCard
                      label="Hunter Standing"
                      value={`Top ${hunter.percentile || 1}%`}
                      icon={<Award size={16} />}
                      color="text-yellow-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/60 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                          <TrendingUp size={20} />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-200">
                          Focus Stats
                        </h4>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-xs text-slate-500 font-bold uppercase">
                            Total Mana Focus
                          </span>
                          <span className="text-sm font-display text-white">
                            {Math.floor(hunter.totalFocusMinutes / 60)}h{" "}
                            {hunter.totalFocusMinutes % 60}m
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-slate-500 font-bold uppercase">
                            Consistency Rating
                          </span>
                          <span className="text-sm font-display text-green-400">
                            92%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-900 to-cyan-950/30 p-6 rounded-2xl border border-cyan-500/20">
                      <div className="flex items-center gap-3 mb-4 text-cyan-400">
                        <Flame size={20} />
                        <h4 className="text-xs font-black uppercase tracking-widest">
                          Next Evolution
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed italic">
                        "The System requires 15 more consecutive Daily Quests to
                        unlock the next rank assessment."
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* STATS TAB */}
            {activeTab === "stats" && (
              <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="lg:col-span-2 bg-slate-900/40">
                  <SectionHeader
                    title="Growth History"
                    label="Activity Calendar"
                  />
                  <div className="flex justify-center py-6 overflow-x-auto">
                    <ActivityCalendar
                      data={[{ date: "2024-01-01", count: 1, level: 1 }]}
                      theme={{
                        dark: [
                          "#1e293b",
                          "#0e7490",
                          "#0891b2",
                          "#06b6d4",
                          "#22d3ee",
                        ],
                      }}
                    />
                  </div>
                </Card>
                <Card className="bg-slate-900/60 backdrop-blur-md">
                  <SectionHeader title="Mana Distribution" label="Radar Map" />
                  <PowerRadar stats={stats} />
                </Card>
                <Card className="bg-slate-900/60 backdrop-blur-md">
                  <SectionHeader title="Attributes" label="Soul Stats" />
                  <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {ALL_STATS.map((key) => (
                      <div key={key}>
                        <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                          <span className="text-slate-400">
                            {STAT_ICONS[key]} {STAT_LABELS[key]}
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
              <div className="lg:col-span-12 space-y-8">
                <SectionHeader
                  title="The Hall of Records"
                  label="Achievements Unlocked"
                />
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {hunter.achievements?.map((a) => (
                    <div
                      key={a.id}
                      className="p-6 rounded-2xl border border-white/5 bg-slate-900/40 text-center hover:scale-105 transition-all"
                    >
                      <div className="text-4xl mb-3">{a.icon || "🏆"}</div>
                      <div className="text-[10px] font-black uppercase text-white truncate mb-1">
                        {a.name}
                      </div>
                      <div className="text-[8px] text-slate-500 font-bold tracking-widest uppercase">
                        {a.rarity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }) {
  return (
    <div className="bg-slate-900/60 border border-white/5 p-8 rounded-3xl backdrop-blur-md relative group hover:border-cyan-500/20 transition-all">
      <div
        className={`absolute top-4 right-4 opacity-20 group-hover:opacity-100 transition-opacity ${color}`}
      >
        {icon}
      </div>
      <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
        {label}
      </h4>
      <p className={`text-5xl font-display font-bold ${color}`}>
        {typeof value === "number" ? <CountUp end={value} /> : value}
      </p>
    </div>
  );
}
