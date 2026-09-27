import { api } from '@/lib/api/client';
import type {
  IQuizItem,
  IQuizDetails,
  IQuestionItem,
  IQuestionBankItem,
  IQuizAttemptSession,
  IQuizAnalyticsData,
  ICreateQuizPayload,
  ICreateQuestionPayload,
  ICreateQuestionBankPayload,
} from '@/types/academic.types';

/**
 * Robust response unwrapper that handles both raw payloads (res.data)
 * and double-wrapped envelopes ((res.data as any)?.data).
 */
function unwrap<T>(res: { data: T }): T {
  if (res && res.data !== undefined) {
    if ((res.data as any)?.data !== undefined) {
      return (res.data as any).data as T;
    }
    return res.data;
  }
  return res as unknown as T;
}

export class QuizService {
  // ─── Quiz Management ───

  static async createQuiz(payload: ICreateQuizPayload): Promise<IQuizItem> {
    const res = await api.post<IQuizItem>('/quizzes', payload);
    return unwrap(res);
  }

  static async getSubjectQuizzes(subjectId: string): Promise<IQuizItem[]> {
    const res = await api.get<IQuizItem[]>(`/quizzes/subjects/${subjectId}`);
    return unwrap(res);
  }

  static async getQuizById(quizId: string): Promise<IQuizDetails> {
    const res = await api.get<IQuizDetails>(`/quizzes/${quizId}`);
    return unwrap(res);
  }

  static async updateQuiz(
    quizId: string,
    payload: Partial<ICreateQuizPayload>
  ): Promise<IQuizItem> {
    const res = await api.put<IQuizItem>(`/quizzes/${quizId}`, payload);
    return unwrap(res);
  }

  static async deleteQuiz(quizId: string): Promise<{ message: string }> {
    const res = await api.delete<{ message: string }>(`/quizzes/${quizId}`);
    return unwrap(res);
  }

  static async addQuestion(
    quizId: string,
    payload: ICreateQuestionPayload
  ): Promise<IQuestionItem> {
    const res = await api.post<IQuestionItem>(
      `/quizzes/${quizId}/questions`,
      payload
    );
    return unwrap(res);
  }

  static async importQuestionsFromBank(
    quizId: string,
    questionBankIds: string[]
  ): Promise<{ importedCount: number; questions: IQuestionItem[] }> {
    const res = await api.post<{ importedCount: number; questions: IQuestionItem[] }>(
      `/quizzes/${quizId}/import-bank`,
      { questionBankIds }
    );
    return unwrap(res);
  }

  // ─── Question Bank ───

  static async getQuestionBank(
    subjectId: string,
    filters: Record<string, any> = {}
  ): Promise<IQuestionBankItem[]> {
    const res = await api.get<IQuestionBankItem[]>(
      `/quizzes/subjects/${subjectId}/question-bank`,
      { params: filters }
    );
    return unwrap(res);
  }

  static async createQuestionBankItem(
    payload: ICreateQuestionBankPayload
  ): Promise<IQuestionBankItem> {
    const res = await api.post<IQuestionBankItem>(
      `/quizzes/subjects/${payload.subjectId}/question-bank`,
      payload
    );
    return unwrap(res);
  }

  static async updateQuestionBankItem(
    itemId: string,
    payload: Partial<ICreateQuestionBankPayload>
  ): Promise<IQuestionBankItem> {
    const res = await api.put<IQuestionBankItem>(
      `/quizzes/question-bank/${itemId}`,
      payload
    );
    return unwrap(res);
  }

  static async duplicateQuestionBankItem(
    itemId: string
  ): Promise<IQuestionBankItem> {
    const res = await api.post<IQuestionBankItem>(
      `/quizzes/question-bank/${itemId}/duplicate`
    );
    return unwrap(res);
  }

  static async deleteQuestionBankItem(
    itemId: string
  ): Promise<{ message: string }> {
    const res = await api.delete<{ message: string }>(
      `/quizzes/question-bank/${itemId}`
    );
    return unwrap(res);
  }

  // ─── AI Quiz Generation ───

  static async generateAIQuiz(payload: {
    subjectId: string;
    semesterId?: string;
    semesterNumber?: number;
    curriculumUnits: number[];
    difficulty: string;
    questionCount: number;
    questionTypes: string[];
    bloomsTaxonomy?: string[];
    sourceNotes?: Array<{ name: string; url?: string; content?: string }>;
    syllabusContext?: string;
    excludeQuestions?: string[];
  }): Promise<{
    subject: any;
    curriculumUnits: number[];
    difficulty: string;
    groundingSources?: Array<{ type: string; title: string; count?: number }>;
    generatedCount: number;
    questions: any[];
  }> {
    const res = await api.post<{
      subject: any;
      curriculumUnits: number[];
      difficulty: string;
      groundingSources?: Array<{ type: string; title: string; count?: number }>;
      generatedCount: number;
      questions: any[];
    }>('/quizzes/generate-ai', payload);
    return unwrap(res);
  }

