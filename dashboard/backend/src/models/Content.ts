import { Document, Schema, Types, model } from 'mongoose';
import { ContentStatus, ContentType } from '../types/academic.types.js';

export interface IContentAttachment {
  name: string;
  url: string;
  sizeBytes?: number;
  mimeType?: string;
}

export interface ISimulationConfig {
  type: string;
  initialParams?: Record<string, unknown>;
  controls?: string[];
  smartboardPresetId?: string;
}

export interface IContent extends Document {
  title: string;
  description?: string;
  contentType: ContentType;
  department: Types.ObjectId;
  semester: Types.ObjectId;
  subject: Types.ObjectId;
  teacher: Types.ObjectId;
  chapterOrUnit?: number;
  attachments: IContentAttachment[];
  resourceUrls: string[];
  simulationConfig?: ISimulationConfig;
  tags: string[];
  viewCount: number;
  status: ContentStatus;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const contentAttachmentSchema = new Schema<IContentAttachment>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    sizeBytes: { type: Number },
    mimeType: { type: String, trim: true },
  },
  { _id: false }
);

const simulationConfigSchema = new Schema<ISimulationConfig>(
  {
    type: { type: String, required: true },
    initialParams: { type: Schema.Types.Mixed },
    controls: { type: [String], default: [] },
    smartboardPresetId: { type: String },
  },
  { _id: false }
);

const contentSchema = new Schema<IContent>(
  {
    title: {
      type: String,
      required: [true, 'Content title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
    contentType: {
      type: String,
      enum: Object.values(ContentType),
      required: [true, 'Content type is required'],
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
      index: true,
    },
    semester: {
      type: Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester reference is required'],
      index: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
      index: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher reference is required'],
      index: true,
    },
    chapterOrUnit: {
      type: Number,
      min: 1,
      max: 10,
      index: true,
    },
    attachments: {
      type: [contentAttachmentSchema],
      default: [],
    },
    resourceUrls: {
      type: [String],
      default: [],
    },
    simulationConfig: {
      type: simulationConfigSchema,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(ContentStatus),
      default: ContentStatus.PUBLISHED,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

contentSchema.index({
  subject: 1,
  contentType: 1,
  status: 1,
  chapterOrUnit: 1,
});
contentSchema.index({ department: 1, semester: 1, status: 1 });
contentSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const Content = model<IContent>('Content', contentSchema);
