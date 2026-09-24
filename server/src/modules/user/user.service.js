import mongoose from "mongoose";
import userRepository from "./user.repository.js";
import User from "./user.model.js";
import Hunter from "../hunter/hunter.model.js";
import Stats from "../stats/stats.model.js";
import Quest from "../quest/quest.model.js";
import Shadow from "../shadow/shadow.model.js";
import Boss from "../boss/boss.model.js";
import Dungeon from "../dungeon/dungeon.model.js";
import FocusSession from "../focusSession/focusSession.model.js";
import TaskRaid from "../taskRaid/taskRaid.model.js";
import Journal from "../journal/journal.model.js";
import KnowledgeNote from "../brain/knowledgeNote.model.js";
import Analytics from "../analytics/analytics.model.js";
import Habit from "../habits/habit.model.js";
import Notification from "../notification/notification.model.js";
import HunterReport from "../report/hunterReport.mode.js";
import Leaderboard from "../leaderboard/leaderboard.model.js";
import Guild from "../guild/guild.model.js";
import RefreshToken from "../auth/auth.model.js";
import cloudinary from "../../lib/cloudinary.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";

const DEFAULT_SETTINGS = {
  notifications: {
    enabled: true,
    inApp: true,
    desktop: false,
    email: false,
    securityAlerts: true,
    questUpdates: true,
    progression: true,
    social: true,
    weeklyReports: true,
  },
  preferences: {
    soundEffects: true,
    compactMode: false,
  },
  privacy: {
    publicProfile: true,
    showPublicStats: true,
    showPublicAchievements: true,
  },
};

const mergeDefaults = (value) => ({
  notifications: { ...DEFAULT_SETTINGS.notifications, ...(value?.notifications || {}) },
  preferences: { ...DEFAULT_SETTINGS.preferences, ...(value?.preferences || {}) },
  privacy: { ...DEFAULT_SETTINGS.privacy, ...(value?.privacy || {}) },
});

const sanitizeSettingsPatch = (body = {}) => {
  const result = {};
  for (const section of ["notifications", "preferences", "privacy"]) {
    if (!body[section] || typeof body[section] !== "object") continue;
    result[section] = {};
    for (const [key, value] of Object.entries(body[section])) {
      if (typeof value === "boolean") result[section][key] = value;
    }
  }
  return result;
};


const escapeXml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const flattenForExport = (data) => {
  const rows = [];
  const add = (section, value) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => rows.push([section, index + 1, JSON.stringify(item)]));
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, item]) => {
        rows.push([section, key, typeof item === "object" ? JSON.stringify(item) : item]);
      });
      return;
    }
    rows.push([section, "value", value]);
  };
  Object.entries(data).forEach(([section, value]) => add(section, value));
  return rows;
};

const buildExcelXml = (data) => {
  const rows = flattenForExport(data);
  const xmlRows = [
    ["Section", "Key", "Value"],
    ...rows,
  ].map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join("")}</Row>`).join("");
  return `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Solo Leveling Export"><Table>${xmlRows}</Table></Worksheet></Workbook>`;
};

const pdfEscape = (value) => String(value ?? "")
  .replace(/[^\x20-\x7E]/g, "")
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)");

