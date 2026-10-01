'use strict';

/**
 * Engineering Chemistry — Unit III: Polymers and Coordination Chemistry
 * Interactive Simulation Engines for U25CY103
 *
 * Implements:
 *  9. chem-polymer-chain-growth: Polymer Chain Growth (Addition vs Condensation) & Mn, Mw, PDI
 *  10. chem-polymer-thermal-transitions: Tg / Tm Thermal Transition Curve & DSC Thermogram
 *  11. chem-molding-processes: Polymer Processing & Molding (Injection, Extrusion, Compression)
 *  12. chem-crystal-field-theory: Crystal Field Splitting (Octahedral/Tetrahedral, High/Low Spin, Color & Magnetism)
 */
(function () {
  const S = (window.ChemSims = window.ChemSims || {});
  const D = window.EPDraw;
  const { C, fmt, clamp, lerp, rad } = D;

  // ─── Step-by-Step HUD & Animation Helper ───
  function drawStepHUD(g, S, customNote) {
    const step = S.step || 0;
    const steps = S.steps || [];
    const cur = steps[step] || { title: 'Step ' + (step + 1), text: '' };
    const total = steps.length || 1;
    const t = S.t || 0;

    g.save();
    const hudW = 440;
    const hudH = 68;
    const hudX = 1000 - hudW - 24;
    const hudY = 18;

    g.fillStyle = 'rgba(15, 23, 42, 0.88)';
    g.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    g.lineWidth = 1.5;
    g.beginPath();
    if (g.roundRect) g.roundRect(hudX, hudY, hudW, hudH, 10);
    else g.rect(hudX, hudY, hudW, hudH);
    g.fill();
    g.stroke();

    const glow = 0.5 + 0.5 * Math.sin(t * 3.5);
    g.fillStyle = '#38bdf8';
    g.font = 'bold 11px system-ui, sans-serif';
    g.fillText('STEP ' + (step + 1) + ' OF ' + total, hudX + 16, hudY + 22);

    for (let i = 0; i < total; i++) {
      const dx = hudX + 115 + i * 16;
      const dy = hudY + 18;
      g.beginPath();
      g.arc(dx, dy, i === step ? 5 : 3.5, 0, Math.PI * 2);
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

    g.fillStyle = '#f8fafc';
    g.font = 'bold 13px system-ui, sans-serif';
    const cleanTitle = (cur.title || '').replace(/^\d+\.\s*/, '');
    g.fillText(cleanTitle.length > 44 ? cleanTitle.slice(0, 42) + '...' : cleanTitle, hudX + 16, hudY + 43);

    g.fillStyle = '#94a3b8';
    g.font = '11px system-ui, sans-serif';
    const sub = customNote || cur.text || '';
    g.fillText(sub.length > 60 ? sub.slice(0, 58) + '...' : sub, hudX + 16, hudY + 59);

    g.restore();
  }


  // ═════════════════════════════════════════════════════════════════
  // 9. POLYMER CHAIN GROWTH (ADDITION VS CONDENSATION) & Mn, Mw, PDI
  // ═════════════════════════════════════════════════════════════════
  S['chem-polymer-chain-growth'] = {
    live: true,
    approx: 'Step-growth follows the Carothers equation Xn = 1/(1-p) with Flory-Schulz most probable distribution. Chain-growth modeled via steady-state radical kinetics.',
    modes: [
      { key: 'step_growth', label: 'Step-Growth (Condensation: Nylon 6,6 / PET)' },
      { key: 'chain_growth', label: 'Chain-Growth (Addition: Polyethylene / Polystyrene)' },
    ],
    params: [
      {
        key: 'conversion',
        label: 'Fractional Conversion p (%)',
        type: 'range',
        default: 95,
        min: 10,
        max: 99.5,
        step: 0.5,
        unit: '%',
        help: 'For step-growth, high molecular weight requires extreme stoichiometric conversion (p > 98%).',
      },
      {
        key: 'monomerMass',
        label: 'Monomer Repeat Unit Mass (g/mol)',
        type: 'select',
        default: '113',
        options: [
          { value: '28', label: 'Ethylene (C₂H₄, M₀ = 28 g/mol)' },
          { value: '104', label: 'Styrene (C₈H₈, M₀ = 104 g/mol)' },
          { value: '113', label: 'Nylon 6,6 Average Unit (M₀ = 113 g/mol)' },
          { value: '192', label: 'PET Polyester Unit (M₀ = 192 g/mol)' },
        ],
        help: 'Molar mass of the fundamental repeating structural unit M₀.',
      },
      {
        key: 'initiatorEff',
        label: 'Initiator / Stoichiometric Ratio r',
        type: 'range',
        default: 1.0,
        min: 0.85,
        max: 1.0,
        step: 0.01,
        help: 'In condensation, stoichiometric imbalance r = [A]/[B] < 1 limits maximum chain length according to modified Carothers equation.',
      },
    ],
    examples: [
      { label: 'Nylon-6,6 High Conversion (p = 99.0%, r = 1.0)', values: { mode: 'step_growth', conversion: 99.0, monomerMass: '113', initiatorEff: 1.0 } },
      { label: 'Step-Growth Low Conversion (p = 80.0%, Low Mw)', values: { mode: 'step_growth', conversion: 80.0, monomerMass: '113', initiatorEff: 1.0 } },
      { label: 'Polyethylene Chain-Growth Free Radical', values: { mode: 'chain_growth', conversion: 90.0, monomerMass: '28', initiatorEff: 0.98 } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      if (p.mode === 'step_growth') {
        return [
          { title: '1. Monomer Dimerization & Oligomerization', text: 'Bifunctional monomers (e.g. adipic acid + hexamethylenediamine) react stepwise anywhere in the batch. At low conversion (p < 80%), predominantly dimers and trimers exist with high byproduct (H₂O) evolution.' },
          { title: '2. High-Conversion Chain Coupling', text: 'Carothers equation Xn = 1/(1−p) dictates that long polymer chains form only at the very end of the reaction (p > 98%). Even 90% conversion gives an average degree of polymerization of only 10.' },
          { title: '3. Flory-Schulz Distribution & PDI → 2.0', text: 'Equally reactive functional groups yield the most probable distribution with Weight-average Mw = M0·(1+p)/(1−p), resulting in a Polydispersity Index PDI = Mw/Mn approaching exactly 2.0 at p → 1.' },
        ];
      }
      return [
        { title: '1. Radical Initiation', text: 'Thermal initiator (e.g. BPO, AIBN) homolytically cleaves into primary radicals (R•), which rapidly add to monomer π-bonds to form active chain-carrying radicals.' },
        { title: '2. Rapid Propagation', text: 'Active radical centers propagate by sequentially adding hundreds of monomer units in milliseconds (kinetics: Rp = kp[M][M•]), producing instantaneous high-MW polymer even at low conversion.' },
        { title: '3. Termination by Combination vs Disproportionation', text: 'Two propagating chains terminate by coupling (combination, PDI ~ 1.5) or hydrogen transfer (disproportionation, PDI ~ 2.0). Living polymerizations achieve monodisperse PDI < 1.1.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'step_growth';
      const convPct = Number(p.conversion != null ? p.conversion : 95);
      const fracP = clamp(convPct / 100, 0.05, 0.998);
      const m0 = Number(p.monomerMass || 113);
      const r = clamp(Number(p.initiatorEff != null ? p.initiatorEff : 1.0), 0.5, 1.0);

      let Xn = 0;
      let Xw = 0;
      let pdi = 0;

      if (mode === 'step_growth') {
        if (r < 0.999) {
          Xn = (1 + r) / (1 + r - 2 * r * fracP);
        } else {
          Xn = 1 / (1 - fracP);
        }
        Xw = (1 + fracP) / (1 - fracP);
        pdi = Xw / Xn;
      } else {
        const dpInit = 350;
        Xn = dpInit * (0.8 + 0.4 * fracP);
        pdi = 1.65 + 0.35 * (1 - fracP);
        Xw = Xn * pdi;
      }

      const Mn = Math.round(Xn * m0);
      const Mw = Math.round(Xw * m0);
      pdi = Math.round(pdi * 100) / 100;

      return {
        formulas: [
          { name: 'Carothers Degree of Polymerization', formula: 'X̄n = 1 / (1 − p)', given: `Conversion p = ${(fracP * 100).toFixed(1)}%`, calc: `1 / (1 − ${fracP.toFixed(3)})`, result: `${Math.round(Xn)}`, unit: 'repeat units' },
          { name: 'Number-Average Molar Mass', formula: 'M̄n = X̄n × M₀', given: `M₀ = ${m0} g/mol`, calc: `${Math.round(Xn)} × ${m0}`, result: `${Mn.toLocaleString()}`, unit: 'g/mol' },
          { name: 'Weight-Average Molar Mass', formula: 'M̄w = X̄w × M₀', given: `PDI = M̄w / M̄n`, calc: `${Mn.toLocaleString()} × ${pdi.toFixed(2)}`, result: `${Mw.toLocaleString()}`, unit: 'g/mol' },
          { name: 'Polydispersity Index', formula: 'PDI = M̄w / M̄n ≥ 1.0', given: `Step-growth limit: 1 + p → 2.0`, calc: `${Mw} / ${Mn}`, result: `${pdi.toFixed(2)}`, unit: 'dimensionless' },
        ],
        readouts: [
          { label: 'Polymerization', value: mode === 'step_growth' ? 'Step (Condensation)' : 'Chain (Addition)', tone: 'hi' },
          { label: 'Conversion p', value: `${(fracP * 100).toFixed(1)} %`, tone: fracP > 0.95 ? 'good' : 'warn' },
          { label: 'Degree DP (X̄n)', value: String(Math.round(Xn)), tone: 'good' },
          { label: 'M̄n', value: `${Mn.toLocaleString()} g/mol`, tone: 'hi' },
          { label: 'M̄w', value: `${Mw.toLocaleString()} g/mol`, tone: 'good' },
          { label: 'PDI (M̄w/M̄n)', value: pdi.toFixed(2), tone: pdi <= 2.0 ? 'good' : 'neutral' },
        ],
        state: {
          mode,
          fracP,
          m0,
          r,
          Xn: Math.round(Xn),
          Xw: Math.round(Xw),
          Mn,
          Mw,
          pdi,
        },
        explain: {
          what: `Step-growth (condensation) occurs between functional groups with loss of small molecules (H₂O, HCl), whereas chain-growth (addition) propagates rapidly via active free radical or ionic centers without byproducts.`,
          why: `In step-growth, high molecular weight demands virtually complete conversion (p > 99%) because monomers, oligomers, and polymers all react with equal probability. In chain-growth, high-MW chains form immediately upon initiation.`,
          param: `The Polydispersity Index PDI = Mw/Mn measures molecular weight heterogeneity. Step-growth yields the Flory-Schulz most probable distribution where PDI = 1 + p ≈ 2.0 at high conversion.`,
          effect: `Stoichiometric imbalance (r ≠ 1) severely truncates condensation chain growth because chains become capped with identical non-reactive functional groups on both ends.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Initiator thermal decomposition into active radicals (R·)' : step === 1 ? 'Continuous chain propagation & monomer addition' : 'Chain termination & molecular weight distribution (Mn, Mw, PDI)');

      // Header Banner
      D.text(g, st.mode === 'step_growth' ? 'STEP-GROWTH (CONDENSATION) POLYMERIZATION & KINETICS' : 'CHAIN-GROWTH (FREE RADICAL ADDITION) POLYMERIZATION', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `Conversion p = ${(st.fracP * 100).toFixed(1)}% · DP = ${st.Xn} · M̄n = ${st.Mn.toLocaleString()} g/mol · M̄w = ${st.Mw.toLocaleString()} g/mol · PDI = ${st.pdi}`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: Microscopic Chain Visualization (x: 24 to 530)
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, st.mode === 'step_growth' ? 'Batch Monomer & Oligomer Distribution' : 'Propagating Polymer Chains & Free Radicals', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const cx = 270;
      const cy = 290;

      if (st.mode === 'step_growth') {
        const numBeads = Math.min(st.Xn, 38);
        D.text(g, `Representative Macromolecule (${st.Xn} repeat units):`, 40, 145, { color: '#cbd5e1', size: 12, weight: 600 });

        let bx = 50;
        let by = 180;
        let dir = 1;
        for (let i = 0; i < numBeads; i++) {
          const col = i % 2 === 0 ? '#38bdf8' : '#a855f7';
          D.circle(g, bx, by, 7, { fill: col });
          if (i < numBeads - 1) {
            D.line(g, bx, by, bx + dir * 22, by, { color: '#64748b', width: 2 });
          }
          bx += dir * 22;
          if (bx > 470 || bx < 50) {
            dir *= -1;
            D.line(g, bx - dir * 22, by, bx - dir * 22, by + 26, { color: '#64748b', width: 2 });
            by += 26;
            bx += dir * 22;
          }
        }

        // Display condensation byproduct droplets (H2O)
        D.text(g, 'Condensation Condensate: Byproduct Molecules (H₂O):', 40, by + 45, { color: '#94a3b8', size: 11 });
        for (let w = 0; w < 12; w++) {
          const wx = 55 + (w % 6) * 70;
          const wy = by + 65 + Math.floor(w / 6) * 25;
          D.circle(g, wx, wy, 5, { fill: '#0284c7' });
          D.text(g, 'H₂O', wx + 10, wy + 3, { color: '#38bdf8', size: 9, weight: 700 });
        }

        D.tag(g, `Carothers Law: X̄n = 1 / (1 − ${st.fracP.toFixed(3)}) = ${st.Xn}`, cx, 490, { bg: '#0f172a', border: '#38bdf8', color: '#38bdf8', size: 12, align: 'center' });
      } else {
        // Chain growth animation
        D.text(g, 'Active Propagation Trajectory (Radical Center R•):', 40, 145, { color: '#cbd5e1', size: 12, weight: 600 });

        // Coiled polymer chain with active radical head
        const chainPts = [];
        const nPts = 45;
        for (let i = 0; i < nPts; i++) {
          const u = i / nPts;
          const px = 70 + u * 360 + Math.sin(u * 14) * 35;
          const py = 280 + Math.cos(u * 10) * 55;
          chainPts.push([px, py]);
        }
        D.poly(g, chainPts, { stroke: '#38bdf8', width: 4, fill: false });

        // Active radical terminal
        const lastPt = chainPts[chainPts.length - 1];
        D.circle(g, lastPt[0], lastPt[1], 10, { fill: '#ef4444' });
        D.text(g, '•', lastPt[0], lastPt[1] + 2, { color: '#ffffff', size: 18, weight: 900, align: 'center' });
        D.text(g, 'Active Radical Terminal', lastPt[0] - 20, lastPt[1] - 18, { color: '#ef4444', size: 11, weight: 700 });

        // Monomer pool (ethylene molecules)
        for (let m = 0; m < 8; m++) {
          const mx = 90 + (m % 4) * 100;
          const my = 400 + Math.floor(m / 4) * 35;
          D.atom(g, mx, my, 12, '#334155', { label: 'M' });
        }
        D.text(g, 'Unreacted Monomers (CH₂=CH₂)', 40, 380, { color: '#94a3b8', size: 11 });

        D.tag(g, `Kinetic Chain Length ν = kp[M] / (2(fkd kt [I])^0.5)`, cx, 490, { bg: '#0f172a', border: '#ef4444', color: '#f87171', size: 12, align: 'center' });
      }

      // Right Panel: Molar Mass Distribution Curve W(M) (x: 540 to 975)
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Flory-Schulz Molecular Weight Distribution W(M)', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });
      D.tag(g, `PDI = ${st.pdi}`, 905, 110, { bg: '#0f172a', border: '#facc15', color: '#facc15', size: 11, align: 'center' });

      const gx = 595;
      const gy = 440;
      const gw = 340;
      const gh = 230;

      // Coordinate axes
      D.line(g, gx, gy, gx + gw, gy, { color: '#475569', width: 1.5 });
      D.line(g, gx, gy, gx, gy - gh, { color: '#475569', width: 1.5 });
      D.text(g, 'Molar Mass M (g/mol)', gx + gw - 40, gy + 20, { color: '#94a3b8', size: 11, weight: 600 });
      D.text(g, 'Weight Fraction W(M)', gx - 10, gy - gh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

      // Distribution Curve
      const distPts = [];
      const numPts = 60;
      const maxM = st.Mw * 2.8;

      for (let i = 0; i <= numPts; i++) {
        const u = i / numPts;
        const mVal = u * maxM;
        const norm = mVal / Math.max(100, st.Mn);
        const wFrac = norm * Math.exp(-norm);
        const px = gx + u * gw;
        const py = gy - (wFrac / 0.38) * (gh - 30);
        distPts.push([px, py]);
      }

      D.poly(g, distPts, { stroke: '#a855f7', width: 3, fill: false });

      // Marker for Mn
      const mnX = gx + (st.Mn / maxM) * gw;
      if (mnX < gx + gw) {
        D.line(g, mnX, gy, mnX, gy - gh + 40, { color: '#38bdf8', width: 2, dash: [3, 3] });
        D.circle(g, mnX, gy - gh + 40, 4, { fill: '#38bdf8' });
        D.text(g, `M̄n = ${st.Mn.toLocaleString()}`, mnX, gy - gh + 25, { color: '#38bdf8', size: 10, weight: 700, align: 'center' });
      }

      // Marker for Mw
      const mwX = gx + (st.Mw / maxM) * gw;
      if (mwX < gx + gw) {
        D.line(g, mwX, gy, mwX, gy - gh + 70, { color: '#facc15', width: 2, dash: [3, 3] });
        D.circle(g, mwX, gy - gh + 70, 4, { fill: '#facc15' });
        D.text(g, `M̄w = ${st.Mw.toLocaleString()}`, mwX, gy - gh + 55, { color: '#facc15', size: 10, weight: 700, align: 'center' });
      }

      // Bottom theory note
      D.rect(g, 560, gy + 32, 395, 42, { fill: '#0f172a', stroke: '#334155', r: 8 });
      D.text(g, `M̄w is always greater than M̄n (PDI = M̄w/M̄n = ${st.pdi})`, 575, gy + 53, { color: '#38bdf8', size: 11, weight: 700 });
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 10. Tg / Tm THERMAL TRANSITION CURVE & DSC THERMOGRAM
  // ═════════════════════════════════════════════════════════════════
  S['chem-polymer-thermal-transitions'] = {
    live: true,
    approx: 'Heat capacity jump ΔCp at Tg modeled as 2nd-order thermodynamic transition; melting peak at Tm modeled via Gaussian latent heat ΔHm = Tm·ΔSm. Fox equation applies to plasticizer blends.',
    modes: [
      { key: 'amorphous', label: 'Amorphous Polymer (Atactic Polystyrene / PMMA)' },
      { key: 'semicrystalline', label: 'Semi-Crystalline Polymer (HDPE / Nylon 6,6)' },
    ],
    params: [
      {
        key: 'polymerType',
        label: 'Polymer System',
        type: 'select',
        default: 'nylon66',
        options: [
          { value: 'pe', label: 'Polyethylene (LDPE/HDPE: Tg = −120°C, Tm = 135°C)' },
          { value: 'ps', label: 'Atactic Polystyrene (PS: Tg = 100°C, Amorphous)' },
          { value: 'nylon66', label: 'Nylon 6,6 (Polyamide: Tg = 50°C, Tm = 265°C)' },
          { value: 'pet', label: 'PET Polyester (Tg = 75°C, Tm = 255°C)' },
        ],
        help: 'Chemical structure dictates chain stiffness, intermolecular H-bonding, and crystallizability.',
      },
      {
        key: 'plasticizerPct',
        label: 'Plasticizer Content (wt %)',
        type: 'range',
        default: 0,
        min: 0,
        max: 30,
        step: 2,
        unit: '%',
        help: 'Small-molecule plasticizers increase free volume, depressing Tg according to the Fox equation.',
      },
      {
        key: 'crystallinity',
        label: 'Degree of Crystallinity χc (%)',
        type: 'range',
        default: 50,
        min: 0,
        max: 85,
        step: 5,
        unit: '%',
        showIf: (p) => p.mode !== 'amorphous',
        help: 'Fraction of ordered crystalline lamellae spherulites governing melting enthalpy ΔHm.',
      },
    ],
    examples: [
      { label: 'Nylon 6,6 Semi-Crystalline Fiber (Tg = 50°C, Tm = 265°C)', values: { mode: 'semicrystalline', polymerType: 'nylon66', plasticizerPct: 0, crystallinity: 50 } },
      { label: 'Rigid Polystyrene Glass (Tg = 100°C, 0% Plasticizer)', values: { mode: 'amorphous', polymerType: 'ps', plasticizerPct: 0, crystallinity: 0 } },
      { label: 'Plasticized Flexible PVC / Polymer Blend (15% Plasticizer)', values: { mode: 'amorphous', polymerType: 'ps', plasticizerPct: 15, crystallinity: 0 } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      return [
        { title: '1. Glassy State (T < Tg)', text: 'Chains are frozen into rigid disordered conformations with minimal free volume. Only localized atomic bond vibrations and short-range motions can occur. Material is hard, brittle, and glassy.' },
        { title: '2. Glass Transition (T = Tg: 2nd Order Transition)', text: 'Segmental crankshaft motions (coordinated movement of 20–50 backbone carbons) unlock as thermal energy exceeds barrier. Accompanied by a sharp baseline step jump in heat capacity (ΔCp) and thermal expansion (α).' },
        { title: '3. Rubbery Plateau to Crystalline Melting (T = Tm)', text: 'In semi-crystalline polymers, ordered crystalline lamellae melt endothermically at Tm (1st-order thermodynamic transition with latent heat ΔHm). Above Tm, polymer behaves as an isotropic viscoelastic melt.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'semicrystalline';
      const poly = p.polymerType || 'nylon66';
      const wPlast = Number(p.plasticizerPct != null ? p.plasticizerPct : 0) / 100;
      const chiC = mode === 'amorphous' ? 0 : Number(p.crystallinity != null ? p.crystallinity : 50);

      const polyData = {
        pe: { name: 'Polyethylene (PE)', baseTg: -120, baseTm: 135, deltaH0: 293 },
        ps: { name: 'Atactic Polystyrene (PS)', baseTg: 100, baseTm: 0, deltaH0: 0 },
        nylon66: { name: 'Nylon 6,6 (Polyamide)', baseTg: 50, baseTm: 265, deltaH0: 196 },
        pet: { name: 'Polyethylene Terephthalate (PET)', baseTg: 75, baseTm: 255, deltaH0: 140 },
      }[poly] || { name: 'Polymer', baseTg: 50, baseTm: 260, deltaH0: 180 };

      // Fox equation for plasticizer depression of Tg: 1/Tg = (1 - w)/Tg1 + w/Tg_plast (Tg_plast ~ -70°C = 203 K)
      const tg1K = polyData.baseTg + 273.15;
      const tgPlastK = 203.15;
      const invTg = (1 - wPlast) / tg1K + wPlast / tgPlastK;
      const effectiveTg = Math.round(1 / invTg - 273.15);

      const effectiveTm = polyData.baseTm;
      const deltaHm = Math.round((chiC / 100) * polyData.deltaH0);

      return {
        formulas: [
          { name: 'Fox Equation for Plasticization', formula: '1 / Tg = (1 − w) / Tg,poly + w / Tg,plast', given: `Plasticizer = ${(wPlast * 100).toFixed(0)} wt%`, calc: `Tg depressed from ${polyData.baseTg}°C to ${effectiveTg}°C`, result: `${effectiveTg}`, unit: '°C' },
          { name: 'Enthalpy of Fusion', formula: 'ΔHm = χc × ΔH°m', given: `Crystallinity χc = ${chiC}%`, calc: `(${chiC} / 100) × ${polyData.deltaH0} J/g`, result: `${deltaHm}`, unit: 'J/g' },
          { name: 'Thermodynamic Transition Order', formula: 'Tg: 2nd Order (ΔCp jump) | Tm: 1st Order (Latent ΔHm)', given: `System: ${polyData.name}`, calc: 'DSC thermogram step baseline vs endothermic peak', result: 'Step + Peak', unit: 'transitions' },
        ],
        readouts: [
          { label: 'Polymer', value: polyData.name.split(' ')[0], tone: 'hi' },
          { label: 'Glass Transition Tg', value: `${effectiveTg} °C`, tone: 'hi' },
          { label: 'Melting Point Tm', value: effectiveTm > 0 ? `${effectiveTm} °C` : 'N/A (Amorphous)', tone: 'good' },
          { label: 'Crystallinity χc', value: `${chiC} %`, tone: 'neutral' },
          { label: 'Heat of Fusion ΔHm', value: `${deltaHm} J/g`, tone: 'good' },
        ],
        state: {
          mode,
          poly,
          wPlast,
          chiC,
          effectiveTg,
          effectiveTm,
          deltaHm,
          polyName: polyData.name,
        },
        explain: {
          what: `The glass transition temperature (Tg) marks the reversible onset of long-range segmental mobility in amorphous polymer regions, whereas the melting temperature (Tm) is the first-order destruction of regular crystalline lattices.`,
          why: `Tg is governed by chain flexibility, pendant bulkiness, and cohesive energy density. Nylon 6,6 has high Tg (50°C) and Tm (265°C) due to intense interchain hydrogen bonding between amide groups.`,
          param: `Plasticizers intercalate between polymer chains, shielding polar groups and creating free volume, which dramatically lowers Tg according to the Fox equation.`,
          effect: `Below Tg, polymers are rigid glasses (suitable for engineering plastics like PS, PMMA); between Tg and Tm, they are tough leathery or rubbery elastomers; above Tm, they flow as moldable melts.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Glassy state (T < Tg): rigid chains with local vibrational motion only' : step === 1 ? 'Glass transition (Tg): sudden jump in heat capacity (ΔCp) & segmental crawl' : 'Rubbery plateau & melting (Tm): crystallites melt into viscous polymer fluid');

      // Header Banner
      D.text(g, 'POLYMER THERMAL TRANSITIONS: DSC THERMOGRAM & STATE DIAGRAM', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `${st.polyName} · Glass Transition Tg = ${st.effectiveTg}°C · Melting Point Tm = ${st.effectiveTm > 0 ? st.effectiveTm + '°C' : 'None (Amorphous)'} · Crystallinity = ${st.chiC}%`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: Molecular Mobility & State Diagram (x: 24 to 530)
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Three Regimes of Molecular Chain Mobility', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const bx = 45;
      const bW = 460;

      // 3 Horizontal Zones: Glassy (T < Tg), Rubbery (Tg < T < Tm), Melt (T > Tm)
      // Zone 1: Glassy
      D.rect(g, bx, 135, bW, 95, { fill: '#0f172a', stroke: '#38bdf8', r: 8 });
      D.text(g, `1. Glassy Solid (T < ${st.effectiveTg}°C)`, bx + 15, 155, { color: '#38bdf8', size: 12, weight: 800 });
      D.text(g, '• Chains frozen into rigid tangled glassy entanglement', bx + 15, 175, { color: '#cbd5e1', size: 11 });
      D.text(g, '• Only local atomic bond vibrations (no crankshaft rotation)', bx + 15, 193, { color: '#cbd5e1', size: 11 });
      D.text(g, '• High Young modulus E > 2 GPa · Hard, stiff, brittle', bx + 15, 211, { color: '#94a3b8', size: 10.5 });

      // Zone 2: Rubbery / Leathery
      D.rect(g, bx, 245, bW, 95, { fill: '#0f172a', stroke: '#f59e0b', r: 8 });
      D.text(g, `2. Rubbery / Semi-Crystalline (${st.effectiveTg}°C < T < ${st.effectiveTm > 0 ? st.effectiveTm + '°C' : 'Decomp'})`, bx + 15, 265, { color: '#f59e0b', size: 12, weight: 800 });
      D.text(g, '• Segmental mobility activated (crankshaft rotation of 20–50 bonds)', bx + 15, 285, { color: '#cbd5e1', size: 11 });
      D.text(g, '• Amorphous regions become flexible; crystalline lamellae remain intact', bx + 15, 303, { color: '#cbd5e1', size: 11 });
      D.text(g, '• Tough, ductile, flexible impact-resistant state', bx + 15, 321, { color: '#94a3b8', size: 10.5 });

      // Zone 3: Viscous Melt
      D.rect(g, bx, 355, bW, 95, { fill: '#0f172a', stroke: '#ef4444', r: 8 });
      D.text(g, `3. Viscous Fluid Melt (T > ${st.effectiveTm > 0 ? st.effectiveTm + '°C' : '150°C'})`, bx + 15, 375, { color: '#ef4444', size: 12, weight: 800 });
      D.text(g, '• Crystalline lattices completely melted (latent heat ΔHm absorbed)', bx + 15, 395, { color: '#cbd5e1', size: 11 });
      D.text(g, '• Entire chains undergo translation, slippage, and reptation', bx + 15, 413, { color: '#cbd5e1', size: 11 });
      D.text(g, '• Molten fluid ready for injection, extrusion, or compression molding', bx + 15, 431, { color: '#94a3b8', size: 10.5 });

      D.tag(g, `Plasticizer Effect: Depressed Tg by ${(st.wPlast * 100).toFixed(0)} wt%`, 270, 490, { bg: '#0f172a', border: '#f59e0b', color: '#facc15', size: 12, align: 'center' });

      // Right Panel: DSC Thermogram (Heat Flow dH/dt vs Temperature T) (x: 540 to 975)
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Differential Scanning Calorimetry (DSC) Scan', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });
      D.text(g, 'Exo ↑ / Endo ↓', 900, 110, { color: '#94a3b8', size: 11, align: 'right' });

      const gx = 595;
      const gy = 440;
      const gw = 340;
      const gh = 250;

      D.line(g, gx, gy, gx + gw, gy, { color: '#475569', width: 1.5 });
      D.line(g, gx, gy, gx, gy - gh, { color: '#475569', width: 1.5 });
      D.text(g, 'Temperature T (°C)', gx + gw - 40, gy + 20, { color: '#94a3b8', size: 11, weight: 600 });
      D.text(g, 'Heat Flow (Endo ↓)', gx - 10, gy - gh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

      // Temperature scale from −50°C to 300°C
      const tMin = -50;
      const tMax = 300;

      const dscPts = [];
      const numPts = 100;
      for (let i = 0; i <= numPts; i++) {
        const tVal = tMin + (i / numPts) * (tMax - tMin);
        let heatFlow = 0.2; // baseline

        // Glass transition: step baseline shift downward at Tg
        if (tVal > st.effectiveTg) {
          const transWidth = 15;
          const stepFrac = clamp((tVal - st.effectiveTg) / transWidth, 0, 1);
          heatFlow += stepFrac * 0.18;
        }

        // Melting peak: endothermic peak downward at Tm (if semi-crystalline)
        if (st.effectiveTm > 0 && st.chiC > 0) {
          const fwhm = 18;
          const peakH = 0.55 * (st.chiC / 100);
          heatFlow += peakH * Math.exp(-Math.pow(tVal - st.effectiveTm, 2) / (2 * Math.pow(fwhm / 2.355, 2)));
        }

        const px = gx + ((tVal - tMin) / (tMax - tMin)) * gw;
        const py = gy - gh + 50 + heatFlow * (gh - 70);
        dscPts.push([px, py]);
      }

      D.poly(g, dscPts, { stroke: '#38bdf8', width: 3, fill: false });

      // Tg Marker
      const tgX = gx + ((st.effectiveTg - tMin) / (tMax - tMin)) * gw;
      if (tgX >= gx && tgX <= gx + gw) {
        D.line(g, tgX, gy, tgX, gy - gh + 40, { color: '#38bdf8', width: 1.5, dash: [3, 3] });
        D.text(g, `Tg (${st.effectiveTg}°C)`, tgX, gy - gh + 25, { color: '#38bdf8', size: 10.5, weight: 800, align: 'center' });
      }

      // Tm Marker
      if (st.effectiveTm > 0) {
        const tmX = gx + ((st.effectiveTm - tMin) / (tMax - tMin)) * gw;
        if (tmX >= gx && tmX <= gx + gw) {
          D.line(g, tmX, gy, tmX, gy - gh + 40, { color: '#ef4444', width: 1.5, dash: [3, 3] });
          D.text(g, `Tm (${st.effectiveTm}°C)`, tmX, gy - gh + 25, { color: '#ef4444', size: 10.5, weight: 800, align: 'center' });
          D.text(g, `ΔHm = ${st.deltaHm} J/g`, tmX, gy - 20, { color: '#f87171', size: 10, weight: 700, align: 'center' });
        }
      }

      // Bottom theory card
      D.rect(g, 560, gy + 32, 395, 42, { fill: '#0f172a', stroke: '#334155', r: 8 });
      D.text(g, 'DSC signature: Tg produces a baseline step; Tm produces an endothermic peak.', 575, gy + 53, { color: '#38bdf8', size: 10.5, weight: 700 });
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 11. POLYMER PROCESSING & MOLDING (INJECTION, EXTRUSION, COMPRESSION)
  // ═════════════════════════════════════════════════════════════════
  // ═════════════════════════════════════════════════════════════════
  // 11. INJECTION, EXTRUSION & COMPRESSION MOLDING VIDEO SIMULATOR
  // ═════════════════════════════════════════════════════════════════
  S['chem-molding-processes'] = {
    live: true,
    approx: 'Melt rheology obeys power-law pseudoplastic shear-thinning (Ostwald-de Waele). Cooling follows 1D unsteady Fourier heat conduction.',
    modes: [
      { key: 'injection', label: 'Injection Molding (Thermoplastics: High Speed & Complex Parts)' },
      { key: 'extrusion', label: 'Extrusion Molding (Continuous Pipes, Sheets & Filaments)' },
      { key: 'compression', label: 'Compression Molding (Thermosets: Electrical & Structural Parts)' },
    ],
    params: [
      {
        key: 'barrelTemp',
        label: 'Melt Processing Temperature',
        type: 'range',
        min: 170,
        max: 300,
        step: 5,
        default: 230,
        unit: '°C',
        help: 'Melt temperature must exceed Tm to lower shear viscosity without thermal degradation.',
      },
      {
        key: 'moldPressure',
        label: 'Injection / Hydraulic Pressure',
        type: 'range',
        min: 200,
        max: 1800,
        step: 50,
        default: 1300,
        unit: 'bar',
        help: 'High pressure overcomes flow resistance in thin runners and prevents sink marks.',
      },
      {
        key: 'cyclePhase',
        label: 'Cycle Phase Override',
        type: 'select',
        default: 'auto',
        options: [
          { value: 'auto', label: 'Continuous Automatic Video Loop' },
          { value: 'clamping', label: 'Phase 1: Mold Clamping & Plasticizing' },
          { value: 'injection', label: 'Phase 2: High-Speed Melt Injection & Fill' },
          { value: 'packing_cooling', label: 'Phase 3: Pack Pressure & Mold Cooling' },
          { value: 'ejection', label: 'Phase 4: Mold Opening & Part Ejection' },
        ],
        help: 'Select auto for continuous video animation, or freeze a specific manufacturing phase.',
      },
    ],
    examples: [
      { label: 'PP Injection Molding (T = 230°C, P = 1300 bar)', values: { mode: 'injection', barrelTemp: 230, moldPressure: 1300, cyclePhase: 'auto' } },
      { label: 'Continuous Pipe Extrusion Die (T = 205°C)', values: { mode: 'extrusion', barrelTemp: 205, moldPressure: 550, cyclePhase: 'auto' } },
      { label: 'Bakelite Compression Molding of Electrical Switch', values: { mode: 'compression', barrelTemp: 180, moldPressure: 650, cyclePhase: 'auto' } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      if (p.mode === 'injection') {
        return [
          { title: '1. Clamping & Plasticizing', text: 'Hopper feeds pellets into heated barrel (180–235°C). Rotating reciprocating screw shears and melts resin; molten shot pools at screw tip pushing screw back.' },
          { title: '2. High-Pressure Cavity Injection', text: 'Hydraulic ram drives screw forward as a plunger (1000–1600 bar). Hot melt jets through nozzle, sprue, and runners, filling mold cavity with fountain flow.' },
          { title: '3. Holding, Cooling & Ejection', text: 'Holding pressure packs part against thermal shrinkage. Chilled water channels freeze part below Tg. Mold opens by 70mm and knock-out ejector pins drop finished component.' },
        ];
      } else if (p.mode === 'extrusion') {
        return [
          { title: '1. Feed, Compression & Metering', text: 'Continuous Archimedean screw conveys pellets through feed zone, melts them under shear in compression zone, and homogenizes melt in metering zone.' },
          { title: '2. Breaker Plate & Annular Pipe Die', text: 'Melt passes screen pack and breaker plate, entering annular die orifice shaping continuous cylindrical hollow pipe profile.' },
          { title: '3. Vacuum Calibration & Quench Bath', text: 'Extrudate enters chilled vacuum water tank to freeze outer diameter, pulled by motorized caterpillar haul-off into flying cut-off saw.' },
        ];
      }
      return [
        { title: '1. Preheated Charge Placement', text: 'Pre-weighed charge of thermosetting resin (Bakelite phenol-formaldehyde) is placed directly into heated open lower cavity mold (160–180°C).' },
        { title: '2. Hydraulic Compression & Flow', text: 'Upper hydraulic punch descends under 300–800 bar, crushing softened polymer so it flows into every intricate contour of the heated tool.' },
        { title: '3. 3D Crosslinking Cure & Ejection', text: 'Sustained heat triggers irreversible covalent crosslinking into an infusible 3D network. Press opens and ejector pin demolds hot rigid part.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'injection';
      const tempC = Number(p.barrelTemp != null ? p.barrelTemp : 230);
      const pressBar = Number(p.moldPressure != null ? p.moldPressure : 1300);
      const phase = p.cyclePhase || 'auto';

      const baseVisc = 350;
      const appVisc = Math.round(baseVisc * Math.exp(-0.012 * (tempC - 200)));
      const coolTime = Math.max(4, Math.round(18 * (tempC / 230)));
      const cycleTime = coolTime + 8;

      const processTitles = {
        injection: 'Reciprocating Screw Injection Molding',
        extrusion: 'Single-Screw Continuous Pipe Extrusion',
        compression: 'Hydraulic Compression Molding (Thermosets)',
      };

      return {
        formulas: [
          { name: 'Melt Viscosity (Arrhenius)', formula: 'η = η₀ · exp(Eη / RT)', given: 'T = ' + tempC + '°C (T > Tm)', calc: 'Viscosity decreased by shear thinning', result: '' + appVisc, unit: 'Pa·s' },
          { name: 'Molding Clamp Force', formula: 'F_clamp = P_cavity × A_proj', given: 'Injection Pressure = ' + pressBar + ' bar', calc: 'High pressure requires clamp tonnage', result: '' + Math.round(pressBar * 0.18), unit: 'tonnes' },
          { name: 'Estimated Cycle Time', formula: 't_cycle = t_inject + t_cool + t_eject', given: 'Wall thickness = 2.5 mm', calc: 'Cooling = ' + coolTime + 's, Reset = 8s', result: '' + cycleTime, unit: 's' },
        ],
        readouts: [
          { label: 'Process', value: mode.toUpperCase(), tone: 'hi' },
          { label: 'Melt Viscosity', value: appVisc + ' Pa·s', tone: 'good' },
          { label: 'Pressure', value: pressBar + ' bar', tone: 'hi' },
          { label: 'Cycle Time', value: cycleTime + ' s', tone: 'neutral' },
          { label: 'Process Phase', value: phase === 'auto' ? 'AUTOMATIC LOOP' : phase.toUpperCase(), tone: 'good' },
        ],
        state: {
          mode,
          tempC,
          pressBar,
          phase,
          appVisc,
          cycleTime,
          coolTime,
          processTitle: processTitles[mode],
        },
        explain: {
          what: 'Polymer processing transforms raw polymer pellets into finished commercial geometries via heat, shear deformation, high pressure, and controlled solidifying cooling.',
          why: 'Thermoplastics melt reversibly, enabling fast automated injection molding and extrusion; thermosets undergo irreversible chemical crosslinking inside compression molds.',
          param: 'Barrel temperature controls melt viscosity (shear thinning); insufficient temperature causes short shots, while excessive temperature degrades polymer chains.',
          effect: 'Injection molding cycle time is dominated by cooling (Fourier conduction); mold cooling channels maintain part dimensional stability and minimize crystallization cycle delay.',
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#090d16'); // rich deep cinematic dark background

      const st = c.state;

      // Calculate video cycle phase (12 second loop)
      const cyclePeriod = 12.0;
      let normTime = ((t % cyclePeriod) / cyclePeriod); // 0.0 to 1.0

      // Manual phase override if user selected a static phase
      if (st.phase === 'clamping') normTime = 0.15;
      else if (st.phase === 'injection') normTime = 0.42;
      else if (st.phase === 'packing_cooling') normTime = 0.68;
      else if (st.phase === 'ejection') normTime = 0.88;

      // Sub-phases:
      // 0.00 - 0.30: Phase 1 - Clamping & Plasticizing (Screw rotates, pellets drop & melt, shot accumulates)
      // 0.30 - 0.55: Phase 2 - High Pressure Injection (Screw shoots forward, melt fountains into cavity 0->100%)
      // 0.55 - 0.80: Phase 3 - Holding & Chilled Cooling (Water channels pulse, part freezes from orange to cyan)
      // 0.80 - 1.00: Phase 4 - Mold Open & Ejection (Moving platen retracts, ejector pins pop part, drops)
      let phaseIdx = 0;
      let phaseName = '1. PLASTICIZING';
      let phaseDetail = 'Screw rotating & conveying pellets; polymer melts into shot reservoir';
      let fillPct = 0;
      let moldOpenX = 0; // platen separation offset (0 to 65px)
      let screwOffset = 0; // screw forward/back offset (-25px to +25px)
      let currentPressure = 0;

      if (normTime < 0.30) {
        phaseIdx = 0;
        phaseName = '1. PLASTICIZING & CLAMPING';
        phaseDetail = 'Pellets feed from hopper; rotating screw shears & melts resin into cushion shot';
        fillPct = 0;
        moldOpenX = 0;
        // Screw gradually moves backward as shot accumulates in front
        screwOffset = -25 * (normTime / 0.30);
        currentPressure = 80 + 40 * Math.sin(t * 4);
      } else if (normTime < 0.55) {
        phaseIdx = 1;
        phaseName = '2. HIGH-PRESSURE INJECTION';
        phaseDetail = 'Hydraulic ram thrusts screw forward as plunger; hot melt fills cavity (1300 bar)';
        const injProg = (normTime - 0.30) / 0.25;
        fillPct = Math.min(100, Math.round(injProg * 100));
        // Screw shoots forward
        screwOffset = -25 + 45 * injProg;
        moldOpenX = 0;
        currentPressure = Math.round(st.pressBar * (0.6 + 0.4 * injProg));
      } else if (normTime < 0.80) {
        phaseIdx = 2;
        phaseName = '3. PACKING & CHILLED COOLING';
        phaseDetail = 'Holding pressure compensates shrinkage; chilled water channels freeze part below Tg';
        fillPct = 100;
        screwOffset = 20;
        moldOpenX = 0;
        const coolProg = (normTime - 0.55) / 0.25;
        currentPressure = Math.round(st.pressBar * 0.4 * (1 - coolProg * 0.7));
      } else {
        phaseIdx = 3;
        phaseName = '4. MOLD OPENING & PART EJECTION';
        phaseDetail = 'Movable platen retracts 70mm along tie bars; knock-out pins eject finished component';
        fillPct = 100;
        screwOffset = 0;
        const openProg = (normTime - 0.80) / 0.20;
        if (openProg < 0.6) {
          moldOpenX = 65 * (openProg / 0.6);
        } else {
          moldOpenX = 65 * (1 - (openProg - 0.6) / 0.4);
        }
        currentPressure = 20;
      }

      // ─── Top Cinematic Header Bar (Clean, NO overlap) ───
      g.save();
      D.text(g, 'POLYMERS PROCESSING VIDEO SIMULATION', 28, 30, { color: '#38bdf8', size: 18, weight: 800 });
      D.text(g, st.processTitle + ' · T = ' + st.tempC + '°C · P_max = ' + st.pressBar + ' bar', 28, 52, { color: '#94a3b8', size: 12, weight: 600 });
      g.restore();

      // Top-right Step HUD (neatly placed at x: 560 to 975)
      drawStepHUD(g, S, phaseDetail);

      // ─── Left Main Viewport: Mechanical Video Simulation ───
      const vpX = 24;
      const vpY = 74;
      const vpW = 560;
      const vpH = 450;

      // Viewport chassis
      g.save();
      g.fillStyle = '#0f172a';
      g.strokeStyle = '#1e293b';
      g.lineWidth = 2;
      g.beginPath();
      if (g.roundRect) g.roundRect(vpX, vpY, vpW, vpH, 12);
      else g.rect(vpX, vpY, vpW, vpH);
      g.fill();
      g.stroke();

      // Viewport Sub-header / Status Badge
      D.text(g, 'VIDEO SIMULATION STAGE: ' + phaseName, vpX + 16, vpY + 24, { color: '#facc15', size: 13, weight: 800 });

      // Animated REC indicator dot
      const recPulse = 0.5 + 0.5 * Math.sin(t * 4);
      g.beginPath();
      g.arc(vpX + vpW - 32, vpY + 20, 5, 0, Math.PI * 2);
      g.fillStyle = 'rgba(239, 68, 68, ' + (0.4 + 0.6 * recPulse) + ')';
      g.fill();
      D.text(g, 'LIVE 60FPS', vpX + vpW - 44, vpY + 24, { color: '#ef4444', size: 10, weight: 800, align: 'right' });
      g.restore();

      const cx = vpX + 280;
      const cy = vpY + 230;

      if (st.mode === 'injection') {
        // ─────────────────────────────────────────────────────────────
        // DETAILED INJECTION MOLDING MACHINE
        // ─────────────────────────────────────────────────────────────

        // Machine Bed & Chrome Tie Bars
        g.save();
        // Lower machine casting bed
        g.fillStyle = '#1e293b';
        g.fillRect(vpX + 16, cy + 95, vpW - 32, 28);
        g.strokeStyle = '#334155';
        g.lineWidth = 1.5;
        g.strokeRect(vpX + 16, cy + 95, vpW - 32, 28);
        D.text(g, 'HEAVY CAST MACHINE BED & HYDRAULIC CLAMP UNIT', vpX + 24, cy + 114, { color: '#64748b', size: 9, weight: 700 });

        // Chrome Tie Bars (4 high-tensile steel tie bars passing through platens)
        const tbY1 = cy - 85;
        const tbY2 = cy + 70;
        const tbGrad = g.createLinearGradient(0, tbY1, 0, tbY1 + 10);
        tbGrad.addColorStop(0, '#94a3b8');
        tbGrad.addColorStop(0.5, '#f8fafc');
        tbGrad.addColorStop(1, '#475569');
        g.fillStyle = tbGrad;
        g.fillRect(vpX + 28, tbY1, vpW - 56, 9);
        g.fillRect(vpX + 28, tbY2, vpW - 56, 9);

        // 1. REAR HYDRAULIC INJECTION CYLINDER & RAM
        const cylX = vpX + 28;
        const cylY = cy - 35;
        const cylW = 75;
        const cylH = 70;
        g.fillStyle = '#334155';
        g.fillRect(cylX, cylY, cylW, cylH);
        g.strokeStyle = '#475569';
        g.lineWidth = 2;
        g.strokeRect(cylX, cylY, cylW, cylH);
        D.text(g, 'Hydraulic', cylX + cylW / 2, cylY + 28, { color: '#94a3b8', size: 9, weight: 700, align: 'center' });
        D.text(g, 'Cylinder', cylX + cylW / 2, cylY + 42, { color: '#94a3b8', size: 9, weight: 700, align: 'center' });

        // Hydraulic Ram Piston Shaft
        const ramW = 28 + screwOffset;
        g.fillStyle = '#cbd5e1';
        g.fillRect(cylX + cylW, cy - 12, Math.max(8, ramW), 24);

        // 2. HEATED PLASTICIZING BARREL
        const bX = cylX + cylW + 28;
        const bY = cy - 36;
        const bW = 210;
        const bH = 72;

        // Barrel steel casing
        g.fillStyle = '#1e293b';
        g.strokeStyle = '#475569';
        g.lineWidth = 2;
        g.fillRect(bX, bY, bW, bH);
        g.strokeRect(bX, bY, bW, bH);

        // 4 Temperature Gradient Heating Bands with Thermal Glow
        const bandNames = ['180°C', '205°C', '225°C', '235°C'];
        for (let b = 0; b < 4; b++) {
          const hX = bX + 38 + b * 42;
          const hGlow = 0.6 + 0.4 * Math.sin(t * 3 + b);
          g.fillStyle = 'rgba(234, 88, 12, ' + hGlow + ')';
          g.fillRect(hX, bY - 8, 30, 8); // top heater
          g.fillRect(hX, bY + bH, 30, 8); // bottom heater
          D.text(g, bandNames[b], hX + 15, bY - 12, { color: '#ea580c', size: 8, weight: 700, align: 'center' });
        }

        // HOPPER ON TOP (Dispensing animated polymer pellets)
        const hopX = bX + 22;
        const hopY = bY - 65;
        g.fillStyle = '#334155';
        g.strokeStyle = '#64748b';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(hopX, hopY);
        g.lineTo(hopX + 44, hopY);
        g.lineTo(hopX + 32, bY);
        g.lineTo(hopX + 12, bY);
        g.closePath();
        g.fill();
        g.stroke();
        D.text(g, 'Pellet Hopper', hopX + 22, hopY - 8, { color: '#94a3b8', size: 9, weight: 700, align: 'center' });

        // Animated falling polymer pellets
        for (let pIdx = 0; pIdx < 12; pIdx++) {
          const pYOffset = (pIdx * 12 + t * 45) % 60;
          const px = hopX + 16 + ((pIdx * 7) % 14);
          const py = hopY + 8 + pYOffset;
          if (py < bY) {
            g.beginPath();
            g.arc(px, py, 2.5, 0, Math.PI * 2);
            g.fillStyle = pIdx % 2 === 0 ? '#38bdf8' : '#0284c7';
            g.fill();
          }
        }

        // Inside Barrel: Molten Polymer Liquid & Reciprocating Helical Screw
        // Molten pool filling the barrel
        const meltGrad = g.createLinearGradient(bX, 0, bX + bW, 0);
        meltGrad.addColorStop(0, '#0284c7'); // solid pellets
        meltGrad.addColorStop(0.4, '#d97706'); // softening compression
        meltGrad.addColorStop(1, '#ea580c'); // completely molten reservoir
        g.fillStyle = meltGrad;
        g.fillRect(bX + 4, bY + 4, bW - 8, bH - 8);

        // Helical Screw (Shaft + Rotating Flights)
        const scrX = bX + 10 + screwOffset;
        const scrY = cy;
        const scrLen = bW - 35;
        // Screw core shaft
        g.fillStyle = '#94a3b8';
        g.fillRect(scrX, scrY - 10, scrLen, 20);

        // Screw flights rotating
        const rotPhase = (t * 6) % (Math.PI * 2);
        for (let fl = 0; fl < 8; fl++) {
          const flX = scrX + 15 + fl * 20;
          const flH = 22 + Math.sin(rotPhase + fl * 0.8) * 4;
          g.fillStyle = '#cbd5e1';
          g.beginPath();
          g.moveTo(flX, scrY - flH);
          g.lineTo(flX + 9, scrY + flH);
          g.lineTo(flX + 5, scrY + flH);
          g.lineTo(flX - 4, scrY - flH);
          g.closePath();
          g.fill();
        }

        // Conical Screw Tip (Smear head)
        g.fillStyle = '#e2e8f0';
        g.beginPath();
        g.moveTo(scrX + scrLen, scrY - 14);
        g.lineTo(scrX + scrLen + 16, scrY);
        g.lineTo(scrX + scrLen, scrY + 14);
        g.closePath();
        g.fill();

        // Cushion Reservoir of Molten Resin at Tip
        const tipReservoirW = Math.max(6, (bX + bW - 4) - (scrX + scrLen + 16));
        g.fillStyle = '#f97316';
        g.fillRect(scrX + scrLen + 16, cy - 24, tipReservoirW, 48);

        // Injection Nozzle Tip
        const nozX = bX + bW;
        g.fillStyle = '#94a3b8';
        g.strokeStyle = '#64748b';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(nozX, cy - 18);
        g.lineTo(nozX + 18, cy - 6);
        g.lineTo(nozX + 18, cy + 6);
        g.lineTo(nozX, cy + 18);
        g.closePath();
        g.fill();
        g.stroke();

        // Molten Jet shooting through nozzle during Phase 2 (Injection)
        if (phaseIdx === 1) {
          g.fillStyle = '#facc15';
          g.shadowColor = '#facc15';
          g.shadowBlur = 8;
          g.fillRect(nozX + 14, cy - 3, 20, 6);
          g.shadowBlur = 0;
        }

        // 3. TWO-PLATE INJECTION MOLD & MOVING PLATEN
        // Fixed Platen (Stationary, bolted to barrel side)
        const fixX = nozX + 18;
        const fixY = cy - 70;
        const fixW = 55;
        const fixH = 140;
        g.fillStyle = '#334155';
        g.strokeStyle = '#475569';
        g.lineWidth = 2;
        g.fillRect(fixX, fixY, fixW, fixH);
        g.strokeRect(fixX, fixY, fixW, fixH);
        D.text(g, 'Fixed Mold', fixX + fixW / 2, fixY - 8, { color: '#94a3b8', size: 9, weight: 700, align: 'center' });

        // Sprue Bushing channel inside fixed mold
        g.fillStyle = fillPct > 0 ? (phaseIdx >= 2 ? '#0284c7' : '#f97316') : '#0f172a';
        g.beginPath();
        g.moveTo(fixX, cy - 5);
        g.lineTo(fixX + fixW, cy - 8);
        g.lineTo(fixX + fixW, cy + 8);
        g.lineTo(fixX, cy + 5);
        g.closePath();
        g.fill();

        // Movable Platen & Mold Core (Moves right when mold opens)
        const movX = fixX + fixW + 4 + moldOpenX;
        const movY = fixY;
        const movW = 85;
        const movH = fixH;
        g.fillStyle = '#334155';
        g.strokeStyle = '#475569';
        g.lineWidth = 2;
        g.fillRect(movX, movY, movW, movH);
        g.strokeRect(movX, movY, movW, movH);
        D.text(g, 'Moving Platen', movX + movW / 2, movY - 8, { color: '#94a3b8', size: 9, weight: 700, align: 'center' });

        // Chilled Water Cooling Channels inside Movable Tool (Pulsing blue coolant)
        const coolPulse = Math.sin(t * 5);
        for (let ch = 0; ch < 3; ch++) {
          const chY = movY + 24 + ch * 46;
          g.beginPath();
          g.arc(movX + movW - 20, chY, 7, 0, Math.PI * 2);
          g.fillStyle = '#0284c7';
          g.fill();
          g.strokeStyle = '#38bdf8';
          g.lineWidth = 1.5;
          g.stroke();
          // Coolant flow wave
          g.beginPath();
          g.arc(movX + movW - 20, chY, 3.5 + 1.5 * coolPulse, 0, Math.PI * 2);
          g.fillStyle = '#e0f2fe';
          g.fill();
        }

        // Precision Mold Part Cavity (e.g. Phone Case / Enclosure Profile)
        const cavX = movX + 6;
        const cavY = cy - 42;
        const cavW = 38;
        const cavH = 84;

        // Cavity Boundary
        g.fillStyle = '#090d16';
        g.strokeStyle = '#facc15';
        g.lineWidth = 1.5;
        g.fillRect(cavX, cavY, cavW, cavH);
        g.strokeRect(cavX, cavY, cavW, cavH);

        // Polymer filling the Cavity
        if (fillPct > 0) {
          const filledH = (fillPct / 100) * cavH;
          // Color: glowing hot orange when injecting, cooling to high-gloss cyan
          let partColor = '#f97316';
          if (phaseIdx === 2) {
            // cooling transition
            partColor = '#0284c7';
          } else if (phaseIdx === 3) {
            partColor = '#38bdf8'; // fully frozen solid
          }
          g.fillStyle = partColor;
          g.fillRect(cavX, cavY + cavH - filledH, cavW, filledH);

          // Fountain flow meniscus wave at advancing front during Phase 2
          if (phaseIdx === 1 && fillPct < 100) {
            g.beginPath();
            g.arc(cavX + cavW / 2, cavY + cavH - filledH, cavW / 2, Math.PI, 0);
            g.fillStyle = '#facc15';
            g.fill();
          }

          D.text(g, 'Part (' + fillPct + '%)', cavX + cavW / 2, cavY + cavH / 2 + 3, {
            color: '#ffffff',
            size: 9,
            weight: 800,
            align: 'center',
          });
        }

        // EJECTOR PINS & FALLING FINISHED PART (Phase 4)
        if (phaseIdx === 3 && moldOpenX > 25) {
          // Ejector Pins extending forward from moving mold
          const pinExt = Math.min(22, (moldOpenX - 25));
          g.fillStyle = '#e2e8f0';
          g.fillRect(cavX - pinExt, cy - 25, pinExt, 4);
          g.fillRect(cavX - pinExt, cy + 25, pinExt, 4);

          // Ejected finished part dropping into collection chute
          const dropTime = (normTime - 0.88);
          const dropY = (dropTime > 0) ? (cy + (dropTime * 450)) : cy;
          if (dropY < cy + 120) {
            g.save();
            g.fillStyle = '#38bdf8';
            g.shadowColor = '#38bdf8';
            g.shadowBlur = 10;
            g.fillRect(fixX + fixW + 16, dropY - 20, 24, 40);
            D.text(g, 'EJECTED', fixX + fixW + 28, dropY + 2, { color: '#0f172a', size: 7, weight: 800, align: 'center' });
            g.restore();
          }
        }

        // Part Collection Bin & Chute at Bottom Right
        const chuteX = fixX + fixW + 8;
        const chuteY = cy + 95;
        g.fillStyle = '#1e293b';
        g.strokeStyle = '#38bdf8';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(chuteX, chuteY);
        g.lineTo(chuteX + 50, chuteY + 25);
        g.lineTo(chuteX - 10, chuteY + 25);
        g.closePath();
        g.fill();
        g.stroke();
        D.text(g, 'Part Bin', chuteX + 20, chuteY + 20, { color: '#38bdf8', size: 9, weight: 700 });

        g.restore();
      } else if (st.mode === 'extrusion') {
        // ─────────────────────────────────────────────────────────────
        // DETAILED CONTINUOUS SCREW EXTRUSION LINE
        // ─────────────────────────────────────────────────────────────
        g.save();
        // Extruder barrel + continuous rotating Archimedes screw
        const bX = vpX + 35;
        const bY = cy - 35;
        const bW = 210;
        const bH = 70;
        D.rect(g, bX, bY, bW, bH, { fill: '#1e293b', stroke: '#475569', width: 2, r: 6 });

        // Hopper
        const hopX = bX + 25;
        const hopY = bY - 60;
        D.poly(g, [[hopX, hopY], [hopX + 45, hopY], [hopX + 35, bY], [hopX + 15, bY]], { fill: '#334155', stroke: '#64748b', width: 2, close: true });
        D.text(g, 'Pellet Feed', hopX + 22, hopY - 8, { color: '#94a3b8', size: 9, weight: 700, align: 'center' });

        // Rotating screw inside
        D.line(g, bX + 10, cy, bX + bW - 10, cy, { color: '#94a3b8', width: 10 });
        const exScrewPhase = (t * 8) % (Math.PI * 2);
        for (let f = 0; f < 8; f++) {
          const fx = bX + 20 + f * 24;
          const fh = 20 + Math.sin(exScrewPhase + f * 0.7) * 4;
          D.line(g, fx, cy - fh, fx + 8, cy + fh, { color: '#cbd5e1', width: 3.5 });
        }

        // Circular Annular Pipe Die
        const dieX = bX + bW;
        D.rect(g, dieX, cy - 26, 26, 52, { fill: '#facc15', stroke: '#eab308', width: 2, r: 4 });
        D.text(g, 'Die', dieX + 13, cy + 4, { color: '#0f172a', size: 10, weight: 800, align: 'center' });

        // Chilled Vacuum Water Spray Quench Tank
        const tankX = dieX + 32;
        const tankY = cy - 45;
        const tankW = 140;
        const tankH = 90;
        D.rect(g, tankX, tankY, tankW, tankH, { fill: 'rgba(2, 132, 199, 0.25)', stroke: '#38bdf8', width: 1.5, r: 6 });
        D.text(g, 'Vacuum Water Quench Bath', tankX + tankW / 2, tankY - 8, { color: '#38bdf8', size: 9, weight: 700, align: 'center' });

        // Water spray nozzles
        for (let sp = 0; sp < 4; sp++) {
          const sx = tankX + 20 + sp * 32;
          D.circle(g, sx, tankY + 8, 3, { fill: '#38bdf8' });
          for (let d = 0; d < 3; d++) {
            const dy = tankY + 14 + ((d * 8 + t * 40) % 20);
            D.circle(g, sx - 4 + d * 4, dy, 1.5, { fill: '#e0f2fe' });
          }
        }

        // Continuous Moving Pipe Extrudate passing through
        const pipeH = 26;
        const pipeY = cy - pipeH / 2;
        g.fillStyle = '#38bdf8';
        g.fillRect(dieX + 26, pipeY, vpW - (dieX + 26 - vpX) - 15, pipeH);
        D.line(g, dieX + 26, cy, vpX + vpW - 15, cy, { color: '#ffffff', width: 2, dash: [8, 8] });

        // Caterpillar Puller Unit (Two motorized track belts pulling pipe)
        const pullX = tankX + tankW + 15;
        const pullY1 = pipeY - 26;
        const pullY2 = pipeY + pipeH + 4;
        D.rect(g, pullX, pullY1, 65, 22, { fill: '#334155', stroke: '#facc15', width: 1.5, r: 4 });
        D.rect(g, pullX, pullY2, 65, 22, { fill: '#334155', stroke: '#facc15', width: 1.5, r: 4 });
        D.text(g, 'Puller ➔', pullX + 32, pullY1 + 14, { color: '#facc15', size: 9, weight: 800, align: 'center' });
        D.text(g, 'Puller ➔', pullX + 32, pullY2 + 14, { color: '#facc15', size: 9, weight: 800, align: 'center' });

        g.restore();
      } else {
        // ─────────────────────────────────────────────────────────────
        // DETAILED HYDRAULIC COMPRESSION MOLDING (THERMOSET BAKELITE)
        // ─────────────────────────────────────────────────────────────
        g.save();
        const pX = cx - 110;
        const pY = cy - 80;
        const pW = 220;

        // Heavy Press Frame Columns
        D.rect(g, pX - 35, pY - 50, 25, 240, { fill: '#334155', stroke: '#64748b', width: 2 });
        D.rect(g, pX + pW + 10, pY - 50, 25, 240, { fill: '#334155', stroke: '#64748b', width: 2 });

        // Upper Hydraulic Ram (descends dynamically)
        const pressCycle = Math.sin(t * 1.5);
        const ramDescend = Math.max(0, 35 * (0.5 + 0.5 * pressCycle));

        // Upper Hydraulic Cylinder
        D.rect(g, pX + 50, pY - 50, 120, 50, { fill: '#1e293b', stroke: '#94a3b8', width: 2, r: 6 });
        D.text(g, 'Hydraulic Press (' + st.pressBar + ' bar)', cx, pY - 24, { color: '#ef4444', size: 10, weight: 800, align: 'center' });

        // Moving Upper Punch Tool
        D.rect(g, pX + 25, pY + ramDescend, pW - 50, 45, { fill: '#475569', stroke: '#cbd5e1', width: 2, r: 6 });
        D.text(g, 'Upper Male Mold Plunger', cx, pY + ramDescend + 26, { color: '#f8fafc', size: 10, weight: 800, align: 'center' });

        // Heated Lower Female Cavity Mold (180°C)
        const lowY = cy + 45;
        D.rect(g, pX, lowY, pW, 95, { fill: '#1e293b', stroke: '#ea580c', width: 2.5, r: 8 });
        // Heating elements
        for (let el = 0; el < 4; el++) {
          D.circle(g, pX + 35 + el * 50, lowY + 75, 7, { fill: '#ea580c' });
        }
        D.text(g, 'Electric Heating Cartridges (180°C)', cx, lowY + 79, { color: '#ea580c', size: 9, weight: 700, align: 'center' });

        // Compressed Bakelite Polymer Charge inside Cavity
        const chargeH = 28 - (ramDescend * 0.4);
        g.fillStyle = '#7c2d12'; // deep Bakelite amber
        g.strokeStyle = '#f59e0b';
        g.lineWidth = 2;
        g.fillRect(pX + 35, lowY + 12, pW - 70, chargeH);
        g.strokeRect(pX + 35, lowY + 12, pW - 70, chargeH);
        D.text(g, 'Bakelite Resin Charge (Crosslinking Cure)', cx, lowY + 26, { color: '#facc15', size: 9.5, weight: 800, align: 'center' });

        g.restore();
      }

      // ─── Right Panel: Live Video Telemetry & Rheology Readouts ───
      const panX = 600;
      const panY = 74;
      const panW = 375;
      const panH = 450;

      g.save();
      g.fillStyle = '#0f172a';
      g.strokeStyle = '#1e293b';
      g.lineWidth = 2;
      g.beginPath();
      if (g.roundRect) g.roundRect(panX, panY, panW, panH, 12);
      else g.rect(panX, panY, panW, panH);
      g.fill();
      g.stroke();

      D.text(g, 'PROCESS TELEMETRY & CONTROLS', panX + 16, panY + 24, { color: '#38bdf8', size: 12, weight: 800 });

      // 1. Live Cycle Phase Progress Bar
      const barY = panY + 45;
      D.text(g, 'Video Cycle Timeline (12s Continuous Loop)', panX + 16, barY, { color: '#94a3b8', size: 10, weight: 600 });
      g.fillStyle = '#1e293b';
      g.fillRect(panX + 16, barY + 8, panW - 32, 12);
      g.fillStyle = '#38bdf8';
      g.fillRect(panX + 16, barY + 8, (panW - 32) * normTime, 12);
      // Moving playhead marker
      g.fillStyle = '#ffffff';
      g.fillRect(panX + 16 + (panW - 32) * normTime - 2, barY + 6, 4, 16);

      // Phase indicators pills
      const phases = ['1. Feed', '2. Inject', '3. Cool', '4. Eject'];
      for (let ph = 0; ph < 4; ph++) {
        const phX = panX + 16 + ph * 86;
        const isCur = ph === phaseIdx;
        g.fillStyle = isCur ? '#38bdf8' : '#1e293b';
        g.beginPath();
        if (g.roundRect) g.roundRect(phX, barY + 26, 80, 20, 4);
        else g.rect(phX, barY + 26, 80, 20);
        g.fill();
        D.text(g, phases[ph], phX + 40, barY + 40, { color: isCur ? '#0f172a' : '#94a3b8', size: 9, weight: 800, align: 'center' });
      }

      // 2. Real-Time Pressure Gauge (bar)
      const pGaugeY = barY + 62;
      D.rect(g, panX + 16, pGaugeY, panW - 32, 68, { fill: '#1e293b', stroke: '#334155', r: 8 });
      D.text(g, 'Injection / Hydraulic Pressure', panX + 28, pGaugeY + 20, { color: '#94a3b8', size: 10, weight: 600 });
      D.text(g, currentPressure + ' bar', panX + 28, pGaugeY + 46, { color: '#facc15', size: 18, weight: 800 });
      // Pressure bar
      const pPct = Math.min(1, currentPressure / 1800);
      g.fillStyle = '#0f172a';
      g.fillRect(panX + 160, pGaugeY + 34, 180, 12);
      const pGrad = g.createLinearGradient(panX + 160, 0, panX + 340, 0);
      pGrad.addColorStop(0, '#10b981');
      pGrad.addColorStop(0.7, '#facc15');
      pGrad.addColorStop(1, '#ef4444');
      g.fillStyle = pGrad;
      g.fillRect(panX + 160, pGaugeY + 34, 180 * pPct, 12);

      // 3. Cavity Fill Meter (%)
      const cavMeterY = pGaugeY + 76;
      D.rect(g, panX + 16, cavMeterY, panW - 32, 68, { fill: '#1e293b', stroke: '#334155', r: 8 });
      D.text(g, 'Mold Cavity Fill Progress', panX + 28, cavMeterY + 20, { color: '#94a3b8', size: 10, weight: 600 });
      D.text(g, fillPct + '%', panX + 28, cavMeterY + 46, { color: fillPct === 100 ? '#10b981' : '#38bdf8', size: 18, weight: 800 });
      g.fillStyle = '#0f172a';
      g.fillRect(panX + 160, cavMeterY + 34, 180, 12);
      g.fillStyle = fillPct === 100 ? '#10b981' : '#38bdf8';
      g.fillRect(panX + 160, cavMeterY + 34, 180 * (fillPct / 100), 12);

      // 4. Melt Temperature & Viscosity
      const viscY = cavMeterY + 76;
      D.rect(g, panX + 16, viscY, panW - 32, 68, { fill: '#1e293b', stroke: '#334155', r: 8 });
      D.text(g, 'Melt Rheology (Temperature & Viscosity)', panX + 28, viscY + 20, { color: '#94a3b8', size: 10, weight: 600 });
      D.text(g, st.tempC + ' °C  |  ' + st.appVisc + ' Pa·s', panX + 28, viscY + 46, { color: '#ea580c', size: 15, weight: 800 });

      // 5. Engineering Principles Box
      const princY = viscY + 76;
      D.rect(g, panX + 16, princY, panW - 32, 56, { fill: '#1e293b', stroke: '#334155', r: 8 });
      D.text(g, 'Cooling Time Law: t_cool ∝ (h² / α) · ln(ΔT)', panX + 26, princY + 22, { color: '#facc15', size: 10, weight: 700 });
      D.text(g, 'Fountain flow ensures high molecular orientation along wall.', panX + 26, princY + 40, { color: '#94a3b8', size: 9.5 });

      g.restore();
    },
  };

    // ═════════════════════════════════════════════════════════════════
  // 12. CRYSTAL FIELD SPLITTING (OCTAHEDRAL/TETRAHEDRAL, COLOR & MAGNETISM)
  // ═════════════════════════════════════════════════════════════════
  S['chem-crystal-field-theory'] = {
    live: true,
    approx: 'Calculates orbital splitting Δo and Δt = (4/9)Δo based on spectrochemical series. Spin-only magnetic moment μs = √(n(n+2)) μB. d-d transition absorption λ = hc / Δo.',
    modes: [
      { key: 'octahedral', label: 'Octahedral Geometry [ML₆] (Oh Splitting: t2g & eg)' },
      { key: 'tetrahedral', label: 'Tetrahedral Geometry [ML₄] (Td Splitting: e & t2)' },
    ],
    params: [
      {
        key: 'dElectrons',
        label: 'd-Electron Count (d¹ to d⁸)',
        type: 'select',
        default: 'd6',
        options: [
          { value: 'd1', label: 'd¹ (e.g. [Ti(H₂O)₆]³⁺)' },
          { value: 'd3', label: 'd³ (e.g. [Cr(H₂O)₆]³⁺)' },
          { value: 'd4', label: 'd⁴ (e.g. [Cr(H₂O)₆]²⁺ / [Mn(H₂O)₆]³⁺)' },
          { value: 'd5', label: 'd⁵ (e.g. [Fe(H₂O)₆]³⁺ / [Mn(H₂O)₆]²⁺)' },
          { value: 'd6', label: 'd⁶ (e.g. [Fe(H₂O)₆]²⁺ / [Fe(CN)₆]⁴⁻ / [Co(NH₃)₆]³⁺)' },
          { value: 'd7', label: 'd⁷ (e.g. [Co(H₂O)₆]²⁺)' },
          { value: 'd8', label: 'd⁸ (e.g. [Ni(H₂O)₆]²⁺)' },
        ],
        help: 'Number of valence d electrons in the central transition metal ion.',
      },
      {
        key: 'ligandField',
        label: 'Ligand Field Strength (Spectrochemical Series)',
        type: 'select',
        default: 'strong_cn',
        options: [
          { value: 'weak_i', label: 'I⁻ / Br⁻ / Cl⁻ — Very Weak Field (Δo < P, High Spin)' },
          { value: 'weak_h2o', label: 'H₂O — Moderate Weak Field (High Spin)' },
          { value: 'strong_nh3', label: 'NH₃ — Strong Field (Δo > P, Low Spin)' },
          { value: 'strong_cn', label: 'CN⁻ / CO — Very Strong Field (Low Spin)' },
        ],
        help: 'Strong field ligands produce large splitting Δo exceeding pairing energy P, forcing pairing (low spin).',
      },
    ],
    examples: [
      { label: '[Fe(CN)₆]⁴⁻ d⁶ Low Spin Diamagnetic (Pale Yellow)', values: { mode: 'octahedral', dElectrons: 'd6', ligandField: 'strong_cn' } },
      { label: '[Fe(H₂O)₆]²⁺ d⁶ High Spin Paramagnetic (Pale Green)', values: { mode: 'octahedral', dElectrons: 'd6', ligandField: 'weak_h2o' } },
      { label: '[CoF₆]³⁻ vs [Co(NH₃)₆]³⁺ d⁶ Field Comparison', values: { mode: 'octahedral', dElectrons: 'd6', ligandField: 'strong_nh3' } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      if (p.mode === 'octahedral') {
        return [
          { title: '1. Spherically Symmetric to Octahedral Field', text: 'Six ligands approach along ±x, ±y, ±z Cartesian axes. Electrostatic repulsion destabilizes orbitals pointing along axes (eg: dz², dx²-y²) by +0.6 Δo, while t2g (dxy, dyz, dzx) pointing between axes stabilize by −0.4 Δo.' },
          { title: '2. High Spin vs Low Spin Electron Aufbau', text: 'If crystal field splitting Δo < pairing energy P (weak field ligands like Cl⁻, H₂O), electrons occupy eg before pairing (high spin). If Δo > P (strong field CN⁻, CO), electrons pair completely in t2g first (low spin).' },
          { title: '3. CFSE, Magnetism & d-d Transition Color', text: 'Crystal Field Stabilization Energy (CFSE) stabilizes the complex. Unpaired electrons n dictate spin-only magnetic moment μs = √(n(n+2)) μB. Electronic d-d excitation absorbs visible photon λ = hc/Δo, imparting complementary color.' },
        ];
      }
      return [
        { title: '1. Tetrahedral Inverted Splitting (Δt)', text: 'Four ligands approach opposite corners of a cube. Orbitals directed toward edges (t2: dxy, dyz, dzx) experience greater repulsion (+0.4 Δt), while e orbitals (dz², dx²-y²) stabilize by −0.6 Δt.' },
        { title: '2. Low Splitting Magnitude: Δt = (4/9) Δo', text: 'Because only 4 ligands are present and none point directly at d-orbitals, Δt is small (Δt ≈ 0.44 Δo). Δt almost never exceeds pairing energy P, so tetrahedral complexes are virtually always High Spin.' },
        { title: '3. Laporte-Relaxed Intense Colorations', text: 'Lack of center of inversion in Td geometry mixes d and p orbitals, relaxing the Laporte selection rule and making tetrahedral complexes (e.g. deep blue [CoCl₄]²⁻) intensely colored.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'octahedral';
      const dCount = Number((p.dElectrons || 'd6').replace('d', ''));
      const lig = p.ligandField || 'strong_cn';

      // Spectrochemical factor
      const ligFactor = {
        weak_i: { name: 'Halide (I⁻/Cl⁻)', delta: 12000, isStrong: false, pVal: 18000 },
        weak_h2o: { name: 'Aqua (H₂O)', delta: 14000, isStrong: false, pVal: 17500 },
        strong_nh3: { name: 'Ammine (NH₃)', delta: 24000, isStrong: true, pVal: 17500 },
        strong_cn: { name: 'Cyano (CN⁻)', delta: 33000, isStrong: true, pVal: 17500 },
      }[lig] || { name: 'H₂O', delta: 14000, isStrong: false, pVal: 17500 };

      let deltaCm = ligFactor.delta;
      if (mode === 'tetrahedral') {
        deltaCm = Math.round((4 / 9) * deltaCm);
      }

      // High spin vs low spin determination
      // In tetrahedral, almost always high spin because delta_t < P
      const isLowSpin = mode === 'octahedral' && ligFactor.isStrong && dCount >= 4 && dCount <= 7;

      // Electron distribution
      let n_lower = 0; // t2g in Oh, e in Td
      let n_upper = 0; // eg in Oh, t2 in Td
      let unpaired = 0;

      if (mode === 'octahedral') {
        // Oh: lower is t2g (capacity 6), upper is eg (capacity 4)
        if (isLowSpin) {
          n_lower = Math.min(dCount, 6);
          n_upper = Math.max(0, dCount - 6);
          unpaired = n_lower <= 3 ? n_lower : (6 - n_lower) + n_upper;
        } else {
          // High spin: fill 1 in each of 5 orbitals first
          if (dCount <= 3) {
            n_lower = dCount;
            n_upper = 0;
            unpaired = dCount;
          } else if (dCount <= 5) {
            n_lower = 3;
            n_upper = dCount - 3;
            unpaired = dCount;
          } else {
            n_lower = 3 + (dCount - 5);
            n_upper = 2;
            unpaired = 5 - (dCount - 5);
          }
        }
      } else {
        // Td: lower is e (capacity 4), upper is t2 (capacity 6) - always high spin
        if (dCount <= 2) {
          n_lower = dCount;
          n_upper = 0;
          unpaired = dCount;
        } else if (dCount <= 5) {
          n_lower = 2;
          n_upper = dCount - 2;
          unpaired = dCount;
        } else {
          n_lower = 2 + Math.min(2, dCount - 5);
          n_upper = 3 + Math.max(0, dCount - 7);
          unpaired = 10 - dCount;
        }
      }

      // CFSE calculation
      // Oh: CFSE = (-0.4 * n_t2g + 0.6 * n_eg) * Delta_o
      // Td: CFSE = (-0.6 * n_e + 0.4 * n_t2) * Delta_t
      let cfseCoeff = 0;
      if (mode === 'octahedral') {
        cfseCoeff = Math.round((-0.4 * n_lower + 0.6 * n_upper) * 10) / 10;
      } else {
        cfseCoeff = Math.round((-0.6 * n_lower + 0.4 * n_upper) * 10) / 10;
      }

      // Magnetic moment mu_s = sqrt(n*(n+2))
      const muS = Math.round(Math.sqrt(unpaired * (unpaired + 2)) * 100) / 100;
      const magType = unpaired === 0 ? 'Diamagnetic (μ = 0)' : `Paramagnetic (n = ${unpaired})`;

      // Transition wavelength lambda = 1e7 / delta_cm (in nm)
      const lambdaNm = Math.min(950, Math.max(350, Math.round(1e7 / deltaCm)));

      // Color mapping
      let perceivedColor = 'Pale Yellow';
      let hexColor = '#fef08a';
      if (lambdaNm >= 380 && lambdaNm < 430) {
        perceivedColor = 'Yellow-Green';
        hexColor = '#84cc16';
      } else if (lambdaNm >= 430 && lambdaNm < 490) {
        perceivedColor = 'Bright Yellow / Orange';
        hexColor = '#f59e0b';
      } else if (lambdaNm >= 490 && lambdaNm < 560) {
        perceivedColor = 'Ruby Red / Purple';
        hexColor = '#be185d';
      } else if (lambdaNm >= 560 && lambdaNm < 620) {
        perceivedColor = 'Deep Blue / Violet';
        hexColor = '#2563eb';
      } else if (lambdaNm >= 620 && lambdaNm < 750) {
        perceivedColor = 'Aqua Blue / Emerald Green';
        hexColor = '#059669';
      }

      return {
        formulas: [
          { name: 'Crystal Field Stabilization Energy', formula: mode === 'octahedral' ? 'CFSE = (−0.4 n_t2g + 0.6 n_eg) Δo' : 'CFSE = (−0.6 n_e + 0.4 n_t2) Δt', given: `n_lower = ${n_lower}, n_upper = ${n_upper}`, calc: `${cfseCoeff} Δ`, result: `${cfseCoeff} Δ`, unit: 'CFSE' },
          { name: 'Spin-Only Magnetic Moment', formula: 'μ_s = √(n (n + 2)) μ_B', given: `Unpaired electrons n = ${unpaired}`, calc: `√(${unpaired} × ${unpaired + 2})`, result: `${muS.toFixed(2)}`, unit: 'μ_B' },
          { name: 'Electronic Absorption Wavelength', formula: 'ΔE = hc / λ = Δ', given: `Splitting Δ = ${deltaCm} cm⁻¹`, calc: `10⁷ / ${deltaCm} cm⁻¹`, result: `${lambdaNm}`, unit: 'nm' },
        ],
        readouts: [
          { label: 'Geometry', value: mode === 'octahedral' ? 'Octahedral (Oh)' : 'Tetrahedral (Td)', tone: 'hi' },
          { label: 'Spin State', value: isLowSpin ? 'Low Spin (Paired)' : 'High Spin', tone: isLowSpin ? 'hi' : 'neutral' },
          { label: 'Unpaired e⁻', value: String(unpaired), tone: unpaired > 0 ? 'good' : 'neutral' },
          { label: 'Magnetic Moment', value: `${muS.toFixed(2)} μB`, tone: 'hi' },
          { label: 'CFSE', value: `${cfseCoeff} Δ`, tone: 'good' },
          { label: 'Perceived Color', value: perceivedColor.split(' ')[0], tone: 'good' },
        ],
        state: {
          mode,
          dCount,
          isLowSpin,
          n_lower,
          n_upper,
          unpaired,
          cfseCoeff,
          muS,
          magType,
          deltaCm,
          lambdaNm,
          perceivedColor,
          hexColor,
          ligName: ligFactor.name,
        },
        explain: {
          what: `Crystal Field Theory (CFT) treats ligand-metal bonding as electrostatic interactions that remove the degeneracy of transition metal 3d orbitals.`,
          why: `In an octahedral field, ligands along the axes repel the eg orbitals (dz², dx²-y²), raising them by +0.6 Δo, while stabilizing t2g orbitals (dxy, dyz, dzx) by −0.4 Δo. In tetrahedral fields, the splitting is inverted (Δt = 4/9 Δo).`,
          param: `Strong-field ligands (CN⁻, CO) exert high electrostatic repulsion, creating a large splitting Δo that exceeds pairing energy P, yielding Low-Spin complexes. Weak-field ligands (halides, H₂O) give High-Spin.`,
          effect: `Unpaired electrons impart paramagnetism (μs = √(n(n+2)) μB). Promoting an electron from lower to upper d-levels absorbs a specific visible photon (λ = hc/Δ), imparting complementary color.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Degenerate 3d-orbitals in isolated spherical gaseous metal ion' : step === 1 ? 'Ligands approach along Cartesian axes: electrostatic repulsion splits d-orbitals' : 'Electronic d-d transition: complementary visible photon absorbed');

      // Header Banner
      D.text(g, st.mode === 'octahedral' ? 'CRYSTAL FIELD THEORY: OCTAHEDRAL [ML₆] d-ORBITAL SPLITTING' : 'CRYSTAL FIELD THEORY: TETRAHEDRAL [ML₄] INVERTED SPLITTING', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `Config: d${st.dCount} · Ligand: ${st.ligName} · State: ${st.isLowSpin ? 'Low Spin' : 'High Spin'} · Splitting Δ = ${st.deltaCm} cm⁻¹ · ${st.magType}`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: d-Orbital Energy Level Diagram (x: 24 to 530)
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Orbital Energy Splitting Diagram', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });
      D.tag(g, st.isLowSpin ? 'Low Spin (Δ > P)' : 'High Spin (Δ < P)', 460, 110, { bg: '#0f172a', border: '#facc15', color: '#facc15', size: 11, align: 'center' });

      const cx = 270;
      const cy = 290;

      // Degenerate Free Ion 5 d-orbitals at x: 60 to 140
      D.text(g, 'Free Ion (Degenerate)', 60, cy + 85, { color: '#94a3b8', size: 10 });
      for (let i = 0; i < 5; i++) {
        const ox = 60 + i * 22;
        D.line(g, ox, cy + 60, ox + 18, cy + 60, { color: '#94a3b8', width: 3 });
      }

      // Dotted transition to split orbitals
      D.line(g, 175, cy + 60, 240, cy - 40, { color: '#475569', width: 1.5, dash: [3, 3] });
      D.line(g, 175, cy + 60, 240, cy + 60, { color: '#475569', width: 1.5, dash: [3, 3] });

      // Barycenter Line
      D.line(g, 220, cy + 10, 470, cy + 10, { color: '#64748b', width: 1, dash: [4, 4] });
      D.text(g, 'Barycenter', 420, cy + 4, { color: '#64748b', size: 9 });

      // Splitting levels:
      if (st.mode === 'octahedral') {
        // Upper eg (2 orbitals) at cy - 50
        const egY = cy - 50;
        D.text(g, 'eg (+0.6 Δo)', 240, egY - 10, { color: '#f59e0b', size: 12, weight: 800 });
        D.text(g, 'dz², dx²-y²', 240, egY + 20, { color: '#94a3b8', size: 9 });
        D.line(g, 330, egY, 370, egY, { color: '#f59e0b', width: 4 });
        D.line(g, 390, egY, 430, egY, { color: '#f59e0b', width: 4 });

        // Lower t2g (3 orbitals) at cy + 60
        const t2gY = cy + 60;
        D.text(g, 't2g (−0.4 Δo)', 240, t2gY - 10, { color: '#38bdf8', size: 12, weight: 800 });
        D.text(g, 'dxy, dyz, dzx', 240, t2gY + 20, { color: '#94a3b8', size: 9 });
        D.line(g, 310, t2gY, 345, t2gY, { color: '#38bdf8', width: 4 });
        D.line(g, 360, t2gY, 395, t2gY, { color: '#38bdf8', width: 4 });
        D.line(g, 410, t2gY, 445, t2gY, { color: '#38bdf8', width: 4 });

        // Double headed arrow showing Δo
        D.arrow(g, 460, t2gY, 460, egY, { color: '#facc15', width: 2, head: 6 });
        D.arrow(g, 460, egY, 460, t2gY, { color: '#facc15', width: 2, head: 6 });
        D.text(g, 'Δo', 475, (egY + t2gY) / 2, { color: '#facc15', size: 12, weight: 800 });

        // Draw electron arrows into orbitals
        // Lower t2g electrons:
        const t2gBoxes = [327, 377, 427];
        for (let e = 0; e < st.n_lower; e++) {
          const bIdx = e % 3;
          const isUp = e < 3;
          const xPos = isUp ? t2gBoxes[bIdx] - 4 : t2gBoxes[bIdx] + 4;
          const y1 = isUp ? t2gY + 12 : t2gY - 12;
          const y2 = isUp ? t2gY - 12 : t2gY + 12;
          D.arrow(g, xPos, y1, xPos, y2, { color: '#38bdf8', width: 2.5, head: 5 });
        }

        // Upper eg electrons:
        const egBoxes = [350, 410];
        for (let e = 0; e < st.n_upper; e++) {
          const bIdx = e % 2;
          const isUp = e < 2;
          const xPos = isUp ? egBoxes[bIdx] - 4 : egBoxes[bIdx] + 4;
          const y1 = isUp ? egY + 12 : egY - 12;
          const y2 = isUp ? egY - 12 : egY + 12;
          D.arrow(g, xPos, y1, xPos, y2, { color: '#f59e0b', width: 2.5, head: 5 });
        }
      } else {
        // Tetrahedral inverted splitting: upper is t2 (3 orbitals), lower is e (2 orbitals)
        const t2Y = cy - 40;
        D.text(g, 't2 (+0.4 Δt)', 240, t2Y - 10, { color: '#f59e0b', size: 12, weight: 800 });
        D.line(g, 310, t2Y, 345, t2Y, { color: '#f59e0b', width: 4 });
        D.line(g, 360, t2Y, 395, t2Y, { color: '#f59e0b', width: 4 });
        D.line(g, 410, t2Y, 445, t2Y, { color: '#f59e0b', width: 4 });

        const eY = cy + 50;
        D.text(g, 'e (−0.6 Δt)', 240, eY - 10, { color: '#38bdf8', size: 12, weight: 800 });
        D.line(g, 330, eY, 370, eY, { color: '#38bdf8', width: 4 });
        D.line(g, 390, eY, 430, eY, { color: '#38bdf8', width: 4 });

        D.arrow(g, 460, eY, 460, t2Y, { color: '#facc15', width: 2, head: 6 });
        D.arrow(g, 460, t2Y, 460, eY, { color: '#facc15', width: 2, head: 6 });
        D.text(g, 'Δt', 475, (t2Y + eY) / 2, { color: '#facc15', size: 12, weight: 800 });

        // Draw electrons in e (lower)
        const eBoxes = [350, 410];
        for (let e = 0; e < st.n_lower; e++) {
          const bIdx = e % 2;
          const isUp = e < 2;
          const xPos = isUp ? eBoxes[bIdx] - 4 : eBoxes[bIdx] + 4;
          const y1 = isUp ? eY + 12 : eY - 12;
          const y2 = isUp ? eY - 12 : eY + 12;
          D.arrow(g, xPos, y1, xPos, y2, { color: '#38bdf8', width: 2.5, head: 5 });
        }

        // Draw electrons in t2 (upper)
        const t2Boxes = [327, 377, 427];
        for (let e = 0; e < st.n_upper; e++) {
          const bIdx = e % 3;
          const isUp = e < 3;
          const xPos = isUp ? t2Boxes[bIdx] - 4 : t2Boxes[bIdx] + 4;
          const y1 = isUp ? t2Y + 12 : t2Y - 12;
          const y2 = isUp ? t2Y - 12 : t2Y + 12;
          D.arrow(g, xPos, y1, xPos, y2, { color: '#f59e0b', width: 2.5, head: 5 });
        }
      }

      D.tag(g, `CFSE = ${st.cfseCoeff} Δ · Unpaired n = ${st.unpaired} · μs = ${st.muS.toFixed(2)} μB`, cx, 490, { bg: '#0f172a', border: '#38bdf8', color: '#38bdf8', size: 12, align: 'center' });

      // Right Panel: Solution Color & Spectrophotometric Property (x: 540 to 975)
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Complex Solution Color & Electronic Transition', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

      // Color Beaker Flask
      const bkX = 690;
      const bkY = 145;
      D.poly(g, [
        [bkX - 45, bkY],
        [bkX - 45, bkY + 80],
        [bkX + 45, bkY + 80],
        [bkX + 45, bkY],
      ], { fill: st.hexColor, stroke: '#ffffff', width: 2 });
      D.text(g, `${st.perceivedColor} Solution`, bkX, bkY + 98, { color: '#f8fafc', size: 12, weight: 800, align: 'center' });

      // Explanation of Color & Magnetism
      const cyCardY = 275;
      D.rect(g, 560, cyCardY, 395, 140, { fill: '#0f172a', stroke: '#334155', r: 8 });
      D.text(g, 'Photophysical & Magnetic Summary:', 575, cyCardY + 24, { color: '#facc15', size: 12, weight: 700 });
      D.text(g, `• d-d Absorption Wavelength: λ_max = ${st.lambdaNm} nm`, 575, cyCardY + 48, { color: '#38bdf8', size: 11, weight: 700 });
      D.text(g, `• Observed Color: ${st.perceivedColor} (Complement of absorbed band)`, 575, cyCardY + 68, { color: '#cbd5e1', size: 11 });
      D.text(g, `• Magnetism: ${st.magType}`, 575, cyCardY + 90, { color: st.unpaired > 0 ? '#f59e0b' : '#38bdf8', size: 11, weight: 700 });
      D.text(g, `• Spin-only formula: μ_s = √(n(n+2)) = ${st.muS.toFixed(2)} Bohr Magnetons`, 575, cyCardY + 112, { color: '#94a3b8', size: 10.5 });

      // Spectrochemical reference
      D.rect(g, 560, 428, 395, 75, { fill: '#0f172a', stroke: '#334155', r: 8 });
      D.text(g, 'Spectrochemical Series (Increasing Δ):', 575, 450, { color: '#cbd5e1', size: 10.5, weight: 700 });
      D.text(g, 'I⁻ < Br⁻ < S²⁻ < Cl⁻ < F⁻ < OH⁻ < H₂O < NH₃ < en < NO₂⁻ < CN⁻ < CO', 575, 472, { color: '#38bdf8', size: 9.5, weight: 600 });
      D.text(g, 'Weak Field (High Spin) ───────────────> Strong Field (Low Spin)', 575, 490, { color: '#facc15', size: 9, weight: 600 });
    },
  };
})();
