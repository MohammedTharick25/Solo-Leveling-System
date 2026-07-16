import KnowledgeNote from "./knowledgeNote.model.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { sendSuccess, asyncHandler, paginate } from "../../lib/helpers.js";
import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import { body } from "express-validator";
import { validate } from "../../middleware/validate.middleware.js";

// ── Service ──────────────────────────────────────────────────────────────────

export const createNote = async (userId, data) => {
  const wordCount = (data.content || "").split(/\s+/).filter(Boolean).length;
  return KnowledgeNote.create({ userId, ...data, wordCount });
};

export const getNotes = async (
  userId,
  { type, tags, isFavorite, isArchived, page = 1, limit = 20 } = {},
) => {
  const query = { userId };
  if (type) query.type = type;
  if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
  if (isFavorite !== undefined) query.isFavorite = isFavorite === "true";
  if (isArchived !== undefined) query.isArchived = isArchived === "true";
  else query.isArchived = false; // default: hide archived

  return paginate(KnowledgeNote, query, {
    page,
    limit,
    sort: { updatedAt: -1 },
  });
};

export const getNoteById = async (noteId, userId) => {
  const note = await KnowledgeNote.findOne({ _id: noteId, userId }).populate(
    "linkedNotes",
    "title type coverEmoji tags",
  );
  if (!note) throw new AppError("Note not found.", 404);

  note.viewCount += 1;
  note.lastViewedAt = new Date();
  await note.save();
  return note;
};

export const updateNote = async (noteId, userId, data) => {
  if (data.content !== undefined) {
    data.wordCount = (data.content || "").split(/\s+/).filter(Boolean).length;
  }
  const note = await KnowledgeNote.findOneAndUpdate(
    { _id: noteId, userId },
    data,
    { new: true, runValidators: true },
  );
  if (!note) throw new AppError("Note not found.", 404);
  return note;
};

export const deleteNote = async (noteId, userId) => {
  const note = await KnowledgeNote.findOneAndDelete({ _id: noteId, userId });
  if (!note) throw new AppError("Note not found.", 404);
  // Remove from other notes' linkedNotes
  await KnowledgeNote.updateMany(
    { userId, linkedNotes: noteId },
    { $pull: { linkedNotes: noteId } },
  );
  return note;
};

export const linkNotes = async (noteId, targetId, userId) => {
  if (noteId === targetId)
    throw new AppError("Cannot link a note to itself.", 400);

  const [note, target] = await Promise.all([
    KnowledgeNote.findOne({ _id: noteId, userId }),
    KnowledgeNote.findOne({ _id: targetId, userId }),
  ]);
  if (!note || !target) throw new AppError("Note not found.", 404);

  if (!note.linkedNotes.includes(targetId)) note.linkedNotes.push(targetId);
  if (!target.linkedNotes.includes(noteId)) target.linkedNotes.push(noteId); // bidirectional

  await Promise.all([note.save(), target.save()]);
  return note.populate("linkedNotes", "title type coverEmoji tags");
};

export const unlinkNotes = async (noteId, targetId, userId) => {
  await KnowledgeNote.updateMany(
    { _id: { $in: [noteId, targetId] }, userId },
    { $pull: { linkedNotes: { $in: [noteId, targetId] } } },
  );
  return KnowledgeNote.findOne({ _id: noteId, userId }).populate(
    "linkedNotes",
    "title type coverEmoji tags",
  );
};

export const searchNotes = async (userId, query, limit = 20) => {
  if (!query) return [];
  return KnowledgeNote.find(
    { userId, isArchived: false, $text: { $search: query } },
    { score: { $meta: "textScore" } },
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(limit)
    .select("title type coverEmoji tags updatedAt");
};

export const getGraphData = async (userId) => {
  const notes = await KnowledgeNote.find({ userId, isArchived: false }).select(
    "_id title type coverEmoji linkedNotes tags",
  );

  const nodes = notes.map((n) => ({
    id: n._id,
    label: n.title,
    type: n.type,
    emoji: n.coverEmoji,
    tags: n.tags,
  }));

  const edges = [];
  notes.forEach((n) => {
    n.linkedNotes.forEach((linked) => {
      edges.push({ source: n._id, target: linked });
    });
  });

  return { nodes, edges };
};

export const getTagCloud = async (userId) => {
  const result = await KnowledgeNote.aggregate([
    { $match: { userId: userId, isArchived: false } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);
  return result.map((r) => ({ tag: r._id, count: r.count }));
};

// ── Routes ───────────────────────────────────────────────────────────────────

const createValidators = [
  body("title").notEmpty().trim().withMessage("Title required"),
  body("type")
    .optional()
    .isIn([
      "note",
      "idea",
      "research",
      "article",
      "book",
      "quote",
      "journal",
      "page",
      "resource",
    ]),
  validate,
];

const router = Router();
router.use(protect, requireAwakened);

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const notes = await searchNotes(req.userId, req.query.q, req.query.limit);
    sendSuccess(res, { notes }, "Search complete.");
  }),
);

router.get(
  "/graph",
  asyncHandler(async (req, res) => {
    const graph = await getGraphData(req.userId);
    sendSuccess(res, { graph }, "Knowledge graph retrieved.");
  }),
);

router.get(
  "/tags",
  asyncHandler(async (req, res) => {
    const tags = await getTagCloud(req.userId);
    sendSuccess(res, { tags }, "Tag cloud retrieved.");
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await getNotes(req.userId, req.query);
    sendSuccess(res, result, "Notes retrieved.");
  }),
);

router.post(
  "/",
  createValidators,
  asyncHandler(async (req, res) => {
    const note = await createNote(req.userId, req.body);
    sendSuccess(res, { note }, "Note created.", 201);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const note = await getNoteById(req.params.id, req.userId);
    sendSuccess(res, { note }, "Note retrieved.");
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const note = await updateNote(req.params.id, req.userId, req.body);
    sendSuccess(res, { note }, "Note updated.");
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteNote(req.params.id, req.userId);
    sendSuccess(res, {}, "Note deleted.");
  }),
);

router.post(
  "/:id/link/:targetId",
  asyncHandler(async (req, res) => {
    const note = await linkNotes(
      req.params.id,
      req.params.targetId,
      req.userId,
    );
    sendSuccess(res, { note }, "Notes linked.");
  }),
);

router.delete(
  "/:id/link/:targetId",
  asyncHandler(async (req, res) => {
    const note = await unlinkNotes(
      req.params.id,
      req.params.targetId,
      req.userId,
    );
    sendSuccess(res, { note }, "Notes unlinked.");
  }),
);

export default router;
