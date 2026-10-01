import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BadgeCheck, Check, CreditCard, Crown, Loader2, ShieldCheck, Sparkles, Zap, CalendarDays, Clock3, ArrowUpRight } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../lib/api.js";
import { PREMIUM_FEATURES } from "../../lib/planAccess.js";

const loadRazorpayCheckout = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const existing = document.querySelector('script[data-razorpay-checkout="true"]');
  if (existing) {
    existing.addEventListener("load", () => resolve(true), { once: true });
    existing.addEventListener("error", () => resolve(false), { once: true });
    return;
  }
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;
  script.dataset.razorpayCheckout = "true";
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const formatAmount = (billing) => {
  if (!billing || billing.amount === null || billing.amount === undefined) return "Price set in Razorpay";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: billing.currency || "INR",
    maximumFractionDigits: 0,
  }).format(billing.amount / 100);
};

const formatPreciseAmount = (amount, currency = "INR") => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency,
  maximumFractionDigits: 2,
}).format((amount || 0) / 100);

const formatExactDuration = (milliseconds) => {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [
    days ? `${days} ${days === 1 ? "day" : "days"}` : null,
    hours ? `${hours} ${hours === 1 ? "hour" : "hours"}` : null,
    minutes ? `${minutes} ${minutes === 1 ? "minute" : "minutes"}` : null,
  ].filter(Boolean).join(", ") || "less than a minute";
};

const periodLabel = (billing) => {
  if (!billing?.interval) return "";
  const names = { daily: "day", weekly: "week", monthly: "month", yearly: "year" };
  const unit = names[billing.interval] || billing.interval;
  return billing.intervalCount > 1 ? ` / ${billing.intervalCount} ${unit}s` : ` / ${unit}`;
};

