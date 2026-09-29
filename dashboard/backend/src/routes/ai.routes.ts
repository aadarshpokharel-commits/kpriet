import { Router, type Request, type Response } from 'express';
import { authenticate, requireRole, requireSubjectAccess } from '../middleware/auth.middleware.js';
import { UserRole } from '../types/academic.types.js';
import { AiRagService } from '../services/ai-rag.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const aiRouter = Router();

aiRouter.use(authenticate);

/**
 * POST /api/v1/ai/query
 * Executes a subject-isolated RAG query.
 */
aiRouter.post(
  '/query',
  requireSubjectAccess((req: Request) => req.body?.subjectId),
  async (req: Request, res: Response) => {
    const userId = String(req.user!._id);
    const role = req.user!.role;
    const department = req.user!.department ?? undefined;
    const { subjectId, question, query, chapter, topic, boardContext, simulationContext } = req.body;
    const questionText = typeof question === 'string' ? question : typeof query === 'string' ? query : '';
    const simCtx = simulationContext || (boardContext && typeof boardContext === 'object' ? (boardContext as any).simulationContext : undefined);

    const result = await AiRagService.queryKnowledge(userId, role, department, {
      subjectId,
      question: questionText.slice(0, 2000),
      chapter,
      topic: typeof topic === 'string' ? topic.slice(0, 200) : undefined,
      ...(simCtx && typeof simCtx === 'object' ? { simulationContext: simCtx } : {}),
      ...(boardContext && typeof boardContext === 'object' ? {
        boardContext: {
          departmentId: typeof boardContext.departmentId === 'string' ? boardContext.departmentId.slice(0, 100) : undefined,
          semesterId: typeof boardContext.semesterId === 'string' ? boardContext.semesterId.slice(0, 100) : undefined,
          teacherId: typeof boardContext.teacherId === 'string' ? boardContext.teacherId.slice(0, 100) : undefined,
          sectionId: typeof boardContext.sectionId === 'string' ? boardContext.sectionId.slice(0, 40) : undefined,
          currentTopic: typeof boardContext.currentTopic === 'string' ? boardContext.currentTopic.slice(0, 200) : undefined,
          currentLesson: typeof boardContext.currentLesson === 'string' ? boardContext.currentLesson.slice(0, 200) : undefined,
          currentBoardPage: Number.isFinite(Number(boardContext.currentBoardPage)) ? Number(boardContext.currentBoardPage) : undefined,
          selectedObjectType: typeof boardContext.selectedObjectType === 'string' ? boardContext.selectedObjectType.slice(0, 80) : undefined,
          selectedObjectContent: typeof boardContext.selectedObjectContent === 'string' ? boardContext.selectedObjectContent.slice(0, 8000) : undefined,
          selectedObjectImage: typeof boardContext.selectedObjectImage === 'string' ? boardContext.selectedObjectImage : undefined,
          ...(simCtx && typeof simCtx === 'object' ? { simulationContext: simCtx } : {}),
        },
      } : {}),
    });

    ApiResponse.ok(res, 'AI query processed successfully.', result);
  }
);

/**
 * GET /api/v1/ai/logs/:subjectId
 * Retrieves AI query audit logs for a subject.
 */
aiRouter.get(
  '/logs/:subjectId',
  requireSubjectAccess('subjectId'),
  async (req: Request, res: Response) => {
    const userId = String(req.user!._id);
    const role = req.user!.role;
    const department = req.user!.department ?? undefined;
    const subjectId = String(req.params.subjectId);
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const logs = await AiRagService.getSubjectQueryLogs(
      userId,
      role,
      department,
      subjectId,
      limit
    );

    ApiResponse.ok(res, 'AI query logs retrieved successfully.', logs);
  }
);

/**
 * POST /api/v1/ai/ingest
 * Ingests and indexes an authorized course document into the RAG vector store.
 */
aiRouter.post(
  '/ingest',
  requireRole(UserRole.TEACHER, UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL),
  requireSubjectAccess((req: Request) => req.body?.subjectId),
  async (req: Request, res: Response) => {
    const {
      title,
      documentType = 'NOTES',
      departmentId,
      semesterId,
      subjectId,
      chapter,
      sourceType = 'NOTES',
      contentText,
      sourceUrl,
      metadata,
    } = req.body;

    const doc = await AiRagService.ingestDocument({
      title,
      documentType,
      departmentId,
      semesterId,
      subjectId,
      chapter,
      sourceType,
      contentText,
      sourceUrl,
      metadata,
    });

    ApiResponse.created(res, 'Course document ingested and indexed into RAG store.', doc);
  }
);
