import { useState, useEffect } from 'react';
import { TrackingService } from '@/services/tracking.service';
import type {
  IStudentAttendanceTracking,
  IStudentResultsAndProgress,
} from '@/types/academic.types';

interface StudentTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'overview' | 'subjects' | 'attendance';
}

export function StudentTrackingModal({
  isOpen,
  onClose,
  defaultTab = 'overview',
}: StudentTrackingModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'attendance'>(defaultTab);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resultsData, setResultsData] = useState<IStudentResultsAndProgress | null>(null);
  const [attendanceData, setAttendanceData] = useState<IStudentAttendanceTracking | null>(null);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTrackingData();
    }
  }, [isOpen]);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [resultsRes, attendanceRes] = await Promise.all([
        TrackingService.getStudentResultsAndProgress(),
        TrackingService.getStudentAttendanceTracking(),
      ]);

      setResultsData(resultsRes);
      setAttendanceData(attendanceRes);

      if (resultsRes.subjectWisePerformance && resultsRes.subjectWisePerformance.length > 0) {
        setSelectedSubjectId(resultsRes.subjectWisePerformance[0]?.subjectId ?? null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load tracking data.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentSubject = resultsData?.subjectWisePerformance?.find(
    (s) => s.subjectId === selectedSubjectId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="flex flex-col h-[90vh] w-full max-w-5xl rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary dark:text-accent-foreground text-xl border border-primary-border">
              📊
            </span>
            <div>
              <h2 className="text-base font-bold text-card-foreground">Academic Tracking & Performance Analytics</h2>
              <p className="text-xs text-muted-foreground">
                {resultsData?.semesterInfo
                  ? `Semester ${resultsData.semesterInfo.semesterNumber} (${resultsData.semesterInfo.academicYear}) • Real-time DB Aggregations`
                  : 'Continuous assessment tracking, attendance, and evaluation records'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Top Navigation Tabs */}
            <div className="flex rounded-xl bg-muted border border-border p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-card text-card-foreground shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Overall & Assessments
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('subjects')}
                className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                  activeTab === 'subjects'
                    ? 'bg-card text-card-foreground shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Subject-Wise Marks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                  activeTab === 'attendance'
                    ? 'bg-card text-card-foreground shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Attendance Tracking
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-border bg-muted p-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-xs text-muted">
              Loading verified academic performance & attendance records...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-center text-xs text-rose-700 dark:text-rose-300 font-medium">
              ⚠️ {error}
            </div>
          ) : !resultsData?.hasActiveEnrollment ? (
            <div className="py-16 text-center text-xs text-muted border border-dashed border-line rounded-2xl">
              No active approved semester enrollment found. Please register for the current semester.
            </div>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════════ */}
              {/* TAB 1: OVERALL & ASSESSMENTS */}
              {/* ═══════════════════════════════════════════════════════════ */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Semester KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-line bg-surface/30 p-4">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted">Current GPA</p>
                      <p className="mt-1 text-2xl font-extrabold text-indigo-400">
                        {resultsData.overallSemesterPerformance?.gpa.toFixed(1)} / 10
                      </p>
                      <p className="text-[11px] text-muted mt-1">Cumulative CGPA: {resultsData.overallSemesterPerformance?.cgpa.toFixed(1)}</p>
                    </div>

                    <div className="rounded-2xl border border-line bg-surface/30 p-4">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted">Average Percentage</p>
                      <p className="mt-1 text-2xl font-extrabold text-emerald-400">
                        {resultsData.overallSemesterPerformance?.overallAveragePercentage}%
                      </p>
                      <p className="text-[11px] text-muted mt-1">Continuous Internal Evaluation</p>
                    </div>

                    <div className="rounded-2xl border border-line bg-surface/30 p-4">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted">Credits Earned</p>
                      <p className="mt-1 text-2xl font-extrabold text-teal-400">
                        {resultsData.overallSemesterPerformance?.totalCreditsEarned} / {resultsData.overallSemesterPerformance?.totalCreditsRegistered}
                      </p>
                      <p className="text-[11px] text-muted mt-1">Registered Courses</p>
                    </div>

                    <div className="rounded-2xl border border-line bg-surface/30 p-4">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted">Attendance Rate</p>
                      <p
                        className={`mt-1 text-2xl font-extrabold ${
                          (attendanceData?.totalAttendance.percentage ?? 100) >= 75
                            ? 'text-teal-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {attendanceData?.totalAttendance.percentage}%
                      </p>
                      <p className="text-[11px] text-muted mt-1">
                        {attendanceData?.totalAttendance.present} of {attendanceData?.totalAttendance.totalSessions} sessions
                      </p>
                    </div>
                  </div>

                  {/* Progress Analytics: Assessment Completion Bar */}
                  <div className="rounded-2xl border border-line bg-surface/40 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Assessment Completion Progress</h3>
                        <p className="text-sm font-bold text-ink mt-0.5">
                          {resultsData.assessmentsSummary?.completedCount} completed • {resultsData.assessmentsSummary?.pendingCount} pending
                        </p>
                      </div>
                      <span className="font-mono text-lg font-extrabold text-indigo-400">
                        {resultsData.assessmentsSummary?.completionRate}%
                      </span>
                    </div>

                    <div className="h-3 w-full rounded-full bg-surface overflow-hidden border border-line">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${resultsData.assessmentsSummary?.completionRate || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Two Column Grid: Pending Assessments vs Completed Assessments */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pending Assessments */}
                    <div className="rounded-2xl border border-line bg-surface/20 p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-line pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 text-sm">⏳</span>
                          <h4 className="text-sm font-bold text-ink">Pending Assessments</h4>
                        </div>
                        <span className="rounded-full bg-amber-500/10 text-amber-400 px-2 py-0.5 text-xs font-bold border border-amber-500/20">
                          {resultsData.assessmentsSummary?.pendingCount} Remaining
                        </span>
                      </div>

                      {resultsData.assessmentsSummary?.pendingCount === 0 ? (
                        <p className="text-xs text-muted py-6 text-center">
                          🎉 All available quizzes and assignments have been completed!
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {/* Pending Quizzes */}
                          {resultsData.assessmentsSummary?.pending.quizzes.map((q) => (
                            <div
                              key={q.id}
                              className="rounded-xl border border-line bg-surface/50 p-3.5 flex items-center justify-between"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-indigo-500/10 text-indigo-400 px-1.5 py-0.2 text-[10px] font-bold border border-indigo-500/20">
                                    QUIZ
                                  </span>
                                  <span className="font-mono text-[10px] text-muted">{q.subjectCode}</span>
                                </div>
                                <h5 className="text-xs font-bold text-ink mt-1">{q.title}</h5>
                                <p className="text-[11px] text-muted">
                                  {q.durationMinutes} mins • Total {q.totalMarks} pts
                                  {q.deadline && ` • Due ${new Date(q.deadline).toLocaleDateString()}`}
                                </p>
                              </div>
                            </div>
                          ))}

                          {/* Pending Assignments */}
                          {resultsData.assessmentsSummary?.pending.assignments.map((a) => (
                            <div
                              key={a.id}
                              className="rounded-xl border border-line bg-surface/50 p-3.5 flex items-center justify-between"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-violet-500/10 text-violet-400 px-1.5 py-0.2 text-[10px] font-bold border border-violet-500/20">
                                    ASSIGNMENT
                                  </span>
                                  <span className="font-mono text-[10px] text-muted">{a.subjectCode}</span>
                                </div>
                                <h5 className="text-xs font-bold text-ink mt-1">{a.title}</h5>
                                <p className="text-[11px] text-muted">
                                  Max {a.totalMarks} pts
                                  {a.deadline && ` • Due ${new Date(a.deadline).toLocaleDateString()}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Completed Assessments */}
                    <div className="rounded-2xl border border-line bg-surface/20 p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-line pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 text-sm">✅</span>
                          <h4 className="text-sm font-bold text-ink">Completed Assessments</h4>
                        </div>
                        <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-xs font-bold border border-emerald-500/20">
                          {resultsData.assessmentsSummary?.completedCount} Finished
                        </span>
                      </div>

                      {resultsData.assessmentsSummary?.completedCount === 0 ? (
                        <p className="text-xs text-muted py-6 text-center">
                          No assessment submissions recorded yet.
                        </p>
                      ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                          {resultsData.assessmentsSummary?.completed.quizzes.map((q, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-line bg-surface/30 p-3 flex items-center justify-between"
                            >
                              <div>
                                <span className="rounded bg-indigo-500/10 text-indigo-400 px-1.5 py-0.2 text-[10px] font-bold border border-indigo-500/20">
                                  QUIZ ATTEMPT
                                </span>
                                <p className="text-[11px] text-muted mt-1 font-mono">
                                  Submitted {new Date(q.date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold text-emerald-400">
                                  {q.score} / {q.maxMarks}
                                </span>
                                <p className="text-[10px] text-muted">{q.percentage}%</p>
                              </div>
                            </div>
                          ))}

                          {resultsData.assessmentsSummary?.completed.assignments.map((a, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-line bg-surface/30 p-3 flex items-center justify-between"
                            >
                              <div>
                                <span className="rounded bg-violet-500/10 text-violet-400 px-1.5 py-0.2 text-[10px] font-bold border border-violet-500/20">
                                  ASSIGNMENT
                                </span>
                                <p className="text-[11px] text-muted mt-1 font-mono">
                                  Submitted {new Date(a.submittedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                                    a.isGraded
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}
                                >
                                  {a.isGraded ? 'Graded' : 'Under Review'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════ */}
              {/* TAB 2: SUBJECT-WISE MARKS */}
              {/* ═══════════════════════════════════════════════════════════ */}
              {activeTab === 'subjects' && (
                <div className="space-y-6">
                  {/* Subject Selector Pills */}
                  <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
                    {resultsData.subjectWisePerformance?.map((sub) => {
                      const isSelected = sub.subjectId === selectedSubjectId;
                      return (
                        <button
                          key={sub.subjectId}
                          type="button"
                          onClick={() => setSelectedSubjectId(sub.subjectId)}
                          className={`rounded-2xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                              : 'bg-surface text-muted border-line hover:text-ink hover:bg-surface/80'
                          }`}
                        >
                          <span className="font-mono">{sub.subjectCode}</span>
                          <span className="ml-1.5 opacity-80">• {sub.subjectPercentage}%</span>
                        </button>
                      );
                    })}
                  </div>

                  {currentSubject && (
                    <div className="space-y-6">
                      {/* Subject Metric Card */}
                      <div className="rounded-3xl border border-line bg-surface/30 p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                                {currentSubject.subjectCode}
                              </span>
                              <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-muted border border-line">
                                {currentSubject.credits} Credits
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-ink mt-1">{currentSubject.subjectName}</h3>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-[10px] uppercase font-bold text-muted">Continuous Assessment</p>
                              <p className="text-2xl font-extrabold text-ink">
                                {currentSubject.totalInternalMarks} <span className="text-sm text-muted">/ 40</span>
                              </p>
                            </div>
                            <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-2 text-center">
                              <p className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">Grade</p>
                              <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{currentSubject.letterGrade}</p>
                            </div>
                          </div>
                        </div>

                        {/* Three Pillars: Quiz Average, Assignment Average, Attendance Rate */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="rounded-2xl border border-line bg-surface/40 p-4">
                            <p className="text-xs text-muted font-semibold uppercase">Quiz Marks Avg</p>
                            <p className="text-xl font-extrabold text-indigo-400 mt-1">
                              {currentSubject.quizzes.averagePercentage}%
                            </p>
                            <p className="text-[11px] text-muted mt-0.5">
                              {currentSubject.quizzes.attempted} of {currentSubject.quizzes.totalAvailable} quizzes taken
                            </p>
                          </div>

                          <div className="rounded-2xl border border-line bg-surface/40 p-4">
                            <p className="text-xs text-muted font-semibold uppercase">Assignment Marks Avg</p>
                            <p className="text-xl font-extrabold text-violet-400 mt-1">
                              {currentSubject.assignments.averagePercentage}%
                            </p>
                            <p className="text-[11px] text-muted mt-0.5">
                              {currentSubject.assignments.graded} of {currentSubject.assignments.totalAvailable} graded
                            </p>
                          </div>

                          <div className="rounded-2xl border border-line bg-surface/40 p-4">
                            <p className="text-xs text-muted font-semibold uppercase">Attendance Rate</p>
                            <p
                              className={`text-xl font-extrabold mt-1 ${
                                currentSubject.attendance.percentage >= 75 ? 'text-teal-400' : 'text-rose-400'
                              }`}
                            >
                              {currentSubject.attendance.percentage}%
                            </p>
                            <p className="text-[11px] text-muted mt-0.5">
                              {currentSubject.attendance.present} present, {currentSubject.attendance.absent} absent
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Quizzes Table */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                          Quiz Marks Breakdown ({currentSubject.quizzes.items.length})
                        </h4>

                        {currentSubject.quizzes.items.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted border border-dashed border-line rounded-2xl">
                            No quiz attempts recorded yet for this subject.
                          </div>
                        ) : (
                          <div className="border border-line rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-surface/50 border-b border-line text-[10px] uppercase font-bold text-muted">
                                <tr>
                                  <th className="py-2.5 px-3">Quiz Title</th>
                                  <th className="py-2.5 px-3">Date</th>
                                  <th className="py-2.5 px-3">Score</th>
                                  <th className="py-2.5 px-3">Percentage</th>
                                  <th className="py-2.5 px-3">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-line/40">
                                {currentSubject.quizzes.items.map((q, idx) => (
                                  <tr key={idx} className="hover:bg-surface/30">
                                    <td className="py-3 px-3 font-semibold text-ink">{q.title}</td>
                                    <td className="py-3 px-3 text-muted font-mono">{new Date(q.date).toLocaleDateString()}</td>
                                    <td className="py-3 px-3 font-bold text-ink">
                                      {q.score} / {q.totalMarks}
                                    </td>
                                    <td className="py-3 px-3 font-mono font-bold text-indigo-400">{q.percentage}%</td>
                                    <td className="py-3 px-3">
                                      <span
                                        className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                                          q.passed
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        }`}
                                      >
                                        {q.passed ? 'PASSED' : 'FAILED'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Detailed Assignments Table */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                          Assignment Marks Breakdown ({currentSubject.assignments.items.length})
                        </h4>

                        {currentSubject.assignments.items.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted border border-dashed border-line rounded-2xl">
                            No graded assignments yet for this subject.
                          </div>
                        ) : (
                          <div className="border border-line rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-surface/50 border-b border-line text-[10px] uppercase font-bold text-muted">
                                <tr>
                                  <th className="py-2.5 px-3">Assignment Title</th>
                                  <th className="py-2.5 px-3">Marks Obtained</th>
                                  <th className="py-2.5 px-3">Percentage</th>
                                  <th className="py-2.5 px-3">Feedback</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-line/40">
                                {currentSubject.assignments.items.map((a, idx) => (
                                  <tr key={idx} className="hover:bg-surface/30">
                                    <td className="py-3 px-3 font-semibold text-ink">{a.title}</td>
                                    <td className="py-3 px-3 font-bold text-ink">
                                      {a.marksObtained} / {a.maxMarks}
                                    </td>
                                    <td className="py-3 px-3 font-mono font-bold text-violet-400">{a.percentage}%</td>
                                    <td className="py-3 px-3 text-muted text-[11px] max-w-xs truncate">
                                      {a.feedback || 'Teacher evaluation completed'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════ */}
              {/* TAB 3: ATTENDANCE TRACKING */}
              {/* ═══════════════════════════════════════════════════════════ */}
              {activeTab === 'attendance' && (
                <div className="space-y-6">
                  {/* Attendance Big KPI Card */}
                  {attendanceData?.totalAttendance && (
                    <div className="rounded-3xl border border-line bg-surface/30 p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
                        <div>
                          <p className="text-xs uppercase font-bold tracking-wider text-muted">Total Semester Attendance</p>
                          <h3 className="text-3xl font-extrabold text-ink mt-1">
                            {attendanceData.totalAttendance.percentage}%
                          </h3>
                          <p className="text-xs text-muted mt-1">
                            {attendanceData.totalAttendance.present} of {attendanceData.totalAttendance.totalSessions} classroom sessions attended
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div
                            className={`rounded-2xl border px-4 py-2 text-center ${
                              attendanceData.totalAttendance.status === 'ELIGIBLE'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            <p className="text-[10px] font-bold uppercase">Exam Status</p>
                            <p className="text-xs font-extrabold mt-0.5">
                              {attendanceData.totalAttendance.status === 'ELIGIBLE'
                                ? 'Eligible for End-Sem Exam'
                                : 'Attendance Shortage Warning (<75%)'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Counts breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="rounded-xl border border-line bg-surface/40 p-3 text-center">
                          <p className="text-[10px] font-bold uppercase text-muted">Present</p>
                          <p className="text-lg font-extrabold text-emerald-400 mt-1">
                            {attendanceData.totalAttendance.present}
                          </p>
                        </div>
                        <div className="rounded-xl border border-line bg-surface/40 p-3 text-center">
                          <p className="text-[10px] font-bold uppercase text-muted">Absent</p>
                          <p className="text-lg font-extrabold text-rose-400 mt-1">
                            {attendanceData.totalAttendance.absent}
                          </p>
                        </div>
                        <div className="rounded-xl border border-line bg-surface/40 p-3 text-center">
                          <p className="text-[10px] font-bold uppercase text-muted">Late</p>
                          <p className="text-lg font-extrabold text-amber-400 mt-1">
                            {attendanceData.totalAttendance.late}
                          </p>
                        </div>
                        <div className="rounded-xl border border-line bg-surface/40 p-3 text-center">
                          <p className="text-[10px] font-bold uppercase text-muted">Excused</p>
                          <p className="text-lg font-extrabold text-blue-400 mt-1">
                            {attendanceData.totalAttendance.excused}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subject-Wise Attendance Breakdown Table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                      Subject-Wise Attendance Breakdown
                    </h4>

                    {attendanceData?.subjectAttendance.length === 0 ? (
                      <p className="text-xs text-muted py-6 text-center border border-dashed border-line rounded-2xl">
                        No subject attendance recorded yet.
                      </p>
                    ) : (
                      <div className="border border-line rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface/50 border-b border-line text-[10px] uppercase font-bold text-muted">
                            <tr>
                              <th className="py-2.5 px-3">Subject</th>
                              <th className="py-2.5 px-3">Total</th>
                              <th className="py-2.5 px-3">Present</th>
                              <th className="py-2.5 px-3">Absent</th>
                              <th className="py-2.5 px-3">Late</th>
                              <th className="py-2.5 px-3">Excused</th>
                              <th className="py-2.5 px-3">Percentage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line/40">
                            {attendanceData?.subjectAttendance.map((sub) => (
                              <tr key={sub.subjectId} className="hover:bg-surface/30">
                                <td className="py-3 px-3">
                                  <span className="font-mono text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.2 rounded mr-1.5 border border-teal-500/20">
                                    {sub.subjectCode}
                                  </span>
                                  <span className="font-semibold text-ink">{sub.subjectName}</span>
                                </td>
                                <td className="py-3 px-3 font-mono">{sub.totalSessions}</td>
                                <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{sub.present}</td>
                                <td className="py-3 px-3 font-mono text-rose-400 font-bold">{sub.absent}</td>
                                <td className="py-3 px-3 font-mono text-amber-400">{sub.late}</td>
                                <td className="py-3 px-3 font-mono text-blue-400">{sub.excused}</td>
                                <td className="py-3 px-3 font-mono font-extrabold">
                                  <span className={sub.percentage >= 75 ? 'text-teal-400' : 'text-rose-400'}>
                                    {sub.percentage}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Semester-Wise Attendance History */}
                  {attendanceData?.semesterOverallAttendance && attendanceData.semesterOverallAttendance.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                        Semester-Wise Overall Attendance
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {attendanceData.semesterOverallAttendance.map((sem, idx) => (
                          <div key={idx} className="rounded-2xl border border-line bg-surface/30 p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-ink">Semester {sem.semesterNumber}</span>
                              <span className="font-mono text-[10px] text-muted">{sem.academicYear}</span>
                            </div>
                            <p className="mt-2 text-2xl font-extrabold text-teal-400">{sem.percentage}%</p>
                            <p className="text-[11px] text-muted mt-1">
                              {sem.present} / {sem.totalSessions} sessions attended
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Attendance Session Logs */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                      Recent Attendance Activity Log
                    </h4>

                    {attendanceData?.recentLogs.length === 0 ? (
                      <p className="text-xs text-muted py-6 text-center border border-dashed border-line rounded-2xl">
                        No recent activity logs.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {attendanceData?.recentLogs.map((log) => (
                          <div
                            key={log.recordId}
                            className="rounded-xl border border-line bg-surface/30 p-3 flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono font-bold text-teal-400">
                                  {new Date(log.date).toLocaleDateString()}
                                </span>
                                <span className="text-muted font-mono">• Period {log.period}</span>
                                {log.timeSlot && <span className="text-muted font-mono">• {log.timeSlot}</span>}
                                <span className="font-semibold text-ink">
                                  {log.subjectCode} - {log.subjectName}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted mt-0.5">{log.topicCovered || 'Classroom Lecture'}</p>
                              {log.remarks && <p className="text-[10px] text-muted italic">Note: {log.remarks}</p>}
                            </div>

                            <span
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${
                                log.status === 'PRESENT' || log.status === 'OD'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : log.status === 'ABSENT'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : log.status === 'LATE'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
