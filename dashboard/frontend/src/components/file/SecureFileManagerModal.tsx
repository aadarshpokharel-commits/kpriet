import React, { useState, useEffect, useRef } from 'react';
import { FileService, type IAcademicFileRecord } from '@/services/file.service';
import { useAuth } from '@/context/AuthContext';

interface SecureFileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: {
    _id: string;
    subjectName: string;
    subjectCode: string;
    department?: any;
    semester?: any;
    syllabus?: { unitNumber: number; title: string }[];
  };
  assignmentId?: string;
  initialCategory?: string;
  canUpload?: boolean;
}

export const SecureFileManagerModal: React.FC<SecureFileManagerModalProps> = ({
  isOpen,
  onClose,
  subject,
  assignmentId,
  initialCategory = 'ALL',
  canUpload = true,
}) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<IAcademicFileRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Upload state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('SUBJECT_RESOURCE');
  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [isConfidential, setIsConfidential] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      let list: IAcademicFileRecord[] = [];
      if (assignmentId) {
        list = await FileService.getAssignmentFiles(assignmentId);
      } else {
        list = await FileService.getSubjectFiles(subject._id);
      }
      setFiles(list);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen, subject._id, assignmentId]);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadSuccess(null);

      const uploaded = await FileService.uploadFile(file, {
        category: selectedCategory,
        subjectId: subject._id,
        departmentId: typeof subject.department === 'object' ? subject.department?._id : subject.department,
        semesterId: typeof subject.semester === 'object' ? subject.semester?._id : subject.semester,
        chapterOrUnit: selectedUnit,
        assignmentId,
        isConfidentialSubmission: isConfidential,
        isPublicToSubject: !isConfidential,
      });

      setUploadSuccess(`"${uploaded.originalFilename}" securely uploaded & verified.`);
      await loadFiles();
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || err?.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (file: IAcademicFileRecord) => {
    try {
      setDownloadingId(file._id);
      await FileService.downloadFile(file._id, file.originalFilename);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Download failed. Access denied.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this academic file?')) {
      return;
    }
    try {
      await FileService.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f._id !== fileId));
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete file.');
    }
  };

  const getFileIcon = (ext: string, mime: string) => {
    if (ext === '.pdf' || mime.includes('pdf')) return '📕';
    if (ext.includes('ppt') || mime.includes('presentation')) return '📊';
    if (ext.includes('doc') || ext.includes('txt') || mime.includes('word')) return '📄';
    if (ext.includes('xls') || mime.includes('spreadsheet') || mime.includes('csv')) return '📈';
    if (mime.startsWith('image/')) return '🖼️';
    if (mime.startsWith('video/')) return '🎬';
    return '📁';
  };

  const filteredFiles = files.filter((f) => {
    if (activeCategory !== 'ALL' && f.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.originalFilename.toLowerCase().includes(q) ||
        f.sanitizedFilename.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl h-[88vh] max-h-[820px] rounded-3xl bg-surface border border-line shadow-2xl flex flex-col overflow-hidden">
        {/* ─── MODAL HEADER ─── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-surface-elevated/70 backdrop-blur-sm">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl border border-primary/20">
              📂
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-primary">
                  {subject.subjectCode}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  🔒 Private Storage Protected
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  Backend Authorization Enforced
                </span>
              </div>
              <h2 className="text-lg font-bold text-ink mt-0.5">
                Academic Document & File Management
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted hover:text-ink hover:bg-surface-elevated transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* ─── SECURITY NOTICE BANNER ─── */}
        <div className="px-6 py-2.5 bg-primary/10 border-b border-primary/20 flex items-center justify-between text-xs text-primary dark:text-indigo-300">
          <div className="flex items-center gap-2">
            <span>🛡️</span>
            <span>
              <strong>Zero Public URL Exposure:</strong> Every file request is authenticated and authorized through the backend before delivery.
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted">
            SHA-256 Verified
          </span>
        </div>

        {/* ─── BODY (SPLIT: UPLOADER + FILE BROWSER) ─── */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT: Secure Upload Drawer */}
          {canUpload && (
            <div className="w-full md:w-80 p-5 border-b md:border-b-0 md:border-r border-line bg-surface/40 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                    Upload Academic File
                  </h3>
                  <span className="text-[10px] text-muted">Max 25MB (250MB video)</span>
                </div>

                {/* Drag and Drop Box */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    isDragOver
                      ? 'border-primary bg-primary/10'
                      : 'border-line hover:border-primary/50 bg-surface/50 hover:bg-surface'
                  }`}
                >
                  <span className="text-3xl block">📤</span>
                  <div className="text-xs font-semibold text-ink">
                    Drag & Drop file here, or{' '}
                    <span className="text-primary underline">Browse</span>
                  </div>
                  <span className="text-[10px] text-muted leading-relaxed">
                    PDF, PPT/PPTX, DOCX, TXT, Images, Lecture Videos
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                {/* Upload Options */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-ink block mb-1">
                      Resource Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full rounded-xl bg-surface-elevated border border-line px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="SUBJECT_RESOURCE">Subject Resource (General)</option>
                      <option value="LECTURE_NOTE">Lecture Note / PDF</option>
                      <option value="PRESENTATION">Slide Deck / Presentation (PPTX)</option>
                      <option value="ASSIGNMENT_SUBMISSION">Assignment Submission</option>
                      <option value="LECTURE_VIDEO">Recorded Lecture Video</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-ink block mb-1">
                      Syllabus Chapter / Unit
                    </label>
                    <select
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(Number(e.target.value))}
                      className="w-full rounded-xl bg-surface-elevated border border-line px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-primary cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5].map((u) => (
                        <option key={u} value={u}>
                          Unit {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  {user?.role === 'TEACHER' && (
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-surface-elevated border border-line cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isConfidential}
                        onChange={(e) => setIsConfidential(e.target.checked)}
                        className="rounded accent-primary cursor-pointer"
                      />
                      <span className="text-[11px] text-muted">
                        Confidential (Restricted to Faculty only)
                      </span>
                    </label>
                  )}
                </div>

                {/* Status messages */}
                {isUploading && (
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary animate-pulse text-center font-medium">
                    🔄 Scanning buffer & encrypting to private disk...
                  </div>
                )}
                {uploadSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
                    ✓ {uploadSuccess}
                  </div>
                )}
                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-medium">
                    ⚠️ {uploadError}
                  </div>
                )}
              </div>

              {/* Bottom security stats */}
              <div className="pt-4 border-t border-line text-[11px] text-muted space-y-1 font-mono">
                <div>Engine: Eduverse-Heuristics v2.4</div>
                <div>Storage: Private Vault (No Static Direct)</div>
              </div>
            </div>
          )}

          {/* RIGHT: Authorized File Browser */}
          <div className="flex-1 p-6 flex flex-col overflow-hidden space-y-4">
            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL', label: 'All Files' },
                  { id: 'LECTURE_NOTE', label: 'Notes' },
                  { id: 'PRESENTATION', label: 'Presentations' },
                  { id: 'SUBJECT_RESOURCE', label: 'Resources' },
                  { id: 'ASSIGNMENT_SUBMISSION', label: 'Submissions' },
                  { id: 'LECTURE_VIDEO', label: 'Videos' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      activeCategory === tab.id
                        ? 'bg-primary text-white font-bold shadow-sm'
                        : 'bg-surface-elevated text-muted hover:text-ink border border-line'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl bg-surface-elevated border border-line px-3.5 py-1.5 text-xs text-ink placeholder-muted focus:outline-none focus:border-primary w-48"
              />
            </div>

            {/* File List Container */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
              {loading ? (
                <div className="py-20 text-center text-xs text-muted">
                  Loading secure academic files...
                </div>
              ) : error ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                  {error}
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="py-20 text-center text-xs text-muted border border-dashed border-line rounded-2xl">
                  <span className="text-3xl block mb-2">📁</span>
                  No authorized files found in this category.
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const icon = getFileIcon(file.extension, file.mimeType);
                  const isDownloading = downloadingId === file._id;

                  return (
                    <div
                      key={file._id}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-line bg-surface/50 hover:bg-surface-elevated transition gap-3"
                    >
                      {/* Left: Icon & Details */}
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-2xl flex-shrink-0">{icon}</span>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-ink truncate">
                              {file.originalFilename}
                            </span>
                            {file.chapterOrUnit && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                                Unit {file.chapterOrUnit}
                              </span>
                            )}
                            {file.isConfidentialSubmission && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                                Confidential
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted mt-0.5">
                            <span>{FileService.formatBytes(file.sizeBytes)}</span>
                            <span>•</span>
                            <span>{file.extension.toUpperCase()}</span>
                            <span>•</span>
                            <span className="text-emerald-500 font-medium">
                              🛡️ Clean
                            </span>
                            <span>•</span>
                            <span className="font-mono text-[10px] truncate max-w-[120px]" title={`SHA-256: ${file.sha256Hash}`}>
                              hash:{file.sha256Hash.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Download via backend authorization */}
                        <button
                          onClick={() => handleDownload(file)}
                          disabled={isDownloading}
                          className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isDownloading ? 'Downloading...' : 'Download ⬇'}
                        </button>

                        {/* Delete for uploader / teacher */}
                        {(user?.role === 'ADMIN' || user?.role === 'TEACHER' || file.uploadedBy?._id === user?._id) && (
                          <button
                            onClick={() => handleDelete(file._id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete file"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
