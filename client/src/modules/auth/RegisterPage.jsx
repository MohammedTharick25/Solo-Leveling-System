import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useState } from "react";
import api from "../../lib/api.js";
import { useHunterStore } from "../../stores/hunterStore.js";
import { staggerContainer, staggerItem } from "../../lib/animations.js";

export default function RegisterPage() {
  const { setToken, setUser } = useHunterStore();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const { mutate, isPending, error } = useMutation({
    mutationFn: (body) => api.post("/auth/register", body),
    onSuccess: ({ data }) => {
      setToken(data.data.accessToken);
      setUser(data.data.user);
      navigate("/awakening");
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
        className="w-full max-w-md relative z-10"
      >
        <motion.div variants={staggerItem} className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                          bg-purple-500/15 border border-purple-500/40 shadow-glow-purple mb-4"
          >
            <Zap size={24} className="text-purple-400" />
          </div>
          <h1 className="font-display text-lg font-bold text-gradient-hero tracking-widest mb-1">
            SOLO LEVELING
          </h1>
          <p className="font-heading text-sm text-slate-500 tracking-wider">
            Your awakening begins here
          </p>
        </motion.div>

        <motion.div
          variants={staggerItem}
          className="glass border border-slate-700/50 rounded-2xl p-8"
        >
          <h2 className="font-heading font-bold text-xl text-slate-100 mb-1">
            Create Hunter Account
          </h2>
          <p className="font-body text-sm text-slate-500 mb-7">
            The System is ready to register a new hunter.
          </p>

          {error && (
            <div
              className="flex items-center gap-2.5 p-3 rounded-lg bg-red-500/10
                            border border-red-500/30 mb-5"
            >
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <p className="font-body text-sm text-red-400">
                {error.response?.data?.message ||
                  "Registration failed. Try again."}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(mutate)} className="space-y-5">
            <div>
              <label className="input-label">Hunter Name</label>
              <input
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
              <label className="input-label">Email</label>
              <input
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
              <label className="input-label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
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

            <button
              type="submit"
              disabled={isPending}
              className="w-full btn-primary justify-center py-3 mt-2"
            >
              {isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                  Registering Hunter…
                </>
              ) : (
                "Begin Awakening"
              )}
            </button>
          </form>

          <p className="mt-6 text-center font-body text-sm text-slate-500">
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
