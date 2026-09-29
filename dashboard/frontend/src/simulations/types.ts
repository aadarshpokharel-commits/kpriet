export type SimulationDomain = 'MATHEMATICS' | 'PHYSICS' | 'CHEMISTRY' | 'COMPUTER_SCIENCE' | 'CIVIL';

export type MathCategory = 'graphs' | 'calculus visualization' | 'geometry' | 'matrices' | 'engineering mathematics' | 'higher mathematics';
export type PhysicsCategory = 'projectile motion' | 'circular motion' | 'mechanics' | 'waves' | 'engineering physics';
export type CSCategory = 'sorting' | 'data structures' | 'algorithms' | 'networking' | 'data structures & algorithms' | 'operating systems' | 'engineering graphics' | 'electrical & electronics' | 'c programming' | 'problem solving';
export type CivilCategory = 'structural analysis' | 'surveying' | 'construction simulations';
export type ChemistryCategory = 'engineering chemistry';

export type SimulationCategory = MathCategory | PhysicsCategory | ChemistryCategory | CSCategory | CivilCategory;

export interface ISimulationParam {
  key: string;
  label: string;
  type: 'range' | 'select' | 'boolean' | 'number';
  min?: number;
  max?: number;
  step?: number;
  default: any;
  unit?: string;
  options?: { label: string; value: any }[];
  description?: string;
}

export interface ISimulationMetric {
  id: string;
  label: string;
  format: (state: any, params: Record<string, any>) => string;
  badge?: string;
  color?: string;
}

export interface ISimulationEngine<TState = any> {
  createInitialState: (params: Record<string, any>, width: number, height: number) => TState;
  update: (state: TState, params: Record<string, any>, dt: number, width: number, height: number) => TState;
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, state: TState, params: Record<string, any>) => void;
  onPointerDown?: (x: number, y: number, state: TState, params: Record<string, any>) => void;
  onPointerMove?: (x: number, y: number, state: TState, params: Record<string, any>) => void;
  onPointerUp?: (state: TState, params: Record<string, any>) => void;
  reset?: (params: Record<string, any>, width: number, height: number) => TState;
}

export interface ISimulationDefinition {
  id: string;
  title: string;
  domain: SimulationDomain;
  category: SimulationCategory;
  icon: string;
  shortDescription: string;
  detailedDescription: string;
  learningObjectives: string[];
  formulaOverview?: string;
  suggestedUnits: number[];
  smartboardPresetKey?: string;
  parameters: ISimulationParam[];
  metrics: ISimulationMetric[];
  engine: ISimulationEngine;
  tags: string[];
  /** Data Structures & Algorithms simulation (array, stack, …). These run inside the Smart Board. */
  dsaCategory?: string;
  /** Operating Systems simulation (Process, CPU Scheduling, Banker's, Paging, Disk, …). Runs inside Smart Board. */
  osCategory?: string;
  /** C Programming simulation (Execution, Memory, Pointers, Arrays, Structs, …). Runs inside Smart Board. */
  cCategory?: string;
  /** Principles of Data Communication simulation (AM, FM, PM, ASK, FSK, PSK, Error Control, …). Runs inside Smart Board. */
  pdcCategory?: string;
  /** Digital Electronics (U21ECG01) simulation. Runs inside Smart Board. */
  ecgCategory?: string;
  /**
   * Subject words this simulation belongs to (matched against the subject name/code).
   * When set, the simulation is shown only in matching subjects — e.g. networking
   * simulations only in Computer Networks, DSA simulations only in Data Structures, OS simulations only in Operating Systems, C simulations only in C Programming, PDC in Principles of Data Communication.
   */
  subjectKeywords?: string[];
  /** Engine that runs this simulation inside the Smart Board ('dsa', 'cn', 'ep', 'eg', 'ma', 'pdc', 'ee', 'ecg', 'chem'). */
  boardEngine?: 'dsa' | 'cn' | 'ep' | 'eg' | 'ma' | 'pdc' | 'ee' | 'ecg' | 'chem' | 'os';
  /** Engineering Physics: syllabus area of the simulation (laser, fiber-optics, ultrasonics, thermal-fluids, crystal-physics). */
  simulationSubtype?: string;
  /** Syllabus unit / topic (used to organise the subject's simulation library). */
  unit?: number;
  unitTitle?: string;
  topic?: string;
  /** Kept only so older saved assignments still resolve; hidden from the catalogue. */
  legacy?: boolean;
}

