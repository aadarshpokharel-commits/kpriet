/**
 * Universal Simulation AI Context Engine
 * Provides subject-agnostic, simulation-agnostic context normalization,
 * 3-level question generation (Default, Contextual, Free), and unified API dispatch.
 */

export interface ISimulationContext {
  department?: string;
  programme?: string;
  regulation?: string;
  semester?: string | number;
  subject?: string;
  subjectCode?: string;
  unit?: number | string;
  unitTitle?: string;
  topic?: string;
  subtopic?: string;
  simulation?: string;
  simulationId?: string;
  simulationType?: string;
  currentStep?: {
    stepNumber?: number;
    totalSteps?: number;
    whatIsHappening?: string;
    why?: string;
    next?: string;
    title?: string;
    description?: string;
  } | string | number;
  currentState?: Record<string, any>;
  parameters?: Record<string, any>;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  formulas?: string[] | string;
  calculations?: Record<string, any> | string;
  selectedObject?: {
    type?: string;
    name?: string;
    id?: string;
    state?: any;
    value?: any;
    description?: string;
  } | string | null;
  curriculumContext?: string;
  teacherMaterials?: string;
  subjectRAGContext?: string;
  intent?: 'WHAT' | 'WHY' | 'WHERE' | 'WHEN' | 'HOW' | 'APPLICATIONS' | 'REAL_WORLD' | 'EXPLAIN_SIMULATION' | 'FREE_QUERY';
  role?: 'teacher' | 'student';
}

export interface IAIQuestionItem {
  id: string;
  label: string;
  question: string;
  intent: ISimulationContext['intent'];
  icon: string;
}

export interface ISimulationAiResponse {
  directAnswer: string;
  explanation: string;
  additionalExplanation?: string;
  courseMaterialStatus?: 'FOUND' | 'PARTIAL' | 'NOT_FOUND';
  chapterOrUnit?: string;
  confidenceScore?: number;
  answer?: string;
}

/**
 * Normalizes any simulation's raw context into the universal schema
 */
export function normalizeSimulationContext(raw: Partial<ISimulationContext> & Record<string, any>): ISimulationContext {
  const simName = raw.simulation || raw.title || raw.simulationId || raw.name || raw.topic || 'Interactive Simulation';
  const topicName = raw.topic || raw.subtopic || simName;

  return {
    department: raw.department || raw.departmentName || '',
    programme: raw.programme || raw.programmeName || '',
    regulation: raw.regulation || '',
    semester: raw.semester || raw.semesterNumber || '',
    subject: raw.subject || raw.subjectName || '',
    subjectCode: raw.subjectCode || '',
    unit: raw.unit || raw.chapterOrUnit || raw.unitNumber || 1,
    unitTitle: raw.unitTitle || (raw.unit ? `Unit ${raw.unit}` : 'Unit 1'),
    topic: topicName,
    subtopic: raw.subtopic || '',
    simulation: simName,
    simulationId: raw.simulationId || raw.id || raw.smartboardPresetId || raw.smartboardPresetKey || '',
    simulationType: raw.simulationType || raw.category || 'interactive-lab',
    currentStep: raw.currentStep || raw.step || 1,
    currentState: raw.currentState || raw.state || {},
    parameters: raw.parameters || raw.params || {},
    inputs: raw.inputs || {},
    outputs: raw.outputs || raw.metrics || {},
    formulas: raw.formulas || raw.formulaOverview || '',
    calculations: raw.calculations || {},
    selectedObject: raw.selectedObject || null,
    curriculumContext: raw.curriculumContext || '',
    teacherMaterials: raw.teacherMaterials || '',
    subjectRAGContext: raw.subjectRAGContext || '',
    role: raw.role === 'teacher' ? 'teacher' : 'student',
  };
}

/**
 * Generates Level 1 Default Questions adapted to the subject domain
 */
