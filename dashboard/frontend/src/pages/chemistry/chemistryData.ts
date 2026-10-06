/**
 * Authoritative Engineering Chemistry Curriculum & Simulation Data (U25CY103)
 * Regulations 2025 · B.Tech Chemical Engineering & Core First-Year Disciplines
 * KPR Institute of Engineering and Technology (KPRIET)
 */

export interface IChemUnit {
  number: number;
  roman: string;
  title: string;
  description: string;
  hours: number;
  color: string;
  topics: string[];
  keyFormulas: Array<{ name: string; latex: string; explanation: string }>;
  simulations: string[];
}

export interface IMolecule3D {
  id: string;
  name: string;
  formula: string;
  iupac: string;
  geometry: string;
  hybridization: 'sp' | 'sp2' | 'sp3' | 'sp3d' | 'sp3d2' | string;
  bondAngle: string;
  electronDomains: number;
  lonePairs: number;
  dipoleMoment: string;
  unit: number;
  difficulty: 'Foundation' | 'Intermediate' | 'Advanced';
  description: string;
  atoms: Array<{
    id: string;
    symbol: string;
    color: string;
    radius: number;
    pos: [number, number, number]; // 3D coordinates in Angstroms
  }>;
  bonds: Array<{
    from: string;
    to: string;
    order: 1 | 2 | 3 | 1.5; // 1.5 for aromatic resonance
  }>;
}

export interface IReactionMechanism {
  id: string;
  name: string;
  type: 'Substitution' | 'Elimination' | 'Aromatic Substitution' | 'Diazotization & Coupling';
  unit: number;
  overview: string;
  rateLaw: string;
  intermediate: string;
  stereochemistry: string;
  energyBarrier: string;
  steps: Array<{
    stepNumber: number;
    title: string;
    curvedArrowDesc: string;
    energyState: string;
    explanation: string;
  }>;
}

export interface IVirtualLabExperiment {
  id: string;
  labNumber: number;
  title: string;
  aim: string;
  theory: string;
  principleEquation: string;
  apparatus: string[];
  chemicals: string[];
  safety: string[];
  procedureSteps: string[];
  keyObservations: string;
  vivaQuestions: Array<{ q: string; a: string }>;
  simKey: string;
}

export interface IChemMission {
  id: string;
  missionNumber: number;
  title: string;
  category: 'Molecular Structure' | 'Mechanisms' | 'Electrochemistry' | 'Spectroscopy' | 'Kinetics' | 'Synthesis';
  prompt: string;
  task: string;
  rewardBadge: string;
  simKey: string;
  targetMetric: string;
}

export interface IVivaItem {
  id: string;
  unit: number;
  question: string;
  answer: string;
  concept: string;
  difficulty: 'Core' | 'Viva Standard' | 'Distinction';
}

// ════════════════════════════════════════════════════════════════════════
// 1. SYLLABUS UNITS (U25CY103)
// ════════════════════════════════════════════════════════════════════════

