'use strict';

/**
 * Engineering Chemistry — Unit VI: Virtual Laboratory (Curriculum Lab Experiments)
 * Interactive Simulation Engines for U25CY103
 *
 * Implements:
 *  23. chem-lab-pka-titration: pKa Determination of Weak Acids by Potentiometric/pH Titration (Interactive Live)
 *  24. chem-lab-azo-coupling: Laboratory Preparation of Azo Dye via Diazotization Coupling
 *  25. chem-lab-qualitative-tests: Qualitative Organic Analysis (Acids, Aldehydes, Amines)
 *  26. chem-lab-viscometer-mw: Molecular Weight of Polymer via Ostwald Viscometer (Interactive Live)
 *  27. chem-lab-ester-hydrolysis: Rate Constant of Acid-Catalysed Hydrolysis of an Ester
 *  28. chem-lab-emf-electrodes: EMF Measurement using Calomel & Glass Electrode
 *  29. chem-lab-partition-iodine: Distribution Coefficient of Iodine between Water & CCl₄
 *  30. chem-lab-beer-lambert: Verification of Beer-Lambert Law & Unknown Quantification
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


  // ─── Interactive Laboratory Simulation Engines Shared State ───
  let _pkaStirActive = true;
  let _pkaFlowActive = false;
  let _pkaFlowAccumulator = 0;
  const _pkaDrops = [];
  const _pkaRipples = [];

  let _viscRunning = false;
  let _viscElapsed = 0;
  let _viscLevel = 0.05;
  let _timingFinished = false;

  // ═════════════════════════════════════════════════════════════════
  // 23. pKa DETERMINATION OF WEAK ACIDS BY pH TITRATION (UPGRADED)
  // ═════════════════════════════════════════════════════════════════
  S['chem-lab-pka-titration'] = {
  live: true,
  approx: 'Titration curve modeled via electroneutrality and Henderson-Hasselbalch equation pH = pKa + log10([A-]/[HA]). Equivalence point marked by basic salt hydrolysis pH_eq = 7 + 0.5(pKa + log10 C).',
  modes: [
    { key: 'acetic_acid', label: 'Acetic Acid (CH3COOH: pKa = 4.76, Sharp Buffering)' },
    { key: 'phenol', label: 'Phenol (C6H5OH: Weak Acid pKa = 9.95)' },
  ],
  params: [
    {
      key: 'titrantVol',
      label: 'Volume of 0.1 M NaOH Added (mL)',
      type: 'range',
      default: 12.5,
      min: 0.0,
      max: 30.0,
      step: 0.1,
      unit: 'mL',
      help: 'Volume of 0.1 M NaOH dispensed from burette into 25 mL of 0.1 M weak acid.',
    },
  ],
  actions: [
    { key: 'drop_05', label: '💧 Add 0.5 mL', title: 'Dispense 0.5 mL titrant from burette' },
    { key: 'drop_01', label: '💧 Dropwise (0.1 mL)', title: 'Dispense 0.1 mL dropwise' },
    { key: 'flow_toggle', label: '⚡ Continuous Flow', title: 'Toggle continuous automated titrant flow' },
    { key: 'stir_toggle', label: '🌀 Stirrer: ON', title: 'Toggle magnetic stirrer' },
    { key: 'reset_burette', label: '🔄 Refill Burette', title: 'Refill burette to 0.0 mL' },
  ],
  examples: [
    { label: 'Initial Weak Acid Solution (V = 0 mL)', values: { mode: 'acetic_acid', titrantVol: 0 } },
    { label: 'Half-Neutralization Buffer Point (V = 12.5 mL, pH = pKa)', values: { mode: 'acetic_acid', titrantVol: 12.5 } },
    { label: 'Equivalence Point (V = 25.0 mL, Basic Salt Hydrolysis)', values: { mode: 'acetic_acid', titrantVol: 25.0 } },
  ],
  validate() { return []; },
  onAction(action, state) {
    const p = state.p;
    const curVol = Number(p.titrantVol != null ? p.titrantVol : 12.5);
    if (action === 'drop_05') {
      const next = Math.min(30.0, Math.round((curVol + 0.5) * 10) / 10);
      _pkaDrops.push({ x: 210, y: 310, vy: 2, size: 4.5, t: state.t });
      return { params: { titrantVol: next }, toast: 'Added 0.5 mL NaOH (Total: ' + next.toFixed(1) + ' mL)' };
    }
    if (action === 'drop_01') {
      const next = Math.min(30.0, Math.round((curVol + 0.1) * 10) / 10);
      _pkaDrops.push({ x: 210, y: 310, vy: 2, size: 3.2, t: state.t });
      return { params: { titrantVol: next }, toast: 'Added 0.1 mL NaOH (Total: ' + next.toFixed(1) + ' mL)' };
    }
    if (action === 'flow_toggle') {
      _pkaFlowActive = !_pkaFlowActive;
      return { redraw: true, toast: _pkaFlowActive ? 'Continuous burette flow: ACTIVE' : 'Continuous flow: STOPPED' };
    }
    if (action === 'stir_toggle') {
      _pkaStirActive = !_pkaStirActive;
      return { redraw: true, toast: _pkaStirActive ? 'Magnetic stirrer: ACTIVE (1200 RPM)' : 'Magnetic stirrer: OFF' };
    }
    if (action === 'reset_burette') {
      _pkaFlowActive = false;
      return { params: { titrantVol: 0.0 }, toast: 'Burette refilled to 0.0 mL' };
    }
  },
  onClick(x, y, state) {
    if (x >= 185 && x <= 235 && y >= 280 && y <= 325) {
      const curVol = Number(state.p.titrantVol != null ? state.p.titrantVol : 12.5);
      const next = Math.min(30.0, Math.round((curVol + 0.5) * 10) / 10);
      _pkaDrops.push({ x: 210, y: 310, vy: 2, size: 4.5, t: state.t });
      return { params: { titrantVol: next }, toast: 'Stopcock opened: +0.5 mL NaOH' };
    }
    if (x >= 120 && x <= 300 && y >= 460 && y <= 510) {
      _pkaStirActive = !_pkaStirActive;
      return { redraw: true, toast: _pkaStirActive ? 'Stirrer ON' : 'Stirrer OFF' };
    }
  },
  steps(p, c) {
    return [
      { title: '1. Initial Acid Dissociation (V = 0 mL)', text: 'Weak acid partially dissociates in water: HA ⇌ H⁺ + A⁻ with Ka = [H⁺][A⁻]/[HA]. Initial pH is determined by pH = ½(pKa - log10 C).' },
      { title: '2. Half-Equivalence Point (pH = pKa at V = V_eq / 2)', text: 'At exactly half-equivalence (12.5 mL), half of HA is converted into A⁻ ([HA] = [A⁻]). By Henderson-Hasselbalch, log10([A⁻]/[HA]) = 0, so pH = pKa directly.' },
      { title: '3. Equivalence Point & Inflection Peak', text: 'At 25.0 mL, all acid is converted into conjugate base. Hydrolysis (A⁻ + H₂O ⇌ HA + OH⁻) makes the equivalence pH alkaline (pH ≈ 8.72 for acetate). The first derivative dpH/dV exhibits a sharp maximum.' },
    ];
  },
  compute(p) {
    const mode = p.mode || 'acetic_acid';
    const v = Number(p.titrantVol != null ? p.titrantVol : 12.5);
    const vEq = 25.0;
    const pKa = mode === 'acetic_acid' ? 4.76 : 9.95;

    let ph = 0;
    let regDesc = '';
    let dpHdV = 0;

    if (v <= 0.05) {
      ph = 0.5 * (pKa - Math.log10(0.1));
      regDesc = 'Pure Weak Acid Solution';
      dpHdV = 0.12;
    } else if (v < vEq - 0.2) {
      const ratio = v / (vEq - v);
      ph = pKa + Math.log10(ratio);
      regDesc = Math.abs(v - 12.5) < 0.6 ? 'Half-Equivalence: pH = pKa' : 'Buffer Capacity Region';
      dpHdV = (1 / (v * Math.LN10)) + (1 / ((vEq - v) * Math.LN10));
    } else if (Math.abs(v - vEq) <= 0.2) {
      ph = 7.0 + 0.5 * (pKa + Math.log10(0.05));
      regDesc = 'Equivalence Point (Basic Salt Hydrolysis)';
      dpHdV = 8.5;
    } else {
      const excessV = v - vEq;
      const totalV = 25.0 + v;
      const cOH = (excessV * 0.1) / totalV;
      const pOH = -Math.log10(cOH);
      ph = 14.0 - pOH;
      regDesc = 'Post-Equivalence (Excess 0.1 M NaOH)';
      dpHdV = (0.1 / (totalV * Math.LN10)) * (25.0 / excessV);
    }

    ph = clamp(Math.round(ph * 100) / 100, 1.5, 13.5);

    return {
      formulas: [
        { name: 'Henderson-Hasselbalch Equation', formula: 'pH = pKa + log10([A⁻] / [HA])', given: 'At V = ' + (vEq / 2).toFixed(1) + ' mL, [A⁻] = [HA]', calc: 'pH = pKa + log10(1) = pKa', result: '' + pKa, unit: 'pKa' },
        { name: 'Equivalence Point Salt Hydrolysis', formula: 'pH_eq = 7 + ½(pKa + log10 C_salt)', given: 'C_salt = 0.05 M, pKa = ' + pKa, calc: '7 + 0.5 × (' + pKa + ' + log10 0.05)', result: '' + (7 + 0.5 * (pKa - 1.301)).toFixed(2), unit: 'pH' },
      ],
      readouts: [
        { label: 'Analyte', value: mode === 'acetic_acid' ? 'Acetic Acid (CH3COOH)' : 'Phenol (C6H5OH)', tone: 'hi' },
        { label: 'Current pH', value: ph.toFixed(2), tone: ph >= 8.2 ? 'warn' : 'hi' },
        { label: 'Experimental pKa', value: pKa.toFixed(2), tone: 'good' },
        { label: 'Titrant Volume', value: v.toFixed(1) + ' mL', tone: 'neutral' },
        { label: 'Titration State', value: regDesc.split(' ')[0], tone: 'good' },
      ],
      state: { mode, v, ph, pKa, vEq, regDesc, dpHdV },
      explain: {
        what: 'Potentiometric pH titration monitors solution potential and pH as standard 0.1 M NaOH is incrementally added to a weak acid, producing an S-shaped sigmoidal titration curve.',
        why: 'At the half-equivalence point (12.5 mL), exactly half the weak acid has been neutralized to conjugate base ([A⁻] = [HA]), making log10([A⁻]/[HA]) = 0; thus pH strictly equals pKa.',
        param: 'Acetic acid (pKa = 4.76) displays a prominent buffer plateau and a sharp alkaline equivalence inflection at pH ≈ 8.72. Phenol (pKa = 9.95) is very weak, with an inflection at pH > 11.',
        effect: 'Phenolphthalein indicator (color transition pH 8.2–10.0) transforms from colorless to brilliant fuchsia magenta, perfectly matching the basic equivalence point.',
      },
    };
  },
  draw(g, S) {
    const { p, c, t } = S;
    const step = S.step || 0;
    D.clear(g, '#0b1120');
    const st = c.state;

    // Step HUD
    drawStepHUD(g, S, step === 0 ? 'Initial acid reading & burette standardization' : step === 1 ? 'Half-neutralization buffer point: pH = pKa (buffer plateau)' : 'Equivalence end-point inflection & sharp indicator transition');

    // Continuous flow handling
    if (_pkaFlowActive && st.v < 30.0) {
      _pkaFlowAccumulator += 0.025;
      if (_pkaFlowAccumulator >= 0.1) {
        const added = Math.floor(_pkaFlowAccumulator * 10) / 10;
        _pkaFlowAccumulator -= added;
        p.titrantVol = Math.min(30.0, Math.round((st.v + added) * 10) / 10);
        if (Math.random() < 0.4) {
          _pkaDrops.push({ x: 210, y: 310, vy: 3, size: 3.8, t });
        }
      }
    }

    // Title & Header Bar
    D.text(g, 'EXPERIMENT 1: pKa DETERMINATION OF WEAK ACID BY pH TITRATION', 30, 36, { color: '#38bdf8', size: 19, weight: 800 });
    D.text(g, '0.1 M NaOH Titrant  •  V = ' + st.v.toFixed(1) + ' mL  •  pH = ' + st.ph.toFixed(2) + '  •  Experimental pKa = ' + st.pKa.toFixed(2) + '  •  ' + st.regDesc, 30, 62, { color: '#94a3b8', size: 12.5, weight: 600 });

    // ═════════════════════════════════════════════════════════════
    // LEFT PANEL: HIGH-FIDELITY LABORATORY APPARATUS
    // ═════════════════════════════════════════════════════════════
    D.rect(g, 24, 85, 500, 440, { fill: '#131d2e', stroke: '#1e293b', r: 12 });
    D.text(g, 'Potentiometric Titration Apparatus', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

    const cx = 210;

    // Retort Stand Base (Cast Iron Chamfered Base)
    g.save();
    const baseGrad = g.createLinearGradient(70, 485, 70, 505);
    baseGrad.addColorStop(0, '#334155');
    baseGrad.addColorStop(0.5, '#1e293b');
    baseGrad.addColorStop(1, '#0f172a');
    g.fillStyle = baseGrad;
    g.strokeStyle = '#475569';
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(70, 490, 170, 16, 4);
    g.fill();
    g.stroke();

    // Vertical Chrome Support Rod
    const rodGrad = g.createLinearGradient(95, 120, 105, 120);
    rodGrad.addColorStop(0, '#64748b');
    rodGrad.addColorStop(0.3, '#f1f5f9');
    rodGrad.addColorStop(0.7, '#cbd5e1');
    rodGrad.addColorStop(1, '#475569');
    g.fillStyle = rodGrad;
    g.fillRect(96, 120, 8, 370);

    // Bosshead & Burette Clamp
    g.fillStyle = '#334155';
    g.fillRect(92, 175, 16, 18);
    g.fillRect(104, 181, cx - 118, 6);
    g.fillStyle = '#64748b';
    g.fillRect(cx - 15, 178, 4, 12);
    g.fillRect(cx + 11, 178, 4, 12);
    g.restore();

    // Magnetic Stirrer Plate Base
    const plateY = 460;
    g.save();
    const plateGrad = g.createLinearGradient(cx - 85, plateY, cx + 85, plateY + 30);
    plateGrad.addColorStop(0, '#1e293b');
    plateGrad.addColorStop(1, '#0f172a');
    g.fillStyle = plateGrad;
    g.strokeStyle = '#334155';
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(cx - 85, plateY, 170, 30, 6);
    g.fill();
    g.stroke();

    // Stirrer Power & RPM LED
    D.circle(g, cx - 65, plateY + 15, 4, { fill: _pkaStirActive ? '#22c55e' : '#ef4444' });
    D.text(g, _pkaStirActive ? 'STIRRER ON (1200 RPM)' : 'STIRRER OFF', cx - 55, plateY + 15, { color: _pkaStirActive ? '#22c55e' : '#94a3b8', size: 9, weight: 700 });
    D.circle(g, cx + 45, plateY + 15, 7, { fill: '#334155', stroke: '#64748b', width: 1.5 });
    D.circle(g, cx + 65, plateY + 15, 7, { fill: '#334155', stroke: '#64748b', width: 1.5 });
    g.restore();

    // Borosilicate Beaker (Contains 25 mL weak acid analyte + titrant)
    const bkW = 150;
    const bkH = 125;
    const bkX = cx - bkW / 2;
    const bkY = plateY - bkH;

    const totalVol = 25.0 + st.v;
    const solH = clamp(50 + (totalVol - 25) * 1.5, 50, 105);
    const solY = (bkY + bkH - 4) - solH;

    let liqColor = 'rgba(56, 189, 248, 0.16)';
    let liqBorder = 'rgba(56, 189, 248, 0.4)';
    if (st.ph >= 9.0) {
      liqColor = 'rgba(236, 72, 153, 0.62)';
      liqBorder = 'rgba(244, 114, 182, 0.85)';
    } else if (st.ph >= 8.2) {
      const frac = (st.ph - 8.2) / 0.8;
      liqColor = 'rgba(' + Math.round(56 + frac * 180) + ', ' + Math.round(189 - frac * 117) + ', ' + Math.round(248 - frac * 95) + ', ' + (0.2 + frac * 0.4) + ')';
      liqBorder = 'rgba(236, 72, 153, 0.6)';
    }

    // Draw Beaker Liquid
    g.save();
    g.fillStyle = liqColor;
    g.beginPath();
    g.roundRect(bkX + 4, solY, bkW - 8, solH, [0, 0, 6, 6]);
    g.fill();

    // Concave Meniscus
    g.strokeStyle = liqBorder;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(bkX + 4, solY + 2);
    const dip = _pkaStirActive ? 6 : 2;
    g.quadraticCurveTo(cx, solY + 2 + dip, bkX + bkW - 4, solY + 2);
    g.stroke();

    // Stirring Vortex & Spinning Magnetic Stir Bar
    if (_pkaStirActive) {
      const angle = (t * 12) % (2 * Math.PI);
      g.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.ellipse(cx, solY + 4, 30, 4, 0, angle, angle + Math.PI);
      g.stroke();

      const barW = 24 * Math.abs(Math.cos(angle * 0.8)) + 6;
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#94a3b8';
      g.lineWidth = 1;
      g.beginPath();
      g.roundRect(cx - barW / 2, bkY + bkH - 12, barW, 6, 3);
      g.fill();
      g.stroke();
    } else {
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#94a3b8';
      g.lineWidth = 1;
      g.beginPath();
      g.roundRect(cx - 14, bkY + bkH - 12, 28, 6, 3);
      g.fill();
      g.stroke();
    }
    g.restore();

    // Beaker Glass Body & Graduation Ticks
    g.save();
    g.strokeStyle = 'rgba(148, 163, 184, 0.7)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(bkX - 6, bkY);
    g.lineTo(bkX, bkY + 6);
    g.lineTo(bkX, bkY + bkH - 4);
    g.quadraticCurveTo(bkX, bkY + bkH, bkX + 6, bkY + bkH);
    g.lineTo(bkX + bkW - 6, bkY + bkH);
    g.quadraticCurveTo(bkX + bkW, bkY + bkH, bkX + bkW, bkY + bkH - 4);
    g.lineTo(bkX + bkW, bkY);
    g.stroke();

    g.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    g.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach((frac, idx) => {
      const markY = bkY + bkH - frac * bkH;
      g.beginPath();
      g.moveTo(bkX + 6, markY);
      g.lineTo(bkX + 22, markY);
      g.stroke();
      D.text(g, (idx + 1) * 50 + ' mL', bkX + 26, markY, { color: '#94a3b8', size: 9, weight: 600 });
    });
    g.restore();

    // 50 mL Precision Glass Burette
    const burW = 18;
    const burH = 175;
    const burX = cx - burW / 2;
    const burY = 120;

    const burFillRatio = clamp(1.0 - (st.v / 30.0), 0.05, 1.0);
    const burLiqH = (burH - 15) * burFillRatio;
    const burLiqY = burY + (burH - 15) - burLiqH;

    g.save();
    g.fillStyle = 'rgba(56, 189, 248, 0.35)';
    g.fillRect(burX + 2, burLiqY, burW - 4, burLiqH);

    g.strokeStyle = '#38bdf8';
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(burX + 2, burLiqY);
    g.quadraticCurveTo(cx, burLiqY + 2.5, burX + burW - 2, burLiqY);
    g.stroke();

    g.strokeStyle = 'rgba(203, 213, 225, 0.85)';
    g.lineWidth = 2;
    g.strokeRect(burX, burY, burW, burH);

    g.fillStyle = 'rgba(255, 255, 255, 0.45)';
    g.fillRect(burX + 3, burY, 2, burH);

    for (let vol = 0; vol <= 30; vol += 5) {
      const tickY = burY + (vol / 30.0) * (burH - 15);
      g.strokeStyle = '#cbd5e1';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(burX + burW, tickY);
      g.lineTo(burX + burW - 6, tickY);
      g.stroke();
      D.text(g, '' + vol, burX + burW + 4, tickY, { color: '#94a3b8', size: 8.5, weight: 600 });
    }

    const stopY = burY + burH;
    g.fillStyle = 'rgba(203, 213, 225, 0.4)';
    g.beginPath();
    g.moveTo(burX, stopY);
    g.lineTo(burX + burW, stopY);
    g.lineTo(cx + 4, stopY + 12);
    g.lineTo(cx - 4, stopY + 12);
    g.closePath();
    g.fill();
    g.stroke();

    const valveAngle = _pkaFlowActive ? 0 : Math.PI / 2;
    g.save();
    g.translate(cx, stopY + 12);
    g.fillStyle = '#0284c7';
    g.strokeStyle = '#38bdf8';
    g.lineWidth = 1.5;
    g.rotate(valveAngle);
    g.beginPath();
    g.roundRect(-12, -4, 24, 8, 3);
    g.fill();
    g.stroke();
    g.restore();

    g.strokeStyle = '#cbd5e1';
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(cx - 2, stopY + 16);
    g.lineTo(cx - 1.5, stopY + 28);
    g.lineTo(cx + 1.5, stopY + 28);
    g.lineTo(cx + 2, stopY + 16);
    g.stroke();

    D.text(g, '0.1 M NaOH', burX - 35, burY + 20, { color: '#38bdf8', size: 9.5, weight: 700 });
    D.text(g, st.v.toFixed(1) + ' mL', burX - 35, burY + 34, { color: '#facc15', size: 11, weight: 800 });
    g.restore();

    // Dynamic Falling Droplet Physics & Liquid Impact Ripples
    const dropSpawnY = stopY + 29;
    const dropTargetY = solY;

    if (_pkaFlowActive || _pkaDrops.length > 0) {
      if (_pkaDrops.length === 0 && _pkaFlowActive && Math.random() < 0.25) {
        _pkaDrops.push({ x: cx, y: dropSpawnY, vy: 3, size: 3.8, t });
      }
      for (let i = _pkaDrops.length - 1; i >= 0; i--) {
        const d = _pkaDrops[i];
        d.y += d.vy;
        d.vy += 0.4;
        if (d.y >= dropTargetY) {
          _pkaRipples.push({ x: cx, y: dropTargetY, r: 2, maxR: 26, alpha: 0.85 });
          _pkaDrops.splice(i, 1);
        } else {
          g.save();
          g.fillStyle = 'rgba(56, 189, 248, 0.85)';
          g.beginPath();
          g.ellipse(d.x, d.y, d.size * 0.7, d.size, 0, 0, 2 * Math.PI);
          g.fill();
          g.restore();
        }
      }
    }

    for (let j = _pkaRipples.length - 1; j >= 0; j--) {
      const rp = _pkaRipples[j];
      rp.r += 1.2;
      rp.alpha -= 0.04;
      if (rp.alpha <= 0) {
        _pkaRipples.splice(j, 1);
      } else {
        g.save();
        g.strokeStyle = st.ph >= 8.2 ? 'rgba(244, 63, 94, ' + rp.alpha + ')' : 'rgba(56, 189, 248, ' + rp.alpha + ')';
        g.lineWidth = 1.5;
        g.beginPath();
        g.ellipse(rp.x, rp.y, rp.r, rp.r * 0.35, 0, 0, 2 * Math.PI);
        g.stroke();
        g.restore();
      }
    }

    // Combination pH Glass Electrode
    const elX = cx + 45;
    const elY = 220;
    const elH = 175;
    g.save();
    g.strokeStyle = '#475569';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(elX, elY);
    g.bezierCurveTo(elX + 20, elY - 40, 340, elY - 20, 360, 195);
    g.stroke();

    g.fillStyle = 'rgba(56, 189, 248, 0.15)';
    g.strokeStyle = '#94a3b8';
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(elX - 6, elY, 12, elH, 4);
    g.fill();
    g.stroke();

    g.strokeStyle = '#e2e8f0';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(elX, elY + 10);
    g.lineTo(elX, elY + elH - 10);
    g.stroke();

    D.circle(g, elX, elY + elH, 7, { fill: '#0284c7', stroke: '#38bdf8', width: 2 });
    D.text(g, 'pH Bulb', elX + 12, elY + elH, { color: '#38bdf8', size: 9, weight: 700 });
    g.restore();

    // Benchtop Digital pH Meter
    const metX = 330;
    const metY = 125;
    const metW = 170;
    const metH = 100;
    g.save();
    g.fillStyle = '#0f172a';
    g.strokeStyle = '#38bdf8';
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(metX, metY, metW, metH, 8);
    g.fill();
    g.stroke();

    D.text(g, 'DIGITAL pH / mV METER', metX + 12, metY + 18, { color: '#94a3b8', size: 9.5, weight: 700 });
    g.fillStyle = '#022c22';
    g.strokeStyle = '#059669';
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(metX + 10, metY + 30, metW - 20, 42, 4);
    g.fill();
    g.stroke();

    const jitter = Math.sin(t * 8) * 0.01;
    const dispPH = (st.ph + jitter).toFixed(2);
    D.text(g, 'pH ' + dispPH, metX + metW / 2 - 10, metY + 52, { color: '#34d399', size: 22, weight: 900, align: 'center' });
    D.text(g, '25.0 °C • CAL: OK • ' + (st.ph >= 8.2 ? 'BASIC' : 'ACIDIC'), metX + 14, metY + 85, { color: '#64748b', size: 9.5, weight: 600 });
    g.restore();

    D.tag(g, st.regDesc, cx, 496, { bg: '#0f172a', border: '#38bdf8', color: '#38bdf8', size: 11, align: 'center' });

    // ═════════════════════════════════════════════════════════════
    // RIGHT PANEL: INTERACTIVE SIGMOIDAL TITRATION GRAPH
    // ═════════════════════════════════════════════════════════════
    D.rect(g, 540, 85, 435, 440, { fill: '#131d2e', stroke: '#1e293b', r: 12 });
    D.text(g, 'Potentiometric Titration Curve (pH & dpH/dV vs V)', 558, 110, { color: '#f8fafc', size: 13.5, weight: 700 });

    const rx = 595;
    const ry = 430;
    const rw = 330;
    const rh = 250;

    g.save();
    g.strokeStyle = '#1e293b';
    g.lineWidth = 1;
    for (let phVal = 2; phVal <= 14; phVal += 2) {
      const gy = ry - ((phVal - 2) / 12) * rh;
      g.beginPath();
      g.moveTo(rx, gy);
      g.lineTo(rx + rw, gy);
      g.stroke();
      D.text(g, '' + phVal, rx - 10, gy, { color: '#64748b', size: 9.5, align: 'right' });
    }
    for (let vVal = 0; vVal <= 30; vVal += 5) {
      const gx = rx + (vVal / 30.0) * rw;
      g.beginPath();
      g.moveTo(gx, ry);
      g.lineTo(gx, ry - rh);
      g.stroke();
      D.text(g, '' + vVal, gx, ry + 15, { color: '#64748b', size: 9.5, align: 'center' });
    }

    g.strokeStyle = '#475569';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(rx, ry);
    g.lineTo(rx + rw, ry);
    g.moveTo(rx, ry);
    g.lineTo(rx, ry - rh);
    g.stroke();
    g.restore();

    D.text(g, 'Volume 0.1 M NaOH (mL)', rx + rw / 2, ry + 32, { color: '#94a3b8', size: 10.5, weight: 600, align: 'center' });
    D.text(g, 'pH', rx - 16, ry - rh - 4, { color: '#38bdf8', size: 11, weight: 700, align: 'center' });
    D.text(g, 'dpH/dV', rx + rw + 14, ry - rh - 4, { color: '#10b981', size: 9.5, weight: 700, align: 'center' });

    const pts = [];
    const dPts = [];
    const numPts = 70;
    for (let i = 0; i <= numPts; i++) {
      const curV = (i / numPts) * 30.0;
      let curPH = 0;
      let dVal = 0;
      if (curV <= 0.1) {
        curPH = 0.5 * (st.pKa - Math.log10(0.1));
        dVal = 0.15;
      } else if (curV < 24.8) {
        curPH = st.pKa + Math.log10(curV / (25.0 - curV));
        dVal = (1 / (curV * Math.LN10)) + (1 / ((25.0 - curV) * Math.LN10));
      } else if (Math.abs(curV - 25.0) <= 0.2) {
        curPH = 7.0 + 0.5 * (st.pKa + Math.log10(0.05));
        dVal = 7.5;
      } else {
        const ex = curV - 25.0;
        const cOH = (ex * 0.1) / (25.0 + curV);
        curPH = 14.0 + Math.log10(cOH);
        dVal = 0.8 / (ex + 0.2);
      }
      curPH = clamp(curPH, 2.0, 14.0);
      const px = rx + (curV / 30.0) * rw;
      const py = ry - ((curPH - 2.0) / 12.0) * rh;
      pts.push([px, py]);

      const dPy = ry - clamp(dVal / 8.0, 0, 1.0) * rh;
      dPts.push([px, dPy]);
    }

    g.save();
    g.setLineDash([4, 4]);
    D.poly(g, dPts, { stroke: 'rgba(16, 185, 129, 0.65)', width: 1.8, fill: false });
    g.restore();

    g.save();
    const curveGrad = g.createLinearGradient(rx, ry, rx + rw, ry - rh);
    curveGrad.addColorStop(0, '#38bdf8');
    curveGrad.addColorStop(0.65, '#38bdf8');
    curveGrad.addColorStop(0.85, '#f43f5e');
    curveGrad.addColorStop(1, '#ec4899');
    D.poly(g, pts, { stroke: curveGrad, width: 3.2, fill: false });
    g.restore();

    const halfX = rx + (12.5 / 30.0) * rw;
    const halfY = ry - ((st.pKa - 2.0) / 12.0) * rh;
    g.save();
    g.setLineDash([3, 3]);
    D.line(g, halfX, ry, halfX, halfY, { color: '#facc15', width: 1.5 });
    D.line(g, rx, halfY, halfX, halfY, { color: '#facc15', width: 1.2 });
    g.restore();
    D.circle(g, halfX, halfY, 5, { fill: '#facc15', stroke: '#0f172a', width: 1.5 });
    D.text(g, 'Half-Eq: pH = pKa = ' + st.pKa, halfX + 8, halfY - 10, { color: '#facc15', size: 10, weight: 800 });

    const eqX = rx + (25.0 / 30.0) * rw;
    const eqPH = 7.0 + 0.5 * (st.pKa - 1.301);
    const eqY = ry - ((eqPH - 2.0) / 12.0) * rh;
    g.save();
    g.setLineDash([3, 3]);
    D.line(g, eqX, ry, eqX, eqY, { color: '#f43f5e', width: 1.5 });
    g.restore();
    D.circle(g, eqX, eqY, 5, { fill: '#f43f5e', stroke: '#0f172a', width: 1.5 });
    D.text(g, 'Equivalence: 25.0 mL', eqX - 10, eqY - 10, { color: '#f43f5e', size: 10, weight: 800, align: 'right' });

    const curX = rx + (st.v / 30.0) * rw;
    const curY = ry - ((st.ph - 2.0) / 12.0) * rh;
    g.save();
    const pulseR = 7 + Math.sin(t * 6) * 2;
    D.circle(g, curX, curY, pulseR, { stroke: 'rgba(34, 197, 94, 0.4)', width: 2 });
    D.circle(g, curX, curY, 6, { fill: '#22c55e', stroke: '#ffffff', width: 2 });

    g.setLineDash([2, 2]);
    D.line(g, curX, ry, curX, curY, { color: 'rgba(34, 197, 94, 0.5)', width: 1 });
    D.line(g, rx, curY, curX, curY, { color: 'rgba(34, 197, 94, 0.5)', width: 1 });
    g.restore();

    D.rect(g, 555, ry + 42, 405, 38, { fill: '#0f172a', stroke: '#1e293b', r: 6 });
    D.text(g, 'dpH/dV spike = 25.0 mL  •  Buffer index β max at V = 12.5 mL  •  pKa = ' + st.pKa, 570, ry + 61, { color: '#38bdf8', size: 10.5, weight: 700 });
  },
};

  // ═════════════════════════════════════════════════════════════════
  // 24. AZO DYE PREPARATION VIA DIAZOTIZATION COUPLING
  // ═════════════════════════════════════════════════════════════════
  S['chem-lab-azo-coupling'] = {
    live: true,
    approx: 'Stoichiometric synthesis: 1 mol Aniline (93.13 g/mol) + 1 mol NaNO2 + 1 mol beta-Naphthol (144.17 g/mol) -> 1 mol Sudan I dye (248.28 g/mol).',
    modes: [
      { key: 'lab_protocol', label: 'Laboratory Synthetic Protocol & Mass Yield Calculation' },
    ],
    params: [
      {
        key: 'anilineMass',
        label: 'Mass of Aniline Used (g)',
        type: 'range',
        default: 4.65,
        min: 1.0,
        max: 10.0,
        step: 0.05,
        unit: 'g',
        help: 'Mass of freshly distilled aniline starting material.',
      },
      {
        key: 'actualYield',
        label: 'Crude Dry Dye Obtained (g)',
        type: 'range',
        default: 9.8,
        min: 1.0,
        max: 25.0,
        step: 0.1,
        unit: 'g',
        help: 'Mass of filtered and dried orange-red crystalline azo dye product.',
      },
    ],
    examples: [
      { label: 'Standard Practical Run (4.65 g Aniline -> 9.8 g Dye, ~79% Yield)', values: { anilineMass: 4.65, actualYield: 9.8 } },
      { label: 'High Yield Excellent Laboratory Technique (90% Yield)', values: { anilineMass: 4.65, actualYield: 11.2 } },
    ],
    validate() { return []; },
    steps(p, c) {
      return [
        { title: '1. Weighing & Ice-Cold Dissolution', text: 'Dissolve aniline in dilute HCl and cool below 5°C in an ice-water bath. Slowly add chilled aqueous sodium nitrite with stirring.' },
        { title: '2. Starch-Iodide Spot Test', text: 'Confirm completion with starch-iodide paper: excess HNO₂ oxidizes I⁻ to I₂, forming an intense blue-black starch-polyiodide spot.' },
        { title: '3. Alkaline Coupling & Buchner Filtration', text: 'Pour diazonium salt into ice-cold alkaline β-naphthol solution. Bright scarlet precipitate forms immediately. Filter on Buchner funnel, wash, and dry.' },
      ];
    },
    compute(p) {
      const mAniline = Number(p.anilineMass != null ? p.anilineMass : 4.65);
      const mDye = Number(p.actualYield != null ? p.actualYield : 9.8);

      const mwAniline = 93.13;
      const mwDye = 248.28;

      const molesAniline = mAniline / mwAniline;
      const theoYield = molesAniline * mwDye;
      const pctYield = clamp(Math.round((mDye / theoYield) * 1000) / 10, 5, 99.9);

      return {
        formulas: [
          { name: 'Theoretical Yield Calculation', formula: 'm_theo = (m_aniline / M_aniline) × M_dye', given: `m_aniline = ${mAniline} g`, calc: `(${mAniline} / 93.13) × 248.28`, result: `${theoYield.toFixed(2)}`, unit: 'g' },
          { name: 'Percentage Synthetic Yield', formula: '% Yield = (m_actual / m_theo) × 100%', given: `m_actual = ${mDye} g, m_theo = ${theoYield.toFixed(2)} g`, calc: `(${mDye} / ${theoYield.toFixed(2)}) × 100`, result: `${pctYield.toFixed(1)}%`, unit: '%' },
        ],
        readouts: [
          { label: 'Aniline Mass', value: `${mAniline} g`, tone: 'neutral' },
          { label: 'Theoretical Yield', value: `${theoYield.toFixed(2)} g`, tone: 'neutral' },
          { label: 'Actual Yield', value: `${mDye} g`, tone: 'good' },
          { label: 'Percentage Yield', value: `${pctYield.toFixed(1)} %`, tone: pctYield > 70 ? 'good' : 'warn' },
          { label: 'Dye Quality', value: pctYield > 75 ? 'Pure Scarlet Crystals' : 'Crude Precipitate', tone: 'hi' },
        ],
        state: { mAniline, mDye, theoYield: Math.round(theoYield * 100) / 100, pctYield },
        explain: {
          what: `Azo coupling is a classic organic laboratory synthesis involving electrophilic substitution of a diazonium salt with an activated aromatic coupling partner.`,
          why: `Maintaining the temperature strictly at 0–5°C prevents thermal decomposition of benzenediazonium chloride into phenol and nitrogen gas.`,
          param: `Excess nitrous acid is verified using starch-iodide paper (2 HNO₂ + 2 I⁻ + 2 H⁺ → 2 NO + I₂ + 2 H₂O; I₂ + starch → blue-black complex).`,
          effect: `Coupling in alkaline medium (pH ~ 9.5) converts β-naphthol into the reactive β-naphtholate ion (Ar-O⁻), greatly accelerating electrophilic attack.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');
      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Primary aromatic amine dissolution in ice-cold HCl (0–5 °C)' : step === 1 ? 'Diazotization reaction with sodium nitrite forming diazonium chloride' : 'Alkaline coupling with β-naphthol & scarlet azo dye precipitation');

      D.text(g, 'EXPERIMENT 2: LABORATORY SYNTHESIS OF AZO DYE VIA DIAZOTIZATION', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `Aniline (${st.mAniline} g) → Sudan I Dye · Theo: ${st.theoYield.toFixed(2)} g · Actual: ${st.mDye} g · Yield: ${st.pctYield.toFixed(1)}%`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: Buchner Filtration Assembly
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Vacuum Filtration on Buchner Funnel', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const cx = 270;
      const cy = 290;

      // Filter Flask
      D.poly(g, [
        [cx - 20, cy],
        [cx - 20, cy + 30],
        [cx - 70, cy + 120],
        [cx + 70, cy + 120],
        [cx + 20, cy + 30],
        [cx + 20, cy],
      ], { fill: '#0f172a', stroke: '#94a3b8', width: 2, close: true });

      // Buchner Funnel (Porcelain)
      D.poly(g, [
        [cx - 50, cy - 80],
        [cx + 50, cy - 80],
        [cx + 15, cy],
        [cx - 15, cy],
      ], { fill: '#ffffff', stroke: '#cbd5e1', width: 2, close: true });

      // Bright Orange Dye Cake on filter paper
      D.rect(g, cx - 44, cy - 78, 88, 18, { fill: '#ea580c', r: 3 });
      D.text(g, 'Scarlet Azo Dye Cake', cx, cy - 68, { color: '#ffffff', size: 10, weight: 800, align: 'center' });

      // Vacuum side arm
      D.line(g, cx + 20, cy + 20, cx + 75, cy + 20, { color: '#94a3b8', width: 6 });
      D.text(g, 'To Vacuum Pump', cx + 85, cy + 24, { color: '#38bdf8', size: 10, weight: 700 });

      // Starch-iodide spot test badge
      D.circle(g, cx - 110, cy - 20, 24, { fill: '#1e3a8a', stroke: '#60a5fa', width: 2 });
      D.text(g, 'Starch-I⁻', cx - 110, cy - 26, { color: '#ffffff', size: 9, align: 'center' });
      D.text(g, 'Blue-Black', cx - 110, cy - 12, { color: '#93c5fd', size: 8, weight: 800, align: 'center' });
      D.text(g, '(Excess HNO₂)', cx - 110, cy + 16, { color: '#cbd5e1', size: 9, align: 'center' });

      D.tag(g, `Isolated Yield: ${st.mDye} g (${st.pctYield.toFixed(1)}% of Theoretical)`, cx, 490, { bg: '#0f172a', border: '#ea580c', color: '#ea580c', size: 12, align: 'center' });

      // Right Panel: Yield Analysis
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Synthetic Yield & Mass Balance', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const yBox = [
        { label: 'Initial Aniline Charge', val: `${st.mAniline} g (0.050 mol)`, col: '#cbd5e1' },
        { label: 'Theoretical Product Mass', val: `${st.theoYield.toFixed(2)} g (Sudan I, 248.28 g/mol)`, col: '#facc15' },
        { label: 'Isolated Dry Product', val: `${st.mDye} g`, col: '#ea580c' },
        { label: 'Practical Percentage Yield', val: `${st.pctYield.toFixed(1)} %`, col: '#22c55e' },
      ];

      yBox.forEach((b, i) => {
        const by = 150 + i * 75;
        D.rect(g, 560, by, 395, 65, { fill: '#0f172a', stroke: '#334155', r: 8 });
        D.text(g, b.label, 575, by + 22, { color: '#94a3b8', size: 11, weight: 600 });
        D.text(g, b.val, 575, by + 45, { color: b.col, size: 13, weight: 800 });
      });

      D.rect(g, 560, 445, 395, 60, { fill: '#0f172a', stroke: '#22c55e', r: 8 });
      D.text(g, 'Recrystallization from glacial acetic acid or ethanol', 575, 467, { color: '#22c55e', size: 11, weight: 700 });
      D.text(g, 'yields pure red needles with sharp melting point 131–133°C.', 575, 487, { color: '#cbd5e1', size: 10.5 });
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 25. QUALITATIVE TESTS FOR ORGANIC FUNCTIONAL GROUPS
  // ═════════════════════════════════════════════════════════════════
  S['chem-lab-qualitative-tests'] = {
    live: true,
    approx: 'Functional group identification: NaHCO3 effervescence (RCOOH), Tollens silver mirror (RCHO), Hinsberg / Carbylamine (RNH2).',
    modes: [
      { key: 'acid', label: 'Carboxylic Acid Test (Sodium Bicarbonate Brisk Effervescence CO₂↑)' },
      { key: 'aldehyde', label: 'Aldehyde Test (Tollens\' Silver Mirror / Fehling\'s Red Cu₂O↓)' },
      { key: 'amine', label: 'Primary Amine Test (Carbylamine Isocyanide Foul Odor / Nitrous Acid)' },
    ],
    params: [
      {
        key: 'reagentAdded',
        label: 'Reagent Addition',
        type: 'select',
        default: 'yes',
        options: [
          { value: 'no', label: 'Unreacted Analyte Sample' },
          { value: 'yes', label: 'Add Diagnostic Test Reagent' },
        ],
        help: 'Trigger positive diagnostic chemical confirmation.',
      },
    ],
    examples: [
      { label: 'Carboxylic Acid + NaHCO₃ (CO₂ Effervescence)', values: { mode: 'acid', reagentAdded: 'yes' } },
      { label: 'Aldehyde + Tollens Reagent (Silver Mirror Formation)', values: { mode: 'aldehyde', reagentAdded: 'yes' } },
      { label: 'Primary Amine + CHCl₃/KOH (Carbylamine Test)', values: { mode: 'amine', reagentAdded: 'yes' } },
    ],
    validate() { return []; },
    steps(p, c) {
      return [
        { title: '1. Reagent Mixing', text: 'Add diagnostic test reagent (NaHCO₃ solution, freshly prepared Tollens\' reagent [Ag(NH₃)₂]OH, or alcoholic KOH + CHCl₃) to sample tube.' },
        { title: '2. Chemical Transformation & Observation', text: 'Observe characteristic physical change: brisk gas evolution (CO₂), metallic specular deposition (Ag mirror), or intense red/orange precipitation.' },
        { title: '3. Functional Group Confirmation', text: 'Chemical confirmation rules out competing functional groups and classifies unknown organic compound.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'acid';
      const isAdded = p.reagentAdded === 'yes';

      const tData = {
        acid: { name: 'Carboxylic Acid (−COOH)', reagent: 'Sat. NaHCO₃ Solution', observation: isAdded ? 'Brisk Effervescence of CO₂ Gas' : 'Colorless Solution', reaction: 'R-COOH + NaHCO₃ → R-COONa + H₂O + CO₂↑' },
        aldehyde: { name: 'Aldehyde (−CHO)', reagent: 'Tollens\' Ammoniacal Silver Nitrate', observation: isAdded ? 'Gleaming Silver Mirror Coating Tube' : 'Clear Solution', reaction: 'R-CHO + 2 [Ag(NH₃)₂]⁺ + 3 OH⁻ → R-COO⁻ + 2 Ag(s)↓ + 4 NH₃ + 2 H₂O' },
        amine: { name: 'Primary Amine (−NH₂)', reagent: 'CHCl₃ + Alcoholic KOH (Heat)', observation: isAdded ? 'Extremely Foul Odor of Isocyanide' : 'Pale Yellow Solution', reaction: 'R-NH₂ + CHCl₃ + 3 KOH → R-NC + 3 KCl + 3 H₂O' },
      }[mode];

      return {
        formulas: [
          { name: 'Diagnostic Chemical Equation', formula: tData.reaction, given: `Analyte: ${tData.name}`, calc: isAdded ? 'Positive Confirmation' : 'Pending Reagent', result: isAdded ? 'Positive' : 'Blank', unit: 'test' },
        ],
        readouts: [
          { label: 'Functional Group', value: tData.name.split(' ')[0], tone: 'hi' },
          { label: 'Reagent Used', value: tData.reagent.split(' ')[0], tone: 'neutral' },
          { label: 'Result', value: isAdded ? 'Positive (+)' : 'Unreacted', tone: isAdded ? 'good' : 'warn' },
          { label: 'Observation', value: tData.observation.split(' ')[0], tone: 'good' },
        ],
        state: { mode, isAdded, ...tData },
        explain: {
          what: `Qualitative organic functional group tests exploit selective chemical reactions to produce unmistakable visual or sensory confirmations.`,
          why: `Carboxylic acids are stronger acids than carbonic acid (pKa ~ 6.4), displacing CO₂ gas from bicarbonate. Aldehydes are easily oxidized, reducing silver diamine cations to metallic silver.`,
          param: `Tollens' reagent must be freshly prepared because dry ammoniacal silver residues can form explosive silver fulminate / nitride complexes.`,
          effect: `Carbylamine test is specific to 1° amines; secondary and tertiary amines lack the two acidic protons on nitrogen required to eliminate HCl and form isocyanides.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');
      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Add diagnostic analytical reagent to organic test specimen' : step === 1 ? 'Thermal activation / water bath incubation & intermediate formation' : 'Characteristic observation: effervescence, silver mirror, or azo dye');

      // Animated rising effervescence bubbles or silver precipitate sparkles
      g.save();
      const testX = 220;
      const testY = 320;
      for (let b = 0; b < 14; b++) {
        const bx = testX - 18 + ((b * 19 + t * 25) % 36);
        const by = testY + 60 - ((b * 22 + t * 45) % 110);
        g.beginPath();
        g.arc(bx, by, 2 + (b % 3), 0, Math.PI * 2);
        g.fillStyle = 'rgba(255, 255, 255, 0.6)';
        g.fill();
      }
      g.restore();

      D.text(g, 'EXPERIMENT 3: QUALITATIVE TESTS FOR ACIDS, ALDEHYDES & AMINES', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `${st.name} · Reagent: ${st.reagent} · ${st.observation}`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: Test Tube Reaction
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, `Diagnostic Reaction in Test Tube`, 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const cx = 270;
      const cy = 290;

      // Test Tube Outline
      const ttX = cx - 25;
      const ttY = 140;
      const ttW = 50;
      const ttH = 260;

      D.poly(g, [
        [ttX, ttY],
        [ttX, ttY + ttH - 25],
        [ttX + 10, ttY + ttH],
        [ttX + ttW - 10, ttY + ttH],
        [ttX + ttW, ttY + ttH - 25],
        [ttX + ttW, ttY],
      ], { fill: 'rgba(15,23,42,0.6)', stroke: '#94a3b8', width: 2.5 });

      if (st.isAdded) {
        if (st.mode === 'acid') {
          // Liquid + CO2 Bubbles
          D.rect(g, ttX + 3, ttY + 120, ttW - 6, ttH - 125, { fill: 'rgba(56,189,248,0.25)', r: 6 });
          for (let b = 0; b < 14; b++) {
            const bx = ttX + 8 + (b * 11) % (ttW - 16);
            const by = ttY + 140 + ((b * 19) % 100);
            D.circle(g, bx, by, 3.5, { fill: '#ffffff', stroke: '#38bdf8', width: 1 });
          }
          D.text(g, 'Brisk CO₂↑ Bubbling', cx, ttY + 70, { color: '#38bdf8', size: 11, weight: 800, align: 'center' });
        } else if (st.mode === 'aldehyde') {
          // Silver mirror lining test tube walls
          D.rect(g, ttX + 2, ttY + 80, ttW - 4, ttH - 85, { fill: 'rgba(203,213,225,0.75)', stroke: '#ffffff', width: 2, r: 4 });
          D.text(g, 'Ag(s) Metallic Mirror', cx, ttY + 180, { color: '#0f172a', size: 11, weight: 900, align: 'center' });
        } else {
          // Carbylamine foul vapor
          D.rect(g, ttX + 3, ttY + 120, ttW - 6, ttH - 125, { fill: 'rgba(234,179,8,0.3)', r: 6 });
          D.text(g, 'R-NC Foul Vapor', cx, ttY + 80, { color: '#facc15', size: 11, weight: 800, align: 'center' });
        }
      } else {
        D.rect(g, ttX + 3, ttY + 160, ttW - 6, ttH - 165, { fill: 'rgba(56,189,248,0.15)', r: 6 });
        D.text(g, 'Unreacted Analyte', cx, ttY + 220, { color: '#94a3b8', size: 10, align: 'center' });
      }

      D.tag(g, st.observation, cx, 490, { bg: '#0f172a', border: st.isAdded ? '#22c55e' : '#64748b', color: st.isAdded ? '#22c55e' : '#cbd5e1', size: 12, align: 'center' });

      // Right Panel: Chemistry
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Reaction Mechanism & Principle', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

      D.rect(g, 560, 145, 395, 140, { fill: '#0f172a', stroke: '#334155', r: 8 });
      D.text(g, `Governing Equation:`, 575, 172, { color: '#facc15', size: 12, weight: 800 });
      D.text(g, st.reaction, 575, 198, { color: '#38bdf8', size: 10.5, weight: 600 });
      D.text(g, `Reagent: ${st.reagent}`, 575, 226, { color: '#cbd5e1', size: 11 });
      D.text(g, `Diagnostic Status: ${st.isAdded ? 'CONFIRMED (+)' : 'PENDING'}`, 575, 252, { color: st.isAdded ? '#22c55e' : '#94a3b8', size: 11, weight: 800 });

      D.rect(g, 560, 310, 395, 195, { fill: '#0f172a', stroke: '#334155', r: 8 });
      D.text(g, 'Diagnostic Discrimination Rules:', 575, 335, { color: '#f8fafc', size: 12, weight: 700 });
      D.text(g, '• Phenols do NOT effervesce with NaHCO₃ (too weakly acidic).', 575, 365, { color: '#cbd5e1', size: 11 });
      D.text(g, '• Ketones give negative Tollens test (no oxidizable aldehyde H).', 575, 395, { color: '#cbd5e1', size: 11 });
      D.text(g, '• Secondary/tertiary amines give negative carbylamine tests.', 575, 425, { color: '#cbd5e1', size: 11 });
      D.text(g, '• Hinsberg test separates 1° (soluble in alkali), 2° (insoluble),', 575, 455, { color: '#38bdf8', size: 10.5 });
      D.text(g, '  and 3° amines (unreacted).', 575, 475, { color: '#38bdf8', size: 10.5 });
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 26. MOLECULAR WEIGHT OF POLYMER VIA OSTWALD VISCOMETER (UPGRADED)
  // ═════════════════════════════════════════════════════════════════
  S['chem-lab-viscometer-mw'] = {
  live: true,
  approx: 'Poiseuille capillary flow with gravitational hydrostatic driving head. Mark-Houwink equation [η] = K·Mv^a (PVA: K = 4.28×10⁻⁴ dL/g, a = 0.64). Huggins equation η_sp/c = [η] + k_H [η]² c.',
  modes: [
    { key: 'pva_water', label: 'Poly(vinyl alcohol) (PVA in Water at 30°C)' },
    { key: 'ps_toluene', label: 'Polystyrene in Toluene (K = 1.10×10⁻⁴, a = 0.725)' },
  ],
  params: [
    {
      key: 'concentration',
      label: 'Polymer Concentration c (g/dL)',
      type: 'range',
      default: 0.6,
      min: 0.1,
      max: 1.2,
      step: 0.1,
      unit: 'g/dL',
      help: 'Concentration of polymer solution loaded into Ostwald viscometer.',
    },
  ],
  actions: [
    { key: 'suction', label: '⬆ Draw to Mark A', title: 'Suction liquid above Mark A using pipette bulb' },
    { key: 'start_efflux', label: '⏱ Start Efflux', title: 'Release meniscus and start stopwatch' },
    { key: 'pause_efflux', label: '⏸ Pause Timing', title: 'Pause stopwatch timing' },
    { key: 'reset_efflux', label: '🔄 Reset All', title: 'Reset stopwatch and refill viscometer' },
  ],
  examples: [
    { label: 'PVA Solution (c = 0.6 g/dL, t = 88.4 s)', values: { mode: 'pva_water', concentration: 0.6 } },
    { label: 'Pure Solvent Water Baseline (c = 0.0 g/dL, t₀ = 60.0 s)', values: { mode: 'pva_water', concentration: 0.1 } },
  ],
  validate() { return []; },
  onAction(action, state) {
    if (action === 'suction') {
      _viscLevel = 0.05;
      _viscElapsed = 0;
      _viscRunning = false;
      _timingFinished = false;
      return { redraw: true, toast: 'Liquid drawn above Mark A using suction bulb' };
    }
    if (action === 'start_efflux') {
      _viscRunning = true;
      _timingFinished = false;
      return { redraw: true, toast: 'Stopwatch STARTED — timing efflux between Mark A & B' };
    }
    if (action === 'pause_efflux') {
      _viscRunning = false;
      return { redraw: true, toast: 'Stopwatch PAUSED at ' + _viscElapsed.toFixed(2) + ' s' };
    }
    if (action === 'reset_efflux') {
      _viscRunning = false;
      _viscElapsed = 0;
      _viscLevel = 0.05;
      _timingFinished = false;
      return { redraw: true, toast: 'Stopwatch and viscometer level reset' };
    }
  },
  onClick(x, y, state) {
    if (x >= 340 && x <= 490 && y >= 110 && y <= 220) {
      _viscRunning = !_viscRunning;
      return { redraw: true, toast: _viscRunning ? 'Stopwatch started' : 'Stopwatch paused' };
    }
  },
  steps(p, c) {
    return [
      { title: '1. Solvent Efflux Baseline (t₀)', text: 'Measure efflux time t₀ of pure solvent (water) draining between upper Mark A and lower Mark B through the precision capillary (t₀ = 60.0 s at 30°C).' },
      { title: '2. Polymer Solutions Efflux (t)', text: 'Determine efflux times t for multiple polymer concentrations (0.2, 0.4, 0.6, 0.8, 1.0 g/dL). Calculate specific viscosity η_sp = (t - t₀)/t₀ and reduced viscosity η_red = η_sp/c.' },
      { title: '3. Huggins Extrapolation & Mark-Houwink Mv', text: 'Plot η_sp/c vs c. Extrapolate to c → 0 to obtain the intrinsic viscosity [η]. Compute viscosity-average molecular weight via Mark-Houwink: Mv = ([η]/K)^(1/a).' },
    ];
  },
  compute(p) {
    const c = Number(p.concentration != null ? p.concentration : 0.6);
    const t0 = 60.0;
    const intrinsicEta = 0.85;
    const kH = 0.35;
    const kK = 0.15;

    const etaRed = intrinsicEta + kH * Math.pow(intrinsicEta, 2) * c;
    const etaSp = etaRed * c;
    const tSoln = t0 * (1 + etaSp);
    const etaInh = intrinsicEta - kK * Math.pow(intrinsicEta, 2) * c;

    const K = 4.28e-4;
    const a = 0.64;
    const Mv = Math.round(Math.pow(intrinsicEta / K, 1 / a));
    const DP = Math.round(Mv / 44.05);

    return {
      formulas: [
        { name: 'Specific & Reduced Viscosity', formula: 'η_sp = (t - t₀)/t₀  |  η_red = η_sp / c', given: 't = ' + tSoln.toFixed(1) + ' s, t₀ = ' + t0.toFixed(1) + ' s, c = ' + c + ' g/dL', calc: '(' + tSoln.toFixed(1) + ' - 60) / 60', result: '' + etaRed.toFixed(3), unit: 'dL/g' },
        { name: 'Mark-Houwink Equation', formula: '[η] = K × M_v^a ⟹ M_v = ([η]/K)^(1/a)', given: '[η] = ' + intrinsicEta + ' dL/g, K = ' + K + ', a = ' + a, calc: '(' + intrinsicEta + ' / ' + K + ')^(1 / ' + a + ')', result: '' + Mv.toLocaleString(), unit: 'g/mol' },
        { name: 'Degree of Polymerization (DP)', formula: 'DP = M_v / M_monomer', given: 'M_monomer(PVA) = 44.05 g/mol', calc: '' + Mv + ' / 44.05', result: '' + DP.toLocaleString(), unit: 'units' },
      ],
      readouts: [
        { label: 'Calculated Efflux t', value: tSoln.toFixed(1) + ' s', tone: 'hi' },
        { label: 'Solvent Time t₀', value: t0.toFixed(1) + ' s', tone: 'neutral' },
        { label: 'Reduced Viscosity', value: etaRed.toFixed(3) + ' dL/g', tone: 'good' },
        { label: 'Intrinsic Viscosity [η]', value: intrinsicEta + ' dL/g', tone: 'hi' },
        { label: 'Viscosity Avg Mw (Mv)', value: Mv.toLocaleString() + ' g/mol', tone: 'good' },
      ],
      state: { c, t0, tSoln, etaSp, etaRed, etaInh, intrinsicEta, Mv, DP },
      explain: {
        what: 'An Ostwald capillary viscometer quantifies polymer solution flow time under a reproducible gravitational head, determining molecular hydrodynamic dimensions.',
        why: 'As polymer chains dissolve, they form coiled hydrodynamic spheres that resist laminar shear flow, lengthening the efflux time proportionally to concentration and molar mass.',
        param: 'Poly(vinyl alcohol) concentration directly modulates solution drag; higher concentrations amplify macromolecular chain entanglements.',
        effect: 'The Huggins line (η_sp/c vs c) and Kraemer line (ln(η_rel)/c vs c) extrapolate back to the common vertical intercept [η] at infinite dilution (c → 0).',
      },
    };
  },
  draw(g, S) {
    const { p, c, t } = S;
    const step = S.step || 0;
    D.clear(g, '#0b1120');
    const st = c.state;

    // Step HUD
    drawStepHUD(g, S, step === 0 ? 'Pure solvent efflux time measurement between upper (A) & lower (B) marks' : step === 1 ? 'Polymer solutions of graded concentration: relative & specific viscosity' : 'Huggins-Kraemer extrapolation to intrinsic viscosity [η] & Mark-Houwink Mw');

    if (_viscRunning) {
      const drainRate = 0.0035 / (1.0 + st.etaSp * 0.7);
      _viscLevel += drainRate;
      _viscElapsed += 0.045;
      if (_viscLevel >= 0.85) {
        _viscLevel = 0.85;
        _viscRunning = false;
        _timingFinished = true;
      }
    }

    D.text(g, 'EXPERIMENT 4: POLYMER MOLECULAR WEIGHT BY OSTWALD VISCOMETER', 30, 36, { color: '#38bdf8', size: 19, weight: 800 });
    D.text(g, 'PVA in Water (30°C)  •  c = ' + st.c.toFixed(1) + ' g/dL  •  Efflux t = ' + st.tSoln.toFixed(1) + ' s  •  [η] = ' + st.intrinsicEta + ' dL/g  •  Mv = ' + st.Mv.toLocaleString() + ' g/mol', 30, 62, { color: '#94a3b8', size: 12.5, weight: 600 });

    // ═════════════════════════════════════════════════════════════
    // LEFT PANEL: THERMOSTATIC WATER BATH & OSTWALD VISCOMETER
    // ═════════════════════════════════════════════════════════════
    D.rect(g, 24, 85, 500, 440, { fill: '#131d2e', stroke: '#1e293b', r: 12 });
    D.text(g, 'Thermostatic Water Bath (30.0°C) & Viscometer', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

    const cx = 200;

    const tankX = cx - 110;
    const tankY = 130;
    const tankW = 220;
    const tankH = 340;

    g.save();
    const tankGrad = g.createLinearGradient(tankX, tankY, tankX, tankY + tankH);
    tankGrad.addColorStop(0, 'rgba(20, 184, 166, 0.08)');
    tankGrad.addColorStop(0.5, 'rgba(20, 184, 166, 0.16)');
    tankGrad.addColorStop(1, 'rgba(15, 118, 110, 0.24)');
    g.fillStyle = tankGrad;
    g.beginPath();
    g.roundRect(tankX, tankY, tankW, tankH, 8);
    g.fill();

    g.strokeStyle = 'rgba(45, 212, 191, 0.4)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(tankX + 4, tankY + 20);
    for (let wx = tankX + 4; wx <= tankX + tankW - 4; wx += 20) {
      const wy = tankY + 20 + Math.sin(t * 3 + wx * 0.1) * 2;
      g.lineTo(wx, wy);
    }
    g.stroke();

    g.strokeStyle = '#334155';
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(tankX, tankY, tankW, tankH, 8);
    g.stroke();

    const thX = tankX + 22;
    g.fillStyle = '#0f172a';
    g.strokeStyle = '#94a3b8';
    g.lineWidth = 1.2;
    g.beginPath();
    g.roundRect(thX - 4, tankY + 15, 8, 260, 4);
    g.fill();
    g.stroke();
    g.fillStyle = '#ef4444';
    g.fillRect(thX - 1.5, tankY + 110, 3, 165);
    D.circle(g, thX, tankY + 278, 6, { fill: '#ef4444' });
    D.text(g, '30.0°C', thX - 6, tankY + 8, { color: '#2dd4bf', size: 9, weight: 700, align: 'center' });
    g.restore();

    // ─── GLASS OSTWALD VISCOMETER ───
    const l1X = cx - 42;
    const l2X = cx + 42;
    const viscTopY = 150;
    const viscBotY = 430;

    g.save();
    const bulbCenterY = 235;
    const bulbR = 24;

    const menY = bulbCenterY - bulbR + (_viscLevel / 0.85) * (bulbR * 2 + 10);

    g.fillStyle = 'rgba(56, 189, 248, 0.42)';
    g.beginPath();
    g.arc(l1X, bulbCenterY, bulbR - 2, 0, Math.PI * 2);
    g.fill();

    if (menY > bulbCenterY - bulbR) {
      g.fillStyle = 'rgba(15, 23, 42, 0.7)';
      g.beginPath();
      g.rect(l1X - bulbR, bulbCenterY - bulbR, bulbR * 2, menY - (bulbCenterY - bulbR));
      g.fill();
    }

    g.strokeStyle = '#facc15';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(l1X, clamp(menY, bulbCenterY - bulbR + 2, bulbCenterY + bulbR - 2), 16, 3, 0, 0, Math.PI);
    g.stroke();

    g.strokeStyle = '#cbd5e1';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(l1X - 6, viscTopY);
    g.lineTo(l1X - 6, bulbCenterY - bulbR);
    g.moveTo(l1X + 6, viscTopY);
    g.lineTo(l1X + 6, bulbCenterY - bulbR);
    g.stroke();

    D.circle(g, l1X, bulbCenterY, bulbR, { fill: 'transparent', stroke: '#cbd5e1', width: 2.2 });

    const markAY = bulbCenterY - 14;
    D.line(g, l1X - 16, markAY, l1X + 16, markAY, { color: '#facc15', width: 2.5 });
    D.text(g, 'Mark A', l1X - 22, markAY, { color: '#facc15', size: 10, weight: 800, align: 'right' });

    const markBY = bulbCenterY + 16;
    D.line(g, l1X - 16, markBY, l1X + 16, markBY, { color: '#facc15', width: 2.5 });
    D.text(g, 'Mark B', l1X - 22, markBY, { color: '#facc15', size: 10, weight: 800, align: 'right' });

    const capTopY = bulbCenterY + bulbR;
    const capBotY = viscBotY - 20;
    g.fillStyle = 'rgba(56, 189, 248, 0.7)';
    g.fillRect(l1X - 1.5, capTopY, 3, capBotY - capTopY);

    g.strokeStyle = '#38bdf8';
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(l1X - 2, capTopY);
    g.lineTo(l1X - 2, capBotY);
    g.moveTo(l1X + 2, capTopY);
    g.lineTo(l1X + 2, capBotY);
    g.stroke();
    D.text(g, 'Capillary (r = 0.25 mm)', l1X - 24, (capTopY + capBotY) / 2, { color: '#38bdf8', size: 9, weight: 700, align: 'right' });

    g.strokeStyle = '#cbd5e1';
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(l1X - 2, capBotY);
    g.quadraticCurveTo(cx, viscBotY + 8, l2X - 10, capBotY);
    g.moveTo(l1X + 2, capBotY);
    g.quadraticCurveTo(cx, viscBotY - 4, l2X + 10, capBotY);
    g.stroke();

    const resBulbY = 345;
    const resR = 30;
    D.circle(g, l2X, resBulbY, resR - 2, { fill: 'rgba(56, 189, 248, 0.42)' });
    D.circle(g, l2X, resBulbY, resR, { stroke: '#cbd5e1', width: 2.2 });

    g.strokeStyle = '#cbd5e1';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(l2X - 10, viscTopY);
    g.lineTo(l2X - 10, resBulbY - resR);
    g.moveTo(l2X + 10, viscTopY);
    g.lineTo(l2X + 10, resBulbY - resR);
    g.stroke();
    D.text(g, 'Reservoir Bulb', l2X + 36, resBulbY, { color: '#94a3b8', size: 9.5, weight: 600 });
    g.restore();

    const swX = 330;
    const swY = 125;
    const swW = 175;
    const swH = 110;
    g.save();
    g.fillStyle = '#0f172a';
    g.strokeStyle = _viscRunning ? '#22c55e' : '#facc15';
    g.lineWidth = 2.2;
    g.beginPath();
    g.roundRect(swX, swY, swW, swH, 10);
    g.fill();
    g.stroke();

    D.text(g, 'DIGITAL PRECISION TIMER', swX + 12, swY + 18, { color: '#94a3b8', size: 9, weight: 700 });

    g.fillStyle = '#022c22';
    g.strokeStyle = '#059669';
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(swX + 10, swY + 30, swW - 20, 44, 4);
    g.fill();
    g.stroke();

    const displaySec = _viscRunning || _viscElapsed > 0 ? _viscElapsed : st.tSoln;
    const m = Math.floor(displaySec / 60);
    const s = (displaySec % 60).toFixed(2).padStart(5, '0');
    D.text(g, (m < 10 ? '0' + m : m) + ':' + s + ' s', swX + swW / 2, swY + 52, { color: '#facc15', size: 21, weight: 900, align: 'center' });

    const timerStatus = _viscRunning ? 'RUNNING (EFFLUX)' : (_timingFinished ? 'EFFLUX RECORDED' : 'READY / STANDBY');
    const statusCol = _viscRunning ? '#22c55e' : (_timingFinished ? '#38bdf8' : '#facc15');
    D.text(g, 'STATUS: ' + timerStatus, swX + 14, swY + 92, { color: statusCol, size: 9.5, weight: 700 });
    g.restore();

    const callX = 415;
    const callY = 320;
    D.rect(g, callX - 75, callY - 50, 150, 100, { fill: '#0f172a', stroke: '#1e293b', r: 8 });
    D.text(g, 'Polymer Coil Dynamics', callX, callY - 34, { color: '#facc15', size: 9.5, weight: 700, align: 'center' });
    g.save();
    for (let ch = 0; ch < 5; ch++) {
      const py = callY - 14 + ch * 12;
      g.strokeStyle = '#38bdf8';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(callX - 55, py);
      const wave = Math.sin(t * 4 + ch) * 4;
      g.bezierCurveTo(callX - 20, py + wave, callX + 20, py - wave, callX + 55, py);
      g.stroke();
    }
    D.text(g, 'Poiseuille Shear Flow', callX, callY + 40, { color: '#94a3b8', size: 8.5, weight: 600, align: 'center' });
    g.restore();

    D.tag(g, 'η_red = (' + st.tSoln.toFixed(1) + ' - 60)/60 / ' + st.c + ' = ' + st.etaRed.toFixed(3) + ' dL/g', cx, 496, { bg: '#0f172a', border: '#38bdf8', color: '#38bdf8', size: 11, align: 'center' });

    // ═════════════════════════════════════════════════════════════
    // RIGHT PANEL: DUAL HUGGINS & KRAEMER EXTRAPOLATION GRAPH
    // ═════════════════════════════════════════════════════════════
    D.rect(g, 540, 85, 435, 440, { fill: '#131d2e', stroke: '#1e293b', r: 12 });
    D.text(g, 'Huggins & Kraemer Extrapolation Plot (c → 0)', 558, 110, { color: '#f8fafc', size: 13.5, weight: 700 });

    const rx = 595;
    const ry = 430;
    const rw = 330;
    const rh = 250;

    g.save();
    g.strokeStyle = '#1e293b';
    g.lineWidth = 1;
    for (let etaVal = 0.6; etaVal <= 1.3; etaVal += 0.1) {
      const gy = ry - ((etaVal - 0.6) / 0.7) * rh;
      g.beginPath();
      g.moveTo(rx, gy);
      g.lineTo(rx + rw, gy);
      g.stroke();
      D.text(g, etaVal.toFixed(1), rx - 8, gy, { color: '#64748b', size: 9.5, align: 'right' });
    }
    for (let cVal = 0; cVal <= 1.2; cVal += 0.2) {
      const gx = rx + (cVal / 1.2) * rw;
      g.beginPath();
      g.moveTo(gx, ry);
      g.lineTo(gx, ry - rh);
      g.stroke();
      D.text(g, cVal.toFixed(1), gx, ry + 15, { color: '#64748b', size: 9.5, align: 'center' });
    }

    g.strokeStyle = '#475569';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(rx, ry);
    g.lineTo(rx + rw, ry);
    g.moveTo(rx, ry);
    g.lineTo(rx, ry - rh);
    g.stroke();
    g.restore();

    D.text(g, 'Polymer Concentration c (g/dL)', rx + rw / 2, ry + 32, { color: '#94a3b8', size: 10.5, weight: 600, align: 'center' });
    D.text(g, 'η_red, η_inh (dL/g)', rx - 14, ry - rh - 4, { color: '#38bdf8', size: 10, weight: 700, align: 'center' });

    const y0 = ry - ((st.intrinsicEta - 0.6) / 0.7) * rh;

    const hugEndEta = st.intrinsicEta + 0.35 * Math.pow(st.intrinsicEta, 2) * 1.2;
    const hugY1 = ry - ((hugEndEta - 0.6) / 0.7) * rh;
    D.line(g, rx, y0, rx + rw, hugY1, { color: '#38bdf8', width: 3 });
    D.text(g, 'Huggins: η_sp/c', rx + rw - 10, hugY1 - 10, { color: '#38bdf8', size: 10, weight: 700, align: 'right' });

    const kraEndEta = st.intrinsicEta - 0.15 * Math.pow(st.intrinsicEta, 2) * 1.2;
    const kraY1 = ry - ((kraEndEta - 0.6) / 0.7) * rh;
    D.line(g, rx, y0, rx + rw, kraY1, { color: '#a855f7', width: 2.2, dash: [4, 4] });
    D.text(g, 'Kraemer: (ln η_rel)/c', rx + rw - 10, kraY1 + 14, { color: '#a855f7', size: 10, weight: 700, align: 'right' });

    D.circle(g, rx, y0, 6, { fill: '#facc15', stroke: '#0f172a', width: 2 });
    D.text(g, '[η] = ' + st.intrinsicEta + ' dL/g (c → 0)', rx + 14, y0 - 10, { color: '#facc15', size: 11, weight: 800 });

    const curX = rx + (st.c / 1.2) * rw;
    const curY = ry - ((st.etaRed - 0.6) / 0.7) * rh;
    g.save();
    g.setLineDash([3, 3]);
    D.line(g, curX, ry, curX, curY, { color: 'rgba(34, 197, 94, 0.6)', width: 1.5 });
    D.line(g, rx, curY, curX, curY, { color: 'rgba(34, 197, 94, 0.6)', width: 1.5 });
    g.restore();

    D.circle(g, curX, curY, 6.5, { fill: '#22c55e', stroke: '#ffffff', width: 2 });
    D.text(g, 'c = ' + st.c + ' g/dL', curX, curY - 14, { color: '#22c55e', size: 10, weight: 800, align: 'center' });

    D.rect(g, 555, ry + 42, 405, 38, { fill: '#0f172a', stroke: '#1e293b', r: 6 });
    D.text(g, 'Mv = (' + st.intrinsicEta + ' / 4.28e-4)^(1/0.64) = ' + st.Mv.toLocaleString() + ' g/mol  •  DP = ' + st.DP.toLocaleString(), 570, ry + 61, { color: '#38bdf8', size: 10.5, weight: 700 });
  },
};

  // ═════════════════════════════════════════════════════════════════
  // 27. RATE CONSTANT OF ACID-CATALYSED HYDROLYSIS OF AN ESTER
  // ═════════════════════════════════════════════════════════════════
  S['chem-lab-ester-hydrolysis'] = {
    live: true,
    approx: 'Pseudo-first-order ester hydrolysis k = (2.303 / t) * log10((V_inf - V0) / (V_inf - Vt)). Water in vast excess [H2O] ~ 55.5 M.',
    modes: [
      { key: 'methyl_acetate', label: 'Methyl Acetate Hydrolysis (0.5 N HCl catalyst at 30°C)' },
      { key: 'ethyl_acetate', label: 'Ethyl Acetate Hydrolysis' },
    ],
    params: [
      {
        key: 'samplingTime',
        label: 'Sampling Time t (min)',
        type: 'range',
        default: 20,
        min: 0,
        max: 60,
        step: 5,
        unit: 'min',
        help: 'Time after mixing ester and acid catalyst when 5 mL aliquot is pipetted out and titrated.',
      },
      {
        key: 'rateConstant',
        label: 'Rate Constant k (min⁻¹)',
        type: 'range',
        default: 0.015,
        min: 0.005,
        max: 0.035,
        step: 0.002,
        unit: 'min⁻¹',
        help: 'Pseudo-first order kinetic constant.',
      },
    ],
    examples: [
      { label: 'Initial Reading V₀ (t = 0 min, only HCl titrated)', values: { samplingTime: 0, rateConstant: 0.015 } },
      { label: 'Intermediate Aliquot (t = 20 min)', values: { samplingTime: 20, rateConstant: 0.015 } },
      { label: 'Infinity Reading V_inf (Boiled sample, 100% hydrolysis)', values: { samplingTime: 60, rateConstant: 0.015 } },
    ],
    validate() { return []; },
    steps(p, c) {
      return [
        { title: '1. Zero-Minute Aliquot (V₀)', text: 'Pipette 5 mL of ester-acid mixture immediately into ice-cold water to quench reaction. Titrate with 0.1 N NaOH to phenolphthalein end point. V₀ represents only the catalyst HCl.' },
        { title: '2. Time Aliquots (Vt at 10, 20, 30, 40 min)', text: 'As hydrolysis produces CH₃COOH, the titre value Vt steadily rises: CH₃COOCH₃ + H₂O → CH₃COOH + CH₃OH.' },
        { title: '3. Infinity Reading (V_inf) & Kinetic Plot', text: 'Heat remaining mixture to 60°C for 20 min to achieve complete hydrolysis (V_inf). Plot log(V_inf − Vt) vs t to determine k from slope = −k / 2.303.' },
      ];
    },
    compute(p) {
      const t = Number(p.samplingTime != null ? p.samplingTime : 20);
      const k = Number(p.rateConstant != null ? p.rateConstant : 0.015);

      const v0 = 10.2; // mL (HCl catalyst)
      const vInf = 38.5; // mL (complete hydrolysis)
      const a = vInf - v0; // 28.3 mL proportional to initial ester

      // (vInf - vt) = a * exp(-k * t) -> vt = vInf - a * exp(-k * t)
      const vt = vInf - a * Math.exp(-k * t);
      const logTerm = Math.log10(Math.max(0.1, vInf - vt));

      return {
        formulas: [
          { name: 'Pseudo-First-Order Rate Equation', formula: 'k = (2.303 / t) · log₁₀((V_inf − V₀) / (V_inf − V_t))', given: `V₀ = ${v0} mL, V_inf = ${vInf} mL, V_t = ${vt.toFixed(2)} mL at t = ${t} min`, calc: `(2.303 / ${t || 1}) × log₁₀(${a.toFixed(1)} / ${(vInf - vt).toFixed(2)})`, result: `${k.toFixed(4)}`, unit: 'min⁻¹' },
        ],
        readouts: [
          { label: 'Time t', value: `${t} min`, tone: 'neutral' },
          { label: 'Titre Value Vt', value: `${vt.toFixed(2)} mL`, tone: 'hi' },
          { label: 'V₀ (Catalyst HCl)', value: `${v0} mL`, tone: 'neutral' },
          { label: 'V_inf (Complete)', value: `${vInf} mL`, tone: 'good' },
          { label: 'Rate Constant k', value: `${k.toFixed(4)} min⁻¹`, tone: 'hi' },
        ],
        state: { t, k, v0, vInf, vt: Math.round(vt * 100) / 100, logTerm: Math.round(logTerm * 100) / 100 },
        explain: {
          what: `The acid-catalyzed hydrolysis of methyl acetate is a second-order reaction made pseudo-first-order because water is in vast excess ([H₂O] ~ 55.5 M) and its concentration remains essentially constant.`,
          why: `The acid catalyst HCl does not change in concentration, so the increase in titre volume (Vt − V0) is directly proportional to the acetic acid generated.`,
          param: `Infinity reading V_inf represents 100% conversion of ester into acetic acid plus the background HCl catalyst.`,
          effect: `Plotting log(V_inf − Vt) vs time gives a straight line with slope −k/2.303, demonstrating first-order dependency on ester concentration.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');
      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Ethyl acetate & HCl reaction mixture in constant temperature thermostat' : step === 1 ? 'Periodic aliquot withdrawal, ice quenching & standard NaOH titration' : 'Logarithmic kinetic plot: pseudo-first-order rate constant (k)');

      D.text(g, 'EXPERIMENT 5: KINETICS OF ACID-CATALYSED ESTER HYDROLYSIS', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `t = ${st.t} min · Titre Vt = ${st.vt.toFixed(2)} mL (V₀ = ${st.v0} mL, V_inf = ${st.vInf} mL) · k = ${st.k.toFixed(4)} min⁻¹`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: Conical Flask Titration Setup
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Aliquot Titration against 0.1 N NaOH', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const cx = 270;
      const cy = 290;

      // Burette
      D.rect(g, cx - 10, 135, 20, 150, { fill: '#ffffff', stroke: '#94a3b8', width: 1.5 });
      const fillH = clamp((st.vt / 45) * 120, 5, 140);
      D.rect(g, cx - 8, 135 + fillH, 16, 150 - fillH, { fill: 'rgba(56,189,248,0.4)' });
      D.text(g, `Burette: ${st.vt.toFixed(2)} mL`, cx + 25, 175, { color: '#facc15', size: 12, weight: 800 });

      // Conical Flask
      D.poly(g, [
        [cx - 15, 305],
        [cx - 15, 325],
        [cx - 65, 420],
        [cx + 65, 420],
        [cx + 15, 325],
        [cx + 15, 305],
      ], { fill: 'rgba(236,72,153,0.3)', stroke: '#94a3b8', width: 2, close: true });
      D.text(g, 'CH₃COOH + HCl Titrated', cx, 400, { color: '#f8fafc', size: 10, weight: 700, align: 'center' });

      D.tag(g, `Rate Constant k = ${st.k.toFixed(4)} min⁻¹ (Pseudo-First-Order)`, cx, 490, { bg: '#0f172a', border: '#38bdf8', color: '#38bdf8', size: 12, align: 'center' });

      // Right Panel: log(V_inf - Vt) vs t Plot
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Diagnostic Linear Plot: log₁₀(V_inf − Vt) vs Time', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const rx = 595;
      const ry = 440;
      const rw = 340;
      const rh = 260;

      D.line(g, rx, ry, rx + rw, ry, { color: '#475569', width: 1.5 });
      D.line(g, rx, ry, rx, ry - rh, { color: '#475569', width: 1.5 });
      D.text(g, 'Time t (min)', rx + rw - 35, ry + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
      D.text(g, 'log₁₀(V_inf − Vt)', rx - 10, ry - rh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

      // Plot line from t = 0 to 60 min
      const maxLog = Math.log10(st.vInf - st.v0); // log10(28.3) ~ 1.45
      const minLog = Math.log10(st.vInf - (st.vInf - 28.3 * Math.exp(-st.k * 60))); // ~ 1.05

      const lP1 = [rx, ry - rh + 30];
      const lP2 = [rx + rw, ry - 30];
      D.line(g, lP1[0], lP1[1], lP2[0], lP2[1], { color: '#38bdf8', width: 3 });

      // Current sample point
      const curX = rx + (st.t / 60) * rw;
      const curY = lP1[1] + (st.t / 60) * (lP2[1] - lP1[1]);
      D.line(g, curX, ry, curX, curY, { color: '#facc15', width: 1.5, dash: [3, 3] });
      D.circle(g, curX, curY, 6, { fill: '#facc15', stroke: '#ffffff', width: 2 });
      D.text(g, `t = ${st.t} min`, curX, curY - 14, { color: '#facc15', size: 10.5, weight: 800, align: 'center' });

      D.rect(g, 560, ry + 32, 395, 42, { fill: '#0f172a', stroke: '#334155', r: 8 });
      D.text(g, `Slope = −k / 2.303 = −${(st.k / 2.303).toFixed(5)} min⁻¹`, 575, ry + 53, { color: '#38bdf8', size: 11, weight: 700 });
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 28. EMF MEASUREMENT USING CALOMEL & GLASS ELECTRODE
  // ═════════════════════════════════════════════════════════════════
  S['chem-lab-emf-electrodes'] = {
    live: true,
    approx: 'Glass electrode potential E = E0_glass - 0.05916 pH. Calomel electrode ESCE = +0.2422 V.',
    modes: [
      { key: 'buffer_calibration', label: 'Electrode Calibration with Standard Buffers (pH 4.00 & 7.00)' },
      { key: 'unknown_sample', label: 'Determination of Unknown Sample pH' },
    ],
    params: [
      {
        key: 'measuredEMF',
        label: 'Potentiometer Measured EMF (V)',
        type: 'range',
        default: 0.068,
        min: -0.300,
        max: 0.400,
        step: 0.005,
        unit: 'V',
        help: 'Cell EMF reading from digital potentiometer.',
      },
    ],
    examples: [
      { label: 'Neutral Buffer (pH 7.00, EMF ~ -0.106 V)', values: { measuredEMF: -0.106 } },
      { label: 'Acidic Buffer (pH 4.00, EMF ~ +0.071 V)', values: { measuredEMF: 0.071 } },
      { label: 'Basic Solution (pH 9.20, EMF ~ -0.236 V)', values: { measuredEMF: -0.236 } },
    ],
    validate() { return []; },
    steps(p, c) {
      return [
        { title: '1. Potentiometer Zeroing & Standardization', text: 'Immerse combined glass-SCE probe into standard pH 7.00 buffer and adjust zero offset on digital potentiometer.' },
        { title: '2. Slope Calibration (pH 4.00)', text: 'Rinse with distilled water, immerse in pH 4.00 buffer, and adjust span slope (theoretical 59.16 mV/pH at 25°C).' },
        { title: '3. Unknown Measurement', text: 'Immerse into unknown water sample. Read stable equilibrium EMF and deduce precise sample pH.' },
      ];
    },
    compute(p) {
      const emf = Number(p.measuredEMF != null ? p.measuredEMF : 0.068);
      const E0 = 0.3078; // V (composite cell constant)
      const slope = 0.05916; // V/pH

      const calcPH = clamp((E0 - emf) / slope, 0.0, 14.0);

      return {
        formulas: [
          { name: 'Potentiometric pH Relation', formula: 'pH = (E°_cell − E_measured) / 0.05916', given: `E_meas = ${emf.toFixed(3)} V`, calc: `(0.3078 − (${emf.toFixed(3)})) / 0.05916`, result: `${calcPH.toFixed(2)}`, unit: 'pH' },
        ],
        readouts: [
          { label: 'Measured EMF', value: `${emf.toFixed(3)} V`, tone: 'hi' },
          { label: 'Calculated pH', value: calcPH.toFixed(2), tone: 'good' },
          { label: 'Acidity / Alkalinity', value: calcPH < 7 ? 'Acidic' : calcPH > 7 ? 'Alkaline' : 'Neutral', tone: 'neutral' },
          { label: 'Electrode Slope', value: '59.16 mV/pH', tone: 'neutral' },
        ],
        state: { emf, calcPH: Math.round(calcPH * 100) / 100 },
        explain: {
          what: `The glass-calomel electrode pair measures solution pH potentiometrically without drawing significant current, preventing polarization errors.`,
          why: `Calomel provides a rock-solid half-cell reference potential (+0.2422 V) that does not shift during measurement.`,
          param: `Electrode slope is sensitive to temperature; digital meters employ automatic temperature compensation (ATC) probes to scale 2.303 RT/F.`,
          effect: `As pH rises, the potential of the glass electrode becomes more negative, causing cell EMF to decrease linearly.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');
      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Saturated calomel reference electrode conditioning (E = +0.2422 V)' : step === 1 ? 'Glass indicator electrode calibration against standard pH buffers' : 'Cell EMF measurement of test analyte & potentiometric pH determination');

      D.text(g, 'EXPERIMENT 6: EMF MEASUREMENT USING CALOMEL & GLASS ELECTRODE', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `Measured Cell EMF = ${st.emf.toFixed(3)} V · Deduced pH = ${st.calcPH.toFixed(2)} · Combined Assembly`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: Dual Electrode Apparatus
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Glass & Calomel Electrode Cell Setup', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const cx = 270;
      const cy = 290;

      // Beaker
      D.rect(g, cx - 100, cy, 200, 150, { fill: 'rgba(56,189,248,0.15)', stroke: '#94a3b8', width: 2, r: 8 });

      // Calomel Electrode (Left)
      D.rect(g, cx - 65, cy - 80, 30, 180, { fill: '#ffffff', stroke: '#94a3b8', width: 1.5, r: 4 });
      D.rect(g, cx - 60, cy + 60, 20, 25, { fill: '#94a3b8' }); // Hg pool
      D.text(g, 'SCE Reference', cx - 50, cy - 90, { color: '#94a3b8', size: 9.5, align: 'center' });

      // Glass Electrode (Right)
      D.rect(g, cx + 35, cy - 80, 30, 180, { fill: '#ffffff', stroke: '#94a3b8', width: 1.5, r: 4 });
      D.circle(g, cx + 50, cy + 100, 14, { fill: '#38bdf8', stroke: '#0284c7', width: 2 });
      D.text(g, 'Glass Bulb', cx + 50, cy - 90, { color: '#38bdf8', size: 9.5, align: 'center' });

      // Digital Potentiometer
      D.rect(g, cx - 55, cy - 180, 110, 50, { fill: '#0f172a', stroke: '#38bdf8', width: 2, r: 6 });
      D.text(g, `${st.emf.toFixed(3)} V`, cx, cy - 152, { color: '#22c55e', size: 14, weight: 900, align: 'center' });
      D.text(g, 'Digital Potentiometer', cx, cy - 138, { color: '#94a3b8', size: 8.5, align: 'center' });

      D.tag(g, `Determined Sample pH = ${st.calcPH.toFixed(2)}`, cx, 490, { bg: '#0f172a', border: '#22c55e', color: '#22c55e', size: 12, align: 'center' });

      // Right Panel: Calibration
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Linear Calibration Curve E vs pH', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const rx = 595;
      const ry = 440;
      const rw = 340;
      const rh = 260;

      D.line(g, rx, ry, rx + rw, ry, { color: '#475569', width: 1.5 });
      D.line(g, rx, ry, rx, ry - rh, { color: '#475569', width: 1.5 });
      D.text(g, 'Solution pH', rx + rw - 35, ry + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
      D.text(g, 'EMF (V)', rx - 10, ry - rh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

      D.line(g, rx, ry - rh + 40, rx + rw, ry - 40, { color: '#38bdf8', width: 3 });

      const curPx = rx + (st.calcPH / 14) * rw;
      const curPy = (ry - rh + 40) + (st.calcPH / 14) * (rh - 80);
      D.circle(g, curPx, curPy, 6, { fill: '#facc15', stroke: '#ffffff', width: 2 });
      D.text(g, `${st.emf.toFixed(3)} V (pH ${st.calcPH.toFixed(1)})`, curPx, curPy - 14, { color: '#facc15', size: 10.5, weight: 800, align: 'center' });

      D.rect(g, 560, ry + 32, 395, 42, { fill: '#0f172a', stroke: '#334155', r: 8 });
      D.text(g, 'E_measured = 0.3078 − 0.05916 pH (R² = 0.999)', 575, ry + 53, { color: '#38bdf8', size: 11, weight: 700 });
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 29. DISTRIBUTION COEFFICIENT OF IODINE (WATER / CCl₄)
  // ═════════════════════════════════════════════════════════════════
  S['chem-lab-partition-iodine'] = {
    live: true,
    approx: 'Nernst distribution law KD = [I2]_org / [I2]_aq. Constant at constant temperature provided solute molecular state is identical in both solvents.',
    modes: [
      { key: 'standard_kd', label: 'Iodine Partition between Water & Carbon Tetrachloride (CCl₄)' },
    ],
    params: [
      {
        key: 'initialIodine',
        label: 'Total Iodine Added (g)',
        type: 'range',
        default: 1.0,
        min: 0.2,
        max: 3.0,
        step: 0.2,
        unit: 'g',
        help: 'Total iodine equilibrated between 50 mL CCl4 and 250 mL water.',
      },
    ],
    examples: [
      { label: 'Equilibrium Iodine Distribution (KD ~ 85)', values: { initialIodine: 1.0 } },
      { label: 'High Iodine Charge (3.0 g)', values: { initialIodine: 3.0 } },
    ],
    validate() { return []; },
    steps(p, c) {
      return [
        { title: '1. Equilibration in Separatory Funnel', text: 'Shake iodine with 50 mL CCl₄ and 250 mL water in a separatory funnel for 30 minutes. Let stand until two distinct phases separate completely.' },
        { title: '2. Layer Aliquots & Sodium Thiosulfate Titration', text: 'Lower organic layer (purple, non-polar) and upper aqueous layer (pale brown, polar) are drawn off and titrated with standard Na₂S₂O₃ using starch indicator.' },
        { title: '3. Partition Coefficient Calculation', text: 'Calculate molar concentrations C_org and C_aq. Nernst distribution law gives KD = C_org / C_aq ≈ 85 at 25°C.' },
      ];
    },
    compute(p) {
      const mTotal = Number(p.initialIodine != null ? p.initialIodine : 1.0);
      const KD = 85.0; // Nernst partition coefficient
      const vOrg = 0.050; // L
      const vAq = 0.250; // L

      // mTotal = C_org * vOrg * 253.8 + C_aq * vAq * 253.8
      // C_org = KD * C_aq -> mTotal = C_aq * 253.8 * (KD * vOrg + vAq)
      const cAq = mTotal / (253.8 * (KD * vOrg + vAq));
      const cOrg = KD * cAq;

      const fracOrg = Math.round((cOrg * vOrg * 253.8 / mTotal) * 100);

      return {
        formulas: [
          { name: 'Nernst Distribution Law', formula: 'K_D = [I₂]_CCl4 / [I₂]_water', given: `[I₂]_org = ${cOrg.toFixed(4)} M, [I₂]_aq = ${cAq.toFixed(6)} M`, calc: `${cOrg.toFixed(4)} / ${cAq.toFixed(6)}`, result: `${KD.toFixed(1)}`, unit: 'K_D' },
          { name: 'Thiosulfate Titration Reaction', formula: 'I₂ + 2 S₂O₃²⁻ → 2 I⁻ + S₄O₆²⁻', given: 'Standard 0.02 N Na₂S₂O₃ with starch', calc: 'Titre volume reveals layer concentration', result: 'Stoichiometric', unit: 'redox' },
        ],
        readouts: [
          { label: 'Partition K_D', value: `${KD.toFixed(1)}`, tone: 'hi' },
          { label: '[I₂] in CCl₄', value: `${cOrg.toFixed(4)} M`, tone: 'good' },
          { label: '[I₂] in Water', value: `${cAq.toFixed(6)} M`, tone: 'neutral' },
          { label: 'Organic Extraction', value: `${fracOrg} %`, tone: 'hi' },
        ],
        state: { mTotal, KD, cOrg: Math.round(cOrg * 10000) / 10000, cAq: Math.round(cAq * 1000000) / 1000000, fracOrg },
        explain: {
          what: `Nernst\'s distribution law states that a solute distributes itself between two immiscible solvents in a constant concentration ratio at equilibrium, independent of total solute amount.`,
          why: `Iodine is non-polar and vastly more soluble in non-polar carbon tetrachloride (CCl₄) than in polar water, resulting in KD ≈ 85.`,
          param: `The law strictly holds only when the molecular state of the solute is identical in both solvents (no association or dissociation).`,
          effect: `This principle underpins liquid-liquid extraction in hydrometallurgy and pharmaceutical purification. Multiple small extractions are always more efficient than a single large extraction.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');
      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Separatory funnel charging with immiscible aqueous & organic phases' : step === 1 ? 'Vigorous shaking, pressure release & liquid-liquid equilibrium equilibration' : 'Phase separation: violet organic (I₂ in CCl₄) vs yellow aqueous layer');

      D.text(g, 'EXPERIMENT 7: DISTRIBUTION COEFFICIENT OF IODINE (WATER / CCl₄)', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `Total I₂ = ${st.mTotal} g · Organic [I₂] = ${st.cOrg} M · Aqueous [I₂] = ${st.cAq} M · Partition K_D = ${st.KD}`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: Separatory Funnel
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Separatory Funnel Layer Separation', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const cx = 270;
      const cy = 290;

      // Funnel Body
      D.poly(g, [
        [cx - 50, cy - 100],
        [cx + 50, cy - 100],
        [cx + 60, cy - 20],
        [cx + 8, cy + 80],
        [cx + 8, cy + 130],
        [cx - 8, cy + 130],
        [cx - 8, cy + 80],
        [cx - 60, cy - 20],
      ], { fill: 'rgba(15,23,42,0.6)', stroke: '#94a3b8', width: 2.5, close: true });

      // Upper Aqueous Layer (Water: Pale Yellow/Brown)
      D.poly(g, [
        [cx - 48, cy - 90],
        [cx + 48, cy - 90],
        [cx + 58, cy - 30],
        [cx - 58, cy - 30],
      ], { fill: 'rgba(234,179,8,0.35)', stroke: false, close: true });
      D.text(g, `Aqueous Layer (Water)`, cx, cy - 60, { color: '#facc15', size: 11, weight: 800, align: 'center' });

      // Lower Organic Layer (CCl4: Deep Violet/Purple)
      D.poly(g, [
        [cx - 58, cy - 30],
        [cx + 58, cy - 30],
        [cx + 8, cy + 80],
        [cx - 8, cy + 80],
      ], { fill: 'rgba(168,85,247,0.7)', stroke: false, close: true });
      D.text(g, `Organic Layer (CCl₄)`, cx, cy + 15, { color: '#ffffff', size: 11, weight: 800, align: 'center' });
      D.text(g, `Intense Purple (${st.fracOrg}% I₂)`, cx, cy + 32, { color: '#f5d0fe', size: 9.5, align: 'center' });

      D.tag(g, `Nernst Partition Ratio: K_D = [I₂]_org / [I₂]_aq = ${st.KD}`, cx, 490, { bg: '#0f172a', border: '#a855f7', color: '#c084fc', size: 12, align: 'center' });

      // Right Panel: Partitioning Metrics
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Equilibrium Distribution Data', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const dCards = [
        { label: 'Organic Layer (CCl₄)', val: `${st.cOrg} M (${st.fracOrg}% of total I₂)`, col: '#c084fc' },
        { label: 'Aqueous Layer (Water)', val: `${st.cAq} M (${100 - st.fracOrg}% of total I₂)`, col: '#facc15' },
        { label: 'Experimental K_D Value', val: `${st.KD} (Constant at 25°C)`, col: '#22c55e' },
      ];

      dCards.forEach((c, i) => {
        const cyY = 150 + i * 85;
        D.rect(g, 560, cyY, 395, 72, { fill: '#0f172a', stroke: '#334155', r: 8 });
        D.text(g, c.label, 575, cyY + 24, { color: '#94a3b8', size: 11, weight: 600 });
        D.text(g, c.val, 575, cyY + 48, { color: c.col, size: 13, weight: 800 });
      });

      D.rect(g, 560, 420, 395, 80, { fill: '#0f172a', stroke: '#38bdf8', r: 8 });
      D.text(g, 'Solubility Principle: "Like dissolves like"', 575, 442, { color: '#38bdf8', size: 12, weight: 700 });
      D.text(g, 'Non-polar I₂ dissolves predominantly into non-polar CCl₄.', 575, 464, { color: '#cbd5e1', size: 11 });
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 30. VERIFICATION OF BEER-LAMBERT LAW (COLORIMETRY)
  // ═════════════════════════════════════════════════════════════════
  S['chem-lab-beer-lambert'] = {
    live: true,
    approx: 'Standard colorimetric series: 10, 20, 30, 40, 50 ppm KMnO4. Absorbance measured at 525 nm. Unknown concentration determined from standard calibration line.',
    modes: [
      { key: 'standard_series', label: 'KMnO₄ Calibration Series (10 – 50 ppm) & Unknown Sample' },
    ],
    params: [
      {
        key: 'unknownAbs',
        label: 'Unknown Sample Absorbance A',
        type: 'range',
        default: 0.45,
        min: 0.05,
        max: 0.95,
        step: 0.01,
        help: 'Optical density / absorbance of unknown water sample measured on colorimeter.',
      },
    ],
    examples: [
      { label: 'Unknown Sample (A = 0.45, c ~ 25 ppm)', values: { unknownAbs: 0.45 } },
      { label: 'Concentrated Sample (A = 0.82, c ~ 45 ppm)', values: { unknownAbs: 0.82 } },
      { label: 'Dilute Sample (A = 0.18, c ~ 10 ppm)', values: { unknownAbs: 0.18 } },
    ],
    validate() { return []; },
    steps(p, c) {
      return [
        { title: '1. Blank Calibration (A = 0.000)', text: 'Zero colorimeter with distilled water blank at λ_max = 525 nm (green filter) to set 100% transmittance.' },
        { title: '2. Standard Series Measurement', text: 'Measure absorbance of 10, 20, 30, 40, 50 ppm standard KMnO₄ solutions. Verify linear proportionality A ∝ c.' },
        { title: '3. Unknown Concentration Determination', text: 'Measure absorbance of unknown sample and deduce exact concentration from standard linear calibration equation.' },
      ];
    },
    compute(p) {
      const aUnk = Number(p.unknownAbs != null ? p.unknownAbs : 0.45);
      const slope = 0.0182; // A per ppm KMnO4

      const cUnk = aUnk / slope;

      const stdSeries = [
        { c: 10, A: 0.182 },
        { c: 20, A: 0.364 },
        { c: 30, A: 0.546 },
        { c: 40, A: 0.728 },
        { c: 50, A: 0.910 },
      ];

      return {
        formulas: [
          { name: 'Unknown Concentration from Calibration Line', formula: 'c_unknown = A_unknown / Slope', given: `A_unknown = ${aUnk.toFixed(3)}, Slope = ${slope} ppm⁻¹`, calc: `${aUnk.toFixed(3)} / ${slope}`, result: `${cUnk.toFixed(1)}`, unit: 'ppm (mg/L)' },
        ],
        readouts: [
          { label: 'Unknown Absorbance', value: aUnk.toFixed(3), tone: 'hi' },
          { label: 'Unknown Conc', value: `${cUnk.toFixed(1)} ppm`, tone: 'good' },
          { label: 'Filter λ_max', value: '525 nm (Green)', tone: 'neutral' },
          { label: 'Calibration R²', value: '0.9998', tone: 'good' },
        ],
        state: { aUnk, cUnk: Math.round(cUnk * 10) / 10, stdSeries },
        explain: {
          what: `Colorimetry and spectrophotometry measure the transmission of light through colored solutions to determine concentration quantitatively based on the Beer-Lambert law.`,
          why: `Plotting absorbance against known concentrations yields a straight line passing through the origin (A = ε·c·l), satisfying the linear response criteria.`,
          param: `A green filter (525 nm) is chosen for purple permanganate because a solution absorbs its complementary color most intensely.`,
          effect: `Measuring unknown absorbance allows immediate non-destructive determination of pollutant concentrations in environmental water samples.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');
      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Colorimeter blank calibration (100% Transmittance at λmax = 525 nm)' : step === 1 ? 'Series of standard permanganate solutions & calibration curve slope' : 'Unknown optical density measurement & graphical concentration determination');

      D.text(g, 'EXPERIMENT 8: VERIFICATION OF BEER-LAMBERT LAW (COLORIMETRY)', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `Permanganate Standard Series (10–50 ppm) · Unknown A = ${st.aUnk.toFixed(3)} → Concentration = ${st.cUnk.toFixed(1)} ppm (mg/L)`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: Standard Nessler Tubes & Unknown
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Standard Colorimetric Series & Unknown Cuvette', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const cx = 270;
      const cy = 290;

      // 5 Standard Cuvettes in rack
      st.stdSeries.forEach((s, idx) => {
        const x = 50 + idx * 72;
        const alpha = 0.2 + idx * 0.16;
        D.rect(g, x, cy - 60, 42, 110, { fill: `rgba(168,85,247,${alpha})`, stroke: '#94a3b8', width: 1.5, r: 4 });
        D.text(g, `${s.c} ppm`, x + 21, cy + 68, { color: '#cbd5e1', size: 10, weight: 700, align: 'center' });
        D.text(g, `A=${s.A.toFixed(2)}`, x + 21, cy + 85, { color: '#94a3b8', size: 9, align: 'center' });
      });

      // Unknown Cuvette (Highlighted)
      const uX = 425;
      D.rect(g, uX, cy - 70, 52, 125, { fill: 'rgba(168,85,247,0.5)', stroke: '#facc15', width: 2.5, r: 6 });
      D.text(g, 'UNKNOWN', uX + 26, cy - 82, { color: '#facc15', size: 10, weight: 800, align: 'center' });
      D.text(g, `${st.cUnk.toFixed(1)} ppm`, uX + 26, cy + 72, { color: '#facc15', size: 11, weight: 800, align: 'center' });
      D.text(g, `A = ${st.aUnk.toFixed(3)}`, uX + 26, cy + 90, { color: '#38bdf8', size: 9.5, align: 'center' });

      D.tag(g, `Unknown Quantified: ${st.cUnk.toFixed(1)} ppm KMnO₄ from A = ${st.aUnk.toFixed(3)}`, cx, 490, { bg: '#0f172a', border: '#22c55e', color: '#22c55e', size: 12, align: 'center' });

      // Right Panel: Standard Calibration Line
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Standard Calibration Curve A vs ppm', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const rx = 595;
      const ry = 440;
      const rw = 340;
      const rh = 260;

      D.line(g, rx, ry, rx + rw, ry, { color: '#475569', width: 1.5 });
      D.line(g, rx, ry, rx, ry - rh, { color: '#475569', width: 1.5 });
      D.text(g, 'Concentration (ppm)', rx + rw - 40, ry + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
      D.text(g, 'Absorbance A', rx - 10, ry - rh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

      // Straight line
      D.line(g, rx, ry, rx + (50 / 60) * rw, ry - (0.91 / 1.0) * rh, { color: '#38bdf8', width: 3 });

      // Plot 5 standard points
      st.stdSeries.forEach((s) => {
        const sx = rx + (s.c / 60) * rw;
        const sy = ry - (s.A / 1.0) * rh;
        D.circle(g, sx, sy, 4, { fill: '#38bdf8', stroke: '#ffffff', width: 1.5 });
      });

      // Unknown Sample Point
      const uPx = rx + (st.cUnk / 60) * rw;
      const uPy = ry - (st.aUnk / 1.0) * rh;
      D.line(g, uPx, ry, uPx, uPy, { color: '#facc15', width: 1.5, dash: [3, 3] });
      D.line(g, rx, uPy, uPx, uPy, { color: '#facc15', width: 1.5, dash: [3, 3] });
      D.circle(g, uPx, uPy, 6, { fill: '#facc15', stroke: '#ffffff', width: 2 });
      D.text(g, `(${st.cUnk.toFixed(1)} ppm, A = ${st.aUnk.toFixed(2)})`, uPx + 10, uPy - 10, { color: '#facc15', size: 10.5, weight: 800 });

      D.rect(g, 560, ry + 32, 395, 42, { fill: '#0f172a', stroke: '#334155', r: 8 });
      D.text(g, 'Beer-Lambert Law verified: Linear fit passing through origin.', 575, ry + 53, { color: '#38bdf8', size: 11, weight: 700 });
    },
  };

  // Support both canonical catalog ID and legacy/alternate alias
  S['chem-lab-iodine-distribution'] = S['chem-lab-partition-iodine'];
})();
