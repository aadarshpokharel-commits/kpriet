import { Document, Schema, Types, model } from 'mongoose';

export type SimulationActivityEvent = 'OPENED' | 'COMPLETED';

export interface ISimulationActivity extends Document {
  student: Types.ObjectId;
  subject: Types.ObjectId;
  simulation: Types.ObjectId;
  topic?: string;
  firstOpenedAt: Date;
  lastOpenedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const simulationActivitySchema = new Schema<ISimulationActivity>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    simulation: { type: Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
    topic: { type: String, trim: true, maxlength: 120 },
    firstOpenedAt: { type: Date, required: true, default: Date.now },
    lastOpenedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

simulationActivitySchema.index({ student: 1, simulation: 1 }, { unique: true });
simulationActivitySchema.index({ subject: 1, simulation: 1, completedAt: 1 });

export const SimulationActivity = model<ISimulationActivity>('SimulationActivity', simulationActivitySchema);
