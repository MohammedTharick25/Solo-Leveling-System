import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LockKeyhole, RefreshCw } from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";
import api from "../../lib/api.js";
import { PREMIUM_FEATURES, hasTierAccess } from "../../lib/planAccess.js";
import { PageLoader } from "../ui/PageLoader.jsx";

export default function PlanGate({ feature, children }) {
  const location = useLocation();
  const billingQuery = useQuery({
    queryKey: ["billing-me"],
    queryFn: async () => (await api.get("/billing/me")).data.data,
    staleTime: 30_000,
    retry: 1,
  });
  const requiredTier = PREMIUM_FEATURES[feature]?.requiredTier || "hunter";
  const billing = billingQuery.data;
  const hasAccess = hasTierAccess(billing?.effectiveTier, requiredTier);
  const accessEnd = billing?.isTrialing ? billing.trialEndsAt : billing?.currentPeriodEnd;

  useEffect(() => {
    if (!hasAccess || !accessEnd) return undefined;
    const remainingMs = new Date(accessEnd).getTime() - Date.now();
    if (remainingMs <= 0) {
      billingQuery.refetch();
      return undefined;
    }
    const timer = window.setTimeout(() => billingQuery.refetch(), remainingMs + 100);
    return () => window.clearTimeout(timer);
  }, [accessEnd, billingQuery.refetch, hasAccess]);

  if (billingQuery.isLoading) return <PageLoader />;
  if (billingQuery.isError) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-slate-950/80 p-8 text-center">
        <LockKeyhole className="mx-auto text-amber-300" size={28} />
        <h1 className="mt-4 font-heading text-xl font-bold text-white">Couldn’t verify your plan</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Reconnect to the System and try again. Your access remains protected until your plan can be verified.</p>
        <button onClick={() => billingQuery.refetch()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950"><RefreshCw size={15} /> Try again</button>
      </div>
    );
  }

  if (hasAccess) return children;

  return (
    <Navigate
      to={`/billing?feature=${encodeURIComponent(feature)}&required=${requiredTier}`}
      replace
      state={{ from: location.pathname }}
    />
  );
}

export function FeaturePaywallCard({ feature }) {
  const details = PREMIUM_FEATURES[feature] || PREMIUM_FEATURES.analytics;
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-12">
      <section className="relative w-full overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-slate-950/85 p-8 text-center shadow-2xl shadow-cyan-950/30 sm:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><LockKeyhole size={24} /></span>
        <p className="relative mt-6 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Hunter feature</p>
        <h1 className="relative mt-3 font-heading text-3xl font-black text-white">Unlock {details.label}</h1>
        <p className="relative mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-400">{details.description} Upgrade to {details.requiredTier === "monarch" ? "Monarch" : "Hunter"} to unlock this feature and continue your growth journey.</p>
        <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to={`/billing?feature=${encodeURIComponent(feature)}&required=${details.requiredTier}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-300 px-6 text-sm font-black text-slate-950 transition hover:bg-cyan-200">Explore {details.requiredTier === "monarch" ? "Monarch" : "Hunter"} plans</Link>
          <Link to="/dashboard" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-6 text-sm font-bold text-slate-300 transition hover:bg-white/5">Back to Command Center</Link>
        </div>
        <p className="relative mt-6 text-xs text-slate-600">Your free quests, habits, goals, and focus sessions remain available.</p>
      </section>
    </div>
  );
}
