import { Router } from 'express';
import { TrackingController } from '../controllers/tracking.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '../types/academic.types.js';

export const trackingRouter = Router();

// Authenticate all tracking routes
trackingRouter.use(authenticate);

// ─── TEACHER ATTENDANCE MANAGEMENT ───
trackingRouter.get(
  '/attendance/enrolled-students',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.HOD, UserRole.PRINCIPAL),
  TrackingController.getEnrolledStudentsForAttendance
);

trackingRouter.post(
  '/attendance/sessions',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.HOD, UserRole.PRINCIPAL),
  TrackingController.recordAttendanceSession
);

trackingRouter.put(
  '/attendance/sessions/:sessionId',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.HOD, UserRole.PRINCIPAL),
  TrackingController.updateAttendanceSession
);

trackingRouter.get(
  '/attendance/sessions',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.HOD, UserRole.PRINCIPAL),
  TrackingController.getAttendanceHistory
);

trackingRouter.get(
  '/attendance/sessions/:sessionId',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.HOD, UserRole.PRINCIPAL),
  TrackingController.getAttendanceSessionById
);

// ─── TEACHER RESULTS & ANALYTICS ───
trackingRouter.get(
  '/teacher/subjects/:subjectId/results',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.HOD, UserRole.PRINCIPAL),
  TrackingController.getTeacherSubjectResults
);

// ─── STUDENT ATTENDANCE & ACADEMIC TRACKING ───
// Students are strictly read-only and scoped to their own verified token identity
trackingRouter.get(
  '/student/attendance',
  requireRole(UserRole.STUDENT, UserRole.ADMIN),
  TrackingController.getStudentAttendance
);

trackingRouter.get(
  '/student/results',
  requireRole(UserRole.STUDENT, UserRole.ADMIN),
  TrackingController.getStudentResultsAndProgress
);
