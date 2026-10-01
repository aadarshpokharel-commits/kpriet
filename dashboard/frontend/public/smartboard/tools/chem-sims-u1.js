'use strict';

/**
 * Engineering Chemistry — Unit I: Molecular Structure, Bonding and Reactivity
 * Interactive Simulation Engines for U25CY103
 *
 * Implements:
 *  1. chem-orbitals-hybridization
 *  2. chem-de-broglie
 *  3. chem-newman-projection
 *  4. chem-chirality-fischer
 *  5. chem-ph-pka-buffer
 */
(function () {
  const S = (window.ChemSims = window.ChemSims || {});
  const D = window.EPDraw;
  const { C, fmt, clamp, lerp, rad } = D;

  // Scientific constants
  const PLANCK = 6.62607015e-34; // J·s
  const ELECTRON_VOLT = 1.602176634e-19; // J
  const MASS_ELECTRON = 9.1093837e-31; // kg
  const MASS_PROTON = 1.67262192e-27; // kg
  const MASS_NEUTRON = 1.67492749e-27; // kg
  const MASS_C60 = 1.196e-24; // kg (C60 fullerene, 720.66 u)
  const GAS_CONSTANT = 8.314462618; // J/(mol·K)

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

    // Glassmorphic translucent panel
    g.fillStyle = 'rgba(15, 23, 42, 0.88)';
    g.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    g.lineWidth = 1.5;
    g.beginPath();
    if (g.roundRect) g.roundRect(hudX, hudY, hudW, hudH, 10);
    else g.rect(hudX, hudY, hudW, hudH);
    g.fill();
    g.stroke();

    // Step dots and active badge
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

    // Step title
    g.fillStyle = '#f8fafc';
    g.font = 'bold 13px system-ui, sans-serif';
    const cleanTitle = (cur.title || '').replace(/^\d+\.\s*/, '');
    g.fillText(cleanTitle.length > 44 ? cleanTitle.slice(0, 42) + '...' : cleanTitle, hudX + 16, hudY + 43);

    // Step note
    g.fillStyle = '#94a3b8';
    g.font = '11px system-ui, sans-serif';
    const sub = customNote || cur.text || '';
    g.fillText(sub.length > 60 ? sub.slice(0, 58) + '...' : sub, hudX + 16, hudY + 59);

    g.restore();
  }


  // ═════════════════════════════════════════════════════════════════
  // 1. ATOMIC ORBITALS & HYBRIDIZATION VIEWER
  // ═════════════════════════════════════════════════════════════════
  S['chem-orbitals-hybridization'] = {
    live: true,
    approx: 'Orbital boundary surfaces show ~90% electron probability isosurfaces. Wavefunctions Ψnlm are qualitative hydrogenic representations.',
    modes: [
      { key: 'atomic', label: 'Atomic Orbitals (s, p, d)' },
      { key: 'hybrid', label: 'Hybridization (sp, sp², sp³)' },
    ],
    params: [
      {
        key: 'orbitalType',
        label: 'Atomic Orbital',
        type: 'select',
        default: '2pz',
        options: [
          { value: '1s', label: '1s (Spherical, l=0)' },
          { value: '2s', label: '2s (1 Radial Node, l=0)' },
          { value: '2px', label: '2px (x-axis, l=1, m=±1)' },
          { value: '2py', label: '2py (y-axis, l=1, m=±1)' },
          { value: '2pz', label: '2pz (z-axis, l=1, m=0)' },
          { value: '3dz2', label: '3dz² (Toroid + Lobes, l=2)' },
          { value: '3dxy', label: '3dxy (Cloverleaf, l=2)' },
        ],
        showIf: (p) => p.mode !== 'hybrid',
        help: 'Choose atomic orbital to inspect nodal geometry and quantum numbers.',
      },
      {
        key: 'hybridType',
        label: 'Hybridization Scheme',
        type: 'select',
        default: 'sp3',
        options: [
          { value: 'sp', label: 'sp (Linear · 180° · e.g. BeCl₂, C₂H₂)' },
          { value: 'sp2', label: 'sp² (Trigonal Planar · 120° · e.g. BF₃, C₂H₄)' },
          { value: 'sp3', label: 'sp³ (Tetrahedral · 109.5° · e.g. CH₄, NH₃, H₂O)' },
        ],
        showIf: (p) => p.mode === 'hybrid',
        help: 'Combination of s and p atomic orbitals into equivalent directional hybrid orbitals.',
      },
      {
        key: 'showNodes',
        label: 'Show Nodal Planes / Surfaces',
        type: 'toggle',
        default: true,
        help: 'Highlight surfaces where electron probability density |Ψ|² = 0.',
      },
      {
        key: 'densityScale',
        label: 'Electron Cloud Density',
        type: 'range',
        min: 1,
        max: 5,
        step: 1,
        default: 3,
        help: 'Number of stochastic orbital probability samples drawn in background.',
      },
      {
        key: 'rotAngle',
        label: 'View Rotation',
        type: 'range',
        min: 0,
        max: 360,
        step: 5,
        default: 35,
        unit: '°',
        help: 'Rotate 3D coordinate frame for perspective inspection.',
      },
    ],
    examples: [
      { label: 'Carbon sp³ in Methane (109.5°)', values: { mode: 'hybrid', hybridType: 'sp3', showNodes: true, rotAngle: 35 } },
      { label: 'Ethene sp² Planar (120°)', values: { mode: 'hybrid', hybridType: 'sp2', showNodes: true, rotAngle: 20 } },
      { label: 'Acetylene sp Linear (180°)', values: { mode: 'hybrid', hybridType: 'sp', showNodes: true, rotAngle: 45 } },
      { label: '2pz Nodal Plane at XY', values: { mode: 'atomic', orbitalType: '2pz', showNodes: true } },
      { label: '3dz² Torus and Dumbbell', values: { mode: 'atomic', orbitalType: '3dz2', showNodes: true } },
    ],
    validate(p) {
      return [];
    },
    steps(p, c) {
      if (p.mode === 'hybrid') {
        const h = p.hybridType || 'sp3';
        const geo = h === 'sp' ? 'Linear (180°)' : h === 'sp2' ? 'Trigonal Planar (120°)' : 'Tetrahedral (109.47°)';
        const sFrac = h === 'sp' ? '50%' : h === 'sp2' ? '33.3%' : '25%';
        return [
          { title: '1. Ground State Configuration', text: 'Carbon ground state: 1s² 2s² 2px¹ 2py¹ 2pz⁰. Electron promotion produces excited state 2s¹ 2px¹ 2py¹ 2pz¹.' },
          { title: '2. Orbital Mixing (Intermixing)', text: `Promoted s and p wavefunctions linearly combine: Ψ(hybrid) = a·Ψ(2s) + b·Ψ(2p). Yields ${h} hybrid set with ${sFrac} s-character.` },
          { title: '3. Spatial Orientation & Minimization', text: `VSEPR electron pair repulsion directs ${h} hybrid lobes apart to maximize distance, forming ${geo} geometry.` },
          { title: '4. Covalent Bond Formation (σ Overlap)', text: 'Head-on axial overlap of hybrid lobes with ligand orbitals forms strong cylindrical σ bonds.' },
        ];
      }
      const orb = p.orbitalType || '2pz';
      return [
        { title: '1. Schrödinger Wavefunction', text: `For ${orb}, the electronic wavefunction is Ψnlm(r, θ, φ) = Rnl(r) · Ylm(θ, φ).` },
        { title: '2. Nodal Surfaces & Signs', text: 'Angular and radial nodes partition space into positive (+, blue) and negative (−, red) phase lobes.' },
        { title: '3. Probability Density |Ψ|²', text: 'The Born interpretation: |Ψ|² dV represents probability of finding the electron in volume dV.' },
        { title: '4. Chemical Overlap & Reactivity', text: 'Constructive overlap (+ with +) produces bonding molecular orbitals; destructive overlap produces antibonding.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'atomic';
      if (mode === 'hybrid') {
        const h = p.hybridType || 'sp3';
        const angle = h === 'sp' ? 180 : h === 'sp2' ? 120 : 109.47;
        const sChar = h === 'sp' ? 50 : h === 'sp2' ? 33.33 : 25;
        const pChar = 100 - sChar;
        const numLobes = h === 'sp' ? 2 : h === 'sp2' ? 3 : 4;
        const formulaStr = h === 'sp'
          ? 'ψ_sp = (1/√2)(ψ_2s ± ψ_2pz)'
          : h === 'sp2'
          ? 'ψ_sp2 = (1/√3)ψ_2s + √(2/3)ψ_2p'
          : 'ψ_sp3 = (1/2)(ψ_2s ± ψ_2px ± ψ_2py ± ψ_2pz)';

        return {
          formulas: [
            { name: 'Hybrid Wavefunction', formula: formulaStr, given: `Scheme: ${h}`, calc: `${numLobes} degenerate hybrid orbitals`, result: `${angle}° angle`, unit: 'geometry' },
            { name: 's-Character Fraction', formula: '%s = 1/(1+n) × 100%', given: `n = ${h === 'sp' ? 1 : h === 'sp2' ? 2 : 3}`, calc: `${sChar.toFixed(1)}%`, result: `${sChar.toFixed(1)}%`, unit: 's-character' },
            { name: 'Bond Energy / Overlap', formula: 'E_overlap ∝ %s character', given: `s-char: ${sChar.toFixed(1)}%`, calc: h === 'sp' ? 'Highest electronegativity & shortest bond' : 'Standard tetrahedral covalent bond', result: h === 'sp' ? 'Strongest σ' : 'Standard σ', unit: '' },
          ],
          readouts: [
            { label: 'Hybridization', value: h.toUpperCase(), tone: 'hi' },
            { label: 'Inter-orbital Angle', value: `${angle.toFixed(1)}°`, tone: 'good' },
            { label: 's-Character', value: `${sChar.toFixed(1)} %`, tone: 'neutral' },
            { label: 'p-Character', value: `${pChar.toFixed(1)} %`, tone: 'neutral' },
            { label: 'Equivalent Lobes', value: String(numLobes), tone: 'good' },
          ],
          state: { mode, hybridType: h, angle, sChar, pChar },
          explain: {
            what: `Hybridization is the mathematical mixing of non-equivalent atomic orbitals (s and p) of an isolated atom to form a new set of identical hybrid orbitals directed toward specific corners in space.`,
            why: `Hybrid orbitals have concentrated directional electron density with a large forward lobe, allowing much greater axial overlap and forming stronger covalent σ-bonds than pure s or p atomic orbitals.`,
            param: `Increasing p-character (from sp 50% to sp³ 75%) increases the number of lobes from 2 to 4 and narrows the inter-orbital angle from 180° to 109.5°.`,
            effect: `Higher s-character (e.g. sp carbons in alkynes) holds bonding electrons closer to the positive nucleus, causing shorter bond lengths, greater C-H acidity, and higher bond dissociation energies.`,
          },
        };
      }

      const orb = p.orbitalType || '2pz';
      const qm = {
        '1s': { n: 1, l: 0, m: 0, radNodes: 0, angNodes: 0, shape: 'Spherical' },
        '2s': { n: 2, l: 0, m: 0, radNodes: 1, angNodes: 0, shape: 'Spherical with radial node' },
        '2px': { n: 2, l: 1, m: 1, radNodes: 0, angNodes: 1, shape: 'Dumbbell along X-axis' },
        '2py': { n: 2, l: 1, m: -1, radNodes: 0, angNodes: 1, shape: 'Dumbbell along Y-axis' },
        '2pz': { n: 2, l: 1, m: 0, radNodes: 0, angNodes: 1, shape: 'Dumbbell along Z-axis' },
        '3dz2': { n: 3, l: 2, m: 0, radNodes: 0, angNodes: 2, shape: 'Dumbbell + equatorial donut torus' },
        '3dxy': { n: 3, l: 2, m: -2, radNodes: 0, angNodes: 2, shape: 'Four-leaf clover in XY-plane' },
      }[orb] || { n: 2, l: 1, m: 0, radNodes: 0, angNodes: 1, shape: 'Dumbbell' };

      const totalNodes = qm.n - 1;

      return {
        formulas: [
          { name: 'Radial Nodes', formula: 'N_radial = n − l − 1', given: `n=${qm.n}, l=${qm.l}`, calc: `${qm.n} − ${qm.l} − 1`, result: `${qm.radNodes}`, unit: 'nodes' },
          { name: 'Angular Nodes', formula: 'N_angular = l', given: `l=${qm.l}`, calc: `${qm.l}`, result: `${qm.angNodes}`, unit: 'planes' },
          { name: 'Total Nodes', formula: 'N_total = n − 1', given: `n=${qm.n}`, calc: `${qm.n} − 1`, result: `${totalNodes}`, unit: 'nodes' },
        ],
        readouts: [
          { label: 'Orbital', value: orb, tone: 'hi' },
          { label: 'Quantum n, l, m', value: `n=${qm.n}, l=${qm.l}, ml=${qm.m}`, tone: 'good' },
          { label: 'Radial Nodes', value: String(qm.radNodes), tone: 'neutral' },
          { label: 'Angular Nodes', value: String(qm.angNodes), tone: 'neutral' },
          { label: 'Geometry', value: qm.shape, tone: 'good' },
        ],
        state: { mode, orbitalType: orb, ...qm },
        explain: {
          what: `Atomic orbitals represent one-electron spatial wavefunctions Ψnlm determined by the stationary Schrödinger equation in a central nuclear Coulomb potential.`,
          why: `Understanding orbital geometry and nodal planes explains bonding angles, stereochemistry, chemical reactivity, and molecular orbital formation in advanced chemistry.`,
          param: `The principal quantum number n sets size and energy; azimuthal quantum number l sets orbital shape; magnetic quantum number ml sets spatial orientation.`,
          effect: `Nodal surfaces have zero electron probability (|Ψ|² = 0), dictating where electron overlap is forbidden and where chemical attack can occur.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a'); // deep dark slate background for brilliant orbital visualization

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Ground state configuration & quantum numbers' : step === 1 ? 'Valence electron promotion & excitation' : step === 2 ? 'Linear combination of atomic wavefunctions' : 'VSEPR geometric equilibrium & bond angles');

      // Continuous quantum orbital rotation & electron probability sparkles
      const autoRot = (p.autoRotate !== false ? t * 0.35 : 0);
      const rot = rad(p.rotAngle != null ? p.rotAngle : 35) + autoRot;

      const cx = 500;
      const cy = 270;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);

      // Coordinate axes
      g.save();
      g.lineWidth = 1.5;
      g.strokeStyle = '#334155';
      // X axis
      D.line(g, cx - 240 * cosR, cy + 100 * sinR, cx + 240 * cosR, cy - 100 * sinR, { color: '#475569', width: 1.5, dash: [4, 4] });
      D.text(g, 'x', cx + 250 * cosR, cy - 105 * sinR, { color: '#94a3b8', size: 14, weight: 700 });
      // Y axis
      D.line(g, cx - 220, cy, cx + 220, cy, { color: '#475569', width: 1.5, dash: [4, 4] });
      D.text(g, 'y', cx + 230, cy - 4, { color: '#94a3b8', size: 14, weight: 700 });
      // Z axis
      D.line(g, cx, cy + 220, cx, cy - 220, { color: '#475569', width: 1.5, dash: [4, 4] });
      D.text(g, 'z', cx + 6, cy - 225, { color: '#94a3b8', size: 14, weight: 700 });
      g.restore();

      const mode = p.mode || 'atomic';

      if (mode === 'hybrid') {
        const h = p.hybridType || 'sp3';
        D.text(g, `CARBON HYBRIDIZATION: ${h.toUpperCase()}`, 30, 40, { color: '#38bdf8', size: 22, weight: 800 });
        D.text(g, `Bond Angle: ${c.state.angle.toFixed(1)}° · %s: ${c.state.sChar.toFixed(1)}% · %p: ${c.state.pChar.toFixed(1)}%`, 30, 68, { color: '#94a3b8', size: 14 });

        // Draw hybrid lobes
        const lobes = [];
        if (h === 'sp') {
          lobes.push({ angle: 0, length: 170, color: '#38bdf8', label: 'sp lobe 1' });
          lobes.push({ angle: Math.PI, length: 170, color: '#38bdf8', label: 'sp lobe 2' });
        } else if (h === 'sp2') {
          lobes.push({ angle: -Math.PI / 2, length: 165, color: '#10b981', label: 'sp² (top)' });
          lobes.push({ angle: -Math.PI / 2 + (2 * Math.PI) / 3, length: 165, color: '#10b981', label: 'sp² (right)' });
          lobes.push({ angle: -Math.PI / 2 + (4 * Math.PI) / 3, length: 165, color: '#10b981', label: 'sp² (left)' });
        } else {
          // sp3 tetrahedral
          lobes.push({ angle: -Math.PI / 2, length: 160, color: '#818cf8', label: 'sp³ (apex)' });
          lobes.push({ angle: Math.PI / 6, length: 145, color: '#818cf8', label: 'sp³ (base right)' });
          lobes.push({ angle: (5 * Math.PI) / 6, length: 145, color: '#818cf8', label: 'sp³ (base left)' });
          lobes.push({ angle: Math.PI / 2 + 0.35, length: 120, color: '#6366f1', label: 'sp³ (rear)' });
        }

        // Animated breathing lobe expansion & quantum sparkles
        const pulse = 1 + 0.04 * Math.sin(t * 3.5);
        
        // Quantum electron sparkles orbiting lobes
        g.save();
        for (let q = 0; q < 32; q++) {
          const qAngle = (q * 1.37 + t * 1.5) % (Math.PI * 2);
          const qDist = 40 + (Math.sin(q * 2.7 + t * 2) * 0.5 + 0.5) * 110;
          const qx = cx + Math.cos(qAngle) * qDist;
          const qy = cy + Math.sin(qAngle) * qDist * 0.65;
          const qAlpha = 0.25 + 0.45 * Math.sin(q * 3.1 + t * 4);
          g.beginPath();
          g.arc(qx, qy, 1.8, 0, Math.PI * 2);
          g.fillStyle = 'rgba(56, 189, 248, ' + Math.max(0, qAlpha) + ')';
          g.fill();
        }
        g.restore();

        lobes.forEach((lb, i) => {
          const lAngle = lb.angle;
          const len = lb.length * pulse;
          const tipX = cx + len * Math.cos(lAngle);
          const tipY = cy + len * Math.sin(lAngle);

          // Directional hybrid teardrop lobe
          g.save();
          g.beginPath();
          g.translate(cx, cy);
          g.rotate(lAngle);

          const grad = g.createRadialGradient(len * 0.6, 0, 10, len * 0.6, 0, len * 0.65);
          grad.addColorStop(0, lb.color);
          grad.addColorStop(0.7, lb.color + 'aa');
          grad.addColorStop(1, lb.color + '11');

          g.fillStyle = grad;
          g.strokeStyle = lb.color;
          g.lineWidth = 2.5;

          // Main large lobe
          g.moveTo(0, 0);
          g.bezierCurveTo(len * 0.35, -len * 0.38, len * 0.85, -len * 0.32, len, 0);
          g.bezierCurveTo(len * 0.85, len * 0.32, len * 0.35, len * 0.38, 0, 0);
          g.fill();
          g.stroke();

          // Small opposite tail lobe of opposite phase
          g.beginPath();
          g.fillStyle = '#ef444455';
          g.strokeStyle = '#ef4444';
          g.lineWidth = 1.5;
          const tail = len * 0.28;
          g.moveTo(0, 0);
          g.bezierCurveTo(-tail * 0.4, -tail * 0.4, -tail * 0.9, -tail * 0.3, -tail, 0);
          g.bezierCurveTo(-tail * 0.9, tail * 0.3, -tail * 0.4, tail * 0.4, 0, 0);
          g.fill();
          g.stroke();

          g.restore();

          // Lobe label
          D.text(g, lb.label, tipX + (Math.cos(lAngle) * 20), tipY + (Math.sin(lAngle) * 20), {
            color: '#f8fafc',
            size: 13,
            weight: 700,
            align: 'center',
          });
        });

        // Bond angle arc if sp or sp2
        if (h === 'sp') {
          g.save();
          g.strokeStyle = '#facc15';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(cx, cy, 60, 0, Math.PI, true);
          g.stroke();
          D.text(g, '180°', cx, cy - 75, { color: '#facc15', size: 16, weight: 800, align: 'center' });
          g.restore();
        } else if (h === 'sp2') {
          g.save();
          g.strokeStyle = '#facc15';
          g.lineWidth = 2;
          g.beginPath();
          g.arc(cx, cy, 60, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI) / 3);
          g.stroke();
          D.text(g, '120°', cx + 55, cy - 50, { color: '#facc15', size: 16, weight: 800, align: 'center' });
          g.restore();
        } else {
          D.text(g, '109.5°', cx + 45, cy - 55, { color: '#facc15', size: 16, weight: 800, align: 'center' });
        }

        // Central carbon nucleus
        D.circle(g, cx, cy, 14, { fill: '#1e293b', stroke: '#38bdf8', width: 3 });
        D.text(g, 'C', cx, cy + 5, { color: '#f8fafc', size: 14, weight: 800, align: 'center' });
      } else {
        // Atomic Orbitals mode
        const orb = p.orbitalType || '2pz';
        D.text(g, `ATOMIC ORBITAL: ${orb.toUpperCase()}`, 30, 40, { color: '#38bdf8', size: 22, weight: 800 });
        D.text(g, `${c.state.shape} · n=${c.state.n}, l=${c.state.l}, ml=${c.state.m}`, 30, 68, { color: '#94a3b8', size: 14 });

        const pulse = 1 + 0.025 * Math.sin(t * 3.5);

        if (orb === '1s' || orb === '2s') {
          // Spherical orbital
          const rMax = orb === '1s' ? 120 : 180;
          const grad = g.createRadialGradient(cx, cy, 5, cx, cy, rMax * pulse);
          grad.addColorStop(0, '#38bdf8');
          grad.addColorStop(0.5, '#0284c788');
          grad.addColorStop(0.9, '#0369a122');
          grad.addColorStop(1, 'transparent');

          D.circle(g, cx, cy, rMax * pulse, { fill: grad });

          if (orb === '2s' && p.showNodes) {
            // Radial node
            g.save();
            g.strokeStyle = '#facc15';
            g.lineWidth = 2;
            g.setLineDash([6, 6]);
            g.beginPath();
            g.arc(cx, cy, 75 * pulse, 0, Math.PI * 2);
            g.stroke();
            D.tag(g, 'Radial Node (|Ψ|² = 0)', cx + 90, cy - 40, { bg: '#facc15', color: '#0f172a', size: 12 });
            g.restore();
          }
        } else if (orb.startsWith('2p')) {
          // Dumbbell orbital with positive (blue) and negative (red) lobes
          let angle = -Math.PI / 2; // 2pz vertical
          if (orb === '2px') angle = 0; // along x
          if (orb === '2py') angle = Math.PI / 4; // perspective y

          const lobeLen = 160 * pulse;
          [
            { dir: 1, color: '#38bdf8', sign: '+' },
            { dir: -1, color: '#ef4444', sign: '−' },
          ].forEach((lb) => {
            g.save();
            g.translate(cx, cy);
            g.rotate(angle);
            const lX = lb.dir * lobeLen;
            const grad = g.createRadialGradient(lX * 0.65, 0, 5, lX * 0.65, 0, lobeLen * 0.6);
            grad.addColorStop(0, lb.color);
            grad.addColorStop(0.7, lb.color + 'aa');
            grad.addColorStop(1, 'transparent');

            g.fillStyle = grad;
            g.strokeStyle = lb.color;
            g.lineWidth = 2;

            g.beginPath();
            g.moveTo(0, 0);
            g.bezierCurveTo(lb.dir * lobeLen * 0.35, -50, lb.dir * lobeLen * 0.85, -45, lX, 0);
            g.bezierCurveTo(lb.dir * lobeLen * 0.85, 45, lb.dir * lobeLen * 0.35, 50, 0, 0);
            g.fill();
            g.stroke();

            D.text(g, lb.sign, lX * 0.65, 7, { color: '#ffffff', size: 20, weight: 800, align: 'center' });
            g.restore();
          });

          if (p.showNodes) {
            // Nodal plane perpendicular to orbital axis
            g.save();
            g.translate(cx, cy);
            g.rotate(angle + Math.PI / 2);
            g.strokeStyle = '#facc15';
            g.lineWidth = 2;
            g.setLineDash([6, 6]);
            g.beginPath();
            g.moveTo(-160, 0);
            g.lineTo(160, 0);
            g.stroke();
            D.tag(g, 'Nodal Plane (Ψ = 0)', 110, -18, { bg: '#facc15', color: '#0f172a', size: 12 });
            g.restore();
          }
        } else if (orb === '3dz2') {
          // Torus ring + vertical dumbbell
          const lobeLen = 170 * pulse;
          [1, -1].forEach((dir) => {
            g.save();
            g.translate(cx, cy);
            const lY = -dir * lobeLen;
            const grad = g.createRadialGradient(0, lY * 0.65, 5, 0, lY * 0.65, lobeLen * 0.55);
            grad.addColorStop(0, '#38bdf8');
            grad.addColorStop(1, 'transparent');
            g.fillStyle = grad;
            g.strokeStyle = '#38bdf8';
            g.lineWidth = 2;

            g.beginPath();
            g.moveTo(0, 0);
            g.bezierCurveTo(-45, -dir * lobeLen * 0.35, -45, -dir * lobeLen * 0.85, 0, lY);
            g.bezierCurveTo(45, -dir * lobeLen * 0.85, 45, -dir * lobeLen * 0.35, 0, 0);
            g.fill();
            g.stroke();
            D.text(g, '+', 0, lY * 0.65 + 6, { color: '#ffffff', size: 18, weight: 800, align: 'center' });
            g.restore();
          });

          // Equatorial donut torus (negative phase)
          g.save();
          g.beginPath();
          g.ellipse(cx, cy, 100, 36, 0, 0, Math.PI * 2);
          g.strokeStyle = '#ef4444';
          g.lineWidth = 2.5;
          g.fillStyle = '#ef444444';
          g.fill();
          g.stroke();
          D.text(g, '− ring', cx + 70, cy - 20, { color: '#ef4444', size: 13, weight: 700 });
          g.restore();
        } else if (orb === '3dxy') {
          // 4-leaf clover in xy plane
          [
            { angle: Math.PI / 4, sign: '+', col: '#38bdf8' },
            { angle: (3 * Math.PI) / 4, sign: '−', col: '#ef4444' },
            { angle: (5 * Math.PI) / 4, sign: '+', col: '#38bdf8' },
            { angle: (7 * Math.PI) / 4, sign: '−', col: '#ef4444' },
          ].forEach((lb) => {
            g.save();
            g.translate(cx, cy);
            g.rotate(lb.angle);
            const len = 140 * pulse;
            g.beginPath();
            g.moveTo(0, 0);
            g.bezierCurveTo(len * 0.4, -38, len * 0.85, -34, len, 0);
            g.bezierCurveTo(len * 0.85, 34, len * 0.4, 38, 0, 0);
            g.fillStyle = lb.col + 'aa';
            g.strokeStyle = lb.col;
            g.lineWidth = 2;
            g.fill();
            g.stroke();
            D.text(g, lb.sign, len * 0.65, 6, { color: '#fff', size: 16, weight: 800, align: 'center' });
            g.restore();
          });
        }

        // Nucleus
        D.circle(g, cx, cy, 7, { fill: '#ffffff', stroke: '#38bdf8', width: 2 });
      }
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 2. DE BROGLIE WAVELENGTH CALCULATOR WITH PARTICLE COMPARISON
  // ═════════════════════════════════════════════════════════════════
  S['chem-de-broglie'] = {
    live: true,
    approx: 'Relativistic mass correction ignored for non-relativistic velocities (v << c). Crystal lattice spacing d ≈ 0.2 nm.',
    modes: [
      { key: 'velocity', label: 'Specified Velocity v (m/s)' },
      { key: 'voltage', label: 'Electron Accelerator Voltage V (volts)' },
    ],
    params: [
      {
        key: 'particle',
        label: 'Particle Specimen',
        type: 'select',
        default: 'electron',
        options: [
          { value: 'electron', label: 'Electron (m = 9.109×10⁻³¹ kg)' },
          { value: 'proton', label: 'Proton (m = 1.673×10⁻²⁷ kg)' },
          { value: 'neutron', label: 'Thermal Neutron (m = 1.675×10⁻²⁷ kg)' },
          { value: 'c60', label: 'C₆₀ Fullerene (m = 1.20×10⁻²⁴ kg)' },
          { value: 'dust', label: 'Microscopic Dust Speck (m = 1.0×10⁻⁹ kg)' },
          { value: 'ball', label: 'Cricket Ball (m = 0.16 kg)' },
        ],
        showIf: (p) => p.mode !== 'voltage',
        help: 'Select subatomic, molecular, or macroscopic object to compare quantum wave effects.',
      },
      {
        key: 'velocity',
        label: 'Velocity v',
        type: 'range',
        min: 1,
        max: 5000000,
        step: 1000,
        default: 1000000,
        unit: 'm/s',
        showIf: (p) => p.mode !== 'voltage',
        help: 'Particle speed (m/s). Relativistic threshold is ~3×10⁷ m/s.',
      },
      {
        key: 'accelVoltage',
        label: 'Accelerating Potential V',
        type: 'range',
        min: 10,
        max: 200000,
        step: 100,
        default: 100,
        unit: 'V',
        showIf: (p) => p.mode === 'voltage',
        help: 'Accelerating voltage in Transmission Electron Microscope (TEM).',
      },
    ],
    examples: [
      { label: 'TEM Electron at 100 V (λ = 1.23 Å, crystal diffraction)', values: { mode: 'voltage', accelVoltage: 100 } },
      { label: 'High-Res TEM Electron at 100 kV (λ = 0.0388 Å)', values: { mode: 'voltage', accelVoltage: 100000 } },
      { label: 'Thermal Neutron at 2200 m/s (λ = 1.8 Å, neutron diffraction)', values: { mode: 'velocity', particle: 'neutron', velocity: 2200 } },
      { label: 'C₆₀ Buckyball at 100 m/s (Quantum interference demonstrated)', values: { mode: 'velocity', particle: 'c60', velocity: 100 } },
      { label: 'Cricket ball at 30 m/s (λ ≈ 10⁻³⁴ m, purely classical)', values: { mode: 'velocity', particle: 'ball', velocity: 30 } },
    ],
    validate(p) {
      const warns = [];
      if (p.velocity && p.velocity >= 3e7) warns.push('Relativistic corrections (Lorentz factor γ) become noticeable at v > 3×10⁷ m/s.');
      return warns;
    },
    steps(p, c) {
      return [
        { title: '1. de Broglie Hypothesis (1924)', text: 'Louis de Broglie postulated that if light has dual wave-particle character, material particles with momentum p must also possess an associated matter wavelength λ = h/p.' },
        { title: '2. Momentum & Kinetic Energy Evaluation', text: 'Linear momentum p = m·v. In an electrostatic accelerator, kinetic energy Ek = q·V = p² / (2m), giving p = √(2m q V).' },
        { title: '3. Matter Wavelength Calculation', text: `For this particle, λ = h / (m·v) = ${c.formulas[0].calc} = ${c.formulas[0].result} ${c.formulas[0].unit}.` },
        { title: '4. Physical Consequence & Diffraction', text: 'Diffraction occurs only when wavelength λ is comparable to obstacle spacing d (~0.1–0.3 nm in crystals). For macroscopic bodies, λ is undetectably small.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'velocity';
      let mass = MASS_ELECTRON;
      let vel = Number(p.velocity) || 1000000;
      let particleName = 'Electron';

      if (mode === 'voltage') {
        const V = Number(p.accelVoltage) || 100;
        mass = MASS_ELECTRON;
        const q = ELECTRON_VOLT;
        // Ek = q*V = 0.5 * m * v^2 -> v = sqrt(2*q*V/m)
        vel = Math.sqrt((2 * q * V) / mass);
        particleName = 'Accelerated Electron';
      } else {
        const sel = p.particle || 'electron';
        if (sel === 'proton') { mass = MASS_PROTON; particleName = 'Proton'; }
        else if (sel === 'neutron') { mass = MASS_NEUTRON; particleName = 'Neutron'; }
        else if (sel === 'c60') { mass = MASS_C60; particleName = 'C60 Fullerene'; }
        else if (sel === 'dust') { mass = 1.0e-9; particleName = 'Dust Speck'; }
        else if (sel === 'ball') { mass = 0.16; particleName = 'Cricket Ball'; }
      }

      const momentum = mass * vel;
      const lambda = PLANCK / momentum; // meters
      const ekJ = 0.5 * mass * vel * vel;
      const ekEV = ekJ / ELECTRON_VOLT;

      let lambdaStr = '';
      let lambdaUnit = 'm';
      if (lambda < 1e-15) {
        lambdaStr = lambda.toExponential(3);
        lambdaUnit = 'm';
      } else if (lambda < 1e-12) {
        lambdaStr = (lambda * 1e15).toFixed(3);
        lambdaUnit = 'fm';
      } else if (lambda < 1e-9) {
        lambdaStr = (lambda * 1e12).toFixed(3);
        lambdaUnit = 'pm';
      } else if (lambda < 1e-6) {
        lambdaStr = (lambda * 1e9).toFixed(4);
        lambdaUnit = 'nm';
      } else {
        lambdaStr = lambda.toExponential(3);
      }

      const isQuantum = lambda >= 1e-12; // >= 1 pm can show diffraction in matter

      return {
        formulas: [
          {
            name: 'de Broglie Wavelength',
            formula: 'λ = h / p = h / (m · v)',
            given: `m = ${mass.toExponential(3)} kg, v = ${vel.toExponential(3)} m/s`,
            calc: `6.626×10⁻³⁴ / (${mass.toExponential(2)} × ${vel.toExponential(2)})`,
            result: lambdaStr,
            unit: lambdaUnit,
          },
          {
            name: 'Kinetic Energy',
            formula: 'E_k = ½ m v²',
            given: `m = ${mass.toExponential(2)} kg`,
            calc: `${ekJ.toExponential(2)} J`,
            result: ekEV < 1e-3 || ekEV > 1e7 ? `${ekEV.toExponential(2)} eV` : `${ekEV.toFixed(2)} eV`,
            unit: '',
          },
          {
            name: 'Diffraction Criterion',
            formula: 'λ ≈ d_lattice (d ≈ 0.2 nm)',
            given: `λ = ${lambdaStr} ${lambdaUnit}`,
            calc: isQuantum ? 'λ comparable to interatomic spacing' : 'λ << nuclear size (undetectable)',
            result: isQuantum ? 'WAVE (Diffracts)' : 'CLASSICAL (Particle)',
            unit: '',
          },
        ],
        readouts: [
          { label: 'Particle', value: particleName, tone: 'hi' },
          { label: 'Matter Wavelength λ', value: `${lambdaStr} ${lambdaUnit}`, tone: 'good' },
          { label: 'Momentum p', value: `${momentum.toExponential(2)} kg·m/s`, tone: 'neutral' },
          { label: 'Velocity v', value: `${vel.toExponential(2)} m/s`, tone: 'neutral' },
          { label: 'Duality Regime', value: isQuantum ? 'Quantum Wave' : 'Classical Particle', tone: isQuantum ? 'good' : 'warn' },
        ],
        state: { mass, vel, momentum, lambda, lambdaStr, lambdaUnit, isQuantum, particleName },
        explain: {
          what: `The de Broglie relation λ = h/p establishes that all matter has both particle and wave properties. The wavelength of the pilot matter wave is inversely proportional to momentum.`,
          why: `This wave nature enables the Transmission Electron Microscope (TEM), where electrons with picometer wavelengths achieve atomic resolution 10,000× beyond optical microscopy.`,
          param: `Increasing velocity or mass increases momentum p, which drastically shrinks the de Broglie wavelength λ.`,
          effect: `For subatomic particles (electrons, neutrons), λ (~0.1 nm) is on the scale of crystal lattices, yielding pronounced Bragg diffraction. For tennis or cricket balls, λ (~10⁻³⁴ m) is millions of times smaller than a proton, rendering wave interference completely unobservable.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#090d16');

      const cx = 500;
      const cy = 270;
      const state = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Momentum input & de Broglie relation (λ = h/p)' : step === 1 ? 'Traveling matter wave propagation & frequency' : step === 2 ? 'Crystal lattice aperture & electron diffraction' : 'Quantum vs macroscopic particle behavior');

      D.text(g, 'DE BROGLIE MATTER WAVE INTERACTION', 30, 40, { color: '#38bdf8', size: 22, weight: 800 });
      D.text(g, `Particle: ${state.particleName} · λ = ${state.lambdaStr} ${state.lambdaUnit} · Momentum: ${state.momentum.toExponential(2)} kg·m/s`, 30, 68, { color: '#94a3b8', size: 14 });

      // Left panel: Particle packet trajectory
      const leftW = 440;
      g.save();
      g.fillStyle = '#1e293b44';
      g.strokeStyle = '#334155';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(40, 100, leftW, 380, 12);
      g.fill();
      g.stroke();

      D.text(g, 'PARTICLE WAVE-PACKET PROPAGATION', 60, 130, { color: '#f8fafc', size: 15, weight: 700 });

      // Draw wave packet
      const packetX = 60 + ((t * 80) % (leftW - 80));
      const packetY = 280;

      // Sinusoidal wave envelope
      g.beginPath();
      g.strokeStyle = '#38bdf8';
      g.lineWidth = 3;
      const nCycles = state.isQuantum ? 6 : 1;
      const kFreq = state.isQuantum ? 0.12 : 0.03;
      for (let x = -80; x <= 80; x += 2) {
        const envelope = Math.exp(-((x / 35) ** 2));
        const wave = Math.sin(x * kFreq + t * 8) * 45 * envelope;
        const px = packetX + x;
        const py = packetY + wave;
        if (x === -80) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();

      // Central particle circle
      D.circle(g, packetX, packetY, state.isQuantum ? 8 : 16, {
        fill: state.isQuantum ? '#38bdf8' : '#f59e0b',
        stroke: '#ffffff',
        width: 2.5,
      });

      D.text(g, `Mass: ${state.mass.toExponential(2)} kg`, 60, 430, { color: '#cbd5e1', size: 13 });
      D.text(g, `Velocity: ${state.vel.toExponential(2)} m/s`, 60, 455, { color: '#cbd5e1', size: 13 });
      g.restore();

      // Right panel: Crystal diffraction slit test
      const rightX = 520;
      const rightW = 440;
      g.save();
      g.fillStyle = '#1e293b44';
      g.strokeStyle = '#334155';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(rightX, 100, rightW, 380, 12);
      g.fill();
      g.stroke();

      D.text(g, 'ATOMIC LATTICE SCATTERING (d = 0.2 nm)', rightX + 20, 130, { color: '#f8fafc', size: 15, weight: 700 });

      // Draw crystal obstacle atoms
      const atomX = rightX + 160;
      for (let y = 160; y <= 420; y += 45) {
        D.circle(g, atomX, y, 9, { fill: '#64748b', stroke: '#cbd5e1', width: 2 });
      }
      D.text(g, 'Lattice atoms d ≈ 0.2 nm', atomX - 10, 450, { color: '#94a3b8', size: 12, align: 'center' });

      if (state.isQuantum) {
        // Quantum circular diffraction rings
        g.strokeStyle = '#38bdf866';
        g.lineWidth = 2;
        const waveProgress = (t * 60) % 90;
        for (let r = waveProgress; r < 240; r += 35) {
          g.beginPath();
          g.arc(atomX, 290, r, -Math.PI / 3, Math.PI / 3);
          g.stroke();
        }
        D.tag(g, 'BRAGG DIFFRACTION ACTIVE', rightX + 240, 200, { bg: '#10b981', color: '#0f172a', size: 13 });
        D.text(g, 'Clear constructive interference fringes formed on screen', rightX + 180, 240, { color: '#d1fae5', size: 12 });
      } else {
        // Classical blocked straight lines
        g.strokeStyle = '#f59e0b';
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(rightX + 40, 280);
        g.lineTo(atomX - 10, 280);
        g.stroke();
        D.tag(g, 'CLASSICAL SHADOW (NO DIFFRACTION)', rightX + 220, 200, { bg: '#ef4444', color: '#ffffff', size: 13 });
        D.text(g, 'Particle collides classically; wavelength too small for wave effect', rightX + 180, 240, { color: '#fee2e2', size: 12 });
      }

      g.restore();
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 3. NEWMAN PROJECTION ROTATOR WITH LIVE POTENTIAL ENERGY CURVE
  // ═════════════════════════════════════════════════════════════════
  S['chem-newman-projection'] = {
    live: true,
    approx: 'Torsional potential curves modeled using 3-fold Fourier expansion V(θ) = 0.5 V₁ (1-cos θ) + 0.5 V₂ (1-cos 2θ) + 0.5 V₃ (1-cos 3θ).',
    modes: [
      { key: 'ethane', label: 'Ethane (CH₃−CH₃)' },
      { key: 'butane', label: 'n-Butane (CH₃−CH₂−CH₂−CH₃)' },
    ],
    params: [
      {
        key: 'dihedral',
        label: 'Dihedral Angle θ',
        type: 'range',
        min: 0,
        max: 360,
        step: 1,
        default: 60,
        unit: '°',
        help: 'Angle between front C-H/C-CH₃ and rear C-H/C-CH₃ bonds in Newman projection.',
      },
      {
        key: 'temperature',
        label: 'Temperature T',
        type: 'range',
        min: 150,
        max: 600,
        step: 10,
        default: 298,
        unit: 'K',
        help: 'Thermal energy kBT determines the Maxwell-Boltzmann equilibrium distribution of conformers.',
      },
    ],
    examples: [
      { label: 'Ethane Staggered (Lowest Energy, θ = 60°)', values: { mode: 'ethane', dihedral: 60 } },
      { label: 'Ethane Eclipsed (Torsional Barrier 12.5 kJ/mol, θ = 0°)', values: { mode: 'ethane', dihedral: 0 } },
      { label: 'Butane Anti (Global Minimum 0 kJ/mol, θ = 180°)', values: { mode: 'butane', dihedral: 180 } },
      { label: 'Butane Gauche (Local Minimum 3.8 kJ/mol, θ = 60°)', values: { mode: 'butane', dihedral: 60 } },
      { label: 'Butane Syn-periplanar (Maximum Repulsion 19.0 kJ/mol, θ = 0°)', values: { mode: 'butane', dihedral: 0 } },
    ],
    validate(p) {
      return [];
    },
    steps(p, c) {
      const mode = p.mode || 'ethane';
      if (mode === 'butane') {
        return [
          { title: '1. Newman Projection Conventions', text: 'Viewing along the central C2−C3 bond: front carbon C2 is a central vertex Y; rear carbon C3 is represented by a large outer circle.' },
          { title: '2. Torsional & Steric Strain', text: 'Torsional strain stems from bond-pair electron repulsion; steric van der Waals strain arises when bulky methyl (−CH₃) groups collide.' },
          { title: '3. Conformational Energy Spectrum', text: `At current θ = ${p.dihedral}°: Conformer is ${c.state.confName}. Potential energy V(θ) = ${c.state.energy.toFixed(1)} kJ/mol.` },
          { title: '4. Dynamic Equilibrium at T = ' + p.temperature + ' K', text: `Thermal population ratio: Anti conformer accounts for ~${c.state.antiPct}% and Gauche ~${c.state.gauchePct}% at equilibrium.` },
        ];
      }
      return [
        { title: '1. Ethane C−C Bond Rotation', text: 'Single σ-bonds possess cylindrical symmetry allowing rotation about the C−C axis with a small 12.5 kJ/mol activation barrier.' },
        { title: '2. Staggered vs Eclipsed Geometry', text: 'At θ = 60°, 180°, 300°, the conformers are staggered (dihedral 60° apart). At θ = 0°, 120°, 240°, bonds eclipse each other.' },
        { title: '3. Hyperconjugation Stability', text: 'Staggered ethane is stabilized by σ(C-H) → σ*(C-H) hyperconjugative orbital overlap, lowering energy by ~12.5 kJ/mol relative to eclipsed.' },
        { title: '4. Rapid Room Temperature Flipping', text: 'At 298 K, thermal energy RT ≈ 2.5 kJ/mol drives several million rotations per second across the 12.5 kJ/mol barrier.' },
      ];
    },
    compute(p) {
      const mode = p.mode || 'ethane';
      const thDeg = Number(p.dihedral) || 0;
      const thRad = rad(thDeg);
      const T = Number(p.temperature) || 298;

      let energy = 0; // kJ/mol
      let confName = '';
      let barrier = 12.5;

      if (mode === 'ethane') {
        // V(θ) = 0.5 * 12.5 * (1 - cos 3θ)
        energy = 0.5 * 12.5 * (1 - Math.cos(3 * thRad));
        barrier = 12.5;
        const normAngle = ((thDeg % 120) + 120) % 120;
        if (normAngle <= 10 || normAngle >= 110) confName = 'Eclipsed (High Energy)';
        else if (normAngle >= 50 && normAngle <= 70) confName = 'Staggered (Energy Minimum)';
        else confName = 'Skew / Intermediate';
      } else {
        // Butane empirical curve
        // 0°: 19.0 (syn-periplanar)
        // 60°: 3.8 (gauche)
        // 120°: 16.0 (eclipsed / anticlinal)
        // 180°: 0.0 (anti / anti-periplanar)
        // Approximate Fourier series
        const rad1 = thRad;
        const v1 = 15.5;
        const v2 = -4.0;
        const v3 = 11.5;
        // Shifted to 0 at 180
        energy =
          4.7 * (1 + Math.cos(rad1)) +
          1.8 * (1 - Math.cos(2 * rad1)) +
          5.8 * (1 - Math.cos(3 * rad1));

        // Accurate anchor points
        const a = ((thDeg % 360) + 360) % 360;
        if ((a >= 350 || a <= 10)) { energy = 19.0; confName = 'Fully Eclipsed (Syn-periplanar)'; }
        else if (Math.abs(a - 60) <= 8 || Math.abs(a - 300) <= 8) { energy = 3.8; confName = 'Gauche (Local Minimum)'; }
        else if (Math.abs(a - 120) <= 8 || Math.abs(a - 240) <= 8) { energy = 16.0; confName = 'Eclipsed (Anticlinal)'; }
        else if (Math.abs(a - 180) <= 8) { energy = 0.0; confName = 'Anti (Global Minimum)'; }
        else if (a < 60 || a > 300) confName = 'Steric Skew';
        else if (a > 60 && a < 120) confName = 'Skew Transition';
        else confName = 'Intermediate Skew';
      }

      // Boltzmann fractions for butane: DeltaG = 3.8 kJ/mol = 3800 J/mol
      const RT = GAS_CONSTANT * T;
      const kBoltz = Math.exp(-3800 / RT);
      // Degeneracy: 2 gauche isomers vs 1 anti
      const gaucheRatio = 2 * kBoltz;
      const totalPop = 1 + gaucheRatio;
      const antiPct = ((1 / totalPop) * 100).toFixed(1);
      const gauchePct = ((gaucheRatio / totalPop) * 100).toFixed(1);

      return {
        formulas: [
          {
            name: 'Torsional Potential',
            formula: mode === 'ethane' ? 'V(θ) = ½ V₀ (1 − cos 3θ)' : 'V(θ) = V_torsional + V_steric(CH₃)',
            given: `θ = ${thDeg}°, Barrier = ${barrier} kJ/mol`,
            calc: `V(${thDeg}°)`,
            result: `${energy.toFixed(1)} kJ/mol`,
            unit: '',
          },
          {
            name: 'Conformer Population',
            formula: 'N_gauche / N_anti = 2 · exp(−ΔE / RT)',
            given: `T = ${T} K, ΔE = 3.8 kJ/mol`,
            calc: `2 × exp(−3800 / (${GAS_CONSTANT.toFixed(1)} × ${T}))`,
            result: `Anti: ${antiPct}%, Gauche: ${gauchePct}%`,
            unit: '',
          },
        ],
        readouts: [
          { label: 'Molecule', value: mode === 'ethane' ? 'Ethane' : 'n-Butane', tone: 'hi' },
          { label: 'Conformation', value: confName, tone: energy < 4 ? 'good' : energy > 14 ? 'warn' : 'neutral' },
          { label: 'Torsional Energy', value: `${energy.toFixed(1)} kJ/mol`, tone: energy === 0 ? 'good' : 'neutral' },
          { label: 'Dihedral Angle', value: `${thDeg}°`, tone: 'good' },
          { label: 'Temperature', value: `${T} K`, tone: 'neutral' },
        ],
        state: { mode, thDeg, energy, confName, antiPct, gauchePct, T },
        explain: {
          what: `Conformational analysis studies the temporary stereochemical arrangements of atoms resulting from rapid rotation around single carbon-carbon σ bonds.`,
          why: `Determines physical properties, thermodynamic stability, and stereospecific reactivity in biochemical enzymes, polymers, and synthetic organic reagents.`,
          param: `The dihedral angle θ defines the spatial angle between C-H or C-CH₃ bonds on adjacent carbon atoms viewed end-on in a Newman projection.`,
          effect: `In ethane, the staggered conformer is 12.5 kJ/mol lower in energy due to minimized bond electron repulsion and favorable hyperconjugation. In butane, bulky methyl groups experience steric hindrance, making the anti conformer (180°) the most stable.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      // Auto-revolve slightly or follow step
      let thDeg = c.state.thDeg;
      if (S.playing) {
        thDeg = (step === 0 ? 0 : step === 1 ? 60 : step === 2 ? 120 : 180) + Math.sin(t * 2) * 5;
      }
      const thRad = rad(thDeg);
      const mode = p.mode || 'ethane';

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Eclipsed conformer: maximum torsional & steric strain' : step === 1 ? 'Gauche conformer: partial steric relief (60°)' : step === 2 ? 'Eclipsed methyl-H barrier (120°)' : 'Anti conformer: staggered global minimum (180°)');

      D.text(g, `NEWMAN PROJECTION & CONFORMATIONAL ENERGY: ${mode.toUpperCase()}`, 30, 40, { color: '#38bdf8', size: 22, weight: 800 });
      D.text(g, `Conformer: ${c.state.confName} · Energy: ${c.state.energy.toFixed(1)} kJ/mol · Dihedral: ${thDeg}°`, 30, 68, { color: '#94a3b8', size: 14 });

      // Left: Newman Projection Interactive Drawing
      const cx = 250;
      const cy = 290;
      const rOuter = 85;

      // Outer ring representing rear carbon C-2 / C-3
      D.circle(g, cx, cy, rOuter, { fill: '#1e293b', stroke: '#94a3b8', width: 3 });

      // Rear bonds (radiate from circumference of outer circle)
      const rearBonds = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
      rearBonds.forEach((baseAngle, i) => {
        const curA = baseAngle + thRad - Math.PI / 2;
        const x1 = cx + rOuter * Math.cos(curA);
        const y1 = cy + rOuter * Math.sin(curA);
        const x2 = cx + (rOuter + 45) * Math.cos(curA);
        const y2 = cy + (rOuter + 45) * Math.sin(curA);

        D.line(g, x1, y1, x2, y2, { color: '#94a3b8', width: 4 });

        // Label: H or CH3
        let label = 'H';
        let col = '#e2e8f0';
        if (mode === 'butane' && i === 0) {
          label = 'CH₃';
          col = '#38bdf8';
        }
        D.text(g, label, x2 + Math.cos(curA) * 16, y2 + Math.sin(curA) * 16, { color: col, size: 15, weight: 800, align: 'center' });
      });

      // Front bonds (radiate from central vertex Y)
      const frontBonds = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
      frontBonds.forEach((baseAngle, i) => {
        const curA = baseAngle - Math.PI / 2;
        const x2 = cx + 80 * Math.cos(curA);
        const y2 = cy + 80 * Math.sin(curA);

        D.line(g, cx, cy, x2, y2, { color: '#f59e0b', width: 4.5 });

        let label = 'H';
        let col = '#e2e8f0';
        if (mode === 'butane' && i === 0) {
          label = 'CH₃';
          col = '#f59e0b';
        }
        D.text(g, label, x2 + Math.cos(curA) * 16, y2 + Math.sin(curA) * 16, { color: col, size: 15, weight: 800, align: 'center' });
      });

      // Front carbon center vertex
      D.circle(g, cx, cy, 7, { fill: '#f59e0b', stroke: '#ffffff', width: 2 });
      D.text(g, 'Front C (dot) / Rear C (circle)', cx, cy + 135, { color: '#cbd5e1', size: 13, align: 'center' });

      // Right: Live Potential Energy Graph V(θ)
      const gx = 520;
      const gy = 120;
      const gw = 430;
      const gh = 300;

      // Graph box
      g.save();
      g.fillStyle = '#1e293b55';
      g.strokeStyle = '#334155';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(gx, gy, gw, gh, 10);
      g.fill();
      g.stroke();

      // Axes
      D.line(g, gx + 45, gy + gh - 40, gx + gw - 20, gy + gh - 40, { color: '#64748b', width: 1.5 });
      D.line(g, gx + 45, gy + 30, gx + 45, gy + gh - 40, { color: '#64748b', width: 1.5 });

      D.text(g, 'Potential Energy (kJ/mol)', gx + 15, gy + 20, { color: '#94a3b8', size: 12 });
      D.text(g, 'Dihedral Angle θ (°)', gx + gw - 120, gy + gh - 15, { color: '#94a3b8', size: 12 });

      // X-ticks: 0, 60, 120, 180, 240, 300, 360
      const maxE = mode === 'ethane' ? 16 : 22;
      [0, 60, 120, 180, 240, 300, 360].forEach((ang) => {
        const x = gx + 45 + (ang / 360) * (gw - 70);
        D.line(g, x, gy + gh - 40, x, gy + gh - 35, { color: '#64748b', width: 1 });
        D.text(g, `${ang}°`, x, gy + gh - 22, { color: '#64748b', size: 11, align: 'center' });
      });

      // Plot curve
      g.beginPath();
      g.strokeStyle = '#38bdf8';
      g.lineWidth = 3;
      for (let a = 0; a <= 360; a += 3) {
        const aRad = rad(a);
        let eVal = 0;
        if (mode === 'ethane') {
          eVal = 0.5 * 12.5 * (1 - Math.cos(3 * aRad));
        } else {
          eVal =
            4.7 * (1 + Math.cos(aRad)) +
            1.8 * (1 - Math.cos(2 * aRad)) +
            5.8 * (1 - Math.cos(3 * aRad));
        }
        const px = gx + 45 + (a / 360) * (gw - 70);
        const py = gy + gh - 40 - (eVal / maxE) * (gh - 75);
        if (a === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();

      // Plot current operating point
      const curX = gx + 45 + (thDeg / 360) * (gw - 70);
      const curY = gy + gh - 40 - (c.state.energy / maxE) * (gh - 75);

      // Vertical guide line
      D.line(g, curX, gy + gh - 40, curX, curY, { color: '#facc15', width: 1.5, dash: [4, 4] });
      D.circle(g, curX, curY, 7, { fill: '#facc15', stroke: '#0f172a', width: 2.5 });
      D.tag(g, `${c.state.energy.toFixed(1)} kJ/mol`, curX + 10, curY - 14, { bg: '#facc15', color: '#0f172a', size: 12 });

      g.restore();
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 4. CHIRALITY, FISCHER PROJECTION & E/Z IDENTIFIER
  // ═════════════════════════════════════════════════════════════════
  S['chem-chirality-fischer'] = {
    live: true,
    approx: 'Standard Cahn-Ingold-Prelog (CIP) priority based on atomic numbers Z. Fischer vertical bonds point back, horizontal forward.',
    modes: [
      { key: 'chiral', label: 'Chiral Center (R / S)' },
      { key: 'geometric', label: 'Geometric Isomerism (E / Z)' },
    ],
    params: [
      {
        key: 'compound',
        label: 'Stereochemical Compound',
        type: 'select',
        default: 'lactic',
        options: [
          { value: 'lactic', label: 'Lactic Acid (CH₃−CH(OH)−COOH)' },
          { value: 'alanine', label: 'Alanine (CH₃−CH(NH₂)−COOH)' },
          { value: 'glyceraldehyde', label: 'Glyceraldehyde (CHO−CH(OH)−CH₂OH)' },
          { value: 'butene', label: '2-Butene (CH₃−CH=CH−CH₃)' },
          { value: 'dichloroethene', label: '1,2-Dichloroethene (Cl−CH=CH−Cl)' },
        ],
        help: 'Choose an organic compound to evaluate optical or geometric stereoisomerism.',
      },
      {
        key: 'isomericForm',
        label: 'Selected Isomer / Enantiomer',
        type: 'select',
        default: 'isomerA',
        options: [
          { value: 'isomerA', label: 'Isomer A (dextro / (R) / (Z))' },
          { value: 'isomerB', label: 'Isomer B (laevo / (S) / (E))' },
        ],
        help: 'Toggle between enantiomer pair or geometric cis/trans pair.',
      },
      {
        key: 'showMirror',
        label: 'Show Mirror Plane & Enantiomer',
        type: 'toggle',
        default: true,
        help: 'Display the non-superimposable mirror image.',
      },
      {
        key: 'polarimeterAngle',
        label: 'Observed Optical Rotation α',
        type: 'range',
        min: -60,
        max: 60,
        step: 0.5,
        default: 13.5,
        unit: '°',
        help: 'Polarimeter analyzer angle rotation for sample tube.',
      },
    ],
    examples: [
      { label: '(R)-(+)-Lactic Acid in Sour Milk (+13.5°)', values: { compound: 'lactic', isomericForm: 'isomerA', showMirror: true } },
      { label: '(S)-(−)-Lactic Acid in Muscle Tissue (−13.5°)', values: { compound: 'lactic', isomericForm: 'isomerB', showMirror: true } },
      { label: '(Z)-2-Butene (cis, dipole moment 0.33 D)', values: { compound: 'butene', isomericForm: 'isomerA' } },
      { label: '(E)-2-Butene (trans, nonpolar, 0 D)', values: { compound: 'butene', isomericForm: 'isomerB' } },
    ],
    validate(p) {
      return [];
    },
    steps(p, c) {
      const comp = p.compound || 'lactic';
      const isGeom = comp === 'butene' || comp === 'dichloroethene';
      if (isGeom) {
        return [
          { title: '1. Restricted Rotation about C=C', text: 'Side-by-side π-overlap locks rotation about the C=C double bond, creating distinct spatial diastereomers with differing physical boiling/melting points.' },
          { title: '2. Cahn-Ingold-Prelog (CIP) Priority', text: 'Assign priorities (1 > 2) to the two substituents on each sp² carbon based on atomic number Z.' },
          { title: '3. (E) vs (Z) Configuration', text: `If priority #1 groups lie on the same side: (Z) (zusammen). If on opposite sides: (E) (entgegen). Current: ${c.state.descriptor}.` },
          { title: '4. Physical Properties & Dipoles', text: `Cis/(Z) isomers typically exhibit dipole moments (μ > 0), whereas centrosymmetric trans/(E) isomers cancel bond dipoles (μ = 0).` },
        ];
      }
      return [
        { title: '1. Chiral Stereocenter Detection', text: 'An asymmetric carbon atom bonded to 4 distinct groups possesses no plane of symmetry (achiral) or center of inversion.' },
        { title: '2. CIP Priority Ranking (1 → 4)', text: `Priority order by atomic number Z: ${c.state.cipOrder}. The lowest priority group (#4, usually -H) is oriented away from the observer.` },
        { title: '3. (R) vs (S) Absolute Assignment', text: `Tracing from #1 → #2 → #3: Clockwise sequence designates (R) (Rectus); counter-clockwise designates (S) (Sinister). Assigned: ${c.state.descriptor}.` },
        { title: '4. Optical Activity & Polarimetry', text: `Enantiomers rotate plane-polarized light in equal and opposite directions: [α] = α / (l·c). Current observed rotation is ${c.state.alpha}° in polarimeter.` },
      ];
    },
    compute(p) {
      const comp = p.compound || 'lactic';
      const isGeom = comp === 'butene' || comp === 'dichloroethene';
      const formA = p.isomericForm !== 'isomerB';

      let descriptor = '';
      let cipOrder = '';
      let opticalActive = 'Yes (Optically Active)';
      let specificRot = '+13.5°';
      const alpha = Number(p.polarimeterAngle) || 13.5;

      if (comp === 'lactic') {
        cipOrder = '1: −OH (Z=8) > 2: −COOH (Z=6, 3 O-bonds) > 3: −CH₃ (Z=6, 3 H-bonds) > 4: −H (Z=1)';
        descriptor = formA ? '(R)-(+)-Lactic Acid' : '(S)-(−)-Lactic Acid';
        specificRot = formA ? '+13.5°' : '−13.5°';
      } else if (comp === 'alanine') {
        cipOrder = '1: −NH₂ (Z=7) > 2: −COOH (Z=6) > 3: −CH₃ (Z=6) > 4: −H (Z=1)';
        descriptor = formA ? '(R)-(+)-Alanine' : '(S)-(−)-Alanine';
        specificRot = formA ? '+8.5°' : '−8.5°';
      } else if (comp === 'glyceraldehyde') {
        cipOrder = '1: −OH (Z=8) > 2: −CHO (Z=6) > 3: −CH₂OH (Z=6) > 4: −H (Z=1)';
        descriptor = formA ? '(R)-(+)-Glyceraldehyde' : '(S)-(−)-Glyceraldehyde';
        specificRot = formA ? '+14.0°' : '−14.0°';
      } else if (comp === 'butene') {
        cipOrder = 'On each C: 1: −CH₃ (Z=6) > 2: −H (Z=1)';
        descriptor = formA ? '(Z)-2-Butene (cis)' : '(E)-2-Butene (trans)';
        opticalActive = 'No (Achiral Plane of Symmetry)';
        specificRot = '0.0° (Optically Inactive)';
      } else {
        cipOrder = 'On each C: 1: −Cl (Z=17) > 2: −H (Z=1)';
        descriptor = formA ? '(Z)-1,2-Dichloroethene' : '(E)-1,2-Dichloroethene';
        opticalActive = 'No (Achiral Plane of Symmetry)';
        specificRot = '0.0° (Optically Inactive)';
      }

      return {
        formulas: [
          {
            name: isGeom ? 'Geometric Stereodescriptor' : 'CIP Absolute Configuration',
            formula: isGeom ? 'Z (zusammen) / E (entgegen)' : 'R (Rectus / clockwise) / S (Sinister / counter)',
            given: `Substituents on ${comp}`,
            calc: cipOrder,
            result: descriptor,
            unit: '',
          },
          {
            name: 'Specific Optical Rotation',
            formula: '[α]_λ^T = α / (l · c)',
            given: `Path length l = 1 dm, conc c = 1 g/mL`,
            calc: `α_measured / (1 × 1)`,
            result: specificRot,
            unit: 'deg·dm⁻¹·(g/mL)⁻¹',
          },
        ],
        readouts: [
          { label: 'Compound', value: comp.toUpperCase(), tone: 'hi' },
          { label: 'Configuration', value: descriptor, tone: 'good' },
          { label: 'Optical Rotation', value: specificRot, tone: isGeom ? 'neutral' : 'good' },
          { label: 'Symmetry', value: isGeom ? 'Planar (Cs/C2h)' : 'Chiral C* (Asymmetric)', tone: 'neutral' },
        ],
        state: { comp, isGeom, formA, descriptor, cipOrder, opticalActive, specificRot, alpha },
        explain: {
          what: `Stereochemistry explores molecules that share identical chemical formulae and connectivity, yet differ in three-dimensional spatial orientation (enantiomers and diastereomers).`,
          why: `Biological receptors and drug targets are chiral; for example, one enantiomer of a pharmaceutical can be a life-saving therapeutic while the mirror-image enantiomer is inactive or toxic (thalidomide).`,
          param: `The CIP rules prioritize ligands by decreasing atomic number Z. For double bonds, priority groups on the same side form the (Z) stereoisomer.`,
          effect: `Enantiomers exhibit identical melting/boiling points and spectra in achiral environments, but rotate plane-polarized light in equal and opposite directions.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      const isGeom = c.state.isGeom;
      const formA = c.state.formA;
      const comp = c.state.comp;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Identify asymmetric stereocenter (C*) with 4 distinct ligands' : step === 1 ? 'Assign CIP priorities by atomic number (1 > 2 > 3 > 4)' : step === 2 ? 'Convert 3D wedge-dash to 2D planar Fischer projection' : 'Optical rotation [α] in polarimeter chamber');

      D.text(g, 'STEREOCHEMISTRY, CHIRALITY & FISCHER PROJECTION', 30, 40, { color: '#38bdf8', size: 22, weight: 800 });
      D.text(g, `Target: ${c.state.descriptor} · ${c.state.opticalActive}`, 30, 68, { color: '#94a3b8', size: 14 });

      const cx = 280;
      const cy = 290;

      if (isGeom) {
        // C=C double bond representation
        const c1x = cx - 55;
        const c2x = cx + 55;
        // Double bond
        D.line(g, c1x, cy - 6, c2x, cy - 6, { color: '#ffffff', width: 4 });
        D.line(g, c1x, cy + 6, c2x, cy + 6, { color: '#ffffff', width: 4 });

        D.circle(g, c1x, cy, 18, { fill: '#1e293b', stroke: '#38bdf8', width: 2.5 });
        D.text(g, 'C', c1x, cy + 5, { color: '#fff', size: 14, weight: 800, align: 'center' });
        D.circle(g, c2x, cy, 18, { fill: '#1e293b', stroke: '#38bdf8', width: 2.5 });
        D.text(g, 'C', c2x, cy + 5, { color: '#fff', size: 14, weight: 800, align: 'center' });

        const groupHigh = comp === 'dichloroethene' ? 'Cl' : 'CH₃';
        const colHigh = comp === 'dichloroethene' ? '#10b981' : '#f59e0b';

        // Left substituents
        D.line(g, c1x, cy, c1x - 70, cy - 65, { color: '#64748b', width: 3.5 });
        D.text(g, groupHigh, c1x - 85, cy - 70, { color: colHigh, size: 16, weight: 800, align: 'center' });

        D.line(g, c1x, cy, c1x - 70, cy + 65, { color: '#64748b', width: 3.5 });
        D.text(g, 'H', c1x - 85, cy + 70, { color: '#cbd5e1', size: 16, weight: 800, align: 'center' });

        // Right substituents (formA is Z: same side; formB is E: opposite side)
        const rTopGroup = formA ? groupHigh : 'H';
        const rTopCol = formA ? colHigh : '#cbd5e1';
        const rBotGroup = formA ? 'H' : groupHigh;
        const rBotCol = formA ? '#cbd5e1' : colHigh;

        D.line(g, c2x, cy, c2x + 70, cy - 65, { color: '#64748b', width: 3.5 });
        D.text(g, rTopGroup, c2x + 85, cy - 70, { color: rTopCol, size: 16, weight: 800, align: 'center' });

        D.line(g, c2x, cy, c2x + 70, cy + 65, { color: '#64748b', width: 3.5 });
        D.text(g, rBotGroup, c2x + 85, cy + 70, { color: rBotCol, size: 16, weight: 800, align: 'center' });

        D.text(g, formA ? 'Zusammen (Z): High priority on SAME side' : 'Entgegen (E): High priority on OPPOSITE sides', cx, cy + 140, { color: '#facc15', size: 14, weight: 700, align: 'center' });
      } else {
        // Chiral Center: 3D Wedge-Dash & 2D Fischer
        // Left sub-panel: 3D Wedge-and-Dash
        D.text(g, '3D WEDGE-DASH REPRESENTATION', cx, 130, { color: '#cbd5e1', size: 14, weight: 700, align: 'center' });

        D.circle(g, cx, cy, 20, { fill: '#1e293b', stroke: '#38bdf8', width: 3 });
        D.text(g, 'C*', cx, cy + 5, { color: '#38bdf8', size: 15, weight: 800, align: 'center' });

        // Top: COOH (in-plane solid line)
        D.line(g, cx, cy - 20, cx, cy - 90, { color: '#94a3b8', width: 3.5 });
        D.text(g, 'COOH (1)', cx, cy - 105, { color: '#f8fafc', size: 15, weight: 800, align: 'center' });

        // Bottom-left: CH3 (in-plane solid line)
        D.line(g, cx, cy + 20, cx - 70, cy + 85, { color: '#94a3b8', width: 3.5 });
        D.text(g, 'CH₃ (3)', cx - 80, cy + 105, { color: '#f8fafc', size: 15, weight: 800, align: 'center' });

        // Right wedge: OH (coming forward)
        g.save();
        g.fillStyle = '#10b981';
        g.beginPath();
        g.moveTo(cx + 15, cy - 5);
        g.lineTo(cx + 80, cy - 25);
        g.lineTo(cx + 85, cy + 15);
        g.closePath();
        g.fill();
        D.text(g, 'OH (1)', cx + 105, cy - 5, { color: '#10b981', size: 15, weight: 800 });
        g.restore();

        // Right-down dash: H (pointing away)
        g.save();
        g.strokeStyle = '#cbd5e1';
        g.lineWidth = 3;
        for (let i = 1; i <= 6; i++) {
          const fx = cx + i * 11;
          const fy = cy + i * 12;
          D.line(g, fx - 8, fy, fx + 8, fy, { color: '#cbd5e1', width: 2.5 });
        }
        D.text(g, 'H (4)', cx + 80, cy + 85, { color: '#cbd5e1', size: 15, weight: 800 });
        g.restore();

        // Right: 2D Fischer Projection Cross
        const fx = 720;
        const fy = cy;
        D.text(g, '2D FISCHER PROJECTION', fx, 130, { color: '#cbd5e1', size: 14, weight: 700, align: 'center' });

        // Fischer Cross
        D.line(g, fx, fy - 95, fx, fy + 95, { color: '#38bdf8', width: 4 }); // vertical (away)
        D.line(g, fx - 95, fy, fx + 95, fy, { color: '#10b981', width: 4 }); // horizontal (towards)

        D.circle(g, fx, fy, 7, { fill: '#38bdf8' });

        // Groups on cross
        D.text(g, 'COOH', fx, fy - 110, { color: '#f8fafc', size: 15, weight: 800, align: 'center' });
        D.text(g, 'CH₃', fx, fy + 120, { color: '#f8fafc', size: 15, weight: 800, align: 'center' });

        const leftGroup = formA ? 'H' : 'OH';
        const rightGroup = formA ? 'OH' : 'H';
        D.text(g, leftGroup, fx - 115, fy + 5, { color: leftGroup === 'OH' ? '#10b981' : '#cbd5e1', size: 16, weight: 800, align: 'center' });
        D.text(g, rightGroup, fx + 115, fy + 5, { color: rightGroup === 'OH' ? '#10b981' : '#cbd5e1', size: 16, weight: 800, align: 'center' });

        // Priority trace arc
        g.save();
        g.strokeStyle = '#facc15';
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(fx, fy, 55, -Math.PI / 2, formA ? Math.PI / 2 : (3 * Math.PI) / 2, !formA);
        g.stroke();
        D.tag(g, formA ? 'Clockwise → (R)' : 'Counter-Clockwise → (S)', fx, fy + 155, { bg: '#facc15', color: '#0f172a', size: 13 });
        g.restore();

        // Animated polarimeter beam passing through chiral medium
        g.save();
        const beamY = fy + 195;
        D.line(g, 100, beamY, 900, beamY, { color: '#334155', width: 2, dash: [4, 4] });
        for (let ph = 0; ph < 12; ph++) {
          const phX = 100 + ((ph * 70 + t * 140) % 800);
          const phAngle = (phX < 450) ? 0 : (formA ? 13.5 : -13.5) * (Math.PI / 180);
          g.beginPath();
          g.arc(phX, beamY, 3, 0, Math.PI * 2);
          g.fillStyle = '#38bdf8';
          g.fill();
          // Polarization vector
          g.beginPath();
          g.moveTo(phX - Math.sin(phAngle) * 12, beamY - Math.cos(phAngle) * 12);
          g.lineTo(phX + Math.sin(phAngle) * 12, beamY + Math.cos(phAngle) * 12);
          g.strokeStyle = '#facc15';
          g.lineWidth = 2;
          g.stroke();
        }
        D.text(g, 'Polarimeter Beam (Plane-Polarized Light Rotating Through Chiral Tube)', 500, beamY + 24, { color: '#94a3b8', size: 12, align: 'center' });
        g.restore();
      }
    },
  };

  // ═════════════════════════════════════════════════════════════════
  // 5. PH, PKA & HENDERSON-HASSELBALCH BUFFER EXPLORER
  // ═════════════════════════════════════════════════════════════════
  S['chem-ph-pka-buffer'] = {
    live: true,
    approx: 'Dilute solution assumption (activity coefficients γ ≈ 1). Kw = 1.0×10⁻¹⁴ at 25 °C.',
    params: [
      {
        key: 'system',
        label: 'Buffer Acid-Base Pair',
        type: 'select',
        default: 'acetic',
        options: [
          { value: 'acetic', label: 'Acetic Acid / Sodium Acetate (pKa = 4.76)' },
          { value: 'formic', label: 'Formic Acid / Sodium Formate (pKa = 3.75)' },
          { value: 'phosphate', label: 'Dihydrogen / Monohydrogen Phosphate (pKa = 7.20)' },
          { value: 'ammonia', label: 'Ammonium Chloride / Ammonia (pKa = 9.25)' },
          { value: 'carbonic', label: 'Carbonic Acid / Bicarbonate (pKa = 6.35)' },
        ],
        help: 'Select conjugate acid-base buffer system with characteristic pKa.',
      },
      {
        key: 'acidConc',
        label: 'Conjugate Acid Concentration [HA]',
        type: 'range',
        min: 0.01,
        max: 1.0,
        step: 0.01,
        default: 0.1,
        unit: 'M',
        help: 'Molarity of weak acid reservoir [HA].',
      },
      {
        key: 'saltConc',
        label: 'Conjugate Base Concentration [A⁻]',
        type: 'range',
        min: 0.01,
        max: 1.0,
        step: 0.01,
        default: 0.1,
        unit: 'M',
        help: 'Molarity of conjugate base salt [A⁻].',
      },
      {
        key: 'addedTitrant',
        label: 'Strong Acid / Base Added (ΔC)',
        type: 'range',
        min: -0.05,
        max: 0.05,
        step: 0.005,
        default: 0.0,
        unit: 'M',
        help: 'Negative adds strong acid HCl (−ΔC); positive adds strong base NaOH (+ΔC).',
      },
    ],
    examples: [
      { label: 'Equal Equimolar Buffer (pH = pKa = 4.76)', values: { system: 'acetic', acidConc: 0.1, saltConc: 0.1, addedTitrant: 0 } },
      { label: 'Acidic Buffer [HA] > [A⁻] (pH = 4.16)', values: { system: 'acetic', acidConc: 0.2, saltConc: 0.05, addedTitrant: 0 } },
      { label: 'Alkaline Buffer [A⁻] > [HA] (pH = 5.36)', values: { system: 'acetic', acidConc: 0.05, saltConc: 0.2, addedTitrant: 0 } },
      { label: 'Biological Phosphate Buffer pH ~7.40', values: { system: 'phosphate', acidConc: 0.063, saltConc: 0.1, addedTitrant: 0 } },
      { label: 'Acid Stress (0.04 M HCl Added)', values: { system: 'acetic', acidConc: 0.1, saltConc: 0.1, addedTitrant: -0.04 } },
    ],
    validate(p) {
      const warns = [];
      const delta = Number(p.addedTitrant) || 0;
      const ha = Number(p.acidConc) || 0.1;
      const a = Number(p.saltConc) || 0.1;
      if (delta > 0 && delta >= a) warns.push('Added strong base exceeds buffer conjugate acid capacity: buffer destroyed!');
      if (delta < 0 && Math.abs(delta) >= ha) warns.push('Added strong acid exceeds buffer conjugate base capacity: buffer destroyed!');
      return warns;
    },
    steps(p, c) {
      return [
        { title: '1. Weak Acid Dissociation Equilibrium', text: 'HA(aq) + H₂O(l) ⇌ H₃O⁺(aq) + A⁻(aq). The equilibrium constant Ka = [H₃O⁺][A⁻] / [HA].' },
        { title: '2. Henderson-Hasselbalch Formulation', text: 'Taking negative logarithms yields pH = pKa + log₁₀([A⁻]/[HA]). When [A⁻] = [HA], log(1) = 0 and pH = pKa.' },
        { title: '3. Buffer Action Against Perturbation', text: 'Added H⁺ is neutralized by conjugate base: A⁻ + H⁺ → HA. Added OH⁻ is neutralized by weak acid: HA + OH⁻ → A⁻ + H₂O.' },
        { title: '4. Buffer Capacity & Effective Working Range', text: `Maximum buffer capacity occurs at pH = pKa. Effective operating range is pKa ± 1 (pH ${c.state.pKa - 1} to ${c.state.pKa + 1}). Current pH = ${c.state.ph.toFixed(2)}.` },
      ];
    },
    compute(p) {
      const sys = p.system || 'acetic';
      const pKaTable = { acetic: 4.76, formic: 3.75, phosphate: 7.2, ammonia: 9.25, carbonic: 6.35 };
      const pKa = pKaTable[sys] || 4.76;

      let ha0 = Number(p.acidConc) || 0.1;
      let a0 = Number(p.saltConc) || 0.1;
      const delta = Number(p.addedTitrant) || 0; // >0 is base, <0 is acid

      // Effective after addition
      let ha = ha0 - delta;
      let a = a0 + delta;

      ha = Math.max(0.0001, ha);
      a = Math.max(0.0001, a);

      const ratio = a / ha;
      const ph = clamp(pKa + Math.log10(ratio), 0.5, 13.8);
      const hPlus = Math.pow(10, -ph);
      const ka = Math.pow(10, -pKa);

      // Buffer capacity beta = 2.303 * (C_tot * Ka * [H+] / (Ka + [H+])^2)
      const cTot = ha + a;
      const beta = 2.303 * (cTot * ka * hPlus) / Math.pow(ka + hPlus, 2);

      // Speciation fractions
      const alphaA = ka / (ka + hPlus);
      const alphaHA = 1 - alphaA;

      return {
        formulas: [
          {
            name: 'Henderson-Hasselbalch Equation',
            formula: 'pH = pK_a + log₁₀([A⁻] / [HA])',
            given: `pK_a = ${pKa}, [A⁻] = ${a.toFixed(3)} M, [HA] = ${ha.toFixed(3)} M`,
            calc: `${pKa} + log₁₀(${ratio.toFixed(3)}) = ${pKa} + (${Math.log10(ratio).toFixed(3)})`,
            result: ph.toFixed(2),
            unit: 'pH',
          },
          {
            name: 'Buffer Capacity (Van Slyke)',
            formula: 'β = dB / dpH = 2.303 · [C_tot · K_a · [H⁺] / (K_a + [H⁺])²]',
            given: `C_tot = ${cTot.toFixed(2)} M`,
            calc: `${beta.toFixed(3)}`,
            result: beta.toFixed(3),
            unit: 'mol/(L·pH)',
          },
          {
            name: 'Conjugate Base Fraction',
            formula: 'α_A⁻ = K_a / (K_a + [H⁺])',
            given: `[H⁺] = ${hPlus.toExponential(2)} M`,
            calc: `${(alphaA * 100).toFixed(1)}%`,
            result: `${(alphaA * 100).toFixed(1)}%`,
            unit: 'speciation',
          },
        ],
        readouts: [
          { label: 'Solution pH', value: ph.toFixed(2), tone: ph < 6 ? 'warn' : ph > 8 ? 'hi' : 'good' },
          { label: 'System pKa', value: pKa.toFixed(2), tone: 'neutral' },
          { label: 'Ratio [A⁻]/[HA]', value: ratio.toFixed(3), tone: 'good' },
          { label: 'Buffer Capacity β', value: `${beta.toFixed(3)} mol/L·pH`, tone: beta > 0.08 ? 'good' : 'warn' },
          { label: '[HA] : [A⁻] (%)', value: `${(alphaHA * 100).toFixed(0)}% : ${(alphaA * 100).toFixed(0)}%`, tone: 'neutral' },
        ],
        state: { sys, pKa, ha, a, ratio, ph, beta, alphaA, alphaHA },
        explain: {
          what: `A buffer solution resists changes in hydrogen ion concentration (pH) upon addition of small amounts of strong acid or base.`,
          why: `Crucial in biological fluids (blood maintains pH 7.35–7.45 via carbonic acid/bicarbonate buffer; deviation beyond 6.8–7.8 is fatal) and industrial bioprocesses.`,
          param: `The ratio [A⁻]/[HA] governs whether pH is lower or higher than pKa. When ratio is 1:1, pH exactly equals pKa.`,
          effect: `Buffer capacity β reaches its absolute maximum when pH = pKa. Adding acid consumes conjugate base; adding base consumes weak acid, stabilizing pH.`,
        },
      };
    },
    draw(g, S) {
      const { p, c, t } = S;
      const step = S.step || 0;
      D.clear(g, '#0f172a');

      const st = c.state;

      // Step HUD
      drawStepHUD(g, S, step === 0 ? 'Weak acid ionization equilibrium (HA ⇌ H⁺ + A⁻)' : step === 1 ? 'Common ion addition: sodium salt suppresses ionization' : step === 2 ? 'Buffer resistance: added H⁺ neutralized by conjugate base A⁻' : 'Buffer capacity & Henderson-Hasselbalch logarithmic plateau');

      D.text(g, 'pH, pKa & HENDERSON-HASSELBALCH BUFFER SYSTEM', 30, 40, { color: '#38bdf8', size: 22, weight: 800 });
      D.text(g, `System: ${st.sys.toUpperCase()} (pKa = ${st.pKa}) · pH = ${st.ph.toFixed(2)} · Ratio [A⁻]/[HA] = ${st.ratio.toFixed(2)}`, 30, 68, { color: '#94a3b8', size: 14 });

      // Left Panel: Laboratory Beaker & pH Meter Readout
      const bx = 160;
      const by = 280;

      // Color mapping based on pH (Universal Indicator spectrum)
      let beakerCol = '#10b981'; // neutral green
      if (st.ph < 3) beakerCol = '#ef4444'; // strong red
      else if (st.ph < 5) beakerCol = '#f97316'; // orange
      else if (st.ph < 6.5) beakerCol = '#eab308'; // yellow
      else if (st.ph < 8) beakerCol = '#22c55e'; // green
      else if (st.ph < 9.5) beakerCol = '#06b6d4'; // cyan
      else if (st.ph < 11.5) beakerCol = '#3b82f6'; // blue
      else beakerCol = '#a855f7'; // violet

      // Beaker outline
      g.save();
      g.strokeStyle = '#94a3b8';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(bx - 85, by - 120);
      g.lineTo(bx - 85, by + 100);
      g.arcTo(bx - 85, by + 120, bx - 65, by + 120, 20);
      g.lineTo(bx + 65, by + 120);
      g.arcTo(bx + 85, by + 120, bx + 85, by + 100, 20);
      g.lineTo(bx + 85, by - 120);
      g.stroke();

      // Liquid inside beaker
      g.fillStyle = beakerCol + '55';
      g.beginPath();
      g.roundRect(bx - 80, by - 40, 160, 155, [0, 0, 16, 16]);
      g.fill();

      // Digital pH meter probe dipped into beaker
      g.fillStyle = '#334155';
      g.fillRect(bx - 12, by - 140, 24, 180);
      D.circle(g, bx, by + 40, 9, { fill: '#38bdf8', stroke: '#ffffff', width: 2 });

      // Digital Readout Meter
      g.fillStyle = '#020617';
      g.strokeStyle = '#38bdf8';
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(bx - 75, by - 210, 150, 60, 8);
      g.fill();
      g.stroke();

      D.text(g, 'pH METER', bx, by - 192, { color: '#64748b', size: 10, weight: 800, align: 'center' });
      D.text(g, st.ph.toFixed(2), bx, by - 162, { color: '#38bdf8', size: 26, weight: 900, align: 'center' });

      // Speciation bars under beaker
      D.text(g, `[HA]: ${(st.alphaHA * 100).toFixed(0)}%  ·  [A⁻]: ${(st.alphaA * 100).toFixed(0)}%`, bx, by + 155, {
        color: '#f8fafc',
        size: 14,
        weight: 700,
        align: 'center',
      });
      g.restore();

      // Right Panel: Speciation & Buffer Curve Diagram
      const gx = 460;
      const gy = 120;
      const gw = 490;
      const gh = 320;

      g.save();
      g.fillStyle = '#1e293b44';
      g.strokeStyle = '#334155';
      g.lineWidth = 1.5;
      g.beginPath();
      g.roundRect(gx, gy, gw, gh, 10);
      g.fill();
      g.stroke();

      // Axes
      const x0 = gx + 45;
      const y0 = gy + gh - 45;
      D.line(g, x0, y0, gx + gw - 25, y0, { color: '#64748b', width: 1.5 });
      D.line(g, x0, gy + 35, x0, y0, { color: '#64748b', width: 1.5 });

      D.text(g, 'Mole Fraction α', gx + 15, gy + 25, { color: '#94a3b8', size: 12 });
      D.text(g, 'pH', gx + gw - 35, y0 + 5, { color: '#94a3b8', size: 12 });

      // pH axis markers: 2, 4, 6, 8, 10, 12, 14
      for (let pVal = 0; pVal <= 14; pVal += 2) {
        const xPos = x0 + (pVal / 14) * (gw - 70);
        D.line(g, xPos, y0, xPos, y0 + 5, { color: '#64748b', width: 1 });
        D.text(g, String(pVal), xPos, y0 + 20, { color: '#64748b', size: 11, align: 'center' });
      }

      // Plot alpha_HA (red) and alpha_A- (blue)
      const pKa = st.pKa;
      const ka = Math.pow(10, -pKa);

      // Curve: alpha_HA
      g.beginPath();
      g.strokeStyle = '#f87171';
      g.lineWidth = 2.5;
      for (let pVal = 0; pVal <= 14; pVal += 0.2) {
        const hVal = Math.pow(10, -pVal);
        const aHA = hVal / (hVal + ka);
        const px = x0 + (pVal / 14) * (gw - 70);
        const py = y0 - aHA * (gh - 80);
        if (pVal === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();

      // Curve: alpha_A-
      g.beginPath();
      g.strokeStyle = '#38bdf8';
      g.lineWidth = 2.5;
      for (let pVal = 0; pVal <= 14; pVal += 0.2) {
        const hVal = Math.pow(10, -pVal);
        const aA = ka / (hVal + ka);
        const px = x0 + (pVal / 14) * (gw - 70);
        const py = y0 - aA * (gh - 80);
        if (pVal === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();

      // Legend
      D.text(g, '— α(HA) Weak Acid', gx + 60, gy + 30, { color: '#f87171', size: 12, weight: 700 });
      D.text(g, '— α(A⁻) Conjugate Base', gx + 230, gy + 30, { color: '#38bdf8', size: 12, weight: 700 });

      // Buffer zone highlight [pKa-1, pKa+1]
      const bLeft = x0 + ((pKa - 1) / 14) * (gw - 70);
      const bRight = x0 + ((pKa + 1) / 14) * (gw - 70);
      g.fillStyle = '#facc1515';
      g.fillRect(bLeft, gy + 35, bRight - bLeft, gh - 80);
      D.text(g, 'Buffer Region (pKa ± 1)', (bLeft + bRight) / 2, gy + 55, { color: '#facc15', size: 11, align: 'center' });

      // Current pH cursor
      const curX = x0 + (st.ph / 14) * (gw - 70);
      D.line(g, curX, gy + 35, curX, y0, { color: '#facc15', width: 2, dash: [4, 4] });
      D.circle(g, curX, y0 - st.alphaA * (gh - 80), 6, { fill: '#38bdf8', stroke: '#fff', width: 2 });
      D.circle(g, curX, y0 - st.alphaHA * (gh - 80), 6, { fill: '#f87171', stroke: '#fff', width: 2 });
      D.tag(g, `pH ${st.ph.toFixed(2)}`, curX, gy + 75, { bg: '#facc15', color: '#0f172a', size: 12, align: 'center' });

      g.restore();
    },
  };
})();
