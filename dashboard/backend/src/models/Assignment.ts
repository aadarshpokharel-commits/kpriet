import { Document, Schema, Types, model } from 'mongoose';
import {
  AssignmentStatus,
  SubmissionStatus,
  LateSubmissionPolicy,
  TeacherGradingDecision,
} from '../types/academic.types.js';

// -------------------------------------------------------------
// 1. ASSIGNMENT
// -------------------------------------------------------------
export interface IAssignmentAttachment {
  name: string;
  url: string;
  sizeBytes?: number;
  fileType?: string;
}

export interface IReferenceMaterial {
  title: string;
  url: string;
  notes?: string;
}

export interface IRubricCriterion {
  id: string;
  title: string;
  description: string;
  maxMarks: number;
  category?: 'correctness' | 'completeness' | 'concepts' | 'formatting' | 'numerical' | 'general';
}

export interface IAutoEvaluationSettings {
  enabled: boolean;
  showCriteriaToStudents: boolean;
  criteria: {
    correctness: boolean;
    completeness: boolean;
    requiredConcepts: boolean;
    keywordCriteria: boolean;
    rubricCriteria: boolean;
    formattingCriteria: boolean;
    numericalCorrectness: boolean;
  };
  requiredKeywords: string[];
  requiredConcepts: string[];
  formattingRequirements?: string;
  numericalAnswer?: number;
  numericalTolerance?: number;
}

export interface IManualGradingSetting {
  requireTeacherApproval: boolean;
  allowAiPreGrading: boolean;
}

export interface IAssignment extends Document {
  title: string;
  description?: string;
  instructions?: string;
  department: Types.ObjectId;
  semester: Types.ObjectId;
  subject: Types.ObjectId;
  teacher: Types.ObjectId;
  chapterOrUnit?: number;
  chapterTitle?: string;
  /** Topics within the unit (Programme → Semester → Subject → Unit → Topic). */
  topics: string[];
  dueDate: Date;
  lateSubmissionPolicy: LateSubmissionPolicy;
  latePenaltyPercent: number;
  lateDeadline?: Date;
  maxMarks: number;
  passingMarks: number;
  allowedFileTypes: string[];
  maxFileSizeMB: number;
  allowTextSubmission: boolean;
  allowFileSubmission: boolean;
  allowResubmission: boolean;
  attachments: IAssignmentAttachment[];
  referenceMaterials: IReferenceMaterial[];
  rubricCriteria: IRubricCriterion[];
  autoEvaluationSettings: IAutoEvaluationSettings;
  manualGradingSetting: IManualGradingSetting;
  status: AssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentAttachmentSchema = new Schema<IAssignmentAttachment>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    sizeBytes: { type: Number },
    fileType: { type: String },
  },
  { _id: false }
);

const referenceMaterialSchema = new Schema<IReferenceMaterial>(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const rubricCriterionSchema = new Schema<IRubricCriterion>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    maxMarks: { type: Number, required: true, min: 0.5 },
    category: {
      type: String,
      enum: ['correctness', 'completeness', 'concepts', 'formatting', 'numerical', 'general'],
      default: 'general',
    },
  },
  { _id: false }
);

const autoEvaluationSettingsSchema = new Schema<IAutoEvaluationSettings>(
  {
    enabled: { type: Boolean, default: false },
    showCriteriaToStudents: { type: Boolean, default: true },
    criteria: {
      correctness: { type: Boolean, default: true },
      completeness: { type: Boolean, default: true },
      requiredConcepts: { type: Boolean, default: false },
      keywordCriteria: { type: Boolean, default: false },
      rubricCriteria: { type: Boolean, default: true },
      formattingCriteria: { type: Boolean, default: false },
      numericalCorrectness: { type: Boolean, default: false },
    },
    requiredKeywords: { type: [String], default: [] },
    requiredConcepts: { type: [String], default: [] },
    formattingRequirements: { type: String, trim: true },
    numericalAnswer: { type: Number },
    numericalTolerance: { type: Number, default: 0.01 },
  },
  { _id: false }
);

const manualGradingSettingSchema = new Schema<IManualGradingSetting>(
  {
    requireTeacherApproval: { type: Boolean, default: true },
    allowAiPreGrading: { type: Boolean, default: true },
  },
  { _id: false }
);

