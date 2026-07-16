import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useState } from "react";
import api from "../../lib/api.js";
import { useHunterStore } from "../../stores/hunterStore.js";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <motion.div variants={staggerItem} className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                          bg-cyan-500/15 border border-cyan-500/40 shadow-glow-cyan mb-4"
          >
            <Zap size={24} className="text-cyan-400" />
          </div>
          <h1 className="font-display text-lg font-bold text-gradient-hero tracking-widest mb-1">
            SOLO LEVELING
          </h1>
          <p className="font-heading text-sm text-slate-500 tracking-wider">
            The System awaits your return
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          variants={staggerItem}
          className="glass border border-slate-700/50 rounded-2xl p-8"
        >
          <h2 className="font-heading font-bold text-xl text-slate-100 mb-1">
            Hunter Login
          </h2>
          <p className="font-body text-sm text-slate-500 mb-7">
            Enter your credentials to access The System.
          </p>

          {error && (
            <div
              className="flex items-center gap-2.5 p-3 rounded-lg bg-red-500/10
                            border border-red-500/30 mb-5"
            >
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <p className="font-body text-sm text-red-400">
                {error.response?.data?.message || "Login failed. Try again."}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(mutate)} className="space-y-5">
            <div>
              <label className="input-label">Email</label>
              <input
                className={`input ${errors.email ? "border-red-500/60" : ""}`}
                placeholder="hunter@example.com"
                {...register("email", { required: "Email required" })}
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
                  {...register("password", { required: "Password required" })}
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
                  Accessing System…
                </>
              ) : (
                "Enter The System"
              )}
            </button>
          </form>

          <p className="mt-6 text-center font-body text-sm text-slate-500">
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
