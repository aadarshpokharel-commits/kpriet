import multer from 'multer';
import { type Request, type Response, type NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';

// Store in memory buffer so we can scan and hash before committing to private disk
const storage = multer.memoryStorage();

// Maximum upload quota: 250MB
const upload = multer({
  storage,
  limits: {
    fileSize: 250 * 1024 * 1024, // 250MB max (lecture videos)
    files: 5,                   // Maximum 5 files per request
  },
});

/**
 * Middleware handling single file upload under form field 'file'.
 */
export const uploadSingleFile = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(ApiError.badRequest('File size exceeds the institutional 250MB ceiling limit.'));
        }
        return next(ApiError.badRequest(`File upload error: ${err.message}`));
      }
      return next(ApiError.badRequest(err.message || 'File upload failed.'));
    }
    next();
  });
};

/**
 * Middleware handling multiple files upload under form field 'files'.
 */
export const uploadMultipleFiles = (req: Request, res: Response, next: NextFunction) => {
  upload.array('files', 5)(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(ApiError.badRequest('One or more files exceed the institutional size limit.'));
        }
        return next(ApiError.badRequest(`Multiple file upload error: ${err.message}`));
      }
      return next(ApiError.badRequest(err.message || 'Upload failed.'));
    }
    next();
  });
};
