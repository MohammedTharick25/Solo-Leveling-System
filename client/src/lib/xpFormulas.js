export const RANK_THRESHOLDS = {
  Unawakened: 0,
  E: 500,
  D: 2000,
  C: 6000,
  B: 15000,
  A: 35000,
  S: 80000,
  National: 180000,
  Monarch: 400000,
  "Shadow Monarch": 1000000,
};

export const RANKS_ORDERED = [
  "Unawakened",
  "E",
  "D",
  "C",
  "B",
  "A",
  "S",
  "National",
  "Monarch",
  "Shadow Monarch",
];

export const RANK_COLORS = {
  Unawakened: "text-slate-400",
  E: "text-emerald-400",
  D: "text-blue-400",
  C: "text-indigo-400",
  B: "text-purple-400",
  A: "text-yellow-400",
  S: "text-orange-400",
  National: "text-red-400",
  Monarch: "text-violet-300",
  "Shadow Monarch": "text-cyan-300",
};

export const RANK_GLOW = {
  Unawakened: "",
  E: "shadow-[0_0_12px_rgba(52,211,153,0.4)]",
  D: "shadow-[0_0_12px_rgba(96,165,250,0.4)]",
  C: "shadow-[0_0_12px_rgba(129,140,248,0.4)]",
  B: "shadow-[0_0_12px_rgba(168,85,247,0.5)]",
  A: "shadow-[0_0_12px_rgba(250,204,21,0.5)]",
  S: "shadow-[0_0_16px_rgba(251,146,60,0.6)]",
  National: "shadow-[0_0_16px_rgba(248,113,113,0.6)]",
  Monarch: "shadow-[0_0_20px_rgba(167,139,250,0.7)]",
  "Shadow Monarch": "shadow-[0_0_24px_rgba(34,211,238,0.8)]",
};

export const xpRequiredForLevel = (level) =>
  Math.floor(100 * Math.pow(level, 1.8));

export const totalXPForLevel = (targetLevel) => {
  let total = 0;
  for (let i = 1; i < targetLevel; i++) total += xpRequiredForLevel(i);
  return total;
};

export const computeLevel = (totalXP) => {
  let level = 1,
    spent = 0;
  while (true) {
    const needed = xpRequiredForLevel(level);
    if (spent + needed > totalXP) break;
    spent += needed;
    level++;
    if (level > 9999) break;
  }
  return level;
};

export const currentLevelXP = (totalXP) => {
  const level = computeLevel(totalXP);
  return totalXP - totalXPForLevel(level);
};

export const computeRank = (totalXP) => {
  let rank = "Unawakened";
  for (const r of RANKS_ORDERED) {
    if (totalXP >= RANK_THRESHOLDS[r]) rank = r;
    else break;
  }
  return rank;
};

export const formatXP = (xp) => {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`;
  if (xp >= 1_000) return `${(xp / 1_000).toFixed(1)}K`;
  return xp.toString();
};

export const STAT_LABELS = {
  strength: "Strength",
  agility: "Agility",
  intelligence: "Intelligence",
  vitality: "Vitality",
  sense: "Sense",
  discipline: "Discipline",
  communication: "Communication",
  leadership: "Leadership",
  creativity: "Creativity",
  financialIntelligence: "Finance",
  problemSolving: "Problem Solving",
  emotionalControl: "Emotional Control",
  timeManagement: "Time Management",
};

export const STAT_COLORS = {
  strength: "#22d3ee",
  agility: "#34d399",
  intelligence: "#818cf8",
  vitality: "#f472b6",
  sense: "#a78bfa",
  discipline: "#f59e0b",
  communication: "#60a5fa",
  leadership: "#f87171",
  creativity: "#c084fc",
  financialIntelligence: "#4ade80",
  problemSolving: "#38bdf8",
  emotionalControl: "#fb923c",
  timeManagement: "#e879f9",
};

export const STAT_ICONS = {
  strength: "⚔️",
  agility: "⚡",
  intelligence: "📚",
  vitality: "❤️",
  sense: "👁️",
  discipline: "🛡️",
  communication: "💬",
  leadership: "👑",
  creativity: "✨",
  financialIntelligence: "💰",
  problemSolving: "🧩",
  emotionalControl: "🧘",
  timeManagement: "⏱️",
};
