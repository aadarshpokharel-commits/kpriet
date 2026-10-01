'use strict';

/**
 * Engineering Chemistry — Unit V: Surface Chemistry, Spectroscopy and Chromatography
 * Interactive Simulation Engines for U25CY103
 *
 * Implements:
 *  18. chem-adsorption-isotherms: Langmuir & Freundlich Adsorption Isotherms
 *  19. chem-micelle-cmc: Micelle Formation & Critical Micelle Concentration (CMC)
 *  20. chem-beer-lambert-spec: Beer-Lambert Law & UV-Vis Spectrophotometer
 *  21. chem-spectroscopy-interpreter: IR & 1H-NMR Spectrum Interpreter
 *  22. chem-chromatography-tlc: Thin Layer (TLC) & HPLC/GC Chromatogram Simulator
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
  // 18. LANGMUIR & FREUNDLICH ADSORPTION ISOTHERMS
  // ═════════════════════════════════════════════════════════════════
  S['chem-adsorption-isotherms'] = {
    live: true,
    approx: 'Langmuir monolayer model θ = KP/(1+KP) assumes homogeneous equivalent sites. Freundlich empirical multilayer model x/m = k·P^(1/n) applies to heterogeneous surfaces.',
    modes: [
      { key: 'langmuir', label: 'Langmuir Isotherm (Homogeneous Monolayer: θ = KP/(1+KP))' },
      { key: 'freundlich', label: 'Freundlich Isotherm (Heterogeneous Multilayer: x/m = k P^(1/n))' },
    ],
    params: [
      {
        key: 'pressure',
        label: 'Gas Pressure / Solute Conc P (atm or mg/L)',
        type: 'range',
        default: 2.5,
        min: 0.1,
        max: 10.0,
        step: 0.1,
        unit: 'atm',
        help: 'Equilibrium pressure P of adsorbate gas or equilibrium concentration C of solute.',
      },
      {
        key: 'adsorptionConst',
        label: 'Adsorption Equilibrium Constant K / k',
        type: 'range',
        default: 0.8,
        min: 0.1,
        max: 3.0,
        step: 0.1,
        help: 'Equilibrium constant reflecting binding affinity of adsorbate for adsorbent.',
      },
      {
        key: 'heteroExp',
        label: 'Heterogeneity Factor 1/n',
        type: 'range',
        default: 0.45,
        min: 0.1,
        max: 0.9,
        step: 0.05,
        showIf: (p) => p.mode === 'freundlich',
        help: 'Freundlich exponent 0 < 1/n < 1. Values < 0.5 indicate favorable chemisorption/heterogeneous coverage.',
      },
    ],
    examples: [
      { label: 'Activated Carbon N₂ Adsorption (Langmuir Monolayer, K = 0.8)', values: { mode: 'langmuir', pressure: 2.5, adsorptionConst: 0.8 } },
      { label: 'High Pressure Monolayer Saturation (θ → 1.0)', values: { mode: 'langmuir', pressure: 9.5, adsorptionConst: 1.5 } },
      { label: 'Dye Adsorption on Biochar (Freundlich 1/n = 0.45)', values: { mode: 'freundlich', pressure: 3.0, adsorptionConst: 1.2, heteroExp: 0.45 } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      if (p.mode === 'langmuir') {
        return [
          { title: '1. Dynamic Adsorption-Desorption Equilibrium', text: 'Adsorption rate r_ads = k_a P (1−θ) equals desorption rate r_des = k_d θ. Surface consists of fixed, energetically equivalent sites with no lateral adsorbate-adsorbate interactions.' },
          { title: '2. Monolayer Saturation Limit (θ = KP / (1 + KP))', text: 'At low pressure (P ≪ 1/K), θ ≈ KP (linear Henry\'s law). At high pressure (P ≫ 1/K), all sites become occupied and coverage approaches an asymptotic monolayer ceiling (θ → 1.0).' },
          { title: '3. Linearized Diagnostic Plot: P/(x/m) vs P', text: 'Transforming to P/(x/m) = 1/(a·b) + (1/b)P yields a straight line where slope = 1/b (monolayer capacity) and intercept = 1/(a·b), allowing determination of specific surface area.' },
        ];
      }
      return [
        { title: '1. Energetically Heterogeneous Sites', text: 'Real porous solids (activated charcoal, silica gel) have heterogeneous surfaces with varying adsorption heat. Sites with highest binding energy fill first.' },
        { title: '2. Power Law Coverage: x/m = k · P^(1/n)', text: 'The empirical exponent 1/n lies between 0.1 and 1.0. A smaller 1/n represents greater surface heterogeneity and stronger initial binding.' },
        { title: '3. Linearized Freundlich Plot: log(x/m) vs log P', text: 'Plotting log(x/m) = log(k) + (1/n) log(P) gives a straight line with slope = 1/n and y-intercept = log(k).' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'langmuir';
      const P = Math.max(0.05, Number(p.pressure != null ? p.pressure : 2.5));
      const K = Number(p.adsorptionConst != null ? p.adsorptionConst : 0.8);
      const invN = Number(p.heteroExp != null ? p.heteroExp : 0.45);

      let theta = 0;
      let xm = 0;
      let linFormula = '';

      if (mode === 'langmuir') {
        theta = (K * P) / (1 + K * P);
        xm = theta * 120; // mg/g monolayer capacity
        linFormula = 'P / (x/m) = 1/(K·xm) + P / xm';
      } else {
        xm = K * Math.pow(P, invN) * 45;
        theta = clamp(xm / 120, 0, 1);
        linFormula = 'log(x/m) = log(k) + (1/n) log(P)';
      }

      const occupiedSites = Math.round(theta * 100);

      return {
        formulas: [
          { name: mode === 'langmuir' ? 'Langmuir Monolayer Equation' : 'Freundlich Empirical Equation', formula: mode === 'langmuir' ? 'θ = (K P) / (1 + K P)' : 'x/m = k · P^(1/n)', given: `P = ${P} atm, K = ${K}`, calc: mode === 'langmuir' ? `(${K} × ${P}) / (1 + ${K} × ${P})` : `${K} × (${P})^${invN}`, result: mode === 'langmuir' ? `${theta.toFixed(3)}` : `${xm.toFixed(1)} mg/g`, unit: mode === 'langmuir' ? 'fraction' : 'mg/g' },
          { name: 'Linear Diagnostic Form', formula: linFormula, given: 'Straight line confirmation', calc: mode === 'langmuir' ? 'Slope = 1 / x_m' : `Slope = 1/n = ${invN}`, result: 'Linear', unit: 'plot' },
        ],
        readouts: [
          { label: 'Isotherm Model', value: mode.toUpperCase(), tone: 'hi' },
          { label: 'Surface Coverage θ', value: `${(theta * 100).toFixed(1)} %`, tone: 'good' },
          { label: 'Adsorbed Amount x/m', value: `${xm.toFixed(1)} mg/g`, tone: 'hi' },
          { label: 'Equilibrium Pressure', value: `${P} atm`, tone: 'neutral' },
          { label: 'Site Saturation', value: `${occupiedSites} / 100`, tone: 'good' },
        ],
        state: {
          mode,
          P,
          K,
          invN,
          theta: Math.round(theta * 1000) / 1000,
          xm: Math.round(xm * 10) / 10,
          occupiedSites,
        },
        explain: {
          what: `Adsorption isotherms describe the relationship between the equilibrium quantity of adsorbate gas or solute taken up by a solid surface and the equilibrium pressure or concentration at constant temperature.`,
          why: `Langmuir models chemisorption with localized monolayer coverage on uniform sites. Freundlich models physisorption onto heterogeneous surfaces with diverse active binding sites.`,
          param: `In Langmuir isotherms, at high pressure (P ≫ 1/K), the curve levels off to a strict horizontal plateau (θ → 1) because all specific surface sites are filled.`,
          effect: `Adsorption is exothermic (ΔH_ads < 0) with decrease in entropy (ΔS_ads < 0); hence, increasing temperature always decreases adsorption capacity at constant pressure.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Clean adsorbent solid surface with active vacant sites' : step === 1 ? 'Dynamic adsorption-desorption equilibrium & fractional coverage θ' : 'Surface saturation plateau: Langmuir monolayer vs Freundlich multilayer');

      // Header Banner
      D.text(g, st.mode === 'langmuir' ? 'LANGMUIR ADSORPTION ISOTHERM (MONOLAYER COVERAGE)' : 'FREUNDLICH ADSORPTION ISOTHERM (HETEROGENEOUS SURFACE)', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `Pressure P = ${st.P} atm · Coverage θ = ${(st.theta * 100).toFixed(1)}% · x/m = ${st.xm} mg/g · Constant K = ${st.K}`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: Microscopic Surface Lattice (x: 24 to 530)
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Solid Adsorbent Surface Sites & Adsorbate Gas', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const cx = 270;
      const cy = 290;

      // Solid Adsorbent Slab at bottom (y: 340 to 450)
      D.rect(g, 45, 340, 460, 110, { fill: '#334155', stroke: '#64748b', width: 2, r: 8 });
      D.text(g, 'SOLID ADSORBENT LATTICE (Activated Carbon / Silica)', cx, 400, { color: '#cbd5e1', size: 12, weight: 800, align: 'center' });

      // Surface Active Sites (2 rows of 10 site cups along top surface)
      const numSites = 20;
      const occupiedCount = Math.round(st.theta * numSites);

      for (let s = 0; s < numSites; s++) {
        const sx = 65 + (s % 10) * 44;
        const sy = s < 10 ? 336 : 310;
        const isOcc = s < occupiedCount;

        // Site cup
        D.circle(g, sx, sy, 8, { fill: '#1e293b', stroke: isOcc ? '#38bdf8' : '#64748b', width: 1.5 });

        if (isOcc) {
          // Adsorbed gas molecule
          D.circle(g, sx, sy - 2, 7, { fill: '#0284c7', stroke: '#38bdf8', width: 1.5 });
          D.text(g, 'A', sx, sy - 1, { color: '#ffffff', size: 8, weight: 800, align: 'center' });
        }
      }

      // Free Gas Phase above surface (y: 130 to 290)
      const numGas = Math.round(st.P * 3);
      for (let gIdx = 0; gIdx < numGas; gIdx++) {
        const gx = 65 + (gIdx * 47) % 420;
        const gy = 145 + ((gIdx * 31) % 130);
        D.circle(g, gx, gy, 5, { fill: '#f59e0b' });
      }
      D.text(g, `Gas Phase Adsorbate Molecules (P = ${st.P} atm)`, 50, 140, { color: '#f59e0b', size: 11, weight: 600 });

      D.tag(g, `Fractional Surface Coverage: θ = ${(st.theta * 100).toFixed(1)}%`, cx, 490, { bg: '#0f172a', border: '#38bdf8', color: '#38bdf8', size: 12, align: 'center' });

      // Right Panel: Isotherm Plot (x: 540 to 975)
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, st.mode === 'langmuir' ? 'Langmuir Monolayer Isotherm θ vs P' : 'Freundlich Isotherm x/m vs P', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const rx = 595;
      const ry = 440;
      const rw = 340;
      const rh = 260;

      D.line(g, rx, ry, rx + rw, ry, { color: '#475569', width: 1.5 });
      D.line(g, rx, ry, rx, ry - rh, { color: '#475569', width: 1.5 });
      D.text(g, 'Equilibrium Pressure P (atm)', rx + rw - 60, ry + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
      D.text(g, st.mode === 'langmuir' ? 'Coverage θ' : 'x/m (mg/g)', rx - 10, ry - rh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

      // Theoretical Isotherm Curve
      const isoPts = [];
      const numPts = 60;
      const pMax = 10.0;

      for (let i = 0; i <= numPts; i++) {
        const curP = (i / numPts) * pMax;
        let yFrac = 0;
        if (st.mode === 'langmuir') {
          yFrac = (st.K * curP) / (1 + st.K * curP);
        } else {
          const curXm = st.K * Math.pow(curP, st.invN) * 45;
          yFrac = curXm / 130;
        }
        const px = rx + (curP / pMax) * rw;
        const py = ry - clamp(yFrac, 0, 1) * rh;
        isoPts.push([px, py]);
      }

      D.poly(g, isoPts, { stroke: '#38bdf8', width: 3, fill: false });

      // Monolayer ceiling line for Langmuir
      if (st.mode === 'langmuir') {
        D.line(g, rx, ry - rh, rx + rw, ry - rh, { color: '#64748b', width: 1.5, dash: [4, 4] });
        D.text(g, 'θ = 1.0 (Monolayer Saturation Ceiling)', rx + rw - 120, ry - rh - 6, { color: '#64748b', size: 9.5 });
      }

      // Live operating point
      const curPx = rx + (st.P / pMax) * rw;
      const curYFrac = st.mode === 'langmuir' ? st.theta : st.xm / 130;
      const curPy = ry - clamp(curYFrac, 0, 1) * rh;

      D.line(g, curPx, ry, curPx, curPy, { color: '#facc15', width: 1.5, dash: [3, 3] });
      D.circle(g, curPx, curPy, 6, { fill: '#facc15', stroke: '#ffffff', width: 2 });
      D.text(g, `P = ${st.P} atm (${st.mode === 'langmuir' ? (st.theta * 100).toFixed(0) + '%' : st.xm + ' mg/g'})`, curPx, curPy - 14, { color: '#facc15', size: 10.5, weight: 800, align: 'center' });

      D.rect(g, 560, ry + 32, 395, 42, { fill: '#0f172a', stroke: '#334155', r: 8 });
      D.text(g, st.mode === 'langmuir' ? 'Langmuir Linear: P/(x/m) = 1/(K xm) + P/xm (Slope = 1/xm)' : 'Freundlich Linear: log(x/m) = log(k) + (1/n) log(P)', 575, ry + 53, { color: '#38bdf8', size: 11, weight: 700 });
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 19. MICELLE FORMATION & CRITICAL MICELLE CONCENTRATION (CMC)
  // ═════════════════════════════════════════════════════════════════
  S['chem-micelle-cmc'] = {
    live: true,
    approx: 'Surface tension γ modeled via Gibbs adsorption isotherm γ = γ0 − 2.303 nRT Γ_max log(c/cmc) below CMC; constant γ_min above CMC. Conductivity κ shows sharp slope inflection at CMC.',
    modes: [
      { key: 'anionic_sds', label: 'Anionic Surfactant: Sodium Dodecyl Sulfate (SDS, CMC = 8.2 mM)' },
      { key: 'cationic_ctab', label: 'Cationic Surfactant: Cetyltrimethylammonium Bromide (CTAB, CMC = 0.9 mM)' },
      { key: 'nonionic_tx100', label: 'Non-Ionic Surfactant: Triton X-100 (CMC = 0.24 mM)' },
    ],
    params: [
      {
        key: 'concentration',
        label: 'Surfactant Concentration c (mM)',
        type: 'range',
        default: 10.0,
        min: 0.1,
        max: 25.0,
        step: 0.2,
        unit: 'mM',
        help: 'Total surfactant concentration relative to the Critical Micelle Concentration (CMC).',
      },
      {
        key: 'electrolyteNaCl',
        label: 'Added Electrolyte [NaCl] (mM)',
        type: 'range',
        default: 0,
        min: 0,
        max: 100,
        step: 10,
        unit: 'mM',
        showIf: (p) => p.mode !== 'nonionic_tx100',
        help: 'Ionic screening compresses the electrical double layer, lowering CMC by screening ionic headgroup repulsion.',
      },
    ],
    examples: [
      { label: 'SDS at Pre-CMC Monomer Stage (c = 3.0 mM < CMC)', values: { mode: 'anionic_sds', concentration: 3.0, electrolyteNaCl: 0 } },
      { label: 'SDS at Critical Micelle Point (c = 8.2 mM = CMC)', values: { mode: 'anionic_sds', concentration: 8.2, electrolyteNaCl: 0 } },
      { label: 'Post-CMC Abundant Spherical Micelles (c = 18.0 mM)', values: { mode: 'anionic_sds', concentration: 18.0, electrolyteNaCl: 0 } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      return [
        { title: '1. Monomer Adsorption at Air-Water Interface (c < CMC)', text: 'Amphiphilic surfactant molecules orient at the liquid-air surface with hydrophilic polar heads in water and hydrophobic hydrocarbon tails extending into air. Surface tension γ drops steeply.' },
        { title: '2. Critical Micelle Concentration (CMC) Inversion', text: 'At CMC, the liquid-air interface reaches saturated monolayer packing (maximum surface excess Γ_max). Further added surfactants cannot fit at the interface and are driven into water.' },
        { title: '3. Spontaneous Micellization & Core Solubilization (c > CMC)', text: 'Thermodynamic hydrophobic effect drives tails together into a core shielded by polar heads, forming spherical micelles (aggregation number N_agg ~ 60). Physical properties (γ, κ, turbidity) show sharp inflection.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'anionic_sds';
      const c = Math.max(0.01, Number(p.concentration != null ? p.concentration : 10.0));
      const salt = Number(p.electrolyteNaCl != null ? p.electrolyteNaCl : 0);

      const surfData = {
        anionic_sds: { name: 'Sodium Dodecyl Sulfate (SDS)', baseCMC: 8.2, gamma0: 72.0, gammaMin: 34.0, nAgg: 62 },
        cationic_ctab: { name: 'CTAB', baseCMC: 0.92, gamma0: 72.0, gammaMin: 36.0, nAgg: 90 },
        nonionic_tx100: { name: 'Triton X-100', baseCMC: 0.24, gamma0: 72.0, gammaMin: 30.0, nAgg: 140 },
      }[mode] || { name: 'Surfactant', baseCMC: 8.2, gamma0: 72.0, gammaMin: 34.0, nAgg: 60 };

      // Salt lowers CMC for ionic surfactants (Corrin-Harkins relation)
      let effectiveCMC = surfData.baseCMC;
      if (mode !== 'nonionic_tx100' && salt > 0) {
        effectiveCMC = Math.max(0.2, Math.round((surfData.baseCMC / (1 + 0.015 * salt)) * 100) / 100);
      }

      const isPostCMC = c >= effectiveCMC;

      // Surface Tension gamma (mN/m)
      let gamma = surfData.gamma0;
      if (c < effectiveCMC) {
        const dropFrac = Math.log10(1 + (c / effectiveCMC) * 9);
        gamma = surfData.gamma0 - dropFrac * (surfData.gamma0 - surfData.gammaMin);
      } else {
        gamma = surfData.gammaMin;
      }
      gamma = Math.round(gamma * 10) / 10;

      // Specific Conductivity kappa (mS/cm)
      let kappa = 0;
      if (c <= effectiveCMC) {
        kappa = c * 0.12;
      } else {
        kappa = effectiveCMC * 0.12 + (c - effectiveCMC) * 0.035; // slope drops past CMC due to counterion condensation
      }
      kappa = Math.round(kappa * 100) / 100;

      // Number of micelles
      const micelleCount = isPostCMC ? Math.round(((c - effectiveCMC) / effectiveCMC) * 12) + 1 : 0;

      return {
        formulas: [
          { name: 'Gibbs Surface Excess Adsorption', formula: 'Γ_max = −(1 / (2.303 n R T)) (dγ / d log c)', given: `T = 298 K, Air-Water interface`, calc: `Slope dγ/dlog(c) yields Γ_max`, result: '4.2 × 10⁻⁶', unit: 'mol/m²' },
          { name: 'Critical Micelle Concentration', formula: 'CMC with Salt: log(CMC) = −a log[Na⁺] + b', given: `Electrolyte [NaCl] = ${salt} mM`, calc: `Electrostatic screening reduces CMC`, result: `${effectiveCMC.toFixed(2)}`, unit: 'mM' },
          { name: 'Micelle Aggregation Number', formula: 'N_agg = Average monomers per micelle', given: `System: ${surfData.name}`, calc: 'Hydrophobic core packing constraint', result: `${surfData.nAgg}`, unit: 'monomers' },
        ],
        readouts: [
          { label: 'Surfactant', value: surfData.name.split(' ')[0], tone: 'hi' },
          { label: 'System State', value: isPostCMC ? 'Micellar Phase (c > CMC)' : 'Monomer Solution (c < CMC)', tone: isPostCMC ? 'good' : 'neutral' },
          { label: 'Surface Tension γ', value: `${gamma} mN/m`, tone: 'hi' },
          { label: 'Conductivity κ', value: `${kappa} mS/cm`, tone: 'good' },
          { label: 'Effective CMC', value: `${effectiveCMC.toFixed(2)} mM`, tone: 'neutral' },
        ],
        state: {
          mode,
          c,
          salt,
          effectiveCMC,
          isPostCMC,
          gamma,
          kappa,
          micelleCount,
          surfName: surfData.name,
        },
        explain: {
          what: `Surfactants are surface-active agents whose amphiphilic structures cause spontaneous orientation at interfaces and self-assembly into micelles above the Critical Micelle Concentration (CMC).`,
          why: `Micellization is driven primarily by the hydrophobic effect (entropy gain from releasing structured water cages surrounding hydrocarbon tails back into the bulk).`,
          param: `Adding electrolytes (NaCl) screens the repulsive electrostatic charges between ionic headgroups, allowing tighter packing and substantially lowering the CMC.`,
          effect: `Below CMC, surface tension falls precipitously with concentration; above CMC, surface tension remains constant (γ_min) while solubilization capacity for oil-soluble grease increases exponentially.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Sub-CMC surfactant monomers reducing liquid-air surface tension' : step === 1 ? 'Surface monolayer saturation at Critical Micelle Concentration (CMC)' : 'Post-CMC spontaneous spherical micelle aggregation in bulk water');

      // Header Banner
      D.text(g, 'SURFACE CHEMISTRY: MICELLE FORMATION & CMC TRANSITION', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `${st.surfName} · c = ${st.c} mM · CMC = ${st.effectiveCMC} mM · γ = ${st.gamma} mN/m · κ = ${st.kappa} mS/cm · ${st.isPostCMC ? 'Post-CMC' : 'Pre-CMC'}`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: Microscopic Beaker Cross-Section (x: 24 to 530)
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, st.isPostCMC ? 'Post-CMC: Spherical Micelles in Bulk Water' : 'Pre-CMC: Monolayer Packing at Air-Water Interface', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const cx = 270;
      const cy = 290;

      // Water Beaker (y: 150 to 450)
      const bX = 50;
      const bY = 150;
      const bW = 440;
      const bH = 300;

      D.rect(g, bX, bY, bW, bH, { fill: 'rgba(56,189,248,0.08)', stroke: '#64748b', width: 2, r: 8 });

      // Air-Water Interface line
      const ifY = bY + 30;
      D.line(g, bX, ifY, bX + bW, ifY, { color: '#38bdf8', width: 2.5 });
      D.text(g, 'Air-Water Interface', bX + 15, ifY - 10, { color: '#38bdf8', size: 10, weight: 700 });

      // Surface Surfactants (Heads down in water, tails up in air)
      const numSurfTails = clamp(Math.round((st.c / st.effectiveCMC) * 16), 4, 18);
      for (let s = 0; s < numSurfTails; s++) {
        const sx = bX + 25 + s * 23;
        // Tail in air
        D.line(g, sx, ifY - 16, sx, ifY, { color: '#f59e0b', width: 2 });
        // Polar head in water
        D.circle(g, sx, ifY + 5, 5, { fill: '#0284c7', stroke: '#38bdf8', width: 1 });
      }

      if (st.isPostCMC) {
        // Draw 3 Spherical Micelles in bulk water
        const micPositions = [[cx - 80, cy + 20], [cx + 80, cy + 10], [cx, cy + 85]];
        micPositions.forEach((pos, mIdx) => {
          const mx = pos[0];
          const my = pos[1];
          const mR = 36;

          // Hydrophobic Core
          D.circle(g, mx, my, mR - 8, { fill: 'rgba(245,158,11,0.25)', stroke: '#f59e0b', width: 1.5 });

          // Surfactant heads on perimeter & tails directed inward
          const nRads = 14;
          for (let r = 0; r < nRads; r++) {
            const a = rad((r / nRads) * 360);
            const hx = mx + Math.cos(a) * mR;
            const hy = my + Math.sin(a) * mR;
            const tx = mx + Math.cos(a) * 12;
            const ty = my + Math.sin(a) * 12;

            D.line(g, hx, hy, tx, ty, { color: '#f59e0b', width: 2 });
            D.circle(g, hx, hy, 4.5, { fill: '#0284c7', stroke: '#38bdf8', width: 1 });
          }
          D.text(g, 'Micelle', mx, my, { color: '#facc15', size: 9.5, weight: 800, align: 'center' });
        });
      } else {
        // Only free monomer surfactants in bulk
        const numMon = Math.round(st.c * 2);
        for (let m = 0; m < numMon; m++) {
          const mx = bX + 60 + ((m * 67) % 320);
          const my = ifY + 45 + ((m * 43) % 180);
          D.circle(g, mx, my, 4.5, { fill: '#0284c7' });
          D.line(g, mx, my, mx + 10, my - 8, { color: '#f59e0b', width: 2 });
        }
        D.text(g, 'Free Monomer Surfactants (c < CMC)', cx, cy + 40, { color: '#94a3b8', size: 12, weight: 600, align: 'center' });
      }

      D.tag(g, st.isPostCMC ? `✓ Post-CMC: Micellar Core Shields Hydrophobic Tails` : `Pre-CMC: Monomers Accumulating at Surface`, cx, 490, { bg: '#0f172a', border: st.isPostCMC ? '#22c55e' : '#f59e0b', color: st.isPostCMC ? '#22c55e' : '#facc15', size: 12, align: 'center' });

      // Right Panel: Surface Tension & Conductivity Breakpoints (x: 540 to 975)
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Property Inflection Curves (γ & κ vs log c)', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const rx = 595;
      const ry = 440;
      const rw = 340;
      const rh = 260;

      D.line(g, rx, ry, rx + rw, ry, { color: '#475569', width: 1.5 });
      D.line(g, rx, ry, rx, ry - rh, { color: '#475569', width: 1.5 });
      D.text(g, 'log(Concentration)', rx + rw - 40, ry + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
      D.text(g, 'Surface Tension γ', rx - 10, ry - rh - 8, { color: '#38bdf8', size: 10.5, weight: 700, align: 'right' });

      // CMC break line vertical
      const cmcX = rx + 0.45 * rw;
      D.line(g, cmcX, ry, cmcX, ry - rh, { color: '#facc15', width: 1.5, dash: [4, 4] });
      D.text(g, `CMC (${st.effectiveCMC} mM)`, cmcX, ry - rh - 6, { color: '#facc15', size: 10, weight: 800, align: 'center' });

      // Surface Tension curve (blue): drops to CMC, then flat horizontal
      const gamPts = [
        [rx, ry - 0.9 * rh],
        [cmcX, ry - 0.35 * rh],
        [rx + rw, ry - 0.35 * rh],
      ];
      D.poly(g, gamPts, { stroke: '#38bdf8', width: 3, fill: false });
      D.text(g, 'γ (Surface Tension)', rx + rw - 70, ry - 0.35 * rh - 10, { color: '#38bdf8', size: 10, weight: 700 });

      // Conductivity curve (orange): steep slope pre-CMC, shallower slope post-CMC
      const condPts = [
        [rx, ry - 0.05 * rh],
        [cmcX, ry - 0.55 * rh],
        [rx + rw, ry - 0.78 * rh],
      ];
      D.poly(g, condPts, { stroke: '#f59e0b', width: 2.5, fill: false });
      D.text(g, 'κ (Conductivity)', rx + rw - 70, ry - 0.78 * rh - 10, { color: '#f59e0b', size: 10, weight: 700 });

      D.rect(g, 560, ry + 32, 395, 42, { fill: '#0f172a', stroke: '#334155', r: 8 });
      D.text(g, 'Sharp slope break at CMC identifies critical concentration.', 575, ry + 53, { color: '#38bdf8', size: 11, weight: 700 });
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 20. BEER-LAMBERT LAW & UV-VIS SPECTROPHOTOMETER
  // ═════════════════════════════════════════════════════════════════
  S['chem-beer-lambert-spec'] = {
    live: true,
    approx: 'Beer-Lambert law A = log10(I0/I) = ε·c·l. Transmittance T = 10^(-A). Non-linear deviation modeled at c > 0.02 M due to chromophore electrostatic interaction.',
    modes: [
      { key: 'kmno4', label: 'Potassium Permanganate (KMnO₄: λ_max = 525 nm, Purple)' },
      { key: 'cuso4', label: 'Copper(II) Sulfate (CuSO₄: λ_max = 810 nm, Blue)' },
      { key: 'k2cr2o7', label: 'Potassium Dichromate (K₂Cr₂O₇: λ_max = 350 nm, Orange)' },
    ],
    params: [
      {
        key: 'concentration',
        label: 'Sample Concentration c (mM)',
        type: 'range',
        default: 0.05,
        min: 0.005,
        max: 0.25,
        step: 0.005,
        unit: 'mM',
        help: 'Molar concentration of the absorbing solute.',
      },
      {
        key: 'pathLength',
        label: 'Cuvette Path Length l (cm)',
        type: 'range',
        default: 1.0,
        min: 0.2,
        max: 5.0,
        step: 0.2,
        unit: 'cm',
        help: 'Standard quartz or optical glass cuvette thickness.',
      },
      {
        key: 'wavelength',
        label: 'Monochromator Wavelength λ (nm)',
        type: 'range',
        default: 525,
        min: 350,
        max: 850,
        step: 5,
        unit: 'nm',
        help: 'Incident light wavelength selected by diffraction grating monochromator.',
      },
    ],
    examples: [
      { label: 'KMnO₄ at λ_max = 525 nm (c = 0.05 mM, l = 1.0 cm)', values: { mode: 'kmno4', concentration: 0.05, pathLength: 1.0, wavelength: 525 } },
      { label: 'CuSO₄ Visible Blue Absorption (c = 0.15 mM, l = 1.0 cm)', values: { mode: 'cuso4', concentration: 0.15, pathLength: 1.0, wavelength: 650 } },
      { label: 'UV Absorption of K₂Cr₂O₇ (c = 0.08 mM, λ = 350 nm)', values: { mode: 'k2cr2o7', concentration: 0.08, pathLength: 1.0, wavelength: 350 } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      return [
        { title: '1. Collimated Light Source & Monochromator', text: 'Tungsten-halogen / Deuterium lamp generates white light. Diffraction grating disperses beam and exit slit isolates monochromatic wavelength λ.' },
        { title: '2. Cuvette Absorption & Beer-Lambert Law', text: 'Monochromatic beam I₀ traverses cuvette path length l containing concentration c. Solute electrons undergo orbital transition, absorbing photon energy: A = ε·c·l.' },
        { title: '3. Photodetector & Linear Calibration Curve', text: 'Photodiode measures transmitted intensity I. Linear plot of A vs c validates Beer-Lambert law and enables unknown concentration quantification.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'kmno4';
      const c_mM = Number(p.concentration != null ? p.concentration : 0.05);
      const c_M = c_mM / 1000;
      const l = Number(p.pathLength != null ? p.pathLength : 1.0);
      const lam = Number(p.wavelength != null ? p.wavelength : 525);

      const dyeData = {
        kmno4: { name: 'Potassium Permanganate (KMnO₄)', lambdaMax: 525, epsMax: 2450, colorHex: '#9333ea', transCol: '#a855f7' },
        cuso4: { name: 'Copper(II) Sulfate (CuSO₄)', lambdaMax: 650, epsMax: 1200, colorHex: '#0284c7', transCol: '#38bdf8' },
        k2cr2o7: { name: 'Potassium Dichromate (K₂Cr₂O₇)', lambdaMax: 350, epsMax: 3100, colorHex: '#ea580c', transCol: '#f97316' },
      }[mode] || { name: 'Sample', lambdaMax: 525, epsMax: 2000, colorHex: '#9333ea', transCol: '#a855f7' };

      // Wavelength dependent extinction coefficient (Gaussian curve around lambdaMax)
      const fwhm = 65;
      const eps = dyeData.epsMax * Math.exp(-Math.pow(lam - dyeData.lambdaMax, 2) / (2 * Math.pow(fwhm / 2.355, 2)));

      // Absorbance A = eps * c * l
      const A = eps * c_M * l;
      const T = Math.pow(10, -A); // Transmittance fraction
      const T_pct = Math.round(T * 1000) / 10;

      return {
        formulas: [
          { name: 'Beer-Lambert Law', formula: 'A = ε · c · l = −log₁₀(I / I₀)', given: `ε = ${Math.round(eps)} M⁻¹·cm⁻¹, c = ${c_mM} mM, l = ${l} cm`, calc: `${Math.round(eps)} × (${c_mM} × 10⁻³) × ${l}`, result: `${A.toFixed(3)}`, unit: 'absorbance' },
          { name: 'Transmittance Percentage', formula: '%T = (I / I₀) × 100% = 10^(−A) × 100%', given: `A = ${A.toFixed(3)}`, calc: `10^(−${A.toFixed(3)}) × 100`, result: `${T_pct.toFixed(1)}%`, unit: '%' },
        ],
        readouts: [
          { label: 'Sample', value: dyeData.name.split(' ')[0], tone: 'hi' },
          { label: 'Absorbance A', value: A.toFixed(3), tone: A > 0.1 && A < 1.5 ? 'good' : 'warn' },
          { label: 'Transmittance %T', value: `${T_pct.toFixed(1)} %`, tone: 'hi' },
          { label: 'Molar Absorptivity ε', value: `${Math.round(eps)} M⁻¹·cm⁻¹`, tone: 'neutral' },
          { label: 'Wavelength λ', value: `${lam} nm`, tone: 'good' },
        ],
        state: {
          mode,
          c_mM,
          l,
          lam,
          eps: Math.round(eps),
          A: Math.round(A * 1000) / 1000,
          T_pct,
          dyeName: dyeData.name,
          colorHex: dyeData.colorHex,
          transCol: dyeData.transCol,
          lambdaMax: dyeData.lambdaMax,
        },
        explain: {
          what: `The Beer-Lambert law states that the absorbance of light by a chemical species in solution is directly proportional to its molar concentration c and the cuvette optical path length l.`,
          why: `Photons matching the energy gap ΔE = hc/λ are absorbed to promote electrons from ground state (e.g. non-bonding n or π) to excited antibonding π* or d-d orbitals.`,
          param: `Molar absorptivity ε measures how strongly a chromophore absorbs light at a given wavelength; it peaks at λ_max (e.g. 525 nm for purple KMnO₄).`,
          effect: `High concentrations (c > 0.01 M) cause electrostatic interactions between absorbing chromophores that alter the charge distribution, resulting in negative deviation from linearity.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Incident monochromatic radiation (I₀) passing through entrance slit' : step === 1 ? 'Exponential photon absorption in cuvette sample path: I = I₀·10^(-εbc)' : 'Transmitted light detection (I) & linear Beer-Lambert calibration graph');

      // Header Banner
      D.text(g, 'SPECTROSCOPY: BEER-LAMBERT LAW & UV-VIS SPECTROPHOTOMETER', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `${st.dyeName} · λ = ${st.lam} nm · Path length l = ${st.l} cm · A = ${st.A.toFixed(3)} · %T = ${st.T_pct}%`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: Spectrophotometer Optics Beam Line (x: 24 to 530)
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'UV-Vis Spectrophotometer Optical Path', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const cx = 270;
      const cy = 290;

      // Light Source Lamp (x: 45, y: cy)
      D.circle(g, 65, cy, 22, { fill: '#facc15', stroke: '#ffffff', width: 2 });
      D.text(g, 'Lamp', 65, cy + 32, { color: '#facc15', size: 10, weight: 800, align: 'center' });

      // Collimated White Beam
      D.line(g, 87, cy, 140, cy, { color: '#ffffff', width: 5 });

      // Monochromator Prism / Grating
      D.poly(g, [[140, cy - 30], [175, cy], [140, cy + 30]], { fill: '#334155', stroke: '#38bdf8', width: 2, close: true });
      D.text(g, 'Grating', 152, cy + 42, { color: '#38bdf8', size: 9, weight: 700, align: 'center' });

      // Monochromatic Selected Beam (I0)
      const beamCol = st.transCol;
      D.line(g, 175, cy, 245, cy, { color: beamCol, width: 4 });
      D.text(g, 'I₀ (100%)', 210, cy - 12, { color: beamCol, size: 10, weight: 700, align: 'center' });

      // Quartz Cuvette
      const cuvW = Math.round(st.l * 30);
      const cuvX = 245;
      D.rect(g, cuvX, cy - 50, cuvW, 100, { fill: st.colorHex, stroke: '#ffffff', width: 2, r: 4 });
      D.text(g, `l = ${st.l} cm`, cuvX + cuvW / 2, cy + 62, { color: '#ffffff', size: 10, weight: 800, align: 'center' });

      // Attenuated Transmitted Beam (I)
      const outWidth = Math.max(1, (st.T_pct / 100) * 4);
      D.line(g, cuvX + cuvW, cy, 430, cy, { color: beamCol, width: outWidth });
      D.text(g, `I (${st.T_pct}%)`, 380, cy - 12, { color: beamCol, size: 10, weight: 700, align: 'center' });

      // Photodiode Detector
      D.rect(g, 430, cy - 35, 30, 70, { fill: '#0f172a', stroke: '#22c55e', width: 2, r: 4 });
      D.text(g, 'Detector', 445, cy + 46, { color: '#22c55e', size: 9, weight: 800, align: 'center' });

      D.tag(g, `A = ε · c · l = ${st.A.toFixed(3)} | Transmittance: ${st.T_pct}%`, cx, 490, { bg: '#0f172a', border: '#38bdf8', color: '#38bdf8', size: 12, align: 'center' });

      // Right Panel: Linear Calibration Curve A vs c (x: 540 to 975)
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Beer-Lambert Calibration Line A vs c', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const rx = 595;
      const ry = 440;
      const rw = 340;
      const rh = 260;

      D.line(g, rx, ry, rx + rw, ry, { color: '#475569', width: 1.5 });
      D.line(g, rx, ry, rx, ry - rh, { color: '#475569', width: 1.5 });
      D.text(g, 'Concentration c (mM)', rx + rw - 40, ry + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
      D.text(g, 'Absorbance A', rx - 10, ry - rh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

      // Calibration straight line through origin
      const maxC = 0.25;
      const maxA_cal = (st.eps * (maxC / 1000) * st.l);
      const endCalY = ry - clamp(maxA_cal / 2.0, 0, 1) * rh;
      D.line(g, rx, ry, rx + rw, endCalY, { color: '#38bdf8', width: 3 });

      // Current sample point
      const curCalX = rx + (st.c_mM / maxC) * rw;
      const curCalY = ry - clamp(st.A / 2.0, 0, 1) * rh;

      D.line(g, curCalX, ry, curCalX, curCalY, { color: '#facc15', width: 1.5, dash: [3, 3] });
      D.line(g, rx, curCalY, curCalX, curCalY, { color: '#facc15', width: 1.5, dash: [3, 3] });
      D.circle(g, curCalX, curCalY, 6, { fill: '#facc15', stroke: '#ffffff', width: 2 });
      D.text(g, `A = ${st.A.toFixed(3)}`, curCalX + 10, curCalY - 10, { color: '#facc15', size: 11, weight: 800 });

      D.rect(g, 560, ry + 32, 395, 42, { fill: '#0f172a', stroke: '#334155', r: 8 });
      D.text(g, `Linearity holds up to A ~ 1.5. Slope = ε · l = ${(st.eps * st.l).toFixed(0)}`, 575, ry + 53, { color: '#38bdf8', size: 11, weight: 700 });
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 21. IR & 1H-NMR SPECTRUM INTERPRETER
  // ═════════════════════════════════════════════════════════════════
  S['chem-spectroscopy-interpreter'] = {
    live: true,
    approx: 'IR vibrational frequencies based on Hooke\'s law ν = (1/2πc)√(k/μ). 1H-NMR chemical shifts and (n+1) scalar spin-spin multiplet splitting.',
    modes: [
      { key: 'ethanol', label: 'Ethanol (CH₃CH₂OH: Triplet, Quartet, Broad Singlet)' },
      { key: 'acetone', label: 'Acetone (CH₃COCH₃: Strong 1715 cm⁻¹ C=O, 1H Singlet)' },
      { key: 'ethyl_acetate', label: 'Ethyl Acetate (CH₃COOCH₂CH₃: Ester C=O + C-O)' },
    ],
    params: [
      {
        key: 'spectroscopyType',
        label: 'Spectroscopic Technique',
        type: 'select',
        default: 'ir',
        options: [
          { value: 'ir', label: 'Infrared (FT-IR) Vibrational Spectrum (4000 – 600 cm⁻¹)' },
          { value: 'nmr', label: 'Proton (¹H-NMR) Resonance Spectrum (0 – 12 ppm)' },
        ],
        help: 'Switch between IR functional group vibrations and ¹H-NMR proton chemical environment shifts.',
      },
    ],
    examples: [
      { label: 'Ethanol IR Broad O-H Stretch (3350 cm⁻¹)', values: { mode: 'ethanol', spectroscopyType: 'ir' } },
      { label: 'Ethanol ¹H-NMR Quartet & Triplet Splitting', values: { mode: 'ethanol', spectroscopyType: 'nmr' } },
      { label: 'Acetone Sharp Carbonyl C=O Peak (1715 cm⁻¹)', values: { mode: 'acetone', spectroscopyType: 'ir' } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      if (p.spectroscopyType === 'ir') {
        return [
          { title: '1. Dipole Moment Change & IR Absorption', text: 'Molecules absorb infrared radiation only if the vibration produces a periodic change in electric dipole moment (selection rule dμ/dr ≠ 0).' },
          { title: '2. Functional Group Region (4000 – 1500 cm⁻¹)', text: 'Hooke\'s law ν = (1/2πc)√(k/μ) shows stiffer bonds (C=O: 1715 cm⁻¹) and lighter atoms (O-H: 3300 cm⁻¹) absorb at higher wavenumbers.' },
          { title: '3. Fingerprint Region (1500 – 600 cm⁻¹)', text: 'Complex bending and skeletal vibrations unique to the entire molecular framework provide an unmistakable molecular fingerprint.' },
        ];
      }
      return [
        { title: '1. Nuclear Zeeman Splitting & Larmor Precession', text: 'Protons (I = 1/2) precess in strong magnetic field B₀. Radiofrequency pulse induces resonance transitions at frequency ν = γ B_local / 2π.' },
        { title: '2. Chemical Shift δ (ppm relative to TMS)', text: 'Electron cloud shields nucleus from B₀. Electronegative oxygen deshields adjacent protons (CH₂ at 3.6 ppm), shifting resonance downfield.' },
        { title: '3. Spin-Spin Multiplicity (n+1 Rule)', text: 'Protons couple with n equivalent vicinal neighbors through bonding electrons: CH₃ couples with 2 protons → triplet (1:2:1); CH₂ couples with 3 protons → quartet (1:3:3:1).' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'ethanol';
      const spec = p.spectroscopyType || 'ir';

      const cmpData = {
        ethanol: {
          name: 'Ethanol (CH₃CH₂OH)',
          irBands: [
            { wn: 3350, intensity: 'Broad Strong', bond: 'O-H stretch (H-bonded)' },
            { wn: 2970, intensity: 'Sharp Medium', bond: 'C-H sp³ stretch' },
            { wn: 1050, intensity: 'Sharp Strong', bond: 'C-O single bond stretch' },
          ],
          nmrPeaks: [
            { delta: 1.2, mult: 'Triplet (3H)', env: 'CH₃ group' },
            { delta: 3.6, mult: 'Quartet (2H)', env: 'CH₂ adjacent to O' },
            { delta: 4.8, mult: 'Singlet (1H)', env: 'OH proton' },
          ],
        },
        acetone: {
          name: 'Acetone (CH₃COCH₃)',
          irBands: [
            { wn: 1715, intensity: 'Sharp Very Strong', bond: 'C=O carbonyl stretch' },
            { wn: 2960, intensity: 'Medium', bond: 'C-H sp³ stretch' },
            { wn: 1360, intensity: 'Medium', bond: 'CH₃ bending' },
          ],
          nmrPeaks: [
            { delta: 2.15, mult: 'Singlet (6H)', env: 'Equivalent 2×CH₃ adjacent to C=O' },
          ],
        },
        ethyl_acetate: {
          name: 'Ethyl Acetate (CH₃COOCH₂CH₃)',
          irBands: [
            { wn: 1740, intensity: 'Sharp Very Strong', bond: 'Ester C=O stretch' },
            { wn: 1240, intensity: 'Sharp Strong', bond: 'Ester C-O stretch' },
            { wn: 2980, intensity: 'Medium', bond: 'C-H sp³ stretch' },
          ],
          nmrPeaks: [
            { delta: 1.25, mult: 'Triplet (3H)', env: 'Ester CH₃' },
            { delta: 2.05, mult: 'Singlet (3H)', env: 'Acetyl CH₃' },
            { delta: 4.12, mult: 'Quartet (2H)', env: '-OCH₂- group' },
          ],
        },
      }[mode] || { name: 'Compound', irBands: [], nmrPeaks: [] };

      return {
        formulas: [
          { name: spec === 'ir' ? 'Hooke\'s Law for Vibrational Frequency' : 'Chemical Shift Definition', formula: spec === 'ir' ? 'ν̄ = (1 / 2πc) √(k / μ)' : 'δ = (ν_sample − ν_TMS) / ν_spectrometer × 10⁶', given: `Reduced mass μ = m₁ m₂ / (m₁ + m₂)`, calc: spec === 'ir' ? 'Stronger bond k raises frequency' : 'Expressed in parts per million (ppm)', result: spec === 'ir' ? 'Vibrational ν' : 'Chemical shift δ', unit: spec === 'ir' ? 'cm⁻¹' : 'ppm' },
        ],
        readouts: [
          { label: 'Compound', value: cmpData.name.split(' ')[0], tone: 'hi' },
          { label: 'Technique', value: spec.toUpperCase(), tone: 'good' },
          { label: 'Diagnostic Feature', value: spec === 'ir' ? cmpData.irBands[0].bond.split(' ')[0] : cmpData.nmrPeaks[0].mult, tone: 'hi' },
          { label: 'Number of Signals', value: String(spec === 'ir' ? cmpData.irBands.length : cmpData.nmrPeaks.length), tone: 'neutral' },
        ],
        state: {
          mode,
          spec,
          cmpName: cmpData.name,
          irBands: cmpData.irBands,
          nmrPeaks: cmpData.nmrPeaks,
        },
        explain: {
          what: `Infrared spectroscopy probes molecular vibrational transitions to identify characteristic functional groups, while ¹H-NMR analyzes magnetic environments of hydrogen nuclei to map molecular connectivity.`,
          why: `In IR, carbonyl C=O bonds have high force constants k and large dipole moments, yielding a sharp intense absorption at ~1715 cm⁻¹. In NMR, electronegative oxygen atoms deshield adjacent protons, shifting resonances downfield (higher ppm).`,
          param: `In ¹H-NMR, spin-spin splitting obeys the (n+1) rule: vicinal protons couple through three chemical bonds, splitting each other's signals into multiplets according to Pascal's triangle.`,
          effect: `Hydrogen bonding broadens O-H stretching bands (3200–3600 cm⁻¹) in alcohols due to a distribution of hydrogen bond lengths and weakened O-H force constants.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Molecular dipole moment & quantized vibrational stretching/bending modes' : step === 1 ? 'Diagnostic functional group absorption frequency identification' : 'Structural elucidation: confirming molecular connectivity & symmetry');

      // Header Banner
      D.text(g, st.spec === 'ir' ? `FT-IR VIBRATIONAL SPECTRUM: ${st.cmpName.toUpperCase()}` : `¹H-NMR RESONANCE SPECTRUM: ${st.cmpName.toUpperCase()}`, 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
      D.text(g, `Structure: ${st.cmpName} · Diagnostic Spectrum · ${st.spec.toUpperCase()}`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

      // Left Panel: Simulated Spectrum Graph (x: 24 to 530)
      D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, st.spec === 'ir' ? 'Transmittance Spectrum (%T vs Wavenumber)' : 'Chemical Shift Scale (Intensity vs δ ppm)', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const cx = 270;
      const gx = 80;
      const gy = 440;
      const gw = 410;
      const gh = 260;

      D.line(g, gx, gy, gx + gw, gy, { color: '#475569', width: 1.5 });
      D.line(g, gx, gy, gx, gy - gh, { color: '#475569', width: 1.5 });

      if (st.spec === 'ir') {
        // IR spectrum: Wavenumbers 4000 to 500 cm-1 (reversed x-axis)
        D.text(g, 'Wavenumber ν̄ (cm⁻¹)', gx + gw - 40, gy + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
        D.text(g, 'Transmittance %T (Inverted Peaks)', gx - 10, gy - gh - 8, { color: '#94a3b8', size: 10.5, weight: 600, align: 'right' });

        // High baseline at 95% T
        const baseLineY = gy - 0.88 * gh;
        const irPts = [];
        const numPts = 100;
        for (let i = 0; i <= numPts; i++) {
          const wn = 4000 - (i / numPts) * 3400;
          let dip = 0;
          st.irBands.forEach((b) => {
            const width = b.wn === 3350 ? 140 : 35;
            dip += (b.wn === 3350 ? 0.65 : 0.75) * Math.exp(-Math.pow(wn - b.wn, 2) / (2 * Math.pow(width, 2)));
          });
          const px = gx + (i / numPts) * gw;
          const py = baseLineY + dip * (gh * 0.7);
          irPts.push([px, py]);
        }
        D.poly(g, irPts, { stroke: '#38bdf8', width: 2.5, fill: false });

        // Label bands
        st.irBands.forEach((b) => {
          const bx = gx + ((4000 - b.wn) / 3400) * gw;
          D.text(g, `${b.wn} cm⁻¹`, bx, gy - 20, { color: '#facc15', size: 9.5, weight: 700, align: 'center' });
        });
      } else {
        // 1H-NMR spectrum: 12 ppm down to 0 ppm (TMS)
        D.text(g, 'Chemical Shift δ (ppm)', gx + gw - 35, gy + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
        D.text(g, 'Resonance Intensity', gx - 10, gy - gh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

        // TMS reference peak at 0 ppm (far right)
        const tmsX = gx + gw - 20;
        D.line(g, tmsX, gy, tmsX, gy - 0.6 * gh, { color: '#94a3b8', width: 2 });
        D.text(g, 'TMS (0 ppm)', tmsX, gy - 0.6 * gh - 10, { color: '#94a3b8', size: 9, align: 'center' });

        // Compound peaks
        st.nmrPeaks.forEach((pk) => {
          const pkX = gx + ((10 - pk.delta) / 10) * (gw - 50);
          D.line(g, pkX, gy, pkX, gy - 0.75 * gh, { color: '#38bdf8', width: 3 });
          D.text(g, `${pk.delta} ppm`, pkX, gy - 0.75 * gh - 12, { color: '#facc15', size: 10.5, weight: 800, align: 'center' });
          D.text(g, pk.mult, pkX, gy - 0.75 * gh - 26, { color: '#38bdf8', size: 9.5, weight: 700, align: 'center' });
        });
      }

      D.tag(g, `Structural Identification: ${st.cmpName}`, cx, 490, { bg: '#0f172a', border: '#38bdf8', color: '#38bdf8', size: 12, align: 'center' });

      // Right Panel: Spectral Assignments (x: 540 to 975)
      D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
      D.text(g, 'Spectroscopic Assignments & Interpretation', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

      const listY = 145;
      if (st.spec === 'ir') {
        st.irBands.forEach((b, i) => {
          const by = listY + i * 85;
          D.rect(g, 560, by, 395, 72, { fill: '#0f172a', stroke: '#334155', r: 8 });
          D.text(g, `${b.wn} cm⁻¹ — ${b.bond}`, 575, by + 24, { color: '#fbbf24', size: 12, weight: 700 });
          D.text(g, `Intensity: ${b.intensity} · Diagnostic functional group band`, 575, by + 46, { color: '#cbd5e1', size: 11 });
        });
      } else {
        st.nmrPeaks.forEach((pk, i) => {
          const by = listY + i * 85;
          D.rect(g, 560, by, 395, 72, { fill: '#0f172a', stroke: '#334155', r: 8 });
          D.text(g, `δ = ${pk.delta} ppm (${pk.mult})`, 575, by + 24, { color: '#38bdf8', size: 12, weight: 700 });
          D.text(g, `Assignment: ${pk.env}`, 575, by + 46, { color: '#cbd5e1', size: 11 });
        });
      }

      D.rect(g, 560, 420, 395, 80, { fill: '#0f172a', stroke: '#22c55e', r: 8 });
      D.text(g, 'Spectroscopic Synergy:', 575, 442, { color: '#22c55e', size: 11.5, weight: 700 });
      D.text(g, 'Combining IR (functional groups) with ¹H-NMR (connectivity)', 575, 464, { color: '#cbd5e1', size: 10.5 });
      D.text(g, 'unambiguously proves the complete organic structure.', 575, 482, { color: '#cbd5e1', size: 10.5 });
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 22. THIN LAYER (TLC) & HPLC/GC CHROMATOGRAM SIMULATOR
  // ═════════════════════════════════════════════════════════════════
  S['chem-chromatography-tlc'] = {
    live: true,
    approx: 'TLC retention factor Rf = d_spot / d_solvent. HPLC resolution Rs = 2(tR2 - tR1)/(w1 + w2). Van Deemter equation HETP = A + B/u + C·u.',
    modes: [
      { key: 'tlc', label: 'Thin Layer Chromatography (TLC: Silica Gel Plate Rf Analysis)' },
      { key: 'hplc', label: 'HPLC / GC Chromatogram (Retention Time tR & Peak Resolution)' },
    ],
    params: [
      {
        key: 'solventPolarity',
        label: 'Mobile Phase Polarity (% Ethyl Acetate in Hexane)',
        type: 'range',
        default: 30,
        min: 0,
        max: 100,
        step: 5,
        unit: '%',
        help: 'Higher mobile phase polarity competes with silica gel, increasing Rf values of all spots.',
      },
      {
        key: 'plateDevelopment',
        label: 'TLC Plate Development Progress (%)',
        type: 'range',
        default: 100,
        min: 10,
        max: 100,
        step: 5,
        unit: '%',
        showIf: (p) => p.mode === 'tlc',
        help: 'Capillary migration of the solvent front up the TLC silica plate.',
      },
    ],
    examples: [
      { label: 'TLC Separation in 30% EtOAc/Hexane (Optimal Resolution)', values: { mode: 'tlc', solventPolarity: 30, plateDevelopment: 100 } },
      { label: 'Non-Polar 100% Hexane Solvent (Spots do not move, Rf ~ 0)', values: { mode: 'tlc', solventPolarity: 0, plateDevelopment: 100 } },
      { label: 'HPLC Reversed-Phase Binary Chromatogram', values: { mode: 'hplc', solventPolarity: 50 } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      if (p.mode === 'tlc') {
        return [
          { title: '1. Spotting & Capillary Elution', text: 'Analytes are spotted onto baseline of polar silica gel (SiO₂) plate. Capillary action draws solvent front up the plate.' },
          { title: '2. Differential Partitioning (Rf = d_spot / d_front)', text: 'Polar compounds interact strongly with silanol (Si-OH) groups and move slowly (low Rf). Non-polar compounds partition favorably into mobile phase and migrate near solvent front (high Rf).' },
          { title: '3. Solvent Polarity Optimization', text: 'Increasing ethyl acetate percentage increases eluent strength, displacing polar solutes and increasing all Rf values toward the ideal 0.2 – 0.7 window.' },
        ];
      }
      return [
        { title: '1. Column Injection & Separation', text: 'High pressure pump delivers mobile phase across packed C18 column (RP-HPLC). Components partition dynamically between stationary and mobile phases.' },
        { title: '2. Retention Time (tR) & Peak Broadening', text: 'Analytes elute at retention times tR1 and tR2. Peak width w is governed by Van Deemter band broadening (eddy diffusion, longitudinal diffusion, mass transfer).' },
        { title: '3. Chromatographic Resolution Rs = 2(tR2 − tR1)/(w1 + w2)', text: 'Complete baseline separation requires Rs ≥ 1.5. Adjusting mobile phase composition tunes selectivity α and retention factors.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'tlc';
      const pol = Number(p.solventPolarity != null ? p.solventPolarity : 30);
      const dev = Number(p.plateDevelopment != null ? p.plateDevelopment : 100) / 100;

      // Base Rf values for 3 components (non-polar A, intermediate B, polar C)
      const polFrac = pol / 100;
      const rfA = clamp(0.25 + polFrac * 0.65, 0.05, 0.95); // Non-polar (fastest)
      const rfB = clamp(0.12 + polFrac * 0.50, 0.03, 0.75); // Intermediate
      const rfC = clamp(0.02 + polFrac * 0.35, 0.01, 0.50); // Polar (slowest)

      // HPLC Resolution Rs
      const tR1 = 3.5 + (1 - polFrac) * 2.5;
      const tR2 = 5.2 + (1 - polFrac) * 4.0;
      const w1 = 0.5;
      const w2 = 0.6;
      const Rs = (2 * (tR2 - tR1)) / (w1 + w2);

      return {
        formulas: [
          { name: 'TLC Retention Factor', formula: 'Rf = d_spot / d_solvent', given: `Solvent Polarity = ${pol}% EtOAc`, calc: `Rf(A) = ${rfA.toFixed(2)}, Rf(B) = ${rfB.toFixed(2)}, Rf(C) = ${rfC.toFixed(2)}`, result: `${rfB.toFixed(2)}`, unit: 'Rf' },
          { name: 'Chromatographic Resolution', formula: 'Rs = 2(t_R2 − t_R1) / (w₁ + w₂)', given: `tR1 = ${tR1.toFixed(1)} min, tR2 = ${tR2.toFixed(1)} min`, calc: `2 × (${(tR2 - tR1).toFixed(1)}) / 1.1`, result: `${Rs.toFixed(2)}`, unit: Rs >= 1.5 ? 'baseline separated' : 'overlapping' },
        ],
        readouts: [
          { label: 'Technique', value: mode.toUpperCase(), tone: 'hi' },
          { label: 'Rf (Non-Polar A)', value: rfA.toFixed(2), tone: 'good' },
          { label: 'Rf (Intermediate B)', value: rfB.toFixed(2), tone: 'good' },
          { label: 'Rf (Polar C)', value: rfC.toFixed(2), tone: 'neutral' },
          { label: 'Resolution Rs', value: `${Rs.toFixed(2)}`, tone: Rs >= 1.5 ? 'good' : 'warn' },
        ],
        state: {
          mode,
          pol,
          dev,
          rfA: Math.round(rfA * 100) / 100,
          rfB: Math.round(rfB * 100) / 100,
          rfC: Math.round(rfC * 100) / 100,
          Rs: Math.round(Rs * 100) / 100,
        },
        explain: {
          what: `Chromatography separates mixture components based on differential distribution between a stationary phase (e.g. silica gel plate or C18 column) and a moving mobile phase.`,
          why: `In normal-phase TLC, silica gel is highly polar (Si-OH); polar molecules bind tightly via hydrogen bonding and dipole interactions, moving slowly (low Rf), while non-polar molecules elute quickly (high Rf).`,
          param: `Increasing mobile phase polarity displaces polar solutes from the silica active sites, driving all spots up the plate to higher Rf values.`,
          effect: `Chromatographic resolution Rs ≥ 1.5 ensures complete baseline purity separation with less than 0.1% peak overlap.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Sample spotting on origin line of polar stationary silica gel' : step === 1 ? 'Capillary ascent of mobile phase & differential component partitioning' : 'Solvent front detection & retention factor (Rf = spot_dist / solvent_dist)');

      if (st.mode === 'tlc') {
        // TLC Plate Simulation
        D.text(g, 'THIN LAYER CHROMATOGRAPHY (TLC) SEPARATION ON SILICA GEL', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
        D.text(g, `Mobile Phase: ${st.pol}% EtOAc / Hexane · Rf(A) = ${st.rfA} · Rf(B) = ${st.rfB} · Rf(C) = ${st.rfC}`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

        // Left Panel: TLC Plate Chamber (x: 24 to 530)
        D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
        D.text(g, 'TLC Developing Chamber with Solvent Front', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

        const cx = 270;
        const cy = 290;

        // TLC Silica Plate (x: 170 to 370, y: 140 to 450)
        const pX = 180;
        const pY = 140;
        const pW = 180;
        const pH = 310;

        D.rect(g, pX, pY, pW, pH, { fill: '#ffffff', stroke: '#94a3b8', width: 2, r: 6 });

        // Baseline (Origin line) at y = pY + pH - 40
        const baseY = pY + pH - 40;
        D.line(g, pX, baseY, pX + pW, baseY, { color: '#64748b', width: 1.5, dash: [4, 4] });
        D.text(g, 'Origin Baseline', pX + 15, baseY + 14, { color: '#64748b', size: 9 });

        // Solvent Front line advancing with dev parameter
        const maxDist = pH - 75;
        const curDist = maxDist * st.dev;
        const frontY = baseY - curDist;

        D.line(g, pX, frontY, pX + pW, frontY, { color: '#0284c7', width: 2 });
        D.text(g, 'Solvent Front', pX + pW - 75, frontY - 8, { color: '#0284c7', size: 9.5, weight: 700 });

        // Three Lanes: Left = Spot A, Center = Mixture (A+B+C), Right = Spot C
        const laneX = cx;

        // Spot A (Non-polar, yellow)
        const spotAy = baseY - curDist * st.rfA;
        D.circle(g, laneX, spotAy, 7, { fill: '#facc15' });

        // Spot B (Intermediate, green)
        const spotBy = baseY - curDist * st.rfB;
        D.circle(g, laneX, spotBy, 7, { fill: '#22c55e' });

        // Spot C (Polar, red)
        const spotCy = baseY - curDist * st.rfC;
        D.circle(g, laneX, spotCy, 7, { fill: '#ef4444' });

        D.tag(g, `Optimal Elution: Rf values in ideal 0.2 – 0.7 window`, cx, 490, { bg: '#0f172a', border: '#22c55e', color: '#22c55e', size: 12, align: 'center' });

        // Right Panel: Rf Retention Summary
        D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
        D.text(g, 'Retention Factor (Rf) Analysis & Polarity', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

        const rfItems = [
          { name: 'Compound A (Non-Polar Ester)', rf: st.rfA, col: '#facc15', desc: 'Minimal interaction with polar silica; elutes near solvent front.' },
          { name: 'Compound B (Intermediate Ketone)', rf: st.rfB, col: '#22c55e', desc: 'Balanced partition between mobile phase and silica gel.' },
          { name: 'Compound C (Polar Carboxylic Acid)', rf: st.rfC, col: '#ef4444', desc: 'Strong hydrogen bonding with silanol (Si-OH) groups; low Rf.' },
        ];

        rfItems.forEach((it, i) => {
          const iy = 150 + i * 85;
          D.rect(g, 560, iy, 395, 72, { fill: '#0f172a', stroke: '#334155', r: 8 });
          D.text(g, `${it.name}: Rf = ${it.rf.toFixed(2)}`, 575, iy + 24, { color: it.col, size: 12, weight: 800 });
          D.text(g, it.desc, 575, iy + 46, { color: '#cbd5e1', size: 10.5 });
        });

        D.rect(g, 560, 420, 395, 80, { fill: '#0f172a', stroke: '#38bdf8', r: 8 });
        D.text(g, 'Principle: "Like dissolves like"', 575, 442, { color: '#38bdf8', size: 12, weight: 700 });
        D.text(g, 'Polar solutes have low Rf on normal-phase polar silica gel.', 575, 464, { color: '#cbd5e1', size: 11 });
      } else {
        // HPLC Chromatogram
        D.text(g, 'HIGH-PERFORMANCE LIQUID CHROMATOGRAPHY (HPLC) PROFILE', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
        D.text(g, `Reversed-Phase C18 · Peak Resolution Rs = ${st.Rs} · ${st.Rs >= 1.5 ? 'Baseline Resolved (Rs ≥ 1.5)' : 'Partial Overlap'}`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

        // Left Panel: Chromatogram Curve (x: 24 to 530)
        D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
        D.text(g, 'HPLC Chromatogram (Detector Response vs Time)', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

        const gx = 80;
        const gy = 440;
        const gw = 410;
        const gh = 260;

        D.line(g, gx, gy, gx + gw, gy, { color: '#475569', width: 1.5 });
        D.line(g, gx, gy, gx, gy - gh, { color: '#475569', width: 1.5 });
        D.text(g, 'Retention Time tR (min)', gx + gw - 40, gy + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
        D.text(g, 'Signal (mAU)', gx - 10, gy - gh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

        // Plot 2 Gaussian peaks
        const hplcPts = [];
        const nPts = 100;
        const tMax = 12;

        for (let i = 0; i <= nPts; i++) {
          const t = (i / nPts) * tMax;
          const p1 = 0.85 * Math.exp(-Math.pow(t - 4.2, 2) / (2 * Math.pow(0.28, 2)));
          const p2 = 0.95 * Math.exp(-Math.pow(t - 7.5, 2) / (2 * Math.pow(0.35, 2)));
          const sig = p1 + p2;

          const px = gx + (t / tMax) * gw;
          const py = gy - sig * (gh - 30);
          hplcPts.push([px, py]);
        }
        D.poly(g, hplcPts, { stroke: '#38bdf8', width: 2.5, fill: false });

        D.text(g, 'Peak 1 (tR = 4.2 min)', gx + (4.2 / tMax) * gw, gy - 0.85 * (gh - 30) - 10, { color: '#facc15', size: 10, weight: 800, align: 'center' });
        D.text(g, 'Peak 2 (tR = 7.5 min)', gx + (7.5 / tMax) * gw, gy - 0.95 * (gh - 30) - 10, { color: '#22c55e', size: 10, weight: 800, align: 'center' });

        D.tag(g, `Resolution Rs = ${st.Rs} (Baseline Separated)`, 270, 490, { bg: '#0f172a', border: '#22c55e', color: '#22c55e', size: 12, align: 'center' });

        // Right Panel: Van Deemter Equation & Efficiency
        D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
        D.text(g, 'Van Deemter Equation & Column Efficiency', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

        D.rect(g, 560, 145, 395, 330, { fill: '#0f172a', stroke: '#334155', r: 8 });
        D.text(g, 'HETP = A + B / u + C · u', 575, 175, { color: '#facc15', size: 13, weight: 800 });
        D.text(g, '• A Term (Eddy Diffusion): Multiple flow paths through packing.', 575, 210, { color: '#cbd5e1', size: 11 });
        D.text(g, '• B Term (Longitudinal Diffusion): Molecular spreading at low velocity.', 575, 240, { color: '#cbd5e1', size: 11 });
        D.text(g, '• C Term (Mass Transfer Resistance): Equilibrium lag at high velocity.', 575, 270, { color: '#cbd5e1', size: 11 });
        D.text(g, '• Optimal linear velocity u_opt minimizes plate height HETP,', 575, 310, { color: '#38bdf8', size: 11, weight: 700 });
        D.text(g, '  yielding the maximum theoretical plate count N = L / H.', 575, 330, { color: '#38bdf8', size: 11, weight: 700 });
      }
    },
  };
})();
