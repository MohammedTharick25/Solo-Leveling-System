import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Clock3, Sparkles, Target } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../lib/api.js";
import AICoachPanel from "../../components/ai/AICoachPanel.jsx";

export default function AICoachPage() {
  const nextActionQuery = useQuery({
    queryKey: ["ai-next-action"],
    queryFn: async () => (await api.post("/ai/next-action")).data.data,
  });

  const action = nextActionQuery.data;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-12 space-y-6">
      <header>
        <p className="text-system mb-1">Personal guidance</p>
        <h1 className="font-heading font-black text-3xl text-white mt-1 flex items-center gap-3">
          AI Coach <Bot className="text-cyan-400" size={26} />
        </h1>
        <p className="text-sm text-slate-500 mt-2 max-w-2xl">
          Get practical advice based on your goals, quests, habits and recent progress.
        </p>
      </header>

      {action && (
        <section className="glass-cyan rounded-3xl border border-cyan-500/20 p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">Your next step</p>
              <h2 className="font-heading font-bold text-2xl text-white mt-1">{action.title}</h2>
              <p className="text-sm text-slate-400 mt-2 max-w-2xl">{action.reason}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center"><Clock3 size={16} className="mx-auto text-slate-500" /><p className="font-display text-lg text-white mt-1">{action.durationMinutes}m</p></div>
              <div className="text-center"><Sparkles size={16} className="mx-auto text-cyan-400" /><p className="font-display text-lg text-cyan-300 mt-1">+{action.xpEstimate}</p></div>
            </div>
          </div>
        </section>
      )}

      <AICoachPanel />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/goals" className="glass rounded-3xl border border-purple-500/15 p-5 hover:border-purple-500/30 transition-colors group">
          <Target className="text-purple-400" size={20} />
          <h2 className="font-heading font-bold text-white mt-3">Turn a goal into a plan</h2>
          <p className="text-sm text-slate-500 mt-1">Break a big goal into milestones and small quests.</p>
          <span className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-purple-300">Open Goals <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
        </Link>
        <div className="glass rounded-3xl border border-slate-800 p-5">
          <h2 className="font-heading font-bold text-white">Keep it simple</h2>
          <p className="text-sm text-slate-500 mt-2">Ask one question at a time. The coach uses your current progress to keep the answer practical.</p>
        </div>
      </section>
    </motion.div>
  );
}
