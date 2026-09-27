import { Document, Schema, Types, model } from 'mongoose';

export enum FileCategory {
  ASSIGNMENT_SUBMISSION = 'ASSIGNMENT_SUBMISSION',
  SUBJECT_RESOURCE = 'SUBJECT_RESOURCE',
  LECTURE_NOTE = 'LECTURE_NOTE',
  PRESENTATION = 'PRESENTATION',
  LECTURE_VIDEO = 'LECTURE_VIDEO',
  GENERAL_DOCUMENT = 'GENERAL_DOCUMENT',
}

export enum SecurityScanStatus {
  CLEAN = 'CLEAN',
  FLAGGED = 'FLAGGED',
  PENDING = 'PENDING',
}

export interface ISecurityScan {
  status: SecurityScanStatus;
  scannedAt: Date;
  scanEngine: string;
  threatDetails?: string;
}

export interface IAcademicFile extends Document {
  storageKey: string;
  originalFilename: string;
  sanitizedFilename: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  sha256Hash: string;
  category: FileCategory;
  securityScan: ISecurityScan;

  // Hierarchy and Scope
  uploadedBy: Types.ObjectId;
  department?: Types.ObjectId;
  semester?: Types.ObjectId;
  subject?: Types.ObjectId;
  chapterOrUnit?: number;
  assignment?: Types.ObjectId;
  submission?: Types.ObjectId;

  // Authorization Controls
  isPublicToSubject: boolean;
  isConfidentialSubmission: boolean;
  allowedRoles?: string[];

  // Auditing
  downloadCount: number;
  lastDownloadedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const securityScanSchema = new Schema<ISecurityScan>(
  {
    status: {
      type: String,
      enum: Object.values(SecurityScanStatus),
      default: SecurityScanStatus.CLEAN,
    },
    scannedAt: { type: Date, default: Date.now },
    scanEngine: { type: String, default: 'Eduverse-Heuristics-v2.4' },
    threatDetails: { type: String },
  },
  { _id: false }
);

const academicFileSchema = new Schema<IAcademicFile>(
  {
    storageKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    sanitizedFilename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    extension: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 1,
    },
    sha256Hash: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(FileCategory),
      default: FileCategory.SUBJECT_RESOURCE,
      index: true,
    },
    securityScan: {
      type: securityScanSchema,
      default: () => ({}),
    },

    // Hierarchy References
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    semester: {
      type: Schema.Types.ObjectId,
      ref: 'Semester',
      index: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      index: true,
    },
    chapterOrUnit: {
      type: Number,
      min: 1,
      max: 10,
    },
    assignment: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      index: true,
    },
    submission: {
      type: Schema.Types.ObjectId,
      ref: 'AssignmentSubmission',
      index: true,
    },

    // Access flags
    isPublicToSubject: {
      type: Boolean,
      default: true,
    },
    isConfidentialSubmission: {
      type: Boolean,
      default: false,
      index: true,
    },
    allowedRoles: {
      type: [String],
      default: [],
    },

    // Metrics
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastDownloadedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

academicFileSchema.index({ subject: 1, category: 1, isPublicToSubject: 1 });
academicFileSchema.index({ uploadedBy: 1, category: 1 });
academicFileSchema.index({ assignment: 1, uploadedBy: 1 });

export const AcademicFile = model<IAcademicFile>('AcademicFile', academicFileSchema);
