import { z } from 'zod';
import { AttendanceStatus } from '../types/academic.types.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId');

export const attendanceRecordItemSchema = z.object({
  studentId: objectIdSchema,
  status: z.nativeEnum(AttendanceStatus).default(AttendanceStatus.PRESENT),
  remarks: z.string().trim().max(250).optional(),
});

export const recordAttendanceSessionSchema = z.object({
  subjectId: objectIdSchema,
  departmentId: objectIdSchema.optional(),
  semesterId: objectIdSchema.optional(),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  period: z.coerce.number().int().min(1).max(10),
  timeSlot: z.string().trim().max(100).optional(),
  topicCovered: z.string().trim().max(500).optional(),
  section: z.string().trim().max(20).default('ALL'),
  records: z.array(attendanceRecordItemSchema).min(1, 'At least one student record is required'),
  allowDuplicateSession: z.boolean().optional().default(false),
});

export const updateAttendanceSessionSchema = z.object({
  period: z.coerce.number().int().min(1).max(10).optional(),
  timeSlot: z.string().trim().max(100).optional(),
  topicCovered: z.string().trim().max(500).optional(),
  section: z.string().trim().max(20).optional(),
  records: z.array(attendanceRecordItemSchema).optional(),
});

export const getEnrolledStudentsQuerySchema = z.object({
  departmentId: objectIdSchema.optional(),
  semesterId: objectIdSchema.optional(),
  subjectId: objectIdSchema,
  date: z.string().optional(),
});

export const attendanceHistoryQuerySchema = z.object({
  subjectId: objectIdSchema.optional(),
  departmentId: objectIdSchema.optional(),
  semesterId: objectIdSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
