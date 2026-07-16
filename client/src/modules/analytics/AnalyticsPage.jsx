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
} from "recharts";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import api from "../../lib/api.js";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";
import { SectionHeader, Card, Badge } from "../../components/ui/PageLoader.jsx";
import { STAT_LABELS } from "../../lib/xpFormulas.js";

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#0f172a",
    border: "1px solid rgba(51,65,85,0.5)",
    borderRadius: "8px",
    fontSize: "11px",
  },
  labelStyle: { color: "#94a3b8", fontFamily: "Rajdhani, sans-serif" },
};

export default function AnalyticsPage() {
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

  const snapshots = dashData?.snapshots || [];
  const stats = dashData?.stats;
  const trends = trendsData?.trends;

  // Build chart data
  const xpChartData = snapshots.slice(-14).map((s) => ({
    date: new Date(s.date).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    }),
    xp: s.xpEarned,
    focus: s.focusMinutes,
    score: s.productivityScore,
  }));

  // Radar chart from stats
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
        {/* Week comparison */}
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

        {/* XP + Focus chart */}
        {xpChartData.length > 0 && (
          <motion.div variants={staggerItem}>
            <Card>
              <SectionHeader label="14-Day Trend" title="XP & Focus Minutes" />
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={xpChartData}>
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
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="xp"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={{ fill: "#22d3ee", r: 3 }}
                    name="XP"
                  />
                  <Line
                    type="monotone"
                    dataKey="focus"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ fill: "#a855f7", r: 3 }}
                    name="Focus min"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        )}

        {/* Radar + Productivity chart */}
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
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
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

        {/* Heatmap */}
        {heatmapData?.heatmap?.length > 0 && (
          <motion.div variants={staggerItem}>
            <Card>
              <SectionHeader
                label={`${currentYear} Activity`}
                title="Productivity Heatmap"
              />
              <div className="overflow-x-auto">
                <Heatmap data={heatmapData.heatmap} year={currentYear} />
              </div>
            </Card>
          </motion.div>
        )}

        {/* Future projections */}
        {predData?.predictions && (
          <motion.div variants={staggerItem}>
            <Card>
              <SectionHeader
                label="Predictive Engine"
                title="Future Projections"
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
                      {p.projectedTotalXP.toLocaleString()} XP
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

function Heatmap({ data, year }) {
  const dataMap = Object.fromEntries(data.map((d) => [d.date, d]));
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year}-12-31`);
  const weeks = [];
  let curr = new Date(startDate);
  curr.setDate(curr.getDate() - curr.getDay()); // start from Sunday

  while (curr <= endDate) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = curr.toISOString().split("T")[0];
      week.push({ date: dateStr, ...dataMap[dateStr] });
      curr.setDate(curr.getDate() + 1);
    }
    weeks.push(week);
  }

  const getColor = (score) => {
    if (!score) return "bg-slate-800/60";
    if (score >= 80) return "bg-cyan-400";
    if (score >= 60) return "bg-cyan-600";
    if (score >= 40) return "bg-cyan-800";
    return "bg-cyan-900/60";
  };

  return (
    <div className="flex gap-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day, di) => (
            <div
              key={di}
              title={day.date + (day.score ? ` · Score: ${day.score}` : "")}
              className={`w-3 h-3 rounded-sm ${getColor(day.score)} transition-opacity hover:opacity-80`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