/** True when the simulation is one of the DSA simulations that open on the Smart Board. */
export function isSmartBoardDsaSimulation(def?: { id?: string; dsaCategory?: string } | null): boolean {
  return Boolean(def && (def.dsaCategory || def.id === 'cs-dsa-lab'));
}

/** True when the simulation is one of the Operating Systems simulations that open on the Smart Board. */
export function isSmartBoardOsSimulation(def?: { id?: string; osCategory?: string } | null): boolean {
  return Boolean(def && (def.osCategory || (def.id && def.id.startsWith('os-')) || def.id === 'cs-os-lab'));
}

/** True when the simulation is one of the C Programming simulations that open on the Smart Board. */
export function isSmartBoardCSimulation(def?: { id?: string; cCategory?: string } | null): boolean {
  return Boolean(def && (def.cCategory || (def.id && def.id.startsWith('c-')) || def.id === 'cs-c-lab'));
}

/** True when the simulation is one of the Principles of Data Communication simulations. */
export function isSmartBoardPdcSimulation(def?: { id?: string; pdcCategory?: string; boardEngine?: string } | null): boolean {
  return Boolean(def && (def.pdcCategory || def.boardEngine === 'pdc' || (def.id && (def.id.startsWith('pdc-') || def.id.startsWith('am-') || def.id.startsWith('fm-') || def.id.startsWith('comm-')))));
}

export interface IAssignedSimulation {
  _id: string;
  title: string;
  description?: string;
  contentType?: string;
  chapterOrUnit?: number;
  status?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | string;
  simulationConfig?: {
    type: string;
    initialParams?: Record<string, any>;
    controls?: string[];
    smartboardPresetId?: string;
    category?: string;
    domain?: string;
  };
  department?: any;
  semester?: any;
  subject?: any;
  teacher?: {
    _id?: string;
    name?: string;
    email?: string;
    profile?: { designation?: string };
  };
  tags?: string[];
  resourceUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
  learningActivity?: { opened: number; completed: number };
}

export interface ISimulationLaunchContext {
  simulationId?: string;
  topic?: string;
  category?: string;
  config?: Record<string, unknown>;
  state?: Record<string, unknown>;
  /** Syllabus unit of the simulation (used by catalogue labs). */
  unit?: number;
}


export function getDomainLabel(domain: SimulationDomain): string {
  switch (domain) {
    case 'MATHEMATICS':
      return 'Mathematics & Discrete Science';
    case 'PHYSICS':
      return 'Engineering Physics & Dynamics';
    case 'CHEMISTRY':
      return 'Engineering Chemistry';
    case 'COMPUTER_SCIENCE':
      return 'Computing, Algorithms & Data Structures';
    case 'CIVIL':
      return 'Structural & Engineering Mechanics';
    default:
      return domain;
  }
}

export function getDomainColor(domain: SimulationDomain): {
  primary: string;
  badgeBg: string;
  badgeText: string;
  border: string;
} {
  switch (domain) {
    case 'MATHEMATICS':
      return {
        primary: '#6366f1',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
        badgeText: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-800/40',
      };
    case 'PHYSICS':
      return {
        primary: '#0ea5e9',
        badgeBg: 'bg-sky-50 dark:bg-sky-950/40',
        badgeText: 'text-sky-600 dark:text-sky-400',
        border: 'border-sky-200 dark:border-sky-800/40',
      };
    case 'CHEMISTRY':
      return {
        primary: '#b45309',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
        badgeText: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800/40',
      };
    case 'COMPUTER_SCIENCE':
      return {
        primary: '#10b981',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
        badgeText: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800/40',
      };
    case 'CIVIL':
      return {
        primary: '#f59e0b',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
        badgeText: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800/40',
      };
    default:
      return {
        primary: '#64748b',
        badgeBg: 'bg-slate-50 dark:bg-slate-900',
        badgeText: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-800',
      };
  }
}

