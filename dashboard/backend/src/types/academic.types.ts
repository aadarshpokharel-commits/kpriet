/**
 * Academic Domain Type Definitions for Eduverse Academic Portal.
 * Strongly typed enums, interfaces, and payloads for MERN + TypeScript.
 */

export const UserRole = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  HOD: 'HOD',
  ADMIN: 'ADMIN',
  PRINCIPAL: 'PRINCIPAL',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AccountStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING: 'PENDING',
} as const;
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const ApprovalStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const ProgrammeType = {
  UG: 'UG',
  PG: 'PG',
  PHD: 'PHD',
  INTEGRATED: 'INTEGRATED',
} as const;
export type ProgrammeType = (typeof ProgrammeType)[keyof typeof ProgrammeType];

export const SemesterStatus = {
  UPCOMING: 'UPCOMING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
} as const;
export type SemesterStatus = (typeof SemesterStatus)[keyof typeof SemesterStatus];

export const TeacherAssignmentStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  COMPLETED: 'COMPLETED',
} as const;
export type TeacherAssignmentStatus =
  (typeof TeacherAssignmentStatus)[keyof typeof TeacherAssignmentStatus];

export const EnrollmentStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
} as const;
export type EnrollmentStatus =
  (typeof EnrollmentStatus)[keyof typeof EnrollmentStatus];

export const ContentType = {
  NOTES: 'NOTES',
  MATERIALS: 'MATERIALS',
  VIDEOS: 'VIDEOS',
  PRESENTATIONS: 'PRESENTATIONS',
  ANNOUNCEMENTS: 'ANNOUNCEMENTS',
  SIMULATIONS: 'SIMULATIONS',
} as const;
export type ContentType = (typeof ContentType)[keyof typeof ContentType];

export const ContentStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

export const QuestionType = {
  MCQ: 'MCQ',
  MULTIPLE_CORRECT: 'MULTIPLE_CORRECT',
  FILL_IN_THE_BLANK: 'FILL_IN_THE_BLANK',
  ASSERTION_REASON: 'ASSERTION_REASON',
  NUMERICAL: 'NUMERICAL',
  MATCH_FOLLOWING: 'MATCH_FOLLOWING',
  CASE_SCENARIO: 'CASE_SCENARIO',
  SHORT_ANSWER: 'SHORT_ANSWER',
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const QuizStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type QuizStatus = (typeof QuizStatus)[keyof typeof QuizStatus];

export const QuizAttemptStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  GRADED: 'GRADED',
  TIMED_OUT: 'TIMED_OUT',
  ABANDONED: 'ABANDONED',
} as const;
export type QuizAttemptStatus =
  (typeof QuizAttemptStatus)[keyof typeof QuizAttemptStatus];

