import { api } from '@/lib/api/client';
import type {
  IProgrammeCurriculum,
  IProgrammeMaster,
  IProgrammeRegistrationOptions,
  IProgrammeStats,
  IProgrammeWithStats,
} from '@/types/programme.types';

type ScopedFilters = {
  semesterId?: string;
  semesterNumber?: number;
  academicYear?: string;
  section?: string;
  approvalStatus?: string;
};

function qs(filters?: Record<string, string | number | undefined>): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== '') params.append(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

/** Client for the central programme master API (/programmes). */
export class ProgrammeService {
  /** Active programmes in official order (public — used by registration). */
  static async list(): Promise<IProgrammeMaster[]> {
    const res = await api.get<IProgrammeMaster[]>('/programmes');
    return res.data;
  }

  /** Admin: every programme (incl. inactive) with live statistics. */
  static async listForAdmin(): Promise<IProgrammeWithStats[]> {
    const res = await api.get<IProgrammeWithStats[]>('/programmes/manage');
    return res.data;
  }

  static async get(programmeId: string): Promise<IProgrammeMaster> {
    const res = await api.get<IProgrammeMaster>(`/programmes/${encodeURIComponent(programmeId)}`);
    return res.data;
  }

  static async registrationOptions(programmeId: string): Promise<IProgrammeRegistrationOptions> {
    const res = await api.get<IProgrammeRegistrationOptions>(
      `/programmes/${encodeURIComponent(programmeId)}/registration-options`
    );
    return res.data;
  }

  static async semesters(programmeId: string, filters?: ScopedFilters) {
    const res = await api.get<any[]>(`/programmes/${encodeURIComponent(programmeId)}/semesters${qs(filters)}`);
    return res.data;
  }

  static async subjects(programmeId: string, filters?: ScopedFilters) {
    const res = await api.get<any[]>(`/programmes/${encodeURIComponent(programmeId)}/subjects${qs(filters)}`);
    return res.data;
  }

  static async teachers(programmeId: string, filters?: ScopedFilters) {
    const res = await api.get<any[]>(`/programmes/${encodeURIComponent(programmeId)}/teachers${qs(filters)}`);
    return res.data;
  }

  static async students(programmeId: string, filters?: ScopedFilters) {
    const res = await api.get<any[]>(`/programmes/${encodeURIComponent(programmeId)}/students${qs(filters)}`);
    return res.data;
  }

  static async curriculum(programmeId: string, filters?: ScopedFilters): Promise<IProgrammeCurriculum> {
    const res = await api.get<IProgrammeCurriculum>(
      `/programmes/${encodeURIComponent(programmeId)}/curriculum${qs(filters)}`
    );
    return res.data;
  }

  static async stats(programmeId: string): Promise<{ programme: IProgrammeMaster; stats: IProgrammeStats }> {
    const res = await api.get<{ programme: IProgrammeMaster; stats: IProgrammeStats }>(
      `/programmes/${encodeURIComponent(programmeId)}/stats`
    );
    return res.data;
  }

  static async setActive(programmeId: string, isActive: boolean): Promise<IProgrammeMaster> {
    const res = await api.patch<IProgrammeMaster>(`/programmes/${encodeURIComponent(programmeId)}/status`, {
      isActive,
    });
    return res.data;
  }

  static async updateDetails(
    programmeId: string,
    data: { officialWebsite?: string | null; description?: string | null; icon?: string | null }
  ): Promise<IProgrammeMaster> {
    const res = await api.patch<IProgrammeMaster>(`/programmes/${encodeURIComponent(programmeId)}`, data);
    return res.data;
  }
}
