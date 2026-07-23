import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, Target, Scroll } from "lucide-react";
import api from "../../lib/api.js";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Date Helper Functions
const sow = (d) => {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
};
const addD = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const same = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function CalendarPage() {
  const [wkStart, setWkStart] = useState(sow(new Date()));
  const today = new Date();
  const wkEnd = addD(wkStart, 6);

  // 1. Fetch Raids with a unique key and safe data extraction
  const { data: raidsData } = useQuery({
    queryKey: ["calendar-raids-list"],
    queryFn: async () => {
      const response = await api.get("/raids?limit=100");
      // Extract from data.data.raids based on your JSON response
      const raids = response.data?.data?.raids || [];
      return Array.isArray(raids) ? raids : [];
    },
    initialData: [],
  });

  // 2. Fetch Quests with a unique key and safe data extraction
  const { data: questsData } = useQuery({
    queryKey: ["calendar-quests-list"],
    queryFn: async () => {
      const response = await api.get("/quests");
      // Extract from data.data.quests based on your JSON response
      const quests = response.data?.data?.quests || [];
      return Array.isArray(quests) ? quests : [];
    },
    initialData: [],
  });

  // 3. DEFENSIVE DATA MAPPING
  // This ensures that even if the API returns something weird, the app won't crash
  const safeRaids = Array.isArray(raidsData) ? raidsData : [];
  const safeQuests = Array.isArray(questsData) ? questsData : [];

  const wkDays = Array.from({ length: 7 }, (_, i) => addD(wkStart, i));
  const isToday = (d) => same(d, today);
  const isPast = (d) => d < today && !same(d, today);

  const raidsForDay = (d) =>
    safeRaids.filter((r) => r.dueAt && same(new Date(r.dueAt), d));

  const questsForDay = (d) => (same(d, today) ? safeQuests : []);

  const weekRaids = safeRaids.filter((r) => {
    if (!r.dueAt) return false;
    const d = new Date(r.dueAt);
    return d >= wkStart && d <= wkEnd;
  });

  const fmt = () => {
    const o = { month: "short", day: "numeric" };
    return `${wkStart.toLocaleDateString("en", o)} – ${wkEnd.toLocaleDateString(
      "en",
      o,
    )}, ${wkEnd.getFullYear()}`;
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-system mb-1">Time Architecture</p>
          <h1 className="font-heading font-bold text-2xl text-slate-100">
            Weekly Calendar
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWkStart(sow(new Date()))}
            className="btn-ghost text-sm py-1.5 px-3 border border-slate-700"
          >
            Today
          </button>
          <button
            onClick={() => setWkStart(addD(wkStart, -7))}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-heading text-sm text-slate-300 min-w-[180px] text-center">
            {fmt()}
          </span>
          <button
            onClick={() => setWkStart(addD(wkStart, 7))}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden border border-slate-700/50">
        <div className="grid grid-cols-7 border-b border-slate-800/60">
          {wkDays.map((d, i) => (
            <div
              key={i}
              className={`p-3 text-center border-r border-slate-800/40 last:border-r-0 ${
                isToday(d)
                  ? "bg-cyan-500/10"
                  : isPast(d)
                    ? "bg-slate-900/30"
                    : ""
              }`}
            >
              <p className="font-heading text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                {DAYS[d.getDay()]}
              </p>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto font-display text-sm font-bold
                ${
                  isToday(d)
                    ? "bg-cyan-500 text-slate-950 shadow-glow-cyan-sm"
                    : isPast(d)
                      ? "text-slate-600"
                      : "text-slate-200"
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[400px]">
          {wkDays.map((d, i) => {
            const dR = raidsForDay(d),
              dQ = questsForDay(d);
            return (
              <div
                key={i}
                className={`border-r border-slate-800/40 last:border-r-0 p-2 space-y-1 ${
                  isToday(d) ? "bg-cyan-500/5" : isPast(d) ? "opacity-50" : ""
                }`}
              >
                {dQ.length > 0 && (
                  <div className="mb-2">
                    <p className="font-display text-[8px] text-cyan-500 tracking-widest uppercase mb-1">
                      Quests
                    </p>
                    {dQ.slice(0, 4).map((q) => (
                      <div
                        key={q._id}
                        className={`px-1.5 py-1 rounded-md mb-0.5 border-l-2 ${
                          q.status === "completed"
                            ? "border-emerald-500 bg-emerald-500/10 opacity-60"
                            : "border-cyan-500 bg-cyan-500/10"
                        }`}
                      >
                        <p
                          className={`font-heading text-[9px] truncate ${
                            q.status === "completed"
                              ? "text-slate-500 line-through"
                              : "text-cyan-300"
                          }`}
                        >
                          {q.title}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {dR.map((r) => {
                  const ov =
                    r.dueAt &&
                    new Date(r.dueAt) < today &&
                    r.status !== "completed";
                  const dn = r.status === "completed";
                  const PB = {
                    critical: "border-red-500",
                    high: "border-yellow-500",
                    medium: "border-blue-500",
                    low: "border-slate-600",
                  };
                  return (
                    <div
                      key={r._id}
                      className={`px-1.5 py-1 rounded-md border-l-2 mb-0.5 ${
                        dn
                          ? "border-emerald-500 bg-emerald-500/10 opacity-50"
                          : ov
                            ? "border-red-500 bg-red-500/10"
                            : `${PB[r.priority] || "border-slate-600"} bg-purple-500/10`
                      }`}
                    >
                      <p
                        className={`font-heading text-[9px] truncate ${
                          dn
                            ? "text-slate-500 line-through"
                            : ov
                              ? "text-red-300"
                              : "text-purple-300"
                        }`}
                      >
                        {r.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4">
        {[
          ["bg-cyan-500/60", "Daily Quests"],
          ["bg-purple-500/60", "Task Raids"],
          ["bg-red-500/60", "Overdue"],
          ["bg-emerald-500/60", "Completed"],
        ].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${c}`} />
            <span className="font-heading text-xs text-slate-500">{l}</span>
          </div>
        ))}
      </div>

      {/* Stats Cards */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6"
      >
        {[
          {
            label: "Quests Today",
            value: `${safeQuests.filter((q) => q.status === "completed").length}/${safeQuests.length}`,
            icon: <Scroll size={14} className="text-cyan-400" />,
            color: "text-cyan-400",
          },
          {
            label: "Raids This Week",
            value: weekRaids.length,
            icon: <Target size={14} className="text-purple-400" />,
            color: "text-purple-400",
          },
          {
            label: "Raids Completed",
            value: weekRaids.filter((r) => r.status === "completed").length,
            icon: <Target size={14} className="text-emerald-400" />,
            color: "text-emerald-400",
          },
          {
            label: "Overdue",
            value: weekRaids.filter(
              (r) =>
                r.dueAt &&
                new Date(r.dueAt) < today &&
                r.status !== "completed",
            ).length,
            icon: <Clock size={14} className="text-red-400" />,
            color: "text-red-400",
          },
        ].map(({ label, value, icon, color }) => (
          <motion.div
            key={label}
            variants={staggerItem}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              {icon}
              <span className="text-hud">{label}</span>
            </div>
            <p className={`font-display text-2xl font-bold ${color}`}>
              {value}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
