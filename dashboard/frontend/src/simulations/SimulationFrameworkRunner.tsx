import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { ISimulationDefinition, IAssignedSimulation, ISimulationLaunchContext } from './types';
import { getDomainColor } from './types';
import {
  askSimulationAi,
  getDefaultQuestions,
  getContextualQuestions,
  normalizeSimulationContext,
  type ISimulationAiResponse,
} from './simulation-ai-context';

/* ─────────────────────────── theme system ──────────────────────── */

type RunnerTheme = 'dark' | 'light';

/**
 * Semantic colour tokens resolved per theme.
 * Every UI element reads from `t` — never from hardcoded slate-xxx.
 */
function themeTokens(theme: RunnerTheme) {
  const dark = theme === 'dark';
  return {
    // ── root ──
    rootBg:        dark ? 'bg-slate-950'         : 'bg-white',
    rootText:      dark ? 'text-slate-100'        : 'text-slate-800',
    rootBorder:    dark ? 'border-slate-800'      : 'border-slate-200',
    // ── header ──
    headerBg:      dark ? 'bg-slate-900/90'       : 'bg-slate-50/95',
    headerBorder:  dark ? 'border-slate-800'      : 'border-slate-200',
    // ── surfaces ──
    surfaceBg:     dark ? 'bg-slate-800'          : 'bg-slate-100',
    surfaceBorder: dark ? 'border-slate-700'      : 'border-slate-300',
    surfaceHover:  dark ? 'hover:bg-slate-700'    : 'hover:bg-slate-200',
    surfaceDeep:   dark ? 'bg-slate-950'          : 'bg-slate-50',
    surfaceDeepBg: dark ? 'bg-slate-950/80'       : 'bg-slate-50/80',
    // ── canvas ──
    canvasBg:      dark ? 'bg-black'              : 'bg-slate-100',
    // ── text ──
    textPrimary:   dark ? 'text-slate-100'        : 'text-slate-900',
    textSecondary: dark ? 'text-slate-200'        : 'text-slate-700',
    textMuted:     dark ? 'text-slate-400'        : 'text-slate-500',
    textDimmed:    dark ? 'text-slate-500'        : 'text-slate-400',
    textAccent:    dark ? 'text-indigo-400'        : 'text-indigo-600',
    textAccent2:   dark ? 'text-indigo-300'        : 'text-indigo-700',
    // ── sidebar ──
    sidebarBg:     dark ? 'bg-slate-900/95'       : 'bg-white',
    sidebarBorder: dark ? 'border-slate-800'      : 'border-slate-200',
    tabBarBg:      dark ? 'bg-slate-950/60'       : 'bg-slate-50',
    tabActive:     dark ? 'border-indigo-500 text-indigo-400 bg-slate-900/50' : 'border-indigo-600 text-indigo-600 bg-indigo-50/60',
    tabInactive:   dark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-700',
    // ── inputs ──
    inputBg:       dark ? 'bg-slate-800'          : 'bg-white',
    inputBorder:   dark ? 'border-slate-700'      : 'border-slate-300',
    inputText:     dark ? 'text-slate-200'        : 'text-slate-800',
    inputDeepBg:   dark ? 'bg-slate-950'          : 'bg-slate-50',
    // ── buttons ──
    btnSecondary:  dark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                       : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300',
    btnClose:      dark ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                       : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100',
    // ── dividers ──
    divider:       dark ? 'border-slate-800'      : 'border-slate-200',
    // ── metrics HUD ──
    hudBg:         dark ? 'bg-slate-900/85 backdrop-blur-md border-slate-700/80'
                       : 'bg-white/90 backdrop-blur-md border-slate-200 shadow-md',
    hudLabel:      dark ? 'text-slate-400'        : 'text-slate-500',
    hudBadge:      dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600',
    // ── formula bar ──
    formulaBg:     dark ? 'bg-slate-900/60'       : 'bg-slate-50/80',
    formulaBorder: dark ? 'border-slate-800/80'   : 'border-slate-200',
    formulaText:   dark ? 'text-slate-300'        : 'text-slate-600',
    // ── param cards ──
    boolCard:      dark ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                       : 'bg-slate-50 border-slate-200 hover:bg-slate-100',
    sliderTrack:   dark ? 'bg-slate-800'          : 'bg-slate-200',
    // ── category badge ──
    catBadge:      dark ? 'bg-slate-800 text-slate-300 border-slate-700'
                       : 'bg-slate-100 text-slate-600 border-slate-300',
    unitBadgeBg:   dark ? 'bg-indigo-950 text-indigo-300'
                       : 'bg-indigo-100 text-indigo-700',
    // ── AI tab ──
    aiContextBg:   dark ? 'bg-slate-950/80 border-indigo-500/30'
                       : 'bg-indigo-50/60 border-indigo-200',
    aiContextLabel:dark ? 'text-indigo-300'       : 'text-indigo-700',
    aiContextBadge:dark ? 'bg-indigo-950 text-indigo-300 border-indigo-800/40'
                       : 'bg-indigo-100 text-indigo-700 border-indigo-200',
    aiBtnBg:       dark ? 'bg-slate-800/80 hover:bg-indigo-950/60 border-slate-700 hover:border-indigo-500/60 text-slate-200'
                       : 'bg-white hover:bg-indigo-50 border-slate-200 hover:border-indigo-400 text-slate-700',
    aiCtxBtnBg:    dark ? 'bg-indigo-950/40 hover:bg-indigo-900/50 border-indigo-800/50 hover:border-indigo-500/70 text-indigo-200'
                       : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 hover:border-indigo-400 text-indigo-700',
    aiLoadBg:      dark ? 'bg-slate-950/90 border-indigo-500/40'
                       : 'bg-indigo-50 border-indigo-200',
    aiLoadText:    dark ? 'text-indigo-300'       : 'text-indigo-700',
    aiLoadSub:     dark ? 'text-slate-400'        : 'text-slate-500',
    aiSpinner:     dark ? 'border-indigo-400 border-t-transparent'
                       : 'border-indigo-600 border-t-transparent',
    aiErrorBg:     dark ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                       : 'bg-rose-50 border-rose-200 text-rose-700',
    aiResponseBg:  dark ? 'bg-slate-950/90 border-slate-700/80'
                       : 'bg-white border-slate-200',
    aiResponseBorder: dark ? 'border-slate-800'   : 'border-slate-200',
    aiAnswerBg:    dark ? 'bg-slate-900 border-slate-800 text-slate-100'
                       : 'bg-slate-50 border-slate-200 text-slate-900',
    aiExplText:    dark ? 'text-slate-300'        : 'text-slate-600',
    aiExtrText:    dark ? 'text-slate-400'        : 'text-slate-500',
    // ── speed selector ──
    speedActive:   'bg-indigo-600 text-white font-bold',
    speedInactive: dark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800',
    // ── copy / misc ──
    copyBtn:       dark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800',
    successText:   'text-emerald-400',
    // ── theory list ──
    theoryListItem:dark ? 'text-slate-300'        : 'text-slate-600',
    theorySurface: dark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200',
  };
}

