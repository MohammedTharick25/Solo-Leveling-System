import { Router } from "express";
import { body } from "express-validator";
import { protect } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  cancelSubscription,
  chooseFreePlan,
  createSubscription,
  getBillingStatus,
  getPlans,
  handleWebhook,
  startFreeTrial,
  upgradeToMonarch,
  verifyCheckout,
} from "./billing.controller.js";

const router = Router();

router.post("/webhook", handleWebhook);
router.use(protect);
router.get("/plans", getPlans);
router.get("/me", getBillingStatus);
router.post("/trial", startFreeTrial);
router.post("/free", chooseFreePlan);
router.post("/upgrade", upgradeToMonarch);
router.post(
  "/subscriptions",
  [body("tier").isIn(["hunter", "monarch"]).withMessage("Choose a paid plan."), validate],
  createSubscription,
);
router.post(
  "/verify",
  [
    body("razorpay_subscription_id").isString().notEmpty(),
    body("razorpay_payment_id").isString().notEmpty(),
    body("razorpay_signature").isString().notEmpty(),
    validate,
  ],
  verifyCheckout,
);
router.post("/cancel", cancelSubscription);

export default router;
