import { z } from 'zod';
import {
  AccountStatus,
  AssignmentStatus,
  AttendanceStatus,
  ContentStatus,
  ContentType,
  EnrollmentStatus,
  ProgrammeType,
  SemesterStatus,
  TeacherAssignmentStatus,
} from '../types/academic.types.js';


const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId');

// ─── PROGRAMME VALIDATORS ───
export const createProgrammeSchema = z.object({
  name: z.string().trim().min(2).max(150),
  code: z.string().trim().min(2).max(20).toUpperCase(),
  degree: z.string().trim().min(2).max(50),
  departmentId: objectIdSchema,
  programmeType: z.nativeEnum(ProgrammeType).default(ProgrammeType.UG),
  durationYears: z.coerce.number().int().min(1).max(6).default(4),
  totalSemesters: z.coerce.number().int().min(1).max(12).default(8),
  description: z.string().trim().max(1000).optional(),
});

export const updateProgrammeSchema = createProgrammeSchema.partial();

/**
 * Programme reference from the central programme master: the stable code
 * (e.g. "IT") or the programme's ObjectId. Always re-validated server-side.
 */
export const programmeRefSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[A-Za-z0-9&_-]+$/, 'Invalid programme');

const requireProgrammeRef = (data: { departmentId?: string; programmeId?: string }) =>
  Boolean(data.departmentId || data.programmeId);
const programmeRefMessage = { message: 'Programme is required', path: ['programmeId'] };

// ─── SEMESTER VALIDATORS ───
const semesterBaseSchema = z.object({
  semesterNumber: z.coerce.number().int().min(1).max(10),
  academicYear: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Must be formatted as YYYY-YYYY (e.g. 2024-2025)'),
  regulation: z.string().trim().min(2).max(20).toUpperCase(),
  departmentId: objectIdSchema.optional(),
  programmeId: programmeRefSchema.optional(),
  startDate: z.string().datetime().optional().or(z.date().optional()),
  endDate: z.string().datetime().optional().or(z.date().optional()),
  status: z.nativeEnum(SemesterStatus).default(SemesterStatus.ACTIVE),
});

export const createSemesterSchema = semesterBaseSchema.refine(requireProgrammeRef, programmeRefMessage);

// A semester can never be moved to another programme after creation.
export const updateSemesterSchema = semesterBaseSchema
  .omit({ departmentId: true, programmeId: true })
  .partial();

// ─── CHAPTER / SYLLABUS UNIT VALIDATORS ───
export const chapterSchema = z.object({
  unitNumber: z.coerce.number().int().min(1).max(10),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(500).optional(),
  topics: z.array(z.string().trim()).default([]),
  hours: z.coerce.number().min(1).max(100).optional(),
});

export const updateChapterSchema = chapterSchema.partial();

// ─── SUBJECT VALIDATORS ───
const subjectBaseSchema = z.object({
  subjectName: z.string().trim().min(2).max(150),
  subjectCode: z.string().trim().min(2).max(20).toUpperCase(),
  departmentId: objectIdSchema.optional(),
  programmeId: programmeRefSchema.optional(),
  semesterId: objectIdSchema,
  semesterNumber: z.coerce.number().int().min(1).max(10),
  credits: z.coerce.number().min(0).max(10),
  description: z.string().trim().max(1000).optional(),
  icon: z.string().trim().max(50).optional(),
  color: z.string().trim().max(50).optional(),
  syllabus: z.array(chapterSchema).default([]),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const createSubjectSchema = subjectBaseSchema.refine(requireProgrammeRef, programmeRefMessage);

// A subject's programme and semester are fixed once created (Rule 3).
export const updateSubjectSchema = subjectBaseSchema
  .omit({ departmentId: true, programmeId: true, semesterId: true })
  .partial();

// ─── TEACHER ASSIGNMENT VALIDATORS ───
// Programme, semester and academic year are derived from the subject on the
// server; if the client sends them they must agree with the subject.
export const assignTeacherSchema = z.object({
  teacherId: objectIdSchema,
  subjectId: objectIdSchema,
  departmentId: objectIdSchema.optional(),
  programmeId: programmeRefSchema.optional(),
  semesterId: objectIdSchema.optional(),
  academicYear: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Must be formatted as YYYY-YYYY').optional(),
  section: z.string().trim().max(10).default('ALL'),
  isCoordinator: z.boolean().default(false),
  status: z.nativeEnum(TeacherAssignmentStatus).default(TeacherAssignmentStatus.ACTIVE),
});

// ─── STUDENT ENROLLMENT VALIDATORS ───
export const requestEnrollmentSchema = z.object({
  departmentId: objectIdSchema,
  semesterId: objectIdSchema,
  academicYear: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Must be formatted as YYYY-YYYY'),
  enrolledSubjectIds: z.array(objectIdSchema).min(1, 'At least one subject must be selected'),
});

export const reviewEnrollmentSchema = z.object({
  status: z.enum([EnrollmentStatus.APPROVED, EnrollmentStatus.REJECTED]),
  rejectionReason: z.string().trim().max(500).optional(),
});

// ─── FACULTY REVIEW VALIDATORS ───
export const reviewFacultySchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().trim().max(500).optional(),
});

