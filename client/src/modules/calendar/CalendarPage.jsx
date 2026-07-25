import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  Scroll,
  Calendar as CalendarIcon,
  Sword,
  CheckCircle2,
  AlertCircle,
  // Badge,
} from "lucide-react";
import { Badge } from "../../components/ui/PageLoader.jsx";
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

  // 1. Fetch Raids
  const { data: raidsData } = useQuery({
    queryKey: ["calendar-raids-list"],
    queryFn: async () => {
      const response = await api.get("/raids?limit=100");
      return response.data?.data?.raids || [];
    },
  });

  // 2. Fetch Today's Quests
  const { data: todaysQuests } = useQuery({
    queryKey: ["calendar-quests-today"],
    queryFn: async () => {
      const response = await api.get("/quests");
      return response.data?.data?.quests || [];
    },
  });

  // 3. Fetch Quest History
  const { data: historyData } = useQuery({
    queryKey: ["calendar-quests-history"],
    queryFn: async () => {
      const response = await api.get("/quests/history?limit=100");
      return response.data?.data?.quests || [];
    },
  });

  // 4. Combine all quests
  const allQuests = useMemo(() => {
    const todayQ = Array.isArray(todaysQuests) ? todaysQuests : [];
    const histQ = Array.isArray(historyData) ? historyData : [];
    return [...todayQ, ...histQ];
  }, [todaysQuests, historyData]);

  const safeRaids = Array.isArray(raidsData) ? raidsData : [];
  const safeQuests = Array.isArray(todaysQuests) ? todaysQuests : [];

  const wkDays = Array.from({ length: 7 }, (_, i) => addD(wkStart, i));
  const isToday = (d) => same(d, today);
  const isPast = (d) => d < today && !same(d, today);

  const questsForDay = (d) =>
    allQuests.filter((q) => q.createdAt && same(new Date(q.createdAt), d));

  const raidsForDay = (d) =>
    safeRaids.filter((r) => r.dueAt && same(new Date(r.dueAt), d));

  const weekRaids = safeRaids.filter((r) => {
    if (!r.dueAt) return false;
    const d = new Date(r.dueAt);
    return d >= wkStart && d <= wkEnd;
  });

  const fmt = () => {
    const o = { month: "short", day: "numeric" };
    return `${wkStart.toLocaleDateString("en", o)} – ${wkEnd.toLocaleDateString("en", o)}, ${wkEnd.getFullYear()}`;
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pb-10"
    >
      {/* Immersive Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-cyan-500 mb-1">
            <CalendarIcon size={14} className="animate-pulse" />
            <p className="text-system uppercase tracking-[0.2em] text-[10px] font-bold">
              Chronos synchronization
            </p>
          </div>
          <h1 className="font-heading font-black text-4xl text-white italic tracking-tighter uppercase">
            Time Architecture
          </h1>
        </div>

        <div className="flex items-center bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
          <button
            onClick={() => setWkStart(sow(new Date()))}
            className="btn-ghost text-[10px] font-black uppercase px-4 py-2 hover:bg-white/5 rounded-xl transition-all"
          >
            Today
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWkStart(addD(wkStart, -7))}
              className="p-2 text-slate-500 hover:text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-heading text-xs font-bold text-slate-200 min-w-[140px] text-center tracking-widest uppercase">
              {fmt()}
            </span>
            <button
              onClick={() => setWkStart(addD(wkStart, 7))}
              className="p-2 text-slate-500 hover:text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="glass-dark rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
        {/* Day Headers (Hidden on tiny screens, visible on Tablet+) */}
        <div className="hidden md:grid grid-cols-7 border-b border-white/5 bg-white/[0.02]">
          {wkDays.map((d, i) => (
            <div
              key={i}
              className={`p-4 text-center border-r border-white/5 last:border-r-0 ${isToday(d) ? "bg-cyan-500/5" : ""}`}
            >
              <p
                className={`font-display text-[10px] tracking-[0.2em] uppercase mb-2 ${isToday(d) ? "text-cyan-400" : "text-slate-500"}`}
              >
                {DAYS[d.getDay()]}
              </p>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto font-display text-lg font-black transition-all
                ${isToday(d) ? "bg-cyan-500 text-slate-950 shadow-glow-cyan" : isPast(d) ? "text-slate-600" : "text-slate-200"}`}
              >
                {d.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Responsive Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-7 min-h-[500px]">
          {wkDays.map((d, i) => {
            const dR = raidsForDay(d),
              dQ = questsForDay(d);
            return (
              <div
                key={i}
                className={`border-r border-white/5 last:border-r-0 p-3 space-y-3 transition-colors relative
                ${isToday(d) ? "bg-cyan-500/[0.03]" : isPast(d) ? "bg-black/20" : ""}`}
              >
                {/* Mobile-Only Date Header */}
                <div className="md:hidden flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                  <span className="font-display text-xs font-black text-slate-500 tracking-widest uppercase">
                    {DAYS[d.getDay()]} {d.getDate()}
                  </span>
                  {isToday(d) && <Badge color="cyan">Active Point</Badge>}
                </div>

                {/* Quests Section */}
                {dQ.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-1 h-3 bg-cyan-500 rounded-full" />
                      <p className="font-display text-[9px] text-cyan-500 tracking-widest uppercase font-bold">
                        Daily Quests
                      </p>
                    </div>
                    {dQ.map((q) => (
                      <motion.div
                        key={q._id}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`group p-2 rounded-xl border border-white/5 transition-all
                          ${q.status === "completed" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-cyan-500/5 border-cyan-500/10 hover:border-cyan-500/30"}`}
                      >
                        <div className="flex items-start gap-2">
                          {q.status === "completed" ? (
                            <CheckCircle2
                              size={10}
                              className="text-emerald-500 mt-0.5 shrink-0"
                            />
                          ) : (
                            <Scroll
                              size={10}
                              className="text-cyan-500 mt-0.5 shrink-0"
                            />
                          )}
                          <p
                            className={`font-heading text-[10px] leading-tight font-bold transition-all
                              ${q.status === "completed" ? "text-slate-500 line-through" : "text-slate-200 group-hover:text-cyan-300"}`}
                          >
                            {q.title}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Raids Section */}
                {dR.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 mb-2 mt-4">
                      <div className="w-1 h-3 bg-purple-500 rounded-full" />
                      <p className="font-display text-[9px] text-purple-500 tracking-widest uppercase font-bold">
                        Task Raids
                      </p>
                    </div>
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
                        <motion.div
                          key={r._id}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-2 rounded-xl border transition-all
                            ${dn ? "bg-emerald-500/10 border-emerald-500/20" : ov ? "bg-red-500/10 border-red-500/30 animate-pulse" : `bg-purple-500/5 border-white/5 hover:border-purple-500/30`}`}
                        >
                          <div className="flex items-start gap-2">
                            {dn ? (
                              <CheckCircle2
                                size={10}
                                className="text-emerald-500 mt-0.5 shrink-0"
                              />
                            ) : (
                              <Sword
                                size={10}
                                className="text-purple-500 mt-0.5 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p
                                className={`font-heading text-[10px] leading-tight font-black uppercase italic truncate
                                  ${dn ? "text-slate-500 line-through" : ov ? "text-red-400" : "text-slate-200"}`}
                              >
                                {r.title}
                              </p>
                              {!dn && (
                                <span
                                  className={`text-[8px] font-bold uppercase tracking-tighter ${PB[r.priority] || "text-slate-500"}`}
                                >
                                  {r.priority}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Empty State for Day */}
                {dQ.length === 0 && dR.length === 0 && (
                  <div className="h-20 flex items-center justify-center opacity-10">
                    <Target size={24} className="text-slate-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 mt-6 px-4">
        {[
          ["bg-cyan-500", "Daily Quests"],
          ["bg-purple-500", "Task Raids"],
          ["bg-red-500 animate-pulse", "Overdue / Crisis"],
          ["bg-emerald-500", "Objective Cleared"],
        ].map(([c, l]) => (
          <div key={l} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${c} shadow-glow-sm`} />
            <span className="font-display text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              {l}
            </span>
          </div>
        ))}
      </div>

      {/* Stats Cards */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10"
      >
        {[
          {
            label: "Quests Today",
            value: `${safeQuests.filter((q) => q.status === "completed").length}/${safeQuests.length}`,
            icon: <Scroll size={16} className="text-cyan-400" />,
            color: "text-cyan-400",
            bg: "border-cyan-500/20",
          },
          {
            label: "Raids This Week",
            value: weekRaids.length,
            icon: <Target size={16} className="text-purple-400" />,
            color: "text-purple-400",
            bg: "border-purple-500/20",
          },
          {
            label: "Raids Completed",
            value: weekRaids.filter((r) => r.status === "completed").length,
            icon: <CheckCircle2 size={16} className="text-emerald-400" />,
            color: "text-emerald-400",
            bg: "border-emerald-500/20",
          },
          {
            label: "Overdue Threats",
            value: weekRaids.filter(
              (r) =>
                r.dueAt &&
                new Date(r.dueAt) < today &&
                r.status !== "completed",
            ).length,
            icon: <AlertCircle size={16} className="text-red-400" />,
            color: "text-red-400",
            bg: "border-red-500/20",
          },
        ].map(({ label, value, icon, color, bg }) => (
          <motion.div
            key={label}
            variants={staggerItem}
            className={`glass-dark rounded-2xl p-5 border-t-2 ${bg} relative overflow-hidden group`}
          >
            <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:scale-110 transition-transform duration-500">
              {icon}
            </div>
            <div className="flex items-center gap-2 mb-3">
              {icon}
              <span className="text-hud text-[10px] font-black">{label}</span>
            </div>
            <p className={`font-display text-3xl font-black italic ${color}`}>
              {value}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
