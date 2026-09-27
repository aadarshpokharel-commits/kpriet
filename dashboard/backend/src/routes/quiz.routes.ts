import { Router } from 'express';
import { QuizController } from '../controllers/quiz.controller.js';
import {
  authenticate,
  requireRole,
  requireActiveApproval,
} from '../middleware/auth.middleware.js';

const router = Router();

// Apply authentication to all quiz routes
router.use(authenticate);

// ─── Quiz Management (Teacher & HOD) ───
router.post(
  '/',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  QuizController.createQuiz
);

router.get('/subjects/:subjectId', QuizController.getSubjectQuizzes);
router.get('/:id', QuizController.getQuizById);

router.put(
  '/:id',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  QuizController.updateQuiz
);

router.delete(
  '/:id',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  QuizController.deleteQuiz
);

router.post(
  '/:id/questions',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  QuizController.addQuestion
);

router.post(
  '/:id/import-bank',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  QuizController.importQuestionsFromBank
);

router.post(
  '/generate-ai',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  QuizController.generateAIQuiz
);

router.post(
  '/generate-ai-single',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  QuizController.regenerateSingleQuestion
);

// ─── Question Bank (Teacher & HOD) ───
router.get(
  '/subjects/:subjectId/question-bank',
  requireRole('TEACHER', 'HOD'),
  QuizController.getQuestionBank
);

router.post(
  '/subjects/:subjectId/question-bank',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  QuizController.createQuestionBankItem
);

router.put(
  '/question-bank/:id',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  QuizController.updateQuestionBankItem
);

router.post(
  '/question-bank/:id/duplicate',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  QuizController.duplicateQuestionBankItem
);

router.delete(
  '/question-bank/:id',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  QuizController.deleteQuestionBankItem
);

// ─── Student Assessment Engine ───
router.post(
  '/:id/start',
  requireRole('STUDENT', 'TEACHER', 'HOD', 'ADMIN'),
  QuizController.startQuizAttempt
);

router.post(
  '/:id/retake',
  requireRole('STUDENT', 'TEACHER', 'HOD', 'ADMIN'),
  QuizController.retakeQuizAttempt
);

router.post(
  '/attempts/:attemptId/autosave',
  requireRole('STUDENT'),
  QuizController.saveAttemptDraft
);

router.post(
  '/attempts/:attemptId/security-event',
  requireRole('STUDENT'),
  QuizController.recordSecurityViolation
);

router.post(
  '/attempts/:attemptId/submit',
  requireRole('STUDENT'),
  QuizController.submitQuizAttempt
);

router.get(
  '/attempts/:attemptId/review',
  requireRole('STUDENT'),
  QuizController.getQuizAttemptReview
);

// ─── Teacher Analytics & Subjective Grading ───
router.get(
  '/:id/analytics',
  requireRole('TEACHER', 'HOD'),
  QuizController.getQuizAnalytics
);

router.post(
  '/attempts/:attemptId/grade-subjective',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  QuizController.gradeSubjectiveAnswer
);

export default router;

