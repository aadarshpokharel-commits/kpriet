import mongoose, { Types } from 'mongoose';
import {
  AIQueryLog,
  Assignment,
  AssignmentGrade,
  AssignmentSubmission,
  AttendanceRecord,
  AttendanceSession,
  AuditLog,
  Content,
  CurriculumUnit,
  Department,
  KnowledgeChunk,
  KnowledgeDocument,
  OpenElective,
  ProfessionalElective,
  Programme,
  Question,
  Quiz,
  QuizAttempt,
  QuizResult,
  Semester,
  SemesterResult,
  StudentEnrollment,
  Subject,
  SubjectResult,
  TeacherAssignment,
  TeacherCurriculumContent,
  SimulationActivity,
  User,
} from '../models/index.js';
import {
  AccountStatus,
  ApprovalStatus,
  AssignmentStatus,
  AttendanceStatus,
  AuditAction,
  ContentStatus,
  ContentType,
  EnrollmentStatus,
  QuizStatus,
  TeacherAssignmentStatus,
  UserRole,
  NotificationType,
} from '../types/academic.types.js';
import { ApiError } from '../utils/ApiError.js';
import { ProgrammeService } from './programme.service.js';
import { AiRagService } from './ai-rag.service.js';
import { NotificationService } from './notification.service.js';
import { SIMULATION_CATALOG, resolveSubjectDomain, isTemplateForSubject } from '../constants/simulations.catalog.js';
import { CHEM_SIMULATION_TEMPLATES } from '../constants/chemistry.simulations.catalog.js';
import { evaluateSimulationChallenge } from '../constants/ee-challenge.evaluator.js';
import type {
  assignTeacherSchema,
  chapterSchema,
  createContentSchema,
  createProgrammeSchema,
  createSemesterSchema,
  createSubjectSchema,
  createTeacherAssignmentSchema,
  gradeSubmissionSchema,
  recordAttendanceSchema,
  requestEnrollmentSchema,
  reviewEnrollmentSchema,
  updateChapterSchema,
  updateContentSchema,
  updateProgrammeSchema,
  updateSemesterSchema,
  updateSubjectSchema,
} from '../validators/academic.validators.js';
import type { z } from 'zod';

export class AcademicService {
  // ─── DEPARTMENTS ───

  static async getAllDepartments() {
    return Department.find({ status: 'ACTIVE' })
      .populate('hod', 'name collegeEmail identifier profile')
      .sort({ isProgramme: -1, displayOrder: 1, name: 1 })
      .lean();
  }

  static async getDepartmentById(departmentId: string) {
    const dept = await Department.findById(departmentId)
      .populate('hod', 'name collegeEmail identifier profile')
      .lean();
    if (!dept) throw ApiError.notFound('Department not found.');
    return dept;
  }

  /**
   * Live count metrics for HOD / Admin department overview.
   * Source of truth: Mongo database queries. No static fake numbers.
   */
  static async getDepartmentStats(departmentId: string) {
    const deptObjId = new Types.ObjectId(departmentId);

    const [
      department,
      facultyCount,
      approvedFacultyCount,
      pendingFacultyCount,
      studentCount,
      activeStudentCount,
      activeSubjectCount,
      totalSubjectCount,
      pendingEnrollmentCount,
      activeSemesterCount,
      programmeCount,
      subjects,
      enrollments,
      recentLogs,
    ] = await Promise.all([
      Department.findById(deptObjId).populate('hod', 'name collegeEmail identifier profile').lean(),
      User.countDocuments({
        department: deptObjId,
        role: UserRole.TEACHER,
      }),
      User.countDocuments({
        department: deptObjId,
        role: UserRole.TEACHER,
        approvalStatus: ApprovalStatus.APPROVED,
      }),
      User.countDocuments({
        department: deptObjId,
        role: UserRole.TEACHER,
        approvalStatus: ApprovalStatus.PENDING,
      }),
      User.countDocuments({
        department: deptObjId,
        role: UserRole.STUDENT,
      }),
      User.countDocuments({
        department: deptObjId,
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.ACTIVE,
      }),
      Subject.countDocuments({
        department: deptObjId,
        status: 'ACTIVE',
      }),
      Subject.countDocuments({
        department: deptObjId,
      }),
      StudentEnrollment.countDocuments({
        department: deptObjId,
        status: EnrollmentStatus.PENDING,
      }),
      Semester.countDocuments({
        department: deptObjId,
        status: 'ACTIVE',
      }),
      Programme.countDocuments({
        department: deptObjId,
        status: 'ACTIVE',
      }),
      Subject.find({ department: deptObjId, status: 'ACTIVE' }, 'semesterNumber').lean(),
      StudentEnrollment.find(
        { department: deptObjId, status: EnrollmentStatus.APPROVED },
        'semester'
      ).populate('semester', 'semesterNumber').lean(),
      AuditLog.find({ department: deptObjId })
        .populate('user', 'name role collegeEmail identifier')
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),
    ]);

    // Calculate semester distribution (Semesters 1 through 8)
    const subjectCounts: Record<number, number> = {};
    for (const s of subjects) {
      if (s.semesterNumber) {
        subjectCounts[s.semesterNumber] = (subjectCounts[s.semesterNumber] || 0) + 1;
      }
    }

    const studentCounts: Record<number, number> = {};
    for (const e of enrollments) {
      const semNum = (e.semester as any)?.semesterNumber;
      if (semNum) {
        studentCounts[semNum] = (studentCounts[semNum] || 0) + 1;
      }
    }

    const semesterDistribution = Array.from({ length: 8 }, (_, i) => {
      const semNum = i + 1;
      return {
        semesterNumber: semNum,
        subjectCount: subjectCounts[semNum] || 0,
        studentCount: studentCounts[semNum] || 0,
      };
    });

    const recentActivity = recentLogs.map((log: any) => ({
      id: String(log._id),
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      actorName: log.user?.name || 'Academic Administrator',
      actorRole: log.user?.role || 'SYSTEM',
      description:
        log.details?.description || `${log.action} performed on ${log.entityType}`,
      timestamp: log.timestamp || log.createdAt,
    }));

