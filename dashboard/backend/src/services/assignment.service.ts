import { Types } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import {
  Assignment,
  AssignmentSubmission,
  AssignmentGrade,
} from '../models/Assignment.js';
import type {
  IAssignment,
  IAssignmentSubmission,
} from '../models/Assignment.js';
import { Subject } from '../models/Subject.js';
import { AuditLog } from '../models/AuditLog.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { TeacherAssignment } from '../models/TeacherAssignment.js';
import { User } from '../models/User.js';
import {
  AssignmentStatus,
  SubmissionStatus,
  LateSubmissionPolicy,
  TeacherGradingDecision,
  AuditAction,
  UserRole,
  NotificationType,
  EnrollmentStatus,
  TeacherAssignmentStatus,
  ApprovalStatus,
} from '../types/academic.types.js';
import { AiAssignmentService } from './ai-assignment.service.js';
import { NotificationService } from './notification.service.js';

export class AssignmentService {
  /**
   * Teacher creates a new assignment manually or with pre-generated content.
   */
  static async createAssignment(teacherId: string, data: any): Promise<IAssignment> {
    const subject = await Subject.findById(data.subjectId);
    if (!subject) {
      throw ApiError.notFound('Subject not found.');
    }

    const assignment = await Assignment.create({
      title: data.title,
      description: data.description,
      instructions: data.instructions,
      department: subject.department,
      semester: subject.semester,
      subject: subject._id,
      teacher: teacherId,
      chapterOrUnit: data.chapterOrUnit || 1,
      chapterTitle: data.chapterTitle,
      topics: Array.isArray(data.topics) ? data.topics : [],
      dueDate: data.dueDate,
      lateSubmissionPolicy: data.lateSubmissionPolicy || LateSubmissionPolicy.ALLOW_WITH_PENALTY,
      latePenaltyPercent: data.latePenaltyPercent ?? 10,
      lateDeadline: data.lateDeadline,
      maxMarks: data.maxMarks,
      passingMarks: data.passingMarks ?? Math.round(data.maxMarks * 0.4),
      allowedFileTypes: data.allowedFileTypes || ['pdf', 'docx', 'zip', 'py', 'ipynb', 'txt'],
      maxFileSizeMB: data.maxFileSizeMB || 20,
      allowTextSubmission: data.allowTextSubmission ?? true,
      allowFileSubmission: data.allowFileSubmission ?? true,
      allowResubmission: data.allowResubmission ?? true,
      attachments: data.attachments || [],
      referenceMaterials: data.referenceMaterials || [],
      rubricCriteria: data.rubricCriteria || [],
      autoEvaluationSettings: data.autoEvaluationSettings || {
        enabled: false,
        showCriteriaToStudents: true,
        criteria: {
          correctness: true,
          completeness: true,
          requiredConcepts: false,
          keywordCriteria: false,
          rubricCriteria: true,
          formattingCriteria: false,
          numericalCorrectness: false,
        },
        requiredKeywords: [],
        requiredConcepts: [],
      },
      manualGradingSetting: data.manualGradingSetting || {
        requireTeacherApproval: true,
        allowAiPreGrading: true,
      },
      status: data.status || AssignmentStatus.PUBLISHED,
    });

    await AuditLog.create({
      user: teacherId,
      action: AuditAction.ASSIGNMENT_CREATE,
      entityType: 'Assignment',
      entityId: assignment._id,
      description: `Created assignment "${assignment.title}" for subject ${subject.subjectCode}`,
    });

    if (assignment.status === AssignmentStatus.PUBLISHED) {
      this.notifyEnrolledStudentsOfAssignment(assignment, teacherId).catch(() => {});
    }

    return assignment;

  }

  /**
   * Teacher edits an existing assignment.
   */
  static async updateAssignment(
    assignmentId: string,
    teacherId: string,
    data: any
  ): Promise<IAssignment> {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      throw ApiError.notFound('Assignment not found.');
    }

    if (String(assignment.teacher) !== String(teacherId)) {
      throw ApiError.forbidden('You are not authorized to edit this assignment.');
    }

    Object.assign(assignment, data);
    await assignment.save();

