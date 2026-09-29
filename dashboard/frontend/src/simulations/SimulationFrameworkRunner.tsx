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
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* ─── RUNNER HEADER ─── */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-2xl shadow-inner border border-slate-700">
            {definition.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${domainColors.badgeBg} ${domainColors.badgeText} ${domainColors.border}`}
              >
                {definition.domain.replace('_', ' ')}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {definition.category}
              </span>
              {assignedSimulation?.chapterOrUnit && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                  Unit {assignedSimulation.chapterOrUnit}
                </span>
              )}
              {subject && (
                <span className="text-xs text-slate-400 font-mono">
                  {subject.subjectCode}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-0.5">
              {assignedSimulation?.title || definition.title}
            </h2>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
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
            className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Step Forward One Frame"
          >
            ⏭ Step
          </button>

          {/* Reset */}
          <button
            onClick={resetSimulation}
            className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Reset Simulation State"
          >
            🔄 Reset
          </button>

          {/* Speed Selector */}
          <div className="flex items-center min-h-[38px] rounded-lg bg-slate-800 border border-slate-700 p-0.5 text-[11px] font-mono">
            {[0.5, 1, 2].map((sp) => (
              <button
                key={sp}
                onClick={() => setSpeedMultiplier(sp)}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  speedMultiplier === sp
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
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
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
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
        <div className="flex-1 flex flex-col bg-black relative overflow-hidden">
          {/* Live Metrics HUD Overlay */}
          <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2.5 pointer-events-none z-10">
            {definition.metrics.map((m) => (
              <div
                key={m.id}
                className="px-3.5 py-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 shadow-lg pointer-events-auto flex items-center gap-2.5"
              >
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {m.label}
                  </div>
                  <div
                    className={`text-sm font-mono font-bold ${
                      m.color || 'text-slate-100'
                    }`}
                  >
                    {metricsValues[m.id] || '---'}
                  </div>
                </div>
                {m.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
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
            <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/60 text-xs font-mono text-slate-300 flex items-center gap-2">
              <span className="text-indigo-400 font-bold">Formula:</span>
              <span className="text-slate-300 overflow-x-auto truncate">
                {definition.formulaOverview}
              </span>
            </div>
          )}
        </div>

        {/* Right: Dynamic Parameter Control Drawer */}
        <div className="w-full lg:w-84 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/95 flex flex-col flex-shrink-0 overflow-y-auto">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-800 bg-slate-950/60">
            <button
              onClick={() => setActiveTab('controls')}
              className={`flex-1 py-2.5 text-xs font-bold transition cursor-pointer border-b-2 ${
                activeTab === 'controls'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚙️ Parameters
            </button>
            <button
              onClick={() => setActiveTab('theory')}
              className={`flex-1 py-2.5 text-xs font-bold transition cursor-pointer border-b-2 ${
                activeTab === 'theory'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              📖 Theory
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-2.5 text-xs font-bold transition cursor-pointer border-b-2 ${
                activeTab === 'ai'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
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
                            <label className="font-semibold text-slate-200">
                              {param.label}
                            </label>
                            <span className="font-mono font-bold text-indigo-400">
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
                            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                          />
                        </div>
                      );
                    }

                    if (param.type === 'select') {
                      return (
                        <div key={param.key} className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-200">
                            {param.label}
                          </label>
                          <select
                            value={currentVal}
                            onChange={(e) =>
                              handleParamChange(param.key, e.target.value)
                            }
                            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 cursor-pointer hover:bg-slate-800 transition"
                        >
                          <span className="text-xs font-medium text-slate-200">
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

                <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                  <button
                    onClick={() => {
                      const defs: Record<string, any> = {};
                      for (const p of definition.parameters) {
                        defs[p.key] = p.default;
                      }
                      setParams(defs);
                      resetSimulation();
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {definition.parameters.length} parameters
                  </span>
                </div>
              </>
            ) : activeTab === 'theory' ? (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-200 text-sm mb-1.5">
                    About this Simulation
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    {definition.detailedDescription}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-200 text-sm mb-2">
                    Key Learning Objectives
                  </h4>
                  <ul className="space-y-1.5">
                    {definition.learningObjectives.map((obj, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-slate-300"
                      >
                        <span className="text-indigo-400 font-bold">•</span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {definition.suggestedUnits.length > 0 && (
                  <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                    <span className="font-semibold text-slate-200 block mb-1">
                      Recommended Curriculum Units:
                    </span>
                    <div className="flex gap-1.5">
                      {definition.suggestedUnits.map((u) => (
                        <span
                          key={u}
                          className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-bold text-[11px]"
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
                <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-500/30 shadow-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                      <span>🔬</span> Active Lab Analysis
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-800/40">
                      {subject?.subjectCode || 'Module'} · Unit {definition.unit || 1}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Ask AI about theoretical foundations, why & where it is used in engineering, formulas, and real-time parameters.
                  </p>
                </div>

                {/* Level 1 Default Questions */}
                <div>
                  <h4 className="font-bold text-slate-200 text-xs mb-2 flex items-center gap-1.5">
                    <span>💡</span> Core Conceptual Questions
                  </h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {defaultQuestions.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleAskAi(q.question)}
                        disabled={aiLoading}
                        className="p-2 rounded-lg bg-slate-800/80 hover:bg-indigo-950/60 border border-slate-700 hover:border-indigo-500/60 transition text-left text-[11px] font-medium text-slate-200 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
                    <h4 className="font-bold text-slate-200 text-xs mb-2 flex items-center gap-1.5">
                      <span>🎯</span> Contextual Questions
                    </h4>
                    <div className="space-y-1.5">
                      {contextualQuestions.map((q) => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => handleAskAi(q.question)}
                          disabled={aiLoading}
                          className="w-full p-2 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50 hover:border-indigo-500/70 transition text-left text-[11px] font-medium text-indigo-200 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
                  <h4 className="font-bold text-slate-200 text-xs mb-2 flex items-center gap-1.5">
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
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
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
                  <div className="p-4 rounded-xl bg-slate-950/90 border border-indigo-500/40 flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-indigo-300">
                        Analyzing Simulation & Grounding in Curriculum...
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Extracting real-time parameters, formulas & course notes
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Notice */}
                {aiError && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                    ⚠️ {aiError}
                  </div>
                )}

                {/* AI Response Display */}
                {aiResponse && (
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-700/80 shadow-lg space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <span>✅</span> Grounded Simulation Answer
                      </span>
                      <button
                        onClick={() => {
                          const text = [aiResponse.directAnswer, aiResponse.explanation, aiResponse.additionalExplanation].filter(Boolean).join('\n\n');
                          navigator.clipboard.writeText(text);
                          setCopiedAnswer(true);
                          setTimeout(() => setCopiedAnswer(false), 2000);
                        }}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        {copiedAnswer ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                        Direct Answer
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                        {aiResponse.directAnswer}
                      </div>
                    </div>

                    {aiResponse.explanation && (
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                          Pedagogical Breakdown
                        </div>
                        <div className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto pr-1">
                          {aiResponse.explanation}
                        </div>
                      </div>
                    )}

                    {aiResponse.additionalExplanation && (
                      <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800/80">
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
