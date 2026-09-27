import mongoose, { Types } from 'mongoose';
import {
  AttendanceRecord,
  AttendanceSession,
  type IAttendanceSession,
} from '../models/Attendance.js';
import { Subject } from '../models/Subject.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { User } from '../models/User.js';
import { Quiz, QuizResult } from '../models/Quiz.js';
import {
  Assignment,
  AssignmentGrade,
  AssignmentSubmission,
} from '../models/Assignment.js';
import { Semester } from '../models/Semester.js';
import { SemesterResult } from '../models/AcademicResult.js';
import { TeacherAssignment } from '../models/TeacherAssignment.js';
import { AuditLog } from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import {
  AttendanceStatus,
  AuditAction,
  EnrollmentStatus,
  TeacherAssignmentStatus,
  UserRole,
  ApprovalStatus,
} from '../types/academic.types.js';

export class TrackingService {
  /**
   * Helper: Check if teacher or admin has rights to manage a subject.
   */
  private static async verifyTeacherAccess(userId: string, subjectId: string) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.unauthenticated('User not found.');

    if (user.role === UserRole.ADMIN || user.role === UserRole.PRINCIPAL) {
      return user;
    }

    if (user.role === UserRole.HOD) {
      const subject = await Subject.findById(subjectId);
      if (!subject || !user.department || String(subject.department) !== String(user.department)) {
        throw ApiError.forbidden('HOD cannot manage attendance or results outside their assigned department.');
      }
      return user;
    }

    if (user.role === UserRole.TEACHER) {
      if (user.approvalStatus !== ApprovalStatus.APPROVED) {
        throw ApiError.forbidden('Teacher account is pending approval before managing attendance or results.');
      }
    }

    const assignment = await TeacherAssignment.findOne({
      teacher: userId,
      subject: subjectId,
      status: TeacherAssignmentStatus.ACTIVE,
    });

    if (!assignment) {
      throw ApiError.forbidden('You are not authorized to manage attendance or results for this subject.');
    }