    return assignment;
  }

  /**
   * Publish an assignment.
   */
  static async publishAssignment(assignmentId: string, teacherId: string): Promise<IAssignment> {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Assignment not found.');
    if (String(assignment.teacher) !== String(teacherId)) {
      throw ApiError.forbidden('Unauthorized to publish this assignment.');
    }

    assignment.status = AssignmentStatus.PUBLISHED;
    await assignment.save();

    this.notifyEnrolledStudentsOfAssignment(assignment, teacherId).catch(() => {});

    return assignment;

  }

  /**
   * Unpublish (revert to DRAFT).
   */
  static async unpublishAssignment(assignmentId: string, teacherId: string): Promise<IAssignment> {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Assignment not found.');
    if (String(assignment.teacher) !== String(teacherId)) {
      throw ApiError.forbidden('Unauthorized to unpublish this assignment.');
    }

    assignment.status = AssignmentStatus.DRAFT;
    await assignment.save();
    return assignment;
  }

  /**
   * Close submissions for an assignment.
   */
  static async closeSubmissions(assignmentId: string, teacherId: string): Promise<IAssignment> {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Assignment not found.');
    if (String(assignment.teacher) !== String(teacherId)) {
      throw ApiError.forbidden('Unauthorized to close submissions.');
    }

    assignment.status = AssignmentStatus.CLOSED;
    await assignment.save();
    return assignment;
  }

  /**
   * Duplicate an assignment as a new draft.
   */
  static async duplicateAssignment(assignmentId: string, teacherId: string): Promise<IAssignment> {
    const original = await Assignment.findById(assignmentId).lean();
    if (!original) throw ApiError.notFound('Assignment not found.');

    const { _id, createdAt, updatedAt, ...rest } = original as any;
    const duplicated = await Assignment.create({
      ...rest,
      title: `${original.title} (Copy)`,
      teacher: teacherId,
      status: AssignmentStatus.DRAFT,
    });

    return duplicated;
  }

  /**
   * Delete an assignment.
   */
  static async deleteAssignment(assignmentId: string, teacherId: string): Promise<void> {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Assignment not found.');
    if (String(assignment.teacher) !== String(teacherId)) {
      throw ApiError.forbidden('Unauthorized to delete this assignment.');
    }

    await AssignmentSubmission.deleteMany({ assignment: assignment._id });
    await AssignmentGrade.deleteMany({ assignment: assignment._id });
    await Assignment.findByIdAndDelete(assignmentId);
  }

  /**
   * Get assignments created by a teacher, with submission counts.
   */
  static async getTeacherAssignments(teacherId: string, subjectId?: string) {
    const filter: Record<string, unknown> = { teacher: teacherId };
    if (subjectId) filter.subject = subjectId;

    const assignments = await Assignment.find(filter)
      .populate('subject', 'subjectName subjectCode')
      .populate('semester', 'semesterNumber academicYear')
      .sort({ createdAt: -1 })
      .lean();

    const results = await Promise.all(
      assignments.map(async (a: any) => {
        const totalSubmissions = await AssignmentSubmission.countDocuments({ assignment: a._id });
        const gradedSubmissions = await AssignmentSubmission.countDocuments({
          assignment: a._id,
          isGraded: true,
        });

        return {
          ...a,
          submissionsCount: totalSubmissions,
          gradedSubmissionsCount: gradedSubmissions,
          pendingSubmissionsCount: totalSubmissions - gradedSubmissions,
        };
      })
    );

    return results;
  }

  /**
   * Get submissions for an assignment (Teacher view).
   */
  static async getAssignmentSubmissions(assignmentId: string, teacherId: string) {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Assignment not found.');

    const submissions = await AssignmentSubmission.find({ assignment: assignmentId })
      .populate('student', 'name identifier email avatar')
      .sort({ submittedAt: -1 })
      .lean();

    const grades = await AssignmentGrade.find({ assignment: assignmentId }).lean();
    const gradeMap = new Map(grades.map((g: any) => [String(g.submission), g]));

    return submissions.map((s: any) => ({
      ...s,
      grade: gradeMap.get(String(s._id)) || null,
    }));
  }

  /**
   * Student fetches assignments for an enrolled course.
   */
  static async getStudentAssignments(studentId: string, subjectId: string) {
    const assignments = await Assignment.find({
      subject: subjectId,
      status: { $in: [AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED] },
    })
      .sort({ dueDate: 1 })
      .lean();

    const submissions = await AssignmentSubmission.find({
      student: studentId,
      assignment: { $in: assignments.map((a) => a._id) },
    }).lean();

    const grades = await AssignmentGrade.find({
      student: studentId,
      assignment: { $in: assignments.map((a) => a._id) },
    }).lean();

    const submissionMap = new Map(submissions.map((s: any) => [String(s.assignment), s]));
    const gradeMap = new Map(grades.map((g: any) => [String(g.assignment), g]));

    return assignments.map((a: any) => {
      const sub = submissionMap.get(String(a._id));
      const grade = gradeMap.get(String(a._id));

      // Sanitize rubric / auto-eval criteria according to showCriteriaToStudents setting
      const showCriteria = a.autoEvaluationSettings?.showCriteriaToStudents ?? true;
      const visibleCriteria = showCriteria ? a.autoEvaluationSettings : undefined;

      return {
        ...a,
        autoEvaluationSettings: visibleCriteria,
        mySubmission: sub
          ? {
              _id: sub._id,
              submittedAt: sub.submittedAt,
              submissionText: sub.submissionText,
              submissionFiles: sub.submissionFiles,
              notes: sub.notes,
              isLate: sub.isLate,
              status: sub.status,
              isGraded: sub.isGraded,
              resubmissionCount: sub.resubmissionCount,
            }
          : null,
        myGrade: grade
          ? {
              marksObtained: grade.marksObtained,
              maxMarks: grade.maxMarks,
              feedback: grade.feedback,
              rubricScores: grade.rubricScores,
              criterionFeedback: grade.criterionFeedback,
              lateDeductionApplied: grade.lateDeductionApplied,
              gradedAt: grade.gradedAt,
            }
          : null,
        submissionStatus: grade
          ? 'GRADED'
          : sub
          ? sub.status
          : 'NOT_SUBMITTED',
      };
    });
  }

  /**
   * Student submits or resubmits work.
   */
  static async submitAssignment(
    studentId: string,
    assignmentId: string,
    data: {
      submissionText?: string;
      submissionFiles?: Array<{ name: string; url: string; sizeBytes?: number; fileType?: string }>;
      notes?: string;
    }
  ): Promise<IAssignmentSubmission> {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Assignment not found.');

    if (assignment.status === AssignmentStatus.CLOSED) {
      throw ApiError.badRequest('Submissions for this assignment have been closed.');
    }
    if (assignment.status === AssignmentStatus.DRAFT) {
      throw ApiError.badRequest('This assignment has not been published yet.');
    }

    // Strict Enrollment Check: Ensure student is actively enrolled in this assignment's subject
    const isEnrolled = await StudentEnrollment.exists({
      student: studentId,
      enrolledSubjects: assignment.subject,
      status: EnrollmentStatus.APPROVED,
    });
    if (!isEnrolled) {
      throw ApiError.forbidden('You are not actively enrolled in the subject for this assignment.');
    }

    const now = new Date();
    const isPastDeadline = now > new Date(assignment.dueDate);

    if (isPastDeadline) {
      if (assignment.lateSubmissionPolicy === LateSubmissionPolicy.REJECT) {
        throw ApiError.badRequest(
          'Deadline has passed. Late submissions are not permitted for this assignment.'
        );
      }
      if (assignment.lateDeadline && now > new Date(assignment.lateDeadline)) {
        throw ApiError.badRequest(
          'The extended late submission window has expired.'
        );
      }
    }

    // Validate file extensions if files are attached
    if (data.submissionFiles && data.submissionFiles.length > 0) {
      const allowedExts = (assignment.allowedFileTypes || []).map((e) => e.toLowerCase().replace('.', ''));
      if (allowedExts.length > 0) {
        for (const file of data.submissionFiles) {
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext && !allowedExts.includes(ext)) {
            throw ApiError.badRequest(
              `File "${file.name}" has an unsupported format (.${ext}). Allowed types: ${allowedExts.join(', ')}`
            );
          }
        }
      }
    }

    const existingSubmission = await AssignmentSubmission.findOne({
      assignment: assignment._id,
      student: studentId,
    });

    let submission: IAssignmentSubmission;

    if (existingSubmission) {
      if (!assignment.allowResubmission) {
        throw ApiError.badRequest('Resubmissions are not permitted for this assignment.');
      }
      if (existingSubmission.isGraded) {
        throw ApiError.badRequest('Your submission has already been graded and cannot be replaced.');
      }

      existingSubmission.submissionText = data.submissionText;
      existingSubmission.submissionFiles = data.submissionFiles || [];
      existingSubmission.notes = data.notes;
      existingSubmission.submittedAt = now;
      existingSubmission.isLate = isPastDeadline;
      existingSubmission.status = isPastDeadline ? SubmissionStatus.LATE : SubmissionStatus.RESUBMITTED;
      existingSubmission.resubmissionCount = (existingSubmission.resubmissionCount || 0) + 1;
      existingSubmission.aiEvaluation = undefined; // reset previous AI evaluation if any

      await existingSubmission.save();
      submission = existingSubmission;
    } else {
      submission = await AssignmentSubmission.create({
        assignment: assignment._id,
        student: studentId,
        submissionText: data.submissionText,
        submissionFiles: data.submissionFiles || [],
        notes: data.notes,
        submittedAt: now,
        isLate: isPastDeadline,
        status: isPastDeadline ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED,
        isGraded: false,
        resubmissionCount: 0,
      });
    }

    await AuditLog.create({
      user: studentId,
      action: AuditAction.ASSIGNMENT_SUBMIT,
      entityType: 'AssignmentSubmission',
      entityId: submission._id,
      description: `Student submitted assignment "${assignment.title}"${isPastDeadline ? ' (Late)' : ''}`,
    });

    // If auto-evaluation is enabled on the assignment, evaluate asynchronously
    if (assignment.autoEvaluationSettings?.enabled) {
      AiAssignmentService.evaluateSubmission(String(submission._id), String(assignment.teacher)).catch(
        (err) => console.warn('[AssignmentService] Background AI pre-evaluation notice:', err?.message)
      );
    }

    // Notify teacher of student assignment submission
    try {
      const student = await User.findById(studentId).select('name identifier');
      await NotificationService.create({
        recipient: assignment.teacher,
        sender: studentId,
        type: NotificationType.ASSIGNMENT_SUBMITTED,
        title: `New Assignment Submission: ${assignment.title}`,
        message: `${student?.name || 'A student'} (${student?.identifier || 'Student'}) submitted work for "${assignment.title}"${isPastDeadline ? ' (Late)' : ''}.`,
        metadata: {
          assignmentId: String(assignment._id),
          submissionId: String(submission._id),
          studentId: String(studentId),
          studentName: student?.name,
          isLate: isPastDeadline,
        },
        link: `/dashboard`,
      });
    } catch (notifErr: any) {
      // Non-blocking
    }

    return submission;

  }

  /**
   * Teacher assigns or confirms official grade (Manual or AI-assisted).
   * Teacher is in strict final control.
   */
  static async gradeSubmission(teacherId: string, data: any) {
    const submission = await AssignmentSubmission.findById(data.submissionId).populate('assignment');
    if (!submission) throw ApiError.notFound('Submission not found.');

    const assignment = submission.assignment as any;

    // Strict Teacher/HOD Authorization Check:
    const user = await User.findById(teacherId);
    if (!user) throw ApiError.unauthenticated('User not found.');

    if (user.role === UserRole.TEACHER) {
      if (user.approvalStatus !== ApprovalStatus.APPROVED) {
        throw ApiError.forbidden('Teacher account is pending approval.');
      }
      const isAssigned = await TeacherAssignment.exists({
        teacher: teacherId,
        subject: assignment.subject,
        status: TeacherAssignmentStatus.ACTIVE,
      });
      if (!isAssigned && String(assignment.teacher) !== String(teacherId)) {
        throw ApiError.forbidden('You are not authorized to grade submissions for this subject.');
      }
    } else if (user.role === UserRole.HOD) {
      if (!user.department || String(user.department) !== String(assignment.department)) {
        throw ApiError.forbidden('HOD cannot grade assignments outside their assigned department.');
      }
    }

    const maxMarks = data.maxMarks || assignment.maxMarks || 100;

    if (data.marksObtained > maxMarks) {
      throw ApiError.badRequest(`Marks obtained (${data.marksObtained}) cannot exceed max marks (${maxMarks}).`);
    }

    const teacherDecision = data.teacherDecision || TeacherGradingDecision.MANUAL;

    const grade = await AssignmentGrade.findOneAndUpdate(
      { submission: submission._id },
      {
        assignment: assignment._id,
        student: submission.student,
        gradedBy: teacherId,
        marksObtained: data.marksObtained,
        maxMarks,
        feedback: data.feedback || '',
        rubricScores: data.rubricScores || {},
        criterionFeedback: data.criterionFeedback || [],
        lateDeductionApplied: data.lateDeductionApplied || 0,
        teacherDecision,
        gradedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    submission.isGraded = true;
    submission.status = SubmissionStatus.GRADED;

    if (submission.aiEvaluation) {
      submission.aiEvaluation.reviewStatus =
        teacherDecision === TeacherGradingDecision.ACCEPTED_AI
          ? 'ACCEPTED'
          : teacherDecision === TeacherGradingDecision.MODIFIED_AI
          ? 'MODIFIED'
          : 'REJECTED';
    }

    await submission.save();

    await AuditLog.create({
      user: teacherId,
      action: AuditAction.GRADING,
      entityType: 'AssignmentGrade',
      entityId: grade._id,
      description: `Graded assignment submission for "${assignment.title}" (${data.marksObtained}/${maxMarks}) [Decision: ${teacherDecision}]`,
    });

    // Notify student that assignment result has been published
    try {
      await NotificationService.create({
        recipient: submission.student,
        sender: teacherId,
        type: NotificationType.RESULT_PUBLISHED,
        title: `Assignment Result: ${assignment.title}`,
        message: `Your assignment "${assignment.title}" has been graded: ${data.marksObtained}/${maxMarks} marks.${data.feedback ? ` Feedback: "${data.feedback}"` : ''}`,
        metadata: {
          assignmentId: String(assignment._id),
          submissionId: String(submission._id),
          marksObtained: data.marksObtained,
          maxMarks,
          feedback: data.feedback,
        },
        link: `/student/subject/${assignment.subject}`,
      });
    } catch (notifErr: any) {
      // Non-blocking
    }

    return grade;

  }

  /**
   * Fetch single assignment details.
   */
  static async getAssignmentById(assignmentId: string, user: any) {
    const assignment = await Assignment.findById(assignmentId)
      .populate('subject', 'subjectName subjectCode')
      .populate('department', 'name code shortName type')
      .populate('semester', 'semesterNumber academicYear regulation')
      .populate('teacher', 'name email');

    if (!assignment) throw ApiError.notFound('Assignment not found.');

    return assignment;
  }

  private static async notifyEnrolledStudentsOfAssignment(assignment: any, teacherId: string) {
    try {
      const enrollments = await StudentEnrollment.find({
        enrolledSubjects: assignment.subject,
        status: EnrollmentStatus.APPROVED,
      }).select('student');

      const subject = await Subject.findById(assignment.subject).select('subjectCode subjectName');
      const subCode = subject?.subjectCode || 'Course';

      const notifs = enrollments.map((enr) => ({
        recipient: enr.student,
        sender: teacherId,
        type: NotificationType.ASSIGNMENT_PUBLISHED,
        title: `New Assignment Published: ${assignment.title}`,
        message: `A new assignment "${assignment.title}" has been published for ${subCode}. Due: ${new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.`,
        metadata: {
          assignmentId: String(assignment._id),
          subjectId: String(assignment.subject),
          dueDate: assignment.dueDate,
          maxMarks: assignment.maxMarks,
        },
        link: `/student/subject/${assignment.subject}`,
      }));

      await NotificationService.createBulk(notifs);
    } catch (err: any) {
      // Non-blocking notification dispatch
    }
  }
}

