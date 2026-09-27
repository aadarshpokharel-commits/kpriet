import { Router } from 'express';
import { AcademicController } from '../controllers/academic.controller.js';
import {
  authenticate,
  requireActiveApproval,
  requireDepartmentAccess,
  requireRole,
  requireSemesterAccess,
  requireSubjectAccess,
} from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { UserRole } from '../types/academic.types.js';
import {
  aiDoubtQuerySchema,
  assignSimulationSchema,
  assignTeacherSchema,
  chapterSchema,
  createContentSchema,
  createProgrammeSchema,
  createSemesterSchema,
  createSubjectSchema,
  createTeacherAssignmentSchema,
  gradeSubmissionSchema,
  recordAttendanceSchema,
  recordSimulationActivitySchema,
  requestEnrollmentSchema,
  reviewEnrollmentSchema,
  reviewFacultySchema,
  toggleSimulationStatusSchema,
  toggleSubjectStatusSchema,
  updateChapterSchema,
  updateContentSchema,
  updateProgrammeSchema,
  updateSemesterSchema,
  updateSubjectSchema,
} from '../validators/academic.validators.js';


export const academicRouter = Router();

// Apply authentication to all academic hierarchy routes
academicRouter.use(
  ['/departments', '/programmes', '/semesters', '/subjects', '/assignments', '/enrollments', '/students', '/teachers', '/curriculum', '/smartboard'],
  authenticate
);

// ─── COMPLETE CURRICULUM TREE & ELECTIVES ───
academicRouter.get('/curriculum/tree', AcademicController.getCurriculumTree);
academicRouter.get('/curriculum/electives/professional', AcademicController.getProfessionalElectives);
academicRouter.get('/curriculum/electives/open', AcademicController.getOpenElectives);
academicRouter.get('/subjects/:id/curriculum-units', AcademicController.getCurriculumUnits);

// ─── DEPARTMENTS & HOD MANAGEMENT ───
academicRouter.get('/departments', AcademicController.getDepartments);
academicRouter.get('/departments/:id', AcademicController.getDepartment);
academicRouter.get(
  '/departments/:id/stats',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireDepartmentAccess(),
  AcademicController.getDepartmentStats
);
academicRouter.get(
  '/departments/:id/faculty',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireDepartmentAccess(),
  AcademicController.getDepartmentFaculty
);
academicRouter.put(
  '/departments/:id/faculty/:teacherId/review',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireDepartmentAccess(),
  validate({ body: reviewFacultySchema }),
  AcademicController.reviewFaculty
);
academicRouter.get(
  '/departments/:id/students',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireDepartmentAccess(),
  AcademicController.getDepartmentStudents
);
academicRouter.get(
  '/departments/:id/students/:studentId/history',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireDepartmentAccess(),
  AcademicController.getStudentAcademicHistory
);

// ─── PROGRAMMES ───
academicRouter.get('/programmes', AcademicController.getProgrammes);
academicRouter.post(
  '/programmes',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  validate({ body: createProgrammeSchema }),
  AcademicController.createProgramme
);
academicRouter.put(
  '/programmes/:id',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  validate({ body: updateProgrammeSchema }),
  AcademicController.updateProgramme
);

// ─── SEMESTERS ───
// Students querying /semesters are automatically scoped to current & previous semesters
academicRouter.get('/semesters', AcademicController.getSemesters);
academicRouter.get(
  '/semesters/:id',
  requireSemesterAccess('id'),
  AcademicController.getSemester
);
academicRouter.post(
  '/semesters',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  validate({ body: createSemesterSchema }),
  AcademicController.createSemester
);
academicRouter.put(
  '/semesters/:id',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  validate({ body: updateSemesterSchema }),
  AcademicController.updateSemester
);

// ─── SUBJECTS ───
academicRouter.get('/subjects', AcademicController.getSubjects);
academicRouter.get(
  '/subjects/:id',
  requireSubjectAccess('id'),
  AcademicController.getSubject
);
academicRouter.post(
  '/subjects',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  validate({ body: createSubjectSchema }),
  AcademicController.createSubject
);
academicRouter.put(
  '/subjects/:id',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  validate({ body: updateSubjectSchema }),
  AcademicController.updateSubject
);
academicRouter.delete(
  '/subjects/:id',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  AcademicController.deleteSubject
);
academicRouter.patch(
  '/subjects/:id/status',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireSubjectAccess('id'),
  validate({ body: toggleSubjectStatusSchema }),
  AcademicController.toggleSubjectStatus
);