export function getDefaultQuestions(context: ISimulationContext): IAIQuestionItem[] {
  const code = (context.subjectCode || '').toUpperCase();
  const name = (context.subject || '').toLowerCase();
  const sim = context.simulation || 'this concept';

  let whyLabel = 'Why is it used?';
  let whereLabel = 'Where is it used?';
  let whenLabel = 'When is it used?';
  let appLabel = 'Engineering Applications';

  if (name.includes('math') || code.includes('MA')) {
    whyLabel = 'Why do we use this?';
    whereLabel = 'Where is it used in engineering?';
    whenLabel = 'When would an engineer use it?';
    appLabel = 'Mathematical & Engineering Uses';
  } else if (name.includes('program') || name.includes('c ') || code.includes('CS101') || code.includes('CSG01')) {
    whyLabel = 'Why is this used in programming?';
    whereLabel = 'Where is this used in real software?';
    whenLabel = 'When should a developer use it?';
    appLabel = 'Software & System Applications';
  } else if (name.includes('electron') || name.includes('circuit') || code.includes('EC') || code.includes('EE')) {
    whyLabel = 'Why is this circuit/logic used?';
    whereLabel = 'Where is it used in electronics?';
    whenLabel = 'When would an engineer choose this circuit?';
    appLabel = 'Hardware & Electronic Applications';
  } else if (name.includes('network') || name.includes('communicat') || code.includes('IT201') || code.includes('CS501')) {
    whyLabel = 'Why is this protocol/mechanism needed?';
    whereLabel = 'Where is it used in real networks?';
    whenLabel = 'When is it triggered in transmission?';
    appLabel = 'Network & Telecom Applications';
  } else if (name.includes('operat') || code.includes('CS403')) {
    whyLabel = 'Why is this OS policy used?';
    whereLabel = 'Where is it used in OS kernels?';
    whenLabel = 'When does the scheduler/OS choose it?';
    appLabel = 'Kernel & Systems Applications';
  } else if (name.includes('physic') || code.includes('PH')) {
    whyLabel = 'Why does this phenomenon matter?';
    whereLabel = 'Where is it applied in physics/optics?';
    whenLabel = 'When is this principle applied?';
    appLabel = 'Physical & Experimental Applications';
  }

  return [
    {
      id: 'what',
      label: 'What is this?',
      question: `What is the core concept behind ${sim} in ${context.subject || 'this subject'}?`,
      intent: 'WHAT',
      icon: '💡',
    },
    {
      id: 'why',
      label: whyLabel,
      question: `Why is ${sim} used? Explain both the conceptual reason and practical engineering purpose.`,
      intent: 'WHY',
      icon: '🎯',
    },
    {
      id: 'where',
      label: whereLabel,
      question: `Where is ${sim} used in real-world engineering, industry systems, and production technologies?`,
      intent: 'WHERE',
      icon: '🌐',
    },
    {
      id: 'when',
      label: whenLabel,
      question: `When should an engineer or developer choose to apply ${sim}? What are the decision criteria and operational conditions?`,
      intent: 'WHEN',
      icon: '⏱️',
    },
    {
      id: 'how',
      label: 'How does it work?',
      question: `How does ${sim} work step-by-step? Break down the analytical mechanism and state transitions.`,
      intent: 'HOW',
      icon: '⚙️',
    },
    {
      id: 'applications',
      label: appLabel,
      question: `What are 2 to 5 concrete engineering/technical applications for ${sim}? Detail the practical problem that exists and how this concept solves it.`,
      intent: 'APPLICATIONS',
      icon: '🏗️',
    },
    {
      id: 'example',
      label: 'Real-World Example',
      question: `Can you give a vivid, realistic real-world engineering example demonstrating ${sim}?`,
      intent: 'REAL_WORLD',
      icon: '🌍',
    },
    {
      id: 'explain',
      label: 'Explain This Simulation',
      question: `Explain exactly what I am looking at in this active simulation right now. Break down the components, active parameters, formulas, and what changes when inputs are adjusted.`,
      intent: 'EXPLAIN_SIMULATION',
      icon: '🔍',
    },
  ];
}

/**
 * Generates Level 2 Contextual Questions tailored to the active simulation ID and state
 */
