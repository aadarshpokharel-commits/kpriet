import { Document, Schema, Types, model } from 'mongoose';
import { AuditAction } from '../types/academic.types.js';

export interface IAuditLog extends Document {
  user?: Types.ObjectId | null;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  department?: Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: [true, 'Audit action is required'],
      index: true,
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required (e.g. User, Content, Quiz)'],
      trim: true,
      index: true,
    },
    entityId: {
      type: String,
      trim: true,
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for fast audit log lookups
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
