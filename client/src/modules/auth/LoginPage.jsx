import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Eye, EyeOff, AlertCircle, ArrowRight, BookOpenCheck, Flame, Target } from "lucide-react";
import { useState } from "react";
import api from "../../lib/api.js";
import { useHunterStore } from "../../stores/hunterStore.js";
import {
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";
import { getAuthErrorMessage } from "./authErrors.js";

export default function LoginPage() {
  const { setToken, setUser } = useHunterStore();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const { mutate, isPending, error } = useMutation({
    mutationFn: (body) => api.post("/auth/login", body),
    onSuccess: ({ data }) => {
      setToken(data.data.accessToken);
      setUser(data.data.user);
      if (!data.data.user.isAwakened) {
        navigate("/awakening");
      } else {
        navigate("/dashboard");
      }
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative z-10 grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(390px,440px)] lg:gap-16"
      >
        <motion.aside variants={staggerItem} className="hidden max-w-xl lg:block">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.2em] text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" /> Hunter access portal
          </p>
          <h2 className="max-w-lg font-heading text-4xl font-black leading-[1.08] text-slate-100 xl:text-5xl">
            Your next level starts with <span className="text-gradient-hero">showing up.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-400">
            Return to your quests, focus sessions, and progress. The System keeps your next step in reach.
          </p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-2">
            {[
              { icon: Target, label: "Quests" },
              { icon: Flame, label: "Streaks" },
              { icon: BookOpenCheck, label: "Growth" },
            ].map(({ icon: Icon, label }, index) => (
              <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + index * 0.08 }} className="rounded-lg border border-slate-800/80 bg-slate-900/45 p-3">
                <Icon size={15} className="mb-3 text-cyan-200" />
                <p className="font-heading text-xs font-semibold text-slate-300">{label}</p>
              </motion.div>
            ))}
          </div>
        </motion.aside>

        {/* Card */}
        <motion.div
          variants={staggerItem}
          className="relative overflow-hidden glass border border-slate-700/60 rounded-2xl p-6 shadow-[0_28px_100px_rgba(0,0,0,0.35)] sm:p-8"
        >
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
          <div className="mb-6 flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-10 w-10 rounded-xl shadow-glow-cyan" />
            <div>
              <p className="font-display text-[10px] uppercase tracking-[0.2em] text-cyan-200">Solo Leveling</p>
              <p className="mt-0.5 font-heading text-xs text-slate-500">Hunter account access</p>
            </div>
          </div>
          <h2 className="font-heading font-bold text-xl text-slate-100 mb-1">
            Welcome back, Hunter
          </h2>
          <p className="font-body text-sm text-slate-500 mb-7">
            Sign in to pick up where you left off.
          </p>

          <motion.div layout>
            {error && (
              <motion.div
                role="alert"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-400/25 bg-red-400/[0.07] p-3.5"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-300" />
                <p className="font-body text-sm leading-relaxed text-red-200">{getAuthErrorMessage(error, "login")}</p>
              </motion.div>
            )}
          </motion.div>

          <form onSubmit={handleSubmit(mutate)} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="input-label">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(errors.email)}
                className={`input ${errors.email ? "border-red-500/60" : ""}`}
                placeholder="hunter@example.com"
                {...register("email", {
                  required: "Enter your email address.",
                  pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address." },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="input-label">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  className={`input pr-10 ${errors.password ? "border-red-500/60" : ""}`}
                  placeholder="••••••••"
                  {...register("password", { required: "Password required" })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition-colors hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={isPending}
              whileHover={isPending ? undefined : { y: -1 }}
              whileTap={isPending ? undefined : { scale: 0.985 }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-300/[0.09] py-3 font-heading text-sm font-bold text-cyan-100 transition-colors hover:border-cyan-200/70 hover:bg-cyan-300/[0.15] hover:shadow-[0_0_28px_rgba(34,211,238,0.12)] disabled:cursor-wait disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                  Accessing System…
                </>
              ) : (
                <>Enter The System <ArrowRight size={16} /></>
              )}
            </motion.button>
          </form>

          <div className="mt-5 text-center">
            <Link to="/forgot-password" className="font-body text-xs text-cyan-400 hover:text-cyan-300">Forgot password?</Link>
          </div>

          <p className="mt-6 border-t border-slate-800/80 pt-5 text-center font-body text-sm text-slate-500">
            No account?{" "}
            <Link
              to="/register"
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              Begin your awakening
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
