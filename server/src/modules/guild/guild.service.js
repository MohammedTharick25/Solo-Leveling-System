import Hunter from "../hunter/hunter.model.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { GuildRepository } from "./guild.repository.js";

export const GUILD_CREATION_XP = 5000;

export const createGuild = async (
  userId,
  { name, description, tag, isPublic, maxMembers },
) => {
  const hunter = await Hunter.findOne({ userId });
  if (!hunter) throw new AppError("Hunter not found.", 404);
  if ((hunter.totalXP || 0) < GUILD_CREATION_XP) {
    const remaining = GUILD_CREATION_XP - (hunter.totalXP || 0);
    throw new AppError(`Earn ${remaining.toLocaleString()} more XP to create a guild.`, 403);
  }

  const normalizedDescription = String(description || "").trim();
  const descriptionWords = normalizedDescription ? normalizedDescription.split(/\s+/) : [];
  if (descriptionWords.length > 30) {
    throw new AppError("Guild description can contain up to 30 words.", 400);
  }

  const existingGuild = await GuildRepository.findByMemberUserId(userId);
  if (existingGuild)
    throw new AppError("You are already in a guild. Leave it first.", 409);

  let guild;
  try {
    guild = await GuildRepository.create({
      name,
      description: descriptionWords.join(" "),
      tag: tag?.toUpperCase(),
      leaderId: userId,
      isPublic: isPublic !== false,
      maxMembers: maxMembers || 50,
      members: [{ userId, role: "leader", joinedAt: new Date() }],
    });
  } catch (error) {
    if (error?.code === 11000) throw new AppError("That guild name is already taken. Choose another name.", 409);
    throw error;
  }

  hunter.guildId = guild._id;
  await hunter.save();

  return guild;
};

export const getMyGuild = async (userId) => {
  return GuildRepository.findByMemberUserIdWithLeader(userId);
};

export const searchGuilds = async (query, page = 1, limit = 20) => {
  return GuildRepository.search(query, page, limit);
};

export const joinGuild = async (userId, guildId, io = null) => {
  const [guild, hunter] = await Promise.all([
    GuildRepository.findById(guildId),
    Hunter.findOne({ userId }),
  ]);

  if (!guild) throw new AppError("Guild not found.", 404);
  if (!guild.isPublic) throw new AppError("This guild is private.", 403);
  if (guild.members.length >= guild.maxMembers)
    throw new AppError("Guild is full.", 409);
  if (guild.members.some((m) => m.userId.toString() === userId.toString())) {
    throw new AppError("You are already in this guild.", 409);
  }

  const existingGuild = await GuildRepository.findByMemberUserId(userId);
  if (existingGuild) throw new AppError("Leave your current guild first.", 409);

  guild.members.push({ userId, role: "member", joinedAt: new Date() });
  hunter.guildId = guild._id;
  recordActivity(guild, "member", userId, "joined the guild");

  await Promise.all([guild.save(), hunter.save()]);

  if (io) {
    io.to(`guild:${guildId}`).emit("guild:member-joined", {
      guildId,
      hunterName: hunter.hunterName,
    });
  }

  return guild;
};

export const leaveGuild = async (userId, io = null) => {
  const guild = await GuildRepository.findByMemberUserId(userId);
  if (!guild) throw new AppError("You are not in a guild.", 404);

  if (guild.leaderId.toString() === userId.toString()) {
    throw new AppError("Transfer leadership before leaving the guild.", 400);
  }

  guild.members = guild.members.filter(
    (m) => m.userId.toString() !== userId.toString(),
  );
  await guild.save();

  await Hunter.findOneAndUpdate({ userId }, { guildId: null });

  if (io) {
    io.to(`guild:${guild._id}`).emit("guild:member-left", {
      guildId: guild._id,
    });
  }

  return guild;
};

