import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
} from "lucide-react";
import api from "../../lib/api.js";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";
import { SectionHeader, Card, Badge } from "../../components/ui/PageLoader.jsx";
import { STAT_LABELS, STAT_COLORS } from "../../lib/xpFormulas.js";

const TT_STYLE = {
  contentStyle: {
    backgroundColor: "#0f172a",
    border: "1px solid rgba(51,65,85,0.5)",
    borderRadius: "8px",
    fontSize: "11px",
  },
  labelStyle: { color: "#94a3b8", fontFamily: "Rajdhani,sans-serif" },
};

// ── Productivity Pattern Detection ────────────────────────────────────────────
function detectPatterns(snapshots) {
  if (!snapshots || snapshots.length < 3) return null;

  // Best day of week
  const byDay = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const daySnaps = snapshots.filter((s) => new Date(s.date).getDay() === i);
    const avg = daySnaps.length
      ? daySnaps.reduce((a, b) => a + (b.productivityScore || 0), 0) /
        daySnaps.length
      : 0;
    return {
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i],
      avg: Math.floor(avg),
    };
  });
  const bestDay = [...byDay].sort((a, b) => b.avg - a.avg)[0];
  const worstDay = [...byDay].sort((a, b) => a.avg - b.avg)[0];

  // Trend: compare last 7 vs previous 7
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );
  const last7 = sorted.slice(-7);
  const prev7 = sorted.slice(-14, -7);
  const avgLast =
    last7.reduce((a, b) => a + (b.productivityScore || 0), 0) /
    Math.max(last7.length, 1);
  const avgPrev =
    prev7.reduce((a, b) => a + (b.productivityScore || 0), 0) /
    Math.max(prev7.length, 1);
  const trendDiff = Math.floor(avgLast - avgPrev);

  // Best focus day (most focus minutes)
  const bestFocusDay = [
    ...byDay.map((d, i) => ({
      ...d,
      focusAvg: Math.floor(
        snapshots
          .filter((s) => new Date(s.date).getDay() === i)
          .reduce((a, b) => a + (b.focusMinutes || 0), 0) /
          Math.max(
            snapshots.filter((s) => new Date(s.date).getDay() === i).length,
            1,
          ),
      ),
    })),
  ].sort((a, b) => b.focusAvg - a.focusAvg)[0];

  // Journal consistency
  const journalDays = snapshots.filter((s) => s.journalWritten).length;
  const journalPct = Math.floor((journalDays / snapshots.length) * 100);

  return { bestDay, worstDay, trendDiff, bestFocusDay, journalPct, byDay };
}

