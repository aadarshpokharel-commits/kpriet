import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { AdminService } from '@/services/admin.service';
import { ProgrammeManagementPanel } from '@/components/programme/ProgrammeManagementPanel';
import type {
  IInstitutionOverview,
  IFacultyDirectoryResponse,
  IStudentDirectoryResponse,
  IAcademicActivityData,
  IAuditLogsResponse,
  IAuditLogItem,
} from '@/types/academic.types';

type AdminTab =
  | 'overview'
  | 'programmes'
  | 'departments'
  | 'faculty'
  | 'students'
  | 'structure'
  | 'activity'
  | 'audit'
  | 'settings';

export function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab');

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>(
    (currentTabParam as AdminTab) || 'overview'
  );

  useEffect(() => {
    if (currentTabParam && currentTabParam !== activeTab) {
      setActiveTab(currentTabParam as AdminTab);
    }
  }, [currentTabParam]);

  const handleTabChange = (tabId: AdminTab) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Loading and feedback
  const [overview, setOverview] = useState<IInstitutionOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // ─── TAB 2: DEPARTMENTS STATE ───
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [departmentStatusFilter, setDepartmentStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [showCreateDeptModal, setShowCreateDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [assignHodModal, setAssignHodModal] = useState<any | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    programmeType: 'UG',
    description: '',
    status: 'ACTIVE',
  });
  const [selectedHodUserId, setSelectedHodUserId] = useState('');
  const [submittingDept, setSubmittingDept] = useState(false);

  // ─── TAB 3: FACULTY STATE ───
  const [facultyData, setFacultyData] = useState<IFacultyDirectoryResponse | null>(null);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [facultyDeptFilter, setFacultyDeptFilter] = useState('');
  const [facultyApprovalFilter, setFacultyApprovalFilter] = useState('');
  const [facultyAccountFilter, setFacultyAccountFilter] = useState('');
  const [facultySearch, setFacultySearch] = useState('');
  const [facultyPage, setFacultyPage] = useState(1);

  // ─── TAB 4: STUDENTS STATE ───
  const [studentData, setStudentData] = useState<IStudentDirectoryResponse | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentDeptFilter, setStudentDeptFilter] = useState('');
  const [studentSemesterFilter, setStudentSemesterFilter] = useState<number | undefined>(undefined);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);

  // ─── TAB 5: ACADEMIC ACTIVITY STATE ───
  const [activityData, setActivityData] = useState<IAcademicActivityData | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  // ─── TAB 6: AUDIT LOGS STATE ───
  const [auditData, setAuditData] = useState<IAuditLogsResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [selectedAuditLog, setSelectedAuditLog] = useState<IAuditLogItem | null>(null);

  // ─── PRIVILEGED USER STATUS MODAL ───
  const [statusChangeModal, setStatusChangeModal] = useState<{
    userId: string;
    userName: string;
    userRole: string;
    currentStatus: string;
    targetStatus: string;
  } | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // ─── DATA FETCHERS ───

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const data = await AdminService.getInstitutionOverview();
      setOverview(data);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to load institution overview.',
      });
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadFaculty = useCallback(async () => {
    setFacultyLoading(true);
    try {
      const data = await AdminService.getFacultyDirectory({
        departmentId: facultyDeptFilter || undefined,
        approvalStatus: facultyApprovalFilter || undefined,
        accountStatus: facultyAccountFilter || undefined,
        search: facultySearch || undefined,
        page: facultyPage,
        limit: 15,
      });
      setFacultyData(data);
    } catch (err: any) {
      console.warn('Faculty directory load failed:', err);
    } finally {
      setFacultyLoading(false);
    }
  }, [facultyDeptFilter, facultyApprovalFilter, facultyAccountFilter, facultySearch, facultyPage]);

  const loadStudents = useCallback(async () => {
    setStudentLoading(true);
    try {
      const data = await AdminService.getStudentDirectory({
        departmentId: studentDeptFilter || undefined,
        semesterNumber: studentSemesterFilter,
        search: studentSearch || undefined,
        page: studentPage,
        limit: 15,
      });
      setStudentData(data);
    } catch (err: any) {
      console.warn('Student directory load failed:', err);
    } finally {
      setStudentLoading(false);
    }
  }, [studentDeptFilter, studentSemesterFilter, studentSearch, studentPage]);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const data = await AdminService.getAcademicActivity();
      setActivityData(data);
    } catch (err: any) {
      console.warn('Academic activity load failed:', err);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const data = await AdminService.getAuditLogs({
        action: auditActionFilter || undefined,
        search: auditSearch || undefined,
        page: auditPage,
        limit: 20,
      });
      setAuditData(data);
    } catch (err: any) {
      console.warn('Audit logs load failed:', err);
    } finally {
      setAuditLoading(false);
    }
  }, [auditActionFilter, auditSearch, auditPage]);

  // Initial load
  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Tab switch effect
  useEffect(() => {
    if (activeTab === 'faculty') loadFaculty();
    if (activeTab === 'students') loadStudents();
    if (activeTab === 'activity') loadActivity();
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, loadFaculty, loadStudents, loadActivity, loadAuditLogs]);

  // Dismiss feedback banner after 5s
  useEffect(() => {
    if (actionFeedback) {
      const t = setTimeout(() => setActionFeedback(null), 5000);
      return () => clearTimeout(t);
    }
  }, [actionFeedback]);

  // ─── ACTION HANDLERS ───

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDept(true);
    try {
      await AdminService.createDepartment(deptForm);
      setActionFeedback({ type: 'success', message: `Department ${deptForm.code} created successfully.` });
      setShowCreateDeptModal(false);
      setDeptForm({ name: '', code: '', programmeType: 'UG', description: '', status: 'ACTIVE' });
      loadOverview();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to create department.',
      });
    } finally {
      setSubmittingDept(false);
    }
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    setSubmittingDept(true);
    try {
      await AdminService.updateDepartment(editingDept._id, deptForm);
      setActionFeedback({ type: 'success', message: `Department ${deptForm.code} updated.` });
      setEditingDept(null);
      loadOverview();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to update department.',
      });
    } finally {
      setSubmittingDept(false);
    }
  };

  const handleAssignHod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignHodModal || !selectedHodUserId) return;
    setSubmittingDept(true);
    try {
      await AdminService.assignDepartmentHod(assignHodModal._id, selectedHodUserId);
      setActionFeedback({
        type: 'success',
        message: `Head of Department assigned for ${assignHodModal.code}.`,
      });
      setAssignHodModal(null);
      setSelectedHodUserId('');
      loadOverview();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to assign HOD.',
      });
    } finally {
      setSubmittingDept(false);
    }
  };

  const handleToggleDepartmentStatus = async (dept: any) => {
    const nextStatus = dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const confirmMsg = `Are you sure you want to set department "${dept.code}" to ${nextStatus}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await AdminService.toggleDepartmentStatus(dept._id, nextStatus);
      setActionFeedback({
        type: 'success',
        message: `Department ${dept.code} status changed to ${nextStatus}.`,
      });
      loadOverview();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to toggle department status.',
      });
    }
  };

  const handleExecuteStatusChange = async () => {
    if (!statusChangeModal) return;
    setSubmittingStatus(true);
    try {
      await AdminService.updateUserStatus(
        statusChangeModal.userId,
        statusChangeModal.targetStatus,
        statusReason || undefined
      );
      setActionFeedback({
        type: 'success',
        message: `User ${statusChangeModal.userName} status set to ${statusChangeModal.targetStatus}. Action logged to audit trail.`,
      });
      setStatusChangeModal(null);
      setStatusReason('');
      if (activeTab === 'faculty') loadFaculty();
      if (activeTab === 'students') loadStudents();
      loadOverview();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to update user status.',
      });
    } finally {
      setSubmittingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20">
              Institutional Executive Governance
            </span>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
              KPRIET Central Administration
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
            {user?.name}
          </h1>
          <p className="text-sm text-muted">
            Institutional Email: <span className="font-mono text-ink">{user?.collegeEmail}</span> •{' '}
            Authority: <span className="font-semibold text-rose-400">{user?.role}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/system-status"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink hover:bg-panel transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            System Status
          </Link>
          <button
            onClick={() => {
              loadOverview();
              if (activeTab === 'faculty') loadFaculty();
              if (activeTab === 'students') loadStudents();
              if (activeTab === 'activity') loadActivity();
              if (activeTab === 'audit') loadAuditLogs();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink hover:bg-panel transition-all cursor-pointer"
            title="Refresh All Metrics"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={() => logout()}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ─── ACTION FEEDBACK BANNER ─── */}
      {actionFeedback && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-medium ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{actionFeedback.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── TOP KPI RIBBON ─── */}
      {overview && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-line bg-panel p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Departments</p>
            <p className="mt-1 text-2xl font-bold text-ink">{overview.kpis.departments.total}</p>
            <p className="text-[11px] text-emerald-400 mt-0.5">{overview.kpis.departments.active} Active Units</p>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Faculty Body</p>
            <p className="mt-1 text-2xl font-bold text-indigo-400">{overview.kpis.faculty.total}</p>
            <p className="text-[11px] text-muted mt-0.5">
              {overview.kpis.faculty.approved} Active • {overview.kpis.faculty.pending} Pending
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Enrolled Students</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{overview.kpis.students.total}</p>
            <p className="text-[11px] text-muted mt-0.5">
              {overview.kpis.students.activeEnrollments} Enrolled Semesters
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Curriculum</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{overview.kpis.academics.subjects}</p>
            <p className="text-[11px] text-muted mt-0.5">
              {overview.kpis.academics.activeSubjects} Active Courses
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Academic Content</p>
            <p className="mt-1 text-2xl font-bold text-sky-400">{overview.kpis.content.total}</p>
            <p className="text-[11px] text-muted mt-0.5">
              {overview.kpis.content.notes + overview.kpis.content.materials} Notes & Docs
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Audit Events</p>
            <p className="mt-1 text-2xl font-bold text-rose-400">{overview.kpis.auditLogsTotal}</p>
            <p className="text-[11px] text-muted mt-0.5">Fully Traced Actions</p>
          </div>
        </div>
      )}

      {/* ─── TAB NAVIGATION ─── */}
      <div className="flex border-b border-line overflow-x-auto gap-2">
        {[
          { id: 'overview', label: 'Institution Overview', icon: '🏛️' },
          { id: 'programmes', label: 'Programme Management', icon: '🎓' },
          { id: 'departments', label: 'Departments', icon: '🏢' },
          { id: 'faculty', label: 'Faculty Directory', icon: '👨‍🏫' },
          { id: 'students', label: 'Student Directory', icon: '🎓' },
          { id: 'structure', label: 'Academic Structure', icon: '📚' },
          { id: 'activity', label: 'Analytics & Activity', icon: '📊' },
          { id: 'audit', label: 'Audit Logs', icon: '🛡️' },
          { id: 'settings', label: 'System Settings', icon: '⚙️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5 rounded-t-lg font-bold'
                : 'border-transparent text-muted hover:text-ink hover:border-line'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 1. INSTITUTION OVERVIEW TAB */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {overviewLoading && !overview ? (
            <div className="py-16 text-center text-xs text-muted">Loading institutional intelligence...</div>
          ) : overview ? (
            <>
              {/* System Diagnostics Card */}
              <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-sm font-semibold text-ink">System Infrastructure & Runtime Diagnostic</h3>
                  </div>
                  <span className="text-[11px] font-mono text-muted">
                    Database: <span className="text-emerald-400 font-semibold">{overview.systemHealth.dbStatus}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
                  <div className="rounded-xl border border-line/60 bg-surface/50 p-3">
                    <p className="text-muted">Node Runtime</p>
                    <p className="font-mono font-semibold text-ink mt-0.5">{overview.systemHealth.nodeVersion}</p>
                  </div>
                  <div className="rounded-xl border border-line/60 bg-surface/50 p-3">
                    <p className="text-muted">Server Uptime</p>
                    <p className="font-mono font-semibold text-ink mt-0.5">
                      {Math.floor(overview.systemHealth.uptimeSeconds / 3600)}h{' '}
                      {Math.floor((overview.systemHealth.uptimeSeconds % 3600) / 60)}m
                    </p>
                  </div>
                  <div className="rounded-xl border border-line/60 bg-surface/50 p-3">
                    <p className="text-muted">Memory Heap Used</p>
                    <p className="font-mono font-semibold text-indigo-400 mt-0.5">
                      {overview.systemHealth.heapUsedMB} MB
                    </p>
                  </div>
                  <div className="rounded-xl border border-line/60 bg-surface/50 p-3">
                    <p className="text-muted">Total Heap Allocated</p>
                    <p className="font-mono font-semibold text-ink mt-0.5">
                      {overview.systemHealth.heapTotalMB} MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Departments Scorecard Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-ink">Academic Departments Governance</h3>
                  <button
                    onClick={() => setActiveTab('departments')}
                    className="text-xs text-primary hover:text-primary/80 font-medium cursor-pointer"
                  >
                    Manage All Departments →
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6">
                  {overview.departments.map((dept) => (
                    <div
                      key={dept._id}
                      className="rounded-2xl border border-line bg-panel p-5 shadow-sm hover:border-indigo-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-indigo-400">{dept.code}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                dept.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                            >
                              {dept.status}
                            </span>
                          </div>
                          <h4 className="font-semibold text-ink mt-1 text-sm">{dept.name}</h4>
                        </div>
                        <span className="text-[11px] font-semibold text-muted bg-surface px-2 py-0.5 rounded-lg border border-line">
                          {dept.programmeType}
                        </span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-line/60 flex items-center justify-between text-xs text-muted">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted">HOD</p>
                          <p className="font-medium text-ink mt-0.5">
                            {dept.hod ? dept.hod.name : <span className="text-amber-400">Unassigned</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-muted">Faculty / Students</p>
                          <p className="font-medium text-ink mt-0.5">
                            {dept.facultyCount} / {dept.studentCount}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Breakdown & Latest Audit Events */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Content Distribution */}
                <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-ink mb-4">Content & Assessment Repository</h3>
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted">Lecture Notes & Documents</span>
                        <span className="font-semibold text-ink">{overview.kpis.content.notes}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((overview.kpis.content.notes / (overview.kpis.content.total || 1)) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted">Learning Materials & Presentations</span>
                        <span className="font-semibold text-ink">{overview.kpis.content.materials}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((overview.kpis.content.materials / (overview.kpis.content.total || 1)) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted">Video Lectures</span>
                        <span className="font-semibold text-ink">{overview.kpis.content.videos}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((overview.kpis.content.videos / (overview.kpis.content.total || 1)) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-muted">Interactive Simulations</span>
                        <span className="font-semibold text-ink">{overview.kpis.content.simulations}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((overview.kpis.content.simulations / (overview.kpis.content.total || 1)) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Latest Audit Ticker */}
                <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-ink">Recent Audit Trail Activity</h3>
                    <button
                      onClick={() => setActiveTab('audit')}
                      className="text-xs text-primary hover:text-primary/80 font-medium cursor-pointer"
                    >
                      View All Logs →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {overview.recentAuditLogs.slice(0, 5).map((log) => (
                      <div
                        key={log._id}
                        className="flex items-start justify-between gap-3 p-2.5 rounded-xl border border-line/60 bg-surface/30 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink">
                              {log.user ? log.user.name : 'System Core'}
                            </span>
                            <span className="rounded bg-surface px-1.5 py-0.2 text-[10px] font-mono border border-line text-muted">
                              {log.action}
                            </span>
                          </div>
                          <p className="text-muted text-[11px] mt-0.5 line-clamp-1">
                            {log.entityType} {log.entityId ? `#${log.entityId.slice(-6)}` : ''}
                          </p>
                        </div>
                        <span className="text-[11px] text-muted whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 2. DEPARTMENT OVERVIEW TAB */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* PROGRAMME MANAGEMENT (central programme master) */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'programmes' && <ProgrammeManagementPanel />}

      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={departmentSearch}
                onChange={(e) => setDepartmentSearch(e.target.value)}
                placeholder="Search departments by code or name..."
                className="w-72 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <select
                value={departmentStatusFilter}
                onChange={(e) => setDepartmentStatusFilter(e.target.value as any)}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>

            <button
              onClick={() => {
                setDeptForm({ name: '', code: '', programmeType: 'UG', description: '', status: 'ACTIVE' });
                setShowCreateDeptModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all cursor-pointer shadow-sm"
            >
              + Create Department
            </button>
          </div>

          {/* Department Cards */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {overview?.departments
              .filter((d) => {
                const matchQuery =
                  d.name.toLowerCase().includes(departmentSearch.toLowerCase()) ||
                  d.code.toLowerCase().includes(departmentSearch.toLowerCase());
                const matchStatus =
                  departmentStatusFilter === 'ALL' ? true : d.status === departmentStatusFilter;
                return matchQuery && matchStatus;
              })
              .map((dept) => (
                <div
                  key={dept._id}
                  className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-4 hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-indigo-400">{dept.code}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                            dept.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {dept.status}
                        </span>
                        <span className="rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-semibold text-muted border border-line">
                          {dept.programmeType}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-ink mt-1.5">{dept.name}</h3>
                      {dept.description && (
                        <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">{dept.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-line/60 text-center text-xs">
                    <div className="p-2 rounded-xl bg-surface/60 border border-line/40">
                      <p className="text-muted text-[10px] uppercase font-bold">Faculty</p>
                      <p className="text-sm font-bold text-indigo-400 mt-0.5">{dept.facultyCount}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-surface/60 border border-line/40">
                      <p className="text-muted text-[10px] uppercase font-bold">Students</p>
                      <p className="text-sm font-bold text-emerald-400 mt-0.5">{dept.studentCount}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-surface/60 border border-line/40">
                      <p className="text-muted text-[10px] uppercase font-bold">Subjects</p>
                      <p className="text-sm font-bold text-amber-400 mt-0.5">{dept.subjectCount}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-surface/60 border border-line/40">
                      <p className="text-muted text-[10px] uppercase font-bold">Programmes</p>
                      <p className="text-sm font-bold text-sky-400 mt-0.5">{dept.programmeCount}</p>
                    </div>
                  </div>

                  {/* HOD & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-line/60">
                    <div className="text-xs">
                      <span className="text-muted">Head of Dept: </span>
                      {dept.hod ? (
                        <span className="font-semibold text-ink">
                          {dept.hod.name} ({dept.hod.identifier})
                        </span>
                      ) : (
                        <span className="font-semibold text-rose-400">Not Assigned</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingDept(dept);
                          setDeptForm({
                            name: dept.name,
                            code: dept.code,
                            programmeType: dept.programmeType,
                            description: dept.description || '',
                            status: dept.status,
                          });
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-line bg-surface text-muted hover:text-ink hover:bg-panel transition-all cursor-pointer"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => {
                          setAssignHodModal(dept);
                          setSelectedHodUserId(dept.hod?._id || '');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer"
                      >
                        Assign HOD
                      </button>

                      <button
                        onClick={() => handleToggleDepartmentStatus(dept)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          dept.status === 'ACTIVE'
                            ? 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                        }`}
                      >
                        {dept.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 3. FACULTY OVERVIEW TAB */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'faculty' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={facultySearch}
                onChange={(e) => {
                  setFacultySearch(e.target.value);
                  setFacultyPage(1);
                }}
                placeholder="Search by name, email, or employee ID..."
                className="w-64 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />

              <select
                value={facultyDeptFilter}
                onChange={(e) => {
                  setFacultyDeptFilter(e.target.value);
                  setFacultyPage(1);
                }}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
              >
                <option value="">All Departments</option>
                {overview?.departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>

              <select
                value={facultyApprovalFilter}
                onChange={(e) => {
                  setFacultyApprovalFilter(e.target.value);
                  setFacultyPage(1);
                }}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
              >
                <option value="">All Approval Status</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending Review</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={facultyAccountFilter}
                onChange={(e) => {
                  setFacultyAccountFilter(e.target.value);
                  setFacultyPage(1);
                }}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
              >
                <option value="">All Account Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <p className="text-xs text-muted">
              Total Faculty: <span className="font-semibold text-ink">{facultyData?.total || 0}</span>
            </p>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-line bg-panel overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-line">
                <thead className="bg-surface/50 text-muted font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Faculty Member</th>
                    <th className="py-3.5 px-4">Employee ID</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Courses</th>
                    <th className="py-3.5 px-4">Approval</th>
                    <th className="py-3.5 px-4">Account Status</th>
                    <th className="py-3.5 px-4 text-right">Privileged Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {facultyLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted">
                        Loading faculty records...
                      </td>
                    </tr>
                  ) : !facultyData?.faculty || facultyData.faculty.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted">
                        No faculty found matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    facultyData.faculty.map((member) => (
                      <tr key={member._id} className="hover:bg-surface/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-ink">{member.name}</p>
                          <p className="text-[11px] text-muted">{member.collegeEmail}</p>
                          <p className="text-[10px] text-indigo-400 font-medium">
                            {member.profile?.designation || 'Faculty'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-ink">{member.identifier}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs font-semibold text-indigo-400">
                            {member.department?.code || '—'}
                          </span>
                          <p className="text-[11px] text-muted line-clamp-1">{member.department?.name}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="rounded-full bg-surface border border-line px-2 py-0.5 text-xs font-semibold text-ink">
                            {member.assignmentsCount} active
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                              member.approvalStatus === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : member.approvalStatus === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {member.approvalStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                              member.accountStatus === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {member.accountStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() =>
                              setStatusChangeModal({
                                userId: member._id,
                                userName: member.name,
                                userRole: member.role,
                                currentStatus: member.accountStatus,
                                targetStatus: member.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              member.accountStatus === 'ACTIVE'
                                ? 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                            }`}
                          >
                            {member.accountStatus === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {facultyData && facultyData.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-line px-4 py-3 bg-surface/30">
                <span className="text-xs text-muted">
                  Page {facultyData.page} of {facultyData.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={facultyPage <= 1}
                    onClick={() => setFacultyPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-line bg-surface text-xs disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={facultyPage >= facultyData.totalPages}
                    onClick={() => setFacultyPage((p) => p + 1)}
                    className="px-3 py-1 rounded-lg border border-line bg-surface text-xs disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 4. STUDENT OVERVIEW TAB */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setStudentPage(1);
                }}
                placeholder="Search by student name, roll number, or email..."
                className="w-64 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />

              <select
                value={studentDeptFilter}
                onChange={(e) => {
                  setStudentDeptFilter(e.target.value);
                  setStudentPage(1);
                }}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
              >
                <option value="">All Departments</option>
                {overview?.departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>

              <select
                value={studentSemesterFilter === undefined ? '' : String(studentSemesterFilter)}
                onChange={(e) => {
                  setStudentSemesterFilter(e.target.value ? Number(e.target.value) : undefined);
                  setStudentPage(1);
                }}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
              >
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-muted">
              Total Students: <span className="font-semibold text-ink">{studentData?.total || 0}</span>
            </p>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-line bg-panel overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-line">
                <thead className="bg-surface/50 text-muted font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Roll Number</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Semester</th>
                    <th className="py-3.5 px-4">Enrolled Courses</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Privileged Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {studentLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted">
                        Loading student records...
                      </td>
                    </tr>
                  ) : !studentData?.students || studentData.students.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted">
                        No students found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    studentData.students.map((student) => (
                      <tr key={student._id} className="hover:bg-surface/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-ink">{student.name}</p>
                          <p className="text-[11px] text-muted">{student.collegeEmail}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-ink">{student.identifier}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs font-semibold text-indigo-400">
                            {student.department?.code || '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {student.activeEnrollment?.semesterNumber ? (
                            <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold">
                              Sem {student.activeEnrollment.semesterNumber} ({student.activeEnrollment.academicYear})
                            </span>
                          ) : (
                            <span className="text-muted text-[11px]">No Active Sem</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="rounded-full bg-surface border border-line px-2 py-0.5 text-xs font-medium text-ink">
                            {student.activeEnrollment?.enrolledSubjectsCount || 0} subjects
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                              student.accountStatus === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {student.accountStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() =>
                              setStatusChangeModal({
                                userId: student._id,
                                userName: student.name,
                                userRole: student.role,
                                currentStatus: student.accountStatus,
                                targetStatus: student.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              student.accountStatus === 'ACTIVE'
                                ? 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                            }`}
                          >
                            {student.accountStatus === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {studentData && studentData.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-line px-4 py-3 bg-surface/30">
                <span className="text-xs text-muted">
                  Page {studentData.page} of {studentData.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={studentPage <= 1}
                    onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-line bg-surface text-xs disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={studentPage >= studentData.totalPages}
                    onClick={() => setStudentPage((p) => p + 1)}
                    className="px-3 py-1 rounded-lg border border-line bg-surface text-xs disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 5. ACADEMIC ACTIVITY TAB */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          {activityLoading && !activityData ? (
            <div className="py-16 text-center text-xs text-muted">Aggregating live academic events...</div>
          ) : activityData ? (
            <>
              {/* Department Comparative Scorecard */}
              <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-ink mb-1">
                  Department Academic Engagement Scorecard
                </h3>
                <p className="text-xs text-muted mb-4">
                  Comparative index based on published resources, assessments, submissions, and attendance sessions.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs divide-y divide-line">
                    <thead className="bg-surface/50 text-muted font-semibold">
                      <tr>
                        <th className="py-3 px-3">Department</th>
                        <th className="py-3 px-3 text-center">Content Published</th>
                        <th className="py-3 px-3 text-center">Quizzes Active</th>
                        <th className="py-3 px-3 text-center">Assignments</th>
                        <th className="py-3 px-3 text-center">Attendance Sessions</th>
                        <th className="py-3 px-3 text-right">Activity Index</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {activityData.departmentScorecard.map((row) => (
                        <tr key={row.departmentId} className="hover:bg-surface/30">
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-indigo-400 mr-2">{row.code}</span>
                            <span className="font-medium text-ink">{row.name}</span>
                          </td>
                          <td className="py-3 px-3 text-center font-medium text-ink">{row.contentCount}</td>
                          <td className="py-3 px-3 text-center font-medium text-ink">{row.quizCount}</td>
                          <td className="py-3 px-3 text-center font-medium text-ink">{row.assignmentCount}</td>
                          <td className="py-3 px-3 text-center font-medium text-ink">{row.sessionCount}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                            {row.totalActivityIndex} pts
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Real-Time Live Activity Feeds */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Content Stream */}
                <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-ink mb-3">Recent Content Uploads</h3>
                  <div className="space-y-2.5">
                    {activityData.recentContent.map((c: any) => (
                      <div
                        key={c._id}
                        className="flex items-start justify-between gap-2 p-2.5 rounded-xl border border-line/50 bg-surface/30 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-ink">{c.title}</p>
                          <p className="text-[11px] text-muted">
                            {c.subject?.subjectCode} • By {c.teacher?.name || 'Faculty'}
                          </p>
                        </div>
                        <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-mono border border-line text-muted">
                          {c.contentType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submissions Stream */}
                <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-ink mb-3">Recent Student Submissions</h3>
                  <div className="space-y-2.5">
                    {activityData.recentSubmissions.map((s: any) => (
                      <div
                        key={s._id}
                        className="flex items-start justify-between gap-2 p-2.5 rounded-xl border border-line/50 bg-surface/30 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-ink">
                            {s.student?.name || 'Student'} ({s.student?.identifier})
                          </p>
                          <p className="text-[11px] text-muted">
                            {s.assignment?.title} • {s.assignment?.subject?.subjectCode}
                          </p>
                        </div>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                            s.isLate
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {s.isLate ? 'Late' : 'On Time'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* 6. AUDIT LOGS TAB */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => {
                  setAuditSearch(e.target.value);
                  setAuditPage(1);
                }}
                placeholder="Search audit trail by operator or entity..."
                className="w-64 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />

              <select
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
              >
                <option value="">All Action Types</option>
                <option value="ADMIN_ACTION">ADMIN_ACTION</option>
                <option value="ROLE_CHANGE">ROLE_CHANGE</option>
                <option value="USER_STATUS_CHANGE">USER_STATUS_CHANGE</option>
                <option value="REGISTRATION">REGISTRATION</option>
                <option value="APPROVAL">APPROVAL</option>
                <option value="REJECTION">REJECTION</option>
                <option value="CONTENT_PUBLISH">CONTENT_PUBLISH</option>
                <option value="QUIZ_CREATE">QUIZ_CREATE</option>
                <option value="QUIZ_SUBMIT">QUIZ_SUBMIT</option>
                <option value="ASSIGNMENT_CREATE">ASSIGNMENT_CREATE</option>
                <option value="ASSIGNMENT_SUBMIT">ASSIGNMENT_SUBMIT</option>
                <option value="GRADING">GRADING</option>
                <option value="LOGIN">LOGIN</option>
              </select>
            </div>

            <p className="text-xs text-muted">
              Logged Audit Records: <span className="font-semibold text-ink">{auditData?.total || 0}</span>
            </p>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-line bg-panel overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-line">
                <thead className="bg-surface/50 text-muted font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Operator / User</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Target Entity</th>
                    <th className="py-3.5 px-4">IP Address</th>
                    <th className="py-3.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 font-mono text-[11px]">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted font-sans text-xs">
                        Querying audit logs...
                      </td>
                    </tr>
                  ) : !auditData?.logs || auditData.logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted font-sans text-xs">
                        No audit records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    auditData.logs.map((log) => (
                      <tr key={log._id} className="hover:bg-surface/30 transition-colors">
                        <td className="py-3 px-4 text-muted whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {log.user ? (
                            <div>
                              <p className="font-semibold text-ink">{log.user.name}</p>
                              <p className="text-[10px] text-muted font-mono">
                                {log.user.identifier} ({log.user.role})
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted">System Agent</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                              log.action.includes('ADMIN') || log.action.includes('ROLE')
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                                : log.action.includes('APPROVAL') || log.action.includes('PUBLISH')
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                : 'bg-surface text-ink border-line'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-indigo-400 font-medium font-sans">{log.entityType}</span>
                          {log.entityId && (
                            <span className="text-muted ml-1 font-mono text-[10px]">
                              #{log.entityId.slice(-6)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted">{log.ipAddress || '127.0.0.1'}</td>
                        <td className="py-3 px-4 text-right font-sans">
                          <button
                            onClick={() => setSelectedAuditLog(log)}
                            className="px-2 py-0.5 rounded border border-border bg-card text-xs text-primary hover:bg-muted cursor-pointer font-medium"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {auditData && auditData.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-line px-4 py-3 bg-surface/30">
                <span className="text-xs text-muted">
                  Page {auditData.page} of {auditData.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-line bg-surface text-xs disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={auditPage >= auditData.totalPages}
                    onClick={() => setAuditPage((p) => p + 1)}
                    className="px-3 py-1 rounded-lg border border-line bg-surface text-xs disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 7: ACADEMIC STRUCTURE */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'structure' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Academic Structure & Hierarchy</h2>
              <p className="text-xs text-muted mt-0.5">
                Centralized architectural framework of degree programmes, departments, curriculum schemes, and regulations.
              </p>
            </div>
            <button
              onClick={() => handleTabChange('departments')}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm transition-all cursor-pointer"
            >
              Manage Departments →
            </button>
          </div>

          {/* Programmes & Regulation Schemes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-line bg-surface/30 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Degree Programme
              </span>
              <h3 className="text-sm font-bold text-ink">Undergraduate (UG)</h3>
              <p className="text-xs text-muted">
                4-Year B.E. / B.Tech programmes across 8 semesters with Choice Based Credit System (CBCS).
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface/30 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                Degree Programme
              </span>
              <h3 className="text-sm font-bold text-ink">Postgraduate (PG)</h3>
              <p className="text-xs text-muted">
                2-Year M.E. / M.Tech specialized master programmes across 4 semesters.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface/30 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                Curriculum Regulation
              </span>
              <h3 className="text-sm font-bold text-ink">Autonomous CBCS Roadmap</h3>
              <p className="text-xs text-muted">
                Academic Year 2024-2025 Autonomous Regulation Scheme with integrated outcome-based education.
              </p>
            </div>
          </div>

          {/* Department Breakdown Matrix */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Department Academic Matrix ({overview?.departments.length || 0} Units)
            </h3>
            {overview?.departments.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">No academic departments registered.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6">
                {overview?.departments.map((dept) => (
                  <div
                    key={dept._id}
                    className="rounded-xl border border-line bg-surface/30 p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {dept.code}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            dept.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-surface text-muted border border-line'
                          }`}
                        >
                          {dept.status}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-ink">{dept.name}</h4>
                      <p className="text-xs text-muted mt-1">
                        Programme: <span className="font-semibold text-ink">{dept.programmeType || 'UG'}</span>
                      </p>
                      {dept.hod && (
                        <p className="text-xs text-muted mt-0.5">
                          HOD: <span className="font-semibold text-ink">{dept.hod.name}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs text-muted">
                      <span>{dept.facultyCount || 0} Faculty</span>
                      <span>{dept.studentCount || 0} Students</span>
                      <span>{dept.subjectCount || 0} Subjects</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 8: SYSTEM SETTINGS */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-bold text-ink">Institutional Governance & System Settings</h2>
              <p className="text-xs text-muted mt-0.5">
                Centralized institution security policies, academic session parameters, and role-based authorizations.
              </p>
            </div>
            <Link
              to="/system-status"
              className="rounded-xl border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface/80 shadow-sm"
            >
              Live Health Telemetry →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Security & Authentication Policies */}
            <div className="rounded-xl border border-line bg-surface/30 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <span className="text-base">🛡️</span>
                <h3 className="text-sm font-bold text-ink">Authentication & Security Hardening</h3>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-line/40">
                  <span className="text-muted">Password Cryptography</span>
                  <span className="font-mono font-bold text-emerald-400">Bcrypt Cost 12 ✓</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-line/40">
                  <span className="text-muted">Access Token Lifespan</span>
                  <span className="font-mono font-bold text-ink">15 Minutes (Rotating)</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-line/40">
                  <span className="text-muted">Refresh Token Protection</span>
                  <span className="font-mono font-bold text-emerald-400">Rate Limited & Hashed ✓</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-line/40">
                  <span className="text-muted">Brute-Force Rate Limiting</span>
                  <span className="font-mono font-bold text-emerald-400">100 req / 15 min ✓</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted">Data Isolation & RBAC</span>
                  <span className="font-mono font-bold text-emerald-400">Strict Multi-Tenant Verified ✓</span>
                </div>
              </div>
            </div>

            {/* Academic Session Controls */}
            <div className="rounded-xl border border-line bg-surface/30 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <span className="text-base">🗓️</span>
                <h3 className="text-sm font-bold text-ink">Academic Session & Term Controls</h3>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-line/40">
                  <span className="text-muted">Active Academic Year</span>
                  <span className="font-mono font-bold text-indigo-400">2024-2025</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-line/40">
                  <span className="text-muted">Enrollment Approval Queue</span>
                  <span className="font-bold text-emerald-400">HOD Department Managed</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-line/40">
                  <span className="text-muted">Late Submission Enforcement</span>
                  <span className="font-mono text-ink">Strict Policy Configurable</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-line/40">
                  <span className="text-muted">Institutional Identity</span>
                  <span className="font-bold text-emerald-400">Eduverse • PiyushDhara</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted">Audit Trail Logging</span>
                  <span className="font-mono font-bold text-emerald-400">Cryptographic Trace Active ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ═════════════════════════════════════════════════════════════════════ */}

      {/* 1. Create Department Modal */}
      {showCreateDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Create Academic Department</h3>
              <button
                onClick={() => setShowCreateDeptModal(false)}
                className="text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-ink mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE, ECE, MECH"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Department Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science & Humanities (official B.E. programmes are managed in Programme Management)"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Programme Type</label>
                <select
                  value={deptForm.programmeType}
                  onChange={(e) => setDeptForm({ ...deptForm, programmeType: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink"
                >
                  <option value="UG">Undergraduate (UG)</option>
                  <option value="PG">Postgraduate (PG)</option>
                  <option value="PHD">Doctoral (PHD)</option>
                  <option value="INTEGRATED">Integrated</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Academic goals, discipline scope..."
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowCreateDeptModal(false)}
                  className="px-4 py-2 rounded-xl border border-line bg-surface text-muted hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDept}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                >
                  {submittingDept ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Department Modal */}
      {editingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Edit Department: {editingDept.code}</h3>
              <button
                onClick={() => setEditingDept(null)}
                className="text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateDepartment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-ink mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink"
                />
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Programme Type</label>
                <select
                  value={deptForm.programmeType}
                  onChange={(e) => setDeptForm({ ...deptForm, programmeType: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink"
                >
                  <option value="UG">Undergraduate (UG)</option>
                  <option value="PG">Postgraduate (PG)</option>
                  <option value="PHD">Doctoral (PHD)</option>
                  <option value="INTEGRATED">Integrated</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-ink mb-1">Description</label>
                <textarea
                  rows={3}
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2 rounded-xl border border-line bg-surface text-muted hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDept}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                >
                  {submittingDept ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Assign HOD Modal */}
      {assignHodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">
                Assign Head of Department: {assignHodModal.code}
              </h3>
              <button
                onClick={() => setAssignHodModal(null)}
                className="text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted">
              Select an approved faculty member from the faculty directory to appoint as Head of Department.
              Privileged role escalation will be recorded in the audit trail.
            </p>

            <form onSubmit={handleAssignHod} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-ink mb-1">Select Faculty Member</label>
                <input
                  type="text"
                  required
                  placeholder="Enter User ID of Faculty..."
                  value={selectedHodUserId}
                  onChange={(e) => setSelectedHodUserId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink font-mono"
                />
                <p className="text-[10px] text-muted mt-1">
                  You can copy the User ID from the Faculty Directory tab.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setAssignHodModal(null)}
                  className="px-4 py-2 rounded-xl border border-line bg-surface text-muted hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDept || !selectedHodUserId}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                >
                  {submittingDept ? 'Appointing...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Privileged User Status Modal */}
      {statusChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">
                Privileged Governance Action: Account Status
              </h3>
              <button
                onClick={() => setStatusChangeModal(null)}
                className="text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-700 dark:text-rose-300">
              <p className="font-semibold">⚠️ Privileged Audit Enforcement</p>
              <p className="mt-1 text-[11px] leading-relaxed">
                You are about to change the status of{' '}
                <strong className="text-ink">{statusChangeModal.userName}</strong> ({statusChangeModal.userRole})
                from <strong className="text-ink">{statusChangeModal.currentStatus}</strong> to{' '}
                <strong className="text-ink">{statusChangeModal.targetStatus}</strong>. Every state change is
                permanently recorded in the institution's audit logs.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-ink mb-1">Administrative Rationale / Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide explicit governance reason for this account status change..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setStatusChangeModal(null)}
                  className="px-4 py-2 rounded-xl border border-line bg-surface text-muted hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingStatus}
                  onClick={handleExecuteStatusChange}
                  className={`px-4 py-2 rounded-xl font-semibold text-white transition-all cursor-pointer ${
                    statusChangeModal.targetStatus === 'SUSPENDED'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {submittingStatus ? 'Executing...' : `Confirm ${statusChangeModal.targetStatus}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Audit Log Inspector Modal */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-panel p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <span className="rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 text-[10px] font-mono font-bold">
                  {selectedAuditLog.action}
                </span>
                <h3 className="text-sm font-bold text-ink mt-1">Audit Record Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-line/40">
                <span className="text-muted">Timestamp</span>
                <span className="font-mono text-ink">
                  {new Date(selectedAuditLog.timestamp).toISOString()}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-line/40">
                <span className="text-muted">Operator</span>
                <span className="font-semibold text-ink">
                  {selectedAuditLog.user ? `${selectedAuditLog.user.name} (${selectedAuditLog.user.role})` : 'System'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-line/40">
                <span className="text-muted">Target Entity</span>
                <span className="font-mono text-indigo-400">
                  {selectedAuditLog.entityType} {selectedAuditLog.entityId || ''}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-line/40">
                <span className="text-muted">IP Address</span>
                <span className="font-mono text-ink">{selectedAuditLog.ipAddress || '127.0.0.1'}</span>
              </div>

              <div>
                <span className="block text-muted mb-1 font-semibold">Payload & Details</span>
                <pre className="max-h-48 overflow-y-auto rounded-xl border border-line bg-surface p-3 font-mono text-[11px] text-muted whitespace-pre-wrap">
                  {JSON.stringify(selectedAuditLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-line">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-1.5 rounded-xl border border-line bg-surface text-xs text-muted hover:text-ink cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
