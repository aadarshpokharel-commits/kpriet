import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Maximize2,
  Send,
  Save,
  Award,
  BookOpen,
  RotateCcw,
  Menu,
} from 'lucide-react';
import { QuizService } from '@/services/quiz.service';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { IQuizAttemptSession } from '@/types/academic.types';

export const StudentQuizPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  // Session State
  const [session, setSession] = useState<IQuizAttemptSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inAssessmentMode, setInAssessmentMode] = useState(false);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);

  // Student Draft Answers & Navigation
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);

  // Autosave status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const autosaveTimeoutRef = useRef<any>(null);

  // Fullscreen and Proctoring State
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [maxWarnings, setMaxWarnings] = useState(3);

  // Post Submission Results
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [attemptReview, setAttemptReview] = useState<any | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [retaking, setRetaking] = useState(false);

  const handleRetakeQuiz = async () => {
    if (!quizId) return;
    try {
      setRetaking(true);
      setError(null);
      const res = await QuizService.retakeQuizAttempt(quizId);
      const newSession = ((res as any)?.data !== undefined ? (res as any).data : res) as IQuizAttemptSession;
      if (!newSession) {
        throw new Error('Failed to start a new assessment session.');
      }
      setSubmissionResult(null);
      setAttemptReview(null);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setTimeSpent(0);
      setSession(newSession);
      setTimeRemaining(newSession.timeRemainingSeconds);
      setViolationCount(0);
      setInAssessmentMode(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to retake quiz. Please try again.');
    } finally {
      setRetaking(false);
    }
  };

  // Timer interval ref & security refs
  const timerIntervalRef = useRef<any>(null);
  const gracePeriodUntilRef = useRef<number>(0);
  const wasInFullscreenRef = useRef<boolean>(false);
  const blurTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (quizId) {
      initQuiz();
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, [quizId]);

  const initQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!quizId) return;
      const res = await QuizService.startQuizAttempt(quizId);
      const data = ((res as any)?.data !== undefined ? (res as any).data : res) as IQuizAttemptSession;
      
      setSession(data);
      setTimeRemaining(data.timeRemainingSeconds);
      setTimeSpent(data.attempt.timeSpentSeconds || 0);
      setMaxWarnings(data.quiz.maxWarnings ?? 3);

      if (data.attempt.answersDraft) {
        setAnswers(data.attempt.answersDraft);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize assessment.');
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityViolation = (type: string, details?: string) => {
    if (!session || !inAssessmentMode) return;
    if (Date.now() < gracePeriodUntilRef.current) return;
    
    if (type === 'TAB_SWITCH' || type === 'WINDOW_BLUR' || type === 'VISIBILITY_HIDDEN') {
      setTabSwitchCount((prev) => prev + 1);
    } else {
      setViolationCount((prev) => prev + 1);
    }
    
    setFullscreenWarning(true);

    QuizService.recordSecurityViolation(
      session.attempt._id,
      type,
      details || `Security event: ${type} at ${new Date().toISOString()}`
    ).catch(() => {});
  };

  // Assessment Proctoring Listeners
  useEffect(() => {
    if (!inAssessmentMode) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      if (isCurrentlyFullscreen) {
        wasInFullscreenRef.current = true;
      } else if (wasInFullscreenRef.current && session?.quiz.fullscreenRequired) {
        if (Date.now() >= gracePeriodUntilRef.current) {
          handleSecurityViolation('FULLSCREEN_EXIT', 'Student exited fullscreen proctored mode');
        }
      }
    };

    const handleVisibilityChange = () => {
      if (Date.now() < gracePeriodUntilRef.current) return;
      if (document.hidden && session?.quiz.tabSwitchDetection) {
        handleSecurityViolation('VISIBILITY_HIDDEN', 'Student switched browser tab or minimized window');
      }
    };

    const handleWindowBlur = () => {
      if (Date.now() < gracePeriodUntilRef.current) return;
      if (session?.quiz.tabSwitchDetection) {
        if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = setTimeout(() => {
          if (document.hidden || !document.hasFocus()) {
            if (Date.now() >= gracePeriodUntilRef.current) {
              handleSecurityViolation('WINDOW_BLUR', 'Window focus lost to external application');
            }
          }
        }, 1000);
      }
    };

    const handleWindowFocus = () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Assessment in progress. Leaving will count as a security violation.';
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [inAssessmentMode, session]);

  // Main Assessment Timer Loop
  useEffect(() => {
    if (!inAssessmentMode) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });

      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [inAssessmentMode]);

  // Debounced Autosave Trigger
  const triggerAutosave = (newAnswers: Record<string, any>) => {
    if (!session) return;
    setSaveStatus('unsaved');
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    autosaveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await QuizService.saveAttemptDraft(
          session.attempt._id,
          newAnswers,
          timeSpent
        );
        setSaveStatus('saved');
      } catch {
        setSaveStatus('unsaved');
      }
    }, 1200);
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    triggerAutosave(updated);
  };

  const startAssessment = async () => {
    gracePeriodUntilRef.current = Date.now() + 3000;
    if (session?.quiz.fullscreenRequired) {
      try {
        const el = document.documentElement as any;
        const requestFS = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen || el.mozRequestFullScreen;
        if (requestFS) {
          await requestFS.call(el);
          wasInFullscreenRef.current = true;
        }
      } catch {
        // Fallback gracefully if browser policy restricts fullscreen
      }
    }
    setInAssessmentMode(true);
  };

  const returnToFullscreen = async () => {
    gracePeriodUntilRef.current = Date.now() + 2500;
    setFullscreenWarning(false);
    if (session?.quiz.fullscreenRequired && !document.fullscreenElement) {
      try {
        const el = document.documentElement as any;
        const requestFS = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen || el.mozRequestFullScreen;
        if (requestFS) {
          await requestFS.call(el);
          wasInFullscreenRef.current = true;
        }
      } catch {
        // Continue if permission denied
      }
    }
  };

  const handleAutoSubmit = () => {
    handleSubmitQuiz();
  };

  const handleSubmitQuiz = async () => {
    if (!session) return;
    try {
      setSubmitting(true);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      const res = await QuizService.submitQuizAttempt(
        session.attempt._id,
        answers,
        timeSpent
      );

      const data = ((res as any)?.data !== undefined ? (res as any).data : res);
      setSubmissionResult(data);
      setInAssessmentMode(false);
      setConfirmSubmitOpen(false);

      // Load post-attempt review if available
      try {
        const reviewRes = await QuizService.getQuizAttemptReview(session.attempt._id);
        setAttemptReview((reviewRes as any)?.data !== undefined ? (reviewRes as any).data : reviewRes);
      } catch {
        // Non-blocking review fetch
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to submit assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          <p className="text-xs font-semibold text-muted-foreground">
            Initializing assessment session...
          </p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-3xl border border-error-border bg-card shadow-xl text-center space-y-4 text-card-foreground">
          <div className="w-12 h-12 rounded-full bg-error-soft text-error flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-card-foreground">Assessment Access Error</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {error || 'Unable to access the requested assessment module.'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-2.5 rounded-xl bg-muted text-xs font-bold text-foreground hover:bg-secondary cursor-pointer border border-border"
          >
            Return to Subject Hub
          </button>
        </div>
      </div>
    );
  }

  const { quiz, questions } = session;
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] !== undefined && answers[k] !== '' && answers[k] !== null
  ).length;

  const getOptionText = (opt: any): string => (typeof opt === 'string' ? opt : opt?.text || '');

  // ─────────────────────────────────────────────────────────────
  // 1. BRIEFING SCREEN (BEFORE ENTERING ASSESSMENT MODE)
  // ─────────────────────────────────────────────────────────────
  if (!inAssessmentMode && !submissionResult) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between transition-colors duration-200">
        
        {/* Briefing Top Header */}
        <header className="w-full border-b border-border bg-card px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary-soft text-primary dark:text-accent-foreground border border-primary-border flex items-center justify-center font-black">
              E
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Assessment Protocol
              </span>
              <h2 className="text-sm font-bold text-card-foreground leading-tight">
                {quiz.title}
              </h2>
            </div>
          </div>
          <ThemeToggle size="sm" />
        </header>

        {/* Briefing Card */}
        <main className="max-w-3xl w-full mx-auto px-4 py-8 flex-1 flex items-center justify-center">
          <div className="w-full rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl space-y-6 text-card-foreground">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-soft text-primary dark:text-accent-foreground border border-primary-border">
                  Unit-Grounded Assessment
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Units: {quiz.curriculumUnits?.map((u) => `Unit ${u}`).join(', ') || 'All Units'}
                </span>
              </div>
              <h1 className="text-2xl font-black text-card-foreground tracking-tight">
                {quiz.title}
              </h1>
              {quiz.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {quiz.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-muted/60 rounded-2xl border border-border">
                <span className="text-muted-foreground block font-semibold text-[11px]">Duration</span>
                <span className="text-base font-bold text-card-foreground mt-1 block">
                  {quiz.duration || quiz.durationMinutes || 30} Mins
                </span>
              </div>
              <div className="p-3.5 bg-muted/60 rounded-2xl border border-border">
                <span className="text-muted-foreground block font-semibold text-[11px]">Total Questions</span>
                <span className="text-base font-bold text-card-foreground mt-1 block">
                  {questions.length} Questions
                </span>
              </div>
              <div className="p-3.5 bg-muted/60 rounded-2xl border border-border">
                <span className="text-muted-foreground block font-semibold text-[11px]">Total Marks</span>
                <span className="text-base font-bold text-card-foreground mt-1 block">
                  {quiz.totalMarks || questions.reduce((acc, q) => acc + (q.marks || 1), 0)} Marks
                </span>
              </div>
              <div className="p-3.5 bg-muted/60 rounded-2xl border border-border">
                <span className="text-muted-foreground block font-semibold text-[11px]">Passing Score</span>
                <span className="text-base font-bold text-card-foreground mt-1 block">
                  {quiz.passingScore || quiz.passingMarks || 50}%
                </span>
              </div>
            </div>

            {/* Assessment Rules */}
            <div className="p-4 rounded-2xl border border-border bg-muted/40 space-y-2.5 text-xs text-muted-foreground">
              <h3 className="font-bold text-card-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" />
                Assessment Instructions & Integrity Protocol
              </h3>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>This test is proctored. Do not switch tabs or exit fullscreen mode.</li>
                <li>Your answers are automatically saved in the background every few seconds.</li>
                <li>You can navigate questions freely and review flagged items before final submission.</li>
                {quiz.negativeMarkingEnabled && (
                  <li className="text-warning-text font-semibold">
                    Negative marking is active ({quiz.negativeMarksPerQuestion || 0.25} penalty per wrong answer).
                  </li>
                )}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              >
                Back to Subject
              </button>

              <button
                type="button"
                onClick={startAssessment}
                className="px-6 py-3 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Enter Assessment Mode</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. SUBMISSION RESULTS SCREEN
  // ─────────────────────────────────────────────────────────────
  if (submissionResult) {
    const passed =
      submissionResult.percentage !== null
        ? submissionResult.percentage >= (quiz.passingScore || quiz.passingMarks || 50)
        : null;

    return (
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 flex flex-col items-center justify-center transition-colors">
        <div className="max-w-3xl w-full bg-card text-card-foreground rounded-3xl shadow-xl border border-border overflow-hidden space-y-6">
          
          {/* Header Score Banner */}
          <div className="p-8 bg-slate-900 text-white text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
              <Award className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white">Assessment Submitted</h1>
            <p className="text-xs text-slate-300">
              Your responses have been recorded and auto-graded.
            </p>

            {submissionResult.showResultImmediately && (
              <div className="pt-4 flex items-center justify-center gap-6 sm:gap-10">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 block font-semibold">
                    Score
                  </span>
                  <span className="text-3xl font-black text-white">
                    {submissionResult.totalScore !== null ? submissionResult.totalScore : 'Pending'}
                    <span className="text-base text-slate-400 font-normal"> / {submissionResult.totalMarks}</span>
                  </span>
                </div>

                {submissionResult.percentage !== null && (
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-400 block font-semibold">
                      Percentage
                    </span>
                    <span className={`text-3xl font-black ${passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {submissionResult.percentage}%
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 block font-semibold">
                    Result
                  </span>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${
                      passed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Back to Subject Hub
              </button>
              {session?.canRetake !== false && (
                <button
                  type="button"
                  onClick={handleRetakeQuiz}
                  disabled={retaking}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-4 h-4 ${retaking ? 'animate-spin' : ''}`} />
                  {retaking ? 'Starting Retake...' : 'Retake Assessment'}
                </button>
              )}
            </div>
          </div>

          {/* Question-by-Question Review */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Assessment Question Review
              </h3>
              <span className="text-xs text-muted-foreground">
                {quiz.showAnswersAfterSubmission ? 'Solutions visible' : 'Solutions withheld'}
              </span>
            </div>

            {attemptReview && attemptReview.questions ? (
              <div className="space-y-4">
                {attemptReview.questions.map((q: any, qIdx: number) => {
                  const studentAns = attemptReview.attempt?.answers?.find(
                    (a: any) => a.questionId === q._id || a.question === q._id
                  );
                  const isCorrect = studentAns?.isCorrect ?? q.isCorrect;
                  const marksAwarded = studentAns?.marksAwarded ?? q.marksAwarded;
                  const myAnswer = studentAns?.studentAnswer ?? q.myAnswer;

                  return (
                    <div
                      key={q._id}
                      className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                        isCorrect
                          ? 'border-success-border bg-success-soft text-foreground'
                          : isCorrect === false
                          ? 'border-error-border bg-error-soft text-foreground'
                          : 'border-border bg-muted/40 text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">
                          Q{qIdx + 1}. {q.title || q.questionText}
                        </span>
                        <span className="font-bold text-primary dark:text-accent-foreground">
                          {marksAwarded ?? 0} / {q.marks || 1} Marks
                        </span>
                      </div>

                      <div className="p-3 bg-card rounded-xl border border-border">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                          Your Answer:
                        </span>
                        <span className="font-mono text-card-foreground">
                          {myAnswer !== undefined && myAnswer !== null
                            ? typeof myAnswer === 'object'
                              ? JSON.stringify(myAnswer)
                              : String(myAnswer)
                            : '(Unanswered)'}
                        </span>
                      </div>

                      {quiz.showAnswersAfterSubmission && (q.correctAnswer || q.correctAnswers) && (
                        <div className="p-3 bg-success-soft rounded-xl border border-success-border text-foreground">
                          <span className="text-[10px] uppercase font-bold text-success-text dark:text-success block mb-0.5">
                            Correct Solution:
                          </span>
                          <span className="font-mono font-bold text-foreground">
                            {typeof (q.correctAnswer ?? q.correctAnswers) === 'object'
                              ? JSON.stringify(q.correctAnswer ?? q.correctAnswers)
                              : String(q.correctAnswer ?? q.correctAnswers)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground text-xs">
                Your responses have been successfully recorded in your academic ledger.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback if no questions
  if (!currentQuestion) return null;

  // ─────────────────────────────────────────────────────────────
  // 3. ACTIVE ASSESSMENT ENGINE (LIGHT & DARK THEMED)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col select-none transition-colors duration-200">
      
      {/* Top Proctored Header Bar */}
      <header className="px-4 sm:px-6 py-3 bg-card border-b border-border flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <h2 className="text-xs sm:text-sm font-bold text-card-foreground line-clamp-1">
            {quiz.title}
          </h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            • Unit {currentQuestion?.curriculumUnit || 1}
          </span>
        </div>

        {/* Live Timer, Autosave, and Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle size="sm" />

          {/* Autosave Status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <Save className="w-3.5 h-3.5" />
            <span>{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
          </div>

          {/* Security Counter */}
          {(quiz.fullscreenRequired || quiz.tabSwitchDetection) && (
            <div
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold border ${
                violationCount + tabSwitchCount === 0
                  ? 'bg-success-soft text-success-text border-success-border'
                  : 'bg-warning-soft text-warning-text border-warning-border'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{violationCount + tabSwitchCount}/{maxWarnings}</span>
            </div>
          )}

          {/* Timer Badge */}
          <div
            className={`px-3 py-1 rounded-xl flex items-center gap-1.5 font-mono text-xs font-bold border ${
              timeRemaining < 300
                ? 'bg-error-soft border-error-border text-error-text animate-pulse'
                : 'bg-muted border-border text-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{formatTimer(timeRemaining)}</span>
          </div>

          {/* Mobile Palette Toggle */}
          <button
            type="button"
            onClick={() => setMobilePaletteOpen(!mobilePaletteOpen)}
            className="md:hidden p-1.5 rounded-lg border border-border text-foreground bg-muted hover:bg-secondary cursor-pointer"
            aria-label="Toggle Question Palette"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Submit Button */}
          <button
            type="button"
            onClick={() => setConfirmSubmitOpen(true)}
            className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Finish & Submit</span>
            <span className="sm:hidden">Submit</span>
          </button>
        </div>
      </header>

      {/* Main Layout: 3-Column Desktop or Responsive Mobile */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left / Center: Question Content Card */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col justify-between">
          <div className="max-w-3xl w-full mx-auto space-y-6">
            
            {/* Question Meta Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-lg">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="px-2 py-0.5 bg-muted text-foreground text-xs font-semibold rounded-md border border-border">
                  {currentQuestion.type}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  ({currentQuestion.marks} Mark{currentQuestion.marks > 1 ? 's' : ''})
                </span>
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-foreground leading-relaxed">
                {currentQuestion.title}
              </h3>
              {currentQuestion.description && (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {currentQuestion.description}
                </p>
              )}
            </div>

            {/* Question Options / Inputs */}
            <div className="pt-2">
              {/* 1. MCQ */}
              {(currentQuestion.type === 'MCQ' || currentQuestion.questionType === 'MCQ') && (
                <div className="space-y-2.5">
                  {currentQuestion.options?.map((option: any, optIdx: number) => {
                    const optText = getOptionText(option);
                    const isSelected = answers[currentQuestion._id] === optText;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleAnswerChange(currentQuestion._id, optText)}
                        className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary-soft border-primary text-primary dark:text-accent-foreground font-bold shadow-xs'
                            : 'bg-card border-border text-card-foreground hover:bg-muted/80 hover:border-primary/50'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="text-xs leading-relaxed">{optText}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2. MULTIPLE_CORRECT */}
              {(currentQuestion.type === 'MULTIPLE_CORRECT' || currentQuestion.questionType === 'MULTIPLE_CORRECT') && (
                <div className="space-y-2.5">
                  <p className="text-xs text-primary dark:text-accent-foreground font-semibold mb-1">
                    Select all that apply:
                  </p>
                  {currentQuestion.options?.map((option: any, optIdx: number) => {
                    const optText = getOptionText(option);
                    const currentSelected: string[] = answers[currentQuestion._id] || [];
                    const isChecked = currentSelected.includes(optText);

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => {
                          const updated = isChecked
                            ? currentSelected.filter((x) => x !== optText)
                            : [...currentSelected, optText];
                          handleAnswerChange(currentQuestion._id, updated);
                        }}
                        className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-primary-soft border-primary text-primary dark:text-accent-foreground font-bold'
                            : 'bg-card border-border text-card-foreground hover:bg-muted/80'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs ${
                            isChecked
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-border text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                        <span className="text-xs leading-relaxed">{optText}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 3. FILL_IN_THE_BLANK */}
              {(currentQuestion.type === 'FILL_IN_THE_BLANK' || currentQuestion.questionType === 'FILL_IN_THE_BLANK') && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block font-semibold">
                    Type your answer:
                  </label>
                  <input
                    type="text"
                    value={answers[currentQuestion._id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                    placeholder="Enter missing term / phrase..."
                    className="w-full text-sm px-4 py-3 bg-input border border-border rounded-xl focus:border-primary focus:outline-none text-foreground font-medium"
                  />
                </div>
              )}

              {/* 4. NUMERICAL */}
              {(currentQuestion.type === 'NUMERICAL' || currentQuestion.questionType === 'NUMERICAL') && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block font-semibold">
                    Enter calculated numeric value:
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={answers[currentQuestion._id] ?? ''}
                    onChange={(e) =>
                      handleAnswerChange(
                        currentQuestion._id,
                        e.target.value === '' ? '' : parseFloat(e.target.value)
                      )
                    }
                    placeholder="0.00"
                    className="w-full text-base font-mono px-4 py-3 bg-input border border-border rounded-xl focus:border-primary focus:outline-none text-foreground font-bold"
                  />
                </div>
              )}

              {/* 5. ASSERTION_REASON */}
              {(currentQuestion.type === 'ASSERTION_REASON' || currentQuestion.questionType === 'ASSERTION_REASON') && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-2xl border border-border space-y-3 text-xs">
                    <div>
                      <span className="font-bold text-primary dark:text-accent-foreground block uppercase tracking-wider text-[10px]">
                        Assertion (A):
                      </span>
                      <p className="mt-0.5 text-foreground leading-relaxed font-medium">
                        {currentQuestion.assertion}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <span className="font-bold text-primary dark:text-accent-foreground block uppercase tracking-wider text-[10px]">
                        Reason (R):
                      </span>
                      <p className="mt-0.5 text-foreground leading-relaxed font-medium">
                        {currentQuestion.reason}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { val: 'A', label: 'Both (A) and (R) are true, and (R) is the correct explanation of (A)' },
                      { val: 'B', label: 'Both (A) and (R) are true, but (R) is NOT the correct explanation of (A)' },
                      { val: 'C', label: '(A) is true, but (R) is false' },
                      { val: 'D', label: '(A) is false, but (R) is true' },
                    ].map((opt) => {
                      const isSelected = answers[currentQuestion._id] === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => handleAnswerChange(currentQuestion._id, opt.val)}
                          className={`w-full p-3.5 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer ${
                            isSelected
                              ? 'bg-primary-soft border-primary text-primary dark:text-accent-foreground font-bold'
                              : 'bg-card border-border text-card-foreground hover:bg-muted/80'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                              isSelected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-border text-muted-foreground'
                            }`}
                          >
                            {opt.val}
                          </span>
                          <span className="text-xs leading-relaxed">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 6. MATCH_FOLLOWING */}
              {(currentQuestion.type === 'MATCH_FOLLOWING' || currentQuestion.questionType === 'MATCH_FOLLOWING') && (
                <div className="space-y-3">
                  <div className="p-4 bg-muted/50 rounded-2xl border border-border space-y-3">
                    {currentQuestion.matchPairs?.map((pair: any, pIdx: number) => {
                      const currentMatches: Record<string, string> = answers[currentQuestion._id] || {};
                      const selectedRight = currentMatches[pair.left] || '';

                      return (
                        <div
                          key={pIdx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-card rounded-xl border border-border"
                        >
                          <span className="text-xs font-semibold text-card-foreground sm:w-1/2">
                            {pair.left}
                          </span>
                          <span className="text-muted-foreground hidden sm:inline">⟶</span>
                          <select
                            value={selectedRight}
                            onChange={(e) => {
                              const updated = { ...currentMatches, [pair.left]: e.target.value };
                              handleAnswerChange(currentQuestion._id, updated);
                            }}
                            className="text-xs bg-input border border-border rounded-lg px-3 py-2 text-foreground sm:w-1/2 focus:border-primary focus:outline-none"
                          >
                            <option value="">Select match...</option>
                            {currentQuestion.matchPairs?.map((p: any, rIdx: number) => (
                              <option key={rIdx} value={p.right}>
                                {p.right}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 7. SHORT_ANSWER */}
              {(currentQuestion.type === 'SHORT_ANSWER' || currentQuestion.questionType === 'SHORT_ANSWER') && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block font-semibold">
                    Provide your written response:
                  </label>
                  <textarea
                    rows={4}
                    value={answers[currentQuestion._id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                    placeholder="Write your explanation or proof..."
                    className="w-full text-xs p-3.5 bg-input border border-border rounded-2xl focus:border-primary focus:outline-none text-foreground leading-relaxed"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="max-w-3xl w-full mx-auto pt-6 border-t border-border flex items-center justify-between">
            <button
              type="button"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              className="px-4 py-2 bg-muted hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none text-foreground text-xs font-semibold rounded-xl flex items-center gap-2 transition cursor-pointer border border-border"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer shadow-xs"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(true)}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer shadow-xs"
              >
                <span>Review & Submit</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </main>

        {/* Right: Question Palette Desktop Sidebar */}
        <aside className="w-64 bg-card border-l border-border p-4 hidden md:flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Question Palette
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                Answered: <strong className="text-primary font-bold">{answeredCount}</strong> / {questions.length}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const isAnswered =
                  answers[q._id] !== undefined &&
                  answers[q._id] !== '' &&
                  answers[q._id] !== null;
                const isCurrent = currentQuestionIndex === idx;

                return (
                  <button
                    key={q._id}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-9 rounded-xl font-mono text-xs font-black transition flex items-center justify-center cursor-pointer shadow-2xs ${
                      isCurrent
                        ? 'ring-2 ring-emerald-500 bg-emerald-600 text-white shadow-sm'
                        : isAnswered
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-200'
                        : 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-4 border-t border-border space-y-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/80 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 ring-1 ring-emerald-500 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Current Question</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Unanswered</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* CONFIRM SUBMISSION MODAL */}
      {confirmSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-card text-card-foreground border border-border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-card-foreground">
              Submit Assessment?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You have answered <strong className="text-foreground">{answeredCount}</strong> out of{' '}
              <strong className="text-foreground">{questions.length}</strong> questions.
              {answeredCount < questions.length && (
                <span className="text-warning-text block font-semibold mt-1">
                  ⚠️ You have {questions.length - answeredCount} unanswered questions remaining.
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Once submitted, your responses will be evaluated. Are you sure you wish to finish?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmSubmitOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Review Answers
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitQuiz}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY VIOLATION MODAL */}
      {fullscreenWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-card text-card-foreground border border-error-border rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-error-soft text-error flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-card-foreground">
              Security Warning: Fullscreen Exit Detected
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You are no longer in fullscreen proctored assessment mode. Please return to fullscreen immediately to continue your test.
            </p>
            <button
              type="button"
              onClick={returnToFullscreen}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs rounded-xl transition shadow-md cursor-pointer"
            >
              Return to Assessment
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
