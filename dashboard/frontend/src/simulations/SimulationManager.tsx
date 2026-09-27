import React, { useEffect, useMemo, useState } from 'react';
import type { ISimulationDefinition, IAssignedSimulation, ISimulationLaunchContext, SimulationDomain } from './types';
import { getDomainColor, resolveSubjectDomain, isSmartBoardDsaSimulation, isSmartBoardOsSimulation, isSmartBoardCSimulation } from './types';
import { getSimulationsForSubject } from './registry';
import { SimulationModal } from './SimulationModal';

/**
 * Subject → Simulations tab.
 *
 * Every simulation that belongs to the subject is listed for teachers and
 * students alike, organised Unit → Topic when the subject has a syllabus-mapped
 * library (e.g. Computer Networks). Each card has two actions:
 *   • Preview            — try the simulation here in the dashboard
 *   • Launch Smart Board — open it inside the Eduverse Smart Board
 */
interface SimulationManagerProps {
  subject: {
    _id: string;
    subjectName: string;
    subjectCode: string;
    department?: any;
    semester?: any;
    syllabus?: { unitNumber: number; title: string }[];
  };
  /** Kept for compatibility with existing pages; no longer used. */
  assignedSimulations?: IAssignedSimulation[];
  isTeacher?: boolean;
  /** Kept for compatibility with existing pages; assignment is no longer needed. */
  onAssignSimulation?: (payload: {
    simulationId: string;
    chapterOrUnit: number;
    title: string;
    description: string;
    customParams?: Record<string, unknown>;
    status: 'PUBLISHED' | 'DRAFT';
  }) => Promise<void>;
  onToggleStatus?: (simulationId: string, currentStatus: string) => Promise<void>;
  onDeleteSimulation?: (simulationId: string) => Promise<void>;
  onLaunchSmartBoard?: (presetKey: string, title: string, context?: ISimulationLaunchContext) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  'data structures & algorithms': 'Data Structures & Algorithms',
};

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category.replace(/\b\w/g, (c) => c.toUpperCase());
}

