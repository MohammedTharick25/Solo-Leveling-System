import Hunter from "../hunter/hunter.model.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { GuildRepository } from "./guild.repository.js";

export const createGuild = async (
  userId,
  { name, description, tag, isPublic, maxMembers },
) => {
  const hunter = await Hunter.findOne({ userId });
  if (!hunter) throw new AppError("Hunter not found.", 404);

  const existingGuild = await GuildRepository.findByMemberUserId(userId);
  if (existingGuild)
    throw new AppError("You are already in a guild. Leave it first.", 409);

  const guild = await GuildRepository.create({
    name,
    description,
    tag: tag?.toUpperCase(),
    leaderId: userId,
    isPublic: isPublic !== false,
    maxMembers: maxMembers || 50,
    members: [{ userId, role: "leader", joinedAt: new Date() }],
  });

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

export const promoteToOfficer = async (leaderId, targetUserId, guildId) => {
  const guild = await GuildRepository.findById(guildId);
  if (!guild || guild.leaderId.toString() !== leaderId.toString())
    throw new AppError("Only the guild leader can promote members.", 403);

  const member = guild.members.find(
    (m) => m.userId.toString() === targetUserId.toString(),
  );
  if (!member) throw new AppError("Member not found in guild.", 404);

  member.role = "officer";
  await guild.save();
  return guild;
};

export const getGuildMembers = async (guildId) => {
  const members = await GuildRepository.getMembersWithHunterDetails(guildId);
  if (!members) throw new AppError("Guild not found.", 404);
  return members;
};

export const addGuildXP = async (guildId, amount, userId) => {
  return GuildRepository.addXP(guildId, userId, amount);
};

// ── Challenges ───────────────────────────────────────────────────────────────

export const addChallenge = async (
  leaderId,
  guildId,
  { title, description, xpReward, deadline, firstCompleterBonus },
  io = null,
) => {
  if (!title) throw new AppError("Challenge title is required.", 400);

  const guild = await GuildRepository.findById(guildId);
  if (!guild) throw new AppError("Guild not found.", 404);
  if (guild.leaderId.toString() !== leaderId.toString())
    throw new AppError("Only the guild leader can add challenges.", 403);

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
