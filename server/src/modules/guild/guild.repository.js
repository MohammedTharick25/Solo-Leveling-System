import Guild from "./guild.model.js";
import Hunter from "../hunter/hunter.model.js";
import { paginate } from "../../lib/helpers.js";

export const GuildRepository = {
  findById: (id) => Guild.findById(id),

  findByIdWithLeader: (id) =>
    Guild.findById(id).populate("leaderId", "hunterName"),

  findByMemberUserId: (userId) => Guild.findOne({ "members.userId": userId }),

  findByMemberUserIdWithLeader: (userId) =>
    Guild.findOne({ "members.userId": userId }).populate(
      "leaderId",
      "hunterName",
    ),

  findByName: (name) => Guild.findOne({ name }),

  search: (query, page = 1, limit = 20) => {
    const filter = { isPublic: true };
    if (query) filter.$text = { $search: query };
    return paginate(Guild, filter, { page, limit, sort: { totalXP: -1 } });
  },

  create: (data) => Guild.create(data),

  save: (guildDoc) => guildDoc.save(),

  // Members are stored as {userId -> User}. Level/rank/title actually live
  // on the Hunter document, keyed by userId, so we fetch those separately
  // and merge them onto each member.
  getMembersWithHunterDetails: async (guildId) => {
    const guild = await Guild.findById(guildId).populate(
      "members.userId",
      "hunterName",
    );
    if (!guild) return null;

    const userIds = guild.members.map((m) => m.userId?._id).filter(Boolean);

    const hunters = await Hunter.find({ userId: { $in: userIds } }).select(
      "userId level rank title",
    );

    const hunterByUserId = new Map(
      hunters.map((h) => [h.userId.toString(), h]),
    );

    return guild.members.map((m) => {
      const hunter = m.userId
        ? hunterByUserId.get(m.userId._id.toString())
        : null;
      return {
        userId: {
          _id: m.userId?._id,
          hunterName: m.userId?.hunterName,
          level: hunter?.level,
          rank: hunter?.rank,
          title: hunter?.title,
        },
        role: m.role,
        joinedAt: m.joinedAt,
        contribution: m.contribution,
      };
    });
  },

  addXP: (guildId, userId, amount) =>
    Guild.findOneAndUpdate(
      { _id: guildId, "members.userId": userId },
      {
        $inc: {
          totalXP: amount,
          weeklyXP: amount,
          "members.$.contribution": amount,
        },
      },
      { new: true },
    ),

  // Any guild that has at least one still-"active" challenge whose deadline
  // has passed. Used by the cron sweep — cheap pre-filter before we walk
  // each guild's challenge array in the service layer.
  findGuildsWithExpiredChallenges: (now = new Date()) =>
    Guild.find({
      challenges: {
        $elemMatch: { status: "active", deadline: { $ne: null, $lt: now } },
      },
    }),
};
