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
  /**
   * When set, the template belongs only to subjects whose name or code contains one of these
   * words (e.g. Engineering Physics simulations are not offered to other physics subjects).
   */
  subjectKeywords?: string[];
  /** Syllabus unit / topic for subject-specific libraries. */
  unit?: number;
  topic?: string;
}

/** True when a catalogue template may be used in the given subject. */
export function isTemplateForSubject(template: ISimulationCatalogItem, subject: { subjectCode?: string; subjectName?: string }): boolean {
  if (!template.subjectKeywords || !template.subjectKeywords.length) return true;
  const text = `${subject.subjectName || ''} ${subject.subjectCode || ''}`.toLowerCase();
  return template.subjectKeywords.some((k) => text.includes(k));
}

/**
 * Engineering Physics (U21PH101) — 46 Smart Board simulations (engine: smartboard/ep-simulation.html).
 * A teacher "publishes" one by saving its configuration:
 *   simulationConfig.type = template id, initialParams = { simulationType: 'engineering-physics',
 *   simulationSubtype, defaultParameters, visualizationMode, steps }.
 * Keep in sync with smart-board-my-version/src/tools/ep-catalog.js.
 */
const EP_SUBJECT_KEYWORDS = ['engineering physics', 'u21ph101'];
function epTemplate(id: string, unit: number, subtype: string, topic: string, title: string, description: string): ISimulationCatalogItem {
  return {
    id,
    domain: 'PHYSICS',
    category: 'engineering physics',
    title,
    description,
    suggestedUnits: [unit],
    smartboardPresetKey: id,
    defaultParams: { simulationType: 'engineering-physics', simulationSubtype: subtype, defaultParameters: {}, visualizationMode: '', steps: [] },
    tags: ['Engineering Physics', topic],
    subjectKeywords: EP_SUBJECT_KEYWORDS,
    unit,
    topic,
  };
}

export const EP_SIMULATION_TEMPLATES: ISimulationCatalogItem[] = [
  epTemplate("ep-absorption", 1, "laser", "Absorption", "Absorption and Energy Level Simulator", "A photon whose energy matches E₂ − E₁ lifts an atom to the excited level; other photons pass through."),
  epTemplate("ep-spontaneous-emission", 1, "laser", "Spontaneous Emission", "Spontaneous Emission Simulator", "Excited atoms decay on their own after a random time and emit photons in random directions and phases."),
  epTemplate("ep-stimulated-emission", 1, "laser", "Stimulated Emission", "Stimulated Emission Simulator", "An incoming photon triggers an excited atom to emit an identical photon — same energy, direction and phase."),
  epTemplate("ep-population-inversion", 1, "laser", "Population Inversion", "Population Inversion Visualizer", "Compare level populations in thermal equilibrium (Boltzmann) with an inverted, pumped medium."),
  epTemplate("ep-pumping", 1, "laser", "Pumping", "Laser Pumping Simulator", "Optical, electrical and chemical pumping in a three-level and four-level scheme, with pump rate against threshold."),
  epTemplate("ep-laser-cavity", 1, "laser", "Laser Cavity", "Laser Cavity Simulator", "Light bounces between two mirrors, is amplified on every pass and part of it leaves through the output coupler."),
  epTemplate("ep-co2-laser", 1, "laser", "CO₂ Laser", "CO₂ Laser Conceptual Simulator", "N₂ is excited by the discharge and transfers energy to CO₂; the 10.6 µm transition produces the infrared beam."),
  epTemplate("ep-semiconductor-laser", 1, "laser", "Semiconductor Laser", "Semiconductor Laser Simulator", "Forward-biased p–n junction: electron–hole recombination, threshold current and the emitted wavelength λ = hc/Eg."),
  epTemplate("ep-material-processing", 1, "laser", "Laser Material Processing", "Laser Material Processing Simulator", "Cutting, welding and drilling — how power, spot size and scan speed set the intensity and the heat delivered."),
  epTemplate("ep-sls", 1, "laser", "Selective Laser Sintering", "Selective Laser Sintering Simulator", "Layer by layer: spread powder, scan the cross-section with the laser, lower the platform and repeat."),
  epTemplate("ep-holography", 1, "laser", "Holography", "Holography Simulator", "Recording object and reference beams as an interference pattern, then reconstructing the image."),
  epTemplate("ep-laser-medical", 1, "laser", "Medical Applications of Laser", "Laser Medical Applications Visualizer", "Eye surgery, tissue cutting and coagulation — wavelength, absorption depth and pulse choice."),
  epTemplate("ep-tir", 2, "fiber-optics", "Total Internal Reflection", "Total Internal Reflection Simulator", "Change the incident angle and refractive indices: see refraction, the critical angle and total internal reflection."),
  epTemplate("ep-acceptance-angle", 2, "fiber-optics", "Acceptance Angle", "Acceptance Angle Simulator", "Rays entering inside the acceptance cone are guided; rays outside it leak into the cladding."),
  epTemplate("ep-numerical-aperture", 2, "fiber-optics", "Numerical Aperture", "Numerical Aperture Simulator", "NA = √(n₁² − n₂²): how core and cladding indices set the light-gathering ability of a fibre."),
  epTemplate("ep-single-multi-mode", 2, "fiber-optics", "Single Mode and Multimode Fiber", "Single Mode vs Multimode Fiber", "Core diameter, V-number and number of modes — one path versus many paths and modal dispersion."),
  epTemplate("ep-step-graded-index", 2, "fiber-optics", "Step Index and Graded Index Fiber", "Step Index vs Graded Index Fiber", "Zig-zag rays in a step-index fibre versus curved rays in a graded-index fibre, and the refractive index profile."),
  epTemplate("ep-fiber-communication", 2, "fiber-optics", "Optical Fiber Communication", "Optical Fiber Communication Simulator", "Transmitter → fibre → receiver: attenuation in dB/km, power budget and the received power."),
  epTemplate("ep-bending-loss", 2, "fiber-optics", "Fiber Bending Loss", "Fiber Bending Loss Simulator", "Tighten the bend radius and watch rays fall below the critical angle and leak out of the core."),
  epTemplate("ep-endoscopy", 2, "fiber-optics", "Fiber Optic Endoscopy", "Fiber Optic Endoscopy Visualizer", "Illuminating fibres carry light in; a coherent fibre bundle carries the image back to the eyepiece."),
  epTemplate("ep-piezo-effect", 3, "ultrasonics", "Piezoelectric Effect", "Piezoelectric Effect Simulator", "Direct effect: stress produces voltage. Inverse effect: voltage produces strain. Switch between the two."),
  epTemplate("ep-piezo-generator", 3, "ultrasonics", "Piezoelectric Generator", "Piezoelectric Generator Simulator", "An oscillator drives a quartz crystal; resonance occurs when f = (1/2t)·√(Y/ρ)."),
  epTemplate("ep-acoustic-grating", 3, "ultrasonics", "Acoustic Grating", "Acoustic Grating Visualizer", "Standing ultrasonic waves in a liquid act as a diffraction grating: d sinθ = nλ gives the sound velocity."),
  epTemplate("ep-sonar", 3, "ultrasonics", "SONAR", "SONAR Simulator", "Send an ultrasonic pulse, time the echo and calculate the distance d = v·t/2."),
  epTemplate("ep-ndt", 3, "ultrasonics", "Ultrasonic NDT", "Ultrasonic NDT Simulator", "Pulse-echo testing of a metal block: the flaw echo appears on the A-scan before the back-wall echo."),
  epTemplate("ep-ultrasonic-scanning", 3, "ultrasonics", "Ultrasonic Scanning", "Ultrasonic Scanning Simulator", "A-scan, B-scan and T-M scan modes: how echoes from tissue boundaries are turned into a picture."),
  epTemplate("ep-fetal-doppler", 3, "ultrasonics", "Fetal Heartbeat Detection", "Doppler/Fetal Heartbeat Concept Visualizer", "The Doppler shift Δf = 2f·v·cosθ/c from the moving heart wall reveals the heartbeat."),
  epTemplate("ep-heat-conduction", 4, "thermal-fluids", "Heat Conduction", "Heat Conduction Simulator", "Fourier's law Q/t = kA·ΔT/L — temperature distribution and heat flow along a rod."),
  epTemplate("ep-heat-convection", 4, "thermal-fluids", "Heat Convection", "Heat Convection Simulator", "Hot fluid rises, cool fluid sinks — the convection current and Newton’s law of cooling."),
  epTemplate("ep-thermal-radiation", 4, "thermal-fluids", "Thermal Radiation", "Thermal Radiation Visualizer", "Stefan–Boltzmann law P = εσAT⁴ and Wien’s displacement law λmax·T = 2.898×10⁻³ m·K."),
  epTemplate("ep-thermal-conductivity", 4, "thermal-fluids", "Thermal Conductivity", "Thermal Conductivity Comparison", "Identical rods of copper, aluminium, steel, glass and wood — which conducts heat fastest?"),
  epTemplate("ep-solar-thermal", 4, "thermal-fluids", "Solar Thermal Power", "Solar Thermal Power Simulator", "Collectors concentrate sunlight → heat transfer fluid → steam → turbine → electricity."),
  epTemplate("ep-microwave", 4, "thermal-fluids", "Microwave Heating", "Microwave Heating Simulator", "Water molecules rotate with the 2.45 GHz field; the absorbed energy heats the food: Q = mcΔT."),
  epTemplate("ep-surface-tension", 4, "thermal-fluids", "Surface Tension", "Surface Tension Simulator", "Molecular forces at the surface and capillary rise h = 2T·cosθ/(ρgr)."),
  epTemplate("ep-viscosity", 4, "thermal-fluids", "Viscosity", "Viscosity Simulator", "Compare low- and high-viscosity liquids: layer velocities and Stokes’ terminal velocity of a falling ball."),
  epTemplate("ep-fluid-flow", 4, "thermal-fluids", "Fluid Flow", "Fluid Flow Visualizer", "Reynolds number Re = ρvD/η decides laminar or turbulent flow; continuity A₁v₁ = A₂v₂."),
  epTemplate("ep-unit-cell", 5, "crystal-physics", "Unit Cell", "Unit Cell 3D Visualizer", "Lattice parameters a, b, c and angles α, β, γ — repeat the unit cell to build the crystal."),
  epTemplate("ep-simple-cubic", 5, "crystal-physics", "Simple Cubic", "Simple Cubic Structure", "Atoms at the 8 corners: 1 atom per cell, coordination number 6, packing factor 0.52."),
  epTemplate("ep-bcc", 5, "crystal-physics", "Body-Centered Cubic", "BCC Structure", "Corner atoms plus one at the body centre: 2 atoms per cell, CN 8, APF 0.68."),
  epTemplate("ep-fcc", 5, "crystal-physics", "Face-Centered Cubic", "FCC Structure", "Corner atoms plus face centres: 4 atoms per cell, CN 12, APF 0.74."),
  epTemplate("ep-bravais", 5, "crystal-physics", "Bravais Lattices", "Bravais Lattice Visualizer", "The 7 crystal systems and 14 Bravais lattices with their axial lengths and angles."),
  epTemplate("ep-miller", 5, "crystal-physics", "Miller Indices", "Miller Indices 3D Visualizer", "Choose (h k l) and see the plane cut the X, Y and Z axes, with interplanar spacing d = a/√(h²+k²+l²)."),
  epTemplate("ep-bragg", 5, "crystal-physics", "Bragg's Law", "Bragg's Law Simulator", "2d sinθ = nλ — change wavelength, spacing and angle to find constructive interference."),
  epTemplate("ep-xrd", 5, "crystal-physics", "X-Ray Diffraction", "X-Ray Diffraction Simulator", "Diffraction pattern of SC, BCC and FCC crystals: allowed (h k l) peaks at 2θ from Bragg’s law."),
  epTemplate("ep-czochralski", 5, "crystal-physics", "Czochralski Process", "Czochralski Crystal Growth Simulator", "Molten silicon → seed crystal → rotation and pulling → single crystal → silicon ingot."),
  epTemplate("ep-wafer", 5, "crystal-physics", "Silicon Wafer Formation", "Silicon Wafer Formation Simulator", "Ingot → grinding → slicing → lapping → etching → polishing → cleaned wafers, with the wafer count per ingot."),
];

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

