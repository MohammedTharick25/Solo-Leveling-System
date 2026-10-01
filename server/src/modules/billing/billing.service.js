import { createHmac, timingSafeEqual } from "node:crypto";
import config from "../../config/env.js";
import User from "../user/user.model.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";

const PLAN_DEFINITIONS = {
  hunter: {
    id: "hunter",
    name: "Hunter",
    description: "Advanced insight and challenge tools for consistent progress.",
    features: [
      "Everything in Free",
      "Advanced analytics and progress insights",
      "AI Hunter Coach",
      "Boss Battles",
    ],
    razorpayPlanId: () => config.RAZORPAY_HUNTER_PLAN_ID,
  },
  monarch: {
    id: "monarch",
    name: "Monarch",
    description: "The complete personal growth system for committed hunters.",
    features: [
      "Everything in Hunter",
      "Second Brain and knowledge graph",
      "Shadow Army",
      "Dungeons",
      "Task Raids",
    ],
    razorpayPlanId: () => config.RAZORPAY_MONARCH_PLAN_ID,
  },
};

const hasRazorpayCredentials = () =>
  Boolean(config.RAZORPAY_KEY_ID && config.RAZORPAY_KEY_SECRET);

const hasRazorpayCheckoutConfig = () =>
  hasRazorpayCredentials() && Boolean(config.RAZORPAY_WEBHOOK_SECRET);

const assertRazorpayConfigured = () => {
  if (!hasRazorpayCredentials()) {
    throw new AppError("Razorpay billing is not configured on the server yet.", 503);
  }
}

const razorpayRequest = async (path, { method = "GET", body } = {}) => {
  assertRazorpayConfigured();
  const authorization = Buffer.from(
    `${config.RAZORPAY_KEY_ID}:${config.RAZORPAY_KEY_SECRET}`,
  ).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${authorization}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.description || "Razorpay could not process the billing request.";
    console.error(`[BILLING] Razorpay request failed (${response.status})`, {
      requestId: response.headers.get("x-razorpay-request-id") || response.headers.get("x-rzp-trace-id") || null,
      code: payload?.error?.code,
      source: payload?.error?.source,
      step: payload?.error?.step,
      reason: payload?.error?.reason,
      message,
    });
    throw new AppError(message, response.status >= 500 ? 502 : 400);
  }
  return payload;
};

const toPlanSummary = async (definition) => {
  const razorpayPlanId = definition.razorpayPlanId();
  let billing = null;
  if (razorpayPlanId && hasRazorpayCredentials()) {
    const providerPlan = await razorpayRequest(`/plans/${encodeURIComponent(razorpayPlanId)}`);
    billing = {
      amount: providerPlan.item?.amount ?? null,
      currency: providerPlan.item?.currency || "INR",
      interval: providerPlan.period || null,
      intervalCount: providerPlan.interval || 1,
    };
  }
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    features: definition.features,
    available: Boolean(razorpayPlanId && hasRazorpayCheckoutConfig()),
    billing,
  };
};

export const getPlans = async () => {
  const paidPlans = await Promise.all(
    Object.values(PLAN_DEFINITIONS).map(toPlanSummary),
  );
  return {
    currency: "INR",
    plans: [
      {
        id: "free",
        name: "Free",
        description: "Build a steady personal growth routine.",
        features: ["Daily quests", "Goals and milestones", "Habits and streaks", "Focus sessions", "Journal and calendar", "Achievements and core progress"],
        available: true,
        billing: { amount: 0, currency: "INR", interval: null, intervalCount: 1 },
      },
      ...paidPlans,
    ],
    checkoutReady: hasRazorpayCheckoutConfig(),
  };
};

const getEffectiveTier = (billing) => {
  if (
    billing?.provider === "razorpay" &&
    billing.status === "active" &&
    (!billing.currentPeriodEnd || billing.currentPeriodEnd.getTime() > Date.now())
  ) {
    return billing.tier;
  }
  if (billing?.trialEndsAt && billing.trialEndsAt.getTime() > Date.now()) return "monarch";
  return "free";
};

export const getBillingStatus = async (userId) => {
  const user = await User.findById(userId).select("billing email");
  if (!user) throw new AppError("User not found.", 404);
  const billing = user.billing || {};

  // Refresh provider state as a fallback if the webhook is delayed or was unavailable.
  if (billing.razorpaySubscriptionId && hasRazorpayCredentials()) {
    try {
      const providerSubscription = await razorpayRequest(
        `/subscriptions/${encodeURIComponent(billing.razorpaySubscriptionId)}`,
      );
      await applyProviderSubscription(providerSubscription, userId);
      const refreshed = await User.findById(userId).select("billing email");
      return toBillingStatus(refreshed, refreshed.billing);
    } catch (error) {
      console.warn("[BILLING] Could not refresh Razorpay subscription:", error.message);
    }
  }
  return toBillingStatus(user, billing);
};