const pdfText = (value, fallback = "") => String(value ?? fallback)
  .replace(/[\r\n]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const pdfDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const pdfNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const pdfStatus = (value) => {
  const text = pdfText(value, "Unknown");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const pdfWrap = (value, max = 92) => {
  const text = pdfText(value);
  if (!text) return [];
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const buildPdfContent = (data) => {
  const user = data?.user || {};
  const hunter = data?.hunter || {};
  const stats = data?.stats || {};
  const quests = Array.isArray(data?.quests) ? data.quests : [];
  const habits = Array.isArray(data?.habits) ? data.habits : [];
  const journals = Array.isArray(data?.journals) ? data.journals : [];
  const reports = Array.isArray(data?.reports) ? data.reports : [];

  const completedQuests = quests.filter((quest) => quest?.status === "completed");
  const activeQuests = quests.filter((quest) => quest?.status === "active");
  const activeHabits = habits.filter((habit) => habit?.isActive !== false);
  const totalHabitCompletions = habits.reduce(
    (sum, habit) => sum + pdfNumber(habit?.totalCompletions),
    0,
  );

  const sections = [];
  const addSection = (title, items) => {
    const validItems = items.filter(Boolean);
    if (validItems.length) sections.push({ title, items: validItems });
  };

  addSection("Profile", [
    { label: "Hunter", value: pdfText(user.hunterName || hunter.hunterName, "Hunter") },
    { label: "Email", value: pdfText(user.email, "Not available") },
    { label: "Country", value: pdfText(user.country, "Not specified") },
    { label: "Timezone", value: pdfText(user.timezone, "Not specified") },
    user.bio ? { label: "About", value: pdfText(user.bio) } : null,
  ]);

  addSection("Progress", [
    { label: "Rank", value: pdfText(hunter.rank, "Unawakened") },
    { label: "Level", value: String(pdfNumber(hunter.level, 1)) },
    { label: "Current XP", value: String(pdfNumber(hunter.xp)) },
    { label: "Total XP", value: String(pdfNumber(hunter.totalXP)) },
    { label: "Power Score", value: String(pdfNumber(hunter.powerScore)) },
    { label: "Current Streak", value: `${pdfNumber(hunter.currentStreak)} days` },
    { label: "Longest Streak", value: `${pdfNumber(hunter.longestStreak)} days` },
    { label: "Quests Completed", value: String(pdfNumber(hunter.totalQuestCompletions, completedQuests.length)) },
    { label: "Focus Time", value: `${pdfNumber(hunter.totalFocusMinutes)} minutes` },
  ]);

  const statFields = [
    ["Focus", stats.focusScore],
    ["Discipline", stats.disciplineScore],
    ["Learning", stats.learningScore],
    ["Health", stats.healthScore],
    ["Momentum", stats.momentumScore],
    ["Energy", stats.energyScore],
    ["Consistency", stats.consistencyScore],
    ["Performance", stats.performanceScore],
  ].filter(([, value]) => value !== undefined && value !== null);
  addSection("Performance", statFields.map(([label, value]) => ({
    label,
    value: `${pdfNumber(value)}/100`,
  })));

  addSection("Activity Summary", [
    { label: "Completed Quests", value: String(completedQuests.length) },
    { label: "Active Quests", value: String(activeQuests.length) },
    { label: "Active Habits", value: String(activeHabits.length) },
    { label: "Habit Completions", value: String(totalHabitCompletions) },
    { label: "Journal Entries", value: String(journals.length) },
    { label: "Weekly Reports", value: String(reports.length) },
  ]);

  const questItems = quests
    .slice()
    .sort((a, b) => new Date(b?.completedAt || b?.createdAt || b?.dueAt || 0) - new Date(a?.completedAt || a?.createdAt || a?.dueAt || 0))
    .slice(0, 12)
    .map((quest) => ({
      title: pdfText(quest?.title, "Untitled Quest"),
      description: pdfText(quest?.description || quest?.purpose || quest?.expectedOutcome, "No description provided."),
      meta: [
        `Status: ${pdfStatus(quest?.status)}`,
        `Reward: ${pdfNumber(quest?.xpReward)} XP`,
        quest?.completedAt ? `Completed: ${pdfDate(quest.completedAt)}` : quest?.dueAt ? `Due: ${pdfDate(quest.dueAt)}` : null,
      ].filter(Boolean),
    }));
  addSection("Recent Quests", questItems);

  const habitItems = habits
    .slice()
    .sort((a, b) => pdfNumber(b?.currentStreak) - pdfNumber(a?.currentStreak))
    .slice(0, 10)
    .map((habit) => ({
      title: pdfText(habit?.name, "Untitled Habit"),
      description: pdfText(habit?.description, "Keep this habit consistent."),
      meta: [
        `Streak: ${pdfNumber(habit?.currentStreak)} days`,
        `Best: ${pdfNumber(habit?.longestStreak)} days`,
        `Completed: ${pdfNumber(habit?.totalCompletions)} times`,
      ],
    }));
  addSection("Habits", habitItems);

  const journalItems = journals
    .slice()
    .sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0))
    .slice(0, 8)
    .map((journal) => {
      const highlight = journal?.freeText || journal?.wins?.[0] || journal?.lessons?.[0] || journal?.gratitude?.[0] || journal?.tomorrowPlan;
      return {
        title: `Journal Entry - ${pdfDate(journal?.date)}`,
        description: pdfText(highlight, "No written highlight."),
        meta: [
          journal?.mood != null ? `Mood: ${pdfNumber(journal.mood)}/10` : null,
          journal?.energyLevel != null ? `Energy: ${pdfNumber(journal.energyLevel)}/10` : null,
          journal?.xpEarned != null ? `XP Earned: ${pdfNumber(journal.xpEarned)}` : null,
        ].filter(Boolean),
      };
    });
  addSection("Journal Highlights", journalItems);

  const reportItems = reports
    .slice()
    .sort((a, b) => new Date(b?.weekStart || 0) - new Date(a?.weekStart || 0))
    .slice(0, 6)
    .map((report) => ({
      title: `Weekly Report - ${pdfDate(report?.weekStart)} to ${pdfDate(report?.weekEnd)}`,
      description: report?.suggestedFocusArea
        ? `Focus area: ${pdfText(report.suggestedFocusArea)}`
        : `Productivity trend: ${pdfStatus(report?.productivityTrend || "stable")}.`,
      meta: [
        `Quests: ${pdfNumber(report?.totalQuestsCompleted)}/${pdfNumber(report?.totalQuestsAssigned)}`,
        `XP Earned: ${pdfNumber(report?.totalXPEarned)}`,
        `Focus: ${pdfNumber(report?.totalFocusMinutes)} minutes`,
      ],
    }));
  addSection("Weekly Reports", reportItems);

  return { sections };
};

const buildSimplePdf = (data) => {
  const { sections } = buildPdfContent(data);
  const hunter = data?.hunter || {};
  const generated = pdfDate(new Date());
  const pages = [];

  // Royal / premium palette: midnight navy, deep blue, warm gold, ivory.
  const C = {
    navy: [0.035, 0.055, 0.12],
    navy2: [0.065, 0.09, 0.19],
    blue: [0.12, 0.20, 0.38],
    gold: [0.82, 0.62, 0.20],
    goldSoft: [0.96, 0.90, 0.73],
    ivory: [0.985, 0.98, 0.94],
    white: [1, 1, 1],
    text: [0.13, 0.15, 0.20],
    muted: [0.43, 0.46, 0.53],
    line: [0.86, 0.85, 0.80],
    card: [1, 1, 1],
    success: [0.16, 0.47, 0.31],
  };

  const W = 612;
  const H = 842;
  const margin = 42;
  const contentW = W - margin * 2;

  const page = () => ({ commands: [], y: 760 });
  let current = page();

  const pushPage = () => {
    if (current.commands.length) pages.push(current);
    current = page();
  };

  const ensure = (height) => {
    if (current.y - height < 62) pushPage();
  };

  const add = (command, height = 0) => {
    ensure(height);
    current.commands.push(command);
    current.y -= height;
  };

  const rect = (x, y, w, h, fill, radius = 0, stroke = null, strokeWidth = 1) => ({
    type: 'rect', x, y, w, h, fill, radius, stroke, strokeWidth,
  });
  const line = (x1, y1, x2, y2, stroke, width = 1) => ({ type: 'line', x1, y1, x2, y2, stroke, width });
  const text = (x, y, value, size = 9, fill = C.text, font = 'F1', align = 'left') => ({
    type: 'text', x, y, value: pdfText(value), size, fill, font, align,
  });

  const addTextWrapped = (value, x, size, fill, maxChars, leading, font = 'F1') => {
    const lines = pdfWrap(value, maxChars);
    for (const item of lines) {
      ensure(leading);
      current.commands.push(text(x, current.y, item, size, fill, font));
      current.y -= leading;
    }
    return lines.length;
  };

  // --- Premium cover page ---
  const cover = { commands: [], y: 0, cover: true };
  cover.commands.push(rect(0, 0, W, H, C.navy));
  cover.commands.push(rect(0, 0, W, 205, C.navy2));
  cover.commands.push(rect(42, 100, 528, 2, C.gold));
  cover.commands.push(rect(42, 98, 110, 2, C.gold));
  cover.commands.push(text(42, 690, 'SOLO LEVELING SYSTEM', 12, C.gold, 'F2'));
  cover.commands.push(text(42, 635, 'PERSONAL', 34, C.white, 'F2'));
  cover.commands.push(text(42, 595, 'PROGRESS REPORT', 34, C.white, 'F2'));
  cover.commands.push(text(42, 552, 'A refined snapshot of your journey, progress and achievements.', 11, [0.78, 0.80, 0.86], 'F1'));

  const rank = pdfText(hunter.rank, 'Unawakened');
  const level = pdfNumber(hunter.level, 1);
  const xp = pdfNumber(hunter.xp);
  const power = pdfNumber(hunter.powerScore);
  const coverCards = [
    ['RANK', rank],
    ['LEVEL', level],
    ['CURRENT XP', xp],
    ['POWER SCORE', power],
  ];
  coverCards.forEach(([label, value], i) => {
    const x = 42 + i * 132;
    cover.commands.push(rect(x, 385, 116, 92, [0.075, 0.105, 0.22], 8, [0.22, 0.24, 0.34], 0.7));
    cover.commands.push(text(x + 12, 449, label, 7, [0.62, 0.64, 0.72], 'F2'));
    cover.commands.push(text(x + 12, 413, String(value), 20, C.white, 'F2'));
  });
  cover.commands.push(text(42, 318, pdfText(hunter.hunterName || data?.user?.hunterName, 'Hunter'), 18, C.white, 'F2'));
  cover.commands.push(text(42, 294, `Generated ${generated}`, 9, [0.66, 0.68, 0.76], 'F1'));
  cover.commands.push(text(42, 62, 'Private progress report  •  Keep this document secure', 8, [0.55, 0.58, 0.67], 'F1'));
  cover.commands.push(text(570, 62, '01', 8, C.gold, 'F2', 'right'));
  pages.push(cover);

  // --- Report pages ---
  const header = (sectionName) => {
    current.commands.push(rect(0, 0, W, H, C.ivory));
    current.commands.push(rect(0, 780, W, 62, C.navy));
    current.commands.push(text(42, 815, 'SOLO LEVELING SYSTEM', 9, C.gold, 'F2'));
    current.commands.push(text(570, 815, pdfText(sectionName).toUpperCase(), 7, [0.74, 0.76, 0.82], 'F2', 'right'));
    current.y = 750;
  };

  const sectionHeader = (title) => {
    ensure(38);
    current.commands.push(rect(margin, current.y - 25, contentW, 30, C.navy, 5));
    current.commands.push(rect(margin, current.y - 25, 5, 30, C.gold, 2));
    current.commands.push(text(margin + 17, current.y - 14, title.toUpperCase(), 10, C.white, 'F2'));
    current.y -= 42;
  };

  const keyValueGrid = (items) => {
    const cols = 2;
    const gap = 12;
    const cardW = (contentW - gap) / cols;
    const cardH = 47;
    for (let i = 0; i < items.length; i += cols) {
      ensure(cardH + 10);
      for (let c = 0; c < cols; c += 1) {
        const item = items[i + c];
        if (!item) continue;
        const x = margin + c * (cardW + gap);
        const y = current.y - cardH;
        current.commands.push(rect(x, y, cardW, cardH, C.card, 7, C.line, 0.8));
        current.commands.push(text(x + 12, y + 31, item.label, 7, C.muted, 'F2'));
        current.commands.push(text(x + 12, y + 13, item.value, 10, C.text, 'F2'));
      }
      current.y -= cardH + 10;
    }
  };

  const metricCards = (items) => {
    const cols = Math.min(4, items.length || 1);
    const gap = 9;
    const cardW = (contentW - gap * (cols - 1)) / cols;
    const cardH = 67;
    ensure(cardH + 10);
    items.forEach((item, i) => {
      const x = margin + i * (cardW + gap);
      const y = current.y - cardH;
      current.commands.push(rect(x, y, cardW, cardH, C.navy2, 7, [0.16, 0.19, 0.29], 0.8));
      current.commands.push(text(x + 9, y + 48, item.label, 6.5, [0.69, 0.71, 0.78], 'F2'));
      current.commands.push(text(x + 9, y + 24, item.value, 15, C.white, 'F2'));
      if (item.sub) current.commands.push(text(x + 9, y + 9, item.sub, 6.5, C.gold, 'F1'));
    });
    current.y -= cardH + 12;
  };

  const recordCard = (item) => {
    const descLines = pdfWrap(item.description, 82).slice(0, 3);
    const meta = item.meta || [];
    const h = 53 + descLines.length * 11 + (meta.length ? 15 : 0);
    ensure(h + 8);
    const y = current.y - h;
    current.commands.push(rect(margin, y, contentW, h, C.card, 7, C.line, 0.8));
    current.commands.push(rect(margin, y, 4, h, C.gold, 2));
    current.commands.push(text(margin + 15, y + h - 19, item.title, 9.5, C.navy, 'F2'));
    let ty = y + h - 34;
    descLines.forEach((l) => {
      current.commands.push(text(margin + 15, ty, l, 7.5, C.text, 'F1'));
      ty -= 11;
    });
    if (meta.length) {
      current.commands.push(line(margin + 15, y + 24, margin + contentW - 15, y + 24, C.line, 0.6));
      current.commands.push(text(margin + 15, y + 10, meta.join('   •   '), 6.7, C.muted, 'F1'));
    }
    current.y -= h + 8;
  };

  const performanceBars = (items) => {
    const rowH = 28;
    const barX = margin + 142;
    const barW = contentW - 205;
    items.forEach((item) => {
      ensure(rowH);
      current.commands.push(text(margin, current.y - 11, item.label, 7.5, C.text, 'F2'));
      current.commands.push(rect(barX, current.y - 16, barW, 8, [0.90, 0.89, 0.84], 4));
      const value = Math.max(0, Math.min(100, pdfNumber(item.value)));
      current.commands.push(rect(barX, current.y - 16, barW * (value / 100), 8, C.gold, 4));
      current.commands.push(text(margin + contentW, current.y - 12, `${value}/100`, 7.5, C.navy, 'F2', 'right'));
      current.y -= rowH;
    });
  };

  let currentSection = 'Progress Report';
  header(currentSection);

  for (const section of sections) {
    sectionHeader(section.title);
    if (section.title === 'Progress') {
      const items = section.items;
      metricCards([
        { label: 'RANK', value: items.find((x) => x.label === 'Rank')?.value || '—' },
        { label: 'LEVEL', value: items.find((x) => x.label === 'Level')?.value || '—' },
        { label: 'CURRENT XP', value: items.find((x) => x.label === 'Current XP')?.value || '0' },
        { label: 'POWER', value: items.find((x) => x.label === 'Power Score')?.value || '0' },
      ]);
      keyValueGrid(items.filter((x) => !['Rank', 'Level', 'Current XP', 'Power Score'].includes(x.label)));
    } else if (section.title === 'Performance') {
      performanceBars(section.items.map((x) => ({ label: x.label, value: pdfNumber(String(x.value).replace('/100', '')) })));
    } else if (section.title === 'Activity Summary') {
      metricCards(section.items.slice(0, 4).map((x) => ({ label: x.label, value: x.value })));
      keyValueGrid(section.items.slice(4));
    } else if (section.title === 'Profile') {
      keyValueGrid(section.items);
    } else {
      for (const item of section.items) recordCard(item);
    }
    current.y -= 8;
  }

  if (current.commands.length) pages.push(current);

  // Add consistent footer to every report page.
  const reportPageCount = pages.length;
  pages.forEach((pg, index) => {
    if (pg.cover) return;
    pg.commands.push(line(margin, 45, W - margin, 45, C.line, 0.7));
    pg.commands.push(text(margin, 29, 'SOLO LEVELING SYSTEM  •  PERSONAL PROGRESS REPORT', 6.5, C.muted, 'F2'));
    pg.commands.push(text(W - margin, 29, `${String(index + 1).padStart(2, '0')} / ${String(reportPageCount).padStart(2, '0')}`, 6.5, C.muted, 'F2', 'right'));
  });

  const objects = [];
  const addObject = (body) => { objects.push(body); return objects.length; };
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageIds = [];

  const color = (rgb, stroke = false) => `${rgb[0]} ${rgb[1]} ${rgb[2]} ${stroke ? 'RG' : 'rg'}`;
  const pdfDrawText = (cmd) => {
    const alignAdjust = cmd.align === 'right' ? -1 : cmd.align === 'center' ? -0.5 : 0;
    const estimatedWidth = cmd.value.length * cmd.size * 0.48;
    const x = cmd.x + alignAdjust * estimatedWidth;
    return `BT\n/${cmd.font} ${cmd.size} Tf\n${color(cmd.fill)}\n${x.toFixed(2)} ${cmd.y.toFixed(2)} Td\n(${pdfEscape(cmd.value)}) Tj\nET\n`;
  };
  const pdfDrawRect = (cmd) => {
    const fill = `${color(cmd.fill)}\n`;
    const stroke = cmd.stroke ? `${color(cmd.stroke, true)}\n${cmd.strokeWidth || 1} w\n` : '';
    if (!cmd.radius) return `${fill}${stroke}${cmd.x} ${cmd.y} ${cmd.w} ${cmd.h} re ${cmd.stroke ? 'B' : 'f'}\n`;
    const r = Math.min(cmd.radius, cmd.w / 2, cmd.h / 2);
    const k = 0.5522847498;
    const x = cmd.x; const y = cmd.y; const w = cmd.w; const h = cmd.h;
    return `${fill}${stroke}` +
      `${x + r} ${y} m ${x + w - r} ${y} l ` +
      `${x + w - r + r * k} ${y} ${x + w} ${y + r - r * k} ${x + w} ${y + r} c ` +
      `${x + w} ${y + h - r} l ${x + w} ${y + h - r + r * k} ${x + w - r + r * k} ${y + h} ${x + w - r} ${y + h} c ` +
      `${x + r} ${y + h} l ${x + r - r * k} ${y + h} ${x} ${y + h - r + r * k} ${x} ${y + h - r} c ` +
      `${x} ${y + r} l ${x} ${y + r - r * k} ${x + r - r * k} ${y} ${x + r} ${y} c h ${cmd.stroke ? 'B' : 'f'}\n`;
  };
  const pdfDrawLine = (cmd) => `${color(cmd.stroke, true)}\n${cmd.width} w\n${cmd.x1} ${cmd.y1} m ${cmd.x2} ${cmd.y2} l S\n`;

  pages.forEach((pg) => {
    let stream = '';
    for (const cmd of pg.commands) {
      if (cmd.type === 'text') stream += pdfDrawText(cmd);
      else if (cmd.type === 'rect') stream += pdfDrawRect(cmd);
      else if (cmd.type === 'line') stream += pdfDrawLine(cmd);
    }
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent PAGES /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  const pagesId = addObject(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  objects.forEach((object, index) => {
    if (object.includes('PAGES')) objects[index] = object.replace('PAGES', `${pagesId} 0 R`);
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
};

class UserService {
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);
    return user.toSafeObject();
  }

  async getSettings(userId) {
    const user = await User.findById(userId).select("settings country timezone");
    if (!user) throw new AppError("User not found", 404);
    const settings = mergeDefaults(user.settings);
    return { settings, country: user.country, timezone: user.timezone };
  }

  async updateProfile(userId, updateBody) {
    const allowed = ["country", "timezone", "bio", "hunterName"];
    const updates = Object.fromEntries(
      Object.entries(updateBody || {}).filter(([k, v]) =>
        allowed.includes(k) && typeof v === "string",
      ),
    );

    if (updates.hunterName) {
      updates.hunterName = updates.hunterName.trim();
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(updates.hunterName)) {
        throw new AppError("Hunter name must be 3-20 characters using letters, numbers, or underscores.", 400);
      }
      const duplicate = await User.findOne({
        hunterName: updates.hunterName,
        _id: { $ne: userId },
      }).select("_id");
      if (duplicate) throw new AppError("Hunter name already taken.", 409);
    }

    if (updates.bio) updates.bio = updates.bio.trim().slice(0, 240);
    if (updates.country) updates.country = updates.country.trim().slice(0, 80);
    if (updates.timezone) updates.timezone = updates.timezone.trim().slice(0, 100);

    const user = await userRepository.updateById(userId, updates);
    if (!user) throw new AppError("User not found", 404);

    if (updates.hunterName) {
      await Hunter.findOneAndUpdate({ userId }, { hunterName: updates.hunterName });
    }

    return user.toSafeObject();
  }

  async updateSettings(userId, body) {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const patch = sanitizeSettingsPatch(body);
    const current = mergeDefaults(user.settings);
    const settings = {
      notifications: { ...current.notifications, ...(patch.notifications || {}) },
      preferences: { ...current.preferences, ...(patch.preferences || {}) },
      privacy: { ...current.privacy, ...(patch.privacy || {}) },
    };

    user.settings = settings;
    await user.save({ validateBeforeSave: false });
    return settings;
  }

  async updatePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findRawById(userId);
    if (!user) throw new AppError("User not found", 404);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new AppError("Current password is incorrect.", 401);

    user.password = newPassword;
    await user.save();
    await RefreshToken.updateMany({ userId }, { isRevoked: true });
    return true;
  }


  async getSessions(userId, currentRefreshToken = "") {
    await RefreshToken.deleteMany({ userId, expiresAt: { $lte: new Date() } });
    const sessions = await RefreshToken.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastUsedAt: -1, createdAt: -1 })
      .lean();

    return sessions.map((session) => ({
      id: session.sessionId || String(session._id),
      current: Boolean(currentRefreshToken && session.token === currentRefreshToken),
      device: session.device || "Desktop",
      deviceName: session.deviceName || session.device || "Unknown device",
      browser: session.browser || "Unknown browser",
      os: session.os || "Unknown OS",
      ipAddress: session.ipAddress || "Unknown",
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt || session.updatedAt || session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }

  async revokeSession(userId, sessionId, currentRefreshToken = "") {
    const sessionFilter = { userId, isRevoked: false, ...(mongoose.Types.ObjectId.isValid(sessionId) ? { $or: [{ sessionId }, { _id: sessionId }] } : { sessionId }) };
    const session = await RefreshToken.findOne(sessionFilter);
    if (!session) throw new AppError("Session not found or already signed out.", 404);
    const isCurrent = currentRefreshToken && session.token === currentRefreshToken;
    session.isRevoked = true;
    await session.save({ validateBeforeSave: false });
    return { current: Boolean(isCurrent) };
  }

  async logoutAllDevices(userId) {
    await RefreshToken.updateMany({ userId, isRevoked: false }, { isRevoked: true });
    return true;
  }

  async deactivateAccount(userId, password) {
    const user = await User.findById(userId).select("+password");
    if (!user) throw new AppError("User not found", 404);
    if (password && !(await user.comparePassword(password))) {
      throw new AppError("Password is incorrect.", 401);
    }
    user.isActive = false;
    await user.save({ validateBeforeSave: false });
    await RefreshToken.updateMany({ userId }, { isRevoked: true });
    return true;
  }

  async deleteAccount(userId, password) {
    const user = await User.findById(userId).select("+password");
    if (!user) throw new AppError("User not found", 404);
    if (!password || !(await user.comparePassword(password))) {
      throw new AppError("Password is incorrect.", 401);
    }

    const id = user._id;
    if (user.avatar?.public_id) {
      try {
        await cloudinary.uploader.destroy(user.avatar.public_id);
      } catch {}
    }

    // Reassign or remove guilds led by the account before removing membership.
    const ledGuilds = await Guild.find({ leaderId: id }).lean();
    for (const guild of ledGuilds) {
      const remaining = (guild.members || []).filter((member) => String(member.userId) !== String(id));
      if (remaining.length) {
        await Guild.updateOne(
          { _id: guild._id },
          { $set: { leaderId: remaining[0].userId }, $pull: { members: { userId: id } } },
        );
      } else {
        await Guild.deleteOne({ _id: guild._id });
      }
    }

    await Promise.all([
      Hunter.deleteOne({ userId: id }),
      Hunter.updateMany({}, { $pull: { friends: id } }),
      Stats.deleteOne({ userId: id }),
      Quest.deleteMany({ userId: id }),
      Shadow.deleteMany({ userId: id }),
      Boss.deleteMany({ userId: id }),
      Dungeon.deleteMany({ userId: id }),
      FocusSession.deleteMany({ userId: id }),
      TaskRaid.deleteMany({ userId: id }),
      Journal.deleteMany({ userId: id }),
      KnowledgeNote.deleteMany({ userId: id }),
      Analytics.deleteMany({ userId: id }),
      Habit.deleteMany({ userId: id }),
      Notification.deleteMany({ userId: id }),
      HunterReport.deleteMany({ userId: id }),
      RefreshToken.deleteMany({ userId: id }),
      Leaderboard.updateMany({}, { $pull: { entries: { userId: id } } }),
      Guild.updateMany({ "members.userId": id }, { $pull: { members: { userId: id } } }),
    ]);

    await User.deleteOne({ _id: id });
    return true;
  }

  async exportAccountData(userId) {
    const [user, hunter, stats, quests, habits, journals, notifications, reports] = await Promise.all([
      User.findById(userId).lean(),
      Hunter.findOne({ userId }).lean(),
      Stats.findOne({ userId }).lean(),
      Quest.find({ userId }).sort({ createdAt: -1 }).limit(1000).lean(),
      Habit.find({ userId }).lean(),
      Journal.find({ userId }).sort({ date: -1 }).limit(365).lean(),
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(500).lean(),
      HunterReport.find({ userId }).sort({ weekStart: -1 }).limit(100).lean(),
    ]);

    if (!user) throw new AppError("User not found", 404);
    delete user.password;
    delete user.passwordResetTokenHash;
    delete user.passwordResetExpiresAt;

    return {
      exportedAt: new Date().toISOString(),
      user,
      hunter,
      stats,
      quests,
      habits,
      journals,
      notifications,
      reports,
    };
  }
}

export { DEFAULT_SETTINGS, mergeDefaults, buildExcelXml, buildSimplePdf };
export default new UserService();