/**
 * Engineering Graphics (U21ME101) — 11 Smart Board simulations (engine: smartboard/eg-simulation.html).
 * Published configuration: simulationConfig.type = template id, initialParams = { simulationType: 'engineering-graphics',
 * simulationSubtype, defaultParameters, visualizationMode, steps }. Keep in sync with smart-board-my-version/src/tools/eg-catalog.js.
 */
const EG_SUBJECT_KEYWORDS = ['engineering graphics', 'u21me101', 'u21meg01'];
function egTemplate(id: string, unit: number, subtype: string, topic: string, title: string, description: string): ISimulationCatalogItem {
  return {
    id,
    domain: 'COMPUTER_SCIENCE',
    category: 'engineering graphics',
    title,
    description,
    suggestedUnits: [unit],
    smartboardPresetKey: id,
    defaultParams: { simulationType: 'engineering-graphics', simulationSubtype: subtype, defaultParameters: {}, visualizationMode: '', steps: [] },
    tags: ['Engineering Graphics', topic],
    subjectKeywords: EG_SUBJECT_KEYWORDS,
    unit,
    topic,
  };
}

export const EG_SIMULATION_TEMPLATES: ISimulationCatalogItem[] = [
  egTemplate("eg-projection-generator", 4, "projection-generator", "3D Object → Projection", "3D Object → Projection Generator", "Flagship: pick a solid, rotate it, choose a view and watch the front, top and side views generate with projection lines."),
  egTemplate("eg-projection-solids", 4, "projection-of-solids", "Projection of Solids", "Projection of Solids", "Prism, pyramid, cylinder and cone — axis perpendicular, inclined to HP, inclined to VP — views drawn stage by stage."),
  egTemplate("eg-section-solids", 4, "section-of-solids", "Section of Solids", "Section of Solids", "Move a cutting plane through a solid: sectional front/top/side views, hatched section and its true shape."),
  egTemplate("eg-development", 4, "development-of-surfaces", "Development of Surfaces", "Development of Surfaces", "Unfold prisms, pyramids, cylinders and cones — including truncated solids — with the key dimensions."),
  egTemplate("eg-geometric-construction", 1, "geometric-construction", "Geometrical Construction", "Geometrical Construction", "Bisectors, angles, regular polygons, circles and tangents — compass-and-ruler steps with snapping."),
  egTemplate("eg-dimensioning", 1, "dimensioning", "Dimensioning", "Dimensioning Simulator", "Linear, angular, radial and diameter dimensions with extension lines, arrowheads and BIS notation."),
  egTemplate("eg-drawing-workspace", 1, "drawing-workspace", "Drawing Workspace", "3D Engineering Drawing Workspace", "Draw lines, circles, arcs and polygons with snapping; select, move, rotate, dimension, generate views and export."),
  egTemplate("eg-orthographic", 3, "orthographic-projection", "Orthographic Projection", "Orthographic Projection", "Front, top and side views of points, lines and planes with reference planes and projectors in all quadrants."),
  egTemplate("eg-isometric", 5, "isometric-projection", "Isometric Projection", "Isometric Projection", "Orthographic views → isometric object and back, isometric axes, isometric scale and projection guides."),
  egTemplate("eg-sectional-view", 5, "sectional-view", "Sectional Views", "Sectional View Simulator", "Cut a machine component with a movable plane — full/half section, hatched areas and sectional views."),
  egTemplate("eg-perspective", 5, "perspective-projection", "Perspective Projection", "Perspective Projection", "Station point, picture plane, ground line, horizon, vanishing points and visual rays — step by step."),
];