const toBillingStatus = (user, billing = {}) => {
  const effectiveTier = getEffectiveTier(billing);
  const activePaidPlan = billing.provider === "razorpay" && billing.status === "active" &&
    (!billing.currentPeriodEnd || billing.currentPeriodEnd.getTime() > Date.now());
  const isTrialing = Boolean(!activePaidPlan && billing.trialEndsAt && billing.trialEndsAt.getTime() > Date.now());
  const accessEnd = isTrialing ? billing.trialEndsAt : billing.currentPeriodEnd;
  return {
  tier: billing.tier || "free",
  effectiveTier,
  isTrialing,
  trialStartedAt: billing.trialStartedAt || null,
  trialEndsAt: billing.trialEndsAt || null,
  trialUsed: Boolean(billing.trialUsedAt),
  hasChosenPlan: Boolean(billing.planChosenAt || getEffectiveTier(billing) !== "free"),
  daysRemaining: accessEnd && effectiveTier !== "free"
    ? Math.max(0, Math.ceil((accessEnd.getTime() - Date.now()) / 86400000))
      : 0,
  status: billing.status || "inactive",
  provider: billing.provider || null,
  currentPeriodEnd: billing.currentPeriodEnd || null,
  cancelAtCycleEnd: Boolean(billing.cancelAtCycleEnd),
  subscriptionId: billing.razorpaySubscriptionId || null,
  email: user.email,
  keyId: config.RAZORPAY_KEY_ID || null,
  };
};

export const startFreeTrial = async (userId) => {
  const now = new Date();
  const end = new Date(now.getTime() + 14 * 86400000);
  const result = await User.updateOne(
    {
      _id: userId,
      "billing.trialUsedAt": null,
      "billing.lastPaymentId": null,
      $or: [
        { "billing.razorpaySubscriptionId": null },
        { "billing.status": { $in: ["inactive", "cancelled", "completed", "expired"] } },
      ],
    },
    { $set: { "billing.trialStartedAt": now, "billing.trialEndsAt": end, "billing.trialUsedAt": now, "billing.planChosenAt": now } },
  );
  if (!result.modifiedCount) {
    throw new AppError("Your free trial has already been used or a subscription is already in progress.", 409);
  }
  return getBillingStatus(userId);
};

export const chooseFreePlan = async (userId) => {
  const user = await User.findById(userId).select("billing");
  if (!user) throw new AppError("User not found.", 404);
  if (getEffectiveTier(user.billing) !== "free") {
    throw new AppError("Your current trial or paid plan is still active.", 409);
  }
  if (
    user.billing?.razorpaySubscriptionId &&
    !["inactive", "cancelled", "completed", "expired"].includes(user.billing.status)
  ) {
    throw new AppError("Finish or cancel the pending subscription before continuing on Free.", 409);
  }
  await User.updateOne({ _id: userId }, { $set: { "billing.planChosenAt": new Date() } });
  return getBillingStatus(userId);
};

export const upgradeToMonarch = async (userId) => {
  const user = await User.findById(userId).select("billing");
  const billing = user?.billing || {};
  if (!user || billing.tier !== "hunter" || billing.status !== "active" || !billing.razorpaySubscriptionId) {
    throw new AppError("Only an active Hunter subscription can be upgraded to Monarch.", 409);
  }
  if (billing.cancelAtCycleEnd) {
    throw new AppError("Resume your scheduled cancellation before upgrading.", 409);
  }
  const planId = PLAN_DEFINITIONS.monarch.razorpayPlanId();
  if (!planId) throw new AppError("Monarch is not configured in Razorpay yet.", 503);
  const claim = await User.updateOne(
    { _id: userId, "billing.tier": "hunter", "billing.status": "active", "billing.upgradePending": { $ne: true }, "billing.cancelAtCycleEnd": { $ne: true } },
    { $set: { "billing.upgradePending": true } },
  );
  if (!claim.modifiedCount) throw new AppError("Your plan is already changing. Refresh billing and try again.", 409);
  try {
    const subscription = await razorpayRequest(`/subscriptions/${encodeURIComponent(billing.razorpaySubscriptionId)}`, {
      method: "PATCH",
      body: { plan_id: planId, schedule_change_at: "now", customer_notify: true },
    });
    await applyProviderSubscription(subscription, userId);
    await User.updateOne({ _id: userId }, { $set: { "billing.tier": "monarch", "billing.razorpayPlanId": planId } });
    return getBillingStatus(userId);
  } finally {
    await User.updateOne({ _id: userId }, { $set: { "billing.upgradePending": false } });
  }
};

