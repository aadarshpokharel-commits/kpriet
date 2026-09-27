import bcrypt from 'bcryptjs';
import {
  AuditLog,
  Department,
  RefreshToken,
  Semester,
  StudentEnrollment,
  Subject,
  TeacherAssignment,
  User,
} from '../models/index.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from '../security/token.utils.js';
import {
  AccountStatus,
  ApprovalStatus,
  AuditAction,
  EnrollmentStatus,
  NotificationType,
  TeacherAssignmentStatus,
  UserRole,
} from '../types/academic.types.js';
import { NotificationService } from './notification.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ProgrammeService } from './programme.service.js';
import {
  type LoginInput,
  type StudentRegistrationInput,
  type TeacherRegistrationInput,
  normalizeEmail,
} from '../validators/auth.validators.js';

export interface RequestMetadata {
  ip?: string;
  userAgent?: string;
}

export class AuthService {
  /**
   * Registers a new student.
   * Student accounts are verified against KPRIET email policy and roll number formats.
   */
  static async registerStudent(
    input: StudentRegistrationInput,
    meta: RequestMetadata = {}
  ) {
    const email = normalizeEmail(input.collegeEmail);
    const identifier = input.studentIdentifier.trim().toUpperCase();

    // 1. Check duplicate email
    const existingEmail = await User.findOne({ collegeEmail: email });
    if (existingEmail) {
      throw ApiError.conflict('An account with this college email already exists.');
    }

    // 2. Check duplicate identifier (roll number)
    const existingId = await User.findOne({ identifier });
    if (existingId) {
      throw ApiError.conflict('An account with this student identifier already exists.');
    }

    // 3. Resolve the programme from the central programme master (never trust the client)
    const dept = await ProgrammeService.resolveProgramme(input.programmeId || input.departmentId, {
      requireActive: true,
    }).catch((err) => {
      if (err instanceof ApiError && err.statusCode === 404) {
        throw ApiError.badRequest('Selected programme does not exist.');
      }
      throw err;
    });

    // 4. Hash password securely
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 5. Create user entity
    const user = await User.create({
      name: input.name.trim(),
      collegeEmail: email,
      passwordHash,
      role: UserRole.STUDENT,
      department: dept._id,
      identifier,
      profile: {
        designation: 'Student',
        batch: `Batch ${new Date().getFullYear()}–${new Date().getFullYear() + 4}`,
      },
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    });

    // 6. Find corresponding semester & subjects to create initial active enrollment
    //    (programme + semester number [+ academic year]); newest academic year wins.
    const semesterQuery: Record<string, unknown> = {
      department: dept._id,
      semesterNumber: input.currentSemesterNumber,
    };
    if (input.academicYear) semesterQuery.academicYear = input.academicYear;
    const semester = await Semester.findOne(semesterQuery).sort({ academicYear: -1 });

    if (semester) {
      const subjects = await Subject.find({
        department: dept._id,
        semester: semester._id,
        status: 'ACTIVE',
      });

      await StudentEnrollment.create({
        student: user._id,
        department: dept._id,
        semester: semester._id,
        academicYear: semester.academicYear,
        enrolledSubjects: subjects.map((s) => s._id),
        status: EnrollmentStatus.APPROVED,
        requestedAt: new Date(),
        approvedAt: new Date(),
      });
    }

    // 7. Generate session tokens
    const accessToken = generateAccessToken(user);
    const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

    await RefreshToken.create({
      user: user._id,
      tokenHash,
      expiresAt,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    // 8. Audit log
    await AuditLog.create({
      user: user._id,
      action: AuditAction.REGISTRATION,
      entityType: 'User',
      entityId: String(user._id),
      department: dept._id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      details: { role: UserRole.STUDENT, identifier, email },
    });

    return { user, accessToken, refreshToken };
  }

  /**
   * Registers a new teacher.
   * Governance policy: Teacher registrations default to PENDING approval by HOD.
   */
  static async registerTeacher(
    input: TeacherRegistrationInput,
    meta: RequestMetadata = {}
  ) {
    const email = normalizeEmail(input.collegeEmail);
    const identifier = input.employeeIdentifier.trim().toUpperCase();

    // 1. Check duplicate email
    const existingEmail = await User.findOne({ collegeEmail: email });
    if (existingEmail) {
      throw ApiError.conflict('An account with this college email already exists.');
    }

    // 2. Check duplicate employee identifier
    const existingId = await User.findOne({ identifier });
    if (existingId) {
      throw ApiError.conflict('An account with this faculty identifier already exists.');
    }

    // 3. Resolve the programme from the central programme master (never trust the client)
    const dept = await ProgrammeService.resolveProgramme(input.programmeId || input.departmentId, {
      requireActive: true,
    }).catch((err) => {
      if (err instanceof ApiError && err.statusCode === 404) {
        throw ApiError.badRequest('Selected programme does not exist.');
      }
      throw err;
    });

    // 4. Hash password securely
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 5. Create user entity with PENDING approval status
    const user = await User.create({
      name: input.name.trim(),
      collegeEmail: email,
      passwordHash,
      role: UserRole.TEACHER,
      department: dept._id,
      identifier,
      profile: {
        designation: input.designation || 'Assistant Professor',
      },
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.PENDING, // Requires HOD approval
    });

    // 6. Audit log
    await AuditLog.create({
      user: user._id,
      action: AuditAction.REGISTRATION,
      entityType: 'User',
      entityId: String(user._id),
      department: dept._id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      details: { role: UserRole.TEACHER, identifier, email, approvalStatus: 'PENDING' },
    });

    // 7. Notify HOD of new faculty registration request
    try {
      const hodUsers = await User.find({
        department: dept._id,
        role: UserRole.HOD,
      }).select('_id');

      for (const hod of hodUsers) {
        await NotificationService.create({
          recipient: hod._id,
          sender: user._id,
          type: NotificationType.TEACHER_REGISTRATION_REQUESTED,
          title: 'New Faculty Registration Request',
          message: `${user.name} (${identifier}) has registered as ${user.profile?.designation || 'Faculty'} and is awaiting review.`,
          metadata: {
            teacherId: String(user._id),
            teacherName: user.name,
            departmentId: String(dept._id),
          },
          link: '/dashboard',
        });
      }
    } catch (notifErr: any) {
      // Non-blocking notification dispatch
    }

    return {
      user,
      message:
        'Teacher registration submitted successfully. Your account is pending HOD approval before gaining teaching privileges.',
    };

  }

  /**
   * Authenticates user with college email and password.
   * Generic errors prevent account enumeration. Account lockout prevents brute-force attacks.
   */
  static async login(input: LoginInput, meta: RequestMetadata = {}) {
    const rawInput = input.collegeEmail.trim();
    const email = normalizeEmail(rawInput);
    const usernamePart = rawInput.toLowerCase().replace(/@kpriet\.ac\.in$|@kpiet\.ac\.in$/, '');

    // Explicitly select passwordHash; find by email or identifier
    const user = await User.findOne({
      $or: [
        { collegeEmail: email },
        { identifier: rawInput.toUpperCase() },
        { identifier: usernamePart.toUpperCase() },
        { identifier: rawInput },
        { identifier: usernamePart },
      ],
    }).select('+passwordHash');

    if (!user) {
      // Record failed login in audit without exposing account existence
      await AuditLog.create({
        action: AuditAction.LOGIN,
        entityType: 'User',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        details: { email, success: false, reason: 'ACCOUNT_NOT_FOUND' },
      });
      throw ApiError.unauthenticated('Invalid college email or password.');
    }

    // Check account lockout
    if (user.isLocked()) {
      const minutesRemaining = Math.ceil(
        (user.lockoutUntil!.getTime() - Date.now()) / (60 * 1000)
      );
      throw ApiError.forbidden(
        `Account is temporarily locked due to consecutive failed attempts. Please try again in ${minutesRemaining} minute(s).`
      );
    }

    // Check account status
    if (user.accountStatus !== AccountStatus.ACTIVE) {
      throw ApiError.forbidden(
        'Your account has been deactivated or suspended. Please contact the administrator.'
      );
    }

    // Check password
    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      const locked = await user.recordFailedLogin();
      await AuditLog.create({
        user: user._id,
        action: AuditAction.LOGIN,
        entityType: 'User',
        entityId: String(user._id),
        department: user.department || undefined,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        details: { email, success: false, reason: 'BAD_PASSWORD', lockedNow: locked },
      });

      if (locked) {
        throw ApiError.forbidden(
          'Too many failed login attempts. Your account has been temporarily locked for 15 minutes.'
        );
      }

      throw ApiError.unauthenticated('Invalid college email or password.');
    }

    // Successful login: Reset failed counter, update lastLoginAt
    await user.recordSuccessfulLogin();

    // Generate session tokens
    const accessToken = generateAccessToken(user);
    const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

    await RefreshToken.create({
      user: user._id,
      tokenHash,
      expiresAt,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    await AuditLog.create({
      user: user._id,
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: String(user._id),
      department: user.department || undefined,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      details: { role: user.role, email, success: true },
    });

    return { user, accessToken, refreshToken };
  }

  /**
   * Refreshes access token with token rotation and reuse detection.
   */
  static async refreshSession(
    refreshTokenString: string,
    meta: RequestMetadata = {}
  ) {
    if (!refreshTokenString) {
      throw ApiError.unauthenticated('Refresh token is required.');
    }

    const tokenHash = hashToken(refreshTokenString);
    const tokenDoc = await RefreshToken.findOne({ tokenHash });

    if (!tokenDoc) {
      throw ApiError.unauthenticated('Invalid or expired refresh token. Please sign in again.');
    }

    // Token reuse detection: if a revoked token is presented, revoke all sessions for this user!
    if (tokenDoc.isRevoked) {
      await RefreshToken.updateMany(
        { user: tokenDoc.user },
        { isRevoked: true }
      );
      throw ApiError.unauthenticated('Security alert: Replayed session detected. Please sign in again.');
    }

    // Check expiration
    if (tokenDoc.expiresAt < new Date()) {
      tokenDoc.isRevoked = true;
      await tokenDoc.save();
      throw ApiError.unauthenticated('Session has expired. Please sign in again.');
    }

    const user = await User.findById(tokenDoc.user);
    if (!user || user.accountStatus !== AccountStatus.ACTIVE) {
      throw ApiError.unauthenticated('User account is no longer active.');
    }

    // Rotate refresh token
    const { token: newRefreshToken, tokenHash: newHash, expiresAt: newExpires } =
      generateRefreshToken();

    tokenDoc.isRevoked = true;
    tokenDoc.replacedByTokenHash = newHash;
    await tokenDoc.save();

    await RefreshToken.create({
      user: user._id,
      tokenHash: newHash,
      expiresAt: newExpires,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    const accessToken = generateAccessToken(user);

    return { user, accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logs out user by revoking the refresh token.
   */
  static async logout(refreshTokenString?: string, user?: any) {
    if (refreshTokenString) {
      const tokenHash = hashToken(refreshTokenString);
      await RefreshToken.updateOne({ tokenHash }, { isRevoked: true });
    }

    if (user?._id) {
      await AuditLog.create({
        user: user._id,
        action: AuditAction.LOGOUT,
        entityType: 'User',
        entityId: String(user._id),
      });
    }

    return true;
  }

  /**
   * Returns current user profile with role-specific context.
   */
  static async getCurrentUserContext(userId: string) {
    const user = await User.findById(userId).populate('department', 'name code shortName type programmeType');
    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    let extraContext: Record<string, unknown> = {};

    if (user.role === UserRole.STUDENT) {
      const enrollment = await StudentEnrollment.findOne({
        student: user._id,
        status: EnrollmentStatus.APPROVED,
      })
        .populate('semester')
        .populate('enrolledSubjects', 'subjectName subjectCode credits icon color');

      extraContext = { activeEnrollment: enrollment };
    } else if (user.role === UserRole.TEACHER) {
      const assignments = await TeacherAssignment.find({
        teacher: user._id,
        status: TeacherAssignmentStatus.ACTIVE,
      })
        .populate('subject', 'subjectName subjectCode credits icon color')
        .populate('semester', 'semesterNumber academicYear regulation');

      extraContext = {
        assignedSubjects: assignments,
        isApproved: user.approvalStatus === ApprovalStatus.APPROVED,
      };
    }

    return { user, ...extraContext };
  }

  /**
   * Retrieves all active academic departments for public registration dropdowns.
   */
  static async getActiveDepartments() {
    // Delegates to the central programme master so every picker shows the same list.
    return ProgrammeService.listProgrammes();
  }

  /**
   * Aggregates real-time live database statistics for institution overview.
   */
  static async getPublicStats() {
    const [coursesCount, facultyCount, studentsCount, academicYears] = await Promise.all([
      Subject.countDocuments({ status: 'ACTIVE' }),
      User.countDocuments({ role: UserRole.TEACHER, accountStatus: AccountStatus.ACTIVE }),
      User.countDocuments({ role: UserRole.STUDENT, accountStatus: AccountStatus.ACTIVE }),
      Semester.distinct('academicYear'),
    ]);

    return {
      activeCourses: coursesCount || 0,
      academicYears: academicYears.length || 4,
      facultyExperts: facultyCount || 0,
      enrolledStudents: studentsCount || 0,
    };
  }
}
