import type { ISimulationCatalogItem } from './simulations.catalog.js';

const CHEM_SUBJECT_KEYWORDS = ['engineering chemistry', 'u25cy103', 'u21cy101', 'chemistry', 'cy103'];

function chemTemplate(id: string, unit: number, topic: string, title: string, description: string): ISimulationCatalogItem {
  return {
    id,
    domain: 'CHEMISTRY',
    category: 'engineering chemistry',
    title,
    description,
    suggestedUnits: [unit],
    smartboardPresetKey: id,
    defaultParams: { simulationType: 'engineering-chemistry', simulationSubtype: 'chemistry', defaultParameters: {}, visualizationMode: '', steps: [] },
    tags: ['Engineering Chemistry', topic],
    subjectKeywords: CHEM_SUBJECT_KEYWORDS,
    unit,
    topic,
  };
}

/** Engineering Chemistry (U25CY103), kept in syllabus order for teacher publishing and Smart Board launch. */
export const CHEM_SIMULATION_TEMPLATES: ISimulationCatalogItem[] = [
  // ─── Unit I: Molecular Structure, Bonding and Reactivity ───
  chemTemplate('chem-orbitals-hybridization', 1, 'Atomic Orbitals & Hybridization', 'Atomic Orbitals & Hybridization Viewer', 'Visualize s, px, py, pz atomic orbitals and sp, sp², sp³ hybridizations with 3D nodal lobes and bond angles.'),
  chemTemplate('chem-de-broglie', 1, 'Wave-Particle Duality', 'de Broglie Wavelength Calculator', 'Calculate de Broglie matter wavelength λ = h/mv across electrons, neutrons, C60 fullerenes, and macroscopic particles.'),
  chemTemplate('chem-newman-projection', 1, 'Conformational Analysis', 'Newman Projection Rotator & Energy Curve', 'Rotate dihedral angle θ from 0° to 360° in ethane and butane to observe staggered, eclipsed, gauche, and anti conformers on the live potential energy curve.'),
  chemTemplate('chem-chirality-fischer', 1, 'Stereochemistry & Chirality', 'Chirality, Fischer Projection & E/Z Identifier', 'Identify chiral stereocenters (R/S), CIP priority rules, optical activity [α], and cis/trans vs E/Z geometric isomerism.'),
  chemTemplate('chem-ph-pka-buffer', 1, 'Acids, Bases & Buffers', 'pH, pKa & Henderson-Hasselbalch Explorer', 'Explore Brønsted-Lowry and Lewis acid-base equilibria, pKa trends, buffer action, and conjugate acid-base fraction curves.'),

  // ─── Unit II: Organic Chemistry and Mechanisms ───
  chemTemplate('chem-sn1-sn2-mechanism', 2, 'Nucleophilic Substitution', 'SN1 vs SN2 Reaction Mechanism & Energy Profile', 'Step-by-step animation of SN1 (carbocation intermediate) and SN2 (backside attack, Walden inversion) with double-hump vs single-barrier energy graphs.'),
  chemTemplate('chem-elimination-substitution', 2, 'Elimination & Electrophilic Substitution', 'E1/E2 & Electrophilic Aromatic Substitution (SEAr) Stepper', 'Compare E1/E2 elimination pathways (Zaitsev product) and trace benzene SEAr mechanisms (nitration, halogenation, Friedel-Crafts) via arenium σ-complex.'),
  chemTemplate('chem-azo-dye-synthesis', 2, 'Functional Group Transformations', 'Azo Dye Synthesis Flow & Coupling', 'Simulate the diazotization of aniline to benzenediazonium chloride (0–5 °C) followed by electrophilic diazo coupling with β-naphthol to form bright azo dyes.'),

  // ─── Unit III: Polymers and Coordination Chemistry ───
  chemTemplate('chem-polymer-chain-growth', 3, 'Polymerization Kinetics', 'Polymer Chain Growth & Molecular Weight (Mn, Mw, PDI)', 'Compare chain-growth (addition) vs step-growth (Carothers condensation) polymerization with live molecular weight averages Mn, Mw, and polydispersity index PDI.'),
  chemTemplate('chem-polymer-thermal-transitions', 3, 'Polymer Thermal Properties', 'Tg & Tm Thermal Transitions Visualizer', 'Plot specific volume and heat capacity across glass transition Tg and melting Tm, exploring amorphous and semi-crystalline polymer states.'),
  chemTemplate('chem-molding-processes', 3, 'Polymer Processing', 'Injection, Extrusion & Compression Molding Simulator', 'Animated manufacturing cycles: reciprocating screw injection molding, continuous twin-screw profile extrusion, and hydraulic compression molding.'),
  chemTemplate('chem-crystal-field-theory', 3, 'Coordination Chemistry', 'Crystal Field Splitting (CFT), Colour & Magnetism', 'Explore octahedral (Δo) and tetrahedral (Δt) crystal field splitting, d-electron configuration, high spin vs low spin, magnetic moment μ_eff, and d-d complementary colour absorption.'),

  // ─── Unit IV: Thermodynamics, Electrochemistry and Kinetics ───
  chemTemplate('chem-gibbs-free-energy', 4, 'Thermodynamics', 'Gibbs Free Energy & Spontaneity (ΔG = ΔH − TΔS)', 'Interactive temperature slider testing endothermic/exothermic and order/disorder combinations to predict reaction spontaneity and equilibrium crossover T_eq.'),
  chemTemplate('chem-galvanic-nernst-cell', 4, 'Electrochemistry', 'Galvanic Cell, Electrodes & Nernst EMF Simulator', 'Construct electrochemical cells using standard hydrogen, saturated calomel, and glass electrodes; calculate cell EMF via the Nernst equation.'),
  chemTemplate('chem-water-phase-eutectic', 4, 'Phase Equilibria', 'Water Phase Diagram & Eutectic System Visualizer', 'Explore Clausius-Clapeyron curves, water triple point, critical point, and two-component binary solid-liquid eutectic cooling curves.'),
  chemTemplate('chem-reaction-kinetics', 4, 'Chemical Kinetics', 'Reaction Rate Laws, Order & Half-Life Simulator', 'Simulate zero-, first-, and second-order reaction kinetics; plot integrated rate laws and examine Arrhenius activation energy Ea.'),
  chemTemplate('chem-michaelis-menten', 4, 'Enzyme Kinetics', 'Michaelis-Menten Enzyme Kinetics & Lineweaver-Burk', 'Vary substrate [S], Vmax, and Km to inspect steady-state enzyme velocity and transform to reciprocal double-reciprocal Lineweaver-Burk plots.'),

  // ─── Unit V: Surface Chemistry, Spectroscopy and Chromatography ───
  chemTemplate('chem-adsorption-isotherms', 5, 'Surface Chemistry', 'Langmuir & Freundlich Adsorption Isotherm Fitting', 'Model gas/solute adsorption onto solid surfaces, comparing monolayer Langmuir saturation with empirical multilayer Freundlich adsorption.'),
  chemTemplate('chem-micelle-cmc', 5, 'Colloids & Surfactants', 'Micelle Formation & Critical Micelle Concentration (CMC)', 'Increase surfactant concentration to observe surface tension reduction, monolayer saturation, and hydrophobic self-assembly into spherical micelles at CMC.'),
  chemTemplate('chem-beer-lambert-spec', 5, 'Spectroscopy Fundamentals', 'Beer-Lambert Law & UV-Vis Spectrum Explorer', 'Adjust path length b, molar absorptivity ε, and solute concentration c to verify A = ε·b·c and observe peak absorption wavelengths.'),
  chemTemplate('chem-spectroscopy-interpreter', 5, 'Spectroscopic Characterization', 'IR & NMR Spectrum Interpreter for Organic Compounds', 'Identify characteristic infrared vibrational wavenumbers (O-H, C=O, C-H) and ¹H NMR chemical shifts, splitting patterns, and integration ratios.'),
  chemTemplate('chem-chromatography-tlc', 5, 'Chromatography & Separation', 'HPLC, GC Chromatogram & TLC Separation Simulator', 'Simulate thin layer chromatography (Rf calculation) and column retention times (HPLC/GC) based on stationary phase polarity and partition coefficients.'),

  // ─── Unit VI: Virtual Laboratory (Experiments) ───
  chemTemplate('chem-lab-pka-titration', 6, 'Lab 1: Acid Dissociation', 'Virtual Lab — pKa Determination by pH Titration', 'Titrate acetic acid and phenol with standard NaOH, plotting the complete titration curve to determine half-neutralization pKa.'),
  chemTemplate('chem-lab-azo-coupling', 6, 'Lab 2: Organic Synthesis', 'Virtual Lab — Azo Dye Preparation via Diazotization', 'Prepare 1-phenylazo-2-naphthol (Sudan I dye) by reacting diazotized aniline with alkaline 2-naphthol under ice-bath thermal control.'),
  chemTemplate('chem-lab-qualitative-tests', 6, 'Lab 3: Organic Analysis', 'Virtual Lab — Qualitative Tests for Acids, Aldehydes & Amines', 'Perform diagnostic tests: NaHCO₃ effervescence for carboxylic acids, Tollens/Fehling mirror for aldehydes, and carbylamine/azo tests for amines.'),
  chemTemplate('chem-lab-viscometer-mw', 6, 'Lab 4: Polymer Characterization', 'Virtual Lab — Molecular Weight by Ostwald Viscometer', 'Measure efflux times of polymer solutions at varying concentrations using an Ostwald viscometer to determine intrinsic viscosity and viscosity-average molecular weight.'),
  chemTemplate('chem-lab-ester-hydrolysis', 6, 'Lab 5: Chemical Kinetics', 'Virtual Lab — Rate Constant of Acid-Catalysed Ester Hydrolysis', 'Determine the pseudo-first-order rate constant k for the acid-catalyzed hydrolysis of ethyl acetate by titrating reaction aliquots at timed intervals.'),
  chemTemplate('chem-lab-emf-electrodes', 6, 'Lab 6: Potentiometry', 'Virtual Lab — Cell EMF using Calomel & Glass Electrodes', 'Calibrate a glass-calomel electrode assembly and measure electromotive force EMF of test solutions to determine unknown hydrogen ion activity.'),
  chemTemplate('chem-lab-iodine-distribution', 6, 'Lab 7: Phase Partition', 'Virtual Lab — Distribution Coefficient of Iodine (H₂O / CCl₄)', 'Shake iodine between immiscible water and carbon tetrachloride phases, titrate both layers with standard hypo (Na₂S₂O₃), and calculate partition coefficient K_D.'),
  chemTemplate('chem-lab-beer-lambert', 6, 'Lab 8: Spectrophotometry', 'Virtual Lab — Verification of Beer-Lambert Law (CuSO₄ / KMnO₄)', 'Prepare standard serial dilutions of KMnO₄ or CuSO₄, measure optical density on a virtual spectrophotometer, construct a calibration curve, and find unknown concentration.'),
];
