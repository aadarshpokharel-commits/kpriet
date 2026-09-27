import { Types } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { AuditLog } from '../models/AuditLog.js';
import { AuditAction, UserRole } from '../types/academic.types.js';
import {
  AcademicFile,
  FileCategory,
  SecurityScanStatus,
  type IAcademicFile,
} from '../models/AcademicFile.js';
import { FileSecurityService } from './file-security.service.js';
import { FileStorageService } from './file-storage.service.js';
import { FileAccessService, type IAuthUserContext } from './file-access.service.js';

export interface IFileUploadOptions {
  uploadedBy: string | Types.ObjectId;
  originalFilename: string;
  mimeType: string;
  buffer: Buffer;
  category?: FileCategory;
  department?: string | Types.ObjectId;
  semester?: string | Types.ObjectId;
  subject?: string | Types.ObjectId;
  chapterOrUnit?: number;
  assignment?: string | Types.ObjectId;
  submission?: string | Types.ObjectId;
  isPublicToSubject?: boolean;
  isConfidentialSubmission?: boolean;
}

export class AcademicFileService {
  /**
   * Securely validates, scans, stores, and registers an academic file.
   */
  public static async uploadSecureFile(options: IFileUploadOptions): Promise<IAcademicFile> {
    const {
      uploadedBy,
      originalFilename,
      mimeType,
      buffer,
      category = FileCategory.SUBJECT_RESOURCE,
      department,
      semester,
      subject,
      chapterOrUnit,
      assignment,
      submission,
      isPublicToSubject = true,
      isConfidentialSubmission = false,
    } = options;

    if (!buffer || buffer.length === 0) {
      throw ApiError.badRequest('File content buffer cannot be empty.');
    }

    // 1. Validation (MIME, Extension, Size)
    const validation = FileSecurityService.validateFile(
      originalFilename,
      mimeType,
      buffer.length,
      category
    );

    if (!validation.isValid) {
      throw ApiError.badRequest(validation.error || 'Invalid file format or size limit exceeded.');
    }

    // 2. Malware & Heuristic Virus Scan
    const scanResult = await FileSecurityService.scanForThreats(
      buffer,
      validation.sanitizedFilename,
      validation.extension
    );

    if (scanResult.status === SecurityScanStatus.FLAGGED) {
      // Log security threat
      await AuditLog.create({
        user: uploadedBy,
        action: AuditAction.CONTENT_UPDATE,
        entityType: 'AcademicFileSecurity',
        description: `SECURITY THREAT FLAGGED: File "${originalFilename}" rejected. Details: ${scanResult.threatDetails}`,
      });

      throw ApiError.badRequest(
        `File rejected by security scanner: ${scanResult.threatDetails || 'Threat detected.'}`
      );
    }

    // 3. Generate unguessable private storage key & hash
    const storageKey = FileStorageService.generateStorageKey(validation.extension);
    const sha256Hash = FileStorageService.computeSha256(buffer);

    // 4. Save to Private Storage (Outside static web routes)
    await FileStorageService.saveFile(buffer, storageKey);

    // 5. Create database record
    const fileRecord = await AcademicFile.create({
      storageKey,
      originalFilename,
      sanitizedFilename: validation.sanitizedFilename,
      mimeType: validation.detectedMime,
      extension: validation.extension,
      sizeBytes: buffer.length,
      sha256Hash,
      category: validation.category,
      securityScan: scanResult,

      uploadedBy: new Types.ObjectId(String(uploadedBy)),
      department: department ? new Types.ObjectId(String(department)) : undefined,
      semester: semester ? new Types.ObjectId(String(semester)) : undefined,
      subject: subject ? new Types.ObjectId(String(subject)) : undefined,
      chapterOrUnit: chapterOrUnit ? Number(chapterOrUnit) : undefined,
      assignment: assignment ? new Types.ObjectId(String(assignment)) : undefined,
      submission: submission ? new Types.ObjectId(String(submission)) : undefined,

      isPublicToSubject: isConfidentialSubmission ? false : isPublicToSubject,
      isConfidentialSubmission,
    });

    // 6. Audit Trail
    await AuditLog.create({
      user: uploadedBy,
      action: AuditAction.CONTENT_PUBLISH,
      entityType: 'AcademicFile',
      entityId: fileRecord._id,
      description: `Uploaded secure file "${validation.sanitizedFilename}" (${Math.round(buffer.length / 1024)} KB, ${validation.category})`,
    });

    return fileRecord;
  }

