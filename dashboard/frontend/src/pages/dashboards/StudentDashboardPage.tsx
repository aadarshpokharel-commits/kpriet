import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { AcademicService } from '@/services/academic.service';
import { StudentTrackingModal } from '@/pages/student/StudentTrackingModal';
import { StudentAssignmentModal } from '@/pages/assignment/StudentAssignmentModal';
import { SimulationManager } from '@/simulations';
import type {
  IStudentDashboardOverview,
  INextAvailableSemesterData,
  ISemesterArchiveItem,
  ISyllabusUnit,
  ISubjectWorkspaceData,
  IAIDoubtResponse,
} from '@/types/academic.types';

export function StudentDashboardPage() {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Primary live state
  const [overview, setOverview] = useState<IStudentDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab Filtering & Search State
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Course workspace on-demand cache
  const [subjectWorkspaces, setSubjectWorkspaces] = useState<Record<string, ISubjectWorkspaceData>>({});
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  // Assignment Modal State
  const [selectedAssignmentForModal, setSelectedAssignmentForModal] = useState<any | null>(null);

  // AI Doubt State
  const [doubtSubjectId, setDoubtSubjectId] = useState<string>('');
  const [doubtQuery, setDoubtQuery] = useState('');
  const [doubtChapter, setDoubtChapter] = useState('ALL');
  const [askingDoubt, setAskingDoubt] = useState(false);
  const [doubtHistory, setDoubtHistory] = useState<
    Array<{ query: string; response: IAIDoubtResponse; timestamp: string }>
  >([]);
  const [doubtError, setDoubtError] = useState<string | null>(null);

  // Modals state
  const [activeSubjectUnits, setActiveSubjectUnits] = useState<{
    subjectName: string;
    subjectCode: string;
    units: ISyllabusUnit[];
  } | null>(null);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Next Semester Modal
  const [showNextModal, setShowNextModal] = useState(false);
  const [nextSemData, setNextSemData] = useState<INextAvailableSemesterData | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [submittingEnrollment, setSubmittingEnrollment] = useState(false);
  const [enrollmentSuccessMsg, setEnrollmentSuccessMsg] = useState<string | null>(null);
  const [enrollmentErrMsg, setEnrollmentErrMsg] = useState<string | null>(null);

  // Archive Modal
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveData, setArchiveData] = useState<ISemesterArchiveItem[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [selectedArchiveSem, setSelectedArchiveSem] = useState<number | null>(null);

  // Tracking & Results Modal
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingModalTab, setTrackingModalTab] = useState<'overview' | 'subjects' | 'attendance'>('overview');

  useEffect(() => {
    loadOverview();
  }, []);

  // When enrolled subjects arrive, default the doubtSubjectId to the first course
  useEffect(() => {
    if (overview?.enrolledSubjects && overview.enrolledSubjects.length > 0 && !doubtSubjectId) {
      const firstSubject = overview.enrolledSubjects[0];
      if (firstSubject) {
        setDoubtSubjectId(firstSubject._id);
      }
    }
  }, [overview, doubtSubjectId]);

  // Load subject workspace on-demand when student selects a specific subject in content tabs
  useEffect(() => {
    if (
      selectedSubjectFilter !== 'ALL' &&
      !subjectWorkspaces[selectedSubjectFilter] &&
      overview?.enrolledSubjects.some((s) => s._id === selectedSubjectFilter)
    ) {
      loadSpecificWorkspace(selectedSubjectFilter);
    }
  }, [selectedSubjectFilter, subjectWorkspaces, overview]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AcademicService.getStudentDashboardOverview();
      setOverview(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to load student dashboard. Please ensure you have an active academic profile.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSpecificWorkspace = async (subjectId: string) => {
    try {
      setLoadingWorkspace(true);
      const ws = await AcademicService.getSubjectWorkspace(subjectId);
      setSubjectWorkspaces((prev) => ({ ...prev, [subjectId]: ws }));
    } catch (err) {
      console.warn('Failed to load specific workspace for subject', subjectId, err);
    } finally {
      setLoadingWorkspace(false);
    }
  };

  const handleViewUnits = async (subjectId: string, subjectName: string, subjectCode: string) => {
    try {
      setLoadingUnits(true);
      const units = await AcademicService.getChapters(subjectId);
      setActiveSubjectUnits({
        subjectName,
        subjectCode,
        units,
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to fetch syllabus units.');
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleOpenNextSemesterModal = async () => {
    setShowNextModal(true);
    setEnrollmentSuccessMsg(null);
    setEnrollmentErrMsg(null);
    try {
      setLoadingNext(true);
      const res = await AcademicService.getNextAvailableSemester();
      setNextSemData(res);
      if (res.availableSubjects) {
        setSelectedSubjectIds(res.availableSubjects.map((s) => s._id));
      }
    } catch (err: any) {
      setEnrollmentErrMsg(err?.response?.data?.message || err?.message || 'Failed to load next term data.');
    } finally {
      setLoadingNext(false);
    }
  };

  const handleSubmitEnrollment = async () => {
    if (!nextSemData?.nextSemester || selectedSubjectIds.length === 0 || !overview?.student.department) {
      return;
    }

    try {
      setSubmittingEnrollment(true);
      setEnrollmentErrMsg(null);
      await AcademicService.requestEnrollment({
        departmentId: overview.student.department._id,
        semesterId: nextSemData.nextSemester._id,
        academicYear: nextSemData.nextSemester.academicYear,
        enrolledSubjectIds: selectedSubjectIds,
      });
      setEnrollmentSuccessMsg(
        'Enrollment request submitted successfully! Your department HOD will review and approve your registration.'
      );
      const updated = await AcademicService.getNextAvailableSemester();
      setNextSemData(updated);
    } catch (err: any) {
      setEnrollmentErrMsg(
        err?.response?.data?.message || err?.message || 'Failed to submit enrollment request.'
      );
    } finally {
      setSubmittingEnrollment(false);
    }
  };

  const handleOpenArchiveModal = async () => {
    setShowArchiveModal(true);
    try {
      setLoadingArchive(true);
      const res = await AcademicService.getSemesterArchive();
      setArchiveData(res);
      if (res.length > 0 && res[0] && selectedArchiveSem === null) {
        setSelectedArchiveSem(res[0].semester.semesterNumber);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to load semester archive.');
    } finally {
      setLoadingArchive(false);
    }
  };

  const handleAskDoubt = async (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const query = presetQuery || doubtQuery;
    if (!query.trim() || !doubtSubjectId) return;

    try {
      setAskingDoubt(true);
      setDoubtError(null);
      const res = await AcademicService.askSubjectAIDoubt(doubtSubjectId, query, {
        chapter: doubtChapter !== 'ALL' ? doubtChapter : undefined,
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500"></div>
        <p className="text-sm font-medium text-muted">Loading your academic records & courses...</p>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-xl flex items-center justify-center mx-auto">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-ink">Academic Profile Alert</h2>
        <p className="text-sm text-rose-700 dark:text-rose-300 font-medium leading-relaxed">{error}</p>
        <div className="pt-2">
          <button
            onClick={() => loadOverview()}
            className="rounded-xl bg-panel border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-surface transition-all cursor-pointer"
          >
            ↻ Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const {
    programme,
    student,
    currentSemester,
    enrolledSubjects,
    recentNotes,
    upcomingQuizzes,
    pendingAssignments,
    recentResults,
    attendanceSummary,
    announcements,
    academicProgress,
  } = overview;

  // Active workspace for selected course (if single course selected)
  const currentWorkspace =
    selectedSubjectFilter !== 'ALL' ? subjectWorkspaces[selectedSubjectFilter] : null;

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Top Header & Student Identity ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              Student Portal
            </span>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
              Roll No: {student.identifier || user?.identifier}
            </span>
            <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-300 border border-violet-500/20">
              Semester {currentSemester.semesterNumber} Active
            </span>
            {student.department && (
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted border border-line">
                {student.department.name} ({student.department.code})
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
            Welcome back, {student.name || user?.name}
          </h1>
          {(programme || student.department) && (
            <div className="mt-1 space-y-0.5">
              <p className="whitespace-normal break-words text-sm font-semibold text-ink">
                {programme?.name || student.department?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {programme?.type || 'B.E.'} – {programme?.regulationLabel || `${currentSemester.regulation || 'R2021'} CBCS`} ·
                Semester {currentSemester.semesterNumber}
              </p>
            </div>
          )}
          <p className="text-sm text-muted">
            College Email: <span className="font-mono text-ink">{student.collegeEmail}</span> • Status:{' '}
            <span className="text-emerald-400 font-semibold">Active & Enrolled</span> • Term:{' '}
            <span className="text-ink font-mono">{currentSemester.academicYear}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              setTrackingModalTab('overview');
              setShowTrackingModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 px-3.5 py-2 text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-600 hover:text-white transition-all cursor-pointer shadow"
          >
            <span>📊</span> Academic Tracking & Marks
          </button>
          <button
            onClick={handleOpenNextSemesterModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary dark:text-indigo-300 hover:bg-primary hover:text-white transition-all cursor-pointer"
          >
            <span>⏩</span> Next Term Enrollment
          </button>
          <button
            onClick={handleOpenArchiveModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3.5 py-2 text-xs font-bold text-ink hover:bg-surface transition-all cursor-pointer"
          >
            <span>📜</span> Past Semesters Archive
          </button>
          <a
            href="/smartboard"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-all"
          >
            <span>🚀</span> Interactive Board
          </a>
          <button
            onClick={() => logout()}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          COURSE FILTER & SEARCH TOOLBAR (For content tabs)
      ══════════════════════════════════════════════════════════ */}
      {activeTab !== 'overview' &&
        activeTab !== 'semesterManagement' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-4 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Course:</span>
              <button
                type="button"
                onClick={() => setSelectedSubjectFilter('ALL')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedSubjectFilter === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-surface border border-line text-muted hover:text-ink'
                }`}
              >
                All Courses ({enrolledSubjects.length})
              </button>
              {enrolledSubjects.map((sub) => (
                <button
                  key={sub._id}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(sub._id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    selectedSubjectFilter === sub._id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-surface border border-line text-muted hover:text-ink'
                  }`}
                >
                  {sub.subjectCode}
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items, titles, topics..."
                className="w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink placeholder:text-muted focus:border-emerald-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-[10px] text-muted hover:text-ink cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

      {/* ══════════════════════════════════════════════════════════
          TAB 1: OVERVIEW
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Metric Cards (Live MongoDB Data) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-4">
            <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Active Semester</p>
              <p className="mt-2 text-3xl font-extrabold text-indigo-400">
                Semester {currentSemester.semesterNumber}
              </p>
              <p className="mt-1 text-xs text-muted">
                {currentSemester.academicYear} • {currentSemester.regulation}
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Enrolled Courses</p>
              <p className="mt-2 text-3xl font-extrabold text-ink">{enrolledSubjects.length}</p>
              <p className="mt-1 text-xs text-muted">
                {academicProgress.creditsEnrolled} Registered Credits
              </p>
            </div>

            <div
              onClick={() => {
                setTrackingModalTab('subjects');
                setShowTrackingModal(true);
              }}
              className="rounded-2xl border border-line bg-panel p-5 shadow-sm hover:border-emerald-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Cumulative GPA (CGPA)</p>
                <span className="text-[10px] text-emerald-400 font-bold">View Marks →</span>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-emerald-400">
                {academicProgress.cgpa > 0 ? academicProgress.cgpa.toFixed(2) : '0.00'}
              </p>
              <p className="mt-1 text-xs text-muted">
                Current Term GPA: {recentResults.gpa > 0 ? recentResults.gpa.toFixed(2) : '0.00'}
              </p>
            </div>

            <div
              onClick={() => {
                setTrackingModalTab('attendance');
                setShowTrackingModal(true);
              }}
              className="rounded-2xl border border-line bg-panel p-5 shadow-sm hover:border-teal-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Overall Attendance</p>
                <span className="text-[10px] text-teal-400 font-bold">Details →</span>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-teal-400">
                {attendanceSummary.attendancePercentage}%
              </p>
              <p className="mt-1 text-xs text-muted">
                {attendanceSummary.presentSessions} / {attendanceSummary.totalSessions} Sessions Attended
              </p>
            </div>
          </div>

          {/* Enrolled Subjects Cards with Faculty Names */}
          <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
              <div>
                <h2 className="text-lg font-bold text-ink">My Enrolled Course Workspace</h2>
                <p className="text-xs text-muted mt-0.5">
                  Authorized courses with dedicated workspaces, lecture materials, and AI doubt solvers.
                </p>
              </div>
              <button
                onClick={() => loadOverview()}
                className="rounded-lg border border-line bg-surface/50 px-3 py-1.5 text-xs text-muted hover:text-ink transition-colors cursor-pointer"
              >
                ↻ Refresh Curriculum
              </button>
            </div>

            {enrolledSubjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line p-12 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xl">
                  🎓
                </div>
                <h3 className="mt-3 text-sm font-semibold text-ink">No Enrolled Subjects Found</h3>
                <p className="mt-1 text-xs text-muted max-w-md mx-auto">
                  You do not have any approved course enrollments yet for Semester {currentSemester.semesterNumber}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6">
                {enrolledSubjects.map((sub) => {
                  return (
                    <div
                      key={sub._id}
                      className="flex flex-col justify-between rounded-xl border border-line bg-surface/30 p-5 hover:border-indigo-500/40 transition-all space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {sub.subjectCode}
                          </span>
                          <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-muted border border-line">
                            {sub.credits} Credits
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-ink leading-snug">{sub.subjectName}</h3>
                          <p className="text-xs text-muted mt-1">Semester {sub.semesterNumber}</p>
                        </div>

                        <div className="pt-2 border-t border-line/50">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                            Assigned Faculty:
                          </p>
                          {sub.faculty && sub.faculty.length > 0 ? (
                            <div className="mt-1 space-y-1">
                              {sub.faculty.map((f, fIdx) => (
                                <div key={fIdx} className="text-xs text-ink/90 flex items-center gap-1.5">
                                  <span>👨‍🏫</span>
                                  <span className="font-semibold">{f.name}</span>
                                  <span className="text-[11px] text-muted">
                                    ({f.designation || 'Faculty'})
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted mt-0.5">Faculty assignment pending</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-line/60 flex items-center gap-2">
                        <button
                          onClick={() => handleViewUnits(sub._id, sub.subjectName, sub.subjectCode)}
                          className="rounded-lg border border-line bg-panel px-3 py-2 text-xs font-semibold text-ink hover:bg-surface transition-all text-center cursor-pointer"
                        >
                          Syllabus
                        </button>
                        <Link
                          to={`/student/subjects/${sub._id}`}
                          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-all text-center shadow"
                        >
                          Open Workspace →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Two-Column Operations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Recent Notes */}
              <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📝</span>
                    <h3 className="text-sm font-bold text-ink">Recent Lecture Notes & Handouts</h3>
                  </div>
                  <span className="text-xs text-muted font-mono">{recentNotes.length} recent</span>
                </div>

                {recentNotes.length === 0 ? (
                  <p className="text-xs text-muted py-4 text-center">No notes published recently.</p>
                ) : (
                  <div className="space-y-3">
                    {recentNotes.slice(0, 4).map((note) => (
                      <div
                        key={note._id}
                        className="flex items-center justify-between rounded-xl border border-line bg-surface/30 p-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                              {note.subject?.subjectCode || 'Course'}
                            </span>
                            <span className="text-xs font-bold text-ink">{note.title}</span>
                          </div>
                          <p className="text-[11px] text-muted mt-0.5">
                            Uploaded by {note.teacher?.name || 'Faculty'} •{' '}
                            {new Date(note.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        {note.attachments && note.attachments[0] && (
                          <a
                            href={note.attachments[0].url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-surface border border-line px-2.5 py-1 text-xs font-semibold text-ink hover:bg-surface/80"
                          >
                            Open ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Assignments */}
              <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <h3 className="text-sm font-bold text-ink">Continuous Problem Sets & Assignments</h3>
                  </div>
                  <span className="text-xs text-muted font-mono">{pendingAssignments.length} total</span>
                </div>

                {pendingAssignments.length === 0 ? (
                  <p className="text-xs text-muted py-4 text-center">No pending assignments.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingAssignments.slice(0, 4).map((a) => (
                      <div
                        key={a._id}
                        className="flex items-center justify-between rounded-xl border border-line bg-surface/30 p-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                                a.submissionStatus === 'SUBMITTED'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {a.submissionStatus}
                            </span>
                            <span className="text-xs font-bold text-ink">{a.title}</span>
                          </div>
                          <p className="text-[11px] text-muted mt-0.5">
                            {a.subject?.subjectCode} • Max {a.maxMarks} Marks
                            {a.dueDate && ` • Due: ${new Date(a.dueDate).toLocaleDateString()}`}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedAssignmentForModal(a)}
                          className="rounded-lg bg-surface border border-line px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                        >
                          Submit →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Upcoming Quizzes */}
              <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">✍️</span>
                    <h3 className="text-sm font-bold text-ink">Upcoming Quizzes & Assessments</h3>
                  </div>
                  <span className="text-xs text-muted font-mono">{upcomingQuizzes.length} scheduled</span>
                </div>

                {upcomingQuizzes.length === 0 ? (
                  <p className="text-xs text-muted py-4 text-center">No active quizzes scheduled.</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingQuizzes.slice(0, 4).map((q) => (
                      <div
                        key={q._id}
                        className="flex items-center justify-between rounded-xl border border-line bg-surface/30 p-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                                q.attemptStatus === 'ATTEMPTED'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {q.attemptStatus}
                            </span>
                            <span className="text-xs font-bold text-ink">{q.title}</span>
                          </div>
                          <p className="text-[11px] text-muted mt-0.5">
                            {q.subject?.subjectCode} • {q.durationMinutes} mins • {q.totalMarks} Marks
                          </p>
                        </div>

                        {q.attemptStatus === 'ATTEMPTED' ? (
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            {q.score} / {q.totalMarks}
                          </span>
                        ) : q.subject ? (
                          <Link
                            to={`/student/subjects/${q.subject._id}?tab=quizzes`}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                          >
                            Attempt
                          </Link>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attendance Summary */}
              <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📊</span>
                    <h3 className="text-sm font-bold text-ink">Course-wise Attendance Breakdown</h3>
                  </div>
                  <span className="text-xs font-bold text-teal-400 font-mono">
                    {attendanceSummary.attendancePercentage}% Aggregate
                  </span>
                </div>

                {attendanceSummary.bySubject.length === 0 ? (
                  <p className="text-xs text-muted py-4 text-center">Attendance data pending synchronization.</p>
                ) : (
                  <div className="space-y-3">
                    {attendanceSummary.bySubject.map((s, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-ink">
                            {s.subjectCode} - {s.subjectName}
                          </span>
                          <span
                            className={`font-bold font-mono ${
                              s.percentage >= 75 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {s.percentage}% ({s.present}/{s.total})
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              s.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${s.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <span className="text-base">📢</span>
                <h3 className="text-sm font-bold text-ink">Official Department Announcements</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {announcements.map((ann) => (
                  <div key={ann._id} className="rounded-xl border border-line bg-surface/30 p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-ink">{ann.title}</h4>
                      <span className="text-[10px] font-mono text-muted">
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {ann.description && (
                      <p className="text-xs text-muted line-clamp-2 leading-relaxed">{ann.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: NOTES
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'notes' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Lecture Notes & Handouts</h2>
              <p className="text-xs text-muted">
                Faculty-uploaded course notes, lecture summaries, and unit study guides.
              </p>
            </div>
            <span className="text-xs font-mono text-muted">
              {recentNotes.filter((n) =>
                selectedSubjectFilter === 'ALL' ? true : n.subject?._id === selectedSubjectFilter
              ).length}{' '}
              Handouts Available
            </span>
          </div>

          {loadingWorkspace ? (
            <div className="py-12 text-center text-xs text-muted animate-pulse">
              Loading course notes...
            </div>
          ) : (
            (() => {
              const allNotes =
                selectedSubjectFilter !== 'ALL' && currentWorkspace
                  ? currentWorkspace.tabs.notes
                  : recentNotes;

              const filtered = allNotes.filter((n) => {
                const matchesSubject =
                  selectedSubjectFilter === 'ALL' ||
                  (n.subject && n.subject._id === selectedSubjectFilter);
                const matchesSearch =
                  !searchQuery.trim() ||
                  n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  n.description?.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesSubject && matchesSearch;
              });

              if (filtered.length === 0) {
                return (
                  <div className="rounded-2xl border border-dashed border-line p-12 text-center">
                    <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-lg">
                      📝
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-ink">No Lecture Notes Found</h3>
                    <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                      No notes matching your current course filter or search query were found.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
                  {filtered.map((note) => (
                    <div
                      key={note._id}
                      className="rounded-xl border border-line bg-surface/30 p-4 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                            {note.subject?.subjectCode || 'Course'}
                          </span>
                          {note.chapterOrUnit && (
                            <span className="text-[10px] font-semibold text-muted bg-surface px-2 py-0.5 rounded border border-line">
                              Unit {note.chapterOrUnit}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-ink">{note.title}</h4>
                        {note.description && (
                          <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                            {note.description}
                          </p>
                        )}
                        <p className="text-[11px] text-muted">
                          By {note.teacher?.name || 'Faculty'} •{' '}
                          {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                        <span className="text-[10px] text-muted font-mono">
                          {note.attachments?.length || 0} Attachments
                        </span>
                        {note.attachments && note.attachments[0] && (
                          <a
                            href={note.attachments[0].url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm"
                          >
                            Open Handout ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: MATERIALS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'materials' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Course Materials & References</h2>
              <p className="text-xs text-muted">
                Official textbooks, syllabus documents, question banks, and lab reference materials.
              </p>
            </div>
          </div>

          {(() => {
            const mats =
              selectedSubjectFilter !== 'ALL' && currentWorkspace
                ? currentWorkspace.tabs.materials
                : [];

            if (selectedSubjectFilter === 'ALL') {
              return (
                <div className="rounded-2xl border border-dashed border-line p-10 text-center space-y-3">
                  <div className="text-2xl">📚</div>
                  <h3 className="text-sm font-bold text-ink">Select a Course to View Materials</h3>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Please click on one of your enrolled course chips above to inspect its syllabus materials, lab manuals, and reference documents.
                  </p>
                </div>
              );
            }

            if (loadingWorkspace) {
              return <div className="py-12 text-center text-xs text-muted animate-pulse">Loading course materials...</div>;
            }

            const filtered = mats.filter(
              (m: any) =>
                !searchQuery.trim() ||
                m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filtered.length === 0) {
              return (
                <div className="rounded-2xl border border-dashed border-line p-12 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-lg">
                    📁
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-ink">No Materials Uploaded Yet</h3>
                  <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                    Your course instructor has not yet published reference materials for this subject.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
                {filtered.map((mat: any) => (
                  <div key={mat._id} className="rounded-xl border border-line bg-surface/30 p-4 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                          Reference Text
                        </span>
                        <span className="text-[10px] text-muted font-mono">
                          {new Date(mat.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-ink">{mat.title}</h4>
                      {mat.description && <p className="text-xs text-muted mt-1 leading-relaxed">{mat.description}</p>}
                    </div>

                    <div className="pt-2 border-t border-line/60 flex justify-end">
                      {mat.attachments && mat.attachments[0] && (
                        <a
                          href={mat.attachments[0].url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          Download / View ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4: VIDEOS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'videos' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Lecture Recordings & Videos</h2>
              <p className="text-xs text-muted">
                Classroom session recordings, problem-solving video walkthroughs, and simulations demonstrations.
              </p>
            </div>
          </div>

          {(() => {
            const vids =
              selectedSubjectFilter !== 'ALL' && currentWorkspace
                ? currentWorkspace.tabs.videos
                : [];

            if (selectedSubjectFilter === 'ALL') {
              return (
                <div className="rounded-2xl border border-dashed border-line p-10 text-center space-y-3">
                  <div className="text-2xl">🎥</div>
                  <h3 className="text-sm font-bold text-ink">Select a Course to View Video Lectures</h3>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Please select an enrolled subject from the filters above to access recorded lecture streams.
                  </p>
                </div>
              );
            }

            if (loadingWorkspace) {
              return <div className="py-12 text-center text-xs text-muted animate-pulse">Loading video lectures...</div>;
            }

            const filtered = vids.filter(
              (v: any) =>
                !searchQuery.trim() ||
                v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filtered.length === 0) {
              return (
                <div className="rounded-2xl border border-dashed border-line p-12 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-lg">
                    🎥
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-ink">No Video Lectures Published</h3>
                  <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                    No recorded lectures have been attached to this course yet.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
                {filtered.map((vid: any) => (
                  <div key={vid._id} className="rounded-xl border border-line bg-surface/30 p-4 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                        Video Lecture
                      </span>
                      <h4 className="mt-2 text-sm font-bold text-ink">{vid.title}</h4>
                      {vid.description && <p className="text-xs text-muted mt-1 leading-relaxed">{vid.description}</p>}
                    </div>

                    <div className="pt-2 border-t border-line/60 flex justify-end">
                      {vid.attachments && vid.attachments[0] && (
                        <a
                          href={vid.attachments[0].url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                        >
                          Watch Video Stream ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 5: PRESENTATIONS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'presentations' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Slide Decks & Presentations</h2>
              <p className="text-xs text-muted">
                Classroom PPT slide decks, visual handouts, and lecture presentations.
              </p>
            </div>
          </div>

          {(() => {
            const ppts =
              selectedSubjectFilter !== 'ALL' && currentWorkspace
                ? currentWorkspace.tabs.presentations
                : [];

            if (selectedSubjectFilter === 'ALL') {
              return (
                <div className="rounded-2xl border border-dashed border-line p-10 text-center space-y-3">
                  <div className="text-2xl">📑</div>
                  <h3 className="text-sm font-bold text-ink">Select a Course to View Presentations</h3>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Please select an enrolled subject from the filters above to browse presentation slide decks.
                  </p>
                </div>
              );
            }

            if (loadingWorkspace) {
              return <div className="py-12 text-center text-xs text-muted animate-pulse">Loading presentation decks...</div>;
            }

            const filtered = ppts.filter(
              (p: any) =>
                !searchQuery.trim() ||
                p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filtered.length === 0) {
              return (
                <div className="rounded-2xl border border-dashed border-line p-12 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-lg">
                    📑
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-ink">No Slide Decks Published</h3>
                  <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                    No presentation decks have been uploaded for this course yet.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
                {filtered.map((ppt: any) => (
                  <div key={ppt._id} className="rounded-xl border border-line bg-surface/30 p-4 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        Slide Deck
                      </span>
                      <h4 className="mt-2 text-sm font-bold text-ink">{ppt.title}</h4>
                      {ppt.description && <p className="text-xs text-muted mt-1 leading-relaxed">{ppt.description}</p>}
                    </div>

                    <div className="pt-2 border-t border-line/60 flex justify-end">
                      {ppt.attachments && ppt.attachments[0] && (
                        <a
                          href={ppt.attachments[0].url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          View Presentation ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 6: QUIZZES
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'quizzes' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Academic Quizzes & Assessments</h2>
              <p className="text-xs text-muted">
                Proctored timed tests, multiple-choice questions, and continuous evaluation modules.
              </p>
            </div>
            <span className="text-xs font-mono text-muted">
              {upcomingQuizzes.length} Quizzes Scheduled
            </span>
          </div>

          {upcomingQuizzes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-lg">
                ⚡
              </div>
              <h3 className="mt-3 text-sm font-semibold text-ink">No Active Quizzes Scheduled</h3>
              <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                All assigned quizzes have been evaluated or no new assessments are scheduled.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
              {upcomingQuizzes
                .filter((q) => {
                  const matchesSubject =
                    selectedSubjectFilter === 'ALL' ||
                    (q.subject && q.subject._id === selectedSubjectFilter);
                  const matchesSearch =
                    !searchQuery.trim() ||
                    q.title?.toLowerCase().includes(searchQuery.toLowerCase());
                  return matchesSubject && matchesSearch;
                })
                .map((q) => (
                  <div
                    key={q._id}
                    className="rounded-xl border border-line bg-surface/30 p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          {q.subject?.subjectCode || 'Course'}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            q.attemptStatus === 'ATTEMPTED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {q.attemptStatus}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-ink">{q.title}</h4>
                      <p className="text-xs text-muted mt-1">
                        Duration: <span className="font-semibold text-ink">{q.durationMinutes} mins</span> • Max Marks:{' '}
                        <span className="font-semibold text-ink">{q.totalMarks}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                      {q.attemptStatus === 'ATTEMPTED' ? (
                        <div className="text-xs">
                          <span className="text-muted">Final Score: </span>
                          <span className="font-bold text-emerald-400 font-mono">
                            {q.score} / {q.totalMarks}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-400 font-medium">Ready to Attempt</span>
                      )}

                      {q.attemptStatus !== 'ATTEMPTED' && q.subject && (
                        <Link
                          to={`/student/subjects/${q.subject._id}?tab=quizzes`}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm"
                        >
                          Launch Quiz →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 7: ASSIGNMENTS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'assignments' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Continuous Problem Sets & Assignments</h2>
              <p className="text-xs text-muted">
                Submit course assignments, problem solutions, and review graded feedback.
              </p>
            </div>
            <span className="text-xs font-mono text-muted">
              {pendingAssignments.length} Assignments
            </span>
          </div>

          {pendingAssignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-lg">
                📋
              </div>
              <h3 className="mt-3 text-sm font-semibold text-ink">No Assignments Due</h3>
              <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                You have no pending assignment submissions across your enrolled courses.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
              {pendingAssignments
                .filter((a) => {
                  const matchesSubject =
                    selectedSubjectFilter === 'ALL' ||
                    (a.subject && a.subject._id === selectedSubjectFilter);
                  const matchesSearch =
                    !searchQuery.trim() ||
                    a.title?.toLowerCase().includes(searchQuery.toLowerCase());
                  return matchesSubject && matchesSearch;
                })
                .map((a) => (
                  <div
                    key={a._id}
                    className="rounded-xl border border-line bg-surface/30 p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          {a.subject?.subjectCode || 'Course'}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            a.submissionStatus === 'SUBMITTED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {a.submissionStatus}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-ink">{a.title}</h4>
                      {a.description && (
                        <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">
                          {a.description}
                        </p>
                      )}
                      <p className="text-xs text-muted mt-1">
                        Max Marks: <span className="font-semibold text-ink">{a.maxMarks}</span>
                        {a.dueDate && (
                          <>
                            {' '}
                            • Due:{' '}
                            <span className="font-mono text-ink">
                              {new Date(a.dueDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                      {a.marksObtained !== null && a.marksObtained !== undefined ? (
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                          Score: {a.marksObtained} / {a.maxMarks}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">
                          {a.submissionStatus === 'SUBMITTED' ? 'Awaiting Grading' : 'Pending Submission'}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedAssignmentForModal(a)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm cursor-pointer"
                      >
                        {a.submissionStatus === 'SUBMITTED' ? 'View Submission →' : 'Submit Solution →'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 8: NOTICES
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'notices' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Official Notices & Circulars</h2>
              <p className="text-xs text-muted">
                Departmental and institutional notices published by faculty and administration.
              </p>
            </div>
            <span className="text-xs font-mono text-muted">{announcements.length} Notices</span>
          </div>

          {announcements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-lg">
                📢
              </div>
              <h3 className="mt-3 text-sm font-semibold text-ink">No Official Notices Active</h3>
              <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                No active announcements currently posted for your department.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements
                .filter(
                  (ann) =>
                    !searchQuery.trim() ||
                    ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    ann.description?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((ann) => (
                  <div
                    key={ann._id}
                    className="rounded-xl border border-line bg-surface/30 p-5 space-y-2 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📢</span>
                        <h4 className="text-sm font-bold text-ink">{ann.title}</h4>
                      </div>
                      <span className="text-xs font-mono text-muted">
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {ann.description && (
                      <p className="text-xs text-muted/90 leading-relaxed pl-6">{ann.description}</p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 9: AI / DOUBT SOLVER
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'aiDoubt' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">🤖</span>
                <h2 className="text-lg font-bold text-ink">AI Course Assistant & Doubt Solver</h2>
              </div>
              <p className="text-xs text-muted mt-0.5">
                RAG-powered contextual question answering indexed against your verified syllabus units and lecture handouts.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted block mb-1">Select Course:</label>
                <select
                  value={doubtSubjectId}
                  onChange={(e) => setDoubtSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink focus:border-emerald-500 focus:outline-none"
                >
                  {enrolledSubjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.subjectCode} - {s.subjectName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted block mb-1">Scope Unit (Optional):</label>
                <select
                  value={doubtChapter}
                  onChange={(e) => setDoubtChapter(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink focus:border-emerald-500 focus:outline-none"
                >
                  <option value="ALL">All Syllabus Units</option>
                  <option value="Unit 1">Unit 1</option>
                  <option value="Unit 2">Unit 2</option>
                  <option value="Unit 3">Unit 3</option>
                  <option value="Unit 4">Unit 4</option>
                  <option value="Unit 5">Unit 5</option>
                </select>
              </div>
            </div>

            <form onSubmit={handleAskDoubt} className="space-y-3">
              <div className="relative">
                <textarea
                  rows={3}
                  value={doubtQuery}
                  onChange={(e) => setDoubtQuery(e.target.value)}
                  placeholder="Enter your academic doubt, question, derivation request, or concept query..."
                  className="w-full rounded-xl border border-line bg-surface p-3 text-xs text-ink placeholder:text-muted focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[11px] text-muted">
                  Powered by Eduverse Syllabus AI • Responses verified against course materials
                </span>
                <button
                  type="submit"
                  disabled={askingDoubt || !doubtQuery.trim()}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                >
                  {askingDoubt ? 'Synthesizing Solution...' : 'Ask AI Doubt Solver →'}
                </button>
              </div>
            </form>

            {doubtError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium">
                ⚠️ {doubtError}
              </div>
            )}

            {/* Doubt History */}
            {doubtHistory.length > 0 && (
              <div className="pt-4 border-t border-line space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Recent Solutions & Answers
                </h3>
                {doubtHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-line/40 pb-2">
                      <span className="text-xs font-bold text-emerald-400">Q: {item.query}</span>
                      <span className="text-[10px] font-mono text-muted">{item.timestamp}</span>
                    </div>

                    <div className="text-xs text-ink/90 leading-relaxed whitespace-pre-wrap">
                      {item.response.answer}
                    </div>

                    {item.response.citations && item.response.citations.length > 0 && (
                      <div className="pt-2 border-t border-line/40 text-[11px] text-muted space-y-1">
                        <span className="font-semibold text-ink">Citations & Source Handouts:</span>
                        <div className="flex gap-2 flex-wrap">
                          {item.response.citations.map((c: any, cIdx: number) => (
                            <span
                              key={cIdx}
                              className="rounded bg-surface px-2 py-0.5 border border-line text-[10px] text-muted"
                            >
                              📄 {c.title || c.fileName || `Source #${cIdx + 1}`}
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

      {/* ══════════════════════════════════════════════════════════
          TAB 10: SIMULATIONS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'simulations' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">🔬</span>
                <h2 className="text-lg font-bold text-ink">Virtual Science & Engineering Laboratory</h2>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Interactive real-time simulations for circuit analysis, optics, mechanics, thermodynamics, and calculus.
              </p>
            </div>
            <a
              href="/smartboard"
              className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Open in Smart Board →
            </a>
          </div>

          {(() => {
            const simSubject =
              enrolledSubjects.find(
                (s) => s._id === (selectedSubjectFilter !== 'ALL' ? selectedSubjectFilter : enrolledSubjects[0]?._id)
              ) || enrolledSubjects[0];

            if (!simSubject) {
              return (
                <div className="rounded-2xl border border-dashed border-line p-10 text-center">
                  <p className="text-xs text-muted">No enrolled subjects available to initialize simulations.</p>
                </div>
              );
            }

            const simWorkspace = subjectWorkspaces[simSubject._id];
            const assignedSims = (simWorkspace?.tabs.simulations as any) || [];

            return (
              <SimulationManager
                subject={simSubject as any}
                assignedSimulations={assignedSims}
                isTeacher={false}
              />
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 11: MY PROGRESS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'progress' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Cumulative Academic Progress & CGPA</h2>
              <p className="text-xs text-muted">
                Official trajectory of semester grade points, credit milestones, and graduation requirements.
              </p>
            </div>
            <button
              onClick={() => {
                setTrackingModalTab('overview');
                setShowTrackingModal(true);
              }}
              className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer shadow-sm"
            >
              Full Transcript Modal →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-line bg-surface/30 p-4">
              <p className="text-xs font-semibold uppercase text-muted">Cumulative GPA (CGPA)</p>
              <p className="mt-2 text-3xl font-extrabold text-emerald-400">
                {academicProgress.cgpa > 0 ? academicProgress.cgpa.toFixed(2) : '0.00'}
              </p>
              <p className="mt-1 text-xs text-muted">Out of 10.0 scale</p>
            </div>

            <div className="rounded-xl border border-line bg-surface/30 p-4">
              <p className="text-xs font-semibold uppercase text-muted">Credits Earned</p>
              <p className="mt-2 text-3xl font-extrabold text-indigo-400">
                {academicProgress.creditsEarned}
              </p>
              <p className="mt-1 text-xs text-muted">
                {academicProgress.creditsEnrolled} Credits Enrolled
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface/30 p-4">
              <p className="text-xs font-semibold uppercase text-muted">Completed Terms</p>
              <p className="mt-2 text-3xl font-extrabold text-ink">
                {academicProgress.completedSemesters}
              </p>
              <p className="mt-1 text-xs text-muted">Semesters successfully cleared</p>
            </div>

            <div className="rounded-xl border border-line bg-surface/30 p-4">
              <p className="text-xs font-semibold uppercase text-muted">Standing Status</p>
              <p className="mt-2 text-2xl font-bold text-emerald-400">
                {academicProgress.cgpa >= 7.5 ? 'First Class Distinction' : 'In Good Standing'}
              </p>
              <p className="mt-1 text-xs text-muted">Regulation {currentSemester.regulation}</p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 12: ATTENDANCE
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'attendance' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Course-wise Attendance Register</h2>
              <p className="text-xs text-muted">
                Statutory attendance register with 75% minimum threshold tracking for semester examinations.
              </p>
            </div>
            <button
              onClick={() => {
                setTrackingModalTab('attendance');
                setShowTrackingModal(true);
              }}
              className="rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 cursor-pointer shadow-sm"
            >
              Session Details →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-line bg-surface/30 p-4">
              <p className="text-xs uppercase font-bold text-muted">Overall Percentage</p>
              <p className="mt-2 text-3xl font-extrabold text-teal-400">
                {attendanceSummary.attendancePercentage}%
              </p>
              <p className="mt-1 text-xs text-muted">Minimum 75.0% required</p>
            </div>

            <div className="rounded-xl border border-line bg-surface/30 p-4">
              <p className="text-xs uppercase font-bold text-muted">Sessions Attended</p>
              <p className="mt-2 text-3xl font-extrabold text-ink">
                {attendanceSummary.presentSessions}
              </p>
              <p className="mt-1 text-xs text-muted">Present sessions recorded</p>
            </div>

            <div className="rounded-xl border border-line bg-surface/30 p-4">
              <p className="text-xs uppercase font-bold text-muted">Total Sessions Conducted</p>
              <p className="mt-2 text-3xl font-extrabold text-muted">
                {attendanceSummary.totalSessions}
              </p>
              <p className="mt-1 text-xs text-muted">
                {attendanceSummary.absentSessions} Sessions absent
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Course-by-Course Attendance Roster
            </h3>
            <div className="space-y-3">
              {attendanceSummary.bySubject.map((s, idx) => (
                <div key={idx} className="rounded-xl border border-line bg-surface/30 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono text-emerald-400 font-bold mr-2">{s.subjectCode}</span>
                      <span className="font-bold text-ink">{s.subjectName}</span>
                    </div>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                        s.percentage >= 75
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {s.percentage}% ({s.present} / {s.total} Sessions)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        s.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${s.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 13: RESULTS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'results' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Examination Results & Grade Card</h2>
              <p className="text-xs text-muted">
                Official marks, internal assessments, and grade points for Semester {currentSemester.semesterNumber}.
              </p>
            </div>
            <button
              onClick={() => {
                setTrackingModalTab('subjects');
                setShowTrackingModal(true);
              }}
              className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer shadow-sm"
            >
              Grade Analysis →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-line bg-surface/30 p-4">
              <p className="text-xs font-semibold uppercase text-muted">Current Term GPA</p>
              <p className="mt-2 text-3xl font-extrabold text-emerald-400">
                {recentResults.gpa > 0 ? recentResults.gpa.toFixed(2) : '0.00'}
              </p>
              <p className="mt-1 text-xs text-muted">Semester {currentSemester.semesterNumber}</p>
            </div>

            <div className="rounded-xl border border-line bg-surface/30 p-4">
              <p className="text-xs font-semibold uppercase text-muted">Cumulative CGPA</p>
              <p className="mt-2 text-3xl font-extrabold text-indigo-400">
                {academicProgress.cgpa > 0 ? academicProgress.cgpa.toFixed(2) : '0.00'}
              </p>
              <p className="mt-1 text-xs text-muted">Aggregate Across All Completed Terms</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Course Grade Points
            </h3>
            {recentResults.subjects.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">
                Examination results will be published here upon semester conclusion.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/50 border-b border-line text-muted">
                    <tr>
                      <th className="p-3">Course Code</th>
                      <th className="p-3">Course Name</th>
                      <th className="p-3 text-center">Credits</th>
                      <th className="p-3 text-center">Internal Marks</th>
                      <th className="p-3 text-center">Grade Point</th>
                      <th className="p-3 text-center">Letter Grade</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {recentResults.subjects.map((subItem) => (
                      <tr key={subItem._id} className="hover:bg-surface/30">
                        <td className="p-3 font-mono font-bold text-emerald-400">
                          {subItem.subject.subjectCode}
                        </td>
                        <td className="p-3 font-semibold text-ink">{subItem.subject.subjectName}</td>
                        <td className="p-3 text-center font-mono">{subItem.subject.credits}</td>
                        <td className="p-3 text-center font-mono">
                          {subItem.internalMarks !== undefined ? subItem.internalMarks : '-'}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-400">
                          {subItem.gradePoint !== undefined ? subItem.gradePoint : '-'}
                        </td>
                        <td className="p-3 text-center font-bold">
                          {subItem.letterGrade || 'Graded'}
                        </td>
                        <td className="p-3 text-center">
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                            {subItem.status || 'PASS'}
                          </span>
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

      {/* ══════════════════════════════════════════════════════════
          TAB 14: SEMESTER MANAGEMENT
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'semesterManagement' && (
        <div className="space-y-6">
          {/* Next Term Enrollment Action Card */}
          <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Semester Progression
                </span>
                <h2 className="text-lg font-bold text-ink">Next Term Enrollment Request</h2>
                <p className="text-xs text-muted mt-0.5">
                  Register for curriculum courses for upcoming semester and submit to your department HOD.
                </p>
              </div>
              <button
                onClick={handleOpenNextSemesterModal}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-all cursor-pointer shadow-sm"
              >
                ⏩ Open Enrollment Request Wizard
              </button>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Your next semester curriculum will be automatically determined based on your department's regulation roadmap. You can verify available elective and core courses before submitting your registration.
            </p>
          </div>

          {/* Historical Past Semesters Archive Card */}
          <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Historical Records
                </span>
                <h2 className="text-lg font-bold text-ink">Past Semesters Archive</h2>
                <p className="text-xs text-muted mt-0.5">
                  Review courses, lecture handouts, and official attendance records from completed semesters.
                </p>
              </div>
              <button
                onClick={handleOpenArchiveModal}
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-surface/80 transition-all cursor-pointer shadow-sm"
              >
                📜 Browse Historical Archive
              </button>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              All previously completed academic terms are permanently preserved in your personal academic vault, including lecture notes, handouts, and examination performance metrics.
            </p>
          </div>
        </div>
      )}

      {/* ─── NEXT SEMESTER ENROLLMENT MODAL ─── */}
      {showNextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Semester Progression
                </span>
                <h3 className="text-lg font-bold text-ink">Next Term Enrollment Request</h3>
              </div>
              <button
                onClick={() => setShowNextModal(false)}
                className="rounded-lg border border-line p-1.5 text-xs text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingNext ? (
              <div className="py-8 text-center text-xs text-muted">
                Checking next academic semester curriculum...
              </div>
            ) : !nextSemData?.nextAvailable || !nextSemData.nextSemester ? (
              <div className="py-8 text-center space-y-2">
                <div className="text-2xl">🎓</div>
                <h4 className="text-sm font-bold text-ink">No Next Semester Configured Yet</h4>
                <p className="text-xs text-muted max-w-md mx-auto">
                  {nextSemData?.message ||
                    'You are currently in the highest configured semester for your department.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-extrabold text-indigo-700 dark:text-indigo-300">
                      Semester {nextSemData.nextSemester.semesterNumber}
                    </span>
                    <span className="text-xs font-mono text-indigo-700 dark:text-indigo-300 font-semibold">
                      Term: {nextSemData.nextSemester.academicYear} • {nextSemData.nextSemester.regulation}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Select curriculum courses to register. Upon submission, your request will be queued for
                    HOD review.
                  </p>
                </div>

                {nextSemData.existingRequest && (
                  <div
                    className={`rounded-xl border p-4 space-y-1 ${
                      nextSemData.existingRequest.status === 'PENDING'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : nextSemData.existingRequest.status === 'APPROVED'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Enrollment Status: {nextSemData.existingRequest.status}
                      </span>
                      <span className="text-[11px] font-mono">
                        {new Date(nextSemData.existingRequest.requestedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {nextSemData.existingRequest.rejectionReason && (
                      <p className="text-xs">Reason: {nextSemData.existingRequest.rejectionReason}</p>
                    )}
                  </div>
                )}

                {enrollmentSuccessMsg && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    {enrollmentSuccessMsg}
                  </div>
                )}

                {enrollmentErrMsg && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium">
                    {enrollmentErrMsg}
                  </div>
                )}

                {nextSemData.canRequest && nextSemData.availableSubjects && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      Available Curriculum Courses:
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {nextSemData.availableSubjects.map((s) => {
                        const isChecked = selectedSubjectIds.includes(s._id);
                        return (
                          <label
                            key={s._id}
                            className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                              isChecked
                                ? 'border-indigo-500/50 bg-indigo-500/10'
                                : 'border-line bg-surface/30'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSubjectIds((prev) => [...prev, s._id]);
                                  } else {
                                    setSelectedSubjectIds((prev) => prev.filter((id) => id !== s._id));
                                  }
                                }}
                                className="rounded border-line text-indigo-600 focus:ring-indigo-500"
                              />
                              <div>
                                <span className="font-mono text-xs font-bold text-emerald-400">
                                  {s.subjectCode}
                                </span>
                                <span className="text-xs font-bold text-ink ml-2">{s.subjectName}</span>
                              </div>
                            </div>
                            <span className="text-xs font-mono text-muted">{s.credits} Credits</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleSubmitEnrollment}
                        disabled={submittingEnrollment || selectedSubjectIds.length === 0}
                        className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow disabled:opacity-50 cursor-pointer"
                      >
                        {submittingEnrollment
                          ? 'Submitting to HOD...'
                          : `Submit Enrollment Request (${selectedSubjectIds.length} Subjects)`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-line flex justify-end">
              <button
                onClick={() => setShowNextModal(false)}
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PREVIOUS SEMESTERS ARCHIVE MODAL ─── */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Historical Academic Records
                </span>
                <h3 className="text-lg font-bold text-ink">Previous Semesters Archive</h3>
              </div>
              <button
                onClick={() => setShowArchiveModal(false)}
                className="rounded-lg border border-line p-1.5 text-xs text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingArchive ? (
              <div className="py-8 text-center text-xs text-muted">
                Retrieving historical academic records...
              </div>
            ) : archiveData.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="text-2xl">📜</div>
                <h4 className="text-sm font-bold text-ink">No Completed Prior Terms</h4>
                <p className="text-xs text-muted">
                  You are currently in Semester {currentSemester.semesterNumber}. Prior terms will be
                  archived here once completed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2 border-b border-line pb-2">
                  {archiveData.map((item) => {
                    const isSelected = selectedArchiveSem === item.semester.semesterNumber;
                    return (
                      <button
                        key={item.semester._id}
                        onClick={() => setSelectedArchiveSem(item.semester.semesterNumber)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow'
                            : 'border border-line bg-surface/40 text-muted hover:text-ink'
                        }`}
                      >
                        Semester {item.semester.semesterNumber} ({item.semester.academicYear})
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const currentArchive =
                    archiveData.find((a) => a.semester.semesterNumber === selectedArchiveSem) ||
                    archiveData[0];
                  if (!currentArchive) return null;

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-line bg-surface/30 p-3">
                          <p className="text-[10px] uppercase font-bold text-muted">Enrolled Courses</p>
                          <p className="text-lg font-bold text-ink">
                            {currentArchive.enrolledSubjects.length} Courses
                          </p>
                        </div>
                        <div className="rounded-xl border border-line bg-surface/30 p-3">
                          <p className="text-[10px] uppercase font-bold text-muted">Term Attendance</p>
                          <p className="text-lg font-bold text-teal-400">
                            {currentArchive.attendance.percentage}%
                          </p>
                        </div>
                        <div className="rounded-xl border border-line bg-surface/30 p-3">
                          <p className="text-[10px] uppercase font-bold text-muted">Term GPA</p>
                          <p className="text-lg font-bold text-emerald-400">
                            {currentArchive.academicRecords.gpa !== null
                              ? currentArchive.academicRecords.gpa.toFixed(2)
                              : 'Graded'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted">
                          Archived Subjects:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {currentArchive.enrolledSubjects.map((s) => (
                            <div
                              key={s._id}
                              className="rounded-xl border border-line bg-surface/20 p-3 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-mono text-xs font-bold text-emerald-400">
                                  {s.subjectCode}
                                </span>
                                <h5 className="text-xs font-bold text-ink">{s.subjectName}</h5>
                              </div>
                              <span className="text-xs font-mono text-muted">{s.credits} Credits</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {currentArchive.notes.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted">
                            Lecture Notes Archive ({currentArchive.notes.length}):
                          </p>
                          <div className="space-y-1.5">
                            {currentArchive.notes.map((n) => (
                              <div
                                key={n._id}
                                className="rounded-lg border border-line bg-surface/30 p-2.5 flex items-center justify-between text-xs"
                              >
                                <span className="font-semibold text-ink">{n.title}</span>
                                {n.attachments && n.attachments[0] && (
                                  <a
                                    href={n.attachments[0].url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline font-semibold"
                                  >
                                    View Handout ↗
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="pt-2 border-t border-line flex justify-end">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SYLLABUS UNITS MODAL ─── */}
      {activeSubjectUnits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {activeSubjectUnits.subjectCode}
                </span>
                <h3 className="text-lg font-bold text-ink">{activeSubjectUnits.subjectName}</h3>
                <p className="text-xs text-muted">Course Syllabus & Topic Breakdown</p>
              </div>
              <button
                onClick={() => setActiveSubjectUnits(null)}
                className="rounded-lg border border-line p-1.5 text-xs text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingUnits ? (
              <div className="py-8 text-center text-xs text-muted">Loading syllabus units...</div>
            ) : activeSubjectUnits.units.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                No syllabus units have been uploaded for this course yet.
              </div>
            ) : (
              <div className="space-y-3">
                {activeSubjectUnits.units.map((unit) => (
                  <div
                    key={unit._id || unit.unitNumber}
                    className="rounded-xl border border-line bg-surface/40 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                        Unit {unit.unitNumber}
                      </span>
                      <span className="text-xs font-mono text-muted">
                        {unit.hours ? `${unit.hours} Hours` : ''}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-ink">{unit.title}</h4>
                    {unit.topics && unit.topics.length > 0 && (
                      <div className="mt-2 text-xs text-muted space-y-1">
                        <p className="font-semibold text-ink/80 text-[11px] uppercase tracking-wider">
                          Topics Covered:
                        </p>
                        <ul className="list-disc list-inside space-y-0.5 text-muted">
                          {unit.topics.map((topic: string, i: number) => (
                            <li key={i}>{topic}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-line flex justify-end">
              <button
                onClick={() => setActiveSubjectUnits(null)}
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ACADEMIC TRACKING & PERFORMANCE ANALYTICS ─── */}
      {showTrackingModal && (
        <StudentTrackingModal
          isOpen={showTrackingModal}
          onClose={() => setShowTrackingModal(false)}
          defaultTab={trackingModalTab}
        />
      )}

      {/* ─── MODAL: STUDENT ASSIGNMENT SUBMISSION ─── */}
      {selectedAssignmentForModal && (
        <StudentAssignmentModal
          isOpen={!!selectedAssignmentForModal}
          onClose={() => setSelectedAssignmentForModal(null)}
          assignment={selectedAssignmentForModal}
          onSubmissionSuccess={() => {
            setSelectedAssignmentForModal(null);
            loadOverview();
          }}
        />
      )}
    </div>
  );
}
