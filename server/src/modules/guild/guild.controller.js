import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import * as GuildService from "./guild.service.js";

export const getMine = asyncHandler(async (req, res) => {
  const guild = await GuildService.getMyGuild(req.userId);
  sendSuccess(res, { guild }, guild ? "Guild retrieved." : "Not in a guild.");
});

export const search = asyncHandler(async (req, res) => {
  const result = await GuildService.searchGuilds(
    req.query.q,
    req.query.page,
    req.query.limit,
  );
  sendSuccess(res, result, "Guilds found.");
});

export const create = asyncHandler(async (req, res) => {
  const guild = await GuildService.createGuild(req.userId, req.body);
  sendSuccess(res, { guild }, "Guild created.", 201);
});

export const join = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const guild = await GuildService.joinGuild(req.userId, req.params.id, io);
  sendSuccess(res, { guild }, "Joined guild.");
});

export const leave = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  await GuildService.leaveGuild(req.userId, io);
  sendSuccess(res, {}, "Left guild.");
});

export const getMembers = asyncHandler(async (req, res) => {
  const members = await GuildService.getGuildMembers(req.params.id);
  sendSuccess(res, { members }, "Members retrieved.");
});

export const promote = asyncHandler(async (req, res) => {
  const guild = await GuildService.promoteToOfficer(
    req.userId,
    req.params.memberId,
    req.params.id,
  );
  sendSuccess(res, { guild }, "Member promoted to officer.");
});

export const addChallenge = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const guild = await GuildService.addChallenge(
    req.userId,
    req.params.id,
    req.body,
    io,
  );
  sendSuccess(res, { guild }, "Challenge added.", 201);
});

export const completeChallenge = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const guild = await GuildService.completeChallenge(
    req.userId,
    req.params.id,
    req.params.challengeId,
    io,
  );
  sendSuccess(res, { guild }, "Challenge marked complete.");
});
