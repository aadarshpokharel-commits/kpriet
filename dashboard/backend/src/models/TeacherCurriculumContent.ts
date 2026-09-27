import { Document, Schema, Types, model } from 'mongoose';

export interface ITeacherTopic {
  _id?: Types.ObjectId;
  topicId: string;
  title: string;
  order: number;
  explanation?: string;
  examples?: string[];
  formulas?: string[];
  diagrams?: string[];
  teacherNotes?: string;
  subtopics?: string[];
  attachments?: {
    name: string;
    url: string;
    sizeBytes?: number;
    mimeType?: string;
  }[];
  links?: {
    title: string;
    url: string;
  }[];
}

export interface ITeacherCurriculumContent extends Document {
  teacher: Types.ObjectId;
  subject: Types.ObjectId;
  department: Types.ObjectId;
  semester: Types.ObjectId;
  curriculumUnit?: Types.ObjectId;
  unitNumber: number;
  chapterTitle?: string;
  teachingNotes?: string;
  learningObjectives?: string[];
  importantPoints?: string[];
  practicalExamples?: string[];
  referenceMaterials?: string[];
  topics: ITeacherTopic[];
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

const teacherTopicSchema = new Schema<ITeacherTopic>(
  {
    topicId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Topic title is required'],
      trim: true,
      maxlength: 200,
    },
    order: {
      type: Number,
      default: 1,
    },
    explanation: {
      type: String,
      trim: true,
    },
    examples: {
      type: [String],
      default: [],
    },
    formulas: {
      type: [String],
      default: [],
    },
    diagrams: {
      type: [String],
      default: [],
    },
    teacherNotes: {
      type: String,
      trim: true,
    },
    subtopics: {
      type: [String],
      default: [],
    },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        sizeBytes: { type: Number },
        mimeType: { type: String },
      },
    ],
    links: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
  },
  { _id: true }
);

const teacherCurriculumContentSchema = new Schema<ITeacherCurriculumContent>(
  {
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    semester: {
      type: Schema.Types.ObjectId,
      ref: 'Semester',
      required: true,
      index: true,
    },
    curriculumUnit: {
      type: Schema.Types.ObjectId,
      ref: 'CurriculumUnit',
      index: true,
    },
    unitNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      index: true,
    },
    chapterTitle: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    teachingNotes: {
      type: String,
      trim: true,
    },
    learningObjectives: {
      type: [String],
      default: [],
    },
    importantPoints: {
      type: [String],
      default: [],
    },
    practicalExamples: {
      type: [String],
      default: [],
    },
    referenceMaterials: {
      type: [String],
      default: [],
    },
    topics: {
      type: [teacherTopicSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED'],
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

// One custom curriculum entry per teacher, subject, and unit
teacherCurriculumContentSchema.index(
  { teacher: 1, subject: 1, unitNumber: 1 },
  { unique: true }
);

export const TeacherCurriculumContent = model<ITeacherCurriculumContent>(
  'TeacherCurriculumContent',
  teacherCurriculumContentSchema
);
