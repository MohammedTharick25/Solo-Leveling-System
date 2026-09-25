import config from "../../config/env.js";
import { SYSTEM_PROMPT } from "./ai.prompts.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const callGroq = async ({ messages, json = false }) => {
  if (!config.GROQ_API_KEY) return null;

  const body = {
    model: config.GROQ_MODEL,
    messages,
    temperature: 0.6,
    max_completion_tokens: config.AI_MAX_OUTPUT_TOKENS,
  };

  if (json) body.response_format = { type: "json_object" };

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || `AI provider returned ${response.status}.`;
    const error = new Error(message);
    error.statusCode = response.status === 429 ? 429 : 502;
    throw error;
  }

  return payload?.choices?.[0]?.message?.content?.trim() || "";
};

export const generateText = async ({ question, context }) => {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `USER QUESTION:\n${question}\n\nCURRENT HUNTER CONTEXT:\n${JSON.stringify(context, null, 2)}\n\nAnswer directly and finish with one practical next action when useful.`,
    },
  ];

  return callGroq({ messages });
};

export const generateJSON = async ({ prompt }) => {
  const content = await callGroq({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    json: true,
  });

  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch {
    const cleaned = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(cleaned);
  }
};

export const isCloudAIConfigured = () => Boolean(config.GROQ_API_KEY);
