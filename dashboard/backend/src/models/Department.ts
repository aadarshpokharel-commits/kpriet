import { Document, Schema, Types, model } from 'mongoose';
import { ProgrammeType } from '../types/academic.types.js';

/**
 * Department / Programme Master.
 *
 * Every academic record (users, semesters, subjects, curriculum units, teacher
 * assignments, enrollments, content, quizzes, assignments, attendance, results
 * and RAG knowledge) references this collection through its `department`
 * ObjectId. For the 14 official B.E. programmes one department document IS the
 * programme: its stable `code` (e.g. "IT") is exposed as `programmeId` by the
 * /programmes API.
 *
 * Records with `isProgramme: false` (e.g. Science & Humanities) are supporting
 * departments: they may own faculty but never appear in programme lists and
 * cannot own semesters or subjects.
 */
export interface IDepartment extends Document {
  name: string;
  code: string;
  shortName?: string;
  /** Degree label of the programme, e.g. "B.E." */
  type?: string;
  programmeType: ProgrammeType;
  isProgramme?: boolean;
  isActive: boolean;
  displayOrder: number;
  officialWebsite?: string;
  icon?: string;
  legacyCodes: string[];
  description?: string;
  hod?: Types.ObjectId | null;
  status: 'ACTIVE' | 'INACTIVE';
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      minlength: [2, 'Department name must be at least 2 characters'],
      maxlength: [150, 'Department name cannot exceed 150 characters'],
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, 'Department code must be at least 2 characters'],
      maxlength: [15, 'Department code cannot exceed 15 characters'],
      index: true,
    },
    shortName: {
      type: String,
      trim: true,
      maxlength: [60, 'Short name cannot exceed 60 characters'],
    },
    type: {
      type: String,
      trim: true,
      maxlength: [20, 'Programme type cannot exceed 20 characters'],
    },
    programmeType: {
      type: String,
      enum: Object.values(ProgrammeType),
      default: ProgrammeType.UG,
      required: true,
    },
    // No default: records the programme master has not classified yet behave as
    // programmes; the master seeder marks every non-official department `false`.
    isProgramme: {
      type: Boolean,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 999,
    },
    officialWebsite: {
      type: String,
      trim: true,
      maxlength: [300, 'Website URL cannot exceed 300 characters'],
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 16,
    },
    legacyCodes: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    hod: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/** Stable programme identifier used by the API and UI (e.g. "IT"). */
departmentSchema.virtual('programmeId').get(function (this: IDepartment) {
  return this.code;
});

/**
 * Keep the legacy `status` field and the new `isActive` flag consistent,
 * whichever one a caller changed.
 */
departmentSchema.pre('validate', function (next) {
  if (this.isModified('isActive') && !this.isModified('status')) {
    this.status = this.isActive ? 'ACTIVE' : 'INACTIVE';
  } else if (this.isModified('status') || this.isNew) {
    this.isActive = this.status === 'ACTIVE';
  }
  next();
});

departmentSchema.index({ name: 'text', description: 'text' });
departmentSchema.index({ isProgramme: 1, isActive: 1, displayOrder: 1 });

export const Department = model<IDepartment>('Department', departmentSchema);
