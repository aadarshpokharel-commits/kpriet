import { z } from 'zod';
import {
  AssignmentStatus,
  LateSubmissionPolicy,
  TeacherGradingDecision,
} from '../types/academic.types.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId');

export const rubricCriterionInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).default(''),
  maxMarks: z.coerce.number().min(0.5).max(1000),
  category: z
    .enum(['correctness', 'completeness', 'concepts', 'formatting', 'numerical', 'general'])
    .default('general'),
});

export const autoEvaluationSettingsInputSchema = z.object({
  enabled: z.boolean().default(false),
  showCriteriaToStudents: z.boolean().default(true),
  criteria: z
    .object({
      correctness: z.boolean().default(true),
      completeness: z.boolean().default(true),
      requiredConcepts: z.boolean().default(false),
      keywordCriteria: z.boolean().default(false),
      rubricCriteria: z.boolean().default(true),
      formattingCriteria: z.boolean().default(false),
      numericalCorrectness: z.boolean().default(false),
    })
    .default({
      correctness: true,
      completeness: true,
      requiredConcepts: false,
      keywordCriteria: false,
      rubricCriteria: true,
      formattingCriteria: false,
      numericalCorrectness: false,
    }),
  requiredKeywords: z.array(z.string().trim()).default([]),
  requiredConcepts: z.array(z.string().trim()).default([]),
  formattingRequirements: z.string().trim().max(1000).optional(),
  numericalAnswer: z.coerce.number().optional(),
  numericalTolerance: z.coerce.number().min(0).default(0.01),
});

export const createAssignmentSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  subjectId: objectIdSchema,
  chapterOrUnit: z.coerce.number().int().min(1).max(20).default(1),
  topics: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  chapterTitle: z.string().trim().max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  instructions: z.string().trim().max(10000).optional(),
  dueDate: z.string().or(z.date()).transform((val) => new Date(val)),
  lateSubmissionPolicy: z
    .nativeEnum(LateSubmissionPolicy)
    .default(LateSubmissionPolicy.ALLOW_WITH_PENALTY),
  latePenaltyPercent: z.coerce.number().min(0).max(100).default(10),
  lateDeadline: z
    .string()
    .or(z.date())
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  maxMarks: z.coerce.number().min(1, 'Total marks must be at least 1').max(500),
  passingMarks: z.coerce.number().min(0).max(500).default(0),
  allowedFileTypes: z.array(z.string().trim()).default(['pdf', 'docx', 'zip', 'py', 'ipynb', 'txt']),
  maxFileSizeMB: z.coerce.number().min(1).max(100).default(20),
  allowTextSubmission: z.boolean().default(true),
  allowFileSubmission: z.boolean().default(true),
  allowResubmission: z.boolean().default(true),
  attachments: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        url: z.string().trim().min(1),
        sizeBytes: z.number().optional(),
        fileType: z.string().optional(),
      })
    )
    .default([]),
  referenceMaterials: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        url: z.string().trim().min(1),
        notes: z.string().trim().max(500).optional(),
      })
    )
    .default([]),
  rubricCriteria: z.array(rubricCriterionInputSchema).default([]),
  autoEvaluationSettings: autoEvaluationSettingsInputSchema.optional(),
  manualGradingSetting: z
    .object({
      requireTeacherApproval: z.boolean().default(true),
      allowAiPreGrading: z.boolean().default(true),
    })
    .default({
      requireTeacherApproval: true,
      allowAiPreGrading: true,
    }),
  status: z.nativeEnum(AssignmentStatus).default(AssignmentStatus.PUBLISHED),
});

export const updateAssignmentSchema = createAssignmentSchema.partial().extend({
  subjectId: objectIdSchema.optional(),
});

export const aiGenerateAssignmentSchema = z.object({
  subjectId: objectIdSchema,
  chapterOrUnit: z.coerce.number().int().min(1).max(20).default(1),
  topics: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  assignmentType: z.enum(['problem_set', 'lab_report', 'case_study', 'programming', 'essay', 'numerical']).default('problem_set'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  targetMarks: z.coerce.number().min(10).max(200).default(50),
  customFocus: z.string().trim().max(1000).optional(),
  attachedNotes: z
    .array(
      z.object({
        name: z.string().trim(),
        url: z.string().optional(),
        content: z.string().optional(),
      })
    )
    .default([]),
});

export const submitAssignmentSchema = z.object({
  submissionText: z.string().trim().max(25000).optional(),
  submissionFiles: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        url: z.string().trim().min(1),
        sizeBytes: z.number().optional(),
        fileType: z.string().optional(),
      })
    )
    .default([]),
  notes: z.string().trim().max(2000).optional(),
});

export const gradeAssignmentSchema = z.object({
  submissionId: objectIdSchema,
  marksObtained: z.coerce.number().min(0, 'Marks obtained cannot be negative'),
  maxMarks: z.coerce.number().min(1).optional(),
  feedback: z.string().trim().max(3000).optional(),
  rubricScores: z.record(z.coerce.number()).optional(),
  criterionFeedback: z
    .array(
      z.object({
        criterionId: z.string(),
        title: z.string(),
        score: z.coerce.number().min(0),
        maxMarks: z.coerce.number().min(0),
        feedback: z.string().optional(),
      })
    )
    .optional(),
  lateDeductionApplied: z.coerce.number().min(0).default(0),
  teacherDecision: z
    .nativeEnum(TeacherGradingDecision)
    .default(TeacherGradingDecision.MANUAL),
});
