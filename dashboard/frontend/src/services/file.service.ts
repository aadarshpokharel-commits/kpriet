import { api, httpClient } from '@/lib/api/client';

export interface IAcademicFileRecord {
  _id: string;
  storageKey: string;
  originalFilename: string;
  sanitizedFilename: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  sha256Hash: string;
  category: string;
  securityScan: {
    status: 'CLEAN' | 'FLAGGED' | 'PENDING';
    scannedAt: string;
    scanEngine: string;
    threatDetails?: string;
  };
  uploadedBy: {
    _id: string;
    name: string;
    email?: string;
    role?: string;
  };
  subject?: {
    _id: string;
    subjectName: string;
    subjectCode: string;
  };
  chapterOrUnit?: number;
  assignment?: string;
  submission?: string;
  isPublicToSubject: boolean;
  isConfidentialSubmission: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export class FileService {
  /**
   * Upload an academic file with metadata.
   */
  public static async uploadFile(
    file: File,
    options: {
      category?: string;
      subjectId?: string;
      departmentId?: string;
      semesterId?: string;
      chapterOrUnit?: number;
      assignmentId?: string;
      submissionId?: string;
      isPublicToSubject?: boolean;
      isConfidentialSubmission?: boolean;
    } = {}
  ): Promise<IAcademicFileRecord> {
    const formData = new FormData();
    formData.append('file', file);

    if (options.category) formData.append('category', options.category);
    if (options.subjectId) formData.append('subjectId', options.subjectId);
    if (options.departmentId) formData.append('departmentId', options.departmentId);
    if (options.semesterId) formData.append('semesterId', options.semesterId);
    if (options.chapterOrUnit) formData.append('chapterOrUnit', String(options.chapterOrUnit));
    if (options.assignmentId) formData.append('assignmentId', options.assignmentId);
    if (options.submissionId) formData.append('submissionId', options.submissionId);
    if (options.isPublicToSubject !== undefined) {
      formData.append('isPublicToSubject', String(options.isPublicToSubject));
    }
    if (options.isConfidentialSubmission !== undefined) {
      formData.append('isConfidentialSubmission', String(options.isConfidentialSubmission));
    }

    const res = await api.post<IAcademicFileRecord>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data;
  }

  /**
   * Download a file securely via backend authorization.
   * Prompts the browser download dialog with original filename.
   */
  public static async downloadFile(fileId: string, fallbackFilename?: string): Promise<void> {
    const response = await httpClient.get<Blob>(`/files/${fileId}/download`, {
      responseType: 'blob',
    });

    // Extract filename from Content-Disposition header if available
    let filename = fallbackFilename || 'academic_download';
    const disposition = response.headers['content-disposition']
      ? String(response.headers['content-disposition'])
      : undefined;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }

    // Create temporary download link
    const contentType = response.headers['content-type']
      ? String(response.headers['content-type'])
      : 'application/octet-stream';
    const blob = new Blob([response.data], {
      type: contentType,
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get file security metadata.
   */
  public static async getFileMetadata(fileId: string): Promise<IAcademicFileRecord> {
    const res = await api.get<IAcademicFileRecord>(`/files/${fileId}/metadata`);
    return res.data;
  }

  /**
   * List files for a subject.
   */
  public static async getSubjectFiles(
    subjectId: string,
    category?: string
  ): Promise<IAcademicFileRecord[]> {
    const query = category ? `?category=${category}` : '';
    const res = await api.get<IAcademicFileRecord[]>(`/files/subject/${subjectId}${query}`);
    return res.data;
  }

  /**
   * List submissions for an assignment (strictly student-isolated).
   */
  public static async getAssignmentFiles(
    assignmentId: string
  ): Promise<IAcademicFileRecord[]> {
    const res = await api.get<IAcademicFileRecord[]>(`/files/assignment/${assignmentId}`);
    return res.data;
  }

  /**
   * Delete an authorized file.
   */
  public static async deleteFile(fileId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>(`/files/${fileId}`);
    return res.data;
  }

  /**
   * Formats bytes into clean human-readable units.
   */
  public static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
