import { Document, Schema, Types, model } from 'mongoose';
import { EnrollmentStatus } from '../types/academic.types.js';

export interface IStudentEnrollment extends Document {
  student: Types.ObjectId;
  department: Types.ObjectId;
  semester: Types.ObjectId;
  academicYear: string;
  enrolledSubjects: Types.ObjectId[];
  status: EnrollmentStatus;
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId | null;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const studentEnrollmentSchema = new Schema<IStudentEnrollment>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
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
    academicYear: {
      type: String,
      required: [true, 'Academic year is required (e.g. 2024-2025)'],
      trim: true,
      match: [/^\d{4}-\d{4}$/, 'Academic year must be formatted as YYYY-YYYY'],
      index: true,
    },
    enrolledSubjects: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
    status: {
      type: String,
      enum: Object.values(EnrollmentStatus),
      default: EnrollmentStatus.PENDING,
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate enrollment records for the same student, semester, and academic year
studentEnrollmentSchema.index(
  {
    student: 1,
    semester: 1,
    academicYear: 1,
  },
  { unique: true }
);

// Enforce rule: A student can only have ONE APPROVED (active) enrollment at any given time
studentEnrollmentSchema.index(
  { student: 1 },
  {
    unique: true,
    partialFilterExpression: { status: EnrollmentStatus.APPROVED },
  }
);

studentEnrollmentSchema.index({ department: 1, semester: 1, status: 1 });

export const StudentEnrollment = model<IStudentEnrollment>(
  'StudentEnrollment',
  studentEnrollmentSchema
);
