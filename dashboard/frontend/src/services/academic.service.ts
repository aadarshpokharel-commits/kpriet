import { api } from '@/lib/api/client';
import type {
  IChapter,
  ICurriculumTree,
  ICurriculumUnit,
  IProfessionalElective,
  IOpenElective,
  IDepartment,
  IDepartmentStats,
  IProgramme,
  ISemester,
  IStudentEnrollment,
  IStudentHistory,
  ISubject,
  ITeacherAssignment,
  IStudentDashboardOverview,
  ISubjectWorkspaceData,
  ISemesterArchiveItem,
  INextAvailableSemesterData,
  IAIDoubtResponse,
  IAIQueryLogEntry,
  ITeacherDashboardOverview,
  ITeacherAssignedSubjectsData,
  ITeacherSubjectWorkspaceData,
  IStudentProgressItem,
  ICreateContentPayload,
  ICreateAssignmentPayload,
  IGradeSubmissionPayload,
  IRecordAttendancePayload,
  ISmartBoardSessionPayload,
  ITeacherCurriculumResponse,
  IAIKnowledgeStats,
} from '@/types/academic.types';

export class AcademicService {
  // ─── DEPARTMENTS ───

  static async getDepartments(): Promise<IDepartment[]> {
    const res = await api.get<IDepartment[]>('/departments');
    return res.data;
  }

  static async getDepartment(id: string): Promise<IDepartment> {
    const res = await api.get<IDepartment>(`/departments/${id}`);
    return res.data;
  }

  static async getDepartmentStats(departmentId?: string): Promise<IDepartmentStats> {
    const path = departmentId ? `/departments/${departmentId}/stats` : '/departments/stats';
    const res = await api.get<IDepartmentStats>(path);
    return res.data;
  }

  static async getDepartmentFaculty(departmentId?: string): Promise<any[]> {
    const path = departmentId ? `/departments/${departmentId}/faculty` : '/departments/faculty';
    const res = await api.get<any[]>(path);
    return res.data;
  }

  static async getDepartmentStudents(departmentId?: string, semesterNumber?: number): Promise<any[]> {
    const base = departmentId ? `/departments/${departmentId}/students` : '/departments/students';
    const path = semesterNumber ? `${base}?semesterNumber=${semesterNumber}` : base;
    const res = await api.get<any[]>(path);
    return res.data;
  }

  // ─── PROGRAMMES ───

  static async getProgrammes(departmentId?: string): Promise<IProgramme[]> {
    const path = departmentId ? `/programmes?departmentId=${departmentId}` : '/programmes';
    const res = await api.get<IProgramme[]>(path);
    return res.data;
  }

  // ─── SEMESTERS ───