export default function BillingPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState(null);
  const requestedFeature = searchParams.get("feature");
  const requiredTier = searchParams.get("required") || "hunter";
  const featureDetails = PREMIUM_FEATURES[requestedFeature];
  const plansQuery = useQuery({
    queryKey: ["billing-plans"],
    queryFn: async () => (await api.get("/billing/plans")).data.data,
    staleTime: 5 * 60 * 1000,
  });
  const billingQuery = useQuery({
    queryKey: ["billing-me"],
    queryFn: async () => (await api.get("/billing/me")).data.data,
    staleTime: 0,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const billing = billingQuery.data || {};
  const paidPending = ["created", "authenticated", "pending"].includes(billing.status);
  const hasOpenSubscription = Boolean(
    billing.subscriptionId &&
    !["inactive", "cancelled", "completed", "expired"].includes(billing.status),
  );

  const checkoutMutation = useMutation({
    mutationFn: async (tier) => {
      let subscription;
      if (paidPending && billing.tier === tier && billing.subscriptionId) {
        subscription = {
          subscriptionId: billing.subscriptionId,
          keyId: billing.keyId,
          email: billing.email,
          tier,
        };
      } else {
        const response = await api.post("/billing/subscriptions", { tier });
        subscription = response.data.data.subscription;
      }
      const loaded = await loadRazorpayCheckout();
      if (!loaded || !window.Razorpay) throw new Error("Razorpay Checkout could not be loaded. Check your internet connection and try again.");
      return new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: subscription.keyId,
          subscription_id: subscription.subscriptionId,
          name: "Solo Leveling System",
          description: `${tier === "monarch" ? "Monarch" : "Hunter"} subscription`,
          prefill: { email: subscription.email },
          theme: { color: "#22d3ee" },
          handler: async (payment) => {
            try {
              const result = await api.post("/billing/verify", payment);
              resolve(result.data.data.billing);
            } catch (error) {
              reject(error);
            }
          },
          modal: { ondismiss: () => resolve(null) },
        });
        checkout.on("payment.failed", (event) => reject(new Error(event.error?.description || "Razorpay payment failed.")));
        checkout.open();
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["billing-me"] });
      if (result?.effectiveTier && result.effectiveTier !== "free") {
        const returnPath = location.state?.from;
        if (returnPath) {
          navigate(returnPath, { replace: true });
          return;
        }
        setMessage({ type: "success", text: "Your Hunter access is active. Your premium features are ready." });
        return;
      }
      setMessage(result === null
        ? { type: "info", text: "Checkout closed before payment was confirmed. You can continue it here when you’re ready." }
        : { type: "info", text: "Payment authorization received. Razorpay is confirming your subscription. This page will update when access is active." });
    },
    onError: async (error) => {
      await queryClient.invalidateQueries({ queryKey: ["billing-me"] });
      setMessage({ type: "error", text: error.response?.data?.message || error.message || "Could not start checkout." });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => (await api.post("/billing/cancel")).data.data.billing,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["billing-me"] });
      setMessage({ type: "success", text: "Cancellation is scheduled for the end of your current billing period." });
    },
    onError: (error) => setMessage({ type: "error", text: error.response?.data?.message || "Could not schedule cancellation." }),
  });

  const trialMutation = useMutation({
    mutationFn: async () => (await api.post("/billing/trial")).data.data.billing,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["billing-me"] });
      setMessage({ type: "success", text: "Your 14-day Monarch trial is active. All advanced features are unlocked." });
      const returnPath = location.state?.from;
      if (returnPath) navigate(returnPath, { replace: true });
    },
    onError: (error) => setMessage({ type: "error", text: error.response?.data?.message || "Could not start your free trial." }),
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/billing/upgrade");
      const upgrade = response.data.data.upgrade;
      setMessage({ type: "info", text: `Hunter credit of ${formatPreciseAmount(upgrade.creditAmount, upgrade.currency)} gives you ${formatExactDuration(upgrade.convertedDays * 86400000)} of additional Monarch access. Your first full Monarch payment is scheduled for ${new Date(upgrade.accessUntil).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}.` });
      const loaded = await loadRazorpayCheckout();
      if (!loaded || !window.Razorpay) throw new Error("Razorpay Checkout could not be loaded. Check your internet connection and try again.");
      return new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: upgrade.keyId,
          subscription_id: upgrade.subscriptionId,
          name: "Solo Leveling System",
          description: `Monarch upgrade with ${formatExactDuration(upgrade.convertedDays * 86400000)} converted`,
          prefill: { email: upgrade.email },
          theme: { color: "#a78bfa" },
          handler: async (payment) => {
            try {
              const verified = await api.post("/billing/verify", payment);
              resolve({ billing: verified.data.data.billing, upgrade });
            } catch (error) {
              reject(error);
            }
          },
          modal: { ondismiss: () => resolve(null) },
        });
        checkout.on("payment.failed", (event) => reject(new Error(event.error?.description || "Razorpay payment authorization failed.")));
        checkout.open();
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["billing-me"] });
      if (result === null) {
        setMessage({ type: "info", text: "Upgrade checkout was closed. Your Hunter plan is unchanged, and you can continue the Monarch upgrade here." });
        return;
      }
      const date = new Date(result.upgrade.accessUntil).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
      setMessage({ type: "success", text: `Monarch is active now. ${formatExactDuration(result.upgrade.convertedDays * 86400000)} of Hunter value was converted to Monarch access. Your first full Monarch payment is scheduled for ${date}.` });
    },
    onError: async (error) => {
      await queryClient.invalidateQueries({ queryKey: ["billing-me"] });
      setMessage({ type: "error", text: error.response?.data?.message || "Could not upgrade your plan." });
    },
  });

  const freePlanMutation = useMutation({
    mutationFn: async () => (await api.post("/billing/free")).data.data.billing,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["billing-me"] });
      navigate("/dashboard", { replace: true });
    },
    onError: (error) => setMessage({ type: "error", text: error.response?.data?.message || "Could not select the Free plan." }),
  });

  const plans = plansQuery.data?.plans || [];
  const upgradePreview = useMemo(() => {
    if (billing.effectiveTier !== "hunter" || billing.status !== "active" || billing.cancelAtCycleEnd || !billing.currentPeriodStart || !billing.currentPeriodEnd) return null;
    const hunterAmount = Number(plans.find((plan) => plan.id === "hunter")?.billing?.amount);
    const monarchAmount = Number(plans.find((plan) => plan.id === "monarch")?.billing?.amount);
    const periodStart = new Date(billing.currentPeriodStart).getTime();
    const periodEnd = new Date(billing.currentPeriodEnd).getTime();
    const now = Date.now();
    const periodLength = periodEnd - periodStart;
    if (!Number.isFinite(hunterAmount) || !Number.isFinite(monarchAmount) || hunterAmount <= 0 || monarchAmount <= 0 || periodLength <= 0 || periodEnd <= now) return null;
    const creditAmount = Math.min(hunterAmount, Math.floor(hunterAmount * (periodEnd - now) / periodLength));
    const nextMonth = new Date(now);
    const day = nextMonth.getUTCDate();
    nextMonth.setUTCDate(1);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0)).getUTCDate();
    nextMonth.setUTCDate(Math.min(day, lastDay));
    const extraMilliseconds = Math.floor((nextMonth.getTime() - now) * creditAmount / monarchAmount);
    return { creditAmount, extraMilliseconds, firstPaymentAt: new Date(now + extraMilliseconds) };
  }, [billing.effectiveTier, billing.status, billing.cancelAtCycleEnd, billing.currentPeriodStart, billing.currentPeriodEnd, plans]);
  const planIcon = useMemo(() => ({ free: ShieldCheck, hunter: Sparkles, monarch: Crown }), []);
  const isBusy = checkoutMutation.isPending || cancelMutation.isPending || trialMutation.isPending || upgradeMutation.isPending || freePlanMutation.isPending;
  const accessEnd = billing.isTrialing ? billing.trialEndsAt : billing.currentPeriodEnd;
  const daysRemaining = billing.daysRemaining || 0;
  const formattedAccessEnd = accessEnd ? new Date(accessEnd).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;
  const pendingTierDate = billing.pendingTierEffectiveAt
    ? new Date(billing.pendingTierEffectiveAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : formattedAccessEnd;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-8 pb-16">
      <header className="relative overflow-hidden rounded-[30px] border border-cyan-300/15 bg-gradient-to-br from-slate-950 via-slate-950 to-cyan-950/35 p-6 shadow-2xl shadow-cyan-950/20 sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200"><CreditCard size={14} /> Membership & billing</div>
            <h1 className="mt-5 font-heading text-3xl font-black tracking-tight text-white sm:text-4xl">Build your system.<br /><span className="text-cyan-300">Unlock your next level.</span></h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">A clear plan for every stage of your growth. Keep your essentials on Free, add focused tools with Hunter, or unlock the complete system with Monarch.</p>
          </div>
          <div className="relative w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-xs sm:w-auto sm:min-w-64">
            <div className="flex items-center justify-between gap-8"><span className="text-slate-500">Current access</span><strong className="capitalize text-white">{billing.effectiveTier || "free"}{billing.isTrialing ? " trial" : ""}</strong></div>
            <div className="mt-3 flex items-center justify-between gap-8"><span className="text-slate-500">Status</span><strong className="capitalize text-slate-300">{billing.isTrialing ? "14-day trial" : billing.status || "Free plan"}</strong></div>
            {formattedAccessEnd && <div className="mt-3 flex items-center justify-between gap-8"><span className="text-slate-500">{billing.isTrialing ? "Trial ends" : billing.cancelAtCycleEnd ? "Access ends" : "Next renewal"}</span><strong className="text-slate-200">{formattedAccessEnd}</strong></div>}
            {((billing.isTrialing && billing.trialEndsAt) || billing.currentPeriodEnd) && <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-cyan-100"><Clock3 size={14} /><strong>{daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining</strong></div>}
          </div>
        </div>
      </header>

      {featureDetails && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5 sm:flex-row sm:items-center">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-300/10 text-amber-200"><Zap size={18} /></span>
          <div><p className="text-sm font-bold text-white">{featureDetails.label} is included in {requiredTier === "monarch" ? "Monarch" : "Hunter"}</p><p className="mt-1 text-xs leading-5 text-slate-400">{featureDetails.description} Compare the plan details below to choose the right fit.</p></div>
        </div>
      )}

      {!billingQuery.isLoading && !billingQuery.isError && !billing.trialUsed && billing.effectiveTier === "free" && <section className="relative overflow-hidden rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-500/[0.12] via-slate-950/80 to-cyan-500/[0.08] p-5 sm:p-7"><div className="pointer-events-none absolute -right-14 -top-24 h-56 w-56 rounded-full bg-violet-400/10 blur-3xl" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="max-w-2xl"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-200">A full-system preview</p><h2 className="mt-2 font-heading text-xl font-black text-white sm:text-2xl">Try Monarch free for 14 days</h2><p className="mt-2 text-sm leading-6 text-slate-400">Explore every advanced feature before choosing a plan. No payment is taken to start the trial. After 14 days, your account continues on Free unless you subscribe.</p></div><button type="button" onClick={() => trialMutation.mutate()} disabled={isBusy} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-200 px-5 text-xs font-black text-slate-950 transition hover:bg-white disabled:opacity-50">{trialMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Start free trial</button></div></section>}
      {billingQuery.isError && <div role="alert" className="rounded-2xl border border-red-300/15 bg-red-400/[0.06] p-4 text-sm text-red-200">We couldn’t verify your current plan. Refresh this page before starting a checkout so we don’t create a duplicate subscription.</div>}

      {billing.isTrialing && <div className="flex flex-col gap-4 rounded-2xl border border-violet-300/20 bg-gradient-to-r from-violet-400/[0.09] to-cyan-300/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-200"><CalendarDays size={18} /></span><div><p className="text-sm font-bold text-white">Your Monarch trial is in progress</p><p className="mt-1 text-xs leading-5 text-slate-400">You have {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left. Your account returns to Free when the trial ends unless you subscribe.</p></div></div><button type="button" onClick={() => checkoutMutation.mutate("monarch")} disabled={isBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-200 px-4 text-xs font-black text-slate-950 hover:bg-violet-100 disabled:opacity-50">Continue with Monarch <ArrowUpRight size={14} /></button></div>}

      {billing.pendingTier === "monarch" && <div className="flex flex-col gap-3 rounded-2xl border border-violet-300/20 bg-gradient-to-r from-violet-400/[0.09] to-cyan-300/[0.05] p-5 sm:flex-row sm:items-start"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-200"><CalendarDays size={18} /></span><div><p className="text-sm font-bold text-white">Monarch is scheduled{pendingTierDate ? ` for ${pendingTierDate}` : " for your next renewal"}</p><p className="mt-1 text-xs leading-5 text-slate-400">Hunter features stay active through your current billing period. Monarch begins when it renews; there is no immediate upgrade charge.</p></div></div>}

      {message && <div role={message.type === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${message.type === "error" ? "border-red-500/20 bg-red-500/5 text-red-300" : message.type === "success" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300" : "border-cyan-500/20 bg-cyan-500/5 text-cyan-200"}`}>{message.text}</div>}

      {plansQuery.isLoading ? <div className="skeleton h-72 rounded-[26px]" /> : plansQuery.isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">Could not load billing plans.</div>
      ) : (
        <section className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const Icon = planIcon[plan.id] || BadgeCheck;
            const current = billing.effectiveTier === plan.id && !billing.isTrialing && (plan.id !== "free" || billing.hasChosenPlan);
            const resumable = paidPending && billing.tier === plan.id && billing.subscriptionId;
            const featured = plan.id === "hunter";
            return (
              <article key={plan.id} className={`relative flex flex-col rounded-[26px] border bg-slate-950/70 p-5 shadow-xl transition duration-300 hover:-translate-y-1 hover:bg-slate-900/80 sm:p-6 ${plan.id === "monarch" ? "border-violet-300/25 shadow-violet-500/10" : featured ? "border-cyan-300/35 shadow-cyan-500/10" : current ? "border-emerald-300/25" : "border-white/[0.08]"}`}>
                {featured && <span className="absolute right-4 top-4 rounded-full bg-cyan-300 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-slate-950">Most popular</span>}
                {plan.id === "monarch" && <span className="absolute right-4 top-4 rounded-full border border-violet-200/20 bg-violet-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-violet-100">{billing.pendingTier === "monarch" ? "Scheduled" : "Complete access"}</span>}
                <div className="flex items-center justify-between">
                  <span className={`rounded-xl border p-3 ${featured ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-200" : "border-white/10 bg-white/5 text-slate-300"}`}><Icon size={19} /></span>
                  {current && <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-200">Your plan</span>}
                  {billing.isTrialing && plan.id === "monarch" && <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-violet-100">Trial active</span>}
                </div>
                <h2 className="mt-5 font-heading text-2xl font-black text-white">{plan.name}</h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{plan.description}</p>
                <p className="mt-5 font-display text-3xl font-black text-white">{formatAmount(plan.billing)}<span className="ml-1 text-xs font-medium text-slate-500">{periodLabel(plan.billing)}</span></p>
                {plan.id !== "free" && <p className="mt-1 text-[11px] text-slate-500">Billed {plan.billing?.interval || "monthly"}. Cancel renewal anytime; access stays through your paid period.</p>}
                <ul className="mt-6 flex-1 space-y-3 border-t border-white/[0.08] pt-5">
                  {plan.features.map((feature) => <li key={feature} className="flex gap-2.5 text-xs leading-5 text-slate-300"><Check size={15} className="mt-0.5 shrink-0 text-cyan-300" />{feature}</li>)}
                </ul>
                {plan.id === "free" ? (
                  <button type="button" onClick={() => freePlanMutation.mutate()} disabled={isBusy || billingQuery.isLoading || billingQuery.isError || current || billing.isTrialing || billing.effectiveTier !== "free" || billing.hasChosenPlan} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-bold text-slate-200 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-45">{freePlanMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : current || billing.hasChosenPlan && billing.effectiveTier === "free" ? "Your current plan" : billing.isTrialing ? "Trial in progress" : "Continue with Free"}</button>
                ) : (
                  <>
                  <button
                    type="button"
                    onClick={() => { setMessage(null); if (plan.id === "monarch" && billing.effectiveTier === "hunter" && billing.status === "active") upgradeMutation.mutate(); else checkoutMutation.mutate(plan.id); }}
                    disabled={isBusy || billingQuery.isLoading || billingQuery.isError || current || (billing.pendingTier === plan.id && !(plan.id === "monarch" && billing.effectiveTier === "hunter" && billing.status === "active")) || (billing.effectiveTier === "monarch" && plan.id === "hunter") || (hasOpenSubscription && !resumable && !(plan.id === "monarch" && billing.effectiveTier === "hunter" && billing.status === "active")) || (!plan.available && !resumable)}
                    className={`mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${featured ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200" : "border border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"}`}
                  >
                    {(checkoutMutation.isPending && checkoutMutation.variables === plan.id || upgradeMutation.isPending && plan.id === "monarch") && <Loader2 size={14} className="animate-spin" />}
                    {billing.pendingTier === plan.id && !(plan.id === "monarch" && billing.effectiveTier === "hunter" && billing.status === "active") ? "Monarch scheduled" : current ? "Current plan" : billing.effectiveTier === "monarch" && plan.id === "hunter" ? "Downgrade unavailable" : billing.effectiveTier === "hunter" && billing.status === "active" && plan.id === "monarch" ? "Upgrade now with time credit" : resumable ? "Continue checkout" : hasOpenSubscription ? "Resolve current subscription first" : plan.available ? `Choose ${plan.name}` : "Razorpay setup needed"}
                  </button>
                  {plan.id === "free" ? null : billing.effectiveTier === "monarch" && plan.id === "hunter" ? <p className="mt-2 text-center text-[10px] leading-4 text-slate-500">Downgrades are available after your Monarch period ends.</p> : null}
                  </>
                )}
              </article>
            );
          })}
        </section>
      )}

      {upgradePreview && <section className="relative overflow-hidden rounded-3xl border border-violet-300/20 bg-gradient-to-r from-violet-500/[0.12] via-slate-950/85 to-cyan-500/[0.08] p-5 sm:p-6"><div className="pointer-events-none absolute -right-12 -top-20 h-48 w-48 rounded-full bg-violet-300/10 blur-3xl" /><div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">Hunter to Monarch conversion</p><p className="mt-2 text-sm font-bold text-white">Your unused Hunter value becomes extra Monarch time.</p><p className="mt-1 text-xs leading-5 text-slate-400">{formatPreciseAmount(upgradePreview.creditAmount, plans.find((plan) => plan.id === "hunter")?.billing?.currency)} credit adds <strong className="text-violet-100">{formatExactDuration(upgradePreview.extraMilliseconds)}</strong>. Monarch access starts after authorization; your first full payment is scheduled for {upgradePreview.firstPaymentAt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}.</p></div><span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-violet-200/15 bg-violet-300/[0.08] px-3 py-2 text-[10px] font-bold text-violet-100"><CalendarDays size={14} /> Hunter member benefit</span></div></section>}

      <section className="grid gap-4 rounded-3xl border border-white/[0.07] bg-slate-950/45 p-5 sm:grid-cols-3 sm:p-6">
        {[
          ["Keep the essentials", "Quests, habits, goals, focus, and your daily routine stay available on Free."],
          ["Upgrade when ready", "Hunter unlocks the premium coaching and progression areas shown in the navigation."],
          ["Secure checkout", "Razorpay handles payment details. Access changes only after the subscription is confirmed."],
        ].map(([title, body]) => <div key={title}><p className="text-xs font-bold text-white">{title}</p><p className="mt-1.5 text-xs leading-5 text-slate-500">{body}</p></div>)}
      </section>

      {!billing.isTrialing && billing.effectiveTier !== "free" && billing.provider === "razorpay" && billing.cancelAtCycleEnd && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-xs leading-5 text-amber-100"><CalendarDays size={16} className="shrink-0" /><p>Renewal is cancelled. Your {billing.effectiveTier} access remains available until {formattedAccessEnd || "the end of your current billing period"} ({daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining).</p></div>
      )}
      {!billing.isTrialing && billing.effectiveTier !== "free" && billing.provider === "razorpay" && !billing.cancelAtCycleEnd && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/5 bg-slate-950/50 p-4">
          <div><p className="text-xs font-bold text-white">Manage renewal</p><p className="mt-1 text-xs text-slate-400">Cancel renewal to stop future charges. Your paid features remain active until {formattedAccessEnd || "the end of this billing period"}.</p></div>
          <button type="button" onClick={() => cancelMutation.mutate()} disabled={isBusy} className="rounded-lg border border-white/10 px-4 py-2 text-[10px] font-bold text-slate-300 transition hover:border-red-300/20 hover:bg-red-300/[0.05] hover:text-red-200 disabled:opacity-50">{cancelMutation.isPending ? "Updating…" : "Cancel renewal"}</button>
        </div>
      )}
      <p className="text-center text-[11px] text-slate-600">Subscriptions are managed by Razorpay. Paid access starts after Razorpay confirms activation.</p>
    </motion.div>
  );
}
