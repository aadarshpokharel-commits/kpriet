'use strict';

/**
 * Engineering Chemistry — Unit II: Organic Chemistry and Mechanisms
 * Interactive Simulation Engines for U25CY103
 *
 * Implements:
 *  6. chem-sn1-sn2-mechanism: SN1 vs SN2 Reaction Mechanism & Energy Profile
 *  7. chem-elimination-substitution: E1/E2 & Electrophilic Aromatic Substitution (SEAr) Stepper
 *  8. chem-azo-dye-synthesis: Azo Dye Synthesis Flow (Diazotization to Coupling)
 */
(function () {
  const S = (window.ChemSims = window.ChemSims || {});
  const D = window.EPDraw;
  const { C, fmt, clamp, lerp, rad } = D;

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
  // 6. SN1 vs SN2 REACTION MECHANISM & ENERGY PROFILE
  // ═════════════════════════════════════════════════════════════════
  S['chem-sn1-sn2-mechanism'] = {
    live: true,
    approx: 'Kinetics modeled via transition state theory with Arrhenius rate constant k = A·exp(−Ea/RT). Relative rates normalized to methyl bromide SN2 and tert-butyl bromide SN1.',
    modes: [
      { key: 'sn2', label: 'SN2 (Concerted Bimolecular, Walden Inversion)' },
      { key: 'sn1', label: 'SN1 (Stepwise Unimolecular, Racemization)' },
    ],
    params: [
      {
        key: 'substrate',
        label: 'Substrate Class',
        type: 'select',
        default: 'secondary',
        options: [
          { value: 'methyl', label: 'Methyl Bromide (CH₃Br) — 0° / Methyl' },
          { value: 'primary', label: 'Ethyl Bromide (CH₃CH₂Br) — 1° Primary' },
          { value: 'secondary', label: '2-Bromopropane ((CH₃)₂CHBr) — 2° Secondary' },
          { value: 'tertiary', label: 'tert-Butyl Bromide ((CH₃)₃CBr) — 3° Tertiary' },
        ],
        help: 'Substrate degree governs steric hindrance in SN2 and carbocation stability in SN1.',
      },
      {
        key: 'nucleophile',
        label: 'Nucleophile (:Nu⁻)',
        type: 'select',
        default: 'oh',
        options: [
          { value: 'oh', label: 'Hydroxide (:OH⁻) — Strong, Anionic' },
          { value: 'cn', label: 'Cyanide (:CN⁻) — Very Strong, Anionic' },
          { value: 'acetate', label: 'Acetate (CH₃COO⁻) — Moderate, Resonance-Stabilized' },
          { value: 'h2o', label: 'Water (H₂O) — Weak, Neutral Protic' },
        ],
        help: 'Strong nucleophiles favor SN2; weak neutral nucleophiles allow solvolytic SN1.',
      },
      {
        key: 'solvent',
        label: 'Solvent Environment',
        type: 'select',
        default: 'aprotic',
        options: [
          { value: 'aprotic', label: 'Polar Aprotic (Acetone / DMSO) — Favors SN2' },
          { value: 'protic', label: 'Polar Protic (H₂O / EtOH) — Stabilizes Carbocation, Favors SN1' },
        ],
        help: 'Aprotic solvents do not hydrogen-bond with nucleophiles, maximizing SN2 rate.',
      },
      {
        key: 'progress',
        label: 'Reaction Coordinate (%)',
        type: 'range',
        default: 35,
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
        help: 'Scrub along the reaction coordinate from reactants (0%) to transition state / intermediate to products (100%).',
      },
    ],
    examples: [
      { label: 'Methyl Bromide + OH⁻ (Rapid SN2 Inversion)', values: { mode: 'sn2', substrate: 'methyl', nucleophile: 'oh', solvent: 'aprotic', progress: 50 } },
      { label: 'tert-Butyl Bromide + H₂O (Solvolysis SN1 Racemization)', values: { mode: 'sn1', substrate: 'tertiary', nucleophile: 'h2o', solvent: 'protic', progress: 55 } },
      { label: '2-Bromopropane Borderline Substrate', values: { mode: 'sn2', substrate: 'secondary', nucleophile: 'cn', solvent: 'aprotic', progress: 40 } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      if (p.mode === 'sn2') {
        return [
          { title: '1. Backside Attack Trajectory', text: 'Nucleophile :Nu⁻ approaches at 180° opposite the C-Br bond to overlap with the σ* antibonding orbital while minimizing electrostatic repulsion.' },
          { title: '2. Pentacoordinated Transition State [Nu···C···Br]‡', text: 'Central carbon adopts a planar sp²-like geometry with partial bonds to both entering nucleophile and leaving bromide group (highest free energy barrier Ea).' },
          { title: '3. Walden Umbrella Inversion', text: 'Bromide departs as Br⁻ with the electron pair; the three non-reacting substituents flip backwards like an umbrella in a gale, resulting in 100% inversion of absolute configuration.' },
        ];
      }
      return [
        { title: '1. Rate-Determining Heterolytic Cleavage', text: 'Slow, unimolecular ionization breaks the C-Br bond with assistance from polar protic solvent, forming a solvated bromide ion and a high-energy planar sp² carbocation.' },
        { title: '2. Planar Carbocation Intermediate', text: 'The sp² carbon has an empty 2p orbital extending symmetrically above and below the molecular plane. Hyperconjugation from adjacent alkyl groups stabilizes this carbocation.' },
        { title: '3. Non-stereospecific Front/Back Attack', text: 'Nucleophile attacks the vacant p-orbital with equal (50:50) probability from either face, yielding an equimolar racemic mixture of retention and inversion enantiomers.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'sn2';
      const sub = p.substrate || 'secondary';
      const nuc = p.nucleophile || 'oh';
      const solv = p.solvent || 'aprotic';
      const xi = clamp(Number(p.progress != null ? p.progress : 35), 0, 100) / 100;

      const subInfo = {
        methyl: { deg: 'Methyl (0°)', sn2Factor: 1200, sn1Factor: 0.001, eaSN2: 82, eaSN1: 175, stab: 'Extremely Unstable' },
        primary: { deg: 'Primary (1°)', sn2Factor: 100, sn1Factor: 0.01, eaSN2: 95, eaSN1: 145, stab: 'Very Low' },
        secondary: { deg: 'Secondary (2°)', sn2Factor: 5, sn1Factor: 1.0, eaSN2: 115, eaSN1: 105, stab: 'Moderate (6 α-H)' },
        tertiary: { deg: 'Tertiary (3°)', sn2Factor: 0.001, sn1Factor: 1200, eaSN2: 160, eaSN1: 78, stab: 'High (9 α-H)' },
      }[sub] || { deg: 'Secondary (2°)', sn2Factor: 5, sn1Factor: 1.0, eaSN2: 115, eaSN1: 105, stab: 'Moderate' };

      const nucInfo = {
        oh: { name: ':OH⁻ (Hydroxide)', sn2Mult: 1.5, sn1Mult: 1.0 },
        cn: { name: ':CN⁻ (Cyanide)', sn2Mult: 2.0, sn1Mult: 1.0 },
        acetate: { name: 'CH₃COO⁻ (Acetate)', sn2Mult: 0.5, sn1Mult: 1.0 },
        h2o: { name: 'H₂O (Water)', sn2Mult: 0.02, sn1Mult: 1.2 },
      }[nuc] || { name: 'Hydroxide', sn2Mult: 1.0, sn1Mult: 1.0 };

      const solvMult = solv === 'aprotic' ? { sn2: 2.5, sn1: 0.4 } : { sn2: 0.3, sn1: 2.2 };

      const baseEa = mode === 'sn2' ? subInfo.eaSN2 : subInfo.eaSN1;
      const eaEff = Math.max(50, Math.round(baseEa - (mode === 'sn2' ? (nucInfo.sn2Mult - 1) * 8 : (solvMult.sn1 - 1) * 12)));

      let currentG = 0;
      let stateLabel = '';
      if (mode === 'sn2') {
        const deltaG = -35;
        currentG = 4 * eaEff * xi * (1 - xi) + deltaG * xi;
        stateLabel = xi < 0.25 ? 'Reactants Approaching' : xi <= 0.75 ? 'Transition State [Nu···C···Br]‡' : 'Inverted Product + Br⁻';
      } else {
        const deltaG = -40;
        const eInt = eaEff * 0.42;
        if (xi <= 0.55) {
          const t = xi / 0.55;
          currentG = Math.sin(t * Math.PI * 0.5) * eaEff * (1 - 0.4 * t) + eInt * Math.pow(t, 2);
          stateLabel = xi < 0.2 ? 'Substrate Ground State' : xi <= 0.45 ? 'TS 1‡ (C-Br Cleavage)' : 'Planar Carbocation R⁺ Intermediate';
        } else {
          const t = (xi - 0.55) / 0.45;
          currentG = (1 - t) * eInt + Math.sin(t * Math.PI) * 25 + t * deltaG;
          stateLabel = xi < 0.8 ? 'TS 2‡ (Nucleophile Trapping)' : 'Racemic Products (R + S)';
        }
      }

      const sn2Score = subInfo.sn2Factor * nucInfo.sn2Mult * solvMult.sn2;
      const sn1Score = subInfo.sn1Factor * nucInfo.sn1Mult * solvMult.sn1;
      const dominant = sn2Score >= sn1Score ? 'SN2 Favored' : 'SN1 Favored';
      const rateLaw = mode === 'sn2' ? 'Rate = k [R-X] [Nu⁻]' : 'Rate = k [R-X]';
      const stereo = mode === 'sn2' ? 'Walden Inversion (100%)' : 'Racemization (~50% R + ~50% S)';

      return {
        formulas: [
          { name: 'Governing Rate Law', formula: rateLaw, given: `Substrate: ${subInfo.deg}, Nucleophile: ${nucInfo.name}`, calc: mode === 'sn2' ? 'Second order kinetics (bimolecular)' : 'First order kinetics (unimolecular, RDS is ionization)', result: dominant, unit: 'pathway' },
          { name: 'Effective Activation Barrier', formula: 'k = A · exp(−Ea / RT)', given: `Substrate Ea base = ${baseEa} kJ/mol`, calc: `Ea(eff) = ${eaEff} kJ/mol with solvent effect`, result: `${eaEff}`, unit: 'kJ/mol' },
          { name: 'Reaction Coordinate Energy', formula: 'ΔG(ξ) relative to reactants', given: `Progress ξ = ${(xi * 100).toFixed(0)}%`, calc: `Current coordinate free energy`, result: `${currentG.toFixed(1)}`, unit: 'kJ/mol' },
        ],
        readouts: [
          { label: 'Mechanism', value: mode.toUpperCase(), tone: 'hi' },
          { label: 'Substrate', value: subInfo.deg, tone: 'good' },
          { label: 'Carbocation Stability', value: subInfo.stab, tone: 'neutral' },
          { label: 'Stereochemistry', value: stereo.split(' ')[0], tone: 'good' },
          { label: 'Activation Energy', value: `${eaEff} kJ/mol`, tone: 'hi' },
          { label: 'Live ΔG', value: `${currentG.toFixed(1)} kJ/mol`, tone: 'neutral' },
        ],
        state: {
          mode,
          substrate: sub,
          subDeg: subInfo.deg,
          nucleophile: nuc,
          nucName: nucInfo.name,
          solvent: solv,
          dominant,
          rateLaw,
          stereo,
          eaEff,
          currentG: Math.round(currentG * 10) / 10,
          stateLabel,
          progress: Math.round(xi * 100),
        },
        explain: {
          what: `Nucleophilic substitution at saturated carbon can proceed via concerted bimolecular SN2 or stepwise unimolecular SN1 mechanisms.`,
          why: `Substrate substitution degree, nucleophile strength, leaving group ability, and solvent dielectric constant dictate whether the reaction passes through a single pentacoordinated transition state or an ionized carbocation intermediate.`,
          param: `Methyl and 1° substrates exhibit minimal steric crowding, favoring SN2; 3° substrates stabilize the carbocation intermediate via hyperconjugation and inductive dispersal of positive charge, favoring SN1.`,
          effect: `SN2 leads to complete inversion of configuration (Walden inversion) via backside attack. SN1 produces a planar sp² carbocation with an empty p orbital that is attacked with equal probability from either face, yielding a racemic mixture.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#090d16');

      const mode = p.mode || 'sn2';
      const st = c.state;

      // Video simulation continuous cyclic time (8s loop per reaction cycle)
      const cycleT = (t * 0.7) % 8; // 0 to 8s
      let xi = 0;
      if (S.playing || S.transient) {
        // Step-locked progress
        const stepTarget = step === 0 ? 0.15 : step === 1 ? 0.50 : 0.90;
        xi = clamp(stepTarget + 0.04 * Math.sin(t * 3), 0.02, 0.98);
      } else {
        // Continuous smooth video trajectory
        if (cycleT < 2.5) {
          xi = (cycleT / 2.5) * 0.35; // 0 to 0.35: approach
        } else if (cycleT < 5.0) {
          xi = 0.35 + ((cycleT - 2.5) / 2.5) * 0.35; // 0.35 to 0.70: transition state
        } else if (cycleT < 7.2) {
          xi = 0.70 + ((cycleT - 5.0) / 2.2) * 0.28; // 0.70 to 0.98: inversion & separation
        } else {
          xi = 0.98; // Brief hold at product
        }
      }

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Nucleophile approach along 180° trajectory' : step === 1 ? (mode === 'sn2' ? 'Trigonal bipyramidal transition state [Nu···C···X]‡' : 'Planar carbocation intermediate & leaving group departure') : (mode === 'sn2' ? 'Walden inversion: stereochemical configuration inverted' : 'Racemic nucleophile attack from both faces'));

      // Header Banner
      D.text(g, mode === 'sn2' ? 'SN2 BIMOLECULAR NUCLEOPHILIC SUBSTITUTION (WALDEN INVERSION)' : 'SN1 UNIMOLECULAR NUCLEOPHILIC SUBSTITUTION (RACEMIZATION)', 30, 36, { color: '#38bdf8', size: 19, weight: 800 });
      D.text(g, `Substrate: ${st.subDeg}  •  Nu: ${st.nucName}  •  Favored: ${st.dominant}  •  ${st.rateLaw}`, 30, 62, { color: '#94a3b8', size: 12.5, weight: 600 });

      // Left Panel: Molecular Geometry Animation (x: 24 to 515)
      D.rect(g, 24, 85, 490, 440, { fill: '#131b2e', stroke: '#1e293b', r: 12 });
      D.text(g, mode === 'sn2' ? 'Backside Attack & Walden Umbrella Inversion' : 'Carbocation Intermediate & Dual Face Attack', 40, 108, { color: '#f8fafc', size: 13.5, weight: 700 });

      const cx = 270;
      const cy = 295;

      if (mode === 'sn2') {
        // Umbrella inversion angle: swings from +0.42 rad (facing Nu) to -0.42 rad (inverted away)
        const umbrellaAngle = lerp(0.42, -0.42, xi);
        const nuDist = lerp(170, 52, clamp(xi * 1.6, 0, 1));
        const brDist = lerp(52, 175, clamp((xi - 0.35) * 1.55, 0, 1));

        const nuX = cx - nuDist;
        const brX = cx + brDist;

        // Visual trajectory guidelines
        D.line(g, cx - 180, cy, cx + 180, cy, { color: 'rgba(255, 255, 255, 0.08)', width: 1, dash: [4, 4] });

        // C-Nu bond and C-Br bond
        if (xi < 0.32) {
          // Reactant approach
          D.line(g, cx, cy, brX, cy, { color: '#fb7185', width: 4.5 });
          D.arrow(g, nuX + 22, cy, cx - 65, cy, { color: '#38bdf8', width: 2.5, head: 7 });
          D.text(g, 'Backside 180° Attack', cx - 110, cy - 25, { color: '#38bdf8', size: 10, weight: 700, align: 'center' });
        } else if (xi <= 0.72) {
          // Transition state: partial bonds
          const tsGlow = 0.5 + 0.5 * Math.sin(t * 8);
          D.line(g, nuX, cy, cx, cy, { color: '#38bdf8', width: 3, dash: [5, 4] });
          D.line(g, cx, cy, brX, cy, { color: '#fb7185', width: 3, dash: [5, 4] });

          // TS Brackets [ ... ]‡
          D.text(g, '[', cx - 105, cy - 5, { color: '#facc15', size: 40, weight: 300 });
          D.text(g, ']‡', cx + 105, cy - 5, { color: '#facc15', size: 36, weight: 800 });
          D.text(g, 'Trigonal Bipyramidal TS [Nu···C···Br]‡', cx, cy - 90, { color: '#facc15', size: 13, weight: 800, align: 'center' });
          D.text(g, 'δ−', nuX, cy - 26, { color: '#38bdf8', size: 13, weight: 800, align: 'center' });
          D.text(g, 'δ−', brX, cy - 26, { color: '#fb7185', size: 13, weight: 800, align: 'center' });
        } else {
          // Inverted product
          D.line(g, nuX, cy, cx, cy, { color: '#38bdf8', width: 4.5 });
          D.arrow(g, cx + 55, cy, brX - 22, cy, { color: '#fb7185', width: 2.5, head: 7 });
          D.text(g, 'Br⁻ Leaving Group Departs', brX, cy - 26, { color: '#fb7185', size: 11, weight: 700, align: 'center' });
          D.text(g, '100% Inverted Configuration', cx - 20, cy - 85, { color: '#22c55e', size: 12.5, weight: 800, align: 'center' });
        }

        // Substituents
        const subLabels = p.substrate === 'methyl' ? ['H', 'H', 'H'] : p.substrate === 'primary' ? ['CH₃', 'H', 'H'] : p.substrate === 'secondary' ? ['CH₃', 'CH₃', 'H'] : ['CH₃', 'CH₃', 'CH₃'];

        // Sub 1: Upward
        const s1x = cx + Math.sin(umbrellaAngle) * 58;
        const s1y = cy - Math.cos(umbrellaAngle) * 58;
        D.line(g, cx, cy, s1x, s1y, { color: '#94a3b8', width: 3.5 });
        D.atom(g, s1x, s1y, 14, '#334155', { label: subLabels[0] });

        // Sub 2: Down-Wedge (coming forward)
        const s2x = cx + Math.sin(umbrellaAngle + 1.8) * 52;
        const s2y = cy - Math.cos(umbrellaAngle + 1.8) * 48;
        D.line(g, cx, cy, s2x, s2y, { color: '#a855f7', width: 4.5 });
        D.atom(g, s2x, s2y, 14, '#334155', { label: subLabels[1] });

        // Sub 3: Down-Dash (going backward)
        const s3x = cx + Math.sin(umbrellaAngle - 1.8) * 52;
        const s3y = cy - Math.cos(umbrellaAngle - 1.8) * 48;
        D.line(g, cx, cy, s3x, s3y, { color: '#64748b', width: 3, dash: [4, 3] });
        D.atom(g, s3x, s3y, 14, '#334155', { label: subLabels[2] });

        // Nucleophile with lone pairs
        D.atom(g, nuX, cy, 18, '#0284c7', { label: 'Nu' });
        // Lone pairs on Nu
        D.circle(g, nuX + 2, cy - 14, 2, { fill: '#38bdf8' });
        D.circle(g, nuX + 8, cy - 14, 2, { fill: '#38bdf8' });

        // Central Carbon
        D.atom(g, cx, cy, 17, '#0f172a', { label: 'C' });

        // Bromide with halo
        D.circle(g, brX, cy, 22, { fill: 'rgba(190, 18, 60, 0.2)' });
        D.atom(g, brX, cy, 18, '#be123c', { label: 'Br' });

        // Bottom annotation
        const phaseLabel = xi < 0.32 ? 'Phase 1: Backside Nu Approach (180°)' : xi <= 0.72 ? 'Phase 2: Pentacoordinated [Nu···C···Br]‡ TS' : 'Phase 3: Walden Inversion & Br⁻ Departure';
        D.tag(g, phaseLabel, cx, 488, { bg: '#090d16', border: '#38bdf8', color: '#38bdf8', size: 12, align: 'center' });
      } else {
        // SN1 Animation (Stepwise Ionization + Planar Carbocation + Racemization)
        const brDist = lerp(52, 185, clamp(xi * 1.8, 0, 1));
        const brX = cx + brDist;

        const subLabels = p.substrate === 'methyl' ? ['H', 'H', 'H'] : p.substrate === 'primary' ? ['CH₃', 'H', 'H'] : p.substrate === 'secondary' ? ['CH₃', 'CH₃', 'H'] : ['CH₃', 'CH₃', 'CH₃'];

        // Planar sp2 transition
        const planarity = clamp(xi * 1.7, 0, 1);
        const a1 = -Math.PI * 0.5;
        const a2 = lerp(Math.PI * 0.65, Math.PI * 0.83, planarity);
        const a3 = lerp(Math.PI * 0.35, Math.PI * 0.17, planarity);

        // Carbocation empty p-orbital lobes (translucent cyan/violet dumbbell)
        if (xi > 0.35) {
          const pGlow = 0.5 + 0.5 * Math.sin(t * 5);
          g.save();
          // Top lobe
          g.fillStyle = 'rgba(56, 189, 248, ' + (0.25 + 0.15 * pGlow) + ')';
          g.beginPath();
          g.ellipse(cx, cy - 32, 16, 26, 0, 0, Math.PI * 2);
          g.fill();
          // Bottom lobe
          g.fillStyle = 'rgba(168, 85, 247, ' + (0.25 + 0.15 * pGlow) + ')';
          g.beginPath();
          g.ellipse(cx, cy + 32, 16, 26, 0, 0, Math.PI * 2);
          g.fill();
          g.restore();

          D.text(g, 'Empty 2pz Orbital', cx, cy - 65, { color: '#38bdf8', size: 10, weight: 700, align: 'center' });
          D.text(g, 'Planar sp² Carbocation (R₃C⁺)', cx, cy + 70, { color: '#facc15', size: 11, weight: 800, align: 'center' });
        }

        // Sub 1: Upward
        D.line(g, cx, cy, cx + Math.cos(a1) * 54, cy + Math.sin(a1) * 54, { color: '#94a3b8', width: 3.5 });
        D.atom(g, cx + Math.cos(a1) * 54, cy + Math.sin(a1) * 54, 14, '#334155', { label: subLabels[0] });

        // Sub 2: Bottom-Left
        D.line(g, cx, cy, cx + Math.cos(a2) * 54, cy + Math.sin(a2) * 54, { color: '#a855f7', width: 4 });
        D.atom(g, cx + Math.cos(a2) * 54, cy + Math.sin(a2) * 54, 14, '#334155', { label: subLabels[1] });

        // Sub 3: Bottom-Right
        D.line(g, cx, cy, cx + Math.cos(a3) * 54, cy + Math.sin(a3) * 54, { color: '#64748b', width: 3 });
        D.atom(g, cx + Math.cos(a3) * 54, cy + Math.sin(a3) * 54, 14, '#334155', { label: subLabels[2] });

        // Bromide bond / ionization
        if (xi < 0.45) {
          D.line(g, cx, cy, brX, cy, { color: '#fb7185', width: 3.5, dash: xi > 0.2 ? [4, 4] : undefined });
        }
        D.atom(g, brX, cy, 18, '#be123c', { label: 'Br⁻' });

        // Dual Face Attack in Step 2/3
        if (xi > 0.6) {
          // Top attack (Retention 50%)
          D.arrow(g, cx - 40, cy - 80, cx - 10, cy - 45, { color: '#22c55e', width: 2.5, head: 6 });
          D.atom(g, cx - 55, cy - 90, 14, '#0284c7', { label: 'Nu' });
          D.text(g, 'Top Face (50% Retention)', cx - 70, cy - 108, { color: '#22c55e', size: 9.5, weight: 700 });

          // Bottom attack (Inversion 50%)
          D.arrow(g, cx - 40, cy + 80, cx - 10, cy + 45, { color: '#38bdf8', width: 2.5, head: 6 });
          D.atom(g, cx - 55, cy + 90, 14, '#0284c7', { label: 'Nu' });
          D.text(g, 'Bottom Face (50% Inversion)', cx - 70, cy + 112, { color: '#38bdf8', size: 9.5, weight: 700 });
        }

        // Central Carbon
        D.atom(g, cx, cy, 17, '#0f172a', { label: 'C⁺' });

        const sn1Phase = xi < 0.4 ? 'Phase 1: Rate-Limiting C−Br Ionization (RDS)' : xi < 0.7 ? 'Phase 2: Planar sp² Carbocation Intermediate' : 'Phase 3: Equal Probability Attack (Racemic R+S)';
        D.tag(g, sn1Phase, cx, 488, { bg: '#090d16', border: '#facc15', color: '#facc15', size: 12, align: 'center' });
      }

      // Right Panel: Reaction Energy Coordinate Diagram
      D.rect(g, 525, 85, 450, 440, { fill: '#131b2e', stroke: '#1e293b', r: 12 });
      D.text(g, mode === 'sn2' ? 'Concerted Potential Energy Barrier (One TS)' : 'Stepwise Potential Energy Profile (Two TS + Interm.)', 545, 108, { color: '#f8fafc', size: 13.5, weight: 700 });

      const gx = 575;
      const gy = 440;
      const gw = 360;
      const gh = 230;

      D.line(g, gx, gy, gx + gw, gy, { color: '#475569', width: 1.5 });
      D.line(g, gx, gy, gx, gy - gh, { color: '#475569', width: 1.5 });
      D.text(g, 'Reaction Coordinate ξ →', gx + gw - 80, gy + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
      D.text(g, 'Free Energy ΔG (kJ/mol)', gx - 10, gy - gh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

      // Plot energy curve
      const pts = [];
      const numPts = 60;
      for (let i = 0; i <= numPts; i++) {
        const u = i / numPts;
        let gVal = 0;
        if (mode === 'sn2') {
          // Single bell shaped peak
          gVal = Math.sin(u * Math.PI) * st.eaEff - u * 35;
        } else {
          // Double peak with dip in middle
          if (u <= 0.55) {
            const v = u / 0.55;
            gVal = Math.sin(v * Math.PI * 0.5) * st.eaEff * (1 - 0.35 * v) + (st.eaEff * 0.42) * Math.pow(v, 2);
          } else {
            const v = (u - 0.55) / 0.45;
            gVal = (1 - v) * (st.eaEff * 0.42) + Math.sin(v * Math.PI) * 25 - v * 40;
          }
        }
        const px = gx + u * gw;
        const py = gy - ((gVal + 40) / (st.eaEff + 60)) * gh;
        pts.push([px, clamp(py, gy - gh + 10, gy)]);
      }
      D.poly(g, pts, { stroke: '#38bdf8', width: 3, fill: false });

      // Animated energy ball tracking live progress ξ
      const curIdx = Math.round(xi * numPts);
      const ballPos = pts[clamp(curIdx, 0, pts.length - 1)];
      // Pulsing halo around ball
      const bHalo = 7 + Math.sin(t * 6) * 2;
      D.circle(g, ballPos[0], ballPos[1], bHalo, { fill: 'rgba(250, 204, 21, 0.3)' });
      D.circle(g, ballPos[0], ballPos[1], 6.5, { fill: '#facc15', stroke: '#ffffff', width: 2 });
      D.text(g, `${st.currentG.toFixed(1)} kJ`, ballPos[0], ballPos[1] - 14, { color: '#facc15', size: 10.5, weight: 800, align: 'center' });

      // Peak label
      if (mode === 'sn2') {
        const peakPt = pts[Math.round(numPts * 0.5)];
        D.text(g, `Ea‡ = ${st.eaEff} kJ/mol`, peakPt[0], peakPt[1] - 22, { color: '#f87171', size: 11, weight: 800, align: 'center' });
      } else {
        const ts1 = pts[Math.round(numPts * 0.35)];
        D.text(g, 'TS 1‡ (RDS)', ts1[0], ts1[1] - 18, { color: '#f87171', size: 10, weight: 800, align: 'center' });
        const intPt = pts[Math.round(numPts * 0.55)];
        D.text(g, 'R⁺ Interm.', intPt[0], intPt[1] + 16, { color: '#38bdf8', size: 10, weight: 800, align: 'center' });
      }

      D.rect(g, 545, gy + 32, 410, 42, { fill: '#0a0f1d', stroke: '#334155', r: 8 });
      D.text(g, `Stereochemical Outcome: ${st.stereo}`, 560, gy + 53, { color: '#38bdf8', size: 11.5, weight: 700 });
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // 7. ELIMINATION & ELECTROPHILIC AROMATIC SUBSTITUTION (SEAr)
  // ═════════════════════════════════════════════════════════════════
  S['chem-elimination-substitution'] = {
    live: true,
    approx: 'Zaitsev vs Hofmann regioselectivity calculated via alkene thermodynamic stability and base cone angle. SEAr resonance energies based on Arenium σ-complex (Wheland intermediate).',
    modes: [
      { key: 'e2', label: 'E2 Elimination (Zaitsev vs Hofmann Alkene)' },
      { key: 'sear_nitration', label: 'SEAr: Benzene Nitration (NO₂⁺ via Arenium Ion)' },
      { key: 'sear_fc', label: 'SEAr: Friedel-Crafts Alkylation (CH₃⁺ Electrophile)' },
      { key: 'sear_bromination', label: 'SEAr: Benzene Bromination (Br⁺ with FeBr₃ catalyst)' },
    ],
    params: [
      {
        key: 'base',
        label: 'Base / Nucleophile Sterics',
        type: 'select',
        default: 'ethoxide',
        options: [
          { value: 'ethoxide', label: 'Ethoxide (EtO⁻) — Small Unhindered Strong Base' },
          { value: 'tert_butoxide', label: 'tert-Butoxide (t-BuO⁻) — Bulky Hindered Strong Base' },
          { value: 'water', label: 'Water / Ethanol — Weak Neutral Base (Promotes E1)' },
        ],
        showIf: (p) => p.mode === 'e2',
        help: 'Small base abstracts more substituted β-H (Zaitsev). Bulky base abstracts accessible terminal β-H (Hofmann).',
      },
      {
        key: 'temp',
        label: 'Reaction Temperature (°C)',
        type: 'range',
        default: 55,
        min: 20,
        max: 120,
        step: 5,
        unit: '°C',
        help: 'High temperatures favor elimination (E2/E1) over substitution due to positive entropy of reaction (ΔS > 0, producing 3 molecules from 2).',
      },
      {
        key: 'stepStage',
        label: 'Mechanism Step',
        type: 'select',
        default: 'intermediate',
        options: [
          { value: 'reactants', label: '1. Reactants: Ground State & Approach' },
          { value: 'intermediate', label: '2. Transition State / Wheland σ-Complex' },
          { value: 'products', label: '3. Products: Alkene / Substituted Arene' },
        ],
        help: 'Inspect initial reactants, energetic intermediate/TS, or final stabilized products.',
      },
    ],
    examples: [
      { label: 'Ethoxide E2 on 2-Bromobutane (81% Zaitsev)', values: { mode: 'e2', base: 'ethoxide', temp: 65, stepStage: 'products' } },
      { label: 'Bulky t-BuO⁻ on 2-Bromobutane (72% Hofmann)', values: { mode: 'e2', base: 'tert_butoxide', temp: 65, stepStage: 'products' } },
      { label: 'Benzene Nitration via Wheland Intermediate', values: { mode: 'sear_nitration', temp: 50, stepStage: 'intermediate' } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      if (p.mode === 'e2') {
        return [
          { title: '1. Anti-Periplanar Conformation', text: 'Substrate 2-bromobutane adopts a strict 180° anti-periplanar dihedral angle between the β-hydrogen and leaving bromide group for optimal orbital overlap.' },
          { title: '2. Concerted Proton Transfer & C=C Formation', text: 'Strong base abstracts β-H while electron density cascades into developing π-bond and C-Br bond undergoes heterolytic cleavage simultaneously.' },
          { title: '3. Zaitsev vs Hofmann Regiochemical Ratio', text: 'Unhindered ethoxide yields thermodynamic Zaitsev 2-butene (81%); bulky tert-butoxide encounters steric hindrance, yielding kinetic Hofmann 1-butene (72%).' },
        ];
      }
      return [
        { title: '1. Generation of Strong Electrophile E⁺', text: 'Acid-catalysis activates reagent (HNO₃ + H₂SO₄ → NO₂⁺; CH₃Cl + AlCl₃ → CH₃⁺···AlCl₄⁻), generating a reactive electrophile.' },
        { title: '2. Arenium Ion (Wheland σ-Complex)', text: 'Benzene π-electrons attack E⁺, temporarily disrupting aromaticity. The resulting cyclohexadienyl cation is resonance-stabilized over ortho/para carbons.' },
        { title: '3. Proton Loss & Aromatic Restoration', text: 'A weak base abstracts the geminal proton from the sp³ carbon, rapidly restoring the 6π aromatic octet and regaining 152 kJ/mol of resonance energy.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'e2';
      const base = p.base || 'ethoxide';
      const tempC = Number(p.temp != null ? p.temp : 55);
      const stage = p.stepStage || 'intermediate';

      if (mode === 'e2') {
        let zaitsevPct = 81;
        let hofmannPct = 19;
        if (base === 'tert_butoxide') {
          zaitsevPct = 28;
          hofmannPct = 72;
        } else if (base === 'water') {
          zaitsevPct = 65;
          hofmannPct = 35;
        }

        const elimRatio = clamp(Math.round(45 + (tempC - 20) * 0.45), 25, 95);
        const subRatio = 100 - elimRatio;
        const majorProduct = zaitsevPct > hofmannPct ? '2-Butene (Zaitsev Major)' : '1-Butene (Hofmann Major)';

        return {
          formulas: [
            { name: 'Alkene Regioselectivity', formula: 'Zaitsev % vs Hofmann %', given: `Base: ${base}`, calc: `Steric hindrance dictates terminal vs internal β-H abstraction`, result: `${zaitsevPct}% Zaitsev / ${hofmannPct}% Hofmann`, unit: 'selectivity' },
            { name: 'Elimination vs Substitution Ratio', formula: 'E / (E + SN) ∝ exp(−ΔG / RT)', given: `T = ${tempC}°C (328 K)`, calc: `Δn = +1 (Alkene + BH + X⁻ yields ΔS > 0)`, result: `${elimRatio}% Elimination`, unit: '%' },
          ],
          readouts: [
            { label: 'Reaction Mode', value: 'E2 Elimination', tone: 'hi' },
            { label: 'Major Product', value: majorProduct.split(' ')[0], tone: 'good' },
            { label: 'Zaitsev Yield', value: `${zaitsevPct} %`, tone: 'good' },
            { label: 'Hofmann Yield', value: `${hofmannPct} %`, tone: 'neutral' },
            { label: 'Elimination Ratio', value: `${elimRatio} %`, tone: 'hi' },
          ],
          state: {
            mode: 'e2',
            base,
            tempC,
            stage,
            zaitsevPct,
            hofmannPct,
            elimRatio,
            subRatio,
            majorProduct,
          },
          explain: {
            what: `E2 is a concerted bimolecular elimination requiring anti-periplanar alignment of the β-hydrogen and the leaving halide.`,
            why: `Small bases preferentially abstract the more acidic, more substituted proton to yield the more stable internal alkene (Zaitsev rule), whereas bulky bases abstract the sterically accessible terminal proton (Hofmann rule).`,
            param: `Higher temperatures enhance elimination over substitution because producing three fragments from two increases system entropy (ΔS > 0, making −TΔS increasingly negative).`,
            effect: `The strict 180° dihedral angle aligns the breaking C-H and C-Br σ-bonding orbitals directly parallel with the developing C=C π-orbital.`,
          },
        };
      }

      const searData = {
        sear_nitration: { title: 'Benzene Nitration', electrophile: 'NO₂⁺ (Nitronium)', catalyst: 'Conc. H₂SO₄', product: 'Nitrobenzene (C₆H₅NO₂)', lossE: '152 kJ/mol' },
        sear_fc: { title: 'Friedel-Crafts Alkylation', electrophile: 'CH₃⁺ (Methyl Cation)', catalyst: 'Anhydrous AlCl₃', product: 'Toluene (C₆H₅CH₃)', lossE: '152 kJ/mol' },
        sear_bromination: { title: 'Benzene Bromination', electrophile: 'Br⁺ (Bromonium)', catalyst: 'FeBr₃ Lewis Acid', product: 'Bromobenzene (C₆H₅Br)', lossE: '152 kJ/mol' },
      }[mode] || { title: 'SEAr Substitution', electrophile: 'E⁺', catalyst: 'Acid', product: 'Substituted Benzene', lossE: '152 kJ/mol' };

      return {
        formulas: [
          { name: 'Arenium Resonance Stabilization', formula: 'Ar-H + E⁺ ⇌ [Ar-HE]⁺ (Wheland)', given: `Electrophile: ${searData.electrophile}`, calc: 'Positive charge delocalized over C2, C4, C6 ortho/para positions', result: '3 Resonance Forms', unit: 'structures' },
          { name: 'Aromatic Resonance Energy', formula: 'ΔH_resonance = 152 kJ/mol', given: 'Benzene 6π aromatic octet', calc: 'Loss during σ-complex formation; 100% regained upon deprotonation', result: '152', unit: 'kJ/mol' },
        ],
        readouts: [
          { label: 'Reaction', value: searData.title.split(' ')[0], tone: 'hi' },
          { label: 'Electrophile', value: searData.electrophile.split(' ')[0], tone: 'good' },
          { label: 'Catalyst', value: searData.catalyst, tone: 'neutral' },
          { label: 'Intermediate', value: 'Wheland σ-Complex', tone: 'neutral' },
          { label: 'Resonance Regained', value: searData.lossE, tone: 'hi' },
        ],
        state: {
          mode,
          stage,
          tempC,
          ...searData,
        },
        explain: {
          what: `Electrophilic Aromatic Substitution (SEAr) replaces a ring hydrogen with an electrophile while preserving the stable aromatic 6π octet.`,
          why: `Addition across a benzene double bond would permanently destroy 152 kJ/mol of aromatic resonance energy, so deprotonation is strongly favored over nucleophilic capture.`,
          param: `Lewis acid catalysts polarize the halogen or alkyl bond, generating highly reactive cationic electrophiles (e.g. NO₂⁺, Br⁺, R⁺).`,
          effect: `The high energy of the Wheland intermediate governs the reaction rate (RDS); substituents on the ring accelerate or retard the reaction via inductive and resonance electron donation.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Reactant substrate & electrophile/base setup' : step === 1 ? (st.mode === 'e2' ? 'Anti-periplanar proton abstraction & C=C formation' : 'Electrophilic attack forming arenium/carbocation intermediate') : (st.mode === 'e2' ? 'Zaitsev alkene major product separation' : 'Proton elimination restoring aromatic 6π sextet'));

      if (st.mode === 'e2') {
        // E2 Canvas Layout
        D.text(g, 'E2 BIMOLECULAR ELIMINATION: REGIOCHEMISTRY & STEREOELECTRONICS', 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
        D.text(g, `Substrate: 2-Bromobutane · Base: ${st.base} · Major: ${st.majorProduct} · T = ${st.tempC}°C`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

        // Left Panel: 3D Anti-periplanar alignment (x: 24 to 530)
        D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
        D.text(g, 'Anti-Periplanar 180° Conformation', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

        const cx = 270;
        const cy = 280;
        const c1x = cx - 70;
        const c2x = cx + 70;

        // Central C-C bond
        D.line(g, c1x, cy, c2x, cy, { color: st.stage === 'products' ? '#38bdf8' : '#cbd5e1', width: st.stage === 'products' ? 6 : 4 });
        if (st.stage === 'intermediate') {
          D.line(g, c1x, cy - 8, c2x, cy - 8, { color: '#38bdf8', width: 2.5, dash: [4, 4] });
        } else if (st.stage === 'products') {
          D.line(g, c1x, cy - 8, c2x, cy - 8, { color: '#38bdf8', width: 4 });
        }

        // β-H on C1 (pointing up)
        const hx = c1x - 35;
        const hy = cy - 70;
        if (st.stage !== 'products') {
          D.line(g, c1x, cy, hx, hy, { color: st.stage === 'intermediate' ? '#f59e0b' : '#38bdf8', width: 2.5, dash: st.stage === 'intermediate' ? [3, 3] : undefined });
          D.atom(g, hx, hy, 14, '#0f172a', { label: 'H' });
        }

        // Base attacking
        if (st.stage === 'intermediate') {
          D.atom(g, hx - 45, hy - 30, 18, '#7c3aed', { label: 'B⁻' });
          D.arrow(g, hx - 28, hy - 20, hx - 12, hy - 8, { color: '#c084fc', width: 2, head: 6 });
          D.text(g, 'Base abstracts β-H', hx - 55, hy - 52, { color: '#c084fc', size: 10, weight: 700 });
        }

        // Leaving group Br on C2 (pointing down 180° anti)
        const brX = c2x + 40;
        const brY = cy + 70;
        if (st.stage !== 'products') {
          D.line(g, c2x, cy, brX, brY, { color: st.stage === 'intermediate' ? '#ef4444' : '#fb7185', width: 3, dash: st.stage === 'intermediate' ? [3, 3] : undefined });
          D.atom(g, brX, brY, 18, '#be123c', { label: 'Br' });
        } else {
          D.atom(g, brX + 25, brY + 10, 16, '#be123c', { label: 'Br⁻' });
        }

        // Methyl substituents
        D.line(g, c1x, cy, c1x - 50, cy + 45, { color: '#94a3b8', width: 3 });
        D.atom(g, c1x - 50, cy + 45, 14, '#334155', { label: 'CH₃' });

        D.line(g, c2x, cy, c2x + 50, cy - 45, { color: '#94a3b8', width: 3 });
        D.atom(g, c2x + 50, cy - 45, 14, '#334155', { label: 'CH₃' });

        D.atom(g, c1x, cy, 16, '#1e293b', { label: 'C1' });
        D.atom(g, c2x, cy, 16, '#1e293b', { label: 'C2' });

        D.text(g, st.stage !== 'products' ? '180° Anti-Periplanar Dihedral Angle' : 'Planar Alkene Double Bond Formed', cx, cy - 25, { color: '#facc15', size: 12, weight: 700, align: 'center' });

        D.tag(g, `Thermal: Elimination = ${st.elimRatio}%, Substitution = ${st.subRatio}%`, cx, 490, { bg: '#0f172a', border: '#38bdf8', color: '#38bdf8', size: 12, align: 'center' });

        // Right Panel: Regiochemical Distribution Bars (x: 540 to 975)
        D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
        D.text(g, 'Zaitsev vs Hofmann Product Distribution', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

        const barX = 560;
        const barW = 390;

        // Zaitsev Bar
        D.text(g, 'Zaitsev: 2-Butene (Internal Disubstituted, Thermodynamic):', barX, 155, { color: '#38bdf8', size: 11, weight: 700 });
        D.rect(g, barX, 170, barW, 26, { fill: '#0f172a', stroke: '#334155', r: 6 });
        D.rect(g, barX, 170, (barW * st.zaitsevPct) / 100, 26, { fill: '#0284c7', r: 6 });
        D.text(g, `${st.zaitsevPct}%`, barX + (barW * st.zaitsevPct) / 100 + 10, 184, { color: '#38bdf8', size: 13, weight: 800 });

        // Hofmann Bar
        D.text(g, 'Hofmann: 1-Butene (Terminal Monosubstituted, Kinetic):', barX, 230, { color: '#f59e0b', size: 11, weight: 700 });
        D.rect(g, barX, 245, barW, 26, { fill: '#0f172a', stroke: '#334155', r: 6 });
        D.rect(g, barX, 245, (barW * st.hofmannPct) / 100, 26, { fill: '#d97706', r: 6 });
        D.text(g, `${st.hofmannPct}%`, barX + (barW * st.hofmannPct) / 100 + 10, 259, { color: '#f59e0b', size: 13, weight: 800 });

        // Theory card
        D.rect(g, 560, 310, barW, 190, { fill: '#0f172a', stroke: '#334155', r: 8 });
        D.text(g, 'Regiochemical Principles:', barX + 15, 335, { color: '#f8fafc', size: 12, weight: 700 });
        D.text(g, '• Zaitsev Rule: Small bases (EtO⁻) abstract more substituted β-H,', barX + 15, 362, { color: '#cbd5e1', size: 11 });
        D.text(g, '  yielding the more stable alkene stabilized by hyperconjugation.', barX + 15, 380, { color: '#cbd5e1', size: 11 });
        D.text(g, '• Hofmann Rule: Bulky bases (t-BuO⁻) suffer severe steric hindrance,', barX + 15, 410, { color: '#cbd5e1', size: 11 });
        D.text(g, '  forcing abstraction of accessible, less-substituted terminal β-H.', barX + 15, 428, { color: '#cbd5e1', size: 11 });
        D.text(g, '• Anti-periplanar geometry allows parallel σ-to-π orbital mixing.', barX + 15, 458, { color: '#facc15', size: 11, weight: 600 });
      } else {
        // SEAr View
        D.text(g, `ELECTROPHILIC AROMATIC SUBSTITUTION: ${st.title.toUpperCase()}`, 30, 36, { color: '#38bdf8', size: 20, weight: 800 });
        D.text(g, `Electrophile: ${st.electrophile} · Catalyst: ${st.catalyst} · Wheland σ-Complex Intermediate`, 30, 62, { color: '#94a3b8', size: 13, weight: 600 });

        // Left Panel: Benzene ring / Wheland intermediate (x: 24 to 530)
        D.rect(g, 24, 85, 500, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
        D.text(g, st.stage === 'reactants' ? '1. Intact Benzene Ring (6π Aromatic Octet)' : st.stage === 'intermediate' ? '2. Arenium Ion (Wheland σ-Complex)' : '3. Restored Aromatic Ring with Substituent', 40, 110, { color: '#f8fafc', size: 14, weight: 700 });

        const cx = 270;
        const cy = 290;
        const R = 75;

        const verts = [];
        for (let i = 0; i < 6; i++) {
          const a = rad(i * 60 - 30);
          verts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
        }

        if (st.stage === 'reactants') {
          D.poly(g, verts.concat([verts[0]]), { stroke: '#38bdf8', width: 3, fill: 'rgba(56,189,248,0.08)' });
          D.circle(g, cx, cy, R * 0.55, { stroke: '#38bdf8', width: 2, dash: [4, 4] });
          D.text(g, 'Aromatic (6π)', cx, cy, { color: '#38bdf8', size: 13, weight: 700, align: 'center' });

          // Approaching Electrophile
          D.atom(g, cx + 115, cy - 90, 22, '#ea580c', { label: st.electrophile.split(' ')[0] });
          D.arrow(g, cx + 90, cy - 70, verts[0][0] + 15, verts[0][1] - 15, { color: '#f97316', width: 2.5, head: 7 });
          D.text(g, 'Electrophile Attack', cx + 115, cy - 120, { color: '#f97316', size: 11, weight: 700, align: 'center' });
        } else if (st.stage === 'intermediate') {
          D.poly(g, verts.slice(0, 6), { stroke: '#fbbf24', width: 3, fill: false });
          D.poly(g, [verts[1], verts[2], verts[3], verts[4], verts[5]], { stroke: '#f59e0b', width: 2, dash: [4, 3] });
          D.circle(g, cx, cy + 10, 20, { fill: 'rgba(245,158,11,0.2)', stroke: '#f59e0b', width: 1.5 });
          D.text(g, '+', cx, cy + 12, { color: '#fde047', size: 22, weight: 800, align: 'center' });

          const topX = verts[0][0];
          const topY = verts[0][1];
          D.line(g, topX, topY, topX + 32, topY - 32, { color: '#cbd5e1', width: 2.5 });
          D.atom(g, topX + 32, topY - 32, 13, '#0f172a', { label: 'H' });

          D.line(g, topX, topY, topX - 32, topY - 32, { color: '#f97316', width: 2.5 });
          D.atom(g, topX - 32, topY - 32, 16, '#c2410c', { label: st.electrophile.split(' ')[0] });

          D.text(g, 'Wheland Intermediate (Non-Aromatic, 4π)', cx, cy - 80, { color: '#fbbf24', size: 12, weight: 700, align: 'center' });
        } else {
          D.poly(g, verts.concat([verts[0]]), { stroke: '#22c55e', width: 3, fill: 'rgba(34,197,94,0.08)' });
          D.circle(g, cx, cy, R * 0.55, { stroke: '#22c55e', width: 2 });
          D.text(g, 'Aromaticity Regained', cx, cy, { color: '#22c55e', size: 12, weight: 700, align: 'center' });

          const topX = verts[0][0];
          const topY = verts[0][1];
          D.line(g, topX, topY, topX, topY - 45, { color: '#22c55e', width: 3 });
          D.atom(g, topX, topY - 45, 18, '#15803d', { label: st.electrophile.split(' ')[0] });

          D.atom(g, cx + 115, cy + 55, 14, '#1e293b', { label: 'H⁺' });
          D.text(g, '+ Catalyst Regained', cx + 115, cy + 82, { color: '#94a3b8', size: 10, align: 'center' });
        }

        // Carbon atom dots
        for (let i = 0; i < 6; i++) {
          D.circle(g, verts[i][0], verts[i][1], 4, { fill: '#ffffff' });
        }

        D.tag(g, `Product: ${st.product}`, cx, 490, { bg: '#0f172a', border: '#22c55e', color: '#22c55e', size: 12, align: 'center' });

        // Right Panel: 3 Resonance Forms (x: 540 to 975)
        D.rect(g, 540, 85, 435, 440, { fill: '#1e293b', stroke: '#334155', r: 12 });
        D.text(g, 'Arenium Ion Resonance Contributors', 560, 110, { color: '#f8fafc', size: 14, weight: 700 });

        const rfData = [
          { title: 'Resonance Contributor I', sub: 'Positive charge localized at C2 (Ortho position)' },
          { title: 'Resonance Contributor II', sub: 'Positive charge localized at C4 (Para position)' },
          { title: 'Resonance Contributor III', sub: 'Positive charge localized at C6 (Ortho position)' },
        ];

        rfData.forEach((rf, i) => {
          const ry = 145 + i * 85;
          D.rect(g, 560, ry, 395, 72, { fill: '#0f172a', stroke: '#334155', r: 8 });
          D.text(g, rf.title, 575, ry + 24, { color: '#fbbf24', size: 12, weight: 700 });
          D.text(g, rf.sub, 575, ry + 46, { color: '#cbd5e1', size: 11 });
        });

        // Energetics note
        D.rect(g, 560, 415, 395, 85, { fill: '#0f172a', stroke: '#22c55e', r: 8 });
        D.text(g, 'Aromatic Driving Force: 152 kJ/mol Regained', 575, 440, { color: '#22c55e', size: 12, weight: 700 });
        D.text(g, 'The immense thermodynamic stability of the 6π aromatic ring', 575, 462, { color: '#cbd5e1', size: 10.5 });
        D.text(g, 'drives rapid proton elimination rather than nucleophilic addition.', 575, 480, { color: '#cbd5e1', size: 10.5 });
      }
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 8. AZO DYE SYNTHESIS FLOW (DIAZOTIZATION TO COUPLING)
  // ═════════════════════════════════════════════════════════════════
  S['chem-azo-dye-synthesis'] = {
    live: true,
    approx: 'Diazonium stability modeled via thermal decomposition: k_decomp = 1.2e-4 * exp(0.12 * (T - 5)). Coupling kinetics follow electrophilic aromatic substitution rate r = k [ArN₂⁺] [ArO⁻].',
    modes: [
      { key: 'beta_naphthol', label: 'Sudan I / 1-(Phenyldiazenyl)naphthalen-2-ol (β-Naphthol Coupler)' },
      { key: 'phenol', label: 'p-Hydroxyazobenzene (Phenol Coupler)' },
      { key: 'dimethylaniline', label: 'Butter Yellow / Methyl Orange (N,N-Dimethylaniline Coupler)' },
    ],
    params: [
      {
        key: 'temp',
        label: 'Reaction Temperature (°C)',
        type: 'range',
        default: 3,
        min: 0,
        max: 30,
        step: 1,
        unit: '°C',
        help: 'Optimal diazotization requires 0–5°C in an ice bath. Above 10°C, benzenediazonium chloride decomposes into phenol and N₂ gas.',
      },
      {
        key: 'ph',
        label: 'Medium pH',
        type: 'range',
        default: 9.5,
        min: 1,
        max: 14,
        step: 0.5,
        unit: 'pH',
        help: 'Phenols and β-naphthol require alkaline medium (pH 9–10) to generate the reactive nucleophilic phenoxide/naphtholate ion.',
      },
      {
        key: 'stage',
        label: 'Synthetic Stage',
        type: 'select',
        default: 'step2_coupling',
        options: [
          { value: 'step1_diazotization', label: 'Stage 1: Diazotization of Aniline (0–5°C)' },
          { value: 'step2_coupling', label: 'Stage 2: Electrophilic Diazonium Coupling' },
          { value: 'step3_dye', label: 'Stage 3: Azo Dye Product, Chromophore & Spectra' },
        ],
        help: 'Follow the two-step synthesis from ice-cold diazotization to coupling and optical characterization.',
      },
    ],
    examples: [
      { label: 'Sudan I Orange Dye in Ice Bath (T=3°C, pH=9.5)', values: { mode: 'beta_naphthol', temp: 3, ph: 9.5, stage: 'step2_coupling' } },
      { label: 'Thermal Decomposition Warning (T=22°C Room Temp)', values: { mode: 'beta_naphthol', temp: 22, ph: 9.5, stage: 'step1_diazotization' } },
      { label: 'Methyl Orange Intermediate (pH=4.5)', values: { mode: 'dimethylaniline', temp: 2, ph: 4.5, stage: 'step3_dye' } },
    ],
    validate() {
      return [];
    },
    steps(p, c) {
      return [
        { title: '1. Ice-Cold Diazotization (0–5°C)', text: 'Primary aromatic amine (aniline) reacts with nitrous acid (NaNO₂ + HCl) at 0–5°C to form stable Benzenediazonium Chloride [C₆H₅-N⁺≡N] Cl⁻. Temperatures above 5°C trigger thermal hydrolysis into phenol and N₂ gas.' },
        { title: '2. Electrophilic Azo Coupling', text: 'Benzenediazonium cation acts as a weak electrophile, attacking the electron-rich β-naphtholate or phenoxide ion at the position of highest electron density in alkaline medium (pH 9–10).' },
        { title: '3. Chromophore Conjugation & Color Swatch', text: 'The −N=N− azo chromophore forms an extended conjugated π-system between the aromatic rings, shifting absorption into the visible region (bathochromic shift) to produce an intense orange/red dye.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'beta_naphthol';
      const tempC = Number(p.temp != null ? p.temp : 3);
      const ph = Number(p.ph != null ? p.ph : 9.5);
      const stage = p.stage || 'step2_coupling';

      let diazoStability = 98;
      if (tempC > 5) {
        diazoStability = Math.max(2, Math.round(98 * Math.exp(-0.16 * (tempC - 5))));
      }

      let phEfficiency = 0;
      if (mode === 'dimethylaniline') {
        phEfficiency = Math.max(5, Math.round(100 - Math.abs(ph - 5.0) * 18));
      } else {
        phEfficiency = Math.max(5, Math.round(100 - Math.abs(ph - 9.5) * 16));
      }
      phEfficiency = clamp(phEfficiency, 5, 100);

      const yieldPct = Math.round((diazoStability * phEfficiency) / 100);

      const dyeInfo = {
        beta_naphthol: {
          name: 'Sudan I (Orange II analog)',
          lambdaMax: 485,
          colorName: 'Bright Scarlet Orange',
          hex: '#ea580c',
          couplerName: 'β-Naphthol',
          optimalPH: '9.0 – 10.0 (Alkaline)',
        },
        phenol: {
          name: 'p-Hydroxyazobenzene',
          lambdaMax: 440,
          colorName: 'Yellow-Orange',
          hex: '#eab308',
          couplerName: 'Phenol',
          optimalPH: '9.0 – 10.0 (Alkaline)',
        },
        dimethylaniline: {
          name: 'Butter Yellow',
          lambdaMax: 505,
          colorName: 'Deep Golden Red',
          hex: '#dc2626',
          couplerName: 'N,N-Dimethylaniline',
          optimalPH: '4.0 – 5.5 (Mildly Acidic)',
        },
      }[mode] || {
        name: 'Azo Dye',
        lambdaMax: 480,
        colorName: 'Orange',
        hex: '#ea580c',
        couplerName: 'Coupler',
        optimalPH: '9.5',
      };

      const isDecomposing = tempC > 5;
      const decompositionProduct = isDecomposing ? 'Phenol + N₂↑ gas' : 'Stable [Ar-N₂⁺] Cl⁻';

      return {
        formulas: [
          { name: 'Diazotization Synthesis', formula: 'Ar-NH₂ + NaNO₂ + 2 HCl (0–5°C) → [Ar-N₂⁺] Cl⁻ + NaCl + 2 H₂O', given: `T = ${tempC}°C in Ice Bath`, calc: `Thermal Stability = ${diazoStability}%`, result: `${diazoStability}% Intact`, unit: 'stability' },
          { name: 'Electrophilic Azo Coupling', formula: 'Ar-N₂⁺ + Ar\'-O⁻ → Ar-N=N-Ar\'-OH', given: `Medium pH = ${ph}`, calc: `pH coupling efficiency`, result: `${phEfficiency}%`, unit: 'efficiency' },
          { name: 'Overall Synthetic Yield', formula: 'Yield = Stability × Efficiency', given: `${diazoStability}% × ${phEfficiency}%`, calc: 'Calculated yield of pure azo dye precipitate', result: `${yieldPct}`, unit: '%' },
        ],
        readouts: [
          { label: 'Azo Dye Product', value: dyeInfo.name.split(' ')[0], tone: 'hi' },
          { label: 'Perceived Color', value: dyeInfo.colorName, tone: 'good' },
          { label: 'λ_max', value: `${dyeInfo.lambdaMax} nm`, tone: 'hi' },
          { label: 'Diazonium Stability', value: `${diazoStability} %`, tone: isDecomposing ? 'warn' : 'good' },
          { label: 'Synthetic Yield', value: `${yieldPct} %`, tone: 'good' },
        ],
        state: {
          mode,
          tempC,
          ph,
          stage,
          diazoStability,
          phEfficiency,
          yieldPct,
          isDecomposing,
          decompositionProduct,
          ...dyeInfo,
        },
        explain: {
          what: `Azo dyes are brightly colored synthetic organic colorants containing one or more azo (−N=N−) functional groups linking two aromatic rings.`,
          why: `Primary aromatic amines undergo diazotization at 0–5°C to form diazonium cations, which act as weak electrophiles in coupling with activated aromatic rings like β-naphthol.`,
          param: `Cold ice bath (0–5°C) is essential because diazonium salts have high positive free energy and decompose spontaneously into phenol and nitrogen gas (N₂↑) at room temperature.`,
          effect: `Coupling creates an extended conjugated π-electron system across both rings, lowering the HOMO-LUMO gap and causing strong absorption of blue light (λ_max = ${dyeInfo.lambdaMax} nm) so that complementary orange-red light is perceived.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#090d16');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Primary aromatic amine in ice bath (0−5 °C) with NaNO₂/HCl' : step === 1 ? 'Diazonium salt formation (Ar-N₂⁺ Cl⁻) with low-T stability' : 'Electrophilic azo coupling with β-naphthol forming bright dye');

      // Header Banner
      D.text(g, 'AZO DYE SYNTHESIS: DIAZOTIZATION & COUPLING FLOW', 30, 36, { color: '#38bdf8', size: 19, weight: 800 });
      D.text(g, `Target Dye: ${st.name}  •  Perceived: ${st.colorName}  •  λ_max: ${st.lambdaMax} nm  •  Yield: ${st.yieldPct}%`, 30, 62, { color: '#94a3b8', size: 12.5, weight: 600 });

      // Left Panel: Reaction Apparatus & Mechanism (x: 24 to 510)
      D.rect(g, 24, 85, 486, 440, { fill: '#131b2e', stroke: '#1e293b', r: 12 });

      const cx = 267;
      const cy = 295;

      if (st.stage === 'step1_diazotization') {
        D.text(g, 'Stage 1: Diazotization in Ice Bath (0−5°C)', 40, 108, { color: '#f8fafc', size: 13.5, weight: 700 });

        // Ice Bath Tub
        D.rect(g, cx - 115, cy - 20, 230, 155, { fill: 'rgba(56, 189, 248, 0.1)', stroke: '#38bdf8', width: 2, r: 12 });

        // 8 Animated Floating Ice Cubes bobbing gently
        for (let i = 0; i < 8; i++) {
          const bob = Math.sin(t * 2.5 + i * 0.9) * 3;
          const ix = cx - 100 + (i % 4) * 52;
          const iy = cy + 70 + Math.floor(i / 4) * 32 + bob;
          D.rect(g, ix, iy, 24, 22, { fill: '#ffffff', stroke: '#93c5fd', width: 1.2, r: 4 });
          // Ice glint highlight
          D.line(g, ix + 3, iy + 4, ix + 12, iy + 4, { color: '#bae6fd', width: 1.5 });
          D.text(g, 'ICE', ix + 12, iy + 14, { color: '#1e3a8a', size: 8.5, weight: 800, align: 'center' });
        }

        // Conical Flask
        D.poly(g, [
          [cx - 16, cy - 50],
          [cx - 16, cy],
          [cx - 50, cy + 105],
          [cx + 50, cy + 105],
          [cx + 16, cy],
          [cx + 16, cy - 50],
        ], { fill: st.isDecomposing ? 'rgba(239, 68, 68, 0.22)' : 'rgba(56, 189, 248, 0.22)', stroke: '#e2e8f0', width: 2.5, close: true });

        // Liquid inside flask with vortex wave
        const flWave = Math.sin(t * 3.5) * 2;
        D.poly(g, [
          [cx - 42, cy + 45 + flWave],
          [cx - 48, cy + 102],
          [cx + 48, cy + 102],
          [cx + 42, cy + 45 - flWave],
        ], { fill: st.isDecomposing ? 'rgba(239, 68, 68, 0.55)' : 'rgba(56, 189, 248, 0.5)', stroke: false, close: true });

        // Submerged Precision Thermometer
        const thX = cx + 10;
        const thY = cy - 42;
        D.rect(g, thX, thY, 8, 115, { fill: '#ffffff', stroke: '#94a3b8', width: 1.5, r: 4 });
        const mercH = clamp((st.tempC / 30) * 85, 8, 95);
        D.rect(g, thX + 1, thY + 115 - mercH, 6, mercH, { fill: st.tempC > 5 ? '#ef4444' : '#0284c7', r: 3 });
        D.circle(g, thX + 4, thY + 118, 6, { fill: st.tempC > 5 ? '#ef4444' : '#0284c7' });
        D.text(g, `${st.tempC}°C`, thX + 16, thY + 10, { color: st.tempC > 5 ? '#ef4444' : '#38bdf8', size: 12, weight: 800 });

        if (st.isDecomposing) {
          // Animated fizzy N2 bubbles rising and popping
          for (let b = 0; b < 9; b++) {
            const bPhase = (t * 2 + b * 0.3) % 1;
            const bx = cx - 30 + b * 7 + Math.sin(t * 5 + b) * 3;
            const by = (cy + 100) - bPhase * 60;
            D.circle(g, bx, by, 3 + bPhase * 2, { fill: 'rgba(255, 255, 255, ' + (1 - bPhase) + ')', stroke: '#ef4444', width: 1 });
          }
          // Flash warning banner
          const warnGlow = 0.6 + 0.4 * Math.sin(t * 6);
          D.rect(g, cx - 180, cy - 85, 360, 36, { fill: 'rgba(239, 68, 68, ' + (0.25 * warnGlow) + ')', stroke: '#ef4444', r: 8 });
          D.text(g, '⚠️ THERMAL DECOMPOSITION! (T > 5°C)', cx, cy - 78, { color: '#ef4444', size: 12, weight: 800, align: 'center' });
          D.text(g, 'Ar-N₂⁺ + H₂O → Ar-OH + N₂↑ (Decomposing into Phenol & Gas)', cx, cy - 64, { color: '#fca5a5', size: 10, align: 'center' });
        } else {
          D.rect(g, cx - 180, cy - 85, 360, 34, { fill: 'rgba(16, 185, 129, 0.15)', stroke: '#10b981', r: 8 });
          D.text(g, '✓ Stable Benzenediazonium Chloride [Ar-N₂⁺] Cl⁻', cx, cy - 78, { color: '#22c55e', size: 12, weight: 800, align: 'center' });
          D.text(g, 'Ice bath at 0−5°C successfully suppresses thermal hydrolysis', cx, cy - 64, { color: '#94a3b8', size: 10, align: 'center' });
        }

        D.tag(g, `Diazonium Thermal Stability: ${st.diazoStability}%`, cx, 488, { bg: '#090d16', border: st.isDecomposing ? '#ef4444' : '#22c55e', color: st.isDecomposing ? '#ef4444' : '#22c55e', size: 12, align: 'center' });
      } else if (st.stage === 'step2_coupling') {
        D.text(g, 'Stage 2: Electrophilic Coupling & Dye Precipitation', 40, 108, { color: '#f8fafc', size: 13.5, weight: 700 });

        const bx = cx - 80;
        const by = cy - 35;
        const bkW = 160;
        const bkH = 165;

        // Beaker
        D.poly(g, [
          [bx, by],
          [bx, by + bkH],
          [bx + bkW, by + bkH],
          [bx + bkW, by],
        ], { fill: 'rgba(15, 23, 42, 0.5)', stroke: '#e2e8f0', width: 2.5 });

        // Base solution liquid with swirling vortex
        const liqH = 110;
        const liqCol = st.yieldPct > 35 ? st.hex : '#94a3b8';
        D.rect(g, bx + 4, by + bkH - liqH, bkW - 8, liqH - 2, { fill: liqCol, r: 6 });

        // Animated swirling dye precipitate clouds
        for (let s = 0; s < 5; s++) {
          const sAngle = t * 3.5 + s * 1.25;
          const sRad = 20 + s * 8;
          const sx = cx + Math.cos(sAngle) * sRad;
          const sy = by + bkH - 55 + Math.sin(sAngle) * (sRad * 0.4);
          D.circle(g, sx, sy, 8 + s * 2, { fill: 'rgba(255, 255, 255, 0.25)' });
        }

        // Magnetic Stirrer Bar at bottom spinning
        const stirAngle = t * 18;
        const stirLen = 32;
        const stirX1 = cx - Math.cos(stirAngle) * (stirLen * 0.5);
        const stirY1 = by + bkH - 12 - Math.sin(stirAngle) * 3;
        const stirX2 = cx + Math.cos(stirAngle) * (stirLen * 0.5);
        const stirY2 = by + bkH - 12 + Math.sin(stirAngle) * 3;
        D.line(g, stirX1, stirY1, stirX2, stirY2, { color: '#ffffff', width: 6 });
        D.text(g, 'Magnetic Stirrer (1000 RPM)', cx, by + bkH + 18, { color: '#94a3b8', size: 9, weight: 700, align: 'center' });

        // Dropping pipette with animated falling drops
        D.poly(g, [
          [cx - 5, by - 55],
          [cx - 5, by - 15],
          [cx - 1.5, by],
          [cx + 1.5, by],
          [cx + 5, by - 15],
          [cx + 5, by - 55],
        ], { fill: '#ffffff', stroke: '#94a3b8', width: 1.5, close: true });

        // Continuous falling droplet
        const dropT = (t * 2.5) % 1;
        const dropY = by + dropT * 55;
        if (dropT < 0.95) {
          D.circle(g, cx, dropY, 3.5, { fill: '#38bdf8', stroke: '#bae6fd', width: 1 });
        }
        // Splash ripples on liquid surface
        if (dropT > 0.8) {
          const ripR = (dropT - 0.8) * 45;
          D.circle(g, cx, by + bkH - liqH, ripR, { fill: 'none', stroke: '#38bdf8', width: 1.2 });
        }

        D.text(g, 'Ar-N₂⁺ Diazonium Solution (Dropwise)', cx + 55, by - 30, { color: '#38bdf8', size: 10, weight: 700 });
        D.text(g, `Coupler: ${st.couplerName} in pH ${st.ph}`, cx + 55, by - 14, { color: '#f8fafc', size: 11, weight: 700 });

        D.text(g, `${st.colorName} Dye Precipitating Instantly`, cx, by + bkH + 34, { color: st.hex, size: 13, weight: 800, align: 'center' });
        D.tag(g, `Coupling Efficiency: ${st.phEfficiency}%  •  Optimal: ${st.optimalPH}`, cx, 488, { bg: '#090d16', border: '#38bdf8', color: '#38bdf8', size: 12, align: 'center' });
      } else {
        D.text(g, 'Stage 3: Extended Conjugation & Azo Linkage', 40, 108, { color: '#f8fafc', size: 13.5, weight: 700 });

        // Molecule: Ring 1 - N=N - Ring 2
        const ar1x = cx - 110;
        const ar2x = cx + 110;

        D.circle(g, ar1x, cy, 32, { fill: 'rgba(56, 189, 248, 0.12)', stroke: '#38bdf8', width: 2 });
        D.text(g, 'C₆H₅', ar1x, cy + 4, { color: '#38bdf8', size: 12, weight: 800, align: 'center' });
        D.text(g, 'Arene A', ar1x, cy + 46, { color: '#94a3b8', size: 10, align: 'center' });

        // N=N bond with pulsating pi-resonance cloud
        const n1x = cx - 35;
        const n2x = cx + 35;
        D.line(g, ar1x + 32, cy, n1x, cy, { color: '#f8fafc', width: 3 });
        D.atom(g, n1x, cy, 16, '#1e3a8a', { label: 'N' });

        const piGlow = 0.5 + 0.5 * Math.sin(t * 6);
        D.line(g, n1x + 16, cy - 4, n2x - 16, cy - 4, { color: '#f59e0b', width: 3.5 });
        D.line(g, n1x + 16, cy + 4, n2x - 16, cy + 4, { color: '#f59e0b', width: 3.5 });

        D.atom(g, n2x, cy, 16, '#1e3a8a', { label: 'N' });
        D.line(g, n2x, cy, ar2x - 32, cy, { color: '#f8fafc', width: 3 });

        // Chromophore box with pulsing glow
        D.rect(g, n1x - 20, cy - 35, 90, 70, { stroke: 'rgba(245, 158, 11, ' + (0.5 + 0.5 * piGlow) + ')', width: 2, dash: [4, 4], r: 8 });
        D.text(g, 'Azo Chromophore (−N=N−)', cx, cy - 44, { color: '#f59e0b', size: 11, weight: 700, align: 'center' });

        D.circle(g, ar2x, cy, 32, { fill: 'rgba(234, 88, 12, 0.15)', stroke: st.hex, width: 2 });
        D.text(g, p.mode === 'beta_naphthol' ? 'β-Naph' : p.mode === 'phenol' ? 'Ph-OH' : 'Ar-NMe₂', ar2x, cy + 4, { color: st.hex, size: 11, weight: 800, align: 'center' });
        D.text(g, st.couplerName, ar2x, cy + 46, { color: '#94a3b8', size: 10, align: 'center' });

        // Auxochrome
        D.line(g, ar2x + 28, cy - 16, ar2x + 55, cy - 30, { color: st.hex, width: 2.5 });
        D.atom(g, ar2x + 55, cy - 30, 15, '#1e293b', { label: p.mode === 'dimethylaniline' ? 'NMe₂' : 'OH' });
        D.text(g, 'Auxochrome', ar2x + 55, cy - 50, { color: '#94a3b8', size: 9, align: 'center' });

        D.tag(g, `Extended π-Conjugation  •  HOMO-LUMO Gap Decreased  •  λ_max = ${st.lambdaMax} nm`, cx, 488, { bg: '#090d16', border: st.hex, color: st.hex, size: 11.5, align: 'center' });
      }

      // Right Panel: UV-Vis Absorbance Spectrum & Perceived Color Swatch (x: 520 to 975)
      D.rect(g, 520, 85, 455, 440, { fill: '#131b2e', stroke: '#1e293b', r: 12 });
      D.text(g, 'UV-Vis Electronic Absorption Spectrum & Colorimetry', 540, 108, { color: '#f8fafc', size: 13.5, weight: 700 });

      const gx = 575;
      const gy = 330;
      const gw = 370;
      const gh = 180;

      D.line(g, gx, gy, gx + gw, gy, { color: '#475569', width: 1.5 });
      D.line(g, gx, gy, gx, gy - gh, { color: '#475569', width: 1.5 });
      D.text(g, 'Wavelength λ (nm) →', gx + gw - 80, gy + 20, { color: '#94a3b8', size: 10.5, weight: 600 });
      D.text(g, 'Absorbance A', gx - 10, gy - gh - 8, { color: '#94a3b8', size: 11, weight: 600, align: 'right' });

      // Spectrum curve from 350 to 650 nm
      const specPts = [];
      const numPts = 60;
      for (let i = 0; i <= numPts; i++) {
        const lam = 350 + (i / numPts) * 300;
        const diff = (lam - st.lambdaMax) / 38;
        const absVal = Math.exp(-0.5 * diff * diff);
        const px = gx + (i / numPts) * gw;
        const py = gy - absVal * (gh * 0.85);
        specPts.push([px, py]);
      }
      D.poly(g, specPts, { stroke: st.hex, width: 3, fill: false });

      // Peak marker
      const peakX = gx + ((st.lambdaMax - 350) / 300) * gw;
      const peakY = gy - (gh * 0.85);
      D.line(g, peakX, gy, peakX, peakY, { color: '#facc15', width: 1.5, dash: [3, 3] });
      D.circle(g, peakX, peakY, 5, { fill: '#facc15' });
      D.text(g, `λ_max = ${st.lambdaMax} nm`, peakX, peakY - 14, { color: '#facc15', size: 11, weight: 800, align: 'center' });

      // Perceived Dye Swatch Tile below spectrum
      D.rect(g, 540, 370, 415, 80, { fill: '#0a0f1d', stroke: '#334155', r: 10 });
      // Color swatch square
      D.rect(g, 555, 382, 56, 56, { fill: st.hex, stroke: '#ffffff', width: 2, r: 8 });
      D.text(g, `Perceived Color: ${st.colorName}`, 625, 388, { color: '#ffffff', size: 13, weight: 800 });
      D.text(g, `Coupler: ${st.couplerName}  •  Overall Yield: ${st.yieldPct}%`, 625, 410, { color: '#cbd5e1', size: 11 });
      D.text(g, 'Bathochromic shift: absorption in blue (480 nm) yields complementary orange-red', 625, 428, { color: '#38bdf8', size: 10 });
    }
  };
})();
