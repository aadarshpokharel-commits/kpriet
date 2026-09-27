import { Document, Schema, Types, model } from 'mongoose';
import { SemesterStatus } from '../types/academic.types.js';

export interface ISemester extends Document {
  semesterNumber: number;
  academicYear: string;
  regulation: string;
  department: Types.ObjectId;
  programme?: Types.ObjectId;
  startDate?: Date;
  endDate?: Date;
  status: SemesterStatus;
  createdAt: Date;
  updatedAt: Date;
}

const semesterSchema = new Schema<ISemester>(
  {
    semesterNumber: {
      type: Number,
      required: [true, 'Semester number is required'],
      min: [1, 'Semester number must be at least 1'],
      max: [10, 'Semester number cannot exceed 10'],
      index: true,
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required (e.g. 2024-2025)'],
      trim: true,
      match: [/^\d{4}-\d{4}$/, 'Academic year must be formatted as YYYY-YYYY'],
      index: true,
    },
    regulation: {
      type: String,
      required: [true, 'Regulation is required (e.g. R2021)'],
      trim: true,
      uppercase: true,
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required for semester'],
      index: true,
    },
    programme: {
      type: Schema.Types.ObjectId,
      ref: 'Programme',
      index: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(SemesterStatus),
      default: SemesterStatus.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate semester definition for the same department, number, year and regulation
semesterSchema.index(
  {
    department: 1,
    semesterNumber: 1,
    academicYear: 1,
    regulation: 1,
  },
  { unique: true }
);

export const Semester = model<ISemester>('Semester', semesterSchema);
