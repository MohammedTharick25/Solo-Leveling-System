import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Eye, EyeOff, AlertCircle, ArrowRight, Flame, ShieldCheck, Sparkles, Target } from "lucide-react";
import { useState } from "react";
import api from "../../lib/api.js";
import { useHunterStore } from "../../stores/hunterStore.js";
import { staggerContainer, staggerItem } from "../../lib/animations.js";
import { getAuthErrorMessage } from "./authErrors.js";

export default function RegisterPage() {
  const { setToken, setUser } = useHunterStore();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm();

  const { mutate, isPending, error } = useMutation({
    mutationFn: (body) => api.post("/auth/register", body),
    onSuccess: ({ data }) => {
      setToken(data.data.accessToken);
      setUser(data.data.user);
      navigate("/awakening");
    },
    onError: (mutationError) => {
      const message = mutationError.response?.data?.message || "";
      if (mutationError.response?.status !== 409) return;
      if (/email/i.test(message)) {
        setError("email", { type: "server", message: "This email already has an account. Sign in or use another email." });
      } else if (/hunter name|username/i.test(message)) {
        setError("hunterName", { type: "server", message: "That Hunter name is taken. Try another one." });
      }
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative z-10 grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(390px,460px)] lg:gap-16"
      >
        <motion.aside variants={staggerItem} className="hidden max-w-xl lg:block">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.2em] text-emerald-200">
            <Sparkles size={12} /> Start your Hunter record
          </p>
          <h2 className="max-w-lg font-heading text-4xl font-black leading-[1.08] text-slate-100 xl:text-5xl">
            Make your next chapter <span className="text-gradient-hero">measurable.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-400">
            Build a personal progression system around the goals and routines that matter to you.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: Target, title: "Choose your direction", copy: "Set the goals you want to move toward." },
              { icon: Flame, title: "Build steady momentum", copy: "Turn focus and habits into visible progress." },
              { icon: ShieldCheck, title: "Keep it yours", copy: "Your profile and notification choices stay in your control." },
            ].map(({ icon: Icon, title, copy }, index) => (
              <motion.div key={title} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + index * 0.09 }} className="flex items-start gap-3 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200"><Icon size={15} /></span>
                <span><span className="block font-heading text-xs font-semibold text-slate-200">{title}</span><span className="mt-1 block text-xs text-slate-500">{copy}</span></span>
              </motion.div>
            ))}
          </div>
        </motion.aside>

        <motion.div
          variants={staggerItem}
          className="relative overflow-hidden glass border border-slate-700/60 rounded-2xl p-6 shadow-[0_28px_100px_rgba(0,0,0,0.35)] sm:p-8"
        >
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
          <div className="mb-6 flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-10 w-10 rounded-xl shadow-glow-cyan" />
            <div>
              <p className="font-display text-[10px] uppercase tracking-[0.2em] text-cyan-200">Solo Leveling</p>
              <p className="mt-0.5 font-heading text-xs text-slate-500">Create your Hunter account</p>
            </div>
          </div>
          <h2 className="font-heading font-bold text-xl text-slate-100 mb-1">
            Begin your awakening
          </h2>
          <p className="font-body text-sm text-slate-500 mb-7">
            Set up your access, then shape a plan around your real goals.
          </p>

          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-400/25 bg-red-400/[0.07] p-3.5"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-300" />
              <p className="font-body text-sm leading-relaxed text-red-200">{getAuthErrorMessage(error, "register")}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(mutate)} className="space-y-5">
            <div>
              <label htmlFor="register-hunter-name" className="input-label">Hunter Name</label>
              <input
                id="register-hunter-name"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(errors.hunterName)}
                className={`input ${errors.hunterName ? "border-red-500/60" : ""}`}
                placeholder="ShadowArisen"
                {...register("hunterName", {
                  required: "Hunter name required",
                  minLength: { value: 3, message: "Minimum 3 characters" },
                  maxLength: { value: 20, message: "Maximum 20 characters" },
                  pattern: {
                    value: /^[a-zA-Z0-9_]+$/,
                    message: "Letters, numbers, underscores only",
                  },
                })}
              />
              {errors.hunterName && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.hunterName.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="register-email" className="input-label">Email</label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(errors.email)}
                className={`input ${errors.email ? "border-red-500/60" : ""}`}
                placeholder="hunter@example.com"
                {...register("email", {
                  required: "Email required",
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Valid email required",
                  },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="register-password" className="input-label">Password</label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.password)}
                  className={`input pr-10 ${errors.password ? "border-red-500/60" : ""}`}
                  placeholder="••••••••"
                  {...register("password", {
                    required: "Password required",
                    minLength: { value: 8, message: "Minimum 8 characters" },
                  })}
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
                  Registering Hunter…
                </>
              ) : (
                <>Create Hunter Account <ArrowRight size={16} /></>
              )}
            </motion.button>
          </form>

          <p className="mt-6 border-t border-slate-800/80 pt-5 text-center font-body text-sm text-slate-500">
            Already awakened?{" "}
            <Link
              to="/login"
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              Enter The System
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
