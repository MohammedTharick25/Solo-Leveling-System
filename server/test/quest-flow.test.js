import assert from "node:assert/strict";
import test from "node:test";
import Quest from "../src/modules/quest/quest.model.js";
import Hunter from "../src/modules/hunter/hunter.model.js";
import User from "../src/modules/user/user.model.js";
import Notification from "../src/modules/notification/notification.model.js";
import { failQuest } from "../src/modules/quest/quest.service.js";

test("failing an active quest deducts its task-scaled XP once", async (t) => {
  const originals = {
    questFindOne: Quest.findOne,
    questFindOneAndUpdate: Quest.findOneAndUpdate,
    hunterFindOne: Hunter.findOne,
    userFindById: User.findById,
    notificationCreate: Notification.create,
    random: Math.random,
  };
  t.after(() => {
    Quest.findOne = originals.questFindOne;
    Quest.findOneAndUpdate = originals.questFindOneAndUpdate;
    Hunter.findOne = originals.hunterFindOne;
    User.findById = originals.userFindById;
    Notification.create = originals.notificationCreate;
    Math.random = originals.random;
  });

  let status = "active";
  const quest = {
    _id: "quest-1",
    title: "Finish a practice task",
    xpReward: 100,
    xpPenalty: 0,
    save: async function save() { return this; },
  };
  const hunter = {
    totalXP: 100,
    level: 1,
    xp: 0,
    rank: "E",
    save: async () => {},
  };
  const notifications = [];
  Math.random = () => 0.5;
  Quest.findOne = () => ({
    select: () => ({ lean: async () => status === "active" ? { xpReward: 100 } : null }),
  });
  Quest.findOneAndUpdate = async (_filter, update) => {
    if (status !== "active") return null;
    status = update.$set.status;
    quest.status = status;
    quest.xpPenalty = update.$set.xpPenalty;
    return quest;
  };
  Hunter.findOne = async () => hunter;
  User.findById = () => ({
    select: async () => ({
      isActive: true,
      email: "hunter@example.invalid",
      settings: { notifications: { enabled: true, inApp: true, questUpdates: true } },
    }),
  });
  Notification.create = async (notification) => {
    notifications.push(notification);
    return { toObject: () => notification };
  };

  const failedQuest = await failQuest("quest-1", "user-1");
  assert.equal(failedQuest.status, "failed");
  assert.equal(failedQuest.xpPenalty, 18);
  assert.equal(hunter.totalXP, 82);
  assert.equal(notifications[0].metadata.xpPenalty, 18);

  await assert.rejects(failQuest("quest-1", "user-1"), { statusCode: 404 });
  assert.equal(hunter.totalXP, 82);
  assert.equal(notifications.length, 1);
});
