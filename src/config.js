// src/config.js

// =================================================================
//  CORE GAME MECHANICS CONSTANTS
// =================================================================
export const INITIAL_XP_FOR_LEVEL_UP = 100;
export const XP_MULTIPLIER = 1.5;

export const INITIAL_PILLAR_XP_FOR_LEVEL_UP = 50;
export const PILLAR_XP_MULTIPLIER = 1.4;

export const INITIAL_HP = 100;
export const HP_REGENERATION_PER_DAY = 100; // Full HP regen daily

export const NUMBER_OF_RANDOM_DAILY_TASKS = 10; // How many random dailies to generate

// =================================================================
//  LIFE PILLAR DEFINITIONS (For Pillar Quests & XP)
// =================================================================
export const PILLAR_DEFINITIONS = {
  health: {
    name: "Health & Fitness",
    icon: "❤️",
    color: "#e74c3c",
    tasks: [ // Example tasks for pillar-specific quest generation
      { text: "Complete 25 Advanced Push-ups", pillarXp: 20, mainXp: 3, type: "MAIN", penaltyHp: 0 },
      { text: "Go for a 30-minute high-intensity run", pillarXp: 25, mainXp: 4, type: "MAIN", penaltyHp: 0 },
      { text: "Hold a challenging yoga pose for 2 minutes", pillarXp: 15, mainXp: 2, type: "MAIN", penaltyHp: 0 },
    ],
  },
  productivity: {
    name: "Productivity & Focus",
    icon: "🚀",
    color: "#3498db",
    tasks: [
      { text: "Complete two 25-minute Pomodoro focus sessions back-to-back", pillarXp: 25, mainXp: 4, type: "MAIN", penaltyHp: 0 },
      { text: "Deep work: Dedicate 90 uninterrupted minutes to a single important task", pillarXp: 30, mainXp: 5, type: "MAIN", penaltyHp: 0 },
    ],
  },
  learning: {
    name: "Learning & Growth",
    icon: "🧠",
    color: "#f1c40f",
    tasks: [
      { text: "Read and summarize an academic paper on a new topic", pillarXp: 25, mainXp: 4, type: "MAIN", penaltyHp: 0 },
      { text: "Complete an entire module of an online course", pillarXp: 30, mainXp: 5, type: "MAIN", penaltyHp: 0 },
    ],
  },
  mindfulness: {
    name: "Mindfulness & Wellbeing",
    icon: "🧘",
    color: "#2ecc71",
    tasks: [
      { text: "Practice 20 minutes of silent meditation", pillarXp: 20, mainXp: 3, type: "MAIN", penaltyHp: 0 },
      { text: "Write a detailed letter of gratitude to someone", pillarXp: 15, mainXp: 2, type: "MAIN", penaltyHp: 0 },
    ],
  },
};

export const initialPillarsState = Object.keys(PILLAR_DEFINITIONS).reduce((acc, pillarKey) => {
  acc[pillarKey] = {
    level: 1,
    xp: 0,
    nextLevelXp: INITIAL_PILLAR_XP_FOR_LEVEL_UP,
    name: PILLAR_DEFINITIONS[pillarKey].name,
    icon: PILLAR_DEFINITIONS[pillarKey].icon,
    color: PILLAR_DEFINITIONS[pillarKey].color,
  };
  return acc;
}, {});


// =================================================================
//  THE BIG POOL OF ALL POSSIBLE DAILY TASKS, SORTED BY CATEGORY
// =================================================================

// --- Category 1: Physical Health (20 Tasks) ---
const PHYSICAL_HEALTH_TASKS = [
    "Go for a 30-minute brisk walk or jog.",
    "Do 15 minutes of stretching (focus on neck, shoulders, and back).",
    "Drink 8 glasses of water throughout the day.",
    "Stand up and walk around for 5 minutes every hour.",
    "Try a 10-minute bodyweight workout (squats, push-ups, planks).",
    "Eat at least one piece of fruit.",
    "Prepare a healthy lunch instead of ordering out.",
    "Get 15 minutes of direct sunlight.",
    "Fix your posture while sitting at your desk for an hour.",
    "Try a 7-minute workout video from YouTube.",
    "Avoid sugary drinks for the entire day.",
    "Take the stairs instead of the elevator.",
    "Do 20 jumping jacks to get your heart rate up.",
    "Eat a vegetable with every meal.",
    "End your shower with 30 seconds of cold water.",
    "Go to bed 15 minutes earlier than usual.",
    "Foam roll your legs and back.",
    "Practice deep breathing exercises for 5 minutes.",
    "Try a new healthy recipe for dinner.",
    "Do a 20-minute yoga or pilates session online."
];

