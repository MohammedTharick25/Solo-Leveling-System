import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import {
  getMyProfile,
  getPublicCard,
  equipTitle,
  getFutureSelf,
} from "./hunter.controller.js";

const router = Router();

// Public profile card must remain accessible to social crawlers and logged-out visitors.
router.get("/:id/card", getPublicCard);

router.use(protect);

router.get("/me", getMyProfile);
router.get("/future-self", requireAwakened, getFutureSelf);
router.patch("/title", requireAwakened, equipTitle);

export default router;
