'use strict';

/* Engineering Physics — Unit 1: LASER (absorption, emission, inversion, pumping, cavity). */
(function () {
  const S = (window.EPSims = window.EPSims || {});
  const D = window.EPDraw;
  const { C, fmt, clamp } = D;

  // ─── Constants ───
  const HC = 1239.84;        // h·c in eV·nm
  const H = 6.626e-34;       // J·s
  const CL = 2.998e8;        // m/s
  const QE = 1.602e-19;      // C (J per eV)
  const KB = 1.381e-23;      // J/K
  const KB_EV = KB / QE;     // 8.62×10⁻⁵ eV/K
  const TOL = 0.02;          // absorption linewidth tolerance (simplification)

  const T = (g, s, x, y, o = {}) => D.text(g, s, x, y, Object.assign({ size: 17, weight: 700 }, o));
  const col = (nm) => D.wavelengthColor(nm);
  const band = (nm) => (nm < 380 ? 'ultraviolet' : nm > 700 ? 'infrared' : 'visible');
  const wlPx = (nm) => clamp(nm / 16, 22, 70);

  /** Deterministic pseudo-random generator (mulberry32) so every frame is repeatable. */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Schematic Bohr-style atom: nucleus + two orbits, electron on E₁ (f=0) … E₂ (f=1). */
  function bohr(g, x, y, R, f, o = {}) {
    const r1 = R * 0.48; const r2 = R;
    if (o.glow) D.circle(g, x, y, R + 14, { fill: C.amberSoft, alpha: 0.8 });
    D.circle(g, x, y, r2, { stroke: f > 0.5 ? C.red : C.line, width: 2, dash: [6, 5] });
    D.circle(g, x, y, r1, { stroke: f <= 0.5 ? C.blue : C.line, width: 2, dash: [6, 5] });
    D.atom(g, x, y, R * 0.2, C.violet);
    const r = r1 + (r2 - r1) * clamp(f, 0, 1); const a = (o.angle == null ? -0.9 : o.angle);
    D.circle(g, x + r * Math.cos(a), y + r * Math.sin(a), Math.max(5, R * 0.1), { fill: f > 0.5 ? C.red : C.blue, stroke: '#fff', width: 2 });
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Absorption and energy-level simulator
  // ─────────────────────────────────────────────────────────────
  const NATOMS = 8;
  S['ep-absorption'] = {
    approx: `Two-level atom model. A real absorption line has a finite width; here the photon is absorbed when its energy is within ±${TOL * 100} % of ΔE (a simplified linewidth). The atom and orbit drawings are schematic.`,
    modes: [{ key: 'single', label: 'Single atom' }, { key: 'many', label: 'Many atoms' }],
    params: [
      { key: 'dE', label: 'Energy gap ΔE = E₂ − E₁', type: 'range', min: 1.0, max: 3.5, step: 0.01, default: 1.96, unit: 'eV', help: 'Separation between the ground level E₁ and the excited level E₂.' },
      { key: 'lambda', label: 'Photon wavelength λ', type: 'range', min: 300, max: 1200, step: 0.1, default: 632.8, unit: 'nm', help: 'Wavelength of the incoming photon. Its energy is E = hc/λ.' },
      { key: 'nPh', label: 'Number of photons sent', type: 'range', min: 1, max: 12, step: 1, default: 6, showIf: (p) => p.mode === 'many' },
    ],
    examples: [
      { label: 'He-Ne line 632.8 nm on ΔE = 1.96 eV (absorbed)', values: { dE: 1.96, lambda: 632.8 } },
      { label: 'Ruby line 694.3 nm on ΔE = 1.79 eV (absorbed)', values: { dE: 1.79, lambda: 694.3 } },
      { label: 'Nd:YAG 1064 nm on ΔE = 1.96 eV (passes through)', values: { dE: 1.96, lambda: 1064 } },
      { label: 'Sodium D line 589 nm on ΔE = 2.10 eV (absorbed)', values: { dE: 2.10, lambda: 589 } },
    ],
    validate: () => [],
    compute(p) {
      const E = HC / p.lambda; const EJ = (H * CL) / (p.lambda * 1e-9); const nu = CL / (p.lambda * 1e-9);
      const lam0 = HC / p.dE; const mis = (E - p.dE) / p.dE; const match = Math.abs(mis) <= TOL;
      const many = p.mode === 'many'; const nPh = Math.round(p.nPh || 6);
      const absorbed = many ? (match ? Math.min(nPh, NATOMS) : 0) : (match ? 1 : 0);
      const passed = many ? nPh - absorbed : 1 - absorbed;
      const formulas = [
        { name: 'Photon energy', formula: 'E = hν = hc / λ', given: `λ = ${p.lambda} nm, h = 6.626 × 10⁻³⁴ J·s, c = 2.998 × 10⁸ m/s`,
          calc: `E = (6.626 × 10⁻³⁴ × 2.998 × 10⁸) / (${p.lambda} × 10⁻⁹) = ${fmt(EJ, 4)} J = ${fmt(EJ, 4)} / 1.602 × 10⁻¹⁹ eV`, result: fmt(E, 4), unit: 'eV' },
        { name: 'Photon frequency', formula: 'ν = c / λ', given: `λ = ${p.lambda} nm`, calc: `ν = 2.998 × 10⁸ / (${p.lambda} × 10⁻⁹)`, result: fmt(nu, 4), unit: 'Hz' },
        { name: 'Wavelength that the atom absorbs', formula: 'λ₀ = hc / ΔE = 1239.84 / ΔE[eV]', given: `ΔE = E₂ − E₁ = ${p.dE.toFixed(2)} eV`, calc: `λ₀ = 1239.84 / ${p.dE.toFixed(2)}`, result: fmt(lam0, 4), unit: 'nm' },
        { name: 'Resonance (match) check', formula: `|E − ΔE| / ΔE ≤ ${TOL * 100} %`, given: `E = ${fmt(E, 4)} eV, ΔE = ${p.dE.toFixed(2)} eV`,
          calc: `|${fmt(E, 4)} − ${p.dE.toFixed(2)}| / ${p.dE.toFixed(2)} = ${fmt(Math.abs(mis) * 100, 3)} %`, result: match ? 'Match → absorbed' : 'No match → passes through', unit: '—' },
      ];
      if (many) formulas.push({ name: 'Atoms excited', formula: 'N_abs = min(N_photons, N_ground) if matched, else 0', given: `N_photons = ${nPh}, N_ground = ${NATOMS}`, calc: match ? `min(${nPh}, ${NATOMS})` : 'no match → 0', result: String(absorbed), unit: 'atoms' });
      const readouts = [
        { label: 'Photon energy', value: `${fmt(E, 4)} eV`, tone: 'info' },
        { label: 'Gap ΔE', value: `${p.dE.toFixed(2)} eV` },
        { label: 'Mismatch', value: `${mis >= 0 ? '+' : '−'}${fmt(Math.abs(mis) * 100, 3)} %`, tone: match ? 'good' : 'warn' },
        many ? { label: 'Atoms excited', value: `${absorbed} / ${NATOMS}`, tone: absorbed ? 'good' : 'bad' } : { label: 'Absorbed', value: match ? 'YES' : 'NO', tone: match ? 'good' : 'bad' },
      ];
      return {
        formulas, readouts,
        state: { photonWavelength: `${p.lambda} nm (${band(p.lambda)})`, photonEnergy: `${fmt(E, 4)} eV`, gap: `${p.dE.toFixed(2)} eV`, resonantWavelength: `${fmt(lam0, 4)} nm`, mismatch: `${fmt(mis * 100, 3)} %`, absorbed: match ? 'YES' : 'NO', atomsExcited: absorbed, photonsTransmitted: passed, mode: many ? 'many atoms' : 'single atom' },
        explain: {
          what: match ? `A ${p.lambda} nm photon carries ${fmt(E, 4)} eV, which matches the gap ΔE = ${p.dE.toFixed(2)} eV. The photon disappears and the electron jumps from E₁ to E₂${many ? ` — ${absorbed} of ${NATOMS} atoms become excited` : ''}.` : `A ${p.lambda} nm photon carries ${fmt(E, 4)} eV, but the gap is ${p.dE.toFixed(2)} eV (mismatch ${fmt(mis * 100, 3)} %). The atom cannot take a part of a photon, so the photon passes through and the atom stays in E₁.`,
          why: 'Atomic energy is quantised: an electron can only be in E₁ or E₂. A photon is absorbed only if its whole energy hν equals E₂ − E₁ (within the line width).',
          param: 'Photon wavelength λ (sets E = hc/λ) and the energy gap ΔE of the atom.',
          effect: `Shorter λ means higher photon energy. Absorption happens only near λ₀ = hc/ΔE = ${fmt(lam0, 4)} nm; moving λ away from it stops absorption.`,
        },
      };
    },
    steps(p, c) {
      const m = c.state.absorbed === 'YES'; const many = p.mode === 'many';
      return [
        { title: many ? 'Atoms in the ground state' : 'Atom in the ground state', text: `The electron sits in the lower level E₁. The next level E₂ is ${p.dE.toFixed(2)} eV higher.` },
        { title: 'A photon arrives', text: `Photon λ = ${p.lambda} nm (${band(p.lambda)}), energy E = hc/λ = ${c.state.photonEnergy}.` },
        { title: 'Compare photon energy with ΔE', text: `E = ${c.state.photonEnergy} vs ΔE = ${c.state.gap}: mismatch ${c.state.mismatch}. ${m ? 'Within the line width → resonance.' : `Outside ±${TOL * 100} % → no resonance.`}` },
        { title: m ? 'Absorption: the electron jumps to E₂' : 'No absorption: the photon passes through', text: m ? 'The photon is destroyed and its energy lifts the electron from E₁ to E₂.' : 'The atom cannot absorb part of a photon, so it is transmitted unchanged.' },
        { title: 'Result', text: many ? `${c.state.atomsExcited} of ${NATOMS} atoms excited, ${c.state.photonsTransmitted} photon(s) transmitted.` : m ? 'The atom is now in the excited state E₂ (it will later return to E₁ by emission).' : `The atom stays in E₁. It would absorb only near λ₀ = ${c.state.resonantWavelength}.` },
      ];
    },
    draw(g, S2) {
      const { p, c, step, st, t, dur } = S2;
      const prog = clamp(st / dur, 0, 1); const ease = D.ease(prog);
      const match = c.state.absorbed === 'YES'; const E = HC / p.lambda; const pc = col(p.lambda); const wl = wlPx(p.lambda) * 0.5;
      D.clear(g, '#ffffff');
      D.rect(g, 20, 20, 590, 520, { fill: '#f8fafc', stroke: C.line, width: 1.5, r: 12 });
      T(g, p.mode === 'many' ? `${NATOMS} atoms (schematic)` : 'Atom (schematic)', 40, 48, { size: 19, weight: 800 });
      T(g, `Photon: λ = ${p.lambda} nm, E = ${fmt(E, 4)} eV`, 40, 80, { size: 17, color: C.muted });
      // energy level diagram
      const x1 = 700, x2 = 840, y1 = 480; const y2 = y1 - p.dE * 110;
      T(g, 'Energy levels', 640, 48, { size: 19, weight: 800 });
      const up = p.mode === 'many' ? (step >= 3 ? (match ? 1 : 0) : 0) : (step === 3 ? (match ? ease : 0) : step > 3 && match ? 1 : 0);
      D.level(g, x1, x2, y2, '', { color: C.red, width: 4 }); D.level(g, x1, x2, y1, '', { color: C.blue, width: 4 });
      T(g, 'E₂', x2 + 10, y2, { color: C.red, size: 19 }); T(g, 'E₁', x2 + 10, y1, { color: C.blue, size: 19 });
      D.arrow(g, 680, y1, 680, y2, { color: C.ink, width: 2 }); D.arrow(g, 680, y2, 680, y1, { color: C.ink, width: 2 });
      T(g, `ΔE = ${p.dE.toFixed(2)} eV`, 662, (y1 + y2) / 2, { size: 17, align: 'center', color: C.ink, halo: true, rotate: -Math.PI / 2 });
      D.circle(g, 740, y1 + (y2 - y1) * up, 9, { fill: up > 0.5 ? C.red : C.blue, stroke: '#fff', width: 2 });
      if (step >= 1) {
        const top = y1 - Math.min(E * 110, 400);
        D.line(g, 790, y1, 790, top, { color: pc, width: 5 }); D.arrow(g, 790, top + 20, 790, top, { color: pc, width: 5, head: 14 });
        T(g, `hν = ${fmt(E, 3)} eV`, 790, top - 20, { size: 17, color: C.ink, halo: true, align: 'center' });
        if (step === 2) D.focus(g, 660, Math.min(top, y2) - 10, 200, y1 - Math.min(top, y2) + 20, t);
      }
      if (step >= 2) D.tag(g, match ? 'E ≈ ΔE → resonance' : `E ${E > p.dE ? '>' : '<'} ΔE → no match`, 815, 520, { bg: match ? C.green : C.red, size: 18, align: 'center' });
      if (p.mode === 'many') return drawMany(g, p, c, step, prog, t, match, pc, wl);
      // single atom
      const ax = 400, ay = 300, R = 110;
      const excited = step === 3 ? (match ? ease : 0) : step > 3 && match ? 1 : 0;
      bohr(g, ax, ay, R, excited, { glow: step >= 4 && match });
      T(g, 'E₁ orbit', ax - 45, ay + 72, { size: 16, color: C.blue, align: 'center', halo: true });
      T(g, 'E₂ orbit', ax, ay + R + 22, { size: 16, color: C.red, align: 'center', halo: true });
      if (step === 0) D.focus(g, ax - R, ay - R, 2 * R, 2 * R, t);
      // photon path
      let px = null; let alpha = 1;
      if (step === 1) px = 70 + ease * 170;
      else if (step === 2) px = 240;
      else if (step === 3) { if (match) { px = 240 + ease * 110; alpha = 1 - ease; } else px = 240 + ease * 320; }
      else if (step >= 4 && !match) px = 560;
      if (px != null && alpha > 0.02) {
        D.photon(g, px, ay, 0, { color: pc, wavelength: wl, len: 90, amp: 9, width: 3.5, alpha, phase: t * 8 });
        T(g, `${p.lambda} nm`, px, ay - 32, { size: 17, color: C.ink, align: 'center', halo: true, weight: 800 });
      }
      if (step >= 3 && match) T(g, step === 3 ? 'photon absorbed…' : 'photon absorbed', ax, 170, { size: 18, align: 'center', color: C.green, halo: true });
      if (step >= 4) D.tag(g, match ? 'Atom excited (E₂)' : 'Transmitted — atom stays in E₁', 315, 490, { bg: match ? C.green : C.red, size: 20, align: 'center' });
      if (step >= 4) D.focus(g, match ? ax - R : 470, match ? ay - R : ay - 50, match ? 2 * R : 130, match ? 2 * R : 100, t);
    },
  };

  function drawMany(g, p, c, step, prog, t, match, pc, wl) {
    const n = Math.round(p.nPh || 6); const absorbed = c.state.atomsExcited;
    const pos = []; for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) pos.push([200 + k * 90, 220 + r * 150]);
    const ease = D.ease(prog);
    const k = step === 3 ? Math.round(ease * absorbed) : step > 3 ? absorbed : 0;
    pos.forEach(([x, y], i) => bohr(g, x, y, 36, i < k ? 1 : 0, { glow: i < k }));
    if (step === 0) D.focus(g, 155, 175, 360, 240, t);
    // photon queue
    for (let i = 0; i < n; i++) {
      const y = 140 + (i % 6) * 58; const lane = Math.floor(i / 6);
      let x = null; let a = 1;
      if (step === 1) x = -30 + ease * 140 - lane * 70;
      else if (step === 2) x = 110 - lane * 70;
      else if (step === 3) { if (i < absorbed) { x = 110 - lane * 70 + ease * 120; a = 1 - ease; } else x = 110 - lane * 70 + ease * (455 + lane * 70); }
      else if (step >= 4 && i >= absorbed) x = 565;
      if (x != null && a > 0.02 && x > 20) D.photon(g, x, y, 0, { color: pc, wavelength: wl, len: 54, amp: 7, width: 3, alpha: a, phase: t * 8 });
    }
    if (step >= 1) T(g, `${n} photons`, 40, 500, { size: 18, color: C.ink, weight: 800 });
    if (step >= 3) D.tag(g, `${absorbed} absorbed, ${n - absorbed} transmitted`, 400, 500, { bg: absorbed ? C.green : C.red, size: 18, align: 'center' });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Spontaneous emission
  // ─────────────────────────────────────────────────────────────
  S['ep-spontaneous-emission'] = {
    approx: 'N(t) = N₀e^(−t/τ) is the average (expected) number. The individual decay times, directions and phases in the picture come from a fixed-seed pseudo-random generator, so the sample count can differ slightly from the average. Atom drawings are schematic.',
    params: [
      { key: 'tau', label: 'Lifetime of the excited level τ', type: 'range', min: 1, max: 500, step: 0.5, default: 16, unit: 'ns', help: 'Average time an atom stays in E₂ before it emits by itself.' },
      { key: 'N0', label: 'Excited atoms at t = 0 (N₀)', type: 'range', min: 6, max: 30, step: 1, default: 24, unit: 'atoms' },
      { key: 'dE', label: 'Energy gap ΔE = E₂ − E₁', type: 'range', min: 1.0, max: 3.5, step: 0.005, default: 2.105, unit: 'eV' },
      { key: 'tObs', label: 'Observation time t (in units of τ)', type: 'range', min: 0.1, max: 5, step: 0.1, default: 1.5, unit: '× τ' },
    ],
    examples: [
      { label: 'Sodium D line: 589 nm, τ ≈ 16 ns', values: { dE: 2.105, tau: 16, N0: 24, tObs: 1.5 } },
      { label: 'Rubidium D2 line: 780 nm, τ ≈ 26 ns', values: { dE: 1.590, tau: 26, N0: 24, tObs: 2 } },
      { label: 'Caesium D2 line: 852 nm, τ ≈ 30.5 ns', values: { dE: 1.455, tau: 30.5, N0: 30, tObs: 3 } },
      { label: 'Half-life check: t = ln 2 · τ', values: { dE: 2.105, tau: 16, N0: 30, tObs: 0.7 } },
    ],
    validate: () => [],
    compute(p) {
      const lam = HC / p.dE; const tt = p.tObs * p.tau; const N = p.N0 * Math.exp(-p.tObs); const th = p.tau * Math.LN2;
      const A = 1 / (p.tau * 1e-9);
      const formulas = [
        { name: 'Decay law', formula: 'N(t) = N₀ e^(−t/τ)', given: `N₀ = ${p.N0}, τ = ${p.tau} ns, t = ${fmt(tt, 3)} ns`, calc: `N = ${p.N0} × e^(−${fmt(tt, 3)}/${p.tau}) = ${p.N0} × ${fmt(Math.exp(-p.tObs), 3)}`, result: fmt(N, 3), unit: 'atoms (average)' },
        { name: 'Photons emitted so far', formula: 'N₀ − N(t)', given: `N₀ = ${p.N0}`, calc: `${p.N0} − ${fmt(N, 3)}`, result: fmt(p.N0 - N, 3), unit: 'photons (average)' },
        { name: 'Half-life', formula: 't½ = τ ln 2', given: `τ = ${p.tau} ns`, calc: `t½ = ${p.tau} × 0.693`, result: fmt(th, 3), unit: 'ns' },
        { name: 'Einstein A coefficient', formula: 'A₂₁ = 1 / τ', given: `τ = ${p.tau} ns`, calc: `A₂₁ = 1 / (${p.tau} × 10⁻⁹ s)`, result: fmt(A, 3), unit: 's⁻¹' },
        { name: 'Emitted wavelength', formula: 'λ = hc / ΔE', given: `ΔE = ${p.dE} eV`, calc: `λ = 1239.84 / ${p.dE}`, result: fmt(lam, 4), unit: 'nm' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Still excited N(t)', value: `${fmt(N, 3)} of ${p.N0}`, tone: 'info' },
          { label: 'Half-life', value: `${fmt(th, 3)} ns` },
          { label: 'Emitted λ', value: `${fmt(lam, 4)} nm`, tone: 'warn' },
          { label: 'Coherence', value: 'Incoherent', tone: 'bad' },
        ],
        state: { lifetime: `${p.tau} ns`, halfLife: `${fmt(th, 3)} ns`, N0: p.N0, time: `${fmt(tt, 3)} ns`, remaining: fmt(N, 3), emitted: fmt(p.N0 - N, 3), wavelength: `${fmt(lam, 4)} nm (${band(lam)})`, A21: `${fmt(A, 3)} s⁻¹`, coherence: 'incoherent (random phase and direction)' },
        explain: {
          what: `${p.N0} atoms start in E₂. After t = ${fmt(tt, 3)} ns (${p.tObs} τ), on average ${fmt(N, 3)} are still excited and ${fmt(p.N0 - N, 3)} photons of ${fmt(lam, 4)} nm have been emitted in random directions.`,
          why: 'An excited state is unstable. Each atom has the same probability per unit time (A₂₁ = 1/τ) of decaying, independent of the others — so the number left falls exponentially and the photons have no fixed direction or phase.',
          param: 'Lifetime τ, number of excited atoms N₀, energy gap ΔE and the observation time.',
          effect: `A longer τ makes the decay slower (half-life ${fmt(th, 3)} ns now). A larger ΔE gives a shorter emitted wavelength. Nothing makes the photons coherent — that needs stimulated emission.`,
        },
      };
    },
    steps(p, c) {
      return [
        { title: 'Atoms are excited', text: `At t = 0 all ${p.N0} atoms are in the upper level E₂ (ΔE = ${p.dE} eV).` },
        { title: 'Each atom waits a random time', text: `Nothing triggers the decay. On average an atom stays excited for τ = ${p.tau} ns, but each one is different.` },
        { title: 'Atoms decay and emit photons', text: `Up to t = ${c.state.time}, atoms drop to E₁ and each emits one photon of λ = hc/ΔE = ${c.state.wavelength}.` },
        { title: 'Exponential decay law', text: `N(t) = N₀e^(−t/τ) → ${c.state.remaining} left on average. Half of the atoms decay in t½ = τ ln 2 = ${c.state.halfLife}.` },
        { title: 'Random direction and phase → incoherent light', text: 'Photons leave in all directions with unrelated phases, like light from a bulb or LED. This is not laser light.' },
      ];
    },
    draw(g, S2) {
      const { p, c, step, st, t, dur } = S2;
      const prog = clamp(st / dur, 0, 1);
      const lam = HC / p.dE; const pc = col(lam);
      D.clear(g, '#ffffff');
      const r = rng(20240917); const atoms = [];
      for (let i = 0; i < 30; i++) atoms.push({ td: -Math.log(1 - r() * 0.999999), ang: r() * Math.PI * 2, ph: r() * Math.PI * 2 });
      const N0 = Math.round(p.N0); const list = atoms.slice(0, N0);
      const s = step < 2 ? 0 : step === 2 ? prog * p.tObs : p.tObs;
      // atom panel
      D.rect(g, 20, 20, 500, 520, { fill: '#f8fafc', stroke: C.line, width: 1.5, r: 12 });
      T(g, 'Excited atoms (schematic)', 40, 48, { size: 19, weight: 800 });
      const cols = 6; const rows = Math.ceil(N0 / cols); const sx = 76; const sy = 72;
      const oy = 140 + (5 - rows) * sy * 0.5;
      let left = 0;
      list.forEach((a, i) => {
        const x = 80 + (i % cols) * sx; const y = oy + Math.floor(i / cols) * sy;
        const decayed = a.td < s;
        if (!decayed) left++;
        D.atom(g, x, y, 17, decayed ? '#94a3b8' : C.red);
        if (decayed) {
          const d = 22 + clamp((s - a.td) / 0.4, 0, 1) * 18;
          D.photon(g, x + Math.cos(a.ang) * d, y + Math.sin(a.ang) * d, a.ang, { color: pc, len: 30, amp: 5, wavelength: 11, width: 2.5, phase: a.ph });
        }
      });
      D.atom(g, 50, 505, 11, C.red); T(g, 'excited (E₂)', 68, 505, { size: 16 });
      D.atom(g, 200, 505, 11, '#94a3b8'); T(g, 'decayed (E₁)', 218, 505, { size: 16 });
      D.photon(g, 372, 505, 0, { color: pc, len: 30, amp: 5, wavelength: 11 }); T(g, `${fmt(lam, 4)} nm`, 394, 505, { size: 16 });
      if (step === 0) { D.tag(g, `N₀ = ${N0} excited atoms`, 270, 86, { bg: C.red, size: 18, align: 'center' }); D.focus(g, 50, oy - 25, 440, (rows - 1) * sy + 50, t); }
      if (step === 1) D.tag(g, `mean waiting time τ = ${p.tau} ns`, 270, 86, { bg: C.blue, size: 18, align: 'center' });
      if (step >= 2) D.tag(g, `t = ${fmt(s * p.tau, 3)} ns · still excited: ${left}`, 270, 86, { bg: C.ink, size: 18, align: 'center' });
      // decay chart
      const cx = 620, cy = 80, cw = 340, ch = 240;
      const pts = []; for (let i = 0; i <= 60; i++) { const x = (i / 60) * 5; pts.push([x, N0 * Math.exp(-x)]); }
      const sorted = list.map((a) => a.td).sort((a, b) => a - b); const stair = [[0, N0]];
      sorted.forEach((td, i) => { if (td <= s) { stair.push([td, N0 - i]); stair.push([td, N0 - i - 1]); } });
      stair.push([s, stair[stair.length - 1][1]]);
      const marks = [];
      if (step >= 3) marks.push({ x: Math.LN2, label: `t½ = ${fmt(p.tau * Math.LN2, 3)} ns`, color: C.violet });
      if (step >= 2) marks.push({ point: [s, N0 * Math.exp(-s)], label: s < 3.3 ? `N = ${fmt(N0 * Math.exp(-s), 3)}` : undefined, color: C.red });
      D.chart(g, cx, cy, cw, ch, { xmin: 0, xmax: 5, ymin: 0, ymax: N0, xticks: 5, yticks: 3, xfmt: (v) => fmt(v * p.tau, 3), yfmt: (v) => fmt(v, 2),
        xlabel: 'time t (ns)', ylabel: 'excited atoms N', ylabelOffset: 42,
        series: [{ points: pts, color: C.red, width: 3 }, ...(step >= 2 ? [{ points: stair, color: C.muted, width: 2, dash: [5, 4] }] : [])], marks });
      T(g, 'N(t) = N₀ e^(−t/τ)', cx + cw - 10, cy + 60, { size: 18, align: 'right', color: C.red, weight: 800, halo: true });
      if (step >= 2) T(g, '– – this sample', cx + cw - 10, cy + 88, { size: 16, align: 'right', color: C.muted, halo: true });
      T(g, 'Decay curve', cx, 44, { size: 19, weight: 800 });
      if (step === 3) D.focus(g, cx, cy, cw, ch, t);
      // incoherence
      if (step >= 4) {
        T(g, 'Three emitted photons: random phases', 560, 405, { size: 18, weight: 800 });
        [0, 1, 2].forEach((i) => {
          const a = atoms[i]; const y = 445 + i * 38;
          D.wave(g, 600, y, 960, y, { color: pc, amp: 11, wavelength: 60, phase: a.ph + t * 4, width: 3 });
          T(g, `#${i + 1}`, 560, y, { size: 16, color: C.muted });
        });
        D.line(g, 700, 425, 700, 540, { color: C.ink, width: 1.5, dash: [4, 4] });
        D.focus(g, 550, 385, 420, 160, t);
      }
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 3. Stimulated emission
  // ─────────────────────────────────────────────────────────────
  S['ep-stimulated-emission'] = {
    approx: 'Two-level atom; the incoming photon is assumed to be exactly resonant (hν = ΔE). The spontaneous/stimulated rate ratio uses Planck (black-body) radiation at temperature T. Atom drawings are schematic.',
    modes: [{ key: 'stim', label: 'Stimulated emission' }, { key: 'compare', label: 'Spontaneous vs stimulated' }],
    params: [
      { key: 'dE', label: 'Energy gap ΔE = E₂ − E₁ (= hν)', type: 'range', min: 1.0, max: 3.5, step: 0.005, default: 1.96, unit: 'eV' },
      { key: 'excited', label: 'Atom starts in excited state E₂', type: 'toggle', default: true },
      { key: 'T', label: 'Temperature of the surrounding radiation T', type: 'range', min: 300, max: 10000, step: 50, default: 300, unit: 'K', help: 'Used to compare stimulated with spontaneous emission in thermal (black-body) light.' },
    ],
    examples: [
      { label: 'He-Ne laser 632.8 nm (ΔE = 1.96 eV)', values: { dE: 1.96, excited: true, T: 300 } },
      { label: 'Ruby laser 694.3 nm (ΔE = 1.786 eV)', values: { dE: 1.786, excited: true, T: 300 } },
      { label: 'Nd:YAG 1064 nm (ΔE = 1.165 eV), Sun-like 5800 K light', values: { dE: 1.165, excited: true, T: 5800 } },
      { label: 'Atom in ground state → absorption', values: { dE: 1.96, excited: false, T: 300 } },
    ],
    validate: () => [],
    compute(p) {
      const lam = HC / p.dE; const nu = (p.dE * QE) / H; const x = (p.dE) / (KB_EV * p.T);
      const ratio = 1 / Math.expm1(Math.min(x, 700)); // stimulated / spontaneous
      const AB = (8 * Math.PI * H * nu ** 3) / CL ** 3;
      const ex = p.excited !== false;
      const formulas = [
        { name: 'Photon energy = gap', formula: 'hν = E₂ − E₁', given: `ΔE = ${p.dE} eV`, calc: `ν = ΔE / h = ${p.dE} × 1.602 × 10⁻¹⁹ / 6.626 × 10⁻³⁴`, result: fmt(nu, 4), unit: 'Hz' },
        { name: 'Wavelength of both photons', formula: 'λ = c / ν = hc / ΔE', given: `ΔE = ${p.dE} eV`, calc: `λ = 1239.84 / ${p.dE}`, result: fmt(lam, 4), unit: 'nm' },
        { name: 'Stimulated emission rate', formula: 'R_stim = B₂₁ ρ(ν) N₂', given: `atom ${ex ? 'excited (N₂ ≠ 0)' : 'in ground state (N₂ = 0)'}`, calc: ex ? 'rate ∝ radiation density ρ(ν) × N₂' : 'N₂ = 0 → R_stim = 0; instead absorption R = B₁₂ ρ(ν) N₁', result: ex ? 'emission' : 'absorption', unit: '—' },
        { name: 'Einstein A / B relation', formula: 'A₂₁ / B₂₁ = 8πhν³ / c³', given: `ν = ${fmt(nu, 4)} Hz`, calc: `8π × 6.626 × 10⁻³⁴ × (${fmt(nu, 4)})³ / (2.998 × 10⁸)³`, result: fmt(AB, 3), unit: 'J·s·m⁻³' },
        { name: 'Stimulated / spontaneous (thermal light)', formula: 'R_stim / R_sp = 1 / (e^(hν/k_BT) − 1)', given: `hν = ${p.dE} eV, k_BT = ${fmt(KB_EV * p.T, 3)} eV`, calc: `hν / k_BT = ${fmt(x, 4)}`, result: fmt(ratio, 3), unit: '—' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Photon λ', value: `${fmt(lam, 4)} nm`, tone: 'info' },
          { label: 'Atom', value: ex ? 'Excited (E₂)' : 'Ground (E₁)' },
          { label: 'Photons out', value: ex ? '2 (coherent)' : '0 (absorbed)', tone: ex ? 'good' : 'bad' },
          { label: 'R_stim / R_sp', value: fmt(ratio, 3), tone: ratio < 1 ? 'warn' : 'good' },
        ],
        state: { gap: `${p.dE} eV`, wavelength: `${fmt(lam, 4)} nm (${band(lam)})`, frequency: `${fmt(nu, 4)} Hz`, atomExcited: ex, photonsOut: ex ? 2 : 0, process: ex ? 'stimulated emission' : 'absorption', stimToSpontRatio: fmt(ratio, 3), temperature: `${p.T} K`, A21overB21: `${fmt(AB, 3)} J·s·m⁻³` },
        explain: {
          what: ex ? `A ${fmt(lam, 4)} nm photon (hν = ${p.dE} eV) passes an excited atom. The atom drops to E₁ and releases a second photon that is an exact copy: same frequency, direction, phase and polarisation.` : `The atom is in the ground state, so the ${fmt(lam, 4)} nm photon is absorbed instead and the atom is lifted to E₂. No photon comes out.`,
          why: 'The field of the incoming photon drives the excited atom at exactly its resonance frequency; the emitted wave adds in step with the driving wave. The rate is B₂₁ρ(ν)N₂ — proportional to the light already present.',
          param: 'Energy gap ΔE (photon energy), whether the atom is excited, and the temperature T of thermal light.',
          effect: `In thermal light at ${p.T} K stimulated emission is only ${fmt(ratio, 3)} × spontaneous emission for this line, which is why a laser needs population inversion and a cavity that builds up a strong field.`,
        },
      };
    },
    steps(p, c) {
      const ex = c.state.atomExcited;
      return [
        { title: ex ? 'Atom in the excited state E₂' : 'Atom in the ground state E₁', text: `The gap is ΔE = ${p.dE} eV.` },
        { title: 'A resonant photon arrives', text: `Its energy hν = ${p.dE} eV equals the gap (λ = ${c.state.wavelength}).` },
        { title: ex ? 'The photon triggers the transition E₂ → E₁' : 'The photon is absorbed (E₁ → E₂)', text: ex ? 'The incoming photon is NOT absorbed; its field stimulates the atom to fall to E₁.' : 'With no excited atom there is nothing to stimulate, so absorption happens.' },
        { title: ex ? 'Two identical photons leave' : 'No photon leaves', text: ex ? 'Same energy, frequency, direction, phase and polarisation — the two waves are coherent.' : 'The atom is now excited; a second photon could now stimulate it.' },
        { title: 'Chain reaction → light amplification', text: `Each new photon can stimulate another excited atom: 1 → 2 → 4 → 8… In thermal light at ${p.T} K, R_stim/R_sp is only ${c.state.stimToSpontRatio}, so lasers need inversion.` },
      ];
    },
    draw(g, S2) {
      const { p, c, step, st, t, dur } = S2;
      const prog = clamp(st / dur, 0, 1); const ease = D.ease(prog);
      const lam = HC / p.dE; const pc = col(lam); const wl = wlPx(lam); const ex = c.state.atomExcited;
      D.clear(g, '#ffffff');
      if (p.mode === 'compare') return drawCompare(g, p, step, prog, t, lam, pc, wl);
      T(g, ex ? 'Stimulated emission' : 'Atom not excited → absorption', 30, 40, { size: 22, weight: 800 });
      T(g, `hν = ${p.dE} eV, λ = ${fmt(lam, 4)} nm`, 30, 72, { size: 17, color: C.muted });
      stimScene(g, 330, 250, step, ease, t, ex, pc, wl, true);
      if (step >= 4) {
        T(g, ex ? 'Amplification: each photon stimulates another excited atom' : 'Absorption removes photons — no amplification', 30, 440, { size: 18, weight: 800 });
        if (ex) {
          [1, 2, 4, 8].forEach((n, i) => {
            const x = 130 + i * 220;
            const rows = Math.min(n, 4); const cols = Math.ceil(n / 4);
            for (let k = 0; k < n; k++) D.photon(g, x + Math.floor(k / 4) * 50 - (cols - 1) * 25, 490 + ((k % 4) - (rows - 1) / 2) * 13, 0, { color: pc, len: 44, amp: 4, wavelength: 14, width: 2.5, phase: t * 6 });
            T(g, `${n}`, x - 68, 490, { size: 20, weight: 800, align: 'center' });
            if (i < 3) D.arrow(g, x + 60, 490, x + 135, 490, { color: C.muted, width: 2.5 });
          });
          D.focus(g, 25, 420, 950, 110, t);
        }
      }
    },
  };

  /** Two-level atom box with incoming photon and outgoing photons. (x0,y0)=atom centre. */
  function stimScene(g, x0, y0, step, ease, t, ex, pc, wl, big) {
    const bw = big ? 170 : 130; const bh = big ? 190 : 130; const bx = x0 - bw / 2; const by = y0 - bh / 2;
    const yE2 = by + 40; const yE1 = by + bh - 30;
    D.rect(g, bx, by, bw, bh, { fill: '#f8fafc', stroke: C.line, width: 2, r: 12 });
    D.level(g, bx + 30, bx + bw - 20, yE2, '', { color: C.red, width: 4 }); D.level(g, bx + 30, bx + bw - 20, yE1, '', { color: C.blue, width: 4 });
    T(g, 'E₂', bx + 8, yE2, { color: C.red, size: 18 }); T(g, 'E₁', bx + 8, yE1, { color: C.blue, size: 18 });
    // electron position 0 (E1) .. 1 (E2)
    let f = ex ? 1 : 0;
    if (step === 2) f = ex ? 1 - ease : ease; else if (step > 2) f = ex ? 0 : 1;
    const ey = yE1 + (yE2 - yE1) * f; D.circle(g, x0 + 10, ey, 10, { fill: f > 0.5 ? C.red : C.blue, stroke: '#fff', width: 2 });
    if (step === 2) D.arrow(g, x0 + 40, ex ? yE2 + 6 : yE1 - 6, x0 + 40, ex ? yE1 - 6 : yE2 + 6, { color: C.ink, width: 3 });
    if (step === 0) D.focus(g, bx, by, bw, bh, t);
    // incoming photon
    const inStart = 40; const inEnd = bx - 20; const len = Math.min(180, inEnd - inStart);
    if (step >= 1 && step <= 2) {
      let hx = step === 1 ? inStart + len + ease * (inEnd - inStart - len) : inEnd;
      if (step === 2 && !ex) hx = inEnd + ease * 40;
      const alpha = step === 2 && !ex ? 1 - ease : 1;
      D.wave(g, Math.max(inStart, hx - len), y0, hx, y0, { color: pc, amp: 12, wavelength: wl, phase: t * 6, width: 3.5, arrow: true, alpha });
      T(g, 'incident photon hν', Math.max(inStart, hx - len), y0 - 34, { size: 17, color: C.ink, halo: true });
    }
    if (step >= 3 && ex) {
      D.arrow(g, inStart, y0 - 30, bx - 12, y0 - 30, { color: C.faint, width: 2, dash: [6, 6] });
      T(g, "incident photon's path", inStart, y0 - 52, { size: 16, color: C.muted });
    }
    // outgoing
    if (step >= 3 && ex) {
      const ox = bx + bw + 20; const oxe = 960; const f2 = step === 3 ? ease : 1;
      const xe = ox + (oxe - ox) * f2; const ph = t * 6;
      D.wave(g, ox, y0 - 30, xe, y0 - 30, { color: pc, amp: 12, wavelength: wl, phase: ph, width: 3.5, arrow: true });
      D.wave(g, ox, y0 + 30, xe, y0 + 30, { color: pc, amp: 12, wavelength: wl, phase: ph, width: 3.5, arrow: true });
      if (f2 > 0.5) {
        // aligned crests: sin(2πs/wl − ph) = 1 → s = wl(ph/2π + 1/4)
        const k0 = (ph / (2 * Math.PI) + 0.25) * wl; const first = ox + (((k0 % wl) + wl) % wl);
        for (let x = first; x < xe - 10; x += wl) D.line(g, x, y0 - 50, x, y0 + 50, { color: C.muted, width: 1.5, dash: [4, 4] });
        T(g, 'incident photon', ox + 4, y0 - 64, { size: 17, halo: true });
        T(g, 'stimulated photon (copy)', ox + 4, y0 + 66, { size: 17, halo: true });
        if (big) D.tag(g, 'same λ, phase, direction, polarisation', (ox + xe) / 2 + 60, y0 - 110, { bg: C.green, size: 17, align: 'center' });
        else T(g, 'in phase', xe - 10, y0 - 64, { size: 17, color: C.green, align: 'right', halo: true });
      }
      if (step === 3) D.focus(g, ox - 4, y0 - 50, xe - ox + 8, 100, t);
    }
    if (step >= 3 && !ex) T(g, 'photon absorbed → atom now in E₂', x0, by + bh + 26, { size: 18, color: C.blue, align: 'center', halo: true });
  }

  function drawCompare(g, p, step, prog, t, lam, pc, wl) {
    const ease = D.ease(prog);
    D.rect(g, 20, 20, 960, 250, { fill: '#fff7ed', stroke: C.line, width: 1.5, r: 12 });
    D.rect(g, 20, 285, 960, 255, { fill: '#f0fdf4', stroke: C.line, width: 1.5, r: 12 });
    T(g, 'Spontaneous emission — no trigger', 40, 46, { size: 19, weight: 800, color: C.orange });
    T(g, 'Stimulated emission — triggered by a photon', 40, 311, { size: 19, weight: 800, color: C.green });
    // spontaneous: atom decays at step>=2, photon leaves at a random angle
    const ax = 230, ay = 160; const f = step < 2 ? 1 : step === 2 ? 1 - ease : 0;
    D.rect(g, ax - 60, ay - 70, 120, 140, { fill: '#fff', stroke: C.line, width: 2, r: 10 });
    D.level(g, ax - 30, ax + 45, ay - 40, '', { color: C.red, width: 4 }); D.level(g, ax - 30, ax + 45, ay + 45, '', { color: C.blue, width: 4 });
    T(g, 'E₂', ax - 52, ay - 40, { size: 17, color: C.red }); T(g, 'E₁', ax - 52, ay + 45, { size: 17, color: C.blue });
    D.circle(g, ax + 8, ay + 45 - 85 * f, 9, { fill: f > 0.5 ? C.red : C.blue, stroke: '#fff', width: 2 });
    if (step >= 2) {
      const ang = -0.35; const d = step === 2 ? ease : 1; const x1 = ax + 70; const y1 = ay - 10;
      const x2 = x1 + Math.cos(ang) * 260 * d; const y2 = y1 + Math.sin(ang) * 260 * d;
      if (d > 0.05) D.wave(g, x1, y1, x2, y2, { color: pc, amp: 10, wavelength: wl, phase: 1.7 + t * 6, width: 3, arrow: true });
      if (d > 0.05) D.wave(g, x1 + 20, y1 + 50, x1 + 20 + 200 * d, y1 + 50 + 50 * d, { color: pc, amp: 10, wavelength: wl, phase: 4.1 + t * 6, width: 3, arrow: true, alpha: 0.35 });
      T(g, 'random direction, random phase', 770, 110, { size: 17, color: C.orange, align: 'center', halo: true });
      T(g, '(faint: photon from another atom)', 770, 138, { size: 16, color: C.muted, align: 'center', halo: true });
    }
    stimScene(g, 300, 420, step, ease, t, p.excited !== false, pc, wl, false);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Population inversion
  // ─────────────────────────────────────────────────────────────
  const NDOT = 40;
  /** Rounds a positive number up to 1, 2, 3 or 5 × 10ᵏ and suggests a tick count. */
  function niceMax(v) {
    const e = Math.pow(10, Math.floor(Math.log10(v))); const m = v / e;
    const [k, ticks] = m <= 1 ? [1, 4] : m <= 2 ? [2, 4] : m <= 3 ? [3, 3] : m <= 5 ? [5, 5] : [10, 4];
    return { v: k * e, ticks };
  }
  S['ep-population-inversion'] = {
    approx: 'Two-level system with equal degeneracies (g₁ = g₂). The dots show 40 representative atoms, rounded; the true Boltzmann ratio is given in the readouts. In Pumped mode the upper-level fraction is set directly (a simplified model of the pump).',
    modes: [{ key: 'thermal', label: 'Thermal equilibrium' }, { key: 'pumped', label: 'Pumped (inverted)' }],
    params: [
      { key: 'dE', label: 'Energy gap ΔE = E₂ − E₁', type: 'range', min: 0.01, max: 3.5, step: 0.01, default: 1.96, unit: 'eV' },
      { key: 'T', label: 'Temperature T', type: 'range', min: 100, max: 6000, step: 10, default: 300, unit: 'K' },
      { key: 'pump', label: 'Fraction of atoms pumped to E₂', type: 'range', min: 0, max: 95, step: 1, default: 65, unit: '%', showIf: (p) => p.mode === 'pumped' },
    ],
    examples: [
      { label: 'He-Ne line (1.96 eV) at room temperature', values: { dE: 1.96, T: 300 } },
      { label: 'Visible line in a 6000 K furnace (still no inversion)', values: { dE: 1.96, T: 6000 } },
      { label: 'Small gap 0.03 eV at 300 K (≈ k_BT)', values: { dE: 0.03, T: 300 } },
      { label: 'Pumped ruby: 70 % of atoms in the upper level', values: { dE: 1.79, T: 300, pump: 70 } },
    ],
    validate: () => [],
    compute(p) {
      const kT = KB_EV * p.T; const x = p.dE / kT; const r = Math.exp(-x); const pumped = p.mode === 'pumped';
      const f2 = pumped ? p.pump / 100 : r / (1 + r); const ratio = pumped ? f2 / Math.max(1e-9, 1 - f2) : r;
      const inv = ratio > 1;
      const T10 = p.dE / (KB_EV * Math.LN10);
      const lnr = Math.log(Math.max(ratio, 1e-300));
      const Teff = Math.abs(lnr) < 1e-9 ? null : -p.dE / (KB_EV * lnr);
      const formulas = [
        { name: 'Thermal energy', formula: 'k_BT', given: `T = ${p.T} K, k_B = 1.381 × 10⁻²³ J/K = 8.617 × 10⁻⁵ eV/K`, calc: `k_BT = 8.617 × 10⁻⁵ × ${p.T}`, result: fmt(kT, 3), unit: 'eV' },
        { name: 'Boltzmann ratio (equilibrium)', formula: 'N₂ / N₁ = e^(−ΔE / k_BT)', given: `ΔE = ${p.dE} eV, k_BT = ${fmt(kT, 3)} eV`, calc: `e^(−${p.dE} / ${fmt(kT, 3)}) = e^(−${fmt(x, 4)})`, result: fmt(r, 3), unit: '—' },
        { name: 'Temperature for N₂/N₁ = 0.1', formula: 'T = ΔE / (k_B ln 10)', given: `ΔE = ${p.dE} eV`, calc: `T = ${p.dE} / (8.617 × 10⁻⁵ × 2.303)`, result: fmt(T10, 3), unit: 'K' },
      ];
      if (pumped) {
        formulas.push({ name: 'Pumped populations', formula: 'N₂/N₁ = f / (1 − f)', given: `f = ${p.pump} %`, calc: `${fmt(f2, 3)} / ${fmt(1 - f2, 3)}`, result: fmt(ratio, 3), unit: '—' });
        formulas.push({ name: 'Equivalent (spin) temperature', formula: 'T_eff = −ΔE / (k_B ln(N₂/N₁))', given: `N₂/N₁ = ${fmt(ratio, 3)}`, calc: Teff == null ? 'ln(1) = 0 → T_eff → ±∞' : `T_eff = −${p.dE} / (8.617 × 10⁻⁵ × ${fmt(lnr, 3)})`, result: Teff == null ? '±∞' : fmt(Teff, 3), unit: 'K' });
      }
      formulas.push({ name: 'Inversion test', formula: 'Population inversion ⇔ N₂ > N₁', given: `N₂/N₁ = ${fmt(ratio, 3)}`, calc: `${fmt(ratio, 3)} ${inv ? '>' : '≤'} 1`, result: inv ? 'YES' : 'NO', unit: '—' });
      return {
        formulas,
        readouts: [
          { label: 'k_BT', value: `${fmt(kT, 3)} eV`, tone: 'info' },
          { label: 'N₂ / N₁', value: fmt(ratio, 3) },
          { label: 'Upper level share', value: `${fmt(f2 * 100, 3)} %` },
          { label: 'Population inversion', value: inv ? 'YES' : 'NO', tone: inv ? 'good' : 'bad' },
        ],
        state: { mode: pumped ? 'pumped' : 'thermal equilibrium', gap: `${p.dE} eV`, temperature: `${p.T} K`, kT: `${fmt(kT, 3)} eV`, boltzmannRatio: fmt(r, 3), ratio: fmt(ratio, 3), upperFraction: `${fmt(f2 * 100, 3)} %`, inversion: inv ? 'YES' : 'NO', effectiveTemperature: pumped ? (Teff == null ? '±∞' : `${fmt(Teff, 3)} K`) : `${p.T} K` },
        explain: {
          what: pumped ? `The pump keeps ${p.pump} % of the atoms in E₂, so N₂/N₁ = ${fmt(ratio, 3)}. ${inv ? 'More atoms are in the upper level than in the lower one — population inversion.' : 'Still fewer atoms up than down — no inversion yet.'}` : `At ${p.T} K, k_BT = ${fmt(kT, 3)} eV while ΔE = ${p.dE} eV. The Boltzmann factor gives N₂/N₁ = ${fmt(r, 3)} — ${r < 1e-3 ? 'practically every atom is in the ground state.' : 'the upper level is less populated than the lower one.'}`,
          why: 'In thermal equilibrium the population of a level falls as e^(−E/k_BT). Since ΔE > 0, N₂/N₁ < 1 at every positive temperature; even T → ∞ only gives N₂ = N₁. Inversion is a non-equilibrium state that has to be created by pumping into a long-lived (metastable) level.',
          param: pumped ? 'Pump fraction (share of atoms kept in E₂) and the gap ΔE.' : 'Energy gap ΔE and temperature T.',
          effect: pumped ? `Above 50 % in E₂ the ratio exceeds 1 and light is amplified (formally this is a negative temperature, T_eff = ${Teff == null ? '±∞' : fmt(Teff, 3) + ' K'}).` : `Raising T increases N₂/N₁ towards 1 but never above it. To get N₂/N₁ = 0.1 you would already need T ≈ ${fmt(T10, 3)} K.`,
        },
      };
    },
    steps(p, c) {
      const pumped = p.mode === 'pumped';
      return [
        { title: 'Two levels and their populations', text: `Lower level E₁ and upper level E₂, ${p.dE} eV apart. Dots show how 40 atoms are shared in thermal equilibrium.` },
        { title: 'Thermal energy k_BT', text: `At T = ${p.T} K, k_BT = ${c.state.kT} — compare with ΔE = ${c.state.gap}.` },
        { title: 'Boltzmann distribution', text: `N₂/N₁ = e^(−ΔE/k_BT) = ${c.state.boltzmannRatio}. The upper level is almost empty for visible transitions.` },
        { title: 'Heating cannot invert the populations', text: 'The graph shows N₂/N₁ against T: it rises towards 1 but never crosses it.' },
        { title: pumped ? 'Pumping creates inversion' : 'Inversion needs pumping', text: pumped ? `The pump holds ${c.state.upperFraction} of the atoms in E₂: N₂/N₁ = ${c.state.ratio}. Population inversion: ${c.state.inversion}.` : 'Switch to Pumped mode: energy must be supplied (optically, electrically…) into a metastable level to make N₂ > N₁.' },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2;
      const prog = clamp(st / dur, 0, 1);
      const pumped = p.mode === 'pumped' && step >= 4;
      D.clear(g, '#ffffff');
      const kT = KB_EV * p.T; const r = Math.exp(-p.dE / kT);
      const f2full = pumped ? p.pump / 100 : r / (1 + r);
      const f2 = pumped && step === 4 ? r / (1 + r) + (f2full - r / (1 + r)) * D.ease(prog) : f2full;
      const n2 = Math.round(NDOT * f2); const n1 = NDOT - n2;
      const ratio = f2 / Math.max(1e-9, 1 - f2);
      const inv = pumped ? p.pump > 50 : false;
      // levels
      const yE2 = 190, yE1 = 440, lx1 = 70, lx2 = 420;
      T(g, pumped ? `Pumped medium (${p.pump} % pumped to E₂)` : `Thermal equilibrium, T = ${p.T} K`, 30, 38, { size: 21, weight: 800 });
      D.level(g, lx1, lx2, yE2, '', { color: C.red, width: 4 }); D.level(g, lx1, lx2, yE1, '', { color: C.blue, width: 4 });
      T(g, 'E₂', 38, yE2, { color: C.red, size: 20 }); T(g, 'E₁', 38, yE1, { color: C.blue, size: 20 });
      const dots = (n, y, color) => { for (let i = 0; i < n; i++) D.atom(g, lx1 + 12 + (i % 20) * 17, y - 12 - Math.floor(i / 20) * 18, 8, color); };
      dots(n2, yE2, C.red); dots(n1, yE1, C.blue);
      T(g, `N₂ = ${n2} of 40`, lx2, yE2 + 24, { size: 17, color: C.red, align: 'right' });
      T(g, `N₁ = ${n1} of 40`, lx2, yE1 + 24, { size: 17, color: C.blue, align: 'right' });
      D.arrow(g, 250, yE1 - 50, 250, yE2 + 10, { color: C.muted, width: 2 });
      T(g, `ΔE = ${p.dE} eV`, 262, (yE1 + yE2) / 2 - 20, { size: 18, halo: true });
      if (step === 0) D.focus(g, 30, yE2 - 60, 450, yE1 - yE2 + 90, t);
      if (step >= 1) {
        const kh = clamp(kT / p.dE, 0, 1) * (yE1 - yE2);
        D.rect(g, 440, yE1 - kh, 28, Math.max(3, kh), { fill: C.amber, alpha: 0.8 });
        const ly = clamp(yE1 - kh - 16, yE2 + 60, yE1 - 66);
        T(g, `k_BT = ${fmt(kT, 3)} eV${kT > p.dE ? ' > ΔE' : ''}`, 432, ly, { size: 17, color: C.amber, weight: 800, halo: true, align: 'right' });
        if (step === 1) D.focus(g, 320, ly - 16, 160, yE1 - ly + 24, t);
      }
      if (step >= 2) {
        D.tag(g, `N₂/N₁ = ${fmt(pumped ? ratio : r, 3)}`, 270, 90, { bg: C.ink, size: 20, align: 'center' });
        if (!pumped && n2 === 0) T(g, '(far too few to show a single dot)', 270, yE2 - 30, { size: 16, color: C.muted, align: 'center' });
        if (step === 2) D.focus(g, 150, 70, 240, 40, t);
      }
      // bars
      const bx = 540, by = 470, bh = 300;
      T(g, 'Share', bx + 35, 150, { size: 17, align: 'center', color: C.muted });
      D.rect(g, bx, by - bh * (1 - f2), 30, bh * (1 - f2), { fill: C.blue });
      D.rect(g, bx + 40, by - bh * f2, 30, Math.max(1, bh * f2), { fill: C.red });
      D.line(g, bx - 5, by - bh / 2, bx + 75, by - bh / 2, { color: C.ink, width: 1.5, dash: [4, 4] });
      T(g, '50 %', bx - 8, by - bh / 2, { size: 16, align: 'right', color: C.muted });
      T(g, 'N₁', bx + 15, by + 20, { size: 18, color: C.blue, align: 'center' }); T(g, 'N₂', bx + 55, by + 20, { size: 18, color: C.red, align: 'center' });
      // chart
      const cx = 700, cy = 100, cw = 270, ch = 280;
      if (step >= 3) {
        if (pumped) {
          const pts = []; for (let i = 0; i <= 95; i++) pts.push([i, (i / 100) / (1 - i / 100)]);
          D.chart(g, cx, cy, cw, ch, { xmin: 0, xmax: 100, ymin: 0, ymax: 4, xticks: 4, yticks: 4, xlabel: 'atoms pumped to E₂ (%)', ylabel: 'N₂ / N₁', ylabelOffset: 36,
            series: [{ points: pts, color: C.red, width: 3 }], marks: [{ y: 1, label: 'N₂ = N₁', color: C.ink }, { point: [p.pump, Math.min(4, (p.pump / 100) / (1 - p.pump / 100))], color: inv ? C.green : C.red }] });
        } else {
          const pts = []; let ymax = 0; for (let i = 0; i <= 60; i++) { const TT = 100 + (5900 * i) / 60; const v = Math.exp(-p.dE / (KB_EV * TT)); ymax = Math.max(ymax, v); pts.push([TT, v]); }
          const nice = niceMax(Math.max(ymax * 1.1, 1e-3)); ymax = Math.min(1, nice.v);
          D.chart(g, cx, cy, cw, ch, { xmin: 100, xmax: 6000, ymin: 0, ymax, xticks: 3, yticks: nice.v > 1 ? 4 : nice.ticks, xlabel: 'temperature T (K)', ylabel: 'N₂ / N₁', ylabelOffset: 48, yfmt: (v) => fmt(v, 2),
            series: [{ points: pts, color: C.red, width: 3 }], marks: [{ point: [p.T, r], color: C.violet }] });
          T(g, ymax < 1 ? 'N₂/N₁ = 1 is far above this scale' : 'N₂/N₁ never exceeds 1', cx + cw / 2, cy - 20, { size: 16, color: C.muted, align: 'center' });
        }
        if (step === 3) D.focus(g, cx, cy, cw, ch, t);
      }
      if (step >= 4) {
        D.tag(g, `Population inversion: ${inv ? 'YES' : 'NO'}`, 835, 510, { bg: inv ? C.green : C.red, size: 20, align: 'center' });
        if (p.mode !== 'pumped') T(g, 'Heating never gives N₂ > N₁ → pump needed', 30, 510, { size: 18, color: C.red, weight: 800 });
        else D.focus(g, 30, yE2 - 50, 450, yE1 - yE2 + 80, t);
      }
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Laser pumping
  // ─────────────────────────────────────────────────────────────
  const DTH = 0.05; // threshold inversion (fraction of all atoms) — model assumption
  const METHODS = {
    flash: { label: 'Optical — flash lamp', src: 'Xenon flash lamp', ex: 'ruby, Nd:YAG' },
    discharge: { label: 'Electrical discharge', src: 'Gas discharge (electron collisions)', ex: 'He-Ne, CO₂, Ar-ion' },
    chemical: { label: 'Chemical reaction', src: 'Exothermic reaction (H₂ + F₂ → 2HF*)', ex: 'HF, DF lasers' },
    injection: { label: 'Injection current', src: 'Forward current through a p–n junction', ex: 'semiconductor diode lasers' },
  };
  const SCHEMES = {
    three: { name: 'Three-level (ruby)', tau: 3e-3, tauTxt: '3 ms', lam: 694.3, pumpTxt: 'green/blue absorption bands (≈ 400–550 nm)' },
    four: { name: 'Four-level (Nd:YAG)', tau: 230e-6, tauTxt: '230 µs', lam: 1064, pumpTxt: '≈ 808 nm band' },
  };
  function pumpModel(scheme, r) {
    const three = scheme === 'three'; const sc = SCHEMES[scheme]; const A = 1 / sc.tau;
    const wthA = three ? (1 + DTH) / (1 - DTH) : DTH / (1 - DTH); // W_th / A
    const W = r * wthA * A; const above = r > 1;
    let n2, nLow, dn;
    if (!above) { n2 = W / (W + A); nLow = three ? A / (W + A) : 0; dn = three ? (W - A) / (W + A) : n2; }
    else { n2 = three ? (1 + DTH) / 2 : DTH; nLow = three ? (1 - DTH) / 2 : 0; dn = DTH; }
    const k = three ? (1 - DTH) / 2 : 1 - DTH; const out = above ? k * (W - wthA * A) : 0;
    return { A, wthA, W, Wth: wthA * A, above, n2, nLow, dn, out };
  }
  const RATIO34 = ((1 + DTH) / (1 - DTH)) / (DTH / (1 - DTH));
  S['ep-pumping'] = {
    approx: `Simplified steady-state rate-equation model: pumping at rate W from the ground level, instant non-radiative decay from the pump band, spontaneous decay 1/τ from the upper laser level, the lower laser level of the four-level scheme empties instantly, equal degeneracies. The laser threshold is taken as an inversion of ${DTH * 100} % of all atoms (really set by the cavity losses); above threshold the inversion is clamped. The pump method only changes the energy source, not the level model.`,
    modes: [{ key: 'three', label: 'Three-level (ruby)' }, { key: 'four', label: 'Four-level (Nd:YAG)' }],
    params: [
      { key: 'method', label: 'Pumping method', type: 'select', default: 'flash', options: Object.entries(METHODS).map(([value, m]) => ({ value, label: m.label })) },
      { key: 'rate', label: 'Pump rate W / W_th', type: 'range', min: 0, max: 3, step: 0.05, default: 1.5, unit: '× threshold', help: 'Pump rate relative to the threshold pump rate of the selected scheme.' },
    ],
    examples: [
      { label: 'Ruby laser, flash lamp at 1.5 × threshold', values: { mode: 'three', method: 'flash', rate: 1.5 } },
      { label: 'Ruby below threshold (0.8 ×)', values: { mode: 'three', method: 'flash', rate: 0.8 } },
      { label: 'Nd:YAG, flash lamp at 2 × threshold', values: { mode: 'four', method: 'flash', rate: 2 } },
      { label: 'Nd:YAG just above threshold (1.1 ×)', values: { mode: 'four', method: 'flash', rate: 1.1 } },
    ],
    validate(p) {
      const m = METHODS[p.method];
      if (m && p.method !== 'flash') return [`Ruby and Nd:YAG are solid crystals and are pumped optically (flash lamp or diode laser). "${m.label}" is used for ${m.ex} — the level scheme is shown only as an illustration.`];
      return [];
    },
    compute(p) {
      const scheme = p.mode === 'four' ? 'four' : 'three'; const sc = SCHEMES[scheme]; const m = pumpModel(scheme, p.rate);
      const met = METHODS[p.method] || METHODS.flash; const three = scheme === 'three';
      const w3 = (1 + DTH) / (1 - DTH); const w4 = DTH / (1 - DTH);
      const formulas = [
        { name: 'Spontaneous decay rate of the upper laser level', formula: 'A = 1 / τ', given: `τ = ${sc.tauTxt} (${three ? 'ruby ²E level' : 'Nd:YAG ⁴F₃/₂ level'})`, calc: `A = 1 / ${sc.tauTxt}`, result: fmt(m.A, 3), unit: 's⁻¹' },
        three
          ? { name: 'Steady state (three-level)', formula: 'N₂/N = W/(W + A),  (N₂ − N₁)/N = (W − A)/(W + A)', given: `W = ${fmt(m.W, 3)} s⁻¹`, calc: `(N₂ − N₁)/N = (${fmt(m.W, 3)} − ${fmt(m.A, 3)}) / (${fmt(m.W, 3)} + ${fmt(m.A, 3)})${m.above ? ' → clamped at threshold' : ''}`, result: fmt(m.dn, 3), unit: 'fraction of N' }
          : { name: 'Steady state (four-level)', formula: 'N₂/N = W/(W + A),  N₁ ≈ 0 → ΔN = N₂', given: `W = ${fmt(m.W, 3)} s⁻¹`, calc: `ΔN/N = ${fmt(m.W, 3)} / (${fmt(m.W, 3)} + ${fmt(m.A, 3)})${m.above ? ' → clamped at threshold' : ''}`, result: fmt(m.dn, 3), unit: 'fraction of N' },
        { name: 'Threshold pump rate', formula: three ? 'W_th = A (1 + ΔN_th)/(1 − ΔN_th)' : 'W_th = A ΔN_th/(1 − ΔN_th)', given: `ΔN_th = ${DTH} N, A = ${fmt(m.A, 3)} s⁻¹`, calc: `W_th = ${fmt(m.wthA, 3)} × ${fmt(m.A, 3)}`, result: fmt(m.Wth, 3), unit: 's⁻¹' },
        { name: 'Laser output (per atom)', formula: three ? 'Φ = (1 − ΔN_th)/2 · (W − W_th)' : 'Φ = (1 − ΔN_th) · (W − W_th)', given: `W = ${p.rate} × W_th`, calc: m.above ? `Φ = ${three ? '0.475' : '0.95'} × (${fmt(m.W, 3)} − ${fmt(m.Wth, 3)})` : 'W ≤ W_th → no laser action', result: fmt(m.out, 3), unit: 'photons s⁻¹ per atom' },
        { name: 'Pump needed: three- vs four-level', formula: '(W_th/A)₃ / (W_th/A)₄', given: `3-level: ${fmt(w3, 3)}, 4-level: ${fmt(w4, 3)}`, calc: `${fmt(w3, 3)} / ${fmt(w4, 3)}`, result: fmt(RATIO34, 3), unit: '× less for four-level' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Upper level N₂', value: `${fmt(m.n2 * 100, 3)} %`, tone: 'info' },
          { label: 'Inversion ΔN', value: `${m.dn < 0 ? '−' : ''}${fmt(Math.abs(m.dn) * 100, 3)} %`, tone: m.dn > 0 ? 'good' : 'bad' },
          { label: 'Laser output', value: m.above ? `ON (${sc.lam} nm)` : 'OFF', tone: m.above ? 'good' : 'bad' },
          { label: 'Pump', value: met.label },
        ],
        state: { scheme: sc.name, method: met.label, pumpSource: met.src, pumpRelative: `${p.rate} × threshold`, pumpRate: `${fmt(m.W, 3)} s⁻¹`, thresholdPumpRate: `${fmt(m.Wth, 3)} s⁻¹`, upperLevel: `${fmt(m.n2 * 100, 3)} %`, lowerLaserLevel: `${fmt(m.nLow * 100, 3)} %`, inversion: `${fmt(m.dn * 100, 3)} %`, inverted: m.dn > 0 ? 'YES' : 'NO', laserOn: m.above ? 'YES' : 'NO', laserWavelength: `${sc.lam} nm`, output: `${fmt(m.out, 3)} photons/s per atom` },
        explain: {
          what: `${sc.name}: the pump (${met.label.toLowerCase()}) runs at ${p.rate} × threshold. ${fmt(m.n2 * 100, 3)} % of atoms sit in the upper laser level; inversion ΔN = ${fmt(m.dn * 100, 3)} % of N. ${m.above ? `The laser emits at ${sc.lam} nm.` : 'Below threshold — only weak spontaneous fluorescence.'}`,
          why: three ? 'In ruby the lower laser level is the ground state, so more than half of ALL atoms must be lifted before N₂ > N₁. Atoms reach the metastable level E₂ by fast non-radiative decay from the pump band and stay there ~3 ms.' : 'In Nd:YAG the lower laser level lies above the ground state and empties in nanoseconds, so any atom in the upper level already gives inversion — a small pump is enough.',
          param: 'Pump rate relative to threshold, the level scheme (three- or four-level) and the pump method.',
          effect: `Below threshold the inversion grows with pumping; above it the inversion is clamped and all extra pump goes into laser output (∝ W − W_th). A four-level scheme needs about ${fmt(RATIO34, 3)} × less pump rate (relative to 1/τ) than a three-level one.`,
        },
      };
    },
    steps(p, c) {
      const three = p.mode !== 'four';
      return [
        { title: 'Pump off: all atoms in the ground state', text: `${c.state.scheme}. Pump source: ${c.state.pumpSource}.` },
        { title: 'Pumping lifts atoms to the pump band E₃', text: `The pump raises atoms from the ground level to the broad band E₃ (${three ? SCHEMES.three.pumpTxt : SCHEMES.four.pumpTxt}).` },
        { title: 'Fast non-radiative decay to the metastable level', text: `Atoms drop within nanoseconds from E₃ to the long-lived upper laser level (τ ≈ ${three ? SCHEMES.three.tauTxt : SCHEMES.four.tauTxt}) and accumulate there.` },
        { title: 'Population inversion?', text: three ? `Lower laser level = ground state. N₂ = ${c.state.upperLevel}, N₁ = ${c.state.lowerLaserLevel} → inversion needs N₂ > 50 %.` : `Lower laser level E₁ empties at once (N₁ ≈ 0), so N₂ = ${c.state.upperLevel} is already an inversion.` },
        { title: c.state.laserOn === 'YES' ? 'Above threshold: laser action' : 'Below threshold: no laser beam', text: c.state.laserOn === 'YES' ? `Stimulated emission at ${c.state.laserWavelength}; output ∝ W − W_th = ${c.state.output}.` : `Pump at ${c.state.pumpRelative} is not enough; W_th = ${c.state.thresholdPumpRate}.` },
        { title: 'Why four-level lasers need less pumping', text: `Three-level: >50 % of all atoms must be excited. Four-level: the lower level is empty, so a few % already give inversion (≈ ${fmt(RATIO34, 3)} × less pump).` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2;
      const prog = clamp(st / dur, 0, 1); const ease = D.ease(prog);
      const scheme = p.mode === 'four' ? 'four' : 'three'; const three = scheme === 'three'; const sc = SCHEMES[scheme];
      const m = pumpModel(scheme, p.rate); const met = METHODS[p.method] || METHODS.flash;
      D.clear(g, '#ffffff');
      T(g, sc.name, 30, 34, { size: 21, weight: 800 });
      D.tag(g, `Pump: ${met.label}`, 30, 70, { bg: C.violet, size: 17 });
      // levels geometry
      const x1 = 150, x2 = 450;
      const yb3 = 110, yb3b = 150; const yE2 = 240; const yL = three ? 470 : 390; const yG = 470;
      D.rect(g, 100, yb3, x2 - 100, yb3b - yb3, { fill: '#ede9fe', stroke: C.violet, width: 2 });
      T(g, 'E₃ pump band', x2 + 8, yb3 + 20, { size: 17, color: C.violet });
      D.level(g, x1, x2, yE2, '', { color: C.red, width: 4 }); T(g, three ? 'E₂ metastable' : 'E₂ upper laser', x2 + 8, yE2 - 10, { size: 17, color: C.red });
      T(g, `τ ≈ ${sc.tauTxt}`, x2 + 8, yE2 + 14, { size: 16, color: C.muted });
      if (!three) { D.level(g, x1, x2, yL, '', { color: C.orange, width: 4 }); T(g, 'E₁ lower laser', x2 + 8, yL, { size: 17, color: C.orange }); }
      D.level(g, x1, x2, yG, '', { color: C.blue, width: 4 }); T(g, three ? 'E₁ ground' : 'E₀ ground', x2 + 8, yG, { size: 17, color: C.blue });
      // population for current step
      let nBand = 0, nUp = 0;
      if (step === 1) nBand = m.n2 * ease;
      else if (step === 2) { nUp = m.n2 * ease; nBand = m.n2 * (1 - ease); }
      else if (step >= 3) nUp = m.n2;
      const N = 40; const cU = Math.round(N * nUp); const cB = Math.round(N * nBand); const cG = N - cU - cB;
      const dots = (n, y, color) => { for (let i = 0; i < n; i++) D.atom(g, x1 + 10 + (i % 20) * 14.5, y - 10 - Math.floor(i / 20) * 15, 7, color); };
      dots(cB, yb3b, C.violet); dots(cU, yE2, C.red); dots(cG, yG, C.blue);
      if (step >= 3) T(g, `N₂ = ${fmt(m.n2 * 100, 3)} %`, x2, yE2 + 22, { size: 16, color: C.red, align: 'right' });
      // arrows
      if (step >= 1) {
        const pa = p.rate > 0 ? 1 : 0.25;
        D.arrow(g, 125, yG, 125, yb3b + 6, { color: C.violet, width: 3 + 1.5 * Math.min(p.rate, 3), alpha: pa, head: 16 });
        T(g, `pump W = ${p.rate} × W_th`, 98, (yG + yb3b) / 2, { size: 17, color: C.violet, align: 'center', rotate: -Math.PI / 2 });
        if (step === 1) D.focus(g, 80, yb3 - 4, x2 - 80, yG - yb3 + 8, t);
      }
      if (step >= 2) {
        D.line(g, 380, yb3b + 4, 380, yE2 - 8, { color: C.muted, width: 3, dash: [5, 5] }); D.arrow(g, 380, yE2 - 20, 380, yE2 - 6, { color: C.muted, width: 3 });
        T(g, 'fast, non-radiative', 370, (yb3b + yE2) / 2 + 2, { size: 16, color: C.muted, align: 'right', halo: true });
        if (step === 2) D.focus(g, x1, yb3b, x2 - x1, yE2 - yb3b + 10, t);
      }
      if (!three && step >= 2) { D.line(g, 380, yL + 6, 380, yG - 8, { color: C.muted, width: 3, dash: [5, 5] }); D.arrow(g, 380, yG - 20, 380, yG - 6, { color: C.muted, width: 3 }); T(g, 'fast (empties E₁)', 370, yL + 22, { size: 16, color: C.muted, align: 'right', halo: true }); }
      if (step >= 3) {
        D.tag(g, m.dn > 0 ? `Inversion: YES (ΔN = ${fmt(m.dn * 100, 3)} %)` : `Inversion: NO (ΔN = −${fmt(Math.abs(m.dn) * 100, 3)} %)`, 265, 520, { bg: m.dn > 0 ? C.green : C.red, size: 18, align: 'center' });
        if (step === 3) D.focus(g, x1, yE2 - 40, x2 - x1, yG - yE2 + 50, t);
      }
      // laser transition
      if (step >= 4) {
        const lc = col(sc.lam);
        const xm = 300; const ym = (yE2 + yL) / 2;
        if (m.above) {
          D.arrow(g, xm, yE2 + 6, xm, yL - 8, { color: lc, width: 6, head: 18 });
          D.wave(g, xm + 10, ym, xm + 80, ym, { color: lc, amp: 7, wavelength: 18, width: 3, arrow: true, phase: t * 6 });
          T(g, `laser ${sc.lam} nm`, xm - 12, ym - 30, { size: 18, color: lc, align: 'right', weight: 800, halo: true });
        } else {
          D.arrow(g, xm, yE2 + 6, xm, yL - 8, { color: C.faint, width: 2.5, dash: [6, 6] });
          T(g, 'weak fluorescence', xm - 12, ym - 30, { size: 16, color: C.muted, align: 'right', halo: true });
        }
      }
      // charts
      const cx = 660, cw = 300;
      const ptsI = []; const ptsO = []; for (let i = 0; i <= 60; i++) { const r = (3 * i) / 60; const q = pumpModel(scheme, r); ptsI.push([r, q.dn * 100]); ptsO.push([r, q.out / q.A]); }
      const ymin = three ? -100 : 0; const ymax = three ? 20 : 6;
      D.text(g, 'Inversion ΔN (% of atoms)', cx, 72, { size: 17, weight: 800 });
      D.chart(g, cx, 90, cw, 160, { xmin: 0, xmax: 3, ymin, ymax, xticks: 3, yticks: 3, xfmt: (v) => fmt(v, 2) + '×',
        series: [{ points: ptsI, color: C.red, width: 3 }], marks: [{ y: 0, color: C.ink }, { x: 1, color: C.muted }, { point: [p.rate, m.dn * 100], color: m.dn > 0 ? C.green : C.red }] });
      const omax = pumpModel(scheme, 3).out / m.A || 1;
      D.text(g, 'Laser output per atom (× 1/τ)', cx, 312, { size: 17, weight: 800 });
      D.chart(g, cx, 330, cw, 130, { xmin: 0, xmax: 3, ymin: 0, ymax: omax * 1.1, xticks: 3, yticks: 2, xfmt: (v) => fmt(v, 2) + '×', xlabel: 'pump rate W / W_th', yfmt: (v) => fmt(v, 2),
        series: [{ points: ptsO, color: C.green, width: 3 }], marks: [{ x: 1, label: 'threshold', color: C.muted }, { point: [p.rate, m.out / m.A], color: m.above ? C.green : C.red }] });
      if (step === 4) D.focus(g, cx, 330, cw, 130, t);
      if (step >= 5) {
        D.rect(g, 470, 508, 510, 44, { fill: C.amberSoft, stroke: C.amber, width: 1.5, r: 10 });
        T(g, `W_th/A: 3-level ${fmt((1 + DTH) / (1 - DTH), 3)}, 4-level ${fmt(DTH / (1 - DTH), 2)} (≈ ${fmt(RATIO34, 2)}× less)`, 725, 530, { size: 17, align: 'center', weight: 800 });
        D.focus(g, 470, 508, 510, 44, t);
      }
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 6. Laser cavity
  // ─────────────────────────────────────────────────────────────
  function cavity(p) {
    const L = p.L / 100; const R1 = p.R1 / 100; const R2 = p.R2 / 100; const net = p.g - p.alpha;
    const gth = p.alpha + Math.log(1 / (R1 * R2)) / (2 * L);
    const single = Math.exp(net * L); const G = R1 * R2 * Math.exp(2 * net * L);
    const dnu = CL / (2 * p.n * L);
    return { L, R1, R2, gth, single, G, dnu, T2: 1 - R2, above: p.g > gth + 1e-12 };
  }
  S['ep-laser-cavity'] = {
    approx: 'Small-signal model: the gain g is constant, so above threshold the intensity grows as Gᵏ without limit. In a real laser the gain saturates and the intensity settles where G = 1. Mirror, rod and pulse drawings are schematic; n is treated as filling the whole cavity; the mode picture is schematic (spacing not to scale).',
    params: [
      { key: 'R1', label: 'Back mirror reflectivity R₁', type: 'range', min: 90, max: 100, step: 0.1, default: 99.9, unit: '%' },
      { key: 'R2', label: 'Output coupler reflectivity R₂', type: 'range', min: 80, max: 99.9, step: 0.1, default: 99, unit: '%' },
      { key: 'L', label: 'Cavity / gain length L', type: 'range', min: 5, max: 100, step: 1, default: 30, unit: 'cm' },
      { key: 'g', label: 'Gain coefficient g', type: 'range', min: 0, max: 5, step: 0.01, default: 0.1, unit: 'm⁻¹' },
      { key: 'alpha', label: 'Internal loss α', type: 'range', min: 0, max: 1, step: 0.005, default: 0.005, unit: 'm⁻¹' },
      { key: 'n', label: 'Refractive index n', type: 'range', min: 1, max: 2, step: 0.01, default: 1, unit: '' },
    ],
    examples: [
      { label: 'He-Ne 632.8 nm: L = 30 cm, R₂ = 99 %', values: { R1: 99.9, R2: 99, L: 30, g: 0.1, alpha: 0.005, n: 1 } },
      { label: 'He-Ne with a 90 % coupler (below threshold)', values: { R1: 99.9, R2: 90, L: 30, g: 0.1, alpha: 0.005, n: 1 } },
      { label: 'Nd:YAG rod 1064 nm: L = 10 cm, n = 1.82', values: { R1: 99.8, R2: 95, L: 10, g: 1.2, alpha: 0.1, n: 1.82 } },
      { label: 'Ruby rod 694.3 nm: L = 10 cm, n = 1.76', values: { R1: 99.9, R2: 90, L: 10, g: 1.5, alpha: 0.1, n: 1.76 } },
    ],
    validate(p) { return p.g <= p.alpha ? ['Gain g is not larger than the internal loss α — the light is weakened on every pass even before mirror losses.'] : []; },
    compute(p) {
      const k = cavity(p); const lnRR = Math.log(1 / (k.R1 * k.R2));
      const I10 = Math.pow(k.G, 10);
      const formulas = [
        { name: 'Threshold gain', formula: 'g_th = α + (1 / 2L) ln(1 / R₁R₂)', given: `α = ${p.alpha} m⁻¹, L = ${fmt(k.L, 3)} m, R₁ = ${fmt(k.R1, 4)}, R₂ = ${fmt(k.R2, 4)}`, calc: `g_th = ${p.alpha} + (1 / ${fmt(2 * k.L, 3)}) × ln(1 / ${fmt(k.R1 * k.R2, 4)}) = ${p.alpha} + ${fmt(lnRR / (2 * k.L), 3)}`, result: fmt(k.gth, 3), unit: 'm⁻¹' },
        { name: 'Single-pass gain', formula: 'I_out / I_in = e^((g − α)L)', given: `g = ${p.g} m⁻¹`, calc: `e^((${p.g} − ${p.alpha}) × ${fmt(k.L, 3)})`, result: fmt(k.single, 4), unit: '—' },
        { name: 'Round-trip gain', formula: 'G = R₁R₂ e^(2(g − α)L)', given: `R₁R₂ = ${fmt(k.R1 * k.R2, 4)}`, calc: `G = ${fmt(k.R1 * k.R2, 4)} × ${fmt(k.single * k.single, 4)}`, result: fmt(k.G, 4), unit: '— (> 1 grows)' },
        { name: 'Intensity after k round trips', formula: 'I_k = I₀ Gᵏ', given: 'k = 10', calc: `I₁₀ = ${fmt(k.G, 4)}¹⁰`, result: fmt(I10, 3), unit: '× I₀' },
        { name: 'Output coupling', formula: 'T = 1 − R₂', given: `R₂ = ${p.R2} %`, calc: `T = 1 − ${fmt(k.R2, 4)}`, result: fmt(k.T2 * 100, 3), unit: '% of the light hitting R₂' },
        { name: 'Longitudinal mode spacing', formula: 'Δν = c / (2nL)', given: `n = ${p.n}, L = ${fmt(k.L, 3)} m`, calc: `Δν = 2.998 × 10⁸ / (2 × ${p.n} × ${fmt(k.L, 3)})`, result: fmt(k.dnu / 1e6, 4), unit: 'MHz' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Threshold g_th', value: `${fmt(k.gth, 3)} m⁻¹`, tone: 'info' },
          { label: 'Round-trip G', value: fmt(k.G, 4) },
          { label: 'Status', value: k.above ? 'Above threshold' : 'Below threshold', tone: k.above ? 'good' : 'bad' },
          { label: 'Mode spacing Δν', value: `${fmt(k.dnu / 1e6, 4)} MHz` },
        ],
        state: { R1: `${p.R1} %`, R2: `${p.R2} %`, length: `${p.L} cm`, gain: `${p.g} m⁻¹`, loss: `${p.alpha} m⁻¹`, refractiveIndex: p.n, thresholdGain: `${fmt(k.gth, 3)} m⁻¹`, singlePassGain: fmt(k.single, 4), roundTripGain: fmt(k.G, 4), intensityAfter10: `${fmt(I10, 3)} I₀`, outputFraction: `${fmt(k.T2 * 100, 3)} %`, modeSpacing: `${fmt(k.dnu / 1e6, 4)} MHz`, status: k.above ? 'above threshold' : 'below threshold' },
        explain: {
          what: `Light bounces between R₁ = ${p.R1} % and R₂ = ${p.R2} %. Each round trip multiplies it by G = ${fmt(k.G, 4)}, so ${k.above ? `it grows (× ${fmt(I10, 3)} after 10 round trips)` : `it dies away (× ${fmt(I10, 3)} after 10 round trips)`}. ${fmt(k.T2 * 100, 3)} % of the light reaching R₂ leaves as the output beam.`,
          why: `Gain must replace every loss: internal loss α and the light that leaves through the mirrors. That gives g_th = α + (1/2L) ln(1/R₁R₂) = ${fmt(k.gth, 3)} m⁻¹; here g = ${p.g} m⁻¹ is ${k.above ? 'larger' : 'not larger'}.`,
          param: 'Mirror reflectivities R₁, R₂, gain length L, gain g, loss α and refractive index n.',
          effect: `Lower R₂ gives more output per pass but raises g_th. A longer L lowers g_th and brings the modes closer together (Δν = ${fmt(k.dnu / 1e6, 4)} MHz now).`,
        },
      };
    },
    steps(p, c) {
      return [
        { title: 'The optical cavity', text: `Gain medium of length L = ${p.L} cm between a back mirror R₁ = ${p.R1} % and an output coupler R₂ = ${p.R2} %.` },
        { title: 'Amplification in one pass', text: `Passing through the medium multiplies the intensity by e^((g−α)L) = ${c.state.singlePassGain}.` },
        { title: 'Mirror losses and the round trip', text: `After two passes and two reflections: G = R₁R₂e^(2(g−α)L) = ${c.state.roundTripGain}.` },
        { title: 'Threshold condition', text: `Oscillation needs G ≥ 1, i.e. g ≥ g_th = ${c.state.thresholdGain}. Here g = ${p.g} m⁻¹ → ${c.state.status}.` },
        { title: 'Build-up over many passes', text: `I_k = I₀Gᵏ: after 10 round trips I = ${c.state.intensityAfter10}. ${c.state.status === 'above threshold' ? 'In a real laser gain saturation then stops the growth.' : 'The light dies away — no laser beam.'}` },
        { title: 'Output beam and longitudinal modes', text: `${c.state.outputFraction} of the light at R₂ leaves each round trip. Allowed frequencies are spaced by Δν = c/2nL = ${c.state.modeSpacing}.` },
      ];
    },
    stepDuration: 5,
    draw(g, S2) {
      const { p, step, st, t, dur } = S2;
      const prog = clamp(st / dur, 0, 1);
      const k = cavity(p);
      D.clear(g, '#ffffff');
      const m1 = 90, m2 = 890, yA = 170, rx1 = 180, rx2 = 800;
      // gain medium
      D.rect(g, rx1, yA - 45, rx2 - rx1, 90, { fill: '#fce7f3', stroke: C.pink, width: 2, r: 10 });
      T(g, `Gain medium: g = ${p.g} m⁻¹, α = ${p.alpha} m⁻¹, n = ${p.n}`, (rx1 + rx2) / 2, yA - 30, { size: 17, align: 'center', color: C.pink });
      D.arrow(g, rx1, yA + 62, rx2, yA + 62, { color: C.muted, width: 1.5, head: 9 }); D.arrow(g, rx2, yA + 62, rx1, yA + 62, { color: C.muted, width: 1.5, head: 9 });
      T(g, `L = ${p.L} cm`, (rx1 + rx2) / 2, yA + 82, { size: 17, align: 'center', color: C.muted });
      // mirrors
      D.rect(g, m1 - 16, yA - 75, 16, 150, { fill: '#94a3b8', stroke: C.ink, width: 2 });
      D.rect(g, m2, yA - 75, 12, 150, { fill: '#cbd5e1', stroke: C.ink, width: 2 });
      T(g, `R₁ = ${p.R1} %`, m1 - 8, yA - 92, { size: 17, align: 'center', weight: 800 });
      T(g, `R₂ = ${p.R2} %`, m2 + 6, yA - 92, { size: 17, align: 'center', weight: 800 });
      if (step === 0) D.focus(g, m1 - 20, yA - 80, m2 - m1 + 36, 160, t);
      // bouncing light: pos in [0,1) over one round trip (0–0.5 → right, 0.5–1 → left)
      const maxRT = 6;
      let pos = null; let rt = 0;
      if (step === 1) pos = prog * 0.5;
      else if (step === 2 || step === 3) pos = 0.5 + prog * 0.5;
      else if (step === 4) { const kk = prog * maxRT; rt = Math.floor(kk); pos = kk - rt; if (prog >= 1) { rt = maxRT; pos = 0; } }
      else if (step >= 5) { rt = maxRT; pos = (t * 0.4) % 1; }
      const Ik = Math.pow(k.G, rt);
      if (pos != null) {
        const toRight = pos < 0.5; const ff = toRight ? pos * 2 : (pos - 0.5) * 2;
        const x = toRight ? m1 + (m2 - m1) * ff : m2 - (m2 - m1) * ff;
        const Ihere = Ik * (toRight ? Math.pow(k.single, ff) : k.R2 * k.single * Math.pow(k.single, ff));
        const rad = clamp(12 + 5 * Math.log10(Math.max(Ihere, 1e-3)), 4, 30);
        D.circle(g, x, yA, rad + 8, { fill: C.laser, alpha: 0.2 }); D.circle(g, x, yA, rad, { fill: C.laser, alpha: 0.85 });
        D.arrow(g, x + (toRight ? 22 : -22), yA + 22, x + (toRight ? 62 : -62), yA + 22, { color: C.laser, width: 3 });
      }
      if (step >= 1) T(g, `one pass: × e^((g−α)L) = × ${fmt(k.single, 4)}`, 490, yA + 112, { size: 18, align: 'center', weight: 800, color: C.pink });
      if (step === 1) D.focus(g, rx1, yA - 45, rx2 - rx1, 90, t);
      if (step >= 2) T(g, `round trip: G = R₁R₂e^(2(g−α)L) = ${fmt(k.G, 4)}`, 490, yA + 140, { size: 18, align: 'center', weight: 800 });
      if (step === 2) { D.focus(g, m1 - 20, yA - 80, 24, 160, t); D.focus(g, m2 - 2, yA - 80, 18, 160, t); }
      // output beam
      if (step >= 2) {
        const w = clamp(2 + 60 * k.T2, 2, 14);
        D.arrow(g, m2 + 16, yA, 985, yA, { color: C.laser, width: w, head: 16, alpha: k.above || step < 4 ? 0.9 : 0.3 });
        T(g, `T = ${fmt(k.T2 * 100, 3)} %`, 948, yA + 40, { size: 17, align: 'center', color: C.laser });
      }
      if (step >= 3) {
        D.tag(g, `g = ${p.g} ${k.above ? '>' : '≤'} g_th = ${fmt(k.gth, 3)} m⁻¹ → ${k.above ? 'ABOVE threshold' : 'BELOW threshold'}`, 490, 34, { bg: k.above ? C.green : C.red, size: 18, align: 'center' });
        if (step === 3) D.focus(g, 130, 14, 720, 40, t);
      }
      // bottom panels
      const cy = 385, ch = 125;
      if (step >= 4) {
        const pts = []; for (let i = 0; i <= 10; i++) pts.push([i, Math.pow(k.G, i)]);
        const ymax = Math.max(1.05, Math.pow(k.G, 10) * 1.05);
        T(g, `Intensity I_k/I₀ — round trip k = ${rt}, I = ${fmt(Ik, 3)} I₀`, 30, cy - 22, { size: 17, weight: 800 });
        D.chart(g, 90, cy, 380, ch, { xmin: 0, xmax: 10, ymin: 0, ymax, xticks: 5, yticks: 2, xlabel: 'round trip k', yfmt: (v) => fmt(v, 2),
          series: [{ points: pts, color: k.above ? C.green : C.red, width: 3, dots: true }], marks: [{ y: 1, color: C.muted }, { point: [Math.min(rt, 10), Math.pow(k.G, Math.min(rt, 10))], color: C.laser }] });
        if (step === 4) D.focus(g, 30, cy - 40, 450, ch + 80, t);
      }
      if (step >= 5) {
        const x0 = 560, x1 = 960, yb = cy + ch;
        T(g, `Modes: Δν = c/2nL = ${fmt(k.dnu / 1e6, 4)} MHz`, x0, cy - 22, { size: 17, weight: 800 });
        const pts = []; for (let i = 0; i <= 80; i++) { const x = x0 + ((x1 - x0) * i) / 80; const u = (i - 40) / 22; pts.push([x, yb - 100 * Math.exp(-u * u)]); }
        D.poly(g, pts, { stroke: C.pink, width: 2, dash: [6, 5] });
        const nm = 9; const sp = (x1 - x0 - 40) / (nm - 1);
        for (let i = 0; i < nm; i++) { const x = x0 + 20 + i * sp; const u = (x - (x0 + x1) / 2) / ((x1 - x0) * 22 / 80); D.line(g, x, yb, x, yb - 100 * Math.exp(-u * u), { color: C.laser, width: 3 }); }
        D.line(g, x0, yb, x1, yb, { color: C.ink, width: 2 });
        const xa = x0 + 20 + 4 * sp; const xb = xa + sp;
        D.arrow(g, xa, yb + 16, xb, yb + 16, { color: C.ink, width: 2, head: 8 }); D.arrow(g, xb, yb + 16, xa, yb + 16, { color: C.ink, width: 2, head: 8 });
        T(g, 'Δν', (xa + xb) / 2, yb + 36, { size: 17, align: 'center' });
        T(g, 'gain curve', x1, cy + 10, { size: 16, align: 'right', color: C.pink });
        T(g, 'frequency ν →', x1, yb + 36, { size: 16, align: 'right', color: C.muted });
        D.focus(g, x0 - 10, cy - 40, x1 - x0 + 20, ch + 80, t);
      }
    },
  };
})();