export default function AnalyticsPage() {
  const [statHistoryStat, setStatHistoryStat] = useState("discipline");
  const currentYear = new Date().getFullYear();

  const { data: dashData, isLoading } = useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/analytics/dashboard");
      return data.data;
    },
  });
  const { data: trendsData } = useQuery({
    queryKey: ["analytics-trends"],
    queryFn: async () => {
      const { data } = await api.get("/analytics/trends");
      return data.data;
    },
  });
  const { data: heatmapData } = useQuery({
    queryKey: ["analytics-heatmap", currentYear],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/heatmap?year=${currentYear}`);
      return data.data;
    },
  });
  const { data: predData } = useQuery({
    queryKey: ["analytics-predictions"],
    queryFn: async () => {
      const { data } = await api.get("/analytics/predictions");
      return data.data;
    },
  });
  const { data: statHistoryData } = useQuery({
    queryKey: ["stat-history", statHistoryStat],
    queryFn: async () => {
      const { data } = await api.get(
        `/stats/history/${statHistoryStat}?days=30`,
      );
      return data.data;
    },
  });

  const snapshots = dashData?.snapshots || [];
  const stats = dashData?.stats;
  const trends = trendsData?.trends;
  const patterns = detectPatterns(snapshots);

  const xpChartData = snapshots.slice(-14).map((s) => ({
    date: new Date(s.date).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    }),
    xp: s.xpEarned,
    focus: s.focusMinutes,
    score: s.productivityScore,
  }));

  const radarData = stats
    ? [
        "strength",
        "agility",
        "intelligence",
        "vitality",
        "sense",
        "discipline",
        "communication",
      ].map((k) => ({
        subject: STAT_LABELS[k]?.slice(0, 6) || k,
        value: stats[k]?.value || 0,
      }))
    : [];

  // Stat history chart data
  const statHistory = (statHistoryData?.history || []).slice(-30).map((h) => ({
    date: new Date(h.date).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    }),
    value: h.value,
  }));

  const trendIcon = (key) => {
    if (!trends) return <Minus size={14} className="text-slate-500" />;
    const diff = (trends.thisWeek?.[key] || 0) - (trends.lastWeek?.[key] || 0);
    if (diff > 2) return <TrendingUp size={14} className="text-emerald-400" />;
    if (diff < -2) return <TrendingDown size={14} className="text-red-400" />;
    return <Minus size={14} className="text-slate-500" />;
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="mb-8">
        <p className="text-system mb-1">Intelligence Hub</p>
        <h1 className="font-heading font-bold text-2xl text-slate-100">
          Analytics Center
        </h1>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        {/* ── Productivity Pattern Detection ──────────────────────────── */}
        {patterns && (
          <motion.div variants={staggerItem}>
            <SectionHeader
              label="AI Pattern Analysis"
              title="Your Productivity Patterns"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <PatternCard
                emoji="🏆"
                label="Best Day"
                value={bestDay.day}
                sub={`Avg score: ${patterns.bestDay.avg}`}
                color="text-yellow-400"
              />
              <PatternCard
                emoji="📈"
                label="Weekly Trend"
                value={
                  patterns.trendDiff >= 0
                    ? `+${patterns.trendDiff}`
                    : `${patterns.trendDiff}`
                }
                sub="vs last week"
                color={
                  patterns.trendDiff >= 0 ? "text-emerald-400" : "text-red-400"
                }
              />
              <PatternCard
                emoji="🧠"
                label="Best Focus Day"
                value={patterns.bestFocusDay.day}
                sub={`Avg ${patterns.bestFocusDay.focusAvg}m focus`}
                color="text-cyan-400"
              />
              <PatternCard
                emoji="📖"
                label="Journal Rate"
                value={`${patterns.journalPct}%`}
                sub="days with entries"
                color="text-purple-400"
              />
            </div>

            {/* Day-of-week bar chart */}
            <Card>
              <p className="text-hud mb-3">
                Average Productivity by Day of Week
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={patterns.byDay}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(51,65,85,0.4)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{
                      fill: "#64748b",
                      fontSize: 11,
                      fontFamily: "Rajdhani",
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                  />
                  <Tooltip {...TT_STYLE} />
                  <Bar
                    dataKey="avg"
                    radius={[4, 4, 0, 0]}
                    name="Avg Score"
                    fill="#22d3ee"
                    opacity={0.8}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        )}

        {/* ── Week comparison ─────────────────────────────────────────── */}
        {trends && (
          <motion.div variants={staggerItem}>
            <SectionHeader label="Performance" title="This Week vs Last Week" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Avg Productivity",
                  key: "avgProductivity",
                  suffix: "/100",
                },
                { label: "Total XP", key: "totalXP", suffix: "" },
                { label: "Quests Done", key: "totalQuests", suffix: "" },
                { label: "Avg Focus", key: "avgFocus", suffix: "m" },
              ].map(({ label, key, suffix }) => (
                <Card key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-hud">{label}</span>
                    {trendIcon(key)}
                  </div>
                  <p className="font-display text-xl font-bold text-slate-100">
                    {Math.floor(trends.thisWeek?.[key] || 0)}
                    {suffix}
                  </p>
                  <p className="font-body text-[10px] text-slate-600 mt-1">
                    Last: {Math.floor(trends.lastWeek?.[key] || 0)}
                    {suffix}
                  </p>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── 14-day XP + Focus chart ─────────────────────────────────── */}
        {xpChartData.length > 0 && (
          <motion.div variants={staggerItem}>
            <Card>
              <SectionHeader label="14-Day Trend" title="XP & Focus Minutes" />
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={xpChartData}>
                  <defs>
                    <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(51,65,85,0.4)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{
                      fill: "#64748b",
                      fontSize: 10,
                      fontFamily: "Rajdhani",
                    }}
                  />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Tooltip {...TT_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="xp"
                    stroke="#22d3ee"
                    fill="url(#xpGrad)"
                    strokeWidth={2}
                    name="XP"
                  />
                  <Area
                    type="monotone"
                    dataKey="focus"
                    stroke="#a855f7"
                    fill="url(#focusGrad)"
                    strokeWidth={2}
                    name="Focus min"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        )}

        {/* ── Stat History Chart ──────────────────────────────────────── */}
        <motion.div variants={staggerItem}>
          <Card>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <SectionHeader label="30-Day History" title="Stat Progression" />
              <select
                className="input py-1.5 text-xs w-44"
                value={statHistoryStat}
                onChange={(e) => setStatHistoryStat(e.target.value)}
              >
                {Object.entries(STAT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            {statHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={statHistory}>
                  <defs>
                    <linearGradient id="statGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={STAT_COLORS[statHistoryStat] || "#22d3ee"}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor={STAT_COLORS[statHistoryStat] || "#22d3ee"}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(51,65,85,0.4)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{
                      fill: "#64748b",
                      fontSize: 10,
                      fontFamily: "Rajdhani",
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                  />
                  <Tooltip {...TT_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={STAT_COLORS[statHistoryStat] || "#22d3ee"}
                    fill="url(#statGrad)"
                    strokeWidth={2.5}
                    name={STAT_LABELS[statHistoryStat]}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <p className="font-body text-sm text-slate-600">
                  No history yet for this stat. Keep completing quests!
                </p>
              </div>
            )}
            <p className="font-body text-xs text-slate-600 mt-2 text-right">
              Current: {stats?.[statHistoryStat]?.value || 0}/100
            </p>
          </Card>
        </motion.div>

        {/* ── Radar + Productivity bar ────────────────────────────────── */}
        <motion.div
          variants={staggerItem}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {radarData.length > 0 && (
            <Card>
              <SectionHeader label="Character" title="Stat Radar" />
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(51,65,85,0.5)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{
                      fill: "#64748b",
                      fontSize: 10,
                      fontFamily: "Rajdhani",
                    }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    name="Stats"
                    dataKey="value"
                    stroke="#22d3ee"
                    fill="#22d3ee"
                    fillOpacity={0.15}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          )}
          {xpChartData.length > 0 && (
            <Card>
              <SectionHeader label="Daily Score" title="Productivity Score" />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={xpChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(51,65,85,0.4)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{
                      fill: "#64748b",
                      fontSize: 10,
                      fontFamily: "Rajdhani",
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                  />
                  <Tooltip {...TT_STYLE} />
                  <Bar
                    dataKey="score"
                    fill="#a855f7"
                    radius={[4, 4, 0, 0]}
                    name="Score"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </motion.div>

        {/* ── Heatmap ─────────────────────────────────────────────────── */}
        {heatmapData?.heatmap?.length > 0 && (
          <motion.div variants={staggerItem}>
            <Card>
              <SectionHeader
                label={`${currentYear} Activity`}
                title="Productivity Heatmap"
              />
              <div className="overflow-x-auto pb-2">
                <Heatmap data={heatmapData.heatmap} year={currentYear} />
              </div>
              <div className="flex items-center gap-2 mt-3 justify-end">
                <span className="font-body text-[10px] text-slate-600">
                  Less
                </span>
                {[
                  "bg-slate-800/60",
                  "bg-cyan-900/60",
                  "bg-cyan-700",
                  "bg-cyan-500",
                  "bg-cyan-300",
                ].map((c, i) => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
                ))}
                <span className="font-body text-[10px] text-slate-600">
                  More
                </span>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Future projections ──────────────────────────────────────── */}
        {predData?.predictions && (
          <motion.div variants={staggerItem}>
            <Card>
              <SectionHeader
                label="Predictive Engine"
                title="Future Self Projections"
              />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {predData.predictions.map((p) => (
                  <div
                    key={p.daysAhead}
                    className="glass rounded-xl p-4 text-center"
                  >
                    <p className="text-hud mb-2">
                      {p.daysAhead < 365 ? `${p.daysAhead}d` : "1yr"}
                    </p>
                    <p className="font-display text-xl font-bold text-gradient-cyan">
                      LV.{p.projectedLevel}
                    </p>
                    <p className="font-heading text-xs text-slate-500 mt-1">
                      {p.projectedRank} Rank
                    </p>
                    <p className="font-body text-[10px] text-slate-600">
                      {p.projectedTotalXP?.toLocaleString()} XP
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function PatternCard({ emoji, label, value, sub, color }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{emoji}</span>
        <span className="text-hud">{label}</span>
      </div>
      <p className={`font-display text-xl font-bold ${color}`}>{value}</p>
      <p className="font-body text-[10px] text-slate-600 mt-0.5">{sub}</p>
    </div>
  );
}

function Heatmap({ data, year }) {
  const dataMap = Object.fromEntries(data.map((d) => [d.date, d]));
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year}-12-31`);
  const weeks = [];
  const curr = new Date(startDate);
  curr.setDate(curr.getDate() - curr.getDay());
  while (curr <= endDate) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const ds = curr.toISOString().split("T")[0];
      week.push({ date: ds, ...(dataMap[ds] || {}) });
      curr.setDate(curr.getDate() + 1);
    }
    weeks.push(week);
  }
  const getColor = (s) => {
    if (!s) return "bg-slate-800/60";
    if (s >= 80) return "bg-cyan-300";
    if (s >= 60) return "bg-cyan-500";
    if (s >= 40) return "bg-cyan-700";
    return "bg-cyan-900/60";
  };
  return (
    <div className="flex gap-1">
      {weeks.map((wk, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {wk.map((day, di) => (
            <div
              key={di}
              title={day.date + (day.score ? ` · Score: ${day.score}` : "")}
              className={`w-3 h-3 rounded-sm ${getColor(day.score)} transition-opacity hover:opacity-80 cursor-default`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
