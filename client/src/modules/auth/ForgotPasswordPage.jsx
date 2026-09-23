import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "../../lib/api.js";
import { staggerContainer, staggerItem } from "../../lib/animations.js";

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const mutation = useMutation({ mutationFn: (body) => api.post("/auth/forgot-password", body) });

  return (
    <AuthLayout>
      <motion.div variants={staggerItem} className="glass border border-slate-700/50 rounded-2xl p-8">
        <h2 className="font-heading font-bold text-xl text-slate-100 mb-1">Recover Access</h2>
        <p className="font-body text-sm text-slate-500 mb-7">Enter your hunter email and The System will send a secure reset link.</p>

        {mutation.isSuccess ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-emerald-400 font-heading font-semibold text-sm">
              <CheckCircle2 size={17} /> Check your email
            </div>
            <p className="font-body text-xs text-slate-400 mt-2 leading-relaxed">
              If an account exists for that email, a password reset link has been sent. The link expires soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
            {mutation.isError && (
              <div className="flex gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertCircle size={15} className="text-red-400 shrink-0" />
                <p className="font-body text-sm text-red-400">{mutation.error?.response?.data?.message || "Unable to send reset email."}</p>
              </div>
            )}
            <div>
              <label className="input-label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input className={`input pl-9 ${errors.email ? "border-red-500/60" : ""}`} placeholder="hunter@example.com" {...register("email", { required: "Email required" })} />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <button disabled={mutation.isPending} className="w-full btn-primary justify-center py-3">
              {mutation.isPending ? "Sending reset link…" : "Send Reset Link"}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-400 transition-colors">
          <ArrowLeft size={14} /> Back to login
        </Link>
      </motion.div>
    </AuthLayout>
  );
}

function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="w-full max-w-md relative z-10">
        <motion.div variants={staggerItem} className="text-center mb-8">
          <img src="/logo.png" alt="Solo Leveling" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="font-display text-lg font-bold text-gradient-hero tracking-widest">SOLO LEVELING</h1>
          <p className="font-heading text-sm text-slate-500 tracking-wider mt-1">The System awaits your return</p>
        </motion.div>
        {children}
      </motion.div>
    </div>
  );
}
