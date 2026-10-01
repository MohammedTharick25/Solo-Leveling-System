import User from "../modules/user/user.model.js";
import { AppError } from "./errorHandler.middleware.js";

const TIER_RANK = { free: 0, hunter: 1, monarch: 2 };

export const requirePlan = (minimumTier = "hunter") => async (req, _res, next) => {
  try {
    const user = await User.findById(req.userId).select("billing");
    if (!user) throw new AppError("User not found.", 404);

    const billing = user.billing || {};
    const periodIsValid = !billing.currentPeriodEnd || billing.currentPeriodEnd.getTime() > Date.now();
    const trialIsValid = billing.trialEndsAt && billing.trialEndsAt.getTime() > Date.now();
    const convertedCreditIsValid = billing.tier === "monarch" && billing.upgradeAccessUntil && billing.upgradeAccessUntil.getTime() > Date.now();
    const activeTier = trialIsValid || convertedCreditIsValid
      ? "monarch"
      : billing.provider === "razorpay" && billing.status === "active" && periodIsValid
        ? billing.tier
        : "free";

    if ((TIER_RANK[activeTier] || 0) < (TIER_RANK[minimumTier] || 1)) {
      throw new AppError(`This feature requires the ${minimumTier === "monarch" ? "Monarch" : "Hunter"} plan.`, 403);
    }

    req.subscriptionTier = activeTier;
    next();
  } catch (error) {
    next(error);
  }
};
