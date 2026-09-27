import { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller.js';
import { AcademicController } from '../controllers/academic.controller.js';
import {
  authenticate,
  requireRole,
  requireActiveApproval,
  requireSubjectAccess,
} from '../middleware/auth.middleware.js';

const router = Router();

// Apply authentication to all assignment routes
router.use(authenticate);

// ─── TEACHER MANAGEMENT ENDPOINTS ───
router.post(
  '/',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  AssignmentController.createAssignment
);

router.post(
  '/ai-generate',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  AssignmentController.aiGenerateAssignment
);

router.get(
  '/teacher',
  requireRole('TEACHER', 'HOD'),
  AssignmentController.getTeacherAssignments
);

router.get(
  '/teachers',
  AcademicController.getTeacherAssignments
);

router.put(
  '/:id',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  AssignmentController.updateAssignment
);

router.patch(
  '/:id/publish',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  AssignmentController.publishAssignment
);

router.patch(
  '/:id/unpublish',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  AssignmentController.unpublishAssignment
);

router.post(
  '/:id/duplicate',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  AssignmentController.duplicateAssignment
);

router.patch(
  '/:id/close',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  AssignmentController.closeSubmissions
);

router.delete(
  '/:id',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  AssignmentController.deleteAssignment
);

router.get(
  '/:id/submissions',
  requireRole('TEACHER', 'HOD'),
  AssignmentController.getAssignmentSubmissions
);

router.post(
  '/submissions/:submissionId/ai-evaluate',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  AssignmentController.runAiEvaluation
);

router.post(
  '/grade',
  requireRole('TEACHER', 'HOD'),
  requireActiveApproval,
  AssignmentController.gradeSubmission
);

// ─── STUDENT SUBMISSION & WORKSPACE ENDPOINTS ───
router.get(
  '/student/subject/:subjectId',
  requireSubjectAccess('subjectId'),
  AssignmentController.getStudentAssignments
);

router.post(
  '/:id/submit',
  requireRole('STUDENT'),
  requireActiveApproval,
  AssignmentController.submitAssignment
);

// ─── COMMON DETAIL ENDPOINT ───
router.get(
  '/:id',
  AssignmentController.getAssignmentById
);

export default router;
