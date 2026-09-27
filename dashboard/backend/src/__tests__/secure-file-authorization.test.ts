import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { Types } from 'mongoose';
import { FileSecurityService } from '../services/file-security.service.js';
import { FileAccessService } from '../services/file-access.service.js';
import { UserRole } from '../types/academic.types.js';
import { FileCategory, type IAcademicFile } from '../models/AcademicFile.js';
import { StudentEnrollment, TeacherAssignment } from '../models/index.js';

describe('Secure Academic File Management Architecture', () => {
  const studentAId = new Types.ObjectId();
  const studentBId = new Types.ObjectId();
  const teacherAuthorizedId = new Types.ObjectId();
  const teacherUnauthorizedId = new Types.ObjectId();
  const subjectId = new Types.ObjectId();
  const otherSubjectId = new Types.ObjectId();

  before(() => {
    // Stub Mongoose exists methods for pure offline unit test execution
    (StudentEnrollment as any).exists = async (query: any) => {
      // Return true only if query matches authorized student enrollment
      if (String(query.student) === String(studentAId) && String(query.enrolledSubjects) === String(subjectId)) {
        return { _id: new Types.ObjectId() };
      }
      return null;
    };

    (TeacherAssignment as any).exists = async (query: any) => {
      if (String(query.teacher) === String(teacherAuthorizedId) && String(query.subject) === String(subjectId)) {
        return { _id: new Types.ObjectId() };
      }
      return null;
    };
  });

  describe('Filename Sanitization & Extension Handling', () => {
    it('sanitizes dangerous path traversal and special characters', () => {
      const maliciousName = '../../../../etc/passwd%00_final assignment (1) [v2]!.pdf';
      const sanitized = FileSecurityService.sanitizeFilename(maliciousName);
      assert.strictEqual(sanitized, 'passwd_00_final_assignment_1_v2_.pdf');
      assert.ok(!sanitized.includes('..'));
      assert.ok(!sanitized.includes('/'));
      assert.ok(!sanitized.includes('\\'));
    });

    it('rejects disallowed extensions and spoofed MIME types', () => {
      const res = FileSecurityService.validateFile('trojan.exe', 'application/x-msdownload', 1024);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.includes('Unsupported MIME type'));

      const spoofRes = FileSecurityService.validateFile('fake.exe.pdf', 'application/x-msdownload', 1024);
      assert.strictEqual(spoofRes.isValid, false);
    });

    it('validates allowed academic types (PDF, PPTX, DOCX, MP4)', () => {
      const pdfRes = FileSecurityService.validateFile(
        'Calculus_Unit1.pdf',
        'application/pdf',
        1024 * 1024,
        FileCategory.LECTURE_NOTE
      );
      assert.strictEqual(pdfRes.isValid, true);
      assert.strictEqual(pdfRes.category, FileCategory.LECTURE_NOTE);

      const pptxRes = FileSecurityService.validateFile(
        'Lecture2_Slides.pptx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        5 * 1024 * 1024
      );
      assert.strictEqual(pptxRes.isValid, true);
      assert.strictEqual(pptxRes.category, FileCategory.PRESENTATION);
    });

    it('enforces file size limits (rejects > 25MB for PDFs)', () => {
      const oversizedRes = FileSecurityService.validateFile(
        'HeavyBook.pdf',
        'application/pdf',
        30 * 1024 * 1024, // 30 MB > 25 MB limit
        FileCategory.LECTURE_NOTE
      );
      assert.strictEqual(oversizedRes.isValid, false);
      assert.ok(oversizedRes.error?.includes('exceeds the limit of 25MB'));
    });

    it('detects magic byte mismatches (executable disguised as PDF)', () => {
      const fakePdfBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00malicious binary content');
      const isSignatureValid = FileSecurityService.verifyFileSignature(fakePdfBuffer, '.pdf');
      assert.strictEqual(isSignatureValid, false);
    });

    it('passes verified PDF header signatures', () => {
      const cleanPdfBuffer = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
      const isSignatureValid = FileSecurityService.verifyFileSignature(cleanPdfBuffer, '.pdf');
      assert.strictEqual(isSignatureValid, true);
    });

    it('scans buffer with heuristic threat scanner', async () => {
      const cleanPdfBuffer = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
      const scanResult = await FileSecurityService.scanForThreats(cleanPdfBuffer, 'notes.pdf', '.pdf');
      assert.strictEqual(scanResult.status, 'CLEAN');
      assert.ok(scanResult.scanEngine.includes('Eduverse-Heuristics'));
    });
  });

  describe('Strict Role-Based & Isolation Authorization Matrix', () => {
    const studentASubmission = {
      _id: new Types.ObjectId(),
      storageKey: 'sec_11111111-2222-3333-4444-555555555555.bin',
      originalFilename: 'studentA_assignment.pdf',
      sanitizedFilename: 'studentA_assignment.pdf',
      mimeType: 'application/pdf',
      extension: '.pdf',
      sizeBytes: 10240,
      sha256Hash: 'a'.repeat(64),
      category: FileCategory.ASSIGNMENT_SUBMISSION,
      uploadedBy: studentAId,
      subject: subjectId,
      isPublicToSubject: false,
      isConfidentialSubmission: true,
      downloadCount: 0,
    } as unknown as IAcademicFile;

    const publishedResource = {
      _id: new Types.ObjectId(),
      storageKey: 'sec_subject_note.bin',
      originalFilename: 'Linear_Algebra_Notes.pdf',
      sanitizedFilename: 'Linear_Algebra_Notes.pdf',
      mimeType: 'application/pdf',
      extension: '.pdf',
      sizeBytes: 20480,
      sha256Hash: 'b'.repeat(64),
      category: FileCategory.LECTURE_NOTE,
      uploadedBy: teacherAuthorizedId,
      subject: subjectId,
      isPublicToSubject: true,
      isConfidentialSubmission: false,
      downloadCount: 5,
    } as unknown as IAcademicFile;

    it('allows Student A to download their own submission', async () => {
      const isAllowed = await FileAccessService.authorizeFileAccess(
        {
          _id: studentAId,
          role: UserRole.STUDENT,
        },
        studentASubmission
      );
      assert.strictEqual(isAllowed, true);
    });

    it('PREVENTS Student B from accessing Student A submission (Anti-Tamper Isolation)', async () => {
      await assert.rejects(
        async () => {
          await FileAccessService.authorizeFileAccess(
            {
              _id: studentBId,
              role: UserRole.STUDENT,
            },
            studentASubmission
          );
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 403);
          assert.ok(err.message.includes('another student'));
          return true;
        }
      );
    });

    it('allows authorized teacher to download subject submissions and materials', async () => {
      const isAllowed = await FileAccessService.authorizeFileAccess(
        {
          _id: teacherAuthorizedId,
          role: UserRole.TEACHER,
        },
        studentASubmission
      );
      assert.strictEqual(isAllowed, true);
    });

    it('rejects unauthorized teacher from accessing files of unassigned subjects', async () => {
      await assert.rejects(
        async () => {
          await FileAccessService.authorizeFileAccess(
            {
              _id: teacherUnauthorizedId,
              role: UserRole.TEACHER,
            },
            studentASubmission
          );
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 403);
          assert.ok(err.message.includes('authorized subjects'));
          return true;
        }
      );
    });

    it('allows enrolled student to access published subject resource', async () => {
      const isAllowed = await FileAccessService.authorizeFileAccess(
        {
          _id: studentAId,
          role: UserRole.STUDENT,
          enrolledSubjects: [subjectId],
        },
        publishedResource
      );
      assert.strictEqual(isAllowed, true);
    });

    it('rejects student attempting to access published resource for an unenrolled subject', async () => {
      const otherSubjectResource = {
        _id: new Types.ObjectId(),
        storageKey: 'sec_other_subject.bin',
        originalFilename: 'Civil_Structures.pdf',
        sanitizedFilename: 'Civil_Structures.pdf',
        mimeType: 'application/pdf',
        extension: '.pdf',
        sizeBytes: 20480,
        sha256Hash: 'c'.repeat(64),
        category: FileCategory.LECTURE_NOTE,
        uploadedBy: teacherAuthorizedId,
        subject: otherSubjectId,
        isPublicToSubject: true,
        isConfidentialSubmission: false,
        downloadCount: 0,
      } as unknown as IAcademicFile;

      await assert.rejects(
        async () => {
          await FileAccessService.authorizeFileAccess(
            {
              _id: studentAId,
              role: UserRole.STUDENT,
              enrolledSubjects: [subjectId], // Enrolled in subjectId, NOT otherSubjectId
            },
            otherSubjectResource
          );
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 403);
          assert.ok(err.message.includes('enrolled in'));
          return true;
        }
      );
    });

    it('allows Super-Admin / Principal global authorization override', async () => {
      const adminAllowed = await FileAccessService.authorizeFileAccess(
        {
          _id: new Types.ObjectId(),
          role: UserRole.ADMIN,
        },
        studentASubmission
      );
      assert.strictEqual(adminAllowed, true);
    });
  });
});
