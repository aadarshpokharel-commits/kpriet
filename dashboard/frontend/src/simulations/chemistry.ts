import type { ISimulationDefinition } from './types';

const CHEM_SUBJECT_KEYWORDS = ['engineering chemistry', 'u25cy103', 'chemistry', 'cy103', 'u21cy101'];

function chemBoardSimulation(id: string, unit: number, unitTitle: string, subtype: string, topic: string, title: string, icon: string, shortDescription: string): ISimulationDefinition {
  return {
    id,
    boardEngine: 'chem',
    simulationSubtype: subtype,
    unit,
    unitTitle,
    topic,
    subjectKeywords: CHEM_SUBJECT_KEYWORDS,
    title,
    domain: 'CHEMISTRY',
    category: 'engineering chemistry',
    icon,
    shortDescription,
    detailedDescription: shortDescription + ' Interactive and step by step, with formulas, measurements and explanations — opens inside the Smart Board.',
    learningObjectives: ['Explain ' + topic + ' step by step', 'Relate the model to the measured result and explain how each parameter changes it'],
    suggestedUnits: [unit],
    smartboardPresetKey: id,
    tags: ['Engineering Chemistry', unitTitle, topic],
    parameters: [],
    metrics: [],
    engine: {
      createInitialState: () => ({}),
      update: (state) => state,
      render: (ctx, width, height) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
      },
    },
  };
}

