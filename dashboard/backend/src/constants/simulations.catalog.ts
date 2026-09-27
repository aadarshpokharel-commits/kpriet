export type SimulationDomain = 'MATHEMATICS' | 'PHYSICS' | 'COMPUTER_SCIENCE' | 'CIVIL';

export interface ISimulationCatalogItem {
  id: string;
  domain: SimulationDomain;
  category: string;
  title: string;
  description: string;
  suggestedUnits: number[];
  smartboardPresetKey: string;
  defaultParams: Record<string, any>;
  tags: string[];
}

export const SIMULATION_CATALOG: ISimulationCatalogItem[] = [
  // ─── MATHEMATICS ───
  {
    id: 'math-graphs',
    domain: 'MATHEMATICS',
    category: 'graphs',
    title: 'Dynamic Function Plotter & Tangent Analyzer',
    description: 'Plot trigonometric, polynomial, and exponential functions with live derivative tangents, critical points, and root analysis.',
    suggestedUnits: [1, 2],
    smartboardPresetKey: 'math-graphs',
    defaultParams: {
      funcType: 'sin',
      amplitude: 2,
      frequency: 1,
      phase: 0,
      verticalShift: 0,
      showTangent: true,
      showGrid: true,
    },
    tags: ['Calculus', 'Algebra', 'Trigonometry', 'Curves', 'Graphs'],
  },
  {
    id: 'math-calculus',
    domain: 'MATHEMATICS',
    category: 'calculus visualization',
    title: 'Riemann Sums & Definite Integral Visualizer',
    description: 'Visual approximation of definite integrals through dynamic rectangular Riemann slices and trapezoidal summations with live error calculation.',
    suggestedUnits: [2, 3],
    smartboardPresetKey: 'math-calculus',
    defaultParams: {
      funcType: 'quadratic',
      lowerBound: -1,
      upperBound: 3,
      partitions: 16,
      method: 'midpoint',
    },
    tags: ['Integrals', 'Riemann Sums', 'Area Under Curve', 'Approximation'],
  },
  {
    id: 'math-geometry',
    domain: 'MATHEMATICS',
    category: 'geometry',
    title: 'Regular Polygon & Euclidean Geometry Solver',
    description: 'Interactive geometry solver rendering interior angle sectors, apothems, circumcircles, and inscribed circles for arbitrary n-gons.',
    suggestedUnits: [1, 4],
    smartboardPresetKey: 'math-geometry',
    defaultParams: {
      sides: 6,
      radius: 140,
      showCircumcircle: true,
      showInscribedCircle: true,
      showApothem: true,
      showAngleArcs: true,
    },
    tags: ['Polygons', 'Angles', 'Circle Theorems', 'Trigonometry'],
  },
  {
    id: 'math-matrices',
    domain: 'MATHEMATICS',
    category: 'matrices',
    title: '2D Linear Transformation & Eigenvector Grid',
    description: 'Deform 2D coordinate space via matrix transformations. Track basis vectors, determinant area scaling, and invariant eigenvector axes.',
    suggestedUnits: [3, 5],
    smartboardPresetKey: 'math-matrices',
    defaultParams: {
      a: 1.5,
      b: 0.5,
      c: 0.5,
      d: 1.5,
      preset: 'custom',
      showUnitSquare: true,
      showEigenvectors: true,
    },
    tags: ['Linear Algebra', 'Determinants', 'Eigenvalues', 'Transformations'],
  },

  // ─── PHYSICS ───
  {
    id: 'physics-projectile',
    domain: 'PHYSICS',
    category: 'projectile motion',
    title: 'Ballistic Projectile & Trajectory Kinematics',
    description: 'Simulate 2D projectile motion under gravitational acceleration and aerodynamic drag. Tracks range, peak height, and impact velocity.',
    suggestedUnits: [1, 2],
    smartboardPresetKey: 'physics-projectile',
    defaultParams: {
      velocity: 35,
      angle: 45,
      initialHeight: 0,
      gravity: 9.81,
      drag: 0.005,
    },
    tags: ['Kinematics', 'Parabolic Motion', 'Gravity', 'Drag', 'Vectors'],
  },
  {
    id: 'physics-circular',
    domain: 'PHYSICS',
    category: 'circular motion',
    title: 'Centripetal Force & Orbital Dynamics Lab',
    description: 'Visualize uniform and non-uniform circular motion with real-time centripetal acceleration, tension vectors, and orbital velocities.',
    suggestedUnits: [2, 3],
    smartboardPresetKey: 'physics-circular',
    defaultParams: {
      radius: 5,
      angularVelocity: 2.5,
      mass: 2,
      showVectors: true,
      trailLength: 50,
    },
    tags: ['Dynamics', 'Centripetal Force', 'Angular Velocity', 'Period'],
  },
  {
    id: 'physics-mechanics',
    domain: 'PHYSICS',
    category: 'mechanics',
    title: 'Inclined Plane & Friction Mechanics Lab',
    description: 'Explore Newton’s laws on an inclined ramp with static and kinetic friction, normal reaction forces, and critical slipping angles.',
    suggestedUnits: [1, 3],
    smartboardPresetKey: 'physics-mechanics',
    defaultParams: {
      inclineAngle: 30,
      mass: 5,
      staticFriction: 0.5,
      kineticFriction: 0.35,
      appliedForce: 0,
    },
    tags: ['Newton Laws', 'Friction', 'Free Body Diagram', 'Forces'],
  },
  {
    id: 'physics-waves',
    domain: 'PHYSICS',
    category: 'waves',
    title: 'Wave Superposition & Interference Lab',
    description: 'Real-time harmonic wave interference with constructive and destructive superposition, standing wave nodes, and beat frequencies.',
    suggestedUnits: [3, 4],
    smartboardPresetKey: 'physics-waves',
    defaultParams: {
      freq1: 2.0,
      amp1: 35,
      freq2: 2.0,
      amp2: 35,
      phaseShift: 0,
      mode: 'superposition',
    },
    tags: ['Acoustics', 'Superposition', 'Interference', 'Standing Waves'],
  },

  // ─── COMPUTER SCIENCE ───
  // Data Structures & Algorithms: ten simulations of one DSA engine, each opened on the Smart Board.
  {
    id: 'dsa-array',
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures & algorithms',
    title: 'Arrays',
    description: 'Insert, delete and traverse elements with index-by-index steps.',
    suggestedUnits: [1],
    smartboardPresetKey: 'dsa-array',
    defaultParams: {
      category: 'array',
      topic: 'Arrays',
      difficulty: 'Beginner',
      defaultExample: '10, 20, 30, 40, 50, 60, 70',
      allowCustomInput: true,
      stepByStep: true,
      showPseudocode: true,
      showComplexity: true,
    },
    tags: ['DSA', 'Arrays'],
  },
  {
    id: 'dsa-stack',
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures & algorithms',
    title: 'Stack',
    description: 'Push, pop and peek with overflow and underflow checks (LIFO).',
    suggestedUnits: [1, 2],
    smartboardPresetKey: 'dsa-stack',
    defaultParams: {
      category: 'stack',
      topic: 'Stack',
      difficulty: 'Beginner',
      defaultExample: '10, 20, 30, 40, 50, 60, 70',
      allowCustomInput: true,
      stepByStep: true,
      showPseudocode: true,
      showComplexity: true,
    },
    tags: ['DSA', 'Stack'],
  },
  {
    id: 'dsa-queue',
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures & algorithms',
    title: 'Queue',
    description: 'Enqueue and dequeue with front and rear pointers (FIFO).',
    suggestedUnits: [2],
    smartboardPresetKey: 'dsa-queue',
    defaultParams: {
      category: 'queue',
      topic: 'Queue',
      difficulty: 'Beginner',
      defaultExample: '10, 20, 30, 40, 50, 60, 70',
      allowCustomInput: true,
      stepByStep: true,
      showPseudocode: true,
      showComplexity: true,
    },
    tags: ['DSA', 'Queue'],
  },
  {
    id: 'dsa-circular-queue',
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures & algorithms',
    title: 'Circular Queue',
    description: 'Circular wrap-around with front and rear pointers in a fixed buffer.',
    suggestedUnits: [2],
    smartboardPresetKey: 'dsa-circular-queue',
    defaultParams: {
      category: 'circular-queue',
      topic: 'Circular Queue',
      difficulty: 'Beginner',
      defaultExample: '10, 20, 30, 40, 50, 60, 70',
      allowCustomInput: true,
      stepByStep: true,
      showPseudocode: true,
      showComplexity: true,
    },
    tags: ['DSA', 'Circular Queue'],
  },
  {
    id: 'dsa-linked-list',
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures & algorithms',
    title: 'Linked List',
    description: 'Insert at head, tail or position, delete and search nodes.',
    suggestedUnits: [2],
    smartboardPresetKey: 'dsa-linked-list',
    defaultParams: {
      category: 'linked-list',
      topic: 'Linked List',
      difficulty: 'Beginner',
      defaultExample: '10, 20, 30, 40, 50, 60, 70',
      allowCustomInput: true,
      stepByStep: true,
      showPseudocode: true,
      showComplexity: true,
    },
    tags: ['DSA', 'Linked List'],
  },
  {
    id: 'dsa-binary-tree',
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures & algorithms',
    title: 'Binary Tree',
    description: 'Level-order insertion with in-order, pre-order and post-order traversals.',
    suggestedUnits: [3],
    smartboardPresetKey: 'dsa-binary-tree',
    defaultParams: {
      category: 'binary-tree',
      topic: 'Binary Tree',
      difficulty: 'Beginner',
      defaultExample: '10, 20, 30, 40, 50, 60, 70',
      allowCustomInput: true,
      stepByStep: true,
      showPseudocode: true,
      showComplexity: true,
    },
    tags: ['DSA', 'Binary Tree'],
  },
  {
    id: 'dsa-bst',
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures & algorithms',
    title: 'Binary Search Tree',
    description: 'Insert, search and find minimum / maximum in a BST.',
    suggestedUnits: [3],
    smartboardPresetKey: 'dsa-bst',
    defaultParams: {
      category: 'bst',
      topic: 'Binary Search Tree',
      difficulty: 'Beginner',
      defaultExample: '10, 20, 30, 40, 50, 60, 70',
      allowCustomInput: true,
      stepByStep: true,
      showPseudocode: true,
      showComplexity: true,
    },
    tags: ['DSA', 'Binary Search Tree'],
  },
  {
    id: 'dsa-graph',
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures & algorithms',
    title: 'Graph Traversal (BFS & DFS)',
    description: 'Breadth-first and depth-first traversal over the adjacency list.',
    suggestedUnits: [4],
    smartboardPresetKey: 'dsa-graph',
    defaultParams: {
      category: 'graph',
      topic: 'Graph Traversal (BFS & DFS)',
      difficulty: 'Beginner',
      defaultExample: '10, 20, 30, 40, 50, 60, 70',
      allowCustomInput: true,
      stepByStep: true,
      showPseudocode: true,
      showComplexity: true,
    },
    tags: ['DSA', 'Graph Traversal (BFS & DFS)'],
  },
  {
    id: 'dsa-searching',
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures & algorithms',
    title: 'Searching (Linear & Binary)',
    description: 'Linear search and binary search, with a sorted-input check.',
    suggestedUnits: [5],
    smartboardPresetKey: 'dsa-searching',
    defaultParams: {
      category: 'searching',
      topic: 'Searching (Linear & Binary)',
      difficulty: 'Beginner',
      defaultExample: '10, 20, 30, 40, 50, 60, 70',
      allowCustomInput: true,
      stepByStep: true,
      showPseudocode: true,
      showComplexity: true,
    },
    tags: ['DSA', 'Searching (Linear & Binary)'],
  },
  {
    id: 'dsa-sorting',
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures & algorithms',
    title: 'Sorting Algorithms',
    description: 'Bubble, Selection, Insertion, Merge and Quick Sort step by step.',
    suggestedUnits: [5],
    smartboardPresetKey: 'dsa-sorting',
    defaultParams: {
      category: 'sorting',
      topic: 'Sorting Algorithms',
      difficulty: 'Beginner',
      defaultExample: '5, 3, 8, 1, 2',
      allowCustomInput: true,
      stepByStep: true,
      showPseudocode: true,
      showComplexity: true,
    },
    tags: ['DSA', 'Sorting Algorithms'],
  },
  // Older single "Interactive Lab" entry — kept so existing assignments keep working.
  {
    id: 'cs-dsa-lab',
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures & algorithms',
    title: 'Data Structures & Algorithms Interactive Lab',
    description: 'A reusable step-by-step lab for arrays, data structures, searching, sorting, trees, and graph traversal.',
    suggestedUnits: [1, 2, 3],
    smartboardPresetKey: 'cs-dsa-lab',
    defaultParams: {
      category: 'searching',
      topic: 'Searching',
      difficulty: 'Beginner',
      defaultExample: '10, 20, 30, 40, 50, 60, 70',
      allowCustomInput: true,
      stepByStep: true,
      showPseudocode: true,
      showComplexity: true,
    },
    tags: ['DSA', 'Data Structures', 'Algorithms', 'Searching', 'Sorting', 'Trees', 'Graphs'],
  },
  {
    id: 'cs-sorting',
    domain: 'COMPUTER_SCIENCE',
    category: 'sorting',
    title: 'Algorithmic Sorting Step-by-Step Race',
    description: 'Compare Bubble, Selection, Insertion, Merge, and Quick Sort in real time with comparison meters, swap tallies, and complexity bounds.',
    suggestedUnits: [1, 2],
    smartboardPresetKey: 'cs-sorting',
    defaultParams: {
      algorithm: 'quick',
      arraySize: 24,
      distribution: 'random',
    },
    tags: ['Algorithms', 'Complexity', 'Arrays', 'Divide & Conquer'],
  },
  {
    id: 'cs-datastructures',
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures',
    title: 'Binary Search Tree & AVL Balance Explorer',
    description: 'Interactive tree hierarchy showing node insertion, search path traversal, tree balance factors, and depth computations.',
    suggestedUnits: [2, 3],
    smartboardPresetKey: 'cs-datastructures',
    defaultParams: {
      autoBalance: true,
      initialValues: [50, 30, 70, 20, 40, 60, 80],
    },
    tags: ['Trees', 'Binary Search', 'AVL', 'Recursion', 'Hierarchies'],
  },
  {
    id: 'cs-algorithms',
    domain: 'COMPUTER_SCIENCE',
    category: 'algorithms',
    title: 'Graph Pathfinding & Search Visualizer (BFS / DFS / Dijkstra)',
    description: 'Pathfinding engine on a grid matrix exploring shortest paths using BFS, DFS, and Dijkstra’s algorithm through obstacles and weighted cells.',
    suggestedUnits: [3, 4],
    smartboardPresetKey: 'cs-algorithms',
    defaultParams: {
      algorithm: 'dijkstra',
      gridDensity: 'medium',
      allowDiagonals: false,
    },
    tags: ['Pathfinding', 'Graphs', 'BFS', 'Dijkstra', 'Heuristics'],
  },
  {
    id: 'cs-networking',
    domain: 'COMPUTER_SCIENCE',
    category: 'networking',
    title: 'IPv4 CIDR Subnetting & Packet Flow Simulator',
    description: 'Simulate packet transmission across subnet topologies with CIDR prefix masks, router queues, latency delays, and packet drop rates.',
    suggestedUnits: [4, 5],
    smartboardPresetKey: 'cs-networking',
    defaultParams: {
      cidrPrefix: 26,
      generationRate: 4,
      packetLossPercent: 2,
      topology: 'router-subnets',
    },
    tags: ['Networking', 'CIDR', 'Subnetting', 'Packets', 'Routers'],
  },

  // ─── CIVIL ENGINEERING ───
  {
    id: 'civil-structural',
    domain: 'CIVIL',
    category: 'structural analysis',
    title: 'Beam Shear Force & Bending Moment (SFD/BMD) Analyzer',
    description: 'Compute and plot support reactions, shear force diagrams (SFD), bending moment diagrams (BMD), and elastic deflection for loaded beams.',
    suggestedUnits: [1, 2],
    smartboardPresetKey: 'civil-structural',
    defaultParams: {
      spanLength: 8,
      loadType: 'combined',
      pointLoad: 40,
      pointLoadPosition: 4,
      udlIntensity: 12,
    },
    tags: ['Structures', 'Beams', 'SFD', 'BMD', 'Deflection', 'Reactions'],
  },
  {
    id: 'civil-surveying',
    domain: 'CIVIL',
    category: 'surveying',
    title: 'Theodolite Triangulation & Differential Levelling',
    description: 'Virtual total station and theodolite setup calculating height of instrument, target reduced level, and trigonometric distances.',
    suggestedUnits: [2, 3],
    smartboardPresetKey: 'civil-surveying',
    defaultParams: {
      targetDistance: 60,
      verticalAngle: 15,
      instrumentHeight: 1.5,
      benchmarkRL: 100.0,
      backsight: 1.45,
    },
    tags: ['Surveying', 'Theodolite', 'Levelling', 'Triangulation', 'RL'],
  },
  {
    id: 'civil-construction',
    domain: 'CIVIL',
    category: 'construction simulations',
    title: 'Concrete Slump Test & Stress-Strain Mechanics',
    description: 'Simulate ASTM/IS concrete slump cone release and stress-strain constitutive behavior for structural concrete and rebar grades.',
    suggestedUnits: [3, 4],
    smartboardPresetKey: 'civil-construction',
    defaultParams: {
      concreteGrade: 'M25',
      waterCementRatio: 0.48,
      plasticizer: 0.5,
    },
    tags: ['Concrete', 'Slump Test', 'Workability', 'Stress-Strain', 'Materials'],
  },
];

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

  // 2. Physics
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

  // 3. Civil
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

  // 4. Computer Science
  return 'COMPUTER_SCIENCE';
}
