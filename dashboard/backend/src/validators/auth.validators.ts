import { z } from 'zod';

// Allowed KPRIET domains
const ALLOWED_EMAIL_DOMAINS = ['kpriet.ac.in', 'kpiet.ac.in'];

/**
 * Normalizes email address by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validates whether an email belongs to an official KPRIET college domain.
 */
export function isKprietEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return ALLOWED_EMAIL_DOMAINS.some((domain) => normalized.endsWith(`@${domain}`));
}

/**
 * Validates student email format (e.g., 23it040@kpriet.ac.in or 24ad012@kpiet.ac.in).
 * Matches 2-digit admission year + 2-4 char department code + 3-4 digit roll number.
 */
export const studentEmailRegex = /^[0-9]{2}[a-z]{2,4}[0-9]{3,4}@(kpriet\.ac\.in|kpiet\.ac\.in)$/;

export function isStudentEmail(email: string): boolean {
  return studentEmailRegex.test(normalizeEmail(email));
}

// Password policy: At least 8 characters, with at least 1 uppercase, 1 lowercase, 1 number, and 1 special symbol
export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// MongoDB ObjectId validation
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid department ID format');

/**
 * Programme selection. Registration accepts the stable programme id from the
 * central programme master (e.g. "IT") via `programmeId`; `departmentId`
 * (the programme's ObjectId) is still accepted for backward compatibility.
 * The backend always re-validates it against the database.
 */
const programmeIdSchema = z
  .string()
  .trim()
  .min(2, 'Select your programme / department')
  .max(40, 'Invalid programme')
  .regex(/^[A-Za-z0-9&_-]+$/, 'Invalid programme');

const hasProgramme = (data: { programmeId?: string; departmentId?: string }) =>
  Boolean(data.programmeId || data.departmentId);
const programmeRequired = {
  message: 'Select your programme / department',
  path: ['programmeId'],
};

/**
 * Student Registration Schema
 */
export const studentRegistrationSchema = z
  .object({
    name: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    collegeEmail: z
      .string({ required_error: 'College email is required' })
      .trim()
      .transform(normalizeEmail)
      .refine(isKprietEmail, {
        message: 'Must use an official KPRIET college email (@kpriet.ac.in or @kpiet.ac.in)',
      })
      .refine(isStudentEmail, {
        message: 'Student email must follow the official roll number format (e.g. 23IT040@kpriet.ac.in)',
      }),
    password: passwordSchema,
    programmeId: programmeIdSchema.optional(),
    departmentId: objectIdSchema.optional(),
    academicYear: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, 'Academic year must be formatted as YYYY-YYYY')
      .optional(),
    studentIdentifier: z
      .string({ required_error: 'Student Register No. or Roll No. is required' })
      .trim()
      .toUpperCase()
      .min(4, 'Identifier must be at least 4 characters')
      .max(20, 'Identifier cannot exceed 20 characters'),
    currentSemesterNumber: z.coerce
      .number()
      .int()
      .min(1, 'Semester must be between 1 and 8')
      .max(8, 'Semester must be between 1 and 8')
      .default(1),
    // Reject any attempt by client to pass role or approval status
    role: z.undefined({ invalid_type_error: 'Role cannot be specified during registration' }),
    approvalStatus: z.undefined({ invalid_type_error: 'Approval status cannot be specified' }),
  })
  .refine(hasProgramme, programmeRequired)
  .refine(
    (data) => {
      // Enforce: Student email prefix must match the student identifier
      const prefix = data.collegeEmail ? data.collegeEmail.split('@')[0] : '';
      const emailPrefix = (prefix || '').toUpperCase();
      return emailPrefix === data.studentIdentifier;
    },
    {
      message: 'Student email must match the student register/roll number identifier',
      path: ['studentIdentifier'],
    }
  );

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>;

/**
 * Teacher Registration Schema
 */
export const teacherRegistrationSchema = z
  .object({
  name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  collegeEmail: z
    .string({ required_error: 'College email is required' })
    .trim()
    .transform(normalizeEmail)
    .refine(isKprietEmail, {
      message: 'Must use an official KPRIET college email (@kpriet.ac.in or @kpiet.ac.in)',
    })
    .refine((email) => !isStudentEmail(email), {
      message: 'Faculty/teacher registration cannot use a student roll number email',
    }),
  password: passwordSchema,
  programmeId: programmeIdSchema.optional(),
  departmentId: objectIdSchema.optional(),
  employeeIdentifier: z
    .string({ required_error: 'Faculty / Employee ID is required' })
    .trim()
    .toUpperCase()
    .min(3, 'Employee ID must be at least 3 characters')
    .max(25, 'Employee ID cannot exceed 25 characters'),
  designation: z.string().trim().max(100).optional(),
  // Reject any attempt to choose HOD or ADMIN
  role: z.undefined({ invalid_type_error: 'Role cannot be selected during public registration' }),
  approvalStatus: z.undefined({ invalid_type_error: 'Approval status cannot be specified' }),
  })
  .refine(hasProgramme, programmeRequired);

export type TeacherRegistrationInput = z.infer<typeof teacherRegistrationSchema>;

/**
 * Login Schema
 */
export const loginSchema = z.object({
  collegeEmail: z
    .string({ required_error: 'College email or username is required' })
    .trim()
    .transform((val) => {
      const normalized = val.toLowerCase();
      if (!normalized.includes('@')) {
        return `${normalized}@kpriet.ac.in`;
      }
      return normalizeEmail(normalized);
    })
    .refine(isKprietEmail, {
      message: 'Must use an official KPRIET college email (@kpriet.ac.in or @kpiet.ac.in) or username',
    }),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