export const setMemberRole = async (leaderId, targetUserId, guildId, role) => {
  if (!["member", "officer"].includes(role)) {
    throw new AppError("Choose a valid guild role.", 400);
  }
  const guild = await GuildRepository.findById(guildId);
  if (!guild || guild.leaderId.toString() !== leaderId.toString())
    throw new AppError("Only the guild leader can assign roles.", 403);

  if (targetUserId.toString() === leaderId.toString()) {
    throw new AppError("Guild leadership cannot be changed here.", 400);
  }

  const member = guild.members.find(
    (m) => m.userId.toString() === targetUserId.toString(),
  );
  if (!member) throw new AppError("Member not found in guild.", 404);

  member.role = role;
  await guild.save();
  return guild;
};

export const promoteToOfficer = async (leaderId, targetUserId, guildId) =>
  setMemberRole(leaderId, targetUserId, guildId, "officer");

export const getGuildMembers = async (guildId) => {
  const members = await GuildRepository.getMembersWithHunterDetails(guildId);
  if (!members) throw new AppError("Guild not found.", 404);
  return members;
};

export const addGuildXP = async (guildId, amount, userId) => {
  return GuildRepository.addXP(guildId, userId, amount);
};

export const recordGuildCelebration = async (userId, type, message, io = null) => {
  const guild = await GuildRepository.findByMemberUserId(userId);
  if (!guild) return null;
  recordActivity(guild, type, userId, message);
  await guild.save();
  emitActivity(io, guild._id, { type, userId });
  return guild;
};

const utcWeekStart = (date = new Date()) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - day + 1);
  return start;
};

const dateKeyForUser = (date = new Date(), timeZone = "UTC") => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const ensureWeeklyQuest = (guild) => {
  const periodStart = utcWeekStart();
  if (!guild.weeklyQuest || guild.weeklyQuest.periodStart < periodStart) {
    guild.weeklyQuest = { periodStart, targetSessions: 40, rewardXP: 300, participants: [] };
  }
};

const recordActivity = (guild, type, userId, message) => {
  guild.activityFeed.push({ type, userId, message });
  if (guild.activityFeed.length > 40) guild.activityFeed.splice(0, guild.activityFeed.length - 40);
};

const emitActivity = (io, guildId, activity) => {
  if (io) io.to(`guild:${guildId}`).emit("guild:activity-updated", activity);
};

export const getGuildActivities = async (userId, guildId) => {
  const guild = await GuildRepository.findById(guildId);
  if (!guild) throw new AppError("Guild not found.", 404);
  if (!guild.members.some((member) => member.userId.toString() === userId.toString())) {
    throw new AppError("You are not a member of this guild.", 403);
  }
  ensureWeeklyQuest(guild);
  const now = new Date();
  for (const sprint of guild.sprints) {
    if (sprint.status === "active" && sprint.expiresAt < now) sprint.status = "expired";
  }
  guild.checkIns = guild.checkIns.filter((checkIn) => checkIn.createdAt > new Date(now.getTime() - 8 * 86400000));
  await guild.save();
  await guild.populate([
    { path: "sprints.createdBy", select: "hunterName" },
    { path: "sprints.participants.userId", select: "hunterName" },
    { path: "weeklyQuest.participants.userId", select: "hunterName" },
    { path: "checkIns.userId", select: "hunterName" },
    { path: "activityFeed.userId", select: "hunterName" },
  ]);
  return {
    sprints: guild.sprints.slice(-8).reverse(),
    weeklyQuest: guild.weeklyQuest,
    checkIns: guild.checkIns.slice(-30).reverse(),
    activityFeed: guild.activityFeed.slice(-20).reverse(),
  };
};

export const createGuildSprint = async (userId, guildId, { title, durationMinutes }, io = null) => {
  const guild = await GuildRepository.findById(guildId);
  if (!guild || !guild.members.some((member) => member.userId.toString() === userId.toString())) {
    throw new AppError("Guild not found or you are not a member.", 404);
  }
  if (![25, 50].includes(Number(durationMinutes))) throw new AppError("Choose a 25- or 50-minute sprint.", 400);
  const now = new Date();
  guild.sprints = guild.sprints.filter((sprint) => sprint.expiresAt > now).slice(-7);
  if (guild.sprints.some((sprint) => sprint.status === "active")) {
    throw new AppError("Your guild already has an open sprint. Join it before starting another.", 409);
  }
  const sprint = guild.sprints.create({
    title: String(title || "Guild Focus Sprint").trim().slice(0, 80),
    durationMinutes: Number(durationMinutes),
    createdBy: userId,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    participants: [{ userId }],
  });
  guild.sprints.push(sprint);
  recordActivity(guild, "sprint", userId, `started a ${durationMinutes}-minute guild sprint`);
  await guild.save();
  emitActivity(io, guildId, { type: "sprint", sprintId: sprint._id });
  return sprint;
};

