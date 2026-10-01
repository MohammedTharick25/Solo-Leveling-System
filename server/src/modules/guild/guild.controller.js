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

export const setMemberRole = asyncHandler(async (req, res) => {
  const guild = await GuildService.setMemberRole(
    req.userId,
    req.params.memberId,
    req.params.id,
    req.body.role,
  );
  sendSuccess(res, { guild }, "Guild role updated.");
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

export const getActivities = asyncHandler(async (req, res) => {
  const activities = await GuildService.getGuildActivities(req.userId, req.params.id);
  sendSuccess(res, activities, "Guild activities retrieved.");
});

export const createSprint = asyncHandler(async (req, res) => {
  const sprint = await GuildService.createGuildSprint(req.userId, req.params.id, req.body, req.app.get("io"));
  sendSuccess(res, { sprint }, "Guild sprint created.", 201);
});

export const joinSprint = asyncHandler(async (req, res) => {
  const sprint = await GuildService.joinGuildSprint(req.userId, req.params.id, req.params.sprintId, req.app.get("io"));
  sendSuccess(res, { sprint }, "Joined the guild sprint.");
});

export const joinWeeklyQuest = asyncHandler(async (req, res) => {
  const weeklyQuest = await GuildService.joinWeeklyGuildQuest(req.userId, req.params.id, req.app.get("io"));
  sendSuccess(res, { weeklyQuest }, "Joined the weekly guild quest.");
});

export const createCheckIn = asyncHandler(async (req, res) => {
  const checkIn = await GuildService.createGuildCheckIn(req.userId, req.params.id, req.body.goal, req.body.timeZone, req.app.get("io"));
  sendSuccess(res, { checkIn }, "Guild check-in saved.", 201);
});

export const completeCheckIn = asyncHandler(async (req, res) => {
  const checkIn = await GuildService.completeGuildCheckIn(req.userId, req.params.id, req.params.checkInId, req.app.get("io"));
  sendSuccess(res, { checkIn }, "Guild check-in completed.");
});
