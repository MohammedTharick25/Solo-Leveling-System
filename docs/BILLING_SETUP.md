# Razorpay subscriptions

The app uses Razorpay Subscriptions for recurring billing. It does not store card details.

## Configure test mode

1. Create a **Hunter** and a **Monarch** recurring plan in the Razorpay Dashboard in test mode. Set each plan's amount and billing period there; the app reads those details from Razorpay.
2. Copy the Razorpay test key ID and key secret, plus both plan IDs, into `server/.env` using `server/.env.example` as a guide. Never commit real credentials.
3. Create a Razorpay webhook pointing to `https://<your-api-host>/api/v1/billing/webhook`. Add a webhook secret to `RAZORPAY_WEBHOOK_SECRET` and enable `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, and `subscription.completed`.
4. Restart the API and open **Plans & Billing** while signed in. Paid checkout stays disabled until the key, webhook secret, and matching plan IDs are configured.

The app verifies checkout signatures on the server and uses signed webhooks as the source of subscription status. A verified checkout authorization alone does not grant paid access; access becomes active after Razorpay reports an active subscription.

Use test credentials and test plans until the complete checkout and cancellation flow has been verified. Configure live keys and live plan IDs only when ready to accept real payments.
