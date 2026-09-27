import { Document, Schema, Types, model } from 'mongoose';
import { ProgrammeType } from '../types/academic.types.js';

export interface IProgramme extends Document {
  name: string;
  code: string;
  degree: string;
  department: Types.ObjectId;
  programmeType: ProgrammeType;
  durationYears: number;
  totalSemesters: number;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const programmeSchema = new Schema<IProgramme>(
  {
    name: {
      type: String,
      required: [true, 'Programme name is required'],
      trim: true,
      minlength: [2, 'Programme name must be at least 2 characters'],
      maxlength: [150, 'Programme name cannot exceed 150 characters'],
    },
    code: {
      type: String,
      required: [true, 'Programme code is required'],
      uppercase: true,
      trim: true,
      minlength: [2, 'Programme code must be at least 2 characters'],
      maxlength: [20, 'Programme code cannot exceed 20 characters'],
      index: true,
    },
    degree: {
      type: String,
      required: [true, 'Degree designation is required (e.g. B.Tech, B.E., M.E., Ph.D)'],
      trim: true,
      maxlength: [50, 'Degree cannot exceed 50 characters'],
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
      index: true,
    },
    programmeType: {
      type: String,
      enum: Object.values(ProgrammeType),
      default: ProgrammeType.UG,
      required: true,
      index: true,
    },
    durationYears: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
      default: 4,
    },
    totalSemesters: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      default: 8,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate programme codes within the same department
programmeSchema.index({ department: 1, code: 1 }, { unique: true });

export const Programme = model<IProgramme>('Programme', programmeSchema);
