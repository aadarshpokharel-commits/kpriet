import { type Request, type Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { AcademicFileService } from '../services/academic-file.service.js';
import { FileCategory } from '../models/AcademicFile.js';

export class FileController {
  /**
   * POST /api/v1/files/upload
   * Upload and process an academic file securely.
   */
  public static async uploadFile(req: Request, res: Response) {
    if (!req.file) {
      throw ApiError.badRequest('No file uploaded. Please provide a file in form-data field "file".');
    }

    const userId = req.user!._id;
    const body = req.body;

    const fileRecord = await AcademicFileService.uploadSecureFile({
      uploadedBy: userId,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      category: body.category as FileCategory,
      department: body.departmentId || body.department,
      semester: body.semesterId || body.semester,
      subject: body.subjectId || body.subject,
      chapterOrUnit: body.chapterOrUnit ? Number(body.chapterOrUnit) : undefined,
      assignment: body.assignmentId || body.assignment,
      submission: body.submissionId || body.submission,
      isPublicToSubject: body.isPublicToSubject !== 'false' && body.isPublicToSubject !== false,
      isConfidentialSubmission: body.isConfidentialSubmission === 'true' || body.isConfidentialSubmission === true,
    });

    ApiResponse.created(res, 'Academic file securely uploaded and verified.', fileRecord);
  }

  /**
   * GET /api/v1/files/:id/download
   * Access-controlled file download.
   */
  public static async downloadFile(req: Request, res: Response) {
    const fileId = String(req.params.id);
    const userContext = {
      _id: req.user!._id,
      role: req.user!.role,
      department: req.user!.department,
      enrolledSubjects: (req.user as any).enrolledSubjects,
    };

    const { fileRecord, readStream } = await AcademicFileService.getAuthorizedFileForDownload(
      fileId,
      userContext
    );

    // Secure response headers
    res.setHeader('Content-Type', fileRecord.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileRecord.originalFilename)}"`
    );
    res.setHeader('Content-Length', fileRecord.sizeBytes);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    readStream.pipe(res);
  }

  /**
   * GET /api/v1/files/:id/view
   * Inline preview for PDFs, images, and videos.
   */
  public static async viewFileInline(req: Request, res: Response) {
    const fileId = String(req.params.id);
    const userContext = {
      _id: req.user!._id,
      role: req.user!.role,
      department: req.user!.department,
      enrolledSubjects: (req.user as any).enrolledSubjects,
    };

    const { fileRecord, readStream } = await AcademicFileService.getAuthorizedFileForDownload(
      fileId,
      userContext
    );

    res.setHeader('Content-Type', fileRecord.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileRecord.originalFilename)}"`
    );
    res.setHeader('Content-Length', fileRecord.sizeBytes);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');

    readStream.pipe(res);
  }

  /**
   * GET /api/v1/files/:id/metadata
   * Inspect file security metadata and verification details.
   */
  public static async getFileMetadata(req: Request, res: Response) {
    const fileId = String(req.params.id);
    const userContext = {
      _id: req.user!._id,
      role: req.user!.role,
      department: req.user!.department,
      enrolledSubjects: (req.user as any).enrolledSubjects,
    };

    const metadata = await AcademicFileService.getAuthorizedFileMetadata(fileId, userContext);
    ApiResponse.ok(res, 'File metadata retrieved.', metadata);
  }

  /**
   * GET /api/v1/files/subject/:subjectId
   * List files for a subject (scoped).
   */
  public static async getSubjectFiles(req: Request, res: Response) {
    const subjectId = String(req.params.subjectId);
    const category = req.query.category as FileCategory | undefined;
    const userContext = {
      _id: req.user!._id,
      role: req.user!.role,
      department: req.user!.department,
      enrolledSubjects: (req.user as any).enrolledSubjects,
    };

    const files = await AcademicFileService.getSubjectFiles(subjectId, userContext, category);
    ApiResponse.ok(res, 'Subject academic files retrieved.', files);
  }

  /**
   * GET /api/v1/files/assignment/:assignmentId
   * List submission files for an assignment (strictly student-isolated).
   */
  public static async getAssignmentFiles(req: Request, res: Response) {
    const assignmentId = String(req.params.assignmentId);
    const userContext = {
      _id: req.user!._id,
      role: req.user!.role,
      department: req.user!.department,
      enrolledSubjects: (req.user as any).enrolledSubjects,
    };

    const files = await AcademicFileService.getAssignmentFiles(assignmentId, userContext);
    ApiResponse.ok(res, 'Assignment submission files retrieved.', files);
  }

  /**
   * DELETE /api/v1/files/:id
   * Securely remove file from storage and database.
   */
  public static async deleteFile(req: Request, res: Response) {
    const fileId = String(req.params.id);
    const userContext = {
      _id: req.user!._id,
      role: req.user!.role,
      department: req.user!.department,
      enrolledSubjects: (req.user as any).enrolledSubjects,
    };

    const result = await AcademicFileService.deleteAuthorizedFile(fileId, userContext);
    ApiResponse.ok(res, result.message, result);
  }
}
