import { Document, Schema, Types, model } from 'mongoose';
import {
  QuestionType,
  QuizAttemptStatus,
  QuizStatus,
  DifficultyLevel,
  QuizNavigationRule,
} from '../types/academic.types.js';

// -------------------------------------------------------------
// 1. QUIZ
// -------------------------------------------------------------
export interface IQuiz extends Document {
  title: string;
  description?: string;
  department: Types.ObjectId;
  semester: Types.ObjectId;
  subject: Types.ObjectId;
  teacher: Types.ObjectId;
  curriculumUnits: number[];
  /** Topics within the selected units (Programme → Semester → Subject → Unit → Topic). */
  topics: string[];
  difficultyLevel: DifficultyLevel;
  sourceNotes: Array<{ name: string; url: string }>;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  instructions?: string;
  startTime?: Date;
  endTime?: Date;
  allowMultipleAttempts: boolean;
  maxAttempts: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  negativeMarkingEnabled: boolean;
  negativeMarksPerQuestion: number;
  showResultImmediately: boolean;
  showAnswersAfterSubmission: boolean;
  fullscreenRequired: boolean;
  maxWarnings: number;
  tabSwitchDetection: boolean;
  autoSubmitOnMaxViolations: boolean;
  blockCopyPaste: boolean;
  navigationRule: QuizNavigationRule;
  status: QuizStatus;
  createdAt: Date;
  updatedAt: Date;
}

