import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import {
  getMyProfile,
  getPublicCard,
  equipTitle,
  getFutureSelf,
} from "./hunter.controller.js";

const router = Router();

router.use(protect);

router.get("/me", getMyProfile);
router.get("/future-self", requireAwakened, getFutureSelf);
router.patch("/title", requireAwakened, equipTitle);
router.get("/:id/card", getPublicCard);

export default router;
