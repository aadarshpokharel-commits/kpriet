import mongoose, { Types } from 'mongoose';
import {
  Department,
  User,
  Subject,
  Programme,
  Semester,
  Content,
  Quiz,
  QuizAttempt,
  Assignment,
  AssignmentSubmission,
  AttendanceSession,
  AttendanceRecord,
  StudentEnrollment,
  TeacherAssignment,
  AuditLog,
} from '../models/index.js';
import {
  AccountStatus,
  ApprovalStatus,
  AuditAction,
  ContentStatus,
  EnrollmentStatus,
  TeacherAssignmentStatus,
  UserRole,
} from '../types/academic.types.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  departmentId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export class AdminService {
  /**
   * Institution-level master overview containing live counts and health metrics.
   * Aggregates live data directly from MongoDB with zero mock data.
   */
  static async getInstitutionOverview() {
    const [
      totalDepartments,
      activeDepartments,
      totalFaculty,
      approvedFaculty,
      pendingFaculty,
      suspendedFaculty,
      totalStudents,
      activeEnrollments,
      pendingEnrollments,
      totalSubjects,
      activeSubjects,
      totalProgrammes,
      totalSemesters,
      totalContent,
      totalQuizzes,
      totalQuizAttempts,
      totalAssignments,
      totalSubmissions,
      totalAttendanceSessions,
      totalAuditLogs,
      departmentsList,
      recentAuditLogs,
    ] = await Promise.all([
      Department.countDocuments(),
      Department.countDocuments({ status: 'ACTIVE' }),
      User.countDocuments({ role: UserRole.TEACHER }),
      User.countDocuments({ role: UserRole.TEACHER, approvalStatus: ApprovalStatus.APPROVED }),
      User.countDocuments({ role: UserRole.TEACHER, approvalStatus: ApprovalStatus.PENDING }),
      User.countDocuments({ role: UserRole.TEACHER, accountStatus: AccountStatus.SUSPENDED }),
      User.countDocuments({ role: UserRole.STUDENT }),
      StudentEnrollment.countDocuments({ status: EnrollmentStatus.APPROVED }),
      StudentEnrollment.countDocuments({ status: EnrollmentStatus.PENDING }),
      Subject.countDocuments(),
      Subject.countDocuments({ status: 'ACTIVE' }),
      Programme.countDocuments(),
      Semester.countDocuments({ status: 'ACTIVE' }),
      Content.countDocuments(),
      Quiz.countDocuments(),
      QuizAttempt.countDocuments(),
      Assignment.countDocuments(),
      AssignmentSubmission.countDocuments(),
      AttendanceSession.countDocuments(),
      AuditLog.countDocuments(),
      Department.find()
        .populate('hod', 'name collegeEmail identifier')
        .sort({ code: 1 })
        .lean(),
      AuditLog.find()
        .populate('user', 'name collegeEmail identifier role')
        .populate('department', 'name code shortName type')
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),
    ]);

    // Enrich departments with student and faculty counts
    const departmentsSummary = await Promise.all(
      departmentsList.map(async (dept) => {
        const [deptFacultyCount, deptStudentCount, deptSubjectCount, deptProgrammesCount] =
          await Promise.all([
            User.countDocuments({ department: dept._id, role: UserRole.TEACHER }),
            User.countDocuments({ department: dept._id, role: UserRole.STUDENT }),
            Subject.countDocuments({ department: dept._id }),
            Programme.countDocuments({ department: dept._id }),
          ]);

        return {
          ...dept,
          facultyCount: deptFacultyCount,
          studentCount: deptStudentCount,
          subjectCount: deptSubjectCount,
          programmeCount: deptProgrammesCount,
        };
      })
    );

    // Calculate content counts by type
    const [notesCount, materialsCount, videosCount, announcementsCount, simulationsCount] =
      await Promise.all([
        Content.countDocuments({ contentType: 'NOTES' }),
        Content.countDocuments({ contentType: 'MATERIALS' }),
        Content.countDocuments({ contentType: 'VIDEOS' }),
        Content.countDocuments({ contentType: 'ANNOUNCEMENTS' }),
        Content.countDocuments({ contentType: 'SIMULATIONS' }),
      ]);

    // System uptime & health
    const memory = process.memoryUsage();
    const systemHealth = {
      dbStatus: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      heapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMB: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
    };

    return {
      kpis: {
        departments: { total: totalDepartments, active: activeDepartments },
        faculty: {
          total: totalFaculty,
          approved: approvedFaculty,
          pending: pendingFaculty,
          suspended: suspendedFaculty,
        },
        students: {
          total: totalStudents,
          activeEnrollments,
          pendingEnrollments,
        },
        academics: {
          subjects: totalSubjects,
          activeSubjects,
          programmes: totalProgrammes,
          activeSemesters: totalSemesters,
          quizzes: totalQuizzes,
          quizAttempts: totalQuizAttempts,
          assignments: totalAssignments,
          submissions: totalSubmissions,
          attendanceSessions: totalAttendanceSessions,
        },
        content: {
          total: totalContent,
          notes: notesCount,
          materials: materialsCount,
          videos: videosCount,
          announcements: announcementsCount,
          simulations: simulationsCount,
        },
        auditLogsTotal: totalAuditLogs,
      },
      departments: departmentsSummary,
      recentAuditLogs,
      systemHealth,
    };
  }

  /**
   * Detailed department overview across the institution.
   */
  static async getDepartmentOverview(departmentId?: string) {
    const filter: Record<string, any> = {};
    if (departmentId) {
      filter._id = new Types.ObjectId(departmentId);
    }

    const departments = await Department.find(filter)
      .populate('hod', 'name collegeEmail identifier profile accountStatus')
      .sort({ isProgramme: -1, displayOrder: 1, name: 1 })
      .lean();

    const results = await Promise.all(
      departments.map(async (dept) => {
        const [
          facultyCount,
          studentCount,
          subjectCount,
          activeSubjectCount,
          programmeCount,
          activeSemesterCount,
          contentCount,
          quizzesCount,
          assignmentsCount,
        ] = await Promise.all([
          User.countDocuments({ department: dept._id, role: UserRole.TEACHER }),
          User.countDocuments({ department: dept._id, role: UserRole.STUDENT }),
          Subject.countDocuments({ department: dept._id }),
          Subject.countDocuments({ department: dept._id, status: 'ACTIVE' }),
          Programme.countDocuments({ department: dept._id }),
          Semester.countDocuments({ department: dept._id, status: 'ACTIVE' }),
          Content.countDocuments({ department: dept._id }),
          Quiz.countDocuments({ department: dept._id }),
          Assignment.countDocuments({ department: dept._id }),
        ]);

        return {
          ...dept,
          metrics: {
            facultyCount,
            studentCount,
            subjectCount,
            activeSubjectCount,
            programmeCount,
            activeSemesterCount,
            contentCount,
            quizzesCount,
            assignmentsCount,
          },
        };
      })
    );

    return departmentId ? results[0] || null : results;
  }

  /**
   * Institution-wide faculty directory with filtering and pagination.
   */
  static async getFacultyDirectory(filters: {
    departmentId?: string;
    approvalStatus?: string;
    accountStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { role: UserRole.TEACHER };

    if (filters.departmentId) {
      query.department = new Types.ObjectId(filters.departmentId);
    }
    if (filters.approvalStatus) {
      query.approvalStatus = filters.approvalStatus;
    }
    if (filters.accountStatus) {
      query.accountStatus = filters.accountStatus;
    }
    if (filters.search) {
      const term = filters.search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { collegeEmail: { $regex: term, $options: 'i' } },
        { identifier: { $regex: term, $options: 'i' } },
      ];
    }

    const [facultyList, total] = await Promise.all([
      User.find(
        query,
        'name collegeEmail identifier role department profile accountStatus approvalStatus createdAt lastLoginAt'
      )
        .populate('department', 'name code shortName type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Attach active teaching assignment count for each teacher
    const enriched = await Promise.all(
      facultyList.map(async (faculty) => {
        const assignmentsCount = await TeacherAssignment.countDocuments({
          teacher: faculty._id,
          status: TeacherAssignmentStatus.ACTIVE,
        });
        return {
          ...faculty,
          assignmentsCount,
        };
      })
    );

    return {
      faculty: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Institution-wide student directory with filtering and pagination.
   */
  static async getStudentDirectory(filters: {
    departmentId?: string;
    semesterNumber?: number;
    accountStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { role: UserRole.STUDENT };

    if (filters.departmentId) {
      query.department = new Types.ObjectId(filters.departmentId);
    }
    if (filters.accountStatus) {
      query.accountStatus = filters.accountStatus;
    }
    if (filters.search) {
      const term = filters.search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { collegeEmail: { $regex: term, $options: 'i' } },
        { identifier: { $regex: term, $options: 'i' } },
      ];
    }

    const [studentsList, total] = await Promise.all([
      User.find(
        query,
        'name collegeEmail identifier role department profile accountStatus approvalStatus createdAt lastLoginAt'
      )
        .populate('department', 'name code shortName type')
        .sort({ identifier: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Attach active enrollment details
    const enriched = await Promise.all(
      studentsList.map(async (student) => {
        const activeEnrollment = await StudentEnrollment.findOne({
          student: student._id,
          status: EnrollmentStatus.APPROVED,
        })
          .populate('semester', 'semesterNumber academicYear regulation')
          .lean();

        return {
          ...student,
          activeEnrollment: activeEnrollment
            ? {
                semesterNumber: (activeEnrollment.semester as any)?.semesterNumber,
                academicYear: (activeEnrollment.semester as any)?.academicYear,
                enrolledSubjectsCount: activeEnrollment.enrolledSubjects?.length || 0,
              }
            : null,
        };
      })
    );

    return {
      students: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Institution-wide academic activity stream and comparative metrics.
   */
  static async getAcademicActivity() {
    const [
      recentContent,
      recentQuizzes,
      recentAssignments,
      recentSubmissions,
      recentAttendance,
      departments,
    ] = await Promise.all([
      Content.find({ status: ContentStatus.PUBLISHED })
        .populate('teacher', 'name identifier')
        .populate('subject', 'subjectName subjectCode')
        .populate('department', 'name code shortName type')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Quiz.find()
        .populate('teacher', 'name identifier')
        .populate('subject', 'subjectName subjectCode')
        .populate('department', 'name code shortName type')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Assignment.find()
        .populate('teacher', 'name identifier')
        .populate('subject', 'subjectName subjectCode')
        .populate('department', 'name code shortName type')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      AssignmentSubmission.find()
        .populate('student', 'name identifier')
        .populate({
          path: 'assignment',
          select: 'title subject department',
          populate: { path: 'subject department', select: 'subjectCode name code' },
        })
        .sort({ submittedAt: -1 })
        .limit(10)
        .lean(),
      AttendanceSession.find()
        .populate('teacher', 'name identifier')
        .populate('subject', 'subjectName subjectCode')
        .populate('department', 'name code shortName type')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Department.find({ status: 'ACTIVE' }).select('name code').lean(),
    ]);

    // Department comparative activity scorecard
    const departmentScorecard = await Promise.all(
      departments.map(async (dept) => {
        const [contentCount, quizCount, assignmentCount, sessionCount] = await Promise.all([
          Content.countDocuments({ department: dept._id }),
          Quiz.countDocuments({ department: dept._id }),
          Assignment.countDocuments({ department: dept._id }),
          AttendanceSession.countDocuments({ department: dept._id }),
        ]);

        return {
          departmentId: dept._id,
          name: dept.name,
          code: dept.code,
          contentCount,
          quizCount,
          assignmentCount,
          sessionCount,
          totalActivityIndex: contentCount * 2 + quizCount * 3 + assignmentCount * 3 + sessionCount,
        };
      })
    );

    return {
      recentContent,
      recentQuizzes,
      recentAssignments,
      recentSubmissions,
      recentAttendance,
      departmentScorecard: departmentScorecard.sort(
        (a, b) => b.totalActivityIndex - a.totalActivityIndex
      ),
    };
  }

  /**
   * Paginated audit logs with dynamic filtering.
   */
  static async getAuditLogs(filters: AuditLogFilters) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (filters.action) {
      query.action = filters.action;
    }
    if (filters.entityType) {
      query.entityType = filters.entityType;
    }
    if (filters.departmentId) {
      query.department = new Types.ObjectId(filters.departmentId);
    }
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.timestamp.$lte = new Date(filters.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('user', 'name collegeEmail identifier role')
        .populate('department', 'name code shortName type')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PRIVILEGED INSTITUTIONAL CONFIGURATION ACTIONS (MANDATORY AUDIT LOGGING)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Create a new academic department.
   * Privileged action logged to AuditLog.
   */
  static async createDepartment(adminId: string, data: any, meta: RequestMeta = {}) {
    const existing = await Department.findOne({ code: data.code.toUpperCase() });
    if (existing) {
      throw ApiError.conflict(`A department with code "${data.code}" already exists.`);
    }
    // Prevent near-duplicate copies of an official programme (e.g. "Civil Engg").
    const sameName = await Department.findOne({
      name: new RegExp(`^${data.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    });
    if (sameName) {
      throw ApiError.conflict(`"${sameName.name}" already exists (${sameName.code}). Use the existing record.`);
    }

    const dept = await Department.create({
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      programmeType: data.programmeType || 'UG',
      // Official B.E. programmes come from the programme master; departments created
      // here are supporting departments (e.g. Science & Humanities).
      isProgramme: false,
      description: data.description,
      hod: data.hodId ? new Types.ObjectId(data.hodId) : null,
      status: data.status || 'ACTIVE',
    });

    // If an HOD is appointed, ensure their role is set to HOD
    if (data.hodId) {
      await User.findByIdAndUpdate(data.hodId, {
        role: UserRole.HOD,
        department: dept._id,
      });
    }

    // MANDATORY PRIVILEGED ACTION AUDIT LOG
    await AuditLog.create({
      user: adminId,
      action: AuditAction.ADMIN_ACTION,
      entityType: 'Department',
      entityId: String(dept._id),
      department: dept._id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      details: {
        action: 'CREATE_DEPARTMENT',
        departmentCode: dept.code,
        departmentName: dept.name,
        programmeType: dept.programmeType,
      },
    });

    return dept;
  }

  /**
   * Update department configuration.
   * Privileged action logged to AuditLog.
   */
  static async updateDepartment(
    adminId: string,
    departmentId: string,
    data: any,
    meta: RequestMeta = {}
  ) {
    const dept = await Department.findById(departmentId);
    if (!dept) throw ApiError.notFound('Department not found.');

    const oldState = {
      name: dept.name,
      code: dept.code,
      programmeType: dept.programmeType,
      status: dept.status,
    };

    // Official programme names and codes are governed by the central programme
    // master (npm run db:seed:programmes) so they can never drift between screens.
    if (dept.isProgramme) {
      const renaming = data.name && data.name.trim() !== dept.name;
      const recoding = data.code && data.code.trim().toUpperCase() !== dept.code;
      if (renaming || recoding) {
        throw ApiError.badRequest(
          'The name and code of an official programme are managed by the programme master and cannot be changed here.'
        );
      }
    }
    if (data.name) dept.name = data.name.trim();
    if (data.code) dept.code = data.code.trim().toUpperCase();
    if (data.programmeType) dept.programmeType = data.programmeType;
    if (data.description !== undefined) dept.description = data.description;
    if (data.status) dept.status = data.status;

    await dept.save();

    // MANDATORY PRIVILEGED ACTION AUDIT LOG
    await AuditLog.create({
      user: adminId,
      action: AuditAction.ADMIN_ACTION,
      entityType: 'Department',
      entityId: String(dept._id),
      department: dept._id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      details: {
        action: 'UPDATE_DEPARTMENT',
        departmentCode: dept.code,
        oldState,
        newState: {
          name: dept.name,
          code: dept.code,
          programmeType: dept.programmeType,
          status: dept.status,
        },
      },
    });

    return dept;
  }

  /**
   * Assign or change the Head of Department (HOD).
   * Privileged action logged to AuditLog.
   */
  static async assignDepartmentHod(
    adminId: string,
    departmentId: string,
    hodUserId: string,
    meta: RequestMeta = {}
  ) {
    const dept = await Department.findById(departmentId);
    if (!dept) throw ApiError.notFound('Department not found.');

    const newHod = await User.findById(hodUserId);
    if (!newHod) throw ApiError.notFound('Selected user for HOD role not found.');

    const previousHodId = dept.hod;

    // Set new HOD on department
    dept.hod = new Types.ObjectId(hodUserId);
    await dept.save();

    // Elevate user role to HOD and bind to this department
    newHod.role = UserRole.HOD;
    newHod.department = dept._id;
    newHod.approvalStatus = ApprovalStatus.APPROVED;
    await newHod.save();

    // If previous HOD exists and is different, revert previous HOD to TEACHER
    if (previousHodId && String(previousHodId) !== String(hodUserId)) {
      await User.findByIdAndUpdate(previousHodId, { role: UserRole.TEACHER });
    }

    // MANDATORY PRIVILEGED ACTION AUDIT LOG
    await AuditLog.create({
      user: adminId,
      action: AuditAction.ROLE_CHANGE,
      entityType: 'Department',
      entityId: String(dept._id),
      department: dept._id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      details: {
        action: 'ASSIGN_HOD',
        departmentCode: dept.code,
        previousHodId: previousHodId ? String(previousHodId) : null,
        newHodId: String(newHod._id),
        newHodName: newHod.name,
      },
    });

    return dept;
  }

  /**
   * Toggle department active / inactive status.
   * Privileged action logged to AuditLog.
   */
  static async toggleDepartmentStatus(
    adminId: string,
    departmentId: string,
    status: 'ACTIVE' | 'INACTIVE',
    meta: RequestMeta = {}
  ) {
    const dept = await Department.findById(departmentId);
    if (!dept) throw ApiError.notFound('Department not found.');

    const previousStatus = dept.status;
    dept.status = status;
    dept.isActive = status === 'ACTIVE';
    // Deactivation archives the programme; its academic records are always retained.
    dept.archivedAt = status === 'ACTIVE' ? null : dept.archivedAt || new Date();
    await dept.save();

    // MANDATORY PRIVILEGED ACTION AUDIT LOG
    await AuditLog.create({
      user: adminId,
      action: AuditAction.ADMIN_ACTION,
      entityType: 'Department',
      entityId: String(dept._id),
      department: dept._id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      details: {
        action: 'TOGGLE_DEPARTMENT_STATUS',
        departmentCode: dept.code,
        previousStatus,
        newStatus: status,
      },
    });

    return dept;
  }

  /**
   * Change user account status (e.g. ACTIVE, SUSPENDED, INACTIVE).
   * Privileged governance action logged to AuditLog.
   */
  static async updateUserStatus(
    adminId: string,
    targetUserId: string,
    accountStatus: AccountStatus,
    reason?: string,
    meta: RequestMeta = {}
  ) {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) throw ApiError.notFound('Target user not found.');

    // Protect against self-suspension
    if (String(adminId) === String(targetUserId) && accountStatus === AccountStatus.SUSPENDED) {
      throw ApiError.badRequest('Administrators cannot suspend their own active accounts.');
    }

    const previousStatus = targetUser.accountStatus;
    targetUser.accountStatus = accountStatus;
    if (accountStatus === AccountStatus.ACTIVE) {
      targetUser.failedLoginAttempts = 0;
      targetUser.lockoutUntil = null;
    }
    await targetUser.save();

    // MANDATORY PRIVILEGED ACTION AUDIT LOG
    await AuditLog.create({
      user: adminId,
      action: AuditAction.USER_STATUS_CHANGE,
      entityType: 'User',
      entityId: String(targetUser._id),
      department: targetUser.department || undefined,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      details: {
        targetUserId: String(targetUser._id),
        targetUserName: targetUser.name,
        targetUserRole: targetUser.role,
        previousStatus,
        newStatus: accountStatus,
        reason: reason || 'Administrative governance decision',
      },
    });

    return targetUser;
  }
}
