import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  ShieldAlert,
  Clock,
  Wifi,
  WifiOff,
  Maximize2,
  MinimizeIcon,
  Send,
  Eye,
  EyeOff,
  Timer,
  ArrowLeft,
} from 'lucide-react';
import { QuizService } from '@/services/quiz.service';
import type { IQuizAnalyticsData, IQuizItem } from '@/types/academic.types';

interface QuizAnalyticsModalProps {
  quiz: IQuizItem;
  isOpen: boolean;
  onClose: () => void;
}

export const QuizAnalyticsModal: React.FC<QuizAnalyticsModalProps> = ({
  quiz,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<IQuizAnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'students' | 'integrity'>('overview');
  const [integrityStudent, setIntegrityStudent] = useState<any | null>(null);
  
  // Subjective grading state
  const [gradingAttempt, setGradingAttempt] = useState<any | null>(null);
  const [gradingReview, setGradingReview] = useState<any | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [awardedMarks, setAwardedMarks] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [submittingGrade, setSubmittingGrade] = useState<string | null>(null);
  const [gradingSuccess, setGradingSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && quiz._id) {
      loadAnalytics();
    }
  }, [isOpen, quiz._id]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await QuizService.getQuizAnalytics(quiz._id);
      setAnalytics(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load quiz analytics');
    } finally {
      setLoading(false);
    }
  };

  const openGradingModal = async (attempt: any) => {
    setGradingAttempt(attempt);
    setLoadingReview(true);
    try {
      const review = await QuizService.getQuizAttemptReview(attempt._id);
      setGradingReview(review);
      // Pre-fill existing grades
      const currentMarks: Record<string, number> = {};
      const currentFeedback: Record<string, string> = {};
      if (review.attempt.answers) {
        review.attempt.answers.forEach((ans: any) => {
          if (ans.marksAwarded !== undefined && ans.marksAwarded !== null) {
            currentMarks[ans.questionId] = ans.marksAwarded;
          }
          if (ans.teacherFeedback) {
            currentFeedback[ans.questionId] = ans.teacherFeedback;
          }
        });
      }
      setAwardedMarks(currentMarks);
      setFeedback(currentFeedback);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to load attempt review');
      setGradingAttempt(null);
    } finally {
      setLoadingReview(false);
    }
  };

  const handleSaveSubjectiveGrade = async (questionId: string) => {
    if (!gradingAttempt) return;
    try {
      setSubmittingGrade(questionId);
      const marks = awardedMarks[questionId] || 0;
      const fb = feedback[questionId] || '';
      await QuizService.gradeSubjectiveAnswer(gradingAttempt._id, questionId, marks, fb);
      setGradingSuccess(`Graded Question successfully`);
      setTimeout(() => setGradingSuccess(null), 3000);
      // Refresh analytics in background
      loadAnalytics();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save subjective grade');
    } finally {
      setSubmittingGrade(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-border">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-muted/40 border-b border-border text-foreground flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-soft text-primary rounded-lg">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{quiz.title}</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary-soft text-primary border border-primary-border">
                  {quiz.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Curriculum Units: {quiz.curriculumUnits?.map(u => `Unit ${u}`).join(', ') || 'N/A'} • {quiz.difficultyLevel} Difficulty
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-muted/20 px-6 gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'overview'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Overview & Metrics
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'questions'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Question Breakdown ({quiz.questionsCount || quiz.questions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'students'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            Student Attempts ({analytics?.studentScores?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('integrity')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'integrity'
                ? 'border-rose-600 text-rose-600 font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Assessment Integrity
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">Computing assessment analytics...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : !analytics ? null : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Attempts</p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-foreground">{analytics.summary.totalAttempts}</span>
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Completed: {analytics.summary.completedAttempts}
                      </p>
                    </div>

                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average Score</p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-primary">
                          {analytics.summary.averageScore} / {analytics.quiz.totalMarks}
                        </span>
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {analytics.quiz.totalMarks > 0
                          ? Math.round((analytics.summary.averageScore / analytics.quiz.totalMarks) * 100)
                          : 0}% average accuracy
                      </p>
                    </div>

                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score Range</p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                          {analytics.summary.highestScore}
                        </span>
                        <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
                          Low: {analytics.summary.lowestScore}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Passing threshold: {analytics.quiz.passingScore}%
                      </p>
                    </div>

                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pass Rate</p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-foreground">{analytics.summary.passRate}%</span>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Avg duration: {Math.round(analytics.summary.averageTimeSpentSeconds / 60)} mins
                      </p>
                    </div>
                  </div>

                  {/* Settings Inspection Card */}
                  <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      Assessment Settings Configuration
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="text-muted-foreground block">Assessment Duration</span>
                        <span className="font-semibold text-foreground">{analytics.quiz.duration} Minutes</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="text-muted-foreground block">Fullscreen Proctored</span>
                        <span className="font-semibold text-foreground">
                          {analytics.quiz.fullscreenRequired ? 'Enforced' : 'Disabled'}
                        </span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="text-muted-foreground block">Negative Marking</span>
                        <span className="font-semibold text-foreground">
                          {analytics.quiz.negativeMarkingEnabled
                            ? `-${analytics.quiz.negativeMarksPerQuestion} per wrong`
                            : 'Disabled'}
                        </span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="text-muted-foreground block">Navigation Rule</span>
                        <span className="font-semibold text-foreground">
                          {analytics.quiz.navigationRule || 'FREE'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: QUESTIONS BREAKDOWN */}
              {activeTab === 'questions' && (
                <div className="space-y-4">
                  {analytics.questionStats.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No question statistics available yet.
                    </div>
                  ) : (
                    analytics.questionStats.map((qs, index) => (
                      <div
                        key={qs.questionId}
                        className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-muted text-foreground font-bold rounded text-xs border border-border">
                                Q{index + 1}
                              </span>
                              <span className="px-2 py-0.5 bg-primary-soft text-primary font-semibold rounded text-xs border border-primary-border">
                                {qs.type}
                              </span>
                              {qs.bloomsTaxonomy && (
                                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold rounded text-xs border border-purple-500/20">
                                  {qs.bloomsTaxonomy}
                                </span>
                              )}
                              {qs.difficulty && (
                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold rounded text-xs border border-amber-500/20">
                                  {qs.difficulty}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground font-medium">
                                ({qs.marks} marks)
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-foreground">{qs.title}</h4>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="text-lg font-black text-foreground">
                              {qs.successRate}%
                            </span>
                            <span className="text-xs text-muted-foreground block">success rate</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border border-border">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              qs.successRate >= 75
                                ? 'bg-emerald-500'
                                : qs.successRate >= 40
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${qs.successRate}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Total attempts on question: <strong className="text-foreground">{qs.totalAttempts}</strong>
                          </span>
                          <span>
                            Correct answers: <strong className="text-foreground">{qs.correctAttempts}</strong>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: STUDENTS ATTEMPTS & MANUAL GRADING */}
              {activeTab === 'students' && (
                <div className="space-y-4">
                  {analytics.studentScores.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No students have attempted this quiz yet.
                    </div>
                  ) : (
                    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
                          <tr>
                            <th className="px-4 py-3">Student</th>
                            <th className="px-4 py-3">Roll / ID</th>
                            <th className="px-4 py-3 text-center">Score</th>
                            <th className="px-4 py-3 text-center">Percentage</th>
                            <th className="px-4 py-3 text-center">Violations</th>
                            <th className="px-4 py-3 text-center">Time Spent</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-foreground">
                          {analytics.studentScores.map((st) => (
                            <tr key={st._id} className="hover:bg-muted/30 transition">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-foreground">{st.studentName}</div>
                                <div className="text-xs text-muted-foreground">{st.studentEmail}</div>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-foreground">
                                {st.studentIdentifier || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-foreground">
                                {st.score !== null ? st.score : 'Pending'} / {analytics.quiz.totalMarks}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {st.percentage !== null ? (
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                                      st.percentage >= (analytics.quiz.passingScore || 50)
                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                                    }`}
                                  >
                                    {st.percentage}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">Grading...</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {((st as any).fullscreenViolationsCount || 0) + ((st as any).tabSwitchCount || 0) > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 rounded" title={`Fullscreen: ${(st as any).fullscreenViolationsCount || 0}, Tab Switches: ${(st as any).tabSwitchCount || 0}`}>
                                    <AlertTriangle className="w-3 h-3" />
                                    {((st as any).fullscreenViolationsCount || 0) + ((st as any).tabSwitchCount || 0)}
                                    {(st as any).autoSubmitted && <span className="text-[9px] ml-0.5">⚡</span>}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-medium">0</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                                {Math.round((st.timeSpentSeconds || 0) / 60)}m {(st.timeSpentSeconds || 0) % 60}s
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                    st.status === 'GRADED'
                                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                      : st.status === 'SUBMITTED'
                                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                                      : 'bg-muted text-muted-foreground border border-border'
                                  }`}
                                >
                                  {st.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setIntegrityStudent(st);
                                      setActiveTab('integrity');
                                    }}
                                    className="px-2.5 py-1 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                                    title="View security audit log"
                                  >
                                    <ShieldAlert className="w-3 h-3" />
                                    Log
                                  </button>
                                  <button
                                    onClick={() => openGradingModal(st)}
                                    className="px-3 py-1 bg-primary-soft text-primary hover:bg-primary-soft/80 border border-primary-border text-xs font-semibold rounded-lg transition cursor-pointer"
                                  >
                                    Review & Grade
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ASSESSMENT INTEGRITY */}
              {activeTab === 'integrity' && (
                <div className="space-y-4">
                  {integrityStudent ? (
                    <IntegrityTimeline
                      student={integrityStudent}
                      onBack={() => setIntegrityStudent(null)}
                    />
                  ) : (
                    <IntegrityOverview
                      studentScores={analytics.studentScores}
                      onSelectStudent={(st: any) => setIntegrityStudent(st)}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-muted/40 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-sm font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Manual Subjective Grading Modal */}
      {gradingAttempt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-border">
            <div className="px-6 py-4 bg-muted/40 border-b border-border text-foreground flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground">
                  Assessment Review & Subjective Grading: {gradingAttempt.studentName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Roll: {gradingAttempt.studentIdentifier || 'N/A'} • Submitted at:{' '}
                  {new Date(gradingAttempt.submittedAt || Date.now()).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setGradingAttempt(null)}
                className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {gradingSuccess && (
              <div className="p-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 border-b border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {gradingSuccess}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingReview ? (
                <div className="py-16 text-center text-muted-foreground">Loading student submission...</div>
              ) : !gradingReview ? (
                <div className="py-16 text-center text-rose-600">Failed to load submission data.</div>
              ) : (
                gradingReview.questions.map((q: any, idx: number) => {
                  const studentAnsObj = gradingReview.attempt.answers?.find(
                    (a: any) => a.questionId === q._id
                  );
                  const isSubjective =
                    q.type === 'SHORT_ANSWER' || q.type === 'CASE_SCENARIO';

                  return (
                    <div
                      key={q._id}
                      className={`p-4 rounded-xl border ${
                        isSubjective
                          ? 'border-primary-border bg-primary-soft/30'
                          : 'border-border bg-card'
                      } space-y-3`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-muted text-foreground text-xs font-bold rounded border border-border">
                            Q{idx + 1}
                          </span>
                          <span className="px-2 py-0.5 bg-primary-soft text-primary text-xs font-semibold rounded border border-primary-border">
                            {q.type}
                          </span>
                          <span className="text-xs text-muted-foreground">Max marks: {q.marks}</span>
                        </div>
                        <div className="text-xs font-bold">
                          {studentAnsObj?.isGraded ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Score: {studentAnsObj.marksAwarded} / {q.marks}
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">Awaiting Grade</span>
                          )}
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-foreground">{q.title}</div>
                      {q.description && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{q.description}</p>
                      )}

                      {/* Student Submitted Answer */}
                      <div className="p-3 bg-muted/30 rounded-lg border border-border text-xs space-y-1">
                        <span className="font-semibold text-muted-foreground block uppercase tracking-wider text-[10px]">
                          Student Answer:
                        </span>
                        <div className="font-mono text-foreground whitespace-pre-wrap">
                          {studentAnsObj?.studentAnswer !== undefined && studentAnsObj?.studentAnswer !== null
                            ? typeof studentAnsObj.studentAnswer === 'object'
                              ? JSON.stringify(studentAnsObj.studentAnswer, null, 2)
                              : String(studentAnsObj.studentAnswer)
                            : '(No answer provided)'}
                        </div>
                      </div>

                      {/* Correct / Reference Answer if configured */}
                      {q.correctAnswer && (
                        <div className="p-2 bg-emerald-500/10 rounded border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
                          <span className="font-bold">Model Answer / Criteria: </span>
                          <span>{String(q.correctAnswer)}</span>
                        </div>
                      )}

                      {/* Teacher Grading Section */}
                      {isSubjective && (
                        <div className="mt-3 pt-3 border-t border-border space-y-3">
                          <div className="flex items-center gap-4">
                            <label className="text-xs font-bold text-foreground">
                              Award Marks (Max: {q.marks}):
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={q.marks}
                              step={0.5}
                              value={awardedMarks[q._id] ?? ''}
                              onChange={(e) =>
                                setAwardedMarks({
                                  ...awardedMarks,
                                  [q._id]: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-24 px-3 py-1.5 text-xs font-bold bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-foreground block mb-1">
                              Teacher Feedback:
                            </label>
                            <textarea
                              rows={2}
                              value={feedback[q._id] || ''}
                              onChange={(e) =>
                                setFeedback({
                                  ...feedback,
                                  [q._id]: e.target.value,
                                })
                              }
                              placeholder="Provide constructive feedback for student..."
                              className="w-full text-xs p-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary"
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              disabled={submittingGrade === q._id}
                              onClick={() => handleSaveSubjectiveGrade(q._id)}
                              className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
                            >
                              {submittingGrade === q._id ? 'Saving...' : 'Save Grade'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-6 py-3 bg-muted/40 border-t border-border flex justify-end">
              <button
                onClick={() => setGradingAttempt(null)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ASSESSMENT INTEGRITY SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string; severity: 'violation' | 'info' | 'action' }> = {
  ASSESSMENT_STARTED: { icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Assessment Started', severity: 'info' },
  FULLSCREEN_ENTERED: { icon: Maximize2, color: 'text-primary dark:text-accent-foreground', bg: 'bg-primary-soft border-primary-border', label: 'Fullscreen Entered', severity: 'info' },
  FULLSCREEN_EXIT: { icon: MinimizeIcon, color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', label: 'Fullscreen Exit', severity: 'violation' },
  TAB_SWITCH: { icon: EyeOff, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Tab Switch', severity: 'violation' },
  VISIBILITY_HIDDEN: { icon: Eye, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Window Focus Lost', severity: 'violation' },
  DISCONNECT: { icon: WifiOff, color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', label: 'Network Disconnected', severity: 'violation' },
  RECONNECT: { icon: Wifi, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Network Reconnected', severity: 'info' },
  SUBMISSION: { icon: Send, color: 'text-primary dark:text-accent-foreground', bg: 'bg-primary-soft border-primary-border', label: 'Assessment Submitted', severity: 'action' },
  TIMEOUT: { icon: Timer, color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', label: 'Timer Expired', severity: 'action' },
};

const getEventConfig = (eventType: string) =>
  EVENT_CONFIG[eventType] || { icon: AlertTriangle, color: 'text-foreground', bg: 'bg-muted border-border', label: eventType, severity: 'info' as const };

// ── Integrity Overview: Shows all students with violation summaries ──
const IntegrityOverview: React.FC<{
  studentScores: any[];
  onSelectStudent: (st: any) => void;
}> = ({ studentScores, onSelectStudent }) => {
  const flagged = studentScores.filter(
    (st) => ((st as any).fullscreenViolationsCount || 0) + ((st as any).tabSwitchCount || 0) > 0
  );
  const autoSubmitted = studentScores.filter((st) => (st as any).autoSubmitted);
  const clean = studentScores.filter(
    (st) => ((st as any).fullscreenViolationsCount || 0) + ((st as any).tabSwitchCount || 0) === 0
  );

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Students</p>
          <span className="text-2xl font-black text-foreground mt-1 block">{studentScores.length}</span>
        </div>
        <div className="bg-card p-4 rounded-xl border border-amber-500/30 shadow-sm">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Flagged (Violations)</p>
          <span className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 block">{flagged.length}</span>
        </div>
        <div className="bg-card p-4 rounded-xl border border-rose-500/30 shadow-sm">
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Auto-Submitted</p>
          <span className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1 block">{autoSubmitted.length}</span>
        </div>
      </div>

      {/* Flagged students first */}
      {flagged.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Students with Security Violations
          </h4>
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs uppercase tracking-wider font-semibold border-b border-rose-500/20">
                <tr>
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5 text-center">Fullscreen Exits</th>
                  <th className="px-4 py-2.5 text-center">Tab Switches</th>
                  <th className="px-4 py-2.5 text-center">Total</th>
                  <th className="px-4 py-2.5 text-center">Auto-Submitted</th>
                  <th className="px-4 py-2.5 text-right">Audit Trail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {flagged.map((st: any) => {
                  const fsCount = st.fullscreenViolationsCount || 0;
                  const tsCount = st.tabSwitchCount || 0;
                  const total = fsCount + tsCount;
                  return (
                    <tr key={st._id} className="hover:bg-rose-500/5 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground text-xs">{st.studentName}</div>
                        <div className="text-[11px] text-muted-foreground">{st.studentIdentifier || st.studentEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold ${fsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
                          {fsCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold ${tsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                          {tsCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-bold rounded border border-rose-500/20">
                          {total}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {st.autoSubmitted ? (
                          <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded">
                            ⚡ YES
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onSelectStudent(st)}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Clock className="w-3 h-3" />
                          View Timeline
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clean students */}
      {clean.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Clean Assessments (No Violations)
          </h4>
          <div className="bg-card rounded-xl border border-emerald-500/20 p-4">
            <div className="flex flex-wrap gap-2">
              {clean.map((st: any) => (
                <button
                  key={st._id}
                  onClick={() => onSelectStudent(st)}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/20 transition cursor-pointer"
                >
                  {st.studentName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Integrity Timeline: Chronological security event viewer ──
const IntegrityTimeline: React.FC<{
  student: any;
  onBack: () => void;
}> = ({ student, onBack }) => {
  const securityLogs: Array<{ eventType: string; timestamp: string; details?: string }> =
    (student as any).securityLogs || [];
  const fsCount = student.fullscreenViolationsCount || 0;
  const tsCount = (student as any).tabSwitchCount || 0;
  const totalViolations = fsCount + tsCount;

  const violationEvents = securityLogs.filter((log) => {
    const cfg = getEventConfig(log.eventType);
    return cfg.severity === 'violation';
  });

  return (
    <div className="space-y-4">
      {/* Student header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Overview
        </button>
      </div>

      <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">{student.studentName}</h3>
            <p className="text-xs text-muted-foreground">
              {student.studentIdentifier || student.studentEmail} • Attempt #{student.attemptNumber || 1}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(student as any).autoSubmitted && (
              <span className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1">
                ⚡ Auto-Submitted
              </span>
            )}
            <div className={`px-3 py-1 rounded-lg text-xs font-bold ${
              totalViolations === 0
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                : totalViolations >= 3
                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
            }`}>
              {totalViolations} violation{totalViolations !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Violation breakdown */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 bg-muted/30 rounded-lg text-center border border-border">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">Fullscreen Exits</span>
            <span className={`text-lg font-black ${fsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>{fsCount}</span>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center border border-border">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">Tab Switches</span>
            <span className={`text-lg font-black ${tsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>{tsCount}</span>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center border border-border">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">Total Events</span>
            <span className="text-lg font-black text-foreground">{securityLogs.length}</span>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center border border-border">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">Violations</span>
            <span className={`text-lg font-black ${violationEvents.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {violationEvents.length}
            </span>
          </div>
        </div>

        {(student as any).autoSubmitReason && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-700 dark:text-rose-300 font-medium">
            <strong>Auto-Submit Reason:</strong> {(student as any).autoSubmitReason}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-muted/40 border-b border-border text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-bold text-foreground">Security Event Timeline</h4>
          <span className="text-xs text-muted-foreground ml-auto">
            {securityLogs.length} events recorded
          </span>
        </div>

        {securityLogs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No security events recorded for this attempt.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {securityLogs.map((log, idx) => {
              const cfg = getEventConfig(log.eventType);
              const Icon = cfg.icon;
              const ts = new Date(log.timestamp);
              const timeStr = ts.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              });
              const dateStr = ts.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-4 px-5 py-3 ${
                    cfg.severity === 'violation' ? 'bg-rose-500/5' : ''
                  } hover:bg-muted/30 transition`}
                >
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center pt-0.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    {idx < securityLogs.length - 1 && (
                      <div className="w-px h-full min-h-[16px] bg-border mt-1" />
                    )}
                  </div>

                  {/* Event details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                      {cfg.severity === 'violation' && (
                        <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-[9px] font-bold rounded uppercase">
                          Violation
                        </span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{log.details}</p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-mono text-muted-foreground block">{timeStr}</span>
                    <span className="text-[10px] text-muted-foreground/70 block">{dateStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