export const CHEMISTRY_UNITS: IChemUnit[] = [
  {
    number: 1,
    roman: 'UNIT I',
    title: 'Molecular Structure, Bonding and Reactivity',
    description: 'Quantum foundations of atomic and molecular orbitals, hybridizations, conformational energy profiles, stereochemistry, and acid-base thermodynamic equilibria.',
    hours: 9,
    color: '#0284c7', // Sky Blue
    topics: [
      'Atomic models & wave-particle duality',
      'de Broglie equation: λ = h/mv',
      'Schrödinger equation — qualitative wavefunctions',
      'Atomic orbitals (s, px, py, pz) & boundary surfaces',
      'Molecular orbital theory (MOT) of homonuclear/heteronuclear diatomics',
      'Hybridization: sp (180°), sp² (120°), sp³ (109.5°)',
      'Benzene electronic structure & aromaticity',
      "Hückel's 4n+2 rule & cyclic π-electron delocalization",
      'Brønsted-Lowry & Lewis acid-base theories',
      'pKa, pKb, Henderson-Hasselbalch equation & buffer action',
      'Basic strength of aliphatic amines vs aniline',
      'Conformational analysis of ethane & n-butane (Newman projections)',
      'Stereochemistry: Chirality, optical activity, enantiomers, diastereomers',
      'Cahn-Ingold-Prelog (R/S) and geometric (E/Z, cis/trans) isomerism',
    ],
    keyFormulas: [
      { name: 'de Broglie Wavelength', latex: 'λ = h / (m · v)', explanation: 'Relates particle momentum p = mv to its quantum matter wave wavelength.' },
      { name: 'Henderson-Hasselbalch', latex: 'pH = pKa + log([A⁻] / [HA])', explanation: 'Calculates the pH of buffer solutions from acid dissociation constant and conjugate ratio.' },
      { name: "Hückel's Rule", latex: 'π-electrons = 4n + 2', explanation: 'A planar cyclic conjugated ring with 4n+2 π-electrons (n = 0, 1, 2...) possesses aromatic stability.' },
    ],
    simulations: [
      'chem-orbitals-hybridization',
      'chem-de-broglie',
      'chem-newman-projection',
      'chem-chirality-fischer',
      'chem-ph-pka-buffer',
    ],
  },
  {
    number: 2,
    roman: 'UNIT II',
    title: 'Organic Chemistry and Mechanisms',
    description: 'Energetics of bond cleavage, nucleophilic/electrophilic pathways, stereochemical inversions, aromatic substitutions, and industrial dye syntheses.',
    hours: 9,
    color: '#059669', // Emerald Green
    topics: [
      'Homolytic and heterolytic bond cleavage',
      'Nucleophiles, electrophiles, and reactive intermediates (carbocations, carbanions, free radicals)',
      'Nucleophilic substitution: SN1 (carbocation intermediate, racemization) vs SN2 (backside attack, Walden inversion)',
      'SNAr (addition-elimination on activated aromatic rings)',
      'Elimination reactions: E1 vs E2 mechanisms, Zaitsev and Hofmann regiochemistry',
      'Electrophilic aromatic substitution (SEAr): Nitration, halogenation, Friedel-Crafts alkylation and acylation',
      'Arenium σ-complex (Wheland intermediate) stability and resonance structures',
      'Addition reactions across alkenes (Markovnikov vs anti-Markovnikov)',
      'Functional group transformations: Alcohol oxidation to aldehyde and carboxylic acid',
      'Primary aromatic amines: Diazotization reaction at 0–5 °C',
      'Azo coupling with β-naphthol / aromatic amines & synthetic azo dyes',
    ],
    keyFormulas: [
      { name: 'SN2 Rate Law', latex: 'Rate = k [R-X] [Nu⁻]', explanation: 'Second-order bimolecular concerted reaction rate depending on substrate and nucleophile concentration.' },
      { name: 'SN1 Rate Law', latex: 'Rate = k [R-X]', explanation: 'First-order unimolecular reaction rate determined exclusively by carbocation formation.' },
      { name: 'Walden Inversion', latex: '100% Stereochemical Inversion', explanation: 'Backside attack in SN2 causes umbrella-like reversal of tetrahedral configuration at chiral carbon.' },
    ],
    simulations: [
      'chem-sn1-sn2-mechanism',
      'chem-elimination-substitution',
      'chem-azo-dye-synthesis',
    ],
  },
  {
    number: 3,
    roman: 'UNIT III',
    title: 'Polymers and Coordination Chemistry',
    description: 'Macromolecular architecture, polymerization kinetics, glass transitions, commercial molding processes, crystal field splitting, and organometallic catalysis.',
    hours: 9,
    color: '#7c3aed', // Violet
    topics: [
      'Classification of polymers: Thermoplastics, thermosetting resins, and elastomers',
      'Addition (chain-growth) vs condensation (step-growth) polymerization mechanisms',
      'Polymer functionality and branching / crosslinking networks',
      'Polymer stereoregularity: Isotactic, syndiotactic, and atactic tacticity',
      'Molecular weight averages: Number-average (Mn), weight-average (Mw), and Polydispersity Index (PDI = Mw/Mn)',
      'Thermal transitions: Glass transition temperature (Tg), melting temperature (Tm), and factors influencing Tg',
      'Industrial polymer processing: Injection moulding, profile extrusion, compression moulding',
      'Coordination chemistry: Werner theory, ligands, coordination numbers, and geometries',
      'Crystal Field Theory (CFT): d-orbital splitting in octahedral (Δo) and tetrahedral (Δt) complexes',
      'Spectrochemical series, high-spin vs low-spin complexes, and crystal field stabilization energy (CFSE)',
      'Origin of colour (d-d transitions) and magnetic properties (spin-only magnetic moment μ_eff)',
      'Organometallic catalysts: Ziegler-Natta catalyst (stereospecific polyolefins) and Wilkinson’s catalyst (homogeneous alkene hydrogenation)',
    ],
    keyFormulas: [
      { name: 'Polydispersity Index', latex: 'PDI = M_w / M_n', explanation: 'Measures molecular mass distribution width; PDI = 1 for monodisperse proteins, >1 for synthetic polymers.' },
      { name: 'Octahedral CFSE', latex: 'CFSE = (-0.4 n_{t2g} + 0.6 n_{eg}) Δ_o + m·P', explanation: 'Crystal Field Stabilization Energy calculated from d-electrons in t2g and eg sets.' },
      { name: 'Spin-Only Magnetic Moment', latex: 'μ_{eff} = \\sqrt{n(n + 2)} \\text{ B.M.}', explanation: 'Calculates magnetic moment in Bohr Magnetons from the number of unpaired d-electrons n.' },
    ],
    simulations: [
      'chem-polymer-chain-growth',
      'chem-polymer-thermal-transitions',
      'chem-molding-processes',
      'chem-crystal-field-theory',
    ],
  },
  {
    number: 4,
    roman: 'UNIT IV',
    title: 'Thermodynamics, Electrochemistry and Kinetics',
    description: 'Macroscopic and molecular thermodynamics (ΔG = ΔH − TΔS), reference and indicator electrodes, fuel cells, phase diagrams, and reaction rate laws.',
    hours: 9,
    color: '#ea580c', // Orange
    topics: [
      'Thermodynamic potentials: Enthalpy (ΔH), Entropy (ΔS), and Gibbs Free Energy (ΔG)',
      'Criterion of spontaneity and chemical equilibrium: ΔG = ΔH − TΔS and ΔG° = −RT ln K',
      'Clausius-Clapeyron equation and Maxwell thermodynamic relations',
      'Electrochemistry: Galvanic cells, standard reduction potentials, and electromotive force (EMF)',
      'Nernst equation for half-cell and full-cell potentials at variable concentration and temperature',
      'Reference electrodes: Standard Hydrogen Electrode (SHE), Saturated Calomel Electrode (SCE)',
      'Ion-selective indicator electrodes: Glass membrane electrode for pH measurement',
      'Modern fuel cells: Alkaline, Proton Exchange Membrane (PEMFC), and Hydrogen-Oxygen fuel cell chemistry',
      'Phase rule: Gibbs phase rule (F = C − P + 2), one-component water phase diagram (triple point, critical point)',
      'Two-component binary solid-liquid phase equilibria: Simple eutectic system (Lead-Silver system)',
      'Chemical kinetics: Differential and integrated rate laws for zero, first, and second order reactions',
      'Reaction order vs molecularity, half-life equations, and steady-state approximation',
      'Enzyme kinetics: Michaelis-Menten mechanism and Lineweaver-Burk double reciprocal transformation',
    ],
    keyFormulas: [
      { name: 'Gibbs-Helmholtz Spontaneity', latex: 'ΔG = ΔH - T · ΔS', explanation: 'Reaction is spontaneous when ΔG < 0; at crossover equilibrium temperature T_eq = ΔH / ΔS.' },
      { name: 'Nernst Equation (298 K)', latex: 'E_{cell} = E°_{cell} - \\frac{0.0592}{n} \\log Q', explanation: 'Determines real cell electromotive force as a function of reaction quotient Q and electron transfer n.' },
      { name: 'Michaelis-Menten Equation', latex: 'v = \\frac{V_{max} [S]}{K_m + [S]}', explanation: 'Relates initial catalytic reaction velocity v to substrate concentration [S], maximum velocity Vmax, and Km.' },
    ],
    simulations: [
      'chem-gibbs-free-energy',
      'chem-galvanic-nernst-cell',
      'chem-water-phase-eutectic',
      'chem-reaction-kinetics',
      'chem-michaelis-menten',
    ],
  },
  {
    number: 5,
    roman: 'UNIT V',
    title: 'Surface Chemistry, Spectroscopy and Chromatography',
    description: 'Adsorption thermodynamics, colloidal surfactants, micellization, contact angle wetting, Beer-Lambert spectrophotometry, IR/NMR characterization, and analytical chromatography.',
    hours: 9,
    color: '#0891b2', // Cyan
    topics: [
      'Surface chemistry: Physisorption vs chemisorption characteristics',
      'Adsorption isotherms: Langmuir monolayer adsorption isotherm and Freundlich empirical isotherm',
      'Colloids and interfacial systems: Lyophilic vs lyophobic colloids, electrical double layer, and Zeta potential',
      'Surfactants, micelle self-assembly, and Critical Micelle Concentration (CMC)',
      'Emulsions, microemulsions, liposomes, and vesicles',
      'Interfacial wetting: Young-Dupré equation, contact angle θ, and spreading coefficient',
      'Spectroscopy fundamentals: Electromagnetic spectrum, electronic, vibrational, and nuclear transitions',
      'Beer-Lambert law: Absorbance A = ε · b · c, optical density, and molar absorptivity',
      'UV-Visible spectrophotometry: Instrumentation, chromophores, auxochromes, bathochromic/hypsochromic shifts',
      'Infrared (IR) spectroscopy: Molecular vibrations (stretching and bending), Hooke’s law, characteristic group frequencies (O-H, C=O, N-H, C-H)',
      'Proton Nuclear Magnetic Resonance (¹H NMR): Chemical shift (δ ppm), TMS standard, integration, and spin-spin splitting (n+1 rule)',
      'Chromatographic principles: Mobile phase, stationary phase, partition and adsorption coefficients',
      'Analytical chromatography: Thin Layer Chromatography (Rf values), High Performance Liquid Chromatography (HPLC), and Gas Chromatography (GC)',
    ],
    keyFormulas: [
      { name: 'Beer-Lambert Law', latex: 'A = \\varepsilon \\cdot b \\cdot c', explanation: 'Absorbance A is directly proportional to molar absorptivity ε, optical path length b, and concentration c.' },
      { name: 'Langmuir Adsorption Isotherm', latex: '\\frac{x}{m} = \\frac{a \\cdot P}{1 + b \\cdot P}', explanation: 'Models monolayer gas coverage on solid surface sites at varying equilibrium pressure P.' },
      { name: "Young's Wetting Equation", latex: '\\cos \\theta = \\frac{\\gamma_{SV} - \\gamma_{SL}}{\\gamma_{LV}}', explanation: 'Relates equilibrium liquid droplet contact angle θ to solid-vapor, solid-liquid, and liquid-vapor surface tensions.' },
    ],
    simulations: [
      'chem-adsorption-isotherms',
      'chem-micelle-cmc',
      'chem-beer-lambert-spec',
      'chem-spectroscopy-interpreter',
      'chem-chromatography-tlc',
    ],
  },
  {
    number: 6,
    roman: 'UNIT VI',
    title: 'Engineering Chemistry Virtual Laboratory',
    description: 'Eight rigorous analytical, physical, and synthetic experiments executed with digital measurement apparatus, live titrations, spectrophotometry, and Viva evaluations.',
    hours: 30,
    color: '#d97706', // Amber
    topics: [
      'Experiment 1: Determination of pKa of acetic acid and phenol by pH metric titration',
      'Experiment 2: Preparation of 1-phenylazo-2-naphthol (Sudan I dye) via diazotization and coupling',
      'Experiment 3: Qualitative functional group analysis for carboxylic acids, aldehydes, ketones, and amines',
      'Experiment 4: Determination of molecular weight and DP of polymer using Ostwald viscometer',
      'Experiment 5: Determination of rate constant of acid-catalysed hydrolysis of ethyl acetate',
      'Experiment 6: Measurement of EMF using Saturated Calomel Electrode and Glass Electrode assembly',
      'Experiment 7: Determination of distribution coefficient of iodine between water and carbon tetrachloride (CCl4)',
      'Experiment 8: Verification of Beer-Lambert law using spectrophotometer and determination of unknown concentration',
    ],
    keyFormulas: [
      { name: 'pKa Half-Neutralization', latex: 'pH_{1/2} = pK_a', explanation: 'At 50% titration volume, [A⁻] = [HA], reducing Henderson-Hasselbalch equation to pH = pKa.' },
      { name: 'Mark-Houwink Viscosity', latex: '[η] = K \\cdot M_v^a', explanation: 'Relates intrinsic viscosity [η] to viscosity-average molecular weight Mv through empirical constants K and a.' },
      { name: 'Nernst Cell EMF', latex: 'E = E° - 0.0592 \\cdot pH', explanation: 'Glass electrode potential responds linearly to solution pH with a theoretical slope of -59.2 mV/pH at 25 °C.' },
    ],
    simulations: [
      'chem-lab-pka-titration',
      'chem-lab-azo-coupling',
      'chem-lab-qualitative-tests',
      'chem-lab-viscometer-mw',
      'chem-lab-ester-hydrolysis',
      'chem-lab-emf-electrodes',
      'chem-lab-iodine-distribution',
      'chem-lab-beer-lambert',
    ],
  },
];

// ════════════════════════════════════════════════════════════════════════
// 2. 3D MOLECULAR STUDIO REPOSITORY
// ════════════════════════════════════════════════════════════════════════

