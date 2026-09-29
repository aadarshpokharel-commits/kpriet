import { Document, Schema, Types, model } from 'mongoose';

export type SimulationActivityEvent = 'OPENED' | 'COMPLETED';

/** One Challenge-mode attempt (Electrical & Electronics and future subjects with learning modes). */
export interface ISimulationChallengeAttempt {
  challengeId: string;
  kind: string;
  prompt: string;
  target: number;
  unit?: string;
  tolerance: number;
  meta?: Record<string, unknown>;
  configuration: Record<string, unknown>;
  answer: { value?: number | null; text?: string };
  calculation?: string;
  attempt: number;
  result: 'CORRECT' | 'INCORRECT';
  /** true when the backend re-evaluated the configuration itself */
  verified: boolean;
  serverValue?: number | null;
  mode: string;
  submittedAt: Date;
}

export interface ISimulationActivity extends Document {
  student: Types.ObjectId;
  subject: Types.ObjectId;
  simulation: Types.ObjectId;
  topic?: string;
  firstOpenedAt: Date;
  lastOpenedAt: Date;
  completedAt?: Date;
  lastMode?: string;
  challengeAttempts?: ISimulationChallengeAttempt[];
  createdAt: Date;
  updatedAt: Date;
}

const challengeAttemptSchema = new Schema<ISimulationChallengeAttempt>(
  {
    challengeId: { type: String, required: true, trim: true, maxlength: 200 },
    kind: { type: String, required: true, trim: true, maxlength: 60 },
    prompt: { type: String, required: true, trim: true, maxlength: 600 },
    target: { type: Number, required: true },
    unit: { type: String, trim: true, maxlength: 60 },
    tolerance: { type: Number, required: true, min: 0 },
    meta: { type: Schema.Types.Mixed },
    configuration: { type: Schema.Types.Mixed, required: true },
    answer: { value: { type: Number }, text: { type: String, trim: true, maxlength: 300 } },
    calculation: { type: String, trim: true, maxlength: 600 },
    attempt: { type: Number, required: true, min: 1 },
    result: { type: String, enum: ['CORRECT', 'INCORRECT'], required: true },
    verified: { type: Boolean, default: false },
    serverValue: { type: Number },
    mode: { type: String, default: 'CHALLENGE', trim: true, maxlength: 20 },
    submittedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: true }
);

const simulationActivitySchema = new Schema<ISimulationActivity>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    simulation: { type: Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
    topic: { type: String, trim: true, maxlength: 120 },
    firstOpenedAt: { type: Date, required: true, default: Date.now },
    lastOpenedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
    lastMode: { type: String, trim: true, maxlength: 20 },
    challengeAttempts: { type: [challengeAttemptSchema], default: undefined },
  },
  { timestamps: true }
);

simulationActivitySchema.index({ student: 1, simulation: 1 }, { unique: true });
simulationActivitySchema.index({ subject: 1, simulation: 1, completedAt: 1 });

export const SimulationActivity = model<ISimulationActivity>('SimulationActivity', simulationActivitySchema);
