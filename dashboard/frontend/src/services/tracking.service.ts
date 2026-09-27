import { api } from '@/lib/api/client';
import type {
  IRecordAttendancePayload,
  IUpdateAttendanceSessionPayload,
  IEnrolledStudentsAttendanceResponse,
  IAttendanceHistoryResponse,
  IAttendanceSessionItem,
  IAttendanceRecordItem,
  IStudentAttendanceTracking,
  ITeacherSubjectResults,
  IStudentResultsAndProgress,
} from '../types/academic.types';

export class TrackingService {
  /**
   * Fetch enrolled students for attendance marking with duplicate check.
   */
  static async getEnrolledStudentsForAttendance(params: {
    subjectId: string;
    departmentId?: string;
    semesterId?: string;
    date?: string;
  }): Promise<IEnrolledStudentsAttendanceResponse> {
    const res = await api.get<any>('/tracking/attendance/enrolled-students', { params });
    return res.data.data;
  }

  /**
   * Record a new attendance session (with duplicate prevention).
   */
  static async recordAttendanceSession(data: IRecordAttendancePayload): Promise<any> {
    const res = await api.post<any>('/tracking/attendance/sessions', data);
    return res.data.data;
  }

  /**
   * Edit an existing attendance session and its student records.
   */
  static async updateAttendanceSession(
    sessionId: string,
    data: IUpdateAttendanceSessionPayload
  ): Promise<any> {
    const res = await api.put<any>(`/tracking/attendance/sessions/${sessionId}`, data);
    return res.data.data;
  }

  /**
   * Fetch attendance sessions history with optional filters.
   */
  static async getAttendanceHistory(params: {
    subjectId?: string;
    departmentId?: string;
    semesterId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<IAttendanceHistoryResponse> {
    const res = await api.get<any>('/tracking/attendance/sessions', { params });
    return res.data.data;
  }

  /**
   * Fetch a single attendance session details with student records.
   */
  static async getAttendanceSessionById(
    sessionId: string
  ): Promise<{ session: IAttendanceSessionItem; records: IAttendanceRecordItem[] }> {
    const res = await api.get<any>(`/tracking/attendance/sessions/${sessionId}`);
    return res.data.data;
  }

  /**
   * Student fetches their own attendance tracking.
   */
  static async getStudentAttendanceTracking(): Promise<IStudentAttendanceTracking> {
    const res = await api.get<any>('/tracking/student/attendance');
    return res.data.data;
  }

  /**
   * Teacher fetches subject results, quiz/assignment grades, roster, and analytics.
   */
  static async getTeacherSubjectResults(subjectId: string): Promise<ITeacherSubjectResults> {
    const res = await api.get<any>(`/tracking/teacher/subjects/${subjectId}/results`);
    return res.data.data;
  }

  /**
   * Student fetches subject-wise results, marks, attendance, and overall progress.
   */
  static async getStudentResultsAndProgress(): Promise<IStudentResultsAndProgress> {
    const res = await api.get<any>('/tracking/student/results');
    return res.data.data;
  }
}