export const MOLECULES_3D_CATALOG: IMolecule3D[] = [
  {
    id: 'mol-water',
    name: 'Water',
    formula: 'H₂O',
    iupac: 'Oxidane',
    geometry: 'Bent / V-shaped',
    hybridization: 'sp3',
    bondAngle: '104.5°',
    electronDomains: 4,
    lonePairs: 2,
    dipoleMoment: '1.85 D (Polar)',
    unit: 1,
    difficulty: 'Foundation',
    description: 'Oxygen atom has 4 electron domains (2 bonding pairs, 2 lone pairs). Lone pair repulsion compresses the tetrahedral angle from 109.5° down to 104.5°.',
    atoms: [
      { id: 'O1', symbol: 'O', color: '#ef4444', radius: 18, pos: [0, 0, 0] },
      { id: 'H1', symbol: 'H', color: '#f8fafc', radius: 11, pos: [0.76, 0.59, 0] },
      { id: 'H2', symbol: 'H', color: '#f8fafc', radius: 11, pos: [-0.76, 0.59, 0] },
    ],
    bonds: [
      { from: 'O1', to: 'H1', order: 1 },
      { from: 'O1', to: 'H2', order: 1 },
    ],
  },
  {
    id: 'mol-ammonia',
    name: 'Ammonia',
    formula: 'NH₃',
    iupac: 'Azane',
    geometry: 'Trigonal Pyramidal',
    hybridization: 'sp3',
    bondAngle: '107.0°',
    electronDomains: 4,
    lonePairs: 1,
    dipoleMoment: '1.47 D (Polar)',
    unit: 1,
    difficulty: 'Foundation',
    description: 'Nitrogen possesses 4 electron domains with 1 lone pair exerting asymmetric repulsion on 3 N-H bonds, reducing the angle to 107°.',
    atoms: [
      { id: 'N1', symbol: 'N', color: '#3b82f6', radius: 17, pos: [0, 0.2, 0] },
      { id: 'H1', symbol: 'H', color: '#f8fafc', radius: 11, pos: [0.94, -0.27, 0] },
      { id: 'H2', symbol: 'H', color: '#f8fafc', radius: 11, pos: [-0.47, -0.27, 0.81] },
      { id: 'H3', symbol: 'H', color: '#f8fafc', radius: 11, pos: [-0.47, -0.27, -0.81] },
    ],
    bonds: [
      { from: 'N1', to: 'H1', order: 1 },
      { from: 'N1', to: 'H2', order: 1 },
      { from: 'N1', to: 'H3', order: 1 },
    ],
  },
  {
    id: 'mol-methane',
    name: 'Methane',
    formula: 'CH₄',
    iupac: 'Methane',
    geometry: 'Regular Tetrahedral',
    hybridization: 'sp3',
    bondAngle: '109.5°',
    electronDomains: 4,
    lonePairs: 0,
    dipoleMoment: '0.00 D (Non-polar)',
    unit: 1,
    difficulty: 'Foundation',
    description: 'Central carbon mixes 2s and three 2p orbitals to create four identical sp³ hybrid lobes oriented toward the corners of a regular tetrahedron.',
    atoms: [
      { id: 'C1', symbol: 'C', color: '#334155', radius: 18, pos: [0, 0, 0] },
      { id: 'H1', symbol: 'H', color: '#f8fafc', radius: 11, pos: [0, 1.09, 0] },
      { id: 'H2', symbol: 'H', color: '#f8fafc', radius: 11, pos: [1.03, -0.36, 0] },
      { id: 'H3', symbol: 'H', color: '#f8fafc', radius: 11, pos: [-0.51, -0.36, 0.89] },
      { id: 'H4', symbol: 'H', color: '#f8fafc', radius: 11, pos: [-0.51, -0.36, -0.89] },
    ],
    bonds: [
      { from: 'C1', to: 'H1', order: 1 },
      { from: 'C1', to: 'H2', order: 1 },
      { from: 'C1', to: 'H3', order: 1 },
      { from: 'C1', to: 'H4', order: 1 },
    ],
  },
  {
    id: 'mol-boron-trifluoride',
    name: 'Boron Trifluoride',
    formula: 'BF₃',
    iupac: 'Trifluoroborane',
    geometry: 'Trigonal Planar',
    hybridization: 'sp2',
    bondAngle: '120.0°',
    electronDomains: 3,
    lonePairs: 0,
    dipoleMoment: '0.00 D (Lewis Acid)',
    unit: 1,
    difficulty: 'Foundation',
    description: 'Boron forms three sp² hybrid orbitals in a single plane separated by 120°. The vacant unhybridized 2p_z orbital acts as an active electron-pair acceptor (Lewis Acid).',
    atoms: [
      { id: 'B1', symbol: 'B', color: '#fb923c', radius: 16, pos: [0, 0, 0] },
      { id: 'F1', symbol: 'F', color: '#22c55e', radius: 14, pos: [0, 1.31, 0] },
      { id: 'F2', symbol: 'F', color: '#22c55e', radius: 14, pos: [1.14, -0.66, 0] },
      { id: 'F3', symbol: 'F', color: '#22c55e', radius: 14, pos: [-1.14, -0.66, 0] },
    ],
    bonds: [
      { from: 'B1', to: 'F1', order: 1 },
      { from: 'B1', to: 'F2', order: 1 },
      { from: 'B1', to: 'F3', order: 1 },
    ],
  },
  {
    id: 'mol-beryllium-chloride',
    name: 'Beryllium Chloride',
    formula: 'BeCl₂',
    iupac: 'Dichloroberyllium',
    geometry: 'Linear',
    hybridization: 'sp',
    bondAngle: '180.0°',
    electronDomains: 2,
    lonePairs: 0,
    dipoleMoment: '0.00 D (Non-polar)',
    unit: 1,
    difficulty: 'Foundation',
    description: 'Beryllium combines its 2s orbital with one 2p orbital to form two collinear sp hybrid orbitals pointing directly opposite each other at 180°.',
    atoms: [
      { id: 'Be1', symbol: 'Be', color: '#06b6d4', radius: 15, pos: [0, 0, 0] },
      { id: 'Cl1', symbol: 'Cl', color: '#16a34a', radius: 18, pos: [-1.75, 0, 0] },
      { id: 'Cl2', symbol: 'Cl', color: '#16a34a', radius: 18, pos: [1.75, 0, 0] },
    ],
    bonds: [
      { from: 'Be1', to: 'Cl1', order: 1 },
      { from: 'Be1', to: 'Cl2', order: 1 },
    ],
  },
  {
    id: 'mol-ethene',
    name: 'Ethene (Ethylene)',
    formula: 'C₂H₄',
    iupac: 'Ethene',
    geometry: 'Planar (Double Bond)',
    hybridization: 'sp2',
    bondAngle: '121.3°',
    electronDomains: 3,
    lonePairs: 0,
    dipoleMoment: '0.00 D',
    unit: 1,
    difficulty: 'Intermediate',
    description: 'Each carbon is sp² hybridized forming three coplanar σ bonds. The remaining parallel unhybridized 2p orbitals overlap sideways to form the reactive π bond.',
    atoms: [
      { id: 'C1', symbol: 'C', color: '#334155', radius: 18, pos: [-0.67, 0, 0] },
      { id: 'C2', symbol: 'C', color: '#334155', radius: 18, pos: [0.67, 0, 0] },
      { id: 'H1', symbol: 'H', color: '#f8fafc', radius: 11, pos: [-1.24, 0.93, 0] },
      { id: 'H2', symbol: 'H', color: '#f8fafc', radius: 11, pos: [-1.24, -0.93, 0] },
      { id: 'H3', symbol: 'H', color: '#f8fafc', radius: 11, pos: [1.24, 0.93, 0] },
      { id: 'H4', symbol: 'H', color: '#f8fafc', radius: 11, pos: [1.24, -0.93, 0] },
    ],
    bonds: [
      { from: 'C1', to: 'C2', order: 2 },
      { from: 'C1', to: 'H1', order: 1 },
      { from: 'C1', to: 'H2', order: 1 },
      { from: 'C2', to: 'H3', order: 1 },
      { from: 'C2', to: 'H4', order: 1 },
    ],
  },
  {
    id: 'mol-ethyne',
    name: 'Ethyne (Acetylene)',
    formula: 'C₂H₂',
    iupac: 'Ethyne',
    geometry: 'Linear (Triple Bond)',
    hybridization: 'sp',
    bondAngle: '180.0°',
    electronDomains: 2,
    lonePairs: 0,
    dipoleMoment: '0.00 D',
    unit: 1,
    difficulty: 'Intermediate',
    description: 'Linear structure with sp hybridized carbons forming an axial C-C σ bond and two orthogonal π electron clouds (px-px and py-py sideways overlap).',
    atoms: [
      { id: 'C1', symbol: 'C', color: '#334155', radius: 18, pos: [-0.60, 0, 0] },
      { id: 'C2', symbol: 'C', color: '#334155', radius: 18, pos: [0.60, 0, 0] },
      { id: 'H1', symbol: 'H', color: '#f8fafc', radius: 11, pos: [-1.66, 0, 0] },
      { id: 'H2', symbol: 'H', color: '#f8fafc', radius: 11, pos: [1.66, 0, 0] },
    ],
    bonds: [
      { from: 'C1', to: 'C2', order: 3 },
      { from: 'C1', to: 'H1', order: 1 },
      { from: 'C2', to: 'H2', order: 1 },
    ],
  },
  {
    id: 'mol-benzene',
    name: 'Benzene',
    formula: 'C₆H₆',
    iupac: 'Benzene',
    geometry: 'Planar Hexagonal Ring',
    hybridization: 'sp2',
    bondAngle: '120.0°',
    electronDomains: 3,
    lonePairs: 0,
    dipoleMoment: '0.00 D (Aromatic)',
    unit: 1,
    difficulty: 'Intermediate',
    description: 'Archetypal aromatic system with six sp² carbons in a planar ring and a delocalized donut-shaped cloud of six π-electrons satisfying Hückel’s 4n+2 rule (n=1).',
    atoms: [
      { id: 'C1', symbol: 'C', color: '#334155', radius: 18, pos: [0, 1.40, 0] },
      { id: 'C2', symbol: 'C', color: '#334155', radius: 18, pos: [1.21, 0.70, 0] },
      { id: 'C3', symbol: 'C', color: '#334155', radius: 18, pos: [1.21, -0.70, 0] },
      { id: 'C4', symbol: 'C', color: '#334155', radius: 18, pos: [0, -1.40, 0] },
      { id: 'C5', symbol: 'C', color: '#334155', radius: 18, pos: [-1.21, -0.70, 0] },
      { id: 'C6', symbol: 'C', color: '#334155', radius: 18, pos: [-1.21, 0.70, 0] },
      { id: 'H1', symbol: 'H', color: '#f8fafc', radius: 11, pos: [0, 2.48, 0] },
      { id: 'H2', symbol: 'H', color: '#f8fafc', radius: 11, pos: [2.15, 1.24, 0] },
      { id: 'H3', symbol: 'H', color: '#f8fafc', radius: 11, pos: [2.15, -1.24, 0] },
      { id: 'H4', symbol: 'H', color: '#f8fafc', radius: 11, pos: [0, -2.48, 0] },
      { id: 'H5', symbol: 'H', color: '#f8fafc', radius: 11, pos: [-2.15, -1.24, 0] },
      { id: 'H6', symbol: 'H', color: '#f8fafc', radius: 11, pos: [-2.15, 1.24, 0] },
    ],
    bonds: [
      { from: 'C1', to: 'C2', order: 1.5 },
      { from: 'C2', to: 'C3', order: 1.5 },
      { from: 'C3', to: 'C4', order: 1.5 },
      { from: 'C4', to: 'C5', order: 1.5 },
      { from: 'C5', to: 'C6', order: 1.5 },
      { from: 'C6', to: 'C1', order: 1.5 },
      { from: 'C1', to: 'H1', order: 1 },
      { from: 'C2', to: 'H2', order: 1 },
      { from: 'C3', to: 'H3', order: 1 },
      { from: 'C4', to: 'H4', order: 1 },
      { from: 'C5', to: 'H5', order: 1 },
      { from: 'C6', to: 'H6', order: 1 },
    ],
  },
  {
    id: 'mol-cyclohexane',
    name: 'Cyclohexane (Chair Conformer)',
    formula: 'C₆H₁₂',
    iupac: 'Cyclohexane',
    geometry: 'Non-planar Chair',
    hybridization: 'sp3',
    bondAngle: '109.5°',
    electronDomains: 4,
    lonePairs: 0,
    dipoleMoment: '0.00 D',
    unit: 1,
    difficulty: 'Intermediate',
    description: 'Puckered chair conformation free of angle strain (all C-C-C angles are 109.5°) and torsional strain (all adjacent C-H bonds are perfectly staggered). Displays 6 axial and 6 equatorial hydrogens.',
    atoms: [
      { id: 'C1', symbol: 'C', color: '#334155', radius: 18, pos: [-1.26, 0.73, 0.25] },
      { id: 'C2', symbol: 'C', color: '#334155', radius: 18, pos: [0, 1.46, -0.25] },
      { id: 'C3', symbol: 'C', color: '#334155', radius: 18, pos: [1.26, 0.73, 0.25] },
      { id: 'C4', symbol: 'C', color: '#334155', radius: 18, pos: [1.26, -0.73, -0.25] },
      { id: 'C5', symbol: 'C', color: '#334155', radius: 18, pos: [0, -1.46, 0.25] },
      { id: 'C6', symbol: 'C', color: '#334155', radius: 18, pos: [-1.26, -0.73, -0.25] },
    ],
    bonds: [
      { from: 'C1', to: 'C2', order: 1 },
      { from: 'C2', to: 'C3', order: 1 },
      { from: 'C3', to: 'C4', order: 1 },
      { from: 'C4', to: 'C5', order: 1 },
      { from: 'C5', to: 'C6', order: 1 },
      { from: 'C6', to: 'C1', order: 1 },
    ],
  },
  {
    id: 'mol-butane',
    name: 'n-Butane (Anti Conformer)',
    formula: 'C₄H₁₀',
    iupac: 'Butane',
    geometry: 'Zigzag Chain',
    hybridization: 'sp3',
    bondAngle: '109.5°',
    electronDomains: 4,
    lonePairs: 0,
    dipoleMoment: '0.00 D',
    unit: 1,
    difficulty: 'Intermediate',
    description: 'Lowest potential energy conformer with dihedral angle θ = 180° between the two terminal methyl groups (anti-periplanar). Rotation around the C2-C3 bond produces gauche and eclipsed conformers.',
    atoms: [
      { id: 'C1', symbol: 'C', color: '#334155', radius: 18, pos: [-1.90, 0.75, 0] },
      { id: 'C2', symbol: 'C', color: '#334155', radius: 18, pos: [-0.60, 0, 0] },
      { id: 'C3', symbol: 'C', color: '#334155', radius: 18, pos: [0.60, 0, 0] },
      { id: 'C4', symbol: 'C', color: '#334155', radius: 18, pos: [1.90, -0.75, 0] },
    ],
    bonds: [
      { from: 'C1', to: 'C2', order: 1 },
      { from: 'C2', to: 'C3', order: 1 },
      { from: 'C3', to: 'C4', order: 1 },
    ],
  },
  {
    id: 'mol-ethanol',
    name: 'Ethanol',
    formula: 'C₂H₅OH',
    iupac: 'Ethanol',
    geometry: 'Tetrahedral / Bent Oxygen',
    hybridization: 'sp3',
    bondAngle: '108.5° (C-O-H)',
    electronDomains: 4,
    lonePairs: 2,
    dipoleMoment: '1.69 D (Hydrogen Bonding)',
    unit: 1,
    difficulty: 'Intermediate',
    description: 'Prototypical primary aliphatic alcohol with an sp³ oxygen capable of intermolecular hydrogen bonding, conferring high boiling point and complete water miscibility.',
    atoms: [
      { id: 'C1', symbol: 'C', color: '#334155', radius: 18, pos: [-1.20, 0, 0] },
      { id: 'C2', symbol: 'C', color: '#334155', radius: 18, pos: [0, 0.5, 0] },
      { id: 'O1', symbol: 'O', color: '#ef4444', radius: 17, pos: [1.10, -0.3, 0] },
      { id: 'H1', symbol: 'H', color: '#f8fafc', radius: 11, pos: [1.85, 0.25, 0] },
    ],
    bonds: [
      { from: 'C1', to: 'C2', order: 1 },
      { from: 'C2', to: 'O1', order: 1 },
      { from: 'O1', to: 'H1', order: 1 },
    ],
  },
  {
    id: 'mol-acetic-acid',
    name: 'Acetic Acid',
    formula: 'CH₃COOH',
    iupac: 'Ethanoic Acid',
    geometry: 'Trigonal Planar Carbonyl',
    hybridization: 'sp2 & sp3',
    bondAngle: '120° (C=O) / 109.5° (CH3)',
    electronDomains: 3,
    lonePairs: 4,
    dipoleMoment: '1.74 D (pKa = 4.76)',
    unit: 1,
    difficulty: 'Intermediate',
    description: 'Weak carboxylic acid with pKa 4.76. Deprotonation yields the resonance-stabilized acetate anion where negative charge is equally shared across both oxygen atoms.',
    atoms: [
      { id: 'C1', symbol: 'C', color: '#334155', radius: 18, pos: [-1.30, 0, 0] },
      { id: 'C2', symbol: 'C', color: '#334155', radius: 18, pos: [0.15, 0, 0] },
      { id: 'O1', symbol: 'O', color: '#ef4444', radius: 17, pos: [0.85, 1.10, 0] },
      { id: 'O2', symbol: 'O', color: '#ef4444', radius: 17, pos: [0.75, -1.15, 0] },
      { id: 'H1', symbol: 'H', color: '#f8fafc', radius: 11, pos: [1.68, -0.95, 0] },
    ],
    bonds: [
      { from: 'C1', to: 'C2', order: 1 },
      { from: 'C2', to: 'O1', order: 2 },
      { from: 'C2', to: 'O2', order: 1 },
      { from: 'O2', to: 'H1', order: 1 },
    ],
  },
  {
    id: 'mol-phenol',
    name: 'Phenol',
    formula: 'C₆H₅OH',
    iupac: 'Phenol',
    geometry: 'Planar Aromatic Ring',
    hybridization: 'sp2',
    bondAngle: '120° (Ring) / 109° (C-O-H)',
    electronDomains: 3,
    lonePairs: 2,
    dipoleMoment: '1.22 D (pKa = 9.95)',
    unit: 1,
    difficulty: 'Advanced',
    description: 'Aromatic alcohol markedly more acidic (pKa = 9.95) than aliphatic alcohols (pKa ≈ 16) due to resonance delocalization of the phenoxide conjugate base negative charge into the benzene ring.',
    atoms: [
      { id: 'C1', symbol: 'C', color: '#334155', radius: 18, pos: [0, 1.40, 0] },
      { id: 'C2', symbol: 'C', color: '#334155', radius: 18, pos: [1.21, 0.70, 0] },
      { id: 'C3', symbol: 'C', color: '#334155', radius: 18, pos: [1.21, -0.70, 0] },
      { id: 'C4', symbol: 'C', color: '#334155', radius: 18, pos: [0, -1.40, 0] },
      { id: 'C5', symbol: 'C', color: '#334155', radius: 18, pos: [-1.21, -0.70, 0] },
      { id: 'C6', symbol: 'C', color: '#334155', radius: 18, pos: [-1.21, 0.70, 0] },
      { id: 'O1', symbol: 'O', color: '#ef4444', radius: 17, pos: [0, 2.76, 0] },
      { id: 'H1', symbol: 'H', color: '#f8fafc', radius: 11, pos: [0.85, 3.15, 0] },
    ],
    bonds: [
      { from: 'C1', to: 'C2', order: 1.5 },
      { from: 'C2', to: 'C3', order: 1.5 },
      { from: 'C3', to: 'C4', order: 1.5 },
      { from: 'C4', to: 'C5', order: 1.5 },
      { from: 'C5', to: 'C6', order: 1.5 },
      { from: 'C6', to: 'C1', order: 1.5 },
      { from: 'C1', to: 'O1', order: 1 },
      { from: 'O1', to: 'H1', order: 1 },
    ],
  },
  {
    id: 'mol-aniline',
    name: 'Aniline',
    formula: 'C₆H₅NH₂',
    iupac: 'Benzenamine',
    geometry: 'Pyramidal Amine on Aromatic Ring',
    hybridization: 'sp2 (Ring) / sp3 (N)',
    bondAngle: '120° (Ring) / 112° (H-N-H)',
    electronDomains: 4,
    lonePairs: 1,
    dipoleMoment: '1.53 D (pKb = 9.37)',
    unit: 1,
    difficulty: 'Advanced',
    description: 'Weaker base (pKb 9.37) than aliphatic amines (pKb ≈ 3.3) because nitrogen’s lone pair is delocalized over ortho and para positions of the aromatic ring. Key precursor for diazonium salts and azo dyes.',
    atoms: [
      { id: 'C1', symbol: 'C', color: '#334155', radius: 18, pos: [0, 1.40, 0] },
      { id: 'C2', symbol: 'C', color: '#334155', radius: 18, pos: [1.21, 0.70, 0] },
      { id: 'C3', symbol: 'C', color: '#334155', radius: 18, pos: [1.21, -0.70, 0] },
      { id: 'C4', symbol: 'C', color: '#334155', radius: 18, pos: [0, -1.40, 0] },
      { id: 'C5', symbol: 'C', color: '#334155', radius: 18, pos: [-1.21, -0.70, 0] },
      { id: 'C6', symbol: 'C', color: '#334155', radius: 18, pos: [-1.21, 0.70, 0] },
      { id: 'N1', symbol: 'N', color: '#3b82f6', radius: 17, pos: [0, 2.80, 0.15] },
      { id: 'H1', symbol: 'H', color: '#f8fafc', radius: 11, pos: [0.82, 3.25, 0] },
      { id: 'H2', symbol: 'H', color: '#f8fafc', radius: 11, pos: [-0.82, 3.25, 0] },
    ],
    bonds: [
      { from: 'C1', to: 'C2', order: 1.5 },
      { from: 'C2', to: 'C3', order: 1.5 },
      { from: 'C3', to: 'C4', order: 1.5 },
      { from: 'C4', to: 'C5', order: 1.5 },
      { from: 'C5', to: 'C6', order: 1.5 },
      { from: 'C6', to: 'C1', order: 1.5 },
      { from: 'C1', to: 'N1', order: 1 },
      { from: 'N1', to: 'H1', order: 1 },
      { from: 'N1', to: 'H2', order: 1 },
    ],
  },
  {
    id: 'mol-lactic-acid-r',
    name: '(R)-Lactic Acid',
    formula: 'CH₃-CH(OH)-COOH',
    iupac: '(2R)-2-Hydroxypropanoic acid',
    geometry: 'Asymmetric Chiral Center (C2)',
    hybridization: 'sp3 at C2',
    bondAngle: '109.5°',
    electronDomains: 4,
    lonePairs: 4,
    dipoleMoment: '2.10 D (Chiral)',
    unit: 1,
    difficulty: 'Advanced',
    description: 'Chiral carbon bonded to 4 distinct ligands: -OH (priority 1), -COOH (priority 2), -CH3 (priority 3), -H (priority 4). With H oriented in back, priority sequence 1→2→3 is clockwise (R).',
    atoms: [
      { id: 'C_star', symbol: 'C*', color: '#eab308', radius: 20, pos: [0, 0, 0] }, // Highlighted chiral carbon
      { id: 'O_OH', symbol: 'O', color: '#ef4444', radius: 17, pos: [0, 1.42, 0] },
      { id: 'C_COOH', symbol: 'C', color: '#334155', radius: 18, pos: [1.35, -0.75, 0] },
      { id: 'C_CH3', symbol: 'C', color: '#334155', radius: 18, pos: [-1.25, -0.65, 0.6] },
      { id: 'H_H', symbol: 'H', color: '#f8fafc', radius: 11, pos: [-0.35, -0.45, -1.0] },
    ],
    bonds: [
      { from: 'C_star', to: 'O_OH', order: 1 },
      { from: 'C_star', to: 'C_COOH', order: 1 },
      { from: 'C_star', to: 'C_CH3', order: 1 },
      { from: 'C_star', to: 'H_H', order: 1 },
    ],
  },
];