/**
 * Engineering Mathematics (U21MA101 · Calculus and Differential Equations) — 29 Smart Board simulations
 * (engine: smartboard/ma-simulation.html). Published configuration: simulationConfig.type = template id,
 * initialParams = { simulationType: 'engineering-mathematics', simulationSubtype, defaultParameters, visualizationMode, steps }.
 * Keep in sync with smart-board-my-version/src/tools/ma-catalog.js.
 */
const MA_SUBJECT_KEYWORDS = ['engineering mathematics', 'u21ma101', 'calculus and differential equations'];
function maTemplate(id: string, unit: number, subtype: string, topic: string, title: string, description: string): ISimulationCatalogItem {
  return {
    id,
    domain: 'MATHEMATICS',
    category: 'engineering mathematics',
    title,
    description,
    suggestedUnits: [unit],
    smartboardPresetKey: id,
    defaultParams: { simulationType: 'engineering-mathematics', simulationSubtype: subtype, defaultParameters: {}, visualizationMode: '', steps: [] },
    tags: ['Engineering Mathematics', topic],
    subjectKeywords: MA_SUBJECT_KEYWORDS,
    unit,
    topic,
  };
}

export const MA_SIMULATION_TEMPLATES: ISimulationCatalogItem[] = [
  maTemplate("ma-matrix-ops", 1, "matrices", "Matrix Operations", "Matrix Operations Visualizer", "Addition, subtraction, scalar multiple, product and transpose — every entry calculated step by step."),
  maTemplate("ma-eigen", 1, "matrices", "Eigenvalues & Eigenvectors", "Eigenvalue & Eigenvector Visualizer", "Flagship: Matrix → det(A − λI) = 0 → eigenvalues → eigenvectors → see which vectors keep their direction."),
  maTemplate("ma-cayley-hamilton", 1, "matrices", "Cayley-Hamilton", "Cayley-Hamilton Theorem Simulator", "Characteristic polynomial, substitute A, verify p(A) = 0 and use it to find A⁻¹."),
  maTemplate("ma-diagonalization", 1, "matrices", "Diagonalization", "Matrix Diagonalization", "Eigenvalues, eigenvectors, modal matrix P, D = P⁻¹AP (or orthogonal Pᵀ A P) and verification."),
  maTemplate("ma-orthogonal", 1, "matrices", "Orthogonal Transformation", "Orthogonal Transformation", "Rotations/reflections preserve lengths and angles; reduce a quadratic form to canonical form."),
  maTemplate("ma-matrix-applications", 1, "matrices", "Applications", "Matrix Applications", "Linear systems, network flow and population models: input → matrix form → calculation → result."),
  maTemplate("ma-partial", 2, "several-variables", "Partial Derivatives", "Partial Derivative Visualizer", "Freeze y and vary x (and vice versa): slices of the surface, fₓ, f_y and higher partial derivatives."),
  maTemplate("ma-total-derivative", 2, "several-variables", "Total Derivative", "Total Derivative Simulator", "du/dt = u_x dx/dt + u_y dy/dt — each component calculated and compared with direct substitution."),
  maTemplate("ma-jacobian", 2, "several-variables", "Jacobians", "Jacobian Visualizer", "Partial derivatives → Jacobian matrix → determinant, and how a small square is mapped."),
  maTemplate("ma-taylor2", 2, "several-variables", "Taylor Series", "Taylor Series for Two Variables", "Flagship: f(x,y) about (a,b): derivatives, terms, polynomial of order 1–4 and the approximation error."),
  maTemplate("ma-extrema", 2, "several-variables", "Extreme Values", "Extreme Values of Two Variables", "Flagship: fₓ = f_y = 0 → critical points → rt − s² test → maximum, minimum or saddle, on contour and 3-D views."),
  maTemplate("ma-lagrange", 2, "several-variables", "Lagrange Multipliers", "Lagrange Multipliers", "Flagship: Objective and constraint → ∇f = λ∇g → candidate points highlighted where level curves touch the constraint."),
  maTemplate("ma-double-integral", 3, "multiple-integrals", "Double Integrals", "Double Integral Visualizer", "Region, inner and outer integration step by step, and the volume under the surface."),
  maTemplate("ma-change-order", 3, "multiple-integrals", "Change of Order", "Change of Order of Integration", "Flagship: Plot the region, find the boundary curves, slice the other way and read the new limits."),
  maTemplate("ma-triple-integral", 3, "multiple-integrals", "Triple Integrals", "Triple Integral Visualizer", "Inner, middle and outer integration over a 3-D region, with the region drawn in 3-D."),
  maTemplate("ma-area", 3, "multiple-integrals", "Area", "Area Using Double Integral", "Area between two curves: intersections, limits and strips building up the area."),
  maTemplate("ma-volume", 3, "multiple-integrals", "Volume", "Volume Using Triple Integral", "Volume of a solid bounded by surfaces — limits, slices and the accumulated volume."),
  maTemplate("ma-line-integral", 4, "vector-calculus", "Line Integral", "Line Integral Visualizer", "∫_C F·dr along a parametrised path: direction, F·r′(t) and the running accumulation."),
  maTemplate("ma-surface-integral", 4, "vector-calculus", "Surface Integral", "Surface Integral Visualizer", "Surface, normal vectors and flux ∬ F·n dS computed through a parametrisation."),
  maTemplate("ma-green", 4, "vector-calculus", "Green's Theorem", "Green's Theorem Simulator", "Flagship: ∮ P dx + Q dy = ∬ (Q_x − P_y) dA — both sides computed and compared."),
  maTemplate("ma-stokes", 4, "vector-calculus", "Stokes' Theorem", "Stokes' Theorem Simulator", "∮ F·dr around the boundary = ∬ (∇×F)·n dS over the surface, in 3-D."),
  maTemplate("ma-gauss", 4, "vector-calculus", "Gauss Divergence Theorem", "Gauss Divergence Theorem Simulator", "∯ F·n dS through a closed surface = ∭ ∇·F dV — outward normals and both sides compared."),
  maTemplate("ma-ode2", 5, "ode", "Second-Order ODE", "Second-Order ODE Solver", "Flagship: a y″ + b y′ + c y = f(x): auxiliary equation, CF, PI, initial conditions and the solution curve."),
  maTemplate("ma-ode-higher", 5, "ode", "Higher-Order ODE", "Higher-Order ODE Solver", "Linear constant-coefficient ODEs up to order 6: characteristic equation, roots and the general solution."),
  maTemplate("ma-ode-constant", 5, "ode", "Constant Coefficient ODE", "Constant Coefficient ODE Simulator", "All root cases (distinct, repeated, complex) with sliders — see the solution curve change live."),
  maTemplate("ma-ode-variable", 5, "ode", "Variable Coefficient ODE", "Variable Coefficient ODE Simulator", "Equations reducible to constant coefficients (x = eᶻ, Legendre linear) and a known-solution reduction of order."),
  maTemplate("ma-euler-cauchy", 5, "ode", "Euler-Cauchy Equation", "Euler-Cauchy Equation Simulator", "x²y″ + a x y′ + b y = f(x): substitution x = eᶻ, auxiliary equation, roots and solution curve."),
  maTemplate("ma-legendre", 5, "ode", "Legendre's Equation", "Legendre's Equation Simulator", "(ax+b)²y″ + … : substitution ax + b = eᶻ, reduced equation and solution; Legendre polynomials Pₙ(x)."),
  maTemplate("ma-variation-params", 5, "ode", "Variation of Parameters", "Variation of Parameters Simulator", "y₁, y₂, Wronskian, u₁ = −∫y₂f/W, u₂ = ∫y₁f/W, particular solution and the final curve."),
];

