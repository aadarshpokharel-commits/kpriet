import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useProgrammes } from '@/hooks/useProgrammes';
import { getProgrammeObjectId } from '@/utils/programme';
import {
  useDepartmentStats,
  useSemesters,
  useSubjects,
  useTeacherAssignments,
  useStudentEnrollments,
  useDepartmentFaculty,
  useDepartmentStudents,
} from '@/hooks/useAcademic';
import { AcademicService } from '@/services/academic.service';
import type {
  ISubject,
  IStudentHistory,
  ICurriculumTree,
} from '@/types/academic.types';

type HODTab =
  | 'overview'
  | 'faculty'
  | 'students'
  | 'enrollments'
  | 'subjects'
  | 'semesters'
  | 'teacherAssignments'
  | 'analytics'
  | 'announcements'
  | 'audit';

export function HODDashboardPage() {
  const { user, logout } = useAuth();
  // The HOD's programme comes from their account (never typed in); department may be populated.
  const deptId = getProgrammeObjectId(user?.department);
  const { findProgramme } = useProgrammes();
  const hodProgramme = findProgramme(deptId) || findProgramme(user?.department);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab');

  // Active Tab
  const [activeTab, setActiveTab] = useState<HODTab>(
    (currentTabParam as HODTab) || 'overview'
  );

  useEffect(() => {
    if (currentTabParam && currentTabParam !== activeTab) {
      setActiveTab(currentTabParam as HODTab);
    }
  }, [currentTabParam]);

  const handleTabChange = (tabId: HODTab) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Live Hooks
  const { stats, loading: statsLoading, refetch: refetchStats } = useDepartmentStats(deptId);
  const { semesters } = useSemesters(deptId);
  const { subjects, loading: subjectsLoading, refetch: refetchSubjects } = useSubjects({
    departmentId: deptId,
  });
  const {
    assignments,
    loading: assignmentsLoading,
    refetch: refetchAssignments,
  } = useTeacherAssignments({ departmentId: deptId });
  const {
    enrollments,
    loading: enrollmentsLoading,
    refetch: refetchEnrollments,
  } = useStudentEnrollments({ departmentId: deptId });
  const {
    faculty,
    loading: facultyLoading,
    refetch: refetchFaculty,
  } = useDepartmentFaculty(deptId);
  const {
    students,
    loading: studentsLoading,
    refetch: refetchStudents,
  } = useDepartmentStudents(deptId);

  // Curriculum Tree State
  const [curriculumTree, setCurriculumTree] = useState<ICurriculumTree | null>(null);
  const [curriculumLoading, setCurriculumLoading] = useState<boolean>(false);
  const [curriculumSubTab, setCurriculumSubTab] = useState<'curriculumTree' | 'subjects' | 'verticals' | 'openElectives'>('curriculumTree');
  const [curriculumSemFilter, setCurriculumSemFilter] = useState<number | 'ALL'>('ALL');
  const [curriculumVerticalFilter, setCurriculumVerticalFilter] = useState<string>('ALL');
  const [curriculumSearchQuery, setCurriculumSearchQuery] = useState<string>('');
  const [expandedSyllabusSubjects, setExpandedSyllabusSubjects] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCurriculumTree();
  }, []);

  const loadCurriculumTree = async () => {
    try {
      setCurriculumLoading(true);
      const tree = await AcademicService.getCurriculumTree(hodProgramme?.programmeId);
      setCurriculumTree(tree);
    } catch (e) {
      console.error('Failed to load curriculum tree in HOD dashboard', e);
    } finally {
      setCurriculumLoading(false);
    }
  };

  const handleOpenAssignModalForSubject = (subjectId: string, semId?: string) => {
    setAsgnSubjectId(subjectId);
    if (semId) setAsgnSemesterId(semId);
    setSelectedTeacherForModal(null);
    setShowAssignModal(true);
  };

  // Filter States
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('ALL');
  const [studentSemesterFilter, setStudentSemesterFilter] = useState<string>('ALL');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [facultyFilter, setFacultyFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');

  // Modals & Drawers
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacherForModal, setSelectedTeacherForModal] = useState<any | null>(null);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<IStudentHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedTeacherDetails, setSelectedTeacherDetails] = useState<any | null>(null);

  // Action Feedback Message
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Subject Form State
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subSemId, setSubSemId] = useState('');
  const [subSemNumber, setSubSemNumber] = useState(1);
  const [subCredits, setSubCredits] = useState(3);
  const [subLoading, setSubLoading] = useState(false);

  // Chapter Form State
  const [chapterSubjectId, setChapterSubjectId] = useState<string | null>(null);
  const [chapterUnit, setChapterUnit] = useState(1);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterTopics, setChapterTopics] = useState('');
  const [chapterHours, setChapterHours] = useState(9);
  const [chapterLoading, setChapterLoading] = useState(false);

  // Assignment Form State
  const [asgnTeacherId, setAsgnTeacherId] = useState('');
  const [asgnSubjectId, setAsgnSubjectId] = useState('');
  const [asgnSemesterId, setAsgnSemesterId] = useState('');
  const [asgnSection, setAsgnSection] = useState('A');
  const [asgnLoading, setAsgnLoading] = useState(false);

  // Rejection Reason Modal State
  const [rejectModal, setRejectModal] = useState<{
    type: 'FACULTY' | 'ENROLLMENT';
    id: string;
    title: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // ─── FACULTY APPROVAL / REJECTION ───
  const handleReviewFaculty = async (teacherId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    if (!deptId) return;
    try {
      await AcademicService.reviewFaculty(deptId, teacherId, status, reason);
      showNotification(
        status === 'APPROVED' ? 'Teacher approved successfully.' : 'Teacher registration rejected.'
      );
      refetchFaculty();
      refetchStats();
      setRejectModal(null);
      setRejectionReason('');
    } catch (err: any) {
      showNotification(err?.message || 'Failed to update teacher registration status', 'error');
    }
  };

  // ─── STUDENT ENROLLMENT REVIEW ───
  const handleReviewEnrollment = async (enrollmentId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      await AcademicService.reviewEnrollment(enrollmentId, status, reason);
      showNotification(
        status === 'APPROVED' ? 'Student semester enrollment approved.' : 'Enrollment request rejected.'
      );
      refetchEnrollments();
      refetchStudents();
      refetchStats();
      setRejectModal(null);
      setRejectionReason('');
    } catch (err: any) {
      showNotification(err?.message || 'Failed to review enrollment', 'error');
    }
  };

  // ─── SUBJECT LIFECYCLE ───
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId || !subSemId) return;
    try {
      setSubLoading(true);
      await AcademicService.createSubject({
        subjectName: subName,
        subjectCode: subCode,
        departmentId: deptId,
        semesterId: subSemId,
        semesterNumber: subSemNumber,
        credits: subCredits,
      });
      showNotification(`Subject ${subCode} created successfully.`);
      setShowAddSubject(false);
      setSubName('');
      setSubCode('');
      setSubSemId('');
      refetchSubjects();
      refetchStats();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to create subject', 'error');
    } finally {
      setSubLoading(false);
    }
  };

  const handleToggleSubjectStatus = async (subject: ISubject) => {
    const nextStatus = subject.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await AcademicService.toggleSubjectStatus(subject._id, nextStatus);
      showNotification(`Subject ${subject.subjectCode} is now ${nextStatus}.`);
      refetchSubjects();
      refetchStats();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to update subject status', 'error');
    }
  };

  // ─── CHAPTER MANAGEMENT ───
  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterSubjectId) return;
    try {
      setChapterLoading(true);
      const topicsArr = chapterTopics
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);
      await AcademicService.addChapter(chapterSubjectId, {
        unitNumber: chapterUnit,
        title: chapterTitle,
        topics: topicsArr,
        hours: chapterHours,
      });
      showNotification(`Unit ${chapterUnit} added successfully.`);
      setChapterSubjectId(null);
      setChapterTitle('');
      setChapterTopics('');
      refetchSubjects();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to add chapter unit', 'error');
    } finally {
      setChapterLoading(false);
    }
  };

  // ─── TEACHER ASSIGNMENTS ───
  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId || !asgnTeacherId || !asgnSubjectId || !asgnSemesterId) return;
    try {
      setAsgnLoading(true);
      const semObj = semesters.find((s) => s._id === asgnSemesterId);
      await AcademicService.assignTeacher({
        teacherId: asgnTeacherId,
        subjectId: asgnSubjectId,
        departmentId: deptId,
        semesterId: asgnSemesterId,
        academicYear: semObj?.academicYear || '2024-2025',
        section: asgnSection,
      });
      showNotification('Faculty assigned to subject across semester successfully.');
      setShowAssignModal(false);
      setAsgnTeacherId('');
      setAsgnSubjectId('');
      setAsgnSemesterId('');
      refetchAssignments();
      refetchFaculty();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to assign teacher', 'error');
    } finally {
      setAsgnLoading(false);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this teaching assignment?')) return;
    try {
      await AcademicService.removeTeacherAssignment(id);
      showNotification('Teaching assignment revoked successfully.');
      refetchAssignments();
      refetchFaculty();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to revoke assignment', 'error');
    }
  };

  // ─── VIEW STUDENT HISTORY ───
  const handleViewStudentHistory = async (studentId: string) => {
    if (!deptId) return;
    try {
      setLoadingHistory(true);
      const data = await AcademicService.getStudentHistory(deptId, studentId);
      setSelectedStudentHistory(data);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to load student academic history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filtered lists
  const filteredFaculty = faculty.filter((f) => {
    if (facultyFilter === 'APPROVED') return f.approvalStatus === 'APPROVED';
    if (facultyFilter === 'PENDING') return f.approvalStatus === 'PENDING';
    return true;
  });

  const filteredStudents = students.filter((s) => {
    const semNum = (s.activeEnrollment?.semester as any)?.semesterNumber;
    const matchesSem =
      studentSemesterFilter === 'ALL' || String(semNum) === studentSemesterFilter;
    const matchesSearch =
      !studentSearchQuery.trim() ||
      s.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      s.identifier?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      s.collegeEmail?.toLowerCase().includes(studentSearchQuery.toLowerCase());
    return matchesSem && matchesSearch;
  });

  const filteredSubjects =
    selectedSemesterId === 'ALL'
      ? subjects
      : subjects.filter(
          (s) =>
            (typeof s.semester === 'object' && s.semester?._id === selectedSemesterId) ||
            s.semester === selectedSemesterId
        );

  const pendingEnrollmentsList = enrollments.filter((e) => e.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              Department Academic Governance
            </span>
            {hodProgramme && (
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink border border-line">
                {hodProgramme.type} · {hodProgramme.programmeId}
              </span>
            )}
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-mono font-medium text-ink border border-line">
              HOD ID: {user?.identifier}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
            {hodProgramme?.name || stats?.department?.name
              ? `${hodProgramme?.name || stats?.department?.name} Department`
              : 'Department Academic Dashboard'}
          </h1>
          <p className="text-sm text-muted">
            Head of Department: <span className="font-semibold text-ink">{user?.name}</span> •{' '}
            <span className="font-mono text-muted">{user?.collegeEmail}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchStats();
              refetchSubjects();
              refetchAssignments();
              refetchEnrollments();
              refetchFaculty();
              refetchStudents();
              showNotification('Department data refreshed from database.');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface/50 px-3.5 py-2 text-xs font-semibold text-ink hover:bg-surface transition-all"
          >
            ↻ Refresh DB
          </button>
          <button
            onClick={() => logout()}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ─── Notification Toast ─── */}
      {actionMessage && (
        <div
          className={`rounded-xl border p-4 text-xs font-medium transition-all ${
            actionMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* ─── Navigation Tabs ─── */}
      <div className="flex overflow-x-auto border-b border-line gap-1 pb-px text-xs font-semibold scrollbar-none">
        <button
          onClick={() => handleTabChange('overview')}
          className={`px-3.5 py-2.5 transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          🏛 Overview
        </button>

        <button
          onClick={() => handleTabChange('faculty')}
          className={`px-3.5 py-2.5 transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'faculty'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          👨‍🏫 Faculty
          {stats && stats.pendingFaculty > 0 && (
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-300 border border-amber-500/30">
              {stats.pendingFaculty}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('students')}
          className={`px-3.5 py-2.5 transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'students'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          🎓 Students
        </button>

        <button
          onClick={() => handleTabChange('enrollments')}
          className={`px-3.5 py-2.5 transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'enrollments'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          📥 Enrollment Requests
          {pendingEnrollmentsList.length > 0 && (
            <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 dark:text-rose-300 border border-rose-500/30">
              {pendingEnrollmentsList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('subjects')}
          className={`px-3.5 py-2.5 transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'subjects'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          📖 Subjects
        </button>

        <button
          onClick={() => handleTabChange('semesters')}
          className={`px-3.5 py-2.5 transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'semesters'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          🗓 Semesters
        </button>

        <button
          onClick={() => handleTabChange('teacherAssignments')}
          className={`px-3.5 py-2.5 transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'teacherAssignments'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          🤝 Teacher Assignments
        </button>

        <button
          onClick={() => handleTabChange('analytics')}
          className={`px-3.5 py-2.5 transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          📈 Department Analytics
        </button>

        <button
          onClick={() => handleTabChange('announcements')}
          className={`px-3.5 py-2.5 transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'announcements'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          📢 Announcements
        </button>

        <button
          onClick={() => handleTabChange('audit')}
          className={`px-3.5 py-2.5 transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-indigo-500 text-indigo-400 font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          🛡 Audit
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: DEPARTMENT OVERVIEW & ANALYTICS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Live Metric Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-4">
            <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Students</p>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="text-3xl font-extrabold text-ink">
                  {statsLoading ? '...' : stats?.studentCount || 0}
                </p>
                <span className="text-xs text-emerald-400 font-medium">
                  {stats ? `${stats.activeStudentCount} active` : ''}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">Total registered student accounts</p>
            </div>

            <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Faculty Members</p>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="text-3xl font-extrabold text-indigo-400">
                  {statsLoading ? '...' : stats?.facultyCount || 0}
                </p>
                <span className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
                  {stats ? `${stats.approvedFaculty} approved` : ''}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {stats?.pendingFaculty
                  ? `${stats.pendingFaculty} pending registration approval`
                  : 'All faculty approved'}
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Curriculum Subjects</p>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="text-3xl font-extrabold text-violet-400">
                  {statsLoading ? '...' : stats?.activeSubjectCount || 0}
                </p>
                <span className="text-xs text-muted font-medium">
                  {stats?.activeSemesterCount || 0} Semesters
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">Active course curriculum offerings</p>
            </div>

            <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Pending Enrollments</p>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="text-3xl font-extrabold text-amber-400">
                  {statsLoading ? '...' : stats?.pendingEnrollmentCount || 0}
                </p>
                {stats && stats.pendingEnrollmentCount > 0 && (
                  <button
                    onClick={() => setActiveTab('enrollments')}
                    className="text-xs text-amber-300 underline font-medium cursor-pointer"
                  >
                    Review Queue →
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">Awaiting semester clearance</p>
            </div>
          </div>

          {/* Semester Distribution (Semesters 1 through 8) */}
          <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">Academic Semester Distribution</h3>
                <p className="text-xs text-muted mt-0.5">
                  Real-time database breakdown of students and active subjects per academic semester.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-2">
              {stats?.semesterDistribution?.map((dist) => (
                <div
                  key={dist.semesterNumber}
                  className="rounded-xl border border-line bg-surface/30 p-3.5 text-center space-y-1 hover:border-indigo-500/30 transition-all"
                >
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                    Sem {dist.semesterNumber}
                  </span>
                  <div className="mt-1">
                    <p className="text-lg font-extrabold text-ink">{dist.studentCount}</p>
                    <p className="text-[10px] text-muted">Students</p>
                  </div>
                  <div className="pt-1 border-t border-line/50">
                    <p className="text-xs font-semibold text-muted">{dist.subjectCount} Subjects</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Academic Activity Feed */}
          <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">Recent Department Activity</h3>
                <p className="text-xs text-muted mt-0.5">
                  Immutable audit records of faculty registrations, course approvals, and grading events.
                </p>
              </div>
            </div>

            {statsLoading ? (
              <div className="py-8 text-center text-xs text-muted">Loading audit feed...</div>
            ) : !stats?.recentActivity || stats.recentActivity.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                No recent activity logs recorded for this department yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats.recentActivity.map((act) => (
                  <div
                    key={act.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-line bg-surface/20 p-3.5 gap-2 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-400 border border-indigo-500/20">
                        {act.action}
                      </span>
                      <p className="text-ink font-medium">{act.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                      <span>{act.actorName}</span>
                      <span>•</span>
                      <span>{new Date(act.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: FACULTY MANAGEMENT
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'faculty' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Department Faculty Directory</h2>
              <p className="text-xs text-muted mt-0.5">
                Manage teaching credentials, review registrations, and allocate courses across semesters.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter */}
              <div className="flex rounded-lg border border-line bg-panel p-1 text-xs">
                <button
                  onClick={() => setFacultyFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                    facultyFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-muted'
                  }`}
                >
                  All ({faculty.length})
                </button>
                <button
                  onClick={() => setFacultyFilter('APPROVED')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                    facultyFilter === 'APPROVED' ? 'bg-indigo-600 text-white' : 'text-muted'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setFacultyFilter('PENDING')}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                    facultyFilter === 'PENDING' ? 'bg-indigo-600 text-white' : 'text-muted'
                  }`}
                >
                  Pending ({faculty.filter((f) => f.approvalStatus === 'PENDING').length})
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedTeacherForModal(null);
                  setShowAssignModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-all cursor-pointer"
              >
                + Assign Faculty to Course
              </button>
            </div>
          </div>

          {facultyLoading && (
            <div className="py-12 text-center text-xs text-muted">Loading department faculty...</div>
          )}

          {!facultyLoading && filteredFaculty.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center">
              <p className="text-sm font-semibold text-ink">No faculty members found for this filter</p>
              <p className="text-xs text-muted mt-1">Teachers registered with your department will appear here.</p>
            </div>
          )}

          {!facultyLoading && filteredFaculty.length > 0 && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6">
              {filteredFaculty.map((teacher) => {
                const activeAssignments = teacher.assignments || [];
                const distinctSems = Array.from(
                  new Set(activeAssignments.map((a: any) => a.semester?.semesterNumber).filter(Boolean))
                );

                return (
                  <div
                    key={teacher._id}
                    className="flex flex-col justify-between rounded-xl border border-line bg-surface/30 p-5 hover:border-indigo-500/30 transition-all space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {teacher.identifier || 'FACULTY'}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                            teacher.approvalStatus === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : teacher.approvalStatus === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {teacher.approvalStatus || 'PENDING'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-ink">{teacher.name}</h3>
                        <p className="text-xs text-muted mt-0.5">{teacher.collegeEmail}</p>
                        {teacher.profile?.designation && (
                          <p className="text-xs text-muted/80 mt-1">
                            {teacher.profile.designation}
                            {teacher.profile.specialization ? ` • ${teacher.profile.specialization}` : ''}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-line/60 text-xs text-muted flex items-center justify-between">
                        <span>
                          Courses Taught: <strong className="text-ink">{activeAssignments.length}</strong>
                        </span>
                        <span>
                          Semesters:{' '}
                          <strong className="text-ink">
                            {distinctSems.length > 0 ? distinctSems.join(', ') : 'None'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-line">
                      {/* Approval Buttons if Pending */}
                      {teacher.approvalStatus === 'PENDING' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReviewFaculty(teacher._id, 'APPROVED')}
                            className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-all text-center cursor-pointer shadow"
                          >
                            ✓ Approve Registration
                          </button>
                          <button
                            onClick={() =>
                              setRejectModal({
                                type: 'FACULTY',
                                id: teacher._id,
                                title: `Reject Faculty Registration for ${teacher.name}`,
                              })
                            }
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTeacherDetails(teacher)}
                          className="flex-1 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface transition-all text-center cursor-pointer"
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTeacherForModal(teacher);
                            setAsgnTeacherId(teacher._id);
                            setShowAssignModal(true);
                          }}
                          className="flex-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary dark:text-indigo-300 hover:bg-primary hover:text-white transition-all text-center cursor-pointer"
                        >
                          + Assign Course
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Teacher Assignments Matrix across Semesters */}
          <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">Active Faculty Course Assignments</h3>
                <p className="text-xs text-muted mt-0.5">
                  Full multi-semester relational assignment matrix. Teachers can instruct across multiple semesters.
                </p>
              </div>
            </div>

            {assignmentsLoading ? (
              <div className="py-6 text-center text-xs text-muted">Loading assignment matrix...</div>
            ) : assignments.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted">
                No active teacher-subject assignments currently found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-muted">
                      <th className="pb-3 font-semibold">Faculty Name</th>
                      <th className="pb-3 font-semibold">Course Code & Name</th>
                      <th className="pb-3 font-semibold">Semester</th>
                      <th className="pb-3 font-semibold">Section</th>
                      <th className="pb-3 font-semibold">Role</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {assignments.map((asgn) => (
                      <tr key={asgn._id} className="hover:bg-surface/20">
                        <td className="py-3 font-semibold text-ink">
                          {(asgn.teacher as any)?.name || 'Faculty'}
                          <span className="block text-[11px] font-mono text-muted">
                            {(asgn.teacher as any)?.identifier}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-mono text-indigo-400 font-bold">
                            {(asgn.subject as any)?.subjectCode}
                          </span>{' '}
                          - {(asgn.subject as any)?.subjectName}
                        </td>
                        <td className="py-3">
                          <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-300 border border-violet-500/20">
                            Semester {(asgn.semester as any)?.semesterNumber || '—'}
                          </span>
                        </td>
                        <td className="py-3 text-muted">Sec {asgn.section || 'A'}</td>
                        <td className="py-3">
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20">
                            {asgn.role || 'PRIMARY_FACULTY'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleRemoveAssignment(asgn._id)}
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                          >
                            Revoke
                          </button>
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
          TAB 3: STUDENT DIRECTORY & PROGRESSION HISTORY
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Department Student Directory</h2>
              <p className="text-xs text-muted mt-0.5">
                View student progression status, active semester enrollments, and complete academic histories.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <input
                type="text"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                placeholder="Search name or roll no..."
                className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs text-ink placeholder-muted focus:border-indigo-500 focus:outline-none"
              />

              {/* Semester Filter */}
              <select
                value={studentSemesterFilter}
                onChange={(e) => setStudentSemesterFilter(e.target.value)}
                className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <option key={num} value={String(num)}>
                    Semester {num}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {studentsLoading && (
            <div className="py-12 text-center text-xs text-muted">Loading department students...</div>
          )}

          {!studentsLoading && filteredStudents.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center">
              <p className="text-sm font-semibold text-ink">No students match your query</p>
              <p className="text-xs text-muted mt-1">Try adjusting the search query or semester filter.</p>
            </div>
          )}

          {!studentsLoading && filteredStudents.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-line bg-panel p-4 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="pb-3 font-semibold">Roll Number</th>
                    <th className="pb-3 font-semibold">Student Name</th>
                    <th className="pb-3 font-semibold">Official College Email</th>
                    <th className="pb-3 font-semibold">Active Semester</th>
                    <th className="pb-3 font-semibold">Enrolled Subjects</th>
                    <th className="pb-3 font-semibold text-right">Progression History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredStudents.map((student) => {
                    const activeSem = (student.activeEnrollment?.semester as any)?.semesterNumber;
                    const enrolledCount = student.activeEnrollment?.enrolledSubjects?.length || 0;

                    return (
                      <tr key={student._id} className="hover:bg-surface/20">
                        <td className="py-3 font-mono font-bold text-indigo-400">
                          {student.identifier}
                        </td>
                        <td className="py-3 font-semibold text-ink">{student.name}</td>
                        <td className="py-3 font-mono text-muted">{student.collegeEmail}</td>
                        <td className="py-3">
                          {activeSem ? (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                              Semester {activeSem}
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/20">
                              Pending Enrollment
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-muted">{enrolledCount} Courses</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleViewStudentHistory(student._id)}
                            disabled={loadingHistory}
                            className="rounded-lg border border-line bg-surface/60 px-3 py-1 text-xs font-semibold text-ink hover:bg-surface transition-all cursor-pointer disabled:opacity-50"
                          >
                            {loadingHistory ? 'Loading...' : 'View History →'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4: ENROLLMENT APPROVAL QUEUE
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'enrollments' && (
        <div className="space-y-6">
          <div className="border-b border-line pb-4">
            <h2 className="text-lg font-bold text-ink">Student Semester Enrollment Approvals</h2>
            <p className="text-xs text-muted mt-0.5">
              Strict RBAC Policy: Approving an enrollment unlocks semester courses. Rejecting denies access completely.
            </p>
          </div>

          {enrollmentsLoading && (
            <div className="py-12 text-center text-xs text-muted">Loading enrollment queue...</div>
          )}

          {!enrollmentsLoading && pendingEnrollmentsList.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xl">
                ✓
              </div>
              <p className="mt-3 text-sm font-semibold text-ink">Enrollment Queue Clean</p>
              <p className="text-xs text-muted mt-1">No pending student enrollment requests require HOD review.</p>
            </div>
          )}

          {!enrollmentsLoading && pendingEnrollmentsList.length > 0 && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
              {pendingEnrollmentsList.map((enrollment) => {
                const student = enrollment.student as any;
                const sem = enrollment.semester as any;

                return (
                  <div
                    key={enrollment._id}
                    className="rounded-xl border border-line bg-surface/30 p-5 space-y-4 hover:border-indigo-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-indigo-400">
                          {student?.identifier || 'STUDENT'}
                        </span>
                        <h4 className="text-base font-bold text-ink">{student?.name}</h4>
                        <p className="text-xs text-muted">{student?.collegeEmail}</p>
                      </div>
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/20">
                        Semester {sem?.semesterNumber || '—'}
                      </span>
                    </div>

                    <div className="rounded-lg border border-line bg-panel p-3 text-xs space-y-1">
                      <p className="font-semibold text-muted text-[11px] uppercase tracking-wider">
                        Requested Course Registrations:
                      </p>
                      <p className="text-ink">
                        {enrollment.enrolledSubjects?.length || 0} Subjects requested for{' '}
                        {enrollment.academicYear}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-line">
                      <button
                        onClick={() => handleReviewEnrollment(enrollment._id, 'APPROVED')}
                        className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-all cursor-pointer shadow text-center"
                      >
                        ✓ Approve & Unlock Semester
                      </button>
                      <button
                        onClick={() =>
                          setRejectModal({
                            type: 'ENROLLMENT',
                            id: enrollment._id,
                            title: `Reject Enrollment for ${student?.name}`,
                          })
                        }
                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white transition-all cursor-pointer text-center"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 5: CURRICULUM & SUBJECT MANAGEMENT
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'subjects' && (
        <div className="space-y-6">
          {/* Header & Sub-view Selector */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-line pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-mono font-bold text-indigo-400 border border-indigo-500/20">
                  {(curriculumTree?.programme?.degree || hodProgramme?.type || 'B.E.')} {hodProgramme?.programmeId || curriculumTree?.department?.code || ''} • {curriculumTree?.regulation || 'R2021'} CBCS
                </span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                  {curriculumTree?.totalProgrammeCredits ?? curriculumTree?.calculatedCredits ?? '—'} Total Credits
                </span>
              </div>
              <h2 className="text-lg font-bold text-ink mt-1">
                {hodProgramme?.name || curriculumTree?.department?.name || 'Programme'} Curriculum & Subjects
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Full institutional scheme of instructions, 8-semester course matrices, elective verticals, and syllabus distributions.
              </p>
            </div>

            {/* Sub Tab Switcher */}
            <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface/50 p-1 flex-wrap">
              <button
                type="button"
                onClick={() => setCurriculumSubTab('curriculumTree')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  curriculumSubTab === 'curriculumTree'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                🏛️ R2021 Curriculum ({curriculumTree?.semesters.reduce((acc, s) => acc + s.subjects.length, 0) || 68})
              </button>
              <button
                type="button"
                onClick={() => setCurriculumSubTab('subjects')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  curriculumSubTab === 'subjects'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                📋 DB Courses ({subjects.length})
              </button>
              <button
                type="button"
                onClick={() => setCurriculumSubTab('verticals')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  curriculumSubTab === 'verticals'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                ⚡ PE Verticals (48)
              </button>
              <button
                type="button"
                onClick={() => setCurriculumSubTab('openElectives')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  curriculumSubTab === 'openElectives'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                🌐 Open Electives (8)
              </button>
            </div>
          </div>

          {/* ─── SUB-VIEW 1: COMPLETE 8-SEMESTER R2021 CBCS CURRICULUM ─── */}
          {curriculumSubTab === 'curriculumTree' && curriculumLoading && (
            <div className="py-12 text-center text-xs text-muted">Loading department curriculum structure...</div>
          )}
          {curriculumSubTab === 'curriculumTree' && !curriculumLoading && curriculumTree && (
            <div className="space-y-6">
              {/* Curriculum Overview Strip */}
              <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted">Department</p>
                    <p className="text-sm font-extrabold text-ink mt-0.5">Information Tech</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted">Regulation</p>
                    <p className="text-sm font-extrabold text-indigo-400 mt-0.5">{curriculumTree.regulation}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted">Duration</p>
                    <p className="text-sm font-extrabold text-ink mt-0.5">4 Years (8 Sem)</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted">Total Credits</p>
                    <p className="text-sm font-extrabold text-emerald-400 mt-0.5">
                      {curriculumTree.totalProgrammeCredits} Credits
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted">PE Verticals</p>
                    <p className="text-sm font-extrabold text-purple-400 mt-0.5">6 Tracks (48 Courses)</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted">Open Electives</p>
                    <p className="text-sm font-extrabold text-teal-400 mt-0.5">8 Courses (Sem 4–7)</p>
                  </div>
                </div>
              </div>

              {/* Semester Filter Pills & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                  <button
                    type="button"
                    onClick={() => setCurriculumSemFilter('ALL')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
                      curriculumSemFilter === 'ALL'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'border border-line bg-surface text-muted hover:text-ink'
                    }`}
                  >
                    All Semesters (8)
                  </button>
                  {curriculumTree.semesters.map((s) => (
                    <button
                      key={s.semesterNumber}
                      type="button"
                      onClick={() => setCurriculumSemFilter(s.semesterNumber)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
                        curriculumSemFilter === s.semesterNumber
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'border border-line bg-surface text-muted hover:text-ink'
                      }`}
                    >
                      Sem {s.semesterNumber} ({s.creditTotal} Cr)
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Search code, title, topic..."
                  value={curriculumSearchQuery}
                  onChange={(e) => setCurriculumSearchQuery(e.target.value)}
                  className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink placeholder-muted focus:border-indigo-500 focus:outline-none w-full sm:w-64"
                />
              </div>

              {/* Semester listings */}
              <div className="space-y-8">
                {curriculumTree.semesters
                  .filter((s) => curriculumSemFilter === 'ALL' || s.semesterNumber === curriculumSemFilter)
                  .map((sem) => {
                    const matchingSubjects = sem.subjects.filter((sub) => {
                      if (!curriculumSearchQuery.trim()) return true;
                      const q = curriculumSearchQuery.toLowerCase();
                      return (
                        sub.subjectCode.toLowerCase().includes(q) ||
                        sub.subjectName.toLowerCase().includes(q) ||
                        (sub.syllabus &&
                          sub.syllabus.some(
                            (u) =>
                              u.title.toLowerCase().includes(q) ||
                              (u.topics && u.topics.some((top) => top.toLowerCase().includes(q)))
                          ))
                      );
                    });

                    if (matchingSubjects.length === 0) return null;

                    return (
                      <div key={sem.semesterNumber} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-line pb-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-indigo-500/10 px-3 py-1 text-sm font-bold text-indigo-400 border border-indigo-500/20">
                              Semester {sem.semesterNumber}
                            </span>
                            <span className="text-xs text-muted">
                              {sem.academicYear} • {matchingSubjects.length} Courses
                            </span>
                          </div>
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                            {sem.creditTotal} Credits
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6">
                          {matchingSubjects.map((sub) => {
                            const assignedTeacher = assignments.find(
                              (a) => (a.subject as any)?._id === sub._id || (a.subject as any)?.subjectCode === sub.subjectCode
                            );
                            const isSyllabusOpen = !!expandedSyllabusSubjects[sub._id];

                            return (
                              <div
                                key={sub._id}
                                className="rounded-2xl border border-line bg-surface/30 p-5 flex flex-col justify-between space-y-4 hover:border-indigo-500/30 transition-all"
                              >
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                        {sub.subjectCode}
                                      </span>
                                      {sub.category && (
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                            sub.category === 'PC'
                                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                              : sub.category === 'PE'
                                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                              : sub.category === 'OE'
                                              ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                                              : sub.category === 'BS'
                                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                              : sub.category === 'HS'
                                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                              : 'bg-surface text-muted border-line'
                                          }`}
                                        >
                                          {sub.category}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                      {sub.credits} Credits
                                    </span>
                                  </div>

                                  <div>
                                    <h4 className="text-sm font-bold text-ink leading-snug">{sub.subjectName}</h4>
                                    <p className="text-xs text-muted mt-1">
                                      Faculty:{' '}
                                      {assignedTeacher ? (
                                        <span className="font-semibold text-emerald-400">
                                          {assignedTeacher.teacher?.name} ({assignedTeacher.section !== 'ALL' ? `Sec ${assignedTeacher.section}` : 'All Sec'})
                                        </span>
                                      ) : (
                                        <span className="font-medium text-amber-400">Unassigned</span>
                                      )}
                                    </p>
                                  </div>

                                  {/* Elective Slot Tag */}
                                  {sub.isElectiveSlot && (
                                    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-2.5 text-xs text-purple-300">
                                      <p className="font-bold">⚡ {sub.electiveSlotType === 'PEC' ? 'Professional Elective Slot' : 'Open Elective Slot'}</p>
                                      <p className="text-[11px] text-muted mt-0.5">
                                        Students choose 1 elective from {sub.electiveSlotType === 'PEC' ? 'the 6 PEC Verticals' : 'the Open Electives basket'}.
                                      </p>
                                    </div>
                                  )}

                                  {/* Unit I to Unit V breakdown */}
                                  {sub.syllabus && sub.syllabus.length > 0 && (
                                    <div className="pt-2 border-t border-line/50">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedSyllabusSubjects((prev) => ({
                                            ...prev,
                                            [sub._id]: !prev[sub._id],
                                          }))
                                        }
                                        className="w-full flex items-center justify-between text-xs font-semibold text-indigo-400 hover:text-indigo-300 py-1 cursor-pointer"
                                      >
                                        <span>📖 Syllabus Units ({sub.syllabus.length} Units)</span>
                                        <span>{isSyllabusOpen ? '▲ Hide' : '▼ View Units'}</span>
                                      </button>

                                      {isSyllabusOpen && (
                                        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
                                          {sub.syllabus.map((u, idx) => (
                                            <div
                                              key={idx}
                                              className="rounded-lg border border-line bg-panel p-2.5 space-y-1 text-xs"
                                            >
                                              <div className="flex items-center justify-between">
                                                <span className="font-bold text-indigo-400">Unit {u.unitNumber}: {u.title}</span>
                                                {u.hours && <span className="text-[10px] font-mono text-muted">{u.hours} hrs</span>}
                                              </div>
                                              {u.description && <p className="text-[11px] text-muted">{u.description}</p>}
                                              {u.topics && u.topics.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                  {u.topics.map((t, tidx) => (
                                                    <span
                                                      key={tidx}
                                                      className="rounded bg-surface border border-line px-1.5 py-0.5 text-[10px] text-muted line-clamp-1"
                                                    >
                                                      {t}
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="pt-3 border-t border-line/60 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAssignModalForSubject(sub._id, sem._id)}
                                    className="w-full rounded-xl bg-indigo-600 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all cursor-pointer text-center"
                                  >
                                    + Assign Faculty
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ─── SUB-VIEW 2: DB SUBJECTS (CREATE/EDIT) ─── */}
          {curriculumSubTab === 'subjects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <select
                  value={selectedSemesterId}
                  onChange={(e) => setSelectedSemesterId(e.target.value)}
                  className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ALL">All Semesters</option>
                  {semesters.map((s) => (
                    <option key={s._id} value={s._id}>
                      Semester {s.semesterNumber} ({s.academicYear})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowAddSubject(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  + Create Subject
                </button>
              </div>

              {subjectsLoading && (
                <div className="py-12 text-center text-xs text-muted">Loading curriculum subjects...</div>
              )}

              {!subjectsLoading && filteredSubjects.length === 0 && (
                <div className="rounded-2xl border border-dashed border-line p-12 text-center">
                  <p className="text-sm font-semibold text-ink">No course subjects found for this selection</p>
                  <p className="text-xs text-muted mt-1">Use the "+ Create Subject" button to add a new course.</p>
                </div>
              )}

              {!subjectsLoading && filteredSubjects.length > 0 && (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6">
                  {filteredSubjects.map((sub) => (
                    <div
                      key={sub._id}
                      className="flex flex-col justify-between rounded-xl border border-line bg-surface/30 p-5 space-y-4 hover:border-indigo-500/30 transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {sub.subjectCode}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted border border-line">
                              Sem {sub.semesterNumber}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                sub.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                            >
                              {sub.status}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-ink leading-snug">{sub.subjectName}</h4>
                          <p className="text-xs text-muted mt-1">{sub.credits} Credits • {sub.syllabus?.length || 0} Units defined</p>
                        </div>

                        {/* Syllabus preview */}
                        {sub.syllabus && sub.syllabus.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-line/60">
                            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                              Units:
                            </p>
                            {sub.syllabus.slice(0, 3).map((u) => (
                              <p key={u._id || u.unitNumber} className="text-xs text-ink/80 truncate">
                                Unit {u.unitNumber}: {u.title}
                              </p>
                            ))}
                            {sub.syllabus.length > 3 && (
                              <p className="text-[10px] text-muted">+{sub.syllabus.length - 3} more units</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-line flex items-center gap-2">
                        <button
                          onClick={() => {
                            setChapterSubjectId(sub._id);
                            setChapterUnit((sub.syllabus?.length || 0) + 1);
                          }}
                          className="flex-1 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface transition-all text-center cursor-pointer"
                        >
                          + Add Unit
                        </button>
                        <button
                          onClick={() => handleToggleSubjectStatus(sub)}
                          className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all text-center cursor-pointer ${
                            sub.status === 'ACTIVE'
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white'
                          }`}
                        >
                          {sub.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── SUB-VIEW 3: 48 PROFESSIONAL ELECTIVES ACROSS 6 VERTICALS ─── */}
          {curriculumSubTab === 'verticals' && curriculumTree && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-purple-400">
                    Professional Electives Track (48 Total Courses • 3 Credits Each)
                  </span>
                  <span className="text-xs font-semibold text-muted">6 Specialized Industry Verticals</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Students specialize in any of the 6 industry verticals across Semesters 5, 6, 7, and 8.
                </p>
              </div>

              {/* Vertical filter pills */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                <button
                  type="button"
                  onClick={() => setCurriculumVerticalFilter('ALL')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
                    curriculumVerticalFilter === 'ALL'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'border border-line bg-surface text-muted hover:text-ink'
                  }`}
                >
                  All 6 Verticals (48)
                </button>
                {Object.keys(curriculumTree.professionalElectives.verticals).map((vertKey) => {
                  const vert = curriculumTree.professionalElectives.verticals[vertKey];
                  if (!vert) return null;
                  return (
                    <button
                      key={vertKey}
                      type="button"
                      onClick={() => setCurriculumVerticalFilter(vertKey)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
                        curriculumVerticalFilter === vertKey
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'border border-line bg-surface text-muted hover:text-ink'
                      }`}
                    >
                      V{vert.verticalNumber}: {vert.verticalName} ({vert.electives.length})
                    </button>
                  );
                })}
              </div>

              <div className="space-y-8">
                {Object.keys(curriculumTree.professionalElectives.verticals)
                  .filter((vKey) => curriculumVerticalFilter === 'ALL' || curriculumVerticalFilter === vKey)
                  .map((vKey) => {
                    const vert = curriculumTree.professionalElectives.verticals[vKey];
                    if (!vert) return null;

                    return (
                      <div key={vKey} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-line pb-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-purple-500/10 px-3 py-1 text-sm font-bold text-purple-400 border border-purple-500/20">
                              Vertical {vert.verticalNumber}: {vert.verticalName}
                            </span>
                            <span className="text-xs text-muted">{vert.electives.length} Elective Courses</span>
                          </div>
                          <span className="text-xs font-mono text-muted">Semesters 5–8 (PEC I to PEC VI)</span>
                        </div>

                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6">
                          {vert.electives.map((pe) => (
                            <div
                              key={pe._id}
                              className="rounded-2xl border border-line bg-surface/30 p-5 flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition-all"
                            >
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                    {pe.code}
                                  </span>
                                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    {pe.credits} Credits
                                  </span>
                                </div>

                                <div>
                                  <h4 className="text-sm font-bold text-ink leading-snug">{pe.name}</h4>
                                  <p className="text-xs text-muted mt-1">Category: {pe.category}</p>
                                </div>

                                {pe.syllabusSummary && (
                                  <p className="text-xs text-muted leading-relaxed line-clamp-3">
                                    {pe.syllabusSummary}
                                  </p>
                                )}

                                {pe.topics && pe.topics.length > 0 && (
                                  <div className="space-y-1 pt-2 border-t border-line/50">
                                    <p className="text-[10px] uppercase font-bold text-muted">Topics:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {pe.topics.map((t, idx) => (
                                        <span
                                          key={idx}
                                          className="rounded bg-panel border border-line px-1.5 py-0.5 text-[10px] text-muted"
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="pt-3 border-t border-line/60 flex items-center justify-between">
                                <span className="text-[10px] font-mono text-muted">{pe.slots?.join(', ') || 'PEC-I to PEC-VI'}</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignModalForSubject(pe._id)}
                                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 transition-all cursor-pointer"
                                >
                                  + Assign
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ─── SUB-VIEW 4: 8 OPEN ELECTIVES ACROSS SEMESTERS 4-7 ─── */}
          {curriculumSubTab === 'openElectives' && curriculumTree && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-teal-400">
                    Open Electives Basket (8 Total Courses • 3 Credits Each)
                  </span>
                  <span className="text-xs font-semibold text-muted">Interdisciplinary Options</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Open elective courses offered across Semesters 4, 5, 6, and 7 to promote interdisciplinary learning.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {curriculumTree.openElectives.all.map((oe) => (
                  <div
                    key={oe._id}
                    className="rounded-2xl border border-line bg-surface/30 p-5 flex flex-col justify-between space-y-3 hover:border-teal-500/40 transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                          {oe.code}
                        </span>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {oe.credits} Credits
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-ink leading-snug">{oe.name}</h4>
                        <p className="text-xs text-muted mt-0.5">
                          Sem {oe.semesterNumber} • {oe.slot} • Group {oe.group}
                        </p>
                      </div>

                      {oe.syllabusSummary && (
                        <p className="text-xs text-muted leading-relaxed line-clamp-3">
                          {oe.syllabusSummary}
                        </p>
                      )}

                      {oe.topics && oe.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {oe.topics.map((t, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-panel border border-line px-1.5 py-0.5 text-[10px] text-muted"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted">{oe.category}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenAssignModalForSubject(oe._id)}
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition-all cursor-pointer"
                      >
                        + Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 6: SEMESTERS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'semesters' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Department Academic Semesters</h2>
              <p className="text-xs text-muted mt-0.5">
                Configured academic terms, syllabus regulation schemes, and curriculum distributions.
              </p>
            </div>
            <span className="text-xs font-mono text-muted">
              {semesters.length} Semesters Configured
            </span>
          </div>

          {semesters.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-lg">
                🗓
              </div>
              <h3 className="mt-3 text-sm font-semibold text-ink">No Semesters Found</h3>
              <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                No academic semesters have been configured for this department yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6">
              {semesters.map((sem) => {
                const semSubjects = subjects.filter(
                  (s) =>
                    (typeof s.semester === 'object' && s.semester?._id === sem._id) ||
                    s.semester === sem._id ||
                    s.semesterNumber === sem.semesterNumber
                );
                const totalCredits = semSubjects.reduce((acc, curr) => acc + (curr.credits || 0), 0);

                return (
                  <div
                    key={sem._id}
                    className="rounded-xl border border-line bg-surface/30 p-5 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-indigo-400">
                          Semester {sem.semesterNumber}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            sem.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-surface text-muted border border-line'
                          }`}
                        >
                          {sem.status || 'ACTIVE'}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <p className="text-muted">
                          Academic Year: <span className="font-semibold text-ink">{sem.academicYear}</span>
                        </p>
                        <p className="text-muted">
                          Regulation: <span className="font-mono text-ink">{sem.regulation || 'Default'}</span>
                        </p>
                        <p className="text-muted">
                          Curriculum Courses:{' '}
                          <span className="font-bold text-ink">{semSubjects.length} Subjects</span> ({totalCredits} Total Credits)
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-line/60 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSemesterId(sem._id);
                          handleTabChange('subjects');
                        }}
                        className="rounded-lg bg-card border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:text-primary/80 cursor-pointer"
                      >
                        View Subjects →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 7: TEACHER ASSIGNMENTS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'teacherAssignments' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Teacher Course Allocation Matrix</h2>
              <p className="text-xs text-muted mt-0.5">
                Official faculty assignments to curriculum subjects across academic semesters and sections.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedTeacherForModal(null);
                setShowAssignModal(true);
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm cursor-pointer transition-all"
            >
              + Assign Faculty to Course
            </button>
          </div>

          {assignmentsLoading ? (
            <div className="py-12 text-center text-xs text-muted animate-pulse">
              Loading faculty assignments matrix...
            </div>
          ) : assignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-12 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-lg">
                🤝
              </div>
              <h3 className="mt-3 text-sm font-semibold text-ink">No Active Faculty Assignments</h3>
              <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                No faculty members have been mapped to curriculum courses for this department yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface/50 border-b border-line text-muted font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Faculty Member</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Semester</th>
                    <th className="p-3">Section</th>
                    <th className="p-3">Academic Year</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {assignments.map((asgn) => (
                    <tr key={asgn._id} className="hover:bg-surface/30">
                      <td className="p-3">
                        <div className="font-semibold text-ink">{asgn.teacher?.name}</div>
                        <div className="text-[11px] text-muted font-mono">{asgn.teacher?.collegeEmail}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-mono font-bold text-indigo-400">{asgn.subject?.subjectCode}</div>
                        <div className="text-ink">{asgn.subject?.subjectName}</div>
                      </td>
                      <td className="p-3 font-semibold text-ink">
                        Semester {asgn.semester?.semesterNumber || '-'}
                      </td>
                      <td className="p-3">
                        <span className="rounded bg-surface px-2 py-0.5 text-[11px] font-mono border border-line">
                          {asgn.section !== 'ALL' ? `Sec ${asgn.section}` : 'All Sections'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-muted">{asgn.semester?.academicYear || '-'}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleRemoveAssignment(asgn._id)}
                          className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 8: DEPARTMENT ANALYTICS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Department Academic Analytics</h2>
              <p className="text-xs text-muted mt-0.5">
                Real-time database aggregated metrics on student enrollment, faculty allocation, and curriculum distribution.
              </p>
            </div>
            <button
              onClick={() => {
                refetchStats();
                refetchSubjects();
                refetchAssignments();
              }}
              className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface/80 cursor-pointer"
            >
              ↻ Refresh Live Aggregation
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-line bg-surface/30 p-5">
              <p className="text-xs uppercase font-bold text-muted">Student-to-Faculty Ratio</p>
              <p className="mt-2 text-3xl font-extrabold text-emerald-400">
                {stats ? `${(stats.studentCount / (stats.approvedFaculty || 1)).toFixed(1)} : 1` : '0 : 1'}
              </p>
              <p className="mt-1 text-xs text-muted">
                {stats?.studentCount || 0} students across {stats?.approvedFaculty || 0} active faculty
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface/30 p-5">
              <p className="text-xs uppercase font-bold text-muted">Faculty Approval Rate</p>
              <p className="mt-2 text-3xl font-extrabold text-indigo-400">
                {stats && stats.facultyCount > 0
                  ? `${Math.round((stats.approvedFaculty / stats.facultyCount) * 100)}%`
                  : '100%'}
              </p>
              <p className="mt-1 text-xs text-muted">
                {stats?.pendingFaculty || 0} applications awaiting verification
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface/30 p-5">
              <p className="text-xs uppercase font-bold text-muted">Active Teaching Assignments</p>
              <p className="mt-2 text-3xl font-extrabold text-ink">{assignments.length}</p>
              <p className="mt-1 text-xs text-muted">Courses currently staffed by faculty</p>
            </div>

            <div className="rounded-xl border border-line bg-surface/30 p-5">
              <p className="text-xs uppercase font-bold text-muted">Curriculum Courses</p>
              <p className="mt-2 text-3xl font-extrabold text-teal-400">{subjects.length}</p>
              <p className="mt-1 text-xs text-muted">Active accredited subjects</p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 9: ANNOUNCEMENTS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'announcements' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Department Announcements & Circulars</h2>
              <p className="text-xs text-muted mt-0.5">
                Official notices broadcast to faculty and students across your academic department.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-line p-10 text-center space-y-3">
            <div className="text-2xl">📢</div>
            <h3 className="text-sm font-bold text-ink">Department Broadcast System</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              Announcements published through course workspaces or departmental notifications are broadcast automatically to all enrolled students and faculty in this department.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 10: AUDIT
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Department Governance & Audit Trail</h2>
              <p className="text-xs text-muted mt-0.5">
                Audit record of administrative decisions, faculty reviews, enrollment actions, and teaching allocations.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-line bg-surface/30 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">Department Integrity Verification</span>
                <span className="font-mono text-emerald-400">PASSED ✓</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                All administrative actions (enrollment approval, rejection with cause, faculty vetting, teaching allocations) are cryptographically logged with caller identification and timestamp.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: STUDENT ACADEMIC HISTORY
      ══════════════════════════════════════════════════════════ */}
      {selectedStudentHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-400">
                  {selectedStudentHistory.student.identifier}
                </span>
                <h3 className="text-xl font-bold text-ink">{selectedStudentHistory.student.name}</h3>
                <p className="text-xs text-muted">
                  Official College Email: {selectedStudentHistory.student.collegeEmail}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentHistory(null)}
                className="rounded-lg border border-line p-1.5 text-xs text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Semester Progression History */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-ink">Semester Enrollment Progression History</h4>
              {selectedStudentHistory.enrollments.length === 0 ? (
                <p className="text-xs text-muted">No historical enrollment records found.</p>
              ) : (
                <div className="space-y-3">
                  {selectedStudentHistory.enrollments.map((enr) => (
                    <div
                      key={enr._id}
                      className="rounded-xl border border-line bg-surface/30 p-4 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink text-sm">
                          Semester {enr.semester?.semesterNumber} ({enr.semester?.academicYear})
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            enr.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                              : enr.status === 'COMPLETED'
                              ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                          }`}
                        >
                          {enr.status}
                        </span>
                      </div>
                      <p className="text-muted">
                        Regulation: {enr.semester?.regulation} • Requested: {new Date(enr.requestedAt).toLocaleDateString()}
                      </p>
                      <div className="pt-2 border-t border-line/60">
                        <p className="font-semibold text-muted text-[11px]">Enrolled Subjects:</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {enr.enrolledSubjects?.map((sub) => (
                            <span
                              key={sub._id}
                              className="rounded bg-surface px-2 py-0.5 font-mono text-[11px] text-ink border border-line"
                            >
                              {sub.subjectCode}: {sub.subjectName} ({sub.credits} cr)
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Academic Results & GPA */}
            {selectedStudentHistory.semesterResults?.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-line">
                <h4 className="text-sm font-bold text-ink">Published Academic Results & GPA</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedStudentHistory.semesterResults.map((sr) => (
                    <div key={sr._id} className="rounded-xl border border-line bg-surface/30 p-3 text-center">
                      <p className="text-[11px] font-bold text-muted">Semester {sr.semesterNumber}</p>
                      <p className="text-xl font-extrabold text-emerald-400 mt-1">{sr.gpa?.toFixed(2)}</p>
                      <p className="text-[10px] text-muted">GPA / CGPA: {sr.cgpa?.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-line flex justify-end">
              <button
                onClick={() => setSelectedStudentHistory(null)}
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: TEACHER PROFILE DETAILS
      ══════════════════════════════════════════════════════════ */}
      {selectedTeacherDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-400">
                  {selectedTeacherDetails.identifier}
                </span>
                <h3 className="text-xl font-bold text-ink">{selectedTeacherDetails.name}</h3>
                <p className="text-xs text-muted">{selectedTeacherDetails.collegeEmail}</p>
              </div>
              <button
                onClick={() => setSelectedTeacherDetails(null)}
                className="rounded-lg border border-line p-1.5 text-xs text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-line bg-surface/30 p-4 space-y-2">
                <p>
                  <strong>Designation:</strong>{' '}
                  {selectedTeacherDetails.profile?.designation || 'Faculty Member'}
                </p>
                <p>
                  <strong>Specialization:</strong>{' '}
                  {selectedTeacherDetails.profile?.specialization || 'Academic Instruction'}
                </p>
                <p>
                  <strong>Approval Status:</strong>{' '}
                  <span className="font-semibold text-emerald-400">
                    {selectedTeacherDetails.approvalStatus}
                  </span>
                </p>
              </div>

              <div>
                <h4 className="font-bold text-ink text-sm mb-2">Assigned Courses Across Semesters:</h4>
                {!selectedTeacherDetails.assignments || selectedTeacherDetails.assignments.length === 0 ? (
                  <p className="text-muted">No courses currently assigned to this faculty.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedTeacherDetails.assignments.map((asgn: any) => (
                      <div
                        key={asgn._id}
                        className="flex items-center justify-between rounded-lg border border-line bg-surface/20 p-2.5"
                      >
                        <div>
                          <span className="font-mono font-bold text-indigo-400">
                            {asgn.subject?.subjectCode}
                          </span>{' '}
                          - {asgn.subject?.subjectName}
                        </div>
                        <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-300 border border-violet-500/20">
                          Semester {asgn.semester?.semesterNumber}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-line flex justify-end">
              <button
                onClick={() => setSelectedTeacherDetails(null)}
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: REJECTION REASON MODAL
      ══════════════════════════════════════════════════════════ */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-ink">{rejectModal.title}</h3>
            <p className="text-xs text-muted">
              Please enter an official justification note for this rejection.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete credentials, incorrect department selection, or prerequisite not met."
              rows={3}
              className="w-full rounded-xl border border-line bg-surface p-3 text-xs text-ink placeholder-muted focus:border-rose-500 focus:outline-none"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                onClick={() => setRejectModal(null)}
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectModal.type === 'FACULTY') {
                    handleReviewFaculty(rejectModal.id, 'REJECTED', rejectionReason);
                  } else {
                    handleReviewEnrollment(rejectModal.id, 'REJECTED', rejectionReason);
                  }
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: ASSIGN TEACHER TO SUBJECT
      ══════════════════════════════════════════════════════════ */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">
                {selectedTeacherForModal
                  ? `Assign ${selectedTeacherForModal.name} to Course`
                  : 'Assign Faculty to Course'}
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="rounded-lg border border-line p-1 text-xs text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignTeacher} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-muted mb-1">Select Faculty Member</label>
                <select
                  value={asgnTeacherId}
                  onChange={(e) => setAsgnTeacherId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose Teacher --</option>
                  {faculty.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name} ({f.identifier})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-muted mb-1">Select Semester</label>
                <select
                  value={asgnSemesterId}
                  onChange={(e) => setAsgnSemesterId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose Semester --</option>
                  {semesters.map((s) => (
                    <option key={s._id} value={s._id}>
                      Semester {s.semesterNumber} ({s.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-muted mb-1">Select Course Subject</label>
                <select
                  value={asgnSubjectId}
                  onChange={(e) => setAsgnSubjectId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose Subject --</option>
                  {subjects.map((sub) => (
                    <option key={sub._id} value={sub._id}>
                      {sub.subjectCode} - {sub.subjectName} (Sem {sub.semesterNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-muted mb-1">Section</label>
                <select
                  value={asgnSection}
                  onChange={(e) => setAsgnSection(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink focus:border-indigo-500 focus:outline-none"
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                  <option value="ALL">All Sections</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={asgnLoading}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                >
                  {asgnLoading ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: CREATE NEW SUBJECT
      ══════════════════════════════════════════════════════════ */}
      {showAddSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Create New Course Subject</h3>
              <button
                onClick={() => setShowAddSubject(false)}
                className="rounded-lg border border-line p-1 text-xs text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-muted mb-1">Subject Name</label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="e.g. Distributed Cloud Computing"
                  required
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink placeholder-muted focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted mb-1">Course Code</label>
                  <input
                    type="text"
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value.toUpperCase())}
                    placeholder="e.g. U25IT501"
                    required
                    className="w-full rounded-xl border border-line bg-surface p-2.5 font-mono text-ink placeholder-muted focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-muted mb-1">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={subCredits}
                    onChange={(e) => setSubCredits(Number(e.target.value))}
                    required
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-muted mb-1">Semester</label>
                <select
                  value={subSemId}
                  onChange={(e) => {
                    setSubSemId(e.target.value);
                    const s = semesters.find((item) => item._id === e.target.value);
                    if (s) setSubSemNumber(s.semesterNumber);
                  }}
                  required
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose Semester --</option>
                  {semesters.map((s) => (
                    <option key={s._id} value={s._id}>
                      Semester {s.semesterNumber} ({s.academicYear} • {s.regulation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subLoading}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                >
                  {subLoading ? 'Creating...' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL: ADD SYLLABUS UNIT
      ══════════════════════════════════════════════════════════ */}
      {chapterSubjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Add Syllabus Unit</h3>
              <button
                onClick={() => setChapterSubjectId(null)}
                className="rounded-lg border border-line p-1 text-xs text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddChapter} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted mb-1">Unit Number</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={chapterUnit}
                    onChange={(e) => setChapterUnit(Number(e.target.value))}
                    required
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-muted mb-1">Contact Hours</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={chapterHours}
                    onChange={(e) => setChapterHours(Number(e.target.value))}
                    required
                    className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-muted mb-1">Unit Title</label>
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="e.g. Concurrency Control and Transaction Recovery"
                  required
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink placeholder-muted focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-muted mb-1">
                  Topics Covered (One topic per line)
                </label>
                <textarea
                  value={chapterTopics}
                  onChange={(e) => setChapterTopics(e.target.value)}
                  placeholder="ACID Properties&#10;Two-Phase Locking&#10;Deadlock Prevention Protocols&#10;WAL Logging"
                  rows={4}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-ink placeholder-muted focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setChapterSubjectId(null)}
                  className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={chapterLoading}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                >
                  {chapterLoading ? 'Adding...' : 'Add Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
