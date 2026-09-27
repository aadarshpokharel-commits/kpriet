import type { Request, Response } from 'express';
import { QuizService } from '../services/quiz.service.js';
import {
  createQuizSchema,
  updateQuizSchema,
  createQuestionSchema,
  createQuestionBankSchema,
  updateQuestionBankSchema,
  generateAIQuizSchema,
  saveDraftSchema,
  recordSecurityEventSchema,
  submitQuizAttemptSchema,
  gradeSubjectiveAnswerSchema,
} from '../validators/quiz.validators.js';

export class QuizController {
  // ─── Quiz Management ───

  static async createQuiz(req: Request, res: Response) {
    const validated = createQuizSchema.parse(req.body);
    const quiz = await QuizService.createQuiz(req.user!.id, validated);
    res.status(201).json({ success: true, data: quiz });
  }

  static async getSubjectQuizzes(req: Request, res: Response) {
    const quizzes = await QuizService.getSubjectQuizzes(
      req.params.subjectId as string,
      req.user!
    );
    res.json({ success: true, data: quizzes });
  }

  static async getQuizById(req: Request, res: Response) {
    const quiz = await QuizService.getQuizById(req.params.id as string, req.user!);
    res.json({ success: true, data: quiz });
  }

  static async updateQuiz(req: Request, res: Response) {
    const validated = updateQuizSchema.parse(req.body);
    const quiz = await QuizService.updateQuiz(
      req.user!.id,
      req.params.id as string,
      validated
    );
    res.json({ success: true, data: quiz });
  }

  static async deleteQuiz(req: Request, res: Response) {
    const result = await QuizService.deleteQuiz(
      req.user!.id,
      req.params.id as string
    );
    res.json({ success: true, data: result });
  }

  static async addQuestion(req: Request, res: Response) {
    const validated = createQuestionSchema.parse(req.body);
    const question = await QuizService.addQuestionToQuiz(
      req.user!.id,
      req.params.id as string,
      validated
    );
    res.status(201).json({ success: true, data: question });
  }

  static async importQuestionsFromBank(req: Request, res: Response) {
    const { questionBankIds } = req.body;
    const result = await QuizService.importQuestionsFromBank(
      req.user!.id,
      req.params.id as string,
      questionBankIds || []
    );
    res.json({ success: true, data: result });
  }

  // ─── Question Bank ───

  static async getQuestionBank(req: Request, res: Response) {
    const items = await QuizService.getQuestionBank(
      req.params.subjectId as string,
      req.query
    );
    res.json({ success: true, data: items });
  }

  static async createQuestionBankItem(req: Request, res: Response) {
    const validated = createQuestionBankSchema.parse(req.body);
    const item = await QuizService.createQuestionBankItem(
      req.user!.id,
      validated
    );
    res.status(201).json({ success: true, data: item });
  }

  static async updateQuestionBankItem(req: Request, res: Response) {
    const validated = updateQuestionBankSchema.parse(req.body);
    const item = await QuizService.updateQuestionBankItem(
      req.user!.id,
      req.params.id as string,
      validated
    );
    res.json({ success: true, data: item });
  }

  static async duplicateQuestionBankItem(req: Request, res: Response) {
    const item = await QuizService.duplicateQuestionBankItem(
      req.user!.id,
      req.params.id as string
    );
    res.status(201).json({ success: true, data: item });
  }

  static async deleteQuestionBankItem(req: Request, res: Response) {
    const result = await QuizService.deleteQuestionBankItem(
      req.user!.id,
      req.params.id as string
    );
    res.json({ success: true, data: result });
  }

  // ─── AI Quiz Generation ───

  static async generateAIQuiz(req: Request, res: Response) {
    const validated = generateAIQuizSchema.parse(req.body);
    const result = await QuizService.generateAIQuizQuestions(
      req.user!.id,
      validated
    );
    res.json({ success: true, data: result });
  }

  static async regenerateSingleQuestion(req: Request, res: Response) {
    const validated = generateAIQuizSchema.parse(req.body);
    const result = await QuizService.regenerateSingleAIQuestion(
      req.user!.id,
      validated
    );
    res.json({ success: true, data: result });
  }

  // ─── Student Assessment ───

  static async startQuizAttempt(req: Request, res: Response) {
    const session = await QuizService.startQuizAttempt(
      req.user!.id,
      req.params.id as string
    );
    res.json({ success: true, data: session });
  }

  static async retakeQuizAttempt(req: Request, res: Response) {
    const session = await QuizService.retakeQuizAttempt(
      req.user!.id,
      req.params.id as string
    );
    res.json({ success: true, data: session });
  }

  static async saveAttemptDraft(req: Request, res: Response) {
    const validated = saveDraftSchema.parse(req.body);
    const result = await QuizService.saveAttemptDraft(
      req.user!.id,
      req.params.attemptId as string,
      validated
    );
    res.json({ success: true, data: result });
  }

  static async recordSecurityViolation(req: Request, res: Response) {
    const validated = recordSecurityEventSchema.parse(req.body);
    const result = await QuizService.recordSecurityViolation(
      req.user!.id,
      req.params.attemptId as string,
      validated
    );
    res.json({ success: true, data: result });
  }

  static async submitQuizAttempt(req: Request, res: Response) {
    const validated = submitQuizAttemptSchema.parse(req.body);
    const result = await QuizService.submitQuizAttempt(
      req.user!.id,
      req.params.attemptId as string,
      validated
    );
    res.json({ success: true, data: result });
  }

  static async getQuizAttemptReview(req: Request, res: Response) {
    const review = await QuizService.getQuizAttemptReview(
      req.user!.id,
      req.params.attemptId as string
    );
    res.json({ success: true, data: review });
  }

  // ─── Teacher Analytics & Grading ───

  static async getQuizAnalytics(req: Request, res: Response) {
    const analytics = await QuizService.getQuizAnalytics(
      req.user!.id,
      req.params.id as string
    );
    res.json({ success: true, data: analytics });
  }

  static async gradeSubjectiveAnswer(req: Request, res: Response) {
    const validated = gradeSubjectiveAnswerSchema.parse(req.body);
    const result = await QuizService.gradeSubjectiveAnswer(
      req.user!.id,
      req.params.attemptId as string,
      validated
    );
    res.json({ success: true, data: result });
  }
}
