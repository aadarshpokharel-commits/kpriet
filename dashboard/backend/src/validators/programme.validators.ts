import { z } from 'zod';

/** Programme identifier: stable code (e.g. "IT", "AIML") or a 24-char ObjectId. */
export const programmeIdSchema = z
  .string({ required_error: 'Programme is required' })
  .trim()
  .min(2, 'Programme is required')
  .max(40, 'Invalid programme identifier')
  .regex(/^[A-Za-z0-9&_-]+$/, 'Invalid programme identifier');

export const programmeParamsSchema = z.object({ programmeId: programmeIdSchema });

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');
const academicYear = z.string().regex(/^\d{4}-\d{4}$/, 'Academic year must be formatted as YYYY-YYYY');

export const listProgrammesQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  /** Optional: restrict to the programme with this ObjectId (legacy filter). */
  departmentId: objectId.optional(),
});

export const programmeScopedQuerySchema = z.object({
  semesterId: objectId.optional(),
  semesterNumber: z.coerce.number().int().min(1).max(10).optional(),
  academicYear: academicYear.optional(),
  section: z.string().trim().max(10).optional(),
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export const setProgrammeStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive is required' }),
});

export const updateProgrammeDetailsSchema = z
  .object({
    officialWebsite: z
      .string()
      .trim()
      .url('Official website must be a valid URL')
      .max(300)
      .nullable()
      .optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    icon: z.string().trim().max(16).nullable().optional(),
  })
  .strict('Only the website, description and icon can be edited. Programme names and codes are managed by the programme master.');
