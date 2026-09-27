import { type NextFunction, type Request, type Response } from 'express';
import {
  Semester,
  StudentEnrollment,
  Subject,
  TeacherAssignment,
  User,
} from '../models/index.js';
import { verifyAccessToken } from '../security/token.utils.js';
import {
  AccountStatus,
  ApprovalStatus,
  EnrollmentStatus,
  TeacherAssignmentStatus,
  UserRole,
} from '../types/academic.types.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Authentication middleware.
 * Verifies JWT from Authorization header ("Bearer <token>") or httpOnly access cookie.
 * Attaches the authenticated User instance to req.user.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw ApiError.unauthenticated('Sign in to continue.');
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      throw ApiError.unauthenticated('Session has expired or token is invalid.');
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      throw ApiError.unauthenticated('User account not found.');
    }

    if (user.accountStatus !== AccountStatus.ACTIVE) {
      throw ApiError.forbidden('Your account is currently suspended or inactive.');
    }

    req.user = user;
    req.token = decoded;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-Based Access Control (RBAC) middleware.
 * Verifies that the authenticated user possesses one of the allowed roles.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthenticated('Sign in to continue.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Requires one of roles: [${roles.join(', ')}].`
        )
      );
    }

    next();
  };
}

/**
 * Convenience guards for specific roles.
 */
export const requireStudent = requireRole(UserRole.STUDENT);
export const requireTeacher = requireRole(UserRole.TEACHER);
export const requireHOD = requireRole(UserRole.HOD);
export const requireAdmin = requireRole(UserRole.ADMIN, UserRole.PRINCIPAL);

/**
 * Requires verified approval for staff/teachers.
 */
export function requireActiveApproval(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(ApiError.unauthenticated('Sign in to continue.'));
  }

  if (
    req.user.role === UserRole.TEACHER &&
    req.user.approvalStatus !== ApprovalStatus.APPROVED
  ) {
    return next(
      ApiError.forbidden(
        'Teacher account is pending HOD/administrative approval before gaining teaching privileges.'
      )
    );
  }

  next();
}

/**
 * Department authorization middleware.
 * Verifies that the user has authority to access or manage the specified department.
 */