  static async getSemesters(filters?: { departmentId?: string; programmeId?: string }): Promise<ISemester[]> {
    const params = new URLSearchParams();
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.programmeId) params.append('programmeId', filters.programmeId);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<ISemester[]>(`/semesters${query}`);
    return res.data;
  }

  // ─── SUBJECTS & CHAPTERS ───

  static async getSubjects(filters?: {
    departmentId?: string;
    semesterId?: string;
    semesterNumber?: number;
  }): Promise<ISubject[]> {
    const params = new URLSearchParams();
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.semesterId) params.append('semesterId', filters.semesterId);
    if (filters?.semesterNumber) params.append('semesterNumber', String(filters.semesterNumber));

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<ISubject[]>(`/subjects${query}`);
    return res.data;
  }

  static async getSubject(id: string): Promise<ISubject> {
    const res = await api.get<ISubject>(`/subjects/${id}`);
    return res.data;
  }

  static async createSubject(data: {
    subjectName: string;
    subjectCode: string;
    departmentId: string;
    semesterId: string;
    semesterNumber: number;
    credits: number;
    description?: string;
    icon?: string;
    color?: string;
  }): Promise<ISubject> {
    const res = await api.post<ISubject>('/subjects', data);
    return res.data;
  }

  static async getChapters(subjectId: string): Promise<IChapter[]> {
    const res = await api.get<IChapter[]>(`/subjects/${subjectId}/chapters`);
    return res.data;
  }

  static async addChapter(subjectId: string, chapter: {
    unitNumber: number;
    title: string;
    description?: string;
    topics: string[];
    hours?: number;
  }): Promise<IChapter> {
    const res = await api.post<IChapter>(`/subjects/${subjectId}/chapters`, chapter);
    return res.data;
  }

  static async deleteChapter(subjectId: string, chapterId: string): Promise<void> {
    await api.delete(`/subjects/${subjectId}/chapters/${chapterId}`);
  }

  // ─── CURRICULUM TREE & ELECTIVES ───

  /**
   * Programme curriculum tree. Without a programmeId the server returns the
   * signed-in user's own programme (never a hardcoded default).
   */
  static async getCurriculumTree(programmeId?: string): Promise<ICurriculumTree> {
    const query = programmeId ? `?programmeId=${encodeURIComponent(programmeId)}` : '';
    const res = await api.get<ICurriculumTree>(`/curriculum/tree${query}`);
    return res.data;
  }

  static async getProfessionalElectives(vertical?: number): Promise<IProfessionalElective[]> {
    const query = vertical ? `?vertical=${vertical}` : '';
    const res = await api.get<IProfessionalElective[]>(`/curriculum/electives/professional${query}`);
    return res.data;
  }

  static async getOpenElectives(semester?: number): Promise<IOpenElective[]> {
    const query = semester ? `?semester=${semester}` : '';
    const res = await api.get<IOpenElective[]>(`/curriculum/electives/open${query}`);
    return res.data;
  }

  static async getCurriculumUnits(subjectId: string): Promise<ICurriculumUnit[]> {
    const res = await api.get<ICurriculumUnit[]>(`/subjects/${subjectId}/curriculum-units`);
    return res.data;
  }

  // ─── TEACHER ASSIGNMENTS ───

  static async getTeacherAssignments(filters?: {
    teacherId?: string;
    departmentId?: string;
    semesterId?: string;
    subjectId?: string;
  }): Promise<ITeacherAssignment[]> {
    const params = new URLSearchParams();
    if (filters?.teacherId) params.append('teacherId', filters.teacherId);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.semesterId) params.append('semesterId', filters.semesterId);
    if (filters?.subjectId) params.append('subjectId', filters.subjectId);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<ITeacherAssignment[]>(`/assignments/teachers${query}`);
    return res.data;
  }

  static async assignTeacher(data: {
    teacherId: string;
    subjectId: string;
    departmentId: string;
    semesterId: string;
    academicYear: string;
    section?: string;
    isCoordinator?: boolean;
  }): Promise<ITeacherAssignment> {
    const res = await api.post<ITeacherAssignment>('/assignments/teachers', data);
    return res.data;
  }

  static async removeTeacherAssignment(id: string): Promise<void> {
    await api.delete(`/assignments/teachers/${id}`);
  }

  // ─── STUDENT ENROLLMENT ───

  static async getEnrollments(filters?: {
    departmentId?: string;
    status?: string;
    studentId?: string;
  }): Promise<IStudentEnrollment[]> {
    const params = new URLSearchParams();
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.studentId) params.append('studentId', filters.studentId);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<IStudentEnrollment[]>(`/enrollments${query}`);
    return res.data;
  }

  static async reviewEnrollment(
    enrollmentId: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string
  ): Promise<IStudentEnrollment> {
    const res = await api.put<IStudentEnrollment>(`/enrollments/${enrollmentId}/review`, {
      status,
      rejectionReason,
    });
    return res.data;
  }

  // ─── FACULTY REVIEW & STUDENT HISTORY ───

  static async reviewFaculty(
    departmentId: string,
    teacherId: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string
  ): Promise<any> {
    const res = await api.put<any>(
      `/departments/${departmentId}/faculty/${teacherId}/review`,
      { status, rejectionReason }
    );
    return res.data;
  }

  static async getStudentHistory(
    departmentId: string,
    studentId: string
  ): Promise<IStudentHistory> {
    const res = await api.get<IStudentHistory>(
      `/departments/${departmentId}/students/${studentId}/history`
    );
    return res.data;
  }

  static async toggleSubjectStatus(
    subjectId: string,
    status: 'ACTIVE' | 'INACTIVE'
  ): Promise<ISubject> {
    const res = await api.patch<ISubject>(`/subjects/${subjectId}/status`, { status });
    return res.data;
  }

  // ─── STUDENT ACADEMIC EXPERIENCE (MODULE 06) ───

  static async getStudentDashboardOverview(): Promise<IStudentDashboardOverview> {
    const res = await api.get<IStudentDashboardOverview>('/students/dashboard-overview');
    return res.data;
  }

  static async getSemesterArchive(): Promise<ISemesterArchiveItem[]> {
    const res = await api.get<ISemesterArchiveItem[]>('/students/semesters/archive');
    return res.data;
  }

  static async getNextAvailableSemester(): Promise<INextAvailableSemesterData> {
    const res = await api.get<INextAvailableSemesterData>('/students/semesters/next-available');
    return res.data;
  }

  static async requestEnrollment(data: {
    departmentId: string;
    semesterId: string;
    academicYear: string;
    enrolledSubjectIds: string[];
  }): Promise<IStudentEnrollment> {
    const res = await api.post<IStudentEnrollment>('/enrollments/request', data);
    return res.data;
  }

  static async getSubjectWorkspace(subjectId: string): Promise<ISubjectWorkspaceData> {
    const res = await api.get<ISubjectWorkspaceData>(`/subjects/${subjectId}/workspace`);
    return res.data;
  }

  static async askSubjectAIDoubt(
    subjectId: string,
    query: string,
    studentContext?: { currentTopic?: string; unitNumber?: number; chapter?: string }
  ): Promise<IAIDoubtResponse> {
    const res = await api.post<IAIDoubtResponse>(`/subjects/${subjectId}/ai-doubt`, {
      query,
      question: query,
      chapter: studentContext?.chapter || (studentContext?.unitNumber ? `Unit ${studentContext.unitNumber}` : undefined),
      studentContext,
    });
    return res.data;
  }

  static async getSubjectAiLogs(subjectId: string, limit: number = 50): Promise<IAIQueryLogEntry[]> {
    const res = await api.get<IAIQueryLogEntry[]>(`/subjects/${subjectId}/ai-logs?limit=${limit}`);
    return res.data;
  }

  // ─── TEACHER DASHBOARD & WORKSPACE (MODULE 07) ───

  static async getTeacherDashboardOverview(): Promise<ITeacherDashboardOverview> {
    const res = await api.get<ITeacherDashboardOverview>('/teachers/dashboard-overview');
    return res.data;
  }

  static async getTeacherAssignedSubjects(): Promise<ITeacherAssignedSubjectsData> {
    const res = await api.get<ITeacherAssignedSubjectsData>('/teachers/assigned-subjects');
    return res.data;
  }

  static async getTeacherSubjectWorkspace(subjectId: string): Promise<ITeacherSubjectWorkspaceData> {
    const res = await api.get<ITeacherSubjectWorkspaceData>(`/teachers/subjects/${subjectId}/workspace`);
    return res.data;
  }

  static async getTeacherSubjectStudentsProgress(subjectId: string): Promise<IStudentProgressItem[]> {
    const res = await api.get<IStudentProgressItem[]>(`/teachers/subjects/${subjectId}/students-progress`);
    return res.data;
  }

  static async createSubjectContent(
    subjectId: string,
    data: ICreateContentPayload
  ): Promise<any> {
    const res = await api.post<any>(`/teachers/subjects/${subjectId}/content`, data);
    return res.data;
  }

  static async updateSubjectContent(
    subjectId: string,
    contentId: string,
    data: Partial<ICreateContentPayload>
  ): Promise<any> {
    const res = await api.put<any>(`/teachers/subjects/${subjectId}/content/${contentId}`, data);
    return res.data;
  }

  static async deleteSubjectContent(subjectId: string, contentId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>(
      `/teachers/subjects/${subjectId}/content/${contentId}`
    );
    return res.data;
  }

  static async createTeacherAssignment(
    subjectId: string,
    data: ICreateAssignmentPayload
  ): Promise<any> {
    const res = await api.post<any>(`/teachers/subjects/${subjectId}/assignments`, data);
    return res.data;
  }

  static async gradeStudentSubmission(data: IGradeSubmissionPayload): Promise<any> {
    const res = await api.post<any>('/teachers/assignments/grade', data);
    return res.data;
  }

  static async recordSubjectAttendance(
    subjectId: string,
    data: IRecordAttendancePayload
  ): Promise<any> {
    const res = await api.post<any>(`/teachers/subjects/${subjectId}/attendance`, data);
    return res.data;
  }

  // ─── TEACHER CURRICULUM MANAGEMENT (PROTECTED SYLLABUS + CUSTOM CHAPTERS) ───

  static async getTeacherSubjectCurriculum(subjectId: string): Promise<ITeacherCurriculumResponse> {
    const res = await api.get<ITeacherCurriculumResponse>(`/teachers/subjects/${subjectId}/curriculum`);
    return res.data;
  }

  static async saveTeacherSubjectCurriculum(
    subjectId: string,
    unitNumber: number,
    data: {
      chapterTitle?: string;
      teachingNotes?: string;
      learningObjectives?: string[];
      importantPoints?: string[];
      practicalExamples?: string[];
      referenceMaterials?: string[];
      topics?: any[];
    }
  ): Promise<any> {
    const res = await api.put<any>(`/teachers/subjects/${subjectId}/curriculum/units/${unitNumber}`, data);
    return res.data;
  }

  static async getTeacherKnowledgeBaseStats(subjectId: string): Promise<IAIKnowledgeStats> {
    const res = await api.get<IAIKnowledgeStats>(`/teachers/subjects/${subjectId}/ai-knowledge-stats`);
    return res.data;
  }

  // ─── SMART BOARD INTEGRATION ───

  static async createSmartBoardSession(data: {
    subjectId: string;
    initialResource?: any;
    /** Unit / topic the board should open on (validated against the subject syllabus server-side). */
    focus?: { unitNumber?: number; topic?: string };
  }): Promise<ISmartBoardSessionPayload> {
    const res = await api.post<ISmartBoardSessionPayload>('/academic/smartboard/session', data);
    return res.data;
  }

  static async getSmartBoardContext(subjectId: string): Promise<any> {
    const res = await api.get<any>(`/academic/subjects/${subjectId}/smartboard-context`);
    return res.data;
  }

  static async shareSmartBoardNotes(data: {
    subjectId: string;
    title: string;
    description?: string;
    chapterOrUnit?: number;
    materialType?: string;
    pdfBase64?: string;
    fileUrl?: string;
    fileName?: string;
    shareTarget?: string;
    targetSection?: string;
    selectedStudentIds?: string[];
    status?: string;
  }): Promise<any> {
    const res = await api.post<any>('/academic/smartboard/share-notes', data);
    return res.data;
  }

  // ─── SIMULATION MANAGEMENT SYSTEM ───

  static async getAvailableSimulations(subjectId: string): Promise<any> {
    const res = await api.get<any>(`/academic/subjects/${subjectId}/available-simulations`);
    return res.data;
  }

  static async getSubjectSimulations(subjectId: string): Promise<any> {
    const res = await api.get<any>(`/academic/subjects/${subjectId}/simulations`);
    return res.data;
  }

  static async assignSimulation(
    subjectId: string,
    payload: {
      simulationId: string;
      chapterOrUnit: number;
      title: string;
      description?: string;
      customParams?: Record<string, any>;
      status?: 'PUBLISHED' | 'DRAFT';
    }
  ): Promise<any> {
    const res = await api.post<any>(`/academic/subjects/${subjectId}/simulations`, payload);
    return res.data;
  }

  static async toggleSimulationStatus(
    subjectId: string,
    simulationId: string,
    status: 'PUBLISHED' | 'DRAFT'
  ): Promise<any> {
    const res = await api.patch<any>(`/academic/subjects/${subjectId}/simulations/${simulationId}/status`, { status });
    return res.data;
  }

  /** Student: submit a Challenge-mode attempt (verified and stored by the backend). */
  static async submitSimulationChallenge(subjectId: string, simulationId: string, payload: Record<string, unknown>): Promise<any> {
    const res = await api.post<any>(`/academic/subjects/${subjectId}/simulations/${simulationId}/challenge-attempts`, payload);
    return res.data;
  }

  /** Teacher: every student's attempts for a published simulation (student: own attempts). */
  static async getSimulationChallengeAttempts(subjectId: string, simulationId: string): Promise<any> {
    const res = await api.get<any>(`/academic/subjects/${subjectId}/simulations/${simulationId}/challenge-attempts`);
    return res.data;
  }

  static async deleteSimulation(
    subjectId: string,
    simulationId: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>(
      `/academic/subjects/${subjectId}/simulations/${simulationId}`
    );
    return res.data;
  }
}

