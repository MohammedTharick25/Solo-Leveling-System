import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import User from "../src/modules/user/user.model.js";
import { getBillingStatus } from "../src/modules/billing/billing.service.js";
import { requirePlan } from "../src/middleware/requirePlan.middleware.js";
import { PREMIUM_FEATURES, hasTierAccess } from "../../client/src/lib/planAccess.js";

const originalFindById = User.findById;
let currentUser;

beforeEach(() => {
  User.findById = () => ({ select: async () => currentUser });
});

after(() => {
  User.findById = originalFindById;
});

const setUserBilling = (billing) => {
  currentUser = { _id: "test-user", email: "plan-flow@example.invalid", billing };
};

const checkPlanGate = async (minimumTier) => {
  let nextError = null;
  let passed = false;
  await requirePlan(minimumTier)({ userId: "test-user" }, {}, (error) => {
    nextError = error || null;
    passed = !error;
  });
  return { nextError, passed };
};

test("a selected Free plan keeps core access and blocks Hunter and Monarch APIs", async () => {
  setUserBilling({ tier: "free", planChosenAt: new Date() });
  const status = await getBillingStatus("test-user");

  assert.equal(status.effectiveTier, "free");
  assert.equal(status.hasChosenPlan, true);
  assert.equal((await checkPlanGate("free")).passed, true);
  assert.equal((await checkPlanGate("hunter")).nextError.statusCode, 403);
  assert.equal((await checkPlanGate("monarch")).nextError.statusCode, 403);
});

test("an active Monarch trial grants Monarch access and expires back to Free", async () => {
  const now = Date.now();
  setUserBilling({
    tier: "free",
    trialStartedAt: new Date(now - 1000),
    trialEndsAt: new Date(now + 86400000),
    trialUsedAt: new Date(now - 1000),
    planChosenAt: new Date(now - 1000),
  });
  const trialStatus = await getBillingStatus("test-user");

  assert.equal(trialStatus.effectiveTier, "monarch");
  assert.equal(trialStatus.isTrialing, true);
  assert.equal((await checkPlanGate("monarch")).passed, true);

  currentUser.billing.trialEndsAt = new Date(now - 1000);
  const expiredStatus = await getBillingStatus("test-user");
  assert.equal(expiredStatus.effectiveTier, "free");
  assert.equal(expiredStatus.isTrialing, false);
  assert.equal((await checkPlanGate("hunter")).nextError.statusCode, 403);
});

test("active Hunter access includes Hunter features but not Monarch features", async () => {
  setUserBilling({
    tier: "hunter",
    provider: "razorpay",
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 86400000),
    planChosenAt: new Date(),
  });
  const status = await getBillingStatus("test-user");

  assert.equal(status.effectiveTier, "hunter");
  assert.equal(status.isTrialing, false);
  assert.equal((await checkPlanGate("hunter")).passed, true);
  assert.equal((await checkPlanGate("monarch")).nextError.statusCode, 403);
});

test("an unexpired Monarch trial stays in sync with active Hunter billing access", async () => {
  setUserBilling({
    tier: "hunter",
    provider: "razorpay",
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    trialEndsAt: new Date(Date.now() + 86400000),
  });
  const status = await getBillingStatus("test-user");

  assert.equal(status.effectiveTier, "monarch");
  assert.equal(status.isTrialing, true);
  assert.equal((await checkPlanGate("monarch")).passed, true);
});

test("active Monarch billing and converted Monarch access pass the Monarch gate", async () => {
  setUserBilling({
    tier: "monarch",
    provider: "razorpay",
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 86400000),
  });
  assert.equal((await getBillingStatus("test-user")).effectiveTier, "monarch");
  assert.equal((await checkPlanGate("monarch")).passed, true);

  currentUser.billing = {
    tier: "monarch",
    status: "cancelled",
    upgradeAccessUntil: new Date(Date.now() + 86400000),
  };
  const convertedStatus = await getBillingStatus("test-user");
  assert.equal(convertedStatus.effectiveTier, "monarch");
  assert.equal((await checkPlanGate("monarch")).passed, true);
});

test("expired paid access returns to Free", async () => {
  setUserBilling({
    tier: "monarch",
    provider: "razorpay",
    status: "active",
    currentPeriodEnd: new Date(Date.now() - 1000),
  });
  assert.equal((await getBillingStatus("test-user")).effectiveTier, "free");
  assert.equal((await checkPlanGate("monarch")).nextError.statusCode, 403);
});

test("the client feature catalog uses the same Hunter and Monarch access tiers", () => {
  for (const feature of ["analytics", "ai-coach", "bosses"]) {
    assert.equal(PREMIUM_FEATURES[feature].requiredTier, "hunter");
  }
  for (const feature of ["brain", "shadows", "dungeons", "raids"]) {
    assert.equal(PREMIUM_FEATURES[feature].requiredTier, "monarch");
  }

  assert.equal(hasTierAccess("free", "free"), true);
  assert.equal(hasTierAccess("free", "hunter"), false);
  assert.equal(hasTierAccess("hunter", "hunter"), true);
  assert.equal(hasTierAccess("hunter", "monarch"), false);
  assert.equal(hasTierAccess("monarch", "monarch"), true);
});
