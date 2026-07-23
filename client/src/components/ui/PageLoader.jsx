import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { modalBackdrop, modalPanel } from "../../lib/animations.js";
import { forwardRef } from "react";

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({
  children,
  variant = "primary",
  size = "md",
  loading,
  className = "",
  ...props
}) {
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    danger: "btn-danger",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3 text-base",
  };

  return (
    <button
      className={`${variants[variant]} ${sizes[size]} inline-flex items-center justify-center gap-2
                  disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, color = "cyan", className = "" }) {
  const colors = {
    cyan: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    purple: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    yellow: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    red: "bg-red-500/15 text-red-400 border-red-500/30",
    slate: "bg-slate-700/40 text-slate-400 border-slate-600/40",
    orange: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border
                      font-heading text-[11px] font-semibold tracking-wide
                      ${colors[color] || colors.slate} ${className}`}
    >
      {children}
    </span>
  );
}

// ── Rank Badge ────────────────────────────────────────────────────────────────
export function RankBadge({ rank, className = "" }) {
  const rankClasses = {
    Unawakened: "rank-unawakened",
    E: "rank-E",
    D: "rank-D",
    C: "rank-C",
    B: "rank-B",
    A: "rank-A",
    S: "rank-S",
    National: "rank-National",
    Monarch: "rank-Monarch",
    "Shadow Monarch": "rank-Shadow",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg
                      font-display text-[10px] tracking-widest
                      ${rankClasses[rank] || "rank-unawakened"} ${className}`}
    >
      {rank === "Shadow Monarch" ? "SHADOW MONARCH" : `${rank} RANK`}
    </span>
  );
}

// ── Difficulty Badge ──────────────────────────────────────────────────────────
export function DiffBadge({ diff, className = "" }) {
  return (
    <span
      className={`font-display text-[11px] tracking-widest diff-${diff} ${className}`}
    >
      [{diff}]
    </span>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={modalBackdrop}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            variants={modalPanel}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`w-full ${maxWidth} glass border border-slate-700/50 rounded-2xl shadow-card`}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
                <h3 className="font-heading font-semibold text-base text-slate-100">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Page Loader ───────────────────────────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div
          className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500
                        rounded-full animate-spin mx-auto mb-4"
        />
        <p className="font-display text-xs text-slate-500 tracking-widest uppercase animate-pulse">
          Accessing System…
        </p>
      </div>
    </div>
  );
}

// ── Stat Bar ──────────────────────────────────────────────────────────────────
export function StatBar({
  value = 0,
  color = "#22d3ee",
  label,
  className = "",
}) {
  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-hud text-[10px]">{label}</span>
          <span className="font-display text-xs text-slate-300">{value}</span>
        </div>
      )}
      <div className="stat-bar">
        <motion.div
          className="stat-bar-fill"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── XP Bar ────────────────────────────────────────────────────────────────────
export function XPBar({ hunter, className = "" }) {
  const progress = hunter?.xpProgress || 0;
  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-hud text-[10px]">XP</span>
        <span className="font-display text-[10px] text-slate-400">
          {Math.floor(progress)}%
        </span>
      </div>
      <div className="xp-bar-track">
        <motion.div
          className="xp-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div
          className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50
                        flex items-center justify-center mb-4"
        >
          <Icon size={24} className="text-slate-600" />
        </div>
      )}
      <h3 className="font-heading font-semibold text-base text-slate-300 mb-2">
        {title}
      </h3>
      {description && (
        <p className="font-body text-sm text-slate-500 max-w-xs mb-5">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = "", glow = false }) {
  return (
    <div className={`card ${glow ? "card-cyan" : ""} ${className}`}>
      {children}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ label, title, action }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        {label && <p className="text-system mb-1">{label}</p>}
        <h2 className="font-heading font-bold text-xl text-slate-100">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export const Input = forwardRef(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className={className}>
        {label && <label className="input-label">{label}</label>}
        <input
          ref={ref} // 3. This MUST be here
          className={`input ${error ? "border-red-500/60" : ""}`}
          {...props} // 4. This MUST be here (contains onChange and name)
        />
        {error && (
          <p className="mt-1 text-xs text-red-400 font-body">{error}</p>
        )}
      </div>
    );
  },
);

// ── Textarea ──────────────────────────────────────────────────────────────────
export const Textarea = forwardRef(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className={className}>
        {label && <label className="input-label">{label}</label>}
        <textarea
          ref={ref} // Attach the ref here
          className={`input resize-none ${error ? "border-red-500/60" : ""}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-400 font-body">{error}</p>
        )}
      </div>
    );
  },
);