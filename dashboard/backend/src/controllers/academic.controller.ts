import { type Request, type Response } from 'express';
import { AcademicService } from '../services/academic.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ProgrammeService } from '../services/programme.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class AcademicController {
  // ─── DEPARTMENTS ───

  static async getDepartments(_req: Request, res: Response) {
    const departments = await AcademicService.getAllDepartments();
    ApiResponse.ok(res, 'Departments retrieved successfully.', departments);
  }

  static async getDepartment(req: Request, res: Response) {
    const id = String(req.params.id);
    const department = await AcademicService.getDepartmentById(id);
    ApiResponse.ok(res, 'Department retrieved successfully.', department);
  }

  static async getDepartmentStats(req: Request, res: Response) {
    const rawDeptId = req.params.id || (req.user?.department ? String(req.user.department) : undefined);
    if (!rawDeptId) {
      throw ApiError.badRequest('Department ID is required.');
    }
    const deptId = String(rawDeptId);
    const stats = await AcademicService.getDepartmentStats(deptId);
    ApiResponse.ok(res, 'Department statistics retrieved successfully.', stats);
  }

  static async getDepartmentFaculty(req: Request, res: Response) {
    const rawDeptId = req.params.id || (req.user?.department ? String(req.user.department) : undefined);
    if (!rawDeptId) {
      throw ApiError.badRequest('Department ID is required.');
    }
    const deptId = String(rawDeptId);
    const faculty = await AcademicService.getDepartmentFaculty(deptId);
    ApiResponse.ok(res, 'Department faculty retrieved successfully.', faculty);
  }

  static async getDepartmentStudents(req: Request, res: Response) {
    const rawDeptId = req.params.id || (req.user?.department ? String(req.user.department) : undefined);
    if (!rawDeptId) {
      throw ApiError.badRequest('Department ID is required.');
    }
    const deptId = String(rawDeptId);
    const semesterNumber = req.query.semesterNumber ? Number(req.query.semesterNumber) : undefined;
    const students = await AcademicService.getDepartmentStudents(deptId, semesterNumber);
    ApiResponse.ok(res, 'Department students retrieved successfully.', students);
  }

  // ─── PROGRAMMES ───

  static async getProgrammes(req: Request, res: Response) {
    const departmentId = req.query.departmentId ? String(req.query.departmentId) : undefined;
    const programmes = await AcademicService.getProgrammes(departmentId);
    ApiResponse.ok(res, 'Programmes retrieved successfully.', programmes);
  }

  static async createProgramme(req: Request, res: Response) {
    const input = req.validated?.body as any;
    const programme = await AcademicService.createProgramme(input);
    ApiResponse.created(res, 'Programme created successfully.', programme);
  }

  static async updateProgramme(req: Request, res: Response) {
    const id = String(req.params.id);
    const input = req.validated?.body as any;
    const programme = await AcademicService.updateProgramme(id, input);
    ApiResponse.ok(res, 'Programme updated successfully.', programme);
  }

  // ─── SEMESTERS ───

  static async getSemesters(req: Request, res: Response) {
    const filters = {
      departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
      programmeId: req.query.programmeId ? String(req.query.programmeId) : undefined,
    };
    const semesters = await AcademicService.getSemesters(filters, req.user);
    ApiResponse.ok(res, 'Semesters retrieved successfully.', semesters);
  }

  static async getSemester(req: Request, res: Response) {
    const id = String(req.params.id);
    const semester = await AcademicService.getSemesterById(id);
    ApiResponse.ok(res, 'Semester retrieved successfully.', semester);
  }

  static async createSemester(req: Request, res: Response) {
    const input = req.validated?.body as any;
    const semester = await AcademicService.createSemester(input, req.user);
    ApiResponse.created(res, 'Semester created successfully.', semester);
  }

  static async updateSemester(req: Request, res: Response) {
    const id = String(req.params.id);
    const input = req.validated?.body as any;
    const semester = await AcademicService.updateSemester(id, input, req.user);
    ApiResponse.ok(res, 'Semester updated successfully.', semester);
  }

  // ─── SUBJECTS ───

  static async getSubjects(req: Request, res: Response) {
    const filters = {
      departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
      semesterId: req.query.semesterId ? String(req.query.semesterId) : undefined,
      semesterNumber: req.query.semesterNumber ? Number(req.query.semesterNumber) : undefined,
    };
    const subjects = await AcademicService.getSubjects(filters, req.user);
    ApiResponse.ok(res, 'Subjects retrieved successfully.', subjects);
  }

  static async getSubject(req: Request, res: Response) {
    const id = String(req.params.id);
    const subject = await AcademicService.getSubjectById(id);
    ApiResponse.ok(res, 'Subject retrieved successfully.', subject);
  }

  static async createSubject(req: Request, res: Response) {
    const input = req.validated?.body as any;
    const subject = await AcademicService.createSubject(input, req.user);
    ApiResponse.created(res, 'Subject created successfully.', subject);
  }

  static async updateSubject(req: Request, res: Response) {
    const id = String(req.params.id);
    const input = req.validated?.body as any;
    const subject = await AcademicService.updateSubject(id, input, req.user);
    ApiResponse.ok(res, 'Subject updated successfully.', subject);
  }

  static async deleteSubject(req: Request, res: Response) {
    const id = String(req.params.id);
    const subject = await AcademicService.deleteSubject(id, req.user);
    ApiResponse.ok(res, 'Subject archived successfully.', subject);
  }

  static async toggleSubjectStatus(req: Request, res: Response) {
    const id = String(req.params.id);
    const input = req.validated?.body as any;
    const deptId = String(req.user?.department || (req.body as any)?.departmentId);
    const subject = await AcademicService.toggleSubjectStatus(deptId, id, input.status);
    ApiResponse.ok(res, `Subject marked as ${input.status}.`, subject);
  }

  // ─── CHAPTERS / SYLLABUS UNITS ───

  static async getChapters(req: Request, res: Response) {
    const subjectId = String(req.params.subjectId);
    const chapters = await AcademicService.getChapters(subjectId);
    ApiResponse.ok(res, 'Chapters retrieved successfully.', chapters);
  }

  static async addChapter(req: Request, res: Response) {
    const subjectId = String(req.params.subjectId);
    const input = req.validated?.body as any;
    const chapter = await AcademicService.addChapter(subjectId, input);
    ApiResponse.created(res, 'Chapter added successfully.', chapter);
  }

  static async updateChapter(req: Request, res: Response) {
    const subjectId = String(req.params.subjectId);
    const chapterId = String(req.params.chapterId);
    const input = req.validated?.body as any;
    const chapter = await AcademicService.updateChapter(subjectId, chapterId, input);
    ApiResponse.ok(res, 'Chapter updated successfully.', chapter);
  }

  static async deleteChapter(req: Request, res: Response) {
    const subjectId = String(req.params.subjectId);
    const chapterId = String(req.params.chapterId);
    const result = await AcademicService.deleteChapter(subjectId, chapterId);
    ApiResponse.ok(res, result.message);
  }

  // ─── TEACHER ASSIGNMENTS ───

  static async assignTeacher(req: Request, res: Response) {
    const input = req.validated?.body as any;
    const assignment = await AcademicService.assignTeacher(input, req.user);
    ApiResponse.created(res, 'Teacher assigned to subject successfully.', assignment);
  }

  static async getTeacherAssignments(req: Request, res: Response) {
    const filters = {
      teacherId: req.query.teacherId ? String(req.query.teacherId) : (req.user?.role === 'TEACHER' ? String(req.user._id) : undefined),
      departmentId: req.query.departmentId ? String(req.query.departmentId) : (req.user?.role === 'HOD' ? String(req.user.department) : undefined),
      semesterId: req.query.semesterId ? String(req.query.semesterId) : undefined,
      subjectId: req.query.subjectId ? String(req.query.subjectId) : undefined,
    };
    const assignments = await AcademicService.getTeacherAssignments(filters);
    ApiResponse.ok(res, 'Teacher assignments retrieved successfully.', assignments);
  }

  static async removeTeacherAssignment(req: Request, res: Response) {
    const id = String(req.params.id);
    const result = await AcademicService.removeTeacherAssignment(id, req.user);
    ApiResponse.ok(res, result.message);
  }

  // ─── FACULTY REVIEW ───

  static async reviewFaculty(req: Request, res: Response) {
    const departmentId = String(req.params.id);
    const teacherId = String(req.params.teacherId);
    const input = req.validated?.body as any;
    const teacher = await AcademicService.reviewFaculty(
      departmentId,
      teacherId,
      String(req.user!._id),
      input
    );
    ApiResponse.ok(res, `Teacher registration ${input.status.toLowerCase()} successfully.`, teacher);
  }

  // ─── STUDENT ENROLLMENT & HISTORY ───

  static async getEnrollments(req: Request, res: Response) {
    const filters = {
      departmentId: req.query.departmentId ? String(req.query.departmentId) : (req.user?.role === 'HOD' ? String(req.user.department) : undefined),
      status: req.query.status ? String(req.query.status) : undefined,
      studentId: req.user?.role === 'STUDENT' ? String(req.user._id) : (req.query.studentId ? String(req.query.studentId) : undefined),
    };
    const enrollments = await AcademicService.getEnrollments(filters);
    ApiResponse.ok(res, 'Enrollment records retrieved successfully.', enrollments);
  }

  static async getStudentAcademicHistory(req: Request, res: Response) {
    const departmentId = String(req.params.id);
    const studentId = String(req.params.studentId);
    const history = await AcademicService.getStudentAcademicHistory(departmentId, studentId);
    ApiResponse.ok(res, 'Student academic history retrieved successfully.', history);
  }

  static async requestEnrollment(req: Request, res: Response) {
    const input = req.validated?.body as any;
    const enrollment = await AcademicService.requestEnrollment(String(req.user!._id), input);
    ApiResponse.created(res, 'Enrollment request submitted successfully.', enrollment);
  }

  static async reviewEnrollment(req: Request, res: Response) {
    const id = String(req.params.id);
    const input = req.validated?.body as any;
    const enrollment = await AcademicService.reviewEnrollment(
      id,
      String(req.user!._id),
      input
    );
    ApiResponse.ok(res, `Enrollment request ${enrollment.status.toLowerCase()} successfully.`, enrollment);
  }

  // ─── STUDENT ACADEMIC EXPERIENCE (MODULE 06) ───

  static async getStudentDashboardOverview(req: Request, res: Response) {
    const studentId = String(req.user!._id);
    const overview = await AcademicService.getStudentDashboardOverview(studentId);
    ApiResponse.ok(res, 'Student dashboard overview retrieved successfully.', overview);
  }

  static async getStudentSemesterArchive(req: Request, res: Response) {
    const studentId = String(req.user!._id);
    const archive = await AcademicService.getStudentSemesterArchive(studentId);
    ApiResponse.ok(res, 'Student previous semesters archive retrieved successfully.', archive);
  }

  static async getNextAvailableSemester(req: Request, res: Response) {
    const studentId = String(req.user!._id);
    const nextSem = await AcademicService.getNextAvailableSemester(studentId);
    ApiResponse.ok(res, 'Next available semester retrieved successfully.', nextSem);
  }

  static async getSubjectWorkspace(req: Request, res: Response) {
    const studentId = String(req.user!._id);
    const subjectId = String(req.params.id);
    const workspace = await AcademicService.getSubjectWorkspace(studentId, subjectId);
    ApiResponse.ok(res, 'Subject workspace retrieved successfully.', workspace);
  }

  static async solveSubjectAIDoubt(req: Request, res: Response) {
    const studentId = String(req.user!._id);
    const subjectId = String(req.params.id);
    const { query } = req.validated?.body as { query: string };
    const solution = await AcademicService.solveSubjectAIDoubt(studentId, subjectId, query);
    ApiResponse.ok(res, 'AI doubt solution generated successfully.', solution);
  }

  static async executeSubjectAiQuery(req: Request, res: Response) {
    const userId = String(req.user!._id);
    const role = req.user!.role;
    const department = req.user!.department;
    const subjectId = String(req.params.id || req.body?.subjectId);
    const question = req.body?.question || req.body?.query;
    const chapter = req.body?.chapter;

    const result = await AcademicService.executeSubjectAiQuery(
      userId,
      role,
      department,
      subjectId,
      question,
      chapter
    );
    ApiResponse.ok(res, 'AI query executed successfully.', result);
  }

  static async getSubjectAiLogs(req: Request, res: Response) {
    const userId = String(req.user!._id);
    const role = req.user!.role;
    const department = req.user!.department;
    const subjectId = String(req.params.id);
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const logs = await AcademicService.getSubjectAiLogs(
      userId,
      role,
      department,
      subjectId,
      limit
    );
    ApiResponse.ok(res, 'AI query logs retrieved successfully.', logs);
  }

  // ─── TEACHER DASHBOARD & WORKSPACE (MODULE 07) ───

  static async getTeacherDashboardOverview(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const overview = await AcademicService.getTeacherDashboardOverview(teacherId);
    ApiResponse.ok(res, 'Teacher dashboard overview retrieved successfully.', overview);
  }

  static async getTeacherAssignedSubjects(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const result = await AcademicService.getTeacherAssignedSubjects(teacherId);
    ApiResponse.ok(res, 'Teacher assigned subjects retrieved successfully.', result);
  }

  static async getTeacherSubjectWorkspace(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const subjectId = String(req.params.id);
    const workspace = await AcademicService.getTeacherSubjectWorkspace(teacherId, subjectId);
    ApiResponse.ok(res, 'Teacher subject workspace retrieved successfully.', workspace);
  }

  static async getTeacherSubjectStudentsProgress(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const subjectId = String(req.params.id);
    const progress = await AcademicService.getTeacherSubjectStudentsProgress(teacherId, subjectId);
    ApiResponse.ok(res, 'Enrolled students progress retrieved successfully.', progress);
  }

  static async getTeacherSubjectCurriculum(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const subjectId = String(req.params.id);
    const curriculum = await AcademicService.getTeacherSubjectCurriculum(teacherId, subjectId);
    ApiResponse.ok(res, 'Subject curriculum retrieved successfully.', curriculum);
  }

  static async saveTeacherSubjectCurriculum(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const subjectId = String(req.params.id);
    const unitNumber = parseInt(String(req.params.unitNumber), 10);
    const content = await AcademicService.saveTeacherSubjectCurriculum(teacherId, subjectId, unitNumber, req.body);
    ApiResponse.ok(res, `Unit ${unitNumber} teaching content saved successfully.`, content);
  }

  static async getTeacherKnowledgeBaseStats(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const subjectId = String(req.params.id);
    const stats = await AcademicService.getTeacherKnowledgeBaseStats(teacherId, subjectId);
    ApiResponse.ok(res, 'Knowledge base statistics retrieved successfully.', stats);
  }

  static async createSubjectContent(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const subjectId = String(req.params.id);
    const input = req.validated?.body as any;
    const content = await AcademicService.createSubjectContent(teacherId, subjectId, input);
    ApiResponse.created(res, `${input.contentType} created successfully.`, content);
  }

  static async updateSubjectContent(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const subjectId = String(req.params.id);
    const contentId = String(req.params.contentId);
    const input = req.validated?.body as any;
    const content = await AcademicService.updateSubjectContent(teacherId, subjectId, contentId, input);
    ApiResponse.ok(res, 'Content updated successfully.', content);
  }

  static async deleteSubjectContent(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const subjectId = String(req.params.id);
    const contentId = String(req.params.contentId);
    const result = await AcademicService.deleteSubjectContent(teacherId, subjectId, contentId);
    ApiResponse.ok(res, result.message, result);
  }

  static async createTeacherAssignment(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const subjectId = String(req.params.id);
    const input = req.validated?.body as any;
    const assignment = await AcademicService.createTeacherAssignment(teacherId, subjectId, input);
    ApiResponse.created(res, 'Assignment created successfully.', assignment);
  }

  static async gradeStudentSubmission(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const input = req.validated?.body as any;
    const grade = await AcademicService.gradeStudentSubmission(teacherId, input);
    ApiResponse.ok(res, 'Submission graded successfully.', grade);
  }

  static async recordSubjectAttendance(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const subjectId = String(req.params.id);
    const input = req.validated?.body as any;
    const result = await AcademicService.recordSubjectAttendance(teacherId, subjectId, input);
    ApiResponse.created(res, 'Attendance session recorded successfully.', result);
  }

  // ─── SMART BOARD PORTAL INTEGRATION ───

  static async createSmartBoardSession(req: Request, res: Response) {
    const userId = String(req.user!._id);
    const role = req.user!.role;
    const subjectId = String(req.params.id || req.body?.subjectId);
    const initialResource = req.body?.initialResource;
    const focus = AcademicController.parseSmartBoardFocus(req.body?.focus ?? req.body);

    const session = await AcademicService.createSmartBoardSession(
      userId,
      role,
      subjectId,
      initialResource,
      focus
    );
    ApiResponse.created(res, 'Smart Board session initialized successfully.', session);
  }

  static async getSmartBoardContext(req: Request, res: Response) {
    const userId = String(req.user!._id);
    const role = req.user!.role;
    const subjectId = String(req.params.id || req.params.subjectId);
    const focus = AcademicController.parseSmartBoardFocus(req.query as any);

    const context = await AcademicService.getSmartBoardContext(userId, role, subjectId, focus);
    ApiResponse.ok(res, 'Smart Board academic context retrieved successfully.', context);
  }

  /** Optional unit/topic the teacher is launching the Smart Board for. */
  private static parseSmartBoardFocus(src: any): { unitNumber?: number; topic?: string } | undefined {
    if (!src || typeof src !== 'object') return undefined;
    const unitNumber = Number(src.unitNumber ?? src.unit);
    const topic = typeof src.topic === 'string' ? src.topic.trim().slice(0, 200) : undefined;
    const focus: { unitNumber?: number; topic?: string } = {};
    if (Number.isInteger(unitNumber) && unitNumber >= 1 && unitNumber <= 20) focus.unitNumber = unitNumber;
    if (topic) focus.topic = topic;
    return Object.keys(focus).length ? focus : undefined;
  }

  static async shareSmartBoardNotes(req: Request, res: Response) {
    const userId = String(req.user!._id);
    const role = req.user!.role;
    const result = await AcademicService.shareSmartBoardNotes(userId, role, req.body);
    ApiResponse.created(res, result.message, result);
  }

  // ─── SIMULATION MANAGEMENT ───

  static async getAvailableSimulations(req: Request, res: Response) {
    const subjectId = String(req.params.id || req.params.subjectId);
    const data = await AcademicService.getAvailableSimulationsForSubject(subjectId);
    ApiResponse.ok(res, 'Available domain simulation templates retrieved successfully.', data);
  }

  static async getSubjectSimulations(req: Request, res: Response) {
    const subjectId = String(req.params.id || req.params.subjectId);
    const role = req.user!.role;
    const data = await AcademicService.getSubjectSimulations(subjectId, role);
    ApiResponse.ok(res, 'Subject simulations retrieved successfully.', data);
  }

  static async recordSimulationActivity(req: Request, res: Response) {
    const studentId = String(req.user!._id);
    const subjectId = String(req.params.id);
    const simulationId = String(req.params.simulationId);
    const input = req.validated?.body as { event: 'OPENED' | 'COMPLETED'; topic?: string };
    const result = await AcademicService.recordSimulationActivity(
      studentId,
      subjectId,
      simulationId,
      input.event,
      input.topic
    );
    ApiResponse.ok(res, 'Simulation activity recorded successfully.', result);
  }

  static async submitSimulationChallenge(req: Request, res: Response) {
    const result = await AcademicService.submitSimulationChallenge(
      String(req.user!._id),
      String(req.params.id),
      String(req.params.simulationId),
      req.validated?.body as any
    );
    ApiResponse.created(res, result.result === 'CORRECT' ? 'Correct — challenge attempt saved.' : 'Challenge attempt saved.', result);
  }

  static async getSimulationChallengeAttempts(req: Request, res: Response) {
    const data = await AcademicService.getSimulationChallengeAttempts(
      String(req.params.id),
      String(req.params.simulationId),
      { id: String(req.user!._id), role: req.user!.role }
    );
    ApiResponse.ok(res, 'Challenge attempts retrieved successfully.', data);
  }

  static async assignSimulation(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const subjectId = String(req.params.id || req.params.subjectId);
    const payload = req.body;

    const assigned = await AcademicService.assignSimulationToSubject(teacherId, subjectId, payload);
    ApiResponse.created(res, 'Simulation successfully assigned to subject chapter.', assigned);
  }

  static async toggleSimulationStatus(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const subjectId = String(req.params.id || req.params.subjectId);
    const simulationId = String(req.params.simulationId);
    const status = req.body.status;

    const updated = await AcademicService.toggleSimulationStatus(teacherId, subjectId, simulationId, status);
    ApiResponse.ok(res, `Simulation ${status === 'PUBLISHED' ? 'enabled' : 'disabled'} successfully.`, updated);
  }

  static async deleteSimulation(req: Request, res: Response) {
    const teacherId = String(req.user!._id);
    const subjectId = String(req.params.id || req.params.subjectId);
    const simulationId = String(req.params.simulationId);

    const result = await AcademicService.deleteSimulationAssignment(teacherId, subjectId, simulationId);
    ApiResponse.ok(res, 'Simulation removed from subject.', result);
  }

  // ─── CURRICULUM TREE & ELECTIVES ───

  static async getCurriculumTree(req: Request, res: Response) {
    // Programme comes from ?programmeId= (or legacy ?departmentCode=), defaulting to
    // the signed-in user's own programme — never silently to another programme.
    const explicit =
      (req.query.programmeId ? String(req.query.programmeId) : undefined) ||
      (req.query.departmentCode ? String(req.query.departmentCode) : undefined);
    let programme;
    if (explicit) {
      programme = await ProgrammeService.resolveProgramme(explicit);
    } else {
      // Own programme; for faculty of a supporting department (e.g. Science &
      // Humanities) fall back to the first programme they teach in.
      const authorised = await ProgrammeService.getAuthorisedProgrammeIds(req.user as any);
      const candidates = authorised === 'ALL' ? ['IT'] : authorised;
      programme = undefined;
      for (const id of candidates) {
        programme = await ProgrammeService.resolveProgramme(id).catch(() => undefined);
        if (programme) break;
      }
      if (!programme) throw ApiError.notFound('No programme curriculum is available for your account.');
    }
    await ProgrammeService.assertProgrammeAccess(req.user as any, programme, 'catalog');
    const curriculum = await AcademicService.getCompleteCurriculumTree(programme.code);
    ApiResponse.ok(res, 'Curriculum hierarchy retrieved successfully.', curriculum);
  }

  static async getProfessionalElectives(req: Request, res: Response) {
    const verticalNumber = req.query.vertical ? Number(req.query.vertical) : undefined;
    const pecs = await AcademicService.getProfessionalElectives(verticalNumber);
    ApiResponse.ok(res, 'Professional electives retrieved successfully.', pecs);
  }

  static async getOpenElectives(req: Request, res: Response) {
    const semesterNumber = req.query.semester ? Number(req.query.semester) : undefined;
    const oecs = await AcademicService.getOpenElectives(semesterNumber);
    ApiResponse.ok(res, 'Open electives retrieved successfully.', oecs);
  }

  static async getCurriculumUnits(req: Request, res: Response) {
    const subjectId = String(req.params.id || req.params.subjectId);
    const units = await AcademicService.getCurriculumUnitsBySubject(subjectId);
    ApiResponse.ok(res, 'Curriculum units retrieved successfully.', units);
  }
}