// ════════════════════════════════════════════════════════════════════════
// 3. CHEMISTRY MISSIONS (Section 36)
// ════════════════════════════════════════════════════════════════════════

export const CHEMISTRY_MISSIONS: IChemMission[] = [
  {
    id: 'mission-01',
    missionNumber: 1,
    title: 'Architect of sp³ Hybridization',
    category: 'Molecular Structure',
    prompt: 'Configure atomic orbitals into a tetrahedral sp³ geometry with 109.5° bond angle.',
    task: 'Launch Atomic Orbitals & Hybridization Viewer, switch to Hybridization mode, select sp³ hybridization, and observe all four electron domains.',
    rewardBadge: '🏅 Quantum Bond Architect',
    simKey: 'chem-orbitals-hybridization',
    targetMetric: 'Angle: 109.5° · 4 Domains',
  },
  {
    id: 'mission-02',
    missionNumber: 2,
    title: 'Chirality & Stereochemical Mastery',
    category: 'Molecular Structure',
    prompt: 'Assign CIP priority to 4 distinct groups and determine whether the chiral stereocenter is (R) or (S).',
    task: 'Launch Chirality & Fischer Projection Identifier, view the chiral lactic acid model, orient group 4 to back, and confirm R/S assignment.',
    rewardBadge: '🧭 Stereocenter Navigator',
    simKey: 'chem-chirality-fischer',
    targetMetric: 'CIP Rule Verified · Optical Activity [α]',
  },
  {
    id: 'mission-03',
    missionNumber: 3,
    title: 'SN1 vs SN2 Kinetic Predictor',
    category: 'Mechanisms',
    prompt: 'Predict whether a tertiary alkyl halide in polar protic solvent undergoes SN1 or SN2 substitution.',
    task: 'Launch SN1 vs SN2 Mechanism Lab, set Substrate = Tertiary, Solvent = Water (Protic), observe carbocation formation and Walden inversion absence.',
    rewardBadge: '⚡ Reaction Pathway Master',
    simKey: 'chem-sn1-sn2-mechanism',
    targetMetric: 'Mechanism: SN1 · Double-Hump Profile',
  },
  {
    id: 'mission-04',
    missionNumber: 4,
    title: 'Galvanic Voltage Engineer',
    category: 'Electrochemistry',
    prompt: 'Construct a Daniell Galvanic Cell (Zn | Zn²⁺ || Cu²⁺ | Cu) and calculate cell potential via Nernst equation.',
    task: 'Launch Galvanic Cell & Nernst Simulator, set [Zn²⁺] = 0.01 M and [Cu²⁺] = 1.0 M, calculate EMF at 298 K.',
    rewardBadge: '🔋 Voltaic Cell Pioneer',
    simKey: 'chem-galvanic-nernst-cell',
    targetMetric: 'EMF > 1.10 V Calculated',
  },
  {
    id: 'mission-05',
    missionNumber: 5,
    title: 'Beer-Lambert Quantitative Spectroscopist',
    category: 'Spectroscopy',
    prompt: 'Construct a 5-point spectrophotometric calibration curve and determine an unknown solute concentration.',
    task: 'Launch Virtual Lab — Verification of Beer-Lambert Law, measure absorbances of serial standard dilutions, calculate slope ε·b, and find unknown concentration.',
    rewardBadge: '🔬 Optical Density Expert',
    simKey: 'chem-lab-beer-lambert',
    targetMetric: 'Linear Regression R² ≥ 0.998',
  },
  {
    id: 'mission-06',
    missionNumber: 6,
    title: 'Unknown Compound Detective',
    category: 'Spectroscopy',
    prompt: 'Analyze characteristic vibrational peaks in an IR spectrum to deduce the functional group.',
    task: 'Launch IR & NMR Spectrum Interpreter, locate the sharp absorption at 1715 cm⁻¹ (C=O carbonyl) and absence of broad 3300 cm⁻¹ (O-H) to identify ketone.',
    rewardBadge: '🕵️ Spectral Forensic Detective',
    simKey: 'chem-spectroscopy-interpreter',
    targetMetric: 'Functional Group Correctly Identified',
  },
  {
    id: 'mission-07',
    missionNumber: 7,
    title: 'Chemical Reaction Order Investigator',
    category: 'Kinetics',
    prompt: 'Analyze concentration-time kinetic data to differentiate zero, first, and second order rate laws.',
    task: 'Launch Reaction Rate Laws & Kinetics Simulator, test linear fits for [A] vs t, ln[A] vs t, and 1/[A] vs t to determine order and rate constant k.',
    rewardBadge: '⏱️ Kinetic Order Analyst',
    simKey: 'chem-reaction-kinetics',
    targetMetric: 'Order & Half-Life t1/2 Verified',
  },
  {
    id: 'mission-08',
    missionNumber: 8,
    title: 'Azo Dye Synthesis High-Yield Chemist',
    category: 'Synthesis',
    prompt: 'Synthesize Sudan I dye by diazotizing aniline at 0–5 °C followed by alkaline coupling with β-naphthol.',
    task: 'Launch Virtual Lab — Azo Dye Preparation, maintain ice-bath thermal control to prevent diazonium decomposition, execute coupling, and achieve >85% yield.',
    rewardBadge: '🧣 Azo Dye Synthesizer',
    simKey: 'chem-lab-azo-coupling',
    targetMetric: 'Yield ≥ 85% · Vivid Orange-Red Dye',
  },
];

