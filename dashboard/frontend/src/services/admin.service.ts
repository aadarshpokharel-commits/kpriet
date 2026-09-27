import { api } from '@/lib/api/client';
import type {
  IInstitutionOverview,
  IFacultyDirectoryResponse,
  IStudentDirectoryResponse,
  IAcademicActivityData,
  IAuditLogsResponse,
} from '@/types/academic.types';

export class AdminService {
  /**
   * Fetch institution-level master overview & live KPI metrics.
   */
  static async getInstitutionOverview(): Promise<IInstitutionOverview> {
    const res = await api.get<any>('/admin/overview');
    return res.data?.data || res.data;
  }

  /**
   * Fetch department breakdown across the institution.
   */
  static async getDepartmentOverview(departmentId?: string): Promise<any> {
    const endpoint = departmentId ? `/admin/departments?departmentId=${departmentId}` : '/admin/departments';
    const res = await api.get<any>(endpoint);
    return res.data?.data || res.data;
  }

  /**
   * Fetch institution-wide faculty directory with filters.
   */
  static async getFacultyDirectory(filters?: {
    departmentId?: string;
    approvalStatus?: string;
    accountStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<IFacultyDirectoryResponse> {
    const query = new URLSearchParams();
    if (filters?.departmentId) query.append('departmentId', filters.departmentId);
    if (filters?.approvalStatus) query.append('approvalStatus', filters.approvalStatus);
    if (filters?.accountStatus) query.append('accountStatus', filters.accountStatus);
    if (filters?.search) query.append('search', filters.search);
    if (filters?.page) query.append('page', String(filters.page));
    if (filters?.limit) query.append('limit', String(filters.limit));

    const qs = query.toString();
    const endpoint = qs ? `/admin/faculty?${qs}` : '/admin/faculty';
    const res = await api.get<any>(endpoint);
    return res.data?.data || res.data;
  }

  /**
   * Fetch institution-wide student directory with filters.
   */
  static async getStudentDirectory(filters?: {
    departmentId?: string;
    semesterNumber?: number;
    accountStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<IStudentDirectoryResponse> {
    const query = new URLSearchParams();
    if (filters?.departmentId) query.append('departmentId', filters.departmentId);
    if (filters?.semesterNumber) query.append('semesterNumber', String(filters.semesterNumber));
    if (filters?.accountStatus) query.append('accountStatus', filters.accountStatus);
    if (filters?.search) query.append('search', filters.search);
    if (filters?.page) query.append('page', String(filters.page));
    if (filters?.limit) query.append('limit', String(filters.limit));

    const qs = query.toString();
    const endpoint = qs ? `/admin/students?${qs}` : '/admin/students';
    const res = await api.get<any>(endpoint);
    return res.data?.data || res.data;
  }

  /**
   * Fetch academic pulse metrics and comparative scorecard.
   */
  static async getAcademicActivity(): Promise<IAcademicActivityData> {
    const res = await api.get<any>('/admin/activity');
    return res.data?.data || res.data;
  }

  /**
   * Fetch paginated audit log entries with filters.
   */
  static async getAuditLogs(filters?: {
    action?: string;
    entityType?: string;
    departmentId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<IAuditLogsResponse> {
    const query = new URLSearchParams();
    if (filters?.action) query.append('action', filters.action);
    if (filters?.entityType) query.append('entityType', filters.entityType);
    if (filters?.departmentId) query.append('departmentId', filters.departmentId);
    if (filters?.search) query.append('search', filters.search);
    if (filters?.startDate) query.append('startDate', filters.startDate);
    if (filters?.endDate) query.append('endDate', filters.endDate);
    if (filters?.page) query.append('page', String(filters.page));
    if (filters?.limit) query.append('limit', String(filters.limit));

    const qs = query.toString();
    const endpoint = qs ? `/admin/audit-logs?${qs}` : '/admin/audit-logs';
    const res = await api.get<any>(endpoint);
    return res.data?.data || res.data;
  }

  // ─── PRIVILEGED ACTIONS ───

  static async createDepartment(data: {
    name: string;
    code: string;
    programmeType?: string;
    description?: string;
    hodId?: string;
    status?: string;
  }): Promise<any> {
    const res = await api.post<any>('/admin/departments', data);
    return res.data?.data || res.data;
  }

  static async updateDepartment(
    id: string,
    data: {
      name?: string;
      code?: string;
      programmeType?: string;
      description?: string;
      status?: string;
    }
  ): Promise<any> {
    const res = await api.put<any>(`/admin/departments/${id}`, data);
    return res.data?.data || res.data;
  }

  static async assignDepartmentHod(id: string, hodUserId: string): Promise<any> {
    const res = await api.put<any>(`/admin/departments/${id}/hod`, { hodUserId });
    return res.data?.data || res.data;
  }

  static async toggleDepartmentStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<any> {
    const res = await api.patch<any>(`/admin/departments/${id}/status`, { status });
    return res.data?.data || res.data;
  }

  static async updateUserStatus(
    userId: string,
    accountStatus: string,
    reason?: string
  ): Promise<any> {
    const res = await api.patch<any>(`/admin/users/${userId}/status`, {
      accountStatus,
      reason,
    });
    return res.data?.data || res.data;
  }
}
