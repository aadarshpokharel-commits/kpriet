import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { UserRole } from '../types/academic.types.js';

export const adminRouter = Router();

// Protect all admin routes with authentication and strict role requirement
adminRouter.use(authenticate);
adminRouter.use(requireRole(UserRole.ADMIN, UserRole.PRINCIPAL));

// ─── Institution Overview & Metrics ───
adminRouter.get('/overview', AdminController.getInstitutionOverview);
adminRouter.get('/departments', AdminController.getDepartmentOverview);
adminRouter.get('/faculty', AdminController.getFacultyDirectory);
adminRouter.get('/students', AdminController.getStudentDirectory);
adminRouter.get('/activity', AdminController.getAcademicActivity);
adminRouter.get('/audit-logs', AdminController.getAuditLogs);

// ─── Privileged Configuration Management ───
adminRouter.post('/departments', AdminController.createDepartment);
adminRouter.put('/departments/:id', AdminController.updateDepartment);
adminRouter.put('/departments/:id/hod', AdminController.assignDepartmentHod);
adminRouter.patch('/departments/:id/status', AdminController.toggleDepartmentStatus);
adminRouter.patch('/users/:userId/status', AdminController.updateUserStatus);