export const joinGuildSprint = async (userId, guildId, sprintId, io = null) => {
  const guild = await GuildRepository.findById(guildId);
  if (!guild || !guild.members.some((member) => member.userId.toString() === userId.toString())) {
    throw new AppError("Guild not found or you are not a member.", 404);
  }
  const sprint = guild.sprints.id(sprintId);
  if (!sprint || sprint.status !== "active" || sprint.expiresAt < new Date()) {
    throw new AppError("This guild sprint is no longer active.", 404);
  }
  if (!sprint.participants.some((participant) => participant.userId.toString() === userId.toString())) {
    sprint.participants.push({ userId });
    recordActivity(guild, "sprint", userId, `joined the ${sprint.durationMinutes}-minute guild sprint`);
    await guild.save();
    emitActivity(io, guildId, { type: "sprint", sprintId: sprint._id });
  }
  return sprint;
};

export const joinWeeklyGuildQuest = async (userId, guildId, io = null) => {
  const guild = await GuildRepository.findById(guildId);
  if (!guild || !guild.members.some((member) => member.userId.toString() === userId.toString())) {
    throw new AppError("Guild not found or you are not a member.", 404);
  }
  ensureWeeklyQuest(guild);
  if (guild.weeklyQuest.status === "completed") throw new AppError("This week's guild quest is already complete.", 409);
  if (!guild.weeklyQuest.participants.some((participant) => participant.userId.toString() === userId.toString())) {
    guild.weeklyQuest.participants.push({ userId });
    recordActivity(guild, "quest", userId, "joined the weekly guild quest");
    await guild.save();
    emitActivity(io, guildId, { type: "quest" });
  }
  return guild.weeklyQuest;
};

export const createGuildCheckIn = async (userId, guildId, goal, timeZone = "UTC", io = null) => {
  const guild = await GuildRepository.findById(guildId);
  if (!guild || !guild.members.some((member) => member.userId.toString() === userId.toString())) {
    throw new AppError("Guild not found or you are not a member.", 404);
  }
  if (!String(goal || "").trim()) throw new AppError("Add your main quest for today.", 400);
  let dateKey;
  try {
    dateKey = dateKeyForUser(new Date(), timeZone);
  } catch {
    dateKey = dateKeyForUser();
  }
  let checkIn = guild.checkIns.find((entry) => entry.userId.toString() === userId.toString() && entry.dateKey === dateKey);
  if (checkIn) {
    checkIn.goal = String(goal).trim().slice(0, 160);
  } else {
    checkIn = guild.checkIns.create({ userId, dateKey, goal: String(goal).trim().slice(0, 160) });
    guild.checkIns.push(checkIn);
    recordActivity(guild, "checkin", userId, "shared today's main quest");
  }
  await guild.save();
  emitActivity(io, guildId, { type: "checkin", dateKey });
  return checkIn;
};

export const completeGuildCheckIn = async (userId, guildId, checkInId, io = null) => {
  const guild = await GuildRepository.findById(guildId);
  if (!guild || !guild.members.some((member) => member.userId.toString() === userId.toString())) {
    throw new AppError("Guild not found or you are not a member.", 404);
  }
  const checkIn = guild.checkIns.id(checkInId);
  if (!checkIn || checkIn.userId.toString() !== userId.toString()) throw new AppError("Check-in not found.", 404);
  if (Date.now() - checkIn.createdAt.getTime() > 36 * 60 * 60 * 1000) {
    throw new AppError("This check-in is too old to complete.", 400);
  }
  if (!checkIn.completedAt) {
    checkIn.completedAt = new Date();
    const member = guild.members.find((entry) => entry.userId.toString() === userId.toString());
    const rewardXP = 10;
    guild.totalXP += rewardXP;
    guild.weeklyXP += rewardXP;
    member.contribution += rewardXP;
    recordActivity(guild, "checkin", userId, "completed their daily guild check-in (+10 guild XP)");
    await guild.save();
    emitActivity(io, guildId, { type: "checkin", completed: true });
  }
  return checkIn;
};

