import React, { useState, useEffect } from 'react';
import { assignmentService } from '@/services/assignment.service';
import { FileService } from '@/services/file.service';
import type {
  IAssignmentSubmissionItem,
  IAssignmentItem,
  IGradeSubmissionPayload,
  IAIEvaluationResult,
} from '@/types/academic.types';

interface AssignmentGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: IAssignmentSubmissionItem | null;
  assignment: IAssignmentItem | null;
  onGraded: (updatedSubmission: IAssignmentSubmissionItem) => void;
}

export const AssignmentGradingModal: React.FC<AssignmentGradingModalProps> = ({
  isOpen,
  onClose,
  submission,
  assignment,
  onGraded,
}) => {
  const [isRunningAi, setIsRunningAi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI Evaluation local state
  const [aiResult, setAiResult] = useState<IAIEvaluationResult | undefined>(
    submission?.aiEvaluation
  );

  // Official Teacher Grade Form State
  const [marksObtained, setMarksObtained] = useState<number>(
    submission?.grade?.marksObtained ?? (submission?.aiEvaluation?.suggestedScore || 0)
  );
  const [feedback, setFeedback] = useState<string>(
    submission?.grade?.feedback ?? (submission?.aiEvaluation?.summaryExplanation || '')
  );
  const [rubricScores, setRubricScores] = useState<Record<string, number>>(
    submission?.grade?.rubricScores || {}
  );
  const [teacherDecision, setTeacherDecision] = useState<'MANUAL' | 'ACCEPTED_AI' | 'MODIFIED_AI' | 'REJECTED_AI'>(
    submission?.grade?.teacherDecision || (submission?.aiEvaluation ? 'ACCEPTED_AI' : 'MANUAL')
  );

  useEffect(() => {
    if (submission) {
      setAiResult(submission.aiEvaluation);
      if (submission.grade) {
        setMarksObtained(submission.grade.marksObtained);
        setFeedback(submission.grade.feedback || '');
        setRubricScores(submission.grade.rubricScores || {});
        setTeacherDecision(submission.grade.teacherDecision || 'MANUAL');
      } else if (submission.aiEvaluation) {
        setMarksObtained(submission.aiEvaluation.suggestedScore);
        setFeedback(submission.aiEvaluation.summaryExplanation);
        const map: Record<string, number> = {};
        submission.aiEvaluation.criterionFeedback.forEach((c) => {
          map[c.criterionId] = c.score;
        });
        setRubricScores(map);
        setTeacherDecision('ACCEPTED_AI');
      } else {
        setMarksObtained(0);
        setFeedback('');
        setRubricScores({});
        setTeacherDecision('MANUAL');
      }
    }
  }, [submission]);

  if (!isOpen || !submission || !assignment) return null;

  const maxMarks = assignment.maxMarks || 100;

  // Run AI evaluation on this submission
  const handleRunAiEvaluation = async () => {
    setIsRunningAi(true);
    setErrorMsg(null);
    try {
      const updatedSub = await assignmentService.runAiEvaluation(submission._id);
      if (updatedSub.aiEvaluation) {
        setAiResult(updatedSub.aiEvaluation);
        // Pre-fill fields with AI recommendation
        setMarksObtained(updatedSub.aiEvaluation.suggestedScore);
        setFeedback(updatedSub.aiEvaluation.summaryExplanation);
        const map: Record<string, number> = {};
        updatedSub.aiEvaluation.criterionFeedback.forEach((c) => {
          map[c.criterionId] = c.score;
        });
        setRubricScores(map);
        setTeacherDecision('ACCEPTED_AI');
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to run AI evaluation.');
    } finally {
      setIsRunningAi(false);
    }
  };

  // Accept AI suggestion: sets decision to ACCEPTED_AI
  const handleAcceptAi = () => {
    if (!aiResult) return;
    setMarksObtained(aiResult.suggestedScore);
    setFeedback(aiResult.summaryExplanation);
    const map: Record<string, number> = {};
    aiResult.criterionFeedback.forEach((c) => {
      map[c.criterionId] = c.score;
    });
    setRubricScores(map);
    setTeacherDecision('ACCEPTED_AI');
  };

  // Edit AI suggestion: sets decision to MODIFIED_AI
  const handleEditAi = () => {
    if (!aiResult) return;
    setTeacherDecision('MODIFIED_AI');
  };

  // Reject AI suggestion: clears AI suggestion influence, sets decision to REJECTED_AI
  const handleRejectAi = () => {
    setTeacherDecision('REJECTED_AI');
    setMarksObtained(0);
    setFeedback('');
    setRubricScores({});
  };

  // Submit Official Teacher Grade
  const handleSubmitOfficialGrade = async () => {
    if (marksObtained < 0 || marksObtained > maxMarks) {
      setErrorMsg(`Marks obtained must be between 0 and ${maxMarks}.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    // Build criterion feedback array from rubric
    const criterionFeedback = (assignment.rubricCriteria || []).map((crit) => ({
      criterionId: crit.id,
      title: crit.title,
      score: rubricScores[crit.id] ?? Math.round((marksObtained * crit.maxMarks) / maxMarks),
      maxMarks: crit.maxMarks,
      feedback: `Evaluated by instructor under ${crit.title}`,
    }));

    const payload: IGradeSubmissionPayload = {
      submissionId: submission._id,
      marksObtained,
      maxMarks,
      feedback: feedback.trim(),
      rubricScores,
      criterionFeedback,
      lateDeductionApplied: submission.isLate
        ? Math.round((maxMarks * (assignment.latePenaltyPercent || 10)) / 100)
        : 0,
      teacherDecision,
    };

    try {
      const grade = await assignmentService.gradeSubmission(payload);
      onGraded({
        ...submission,
        isGraded: true,
        status: 'GRADED',
        grade,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to submit official grade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRubricScoreChange = (critId: string, val: number) => {
    setRubricScores((prev) => {
      const updated = { ...prev, [critId]: val };
      // Also update total score automatically
      const newTotal = Object.values(updated).reduce((sum, s) => sum + (Number(s) || 0), 0);
      setMarksObtained(Math.min(maxMarks, newTotal));
      return updated;
    });
    if (teacherDecision === 'ACCEPTED_AI') {
      setTeacherDecision('MODIFIED_AI');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface/80 backdrop-blur">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚖️</span>
              <h2 className="text-base font-bold text-ink">Student Submission Evaluation</h2>
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold ${
                  submission.isGraded
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {submission.isGraded ? 'OFFICIALLY GRADED' : 'PENDING EVALUATION'}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Assignment: <span className="font-semibold text-ink">{assignment.title}</span> • Max {maxMarks} Marks
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface/80 hover:text-ink cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center justify-between">
              <span>⚠️ {errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {/* Student Profile Card */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-line bg-surface/30 p-4 gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow">
                {submission.student?.name?.charAt(0) || 'S'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink">{submission.student?.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs text-indigo-400">{submission.student?.identifier}</span>
                  {submission.student?.email && (
                    <span className="text-xs text-muted">• {submission.student.email}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-muted">Submitted At</p>
                <p className="font-mono text-xs font-bold text-ink">
                  {new Date(submission.submittedAt).toLocaleString()}
                </p>
              </div>
              {submission.isLate && (
                <span className="rounded bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-400 border border-rose-500/20">
                  ⚠️ LATE ({assignment.latePenaltyPercent || 10}% penalty policy)
                </span>
              )}
            </div>
          </div>

          {/* Student Submission Content */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 tracking-wider uppercase">
              1. Student Submitted Work
            </h3>

            {/* Written response */}
            {submission.submissionText ? (
              <div className="rounded-xl border border-line bg-surface/40 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-line/40 pb-2">
                  <span className="text-xs font-bold text-ink">Written / Code Response</span>
                  <span className="text-[10px] font-mono text-muted">
                    {submission.submissionText.length} characters
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto font-mono text-xs text-ink/90 whitespace-pre-wrap leading-relaxed">
                  {submission.submissionText}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line p-3 text-center text-xs text-muted">
                No written text response submitted.
              </div>
            )}

            {/* Attached files */}
            {submission.submissionFiles && submission.submissionFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-ink">Uploaded Solution Files:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {submission.submissionFiles.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.url}
                      onClick={async (e) => {
                        if (file.url.includes('/files/') && file.url.includes('/download')) {
                          e.preventDefault();
                          const parts = file.url.split('/');
                          const fIdx = parts.indexOf('files');
                          const fileId = fIdx !== -1 ? parts[fIdx + 1] : null;
                          if (fileId) {
                            try {
                              await FileService.downloadFile(fileId, file.name);
                            } catch (err: any) {
                              alert(err?.response?.data?.message || err?.message || 'Download failed. Access denied.');
                            }
                          }
                        }
                      }}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-line bg-surface/50 p-3 text-xs hover:border-indigo-500/50 hover:bg-surface transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">📎</span>
                        <span className="font-semibold text-ink group-hover:text-indigo-400 truncate">
                          {file.name}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-indigo-400">Download ⬇</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Student Notes */}
            {submission.notes && (
              <div className="rounded-xl border border-line bg-surface/20 p-3">
                <p className="text-[10px] font-bold text-muted uppercase">Student Note:</p>
                <p className="text-xs text-ink italic mt-0.5">"{submission.notes}"</p>
              </div>
            )}
          </div>

          {/* AI-Assisted Evaluation Panel */}
          <div className="space-y-4 pt-4 border-t border-line">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <div>
                  <h3 className="text-xs font-bold text-purple-400 tracking-wider uppercase">
                    2. AI-Assisted Checking & Recommendations
                  </h3>
                  <p className="text-[11px] text-muted">
                    Automated pre-evaluation against rubrics, keywords, and concept criteria.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isRunningAi}
                onClick={handleRunAiEvaluation}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:from-purple-500 hover:to-indigo-500 shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isRunningAi ? (
                  <>
                    <span className="animate-spin text-xs">🌀</span>
                    <span>Analyzing Submission...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>{aiResult ? 'Re-run AI Evaluation' : 'Run AI Evaluation'}</span>
                  </>
                )}
              </button>
            </div>

            {aiResult ? (
              <div className="space-y-4 rounded-2xl border border-purple-500/20 bg-purple-950/15 p-4">
                {/* AI Score Banner & Control Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-purple-500/20 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">AI Suggested Score:</span>
                      <span className="text-lg font-extrabold text-purple-700 dark:text-purple-300">
                        {aiResult.suggestedScore} / {maxMarks} Marks
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">{aiResult.summaryExplanation}</p>
                  </div>

                  {/* Teacher Decision Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAcceptAi}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        teacherDecision === 'ACCEPTED_AI'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                      }`}
                    >
                      ✓ Accept AI
                    </button>
                    <button
                      type="button"
                      onClick={handleEditAi}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        teacherDecision === 'MODIFIED_AI'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'
                      }`}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectAi}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        teacherDecision === 'REJECTED_AI'
                          ? 'bg-rose-600 text-white shadow'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                      }`}
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>

                {/* Criterion-Level Evaluation Cards */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-ink uppercase tracking-wider">
                    Criterion-Level AI Analysis:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {aiResult.criterionFeedback.map((crit, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-line bg-surface/50 p-3 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">{crit.title}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              crit.status === 'MET'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : crit.status === 'PARTIAL'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {crit.status} • {crit.score} / {crit.maxMarks}
                          </span>
                        </div>
                        <p className="text-muted text-[11px] leading-relaxed">{crit.feedback}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Concept and Keyword Check Flags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {aiResult.conceptCheckResults && aiResult.conceptCheckResults.length > 0 && (
                    <div className="rounded-xl border border-line/50 bg-surface/30 p-2.5 space-y-1">
                      <p className="text-[10px] font-bold text-muted uppercase">Concept Check:</p>
                      <div className="flex flex-wrap gap-1">
                        {aiResult.conceptCheckResults.map((c, i) => (
                          <span
                            key={i}
                            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                              c.found
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {c.found ? '✓' : '✗'} {c.concept}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiResult.keywordCheckResults && aiResult.keywordCheckResults.length > 0 && (
                    <div className="rounded-xl border border-line/50 bg-surface/30 p-2.5 space-y-1">
                      <p className="text-[10px] font-bold text-muted uppercase">Keyword Verification:</p>
                      <div className="flex flex-wrap gap-1">
                        {aiResult.keywordCheckResults.map((k, i) => (
                          <span
                            key={i}
                            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                              k.found
                                ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                                : 'bg-line text-muted'
                            }`}
                          >
                            {k.found ? '✓' : '–'} {k.keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Numerical check */}
                {aiResult.numericalCheckResult && (
                  <div className="rounded-xl border border-line/50 bg-surface/30 p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-ink">Numerical Accuracy: </span>
                      <span className="text-muted">
                        Expected {aiResult.numericalCheckResult.expected}, submitted{' '}
                        {aiResult.numericalCheckResult.submitted}
                      </span>
                    </div>
                    <span
                      className={`font-bold ${
                        aiResult.numericalCheckResult.isWithinTolerance
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {aiResult.numericalCheckResult.isWithinTolerance
                        ? '✓ Within Tolerance'
                        : '✗ Tolerance Exceeded'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-muted">
                AI evaluation not yet run for this submission. Click "Run AI Evaluation" above to generate recommendations.
              </div>
            )}
          </div>

          {/* Section 3: Official Teacher Grade & Feedback */}
          <div className="space-y-4 pt-4 border-t border-line">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-indigo-400 tracking-wider uppercase">
                  3. Official Instructor Grade & Feedback
                </h3>
                <p className="text-[11px] text-muted">
                  The values below become the official recorded grade published to the student.
                </p>
              </div>

              <span className="rounded bg-surface/50 border border-line px-2.5 py-1 text-xs font-mono font-bold text-ink">
                Status: {teacherDecision}
              </span>
            </div>

            {/* Rubric Criteria Score Breakdown */}
            {assignment.rubricCriteria && assignment.rubricCriteria.length > 0 && (
              <div className="space-y-2 rounded-xl border border-line bg-surface/30 p-3">
                <p className="text-xs font-bold text-ink">Rubric Score Breakdown:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignment.rubricCriteria.map((crit) => (
                    <div
                      key={crit.id}
                      className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-xs"
                    >
                      <div>
                        <p className="font-bold text-ink">{crit.title}</p>
                        <p className="text-[10px] text-muted">Max {crit.maxMarks} pts</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={crit.maxMarks}
                          value={rubricScores[crit.id] ?? ''}
                          onChange={(e) => handleRubricScoreChange(crit.id, Number(e.target.value))}
                          className="w-16 rounded-lg border border-line bg-surface/80 px-2 py-1 text-xs font-bold text-emerald-400 text-center focus:outline-none"
                        />
                        <span className="text-muted">/ {crit.maxMarks}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Marks & Feedback */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-ink mb-1 block">
                  Official Total Marks <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={maxMarks}
                    value={marksObtained}
                    onChange={(e) => {
                      setMarksObtained(Number(e.target.value));
                      if (teacherDecision === 'ACCEPTED_AI') setTeacherDecision('MODIFIED_AI');
                    }}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-base font-extrabold text-emerald-400 focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="font-mono text-sm text-muted">/ {maxMarks}</span>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-bold text-ink mb-1 block">
                  Official Feedback to Student
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => {
                    setFeedback(e.target.value);
                    if (teacherDecision === 'ACCEPTED_AI') setTeacherDecision('MODIFIED_AI');
                  }}
                  rows={3}
                  placeholder="Provide constructive feedback, notes on methodology, or remarks on submission quality..."
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4 bg-surface/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-xs">🛡️</span>
            <p className="text-[11px] text-muted">
              Never silently assign final grades: Official grade becomes permanent only after teacher authorization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-muted hover:text-ink cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitOfficialGrade}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-xs">🌀</span>
                  <span>Saving Grade...</span>
                </>
              ) : (
                <span>Confirm & Publish Official Grade ✓</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