/**
 * Principles of Data Communication (U21IT201) — 42 Smart Board simulations (engine: smartboard/pdc-simulation.html).
 */
const PDC_SUBJECT_KEYWORDS = ['principles of data communication', 'data communication', 'u21it201', 'u211t201', 'pdc'];
function pdcTemplate(id: string, unit: number, topic: string, title: string, description: string): ISimulationCatalogItem {
  return {
    id,
    domain: 'COMPUTER_SCIENCE',
    category: 'principles of data communication',
    title,
    description,
    suggestedUnits: [unit],
    smartboardPresetKey: id,
    defaultParams: { simulationType: 'pdc', defaultParameters: {}, visualizationMode: '', steps: [] },
    tags: ['Principles of Data Communication', 'PDC', topic],
    subjectKeywords: PDC_SUBJECT_KEYWORDS,
    unit,
    topic,
  };
}

export const PDC_SIMULATION_TEMPLATES: ISimulationCatalogItem[] = [
  // Unit 1: Introduction
  pdcTemplate('comm-elements', 1, 'Communication System Elements', 'Communication System Elements Visualizer', 'Signal flow through Information Source → Transmitter → Channel (Noise) → Receiver → Destination.'),
  pdcTemplate('bandwidth-sim', 1, 'Bandwidth & Spectrum', 'Bandwidth Simulator', 'Analyze signal spectrum, harmonic frequency range, and bandwidth B = f_max - f_min dynamically.'),
  pdcTemplate('comm-channel', 1, 'Communication Channels', 'Communication Channel Simulator', 'Visualize channel distortion, attenuation, AWGN noise, and bandwidth limitation on transmitted waveforms.'),
  pdcTemplate('comm-class', 1, 'Classification of Communication', 'Classification of Communication Systems', 'Interactive visual hierarchy: Analog vs Digital, Baseband vs Bandpass, Guided (Wired) vs Unguided (Wireless).'),
  pdcTemplate('comm-types', 1, 'Types of Communication', 'Types of Communication (Simplex / Duplex)', 'Simulate Simplex (Broadcasting), Half-Duplex (Walkie-Talkie), and Full-Duplex (Telephone) data exchange flows.'),
  pdcTemplate('mod-process', 1, 'Modulation Process', 'Modulation Process Visualizer', 'Observe real-time synthesis: Baseband Message m(t) + High Frequency Carrier c(t) → Modulated Wave.'),
  pdcTemplate('analog-vs-digital', 1, 'Analog vs Digital', 'Analog vs Digital Communication Comparison', 'Side-by-side comparison of continuous sinusoidal signals vs discrete pulse trains under noise and repeaters.'),
  pdcTemplate('comm-limits', 1, 'Limitations of Communication', 'Fundamental Limitations (Nyquist & Shannon)', 'Interactive boundary calculator for Shannon-Hartley Capacity and Nyquist Maximum Data Rate with thermal noise.'),
  pdcTemplate('comm-apps', 1, 'Applications of Communication', 'Applications of Electronic Communication Map', 'Interactive electromagnetic spectrum map linking LF, MF, HF, VHF, UHF, Satellite, and Fiber to real-world applications.'),

  // Unit 2: Amplitude Modulation
  pdcTemplate('am-fdm', 2, 'Frequency Division Multiplexing', 'Frequency Division Multiplexing (FDM)', 'Multiplex multiple baseband signals onto separate RF subcarrier bands with customizable guard bands.'),
  pdcTemplate('am-tdm', 2, 'Time Division Multiplexing', 'Time Division Multiplexing (TDM)', 'Commutator & De-commutator time slot visualization interleaving samples from multiple digital/analog channels.'),
  pdcTemplate('am-principle', 2, 'AM Principle & Waveforms', 'AM Principle Simulator ⭐ (Flagship)', 'Flagship AM laboratory displaying simultaneous Message m(t), Carrier c(t), and Envelope-Modulated s_AM(t).'),
  pdcTemplate('am-spectrum', 2, 'AM Frequency Spectrum', 'Spectrum of AM Wave (Carrier & Sidebands)', 'Interactive frequency spectrum showing Carrier frequency fc, Upper Sideband fc+fm, Lower Sideband fc-fm.'),
  pdcTemplate('am-mod-index', 2, 'Modulation Index & Percentage', 'Modulation Index & Percentage Modulation', 'Calculate modulation index m = (Vmax-Vmin)/(Vmax+Vmin) and visualize under, critical, and over-modulation envelope distortion.'),
  pdcTemplate('am-power', 2, 'Power Content in AM', 'Power Content in AM Wave', 'Step-by-step interactive breakdown of Carrier Power Pc, Sideband Power Psb, Total Power Pt, and Power Efficiency η.'),
  pdcTemplate('am-tx-low', 2, 'Low-Level AM Transmitter', 'Low-Level AM Transmitter Block Diagram', 'Follow audio message → low-power modulator → Class B/C linear RF power amplifiers → Antenna output.'),
  pdcTemplate('am-tx-high', 2, 'High-Level AM Transmitter', 'High-Level AM Transmitter Block Diagram', 'Trace high-efficiency Class-C RF power carrier amplification with high-power audio collector modulation at the final stage.'),
  pdcTemplate('am-superhet', 2, 'Superheterodyne Receiver', 'Basic Superheterodyne Receiver Architecture', 'Interactive stage-by-stage RF tuning, Local Oscillator mixing fLO = fRF + fIF, 455 kHz IF filtering, and Envelope Detector.'),

  // Unit 3: Angle Modulation
  pdcTemplate('angle-mod', 3, 'Angle Modulation', 'Angle Modulation Simulator ⭐', 'Unified visual simulator for constant-amplitude angle modulation: Frequency Modulation (FM) vs Phase Modulation (PM).'),
  pdcTemplate('fm-vs-pm', 3, 'FM vs PM Comparison', 'FM vs PM Phase-Frequency Relationship', 'Explore the mathematical derivative/integral link: FM frequency deviation is ∝ m(t), while PM is ∝ dm(t)/dt.'),
  pdcTemplate('fm-wave', 3, 'FM Wave Simulator', 'FM Wave Simulator (Deviation & Mod Index)', 'Interactive control over Frequency Deviation Δf = kf·Am, Modulation Index β = Δf / fm, and Carson Bandwidth.'),
  pdcTemplate('pm-wave', 3, 'PM Wave Simulator', 'PM Wave Simulator (Phase Deviation)', 'Visualize phase deviation Δθ = kp·Am and phase transitions in the time domain under sinusoidal and triangular signals.'),
  pdcTemplate('fm-types', 3, 'Types of FM (NBFM vs WBFM)', 'FM Types Visualizer (Narrowband vs Wideband)', 'Compare Narrowband FM (β ≤ 0.3, BW ≈ 2fm) with Wideband FM (β > 1, infinite Bessel sidebands Jn(β)).'),
  pdcTemplate('fm-vs-am', 3, 'FM vs AM Comparison', 'FM vs AM Comprehensive Side-by-Side Comparison', 'Direct comparison of AM and FM: Noise immunity, transmitter power efficiency, required bandwidth, and capture effect.'),
  pdcTemplate('fm-direct', 3, 'Direct FM Generation', 'Direct FM Generation (Varactor Modulator)', 'Interactive Hartley/Colpitts oscillator with Varactor diode showing tank capacitance C(v) varying frequency directly.'),
  pdcTemplate('fm-indirect', 3, 'Indirect FM (Armstrong Method)', 'Indirect FM Generation (Armstrong Method)', 'Trace Crystal Oscillator → Phase Modulator with Integrated Audio → Frequency Multiplier chain to generate stable WBFM.'),

  // Unit 4: Digital Modulation
  pdcTemplate('info-capacity', 4, 'Information Capacity', 'Information Capacity Simulator (Hartley & Shannon)', 'Calculate information measure I = log2(1/P), entropy H = -∑ Pi log2 Pi, and maximum channel capacity C.'),
  pdcTemplate('bit-baud', 4, 'Bit vs Baud Rate', 'Bit / Bit Rate / Baud Visualizer', 'Interactive timeline distinguishing Bit Rate Rb = N × Baud from Symbol Rate S across Binary, QPSK, and 16-QAM.'),
  pdcTemplate('waveform-coding', 4, 'Line Coding / Waveform Coding', 'Waveform Coding Simulator (Line Codes)', 'Compare Unipolar NRZ, Polar NRZ-L, NRZ-I, Bipolar AMI, Pseudoternary, and Manchester encoding for DC balance and clock recovery.'),
  pdcTemplate('ask-mod', 4, 'Amplitude Shift Keying (ASK)', 'Amplitude Shift Keying — ASK Simulator ⭐ (Flagship)', 'Digital Amplitude Modulation: Carrier ON for Bit 1, Carrier OFF for Bit 0 (OOK). Coherent and envelope demodulation.'),
  pdcTemplate('fsk-mod', 4, 'Frequency Shift Keying (FSK)', 'Frequency Shift Keying — FSK Simulator ⭐ (Flagship)', 'Binary FSK: Bit 1 transmitted at Mark Frequency f1, Bit 0 transmitted at Space Frequency f0. Phase-continuous BFSK.'),
  pdcTemplate('psk-mod', 4, 'Phase Shift Keying (PSK)', 'Phase Shift Keying — PSK Simulator ⭐ (Flagship)', 'BPSK (0° for 1, 180° for 0) and QPSK constellation mapping with I/Q vector decomposition and phase shifts.'),
  pdcTemplate('dpsk-mod', 4, 'Differential PSK (DPSK)', 'Differential Phase Shift Keying — DPSK Simulator', 'Non-coherent differential encoding: Bit 1 induces a 180° phase change from previous bit, Bit 0 maintains current phase.'),
  pdcTemplate('ber-calc', 4, 'Probability of Error / BER', 'Probability of Error & Bit Error Rate (BER)', 'Monte Carlo bit transmission across AWGN channel with Waterfall BER vs Eb/N0 curves for ASK, FSK, and BPSK.'),

  // Unit 5: Data Communication
  pdcTemplate('ascii-vis', 5, 'Character Codes (ASCII)', 'ASCII Code Interactive Visualizer', 'Convert characters to 7-bit/8-bit ASCII, Binary, Hexadecimal, and transmission waveforms with Start/Stop framing.'),
  pdcTemplate('barcode-vis', 5, 'Barcode Technology', 'Barcode Visualizer (1D Code 39 & UPC / 2D QR)', 'Encode alphanumeric strings into optical barcode bar/space widths and simulate laser/CCD scanning and decoding.'),
  pdcTemplate('error-detect', 5, 'Error Detection Techniques', 'Error Detection Simulator ⭐ (Flagship)', 'Comprehensive error detection lab: Simple Parity (VRC), Longitudinal (LRC), Checksum, and CRC-8 / CRC-16 Polynomial Division.'),
  pdcTemplate('error-correct', 5, 'Error Correction (Hamming Codes)', 'Error Correction Simulator ⭐ (Flagship)', 'Flagship Hamming (7,4) Code laboratory: Encode 4 data bits + 3 parity bits, inject single-bit channel corruption, calculate syndrome vector, and auto-correct.'),
  pdcTemplate('dcom-hardware', 5, 'Data Communication Hardware', 'Data Communication Hardware (DTE / DCE / Hubs)', 'Explore roles and interconnections of Data Terminal Equipment (DTE), Data Circuit-Terminating Equipment (DCE), repeaters, and multiplexers.'),
  pdcTemplate('rs232-serial', 5, 'RS-232 Serial Interface', 'RS-232 Serial Interface Simulator', 'Pinout & timing analyzer for DB-9 / DB-25 connectors: TXD, RXD, RTS, CTS, DTR, DSR, and inverted bipolar voltage levels (-12V = 1, +12V = 0).'),
  pdcTemplate('dcom-circuits', 5, 'Data Communication Circuits', 'Data Communication Circuit Visualizer', 'Interactive signal circuit paths: Point-to-point, Multipoint/Multidrop, Two-wire vs Four-wire telephone circuits, and echo cancellation.'),
  pdcTemplate('modem-sim', 5, 'Modems (Modulator-Demodulator)', 'Modem Simulator (Digital ↔ Analog ↔ Digital)', 'Complete digital data transmission through a phone line: TX UART → FSK/QAM Modulator → Bandpass Channel → Demodulator → RX UART.'),
];

