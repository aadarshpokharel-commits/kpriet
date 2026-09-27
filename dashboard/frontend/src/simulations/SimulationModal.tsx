import React from 'react';
import type { ISimulationDefinition, IAssignedSimulation, ISimulationLaunchContext } from './types';
import { SimulationFrameworkRunner } from './SimulationFrameworkRunner';
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
  onClose: () => void;
  onLaunchSmartBoard?: (simKey: string, title: string, context?: ISimulationLaunchContext) => void;
  userRole?: 'teacher' | 'student';
}

export const SimulationModal: React.FC<SimulationModalProps> = ({
  isOpen,
  definition,
  assignedSimulation,
  subject,
  onClose,
  onLaunchSmartBoard,
  userRole = 'student',
}) => {
  if (!isOpen || !definition) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-6xl h-[90vh] max-h-[860px] flex flex-col">
        {definition.id === 'cs-dsa-lab' ? (
          <DsaSimulationFrame
            assignedSimulation={assignedSimulation}
            subject={subject}
            userRole={userRole}
            onClose={onClose}
            onLaunchSmartBoard={onLaunchSmartBoard}
          />
        ) : (
          <SimulationFrameworkRunner
            definition={definition}
            assignedSimulation={assignedSimulation}
            subject={subject}
            onClose={onClose}
            onLaunchSmartBoard={onLaunchSmartBoard}
          />
        )}
      </div>
    </div>
  );
};