// ─── CHAPTERS / SYLLABUS UNITS ───
academicRouter.get(
  '/subjects/:subjectId/chapters',
  requireSubjectAccess('subjectId'),
  AcademicController.getChapters
);
academicRouter.post(
  '/subjects/:subjectId/chapters',
  requireRole(UserRole.HOD, UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireActiveApproval,
  requireSubjectAccess('subjectId'),
  validate({ body: chapterSchema }),
  AcademicController.addChapter
);
academicRouter.put(
  '/subjects/:subjectId/chapters/:chapterId',
  requireRole(UserRole.HOD, UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireActiveApproval,
  requireSubjectAccess('subjectId'),
  validate({ body: updateChapterSchema }),
  AcademicController.updateChapter
);
academicRouter.delete(
  '/subjects/:subjectId/chapters/:chapterId',
  requireRole(UserRole.HOD, UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireActiveApproval,
  requireSubjectAccess('subjectId'),
  AcademicController.deleteChapter
);

// ─── TEACHER ASSIGNMENTS ───
academicRouter.get('/assignments/teachers', AcademicController.getTeacherAssignments);
academicRouter.post(
  '/assignments/teachers',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  validate({ body: assignTeacherSchema }),
  AcademicController.assignTeacher
);
academicRouter.delete(
  '/assignments/teachers/:id',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  AcademicController.removeTeacherAssignment
);

// ─── STUDENT ENROLLMENTS ───
academicRouter.get('/enrollments', AcademicController.getEnrollments);
academicRouter.post(
  '/enrollments/request',
  requireRole(UserRole.STUDENT),
  validate({ body: requestEnrollmentSchema }),
  AcademicController.requestEnrollment
);
academicRouter.put(
  '/enrollments/:id/review',
  requireRole(UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  validate({ body: reviewEnrollmentSchema }),
  AcademicController.reviewEnrollment
);

// ─── STUDENT ACADEMIC EXPERIENCE (MODULE 06) ───
academicRouter.get(
  '/students/dashboard-overview',
  requireRole(UserRole.STUDENT, UserRole.ADMIN, UserRole.PRINCIPAL),
  AcademicController.getStudentDashboardOverview
);
academicRouter.get(
  '/students/semesters/archive',
  requireRole(UserRole.STUDENT, UserRole.ADMIN, UserRole.PRINCIPAL),
  AcademicController.getStudentSemesterArchive
);
academicRouter.get(
  '/students/semesters/next-available',
  requireRole(UserRole.STUDENT, UserRole.ADMIN, UserRole.PRINCIPAL),
  AcademicController.getNextAvailableSemester
);

// ─── SUBJECT WORKSPACE & AI DOUBT ───
academicRouter.get(
  '/subjects/:id/workspace',
  requireSubjectAccess('id'),
  AcademicController.getSubjectWorkspace
);
academicRouter.post(
  '/subjects/:id/ai-doubt',
  requireSubjectAccess('id'),
  validate({ body: aiDoubtQuerySchema }),
  AcademicController.solveSubjectAIDoubt
);
academicRouter.post(
  '/subjects/:id/ai-query',
  requireSubjectAccess('id'),
  AcademicController.executeSubjectAiQuery
);
academicRouter.get(
  '/subjects/:id/ai-logs',
  requireSubjectAccess('id'),
  AcademicController.getSubjectAiLogs
);

// ─── SMART BOARD PORTAL INTEGRATION ───
academicRouter.post(
  '/smartboard/session',
  requireSubjectAccess('subjectId'),
  AcademicController.createSmartBoardSession
);
academicRouter.get(
  '/subjects/:id/smartboard-context',
  requireSubjectAccess('id'),
  AcademicController.getSmartBoardContext
);
academicRouter.post(
  '/smartboard/share-notes',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.HOD),
  AcademicController.shareSmartBoardNotes
);

// ─── TEACHER DASHBOARD & WORKSPACE (MODULE 07) ───
academicRouter.get(
  '/teachers/dashboard-overview',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  AcademicController.getTeacherDashboardOverview
);

academicRouter.get(
  '/teachers/assigned-subjects',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  AcademicController.getTeacherAssignedSubjects
);

academicRouter.get(
  '/teachers/subjects/:id/workspace',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireSubjectAccess('id'),
  AcademicController.getTeacherSubjectWorkspace
);

academicRouter.get(
  '/teachers/subjects/:id/students-progress',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireSubjectAccess('id'),
  AcademicController.getTeacherSubjectStudentsProgress
);

academicRouter.get(
  '/teachers/subjects/:id/curriculum',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireSubjectAccess('id'),
  AcademicController.getTeacherSubjectCurriculum
);

academicRouter.put(
  '/teachers/subjects/:id/curriculum/units/:unitNumber',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireActiveApproval,
  requireSubjectAccess('id'),
  AcademicController.saveTeacherSubjectCurriculum
);

academicRouter.get(
  '/teachers/subjects/:id/ai-knowledge-stats',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireSubjectAccess('id'),
  AcademicController.getTeacherKnowledgeBaseStats
);

academicRouter.post(
  '/teachers/subjects/:id/content',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireActiveApproval,
  requireSubjectAccess('id'),
  validate({ body: createContentSchema }),
  AcademicController.createSubjectContent
);

academicRouter.put(
  '/teachers/subjects/:id/content/:contentId',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireActiveApproval,
  requireSubjectAccess('id'),
  validate({ body: updateContentSchema }),
  AcademicController.updateSubjectContent
);

academicRouter.delete(
  '/teachers/subjects/:id/content/:contentId',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireActiveApproval,
  requireSubjectAccess('id'),
  AcademicController.deleteSubjectContent
);

academicRouter.post(
  '/teachers/subjects/:id/assignments',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireActiveApproval,
  requireSubjectAccess('id'),
  validate({ body: createTeacherAssignmentSchema }),
  AcademicController.createTeacherAssignment
);

academicRouter.post(
  '/teachers/assignments/grade',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireActiveApproval,
  validate({ body: gradeSubmissionSchema }),
  AcademicController.gradeStudentSubmission
);

academicRouter.post(
  '/teachers/subjects/:id/attendance',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireActiveApproval,
  requireSubjectAccess('id'),
  validate({ body: recordAttendanceSchema }),
  AcademicController.recordSubjectAttendance
);

// ─── SIMULATION MANAGEMENT SYSTEM ───
// Available simulations catalog for a subject's domain (Math, Physics, CS, Civil)
academicRouter.get(
  '/subjects/:id/available-simulations',
  requireSubjectAccess('id'),
  AcademicController.getAvailableSimulations
);

// Subject assigned simulations (Students get only PUBLISHED; Teachers get all)
academicRouter.get(
  '/subjects/:id/simulations',
  requireSubjectAccess('id'),
  AcademicController.getSubjectSimulations
);

academicRouter.post(
  '/subjects/:id/simulations/:simulationId/activity',
  requireRole(UserRole.STUDENT),
  requireSubjectAccess('id'),
  validate({ body: recordSimulationActivitySchema }),
  AcademicController.recordSimulationActivity
);

// Teacher assigns simulation to subject & chapter/unit
academicRouter.post(
  '/subjects/:id/simulations',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireActiveApproval,
  requireSubjectAccess('id'),
  validate({ body: assignSimulationSchema }),
  AcademicController.assignSimulation
);

// Teacher enables or disables simulation
academicRouter.patch(
  '/subjects/:id/simulations/:simulationId/status',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireActiveApproval,
  requireSubjectAccess('id'),
  validate({ body: toggleSimulationStatusSchema }),
  AcademicController.toggleSimulationStatus
);

// Teacher removes simulation from subject
academicRouter.delete(
  '/subjects/:id/simulations/:simulationId',
  requireRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireActiveApproval,
  requireSubjectAccess('id'),
  AcademicController.deleteSimulation
);

