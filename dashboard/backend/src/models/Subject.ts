import { Document, Schema, Types, model } from 'mongoose';

export interface ISyllabusUnit {
  _id?: Types.ObjectId;
  unitNumber: number;
  unitCode?: string;
  title: string;
  description?: string;
  syllabusText?: string;
  topics: string[];
  subtopics?: string[];
  hours?: number;
}

export interface ISubject extends Document {
  subjectName: string;
  subjectCode: string;
  department: Types.ObjectId;
  semester: Types.ObjectId;
  semesterNumber: number;
  credits: number;
  category?: 'HSMC' | 'BSC' | 'ESC' | 'PCC' | 'PEC' | 'OEC' | 'EEC' | 'MNC' | string;
  isElectiveSlot?: boolean;
  electiveSlotType?: 'PEC' | 'OEC';
  electiveSlotCode?: string;
  practicalInfo?: string;
  projectInfo?: string;
  syllabus: ISyllabusUnit[];
  description?: string;
  icon?: string;
  color?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const syllabusUnitSchema = new Schema<ISyllabusUnit>(
  {
    unitNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    unitCode: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      required: true,
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
    hours: {
      type: Number,
      min: 1,
    },
  },
  { _id: true }
);

const subjectSchema = new Schema<ISubject>(
  {
    subjectName: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      minlength: [2, 'Subject name must be at least 2 characters'],
      maxlength: [150, 'Subject name cannot exceed 150 characters'],
    },
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required (e.g. U21MA101)'],
      trim: true,
      uppercase: true,
      index: true,
      maxlength: [20, 'Subject code cannot exceed 20 characters'],
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required for subject'],
      index: true,
    },
    semester: {
      type: Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester reference is required for subject'],
      index: true,
    },
    semesterNumber: {
      type: Number,
      required: [true, 'Semester number is required'],
      min: 1,
      max: 10,
      index: true,
    },
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: [0, 'Credits cannot be negative'],
      max: [10, 'Credits cannot exceed 10'],
    },
    category: {
      type: String,
      enum: ['HSMC', 'BSC', 'ESC', 'PCC', 'PEC', 'OEC', 'EEC', 'MNC', 'OTHER'],
      default: 'PCC',
      index: true,
    },
    isElectiveSlot: {
      type: Boolean,
      default: false,
      index: true,
    },
    electiveSlotType: {
      type: String,
      enum: ['PEC', 'OEC'],
    },
    electiveSlotCode: {
      type: String,
      trim: true,
    },
    practicalInfo: {
      type: String,
      trim: true,
    },
    projectInfo: {
      type: String,
      trim: true,
    },
    syllabus: {
      type: [syllabusUnitSchema],
      default: [],
    },
    description: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
      default: '📚',
    },
    color: {
      type: String,
      trim: true,
      default: '#2563eb',
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

// Prevent duplicate subject code within the same department and semester
subjectSchema.index(
  {
    subjectCode: 1,
    department: 1,
    semester: 1,
  },
  { unique: true }
);

subjectSchema.index({ subjectName: 'text', subjectCode: 'text' });

export const Subject = model<ISubject>('Subject', subjectSchema);
