import React from 'react';
import type { ISimulationDefinition, IAssignedSimulation, ISimulationLaunchContext } from './types';
import { SimulationShell } from './SimulationShell';
import { DsaSimulationFrame } from './DsaSimulationFrame';

interface SimulationModalProps {
  isOpen: boolean;
  definition: ISimulationDefinition | null;
  assignedSimulation?: IAssignedSimulation | null;
  subject?: {
    _id: string;
    subjectName: string;
    subjectCode: string;
    department?: any;
    semester?: any;
  } | null;
  siblingSimulations?: ISimulationDefinition[];
  onSelectSimulation?: (sim: ISimulationDefinition) => void;
  onClose: () => void;
  onLaunchSmartBoard?: (simKey: string, title: string, context?: ISimulationLaunchContext) => void;
  userRole?: 'teacher' | 'student';
  iframeUrl?: string | null;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({
  isOpen,
  definition,
  assignedSimulation,
  subject,
  siblingSimulations,
  onSelectSimulation,
  onClose,
  onLaunchSmartBoard,
  userRole = 'student',
  iframeUrl,
}) => {
  if (!isOpen || !definition) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-7xl h-[95vh] max-h-[920px] flex flex-col">
        {iframeUrl ? (
          <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-slate-900 px-5 py-3 text-white">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{definition.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wide">
                      {definition.domain || 'Simulation'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {subject ? `${subject.subjectCode} • ${subject.subjectName}` : ''}
                      {definition.unit ? ` • Unit ${definition.unit}` : ''}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white truncate mt-0.5">
                    {definition.title}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (onLaunchSmartBoard) {
                      onLaunchSmartBoard(definition.smartboardPresetKey || definition.id, definition.title, {
                        topic: definition.topic,
                        category: definition.id,
                        config: {},
                      });
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  🖥 Launch Smart Board
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  aria-label="Close simulation"
                >
                  ✕ Close
                </button>
              </div>
            </header>
            <div className="flex-1 min-h-0 w-full relative bg-slate-950">
              <iframe
                title={definition.title}
                src={iframeUrl}
                className="w-full h-full border-0 block"
                allow="fullscreen; clipboard-write; clipboard-read"
              />
            </div>
          </section>
        ) : definition.id === 'cs-dsa-lab' ? (
          <DsaSimulationFrame
            assignedSimulation={assignedSimulation}
            subject={subject}
            userRole={userRole}
            onClose={onClose}
            onLaunchSmartBoard={onLaunchSmartBoard}
          />
        ) : (
          <SimulationShell
            definition={definition}
            assignedSimulation={assignedSimulation}
            subject={subject}
            siblingSimulations={siblingSimulations}
            onSelectSimulation={onSelectSimulation}
            onClose={onClose}
            onLaunchSmartBoard={onLaunchSmartBoard}
            iframeUrl={iframeUrl}
          />
        )}
      </div>
    </div>
  );
};
