import { useState, useEffect } from 'react';
import { AcademicService } from '@/services/academic.service';
import { withSimulationPreset } from './launchSmartBoardSimulation';
import type { ISmartBoardSessionPayload } from '@/types/academic.types';

function getSimulationKey(simulation: any): string {
  const key = simulation?.simKey ?? simulation?.key ?? simulation?.type;
  return typeof key === 'string' ? key.trim() : '';
}

interface SmartBoardLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Array<{ _id: string; name: string; code: string }>;
  semesters: Array<{ _id: string; semesterNumber: number; academicYear: string; departmentId: string }>;
  subjects: Array<{
    _id: string;
    subjectName: string;
    subjectCode: string;
    departmentId: string;
    semesterNumber: number;
    credits?: number;
  }>;
  selectedDeptId?: string;
  selectedSemNum?: number | '';
  selectedSubjectId?: string;
  onSubjectChange?: (subjectId: string) => void;
  onSessionLaunched?: (session: ISmartBoardSessionPayload) => void;
  initialResource?: {
    type: 'ppt' | 'pdf' | 'sim' | 'notes';
    title: string;
    file?: string;
    simKey?: string;
    simulationContext?: Record<string, unknown>;
  };
}

export function SmartBoardLaunchModal({
  isOpen,
  onClose,
  departments,
  semesters,
  subjects,
  selectedDeptId: initialDeptId = '',
  selectedSemNum: initialSemNum = '',
  selectedSubjectId: initialSubId = '',
  onSubjectChange,
  onSessionLaunched,
  initialResource: externalInitialResource,
}: SmartBoardLaunchModalProps) {
  const [deptId, setDeptId] = useState<string>(initialDeptId);
  const [semNum, setSemNum] = useState<number | ''>(initialSemNum);
  const [subjectId, setSubjectId] = useState<string>(initialSubId);

  const [launchMode, setLaunchMode] = useState<'canvas' | 'ppt' | 'notes' | 'sim'>(
    externalInitialResource?.type === 'sim'
      ? 'sim'
      : externalInitialResource?.type === 'ppt'
      ? 'ppt'
      : externalInitialResource?.type === 'notes' || externalInitialResource?.type === 'pdf'
      ? 'notes'
      : 'canvas'
  );

  const [selectedSimKey, setSelectedSimKey] = useState<string>(
    externalInitialResource?.simKey || 'bst'
  );

  const [academicContext, setAcademicContext] = useState<any | null>(null);
  const simulationOptions = Array.isArray(academicContext?.simulations)
    ? academicContext.simulations
        .map((simulation: any) => ({ ...simulation, simKey: getSimulationKey(simulation) }))
        .filter((simulation: any) => simulation.simKey)
    : [];
  // Programme → Semester → Subject → Unit → Topic focus for the board
  const [focusUnit, setFocusUnit] = useState<number | ''>('');
  const [focusTopic, setFocusTopic] = useState<string>('');
  const [loadingContext, setLoadingContext] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Sync with prop changes when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialSubId) {
        const found = subjects.find((s) => s._id === initialSubId);
        if (found) {
          setSubjectId(found._id);
          if (found.departmentId) setDeptId(found.departmentId);
          if (found.semesterNumber) setSemNum(found.semesterNumber);
        } else {
          setSubjectId(initialSubId);
          if (initialDeptId) setDeptId(initialDeptId);
          if (initialSemNum) setSemNum(initialSemNum);
        }
      } else {
        if (initialDeptId) setDeptId(initialDeptId);
        if (initialSemNum) setSemNum(initialSemNum);
      }
      if (externalInitialResource) {
        if (externalInitialResource.type === 'sim') {
          setLaunchMode('sim');
          if (externalInitialResource.simKey) setSelectedSimKey(externalInitialResource.simKey);
        } else if (externalInitialResource.type === 'ppt') {
          setLaunchMode('ppt');
        } else if (externalInitialResource.type === 'notes' || externalInitialResource.type === 'pdf') {
          setLaunchMode('notes');
        }
      }
    }
  }, [isOpen, initialDeptId, initialSemNum, initialSubId, externalInitialResource, subjects]);

  // Available semesters and subjects based on selection
  const filteredSemesters = semesters.filter(
    (s) => !deptId || s.departmentId === deptId
  );
  const filteredSubjects = subjects.filter(
    (s) => (!deptId || s.departmentId === deptId) && (!semNum || s.semesterNumber === semNum)
  );

  // Ensure subjectId is valid among filtered
  useEffect(() => {
    if (filteredSubjects.length > 0 && (!subjectId || !filteredSubjects.some((s) => s._id === subjectId))) {
      const first = filteredSubjects[0];
      if (first) {
        setSubjectId(first._id);
        if (onSubjectChange) onSubjectChange(first._id);
      }
    }
  }, [filteredSubjects, subjectId, onSubjectChange]);

  // Fetch subject academic context for previews
  useEffect(() => {
    setFocusUnit('');
    setFocusTopic('');
    if (!subjectId) {
      setAcademicContext(null);
      return;
    }

    let isMounted = true;
    const fetchContext = async () => {
      try {
        setLoadingContext(true);
        const ctx = await AcademicService.getSmartBoardContext(subjectId);
        if (isMounted) setAcademicContext(ctx);
      } catch (err) {
        console.warn('Smart Board context fetch note:', err);
      } finally {
        if (isMounted) setLoadingContext(false);
      }
    };
    fetchContext();

    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  if (!isOpen) return null;

  const currentSubject = subjects.find((s) => s._id === subjectId);
  const currentDept = departments.find((d) => d._id === (currentSubject?.departmentId || deptId));

  const handleLaunch = async () => {
    if (!subjectId) {
      setLaunchError('Please select a subject to launch the Smart Board.');
      return;
    }

    try {
      setLaunching(true);
      setLaunchError(null);

      let initialRes = undefined;
      if (launchMode === 'sim') {
        if (externalInitialResource?.simKey === selectedSimKey) {
          initialRes = { ...externalInitialResource };
        } else {
          const sim = simulationOptions.find((s: any) => s.simKey === selectedSimKey) || {
            simKey: selectedSimKey,
            title: selectedSimKey.toUpperCase() + ' Simulation',
          };
          initialRes = { type: 'sim', title: sim.title, simKey: sim.simKey };
        }
      } else if (launchMode === 'ppt') {
        const firstPpt = academicContext?.presentations?.[0];
        initialRes = {
          type: 'ppt',
          title: firstPpt?.title || `${currentSubject?.subjectName || 'Lesson'} Presentation`,
          file: firstPpt?.attachments?.[0]?.url || 'presentation.pptx',
        };
      } else if (launchMode === 'notes') {
        const firstNote = academicContext?.notes?.[0];
        initialRes = {
          type: 'notes',
          title: firstNote?.title || `${currentSubject?.subjectName || 'Lecture'} Notes`,
          file: firstNote?.attachments?.[0]?.url || 'lecture-notes.pdf',
        };
      }

      const simulationTopic = typeof externalInitialResource?.simulationContext?.topic === 'string'
        ? externalInitialResource.simulationContext.topic
        : undefined;
      const resolvedTopic = focusTopic || simulationTopic;
      const focus = {
        ...(focusUnit ? { unitNumber: Number(focusUnit) } : {}),
        ...(resolvedTopic ? { topic: resolvedTopic } : {}),
      };
      const sessionResult = await AcademicService.createSmartBoardSession({
        subjectId,
        initialResource: initialRes,
        ...(Object.keys(focus).length ? { focus } : {}),
      });

      const effectiveSessionData = sessionResult.sessionData || (sessionResult as any);

      // Synchronize to storage for immediate Smart Board tab pickup
      try {
        localStorage.setItem(
          'eduverse_smartboard_active_session',
          JSON.stringify(effectiveSessionData)
        );
        sessionStorage.setItem(
          'eduverse_rbac_session',
          JSON.stringify(effectiveSessionData)
        );
      } catch (storageErr) {
        console.warn('Storage sync note:', storageErr);
      }

      // Also broadcast session init across tabs
      try {
        const syncChannel = new BroadcastChannel('eduverse_smartboard_sync');
        syncChannel.postMessage({
          type: 'SMARTBOARD_SESSION_STARTED',
          payload: effectiveSessionData,
          timestamp: Date.now(),
        });
      } catch (bcErr) {
        console.warn('BroadcastChannel notice:', bcErr);
      }

      if (onSessionLaunched) {
        onSessionLaunched(sessionResult);
      }

      const targetDeptName = currentDept?.name || effectiveSessionData?.department?.name || 'Department of Engineering';
      const targetDeptId = currentDept?._id || effectiveSessionData?.department?.id || '';
      const targetSubName = currentSubject?.subjectName || effectiveSessionData?.subject?.name || 'Academic Subject';
      const targetSubCode = currentSubject?.subjectCode || effectiveSessionData?.subject?.code || '';
      const targetSemNum = currentSubject?.semesterNumber || effectiveSessionData?.semester?.number || semNum || 1;
      const targetSemId = effectiveSessionData?.semesterId || (effectiveSessionData as any)?.semester?.id || (effectiveSessionData as any)?.semester?._id || '';
      const targetSection = effectiveSessionData?.sectionId || effectiveSessionData?.section || '';
      const targetTeacherName = effectiveSessionData?.userName || 'Faculty Member';
      const targetTeacherId = effectiveSessionData?.teacherId || '';

      const programmeCode =
        (effectiveSessionData as any)?.programme?.programmeId || (currentDept as any)?.code || '';
      const queryParams = new URLSearchParams({
        subjectId: subjectId,
        programmeId: programmeCode,
        programmeName: targetDeptName,
        ...(focusUnit ? { unitNumber: String(focusUnit) } : {}),
        ...(focusTopic ? { topic: focusTopic } : {}),
        departmentId: targetDeptId,
        departmentName: targetDeptName,
        department: targetDeptName,
        subjectName: targetSubName,
        subject: targetSubName,
        subjectCode: targetSubCode,
        semesterNumber: String(targetSemNum),
        semester: String(targetSemNum),
        semesterId: targetSemId,
        sectionId: targetSection,
        section: targetSection,
        teacherName: targetTeacherName,
        teacher: targetTeacherName,
        teacherId: targetTeacherId,
        sessionId: sessionResult.sessionId || '',
        token: sessionResult.token || '',
        role: effectiveSessionData?.role || 'teacher',
      });

      // Launch Smart Board in new tab with full inherited context
      const baseUrl = sessionResult.boardUrl || `/smartboard/index.html?${queryParams.toString()}`;
      // Put the chosen simulation in the URL so the board always opens it
      const targetUrl = initialRes && (initialRes as any).type === 'sim' && (initialRes as any).simKey
        ? withSimulationPreset(baseUrl, {
            subjectId,
            simKey: (initialRes as any).simKey,
            title: (initialRes as any).title || 'Simulation',
            simulationContext: (initialRes as any).simulationContext as any,
          })
        : baseUrl;
      window.open(targetUrl, '_blank');

      onClose();
    } catch (err: any) {
      setLaunchError(
        err?.response?.data?.message || err?.message || 'Failed to initialize Smart Board session.'
      );
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl rounded-2xl border border-indigo-500/30 bg-panel p-6 shadow-2xl space-y-5 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl shadow-md">
              🚀
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-ink">Launch PiyushDhara Smart Board</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Academic Portal Synced
                </span>
              </div>
              <p className="text-xs text-muted">
                Pre-authenticates and streams syllabus units, interactive simulations, and formulas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:text-ink hover:bg-surface transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {launchError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            ⚠️ {launchError}
          </div>
        )}

        {/* ─── CASCADING ACADEMIC SELECTORS ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface/50 p-4 rounded-xl border border-line">
          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">1. Programme</label>
            <select
              value={deptId}
              onChange={(e) => {
                setDeptId(e.target.value);
                setSemNum('');
              }}
              className="w-full rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Programmes</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">2. Semester</label>
            <select
              value={semNum}
              onChange={(e) => setSemNum(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Semesters</option>
              {filteredSemesters.map((s) => (
                <option key={s._id} value={s.semesterNumber}>
                  Semester {s.semesterNumber} ({s.academicYear})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted block mb-1">3. Subject</label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                if (onSubjectChange) onSubjectChange(e.target.value);
              }}
              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
            >
              {filteredSubjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.subjectCode} - {s.subjectName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── SUBJECT PROFILE & CONTEXT BADGES ─── */}
        {currentSubject && (
          <div className="rounded-xl border border-line bg-surface/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {currentSubject.subjectCode}
                </span>
                <span className="text-sm font-bold text-ink">{currentSubject.subjectName}</span>
              </div>
              <span className="text-[11px] font-medium text-muted">
                Sem {currentSubject.semesterNumber} • {currentDept?.name || academicContext?.programme?.name || 'Programme'}
              </span>
            </div>

            {/* 4. Unit / 5. Topic focus */}
            {(academicContext?.syllabusUnits?.length ?? 0) > 0 && (
              <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">4. Unit (optional)</label>
                  <select
                    value={focusUnit}
                    onChange={(e) => {
                      setFocusUnit(e.target.value ? Number(e.target.value) : '');
                      setFocusTopic('');
                    }}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Whole subject</option>
                    {(academicContext.syllabusUnits as any[]).map((u: any, i: number) => {
                      const n = Number(u.unitNumber ?? u.chapterNumber ?? i + 1);
                      return (
                        <option key={`${n}-${i}`} value={n}>
                          Unit {n}: {u.title}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">5. Topic (optional)</label>
                  <select
                    value={focusTopic}
                    onChange={(e) => setFocusTopic(e.target.value)}
                    disabled={!focusUnit}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">{focusUnit ? 'All topics in unit' : 'Select a unit first'}</option>
                    {((academicContext.syllabusUnits as any[]).find(
                      (u: any, i: number) => Number(u.unitNumber ?? u.chapterNumber ?? i + 1) === focusUnit
                    )?.topics ?? []).map((t: string) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-line/50 text-[11px]">
              <span className="text-muted">Academic Context {loadingContext ? '(Loading…)' : 'Ready'}:</span>
              <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-semibold">
                📐 {academicContext?.formulas?.length || 5} Formulas
              </span>
              <span className="bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded font-mono font-semibold">
                🔬 {academicContext?.simulations?.length || 4} Simulations
              </span>
              <span className="bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded font-mono font-semibold">
                📑 {academicContext?.syllabusUnits?.length || 5} Syllabus Units
              </span>
              <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono font-semibold">
                🤖 AI Query Grounding
              </span>
            </div>
          </div>
        )}

        {/* ─── INITIAL LAUNCH MODE SELECTOR ─── */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-ink uppercase tracking-wider block">
            Select Initial Workspace Mode:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => setLaunchMode('canvas')}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                launchMode === 'canvas'
                  ? 'border-indigo-500 bg-indigo-500/15 shadow-sm text-ink'
                  : 'border-line bg-surface/30 text-muted hover:text-ink hover:bg-surface'
              }`}
            >
              <div className="text-xl mb-1">🎨</div>
              <div className="text-xs font-bold text-ink">Clean Canvas</div>
              <div className="text-[10px] text-muted">Blank Whiteboard</div>
            </button>

            <button
              type="button"
              onClick={() => setLaunchMode('sim')}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                launchMode === 'sim'
                  ? 'border-sky-500 bg-sky-500/15 shadow-sm text-ink'
                  : 'border-line bg-surface/30 text-muted hover:text-ink hover:bg-surface'
              }`}
            >
              <div className="text-xl mb-1">🔬</div>
              <div className="text-xs font-bold text-ink">Simulation</div>
              <div className="text-[10px] text-muted">Interactive Widget</div>
            </button>

            <button
              type="button"
              onClick={() => setLaunchMode('ppt')}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                launchMode === 'ppt'
                  ? 'border-amber-500 bg-amber-500/15 shadow-sm text-ink'
                  : 'border-line bg-surface/30 text-muted hover:text-ink hover:bg-surface'
              }`}
            >
              <div className="text-xl mb-1">📊</div>
              <div className="text-xs font-bold text-ink">Presentation</div>
              <div className="text-[10px] text-muted">Slide Deck Presentation</div>
            </button>

            <button
              type="button"
              onClick={() => setLaunchMode('notes')}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                launchMode === 'notes'
                  ? 'border-emerald-500 bg-emerald-500/15 shadow-sm text-ink'
                  : 'border-line bg-surface/30 text-muted hover:text-ink hover:bg-surface'
              }`}
            >
              <div className="text-xl mb-1">📄</div>
              <div className="text-xs font-bold text-ink">Lecture Note</div>
              <div className="text-[10px] text-muted">PDF Annotation</div>
            </button>
          </div>
        </div>

        {/* If Simulation Mode Selected, allow choosing which simulation */}
        {launchMode === 'sim' && simulationOptions.length > 0 && (
          <div className="space-y-1.5 bg-sky-500/5 border border-sky-500/20 p-3 rounded-xl">
            <label className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
              Choose Subject Simulation to Auto-Load:
            </label>
            <select
              value={selectedSimKey}
              onChange={(e) => setSelectedSimKey(e.target.value)}
              className="w-full rounded-lg border border-sky-500/40 bg-panel px-3 py-1.5 text-xs font-semibold text-ink focus:outline-none"
            >
              {simulationOptions.map((sim: any) => (
                <option key={sim.simKey} value={sim.simKey}>
                  {sim.title} ({sim.simKey.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-line">
          <button
            onClick={onClose}
            className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-muted hover:text-ink transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleLaunch}
            disabled={launching || !subjectId}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:from-emerald-500 hover:to-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {launching ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Authorizing Session…</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Launch Smart Board Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
