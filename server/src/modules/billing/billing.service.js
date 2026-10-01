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
  if (billing?.tier === "monarch" && billing.upgradeAccessUntil?.getTime() > Date.now()) return "monarch";
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
  if (
    billing.razorpaySubscriptionId && hasRazorpayCredentials() &&
    !(billing.status === "cancelled" && billing.upgradeAccessUntil > new Date())
  ) {
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
  const accessEnd = isTrialing ? billing.trialEndsAt : billing.upgradeAccessUntil || billing.currentPeriodEnd;
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
  currentPeriodStart: billing.currentPeriodStart || null,
  currentPeriodEnd: billing.currentPeriodEnd || null,
  cancelAtCycleEnd: Boolean(billing.cancelAtCycleEnd),
  pendingTier: billing.pendingTier || null,
  pendingTierEffectiveAt: billing.pendingTierEffectiveAt || null,
  upgradeAccessUntil: billing.upgradeAccessUntil || null,
  upgradeCreditAmount: billing.upgradeCreditAmount ?? null,
  upgradeConvertedDays: billing.upgradeConvertedDays ?? null,
  upgradePendingSubscriptionId: billing.upgradePendingSubscriptionId || null,
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
  assertRazorpayConfigured();
  const user = await User.findById(userId).select("billing email");
  const billing = user?.billing || {};
  if (!user || billing.tier !== "hunter" || billing.status !== "active" || !billing.razorpaySubscriptionId) {
    throw new AppError("Only an active Hunter subscription can be upgraded to Monarch.", 409);
  }
  if (billing.cancelAtCycleEnd) throw new AppError("Resume your scheduled cancellation before upgrading.", 409);
  if (billing.upgradePendingSubscriptionId) {
    return {
      subscriptionId: billing.upgradePendingSubscriptionId,
      keyId: config.RAZORPAY_KEY_ID,
      email: user.email,
      tier: "monarch",
      creditAmount: billing.upgradePendingCreditAmount || 0,
      currency: "INR",
      accessUntil: billing.upgradePendingAccessUntil,
      convertedDays: billing.upgradePendingAccessUntil
        ? billing.upgradePendingConvertedDays || 0
        : 0,
    };
  }
  const planId = PLAN_DEFINITIONS.monarch.razorpayPlanId();
  const hunterPlanId = PLAN_DEFINITIONS.hunter.razorpayPlanId();
  if (!planId || !hunterPlanId) throw new AppError("Both paid plans must be configured in Razorpay before upgrading.", 503);
  const claim = await User.updateOne(
    { _id: userId, "billing.tier": "hunter", "billing.status": "active", "billing.upgradePending": { $ne: true }, "billing.upgradePendingSubscriptionId": null, "billing.cancelAtCycleEnd": { $ne: true } },
    { $set: { "billing.upgradePending": true } },
  );
  if (!claim.modifiedCount) throw new AppError("Your plan is already changing. Refresh billing and try again.", 409);
  try {
    const existingSubscription = await razorpayRequest(`/subscriptions/${encodeURIComponent(billing.razorpaySubscriptionId)}`);
    if (existingSubscription.has_scheduled_changes) {
      await razorpayRequest(`/subscriptions/${encodeURIComponent(billing.razorpaySubscriptionId)}/cancel_scheduled_changes`, { method: "POST" });
    }
    if (billing.pendingTier) await User.updateOne({ _id: userId }, { $set: { "billing.pendingTier": null, "billing.pendingTierEffectiveAt": null } });
    const currentPeriodStart = existingSubscription.current_start
      ? new Date(existingSubscription.current_start * 1000)
      : billing.currentPeriodStart;
    const currentPeriodEnd = existingSubscription.current_end
      ? new Date(existingSubscription.current_end * 1000)
      : billing.currentPeriodEnd;
    if (!currentPeriodStart || !currentPeriodEnd || currentPeriodEnd <= new Date() || currentPeriodEnd <= currentPeriodStart) {
      throw new AppError("We could not determine the remaining Hunter time. Refresh billing and try again.", 409);
    }
    const [hunterPlan, monarchPlan] = await Promise.all([
      razorpayRequest(`/plans/${encodeURIComponent(hunterPlanId)}`),
      razorpayRequest(`/plans/${encodeURIComponent(planId)}`),
    ]);
    const hunterAmount = Number(hunterPlan.item?.amount);
    const monarchAmount = Number(monarchPlan.item?.amount);
    const hunterCurrency = hunterPlan.item?.currency || "INR";
    const monarchCurrency = monarchPlan.item?.currency || "INR";
    if (!Number.isFinite(hunterAmount) || !Number.isFinite(monarchAmount) || hunterAmount <= 0 || monarchAmount <= 0) {
      throw new AppError("Razorpay returned invalid plan pricing. Contact support before upgrading.", 503);
    }
    if (hunterCurrency !== monarchCurrency) throw new AppError("Hunter and Monarch plans must use the same currency for time-credit upgrades.", 409);
    if (hunterPlan.period !== "monthly" || monarchPlan.period !== "monthly" || hunterPlan.interval !== 1 || monarchPlan.interval !== 1) {
      throw new AppError("Converted-time upgrades currently require both plans to bill monthly.", 409);
    }

    const now = new Date();
    const periodStart = currentPeriodStart.getTime();
    const periodEnd = currentPeriodEnd.getTime();
    const periodMs = periodEnd - periodStart;
    const remainingMs = Math.max(0, periodEnd - now.getTime());
    const creditAmount = Math.min(hunterAmount, Math.floor(hunterAmount * remainingMs / periodMs));
    const nextMonth = new Date(now);
    const originalDay = nextMonth.getUTCDate();
    nextMonth.setUTCDate(1);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    const lastDayOfNextMonth = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0)).getUTCDate();
    nextMonth.setUTCDate(Math.min(originalDay, lastDayOfNextMonth));
    const monarchCycleMs = nextMonth.getTime() - now.getTime();
    const convertedMs = Math.floor(monarchCycleMs * creditAmount / monarchAmount);
    const accessUntil = new Date(now.getTime() + convertedMs);
    const startAt = Math.ceil(accessUntil.getTime() / 1000);

    const subscription = await razorpayRequest("/subscriptions", {
      method: "POST",
      body: {
        plan_id: planId,
        total_count: 120,
        quantity: 1,
        start_at: startAt,
        customer_notify: true,
        notes: { userId: String(userId), tier: "monarch", upgradeFrom: billing.razorpaySubscriptionId },
      },
    });
    await User.updateOne({ _id: userId }, { $set: {
      "billing.upgradePendingSubscriptionId": subscription.id,
      "billing.upgradePendingOldSubscriptionId": billing.razorpaySubscriptionId,
      "billing.upgradePendingAccessUntil": accessUntil,
      "billing.upgradePendingCreditAmount": creditAmount,
      "billing.upgradePendingConvertedDays": convertedMs / 86400000,
      "billing.upgradePending": false,
    } });
    return {
      subscriptionId: subscription.id,
      keyId: config.RAZORPAY_KEY_ID,
      email: user.email,
      tier: "monarch",
      creditAmount,
      currency: monarchCurrency,
      accessUntil,
      convertedDays: convertedMs / 86400000,
    };
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
  const user = await User.findById(userId).select("billing email");
  if (!user) throw new AppError("This subscription does not belong to your account.", 404);

  const expected = createHmac("sha256", config.RAZORPAY_KEY_SECRET)
    .update(`${subscriptionId}|${paymentId}`)
    .digest("hex");
  if (!safeEqualHex(expected, signature)) {
    throw new AppError("Razorpay payment verification failed.", 400);
  }

  if (user.billing?.upgradePendingSubscriptionId === subscriptionId) {
    const upgradeSubscription = await razorpayRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
    if (upgradeSubscription.plan_id !== PLAN_DEFINITIONS.monarch.razorpayPlanId() || upgradeSubscription.notes?.userId !== String(userId)) {
      throw new AppError("The Monarch upgrade subscription could not be verified.", 400);
    }
    if (!["authenticated", "active"].includes(upgradeSubscription.status)) {
      throw new AppError("Razorpay has not confirmed the new payment mandate yet. Try again shortly.", 409);
    }

    const oldSubscriptionId = user.billing.upgradePendingOldSubscriptionId;
    if (!oldSubscriptionId || oldSubscriptionId !== user.billing.razorpaySubscriptionId) {
      throw new AppError("Your Hunter subscription changed during this upgrade. Refresh billing and try again.", 409);
    }
    try {
      await razorpayRequest(`/subscriptions/${encodeURIComponent(oldSubscriptionId)}/cancel`, {
        method: "POST",
        body: { cancel_at_cycle_end: false },
      });
    } catch {
      let stagedSubscriptionCancelled = false;
      try {
        await razorpayRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
          method: "POST",
          body: { cancel_at_cycle_end: false },
        });
        stagedSubscriptionCancelled = true;
      } catch (cleanupError) {
        console.error("[BILLING] Could not cancel the staged Monarch subscription after Hunter cancellation failed", cleanupError.message);
      }
      if (stagedSubscriptionCancelled) await User.updateOne({ _id: userId, "billing.upgradePendingSubscriptionId": subscriptionId }, { $set: {
        "billing.upgradePendingSubscriptionId": null,
        "billing.upgradePendingOldSubscriptionId": null,
        "billing.upgradePendingAccessUntil": null,
        "billing.upgradePendingCreditAmount": null,
        "billing.upgradePendingConvertedDays": null,
        "billing.upgradePending": false,
      } });
      throw new AppError("We could not safely replace your Hunter subscription. No plan change was applied; contact support if Razorpay shows a new mandate.", 502);
    }

    const accessUntil = user.billing.upgradePendingAccessUntil;
    await User.updateOne({ _id: userId, "billing.upgradePendingSubscriptionId": subscriptionId }, { $set: {
      "billing.tier": "monarch",
      "billing.status": upgradeSubscription.status,
      "billing.provider": "razorpay",
      "billing.razorpaySubscriptionId": subscriptionId,
      "billing.razorpayPlanId": upgradeSubscription.plan_id,
      "billing.lastPaymentId": paymentId,
      "billing.currentPeriodStart": new Date(),
      "billing.currentPeriodEnd": accessUntil,
      "billing.upgradeAccessUntil": accessUntil,
      "billing.upgradeCreditAmount": user.billing.upgradePendingCreditAmount || 0,
      "billing.upgradeConvertedDays": user.billing.upgradePendingConvertedDays || 0,
      "billing.cancelAtCycleEnd": false,
      "billing.pendingTier": null,
      "billing.pendingTierEffectiveAt": null,
      "billing.upgradePendingSubscriptionId": null,
      "billing.upgradePendingOldSubscriptionId": null,
      "billing.upgradePendingAccessUntil": null,
      "billing.upgradePendingCreditAmount": null,
      "billing.upgradePendingConvertedDays": null,
      "billing.upgradePending": false,
    } });
    return getBillingStatus(userId);
  }

  if (user.billing?.razorpaySubscriptionId !== subscriptionId) {
    throw new AppError("This subscription does not belong to your account.", 404);
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
  if (user.billing.upgradePendingSubscriptionId) {
    await razorpayRequest(`/subscriptions/${encodeURIComponent(user.billing.upgradePendingSubscriptionId)}/cancel`, {
      method: "POST", body: { cancel_at_cycle_end: false },
    });
    await User.updateOne({ _id: userId }, { $set: {
      "billing.upgradePendingSubscriptionId": null,
      "billing.upgradePendingOldSubscriptionId": null,
      "billing.upgradePendingAccessUntil": null,
      "billing.upgradePendingCreditAmount": null,
      "billing.upgradePendingConvertedDays": null,
    } });
  }
  if (user.billing.upgradeAccessUntil && user.billing.upgradeAccessUntil > new Date()) {
    const subscription = await razorpayRequest(
      `/subscriptions/${encodeURIComponent(user.billing.razorpaySubscriptionId)}/cancel`,
      { method: "POST", body: { cancel_at_cycle_end: false } },
    );
    await applyProviderSubscription(subscription, userId);
    await User.updateOne({ _id: userId }, { $set: {
      "billing.tier": "monarch",
      "billing.status": "cancelled",
      "billing.currentPeriodEnd": user.billing.upgradeAccessUntil,
      "billing.upgradeAccessUntil": user.billing.upgradeAccessUntil,
      "billing.cancelAtCycleEnd": true,
    } });
    return getBillingStatus(userId);
  }
  const subscription = await razorpayRequest(
    `/subscriptions/${encodeURIComponent(user.billing.razorpaySubscriptionId)}/cancel`,
    { method: "POST", body: { cancel_at_cycle_end: Boolean(atCycleEnd) } },
  );
  await applyProviderSubscription(subscription, userId);
  if (atCycleEnd) {
    await User.updateOne({ _id: userId }, { $set: { "billing.pendingTier": null, "billing.pendingTierEffectiveAt": null } });
  }
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
    if (subscription.plan_id === PLAN_DEFINITIONS.monarch.razorpayPlanId()) {
      update["billing.tier"] = "monarch";
      update["billing.pendingTier"] = null;
      update["billing.pendingTierEffectiveAt"] = null;
    }
    if (subscription.plan_id === PLAN_DEFINITIONS.hunter.razorpayPlanId()) update["billing.tier"] = "hunter";
  }
  if (status === "active" && subscription.current_start) update["billing.upgradeAccessUntil"] = null;
  const filter = {
    "billing.razorpaySubscriptionId": subscription.id,
    ...(userId ? { _id: userId } : {}),
  };
  const result = await User.updateOne(filter, { $set: update });
  if (terminal) {
    await User.updateOne({
      ...filter,
      "billing.upgradeAccessUntil": { $gt: new Date() },
    }, { $set: { "billing.cancelAtCycleEnd": true } });
    await User.updateOne({
      ...filter,
      $or: [
        { "billing.upgradeAccessUntil": null },
        { "billing.upgradeAccessUntil": { $lte: new Date() } },
      ],
    }, { $set: {
      "billing.tier": "free",
      "billing.pendingTier": null,
      "billing.pendingTierEffectiveAt": null,
      "billing.upgradeAccessUntil": null,
    } });
  }
  return result;
};