    return user;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 1. ATTENDANCE: ENROLLED STUDENTS & DUPLICATE CHECK
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Teacher selects Department, Semester, Subject, and Date to see enrolled students.
   * Also checks if a session was already recorded for this subject on this date.
   */
  static async getEnrolledStudentsForAttendance(
    userId: string,
    filter: {
      subjectId: string;
      departmentId?: string;
      semesterId?: string;
      date?: string | Date;
    }
  ) {
    await this.verifyTeacherAccess(userId, filter.subjectId);

    const subject = await Subject.findById(filter.subjectId)
      .populate('department', 'name code shortName type')
      .populate('semester', 'semesterNumber academicYear');

    if (!subject) throw ApiError.notFound('Subject not found.');

    // Fetch approved enrollments for this subject
    const enrollments = await StudentEnrollment.find({
      enrolledSubjects: subject._id,
      status: EnrollmentStatus.APPROVED,
    })
      .populate('student', 'name identifier collegeEmail rollNumber profile department')
      .sort({ 'student.identifier': 1, 'student.name': 1 });

    const enrolledStudents = enrollments
      .map((enr) => {
        const student = enr.student as any;
        if (!student) return null;
        return {
          studentId: String(student._id),
          name: student.name,
          rollNumber: student.identifier || student.rollNumber || 'N/A',
          collegeEmail: student.collegeEmail,
          department: student.department,
          status: AttendanceStatus.PRESENT as AttendanceStatus,
          remarks: '',
        };
      })
      .filter(Boolean);

    // If date is provided, check for existing sessions on the same calendar day
    let existingSession: any = null;
    let duplicateDetected = false;

    if (filter.date) {
      const targetDate = new Date(filter.date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

      existingSession = await AttendanceSession.findOne({
        subject: subject._id,
        date: { $gte: startOfDay, $lte: endOfDay },
      }).populate('teacher', 'name email');

      if (existingSession) {
        duplicateDetected = true;
        // Fetch existing attendance records to pre-populate student statuses
        const records = await AttendanceRecord.find({ session: existingSession._id });
        const recordMap = new Map<string, any>();
        records.forEach((r) => recordMap.set(String(r.student), r));

        enrolledStudents.forEach((student: any) => {
          const rec = recordMap.get(student.studentId);
          if (rec) {
            student.status = rec.status;
            student.remarks = rec.remarks || '';
          }
        });
      }
    }

    return {
      subject: {
        _id: subject._id,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        department: subject.department,
        semester: subject.semester,
      },
      enrolledStudents,
      existingSession,
      duplicateDetected,
      duplicateMessage: duplicateDetected
        ? `An attendance session already exists for this subject on ${new Date(
            filter.date!
          ).toLocaleDateString()} (Period ${existingSession.period}). To record another session for today, enable "Allow duplicate session", or edit the existing session.`
        : null,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. ATTENDANCE: RECORD SESSION (WITH DUPLICATE PREVENTION)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Teacher marks attendance individually or bulk, preventing duplicate sessions unless explicitly permitted.
   */
  static async recordAttendanceSession(
    teacherId: string,
    data: {
      subjectId: string;
      departmentId?: string;
      semesterId?: string;
      date: Date | string;
      period: number;
      timeSlot?: string;
      topicCovered?: string;
      section?: string;
      records: Array<{
        studentId: string;
        status: AttendanceStatus;
        remarks?: string;
      }>;
      allowDuplicateSession?: boolean;
    }
  ) {
    await this.verifyTeacherAccess(teacherId, data.subjectId);

    const subject = await Subject.findById(data.subjectId).populate('semester', 'academicYear');
    if (!subject) throw ApiError.notFound('Subject not found.');

    const sessionDate = new Date(data.date);
    const startOfDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 23, 59, 59, 999);

    // Duplicate check: prevent duplicate attendance sessions for the same subject/date unless explicitly permitted
    if (!data.allowDuplicateSession) {
      const existing = await AttendanceSession.findOne({
        subject: subject._id,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      if (existing) {
        throw ApiError.conflict(
          `An attendance session already exists for this subject on this date (${sessionDate.toLocaleDateString()}, Period ${existing.period}). If you intend to record an extra session for this day, please confirm "Allow duplicate session" or edit the existing session.`
        );
      }
    }

    // Calculate status counts
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    data.records.forEach((r) => {
      if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.OD) {
        presentCount++;
      } else if (r.status === AttendanceStatus.ABSENT) {
        absentCount++;
      } else if (r.status === AttendanceStatus.LATE) {
        lateCount++;
      } else if (r.status === AttendanceStatus.EXCUSED) {
        excusedCount++;
      }
    });

    const session = await AttendanceSession.create({
      department: subject.department, // derived from the subject, never from the client
      semester: data.semesterId || subject.semester,
      subject: subject._id,
      teacher: teacherId,
      date: sessionDate,
      period: data.period,
      timeSlot: data.timeSlot || '09:00 - 10:00 AM',
      topicCovered: data.topicCovered || 'Classroom Lecture Session',
      section: data.section || 'ALL',
      academicYear: (subject.semester as any)?.academicYear || '2024-2025',
      totalStudents: data.records.length,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
    });

    const recordDocs = data.records.map((r) => ({
      session: session._id,
      student: new Types.ObjectId(r.studentId),
      status: r.status,
      remarks: r.remarks || '',
      markedBy: new Types.ObjectId(teacherId),
    }));

    await AttendanceRecord.insertMany(recordDocs);

    await AuditLog.create({
      user: teacherId,
      action: AuditAction.ATTENDANCE_RECORD,
      entityType: 'AttendanceSession',
      entityId: session._id,
      description: `Recorded attendance for ${subject.subjectCode}, Period ${data.period}: ${presentCount} Present, ${absentCount} Absent, ${lateCount} Late, ${excusedCount} Excused`,
    });

    return {
      session,
      recordsCount: recordDocs.length,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      percentage:
        data.records.length > 0 ? Math.round(((presentCount + lateCount * 0.5) / data.records.length) * 100) : 100,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. ATTENDANCE: EDIT SESSION
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Teacher edits an existing attendance session and updates student records.
   */
  static async updateAttendanceSession(
    teacherId: string,
    sessionId: string,
    data: {
      period?: number;
      timeSlot?: string;
      topicCovered?: string;
      section?: string;
      records?: Array<{
        studentId: string;
        status: AttendanceStatus;
        remarks?: string;
      }>;
    }
  ) {
    const session = await AttendanceSession.findById(sessionId);
    if (!session) throw ApiError.notFound('Attendance session not found.');

    await this.verifyTeacherAccess(teacherId, String(session.subject));

    if (data.period !== undefined) session.period = data.period;
    if (data.timeSlot !== undefined) session.timeSlot = data.timeSlot;
    if (data.topicCovered !== undefined) session.topicCovered = data.topicCovered;
    if (data.section !== undefined) session.section = data.section;

    if (data.records && data.records.length > 0) {
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;

      for (const rec of data.records) {
        if (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.OD) {
          presentCount++;
        } else if (rec.status === AttendanceStatus.ABSENT) {
          absentCount++;
        } else if (rec.status === AttendanceStatus.LATE) {
          lateCount++;
        } else if (rec.status === AttendanceStatus.EXCUSED) {
          excusedCount++;
        }

        await AttendanceRecord.findOneAndUpdate(
          { session: session._id, student: new Types.ObjectId(rec.studentId) },
          {
            $set: {
              status: rec.status,
              remarks: rec.remarks || '',
              markedBy: new Types.ObjectId(teacherId),
            },
          },
          { upsert: true, new: true }
        );
      }

      session.totalStudents = data.records.length;
      session.presentCount = presentCount;
      session.absentCount = absentCount;
      session.lateCount = lateCount;
      session.excusedCount = excusedCount;
    }

    await session.save();

    await AuditLog.create({
      user: teacherId,
      action: AuditAction.ATTENDANCE_RECORD,
      entityType: 'AttendanceSession',
      entityId: session._id,
      description: `Updated attendance session ${session._id} for subject ${session.subject}`,
    });

    const updatedRecords = await AttendanceRecord.find({ session: session._id }).populate(
      'student',
      'name identifier rollNumber collegeEmail'
    );

    return {
      session,
      records: updatedRecords,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. ATTENDANCE: VIEW HISTORY & DETAILS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * View attendance history for a subject or department with filtering and aggregation.
   */
  static async getAttendanceHistory(filter: {
    subjectId?: string;
    departmentId?: string;
    semesterId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};
    if (filter.subjectId) query.subject = new Types.ObjectId(filter.subjectId);
    if (filter.departmentId) query.department = new Types.ObjectId(filter.departmentId);
    if (filter.semesterId) query.semester = new Types.ObjectId(filter.semesterId);

    if (filter.startDate || filter.endDate) {
      query.date = {};
      if (filter.startDate) query.date.$gte = new Date(filter.startDate);
      if (filter.endDate) query.date.$lte = new Date(filter.endDate);
    }

    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 30;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      AttendanceSession.find(query)
        .populate('subject', 'subjectName subjectCode')
        .populate('teacher', 'name email designation')
        .sort({ date: -1, period: -1 })
        .skip(skip)
        .limit(limit),
      AttendanceSession.countDocuments(query),
    ]);

    // Aggregate statistics across matching sessions
    const stats = await AttendanceSession.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalPresent: { $sum: '$presentCount' },
          totalAbsent: { $sum: '$absentCount' },
          totalLate: { $sum: { $ifNull: ['$lateCount', 0] } },
          totalExcused: { $sum: { $ifNull: ['$excusedCount', 0] } },
          totalPossibleStudents: { $sum: '$totalStudents' },
        },
      },
    ]);

    const aggregateStats = stats[0] || {
      totalSessions: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalExcused: 0,
      totalPossibleStudents: 0,
    };

    const overallPercentage =
      aggregateStats.totalPossibleStudents > 0
        ? Math.round(
            ((aggregateStats.totalPresent + aggregateStats.totalLate * 0.5) /
              aggregateStats.totalPossibleStudents) *
              100
          )
        : 100;

    return {
      sessions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        ...aggregateStats,
        overallPercentage,
      },
    };
  }

