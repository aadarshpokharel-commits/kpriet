import React, { useMemo, useRef } from 'react';
import type { IAssignedSimulation, ISimulationLaunchContext } from './types';

interface DsaSimulationFrameProps {
  assignedSimulation?: IAssignedSimulation | null;
  subject?: {
    _id: string;
    subjectName: string;
    subjectCode: string;
    department?: any;
    semester?: any;
  } | null;
  userRole: 'teacher' | 'student';
  onClose: () => void;
  onLaunchSmartBoard?: (simKey: string, title: string, context?: ISimulationLaunchContext) => void;
}

export const DsaSimulationFrame: React.FC<DsaSimulationFrameProps> = ({
  assignedSimulation,
  subject,
  userRole,
  onClose,
  onLaunchSmartBoard,
}) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const configuration = {
    category: 'searching',
    topic: 'Searching',
    difficulty: 'Beginner',
    defaultExample: '10, 20, 30, 40, 50, 60, 70',
    allowCustomInput: true,
    stepByStep: true,
    showPseudocode: true,
    showComplexity: true,
    ...(assignedSimulation?.simulationConfig?.initialParams || {}),
    description: assignedSimulation?.description || '',
  };
  const source = useMemo(() => {
    const query = new URLSearchParams({
      subjectId: subject?._id || '',
      subjectName: subject?.subjectName || '',
      subjectCode: subject?.subjectCode || '',
      departmentId: String(subject?.department?._id || subject?.department?.id || ''),
      departmentName: String(subject?.department?.name || ''),
      semesterId: String(subject?.semester?._id || subject?.semester?.id || ''),
      semesterNumber: String(subject?.semester?.semesterNumber || '1'),
      role: userRole,
      category: String(configuration.category || 'searching'),
      topic: String(configuration.topic || 'Searching'),
      title: assignedSimulation?.title || 'Data Structures & Algorithms Interactive Lab',
      simulationId: assignedSimulation?._id || '',
      config: JSON.stringify(configuration),
    });
    return `/smartboard/dsa-simulation.html?${query.toString()}`;
  }, [assignedSimulation, subject, userRole, configuration.category, configuration.topic, configuration.defaultExample, configuration.allowCustomInput, configuration.stepByStep, configuration.showPseudocode, configuration.showComplexity]);

  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (message.type === 'EDUVERSE_DSA_CLOSE') onClose();
    if (message.type === 'EDUVERSE_DSA_LAUNCH_SMARTBOARD') {
      const context = message.context as ISimulationLaunchContext | undefined;
      onLaunchSmartBoard?.('cs-dsa-lab', assignedSimulation?.title || 'Data Structures & Algorithms Interactive Lab', {
        ...context,
        simulationId: assignedSimulation?._id || context?.simulationId,
        topic: context?.topic || String(configuration.topic || 'Searching'),
        category: context?.category || String(configuration.category || 'searching'),
        config: { ...configuration, ...(context?.config || {}) },
      });
    }
  };

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl" aria-label="Data Structures and Algorithms simulation">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-ink">{assignedSimulation?.title || 'Data Structures & Algorithms Interactive Lab'}</p>
          <p className="truncate text-[10px] text-muted">{subject ? `${subject.subjectCode} · ${subject.subjectName}` : 'Practice lab'}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:bg-surface-elevated hover:text-ink" aria-label="Close simulation">
          Close
        </button>
      </header>
      <iframe
        ref={frameRef}
        title="Data Structures and Algorithms interactive lab"
        src={source}
        onLoad={() => {}}
        className="min-h-0 w-full flex-1 border-0 bg-white"
        allow="fullscreen"
        referrerPolicy="same-origin"
      />
      <DsaFrameMessageListener onMessage={handleMessage} />
    </section>
  );
};

function DsaFrameMessageListener({
  onMessage,
}: {
  onMessage: (event: MessageEvent) => void;
}) {
  React.useEffect(() => {
    const listener = (event: MessageEvent) => onMessage(event);
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [onMessage]);
  return null;
}