export const recordGuildFocusSession = async (userId, sessionId, minutes, sprintId = null, io = null) => {
  const guild = await GuildRepository.findByMemberUserId(userId);
  if (!guild) return null;
  ensureWeeklyQuest(guild);
  const weeklyQuest = guild.weeklyQuest;
  const weeklyParticipant = weeklyQuest.participants.find((participant) => participant.userId.toString() === userId.toString());
  if (weeklyQuest.status === "active" && weeklyParticipant) {
    weeklyQuest.progress = Math.min(weeklyQuest.targetSessions, weeklyQuest.progress + 1);
    weeklyParticipant.sessions += 1;
  }

  let sprintContribution = null;
  if (sprintId) {
    const sprint = guild.sprints.id(sprintId);
    const participant = sprint?.participants.find((entry) => entry.userId.toString() === userId.toString());
    if (sprint && sprint.status === "active" && sprint.expiresAt >= new Date() && participant && !participant.completedAt && minutes >= sprint.durationMinutes * 0.8) {
      participant.completedAt = new Date();
      participant.focusSessionId = sessionId;
      participant.minutes = minutes;
      sprintContribution = sprint;
    }
  }

  const member = guild.members.find((entry) => entry.userId.toString() === userId.toString());
  const sessionXP = sprintContribution ? 20 : weeklyParticipant ? 10 : 0;
  if (sessionXP > 0) {
    guild.totalXP += sessionXP;
    guild.weeklyXP += sessionXP;
    member.contribution += sessionXP;
  }

  if (weeklyQuest.status === "active" && weeklyQuest.progress >= weeklyQuest.targetSessions) {
    weeklyQuest.status = "completed";
    const contributors = weeklyQuest.participants.filter((participant) => participant.sessions > 0);
    if (contributors.length) {
      const share = Math.floor(weeklyQuest.rewardXP / contributors.length);
      const remainder = weeklyQuest.rewardXP - share * contributors.length;
      for (const [index, contributor] of contributors.entries()) {
        const guildMember = guild.members.find((entry) => entry.userId.toString() === contributor.userId.toString());
        if (guildMember) guildMember.contribution += share + (index < remainder ? 1 : 0);
      }
      guild.totalXP += weeklyQuest.rewardXP;
      guild.weeklyXP += weeklyQuest.rewardXP;
    }
    recordActivity(guild, "quest", userId, `completed the weekly guild quest (+${weeklyQuest.rewardXP} guild XP)`);
  } else if (sprintContribution) {
    recordActivity(guild, "sprint", userId, `completed a ${sprintContribution.durationMinutes}-minute guild sprint (+20 guild XP)`);
  } else if (weeklyParticipant) {
    recordActivity(guild, "quest", userId, "contributed a completed focus session to the weekly quest");
  }

  await guild.save();
  emitActivity(io, guild._id, { type: "focus", userId, sprintId, weeklyProgress: weeklyQuest.progress });
  return { guildId: guild._id, sprintId, weeklyProgress: weeklyQuest.progress };
};

// ── Challenges ───────────────────────────────────────────────────────────────

