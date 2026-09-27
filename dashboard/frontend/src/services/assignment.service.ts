import { api } from '@/lib/api/client';
import type {
  IAssignmentItem,
  IAssignmentSubmissionItem,
  IAssignmentGradeItem,
  ICreateAssignmentPayload,
  IAIGenerateAssignmentPayload,
  ISubmitAssignmentPayload,
  IGradeSubmissionPayload,
} from '@/types/academic.types';

function unwrap<T>(res: any): T {
  if (res && res.data !== undefined) {
    if (res.data?.data !== undefined) {
      return res.data.data as T;
    }
    return res.data as T;
  }
  return res as T;
}

export const assignmentService = {
  /**
   * Teacher creates an assignment (manual or from generated draft)
   */
  async createAssignment(payload: ICreateAssignmentPayload): Promise<IAssignmentItem> {
    const res = await api.post('/assignments', payload);
    return unwrap<IAssignmentItem>(res);
  },

  /**
   * AI-powered assignment generation grounded in curriculum, syllabus, and notes
   */
  async aiGenerateAssignment(payload: IAIGenerateAssignmentPayload): Promise<any> {
    const res = await api.post('/assignments/ai-generate', payload);
    return unwrap<any>(res);
  },

  /**
   * Update an existing assignment
   */
  async updateAssignment(id: string, payload: Partial<ICreateAssignmentPayload>): Promise<IAssignmentItem> {
    const res = await api.put(`/assignments/${id}`, payload);
    return unwrap<IAssignmentItem>(res);
  },

  /**
   * Publish an assignment
   */
  async publishAssignment(id: string): Promise<IAssignmentItem> {
    const res = await api.patch(`/assignments/${id}/publish`);
    return unwrap<IAssignmentItem>(res);
  },

  /**
   * Unpublish an assignment (revert to DRAFT)
   */
  async unpublishAssignment(id: string): Promise<IAssignmentItem> {
    const res = await api.patch(`/assignments/${id}/unpublish`);
    return unwrap<IAssignmentItem>(res);
  },

  /**
   * Duplicate an assignment as a new draft
   */
  async duplicateAssignment(id: string): Promise<IAssignmentItem> {
    const res = await api.post(`/assignments/${id}/duplicate`);
    return unwrap<IAssignmentItem>(res);
  },

  /**
   * Close submissions for an assignment
   */
  async closeSubmissions(id: string): Promise<IAssignmentItem> {
    const res = await api.patch(`/assignments/${id}/close`);
    return unwrap<IAssignmentItem>(res);
  },

  /**
   * Delete an assignment
   */
  async deleteAssignment(id: string): Promise<void> {
    await api.delete(`/assignments/${id}`);
  },

  /**
   * Fetch all assignments created by the current teacher (optionally filtered by subject)
   */
  async getTeacherAssignments(subjectId?: string): Promise<IAssignmentItem[]> {
    const query = subjectId ? `?subjectId=${subjectId}` : '';
    const res = await api.get(`/assignments/teacher${query}`);
    return unwrap<IAssignmentItem[]>(res) || [];
  },

  /**
   * Fetch all student submissions for a specific assignment
   */
  async getAssignmentSubmissions(assignmentId: string): Promise<IAssignmentSubmissionItem[]> {
    const res = await api.get(`/assignments/${assignmentId}/submissions`);
    return unwrap<IAssignmentSubmissionItem[]>(res) || [];
  },

  /**
   * Trigger AI pre-evaluation on a specific student submission
   */
  async runAiEvaluation(submissionId: string): Promise<IAssignmentSubmissionItem> {
    const res = await api.post(`/assignments/submissions/${submissionId}/ai-evaluate`);
    return unwrap<IAssignmentSubmissionItem>(res);
  },

  /**
   * Submit official teacher-approved grade (Accept, Edit, or Reject AI suggestion or manual)
   */
  async gradeSubmission(payload: IGradeSubmissionPayload): Promise<IAssignmentGradeItem> {
    const res = await api.post('/assignments/grade', payload);
    return unwrap<IAssignmentGradeItem>(res);
  },

  /**
   * Fetch assignments for a student in a specific enrolled subject
   */
  async getStudentAssignments(subjectId: string): Promise<IAssignmentItem[]> {
    const res = await api.get(`/assignments/student/subject/${subjectId}`);
    return unwrap<IAssignmentItem[]>(res) || [];
  },

  /**
   * Student submits or replaces assignment response
   */
  async submitAssignment(assignmentId: string, payload: ISubmitAssignmentPayload): Promise<IAssignmentSubmissionItem> {
    const res = await api.post(`/assignments/${assignmentId}/submit`, payload);
    return unwrap<IAssignmentSubmissionItem>(res);
  },

  /**
   * Fetch single assignment details
   */
  async getAssignmentById(id: string): Promise<IAssignmentItem> {
    const res = await api.get(`/assignments/${id}`);
    return unwrap<IAssignmentItem>(res);
  },
};