// ─── SUBJECT STATUS VALIDATORS ───
export const toggleSubjectStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

// ─── AI DOUBT & ASSIGNMENT VALIDATORS ───
export const aiDoubtQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(3, 'Question must be at least 3 characters')
    .max(1000, 'Question cannot exceed 1000 characters'),
});

export const submitAssignmentSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        url: z.string().trim().min(1),
        sizeBytes: z.number().optional(),
      })
    )
    .min(1, 'At least one submission file is required'),
  notes: z.string().trim().max(1000).optional(),
});

// ─── TEACHER WORKSPACE & CONTENT VALIDATORS (MODULE 07) ───
export const createContentSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().trim().max(3000).optional(),
  contentType: z.nativeEnum(ContentType),
  chapterOrUnit: z.coerce.number().int().min(1).max(10).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        url: z.string().trim().min(1),
        sizeBytes: z.number().optional(),
        mimeType: z.string().trim().optional(),
      })
    )
    .default([]),
  resourceUrls: z.array(z.string().trim().min(1)).default([]),
  simulationConfig: z
    .object({
      type: z.string().trim().min(1),
      initialParams: z.record(z.unknown()).optional(),
      controls: z.array(z.string()).default([]),
      smartboardPresetId: z.string().trim().optional(),
    })
    .optional(),
  tags: z.array(z.string().trim()).default([]),
  status: z.nativeEnum(ContentStatus).default(ContentStatus.PUBLISHED),
});

export const updateContentSchema = createContentSchema.partial();

export const createTeacherAssignmentSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().trim().max(3000).optional(),
  dueDate: z.string().or(z.date()).transform((val) => new Date(val)),
  maxMarks: z.coerce.number().min(1, 'Maximum marks must be at least 1').max(100),
  passingMarks: z.coerce.number().min(0).max(100).default(0),
  attachments: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        url: z.string().trim().min(1),
        sizeBytes: z.number().optional(),
      })
    )
    .default([]),
  rubric: z.record(z.unknown()).optional(),
  status: z.nativeEnum(AssignmentStatus).default(AssignmentStatus.PUBLISHED),
});

export const gradeSubmissionSchema = z.object({
  submissionId: objectIdSchema,
  marksObtained: z.coerce.number().min(0, 'Marks cannot be negative'),
  maxMarks: z.coerce.number().min(1, 'Max marks must be at least 1').optional(),
  feedback: z.string().trim().max(2000).optional(),
  rubricScores: z.record(z.unknown()).optional(),
});

export const recordAttendanceSchema = z.object({
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  period: z.coerce.number().int().min(1).max(10),
  timeSlot: z.string().trim().max(50).optional(),
  topicCovered: z.string().trim().max(200).optional(),
  section: z.string().trim().max(10).default('ALL'),
  records: z
    .array(
      z.object({
        studentId: objectIdSchema,
        status: z.nativeEnum(AttendanceStatus).default(AttendanceStatus.PRESENT),
        remarks: z.string().trim().max(200).optional(),
      })
    )
    .min(1, 'At least one student record is required'),
});

export const assignSimulationSchema = z.object({
  simulationId: z.string().trim().min(1, 'Simulation template ID is required'),
  chapterOrUnit: z.coerce.number().int().min(1).max(10, 'Chapter/Unit must be between 1 and 10'),
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(3000).optional(),
  customParams: z.record(z.unknown()).optional(),
  status: z.nativeEnum(ContentStatus).optional(),
});

export const toggleSimulationStatusSchema = z.object({
  status: z.nativeEnum(ContentStatus),
});

export const recordSimulationActivitySchema = z.object({
  event: z.enum(['OPENED', 'COMPLETED']),
  topic: z.string().trim().max(120).optional(),
});

// ─── ADMIN & INSTITUTION CONFIGURATION VALIDATORS ───
export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(150),
  code: z.string().trim().min(2).max(15).toUpperCase(),
  programmeType: z.nativeEnum(ProgrammeType).default(ProgrammeType.UG),
  description: z.string().trim().max(1000).optional(),
  hodId: objectIdSchema.optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const assignDepartmentHodSchema = z.object({
  hodUserId: objectIdSchema,
});

export const updateUserStatusSchema = z.object({
  accountStatus: z.nativeEnum(AccountStatus),
  reason: z.string().trim().max(500).optional(),
});