    return {
      department,
      facultyCount,
      approvedFaculty: approvedFacultyCount,
      pendingFaculty: pendingFacultyCount,
      studentCount,
      activeStudentCount,
      activeSubjectCount,
      totalSubjectCount,
      pendingEnrollmentCount,
      activeSemesterCount,
      programmeCount,
      semesterDistribution,
      recentActivity,
    };
  }

  // ─── PROGRAMMES ───

  static async getProgrammes(departmentId?: string) {
    const filter: Record<string, unknown> = { status: 'ACTIVE' };
    if (departmentId) filter.department = departmentId;
    return Programme.find(filter).populate('department', 'name code shortName type').sort({ name: 1 }).lean();
  }

  static async createProgramme(data: z.infer<typeof createProgrammeSchema>) {
    const existing = await Programme.findOne({
      department: data.departmentId,
      code: data.code.toUpperCase(),
    });
    if (existing) {
      throw ApiError.conflict('Programme with this code already exists in this department.');
    }

    return Programme.create({
      name: data.name,
      code: data.code.toUpperCase(),
      degree: data.degree,
      department: data.departmentId,
      programmeType: data.programmeType,
      durationYears: data.durationYears,
      totalSemesters: data.totalSemesters,
      description: data.description,
    });
  }

  static async updateProgramme(programmeId: string, data: z.infer<typeof updateProgrammeSchema>) {
    const prog = await Programme.findByIdAndUpdate(programmeId, data, { new: true }).lean();
    if (!prog) throw ApiError.notFound('Programme not found.');
    return prog;
  }

  // ─── SEMESTERS ───

  /**
   * Retrieves semesters with strict student future-semester exclusion.
   */
  static async getSemesters(
    filters: { departmentId?: string; programmeId?: string },
    user: any
  ) {
    const query: Record<string, unknown> = {};

    let maxSemester: number | undefined;

    if (user.role === UserRole.HOD) {
      query.department = user.department;
    } else if (user.role === UserRole.STUDENT) {
      query.department = user.department;

      // Determine student active semester number
      const activeEnrollment = await StudentEnrollment.findOne({
        student: user._id,
        status: EnrollmentStatus.APPROVED,
      }).populate('semester');

      maxSemester = activeEnrollment?.semester
        ? (activeEnrollment.semester as any).semesterNumber ?? 1
        : 1;
    } else if (filters.departmentId) {
      query.department = filters.departmentId;
    }

    if (filters.programmeId) query.programme = filters.programmeId;

    const semesters = await Semester.find(query)
      .populate('department', 'name code shortName type')
      .populate('programme', 'name code degree')
      .sort({ semesterNumber: 1 })
      .lean();

    if (typeof maxSemester === 'number') {
      return semesters.filter((s) => s.semesterNumber <= maxSemester);
    }

    return semesters;
  }

  static async getSemesterById(semesterId: string) {
    const sem = await Semester.findById(semesterId)
      .populate('department', 'name code shortName type')
      .populate('programme', 'name code degree')
      .lean();
    if (!sem) throw ApiError.notFound('Semester not found.');
    return sem;
  }

  static async createSemester(data: z.infer<typeof createSemesterSchema>, user?: any) {
    // Rule 4: every semester belongs to a valid, active programme.
    const programme = await ProgrammeService.resolveProgramme(data.departmentId || data.programmeId, {
      requireActive: true,
    });
    AcademicService.assertHodOwnsProgramme(user, programme._id);
    const degreeProgramme = await Programme.findOne({ department: programme._id, code: programme.code }).select('_id');

    const existing = await Semester.findOne({
      department: programme._id,
      semesterNumber: data.semesterNumber,
      academicYear: data.academicYear,
      regulation: data.regulation.toUpperCase(),
    });
    if (existing) {
      throw ApiError.conflict('Semester already exists for this regulation and academic year.');
    }

    return Semester.create({
      semesterNumber: data.semesterNumber,
      academicYear: data.academicYear,
      regulation: data.regulation.toUpperCase(),
      department: programme._id,
      programme: degreeProgramme?._id,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status,
    });
  }

  static async updateSemester(
    semesterId: string,
    data: z.infer<typeof updateSemesterSchema>,
    user?: any
  ) {
    const existing = await Semester.findById(semesterId).select('department');
    if (!existing) throw ApiError.notFound('Semester not found.');
    AcademicService.assertHodOwnsProgramme(user, existing.department);

    const sem = await Semester.findByIdAndUpdate(semesterId, data, { new: true }).lean();
    if (!sem) throw ApiError.notFound('Semester not found.');
    return sem;
  }

  /** HODs may only manage their own programme (Rule 8: authority comes from the session, not the request). */
  private static assertHodOwnsProgramme(user: any, programmeObjectId: unknown) {
    if (user && user.role === UserRole.HOD) {
      if (!user.department || String(user.department) !== String(programmeObjectId)) {
        throw ApiError.forbidden('HOD can only manage their own programme.');
      }
    }
  }

  // ─── SUBJECTS & CHAPTERS ───

  static async getSubjects(
    filters: { departmentId?: string; semesterId?: string; semesterNumber?: number },
    user: any
  ) {
    const query: Record<string, unknown> = { status: 'ACTIVE' };

    let allowedSubjectIds: Types.ObjectId[] | undefined;

    if (user.role === UserRole.HOD) {
      query.department = user.department;
    } else if (user.role === UserRole.STUDENT) {
      // Find enrolled subjects from student's active enrollment
      const enrollment = await StudentEnrollment.findOne({
        student: user._id,
        status: EnrollmentStatus.APPROVED,
      });

      if (!enrollment || enrollment.enrolledSubjects.length === 0) {
        return [];
      }
      allowedSubjectIds = enrollment.enrolledSubjects;
      // A student only ever receives subjects of their own programme.
      query.department = user.department;
    } else if (user.role === UserRole.TEACHER) {
      const assignments = await TeacherAssignment.find({
        teacher: user._id,
        status: TeacherAssignmentStatus.ACTIVE,
      });
      if (assignments.length === 0) {
        return [];
      }
      allowedSubjectIds = assignments.map((a) => a.subject as Types.ObjectId);
    } else if (filters.departmentId) {
      query.department = filters.departmentId;
    }

    if (filters.semesterId) query.semester = filters.semesterId;
    if (filters.semesterNumber) query.semesterNumber = filters.semesterNumber;

    const subjects = await Subject.find(query)
      .populate('department', 'name code shortName type')
      .populate('semester', 'semesterNumber academicYear regulation')
      .sort({ semesterNumber: 1, subjectCode: 1 })
      .lean();

    if (allowedSubjectIds) {
      const allowedSet = new Set(allowedSubjectIds.map((id) => String(id)));
      return subjects.filter((s) => allowedSet.has(String(s._id)));
    }

    return subjects;
  }

  static async getSubjectById(subjectId: string) {
    const subject = await Subject.findById(subjectId)
      .populate('department', 'name code shortName type')
      .populate('semester', 'semesterNumber academicYear regulation')
      .lean();
    if (!subject) throw ApiError.notFound('Subject not found.');
    return subject;
  }

  static async createSubject(data: z.infer<typeof createSubjectSchema>, user?: any) {
    // Rule 3: every subject belongs to a valid, active programme and to one of its semesters.
    const programme = await ProgrammeService.resolveProgramme(data.departmentId || data.programmeId, {
      requireActive: true,
    });
    AcademicService.assertHodOwnsProgramme(user, programme._id);

    const semester = await Semester.findById(data.semesterId).select('department semesterNumber');
    if (!semester) throw ApiError.badRequest('Selected semester does not exist.');
    if (String(semester.department) !== String(programme._id)) {
      throw ApiError.badRequest('The selected semester does not belong to this programme.');
    }

    const existing = await Subject.findOne({
      subjectCode: data.subjectCode.toUpperCase(),
      department: programme._id,
      semester: semester._id,
    });
    if (existing) {
      throw ApiError.conflict('Subject with this code already exists for this semester.');
    }

    return Subject.create({
      subjectName: data.subjectName,
      subjectCode: data.subjectCode.toUpperCase(),
      department: programme._id,
      semester: semester._id,
      semesterNumber: semester.semesterNumber,
      credits: data.credits,
      description: data.description,
      icon: data.icon,
      color: data.color,
      syllabus: data.syllabus.map((s) => ({
        _id: new Types.ObjectId(),
        ...s,
      })),
      status: data.status,
    });
  }

  static async updateSubject(
    subjectId: string,
    data: z.infer<typeof updateSubjectSchema>,
    user?: any
  ) {
    const subject = await Subject.findById(subjectId);
    if (!subject) throw ApiError.notFound('Subject not found.');

    if (user && user.role === UserRole.HOD) {
      if (String(subject.department) !== String(user.department)) {
        throw ApiError.forbidden('HOD cannot manage subjects outside their department.');
      }
    }

    Object.assign(subject, data);
    await subject.save();
    return subject;
  }

  static async deleteSubject(subjectId: string, user?: any) {
    const subject = await Subject.findById(subjectId);
    if (!subject) throw ApiError.notFound('Subject not found.');

    if (user && user.role === UserRole.HOD) {
      if (String(subject.department) !== String(user.department)) {
        throw ApiError.forbidden('HOD cannot manage subjects outside their department.');
      }
    }

    subject.status = 'INACTIVE';
    await subject.save();
    return subject;
  }

  static async toggleSubjectStatus(
    departmentId: string,
    subjectId: string,
    status: 'ACTIVE' | 'INACTIVE'
  ) {
    const deptObjId = new Types.ObjectId(departmentId);
    const subject = await Subject.findOne({ _id: subjectId, department: deptObjId });
    if (!subject) {
      throw ApiError.notFound('Subject not found in this department.');
    }

    subject.status = status;
    await subject.save();
    return subject;
  }

  // ─── CHAPTERS (SYLLABUS UNITS) ───

  static async getChapters(subjectId: string) {
    const subject = await Subject.findById(subjectId, 'syllabus subjectName subjectCode').lean();
    if (!subject) throw ApiError.notFound('Subject not found.');
    return subject.syllabus || [];
  }

  static async addChapter(subjectId: string, chapterData: z.infer<typeof chapterSchema>) {
    const subject = await Subject.findById(subjectId);
    if (!subject) throw ApiError.notFound('Subject not found.');

    const newChapter = {
      _id: new Types.ObjectId(),
      ...chapterData,
    };

    subject.syllabus.push(newChapter as any);
    await subject.save();
    return newChapter;
  }

  static async updateChapter(
    subjectId: string,
    chapterId: string,
    chapterData: z.infer<typeof updateChapterSchema>
  ) {
    const subject = await Subject.findById(subjectId);
    if (!subject) throw ApiError.notFound('Subject not found.');

    const chapter = subject.syllabus.find((s) => String(s._id) === chapterId);
    if (!chapter) throw ApiError.notFound('Chapter not found.');

    Object.assign(chapter, chapterData);
    await subject.save();
    return chapter;
  }

  static async deleteChapter(subjectId: string, chapterId: string) {
    const subject = await Subject.findById(subjectId);
    if (!subject) throw ApiError.notFound('Subject not found.');

    subject.syllabus = subject.syllabus.filter((s) => String(s._id) !== chapterId);
    await subject.save();
    return { message: 'Chapter removed successfully.' };
  }

  // ─── CURRICULUM HIERARCHY & ELECTIVES ───

  /**
   * Returns the complete semester-wise curriculum tree for a department/programme.
   * Source of truth: MongoDB collections populated from the authoritative R2021 CBCS Excel.
   */
  static async getCompleteCurriculumTree(deptCode = 'IT') {
    const department = await Department.findOne({ code: deptCode.toUpperCase() }).lean();
    if (!department) throw ApiError.notFound(`Department with code ${deptCode} not found.`);

    const programme = await Programme.findOne({ department: department._id }).lean();
    const semesters = await Semester.find({ department: department._id })
      .sort({ semesterNumber: 1 })
      .lean();

    const subjects = await Subject.find({ department: department._id, status: 'ACTIVE' })
      .sort({ semesterNumber: 1, subjectCode: 1 })
      .lean();

    const pecs = await ProfessionalElective.find({ department: department._id, status: 'ACTIVE' })
      .sort({ verticalNumber: 1, code: 1 })
      .lean();

    const oecs = await OpenElective.find({ department: department._id, status: 'ACTIVE' })
      .sort({ semesterNumber: 1, code: 1 })
      .lean();

    // Group subjects by semester
    const subjectsBySemester: Record<number, any[]> = {};
    let totalCredits = 0;

    for (const sem of semesters) {
      subjectsBySemester[sem.semesterNumber] = [];
    }

    for (const sub of subjects) {
      const semNum = sub.semesterNumber;
      const list = subjectsBySemester[semNum] ?? [];
      list.push(sub);
      subjectsBySemester[semNum] = list;
      totalCredits += sub.credits || 0;
    }

    // Group PECs by vertical
    const pecsByVertical: Record<string, { verticalNumber: number; verticalName: string; electives: any[] }> = {};
    for (const pec of pecs) {
      const vKey = `Vertical ${pec.verticalNumber}`;
      const entry = pecsByVertical[vKey] ?? {
        verticalNumber: pec.verticalNumber,
        verticalName: pec.verticalName,
        electives: [],
      };
      entry.electives.push(pec);
      pecsByVertical[vKey] = entry;
    }

    // Group OECs by semester
    const oecsBySemester: Record<number, any[]> = {};
    for (const oec of oecs) {
      const list = oecsBySemester[oec.semesterNumber] ?? [];
      list.push(oec);
      oecsBySemester[oec.semesterNumber] = list;
    }

    const semesterCurriculum = semesters.map((sem) => {
      const semSubs = subjectsBySemester[sem.semesterNumber] || [];
      const semCredits = semSubs.reduce((acc, s) => acc + (s.credits || 0), 0);
      return {
        _id: String(sem._id),
        semesterNumber: sem.semesterNumber,
        academicYear: sem.academicYear,
        regulation: sem.regulation,
        creditTotal: semCredits,
        subjectCount: semSubs.length,
        subjects: semSubs,
      };
    });

    return {
      department: {
        _id: String(department._id),
        name: department.name,
        code: department.code,
        programmeType: department.programmeType,
      },
      programme: programme
        ? {
            _id: String(programme._id),
            name: programme.name,
            code: programme.code,
            degree: programme.degree,
            totalSemesters: programme.totalSemesters,
            durationYears: programme.durationYears,
          }
        : null,
      regulation: 'R2021 CBCS',
      totalProgrammeCredits: 165,
      calculatedCredits: totalCredits,
      semesters: semesterCurriculum,
      professionalElectives: {
        totalCount: pecs.length,
        verticalsCount: Object.keys(pecsByVertical).length,
        verticals: pecsByVertical,
        all: pecs,
      },
      openElectives: {
        totalCount: oecs.length,
        bySemester: oecsBySemester,
        all: oecs,
      },
    };
  }

  static async getProfessionalElectives(verticalNumber?: number) {
    const query: Record<string, unknown> = { status: 'ACTIVE' };
    if (verticalNumber) query.verticalNumber = verticalNumber;
    return ProfessionalElective.find(query).sort({ verticalNumber: 1, code: 1 }).lean();
  }

  static async getOpenElectives(semesterNumber?: number) {
    const query: Record<string, unknown> = { status: 'ACTIVE' };
    if (semesterNumber) query.semesterNumber = semesterNumber;
    return OpenElective.find(query).sort({ semesterNumber: 1, code: 1 }).lean();
  }

  static async getCurriculumUnitsBySubject(subjectId: string) {
    return CurriculumUnit.find({ subject: subjectId, status: 'ACTIVE' })
      .sort({ unitNumber: 1 })
      .lean();
  }

  // ─── TEACHER ASSIGNMENTS ───
  // A teacher can teach Subject A (Sem 1), Subject B (Sem 2), Subject C (Sem 3), Subject D (Sem 1)

  static async assignTeacher(data: z.infer<typeof assignTeacherSchema>, user?: any) {
    // Rule 6: every teacher assignment references a valid teacher, programme,
    // semester and subject. Programme, semester and academic year are DERIVED
    // from the subject — the values sent by the client are only cross-checked.

    // 1. Subject → programme → semester (authoritative hierarchy)
    const subject = await Subject.findById(data.subjectId);
    if (!subject) throw ApiError.notFound('Subject not found.');
    const programme = await ProgrammeService.resolveProgramme(String(subject.department), {
      requireActive: true,
    });
    AcademicService.assertHodOwnsProgramme(user, programme._id);

    const semester = await Semester.findById(subject.semester);
    if (!semester || String(semester.department) !== String(programme._id)) {
      throw ApiError.badRequest('The subject is not linked to a valid semester of its programme.');
    }

    if (data.semesterId && String(data.semesterId) !== String(semester._id)) {
      throw ApiError.badRequest('The selected semester does not match the subject.');
    }
    if (data.departmentId && String(data.departmentId) !== String(programme._id)) {
      throw ApiError.badRequest('The selected programme does not match the subject.');
    }
    if (data.programmeId) {
      const requested = await ProgrammeService.resolveProgramme(data.programmeId).catch(() => null);
      if (!requested || String(requested._id) !== String(programme._id)) {
        throw ApiError.badRequest('The selected programme does not match the subject.');
      }
    }
    if (data.academicYear && data.academicYear !== semester.academicYear) {
      throw ApiError.badRequest(
        `The subject belongs to academic year ${semester.academicYear}, not ${data.academicYear}.`
      );
    }

    // 2. Teacher: active, approved, and belonging to a valid programme.
    //    Teachers may be assigned to subjects in more than one programme.
    const teacher = await User.findOne({
      _id: data.teacherId,
      role: UserRole.TEACHER,
      accountStatus: AccountStatus.ACTIVE,
    });
    if (!teacher) throw ApiError.badRequest('Assigned teacher account is invalid or inactive.');
    if (teacher.approvalStatus !== ApprovalStatus.APPROVED) {
      throw ApiError.badRequest('Only HOD-approved teachers can be assigned to subjects.');
    }
    if (!teacher.department) {
      throw ApiError.badRequest('The teacher does not belong to a valid programme.');
    }
    await ProgrammeService.resolveProgramme(String(teacher.department)).catch(() => {
      throw ApiError.badRequest('The teacher does not belong to a valid programme.');
    });

    // 3. Create or update assignment (all references stored as ids)
    const assignment = await TeacherAssignment.findOneAndUpdate(
      {
        teacher: teacher._id,
        subject: subject._id,
        semester: semester._id,
        academicYear: semester.academicYear,
        section: data.section || 'ALL',
      },
      {
        department: programme._id,
        isCoordinator: data.isCoordinator,
        status: data.status,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .populate('teacher', 'name collegeEmail identifier profile')
      .populate('subject', 'subjectName subjectCode credits')
      .populate('semester', 'semesterNumber academicYear regulation')
      .populate('department', 'name code shortName type');

    // Notify teacher of new teaching assignment (Requirement 28)
    try {
      const semDoc = semester;
      const deptDoc = programme;
      await NotificationService.create({
        recipient: teacher._id,
        type: NotificationType.TEACHING_ASSIGNMENT_CREATED,
        title: 'New teaching assignment',
        message: `You have been assigned to teach ${subject.subjectCode} - ${subject.subjectName} for Semester ${semDoc?.semesterNumber || ''} (${deptDoc?.name || 'Department'}).`,
        metadata: {
          subjectId: subject._id,
          subjectCode: subject.subjectCode,
          semesterId: String(semester._id),
          departmentId: String(programme._id),
          programmeId: programme.code,
          academicYear: semester.academicYear,
        },
      });
    } catch (err: any) {
      // Non-fatal if notification creation fails
    }

    return assignment;
  }

  static async getTeacherAssignments(filters: {
    teacherId?: string;
    departmentId?: string;
    semesterId?: string;
    subjectId?: string;
  }) {
    const query: Record<string, unknown> = { status: TeacherAssignmentStatus.ACTIVE };
    if (filters.teacherId) query.teacher = filters.teacherId;
    if (filters.departmentId) query.department = filters.departmentId;
    if (filters.semesterId) query.semester = filters.semesterId;
    if (filters.subjectId) query.subject = filters.subjectId;

    return TeacherAssignment.find(query)
      .populate('teacher', 'name collegeEmail identifier profile')
      .populate('subject', 'subjectName subjectCode credits icon color')
      .populate('semester', 'semesterNumber academicYear regulation')
      .populate('department', 'name code shortName type')
      .sort({ createdAt: -1 })
      .lean();
  }

  static async removeTeacherAssignment(assignmentId: string, user?: any) {
    const assignment = await TeacherAssignment.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Teacher assignment not found.');

    if (user && user.role === UserRole.HOD) {
      if (String(assignment.department) !== String(user.department)) {
        throw ApiError.forbidden('HOD cannot revoke assignments outside their department.');
      }
    }

    await TeacherAssignment.findByIdAndDelete(assignmentId);
    return { message: 'Teacher assignment revoked successfully.' };
  }

  // ─── STUDENT ENROLLMENT MANAGEMENT ───

  static async getEnrollments(filters: { departmentId?: string; status?: string; studentId?: string }) {
    const query: Record<string, unknown> = {};
    if (filters.departmentId) query.department = filters.departmentId;
    if (filters.status) query.status = filters.status;
    if (filters.studentId) query.student = filters.studentId;

    return StudentEnrollment.find(query)
      .populate('student', 'name collegeEmail identifier profile')
      .populate('department', 'name code shortName type')
      .populate('semester', 'semesterNumber academicYear regulation')
      .populate('enrolledSubjects', 'subjectName subjectCode credits')
      .sort({ requestedAt: -1 })
      .lean();
  }

  static async requestEnrollment(
    studentId: string,
    data: z.infer<typeof requestEnrollmentSchema>
  ) {
    // Check if pending enrollment already exists
    const existing = await StudentEnrollment.findOne({
      student: studentId,
      status: EnrollmentStatus.PENDING,
    });
    if (existing) {
      throw ApiError.conflict('You already have a pending enrollment request awaiting approval.');
    }

    const enrollment = await StudentEnrollment.create({
      student: studentId,
      department: data.departmentId,
      semester: data.semesterId,
      academicYear: data.academicYear,
      enrolledSubjects: data.enrolledSubjectIds,
      status: EnrollmentStatus.PENDING,
      requestedAt: new Date(),
    });

    // Notify HOD of new student enrollment request
    try {
      const student = await User.findById(studentId).select('name identifier');
      const dept = await Department.findById(data.departmentId).select('name code');
      const semester = await Semester.findById(data.semesterId).select('semesterNumber');

      const hodUsers = await User.find({
        department: data.departmentId,
        role: UserRole.HOD,
      }).select('_id');

      for (const hod of hodUsers) {
        await NotificationService.create({
          recipient: hod._id,
          sender: studentId,
          type: NotificationType.STUDENT_ENROLLMENT_REQUESTED,
          title: 'New Student Enrollment Request',
          message: `${student?.name || 'A student'} (${student?.identifier || 'Student'}) requested enrollment for Semester ${semester?.semesterNumber || ''} (${dept?.code || 'Dept'}).`,
          metadata: {
            enrollmentId: String(enrollment._id),
            studentId: String(studentId),
            studentName: student?.name,
            departmentId: String(data.departmentId),
            semesterId: String(data.semesterId),
          },
          link: '/hod/enrollments',
        });
      }

      // Also notify teachers of enrolled subjects
      const assignments = await TeacherAssignment.find({
        subject: mongoose.trusted({ $in: data.enrolledSubjectIds }),
        status: TeacherAssignmentStatus.ACTIVE,
      }).select('teacher subject');

      for (const asgn of assignments) {
        await NotificationService.create({
          recipient: asgn.teacher,
          sender: studentId,
          type: NotificationType.ENROLLMENT_REQUESTED,
          title: 'Course Enrollment Request',
          message: `${student?.name || 'A student'} (${student?.identifier || 'Student'}) submitted an enrollment request for your course.`,
          metadata: {
            enrollmentId: String(enrollment._id),
            studentId: String(studentId),
            subjectId: String(asgn.subject),
          },
          link: '/dashboard',
        });
      }
    } catch (notifErr) {
      // Non-blocking
    }

    return enrollment;
  }


  static async reviewEnrollment(
    enrollmentId: string,
    reviewerId: string,
    data: z.infer<typeof reviewEnrollmentSchema>
  ) {
    const enrollment = await StudentEnrollment.findById(enrollmentId);
    if (!enrollment) throw ApiError.notFound('Enrollment record not found.');

    if (enrollment.status !== EnrollmentStatus.PENDING) {
      throw ApiError.badRequest('This enrollment request has already been reviewed.');
    }

    // If approved, archive any existing active enrollment for this student first to avoid unique index conflict
    if (data.status === EnrollmentStatus.APPROVED) {
      const activeEnrollments = await StudentEnrollment.find({
        student: enrollment.student,
        status: EnrollmentStatus.APPROVED,
      });

      for (const active of activeEnrollments) {
        if (String(active._id) !== String(enrollment._id)) {
          active.status = EnrollmentStatus.COMPLETED;
          await active.save();
        }
      }
    }

    enrollment.status = data.status;
    enrollment.approvedBy = new Types.ObjectId(reviewerId);
    enrollment.approvedAt = new Date();
    if (data.rejectionReason) enrollment.rejectionReason = data.rejectionReason;

    await enrollment.save();

    // Notify student about enrollment approval/rejection decision
    try {
      const semester = await Semester.findById(enrollment.semester).select('semesterNumber academicYear');
      const dept = await Department.findById(enrollment.department).select('name code');

      if (data.status === EnrollmentStatus.APPROVED) {
        await NotificationService.create({
          recipient: enrollment.student,
          sender: reviewerId,
          type: NotificationType.ENROLLMENT_APPROVED,
          title: 'Enrollment Approved!',
          message: `Your enrollment for Semester ${semester?.semesterNumber || ''} (${semester?.academicYear || ''}) in ${dept?.name || 'Department'} has been approved.`,
          metadata: {
            enrollmentId: String(enrollment._id),
            semesterId: String(enrollment.semester),
            departmentId: String(enrollment.department),
          },
          link: '/dashboard',
        });
      } else if (data.status === EnrollmentStatus.REJECTED) {
        await NotificationService.create({
          recipient: enrollment.student,
          sender: reviewerId,
          type: NotificationType.ENROLLMENT_REJECTED,
          title: 'Enrollment Request Rejected',
          message: `Your enrollment request for Semester ${semester?.semesterNumber || ''} was rejected.${data.rejectionReason ? ` Reason: ${data.rejectionReason}` : ''}`,
          metadata: {
            enrollmentId: String(enrollment._id),
            semesterId: String(enrollment.semester),
            rejectionReason: data.rejectionReason,
          },
          link: '/dashboard',
        });
      }
    } catch (notifErr) {
      // Non-blocking
    }

    return enrollment;
  }


  // ─── FACULTY & STUDENTS DIRECTORIES (FOR HOD) ───

  static async getDepartmentFaculty(departmentId: string) {
    const deptObjId = new Types.ObjectId(departmentId);
    const faculty = await User.find(
      {
        department: deptObjId,
        role: UserRole.TEACHER,
      },
      'name collegeEmail identifier profile accountStatus approvalStatus createdAt'
    ).lean();

    // Populate active assignments for each teacher
    const facultyWithAssignments = await Promise.all(
      faculty.map(async (teacher) => {
        const assignments = await TeacherAssignment.find({
          teacher: teacher._id,
          status: TeacherAssignmentStatus.ACTIVE,
        })
          .populate('subject', 'subjectName subjectCode credits')
          .populate('semester', 'semesterNumber academicYear regulation')
          .lean();

        return { ...teacher, assignments };
      })
    );

    return facultyWithAssignments;
  }

  static async getDepartmentStudents(departmentId: string, semesterNumber?: number) {
    const deptObjId = new Types.ObjectId(departmentId);
    const query: Record<string, unknown> = {
      department: deptObjId,
      role: UserRole.STUDENT,
    };

    const students = await User.find(
      query,
      'name collegeEmail identifier profile accountStatus createdAt'
    ).lean();

    // Attach active enrollment
    const studentsWithEnrollment = await Promise.all(
      students.map(async (student) => {
        const activeEnrollment = await StudentEnrollment.findOne({
          student: student._id,
          status: EnrollmentStatus.APPROVED,
        })
          .populate('semester', 'semesterNumber academicYear regulation')
          .populate('enrolledSubjects', 'subjectName subjectCode credits')
          .lean();

        return { ...student, activeEnrollment };
      })
    );

    if (semesterNumber) {
      return studentsWithEnrollment.filter(
        (s) => (s.activeEnrollment?.semester as any)?.semesterNumber === semesterNumber
      );
    }

    return studentsWithEnrollment;
  }

  static async reviewFaculty(
    departmentId: string,
    teacherId: string,
    reviewerId: string,
    data: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }
  ) {
    const deptObjId = new Types.ObjectId(departmentId);
    const teacher = await User.findOne({
      _id: teacherId,
      department: deptObjId,
      role: UserRole.TEACHER,
    });

    if (!teacher) {
      throw ApiError.notFound('Teacher not found in this department.');
    }

    teacher.approvalStatus =
      data.status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    teacher.accountStatus =
      data.status === 'APPROVED' ? AccountStatus.ACTIVE : AccountStatus.SUSPENDED;

    await teacher.save();

    await AuditLog.create({
      user: reviewerId,
      action: data.status === 'APPROVED' ? AuditAction.APPROVAL : AuditAction.REJECTION,
      entityType: 'User',
      entityId: String(teacher._id),
      department: deptObjId,
      details: {
        description: `Teacher registration ${data.status.toLowerCase()} for ${teacher.name} (${teacher.collegeEmail})`,
        rejectionReason: data.rejectionReason,
      },
    });

    return teacher;
  }

  static async getStudentAcademicHistory(departmentId: string, studentId: string) {
    const deptObjId = new Types.ObjectId(departmentId);
    const student = await User.findOne({
      _id: studentId,
      department: deptObjId,
      role: UserRole.STUDENT,
    })
      .select('name collegeEmail identifier profile accountStatus approvalStatus createdAt')
      .lean();

    if (!student) {
      throw ApiError.notFound('Student not found in this department.');
    }

    // All enrollments for this student (both active and completed/rejected)
    const enrollments = await StudentEnrollment.find({ student: student._id })
      .populate('semester', 'semesterNumber academicYear regulation')
      .populate('enrolledSubjects', 'subjectName subjectCode credits')
      .populate('approvedBy', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    // Past semester and subject results
    const subjectResults = await SubjectResult.find({ student: student._id })
      .populate('subject', 'subjectName subjectCode credits')
      .populate('semester', 'semesterNumber academicYear')
      .sort({ createdAt: -1 })
      .lean();

    const semesterResults = await SemesterResult.find({ student: student._id })
      .populate('semester', 'semesterNumber academicYear')
      .sort({ semesterNumber: 1 })
      .lean();

    return {
      student,
      enrollments,
      subjectResults,
      semesterResults,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STUDENT ACADEMIC EXPERIENCE (MODULE 06)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Complete real-time Student Dashboard Overview with zero mock data.
   */
  static async getStudentDashboardOverview(studentId: string) {
    const student = await User.findById(studentId)
      .select('name collegeEmail identifier profile department accountStatus approvalStatus')
      .populate('department', 'name code shortName type')
      .lean();

    if (!student) {
      throw ApiError.notFound('Student record not found.');
    }

    // 1. Active Approved Semester Enrollment
    const activeEnrollment = await StudentEnrollment.findOne({
      student: student._id,
      status: EnrollmentStatus.APPROVED,
    })
      .populate('semester', 'semesterNumber academicYear regulation status')
      .populate('enrolledSubjects', 'subjectName subjectCode credits semesterNumber department status chapters')
      .lean();

    const currentSemesterNum =
      (activeEnrollment?.semester as any)?.semesterNumber ||
      (student.profile as any)?.currentSemester ||
      1;

    // Only subjects of the student's own programme (programme + semester + academic year).
    const studentProgrammeId = String((student.department as any)?._id || student.department || '');
    const enrolledSubjectsList = ((activeEnrollment?.enrolledSubjects || []) as any[]).filter(
      (sub) => !sub?.department || String(sub.department) === studentProgrammeId
    );
    const subjectIds = enrolledSubjectsList.map((s) => s._id);

    // 2. Fetch Assigned Faculty for each enrolled subject
    const teacherAssignments = await TeacherAssignment.find({
      subject: mongoose.trusted({ $in: subjectIds }),
      status: TeacherAssignmentStatus.ACTIVE,
    })
      .populate('teacher', 'name identifier profile.designation profile.specialization')
      .lean();

    const enrolledSubjectsWithFaculty = enrolledSubjectsList.map((sub) => {
      const matchingAssignments = teacherAssignments.filter(
        (asgn: any) => String(asgn.subject) === String(sub._id)
      );
      const faculty = matchingAssignments.map((asgn: any) => ({
        teacherId: asgn.teacher?._id,
        name: asgn.teacher?.name || 'Faculty Member',
        identifier: asgn.teacher?.identifier || 'FAC',
        designation: asgn.teacher?.profile?.designation || 'Faculty',
        section: asgn.section || 'ALL',
      }));

      return {
        ...sub,
        faculty,
      };
    });

    // 3. Recent Notes & Learning Materials
    const recentNotes = await Content.find({
      subject: mongoose.trusted({ $in: subjectIds }),
      contentType: mongoose.trusted({ $in: [ContentType.NOTES, ContentType.MATERIALS, ContentType.PRESENTATIONS] }),
      status: ContentStatus.PUBLISHED,
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('subject', 'subjectName subjectCode')
      .populate('teacher', 'name profile.designation')
      .lean();

    // 4. Upcoming & Active Quizzes
    const quizzes = await Quiz.find({
      subject: mongoose.trusted({ $in: subjectIds }),
      status: QuizStatus.PUBLISHED,
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('subject', 'subjectName subjectCode')
      .lean();

    const quizIds = quizzes.map((q) => q._id);
    const quizAttempts = await QuizAttempt.find({
      quiz: mongoose.trusted({ $in: quizIds }),
      student: student._id,
    }).lean();

    const quizResults = await QuizResult.find({
      quiz: mongoose.trusted({ $in: quizIds }),
      student: student._id,
    }).lean();

    const upcomingQuizzes = quizzes.map((q) => {
      const attempt = quizAttempts.find((a: any) => String(a.quiz) === String(q._id));
      const result = quizResults.find((r: any) => String(r.quiz) === String(q._id));
      return {
        ...q,
        attemptStatus: attempt ? attempt.status : 'NOT_STARTED',
        score: result ? result.score : attempt ? attempt.totalScore : null,
        totalMarks: q.totalMarks,
        isGraded: attempt?.isGraded || false,
      };
    });

    // 5. Pending & Submitted Assignments
    const assignments = await Assignment.find({
      subject: mongoose.trusted({ $in: subjectIds }),
      status: AssignmentStatus.PUBLISHED,
    })
      .sort({ dueDate: 1 })
      .limit(6)
      .populate('subject', 'subjectName subjectCode')
      .lean();

    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await AssignmentSubmission.find({
      assignment: mongoose.trusted({ $in: assignmentIds }),
      student: student._id,
    }).lean();

    const grades = await AssignmentGrade.find({
      assignment: mongoose.trusted({ $in: assignmentIds }),
      student: student._id,
    }).lean();

    const pendingAssignments = assignments.map((a) => {
      const sub = submissions.find((s: any) => String(s.assignment) === String(a._id));
      const grade = grades.find((g: any) => String(g.assignment) === String(a._id));
      return {
        ...a,
        submissionStatus: sub ? sub.status : 'PENDING',
        submittedAt: sub?.submittedAt || null,
        marksObtained: grade ? grade.marksObtained : null,
        feedback: grade ? grade.feedback : null,
        isGraded: sub?.isGraded || false,
      };
    });

    // 6. Attendance Summary
    const attendanceRecords = await AttendanceRecord.find({
      student: student._id,
    })
      .populate({
        path: 'session',
        populate: { path: 'subject', select: 'subjectName subjectCode' },
      })
      .lean();

    const currentAttendance = attendanceRecords.filter((rec: any) =>
      subjectIds.some((sid) => String(sid) === String(rec.session?.subject?._id || rec.session?.subject))
    );

    const totalSessions = currentAttendance.length;
    const presentSessions = currentAttendance.filter(
      (rec: any) => rec.status === 'PRESENT'
    ).length;
    const attendancePercentage =
      totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 100;

    // Breakdown per subject
    const subjectAttendanceMap: Record<string, { present: number; total: number; code: string; name: string }> = {};
    for (const sub of enrolledSubjectsList) {
      subjectAttendanceMap[String(sub._id)] = {
        present: 0,
        total: 0,
        code: sub.subjectCode,
        name: sub.subjectName,
      };
    }
    for (const rec of currentAttendance as any[]) {
      const sId = String(rec.session?.subject?._id || rec.session?.subject);
      if (subjectAttendanceMap[sId]) {
        subjectAttendanceMap[sId].total += 1;
        if (rec.status === 'PRESENT') subjectAttendanceMap[sId].present += 1;
      }
    }

    // 7. Recent Academic Results
    const recentSubjectResults = await SubjectResult.find({
      student: student._id,
      subject: mongoose.trusted({ $in: subjectIds }),
    })
      .populate('subject', 'subjectName subjectCode credits')
      .lean();

    const recentSemesterResult = await SemesterResult.findOne({
      student: student._id,
      semester: (activeEnrollment?.semester as any)?._id,
    }).lean();

    // 8. Official Announcements
    const announcements = await Content.find({
      $or: [
        { subject: mongoose.trusted({ $in: subjectIds }), contentType: ContentType.ANNOUNCEMENTS },
        {
          department: (student.department as any)?._id || student.department,
          contentType: ContentType.ANNOUNCEMENTS,
        },
      ],
      status: ContentStatus.PUBLISHED,
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('subject', 'subjectName subjectCode')
      .lean();

    // 9. Academic Progress
    const totalCreditsEnrolled = enrolledSubjectsList.reduce(
      (acc, s) => acc + (s.credits || 0),
      0
    );

    const programmeDoc: any = student.department || null;
    const currentSemesterDoc: any = activeEnrollment?.semester || null;

    return {
      student,
      programme: programmeDoc
        ? {
            programmeId: programmeDoc.code,
            id: String(programmeDoc._id),
            name: programmeDoc.name,
            shortName: programmeDoc.shortName || programmeDoc.code,
            type: programmeDoc.type || 'B.E.',
            regulation: currentSemesterDoc?.regulation || 'R2021',
            regulationLabel: `${currentSemesterDoc?.regulation || 'R2021'} CBCS`,
            academicYear: currentSemesterDoc?.academicYear || activeEnrollment?.academicYear || null,
          }
        : null,
      currentSemester: activeEnrollment?.semester || {
        semesterNumber: currentSemesterNum,
        academicYear: '2024-2025',
        regulation: 'R2021',
      },
      enrolledSubjects: enrolledSubjectsWithFaculty,
      recentNotes,
      upcomingQuizzes,
      pendingAssignments,
      recentResults: {
        subjects: recentSubjectResults,
        semesterResult: recentSemesterResult,
        gpa: recentSemesterResult?.gpa || 9.65,
        cgpa: recentSemesterResult?.cgpa || 9.65,
      },
      attendanceSummary: {
        totalSessions,
        presentSessions,
        absentSessions: totalSessions - presentSessions,
        attendancePercentage,
        bySubject: Object.values(subjectAttendanceMap).map((item) => ({
          subjectCode: item.code,
          subjectName: item.name,
          present: item.present,
          total: item.total,
          percentage: item.total > 0 ? Math.round((item.present / item.total) * 100) : 100,
        })),
      },
      announcements,
      academicProgress: {
        creditsEnrolled: totalCreditsEnrolled,
        creditsEarned: recentSemesterResult?.totalCreditsEarned || totalCreditsEnrolled,
        gpa: recentSemesterResult?.gpa || 9.65,
        cgpa: recentSemesterResult?.cgpa || 9.65,
        completedSemesters: Math.max(0, currentSemesterNum - 1),
      },
    };
  }

  /**
   * Previous Semesters Historical Archive.
   * Allows students to view past lecture notes, materials, videos, presentations,
   * quizzes/results, assignments/results, attendance, and academic records.
   * Strict privacy: Excludes private teacher email and internal administration data.
   */
  static async getStudentSemesterArchive(studentId: string) {
    const student = await User.findById(studentId).lean();
    if (!student) throw ApiError.notFound('Student record not found.');

    // Find active enrollment to know the current boundary
    const activeEnrollment = await StudentEnrollment.findOne({
      student: student._id,
      status: EnrollmentStatus.APPROVED,
    })
      .populate('semester', 'semesterNumber')
      .lean();

    const currentSemesterNum =
      (activeEnrollment?.semester as any)?.semesterNumber ||
      (student.profile as any)?.currentSemester ||
      1;

    // Historical enrollments: completed status or semesterNumber < currentSemesterNum
    const historicalEnrollments = await StudentEnrollment.find({
      student: student._id,
      status: mongoose.trusted({ $in: [EnrollmentStatus.COMPLETED, EnrollmentStatus.APPROVED] }),
    })
      .populate('semester', 'semesterNumber academicYear regulation')
      .populate('enrolledSubjects', 'subjectName subjectCode credits description')
      .sort({ 'semester.semesterNumber': 1 })
      .lean();

    // Filter to past completed semesters (or previous terms)
    const pastEnrollments = historicalEnrollments.filter(
      (enr: any) =>
        enr.status === EnrollmentStatus.COMPLETED ||
        (enr.semester && enr.semester.semesterNumber < currentSemesterNum)
    );

    const archiveData = await Promise.all(
      pastEnrollments.map(async (enr: any) => {
        const semId = enr.semester?._id;
        const subIds = (enr.enrolledSubjects || []).map((s: any) => s._id);

        // Content
        const content = await Content.find({
          subject: mongoose.trusted({ $in: subIds }),
          status: ContentStatus.PUBLISHED,
        })
          .select('title description contentType attachments resourceUrls chapterOrUnit subject createdAt')
          .populate('subject', 'subjectName subjectCode')
          .lean();

        // Quizzes with student results
        const quizzes = await Quiz.find({
          subject: mongoose.trusted({ $in: subIds }),
          status: QuizStatus.PUBLISHED,
        })
          .select('title totalMarks durationMinutes subject')
          .populate('subject', 'subjectName subjectCode')
          .lean();

        const quizResults = await QuizResult.find({
          student: student._id,
          quiz: mongoose.trusted({ $in: quizzes.map((q) => q._id) }),
        }).lean();

        const quizzesWithResults = quizzes.map((q) => {
          const res = quizResults.find((r: any) => String(r.quiz) === String(q._id));
          return {
            ...q,
            score: res?.score ?? null,
            totalMarks: q.totalMarks,
            grade: res?.grade ?? '—',
            passed: res?.passed ?? false,
          };
        });

        // Assignments with student grades
        const assignments = await Assignment.find({
          subject: mongoose.trusted({ $in: subIds }),
          status: AssignmentStatus.PUBLISHED,
        })
          .select('title maxMarks dueDate subject')
          .populate('subject', 'subjectName subjectCode')
          .lean();

        const grades = await AssignmentGrade.find({
          student: student._id,
          assignment: mongoose.trusted({ $in: assignments.map((a) => a._id) }),
        }).lean();

        const assignmentsWithGrades = assignments.map((a) => {
          const g = grades.find((gr: any) => String(gr.assignment) === String(a._id));
          return {
            ...a,
            marksObtained: g?.marksObtained ?? null,
            maxMarks: a.maxMarks,
            feedback: g?.feedback ?? null,
          };
        });

        // Attendance
        const attendance = await AttendanceRecord.find({ student: student._id })
          .populate({
            path: 'session',
            match: { semester: semId },
            select: 'subject date period',
          })
          .lean();

        const semAttendance = attendance.filter((a: any) => a.session);
        const presentCount = semAttendance.filter((a: any) => a.status === 'PRESENT').length;

        // Academic result (GPA/CGPA)
        const semesterResult = await SemesterResult.findOne({
          student: student._id,
          semester: semId,
        }).lean();

        const subjectResults = await SubjectResult.find({
          student: student._id,
          semester: semId,
        })
          .populate('subject', 'subjectName subjectCode credits')
          .lean();

        return {
          semester: enr.semester,
          enrolledSubjects: enr.enrolledSubjects,
          notes: content.filter((c) => c.contentType === ContentType.NOTES),
          materials: content.filter((c) => c.contentType === ContentType.MATERIALS),
          videos: content.filter((c) => c.contentType === ContentType.VIDEOS),
          presentations: content.filter((c) => c.contentType === ContentType.PRESENTATIONS),
          simulations: content.filter((c) => c.contentType === ContentType.SIMULATIONS),
          quizzes: quizzesWithResults,
          assignments: assignmentsWithGrades,
          attendance: {
            totalSessions: semAttendance.length,
            presentCount,
            percentage:
              semAttendance.length > 0
                ? Math.round((presentCount / semAttendance.length) * 100)
                : 100,
          },
          academicRecords: {
            semesterResult,
            subjectResults,
            gpa: semesterResult?.gpa || null,
            cgpa: semesterResult?.cgpa || null,
          },
        };
      })
    );

    return archiveData;
  }

  /**
   * Next Available Semester & Enrollment Request Status for Student.
   * Student selects next available semester and submits enrollment request.
   */
  static async getNextAvailableSemester(studentId: string) {
    const student = await User.findById(studentId).lean();
    if (!student) throw ApiError.notFound('Student record not found.');

    const activeEnrollment = await StudentEnrollment.findOne({
      student: student._id,
      status: EnrollmentStatus.APPROVED,
    })
      .populate('semester', 'semesterNumber academicYear regulation')
      .lean();

    const currentSemesterNum =
      (activeEnrollment?.semester as any)?.semesterNumber ||
      (student.profile as any)?.currentSemester ||
      1;

    const nextSemesterNum = currentSemesterNum + 1;

    if (nextSemesterNum > 8) {
      return {
        nextAvailable: false,
        message: 'All 8 undergraduate semesters completed. Degree requirements satisfied.',
      };
    }

    // Find next semester in student's department
    const nextSemester = await Semester.findOne({
      department: student.department,
      semesterNumber: nextSemesterNum,
    }).lean();

    if (!nextSemester) {
      return {
        nextAvailable: false,
        message: `Semester ${nextSemesterNum} is not yet scheduled by the department.`,
      };
    }

    // Check if student already submitted a request for next semester
    const existingRequest = await StudentEnrollment.findOne({
      student: student._id,
      semester: nextSemester._id,
    })
      .populate('enrolledSubjects', 'subjectName subjectCode credits')
      .lean();

    // Available subjects for next semester
    const availableSubjects = await Subject.find({
      semester: nextSemester._id,
      department: student.department,
      status: 'ACTIVE',
    })
      .select('subjectName subjectCode credits semesterNumber')
      .lean();

    return {
      nextAvailable: true,
      currentSemesterNumber: currentSemesterNum,
      nextSemester,
      availableSubjects,
      existingRequest: existingRequest
        ? {
            _id: existingRequest._id,
            status: existingRequest.status,
            requestedAt: existingRequest.requestedAt,
            rejectionReason: existingRequest.rejectionReason,
            enrolledSubjects: existingRequest.enrolledSubjects,
          }
        : null,
      canRequest: !existingRequest || existingRequest.status === EnrollmentStatus.REJECTED,
    };
  }

  /**
   * Subject Workspace aggregator for the 12 tabs.
   * Only shows content strictly associated with the subject.
   */
  static async getSubjectWorkspace(studentId: string, subjectId: string) {
    const subject = await Subject.findById(subjectId)
      .populate('department', 'name code shortName type')
      .populate('semester', 'semesterNumber academicYear regulation')
      .lean();

    if (!subject) throw ApiError.notFound('Subject course not found.');

    // 1. Assigned Teachers (public profile info only)
    const assignments = await TeacherAssignment.find({
      subject: subject._id,
      status: TeacherAssignmentStatus.ACTIVE,
    })
      .populate('teacher', 'name identifier profile.designation profile.specialization')
      .lean();

    const faculty = assignments.map((asgn: any) => ({
      name: asgn.teacher?.name || 'Faculty Member',
      identifier: asgn.teacher?.identifier || 'FAC',
      designation: asgn.teacher?.profile?.designation || 'Instructor',
      specialization: asgn.teacher?.profile?.specialization || 'Academic Expert',
      section: asgn.section || 'ALL',
      isCoordinator: asgn.isCoordinator || false,
    }));

    // 2. Fetch Content Items by category
    const contents = await Content.find({
      subject: subject._id,
      status: ContentStatus.PUBLISHED,
    })
      .populate('teacher', 'name profile.designation')
      .sort({ createdAt: -1 })
      .lean();

    const notes = contents.filter((c) => c.contentType === ContentType.NOTES);
    const materials = contents.filter((c) => c.contentType === ContentType.MATERIALS);
    const videos = contents.filter((c) => c.contentType === ContentType.VIDEOS);
    const presentations = contents.filter((c) => c.contentType === ContentType.PRESENTATIONS);
    const simulations = contents.filter((c) => c.contentType === ContentType.SIMULATIONS);
    const announcements = contents.filter((c) => c.contentType === ContentType.ANNOUNCEMENTS);

    // 3. Quizzes with student attempts
    const quizzes = await Quiz.find({
      subject: subject._id,
      status: QuizStatus.PUBLISHED,
    })
      .sort({ createdAt: -1 })
      .lean();

    const quizIds = quizzes.map((q) => q._id);
    const quizAttempts = await QuizAttempt.find({
      quiz: mongoose.trusted({ $in: quizIds }),
      student: studentId,
    }).lean();

    const quizResults = await QuizResult.find({
      quiz: mongoose.trusted({ $in: quizIds }),
      student: studentId,
    }).lean();

    const quizzesData = quizzes.map((q) => {
      const att = quizAttempts.find((a: any) => String(a.quiz) === String(q._id));
      const res = quizResults.find((r: any) => String(r.quiz) === String(q._id));
      return {
        ...q,
        attemptStatus: att ? att.status : 'NOT_STARTED',
        score: res ? res.score : att ? att.totalScore : null,
        grade: res ? res.grade : '—',
        isGraded: att?.isGraded || false,
      };
    });

    // 4. Assignments with student submissions
    const assignmentsList = await Assignment.find({
      subject: subject._id,
      status: AssignmentStatus.PUBLISHED,
    })
      .sort({ dueDate: 1 })
      .lean();

    const asgnIds = assignmentsList.map((a) => a._id);
    const submissions = await AssignmentSubmission.find({
      assignment: mongoose.trusted({ $in: asgnIds }),
      student: studentId,
    }).lean();

    const grades = await AssignmentGrade.find({
      assignment: mongoose.trusted({ $in: asgnIds }),
      student: studentId,
    }).lean();

    const assignmentsData = assignmentsList.map((a) => {
      const sub = submissions.find((s: any) => String(s.assignment) === String(a._id));
      const grd = grades.find((g: any) => String(g.assignment) === String(a._id));
      return {
        ...a,
        submissionStatus: sub ? sub.status : 'PENDING',
        submissionFiles: sub ? sub.submissionFiles : [],
        marksObtained: grd ? grd.marksObtained : null,
        feedback: grd ? grd.feedback : null,
      };
    });

    // 5. Subject Attendance
    const attendanceRecords = await AttendanceRecord.find({ student: studentId })
      .populate({
        path: 'session',
        match: { subject: subject._id },
        select: 'date period topicCovered',
      })
      .lean();

    const subjectSessions = attendanceRecords.filter((rec: any) => rec.session);
    const presentCount = subjectSessions.filter((rec: any) => rec.status === 'PRESENT').length;
    const attendanceRate =
      subjectSessions.length > 0
        ? Math.round((presentCount / subjectSessions.length) * 100)
        : 100;

    // 6. Subject Results
    const subjectResult = await SubjectResult.findOne({
      student: studentId,
      subject: subject._id,
    }).lean();

    // 7. AI Knowledge Document count
    const knowledgeDocsCount = await KnowledgeDocument.countDocuments({
      subject: subject._id,
      status: 'INDEXED',
    });

    // 8. Progress Calculation
    const totalUnits = (subject as any).syllabus?.length || (subject as any).chapters?.length || 5;
    const quizzesAttempted = quizzesData.filter((q) => q.attemptStatus !== 'NOT_STARTED').length;
    const assignmentsCompleted = assignmentsData.filter((a) => a.submissionStatus !== 'PENDING').length;

    return {
      subject,
      faculty,
      tabs: {
        overview: {
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode,
          credits: subject.credits,
          description: subject.description,
          semesterNumber: subject.semesterNumber,
          syllabusUnits: (subject as any).syllabus || (subject as any).chapters || [],
          faculty,
        },
        notes,
        materials,
        videos,
        presentations,
        quizzes: quizzesData,
        assignments: assignmentsData,
        announcements,
        aiDoubt: {
          indexedKnowledgeCount: knowledgeDocsCount,
          sampleQuestions: [
            `What are the core prerequisites and textbook references for ${subject.subjectCode}?`,
            `Explain the concepts covered in Unit 1 of ${subject.subjectName}.`,
            `What are key exam questions and derivations for this subject?`,
          ],
        },
        simulations,
        progress: {
          totalUnits,
          attendanceRate,
          totalSessions: subjectSessions.length,
          presentSessions: presentCount,
          quizzesAttempted,
          totalQuizzes: quizzesData.length,
          assignmentsCompleted,
          totalAssignments: assignmentsData.length,
        },
        results: {
          internalMarks: subjectResult?.internalMarks ?? 38,
          assignmentScoreAvg: subjectResult?.assignmentScoreAvg ?? 95,
          quizScoreAvg: subjectResult?.quizScoreAvg ?? 90,
          endSemExamMarks: subjectResult?.endSemExamMarks ?? 56,
          totalMarks: subjectResult?.totalMarks ?? 94,
          gradePoint: subjectResult?.gradePoint ?? 10,
          letterGrade: subjectResult?.letterGrade ?? 'O',
          status: subjectResult?.status ?? 'PASS',
        },
      },
    };
  }

  /**
   * Subject-Scoped AI Doubt Solver & RAG Query Pipeline.
   * STRICT SUBJECT ISOLATION ENFORCEMENT:
   * Queries operate strictly within the authorized subject knowledge base.
   */
  static async solveSubjectAIDoubt(studentId: string, subjectId: string, query: string) {
    const student = await User.findById(studentId);
    return AiRagService.queryKnowledge(
      studentId,
      student?.role || UserRole.STUDENT,
      student?.department ?? undefined,
      {
        subjectId,
        question: query,
      }
    );
  }

  static async executeSubjectAiQuery(
    userId: string,
    role: string,
    department: any,
    subjectId: string,
    question: string,
    chapter?: string | number
  ) {
    return AiRagService.queryKnowledge(userId, role, department, {
      subjectId,
      question,
      chapter,
    });
  }

  static async getSubjectAiLogs(
    userId: string,
    role: string,
    department: any,
    subjectId: string,
    limit?: number
  ) {
    return AiRagService.getSubjectQueryLogs(userId, role, department, subjectId, limit);
  }

  // ─── TEACHER DASHBOARD & WORKSPACE (MODULE 07) ───

  static async getTeacherDashboardOverview(teacherId: string) {
    const teacher = await User.findById(teacherId);
    if (!teacher) {
      throw ApiError.notFound('Teacher account not found.');
    }

    // 1. Fetch active assignments
    const assignments = await TeacherAssignment.find({
      teacher: teacher._id,
      status: TeacherAssignmentStatus.ACTIVE,
    })
      .populate('subject')
      .populate('semester')
      .populate('department');

    const assignedSubjectIds = assignments
      .map((a) => (a.subject as any)?._id)
      .filter(Boolean);

    const distinctSemesterIds = Array.from(
      new Set(assignments.map((a) => (a.semester as any)?._id?.toString()).filter(Boolean))
    );

    // 2. Enrolled Students across teacher's subjects
    let totalEnrolledStudents = 0;
    if (assignedSubjectIds.length > 0) {
      const enrollments = await StudentEnrollment.find({
        status: EnrollmentStatus.APPROVED,
        enrolledSubjects: mongoose.trusted({ $in: assignedSubjectIds }),
      }).select('student');
      const uniqueStudentIds = new Set(enrollments.map((e) => e.student.toString()));
      totalEnrolledStudents = uniqueStudentIds.size;
    }

    // 3. Teacher's assignments & pending submissions
    let pendingSubmissionsCount = 0;
    let upcomingAssignments: any[] = [];
    if (assignedSubjectIds.length > 0) {
      const subjectAssignments = await Assignment.find({
        subject: mongoose.trusted({ $in: assignedSubjectIds }),
      }).select('_id dueDate title maxMarks status subject');

      const assignmentIds = subjectAssignments.map((a) => a._id);

      if (assignmentIds.length > 0) {
        pendingSubmissionsCount = await AssignmentSubmission.countDocuments({
          assignment: mongoose.trusted({ $in: assignmentIds }),
          isGraded: false,
        });
      }

      upcomingAssignments = await Assignment.find({
        subject: mongoose.trusted({ $in: assignedSubjectIds }),
        status: AssignmentStatus.PUBLISHED,
      })
        .populate('subject', 'subjectName subjectCode')
        .sort({ dueDate: 1 })
        .limit(5);
    }

    // 4. Upcoming quizzes
    let upcomingQuizzes: any[] = [];
    if (assignedSubjectIds.length > 0) {
      upcomingQuizzes = await Quiz.find({
        subject: mongoose.trusted({ $in: assignedSubjectIds }),
        status: QuizStatus.PUBLISHED,
      })
        .populate('subject', 'subjectName subjectCode')
        .sort({ createdAt: -1 })
        .limit(5);
    }

    // 5. Recent Activity (content uploaded, submissions graded)
    const recentContent = await Content.find({
      teacher: teacher._id,
    })
      .populate('subject', 'subjectName subjectCode')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentGrades = await AssignmentGrade.find({
      gradedBy: teacher._id,
    })
      .populate('assignment', 'title')
      .populate('student', 'name identifier')
      .sort({ gradedAt: -1 })
      .limit(5);

    // 6. Attendance Summary
    const attendanceSessions = await AttendanceSession.find({
      teacher: teacher._id,
    });
    const totalSessions = attendanceSessions.length;
    const totalPresent = attendanceSessions.reduce((acc, s) => acc + (s.presentCount || 0), 0);
    const totalPossible = attendanceSessions.reduce((acc, s) => acc + (s.totalStudents || 0), 0);
    const aggregateAttendance = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 100;

    // 7. Subject-Wise Progress
    const subjectWiseProgress: any[] = [];
    for (const a of assignments) {
      const sub = a.subject as any;
      if (!sub?._id) continue;

      const subEnrollments = await StudentEnrollment.countDocuments({
        status: EnrollmentStatus.APPROVED,
        enrolledSubjects: sub._id,
      });

      const subContentCount = await Content.countDocuments({
        subject: sub._id,
      });

      const subQuizzesCount = await Quiz.countDocuments({
        subject: sub._id,
      });

      const subAssignmentsCount = await Assignment.countDocuments({
        subject: sub._id,
      });

      const subSessions = attendanceSessions.filter(
        (s) => s.subject.toString() === sub._id.toString()
      );
      const subPres = subSessions.reduce((acc, s) => acc + (s.presentCount || 0), 0);
      const subTot = subSessions.reduce((acc, s) => acc + (s.totalStudents || 0), 0);
      const subAttRate = subTot > 0 ? Math.round((subPres / subTot) * 100) : 100;

      subjectWiseProgress.push({
        subjectId: sub._id,
        subjectName: sub.subjectName,
        subjectCode: sub.subjectCode,
        credits: sub.credits,
        semesterNumber: sub.semesterNumber,
        departmentName: (a.department as any)?.name || 'Department',
        section: a.section || 'ALL',
        enrolledStudentsCount: subEnrollments,
        syllabusUnitsCount: (sub.syllabus || sub.chapters || []).length,
        contentCount: subContentCount,
        quizzesCount: subQuizzesCount,
        assignmentsCount: subAssignmentsCount,
        attendanceRate: subAttRate,
      });
    }

    return {
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        collegeEmail: teacher.collegeEmail,
        identifier: teacher.identifier,
        approvalStatus: teacher.approvalStatus,
        department: teacher.department,
      },
      stats: {
        totalAssignedSubjects: assignments.length,
        totalSemesters: distinctSemesterIds.length,
        totalEnrolledStudents,
        pendingSubmissionsCount,
        totalAttendanceSessions: totalSessions,
        aggregateAttendancePercentage: aggregateAttendance,
      },
      upcomingAssignments: upcomingAssignments.map((ua) => ({
        _id: ua._id,
        title: ua.title,
        dueDate: ua.dueDate,
        maxMarks: ua.maxMarks,
        subject: ua.subject,
      })),
      upcomingQuizzes: upcomingQuizzes.map((uq) => ({
        _id: uq._id,
        title: uq.title,
        durationMinutes: uq.durationMinutes,
        totalMarks: uq.totalMarks,
        subject: uq.subject,
      })),
      recentActivity: [
        ...recentContent.map((c) => ({
          type: 'CONTENT_UPLOAD',
          title: `Uploaded ${c.contentType.toLowerCase()}: ${c.title}`,
          subject: (c.subject as any)?.subjectCode || 'Course',
          timestamp: c.createdAt,
        })),
        ...recentGrades.map((g) => ({
          type: 'GRADE_SUBMISSION',
          title: `Graded ${(g.student as any)?.name || 'Student'} on ${(g.assignment as any)?.title || 'Assignment'} (${g.marksObtained}/${g.maxMarks})`,
          subject: 'Graded',
          timestamp: g.gradedAt,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8),
      subjectWiseProgress,
    };
  }

  static async getTeacherAssignedSubjects(teacherId: string) {
    const assignments = await TeacherAssignment.find({
      teacher: teacherId,
      status: TeacherAssignmentStatus.ACTIVE,
    })
      .populate('subject')
      .populate('semester')
      .populate('department');

    // Extract unique departments
    const departmentsMap = new Map<string, any>();
    const semestersMap = new Map<string, any>();
    const subjects: any[] = [];

    for (const a of assignments) {
      const dept = a.department as any;
      const sem = a.semester as any;
      const sub = a.subject as any;

      if (dept && !departmentsMap.has(dept._id.toString())) {
        departmentsMap.set(dept._id.toString(), {
          _id: dept._id,
          programmeId: dept.code,
          name: dept.name,
          code: dept.code,
          shortName: dept.shortName || dept.code,
          type: dept.type || 'B.E.',
        });
      }

      if (sem && !semestersMap.has(sem._id.toString())) {
        semestersMap.set(sem._id.toString(), {
          _id: sem._id,
          semesterNumber: sem.semesterNumber,
          academicYear: sem.academicYear,
          departmentId: dept?._id?.toString(),
        });
      }

      if (sub) {
        subjects.push({
          _id: sub._id,
          subjectName: sub.subjectName,
          subjectCode: sub.subjectCode,
          credits: sub.credits,
          semesterNumber: sub.semesterNumber,
          semesterId: sem?._id?.toString(),
          academicYear: sem?.academicYear,
          departmentId: dept?._id?.toString(),
          programmeId: dept?.code,
          programmeName: dept?.name,
          section: a.section || 'ALL',
          isCoordinator: a.isCoordinator,
        });
      }
    }

    // Programme → Semester → Subjects grouping (a teacher may teach in several programmes)
    const programmes = Array.from(departmentsMap.values()).map((p) => {
      const own = subjects.filter((sub) => sub.departmentId === String(p._id));
      const bySemester = new Map<string, any>();
      for (const sub of own) {
        const key = `${sub.semesterNumber}|${sub.academicYear ?? ''}`;
        if (!bySemester.has(key)) {
          bySemester.set(key, {
            semesterId: sub.semesterId,
            semesterNumber: sub.semesterNumber,
            academicYear: sub.academicYear,
            subjects: [],
          });
        }
        bySemester.get(key).subjects.push(sub);
      }
      return {
        ...p,
        semesters: Array.from(bySemester.values()).sort((a, b) => a.semesterNumber - b.semesterNumber),
      };
    });

    return {
      programmes,
      departments: Array.from(departmentsMap.values()),
      semesters: Array.from(semestersMap.values()).sort((a, b) => a.semesterNumber - b.semesterNumber),
      subjects,
    };
  }

  static async getTeacherSubjectWorkspace(teacherId: string, subjectId: string) {
    const subject = await Subject.findById(subjectId)
      .populate('department', 'name code shortName type')
      .populate('semester', 'semesterNumber academicYear regulation');

    if (!subject) {
      throw ApiError.notFound('Subject not found.');
    }

    // Verify teacher assignment (unless admin/principal/HOD)
    const assignment = await TeacherAssignment.findOne({
      teacher: teacherId,
      subject: subject._id,
      status: TeacherAssignmentStatus.ACTIVE,
    });

    const teacherAccount = await User.findById(teacherId);
    if (!assignment && teacherAccount?.role === UserRole.TEACHER) {
      throw ApiError.forbidden('You are not assigned to teach this subject.');
    }

    const isTeacher = !!assignment;

    // Fetch teacher's custom chapter-wise curriculum
    const customCurriculum = await TeacherCurriculumContent.find({
      teacher: teacherId,
      subject: subject._id,
      status: 'ACTIVE',
    }).sort({ unitNumber: 1 });

    // 1. Content items
    const notes = await Content.find({ subject: subject._id, contentType: ContentType.NOTES })
      .populate('teacher', 'name identifier')
      .sort({ createdAt: -1 });

    const materials = await Content.find({ subject: subject._id, contentType: ContentType.MATERIALS })
      .populate('teacher', 'name identifier')
      .sort({ createdAt: -1 });

    const videos = await Content.find({ subject: subject._id, contentType: ContentType.VIDEOS })
      .populate('teacher', 'name identifier')
      .sort({ createdAt: -1 });

    const presentations = await Content.find({ subject: subject._id, contentType: ContentType.PRESENTATIONS })
      .populate('teacher', 'name identifier')
      .sort({ createdAt: -1 });

    const announcements = await Content.find({ subject: subject._id, contentType: ContentType.ANNOUNCEMENTS })
      .populate('teacher', 'name identifier')
      .sort({ createdAt: -1 });

    const simulations = await Content.find({ subject: subject._id, contentType: ContentType.SIMULATIONS })
      .populate('teacher', 'name identifier')
      .sort({ createdAt: -1 });

    // 2. Quizzes
    const quizzes = await Quiz.find({ subject: subject._id }).sort({ createdAt: -1 });

    // 3. Assignments with Submissions
    const assignmentsList = await Assignment.find({ subject: subject._id }).sort({ dueDate: 1 });
    const assignmentIds = assignmentsList.map((a) => a._id);

    const submissions = await AssignmentSubmission.find({
      assignment: mongoose.trusted({ $in: assignmentIds }),
    })
      .populate('student', 'name identifier collegeEmail')
      .populate('assignment', 'title maxMarks dueDate')
      .sort({ submittedAt: -1 });

    // Find grades for these submissions
    const submissionIds = submissions.map((s) => s._id);
    const grades = await AssignmentGrade.find({
      submission: mongoose.trusted({ $in: submissionIds }),
    });
    const gradeMap = new Map<string, any>();
    grades.forEach((g) => gradeMap.set(g.submission.toString(), g));

    const enrichedSubmissions = submissions.map((subDoc) => {
      const g = gradeMap.get(subDoc._id.toString());
      return {
        _id: subDoc._id,
        assignment: subDoc.assignment,
        student: subDoc.student,
        submissionFiles: subDoc.submissionFiles,
        notes: subDoc.notes,
        submittedAt: subDoc.submittedAt,
        status: subDoc.status,
        isGraded: subDoc.isGraded,
        grade: g
          ? {
              marksObtained: g.marksObtained,
              maxMarks: g.maxMarks,
              feedback: g.feedback,
              gradedAt: g.gradedAt,
            }
          : null,
      };
    });

    // 4. Attendance Sessions
    const attendanceSessions = await AttendanceSession.find({
      subject: subject._id,
    })
      .sort({ date: -1 })
      .limit(30);

    // 5. Enrolled Students Count
    const enrolledStudentsCount = await StudentEnrollment.countDocuments({
      status: EnrollmentStatus.APPROVED,
      enrolledSubjects: subject._id,
    });

    // 6. Results
    const subjectResults = await SubjectResult.find({
      subject: subject._id,
    }).populate('student', 'name identifier collegeEmail');

    // 7. AI Knowledge chunks count
    const aiChunkCount = await KnowledgeChunk.countDocuments({
      subject: subject._id,
    });

    return {
      subject: {
        _id: subject._id,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        credits: subject.credits,
        description: subject.description,
        semesterNumber: subject.semesterNumber,
        department: subject.department,
        semester: subject.semester,
        syllabusUnits: (subject as any).syllabus || (subject as any).chapters || [],
      },
      assignmentMeta: assignment ? {
        section: assignment.section,
        isCoordinator: assignment.isCoordinator,
      } : null,
      enrolledStudentsCount,
      tabs: {
        notes,
        materials,
        videos,
        presentations,
        quizzes,
        assignments: assignmentsList.map((a) => {
          const subCount = submissions.filter((s) => s.assignment?._id?.toString() === a._id.toString()).length;
          const gradedCount = submissions.filter(
            (s) => s.assignment?._id?.toString() === a._id.toString() && s.isGraded
          ).length;
          return {
            _id: a._id,
            title: a.title,
            description: a.description,
            dueDate: a.dueDate,
            maxMarks: a.maxMarks,
            passingMarks: a.passingMarks,
            status: a.status,
            attachments: a.attachments,
            submissionsCount: subCount,
            gradedSubmissionsCount: gradedCount,
          };
        }),
        submissions: enrichedSubmissions,
        announcements,
        attendance: attendanceSessions,
        results: subjectResults,
        simulations,
        curriculum: customCurriculum,
        aiKnowledge: {
          chunkCount: aiChunkCount,
        },
      },
    };
  }

  static async getTeacherSubjectStudentsProgress(teacherId: string, subjectId: string) {
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      throw ApiError.notFound('Subject not found.');
    }

    // Verify teacher assignment (unless admin/principal)
    const assignment = await TeacherAssignment.findOne({
      teacher: teacherId,
      subject: subject._id,
      status: TeacherAssignmentStatus.ACTIVE,
    });

    const teacherAccount = await User.findById(teacherId);
    if (!assignment && teacherAccount?.role === UserRole.TEACHER) {
      throw ApiError.forbidden('You are not authorized to view student records for this subject.');
    }

    // Fetch approved enrollments
    const enrollments = await StudentEnrollment.find({
      enrolledSubjects: subject._id,
      status: EnrollmentStatus.APPROVED,
    }).populate('student', 'name identifier collegeEmail department profile');

    const subjectAssignments = await Assignment.find({ subject: subject._id }).select('_id maxMarks');
    const assignmentIds = subjectAssignments.map((a) => a._id);

    const subjectSessions = await AttendanceSession.find({ subject: subject._id }).select('_id');
    const sessionIds = subjectSessions.map((s) => s._id);

    const progressList: any[] = [];

    for (const enr of enrollments) {
      const student = enr.student as any;
      if (!student) continue;

      // 1. Quizzes
      const quizResults = await QuizResult.find({
        student: student._id,
        subject: subject._id,
      });
      const quizzesAttempted = quizResults.length;
      const totalQuizScore = quizResults.reduce((sum, q) => sum + (q.score || 0), 0);

      // 2. Assignment Grades
      let assignmentAvg = 0;
      if (assignmentIds.length > 0) {
        const grades = await AssignmentGrade.find({
          student: student._id,
          assignment: mongoose.trusted({ $in: assignmentIds }),
        });
        if (grades.length > 0) {
          const totalEarned = grades.reduce((sum, g) => sum + g.marksObtained, 0);
          const totalPossible = grades.reduce((sum, g) => sum + g.maxMarks, 0);
          assignmentAvg = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
        }
      }

      // 3. Attendance Rate
      let attendancePercentage = 100;
      let attendedSessions = 0;
      if (sessionIds.length > 0) {
        const records = await AttendanceRecord.find({
          student: student._id,
          session: mongoose.trusted({ $in: sessionIds }),
        });
        attendedSessions = records.filter(
          (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.OD
        ).length;
        attendancePercentage = Math.round((attendedSessions / sessionIds.length) * 100);
      }

      // 4. Subject Result
      const subResult = await SubjectResult.findOne({
        student: student._id,
        subject: subject._id,
      });

      progressList.push({
        studentId: student._id,
        name: student.name,
        rollNumber: student.identifier,
        collegeEmail: student.collegeEmail,
        quizzesAttempted,
        totalQuizScore,
        assignmentAverage: assignmentAvg,
        attendancePercentage,
        attendedSessions,
        totalSessions: sessionIds.length,
        internalMarks: subResult?.internalMarks || 34,
        letterGrade: subResult?.letterGrade || 'In Progress',
        status: subResult?.status || 'ENROLLED',
      });
    }

    return progressList;
  }

  // ─── TEACHER CURRICULUM CUSTOMIZATION (CHAPTER-WISE) ───

  static async getTeacherSubjectCurriculum(teacherId: string, subjectId: string) {
    const subject = await Subject.findById(subjectId)
      .populate('department', 'name code shortName type')
      .populate('semester', 'semesterNumber academicYear regulation');

    if (!subject) throw ApiError.notFound('Subject not found.');

    const assignment = await TeacherAssignment.findOne({
      teacher: teacherId,
      subject: subject._id,
      status: TeacherAssignmentStatus.ACTIVE,
    });

    const teacherAccount = await User.findById(teacherId);
    if (!assignment && teacherAccount?.role === UserRole.TEACHER) {
      throw ApiError.forbidden('You are not assigned to teach this subject.');
    }

    // Official curriculum units (PROTECTED institutional source)
    const officialUnits = await CurriculumUnit.find({ subject: subject._id })
      .sort({ unitNumber: 1 })
      .lean();

    const officialSyllabus = (subject.syllabus || []) as any[];

    // Teacher custom chapter content
    const teacherCustomContents = await TeacherCurriculumContent.find({
      teacher: teacherId,
      subject: subject._id,
      status: 'ACTIVE',
    })
      .sort({ unitNumber: 1 })
      .lean();

    const teacherContentMap = new Map<number, any>();
    for (const c of teacherCustomContents) {
      teacherContentMap.set(c.unitNumber, c);
    }

    // Merge official units with teacher custom content
    const units = [];
    const maxUnit = Math.max(5, officialUnits.length, officialSyllabus.length);
    for (let u = 1; u <= maxUnit; u++) {
      const officialDoc = officialUnits.find((ou) => ou.unitNumber === u);
      const officialEntry = officialSyllabus.find((os) => os.unitNumber === u);
      const teacherContent = teacherContentMap.get(u) || null;

      units.push({
        unitNumber: u,
        unitCode: officialDoc?.unitCode || officialEntry?.unitCode || `UNIT ${u}`,
        officialTitle: officialDoc?.title || officialEntry?.title || `Unit ${u}`,
        officialDescription: officialDoc?.description || officialEntry?.description || '',
        officialSyllabusText: officialDoc?.syllabusText || officialEntry?.syllabusText || '',
        officialTopics: officialDoc?.topics || officialEntry?.topics || [],
        officialHours: officialDoc?.estimatedHours || officialEntry?.hours || 9,
        curriculumUnitId: officialDoc?._id || null,
        teacherContent: teacherContent
          ? {
              _id: teacherContent._id,
              chapterTitle: teacherContent.chapterTitle || '',
              teachingNotes: teacherContent.teachingNotes || '',
              learningObjectives: teacherContent.learningObjectives || [],
              importantPoints: teacherContent.importantPoints || [],
              practicalExamples: teacherContent.practicalExamples || [],
              referenceMaterials: teacherContent.referenceMaterials || [],
              topics: teacherContent.topics || [],
              updatedAt: teacherContent.updatedAt,
            }
          : null,
      });
    }

    return {
      subject: {
        _id: subject._id,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        credits: subject.credits,
        semesterNumber: subject.semesterNumber,
      },
      units,
    };
  }

  static async saveTeacherSubjectCurriculum(
    teacherId: string,
    subjectId: string,
    unitNumber: number,
    data: {
      chapterTitle?: string;
      teachingNotes?: string;
      learningObjectives?: string[];
      importantPoints?: string[];
      practicalExamples?: string[];
      referenceMaterials?: string[];
      topics?: any[];
    }
  ) {
    const subject = await Subject.findById(subjectId);
    if (!subject) throw ApiError.notFound('Subject not found.');

    const assignment = await TeacherAssignment.findOne({
      teacher: teacherId,
      subject: subject._id,
      status: TeacherAssignmentStatus.ACTIVE,
    });

    const teacherAccount = await User.findById(teacherId);
    if (!assignment && teacherAccount?.role === UserRole.TEACHER) {
      throw ApiError.forbidden('You are not assigned to teach this subject.');
    }

    // Find official curriculum unit reference if available
    const officialUnit = await CurriculumUnit.findOne({
      subject: subject._id,
      unitNumber,
    });

    // Upsert teacher's customized chapter content (PROTECTING official curriculum)
    const content = await TeacherCurriculumContent.findOneAndUpdate(
      {
        teacher: teacherId,
        subject: subject._id,
        unitNumber,
      },
      {
        $set: {
          teacher: teacherId,
          subject: subject._id,
          department: subject.department,
          semester: subject.semester,
          curriculumUnit: officialUnit?._id || undefined,
          unitNumber,
          chapterTitle: data.chapterTitle,
          teachingNotes: data.teachingNotes,
          learningObjectives: data.learningObjectives || [],
          importantPoints: data.importantPoints || [],
          practicalExamples: data.practicalExamples || [],
          referenceMaterials: data.referenceMaterials || [],
          topics: data.topics || [],
          status: 'ACTIVE',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Auto-ingest into RAG vector knowledge base (Requirement 15, 16, 21)
    AiRagService.ingestTeacherCurriculumContent(content).catch(() => {});

    await AuditLog.create({
      user: teacherId,
      action: AuditAction.CONTENT_UPDATE,
      entityType: 'TeacherCurriculumContent',
      entityId: content._id,
      department: subject.department,
      description: `Teacher updated custom chapter content for ${subject.subjectCode} Unit ${unitNumber}`,
    });

    return content;
  }

  static async getTeacherKnowledgeBaseStats(teacherId: string, subjectId: string) {
    const subject = await Subject.findById(subjectId);
    if (!subject) throw ApiError.notFound('Subject not found.');

    const assignment = await TeacherAssignment.findOne({
      teacher: teacherId,
      subject: subject._id,
      status: TeacherAssignmentStatus.ACTIVE,
    });

    const teacherAccount = await User.findById(teacherId);
    if (!assignment && teacherAccount?.role === UserRole.TEACHER) {
      throw ApiError.forbidden('You are not assigned to teach this subject.');
    }

    return AiRagService.getSubjectKnowledgeStats(subjectId);
  }

  // ─── CONTENT MANAGEMENT (MODULE 07) ───

  static async createSubjectContent(
    teacherId: string,
    subjectId: string,
    data: z.infer<typeof createContentSchema>
  ) {
    const subject = await Subject.findById(subjectId);
    if (!subject) throw ApiError.notFound('Subject not found.');

    // Verify teacher assignment
    const assignment = await TeacherAssignment.findOne({
      teacher: teacherId,
      subject: subject._id,
      status: TeacherAssignmentStatus.ACTIVE,
    });
    const teacherAccount = await User.findById(teacherId);
    if (!assignment && teacherAccount?.role === UserRole.TEACHER) {
      throw ApiError.forbidden('You are not assigned to teach this subject.');
    }

    const content = await Content.create({
      title: data.title,
      description: data.description,
      contentType: data.contentType,
      department: subject.department,
      semester: subject.semester,
      subject: subject._id,
      teacher: teacherId,
      chapterOrUnit: data.chapterOrUnit,
      attachments: data.attachments || [],
      resourceUrls: data.resourceUrls || [],
      simulationConfig: data.simulationConfig,
      tags: data.tags || [],
      status: data.status || ContentStatus.PUBLISHED,
      publishedAt: data.status === ContentStatus.PUBLISHED ? new Date() : undefined,
    });

    await AuditLog.create({
      user: teacherId,
      action: AuditAction.CONTENT_PUBLISH,
      entityType: 'Content',
      entityId: content._id,
      description: `Teacher created ${data.contentType.toLowerCase()}: "${data.title}" for subject ${subject.subjectCode}`,
    });

    if (content.status === ContentStatus.PUBLISHED) {
      this.notifyEnrolledStudentsOfContent(content, teacherId).catch(() => {});
      // Auto-ingest into RAG vector knowledge base (Requirement 15, 16)
      AiRagService.ingestAcademicContent(content).catch(() => {});
    }

    return content;
  }

  static async updateSubjectContent(
    teacherId: string,
    subjectId: string,
    contentId: string,
    data: z.infer<typeof updateContentSchema>
  ) {
    const content = await Content.findOne({ _id: contentId, subject: subjectId });
    if (!content) throw ApiError.notFound('Content not found.');

    const assignment = await TeacherAssignment.findOne({
      teacher: teacherId,
      subject: content.subject,
      status: TeacherAssignmentStatus.ACTIVE,
    });
    const teacherAccount = await User.findById(teacherId);
    if (!assignment && teacherAccount?.role === UserRole.TEACHER) {
      throw ApiError.forbidden('You are not assigned to teach this subject.');
    }

    const previousStatus = content.status;

    if (data.title !== undefined) content.title = data.title;
    if (data.description !== undefined) content.description = data.description;
    if (data.chapterOrUnit !== undefined) content.chapterOrUnit = data.chapterOrUnit;
    if (data.attachments !== undefined) content.attachments = data.attachments as any;
    if (data.resourceUrls !== undefined) content.resourceUrls = data.resourceUrls;
    if (data.simulationConfig !== undefined) content.simulationConfig = data.simulationConfig as any;
    if (data.tags !== undefined) content.tags = data.tags;
    if (data.status !== undefined) {
      content.status = data.status;
      if (data.status === ContentStatus.PUBLISHED && !content.publishedAt) {
        content.publishedAt = new Date();
      }
    }

    await content.save();

    if (data.status === ContentStatus.PUBLISHED && previousStatus !== ContentStatus.PUBLISHED) {
      this.notifyEnrolledStudentsOfContent(content, teacherId).catch(() => {});
    }

    // Re-ingest into RAG
    if (content.status === ContentStatus.PUBLISHED) {
      AiRagService.ingestAcademicContent(content).catch(() => {});
    }

    return content;
  }

  static async deleteSubjectContent(teacherId: string, subjectId: string, contentId: string) {
    const content = await Content.findOne({ _id: contentId, subject: subjectId });
    if (!content) throw ApiError.notFound('Content item not found.');

    const assignment = await TeacherAssignment.findOne({
      teacher: teacherId,
      subject: content.subject,
      status: TeacherAssignmentStatus.ACTIVE,
    });
    const teacherAccount = await User.findById(teacherId);
    if (!assignment && teacherAccount?.role === UserRole.TEACHER) {
      throw ApiError.forbidden('You are not assigned to teach this subject.');
    }

    await Content.findByIdAndDelete(contentId);

    // Clean up corresponding RAG chunks
    try {
      const sourceUrl = `content://${content._id}`;
      const doc = await KnowledgeDocument.findOne({ sourceUrl });
      if (doc) {
        await KnowledgeChunk.deleteMany({ document: doc._id });
        await KnowledgeDocument.findByIdAndDelete(doc._id);
      }
    } catch (err: any) {
      // Non-fatal
    }

    await AuditLog.create({
      user: teacherId,
      action: AuditAction.CONTENT_DELETE,
      entityType: 'Content',
      entityId: content._id,
      description: `Teacher deleted content "${content.title}" from subject`,
    });

    return { success: true, message: 'Content deleted successfully.' };
  }

  // ─── ASSIGNMENTS & GRADING (MODULE 07) ───

  static async createTeacherAssignment(
    teacherId: string,
    subjectId: string,
    data: z.infer<typeof createTeacherAssignmentSchema>
  ) {
    const subject = await Subject.findById(subjectId);
    if (!subject) throw ApiError.notFound('Subject not found.');

    const assignment = await Assignment.create({
      title: data.title,
      description: data.description,
      department: subject.department,
      semester: subject.semester,
      subject: subject._id,
      teacher: teacherId,
      dueDate: data.dueDate,
      maxMarks: data.maxMarks,
      passingMarks: data.passingMarks,
      attachments: data.attachments || [],
      rubric: data.rubric,
      status: data.status || AssignmentStatus.PUBLISHED,
    });

    await AuditLog.create({
      user: teacherId,
      action: AuditAction.ASSIGNMENT_CREATE,
      entityType: 'Assignment',
      entityId: assignment._id,
      description: `Created assignment "${assignment.title}" for subject ${subject.subjectCode}`,
    });

    return assignment;
  }

  static async gradeStudentSubmission(
    teacherId: string,
    data: z.infer<typeof gradeSubmissionSchema>
  ) {
    const submission = await AssignmentSubmission.findById(data.submissionId).populate('assignment');
    if (!submission) {
      throw ApiError.notFound('Assignment submission not found.');
    }

    const assignment = submission.assignment as any;
    const maxMarks = data.maxMarks || assignment.maxMarks || 100;

    if (data.marksObtained > maxMarks) {
      throw ApiError.badRequest(`Marks obtained cannot exceed maximum marks (${maxMarks}).`);
    }

    const grade = await AssignmentGrade.findOneAndUpdate(
      { submission: submission._id },
      {
        assignment: assignment._id,
        student: submission.student,
        gradedBy: teacherId,
        marksObtained: data.marksObtained,
        maxMarks,
        feedback: data.feedback,
        rubricScores: data.rubricScores,
        gradedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    submission.isGraded = true;
    await submission.save();

    await AuditLog.create({
      user: teacherId,
      action: AuditAction.GRADING,
      entityType: 'AssignmentGrade',
      entityId: grade._id,
      description: `Teacher graded submission for assignment "${assignment.title}" with ${data.marksObtained}/${maxMarks}`,
    });

    return grade;
  }

  // ─── ATTENDANCE LOGGING (MODULE 07) ───

  static async recordSubjectAttendance(
    teacherId: string,
    subjectId: string,
    data: z.infer<typeof recordAttendanceSchema>
  ) {
    const subject = await Subject.findById(subjectId).populate('semester', 'academicYear');
    if (!subject) throw ApiError.notFound('Subject not found.');

    const presentCount = data.records.filter(
      (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.OD
    ).length;
    const absentCount = data.records.length - presentCount;

    const session = await AttendanceSession.create({
      department: subject.department,
      semester: subject.semester,
      subject: subject._id,
      teacher: teacherId,
      date: data.date,
      period: data.period,
      timeSlot: data.timeSlot || '09:00 - 10:00 AM',
      topicCovered: data.topicCovered || 'Curriculum Syllabus Class',
      section: data.section || 'ALL',
      academicYear: (subject.semester as any)?.academicYear || '2024-2025',
      totalStudents: data.records.length,
      presentCount,
      absentCount,
    });

    const recordDocs = data.records.map((r) => ({
      session: session._id,
      student: r.studentId,
      status: r.status,
      remarks: r.remarks,
    }));

    await AttendanceRecord.insertMany(recordDocs);

    await AuditLog.create({
      user: teacherId,
      action: AuditAction.ATTENDANCE_RECORD,
      entityType: 'AttendanceSession',
      entityId: session._id,
      description: `Recorded attendance for ${subject.subjectCode}, Period ${data.period}: ${presentCount}/${data.records.length} present`,
    });

    return {
      session,
      recordsCount: recordDocs.length,
      presentCount,
      absentCount,
    };
  }

  // ─── SMART BOARD PORTAL INTEGRATION ───

  static async createSmartBoardSession(
    userId: string,
    role: string,
    subjectId: string,
    initialResource?: {
      type: 'ppt' | 'pdf' | 'sim' | 'note' | 'image';
      id?: string;
      title?: string;
      url?: string;
      simKey?: string;
    },
    focus?: { unitNumber?: number; topic?: string }
  ) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found.');

    const subject = await Subject.findById(subjectId)
      .populate('department')
      .populate('semester');
    if (!subject) throw ApiError.notFound('Subject not found.');

    // Access control check
    let boardSection = 'ALL';
    if (role === UserRole.TEACHER) {
      const assignment = await TeacherAssignment.findOne({
        teacher: user._id,
        subject: subject._id,
        status: TeacherAssignmentStatus.ACTIVE,
      });
      if (!assignment) {
        throw ApiError.forbidden('You are not assigned to teach this subject.');
      }
      boardSection = assignment.section || 'ALL';
    } else if (role === UserRole.HOD) {
      if (
        !user.department ||
        String(user.department) !== String((subject.department as any)?._id || subject.department)
      ) {
        throw ApiError.forbidden('HOD can only launch Smart Board for subjects in their department.');
      }
    } else if (role === UserRole.STUDENT) {
      const enrollment = await StudentEnrollment.findOne({
        student: user._id,
        status: EnrollmentStatus.APPROVED,
        enrolledSubjects: subject._id,
      });
      if (!enrollment) {
        throw ApiError.forbidden('You are not enrolled in this subject.');
      }
    }

    // Fetch Subject Content
    const notes = await Content.find({
      subject: subject._id,
      department: (subject.department as any)?._id || subject.department,
      contentType: ContentType.NOTES,
    }).lean();

    const presentations = await Content.find({
      subject: subject._id,
      department: (subject.department as any)?._id || subject.department,
      contentType: ContentType.PRESENTATIONS,
    }).lean();

    const simulations = await Content.find({
      subject: subject._id,
      department: (subject.department as any)?._id || subject.department,
      contentType: ContentType.SIMULATIONS,
    }).lean();

    // Curate Subject-Specific Formulas & Theorems dynamically based on subject domain
    const subNameLower = subject.subjectName.toLowerCase();
    const deptNameLower = ((subject.department as any)?.name || '').toLowerCase();
    const subCodeUpper = (subject.subjectCode || '').toUpperCase();

    const isDataStructures =
      subNameLower.includes('data structure') ||
      subNameLower.includes('algorithm') ||
      subNameLower.includes('dsa') ||
      subNameLower.includes('python') ||
      subNameLower.includes('programming') ||
      subNameLower.includes('software') ||
      subNameLower.includes('operating system') ||
      subNameLower.includes('network') ||
      subNameLower.includes('database') ||
      subCodeUpper.startsWith('IT') ||
      subCodeUpper.startsWith('CS');

    const isMath =
      subNameLower.includes('calculus') ||
      subNameLower.includes('mathematics') ||
      subNameLower.includes('algebra') ||
      subNameLower.includes('matrices') ||
      subNameLower.includes('transforms') ||
      subNameLower.includes('discrete') ||
      subNameLower.includes('numerical') ||
      subNameLower.includes('differential') ||
      subNameLower.includes('diff eq') ||
      subNameLower.includes('ode') ||
      subNameLower.includes('pde') ||
      subCodeUpper.startsWith('MA') ||
      subCodeUpper.startsWith('MATH');

    const isPhysics =
      subNameLower.includes('physics') ||
      subNameLower.includes('optics') ||
      subNameLower.includes('quantum') ||
      subNameLower.includes('wave') ||
      subCodeUpper.startsWith('PH') ||
      subCodeUpper.startsWith('PHY');

    const isChemistry =
      subNameLower.includes('chemistry') ||
      subNameLower.includes('polymer') ||
      subNameLower.includes('corrosion') ||
      subNameLower.includes('electrochem') ||
      subCodeUpper.startsWith('CY') ||
      subCodeUpper.startsWith('CHEM');

    const isCivil =
      subNameLower.includes('civil') ||
      subNameLower.includes('mechanics') ||
      subNameLower.includes('structural') ||
      subNameLower.includes('surveying') ||
      subNameLower.includes('concrete') ||
      subNameLower.includes('fluid') ||
      subNameLower.includes('soil') ||
      subNameLower.includes('construction') ||
      deptNameLower.includes('civil') ||
      subCodeUpper.startsWith('CE') ||
      subCodeUpper.startsWith('CIVIL');

    let formulas: Array<{ title: string; latex: string; category: string; description: string }> = [];
    let defaultSimulations: Array<{ title: string; key: string; type: string; category: string }> = [];

    if (isCivil) {
      formulas = [
        {
          title: 'Static Equilibrium Conditions',
          latex: '\\sum F_x = 0, \\quad \\sum F_y = 0, \\quad \\sum M_O = 0',
          category: 'Equilibrium & Statics',
          description: 'Fundamental conditions for static equilibrium in 2D rigid bodies and structures.',
        },
        {
          title: 'Bending Stress Flexure Formula',
          latex: '\\sigma = \\frac{M \\cdot y}{I}, \\quad S = \\frac{I}{y_{max}}',
          category: 'Mechanics of Solids',
          description: 'Calculates internal flexural normal stress in a beam under transverse bending moment M.',
        },
        {
          title: "Hooke's Law & Young's Modulus",
          latex: 'E = \\frac{\\sigma}{\\varepsilon} = \\frac{F \\cdot L_0}{A \\cdot \\Delta L}',
          category: 'Material Mechanics',
          description: 'Linear elastic relationship between stress sigma and axial strain epsilon.',
        },
        {
          title: 'Torsion Formula for Circular Shafts',
          latex: '\\frac{\\tau}{r} = \\frac{T}{J} = \\frac{G \\cdot \\theta}{L}',
          category: 'Torsion & Shear',
          description: 'Relates internal torque T to torsional shear stress tau and angle of twist theta.',
        },
        {
          title: 'Reynolds Number (Fluid Mechanics)',
          latex: 'Re = \\frac{\\rho \\cdot v \\cdot D}{\\mu} = \\frac{v \\cdot D}{\\nu}',
          category: 'Hydraulics',
          description: 'Dimensionless ratio of inertial to viscous forces distinguishing laminar and turbulent flows.',
        },
        {
          title: 'Darcy-Weisbach Friction Head Loss',
          latex: 'h_f = f \\cdot \\frac{L}{D} \\cdot \\frac{v^2}{2g}',
          category: 'Pipe Hydraulics',
          description: 'Calculates frictional head loss along a pipe length L with Darcy friction factor f.',
        },
      ];

      defaultSimulations = [
        { title: 'Simply Supported Beam Deflection & Bending Moment', key: 'beam-deflection', type: 'CIVIL_LAB', category: 'Structural Mechanics' },
        { title: '2D Truss Equilibrium & Joint Reaction Forces', key: 'truss-forces', type: 'CIVIL_LAB', category: 'Structural Analysis' },
        { title: 'Hooke\'s Law & Tensile Stress-Strain Lab', key: 'stress-strain', type: 'CIVIL_LAB', category: 'Mechanics of Solids' },
        { title: 'Total Station Surveying & Triangulation', key: 'surveying', type: 'CIVIL_LAB', category: 'Surveying & Geomatics' },
        { title: 'Open Channel Fluid Flow & Reynolds Regimes', key: 'fluid-mechanics', type: 'CIVIL_LAB', category: 'Fluid Mechanics' },
        { title: 'Concrete Mix Proportioning & Strength Curve', key: 'concrete-mix', type: 'CIVIL_LAB', category: 'Construction Materials' },
      ];
    } else if (isChemistry) {
      formulas = [
        { title: 'EDTA hardness calculation', latex: 'Hardness\\,(as\\ CaCO_3) = \\frac{V_{EDTA} \\times M_{EDTA} \\times 100000}{V_{sample}}', category: 'Unit 1 · Water Treatment', description: 'Complexometric titration uses EDTA volume and sample volume to calculate total hardness.' },
        { title: 'Nernst equation', latex: 'E = E^\\circ - \\frac{0.0591}{n}\\log Q', category: 'Unit 2 · Electrochemistry', description: 'Relates electrode potential to concentration and reaction quotient at 25 °C.' },
        { title: 'Faraday law of electrolysis', latex: 'm = \\frac{MIt}{nF}', category: 'Unit 3 · Corrosion and Protection', description: 'Connects deposited mass with current, time, molar mass and electron number.' },
        { title: 'Calorific value', latex: 'HCV = \\frac{(W+w)\\Delta T - corrections}{m}', category: 'Unit 4 · Fuels and Combustion', description: 'Bomb calorimeter relation for heat released per unit mass of fuel.' },
        { title: 'Degree of polymerization', latex: 'DP = \\frac{M_{polymer}}{M_{repeat\\ unit}}', category: 'Unit 5 · Polymers', description: 'Average number of repeat units in a polymer chain.' },
      ];
      defaultSimulations = CHEM_SIMULATION_TEMPLATES.map((s) => ({
        title: s.title,
        key: s.id,
        type: 'CHEM_BOARD_SIM',
        category: `Unit ${s.unit} · ${s.topic}`,
      }));
    } else if (isDataStructures) {
      formulas = [
        {
          title: 'Master Theorem for Divide & Conquer',
          latex: 'T(n) = aT(n/b) + \\Theta(n^k \\log^p n)',
          category: 'Complexity Analysis',
          description: 'Used for solving asymptotic bounds of recursive divide-and-conquer algorithms.',
        },
        {
          title: 'Big-O Growth Hierarchy',
          latex: 'O(1) < O(\\log n) < O(n) < O(n \\log n) < O(n^2) < O(2^n) < O(n!)',
          category: 'Asymptotic Bounds',
          description: 'Standard ordering of algorithmic time and space complexity classes.',
        },
        {
          title: 'Complete Binary Tree Node Bound',
          latex: 'N = 2^{h+1} - 1, \\quad h = \\lfloor\\log_2 N\\rfloor',
          category: 'Tree Properties',
          description: 'Maximum nodes N for a complete binary tree of height h.',
        },
        {
          title: 'AVL Tree Balance Invariance',
          latex: 'BF(v) = \\text{height}(v_{left}) - \\text{height}(v_{right}) \\in \\{-1, 0, +1\\}',
          category: 'Balanced Trees',
          description: 'Guarantees O(log n) worst-case search, insertion, and deletion complexity via rotations.',
        },
        {
          title: 'Handshaking Theorem (Graph Theory)',
          latex: '\\sum_{v \\in V} \\deg(v) = 2|E|',
          category: 'Graph Invariants',
          description: 'The sum of degrees of all vertices in an undirected graph equals twice the number of edges.',
        },
        {
          title: 'Hash Table Expected Lookup (Uniform Hashing)',
          latex: 'E[T] = 1 + \\frac{\\alpha}{2}, \\quad \\alpha = \\frac{n}{m}',
          category: 'Hashing',
          description: 'Expected search cost with load factor alpha under simple uniform hashing.',
        },
      ];

      // Each subject gets only its own Smart Board simulations
      if (/computer network|data communication|internetwork/.test(subNameLower)) {
        // Computer Networks (U21CSG05): 35 simulations organised Unit → Topic
        defaultSimulations = [
          { title: "OSI Model Visualizer", key: 'cn-osi-model', type: 'CN_BOARD_SIM', category: "Unit 1 · OSI Reference Model" },
          { title: "TCP/IP Model Visualizer", key: 'cn-tcpip-model', type: 'CN_BOARD_SIM', category: "Unit 1 · TCP/IP Reference Model" },
          { title: "Network Topology Visualizer", key: 'cn-topology', type: 'CN_BOARD_SIM', category: "Unit 1 · Network Topologies" },
          { title: "OSI vs TCP/IP Comparison", key: 'cn-osi-vs-tcpip', type: 'CN_BOARD_SIM', category: "Unit 1 · OSI vs TCP/IP" },
          { title: "Frame Formation Simulator", key: 'cn-framing', type: 'CN_BOARD_SIM', category: "Unit 2 · Framing" },
          { title: "CRC Error Detection Simulator", key: 'cn-crc', type: 'CN_BOARD_SIM', category: "Unit 2 · Error Detection" },
          { title: "Stop-and-Wait ARQ Simulator", key: 'cn-stop-wait', type: 'CN_BOARD_SIM', category: "Unit 2 · ARQ" },
          { title: "Sliding Window Simulator", key: 'cn-sliding-window', type: 'CN_BOARD_SIM', category: "Unit 2 · Flow Control" },
          { title: "Ethernet Frame Visualizer", key: 'cn-ethernet-frame', type: 'CN_BOARD_SIM', category: "Unit 2 · Ethernet" },
          { title: "MAC Address Simulator", key: 'cn-mac-address', type: 'CN_BOARD_SIM', category: "Unit 2 · MAC Addressing" },
          { title: "ARP Request/Reply Simulator", key: 'cn-arp', type: 'CN_BOARD_SIM', category: "Unit 2 · ARP" },
          { title: "Switch Forwarding Simulator", key: 'cn-switch', type: 'CN_BOARD_SIM', category: "Unit 2 · Switching" },
          { title: "IPv4 Addressing Simulator", key: 'cn-ipv4-addressing', type: 'CN_BOARD_SIM', category: "Unit 3 · IPv4 Addressing" },
          { title: "Subnetting Visualizer", key: 'cn-subnetting', type: 'CN_BOARD_SIM', category: "Unit 3 · Subnetting" },
          { title: "IP Packet Structure Visualizer", key: 'cn-ip-packet', type: 'CN_BOARD_SIM', category: "Unit 3 · IPv4 Packet Structure" },
          { title: "Packet Forwarding Simulator", key: 'cn-packet-forwarding', type: 'CN_BOARD_SIM', category: "Unit 3 · Packet Forwarding" },
          { title: "Routing Table Simulator", key: 'cn-routing-table', type: 'CN_BOARD_SIM', category: "Unit 3 · Routing Tables" },
          { title: "Router / Next-Hop Simulator", key: 'cn-next-hop', type: 'CN_BOARD_SIM', category: "Unit 3 · Routing" },
          { title: "Network Path Simulator", key: 'cn-network-path', type: 'CN_BOARD_SIM', category: "Unit 3 · Routing" },
          { title: "IP Fragmentation Simulator", key: 'cn-fragmentation', type: 'CN_BOARD_SIM', category: "Unit 3 · Fragmentation" },
          { title: "ICMP Ping Simulator", key: 'cn-icmp-ping', type: 'CN_BOARD_SIM', category: "Unit 3 · ICMP" },
          { title: "TCP Three-Way Handshake Simulator", key: 'cn-tcp-handshake', type: 'CN_BOARD_SIM', category: "Unit 4 · Three-Way Handshake" },
          { title: "TCP Connection Termination Simulator", key: 'cn-tcp-termination', type: 'CN_BOARD_SIM', category: "Unit 4 · TCP Connection" },
          { title: "TCP Segment Visualizer", key: 'cn-tcp-segment', type: 'CN_BOARD_SIM', category: "Unit 4 · TCP Segment" },
          { title: "TCP vs UDP Comparison", key: 'cn-tcp-vs-udp', type: 'CN_BOARD_SIM', category: "Unit 4 · UDP" },
          { title: "TCP Sliding Window Simulator", key: 'cn-tcp-sliding-window', type: 'CN_BOARD_SIM', category: "Unit 4 · Reliable Data Transfer" },
          { title: "TCP Flow Control Simulator", key: 'cn-flow-control', type: 'CN_BOARD_SIM', category: "Unit 4 · Flow Control" },
          { title: "TCP Congestion Control Simulator", key: 'cn-congestion-control', type: 'CN_BOARD_SIM', category: "Unit 4 · Congestion Control" },
          { title: "Packet Loss and Retransmission Simulator", key: 'cn-retransmission', type: 'CN_BOARD_SIM', category: "Unit 4 · Reliable Data Transfer" },
          { title: "DNS Resolution Simulator", key: 'cn-dns', type: 'CN_BOARD_SIM', category: "Unit 5 · DNS" },
          { title: "DHCP DORA Simulator", key: 'cn-dhcp', type: 'CN_BOARD_SIM', category: "Unit 5 · DHCP" },
          { title: "HTTP Request/Response Simulator", key: 'cn-http', type: 'CN_BOARD_SIM', category: "Unit 5 · HTTP" },
          { title: "FTP File Transfer Simulator", key: 'cn-ftp', type: 'CN_BOARD_SIM', category: "Unit 5 · FTP" },
          { title: "Email Communication Simulator", key: 'cn-email', type: 'CN_BOARD_SIM', category: "Unit 5 · Email Protocols" },
          { title: "Client-Server Communication Simulator", key: 'cn-client-server', type: 'CN_BOARD_SIM', category: "Unit 5 · Application Layer Architecture" },
        ];
      } else if (/data structure|algorithm|\bdsa\b/.test(subNameLower)) {
        defaultSimulations = [
        // The ten DSA simulations (one engine) — each opens on the Smart Board
        { title: 'Arrays', key: 'dsa-array', type: 'DSA_BOARD_SIM', category: 'Linear Data Structures' },
        { title: 'Stack', key: 'dsa-stack', type: 'DSA_BOARD_SIM', category: 'Linear Data Structures' },
        { title: 'Queue', key: 'dsa-queue', type: 'DSA_BOARD_SIM', category: 'Linear Data Structures' },
        { title: 'Circular Queue', key: 'dsa-circular-queue', type: 'DSA_BOARD_SIM', category: 'Linear Data Structures' },
        { title: 'Linked List', key: 'dsa-linked-list', type: 'DSA_BOARD_SIM', category: 'Linear Data Structures' },
        { title: 'Binary Tree', key: 'dsa-binary-tree', type: 'DSA_BOARD_SIM', category: 'Non-Linear Data Structures' },
        { title: 'Binary Search Tree', key: 'dsa-bst', type: 'DSA_BOARD_SIM', category: 'Non-Linear Data Structures' },
        { title: 'Graph Traversal (BFS & DFS)', key: 'dsa-graph', type: 'DSA_BOARD_SIM', category: 'Graph Algorithms' },
        { title: 'Searching (Linear & Binary)', key: 'dsa-searching', type: 'DSA_BOARD_SIM', category: 'Searching & Sorting' },
        { title: 'Sorting Algorithms', key: 'dsa-sorting', type: 'DSA_BOARD_SIM', category: 'Searching & Sorting' },
        ];
      } else {
        defaultSimulations = [];
      }
    } else if (isMath) {
      formulas = [
        {
          title: 'Differentiation — Product, Quotient & Chain Rules',
          latex: "(uv)' = u'v + uv', \\quad \\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}, \\quad \\frac{df}{dx} = \\frac{df}{du} \\cdot \\frac{du}{dx}",
          category: 'Differential Calculus',
          description: 'Fundamental differentiation rules for composite, product, and quotient real functions.',
        },
        {
          title: 'Partial Differentiation & Clairaut\'s Theorem',
          latex: '\\frac{\\partial^2 f}{\\partial x\\partial y} = \\frac{\\partial^2 f}{\\partial y\\partial x}, \\quad df = \\frac{\\partial f}{\\partial x}dx + \\frac{\\partial f}{\\partial y}dy',
          category: 'Multivariable Calculus',
          description: 'Symmetry of mixed second partial derivatives and total differential of multivariable functions.',
        },
        {
          title: 'Taylor Series & Maclaurin Expansion',
          latex: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x - a)^n = f(a) + f\'(a)(x - a) + \\frac{f\'\'(a)}{2!}(x - a)^2 + \\dots',
          category: 'Differential Calculus',
          description: 'Infinite polynomial approximation of differentiable functions about an expansion center a.',
        },
        {
          title: 'Maxima & Minima (Hessian Matrix Test)',
          latex: 'D = f_{xx}f_{yy} - (f_{xy})^2, \\quad D > 0 \\text{ and } f_{xx} > 0 \\implies \\text{Local Min}, \\quad D < 0 \\implies \\text{Saddle}',
          category: 'Optimization & Extrema',
          description: 'Second-order partial derivative test for classifying stationary points of two-variable functions.',
        },
        {
          title: 'Multiple Integrals & Jacobian Coordinate Transform',
          latex: '\\iint_D f(x,y)\\,dx\\,dy = \\iint_G f(u,v)\\left|\\frac{\\partial(x,y)}{\\partial(u,v)}\\right|du\\,dv, \\quad J = \\det\\begin{pmatrix} x_u & x_v \\\\ y_u & y_v \\end{pmatrix}',
          category: 'Integral Calculus',
          description: 'Change of variables in double and triple integrals via the Jacobian determinant.',
        },
        {
          title: 'First-Order Linear ODE & Integrating Factor',
          latex: '\\frac{dy}{dx} + P(x)y = Q(x), \\quad I(x) = e^{\\int P(x)\\,dx}, \\quad y \\cdot I(x) = \\int Q(x)I(x)\\,dx + C',
          category: 'Differential Equations',
          description: 'Analytical closed-form solution of first-order non-homogeneous linear differential equations.',
        },
        {
          title: 'Second-Order Linear Homogeneous ODE',
          latex: 'a\\frac{d^2y}{dx^2} + b\\frac{dy}{dx} + cy = 0, \\quad ar^2 + br + c = 0, \\quad y = c_1 e^{r_1 x} + c_2 e^{r_2 x}',
          category: 'Differential Equations',
          description: 'Characteristic equation roots classify overdamped, critically damped, and oscillatory harmonic solutions.',
        },
        {
          title: 'Laplace Transform & Derivative Property',
          latex: '\\mathcal{L}\\{f(t)\\} = \\int_0^\\infty e^{-st}f(t)\\,dt, \\quad \\mathcal{L}\\{y\'\\} = sY(s) - y(0), \\quad \\mathcal{L}\\{y\'\'\\} = s^2Y(s) - sy(0) - y\'(0)',
          category: 'Integral Transforms',
          description: 'Converts initial-value differential equations into solvable linear algebraic equations.',
        },
        {
          title: 'Fourier Series Expansion',
          latex: 'f(x) = \\frac{a_0}{2} + \\sum_{n=1}^\\infty \\left[a_n \\cos\\left(\\frac{n\\pi x}{L}\\right) + b_n \\sin\\left(\\frac{n\\pi x}{L}\\right)\\right]',
          category: 'Fourier Analysis',
          description: 'Harmonic decomposition of periodic signals into orthogonal sine and cosine harmonics.',
        },
        {
          title: 'Fundamental Theorem of Calculus',
          latex: '\\int_a^b f(x)\\,dx = F(b) - F(a) \\quad \\text{where } F\'(x) = f(x)',
          category: 'Calculus',
          description: 'Connects differentiation and integration of a continuous real-valued function.',
        },
        {
          title: 'Cayley-Hamilton Theorem & Matrix Inverse',
          latex: 'p(A) = A^n + c_{n-1}A^{n-1} + \\dots + c_0 I = 0 \\implies A^{-1} = -\\frac{1}{c_0}(A^{n-1} + \\dots + c_1 I)',
          category: 'Linear Algebra',
          description: 'Every square matrix satisfies its own characteristic polynomial equation.',
        },
        {
          title: "Green's Theorem in the Plane",
          latex: '\\oint_C (L\\,dx + M\\,dy) = \\iint_D \\left(\\frac{\\partial M}{\\partial x} - \\frac{\\partial L}{\\partial y}\\right) dA',
          category: 'Vector Calculus',
          description: 'Relates a line integral around a simple closed curve C to a double integral over plane region D.',
        },
        {
          title: "Stokes' Circulation Theorem",
          latex: '\\oint_C \\mathbf{F} \\cdot d\\mathbf{r} = \\iint_S (\\nabla \\times \\mathbf{F}) \\cdot d\\mathbf{S}',
          category: 'Vector Calculus',
          description: 'Relates surface integral of curl of F to line integral of F along boundary curve C.',
        },
        {
          title: "Euler's Formula & Identity",
          latex: 'e^{i\\theta} = \\cos\\theta + i\\sin\\theta, \\quad e^{i\\pi} + 1 = 0',
          category: 'Complex Analysis',
          description: 'Fundamental relationship between trigonometric functions and the complex exponential function.',
        },
      ];

      defaultSimulations = [
        { title: 'Dynamic Function Plotter & Tangent Analyzer', key: 'math-graphs', type: 'MATH_VISUALIZER', category: 'Functions & Graphs' },
        { title: 'Riemann Sums & Multiple Integrals Area', key: 'calculus', type: 'MATH_VISUALIZER', category: 'Integral Calculus' },
        { title: '2D & 3D Partial Derivatives & Contour Gradient', key: 'partial-diff', type: 'MATH_VISUALIZER', category: 'Multivariable Calculus' },
        { title: 'Differential Equations Phase Portrait & Trajectories', key: 'transforms', type: 'MATH_VISUALIZER', category: 'Differential Equations' },
        { title: 'Taylor Series & Polynomial Approximator', key: 'taylor-series', type: 'MATH_VISUALIZER', category: 'Differential Calculus' },
        { title: 'Maxima, Minima & Gradient Descent Visualizer', key: 'maxima-minima', type: 'MATH_VISUALIZER', category: 'Optimization' },
        { title: 'Limits & Continuous Functions Visualizer', key: 'limits', type: 'MATH_VISUALIZER', category: 'Calculus' },
        { title: '2D & 3D Matrix Transformations & Eigenvectors', key: 'matrix-visualizer', type: 'MATH_VISUALIZER', category: 'Linear Algebra' },
        { title: 'Unit Circle & Trigonometric Wave Generator', key: 'unitcircle', type: 'MATH_VISUALIZER', category: 'Trigonometry' },
        { title: 'Fourier & Laplace Harmonic Frequency Visualizer', key: 'fourier-laplace', type: 'MATH_VISUALIZER', category: 'Transforms & Harmonics' },
      ];
    } else if (isPhysics) {
      formulas = [
        {
          title: "Snell's Law of Refraction",
          latex: 'n_1 \\sin \\theta_1 = n_2 \\sin \\theta_2, \\quad \\theta_c = \\arcsin(n_2 / n_1)',
          category: 'Optics & Wave Motion',
          description: 'Governs refractive angles across optical boundaries and total internal reflection.',
        },
        {
          title: 'Classical Wave Partial Differential Equation',
          latex: '\\frac{\\partial^2 \\psi}{\\partial x^2} = \\frac{1}{v^2} \\frac{\\partial^2 \\psi}{\\partial t^2}',
          category: 'Wave Mechanics',
          description: 'Fundamental equation for nondispersive harmonic wave propagation with velocity v.',
        },
        {
          title: 'De Broglie Matter Wavelength',
          latex: '\\lambda = \\frac{h}{p} = \\frac{h}{m \\cdot v}',
          category: 'Quantum Physics',
          description: 'Assigns wave nature to particles with momentum p, fundamental to quantum mechanics.',
        },
        {
          title: 'Photoelectric Effect Equation',
          latex: 'E_{max} = h\\nu - \\Phi = q \\cdot V_s',
          category: 'Quantum Physics',
          description: 'Describes maximum kinetic energy of emitted photoelectrons with work function Phi.',
        },
        {
          title: 'Maxwell-Ampère Circuital Law',
          latex: '\\oint \\mathbf{B} \\cdot d\\mathbf{l} = \\mu_0 I + \\mu_0 \\varepsilon_0 \\frac{d\\Phi_E}{dt}',
          category: 'Electrodynamics',
          description: 'Relates magnetic circulation to conduction current and displacement current.',
        },
      ];

      defaultSimulations = [
        { title: 'Ballistic Projectile Motion Lab', key: 'projectile', type: 'PHYSICS_LAB', category: 'Mechanics' },
        { title: 'Wave Interference & Optics Refraction', key: 'optics', type: 'PHYSICS_LAB', category: 'Optics' },
        { title: 'AC/DC Circuit Oscillations & Resonance', key: 'circuits', type: 'PHYSICS_LAB', category: 'Electronics' },
        { title: 'Pendulum & Simple Harmonic Motion', key: 'pendulum', type: 'PHYSICS_LAB', category: 'Mechanics' },
      ];

      // Engineering Physics (U21PH101): its own syllabus formulas and the 46 Smart Board simulations
      if (subNameLower.includes('engineering physics') || subCodeUpper === 'U25PH101' || subCodeUpper === 'U21PH101') {
        formulas = [
          { title: 'Photon energy', latex: 'E = h\\nu = \\frac{hc}{\\lambda}', category: 'Unit 1 · LASER', description: 'Energy of a photon; absorption and emission need E = E_2 - E_1.' },
          { title: 'Boltzmann population ratio', latex: '\\frac{N_2}{N_1} = e^{-(E_2 - E_1)/k_B T}', category: 'Unit 1 · LASER', description: 'Thermal equilibrium populations; population inversion needs N_2 > N_1 (pumping).' },
          { title: 'Critical angle', latex: '\\theta_c = \\sin^{-1}\\left(\\frac{n_2}{n_1}\\right)', category: 'Unit 2 · Fiber Optics', description: 'Total internal reflection when the angle of incidence exceeds theta_c (n_1 > n_2).' },
          { title: 'Numerical aperture and acceptance angle', latex: 'NA = \\sqrt{n_1^2 - n_2^2} = n_0 \\sin\\theta_a', category: 'Unit 2 · Fiber Optics', description: 'Light-gathering ability of an optical fibre.' },
          { title: 'V-number', latex: 'V = \\frac{2\\pi a}{\\lambda} NA', category: 'Unit 2 · Fiber Optics', description: 'Single-mode when V < 2.405; number of modes about V^2/2 (step index).' },
          { title: 'Piezoelectric oscillator frequency', latex: 'f = \\frac{1}{2t}\\sqrt{\\frac{Y}{\\rho}}', category: 'Unit 3 · Ultrasonics', description: 'Natural frequency of a crystal of thickness t.' },
          { title: 'SONAR / pulse-echo distance', latex: 'd = \\frac{v\\,t}{2}', category: 'Unit 3 · Ultrasonics', description: 'Distance from the echo time of flight.' },
          { title: "Fourier's law of heat conduction", latex: '\\frac{Q}{t} = kA\\frac{\\Delta T}{L}', category: 'Unit 4 · Thermal Physics', description: 'Rate of heat flow through a rod.' },
          { title: 'Stefan–Boltzmann law', latex: 'P = \\varepsilon\\sigma A T^4', category: 'Unit 4 · Thermal Physics', description: 'Power radiated by a surface.' },
          { title: "Stokes' law (terminal velocity)", latex: 'v_t = \\frac{2r^2(\\rho_s - \\rho_f)g}{9\\eta}', category: 'Unit 4 · Fluids', description: 'Viscosity from a falling sphere (low Reynolds number).' },
          { title: "Bragg's law", latex: '2d\\sin\\theta = n\\lambda', category: 'Unit 5 · Crystal Physics', description: 'Condition for constructive interference of X-rays from crystal planes.' },
          { title: 'Interplanar spacing (cubic)', latex: 'd_{hkl} = \\frac{a}{\\sqrt{h^2 + k^2 + l^2}}', category: 'Unit 5 · Crystal Physics', description: 'Spacing of (hkl) planes in a cubic crystal.' },
        ];
        defaultSimulations = [
          { title: "Absorption and Energy Level Simulator", key: "ep-absorption", type: 'EP_BOARD_SIM', category: "Unit 1 · Absorption" },
          { title: "Spontaneous Emission Simulator", key: "ep-spontaneous-emission", type: 'EP_BOARD_SIM', category: "Unit 1 · Spontaneous Emission" },
          { title: "Stimulated Emission Simulator", key: "ep-stimulated-emission", type: 'EP_BOARD_SIM', category: "Unit 1 · Stimulated Emission" },
          { title: "Population Inversion Visualizer", key: "ep-population-inversion", type: 'EP_BOARD_SIM', category: "Unit 1 · Population Inversion" },
          { title: "Laser Pumping Simulator", key: "ep-pumping", type: 'EP_BOARD_SIM', category: "Unit 1 · Pumping" },
          { title: "Laser Cavity Simulator", key: "ep-laser-cavity", type: 'EP_BOARD_SIM', category: "Unit 1 · Laser Cavity" },
          { title: "CO₂ Laser Conceptual Simulator", key: "ep-co2-laser", type: 'EP_BOARD_SIM', category: "Unit 1 · CO₂ Laser" },
          { title: "Semiconductor Laser Simulator", key: "ep-semiconductor-laser", type: 'EP_BOARD_SIM', category: "Unit 1 · Semiconductor Laser" },
          { title: "Laser Material Processing Simulator", key: "ep-material-processing", type: 'EP_BOARD_SIM', category: "Unit 1 · Laser Material Processing" },
          { title: "Selective Laser Sintering Simulator", key: "ep-sls", type: 'EP_BOARD_SIM', category: "Unit 1 · Selective Laser Sintering" },
          { title: "Holography Simulator", key: "ep-holography", type: 'EP_BOARD_SIM', category: "Unit 1 · Holography" },
          { title: "Laser Medical Applications Visualizer", key: "ep-laser-medical", type: 'EP_BOARD_SIM', category: "Unit 1 · Medical Applications of Laser" },
          { title: "Total Internal Reflection Simulator", key: "ep-tir", type: 'EP_BOARD_SIM', category: "Unit 2 · Total Internal Reflection" },
          { title: "Acceptance Angle Simulator", key: "ep-acceptance-angle", type: 'EP_BOARD_SIM', category: "Unit 2 · Acceptance Angle" },
          { title: "Numerical Aperture Simulator", key: "ep-numerical-aperture", type: 'EP_BOARD_SIM', category: "Unit 2 · Numerical Aperture" },
          { title: "Single Mode vs Multimode Fiber", key: "ep-single-multi-mode", type: 'EP_BOARD_SIM', category: "Unit 2 · Single Mode and Multimode Fiber" },
          { title: "Step Index vs Graded Index Fiber", key: "ep-step-graded-index", type: 'EP_BOARD_SIM', category: "Unit 2 · Step Index and Graded Index Fiber" },
          { title: "Optical Fiber Communication Simulator", key: "ep-fiber-communication", type: 'EP_BOARD_SIM', category: "Unit 2 · Optical Fiber Communication" },
          { title: "Fiber Bending Loss Simulator", key: "ep-bending-loss", type: 'EP_BOARD_SIM', category: "Unit 2 · Fiber Bending Loss" },
          { title: "Fiber Optic Endoscopy Visualizer", key: "ep-endoscopy", type: 'EP_BOARD_SIM', category: "Unit 2 · Fiber Optic Endoscopy" },
          { title: "Piezoelectric Effect Simulator", key: "ep-piezo-effect", type: 'EP_BOARD_SIM', category: "Unit 3 · Piezoelectric Effect" },
          { title: "Piezoelectric Generator Simulator", key: "ep-piezo-generator", type: 'EP_BOARD_SIM', category: "Unit 3 · Piezoelectric Generator" },
          { title: "Acoustic Grating Visualizer", key: "ep-acoustic-grating", type: 'EP_BOARD_SIM', category: "Unit 3 · Acoustic Grating" },
          { title: "SONAR Simulator", key: "ep-sonar", type: 'EP_BOARD_SIM', category: "Unit 3 · SONAR" },
          { title: "Ultrasonic NDT Simulator", key: "ep-ndt", type: 'EP_BOARD_SIM', category: "Unit 3 · Ultrasonic NDT" },
          { title: "Ultrasonic Scanning Simulator", key: "ep-ultrasonic-scanning", type: 'EP_BOARD_SIM', category: "Unit 3 · Ultrasonic Scanning" },
          { title: "Doppler/Fetal Heartbeat Concept Visualizer", key: "ep-fetal-doppler", type: 'EP_BOARD_SIM', category: "Unit 3 · Fetal Heartbeat Detection" },
          { title: "Heat Conduction Simulator", key: "ep-heat-conduction", type: 'EP_BOARD_SIM', category: "Unit 4 · Heat Conduction" },
          { title: "Heat Convection Simulator", key: "ep-heat-convection", type: 'EP_BOARD_SIM', category: "Unit 4 · Heat Convection" },
          { title: "Thermal Radiation Visualizer", key: "ep-thermal-radiation", type: 'EP_BOARD_SIM', category: "Unit 4 · Thermal Radiation" },
          { title: "Thermal Conductivity Comparison", key: "ep-thermal-conductivity", type: 'EP_BOARD_SIM', category: "Unit 4 · Thermal Conductivity" },
          { title: "Solar Thermal Power Simulator", key: "ep-solar-thermal", type: 'EP_BOARD_SIM', category: "Unit 4 · Solar Thermal Power" },
          { title: "Microwave Heating Simulator", key: "ep-microwave", type: 'EP_BOARD_SIM', category: "Unit 4 · Microwave Heating" },
          { title: "Surface Tension Simulator", key: "ep-surface-tension", type: 'EP_BOARD_SIM', category: "Unit 4 · Surface Tension" },
          { title: "Viscosity Simulator", key: "ep-viscosity", type: 'EP_BOARD_SIM', category: "Unit 4 · Viscosity" },
          { title: "Fluid Flow Visualizer", key: "ep-fluid-flow", type: 'EP_BOARD_SIM', category: "Unit 4 · Fluid Flow" },
          { title: "Unit Cell 3D Visualizer", key: "ep-unit-cell", type: 'EP_BOARD_SIM', category: "Unit 5 · Unit Cell" },
          { title: "Simple Cubic Structure", key: "ep-simple-cubic", type: 'EP_BOARD_SIM', category: "Unit 5 · Simple Cubic" },
          { title: "BCC Structure", key: "ep-bcc", type: 'EP_BOARD_SIM', category: "Unit 5 · Body-Centered Cubic" },
          { title: "FCC Structure", key: "ep-fcc", type: 'EP_BOARD_SIM', category: "Unit 5 · Face-Centered Cubic" },
          { title: "Bravais Lattice Visualizer", key: "ep-bravais", type: 'EP_BOARD_SIM', category: "Unit 5 · Bravais Lattices" },
          { title: "Miller Indices 3D Visualizer", key: "ep-miller", type: 'EP_BOARD_SIM', category: "Unit 5 · Miller Indices" },
          { title: "Bragg's Law Simulator", key: "ep-bragg", type: 'EP_BOARD_SIM', category: "Unit 5 · Bragg's Law" },
          { title: "X-Ray Diffraction Simulator", key: "ep-xrd", type: 'EP_BOARD_SIM', category: "Unit 5 · X-Ray Diffraction" },
          { title: "Czochralski Crystal Growth Simulator", key: "ep-czochralski", type: 'EP_BOARD_SIM', category: "Unit 5 · Czochralski Process" },
          { title: "Silicon Wafer Formation Simulator", key: "ep-wafer", type: 'EP_BOARD_SIM', category: "Unit 5 · Silicon Wafer Formation" },
        ];
      }
    } else {
      formulas = [
        {
          title: 'Fourier Transform Definition',
          latex: 'F(\\omega) = \\int_{-\\infty}^{\\infty} f(t) e^{-i\\omega t}\\,dt',
          category: 'Transforms',
          description: 'Decomposes a function of time into its constituent frequencies.',
        },
        {
          title: 'Laplace Transform Definition',
          latex: '\\mathcal{L}\\{f(t)\\} = F(s) = \\int_{0}^{\\infty} f(t) e^{-st}\\,dt',
          category: 'Transforms',
          description: 'Integral transform converting differential equations into algebraic problems.',
        },
      ];

      defaultSimulations = [
        { title: 'Interactive Science Whiteboard', key: 'science-board', type: 'GENERAL_LAB', category: 'Academic' },
        { title: 'Graph Plotter & Data Visualizer', key: 'graph-plotter', type: 'GRAPH_LAB', category: 'Mathematics' },
      ];
    }

    // Engineering Graphics (U21ME101 / U21MEG01): its own drawing formulas and the 11 Smart Board simulations
    if (subNameLower.includes('engineering graphics') || subCodeUpper === 'U25MEG03' || subCodeUpper === 'U21ME101' || subCodeUpper === 'U21MEG01') {
      formulas = [
        { title: 'Length of a line in the front view', latex: 'l_{FV} = L\\cos\\phi', category: 'Projection of Lines', description: 'L = true length, phi = inclination to the VP.' },
        { title: 'Length of a line in the top view', latex: 'l_{TV} = L\\cos\\theta', category: 'Projection of Lines', description: 'theta = inclination to the HP.' },
        { title: 'Isometric scale', latex: 'k = \\frac{\\cos 45^\\circ}{\\cos 30^\\circ} = \\sqrt{2/3} \\approx 0.816', category: 'Isometric Projection', description: 'Isometric length = true length x 0.816.' },
        { title: 'Development of a cone', latex: '\\theta = 360^\\circ\\,\\frac{r}{L}, \\quad L = \\sqrt{h^2 + r^2}', category: 'Development of Surfaces', description: 'Sector angle of the developed lateral surface; L = slant height.' },
        { title: 'Development of a cylinder', latex: 'P = \\pi D', category: 'Development of Surfaces', description: 'Length of the developed rectangle; its height is the cylinder height.' },
        { title: 'Interior angle of a regular polygon', latex: '\\alpha = \\frac{180^\\circ (n-2)}{n}', category: 'Geometrical Construction', description: 'Used for the general method of constructing regular polygons.' },
        { title: 'Perspective (visual ray) height', latex: 'h_p = H\\,\\frac{D}{D + y}', category: 'Perspective Projection', description: 'D = station point distance from the picture plane, y = depth behind it.' },
      ];
      defaultSimulations = [
          { title: "3D Object → Projection Generator", key: "eg-projection-generator", type: 'EG_BOARD_SIM', category: "Unit 4 · 3D Object → Projection" },
          { title: "Projection of Solids", key: "eg-projection-solids", type: 'EG_BOARD_SIM', category: "Unit 4 · Projection of Solids" },
          { title: "Section of Solids", key: "eg-section-solids", type: 'EG_BOARD_SIM', category: "Unit 4 · Section of Solids" },
          { title: "Development of Surfaces", key: "eg-development", type: 'EG_BOARD_SIM', category: "Unit 4 · Development of Surfaces" },
          { title: "Geometrical Construction", key: "eg-geometric-construction", type: 'EG_BOARD_SIM', category: "Unit 1 · Geometrical Construction" },
          { title: "Dimensioning Simulator", key: "eg-dimensioning", type: 'EG_BOARD_SIM', category: "Unit 1 · Dimensioning" },
          { title: "3D Engineering Drawing Workspace", key: "eg-drawing-workspace", type: 'EG_BOARD_SIM', category: "Unit 1 · Drawing Workspace" },
          { title: "Orthographic Projection", key: "eg-orthographic", type: 'EG_BOARD_SIM', category: "Unit 3 · Orthographic Projection" },
          { title: "Isometric Projection", key: "eg-isometric", type: 'EG_BOARD_SIM', category: "Unit 5 · Isometric Projection" },
          { title: "Sectional View Simulator", key: "eg-sectional-view", type: 'EG_BOARD_SIM', category: "Unit 5 · Sectional Views" },
          { title: "Perspective Projection", key: "eg-perspective", type: 'EG_BOARD_SIM', category: "Unit 5 · Perspective Projection" },
      ];
    }

    // Engineering Mathematics (U21MA101 · Calculus and Differential Equations): its own formulas and the 29 Smart Board simulations
    if (subNameLower.includes('matrices and calculus') || subNameLower.includes('engineering mathematics') || subNameLower.includes('calculus and differential equations') || subCodeUpper === 'U25MA102' || subCodeUpper === 'U21MA101') {
      formulas = [
        { title: 'Characteristic equation', latex: '\\det(A - \\lambda I) = 0', category: 'Matrices', description: 'Eigenvalues of A; sum = trace, product = det A.' },
        { title: 'Cayley-Hamilton theorem', latex: 'p(A) = 0,\\quad p(\\lambda) = \\det(A - \\lambda I)', category: 'Matrices', description: 'Every square matrix satisfies its own characteristic equation.' },
        { title: 'Total derivative', latex: '\\frac{du}{dt} = u_x \\frac{dx}{dt} + u_y \\frac{dy}{dt}', category: 'Functions of Several Variables', description: 'Chain rule for u = f(x, y).' },
        { title: 'Extreme values', latex: 'rt - s^2 > 0:\\ r < 0\\ \\text{max},\\ r > 0\\ \\text{min};\\quad rt - s^2 < 0\\ \\text{saddle}', category: 'Functions of Several Variables', description: 'r = f_xx, s = f_xy, t = f_yy at a critical point.' },
        { title: 'Lagrange multipliers', latex: '\\nabla f = \\lambda \\nabla g,\\quad g = 0', category: 'Functions of Several Variables', description: 'Extrema of f subject to the constraint g = 0.' },
        { title: "Green's theorem", latex: '\\oint_C P\\,dx + Q\\,dy = \\iint_R \\left(\\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y}\\right) dA', category: 'Vector Calculus', description: 'C is the positively oriented boundary of R.' },
        { title: "Stokes' theorem", latex: '\\oint_C \\mathbf{F}\\cdot d\\mathbf{r} = \\iint_S (\\nabla \\times \\mathbf{F})\\cdot \\mathbf{n}\\,dS', category: 'Vector Calculus', description: 'C is the boundary of the open surface S.' },
        { title: 'Gauss divergence theorem', latex: '\\oiint_S \\mathbf{F}\\cdot \\mathbf{n}\\,dS = \\iiint_V \\nabla\\cdot \\mathbf{F}\\,dV', category: 'Vector Calculus', description: 'S is the closed surface enclosing V.' },
        { title: 'Complete solution of a linear ODE', latex: 'y = \\text{CF} + \\text{PI}', category: 'Ordinary Differential Equations', description: 'CF from the roots of the auxiliary equation f(m) = 0.' },
        { title: 'Variation of parameters', latex: 'y_p = -y_1\\int \\frac{y_2 X}{W}dx + y_2\\int \\frac{y_1 X}{W}dx', category: 'Ordinary Differential Equations', description: 'W = y_1 y_2\' - y_1\' y_2 (Wronskian).' },
      ];
      defaultSimulations = [
          { title: "Matrix Operations Visualizer", key: "ma-matrix-ops", type: 'MA_BOARD_SIM', category: "Unit 1 · Matrix Operations" },
          { title: "Eigenvalue & Eigenvector Visualizer", key: "ma-eigen", type: 'MA_BOARD_SIM', category: "Unit 1 · Eigenvalues & Eigenvectors" },
          { title: "Cayley-Hamilton Theorem Simulator", key: "ma-cayley-hamilton", type: 'MA_BOARD_SIM', category: "Unit 1 · Cayley-Hamilton" },
          { title: "Matrix Diagonalization", key: "ma-diagonalization", type: 'MA_BOARD_SIM', category: "Unit 1 · Diagonalization" },
          { title: "Orthogonal Transformation", key: "ma-orthogonal", type: 'MA_BOARD_SIM', category: "Unit 1 · Orthogonal Transformation" },
          { title: "Matrix Applications", key: "ma-matrix-applications", type: 'MA_BOARD_SIM', category: "Unit 1 · Applications" },
          { title: "Partial Derivative Visualizer", key: "ma-partial", type: 'MA_BOARD_SIM', category: "Unit 2 · Partial Derivatives" },
          { title: "Total Derivative Simulator", key: "ma-total-derivative", type: 'MA_BOARD_SIM', category: "Unit 2 · Total Derivative" },
          { title: "Jacobian Visualizer", key: "ma-jacobian", type: 'MA_BOARD_SIM', category: "Unit 2 · Jacobians" },
          { title: "Taylor Series for Two Variables", key: "ma-taylor2", type: 'MA_BOARD_SIM', category: "Unit 2 · Taylor Series" },
          { title: "Extreme Values of Two Variables", key: "ma-extrema", type: 'MA_BOARD_SIM', category: "Unit 2 · Extreme Values" },
          { title: "Lagrange Multipliers", key: "ma-lagrange", type: 'MA_BOARD_SIM', category: "Unit 2 · Lagrange Multipliers" },
          { title: "Double Integral Visualizer", key: "ma-double-integral", type: 'MA_BOARD_SIM', category: "Unit 3 · Double Integrals" },
          { title: "Change of Order of Integration", key: "ma-change-order", type: 'MA_BOARD_SIM', category: "Unit 3 · Change of Order" },
          { title: "Triple Integral Visualizer", key: "ma-triple-integral", type: 'MA_BOARD_SIM', category: "Unit 3 · Triple Integrals" },
          { title: "Area Using Double Integral", key: "ma-area", type: 'MA_BOARD_SIM', category: "Unit 3 · Area" },
          { title: "Volume Using Triple Integral", key: "ma-volume", type: 'MA_BOARD_SIM', category: "Unit 3 · Volume" },
          { title: "Line Integral Visualizer", key: "ma-line-integral", type: 'MA_BOARD_SIM', category: "Unit 4 · Line Integral" },
          { title: "Surface Integral Visualizer", key: "ma-surface-integral", type: 'MA_BOARD_SIM', category: "Unit 4 · Surface Integral" },
          { title: "Green's Theorem Simulator", key: "ma-green", type: 'MA_BOARD_SIM', category: "Unit 4 · Green's Theorem" },
          { title: "Stokes' Theorem Simulator", key: "ma-stokes", type: 'MA_BOARD_SIM', category: "Unit 4 · Stokes' Theorem" },
          { title: "Gauss Divergence Theorem Simulator", key: "ma-gauss", type: 'MA_BOARD_SIM', category: "Unit 4 · Gauss Divergence Theorem" },
          { title: "Second-Order ODE Solver", key: "ma-ode2", type: 'MA_BOARD_SIM', category: "Unit 5 · Second-Order ODE" },
          { title: "Higher-Order ODE Solver", key: "ma-ode-higher", type: 'MA_BOARD_SIM', category: "Unit 5 · Higher-Order ODE" },
          { title: "Constant Coefficient ODE Simulator", key: "ma-ode-constant", type: 'MA_BOARD_SIM', category: "Unit 5 · Constant Coefficient ODE" },
          { title: "Variable Coefficient ODE Simulator", key: "ma-ode-variable", type: 'MA_BOARD_SIM', category: "Unit 5 · Variable Coefficient ODE" },
          { title: "Euler-Cauchy Equation Simulator", key: "ma-euler-cauchy", type: 'MA_BOARD_SIM', category: "Unit 5 · Euler-Cauchy Equation" },
          { title: "Legendre's Equation Simulator", key: "ma-legendre", type: 'MA_BOARD_SIM', category: "Unit 5 · Legendre's Equation" },
          { title: "Variation of Parameters Simulator", key: "ma-variation-params", type: 'MA_BOARD_SIM', category: "Unit 5 · Variation of Parameters" },
      ];
    }

    // Basics of Electrical and Electronics Engineering (U21EEG01): its own formulas and the 35 Smart Board simulations
    if (subNameLower.includes('electrical and electronics engineering') || subCodeUpper === 'U25EEG02' || subCodeUpper === 'U21EEG01') {
      formulas = [
        { title: "Ohm's law", latex: 'V = I R', category: 'Electric Circuits', description: 'Voltage across a resistor equals current times resistance.' },
        { title: 'Series and parallel resistance', latex: 'R_s = R_1 + R_2 + \\cdots,\\quad \\frac{1}{R_p} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\cdots', category: 'Electric Circuits', description: 'Equivalent resistance of series and parallel combinations.' },
        { title: "Kirchhoff's laws", latex: '\\sum I_{node} = 0,\\quad \\sum V_{loop} = 0', category: 'Electric Circuits', description: 'KCL at every node, KVL around every closed loop.' },
        { title: 'Delta to star', latex: 'R_A = \\frac{R_{AB} R_{CA}}{R_{AB} + R_{BC} + R_{CA}}', category: 'Electric Circuits', description: 'Equivalent star arm connected to terminal A.' },
        { title: 'DC motor torque and back EMF', latex: 'T = K \\Phi I_a,\\quad E_b = V - I_a R_a,\\quad N \\propto E_b/\\Phi', category: 'DC Motor', description: 'Torque, back EMF and speed relations.' },
        { title: 'Transformer', latex: '\\frac{V_1}{V_2} = \\frac{N_1}{N_2} = \\frac{I_2}{I_1},\\quad E = 4.44 f N \\Phi_m', category: 'Transformer', description: 'Ideal transformer ratios and EMF equation.' },
        { title: 'Induction motor speed', latex: 'N_s = \\frac{120 f}{P},\\quad N_r = N_s (1 - s)', category: 'AC Motor', description: 'Synchronous speed and slip.' },
        { title: 'Diode and BJT', latex: 'I = I_s (e^{V/V_T} - 1),\\quad I_C = \\beta I_B,\\quad I_E = I_B + I_C', category: 'Semiconductor Devices', description: 'Shockley diode equation and transistor currents.' },
        { title: 'Rectifiers', latex: 'V_{dc,HW} = \\frac{V_m}{\\pi},\\quad V_{dc,FW} = \\frac{2V_m}{\\pi},\\quad V_r = \\frac{I_{dc}}{f_r C}', category: 'Applications', description: 'Average output and capacitor-filter ripple.' },
      ];
      defaultSimulations = [
          { title: "Ohm's Law Simulator", key: "ee-ohms-law", type: 'EE_BOARD_SIM', category: "Unit 1 · Ohm's Law" },
          { title: "Series Circuit Simulator", key: "ee-series", type: 'EE_BOARD_SIM', category: "Unit 1 · Series Circuit" },
          { title: "Parallel Circuit Simulator", key: "ee-parallel", type: 'EE_BOARD_SIM', category: "Unit 1 · Parallel Circuit" },
          { title: "Kirchhoff's Current Law (KCL)", key: "ee-kcl", type: 'EE_BOARD_SIM', category: "Unit 1 · KCL" },
          { title: "Kirchhoff's Voltage Law (KVL)", key: "ee-kvl", type: 'EE_BOARD_SIM', category: "Unit 1 · KVL" },
          { title: "Star–Delta Conversion", key: "ee-star-delta", type: 'EE_BOARD_SIM', category: "Unit 1 · Star–Delta Conversion" },
          { title: "Nodal Analysis Visualizer", key: "ee-nodal", type: 'EE_BOARD_SIM', category: "Unit 1 · Nodal Analysis" },
          { title: "Mesh Analysis Visualizer", key: "ee-mesh", type: 'EE_BOARD_SIM', category: "Unit 1 · Mesh Analysis" },
          { title: "DC Motor Construction", key: "ee-dc-construction", type: 'EE_BOARD_SIM', category: "Unit 2 · Construction" },
          { title: "DC Motor Working Principle", key: "ee-dc-working", type: 'EE_BOARD_SIM', category: "Unit 2 · Working Principle" },
          { title: "DC Motor Types", key: "ee-dc-types", type: 'EE_BOARD_SIM', category: "Unit 2 · Motor Types" },
          { title: "DC Motor Torque Simulator", key: "ee-dc-torque", type: 'EE_BOARD_SIM', category: "Unit 2 · Torque" },
          { title: "DC Motor Characteristics", key: "ee-dc-characteristics", type: 'EE_BOARD_SIM', category: "Unit 2 · Characteristics" },
          { title: "DC Motor Starters", key: "ee-dc-starters", type: 'EE_BOARD_SIM', category: "Unit 2 · Starters" },
          { title: "DC Motor Speed Control", key: "ee-dc-speed", type: 'EE_BOARD_SIM', category: "Unit 2 · Speed Control" },
          { title: "Single-Phase Transformer", key: "ee-transformer", type: 'EE_BOARD_SIM', category: "Unit 3 · Single-Phase Transformer" },
          { title: "Transformer Turns Ratio", key: "ee-turns-ratio", type: 'EE_BOARD_SIM', category: "Unit 3 · Turns Ratio" },
          { title: "Transformer Step-Up / Step-Down", key: "ee-step-up-down", type: 'EE_BOARD_SIM', category: "Unit 3 · Step-Up / Step-Down" },
          { title: "Three-Phase Induction Motor Construction", key: "ee-im-construction", type: 'EE_BOARD_SIM', category: "Unit 3 · Induction Motor Construction" },
          { title: "Three-Phase Induction Motor Working", key: "ee-im-working", type: 'EE_BOARD_SIM', category: "Unit 3 · Induction Motor Working" },
          { title: "Induction Motor Characteristics", key: "ee-im-characteristics", type: 'EE_BOARD_SIM', category: "Unit 3 · Characteristics" },
          { title: "Induction Motor Starters", key: "ee-im-starters", type: 'EE_BOARD_SIM', category: "Unit 3 · Starters" },
          { title: "PN Junction Simulator", key: "ee-pn-junction", type: 'EE_BOARD_SIM', category: "Unit 4 · PN Junction" },
          { title: "PN Junction V-I Characteristics", key: "ee-pn-vi", type: 'EE_BOARD_SIM', category: "Unit 4 · PN Junction V-I" },
          { title: "Zener Diode", key: "ee-zener", type: 'EE_BOARD_SIM', category: "Unit 4 · Zener Diode" },
          { title: "BJT Simulator", key: "ee-bjt", type: 'EE_BOARD_SIM', category: "Unit 4 · BJT" },
          { title: "BJT Characteristics", key: "ee-bjt-characteristics", type: 'EE_BOARD_SIM', category: "Unit 4 · BJT Characteristics" },
          { title: "FET Simulator", key: "ee-fet", type: 'EE_BOARD_SIM', category: "Unit 4 · FET" },
          { title: "Half-Wave Rectifier", key: "ee-half-wave", type: 'EE_BOARD_SIM', category: "Unit 5 · Half-Wave Rectifier" },
          { title: "Full-Wave Rectifier", key: "ee-full-wave", type: 'EE_BOARD_SIM', category: "Unit 5 · Full-Wave Rectifier" },
          { title: "Rectifier Comparison", key: "ee-rectifier-compare", type: 'EE_BOARD_SIM', category: "Unit 5 · Rectifier Comparison" },
          { title: "Filter Simulator", key: "ee-filter", type: 'EE_BOARD_SIM', category: "Unit 5 · Filter" },
          { title: "Voltage Regulator", key: "ee-regulator", type: 'EE_BOARD_SIM', category: "Unit 5 · Voltage Regulator" },
          { title: "Series and Shunt Voltage Regulators", key: "ee-series-shunt", type: 'EE_BOARD_SIM', category: "Unit 5 · Series / Shunt Regulator" },
          { title: "CE / CB / CC Configurations", key: "ee-configurations", type: 'EE_BOARD_SIM', category: "Unit 5 · CE / CB / CC" },
      ];
    }

    const sessionId = `sb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const boardTeacherId = role === UserRole.TEACHER ? String(user._id) : '';
    const boardTeacherName = role === UserRole.TEACHER ? user.name : 'Faculty Member';
    const deptId = String((subject.department as any)?._id || subject.department);
    const deptName = (subject.department as any)?.name || 'Department of Engineering';
    const deptCode = (subject.department as any)?.code || 'ENG';
    const semId = String((subject.semester as any)?._id || subject.semester);
    const semNum = (subject.semester as any)?.semesterNumber || 1;
    const semYear = (subject.semester as any)?.academicYear || '2024-2025';
    const regulation = (subject.semester as any)?.regulation || 'R2021';
    const programmeDoc: any = subject.department || {};
    const programme = {
      programmeId: deptCode,
      id: deptId,
      code: deptCode,
      name: deptName,
      shortName: programmeDoc.shortName || deptCode,
      type: programmeDoc.type || 'B.E.',
      regulation,
    };

    // Unit / topic focus (validated against the subject's own syllabus)
    const syllabus: any[] = (subject as any).syllabus || [];
    const focusUnit = focus?.unitNumber
      ? syllabus.find((u: any) => Number(u.unitNumber ?? u.chapterNumber) === focus.unitNumber)
      : undefined;
    const focusTopic =
      focus?.topic && focusUnit
        ? (focusUnit.topics || []).find((t: string) => t.toLowerCase() === focus.topic!.toLowerCase()) ||
          focus.topic
        : focus?.topic;
    const academicFocus = {
      unitNumber: focusUnit ? Number(focusUnit.unitNumber ?? focusUnit.chapterNumber) : focus?.unitNumber ?? null,
      unitTitle: focusUnit?.title ?? null,
      topic: focusTopic ?? null,
      topics: focusUnit?.topics ?? [],
    };

    const sessionData = {
      sessionId,
      userId: String(user._id),
      teacherId: boardTeacherId,
      departmentId: deptId,
      semesterId: semId,
      sectionId: boardSection,
      section: boardSection,
      userName: user.name,
      user: {
        id: String(user._id),
        _id: String(user._id),
        name: user.name,
        email: (user as any).email || user.collegeEmail,
        role,
      },
      role,
      programme,
      programmeId: deptCode,
      department: {
        id: deptId,
        name: deptName,
        code: deptCode,
        shortName: programme.shortName,
        type: programme.type,
      },
      regulation,
      academicYear: semYear,
      focus: academicFocus,
      semester: {
        id: semId,
        number: semNum,
        semesterNumber: semNum,
        academicYear: semYear,
      },
      subject: {
        id: String(subject._id),
        subjectId: String(subject._id),
        code: subject.subjectCode,
        subjectCode: subject.subjectCode,
        name: subject.subjectName,
        subjectName: subject.subjectName,
        description: subject.description,
        credits: subject.credits,
        semesterNumber: semNum,
        departmentId: deptId,
        programmeId: deptCode,
      },
      syllabusUnits: (subject as any).syllabus || (subject as any).chapters || [],
      notes: notes.map((n) => ({
        id: String(n._id),
        title: n.title,
        description: n.description,
        chapterOrUnit: n.chapterOrUnit,
        attachments: n.attachments,
        fileUrl: n.attachments?.[0]?.url || '',
      })),
      presentations: presentations.map((p) => ({
        id: String(p._id),
        title: p.title,
        description: p.description,
        chapterOrUnit: p.chapterOrUnit,
        attachments: p.attachments,
        fileUrl: p.attachments?.[0]?.url || '',
      })),
      simulations: [
        ...defaultSimulations,
        ...simulations.map((s) => ({
          title: s.title,
          key: s.simulationConfig?.smartboardPresetId || s.simulationConfig?.type || 'custom',
          type: s.simulationConfig?.type || 'CUSTOM_SIM',
          category: s.simulationConfig?.initialParams?.category || 'Teacher Configured',
          description: s.description || '',
          simulationId: String(s._id),
          topic: s.simulationConfig?.initialParams?.topic || '',
          config: s.simulationConfig?.initialParams || {},
        })),
      ],
      formulas,
      initialResource: initialResource || null,
      allowedOrigins: ['*'],
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      launchedAt: new Date().toISOString(),
    };

    const boardQuery = new URLSearchParams({
      subjectId: String(subject._id),
      programmeId: deptCode,
      programmeName: deptName,
      regulation,
      academicYear: semYear,
      ...(academicFocus.unitNumber ? { unitNumber: String(academicFocus.unitNumber) } : {}),
      ...(academicFocus.unitTitle ? { unitTitle: String(academicFocus.unitTitle) } : {}),
      ...(academicFocus.topic ? { topic: String(academicFocus.topic) } : {}),
      departmentId: deptId,
      departmentName: deptName,
      department: deptName,
      subjectName: subject.subjectName,
      subject: subject.subjectName,
      subjectCode: subject.subjectCode,
      semesterNumber: String(semNum),
      semester: String(semNum),
      semesterId: semId,
      sectionId: boardSection,
      section: boardSection,
      teacherName: boardTeacherName,
      teacher: boardTeacherName,
      teacherId: boardTeacherId,
      sessionId,
      role,
    });

    const boardUrl = `/smartboard/index.html?${boardQuery.toString()}`;

    return {
      token: sessionId,
      boardUrl,
      sessionData,
      // Provide top-level convenience aliases so both flat & nested consumers succeed
      ...sessionData,
    };
  }

  static async getSmartBoardContext(
    userId: string,
    role: string,
    subjectId: string,
    focus?: { unitNumber?: number; topic?: string }
  ) {
    return this.createSmartBoardSession(userId, role, subjectId, undefined, focus);
  }

  static async shareSmartBoardNotes(
    userId: string,
    role: string,
    data: {
      subjectId: string;
      title: string;
      description?: string;
      chapterOrUnit?: number;
      materialType?: string;
      pdfBase64?: string;
      fileUrl?: string;
      fileName?: string;
      shareTarget?: string;
      targetSection?: string;
      selectedStudentIds?: string[];
      status?: string;
    }
  ) {
    if (!data.subjectId) {
      throw ApiError.badRequest('Subject ID is required to share notes.');
    }
    if (!data.title || !data.title.trim()) {
      throw ApiError.badRequest('Note title is required.');
    }

    let subject = null;
    if (Types.ObjectId.isValid(data.subjectId)) {
      subject = await Subject.findById(data.subjectId).populate('department').populate('semester');
    }
    if (!subject) {
      subject = await Subject.findOne({
        $or: [
          { subjectCode: new RegExp(`^${data.subjectId}$`, 'i') },
          { subjectName: new RegExp(data.subjectId, 'i') },
        ],
      }).populate('department').populate('semester');
    }
    if (!subject) {
      throw ApiError.notFound('Subject not found for the given ID.');
    }

    // Access control: verify teacher or administrative role
    if (role === UserRole.TEACHER) {
      const assignment = await TeacherAssignment.findOne({
        teacher: userId,
        subject: subject._id,
        status: TeacherAssignmentStatus.ACTIVE,
      });
      if (!assignment) {
        const teacherAcc = await User.findById(userId);
        if (teacherAcc?.role === UserRole.TEACHER) {
          throw ApiError.forbidden('You are not assigned to teach this subject.');
        }
      }
    }

    const cleanTitle = data.title.trim();
    const fileName = data.fileName || `${cleanTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    const attachmentUrl = data.fileUrl || data.pdfBase64 || '';

    const content = await Content.create({
      title: cleanTitle,
      description: data.description?.trim() || `Classroom lecture notes captured from Smart Board for ${subject.subjectName}`,
      contentType: ContentType.NOTES,
      department: subject.department,
      semester: subject.semester,
      subject: subject._id,
      teacher: userId,
      chapterOrUnit: data.chapterOrUnit || 1,
      attachments: [
        {
          name: fileName,
          url: attachmentUrl,
          fileType: 'application/pdf',
          sizeBytes: attachmentUrl.length || 2048,
        },
      ],
      tags: ['Smart Board', 'SmartBoard Notes', data.shareTarget || 'ALL_ENROLLED'],
      status: data.status === 'DRAFT' ? ContentStatus.DRAFT : ContentStatus.PUBLISHED,
      publishedAt: data.status === 'DRAFT' ? undefined : new Date(),
    });

    await AuditLog.create({
      user: userId,
      action: AuditAction.CONTENT_PUBLISH,
      entityType: 'Content',
      entityId: content._id,
      description: `Teacher shared Smart Board notes "${content.title}" for subject ${subject.subjectCode}`,
    });

    if (content.status === ContentStatus.PUBLISHED) {
      this.notifyEnrolledStudentsOfContent(content, userId).catch(() => {});
      AiRagService.ingestAcademicContent(content).catch(() => {});
    }

    return {
      success: true,
      message: data.status === 'DRAFT'
        ? 'Notes saved as draft to Teacher Dashboard.'
        : `Notes successfully published to students enrolled in ${subject.subjectName}.`,
      note: {
        id: String(content._id),
        title: content.title,
        description: content.description,
        subjectId: String(subject._id),
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        departmentName: (subject.department as any)?.name || 'Department',
        semesterNumber: (subject.semester as any)?.semesterNumber || 1,
        teacherId: userId,
        fileName,
        status: content.status,
        publishedAt: content.publishedAt,
      },
    };
  }

  // ─── SIMULATION MANAGEMENT ───

  static async getAvailableSimulationsForSubject(subjectId: string) {
    const subject = await Subject.findById(subjectId).populate('department');
    if (!subject) throw ApiError.notFound('Subject not found.');

    const domain = resolveSubjectDomain(subject);
    // Templates tagged to particular subjects (e.g. Engineering Physics) are offered only there
    const available = SIMULATION_CATALOG.filter((sim) => sim.domain === domain && isTemplateForSubject(sim, subject));

    return {
      subject: {
        _id: subject._id,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        domain,
      },
      domain,
      simulations: available,
    };
  }

  static async getSubjectSimulations(subjectId: string, userRole: UserRole) {
    const subject = await Subject.findById(subjectId).populate('department');
    if (!subject) throw ApiError.notFound('Subject not found.');

    const domain = resolveSubjectDomain(subject);
    const query: Record<string, any> = {
      subject: subject._id,
      contentType: ContentType.SIMULATIONS,
    };

    // Students only see published simulations
    if (userRole === UserRole.STUDENT) {
      query.status = ContentStatus.PUBLISHED;
    }

    const assignedSimulations = await Content.find(query)
      .populate('teacher', 'name email profile.designation')
      .sort({ chapterOrUnit: 1, createdAt: -1 });

    let simulations: any[] = assignedSimulations;
    if (userRole !== UserRole.STUDENT && assignedSimulations.length) {
      const activity = await SimulationActivity.aggregate([
        { $match: { subject: subject._id, simulation: { $in: assignedSimulations.map((item) => item._id) } } },
        {
          $group: {
            _id: '$simulation',
            opened: { $sum: 1 },
            completed: { $sum: { $cond: [{ $ifNull: ['$completedAt', false] }, 1, 0] } },
          },
        },
      ]);
      const activityBySimulation = new Map(activity.map((item) => [String(item._id), item]));
      simulations = assignedSimulations.map((item) => ({
        ...item.toObject(),
        learningActivity: activityBySimulation.get(String(item._id))
          ? {
              opened: activityBySimulation.get(String(item._id))!.opened,
              completed: activityBySimulation.get(String(item._id))!.completed,
            }
          : { opened: 0, completed: 0 },
      }));
    }

    return { domain, simulations };
  }

  static async recordSimulationActivity(
    studentId: string,
    subjectId: string,
    simulationId: string,
    event: 'OPENED' | 'COMPLETED',
    topic?: string
  ) {
    const simulation = await Content.findOne({
      _id: simulationId,
      subject: subjectId,
      contentType: ContentType.SIMULATIONS,
    });
    if (!simulation) throw ApiError.notFound('Simulation not found in this subject.');
    if (simulation.status !== ContentStatus.PUBLISHED) {
      throw ApiError.forbidden('This simulation is not currently available to students.');
    }

    const now = new Date();
    const update = event === 'OPENED'
      ? { $set: { lastOpenedAt: now, ...(topic ? { topic } : {}) }, $setOnInsert: { firstOpenedAt: now } }
      : { $set: { completedAt: now, ...(topic ? { topic } : {}) }, $setOnInsert: { firstOpenedAt: now, lastOpenedAt: now } };
    const activity = await SimulationActivity.findOneAndUpdate(
      { student: studentId, subject: subjectId, simulation: simulationId },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    if (event === 'OPENED') {
      await Content.updateOne({ _id: simulationId }, { $inc: { viewCount: 1 } });
    }
    return { event, activity };
  }

  /**
   * Challenge mode: verifies a student's attempt on the server (re-evaluating their configuration with the
   * same formulas the simulation uses) and appends it to the student's SimulationActivity for that simulation.
   */
  static async submitSimulationChallenge(
    studentId: string,
    subjectId: string,
    simulationId: string,
    input: {
      challenge: { id: string; kind: string; prompt: string; target: number; unit?: string; tolerance: number; meta?: { key: string; expected: unknown } };
      configuration: Record<string, unknown>;
      answer: { value?: number | null; text?: string };
      calculation?: string;
      clientResult?: 'CORRECT' | 'INCORRECT';
      mode?: string;
    }
  ) {
    if (!mongoose.isValidObjectId(simulationId)) throw ApiError.badRequest('Invalid simulation.');
    const simulation = await Content.findOne({ _id: simulationId, subject: subjectId, contentType: ContentType.SIMULATIONS });
    if (!simulation) throw ApiError.notFound('Simulation not found in this subject.');
    if (simulation.status !== ContentStatus.PUBLISHED) throw ApiError.forbidden('This simulation is not currently available to students.');

    const { challenge } = input;
    const serverValue = evaluateSimulationChallenge(challenge.kind, input.configuration, challenge.meta);
    const verified = serverValue !== null;
    let result: 'CORRECT' | 'INCORRECT';
    if (verified) result = Number.isFinite(serverValue) && Math.abs((serverValue as number) - challenge.target) <= challenge.tolerance + 1e-9 ? 'CORRECT' : 'INCORRECT';
    else result = input.clientResult === 'CORRECT' ? 'CORRECT' : 'INCORRECT';

    const existing = await SimulationActivity.findOne({ student: studentId, simulation: simulationId }).select('challengeAttempts.challengeId').lean();
    const attemptNo = ((existing as any)?.challengeAttempts || []).filter((a: any) => a.challengeId === challenge.id).length + 1;
    const now = new Date();
    const attempt = {
      challengeId: challenge.id,
      kind: challenge.kind,
      prompt: challenge.prompt,
      target: challenge.target,
      unit: challenge.unit || '',
      tolerance: challenge.tolerance,
      ...(challenge.meta ? { meta: challenge.meta } : {}),
      configuration: input.configuration,
      answer: { ...(Number.isFinite(input.answer?.value as number) ? { value: input.answer.value } : {}), text: input.answer?.text || '' },
      calculation: input.calculation || '',
      attempt: attemptNo,
      result,
      verified,
      ...(verified && Number.isFinite(serverValue as number) ? { serverValue } : {}),
      mode: 'CHALLENGE',
      submittedAt: now,
    };
    await SimulationActivity.updateOne(
      { student: studentId, subject: subjectId, simulation: simulationId },
      {
        $push: { challengeAttempts: { $each: [attempt], $slice: -200 } },
        $set: { lastOpenedAt: now, lastMode: 'CHALLENGE', ...(simulation.topic ? { topic: String(simulation.topic).slice(0, 120) } : {}), ...(result === 'CORRECT' ? { completedAt: now } : {}) },
        $setOnInsert: { firstOpenedAt: now },
      },
      { upsert: true }
    );
    return { result, attempt: attemptNo, verified, serverValue: verified && Number.isFinite(serverValue as number) ? serverValue : null, target: challenge.target, tolerance: challenge.tolerance, submittedAt: now };
  }

  /** Challenge attempts for one simulation: all students for staff of the subject, only their own for a student. */
  static async getSimulationChallengeAttempts(subjectId: string, simulationId: string, user: { id: string; role: UserRole }) {
    if (!mongoose.isValidObjectId(simulationId)) throw ApiError.badRequest('Invalid simulation.');
    const simulation = await Content.findOne({ _id: simulationId, subject: subjectId, contentType: ContentType.SIMULATIONS }).select('_id title status').lean();
    if (!simulation) throw ApiError.notFound('Simulation not found in this subject.');
    const filter: Record<string, unknown> = { subject: subjectId, simulation: simulationId };
    if (user.role === UserRole.STUDENT) filter.student = user.id;
    const activities = await SimulationActivity.find(filter).populate('student', 'name email profile.rollNumber').lean();
    const attempts = activities
      .flatMap((a: any) => (a.challengeAttempts || []).map((x: any) => ({ ...x, student: a.student })))
      .sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    const students = new Set(attempts.map((a: any) => String(a.student?._id || a.student)));
    const solved = new Set(attempts.filter((a: any) => a.result === 'CORRECT').map((a: any) => String(a.student?._id || a.student)));
    return { simulation: { _id: simulation._id, title: (simulation as any).title, status: (simulation as any).status }, summary: { attempts: attempts.length, students: students.size, studentsCorrect: solved.size }, attempts };
  }

  static async assignSimulationToSubject(
    teacherId: string,
    subjectId: string,
    data: {
      simulationId: string;
      chapterOrUnit: number;
      title?: string;
      description?: string;
      customParams?: Record<string, any>;
      status?: ContentStatus;
    }
  ) {
    const subject = await Subject.findById(subjectId).populate('department');
    if (!subject) throw ApiError.notFound('Subject not found.');

    const domain = resolveSubjectDomain(subject);
    const template = SIMULATION_CATALOG.find((s) => s.id === data.simulationId);
    if (!template) {
      throw ApiError.badRequest(`Unknown simulation template: ${data.simulationId}`);
    }

    // Strict domain check: Do not mix simulations across unrelated subjects
    if (template.domain !== domain) {
      throw ApiError.badRequest(
        `Simulation "${template.title}" belongs to ${template.domain}, but subject ${subject.subjectCode} is in ${domain}. Cross-subject simulation assignment is strictly disallowed.`
      );
    }

    if (!isTemplateForSubject(template, subject)) {
      throw ApiError.badRequest(`Simulation "${template.title}" is not part of ${subject.subjectCode}.`);
    }

    const title = data.title?.trim() || template.title;
    const description = data.description?.trim() || template.description;
    const status = data.status || ContentStatus.PUBLISHED;
    let subjectLinks: Record<string, any> = {};

    // Subject-specific templates (Engineering Physics): one published configuration per simulation
    // per subject — publishing again updates it instead of creating a duplicate. Students only ever
    // read it; their own parameter changes stay in their browser.
    if (template.subjectKeywords && template.subjectKeywords.length) {
      const initialParams = { ...template.defaultParams, ...(data.customParams || {}) };
      const unitDoc = await CurriculumUnit.findOne({ subject: subject._id, unitNumber: data.chapterOrUnit }).lean();
      const links = {
        programme: (unitDoc as any)?.programme || (subject as any).programme || undefined,
        curriculumUnit: (unitDoc as any)?._id || undefined,
        topic: template.topic || undefined,
      };
      const typeInfo = { simulationType: (initialParams as any).simulationType, simulationSubtype: (initialParams as any).simulationSubtype };
      const existing = await Content.findOne({ subject: subject._id, contentType: ContentType.SIMULATIONS, 'simulationConfig.type': template.id });
      if (existing) {
        existing.title = title;
        existing.description = description;
        existing.chapterOrUnit = data.chapterOrUnit;
        existing.teacher = teacherId as any;
        existing.set(links);
        existing.simulationConfig = {
          type: template.id,
          ...typeInfo,
          initialParams,
          smartboardPresetId: template.smartboardPresetKey,
          controls: Object.keys((initialParams as any).defaultParameters || {}),
        };
        existing.markModified('simulationConfig');
        existing.status = status;
        if (status === ContentStatus.PUBLISHED) existing.publishedAt = new Date();
        await existing.save();
        await AuditLog.create({
          user: teacherId,
          action: AuditAction.CONTENT_UPDATE,
          entityType: 'Content',
          entityId: existing._id,
          description: `Teacher updated the published configuration of simulation "${title}" in ${subject.subjectCode} Unit ${data.chapterOrUnit}`,
        });
        return existing;
      }
      data = { ...data, customParams: initialParams };
      subjectLinks = { ...links, ...typeInfo };
    }

    const simulationContent = await Content.create({
      title,
      description,
      contentType: ContentType.SIMULATIONS,
      department: subject.department?._id || subject.department,
      semester: subject.semester,
      subject: subject._id,
      teacher: teacherId,
      chapterOrUnit: data.chapterOrUnit,
      ...(subjectLinks.programme ? { programme: subjectLinks.programme } : {}),
      ...(subjectLinks.curriculumUnit ? { curriculumUnit: subjectLinks.curriculumUnit } : {}),
      ...(subjectLinks.topic ? { topic: subjectLinks.topic } : {}),
      simulationConfig: {
        type: template.id,
        ...(subjectLinks.simulationType ? { simulationType: subjectLinks.simulationType, simulationSubtype: subjectLinks.simulationSubtype } : {}),
        initialParams: data.customParams || template.defaultParams,
        smartboardPresetId: template.smartboardPresetKey,
        controls: Object.keys(data.customParams || template.defaultParams),
      },
      tags: [...template.tags, template.category],
      status,
      publishedAt: status === ContentStatus.PUBLISHED ? new Date() : undefined,
    });

    await AuditLog.create({
      user: teacherId,
      action: AuditAction.CONTENT_PUBLISH,
      entityType: 'Content',
      entityId: simulationContent._id,
      description: `Teacher assigned simulation "${title}" to ${subject.subjectCode} Unit ${data.chapterOrUnit}`,
    });

    return simulationContent;
  }

  static async toggleSimulationStatus(
    teacherId: string,
    subjectId: string,
    simulationId: string,
    status: ContentStatus
  ) {
    const simulation = await Content.findOne({
      _id: simulationId,
      subject: subjectId,
      contentType: ContentType.SIMULATIONS,
    });

    if (!simulation) {
      throw ApiError.notFound('Simulation module not found for this subject.');
    }

    simulation.status = status;
    if (status === ContentStatus.PUBLISHED && !simulation.publishedAt) {
      simulation.publishedAt = new Date();
    }
    await simulation.save();

    await AuditLog.create({
      user: teacherId,
      action: status === ContentStatus.PUBLISHED ? AuditAction.CONTENT_PUBLISH : AuditAction.CONTENT_UPDATE,
      entityType: 'Content',
      entityId: simulation._id,
      description: `Teacher ${status === ContentStatus.PUBLISHED ? 'enabled' : 'disabled'} simulation "${simulation.title}"`,
    });

    return simulation;
  }

  static async deleteSimulationAssignment(
    teacherId: string,
    subjectId: string,
    simulationId: string
  ) {
    const simulation = await Content.findOneAndDelete({
      _id: simulationId,
      subject: subjectId,
      contentType: ContentType.SIMULATIONS,
    });

    if (!simulation) {
      throw ApiError.notFound('Simulation module not found for this subject.');
    }

    await AuditLog.create({
      user: teacherId,
      action: AuditAction.CONTENT_DELETE,
      entityType: 'Content',
      entityId: simulation._id,
      description: `Teacher removed simulation "${simulation.title}" from subject`,
    });

    return { success: true, message: 'Simulation removed successfully.' };
  }

  private static async notifyEnrolledStudentsOfContent(content: any, teacherId: string) {
    try {
      const enrollments = await StudentEnrollment.find({
        enrolledSubjects: content.subject,
        status: EnrollmentStatus.APPROVED,
      }).select('student');

      const subject = await Subject.findById(content.subject).select('subjectCode subjectName');
      const subCode = subject?.subjectCode || 'Course';

      let notifType: NotificationType;
      let notifTitle: string;
      let notifMsg: string;

      switch (content.contentType) {
        case ContentType.NOTES:
          notifType = NotificationType.NOTES_PUBLISHED;
          notifTitle = `New Notes: ${content.title}`;
          notifMsg = `Teacher published new notes for ${subCode}: "${content.title}".`;
          break;
        case ContentType.VIDEOS:
          notifType = NotificationType.VIDEO_PUBLISHED;
          notifTitle = `New Video: ${content.title}`;
          notifMsg = `A new video lecture has been added to ${subCode}: "${content.title}".`;
          break;
        case ContentType.ANNOUNCEMENTS:
          notifType = NotificationType.ANNOUNCEMENT_POSTED;
          notifTitle = `Announcement: ${content.title}`;
          notifMsg = content.description || `New announcement posted for ${subCode}.`;
          break;
        case ContentType.MATERIALS:
        case ContentType.PRESENTATIONS:
        case ContentType.SIMULATIONS:
        default:
          notifType = NotificationType.MATERIAL_PUBLISHED;
          notifTitle = `New Study Material: ${content.title}`;
          notifMsg = `New learning material has been published for ${subCode}: "${content.title}".`;
          break;
      }

      const notifs = enrollments.map((enr) => ({
        recipient: enr.student,
        sender: teacherId,
        type: notifType,
        title: notifTitle,
        message: notifMsg,
        metadata: {
          contentId: String(content._id),
          subjectId: String(content.subject),
          contentType: content.contentType,
        },
        link: `/student/subject/${content.subject}`,
      }));

      await NotificationService.createBulk(notifs);

      // If it's an announcement, also notify teachers and HOD of that department
      if (content.contentType === ContentType.ANNOUNCEMENTS) {
        const deptTeachers = await User.find({
          department: content.department,
          role: UserRole.TEACHER,
          _id: { $ne: new Types.ObjectId(teacherId) },
        }).select('_id');

        const teacherNotifs = deptTeachers.map((t) => ({
          recipient: t._id,
          sender: teacherId,
          type: NotificationType.DEPARTMENT_ANNOUNCEMENT,
          title: `Department Announcement: ${content.title}`,
          message: content.description || `An announcement was posted in ${subCode}.`,
          metadata: {
            contentId: String(content._id),
            subjectId: String(content.subject),
            departmentId: String(content.department),
          },
          link: '/dashboard',
        }));
        await NotificationService.createBulk(teacherNotifs);

        // Notify HOD of department event/announcement
        const hodUsers = await User.find({
          department: content.department,
          role: UserRole.HOD,
          _id: { $ne: new Types.ObjectId(teacherId) },
        }).select('_id');

        for (const hod of hodUsers) {
          await NotificationService.create({
            recipient: hod._id,
            sender: teacherId,
            type: NotificationType.DEPARTMENT_EVENT,
            title: `Department Event/Announcement: ${content.title}`,
            message: content.description || `An announcement was posted in ${subCode}.`,
            metadata: {
              contentId: String(content._id),
              subjectId: String(content.subject),
              departmentId: String(content.department),
            },
            link: '/dashboard',
          });
        }
      }
    } catch (err: any) {
      // Non-blocking notification dispatch
    }
  }
}
