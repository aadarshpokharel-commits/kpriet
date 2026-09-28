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

SIMULATION_CATALOG.push(...EP_SIMULATION_TEMPLATES, ...EG_SIMULATION_TEMPLATES, ...MA_SIMULATION_TEMPLATES);

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
