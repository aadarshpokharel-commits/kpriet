import { Document, Schema, Types, model } from 'mongoose';

export interface ICurriculumUnit extends Document {
  subject: Types.ObjectId;
  subjectCode: string;
  department: Types.ObjectId;
  programme?: Types.ObjectId;
  semester: Types.ObjectId;
  semesterNumber: number;
  unitNumber: number;
  unitCode?: string;
  title: string;
  description?: string;
  syllabusText?: string;
  topics: string[];
  subtopics?: string[];
  estimatedHours?: number;
  order: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const curriculumUnitSchema = new Schema<ICurriculumUnit>(
  {
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required for curriculum unit'],
      index: true,
    },
    subjectCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    programme: {
      type: Schema.Types.ObjectId,
      ref: 'Programme',
      index: true,
    },
    semester: {
      type: Schema.Types.ObjectId,
      ref: 'Semester',
      required: true,
      index: true,
    },
    semesterNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      index: true,
    },
    unitNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      index: true,
    },
    unitCode: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Unit title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    syllabusText: {
      type: String,
      trim: true,
    },
    topics: {
      type: [String],
      default: [],
    },
    subtopics: {
      type: [String],
      default: [],
    },
    estimatedHours: {
      type: Number,
      default: 9,
    },
    order: {
      type: Number,
      default: 1,
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

curriculumUnitSchema.index(
  { subject: 1, unitNumber: 1 },
  { unique: true }
);

curriculumUnitSchema.index({ department: 1, semesterNumber: 1 });
curriculumUnitSchema.index({ title: 'text', description: 'text', topics: 'text' });

export const CurriculumUnit = model<ICurriculumUnit>('CurriculumUnit', curriculumUnitSchema);
