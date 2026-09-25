import { useState } from "react";
import { Bot, Send, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import api from "../../lib/api.js";

const QUICK_PROMPTS = [
  "What should I do now?",
  "Plan my next 2 hours.",
  "Why might I be losing my streak?",
  "Help me stop procrastinating.",
];

export default function AICoachPanel({ compact = false }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async (value = question) => {
    const prompt = value.trim();
    if (!prompt || loading) return;

    setLoading(true);
    setError("");
    setQuestion("");
    try {
      const { data } = await api.post("/ai/chat", { question: prompt });
      setAnswer(data.data.answer);
    } catch (err) {
      setError(err.response?.data?.message || "The System could not reach the AI Coach.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`glass rounded-3xl border border-cyan-500/15 overflow-hidden ${compact ? "p-5" : "p-6"}`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Bot size={21} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">Personal Coach</p>
            <h2 className="font-heading font-bold text-white text-lg">AI Hunter Coach</h2>
          </div>
        </div>
        <Sparkles size={17} className="text-purple-400" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => ask(prompt)}
            disabled={loading}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900/70 border border-slate-800 hover:border-cyan-500/30 hover:text-cyan-300 transition-all disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {answer && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-2xl bg-slate-950/70 border border-slate-800 p-4 text-sm leading-6 text-slate-300 whitespace-pre-wrap"
        >
          {answer}
        </motion.div>
      )}

      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask();
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={1200}
          placeholder="Ask your coach about your next step..."
          className="min-w-0 flex-1 rounded-xl bg-slate-950/70 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/40"
        />
        <button
          type="submit"
          disabled={!question.trim() || loading}
          className="w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center justify-center hover:bg-cyan-500/20 disabled:opacity-40 transition-all"
          aria-label="Ask AI Coach"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