export const createSubscription = async (userId, tier) => {
  assertRazorpayConfigured();
  if (!config.RAZORPAY_WEBHOOK_SECRET) {
    throw new AppError("Configure the Razorpay webhook secret before enabling checkout.", 503);
  }
  const definition = PLAN_DEFINITIONS[tier];
  if (!definition) throw new AppError("Choose a valid paid plan.", 400);
  const planId = definition.razorpayPlanId();
  if (!planId) throw new AppError(`${definition.name} is not configured in Razorpay yet.`, 503);

  const user = await User.findById(userId).select("email billing");
  if (!user) throw new AppError("User not found.", 404);
  const previousBilling = user.billing || {};
  if (
    previousBilling.razorpaySubscriptionId &&
    !["cancelled", "completed", "expired"].includes(previousBilling.status)
  ) {
    throw new AppError("A Razorpay subscription is already in progress or active.", 409);
  }

  const subscription = await razorpayRequest("/subscriptions", {
    method: "POST",
    body: {
      plan_id: planId,
      total_count: 120,
      quantity: 1,
      customer_notify: true,
      notes: { userId: String(userId), tier },
    },
  });

  const trialHistory = {
    trialStartedAt: previousBilling.trialStartedAt || null,
    trialEndsAt: previousBilling.trialEndsAt || null,
    trialUsedAt: previousBilling.trialUsedAt || null,
    planChosenAt: previousBilling.planChosenAt || new Date(),
  };
  user.billing = {
    ...trialHistory,
    tier,
    status: subscription.status || "created",
    provider: "razorpay",
    razorpaySubscriptionId: subscription.id,
    razorpayPlanId: planId,
    lastPaymentId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtCycleEnd: false,
  };
  try {
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    console.error("[BILLING] Razorpay subscription was created but its ID could not be saved to the user record", {
      name: error.name,
      code: error.code,
      message: error.message,
    });
    throw error;
  }

  return {
    subscriptionId: subscription.id,
    keyId: config.RAZORPAY_KEY_ID,
    tier,
    status: subscription.status,
    shortUrl: subscription.short_url || null,
    email: user.email,
  };
};

const safeEqualHex = (left, right) => {
  if (!/^[a-f\d]+$/i.test(left || "") || !/^[a-f\d]+$/i.test(right || "")) return false;
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export const verifyCheckout = async (userId, { subscriptionId, paymentId, signature }) => {
  assertRazorpayConfigured();
  const user = await User.findOne({
    _id: userId,
    "billing.razorpaySubscriptionId": subscriptionId,
  }).select("billing");
  if (!user) throw new AppError("This subscription does not belong to your account.", 404);

  const expected = createHmac("sha256", config.RAZORPAY_KEY_SECRET)
    .update(`${subscriptionId}|${paymentId}`)
    .digest("hex");
  if (!safeEqualHex(expected, signature)) {
    throw new AppError("Razorpay payment verification failed.", 400);
  }

  const providerSubscription = await razorpayRequest(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
  );
  providerSubscription.payment_id = paymentId;
  await applyProviderSubscription(providerSubscription, userId);
  return getBillingStatus(userId);
};

export const cancelSubscription = async (userId, atCycleEnd = true) => {
  const user = await User.findById(userId).select("billing");
  if (!user?.billing?.razorpaySubscriptionId) {
    throw new AppError("There is no Razorpay subscription to cancel.", 404);
  }
  const subscription = await razorpayRequest(
    `/subscriptions/${encodeURIComponent(user.billing.razorpaySubscriptionId)}/cancel`,
    { method: "POST", body: { cancel_at_cycle_end: Boolean(atCycleEnd) } },
  );
  await applyProviderSubscription(subscription, userId);
  return getBillingStatus(userId);
};

export const verifyWebhookSignature = (rawBody, signature) => {
  if (!config.RAZORPAY_WEBHOOK_SECRET || !Buffer.isBuffer(rawBody)) return false;
  const expected = createHmac("sha256", config.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return safeEqualHex(expected, signature);
};

export const processWebhook = async (event) => {
  const providerSubscription = event?.payload?.subscription?.entity;
  if (!providerSubscription?.id) return;
  const payment = event?.payload?.payment?.entity;
  if (payment?.id) providerSubscription.payment_id = payment.id;
  await applyProviderSubscription(providerSubscription);
};

const applyProviderSubscription = async (subscription, userId = null) => {
  if (!subscription?.id) return null;
  const status = subscription.status || "pending";
  const terminal = ["cancelled", "completed", "expired"].includes(status);
  const update = {
    "billing.status": status,
    "billing.cancelAtCycleEnd": Boolean(subscription.cancel_at_cycle_end),
    "billing.lastPaymentId": subscription.payment_id || undefined,
    "billing.currentPeriodStart": subscription.current_start
      ? new Date(subscription.current_start * 1000)
      : undefined,
    "billing.currentPeriodEnd": subscription.current_end
      ? new Date(subscription.current_end * 1000)
      : undefined,
  };
  if (subscription.plan_id) {
    update["billing.razorpayPlanId"] = subscription.plan_id;
    if (subscription.plan_id === PLAN_DEFINITIONS.monarch.razorpayPlanId()) update["billing.tier"] = "monarch";
    if (subscription.plan_id === PLAN_DEFINITIONS.hunter.razorpayPlanId()) update["billing.tier"] = "hunter";
  }
  if (terminal) update["billing.tier"] = "free";
  return User.updateOne(
    {
      "billing.razorpaySubscriptionId": subscription.id,
      ...(userId ? { _id: userId } : {}),
    },
    { $set: update },
  );
};