export function requireDepartmentAccess(
  extractDeptId?: (req: Request) => string | undefined
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw ApiError.unauthenticated('Sign in to continue.');
      }

      // Admins and Principals can access all departments
      if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.PRINCIPAL) {
        return next();
      }

      const targetDeptId =
        extractDeptId?.(req) ||
        req.params.departmentId ||
        req.params.id ||
        (req.body as any)?.departmentId ||
        (req.query as any)?.departmentId;

      if (!targetDeptId) {
        return next();
      }

      const userDeptId = req.user.department ? String(req.user.department) : null;
      if (!userDeptId || userDeptId !== String(targetDeptId)) {
        throw ApiError.forbidden(
          'You are not authorized to view or manage resources for this department.'
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Subject authorization middleware.
 * Enforces:
 *   - Teachers can ONLY access subjects they are actively assigned to teach.
 *   - Students can ONLY access subjects they are actively enrolled in.
 *   - HODs can access any subject within their own department.
 *   - Admins can access all subjects.
 */
export function requireSubjectAccess(
  paramOrExtractor?: string | ((req: Request) => string | undefined)
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw ApiError.unauthenticated('Sign in to continue.');
      }

      let subjectId: string | undefined;
      if (typeof paramOrExtractor === 'function') {
        subjectId = paramOrExtractor(req);
      } else if (typeof paramOrExtractor === 'string') {
        subjectId =
          (req.params as Record<string, string>)[paramOrExtractor] ||
          (req.body as any)?.[paramOrExtractor] ||
          (req.query as any)?.[paramOrExtractor];
      }

      if (!subjectId) {
        subjectId =
          (req.params as Record<string, string>).subjectId ||
          (req.params as Record<string, string>).id ||
          (req.body as any)?.subjectId ||
          (req.query as any)?.subjectId;
      }

      if (!subjectId) {
        return next();
      }

      // Admins and Principals have institution-wide authority
      if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.PRINCIPAL) {
        return next();
      }

      const subject = await Subject.findById(subjectId);
      if (!subject) {
        throw ApiError.notFound('Subject not found.');
      }

      // HODs: Authorized if subject belongs to their department
      if (req.user.role === UserRole.HOD) {
        if (
          !req.user.department ||
          String(req.user.department) !== String(subject.department)
        ) {
          throw ApiError.forbidden(
            'HOD cannot manage subjects outside their assigned department.'
          );
        }
        return next();
      }

      // Teachers: Must have an active TeacherAssignment for this specific subject
      if (req.user.role === UserRole.TEACHER) {
        const assignment = await TeacherAssignment.findOne({
          teacher: req.user._id,
          subject: subject._id,
          status: TeacherAssignmentStatus.ACTIVE,
        });

        if (!assignment) {
          throw ApiError.forbidden(
            'You are not assigned to teach this subject.'
          );
        }
        return next();
      }

      // Students: Must belong to the subject's programme AND have an approved
      // active enrollment containing this subject (no cross-programme leakage).
      if (req.user.role === UserRole.STUDENT) {
        if (!req.user.department || String(req.user.department) !== String(subject.department)) {
          throw ApiError.forbidden('This subject belongs to a different programme.');
        }
        const enrollment = await StudentEnrollment.findOne({
          student: req.user._id,
          status: EnrollmentStatus.APPROVED,
          enrolledSubjects: subject._id,
        });

        if (!enrollment) {
          throw ApiError.forbidden(
            'You are not enrolled in this subject.'
          );
        }
        return next();
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Semester Access Boundary Middleware
 * - Admin/Principal: Unrestricted.
 * - HOD: Can access semesters in their department.
 * - Teacher: Can access semesters they teach or in their department.
 * - Student: Can access CURRENT and PREVIOUS semesters, but NEVER future semesters.
 */
export function requireSemesterAccess(paramName = 'semesterId') {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw ApiError.unauthenticated('Sign in to continue.');
      }

      const semesterId =
        req.params[paramName] || req.query[paramName] || req.body?.[paramName];
      if (!semesterId) {
        return next();
      }

      if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.PRINCIPAL) {
        return next();
      }

      const semester = await Semester.findById(semesterId);
      if (!semester) {
        throw ApiError.notFound('Semester not found.');
      }

      // HOD: Must belong to HOD's department
      if (req.user.role === UserRole.HOD) {
        if (!req.user.department || String(req.user.department) !== String(semester.department)) {
          throw ApiError.forbidden('HOD cannot access semesters outside their assigned department.');
        }
        return next();
      }

      // Teacher: Must belong to teacher's department or have an assignment in that semester
      if (req.user.role === UserRole.TEACHER) {
        const isDeptMatch = req.user.department && String(req.user.department) === String(semester.department);
        if (isDeptMatch) return next();

        const assignment = await TeacherAssignment.findOne({
          teacher: req.user._id,
          semester: semester._id,
          status: TeacherAssignmentStatus.ACTIVE,
        });

        if (!assignment) {
          throw ApiError.forbidden('You are not authorized to access this semester.');
        }
        return next();
      }

      // Student: Must belong to student's department AND cannot access future semesters
      if (req.user.role === UserRole.STUDENT) {
        if (!req.user.department || String(req.user.department) !== String(semester.department)) {
          throw ApiError.forbidden('Students cannot access semesters of other departments.');
        }

        // Determine student's active semester
        const activeEnrollment = await StudentEnrollment.findOne({
          student: req.user._id,
          status: EnrollmentStatus.APPROVED,
        }).populate('semester');

        let maxAllowedSemester = 1;
        if (activeEnrollment?.semester) {
          maxAllowedSemester = (activeEnrollment.semester as any).semesterNumber ?? 1;
        }

        // Strictly enforce: Student cannot access future semesters
        if (semester.semesterNumber > maxAllowedSemester) {
          throw ApiError.forbidden(
            `Access denied: Semester ${semester.semesterNumber} is a future semester. You are currently in Semester ${maxAllowedSemester}.`
          );
        }

        return next();
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

