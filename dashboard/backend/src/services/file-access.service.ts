import { Types } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { UserRole } from '../types/academic.types.js';
import {
  FileCategory,
  type IAcademicFile,
} from '../models/AcademicFile.js';
import {
  StudentEnrollment,
  TeacherAssignment,
  User,
} from '../models/index.js';

export interface IAuthUserContext {
  _id: Types.ObjectId | string;
  role: UserRole;
  department?: Types.ObjectId | string | null;
  enrolledSubjects?: Array<Types.ObjectId | string>;
}


export class FileAccessService {
  /**
   * Enforces granular role-based and subject-scoped authorization on academic files.
   * Throws ApiError.forbidden or ApiError.notFound if access is prohibited.
   */
  public static async authorizeFileAccess(
    userContext: IAuthUserContext,
    file: IAcademicFile
  ): Promise<boolean> {
    const userIdStr = String(userContext._id);
    const uploaderIdStr = String(file.uploadedBy);
    const userRole = userContext.role;

    // 1. Super-Admins & Institutional Principals have global governance access
    if (userRole === UserRole.ADMIN || userRole === UserRole.PRINCIPAL) {
      return true;
    }

    // 2. Department HOD has full access to files associated with their department
    if (userRole === UserRole.HOD) {
      if (file.department && userContext.department) {
        if (String(file.department) === String(userContext.department)) {
          return true;
        }
      }
      // If file has subject, check subject department
      if (file.subject) {
        const isAssigned = await TeacherAssignment.exists({
          teacher: userContext._id,
          subject: file.subject,
        });
        if (isAssigned) return true;
      }
      // If HOD is the uploader
      if (uploaderIdStr === userIdStr) {
        return true;
      }
      throw ApiError.forbidden(
        'Access Denied: This file does not belong to your academic department hierarchy.'
      );
    }

    // 3. Faculty / Teachers
    if (userRole === UserRole.TEACHER) {
      // Teachers can always access files they personally uploaded
      if (uploaderIdStr === userIdStr) {
        return true;
      }

      // If file is bound to a subject, verify that the teacher is assigned to this subject
      if (file.subject) {
        const isAssigned = await TeacherAssignment.exists({
          teacher: userContext._id,
          subject: file.subject,
          status: 'ACTIVE',
        });

        if (isAssigned) {
          return true;
        }

        throw ApiError.forbidden(
          'Access Denied: Teacher can only download files belonging to authorized subjects.'
        );
      }

      // If not tied to a subject, check if uploaded within same department
      if (file.department && userContext.department) {
        if (String(file.department) === String(userContext.department)) {
          return true;
        }
      }

      throw ApiError.forbidden(
        'Access Denied: You are not authorized to access this academic file.'
      );
    }

    // 4. Students
    if (userRole === UserRole.STUDENT) {
      // ─── CASE A: Assignment Submission (Confidential) ───
      if (file.category === FileCategory.ASSIGNMENT_SUBMISSION || file.isConfidentialSubmission) {
        // STRICT RULE: Student can ONLY access their OWN submissions!
        if (uploaderIdStr === userIdStr) {
          return true;
        }

        // Student A attempting to access Student B's file is explicitly rejected
        throw ApiError.forbidden(
          'Access Denied: You are not authorized to view or download another student\'s assignment submission.'
        );
      }

      // ─── CASE B: Published Subject Resources (Notes, PPTs, Videos, Materials) ───
      if (file.isPublicToSubject && file.subject) {
        // Verify student is enrolled in the subject
        let isEnrolled = false;

        // Check user profile cache if available
        if (userContext.enrolledSubjects && userContext.enrolledSubjects.length > 0) {
          isEnrolled = userContext.enrolledSubjects.some(
            (sId) => String(sId) === String(file.subject)
          );
        }

        // Check active enrollment collection in database
        if (!isEnrolled) {
          const activeEnrollment = await StudentEnrollment.exists({
            student: userContext._id,
            enrolledSubjects: file.subject,
            status: 'APPROVED',
          });
          isEnrolled = Boolean(activeEnrollment);
        }

        if (isEnrolled) {
          return true;
        }

        throw ApiError.forbidden(
          'Access Denied: You can only access resources for subjects you are actively enrolled in.'
        );
      }

      // ─── CASE C: File personally uploaded by student ───
      if (uploaderIdStr === userIdStr) {
        return true;
      }

      throw ApiError.forbidden(
        'Access Denied: You do not possess authorized credentials to access this private file.'
      );
    }

    throw ApiError.forbidden('Access Denied: Unauthorized role access.');
  }

  /**
   * Helper to verify if a user has permission to delete a file.
   */
  public static async authorizeFileDeletion(
    userContext: IAuthUserContext,
    file: IAcademicFile
  ): Promise<boolean> {
    const userIdStr = String(userContext._id);
    const uploaderIdStr = String(file.uploadedBy);

    if (userContext.role === UserRole.ADMIN) return true;

    // Uploader can delete their own file if not graded
    if (uploaderIdStr === userIdStr) {
      return true;
    }

    // Teacher can delete subject resources for their subjects
    if (userContext.role === UserRole.TEACHER && file.subject) {
      const isAssigned = await TeacherAssignment.exists({
        teacher: userContext._id,
        subject: file.subject,
        status: 'ACTIVE',
      });
      if (isAssigned) return true;
    }

    throw ApiError.forbidden('You are not authorized to delete this file.');
  }
}
