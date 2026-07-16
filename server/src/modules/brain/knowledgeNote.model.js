import mongoose from "mongoose";

const knowledgeNoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    type: {
      type: String,
      enum: [
        "note",
        "idea",
        "research",
        "article",
        "book",
        "quote",
        "journal",
        "page",
        "resource",
      ],
      default: "note",
    },
    tags: [{ type: String, lowercase: true, trim: true }],
    linkedNotes: [
      { type: mongoose.Schema.Types.ObjectId, ref: "KnowledgeNote" },
    ],
    source: String,
    sourceUrl: String,
    isFavorite: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    coverEmoji: { type: String, default: "📝" },
    readingProgress: { type: Number, default: 0, min: 0, max: 100 },
    wordCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    lastViewedAt: Date,
  },
  { timestamps: true },
);

knowledgeNoteSchema.index({ userId: 1, tags: 1 });
knowledgeNoteSchema.index({ userId: 1, type: 1 });
knowledgeNoteSchema.index({ userId: 1, isFavorite: 1 });
knowledgeNoteSchema.index({
  userId: 1,
  title: "text",
  content: "text",
  tags: "text",
});

export default mongoose.model("KnowledgeNote", knowledgeNoteSchema);