export function getContextualQuestions(context: ISimulationContext): IAIQuestionItem[] {
  const id = (context.simulationId || '').toLowerCase();
  const sim = context.simulation || 'this module';
  const questions: IAIQuestionItem[] = [];

  if (id.includes('crc') || id.includes('error')) {
    questions.push(
      { id: 'ctx_crc_poly', label: 'Polynomial Choice', question: 'How does the generator polynomial degree affect burst error detection in CRC?', intent: 'HOW', icon: '🔢' },
      { id: 'ctx_crc_corrupt', label: 'Bit Corruption', question: 'What happens at the receiver when bit errors are injected into the frame during transmission?', intent: 'EXPLAIN_SIMULATION', icon: '⚠️' },
      { id: 'ctx_crc_vs_chk', label: 'CRC vs Checksum', question: 'Why is CRC preferred over a simple additive checksum in Ethernet and Wi-Fi links?', intent: 'WHY', icon: '⚖️' },
    );
  } else if (id.includes('round-robin') || id.includes('sched') || id.includes('os-cpu')) {
    questions.push(
      { id: 'ctx_rr_quantum', label: 'Time Quantum', question: 'Why does Round Robin use a time quantum, and what happens if the quantum is set too small or too large?', intent: 'WHY', icon: '⏱️' },
      { id: 'ctx_rr_wait', label: 'Waiting Time', question: 'How does time-slicing affect average turnaround time and waiting time compared to FCFS?', intent: 'APPLICATIONS', icon: '📊' },
      { id: 'ctx_rr_overhead', label: 'Context Switch', question: 'How does hardware context-switching overhead restrict the minimum practical time slice in modern OS kernels?', intent: 'WHEN', icon: '⚙️' },
    );
  } else if (id.includes('page') || id.includes('memory') || id.includes('tlb')) {
    questions.push(
      { id: 'ctx_page_fault', label: 'Page Fault Cost', question: 'Why does a page fault trigger a major OS trap, and how does the kernel service it?', intent: 'HOW', icon: '💾' },
      { id: 'ctx_frag', label: 'Fragmentation', question: 'How does paging eliminate external fragmentation while still introducing internal fragmentation?', intent: 'WHY', icon: '🧩' },
    );
  } else if (id.includes('gate') || id.includes('kmap') || id.includes('de-') || id.includes('hazard')) {
    questions.push(
      { id: 'ctx_gate_glitch', label: 'Timing Glitches', question: 'Why do unequal gate propagation delays cause static hazards and momentary output glitches?', intent: 'WHY', icon: '⚡' },
      { id: 'ctx_kmap_redund', label: 'Consensus Term', question: 'How does adding a redundant consensus circle in the K-map create a hazard-free circuit?', intent: 'HOW', icon: '🛡️' },
      { id: 'ctx_univ_nand', label: 'Universal Logic', question: 'Why are NAND and NOR gates called universal gates, and why are they favored in silicon fabrication?', intent: 'WHERE', icon: '🔬' },
    );
  } else if (id.includes('taylor') || id.includes('u1_') || id.includes('surf')) {
    questions.push(
      { id: 'ctx_taylor_order', label: 'Order vs Accuracy', question: 'How does incrementing the Taylor polynomial order alter the error bound near the operating point?', intent: 'HOW', icon: '📈' },
      { id: 'ctx_tangent_plane', label: 'Tangent Plane', question: 'Where does the first-order Taylor plane touch the surface, and how do partial derivatives set its slope?', intent: 'EXPLAIN_SIMULATION', icon: '📐' },
      { id: 'ctx_radius_conv', label: 'Convergence', question: 'When does the Taylor series fail to converge for non-analytic or discontinuous functions?', intent: 'WHEN', icon: '⚠️' },
    );
  } else if (id.includes('vector') || id.includes('u3_') || id.includes('curl') || id.includes('div')) {
    questions.push(
      { id: 'ctx_curl_rot', label: 'Vorticity & Paddle', question: 'What does the rotation direction of the paddle wheel signify about curl and fluid circulation?', intent: 'HOW', icon: '🌪️' },
      { id: 'ctx_div_flux', label: 'Source vs Sink', question: 'How does divergence relate outward normal flux density to local field sources and sinks?', intent: 'EXPLAIN_SIMULATION', icon: '💥' },
      { id: 'ctx_greens_conv', label: "Green's Theorem", question: "How does Green's theorem convert line circulation around a boundary into double surface curl?", intent: 'APPLICATIONS', icon: '🔄' },
    );
  } else if (id.includes('ode') || id.includes('u4_') || id.includes('u5_')) {
    questions.push(
      { id: 'ctx_ode_phase', label: 'Phase Portrait', question: 'How do the eigenvalues of the characteristic equation determine whether the phase origin is a center, saddle, or spiral sink?', intent: 'HOW', icon: '🧭' },
      { id: 'ctx_ode_damping', label: 'Damping Regimes', question: 'When does a second-order system transition between overdamped, critically damped, and underdamped response?', intent: 'WHEN', icon: '🎛️' },
    );
  } else if (id.includes('am-') || id.includes('fm-') || id.includes('pdc-') || id.includes('mod')) {
    questions.push(
      { id: 'ctx_mod_index', label: 'Modulation Index', question: 'What happens to the carrier envelope when modulation index exceeds 100% (overmodulation)?', intent: 'EXPLAIN_SIMULATION', icon: '〰️' },
      { id: 'ctx_snr_ber', label: 'SNR & BER', question: 'How does channel additive noise spread constellation points and increase the Bit Error Rate (BER)?', intent: 'WHY', icon: '📉' },
    );
  } else if (id.includes('c-') || id.includes('pointer') || id.includes('dsa-')) {
    questions.push(
      { id: 'ctx_stack_heap', label: 'Memory Layout', question: 'How does local variable allocation on the stack differ from heap allocation in this execution step?', intent: 'HOW', icon: '🧱' },
      { id: 'ctx_pointer_addr', label: 'Pointer Mechanics', question: 'What does the memory address highlight represent, and why does dereferencing an invalid pointer crash the process?', intent: 'EXPLAIN_SIMULATION', icon: '🔗' },
    );
  } else {
    // Dynamic parameter-based contextual questions
    const pKeys = Object.keys(context.parameters || {});
    if (pKeys.length > 0) {
      questions.push({
        id: 'ctx_dyn_param1',
        label: `Tuning ${pKeys[0]}`,
        question: `How does modifying the parameter "${pKeys[0]}" alter the output response in this ${sim} simulation?`,
        intent: 'EXPLAIN_SIMULATION',
        icon: '🎚️',
      });
    }
    questions.push({
      id: 'ctx_dyn_tradeoff',
      label: 'Design Trade-offs',
      question: `What are the core engineering trade-offs when optimizing the parameters of ${sim}?`,
      intent: 'WHEN',
      icon: '⚖️',
    });
  }

  return questions.slice(0, 4);
}

