import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  Department,
  Semester,
  Subject,
  User,
  TeacherAssignment,
  Content,
} from '../src/models/index.js';
import {
  UserRole,
  AccountStatus,
  ApprovalStatus,
  TeacherAssignmentStatus,
  ContentType,
  ContentStatus,
} from '../src/types/academic.types.js';

interface SimulationSpec {
  subjectCode: string;
  title: string;
  description: string;
  unit: number;
  type: string;
  smartboardPresetId: string;
  tags: string[];
  initialParams?: Record<string, unknown>;
  controls?: string[];
}

const SEMESTER_SIMULATIONS: SimulationSpec[] = [
  // ══════════════════════════════════════════════════════════════
  // SEMESTER 1
  // ══════════════════════════════════════════════════════════════
  // Calculus and Differential Equations / Multivariable Calculus
  {
    subjectCode: 'U21MA101',
    title: 'Dynamic Function Plotter & Tangent Derivative Analyzer',
    description:
      'Real-time visualization of multi-variable functions, partial derivatives, local tangent planes, and critical point extrema.',
    unit: 1,
    type: 'PARTIAL_DERIVATIVE_PLOTTER',
    smartboardPresetId: 'math-graphs',
    tags: ['Calculus', 'Derivatives', 'Tangent Line', 'Extrema'],
    initialParams: { funcType: 'sin', amplitude: 2.0, frequency: 1.0, showTangent: true },
    controls: ['Function Form', 'Amplitude', 'Frequency', 'Phase Shift', 'Tangent Slope'],
  },
  {
    subjectCode: 'U21MA101',
    title: 'Riemann Sums & Double Integral Region Visualizer',
    description:
      'Numerical integration visualizer computing upper, lower, and midpoint Riemann sums over continuous functional regions.',
    unit: 2,
    type: 'RIEMANN_DOUBLE_INTEGRAL',
    smartboardPresetId: 'math-calculus',
    tags: ['Integration', 'Riemann Sums', 'Area Under Curve', 'Volume'],
    initialParams: { intervals: 20, method: 'midpoint', lowerBound: 0, upperBound: 4 },
    controls: ['Subdivision Count', 'Sum Method', 'Integration Bounds', 'Error Residue'],
  },
  {
    subjectCode: 'U25RMA101',
    title: 'Taylor Series Polynomial Approximation Lab',
    description:
      'Interactive polynomial convergence sandbox demonstrating Taylor and Maclaurin series expansions up to order 12.',
    unit: 3,
    type: 'TAYLOR_SERIES_CONVERGENCE',
    smartboardPresetId: 'math-graphs',
    tags: ['Taylor Series', 'Convergence', 'Polynomials', 'Series Expansion'],
    initialParams: { order: 5, center: 0, targetFunction: 'cos(x)' },
    controls: ['Polynomial Degree', 'Expansion Center', 'Remainder Bound', 'Step-by-Step'],
  },
  // Basics of Electrical and Electronics Engineering
  {
    subjectCode: 'U21EEG01',
    title: "Ohm's Law & DC Circuit Simulator",
    description:
      'Interactive circuit analysis workbench exploring V = I × R relationships, power dissipation, and load characteristics.',
    unit: 1,
    type: 'OHMS_LAW_DC_CIRCUIT',
    smartboardPresetId: 'physics-circuits',
    tags: ["Ohm's Law", 'DC Circuits', 'Current', 'Voltage', 'Resistance'],
    initialParams: { voltage: 12, resistance: 100, current: 0.12 },
    controls: ['DC Voltage', 'Resistance Slider', 'Ammeter', 'Voltmeter'],
  },
  {
    subjectCode: 'U21EEG01',
    title: "Kirchhoff's Laws & AC/DC Waveform Analyzer",
    description:
      'Multi-loop circuit simulation validating KCL (Current Law) and KVL (Voltage Law) alongside oscilloscope sinusoidal phase plots.',
    unit: 2,
    type: 'KIRCHHOFF_AC_WAVEFORM',
    smartboardPresetId: 'physics-waves',
    tags: ["Kirchhoff's Laws", 'KVL', 'KCL', 'AC Waveforms', 'Phase'],
    initialParams: { frequency: 50, peakVoltage: 230, phaseAngle: 0 },
    controls: ['Loop Currents', 'Node Voltages', 'Oscilloscope Scale', 'Time Base'],
  },
  // Engineering Physics
  {
    subjectCode: 'U21PH101',
    title: 'Ballistic Projectile & Trajectory Kinematics Lab',
    description:
      'Kinematic physics simulation with launch angle, muzzle velocity, gravitational acceleration, and atmospheric drag dynamics.',
    unit: 1,
    type: 'PROJECTILE_MOTION',
    smartboardPresetId: 'physics-projectile',
    tags: ['Projectile', 'Kinematics', 'Trajectories', 'Gravity'],
    initialParams: { launchAngle: 45, initialVelocity: 25, gravity: 9.81, airResistance: 0.05 },
    controls: ['Launch Angle', 'Velocity', 'Air Drag Coefficient', 'Parabolic Flight Path'],
  },
  {
    subjectCode: 'U21PH101',
    title: 'Simple Harmonic Motion & Wave Interference Lab',
    description:
      'Double pendulum and harmonic wave interference oscillator modeling phase superposition and resonance damping.',
    unit: 3,
    type: 'SHM_WAVE_INTERFERENCE',
    smartboardPresetId: 'physics-waves',
    tags: ['SHM', 'Harmonic Motion', 'Interference', 'Superposition'],
    initialParams: { amplitude: 3, frequency: 1.5, dampingCoeff: 0.1 },
    controls: ['Spring Constant', 'Pendulum Length', 'Interference Slits', 'Phase Offset'],
  },
  // Engineering Chemistry
  {
    subjectCode: 'U21CY101',
    title: 'pH Scale & Acid-Base Titration Simulator',
    description:
      'Real-time electrochemical equilibrium simulator modeling strong/weak acid-base neutralization curves and indicator endpoints.',
    unit: 2,
    type: 'ACID_BASE_TITRATION',
    smartboardPresetId: 'chemistry-titration',
    tags: ['pH Scale', 'Titration', 'Equilibrium', 'Neutralization'],
    initialParams: { acidConc: 0.1, baseConc: 0.1, volume: 25, indicator: 'phenolphthalein' },
    controls: ['Burette Flow Rate', 'Stirrer Speed', 'pH Meter Readout', 'Equivalence Point'],
  },
  {
    subjectCode: 'U21CY101',
    title: 'Electrochemical Cell & Water Hardness Lab',
    description:
      'Galvanic cell potential calculation via Nernst equation and EDTA complexometric titration for total water hardness estimation.',
    unit: 4,
    type: 'ELECTROCHEM_HARDNESS_LAB',
    smartboardPresetId: 'chemistry-electrochem',
    tags: ['Electrochemical Cell', 'Water Hardness', 'EDTA', 'Nernst Equation'],
    initialParams: { temperature: 298, znConc: 1.0, cuConc: 1.0 },
    controls: ['Electrode Materials', 'Ion Concentrations', 'Cell Potential E', 'Salt Bridge'],
  },
  // Problem Solving and C Programming
  {
    subjectCode: 'U21CSG01',
    title: 'Array Memory & Stack Operations Visualizer',
    description:
      'Interactive memory layout visualizer demonstrating contiguous array indexing, stack LIFO push/pop pointers, and buffer bounds.',
    unit: 2,
    type: 'ARRAY_STACK_VISUALIZER',
    smartboardPresetId: 'cs-dsa-lab',
    tags: ['C Programming', 'Arrays', 'Stack', 'Pointers', 'Memory Layout'],
    initialParams: { capacity: 8, elements: [12, 45, 78, 23] },
    controls: ['Push', 'Pop', 'Peek', 'Base Address Offset', 'Step Execution'],
  },
  {
    subjectCode: 'U21CSG01',
    title: 'Algorithmic Sorting Step-by-Step Race',
    description:
      'Visual execution tracer comparing Bubble Sort, Selection Sort, and QuickSort with real-time pointer swaps and comparison counters.',
    unit: 4,
    type: 'SORTING_ALGORITHMS_RACE',
    smartboardPresetId: 'cs-sorting',
    tags: ['Sorting', 'Algorithms', 'Complexity', 'Comparisons'],
    initialParams: { algorithm: 'quicksort', arraySize: 16, animationSpeed: 1 },
    controls: ['Algorithm Selector', 'Step Forward', 'Auto Play', 'Compare Counter'],
  },
  // Engineering Graphics
  {
    subjectCode: 'U21MEG01',
    title: 'Orthographic & Isometric Projection Lab',
    description:
      '3D geometric modeler projecting principal views (Front, Top, Side) with fold-out projection planes and line of sight vectors.',
    unit: 2,
    type: 'ORTHOGRAPHIC_ISOMETRIC_PROJECTION',
    smartboardPresetId: 'math-geometry',
    tags: ['Engineering Graphics', 'Orthographic', 'Isometric', 'Projection Planes'],
    initialParams: { modelType: 'stepped-block', viewMode: 'first-angle', wireframe: true },
    controls: ['Projection Angle', '3D Rotation', 'Unfold Planes', 'Hidden Lines Toggle'],
  },

  // ══════════════════════════════════════════════════════════════
  // SEMESTER 2
  // ══════════════════════════════════════════════════════════════
  // Linear Algebra
  {
    subjectCode: 'U21MA208',
    title: '2D Linear Transformation & Eigenvector Grid Deformer',
    description:
      'Interactive matrix transformation playground demonstrating shear, rotation, scaling, and eigenvector invariant spans.',
    unit: 1,
    type: 'LINEAR_TRANSFORMATION_EIGEN',
    smartboardPresetId: 'math-matrices',
    tags: ['Linear Algebra', 'Matrices', 'Eigenvectors', 'Transformations'],
    initialParams: { a: 2, b: 1, c: 1, d: 2, showEigenvectors: true },
    controls: ['Matrix Sliders', 'Determinant Area', 'Eigenvector Lines', 'Vector Tracking'],
  },
  // Python Programming
  {
    subjectCode: 'U21CSG02',
    title: 'Python Memory Graph & Control Flow Visualizer',
    description:
      'Visual execution tracer displaying stack frames, heap object references, mutability of lists/dicts, and loop step iteration.',
    unit: 2,
    type: 'PYTHON_EXECUTION_VISUALIZER',
    smartboardPresetId: 'cs-dsa-lab',
    tags: ['Python', 'Memory Graph', 'Control Flow', 'Heap', 'Stack'],
    initialParams: { snippet: 'list_comprehension', stepDelay: 500 },
    controls: ['Next Line', 'Prev Line', 'Heap Inspector', 'Variable Watcher'],
  },
  // Digital Electronics
  {
    subjectCode: 'U21ECG01',
    title: 'Logic Gate & Digital Circuit Builder',
    description:
      'Interactive breadboard builder for combinational circuits (AND, OR, NOT, XOR, NAND) with real-time truth table generator.',
    unit: 1,
    type: 'DIGITAL_LOGIC_CIRCUIT_BUILDER',
    smartboardPresetId: 'cs-dsa-lab',
    tags: ['Digital Electronics', 'Logic Gates', 'Truth Table', 'Boolean Logic'],
    initialParams: { gateType: 'XOR', inputA: 1, inputB: 0 },
    controls: ['Gate Selector', 'Toggle Inputs', 'Truth Table', 'Oscilloscope Output'],
  },
  {
    subjectCode: 'U21ECG01',
    title: 'Flip-Flop & Sequential Timing Diagram Simulator',
    description:
      'Clocked SR, JK, D, and T flip-flop simulation displaying clock pulse propagation, setup/hold times, and state transitions.',
    unit: 3,
    type: 'FLIP_FLOP_TIMING_SIMULATOR',
    smartboardPresetId: 'physics-circuits',
    tags: ['Flip-Flops', 'Sequential Circuits', 'Clock', 'Timing Diagram'],
    initialParams: { flipFlopType: 'JK', clockFrequency: 1, inputJ: 1, inputK: 0 },
    controls: ['Clock Pulse', 'Trigger Edge', 'Reset / Set', 'Timing Waves'],
  },
  // Materials Science
  {
    subjectCode: 'U21PH201',
    title: 'Stress-Strain & Elastic Modulus Constitutive Lab',
    description:
      'Universal tensile testing machine simulation displaying Hooke’s region, yield point, ultimate tensile strength, and necking rupture.',
    unit: 2,
    type: 'STRESS_STRAIN_TENSILE_LAB',
    smartboardPresetId: 'civil-construction',
    tags: ['Materials Science', 'Stress-Strain', "Young's Modulus", 'Tensile Test'],
    initialParams: { material: 'mild-steel', gaugeLength: 50, diameter: 10 },
    controls: ['Applied Load', 'Material Selector', 'Strain Rate', 'Rupture Point'],
  },
  // Principles of Data Communication
  {
    subjectCode: 'U21IT201',
    title: 'Signal Modulation & Constellation Diagram Lab',
    description:
      'Interactive modulation laboratory exploring AM, FM, PSK, and QAM constellations under Gaussian channel noise.',
    unit: 2,
    type: 'SIGNAL_MODULATION_LAB',
    smartboardPresetId: 'physics-waves',
    tags: ['Data Communication', 'Modulation', 'Constellation', 'SNR', 'Bandwidth'],
    initialParams: { modulation: 'QPSK', snr: 20, carrierFreq: 1000 },
    controls: ['Modulation Scheme', 'SNR dB', 'Constellation Points', 'Spectrum Analyzer'],
  },

  // ══════════════════════════════════════════════════════════════
  // SEMESTER 3
  // ══════════════════════════════════════════════════════════════
  // Discrete Mathematics
  {
    subjectCode: 'U21MAG02',
    title: 'Set Operations & Graph Theory Euler Path Lab',
    description:
      'Interactive Venn diagram set-algebra solver and graph theory laboratory inspecting adjacency matrices, vertex degrees, and Euler paths.',
    unit: 1,
    type: 'SET_OPERATIONS_GRAPH_THEORY',
    smartboardPresetId: 'cs-algorithms',
    tags: ['Discrete Math', 'Venn Diagram', 'Graph Theory', 'Eulerian Paths'],
    initialParams: { numSets: 3, graphType: 'eulerian' },
    controls: ['Set Operations', 'Add Node/Edge', 'Check Euler Cycle', 'Truth Table'],
  },
  // Data Structures
  {
    subjectCode: 'U21CSG03',
    title: 'Binary Search Tree & AVL Tree Explorer',
    description:
      'Interactive tree balancing sandbox visualizing node insertions, rotations (LL, RR, LR, RL), height balance factors, and traversals.',
    unit: 3,
    type: 'BST_AVL_TREE_EXPLORER',
    smartboardPresetId: 'cs-datastructures',
    tags: ['Data Structures', 'BST', 'AVL Tree', 'Tree Rotations', 'Binary Tree'],
    initialParams: { initialNodes: [50, 30, 70, 20, 40, 60, 80], autoBalance: true },
    controls: ['Insert Node', 'Delete Node', 'In-Order Traversal', 'Balance Tree'],
  },
  {
    subjectCode: 'U21CSG03',
    title: 'Linked List, Stack & Queue Interactive Workbench',
    description:
      'Interactive singly, doubly, and circular linked list workbench with dynamic memory node linking and pointer animations.',
    unit: 1,
    type: 'LINKED_LIST_WORKBENCH',
    smartboardPresetId: 'cs-dsa-lab',
    tags: ['Linked List', 'Stack', 'Queue', 'Pointers', 'Dynamic Memory'],
    initialParams: { listType: 'singly', nodes: [10, 20, 30, 40] },
    controls: ['Insert at Head', 'Insert at Tail', 'Reverse List', 'Delete Value'],
  },
  // Computer Graphics and Visualization
  {
    subjectCode: 'U21IT301',
    title: '2D/3D Affine Transformations & Clipping Lab',
    description:
      'Geometric pipeline simulator executing translation, rotation, scaling, and Cohen-Sutherland line clipping algorithms.',
    unit: 2,
    type: 'GRAPHICS_PIPELINE_TRANSFORMS',
    smartboardPresetId: 'math-geometry',
    tags: ['Computer Graphics', 'Affine Transforms', 'Line Clipping', 'Viewport'],
    initialParams: { transformMode: '3D', clippingWindow: { xmin: -2, xmax: 2, ymin: -2, ymax: 2 } },
    controls: ['Rotation X/Y/Z', 'Scale Factor', 'Translation', 'Clip Test'],
  },
  // Computer Organization and Architecture
  {
    subjectCode: 'U21CS301',
    title: 'CPU Datapath & Cache Memory Simulator',
    description:
      'Single-cycle and pipelined MIPS CPU simulator visualizing ALU operand routing, register files, and cache hit/miss penalties.',
    unit: 2,
    type: 'CPU_DATAPATH_CACHE_SIMULATOR',
    smartboardPresetId: 'cs-dsa-lab',
    tags: ['Computer Architecture', 'CPU Datapath', 'Cache Memory', 'MIPS', 'Pipelining'],
    initialParams: { cachePolicy: 'direct-mapped', cacheSize: 16, blockSize: 4 },
    controls: ['Step Clock', 'Memory Access', 'Cache Hit Ratio', 'Pipeline Hazard View'],
  },
  // Programming Using Java
  {
    subjectCode: 'U21AD303',
    title: 'Java Object-Oriented Polymorphism & Memory Model',
    description:
      'Dynamic class hierarchy visualizer displaying method overriding dynamic dispatch, heap object allocation, and garbage collection.',
    unit: 2,
    type: 'JAVA_OOP_MEMORY_MODEL',
    smartboardPresetId: 'cs-dsa-lab',
    tags: ['Java', 'OOP', 'Polymorphism', 'JVM Heap', 'Dynamic Dispatch'],
    initialParams: { showHeap: true, traceDispatch: true },
    controls: ['Instantiate Class', 'Invoke Virtual', 'GC Sweep', 'Call Stack'],
  },

  // ══════════════════════════════════════════════════════════════
  // SEMESTER 4
  // ══════════════════════════════════════════════════════════════
  // Probability and Queuing Theory
  {
    subjectCode: 'U21MA403',
    title: 'Probability Distribution & M/M/1 Queue Simulator',
    description:
      'Discrete/continuous probability density modeler (Poisson, Exponential, Gaussian) with real-time M/M/1 queuing queue-length simulator.',
    unit: 3,
    type: 'PROBABILITY_QUEUING_SIMULATOR',
    smartboardPresetId: 'math-graphs',
    tags: ['Probability', 'Queuing Theory', 'Poisson', 'M/M/1', 'Waiting Time'],
    initialParams: { arrivalRate: 4, serviceRate: 6, bufferCapacity: 20 },
    controls: ['Arrival Rate λ', 'Service Rate μ', 'Queue Length Graph', 'Server Utilization'],
  },
  // Design and Analysis of Algorithms
  {
    subjectCode: 'U21CS401',
    title: 'Graph Pathfinding & Search Visualizer (BFS / DFS / Dijkstra)',
    description:
      'Weighted graph pathfinding visualizer illustrating breadth-first, depth-first, Dijkstra, and A* algorithm frontier expansions.',
    unit: 3,
    type: 'GRAPH_PATHFINDING_SEARCH',
    smartboardPresetId: 'cs-algorithms',
    tags: ['Algorithms', 'Dijkstra', 'BFS', 'DFS', 'Shortest Path', 'Graph Search'],
    initialParams: { algorithm: 'dijkstra', startNode: 'A', targetNode: 'F' },
    controls: ['Algorithm Choice', 'Step Frontier', 'Visited Nodes Map', 'Shortest Path Cost'],
  },
  // Database Design and Management
  {
    subjectCode: 'U21AD402',
    title: 'ER Diagram & Relational Schema Normalization Lab',
    description:
      'Interactive entity-relationship diagram designer with automated 1NF, 2NF, 3NF, and BCNF functional dependency decomposition checks.',
    unit: 2,
    type: 'ER_RELATIONAL_NORMALIZATION',
    smartboardPresetId: 'cs-dsa-lab',
    tags: ['DBMS', 'ER Diagram', 'Normalization', 'Relational Schema', 'SQL'],
    initialParams: { initialRelation: 'StudentCourse', dependencies: ['StudentID->Name', 'CourseID->Credits'] },
    controls: ['Add Attribute', 'Declare Dependency', 'Test 3NF', 'Decompose Tables'],
  },
  // Operating Systems
  {
    subjectCode: 'U21CS403',
    title: 'Process CPU Scheduling & Page Replacement Simulator',
    description:
      'Gantt chart generator for Round Robin, SJF, and Priority scheduling alongside virtual memory FIFO and LRU page replacement.',
    unit: 2,
    type: 'OS_SCHEDULING_PAGING_SIMULATOR',
    smartboardPresetId: 'cs-algorithms',
    tags: ['Operating Systems', 'CPU Scheduling', 'Round Robin', 'LRU', 'Virtual Memory'],
    initialParams: { algorithm: 'round-robin', timeQuantum: 2, pageFrames: 3 },
    controls: ['Algorithm', 'Time Quantum', 'Add Process', 'Page Reference Stream'],
  },
  // Internet Programming
  {
    subjectCode: 'U21IT401',
    title: 'HTTP Client-Server Protocol & DOM Tree Visualizer',
    description:
      'Interactive web architecture simulator visualizing TCP 3-way handshake, HTTP/2 multiplexing, REST API methods, and DOM mutation events.',
    unit: 2,
    type: 'HTTP_DOM_PROTOCOL_VISUALIZER',
    smartboardPresetId: 'cs-networking',
    tags: ['Web Dev', 'HTTP', 'DOM Tree', 'REST API', 'Client-Server'],
    initialParams: { method: 'POST', status: 200, payload: 'JSON' },
    controls: ['Send Request', 'Inspect Headers', 'DOM Node Tree', 'Render Pipeline'],
  },

  // ══════════════════════════════════════════════════════════════
  // SEMESTER 5
  // ══════════════════════════════════════════════════════════════
  // Computer Networks
  {
    subjectCode: 'U21CSG05',
    title: 'IPv4 CIDR Subnetting & Packet Routing Flow',
    description:
      'Hierarchical network topology builder calculating network prefixes, broadcast bounds, subnet masks, and distance-vector packet hops.',
    unit: 2,
    type: 'NETWORK_SUBNETTING_ROUTING',
    smartboardPresetId: 'cs-networking',
    tags: ['Computer Networks', 'CIDR', 'Subnetting', 'Routing', 'Packets', 'IP'],
    initialParams: { ipAddress: '192.168.1.0', cidr: 26 },
    controls: ['CIDR Slider', 'Subnet Calculator', 'Send Packet', 'Routing Table'],
  },
  // Software Engineering
  {
    subjectCode: 'U21ITG01',
    title: 'Agile Sprint & SDLC Process Flow Visualizer',
    description:
      'Interactive software lifecycle workbench modeling Scrum sprint backlogs, velocity burn-down metrics, and defect tracking phases.',
    unit: 2,
    type: 'SDLC_AGILE_SPRINT_FLOW',
    smartboardPresetId: 'cs-algorithms',
    tags: ['Software Engineering', 'Agile', 'Scrum', 'SDLC', 'Burn-Down Chart'],
    initialParams: { sprintDays: 14, storyPoints: 40 },
    controls: ['Add User Story', 'Sprint Velocity', 'Burndown Progress', 'Phase Transition'],
  },
  // Information Security
  {
    subjectCode: 'U21ITG02',
    title: 'Symmetric & Asymmetric Cryptography Sandbox',
    description:
      'Interactive cryptographic sandbox demonstrating AES cipher block chaining, RSA key generation (p, q primes), and SHA-256 hash avalanche.',
    unit: 2,
    type: 'CRYPTOGRAPHY_SECURITY_SANDBOX',
    smartboardPresetId: 'cs-dsa-lab',
    tags: ['Security', 'Cryptography', 'RSA', 'AES', 'Hashing', 'SHA-256'],
    initialParams: { cipherType: 'RSA', keySize: 1024, plaintext: 'Hello Eduverse' },
    controls: ['Generate Keys', 'Encrypt', 'Decrypt', 'Inspect Ciphertext', 'Tamper Test'],
  },
  {
    subjectCode: 'U21ITG03',
    title: 'Network Packet Sniffer & Security Attack Demonstration',
    description:
      'Cybersecurity laboratory visualizing Man-in-the-Middle (MITM), ARP spoofing, and SSL handshake interception dynamics.',
    unit: 3,
    type: 'CYBER_ATTACK_DEMONSTRATION',
    smartboardPresetId: 'cs-networking',
    tags: ['Cybersecurity', 'ARP Spoofing', 'MITM', 'Packet Sniffer', 'SSL/TLS'],
    initialParams: { attackType: 'arp-spoof', targetIP: '10.0.0.5' },
    controls: ['Launch Probe', 'Inspect Packet Payload', 'Defense Shield', 'Anomaly Score'],
  },

  // ══════════════════════════════════════════════════════════════
  // SEMESTER 6
  // ══════════════════════════════════════════════════════════════
  // Machine Learning Techniques
  {
    subjectCode: 'U21IT601',
    title: 'Linear & Logistic Regression Gradient Descent Lab',
    description:
      'Live gradient descent optimizer visualizing loss landscapes, learning rate convergence, decision boundary fits, and MSE minimization.',
    unit: 2,
    type: 'REGRESSION_GRADIENT_DESCENT',
    smartboardPresetId: 'math-graphs',
    tags: ['Machine Learning', 'Linear Regression', 'Gradient Descent', 'Loss Surface'],
    initialParams: { learningRate: 0.05, iterations: 100, noise: 0.2 },
    controls: ['Learning Rate α', 'Epochs', 'Add Outlier Point', 'Cost Function 3D'],
  },
  {
    subjectCode: 'U21IT601',
    title: 'K-Means Clustering & Decision Boundary Explorer',
    description:
      'Unsupervised centroid convergence visualizer tracking cluster assignments (Voronoi partitions) and inertia reduction iterations.',
    unit: 3,
    type: 'KMEANS_CLUSTERING_EXPLORER',
    smartboardPresetId: 'cs-algorithms',
    tags: ['Machine Learning', 'K-Means', 'Clustering', 'Centroids', 'Unsupervised'],
    initialParams: { k: 3, numPoints: 60, distanceMetric: 'euclidean' },
    controls: ['Cluster Count K', 'Re-seed Centroids', 'Step Iteration', 'Inertia Metric'],
  },
  {
    subjectCode: 'U21IT602',
    title: 'Confusion Matrix & Model Performance Metric Analyzer',
    description:
      'Interactive binary classification evaluation tool computing Precision, Recall, F1-Score, and ROC-AUC curve shifts against threshold.',
    unit: 4,
    type: 'CONFUSION_MATRIX_ROC_ANALYZER',
    smartboardPresetId: 'math-graphs',
    tags: ['Machine Learning', 'Confusion Matrix', 'ROC Curve', 'Precision-Recall', 'F1'],
    initialParams: { threshold: 0.5, truePositives: 45, falsePositives: 10, trueNegatives: 40, falseNegatives: 5 },
    controls: ['Classification Threshold', 'ROC Curve', 'F1 Score', 'Cost Matrix'],
  },
  // Embedded Systems and IoT
  {
    subjectCode: 'U21ECG05',
    title: 'IoT Sensor Telemetry & MQTT Broker Communication',
    description:
      'Microcontroller sensor simulator publishing temperature/humidity payloads to an MQTT broker with QoS level validation.',
    unit: 2,
    type: 'IOT_SENSOR_MQTT_SIMULATOR',
    smartboardPresetId: 'cs-networking',
    tags: ['IoT', 'Embedded Systems', 'MQTT', 'Sensors', 'Telemetry'],
    initialParams: { qosLevel: 1, topic: 'kpriet/it/sensors/temp', publishIntervalMs: 1000 },
    controls: ['Sensor Reading', 'Publish Message', 'QoS Mode', 'Subscriber View'],
  },
  {
    subjectCode: 'U21ECG06',
    title: 'Microcontroller GPIO & Interrupt Hardware Workbench',
    description:
      'ARM Cortex / ESP32 microcontroller emulator visualizing GPIO pin states, analog-to-digital (ADC) conversion, and ISR interrupt triggers.',
    unit: 3,
    type: 'MICROCONTROLLER_GPIO_INTERRUPT',
    smartboardPresetId: 'physics-circuits',
    tags: ['Embedded Systems', 'GPIO', 'Interrupts', 'ADC', 'Microcontroller'],
    initialParams: { pinState: 'HIGH', adcResolution: 10, pwmDutyCycle: 50 },
    controls: ['Pin Selector', 'Trigger Interrupt', 'PWM Frequency', 'Logic Analyzer'],
  },

  // ══════════════════════════════════════════════════════════════
  // SEMESTER 7
  // ══════════════════════════════════════════════════════════════
  // Cloud Computing
  {
    subjectCode: 'U21IT702',
    title: 'Cloud Virtual Machine & Elastic Load Balancer Lab',
    description:
      'Cloud infrastructure architect visualizing traffic routing across auto-scaled VM compute clusters with round-robin and least-connections.',
    unit: 2,
    type: 'CLOUD_VM_LOAD_BALANCER',
    smartboardPresetId: 'cs-networking',
    tags: ['Cloud Computing', 'Virtual Machines', 'Load Balancing', 'Auto Scaling'],
    initialParams: { algorithm: 'least-connections', minVMs: 2, maxVMs: 6, currentTrafficRPS: 450 },
    controls: ['Traffic Generator', 'Load Balancer Algorithm', 'Add VM Instance', 'Health Checks'],
  },
  {
    subjectCode: 'U21IT704',
    title: 'Docker Container Pipeline & Microservice Topology',
    description:
      'Containerization sandbox modeling Docker layer caches, volume mounts, bridge networking, and Kubernetes pod orchestration.',
    unit: 3,
    type: 'DOCKER_CONTAINER_TOPOLOGY',
    smartboardPresetId: 'cs-networking',
    tags: ['Cloud Computing', 'Docker', 'Containers', 'Microservices', 'Kubernetes'],
    initialParams: { runningContainers: 3, bridgeNetwork: '172.18.0.0/16' },
    controls: ['Deploy Container', 'Port Mapping', 'Simulate Crash', 'Inspect Volumes'],
  },
  // Design Patterns
  {
    subjectCode: 'U21IT703',
    title: 'Gang of Four (GoF) Structural & Behavioral Pattern Flow',
    description:
      'Object modeler comparing Singleton, Factory Method, Observer, and Strategy design patterns with live UML sequence traces.',
    unit: 2,
    type: 'DESIGN_PATTERNS_GOF_FLOW',
    smartboardPresetId: 'cs-dsa-lab',
    tags: ['Design Patterns', 'Factory', 'Observer', 'Singleton', 'Strategy', 'UML'],
    initialParams: { pattern: 'Observer', subscribers: 3 },
    controls: ['Pattern Selector', 'Trigger State Change', 'Notify Observers', 'UML Diagram'],
  },
  // Software Project Management
  {
    subjectCode: 'U21IT701',
    title: 'Interactive Gantt Chart & Critical Path Method (CPM)',
    description:
      'Project management network diagram calculating Early Start/Finish, Late Start/Finish, total float, and critical path activities.',
    unit: 2,
    type: 'PROJECT_MANAGEMENT_GANTT_CPM',
    smartboardPresetId: 'cs-algorithms',
    tags: ['Project Management', 'Gantt Chart', 'Critical Path', 'CPM', 'Scheduling'],
    initialParams: { activitiesCount: 6, criticalPathDuration: 28 },
    controls: ['Task Duration', 'Dependency Links', 'Identify Critical Path', 'Slack Times'],
  },

  // ══════════════════════════════════════════════════════════════
  // SEMESTER 8
  // ══════════════════════════════════════════════════════════════
  // Project Work Phase - II
  {
    subjectCode: 'U21IT801',
    title: 'Capstone Project System Architecture & Milestone Tracker',
    description:
      'Full-stack architecture blueprint visualizer tracing client frontend, API gateways, database clusters, and milestone deliverables.',
    unit: 1,
    type: 'PROJECT_ARCHITECTURE_MILESTONE',
    smartboardPresetId: 'cs-networking',
    tags: ['Capstone Project', 'System Architecture', 'Milestones', 'Evaluation'],
    initialParams: { phase: 'Phase-II Final Defense', progressPercent: 85 },
    controls: ['Architecture Layers', 'Milestone Checklist', 'Sprint Retrospective', 'Deliverables'],
  },
  // Industrial Training / Internship
  {
    subjectCode: 'U21ITI01',
    title: 'Industrial Competency & Experience Portfolio Matrix',
    description:
      'Enterprise technical competency tracker mapping industry internship modules, tech-stack proficiency, and mentor evaluations.',
    unit: 1,
    type: 'INTERNSHIP_COMPETENCY_PORTFOLIO',
    smartboardPresetId: 'cs-dsa-lab',
    tags: ['Internship', 'Industrial Training', 'Competencies', 'Skill Matrix'],
    initialParams: { company: 'Tier-1 Tech Enterprise', domain: 'Cloud & Fullstack AI' },
    controls: ['Skill Matrix', 'Weekly Log', 'Mentor Rating', 'Report Review'],
  },
];