export const SimulationManager: React.FC<SimulationManagerProps> = ({
  subject,
  isTeacher = false,
  onLaunchSmartBoard,
}) => {
  const domain: SimulationDomain = useMemo(() => resolveSubjectDomain(subject), [subject]);
  const domainStyle = getDomainColor(domain);

  // Only the simulations that belong to this subject
  const simulations = useMemo(() => getSimulationsForSubject(subject), [subject]);
  const byUnit = simulations.length > 0 && simulations.every((s) => s.unit != null);

  // Filter chips: units for a syllabus-mapped library, otherwise categories
  const groups = useMemo(() => {
    if (byUnit) {
      const units = Array.from(new Set(simulations.map((s) => s.unit as number))).sort((a, b) => a - b);
      return units.map((u) => ({ key: `unit-${u}`, label: `Unit ${u}`, title: simulations.find((s) => s.unit === u)?.unitTitle || '' }));
    }
    return Array.from(new Set(simulations.map((s) => s.category))).map((c) => ({ key: c, label: categoryLabel(c), title: '' }));
  }, [simulations, byUnit]);

  const [selected, setSelected] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [preview, setPreview] = useState<ISimulationDefinition | null>(null);

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return simulations.filter((sim) => {
      if (selected !== 'ALL' && (byUnit ? `unit-${sim.unit}` : sim.category) !== selected) return false;
      if (!q) return true;
      return (
        sim.title.toLowerCase().includes(q) ||
        sim.shortDescription.toLowerCase().includes(q) ||
        (sim.topic || '').toLowerCase().includes(q) ||
        sim.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [simulations, selected, searchQuery, byUnit]);

  const subjectQuery = (extra: Record<string, string>) =>
    new URLSearchParams({
      subjectId: subject._id,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode || '',
      departmentName: (subject.department as any)?.name || '',
      departmentId: String((subject.department as any)?._id || ''),
      semesterId: String((subject.semester as any)?._id || ''),
      semesterNumber: String((subject.semester as any)?.semesterNumber || 1),
      role: isTeacher ? 'teacher' : 'student',
      ...extra,
    }).toString();

  const contextFor = (sim: ISimulationDefinition, extra: Partial<ISimulationLaunchContext> = {}): ISimulationLaunchContext => {
    if (isSmartBoardDsaSimulation(sim)) return { topic: sim.title, category: sim.dsaCategory, config: { category: sim.dsaCategory, topic: sim.title }, ...extra };
    if (sim.boardEngine === 'cn') return { topic: sim.topic, category: sim.id, config: {}, ...extra };
    if (isSmartBoardOsSimulation(sim)) return { topic: sim.title, category: sim.osCategory, config: { simulationId: sim.id, osCategory: sim.osCategory, topic: sim.title }, ...extra };
    if (isSmartBoardCSimulation(sim)) return { topic: sim.title, category: sim.cCategory, config: { simulationId: sim.id, cCategory: sim.cCategory, topic: sim.title }, ...extra };
    return { topic: sim.title, category: sim.category, config: {}, ...extra };
  };

  /** Opens the simulation on the Smart Board (embedded board when the page provides one, otherwise a new tab). */
  const launchOnSmartBoard = (sim: ISimulationDefinition, extra: Partial<ISimulationLaunchContext> = {}) => {
    const presetKey = sim.smartboardPresetKey || sim.id;
    const context = contextFor(sim, extra);
    if (onLaunchSmartBoard) {
      onLaunchSmartBoard(presetKey, sim.title, context);
      return;
    }
    window.open(
      `/smartboard/index.html?${subjectQuery({
        preset: presetKey,
        title: sim.title,
        ...(context.topic ? { topic: String(context.topic) } : {}),
        ...(context.category ? { category: String(context.category) } : {}),
        config: JSON.stringify(context.config || {}),
        ...(context.state ? { state: JSON.stringify(context.state) } : {}),
      })}`,
      '_blank'
    );
  };

  // "Launch Smart Board" pressed inside a preview window
  useEffect(() => {
    if (!preview) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !event.data || typeof event.data !== 'object') return;
      const msg = event.data as { type?: string; simKey?: string; context?: any };
      if (msg.type === 'EDUVERSE_SIM_LAUNCH_SMARTBOARD' || msg.type === 'EDUVERSE_DSA_LAUNCH_SMARTBOARD') {
        // The teacher may have moved to another simulation inside the preview
        const sim = (msg.simKey && simulations.find((s) => s.id === msg.simKey)) || preview;
        setPreview(null);
        launchOnSmartBoard(sim, { config: msg.context?.config || {}, state: msg.context?.state || undefined });
      }
      if (msg.type === 'EDUVERSE_SIM_CLOSE' || msg.type === 'EDUVERSE_DSA_CLOSE') setPreview(null);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  const previewUrl = (sim: ISimulationDefinition): string | null => {
    if (sim.boardEngine === 'cn') return `/smartboard/cn-simulation.html?${subjectQuery({ sim: sim.id, preview: '1' })}`;
    if (isSmartBoardOsSimulation(sim)) return `/smartboard/os-simulation.html?${subjectQuery({ simulationId: sim.id, category: String(sim.osCategory || ''), title: sim.title, topic: sim.title })}`;
    if (isSmartBoardDsaSimulation(sim)) return `/smartboard/dsa-simulation.html?${subjectQuery({ category: String(sim.dsaCategory || 'searching'), title: sim.title, topic: sim.title })}`;
    return null; // other simulations preview in the built-in runner
  };

  // Render groups: Unit → Topic for a syllabus-mapped library, otherwise one flat grid
  const sections = useMemo(() => {
    if (!byUnit) return [{ key: 'all', heading: '', topics: [{ topic: '', sims: visible }] }];
    const units = Array.from(new Set(visible.map((s) => s.unit as number))).sort((a, b) => a - b);
    return units.map((u) => {
      const sims = visible.filter((s) => s.unit === u);
      const topics = Array.from(new Set(sims.map((s) => s.topic || '')));
      return { key: `unit-${u}`, heading: `Unit ${u} — ${sims[0]?.unitTitle || ''}`, topics: topics.map((t) => ({ topic: t, sims: sims.filter((s) => (s.topic || '') === t) })) };
    });
  }, [visible, byUnit]);

  const card = (sim: ISimulationDefinition) => (
    <div
      key={sim.id}
      className="flex flex-col justify-between rounded-2xl border border-line bg-surface/60 hover:bg-surface hover:border-primary/40 transition-all duration-200 p-4 shadow-sm gap-3"
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl border border-primary/20">{sim.icon}</span>
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block truncate">
              {sim.topic || categoryLabel(sim.category)}
            </span>
            <h4 className="text-sm font-bold text-ink line-clamp-2">{sim.title}</h4>
          </div>
        </div>
        <p className="text-xs text-muted line-clamp-3 leading-relaxed">{sim.shortDescription}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setPreview(sim)}
          className="py-2 rounded-xl border border-line bg-surface-elevated hover:border-primary/50 text-ink text-xs font-semibold transition cursor-pointer"
        >
          👁 Preview
        </button>
        <button
          type="button"
          onClick={() => launchOnSmartBoard(sim)}
          className="py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition shadow-sm cursor-pointer"
        >
          🖥 Launch Smart Board
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-line bg-surface/50 p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl border border-primary/20">🔬</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${domainStyle.badgeBg} ${domainStyle.badgeText} ${domainStyle.border}`}>
                {domain.replace('_', ' ')}
              </span>
              <span className="text-xs font-mono text-muted">
                {subject.subjectCode} • Semester {subject.semester?.semesterNumber || '1'}
              </span>
            </div>
            <h3 className="text-base font-bold text-ink mt-0.5">{subject.subjectName} Simulations</h3>
            <p className="text-xs text-muted">
              {simulations.length} simulation{simulations.length === 1 ? '' : 's'}
              {byUnit ? ` in ${groups.length} units` : ''} · preview here, or launch on the Smart Board.
            </p>
          </div>
        </div>

        {simulations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[{ key: 'ALL', label: 'All', title: '' }, ...groups].map((g) => (
                <button
                  key={g.key}
                  type="button"
                  title={g.title}
                  onClick={() => setSelected(g.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selected === g.key ? 'bg-primary text-white font-bold shadow-sm' : 'bg-surface-elevated text-muted hover:text-ink border border-line'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search simulations or topics…"
              aria-label="Search simulations"
              className="w-full sm:w-60 rounded-xl bg-surface-elevated border border-line px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-primary"
            />
          </div>
        )}
      </div>

      {/* Library */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center bg-surface/30">
          <span className="text-3xl block mb-2">🔬</span>
          <h4 className="text-sm font-bold text-ink">
            {simulations.length === 0 ? 'No simulations are available for this subject yet.' : 'No simulations match your search.'}
          </h4>
        </div>
      ) : (
        sections.map((sec) => (
          <section key={sec.key} className="space-y-3">
            {sec.heading && (
              <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                <span className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold text-white">{sec.heading.split(' — ')[0]}</span>
                {sec.heading.split(' — ')[1]}
              </h3>
            )}
            {sec.topics.map((t) => (
              <div key={t.topic || 'all'} className="space-y-2">
                {t.topic && byUnit && <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{t.topic}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{t.sims.map(card)}</div>
              </div>
            ))}
          </section>
        ))
      )}

      {/* Preview */}
      {preview && previewUrl(preview) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`${preview.title} preview`}>
          <div className="flex h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{preview.title}</p>
                <p className="truncate text-[11px] text-muted">
                  {subject.subjectCode} · {preview.unit ? `Unit ${preview.unit} · ${preview.topic}` : categoryLabel(preview.category)} · Preview
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => { const sim = preview; setPreview(null); launchOnSmartBoard(sim); }}
                  className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white hover:bg-primary/90"
                >
                  🖥 Launch Smart Board
                </button>
                <button type="button" onClick={() => setPreview(null)} className="rounded-xl border border-line px-3 py-2 text-xs font-semibold text-muted hover:text-ink">
                  Close
                </button>
              </div>
            </div>
            <iframe title={`${preview.title} preview`} src={previewUrl(preview) as string} className="min-h-0 w-full flex-1 border-0 bg-white" allow="fullscreen" />
          </div>
        </div>
      )}
      <SimulationModal
        isOpen={Boolean(preview && !previewUrl(preview))}
        definition={preview && !previewUrl(preview) ? preview : null}
        subject={subject}
        onClose={() => setPreview(null)}
        onLaunchSmartBoard={(key, title, ctx) => { setPreview(null); if (onLaunchSmartBoard) onLaunchSmartBoard(key, title, ctx); else if (preview) launchOnSmartBoard(preview); }}
        userRole={isTeacher ? 'teacher' : 'student'}
      />
    </div>
  );
};
