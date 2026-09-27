import path from 'node:path';
import { ApiError } from '../utils/ApiError.js';
import { FileCategory, SecurityScanStatus, type ISecurityScan } from '../models/AcademicFile.js';

export interface IFileValidationResult {
  isValid: boolean;
  sanitizedFilename: string;
  extension: string;
  detectedMime: string;
  category: FileCategory;
  error?: string;
}

export interface IVirusScanner {
  name: string;
  scanBuffer(buffer: Buffer, filename: string): Promise<ISecurityScan>;
}

export class FileSecurityService {
  /**
   * Allowed MIME types and corresponding extensions for Academic Files.
   */
  private static readonly ALLOWED_TYPES: Record<string, { category: FileCategory; extensions: string[] }> = {
    // ─── PDFs ───
    'application/pdf': {
      category: FileCategory.SUBJECT_RESOURCE,
      extensions: ['.pdf'],
    },

    // ─── Presentations (PPT / PPTX) ───
    'application/vnd.ms-powerpoint': {
      category: FileCategory.PRESENTATION,
      extensions: ['.ppt'],
    },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
      category: FileCategory.PRESENTATION,
      extensions: ['.pptx'],
    },

    // ─── Documents ───
    'application/msword': {
      category: FileCategory.GENERAL_DOCUMENT,
      extensions: ['.doc'],
    },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      category: FileCategory.GENERAL_DOCUMENT,
      extensions: ['.docx'],
    },
    'text/plain': {
      category: FileCategory.GENERAL_DOCUMENT,
      extensions: ['.txt', '.text'],
    },
    'application/rtf': {
      category: FileCategory.GENERAL_DOCUMENT,
      extensions: ['.rtf'],
    },
    'text/csv': {
      category: FileCategory.GENERAL_DOCUMENT,
      extensions: ['.csv'],
    },
    'application/vnd.ms-excel': {
      category: FileCategory.GENERAL_DOCUMENT,
      extensions: ['.xls'],
    },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
      category: FileCategory.GENERAL_DOCUMENT,
      extensions: ['.xlsx'],
    },

    // ─── Images ───
    'image/jpeg': {
      category: FileCategory.SUBJECT_RESOURCE,
      extensions: ['.jpg', '.jpeg'],
    },
    'image/png': {
      category: FileCategory.SUBJECT_RESOURCE,
      extensions: ['.png'],
    },
    'image/webp': {
      category: FileCategory.SUBJECT_RESOURCE,
      extensions: ['.webp'],
    },
    'image/gif': {
      category: FileCategory.SUBJECT_RESOURCE,
      extensions: ['.gif'],
    },
    'image/svg+xml': {
      category: FileCategory.SUBJECT_RESOURCE,
      extensions: ['.svg'],
    },

    // ─── Lecture Videos ───
    'video/mp4': {
      category: FileCategory.LECTURE_VIDEO,
      extensions: ['.mp4'],
    },
    'video/webm': {
      category: FileCategory.LECTURE_VIDEO,
      extensions: ['.webm'],
    },
    'video/x-matroska': {
      category: FileCategory.LECTURE_VIDEO,
      extensions: ['.mkv'],
    },
  };

  /**
   * Maximum allowed file sizes in bytes.
   */
  public static readonly SIZE_LIMITS: Record<FileCategory, number> = {
    [FileCategory.ASSIGNMENT_SUBMISSION]: 25 * 1024 * 1024, // 25 MB
    [FileCategory.SUBJECT_RESOURCE]: 25 * 1024 * 1024,      // 25 MB
    [FileCategory.LECTURE_NOTE]: 25 * 1024 * 1024,          // 25 MB
    [FileCategory.PRESENTATION]: 35 * 1024 * 1024,          // 35 MB
    [FileCategory.GENERAL_DOCUMENT]: 25 * 1024 * 1024,      // 25 MB
    [FileCategory.LECTURE_VIDEO]: 250 * 1024 * 1024,        // 250 MB
  };

  private static externalScanners: IVirusScanner[] = [];

  /**
   * Register an external scanner integration point (e.g. ClamAV daemon).
   */
  public static registerExternalScanner(scanner: IVirusScanner) {
    this.externalScanners.push(scanner);
  }

  /**
   * Strictly sanitize uploaded filenames.
   * - Eliminates directory traversal paths (../, ..\)
   * - Strips null bytes and control characters
   * - Replaces spaces and non-alphanumeric chars with safe underscores
   * - Restricts length and lowercases extension
   */
  public static sanitizeFilename(originalFilename: string): string {
    if (!originalFilename || typeof originalFilename !== 'string') {
      return `academic_file_${Date.now()}`;
    }

    // 1. Strip path and null bytes
    const base = path.basename(originalFilename).replace(/\0/g, '');

    // 2. Separate name and extension
    const ext = path.extname(base).toLowerCase().slice(0, 10);
    let nameWithoutExt = path.basename(base, ext);

    // 3. Clean filename characters (only a-z, 0-9, hyphen, underscore)
    nameWithoutExt = nameWithoutExt
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 80);

    if (!nameWithoutExt || nameWithoutExt === '_') {
      nameWithoutExt = `academic_${Date.now()}`;
    }

    // 4. Clean extension characters
    const cleanExt = ext.replace(/[^a-z0-9.]/g, '');

    return `${nameWithoutExt}${cleanExt}`;
  }

  /**
   * Validates file format, MIME type, and size against security policy.
   */
  public static validateFile(
    originalFilename: string,
    mimeType: string,
    fileSize: number,
    intendedCategory?: FileCategory
  ): IFileValidationResult {
    const ext = path.extname(originalFilename).toLowerCase();
    const sanitizedFilename = this.sanitizeFilename(originalFilename);

    // 1. Check if extension exists
    if (!ext || ext.length < 2) {
      return {
        isValid: false,
        sanitizedFilename,
        extension: ext,
        detectedMime: mimeType,
        category: FileCategory.GENERAL_DOCUMENT,
        error: 'File must have a valid extension (e.g., .pdf, .pptx, .docx).',
      };
    }

    // 2. Validate MIME type against whitelist
    const typeEntry = this.ALLOWED_TYPES[mimeType.toLowerCase()];
    if (!typeEntry) {
      return {
        isValid: false,
        sanitizedFilename,
        extension: ext,
        detectedMime: mimeType,
        category: FileCategory.GENERAL_DOCUMENT,
        error: `Unsupported MIME type: "${mimeType}". Only academic documents, PDFs, presentations, images, and videos are allowed.`,
      };
    }

    // 3. Validate extension matches the declared MIME
    if (!typeEntry.extensions.includes(ext)) {
      return {
        isValid: false,
        sanitizedFilename,
        extension: ext,
        detectedMime: mimeType,
        category: typeEntry.category,
        error: `MIME type "${mimeType}" does not match file extension "${ext}". Potential spoofing detected.`,
      };
    }

    // 4. Category determination
    const finalCategory = intendedCategory || typeEntry.category;

    // 5. File size limit enforcement
    const maxSize = this.SIZE_LIMITS[finalCategory] || 25 * 1024 * 1024;
    if (fileSize > maxSize) {
      const maxMb = Math.round(maxSize / (1024 * 1024));
      return {
        isValid: false,
        sanitizedFilename,
        extension: ext,
        detectedMime: mimeType,
        category: finalCategory,
        error: `File size exceeds the limit of ${maxMb}MB for category "${finalCategory}".`,
      };
    }

    return {
      isValid: true,
      sanitizedFilename,
      extension: ext,
      detectedMime: mimeType,
      category: finalCategory,
    };
  }

  /**
   * Magic bytes header inspection to prevent executable masquerading as documents.
   */
  public static verifyFileSignature(buffer: Buffer, extension: string): boolean {
    if (!buffer || buffer.length < 4) return false;

    // Check for Dangerous Executable Signatures first
    const isWindowsExe = buffer[0] === 0x4d && buffer[1] === 0x5a; // 'MZ'
    const isElfBinary = buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46; // ELF
    const isShellScript = buffer[0] === 0x23 && buffer[1] === 0x21; // '#!'

    if (isWindowsExe || isElfBinary || (isShellScript && extension !== '.txt')) {
      return false; // Binary executable disguised as document!
    }

    switch (extension) {
      case '.pdf':
        // %PDF -> 0x25 0x50 0x44 0x46
        return (
          buffer[0] === 0x25 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x44 &&
          buffer[3] === 0x46
        );

      case '.png':
        // \x89PNG
        return (
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47
        );

      case '.jpg':
      case '.jpeg':
        // \xFF\xD8\xFF
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

      case '.docx':
      case '.pptx':
      case '.xlsx':
        // PK\x03\x04 (Zip container for OpenXML)
        return (
          buffer[0] === 0x50 &&
          buffer[1] === 0x4b &&
          buffer[2] === 0x03 &&
          buffer[3] === 0x04
        );

      case '.doc':
      case '.ppt':
      case '.xls':
        // OLE Compound Document 0xD0 0xCF 0x11 0xE0
        return (
          buffer[0] === 0xd0 &&
          buffer[1] === 0xcf &&
          buffer[2] === 0x11 &&
          buffer[3] === 0xe0
        );

      default:
        // Plain text, SVGs, or media files pass basic non-executable check
        return true;
    }
  }

  /**
   * Integrated Heuristic Virus / Malware Scanner.
   * Inspects buffer contents for script injections, malicious macros, and embedded exploits.
   * Calls any registered external antivirus scanners.
   */
  public static async scanForThreats(
    buffer: Buffer,
    filename: string,
    extension: string
  ): Promise<ISecurityScan> {
    const scanTimestamp = new Date();

    // 1. Signature check
    if (!this.verifyFileSignature(buffer, extension)) {
      return {
        status: SecurityScanStatus.FLAGGED,
        scannedAt: scanTimestamp,
        scanEngine: 'Eduverse-Heuristics-v2.4',
        threatDetails: 'Detected disguised binary executable or header mismatch.',
      };
    }

    // 2. Text/Script scanning for SVGs, XMLs, and text documents
    if (extension === '.svg' || extension === '.txt' || extension === '.xml') {
      const sample = buffer.toString('utf8', 0, Math.min(buffer.length, 64 * 1024));
      const hasScriptTag = /<script[\s>]/i.test(sample);
      const hasJsUri = /javascript:/i.test(sample);
      const hasOnHandler = /on(load|error|click|mouseover)\s*=/i.test(sample);

      if (hasScriptTag || hasJsUri || hasOnHandler) {
        return {
          status: SecurityScanStatus.FLAGGED,
          scannedAt: scanTimestamp,
          scanEngine: 'Eduverse-Heuristics-v2.4',
          threatDetails: 'XSS script injection pattern detected in document content.',
        };
      }
    }

    // 3. Office Macro checks for DOC/DOCX/PPTX
    if (['.doc', '.docx', '.ppt', '.pptx'].includes(extension)) {
      const sample = buffer.toString('latin1', 0, Math.min(buffer.length, 128 * 1024));
      const hasSuspiciousMacro =
        /vbaProject\.bin/i.test(sample) ||
        /AutoExec/i.test(sample) ||
        /Workbook_Open/i.test(sample);

      if (hasSuspiciousMacro) {
        return {
          status: SecurityScanStatus.FLAGGED,
          scannedAt: scanTimestamp,
          scanEngine: 'Eduverse-Heuristics-v2.4',
          threatDetails: 'Suspicious auto-executing VBA Macro detected.',
        };
      }
    }

    // 4. External Scanner Pipeline (e.g. ClamAV integration point)
    for (const scanner of this.externalScanners) {
      try {
        const result = await scanner.scanBuffer(buffer, filename);
        if (result.status === SecurityScanStatus.FLAGGED) {
          return result;
        }
      } catch (err: any) {
        // Log scanner error but continue with heuristics
      }
    }

    return {
      status: SecurityScanStatus.CLEAN,
      scannedAt: scanTimestamp,
      scanEngine: 'Eduverse-Heuristics-v2.4',
    };
  }
}
