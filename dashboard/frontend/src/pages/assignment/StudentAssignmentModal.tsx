import React, { useState } from 'react';
import { assignmentService } from '@/services/assignment.service';
import { FileService } from '@/services/file.service';
import type {
  IAssignmentItem,
  ISubmitAssignmentPayload,
  IAssignmentSubmissionItem,
} from '@/types/academic.types';

interface StudentAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: IAssignmentItem | null;
  onSubmissionSuccess: (updatedSub: IAssignmentSubmissionItem) => void;
}

export const StudentAssignmentModal: React.FC<StudentAssignmentModalProps> = ({
  isOpen,
  onClose,
  assignment,
  onSubmissionSuccess,
}) => {
  const [submissionText, setSubmissionText] = useState(
    assignment?.mySubmission?.submissionText || ''
  );
  const [submissionFiles, setSubmissionFiles] = useState<
    Array<{ name: string; url: string; sizeBytes?: number; fileType?: string }>
  >(assignment?.mySubmission?.submissionFiles || []);
  const [notes, setNotes] = useState(assignment?.mySubmission?.notes || '');

  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !assignment) return null;

  const mySub = assignment.mySubmission;
  const myGrade = assignment.myGrade;
  const isGraded = assignment.submissionStatus === 'GRADED' || !!myGrade;
  const isPastDeadline = new Date() > new Date(assignment.dueDate);
  const isClosed = assignment.status === 'CLOSED';

  // Check if late submission is prohibited
  const lateRejected = isPastDeadline && assignment.lateSubmissionPolicy === 'REJECT';
  const canSubmit = !isClosed && !lateRejected && (!mySub || assignment.allowResubmission) && !isGraded;

  const handleAddFile = () => {
    if (!newFileName.trim()) return;

    // Validate extension
    const ext = newFileName.split('.').pop()?.toLowerCase() || '';
    const allowed = (assignment.allowedFileTypes || []).map((e) => e.toLowerCase().replace('.', ''));
    if (allowed.length > 0 && !allowed.includes(ext)) {
      setErrorMsg(`Unsupported file type (.${ext}). Allowed: ${allowed.join(', ')}`);
      return;
    }

    setSubmissionFiles((prev) => [
      ...prev,
      {
        name: newFileName.trim(),
        url: newFileUrl.trim() || '#',
        sizeBytes: 1024 * 500,
        fileType: ext,
      },
    ]);
    setNewFileName('');
    setNewFileUrl('');
    setErrorMsg(null);
  };

  const handleFileUploadSim = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowed = (assignment.allowedFileTypes || []).map((e) => e.toLowerCase().replace('.', ''));
    if (allowed.length > 0 && !allowed.includes(ext)) {
      setErrorMsg(`Unsupported file type (.${ext}). Allowed: ${allowed.join(', ')}`);
      return;
    }

    if (file.size > (assignment.maxFileSizeMB || 25) * 1024 * 1024) {
      setErrorMsg(`File exceeds maximum size of ${assignment.maxFileSizeMB || 25} MB.`);
      return;
    }

    try {
      setIsUploadingFile(true);
      setErrorMsg(null);
      const uploaded = await FileService.uploadFile(file, {
        category: 'ASSIGNMENT_SUBMISSION',
        subjectId: typeof assignment.subject === 'object' ? (assignment.subject as any)?._id : assignment.subject,
        assignmentId: assignment._id,
        isConfidentialSubmission: true,
        isPublicToSubject: false,
      });

      setSubmissionFiles((prev) => [
        ...prev,
        {
          name: uploaded.originalFilename,
          url: `/api/v1/files/${uploaded._id}/download`,
          sizeBytes: uploaded.sizeBytes,
          fileType: ext,
        },
      ]);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Secure file upload failed.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSubmissionFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!submissionText.trim() && submissionFiles.length === 0) {
      setErrorMsg('Please write a text response or attach at least one solution file.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: ISubmitAssignmentPayload = {
      submissionText: submissionText.trim() || undefined,
      submissionFiles,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await assignmentService.submitAssignment(assignment._id, payload);
      setSuccessMsg(mySub ? 'Submission replaced successfully!' : 'Assignment submitted successfully!');
      onSubmissionSuccess(res);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to submit assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h2 className="text-base font-bold text-card-foreground">{assignment.title}</h2>
              {assignment.chapterOrUnit && (
                <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-xs font-mono font-bold text-primary dark:text-accent-foreground border border-primary-border">
                  Unit {assignment.chapterOrUnit}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Due Date: <span className="font-semibold text-foreground font-mono">{new Date(assignment.dueDate).toLocaleString()}</span> • Max {assignment.maxMarks} Marks
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="rounded-xl border border-error-border bg-error-soft p-3 text-xs font-medium text-error-text flex items-center justify-between">
              <span>⚠️ {errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-error-text hover:opacity-80">
                ✕
              </button>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-success-border bg-success-soft p-3 text-xs font-medium text-success-text">
              ✓ {successMsg}
            </div>
          )}

          {/* OFFICIAL GRADE & FEEDBACK CARD (IF GRADED) */}
          {isGraded && myGrade && (
            <div className="rounded-2xl border border-success-border bg-success-soft/30 p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-success-border/50 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Official Evaluation & Graded Score</h3>
                    <p className="text-xs text-muted-foreground">
                      Evaluated and authorized by instructor on {new Date(myGrade.gradedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-primary dark:text-accent-foreground font-mono">
                    {myGrade.marksObtained} / {assignment.maxMarks}
                  </span>
                  <p className="text-[10px] text-muted-foreground font-bold">
                    ({Math.round((myGrade.marksObtained / assignment.maxMarks) * 100)}%)
                  </p>
                </div>
              </div>

              {myGrade.feedback && (
                <div className="rounded-xl bg-card border border-border p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Instructor Feedback:</p>
                  <p className="text-xs text-card-foreground mt-1 italic">"{myGrade.feedback}"</p>
                </div>
              )}

              {/* Rubric scores breakdown */}
              {myGrade.criterionFeedback && myGrade.criterionFeedback.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">Criterion Score Breakdown:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {myGrade.criterionFeedback.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-border bg-card p-2.5 text-xs"
                      >
                        <span className="font-medium text-card-foreground">{c.title}</span>
                        <span className="font-mono font-bold text-primary dark:text-accent-foreground">
                          {c.score} / {c.maxMarks}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assignment Description & Instructions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-primary dark:text-accent-foreground tracking-wider uppercase">
              Assignment Overview & Instructions
            </h3>

            {assignment.description && (
              <p className="text-xs text-card-foreground leading-relaxed bg-muted/40 border border-border rounded-2xl p-3.5">
                {assignment.description}
              </p>
            )}

            {assignment.instructions && (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
                <span className="text-xs font-bold text-card-foreground">Detailed Deliverables & Guidelines:</span>
                <div className="font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {assignment.instructions}
                </div>
              </div>
            )}
          </div>

          {/* Teacher Attachments & References */}
          {((assignment.attachments && assignment.attachments.length > 0) ||
            (assignment.referenceMaterials && assignment.referenceMaterials.length > 0)) && (
            <div className="space-y-3 pt-3 border-t border-border">
              <h3 className="text-xs font-bold text-primary dark:text-accent-foreground tracking-wider uppercase">
                Reference Documents & Resources
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {assignment.attachments?.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-xs hover:border-primary/50 hover:bg-muted transition-all group"
                  >
                    <span className="font-semibold text-card-foreground group-hover:text-primary truncate">
                      📎 {att.name}
                    </span>
                    <span className="text-primary font-bold ml-2">Download ↗</span>
                  </a>
                ))}
                {assignment.referenceMaterials?.map((ref, idx) => (
                  <a
                    key={idx}
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-xs hover:border-primary/50 hover:bg-muted transition-all group"
                  >
                    <span className="font-semibold text-card-foreground group-hover:text-primary truncate">
                      🔗 {ref.title}
                    </span>
                    <span className="text-primary font-bold ml-2">Open Link ↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* VISIBLE EVALUATION CRITERIA & RUBRIC */}
          {assignment.autoEvaluationSettings?.showCriteriaToStudents && (
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-primary dark:text-accent-foreground tracking-wider uppercase">
                  Evaluation Criteria & Rubrics (Grading Benchmarks)
                </h3>
                <span className="text-[10px] font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-lg border border-primary-border">
                  Visible to Students
                </span>
              </div>

              {/* Rubric breakdown */}
              {assignment.rubricCriteria && assignment.rubricCriteria.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">Rubric Scoring Components:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {assignment.rubricCriteria.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-2xl border border-border bg-card p-3 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-card-foreground">{c.title}</span>
                          <span className="font-mono font-bold text-primary dark:text-accent-foreground">{c.maxMarks} pts</span>
                        </div>
                        {c.description && <p className="text-[11px] text-muted-foreground">{c.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required concepts */}
              {assignment.autoEvaluationSettings?.requiredConcepts &&
                assignment.autoEvaluationSettings.requiredConcepts.length > 0 && (
                  <div className="rounded-2xl border border-border bg-muted/30 p-3 space-y-1.5">
                    <p className="text-xs font-bold text-foreground">Key Concepts Required in Your Solution:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {assignment.autoEvaluationSettings.requiredConcepts.map((c, i) => (
                        <span
                          key={i}
                          className="rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary dark:text-accent-foreground border border-primary-border"
                        >
                          ✦ {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Submission Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-primary dark:text-accent-foreground tracking-wider uppercase">
                Your Submission
              </h3>
              {mySub && (
                <span
                  className={`rounded-lg px-2.5 py-0.5 text-xs font-bold border ${
                    mySub.isLate
                      ? 'bg-error-soft text-error-text border-error-border'
                      : 'bg-success-soft text-success-text border-success-border'
                  }`}
                >
                  {mySub.status} • {new Date(mySub.submittedAt).toLocaleDateString()}
                  {mySub.resubmissionCount ? ` (Resubmitted ${mySub.resubmissionCount}x)` : ''}
                </span>
              )}
            </div>

            {/* Deadline warnings */}
            {isPastDeadline && (
              <div
                className={`rounded-2xl p-3 text-xs font-medium flex items-center justify-between border ${
                  assignment.lateSubmissionPolicy === 'REJECT'
                    ? 'bg-error-soft text-error-text border-error-border'
                    : 'bg-warning-soft text-warning-text border-warning-border'
                }`}
              >
                <span>
                  ⏰ {isPastDeadline ? 'The deadline has passed.' : ''}{' '}
                  {assignment.lateSubmissionPolicy === 'ALLOW_WITH_PENALTY'
                    ? `Late submissions are accepted with a ${assignment.latePenaltyPercent || 10}% penalty deduction.`
                    : assignment.lateSubmissionPolicy === 'REJECT'
                    ? 'Late submissions are strictly rejected.'
                    : 'Late submissions are permitted.'}
                </span>
              </div>
            )}

            {canSubmit ? (
              <div className="space-y-4">
                {/* Text submission */}
                {assignment.allowTextSubmission && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground block">
                      Written Response / Code Implementation:
                    </label>
                    <textarea
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      rows={6}
                      placeholder="Write your answer, code, formulas, or explanation here..."
                      className="w-full rounded-2xl border border-border bg-input px-3.5 py-2.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                )}

                {/* File Upload */}
                {assignment.allowFileSubmission && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground">Upload Solution Files:</label>
                      <span className="text-[10px] text-muted-foreground">
                        Allowed: {(assignment.allowedFileTypes || []).map((t) => '.' + t).join(', ')} • Max {assignment.maxFileSizeMB} MB
                      </span>
                    </div>

                    {/* File Picker input */}
                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center hover:border-primary/50 hover:bg-muted/50 transition-all">
                        <input
                          type="file"
                          disabled={isUploadingFile}
                          onChange={handleFileUploadSim}
                          className="hidden"
                          accept={(assignment.allowedFileTypes || []).map((t) => '.' + t).join(',')}
                        />
                        <span className="text-xs font-bold text-primary dark:text-accent-foreground">
                          {isUploadingFile ? '🔄 Scanning & Securely Encrypting...' : '📁 Click to browse or drop local files'}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {isUploadingFile ? 'Heuristic malware check & private storage streaming' : 'Upload your source files, PDF reports, or archives'}
                        </p>
                      </label>
                    </div>

                    {/* Or enter remote document link */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Or enter File Name (e.g. solution.pdf)"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        className="flex-1 rounded-xl border border-border bg-input px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                      />
                      <input
                        type="text"
                        placeholder="File URL / Cloud Drive link"
                        value={newFileUrl}
                        onChange={(e) => setNewFileUrl(e.target.value)}
                        className="flex-1 rounded-xl border border-border bg-input px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={handleAddFile}
                        className="rounded-xl bg-muted border border-border px-3.5 py-2 text-xs font-bold text-foreground hover:bg-secondary cursor-pointer"
                      >
                        + Add File
                      </button>
                    </div>

                    {/* Attached files list */}
                    {submissionFiles.length > 0 && (
                      <div className="space-y-1.5">
                        {submissionFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-xl border border-border bg-card p-2.5 text-xs"
                          >
                            <span className="font-semibold text-foreground truncate">📎 {file.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="text-muted-foreground hover:text-error-text p-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes for teacher */}
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">
                    Optional Notes for Instructor:
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any comments, dependencies, or instructions for evaluating your work..."
                    className="w-full rounded-xl border border-border bg-input px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  {isGraded
                    ? 'This assignment has already been evaluated and finalized.'
                    : isClosed
                    ? 'Submissions for this assignment are closed.'
                    : lateRejected
                    ? 'Deadline has passed. Late submissions are not permitted.'
                    : 'Work has been submitted.'}
                </p>

                {mySub && (
                  <div className="space-y-2">
                    {mySub.submissionText && (
                      <div className="rounded-xl bg-card border border-border p-3 font-mono text-xs text-card-foreground whitespace-pre-wrap">
                        {mySub.submissionText}
                      </div>
                    )}
                    {mySub.submissionFiles && mySub.submissionFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {mySub.submissionFiles.map((f, i) => (
                          <a
                            key={i}
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-primary font-semibold hover:underline"
                          >
                            📎 {f.name} ↗
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-card">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            Close
          </button>

          {canSubmit && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-xs">🌀</span>
                  <span>Submitting...</span>
                </>
              ) : (
                <span>{mySub ? 'Replace Submission →' : 'Submit Solution →'}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
