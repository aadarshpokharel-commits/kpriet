import { z } from 'zod';
import {
  QuestionType,
  QuizStatus,
  DifficultyLevel,
  BloomsTaxonomy,
  QuizNavigationRule,
} from '../types/academic.types.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z
  .string()
  .regex(objectIdRegex, { message: 'Invalid ObjectId format' });

export const createQuizSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  subjectId: objectIdSchema,
  curriculumUnits: z.array(z.number().min(1).max(20)).min(1).default([1]),
  topics: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  difficultyLevel: z
    .enum([
      DifficultyLevel.EASY,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.HARD,
      DifficultyLevel.MIXED,
    ])
    .default(DifficultyLevel.MEDIUM),
  sourceNotes: z
    .array(
      z.object({
        name: z.string().trim(),
        url: z.string().trim(),
      })
    )
    .default([]),
  durationMinutes: z.number().min(1).max(300).default(30),
  duration: z.number().min(1).max(300).optional(),
  totalMarks: z.number().min(1).default(20),
  passingMarks: z.number().min(0).default(10),
  instructions: z.string().max(2000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  allowMultipleAttempts: z.boolean().default(false),
  maxAttempts: z.number().min(1).max(10).default(1),
  attemptsAllowed: z.number().min(1).max(10).optional(),
  randomizeQuestions: z.boolean().default(false),
  randomizeOptions: z.boolean().default(false),
  negativeMarkingEnabled: z.boolean().default(false),
  negativeMarksPerQuestion: z.number().min(0).default(0),
  showResultImmediately: z.boolean().default(true),
  showAnswersAfterSubmission: z.boolean().default(true),
  fullscreenRequired: z.boolean().default(true),
  maxWarnings: z.number().min(1).max(20).default(3),
  tabSwitchDetection: z.boolean().default(true),
  autoSubmitOnMaxViolations: z.boolean().default(true),
  blockCopyPaste: z.boolean().default(true),
  navigationRule: z
    .enum([QuizNavigationRule.FREE, QuizNavigationRule.SEQUENTIAL])
    .default(QuizNavigationRule.FREE),
  status: z
    .enum([QuizStatus.DRAFT, QuizStatus.PUBLISHED, QuizStatus.CLOSED])
    .default(QuizStatus.DRAFT),
});

export const updateQuizSchema = createQuizSchema.partial();

export const optionItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  matchedTo: z.string().optional(),
});

export const createQuestionSchema = z.object({
  quizId: objectIdSchema.optional(),
  questionText: z.string().min(3),
  questionType: z.enum(Object.values(QuestionType) as [string, ...string[]]),
  options: z.array(optionItemSchema).default([]),
  assertion: z.string().optional(),
  reason: z.string().optional(),
  caseScenarioText: z.string().optional(),
  correctAnswers: z.any(),
  numericalTolerance: z.number().min(0).default(0),
  marks: z.number().min(0.5).default(1),
  negativeMarks: z.number().min(0).default(0),
  explanation: z.string().optional(),
  chapterOrUnit: z.number().min(1).max(20).optional(),
  difficulty: z.string().optional(),
  bloomsTaxonomy: z.string().optional(),
  sourceReference: z.string().optional(),
});

export const createQuestionBankSchema = z.object({
  subjectId: objectIdSchema,
  questionText: z.string().min(3),
  questionType: z.enum(Object.values(QuestionType) as [string, ...string[]]),
  options: z.array(optionItemSchema).default([]),
  assertion: z.string().optional(),
  reason: z.string().optional(),
  caseScenarioText: z.string().optional(),
  correctAnswers: z.any(),
  numericalTolerance: z.number().min(0).default(0),
  marks: z.number().min(0.5).default(1),
  negativeMarks: z.number().min(0).default(0),
  explanation: z.string().optional(),
  chapterOrUnits: z.array(z.number().min(1).max(20)).min(1).default([1]),
  difficulty: z
    .enum([DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD])
    .default(DifficultyLevel.MEDIUM),
  bloomsTaxonomy: z
    .enum(Object.values(BloomsTaxonomy) as [string, ...string[]])
    .default(BloomsTaxonomy.UNDERSTAND),
  tags: z.array(z.string()).default([]),
});

export const updateQuestionBankSchema = createQuestionBankSchema.partial();

export const saveDraftSchema = z.object({
  answersDraft: z.record(z.any()),
  timeSpentSeconds: z.number().min(0).default(0),
});

export const recordSecurityEventSchema = z.object({
  eventType: z.string().min(2),
  details: z.string().optional(),
});

export const submitQuizAttemptSchema = z.object({
  answers: z.record(z.any()),
  timeSpentSeconds: z.number().min(0).default(0),
});

export const gradeSubjectiveAnswerSchema = z.object({
  questionId: objectIdSchema,
  marksAwarded: z.number().min(0),
  teacherFeedback: z.string().max(1000).optional(),
});

export const generateAIQuizSchema = z.object({
  subjectId: objectIdSchema,
  semesterId: objectIdSchema.optional(),
  semesterNumber: z.number().min(1).max(10).optional(),
  curriculumUnits: z.array(z.number().min(1).max(20)).min(1),
  topics: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  difficulty: z.string().default(DifficultyLevel.MEDIUM),
  questionCount: z.number().min(1).max(50).default(5),
  questionTypes: z.array(z.string()).min(1),
  bloomsTaxonomy: z.array(z.string()).optional(),
  sourceNotes: z
    .array(
      z.object({
        name: z.string().trim(),
        url: z.string().trim().optional(),
        content: z.string().optional(),
      })
    )
    .optional(),
  syllabusContext: z.string().max(3000).optional(),
  excludeQuestions: z.array(z.string()).optional(),
  singleQuestion: z
    .object({
      unit: z.number().optional(),
      type: z.string().optional(),
      bloom: z.string().optional(),
      difficulty: z.string().optional(),
    })
    .optional(),
});