export const addChallenge = async (
  managerId,
  guildId,
  { title, description, xpReward, deadline, firstCompleterBonus },
  io = null,
) => {
  if (!title) throw new AppError("Challenge title is required.", 400);

  const guild = await GuildRepository.findById(guildId);
  if (!guild) throw new AppError("Guild not found.", 404);
  const manager = guild.members.find((member) => member.userId.toString() === managerId.toString());
  if (!manager || !["leader", "officer"].includes(manager.role))
    throw new AppError("Only guild leaders and officers can launch challenges.", 403);

  guild.challenges.push({
    title,
    description,
    xpReward: xpReward || 200,
    firstCompleterBonus: firstCompleterBonus ?? 50,
    deadline: deadline || undefined,
    status: "active",
    completedBy: [],
    firstCompleterId: null,
  });
  recordActivity(guild, "challenge", managerId, `launched a guild challenge: ${String(title).trim().slice(0, 80)}`);

  await guild.save();

  const challenge = guild.challenges[guild.challenges.length - 1];

  if (io) {
    io.to(`guild:${guildId}`).emit("guild:challenge-added", {
      guildId,
      challenge,
    });
  }

  return guild;
};

export const completeChallenge = async (
  userId,
  guildId,
  challengeId,
  io = null,
) => {
  const guild = await GuildRepository.findById(guildId);
  if (!guild) throw new AppError("Guild not found.", 404);

  const isMember = guild.members.some(
    (m) => m.userId.toString() === userId.toString(),
  );
  if (!isMember) throw new AppError("You are not a member of this guild.", 403);

  const challenge = guild.challenges.id(challengeId);
  if (!challenge) throw new AppError("Challenge not found.", 404);

  if (challenge.status === "expired")
    throw new AppError("This challenge has expired.", 400);

  if (challenge.deadline && challenge.deadline < new Date()) {
    challenge.status = "expired";
    await guild.save();
    if (io) {
      io.to(`guild:${guildId}`).emit("guild:challenge-expired", {
        guildId,
        challengeId: challenge._id,
      });
    }
    throw new AppError("This challenge has expired.", 400);
  }

  const alreadyDone = challenge.completedBy.some(
    (id) => id.toString() === userId.toString(),
  );
  if (alreadyDone)
    throw new AppError("You already completed this challenge.", 409);

  const isFirstCompleter = challenge.completedBy.length === 0;

  challenge.completedBy.push(userId);

  let xpAwarded = challenge.xpReward;

  if (isFirstCompleter) {
    challenge.firstCompleterId = userId;
    xpAwarded += challenge.firstCompleterBonus || 0;
  }

  // Award XP to the guild + this member's contribution
  guild.totalXP += xpAwarded;
  guild.weeklyXP += xpAwarded;
  const member = guild.members.find(
    (m) => m.userId.toString() === userId.toString(),
  );
  if (member) member.contribution += xpAwarded;

  // Mark completed once every current member has done it
  if (challenge.completedBy.length >= guild.members.length) {
    challenge.status = "completed";
  }
  recordActivity(guild, "challenge", userId, `completed the guild challenge: ${challenge.title}`);

  await guild.save();

  if (io) {
    io.to(`guild:${guildId}`).emit("guild:challenge-completed", {
      guildId,
      challengeId: challenge._id,
      userId,
      isFirstCompleter,
      xpAwarded,
      newTotalXP: guild.totalXP,
      newWeeklyXP: guild.weeklyXP,
      completedCount: challenge.completedBy.length,
      totalMembers: guild.members.length,
      challengeStatus: challenge.status,
    });
  }

  return guild;
};

// Called by the cron job (see guild.cron.js). Flips any "active" challenge
// whose deadline has passed to "expired" and emits a socket event per guild
// so connected clients update without polling.
export const sweepExpiredChallenges = async (io = null) => {
  const now = new Date();
  const guilds = await GuildRepository.findGuildsWithExpiredChallenges(now);

  let expiredCount = 0;

  for (const guild of guilds) {
    const expiredIds = [];

    for (const challenge of guild.challenges) {
      if (
        challenge.status === "active" &&
        challenge.deadline &&
        challenge.deadline < now
      ) {
        challenge.status = "expired";
        expiredIds.push(challenge._id);
        expiredCount++;
      }
    }

    if (expiredIds.length) {
      await guild.save();
      if (io) {
        io.to(`guild:${guild._id}`).emit("guild:challenges-expired", {
          guildId: guild._id,
          challengeIds: expiredIds,
        });
      }
    }
  }

  return { guildsSwept: guilds.length, challengesExpired: expiredCount };
};