/* ─────────────────────────── props ─────────────────────────────── */

interface SimulationFrameworkRunnerProps {
  definition: ISimulationDefinition;
  initialParams?: Record<string, any>;
  assignedSimulation?: IAssignedSimulation | null;
  subject?: {
    _id: string;
    subjectName: string;
    subjectCode: string;
  } | null;
  onClose?: () => void;
  onLaunchSmartBoard?: (simKey: string, title: string, context?: ISimulationLaunchContext) => void;
}

/* ─────────────────────────── component ─────────────────────────── */

export const SimulationFrameworkRunner: React.FC<SimulationFrameworkRunnerProps> = ({
  definition,
  initialParams,
  assignedSimulation,
  subject,
  onClose,
  onLaunchSmartBoard,
}) => {
  // Initialize state with default parameters merged with assigned/initial params
  const [params, setParams] = useState<Record<string, any>>(() => {
    const defaultVals: Record<string, any> = {};
    for (const p of definition.parameters) {
      defaultVals[p.key] = p.default;
    }
    return {
      ...defaultVals,
      ...(assignedSimulation?.simulationConfig?.initialParams || {}),
      ...(initialParams || {}),
    };
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [activeTab, setActiveTab] = useState<'controls' | 'theory' | 'ai'>('controls');
  const [metricsValues, setMetricsValues] = useState<Record<string, string>>({});

  // AI Assistant Tab State
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<ISimulationAiResponse | null>(null);
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedAnswer, setCopiedAnswer] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simStateRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  /* ── theme state ── */
  const [theme, setTheme] = useState<RunnerTheme>('dark');
  const t = useMemo(() => themeTokens(theme), [theme]);
  const isDark = theme === 'dark';

  // Setup initial simulation state
  const resetSimulation = useCallback(() => {
    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 800;
    const h = canvas ? canvas.height : 500;
    if (definition.engine.reset) {
      simStateRef.current = definition.engine.reset(params, w, h);
    } else {
      simStateRef.current = definition.engine.createInitialState(params, w, h);
    }
  }, [definition, params]);

  // Update param
  const handleParamChange = (key: string, value: any) => {
    setParams((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
  };

  const simContext = useMemo(() => {
    return normalizeSimulationContext({
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
    });
  }, [subject, definition, assignedSimulation, params, metricsValues]);

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

  // Re-init when definition changes
  useEffect(() => {
    const defaultVals: Record<string, any> = {};
    for (const p of definition.parameters) {
      defaultVals[p.key] = p.default;
    }
    setParams({
      ...defaultVals,
      ...(assignedSimulation?.simulationConfig?.initialParams || {}),
      ...(initialParams || {}),
    });
  }, [definition, assignedSimulation, initialParams]);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle high DPI
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
          simStateRef.current,
          params,
          dt,
          w,
          h
        );

        ctx.clearRect(0, 0, w, h);
        definition.engine.render(ctx, w, h, simStateRef.current, params);

        // Compute metrics
        const computed: Record<string, string> = {};
        for (const m of definition.metrics) {
          computed[m.id] = m.format(simStateRef.current, params);
        }
        setMetricsValues(computed);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [definition, isPlaying, speedMultiplier, params]);

  // Step single frame
  const handleStep = () => {
    const canvas = canvasRef.current;
    if (!canvas || !simStateRef.current) return;
    const rect = canvas.getBoundingClientRect();
    simStateRef.current = definition.engine.update(
      simStateRef.current,
      params,
      0.03 * speedMultiplier,
      rect.width,
      rect.height
    );
  };

  const domainColors = getDomainColor(definition.domain);

  return (
    <div className={`flex flex-col h-full w-full rounded-2xl overflow-hidden border shadow-2xl transition-colors duration-300 ${t.rootBg} ${t.rootText} ${t.rootBorder}`}>
      {/* ─── RUNNER HEADER ─── */}
      <div className={`flex flex-wrap items-center justify-between px-6 py-4 border-b backdrop-blur-md gap-4 ${t.headerBg} ${t.headerBorder}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl shadow-inner border ${t.surfaceBg} ${t.surfaceBorder}`}>
            {definition.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${domainColors.badgeBg} ${domainColors.badgeText} ${domainColors.border}`}
              >
                {definition.domain.replace('_', ' ')}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${t.catBadge}`}>
                {definition.category}
              </span>
              {assignedSimulation?.chapterOrUnit && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                  Unit {assignedSimulation.chapterOrUnit}
                </span>
              )}
              {subject && (
                <span className={`text-xs font-mono ${t.textMuted}`}>
                  {subject.subjectCode}
                </span>
              )}
            </div>
            <h2 className={`text-lg font-bold mt-0.5 ${t.textPrimary}`}>
              {assignedSimulation?.title || definition.title}
            </h2>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 cursor-pointer border ${t.btnSecondary}`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <span className="text-base leading-none transition-transform duration-300" style={{ display: 'inline-block', transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)' }}>
              {isDark ? '☀️' : '🌙'}
            </span>
            <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title={isPlaying ? 'Pause Simulation' : 'Run Simulation'}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          {/* Step */}
          <button
            onClick={handleStep}
            disabled={isPlaying}
            className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed border transition cursor-pointer ${t.btnSecondary}`}
            title="Step Forward One Frame"
          >
            ⏭ Step
          </button>

          {/* Reset */}
          <button
            onClick={resetSimulation}
            className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-xs font-medium border transition cursor-pointer ${t.btnSecondary}`}
            title="Reset Simulation State"
          >
            🔄 Reset
          </button>

          {/* Speed Selector */}
          <div className={`flex items-center min-h-[38px] rounded-lg border p-0.5 text-[11px] font-mono ${t.surfaceBg} ${t.surfaceBorder}`}>
            {[0.5, 1, 2].map((sp) => (
              <button
                key={sp}
                onClick={() => setSpeedMultiplier(sp)}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  speedMultiplier === sp ? t.speedActive : t.speedInactive
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>

          {/* Smart Board Launch Bridge */}
          <button
            onClick={() => {
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
                  semesterNumber: String((subject as any)?.semester?.semesterNumber || (subject as any)?.semesterNumber || 1),
                  preset: definition.smartboardPresetKey || definition.id,
                  title: assignedSimulation?.title || definition.title,
                });
                window.open(`/smartboard/index.html?${q.toString()}`, '_blank');
              }
            }}
            className="px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
            title="Open in PiyushDhara Smart Board"
          >
            🔬 Smart Board
          </button>

          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              className={`p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg transition cursor-pointer ${t.btnClose}`}
              title="Close Runner"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ─── RUNNER WORKSPACE (CANVAS + SIDEBAR) ─── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-[500px]">
        {/* Left: Interactive Canvas Viewport */}
        <div className={`flex-1 flex flex-col relative overflow-hidden ${t.canvasBg}`}>
          {/* Live Metrics HUD Overlay */}
          <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2.5 pointer-events-none z-10">
            {definition.metrics.map((m) => (
              <div
                key={m.id}
                className={`px-3.5 py-2 rounded-xl shadow-lg pointer-events-auto flex items-center gap-2.5 border ${t.hudBg}`}
              >
                <div>
                  <div className={`text-[10px] uppercase font-bold tracking-wider ${t.hudLabel}`}>
                    {m.label}
                  </div>
                  <div
                    className={`text-sm font-mono font-bold ${
                      m.color || t.textPrimary
                    }`}
                  >
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

          {/* Canvas */}
          <div className="flex-1 w-full h-full relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full block cursor-crosshair"
            />
          </div>

          {/* Bottom Bar: Formula or Note */}
          {definition.formulaOverview && (
            <div className={`px-4 py-2 border-t text-xs font-mono flex items-center gap-2 ${t.formulaBg} ${t.formulaBorder} ${t.formulaText}`}>
              <span className={`font-bold ${t.textAccent}`}>Formula:</span>
              <span className="overflow-x-auto truncate">
                {definition.formulaOverview}
              </span>
            </div>
          )}
        </div>

        {/* Right: Dynamic Parameter Control Drawer */}
        <div className={`w-full lg:w-84 border-t lg:border-t-0 lg:border-l flex flex-col flex-shrink-0 overflow-y-auto ${t.sidebarBg} ${t.sidebarBorder}`}>
          {/* Tab Selector */}
          <div className={`flex border-b ${t.sidebarBorder} ${t.tabBarBg}`}>
            <button
              onClick={() => setActiveTab('controls')}
              className={`flex-1 py-2.5 text-xs font-bold transition cursor-pointer border-b-2 ${
                activeTab === 'controls' ? t.tabActive : t.tabInactive
              }`}
            >
              ⚙️ Parameters
            </button>
            <button
              onClick={() => setActiveTab('theory')}
              className={`flex-1 py-2.5 text-xs font-bold transition cursor-pointer border-b-2 ${
                activeTab === 'theory' ? t.tabActive : t.tabInactive
              }`}
            >
              📖 Theory
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-2.5 text-xs font-bold transition cursor-pointer border-b-2 ${
                activeTab === 'ai' ? t.tabActive : t.tabInactive
              }`}
            >
              🤖 Understand AI
            </button>
          </div>

          <div className="p-5 flex-1 space-y-5 overflow-y-auto">
            {activeTab === 'controls' ? (
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
                              handleParamChange(
                                param.key,
                                parseFloat(e.target.value)
                              )
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
                </div>

                <div className={`pt-4 border-t flex justify-between items-center ${t.divider}`}>
                  <button
                    onClick={() => {
                      const defs: Record<string, any> = {};
                      for (const p of definition.parameters) {
                        defs[p.key] = p.default;
                      }
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
              </>
            ) : activeTab === 'theory' ? (
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
                      <li
                        key={i}
                        className={`flex items-start gap-2 ${t.theoryListItem}`}
                      >
                        <span className={`font-bold ${t.textAccent}`}>•</span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {definition.suggestedUnits.length > 0 && (
                  <div className={`p-3 rounded-lg border ${t.theorySurface}`}>
                    <span className={`font-semibold block mb-1 ${t.textSecondary}`}>
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
            ) : (
              <div className="space-y-4 text-xs">
                {/* Active Simulation Status Banner */}
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
                    Ask AI about theoretical foundations, why & where it is used in engineering, formulas, and real-time parameters.
                  </p>
                </div>

                {/* Level 1 Default Questions */}
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

                {/* Level 2 Contextual Questions */}
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

                {/* Level 3 Custom Free Query */}
                <div>
                  <h4 className={`font-bold text-xs mb-2 flex items-center gap-1.5 ${t.textSecondary}`}>
                    <span>💬</span> Ask a Specific Question
                  </h4>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAskAi(aiQuestion);
                      }}
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

                {/* Live Loading Indicator */}
                {aiLoading && (
                  <div className={`p-4 rounded-xl border flex items-center gap-3 ${t.aiLoadBg}`}>
                    <div className={`h-5 w-5 rounded-full border-2 animate-spin flex-shrink-0 ${t.aiSpinner}`} />
                    <div>
                      <div className={`text-xs font-bold ${t.aiLoadText}`}>
                        Analyzing Simulation & Grounding in Curriculum...
                      </div>
                      <div className={`text-[10px] ${t.aiLoadSub}`}>
                        Extracting real-time parameters, formulas & course notes
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Notice */}
                {aiError && (
                  <div className={`p-3 rounded-lg border text-xs ${t.aiErrorBg}`}>
                    ⚠️ {aiError}
                  </div>
                )}

                {/* AI Response Display */}
                {aiResponse && (
                  <div className={`p-3.5 rounded-xl border shadow-lg space-y-3 ${t.aiResponseBg}`}>
                    <div className={`flex items-center justify-between pb-2 border-b ${t.aiResponseBorder}`}>
                      <span className={`text-[11px] font-bold flex items-center gap-1 ${t.successText}`}>
                        <span>✅</span> Grounded Simulation Answer
                      </span>
                      <button
                        onClick={() => {
                          const text = [aiResponse.directAnswer, aiResponse.explanation, aiResponse.additionalExplanation].filter(Boolean).join('\n\n');
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
                      <div className={`text-[10px] uppercase font-bold mb-1 ${t.textMuted}`}>
                        Direct Answer
                      </div>
                      <div className={`p-2.5 rounded-lg border text-xs leading-relaxed whitespace-pre-wrap font-medium ${t.aiAnswerBg}`}>
                        {aiResponse.directAnswer}
                      </div>
                    </div>

                    {aiResponse.explanation && (
                      <div>
                        <div className={`text-[10px] uppercase font-bold mb-1 ${t.textMuted}`}>
                          Pedagogical Breakdown
                        </div>
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
    </div>
  );
};
