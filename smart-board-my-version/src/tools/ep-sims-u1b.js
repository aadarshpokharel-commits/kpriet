'use strict';

/* Engineering Physics — Unit 1 (part B): LASER types and applications. */
(function () {
  const S = (window.EPSims = window.EPSims || {});
  const D = window.EPDraw;
  const { C, fmt, rad, clamp } = D;

  // Physical constants
  const H = 6.626e-34; const CL = 2.998e8; const QE = 1.602e-19; const KB = 1.381e-23;
  const HC_EVNM = ((H * CL) / QE) * 1e9; // ≈ 1239.8 eV·nm

  /** Deterministic pseudo-random number in [0,1). */
  function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function T(g, s, x, y, o) { D.text(g, s, x, y, Object.assign({ size: 17 }, o || {})); }
  function panel(g, x, y, w, h, title, o = {}) {
    D.rect(g, x, y, w, h, { fill: o.fill || '#f8fafc', stroke: o.stroke || C.line, width: 1.5, r: 10 });
    if (title) T(g, title, x + 12, y + 20, { size: 17, weight: 800, color: o.color || C.ink });
  }
  /** label ........ value row */
  function row(g, x, y, w, label, value, color) {
    T(g, label, x, y, { size: 17, color: C.muted, weight: 700 });
    T(g, value, x + w, y, { size: 17, weight: 800, align: 'right', color: color || C.ink });
  }
  /** Simple plot frame with ≥16 px tick labels. */
  function plot(g, x, y, w, h, o) {
    D.rect(g, x, y, w, h, { fill: '#ffffff', stroke: C.line, width: 1.5 });
    const X = (v) => x + ((v - o.xmin) / (o.xmax - o.xmin || 1)) * w; const Y = (v) => y + h - ((v - o.ymin) / (o.ymax - o.ymin || 1)) * h;
    (o.yt || []).forEach((v) => { D.line(g, x, Y(v), x + w, Y(v), { color: '#eef2f7', width: 1 }); T(g, o.yf ? o.yf(v) : fmt(v, 3), x - 7, Y(v), { size: 16, color: C.muted, align: 'right' }); });
    (o.xt || []).forEach((v) => { D.line(g, X(v), y + h, X(v), y + h + 5, { color: C.faint, width: 1.5 }); T(g, o.xf ? o.xf(v) : fmt(v, 3), X(v), y + h + 17, { size: 16, color: C.muted, align: 'center' }); });
    if (o.xlabel) T(g, o.xlabel, x + w / 2, y + h + 40, { size: 16, color: C.muted, align: 'center', weight: 700 });
    if (o.ylabel) T(g, o.ylabel, x - (o.yoff || 50), y + h / 2, { size: 16, color: C.muted, align: 'center', weight: 700, rotate: -Math.PI / 2 });
    return { X, Y, clip() { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); } };
  }
  const niceMax = (v) => { if (!(v > 0)) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))); const m = v / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; };
  const sci = (v, d = 2) => fmt(v, d);
  const pow10 = (n) => `10${D.sup(Math.round(n))}`;
  function wavy(g, x1, y1, x2, y2, color, o = {}) { D.wave(g, x1, y1, x2, y2, { amp: o.amp || 6, wavelength: o.wl || 16, color, width: o.width || 3, arrow: true, phase: o.phase || 0, alpha: o.alpha }); }
  /** Draws a flat mirror at (x,y) oriented to turn a beam from direction uin into uout. */
  function mirrorAt(g, x, y, uin, uout, o = {}) {
    const n = [uout[0] - uin[0], uout[1] - uin[1]]; const a = Math.atan2(n[1], n[0]) + Math.PI / 2;
    g.save(); g.translate(x, y); g.rotate(a); D.rect(g, -20, -4, 40, 8, { fill: o.fill || '#cbd5e1', stroke: o.stroke || '#334155', width: 1.5 }); g.restore();
  }
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const n = Math.hypot(dx, dy) || 1; return [dx / n, dy / n]; };

  // ─────────────────────────────────────────────────────────────
  // 1. CO₂ laser (conceptual)
  // ─────────────────────────────────────────────────────────────
  const CO2LV = { n2v1: 0.289, c001: 0.291, c100: 0.172, c020: 0.159, c010: 0.083 }; // eV (≈ term values 2331, 2349, 1388, 1285, 667 cm⁻¹)
  const MIX = { '1:2:3': [1, 2, 3], '1:1:8': [1, 1, 8], '1:4:5': [1, 4, 5] };
  function co2Calc(p) {
    const line96 = p.mode === 'l96';
    const lamUm = line96 ? 9.6 : 10.6;
    const EJ = (H * CL) / (lamUm * 1e-6); const EeV = EJ / QE; const nu = CL / (lamUm * 1e-6);
    const etaQ = EeV / CO2LV.c001;
    const Pout = (p.eff / 100) * p.pin;
    const dE = CO2LV.c001 - CO2LV.n2v1;
    const kT = (KB * p.tgas) / QE;
    const Elow = line96 ? CO2LV.c020 : CO2LV.c100;
    const boltz = Math.exp(-Elow / kT);
    const mix = MIX[p.mix] || MIX['1:2:3'];
    return { line96, lamUm, EJ, EeV, nu, etaQ, Pout, dE, kT, Elow, boltz, mix };
  }
  S['ep-co2-laser'] = {
    conceptual: true,
    approx: 'Conceptual model. Vibrational level energies are rounded term values (N₂ v=1 ≈ 0.289 eV, CO₂ 001 ≈ 0.291 eV, 100 ≈ 0.172 eV, 020 ≈ 0.159 eV). The real 10.6 µm and 9.6 µm outputs are rotational lines inside these vibrational bands. Overall (wall-plug) efficiency ≈ 10–20 % is a typical approximate value; molecules and photons are drawn schematically, not to scale.',
    modes: [{ key: 'l106', label: '10.6 µm line (001 → 100)' }, { key: 'l96', label: '9.6 µm line (001 → 020)' }],
    params: [
      { key: 'mix', label: 'Gas mixture CO₂ : N₂ : He', type: 'select', default: '1:2:3', options: [{ value: '1:2:3', label: '1 : 2 : 3 (textbook)' }, { value: '1:1:8', label: '1 : 1 : 8 (He-rich, sealed tube)' }, { value: '1:4:5', label: '1 : 4 : 5 (N₂-rich)' }] },
      { key: 'pin', label: 'Electrical input power P_in', type: 'range', min: 100, max: 20000, step: 100, default: 1000, unit: 'W', help: 'Power delivered to the gas discharge.' },
      { key: 'eff', label: 'Overall efficiency η', type: 'range', min: 5, max: 20, step: 1, default: 15, unit: '%', help: 'CO₂ lasers are unusually efficient: roughly 10–20 %.' },
      { key: 'tgas', label: 'Gas temperature T', type: 'range', min: 300, max: 800, step: 10, default: 400, unit: 'K', help: 'He cooling keeps the gas cool so the lower laser level stays empty.' },
    ],
    examples: [
      { label: 'Sealed 50 W engraver tube', values: { mix: '1:1:8', pin: 400, eff: 12, tgas: 400 } },
      { label: 'Industrial 3 kW cutting laser', values: { mix: '1:2:3', pin: 20000, eff: 15, tgas: 420 } },
      { label: 'Poorly cooled tube (hot gas)', values: { mix: '1:2:3', pin: 1000, eff: 8, tgas: 700 } },
    ],
    validate(p) {
      const w = [];
      if (p.tgas > 600) w.push(`At T = ${p.tgas} K the lower laser level is noticeably populated by heat — the population inversion and output fall. Real tubes are cooled (He + water jacket).`);
      return w;
    },
    compute(p) {
      const k = co2Calc(p);
      const lam = `${k.lamUm} µm`;
      const formulas = [
        { name: 'Photon energy', formula: 'E = hc / λ', given: `h = 6.626 × 10⁻³⁴ J·s, c = 2.998 × 10⁸ m/s, λ = ${lam}`,
          calc: `E = (6.626 × 10⁻³⁴ × 2.998 × 10⁸) / (${k.lamUm} × 10⁻⁶) = ${sci(k.EJ, 4)} J; ÷ 1.602 × 10⁻¹⁹ J/eV`, result: fmt(k.EeV, 3), unit: 'eV' },
        { name: 'Frequency', formula: 'ν = c / λ', given: `λ = ${lam}`, calc: `ν = 2.998 × 10⁸ / (${k.lamUm} × 10⁻⁶)`, result: sci(k.nu, 3), unit: 'Hz' },
        { name: 'Resonant transfer mismatch', formula: 'ΔE = E(CO₂ 001) − E(N₂ v=1)', given: `E(001) ≈ ${CO2LV.c001} eV, E(N₂ v=1) ≈ ${CO2LV.n2v1} eV, k_BT = ${fmt(k.kT, 3)} eV`,
          calc: `ΔE = ${CO2LV.c001} − ${CO2LV.n2v1} = ${fmt(k.dE, 2)} eV  (≪ k_BT, so collisions easily supply it)`, result: fmt(k.dE, 2), unit: 'eV' },
        { name: 'Quantum efficiency (upper limit)', formula: 'η_q = E_photon / E(001)', given: `E_photon = ${fmt(k.EeV, 3)} eV, E(001) = ${CO2LV.c001} eV`,
          calc: `η_q = ${fmt(k.EeV, 3)} / ${CO2LV.c001} = ${fmt(k.etaQ, 3)}`, result: fmt(k.etaQ * 100, 3), unit: '%' },
        { name: 'Thermal population of lower level', formula: 'N_low / N₀ = exp(−E_low / k_BT)', given: `E_low = ${k.Elow} eV (${k.line96 ? '020' : '100'}), T = ${p.tgas} K`,
          calc: `k_BT = 1.381 × 10⁻²³ × ${p.tgas} / 1.602 × 10⁻¹⁹ = ${fmt(k.kT, 3)} eV → exp(−${k.Elow} / ${fmt(k.kT, 3)})`, result: sci(k.boltz, 2), unit: '— (fraction)' },
        { name: 'Output power (approx.)', formula: 'P_out = η × P_in', given: `η = ${p.eff} %, P_in = ${p.pin} W`, calc: `P_out = ${p.eff / 100} × ${p.pin}`, result: fmt(k.Pout, 3), unit: 'W' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Wavelength', value: `${lam} (IR)`, tone: 'info' },
          { label: 'Photon energy', value: `${fmt(k.EeV, 3)} eV` },
          { label: 'Output power ≈', value: `${fmt(k.Pout, 3)} W`, tone: 'good' },
          { label: 'Lower level (thermal)', value: sci(k.boltz, 2), tone: k.boltz > 0.02 ? 'bad' : 'good' },
        ],
        state: { line: k.line96 ? '001 → 020 (9.6 µm)' : '001 → 100 (10.6 µm)', mixture: `CO₂:N₂:He = ${p.mix}`, photonEnergy: `${fmt(k.EeV, 3)} eV`, quantumEfficiency: `${fmt(k.etaQ * 100, 3)} %`, inputPower: `${p.pin} W`, efficiency: `${p.eff} %`, outputPower: `${fmt(k.Pout, 3)} W`, gasTemperature: `${p.tgas} K`, lowerLevelThermalFraction: sci(k.boltz, 2) },
        explain: {
          what: `An electric discharge through CO₂ : N₂ : He = ${p.mix} excites N₂, which hands its energy to CO₂. CO₂ then lases on the ${k.line96 ? '001 → 020' : '001 → 100'} transition, giving ${lam} infrared light (photon energy ${fmt(k.EeV, 3)} eV). About ${fmt(k.Pout, 3)} W comes out of ${p.pin} W input.`,
          why: `N₂ (v = 1) is long-lived and sits only ${fmt(k.dE, 2)} eV below the CO₂ 001 level, so a collision transfers the energy almost perfectly. The lower level is emptied quickly by collisions with He, which also carries heat to the walls, so the inversion is kept.`,
          param: 'Laser line (mode), gas mixture, input power, efficiency and gas temperature.',
          effect: `Higher input power gives proportionally more output. A hotter gas (now ${p.tgas} K) fills the lower laser level thermally (fraction ${sci(k.boltz, 2)}), reducing the inversion — that is why He and cooling are essential.`,
        },
      };
    },
    steps(p) {
      const k = co2Calc(p);
      return [
        { title: 'Electric discharge excites N₂', text: `A high-voltage DC discharge drives electrons through the CO₂ : N₂ : He = ${p.mix} gas. Electron impacts raise N₂ molecules to their first vibrational level v = 1 (≈ ${CO2LV.n2v1} eV).` },
        { title: 'N₂ (v = 1) stores the energy', text: 'N₂ has no electric dipole, so v = 1 cannot decay by emitting light — it is metastable and acts as an energy reservoir.' },
        { title: 'Resonant collision: N₂ → CO₂ (001)', text: `N₂(v=1) + CO₂(000) → N₂(v=0) + CO₂(001). The two levels differ by only ${fmt(k.dE, 2)} eV, so energy transfer is very efficient. Many CO₂ molecules reach the asymmetric-stretch level 001: population inversion.` },
        { title: `Laser transition at ${k.lamUm} µm`, text: `Stimulated emission 001 → ${k.line96 ? '020' : '100'} releases photons of E = hc/λ = ${fmt(k.EeV, 3)} eV. The mirrors send them back and forth so each pass is amplified.` },
        { title: 'Helium empties the lower level and cools the gas', text: `Collisions with light He atoms de-excite 100/020 → 010 → 000 and carry heat to the tube wall. At ${p.tgas} K only ${sci(k.boltz, 2)} of molecules sit in the lower level by heat alone.` },
        { title: 'Infrared beam leaves through the ZnSe window', text: `Glass absorbs 10 µm light, so the output coupler is ZnSe (or Ge). Output ≈ η × P_in = ${p.eff} % × ${p.pin} W ≈ ${fmt(k.Pout, 3)} W of invisible ${k.lamUm} µm radiation.` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1); const k = co2Calc(p);
      D.clear(g, '#ffffff');
      T(g, `CO₂ laser tube — CO₂ : N₂ : He = ${p.mix}`, 20, 26, { size: 20, weight: 800 });
      // Tube
      const tx0 = 95, tx1 = 905, ty0 = 58, ty1 = 150; const tyc = (ty0 + ty1) / 2;
      D.rect(g, tx0, ty0, tx1 - tx0, ty1 - ty0, { fill: '#f1f5ff', stroke: '#64748b', width: 2.5, r: 22 });
      D.rect(g, tx0 + 4, ty0 + 4, tx1 - tx0 - 8, ty1 - ty0 - 8, { fill: '#ede9fe', r: 18, alpha: 0.35 + 0.15 * Math.sin(t * 6) });
      // mirrors
      D.rect(g, 70, 48, 14, 112, { fill: '#d4a017', stroke: '#92400e', width: 1.5, r: 3 });
      D.rect(g, 916, 48, 14, 112, { fill: '#fde68a', stroke: '#b45309', width: 1.5, r: 3, alpha: 0.9 });
      // electrodes
      D.rect(g, 130, ty1 - 2, 40, 12, { fill: '#475569', r: 3 }); D.rect(g, 830, ty1 - 2, 40, 12, { fill: '#475569', r: 3 });
      T(g, 'Cathode (−)', 150, 176, { size: 16, align: 'center', color: C.muted, weight: 700 });
      T(g, 'Anode (+)', 850, 176, { size: 16, align: 'center', color: C.muted, weight: 700 });
      T(g, 'DC high-voltage discharge  →  electrons', 500, 176, { size: 16, align: 'center', color: C.violet, weight: 700 });
      T(g, 'Total reflector', 20, 198, { size: 16, color: '#92400e', weight: 700 });
      T(g, 'ZnSe output coupler', 980, 198, { size: 16, color: '#b45309', weight: 700, align: 'right' });
      // molecules (counts follow the mixture ratio)
      const N = 30; const sum = k.mix[0] + k.mix[1] + k.mix[2];
      const nC = Math.round((N * k.mix[0]) / sum), nN = Math.round((N * k.mix[1]) / sum);
      for (let i = 0; i < N; i++) {
        const x = tx0 + 40 + (i + 0.5) * ((tx1 - tx0 - 80) / N) + (rnd(i) - 0.5) * 18 + 6 * Math.sin(t * 1.3 + i);
        const y = ty0 + 22 + rnd(i + 50) * (ty1 - ty0 - 44) + 5 * Math.cos(t * 1.1 + i * 2);
        const idx = (i * 7) % N; const kind = idx < nC ? 'C' : idx < nC + nN ? 'N' : 'He';
        const exN = step >= 1 || (step === 0 && rnd(i + 9) < prog);
        if (kind === 'C') {
          if (step >= 2 && step !== 4) D.circle(g, x, y, 17, { fill: '#fed7aa', alpha: 0.8 });
          const a = step >= 2 ? 3 * Math.sin(t * 14 + i) : 0;
          D.atom(g, x - 11 + a, y, 5.5, C.red); D.atom(g, x - a, y, 6, '#334155'); D.atom(g, x + 11 + a, y, 5.5, C.red);
        } else if (kind === 'N') {
          if (exN && step <= 2) D.circle(g, x, y, 15, { fill: '#a5f3fc', alpha: 0.85 });
          const a = exN ? 2 * Math.sin(t * 16 + i) : 0;
          D.atom(g, x - 5 - a, y, 6, C.blue); D.atom(g, x + 5 + a, y, 6, C.blue);
        } else {
          if (step === 4) D.circle(g, x, y, 11, { fill: '#cbd5e1' });
          D.atom(g, x, y, 4.5, '#94a3b8');
        }
      }
      // electrons
      if (step <= 1) for (let i = 0; i < 10; i++) { const x = tx0 + 20 + ((t * 160 + i * 83) % (tx1 - tx0 - 40)); const y = ty0 + 16 + rnd(i + 3) * (ty1 - ty0 - 32); D.circle(g, x, y, 3.5, { fill: C.violet }); }
      // stimulated photons + beam
      const IR = '#991b1b';
      if (step >= 3) {
        const n = step === 3 ? Math.ceil(1 + prog * 6) : 7;
        for (let i = 0; i < n; i++) { const dir = i % 2 ? -1 : 1; const s = ((t * 0.35 + i / 7) % 1); const x = dir > 0 ? tx0 + 40 + s * (tx1 - tx0 - 80) : tx1 - 40 - s * (tx1 - tx0 - 80); D.photon(g, x, tyc + (i - 3) * 7, dir > 0 ? 0 : Math.PI, { color: IR, len: 40, amp: 5 }); }
      }
      if (step >= 5) {
        const f = step === 5 ? prog : 1;
        D.line(g, 930, tyc, 930 + 60 * f, tyc, { color: IR, width: 9, alpha: 0.85 });
        if (f > 0.9) D.arrow(g, 930, tyc, 992, tyc, { color: IR, width: 9, head: 18 });
        D.tag(g, `IR beam ${k.lamUm} µm  ·  P ≈ ${fmt(k.Pout, 3)} W`, 980, 26, { bg: IR, size: 17, align: 'right' });
      }
      if (step === 0) D.focus(g, tx0, ty0, tx1 - tx0, ty1 - ty0, t);
      if (step === 5) D.focus(g, 905, 50, 90, 110, t);

      // ── Energy level diagram
      panel(g, 20, 212, 610, 338, 'Energy levels (approximate values)');
      const Ey = (E) => 520 - E * 860;
      const lv = (x1, x2, E, color, w) => D.line(g, x1, Ey(E), x2, Ey(E), { color, width: w || 4 });
      lv(60, 170, 0, C.blue); lv(60, 170, CO2LV.n2v1, C.blue, step === 1 || step === 2 ? 7 : 4);
      T(g, 'v = 0', 115, Ey(0) - 14, { size: 16, align: 'center', color: C.blue, weight: 700 });
      T(g, `v = 1  ${CO2LV.n2v1} eV`, 115, Ey(CO2LV.n2v1) + 18, { size: 16, align: 'center', color: C.blue, weight: 800 });
      lv(270, 480, 0, C.ink); T(g, '000  0 eV', 488, Ey(0), { size: 16, weight: 700 });
      lv(270, 480, CO2LV.c001, C.red, step === 2 || step === 3 ? 7 : 4); T(g, `001  ${CO2LV.c001} eV`, 488, Ey(CO2LV.c001), { size: 16, weight: 800, color: C.red });
      lv(270, 350, CO2LV.c100, C.ink); T(g, `100  ${CO2LV.c100} eV`, 262, Ey(CO2LV.c100), { size: 16, weight: 700, align: 'right' });
      lv(400, 480, CO2LV.c020, C.ink); T(g, `020  ${CO2LV.c020} eV`, 488, Ey(CO2LV.c020) + 4, { size: 16, weight: 700 });
      lv(400, 480, CO2LV.c010, C.ink); T(g, `010  ${CO2LV.c010} eV`, 488, Ey(CO2LV.c010), { size: 16, weight: 700 });
      T(g, 'N₂', 115, 537, { size: 18, weight: 800, align: 'center', color: C.blue });
      T(g, 'CO₂', 375, 537, { size: 18, weight: 800, align: 'center', color: C.red });
      // step 0: electron impact
      { const f = step === 0 ? Math.max(0.1, prog) : 1; D.arrow(g, 115, Ey(0) - 4, 115, Ey(0) - 4 - (Ey(0) - Ey(CO2LV.n2v1) - 8) * f, { color: C.violet, width: 4, head: 14 }); T(g, 'e⁻ impact', 125, 405, { size: 16, color: C.violet, weight: 800 }); }
      if (step === 0) D.focus(g, 60, 300, 150, 220, t);
      if (step === 1) { D.tag(g, 'metastable', 115, 322, { bg: C.blue, size: 16, align: 'center' }); D.focus(g, 56, Ey(CO2LV.n2v1) - 12, 118, 40, t); }
      if (step >= 2) {
        const f = step === 2 ? Math.max(0.1, prog) : 1;
        D.arrow(g, 172, Ey(CO2LV.n2v1), 172 + 96 * f, Ey(CO2LV.c001), { color: C.green, width: 3.5, dash: [7, 5], head: 12 });
        T(g, `ΔE ≈ ${fmt(k.dE, 2)} eV`, 220, 250, { size: 16, align: 'center', color: C.green, weight: 800 });
        if (step === 2) D.focus(g, 160, 238, 120, 44, t);
      }
      if (step >= 3) {
        const x = k.line96 ? 440 : 310; const y2 = Ey(k.Elow);
        const f = step === 3 ? Math.max(0.15, prog) : 1;
        wavy(g, x, Ey(CO2LV.c001) + 4, x, Ey(CO2LV.c001) + 4 + (y2 - Ey(CO2LV.c001) - 8) * f, IR, { amp: 6, wl: 14, width: 3.5 });
        T(g, `${k.lamUm} µm`, x + 12, (Ey(CO2LV.c001) + y2) / 2, { size: 17, color: IR, weight: 800, halo: true });
        if (step === 3) D.focus(g, x - 20, Ey(CO2LV.c001) - 8, 110, y2 - Ey(CO2LV.c001) + 16, t);
      }
      if (step >= 4) {
        D.arrow(g, 330, Ey(CO2LV.c100) + 4, 430, Ey(CO2LV.c010) - 5, { color: C.muted, width: 2.5, dash: [5, 5], head: 10 });
        D.arrow(g, 445, Ey(CO2LV.c020) + 5, 445, Ey(CO2LV.c010) - 5, { color: C.muted, width: 2.5, dash: [5, 5], head: 10 });
        D.arrow(g, 470, Ey(CO2LV.c010) + 5, 470, Ey(0) - 5, { color: C.muted, width: 2.5, dash: [5, 5], head: 10 });
        D.tag(g, 'He collisions empty lower levels', 350, 488, { bg: '#64748b', size: 16, align: 'center' });
        if (step === 4) D.focus(g, 225, 360, 265, 150, t);
      }
      // ── Vibrational modes
      panel(g, 645, 212, 335, 338, 'Vibrational modes');
      const rows = [
        { y: 280, a: 'Symmetric stretch (ν₁)', b: '100: lower level', m: 'sym', on: (step === 3 && !k.line96) || step === 4 },
        { y: 355, a: 'Bending (ν₂)', b: '010, 020 levels', m: 'bend', on: (step === 3 && k.line96) || step === 4 },
        { y: 430, a: 'Asymmetric stretch (ν₃)', b: '001: upper level', m: 'asym', on: step === 2 || step === 3 },
        { y: 505, a: 'N₂ stretch', b: 'v = 1: stores energy', m: 'n2', on: step <= 2 },
      ];
      rows.forEach((r) => {
        if (r.on) D.rect(g, 652, r.y - 34, 321, 68, { fill: C.amberSoft, r: 8 });
        T(g, r.a, 660, r.y - 12, { size: 16, weight: 800 }); T(g, r.b, 660, r.y + 12, { size: 16, color: C.muted, weight: 700 });
        const cx = 925; const s = Math.sin(t * 8);
        if (r.m === 'n2') { D.atom(g, cx - 11 - 4 * s, r.y, 9, C.blue); D.atom(g, cx + 11 + 4 * s, r.y, 9, C.blue); return; }
        const oL = [cx - 26, r.y], cC = [cx, r.y], oR = [cx + 26, r.y];
        if (r.m === 'sym') { oL[0] -= 6 * s; oR[0] += 6 * s; }
        if (r.m === 'bend') { oL[1] += 6 * s; oR[1] += 6 * s; cC[1] -= 10 * s; }
        if (r.m === 'asym') { oL[0] += 5 * s; oR[0] += 5 * s; cC[0] -= 9 * s; }
        D.line(g, oL[0], oL[1], cC[0], cC[1], { color: C.faint, width: 3 }); D.line(g, oR[0], oR[1], cC[0], cC[1], { color: C.faint, width: 3 });
        D.atom(g, oL[0], oL[1], 8.5, C.red); D.atom(g, cC[0], cC[1], 9.5, '#334155'); D.atom(g, oR[0], oR[1], 8.5, C.red);
      });
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 2. Semiconductor laser
  // ─────────────────────────────────────────────────────────────
  const SC = {
    GaAs: { name: 'GaAs', Eg: 1.42 },
    AlGaAs: { name: 'Al₀.₃Ga₀.₇As', Eg: 1.80 },
    InGaAsP: { name: 'InGaAsP', Eg: 0.95 },
    InGaN: { name: 'InGaN', Eg: 2.70 },
  };
  const SPONT = 0.01; // illustrative fraction of injected carriers giving out-coupled spontaneous photons
  function scCalc(p) {
    const m = SC[p.mat] || SC.GaAs; const lam = HC_EVNM / m.Eg; const EJ = m.Eg * QE; const nu = CL / (lam * 1e-9);
    const above = p.I > p.ith;
    const Pst = above ? p.etad * m.Eg * (p.I - p.ith) : 0; // mW (V × mA)
    const Psp = SPONT * m.Eg * Math.min(p.I, p.ith);
    const Ptot = Pst + Psp;
    const rate = (Ptot * 1e-3) / EJ;
    return { m, lam, EJ, nu, above, Pst, Psp, Ptot, rate, color: D.wavelengthColor(lam), band: lam > 700 ? 'infrared (invisible)' : lam < 400 ? 'ultraviolet' : 'visible' };
  }
  S['ep-semiconductor-laser'] = {
    approx: 'Below threshold the weak spontaneous (LED-like) output is drawn as ≈1 % of the injected electron–hole pairs escaping as light — an illustrative value. Above threshold P = η_d (hν/e)(I − I_th) is the standard linear L–I model; real curves bend over at high current because of heating. Band gaps are room-temperature values (InGaAsP and InGaN depend on composition).',
    params: [
      { key: 'mat', label: 'Active material', type: 'select', default: 'GaAs', options: [{ value: 'GaAs', label: 'GaAs (Eg = 1.42 eV)' }, { value: 'AlGaAs', label: 'Al₀.₃Ga₀.₇As (Eg ≈ 1.80 eV)' }, { value: 'InGaAsP', label: 'InGaAsP (Eg ≈ 0.95 eV, 1.3 µm)' }, { value: 'InGaN', label: 'InGaN (Eg ≈ 2.70 eV, blue)' }] },
      { key: 'I', label: 'Drive current I', type: 'range', min: 0, max: 150, step: 1, default: 60, unit: 'mA' },
      { key: 'ith', label: 'Threshold current I_th', type: 'range', min: 5, max: 80, step: 1, default: 25, unit: 'mA', help: 'Current at which optical gain equals the cavity losses.' },
      { key: 'etad', label: 'Slope efficiency η_d', type: 'range', min: 0.1, max: 0.9, step: 0.05, default: 0.5, help: 'Fraction of the extra injected electrons (above threshold) that give output photons.' },
    ],
    examples: [
      { label: 'CD-player style GaAs laser', values: { mat: 'GaAs', I: 50, ith: 30, etad: 0.5 } },
      { label: 'Red AlGaAs laser diode', values: { mat: 'AlGaAs', I: 40, ith: 25, etad: 0.4 } },
      { label: '1.3 µm telecom InGaAsP laser', values: { mat: 'InGaAsP', I: 40, ith: 12, etad: 0.3 } },
      { label: 'Blue InGaN diode, below threshold', values: { mat: 'InGaN', I: 25, ith: 35, etad: 0.6 } },
    ],
    validate: () => [],
    compute(p) {
      const k = scCalc(p);
      const formulas = [
        { name: 'Emission wavelength', formula: 'λ = hc / E_g', given: `E_g = ${k.m.Eg} eV = ${sci(k.EJ, 4)} J, h = 6.626 × 10⁻³⁴ J·s, c = 2.998 × 10⁸ m/s`,
          calc: `λ = (6.626 × 10⁻³⁴ × 2.998 × 10⁸) / ${sci(k.EJ, 4)} = ${fmt(HC_EVNM, 5)} eV·nm / ${k.m.Eg} eV`, result: fmt(k.lam, 4), unit: 'nm' },
        { name: 'Frequency', formula: 'ν = c / λ', given: `λ = ${fmt(k.lam, 4)} nm`, calc: `ν = 2.998 × 10⁸ / (${fmt(k.lam, 4)} × 10⁻⁹)`, result: sci(k.nu, 3), unit: 'Hz' },
        { name: 'Threshold condition', formula: 'Lasing when I > I_th (gain ≥ loss)', given: `I = ${p.I} mA, I_th = ${p.ith} mA`, calc: `${p.I} ${k.above ? '>' : '≤'} ${p.ith}`, result: k.above ? 'LASING (stimulated emission)' : 'Below threshold (spontaneous, LED-like)', unit: '—' },
        { name: 'Laser output power', formula: 'P = η_d (hν / e)(I − I_th)', given: `η_d = ${p.etad}, hν/e = ${k.m.Eg} V, I − I_th = ${p.I - p.ith} mA`,
          calc: k.above ? `P = ${p.etad} × ${k.m.Eg} V × ${p.I - p.ith} mA` : 'I ≤ I_th → no stimulated output (P = 0)', result: fmt(k.Pst, 3), unit: 'mW' },
        { name: 'Photons emitted per second', formula: 'N = P_total / (hν)', given: `P_total = ${fmt(k.Ptot, 3)} mW (incl. ≈ ${fmt(k.Psp, 2)} mW spontaneous, illustrative)`, calc: `N = ${fmt(k.Ptot, 3)} × 10⁻³ / ${sci(k.EJ, 4)}`, result: sci(k.rate, 3), unit: 'photons/s' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'λ = hc/Eg', value: `${fmt(k.lam, 4)} nm`, tone: 'info' },
          { label: 'I vs I_th', value: `${p.I} / ${p.ith} mA` },
          { label: 'Laser power', value: `${fmt(k.Pst, 3)} mW`, tone: k.above ? 'good' : undefined },
          { label: 'Mode', value: k.above ? 'LASER' : 'LED-like', tone: k.above ? 'good' : 'warn' },
        ],
        state: { material: k.m.name, bandGap: `${k.m.Eg} eV`, wavelength: `${fmt(k.lam, 4)} nm (${k.band})`, current: `${p.I} mA`, thresholdCurrent: `${p.ith} mA`, slopeEfficiency: p.etad, laserPower: `${fmt(k.Pst, 3)} mW`, lasing: k.above ? 'YES' : 'NO' },
        explain: {
          what: k.above ? `A current of ${p.I} mA (above I_th = ${p.ith} mA) floods the ${k.m.name} active region with electrons and holes. Stimulated emission builds a coherent beam of ${fmt(k.lam, 4)} nm (${k.band}) light, ${fmt(k.Pst, 3)} mW, from the cleaved facet.` : `The current ${p.I} mA is below the threshold ${p.ith} mA. Electrons and holes recombine at random, giving only weak spontaneous light (≈ ${fmt(k.Psp, 2)} mW, like an LED).`,
          why: `In a direct band-gap semiconductor an electron dropping from the conduction band to the valence band releases a photon with hν ≈ E_g = ${k.m.Eg} eV, so λ = hc/E_g. Lasing needs enough injected carriers (population inversion) so that gain beats the losses of the facet mirrors.`,
          param: 'Material (band gap), drive current I, threshold current I_th and slope efficiency η_d.',
          effect: `A larger band gap gives a shorter wavelength. Above threshold every extra mA adds η_d·(hν/e) = ${fmt(p.etad * k.m.Eg, 3)} mW of light; a lower I_th means the laser starts at a smaller current.`,
        },
      };
    },
    steps(p) {
      const k = scCalc(p);
      return [
        { title: 'Structure: p–n junction with cleaved facets', text: `A heavily doped p–n junction of ${k.m.name}. The two end faces are cleaved crystal planes; they act as partial mirrors (R ≈ 0.3) and form the optical cavity.` },
        { title: 'Forward bias injects electrons and holes', text: `Current I = ${p.I} mA flows: electrons come from the n-side, holes from the p-side, and both enter the thin active region at the junction.` },
        { title: 'Recombination → spontaneous emission', text: `An electron meets a hole and falls across the gap, releasing a photon of hν ≈ E_g = ${k.m.Eg} eV in a random direction (LED behaviour).` },
        { title: 'Threshold: population inversion', text: k.above ? `I = ${p.I} mA > I_th = ${p.ith} mA: the active region holds more electrons in the conduction band than empty states can absorb — gain exceeds loss.` : `I = ${p.I} mA ≤ I_th = ${p.ith} mA: not enough carriers yet, the losses win and no laser action occurs.` },
        { title: k.above ? 'Stimulated emission — laser beam' : 'Only weak incoherent light', text: k.above ? `Photons travelling along the junction stimulate more identical photons, bounce between the facets and leave as a beam of λ = hc/E_g = ${fmt(k.lam, 4)} nm.` : 'Light comes out weakly in all directions; the output is not coherent.' },
        { title: 'L–I characteristic', text: `P = η_d (hν/e)(I − I_th) = ${p.etad} × ${k.m.Eg} V × ${Math.max(0, p.I - p.ith)} mA = ${fmt(k.Pst, 3)} mW. The kink at I_th is the signature of a laser.` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1); const k = scCalc(p);
      D.clear(g, '#ffffff');
      const col = k.lam > 700 ? '#b91c1c' : k.color;
      // ── Device (side view)
      const x0 = 70, x1 = 430; const yc0 = 70, yp = 84, ya = 150, yn = 170, yb = 236, yc1 = 250;
      const dx = 30, dy = -22;
      D.poly(g, [[x0, yc0], [x1, yc0], [x1 + dx, yc0 + dy], [x0 + dx, yc0 + dy]], { fill: '#94a3b8', close: true, stroke: '#475569', width: 1.5 });
      D.poly(g, [[x1, yc0], [x1 + dx, yc0 + dy], [x1 + dx, yc1 + dy], [x1, yc1]], { fill: '#e2e8f0', close: true, stroke: '#475569', width: 1.5 });
      D.rect(g, x0, yc0, x1 - x0, yp - yc0, { fill: '#94a3b8' });
      D.rect(g, x0, yp, x1 - x0, ya - yp, { fill: '#fecaca' });
      D.rect(g, x0, ya, x1 - x0, yn - ya, { fill: k.above && step >= 3 ? '#fde047' : '#fef08a' });
      D.rect(g, x0, yn, x1 - x0, yb - yn, { fill: '#bfdbfe' });
      D.rect(g, x0, yb, x1 - x0, yc1 - yb, { fill: '#94a3b8' });
      D.rect(g, x0, yc0, x1 - x0, yc1 - yc0, { stroke: '#475569', width: 2 });
      T(g, `p-type ${k.m.name}`, x0 + 14, (yp + ya) / 2 - 12, { size: 17, weight: 800, color: '#991b1b' });
      T(g, `n-type ${k.m.name}`, x0 + 14, (yn + yb) / 2 + 12, { size: 17, weight: 800, color: '#1e3a8a' });
      D.tag(g, 'Active region', x0 + 170, (ya + yn) / 2, { bg: '#a16207', size: 16, align: 'center' });
      T(g, 'Cleaved facet', x0 - 10, 272, { size: 16, weight: 700, color: '#0369a1' });
      T(g, 'Cleaved facet', x1 + 20, 272, { size: 16, weight: 700, color: '#0369a1', align: 'right' });
      D.line(g, x0, yc0, x0, yc1, { color: '#0ea5e9', width: 5 }); D.line(g, x1, yc0, x1, yc1, { color: '#0ea5e9', width: 5 });
      // bias circuit
      D.line(g, 250, yc0 + dy / 2, 250, 22, { color: C.ink, width: 2 }); D.line(g, 250, 22, 30, 22, { color: C.ink, width: 2 }); D.line(g, 30, 22, 30, 290, { color: C.ink, width: 2 }); D.line(g, 30, 290, 250, 290, { color: C.ink, width: 2 }); D.line(g, 250, 290, 250, yc1, { color: C.ink, width: 2 });
      D.tag(g, `+  forward bias, I = ${p.I} mA`, 140, 22, { bg: C.red, size: 16, align: 'center' });
      T(g, '−', 44, 306, { size: 20, weight: 800 });
      // carriers
      const ac = (ya + yn) / 2;
      if (step >= 1) {
        const nC = Math.round(4 + p.I / 12);
        for (let i = 0; i < nC; i++) {
          const x = x0 + 25 + rnd(i) * (x1 - x0 - 50); const ph = (t * 0.6 + rnd(i + 20)) % 1;
          D.circle(g, x, yb - 8 - ph * (yb - yn - 4), 5, { fill: C.blue });
          D.circle(g, x + 12, yp + 8 + ph * (ya - yp - 4), 5, { fill: '#fff', stroke: C.red, width: 2.5 });
        }
        if (step === 1) {
          D.arrow(g, 480, yb, 480, yn + 4, { color: C.blue, width: 3 }); D.arrow(g, 480, yp + 4, 480, ya - 4, { color: C.red, width: 3 });
          T(g, 'e⁻ ↑', 492, yb - 20, { size: 17, color: C.blue, weight: 800 }); T(g, 'holes ↓', 492, yp + 20, { size: 17, color: C.red, weight: 800 });
          D.focus(g, x0, yc0, x1 - x0, yc1 - yc0, t);
        }
      }
      if (step >= 2 && !(k.above && step >= 4)) {
        for (let i = 0; i < 6; i++) { const x = x0 + 40 + rnd(i + 70) * (x1 - x0 - 80); const a = rnd(i + 90) * Math.PI * 2; const s = ((t * 0.8 + i / 6) % 1);
          D.photon(g, x + Math.cos(a) * s * 60, ac + Math.sin(a) * s * 60, a, { color: col, len: 28, amp: 4, wavelength: 10, alpha: 1 - s * 0.8 }); }
      }
      if (step === 2) D.focus(g, x0, ya - 4, x1 - x0, yn - ya + 8, t);
      // beam
      if (step >= 4 && k.above) {
        for (let i = 0; i < 4; i++) { const s = ((t * 0.5 + i / 4) % 1); const dir = i % 2 ? -1 : 1; D.photon(g, dir > 0 ? x0 + 30 + s * 300 : x1 - 30 - s * 300, ac, dir > 0 ? 0 : Math.PI, { color: col, len: 34, amp: 4, wavelength: 10 }); }
        const f = step === 4 ? Math.max(0.1, prog) : 1; const L = 170 * f; const wB = 2 + clamp(k.Pst / 10, 0, 8);
        D.poly(g, [[x1, ac - 4], [x1 + L, ac - 4 - wB - L * 0.12], [x1 + L, ac + 4 + wB + L * 0.12], [x1, ac + 4]], { fill: col, close: true, stroke: false, alpha: 0.55 });
        if (f > 0.9) D.arrow(g, x1 + 10, ac, x1 + L + 8, ac, { color: col, width: 4, head: 14 });
        D.tag(g, `λ = ${fmt(k.lam, 4)} nm`, 545, 215, { bg: col, size: 17, align: 'center' });
        if (k.lam > 700) T(g, '(infrared — invisible)', 545, 242, { size: 16, align: 'center', color: C.muted, weight: 700 });
        if (step === 4) D.focus(g, x1, ac - 50, 180, 100, t);
      } else if (step >= 4) T(g, 'No beam: I ≤ I_th', 545, 215, { size: 18, align: 'center', color: C.amber, weight: 800 });
      if (step === 0) D.focus(g, x0 - 4, yc0 - 26, x1 - x0 + dx + 8, yc1 - yc0 + 30, t);

      // ── L–I chart
      const Imax = 150; const Pmax = niceMax(p.etad * k.m.Eg * Math.max(10, Imax - p.ith) + SPONT * k.m.Eg * p.ith);
      T(g, 'L–I characteristic', 700, 30, { size: 18, weight: 800 });
      const P = plot(g, 700, 50, 260, 180, { xmin: 0, xmax: Imax, ymin: 0, ymax: Pmax, xt: [0, 50, 100, 150], yt: [0, Pmax / 2, Pmax], xlabel: 'Current I (mA)', ylabel: 'Power P (mW)', yoff: 62 });
      const Lof = (I) => SPONT * k.m.Eg * Math.min(I, p.ith) + (I > p.ith ? p.etad * k.m.Eg * (I - p.ith) : 0);
      const pts = []; for (let I = 0; I <= Imax; I += 1) pts.push([P.X(I), P.Y(Lof(I))]);
      P.clip(); D.poly(g, pts, { stroke: C.blue, width: 3 });
      D.line(g, P.X(p.ith), 50, P.X(p.ith), 230, { color: C.red, width: 2, dash: [6, 5] }); g.restore();
      T(g, 'I_th', P.X(p.ith) + 6, 66, { size: 16, color: C.red, weight: 800 });
      if (step >= 3) { const I = p.I; D.circle(g, P.X(I), P.Y(Lof(I)), 8, { fill: k.above ? C.green : C.amber, stroke: '#fff', width: 2 }); }
      if (step === 3 || step === 5) D.focus(g, 700, 50, 260, 180, t);

      // ── Band diagram
      panel(g, 20, 318, 560, 232, 'Band diagram (forward bias)');
      const CBp = 378, CBn = 412, gapPx = 100; const jx0 = 250, jx1 = 350;
      const band = (off) => { const pts2 = []; for (let x = 40; x <= 560; x += 5) { const s = clamp((x - jx0) / (jx1 - jx0), 0, 1); const e = 0.5 - 0.5 * Math.cos(Math.PI * s); pts2.push([x, CBp + (CBn - CBp) * e + off]); } return pts2; };
      D.poly(g, band(0), { stroke: C.blue, width: 3.5 }); D.poly(g, band(gapPx), { stroke: C.red, width: 3.5 });
      T(g, 'CB', 560, CBn - 18, { size: 16, weight: 800, color: C.blue, align: 'right' }); T(g, 'VB', 46, CBp + gapPx + 18, { size: 16, weight: 800, color: C.red });
      T(g, 'p-side', 110, CBp + gapPx / 2, { size: 17, weight: 800, color: '#991b1b', align: 'center' });
      T(g, 'n-side', 490, CBn + gapPx / 2, { size: 17, weight: 800, color: '#1e3a8a', align: 'center' });
      if (step >= 1) {
        for (let i = 0; i < 7; i++) { const x = 330 + i * 30 - ((t * 25) % 30); if (x < 540) D.circle(g, x, CBn - 7, 5, { fill: C.blue }); }
        for (let i = 0; i < 7; i++) { const x = 270 - i * 30 + ((t * 25) % 30); if (x > 60) D.circle(g, x, CBp + gapPx + 8, 5, { fill: '#fff', stroke: C.red, width: 2.5 }); }
      }
      if (step >= 2) {
        const x = 300; const yT = (CBp + CBn) / 2; const yB = yT + gapPx;
        D.arrow(g, x, yT + 6, x, yB - 6, { color: C.ink, width: 3, head: 12 });
        wavy(g, x + 8, (yT + yB) / 2, x + 90, (yT + yB) / 2 - 20, col, { amp: 5, wl: 12 });
        T(g, `hν = E_g = ${k.m.Eg} eV`, x - 14, (yT + yB) / 2, { size: 17, weight: 800, align: 'right', halo: true });
        if (step === 2) D.focus(g, 180, yT - 6, 230, gapPx + 12, t);
      }
      // ── Result panel
      panel(g, 600, 318, 380, 232, 'Result');
      row(g, 616, 362, 348, 'Band gap E_g', `${k.m.Eg} eV`);
      row(g, 616, 392, 348, 'λ = hc / E_g', `${fmt(k.lam, 4)} nm`);
      D.rect(g, 616, 410, 348, 10, { fill: col, r: 4 });
      row(g, 616, 440, 348, 'I  /  I_th', `${p.I} mA / ${p.ith} mA`);
      row(g, 616, 470, 348, 'Laser power P', `${fmt(k.Pst, 3)} mW`, k.above ? C.green : C.muted);
      D.tag(g, k.above ? 'LASING — stimulated emission' : 'Below threshold — LED-like', 790, 516, { bg: k.above ? C.green : C.amber, size: 17, align: 'center' });
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 3. Laser material processing
  // ─────────────────────────────────────────────────────────────
  const MAT = {
    steel: { name: 'Mild steel', A: { co2: 0.12, fiber: 0.35 }, col: '#94a3b8' },
    al: { name: 'Aluminium', A: { co2: 0.03, fiber: 0.08 }, col: '#cbd5e1' },
    cu: { name: 'Copper', A: { co2: 0.02, fiber: 0.05 }, col: '#f59e0b' },
    acrylic: { name: 'Acrylic (PMMA)', A: { co2: 0.9, fiber: 0.05 }, col: '#bae6fd' },
  };
  const WIN = { weld: [1e5, 1e7], cut: [1e6, 1e8], drill: [1e6, 1e8] };
  const PROC = { cut: 'Cutting', weld: 'Welding', drill: 'Drilling' };
  function mpCalc(p) {
    const mode = PROC[p.mode] ? p.mode : 'cut'; const m = MAT[p.mat] || MAT.steel; const A = m.A[p.laser] || 0.1;
    const wcm = (p.d * 1e-4) / 2; const area = Math.PI * wcm * wcm; const I = p.P / area; const Iabs = A * I;
    const EL = p.P / p.v; const tau = (p.d * 1e-3) / p.v; const Ep = p.P * p.tp * 1e-3; const F = Ep / area;
    const win = WIN[mode]; const logI = Math.log10(I);
    const status = I < win[0] ? 'below' : I > win[1] ? 'above' : 'in';
    return { mode, m, A, wcm, area, I, Iabs, EL, tau, Ep, F, win, logI, status, lamTxt: p.laser === 'co2' ? '10.6 µm' : '1.07 µm' };
  }
  S['ep-material-processing'] = {
    approx: 'Absorptivities are indicative values for a clean, flat surface at room temperature; during processing absorption rises strongly (oxide, melt, keyhole). Process windows (welding ≈ 10⁵–10⁷ W/cm², cutting and drilling ≈ 10⁶–10⁸ W/cm²) are indicative orders of magnitude only. The intensity uses a uniform (top-hat) spot I = P/(πw²). The heat-affected zone is drawn qualitatively.',
    modes: [{ key: 'cut', label: 'Cutting' }, { key: 'weld', label: 'Welding' }, { key: 'drill', label: 'Drilling' }],
    params: [
      { key: 'laser', label: 'Laser', type: 'select', default: 'fiber', options: [{ value: 'fiber', label: 'Fibre laser (1.07 µm)' }, { value: 'co2', label: 'CO₂ laser (10.6 µm)' }] },
      { key: 'mat', label: 'Material', type: 'select', default: 'steel', options: [{ value: 'steel', label: 'Mild steel' }, { value: 'al', label: 'Aluminium' }, { value: 'cu', label: 'Copper' }, { value: 'acrylic', label: 'Acrylic (PMMA)' }] },
      { key: 'P', label: 'Laser power P', type: 'range', min: 10, max: 6000, step: 10, default: 2000, unit: 'W' },
      { key: 'd', label: 'Focused spot diameter d', type: 'range', min: 20, max: 1000, step: 10, default: 100, unit: 'µm' },
      { key: 'v', label: 'Scan speed v', type: 'range', min: 1, max: 200, step: 1, default: 50, unit: 'mm/s', showIf: (p) => p.mode !== 'drill' },
      { key: 'tp', label: 'Pulse (dwell) duration', type: 'range', min: 0.1, max: 20, step: 0.1, default: 1, unit: 'ms', showIf: (p) => p.mode === 'drill' },
    ],
    examples: [
      { label: 'Fibre laser on mild steel (2 kW, 100 µm)', values: { laser: 'fiber', mat: 'steel', P: 2000, d: 100, v: 50, tp: 1 } },
      { label: 'CO₂ laser on acrylic sheet (100 W, 200 µm)', values: { laser: 'co2', mat: 'acrylic', P: 100, d: 200, v: 20, tp: 2 } },
      { label: 'Fibre laser, wide spot (1.5 kW, 600 µm)', values: { laser: 'fiber', mat: 'steel', P: 1500, d: 600, v: 25, tp: 5 } },
      { label: 'Copper with a CO₂ laser (poor absorption)', values: { laser: 'co2', mat: 'cu', P: 1000, d: 200, v: 20, tp: 1 } },
    ],
    validate(p) {
      const w = [];
      if (p.mat === 'acrylic' && p.laser === 'fiber') w.push('Acrylic is almost transparent at 1.07 µm — most of the fibre-laser beam passes through. Use a CO₂ laser (strongly absorbed at 10.6 µm).');
      if ((p.mat === 'cu' || p.mat === 'al') && p.laser === 'co2') w.push(`${MAT[p.mat].name} reflects about ${fmt(100 - 100 * MAT[p.mat].A.co2, 2)} % of 10.6 µm light at room temperature — processing is very difficult (fibre or green lasers are preferred).`);
      return w;
    },
    compute(p) {
      const k = mpCalc(p); const mode = k.mode;
      const formulas = [
        { name: 'Beam intensity (irradiance)', formula: 'I = P / (π w²),  w = d / 2', given: `P = ${p.P} W, d = ${p.d} µm → w = ${fmt(k.wcm, 3)} cm`,
          calc: `I = ${p.P} / (π × (${fmt(k.wcm, 3)})²) = ${p.P} / ${sci(k.area, 3)} cm²`, result: sci(k.I, 3), unit: 'W/cm²' },
        { name: 'Absorbed intensity', formula: 'I_abs = A × I', given: `A ≈ ${k.A} (${k.m.name}, ${k.lamTxt}, indicative)`, calc: `I_abs = ${k.A} × ${sci(k.I, 3)}`, result: sci(k.Iabs, 3), unit: 'W/cm²' },
      ];
      if (mode === 'drill') {
        formulas.push({ name: 'Pulse energy', formula: 'E = P × t', given: `P = ${p.P} W, t = ${p.tp} ms`, calc: `E = ${p.P} × ${p.tp} × 10⁻³`, result: fmt(k.Ep, 3), unit: 'J' });
        formulas.push({ name: 'Fluence on the spot', formula: 'F = E / (π w²)', given: `E = ${fmt(k.Ep, 3)} J, area = ${sci(k.area, 3)} cm²`, calc: `F = ${fmt(k.Ep, 3)} / ${sci(k.area, 3)}`, result: sci(k.F, 3), unit: 'J/cm²' });
      } else {
        formulas.push({ name: 'Line energy (heat input per length)', formula: 'E_L = P / v', given: `P = ${p.P} W, v = ${p.v} mm/s`, calc: `E_L = ${p.P} / ${p.v}`, result: fmt(k.EL, 3), unit: 'J/mm' });
        formulas.push({ name: 'Interaction time', formula: 'τ = d / v', given: `d = ${p.d} µm = ${fmt(p.d * 1e-3, 3)} mm, v = ${p.v} mm/s`, calc: `τ = ${fmt(p.d * 1e-3, 3)} / ${p.v} s`, result: fmt(k.tau * 1000, 3), unit: 'ms' });
      }
      formulas.push({ name: `Compare with ${PROC[mode].toLowerCase()} window (indicative)`, formula: `${pow10(Math.log10(k.win[0]))} ≤ I ≤ ${pow10(Math.log10(k.win[1]))} W/cm²`, given: `I = ${sci(k.I, 3)} W/cm²`,
        calc: k.status === 'in' ? 'I lies inside the indicative range' : k.status === 'below' ? 'I is below the range' : 'I is above the range', result: k.status === 'in' ? 'Suitable' : k.status === 'below' ? 'Too low' : 'Too high', unit: '—' });
      const statusTxt = k.status === 'in' ? `inside the indicative ${PROC[mode].toLowerCase()} range` : k.status === 'below' ? `below the indicative ${PROC[mode].toLowerCase()} range — the surface mainly heats up` : `above the indicative ${PROC[mode].toLowerCase()} range — strong vaporisation / plasma`;
      return {
        formulas,
        readouts: [
          { label: 'Intensity I', value: `${sci(k.I, 3)} W/cm²`, tone: 'info' },
          { label: 'Absorbed', value: `${fmt(k.A * 100, 2)} %` },
          mode === 'drill' ? { label: 'Pulse energy', value: `${fmt(k.Ep, 3)} J` } : { label: 'Line energy', value: `${fmt(k.EL, 3)} J/mm` },
          { label: PROC[mode], value: k.status === 'in' ? 'in window' : k.status === 'below' ? 'too low' : 'too high', tone: k.status === 'in' ? 'good' : 'warn' },
        ],
        state: { process: PROC[mode], laser: p.laser === 'co2' ? 'CO₂ 10.6 µm' : 'Fibre 1.07 µm', material: k.m.name, absorptivity: k.A, power: `${p.P} W`, spotDiameter: `${p.d} µm`, intensity: `${sci(k.I, 3)} W/cm²`, lineEnergy: mode === 'drill' ? '—' : `${fmt(k.EL, 3)} J/mm`, pulseEnergy: mode === 'drill' ? `${fmt(k.Ep, 3)} J` : '—', window: statusTxt },
        explain: {
          what: `${PROC[mode]} ${k.m.name} with a ${p.P} W ${p.laser === 'co2' ? 'CO₂' : 'fibre'} laser focused to ${p.d} µm. The intensity is ${sci(k.I, 3)} W/cm², ${statusTxt}.`,
          why: `Focusing squeezes the power into a tiny area, so I = P/(πw²) becomes enormous. Only the absorbed part (A ≈ ${fmt(k.A * 100, 2)} %) heats the material; ${mode === 'cut' ? 'the melt is blown out by the assist gas, leaving a narrow kerf' : mode === 'weld' ? 'the molten pool joins the two parts and solidifies as the beam moves on' : 'vaporisation pressure expels the melt and the hole deepens'}.`,
          param: 'Laser type (wavelength), material (absorptivity), power, spot size' + (mode === 'drill' ? ' and pulse duration.' : ' and scan speed.'),
          effect: `Halving the spot diameter raises the intensity 4 times. ${mode === 'drill' ? 'A longer pulse delivers more energy and drills deeper.' : 'Slower scanning raises the line energy P/v — deeper penetration but a wider heat-affected zone.'}`,
        },
      };
    },
    steps(p) {
      const k = mpCalc(p); const mode = k.mode;
      const last = mode === 'cut' ? { title: 'Cutting: melt blown out of the kerf', text: `Assist gas (O₂ or N₂) blows the molten material out through the bottom; the beam moves at ${p.v} mm/s leaving a narrow kerf. Line energy ${fmt(k.EL, 3)} J/mm.` }
        : mode === 'weld' ? { title: 'Welding: pool solidifies into a seam', text: `The molten pool bridges the joint and freezes behind the moving beam (v = ${p.v} mm/s), forming the weld bead. Heat input ${fmt(k.EL, 3)} J/mm.` }
          : { title: 'Drilling: vaporisation expels the melt', text: `During the ${p.tp} ms pulse (E = ${fmt(k.Ep, 3)} J) the surface vaporises; the recoil pressure pushes molten material out and the hole deepens.` };
      return [
        { title: 'The lens focuses the beam', text: `A ${p.laser === 'co2' ? 'CO₂ (10.6 µm)' : 'fibre (1.07 µm)'} beam of ${p.P} W is focused by a lens to a spot of d = ${p.d} µm on the workpiece.` },
        { title: 'Tiny spot → enormous intensity', text: `I = P/(πw²) = ${p.P} W / ${sci(k.area, 3)} cm² = ${sci(k.I, 3)} W/cm².` },
        { title: 'Only part of the light is absorbed', text: `${k.m.name} absorbs about ${fmt(k.A * 100, 2)} % at ${k.lamTxt} (cold surface); the rest is reflected. Absorbed intensity ≈ ${sci(k.Iabs, 3)} W/cm².` },
        { title: 'Heating, melting and the heat-affected zone', text: 'The absorbed energy heats a small volume above its melting point. Heat also conducts sideways, forming a heat-affected zone (HAZ) whose properties change.' },
        last,
        { title: 'Check the process window', text: `I = ${sci(k.I, 3)} W/cm² is ${k.status === 'in' ? 'inside' : k.status === 'below' ? 'below' : 'above'} the indicative ${PROC[mode].toLowerCase()} range ${pow10(Math.log10(k.win[0]))}–${pow10(Math.log10(k.win[1]))} W/cm².` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1); const k = mpCalc(p); const mode = k.mode;
      D.clear(g, '#ffffff');
      const beamCol = p.laser === 'co2' ? '#b91c1c' : '#dc2626';
      T(g, `${PROC[mode]} — ${k.m.name}, ${p.laser === 'co2' ? 'CO₂ 10.6 µm' : 'fibre 1.07 µm'}`, 20, 26, { size: 20, weight: 800 });
      // workpiece geometry (pseudo-3D slab)
      const sx0 = 40, sx1 = 510, top = 350, bot = 430, bx = 40, by = -24;
      const surfY = top + by / 2;
      const beamX = mode === 'drill' ? 260 : step === 4 ? 170 + 170 * prog : step === 5 ? 340 : 170;
      const spotPx = clamp(4 + 14 * Math.log10(p.d / 10), 4, 40);
      const mc = k.m.col;
      D.poly(g, [[sx0, top], [sx1, top], [sx1 + bx, top + by], [sx0 + bx, top + by]], { fill: D.shade(mc, 0.35), close: true, stroke: '#475569', width: 1.5 });
      D.rect(g, sx0, top, sx1 - sx0, bot - top, { fill: mc, stroke: '#475569', width: 1.5 });
      D.poly(g, [[sx1, top], [sx1 + bx, top + by], [sx1 + bx, bot + by], [sx1, bot]], { fill: D.shade(mc, -0.15), close: true, stroke: '#475569', width: 1.5 });
      T(g, k.m.name, sx1 - 10, bot - 18, { size: 17, weight: 800, color: '#1e293b', align: 'right' });
      if (mode === 'weld') D.line(g, sx0 + bx / 2, surfY, sx1 + bx / 2, surfY, { color: '#334155', width: 2, dash: [8, 5] });
      const lx = beamX + bx / 2;
      // HAZ + track
      const hazW = clamp(6 + 8 * Math.log10(1 + (mode === 'drill' ? k.Ep * 5 : k.EL * 5)), 6, 34);
      if (step >= 3) {
        if (mode === 'drill') {
          g.save(); g.globalAlpha = 0.6; g.fillStyle = '#fdba74'; g.beginPath(); g.ellipse(lx, surfY, spotPx / 2 + hazW, (spotPx / 2 + hazW) * 0.4, 0, 0, Math.PI * 2); g.fill(); g.restore();
        } else {
          const hh = Math.min(22, (spotPx / 2 + hazW) * 0.4);
          g.save(); g.globalAlpha = 0.55; g.fillStyle = '#fdba74';
          g.beginPath(); g.ellipse(lx, surfY, spotPx / 2 + hazW, hh, 0, 0, Math.PI * 2); g.fill();
          g.fillRect(sx0 + bx / 2 + 10, surfY - hh, lx - sx0 - bx / 2 - 10, hh * 2); g.restore();
          const tw = Math.max(3, Math.min(14, spotPx * 0.4));
          if (mode === 'cut') D.rect(g, sx0 + bx / 2 + 10, surfY - tw / 2, lx - sx0 - bx / 2 - 10, tw, { fill: '#1e293b' });
          else {
            D.rect(g, sx0 + bx / 2 + 10, surfY - tw * 0.7, lx - sx0 - bx / 2 - 10, tw * 1.4, { fill: '#e2e8f0', stroke: '#64748b', width: 1 });
            for (let x = sx0 + bx / 2 + 16; x < lx - 4; x += 9) { g.save(); g.beginPath(); g.ellipse(x, surfY, 3, tw * 0.6, 0, -Math.PI / 2, Math.PI / 2); g.strokeStyle = '#94a3b8'; g.lineWidth = 1.2; g.stroke(); g.restore(); }
          }
        }
        T(g, 'HAZ (qualitative)', sx0, top + by - 20, { size: 16, weight: 800, color: '#c2410c' });
        const pr = spotPx / 2 + 3; g.save(); g.fillStyle = D.heat(0.9); g.beginPath(); g.ellipse(lx, surfY, pr, Math.min(12, pr * 0.45), 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
      if (mode === 'drill' && step >= 4) {
        const depth = (bot - top) * (step === 4 ? prog : 1);
        const hx = beamX; const hw = Math.max(4, spotPx * 0.8);
        D.rect(g, hx - hw / 2, top, hw, depth, { fill: '#1e293b' });
        D.rect(g, hx - hw / 2 - 5, top, 5, depth, { fill: D.heat(0.85) }); D.rect(g, hx + hw / 2, top, 5, depth, { fill: D.heat(0.85) });
        T(g, 'hole (cut-away)', hx + hw / 2 + 12, top + 26, { size: 16, weight: 800, color: '#1e293b' });
        for (let i = 0; i < 8; i++) { const s = (t * 1.2 + i / 8) % 1; const a = -Math.PI / 2 + (rnd(i) - 0.5) * 1.6; D.circle(g, lx + Math.cos(a) * s * 80, surfY + Math.sin(a) * s * 80, 3.5 * (1 - s) + 1, { fill: '#fb923c' }); }
        T(g, 'vapour + melt ejected', lx + 70, surfY - 60, { size: 16, weight: 800, color: '#c2410c', halo: true });
      }
      if (mode === 'cut' && step >= 4) {
        for (let i = 0; i < 10; i++) { const s = (t * 1.5 + i / 10) % 1; D.circle(g, beamX + (rnd(i) - 0.5) * 10 - s * 30, bot + 6 + s * 50, 3.5 * (1 - s) + 1, { fill: D.heat(1 - s * 0.6) }); }
        T(g, 'molten material blown out', beamX + 20, bot + 34, { size: 16, weight: 800, color: '#c2410c' });
        T(g, 'kerf', sx0 + bx / 2 + 24, surfY - 20, { size: 16, weight: 800, color: '#1e293b', halo: true });
      }
      if (mode === 'weld' && step >= 4) T(g, 'weld bead', sx0 + bx / 2 + 24, surfY - 22, { size: 16, weight: 800, color: '#1e293b', halo: true });
      if (mode !== 'drill') { D.arrow(g, 150, 505, 330, 505, { color: C.blue, width: 3 }); T(g, `beam moves at v = ${p.v} mm/s`, 340, 505, { size: 17, weight: 800, color: C.blue }); }
      else T(g, `pulse t = ${p.tp} ms,  E = ${fmt(k.Ep, 3)} J`, 280, 505, { size: 17, weight: 800, color: C.blue, align: 'center' });
      // beam + lens
      const lensY = 150; const bw = 34;
      const reach = step === 0 ? Math.max(0.1, prog) : 1;
      D.rect(g, lx - bw, 50, bw * 2, 100, { fill: beamCol, alpha: 0.25 });
      D.poly(g, [[lx - bw, lensY], [lx - spotPx / 2, lensY + (surfY - lensY) * reach], [lx + spotPx / 2, lensY + (surfY - lensY) * reach], [lx + bw, lensY]], { fill: beamCol, close: true, stroke: false, alpha: 0.45 });
      g.save(); g.fillStyle = '#bfdbfe'; g.strokeStyle = '#1d4ed8'; g.lineWidth = 2; g.beginPath(); g.ellipse(lx, lensY, bw + 16, 12, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
      T(g, 'Focusing lens', lx + bw + 24, lensY, { size: 16, weight: 800, color: '#1d4ed8' });
      D.arrow(g, lx, 58, lx, 110, { color: '#7f1d1d', width: 3 });
      T(g, `P = ${p.P} W`, lx + bw + 24, 80, { size: 17, weight: 800, color: beamCol });
      if (mode === 'cut') { D.poly(g, [[lx - 42, 240], [lx + 42, 240], [lx + 14, 290], [lx - 14, 290]], { fill: '#e2e8f0', close: true, stroke: '#64748b', width: 1.5, alpha: 0.85 }); T(g, 'gas nozzle', lx - 50, 262, { size: 16, weight: 700, color: C.muted, align: 'right' }); }
      if (reach >= 1) {
        D.line(g, lx - spotPx / 2, surfY - 34, lx + spotPx / 2, surfY - 34, { color: C.ink, width: 2 });
        T(g, `d = ${p.d} µm`, lx - Math.max(spotPx / 2, 14) - 8, surfY - 34, { size: 16, weight: 800, align: 'right', halo: true });
      }
      if (step === 0) D.focus(g, lx - bw - 20, lensY - 20, bw * 2 + 40, surfY - lensY + 30, t);
      if (step === 1) D.tag(g, `I = ${sci(k.I, 3)} W/cm²`, lx + 40, surfY - 70, { bg: C.violet, size: 18 });
      if (step === 2) {
        const refl = 1 - k.A;
        D.arrow(g, lx + 6, surfY - 4, lx + 90, surfY - 90, { color: beamCol, width: 2 + 5 * refl, alpha: 0.4 + 0.6 * refl, head: 14 });
        T(g, `reflected ≈ ${fmt(refl * 100, 2)} %`, lx + 96, surfY - 104, { size: 17, weight: 800, color: beamCol, halo: true });
        T(g, `absorbed ≈ ${fmt(k.A * 100, 2)} %`, lx + 96, surfY - 78, { size: 17, weight: 800, color: C.green, halo: true });
      }
      if (step === 3) D.focus(g, lx - 70, surfY - 30, 140, 60, t);
      if (step === 4) D.focus(g, sx0, top + by - 10, sx1 - sx0 + bx, bot - top + 30, t);

      // ── Intensity scale with process windows
      panel(g, 590, 50, 390, 215, 'Intensity vs process windows');
      const lx0 = 615, lx1 = 955; const LX = (lg) => lx0 + ((lg - 3) / 6) * (lx1 - lx0);
      const bands = [['weld', 'Welding', C.blue, 92], ['cut', 'Cutting', C.orange, 122], ['drill', 'Drilling', C.violet, 152]];
      bands.forEach(([key, name, color, y]) => {
        const [a, b] = WIN[key].map(Math.log10);
        D.rect(g, LX(a), y - 12, LX(b) - LX(a), 24, { fill: color, r: 5, alpha: key === mode ? 1 : 0.35 });
        T(g, name, (LX(a) + LX(b)) / 2, y, { size: 16, weight: 800, color: '#fff', align: 'center' });
      });
      D.line(g, lx0, 176, lx1, 176, { color: C.muted, width: 2 });
      for (let e = 3; e <= 9; e++) { D.line(g, LX(e), 172, LX(e), 180, { color: C.muted, width: 2 }); T(g, pow10(e), LX(e), 194, { size: 16, color: C.muted, align: 'center' }); }
      T(g, 'I in W/cm²  (indicative ranges)', 785, 216, { size: 16, color: C.muted, align: 'center', weight: 700 });
      const mx = LX(clamp(k.logI, 3, 9));
      if (step >= 1) { D.line(g, mx, 78, mx, 180, { color: C.ink, width: 3 }); D.tag(g, `I = ${sci(k.I, 2)} W/cm²`, clamp(mx, 700, 870), 243, { bg: k.status === 'in' ? C.green : C.amber, size: 16, align: 'center' }); }
      if (step === 5) D.focus(g, 600, 76, 370, 180, t);
      // ── Result panel
      panel(g, 590, 285, 390, 265, 'Results');
      row(g, 606, 330, 358, 'Absorptivity A', `${fmt(k.A * 100, 2)} %`);
      row(g, 606, 360, 358, 'Intensity I', `${sci(k.I, 3)} W/cm²`);
      row(g, 606, 390, 358, 'Absorbed A·I', `${sci(k.Iabs, 3)} W/cm²`);
      if (mode === 'drill') { row(g, 606, 420, 358, 'Pulse energy E', `${fmt(k.Ep, 3)} J`); row(g, 606, 450, 358, 'Fluence F', `${sci(k.F, 3)} J/cm²`); }
      else { row(g, 606, 420, 358, 'Line energy P/v', `${fmt(k.EL, 3)} J/mm`); row(g, 606, 450, 358, 'Interaction time d/v', `${fmt(k.tau * 1000, 3)} ms`); }
      D.tag(g, k.status === 'in' ? `${PROC[mode]}: in window` : k.status === 'below' ? `${PROC[mode]}: intensity too low` : `${PROC[mode]}: intensity too high`, 785, 505, { bg: k.status === 'in' ? C.green : C.amber, size: 17, align: 'center' });
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 4. Selective Laser Sintering (conceptual machine, real numbers)
  // ─────────────────────────────────────────────────────────────
  const SLSMAT = {
    pa12: { name: 'PA12 nylon', win: [0.1, 0.5], part: '#3b82f6', laser: 'CO₂ laser' },
    ss316: { name: '316L steel (metal PBF)', win: [50, 120], part: '#64748b', laser: 'Fibre laser' },
  };
  function slsCalc(p) {
    const m = SLSMAT[p.mat] || SLSMAT.pa12;
    const N = Math.max(1, Math.ceil(p.H / p.t - 1e-9)); const Ev = p.P / (p.v * p.h * p.t); const Ea = p.P / (p.v * p.h);
    const rate = p.v * p.h * p.t; const tScan = p.A / (p.v * p.h); const tTot = N * tScan;
    const status = Ev < m.win[0] ? 'low' : Ev > m.win[1] ? 'high' : 'ok';
    return { m, N, Ev, Ea, rate, tScan, tTot, status };
  }
  S['ep-sls'] = {
    conceptual: true,
    approx: 'Machine drawing is schematic and the part is drawn with fewer layers than calculated. E = P/(v·h·t) is the standard volumetric energy density; the "good" ranges (PA12 ≈ 0.1–0.5 J/mm³, 316L laser powder-bed fusion ≈ 50–120 J/mm³) are indicative only — real windows depend on the machine and powder. Scan time counts only the laser hatching (no recoating time).',
    params: [
      { key: 'mat', label: 'Powder', type: 'select', default: 'pa12', options: [{ value: 'pa12', label: 'PA12 nylon (polymer SLS)' }, { value: 'ss316', label: '316L stainless steel (metal SLM)' }] },
      { key: 't', label: 'Layer thickness t', type: 'range', min: 0.02, max: 0.2, step: 0.01, default: 0.1, unit: 'mm' },
      { key: 'H', label: 'Part height', type: 'range', min: 1, max: 100, step: 1, default: 20, unit: 'mm' },
      { key: 'P', label: 'Laser power P', type: 'range', min: 5, max: 400, step: 1, default: 30, unit: 'W' },
      { key: 'v', label: 'Scan speed v', type: 'range', min: 100, max: 10000, step: 50, default: 5000, unit: 'mm/s' },
      { key: 'h', label: 'Hatch spacing h', type: 'range', min: 0.05, max: 0.4, step: 0.01, default: 0.25, unit: 'mm' },
      { key: 'A', label: 'Cross-section area per layer', type: 'range', min: 25, max: 2500, step: 25, default: 400, unit: 'mm²' },
    ],
    examples: [
      { label: 'PA12 nylon part (CO₂ laser 30 W)', values: { mat: 'pa12', t: 0.1, H: 20, P: 30, v: 5000, h: 0.25, A: 400 } },
      { label: 'PA12 — scanned too fast (under-sintered)', values: { mat: 'pa12', t: 0.12, H: 30, P: 20, v: 10000, h: 0.3, A: 900 } },
      { label: '316L steel, fibre laser 200 W', values: { mat: 'ss316', t: 0.03, H: 10, P: 200, v: 800, h: 0.1, A: 100 } },
    ],
    validate(p) {
      const k = slsCalc(p); const w = [];
      if (k.status === 'low') w.push(`Energy density ${fmt(k.Ev, 3)} J/mm³ is below the indicative range for ${k.m.name} (${k.m.win[0]}–${k.m.win[1]} J/mm³) — particles will not fuse well (weak, porous part).`);
      if (k.status === 'high') w.push(`Energy density ${fmt(k.Ev, 3)} J/mm³ is above the indicative range for ${k.m.name} (${k.m.win[0]}–${k.m.win[1]} J/mm³) — risk of overheating, degradation or distortion.`);
      return w;
    },
    compute(p) {
      const k = slsCalc(p);
      const formulas = [
        { name: 'Number of layers', formula: 'N = part height / layer thickness', given: `height = ${p.H} mm, t = ${p.t} mm`, calc: `N = ${p.H} / ${p.t} = ${fmt(p.H / p.t, 4)} → round up`, result: String(k.N), unit: 'layers' },
        { name: 'Volumetric energy density', formula: 'E = P / (v · h · t)', given: `P = ${p.P} W, v = ${p.v} mm/s, h = ${p.h} mm, t = ${p.t} mm`,
          calc: `E = ${p.P} / (${p.v} × ${p.h} × ${p.t}) = ${p.P} / ${fmt(k.rate, 4)}`, result: fmt(k.Ev, 3), unit: 'J/mm³' },
        { name: 'Areal energy density', formula: 'E_A = P / (v · h)', given: `P = ${p.P} W, v = ${p.v} mm/s, h = ${p.h} mm`, calc: `E_A = ${p.P} / (${p.v} × ${p.h})`, result: fmt(k.Ea, 3), unit: 'J/mm²' },
        { name: 'Build rate (laser)', formula: 'V̇ = v · h · t', given: `v = ${p.v} mm/s, h = ${p.h} mm, t = ${p.t} mm`, calc: `V̇ = ${p.v} × ${p.h} × ${p.t}`, result: fmt(k.rate, 3), unit: 'mm³/s' },
        { name: 'Scan time per layer', formula: 't_layer = A / (v · h)', given: `A = ${p.A} mm²`, calc: `t_layer = ${p.A} / (${p.v} × ${p.h}); total = N × t_layer = ${k.N} × ${fmt(k.tScan, 3)} s = ${fmt(k.tTot / 60, 3)} min`, result: fmt(k.tScan, 3), unit: 's' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Layers N', value: String(k.N), tone: 'info' },
          { label: 'Energy density', value: `${fmt(k.Ev, 3)} J/mm³`, tone: k.status === 'ok' ? 'good' : 'warn' },
          { label: 'Scan time / layer', value: `${fmt(k.tScan, 3)} s` },
          { label: 'Total laser time', value: `${fmt(k.tTot / 60, 3)} min` },
        ],
        state: { powder: k.m.name, layerThickness: `${p.t} mm`, partHeight: `${p.H} mm`, layers: k.N, energyDensity: `${fmt(k.Ev, 3)} J/mm³`, indicativeRange: `${k.m.win[0]}–${k.m.win[1]} J/mm³`, verdict: k.status === 'ok' ? 'within indicative range' : k.status === 'low' ? 'too low (weak part)' : 'too high (overheating)', scanTimePerLayer: `${fmt(k.tScan, 3)} s` },
        explain: {
          what: `A ${p.H} mm tall part is built from ${k.N} layers of ${p.t} mm ${k.m.name} powder. In every layer the laser (${p.P} W, ${p.v} mm/s, hatch ${p.h} mm) fuses the cross-section, delivering ${fmt(k.Ev, 3)} J/mm³.`,
          why: 'The laser heats the powder particles just enough that their surfaces soften or melt and bond (sinter) to each other and to the layer below. Loose powder around the part supports it, so polymer parts need no support structures.',
          param: 'Layer thickness, part height, laser power, scan speed, hatch spacing and cross-section area.',
          effect: `Thinner layers give a smoother part but more layers (N = height/t). More power or slower scanning raises E = P/(v·h·t); too low → porous weak part, too high → overheating. Now: ${k.status === 'ok' ? 'within' : k.status === 'low' ? 'below' : 'above'} the indicative range.`,
        },
      };
    },
    steps(p) {
      const k = slsCalc(p);
      return [
        { title: 'Spread a thin powder layer', text: `The feed piston rises and the roller spreads a ${p.t} mm layer of ${k.m.name} powder across the build platform.` },
        { title: 'Laser scans the cross-section', text: `Galvo mirrors steer the beam (${p.P} W, ${p.v} mm/s) in parallel hatch lines ${p.h} mm apart over this layer's cross-section (${p.A} mm², ${fmt(k.tScan, 3)} s).` },
        { title: 'Particles fuse together', text: `Energy density E = P/(v·h·t) = ${fmt(k.Ev, 3)} J/mm³: particle surfaces melt and form necks, bonding to each other and to the layer below.` },
        { title: 'Platform lowers by one layer', text: `The build platform drops by t = ${p.t} mm and the feed piston rises, ready for the next layer.` },
        { title: 'Repeat for every layer', text: `Spread → scan → lower is repeated N = ${p.H} / ${p.t} = ${k.N} times (≈ ${fmt(k.tTot / 60, 3)} min of laser scanning).` },
        { title: 'Remove the part from the powder cake', text: 'After cooling, the part is dug out of the loose powder, which supported it during the build; unused powder is sieved and reused.' },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1); const k = slsCalc(p);
      D.clear(g, '#ffffff');
      T(g, `Selective laser sintering — ${k.m.name}`, 20, 26, { size: 20, weight: 800 });
      const bedY = 290; const fx0 = 50, fx1 = 210, bx0 = 250, bx1 = 490, ox0 = 520, ox1 = 600; const floor = 520;
      const layersShown = step < 4 ? 1 : step === 4 ? Math.max(1, Math.round(prog * k.N)) : k.N;
      const frac = layersShown / k.N; const partPx = 150 * frac; const pxPerLayer = 150 / k.N;
      const drop = step === 3 ? prog : 0;
      const partTop = bedY + pxPerLayer * drop;
      const platY = partTop + partPx + 18;
      const cx = (bx0 + bx1) / 2;
      const widthAt = (z) => 70 + 50 * Math.sin(Math.PI * z) + 20 * z; // z: 0 bottom → 1 top
      const powder = (x, y, w, h) => { if (h <= 0) return; D.rect(g, x, y, w, h, { fill: '#fde68a' }); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); for (let i = 0; i < 200; i++) D.circle(g, x + rnd(i) * w, y + rnd(i + 400) * 260, 2.2, { fill: '#d97706', alpha: 0.35 }); g.restore(); };
      // chamber walls
      [[fx0, fx1], [bx0, bx1], [ox0, ox1]].forEach(([a, b]) => { D.line(g, a, bedY, a, floor, { color: '#475569', width: 3 }); D.line(g, b, bedY, b, floor, { color: '#475569', width: 3 }); D.line(g, a, floor, b, floor, { color: '#475569', width: 3 }); });
      D.line(g, 30, bedY, fx0, bedY, { color: '#475569', width: 3 }); D.line(g, fx1, bedY, bx0, bedY, { color: '#475569', width: 3 }); D.line(g, bx1, bedY, ox0, bedY, { color: '#475569', width: 3 }); D.line(g, ox1, bedY, 620, bedY, { color: '#475569', width: 3 });
      // feed chamber
      const used = step >= 5 ? 1 : frac;
      const feedPist = bedY + 40 + 150 * (1 - used) - (step === 3 ? pxPerLayer * drop : 0);
      powder(fx0 + 2, bedY, fx1 - fx0 - 4, feedPist - bedY);
      D.rect(g, fx0 + 2, feedPist, fx1 - fx0 - 4, 10, { fill: '#64748b' }); D.line(g, (fx0 + fx1) / 2, feedPist + 10, (fx0 + fx1) / 2, floor, { color: '#64748b', width: 6 });
      if (step === 3) D.arrow(g, fx0 + 24, feedPist + 50, fx0 + 24, feedPist + 18, { color: C.green, width: 3 });
      T(g, 'Powder feed', (fx0 + fx1) / 2, floor + 18, { size: 16, weight: 800, align: 'center', color: '#92400e' });
      // build chamber
      powder(bx0 + 2, bedY, bx1 - bx0 - 4, platY - bedY);
      const drawPart = (oy, n) => {
        for (let i = 0; i < n; i++) {
          const z = (i + 0.5) / k.N; const w = widthAt(z); const y = oy - (i + 1) * pxPerLayer;
          D.rect(g, cx - w / 2, y, w, Math.max(1, pxPerLayer + 0.3), { fill: i % 2 ? k.m.part : D.shade(k.m.part, -0.15) });
        }
      };
      if (step < 5) drawPart(platY - 18, layersShown);
      D.rect(g, bx0 + 2, platY, bx1 - bx0 - 4, 10, { fill: '#475569' }); D.line(g, cx, platY + 10, cx, floor, { color: '#475569', width: 6 });
      if (step === 3) { D.arrow(g, bx1 - 22, platY - 40, bx1 - 22, platY + 30, { color: C.red, width: 3 }); D.tag(g, `down ${p.t} mm`, bx1 - 30, platY + 50, { bg: C.red, size: 16, align: 'right' }); }
      T(g, 'Build platform', cx, floor + 18, { size: 16, weight: 800, align: 'center', color: '#334155' });
      powder(ox0 + 2, floor - 40, ox1 - ox0 - 4, 38); T(g, 'Overflow', (ox0 + ox1) / 2, floor + 18, { size: 16, weight: 800, align: 'center', color: C.muted });
      // roller
      const rx = step === 0 ? fx0 + 20 + prog * (ox0 - fx0) : fx0 + 20;
      D.circle(g, rx, bedY - 14, 14, { fill: '#94a3b8', stroke: '#334155', width: 2 });
      if (step === 0) { D.poly(g, [[rx + 12, bedY], [rx + 30, bedY], [rx + 12, bedY - 12]], { fill: '#fbbf24', close: true, stroke: false }); D.arrow(g, rx - 10, bedY - 44, rx + 50, bedY - 44, { color: C.ink, width: 2.5 }); }
      T(g, 'Roller', fx0 + 44, bedY - 16, { size: 16, weight: 800, color: '#334155' });
      // laser + mirror
      D.rect(g, 40, 60, 170, 40, { fill: '#1e293b', r: 6 }); T(g, k.m.laser, 125, 80, { size: 17, weight: 800, color: '#fff', align: 'center' });
      const mX = 370, mY = 80; D.line(g, 210, 80, mX - 12, 80, { color: C.laser, width: 3 });
      g.save(); g.translate(mX, mY); g.rotate(Math.PI / 4 + 0.08 * Math.sin(t * 3)); D.rect(g, -18, -4, 36, 8, { fill: '#cbd5e1', stroke: '#334155', width: 1.5 }); g.restore();
      T(g, 'Galvo mirrors', mX + 30, 80, { size: 16, weight: 800 });
      const topW = widthAt(Math.min(1, (layersShown - 0.5) / k.N));
      if (step === 1 || step === 2 || step === 4) {
        const sx = cx - topW / 2 + ((t * 0.9) % 1) * topW;
        D.line(g, mX, mY, sx, bedY, { color: C.laser, width: 3 }); D.circle(g, sx, bedY, 6, { fill: C.hi, stroke: C.laser, width: 2 });
        D.rect(g, cx - topW / 2, bedY - 3, topW, 5, { fill: C.laser, alpha: 0.6 });
      }
      if (step === 0) D.focus(g, fx0, bedY - 64, ox1 - fx0, 76, t);
      if (step === 1) D.focus(g, bx0, bedY - 20, bx1 - bx0, 40, t);
      if (step === 3) D.focus(g, bx0 - 4, platY - 50, bx1 - bx0 + 8, 70, t);
      if (step >= 5) {
        const lift = 110 * (step === 5 ? prog : 1);
        drawPart(bedY + 150 - lift, k.N);
        for (let i = 0; i < 12; i++) { const s = (t * 0.7 + i / 12) % 1; D.circle(g, cx - 60 + rnd(i) * 120, bedY - lift + 40 + s * 60, 3, { fill: '#d97706', alpha: 0.6 * (1 - s) }); }
        D.tag(g, 'finished part', cx, bedY - lift - 22, { bg: k.m.part, size: 17, align: 'center' });
      }
      // ── Right: top view / particle close-up
      const cx2 = 810;
      if (step === 2) {
        panel(g, 640, 50, 340, 230, 'Close-up: particles fuse');
        for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
          const x = 690 + i * 55 + (j % 2) * 18; const y = 105 + j * 50; const fused = x < 690 + 260 * prog + 20;
          if (fused && i < 4) D.rect(g, x, y - 9, 55, 18, { fill: k.m.part });
          D.circle(g, x, y, 23, { fill: fused ? k.m.part : '#fde68a', stroke: fused ? D.shade(k.m.part, -0.3) : '#d97706', width: 2 });
        }
        T(g, 'necks form between particles', cx2, 262, { size: 16, weight: 800, align: 'center', color: C.muted });
      } else {
        panel(g, 640, 50, 340, 230, 'Top view of the current layer');
        const w = topW * 1.5; const hgt = 130; const x0 = cx2 - w / 2, y0 = 86;
        D.rect(g, 656, 78, 308, 150, { fill: '#fde68a' });
        const sp = clamp(p.h * 40, 4, 16); const nLines = Math.max(1, Math.floor(hgt / sp));
        const done = step === 1 ? Math.floor(prog * nLines) : step === 0 ? 0 : nLines;
        for (let i = 0; i < nLines; i++) { const y = y0 + i * sp + sp / 2; D.line(g, x0 + 3, y, x0 + w - 3, y, { color: i < done ? C.laser : '#d6d3d1', width: Math.max(2, sp * 0.6) }); }
        D.rect(g, x0, y0, w, hgt, { stroke: C.ink, width: 2, dash: [6, 4] });
        T(g, `hatch spacing h = ${p.h} mm (lines magnified)`, cx2, 256, { size: 16, weight: 700, align: 'center', color: C.muted });
      }
      // results
      panel(g, 640, 295, 340, 255, 'Build numbers');
      row(g, 656, 338, 308, 'Layers N = H / t', `${k.N}`);
      row(g, 656, 366, 308, 'Current layer', `${step >= 5 ? k.N : layersShown} / ${k.N}`);
      row(g, 656, 394, 308, 'E = P/(v·h·t)', `${fmt(k.Ev, 3)} J/mm³`, k.status === 'ok' ? C.green : C.amber);
      row(g, 656, 422, 308, 'Scan time / layer', `${fmt(k.tScan, 3)} s`);
      row(g, 656, 450, 308, 'Total scan time', `${fmt(k.tTot / 60, 3)} min`);
      D.tag(g, k.status === 'ok' ? 'Energy density in range' : k.status === 'low' ? 'Too little energy: porous' : 'Too much energy: overheats', cx2, 490, { bg: k.status === 'ok' ? C.green : C.amber, size: 17, align: 'center' });
      T(g, `indicative ${k.m.win[0]}–${k.m.win[1]} J/mm³`, cx2, 524, { size: 16, weight: 700, align: 'center', color: C.muted });
      if (step === 4) D.focus(g, 646, 352, 328, 28, t);
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Holography
  // ─────────────────────────────────────────────────────────────
  const HLAS = { hene: { name: 'He–Ne', lam: 632.8 }, dpss: { name: 'DPSS', lam: 532 }, ar: { name: 'Argon', lam: 514.5 }, ruby: { name: 'Ruby', lam: 694.3 } };
  function hoCalc(p) {
    const L = HLAS[p.laser] || HLAS.hene; const th = rad(p.theta);
    const Lam = L.lam / (2 * Math.sin(th / 2)); // nm
    const freq = 1e6 / Lam; // lines per mm
    const V = (2 * Math.sqrt(p.ratio)) / (1 + p.ratio);
    return { L, th, Lam, LamUm: Lam / 1000, freq, V };
  }
  S['ep-holography'] = {
    conceptual: true,
    approx: 'The optical layout, object and image are schematic. The fringe spacing Λ = λ / (2 sin(θ/2)) is exact for two plane waves meeting symmetrically about the plate normal; a real object sends many waves, so a real hologram holds a complicated mixture of such fringes. Fringes are drawn hugely magnified (1 µm ≈ 30 px). Plate resolutions (holographic emulsion > 3000 lines/mm, ordinary film ≈ 100 lines/mm) are approximate.',
    modes: [{ key: 'rec', label: 'Recording' }, { key: 'recon', label: 'Reconstruction' }],
    params: [
      { key: 'laser', label: 'Laser (wavelength)', type: 'select', default: 'hene', options: [{ value: 'hene', label: 'He–Ne 632.8 nm' }, { value: 'dpss', label: 'DPSS green 532 nm' }, { value: 'ar', label: 'Argon-ion 514.5 nm' }, { value: 'ruby', label: 'Ruby 694.3 nm (pulsed)' }] },
      { key: 'theta', label: 'Angle between object and reference beams θ', type: 'range', min: 10, max: 90, step: 1, default: 30, unit: '°' },
      { key: 'ratio', label: 'Beam ratio I_R : I_O', type: 'range', min: 1, max: 10, step: 0.5, default: 3, help: 'The reference beam is usually a few times stronger than the object beam.' },
    ],
    examples: [
      { label: 'Classroom He–Ne hologram (θ = 30°)', values: { laser: 'hene', theta: 30, ratio: 3 } },
      { label: 'Green DPSS, wide angle 60°', values: { laser: 'dpss', theta: 60, ratio: 4 } },
      { label: 'Ruby pulsed portrait, small angle 15°', values: { laser: 'ruby', theta: 15, ratio: 5 } },
    ],
    validate: () => [],
    compute(p) {
      const k = hoCalc(p); const h2 = fmt(p.theta / 2, 3);
      const formulas = [
        { name: 'Fringe spacing on the plate', formula: 'Λ = λ / (2 sin(θ/2))', given: `λ = ${k.L.lam} nm, θ = ${p.theta}°`,
          calc: `Λ = ${k.L.lam} / (2 × sin ${h2}°) = ${k.L.lam} / ${fmt(2 * Math.sin(k.th / 2), 4)} nm`, result: fmt(k.LamUm, 3), unit: 'µm' },
        { name: 'Fringe density', formula: 'f = 1 / Λ', given: `Λ = ${fmt(k.LamUm, 3)} µm = ${fmt(k.LamUm / 1000, 3)} mm`, calc: `f = 1 / ${fmt(k.LamUm / 1000, 3)} mm`, result: fmt(k.freq, 3), unit: 'lines/mm' },
        { name: 'Recorded intensity', formula: 'I = I_R + I_O + 2√(I_R I_O) cos(φ_O − φ_R)', given: `I_R : I_O = ${p.ratio} : 1`, calc: 'Fringe positions follow the phase φ_O; fringe contrast follows the amplitude of O', result: 'amplitude + phase stored', unit: '—' },
        { name: 'Fringe visibility', formula: 'V = 2√(I_R I_O) / (I_R + I_O)', given: `I_R / I_O = ${p.ratio}`, calc: `V = 2√${p.ratio} / (${p.ratio} + 1)`, result: fmt(k.V, 3), unit: '— (0 to 1)' },
        { name: 'Reconstruction (grating equation)', formula: 'Λ (sin θ_d − sin θ_r) = m λ', given: `θ_r = +${h2}°, m = −1, λ/Λ = 2 sin(θ/2)`, calc: `sin θ_d = sin ${h2}° − 2 sin ${h2}° = −sin ${h2}°`, result: `θ_d = −${h2}° (object direction)`, unit: 'degrees (°)' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Fringe spacing Λ', value: `${fmt(k.LamUm, 3)} µm`, tone: 'info' },
          { label: 'Fringe density', value: `${fmt(k.freq, 3)} lines/mm` },
          { label: 'Visibility V', value: fmt(k.V, 3) },
          { label: 'Mode', value: p.mode === 'recon' ? 'Reconstruction' : 'Recording', tone: 'good' },
        ],
        state: { mode: p.mode === 'recon' ? 'reconstruction' : 'recording', laser: `${k.L.name} ${k.L.lam} nm`, beamAngle: `${p.theta}°`, fringeSpacing: `${fmt(k.LamUm, 3)} µm`, fringeDensity: `${fmt(k.freq, 3)} lines/mm`, visibility: fmt(k.V, 3) },
        explain: {
          what: p.mode === 'recon' ? `The developed hologram is lit by the reference beam alone. Its fringes (spacing ${fmt(k.LamUm, 3)} µm) act as a diffraction grating that recreates the object wave, so an observer sees a 3D virtual image where the object used to be.` : `The object beam and the reference beam from the same ${k.L.name} laser (${k.L.lam} nm) meet at θ = ${p.theta}° on the plate and form interference fringes ${fmt(k.LamUm, 3)} µm apart (${fmt(k.freq, 3)} lines/mm).`,
          why: 'A photograph records only intensity |O|², so the phase (depth) information is lost. Adding a coherent reference wave turns the phase of the object wave into the position of the fringes and its amplitude into their contrast, so both are stored.',
          param: 'Laser wavelength λ, angle θ between the beams and the beam intensity ratio.',
          effect: `A larger angle or shorter wavelength gives finer fringes (Λ = λ/(2 sin(θ/2))), which needs a higher-resolution plate. A beam ratio near 1 : 1 gives the highest contrast (V = 1); now V = ${fmt(k.V, 3)}.`,
        },
      };
    },
    steps(p) {
      const k = hoCalc(p);
      if (p.mode === 'recon') return [
        { title: 'The developed hologram', text: `The processed plate carries the recorded fringe pattern (${fmt(k.freq, 3)} lines/mm). To the eye it looks like a grey smudge — no image is visible.` },
        { title: 'Illuminate with the reference beam only', text: `The object is removed. The same reference beam (${k.L.lam} nm) at the same angle lights the hologram.` },
        { title: 'Diffraction recreates the object wave', text: `The fringes act as a grating: Λ(sin θ_d − sin θ_r) = mλ. The m = −1 order leaves at −${fmt(p.theta / 2, 3)}°, exactly the direction the object light had.` },
        { title: 'A 3D virtual image appears', text: 'Looking through the plate, the observer sees the object in its original place. Moving the head shows different sides (parallax) — true 3D.' },
        { title: 'Why not a photograph?', text: 'A photograph stores only |O|² (brightness). The hologram also stored the phase of O in the fringe positions, so the complete wavefront — and hence depth — is rebuilt.' },
      ];
      return [
        { title: 'Laser and beam splitter', text: `A coherent ${k.L.name} laser (${k.L.lam} nm) is divided by a beam splitter into two beams from the same source, so they keep a fixed phase relation.` },
        { title: 'Object beam lights the object', text: 'One beam illuminates the object; light scattered from every point of the object (the object wave O) travels to the photographic plate.' },
        { title: 'Reference beam reaches the plate', text: `The second beam (reference wave R) is expanded and falls directly on the plate at θ = ${p.theta}° to the object beam.` },
        { title: 'Interference fringes form', text: `The two waves interfere: Λ = λ/(2 sin(θ/2)) = ${fmt(k.LamUm, 3)} µm, i.e. ${fmt(k.freq, 3)} lines/mm — far finer than ordinary film (≈ 100 lines/mm) can record.` },
        { title: 'Amplitude and phase are stored', text: `After developing, fringe contrast (V = ${fmt(k.V, 3)}) records the amplitude and fringe position records the phase of the object wave.` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1); const k = hoCalc(p);
      const recon = p.mode === 'recon';
      D.clear(g, '#ffffff');
      const col = D.wavelengthColor(k.L.lam);
      const Pc = [700, 300]; const half = 110; const h2 = k.th / 2;
      const Mr = [Pc[0] - 260 * Math.cos(h2), Pc[1] - 260 * Math.sin(h2)];
      const Ob = [Pc[0] - 190 * Math.cos(h2), Pc[1] + 190 * Math.sin(h2)];
      const laserY = 520, BS = [200, laserY], M2 = [200, Mr[1]], M1 = [Ob[0], laserY];
      // header
      if (recon) T(g, 'Reconstruction: only the reference beam lights the hologram', 20, 26, { size: 19, weight: 800 });
      else D.tag(g, `Λ = λ / (2 sin(θ/2)) = ${k.L.lam} nm / (2 sin ${fmt(p.theta / 2, 3)}°) = ${fmt(k.LamUm, 3)} µm`, 20, 28, { bg: C.ink, size: 18 });
      // laser
      D.rect(g, 20, laserY - 20, 130, 40, { fill: '#1e293b', r: 6 }); T(g, `${k.L.name} laser`, 85, laserY, { size: 16, weight: 800, color: '#fff', align: 'center' });
      const beam = (a, b, f, w) => { D.line(g, a[0], a[1], a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, { color: col, width: w || 4 }); };
      const f0 = !recon && step === 0 ? Math.max(0.1, prog) : 1;
      beam([150, laserY], BS, f0);
      mirrorAt(g, BS[0], BS[1], [1, 0], [0, -1], recon ? {} : { fill: '#a5f3fc', stroke: '#0e7490' });
      T(g, recon ? 'Mirror' : 'Beam splitter', BS[0], laserY + 30, { size: 16, weight: 700, color: C.muted, align: 'center' });
      const refOn = recon || step >= 2 || (step === 0 && prog > 0.5);
      const objOn = !recon && (step >= 1 || (step === 0 && prog > 0.5));
      // reference arm: BS → M2 → Mr → plate
      const refF = !recon && step === 2 ? Math.max(0.1, prog) : 1;
      if (refOn) {
        beam(BS, M2, 1, 3.5); beam(M2, Mr, 1, 3.5);
        mirrorAt(g, M2[0], M2[1], [0, -1], [1, 0]); T(g, 'M₂', M2[0] - 28, M2[1], { size: 16, weight: 700, color: C.muted, align: 'right' });
        mirrorAt(g, Mr[0], Mr[1], [1, 0], unit(Mr, Pc));
        const reach = (pt) => [Mr[0] + (pt[0] - Mr[0]) * refF, Mr[1] + (pt[1] - Mr[1]) * refF];
        const a1 = reach([Pc[0], Pc[1] - half]), a2 = reach([Pc[0], Pc[1] + half]);
        D.poly(g, [Mr, a1, a2], { fill: col, close: true, stroke: false, alpha: 0.18 });
        D.arrow(g, Mr[0], Mr[1], Mr[0] + (Pc[0] - Mr[0]) * 0.55 * refF, Mr[1] + (Pc[1] - Mr[1]) * 0.55 * refF, { color: col, width: 3, head: 12 });
        T(g, 'Reference beam R', Mr[0], Mr[1] - 26, { size: 17, weight: 800, color: C.ink, align: 'center', halo: true });
      }
      // object arm
      const objF = !recon && step === 1 ? Math.max(0.1, prog) : 1;
      if (objOn) {
        beam(BS, M1, 1, 3.5); beam(M1, [Ob[0], Ob[1] + 24], 1, 3.5);
        mirrorAt(g, M1[0], M1[1], [1, 0], [0, -1]); T(g, 'M₁', M1[0] + 26, M1[1] + 6, { size: 16, weight: 700, color: C.muted });
        const r1 = [Ob[0] + (Pc[0] - Ob[0]) * objF, Ob[1] + (Pc[1] - half - Ob[1]) * objF], r2 = [Ob[0] + (Pc[0] - Ob[0]) * objF, Ob[1] + (Pc[1] + half - Ob[1]) * objF];
        D.poly(g, [Ob, r1, r2], { fill: C.orange, close: true, stroke: false, alpha: 0.18 });
        for (let i = -2; i <= 2; i++) { const tgt = [Pc[0], Pc[1] + i * half * 0.45]; D.arrow(g, Ob[0], Ob[1], Ob[0] + (tgt[0] - Ob[0]) * 0.6 * objF, Ob[1] + (tgt[1] - Ob[1]) * 0.6 * objF, { color: C.orange, width: 2, head: 9, alpha: 0.8 }); }
        T(g, 'Object wave O', (Ob[0] + Pc[0]) / 2 + 10, (Ob[1] + Pc[1] + half) / 2 + 26, { size: 17, weight: 800, color: '#c2410c', align: 'center', halo: true });
      }
      // object: a small house-shaped solid
      const drawObj = (alpha, dashed) => {
        const x = Ob[0], y = Ob[1]; const pts = [[x - 22, y + 22], [x + 22, y + 22], [x + 22, y - 6], [x, y - 26], [x - 22, y - 6]];
        if (dashed) D.poly(g, pts, { close: true, stroke: C.violet, width: 2.5, dash: [6, 5] });
        else {
          D.poly(g, pts, { fill: '#fb923c', close: true, stroke: '#9a3412', width: 2.5, alpha });
          D.poly(g, [[x + 22, y + 22], [x + 34, y + 12], [x + 34, y - 14], [x + 22, y - 6]], { fill: '#c2410c', close: true, stroke: '#9a3412', width: 1.5, alpha });
        }
      };
      if (!recon) { drawObj(1, false); T(g, 'Object', Ob[0] - 34, Ob[1] - 4, { size: 17, weight: 800, align: 'right', halo: true }); }
      // plate
      D.rect(g, Pc[0] - 4, Pc[1] - half, 8, half * 2, { fill: recon ? '#94a3b8' : '#e2e8f0', stroke: '#334155', width: 1.5 });
      T(g, recon ? 'Hologram' : 'Plate', Pc[0], Pc[1] + half + 20, { size: 17, weight: 800, align: 'center' });
      if (!recon) {
        if (step >= 2) {
          const a0 = Math.atan2(Mr[1] - Pc[1], Mr[0] - Pc[0]); const a1 = Math.atan2(Ob[1] - Pc[1], Ob[0] - Pc[0]);
          g.save(); g.beginPath(); g.arc(Pc[0], Pc[1], 70, Math.min(a0, a1), Math.max(a0, a1)); g.strokeStyle = C.violet; g.lineWidth = 3; g.stroke(); g.restore();
          T(g, `θ = ${p.theta}°`, Pc[0] - 84, Pc[1], { size: 18, weight: 800, color: C.violet, align: 'right', halo: true });
        }
        // fringe inset (magnified)
        panel(g, 735, 60, 245, 330, 'Plate face-on (magnified)');
        const sp = clamp(k.LamUm * 30, 6, 400); const x0 = 750, x1 = 965, y0 = 92, y1 = 330;
        if (step >= 3) {
          const V = step >= 4 || prog > 0.3 ? k.V : (k.V * prog) / 0.3;
          for (let y = y0; y < y1; y += 2) { const I = 0.5 + 0.5 * V * Math.cos((2 * Math.PI * (y - y0)) / sp); const v = Math.round(255 - 215 * I); D.rect(g, x0, y, x1 - x0, 2, { fill: `rgb(${v},${v},${v})` }); }
          const my = y0 + sp * Math.max(1, Math.ceil(40 / sp));
          D.line(g, x1 - 14, my - sp, x1 - 14, my, { color: C.red, width: 3 });
          D.tag(g, 'Λ', x1 - 24, my - sp / 2, { bg: C.red, size: 16, align: 'right' });
          for (let y = Pc[1] - half; y <= Pc[1] + half; y += Math.max(8, sp / 3)) D.line(g, Pc[0] - 60, y, Pc[0] - 6, y, { color: C.violet, width: 2, alpha: 0.5 });
          if (step === 3) D.focus(g, 735, 60, 245, 330, t);
        } else { D.rect(g, x0, y0, x1 - x0, y1 - y0, { fill: '#f1f5f9' }); T(g, 'no fringes yet', (x0 + x1) / 2, (y0 + y1) / 2, { size: 17, color: C.muted, align: 'center', weight: 700 }); }
        T(g, 'scale: 1 µm ≈ 30 px', 857, 364, { size: 16, color: C.muted, align: 'center', weight: 700 });
        row(g, 745, 418, 225, 'Λ', `${fmt(k.LamUm, 3)} µm`);
        row(g, 745, 446, 225, 'f = 1/Λ', `${fmt(k.freq, 3)} /mm`);
        row(g, 745, 474, 225, 'Visibility V', fmt(k.V, 3));
        if (step >= 4) { D.tag(g, 'contrast → amplitude', 975, 508, { bg: C.green, size: 16, align: 'right' }); D.tag(g, 'position → phase', 975, 538, { bg: C.green, size: 16, align: 'right' }); }
        if (step === 0) D.focus(g, 20, laserY - 30, 220, 70, t);
        if (step === 1) D.focus(g, Ob[0] - 50, Ob[1] - 40, 100, 80, t);
        if (step === 2) D.focus(g, Mr[0] - 30, Mr[1] - 30, 60, 60, t);
      } else {
        T(g, 'object removed', Ob[0], Ob[1] + 44, { size: 16, weight: 700, color: C.muted, align: 'center' });
        if (step === 0) { for (let y = Pc[1] - half; y <= Pc[1] + half; y += 8) D.line(g, Pc[0] - 3, y, Pc[0] + 3, y, { color: '#334155', width: 1.5 }); D.tag(g, `fringes: ${fmt(k.freq, 3)} lines/mm`, Pc[0] + 20, Pc[1] - 40, { bg: '#334155', size: 16 }); D.focus(g, Pc[0] - 20, Pc[1] - half - 10, 40, half * 2 + 20, t); }
        if (step === 1) D.focus(g, Mr[0] - 30, Mr[1] - 30, Pc[0] - Mr[0] + 50, Pc[1] - Mr[1] + half + 30, t);
        if (step >= 2) {
          const f = step === 2 ? Math.max(0.1, prog) : 1;
          for (let i = -1; i <= 1; i++) {
            const s = [Pc[0], Pc[1] + i * half * 0.6]; const u = unit(Ob, s);
            D.arrow(g, s[0] + 4, s[1], s[0] + u[0] * 190 * f, s[1] + u[1] * 190 * f, { color: C.orange, width: 3, head: 12 });
            if (step >= 3) D.line(g, s[0], s[1], Ob[0], Ob[1], { color: C.violet, width: 2, dash: [6, 6] });
          }
          const z = unit(Mr, Pc);
          D.arrow(g, Pc[0] + 4, Pc[1], Pc[0] + z[0] * 150 * f, Pc[1] + z[1] * 150 * f, { color: col, width: 2.5, head: 10, alpha: 0.7 });
          T(g, 'zero order (straight through)', 980, Math.min(545, Pc[1] + z[1] * 150 + 24), { size: 16, weight: 700, color: C.muted, align: 'right' });
          D.tag(g, `m = −1: object wave rebuilt (−${fmt(p.theta / 2, 3)}°)`, 980, 62, { bg: '#c2410c', size: 16, align: 'right' });
          if (step === 2) D.focus(g, Pc[0] - 10, Pc[1] - half - 80, 280, half * 2 + 90, t);
        }
        if (step >= 3) {
          drawObj(0.3 + 0.15 * Math.sin(t * 3), false); drawObj(1, true);
          T(g, '3D virtual image', Ob[0] - 40, Ob[1] - 4, { size: 17, weight: 800, color: C.violet, align: 'right', halo: true });
          const ex = clamp(Pc[0] + 240 * Math.cos(h2), 850, 950), ey = clamp(Pc[1] - 240 * Math.sin(h2), 110, 280);
          g.save(); g.beginPath(); g.ellipse(ex, ey, 22, 12, 0, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = C.ink; g.lineWidth = 2.5; g.stroke(); g.restore(); D.circle(g, ex - 8, ey, 6, { fill: C.ink });
          T(g, 'observer', ex, ey + 28, { size: 16, weight: 800, align: 'center', halo: true });
          if (step === 3) D.focus(g, Ob[0] - 50, Ob[1] - 40, 100, 80, t);
        }
        if (step === 4) {
          panel(g, 20, 60, 330, 110, 'Photo vs hologram', { fill: '#fff' });
          T(g, 'Photograph: records |O|² only', 34, 110, { size: 16, weight: 800, color: C.red });
          T(g, 'Hologram: |O + R|² → amplitude + phase', 34, 140, { size: 16, weight: 800, color: C.green });
        }
      }
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 6. Medical applications of lasers
  // ─────────────────────────────────────────────────────────────
  const APPS = {
    lasik: { title: 'LASIK — ArF excimer laser, 193 nm', short: 'LASIK', laser: 'ArF excimer', lam: 193, lamTxt: '193 nm (UV)', abs: 'protein', absTxt: 'corneal collagen (peptide bonds)', depthTxt: '≈ 0.3–1 µm', depthUm: 0.5, delivery: 'flying-spot scanning mirrors', effect: 'Photo-ablation: UV photons break molecular bonds and remove a fraction of a µm of stroma per pulse with very little heating — the cornea is reshaped to correct vision.', layers: [['Corneal flap (folded back)', '#e0f2fe', 34], ['Stroma', '#bae6fd', 180], ['Endothelium', '#7dd3fc', 26], ['Aqueous humour', '#f0f9ff', 90]] },
    retina: { title: 'Retinal photocoagulation — 532 nm', short: 'Retinal photocoagulation', laser: 'Doubled Nd:YAG', lam: 532, lamTxt: '532 nm (green)', abs: 'melanin', absTxt: 'melanin (RPE) and haemoglobin', depthTxt: '≈ tens of µm', depthUm: 30, delivery: 'slit-lamp microscope + contact lens', effect: 'Green light passes through the clear eye and the neural retina and is absorbed by melanin/haemoglobin; the heat coagulates a small spot, sealing leaking vessels or welding retinal tears.', layers: [['Neural retina (transparent)', '#fef9c3', 90], ['RPE (melanin)', '#78350f', 28], ['Choroid (blood)', '#fca5a5', 90], ['Sclera', '#f5f5f4', 122]] },
    co2: { title: 'CO₂ laser scalpel — 10.6 µm', short: 'CO₂ laser surgery', laser: 'CO₂', lam: 10600, lamTxt: '10.6 µm (far IR)', abs: 'water', absTxt: 'water in tissue', depthTxt: '≈ 10–20 µm', depthUm: 15, delivery: 'articulated mirror arm', effect: 'Water in the surface cells absorbs almost everything within ~15 µm and boils: tissue is vaporised (cut) while the thin heated edge seals small blood vessels (cauterises), so there is little bleeding.', layers: [['Epidermis', '#fde2d4', 30], ['Dermis (blood vessels)', '#fecaca', 120], ['Subcutaneous fat', '#fef3c7', 100], ['Muscle', '#fca5a5', 80]] },
    ndyag: { title: 'Nd:YAG coagulation — 1064 nm', short: 'Nd:YAG coagulation', laser: 'Nd:YAG', lam: 1064, lamTxt: '1064 nm (near IR)', abs: 'weak', absTxt: 'weak absorption, strong scattering', depthTxt: '≈ a few mm', depthUm: 3000, delivery: 'flexible optical fibre (endoscope)', effect: 'Weak absorption and strong scattering spread the energy through several mm: a large volume heats up and coagulates — used to stop bleeding and destroy tumours.', layers: [['Mucosa / epidermis', '#fde2d4', 30], ['Tissue with blood vessels', '#fecaca', 120], ['Fat', '#fef3c7', 100], ['Muscle', '#fca5a5', 80]] },
    litho: { title: 'Laser lithotripsy — Ho:YAG 2.1 µm', short: 'Laser lithotripsy', laser: 'Ho:YAG', lam: 2100, lamTxt: '2.1 µm (mid IR)', abs: 'water', absTxt: 'water (at the fibre tip / stone)', depthTxt: '≈ 0.3–0.4 mm', depthUm: 400, delivery: 'thin fibre through a ureteroscope', effect: 'Each pulse is absorbed in water within ~0.4 mm of the fibre tip; the heated water/vapour and photothermal action break the kidney stone into fragments and dust, while the ureter wall a few mm away is spared.', layers: [['Urine / saline (water)', '#dbeafe', 80], ['Kidney stone', '#e7e5e4', 140], ['Ureter wall', '#fecaca', 110]] },
  };
  // approximate absorption coefficients (log10 of µa in cm⁻¹) vs wavelength (µm): schematic
  const SPEC = {
    water: { color: C.blue, name: 'Water', pts: [[0.15, 1.5], [0.2, -1.2], [0.4, -4], [0.5, -3.5], [0.6, -2.7], [0.8, -1.7], [0.98, -0.3], [1.064, -0.85], [1.45, 1.5], [1.94, 2.1], [2.1, 1.45], [2.94, 4.1], [4, 2], [6.1, 3.4], [8, 2.8], [10.6, 2.93], [12, 3.2]] },
    hb: { color: C.red, name: 'Haemoglobin', pts: [[0.25, 3.2], [0.35, 3.2], [0.415, 3.6], [0.5, 2.3], [0.54, 2.5], [0.577, 2.5], [0.6, 1.3], [0.7, 0.6], [0.8, 0.6], [0.9, 0.7], [1.1, 0.5]] },
    melanin: { color: '#92400e', name: 'Melanin', pts: [[0.2, 4.3], [0.3, 3.7], [0.4, 3.2], [0.5, 2.85], [0.6, 2.5], [0.8, 2.1], [1.0, 1.8], [1.2, 1.5]] },
    protein: { color: C.violet, name: 'Protein', pts: [[0.15, 4.6], [0.193, 4.4], [0.22, 3.5], [0.25, 2.2], [0.28, 2.0], [0.32, 0.6]] },
  };
  function medCalc(p) {
    const a = APPS[p.app] || APPS.lasik; const dcm = p.d / 10; const area = (Math.PI * dcm * dcm) / 4; const EJ = p.E / 1000;
    const F = EJ / area; const Pavg = EJ * p.f;
    return { a, dcm, area, EJ, F, Pavg };
  }
  S['ep-laser-medical'] = {
    conceptual: true,
    approx: 'Qualitative visualizer. Penetration depths are approximate orders of magnitude (they depend strongly on tissue type and scattering) and are drawn on a logarithmic depth scale. The absorption spectra are schematic, based on approximate literature values of µa. Only fluence F = E/A (uniform spot), average power P = E·f and photon energy are calculated.',
    params: [
      { key: 'app', label: 'Application', type: 'select', default: 'lasik', options: [{ value: 'lasik', label: 'LASIK eye surgery (ArF 193 nm)' }, { value: 'retina', label: 'Retinal photocoagulation (532 nm)' }, { value: 'co2', label: 'CO₂ laser scalpel (10.6 µm)' }, { value: 'ndyag', label: 'Nd:YAG coagulation (1064 nm)' }, { value: 'litho', label: 'Laser lithotripsy (Ho:YAG 2.1 µm)' }] },
      { key: 'E', label: 'Pulse (exposure) energy E', type: 'range', min: 0.1, max: 3000, step: 0.1, default: 1.2, unit: 'mJ', help: 'For continuous lasers: power × exposure time.' },
      { key: 'd', label: 'Spot diameter d', type: 'range', min: 0.05, max: 5, step: 0.01, default: 1, unit: 'mm' },
      { key: 'f', label: 'Repetition rate f', type: 'range', min: 1, max: 1000, step: 1, default: 500, unit: 'Hz' },
    ],
    examples: [
      { label: 'LASIK flying spot: 1.2 mJ, 1 mm, 500 Hz', values: { app: 'lasik', E: 1.2, d: 1, f: 500 } },
      { label: 'Retina: 200 mW × 0.1 s on a 200 µm spot', values: { app: 'retina', E: 20, d: 0.2, f: 1 } },
      { label: 'CO₂ scalpel: 10 W × 0.1 s, 0.5 mm spot', values: { app: 'co2', E: 1000, d: 0.5, f: 10 } },
      { label: 'Ho:YAG lithotripsy: 1 J, 365 µm fibre, 10 Hz', values: { app: 'litho', E: 1000, d: 0.37, f: 10 } },
    ],
    validate(p) {
      const k = medCalc(p); const w = [];
      if (k.Pavg > 200) w.push(`Average power ${fmt(k.Pavg, 3)} W is unrealistically high for a medical laser (typically ≲ 100 W). Reduce E or f.`);
      return w;
    },
    compute(p) {
      const k = medCalc(p); const a = k.a;
      const Eph = HC_EVNM / a.lam;
      const formulas = [
        { name: 'Spot area', formula: 'A = π d² / 4', given: `d = ${p.d} mm = ${fmt(k.dcm, 3)} cm`, calc: `A = π × (${fmt(k.dcm, 3)})² / 4`, result: sci(k.area, 3), unit: 'cm²' },
        { name: 'Fluence (energy per area)', formula: 'F = E / A', given: `E = ${p.E} mJ = ${fmt(k.EJ, 3)} J, A = ${sci(k.area, 3)} cm²`, calc: `F = ${fmt(k.EJ, 3)} / ${sci(k.area, 3)}`, result: fmt(k.F, 3), unit: 'J/cm²' },
        { name: 'Average power', formula: 'P_avg = E × f', given: `E = ${fmt(k.EJ, 3)} J, f = ${p.f} Hz`, calc: `P_avg = ${fmt(k.EJ, 3)} × ${p.f}`, result: fmt(k.Pavg, 3), unit: 'W' },
        { name: 'Photon energy', formula: 'E_ph = hc / λ', given: `λ = ${a.lamTxt}`, calc: `E_ph = 1239.8 eV·nm / ${a.lam} nm`, result: fmt(Eph, 3), unit: 'eV' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Wavelength', value: a.lamTxt, tone: 'info' },
          { label: 'Absorber', value: a.abs === 'weak' ? 'weak (scatters)' : a.abs },
          { label: 'Penetration (approx.)', value: a.depthTxt },
          { label: 'Fluence F', value: `${fmt(k.F, 3)} J/cm²`, tone: 'good' },
        ],
        state: { application: a.title, laser: a.laser, wavelength: a.lamTxt, targetAbsorber: a.absTxt, penetrationDepth: a.depthTxt, pulseEnergy: `${p.E} mJ`, spotDiameter: `${p.d} mm`, fluence: `${fmt(k.F, 3)} J/cm²`, averagePower: `${fmt(k.Pavg, 3)} W`, photonEnergy: `${fmt(Eph, 3)} eV` },
        explain: {
          what: `${a.title}: ${p.E} mJ on a ${p.d} mm spot gives a fluence of ${fmt(k.F, 3)} J/cm². ${a.effect}`,
          why: `The wavelength is chosen to match the target absorber — here ${a.absTxt}. Strong absorption confines the energy to a thin layer (${a.depthTxt}) for precise cutting or ablation; weak absorption (Nd:YAG) lets it spread deep for volume coagulation.`,
          param: 'Application (laser wavelength), pulse energy, spot diameter and repetition rate.',
          effect: 'Halving the spot diameter makes the fluence 4 times larger. Changing the wavelength changes which molecule absorbs the light and therefore how deep and how precisely the tissue is affected.',
        },
      };
    },
    steps(p) {
      const k = medCalc(p); const a = k.a;
      return [
        { title: `Laser chosen: ${a.laser}, ${a.lamTxt}`, text: `For ${a.short} a ${a.laser} laser at ${a.lamTxt} is used (photon energy ${fmt(HC_EVNM / a.lam, 3)} eV).` },
        { title: 'Beam delivered to the tissue', text: `Delivery: ${a.delivery}. Spot diameter d = ${p.d} mm.` },
        { title: 'Wavelength matched to the absorber', text: `At ${a.lamTxt} the main absorber is ${a.absTxt} — see the marker on the absorption spectrum.` },
        { title: 'Energy deposited within the penetration depth', text: `Intensity falls roughly as I = I₀ e^(−µz); most energy is deposited within ${a.depthTxt}.` },
        { title: 'Tissue effect', text: a.effect },
        { title: 'Dose: fluence and average power', text: `F = E / (πd²/4) = ${fmt(k.EJ, 3)} J / ${sci(k.area, 3)} cm² = ${fmt(k.F, 3)} J/cm²; average power E·f = ${fmt(k.Pavg, 3)} W.` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1); const k = medCalc(p); const a = k.a;
      D.clear(g, '#ffffff');
      const col = a.lam > 700 ? '#991b1b' : a.lam < 380 ? '#6d28d9' : D.wavelengthColor(a.lam);
      T(g, a.title, 20, 26, { size: 20, weight: 800 });
      // tissue layers
      const tx0 = 20, tx1 = 570, surf = 210; const bx = 330;
      let y = surf; const layerY = [];
      a.layers.forEach(([name, fill, hgt]) => { layerY.push([y, y + hgt]); D.rect(g, tx0, y, tx1 - tx0, hgt, { fill }); D.line(g, tx0, y, tx1, y, { color: '#94a3b8', width: 1.5 }); y += hgt; });
      if (p.app === 'litho') { g.save(); g.beginPath(); g.ellipse(bx, layerY[1][0] + 62, 170, 58, 0, 0, Math.PI * 2); g.fillStyle = '#a8a29e'; g.fill(); g.strokeStyle = '#78716c'; g.lineWidth = 2; g.stroke(); g.restore(); }
      if (p.app === 'co2' || p.app === 'ndyag') for (let i = 0; i < 5; i++) { g.save(); g.beginPath(); g.ellipse(70 + i * 110, layerY[1][0] + 40 + (i % 2) * 44, 18, 8, 0, 0, Math.PI * 2); g.fillStyle = '#dc2626'; g.globalAlpha = 0.7; g.fill(); g.restore(); }
      a.layers.forEach(([name, fill], i) => { const [y0, y1] = layerY[i]; T(g, name, tx0 + 10, y0 + Math.min(17, (y1 - y0) / 2), { size: 16, weight: 800, color: fill === '#78350f' ? '#fff' : '#334155' }); });
      if (p.app === 'lasik') { D.poly(g, [[tx0 + 250, surf], [tx0 + 170, surf - 30], [tx0 + 20, surf - 36], [tx0 + 20, surf - 4]], { fill: '#e0f2fe', close: true, stroke: '#0369a1', width: 1.5 }); }
      const zTop = p.app === 'retina' ? layerY[1][0] : p.app === 'litho' ? layerY[1][0] : surf;
      const depthPx = clamp(14 + 40 * Math.log10(a.depthUm / 0.3), 8, 230);
      const spotPx = clamp(10 + 22 * Math.log10(p.d / 0.04), 8, 90);
      // source / delivery
      const f1 = step === 0 ? 0 : step === 1 ? Math.max(0.1, prog) : 1;
      let beamTop = 90;
      if (p.app === 'litho') { beamTop = zTop - 24; D.rect(g, bx - 6, 50, 12, beamTop - 50, { fill: '#e2e8f0', stroke: '#64748b', width: 1.5 }); D.rect(g, bx - 60, 50, 120, 36, { fill: '#1e293b', r: 6 }); T(g, a.laser, bx, 68, { size: 16, weight: 800, color: '#fff', align: 'center' }); T(g, 'fibre', bx + 16, 150, { size: 16, weight: 700, color: C.muted }); }
      else { D.rect(g, bx - 70, 50, 140, 36, { fill: '#1e293b', r: 6 }); T(g, a.laser, bx, 68, { size: 16, weight: 800, color: '#fff', align: 'center' }); }
      T(g, `Delivery: ${a.delivery}`, 20, 114, { size: 16, weight: 700, color: C.muted });
      if (step >= 1) {
        const yb = beamTop + (zTop - beamTop) * f1; const w0 = p.app === 'litho' ? 5 : 22;
        D.poly(g, [[bx - w0, beamTop], [bx - spotPx / 2, yb], [bx + spotPx / 2, yb], [bx + w0, beamTop]], { fill: col, close: true, stroke: false, alpha: 0.5 });
        D.tag(g, `d = ${p.d} mm`, bx - spotPx / 2 - 12, surf - 40, { bg: C.ink, size: 16, align: 'right' });
      }
      if (step === 0) D.focus(g, bx - 80, 44, 160, 48, t);
      if (step === 1) D.focus(g, bx - 70, 90, 140, zTop - 90, t);
      // absorption / deposition zone
      if (step >= 3) {
        const f = step === 3 ? Math.max(0.1, prog) : 1; const dp = depthPx * f;
        const wid = p.app === 'ndyag' ? spotPx / 2 + dp * 0.7 : spotPx / 2 + 4;
        const grd = g.createLinearGradient(0, zTop, 0, zTop + Math.max(1, dp));
        grd.addColorStop(0, 'rgba(234,88,12,0.9)'); grd.addColorStop(1, 'rgba(234,88,12,0.05)');
        g.save(); g.fillStyle = grd; g.beginPath(); g.ellipse(bx, zTop, wid, Math.max(1, dp), 0, 0, Math.PI); g.fill(); g.restore();
        const xr = bx + wid + 16;
        D.line(g, xr, zTop, xr, zTop + dp, { color: C.ink, width: 2 }); D.line(g, xr - 6, zTop, xr + 6, zTop, { color: C.ink, width: 2 }); D.line(g, xr - 6, zTop + dp, xr + 6, zTop + dp, { color: C.ink, width: 2 });
        T(g, `δ ${a.depthTxt}`, xr + 10, zTop + Math.max(12, dp / 2), { size: 17, weight: 800, halo: true });
        T(g, 'depth drawn on a log scale', tx1 - 6, 540, { size: 16, weight: 700, color: C.muted, align: 'right', halo: true });
        if (step === 3) D.focus(g, bx - wid - 10, zTop - 10, wid * 2 + 20, dp + 20, t);
      }
      if (step >= 4) {
        const f = step === 4 ? Math.max(0.1, prog) : 1;
        if (p.app === 'lasik' || p.app === 'co2') {
          const cw = spotPx * (p.app === 'lasik' ? 2.2 : 0.8); const cd = (p.app === 'lasik' ? 14 : 60) * f;
          g.save(); g.beginPath(); g.ellipse(bx, surf, cw / 2, Math.max(1, cd), 0, 0, Math.PI); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = p.app === 'co2' ? '#7c2d12' : '#0369a1'; g.lineWidth = 3; g.stroke(); g.restore();
          for (let i = 0; i < 8; i++) { const s = (t * 1.2 + i / 8) % 1; D.circle(g, bx + (rnd(i) - 0.5) * cw, surf - s * 60, 4 * (1 - s) + 1, { fill: '#94a3b8', alpha: 1 - s }); }
          T(g, p.app === 'lasik' ? 'ablated → reshaped' : 'vaporised cut, sealed edges', bx + Math.max(cw / 2, 20) + 12, surf - 22, { size: 16, weight: 800, color: '#7c2d12', halo: true });
        } else if (p.app === 'litho') {
          const sx = bx, sy = layerY[1][0] + 62;
          for (let i = 0; i < 12; i++) { const s = f * (0.3 + rnd(i) * 0.7); const ang = rnd(i + 5) * Math.PI * 2; const px = sx + Math.cos(ang) * 110 * s, py = sy + Math.sin(ang) * 40 * s; D.poly(g, [[px, py], [px + 16, py + 4], [px + 5, py + 15]], { fill: '#57534e', close: true, stroke: false }); }
          T(g, 'stone breaks into fragments', sx + 20, sy + 80, { size: 16, weight: 800, color: '#44403c', halo: true });
        } else {
          const zy = zTop + (p.app === 'retina' ? 14 : 0); const r = (p.app === 'ndyag' ? spotPx / 2 + depthPx * 0.6 : spotPx / 2 + 12) * f;
          g.save(); g.beginPath(); g.ellipse(bx, zy, Math.max(1, r), Math.max(1, r * (p.app === 'ndyag' ? 0.8 : 0.5)), 0, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); g.strokeStyle = '#7c2d12'; g.lineWidth = 2.5; g.setLineDash([6, 4]); g.stroke(); g.restore();
          T(g, 'coagulated zone', bx - r - 10, zy + Math.max(20, r * 0.5), { size: 16, weight: 800, color: '#7c2d12', align: 'right', halo: true });
        }
        if (step === 4) D.focus(g, bx - 120, surf - 60, 240, 200, t);
      }
      // ── Absorption spectrum (schematic)
      panel(g, 590, 44, 390, 290, '');
      T(g, 'Absorption µa (cm⁻¹) — schematic', 602, 62, { size: 16, weight: 800 });
      const lx = (um) => 650 + ((Math.log10(um) - Math.log10(0.15)) / (Math.log10(12) - Math.log10(0.15))) * 315;
      const ly = (lg) => 250 - ((lg + 4) / 9) * 165;
      D.rect(g, 650, 85, 315, 165, { fill: '#fff', stroke: C.line, width: 1.5 });
      [-4, 0, 4].forEach((e) => { D.line(g, 650, ly(e), 965, ly(e), { color: '#eef2f7', width: 1 }); T(g, pow10(e), 644, ly(e), { size: 16, color: C.muted, align: 'right' }); });
      [[0.2, '0.2'], [0.5, '0.5'], [1, '1'], [2, '2'], [5, '5'], [10, '10']].forEach(([v, s]) => { D.line(g, lx(v), 250, lx(v), 255, { color: C.faint, width: 1.5 }); T(g, s, lx(v), 266, { size: 16, color: C.muted, align: 'center' }); });
      T(g, 'λ (µm), log scale', 965, 286, { size: 16, color: C.muted, align: 'right', weight: 700 });
      g.save(); g.beginPath(); g.rect(650, 85, 315, 165); g.clip();
      Object.entries(SPEC).forEach(([key, s]) => {
        const hi = step >= 2 && (a.abs === key || (a.abs === 'melanin' && key === 'hb') || (a.abs === 'weak' && key === 'water'));
        D.poly(g, s.pts.map(([u, v]) => [lx(u), ly(v)]), { stroke: s.color, width: hi ? 4.5 : 2, alpha: hi || step < 2 ? 1 : 0.4 });
      });
      g.restore();
      const leg = [['water', 602, 306], ['hb', 700, 306], ['melanin', 840, 306], ['protein', 602, 326]];
      leg.forEach(([key, x, yy]) => { D.line(g, x, yy, x + 18, yy, { color: SPEC[key].color, width: 4 }); T(g, SPEC[key].name, x + 24, yy, { size: 16, weight: 700, color: C.muted }); });
      const mx = lx(a.lam / 1000);
      D.line(g, mx, 85, mx, 250, { color: col, width: 3, dash: [6, 4] });
      D.tag(g, a.lamTxt.split(' (')[0], clamp(mx, 700, 920), 102, { bg: col, size: 16, align: 'center' });
      if (step === 2) D.focus(g, 646, 82, 322, 172, t);
      // results
      panel(g, 590, 345, 390, 205, 'Dose');
      T(g, `Absorber: ${a.absTxt}`, 606, 388, { size: 16, weight: 800, color: '#7c2d12' });
      row(g, 606, 418, 358, 'Spot area A', `${sci(k.area, 3)} cm²`);
      row(g, 606, 446, 358, 'Fluence F = E/A', `${fmt(k.F, 3)} J/cm²`, C.green);
      row(g, 606, 474, 358, 'Average power E·f', `${fmt(k.Pavg, 3)} W`);
      row(g, 606, 502, 358, 'Penetration δ', a.depthTxt);
      row(g, 606, 530, 358, 'E, d, f', `${p.E} mJ, ${p.d} mm, ${p.f} Hz`);
      if (step === 5) D.focus(g, 596, 402, 378, 58, t);
    },
  };
})();