  static async regenerateSingleQuestion(payload: {
    subjectId: string;
    curriculumUnits: number[];
    difficulty?: string;
    questionTypes?: string[];
    bloomsTaxonomy?: string[];
    sourceNotes?: Array<{ name: string; url?: string; content?: string }>;
    syllabusContext?: string;
    excludeQuestions?: string[];
    singleQuestion?: {
      unit?: number;
      type?: string;
      bloom?: string;
      difficulty?: string;
    };
  }): Promise<any> {
    const res = await api.post<any>('/quizzes/generate-ai-single', payload);
    return unwrap(res);
  }

  // ─── Student Assessment Engine ───

  static async startQuizAttempt(quizId: string): Promise<IQuizAttemptSession> {
    const res = await api.post<IQuizAttemptSession>(`/quizzes/${quizId}/start`);
    return unwrap(res);
  }

  static async retakeQuizAttempt(quizId: string): Promise<IQuizAttemptSession> {
    const res = await api.post<IQuizAttemptSession>(`/quizzes/${quizId}/retake`);
    return unwrap(res);
  }

  static async saveAttemptDraft(
    attemptId: string,
    answersDraft: Record<string, any>,
    timeSpentSeconds: number
  ): Promise<{ success: boolean; savedAt: string }> {
    const res = await api.post<{ success: boolean; savedAt: string }>(
      `/quizzes/attempts/${attemptId}/autosave`,
      { answersDraft, timeSpentSeconds }
    );
    return unwrap(res);
  }

  static async recordSecurityViolation(
    attemptId: string,
    eventType: string,
    details?: string
  ): Promise<{
    success: boolean;
    fullscreenViolationsCount: number;
    tabSwitchCount: number;
    totalViolations: number;
    maxWarnings: number;
    autoSubmitted: boolean;
  }> {
    const res = await api.post<{
      success: boolean;
      fullscreenViolationsCount: number;
      tabSwitchCount: number;
      totalViolations: number;
      maxWarnings: number;
      autoSubmitted: boolean;
    }>(`/quizzes/attempts/${attemptId}/security-event`, {
      eventType,
      details,
    });
    return unwrap(res);
  }

  static async submitQuizAttempt(
    attemptId: string,
    answers: Record<string, any>,
    timeSpentSeconds: number
  ): Promise<{
    attemptId: string;
    status: string;
    totalScore: number | null;
    totalMarks: number;
    percentage: number | null;
    passed: boolean | null;
    isFullyGraded: boolean;
    showAnswersAfterSubmission: boolean;
    showResultImmediately: boolean;
    timeSpentSeconds: number;
  }> {
    const res = await api.post<{
      attemptId: string;
      status: string;
      totalScore: number | null;
      totalMarks: number;
      percentage: number | null;
      passed: boolean | null;
      isFullyGraded: boolean;
      showAnswersAfterSubmission: boolean;
      showResultImmediately: boolean;
      timeSpentSeconds: number;
    }>(`/quizzes/attempts/${attemptId}/submit`, {
      answers,
      timeSpentSeconds,
    });
    return unwrap(res);
  }

  static async getQuizAttemptReview(attemptId: string): Promise<{
    attempt: any;
    quiz: any;
    questions: IQuestionItem[];
  }> {
    const res = await api.get<{
      attempt: any;
      quiz: any;
      questions: IQuestionItem[];
    }>(`/quizzes/attempts/${attemptId}/review`);
    return unwrap(res);
  }

  // ─── Teacher Analytics & Grading ───

  static async getQuizAnalytics(quizId: string): Promise<IQuizAnalyticsData> {
    const res = await api.get<IQuizAnalyticsData>(
      `/quizzes/${quizId}/analytics`
    );
    return unwrap(res);
  }

  static async gradeSubjectiveAnswer(
    attemptId: string,
    questionId: string,
    marksAwarded: number,
    teacherFeedback?: string
  ): Promise<{
    attemptId: string;
    totalScore: number;
    isGraded: boolean;
    answer: any;
  }> {
    const res = await api.post<{
      attemptId: string;
      totalScore: number;
      isGraded: boolean;
      answer: any;
    }>(`/quizzes/attempts/${attemptId}/grade-subjective`, {
      questionId,
      marksAwarded,
      teacherFeedback,
    });
    return unwrap(res);
  }
}
