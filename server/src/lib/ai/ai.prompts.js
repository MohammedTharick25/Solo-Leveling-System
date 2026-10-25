export const SYSTEM_PROMPT = `You are the personal AI Coach inside Solo Leveling System, a productivity application.

Your job is to help the user make practical progress using their real productivity data.
Rules:
- Be concise, practical, friendly, and specific.
- Never invent user data. If data is missing, say so.
- Prefer the smallest useful next step over a huge plan.
- Use the user's goals, quests, habits, focus sessions, journal patterns, level, XP and stats when relevant.
- Do not shame the user for missed tasks or low streaks.
- Keep the Solo Leveling theme subtle. Use words like quest or mission naturally, not in every sentence.
- Do not talk about being an AI model, provider, API, database, prompt, system implementation, or internal configuration unless the user explicitly asks about the technology.
- Do not expose private/internal data that is not relevant to the user's question.
- Do not provide medical, financial, legal, or other professional advice as if you were a professional.
- For plans, use short headings and bullet points. Avoid Markdown tables because they are harder to read on phones.
- Keep normal answers under about 250 words unless the user asks for detail.
- Use Markdown headings (##), bold text, bullets, and numbered steps when helpful.
- Finish with one clear next action when appropriate.`;



export const buildDailyQuestPrompt = ({ user, hunter, stats, currentDate, statTargets = [] }) => `
  Create exactly 5 personalized daily quests for this user as today's actions inside a progressive training plan.

This is the user's first-party productivity profile collected during onboarding. Treat it as the primary source for personalization.

DATE: ${currentDate}

PROFILE:
${JSON.stringify(user, null, 2)}

HUNTER PROGRESSION:
${JSON.stringify(hunter, null, 2)}

CURRENT STATS:
${JSON.stringify(stats || {}, null, 2)}

TODAY'S TARGETING ORDER:
${JSON.stringify(statTargets, null, 2)}

  TRAINING PLAN RULES:
  - First infer the user's likely starting level, desired outcome, constraints, and the most useful next skill from their profile. Do not ask the user to repeat information already provided.
  - Build quest 1 around the user's primary goal. Build quests 2–5 around the supplied lowest-stat targets, in order. These targets are recalculated from current stats every day. Each task must genuinely exercise its assigned stat and category; do not give all tasks the same category.
  - Use the supplied target stat and current value as the authoritative daily priorities. Low values need approachable practice; increase challenge gradually as a stat improves.
  - Choose the strongest relevant established learning path or practical curriculum for their stated goal (for example, programming fundamentals before projects, or progressive strength and mobility work for fitness). Adapt it to their level and time; do not claim a named certification or source unless certain.
  - Arrange today's 5 quests as connected steps: learn a small concept, practice it, produce/check an outcome, and reinforce the habit. At least 3 must advance the user's primary goal. Avoid generic filler such as unrelated journaling or exercise when it does not support their priority.
  - Treat this as a sequence that continues across days. Advance from foundations to guided practice, independent work, and progressively harder projects. Use available completed quest history supplied in the profile to avoid repeating mastered work and to increase difficulty gradually.
  - Make each task specific enough to start immediately, with a visible deliverable or check for completion. Include the reason it advances the plan.
  - Never exceed the user's available daily minutes in total; if time is limited, create shorter focused steps.

  QUEST DESIGN RULES:
- Return exactly 5 quests. Never return 4, 6, or more.
- Every quest must clearly connect to at least one onboarding goal, learning interest, strength, weakness, schedule, fitness level, occupation/student status, long-term vision, or available daily time.
- Do not invent goals or personal details that are not in the profile.
- Balance the 5 quests around the user's actual priorities. Do not make all 5 generic productivity tasks.
- Keep the total expected active effort realistic for the user's availableDailyMinutes.
- Prefer small actions that can realistically be completed today.
- Use different categories when appropriate, but prioritize the user's goals over forced variety.
- Quests must be concrete and measurable.
- Avoid duplicate or near-duplicate quests.
- Do not create tasks that require paid services, subscriptions, or special equipment.
- Do not mention AI, Groq, models, APIs, databases, prompts, or internal implementation.
- Keep titles short and user-friendly.
- XP should normally be between 30 and 100.
- targetValue must match the unit. For session/entry use 1. For minutes use a realistic number.
- difficulty must be one of F, E, D, C, B, A, S. Use E/D for normal daily actions.

VALID CATEGORIES:
focus, discipline, health, learning, communication, leadership, productivity, creativity, finance, emotionalControl, timeManagement

VALID STATS:
strength, agility, intelligence, vitality, sense, discipline, communication, leadership, creativity, financialIntelligence, problemSolving, emotionalControl, timeManagement

RETURN JSON ONLY:
{
  "quests": [
    {
      "title": "short quest title",
      "description": "clear instruction the user can follow today",
      "purpose": "why this helps the user's actual goal",
      "category": "learning",
      "difficulty": "E",
      "xpReward": 50,
      "targetValue": 20,
      "unit": "minutes",
      "stat": "intelligence",
      "statAmount": 3,
      "expectedOutcome": "what completing it should achieve"
    }
  ]
}
`;

export const buildChatPrompt = ({ question, context }) => `
USER QUESTION:
${question}

CURRENT USER CONTEXT:
${JSON.stringify(context, null, 2)}

Answer the user directly. Use their actual context. Format the answer for easy reading on a phone: short paragraphs, headings, bullets, and numbered steps. Do not use a Markdown table.
`;

export const buildNextActionPrompt = (context) => `
Based on this user's current data, choose the single most useful next action they can complete in 15-60 minutes.
If selectedGoal is present, work only toward that goal. Prefer an unfinished active quest linked to it and use the quest title exactly. Otherwise prefer an unfinished active quest linked to any active goal and name that goal in the reason. If no goal-linked quest is active, use the next incomplete milestone from an active goal to suggest a practical first step. Keep the suggested workload small when recent focus or energy data is low.
Return JSON only with this shape:
{
  "title": "short action title",
  "reason": "one short reason grounded in the data",
  "durationMinutes": 30,
  "category": "learning|health|focus|discipline|personal|other",
  "xpEstimate": 50
}

USER CONTEXT:
${JSON.stringify(context, null, 2)}
`;

export const buildGoalBreakdownPrompt = ({ goal, context }) => `
Break this goal into a practical progression using the user's current context.
GOAL: ${goal}

Return JSON only:
{
  "goal": "...",
  "whyItMatters": "...",
  "milestones": [
    {
      "title": "...",
      "description": "...",
      "quests": ["small quest", "small quest"]
    }
  ],
  "firstQuest": "the smallest action to start today"
}

USER CONTEXT:
${JSON.stringify(context, null, 2)}
`;
