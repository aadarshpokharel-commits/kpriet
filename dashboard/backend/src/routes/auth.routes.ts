import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import {
  authenticate,
  requireActiveApproval,
  requireAdmin,
  requireHOD,
  requireStudent,
  requireSubjectAccess,
  requireTeacher,
} from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { ApiResponse } from '../utils/apiResponse.js';
import {
  loginSchema,
  studentRegistrationSchema,
  teacherRegistrationSchema,
} from '../validators/auth.validators.js';

export const authRouter = Router();

// -------------------------------------------------------------
// PUBLIC AUTH ENDPOINTS
// -------------------------------------------------------------

// Active departments for registration dropdowns
authRouter.get('/departments', AuthController.getDepartments);

// Real-time public institution stats (courses, faculty, students, academic years)
authRouter.get('/public-stats', AuthController.getPublicStats);

// Student Registration
authRouter.post(
  '/register/student',
  authRateLimiter,
  validate({ body: studentRegistrationSchema }),
  AuthController.registerStudent
);

// Teacher Registration
authRouter.post(
  '/register/teacher',
  authRateLimiter,
  validate({ body: teacherRegistrationSchema }),
  AuthController.registerTeacher
);

// Sign In / Login
authRouter.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  AuthController.login
);

// Refresh Session
authRouter.post('/refresh', authRateLimiter, AuthController.refresh);

// Logout
authRouter.post('/logout', AuthController.logout);

// -------------------------------------------------------------
// AUTHENTICATED ENDPOINTS
// -------------------------------------------------------------

// Current Authenticated User context
authRouter.get('/me', authenticate, AuthController.me);

// -------------------------------------------------------------
// VERIFICATION & AUTHORIZATION TEST ROUTES
// (Guaranteed backend authority endpoints for integration testing)
// -------------------------------------------------------------

authRouter.get('/test/student', authenticate, requireStudent, (req, res) => {
  ApiResponse.ok(res, 'Student access granted.', { studentId: req.user!._id });
});

authRouter.get(
  '/test/teacher',
  authenticate,
  requireTeacher,
  requireActiveApproval,
  (req, res) => {
    ApiResponse.ok(res, 'Teacher access granted.', { teacherId: req.user!._id });
  }
);

authRouter.get('/test/hod', authenticate, requireHOD, (req, res) => {
  ApiResponse.ok(res, 'HOD access granted.', { hodId: req.user!._id });
});

authRouter.get('/test/admin', authenticate, requireAdmin, (req, res) => {
  ApiResponse.ok(res, 'Admin access granted.', { adminId: req.user!._id });
});

authRouter.get(
  '/test/subject/:subjectId',
  authenticate,
  requireSubjectAccess(),
  (req, res) => {
    ApiResponse.ok(res, 'Subject access granted.', {
      userRole: req.user!.role,
      subjectId: req.params.subjectId,
    });
  }
);