const assignmentSchema = new Schema<IAssignment>(
  {
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: 10000,
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
    chapterOrUnit: {
      type: Number,
      default: 1,
    },
    chapterTitle: {
      type: String,
      trim: true,
    },
    topics: {
      type: [String],
      default: [],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    lateSubmissionPolicy: {
      type: String,
      enum: Object.values(LateSubmissionPolicy),
      default: LateSubmissionPolicy.ALLOW_WITH_PENALTY,
    },
    latePenaltyPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    lateDeadline: {
      type: Date,
    },
    maxMarks: {
      type: Number,
      required: [true, 'Maximum marks are required'],
      min: [1, 'Maximum marks must be at least 1'],
    },
    passingMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    allowedFileTypes: {
      type: [String],
      default: ['pdf', 'docx', 'zip', 'py', 'ipynb', 'txt'],
    },
    maxFileSizeMB: {
      type: Number,
      default: 20,
      min: 1,
      max: 100,
    },
    allowTextSubmission: {
      type: Boolean,
      default: true,
    },
    allowFileSubmission: {
      type: Boolean,
      default: true,
    },
    allowResubmission: {
      type: Boolean,
      default: true,
    },
    attachments: {
      type: [assignmentAttachmentSchema],
      default: [],
    },
    referenceMaterials: {
      type: [referenceMaterialSchema],
      default: [],
    },
    rubricCriteria: {
      type: [rubricCriterionSchema],
      default: [],
    },
    autoEvaluationSettings: {
      type: autoEvaluationSettingsSchema,
      default: () => ({
        enabled: false,
        showCriteriaToStudents: true,
        criteria: {
          correctness: true,
          completeness: true,
          requiredConcepts: false,
          keywordCriteria: false,
          rubricCriteria: true,
          formattingCriteria: false,
          numericalCorrectness: false,
        },
        requiredKeywords: [],
        requiredConcepts: [],
      }),
    },
    manualGradingSetting: {
      type: manualGradingSettingSchema,
      default: () => ({
        requireTeacherApproval: true,
        allowAiPreGrading: true,
      }),
    },
    status: {
      type: String,
      enum: Object.values(AssignmentStatus),
      default: AssignmentStatus.PUBLISHED,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

assignmentSchema.index({ subject: 1, status: 1 });
assignmentSchema.index({ department: 1, semester: 1 });
assignmentSchema.index({ teacher: 1, createdAt: -1 });

export const Assignment = model<IAssignment>('Assignment', assignmentSchema);

// -------------------------------------------------------------
// 2. ASSIGNMENT SUBMISSION
// -------------------------------------------------------------
export interface ISubmissionFile {
  name: string;
  url: string;
  sizeBytes?: number;
  fileType?: string;
}

export interface IAICriterionFeedback {
  criterionId: string;
  title: string;
  score: number;
  maxMarks: number;
  feedback: string;
  status: 'MET' | 'PARTIAL' | 'NOT_MET';
}

export interface IAIEvaluation {
  evaluatedAt?: Date;
  suggestedScore: number;
  summaryExplanation: string;
  criterionFeedback: IAICriterionFeedback[];
  conceptCheckResults?: Array<{ concept: string; found: boolean; context?: string }>;
  keywordCheckResults?: Array<{ keyword: string; found: boolean }>;
  numericalCheckResult?: { expected: number; submitted: number; isWithinTolerance: boolean };
  reviewStatus: 'PENDING_REVIEW' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED';
}

export interface IAssignmentSubmission extends Document {
  assignment: Types.ObjectId;
  student: Types.ObjectId;
  submissionText?: string;
  submissionFiles: ISubmissionFile[];
  notes?: string;
  submittedAt: Date;
  isLate: boolean;
  status: SubmissionStatus;
  isGraded: boolean;
  resubmissionCount: number;
  aiEvaluation?: IAIEvaluation;
  createdAt: Date;
  updatedAt: Date;
}

const submissionFileSchema = new Schema<ISubmissionFile>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    sizeBytes: { type: Number },
    fileType: { type: String },
  },
  { _id: false }
);

const aiCriterionFeedbackSchema = new Schema<IAICriterionFeedback>(
  {
    criterionId: { type: String, required: true },
    title: { type: String, required: true },
    score: { type: Number, required: true },
    maxMarks: { type: Number, required: true },
    feedback: { type: String, required: true },
    status: {
      type: String,
      enum: ['MET', 'PARTIAL', 'NOT_MET'],
      default: 'MET',
    },
  },
  { _id: false }
);

const aiEvaluationSchema = new Schema<IAIEvaluation>(
  {
    evaluatedAt: { type: Date, default: Date.now },
    suggestedScore: { type: Number, required: true },
    summaryExplanation: { type: String, default: '' },
    criterionFeedback: { type: [aiCriterionFeedbackSchema], default: [] },
    conceptCheckResults: [
      {
        concept: { type: String },
        found: { type: Boolean },
        context: { type: String },
      },
    ],
    keywordCheckResults: [
      {
        keyword: { type: String },
        found: { type: Boolean },
      },
    ],
    numericalCheckResult: {
      expected: { type: Number },
      submitted: { type: Number },
      isWithinTolerance: { type: Boolean },
    },
    reviewStatus: {
      type: String,
      enum: ['PENDING_REVIEW', 'ACCEPTED', 'MODIFIED', 'REJECTED'],
      default: 'PENDING_REVIEW',
    },
  },
  { _id: false }
);

const assignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    assignment: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment reference is required'],
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    submissionText: {
      type: String,
      trim: true,
      maxlength: 25000,
    },
    submissionFiles: {
      type: [submissionFileSchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(SubmissionStatus),
      default: SubmissionStatus.SUBMITTED,
      index: true,
    },
    isGraded: {
      type: Boolean,
      default: false,
      index: true,
    },
    resubmissionCount: {
      type: Number,
      default: 0,
    },
    aiEvaluation: {
      type: aiEvaluationSchema,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate assignment submissions by the same student for the same assignment
assignmentSubmissionSchema.index(
  {
    assignment: 1,
    student: 1,
  },
  { unique: true }
);

export const AssignmentSubmission = model<IAssignmentSubmission>(
  'AssignmentSubmission',
  assignmentSubmissionSchema
);

// -------------------------------------------------------------
// 3. ASSIGNMENT GRADE
// -------------------------------------------------------------
export interface IAssignmentGradeCriterion {
  criterionId: string;
  title: string;
  score: number;
  maxMarks: number;
  feedback?: string;
}

export interface IAssignmentGrade extends Document {
  submission: Types.ObjectId;
  assignment: Types.ObjectId;
  student: Types.ObjectId;
  gradedBy: Types.ObjectId;
  marksObtained: number;
  maxMarks: number;
  feedback?: string;
  rubricScores?: Record<string, number>;
  criterionFeedback?: IAssignmentGradeCriterion[];
  lateDeductionApplied: number;
  teacherDecision: TeacherGradingDecision;
  gradedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const gradeCriterionSchema = new Schema<IAssignmentGradeCriterion>(
  {
    criterionId: { type: String, required: true },
    title: { type: String, required: true },
    score: { type: Number, required: true },
    maxMarks: { type: Number, required: true },
    feedback: { type: String },
  },
  { _id: false }
);

const assignmentGradeSchema = new Schema<IAssignmentGrade>(
  {
    submission: {
      type: Schema.Types.ObjectId,
      ref: 'AssignmentSubmission',
      required: [true, 'Submission reference is required'],
      unique: true,
      index: true,
    },
    assignment: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment reference is required'],
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    gradedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Grading teacher reference is required'],
      index: true,
    },
    marksObtained: {
      type: Number,
      required: [true, 'Marks obtained are required'],
      min: [0, 'Marks cannot be negative'],
    },
    maxMarks: {
      type: Number,
      required: [true, 'Maximum marks are required'],
      min: [1, 'Maximum marks must be at least 1'],
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
    rubricScores: {
      type: Schema.Types.Mixed,
    },
    criterionFeedback: {
      type: [gradeCriterionSchema],
      default: [],
    },
    lateDeductionApplied: {
      type: Number,
      default: 0,
      min: 0,
    },
    teacherDecision: {
      type: String,
      enum: Object.values(TeacherGradingDecision),
      default: TeacherGradingDecision.MANUAL,
    },
    gradedAt: {
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

assignmentGradeSchema.index({ assignment: 1, student: 1 });
assignmentGradeSchema.index({ gradedBy: 1, gradedAt: -1 });

export const AssignmentGrade = model<IAssignmentGrade>(
  'AssignmentGrade',
  assignmentGradeSchema
);