/** Engineering Chemistry (U25CY103 / U21CY101) — Ordered Units I–V and Virtual Laboratory simulations. */
export const CHEMISTRY_BOARD_SIMULATIONS: ISimulationDefinition[] = [
  // ─── Unit I: Molecular Structure, Bonding and Reactivity ───
  chemBoardSimulation('chem-orbitals-hybridization', 1, 'Molecular Structure, Bonding and Reactivity', 'molecular-structure', 'Atomic Orbitals & Hybridization', 'Atomic Orbitals & Hybridization Viewer', '⚛️', 'Visualize s, px, py, pz atomic orbitals and sp, sp², sp³ hybridizations with 3D nodal lobes and bond angles.'),
  chemBoardSimulation('chem-de-broglie', 1, 'Molecular Structure, Bonding and Reactivity', 'wave-particle', 'Wave-Particle Duality', 'de Broglie Wavelength Calculator', '🌊', 'Calculate de Broglie matter wavelength λ = h/mv across electrons, neutrons, C60 fullerenes, and macroscopic particles.'),
  chemBoardSimulation('chem-newman-projection', 1, 'Molecular Structure, Bonding and Reactivity', 'conformational-analysis', 'Conformational Analysis', 'Newman Projection Rotator & Energy Curve', '🔄', 'Rotate dihedral angle θ from 0° to 360° in ethane and butane to observe staggered, eclipsed, gauche, and anti conformers on the live potential energy curve.'),
  chemBoardSimulation('chem-chirality-fischer', 1, 'Molecular Structure, Bonding and Reactivity', 'stereochemistry', 'Stereochemistry & Chirality', 'Chirality, Fischer Projection & E/Z Identifier', '🖐️', 'Identify chiral stereocenters (R/S), CIP priority rules, optical activity [α], and cis/trans vs E/Z geometric isomerism.'),
  chemBoardSimulation('chem-ph-pka-buffer', 1, 'Molecular Structure, Bonding and Reactivity', 'acids-bases', 'Acids, Bases & Buffers', 'pH, pKa & Henderson-Hasselbalch Explorer', '🧪', 'Explore Brønsted-Lowry and Lewis acid-base equilibria, pKa trends, buffer action, and conjugate acid-base fraction curves.'),

  // ─── Unit II: Organic Chemistry and Mechanisms ───
  chemBoardSimulation('chem-sn1-sn2-mechanism', 2, 'Organic Chemistry and Mechanisms', 'nucleophilic-substitution', 'Nucleophilic Substitution', 'SN1 vs SN2 Reaction Mechanism & Energy Profile', '⚡', 'Step-by-step animation of SN1 (carbocation intermediate) and SN2 (backside attack, Walden inversion) with double-hump vs single-barrier energy graphs.'),
  chemBoardSimulation('chem-elimination-substitution', 2, 'Organic Chemistry and Mechanisms', 'elimination-substitution', 'Elimination & Electrophilic Substitution', 'E1/E2 & Electrophilic Aromatic Substitution (SEAr) Stepper', '⚗️', 'Compare E1/E2 elimination pathways (Zaitsev product) and trace benzene SEAr mechanisms (nitration, halogenation, Friedel-Crafts) via arenium σ-complex.'),
  chemBoardSimulation('chem-azo-dye-synthesis', 2, 'Organic Chemistry and Mechanisms', 'functional-group', 'Functional Group Transformations', 'Azo Dye Synthesis Flow & Coupling', '🎨', 'Simulate the diazotization of aniline to benzenediazonium chloride (0–5 °C) followed by electrophilic diazo coupling with β-naphthol to form bright azo dyes.'),

  // ─── Unit III: Polymers and Coordination Chemistry ───
  chemBoardSimulation('chem-polymer-chain-growth', 3, 'Polymers and Coordination Chemistry', 'polymer-kinetics', 'Polymerization Kinetics', 'Polymer Chain Growth & Molecular Weight (Mn, Mw, PDI)', '🔗', 'Compare chain-growth (addition) vs step-growth (Carothers condensation) polymerization with live molecular weight averages Mn, Mw, and polydispersity index PDI.'),
  chemBoardSimulation('chem-polymer-thermal-transitions', 3, 'Polymers and Coordination Chemistry', 'polymer-thermal', 'Polymer Thermal Properties', 'Tg & Tm Thermal Transitions Visualizer', '🌡️', 'Plot specific volume and heat capacity across glass transition Tg and melting Tm, exploring amorphous and semi-crystalline polymer states.'),
  chemBoardSimulation('chem-molding-processes', 3, 'Polymers and Coordination Chemistry', 'polymer-processing', 'Polymer Processing', 'Injection, Extrusion & Compression Molding Simulator', '🏭', 'Animated manufacturing cycles: reciprocating screw injection molding, continuous twin-screw profile extrusion, and hydraulic compression molding.'),
  chemBoardSimulation('chem-crystal-field-theory', 3, 'Polymers and Coordination Chemistry', 'coordination-chemistry', 'Coordination Chemistry', 'Crystal Field Splitting (CFT), Colour & Magnetism', '💎', 'Explore octahedral (Δo) and tetrahedral (Δt) crystal field splitting, d-electron configuration, high spin vs low spin, magnetic moment μ_eff, and d-d complementary colour absorption.'),

  // ─── Unit IV: Thermodynamics, Electrochemistry and Kinetics ───
  chemBoardSimulation('chem-gibbs-free-energy', 4, 'Thermodynamics, Electrochemistry and Kinetics', 'thermodynamics', 'Thermodynamics', 'Gibbs Free Energy & Spontaneity (ΔG = ΔH − TΔS)', '⚖️', 'Interactive temperature slider testing endothermic/exothermic and order/disorder combinations to predict reaction spontaneity and equilibrium crossover T_eq.'),
  chemBoardSimulation('chem-galvanic-nernst-cell', 4, 'Thermodynamics, Electrochemistry and Kinetics', 'electrochemistry', 'Electrochemistry', 'Galvanic Cell, Electrodes & Nernst EMF Simulator', '🔋', 'Construct electrochemical cells using standard hydrogen, saturated calomel, and glass electrodes; calculate cell EMF via the Nernst equation.'),
  chemBoardSimulation('chem-water-phase-eutectic', 4, 'Thermodynamics, Electrochemistry and Kinetics', 'phase-equilibria', 'Phase Equilibria', 'Water Phase Diagram & Eutectic System Visualizer', '🧊', 'Explore Clausius-Clapeyron curves, water triple point, critical point, and two-component binary solid-liquid eutectic cooling curves.'),
  chemBoardSimulation('chem-reaction-kinetics', 4, 'Thermodynamics, Electrochemistry and Kinetics', 'chemical-kinetics', 'Chemical Kinetics', 'Reaction Rate Laws, Order & Half-Life Simulator', '⏱️', 'Simulate zero-, first-, and second-order reaction kinetics; plot integrated rate laws and examine Arrhenius activation energy Ea.'),
  chemBoardSimulation('chem-michaelis-menten', 4, 'Thermodynamics, Electrochemistry and Kinetics', 'enzyme-kinetics', 'Enzyme Kinetics', 'Michaelis-Menten Enzyme Kinetics & Lineweaver-Burk', '🧬', 'Vary substrate [S], Vmax, and Km to inspect steady-state enzyme velocity and transform to reciprocal double-reciprocal Lineweaver-Burk plots.'),

  // ─── Unit V: Surface Chemistry, Spectroscopy and Chromatography ───
  chemBoardSimulation('chem-adsorption-isotherms', 5, 'Surface Chemistry, Spectroscopy and Chromatography', 'surface-chemistry', 'Surface Chemistry', 'Langmuir & Freundlich Adsorption Isotherm Fitting', '🧲', 'Model gas/solute adsorption onto solid surfaces, comparing monolayer Langmuir saturation with empirical multilayer Freundlich adsorption.'),
  chemBoardSimulation('chem-micelle-cmc', 5, 'Surface Chemistry, Spectroscopy and Chromatography', 'colloids-surfactants', 'Colloids & Surfactants', 'Micelle Formation & Critical Micelle Concentration (CMC)', '🫧', 'Increase surfactant concentration to observe surface tension reduction, monolayer saturation, and hydrophobic self-assembly into spherical micelles at CMC.'),
  chemBoardSimulation('chem-beer-lambert-spec', 5, 'Surface Chemistry, Spectroscopy and Chromatography', 'spectroscopy', 'Spectroscopy Fundamentals', 'Beer-Lambert Law & UV-Vis Spectrum Explorer', '🌈', 'Adjust path length b, molar absorptivity ε, and solute concentration c to verify A = ε·b·c and observe peak absorption wavelengths.'),
  chemBoardSimulation('chem-spectroscopy-interpreter', 5, 'Surface Chemistry, Spectroscopy and Chromatography', 'spectroscopy-analysis', 'Spectroscopic Characterization', 'IR & NMR Spectrum Interpreter for Organic Compounds', '📉', 'Identify characteristic infrared vibrational wavenumbers (O-H, C=O, C-H) and ¹H NMR chemical shifts, splitting patterns, and integration ratios.'),
  chemBoardSimulation('chem-chromatography-tlc', 5, 'Surface Chemistry, Spectroscopy and Chromatography', 'chromatography', 'Chromatography & Separation', 'HPLC, GC Chromatogram & TLC Separation Simulator', '📊', 'Simulate thin layer chromatography (Rf calculation) and column retention times (HPLC/GC) based on stationary phase polarity and partition coefficients.'),

  // ─── Unit VI: Virtual Laboratory (Experiments) ───
  chemBoardSimulation('chem-lab-pka-titration', 6, 'Virtual Laboratory', 'virtual-lab', 'Lab 1: Acid Dissociation', 'Virtual Lab — pKa Determination by pH Titration', '🧪', 'Titrate acetic acid and phenol with standard NaOH, plotting the complete titration curve to determine half-neutralization pKa.'),
  chemBoardSimulation('chem-lab-azo-coupling', 6, 'Virtual Laboratory', 'virtual-lab', 'Lab 2: Organic Synthesis', 'Virtual Lab — Azo Dye Preparation via Diazotization', '🧣', 'Prepare 1-phenylazo-2-naphthol (Sudan I dye) by reacting diazotized aniline with alkaline 2-naphthol under ice-bath thermal control.'),
  chemBoardSimulation('chem-lab-qualitative-tests', 6, 'Virtual Laboratory', 'virtual-lab', 'Lab 3: Organic Analysis', 'Virtual Lab — Qualitative Tests for Acids, Aldehydes & Amines', '🔍', 'Perform diagnostic tests: NaHCO₃ effervescence for carboxylic acids, Tollens/Fehling mirror for aldehydes, and carbylamine/azo tests for amines.'),
  chemBoardSimulation('chem-lab-viscometer-mw', 6, 'Virtual Laboratory', 'virtual-lab', 'Lab 4: Polymer Characterization', 'Virtual Lab — Molecular Weight by Ostwald Viscometer', '⏳', 'Measure efflux times of polymer solutions at varying concentrations using an Ostwald viscometer to determine intrinsic viscosity and viscosity-average molecular weight.'),
  chemBoardSimulation('chem-lab-ester-hydrolysis', 6, 'Virtual Laboratory', 'virtual-lab', 'Lab 5: Chemical Kinetics', 'Virtual Lab — Rate Constant of Acid-Catalysed Ester Hydrolysis', '⏱️', 'Determine the pseudo-first-order rate constant k for the acid-catalyzed hydrolysis of ethyl acetate by titrating reaction aliquots at timed intervals.'),
  chemBoardSimulation('chem-lab-emf-electrodes', 6, 'Virtual Laboratory', 'virtual-lab', 'Lab 6: Potentiometry', 'Virtual Lab — Cell EMF using Calomel & Glass Electrodes', '⚡', 'Calibrate a glass-calomel electrode assembly and measure electromotive force EMF of test solutions to determine unknown hydrogen ion activity.'),
  chemBoardSimulation('chem-lab-iodine-distribution', 6, 'Virtual Laboratory', 'virtual-lab', 'Lab 7: Phase Partition', 'Virtual Lab — Distribution Coefficient of Iodine (H₂O / CCl₄)', '🫙', 'Shake iodine between immiscible water and carbon tetrachloride phases, titrate both layers with standard hypo (Na₂S₂O₃), and calculate partition coefficient K_D.'),
  chemBoardSimulation('chem-lab-beer-lambert', 6, 'Virtual Laboratory', 'virtual-lab', 'Lab 8: Spectrophotometry', 'Virtual Lab — Verification of Beer-Lambert Law (CuSO₄ / KMnO₄)', '🔬', 'Prepare standard serial dilutions of KMnO₄ or CuSO₄, measure optical density on a virtual spectrophotometer, construct a calibration curve, and find unknown concentration.'),
];
