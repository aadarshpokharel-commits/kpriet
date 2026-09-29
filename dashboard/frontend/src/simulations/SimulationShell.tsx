/**
 * SimulationShell — Standardized Simulation Presentation Wrapper
 *
 * Wraps the existing canvas-based simulation engine in the Eduverse
 * "Operating Systems Simulation Library" shell UI:
 *   • Header with breadcrumb, subject identity, Fullscreen, Smart Board, Close
 *   • Control bar: Curriculum Unit selector, Simulation Topic selector,
 *     Play/Pause, Previous, Next Step, Reset, Speed
 *   • Main area: Left = canvas + metrics HUD, Right = Algorithmic Logic +
 *     Performance Metrics + tabbed sidebar (Parameters / Theory / AI)
 *   • Status bar at bottom
 *   • Light / Dark theme toggle
 *
 * This component is PURELY a presentation wrapper.
 * It does NOT rewrite simulation logic — it delegates all canvas/engine work
 * to the existing engine.createInitialState / update / render cycle.
 */
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type {
  ISimulationDefinition,
  IAssignedSimulation,
  ISimulationLaunchContext,
} from './types';
import { getDomainColor } from './types';
import {
  askSimulationAi,
  getDefaultQuestions,
  getContextualQuestions,
  normalizeSimulationContext,
  type ISimulationAiResponse,
} from './simulation-ai-context';

/* ─────────────────────────── theme system ──────────────────────── */

type ShellTheme = 'dark' | 'light';

/**
 * Semantic colour tokens resolved per theme.
 * Every UI element reads from `t` — never from hardcoded slate-xxx.
 */
function themeTokens(theme: ShellTheme) {
  const dark = theme === 'dark';
  return {
    // ── root ──
    rootBg:        dark ? 'bg-slate-950'       : 'bg-white',
    rootText:      dark ? 'text-slate-100'      : 'text-slate-800',
    rootBorder:    dark ? 'border-slate-800'     : 'border-slate-200',
    // ── header / status ──
    headerBg:      dark ? 'bg-slate-900/90'      : 'bg-slate-50/95',
    headerBorder:  dark ? 'border-slate-800'     : 'border-slate-200',
    // ── control bar ──
    ctrlBg:        dark ? 'bg-slate-900/60'      : 'bg-slate-100/80',
    ctrlBorder:    dark ? 'border-slate-800/80'  : 'border-slate-200',
    // ── canvas area ──
    canvasBg:      dark ? 'bg-black'             : 'bg-slate-100',
    canvasLabelBg: '',
    // ── sidebar ──
    sidebarBg:     dark ? 'bg-slate-900/95'      : 'bg-white',
    sidebarBorder: dark ? 'border-slate-800'     : 'border-slate-200',
    tabBarBg:      dark ? 'bg-slate-950/60'      : 'bg-slate-50',
    tabActive:     dark ? 'border-indigo-500 text-indigo-400 bg-slate-900/50' : 'border-indigo-600 text-indigo-600 bg-indigo-50/60',
    tabInactive:   dark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-700',
    // ── surfaces ──
    surfaceBg:     dark ? 'bg-slate-800'         : 'bg-slate-100',
    surfaceBorder: dark ? 'border-slate-700'     : 'border-slate-300',
    surfaceHover:  dark ? 'hover:bg-slate-700'   : 'hover:bg-slate-200',
    surfaceDeep:   dark ? 'bg-slate-950'         : 'bg-slate-50',
    surfaceDeepBg: dark ? 'bg-slate-950/80'      : 'bg-slate-50/80',
    surfaceCard:   dark ? 'bg-slate-900/85'      : 'bg-white/90',
    surfaceCardBorder: dark ? 'border-slate-700/80' : 'border-slate-200',
    // ── text ──
    textPrimary:   dark ? 'text-slate-100'       : 'text-slate-900',
    textSecondary: dark ? 'text-slate-200'       : 'text-slate-700',
    textMuted:     dark ? 'text-slate-400'       : 'text-slate-500',
    textDimmed:    dark ? 'text-slate-500'       : 'text-slate-400',
    textAccent:    dark ? 'text-indigo-400'       : 'text-indigo-600',
    textAccent2:   dark ? 'text-indigo-300'       : 'text-indigo-700',
    // ── inputs ──
    inputBg:       dark ? 'bg-slate-800'         : 'bg-white',
    inputBorder:   dark ? 'border-slate-700'     : 'border-slate-300',
    inputText:     dark ? 'text-slate-200'       : 'text-slate-800',
    inputFocus:    'focus:ring-2 focus:ring-indigo-500',
    inputDeepBg:   dark ? 'bg-slate-950'         : 'bg-slate-50',
    // ── buttons ──
    btnSecondary:  dark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                       : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300',
    btnClose:      dark ? 'text-slate-500 hover:text-white hover:bg-slate-800'
                       : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100',
    // ── dividers ──
    divider:       dark ? 'bg-slate-800'         : 'bg-slate-200',
    // ── metrics HUD ──
    hudBg:         dark ? 'bg-slate-900/85 backdrop-blur-md border-slate-700/80'
                       : 'bg-white/90 backdrop-blur-md border-slate-200 shadow-md',
    hudLabel:      dark ? 'text-slate-400'       : 'text-slate-500',
    hudBadge:      dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600',
    // ── AI tab ──
    aiContextBg:   dark ? 'bg-slate-950/80 border-indigo-500/30'
                       : 'bg-indigo-50/60 border-indigo-200',
    aiContextLabel:dark ? 'text-indigo-300'      : 'text-indigo-700',
    aiContextBadge:dark ? 'bg-indigo-950 text-indigo-300 border-indigo-800/40'
                       : 'bg-indigo-100 text-indigo-700 border-indigo-200',
    aiBtnBg:       dark ? 'bg-slate-800/80 hover:bg-indigo-950/60 border-slate-700 hover:border-indigo-500/60 text-slate-200'
                       : 'bg-white hover:bg-indigo-50 border-slate-200 hover:border-indigo-400 text-slate-700',
    aiCtxBtnBg:    dark ? 'bg-indigo-950/40 hover:bg-indigo-900/50 border-indigo-800/50 hover:border-indigo-500/70 text-indigo-200'
                       : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 hover:border-indigo-400 text-indigo-700',
    aiLoadBg:      dark ? 'bg-slate-950/90 border-indigo-500/40'
                       : 'bg-indigo-50 border-indigo-200',
    aiLoadText:    dark ? 'text-indigo-300'      : 'text-indigo-700',
    aiLoadSub:     dark ? 'text-slate-400'       : 'text-slate-500',
    aiSpinner:     dark ? 'border-indigo-400 border-t-transparent'
                       : 'border-indigo-600 border-t-transparent',
    aiErrorBg:     dark ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                       : 'bg-rose-50 border-rose-200 text-rose-700',
    aiResponseBg:  dark ? 'bg-slate-950/90 border-slate-700/80'
                       : 'bg-white border-slate-200',
    aiResponseBorder: dark ? 'border-slate-800'  : 'border-slate-200',
    aiAnswerBg:    dark ? 'bg-slate-900 border-slate-800 text-slate-100'
                       : 'bg-slate-50 border-slate-200 text-slate-900',
    aiExplText:    dark ? 'text-slate-300'       : 'text-slate-600',
    aiExtrText:    dark ? 'text-slate-400'       : 'text-slate-500',
    // ── formula bar ──
    formulaBg:     dark ? 'bg-slate-900/60 border-slate-800/80'
                       : 'bg-slate-50/80 border-slate-200',
    formulaText:   dark ? 'text-slate-300'       : 'text-slate-600',
    // ── unit badges ──
    unitBadgeBg:   dark ? 'bg-indigo-950 text-indigo-300'
                       : 'bg-indigo-100 text-indigo-700',
    // ── checkboxes / booleans ──
    boolCard:      dark ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                       : 'bg-slate-50 border-slate-200 hover:bg-slate-100',
    // ── status bar ──
    statusBg:      dark ? 'bg-slate-900/80 border-slate-800'
                       : 'bg-slate-50/90 border-slate-200',
    playDot:       'bg-emerald-500 animate-pulse',
    pauseDot:      dark ? 'bg-slate-500'         : 'bg-slate-400',
    // ── speed selector ──
    speedActive:   'bg-indigo-600 text-white font-bold',
    speedInactive: dark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800',
    // ── copy button ──
    copyBtn:       dark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800',
    // ── success badge ──
    successText:   'text-emerald-400',
    // ── slider ──
    sliderTrack:   dark ? 'bg-slate-800'         : 'bg-slate-200',
  };
}

