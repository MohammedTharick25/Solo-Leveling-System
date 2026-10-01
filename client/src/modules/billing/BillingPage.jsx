import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BadgeCheck, CreditCard, Crown, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import api from "../../lib/api.js";

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

const periodLabel = (billing) => {
  if (!billing?.interval) return "";
  const names = { daily: "day", weekly: "week", monthly: "month", yearly: "year" };
  const unit = names[billing.interval] || billing.interval;
  return billing.intervalCount > 1 ? ` / ${billing.intervalCount} ${unit}s` : ` / ${unit}`;
};

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState(null);
  const plansQuery = useQuery({
    queryKey: ["billing-plans"],
    queryFn: async () => (await api.get("/billing/plans")).data.data,
    staleTime: 5 * 60 * 1000,
  });
  const billingQuery = useQuery({
    queryKey: ["billing-me"],
    queryFn: async () => (await api.get("/billing/me")).data.data,
    staleTime: 0,
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
      setMessage(result === null
        ? { type: "info", text: "Checkout closed before payment was confirmed." }
        : result?.effectiveTier && result.effectiveTier !== "free"
          ? { type: "success", text: "Your subscription is active." }
          : { type: "info", text: "Payment authorization received. Razorpay is confirming your subscription." });
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

  const plans = plansQuery.data?.plans || [];
  const planIcon = useMemo(() => ({ free: ShieldCheck, hunter: Sparkles, monarch: Crown }), []);
  const isBusy = checkoutMutation.isPending || cancelMutation.isPending;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-16">
      <header className="rounded-[28px] border border-cyan-400/10 bg-slate-950/70 p-6 shadow-xl sm:p-8">
        <div className="flex items-center gap-3 text-cyan-300"><CreditCard size={20} /><span className="text-[9px] font-black uppercase tracking-[0.3em]">Account & Billing</span></div>
        <h1 className="mt-3 font-heading text-3xl font-black text-white">Choose your <span className="text-cyan-300">Hunter plan</span></h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">Your plan supports the tools and AI resources behind your personal growth system. Payments are processed securely by Razorpay.</p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 font-bold uppercase tracking-wider text-cyan-200">Current access: {billing.effectiveTier || "free"}</span>
          {billing.status && billing.status !== "inactive" && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">Subscription: {billing.status}</span>}
          {billing.currentPeriodEnd && <span className="text-slate-500">Renews through {new Date(billing.currentPeriodEnd).toLocaleDateString()}</span>}
        </div>
      </header>

      {message && <div role={message.type === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${message.type === "error" ? "border-red-500/20 bg-red-500/5 text-red-300" : message.type === "success" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300" : "border-cyan-500/20 bg-cyan-500/5 text-cyan-200"}`}>{message.text}</div>}

      {plansQuery.isLoading ? <div className="skeleton h-72 rounded-[26px]" /> : plansQuery.isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">Could not load billing plans.</div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const Icon = planIcon[plan.id] || BadgeCheck;
            const current = billing.effectiveTier === plan.id;
            const resumable = paidPending && billing.tier === plan.id && billing.subscriptionId;
            return (
              <article key={plan.id} className={`flex flex-col rounded-[26px] border bg-slate-950/65 p-5 shadow-lg ${current ? "border-cyan-400/30 shadow-cyan-500/5" : "border-white/5"}`}>
                <div className="flex items-center justify-between">
                  <span className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-3 text-cyan-300"><Icon size={19} /></span>
                  {current && <span className="text-[8px] font-black uppercase tracking-widest text-emerald-300">Current plan</span>}
                </div>
                <h2 className="mt-5 font-heading text-xl font-black text-white">{plan.name}</h2>
                <p className="mt-1 min-h-10 text-xs leading-relaxed text-slate-500">{plan.description}</p>
                <p className="mt-5 font-display text-2xl font-black text-white">{formatAmount(plan.billing)}<span className="text-xs font-medium text-slate-500">{periodLabel(plan.billing)}</span></p>
                <ul className="mt-5 flex-1 space-y-3 border-t border-white/5 pt-5">
                  {plan.features.map((feature) => <li key={feature} className="flex gap-2 text-xs text-slate-300"><BadgeCheck size={14} className="shrink-0 text-cyan-400" />{feature}</li>)}
                </ul>
                {plan.id === "free" ? (
                  <button type="button" disabled className="mt-6 min-h-11 rounded-xl border border-white/10 px-4 text-[9px] font-black uppercase tracking-widest text-slate-500">{current ? "Your current plan" : "Included"}</button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setMessage(null); checkoutMutation.mutate(plan.id); }}
                    disabled={isBusy || current || (hasOpenSubscription && !resumable) || (!plan.available && !resumable)}
                    className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-[9px] font-black uppercase tracking-widest text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {checkoutMutation.isPending && checkoutMutation.variables === plan.id && <Loader2 size={14} className="animate-spin" />}
                    {current ? "Current plan" : resumable ? "Continue checkout" : hasOpenSubscription ? "Resolve current subscription first" : plan.available ? `Choose ${plan.name}` : "Razorpay setup needed"}
                  </button>
                )}
              </article>
            );
          })}
        </section>
      )}

      {billing.effectiveTier !== "free" && !billing.cancelAtCycleEnd && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/5 bg-slate-950/50 p-4">
          <p className="text-xs text-slate-400">Cancel your subscription at the end of the current billing period.</p>
          <button type="button" onClick={() => cancelMutation.mutate()} disabled={isBusy} className="rounded-lg border border-white/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white disabled:opacity-50">Cancel subscription</button>
        </div>
      )}
      <p className="text-center text-[10px] text-slate-600">Subscriptions are managed by Razorpay. Your paid access starts after Razorpay confirms activation.</p>
    </motion.div>
  );
}
