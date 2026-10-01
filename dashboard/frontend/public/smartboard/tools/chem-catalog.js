'use strict';

/**
 * Engineering Chemistry (U25CY103) — Simulation Catalogue
 * B.Tech R2025 CBCS, Semester I (BSC, 2-0-2-0-3).
 *
 * Fully mapped to the authoritative syllabus:
 *  Unit I: Molecular Structure, Bonding and Reactivity
 *  Unit II: Organic Chemistry and Mechanisms
 *  Unit III: Polymers and Coordination Chemistry
 *  Unit IV: Thermodynamics, Electrochemistry and Kinetics
 *  Unit V: Surface Chemistry, Spectroscopy and Chromatography
 *  Unit VI: Virtual Laboratory (Curriculum Lab Experiments)
 */
(function () {
  const subject = {
    name: 'Engineering Chemistry',
    code: 'U25CY103',
    semester: 1,
    department: 'Department of Chemical Engineering',
    regulation: 'R2025 CBCS',
    category: 'BSC',
    credits: 3,
    hours: '2-0-2-0-3',
  };

  const units = [
    { unit: 1, title: 'Molecular Structure, Bonding and Reactivity', subtype: 'molecular-structure' },
    { unit: 2, title: 'Organic Chemistry and Mechanisms', subtype: 'organic-mechanisms' },
    { unit: 3, title: 'Polymers and Coordination Chemistry', subtype: 'polymers-coordination' },
    { unit: 4, title: 'Thermodynamics, Electrochemistry and Kinetics', subtype: 'thermo-electro-kinetics' },
    { unit: 5, title: 'Surface Chemistry, Spectroscopy and Chromatography', subtype: 'surface-spectroscopy' },
    { unit: 6, title: 'Virtual Laboratory', subtype: 'virtual-lab' },
  ];

  // [id, unit, topic, title, icon, description]
  const rows = [
    // ─── Unit I: Molecular Structure, Bonding and Reactivity ───
    [
      'chem-orbitals-hybridization',
      1,
      'Atomic Orbitals & Hybridization',
      'Atomic Orbitals & Hybridization Viewer',
      '⚛️',
      'Visualize s, px, py, pz atomic orbitals and sp, sp², sp³ hybridizations with 3D nodal lobes and bond angles (180°, 120°, 109.5°).'
    ],
    [
      'chem-de-broglie',
      1,
      'Wave-Particle Duality',
      'de Broglie Wavelength Calculator',
      '🌊',
      'Calculate de Broglie matter wavelength λ = h/mv across electrons, neutrons, C60 fullerenes, and macroscopic particles.'
    ],
    [
      'chem-newman-projection',
      1,
      'Conformational Analysis',
      'Newman Projection Rotator & Energy Curve',
      '🔄',
      'Rotate dihedral angle θ from 0° to 360° in ethane and butane to observe staggered, eclipsed, gauche, and anti conformers on the live potential energy curve.'
    ],
    [
      'chem-chirality-fischer',
      1,
      'Stereochemistry & Chirality',
      'Chirality, Fischer Projection & E/Z Identifier',
      '🖐️',
      'Identify chiral stereocenters (R/S), CIP priority rules, optical activity [α], and cis/trans vs E/Z geometric isomerism.'
    ],
    [
      'chem-ph-pka-buffer',
      1,
      'Acids, Bases & Buffers',
      'pH, pKa & Henderson-Hasselbalch Explorer',
      '🧪',
      'Explore Brønsted-Lowry and Lewis acid-base equilibria, pKa trends, buffer action, and conjugate acid-base fraction curves.'
    ],

    // ─── Unit II: Organic Chemistry and Mechanisms ───
    [
      'chem-sn1-sn2-mechanism',
      2,
      'Nucleophilic Substitution',
      'SN1 vs SN2 Reaction Mechanism & Energy Profile',
      '⚡',
      'Step-by-step animation of SN1 (carbocation intermediate, racemization) and SN2 (backside attack, Walden inversion) with double-hump vs single-barrier energy graphs.'
    ],
    [
      'chem-elimination-substitution',
      2,
      'Elimination & Electrophilic Substitution',
      'E1/E2 & Electrophilic Aromatic Substitution (SEAr) Stepper',
      '⚗️',
      'Compare E1/E2 elimination pathways (Zaitsev product) and trace benzene SEAr mechanisms (nitration, halogenation, Friedel-Crafts) via arenium σ-complex.'
    ],
    [
      'chem-azo-dye-synthesis',
      2,
      'Functional Group Transformations',
      'Azo Dye Synthesis Flow & Coupling',
      '🎨',
      'Simulate the diazotization of aniline to benzenediazonium chloride (0–5 °C) followed by electrophilic diazo coupling with β-naphthol to form bright azo dyes.'
    ],

    // ─── Unit III: Polymers and Coordination Chemistry ───
    [
      'chem-polymer-chain-growth',
      3,
      'Polymerization Kinetics',
      'Polymer Chain Growth & Molecular Weight (Mn, Mw, PDI)',
      '🔗',
      'Compare chain-growth (addition) vs step-growth (Carothers condensation) polymerization with live molecular weight averages Mn, Mw, and polydispersity index PDI.'
    ],
    [
      'chem-polymer-thermal-transitions',
      3,
      'Polymer Thermal Properties',
      'Tg & Tm Thermal Transitions Visualizer',
      '🌡️',
      'Plot specific volume and heat capacity across glass transition Tg and melting Tm, exploring amorphous and semi-crystalline polymer states.'
    ],
    [
      'chem-molding-processes',
      3,
      'Polymer Processing',
      'Injection, Extrusion & Compression Molding Simulator',
      '🏭',
      'Animated manufacturing cycles: reciprocating screw injection molding, continuous twin-screw profile extrusion, and hydraulic compression molding.'
    ],
    [
      'chem-crystal-field-theory',
      3,
      'Coordination Chemistry',
      'Crystal Field Splitting (CFT), Colour & Magnetism',
      '💎',
      'Explore octahedral (Δo) and tetrahedral (Δt) crystal field splitting, d-electron configuration, high spin vs low spin, magnetic moment μ_eff, and d-d complementary colour absorption.'
    ],

    // ─── Unit IV: Thermodynamics, Electrochemistry and Kinetics ───
    [
      'chem-gibbs-free-energy',
      4,
      'Thermodynamics',
      'Gibbs Free Energy & Spontaneity (ΔG = ΔH − TΔS)',
      '⚖️',
      'Interactive temperature slider testing endothermic/exothermic and order/disorder combinations to predict reaction spontaneity and equilibrium crossover T_eq.'
    ],
    [
      'chem-galvanic-nernst-cell',
      4,
      'Electrochemistry',
      'Galvanic Cell, Electrodes & Nernst EMF Simulator',
      '🔋',
      'Construct electrochemical cells using standard hydrogen, saturated calomel, and glass electrodes; calculate cell EMF via the Nernst equation.'
    ],
    [
      'chem-water-phase-eutectic',
      4,
      'Phase Equilibria',
      'Water Phase Diagram & Eutectic System Visualizer',
      '🧊',
      'Explore Clausius-Clapeyron curves, water triple point, critical point, and two-component binary solid-liquid eutectic cooling curves.'
    ],
    [
      'chem-reaction-kinetics',
      4,
      'Chemical Kinetics',
      'Reaction Rate Laws, Order & Half-Life Simulator',
      '⏱️',
      'Simulate zero-, first-, and second-order reaction kinetics; plot integrated rate laws and examine Arrhenius activation energy Ea.'
    ],
    [
      'chem-michaelis-menten',
      4,
      'Enzyme Kinetics',
      'Michaelis-Menten Enzyme Kinetics & Lineweaver-Burk',
      '🧬',
      'Vary substrate [S], Vmax, and Km to inspect steady-state enzyme velocity and transform to reciprocal double-reciprocal Lineweaver-Burk plots.'
    ],

    // ─── Unit V: Surface Chemistry, Spectroscopy and Chromatography ───
    [
      'chem-adsorption-isotherms',
      5,
      'Surface Chemistry',
      'Langmuir & Freundlich Adsorption Isotherm Fitting',
      '🧲',
      'Model gas/solute adsorption onto solid surfaces, comparing monolayer Langmuir saturation with empirical multilayer Freundlich adsorption.'
    ],
    [
      'chem-micelle-cmc',
      5,
      'Colloids & Surfactants',
      'Micelle Formation & Critical Micelle Concentration (CMC)',
      '🫧',
      'Increase surfactant concentration to observe surface tension reduction, monolayer saturation, and hydrophobic self-assembly into spherical micelles at CMC.'
    ],
    [
      'chem-beer-lambert-spec',
      5,
      'Spectroscopy Fundamentals',
      'Beer-Lambert Law & UV-Vis Spectrum Explorer',
      '🌈',
      'Adjust path length b, molar absorptivity ε, and solute concentration c to verify A = ε·b·c and observe peak absorption wavelengths.'
    ],
    [
      'chem-spectroscopy-interpreter',
      5,
      'Spectroscopic Characterization',
      'IR & NMR Spectrum Interpreter for Organic Compounds',
      '📉',
      'Identify characteristic infrared vibrational wavenumbers (O-H, C=O, C-H) and ¹H NMR chemical shifts, splitting patterns, and integration ratios.'
    ],
    [
      'chem-chromatography-tlc',
      5,
      'Chromatography & Separation',
      'HPLC, GC Chromatogram & TLC Separation Simulator',
      '📊',
      'Simulate thin layer chromatography (Rf calculation) and column retention times (HPLC/GC) based on stationary phase polarity and partition coefficients.'
    ],

    // ─── Unit VI: Virtual Laboratory (Experiments) ───
    [
      'chem-lab-pka-titration',
      6,
      'Lab 1: Acid Dissociation',
      'Virtual Lab — pKa Determination by pH Titration',
      '🧪',
      'Titrate acetic acid and phenol with standard NaOH, plotting the complete titration curve to determine half-neutralization pKa.'
    ],
    [
      'chem-lab-azo-coupling',
      6,
      'Lab 2: Organic Synthesis',
      'Virtual Lab — Azo Dye Preparation via Diazotization',
      '🧣',
      'Prepare 1-phenylazo-2-naphthol (Sudan I dye) by reacting diazotized aniline with alkaline 2-naphthol under ice-bath thermal control.'
    ],
    [
      'chem-lab-qualitative-tests',
      6,
      'Lab 3: Organic Analysis',
      'Virtual Lab — Qualitative Tests for Acids, Aldehydes & Amines',
      '🔍',
      'Perform diagnostic tests: NaHCO₃ effervescence for carboxylic acids, Tollens/Fehling mirror for aldehydes, and carbylamine/azo tests for amines.'
    ],
    [
      'chem-lab-viscometer-mw',
      6,
      'Lab 4: Polymer Characterization',
      'Virtual Lab — Molecular Weight by Ostwald Viscometer',
      '⏳',
      'Measure efflux times of polymer solutions at varying concentrations using an Ostwald viscometer to determine intrinsic viscosity and viscosity-average molecular weight.'
    ],
    [
      'chem-lab-ester-hydrolysis',
      6,
      'Lab 5: Chemical Kinetics',
      'Virtual Lab — Rate Constant of Acid-Catalysed Ester Hydrolysis',
      '⏱️',
      'Determine the pseudo-first-order rate constant k for the acid-catalyzed hydrolysis of ethyl acetate by titrating reaction aliquots at timed intervals.'
    ],
    [
      'chem-lab-emf-electrodes',
      6,
      'Lab 6: Potentiometry',
      'Virtual Lab — Cell EMF using Calomel & Glass Electrodes',
      '⚡',
      'Calibrate a glass-calomel electrode assembly and measure electromotive force EMF of test solutions to determine unknown hydrogen ion activity.'
    ],
    [
      'chem-lab-iodine-distribution',
      6,
      'Lab 7: Phase Partition',
      'Virtual Lab — Distribution Coefficient of Iodine (H₂O / CCl₄)',
      '🫙',
      'Shake iodine between immiscible water and carbon tetrachloride phases, titrate both layers with standard hypo (Na₂S₂O₃), and calculate partition coefficient K_D.'
    ],
    [
      'chem-lab-beer-lambert',
      6,
      'Lab 8: Spectrophotometry',
      'Virtual Lab — Verification of Beer-Lambert Law (CuSO₄ / KMnO₄)',
      '🔬',
      'Prepare standard serial dilutions of KMnO₄ or CuSO₄, measure optical density on a virtual spectrophotometer, construct a calibration curve, and find unknown concentration.'
    ],
  ];

  const unitTitle = (u) => (units.find((x) => x.unit === u) || {}).title || '';
  const unitSubtype = (u) => (units.find((x) => x.unit === u) || {}).subtype || '';

  const simulations = rows.map(([id, unit, topic, title, icon, description]) => ({
    id,
    unit,
    topic,
    title,
    icon,
    description,
    unitTitle: unitTitle(unit),
    subtype: unitSubtype(unit),
    category: `Unit ${unit} · ${topic}`,
    domain: 'CHEMISTRY',
    subjectCode: subject.code,
    subjectName: subject.name,
  }));

  const byId = new Map(simulations.map((s) => [s.id, s]));

  window.EduverseChemCatalog = {
    subject,
    units,
    simulations,
    simulationType: 'engineering-chemistry',
    get: (id) => byId.get(id) || null,
    getAllSimulations: () => simulations,
    byUnit: (unitNumber) => simulations.filter((s) => s.unit === unitNumber),
  };
})();
