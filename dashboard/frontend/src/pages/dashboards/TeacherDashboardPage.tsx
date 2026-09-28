import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { AcademicService } from '@/services/academic.service';
import { TrackingService } from '@/services/tracking.service';
import { AssignmentBuilderModal } from '@/pages/assignment/AssignmentBuilderModal';
import { AssignmentGradingModal } from '@/pages/assignment/AssignmentGradingModal';
import { AttendanceManagerModal } from '@/pages/attendance/AttendanceManagerModal';
import { assignmentService } from '@/services/assignment.service';
import { SmartBoardLaunchModal } from '@/components/smartboard/SmartBoardLaunchModal';
import { SmartBoardRemoteDock } from '@/components/smartboard/SmartBoardRemoteDock';
import { launchSmartBoardSimulation } from '@/components/smartboard/launchSmartBoardSimulation';
import { SimulationManager } from '@/simulations';
import { SecureFileManagerModal } from '@/components/file/SecureFileManagerModal';
import type {
  ITeacherDashboardOverview,
  ITeacherAssignedSubjectsData,
  ITeacherSubjectWorkspaceData,
  IStudentProgressItem,
  ICreateContentPayload,
  ITeacherSubjectResults,
  ISmartBoardSessionPayload,
  ICurriculumTree,
  ITeacherCurriculumResponse,
  ITeacherCurriculumUnit,
  ITeacherTopic,
  IAIKnowledgeStats,
} from '@/types/academic.types';

type TeacherWorkspaceTab =
  | 'overview'
  | 'mySubjects'
  | 'curriculum'
  | 'notes'
  | 'materials'
  | 'videos'
  | 'presentations'
  | 'quizzes'
  | 'assignments'
  | 'submissions'
  | 'announcements'
  | 'attendance'
  | 'results'
  | 'studentProgress'
  | 'simulations'
  | 'aiKnowledge'
  | 'secureFiles';