// ════════════════════════════════════════════════════════════════════════
// 4. VIRTUAL LAB EXPERIMENTS REPOSITORY (Unit VI)
// ════════════════════════════════════════════════════════════════════════

export const VIRTUAL_LAB_EXPERIMENTS: IVirtualLabExperiment[] = [
  {
    id: 'lab-01',
    labNumber: 1,
    title: 'Determination of pKa of Acetic Acid & Phenol by pH Titration',
    aim: 'To determine the acid dissociation constant (pKa) of a weak acid (acetic acid and phenol) by measuring pH during potentiometric titration with standard NaOH.',
    theory: 'When a weak acid HA is titrated with strong base NaOH, neutralisation produces conjugate base A⁻. At the half-neutralisation point, [HA] = [A⁻], and according to the Henderson-Hasselbalch equation pH = pKa + log([A⁻]/[HA]), the measured pH equals the pKa of the acid.',
    principleEquation: 'pH_{1/2} = pK_a \\quad \\text{at} \\quad V = \\frac{V_{eq}}{2}',
    apparatus: ['Digital pH Meter with combination glass electrode', 'Micro-burette (25 mL)', 'Magnetic stirrer and Teflon stir bar', 'Volumetric pipette (10 mL)', 'Beakers (100 mL)', 'Standard buffer capsules (pH 4.0, 7.0, 9.2)'],
    chemicals: ['0.1 M Acetic acid (CH₃COOH)', '0.05 M Phenol (C₆H₅OH)', 'Standardized 0.1 M Sodium hydroxide (NaOH)', 'Deionised water'],
    safety: ['Wear chemical splash goggles and nitrile gloves.', 'Phenol is toxic and causes severe chemical burns on contact; wash with copious water and PEG if splashed.', 'Ensure electrode is kept moist in 3M KCl.'],
    procedureSteps: [
      'Calibrate the pH meter using standard buffer solutions at pH 4.01, 7.00, and 9.21.',
      'Pipette 20.0 mL of unknown 0.1 M acetic acid into a clean 100 mL beaker, add sufficient deionised water to immerse the glass bulb, and place on magnetic stirrer.',
      'Fill the micro-burette with standardized 0.100 M NaOH solution to the zero mark.',
      'Record the initial pH of the acid solution before adding any titrant.',
      'Add NaOH in 0.5 mL increments with continuous gentle stirring, recording the steady pH after each addition.',
      'Near the equivalence point (rapid pH jump), reduce addition increments to 0.1 mL.',
      'Continue titration 3–4 mL past the inflection point.',
      'Plot pH vs Volume of NaOH (titration curve) and ΔpH/ΔV vs V (first derivative curve) to locate equivalence volume V_eq and half-neutralization volume V_eq/2.',
    ],
    keyObservations: 'Equivalence point for 0.1 M CH₃COOH occurs at steep inflection near pH 8.7. Half-equivalence point at V_eq/2 yields pKa ≈ 4.76. Phenol shows subtle buffer plateau near pKa ≈ 9.95.',
    vivaQuestions: [
      { q: 'Why is the equivalence point pH greater than 7 for acetic acid titration?', a: 'Because the salt formed (sodium acetate CH₃COONa) undergoes anionic hydrolysis: CH₃COO⁻ + H₂O ⇌ CH₃COOH + OH⁻, producing an alkaline solution.' },
      { q: 'Why is the half-equivalence point significant in pKa determination?', a: 'At half-neutralization, exactly half of the weak acid has been converted to its conjugate base, making [HA] = [A⁻]. The ratio [A⁻]/[HA] = 1, so log(1) = 0 and pH = pKa.' },
      { q: 'Why is phenol less acidic than acetic acid but more acidic than ethanol?', a: 'Phenol is more acidic than ethanol because the phenoxide ion is resonance-stabilized by the aromatic ring. However, in acetic acid, the negative charge is delocalized over two highly electronegative oxygen atoms, which is far more stabilizing than carbon delocalization in phenoxide.' },
    ],
    simKey: 'chem-lab-pka-titration',
  },
  {
    id: 'lab-02',
    labNumber: 2,
    title: 'Preparation of 1-Phenylazo-2-naphthol (Sudan I Azo Dye)',
    aim: 'To synthesize an azo dye (1-phenylazo-2-naphthol) by diazotization of aniline and subsequent electrophilic coupling with alkaline 2-naphthol under strict thermal control (0–5 °C).',
    theory: 'Primary aromatic amines react with nitrous acid (HNO₂ generated in situ from NaNO₂ and HCl) at 0–5 °C to form benzenediazonium chloride. The diazonium cation is a weak electrophile that couples with electron-rich aromatic compounds like 2-naphthol in alkaline solution to produce vivid orange-red azo compounds containing the -N=N- azo chromophore.',
    principleEquation: 'C_6H_5NH_2 \\xrightarrow{NaNO_2/HCl, 0-5°C} C_6H_5N_2^+Cl^- \\xrightarrow{2-Naphthol/NaOH} C_6H_5-N=N-C_{10}H_6OH',
    apparatus: ['Ice bath with thermometer', 'Conical flasks (100 mL, 250 mL)', 'Buchner funnel and vacuum filtration flask', 'Filter paper (Whatman No. 1)', 'Glass rod and droppers'],
    chemicals: ['Aniline (2.5 mL)', 'Concentrated Hydrochloric acid (8 mL)', 'Sodium nitrite (NaNO₂, 2.0 g in 10 mL water)', '2-Naphthol (β-naphthol, 4.0 g in 10% NaOH)', 'Crushed ice'],
    safety: ['Aniline is toxic by skin absorption; handle exclusively in fume hood with gloves.', 'Diazonium salts are explosive when dry or heated above 5 °C; maintain ice temperature throughout.', 'Nitrous fumes (NOx) are toxic; keep containers covered.'],
    procedureSteps: [
      'Dissolve 2.5 mL aniline in 8 mL concentrated HCl and 15 mL water in a conical flask, cool in an ice bath to below 5 °C.',
      'Dissolve 2.0 g sodium nitrite in 10 mL water and cool in the ice bath.',
      'Slowly add the cold sodium nitrite solution dropwise to the aniline hydrochloride solution with continuous swirling, maintaining temperature strictly between 0 and 5 °C.',
      'Test for excess nitrous acid with starch-iodide paper (blue colour indicates completion).',
      'Dissolve 4.0 g 2-naphthol in 25 mL 10% NaOH and cool to 0–5 °C in ice.',
      'Slowly pour the diazonium solution into the alkaline 2-naphthol solution with vigorous stirring. A brilliant orange-red precipitate separates immediately.',
      'Allow the reaction mixture to stand in the ice bath for 30 minutes to complete precipitation.',
      'Filter using a Buchner funnel under vacuum, wash with cold water, dry, and calculate percentage yield.',
    ],
    keyObservations: 'Formation of brilliant scarlet/orange-red crystals of 1-phenylazo-2-naphthol. Typical yield: 85–92%. Melting point: 131–133 °C.',
    vivaQuestions: [
      { q: 'Why must the temperature be maintained strictly between 0 and 5 °C during diazotization?', a: 'Benzenediazonium chloride is thermally unstable; above 5 °C, it rapidly hydrolyzes to phenol with the evolution of nitrogen gas: C₆H₅N₂⁺ + H₂O → C₆H₅OH + N₂↑ + H⁺.' },
      { q: 'Why is coupling carried out in an alkaline medium for phenols?', a: 'In alkaline medium, phenol is converted to phenoxide ion (Ar-O⁻), which is vastly more electron-rich and reactive toward electrophilic attack by the weak diazonium electrophile than neutral phenol.' },
      { q: 'What is a chromophore and auxochrome in Sudan I?', a: 'The -N=N- azo group is the chromophore (colour-producing group), while the -OH group is the auxochrome (intensifies colour and deepens absorption bathochromically).' },
    ],
    simKey: 'chem-lab-azo-coupling',
  },
  {
    id: 'lab-03',
    labNumber: 3,
    title: 'Qualitative Organic Analysis for Acids, Aldehydes & Amines',
    aim: 'To identify unknown organic compounds and classify their functional groups using diagnostic chemical tests.',
    theory: 'Functional groups impart characteristic chemical reactivity. Carboxylic acids effervesce with NaHCO₃ releasing CO₂. Aldehydes reduce Tollens reagent to metallic silver and Fehling solution to red Cu₂O. Primary amines yield carbylamine odor and form diazonium dyes.',
    principleEquation: 'R-COOH + NaHCO_3 \\rightarrow R-COONa + H_2O + CO_2\\uparrow',
    apparatus: ['Test tubes & test tube stand', 'Water bath', 'Glass droppers', 'Bunsen burner', 'Spot plates'],
    chemicals: ['Sodium bicarbonate (10%)', 'Tollens reagent (ammoniacal AgNO₃)', 'Fehling solutions A & B', 'Schiff reagent', 'Chloroform & alcoholic KOH', 'Dilute HCl and NaNO₂'],
    safety: ['Tollens reagent forms explosive silver fulminate on standing; prepare freshly and dispose of immediately after test.', 'Carbylamine test produces toxic isocyanide; perform only with micro-quantities in fume hood.'],
    procedureSteps: [
      'Take 0.5 mL of unknown liquid or 0.1 g solid in a clean dry test tube.',
      'Test 1 (Acids): Add 2 mL saturated NaHCO₃ solution. Observe for brisk effervescence of CO₂ gas.',
      'Test 2 (Aldehydes): Add 1 mL freshly prepared Tollens reagent. Warm in 60 °C water bath for 5 minutes without shaking. Observe for silver mirror on test tube walls.',
      'Test 3 (Fehling test): Mix equal volumes of Fehling A and Fehling B, add sample, boil. Red precipitate of Cu₂O confirms aliphatic aldehyde.',
      'Test 4 (Amines): Dissolve unknown in dilute HCl. Cool in ice, add NaNO₂ and alkaline β-naphthol. Formation of orange-red azo dye confirms primary aromatic amine.',
    ],
    keyObservations: 'Brisk effervescence with NaHCO₃ confirms -COOH. Silver mirror on glass tube confirms -CHO. Bright scarlet azo dye confirms primary aromatic amine -NH₂.',
    vivaQuestions: [
      { q: 'Why do aldehydes reduce Tollens reagent while ketones do not?', a: 'Aldehydes possess an oxidizable hydrogen atom directly attached to the carbonyl carbon (R-CHO), allowing facile oxidation to carboxylic acids, whereas ketones (R-CO-R) lack this hydrogen and resist mild oxidation.' },
      { q: 'What is the chemical composition of Fehling solution A and B?', a: 'Fehling A is aqueous copper(II) sulfate (CuSO₄·5H₂O), and Fehling B is alkaline sodium potassium tartrate (Rochelle salt) dissolved in sodium hydroxide.' },
    ],
    simKey: 'chem-lab-qualitative-tests',
  },
  {
    id: 'lab-04',
    labNumber: 4,
    title: 'Molecular Weight & Degree of Polymerization via Ostwald Viscometer',
    aim: 'To determine the viscosity-average molecular weight (Mv) and degree of polymerization (DP) of a polymer using an Ostwald capillary viscometer.',
    theory: 'The efflux time t of a polymer solution through a capillary depends on hydrodynamic volume and chain size. By measuring efflux times at multiple concentrations, relative viscosity ηr = t/t₀ and specific viscosity ηsp = (t - t₀)/t₀ are calculated. Extrapolating reduced viscosity ηsp/c to zero concentration gives intrinsic viscosity [η], which relates to molecular weight via Mark-Houwink equation [η] = K·(Mv)^a.',
    principleEquation: '[\\eta] = \\lim_{c \\to 0} \\frac{\\eta_{sp}}{c} = K \\cdot M_v^a',
    apparatus: ['Ostwald capillary viscometer', 'Precision stop watch (0.01 s)', 'Constant temperature water bath (30 ± 0.1 °C)', 'Volumetric flasks (50 mL)', 'Rubber bulb aspirator'],
    chemicals: ['Polyvinyl alcohol (PVA) or Polymethyl methacrylate (PMMA)', 'Solvent (distilled water or acetone/toluene)', 'Chromic acid cleaning solution'],
    safety: ['Handle capillary viscometer with extreme care to prevent glass breakage.', 'Ensure zero particulate dust in viscometer by filtering solutions.'],
    procedureSteps: [
      'Clean the Ostwald viscometer with warm chromic acid, rinse thoroughly with distilled water, and mount vertically in constant temperature bath.',
      'Pipette exactly 15.0 mL of pure solvent into the viscometer reservoir.',
      'Allow thermal equilibrium for 10 minutes, draw liquid above the upper mark, release, and record efflux time t₀ to 0.01 s.',
      'Repeat with serial polymer concentrations (c = 0.2, 0.4, 0.6, 0.8, 1.0 g/dL).',
      'Calculate ηr = t/t₀, ηsp = ηr - 1, and reduced viscosity ηred = ηsp/c for each concentration.',
      'Plot ηsp/c vs c (Huggins plot) and ln(ηr)/c vs c (Kraemer plot) to find the common intercept [η].',
      'Compute Mv using known Mark-Houwink constants K and a for the polymer-solvent system.',
    ],
    keyObservations: 'Efflux time increases monotonically with polymer concentration. The Huggins plot gives a linear fit with intercept [η]. Molecular weight Mv calculated in g/mol.',
    vivaQuestions: [
      { q: 'What is the physical meaning of intrinsic viscosity [η]?', a: 'Intrinsic viscosity has dimensions of inverse concentration (dL/g) and represents the capacity of an isolated polymer molecule to increase viscosity in infinite dilution, independent of intermolecular chain entanglements.' },
      { q: 'Why is viscosity-average molecular weight (Mv) intermediate between Mn and Mw?', a: 'Because the Mark-Houwink exponent a typically ranges between 0.5 and 0.8; when a = 1, Mv = Mw, and when a < 1, Mn < Mv < Mw.' },
    ],
    simKey: 'chem-lab-viscometer-mw',
  },
  {
    id: 'lab-05',
    labNumber: 5,
    title: 'Rate Constant of Acid-Catalysed Ester Hydrolysis',
    aim: 'To determine the pseudo-first-order rate constant (k) for the hydrochloric acid-catalysed hydrolysis of ethyl acetate.',
    theory: 'Hydrolysis of ethyl acetate (CH₃COOC₂H₅ + H₂O ⇌ CH₃COOH + C₂H₅OH) involves two reactants, but because water is present in vast stoichiometric excess, its concentration remains effectively constant. The reaction follows pseudo-first-order kinetics with integrated rate law k = (2.303/t) · log[(V∞ - V₀) / (V∞ - Vt)].',
    principleEquation: 'k = \\frac{2.303}{t} \\log_{10} \\left( \\frac{V_\\infty - V_0}{V_\\infty - V_t} \\right)',
    apparatus: ['Thermostated water bath (30 °C)', 'Burette (50 mL)', 'Pipettes (5 mL, 20 mL)', 'Conical flasks (100 mL)', 'Crushed ice container'],
    chemicals: ['Ethyl acetate (AR grade)', '0.5 M Hydrochloric acid (HCl)', 'Standardized 0.1 M Sodium hydroxide (NaOH)', 'Phenolphthalein indicator', 'Crushed ice water'],
    safety: ['Ethyl acetate is volatile and flammable; keep away from open flames.', 'Quench aliquots immediately in crushed ice water to freeze reaction rate prior to titration.'],
    procedureSteps: [
      'Pipette 100 mL of 0.5 M HCl into a clean stoppered flask and place in 30 °C water bath for 15 minutes.',
      'Pipette 5.0 mL of ethyl acetate into the flask, start stopwatch at the moment of addition, shake well.',
      'Immediately withdraw 5.0 mL aliquot (time t = 0), transfer to a conical flask containing 20 mL ice-cold water (quench), add phenolphthalein, and titrate rapidly with 0.1 M NaOH to pale pink endpoint (V₀).',
      'Withdraw 5.0 mL aliquots at regular intervals (t = 10, 20, 30, 40, 60 minutes) and titrate against NaOH (Vt).',
      'Heat the remaining reaction mixture to 60 °C for 30 minutes to complete hydrolysis, cool, and titrate to obtain infinity reading V∞.',
      'Calculate k for each time interval and determine the mean rate constant k in min⁻¹.',
    ],
    keyObservations: 'Burette reading increases with time as acetic acid is liberated. A plot of log(V∞ - Vt) vs t yields a straight line with slope = -k / 2.303.',
    vivaQuestions: [
      { q: 'Why is ester hydrolysis called a pseudo-first-order reaction?', a: 'Even though it is bimolecular involving both ester and water, water is the solvent present in enormous excess (~55.5 M) so its concentration remains practically unchanged. The rate depends only on ester concentration.' },
      { q: 'Why is the aliquot added to ice-cold water before titration?', a: 'Ice water drastically lowers the temperature and dilutes the acid catalyst, effectively arresting the hydrolysis reaction so the titration accurately reflects the concentration at that exact sampled moment.' },
    ],
    simKey: 'chem-lab-ester-hydrolysis',
  },
  {
    id: 'lab-06',
    labNumber: 6,
    title: 'Cell EMF Measurement using Calomel & Glass Electrodes',
    aim: 'To construct an electrochemical cell and measure EMF using a saturated calomel electrode (SCE) and glass indicator electrode to determine unknown hydrogen ion activity.',
    theory: 'The glass electrode consists of a thin lithium silicate glass bulb sensitive to hydrogen ions. When combined with the constant reference potential of a Saturated Calomel Electrode (Hg/Hg₂Cl₂/KCl, E° = +0.241 V vs SHE), the total cell EMF E_cell = E°_cell - 0.0592 · pH at 25 °C.',
    principleEquation: 'E_{cell} = E°_{cell} - 0.0592 \\cdot pH \\quad \\text{at 298 K}',
    apparatus: ['High-impedance digital potentiometer / potentiometer pH meter', 'Saturated Calomel Electrode (SCE)', 'Glass membrane indicator electrode', 'Magnetic stirrer', 'Beakers (100 mL)'],
    chemicals: ['Standard buffer solutions (pH 4.01, 7.00, 9.21)', 'Unknown acid solutions', 'Saturated potassium chloride (KCl) solution', 'Deionised water'],
    safety: ['Glass electrode bulb is extremely fragile (approx 0.1 mm thick glass); handle with care.', 'Calomel electrode contains mercury; handle responsibly and prevent contamination.'],
    procedureSteps: [
      'Rinse both electrodes with deionised water and blot gently with tissue paper (never rub).',
      'Immerse electrodes into pH 4.01 buffer, measure EMF in millivolts.',
      'Repeat with pH 7.00 and pH 9.21 buffer solutions.',
      'Plot calibration graph: EMF (mV) vs pH, and verify Nernst slope (approx 59.2 mV per pH unit).',
      'Immerse cleaned electrodes into unknown acid sample, measure steady EMF, and interpolate pH from calibration curve.',
    ],
    keyObservations: 'Calibration line shows negative slope of approximately -59.2 mV/pH at 25 °C. Unknown acid pH determined with high precision.',
    vivaQuestions: [
      { q: 'Why is a high-input-impedance voltmeter required for glass electrode measurements?', a: 'The glass membrane has extremely high electrical resistance (10 to 1000 Megaohms). Standard voltmeters would draw current causing significant IR voltage drop and polarize the membrane.' },
      { q: 'What is the composition and potential of the Saturated Calomel Electrode?', a: 'SCE consists of mercury, mercurous chloride paste (calomel, Hg₂Cl₂), in contact with saturated KCl solution. Its standard reduction potential is +0.2415 V vs Standard Hydrogen Electrode at 25 °C.' },
    ],
    simKey: 'chem-lab-emf-electrodes',
  },
  {
    id: 'lab-07',
    labNumber: 7,
    title: 'Distribution Coefficient of Iodine between Water & CCl₄',
    aim: 'To determine the partition coefficient (distribution coefficient KD) of iodine between two immiscible liquids (water and carbon tetrachloride).',
    theory: 'According to Nernst Distribution Law, when a solute is added to two immiscible liquid phases in contact at constant temperature, it distributes itself such that the ratio of concentrations in both phases is constant provided the molecular state remains unchanged: KD = C(organic) / C(aqueous).',
    principleEquation: 'K_D = \\frac{[I_2]_{CCl_4}}{[I_2]_{H_2O}} = \\text{Constant}',
    apparatus: ['Separating funnels (250 mL)', 'Conical flasks (100 mL)', 'Pipettes (10 mL, 20 mL)', 'Burette (50 mL)'],
    chemicals: ['Saturated solution of iodine in carbon tetrachloride (CCl₄)', 'Standardized 0.01 M Sodium thiosulfate (Na₂S₂O₃, hypo)', 'Starch indicator solution', '10% Potassium iodide (KI) solution'],
    safety: ['Carbon tetrachloride (CCl₄) is toxic and carcinogenic; use in fume hood only or substitute with cyclohexane/heptane.', 'Relieve gas pressure in separating funnel by inverting and opening stopcock frequently.'],
    procedureSteps: [
      'Take 20 mL of iodine in CCl₄ and 100 mL deionised water in separating funnel 1.',
      'Take 15 mL iodine in CCl₄ + 5 mL pure CCl₄ and 100 mL water in separating funnel 2.',
      'Shake both funnels vigorously for 20 minutes to achieve partition equilibrium, allow layers to separate completely.',
      'Carefully drain and discard the bottom 2 mL of organic layer to clear the stopcock bore.',
      'Pipette 5.0 mL of the organic layer, add 10 mL 10% KI, and titrate with 0.05 M hypo using starch indicator to find [I₂]_CCl4.',
      'Pipette 50.0 mL of upper aqueous layer, add 5 mL 10% KI, and titrate with 0.005 M hypo to find [I₂]_water.',
      'Calculate ratio KD for both systems and report average value.',
    ],
    keyObservations: 'Iodine is intensely violet in CCl₄ and pale yellow in water. KD ≈ 85 at 25 °C, proving iodine is vastly more soluble in non-polar CCl₄.',
    vivaQuestions: [
      { q: 'Why is potassium iodide (KI) added before titrating aqueous iodine with hypo?', a: 'Iodine has very low solubility in pure water; adding KI converts I₂ to the highly soluble triiodide complex ion: I₂ + I⁻ ⇌ I₃⁻, preventing loss of volatile iodine during titration.' },
      { q: 'Under what conditions does Nernst distribution law fail?', a: 'Nernst distribution law fails if the solute undergoes association (e.g. benzoic acid in benzene), dissociation (e.g. ionic salts in water), or chemical reaction with either solvent.' },
    ],
    simKey: 'chem-lab-iodine-distribution',
  },
  {
    id: 'lab-08',
    labNumber: 8,
    title: 'Verification of Beer-Lambert Law using UV-Vis Spectrophotometer',
    aim: 'To verify Beer-Lambert law using standard serial dilutions of potassium permanganate (KMnO₄) or copper sulfate (CuSO₄) and determine the concentration of an unknown solution.',
    theory: 'When monochromatic light of incident intensity I₀ passes through an absorbing medium, transmitted light intensity I decreases exponentially with thickness b and concentration c. Absorbance A = log₁₀(I₀/I) = ε·b·c. A plot of Absorbance vs Concentration yields a straight line passing through the origin with slope = ε·b.',
    principleEquation: 'A = \\log_{10}\\left(\\frac{I_0}{I}\\right) = \\varepsilon \\cdot b \\cdot c',
    apparatus: ['Double-beam UV-Visible spectrophotometer or digital photoelectric colorimeter', 'Matched optical quartz / optical glass cuvettes (1.00 cm path length)', 'Volumetric flasks (50 mL, 100 mL)', 'Micropipettes (100–1000 µL)'],
    chemicals: ['Analytical grade Potassium permanganate (KMnO₄, 0.01 M stock solution)', '0.1 M Sulfuric acid (H₂SO₄)', 'Deionised water (blank solvent)'],
    safety: ['KMnO₄ is a powerful stain and oxidizer; avoid skin contact.', 'Never touch the optical transparent faces of cuvettes; handle only frosted sides.', 'Wipe optical faces clean with lint-free lens tissue before placing in sample holder.'],
    procedureSteps: [
      'Switch on spectrophotometer and allow lamp warm-up for 20 minutes.',
      'Determine absorption maximum (λ_max) by scanning stock solution from 400 nm to 600 nm (KMnO₄ shows characteristic peak at 525 nm / 545 nm).',
      'Set wavelength at λ_max = 525 nm and calibrate zero absorbance using pure solvent blank in both reference and sample cuvettes.',
      'Prepare standard serial dilutions from stock (e.g., 0.0001, 0.0002, 0.0003, 0.0004, 0.0005 M).',
      'Measure and record optical absorbance A for each concentration in matched 1.0 cm cuvette.',
      'Measure absorbance of the unknown sample solution.',
      'Plot calibration curve: Absorbance A vs Concentration c. Verify linearity (R² ≥ 0.998).',
      'Interpolate the unknown concentration from the calibration curve.',
    ],
    keyObservations: 'Linear response between absorbance and concentration up to A ≈ 1.2. Unknown concentration calculated accurately from calibration slope.',
    vivaQuestions: [
      { q: 'Why is spectrophotometric measurement performed at λ_max?', a: 'At the absorption maximum (λ_max), molar absorptivity ε is highest, ensuring maximum measurement sensitivity, and the rate of change of absorbance with wavelength dA/dλ is zero, minimizing errors due to slight monochromator wavelength deviations.' },
      { q: 'What causes deviations from Beer-Lambert law at high concentrations?', a: 'At concentrations above ~0.01 M, intermolecular electrostatic interactions between absorbing species alter charge distribution, changing molar absorptivity. Also, refractive index changes and stray light cause negative deviations.' },
    ],
    simKey: 'chem-lab-beer-lambert',
  },
];

