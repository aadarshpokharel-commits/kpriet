import { Router } from 'express';
import { authenticate, requireSubjectAccess } from '../middleware/auth.middleware.js';
import { uploadSingleFile } from '../middleware/upload.middleware.js';
import { FileController } from '../controllers/file.controller.js';

export const fileRouter = Router();

// Apply authentication to all file operations - NO public unauthenticated access allowed
fileRouter.use(authenticate);

// ─── UPLOAD ───
fileRouter.post('/upload', uploadSingleFile, FileController.uploadFile);

// ─── ACCESS-CONTROLLED DOWNLOAD & STREAMING ───
fileRouter.get('/:id/download', FileController.downloadFile);
fileRouter.get('/:id/view', FileController.viewFileInline);
fileRouter.get('/:id/metadata', FileController.getFileMetadata);

// ─── CONTEXTUAL QUERIES ───
fileRouter.get('/subject/:subjectId', requireSubjectAccess('subjectId'), FileController.getSubjectFiles);
fileRouter.get('/assignment/:assignmentId', FileController.getAssignmentFiles);

// ─── DELETION ───
fileRouter.delete('/:id', FileController.deleteFile);