/**
 * Universal API dispatch to query the existing subject RAG and OpenAI service
 */
export async function askSimulationAi(
  question: string,
  context: ISimulationContext,
  options?: {
    selection?: { type?: string; content?: string };
    authToken?: string;
  }
): Promise<ISimulationAiResponse> {
  const normCtx = normalizeSimulationContext(context);
  const token = options?.authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('eduverse_token') || sessionStorage.getItem('token') : '');

  const payload = {
    subjectId: normCtx.subjectCode || normCtx.subject,
    question,
    chapter: normCtx.unit,
    topic: normCtx.topic,
    simulationContext: normCtx,
    boardContext: {
      currentTopic: normCtx.topic,
      currentLesson: normCtx.simulation,
      selectedObjectType: options?.selection?.type || (normCtx.selectedObject ? 'Selected simulation object' : undefined),
      selectedObjectContent: options?.selection?.content || (normCtx.selectedObject ? JSON.stringify(normCtx.selectedObject) : undefined),
      simulationContext: normCtx,
    },
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response | null = null;
  for (const path of ['/api/v1/ai/query', '/api/ai/query']) {
    try {
      response = await fetch(path, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (response.status !== 404) break;
    } catch (e) {
      // try next path
    }
  }

  if (!response) {
    throw new Error('Unable to connect to Eduverse AI service. Please verify your network connection.');
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || json.error || `AI query failed with status ${response.status}`);
  }

  const data = json.data || json;
  return {
    directAnswer: data.directAnswer || data.answer || 'No direct answer available.',
    explanation: data.explanation || '',
    additionalExplanation: data.additionalExplanation || '',
    courseMaterialStatus: data.courseMaterialStatus || 'PARTIAL',
    chapterOrUnit: data.chapterOrUnit || `${normCtx.unitTitle} · ${normCtx.topic}`,
    confidenceScore: data.confidenceScore ?? 0.95,
    answer: data.answer || [data.directAnswer, data.explanation, data.additionalExplanation].filter(Boolean).join('\n\n'),
  };
}
