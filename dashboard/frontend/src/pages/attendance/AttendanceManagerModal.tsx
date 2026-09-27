import { useState, useEffect } from 'react';
import { TrackingService } from '@/services/tracking.service';
import { useAuth } from '@/context/AuthContext';
import { useProgrammes } from '@/hooks/useProgrammes';
import type {
  AttendanceStatus,
  IEnrolledStudentForAttendance,
  IAttendanceSessionItem,
} from '@/types/academic.types';

interface AttendanceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttendanceSaved: () => void;
  initialSubjectId?: string;
  initialSubjectName?: string;
  initialSubjectCode?: string;
  initialDepartmentId?: string;
  initialSemesterId?: string;
  departments?: Array<{ _id: string; name: string; code: string }>;
  semesters?: Array<{ _id: string; semesterNumber: number; academicYear: string }>;
  subjects?: Array<{ _id: string; subjectName: string; subjectCode: string; department?: string; semester?: string }>;
}

export function AttendanceManagerModal({
  isOpen,
  onClose,
  onAttendanceSaved,
  initialSubjectId = '',
  initialSubjectName = '',
  initialSubjectCode = '',
  initialDepartmentId = '',
  initialSemesterId = '',
  departments = [],
  semesters = [],
  subjects = [],
}: AttendanceManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'mark' | 'history'>('mark');

  // Selection states
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(initialDepartmentId);
  const { user } = useAuth();
  const { findProgramme } = useProgrammes();
  const [selectedSemesterId, setSelectedSemesterId] = useState(initialSemesterId);
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [sessionDate, setSessionDate] = useState<string>(
    () => new Date().toISOString().split('T')[0] ?? ''
  );
  const [period, setPeriod] = useState(1);
  const [timeSlot, setTimeSlot] = useState('09:00 - 10:00 AM');
  const [topicCovered, setTopicCovered] = useState('');
  const [section, setSection] = useState('ALL');
  const [allowDuplicateSession, setAllowDuplicateSession] = useState(false);

  // Editing existing session state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Student roster state
  const [roster, setRoster] = useState<IEnrolledStudentForAttendance[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [existingSession, setExistingSession] = useState<IAttendanceSessionItem | null>(null);

  // History state
  const [historySessions, setHistorySessions] = useState<IAttendanceSessionItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyStats, setHistoryStats] = useState<{
    totalSessions: number;
    overallPercentage: number;
  } | null>(null);

  // Submitting state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search filter inside roster
  const [studentSearch, setStudentSearch] = useState('');

  // Pre-load roster when subject or date changes
  useEffect(() => {
    if (selectedSubjectId) {
      loadEnrolledStudents(selectedSubjectId, sessionDate);
    }
  }, [selectedSubjectId, sessionDate]);

  // Load history if history tab is selected
  useEffect(() => {
    if (activeTab === 'history' && selectedSubjectId) {
      loadHistory(selectedSubjectId);
    }
  }, [activeTab, selectedSubjectId]);

  const loadEnrolledStudents = async (subjectId: string, date: string) => {
    try {
      setLoadingRoster(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await TrackingService.getEnrolledStudentsForAttendance({
        subjectId,
        departmentId: selectedDepartmentId || undefined,
        semesterId: selectedSemesterId || undefined,
        date,
      });

      setRoster(res.enrolledStudents);
      setExistingSession(res.existingSession);
      setDuplicateWarning(res.duplicateMessage);

      // If existing session exists and not explicitly editing another session, preset editing session info
      if (res.existingSession) {
        setPeriod(res.existingSession.period);
        setTimeSlot(res.existingSession.timeSlot || '09:00 - 10:00 AM');
        setTopicCovered(res.existingSession.topicCovered || '');
        setSection(res.existingSession.section || 'ALL');
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to load enrolled students.');
    } finally {
      setLoadingRoster(false);
    }
  };

  const loadHistory = async (subjectId: string) => {
    try {
      setLoadingHistory(true);
      const res = await TrackingService.getAttendanceHistory({ subjectId, limit: 50 });
      setHistorySessions(res.sessions);
      setHistoryStats({
        totalSessions: res.stats.totalSessions,
        overallPercentage: res.stats.overallPercentage,
      });
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to fetch attendance history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Bulk mark all students with a specific status
  const handleBulkMark = (status: AttendanceStatus) => {
    setRoster((prev) => prev.map((s) => ({ ...s, status })));
  };

  // Mark single student status
  const handleStudentStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  // Update remarks for a student
  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRoster((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, remarks } : s))
    );
  };

  // Load a session from history for editing
  const handleEditPastSession = async (session: IAttendanceSessionItem) => {
    try {
      setLoadingRoster(true);
      setEditingSessionId(session._id);
      setSessionDate(new Date(session.date).toISOString().split('T')[0] ?? '');
      setPeriod(session.period);
      setTimeSlot(session.timeSlot || '09:00 - 10:00 AM');
      setTopicCovered(session.topicCovered || '');
      setSection(session.section || 'ALL');

      const { records } = await TrackingService.getAttendanceSessionById(session._id);
      const recordMap = new Map<string, any>();
      records.forEach((r) => recordMap.set(String(r.student._id), r));

      setRoster((prev) =>
        prev.map((student) => {
          const rec = recordMap.get(student.studentId);
          return {
            ...student,
            status: rec?.status || 'PRESENT',
            remarks: rec?.remarks || '',
          };
        })
      );

      setActiveTab('mark');
      setSuccessMessage(`Loaded session from ${new Date(session.date).toLocaleDateString()} for editing.`);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to load session details.');
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) {
      setErrorMessage('Please select a subject.');
      return;
    }
    if (roster.length === 0) {
      setErrorMessage('No enrolled students available to mark.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (editingSessionId) {
        // Edit existing attendance session
        await TrackingService.updateAttendanceSession(editingSessionId, {
          period,
          timeSlot,
          topicCovered,
          section,
          records: roster.map((s) => ({
            studentId: s.studentId,
            status: s.status,
            remarks: s.remarks,
          })),
        });
        setSuccessMessage('Attendance session updated successfully!');
      } else {
        // Record new attendance session
        await TrackingService.recordAttendanceSession({
          subjectId: selectedSubjectId,
          departmentId: selectedDepartmentId || undefined,
          semesterId: selectedSemesterId || undefined,
          date: sessionDate,
          period,
          timeSlot,
          topicCovered,
          section,
          allowDuplicateSession,
          records: roster.map((s) => ({
            studentId: s.studentId,
            status: s.status,
            remarks: s.remarks,
          })),
        });
        setSuccessMessage('Attendance session recorded successfully!');
      }

      onAttendanceSaved();
      // Reset edit state
      setEditingSessionId(null);
      setAllowDuplicateSession(false);

      // Reload roster with fresh statuses
      await loadEnrolledStudents(selectedSubjectId, sessionDate);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to record attendance. Please check inputs.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Filter roster by search
  const filteredRoster = roster.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Status counts in current roster
  const presentCount = roster.filter((s) => s.status === 'PRESENT' || s.status === 'OD').length;
  const absentCount = roster.filter((s) => s.status === 'ABSENT').length;
  const lateCount = roster.filter((s) => s.status === 'LATE').length;
  const excusedCount = roster.filter((s) => s.status === 'EXCUSED').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="flex flex-col h-[90vh] w-full max-w-5xl rounded-3xl border border-line bg-panel shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line bg-surface/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 text-xl border border-teal-500/20">
              📅
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">Academic Attendance Engine</h2>
                {editingSessionId && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                    Editing Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                {initialSubjectName ? `${initialSubjectName} (${initialSubjectCode})` : 'Select course and date to track attendance'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switchers */}
            <div className="flex rounded-xl bg-surface border border-line p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('mark')}
                className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                  activeTab === 'mark'
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Mark Attendance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Session History
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-line bg-surface p-2 text-muted hover:text-ink hover:bg-surface/80 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Notifications */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center justify-between">
              <span>⚠️ {errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center justify-between">
              <span>✅ {successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
                ✕
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 1: MARK ATTENDANCE */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'mark' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Context Selector Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl border border-line bg-surface/30">
                {/* Department */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Department
                  </label>
                  {departments.length > 0 ? (
                    <select
                      value={selectedDepartmentId}
                      onChange={(e) => setSelectedDepartmentId(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-teal-500 focus:outline-none"
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={
                        findProgramme(selectedDepartmentId)?.name ||
                        findProgramme((user as any)?.department)?.name ||
                        'Programme'
                      }
                      className="w-full rounded-xl border border-line bg-surface/50 px-3 py-2 text-xs text-muted"
                    />
                  )}
                </div>

                {/* Semester */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Semester
                  </label>
                  {semesters.length > 0 ? (
                    <select
                      value={selectedSemesterId}
                      onChange={(e) => setSelectedSemesterId(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-teal-500 focus:outline-none"
                    >
                      <option value="">Select Semester</option>
                      {semesters.map((s) => (
                        <option key={s._id} value={s._id}>
                          Semester {s.semesterNumber} ({s.academicYear})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value="Semester 4 (2024-2025)"
                      className="w-full rounded-xl border border-line bg-surface/50 px-3 py-2 text-xs text-muted"
                    />
                  )}
                </div>

                {/* Subject */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Subject
                  </label>
                  {subjects.length > 0 ? (
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-teal-500 focus:outline-none font-semibold"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((sub) => (
                        <option key={sub._id} value={sub._id}>
                          {sub.subjectCode} - {sub.subjectName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={initialSubjectCode || 'Course Subject'}
                      className="w-full rounded-xl border border-line bg-surface/50 px-3 py-2 text-xs text-ink font-semibold"
                    />
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Session Date
                  </label>
                  <input
                    type="date"
                    required
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Duplicate Session Alert Banner */}
              {duplicateWarning && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Existing Session Detected
                      </h4>
                      <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                        {duplicateWarning}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-amber-500/20 text-xs">
                    {existingSession && !editingSessionId && (
                      <button
                        type="button"
                        onClick={() => handleEditPastSession(existingSession)}
                        className="rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-500 cursor-pointer shadow"
                      >
                        ✏️ Edit Recorded Session (Period {existingSession.period})
                      </button>
                    )}

                    <label className="flex items-center gap-2 text-amber-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowDuplicateSession}
                        onChange={(e) => setAllowDuplicateSession(e.target.checked)}
                        className="rounded border-amber-400 text-teal-500 focus:ring-teal-400"
                      />
                      <span>Allow duplicate session for this date (e.g. extra class or lab hour)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Session Attributes (Period, Time, Topic, Section) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">Period (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value))}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">Time Slot</label>
                  <input
                    type="text"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    placeholder="09:00 - 10:00 AM"
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">Section</label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="ALL or A/B"
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">Topic Covered</label>
                  <input
                    type="text"
                    required
                    value={topicCovered}
                    onChange={(e) => setTopicCovered(e.target.value)}
                    placeholder="e.g. Unit 3: Graph Traversal Algorithms"
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Attendance Stats Counter & Bulk Bar */}
              <div className="rounded-2xl border border-line bg-surface/40 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Status Counters */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                      Present: {presentCount}
                    </span>
                    <span className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-400">
                      Absent: {absentCount}
                    </span>
                    <span className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                      Late: {lateCount}
                    </span>
                    <span className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
                      Excused: {excusedCount}
                    </span>
                    <span className="text-xs font-mono text-muted">
                      Total: {roster.length}
                    </span>
                  </div>

                  {/* Bulk Mark Options */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-bold text-muted uppercase mr-1">Bulk:</span>
                    <button
                      type="button"
                      onClick={() => handleBulkMark('PRESENT')}
                      className="rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 font-semibold text-emerald-400 cursor-pointer"
                    >
                      All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkMark('ABSENT')}
                      className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 font-semibold text-rose-400 cursor-pointer"
                    >
                      All Absent
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkMark('LATE')}
                      className="rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 font-semibold text-amber-400 cursor-pointer"
                    >
                      All Late
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkMark('EXCUSED')}
                      className="rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 font-semibold text-blue-400 cursor-pointer"
                    >
                      All Excused
                    </button>
                  </div>
                </div>

                {/* Search in Roster */}
                <div className="pt-2 border-t border-line/50">
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search enrolled students by name or roll number..."
                    className="w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink placeholder-muted focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Enrolled Students Roster Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Enrolled Students ({filteredRoster.length} of {roster.length})
                  </h4>
                  {editingSessionId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSessionId(null);
                        loadEnrolledStudents(selectedSubjectId, sessionDate);
                      }}
                      className="text-xs text-amber-400 hover:underline cursor-pointer"
                    >
                      Cancel editing & create new
                    </button>
                  )}
                </div>

                {loadingRoster ? (
                  <div className="py-12 text-center text-xs text-muted">Loading student roster...</div>
                ) : filteredRoster.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted border border-dashed border-line rounded-2xl">
                    No approved enrolled students found for this subject and term.
                  </div>
                ) : (
                  <div className="border border-line rounded-2xl overflow-hidden">
                    <div className="max-h-72 overflow-y-auto divide-y divide-line/40">
                      {filteredRoster.map((student) => (
                        <div
                          key={student.studentId}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-surface/30 gap-3"
                        >
                          <div className="min-w-48">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-teal-400">
                                {student.rollNumber}
                              </span>
                              <span className="text-xs font-semibold text-ink">{student.name}</span>
                            </div>
                            {student.collegeEmail && (
                              <p className="text-[11px] text-muted">{student.collegeEmail}</p>
                            )}
                          </div>

                          {/* Attendance Status Buttons: Present, Absent, Late, Excused */}
                          <div className="flex items-center gap-1.5">
                            {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const).map((st) => {
                              const isSelected = student.status === st;
                              let btnClass = 'bg-surface text-muted border-line hover:text-ink';
                              if (isSelected) {
                                if (st === 'PRESENT') btnClass = 'bg-emerald-600 text-white border-emerald-500 shadow';
                                if (st === 'ABSENT') btnClass = 'bg-rose-600 text-white border-rose-500 shadow';
                                if (st === 'LATE') btnClass = 'bg-amber-600 text-white border-amber-500 shadow';
                                if (st === 'EXCUSED') btnClass = 'bg-blue-600 text-white border-blue-500 shadow';
                              }

                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStudentStatusChange(student.studentId, st)}
                                  className={`rounded-lg border px-2.5 py-1 text-xs font-bold cursor-pointer transition-all ${btnClass}`}
                                >
                                  {st === 'PRESENT' && 'Present'}
                                  {st === 'ABSENT' && 'Absent'}
                                  {st === 'LATE' && 'Late'}
                                  {st === 'EXCUSED' && 'Excused'}
                                </button>
                              );
                            })}
                          </div>

                          {/* Remarks */}
                          <div className="sm:w-48">
                            <input
                              type="text"
                              value={student.remarks}
                              onChange={(e) => handleRemarksChange(student.studentId, e.target.value)}
                              placeholder="Remarks (optional)"
                              className="w-full rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] text-ink focus:border-teal-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-line flex items-center justify-between">
                <span className="text-xs text-muted">
                  {editingSessionId
                    ? 'Updating existing session records.'
                    : 'Submitting will lock this session record unless edited later.'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || roster.length === 0}
                    className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-500 shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {submitting
                      ? 'Saving Attendance...'
                      : editingSessionId
                      ? 'Update Session Records'
                      : 'Confirm & Record Attendance'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 2: SESSION HISTORY */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
                <div>
                  <h3 className="text-sm font-bold text-ink">Recorded Attendance Sessions</h3>
                  <p className="text-xs text-muted">
                    Full history of classroom sessions, periods, attendance rates, and topics
                  </p>
                </div>

                {historyStats && (
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-line bg-surface px-3 py-1.5 text-center">
                      <p className="text-[10px] uppercase font-bold text-muted">Total Sessions</p>
                      <p className="text-sm font-extrabold text-ink">{historyStats.totalSessions}</p>
                    </div>
                    <div className="rounded-xl border border-line bg-surface px-3 py-1.5 text-center">
                      <p className="text-[10px] uppercase font-bold text-muted">Average Rate</p>
                      <p className="text-sm font-extrabold text-teal-400">{historyStats.overallPercentage}%</p>
                    </div>
                  </div>
                )}
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-muted">Loading attendance history...</div>
              ) : historySessions.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted border border-dashed border-line rounded-2xl">
                  No attendance sessions recorded yet for this subject.
                </div>
              ) : (
                <div className="space-y-3">
                  {historySessions.map((s) => {
                    const present = s.presentCount || 0;
                    const total = s.totalStudents || 0;
                    const pct = total > 0 ? Math.round((present / total) * 100) : 100;

                    return (
                      <div
                        key={s._id}
                        className="rounded-2xl border border-line bg-surface/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-teal-500/40 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                              Period {s.period}
                            </span>
                            <span className="text-ink font-semibold">
                              {new Date(s.date).toLocaleDateString(undefined, {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span className="text-muted font-mono">• {s.timeSlot || '09:00 - 10:00 AM'}</span>
                            <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted border border-line">
                              Sec {s.section || 'ALL'}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-ink">{s.topicCovered || 'Syllabus Topic'}</h4>

                          <div className="flex items-center gap-3 text-[11px] text-muted pt-1">
                            <span className="text-emerald-400 font-semibold">{s.presentCount} Present</span>
                            <span className="text-rose-400 font-semibold">{s.absentCount} Absent</span>
                            {s.lateCount !== undefined && s.lateCount > 0 && (
                              <span className="text-amber-400 font-semibold">{s.lateCount} Late</span>
                            )}
                            {s.excusedCount !== undefined && s.excusedCount > 0 && (
                              <span className="text-blue-400 font-semibold">{s.excusedCount} Excused</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted">Attendance Rate</p>
                            <p className={`text-base font-extrabold ${pct >= 75 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {pct}%
                            </p>
                            <p className="text-[10px] text-muted">
                              {present} / {total} students
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleEditPastSession(s)}
                            className="rounded-xl border border-line bg-surface hover:bg-teal-500/10 hover:border-teal-500/30 px-3 py-2 text-xs font-bold text-ink hover:text-teal-700 dark:hover:text-teal-300 transition-all cursor-pointer shadow"
                          >
                            ✏️ Edit Records
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