/**
 * Basics of Electrical and Electronics Engineering (U21EEG01) — 35 Smart Board simulations (engine: smartboard/ee-simulation.html)
 * with Learn / Experiment / Challenge modes. Published configuration: simulationConfig.type = template id,
 * initialParams = { simulationType: 'electrical-electronics', simulationSubtype, defaultParameters, visualizationMode, learningMode, steps }.
 * Challenge attempts are verified with constants/ee-challenge.evaluator.ts. Keep in sync with smart-board-my-version/src/tools/ee-catalog.js.
 */
const EE_SUBJECT_KEYWORDS = ['basics of electrical and electronics engineering', 'basic electrical and electronics engineering', 'u21eeg01'];
function eeTemplate(id: string, unit: number, subtype: string, topic: string, title: string, description: string): ISimulationCatalogItem {
  return {
    id,
    domain: 'COMPUTER_SCIENCE',
    category: 'electrical & electronics',
    title,
    description,
    suggestedUnits: [unit],
    smartboardPresetKey: id,
    defaultParams: { simulationType: 'electrical-electronics', simulationSubtype: subtype, defaultParameters: {}, visualizationMode: '', learningMode: 'learn', steps: [] },
    tags: ['Electrical & Electronics', topic],
    subjectKeywords: EE_SUBJECT_KEYWORDS,
    unit,
    topic,
  };
}

