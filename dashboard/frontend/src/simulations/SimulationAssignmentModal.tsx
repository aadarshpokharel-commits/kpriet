import React, { useState } from 'react';
import type { ISimulationDefinition } from './types';


interface SimulationAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableSimulations: ISimulationDefinition[];
  subject: {
    _id: string;
    subjectName: string;
    subjectCode: string;
    syllabus?: { unitNumber: number; title: string }[];
  };
  onAssign: (payload: {
    simulationId: string;
    chapterOrUnit: number;
    title: string;
    description: string;
    customParams?: Record<string, unknown>;
    status: 'PUBLISHED' | 'DRAFT';
  }) => Promise<void>;
}

export const SimulationAssignmentModal: React.FC<SimulationAssignmentModalProps> = ({
  isOpen,
  onClose,
  availableSimulations,
  subject,
  onAssign,
}) => {
  const [selectedSimId, setSelectedSimId] = useState<string>(
    availableSimulations[0]?.id || ''
  );
  const [unitNumber, setUnitNumber] = useState<number>(1);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [dsaSettings, setDsaSettings] = useState({
    topic: 'Searching',
    category: 'searching',
    difficulty: 'Beginner',
    defaultExample: '10, 20, 30, 40, 50, 60, 70',
    allowCustomInput: true,
    stepByStep: true,
    showPseudocode: true,
    showComplexity: true,
  });
  const [status, setStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedTemplate =
    availableSimulations.find((s) => s.id === selectedSimId) ||
    availableSimulations[0];

  const isDsaTemplate = Boolean(selectedTemplate && (selectedTemplate.dsaCategory || selectedTemplate.id === 'cs-dsa-lab'));
  const isOsTemplate = Boolean(selectedTemplate && (selectedTemplate.osCategory || selectedTemplate.id?.startsWith('os-')));

  const handleTemplateChange = (id: string) => {
    setSelectedSimId(id);
    const tmpl = availableSimulations.find((s) => s.id === id);
    if (tmpl?.dsaCategory) {
      setDsaSettings((current) => ({
        ...current,
        category: tmpl.dsaCategory as string,
        topic: tmpl.title,
        defaultExample: tmpl.dsaCategory === 'sorting' ? '5, 3, 8, 1, 2' : '10, 20, 30, 40, 50, 60, 70',
      }));
    }
    if (tmpl) {
      setCustomTitle(tmpl.title);
      setCustomDescription(tmpl.shortDescription);
      if (tmpl.suggestedUnits.length > 0 && tmpl.suggestedUnits[0] !== undefined) {
        setUnitNumber(tmpl.suggestedUnits[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSimId) {
      setError('Please select a simulation template.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onAssign({
        simulationId: selectedSimId,
        chapterOrUnit: Number(unitNumber),
        title: customTitle.trim() || selectedTemplate?.title || 'Simulation',
        description:
          customDescription.trim() || selectedTemplate?.shortDescription || '',
        ...(isDsaTemplate
          ? {
              customParams: {
                ...dsaSettings,
                category: selectedTemplate?.dsaCategory || dsaSettings.category,
                topic: selectedTemplate?.dsaCategory
                  ? (dsaSettings.category === selectedTemplate.dsaCategory && dsaSettings.topic) || selectedTemplate.title
                  : dsaSettings.topic,
              },
            }
          : isOsTemplate
          ? {
              customParams: {
                simulationId: selectedTemplate?.id,
                category: selectedTemplate?.osCategory,
                topic: selectedTemplate?.title,
              },
            }
          : {}),
        status,
      });
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to assign simulation.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-surface border border-line shadow-2xl p-6 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-line mb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary text-xl">
              🔬
            </span>
            <div>
              <h3 className="text-lg font-bold text-ink">
                Assign Simulation to Subject
              </h3>
              <p className="text-xs text-muted">
                Associate interactive virtual labs with {subject.subjectCode} -{' '}
                {subject.subjectName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-ink hover:bg-surface-elevated transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">
              Choose Domain Simulation Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
              {availableSimulations.map((sim) => {
                const isSelected = sim.id === selectedSimId;
                return (
                  <button
                    type="button"
                    key={sim.id}
                    onClick={() => handleTemplateChange(sim.id)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-line bg-surface/50 hover:bg-surface-elevated'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0 mt-0.5">
                      {sim.icon}
                    </span>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-ink truncate">
                          {sim.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-primary font-medium block capitalize">
                        {sim.category}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unit / Chapter and Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Syllabus Chapter / Unit
              </label>
              <select
                value={unitNumber}
                onChange={(e) => setUnitNumber(Number(e.target.value))}
                className="w-full rounded-xl bg-surface-elevated border border-line px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-primary cursor-pointer"
              >
                {[1, 2, 3, 4, 5].map((u) => {
                  const unitTitle = subject.syllabus?.find(
                    (s) => s.unitNumber === u
                  )?.title;
                  return (
                    <option key={u} value={u}>
                      Unit {u} {unitTitle ? `- ${unitTitle}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Student Access Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'PUBLISHED' | 'DRAFT')
                }
                className="w-full rounded-xl bg-surface-elevated border border-line px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="PUBLISHED">
                  Enabled (Published & Accessible by Students)
                </option>
                <option value="DRAFT">
                  Disabled (Draft - Hidden from Students)
                </option>
              </select>
            </div>
          </div>

          {/* Custom Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">
              Display Title
            </label>
            <input
              type="text"
              value={customTitle || selectedTemplate?.title || ''}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Parabolic Trajectory Virtual Experiment"
              className="w-full rounded-xl bg-surface-elevated border border-line px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-primary"
            />
          </div>

          {/* Custom Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">
              Instructor Notes / Description
            </label>
            <textarea
              rows={2}
              value={customDescription || selectedTemplate?.shortDescription || ''}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Provide instructions or lab objectives for students..."
              className="w-full rounded-xl bg-surface-elevated border border-line px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {isDsaTemplate && (
            <section className="space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4" aria-labelledby="dsa-assignment-settings">
              <div>
                <h4 id="dsa-assignment-settings" className="text-xs font-bold text-ink">DSA Lab Settings</h4>
                <p className="mt-0.5 text-[10px] text-muted">Choose the starting topic and learning supports for this assignment.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {!selectedTemplate?.dsaCategory && (
                <label className="space-y-1 text-[11px] font-semibold text-ink">Starting topic
                  <select value={dsaSettings.category} onChange={(e) => setDsaSettings((current) => ({ ...current, category: e.target.value, topic: e.target.selectedOptions[0]?.textContent || current.topic }))} className="w-full rounded-lg border border-line bg-surface-elevated px-3 py-2 text-xs">
                    {[
                      ['array', 'Array'], ['stack', 'Stack'], ['queue', 'Queue'], ['circular-queue', 'Circular Queue'],
                      ['linked-list', 'Linked List'], ['binary-tree', 'Binary Tree'], ['bst', 'Binary Search Tree'],
                      ['graph', 'Graph BFS / DFS'], ['searching', 'Searching'], ['sorting', 'Sorting'],
                    ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                )}
                <label className="space-y-1 text-[11px] font-semibold text-ink">Topic label
                  <input value={dsaSettings.topic} onChange={(e) => setDsaSettings((current) => ({ ...current, topic: e.target.value }))} maxLength={120} className="w-full rounded-lg border border-line bg-surface-elevated px-3 py-2 text-xs" />
                </label>
                <label className="space-y-1 text-[11px] font-semibold text-ink">Difficulty
                  <select value={dsaSettings.difficulty} onChange={(e) => setDsaSettings((current) => ({ ...current, difficulty: e.target.value }))} className="w-full rounded-lg border border-line bg-surface-elevated px-3 py-2 text-xs">
                    <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                  </select>
                </label>
                <label className="space-y-1 text-[11px] font-semibold text-ink">Default example
                  <input value={dsaSettings.defaultExample} onChange={(e) => setDsaSettings((current) => ({ ...current, defaultExample: e.target.value }))} maxLength={200} className="w-full rounded-lg border border-line bg-surface-elevated px-3 py-2 text-xs font-mono" />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {([
                  ['allowCustomInput', 'Allow students to edit input data'],
                  ['stepByStep', 'Enable step-by-step controls'],
                  ['showPseudocode', 'Show pseudocode'],
                  ['showComplexity', 'Show complexity panel'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-lg border border-line/70 bg-surface/60 px-3 py-2 text-[11px] font-medium text-ink">
                    <input type="checkbox" checked={dsaSettings[key]} onChange={(e) => setDsaSettings((current) => ({ ...current, [key]: e.target.checked }))} className="h-4 w-4 accent-emerald-600" />
                    {label}
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-line flex items-center justify-between">
            <span className="text-[11px] text-muted font-mono">
              Strict isolation: {selectedTemplate?.domain} domain only
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-ink hover:bg-surface-elevated transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Assigning...' : 'Assign Simulation 🔬'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
