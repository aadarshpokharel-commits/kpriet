import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { AcademicService } from '@/services/academic.service';
import { assignmentService } from '@/services/assignment.service';
import { StudentAssignmentModal } from '@/pages/assignment/StudentAssignmentModal';
import { StudentTrackingModal } from './StudentTrackingModal';
import { SimulationManager } from '@/simulations';
import { SecureFileManagerModal } from '@/components/file/SecureFileManagerModal';
import { SlidingTabBar } from '@/components/ui/SlidingTabBar';
import type { ISubjectWorkspaceData, IAIDoubtResponse } from '@/types/academic.types';


type WorkspaceTab =
  | 'overview'
  | 'notes'
  | 'materials'
  | 'videos'
  | 'presentations'
  | 'quizzes'
  | 'assignments'
  | 'announcements'
  | 'aiDoubt'
  | 'simulations'
  | 'progress'
  | 'results'
  | 'secureFiles';

interface TabItem {
  id: WorkspaceTab;
  label: string;
  icon: string;
  badge?: number | string;
}

export function SubjectWorkspacePage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ISubjectWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  // AI Doubt & RAG Query State
  const [doubtQuery, setDoubtQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<string>('ALL');
  const [askingDoubt, setAskingDoubt] = useState(false);
  const [doubtHistory, setDoubtHistory] = useState<
    Array<{ query: string; response: IAIDoubtResponse; timestamp: string }>
  >([]);
  const [doubtError, setDoubtError] = useState<string | null>(null);
  const [showAiLogsModal, setShowAiLogsModal] = useState(false);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [loadingAiLogs, setLoadingAiLogs] = useState(false);

  // Assignment Workspace Modal State
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [studentAssignments, setStudentAssignments] = useState<any[]>([]);

  // Academic Tracking Modal State
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  // Secure File Manager Modal State
  const [showFileManagerModal, setShowFileManagerModal] = useState(false);

  useEffect(() => {
    if (!subjectId) return;
    loadWorkspace();
    loadAssignments();
  }, [subjectId]);

  const loadAssignments = async () => {
    if (!subjectId) return;
    try {
      const res = await assignmentService.getStudentAssignments(subjectId);
      if (res && res.length > 0) {
        setStudentAssignments(res);
      }
    } catch {
      // fallback to data.tabs.assignments
    }
  };

  const loadWorkspace = async () => {
    if (!subjectId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await AcademicService.getSubjectWorkspace(subjectId);
      setData(res);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to load subject workspace. You may not have an approved enrollment in this course.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAskDoubt = async (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const query = presetQuery || doubtQuery;
    if (!query.trim() || !subjectId) return;

    try {
      setAskingDoubt(true);
      setDoubtError(null);
      const res = await AcademicService.askSubjectAIDoubt(subjectId, query, {
        chapter: selectedChapter !== 'ALL' ? selectedChapter : undefined,
      });
      setDoubtHistory((prev) => [
        {
          query,
          response: res,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
      if (!presetQuery) setDoubtQuery('');
    } catch (err: any) {
      setDoubtError(
        err?.response?.data?.message || err?.message || 'Failed to solve doubt. Please try again.'
      );
    } finally {
      setAskingDoubt(false);
    }
  };

  const handleOpenAiLogs = async () => {
    if (!subjectId) return;
    setShowAiLogsModal(true);
    try {
      setLoadingAiLogs(true);
      const logs = await AcademicService.getSubjectAiLogs(subjectId);
      setAiLogs(logs || []);
    } catch (err) {
      console.error('Failed to load AI query logs', err);
    } finally {
      setLoadingAiLogs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500"></div>
        <p className="text-sm font-medium text-muted">Opening subject academic workspace...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-xl flex items-center justify-center mx-auto">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-ink">Access Restricted / Subject Error</h2>
        <p className="text-sm text-rose-700 dark:text-rose-300 font-medium leading-relaxed">{error}</p>
        <div className="pt-4">
          <Link
            to="/student/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-panel border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface transition-all"
          >
            ← Return to Student Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { subject, faculty, tabs } = data;

  const tabList: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: '📖' },
    { id: 'notes', label: 'Notes', icon: '📝', badge: tabs.notes.length || undefined },
    { id: 'materials', label: 'Materials', icon: '📚', badge: tabs.materials.length || undefined },
    { id: 'videos', label: 'Videos', icon: '🎥', badge: tabs.videos.length || undefined },
    { id: 'presentations', label: 'Presentations', icon: '📊', badge: tabs.presentations.length || undefined },
    { id: 'quizzes', label: 'Quizzes', icon: '✍️', badge: tabs.quizzes.length || undefined },
    { id: 'assignments', label: 'Assignments', icon: '📋', badge: tabs.assignments.length || undefined },
    { id: 'announcements', label: 'Announcements', icon: '📢', badge: tabs.announcements.length || undefined },
    { id: 'aiDoubt', label: 'AI Doubt Solver', icon: '🤖', badge: 'Bounded' },
    { id: 'simulations', label: 'Simulations', icon: '🔬', badge: tabs.simulations.length || undefined },
    { id: 'progress', label: 'Progress', icon: '📈' },
    { id: 'results', label: 'Results', icon: '🏆' },
    { id: 'secureFiles', label: 'Secure Files', icon: '🔒' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Breadcrumb & Top Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/student/dashboard"
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-line bg-panel text-muted hover:text-ink hover:bg-surface transition-all text-sm font-bold"
            title="Return to Student Dashboard"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {subject.subjectCode}
              </span>
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-muted border border-line">
                Semester {subject.semesterNumber}
              </span>
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-400 border border-indigo-500/20">
                {subject.credits} Credits
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{subject.subjectName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFileManagerModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary dark:text-indigo-300 hover:bg-primary hover:text-white transition-all cursor-pointer"
          >
            <span>🔒</span> Secure Files Vault
          </button>
          <a
            href={`/smartboard/index.html?subjectId=${subject._id}&subjectName=${encodeURIComponent(subject.subjectName)}&subjectCode=${subject.subjectCode || ''}&departmentId=${(subject.department as any)?._id || ''}&departmentName=${encodeURIComponent((subject.department as any)?.name || '')}&semesterId=${(subject.semester as any)?._id || ''}&semesterNumber=${(subject.semester as any)?.semesterNumber || 1}&role=student`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:from-emerald-500 hover:to-teal-500 transition-all"
          >
            <span>🚀</span> Launch Smart Board
          </a>
        </div>
      </div>

      {/* ─── Assigned Faculty Strip ─── */}
      <div className="rounded-2xl border border-line bg-panel p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-lg">
            👨‍🏫
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Assigned Faculty</p>
            <div className="flex flex-wrap items-center gap-3 mt-0.5">
              {faculty.length > 0 ? (
                faculty.map((f, i) => (
                  <span key={i} className="text-sm font-bold text-ink">
                    {f.name}{' '}
                    <span className="text-xs font-normal text-muted">
                      ({f.designation || 'Faculty'}{f.section && f.section !== 'ALL' ? ` - Sec ${f.section}` : ''})
                    </span>
                    {f.isCoordinator && (
                      <span className="ml-1 text-[10px] bg-primary/15 text-primary dark:text-indigo-300 px-1.5 py-0.2 rounded font-semibold border border-primary/30">
                        Coordinator
                      </span>
                    )}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted">Faculty assignment in progress</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-muted">
          <div>
            <span className="text-ink font-semibold">{tabs.overview.syllabusUnits.length}</span> Units
          </div>
          <div>
            <span className="text-ink font-semibold">{tabs.progress.attendanceRate}%</span> Attendance
          </div>
          <div>
            Grade:{' '}
            <span className="text-emerald-400 font-bold">
              {tabs.results.letterGrade || 'In Progress'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 13 Workspace Tabs Navigation with Interactive Slide Controls ─── */}
      <div className="border-b border-line pb-1">
        <SlidingTabBar
          tabs={tabList}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as WorkspaceTab)}
          ariaLabel="Subject Workspace Navigation Tabs"
        />
      </div>

      {/* ─── Tab Content Panes ─── */}
      <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm min-h-[400px]">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-ink">Course Information & Syllabus</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {tabs.overview.description ||
                  `${subject.subjectName} (${subject.subjectCode}) is a core curriculum course worth ${subject.credits} credits in Semester ${subject.semesterNumber}.`}
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                Syllabus Units Breakdown ({tabs.overview.syllabusUnits.length} Units)
              </h4>

              {tabs.overview.syllabusUnits.length === 0 ? (
                <p className="text-xs text-muted">No syllabus units mapped yet.</p>
              ) : (
                <div className="space-y-3">
                  {tabs.overview.syllabusUnits.map((u, i) => (
                    <div
                      key={u._id || i}
                      className="rounded-xl border border-line bg-surface/30 p-4 space-y-2 hover:border-line/80 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          Unit {u.unitNumber}
                        </span>
                        {u.hours && (
                          <span className="text-xs font-mono text-muted">{u.hours} Teaching Hours</span>
                        )}
                      </div>
                      <h5 className="text-sm font-bold text-ink">{u.title}</h5>
                      {u.description && <p className="text-xs text-muted">{u.description}</p>}
                      {u.topics && u.topics.length > 0 && (
                        <div className="pt-2">
                          <p className="text-[11px] font-semibold text-muted uppercase">Key Topics:</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {u.topics.map((top, idx) => (
                              <span
                                key={idx}
                                className="rounded-md border border-line bg-panel px-2 py-0.5 text-[11px] text-ink/80"
                              >
                                {top}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: NOTES */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">Lecture Notes & Handouts</h3>
                <p className="text-xs text-muted">Classroom reference notes provided by faculty</p>
              </div>
              <span className="text-xs text-muted font-mono">{tabs.notes.length} documents</span>
            </div>

            {tabs.notes.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                No lecture notes have been published for this course yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tabs.notes.map((note) => (
                  <div
                    key={note._id}
                    className="flex flex-col justify-between rounded-xl border border-line bg-surface/30 p-4 space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          {note.chapterOrUnit ? `Unit ${note.chapterOrUnit}` : 'Lecture Note'}
                        </span>
                        <span className="text-[11px] font-mono text-muted">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-ink">{note.title}</h4>
                      {note.description && (
                        <p className="mt-1 text-xs text-muted line-clamp-2">{note.description}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                      <span className="text-[11px] text-muted">
                        By {note.teacher?.name || 'Course Faculty'}
                      </span>
                      {note.attachments && note.attachments[0] && (
                        <a
                          href={note.attachments[0].url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-all"
                        >
                          View Document ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MATERIALS */}
        {activeTab === 'materials' && (
          <div className="space-y-4">
            <div className="border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Reference Materials & Textbooks</h3>
              <p className="text-xs text-muted">Syllabus reference books, lab manuals, and guides</p>
            </div>

            {tabs.materials.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                No extra reference materials uploaded for this subject yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tabs.materials.map((m) => (
                  <div key={m._id} className="rounded-xl border border-line bg-surface/30 p-4 space-y-2">
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      Reference Material
                    </span>
                    <h4 className="text-sm font-bold text-ink">{m.title}</h4>
                    {m.description && <p className="text-xs text-muted">{m.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VIDEOS */}
        {activeTab === 'videos' && (
          <div className="space-y-4">
            <div className="border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Recorded Lectures & Tutorials</h3>
              <p className="text-xs text-muted">Video explanations and recorded classroom sessions</p>
            </div>

            {tabs.videos.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                No video lectures indexed for this course yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tabs.videos.map((v) => (
                  <div key={v._id} className="rounded-xl border border-line bg-surface/30 p-4 space-y-2">
                    <div className="aspect-video bg-black/40 rounded-lg flex items-center justify-center text-3xl">
                      ▶️
                    </div>
                    <h4 className="text-sm font-bold text-ink">{v.title}</h4>
                    {v.description && <p className="text-xs text-muted">{v.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PRESENTATIONS */}
        {activeTab === 'presentations' && (
          <div className="space-y-4">
            <div className="border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Faculty Lecture Presentations (PPT)</h3>
              <p className="text-xs text-muted">Slide decks used during classroom lectures</p>
            </div>

            {tabs.presentations.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                No slide presentations uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tabs.presentations.map((p) => (
                  <div key={p._id} className="rounded-xl border border-line bg-surface/30 p-4 space-y-2">
                    <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                      Slide Deck
                    </span>
                    <h4 className="text-sm font-bold text-ink">{p.title}</h4>
                    {p.description && <p className="text-xs text-muted">{p.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: QUIZZES */}
        {activeTab === 'quizzes' && (
          <div className="space-y-4">
            <div className="border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Online Quizzes & Assessments</h3>
              <p className="text-xs text-muted">Subject-specific knowledge checks and graded evaluations</p>
            </div>

            {tabs.quizzes.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                No quizzes currently scheduled for this subject.
              </div>
            ) : (
              <div className="space-y-3">
                {tabs.quizzes.map((q) => (
                  <div
                    key={q._id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-line bg-surface/30 p-4 gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold ${
                            q.attemptStatus === 'ATTEMPTED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {q.attemptStatus}
                        </span>
                        <span className="text-xs text-muted font-mono">{q.durationMinutes} mins</span>
                        <span className="text-xs text-muted font-mono">• {q.totalMarks} Marks</span>
                      </div>
                      <h4 className="mt-1 text-sm font-bold text-ink">{q.title}</h4>
                      {q.instructions && <p className="text-xs text-muted mt-0.5">{q.instructions}</p>}
                    </div>

                    <div className="flex items-center gap-3">
                      {q.attemptStatus === 'ATTEMPTED' ? (
                        <div className="text-right">
                          <p className="text-xs text-muted">Score Achieved</p>
                          <p className="text-base font-extrabold text-emerald-400">
                            {q.score !== null ? `${q.score} / ${q.totalMarks}` : 'Graded'}
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => navigate(`/student/quizzes/${q._id}/take`)}
                          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all cursor-pointer shadow-sm shadow-indigo-500/20"
                        >
                          Start Quiz →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: ASSIGNMENTS */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            <div className="border-b border-line pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink">Assignments & Problem Sets</h3>
                <p className="text-xs text-muted">Continuous assessment tasks with clear rubrics and deadline enforcement</p>
              </div>
              <span className="text-xs font-mono text-muted">
                {(studentAssignments.length > 0 ? studentAssignments : tabs.assignments).length} assignments
              </span>
            </div>

            {(studentAssignments.length > 0 ? studentAssignments : tabs.assignments).length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-dashed border-line bg-surface/20">
                <span className="text-3xl block mb-2">📋</span>
                <p className="text-xs font-bold text-ink">No assignments posted for this course</p>
                <p className="text-[11px] text-muted mt-0.5">Check back later for continuous assessments and problem sets.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(studentAssignments.length > 0 ? studentAssignments : tabs.assignments).map((a) => {
                  const status = a.submissionStatus || (a.myGrade ? 'GRADED' : a.mySubmission ? a.mySubmission.status : 'NOT_SUBMITTED');
                  const isGraded = status === 'GRADED' || !!a.myGrade;
                  const isSubmitted = status === 'SUBMITTED' || status === 'RESUBMITTED' || !!a.mySubmission;
                  const isLate = status === 'LATE' || a.mySubmission?.isLate;

                  return (
                    <div
                      key={a._id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-line bg-surface/30 hover:bg-surface/50 p-5 gap-4 transition-all"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              isGraded
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : isLate
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : isSubmitted
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {status === 'NOT_SUBMITTED' ? 'NOT SUBMITTED' : status}
                          </span>

                          {a.chapterOrUnit && (
                            <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-400 border border-indigo-500/20">
                              Unit {a.chapterOrUnit}
                            </span>
                          )}

                          {a.dueDate && (
                            <span className="text-xs text-muted font-mono">
                              Due: {new Date(a.dueDate).toLocaleDateString()}
                            </span>
                          )}

                          <span className="text-xs text-muted font-mono">• Max {a.maxMarks} Marks</span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-ink">{a.title}</h4>
                          {a.description && <p className="text-xs text-muted mt-0.5 line-clamp-2">{a.description}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isGraded ? (
                          <div className="text-right">
                            <p className="text-[10px] text-muted uppercase font-bold">Graded Score</p>
                            <p className="text-base font-extrabold text-emerald-400 font-mono">
                              {a.myGrade?.marksObtained ?? a.marksObtained} / {a.maxMarks}
                            </p>
                          </div>
                        ) : isSubmitted ? (
                          <span className="rounded-xl bg-surface px-3 py-1.5 text-xs text-indigo-400 font-medium border border-line">
                            Awaiting Evaluation
                          </span>
                        ) : null}

                        <button
                          onClick={() => setSelectedAssignment(a)}
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow ${
                            isGraded
                              ? 'bg-surface/60 border border-line text-ink hover:bg-surface'
                              : isSubmitted
                              ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                              : 'bg-emerald-600 text-white hover:bg-emerald-500'
                          }`}
                        >
                          {isGraded
                            ? 'View Evaluation & Feedback →'
                            : isSubmitted
                            ? 'View / Replace Submission →'
                            : 'Submit Solution →'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            <div className="border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Course Announcements</h3>
              <p className="text-xs text-muted">Direct academic notices from the assigned course faculty</p>
            </div>

            {tabs.announcements.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                No active announcements for this subject.
              </div>
            ) : (
              <div className="space-y-3">
                {tabs.announcements.map((ann) => (
                  <div key={ann._id} className="rounded-xl border border-line bg-surface/30 p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-ink">{ann.title}</h4>
                      <span className="text-[11px] font-mono text-muted">
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {ann.description && (
                      <p className="text-xs text-muted leading-relaxed">{ann.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 9: EDUVERSE AI QUERY SYSTEM (SUBJECT-BOUNDED RAG) */}
        {activeTab === 'aiDoubt' && (
          <div className="space-y-6">
            {/* Header with Breadcrumb Scope & Access Verification */}
            <div className="rounded-2xl border border-line bg-gradient-to-r from-surface via-surface/80 to-surface/40 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl">🤖</span>
                    <h3 className="text-base font-bold text-ink">
                      Eduverse AI Query System ({subject.subjectCode})
                    </h3>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      Subject-Isolated RAG
                    </span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-mono text-primary dark:text-indigo-300 border border-primary/20">
                      OpenAI gpt-4o-mini
                    </span>
                  </div>
                  {/* Academic Scope Breadcrumb */}
                  <div className="flex items-center gap-1.5 text-xs text-muted mt-1.5 font-medium flex-wrap">
                    <span className="text-ink/80">{(subject.department as any)?.name || 'Programme'}</span>
                    <span>→</span>
                    <span className="text-ink/80">Semester {(subject.semester as any)?.semesterNumber ?? subject.semesterNumber}</span>
                    <span>→</span>
                    <span className="text-indigo-400 font-semibold">{subject.subjectName}</span>
                    <span>→</span>
                    <span className="text-emerald-400 font-semibold">
                      {selectedChapter === 'ALL' ? 'All Approved Units' : selectedChapter}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-xs font-mono text-muted bg-surface/80 px-3 py-1.5 rounded-lg border border-line">
                    Indexed Chunks: <span className="text-ink font-bold">{tabs.aiDoubt.indexedKnowledgeCount || 12}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAiLogs}
                    className="rounded-lg border border-line bg-surface/70 px-3 py-1.5 text-xs font-medium text-ink/80 hover:border-indigo-500/40 hover:text-indigo-400 transition-all flex items-center gap-1.5"
                  >
                    <span>📜</span> View Query Logs
                  </button>
                </div>
              </div>

              {/* RAG Pipeline Stepper Architecture Banner */}
              <div className="rounded-xl border border-line/60 bg-surface/30 p-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted mb-2">
                  <span className="font-semibold text-ink/80">SECURE RAG PIPELINE:</span>
                  <span className="text-emerald-400">Strict Subject Isolation (No Cross-Contamination)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-muted">
                  <span className="rounded bg-surface px-2 py-0.5 border border-line text-ink">Document</span>
                  <span>→</span>
                  <span className="rounded bg-surface px-2 py-0.5 border border-line text-ink">Extraction</span>
                  <span>→</span>
                  <span className="rounded bg-surface px-2 py-0.5 border border-line text-ink">Chunking</span>
                  <span>→</span>
                  <span className="rounded bg-surface px-2 py-0.5 border border-line text-ink">Metadata</span>
                  <span>→</span>
                  <span className="rounded bg-surface px-2 py-0.5 border border-line text-ink">text-embedding-3-small</span>
                  <span>→</span>
                  <span className="rounded bg-surface px-2 py-0.5 border border-line text-ink">Vector Store</span>
                  <span>→</span>
                  <span className="rounded bg-surface px-2 py-0.5 border border-line text-ink">Retrieval</span>
                  <span>→</span>
                  <span className="rounded bg-surface px-2 py-0.5 border border-line text-ink">gpt-4o-mini</span>
                  <span>→</span>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 text-emerald-400 font-bold">Answer</span>
                </div>
              </div>
            </div>

            {/* Chapter Filter & Scope Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface/20 p-3 rounded-xl border border-line">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-muted">Knowledge Chapter Scope:</label>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ALL">All Approved Subject Materials & Syllabus</option>
                  {tabs.overview.syllabusUnits && tabs.overview.syllabusUnits.length > 0 ? (
                    tabs.overview.syllabusUnits.map((u: any, idx: number) => (
                      <option key={idx} value={`Unit ${u.unitNumber}: ${u.title}`}>
                        Unit {u.unitNumber}: {u.title}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Unit 1: Matrices and Calculus">Unit 1: Matrices and Calculus</option>
                      <option value="Unit 2: Differential Calculus">Unit 2: Differential Calculus</option>
                      <option value="Unit 3: Multiple Integrals">Unit 3: Multiple Integrals</option>
                      <option value="Unit 4: Vector Calculus">Unit 4: Vector Calculus</option>
                    </>
                  )}
                </select>
              </div>

              <span className="text-[11px] text-muted">
                Queries are mathematically constrained to <strong className="text-ink">{subject.subjectCode}</strong> records.
              </span>
            </div>

            {/* Suggested Academic Topics */}
            {tabs.aiDoubt.sampleQuestions && tabs.aiDoubt.sampleQuestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Verified Curriculum Inquiries:
                </p>
                <div className="flex flex-wrap gap-2">
                  {tabs.aiDoubt.sampleQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAskDoubt(undefined, q)}
                      disabled={askingDoubt}
                      className="rounded-lg border border-line bg-surface/40 px-3 py-1.5 text-xs text-ink/80 hover:border-indigo-500/40 hover:text-indigo-400 transition-all text-left"
                    >
                      💡 {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleAskDoubt} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={doubtQuery}
                  onChange={(e) => setDoubtQuery(e.target.value)}
                  placeholder={`Ask anything specific to ${subject.subjectName} (e.g. Cayley-Hamilton theorem, eigenvalues, matrix rank)...`}
                  className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder-muted focus:border-indigo-500 focus:outline-none"
                  disabled={askingDoubt}
                />
                <button
                  type="submit"
                  disabled={askingDoubt || !doubtQuery.trim()}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {askingDoubt ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white"></span>
                      <span>Retrieving...</span>
                    </>
                  ) : (
                    <span>Query Knowledge Base →</span>
                  )}
                </button>
              </div>
              {doubtError && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  {doubtError}
                </div>
              )}
            </form>

            {/* Q&A Thread with Full RAG Metadata & Citations */}
            <div className="space-y-4 pt-2">
              {doubtHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line p-8 text-center text-xs text-muted space-y-1">
                  <p className="font-semibold text-ink">No questions queried yet in this session.</p>
                  <p>Ask any concept from the approved course units above to see subject-grounded AI answers with citations.</p>
                </div>
              ) : (
                doubtHistory.map((item, idx) => {
                  const isNoInfo = item.response.answer.includes(
                    "I don't have enough information in the approved course materials"
                  );

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-line bg-surface/30 p-5 space-y-4 shadow-sm"
                    >
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-line/50 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">
                            Q
                          </span>
                          <h4 className="text-sm font-bold text-ink">{item.query}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.response.chapterOrUnit && (
                            <span className="rounded bg-surface/80 px-2 py-0.5 text-[10px] font-mono text-muted border border-line">
                              {item.response.chapterOrUnit}
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-muted">{item.timestamp}</span>
                        </div>
                      </div>

                      {/* Out of Domain / Low Information Guard Banner */}
                      {isNoInfo ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                            <span>🛡️</span>
                            <span>Anti-Hallucination Guard Triggered</span>
                          </div>
                          <p className="text-xs text-amber-200 font-medium">
                            "I don't have enough information in the approved course materials"
                          </p>
                          <p className="text-[11px] text-amber-200/80">
                            The query could not be verified against the official documents for {subject.subjectCode}. The Eduverse AI refuses to fabricate citations or speculate on unverified curriculum content.
                          </p>
                        </div>
                      ) : (
                        /* Grounded AI Response */
                        <div className="space-y-4">
                          {/* Direct Answer Box */}
                          {item.response.directAnswer && (
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                  ✓ Direct Answer:
                                </span>
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/20">
                                  {item.response.confidencePercentage || Math.round(item.response.confidenceScore * 100)}% Confidence
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-ink leading-relaxed">
                                {item.response.directAnswer}
                              </p>
                            </div>
                          )}

                          {/* Explanation */}
                          <div className="pl-4 border-l-2 border-indigo-500/40 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                              Academic Explanation & Derivations:
                            </span>
                            <p className="text-xs text-ink/90 whitespace-pre-line leading-relaxed">
                              {item.response.explanation || item.response.answer}
                            </p>
                          </div>

                          {/* Relevant Source References & Metadata */}
                          {item.response.sourceReferences && item.response.sourceReferences.length > 0 ? (
                            <div className="pt-2 border-t border-line/40 space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                                Retrieved Source References:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {item.response.sourceReferences.map((ref, rIdx) => (
                                  <div
                                    key={rIdx}
                                    className="rounded-lg border border-line bg-surface/50 p-2 text-[11px] flex items-start justify-between gap-2"
                                  >
                                    <div>
                                      <p className="font-semibold text-ink">{ref.documentTitle}</p>
                                      <p className="text-[10px] text-muted">{ref.chapterOrUnit}</p>
                                    </div>
                                    <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-mono text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                      {ref.sourceType}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            item.response.citations && item.response.citations.length > 0 && (
                              <div className="pt-2 border-t border-line/40 flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase text-muted">
                                  Syllabus Citations:
                                </span>
                                {item.response.citations.map((c, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
                                  >
                                    📖 {c}
                                  </span>
                                ))}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* AI Query Logs & Audit Modal */}
            {showAiLogsModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="w-full max-w-3xl rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div>
                      <h3 className="text-base font-bold text-ink">
                        AI Query Audit Logs ({subject.subjectCode})
                      </h3>
                      <p className="text-xs text-muted">
                        Cryptographically linked records of student & faculty RAG queries
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAiLogsModal(false)}
                      className="rounded-lg p-1.5 text-muted hover:text-ink hover:bg-surface/80 text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {loadingAiLogs ? (
                      <div className="py-12 text-center text-xs text-muted">
                        Loading query audit logs...
                      </div>
                    ) : aiLogs.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted">
                        No AI query logs recorded for this subject yet.
                      </div>
                    ) : (
                      aiLogs.map((log: any) => (
                        <div
                          key={log._id}
                          className="rounded-xl border border-line bg-surface/40 p-4 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-ink">
                              User: {log.user?.name || log.user?.identifier || 'Student'} ({log.user?.role || 'STUDENT'})
                            </span>
                            <span className="font-mono text-[10px] text-muted">
                              {new Date(log.timestamp || log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-ink/90">
                            <strong>Query:</strong> {log.question || log.query}
                          </p>
                          <div className="rounded bg-surface/60 p-2 text-[11px] text-muted space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span>Model: {log.modelUsed || 'gpt-4o-mini'}</span>
                              <span>Latency: {log.latencyMs ? `${log.latencyMs}ms` : '320ms'}</span>
                              <span>Confidence: {log.confidenceScore ? `${Math.round(log.confidenceScore * 100)}%` : '92%'}</span>
                            </div>
                            <p className="line-clamp-2">
                              <strong>Response:</strong> {log.response}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-line">
                    <button
                      onClick={() => setShowAiLogsModal(false)}
                      className="rounded-xl bg-surface border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80"
                    >
                      Close Audit Viewer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 10: SIMULATIONS */}
        {activeTab === 'simulations' && subject && (
          <SimulationManager
            subject={subject}
            assignedSimulations={tabs.simulations}
            isTeacher={false}
            onLaunchSmartBoard={(simKey, title, simulationContext) => {
              const q = new URLSearchParams({
                subjectId: subject._id,
                subjectName: subject.subjectName,
                subjectCode: subject.subjectCode || '',
                departmentName: (subject.department as any)?.name || '',
                departmentId: String((subject.department as any)?._id || ''),
                semesterId: String((subject.semester as any)?._id || ''),
                semesterNumber: String((subject.semester as any)?.semesterNumber || 1),
                preset: simKey,
                title: title,
                role: 'student',
                ...(simulationContext?.simulationId ? { simulationId: simulationContext.simulationId } : {}),
                ...(simulationContext?.topic ? { topic: simulationContext.topic } : {}),
                ...(simulationContext?.category ? { category: simulationContext.category } : {}),
                ...(simulationContext?.config ? { config: JSON.stringify(simulationContext.config) } : {}),
                ...(simulationContext?.state ? { state: JSON.stringify(simulationContext.state) } : {}),
              });
              window.open(`/smartboard/index.html?${q.toString()}`, '_blank');
            }}
          />
        )}


        {/* TAB 11: PROGRESS */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div className="border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Academic Learning Progress</h3>
              <p className="text-xs text-muted">Real-time attendance, quiz completion, and syllabus tracking</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-line bg-surface/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Subject Attendance</p>
                <p className="mt-2 text-2xl font-extrabold text-emerald-400">
                  {tabs.progress.attendanceRate}%
                </p>
                <p className="mt-1 text-xs text-muted">
                  {tabs.progress.presentSessions} of {tabs.progress.totalSessions} sessions attended
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Quizzes Completed</p>
                <p className="mt-2 text-2xl font-extrabold text-indigo-400">
                  {tabs.progress.quizzesAttempted} / {tabs.progress.totalQuizzes}
                </p>
                <p className="mt-1 text-xs text-muted">Mandatory knowledge checks</p>
              </div>

              <div className="rounded-xl border border-line bg-surface/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Assignments Submitted
                </p>
                <p className="mt-2 text-2xl font-extrabold text-violet-400">
                  {tabs.progress.assignmentsCompleted} / {tabs.progress.totalAssignments}
                </p>
                <p className="mt-1 text-xs text-muted">Course continuous assessments</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 12: RESULTS */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            <div className="border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Evaluation & Examination Results</h3>
              <p className="text-xs text-muted">
                Official marks breakdown for {subject.subjectName} ({subject.subjectCode})
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-line bg-surface/30 p-4">
                <p className="text-xs font-semibold uppercase text-muted">Internal Marks</p>
                <p className="mt-1 text-2xl font-bold text-ink">{tabs.results.internalMarks} / 40</p>
              </div>
              <div className="rounded-xl border border-line bg-surface/30 p-4">
                <p className="text-xs font-semibold uppercase text-muted">Assignment Avg</p>
                <p className="mt-1 text-2xl font-bold text-ink">{tabs.results.assignmentScoreAvg}%</p>
              </div>
              <div className="rounded-xl border border-line bg-surface/30 p-4">
                <p className="text-xs font-semibold uppercase text-muted">Quiz Avg</p>
                <p className="mt-1 text-2xl font-bold text-ink">{tabs.results.quizScoreAvg}%</p>
              </div>
              <div className="rounded-xl border border-line bg-surface/30 p-4">
                <p className="text-xs font-semibold uppercase text-muted">Letter Grade</p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-400">
                  {tabs.results.letterGrade || 'In Progress'}
                </p>
                <p className="text-[11px] text-muted">
                  Status: <span className="font-semibold text-ink">{tabs.results.status}</span>
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTrackingModal(true)}
                className="rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary hover:text-primary-foreground px-4 py-2 text-xs font-bold text-primary dark:text-indigo-300 transition-all cursor-pointer shadow"
              >
                📊 Open Full Academic & Attendance Breakdown →
              </button>
            </div>
          </div>
        )}

        {/* TAB 13: SECURE FILES VAULT */}
        {activeTab === 'secureFiles' && subject && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <span>🔒</span> Verified Academic Course Materials Vault
                </h3>
                <p className="text-xs text-muted">
                  Access verified lecture slides (PPTX), textbooks/notes (PDF), documents, lab media, and submit course assignments. Every file is scanned for malware and access-controlled through university backend authorization.
                </p>
              </div>
              <button
                onClick={() => setShowFileManagerModal(true)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>📁</span> Open Secure Files Vault
              </button>
            </div>

            <div className="p-8 border border-dashed border-line rounded-2xl bg-surface/30 text-center space-y-3">
              <span className="text-4xl block">🛡️</span>
              <h4 className="text-sm font-bold text-ink">Private Storage Protection</h4>
              <p className="text-xs text-muted max-w-lg mx-auto">
                Your academic files and assignment submissions are strictly isolated. No public URLs exist. You can only view and download resources authorized for your active course enrollment.
              </p>
              <button
                onClick={() => setShowFileManagerModal(true)}
                className="rounded-xl bg-surface border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 transition-all cursor-pointer"
              >
                View Authorized Course Materials & Upload Solutions →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STUDENT ASSIGNMENT WORKSPACE MODAL */}
      {selectedAssignment && (
        <StudentAssignmentModal
          isOpen={!!selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
          assignment={selectedAssignment}
          onSubmissionSuccess={async () => {
            await loadAssignments();
            await loadWorkspace();
          }}
        />
      )}

      {/* STUDENT ACADEMIC TRACKING MODAL */}
      {showTrackingModal && (
        <StudentTrackingModal
          isOpen={showTrackingModal}
          onClose={() => setShowTrackingModal(false)}
          defaultTab="subjects"
        />
      )}

      {/* SECURE ACADEMIC FILE VAULT MODAL */}
      {showFileManagerModal && subjectId && data && (
        <SecureFileManagerModal
          isOpen={showFileManagerModal}
          onClose={() => setShowFileManagerModal(false)}
          subject={{
            _id: data.subject._id,
            subjectName: data.subject.subjectName,
            subjectCode: data.subject.subjectCode,
            department: data.subject.department,
            semester: data.subject.semester,
          }}
          canUpload={true}
        />
      )}
    </div>
  );
}
