import Guild from "./guild.model.js";
import Hunter from "../hunter/hunter.model.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { sendSuccess, asyncHandler, paginate } from "../../lib/helpers.js";
import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import { body } from "express-validator";
import { validate } from "../../middleware/validate.middleware.js";

// ── Service ──────────────────────────────────────────────────────────────────

export const createGuild = async (
  userId,
  { name, description, tag, isPublic, maxMembers },
) => {
  const hunter = await Hunter.findOne({ userId });
  if (!hunter) throw new AppError("Hunter not found.", 404);

  const existingGuild = await Guild.findOne({ "members.userId": userId });
  if (existingGuild)
    throw new AppError("You are already in a guild. Leave it first.", 409);

  const guild = await Guild.create({
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
  return Guild.findOne({ "members.userId": userId }).populate(
    "leaderId",
    "hunterName",
  );
};

export const searchGuilds = async (query, page = 1, limit = 20) => {
  const filter = { isPublic: true };
  if (query) filter.$text = { $search: query };
  return paginate(Guild, filter, { page, limit, sort: { totalXP: -1 } });
};

export const joinGuild = async (userId, guildId, io = null) => {
  const [guild, hunter] = await Promise.all([
    Guild.findById(guildId),
    Hunter.findOne({ userId }),
  ]);

  if (!guild) throw new AppError("Guild not found.", 404);
  if (!guild.isPublic) throw new AppError("This guild is private.", 403);
  if (guild.members.length >= guild.maxMembers)
    throw new AppError("Guild is full.", 409);
  if (guild.members.some((m) => m.userId.toString() === userId.toString())) {
    throw new AppError("You are already in this guild.", 409);
  }

  const existingGuild = await Guild.findOne({ "members.userId": userId });
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
  const guild = await Guild.findOne({ "members.userId": userId });
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
  const guild = await Guild.findOne({ _id: guildId, leaderId });
  if (!guild)
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
  const guild = await Guild.findById(guildId).populate(
    "members.userId",
    "hunterName level rank title",
  );
  if (!guild) throw new AppError("Guild not found.", 404);
  return guild.members;
};

export const addGuildXP = async (guildId, amount, userId) => {
  return Guild.findOneAndUpdate(
    { _id: guildId, "members.userId": userId },
    {
      $inc: {
        totalXP: amount,
        weeklyXP: amount,
        "members.$.contribution": amount,
      },
    },
    { new: true },
  );
};

// ── Routes ───────────────────────────────────────────────────────────────────

const createValidators = [
  body("name")
    .notEmpty()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Guild name must be 3-30 characters"),
  body("tag")
    .optional()
    .isLength({ max: 5 })
    .withMessage("Tag max 5 characters"),
  validate,
];

const router = Router();
router.use(protect, requireAwakened);

router.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const guild = await getMyGuild(req.userId);
    sendSuccess(res, { guild }, guild ? "Guild retrieved." : "Not in a guild.");
  }),
);

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const result = await searchGuilds(
      req.query.q,
      req.query.page,
      req.query.limit,
    );
    sendSuccess(res, result, "Guilds found.");
  }),
);

router.post(
  "/",
  createValidators,
  asyncHandler(async (req, res) => {
    const guild = await createGuild(req.userId, req.body);
    sendSuccess(res, { guild }, "Guild created.", 201);
  }),
);

router.post(
  "/:id/join",
  asyncHandler(async (req, res) => {
    const io = req.app.get("io");
    const guild = await joinGuild(req.userId, req.params.id, io);
    sendSuccess(res, { guild }, "Joined guild.");
  }),
);

router.delete(
  "/:id/leave",
  asyncHandler(async (req, res) => {
    const io = req.app.get("io");
    await leaveGuild(req.userId, io);
    sendSuccess(res, {}, "Left guild.");
  }),
);

router.get(
  "/:id/members",
  asyncHandler(async (req, res) => {
    const members = await getGuildMembers(req.params.id);
    sendSuccess(res, { members }, "Members retrieved.");
  }),
);

router.patch(
  "/:id/promote/:memberId",
  asyncHandler(async (req, res) => {
    const guild = await promoteToOfficer(
      req.userId,
      req.params.memberId,
      req.params.id,
    );
    sendSuccess(res, { guild }, "Member promoted to officer.");
  }),
);

export default router;
