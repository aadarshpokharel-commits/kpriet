'use strict';

/*
 * Basics of Electrical and Electronics Engineering (U25EEG02) — simulation catalogue,
 * organised Semester I → Subject → Unit → Topic → Simulation (authoritative 5-unit structure).
 * Keep in sync with the dashboard registry (EE_BOARD_SIMULATIONS) and backend (EE_SIMULATION_TEMPLATES).
 */
(function () {
  const subject = { name: 'Basics of Electrical and Electronics Engineering', code: 'U25EEG02', semester: 1, department: 'Information Technology', programme: 'B.Tech Information Technology', regulation: 'R2025 CBCS' };
  const units = [
    { unit: 1, title: 'Basic Concepts of Electric Circuits', subtype: 'electric-circuits' },
    { unit: 2, title: 'DC Motor', subtype: 'dc-motor' },
    { unit: 3, title: 'Transformer and AC Motor', subtype: 'transformer-ac-motor' },
    { unit: 4, title: 'Semiconductor Devices', subtype: 'semiconductor-devices' },
    { unit: 5, title: 'Applications of Semiconductor Devices', subtype: 'semiconductor-applications' },
  ];
  // [id, unit, topic, title, icon, description, tier (1 essential · 2 advanced · 0 other)]
  const rows = [
    ['ee-ohms-law', 1, "Ohm's Law", "Ohm's Law Simulator", '🔌', 'Change V, I or R and watch the other values and the circuit update: V = IR.', 1],
    ['ee-series', 1, 'Series Circuit', 'Series Circuit Simulator', '➖', 'Add or remove resistors in series: equivalent resistance, one current, voltage across each resistor.', 1],
    ['ee-parallel', 1, 'Parallel Circuit', 'Parallel Circuit Simulator', '🔀', 'Resistor branches in parallel: branch currents, total current and equivalent resistance.', 1],
    ['ee-kcl', 1, 'KCL', "Kirchhoff's Current Law (KCL)", '⭕', 'Currents entering and leaving a junction — add branches and see ΣI_in = ΣI_out balance.', 1],
    ['ee-kvl', 1, 'KVL', "Kirchhoff's Voltage Law (KVL)", '🔁', 'Trace a closed loop: voltage rises and drops step by step until ΣV = 0.', 1],
    ['ee-star-delta', 1, 'Star–Delta Conversion', 'Star–Delta Conversion', '✳️', 'Convert Star ↔ Delta resistor networks with the equivalent-resistance formulas.', 1],
    ['ee-nodal', 1, 'Nodal Analysis', 'Nodal Analysis Visualizer', '🟢', 'Reference node → unknown node voltages → KCL equations → solve → node voltages on the circuit.', 1],
    ['ee-mesh', 1, 'Mesh Analysis', 'Mesh Analysis Visualizer', '🔲', 'Identify meshes, assign mesh currents, apply KVL, solve and show the currents in each branch.', 2],
    ['ee-dc-construction', 2, 'Construction', 'DC Motor Construction', '⚙️', 'Tap a part of the motor — armature, field winding, commutator, brushes, shaft, poles — to learn its job.', 0],
    ['ee-dc-working', 2, 'Working Principle', 'DC Motor Working Principle', '🌀', 'Current in a magnetic field → force → torque → rotation; reverse the field or the current.', 1],
    ['ee-dc-types', 2, 'Motor Types', 'DC Motor Types', '🔗', 'Shunt, series and compound connections of the field and armature, compared visually.', 0],
    ['ee-dc-torque', 2, 'Torque', 'DC Motor Torque Simulator', '💪', 'T = K·Φ·Ia — change flux and armature current and see the torque respond.', 2],
    ['ee-dc-characteristics', 2, 'Characteristics', 'DC Motor Characteristics', '📈', 'Torque–current, speed–current and speed–torque curves for shunt and series motors.', 0],
    ['ee-dc-starters', 2, 'Starters', 'DC Motor Starters', '🎚️', 'Move the starter handle: OFF → start → resistance cut out → running (two-point and three-point).', 0],
    ['ee-dc-speed', 2, 'Speed Control', 'DC Motor Speed Control', '⏩', 'Armature control and field control — which way the speed moves and why (N ∝ Eb/Φ).', 2],
    ['ee-transformer', 3, 'Single-Phase Transformer', 'Single-Phase Transformer', '🔋', 'AC source → alternating flux in the core → induced secondary voltage → load.', 1],
    ['ee-turns-ratio', 3, 'Turns Ratio', 'Transformer Turns Ratio', '🔢', 'V₁/V₂ = N₁/N₂ = I₂/I₁ — the turns on each winding set the output voltage.', 2],
    ['ee-step-up-down', 3, 'Step-Up / Step-Down', 'Transformer Step-Up / Step-Down', '↕️', 'More secondary turns step the voltage up, fewer step it down.', 0],
    ['ee-im-construction', 3, 'Induction Motor Construction', 'Three-Phase Induction Motor Construction', '🧲', 'Stator, rotor, air gap, windings and shaft — tap each part.', 0],
    ['ee-im-working', 3, 'Induction Motor Working', 'Three-Phase Induction Motor Working', '🔄', 'Three phase currents → rotating magnetic field → induced rotor current → rotation with slip.', 1],
    ['ee-im-characteristics', 3, 'Characteristics', 'Induction Motor Characteristics', '📉', 'Torque–slip and torque–speed curves with starting, maximum and full-load torque.', 2],
    ['ee-im-starters', 3, 'Starters', 'Induction Motor Starters', '🚦', 'DOL and Star–Delta starters: arrangement, starting sequence and why the starting current matters.', 0],
    ['ee-pn-junction', 4, 'PN Junction', 'PN Junction Simulator', '⚡', 'Forward and reverse bias: carriers, depletion region width and current.', 1],
    ['ee-pn-vi', 4, 'PN Junction V-I', 'PN Junction V-I Characteristics', '📊', 'Forward knee, reverse saturation and breakdown on the diode V-I curve.', 0],
    ['ee-zener', 4, 'Zener Diode', 'Zener Diode', '🛡️', 'Reverse breakdown at Vz — the Zener holds its voltage as the input changes.', 1],
    ['ee-bjt', 4, 'BJT', 'BJT Simulator', '🔺', 'NPN / PNP: base current controls collector current — cut-off, active and saturation.', 2],
    ['ee-bjt-characteristics', 4, 'BJT Characteristics', 'BJT Characteristics', '📐', 'Input and output characteristics for CE / CB configurations with the operating point.', 0],
    ['ee-fet', 4, 'FET', 'FET Simulator', '🚪', 'Gate voltage narrows the channel: I_D = I_DSS(1 − V_GS/V_P)².', 2],
    ['ee-half-wave', 5, 'Half-Wave Rectifier', 'Half-Wave Rectifier', '〰️', 'AC source → diode → load: conduction only on positive half cycles.', 1],
    ['ee-full-wave', 5, 'Full-Wave Rectifier', 'Full-Wave Rectifier', '🌊', 'Centre-tapped and bridge rectifiers — which diodes conduct in each half cycle.', 1],
    ['ee-rectifier-compare', 5, 'Rectifier Comparison', 'Rectifier Comparison', '⚖️', 'Half-wave vs full-wave: waveform, average value, ripple factor and output frequency side by side.', 0],
    ['ee-filter', 5, 'Filter', 'Filter Simulator', '🧹', 'A capacitor filter smooths the rectified output — ripple Vr = I/(f·C).', 2],
    ['ee-regulator', 5, 'Voltage Regulator', 'Voltage Regulator', '🎛️', 'Input → regulator → load: the output stays at its set value as input and load change.', 2],
    ['ee-series-shunt', 5, 'Series / Shunt Regulator', 'Series and Shunt Voltage Regulators', '🔧', 'Series-pass and shunt regulators: arrangement and how each keeps the output steady.', 2],
    ['ee-configurations', 5, 'CE / CB / CC', 'CE / CB / CC Configurations', '🔀', 'Common emitter, base and collector: terminals, current path, gains and characteristics.', 2],
  ];
  const unitTitle = (u) => (units.find((x) => x.unit === u) || {}).title || '';
  const unitSubtype = (u) => (units.find((x) => x.unit === u) || {}).subtype || '';
  const simulations = rows.map(([id, unit, topic, title, icon, description, tier]) => ({ id, unit, topic, title, icon, description, tier, flagship: tier === 1, unitTitle: unitTitle(unit), subtype: unitSubtype(unit) }));
  const byId = new Map(simulations.map((s) => [s.id, s]));
  window.EduverseEECatalog = { subject, units, simulations, simulationType: 'electrical-electronics', get: (id) => byId.get(id) || null };
})();
