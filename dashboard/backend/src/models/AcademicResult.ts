import { Document, Schema, Types, model } from 'mongoose';
import { AcademicResultStatus } from '../types/academic.types.js';

// -------------------------------------------------------------
// 1. SUBJECT RESULT
// -------------------------------------------------------------
export interface ISubjectResult extends Document {
  student: Types.ObjectId;
  subject: Types.ObjectId;
  department: Types.ObjectId;
  semester: Types.ObjectId;
  academicYear: string;
  internalMarks: number;
  assignmentScoreAvg?: number;
  quizScoreAvg?: number;
  attendancePercentage?: number;
  endSemExamMarks: number;
  totalMarks: number;
  gradePoint: number;
  letterGrade: string;
  credits: number;
  status: AcademicResultStatus;
  createdAt: Date;
  updatedAt: Date;
}

const subjectResultSchema = new Schema<ISubjectResult>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
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
      index: true,
    },
    internalMarks: {
      type: Number,
      required: true,
      min: 0,
      max: 50,
      default: 0,
    },
    assignmentScoreAvg: {
      type: Number,
      min: 0,
      max: 100,
    },
    quizScoreAvg: {
      type: Number,
      min: 0,
      max: 100,
    },
    attendancePercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    endSemExamMarks: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    gradePoint: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    letterGrade: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      enum: ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'RA', 'SA', 'W', 'AB'],
    },
    credits: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    status: {
      type: String,
      enum: Object.values(AcademicResultStatus),
      default: AcademicResultStatus.PASS,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate subject result for student in the same semester and academic year
subjectResultSchema.index(
  {
    student: 1,
    subject: 1,
    semester: 1,
    academicYear: 1,
  },
  { unique: true }
);

export const SubjectResult = model<ISubjectResult>(
  'SubjectResult',
  subjectResultSchema
);

// -------------------------------------------------------------
// 2. SEMESTER RESULT
// -------------------------------------------------------------
export interface ISemesterResult extends Document {
  student: Types.ObjectId;
  department: Types.ObjectId;
  semester: Types.ObjectId;
  semesterNumber: number;
  academicYear: string;
  gpa: number;
  cgpa: number;
  totalCreditsRegistered: number;
  totalCreditsEarned: number;
  subjectResults: Types.ObjectId[];
  status: AcademicResultStatus;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const semesterResultSchema = new Schema<ISemesterResult>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
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
    semesterNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      index: true,
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required (e.g. 2024-2025)'],
      trim: true,
      index: true,
    },
    gpa: {
      type: Number,
      required: [true, 'GPA is required'],
      min: [0, 'GPA cannot be negative'],
      max: [10, 'GPA cannot exceed 10'],
    },
    cgpa: {
      type: Number,
      required: [true, 'CGPA is required'],
      min: [0, 'CGPA cannot be negative'],
      max: [10, 'CGPA cannot exceed 10'],
    },
    totalCreditsRegistered: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCreditsEarned: {
      type: Number,
      required: true,
      min: 0,
    },
    subjectResults: [
      {
        type: Schema.Types.ObjectId,
        ref: 'SubjectResult',
      },
    ],
    status: {
      type: String,
      enum: Object.values(AcademicResultStatus),
      default: AcademicResultStatus.PASS,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate semester result for student, semester, and academic year
semesterResultSchema.index(
  {
    student: 1,
    semester: 1,
    academicYear: 1,
  },
  { unique: true }
);

semesterResultSchema.index({ department: 1, semesterNumber: 1, academicYear: 1 });

export const SemesterResult = model<ISemesterResult>(
  'SemesterResult',
  semesterResultSchema
);
