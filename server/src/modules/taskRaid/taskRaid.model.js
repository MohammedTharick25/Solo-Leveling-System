import mongoose from 'mongoose';

const taskRaidSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: String,
    category: {
      type: String,
      enum: ['work','study','project','reading','fitness','personal','creative','communication','other'],
      default: 'other',
    },
    difficulty: { type: String, enum: ['F','E','D','C','B','A','S'], default: 'D' },
    priority:   { type: String, enum: ['low','medium','high','critical'], default: 'medium' },
    xpReward:   { type: Number, default: 0 },
    statRewards:[{ stat: String, amount: Number, _id: false }],
    estimatedMinutes: { type: Number, default: 30 },
    actualMinutes:    { type: Number, default: 0 },
    status: { type: String, enum: ['pending','inProgress','completed','failed'], default: 'pending' },
    dueAt:       Date,
    startedAt:   Date,
    completedAt: Date,
    focusSessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FocusSession' }],
    linkedQuestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quest', default: null },
    subtasks: [{ title: String, completed: { type: Boolean, default: false } }],
    notes: String,
    tags: [String],

    // ── Recurring fields ────────────────────────────────────────────────────
    isRecurring:  { type: Boolean, default: false },
    recurringFrequency: {
      type: String,
      enum: ['daily','weekdays','weekly','monthly'],
      default: null,
    },
    recurringDays: [{ type: Number, min: 0, max: 6 }], // 0=Sun…6=Sat for custom
    parentRaidId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskRaid', default: null }, // cloned instances point back to template
    isTemplate:   { type: Boolean, default: false }, // true = the master recurring template
    lastGeneratedAt: Date,
  },
  { timestamps: true }
);

taskRaidSchema.index({ userId: 1, status: 1 });
taskRaidSchema.index({ userId: 1, dueAt: 1 });
taskRaidSchema.index({ userId: 1, isTemplate: 1 });

export default mongoose.model('TaskRaid', taskRaidSchema);