/* ─────────────────────────── props ─────────────────────────────── */

interface SimulationShellProps {
  /** The simulation to display — all metadata + engine come from here. */
  definition: ISimulationDefinition;
  initialParams?: Record<string, any>;
  assignedSimulation?: IAssignedSimulation | null;
  subject?: {
    _id: string;
    subjectName: string;
    subjectCode: string;
    department?: any;
    semester?: any;
  } | null;
  /** All simulations for the same subject (used to populate the topic selector). */
  siblingSimulations?: ISimulationDefinition[];
  /** Callback when the user picks a different simulation from the topic dropdown. */
  onSelectSimulation?: (sim: ISimulationDefinition) => void;
  onClose?: () => void;
  onLaunchSmartBoard?: (
    simKey: string,
    title: string,
    context?: ISimulationLaunchContext
  ) => void;
  /** Optional direct preview URL for iframe-based engines (Smart Board pages like ma, ep, chem, ee, cn, os, etc.) */
  iframeUrl?: string | null;
}

/* ─────────────────────────── helpers ───────────────────────────── */

function domainLabel(domain: string): string {
  return domain.replace(/_/g, ' ');
}

/* ─────────────────────────── component ─────────────────────────── */

export const SimulationShell: React.FC<SimulationShellProps> = ({
  definition,
  initialParams,
  assignedSimulation,
  subject,
  siblingSimulations = [],
  onSelectSimulation,
  onClose,
  onLaunchSmartBoard,
  iframeUrl,
}) => {
  /* ── simulation engine state ── */
  const [params, setParams] = useState<Record<string, any>>(() => {
    const defs: Record<string, any> = {};
    for (const p of definition.parameters) defs[p.key] = p.default;
    return {
      ...defs,
      ...(assignedSimulation?.simulationConfig?.initialParams || {}),
      ...(initialParams || {}),
    };
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [stepIndex, setStepIndex] = useState(0);
  const [metricsValues, setMetricsValues] = useState<Record<string, string>>({});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simStateRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  /* ── iframe engine mode ── */
  const effectiveIframeUrl = useMemo(() => {
    if (iframeUrl) return iframeUrl;
    if (!definition.boardEngine) return null;
    const extra: Record<string, string> = { sim: definition.id, preview: '1' };
    if (definition.unit) extra.unit = String(definition.unit);
    if (definition.title) extra.title = definition.title;
    if (definition.topic) extra.topic = definition.topic;

    const query = new URLSearchParams({
      subjectId: subject?._id || '',
      subjectName: subject?.subjectName || '',
      subjectCode: subject?.subjectCode || '',
      departmentName: (subject?.department as any)?.name || '',
      departmentId: String((subject?.department as any)?._id || ''),
      semesterId: String((subject?.semester as any)?._id || ''),
      semesterNumber: String((subject?.semester as any)?.semesterNumber || 1),
      ...extra,
    }).toString();

    const page =
      definition.boardEngine === 'chem' || definition.id.startsWith('chem-')
        ? 'chem-simulation.html'
        : definition.boardEngine === 'ee'
        ? 'ee-simulation.html'
        : definition.boardEngine === 'ma'
        ? 'ma-simulation.html'
        : definition.boardEngine === 'eg'
        ? 'eg-simulation.html'
        : definition.boardEngine === 'ep'
        ? 'ep-simulation.html'
        : definition.boardEngine === 'cn'
        ? 'cn-simulation.html'
        : definition.boardEngine === 'os'
        ? 'os-simulation.html'
        : definition.boardEngine === 'pdc'
        ? 'pdc-simulation.html'
        : definition.boardEngine === 'ecg'
        ? 'ecg-simulation.html'
        : 'ma-simulation.html';

    return `/smartboard/${page}?${query}`;
  }, [iframeUrl, definition, subject]);

  const isIframeMode = Boolean(effectiveIframeUrl);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  /* ── shell state ── */
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'theory' | 'ai'>('controls');
  const shellRef = useRef<HTMLDivElement | null>(null);

  /* ── theme state with persistence ── */
  const [theme, setTheme] = useState<ShellTheme>(() => {
    try {
      return (localStorage.getItem('eduverse_sim_theme') as ShellTheme) || 'dark';
    } catch {
      return 'dark';
    }
  });
  const t = useMemo(() => themeTokens(theme), [theme]);
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('eduverse_sim_theme', next);
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({
          type: 'EDUVERSE_SET_THEME',
          theme,
        }, '*');
      } catch {}
    }
  }, [theme]);

  /* ── AI state ── */
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<ISimulationAiResponse | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  /* ── re-init when definition changes ── */
  useEffect(() => {
    const defs: Record<string, any> = {};
    for (const p of definition.parameters) defs[p.key] = p.default;
    setParams({
      ...defs,
      ...(assignedSimulation?.simulationConfig?.initialParams || {}),
      ...(initialParams || {}),
    });
    setStepIndex(0);
    setMetricsValues({});
    simStateRef.current = null;
  }, [definition, assignedSimulation, initialParams]);

  /* ── reset helper ── */
  const resetSimulation = useCallback(() => {
    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 800;
    const h = canvas ? canvas.height : 500;
    if (definition.engine.reset) {
      simStateRef.current = definition.engine.reset(params, w, h);
    } else {
      simStateRef.current = definition.engine.createInitialState(params, w, h);
    }
    setStepIndex(0);
  }, [definition, params]);

  /* ── animation loop ── */
  useEffect(() => {
    if (isIframeMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    if (!simStateRef.current) {
      simStateRef.current = definition.engine.createInitialState(params, w, h);
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const rawDt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const dt = Math.min(rawDt, 0.1) * (isPlaying ? speedMultiplier : 0);

      if (simStateRef.current) {
        simStateRef.current = definition.engine.update(
          simStateRef.current, params, dt, w, h
        );
        ctx.clearRect(0, 0, w, h);
        definition.engine.render(ctx, w, h, simStateRef.current, params);

        const computed: Record<string, string> = {};
        for (const m of definition.metrics) {
          computed[m.id] = m.format(simStateRef.current, params);
        }
        setMetricsValues(computed);

        // auto-advance step index from state if available
        const st = simStateRef.current as any;
        if (st?.currentStep != null) setStepIndex(st.currentStep);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [definition, isPlaying, speedMultiplier, params, isIframeMode]);

  /* ── single-step forward ── */
  const handleStep = () => {
    if (isIframeMode) return;
    const canvas = canvasRef.current;
    if (!canvas || !simStateRef.current) return;
    const rect = canvas.getBoundingClientRect();
    simStateRef.current = definition.engine.update(
      simStateRef.current, params, 0.03 * speedMultiplier, rect.width, rect.height
    );
    setStepIndex((s) => s + 1);
  };

  /* ── param change ── */
  const handleParamChange = (key: string, value: any) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  /* ── AI context ── */
  const simContext = useMemo(() => normalizeSimulationContext({
    subject: subject?.subjectName,
    subjectCode: subject?.subjectCode,
    unit: definition.unit || 1,
    unitTitle: definition.unitTitle || (definition.unit ? `Unit ${definition.unit}` : 'Unit 1'),
    topic: definition.topic || definition.title,
    simulation: assignedSimulation?.title || definition.title,
    simulationId: definition.id,
    parameters: params,
    outputs: metricsValues,
    formulas: definition.formulaOverview,
    curriculumContext: definition.detailedDescription,
  }), [subject, definition, assignedSimulation, params, metricsValues]);

  const defaultQuestions = useMemo(() => getDefaultQuestions(simContext), [simContext]);
  const contextualQuestions = useMemo(() => getContextualQuestions(simContext), [simContext]);

  const handleAskAi = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await askSimulationAi(trimmed, simContext);
      setAiResponse(res);
      setAiQuestion('');
    } catch (err: any) {
      setAiError(err?.message || 'Failed to fetch AI answer.');
    } finally {
      setAiLoading(false);
    }
  };

  /* ── fullscreen toggle ── */
  const toggleFullscreen = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  /* ── derived: sibling unit/topic navigation ── */
  const units = useMemo(() => {
    const unitNums = Array.from(
      new Set(siblingSimulations.map((s) => s.unit).filter((u) => u != null))
    ).sort((a, b) => (a as number) - (b as number));
    return unitNums.map((u) => ({
      value: String(u),
      label: `Unit ${u}: ${siblingSimulations.find((s) => s.unit === u)?.unitTitle || ''}`,
      sims: siblingSimulations.filter((s) => s.unit === u),
    }));
  }, [siblingSimulations]);

  const currentUnitSims = useMemo(() => {
    if (definition.unit == null) return siblingSimulations;
    return siblingSimulations.filter((s) => s.unit === definition.unit);
  }, [siblingSimulations, definition.unit]);

  /* ── domain styling ── */
  const domainColors = getDomainColor(definition.domain);

  /* ── pseudocode lines ── */
  const pseudocodeLines = useMemo(() => {
    if (definition.learningObjectives?.length) {
      return definition.learningObjectives.slice(0, 6);
    }
    return [
      'Initialize algorithm data structures',
      'Fetch next pending request/process',
      'Evaluate scheduling/allocation condition',
      'Execute operation and update metrics',
    ];
  }, [definition]);

  /* ── Smart Board launch ── */
  const handleSmartBoard = () => {
    if (onLaunchSmartBoard) {
      onLaunchSmartBoard(
        definition.smartboardPresetKey || definition.id,
        assignedSimulation?.title || definition.title
      );
    } else {
      const q = new URLSearchParams({
        subjectId: subject?._id || '',
        subjectName: subject?.subjectName || '',
        subjectCode: subject?.subjectCode || '',
        departmentName: (subject as any)?.department?.name || '',
        semesterNumber: String((subject as any)?.semester?.semesterNumber || 1),
        preset: definition.smartboardPresetKey || definition.id,
        title: assignedSimulation?.title || definition.title,
      });
      window.open(`/smartboard/index.html?${q.toString()}`, '_blank');
    }
  };

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div
      ref={shellRef}
      className={`flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-colors duration-300 ${t.rootBg} ${t.rootText} border ${t.rootBorder} ${
        isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : 'h-full w-full'
      }`}
    >
      {/* ═══════════════════════════════════════════════════
          HEADER BAND
          ═══════════════════════════════════════════════════ */}
      <div className={`flex-shrink-0 backdrop-blur-md border-b px-5 py-3.5 ${t.headerBg} ${t.headerBorder}`}>
        <div className="flex items-start justify-between gap-4">
          {/* Left: icon + breadcrumb + title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-inner border ${t.surfaceBg} ${t.surfaceBorder}`}>
              {definition.icon}
            </div>
            <div className="min-w-0">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${t.textAccent}`}>
                  EDUVERSE
                </span>
                {subject && (
                  <>
                    <span className={`text-[10px] ${t.textDimmed}`}>·</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${t.textAccent} truncate max-w-[14rem]`}>
                      {subject.subjectName.toUpperCase()} LABORATORY
                    </span>
                  </>
                )}
              </div>
              {/* Main title */}
              <h2 className={`text-lg font-extrabold leading-tight mt-0.5 truncate max-w-[32rem] ${t.textPrimary}`}>
                {subject?.subjectName || definition.title} Simulation Library
              </h2>
              {/* Subtitle */}
              <p className={`text-[11px] mt-0.5 truncate max-w-[36rem] ${t.textMuted}`}>
                Interactive visualization of {domainLabel(definition.domain).toLowerCase()} concepts.
              </p>
              {/* Current sim breadcrumb */}
              {(definition.unit != null || definition.topic) && (
                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                  {definition.unit != null && (
                    <span className={`text-[11px] font-semibold ${t.textAccent}`}>
                      Unit {definition.unit}: {definition.unitTitle}
                    </span>
                  )}
                  {definition.unit != null && definition.topic && (
                    <span className={`text-[11px] ${t.textDimmed}`}>·</span>
                  )}
                  {definition.topic && (
                    <span className={`text-[11px] font-semibold ${t.textAccent}`}>
                      {definition.topic}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: meta + actions */}
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            {subject && (
              <span className={`text-[11px] font-mono ${t.textMuted}`}>
                {subject.subjectCode}
                {(subject as any)?.semester?.semesterNumber
                  ? ` · Sem ${(subject as any).semester.semesterNumber}`
                  : ''}
              </span>
            )}
            <div className="flex items-center gap-2">
              {/* ── THEME TOGGLE ── */}
              <button
                onClick={toggleTheme}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 cursor-pointer border ${t.btnSecondary}`}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <span className="text-base leading-none transition-transform duration-300" style={{ display: 'inline-block', transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                  {isDark ? '☀️' : '🌙'}
                </span>
                <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
              </button>
              <button
                onClick={toggleFullscreen}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${t.btnSecondary}`}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? '⊠ Exit' : '⊞ Fullscreen'}
              </button>
              <button
                onClick={handleSmartBoard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition cursor-pointer"
                title="Open in Smart Board"
              >
                🖥 Open in Smart Board
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition cursor-pointer ${t.btnClose}`}
                  title="Close"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          CONTROL BAR
          ═══════════════════════════════════════════════════ */}
      <div className={`flex-shrink-0 flex flex-wrap items-center gap-3 px-5 py-2.5 border-b ${t.ctrlBg} ${t.ctrlBorder}`}>
        {/* Curriculum Unit dropdown */}
        {units.length > 0 && (
          <div className="flex items-center gap-2">
            <label className={`text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap ${t.textMuted}`}>
              Curriculum Unit
            </label>
            <select
              value={String(definition.unit ?? '')}
              onChange={(e) => {
                const u = Number(e.target.value);
                const first = siblingSimulations.find((s) => s.unit === u);
                if (first && onSelectSimulation) onSelectSimulation(first);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border ${t.inputBg} ${t.inputBorder} ${t.inputText} focus:outline-none ${t.inputFocus} cursor-pointer`}
            >
              {units.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Simulation Topic dropdown */}
        {currentUnitSims.length > 1 && (
          <div className="flex items-center gap-2">
            <label className={`text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap ${t.textMuted}`}>
              Simulation Topic
            </label>
            <select
              value={definition.id}
              onChange={(e) => {
                const sim = currentUnitSims.find((s) => s.id === e.target.value);
                if (sim && onSelectSimulation) onSelectSimulation(sim);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border ${t.inputBg} ${t.inputBorder} ${t.inputText} focus:outline-none ${t.inputFocus} cursor-pointer max-w-[16rem]`}
            >
              {currentUnitSims.map((s) => (
                <option key={s.id} value={s.id}>{s.icon} {s.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Controls: Iframe Navigation or Canvas Playback */}
        {isIframeMode ? (
          <div className="flex items-center gap-2">
            {/* Previous Topic */}
            {currentUnitSims.length > 1 && (
              <button
                onClick={() => {
                  const idx = currentUnitSims.findIndex((s) => s.id === definition.id);
                  const previous = idx > 0 ? currentUnitSims[idx - 1] : undefined;
                  if (previous && onSelectSimulation) onSelectSimulation(previous);
                }}
                disabled={currentUnitSims.findIndex((s) => s.id === definition.id) === 0}
                className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed border transition cursor-pointer ${t.btnSecondary}`}
              >
                ◀ Previous Topic
              </button>
            )}

            {/* Next Topic */}
            {currentUnitSims.length > 1 && (
              <button
                onClick={() => {
                  const idx = currentUnitSims.findIndex((s) => s.id === definition.id);
                  const next = idx >= 0 && idx < currentUnitSims.length - 1 ? currentUnitSims[idx + 1] : undefined;
                  if (next && onSelectSimulation) onSelectSimulation(next);
                }}
                disabled={currentUnitSims.findIndex((s) => s.id === definition.id) === currentUnitSims.length - 1}
                className="px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
              >
                Next Topic ▶
              </button>
            )}

            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg border text-xs font-medium ${t.surfaceBg} ${t.surfaceBorder} ${t.textMuted}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Interactive Simulator Active</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer min-h-[38px] ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>

            {/* Previous (navigate to prior sibling) */}
            {currentUnitSims.length > 1 && (
              <button
                onClick={() => {
                  const idx = currentUnitSims.findIndex((s) => s.id === definition.id);
                  const previous = idx > 0 ? currentUnitSims[idx - 1] : undefined;
                  if (previous && onSelectSimulation) onSelectSimulation(previous);
                }}
                disabled={currentUnitSims.findIndex((s) => s.id === definition.id) === 0}
                className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed border transition cursor-pointer ${t.btnSecondary}`}
              >
                ◀ Previous
              </button>
            )}

            {/* Step */}
            <button
              onClick={handleStep}
              disabled={isPlaying}
              className="flex items-center gap-1.5 px-3.5 py-1.5 min-h-[38px] rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-sm"
            >
              Next Step ▶
            </button>

            {/* Reset */}
            <button
              onClick={resetSimulation}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 min-h-[38px] rounded-lg text-xs font-medium border transition cursor-pointer ${t.btnSecondary}`}
            >
              ↺ Reset
            </button>

            {/* Speed selector */}
            <div className="flex items-center gap-1">
              <label className={`text-[11px] whitespace-nowrap ${t.textMuted}`}>Speed</label>
              <div className={`flex items-center min-h-[38px] rounded-lg border p-0.5 text-[11px] font-mono ${t.surfaceBg} ${t.surfaceBorder}`}>
                {[0.5, 1, 2].map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setSpeedMultiplier(sp)}
                    className={`px-2 py-1 rounded transition cursor-pointer ${
                      speedMultiplier === sp ? t.speedActive : t.speedInactive
                    }`}
                  >
                    {sp}×
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          MAIN AREA: Canvas / Iframe  |  Right Sidebar
          ═══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-[400px]">

        {/* ── LEFT: Simulation Canvas / Iframe area ── */}
        <div className={`flex-1 flex flex-col relative overflow-hidden ${t.canvasBg}`}>
          {/* Section label */}
          <div className="flex-shrink-0 px-4 pt-3 pb-1">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${t.textAccent}`}>
              Interactive Visualization
            </span>
            <h3 className={`text-sm font-bold ${t.textPrimary}`}>
              {isIframeMode ? `${definition.title} Interactive Lab` : 'Simulation Canvas'}
            </h3>
          </div>

          {/* Metrics HUD — floated badges above the canvas (only if canvas mode and has metrics) */}
          {!isIframeMode && definition.metrics.length > 0 && (
            <div className="flex-shrink-0 absolute top-14 left-3 right-3 flex flex-wrap gap-2.5 pointer-events-none z-10">
              {definition.metrics.map((m) => (
                <div
                  key={m.id}
                  className={`px-3.5 py-2 rounded-xl shadow-lg pointer-events-auto flex items-center gap-2.5 border ${t.hudBg}`}
                >
                  <div>
                    <div className={`text-[10px] uppercase font-bold tracking-wider ${t.hudLabel}`}>
                      {m.label}
                    </div>
                    <div className={`text-sm font-mono font-bold ${m.color || t.textPrimary}`}>
                      {metricsValues[m.id] || '---'}
                    </div>
                  </div>
                  {m.badge && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${t.hudBadge}`}>
                      {m.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Canvas or Iframe */}
          <div className="flex-1 w-full h-full relative overflow-hidden">
            {isIframeMode ? (
              <iframe
                ref={iframeRef}
                title={definition.title}
                src={effectiveIframeUrl as string}
                className="w-full h-full border-0 block bg-white dark:bg-slate-900"
                allow="fullscreen; clipboard-write; clipboard-read"
              />
            ) : (
              <canvas
                ref={canvasRef}
                className="w-full h-full block cursor-crosshair"
              />
            )}
          </div>

          {/* Bottom Bar: Formula or Note */}
          {definition.formulaOverview && (
            <div className={`px-4 py-2 border-t text-xs font-mono flex items-center gap-2 ${t.formulaBg} ${t.formulaText}`}>
              <span className={`font-bold ${t.textAccent}`}>Formula:</span>
              <span className="overflow-x-auto truncate">
                {definition.formulaOverview}
              </span>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className={`w-full lg:w-84 border-t lg:border-t-0 lg:border-l flex flex-col flex-shrink-0 overflow-y-auto ${t.sidebarBg} ${t.sidebarBorder}`}>

          {/* Tab bar */}
          <div className={`flex border-b ${t.sidebarBorder} ${t.tabBarBg}`}>
            {(
              [
                { key: 'controls', label: '⚙️ Parameters' },
                { key: 'theory', label: '📖 Theory' },
                { key: 'ai', label: '🤖 Understand AI' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 text-xs font-bold transition cursor-pointer border-b-2 ${
                  activeTab === tab.key ? t.tabActive : t.tabInactive
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5 flex-1 space-y-5 overflow-y-auto">

            {/* ── ALGORITHMIC LOGIC block (always shown on controls & theory tabs) ── */}
            {(activeTab === 'controls' || activeTab === 'theory') && (
              <>
                <div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${t.textAccent}`}>
                    Algorithmic Logic
                  </div>
                  <h4 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>
                    Kernel Algorithm / Pseudocode
                  </h4>
                  <ol className="space-y-1.5 list-decimal list-inside">
                    {pseudocodeLines.map((line, i) => (
                      <li
                        key={i}
                        className={`text-[11px] leading-relaxed ${
                          i === stepIndex % pseudocodeLines.length
                            ? 'text-emerald-400 font-bold'
                            : t.textMuted
                        }`}
                      >
                        {line}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className={`h-px ${t.divider}`} />

                {/* ── PERFORMANCE METRICS ── */}
                <div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${t.textAccent}`}>
                    Performance Metrics
                  </div>
                  <h4 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>
                    Complexity &amp; Criteria
                  </h4>
                  <div className="space-y-2">
                    {definition.metrics.length > 0
                      ? definition.metrics.map((m) => (
                          <div
                            key={m.id}
                            className={`flex items-center justify-between py-1.5 border-b ${t.sidebarBorder}`}
                          >
                            <span className={`text-xs ${t.textMuted}`}>
                              {m.label}
                            </span>
                            <span className={`text-xs font-mono font-bold ${m.color || t.textAccent}`}>
                              {metricsValues[m.id] || '—'}
                            </span>
                          </div>
                        ))
                      : definition.learningObjectives.slice(0, 4).map((obj, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2 py-1 border-b last:border-0 ${t.sidebarBorder}`}
                          >
                            <span className={`mt-0.5 ${t.textAccent}`}>•</span>
                            <span className={`text-[11px] leading-relaxed ${t.textMuted}`}>
                              {obj}
                            </span>
                          </div>
                        ))}
                  </div>
                </div>

                <div className={`h-px ${t.divider}`} />
              </>
            )}

            {/* ── TAB: Controls / Parameters ── */}
            {activeTab === 'controls' && (
              <>
                <div className="space-y-4">
                  {definition.parameters.map((param) => {
                    const currentVal = params[param.key] ?? param.default;

                    if (param.type === 'range') {
                      return (
                        <div key={param.key} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <label className={`font-semibold ${t.textSecondary}`}>
                              {param.label}
                            </label>
                            <span className={`font-mono font-bold ${t.textAccent}`}>
                              {currentVal} {param.unit || ''}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={param.min}
                            max={param.max}
                            step={param.step || 1}
                            value={currentVal}
                            onChange={(e) =>
                              handleParamChange(param.key, parseFloat(e.target.value))
                            }
                            className={`w-full accent-indigo-500 cursor-pointer h-1.5 rounded-lg ${t.sliderTrack}`}
                          />
                        </div>
                      );
                    }

                    if (param.type === 'select') {
                      return (
                        <div key={param.key} className="space-y-1.5">
                          <label className={`text-xs font-semibold ${t.textSecondary}`}>
                            {param.label}
                          </label>
                          <select
                            value={currentVal}
                            onChange={(e) =>
                              handleParamChange(param.key, e.target.value)
                            }
                            className={`w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer ${t.inputBg} ${t.inputBorder} ${t.inputText}`}
                          >
                            {param.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    if (param.type === 'boolean') {
                      return (
                        <label
                          key={param.key}
                          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${t.boolCard}`}
                        >
                          <span className={`text-xs font-medium ${t.textSecondary}`}>
                            {param.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={Boolean(currentVal)}
                            onChange={(e) =>
                              handleParamChange(param.key, e.target.checked)
                            }
                            className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
                          />
                        </label>
                      );
                    }
                    return null;
                  })}
                  {definition.parameters.length === 0 && (
                    <div className={`p-4 rounded-xl border text-center ${t.surfaceCard} ${t.surfaceCardBorder}`}>
                      <span className="text-2xl block mb-2">⚡</span>
                      <h5 className={`text-xs font-bold mb-1 ${t.textPrimary}`}>Live Interactive Controls</h5>
                      <p className={`text-[11px] leading-relaxed mb-3 ${t.textMuted}`}>
                        This simulation has live interactive inputs, calculations, and graphs embedded directly in the visual stage.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('theory')}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${t.btnSecondary}`}
                        >
                          📖 View Theory
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('ai')}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition"
                        >
                          🤖 Ask AI
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {definition.parameters.length > 0 && (
                  <div className={`pt-4 border-t flex justify-between items-center ${t.sidebarBorder}`}>
                    <button
                      onClick={() => {
                        const defs: Record<string, any> = {};
                        for (const p of definition.parameters) defs[p.key] = p.default;
                        setParams(defs);
                        resetSimulation();
                      }}
                      className={`text-xs underline cursor-pointer ${t.textMuted} ${isDark ? 'hover:text-slate-200' : 'hover:text-slate-800'}`}
                    >
                      Reset Defaults
                    </button>
                    <span className={`text-[11px] font-mono ${t.textDimmed}`}>
                      {definition.parameters.length} parameters
                    </span>
                  </div>
                )}
              </>
            )}

            {/* ── TAB: Theory ── */}
            {activeTab === 'theory' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className={`font-bold text-sm mb-1.5 ${t.textSecondary}`}>
                    About this Simulation
                  </h4>
                  <p className={`leading-relaxed ${t.textMuted}`}>
                    {definition.detailedDescription}
                  </p>
                </div>
                <div>
                  <h4 className={`font-bold text-sm mb-2 ${t.textSecondary}`}>
                    Key Learning Objectives
                  </h4>
                  <ul className="space-y-1.5">
                    {definition.learningObjectives.map((obj, i) => (
                      <li key={i} className={`flex items-start gap-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        <span className={`font-bold ${t.textAccent}`}>•</span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {definition.suggestedUnits.length > 0 && (
                  <div className={`p-3 rounded-lg border ${t.surfaceBg} ${t.surfaceBorder}`}>
                    <span className={`font-semibold block mb-1 text-xs ${t.textSecondary}`}>
                      Recommended Curriculum Units:
                    </span>
                    <div className="flex gap-1.5">
                      {definition.suggestedUnits.map((u) => (
                        <span
                          key={u}
                          className={`px-2 py-0.5 rounded font-bold text-[11px] ${t.unitBadgeBg}`}
                        >
                          Unit {u}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: AI ── */}
            {activeTab === 'ai' && (
              <div className="space-y-4 text-xs">
                {/* Context badge */}
                <div className={`p-3 rounded-xl shadow-lg border ${t.aiContextBg}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[11px] font-bold flex items-center gap-1.5 ${t.aiContextLabel}`}>
                      <span>🔬</span> Active Lab Analysis
                    </span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${t.aiContextBadge}`}>
                      {subject?.subjectCode || 'Module'} · Unit {definition.unit || 1}
                    </span>
                  </div>
                  <p className={`text-[11px] ${t.textMuted}`}>
                    Ask AI about theoretical foundations, why &amp; where it is used in engineering, formulas, and real-time parameters.
                  </p>
                </div>

                {/* Core questions */}
                <div>
                  <h4 className={`font-bold text-xs mb-2 flex items-center gap-1.5 ${t.textSecondary}`}>
                    <span>💡</span> Core Conceptual Questions
                  </h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {defaultQuestions.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleAskAi(q.question)}
                        disabled={aiLoading}
                        className={`p-2 rounded-lg border transition text-left text-[11px] font-medium flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${t.aiBtnBg}`}
                        title={q.question}
                      >
                        <span>{q.icon}</span>
                        <span className="truncate">{q.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contextual questions */}
                {contextualQuestions.length > 0 && (
                  <div>
                    <h4 className={`font-bold text-xs mb-2 flex items-center gap-1.5 ${t.textSecondary}`}>
                      <span>🎯</span> Contextual Questions
                    </h4>
                    <div className="space-y-1.5">
                      {contextualQuestions.map((q) => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => handleAskAi(q.question)}
                          disabled={aiLoading}
                          className={`w-full p-2 rounded-lg border transition text-left text-[11px] font-medium flex items-center gap-2 disabled:opacity-50 cursor-pointer ${t.aiCtxBtnBg}`}
                        >
                          <span>{q.icon}</span>
                          <span className="line-clamp-2">{q.question}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Free query */}
                <div>
                  <h4 className={`font-bold text-xs mb-2 flex items-center gap-1.5 ${t.textSecondary}`}>
                    <span>💬</span> Ask a Specific Question
                  </h4>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAskAi(aiQuestion); }}
                      placeholder="Ask about this simulation..."
                      disabled={aiLoading}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-indigo-500 disabled:opacity-50 ${t.inputDeepBg} ${t.inputBorder} ${t.inputText} ${isDark ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleAskAi(aiQuestion)}
                      disabled={aiLoading || !aiQuestion.trim()}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs disabled:opacity-50 transition cursor-pointer"
                    >
                      Ask
                    </button>
                  </div>
                </div>

                {/* Loading */}
                {aiLoading && (
                  <div className={`p-4 rounded-xl border flex items-center gap-3 ${t.aiLoadBg}`}>
                    <div className={`h-5 w-5 rounded-full border-2 animate-spin flex-shrink-0 ${t.aiSpinner}`} />
                    <div>
                      <div className={`text-xs font-bold ${t.aiLoadText}`}>
                        Analyzing Simulation &amp; Grounding in Curriculum...
                      </div>
                      <div className={`text-[10px] ${t.aiLoadSub}`}>
                        Extracting real-time parameters, formulas &amp; course notes
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {aiError && (
                  <div className={`p-3 rounded-lg border text-xs ${t.aiErrorBg}`}>
                    ⚠️ {aiError}
                  </div>
                )}

                {/* Response */}
                {aiResponse && (
                  <div className={`p-3.5 rounded-xl border shadow-lg space-y-3 ${t.aiResponseBg}`}>
                    <div className={`flex items-center justify-between pb-2 border-b ${t.aiResponseBorder}`}>
                      <span className={`text-[11px] font-bold flex items-center gap-1 ${t.successText}`}>
                        <span>✅</span> Grounded Simulation Answer
                      </span>
                      <button
                        onClick={() => {
                          const text = [aiResponse.directAnswer, aiResponse.explanation, aiResponse.additionalExplanation]
                            .filter(Boolean).join('\n\n');
                          navigator.clipboard.writeText(text);
                          setCopiedAnswer(true);
                          setTimeout(() => setCopiedAnswer(false), 2000);
                        }}
                        className={`text-[10px] underline cursor-pointer ${t.copyBtn}`}
                      >
                        {copiedAnswer ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <div>
                      <div className={`text-[10px] uppercase font-bold mb-1 ${t.textMuted}`}>Direct Answer</div>
                      <div className={`p-2.5 rounded-lg border text-xs leading-relaxed whitespace-pre-wrap font-medium ${t.aiAnswerBg}`}>
                        {aiResponse.directAnswer}
                      </div>
                    </div>
                    {aiResponse.explanation && (
                      <div>
                        <div className={`text-[10px] uppercase font-bold mb-1 ${t.textMuted}`}>Pedagogical Breakdown</div>
                        <div className={`text-[11px] leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto pr-1 ${t.aiExplText}`}>
                          {aiResponse.explanation}
                        </div>
                      </div>
                    )}
                    {aiResponse.additionalExplanation && (
                      <div className={`text-[10px] italic pt-1 border-t ${t.aiResponseBorder} ${t.aiExtrText}`}>
                        {aiResponse.additionalExplanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          STATUS BAR (bottom)
          ═══════════════════════════════════════════════════ */}
      <div className={`flex-shrink-0 flex items-center justify-between gap-3 px-5 py-2 border-t ${t.statusBg}`}>
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${domainColors.badgeBg} ${domainColors.badgeText} ${domainColors.border}`}>
            {domainLabel(definition.domain)}
          </span>
          <span className={`text-[11px] font-mono ${t.textDimmed}`}>
            {definition.id}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {definition.tags.slice(0, 3).map((tag) => (
            <span key={tag} className={`text-[10px] font-medium hidden md:inline ${t.textDimmed}`}>
              #{tag}
            </span>
          ))}
          {isIframeMode ? (
            <div className="flex items-center gap-2.5">
              <span className={`text-[11px] font-medium ${t.textDimmed}`}>
                {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className={`text-[11px] font-semibold text-emerald-500`}>
                  Live Simulation
                </span>
              </div>
            </div>
          ) : (
            <>
              <span className={`text-xs font-mono ${t.textMuted}`}>
                Step {stepIndex + 1}
              </span>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? t.playDot : t.pauseDot}`} />
                <span className={`text-[11px] ${t.textMuted}`}>
                  {isPlaying ? 'Running' : 'Paused'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulationShell;