// --- Category 2: Mental Health (20 Tasks) ---
const MENTAL_HEALTH_TASKS = [
    "Practice 10 minutes of guided meditation (use an app or YouTube).",
    "Write down three things you are grateful for.",
    "Journal for 15 minutes about your thoughts and feelings.",
    "Spend 30 minutes on a hobby that isn't screen-related.",
    "Call or text a friend or family member just to chat.",
    "Listen to a full music album with no distractions.",
    "Unfollow social media accounts that make you feel bad.",
    "Take a 15-minute 'worry break' to think about issues, then move on.",
    "Declutter one small area of your room or workspace.",
    "Spend 20 minutes sitting outside without your phone.",
    "Read a chapter of a fiction book.",
    "Watch a comforting or funny TV show episode.",
    "Say 'no' to one thing you don't have the energy for.",
    "Plan something fun to look forward to this weekend.",
    "Practice positive self-talk; challenge one negative thought.",
    "Do a 'brain dump'—write down everything on your mind.",
    "Take a different route on your daily walk.",
    "Compliment a stranger or a friend.",
    "Organize your digital files for 15 minutes.",
    "Watch the sunrise or sunset."
];

// --- Category 3: General Knowledge (20 Tasks) ---
const GENERAL_KNOWLEDGE_TASKS = [
    "Read the Wikipedia 'Article of the day'.",
    "Watch a 15-minute TED Talk on a topic you know nothing about.",
    "Learn to say 'hello' and 'thank you' in a new language.",
    "Find a country on a map you've never heard of and read about it.",
    "Read one long-form article from a major publication (like The Atlantic).",
    "Watch a short documentary on YouTube or Netflix.",
    "Learn about a historical event that happened on this day.",
    "Listen to an episode of a history or science podcast.",
    "Identify 3 constellations in the night sky (use an app if needed).",
    "Learn the capital city of 10 different countries.",
    "Read the summary of a classic novel you've never read.",
    "Learn what a specific logical fallacy is (e.g., 'straw man').",
    "Explore a museum's collection online via Google Arts & Culture.",
    "Learn about one famous scientist and their key discovery.",
    "Read the top 5 stories on a global news site (like Reuters or BBC).",
    "Learn the basic rules of a sport you don't understand.",
    "Watch a video explaining a complex topic (e.g., from Kurzgesagt).",
    "Learn to identify one type of tree or bird in your area.",
    "Read about the origin of a common word or phrase.",
    "Memorize a short, famous poem."
];

// --- Category 4: Tech Industry Updates (20 Tasks) ---
const TECH_INDUSTRY_TASKS = [
    "Read the top 3 articles on TechCrunch or The Verge.",
    "Listen to an episode of a tech podcast (e.g., Syntax.fm, The Vergecast).",
    "Read the latest newsletter from JavaScript Weekly or React Status.",
    "Find a new, interesting project on GitHub and read its README.",
    "Research the difference between two competing technologies (e.g., Vite vs. Webpack).",
    "Watch a presentation from a recent tech conference (e.g., a React Conf video).",
    "Learn about a major tech company's latest product announcement.",
    "Follow 5 new influential developers or tech leaders on Twitter/X.",
    "Read an article about the pros and cons of a specific programming language.",
    "Research a tech trend, like WebAssembly or Edge Computing.",
    "Find out what a 'Series A funding round' means.",
    "Read a blog post from a major tech company's engineering blog.",
    "Learn who the current CEO of a major tech company (e.g., Microsoft, Google) is.",
    "Research a recent tech acquisition and why it happened.",
    "Explore the top 5 products on Product Hunt today.",
    "Learn about a new CSS feature that was recently released.",
    "Read about a recent cybersecurity threat or data breach.",
    "Find out what an open-source license (like MIT or GPL) means.",
    "Check the job listings for a company you admire to see what skills they want.",
    "Read an article about the ethics of Artificial Intelligence."
];

