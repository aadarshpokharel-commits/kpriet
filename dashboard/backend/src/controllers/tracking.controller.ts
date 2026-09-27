import type { Request, Response } from 'express';
import { TrackingService } from '../services/tracking.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import {
  recordAttendanceSessionSchema,
  updateAttendanceSessionSchema,
  getEnrolledStudentsQuerySchema,
  attendanceHistoryQuerySchema,
} from '../validators/tracking.validators.js';

export class TrackingController {
  // ─── ATTENDANCE: TEACHER ACTIONS ───

  static async getEnrolledStudentsForAttendance(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const validated = getEnrolledStudentsQuerySchema.parse(req.query);

    const result = await TrackingService.getEnrolledStudentsForAttendance(userId, {
      subjectId: validated.subjectId,
      departmentId: validated.departmentId,
      semesterId: validated.semesterId,
      date: validated.date,
    });

    ApiResponse.ok(res, 'Enrolled students retrieved successfully', result);
  }

  static async recordAttendanceSession(req: Request, res: Response) {
    const teacherId = (req as any).user.id;
    const validated = recordAttendanceSessionSchema.parse(req.body);

    const result = await TrackingService.recordAttendanceSession(teacherId, validated);
    ApiResponse.created(res, 'Attendance session recorded successfully', result);
  }

  static async updateAttendanceSession(req: Request, res: Response) {
    const teacherId = (req as any).user.id;
    const sessionId = String(req.params.sessionId);
    const validated = updateAttendanceSessionSchema.parse(req.body);

    const result = await TrackingService.updateAttendanceSession(teacherId, sessionId, validated);
    ApiResponse.ok(res, 'Attendance session updated successfully', result);
  }

  static async getAttendanceHistory(req: Request, res: Response) {
    const validated = attendanceHistoryQuerySchema.parse(req.query);
    const result = await TrackingService.getAttendanceHistory(validated);
    ApiResponse.ok(res, 'Attendance history retrieved successfully', result);
  }

  static async getAttendanceSessionById(req: Request, res: Response) {
    const sessionId = String(req.params.sessionId);
    const result = await TrackingService.getAttendanceSessionById(sessionId);
    ApiResponse.ok(res, 'Attendance session retrieved successfully', result);
  }

  // ─── ATTENDANCE: STUDENT VIEW ───

  static async getStudentAttendance(req: Request, res: Response) {
    // SECURITY: strictly enforce authenticated student's own ID from token
    const studentId = (req as any).user.id;
    const result = await TrackingService.getStudentAttendanceTracking(studentId);
    ApiResponse.ok(res, 'Student attendance tracking retrieved successfully', result);
  }

  // ─── RESULTS: TEACHER VIEW ───

  static async getTeacherSubjectResults(req: Request, res: Response) {
    const teacherId = (req as any).user.id;
    const subjectId = String(req.params.subjectId);

    const result = await TrackingService.getTeacherSubjectResultsAndAnalytics(teacherId, subjectId);
    ApiResponse.ok(res, 'Subject results and analytics retrieved successfully', result);
  }

  // ─── RESULTS: STUDENT VIEW ───

  static async getStudentResultsAndProgress(req: Request, res: Response) {
    // SECURITY: strictly enforce authenticated student's own ID from token
    const studentId = (req as any).user.id;
    const result = await TrackingService.getStudentResultsAndProgress(studentId);
    ApiResponse.ok(res, 'Student results and academic progress retrieved successfully', result);
  }
}
