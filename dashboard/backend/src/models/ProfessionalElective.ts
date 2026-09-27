import { Document, Schema, Types, model } from 'mongoose';

export interface IProfessionalElective extends Document {
  code: string;
  name: string;
  department: Types.ObjectId;
  programme?: Types.ObjectId;
  vertical: string;
  verticalNumber: number;
  verticalName: string;
  credits: number;
  category: string;
  sourcePage?: number;
  syllabusSummary: string;
  topics: string[];
  slots: string[]; // e.g. ['PEC-I', 'PEC-II', 'PEC-III', 'PEC-IV', 'PEC-V', 'PEC-VI']
  semesters: number[]; // e.g. [5, 6, 7]
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const professionalElectiveSchema = new Schema<IProfessionalElective>(
  {
    code: {
      type: String,
      required: [true, 'Elective code is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Elective name is required'],
      trim: true,
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
    vertical: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    verticalNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      index: true,
    },
    verticalName: {
      type: String,
      required: true,
      trim: true,
    },
    credits: {
      type: Number,
      default: 3,
    },
    category: {
      type: String,
      default: 'PEC',
    },
    sourcePage: {
      type: Number,
    },
    syllabusSummary: {
      type: String,
      trim: true,
    },
    topics: {
      type: [String],
      default: [],
    },
    slots: {
      type: [String],
      default: ['PEC-I', 'PEC-II', 'PEC-III', 'PEC-IV', 'PEC-V', 'PEC-VI'],
    },
    semesters: {
      type: [Number],
      default: [5, 6, 7],
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

professionalElectiveSchema.index(
  { code: 1, department: 1 },
  { unique: true }
);

professionalElectiveSchema.index({ verticalNumber: 1, code: 1 });
professionalElectiveSchema.index({ name: 'text', code: 'text', syllabusSummary: 'text' });

export const ProfessionalElective = model<IProfessionalElective>('ProfessionalElective', professionalElectiveSchema);