// ════════════════════════════════════════════════════════════════════════
// 5. VIVA VOCE QUESTION BANK
// ════════════════════════════════════════════════════════════════════════

export const VIVA_VOCE_BANK: IVivaItem[] = [
  {
    id: 'viva-01',
    unit: 1,
    question: 'Why does hybridization occur in atoms prior to bond formation?',
    answer: 'Hybridization occurs because mixing non-equivalent atomic orbitals (such as 2s and 2p) produces equivalent directed hybrid orbitals with greater directional lobe overlap, forming stronger, more stable covalent bonds and minimizing inter-electron repulsions.',
    concept: 'Hybridization & Bond Energy',
    difficulty: 'Core',
  },
  {
    id: 'viva-02',
    unit: 1,
    question: 'What is the physical meaning of wave-particle duality in de Broglie equation?',
    answer: 'de Broglie postulated that any moving matter particle with mass m and velocity v behaves simultaneously as a wave with wavelength λ = h/(mv). In macroscopic bodies this wavelength is unmeasurably small, but for subatomic electrons it is on the scale of atomic spacing.',
    concept: 'Wave-Particle Duality',
    difficulty: 'Core',
  },
  {
    id: 'viva-03',
    unit: 1,
    question: 'Why is the anti conformer of n-butane more stable than the gauche conformer?',
    answer: 'In the anti conformer, the two bulky methyl groups are separated by a 180° dihedral angle, minimizing steric hindrance (van der Waals strain). In the gauche conformer, they are at 60°, introducing 3.8 kJ/mol of steric repulsion.',
    concept: 'Conformational Analysis',
    difficulty: 'Viva Standard',
  },
  {
    id: 'viva-04',
    unit: 2,
    question: 'Why does SN2 substitution lead to complete stereochemical inversion (Walden Inversion)?',
    answer: 'In an SN2 mechanism, the nucleophile attacks the electrophilic carbon strictly from the backside opposite to the leaving group (180° trajectory) to avoid electrostatic repulsion and overlap with the anti-bonding σ* orbital, forcing the remaining three groups to flip like an umbrella.',
    concept: 'SN2 Stereochemistry',
    difficulty: 'Core',
  },
  {
    id: 'viva-05',
    unit: 2,
    question: 'What is the role of anhydrous AlCl3 in Friedel-Crafts alkylation?',
    answer: 'Anhydrous AlCl₃ acts as a Lewis acid catalyst by accepting a chloride ion from alkyl halide (R-Cl + AlCl₃ ⇌ R⁺ + [AlCl₄]⁻), generating the potent carbocation electrophile necessary to disrupt benzene’s aromatic ring.',
    concept: 'Electrophilic Aromatic Substitution',
    difficulty: 'Viva Standard',
  },
  {
    id: 'viva-06',
    unit: 3,
    question: 'What is the difference between addition and condensation polymerization?',
    answer: 'Addition polymerization involves unsaturated monomers joining through chain reactions without loss of small molecules (repeat unit formula equals monomer formula). Condensation polymerization involves polyfunctional monomers reacting with elimination of small by-products like H₂O or HCl.',
    concept: 'Polymer Kinetics',
    difficulty: 'Core',
  },
  {
    id: 'viva-07',
    unit: 3,
    question: 'Why are transition metal coordination complexes coloured?',
    answer: 'In the presence of ligands, degenerate d-orbitals split into eg and t2g levels. Absorption of visible light photons promotes an electron from the lower to the higher d-orbital set (d-d transition), and the transmitted complementary colour is observed.',
    concept: 'Crystal Field Theory & Colour',
    difficulty: 'Viva Standard',
  },
  {
    id: 'viva-08',
    unit: 4,
    question: 'Why is a salt bridge necessary in a galvanic cell?',
    answer: 'The salt bridge completes the electrical circuit allowing ionic migration while preventing mechanical mixing of electrolytes. It prevents charge accumulation (positive at anode, negative at cathode) that would otherwise immediately halt cell EMF.',
    concept: 'Electrochemistry & Salt Bridge',
    difficulty: 'Core',
  },
  {
    id: 'viva-09',
    unit: 4,
    question: 'Explain why water has a negative solid-liquid phase boundary slope in its phase diagram.',
    answer: 'By the Clausius-Clapeyron equation dP/dT = ΔH / (T·ΔV), because ice has an open hydrogen-bonded cage structure, it is less dense than liquid water, making ΔV_melting negative. Hence dP/dT is negative, meaning increasing pressure lowers the melting point of ice.',
    concept: 'Phase Equilibria & Water Anomaly',
    difficulty: 'Distinction',
  },
  {
    id: 'viva-10',
    unit: 5,
    question: 'What is the Critical Micelle Concentration (CMC)?',
    answer: 'CMC is the specific surfactant concentration above which individual monomer molecules in solution spontaneously self-assemble into spherical aggregates (micelles) with hydrophobic tails oriented inward and hydrophilic heads outward, driven by hydrophobic entropy.',
    concept: 'Colloids & Surfactants',
    difficulty: 'Core',
  },
];
