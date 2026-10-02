'use strict';

/**
 * Engineering Chemistry — Unit IV: Thermodynamics, Electrochemistry and Kinetics
 * Interactive Simulation Engines for U25CY103
 *
 * Implements:
 *  13. chem-gibbs-free-energy: Gibbs Free Energy (ΔG = ΔH − TΔS), Spontaneity & Equilibrium
 *  14. chem-galvanic-nernst-cell: Galvanic Cell & Nernst Equation (Calomel & Glass Electrodes)
 *  15. chem-water-phase-eutectic: Phase Rule & Phase Diagrams (Water & Pb-Ag Eutectic)
 *  16. chem-reaction-kinetics: Reaction Kinetics & Order Analysis (Zero, 1st, 2nd, Half-Life)
 *  17. chem-michaelis-menten: Michaelis-Menten Enzyme Kinetics & Lineweaver-Burk Plot
 */
(function () {
  const S = (window.ChemSims = window.ChemSims || {});
  const D = window.EPDraw;
  const { C, fmt, clamp, lerp, rad } = D;
  const R_GAS = 8.314; // J/(mol*K)
  const FARADAY = 96485; // C/mol

    // ─── Step-by-Step HUD & Animation Helper (Compact, Non-Colliding) ───
  function drawStepHUD(g, S, customNote) {
    const step = S.step || 0;
    const cur = (S.steps && S.steps[step]) || {};
    const steps = S.steps || [];
    const total = steps.length || 1;
    const t = S.t || 0;

    g.save();
    // Sleek, compact badge in top-right corner (never overlaps canvas title)
    const hudW = 210;
    const hudH = 38;
    const hudX = 1000 - hudW - 24;
    const hudY = 16;

    g.fillStyle = 'rgba(15, 23, 42, 0.9)';
    g.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    g.lineWidth = 1.5;
    g.beginPath();
    if (g.roundRect) g.roundRect(hudX, hudY, hudW, hudH, 8);
    else g.rect(hudX, hudY, hudW, hudH);
    g.fill();
    g.stroke();

    // Step dots & active badge
    const glow = 0.5 + 0.5 * Math.sin(t * 3.5);
    g.fillStyle = '#38bdf8';
    g.font = 'bold 11px system-ui, sans-serif';
    g.fillText('STEP ' + (step + 1) + ' OF ' + total, hudX + 12, hudY + 23);

    for (let i = 0; i < total; i++) {
      const dx = hudX + 105 + i * 16;
      const dy = hudY + 19;
      g.beginPath();
      g.arc(dx, dy, i === step ? 4.5 : 3, 0, Math.PI * 2);
      if (i === step) {
        g.fillStyle = 'rgba(56, 189, 248, ' + (0.7 + 0.3 * glow) + ')';
        g.fill();
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1.2;
        g.stroke();
      } else if (i < step) {
        g.fillStyle = '#10b981';
        g.fill();
      } else {
        g.fillStyle = '#475569';
        g.fill();
      }
    }

    // Animated LIVE pulse indicator
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    g.beginPath();
    g.arc(hudX + hudW - 16, hudY + 19, 3.5, 0, Math.PI * 2);
    g.fillStyle = 'rgba(56, 189, 248, ' + (0.5 + 0.5 * pulse) + ')';
    g.fill();

    g.restore();
  }


  // ═════════════════════════════════════════════════════════════════
  // 13. GIBBS FREE ENERGY (ΔG = ΔH − TΔS) & SPONTANEITY
  // ═════════════════════════════════════════════════════════════════
  S['chem-gibbs-free-energy'] = {
    live: true,
    approx: 'Standard free energy relation ΔG° = ΔH° − TΔS°. Thermodynamic equilibrium constant calculated via ΔG° = −RT ln K_eq.',
    modes: [
      { key: 'enthalpy_entropy_cases', label: 'Four Thermodynamic Cases (Signs of ΔH & ΔS)' },
      { key: 'haber_bosch', label: 'Haber-Bosch Ammonia Synthesis (Exothermic, ΔS < 0)' },
      { key: 'caco3_calcination', label: 'CaCO₃ Decomposition (Endothermic, ΔS > 0)' },
    ],
    params: [
      {
        key: 'temperature',
        label: 'System Temperature T (K)',
        type: 'range',
        default: 298,
        min: 100,
        max: 1200,
        step: 10,
        unit: 'K',
        help: 'Temperature in Kelvin governs the magnitude of the entropic penalty or bonus (−TΔS).',
      },
      {
        key: 'deltaH',
        label: 'Enthalpy of Reaction ΔH° (kJ/mol)',
        type: 'range',
        default: -92.2,
        min: -200,
        max: 200,
        step: 5,
        unit: 'kJ/mol',
        showIf: (p) => p.mode === 'enthalpy_entropy_cases',
        help: 'Exothermic (ΔH < 0) releases thermal energy; Endothermic (ΔH > 0) absorbs heat.',
      },
      {
        key: 'deltaS',
        label: 'Entropy of Reaction ΔS° (J/(mol·K))',
        type: 'range',
        default: -198,
        min: -300,
        max: 300,
        step: 5,
        unit: 'J/(mol·K)',
        showIf: (p) => p.mode === 'enthalpy_entropy_cases',
        help: 'Positive ΔS indicates increase in positional or thermal disorder / gaseous molecules.',
      },
    ],
    examples: [
      { label: 'Haber Ammonia Synthesis (N₂ + 3H₂ ⇌ 2NH₃, T = 298 K)', values: { mode: 'haber_bosch', temperature: 298 } },
      { label: 'High Temperature Haber Inversion (T = 700 K)', values: { mode: 'haber_bosch', temperature: 700 } },
      { label: 'Lime Calcination CaCO₃ → CaO + CO₂ (T = 1120 K)', values: { mode: 'caco3_calcination', temperature: 1120 } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      return [
        { title: '1. Enthalpy vs Entropy Tug-of-War', text: 'Spontaneity is dictated by Gibbs free energy change ΔG = ΔH − TΔS. Negative ΔH favors spontaneity energetically; positive ΔS favors spontaneity entropically.' },
        { title: '2. Inversion Temperature T* = ΔH / ΔS', text: 'When ΔH and ΔS have identical signs, a critical cross-over temperature T* = ΔH/ΔS exists where ΔG = 0 and K_eq = 1. Below T*, enthalpy dominates; above T*, entropy dominates.' },
        { title: '3. Equilibrium Constant K_eq = exp(−ΔG°/RT)', text: 'If ΔG < 0, reaction is exergonic and spontaneous (K_eq > 1). If ΔG > 0, it is endergonic and non-spontaneous. At ΔG = 0, dynamic thermodynamic equilibrium is reached.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'enthalpy_entropy_cases';
      const tempK = Number(p.temperature != null ? p.temperature : 298);

      let dH = 0; // kJ/mol
      let dS = 0; // J/(mol·K)
      let rxnName = 'Custom Thermodynamic System';

      if (mode === 'haber_bosch') {
        dH = -92.2;
        dS = -198.7;
        rxnName = 'N₂(g) + 3 H₂(g) ⇌ 2 NH₃(g)';
      } else if (mode === 'caco3_calcination') {
        dH = 178.0;
        dS = 160.5;
        rxnName = 'CaCO₃(s) ⇌ CaO(s) + CO₂(g)';
      } else {
        dH = Number(p.deltaH != null ? p.deltaH : -92.2);
        dS = Number(p.deltaS != null ? p.deltaS : -198);
        rxnName = `Custom (ΔH = ${dH} kJ, ΔS = ${dS} J/K)`;
      }

      const tDeltaS_kJ = (tempK * dS) / 1000;
      const deltaG = dH - tDeltaS_kJ;

      let tCrossK = null;
      if ((dH > 0 && dS > 0) || (dH < 0 && dS < 0)) {
        tCrossK = Math.round((dH * 1000) / dS);
      }

      // K_eq = exp(-ΔG° / RT)
      const dG_J = deltaG * 1000;
      const lnK = -dG_J / (R_GAS * tempK);
      let kEqStr = '';
      if (lnK > 50) kEqStr = '> 10²¹ (Complete)';
      else if (lnK < -50) kEqStr = '< 10⁻²¹ (Negligible)';
      else {
        const kVal = Math.exp(lnK);
        kEqStr = kVal >= 1000 || kVal <= 0.001 ? kVal.toExponential(2) : kVal.toFixed(2);
      }

      let spontaneity = '';
      let tone = 'good';
      if (deltaG < -5) {
        spontaneity = 'Spontaneous (Exergonic, ΔG < 0)';
        tone = 'good';
      } else if (deltaG > 5) {
        spontaneity = 'Non-Spontaneous (Endergonic, ΔG > 0)';
        tone = 'warn';
      } else {
        spontaneity = 'Equilibrium / Borderline (ΔG ≈ 0)';
        tone = 'neutral';
      }

      return {
        formulas: [
          { name: 'Gibbs-Helmholtz Equation', formula: 'ΔG° = ΔH° − T ΔS°', given: `T = ${tempK} K, ΔH° = ${dH} kJ/mol, ΔS° = ${dS} J/(mol·K)`, calc: `${dH} − (${tempK} × ${dS}/1000)`, result: `${deltaG.toFixed(1)}`, unit: 'kJ/mol' },
          { name: 'Equilibrium Constant', formula: 'K_eq = exp(−ΔG° / RT)', given: `ΔG° = ${deltaG.toFixed(1)} kJ/mol, T = ${tempK} K`, calc: `exp(−(${deltaG.toFixed(1)} × 10³) / (8.314 × ${tempK}))`, result: kEqStr, unit: 'K_eq' },
          { name: 'Cross-over Temperature', formula: 'T* = ΔH° / ΔS° (at ΔG = 0)', given: tCrossK ? `ΔH° = ${dH} kJ, ΔS° = ${dS} J/K` : 'Opposite signs (No cross-over)', calc: tCrossK ? `${dH * 1000} / ${dS}` : 'None', result: tCrossK ? `${tCrossK} K (${tCrossK - 273}°C)` : 'N/A', unit: 'inversion' },
        ],
        readouts: [
          { label: 'Free Energy ΔG°', value: `${deltaG.toFixed(1)} kJ/mol`, tone: deltaG < 0 ? 'good' : 'warn' },
          { label: 'Spontaneity', value: deltaG < 0 ? 'Spontaneous' : 'Non-Spontaneous', tone },
          { label: 'Equilibrium K_eq', value: kEqStr, tone: 'hi' },
          { label: 'Enthalpy ΔH°', value: `${dH} kJ/mol`, tone: dH < 0 ? 'good' : 'neutral' },
          { label: '−TΔS Term', value: `${(-tDeltaS_kJ).toFixed(1)} kJ/mol`, tone: -tDeltaS_kJ < 0 ? 'good' : 'warn' },
          { label: 'Cross-over T*', value: tCrossK ? `${tCrossK} K` : 'None', tone: 'neutral' },
        ],
        state: {
          mode,
          tempK,
          dH,
          dS,
          tDeltaS_kJ: Math.round(tDeltaS_kJ * 10) / 10,
          deltaG: Math.round(deltaG * 10) / 10,
          tCrossK,
          kEqStr,
          spontaneity,
          rxnName,
        },
        explain: {
          what: `Gibbs free energy (ΔG = ΔH − TΔS) represents the maximum reversible non-expansion work obtainable from a closed chemical system at constant temperature and pressure.`,
          why: `The second law of thermodynamics requires the total entropy of the universe to increase for any spontaneous process (ΔS_universe = ΔS_system − ΔH/T > 0), which directly translates to ΔG < 0.`,
          param: `At low temperatures, enthalpy dominates (reactions favor exothermic ΔH < 0). At high temperatures, the entropic factor −TΔS dominates.`,
          effect: `In the Haber process, synthesis is spontaneous at room temperature (ΔG° < 0) but kinetically sluggish. Operating at 450°C accelerates kinetics via catalysts, even though higher temperature shifts equilibrium backward due to negative ΔS.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Enthalpy (ΔH) & Entropy (ΔS) fundamental contributions' : step === 1 ? 'Temperature modulation: T·ΔS entropy driving factor' : 'Thermodynamic spontaneity: ΔG < 0 (spontaneous downhill process)');

      // Header Banner
      D.text(g, 'THERMODYNAMICS: GIBBS FREE ENERGY & SPONTANEITY DYNAMICS', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `${st.rxnName} · T = ${st.tempK} K (${st.tempK - 273}°C) · ΔG° = ${st.deltaG} kJ/mol · ${st.spontaneity}`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: Tug-of-War Balance Scale (x: 24 to 530)
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Enthalpic vs Entropic Driving Forces', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const cx = 270;
      const cy = 290;

      // Balance fulcrum at (cx, cy + 60)
      D.poly(g, [
        [cx - 24, cy + 90],
        [cx + 24, cy + 90],
        [cx, cy + 45],
      ], { fill: '#475569', stroke: '#94a3b8', width: 2, close: true });
      D.circle(g, cx, cy + 45, 6, { fill: '#38bdf8' });

      // Tilt beam angle proportional to deltaG
      const tilt = clamp(-st.deltaG * 0.005, -0.35, 0.35); // negative deltaG tilts left downward (favorable)
      const bLen = 170;

      const leftX = cx - Math.cos(tilt) * bLen;
      const leftY = cy + 45 - Math.sin(tilt) * bLen;
      const rightX = cx + Math.cos(tilt) * bLen;
      const rightY = cy + 45 + Math.sin(tilt) * bLen;

      D.line(g, leftX, leftY, rightX, rightY, { color: '#facc15', width: 5 });

      // Left Pan: Enthalpy Contribution ΔH
      D.line(g, leftX, leftY, leftX - 15, leftY + 45, { color: '#94a3b8', width: 1.5 });
      D.line(g, leftX, leftY, leftX + 15, leftY + 45, { color: '#94a3b8', width: 1.5 });
      D.rect(g, leftX - 45, leftY + 45, 90, 45, { fill: st.dH < 0 ? '#15803d' : '#b91c1c', stroke: '#ffffff', width: 1.5, r: 6 });
      D.text(g, `ΔH = ${st.dH} kJ`, leftX, leftY + 68, { color: '#ffffff', size: 11, weight: 800, align: 'center' });

      // Right Pan: Entropy Factor −TΔS
      const minusTdS = -st.tDeltaS_kJ;
      D.line(g, rightX, rightY, rightX - 15, rightY + 45, { color: '#94a3b8', width: 1.5 });
      D.line(g, rightX, rightY, rightX + 15, rightY + 45, { color: '#94a3b8', width: 1.5 });
      D.rect(g, rightX - 45, rightY + 45, 90, 45, { fill: minusTdS < 0 ? '#15803d' : '#b91c1c', stroke: '#ffffff', width: 1.5, r: 6 });
      D.text(g, `−TΔS = ${minusTdS.toFixed(0)} kJ`, rightX, rightY + 68, { color: '#ffffff', size: 11, weight: 800, align: 'center' });

      D.text(g, 'Net Gibbs Energy (ΔG = ΔH − TΔS):', cx, cy - 80, { color: '#cbd5e1', size: 12, weight: 600, align: 'center' });
      D.text(g, `${st.deltaG > 0 ? '+' : ''}${st.deltaG} kJ/mol`, cx, cy - 50, { color: st.deltaG < 0 ? '#22c55e' : '#ef4444', size: 26, weight: 900, align: 'center' });

      D.tag(g, st.deltaG < 0 ? '✓ SPONTANEOUS PROCESS (Forward Favored)' : '✗ NON-SPONTANEOUS (Reverse Favored)', cx, 490, { bg: '#0f172a', border: st.deltaG < 0 ? '#22c55e' : '#ef4444', color: st.deltaG < 0 ? '#22c55e' : '#ef4444', size: 12, align: 'center' });

      // Right Panel: Live ΔG vs Temperature Curve (x: 540 to 975)
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Gibbs Free Energy vs Temperature Plot', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });
      D.tag(g, `K_eq = ${st.kEqStr}`, 905, 110, { bg: '#0f172a', border: '#facc15', color: '#facc15', size: 11, align: 'center' });

      const gx = 595;
      const gy = 440;
      const gw = 340;
      const gh = 230;

      // Coordinate axes with zero ΔG horizontal center line
      const zeroY = gy - gh / 2;
      D.line(g, gx, zeroY, gx + gw, zeroY, { color: '#64748b', width: 1.5, dash: [4, 4] });
      D.text(g, 'ΔG° = 0 (Equilibrium Line)', gx + gw - 60, zeroY - 8, { color: '#64748b', size: 9.5 });

      D.line(g, gx, gy, gx + gw, gy, { color: '#475569', width: 1.5 });
      D.line(g, gx, gy, gx, gy - gh, { color: '#475569', width: 1.5 });
      D.text(g, 'Temperature T (K)', gx + gw - 40, gy + 20, { color: '#94a3b8', size: 11, weight: 600 });
      D.text(g, 'ΔG° (kJ/mol)', gx - 10, gy - gh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

      // Plot line ΔG(T) = ΔH − T·(ΔS/1000) from T = 100 to 1200 K
      const tMin = 100;
      const tMax = 1200;
      const gPts = [];
      const numPts = 50;

      for (let i = 0; i <= numPts; i++) {
        const tVal = tMin + (i / numPts) * (tMax - tMin);
        const gVal = st.dH - (tVal * st.dS) / 1000;
        const px = gx + ((tVal - tMin) / (tMax - tMin)) * gw;
        const py = zeroY - (gVal / 180) * (gh / 2);
        gPts.push([px, clamp(py, gy - gh, gy)]);
      }

      D.poly(g, gPts, { stroke: '#38bdf8', width: 3, fill: false });

      // Inversion Point T* marker
      if (st.tCrossK && st.tCrossK >= tMin && st.tCrossK <= tMax) {
        const invX = gx + ((st.tCrossK - tMin) / (tMax - tMin)) * gw;
        D.line(g, invX, zeroY - 20, invX, zeroY + 20, { color: '#facc15', width: 2 });
        D.circle(g, invX, zeroY, 5, { fill: '#facc15' });
        D.text(g, `T* = ${st.tCrossK} K`, invX, zeroY + 25, { color: '#facc15', size: 10.5, weight: 800, align: 'center' });
      }

      // Current Temperature bead
      const curX = gx + ((st.tempK - tMin) / (tMax - tMin)) * gw;
      const curY = zeroY - (st.deltaG / 180) * (gh / 2);
      D.line(g, curX, gy, curX, curY, { color: '#22c55e', width: 1.5, dash: [3, 3] });
      D.circle(g, curX, curY, 6, { fill: st.deltaG < 0 ? '#22c55e' : '#ef4444', stroke: '#ffffff', width: 2 });
      D.text(g, `${st.deltaG} kJ`, curX, curY - 14, { color: '#f8fafc', size: 11, weight: 800, align: 'center' });

      // Bottom theory note
      D.rect(g, 560, gy + 32, 395, 42, { fill: '#0f172a', stroke: '#334155', r: 8 });
      D.text(g, 'van \'t Hoff Isochore: d(ln K) / dT = ΔH° / (R T²)', 575, gy + 53, { color: '#38bdf8', size: 11, weight: 700 });
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 14. GALVANIC CELL & NERNST EQUATION (CALOMEL & GLASS ELECTRODES)
  // ═════════════════════════════════════════════════════════════════
  S['chem-galvanic-nernst-cell'] = {
    live: true,
    approx: 'EMF calculated via Nernst equation E = E° − (2.303 RT / nF) log10(Q). Saturated Calomel Electrode E_SCE = +0.2422 V. Combined glass electrode E = E°_glass − 0.05916 pH at 25°C.',
    modes: [
      { key: 'daniell_cell', label: 'Daniell Galvanic Cell (Zn | Zn²⁺ || Cu²⁺ | Cu)' },
      { key: 'glass_calomel_ph', label: 'Glass-Calomel Combined Cell (pH Measurement)' },
    ],
    params: [
      {
        key: 'concAnode',
        label: 'Anode [Zn²⁺] or Solution pH',
        type: 'range',
        default: 0.1,
        min: 0.001,
        max: 2.0,
        step: 0.05,
        unit: 'M',
        showIf: (p) => p.mode === 'daniell_cell',
        help: 'Anolyte concentration [Zn²⁺] in Daniell cell.',
      },
      {
        key: 'concCathode',
        label: 'Cathode [Cu²⁺] Concentration',
        type: 'range',
        default: 1.0,
        min: 0.01,
        max: 2.0,
        step: 0.05,
        unit: 'M',
        showIf: (p) => p.mode === 'daniell_cell',
        help: 'Catholyte concentration [Cu²⁺] in Daniell cell.',
      },
      {
        key: 'solnPH',
        label: 'Test Solution pH',
        type: 'range',
        default: 4.0,
        min: 0.0,
        max: 14.0,
        step: 0.2,
        unit: 'pH',
        showIf: (p) => p.mode === 'glass_calomel_ph',
        help: 'pH of unknown test solution measured by glass membrane electrode against SCE.',
      },
      {
        key: 'temperature',
        label: 'Cell Temperature (°C)',
        type: 'range',
        default: 25,
        min: 5,
        max: 60,
        step: 1,
        unit: '°C',
        help: 'Temperature affects the Nernst slope 2.303 RT/F (0.05916 V at 25°C).',
      },
    ],
    examples: [
      { label: 'Standard Daniell Cell (1.0 M Zn²⁺, 1.0 M Cu²⁺, 25°C)', values: { mode: 'daniell_cell', concAnode: 1.0, concCathode: 1.0, temperature: 25 } },
      { label: 'Dilute Anode Daniell Cell (0.001 M Zn²⁺, 1.0 M Cu²⁺)', values: { mode: 'daniell_cell', concAnode: 0.001, concCathode: 1.0, temperature: 25 } },
      { label: 'Glass-Calomel pH Electrode at pH = 7.00 Buffer', values: { mode: 'glass_calomel_ph', solnPH: 7.0, temperature: 25 } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      if (p.mode === 'daniell_cell') {
        return [
          { title: '1. Oxidation at Zinc Anode', text: 'Zn atoms in zinc rod lose electrons: Zn(s) → Zn²⁺(aq) + 2e⁻ (E°_ox = +0.76 V). Electrons flow into external wire toward cathode, leaving anode negatively charged.' },
          { title: '2. Reduction at Copper Cathode', text: 'Cu²⁺ ions from solution acquire electrons at copper cathode: Cu²⁺(aq) + 2e⁻ → Cu(s) (E°_red = +0.34 V). Copper deposits onto cathode, increasing its mass.' },
          { title: '3. Salt Bridge Ion Migration & Nernst EMF', text: 'Agar-agar salt bridge with KCl allows K⁺ migration to cathode and Cl⁻ migration to anode, preventing charge buildup. Nernst equation governs live cell voltage E_cell.' },
        ];
      }
      return [
        { title: '1. Saturated Calomel Reference Electrode (SCE)', text: 'SCE consists of Hg | Hg₂Cl₂(s) | KCl(sat) maintaining a fixed reference potential of +0.2422 V vs SHE, independent of test solution pH.' },
        { title: '2. Glass Membrane Boundary Potential', text: 'Corning 015 thin glass bulb hydrates, establishing an ion-exchange equilibrium between Na⁺/H⁺ in glass and H⁺ in test solution: E_glass = E°_glass − 0.05916 pH.' },
        { title: '3. Voltmeter Readout & Calibrated pH', text: 'Cell potential E_cell = E_glass − E_calomel varies linearly with pH with a theoretical slope of 59.16 mV per pH unit at 25°C, yielding direct digital pH determination.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'daniell_cell';
      const tempC = Number(p.temperature != null ? p.temperature : 25);
      const tempK = tempC + 273.15;
      const nernstSlope = (2.302585 * R_GAS * tempK) / FARADAY; // V

      if (mode === 'daniell_cell') {
        const cZn = Math.max(0.0001, Number(p.concAnode != null ? p.concAnode : 0.1));
        const cCu = Math.max(0.0001, Number(p.concCathode != null ? p.concCathode : 1.0));
        const E0_cell = 1.10; // V (0.34 - (-0.76))
        const n = 2;
        const Q = cZn / cCu;
        const eCell = E0_cell - (nernstSlope / n) * Math.log10(Q);

        return {
          formulas: [
            { name: 'Standard Cell Potential', formula: 'E°_cell = E°_cathode − E°_anode', given: 'Cu²⁺/Cu (+0.34 V) and Zn²⁺/Zn (−0.76 V)', calc: '0.34 − (−0.76)', result: '1.100', unit: 'V' },
            { name: 'Nernst Equation', formula: 'E_cell = E°_cell − (2.303 RT / nF) log₁₀([Zn²⁺]/[Cu²⁺])', given: `T = ${tempC}°C, Q = ${Q.toFixed(4)}`, calc: `1.10 − (${(nernstSlope / 2).toFixed(4)}) × log₁₀(${Q.toFixed(4)})`, result: `${eCell.toFixed(4)}`, unit: 'V' },
            { name: 'Maximum Electrical Work', formula: 'ΔG = −n F E_cell', given: `n = 2, F = 96,485 C/mol`, calc: `−2 × 96485 × ${eCell.toFixed(4)}`, result: `${Math.round((-2 * FARADAY * eCell) / 1000)}`, unit: 'kJ/mol' },
          ],
          readouts: [
            { label: 'Cell Potential E', value: `${eCell.toFixed(4)} V`, tone: 'hi' },
            { label: 'Standard E°', value: '1.100 V', tone: 'neutral' },
            { label: '[Zn²⁺] Anode', value: `${cZn} M`, tone: 'good' },
            { label: '[Cu²⁺] Cathode', value: `${cCu} M`, tone: 'good' },
            { label: 'Nernst Slope', value: `${(nernstSlope * 1000).toFixed(1)} mV`, tone: 'neutral' },
          ],
          state: {
            mode,
            cZn,
            cCu,
            tempC,
            Q: Math.round(Q * 10000) / 10000,
            eCell: Math.round(eCell * 10000) / 10000,
            cellNotation: `Zn | Zn²⁺(${cZn} M) || Cu²⁺(${cCu} M) | Cu`,
          },
          explain: {
            what: `A galvanic cell converts spontaneous chemical reaction Gibbs free energy into electrical energy through spatially separated oxidation and reduction half-reactions.`,
            why: `As zinc oxidizes and copper deposits, the reaction quotient Q = [Zn²⁺]/[Cu²⁺] increases, reducing the cell potential according to the Nernst equation until E_cell = 0 at equilibrium (battery dead).`,
            param: `Diluting the anode ([Zn²⁺] < 1.0 M) or concentrating the cathode ([Cu²⁺] > 1.0 M) decreases Q, raising cell voltage according to Le Chatelier's principle.`,
            effect: `The salt bridge prevents liquid junction potential and maintains electrical neutrality via mobile K⁺ and Cl⁻ ions without mixing bulk solutions.`,
          },
        };
      }

      // Glass-Calomel pH Mode
      const ph = Number(p.solnPH != null ? p.solnPH : 4.0);
      const E0_glass = 0.550; // V (composite constant)
      const E_calomel = 0.2422; // V (saturated calomel at 25°C)
      const eGlass = E0_glass - nernstSlope * ph;
      const eCellPH = eGlass - E_calomel;

      return {
        formulas: [
          { name: 'Glass Membrane Potential', formula: 'E_glass = E°_glass − (2.303 RT / F) pH', given: `T = ${tempC}°C, pH = ${ph.toFixed(2)}`, calc: `${E0_glass} − (${nernstSlope.toFixed(4)}) × ${ph.toFixed(2)}`, result: `${eGlass.toFixed(4)}`, unit: 'V' },
          { name: 'Measured Cell Voltage', formula: 'E_cell = E_glass − E_SCE', given: `E_SCE = +0.2422 V`, calc: `${eGlass.toFixed(4)} − 0.2422`, result: `${eCellPH.toFixed(4)}`, unit: 'V' },
        ],
        readouts: [
          { label: 'Solution pH', value: ph.toFixed(2), tone: 'hi' },
          { label: 'Cell Potential E', value: `${eCellPH.toFixed(4)} V`, tone: 'good' },
          { label: 'Glass Potential', value: `${eGlass.toFixed(4)} V`, tone: 'neutral' },
          { label: 'Calomel Ref E_SCE', value: '+0.2422 V', tone: 'neutral' },
          { label: 'Nernst Slope', value: `${(nernstSlope * 1000).toFixed(1)} mV/pH`, tone: 'hi' },
        ],
        state: {
          mode,
          ph,
          tempC,
          eGlass: Math.round(eGlass * 10000) / 10000,
          eCellPH: Math.round(eCellPH * 10000) / 10000,
          nernstSlopeMV: Math.round(nernstSlope * 10000) / 10,
        },
        explain: {
          what: `The combined glass-calomel electrode is an electrochemical sensor where a thin H⁺-selective glass bulb develops a phase-boundary potential directly proportional to hydronium ion activity.`,
          why: `Saturated calomel (SCE) provides a temperature-stable, reproducible half-cell reference potential (+0.2422 V), isolating all voltage changes to the glass membrane.`,
          param: `The theoretical Nernstian slope is 59.16 mV per pH unit at 25°C. At higher temperatures, the slope increases proportionally to absolute temperature T.`,
          effect: `As solution pH increases from 0 to 14, hydronium ion concentration drops exponentially, driving E_cell downward linearly across a span of ~830 mV.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#090d16');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Anodic oxidation: Zn(s) → Zn²⁺(aq) + 2e⁻ with zinc mass loss' : step === 1 ? 'Continuous electron flux through wire & ion migration through salt bridge' : 'Cathodic reduction: Cu²⁺(aq) + 2e⁻ → Cu(s) & Nernst equilibrium EMF');

      if (st.mode === 'daniell_cell') {
        // Daniell Cell
        D.text(g, 'DANIELL GALVANIC CELL & NERNST ELECTROCHEMICAL APPARATUS', 30, 36, { color: '#38bdf8', size: 19, weight: 800 });
        D.text(g, `${st.cellNotation}  •  E_cell = ${st.eCell.toFixed(4)} V  •  T = ${st.tempC}°C  •  Q = ${st.Q}`, 30, 62, { color: '#94a3b8', size: 12.5, weight: 600 });

        // Left Panel: Electrochemical Cell Apparatus (x: 24 to 530)
        D.rect(g, 24, 85, 500, 440, { fill: '#131b2e', stroke: '#1e293b', r: 12 });
        D.text(g, 'Galvanic Cell & Salt Bridge Apparatus (Live Circuit)', 40, 108, { color: '#f8fafc', size: 13.5, weight: 700 });

        const cx = 270;
        const cy = 295;

        // Anode Beaker (Left, Zn)
        const b1X = 65;
        const b1Y = cy;
        const bW = 140;
        const bH = 150;
        D.rect(g, b1X, b1Y, bW, bH, { fill: '#0a0f1d', stroke: '#475569', width: 2, r: 6 });
        // Solution liquid with subtle meniscus waves
        const wave1 = Math.sin(t * 3) * 1.5;
        D.rect(g, b1X + 4, b1Y + 30 + wave1, bW - 8, bH - 34 - wave1, { fill: 'rgba(56, 189, 248, 0.16)', r: 4 });
        D.text(g, `ZnSO₄ (${st.cZn} M)`, b1X + 70, b1Y + 124, { color: '#38bdf8', size: 11, weight: 700, align: 'center' });

        // Zinc Electrode
        const znOxidation = 0.5 + 0.5 * Math.sin(t * 4);
        D.rect(g, b1X + 35, b1Y - 45, 24, 130, { fill: '#94a3b8', stroke: '#cbd5e1', width: 1.5 });
        D.text(g, 'Zn Anode (−)', b1X + 47, b1Y - 56, { color: '#cbd5e1', size: 10, weight: 800, align: 'center' });

        // Animated Zn2+ ions shedding into solution
        for (let i = 0; i < 4; i++) {
          const zoT = (t * 0.8 + i * 0.25) % 1;
          const zx = b1X + 59 + zoT * 40;
          const zy = b1Y + 45 + i * 20 + Math.sin(t * 3 + i) * 6;
          D.circle(g, zx, zy, 4, { fill: 'rgba(148, 163, 184, ' + (1 - zoT) + ')', stroke: '#38bdf8', width: 1 });
          D.text(g, 'Zn²⁺', zx, zy - 4, { color: 'rgba(56, 189, 248, ' + (1 - zoT) + ')', size: 8, weight: 700, align: 'center' });
        }

        // Cathode Beaker (Right, Cu)
        const b2X = 335;
        const b2Y = cy;
        D.rect(g, b2X, b2Y, bW, bH, { fill: '#0a0f1d', stroke: '#475569', width: 2, r: 6 });
        const wave2 = Math.cos(t * 3) * 1.5;
        D.rect(g, b2X + 4, b2Y + 30 + wave2, bW - 8, bH - 34 - wave2, { fill: 'rgba(2, 132, 199, 0.38)', r: 4 });
        D.text(g, `CuSO₄ (${st.cCu} M)`, b2X + 70, b2Y + 124, { color: '#38bdf8', size: 11, weight: 700, align: 'center' });

        // Copper Electrode (with plated surface shimmer)
        D.rect(g, b2X + 80, b2Y - 45, 24, 130, { fill: '#ea580c', stroke: '#f97316', width: 1.5 });
        D.text(g, 'Cu Cathode (+)', b2X + 92, b2Y - 56, { color: '#f97316', size: 10, weight: 800, align: 'center' });

        // Animated Cu2+ deposition onto electrode
        for (let i = 0; i < 4; i++) {
          const cuT = (t * 0.9 + i * 0.25) % 1;
          const cxPos = b2X + 40 + (1 - cuT) * 40;
          const cyPos = b2Y + 45 + i * 20 + Math.cos(t * 3 + i) * 6;
          D.circle(g, cxPos, cyPos, 4, { fill: 'rgba(234, 88, 12, ' + cuT + ')', stroke: '#ea580c', width: 1 });
          D.text(g, 'Cu²⁺', cxPos, cyPos - 4, { color: 'rgba(249, 115, 22, ' + cuT + ')', size: 8, weight: 700, align: 'center' });
        }

        // Inverted U-tube Salt Bridge (KCl in Agar)
        D.poly(g, [
          [b1X + 105, b1Y + 90],
          [b1X + 105, b1Y - 20],
          [b2X + 35, b1Y - 20],
          [b2X + 35, b2Y + 90],
          [b2X + 47, b2Y + 90],
          [b2X + 47, b1Y - 8],
          [b1X + 117, b1Y - 8],
          [b1X + 117, b1Y + 90],
        ], { fill: 'rgba(250, 204, 21, 0.22)', stroke: '#facc15', width: 2, close: true });
        D.text(g, 'Salt Bridge (KCl in Agar)', cx, b1Y - 30, { color: '#facc15', size: 10.5, weight: 800, align: 'center' });

        // Animated Ions moving through Salt Bridge
        // K+ moves towards cathode (right)
        for (let i = 0; i < 5; i++) {
          const kt = (t * 0.35 + i * 0.2) % 1;
          let kx, ky;
          if (kt < 0.25) {
            kx = b1X + 111;
            ky = (b1Y + 70) - (kt / 0.25) * 80;
          } else if (kt < 0.75) {
            const u = (kt - 0.25) / 0.5;
            kx = (b1X + 111) + u * ((b2X + 41) - (b1X + 111));
            ky = b1Y - 14;
          } else {
            kx = b2X + 41;
            ky = (b1Y - 14) + ((kt - 0.75) / 0.25) * 84;
          }
          D.circle(g, kx, ky, 3, { fill: '#a855f7', stroke: '#e9d5ff', width: 1 });
          if (i === 2) D.text(g, 'K⁺ →', kx, ky - 6, { color: '#c084fc', size: 8, weight: 800, align: 'center' });
        }

        // Cl- moves towards anode (left)
        for (let i = 0; i < 5; i++) {
          const clt = (1 - ((t * 0.35 + i * 0.2) % 1));
          let clx, cly;
          if (clt < 0.25) {
            clx = b1X + 111;
            cly = (b1Y + 70) - (clt / 0.25) * 80;
          } else if (clt < 0.75) {
            const u = (clt - 0.25) / 0.5;
            clx = (b1X + 111) + u * ((b2X + 41) - (b1X + 111));
            cly = b1Y - 14;
          } else {
            clx = b2X + 41;
            cly = (b1Y - 14) + ((clt - 0.75) / 0.25) * 84;
          }
          D.circle(g, clx, cly + 4, 3, { fill: '#eab308', stroke: '#fef08a', width: 1 });
          if (i === 2) D.text(g, '← Cl⁻', clx, cly + 10, { color: '#facc15', size: 8, weight: 800, align: 'center' });
        }

        // External Circuit Wires
        const wY = cy - 110;
        D.line(g, b1X + 47, b1Y - 45, b1X + 47, wY, { color: '#64748b', width: 2.5 });
        D.line(g, b1X + 47, wY, cx - 38, wY, { color: '#64748b', width: 2.5 });
        D.line(g, b2X + 92, b2Y - 45, b2X + 92, wY, { color: '#64748b', width: 2.5 });
        D.line(g, b2X + 92, wY, cx + 38, wY, { color: '#64748b', width: 2.5 });

        // Continuous Moving Electrons (e-) along circuit
        const eDistTotal = (b1Y - 45 - wY) + (cx - 38 - (b1X + 47)) + (b2X + 92 - (cx + 38)) + (b2Y - 45 - wY);
        const eSpeed = Math.max(0.4, st.eCell) * 60;
        for (let i = 0; i < 9; i++) {
          const s = (t * eSpeed + i * (eDistTotal / 9)) % eDistTotal;
          let ex, ey;
          const s1 = b1Y - 45 - wY;
          const s2 = s1 + (cx - 38 - (b1X + 47));
          const s3 = s2 + (b2X + 92 - (cx + 38));
          if (s < s1) {
            ex = b1X + 47;
            ey = (b1Y - 45) - s;
          } else if (s < s2) {
            ex = (b1X + 47) + (s - s1);
            ey = wY;
          } else if (s < s3) {
            ex = (cx + 38) + (s - s2);
            ey = wY;
          } else {
            ex = b2X + 92;
            ey = wY + (s - s3);
          }
          D.circle(g, ex, ey, 4.5, { fill: '#38bdf8', stroke: '#ffffff', width: 1.2 });
          if (i % 2 === 0) {
            D.text(g, 'e⁻', ex, ey - 7, { color: '#38bdf8', size: 9, weight: 800, align: 'center' });
          }
        }

        // Precision Digital Voltmeter Housing
        D.circle(g, cx, wY, 36, { fill: '#0a0f1d', stroke: '#38bdf8', width: 3 });
        D.circle(g, cx, wY, 32, { fill: '#0f172a', stroke: '#1e293b', width: 1 });
        // LED indicator
        const ledGlow = 0.6 + 0.4 * Math.sin(t * 6);
        D.circle(g, cx, wY - 20, 3, { fill: 'rgba(34, 197, 94, ' + ledGlow + ')', stroke: '#22c55e', width: 1 });
        D.text(g, 'DIGITAL EMF', cx, wY - 11, { color: '#94a3b8', size: 8, weight: 800, align: 'center' });
        // Jitter voltage for ultra-realistic live measurement
        const jitter = (Math.sin(t * 12) * 0.0003);
        const liveDispVolt = (st.eCell + jitter).toFixed(4);
        D.text(g, liveDispVolt + ' V', cx, wY + 6, { color: '#38bdf8', size: 12, weight: 900, align: 'center' });

        // Tag summary
        D.tag(g, `Cell Potential: E = 1.10 − 0.0296 log₁₀(${st.Q.toFixed(3)}) = ${st.eCell.toFixed(4)} V`, cx, 488, { bg: '#090d16', border: '#22c55e', color: '#22c55e', size: 12, align: 'center' });

        // Right Panel: Nernst Concentration Plots (x: 540 to 975)
        D.rect(g, 540, 85, 435, 440, { fill: '#131b2e', stroke: '#1e293b', r: 12 });
        D.text(g, 'Nernst Logarithmic Potential Curve', 560, 108, { color: '#f8fafc', size: 13.5, weight: 700 });

        const gx = 595;
        const gy = 440;
        const gw = 340;
        const gh = 230;

        D.line(g, gx, gy, gx + gw, gy, { color: '#475569', width: 1.5 });
        D.line(g, gx, gy, gx, gy - gh, { color: '#475569', width: 1.5 });
        D.text(g, 'log₁₀ Q = log₁₀([Zn²⁺]/[Cu²⁺])', gx + gw - 80, gy + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
        D.text(g, 'E_cell (V)', gx - 10, gy - gh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

        // Plot E vs log Q from -4 to +4
        const nPts = 40;
        const qPts = [];
        for (let i = 0; i <= nPts; i++) {
          const lq = -4 + (i / nPts) * 8;
          const eVal = 1.10 - 0.0296 * lq;
          const px = gx + ((lq + 4) / 8) * gw;
          const py = gy - ((eVal - 0.95) / 0.3) * gh;
          qPts.push([px, clamp(py, gy - gh, gy)]);
        }
        D.poly(g, qPts, { stroke: '#38bdf8', width: 3, fill: false });

        // Current operating point with pulsing halo
        const curLq = Math.log10(st.Q);
        const curX = gx + ((curLq + 4) / 8) * gw;
        const curY = gy - ((st.eCell - 0.95) / 0.3) * gh;
        D.line(g, curX, gy, curX, curY, { color: '#facc15', width: 1.5, dash: [3, 3] });
        const haloR = 6 + Math.sin(t * 5) * 2;
        D.circle(g, curX, curY, haloR, { fill: 'rgba(250, 204, 21, 0.3)' });
        D.circle(g, curX, curY, 6, { fill: '#facc15', stroke: '#ffffff', width: 2 });
        D.text(g, `${st.eCell.toFixed(3)} V`, curX, curY - 14, { color: '#facc15', size: 11, weight: 800, align: 'center' });

        D.rect(g, 560, gy + 32, 395, 42, { fill: '#0a0f1d', stroke: '#334155', r: 8 });
        D.text(g, 'Le Chatelier shift: decreasing [Zn²⁺] raises E_cell above 1.10 V', 575, gy + 53, { color: '#38bdf8', size: 11, weight: 700 });
      } else {
        // Glass-Calomel pH Electrode View
        D.text(g, 'GLASS-CALOMEL COMBINED pH SENSING APPARATUS', 30, 36, { color: '#38bdf8', size: 19, weight: 800 });
        D.text(g, `Unknown Solution pH = ${st.ph.toFixed(2)}  •  Measured E_cell = ${st.eCellPH.toFixed(4)} V  •  Nernst Slope = ${st.nernstSlopeMV} mV/pH`, 30, 62, { color: '#94a3b8', size: 12.5, weight: 600 });

        // Left Panel: Glass Electrode Probe in Beaker
        D.rect(g, 24, 85, 500, 440, { fill: '#131b2e', stroke: '#1e293b', r: 12 });
        D.text(g, 'Combination Glass & SCE Probe in Unknown Solution', 40, 108, { color: '#f8fafc', size: 13.5, weight: 700 });

        const cx = 270;
        const cy = 295;

        // Solution Beaker
        D.rect(g, cx - 110, cy - 20, 220, 160, { fill: '#0a0f1d', stroke: '#475569', width: 2, r: 8 });
        // Dynamic solution color based on pH indicator
        let phCol = 'rgba(56, 189, 248, 0.3)';
        if (st.ph < 3) phCol = 'rgba(239, 68, 68, 0.45)';
        else if (st.ph < 6) phCol = 'rgba(245, 158, 11, 0.45)';
        else if (st.ph < 8) phCol = 'rgba(34, 197, 94, 0.45)';
        else if (st.ph < 11) phCol = 'rgba(56, 189, 248, 0.45)';
        else phCol = 'rgba(168, 85, 247, 0.45)';

        D.rect(g, cx - 106, cy + 20, 212, 116, { fill: phCol, r: 6 });
        D.text(g, `Test Solution (pH ${st.ph.toFixed(2)})`, cx, cy + 115, { color: '#ffffff', size: 12, weight: 800, align: 'center' });

        // Combination Electrode Stem
        D.rect(g, cx - 22, cy - 110, 44, 150, { fill: 'rgba(255, 255, 255, 0.15)', stroke: '#94a3b8', width: 1.5, r: 4 });
        D.rect(g, cx - 18, cy - 105, 36, 140, { fill: 'rgba(148, 163, 184, 0.2)' });

        // Internal Reference (Ag/AgCl wire)
        D.line(g, cx - 8, cy - 100, cx - 8, cy + 25, { color: '#cbd5e1', width: 2 });
        D.text(g, 'Ag/AgCl', cx - 12, cy - 90, { color: '#cbd5e1', size: 8, weight: 700, align: 'right' });

        // Calomel Reference compartment
        D.line(g, cx + 8, cy - 100, cx + 8, cy + 25, { color: '#f59e0b', width: 2 });
        D.text(g, 'SCE Ref', cx + 12, cy - 90, { color: '#f59e0b', size: 8, weight: 700, align: 'left' });

        // Thin Glass Bulb Membrane (Sensitive Hydrated Gel)
        const bulbGlow = 0.5 + 0.5 * Math.sin(t * 4);
        D.circle(g, cx, cy + 45, 22, { fill: 'rgba(56, 189, 248, ' + (0.3 + 0.2 * bulbGlow) + ')', stroke: '#38bdf8', width: 2.5 });
        D.circle(g, cx, cy + 45, 17, { fill: 'rgba(255, 255, 255, 0.25)', stroke: '#cbd5e1', width: 1 });
        D.text(g, 'Glass', cx, cy + 40, { color: '#ffffff', size: 9, weight: 800, align: 'center' });
        D.text(g, 'Membrane', cx, cy + 50, { color: '#38bdf8', size: 8, weight: 800, align: 'center' });

        // Dynamic H+ ions clustering around bulb
        const numH = Math.round(clamp((14 - st.ph) * 1.5 + 3, 2, 20));
        for (let i = 0; i < numH; i++) {
          const hAngle = (i / numH) * Math.PI * 2 + t * 0.8;
          const hRad = 28 + Math.sin(t * 3 + i) * 6;
          const hx = cx + Math.cos(hAngle) * hRad;
          const hy = cy + 45 + Math.sin(hAngle) * hRad;
          D.circle(g, hx, hy, 3, { fill: '#ef4444', stroke: '#fca5a5', width: 1 });
          if (i === 0) D.text(g, 'H⁺', hx, hy - 6, { color: '#ef4444', size: 9, weight: 800, align: 'center' });
        }

        // Porous ceramic liquid junction
        D.rect(g, cx + 16, cy + 28, 6, 8, { fill: '#ffffff', stroke: '#f59e0b', width: 1 });
        D.text(g, 'Porous Frit', cx + 26, cy + 32, { color: '#facc15', size: 8, weight: 700 });

        // Multimeter Digital Cable
        D.line(g, cx, cy - 110, cx, cy - 135, { color: '#64748b', width: 2.5 });

        // High precision digital meter
        D.circle(g, cx, cy - 145, 28, { fill: '#0a0f1d', stroke: '#38bdf8', width: 2.5 });
        D.text(g, 'pH METER', cx, cy - 156, { color: '#94a3b8', size: 7.5, weight: 800, align: 'center' });
        D.text(g, st.ph.toFixed(2), cx, cy - 141, { color: '#22c55e', size: 14, weight: 900, align: 'center' });

        D.tag(g, `Nernst Response: E_cell = ${st.eCellPH.toFixed(4)} V  •  ΔE/ΔpH = ${st.nernstSlopeMV} mV`, cx, 488, { bg: '#090d16', border: '#22c55e', color: '#22c55e', size: 12, align: 'center' });

        // Right Panel: Linear Calibration Line (E vs pH)
        D.rect(g, 540, 85, 435, 440, { fill: '#131b2e', stroke: '#1e293b', r: 12 });
        D.text(g, 'Electrode Calibration: EMF vs pH (Nernst Line)', 560, 108, { color: '#f8fafc', size: 13.5, weight: 700 });

        const gx = 595;
        const gy = 440;
        const gw = 340;
        const gh = 230;

        D.line(g, gx, gy, gx + gw, gy, { color: '#475569', width: 1.5 });
        D.line(g, gx, gy, gx, gy - gh, { color: '#475569', width: 1.5 });
        D.text(g, 'Solution pH (0 to 14)', gx + gw - 65, gy + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
        D.text(g, 'E_cell (V)', gx - 10, gy - gh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

        // Calibration Line
        const phPts = [
          [gx, gy - ((0.45 - (-0.45)) / 0.9) * gh],
          [gx + gw, gy - ((-0.38 - (-0.45)) / 0.9) * gh],
        ];
        D.poly(g, phPts, { stroke: '#38bdf8', width: 3, fill: false });

        // Current pH point with pulsing ring
        const phU = st.ph / 14;
        const phX = gx + phU * gw;
        const phY = gy - ((st.eCellPH - (-0.45)) / 0.9) * gh;
        D.line(g, phX, gy, phX, phY, { color: '#facc15', width: 1.5, dash: [3, 3] });
        const pRing = 6 + Math.sin(t * 5) * 2;
        D.circle(g, phX, phY, pRing, { fill: 'rgba(250, 204, 21, 0.3)' });
        D.circle(g, phX, phY, 6, { fill: '#facc15', stroke: '#ffffff', width: 2 });
        D.text(g, `pH ${st.ph.toFixed(2)} (${st.eCellPH.toFixed(3)} V)`, phX, phY - 14, { color: '#facc15', size: 10.5, weight: 800, align: 'center' });

        D.rect(g, 560, gy + 32, 395, 42, { fill: '#0a0f1d', stroke: '#334155', r: 8 });
        D.text(g, `Slope = ${st.nernstSlopeMV} mV/pH unit at ${st.tempC}°C (theoretical: 59.16 mV at 25°C)`, 575, gy + 53, { color: '#38bdf8', size: 11, weight: 700 });
      }
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // 15. PHASE RULE & PHASE DIAGRAMS (WATER & Pb-Ag EUTECTIC)
  // ═════════════════════════════════════════════════════════════════
  S['chem-water-phase-eutectic'] = {
    live: true,
    approx: 'Gibbs Phase Rule F = C − P + 2 (one-component water) and reduced phase rule F = C − P + 1 (condensed two-component eutectic Pb-Ag system at constant 1 atm).',
    modes: [
      { key: 'water', label: 'Water One-Component System (H₂O P-T Phase Diagram)' },
      { key: 'eutectic_pbag', label: 'Lead-Silver (Pb-Ag) Two-Component Eutectic System' },
    ],
    params: [
      {
        key: 'tempC',
        label: 'System Temperature (°C)',
        type: 'range',
        default: 0.01,
        min: -30,
        max: 150,
        step: 1,
        unit: '°C',
        showIf: (p) => p.mode === 'water',
        help: 'Scrub across sub-zero ice, triple point (0.01°C), and boiling liquid regions.',
      },
      {
        key: 'pressAtm',
        label: 'Pressure (atm)',
        type: 'range',
        default: 1.0,
        min: 0.001,
        max: 5.0,
        step: 0.05,
        unit: 'atm',
        showIf: (p) => p.mode === 'water',
        help: 'Triple point pressure is 0.006 atm (4.58 mmHg).',
      },
      {
        key: 'agComp',
        label: 'Silver Composition (wt % Ag)',
        type: 'range',
        default: 2.6,
        min: 0.0,
        max: 20.0,
        step: 0.2,
        unit: '% Ag',
        showIf: (p) => p.mode === 'eutectic_pbag',
        help: 'Eutectic point is 2.6% Ag at 303°C (Pattinson\'s process for lead desilverization).',
      },
      {
        key: 'alloyTemp',
        label: 'Alloy Temperature (°C)',
        type: 'range',
        default: 303,
        min: 250,
        max: 600,
        step: 5,
        unit: '°C',
        showIf: (p) => p.mode === 'eutectic_pbag',
        help: 'Eutectic freezing temperature is 303°C.',
      },
    ],
    examples: [
      { label: 'Water Triple Point Invariant (T = 0.01°C, P = 0.006 atm)', values: { mode: 'water', tempC: 0.01, pressAtm: 0.006 } },
      { label: 'Atmospheric Normal Boiling Point (T = 100°C, 1 atm)', values: { mode: 'water', tempC: 100, pressAtm: 1.0 } },
      { label: 'Pb-Ag Eutectic Point (2.6% Ag, 303°C, F = 0)', values: { mode: 'eutectic_pbag', agComp: 2.6, alloyTemp: 303 } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      if (p.mode === 'water') {
        return [
          { title: '1. Phase Fields & Bivariant Freedom (F = 2)', text: 'Single phase regions (pure Solid ice, Liquid water, or Gas vapor) have C=1, P=1. Gibbs Phase Rule F = C − P + 2 yields F = 2 (temperature and pressure can vary independently).' },
          { title: '2. Univariant Coexistence Boundary Curves (F = 1)', text: 'Along sublimation (OA), vaporization (OB), and melting (OC) curves, two phases coexist in equilibrium (P = 2, F = 1). Note negative slope of melting curve OC (ice contracts on melting).' },
          { title: '3. Invariant Triple Point (F = 0)', text: 'At T = 0.01°C and P = 0.006 atm (4.58 mmHg), all three phases (ice, water, steam) coexist simultaneously (P = 3, F = 0). Zero degrees of freedom; any change in T or P causes one or two phases to vanish.' },
        ];
      }
      return [
        { title: '1. Liquid Homogeneous Melt (F = 2)', text: 'Above liquidus lines, Pb and Ag are completely miscible liquids (C = 2, P = 1). Under condensed phase rule F = C − P + 1, degrees of freedom F = 2 (temperature and composition).' },
        { title: '2. Freezing Curves & Pattinson\'s Process', text: 'Cooling argentiferous lead below the liquidus separates crystals of pure lead, leaving liquid enriched in silver until eutectic composition is reached.' },
        { title: '3. Invariant Eutectic Point (F = 0, 303°C, 2.6% Ag)', text: 'At 303°C and 2.6% Ag, three phases coexist in equilibrium: solid Pb + solid Ag + liquid melt (P = 3, F = 0). The entire remaining liquid solidifies at this single constant temperature.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'water';

      if (mode === 'water') {
        const tC = Number(p.tempC != null ? p.tempC : 0.01);
        const pAtm = Number(p.pressAtm != null ? p.pressAtm : 1.0);

        // Identify Phase State
        let phaseName = 'Liquid Water';
        let numPhases = 1;
        if (Math.abs(tC - 0.01) < 1 && Math.abs(pAtm - 0.006) < 0.05) {
          phaseName = 'Triple Point (Solid + Liquid + Vapor)';
          numPhases = 3;
        } else if (tC < 0 && pAtm > 0.006) {
          phaseName = 'Solid Ice (Ih)';
          numPhases = 1;
        } else if (pAtm < 0.006 && tC < 0.01) {
          phaseName = 'Solid Ice / Vapor Boundary';
          numPhases = 1;
        } else if (tC > 100 && pAtm <= 1.0) {
          phaseName = 'Water Vapor (Gas)';
          numPhases = 1;
        } else if (tC > 0 && tC < 100) {
          phaseName = 'Liquid Water';
          numPhases = 1;
        }

        const F = 1 - numPhases + 2;

        return {
          formulas: [
            { name: 'Gibbs Phase Rule', formula: 'F = C − P + 2', given: `Components C = 1 (H₂O), Phases P = ${numPhases}`, calc: `1 − ${numPhases} + 2`, result: `${F}`, unit: 'degrees of freedom' },
            { name: 'Clausius-Clapeyron Equation', formula: 'dP / dT = ΔH_trans / (T ΔV)', given: 'Melting of ice: V_water < V_ice (ΔV < 0)', calc: 'Negative slope dP/dT < 0 on melting curve OC', result: 'Negative Slope', unit: 'slope' },
          ],
          readouts: [
            { label: 'System', value: 'Water (C = 1)', tone: 'neutral' },
            { label: 'Active Phase', value: phaseName.split(' ')[0], tone: 'good' },
            { label: 'Number of Phases P', value: String(numPhases), tone: 'neutral' },
            { label: 'Degrees of Freedom F', value: String(F), tone: F === 0 ? 'warn' : 'hi' },
            { label: 'State', value: F === 0 ? 'Invariant (Fixed Point)' : F === 1 ? 'Univariant' : 'Bivariant', tone: 'hi' },
          ],
          state: {
            mode,
            tC,
            pAtm,
            phaseName,
            numPhases,
            F,
          },
          explain: {
            what: `The phase rule F = C − P + 2 determines the minimum number of intensive variables (temperature, pressure, composition) that must be fixed to completely define a chemical system at equilibrium.`,
            why: `Water exhibits an anomalous negative melting slope (dP/dT < 0) because hydrogen bonding creates an open hexagonal cage in ice that collapses upon melting, making liquid water denser than solid ice.`,
            param: `At the invariant triple point (0.01°C, 4.58 mmHg), F = 0; neither temperature nor pressure can be altered without causing one of the three coexisting phases to disappear.`,
            effect: `The critical point (374°C, 218 atm) marks the termination of the vaporization curve, above which liquid and gas merge into a single supercritical fluid.`,
          },
        };
      }

      // Pb-Ag Eutectic
      const agPct = Number(p.agComp != null ? p.agComp : 2.6);
      const tempC = Number(p.alloyTemp != null ? p.alloyTemp : 303);

      let phaseDesc = 'Liquid Alloy Melt';
      let numP = 1;
      if (Math.abs(tempC - 303) < 5 && Math.abs(agPct - 2.6) < 0.5) {
        phaseDesc = 'Eutectic Point: Solid Pb + Solid Ag + Liquid';
        numP = 3;
      } else if (tempC < 303) {
        phaseDesc = 'Solid Pb + Solid Ag Eutectic Mixture';
        numP = 2;
      } else if (agPct < 2.6 && tempC < 327) {
        phaseDesc = 'Solid Pb Crystals + Liquid Melt';
        numP = 2;
      } else if (agPct > 2.6 && tempC < 600) {
        phaseDesc = 'Solid Ag Crystals + Liquid Melt';
        numP = 2;
      }

      const F_cond = 2 - numP + 1; // Condensed phase rule

      return {
        formulas: [
          { name: 'Condensed Phase Rule', formula: 'F = C − P + 1 (at 1 atm)', given: `Components C = 2 (Pb, Ag), Phases P = ${numP}`, calc: `2 − ${numP} + 1`, result: `${F_cond}`, unit: 'degrees of freedom' },
          { name: 'Eutectic Composition & Temperature', formula: 'Lowest melting alloy mixture', given: 'Pb-Ag System', calc: '2.6% Ag at 303°C (Pattinson Process)', result: '303°C / 2.6% Ag', unit: 'invariant' },
        ],
        readouts: [
          { label: 'System', value: 'Pb-Ag (C = 2)', tone: 'neutral' },
          { label: 'State', value: phaseDesc.split(':')[0], tone: 'good' },
          { label: 'Phases P', value: String(numP), tone: 'neutral' },
          { label: 'Degrees of Freedom F', value: String(F_cond), tone: F_cond === 0 ? 'warn' : 'hi' },
          { label: 'Eutectic Point', value: '303°C (2.6% Ag)', tone: 'hi' },
        ],
        state: {
          mode,
          agPct,
          tempC,
          phaseDesc,
          numP,
          F_cond,
        },
        explain: {
          what: `A eutectic system is a homogeneous solid mixture of two or more components that melts or solidifies at a lower temperature than any of its individual constituents.`,
          why: `Under constant atmospheric pressure (condensed systems), the vapor phase is neglected, reducing the phase rule to F = C − P + 1.`,
          param: `At the eutectic point (303°C, 2.6 wt% Ag), three phases (solid Pb, solid Ag, liquid melt) coexist, yielding F = 0 (invariant).`,
          effect: `Pattinson\'s process uses this principle for the desilverization of argentiferous lead: cooling molten lead causes pure lead to crystallize out first, concentrating valuable silver in the remaining melt up to the eutectic limit.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Single-phase state space: degrees of freedom F = 2 (bivariant)' : step === 1 ? 'Two-phase equilibrium coexistence boundary curves: F = 1 (univariant)' : 'Invariant triple point / eutectic solidification: F = 0');

      if (st.mode === 'water') {
        // Water Phase Diagram
        D.text(g, 'WATER ONE-COMPONENT SYSTEM: P-T PHASE DIAGRAM & GIBBS PHASE RULE', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
        D.text(g, `State: ${st.phaseName} · T = ${st.tC}°C · P = ${st.pAtm} atm · Phases P = ${st.numPhases} · Degrees of Freedom F = ${st.F}`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

        // Left Panel: P-T Phase Diagram Plot (x: 24 to 530)
        D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
        D.text(g, 'Water Phase Diagram (Log P vs T)', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

        const gx = 80;
        const gy = 440;
        const gw = 410;
        const gh = 280;

        // Axes
        D.line(g, gx, gy, gx + gw, gy, { color: '#475569', width: 1.5 });
        D.line(g, gx, gy, gx, gy - gh, { color: '#475569', width: 1.5 });
        D.text(g, 'Temperature T (°C)', gx + gw - 35, gy + 20, { color: '#94a3b8', size: 11, weight: 600 });
        D.text(g, 'Pressure P (atm)', gx - 10, gy - gh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

        // Triple Point O at (gx + 120, gy - 80)
        const ox = gx + 120;
        const oy = gy - 80;

        // Sublimation Curve OA (Ice - Vapor)
        D.poly(g, [[gx + 20, gy - 20], [gx + 60, gy - 40], [ox, oy]], { stroke: '#38bdf8', width: 2.5, fill: false });
        D.text(g, 'Sublimation OA', gx + 40, gy - 55, { color: '#38bdf8', size: 9.5 });

        // Vaporization Curve OB (Liquid - Vapor)
        D.poly(g, [[ox, oy], [ox + 100, oy - 60], [ox + 200, oy - 120], [ox + 270, oy - 170]], { stroke: '#ef4444', width: 2.5, fill: false });
        D.text(g, 'Vaporization OB', ox + 140, oy - 100, { color: '#ef4444', size: 10 });
        D.circle(g, ox + 270, oy - 170, 5, { fill: '#ef4444' });
        D.text(g, 'Critical Point C (374°C, 218 atm)', ox + 250, oy - 185, { color: '#ef4444', size: 9.5, weight: 700 });

        // Fusion Curve OC (Ice - Liquid, Negative slope!)
        D.poly(g, [[ox, oy], [ox - 15, oy - 100], [ox - 30, oy - 180]], { stroke: '#22c55e', width: 2.5, fill: false });
        D.text(g, 'Melting OC (dP/dT < 0)', ox - 80, oy - 130, { color: '#22c55e', size: 10 });

        // Triple Point Marker
        D.circle(g, ox, oy, 6, { fill: '#facc15', stroke: '#ffffff', width: 2 });
        D.text(g, 'Triple Point O (0.01°C, 0.006 atm)', ox + 10, oy + 16, { color: '#facc15', size: 10.5, weight: 800 });

        // Phase labels
        D.text(g, 'SOLID (ICE)', gx + 45, oy - 120, { color: '#93c5fd', size: 14, weight: 800 });
        D.text(g, 'LIQUID (WATER)', ox + 50, oy - 120, { color: '#38bdf8', size: 14, weight: 800 });
        D.text(g, 'VAPOR (STEAM)', ox + 100, gy - 35, { color: '#f59e0b', size: 14, weight: 800 });

        D.tag(g, `Current Condition: ${st.phaseName} (F = ${st.F})`, 270, 490, { bg: '#0f172a', border: '#38bdf8', color: '#38bdf8', size: 12, align: 'center' });

        // Right Panel: Thermodynamic Analysis & Clausius-Clapeyron (x: 540 to 975)
        D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
        D.text(g, 'Degrees of Freedom & Anharmonic Ice Density', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

        const pMetrics = [
          { title: 'Triple Point (Invariant, F = 0)', desc: '3 phases coexist simultaneously at T = 0.01°C, P = 4.58 mmHg. Zero freedom.', col: '#facc15' },
          { title: 'Phase Boundaries (Univariant, F = 1)', desc: 'Along curves OA, OB, OC, fixing either T or P automatically fixes the other.', col: '#38bdf8' },
          { title: 'Single Phase Fields (Bivariant, F = 2)', desc: 'Inside ice, water, or steam fields, both T and P can vary independently without phase change.', col: '#22c55e' },
          { title: 'Ice Anomaly: Negative Slope of OC', desc: 'Clausius-Clapeyron dP/dT = ΔH / (T ΔV). Ice contracts on melting (ΔV < 0), causing melting point to decrease under high pressure.', col: '#f97316' },
        ];

        pMetrics.forEach((m, i) => {
          const my = 145 + i * 82;
          D.rect(g, 560, my, 395, 70, { fill: '#0f172a', stroke: '#334155', r: 8 });
          D.text(g, m.title, 575, my + 24, { color: m.col, size: 11.5, weight: 700 });
          D.text(g, m.desc, 575, my + 46, { color: '#cbd5e1', size: 10 });
        });
      } else {
        // Pb-Ag Eutectic Diagram
        D.text(g, 'LEAD-SILVER (Pb-Ag) EUTECTIC ALLOY PHASE SYSTEM', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
        D.text(g, `${st.phaseDesc} · Composition = ${st.agPct}% Ag · T = ${st.tempC}°C · Condensed F = ${st.F_cond}`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

        // Left Panel: Phase Diagram
        D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
        D.text(g, 'Pb-Ag Binary Phase Diagram (T vs wt% Ag)', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

        const gx = 80;
        const gy = 440;
        const gw = 410;
        const gh = 280;

        D.line(g, gx, gy, gx + gw, gy, { color: '#475569', width: 1.5 });
        D.line(g, gx, gy, gx, gy - gh, { color: '#475569', width: 1.5 });
        D.text(g, 'Composition wt% Ag', gx + gw - 40, gy + 20, { color: '#94a3b8', size: 11, weight: 600 });
        D.text(g, 'Temperature T (°C)', gx - 10, gy - gh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

        // Pb melting point (327°C) at x: gx, y: gy - 160
        // Eutectic Point (303°C, 2.6% Ag) at x: gx + 55, y: gy - 130
        // Ag melting point (961°C) off scale to right
        const pbY = gy - 160;
        const eutX = gx + 60;
        const eutY = gy - 130;

        // Liquidus line Pb-E
        D.line(g, gx, pbY, eutX, eutY, { color: '#38bdf8', width: 3 });
        D.text(g, 'Liquidus (Pb + Liq)', gx + 15, pbY - 15, { color: '#38bdf8', size: 9.5 });

        // Liquidus line E-Ag
        D.line(g, eutX, eutY, gx + gw, gy - gh + 30, { color: '#f59e0b', width: 3 });
        D.text(g, 'Liquidus (Ag + Liq)', eutX + 80, eutY - 40, { color: '#f59e0b', size: 10 });

        // Solidus Isotherm at 303°C
        D.line(g, gx, eutY, gx + gw, eutY, { color: '#ef4444', width: 2, dash: [4, 4] });
        D.text(g, 'Eutectic Horizontal (303°C)', gx + gw - 120, eutY + 16, { color: '#ef4444', size: 9.5 });

        // Eutectic Marker
        D.circle(g, eutX, eutY, 6, { fill: '#facc15', stroke: '#ffffff', width: 2 });
        D.text(g, 'Eutectic (303°C, 2.6% Ag)', eutX + 10, eutY - 8, { color: '#facc15', size: 10.5, weight: 800 });

        D.text(g, 'HOMOGENEOUS LIQUID ALLOY', gx + 140, gy - 230, { color: '#38bdf8', size: 13, weight: 800 });
        D.text(g, 'SOLID Pb + SOLID Ag (Eutectic Mixture)', gx + 80, gy - 60, { color: '#94a3b8', size: 12, weight: 700 });

        D.tag(g, `Current State: ${st.phaseDesc}`, 270, 490, { bg: '#0f172a', border: '#facc15', color: '#facc15', size: 12, align: 'center' });

        // Right Panel: Pattinson's Desilverization Process
        D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
        D.text(g, 'Pattinson\'s Process for Lead Desilverization', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

        D.rect(g, 560, 145, 395, 330, { fill: '#0f172a', stroke: '#334155', r: 8 });
        D.text(g, 'Industrial Metallurgical Application:', 575, 175, { color: '#facc15', size: 12, weight: 700 });
        D.text(g, '• Raw argentiferous lead contains ~0.1% silver.', 575, 205, { color: '#cbd5e1', size: 11 });
        D.text(g, '• When heated to molten state and slowly cooled, pure lead', 575, 235, { color: '#cbd5e1', size: 11 });
        D.text(g, '  crystallizes out first along the liquidus line.', 575, 255, { color: '#cbd5e1', size: 11 });
        D.text(g, '• Solid lead crystals are skimmed off with perforated ladles.', 575, 285, { color: '#cbd5e1', size: 11 });
        D.text(g, '• Residual molten liquid becomes increasingly rich in silver,', 575, 315, { color: '#cbd5e1', size: 11 });
        D.text(g, '  reaching the eutectic limit of 2.6% Ag at 303°C.', 575, 335, { color: '#cbd5e1', size: 11 });
        D.text(g, '• This 26-fold enriched alloy is cupelled to extract pure silver.', 575, 365, { color: '#22c55e', size: 11, weight: 700 });
      }
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 16. REACTION KINETICS & ORDER ANALYSIS (ZERO, 1ST, 2ND, HALF-LIFE)
  // ═════════════════════════════════════════════════════════════════
  S['chem-reaction-kinetics'] = {
    live: true,
    approx: 'Integrated rate laws: 0-order [A] = [A]0 - kt; 1st-order ln[A] = ln[A]0 - kt; 2nd-order 1/[A] = 1/[A]0 + kt. Arrhenius equation k = A·exp(-Ea/RT).',
    modes: [
      { key: 'first_order', label: '1st Order Kinetics (ln[A] vs t linear, e.g. Ester Hydrolysis)' },
      { key: 'second_order', label: '2nd Order Kinetics (1/[A] vs t linear, e.g. Saponification)' },
      { key: 'zero_order', label: 'Zero Order Kinetics ([A] vs t linear, Surface Catalyzed)' },
    ],
    params: [
      {
        key: 'initialConc',
        label: 'Initial Reactant Concentration [A]₀ (M)',
        type: 'range',
        default: 1.0,
        min: 0.1,
        max: 2.0,
        step: 0.1,
        unit: 'M',
        help: 'Initial molar concentration of reactant A.',
      },
      {
        key: 'rateConstant',
        label: 'Rate Constant k',
        type: 'range',
        default: 0.05,
        min: 0.01,
        max: 0.2,
        step: 0.01,
        help: 'Units: M/s (0-order), s⁻¹ (1st-order), M⁻¹·s⁻¹ (2nd-order).',
      },
      {
        key: 'timeElapsed',
        label: 'Reaction Time t (s)',
        type: 'range',
        default: 20,
        min: 0,
        max: 60,
        step: 1,
        unit: 's',
        help: 'Elapsed reaction time.',
      },
    ],
    examples: [
      { label: 'Standard First-Order Decay (k = 0.05 s⁻¹, t½ = 13.86 s)', values: { mode: 'first_order', initialConc: 1.0, rateConstant: 0.05, timeElapsed: 20 } },
      { label: 'Second-Order Saponification (1/[A] linear)', values: { mode: 'second_order', initialConc: 1.0, rateConstant: 0.04, timeElapsed: 25 } },
      { label: 'Zero-Order Surface Reaction (Linear [A] decrease)', values: { mode: 'zero_order', initialConc: 1.5, rateConstant: 0.03, timeElapsed: 20 } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      return [
        { title: '1. Rate Law & Order Formulation', text: 'Rate r = −d[A]/dt = k [A]^n. The order n governs how concentration influences reaction rate and half-life dependency on [A]₀.' },
        { title: '2. Diagnostic Linear Integrated Rate Plot', text: 'Plotting [A] vs t gives a straight line for zero order; ln[A] vs t for first order; 1/[A] vs t for second order. The slope directly yields the rate constant k.' },
        { title: '3. Half-Life Relationship (t½)', text: 'First-order half-life t½ = 0.693/k is completely independent of initial concentration. Zero-order t½ = [A]₀/2k decreases with dilution; second-order t½ = 1/(k[A]₀) increases with dilution.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'first_order';
      const a0 = Number(p.initialConc != null ? p.initialConc : 1.0);
      const k = Number(p.rateConstant != null ? p.rateConstant : 0.05);
      const t = Number(p.timeElapsed != null ? p.timeElapsed : 20);

      let at = 0;
      let tHalf = 0;
      let kUnit = '';
      let rateLawStr = '';
      let linearPlotStr = '';

      if (mode === 'zero_order') {
        at = Math.max(0, a0 - k * t);
        tHalf = a0 / (2 * k);
        kUnit = 'M·s⁻¹';
        rateLawStr = 'Rate = k (Zero Order)';
        linearPlotStr = '[A] vs t (Slope = −k)';
      } else if (mode === 'first_order') {
        at = a0 * Math.exp(-k * t);
        tHalf = 0.69315 / k;
        kUnit = 's⁻¹';
        rateLawStr = 'Rate = k [A] (First Order)';
        linearPlotStr = 'ln[A] vs t (Slope = −k)';
      } else {
        at = a0 / (1 + a0 * k * t);
        tHalf = 1 / (k * a0);
        kUnit = 'M⁻¹·s⁻¹';
        rateLawStr = 'Rate = k [A]² (Second Order)';
        linearPlotStr = '1/[A] vs t (Slope = +k)';
      }

      const convPct = Math.round(((a0 - at) / a0) * 100);

      return {
        formulas: [
          { name: 'Integrated Rate Law', formula: mode === 'zero_order' ? '[A]t = [A]₀ − kt' : mode === 'first_order' ? 'ln[A]t = ln[A]₀ − kt' : '1/[A]t = 1/[A]₀ + kt', given: `[A]₀ = ${a0} M, k = ${k} ${kUnit}, t = ${t} s`, calc: `Current concentration [A] at t = ${t} s`, result: `${at.toFixed(4)}`, unit: 'M' },
          { name: 'Reaction Half-Life', formula: mode === 'zero_order' ? 't½ = [A]₀ / 2k' : mode === 'first_order' ? 't½ = ln(2) / k = 0.693 / k' : 't½ = 1 / (k [A]₀)', given: `k = ${k} ${kUnit}`, calc: `Time for 50% consumption`, result: `${tHalf.toFixed(2)}`, unit: 's' },
          { name: 'Diagnostic Linearity', formula: linearPlotStr, given: 'Slope analysis', calc: `Slope magnitude = ${k}`, result: 'Linear', unit: 'plot' },
        ],
        readouts: [
          { label: 'Kinetic Order', value: mode.replace('_', ' ').toUpperCase(), tone: 'hi' },
          { label: 'Current [A]', value: `${at.toFixed(4)} M`, tone: 'good' },
          { label: 'Half-Life t½', value: `${tHalf.toFixed(2)} s`, tone: 'hi' },
          { label: 'Conversion', value: `${convPct} %`, tone: 'good' },
          { label: 'Rate Constant k', value: `${k} ${kUnit}`, tone: 'neutral' },
        ],
        state: {
          mode,
          a0,
          k,
          t,
          at: Math.round(at * 10000) / 10000,
          tHalf: Math.round(tHalf * 100) / 100,
          convPct,
          rateLawStr,
          linearPlotStr,
          kUnit,
        },
        explain: {
          what: `Reaction kinetics quantifies the rates of chemical transformations and unravels microscopic reaction mechanisms through reaction orders.`,
          why: `The order of reaction reflects the number of reactant molecules whose concentrations determine the rate-determining step.`,
          param: `First-order reactions have the unique property that their half-life t½ = 0.693/k is completely independent of initial concentration (crucial in radioactive decay and ester hydrolysis).`,
          effect: `Second-order half-life t½ = 1/(k[A]₀) is inversely proportional to initial concentration; diluting a second-order reaction quadruples the time required for complete conversion.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#090d16');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Initial reactant diffusion & Maxwell-Boltzmann collision frequency' : step === 1 ? 'High-energy collisions overcoming activation energy barrier (E ≥ Ea)' : 'Concentration decay curve & integrated rate law half-life (t½)');

      // Header Banner
      D.text(g, `REACTION KINETICS: ${st.rateLawStr.toUpperCase()}`, 30, 36, { color: '#38bdf8', size: 19, weight: 800 });
      D.text(g, `[A]₀ = ${st.a0} M  •  Current [A] = ${st.at.toFixed(3)} M  •  Conversion = ${st.convPct}%  •  Half-Life t½ = ${st.tHalf.toFixed(1)} s`, 30, 62, { color: '#94a3b8', size: 12.5, weight: 600 });

      // Left Panel: Live Molecular Collision Reactor Chamber (x: 24 to 510)
      D.rect(g, 24, 85, 486, 440, { fill: '#131b2e', stroke: '#1e293b', r: 12 });
      D.text(g, 'Maxwell-Boltzmann Collision Reactor Chamber', 40, 108, { color: '#f8fafc', size: 13.5, weight: 700 });

      // Reactor vessel bounding box
      const rx0 = 44;
      const ry0 = 130;
      const rw0 = 446;
      const rh0 = 310;
      D.rect(g, rx0, ry0, rw0, rh0, { fill: '#0a0f1d', stroke: '#334155', width: 2, r: 10 });

      // Deterministic particle simulation based on time t and conversion
      const numParticles = 24;
      const productFraction = clamp(st.convPct / 100, 0, 1);
      const numProducts = Math.round(numParticles * productFraction);

      // Render 24 bouncing particles with collision flashes
      for (let i = 0; i < numParticles; i++) {
        // Pseudo-random initial phase based on index
        const seed = i * 137.5;
        const speedX = 35 + (i % 5) * 12;
        const speedY = 28 + ((i + 2) % 4) * 14;
        const phaseX = (seed % (rw0 - 24));
        const phaseY = ((seed * 1.6) % (rh0 - 24));

        // Ping-pong bounce within bounds
        const totalX = (t * speedX + phaseX);
        const cycleX = (rw0 - 28) * 2;
        const modX = totalX % cycleX;
        const px = rx0 + 14 + (modX < (rw0 - 28) ? modX : cycleX - modX);

        const totalY = (t * speedY + phaseY);
        const cycleY = (rh0 - 28) * 2;
        const modY = totalY % cycleY;
        const py = ry0 + 14 + (modY < (rh0 - 28) ? modY : cycleY - modY);

        const isProduct = i < numProducts;

        if (isProduct) {
          // Product Molecule (Ruby / Violet with halo)
          D.circle(g, px, py, 6.5, { fill: '#f43f5e', stroke: '#fda4af', width: 1.5 });
          D.circle(g, px, py, 11, { fill: 'rgba(244, 63, 94, 0.2)' });
        } else {
          // Reactant Molecule A (Cyan) or B (Emerald)
          const isA = (i % 2 === 0);
          const col = isA ? '#38bdf8' : '#34d399';
          const strokeCol = isA ? '#bae6fd' : '#a7f3d0';
          D.circle(g, px, py, 5.5, { fill: col, stroke: strokeCol, width: 1.2 });
        }

        // Active collision flashes near center
        if (i % 4 === 0) {
          const flashPhase = (t * 2.5 + i * 0.4) % 1;
          if (flashPhase < 0.2) {
            const fAlpha = (1 - flashPhase / 0.2) * 0.8;
            D.circle(g, px, py, 18, { fill: 'rgba(250, 204, 21, ' + fAlpha + ')' });
            D.circle(g, px, py, 6, { fill: '#ffffff' });
          }
        }
      }

      // Reactor Status HUD
      D.rect(g, rx0 + 10, ry0 + rh0 - 45, rw0 - 20, 36, { fill: 'rgba(15, 23, 42, 0.85)', stroke: '#334155', r: 8 });
      D.circle(g, rx0 + 26, ry0 + rh0 - 27, 4.5, { fill: '#38bdf8' });
      D.text(g, `Reactants [A]: ${(numParticles - numProducts)} (${st.at.toFixed(2)} M)`, rx0 + 36, ry0 + rh0 - 32, { color: '#38bdf8', size: 10.5, weight: 700 });
      D.circle(g, rx0 + 240, ry0 + rh0 - 27, 4.5, { fill: '#f43f5e' });
      D.text(g, `Products [P]: ${numProducts} (${st.convPct}% Yield)`, rx0 + 250, ry0 + rh0 - 32, { color: '#f43f5e', size: 10.5, weight: 700 });

      // Collision Theory Tag
      D.tag(g, 'Collision Rate: Z_AB ∝ [A][B] • Fraction with E ≥ Ea = exp(−Ea/RT)', 267, 488, { bg: '#090d16', border: '#38bdf8', color: '#38bdf8', size: 11, align: 'center' });

      // Right Panel: Integrated Concentration Profile & Order Verification (x: 520 to 975)
      D.rect(g, 520, 85, 455, 440, { fill: '#131b2e', stroke: '#1e293b', r: 12 });
      D.text(g, 'Integrated Kinetic Profile & Half-Life Decay', 540, 108, { color: '#f8fafc', size: 13.5, weight: 700 });

      const gx = 575;
      const gy = 440;
      const gw = 370;
      const gh = 230;

      D.line(g, gx, gy, gx + gw, gy, { color: '#475569', width: 1.5 });
      D.line(g, gx, gy, gx, gy - gh, { color: '#475569', width: 1.5 });
      D.text(g, 'Reaction Time t (s) →', gx + gw - 80, gy + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
      D.text(g, 'Concentration [A] (M)', gx - 10, gy - gh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

      // Plot curve
      const decayPts = [];
      const numPts = 60;
      const tMax = 60;

      for (let i = 0; i <= numPts; i++) {
        const u = i / numPts;
        const curT = u * tMax;
        let cVal = 0;
        if (st.mode === 'zero_order') cVal = Math.max(0, st.a0 - st.k * curT);
        else if (st.mode === 'first_order') cVal = st.a0 * Math.exp(-st.k * curT);
        else cVal = st.a0 / (1 + st.a0 * st.k * curT);

        const px = gx + u * gw;
        const py = gy - (cVal / (st.a0 * 1.15)) * gh;
        decayPts.push([px, clamp(py, gy - gh, gy)]);
      }

      D.poly(g, decayPts, { stroke: '#38bdf8', width: 3, fill: false });

      // Half-Life t1/2 vertical dashed line and marker
      if (st.tHalf < tMax) {
        const hx = gx + (st.tHalf / tMax) * gw;
        const hy = gy - ((st.a0 * 0.5) / (st.a0 * 1.15)) * gh;
        D.line(g, hx, gy, hx, hy, { color: '#10b981', width: 1.5, dash: [4, 4] });
        D.circle(g, hx, hy, 4, { fill: '#10b981' });
        D.text(g, 't½ (50%)', hx, gy + 14, { color: '#10b981', size: 10, weight: 700, align: 'center' });
      }

      // Live position point with sweep oscilloscope pulse
      const curX = gx + (st.t / tMax) * gw;
      const curY = gy - (st.at / (st.a0 * 1.15)) * gh;
      D.line(g, curX, gy, curX, curY, { color: '#facc15', width: 1.5, dash: [3, 3] });
      const cRing = 6 + Math.sin(t * 5) * 2;
      D.circle(g, curX, curY, cRing, { fill: 'rgba(250, 204, 21, 0.3)' });
      D.circle(g, curX, curY, 6, { fill: '#facc15', stroke: '#ffffff', width: 2 });
      D.text(g, `t = ${st.t} s  •  [A] = ${st.at.toFixed(3)} M`, curX, curY - 14, { color: '#facc15', size: 10.5, weight: 800, align: 'center' });

      // Linear diagnostic confirmation bar
      D.rect(g, 540, gy + 32, 415, 42, { fill: '#0a0f1d', stroke: '#334155', r: 8 });
      D.text(g, `Linear Diagnostics: ${st.linearPlotStr}  •  k = ${st.k} ${st.kUnit}`, 555, gy + 53, { color: '#38bdf8', size: 11, weight: 700 });
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // 17. MICHAELIS-MENTEN ENZYME KINETICS & LINEWEAVER-BURK PLOT
  // ═════════════════════════════════════════════════════════════════
  S['chem-michaelis-menten'] = {
    live: true,
    approx: 'Michaelis-Menten steady-state model v0 = (Vmax · [S]) / (Km + [S]). Lineweaver-Burk double reciprocal 1/v0 = (Km/Vmax)(1/[S]) + 1/Vmax. Inhibition models: competitive (Km increases), non-competitive (Vmax decreases).',
    modes: [
      { key: 'uninhibited', label: 'Uninhibited Enzyme Kinetics (Standard MM)' },
      { key: 'competitive', label: 'Competitive Inhibition (Km increases, Vmax constant)' },
      { key: 'noncompetitive', label: 'Non-Competitive Inhibition (Vmax decreases, Km constant)' },
    ],
    params: [
      {
        key: 'substrateConc',
        label: 'Substrate Concentration [S] (mM)',
        type: 'range',
        default: 5.0,
        min: 0.2,
        max: 30.0,
        step: 0.5,
        unit: 'mM',
        help: 'Substrate concentration relative to Michaelis constant Km.',
      },
      {
        key: 'vMax',
        label: 'Maximal Velocity Vmax (μM/min)',
        type: 'range',
        default: 100,
        min: 20,
        max: 200,
        step: 10,
        unit: 'μM/min',
        help: 'Theoretical maximum rate when enzyme active sites are 100% saturated.',
      },
      {
        key: 'km',
        label: 'Michaelis Constant Km (mM)',
        type: 'range',
        default: 4.0,
        min: 1.0,
        max: 15.0,
        step: 0.5,
        unit: 'mM',
        help: 'Substrate concentration at which reaction velocity is exactly half of Vmax.',
      },
      {
        key: 'inhibitorConc',
        label: 'Inhibitor Concentration [I] (mM)',
        type: 'range',
        default: 2.0,
        min: 0.0,
        max: 10.0,
        step: 0.5,
        unit: 'mM',
        showIf: (p) => p.mode !== 'uninhibited',
        help: 'Inhibitor concentration shifting Km or Vmax.',
      },
    ],
    examples: [
      { label: 'Standard MM Kinetics ([S] = 5 mM, Km = 4 mM, Vmax = 100)', values: { mode: 'uninhibited', substrateConc: 5.0, vMax: 100, km: 4.0 } },
      { label: 'Competitive Inhibition (Malonate on Succinate Dehydrogenase)', values: { mode: 'competitive', substrateConc: 5.0, vMax: 100, km: 4.0, inhibitorConc: 4.0 } },
      { label: 'Non-Competitive Heavy Metal Poisoning (Vmax depressed)', values: { mode: 'noncompetitive', substrateConc: 5.0, vMax: 100, km: 4.0, inhibitorConc: 4.0 } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      return [
        { title: '1. Enzyme-Substrate Complex (ES) Formation', text: 'Enzyme E binds substrate S reversibly to form the Michaelis ES complex (E + S ⇌ ES → E + P). At low [S] ≪ Km, rate is first order with v0 = (Vmax/Km)[S].' },
        { title: '2. Enzyme Saturation & Maximal Velocity (Vmax)', text: 'At high [S] ≫ Km, all enzyme active sites are saturated with substrate. Rate becomes zero order and reaches the asymptotic plateau Vmax = k_cat [E]total.' },
        { title: '3. Lineweaver-Burk Double Reciprocal Plot', text: 'Plotting 1/v0 vs 1/[S] yields a straight line with y-intercept = 1/Vmax and x-intercept = −1/Km. Competitive inhibitors increase slope while keeping y-intercept unchanged; non-competitive inhibitors elevate the y-intercept.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'uninhibited';
      const s = Math.max(0.1, Number(p.substrateConc != null ? p.substrateConc : 5.0));
      const baseVmax = Number(p.vMax != null ? p.vMax : 100);
      const baseKm = Number(p.km != null ? p.km : 4.0);
      const inh = Number(p.inhibitorConc != null ? p.inhibitorConc : 2.0);

      const ki = 2.0; // mM (inhibition constant)
      const alpha = 1 + inh / ki;

      let effKm = baseKm;
      let effVmax = baseVmax;

      if (mode === 'competitive') {
        effKm = baseKm * alpha;
        effVmax = baseVmax;
      } else if (mode === 'noncompetitive') {
        effKm = baseKm;
        effVmax = baseVmax / alpha;
      }

      const v0 = (effVmax * s) / (effKm + s);
      const satFrac = Math.round((v0 / effVmax) * 100);

      return {
        formulas: [
          { name: 'Michaelis-Menten Velocity', formula: 'v₀ = (V_max [S]) / (K_m + [S])', given: `[S] = ${s} mM, V_max = ${effVmax.toFixed(0)}, K_m = ${effKm.toFixed(1)} mM`, calc: `(${effVmax.toFixed(0)} × ${s}) / (${effKm.toFixed(1)} + ${s})`, result: `${v0.toFixed(1)}`, unit: 'μM/min' },
          { name: 'Lineweaver-Burk Equation', formula: '1 / v₀ = (K_m / V_max)(1 / [S]) + 1 / V_max', given: `Slope = K_m / V_max = ${(effKm / effVmax).toFixed(4)}`, calc: `y-intercept = 1 / V_max = ${(1 / effVmax).toFixed(4)}`, result: 'Linear', unit: 'reciprocal' },
          { name: 'Enzyme Active Site Saturation', formula: 'Fractional Saturation Y = [ES] / [E]total', given: `v₀ / V_max`, calc: `${v0.toFixed(1)} / ${effVmax.toFixed(0)}`, result: `${satFrac}% Saturated`, unit: 'saturation' },
        ],
        readouts: [
          { label: 'Initial Velocity v₀', value: `${v0.toFixed(1)} μM/min`, tone: 'hi' },
          { label: 'Effective Vmax', value: `${effVmax.toFixed(0)} μM/min`, tone: 'good' },
          { label: 'Effective Km', value: `${effKm.toFixed(1)} mM`, tone: 'neutral' },
          { label: 'Active Site Saturation', value: `${satFrac} %`, tone: 'good' },
          { label: 'Inhibition Type', value: mode.split('_')[0].toUpperCase(), tone: mode === 'uninhibited' ? 'neutral' : 'warn' },
        ],
        state: {
          mode,
          s,
          baseVmax,
          baseKm,
          effKm: Math.round(effKm * 10) / 10,
          effVmax: Math.round(effVmax * 10) / 10,
          v0: Math.round(v0 * 10) / 10,
          satFrac,
          inh,
        },
        explain: {
          what: `The Michaelis-Menten model describes the rate of enzyme-catalyzed reactions by relating reaction velocity v0 to substrate concentration [S].`,
          why: `Km is the substrate concentration at half-maximal velocity (v0 = Vmax/2); a smaller Km indicates higher enzyme-substrate binding affinity.`,
          param: `Competitive inhibitors structurally resemble the substrate and compete for the catalytic pocket, raising apparent Km without altering Vmax (overcome by excess substrate).`,
          effect: `Non-competitive inhibitors bind allosteric sites on the enzyme, deactivating catalytic turnover k_cat and lowering Vmax without affecting substrate binding affinity Km.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Free enzyme (E) & substrate (S) random thermal diffusion' : step === 1 ? 'Enzyme-substrate active site complex formation [ES]' : 'Catalytic turnover (kcat), product release (P) & enzyme regeneration');

      // Header Banner
      D.text(g, `MICHAELIS-MENTEN ENZYME KINETICS: ${st.mode.toUpperCase()}`, 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `[S] = ${st.s} mM · v₀ = ${st.v0} μM/min · Km = ${st.effKm} mM · Vmax = ${st.effVmax} μM/min · Saturation = ${st.satFrac}%`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: Hyperbolic Michaelis-Menten Curve v0 vs [S] (x: 24 to 530)
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Hyperbolic Saturation Curve v₀ vs [S]', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const gx = 80;
      const gy = 440;
      const gw = 410;
      const gh = 260;

      D.line(g, gx, gy, gx + gw, gy, { color: '#475569', width: 1.5 });
      D.line(g, gx, gy, gx, gy - gh, { color: '#475569', width: 1.5 });
      D.text(g, 'Substrate [S] (mM)', gx + gw - 40, gy + 20, { color: '#94a3b8', size: 11, weight: 600 });
      D.text(g, 'Velocity v₀ (μM/min)', gx - 10, gy - gh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

      // Asymptotic Vmax line
      const vmaxY = gy - (st.effVmax / 220) * gh;
      D.line(g, gx, vmaxY, gx + gw, vmaxY, { color: '#64748b', width: 1.5, dash: [4, 4] });
      D.text(g, `Vmax = ${st.effVmax} μM/min`, gx + gw - 80, vmaxY - 6, { color: '#64748b', size: 10 });

      // Half-Vmax line
      const halfVmaxY = gy - ((st.effVmax / 2) / 220) * gh;
      D.line(g, gx, halfVmaxY, gx + gw, halfVmaxY, { color: '#f59e0b', width: 1, dash: [3, 3] });
      D.text(g, 'Vmax / 2', gx + 15, halfVmaxY - 6, { color: '#f59e0b', size: 9.5 });

      // Hyperbolic MM Curve
      const mmPts = [];
      const numPts = 60;
      const sMax = 30;

      for (let i = 0; i <= numPts; i++) {
        const curS = (i / numPts) * sMax;
        const curV = (st.effVmax * curS) / (st.effKm + curS);
        const px = gx + (curS / sMax) * gw;
        const py = gy - (curV / 220) * gh;
        mmPts.push([px, py]);
      }

      D.poly(g, mmPts, { stroke: '#38bdf8', width: 3, fill: false });

      // Km marker on axis
      const kmX = gx + (st.effKm / sMax) * gw;
      if (kmX <= gx + gw) {
        D.line(g, kmX, gy, kmX, halfVmaxY, { color: '#facc15', width: 1.5, dash: [3, 3] });
        D.circle(g, kmX, halfVmaxY, 4, { fill: '#facc15' });
        D.text(g, `Km = ${st.effKm}`, kmX, gy + 15, { color: '#facc15', size: 10, weight: 700, align: 'center' });
      }

      // Live operating point
      const curX = gx + (st.s / sMax) * gw;
      const curY = gy - (st.v0 / 220) * gh;
      D.circle(g, curX, curY, 6, { fill: '#22c55e', stroke: '#ffffff', width: 2 });
      D.text(g, `${st.v0} μM/min`, curX, curY - 14, { color: '#22c55e', size: 11, weight: 800, align: 'center' });

      D.tag(g, `Current Velocity v₀ = ${st.v0} μM/min (${st.satFrac}% Saturated)`, 270, 490, { bg: '#0f172a', border: '#22c55e', color: '#22c55e', size: 12, align: 'center' });

      // Right Panel: Lineweaver-Burk Double Reciprocal Plot (x: 540 to 975)
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Lineweaver-Burk Double Reciprocal Plot (1/v₀ vs 1/[S])', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const rx = 650;
      const ry = 440;
      const rw = 280;
      const rh = 260;

      // Coordinate axes with negative x-axis for −1/Km intercept
      D.line(g, rx - 90, ry, rx + rw, ry, { color: '#475569', width: 1.5 });
      D.line(g, rx, ry, rx, ry - rh, { color: '#475569', width: 1.5 });
      D.text(g, '1/[S] (mM⁻¹)', rx + rw - 35, ry + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
      D.text(g, '1/v₀', rx - 10, ry - rh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

      // Straight line 1/v0 = (Km/Vmax)(1/[S]) + 1/Vmax
      // x-intercept at -1/Km; y-intercept at 1/Vmax
      const invKmX = rx - (1 / st.effKm) * 160;
      const invVmaxY = ry - (1 / st.effVmax) * 8000;
      const endX = rx + rw - 30;
      const endY = ry - ((st.effKm / st.effVmax) * 2.0 + 1 / st.effVmax) * 8000;

      D.line(g, clamp(invKmX, rx - 85, rx), ry, endX, clamp(endY, ry - rh + 20, ry), { color: '#a855f7', width: 3 });

      // y-intercept marker (1/Vmax)
      D.circle(g, rx, clamp(invVmaxY, ry - rh, ry), 5, { fill: '#38bdf8' });
      D.text(g, '1/Vmax', rx + 10, clamp(invVmaxY, ry - rh, ry), { color: '#38bdf8', size: 10, weight: 700 });

      // x-intercept marker (-1/Km)
      if (invKmX >= rx - 90) {
        D.circle(g, invKmX, ry, 5, { fill: '#facc15' });
        D.text(g, '−1/Km', invKmX, ry - 12, { color: '#facc15', size: 10, weight: 700, align: 'center' });
      }

      D.rect(g, 560, ry + 32, 395, 42, { fill: '#0f172a', stroke: '#334155', r: 8 });
      D.text(g, st.mode === 'competitive' ? 'Competitive: Slope increases, y-intercept (1/Vmax) unchanged' : st.mode === 'noncompetitive' ? 'Non-Competitive: y-intercept increases, x-intercept (−1/Km) unchanged' : 'Uninhibited baseline Lineweaver-Burk diagnostic linear plot', 575, ry + 53, { color: '#38bdf8', size: 10.5, weight: 700 });
    },
  };
})();
