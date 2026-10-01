import { AppError } from "../../middleware/errorHandler.middleware.js";
import { asyncHandler, sendSuccess } from "../../lib/helpers.js";
import * as billingService from "./billing.service.js";

export const getPlans = asyncHandler(async (_req, res) => {
  sendSuccess(res, await billingService.getPlans(), "Billing plans retrieved.");
});

export const getBillingStatus = asyncHandler(async (req, res) => {
  sendSuccess(res, await billingService.getBillingStatus(req.userId), "Billing status retrieved.");
});

export const createSubscription = asyncHandler(async (req, res) => {
  const subscription = await billingService.createSubscription(req.userId, req.body.tier);
  sendSuccess(res, { subscription }, "Razorpay subscription created.", 201);
});

export const verifyCheckout = asyncHandler(async (req, res) => {
  const billing = await billingService.verifyCheckout(req.userId, {
    subscriptionId: req.body.razorpay_subscription_id,
    paymentId: req.body.razorpay_payment_id,
    signature: req.body.razorpay_signature,
  });
  sendSuccess(res, { billing }, "Razorpay checkout verified.");
});

export const cancelSubscription = asyncHandler(async (req, res) => {
  const billing = await billingService.cancelSubscription(req.userId, true);
  sendSuccess(res, { billing }, "Subscription cancellation scheduled.");
});

export const handleWebhook = asyncHandler(async (req, res) => {
  if (!billingService.verifyWebhookSignature(req.rawBody, req.get("x-razorpay-signature"))) {
    throw new AppError("Invalid Razorpay webhook signature.", 400);
  }
  let event;
  try {
    event = JSON.parse(req.rawBody.toString("utf8"));
  } catch {
    throw new AppError("Invalid Razorpay webhook payload.", 400);
  }
  await billingService.processWebhook(event);
  res.status(200).json({ status: "success", message: "Webhook received." });
});