export function TeacherDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Overview & Assigned subjects state
  const [overview, setOverview] = useState<ITeacherDashboardOverview | null>(null);
  const [assignedData, setAssignedData] = useState<ITeacherAssignedSubjectsData | null>(null);
  const [curriculumTree, setCurriculumTree] = useState<ICurriculumTree | null>(null);
  const [curriculumSubTab, setCurriculumSubTab] = useState<'assigned' | 'curriculum' | 'verticals' | 'openElectives'>('assigned');
  const [curriculumSemFilter, setCurriculumSemFilter] = useState<number | 'ALL'>('ALL');
  const [curriculumVerticalFilter, setCurriculumVerticalFilter] = useState<string>('ALL');
  const [curriculumSearchQuery, setCurriculumSearchQuery] = useState<string>('');
  const [expandedSyllabusSubjects, setExpandedSyllabusSubjects] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cascading Subject Selector state
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedSemNum, setSelectedSemNum] = useState<number | ''>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Subject Workspace state
  const [workspace, setWorkspace] = useState<ITeacherSubjectWorkspaceData | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<TeacherWorkspaceTab>(
    (currentTabParam as TeacherWorkspaceTab) || 'overview'
  );

  useEffect(() => {
    if (currentTabParam && currentTabParam !== activeTab) {
      setActiveTab(currentTabParam as TeacherWorkspaceTab);
    }
  }, [currentTabParam]);

  const handleTabChange = (tabId: TeacherWorkspaceTab) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Student progress state
  const [studentsProgress, setStudentsProgress] = useState<IStudentProgressItem[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressSearch, setProgressSearch] = useState('');

  // Modals state
  const [showContentModal, setShowContentModal] = useState<
    'NOTES' | 'MATERIALS' | 'VIDEOS' | 'PRESENTATIONS' | 'ANNOUNCEMENTS' | null
  >(null);
  const [contentForm, setContentForm] = useState<ICreateContentPayload>({
    title: '',
    description: '',
    contentType: 'NOTES',
    chapterOrUnit: 1,
    attachments: [{ name: '', url: '' }],
    status: 'PUBLISHED',
  });
  const [submittingContent, setSubmittingContent] = useState(false);

  // Assignment & Grading Modals
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);

  // Attendance & Tracking
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [teacherResults, setTeacherResults] = useState<ITeacherSubjectResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsSubTab, setResultsSubTab] = useState<'roster' | 'quizzes' | 'assignments'>('roster');

  // Smart Board Integration
  const [showSmartBoardModal, setShowSmartBoardModal] = useState(false);
  const [smartBoardResource, setSmartBoardResource] = useState<any | null>(null);
  const [activeBoardSession, setActiveBoardSession] = useState<ISmartBoardSessionPayload | null>(null);

  // Secure File Management Modal
  const [showFileManagerModal, setShowFileManagerModal] = useState(false);

  // Teacher Curriculum State (Units I to V: Protected Syllabus + Custom Chapter Content)
  const [teacherCurriculum, setTeacherCurriculum] = useState<ITeacherCurriculumResponse | null>(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [editingUnit, setEditingUnit] = useState<ITeacherCurriculumUnit | null>(null);
  const [curriculumForm, setCurriculumForm] = useState<{
    chapterTitle: string;
    teachingNotes: string;
    learningObjectives: string;
    importantPoints: string;
    practicalExamples: string;
    referenceMaterials: string;
    topics: ITeacherTopic[];
  }>({
    chapterTitle: '',
    teachingNotes: '',
    learningObjectives: '',
    importantPoints: '',
    practicalExamples: '',
    referenceMaterials: '',
    topics: [],
  });
  const [savingCurriculum, setSavingCurriculum] = useState(false);
  const [curriculumSaveSuccess, setCurriculumSaveSuccess] = useState<string | null>(null);

  // Topic Add/Edit within Unit
  const [newTopicForm, setNewTopicForm] = useState<{
    title: string;
    explanation: string;
    examples: string;
    formulas: string;
    notes: string;
  }>({
    title: '',
    explanation: '',
    examples: '',
    formulas: '',
    notes: '',
  });
  const [showAddTopic, setShowAddTopic] = useState(false);

  // AI Knowledge Stats State
  const [aiStats, setAiStats] = useState<IAIKnowledgeStats | null>(null);
  const [loadingAiStats, setLoadingAiStats] = useState(false);

  const handleLaunchSmartBoard = (initialResource?: any, targetSubjectId?: string) => {
    const subId = targetSubjectId || initialResource?.subjectId || initialResource?._id;
    if (subId) {
      setSelectedSubjectId(subId);
      const matched = assignedData?.subjects.find((s) => s._id === subId);
      if (matched) {
        if (matched.departmentId) setSelectedDeptId(matched.departmentId);
        if (matched.semesterNumber) setSelectedSemNum(matched.semesterNumber);
      }
    }
    setSmartBoardResource(initialResource || null);
    setShowSmartBoardModal(true);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ov, assigned, tree] = await Promise.all([
        AcademicService.getTeacherDashboardOverview(),
        AcademicService.getTeacherAssignedSubjects(),
        AcademicService.getCurriculumTree().catch(() => null),
      ]);
      setOverview(ov);
      setAssignedData(assigned);
      if (tree) {
        setCurriculumTree(tree);
      }

      // Auto-select first subject if available
      if (assigned.subjects && assigned.subjects.length > 0) {
        const first = assigned.subjects[0];
        if (first) {
          setSelectedDeptId(first.departmentId || '');
          setSelectedSemNum(first.semesterNumber || '');
          setSelectedSubjectId(first._id);
          loadSubjectWorkspace(first._id);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load teacher dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const loadSubjectWorkspace = async (subjectId: string) => {
    try {
      setLoadingWorkspace(true);
      setWorkspaceError(null);
      const ws = await AcademicService.getTeacherSubjectWorkspace(subjectId);
      setWorkspace(ws);
      // Fetch student progress, results analytics, curriculum units, and AI RAG stats
      loadStudentsProgress(subjectId);
      loadTeacherResults(subjectId);
      loadCurriculum(subjectId);
      loadAiStats(subjectId);
    } catch (err: any) {
      setWorkspaceError(err?.response?.data?.message || err?.message || 'Failed to load subject workspace.');
    } finally {
      setLoadingWorkspace(false);
    }
  };

  const loadCurriculum = async (subjectId: string) => {
    try {
      setLoadingCurriculum(true);
      const curr = await AcademicService.getTeacherSubjectCurriculum(subjectId);
      setTeacherCurriculum(curr);
    } catch (err: any) {
      console.error('Failed to load teacher curriculum:', err);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  const loadAiStats = async (subjectId: string) => {
    try {
      setLoadingAiStats(true);
      const stats = await AcademicService.getTeacherKnowledgeBaseStats(subjectId);
      setAiStats(stats);
    } catch (err: any) {
      console.error('Failed to load AI knowledge stats:', err);
    } finally {
      setLoadingAiStats(false);
    }
  };

  const handleStartEditUnit = (unit: ITeacherCurriculumUnit) => {
    setEditingUnit(unit);
    setCurriculumSaveSuccess(null);
    setShowAddTopic(false);
    setCurriculumForm({
      chapterTitle: unit.teacherContent?.chapterTitle || unit.officialTitle || '',
      teachingNotes: unit.teacherContent?.teachingNotes || '',
      learningObjectives: (unit.teacherContent?.learningObjectives || []).join('\n'),
      importantPoints: (unit.teacherContent?.importantPoints || []).join('\n'),
      practicalExamples: (unit.teacherContent?.practicalExamples || []).join('\n'),
      referenceMaterials: (unit.teacherContent?.referenceMaterials || []).join('\n'),
      topics: unit.teacherContent?.topics ? [...unit.teacherContent.topics] : [],
    });
  };

  const handleSaveUnitCurriculum = async () => {
    if (!selectedSubjectId || !editingUnit) return;
    try {
      setSavingCurriculum(true);
      const payload = {
        chapterTitle: curriculumForm.chapterTitle.trim() || editingUnit.officialTitle,
        teachingNotes: curriculumForm.teachingNotes.trim(),
        learningObjectives: curriculumForm.learningObjectives
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        importantPoints: curriculumForm.importantPoints
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        practicalExamples: curriculumForm.practicalExamples
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        referenceMaterials: curriculumForm.referenceMaterials
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        topics: curriculumForm.topics,
      };

      await AcademicService.saveTeacherSubjectCurriculum(
        selectedSubjectId,
        editingUnit.unitNumber,
        payload
      );

      setCurriculumSaveSuccess(
        `Unit ${editingUnit.unitNumber} customized content saved and auto-synced into RAG Knowledge Engine!`
      );
      await loadCurriculum(selectedSubjectId);
      await loadAiStats(selectedSubjectId);
      setEditingUnit(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to save curriculum content.');
    } finally {
      setSavingCurriculum(false);
    }
  };

  const handleAddTopicToUnit = () => {
    if (!newTopicForm.title.trim()) {
      alert('Please enter a topic title');
      return;
    }
    const topicId = `topic-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newTopic: ITeacherTopic = {
      topicId,
      title: newTopicForm.title.trim(),
      order: curriculumForm.topics.length + 1,
      explanation: newTopicForm.explanation.trim() || undefined,
      examples: newTopicForm.examples
        ? newTopicForm.examples.split('\n').map((e) => e.trim()).filter(Boolean)
        : undefined,
      formulas: newTopicForm.formulas
        ? newTopicForm.formulas.split('\n').map((f) => f.trim()).filter(Boolean)
        : undefined,
      teacherNotes: newTopicForm.notes.trim() || undefined,
    };

    setCurriculumForm((prev) => ({
      ...prev,
      topics: [...prev.topics, newTopic],
    }));

    setNewTopicForm({
      title: '',
      explanation: '',
      examples: '',
      formulas: '',
      notes: '',
    });
    setShowAddTopic(false);
  };

  const handleRemoveTopic = (index: number) => {
    setCurriculumForm((prev) => ({
      ...prev,
      topics: prev.topics.filter((_, idx) => idx !== index),
    }));
  };

  const loadTeacherResults = async (subjectId: string) => {
    try {
      setLoadingResults(true);
      const results = await TrackingService.getTeacherSubjectResults(subjectId);
      setTeacherResults(results);
    } catch (err: any) {
      console.error('Failed to load teacher subject results:', err);
    } finally {
      setLoadingResults(false);
    }
  };

  const loadStudentsProgress = async (subjectId: string) => {
    try {
      setLoadingProgress(true);
      const prog = await AcademicService.getTeacherSubjectStudentsProgress(subjectId);
      setStudentsProgress(prog);
    } catch (err: any) {
      console.error('Failed to load student progress:', err);
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const sub = assignedData?.subjects.find((s) => s._id === subjectId);
    if (sub) {
      setSelectedDeptId(sub.departmentId || '');
      setSelectedSemNum(sub.semesterNumber || '');
    }
    loadSubjectWorkspace(subjectId);
  };

  // Content CRUD Handlers
  const handleOpenContentModal = (type: 'NOTES' | 'MATERIALS' | 'VIDEOS' | 'PRESENTATIONS' | 'ANNOUNCEMENTS') => {
    setShowContentModal(type);
    setContentForm({
      title: '',
      description: '',
      contentType: type,
      chapterOrUnit: 1,
      attachments: [{ name: '', url: '' }],
      status: 'PUBLISHED',
    });
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId || !contentForm.title.trim()) return;

    try {
      setSubmittingContent(true);
      const cleanAttachments = (contentForm.attachments || []).filter((a) => a.name.trim() && a.url.trim());
      await AcademicService.createSubjectContent(selectedSubjectId, {
        ...contentForm,
        attachments: cleanAttachments,
      });
      setShowContentModal(null);
      await loadSubjectWorkspace(selectedSubjectId);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to save content.');
    } finally {
      setSubmittingContent(false);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!selectedSubjectId || !confirm('Are you sure you want to delete this content item?')) return;
    try {
      await AcademicService.deleteSubjectContent(selectedSubjectId, contentId);
      await loadSubjectWorkspace(selectedSubjectId);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete content.');
    }
  };

  const handleToggleContentStatus = async (contentId: string, currentStatus: string) => {
    if (!selectedSubjectId) return;
    const newStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await AcademicService.updateSubjectContent(selectedSubjectId, contentId, {
        status: newStatus as any,
      });
      await loadSubjectWorkspace(selectedSubjectId);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to update content status.');
    }
  };

  // Simulation Handlers

  const handleAssignSimulation = async (payload: {
    simulationId: string;
    chapterOrUnit: number;
    title: string;
    description: string;
    customParams?: Record<string, unknown>;
    status: 'PUBLISHED' | 'DRAFT';
  }) => {
    if (!selectedSubjectId) return;
    try {
      await AcademicService.assignSimulation(selectedSubjectId, payload);
      await loadSubjectWorkspace(selectedSubjectId);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to assign simulation.');
    }
  };

  const handleToggleSimulationStatus = async (simulationId: string, currentStatus: string) => {
    if (!selectedSubjectId) return;
    const nextStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await AcademicService.toggleSimulationStatus(selectedSubjectId, simulationId, nextStatus);
      await loadSubjectWorkspace(selectedSubjectId);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to toggle simulation status.');
    }
  };

  const handleDeleteSimulation = async (simulationId: string) => {
    if (!selectedSubjectId) return;
    if (!window.confirm('Are you sure you want to remove this simulation from the subject?')) return;
    try {
      await AcademicService.deleteSimulation(selectedSubjectId, simulationId);
      await loadSubjectWorkspace(selectedSubjectId);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete simulation.');
    }
  };

  // Assignment & Grading Handlers

  const handleDuplicateAssignment = async (id: string) => {
    try {
      await assignmentService.duplicateAssignment(id);
      if (selectedSubjectId) await loadSubjectWorkspace(selectedSubjectId);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to duplicate assignment.');
    }
  };

  const handlePublishAssignment = async (id: string) => {
    try {
      await assignmentService.publishAssignment(id);
      if (selectedSubjectId) await loadSubjectWorkspace(selectedSubjectId);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to publish assignment.');
    }
  };

  const handleUnpublishAssignment = async (id: string) => {
    try {
      await assignmentService.unpublishAssignment(id);
      if (selectedSubjectId) await loadSubjectWorkspace(selectedSubjectId);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to unpublish assignment.');
    }
  };

  const handleCloseSubmissions = async (id: string) => {
    if (!confirm('Are you sure you want to close submissions for this assignment? Students will no longer be able to submit.')) return;
    try {
      await assignmentService.closeSubmissions(id);
      if (selectedSubjectId) await loadSubjectWorkspace(selectedSubjectId);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to close submissions.');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment and its submissions?')) return;
    try {
      await assignmentService.deleteAssignment(id);
      if (selectedSubjectId) await loadSubjectWorkspace(selectedSubjectId);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to delete assignment.');
    }
  };

  const handleOpenGradeModal = (submission: any) => {
    setGradingSubmission(submission);
  };



  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500"></div>
        <p className="text-sm font-medium text-muted">Loading your academic portfolio & teaching assignments...</p>
      </div>
    );
  }

  if (error || !overview || !assignedData) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-xl flex items-center justify-center mx-auto">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-ink">Faculty Portal Alert</h2>
        <p className="text-sm text-rose-700 dark:text-rose-300 font-medium leading-relaxed">{error}</p>
        <button
          onClick={loadDashboard}
          className="rounded-xl bg-panel border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-surface transition-all cursor-pointer"
        >
          ↻ Retry Loading
        </button>
      </div>
    );
  }

  const { teacher, stats, upcomingAssignments, upcomingQuizzes, recentActivity, subjectWiseProgress } = overview;


  const tabList = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'mySubjects', label: 'My Subjects', icon: '📚', badge: assignedData.subjects.length },
    { id: 'curriculum', label: 'Curriculum & Units', icon: '📖', badge: teacherCurriculum?.units.length || 5 },
    { id: 'notes', label: 'Notes', icon: '📝', badge: workspace?.tabs.notes.length },
    { id: 'materials', label: 'Materials', icon: '📚', badge: workspace?.tabs.materials.length },
    { id: 'videos', label: 'Videos', icon: '🎥', badge: workspace?.tabs.videos.length },
    { id: 'presentations', label: 'Presentations', icon: '📊', badge: workspace?.tabs.presentations.length },
    { id: 'quizzes', label: 'Quizzes', icon: '✍️', badge: workspace?.tabs.quizzes.length },
    { id: 'assignments', label: 'Assignments', icon: '📋', badge: workspace?.tabs.assignments.length },
    { id: 'submissions', label: 'Submissions & Grading', icon: '📥', badge: workspace?.tabs.submissions.filter((s) => !s.isGraded).length ? `${workspace?.tabs.submissions.filter((s) => !s.isGraded).length} Pending` : undefined },
    { id: 'announcements', label: 'Announcements', icon: '📢', badge: workspace?.tabs.announcements.length },
    { id: 'attendance', label: 'Attendance', icon: '📅', badge: workspace?.tabs.attendance.length },
    { id: 'studentProgress', label: 'Student Progress', icon: '👥', badge: studentsProgress.length },
    { id: 'results', label: 'Results', icon: '🏆' },
    { id: 'simulations', label: 'Simulations', icon: '🔬', badge: workspace?.tabs.simulations.length },
    { id: 'aiKnowledge', label: 'AI Knowledge', icon: '🤖', badge: aiStats ? `${aiStats.knowledgeChunks} Chunks` : undefined },
    { id: 'secureFiles', label: 'Secure Files', icon: '🔒' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-400 border border-violet-500/20">
              Faculty Academic Portal
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                teacher.approvalStatus === 'APPROVED'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {teacher.approvalStatus === 'APPROVED' ? 'Active Faculty' : 'Approval Pending'}
            </span>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-mono text-muted border border-line">
              Staff ID: {teacher.identifier || user?.identifier}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{teacher.name || user?.name}</h1>
          <p className="text-sm text-muted">
            Official Email: <span className="font-mono text-ink">{teacher.collegeEmail}</span> • Multi-Semester Faculty
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => handleLaunchSmartBoard()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-500 hover:to-indigo-500 transition-all cursor-pointer"
          >
            <span>🚀</span> Launch Smart Board
          </button>
          <button
            onClick={() => logout()}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ─── FACULTY ASSIGNMENTS CHECK & EMPTY STATE ─── */}
      {assignedData.subjects.length === 0 ? (
        <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/10 via-panel to-panel p-8 md:p-12 text-center shadow-lg space-y-6">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-4xl shadow-inner">
            🎓
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Faculty Registration Approved
            </span>
            <h2 className="text-2xl font-extrabold text-ink">
              Welcome, {teacher.name || user?.name}!
            </h2>
            <p className="text-sm font-semibold text-ink">
              No subjects have been assigned yet. Your HOD will assign your teaching subjects and semesters.
            </p>
            <p className="text-xs text-muted leading-relaxed">
              As per KPRIET institutional academic governance, approved faculty start with 0 subjects and 0 enrolled students until assigned by the Head of Department. Once assigned, your course workspaces, smart board interactive tools, AI doubt solver engines, student rosters, and curriculum chapter managers will activate automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left pt-4 border-t border-line/60">
            <div className="rounded-xl border border-line bg-surface/40 p-4 space-y-1">
              <span className="text-base">🏛️</span>
              <p className="text-xs font-bold text-ink">Institutional CBCS</p>
              <p className="text-[11px] text-muted">Your programme's R2021 CBCS curriculum is ready for preview.</p>
            </div>
            <div className="rounded-xl border border-line bg-surface/40 p-4 space-y-1">
              <span className="text-base">⚡</span>
              <p className="text-xs font-bold text-ink">Real-time Activation</p>
              <p className="text-[11px] text-muted">Subject workspaces activate immediately upon HOD allocation.</p>
            </div>
            <div className="rounded-xl border border-line bg-surface/40 p-4 space-y-1">
              <span className="text-base">🤖</span>
              <p className="text-xs font-bold text-ink">Isolated AI RAG</p>
              <p className="text-[11px] text-muted">Syllabus units and notes are vector-indexed per subject.</p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex items-center gap-2 rounded-xl bg-panel border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-surface transition-all cursor-pointer"
            >
              <span>↻</span> Check for New Assignments
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════
              TAB 1: OVERVIEW (Simple, Clean & User Friendly like Student Portal)
          ══════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4 Clean Metric Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-4">
                <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Assigned Courses</p>
                  <p className="mt-2 text-3xl font-extrabold text-ink">{stats.totalAssignedSubjects}</p>
                  <p className="mt-1 text-xs text-muted">Across {stats.totalSemesters} distinct semester{stats.totalSemesters > 1 ? 's' : ''}</p>
                </div>

                <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Enrolled Students</p>
                  <p className="mt-2 text-3xl font-extrabold text-indigo-400">{stats.totalEnrolledStudents}</p>
                  <p className="mt-1 text-xs text-muted">Active students in your classes</p>
                </div>

                <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Pending Submissions</p>
                  <p className="mt-2 text-3xl font-extrabold text-amber-400">{stats.pendingSubmissionsCount}</p>
                  <p className="mt-1 text-xs text-muted">Student work awaiting grading</p>
                </div>

                <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Overall Attendance</p>
                  <p className="mt-2 text-3xl font-extrabold text-teal-400">{stats.aggregateAttendancePercentage}%</p>
                  <p className="mt-1 text-xs text-muted">{stats.totalAttendanceSessions} sessions conducted</p>
                </div>
              </div>

              {/* My Assigned Teaching Courses (Single Clean Grid) */}
              <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-ink">My Assigned Teaching Courses</h2>
                    <p className="text-xs text-muted mt-0.5">
                      Authorized courses with dedicated workspaces, interactive simulations, and smart board tools.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                    {subjectWiseProgress.length} Assigned Courses
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6">
                  {subjectWiseProgress.map((sp) => {
                    const isSelected = selectedSubjectId === sp.subjectId;
                    return (
                      <div
                        key={sp.subjectId}
                        className={`flex flex-col justify-between rounded-xl border p-5 transition-all space-y-4 ${
                          isSelected
                            ? 'border-indigo-500/50 bg-indigo-500/10 shadow-sm'
                            : 'border-line bg-surface/30 hover:border-indigo-500/40'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-400 bg-panel px-2 py-0.5 rounded border border-line">
                              {sp.subjectCode}
                            </span>
                            <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-muted border border-line">
                              Sem {sp.semesterNumber} • Sec {sp.section}
                            </span>
                          </div>

                          <div>
                            <h3 className="text-base font-bold text-ink leading-snug">{sp.subjectName}</h3>
                            <p className="text-xs text-muted mt-1">{sp.departmentName}</p>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line/60 text-center">
                            <div>
                              <p className="text-xs font-bold text-ink">{sp.enrolledStudentsCount}</p>
                              <p className="text-[10px] text-muted">Students</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-ink">{sp.contentCount}</p>
                              <p className="text-[10px] text-muted">Resources</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-ink">{sp.assignmentsCount}</p>
                              <p className="text-[10px] text-muted">Assignments</p>
                            </div>
                          </div>

                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted">Attendance</span>
                              <span className="font-bold text-teal-400">{sp.attendanceRate}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
                              <div
                                className="h-full rounded-full bg-teal-500 transition-all duration-500"
                                style={{ width: `${Math.min(100, sp.attendanceRate)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-line/60 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectSubject(sp.subjectId);
                              handleTabChange('simulations');
                            }}
                            className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white py-2 text-xs font-semibold transition-all cursor-pointer text-center shadow-sm"
                          >
                            Open Workspace →
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchSmartBoard(undefined, sp.subjectId)}
                            className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                            title="Launch Smart Board for this subject"
                          >
                            🚀 Board
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming Deliverables & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Assignments */}
                <div className="rounded-2xl border border-line bg-panel p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📋</span>
                      <h3 className="text-sm font-bold text-ink">Upcoming Assignments</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface text-muted">
                      {upcomingAssignments.length}
                    </span>
                  </div>

                  {upcomingAssignments.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted">No upcoming assignment deadlines.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {upcomingAssignments.slice(0, 4).map((a) => (
                        <div key={a._id} className="rounded-xl border border-line bg-surface/30 p-3 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-ink line-clamp-1">{a.title}</span>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              {a.maxMarks} Marks
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted">
                            <span>{a.subject ? `${a.subject.subjectCode}` : 'Course'}</span>
                            <span>Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upcoming Quizzes */}
                <div className="rounded-2xl border border-line bg-panel p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">✍️</span>
                      <h3 className="text-sm font-bold text-ink">Upcoming Quizzes</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface text-muted">
                      {upcomingQuizzes.length}
                    </span>
                  </div>

                  {upcomingQuizzes.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted">No quizzes scheduled.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {upcomingQuizzes.slice(0, 4).map((q) => (
                        <div key={q._id} className="rounded-xl border border-line bg-surface/30 p-3 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-ink line-clamp-1">{q.title}</span>
                            <span className="text-[10px] font-mono text-indigo-400">{q.totalMarks} Marks</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted">
                            <span>{q.subject ? `${q.subject.subjectCode}` : 'Course'}</span>
                            <span>{q.durationMinutes} Mins Duration</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="rounded-2xl border border-line bg-panel p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚡</span>
                      <h3 className="text-sm font-bold text-ink">Recent Activity</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface text-muted">
                      {recentActivity.length} Events
                    </span>
                  </div>

                  {recentActivity.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted">No recent department logs.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {recentActivity.slice(0, 4).map((act, i) => (
                        <div key={i} className="rounded-xl border border-line bg-surface/30 p-2.5 space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-ink line-clamp-1 text-[11px]">{act.title}</span>
                            <span className="text-[9px] font-mono text-muted">
                              {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted">
                            <span className="font-mono text-indigo-400">{act.type}</span>
                            <span>{act.subject}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              NON-OVERVIEW TABS (Course Selector Pills + Subject Workspace)
          ══════════════════════════════════════════════════════════ */}
          {activeTab !== 'overview' && (
            <div className="space-y-6">
              {/* ─── 1. Course picker (full width) ─── */}
              <div className="rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="pt-1.5 text-[11px] font-bold text-muted uppercase tracking-wider whitespace-nowrap">My Courses</span>
                  <div className="flex flex-wrap gap-2">
                    {assignedData.subjects.map((sub) => {
                      const isSelected = selectedSubjectId === sub._id;
                      return (
                        <button
                          key={sub._id}
                          type="button"
                          onClick={() => handleSelectSubject(sub._id)}
                          title={`${sub.subjectCode} • ${sub.subjectName}`}
                          className={`inline-flex max-w-[260px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-surface border border-line text-muted hover:text-ink hover:border-indigo-300'
                          }`}
                        >
                          <span className={`font-mono text-[10px] font-bold ${isSelected ? 'text-indigo-100' : 'text-indigo-500'}`}>{sub.subjectCode}</span>
                          <span className="truncate font-semibold">{sub.subjectName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Dedicated Subject Workspace */}
              {loadingWorkspace && (
                <div className="rounded-2xl border border-line bg-panel p-10 flex flex-col items-center justify-center gap-3">
                  <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  <p className="text-xs text-muted font-semibold">Loading Subject Workspace...</p>
                </div>
              )}

              {workspaceError && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  ⚠️ {workspaceError}
                </div>
              )}

              {!loadingWorkspace && workspace && (
                <div className="space-y-6">
                  {/* ─── 2. Subject header: identity on the left, actions on the right ─── */}
                  <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                          {workspace.subject.subjectCode}
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate text-xl font-bold text-ink">{workspace.subject.subjectName}</h2>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="rounded-md border border-line bg-surface px-2 py-0.5 font-semibold text-muted">Semester {workspace.subject.semesterNumber}</span>
                            <span className="rounded-md border border-line bg-surface px-2 py-0.5 font-semibold text-muted">{workspace.subject.credits} Credits</span>
                            <span className="rounded-md border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 font-semibold text-indigo-600 dark:text-indigo-300">{workspace.enrolledStudentsCount} Enrolled Students</span>
                            {workspace.assignmentMeta?.isCoordinator && (
                              <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-bold text-primary dark:text-indigo-300">Coordinator</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:shrink-0">
                        <button
                          onClick={() => handleLaunchSmartBoard()}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:from-emerald-500 hover:to-indigo-500 transition-all cursor-pointer"
                        >
                          <span>🚀</span> Launch Smart Board
                        </button>
                      </div>
                    </div>

                    {/* Quick actions — one tidy row of equal buttons */}
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 sm:grid-cols-3 xl:grid-cols-6">
                      {[
                        { label: 'Add Note', icon: '📝', onClick: () => handleOpenContentModal('NOTES') },
                        { label: 'Upload Material', icon: '📚', onClick: () => handleOpenContentModal('MATERIALS') },
                        { label: 'Announcement', icon: '📢', onClick: () => handleOpenContentModal('ANNOUNCEMENTS') },
                        { label: 'New Assignment', icon: '📋', onClick: () => setShowAssignmentModal(true) },
                        { label: 'Mark Attendance', icon: '📅', onClick: () => setShowAttendanceModal(true) },
                        { label: 'Secure Vault', icon: '🔒', onClick: () => setShowFileManagerModal(true) },
                      ].map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={action.onClick}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all cursor-pointer"
                        >
                          <span>{action.icon}</span> {action.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ─── 3. Workspace tabs (full width, scrolls sideways when needed) ─── */}
                  <nav
                    aria-label="Subject workspace sections"
                    className="sticky top-0 z-10 flex items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-panel/95 p-1.5 shadow-sm backdrop-blur scrollbar-none"
                  >
                    {tabList
                      .filter((t) => t.id !== 'overview')
                      .map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleTabChange(t.id as any)}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === t.id
                              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                              : 'text-muted hover:text-ink hover:bg-surface'
                          }`}
                        >
                          <span>{t.icon}</span>
                          <span>{t.label}</span>
                          {t.badge !== undefined && (
                            <span
                              className={`text-[10px] font-bold px-1.5 rounded-full ${
                                activeTab === t.id ? 'bg-white/20 text-white' : 'bg-surface text-muted border border-line'
                              }`}
                            >
                              {t.badge}
                            </span>
                          )}
                        </button>
                      ))}
                  </nav>

          {/* ─── TAB CONTENT PANES ─── */}
          <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm min-h-[400px]">
            {/* MY SUBJECTS & COMPLETE CURRICULUM TAB */}
            {activeTab === 'mySubjects' && (
              <div className="space-y-6">
                {/* Header & Sub-view Selector */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-mono font-bold text-indigo-400 border border-indigo-500/20">
                        {(curriculumTree?.programme?.degree || 'B.E.')} {curriculumTree?.department?.code || ''} • {curriculumTree?.regulation || 'R2021'} CBCS
                      </span>
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                        {curriculumTree?.totalProgrammeCredits ?? curriculumTree?.calculatedCredits ?? '—'} Total Credits
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-ink mt-1">
                      {curriculumTree?.department?.name ? `${curriculumTree.department.name} Curriculum` : 'Programme Curriculum'}
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Explore your assigned teaching portfolio or browse the full 8-semester CBCS curriculum, verticals, and unit topics.
                    </p>
                  </div>

                  {/* Sub Tab Switcher */}
                  <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface/50 p-1">
                    <button
                      type="button"
                      onClick={() => setCurriculumSubTab('assigned')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        curriculumSubTab === 'assigned'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      📌 Assigned ({assignedData.subjects.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurriculumSubTab('curriculum')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        curriculumSubTab === 'curriculum'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      🏛️ 8-Sem Curriculum ({curriculumTree?.semesters.reduce((acc, s) => acc + s.subjects.length, 0) || 68})
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
                      ⚡ Professional Electives (48)
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

                {/* ─── SUB-VIEW 1: ASSIGNED TEACHING PORTFOLIO (SEMESTER-WISE) ─── */}
                {curriculumSubTab === 'assigned' && (
                  <div className="space-y-6">
                    {assignedData.subjects.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-line p-12 text-center">
                        <div className="mx-auto h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-xl">
                          📚
                        </div>
                        <h4 className="mt-3 text-sm font-bold text-ink">No Subjects Assigned</h4>
                        <p className="text-xs text-muted mt-1 max-w-md mx-auto">
                          You currently do not have any courses assigned by your Head of Department. You can browse the complete curriculum tab to preview course syllabi.
                        </p>
                      </div>
                    ) : (
                      // Group assigned subjects by semester
                      [1, 2, 3, 4, 5, 6, 7, 8].map((semNum) => {
                        const semSubs = assignedData.subjects.filter((s) => s.semesterNumber === semNum);
                        if (semSubs.length === 0) return null;

                        return (
                          <div key={semNum} className="space-y-3">
                            <div className="flex items-center gap-3">
                              <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-400 border border-indigo-500/20">
                                Semester {semNum}
                              </span>
                              <div className="h-px flex-1 bg-line" />
                              <span className="text-xs font-mono text-muted">{semSubs.length} Assigned Course(s)</span>
                            </div>

                            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6">
                              {semSubs.map((sub) => {
                                const isActiveCourse = selectedSubjectId === sub._id;
                                const progressInfo = subjectWiseProgress.find((p) => p.subjectId === sub._id);
                                const isSyllabusOpen = !!expandedSyllabusSubjects[sub._id];

                                return (
                                  <div
                                    key={sub._id}
                                    className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                                      isActiveCourse
                                        ? 'border-indigo-500/50 bg-indigo-500/5 shadow-md'
                                        : 'border-line bg-surface/30 hover:border-line/80'
                                    }`}
                                  >
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                          {sub.subjectCode}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[11px] font-semibold text-muted bg-surface px-2 py-0.5 rounded border border-line">
                                            Sec {sub.section !== 'ALL' ? sub.section : 'All'}
                                          </span>
                                          {sub.credits && (
                                            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                              {sub.credits} Cr
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div>
                                        <h4 className="text-sm font-bold text-ink line-clamp-2">{sub.subjectName}</h4>
                                        <p className="text-xs text-muted mt-0.5">
                                          {sub.departmentId
                                            ? assignedData.departments.find((d) => d._id === sub.departmentId)?.name || 'Programme'
                                            : 'Programme'}
                                        </p>
                                      </div>

                                      {progressInfo && (
                                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line/50 text-center">
                                          <div>
                                            <p className="text-xs font-bold text-ink">{progressInfo.enrolledStudentsCount}</p>
                                            <p className="text-[10px] text-muted">Students</p>
                                          </div>
                                          <div>
                                            <p className="text-xs font-bold text-ink">{progressInfo.contentCount}</p>
                                            <p className="text-[10px] text-muted">Resources</p>
                                          </div>
                                          <div>
                                            <p className="text-xs font-bold text-teal-400">{progressInfo.attendanceRate}%</p>
                                            <p className="text-[10px] text-muted">Attendance</p>
                                          </div>
                                        </div>
                                      )}

                                      {/* Expandable Unit I-V Syllabus Details */}
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
                                          <span>📖 Syllabus Units ({sub.syllabus?.length || 5} Units)</span>
                                          <span>{isSyllabusOpen ? '▲ Hide' : '▼ View Units'}</span>
                                        </button>

                                        {isSyllabusOpen && sub.syllabus && sub.syllabus.length > 0 && (
                                          <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-1">
                                            {sub.syllabus.map((u: any, idx: number) => (
                                              <div
                                                key={idx}
                                                className="rounded-lg border border-line bg-panel p-2.5 space-y-1 text-xs"
                                              >
                                                <div className="flex items-center justify-between">
                                                  <span className="font-bold text-indigo-400">Unit {u.unitNumber}: {u.title}</span>
                                                  {u.hours && <span className="text-[10px] font-mono text-muted">{u.hours} hrs</span>}
                                                </div>
                                                {u.topics && u.topics.length > 0 && (
                                                  <div className="flex flex-wrap gap-1 mt-1">
                                                    {u.topics.map((t: string, tidx: number) => (
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
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-3 border-t border-line/60 space-y-2">
                                      <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleLaunchSmartBoard({
                                                type: 'canvas',
                                                subjectId: sub._id,
                                                subjectCode: sub.subjectCode,
                                                subjectName: sub.subjectName,
                                              }, sub._id)
                                            }
                                            className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                                          >
                                            🚀 Board
                                          </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleSelectSubject(sub._id);
                                            handleTabChange('overview');
                                          }}
                                          className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                            isActiveCourse
                                              ? 'bg-emerald-600 text-white shadow-sm'
                                              : 'bg-indigo-600 text-white hover:bg-indigo-500'
                                          }`}
                                        >
                                          {isActiveCourse ? 'Active Workspace ✓' : 'Switch & Open →'}
                                        </button>
                                      </div>

                                      {/* Quick workspace tab jump pills */}
                                      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleSelectSubject(sub._id);
                                            handleTabChange('notes');
                                          }}
                                          className="rounded px-2 py-0.5 text-[10px] font-semibold bg-surface border border-line text-muted hover:text-ink cursor-pointer whitespace-nowrap"
                                        >
                                          📝 Notes
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleSelectSubject(sub._id);
                                            handleTabChange('materials');
                                          }}
                                          className="rounded px-2 py-0.5 text-[10px] font-semibold bg-surface border border-line text-muted hover:text-ink cursor-pointer whitespace-nowrap"
                                        >
                                          📚 Materials
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleSelectSubject(sub._id);
                                            handleTabChange('quizzes');
                                          }}
                                          className="rounded px-2 py-0.5 text-[10px] font-semibold bg-surface border border-line text-muted hover:text-ink cursor-pointer whitespace-nowrap"
                                        >
                                          ✍️ Quizzes
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleSelectSubject(sub._id);
                                            handleTabChange('assignments');
                                          }}
                                          className="rounded px-2 py-0.5 text-[10px] font-semibold bg-surface border border-line text-muted hover:text-ink cursor-pointer whitespace-nowrap"
                                        >
                                          📋 Assignments
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleSelectSubject(sub._id);
                                            handleTabChange('attendance');
                                          }}
                                          className="rounded px-2 py-0.5 text-[10px] font-semibold bg-surface border border-line text-muted hover:text-ink cursor-pointer whitespace-nowrap"
                                        >
                                          📅 Attendance
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* ─── SUB-VIEW 2: FULL 8-SEMESTER IT CURRICULUM (R2021 CBCS) ─── */}
                {curriculumSubTab === 'curriculum' && curriculumTree && (
                  <div className="space-y-6">
                    {/* Curriculum Metadata Ribbon */}
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
                          <p className="text-[10px] uppercase font-bold text-muted">Total Semesters</p>
                          <p className="text-sm font-extrabold text-ink mt-0.5">8 Semesters</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted">Total Credits</p>
                          <p className="text-sm font-extrabold text-emerald-400 mt-0.5">
                            {curriculumTree.totalProgrammeCredits} Credits
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted">PE Verticals</p>
                          <p className="text-sm font-extrabold text-purple-400 mt-0.5">6 Verticals (48 Courses)</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted">Open Electives</p>
                          <p className="text-sm font-extrabold text-teal-400 mt-0.5">8 Courses (Sem 4–7)</p>
                        </div>
                      </div>
                    </div>

                    {/* Filter controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Semester Filter Pills */}
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

                      {/* Search box */}
                      <input
                        type="text"
                        placeholder="Search code, title, topic..."
                        value={curriculumSearchQuery}
                        onChange={(e) => setCurriculumSearchQuery(e.target.value)}
                        className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink placeholder-muted focus:border-indigo-500 focus:outline-none w-full sm:w-64"
                      />
                    </div>

                    {/* Semester-by-semester course listings */}
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
                                  const isAssignedToMe = assignedData.subjects.some((as) => as._id === sub._id);
                                  const isSyllabusOpen = !!expandedSyllabusSubjects[sub._id];

                                  return (
                                    <div
                                      key={sub._id}
                                      className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                                        isAssignedToMe
                                          ? 'border-indigo-500/50 bg-indigo-500/5 shadow-sm'
                                          : 'border-line bg-surface/30 hover:border-line/80'
                                      }`}
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

                                          <div className="flex items-center gap-1">
                                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                              {sub.credits} Credits
                                            </span>
                                          </div>
                                        </div>

                                        <div>
                                          <h4 className="text-sm font-bold text-ink leading-snug">{sub.subjectName}</h4>
                                          {isAssignedToMe && (
                                            <span className="inline-block mt-1 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/30">
                                              ✓ Assigned in your portfolio
                                            </span>
                                          )}
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

                                      {/* Action buttons */}
                                      <div className="pt-3 border-t border-line/60 flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleLaunchSmartBoard({
                                              type: 'canvas',
                                              subjectId: sub._id,
                                              subjectCode: sub.subjectCode,
                                              subjectName: sub.subjectName,
                                            }, sub._id)
                                          }
                                          className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                                        >
                                          🚀 Board
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleSelectSubject(sub._id);
                                            handleTabChange('overview');
                                          }}
                                          className="flex-1 rounded-xl bg-indigo-600 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all cursor-pointer text-center"
                                        >
                                          View Workspace →
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
                        Students can choose to specialize in any of the 6 industry-aligned verticals across Semesters 5, 6, 7, and 8.
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

                    {/* Render Verticals */}
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
                                          <p className="text-[10px] uppercase font-bold text-muted">Core Topics:</p>
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
                                      <span className="text-[10px] font-mono text-muted">Slots: {pe.slots?.join(', ') || 'PEC-I to PEC-VI'}</span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleLaunchSmartBoard({
                                            subjectCode: pe.code,
                                            subjectName: pe.name,
                                          })
                                        }
                                        className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-400 hover:bg-purple-600 hover:text-white transition-all cursor-pointer"
                                      >
                                        🚀 Board
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
                              onClick={() =>
                                handleLaunchSmartBoard({
                                  subjectCode: oe.code,
                                  subjectName: oe.name,
                                })
                              }
                              className="rounded-lg border border-teal-500/40 bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-400 hover:bg-teal-600 hover:text-white transition-all cursor-pointer"
                            >
                              🚀 Board
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* ─── CURRICULUM UNITS & CHAPTER CONTENT TAB (MODULE 07 / REQ 15-21) ─── */}
            {activeTab === 'curriculum' && (
              <div className="space-y-6">
                {/* Header Strip */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-mono font-bold text-indigo-400 border border-indigo-500/20">
                        {workspace.subject.subjectCode} • Syllabus
                      </span>
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                        🔒 Official R2021 CBCS Syllabus Protected
                      </span>
                      <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-400 border border-violet-500/20">
                        🤖 Auto-Ingested into Subject RAG
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-ink mt-1">
                      Curriculum Units & Custom Chapter Teaching Notes
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      The official institution syllabus is locked institutional ground truth. Customize your teaching notes, objectives, formulas, and practical examples below. Your additions automatically update the AI Knowledge Engine.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadCurriculum(workspace.subject._id)}
                      disabled={loadingCurriculum}
                      className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface/80 transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span>{loadingCurriculum ? '⏳' : '↻'}</span> {loadingCurriculum ? 'Syncing...' : 'Reload Units'}
                    </button>
                  </div>
                </div>

                {/* Success Banner */}
                {curriculumSaveSuccess && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 font-medium flex items-center justify-between">
                    <span>✅ {curriculumSaveSuccess}</span>
                    <button
                      type="button"
                      onClick={() => setCurriculumSaveSuccess(null)}
                      className="text-emerald-400 hover:text-white font-bold ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Units List */}
                {loadingCurriculum ? (
                  <div className="p-12 text-center text-xs text-muted space-y-2">
                    <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
                    <p>Loading course curriculum units...</p>
                  </div>
                ) : !teacherCurriculum || teacherCurriculum.units.length === 0 ? (
                  <div className="p-12 border border-dashed border-line rounded-2xl text-center text-xs text-muted">
                    No curriculum units found for this subject.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {teacherCurriculum.units.map((unit) => {
                      const hasCustom = !!unit.teacherContent;
                      return (
                        <div
                          key={unit.unitNumber}
                          className="rounded-2xl border border-line bg-surface/20 p-5 space-y-4 hover:border-line/80 transition-all"
                        >
                          {/* Unit Title & Status Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
                            <div className="flex items-center gap-3">
                              <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-mono font-bold text-indigo-400 border border-indigo-500/20">
                                {unit.unitCode}
                              </span>
                              <div>
                                <h4 className="text-base font-bold text-ink">
                                  {unit.teacherContent?.chapterTitle || unit.officialTitle}
                                </h4>
                                <p className="text-xs text-muted">
                                  Official Syllabus: <span className="font-semibold text-ink">{unit.officialTitle}</span> • {unit.officialHours} Lecture Hours
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                                  hasCustom
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-surface text-muted border-line'
                                }`}
                              >
                                {hasCustom ? 'Custom Notes Active ✓' : 'Institutional Syllabus Only'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartEditUnit(unit)}
                                className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <span>✏️</span> {hasCustom ? 'Edit Chapter Content' : 'Customize Chapter'}
                              </button>
                            </div>
                          </div>

                          {/* Two-Column Grid: Official Syllabus vs Teacher Custom Content */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Left: Official Syllabus (Ground Truth) */}
                            <div className="rounded-xl border border-line/80 bg-panel/70 p-4 space-y-3">
                              <div className="flex items-center justify-between border-b border-line/60 pb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                  <span>🔒</span> Official KPRIET Syllabus (R2021)
                                </span>
                                <span className="text-[10px] font-mono text-muted">Protected Ground Truth</span>
                              </div>

                              {unit.officialDescription && (
                                <p className="text-xs text-ink/80 leading-relaxed italic">
                                  "{unit.officialDescription}"
                                </p>
                              )}

                              {unit.officialSyllabusText && unit.officialSyllabusText !== unit.officialDescription && (
                                <p className="text-xs text-muted leading-relaxed line-clamp-3">
                                  {unit.officialSyllabusText}
                                </p>
                              )}

                              <div>
                                <p className="text-[11px] font-bold text-muted uppercase mb-1.5">Prescribed Syllabus Topics:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {unit.officialTopics.map((top, idx) => (
                                    <span
                                      key={idx}
                                      className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-mono text-ink/90 border border-line"
                                    >
                                      {top}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Right: Teacher Custom Pedagogical Content */}
                            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
                              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                  <span>📝</span> Teacher Chapter Customization
                                </span>
                                {hasCustom && unit.teacherContent?.updatedAt && (
                                  <span className="text-[10px] font-mono text-muted">
                                    Synced {new Date(unit.teacherContent.updatedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              {!hasCustom ? (
                                <div className="py-6 text-center text-xs text-muted space-y-2">
                                  <p>No customized chapter notes or topics added for this unit yet.</p>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditUnit(unit)}
                                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                                  >
                                    Add teaching notes, learning objectives, and examples →
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3 text-xs">
                                  {unit.teacherContent?.teachingNotes && (
                                    <div>
                                      <p className="font-bold text-ink uppercase text-[10px]">Teaching Notes:</p>
                                      <p className="text-muted leading-relaxed whitespace-pre-line mt-0.5 bg-surface/40 p-2.5 rounded-lg border border-line">
                                        {unit.teacherContent.teachingNotes}
                                      </p>
                                    </div>
                                  )}

                                  {unit.teacherContent?.learningObjectives && unit.teacherContent.learningObjectives.length > 0 && (
                                    <div>
                                      <p className="font-bold text-ink uppercase text-[10px]">Learning Objectives:</p>
                                      <ul className="list-disc list-inside space-y-0.5 text-muted mt-0.5">
                                        {unit.teacherContent.learningObjectives.map((obj, i) => (
                                          <li key={i} className="text-[11px] leading-tight text-ink/90">{obj}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {unit.teacherContent?.importantPoints && unit.teacherContent.importantPoints.length > 0 && (
                                    <div>
                                      <p className="font-bold text-ink uppercase text-[10px]">Important Exam / Concept Points:</p>
                                      <ul className="list-disc list-inside space-y-0.5 text-muted mt-0.5">
                                        {unit.teacherContent.importantPoints.map((pt, i) => (
                                          <li key={i} className="text-[11px] leading-tight text-amber-300/90">{pt}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {unit.teacherContent?.practicalExamples && unit.teacherContent.practicalExamples.length > 0 && (
                                    <div>
                                      <p className="font-bold text-ink uppercase text-[10px]">Practical / Industry Examples:</p>
                                      <ul className="list-disc list-inside space-y-0.5 text-muted mt-0.5">
                                        {unit.teacherContent.practicalExamples.map((ex, i) => (
                                          <li key={i} className="text-[11px] leading-tight text-emerald-300/90">{ex}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {unit.teacherContent?.referenceMaterials && unit.teacherContent.referenceMaterials.length > 0 && (
                                    <div>
                                      <p className="font-bold text-ink uppercase text-[10px]">Reference Materials & Books:</p>
                                      <ul className="list-disc list-inside space-y-0.5 text-muted mt-0.5">
                                        {unit.teacherContent.referenceMaterials.map((rm, i) => (
                                          <li key={i} className="text-[11px] leading-tight text-indigo-300/90">{rm}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {unit.teacherContent?.topics && unit.teacherContent.topics.length > 0 && (
                                    <div>
                                      <p className="font-bold text-ink uppercase text-[10px] mb-1">
                                        Custom Topics ({unit.teacherContent.topics.length}):
                                      </p>
                                      <div className="space-y-1.5">
                                        {unit.teacherContent.topics.map((t, idx) => (
                                          <div key={idx} className="rounded-lg bg-surface/50 border border-line p-2 text-[11px]">
                                            <p className="font-bold text-ink">
                                              {idx + 1}. {t.title}
                                            </p>
                                            {t.explanation && (
                                              <p className="text-muted text-[10px] mt-0.5">{t.explanation}</p>
                                            )}
                                            {t.formulas && t.formulas.length > 0 && (
                                              <p className="font-mono text-[10px] text-indigo-300 mt-0.5">
                                                Formulas: {t.formulas.join(', ')}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">Lecture Notes & Handouts</h3>
                    <p className="text-xs text-muted">Create, publish, edit, and organize chapter-wise notes</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/smartboard/index.html?subjectId=${workspace.subject._id}&subjectName=${encodeURIComponent(workspace.subject.subjectName)}&subjectCode=${workspace.subject.subjectCode || ''}&departmentId=${(workspace as any).department?._id || ''}&departmentName=${encodeURIComponent((workspace as any).department?.name || '')}&semesterId=${(workspace as any).semester?._id || ''}&semesterNumber=${(workspace as any).semester?.semesterNumber || 1}&sectionId=${encodeURIComponent((workspace as any).sectionId || (workspace as any).section || 'ALL')}&section=${encodeURIComponent((workspace as any).section || 'ALL')}&teacherName=${encodeURIComponent(teacher.name)}&teacherId=${(teacher as any).id || teacher._id || ''}&role=teacher&action=exportNotes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:text-indigo-300 hover:bg-primary hover:text-white transition-all"
                    >
                      Export from Smart Board 🪄
                    </a>
                    <button
                      onClick={() => handleOpenContentModal('NOTES')}
                      className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition-all cursor-pointer"
                    >
                      + Add Note
                    </button>
                  </div>
                </div>

                {workspace.tabs.notes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted">
                    No lecture notes published yet. Click "+ Add Note" to create one.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {workspace.tabs.notes.map((n) => (
                      <div key={n._id} className="rounded-xl border border-line bg-surface/30 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                            {n.chapterOrUnit ? `Unit ${n.chapterOrUnit}` : 'Note'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              n.status === 'PUBLISHED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {n.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-ink">{n.title}</h4>
                        {n.description && <p className="text-xs text-muted line-clamp-2">{n.description}</p>}

                        <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                          <button
                            onClick={() => handleLaunchSmartBoard({ type: 'notes', title: n.title, file: n.attachments?.[0]?.url })}
                            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>🚀</span> Launch to Board
                          </button>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleContentStatus(n._id, n.status)}
                              className="text-xs font-semibold text-primary hover:text-primary/80 cursor-pointer"
                            >
                              {n.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                            </button>
                            <button
                              onClick={() => handleDeleteContent(n._id)}
                              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MATERIALS TAB */}
            {activeTab === 'materials' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">Reference Materials & Guides</h3>
                    <p className="text-xs text-muted">Upload PDF, DOC, PPT, textbooks, and lab guides</p>
                  </div>
                  <button
                    onClick={() => handleOpenContentModal('MATERIALS')}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                  >
                    + Upload Material
                  </button>
                </div>

                {workspace.tabs.materials.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted">No reference materials uploaded yet.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {workspace.tabs.materials.map((m) => (
                      <div key={m._id} className="rounded-xl border border-line bg-surface/30 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-indigo-400">Unit {m.chapterOrUnit || 'Ref'}</span>
                          <button onClick={() => handleDeleteContent(m._id)} className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer">
                            Delete
                          </button>
                        </div>
                        <h4 className="text-sm font-bold text-ink">{m.title}</h4>
                        {m.description && <p className="text-xs text-muted">{m.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIDEOS TAB */}
            {activeTab === 'videos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">Recorded Lectures & Tutorials</h3>
                    <p className="text-xs text-muted">Add video lecture URLs or video file links</p>
                  </div>
                  <button
                    onClick={() => handleOpenContentModal('VIDEOS')}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                  >
                    + Add Video
                  </button>
                </div>

                {workspace.tabs.videos.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted">No video lectures added yet.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
                    {workspace.tabs.videos.map((v) => (
                      <div key={v._id} className="rounded-xl border border-line bg-surface/30 p-4 space-y-2">
                        <div className="aspect-video bg-black/40 rounded-lg flex items-center justify-center text-3xl">
                          ▶️
                        </div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-ink">{v.title}</h4>
                          <button onClick={() => handleDeleteContent(v._id)} className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer">
                            Delete
                          </button>
                        </div>
                        {v.description && <p className="text-xs text-muted">{v.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PRESENTATIONS TAB */}
            {activeTab === 'presentations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">Slide Decks & Presentations</h3>
                    <p className="text-xs text-muted">Upload PPTX presentations and launch directly into Smart Board</p>
                  </div>
                  <button
                    onClick={() => handleOpenContentModal('PRESENTATIONS')}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                  >
                    + Add Presentation
                  </button>
                </div>

                {workspace.tabs.presentations.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted">No slide presentations uploaded yet.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {workspace.tabs.presentations.map((p) => (
                      <div key={p._id} className="rounded-xl border border-line bg-surface/30 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-400">Slide Deck</span>
                          <span className="text-[10px] font-bold text-muted">{p.status}</span>
                        </div>
                        <h4 className="text-sm font-bold text-ink">{p.title}</h4>
                        <div className="flex items-center justify-between pt-2 border-t border-line/60">
                          <button
                            onClick={() => handleLaunchSmartBoard({ type: 'ppt', title: p.title, file: p.attachments?.[0]?.url })}
                            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer inline-flex items-center gap-1"
                          >
                            Launch in Board 🚀
                          </button>
                          <button onClick={() => handleDeleteContent(p._id)} className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* QUIZZES TAB */}
            {activeTab === 'quizzes' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3 gap-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">Quizzes & Assessments</h3>
                    <p className="text-xs text-muted">
                      Full-featured proctored quiz engine, auto-grading, 8 question types, and analytics
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/teacher/subjects/${workspace.subject._id}/quizzes`)}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      <span>🚀 Launch Standalone Quiz Engine</span>
                    </button>
                  </div>
                </div>

                {workspace.tabs.quizzes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted space-y-3">
                    <p>No assessments created for this course yet.</p>
                    <button
                      onClick={() => navigate(`/teacher/subjects/${workspace.subject._id}/quizzes`)}
                      className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary dark:text-indigo-300 hover:bg-primary hover:text-white transition-all cursor-pointer"
                    >
                      + Create Assessment with AI / Manual
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workspace.tabs.quizzes.map((q) => (
                      <div
                        key={q._id}
                        className="rounded-xl border border-line bg-surface/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-400 font-mono">
                              {q.durationMinutes} Mins
                            </span>
                            <span className="text-xs font-bold text-muted">• {q.totalMarks} Marks</span>
                          </div>
                          <h4 className="text-sm font-bold text-ink mt-1">{q.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-surface px-2.5 py-1 text-xs font-semibold text-muted border border-line">
                            {q.status}
                          </span>
                          <button
                            onClick={() => navigate(`/teacher/subjects/${workspace.subject._id}/quizzes`)}
                            className="rounded-lg bg-primary/10 hover:bg-primary text-primary dark:text-indigo-300 hover:text-white px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
                          >
                            Manage →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ASSIGNMENTS TAB */}
            {activeTab === 'assignments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">Course Assignments</h3>
                    <p className="text-xs text-muted">Create problem sets, configure rubrics, and manage student submissions</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingAssignment(null);
                      setShowAssignmentModal(true);
                    }}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer shadow transition-all flex items-center gap-1.5"
                  >
                    <span>+</span> Create Assignment
                  </button>
                </div>

                {workspace.tabs.assignments.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl border border-dashed border-line bg-surface/20">
                    <span className="text-3xl block mb-2">📋</span>
                    <p className="text-xs font-bold text-ink">No course assignments created yet</p>
                    <p className="text-[11px] text-muted mt-0.5 mb-4">
                      Create assignments manually or generate comprehensive problem sets using AI
                    </p>
                    <button
                      onClick={() => {
                        setEditingAssignment(null);
                        setShowAssignmentModal(true);
                      }}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow"
                    >
                      + Create Your First Assignment
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workspace.tabs.assignments.map((a) => {
                      const isClosed = a.status === 'CLOSED';
                      const isDraft = a.status === 'DRAFT';
                      const isPublished = a.status === 'PUBLISHED';

                      return (
                        <div
                          key={a._id}
                          className="rounded-2xl border border-line bg-surface/30 hover:bg-surface/50 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 transition-all"
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  isPublished
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : isDraft
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                                }`}
                              >
                                {a.status || 'PUBLISHED'}
                              </span>

                              {(a as any).chapterOrUnit && (
                                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-400 border border-indigo-500/20">
                                  Unit {(a as any).chapterOrUnit}
                                </span>
                              )}

                              <span className="text-xs font-mono text-emerald-400 font-bold">
                                Max {a.maxMarks} Marks
                              </span>

                              <span className="text-xs font-mono text-muted">
                                • Due: {new Date(a.dueDate).toLocaleDateString()}
                              </span>

                              {(a as any).lateSubmissionPolicy && (
                                <span className="text-[10px] text-muted">
                                  • {(a as any).lateSubmissionPolicy === 'REJECT' ? 'Strict' : 'Late Allowed'}
                                </span>
                              )}
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-ink">{a.title}</h4>
                              {a.description && (
                                <p className="text-xs text-muted mt-0.5 line-clamp-2">{a.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 border-t lg:border-t-0 border-line/60 pt-3 lg:pt-0">
                            <div className="text-left lg:text-right mr-2">
                              <p className="text-[10px] text-muted uppercase font-bold">Submissions</p>
                              <p className="text-sm font-extrabold text-ink font-mono">
                                {a.gradedSubmissionsCount || 0} / {a.submissionsCount || 0} Graded
                              </p>
                            </div>

                            <button
                              onClick={() => setActiveTab('submissions')}
                              className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer shadow"
                            >
                              Review Work →
                            </button>

                            <button
                              onClick={() => {
                                setEditingAssignment(a);
                                setShowAssignmentModal(true);
                              }}
                              className="rounded-xl border border-line bg-surface/50 px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface cursor-pointer"
                              title="Edit Assignment"
                            >
                              ✏️ Edit
                            </button>

                            {/* Publish / Unpublish Toggle */}
                            {isPublished ? (
                              <button
                                onClick={() => handleUnpublishAssignment(a._id)}
                                className="rounded-xl border border-line bg-surface/50 px-2.5 py-1.5 text-xs font-semibold text-amber-400 hover:bg-surface cursor-pointer"
                                title="Unpublish to Draft"
                              >
                                Unpublish
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePublishAssignment(a._id)}
                                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                                title="Publish Assignment"
                              >
                                Publish
                              </button>
                            )}

                            {/* Duplicate */}
                            <button
                              onClick={() => handleDuplicateAssignment(a._id)}
                              className="rounded-xl border border-line bg-surface/50 px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-ink hover:bg-surface cursor-pointer"
                              title="Duplicate Assignment"
                            >
                              Duplicate
                            </button>

                            {/* Close Submissions */}
                            {!isClosed && (
                              <button
                                onClick={() => handleCloseSubmissions(a._id)}
                                className="rounded-xl border border-line bg-surface/50 px-2.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-surface cursor-pointer"
                                title="Close Submissions"
                              >
                                Close
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteAssignment(a._id)}
                              className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                              title="Delete Assignment"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUBMISSIONS & GRADING TAB */}
            {activeTab === 'submissions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">Student Submissions & Evaluation Queue</h3>
                    <p className="text-xs text-muted">Inspect student files, assign marks, and provide constructive feedback</p>
                  </div>
                  <span className="text-xs font-mono text-muted">{workspace.tabs.submissions.length} submissions</span>
                </div>

                {workspace.tabs.submissions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted">No student submissions received yet.</div>
                ) : (
                  <div className="space-y-3">
                    {workspace.tabs.submissions.map((sub) => (
                      <div key={sub._id} className="rounded-xl border border-line bg-surface/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-400">{sub.student?.identifier}</span>
                            <span className="text-xs font-bold text-ink">{sub.student?.name}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                                sub.isGraded ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {sub.isGraded ? 'GRADED' : 'PENDING EVALUATION'}
                            </span>
                          </div>
                          <p className="text-xs text-muted mt-1">
                            Assignment: <span className="font-semibold text-ink">{sub.assignment?.title}</span> • Submitted: {new Date(sub.submittedAt).toLocaleDateString()}
                          </p>
                          {sub.notes && <p className="text-xs text-muted italic mt-0.5">"{sub.notes}"</p>}
                          {sub.submissionFiles && sub.submissionFiles[0] && (
                            <div className="mt-2">
                              <a
                                href={sub.submissionFiles[0].url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                📎 View Solution File ({sub.submissionFiles[0].name}) ↗
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          {sub.grade ? (
                            <div className="text-right">
                              <p className="text-xs text-muted">Marks Awarded</p>
                              <p className="text-lg font-extrabold text-emerald-400">
                                {sub.grade.marksObtained} / {sub.grade.maxMarks}
                              </p>
                              {sub.grade.feedback && <p className="text-[11px] text-muted line-clamp-1">{sub.grade.feedback}</p>}
                            </div>
                          ) : null}
                          <button
                            onClick={() => handleOpenGradeModal(sub)}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer shadow"
                          >
                            {sub.isGraded ? 'Update Grade' : 'Grade Submission →'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ANNOUNCEMENTS TAB */}
            {activeTab === 'announcements' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">Course Announcements</h3>
                    <p className="text-xs text-muted">Notices broadcast strictly to enrolled students of {workspace.subject.subjectCode}</p>
                  </div>
                  <button
                    onClick={() => handleOpenContentModal('ANNOUNCEMENTS')}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                  >
                    + Post Announcement
                  </button>
                </div>

                {workspace.tabs.announcements.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted">No announcements posted for this course.</div>
                ) : (
                  <div className="space-y-3">
                    {workspace.tabs.announcements.map((ann) => (
                      <div key={ann._id} className="rounded-xl border border-line bg-surface/30 p-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-ink">{ann.title}</h4>
                          <span className="text-[11px] font-mono text-muted">{new Date(ann.createdAt).toLocaleDateString()}</span>
                        </div>
                        {ann.description && <p className="text-xs text-muted leading-relaxed">{ann.description}</p>}
                        <div className="pt-2 flex justify-end">
                          <button onClick={() => handleDeleteContent(ann._id)} className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">Classroom Attendance Logs</h3>
                    <p className="text-xs text-muted">Session records with period, topics covered, and attendance counts</p>
                  </div>
                  <button
                    onClick={() => setShowAttendanceModal(true)}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 cursor-pointer shadow"
                  >
                    + Mark Attendance Session
                  </button>
                </div>

                {workspace.tabs.attendance.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted">No attendance sessions recorded yet.</div>
                ) : (
                  <div className="space-y-3">
                    {workspace.tabs.attendance.map((s) => (
                      <div key={s._id} className="rounded-xl border border-line bg-surface/30 p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-teal-400">Period {s.period}</span>
                            <span className="text-xs text-muted font-mono">• {new Date(s.date).toLocaleDateString()}</span>
                            <span className="text-xs text-muted font-mono">• {s.timeSlot}</span>
                          </div>
                          <h4 className="text-sm font-bold text-ink mt-0.5">{s.topicCovered || 'Syllabus Topic Session'}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted">Attendance Rate</p>
                          <p className="text-sm font-extrabold text-emerald-400">
                            {s.presentCount} / {s.totalStudents} ({s.totalStudents > 0 ? Math.round((s.presentCount / s.totalStudents) * 100) : 100}%)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STUDENT PROGRESS TAB */}
            {activeTab === 'studentProgress' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">Enrolled Student Performance & Progress</h3>
                    <p className="text-xs text-muted">
                      Individual quiz scores, assignment completion, attendance, and evaluation status
                    </p>
                  </div>
                  <input
                    type="text"
                    value={progressSearch}
                    onChange={(e) => setProgressSearch(e.target.value)}
                    placeholder="Search by name or roll no..."
                    className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink placeholder-muted focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {loadingProgress ? (
                  <div className="py-8 text-center text-xs text-muted">Loading enrolled student records...</div>
                ) : studentsProgress.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted">No students enrolled in this course yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-line text-muted uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Roll No</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Quizzes</th>
                          <th className="py-2.5 px-3">Assignment Avg</th>
                          <th className="py-2.5 px-3">Attendance</th>
                          <th className="py-2.5 px-3">Internal</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/40">
                        {studentsProgress
                          .filter(
                            (s) =>
                              !progressSearch ||
                              s.name.toLowerCase().includes(progressSearch.toLowerCase()) ||
                              s.rollNumber.toLowerCase().includes(progressSearch.toLowerCase())
                          )
                          .map((s) => (
                            <tr key={s.studentId} className="hover:bg-surface/30">
                              <td className="py-3 px-3 font-mono font-bold text-emerald-400">{s.rollNumber}</td>
                              <td className="py-3 px-3">
                                <p className="font-semibold text-ink">{s.name}</p>
                                <p className="text-[11px] text-muted">{s.collegeEmail}</p>
                              </td>
                              <td className="py-3 px-3 font-mono">
                                <span className="font-bold text-ink">{s.quizzesAttempted}</span> attempts ({s.totalQuizScore} pts)
                              </td>
                              <td className="py-3 px-3 font-mono">
                                <span className="font-bold text-indigo-400">{s.assignmentAverage}%</span>
                              </td>
                              <td className="py-3 px-3 font-mono">
                                <span className={`font-bold ${s.attendancePercentage >= 75 ? 'text-teal-400' : 'text-rose-400'}`}>
                                  {s.attendancePercentage}%
                                </span>{' '}
                                ({s.attendedSessions}/{s.totalSessions})
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-ink">{s.internalMarks} / 40</td>
                              <td className="py-3 px-3">
                                <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-bold text-muted border border-line">
                                  {s.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* RESULTS TAB */}
            {activeTab === 'results' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
                  <div>
                    <h3 className="text-base font-bold text-ink">Academic Evaluation & Class Analytics</h3>
                    <p className="text-xs text-muted">
                      Continuous internal evaluation, verified quiz scores, assignment grades, and student performance roster
                    </p>
                  </div>

                  {/* Sub-tab Switcher */}
                  <div className="flex rounded-xl bg-surface border border-line p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setResultsSubTab('roster')}
                      className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                        resultsSubTab === 'roster'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      Performance Roster
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultsSubTab('quizzes')}
                      className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                        resultsSubTab === 'quizzes'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      Quiz Results ({teacherResults?.quizResults?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultsSubTab('assignments')}
                      className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                        resultsSubTab === 'assignments'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      Assignment Results ({teacherResults?.assignmentResults?.length || 0})
                    </button>
                  </div>
                </div>

                {loadingResults ? (
                  <div className="py-12 text-center text-xs text-muted">
                    Loading verified academic results and DB aggregations...
                  </div>
                ) : (
                  <>
                    {/* Top KPI Summary Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="rounded-2xl border border-line bg-surface/30 p-4">
                        <p className="text-[10px] uppercase font-bold text-muted">Average Internal Mark</p>
                        <p className="mt-1 text-2xl font-extrabold text-emerald-400">
                          {teacherResults?.summary?.classAverageInternal ?? 34.5} <span className="text-xs text-muted">/ 40</span>
                        </p>
                        <p className="text-[11px] text-muted mt-1">Continuous Internal Evaluation</p>
                      </div>

                      <div className="rounded-2xl border border-line bg-surface/30 p-4">
                        <p className="text-[10px] uppercase font-bold text-muted">Class Pass Rate</p>
                        <p className="mt-1 text-2xl font-extrabold text-indigo-400">
                          {teacherResults?.summary?.classPassRate ?? 100}%
                        </p>
                        <p className="text-[11px] text-muted mt-1">Passing or On-Track</p>
                      </div>

                      <div className="rounded-2xl border border-line bg-surface/30 p-4">
                        <p className="text-[10px] uppercase font-bold text-muted">Total Enrolled</p>
                        <p className="mt-1 text-2xl font-extrabold text-ink">
                          {teacherResults?.summary?.totalEnrolled ?? studentsProgress.length}
                        </p>
                        <p className="text-[11px] text-muted mt-1">Active course students</p>
                      </div>

                      <div className="rounded-2xl border border-line bg-surface/30 p-4">
                        <p className="text-[10px] uppercase font-bold text-muted">At-Risk Alerts</p>
                        <p className={`mt-1 text-2xl font-extrabold ${
                          (teacherResults?.analytics?.atRiskStudentsCount || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {teacherResults?.analytics?.atRiskStudentsCount || 0}
                        </p>
                        <p className="text-[11px] text-muted mt-1">Attendance &lt;75% or score &lt;50%</p>
                      </div>
                    </div>

                    {/* Progress Analytics: Grade & Attendance Distribution */}
                    {teacherResults?.analytics && (
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
                        {/* Grade Distribution */}
                        <div className="rounded-2xl border border-line bg-surface/20 p-4 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                            Academic Standing Distribution
                          </h4>
                          <div className="grid grid-cols-4 gap-2 text-center text-xs">
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                              <p className="text-[10px] font-bold text-emerald-400">Excellent</p>
                              <p className="text-base font-extrabold text-ink mt-0.5">
                                {teacherResults.analytics.gradeDistribution.excellent}
                              </p>
                            </div>
                            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2.5">
                              <p className="text-[10px] font-bold text-indigo-400">Good</p>
                              <p className="text-base font-extrabold text-ink mt-0.5">
                                {teacherResults.analytics.gradeDistribution.good}
                              </p>
                            </div>
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5">
                              <p className="text-[10px] font-bold text-amber-400">Average</p>
                              <p className="text-base font-extrabold text-ink mt-0.5">
                                {teacherResults.analytics.gradeDistribution.average}
                              </p>
                            </div>
                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5">
                              <p className="text-[10px] font-bold text-rose-400">At Risk</p>
                              <p className="text-base font-extrabold text-rose-400 mt-0.5">
                                {teacherResults.analytics.gradeDistribution.atRisk}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Attendance Distribution */}
                        <div className="rounded-2xl border border-line bg-surface/20 p-4 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                            Attendance Health Distribution
                          </h4>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-2.5">
                              <p className="text-[10px] font-bold text-teal-400">&ge; 85% Rate</p>
                              <p className="text-base font-extrabold text-ink mt-0.5">
                                {teacherResults.analytics.attendanceDistribution.above85}
                              </p>
                            </div>
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5">
                              <p className="text-[10px] font-bold text-amber-400">75% - 84%</p>
                              <p className="text-base font-extrabold text-ink mt-0.5">
                                {teacherResults.analytics.attendanceDistribution.between75and84}
                              </p>
                            </div>
                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5">
                              <p className="text-[10px] font-bold text-rose-400">&lt; 75% Shortage</p>
                              <p className="text-base font-extrabold text-rose-400 mt-0.5">
                                {teacherResults.analytics.attendanceDistribution.below75}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 1: PERFORMANCE ROSTER */}
                    {resultsSubTab === 'roster' && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                          Enrolled Student Standing & Continuous Internal Marks
                        </h4>

                        {(teacherResults?.studentRoster?.length || 0) === 0 ? (
                          <div className="py-10 text-center text-xs text-muted border border-dashed border-line rounded-2xl">
                            No enrolled student records available.
                          </div>
                        ) : (
                          <div className="border border-line rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-surface/50 border-b border-line text-[10px] uppercase font-bold text-muted">
                                <tr>
                                  <th className="py-2.5 px-3">Roll No</th>
                                  <th className="py-2.5 px-3">Student Name</th>
                                  <th className="py-2.5 px-3">Attendance</th>
                                  <th className="py-2.5 px-3">Quiz Avg</th>
                                  <th className="py-2.5 px-3">Assignment Avg</th>
                                  <th className="py-2.5 px-3">Internal (40)</th>
                                  <th className="py-2.5 px-3">Standing</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-line/40">
                                {teacherResults?.studentRoster.map((s) => (
                                  <tr key={s.studentId} className="hover:bg-surface/30">
                                    <td className="py-3 px-3 font-mono font-bold text-teal-400">{s.rollNumber}</td>
                                    <td className="py-3 px-3">
                                      <p className="font-semibold text-ink">{s.name}</p>
                                      {s.collegeEmail && <p className="text-[11px] text-muted">{s.collegeEmail}</p>}
                                    </td>
                                    <td className="py-3 px-3 font-mono font-bold">
                                      <span className={s.attendance.percentage >= 75 ? 'text-teal-400' : 'text-rose-400'}>
                                        {s.attendance.percentage}%
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 font-mono">
                                      <span className="font-bold text-indigo-400">{s.quizzes.averagePercentage}%</span>{' '}
                                      <span className="text-[10px] text-muted">({s.quizzes.attempted} tests)</span>
                                    </td>
                                    <td className="py-3 px-3 font-mono">
                                      <span className="font-bold text-violet-400">{s.assignments.averagePercentage}%</span>{' '}
                                      <span className="text-[10px] text-muted">({s.assignments.graded} graded)</span>
                                    </td>
                                    <td className="py-3 px-3 font-mono font-bold text-ink">
                                      {s.calculatedInternal} <span className="text-muted text-[10px]">/ 40</span>
                                    </td>
                                    <td className="py-3 px-3">
                                      <span
                                        className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                                          s.standing === 'EXCELLENT'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : s.standing === 'GOOD'
                                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                            : s.standing === 'AVERAGE'
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        }`}
                                      >
                                        {s.standing}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-TAB 2: QUIZ RESULTS */}
                    {resultsSubTab === 'quizzes' && (
                      <div className="space-y-4">
                        {(teacherResults?.quizResults?.length || 0) === 0 ? (
                          <div className="py-12 text-center text-xs text-muted border border-dashed border-line rounded-2xl">
                            No quizzes published for this subject yet.
                          </div>
                        ) : (
                          teacherResults?.quizResults.map((q) => (
                            <div key={q.quizId} className="rounded-2xl border border-line bg-surface/30 p-5 space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="rounded bg-indigo-500/10 text-indigo-400 px-2 py-0.5 text-[10px] font-bold border border-indigo-500/20">
                                      {q.difficultyLevel}
                                    </span>
                                    <h4 className="text-sm font-bold text-ink">{q.title}</h4>
                                  </div>
                                  <p className="text-xs text-muted mt-1">
                                    Total {q.totalMarks} Marks • Passing: {q.passingMarks} Marks
                                  </p>
                                </div>

                                <div className="flex items-center gap-4 text-xs">
                                  <div className="text-center">
                                    <p className="text-[10px] text-muted uppercase font-bold">Attempts</p>
                                    <p className="text-sm font-extrabold text-ink">{q.totalAttempts}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[10px] text-muted uppercase font-bold">Pass Rate</p>
                                    <p className="text-sm font-extrabold text-emerald-400">{q.passRate}%</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[10px] text-muted uppercase font-bold">Class Avg</p>
                                    <p className="text-sm font-extrabold text-indigo-400">{q.averageScore}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Student Attempts Table */}
                              {q.studentResults.length === 0 ? (
                                <p className="text-xs text-muted text-center py-4">No student attempts recorded yet.</p>
                              ) : (
                                <div className="border border-line rounded-xl overflow-hidden">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-surface/50 border-b border-line text-[10px] uppercase font-bold text-muted">
                                      <tr>
                                        <th className="py-2 px-3">Roll No</th>
                                        <th className="py-2 px-3">Student Name</th>
                                        <th className="py-2 px-3">Score</th>
                                        <th className="py-2 px-3">Percentage</th>
                                        <th className="py-2 px-3">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line/40">
                                      {q.studentResults.map((sr) => (
                                        <tr key={sr.resultId} className="hover:bg-surface/30">
                                          <td className="py-2.5 px-3 font-mono font-bold text-teal-400">{sr.rollNumber}</td>
                                          <td className="py-2.5 px-3 font-semibold text-ink">{sr.studentName}</td>
                                          <td className="py-2.5 px-3 font-bold text-ink">{sr.score} / {sr.totalMarks}</td>
                                          <td className="py-2.5 px-3 font-mono text-indigo-400">{sr.percentage}%</td>
                                          <td className="py-2.5 px-3">
                                            <span
                                              className={`rounded px-1.5 py-0.2 text-[10px] font-bold border ${
                                                sr.passed
                                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                              }`}
                                            >
                                              {sr.passed ? 'PASSED' : 'FAILED'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* SUB-TAB 3: ASSIGNMENT RESULTS */}
                    {resultsSubTab === 'assignments' && (
                      <div className="space-y-4">
                        {(teacherResults?.assignmentResults?.length || 0) === 0 ? (
                          <div className="py-12 text-center text-xs text-muted border border-dashed border-line rounded-2xl">
                            No assignments published for this subject yet.
                          </div>
                        ) : (
                          teacherResults?.assignmentResults.map((a) => (
                            <div key={a.assignmentId} className="rounded-2xl border border-line bg-surface/30 p-5 space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                                <div>
                                  <h4 className="text-sm font-bold text-ink">{a.title}</h4>
                                  <p className="text-xs text-muted mt-1">
                                    Total {a.totalMarks} Marks
                                    {a.deadline && ` • Due ${new Date(a.deadline).toLocaleDateString()}`}
                                  </p>
                                </div>

                                <div className="flex items-center gap-4 text-xs">
                                  <div className="text-center">
                                    <p className="text-[10px] text-muted uppercase font-bold">Submissions</p>
                                    <p className="text-sm font-extrabold text-ink">{a.totalSubmissions}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[10px] text-muted uppercase font-bold">Graded</p>
                                    <p className="text-sm font-extrabold text-emerald-400">{a.gradedCount}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[10px] text-muted uppercase font-bold">Average Mark</p>
                                    <p className="text-sm font-extrabold text-violet-400">{a.averageMarks}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Student Submissions Table */}
                              {a.studentSubmissions.length === 0 ? (
                                <p className="text-xs text-muted text-center py-4">No student submissions recorded yet.</p>
                              ) : (
                                <div className="border border-line rounded-xl overflow-hidden">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-surface/50 border-b border-line text-[10px] uppercase font-bold text-muted">
                                      <tr>
                                        <th className="py-2 px-3">Roll No</th>
                                        <th className="py-2 px-3">Student Name</th>
                                        <th className="py-2 px-3">Submitted</th>
                                        <th className="py-2 px-3">Marks</th>
                                        <th className="py-2 px-3">Grading Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line/40">
                                      {a.studentSubmissions.map((sub) => (
                                        <tr key={sub.submissionId} className="hover:bg-surface/30">
                                          <td className="py-2.5 px-3 font-mono font-bold text-teal-400">{sub.rollNumber}</td>
                                          <td className="py-2.5 px-3 font-semibold text-ink">{sub.studentName}</td>
                                          <td className="py-2.5 px-3 text-muted font-mono">
                                            {new Date(sub.submittedAt).toLocaleDateString()}
                                            {sub.isLate && <span className="ml-1 text-[10px] text-rose-400 font-bold">(Late)</span>}
                                          </td>
                                          <td className="py-2.5 px-3 font-bold text-ink">
                                            {sub.marksObtained !== null ? `${sub.marksObtained} / ${sub.maxMarks}` : '—'}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <span
                                              className={`rounded px-1.5 py-0.2 text-[10px] font-bold border ${
                                                sub.isGraded
                                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                              }`}
                                            >
                                              {sub.isGraded ? 'GRADED' : 'UNDER REVIEW'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* SIMULATIONS TAB */}
            {activeTab === 'simulations' && workspace && (
              <SimulationManager
                subject={workspace.subject}
                assignedSimulations={workspace.tabs.simulations}
                isTeacher={true}
                onAssignSimulation={handleAssignSimulation}
                onToggleStatus={handleToggleSimulationStatus}
                onDeleteSimulation={handleDeleteSimulation}
                onLaunchSmartBoard={async (simKey, title, simulationContext) => {
                  // Straight to the Smart Board — no launch dialog for simulations
                  const session = await launchSmartBoardSimulation({
                    subjectId: workspace.subject._id,
                    simKey,
                    title,
                    simulationContext,
                  });
                  if (session) setActiveBoardSession(session);
                }}
              />
            )}


            {/* AI KNOWLEDGE TAB (MODULE 07 / REQ 17-21) */}
            {activeTab === 'aiKnowledge' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-mono font-bold text-indigo-400 border border-indigo-500/20">
                        RAG Vector Store
                      </span>
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                        Strict Cross-Subject Isolation Active
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-ink mt-1">
                      {workspace.subject.subjectCode} AI Knowledge Base & RAG Index
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Vector-indexed institutional syllabus units, customized chapter notes, and uploaded learning materials.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => loadAiStats(workspace.subject._id)}
                    disabled={loadingAiStats}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface/80 transition-all cursor-pointer"
                  >
                    <span>{loadingAiStats ? '⏳' : '↻'}</span> {loadingAiStats ? 'Syncing...' : 'Refresh RAG Stats'}
                  </button>
                </div>

                {/* Real-time Knowledge Base Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="rounded-xl border border-line bg-surface/30 p-3.5 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted">Total Documents</p>
                    <p className="text-2xl font-extrabold text-ink">{aiStats?.documents || 0}</p>
                    <p className="text-[10px] text-muted">Ingested units & files</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-emerald-400">Processed (Indexed)</p>
                    <p className="text-2xl font-extrabold text-emerald-400">{aiStats?.processed || 0}</p>
                    <p className="text-[10px] text-muted">Ready for retrieval</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-amber-400">In Processing</p>
                    <p className="text-2xl font-extrabold text-amber-400">{aiStats?.processing || 0}</p>
                    <p className="text-[10px] text-muted">Chunking & embedding</p>
                  </div>
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-rose-400">Failed Ingestion</p>
                    <p className="text-2xl font-extrabold text-rose-400">{aiStats?.failed || 0}</p>
                    <p className="text-[10px] text-muted">Requires re-upload</p>
                  </div>
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-indigo-400">Vector Chunks</p>
                    <p className="text-2xl font-extrabold text-indigo-400">
                      {aiStats?.knowledgeChunks ?? workspace.tabs.aiKnowledge.chunkCount}
                    </p>
                    <p className="text-[10px] text-muted">Embedding vectors</p>
                  </div>
                  <div className="rounded-xl border border-line bg-surface/30 p-3.5 space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted">Last Updated</p>
                    <p className="text-xs font-bold text-ink mt-1 truncate">
                      {aiStats?.lastUpdated ? new Date(aiStats.lastUpdated).toLocaleDateString() : 'Active'}
                    </p>
                    <p className="text-[10px] text-muted">
                      {aiStats?.lastUpdated ? new Date(aiStats.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Real-time'}
                    </p>
                  </div>
                </div>

                {/* Architecture & Isolation Guarantees */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
                  <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🛡️</span>
                      <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                        Strict Cross-Subject Isolation
                      </h4>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Every chunk is tagged with <code className="text-indigo-400 font-mono text-[11px]">subjectId: {workspace.subject._id}</code> and academic metadata. When students ask doubts in the AI Assistant, cosine similarity queries are strictly filtered by this subject ID. Queries can never cross-pollinate into other department subjects or other semesters.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚡</span>
                      <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                        Zero-Delay Automatic Ingestion
                      </h4>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Whenever you save chapter notes, edit learning objectives, or upload lecture materials in this workspace, the backend triggers incremental vector chunking automatically. No manual model retraining or delayed batch processing is required.
                    </p>
                  </div>
                </div>

                {/* Indexed Documents Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                      Indexed Knowledge Documents & Units ({aiStats?.sources.length || 0})
                    </h4>
                  </div>

                  {!aiStats?.sources || aiStats.sources.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-line p-8 text-center text-xs text-muted">
                      No documents currently indexed for this subject. Ingest content by customizing units in the Curriculum tab or uploading materials in Notes/Materials.
                    </div>
                  ) : (
                    <div className="rounded-xl border border-line overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface/60 border-b border-line text-muted font-bold text-[11px]">
                          <tr>
                            <th className="py-2.5 px-3">Document Title</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Unit / Chapter</th>
                            <th className="py-2.5 px-3">Chunks</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Updated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line/60">
                          {aiStats.sources.map((src) => (
                            <tr key={src._id} className="hover:bg-surface/30 transition-colors">
                              <td className="py-2 px-3 font-semibold text-ink line-clamp-1">{src.title}</td>
                              <td className="py-2 px-3">
                                <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-line">
                                  {src.documentType}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-muted">{src.chapter || 'General'}</td>
                              <td className="py-2 px-3 font-mono font-bold text-indigo-400">{src.chunkCount}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                    src.status === 'INDEXED'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : src.status === 'PROCESSING'
                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                      : src.status === 'FAILED'
                                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                  }`}
                                >
                                  {src.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-muted text-[10px]">
                                {new Date(src.updatedAt).toLocaleDateString()}
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

            {/* SECURE FILES TAB */}
            {activeTab === 'secureFiles' && workspace && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <h3 className="text-base font-bold text-ink flex items-center gap-2">
                      <span>🔒</span> Protected Subject Academic Files Vault
                    </h3>
                    <p className="text-xs text-muted">
                      Authorized repository for PDFs, PPT/PPTX slides, documents, images, and lecture videos.
                      Protected by malware scanning, MIME verification, and role-based download token authorization.
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
                  <h4 className="text-sm font-bold text-ink">Zero Public File URLs • End-to-End Backend Authorization</h4>
                  <p className="text-xs text-muted max-w-lg mx-auto">
                    All academic files are stored in private encrypted storage keys outside public web roots. Files are dynamically streamed only after validating subject faculty assignments and student enrollments.
                  </p>
                  <button
                    onClick={() => setShowFileManagerModal(true)}
                    className="rounded-xl bg-surface border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 transition-all cursor-pointer"
                  >
                    Manage Subject Documents & Resources →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
            </div>
          )}
        </>
      )}

      {/* ─── MODAL: ADD CONTENT ─── */}
      {showContentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Publish {showContentModal}</h3>
              <button onClick={() => setShowContentModal(null)} className="text-xs text-muted hover:text-ink cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContent} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={contentForm.title}
                  onChange={(e) => setContentForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={`Enter ${showContentModal.toLowerCase()} title...`}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={contentForm.description}
                  onChange={(e) => setContentForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional details or instructions..."
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {showContentModal !== 'ANNOUNCEMENTS' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted block mb-1">Chapter / Unit (1-10)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={contentForm.chapterOrUnit || 1}
                      onChange={(e) => setContentForm((prev) => ({ ...prev, chapterOrUnit: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted block mb-1">Status</label>
                    <select
                      value={contentForm.status}
                      onChange={(e) => setContentForm((prev) => ({ ...prev, status: e.target.value as any }))}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="PUBLISHED">Published</option>
                      <option value="DRAFT">Draft</option>
                    </select>
                  </div>
                </div>
              )}

              {showContentModal !== 'ANNOUNCEMENTS' && (
                <div className="space-y-2 pt-2 border-t border-line/60">
                  <label className="text-xs font-semibold text-muted block">Attachment Document</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="File Name (e.g. Unit1.pdf)"
                      value={contentForm.attachments?.[0]?.name || ''}
                      onChange={(e) =>
                        setContentForm((prev) => ({
                          ...prev,
                          attachments: [{ name: e.target.value, url: prev.attachments?.[0]?.url || '' }],
                        }))
                      }
                      className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="File URL or Link"
                      value={contentForm.attachments?.[0]?.url || ''}
                      onChange={(e) =>
                        setContentForm((prev) => ({
                          ...prev,
                          attachments: [{ name: prev.attachments?.[0]?.name || 'Document', url: e.target.value }],
                        }))
                      }
                      className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowContentModal(null)}
                  className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingContent}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow cursor-pointer disabled:opacity-50"
                >
                  {submittingContent ? 'Saving...' : 'Save & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT ASSIGNMENT ─── */}
      {showAssignmentModal && (
        <AssignmentBuilderModal
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setEditingAssignment(null);
          }}
          onAssignmentSaved={async () => {
            if (selectedSubjectId) await loadSubjectWorkspace(selectedSubjectId);
          }}
          subjectId={selectedSubjectId}
          subjectName={workspace?.subject.subjectName}
          subjectCode={workspace?.subject.subjectCode}
          syllabusUnits={(workspace?.subject as any)?.syllabus || (workspace?.subject as any)?.syllabusUnits || []}
          initialAssignment={editingAssignment}
        />
      )}

      {/* ─── MODAL: GRADE SUBMISSION (MANUAL + AI-ASSISTED) ─── */}
      {gradingSubmission && (
        <AssignmentGradingModal
          isOpen={!!gradingSubmission}
          onClose={() => setGradingSubmission(null)}
          submission={gradingSubmission}
          assignment={
            gradingSubmission.assignment ||
            workspace?.tabs.assignments.find(
              (a: any) =>
                a._id === gradingSubmission.assignment?._id ||
                a._id === gradingSubmission.assignment
            ) ||
            null
          }
          onGraded={async () => {
            if (selectedSubjectId) await loadSubjectWorkspace(selectedSubjectId);
          }}
        />
      )}

      {/* ─── MODAL: ACADEMIC ATTENDANCE ENGINE (MARK, BULK, EDIT, HISTORY) ─── */}
      {showAttendanceModal && (
        <AttendanceManagerModal
          isOpen={showAttendanceModal}
          onClose={() => setShowAttendanceModal(false)}
          onAttendanceSaved={async () => {
            if (selectedSubjectId) {
              await loadSubjectWorkspace(selectedSubjectId);
              await loadStudentsProgress(selectedSubjectId);
              await loadTeacherResults(selectedSubjectId);
            }
          }}
          initialSubjectId={selectedSubjectId}
          initialSubjectName={workspace?.subject.subjectName}
          initialSubjectCode={workspace?.subject.subjectCode}
          initialDepartmentId={selectedDeptId}
          initialSemesterId={(workspace?.subject as any)?.semester?._id || ''}
          departments={
            assignedData?.departments.map((d) => ({
              _id: d._id,
              name: d.name,
              code: d.code,
            })) || []
          }
          semesters={
            assignedData?.semesters.map((s) => ({
              _id: s._id,
              semesterNumber: s.semesterNumber,
              academicYear: s.academicYear,
            })) || []
          }
          subjects={
            assignedData?.subjects.map((s) => ({
              _id: s._id,
              subjectName: s.subjectName,
              subjectCode: s.subjectCode,
              department: s.departmentId,
              semester: s.semesterId,
            })) || []
          }
        />
      )}

      {/* ─── MODAL: PIYUSHDHARA SMART BOARD LAUNCHER ─── */}
      <SmartBoardLaunchModal
        isOpen={showSmartBoardModal}
        onClose={() => {
          setShowSmartBoardModal(false);
          setSmartBoardResource(null);
        }}
        departments={
          assignedData?.departments.map((d) => ({
            _id: d._id,
            name: d.name,
            code: d.code,
          })) || []
        }
        semesters={
          assignedData?.semesters.map((s) => ({
            _id: s._id,
            semesterNumber: s.semesterNumber,
            academicYear: s.academicYear,
            departmentId: s.departmentId || '',
          })) || []
        }
        subjects={
          assignedData?.subjects.map((s) => ({
            _id: s._id,
            subjectName: s.subjectName,
            subjectCode: s.subjectCode,
            departmentId: s.departmentId || '',
            semesterNumber: s.semesterNumber,
            credits: s.credits,
          })) || []
        }
        selectedDeptId={selectedDeptId}
        selectedSemNum={selectedSemNum}
        selectedSubjectId={selectedSubjectId}
        onSubjectChange={(subId) => handleSelectSubject(subId)}
        onSessionLaunched={(session) => {
          setActiveBoardSession(session);
        }}
        initialResource={smartBoardResource}
      />

      {/* ─── SECURE ACADEMIC FILE VAULT MODAL ─── */}
      {showFileManagerModal && workspace && (
        <SecureFileManagerModal
          isOpen={showFileManagerModal}
          onClose={() => setShowFileManagerModal(false)}
          subject={{
            _id: workspace.subject._id,
            subjectName: workspace.subject.subjectName,
            subjectCode: workspace.subject.subjectCode,
            department: workspace.subject.department,
            semester: workspace.subject.semester,
            syllabus: workspace.subject.syllabusUnits?.map((u: any) => ({
              unitNumber: u.unitNumber,
              title: u.title,
            })),
          }}
          canUpload={true}
        />
      )}

      {/* ─── FLOATING REMOTE CONTROL DOCK FOR LIVE SMART BOARD ─── */}
      {activeBoardSession && (
        <SmartBoardRemoteDock
          activeSession={activeBoardSession}
          onClose={() => setActiveBoardSession(null)}
          onOpenLaunchModal={() => setShowSmartBoardModal(true)}
          subjectContext={workspace ? {
            simulations: workspace.tabs.simulations.map((s) => ({
              simKey: s.simulationConfig?.type || 'bst',
              title: s.title,
            })),
            presentations: workspace.tabs.presentations,
          } : undefined}
        />
      )}

      {/* ─── MODAL: CUSTOMIZE CURRICULUM CHAPTER CONTENT (PROTECTING OFFICIAL SYLLABUS) ─── */}
      {editingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-mono font-bold text-indigo-400 border border-indigo-500/20">
                  {editingUnit.unitCode} • Unit {editingUnit.unitNumber}
                </span>
                <h3 className="text-base font-bold text-ink mt-1">
                  Customize Chapter Teaching Content
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUnit(null)}
                className="text-xs text-muted hover:text-ink cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Institutional Protection Banner */}
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                <span>🔒</span> Institutional Syllabus Protection
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Official syllabus title (<span className="text-ink font-semibold">{editingUnit.officialTitle}</span>) and institutional curriculum topics remain protected. Your additions below are saved as your faculty pedagogical customizations and will be incrementally ingested into the RAG vector store for this subject.
              </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-ink block mb-1">
                  Custom Chapter Title (Optional)
                </label>
                <input
                  type="text"
                  value={curriculumForm.chapterTitle}
                  onChange={(e) =>
                    setCurriculumForm((prev) => ({ ...prev, chapterTitle: e.target.value }))
                  }
                  placeholder={editingUnit.officialTitle}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-ink block mb-1">
                  Faculty Teaching Notes & Explanations
                </label>
                <textarea
                  rows={4}
                  value={curriculumForm.teachingNotes}
                  onChange={(e) =>
                    setCurriculumForm((prev) => ({ ...prev, teachingNotes: e.target.value }))
                  }
                  placeholder="Key concepts, intuition, pedagogical approach, analogies, or prerequisites for this unit..."
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ink block mb-1">
                    Learning Objectives (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={curriculumForm.learningObjectives}
                    onChange={(e) =>
                      setCurriculumForm((prev) => ({ ...prev, learningObjectives: e.target.value }))
                    }
                    placeholder="Understand algorithm fundamentals&#10;Implement data pipelines&#10;Analyze asymptotic complexity"
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink focus:border-indigo-500 focus:outline-none font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="font-bold text-ink block mb-1">
                    Important Exam & Concept Points (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={curriculumForm.importantPoints}
                    onChange={(e) =>
                      setCurriculumForm((prev) => ({ ...prev, importantPoints: e.target.value }))
                    }
                    placeholder="Key difference between stack and queue&#10;Common edge cases in recursion"
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink focus:border-indigo-500 focus:outline-none font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ink block mb-1">
                    Practical / Industry Examples (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={curriculumForm.practicalExamples}
                    onChange={(e) =>
                      setCurriculumForm((prev) => ({ ...prev, practicalExamples: e.target.value }))
                    }
                    placeholder="Spotify track recommendation indexing&#10;Google maps shortest path Dijkstra"
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink focus:border-indigo-500 focus:outline-none font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="font-bold text-ink block mb-1">
                    Reference Materials & Textbooks (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={curriculumForm.referenceMaterials}
                    onChange={(e) =>
                      setCurriculumForm((prev) => ({ ...prev, referenceMaterials: e.target.value }))
                    }
                    placeholder="CLRS Chapter 4: Divide and Conquer&#10;Sedgewick Algorithms 4th Edition"
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink focus:border-indigo-500 focus:outline-none font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Topics Breakdown List */}
              <div className="space-y-2 pt-2 border-t border-line/60">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-ink block">
                    Detailed Custom Topics ({curriculumForm.topics.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddTopic(!showAddTopic)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    {showAddTopic ? '✕ Cancel Topic' : '+ Add Detailed Topic'}
                  </button>
                </div>

                {curriculumForm.topics.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {curriculumForm.topics.map((t, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg bg-surface/50 border border-line p-2 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <span className="font-bold text-ink">{idx + 1}. {t.title}</span>
                          {t.explanation && (
                            <span className="text-muted text-[10px] ml-2 truncate">
                              - {t.explanation}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTopic(idx)}
                          className="text-rose-400 hover:text-rose-300 font-bold px-1.5 py-0.5 rounded"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sub-form to Add New Topic */}
                {showAddTopic && (
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-2 mt-2">
                    <p className="text-[11px] font-bold text-indigo-400 uppercase">
                      New Topic Details
                    </p>
                    <input
                      type="text"
                      placeholder="Topic Title (e.g. Asymptotic Upper Bound Big-O)"
                      value={newTopicForm.title}
                      onChange={(e) =>
                        setNewTopicForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none"
                    />
                    <textarea
                      rows={2}
                      placeholder="Topic Explanation / Deep-dive"
                      value={newTopicForm.explanation}
                      onChange={(e) =>
                        setNewTopicForm((prev) => ({ ...prev, explanation: e.target.value }))
                      }
                      className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Key Formulas (comma-separated)"
                        value={newTopicForm.formulas}
                        onChange={(e) =>
                          setNewTopicForm((prev) => ({ ...prev, formulas: e.target.value }))
                        }
                        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none font-mono text-[10px]"
                      />
                      <input
                        type="text"
                        placeholder="Examples (comma-separated)"
                        value={newTopicForm.examples}
                        onChange={(e) =>
                          setNewTopicForm((prev) => ({ ...prev, examples: e.target.value }))
                        }
                        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none text-[10px]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddTopicToUnit}
                      className="w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all cursor-pointer"
                    >
                      Insert Topic into Unit
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-line flex items-center justify-between gap-3">
              <span className="text-[10px] text-muted flex items-center gap-1">
                <span>🤖</span> Auto-triggers RAG vector indexing
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  disabled={savingCurriculum}
                  className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUnitCurriculum}
                  disabled={savingCurriculum}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>{savingCurriculum ? '⏳' : '💾'}</span>
                  {savingCurriculum ? 'Saving & Ingesting...' : 'Save & Sync into RAG'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