// --- Category 5: Coding Skills (20 Tasks) ---
const CODING_SKILLS_TASKS = [
    "Solve one 'easy' problem on LeetCode or HackerRank.",
    "Spend 20 minutes refactoring a piece of your old code to make it cleaner.",
    "Read the documentation for a JavaScript array method you don't use often.",
    "Complete one module on freeCodeCamp.",
    "Re-style a component of your to-do list using a new CSS property.",
    "Explain a JavaScript concept (like 'closures' or 'promises') out loud.",
    "Build a very simple component from scratch (e.g., a button with a counter).",
    "Learn a new Git command (e.g., `git stash` or `git rebase -i`).",
    "Follow a short tutorial to build something you've never built before.",
    "Read a chapter of a JavaScript or React book.",
    "Optimize the performance of one function in your code.",
    "Add comments to a piece of your code to explain what it does.",
    "Convert a function from a regular function to an arrow function.",
    "Use `console.log()` to debug a small issue in a project.",
    "Try to rebuild a simple UI element you see on another website.",
    "Learn and use one new keyboard shortcut in your code editor.",
    "Write a function that manipulates a string in a new way.",
    "Read the source code of a small function in a library you use.",
    "Add error handling to a piece of your code (e.g., a try...catch block).",
    "Write down the steps needed to build a new feature before coding it."
];

// --- Category 6: Interview Preparation (20 Tasks) ---
const INTERVIEW_PREPARATION_TASKS = [
    "Update one section of your resume or portfolio.",
    "Practice answering the 'Tell me about yourself' question (30-second version).",
    "Write down a story for a behavioral question ('Tell me about a time you failed').",
    "Research a company you'd like to work for and write down 3 facts about it.",
    "Find 5 new people on LinkedIn who work at companies you admire.",
    "Explain the difference between `let`, `const`, and `var` out loud.",
    "Whiteboard a simple algorithm (e.g., how to find the largest number in an array).",
    "Prepare one thoughtful question to ask an interviewer.",
    "Update your LinkedIn profile's headline or summary.",
    "Review the most common data structures (Arrays, Objects/Maps).",
    "Practice answering 'What are your strengths and weaknesses?'.",
    "Do a mock interview with a friend or a rubber duck.",
    "Read a guide on how to negotiate a salary.",
    "Find and read one engineer's resume that you admire.",
    "Learn about the STAR method for answering behavioral questions.",
    "Explain what the DOM is and how JavaScript interacts with it.",
    "Look up common React interview questions and answer one.",
    "Practice explaining a project from your portfolio in under 2 minutes.",
    "Draft a personalized connection request on LinkedIn to a recruiter.",
    "Review your GitHub profile and make sure the pinned projects are your best."
];

// Combine all task pools into a structured object for daily generation
export const ALL_TASK_CATEGORIES = {
    physicalHealth: {
        name: "Physical Vitality",
        tasks: PHYSICAL_HEALTH_TASKS,
        pillarKey: "health",
        baseMainXp: 1,
        basePillarXp: 5,
        basePenaltyHp: 3,
    },
    mentalHealth: {
        name: "Mental Fortitude",
        tasks: MENTAL_HEALTH_TASKS,
        pillarKey: "mindfulness",
        baseMainXp: 1,
        basePillarXp: 5,
        basePenaltyHp: 3,
    },
    generalKnowledge: {
        name: "Intellectual Pursuit",
        tasks: GENERAL_KNOWLEDGE_TASKS,
        pillarKey: "learning",
        baseMainXp: 2,
        basePillarXp: 10,
        basePenaltyHp: 2,
    },
    techUpdates: {
        name: "Industry Awareness",
        tasks: TECH_INDUSTRY_TASKS,
        pillarKey: "learning",
        baseMainXp: 2,
        basePillarXp: 10,
        basePenaltyHp: 2,
    },
    codingSkills: {
        name: "Skill Honing",
        tasks: CODING_SKILLS_TASKS,
        pillarKey: "productivity",
        baseMainXp: 3,
        basePillarXp: 15,
        basePenaltyHp: 5,
    },
    interviewPrep: {
        name: "Career Advancement",
        tasks: INTERVIEW_PREPARATION_TASKS,
        pillarKey: "productivity",
        baseMainXp: 2,
        basePillarXp: 10,
        basePenaltyHp: 4,
    }
};

