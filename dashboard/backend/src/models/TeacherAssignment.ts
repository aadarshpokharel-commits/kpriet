import { Document, Schema, Types, model } from 'mongoose';
import { TeacherAssignmentStatus } from '../types/academic.types.js';

export interface ITeacherAssignment extends Document {
  teacher: Types.ObjectId;
  subject: Types.ObjectId;
  department: Types.ObjectId;
  semester: Types.ObjectId;
  academicYear: string;
  section?: string;
  isCoordinator?: boolean;
  status: TeacherAssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const teacherAssignmentSchema = new Schema<ITeacherAssignment>(
  {
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher reference is required'],
      index: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
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
    academicYear: {
      type: String,
      required: [true, 'Academic year is required (e.g. 2024-2025)'],
      trim: true,
      match: [/^\d{4}-\d{4}$/, 'Academic year must be formatted as YYYY-YYYY'],
      index: true,
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'ALL',
      maxlength: 10,
    },
    isCoordinator: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(TeacherAssignmentStatus),
      default: TeacherAssignmentStatus.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate assignment of the same teacher, subject, semester, academic year, and section
teacherAssignmentSchema.index(
  {
    teacher: 1,
    subject: 1,
    semester: 1,
    academicYear: 1,
    section: 1,
  },
  { unique: true }
);

teacherAssignmentSchema.index({ subject: 1, academicYear: 1, section: 1 });
teacherAssignmentSchema.index({ department: 1, academicYear: 1 });

export const TeacherAssignment = model<ITeacherAssignment>(
  'TeacherAssignment',
  teacherAssignmentSchema
);