export function resolveSubjectDomain(subject: {
  subjectCode?: string;
  subjectName?: string;
  department?: any;
}): SimulationDomain {
  const code = (subject.subjectCode || '').toUpperCase();
  const name = (subject.subjectName || '').toLowerCase();
  const deptCode = (
    typeof subject.department === 'object' && subject.department?.code
      ? subject.department.code
      : ''
  ).toUpperCase();
  const deptName = (
    typeof subject.department === 'object' && subject.department?.name
      ? subject.department.name
      : ''
  ).toLowerCase();

  // 1. Mathematics
  if (
    code.startsWith('MA') ||
    code.startsWith('MATH') ||
    name.includes('mathematics') ||
    name.includes('calculus') ||
    name.includes('algebra') ||
    name.includes('statistics') ||
    name.includes('numerical methods') ||
    name.includes('discrete')
  ) {
    return 'MATHEMATICS';
  }

  // 2. Engineering Chemistry
  if (
    code.startsWith('CY') ||
    code.startsWith('CHEM') ||
    name.includes('chemistry') ||
    name.includes('polymer') ||
    name.includes('corrosion') ||
    name.includes('electrochem') ||
    deptName.includes('chemistry')
  ) {
    return 'CHEMISTRY';
  }

  // 3. Physics
  if (
    code.startsWith('PH') ||
    code.startsWith('PHY') ||
    name.includes('physics') ||
    name.includes('optics') ||
    name.includes('electromagnetics') ||
    name.includes('quantum')
  ) {
    return 'PHYSICS';
  }

  // 4. Civil
  if (
    code.startsWith('CE') ||
    code.startsWith('CIVIL') ||
    deptCode === 'CIVIL' ||
    deptCode === 'CE' ||
    deptName.includes('civil') ||
    name.includes('civil') ||
    name.includes('structural') ||
    name.includes('surveying') ||
    name.includes('concrete') ||
    name.includes('mechanics of solids') ||
    name.includes('fluid mechanics') ||
    name.includes('geotechnical') ||
    name.includes('construction')
  ) {
    return 'CIVIL';
  }

  // 5. Computer Science
  return 'COMPUTER_SCIENCE';
}

/** True when the simulation is one of the Engineering Physics simulations that open on the Smart Board. */
export function isSmartBoardEpSimulation(def?: { boardEngine?: string } | null): boolean {
  return Boolean(def && def.boardEngine === 'ep');
}

/** True when the simulation is one of the Engineering Chemistry simulations that open on the Smart Board. */
export function isSmartBoardChemSimulation(def?: { boardEngine?: string; id?: string } | null): boolean {
  return Boolean(def && (def.boardEngine === 'chem' || (def.id && def.id.startsWith('chem-'))));
}

/** Teacher's published configuration of an Engineering Physics simulation (stored in Content.simulationConfig.initialParams). */
export interface IEpPublishedConfig {
  simulationType?: 'engineering-physics' | 'engineering-graphics' | 'engineering-mathematics' | string;
  simulationSubtype?: string;
  defaultParameters?: Record<string, unknown>;
  visualizationMode?: string;
  steps?: string[];
}

/** True when the simulation is one of the Engineering Graphics simulations that open on the Smart Board. */
export function isSmartBoardEgSimulation(def?: { boardEngine?: string } | null): boolean {
  return Boolean(def && def.boardEngine === 'eg');
}

/** True when the simulation is one of the Engineering Mathematics simulations that open on the Smart Board. */
export function isSmartBoardMaSimulation(def?: { boardEngine?: string } | null): boolean {
  return Boolean(def && def.boardEngine === 'ma');
}

/** True when the simulation is one of the Electrical & Electronics (U21EEG01) simulations that open on the Smart Board. */
export function isSmartBoardEeSimulation(def?: { boardEngine?: string } | null): boolean {
  return Boolean(def && def.boardEngine === 'ee');
}

/** True when the simulation is one of the Digital Electronics (U21ECG01) simulations that open on the Smart Board. */
export function isSmartBoardEcgSimulation(def?: { id?: string; ecgCategory?: string; boardEngine?: string } | null): boolean {
  return Boolean(def && (def.ecgCategory || def.boardEngine === 'ecg' || (def.id && (def.id.startsWith('de-') || def.id.startsWith('ecg-')))));
}

/** One Challenge-mode attempt stored in SimulationActivity.challengeAttempts. */
export interface ISimulationChallengeAttempt {
  _id?: string;
  student?: { _id: string; name?: string; email?: string; rollNumber?: string } | string;
  challengeId: string;
  kind: string;
  prompt: string;
  target: number;
  unit?: string;
  tolerance: number;
  configuration?: Record<string, unknown>;
  answer?: { value?: number | null; text?: string };
  calculation?: string;
  attempt: number;
  result: 'CORRECT' | 'INCORRECT';
  verified: boolean;
  serverValue?: number | null;
  submittedAt: string;
}