export const EE_SIMULATION_TEMPLATES: ISimulationCatalogItem[] = [
  eeTemplate("ee-ohms-law", 1, "electric-circuits", "Ohm's Law", "Ohm's Law Simulator", "Essential: Change V, I or R and watch the other values and the circuit update: V = IR."),
  eeTemplate("ee-series", 1, "electric-circuits", "Series Circuit", "Series Circuit Simulator", "Essential: Add or remove resistors in series: equivalent resistance, one current, voltage across each resistor."),
  eeTemplate("ee-parallel", 1, "electric-circuits", "Parallel Circuit", "Parallel Circuit Simulator", "Essential: Resistor branches in parallel: branch currents, total current and equivalent resistance."),
  eeTemplate("ee-kcl", 1, "electric-circuits", "KCL", "Kirchhoff's Current Law (KCL)", "Essential: Currents entering and leaving a junction — add branches and see ΣI_in = ΣI_out balance."),
  eeTemplate("ee-kvl", 1, "electric-circuits", "KVL", "Kirchhoff's Voltage Law (KVL)", "Essential: Trace a closed loop: voltage rises and drops step by step until ΣV = 0."),
  eeTemplate("ee-star-delta", 1, "electric-circuits", "Star–Delta Conversion", "Star–Delta Conversion", "Essential: Convert Star ↔ Delta resistor networks with the equivalent-resistance formulas."),
  eeTemplate("ee-nodal", 1, "electric-circuits", "Nodal Analysis", "Nodal Analysis Visualizer", "Essential: Reference node → unknown node voltages → KCL equations → solve → node voltages on the circuit."),
  eeTemplate("ee-mesh", 1, "electric-circuits", "Mesh Analysis", "Mesh Analysis Visualizer", "Advanced: Identify meshes, assign mesh currents, apply KVL, solve and show the currents in each branch."),
  eeTemplate("ee-dc-construction", 2, "dc-motor", "Construction", "DC Motor Construction", "Tap a part of the motor — armature, field winding, commutator, brushes, shaft, poles — to learn its job."),
  eeTemplate("ee-dc-working", 2, "dc-motor", "Working Principle", "DC Motor Working Principle", "Essential: Current in a magnetic field → force → torque → rotation; reverse the field or the current."),
  eeTemplate("ee-dc-types", 2, "dc-motor", "Motor Types", "DC Motor Types", "Shunt, series and compound connections of the field and armature, compared visually."),
  eeTemplate("ee-dc-torque", 2, "dc-motor", "Torque", "DC Motor Torque Simulator", "Advanced: T = K·Φ·Ia — change flux and armature current and see the torque respond."),
  eeTemplate("ee-dc-characteristics", 2, "dc-motor", "Characteristics", "DC Motor Characteristics", "Torque–current, speed–current and speed–torque curves for shunt and series motors."),
  eeTemplate("ee-dc-starters", 2, "dc-motor", "Starters", "DC Motor Starters", "Move the starter handle: OFF → start → resistance cut out → running (two-point and three-point)."),
  eeTemplate("ee-dc-speed", 2, "dc-motor", "Speed Control", "DC Motor Speed Control", "Advanced: Armature control and field control — which way the speed moves and why (N ∝ Eb/Φ)."),
  eeTemplate("ee-transformer", 3, "transformer-ac-motor", "Single-Phase Transformer", "Single-Phase Transformer", "Essential: AC source → alternating flux in the core → induced secondary voltage → load."),
  eeTemplate("ee-turns-ratio", 3, "transformer-ac-motor", "Turns Ratio", "Transformer Turns Ratio", "Advanced: V₁/V₂ = N₁/N₂ = I₂/I₁ — the turns on each winding set the output voltage."),
  eeTemplate("ee-step-up-down", 3, "transformer-ac-motor", "Step-Up / Step-Down", "Transformer Step-Up / Step-Down", "More secondary turns step the voltage up, fewer step it down."),
  eeTemplate("ee-im-construction", 3, "transformer-ac-motor", "Induction Motor Construction", "Three-Phase Induction Motor Construction", "Stator, rotor, air gap, windings and shaft — tap each part."),
  eeTemplate("ee-im-working", 3, "transformer-ac-motor", "Induction Motor Working", "Three-Phase Induction Motor Working", "Essential: Three phase currents → rotating magnetic field → induced rotor current → rotation with slip."),
  eeTemplate("ee-im-characteristics", 3, "transformer-ac-motor", "Characteristics", "Induction Motor Characteristics", "Advanced: Torque–slip and torque–speed curves with starting, maximum and full-load torque."),
  eeTemplate("ee-im-starters", 3, "transformer-ac-motor", "Starters", "Induction Motor Starters", "DOL and Star–Delta starters: arrangement, starting sequence and why the starting current matters."),
  eeTemplate("ee-pn-junction", 4, "semiconductor-devices", "PN Junction", "PN Junction Simulator", "Essential: Forward and reverse bias: carriers, depletion region width and current."),
  eeTemplate("ee-pn-vi", 4, "semiconductor-devices", "PN Junction V-I", "PN Junction V-I Characteristics", "Forward knee, reverse saturation and breakdown on the diode V-I curve."),
  eeTemplate("ee-zener", 4, "semiconductor-devices", "Zener Diode", "Zener Diode", "Essential: Reverse breakdown at Vz — the Zener holds its voltage as the input changes."),
  eeTemplate("ee-bjt", 4, "semiconductor-devices", "BJT", "BJT Simulator", "Advanced: NPN / PNP: base current controls collector current — cut-off, active and saturation."),
  eeTemplate("ee-bjt-characteristics", 4, "semiconductor-devices", "BJT Characteristics", "BJT Characteristics", "Input and output characteristics for CE / CB configurations with the operating point."),
  eeTemplate("ee-fet", 4, "semiconductor-devices", "FET", "FET Simulator", "Advanced: Gate voltage narrows the channel: I_D = I_DSS(1 − V_GS/V_P)²."),
  eeTemplate("ee-half-wave", 5, "semiconductor-applications", "Half-Wave Rectifier", "Half-Wave Rectifier", "Essential: AC source → diode → load: conduction only on positive half cycles."),
  eeTemplate("ee-full-wave", 5, "semiconductor-applications", "Full-Wave Rectifier", "Full-Wave Rectifier", "Essential: Centre-tapped and bridge rectifiers — which diodes conduct in each half cycle."),
  eeTemplate("ee-rectifier-compare", 5, "semiconductor-applications", "Rectifier Comparison", "Rectifier Comparison", "Half-wave vs full-wave: waveform, average value, ripple factor and output frequency side by side."),
  eeTemplate("ee-filter", 5, "semiconductor-applications", "Filter", "Filter Simulator", "Advanced: A capacitor filter smooths the rectified output — ripple Vr = I/(f·C)."),
  eeTemplate("ee-regulator", 5, "semiconductor-applications", "Voltage Regulator", "Voltage Regulator", "Advanced: Input → regulator → load: the output stays at its set value as input and load change."),
  eeTemplate("ee-series-shunt", 5, "semiconductor-applications", "Series / Shunt Regulator", "Series and Shunt Voltage Regulators", "Advanced: Series-pass and shunt regulators: arrangement and how each keeps the output steady."),
  eeTemplate("ee-configurations", 5, "semiconductor-applications", "CE / CB / CC", "CE / CB / CC Configurations", "Advanced: Common emitter, base and collector: terminals, current path, gains and characteristics."),
];