export const AssignmentStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type AssignmentStatus =
  (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const SubmissionStatus = {
  SUBMITTED: 'SUBMITTED',
  LATE: 'LATE',
  RESUBMITTED: 'RESUBMITTED',
  GRADED: 'GRADED',
} as const;
export type SubmissionStatus =
  (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

export const LateSubmissionPolicy = {
  ALLOW_WITH_PENALTY: 'ALLOW_WITH_PENALTY',
  ALLOW_NO_PENALTY: 'ALLOW_NO_PENALTY',
  REJECT: 'REJECT',
} as const;
export type LateSubmissionPolicy =
  (typeof LateSubmissionPolicy)[keyof typeof LateSubmissionPolicy];

export const TeacherGradingDecision = {
  MANUAL: 'MANUAL',
  ACCEPTED_AI: 'ACCEPTED_AI',
  MODIFIED_AI: 'MODIFIED_AI',
  REJECTED_AI: 'REJECTED_AI',
} as const;
export type TeacherGradingDecision =
  (typeof TeacherGradingDecision)[keyof typeof TeacherGradingDecision];

export const AttendanceStatus = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
  OD: 'OD',
} as const;
export type AttendanceStatus =
  (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const AcademicResultStatus = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  WITHHELD: 'WITHHELD',
  ABSENT: 'ABSENT',
} as const;
export type AcademicResultStatus =
  (typeof AcademicResultStatus)[keyof typeof AcademicResultStatus];

export const AuditAction = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTRATION: 'REGISTRATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
  APPROVAL: 'APPROVAL',
  REJECTION: 'REJECTION',
  USER_STATUS_CHANGE: 'USER_STATUS_CHANGE',
  CONTENT_PUBLISH: 'CONTENT_PUBLISH',
  CONTENT_UPDATE: 'CONTENT_UPDATE',
  CONTENT_DELETE: 'CONTENT_DELETE',
  QUIZ_CREATE: 'QUIZ_CREATE',
  QUIZ_PUBLISH: 'QUIZ_PUBLISH',
  QUIZ_SUBMIT: 'QUIZ_SUBMIT',
  ASSIGNMENT_CREATE: 'ASSIGNMENT_CREATE',
  ASSIGNMENT_SUBMIT: 'ASSIGNMENT_SUBMIT',
  GRADING: 'GRADING',
  ENROLLMENT_REQUEST: 'ENROLLMENT_REQUEST',
  ENROLLMENT_APPROVAL: 'ENROLLMENT_APPROVAL',
  ENROLLMENT_REJECTION: 'ENROLLMENT_REJECTION',
  ROLE_CHANGE: 'ROLE_CHANGE',
  ADMIN_ACTION: 'ADMIN_ACTION',
  ATTENDANCE_RECORD: 'ATTENDANCE_RECORD',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const DifficultyLevel = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
  MIXED: 'MIXED',
} as const;
export type DifficultyLevel =
  (typeof DifficultyLevel)[keyof typeof DifficultyLevel];

export const BloomsTaxonomy = {
  REMEMBER: 'REMEMBER',
  UNDERSTAND: 'UNDERSTAND',
  APPLY: 'APPLY',
  ANALYZE: 'ANALYZE',
  EVALUATE: 'EVALUATE',
  CREATE: 'CREATE',
} as const;
export type BloomsTaxonomy =
  (typeof BloomsTaxonomy)[keyof typeof BloomsTaxonomy];

export const QuizNavigationRule = {
  FREE: 'FREE',
  SEQUENTIAL: 'SEQUENTIAL',
} as const;
export type QuizNavigationRule =
  (typeof QuizNavigationRule)[keyof typeof QuizNavigationRule];

export const NotificationType = {
  // Student notifications
  NOTES_PUBLISHED: 'NOTES_PUBLISHED',
  MATERIAL_PUBLISHED: 'MATERIAL_PUBLISHED',
  VIDEO_PUBLISHED: 'VIDEO_PUBLISHED',
  QUIZ_PUBLISHED: 'QUIZ_PUBLISHED',
  ASSIGNMENT_PUBLISHED: 'ASSIGNMENT_PUBLISHED',
  DEADLINE_APPROACHING: 'DEADLINE_APPROACHING',
  RESULT_PUBLISHED: 'RESULT_PUBLISHED',
  ANNOUNCEMENT_POSTED: 'ANNOUNCEMENT_POSTED',
  ENROLLMENT_APPROVED: 'ENROLLMENT_APPROVED',
  ENROLLMENT_REJECTED: 'ENROLLMENT_REJECTED',

  // Teacher notifications
  ASSIGNMENT_SUBMITTED: 'ASSIGNMENT_SUBMITTED',
  QUIZ_COMPLETED: 'QUIZ_COMPLETED',
  ENROLLMENT_REQUESTED: 'ENROLLMENT_REQUESTED',
  DEPARTMENT_ANNOUNCEMENT: 'DEPARTMENT_ANNOUNCEMENT',
  TEACHING_ASSIGNMENT_CREATED: 'TEACHING_ASSIGNMENT_CREATED',

  // HOD notifications
  TEACHER_REGISTRATION_REQUESTED: 'TEACHER_REGISTRATION_REQUESTED',
  STUDENT_ENROLLMENT_REQUESTED: 'STUDENT_ENROLLMENT_REQUESTED',
  DEPARTMENT_EVENT: 'DEPARTMENT_EVENT',
} as const;
export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];


