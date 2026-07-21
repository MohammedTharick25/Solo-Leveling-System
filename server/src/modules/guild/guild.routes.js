import { Router } from "express";
import { body } from "express-validator";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import * as GuildController from "./guild.controller.js";

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

const challengeValidators = [
  body("title").notEmpty().trim().withMessage("Challenge title is required"),
  body("xpReward")
    .optional()
    .isNumeric()
    .withMessage("xpReward must be a number"),
  body("firstCompleterBonus")
    .optional()
    .isNumeric()
    .withMessage("firstCompleterBonus must be a number"),
  body("deadline")
    .optional()
    .isISO8601()
    .withMessage("deadline must be a valid date"),
  validate,
];

const router = Router();
router.use(protect, requireAwakened);

router.get("/mine", GuildController.getMine);
router.get("/search", GuildController.search);
router.post("/", createValidators, GuildController.create);
router.post("/:id/join", GuildController.join);
router.delete("/:id/leave", GuildController.leave);
router.get("/:id/members", GuildController.getMembers);
router.patch("/:id/promote/:memberId", GuildController.promote);

// ── Challenges ─────────────────────────────────────────────────────────────
router.post(
  "/:id/challenges",
  challengeValidators,
  GuildController.addChallenge,
);
router.post(
  "/:id/challenges/:challengeId/complete",
  GuildController.completeChallenge,
);

export default router;