/**
 * Digital Electronics (U21ECG01) — 46 Smart Board simulations (engine: smartboard/ecg-simulation.html).
 */
const ECG_SUBJECT_KEYWORDS = [
  'digital electronics',
  'u21ecg01',
  'digital logic',
  'digital circuits',
  'logic design',
  'ecg01',
  'de',
];

function ecgTemplate(id: string, unit: number, topic: string, title: string, description: string): ISimulationCatalogItem {
  return {
    id,
    domain: 'COMPUTER_SCIENCE',
    category: 'digital electronics',
    title,
    description,
    suggestedUnits: [unit],
    smartboardPresetKey: id,
    defaultParams: { simulationType: 'digital-electronics', defaultParameters: {}, visualizationMode: '', steps: [] },
    tags: ['Digital Electronics', 'DE', 'U21ECG01', topic],
    subjectKeywords: ECG_SUBJECT_KEYWORDS,
    unit,
    topic,
  };
}

export const ECG_SIMULATION_TEMPLATES: ISimulationCatalogItem[] = [
  ecgTemplate("de-number-system", 1, "Number Systems", "Number System Simulator", "Convert between Binary, Decimal, Octal, and Hexadecimal with step-by-step division/multiplication conversion traces."),
  ecgTemplate("de-complements", 1, "Complements", "Complements Simulator", "Visualize 1's complement (bit inversion) and 2's complement (invert + 1) operations with step-by-step binary representation."),
  ecgTemplate("de-boolean-theorem", 1, "Boolean Theorems", "Boolean Theorem Visualizer", "Enter Boolean expressions, apply Boolean laws (Commutative, Associative, Distributive, De Morgan's, Absorption), and show each simplification step side-by-side."),
  ecgTemplate("de-logic-gates", 1, "Logic Gates", "Logic Gate Simulator ⭐ (Flagship)", "Interactive AND, OR, NOT, NAND, NOR, XOR, XNOR gates. Change inputs and immediately see gate output, truth table row highlighting, and logic expression."),
  ecgTemplate("de-universal-gates", 1, "NAND/NOR Universal Gates", "NAND/NOR Universal Gate Simulator", "Demonstrate how NOT, AND, OR, XOR can be constructed using only NAND or only NOR gates with equivalent Boolean expression and circuit."),
  ecgTemplate("de-sop-pos", 1, "SOP/POS Representation", "SOP/POS Representation Simulator", "Enter a Boolean function and display Sum of Products (SOP), Product of Sums (POS), canonical forms, and the corresponding truth table."),
  ecgTemplate("de-kmap", 1, "K-Map Simplification", "K-Map Simplification Simulator ⭐ (Flagship)", "Interactive Karnaugh Map: 2/3/4 variable K-Maps. Enter minterms/maxterms, populate the K-map, select groups interactively, visualize grouping, and generate simplified expression with Truth Table → K-Map → Grouping → Simplified Expression pipeline."),
  ecgTemplate("de-quine-mccluskey", 1, "Quine-McCluskey", "Quine-McCluskey Simulator", "Step-by-step Quine-McCluskey minimization: Minterms → Binary Representation → Grouping by 1-count → Prime Implicants → Essential Prime Implicants → Simplified Expression."),
  ecgTemplate("de-half-adder", 2, "Half Adder", "Half Adder Simulator", "Show inputs A, B, Sum (XOR), Carry (AND) with truth table and gate-level implementation diagram."),
  ecgTemplate("de-full-adder", 2, "Full Adder", "Full Adder Simulator", "A, B, Carry-in → Sum, Carry-out with gate-level implementation showing two half adders and an OR gate."),
  ecgTemplate("de-adder-subtractor", 2, "1-Bit Adder/Subtractor", "1-Bit Adder/Subtractor Simulator", "Interactive circuit supporting addition and subtraction with mode selection, carry/borrow visualization, and XOR-based B-complement control."),
  ecgTemplate("de-parallel-adder", 2, "Parallel Adder", "Parallel Adder Simulator", "Connect multiple full-adder stages showing input bits, ripple carry propagation through each stage, output sum, and final carry."),
  ecgTemplate("de-twos-comp-adder", 2, "2's Complement Adder/Subtractor", "2's Complement Adder/Subtractor ⭐ (Flagship)", "Visualize subtraction using 2's complement: Input A, Input B → 2's Complement of B → Binary Addition → Result. Every binary operation shown step-by-step."),
  ecgTemplate("de-mux", 2, "Multiplexer", "Multiplexer Simulator ⭐ (Flagship)", "Interactive 2:1 and 4:1 MUX. Change selection lines and see selected input, output, and internal signal path animation."),
  ecgTemplate("de-decoder", 2, "Decoder", "Decoder Simulator", "Interactive 2-to-4 and 3-to-8 decoder showing input combination, active output line, truth table, and internal AND gate logic."),
  ecgTemplate("de-encoder", 2, "Encoder", "Encoder Simulator", "Select an active input line and see the corresponding encoded binary output. Priority encoder handles multiple active inputs."),
  ecgTemplate("de-demux", 2, "Demultiplexer", "Demultiplexer Simulator", "Show input, select lines, active output, and signal path animation. 1-to-4 and 1-to-8 DEMUX configurations."),
  ecgTemplate("de-code-converter", 2, "Code Converter", "Code Converter Simulator", "Interactive conversion environment: BCD ↔ Excess-3, BCD ↔ Gray Code, Binary ↔ Gray with truth table and conversion logic."),
  ecgTemplate("de-error-detection", 2, "Error Detection and Correction", "Error Detection & Correction Code Simulator", "Interactive data transmission: Data → Hamming Encoding → Transmission → Error Injection → Detection / Correction → Recovered Data."),
  ecgTemplate("de-parity", 2, "Parity Generator/Checker", "Parity Generator & Checker ⭐ (Flagship)", "Even and Odd parity: Enter data bits, see generated parity bit, transmitted data, insert errors, receive data, check parity, and error indication."),
  ecgTemplate("de-nor-latch", 3, "NOR Latch", "NOR Latch Simulator", "Interactive SR latch using cross-coupled NOR gates. Show S, R, Q, Q̅, state changes, invalid state, and complete truth table."),
  ecgTemplate("de-nand-latch", 3, "NAND Latch", "NAND Latch Simulator", "Interactive NAND-based S̅R̅ latch with active-low inputs, cross-coupled gate visualization, and state transition table."),
  ecgTemplate("de-digital-pulse", 3, "Digital Pulses", "Digital Pulse Simulator", "Interactive clock/pulse generator with adjustable frequency and duty cycle. Visual timing waveform showing period, rise/fall edges."),
  ecgTemplate("de-clocked-ff", 3, "Clocked Flip-Flops", "Clocked Flip-Flop Simulator", "Interactive SR, D, JK, and T flip-flops with clock edge triggering. Show clock, inputs, outputs, state changes, and timing diagram."),
  ecgTemplate("de-master-slave", 3, "Master-Slave Flip-Flop", "Master-Slave Flip-Flop ⭐ (Flagship)", "Visualize Master → Slave → Output: Master captures on clock HIGH, Slave transfers on clock LOW. Shows how the two stages prevent race conditions."),
  ecgTemplate("de-async-inputs", 3, "Asynchronous Inputs", "Asynchronous Inputs Simulator", "Demonstrate Preset and Clear asynchronous input behavior that overrides clock-controlled operation."),
  ecgTemplate("de-ff-timing", 3, "Flip-Flop Timing", "Flip-Flop Timing Simulator", "Interactive timing diagrams showing Clock, Input, Output, propagation delay, setup time, hold time, and timing relationships."),
  ecgTemplate("de-ff-conversion", 3, "Flip-Flop Conversion", "Flip-Flop Conversion Simulator", "Convert between SR, D, JK, T flip-flop types. Show existing FF → required logic → converted FF → verification truth table."),
  ecgTemplate("de-seq-model", 4, "Sequential Circuit Model", "Sequential Circuit Model Visualizer", "General sequential circuit model: Input → Combinational Logic → State/Memory → Output. Visualize feedback and state relationships."),
  ecgTemplate("de-mealy", 4, "Mealy Machine", "Mealy Machine Simulator", "Create a simple Mealy state machine: define states, inputs, outputs on transitions, and trace current state with input sequences."),
  ecgTemplate("de-moore", 4, "Moore Machine", "Moore Machine Simulator", "Create a Moore state machine: define states with associated outputs, transitions based on inputs, and trace state/output sequences."),
  ecgTemplate("de-excitation-table", 4, "Excitation Table", "Excitation Table Simulator", "Select a flip-flop type (SR, D, JK, T) and display its excitation table showing required inputs for each state transition."),
  ecgTemplate("de-state-table", 4, "State Table / State Diagram", "State Table & State Diagram Simulator", "Create states, define transitions, enter outputs, generate state table and interactive state diagram with animated transitions."),
  ecgTemplate("de-sync-design", 4, "Synchronous Sequential Circuit Design", "Synchronous Sequential Circuit Designer ⭐ (Flagship)", "Interactive workflow: Problem → State Definition → State Table → Excitation Table → Logic Simplification (K-Map) → Circuit → Simulation."),
  ecgTemplate("de-sync-up", 4, "Synchronous Up Counter", "Synchronous Up Counter", "Interactive counter showing clock, current state, binary count, flip-flop states, and timing sequence for synchronous up counting."),
  ecgTemplate("de-sync-down", 4, "Synchronous Down Counter", "Synchronous Down Counter", "Reverse counting sequence with clock, state, and timing visualization. Shows J/K inputs for down-counting logic."),
  ecgTemplate("de-sync-updown", 4, "Synchronous Up/Down Counter", "Synchronous Up/Down Counter", "Up/Down control input changes counting direction immediately. Visualize mode switching and bidirectional counting."),
  ecgTemplate("de-mod-counter", 4, "Modulus Counter", "Modulus Counter Simulator", "Select a modulus (MOD-N). Show state sequence, counter states, reset condition, and identify unused states."),
  ecgTemplate("de-async-counter", 4, "Asynchronous Counter", "Asynchronous (Ripple) Counter Simulator", "Visualize ripple propagation through cascaded flip-flops. Clock enters first stage, state changes ripple through subsequent stages with propagation delay."),
  ecgTemplate("de-sequence-detector", 4, "Sequence Detector", "Sequence Detector ⭐ (Flagship)", "Enter a target sequence (e.g., 1011). Create the state-machine visualization with state diagram, input stream, current state, transitions, and detection output."),
  ecgTemplate("de-shift-register", 5, "Shift Registers", "Shift Register Simulator ⭐ (Flagship)", "Interactive SISO, SIPO, PISO, PIPO shift register. Visualize data movement through Q3→Q2→Q1→Q0 on every clock pulse. Support left/right shift."),
  ecgTemplate("de-ring-counter", 5, "Ring Counter", "Ring Counter Simulator", "Circulating bit pattern (single 1 among 0s) through the register. Visualize the walking 1 with timing diagram."),
  ecgTemplate("de-johnson-counter", 5, "Johnson Counter", "Johnson Counter Simulator", "Inverted feedback (Q̅_last → Q_first) mechanism with 2N unique states from N flip-flops. Show state sequence and decode logic."),
  ecgTemplate("de-hazard", 5, "Hazards", "Hazard Simulator ⭐ (Flagship)", "Interactive static and dynamic hazard demonstration: input transition, propagation delay through different gate paths, temporary unwanted output glitch."),
  ecgTemplate("de-essential-hazard", 5, "Essential Hazards", "Essential Hazard Simulator", "Demonstrate essential hazards in asynchronous sequential circuits caused by unequal delays in feedback paths."),
  ecgTemplate("de-hazard-free", 5, "Hazard-Free Circuits", "Hazard-Free Circuit Designer", "Modify logic circuits to remove hazards: Hazardous Circuit → Identify Hazard → Add Redundant Logic (consensus term) → Hazard-Free Circuit → Verify."),
];

SIMULATION_CATALOG.push(...ECG_SIMULATION_TEMPLATES, ...PDC_SIMULATION_TEMPLATES, ...EP_SIMULATION_TEMPLATES, ...EG_SIMULATION_TEMPLATES, ...MA_SIMULATION_TEMPLATES, ...EE_SIMULATION_TEMPLATES);

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
