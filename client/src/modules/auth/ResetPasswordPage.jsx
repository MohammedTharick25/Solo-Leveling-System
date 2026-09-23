import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Eye, EyeOff, LockKeyhole, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import api from "../../lib/api.js";
import { staggerContainer, staggerItem } from "../../lib/animations.js";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const mutation = useMutation({
    mutationFn: (body) => api.post("/auth/reset-password", body),
  });
  const password = watch("newPassword", "");

  const submit = (data) => mutation.mutate({ token, newPassword: data.newPassword });

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="w-full max-w-md relative z-10">
        <motion.div variants={staggerItem} className="text-center mb-8">
          <img src="/logo.png" alt="Solo Leveling" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="font-display text-lg font-bold text-gradient-hero tracking-widest">SOLO LEVELING</h1>
          <p className="font-heading text-sm text-slate-500 tracking-wider mt-1">Secure account recovery</p>
        </motion.div>

        <motion.div variants={staggerItem} className="glass border border-slate-700/50 rounded-2xl p-8">
          <h2 className="font-heading font-bold text-xl text-slate-100 mb-1">Set New Password</h2>
          <p className="font-body text-sm text-slate-500 mb-7">Choose a new password with at least 8 characters.</p>

          {!token ? (
            <Message type="error" icon={<AlertCircle size={16} />} text="This reset link is missing its token. Request a new reset link." />
          ) : mutation.isSuccess ? (
            <>
              <Message type="success" icon={<CheckCircle2 size={16} />} text="Password reset successfully. You can now sign in with your new password." />
              <Link to="/login" className="mt-5 w-full btn-primary justify-center py-3 inline-flex">Go to Login</Link>
            </>
          ) : (
            <form onSubmit={handleSubmit(submit)} className="space-y-5">
              {mutation.isError && <Message type="error" icon={<AlertCircle size={16} />} text={mutation.error?.response?.data?.message || "This reset link is invalid or expired."} />}
              <div>
                <label className="input-label">New Password</label>
                <div className="relative">
                  <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type={showPassword ? "text" : "password"} className={`input pl-9 pr-10 ${errors.newPassword ? "border-red-500/60" : ""}`} {...register("newPassword", { required: "Password required", minLength: { value: 8, message: "Minimum 8 characters" } })} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
                {errors.newPassword && <p className="mt-1 text-xs text-red-400">{errors.newPassword.message}</p>}
              </div>
              <div>
                <label className="input-label">Confirm Password</label>
                <input type="password" className={`input ${errors.confirmPassword ? "border-red-500/60" : ""}`} {...register("confirmPassword", { required: "Please confirm your password", validate: value => value === password || "Passwords do not match" })} />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>}
              </div>
              <button disabled={mutation.isPending} className="w-full btn-primary justify-center py-3">{mutation.isPending ? "Updating password…" : "Reset Password"}</button>
            </form>
          )}

          <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-400 transition-colors"><ArrowLeft size={14} /> Back to login</Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

function Message({ type, icon, text }) {
  const success = type === "success";
  return <div className={`flex gap-2.5 p-3 rounded-lg ${success ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}><span className="shrink-0 mt-0.5">{icon}</span><p className="font-body text-sm">{text}</p></div>;
}
