import { logger } from '../config/logger.js';
import {
  AIQueryLog,
  Assignment,
  AssignmentGrade,
  AssignmentSubmission,
  AttendanceRecord,
  AttendanceSession,
  AuditLog,
  Content,
  Department,
  KnowledgeChunk,
  KnowledgeDocument,
  Programme,
  Question,
  QuestionBank,
  Quiz,
  QuizAnswer,
  QuizAttempt,
  QuizResult,
  RefreshToken,
  Semester,
  SemesterResult,
  StudentEnrollment,
  Subject,
  SubjectResult,
  TeacherAssignment,
  User,
} from '../models/index.js';

const log = logger.child({ component: 'indexes' });

export const ALL_MODELS = [
  Department,
  Programme,
  User,
  Semester,
  Subject,
  TeacherAssignment,
  StudentEnrollment,
  Content,
  Quiz,
  Question,
  QuestionBank,
  QuizAttempt,
  QuizAnswer,
  QuizResult,
  Assignment,
  AssignmentSubmission,
  AssignmentGrade,
  SubjectResult,
  SemesterResult,
  AttendanceSession,
  AttendanceRecord,
  KnowledgeDocument,
  KnowledgeChunk,
  AIQueryLog,
  AuditLog,
];

/**
 * Ensures and synchronizes all MongoDB indexes across all academic domain models.
 */
export async function ensureAllIndexes(): Promise<void> {
  log.info(`Ensuring indexes for ${ALL_MODELS.length} models...`);

  for (const model of ALL_MODELS) {
    try {
      await model.syncIndexes();
      log.info(`✔ Indexes synchronized for ${model.modelName}`);
    } catch (err) {
      log.error({ err, model: model.modelName }, `Failed to sync indexes for ${model.modelName}`);
      throw err;
    }
  }

  log.info('All academic models indexes successfully verified.');
}
