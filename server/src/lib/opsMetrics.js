const counters = {
  schedulerFailures: 0,
  aiQuestFallbacks: 0,
  billingWebhookSuccesses: 0,
  billingWebhookFailures: 0,
};
const recentEvents = [];
const MAX_RECENT_EVENTS = 30;
const startedAt = Date.now();

const incrementCounter = (area, status) => {
  if (area === "scheduler" && status === "error") counters.schedulerFailures += 1;
  if (area === "ai" && status === "fallback") counters.aiQuestFallbacks += 1;
  if (area === "billing_webhook" && status === "success") counters.billingWebhookSuccesses += 1;
  if (area === "billing_webhook" && status === "error") counters.billingWebhookFailures += 1;
};

export const recordOpsEvent = (area, event, status, error = null) => {
  incrementCounter(area, status);
  const entry = {
    timestamp: new Date().toISOString(),
    area,
    event,
    status,
    ...(error && {
      errorType: error.name || "Error",
      ...(error.code !== undefined && { errorCode: String(error.code).slice(0, 40) }),
    }),
  };
  recentEvents.unshift(entry);
  if (recentEvents.length > MAX_RECENT_EVENTS) recentEvents.length = MAX_RECENT_EVENTS;
  const output = JSON.stringify({ level: status === "error" ? "error" : "info", ...entry });
  (status === "error" ? console.error : console.info)(`[OPS] ${output}`);
};

export const getOpsMetrics = () => ({
  uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  counters: { ...counters },
  recentEvents: recentEvents.map((event) => ({ ...event })),
  note: "Counters and recent events are local to this server process and reset on restart.",
});
