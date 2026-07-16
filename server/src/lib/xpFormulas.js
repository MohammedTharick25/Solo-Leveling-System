export const RANK_THRESHOLDS = {
  Unawakened: 0,
  E: 500,
  D: 2_000,
  C: 6_000,
  B: 15_000,
  A: 35_000,
  S: 80_000,
  National: 180_000,
  Monarch: 400_000,
  "Shadow Monarch": 1_000_000,
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

export const DIFFICULTY_MULTIPLIERS = {
  F: 0.5,
  E: 0.8,
  D: 1.0,
  C: 1.3,
  B: 1.6,
  A: 2.0,
  S: 3.0,
};

/**
 * XP required to advance from level N to level N+1.
 * Quadratic: 100 × level^1.8
 */
export const xpRequiredForLevel = (level) =>
  Math.floor(100 * Math.pow(level, 1.8));

/**
 * Total cumulative XP to reach a given level from level 1.
 */
export const totalXPForLevel = (targetLevel) => {
  let total = 0;
  for (let i = 1; i < targetLevel; i++) total += xpRequiredForLevel(i);
  return total;
};

/**
 * Given a total XP amount, compute what level a hunter is at.
 */
export const computeLevel = (totalXP) => {
  let level = 1;
  let spent = 0;
  while (true) {
    const needed = xpRequiredForLevel(level);
    if (spent + needed > totalXP) break;
    spent += needed;
    level++;
    if (level > 9999) break;
  }
  return level;
};

/**
 * XP left in the current level (for progress bar).
 */
export const currentLevelXP = (totalXP) => {
  const level = computeLevel(totalXP);
  return totalXP - totalXPForLevel(level);
};

/**
 * Compute rank from total XP.
 */
export const computeRank = (totalXP) => {
  let rank = "Unawakened";
  for (const r of RANKS_ORDERED) {
    if (totalXP >= RANK_THRESHOLDS[r]) rank = r;
    else break;
  }
  return rank;
};

/**
 * Compute rank from level (alternate path).
 */
export const computeRankFromLevel = (level) => {
  if (level >= 100) return "Shadow Monarch";
  if (level >= 80) return "Monarch";
  if (level >= 60) return "National";
  if (level >= 45) return "S";
  if (level >= 30) return "A";
  if (level >= 20) return "B";
  if (level >= 12) return "C";
  if (level >= 6) return "D";
  if (level >= 2) return "E";
  return "Unawakened";
};

/**
 * Quest XP reward scaled by hunter level and difficulty.
 */
export const questXPReward = (baseXP, hunterLevel, difficulty = "D") => {
  const levelBonus = 1 + (hunterLevel - 1) * 0.02;
  const diffMult = DIFFICULTY_MULTIPLIERS[difficulty] ?? 1.0;
  return Math.floor(baseXP * levelBonus * diffMult);
};

/**
 * Focus session XP: base 10 XP per minute for pomodoro, scaled by completion.
 */
export const focusSessionXP = (plannedMinutes, actualMinutes, completed) => {
  const completionRatio = Math.min(actualMinutes / plannedMinutes, 1);
  const base = Math.floor(actualMinutes * 0.5);
  const bonus = completed ? Math.floor(plannedMinutes * 0.3) : 0;
  return Math.floor(base * completionRatio + bonus);
};

/**
 * Power Score: weighted average of life stats × level multiplier.
 */
export const computePowerScore = (stats, level) => {
  const weights = {
    discipline: 1.5,
    sense: 1.3,
    intelligence: 1.2,
    vitality: 1.1,
    timeManagement: 1.1,
    emotionalControl: 1.0,
    problemSolving: 1.0,
    agility: 0.9,
    communication: 0.9,
    strength: 0.8,
    leadership: 0.8,
    creativity: 0.7,
    financialIntelligence: 0.7,
  };
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let weightedSum = 0;
  for (const [stat, w] of Object.entries(weights)) {
    weightedSum += (stats[stat]?.value ?? 0) * w;
  }
  const baseScore = weightedSum / totalWeight;
  return Math.floor(baseScore * (1 + level * 0.005));
};

/**
 * Streak bonus XP multiplier.
 */
export const streakMultiplier = (streakDays) => {
  if (streakDays >= 30) return 1.5;
  if (streakDays >= 14) return 1.3;
  if (streakDays >= 7) return 1.15;
  if (streakDays >= 3) return 1.05;
  return 1.0;
};

/**
 * Project future stats given current pace.
 */
export const projectFutureSelf = (hunter, stats, daysAhead) => {
  const dailyXPAverage =
    hunter.totalXP /
    Math.max(
      Math.ceil((Date.now() - new Date(hunter.createdAt).getTime()) / 86400000),
      1,
    );
  const projectedTotalXP = hunter.totalXP + dailyXPAverage * daysAhead;
  const projectedLevel = computeLevel(projectedTotalXP);
  const projectedRank = computeRank(projectedTotalXP);

  return {
    daysAhead,
    projectedTotalXP: Math.floor(projectedTotalXP),
    projectedLevel,
    projectedRank,
    dailyXPAverage: Math.floor(dailyXPAverage),
  };
};