async function seedItSemesterTeachersAndSimulations() {
  console.log('🚀 Starting IT Semester Teacher & Simulation Seeding...');

  await mongoose.connect('mongodb://127.0.0.1:27017/eduverse');
  console.log('✔ Connected to MongoDB');

  // 1. Locate IT Department
  const itDept = await Department.findOne({
    $or: [{ code: 'IT' }, { shortName: 'IT' }, { name: /Information Technology/i }],
  });
  if (!itDept) {
    throw new Error('❌ IT Department not found in database.');
  }
  console.log(`✔ Found IT Department: ${itDept.name} (${itDept._id})`);

  // 2. Locate all 8 Semesters for IT
  const semesters = await Semester.find({ department: itDept._id }).sort({ semesterNumber: 1 });
  console.log(`✔ Found ${semesters.length} Semesters for IT department`);
  const semesterMap = new Map<number, any>();
  semesters.forEach((s) => {
    semesterMap.set(s.semesterNumber, s);
  });

  // 3. Hash the demo password once
  const DEMO_PASSWORD = 'Demo@IT12345';
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  console.log('✔ Password hashed using bcrypt');

  // 4. Create/Upsert Demo Teacher for each Semester (1 to 8)
  const teacherMap = new Map<number, any>();

  for (let semNum = 1; semNum <= 8; semNum++) {
    const semDoc = semesterMap.get(semNum);
    if (!semDoc) {
      console.warn(`⚠️ Warning: Semester ${semNum} not found in database for IT`);
      continue;
    }

    const username = `it.sem${semNum}.teacher`;
    const email = `${username}@kpriet.ac.in`;
    const identifier = `IT.SEM${semNum}.TEACHER`;
    const name = `IT Semester ${semNum} Teacher`;

    const teacher = await User.findOneAndUpdate(
      { collegeEmail: email },
      {
        $set: {
          name,
          collegeEmail: email,
          passwordHash,
          role: UserRole.TEACHER,
          department: itDept._id,
          identifier,
          profile: {
            designation: `Semester ${semNum} Lead Faculty`,
            specialization: 'Information Technology',
            bio: `Dedicated semester coordinator and faculty for Information Technology Semester ${semNum}.`,
          },
          accountStatus: AccountStatus.ACTIVE,
          approvalStatus: ApprovalStatus.APPROVED,
          approvedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    teacherMap.set(semNum, teacher);
    console.log(`  ✔ [Sem ${semNum}] Teacher created/updated: ${teacher.name} (${teacher.collegeEmail})`);

    // Clean up any stale assignments for this teacher from other semesters (enforce strict isolation)
    await TeacherAssignment.deleteMany({
      teacher: teacher._id,
      semester: { $ne: semDoc._id },
    });

    // 5. Fetch all existing subjects for this semester
    const subjects = await Subject.find({
      department: itDept._id,
      semester: semDoc._id,
    });
    console.log(`     -> Found ${subjects.length} subjects for Semester ${semNum}`);

    // 6. Assign teacher to all subjects of this semester
    for (const subject of subjects) {
      await TeacherAssignment.findOneAndUpdate(
        {
          teacher: teacher._id,
          subject: subject._id,
          semester: semDoc._id,
        },
        {
          $set: {
            teacher: teacher._id,
            subject: subject._id,
            department: itDept._id,
            semester: semDoc._id,
            academicYear: semDoc.academicYear || '2024-2025',
            section: 'ALL',
            status: TeacherAssignmentStatus.ACTIVE,
            isCoordinator: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`     -> Assigned teacher to all ${subjects.length} subjects in Semester ${semNum}`);
  }

  // 7. Seed/Upsert Simulations into Content model
  console.log('\n🔬 Seeding Subject-Specific Simulations...');
  let createdCount = 0;
  let updatedCount = 0;

  for (const simSpec of SEMESTER_SIMULATIONS) {
    // Find subject in IT department
    const subject = await Subject.findOne({
      department: itDept._id,
      subjectCode: simSpec.subjectCode,
    });

    if (!subject) {
      console.warn(`  ⚠️ Subject ${simSpec.subjectCode} not found in IT department. Skipping.`);
      continue;
    }

    const semDoc = semesterMap.get(subject.semesterNumber);
    const teacherDoc = teacherMap.get(subject.semesterNumber);

    if (!semDoc || !teacherDoc) {
      console.warn(`  ⚠️ Missing semester or teacher for subject ${simSpec.subjectCode}. Skipping.`);
      continue;
    }

    const existingContent = await Content.findOne({
      subject: subject._id,
      contentType: ContentType.SIMULATIONS,
      title: simSpec.title,
    });

    const contentData = {
      title: simSpec.title,
      description: simSpec.description,
      contentType: ContentType.SIMULATIONS,
      department: itDept._id,
      semester: semDoc._id,
      subject: subject._id,
      teacher: teacherDoc._id,
      chapterOrUnit: simSpec.unit,
      tags: simSpec.tags,
      simulationConfig: {
        type: simSpec.type,
        smartboardPresetId: simSpec.smartboardPresetId,
        initialParams: simSpec.initialParams || {},
        controls: simSpec.controls || [],
      },
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date(),
    };

    if (existingContent) {
      await Content.updateOne({ _id: existingContent._id }, { $set: contentData });
      updatedCount++;
    } else {
      await Content.create(contentData);
      createdCount++;
    }
  }

  console.log(`✔ Finished Simulations Seeding: ${createdCount} created, ${updatedCount} updated.`);

  console.log('\n================================================================');
  console.log('🎉 IT DEPARTMENT SEMESTER-WISE DEMO ACCOUNTS & SIMULATIONS READY!');
  console.log('================================================================');
  for (let sem = 1; sem <= 8; sem++) {
    const t = teacherMap.get(sem);
    const asgns = await TeacherAssignment.countDocuments({ teacher: t._id, status: 'ACTIVE' });
    const sims = await Content.countDocuments({
      department: itDept._id,
      semester: semesterMap.get(sem)._id,
      contentType: 'SIMULATIONS',
    });
    console.log(
      `Semester ${sem}: Username: ${t.identifier.toLowerCase()} | Password: ${DEMO_PASSWORD} | Subjects: ${asgns} | Simulations: ${sims}`
    );
  }

  await mongoose.disconnect();
}

seedItSemesterTeachersAndSimulations().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
