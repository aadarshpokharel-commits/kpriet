import { type Request, type Response } from 'express';
import { ApiResponse } from '../utils/apiResponse.js';
import { AssignmentService } from '../services/assignment.service.js';
import { AiAssignmentService } from '../services/ai-assignment.service.js';
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  aiGenerateAssignmentSchema,
  submitAssignmentSchema,
  gradeAssignmentSchema,
} from '../validators/assignment.validators.js';

export class AssignmentController {
  static async createAssignment(req: Request, res: Response) {
    const validated = createAssignmentSchema.parse(req.body);
    const assignment = await AssignmentService.createAssignment((req as any).user._id, validated);
    ApiResponse.created(res, 'Assignment created successfully.', assignment);
  }

  static async aiGenerateAssignment(req: Request, res: Response) {
    const validated = aiGenerateAssignmentSchema.parse(req.body);
    const result = await AiAssignmentService.generateAssignment(
      (req as any).user._id,
      validated as any
    );
    ApiResponse.ok(res, 'AI assignment draft generated successfully.', result);
  }

  static async updateAssignment(req: Request, res: Response) {
    const validated = updateAssignmentSchema.parse(req.body);
    const assignment = await AssignmentService.updateAssignment(
      String(req.params.id),
      (req as any).user._id,
      validated
    );
    ApiResponse.ok(res, 'Assignment updated successfully.', assignment);
  }

  static async publishAssignment(req: Request, res: Response) {
    const assignment = await AssignmentService.publishAssignment(String(req.params.id), (req as any).user._id);
    ApiResponse.ok(res, 'Assignment published.', assignment);
  }

  static async unpublishAssignment(req: Request, res: Response) {
    const assignment = await AssignmentService.unpublishAssignment(String(req.params.id), (req as any).user._id);
    ApiResponse.ok(res, 'Assignment unpublished to draft.', assignment);
  }

  static async duplicateAssignment(req: Request, res: Response) {
    const duplicated = await AssignmentService.duplicateAssignment(String(req.params.id), (req as any).user._id);
    ApiResponse.created(res, 'Assignment duplicated as draft.', duplicated);
  }

  static async closeSubmissions(req: Request, res: Response) {
    const assignment = await AssignmentService.closeSubmissions(String(req.params.id), (req as any).user._id);
    ApiResponse.ok(res, 'Submissions closed for assignment.', assignment);
  }

  static async deleteAssignment(req: Request, res: Response) {
    await AssignmentService.deleteAssignment(String(req.params.id), (req as any).user._id);
    ApiResponse.ok(res, 'Assignment deleted successfully.');
  }

  static async getTeacherAssignments(req: Request, res: Response) {
    const subjectId = req.query.subjectId as string | undefined;
    const assignments = await AssignmentService.getTeacherAssignments(
      (req as any).user._id,
      subjectId
    );
    ApiResponse.ok(res, 'Teacher assignments fetched successfully.', assignments);
  }

  static async getAssignmentSubmissions(req: Request, res: Response) {
    const submissions = await AssignmentService.getAssignmentSubmissions(
      String(req.params.id),
      (req as any).user._id
    );
    ApiResponse.ok(res, 'Submissions fetched successfully.', submissions);
  }

  static async runAiEvaluation(req: Request, res: Response) {
    const submission = await AiAssignmentService.evaluateSubmission(
      String(req.params.submissionId),
      (req as any).user._id
    );
    ApiResponse.ok(res, 'AI evaluation completed successfully.', submission);
  }

  static async gradeSubmission(req: Request, res: Response) {
    const validated = gradeAssignmentSchema.parse(req.body);
    const grade = await AssignmentService.gradeSubmission((req as any).user._id, validated);
    ApiResponse.ok(res, 'Official grade submitted successfully.', grade);
  }

  static async getStudentAssignments(req: Request, res: Response) {
    const assignments = await AssignmentService.getStudentAssignments(
      (req as any).user._id,
      String(req.params.subjectId)
    );
    ApiResponse.ok(res, 'Student assignments fetched successfully.', assignments);
  }

  static async submitAssignment(req: Request, res: Response) {
    const validated = submitAssignmentSchema.parse(req.body);
    const submission = await AssignmentService.submitAssignment(
      (req as any).user._id,
      String(req.params.id),
      validated
    );
    ApiResponse.ok(res, 'Work submitted successfully.', submission);
  }

  static async getAssignmentById(req: Request, res: Response) {
    const assignment = await AssignmentService.getAssignmentById(String(req.params.id), (req as any).user);
    ApiResponse.ok(res, 'Assignment details fetched successfully.', assignment);
  }
}
