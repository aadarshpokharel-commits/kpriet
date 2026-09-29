import { api, httpClient } from '@/lib/api/client';
import type {
  AuthSuccessData,
  IAuthUser,
  LoginInput,
  StudentRegisterInput,
  TeacherRegisterInput,
} from '@/types/auth.types';

export class AuthService {
  /**
   * Sets or clears the in-memory Authorization header.
   */
  static setAuthHeader(token?: string | null) {
    if (token) {
      httpClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        localStorage.setItem('eduverse_token', token);
      } catch (_) {}
    } else {
      delete httpClient.defaults.headers.common['Authorization'];
      try {
        localStorage.removeItem('eduverse_token');
      } catch (_) {}
    }
  }

  /**
   * Signs in user with official KPRIET college email and password.
   */
  static async login(input: LoginInput): Promise<AuthSuccessData> {
    const result = await api.post<AuthSuccessData>('/auth/login', input);
    if (result.data.accessToken) {
      AuthService.setAuthHeader(result.data.accessToken);
    }
    return result.data;
  }

  /**
   * Registers a new student.
   */
  static async registerStudent(input: StudentRegisterInput): Promise<AuthSuccessData> {
    const result = await api.post<AuthSuccessData>('/auth/register/student', input);
    if (result.data.accessToken) {
      AuthService.setAuthHeader(result.data.accessToken);
    }
    return result.data;
  }

  /**
   * Registers a new faculty/teacher (requires HOD approval).
   */
  static async registerTeacher(
    input: TeacherRegisterInput
  ): Promise<{ user: IAuthUser; approvalStatus: string }> {
    const result = await api.post<{ user: IAuthUser; approvalStatus: string }>(
      '/auth/register/teacher',
      input
    );
    return result.data;
  }

  /**
   * Refreshes the active session using the httpOnly refresh cookie.
   */
  static async refresh(): Promise<AuthSuccessData> {
    const result = await api.post<AuthSuccessData>('/auth/refresh');
    if (result.data.accessToken) {
      AuthService.setAuthHeader(result.data.accessToken);
    }
    return result.data;
  }

  /**
   * Retrieves the authenticated user context.
   */
  static async getMe(): Promise<{ user: IAuthUser; [key: string]: unknown }> {
    const result = await api.get<{ user: IAuthUser; [key: string]: unknown }>('/auth/me');
    return result.data;
  }

  /**
   * Revokes session on backend and clears auth header.
   */
  static async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      AuthService.setAuthHeader(null);
      try {
        localStorage.removeItem('eduverse_token');
        localStorage.removeItem('eduverse_smartboard_active_session');
        sessionStorage.removeItem('eduverse_rbac_session');
      } catch (_) {}
    }
  }

  /**
   * Retrieves active programmes from the central programme master.
   * @deprecated Use `useProgrammes()` (hooks/useProgrammes) — kept for backward compatibility.
   */
  static async getDepartments(): Promise<Array<{ _id: string; name: string; code: string }>> {
    const result = await api.get<Array<{ _id: string; name: string; code: string }>>('/programmes');
    return result.data;
  }

  /**
   * Retrieves real-time aggregated institution statistics.
   */
  static async getPublicStats(): Promise<{
    activeCourses: number;
    academicYears: number;
    facultyExperts: number;
    enrolledStudents: number;
  }> {
    const result = await api.get<{
      activeCourses: number;
      academicYears: number;
      facultyExperts: number;
      enrolledStudents: number;
    }>('/auth/public-stats');
    return result.data;
  }
}