  /**
   * Get single attendance session with all student-level records.
   */
  static async getAttendanceSessionById(sessionId: string) {
    const session = await AttendanceSession.findById(sessionId)
      .populate('subject', 'subjectName subjectCode')
      .populate('department', 'name code shortName type')
      .populate('semester', 'semesterNumber academicYear')
      .populate('teacher', 'name email designation');

    if (!session) throw ApiError.notFound('Attendance session not found.');

    const records = await AttendanceRecord.find({ session: session._id })
      .populate('student', 'name identifier rollNumber collegeEmail department profile')
      .sort({ 'student.identifier': 1 });

    return {
      session,
      records,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5. STUDENT: REAL DATABASE ATTENDANCE TRACKING
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Student views:
   * - subject attendance (per subject: present, absent, late, excused, percentage)
   * - total attendance (across all subjects)
   * - present, absent, percentage
   * - semester overall attendance
   * Uses real database aggregation rather than frontend calculations.
   */
  static async getStudentAttendanceTracking(studentId: string) {
    const studentObjectId = new Types.ObjectId(studentId);

    // 1. Database aggregation by subject
    const subjectAttendanceAggregation = await AttendanceRecord.aggregate([
      { $match: { student: studentObjectId } },
      {
        $lookup: {
          from: 'attendancesessions',
          localField: 'session',
          foreignField: '_id',
          as: 'sessionDetails',
        },
      },
      { $unwind: '$sessionDetails' },
      {
        $group: {
          _id: '$sessionDetails.subject',
          totalSessions: { $sum: 1 },
          present: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$status', AttendanceStatus.PRESENT] },
                    { $eq: ['$status', AttendanceStatus.OD] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$status', AttendanceStatus.ABSENT] }, 1, 0],
            },
          },
          late: {
            $sum: {
              $cond: [{ $eq: ['$status', AttendanceStatus.LATE] }, 1, 0],
            },
          },
          excused: {
            $sum: {
              $cond: [{ $eq: ['$status', AttendanceStatus.EXCUSED] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id',
          foreignField: '_id',
          as: 'subjectInfo',
        },
      },
      { $unwind: { path: '$subjectInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          subjectId: '$_id',
          subjectName: '$subjectInfo.subjectName',
          subjectCode: '$subjectInfo.subjectCode',
          credits: '$subjectInfo.credits',
          totalSessions: 1,
          present: 1,
          absent: 1,
          late: 1,
          excused: 1,
          percentage: {
            $cond: [
              { $gt: ['$totalSessions', 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $add: ['$present', { $multiply: ['$late', 0.5] }] },
                          '$totalSessions',
                        ],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
              100,
            ],
          },
        },
      },
      { $sort: { subjectCode: 1 } },
    ]);

    // 2. Database aggregation: Semester-wise overall attendance
    const semesterAttendanceAggregation = await AttendanceRecord.aggregate([
      { $match: { student: studentObjectId } },
      {
        $lookup: {
          from: 'attendancesessions',
          localField: 'session',
          foreignField: '_id',
          as: 'sessionDetails',
        },
      },
      { $unwind: '$sessionDetails' },
      {
        $group: {
          _id: '$sessionDetails.semester',
          academicYear: { $first: '$sessionDetails.academicYear' },
          totalSessions: { $sum: 1 },
          present: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$status', AttendanceStatus.PRESENT] },
                    { $eq: ['$status', AttendanceStatus.OD] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$status', AttendanceStatus.ABSENT] }, 1, 0],
            },
          },
          late: {
            $sum: {
              $cond: [{ $eq: ['$status', AttendanceStatus.LATE] }, 1, 0],
            },
          },
          excused: {
            $sum: {
              $cond: [{ $eq: ['$status', AttendanceStatus.EXCUSED] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'semesters',
          localField: '_id',
          foreignField: '_id',
          as: 'semesterInfo',
        },
      },
      { $unwind: { path: '$semesterInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          semesterId: '$_id',
          semesterNumber: '$semesterInfo.semesterNumber',
          academicYear: '$academicYear',
          totalSessions: 1,
          present: 1,
          absent: 1,
          late: 1,
          excused: 1,
          percentage: {
            $cond: [
              { $gt: ['$totalSessions', 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $add: ['$present', { $multiply: ['$late', 0.5] }] },
                          '$totalSessions',
                        ],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
              100,
            ],
          },
        },
      },
      { $sort: { semesterNumber: -1 } },
    ]);

    // 3. Overall Totals across all sessions
    let totalSessions = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;

    subjectAttendanceAggregation.forEach((sub: any) => {
      totalSessions += sub.totalSessions;
      totalPresent += sub.present;
      totalAbsent += sub.absent;
      totalLate += sub.late;
      totalExcused += sub.excused;
    });

    const totalPercentage =
      totalSessions > 0
        ? Math.round(((totalPresent + totalLate * 0.5) / totalSessions) * 100)
        : 100;

    // 4. Recent session logs for student timeline view
    const recentLogs = await AttendanceRecord.find({ student: studentObjectId })
      .populate({
        path: 'session',
        populate: [
          { path: 'subject', select: 'subjectName subjectCode' },
          { path: 'teacher', select: 'name' },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(20);

    const formattedLogs = recentLogs
      .filter((r) => r.session)
      .map((r: any) => ({
        recordId: r._id,
        date: r.session.date,
        period: r.session.period,
        timeSlot: r.session.timeSlot,
        topicCovered: r.session.topicCovered,
        subjectName: r.session.subject?.subjectName,
        subjectCode: r.session.subject?.subjectCode,
        teacherName: r.session.teacher?.name,
        status: r.status,
        remarks: r.remarks,
      }));

    return {
      totalAttendance: {
        totalSessions,
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        excused: totalExcused,
        percentage: totalPercentage,
        status: totalPercentage >= 75 ? 'ELIGIBLE' : 'SHORTAGE_WARNING',
      },
      subjectAttendance: subjectAttendanceAggregation,
      semesterOverallAttendance: semesterAttendanceAggregation,
      recentLogs: formattedLogs,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 6. TEACHER: RESULTS & SUBJECT PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Teacher views:
   * - quiz results
   * - assignment results
   * - subject performance & progress analytics
   * Real database aggregation.
   */
  static async getTeacherSubjectResultsAndAnalytics(teacherId: string, subjectId: string) {
    await this.verifyTeacherAccess(teacherId, subjectId);

    const subject = await Subject.findById(subjectId)
      .populate('department', 'name code shortName type')
      .populate('semester', 'semesterNumber academicYear');
    if (!subject) throw ApiError.notFound('Subject not found.');

    const subjectObjectId = new Types.ObjectId(subjectId);

    // ── 1. QUIZ RESULTS AGGREGATION ──
    const quizzes = await Quiz.find({ subject: subjectObjectId }).sort({ createdAt: -1 });
    const quizIds = quizzes.map((q) => q._id);

    const quizAnalytics = await Promise.all(
      quizzes.map(async (quiz) => {
        const results = await QuizResult.find({ quiz: quiz._id }).populate(
          'student',
          'name identifier rollNumber collegeEmail'
        );

        const totalAttempts = results.length;
        const passCount = results.filter((r) => r.passed).length;
        const failCount = totalAttempts - passCount;
        const totalScore = results.reduce((sum, r) => sum + r.score, 0);
        const averageScore = totalAttempts > 0 ? Math.round((totalScore / totalAttempts) * 10) / 10 : 0;
        const highestScore = results.reduce((max, r) => Math.max(max, r.score), 0);
        const lowestScore = totalAttempts > 0 ? results.reduce((min, r) => Math.min(min, r.score), quiz.totalMarks) : 0;

        return {
          quizId: quiz._id,
          title: quiz.title,
          totalMarks: quiz.totalMarks,
          passingMarks: quiz.passingMarks,
          difficultyLevel: quiz.difficultyLevel,
          totalAttempts,
          passCount,
          failCount,
          passRate: totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0,
          averageScore,
          highestScore,
          lowestScore,
          studentResults: results.map((r: any) => ({
            resultId: r._id,
            studentId: r.student?._id,
            studentName: r.student?.name,
            rollNumber: r.student?.identifier || r.student?.rollNumber || 'N/A',
            score: r.score,
            totalMarks: r.totalMarks,
            percentage: r.percentage,
            passed: r.passed,
            grade: r.grade,
            generatedAt: r.generatedAt,
          })),
        };
      })
    );

    // ── 2. ASSIGNMENT RESULTS AGGREGATION ──
    const assignments = await Assignment.find({ subject: subjectObjectId }).sort({ createdAt: -1 });
    const assignmentIds = assignments.map((a) => a._id);

    const assignmentAnalytics = await Promise.all(
      assignments.map(async (assignment) => {
        const submissions = await AssignmentSubmission.find({ assignment: assignment._id }).populate(
          'student',
          'name identifier rollNumber collegeEmail'
        );

        const grades = await AssignmentGrade.find({ assignment: assignment._id });
        const gradeMap = new Map<string, any>();
        grades.forEach((g) => gradeMap.set(String(g.student), g));

        const totalSubmissions = submissions.length;
        const gradedCount = submissions.filter((s) => s.isGraded).length;
        const pendingCount = totalSubmissions - gradedCount;

        const totalEarned = grades.reduce((sum, g) => sum + g.marksObtained, 0);
        const averageMarks = grades.length > 0 ? Math.round((totalEarned / grades.length) * 10) / 10 : 0;

        return {
          assignmentId: assignment._id,
          title: assignment.title,
          totalMarks: assignment.maxMarks,
          deadline: assignment.dueDate,
          status: assignment.status,
          totalSubmissions,
          gradedCount,
          pendingCount,
          averageMarks,
          studentSubmissions: submissions.map((s: any) => {
            const grade = gradeMap.get(String(s.student?._id));
            return {
              submissionId: s._id,
              studentId: s.student?._id,
              studentName: s.student?.name,
              rollNumber: s.student?.identifier || s.student?.rollNumber || 'N/A',
              submittedAt: s.submittedAt,
              isLate: s.isLate,
              status: s.status,
              isGraded: s.isGraded,
              marksObtained: grade?.marksObtained ?? null,
              maxMarks: grade?.maxMarks ?? assignment.maxMarks,
              feedback: grade?.feedback ?? '',
              teacherDecision: grade?.teacherDecision ?? null,
            };
          }),
        };
      })
    );

    // ── 3. SUBJECT PERFORMANCE ROSTER & PROGRESS ANALYTICS ──
    const enrollments = await StudentEnrollment.find({
      enrolledSubjects: subjectObjectId,
      status: EnrollmentStatus.APPROVED,
    })
      .populate('student', 'name identifier rollNumber collegeEmail profile')
      .sort({ 'student.identifier': 1 });

    const sessionCount = await AttendanceSession.countDocuments({ subject: subjectObjectId });
    const subjectSessions = await AttendanceSession.find({ subject: subjectObjectId }).select('_id');
    const sessionIds = subjectSessions.map((s) => s._id);

    const studentRoster = await Promise.all(
      enrollments.map(async (enr) => {
        const student = enr.student as any;
        if (!student) return null;

        // Attendance
        let attendedSessions = 0;
        let attendancePercentage = 100;
        if (sessionIds.length > 0) {
          const records = await AttendanceRecord.find({
            student: student._id,
            session: { $in: sessionIds },
          });
          const presentOrLate = records.filter(
            (r) =>
              r.status === AttendanceStatus.PRESENT ||
              r.status === AttendanceStatus.OD ||
              r.status === AttendanceStatus.LATE
          ).length;
          attendedSessions = presentOrLate;
          attendancePercentage = sessionCount > 0 ? Math.round((presentOrLate / sessionCount) * 100) : 100;
        }

        // Quiz marks
        const studentQuizResults = await QuizResult.find({
          student: student._id,
          quiz: { $in: quizIds },
        });
        const quizzesAttempted = studentQuizResults.length;
        const totalQuizEarned = studentQuizResults.reduce((sum, r) => sum + r.score, 0);
        const totalQuizPossible = studentQuizResults.reduce((sum, r) => sum + r.totalMarks, 0);
        const quizAveragePercentage =
          totalQuizPossible > 0 ? Math.round((totalQuizEarned / totalQuizPossible) * 100) : 0;

        // Assignment marks
        const studentGrades = await AssignmentGrade.find({
          student: student._id,
          assignment: { $in: assignmentIds },
        });
        const assignmentsGraded = studentGrades.length;
        const totalAssignmentEarned = studentGrades.reduce((sum, g) => sum + g.marksObtained, 0);
        const totalAssignmentPossible = studentGrades.reduce((sum, g) => sum + g.maxMarks, 0);
        const assignmentAveragePercentage =
          totalAssignmentPossible > 0 ? Math.round((totalAssignmentEarned / totalAssignmentPossible) * 100) : 0;

        // Weighted continuous assessment score (Internal / CIE marks out of 40)
        // 20 marks from Quizzes, 15 marks from Assignments, 5 marks from Attendance
        const quizWeight = (quizAveragePercentage / 100) * 20;
        const assignmentWeight = (assignmentAveragePercentage / 100) * 15;
        const attendanceWeight = (attendancePercentage / 100) * 5;
        const calculatedInternal = Math.round((quizWeight + assignmentWeight + attendanceWeight) * 10) / 10;
        const overallPercentage = Math.round((calculatedInternal / 40) * 100);

        let standing: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'AT_RISK' = 'GOOD';
        if (attendancePercentage < 75 || overallPercentage < 50) {
          standing = 'AT_RISK';
        } else if (overallPercentage >= 85) {
          standing = 'EXCELLENT';
        } else if (overallPercentage >= 65) {
          standing = 'GOOD';
        } else {
          standing = 'AVERAGE';
        }

        return {
          studentId: student._id,
          name: student.name,
          rollNumber: student.identifier || student.rollNumber || 'N/A',
          collegeEmail: student.collegeEmail,
          attendance: {
            attended: attendedSessions,
            total: sessionCount,
            percentage: attendancePercentage,
          },
          quizzes: {
            attempted: quizzesAttempted,
            totalQuizzes: quizzes.length,
            averagePercentage: quizAveragePercentage,
          },
          assignments: {
            graded: assignmentsGraded,
            totalAssignments: assignments.length,
            averagePercentage: assignmentAveragePercentage,
          },
          calculatedInternal,
          overallPercentage,
          standing,
        };
      })
    );

    const validRoster = studentRoster.filter(Boolean) as any[];

    // Grade and Attendance Distribution analytics
    const gradeDistribution = {
      excellent: validRoster.filter((s) => s.standing === 'EXCELLENT').length,
      good: validRoster.filter((s) => s.standing === 'GOOD').length,
      average: validRoster.filter((s) => s.standing === 'AVERAGE').length,
      atRisk: validRoster.filter((s) => s.standing === 'AT_RISK').length,
    };

    const attendanceDistribution = {
      above85: validRoster.filter((s) => s.attendance.percentage >= 85).length,
      between75and84: validRoster.filter(
        (s) => s.attendance.percentage >= 75 && s.attendance.percentage < 85
      ).length,
      below75: validRoster.filter((s) => s.attendance.percentage < 75).length,
    };

    const classAverageInternal =
      validRoster.length > 0
        ? Math.round(
            (validRoster.reduce((sum, s) => sum + s.calculatedInternal, 0) / validRoster.length) * 10
          ) / 10
        : 0;

    const classPassRate =
      validRoster.length > 0
        ? Math.round((validRoster.filter((s) => s.standing !== 'AT_RISK').length / validRoster.length) * 100)
        : 100;

    return {
      subject: {
        _id: subject._id,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        department: subject.department,
        semester: subject.semester,
      },
      summary: {
        totalEnrolled: validRoster.length,
        totalQuizzes: quizzes.length,
        totalAssignments: assignments.length,
        totalAttendanceSessions: sessionCount,
        classAverageInternal,
        classPassRate,
      },
      analytics: {
        gradeDistribution,
        attendanceDistribution,
        atRiskStudentsCount: gradeDistribution.atRisk,
      },
      quizResults: quizAnalytics,
      assignmentResults: assignmentAnalytics,
      studentRoster: validRoster,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 7. STUDENT: RESULTS & OVERALL SEMESTER PROGRESS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Student views:
   * Subject-wise:
   * - quiz marks
   * - assignment marks
   * - attendance
   * - total
   * - percentage
   * Overall:
   * - semester performance
   * - subject performance
   * - completed assessments
   * - pending assessments
   * Progress analytics securely aggregated from real database.
   */
  static async getStudentResultsAndProgress(studentId: string) {
    const studentObjectId = new Types.ObjectId(studentId);

    // 1. Find student's active approved enrollment
    const activeEnrollment = await StudentEnrollment.findOne({
      student: studentObjectId,
      status: EnrollmentStatus.APPROVED,
    })
      .populate('department', 'name code shortName type')
      .populate('semester', 'semesterNumber academicYear')
      .populate({
        path: 'enrolledSubjects',
        select: 'subjectName subjectCode credits syllabusUnits',
      });

    if (!activeEnrollment) {
      return {
        hasActiveEnrollment: false,
        message: 'No active approved semester enrollment found.',
      };
    }

    const enrolledSubjects = (activeEnrollment.enrolledSubjects as any[]) || [];
    const subjectIds = enrolledSubjects.map((s) => s._id);

    // 2. Aggregate Subject-wise Results
    const subjectWisePerformance = await Promise.all(
      enrolledSubjects.map(async (subject) => {
        // Attendance
        const subjectSessions = await AttendanceSession.find({ subject: subject._id }).select('_id');
        const sessionIds = subjectSessions.map((s) => s._id);
        const attendanceRecords = await AttendanceRecord.find({
          student: studentObjectId,
          session: { $in: sessionIds },
        });

        const present = attendanceRecords.filter(
          (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.OD
        ).length;
        const absent = attendanceRecords.filter((r) => r.status === AttendanceStatus.ABSENT).length;
        const late = attendanceRecords.filter((r) => r.status === AttendanceStatus.LATE).length;
        const excused = attendanceRecords.filter((r) => r.status === AttendanceStatus.EXCUSED).length;
        const totalSessions = sessionIds.length;
        const attendancePercentage =
          totalSessions > 0 ? Math.round(((present + late * 0.5) / totalSessions) * 100) : 100;

        // Quiz marks for this subject
        const quizzes = await Quiz.find({ subject: subject._id });
        const quizMap = new Map<string, any>();
        quizzes.forEach((q) => quizMap.set(String(q._id), q));

        const quizResults = await QuizResult.find({
          student: studentObjectId,
          quiz: { $in: quizzes.map((q) => q._id) },
        }).sort({ generatedAt: -1 });

        const totalQuizEarned = quizResults.reduce((sum, r) => sum + r.score, 0);
        const totalQuizPossible = quizResults.reduce((sum, r) => sum + r.totalMarks, 0);
        const quizAveragePercentage =
          totalQuizPossible > 0 ? Math.round((totalQuizEarned / totalQuizPossible) * 100) : 0;

        const detailedQuizMarks = quizResults.map((r) => {
          const q = quizMap.get(String(r.quiz));
          return {
            quizId: r.quiz,
            title: q?.title || 'Course Quiz',
            score: r.score,
            totalMarks: r.totalMarks,
            percentage: r.percentage,
            passed: r.passed,
            grade: r.grade,
            date: r.generatedAt,
          };
        });

        // Assignment marks for this subject
        const assignments = await Assignment.find({ subject: subject._id });
        const assignmentMap = new Map<string, any>();
        assignments.forEach((a) => assignmentMap.set(String(a._id), a));

        const grades = await AssignmentGrade.find({
          student: studentObjectId,
          assignment: { $in: assignments.map((a) => a._id) },
        }).sort({ gradedAt: -1 });

        const totalAssignmentEarned = grades.reduce((sum, g) => sum + g.marksObtained, 0);
        const totalAssignmentPossible = grades.reduce((sum, g) => sum + g.maxMarks, 0);
        const assignmentAveragePercentage =
          totalAssignmentPossible > 0 ? Math.round((totalAssignmentEarned / totalAssignmentPossible) * 100) : 0;

        const detailedAssignmentMarks = grades.map((g) => {
          const a = assignmentMap.get(String(g.assignment));
          return {
            assignmentId: g.assignment,
            title: a?.title || 'Assignment',
            marksObtained: g.marksObtained,
            maxMarks: g.maxMarks,
            percentage: g.maxMarks > 0 ? Math.round((g.marksObtained / g.maxMarks) * 100) : 0,
            feedback: g.feedback,
            gradedAt: g.gradedAt,
          };
        });

        // Calculated Total & Subject Percentage (CIE Internal 40 Scale)
        const quizWeight = (quizAveragePercentage / 100) * 20;
        const assignmentWeight = (assignmentAveragePercentage / 100) * 15;
        const attendanceWeight = (attendancePercentage / 100) * 5;
        const totalInternalMarks = Math.round((quizWeight + assignmentWeight + attendanceWeight) * 10) / 10;
        const subjectPercentage = Math.round((totalInternalMarks / 40) * 100);

        let letterGrade = 'A';
        if (subjectPercentage >= 90) letterGrade = 'O';
        else if (subjectPercentage >= 80) letterGrade = 'A+';
        else if (subjectPercentage >= 70) letterGrade = 'A';
        else if (subjectPercentage >= 60) letterGrade = 'B+';
        else if (subjectPercentage >= 50) letterGrade = 'B';
        else letterGrade = 'RA';

        return {
          subjectId: subject._id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          credits: subject.credits,
          attendance: {
            totalSessions,
            present,
            absent,
            late,
            excused,
            percentage: attendancePercentage,
          },
          quizzes: {
            attempted: quizResults.length,
            totalAvailable: quizzes.length,
            averagePercentage: quizAveragePercentage,
            items: detailedQuizMarks,
          },
          assignments: {
            graded: grades.length,
            totalAvailable: assignments.length,
            averagePercentage: assignmentAveragePercentage,
            items: detailedAssignmentMarks,
          },
          totalInternalMarks,
          maxInternalMarks: 40,
          subjectPercentage,
          letterGrade,
          status: subjectPercentage >= 50 ? 'PASS' : 'NEEDS_ATTENTION',
        };
      })
    );

    // 3. Completed vs Pending Assessments
    // All available published quizzes across enrolled subjects
    const allQuizzes = await Quiz.find({
      subject: { $in: subjectIds },
      status: 'PUBLISHED',
    }).populate('subject', 'subjectName subjectCode');

    const completedQuizResults = await QuizResult.find({
      student: studentObjectId,
      quiz: { $in: allQuizzes.map((q) => q._id) },
    });
    const completedQuizIds = new Set(completedQuizResults.map((r) => String(r.quiz)));

    const completedQuizzesList = completedQuizResults.map((r: any) => ({
      type: 'QUIZ',
      id: r.quiz,
      score: r.score,
      maxMarks: r.totalMarks,
      percentage: r.percentage,
      date: r.generatedAt,
    }));

    const pendingQuizzesList = allQuizzes
      .filter((q) => !completedQuizIds.has(String(q._id)))
      .map((q: any) => ({
        type: 'QUIZ',
        id: q._id,
        title: q.title,
        subjectCode: q.subject?.subjectCode,
        subjectName: q.subject?.subjectName,
        totalMarks: q.totalMarks,
        durationMinutes: q.durationMinutes,
        deadline: q.endTime || null,
      }));

    // All available published assignments across enrolled subjects
    const allAssignments = await Assignment.find({
      subject: { $in: subjectIds },
      status: 'PUBLISHED',
    }).populate('subject', 'subjectName subjectCode');

    const studentSubmissions = await AssignmentSubmission.find({
      student: studentObjectId,
      assignment: { $in: allAssignments.map((a) => a._id) },
    });
    const submittedAssignmentIds = new Set(studentSubmissions.map((s) => String(s.assignment)));

    const completedAssignmentsList = studentSubmissions.map((s: any) => ({
      type: 'ASSIGNMENT',
      id: s.assignment,
      submittedAt: s.submittedAt,
      isGraded: s.isGraded,
      isLate: s.isLate,
      status: s.status,
    }));

    const pendingAssignmentsList = allAssignments
      .filter((a) => !submittedAssignmentIds.has(String(a._id)))
      .map((a: any) => ({
        type: 'ASSIGNMENT',
        id: a._id,
        title: a.title,
        subjectCode: a.subject?.subjectCode,
        subjectName: a.subject?.subjectName,
        totalMarks: a.maxMarks,
        deadline: a.dueDate,
        lateSubmissionPolicy: a.lateSubmissionPolicy,
      }));

    // 4. Overall Semester Performance (GPA, CGPA from SemesterResult or active average)
    const semesterResult = await SemesterResult.findOne({
      student: studentObjectId,
      semester: activeEnrollment.semester?._id,
    });

    const activeCreditsEarned = subjectWisePerformance
      .filter((s) => s.status === 'PASS')
      .reduce((sum, s) => sum + s.credits, 0);
    const activeCreditsRegistered = subjectWisePerformance.reduce((sum, s) => sum + s.credits, 0);

    const overallAveragePercentage =
      subjectWisePerformance.length > 0
        ? Math.round(
            subjectWisePerformance.reduce((sum, s) => sum + s.subjectPercentage, 0) /
              subjectWisePerformance.length
          )
        : 0;

    return {
      hasActiveEnrollment: true,
      semesterInfo: {
        semesterId: activeEnrollment.semester?._id,
        semesterNumber: (activeEnrollment.semester as any)?.semesterNumber || 1,
        academicYear: activeEnrollment.academicYear,
        department: activeEnrollment.department,
      },
      overallSemesterPerformance: {
        gpa: semesterResult?.gpa || Math.round((overallAveragePercentage / 10) * 10) / 10,
        cgpa: semesterResult?.cgpa || Math.round((overallAveragePercentage / 10) * 10) / 10,
        totalCreditsRegistered: activeCreditsRegistered,
        totalCreditsEarned: activeCreditsEarned,
        overallAveragePercentage,
        status: semesterResult?.status || (overallAveragePercentage >= 50 ? 'PASS' : 'NEEDS_ATTENTION'),
      },
      subjectWisePerformance,
      assessmentsSummary: {
        completedCount: completedQuizzesList.length + completedAssignmentsList.length,
        pendingCount: pendingQuizzesList.length + pendingAssignmentsList.length,
        completionRate:
          completedQuizzesList.length + completedAssignmentsList.length + pendingQuizzesList.length + pendingAssignmentsList.length > 0
            ? Math.round(
                ((completedQuizzesList.length + completedAssignmentsList.length) /
                  (completedQuizzesList.length +
                    completedAssignmentsList.length +
                    pendingQuizzesList.length +
                    pendingAssignmentsList.length)) *
                  100
              )
            : 100,
        completed: {
          quizzes: completedQuizzesList,
          assignments: completedAssignmentsList,
        },
        pending: {
          quizzes: pendingQuizzesList,
          assignments: pendingAssignmentsList,
        },
      },
    };
  }
}