  /**
   * Authorizes a download request and returns file metadata and readable stream.
   */
  public static async getAuthorizedFileForDownload(
    fileId: string,
    userContext: IAuthUserContext
  ): Promise<{
    fileRecord: IAcademicFile;
    readStream: import('node:fs').ReadStream;
  }> {
    if (!Types.ObjectId.isValid(fileId)) {
      throw ApiError.badRequest('Invalid file ID format.');
    }

    const fileRecord = await AcademicFile.findById(fileId);
    if (!fileRecord) {
      throw ApiError.notFound('Academic file record not found.');
    }

    // Enforce Authorization (Student isolation, Teacher subject assignment, HOD/Admin)
    await FileAccessService.authorizeFileAccess(userContext, fileRecord);

    // Verify physical file on private disk
    if (!FileStorageService.fileExists(fileRecord.storageKey)) {
      throw ApiError.notFound('File binary does not exist in private storage.');
    }

    // Update download statistics asynchronously
    fileRecord.downloadCount += 1;
    fileRecord.lastDownloadedAt = new Date();
    await fileRecord.save();

    // Stream from private disk
    const readStream = FileStorageService.getFileReadStream(fileRecord.storageKey);

    return {
      fileRecord,
      readStream,
    };
  }

  /**
   * Retrieves file metadata for authorized viewer.
   */
  public static async getAuthorizedFileMetadata(
    fileId: string,
    userContext: IAuthUserContext
  ): Promise<IAcademicFile> {
    if (!Types.ObjectId.isValid(fileId)) {
      throw ApiError.badRequest('Invalid file ID format.');
    }

    const fileRecord = await AcademicFile.findById(fileId)
      .populate('uploadedBy', 'name email role profile.designation')
      .populate('subject', 'subjectName subjectCode');

    if (!fileRecord) {
      throw ApiError.notFound('Academic file record not found.');
    }

    await FileAccessService.authorizeFileAccess(userContext, fileRecord);
    return fileRecord;
  }

  /**
   * List files for a subject, with strict student/teacher filtering.
   */
  public static async getSubjectFiles(
    subjectId: string,
    userContext: IAuthUserContext,
    category?: FileCategory
  ): Promise<IAcademicFile[]> {
    const query: Record<string, any> = {
      subject: new Types.ObjectId(subjectId),
    };

    if (category) {
      query.category = category;
    }

    // Students only see public subject resources or their own submissions
    if (userContext.role === UserRole.STUDENT) {
      query.$or = [
        { isPublicToSubject: true },
        { uploadedBy: userContext._id },
      ];
    }

    const files = await AcademicFile.find(query)
      .populate('uploadedBy', 'name email role')
      .sort({ chapterOrUnit: 1, createdAt: -1 });

    return files;
  }

  /**
   * List submissions for an assignment.
   * If student: returns ONLY their own submission file.
   * If teacher: returns all student submissions for that assignment.
   */
  public static async getAssignmentFiles(
    assignmentId: string,
    userContext: IAuthUserContext
  ): Promise<IAcademicFile[]> {
    const query: Record<string, any> = {
      assignment: new Types.ObjectId(assignmentId),
    };

    if (userContext.role === UserRole.STUDENT) {
      // STRICT STUDENT ISOLATION
      query.uploadedBy = userContext._id;
    }

    const files = await AcademicFile.find(query)
      .populate('uploadedBy', 'name email profile.registerNumber')
      .sort({ createdAt: -1 });

    return files;
  }

  /**
   * Securely deletes an academic file and removes it from disk.
   */
  public static async deleteAuthorizedFile(
    fileId: string,
    userContext: IAuthUserContext
  ): Promise<{ success: boolean; message: string }> {
    const fileRecord = await AcademicFile.findById(fileId);
    if (!fileRecord) {
      throw ApiError.notFound('File not found.');
    }

    await FileAccessService.authorizeFileDeletion(userContext, fileRecord);

    // Delete from private disk
    await FileStorageService.deleteFile(fileRecord.storageKey);

    // Remove from DB
    await AcademicFile.findByIdAndDelete(fileId);

    // Audit Log
    await AuditLog.create({
      user: userContext._id,
      action: AuditAction.CONTENT_DELETE,
      entityType: 'AcademicFile',
      entityId: fileRecord._id,
      description: `Deleted secure file "${fileRecord.sanitizedFilename}"`,
    });

    return { success: true, message: 'File deleted successfully.' };
  }
}
