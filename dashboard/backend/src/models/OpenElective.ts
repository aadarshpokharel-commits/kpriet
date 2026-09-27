import { Document, Schema, Types, model } from 'mongoose';

export interface IOpenElective extends Document {
  code: string;
  name: string;
  department: Types.ObjectId;
  programme?: Types.ObjectId;
  group: string; // e.g. 'Open Elective - I'
  slot: string;  // e.g. 'OEC-I', 'OEC-II', 'OEC-III', 'OEC-IV'
  semesterNumber: number; // 4, 5, 6, 7
  credits: number;
  category: string;
  syllabusSummary?: string;
  topics?: string[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const openElectiveSchema = new Schema<IOpenElective>(
  {
    code: {
      type: String,
      required: [true, 'Open Elective code is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Open Elective name is required'],
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
    group: {
      type: String,
      required: true,
      trim: true,
    },
    slot: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    semesterNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      index: true,
    },
    credits: {
      type: Number,
      default: 3,
    },
    category: {
      type: String,
      default: 'OEC',
    },
    syllabusSummary: {
      type: String,
      trim: true,
    },
    topics: {
      type: [String],
      default: [],
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

openElectiveSchema.index(
  { code: 1, department: 1, semesterNumber: 1 },
  { unique: true }
);

openElectiveSchema.index({ slot: 1, semesterNumber: 1 });
openElectiveSchema.index({ name: 'text', code: 'text' });

export const OpenElective = model<IOpenElective>('OpenElective', openElectiveSchema);