const quizSchema = new Schema<IQuiz>(
  {
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
      minlength: [2, 'Quiz title must be at least 2 characters'],
      maxlength: [200, 'Quiz title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
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
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
      index: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher reference is required'],
      index: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
      max: [300, 'Duration cannot exceed 300 minutes'],
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks are required'],
      min: [1, 'Total marks must be at least 1'],
    },
    passingMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    instructions: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    allowMultipleAttempts: {
      type: Boolean,
      default: false,
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1,
    },
    curriculumUnits: {
      type: [Number],
      default: [1],
    },
    topics: {
      type: [String],
      default: [],
    },
    difficultyLevel: {
      type: String,
      enum: Object.values(DifficultyLevel),
      default: DifficultyLevel.MEDIUM,
    },
    sourceNotes: [
      {
        name: { type: String, trim: true },
        url: { type: String, trim: true },
      },
    ],
    randomizeQuestions: {
      type: Boolean,
      default: false,
    },
    randomizeOptions: {
      type: Boolean,
      default: false,
    },
    negativeMarkingEnabled: {
      type: Boolean,
      default: false,
    },
    negativeMarksPerQuestion: {
      type: Number,
      default: 0,
      min: 0,
    },
    showResultImmediately: {
      type: Boolean,
      default: true,
    },
    showAnswersAfterSubmission: {
      type: Boolean,
      default: true,
    },
    fullscreenRequired: {
      type: Boolean,
      default: true,
    },
    maxWarnings: {
      type: Number,
      default: 3,
      min: 1,
      max: 20,
    },
    tabSwitchDetection: {
      type: Boolean,
      default: true,
    },
    autoSubmitOnMaxViolations: {
      type: Boolean,
      default: true,
    },
    blockCopyPaste: {
      type: Boolean,
      default: true,
    },
    navigationRule: {
      type: String,
      enum: Object.values(QuizNavigationRule),
      default: QuizNavigationRule.FREE,
    },
    status: {
      type: String,
      enum: Object.values(QuizStatus),
      default: QuizStatus.DRAFT,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

quizSchema.index({ subject: 1, status: 1 });
quizSchema.index({ department: 1, semester: 1 });

export const Quiz = model<IQuiz>('Quiz', quizSchema);

// -------------------------------------------------------------
// 2. QUESTION
// -------------------------------------------------------------
export interface IMatchPair {
  left: string;
  right: string;
}

export interface IOptionItem {
  id: string;
  text: string;
  matchedTo?: string;
}

export interface IQuestion extends Document {
  quiz: Types.ObjectId;
  questionText: string;
  questionType: QuestionType;
  options: IOptionItem[];
  assertion?: string;
  reason?: string;
  caseScenarioText?: string;
  correctAnswers: unknown;
  numericalTolerance?: number;
  marks: number;
  negativeMarks: number;
  explanation?: string;
  chapterOrUnit?: number;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

const optionItemSchema = new Schema<IOptionItem>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    matchedTo: { type: String, trim: true },
  },
  { _id: false }
);

const questionSchema = new Schema<IQuestion>(
  {
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'Quiz reference is required'],
      index: true,
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    questionType: {
      type: String,
      enum: Object.values(QuestionType),
      required: [true, 'Question type is required'],
      index: true,
    },
    options: {
      type: [optionItemSchema],
      default: [],
    },
    assertion: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    caseScenarioText: {
      type: String,
      trim: true,
    },
    correctAnswers: {
      type: Schema.Types.Mixed,
      required: [true, 'Correct answer(s) are required'],
    },
    numericalTolerance: {
      type: Number,
      default: 0,
    },
    marks: {
      type: Number,
      required: [true, 'Marks are required'],
      min: [0.5, 'Minimum marks must be at least 0.5'],
      default: 1,
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    explanation: {
      type: String,
      trim: true,
    },
    chapterOrUnit: {
      type: Number,
      min: 1,
      max: 10,
    },
    orderIndex: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

questionSchema.index({ quiz: 1, orderIndex: 1 });

export const Question = model<IQuestion>('Question', questionSchema);

// -------------------------------------------------------------
// 3. QUIZ ATTEMPT
// -------------------------------------------------------------
export interface IQuizAttempt extends Document {
  quiz: Types.ObjectId;
  student: Types.ObjectId;
  attemptNumber: number;
  startedAt: Date;
  submittedAt?: Date;
  status: QuizAttemptStatus;
  totalScore: number;
  isGraded: boolean;
  timeSpentSeconds?: number;
  fullscreenViolationsCount: number;
  tabSwitchCount: number;
  autoSubmitted: boolean;
  autoSubmitReason?: string;
  securityLogs: Array<{ eventType: string; timestamp: Date; details?: string }>;
  answersDraft: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'Quiz reference is required'],
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(QuizAttemptStatus),
      default: QuizAttemptStatus.IN_PROGRESS,
      index: true,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    isGraded: {
      type: Boolean,
      default: false,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    fullscreenViolationsCount: {
      type: Number,
      default: 0,
    },
    tabSwitchCount: {
      type: Number,
      default: 0,
    },
    autoSubmitted: {
      type: Boolean,
      default: false,
    },
    autoSubmitReason: {
      type: String,
      trim: true,
    },
    securityLogs: [
      {
        eventType: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        details: { type: String },
      },
    ],
    answersDraft: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate quiz attempts for the same attempt number
quizAttemptSchema.index(
  {
    quiz: 1,
    student: 1,
    attemptNumber: 1,
  },
  { unique: true }
);

quizAttemptSchema.index({ student: 1, status: 1 });

export const QuizAttempt = model<IQuizAttempt>(
  'QuizAttempt',
  quizAttemptSchema
);

// -------------------------------------------------------------
// 4. QUIZ ANSWER
// -------------------------------------------------------------
export interface IQuizAnswer extends Document {
  attempt: Types.ObjectId;
  question: Types.ObjectId;
  student: Types.ObjectId;
  studentAnswer: unknown;
  isCorrect?: boolean | null;
  marksAwarded: number;
  teacherFeedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const quizAnswerSchema = new Schema<IQuizAnswer>(
  {
    attempt: {
      type: Schema.Types.ObjectId,
      ref: 'QuizAttempt',
      required: [true, 'Attempt reference is required'],
      index: true,
    },
    question: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'Question reference is required'],
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    studentAnswer: {
      type: Schema.Types.Mixed,
      required: false,
    },
    isCorrect: {
      type: Boolean,
      default: null,
    },
    marksAwarded: {
      type: Number,
      default: 0,
    },
    teacherFeedback: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent multiple answers for the same question within a single attempt
quizAnswerSchema.index(
  {
    attempt: 1,
    question: 1,
  },
  { unique: true }
);

export const QuizAnswer = model<IQuizAnswer>('QuizAnswer', quizAnswerSchema);

// -------------------------------------------------------------
// 5. QUIZ RESULT
// -------------------------------------------------------------
export interface IQuizResult extends Document {
  quiz: Types.ObjectId;
  attempt: Types.ObjectId;
  student: Types.ObjectId;
  score: number;
  totalMarks: number;
  percentage: number;
  grade?: string;
  passed: boolean;
  rank?: number;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const quizResultSchema = new Schema<IQuizResult>(
  {
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'Quiz reference is required'],
      index: true,
    },
    attempt: {
      type: Schema.Types.ObjectId,
      ref: 'QuizAttempt',
      required: [true, 'Attempt reference is required'],
      unique: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      trim: true,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    rank: {
      type: Number,
      min: 1,
    },
    generatedAt: {
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

quizResultSchema.index({ quiz: 1, student: 1 });
quizResultSchema.index({ quiz: 1, score: -1 });

export const QuizResult = model<IQuizResult>('QuizResult', quizResultSchema);
