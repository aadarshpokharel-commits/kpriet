'use strict';

/* Engineering Physics — Unit 4: Thermal Physics and Fluids. */
(function () {
  const S = (window.EPSims = window.EPSims || {});
  const D = window.EPDraw;
  const { C, fmt, rad, deg, clamp } = D;

  // Physical constants (SI)
  const SIGMA = 5.670e-8; const WIEN = 2.898e-3; const GRAV = 9.81;
  const HPL = 6.626e-34; const CL = 2.998e8; const KB = 1.381e-23;

  /** Solid materials: k (W/m·K), ρ (kg/m³), c (J/kg·K) — typical room-temperature values. */
  const MAT = {
    cu: { name: 'Copper', k: 401, rho: 8960, c: 385, color: '#c2410c' },
    al: { name: 'Aluminium', k: 237, rho: 2700, c: 897, color: '#94a3b8' },
    brass: { name: 'Brass', k: 109, rho: 8530, c: 380, color: '#ca8a04' },
    steel: { name: 'Steel', k: 50, rho: 7850, c: 490, color: '#475569' },
    glass: { name: 'Glass', k: 1.0, rho: 2500, c: 840, color: '#38bdf8' },
    wood: { name: 'Wood (pine)', k: 0.12, rho: 500, c: 1700, color: '#92400e' },
  };
  const MAT_KEYS = ['cu', 'al', 'brass', 'steel', 'glass', 'wood'];
  const matOptions = MAT_KEYS.map((k) => ({ value: k, label: `${MAT[k].name} (k = ${MAT[k].k} W/m·K)` }));

  /** Friendly time: s / min / h / days. */
  function fmtTime(s) {
    if (!(s > 0) || !Number.isFinite(s)) return '0 s';
    if (s < 60) return `${fmt(s, 3)} s`;
    if (s < 3600) return `${fmt(s / 60, 3)} min`;
    if (s < 172800) return `${fmt(s / 3600, 3)} h`;
    return `${fmt(s / 86400, 3)} days`;
  }
  const safe = (v, d = 0) => (Number.isFinite(v) ? v : d);

  /** x–y plot with smart-board sized labels (≥ 16 px). */
  function plot(g, x, y, w, h, o = {}) {
    const xmin = o.xmin ?? 0, xmax = o.xmax ?? 1, ymin = o.ymin ?? 0, ymax = o.ymax ?? 1;
    const X = (v) => x + ((v - xmin) / (xmax - xmin || 1)) * w;
    const Y = (v) => y + h - ((v - ymin) / (ymax - ymin || 1)) * h;
    D.rect(g, x, y, w, h, { fill: '#ffffff', stroke: C.line, width: 1.5 });
    const xt = o.xticks ?? 4; const yt = o.yticks ?? 4;
    for (let i = 0; i <= xt; i++) {
      const v = xmin + ((xmax - xmin) * i) / xt;
      D.line(g, X(v), y + h, X(v), y + h + 5, { color: C.faint, width: 1.5 });
      D.text(g, o.xfmt ? o.xfmt(v) : fmt(v, 3), X(v), y + h + 16, { size: 16, color: C.muted, align: 'center' });
    }
    for (let i = 0; i <= yt; i++) {
      const v = ymin + ((ymax - ymin) * i) / yt;
      if (i > 0 && i < yt) D.line(g, x, Y(v), x + w, Y(v), { color: '#eef2f7', width: 1 });
      if (o.yfmt !== false) D.text(g, o.yfmt ? o.yfmt(v) : fmt(v, 3), x - 7, Y(v), { size: 16, color: C.muted, align: 'right' });
    }
    if (o.xlabel) D.text(g, o.xlabel, x + w / 2, y + h + 38, { size: 16, color: C.muted, align: 'center', weight: 700 });
    if (o.ylabel) D.text(g, o.ylabel, x - (o.ylo || 50), y + h / 2, { size: 16, color: C.muted, align: 'center', weight: 700, rotate: -Math.PI / 2 });
    if (o.title) D.text(g, o.title, x, y - 16, { size: 17, weight: 800 });
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    if (o.under) o.under(X, Y);
    (o.series || []).forEach((s) => {
      if (!s.points || s.points.length < 2) return;
      const pts = s.points.map(([a, b]) => [X(a), Y(b)]);
      if (s.fill) D.poly(g, [[pts[0][0], Y(ymin)], ...pts, [pts[pts.length - 1][0], Y(ymin)]], { fill: s.fill, close: true, stroke: false, alpha: s.fillAlpha ?? 0.22 });
      D.poly(g, pts, { stroke: s.color || C.blue, width: s.width || 3, dash: s.dash, alpha: s.alpha });
    });
    g.restore();
    return { X, Y };
  }

  /** Info panel: title + lines [{t, color, size, weight}]. */
  function panel(g, x, y, w, title, lines, o = {}) {
    const lh = o.lh || 27; const h = 44 + lines.length * lh + 6;
    D.rect(g, x, y, w, h, { fill: o.bg || '#f8fafc', stroke: o.border || C.line, width: 1.5, r: 10 });
    D.text(g, title, x + 14, y + 22, { size: 18, weight: 800, color: o.titleColor || C.ink });
    lines.forEach((l, i) => {
      const L = typeof l === 'string' ? { t: l } : l;
      D.text(g, L.t, x + 14, y + 52 + i * lh, { size: L.size || 17, weight: L.weight || 650, color: L.color || C.ink });
    });
    return h;
  }

  /** Curved flow arrow along an ellipse arc (for convection loops). */
  function arcArrow(g, cx, cy, a, b, t0, t1, color, width = 3) {
    const pts = []; const n = 30;
    for (let i = 0; i <= n; i++) { const t = t0 + ((t1 - t0) * i) / n; pts.push([cx + a * Math.cos(t), cy + b * Math.sin(t)]); }
    D.poly(g, pts.slice(0, -2), { stroke: color, width });
    const A = pts[pts.length - 3]; const B = pts[pts.length - 1];
    D.arrow(g, A[0], A[1], B[0], B[1], { color, width, head: 14 });
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Heat Conduction Simulator
  // ─────────────────────────────────────────────────────────────
  /** T(x) along a rod (x = 0..1), ends held at Th, Tc, initially at Tc; tau = αt/L². */
  function rodProfile(x, tau, Th, Tc) {
    const ss = Th - (Th - Tc) * x;
    if (!(tau < 3)) return ss;
    if (tau <= 0) return x <= 0 ? Th : Tc;
    let s = 0;
    for (let n = 1; n <= 400; n++) {
      const e = Math.exp(-n * n * Math.PI * Math.PI * tau); if (e < 1e-7) break;
      s += (2 / (n * Math.PI)) * Math.sin(n * Math.PI * x) * e;
    }
    return ss - (Th - Tc) * s;
  }

  S['ep-heat-conduction'] = {
    approx: 'One-dimensional conduction through a rod whose sides are perfectly insulated; k is taken as constant. The steady-state profile is exactly linear. The warm-up curve uses the exact Fourier-series solution with the rod starting at T_cold.',
    modes: [{ key: 'steady', label: 'Steady state' }, { key: 'transient', label: 'Warming up (transient)' }],
    params: [
      { key: 'Th', label: 'Hot end temperature T_hot', type: 'range', min: 0, max: 500, step: 1, default: 100, unit: '°C', help: 'Temperature of the hot reservoir at the left end (e.g. boiling water = 100 °C).' },
      { key: 'Tc', label: 'Cold end temperature T_cold', type: 'range', min: -20, max: 200, step: 1, default: 20, unit: '°C', help: 'Temperature of the cold reservoir at the right end.' },
      { key: 'mat', label: 'Rod material', type: 'select', options: matOptions, default: 'cu' },
      { key: 'L', label: 'Rod length L', type: 'range', min: 0.5, max: 200, step: 0.5, default: 50, unit: 'cm' },
      { key: 'A', label: 'Cross-sectional area A', type: 'range', min: 0.1, max: 50, step: 0.1, default: 1, unit: 'cm²' },
      { key: 'tf', label: 'Elapsed time t (fraction of L²/α)', type: 'range', min: 0, max: 1, step: 0.01, default: 0.05, showIf: (p) => p.mode === 'transient', help: 'Time since the hot end was switched on, in units of the diffusion time L²/α.' },
    ],
    examples: [
      { label: 'Copper rod between boiling water and ice', values: { mat: 'cu', Th: 100, Tc: 0, L: 50, A: 1 } },
      { label: 'Steel poker in a 400 °C fire', values: { mat: 'steel', Th: 400, Tc: 25, L: 60, A: 1.5 } },
      { label: 'Glass window pane 5 mm thick (50 cm² patch)', values: { mat: 'glass', Th: 20, Tc: 0, L: 0.5, A: 50 } },
      { label: 'Wooden spoon in hot soup', values: { mat: 'wood', Th: 90, Tc: 25, L: 25, A: 1.5 } },
    ],
    validate(p) {
      const w = [];
      if (p.Th === p.Tc) w.push('Both ends are at the same temperature — there is no temperature difference, so no heat flows.');
      else if (p.Th < p.Tc) w.push('The "cold" end is hotter than the "hot" end — heat will flow from right to left.');
      return w;
    },
    compute(p) {
      const m = MAT[p.mat] || MAT.cu; const L = p.L / 100; const A = p.A * 1e-4; const dT = p.Th - p.Tc;
      const Q = (m.k * A * dT) / L; const R = L / (m.k * A); const grad = dT / L; const alpha = m.k / (m.rho * m.c); const tD = (L * L) / alpha;
      const tNow = (p.tf || 0) * tD; const flux = Q / A;
      const formulas = [
        { name: "Fourier's law of conduction", formula: 'Q/t = k·A·ΔT / L', given: `k = ${m.k} W/m·K, A = ${fmt(p.A, 3)} cm² = ${fmt(A, 3)} m², ΔT = ${fmt(Math.abs(dT), 3)} K, L = ${fmt(L, 3)} m`,
          calc: `Q/t = ${m.k} × ${fmt(A, 3)} × ${fmt(Math.abs(dT), 3)} / ${fmt(L, 3)}`, result: fmt(Math.abs(Q), 3), unit: 'watts (W = J/s)' },
        { name: 'Thermal resistance', formula: 'R = L / (k·A)', given: `L = ${fmt(L, 3)} m, k = ${m.k} W/m·K, A = ${fmt(A, 3)} m²`,
          calc: `R = ${fmt(L, 3)} / (${m.k} × ${fmt(A, 3)})  →  Q/t = ΔT / R = ${fmt(Math.abs(dT), 3)} / ${fmt(R, 3)}`, result: fmt(R, 3), unit: 'K/W' },
        { name: 'Temperature gradient (steady state)', formula: 'dT/dx = ΔT / L   (linear profile)', given: `ΔT = ${fmt(Math.abs(dT), 3)} K, L = ${fmt(L, 3)} m`,
          calc: `${fmt(Math.abs(dT), 3)} / ${fmt(L, 3)}`, result: fmt(Math.abs(grad), 3), unit: 'K/m (°C per metre)' },
        { name: 'Thermal diffusivity and warm-up time', formula: 'α = k / (ρ·c),   t ≈ L²/α (order of magnitude)', given: `ρ = ${m.rho} kg/m³, c = ${m.c} J/kg·K, L = ${fmt(L, 3)} m`,
          calc: `α = ${m.k} / (${m.rho} × ${m.c}) = ${fmt(alpha, 3)} m²/s;  L²/α = ${fmt(L * L, 3)} / ${fmt(alpha, 3)}`, result: `${fmt(tD, 3)} s ≈ ${fmtTime(tD)}`, unit: 'seconds (s)' },
      ];
      const readouts = [
        { label: 'Heat flow Q/t', value: `${fmt(Math.abs(Q), 3)} W`, tone: 'info' },
        { label: 'Thermal resistance', value: `${fmt(R, 3)} K/W` },
        { label: 'Gradient', value: `${fmt(Math.abs(grad), 3)} K/m` },
        { label: 'Warm-up scale L²/α', value: fmtTime(tD), tone: 'warn' },
      ];
      const dir = dT > 0 ? 'left → right (hot → cold)' : dT < 0 ? 'right → left (hot → cold)' : 'none';
      return {
        formulas, readouts,
        state: { material: m.name, k: `${m.k} W/m·K`, Thot: `${p.Th} °C`, Tcold: `${p.Tc} °C`, length: `${p.L} cm`, area: `${p.A} cm²`, heatFlow: `${fmt(Math.abs(Q), 3)} W`, heatFlux: `${fmt(Math.abs(flux), 3)} W/m²`, thermalResistance: `${fmt(R, 3)} K/W`, gradient: `${fmt(Math.abs(grad), 3)} K/m`, diffusivity: `${fmt(alpha, 3)} m²/s`, warmupTime: fmtTime(tD), elapsed: p.mode === 'transient' ? fmtTime(tNow) : 'steady state', direction: dir },
        explain: {
          what: dT === 0 ? `Both ends of the ${m.name.toLowerCase()} rod are at ${p.Th} °C, so there is no temperature difference and no heat flows.` : `Heat flows ${dir} through a ${p.L} cm ${m.name.toLowerCase()} rod. In steady state the temperature falls linearly from ${Math.max(p.Th, p.Tc)} °C to ${Math.min(p.Th, p.Tc)} °C and ${fmt(Math.abs(Q), 3)} W passes through every cross-section.`,
          why: 'Faster-vibrating atoms (and, in metals, free electrons) at the hot end pass energy to their cooler neighbours. The rate is proportional to the temperature gradient ΔT/L, the area A and the thermal conductivity k (Fourier\'s law).',
          param: `Material (k = ${m.k} W/m·K), temperature difference ΔT = ${fmt(Math.abs(dT), 3)} K, length L = ${p.L} cm and area A = ${p.A} cm².`,
          effect: `Doubling ΔT or A doubles Q/t; doubling L halves Q/t (R = L/kA doubles). The time to warm up grows as L² — doubling L takes about 4× longer (${fmtTime(tD)} → ${fmtTime(4 * tD)}).`,
        },
      };
    },
    steps(p, c) {
      const st = c.state;
      return [
        { title: 'Two reservoirs at different temperatures', text: `The left end is held at ${p.Th} °C and the right end at ${p.Tc} °C. The ${st.material.toLowerCase()} rod (k = ${st.k}) connects them; its sides are insulated.` },
        { title: p.mode === 'transient' ? 'The rod warms up from the hot end' : 'Temperature settles into a straight line', text: p.mode === 'transient' ? `After t = ${st.elapsed} the heat has only reached part of the rod. The curve moves towards the straight steady line.` : 'Energy spreads from atom to atom. After a while every point stops changing: the steady profile is a straight line from hot to cold.' },
        { title: 'Heat flows from hot to cold', text: `Heat always flows down the temperature gradient: ${st.direction}. Gradient = ΔT/L = ${st.gradient}.` },
        { title: "Fourier's law gives the heat flow", text: `Q/t = kAΔT/L = ${st.heatFlow}. Thermal resistance R = L/(kA) = ${st.thermalResistance}, so Q/t = ΔT/R.` },
        { title: 'How long does it take?', text: `Thermal diffusivity α = k/(ρc) = ${st.diffusivity}. The warm-up time is of the order of L²/α ≈ ${st.warmupTime}.` },
      ];
    },
    draw(g, S2) {
      const { p, c, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff');
      const m = MAT[p.mat] || MAT.cu; const dT = p.Th - p.Tc; const Tmax = Math.max(p.Th, p.Tc); const Tmin = Math.min(p.Th, p.Tc);
      const frac = (T) => (Tmax === Tmin ? 0.5 : (T - Tmin) / (Tmax - Tmin));
      const tauFinal = p.mode === 'transient' ? p.tf : 5;
      const tau = step === 0 ? 0 : step === 1 ? (p.mode === 'transient' ? tauFinal * prog : 0.5 * prog * prog + (prog >= 1 ? 5 : 0)) : tauFinal;
      const x0 = 160, x1 = 840, ry = 112, rh = 58;
      // reservoirs
      const hotCol = D.heat(frac(p.Th)); const coldCol = D.heat(frac(p.Tc));
      D.rect(g, 20, 70, 140, 140, { fill: hotCol, r: 12, stroke: C.ink, width: 2 });
      D.rect(g, 840, 70, 140, 140, { fill: coldCol, r: 12, stroke: C.ink, width: 2 });
      D.text(g, p.Th >= p.Tc ? 'HOT' : 'Left end', 90, 115, { size: 20, weight: 800, color: '#fff', align: 'center', halo: 'rgba(0,0,0,0.35)' });
      D.text(g, `${p.Th} °C`, 90, 150, { size: 22, weight: 800, color: '#fff', align: 'center', halo: 'rgba(0,0,0,0.35)' });
      D.text(g, p.Tc <= p.Th ? 'COLD' : 'Right end', 910, 115, { size: 20, weight: 800, color: '#fff', align: 'center', halo: 'rgba(0,0,0,0.35)' });
      D.text(g, `${p.Tc} °C`, 910, 150, { size: 22, weight: 800, color: '#fff', align: 'center', halo: 'rgba(0,0,0,0.35)' });
      // insulation
      D.rect(g, x0, ry - 12, x1 - x0, rh + 24, { fill: '#f1f5f9', stroke: C.faint, width: 1.5, dash: [6, 5] });
      // rod colour map
      const N = 136;
      for (let i = 0; i < N; i++) {
        const xf = (i + 0.5) / N; const T = rodProfile(xf, tau, p.Th, p.Tc);
        D.rect(g, x0 + (i * (x1 - x0)) / N, ry, (x1 - x0) / N + 0.8, rh, { fill: D.heat(frac(T)) });
      }
      D.rect(g, x0, ry, x1 - x0, rh, { stroke: C.ink, width: 2 });
      D.text(g, `${m.name} rod · L = ${p.L} cm · A = ${p.A} cm² · sides insulated`, 500, 196, { size: 17, weight: 700, color: C.muted, align: 'center' });
      if (step === 0) D.focus(g, 20, 70, 140, 140, t), D.focus(g, 840, 70, 140, 140, t);
      // heat flow arrows (hot → cold)
      if (step >= 2 && dT !== 0) {
        const dir = dT > 0 ? 1 : -1; const f = step === 2 ? prog : 1;
        D.arrow(g, 500 - dir * 250, 58, 500 - dir * 250 + dir * 500 * f, 58, { color: C.red, width: 6, head: 20 });
        D.tag(g, `${p.mode === 'transient' ? 'Steady heat flow' : 'Heat flow'}  Q/t = ${c.state.heatFlow}`, 500, 30, { bg: C.red, size: 18, align: 'center' });
        for (let k = 0; k < 6; k++) {
          const ph = ((t * 0.25 + k / 6) % 1); const ax = dir > 0 ? x0 + 30 + ph * (x1 - x0 - 90) : x1 - 30 - ph * (x1 - x0 - 90);
          D.arrow(g, ax, ry + rh / 2, ax + dir * 44, ry + rh / 2, { color: '#ffffff', width: 4, head: 14 });
        }
        if (step === 2) D.focus(g, x0, ry, x1 - x0, rh, t);
      } else if (step >= 2) D.tag(g, 'ΔT = 0 → no heat flow', 500, 40, { bg: C.muted, size: 18, align: 'center' });
      // chart
      const showChart = step >= 1;
      const cx = 110, cy = 262, cw = 500, ch = 200;
      const pad = Math.max(5, (Tmax - Tmin) * 0.1);
      const pts = []; for (let i = 0; i <= 120; i++) { const xf = i / 120; pts.push([xf * p.L, rodProfile(xf, tau, p.Th, p.Tc)]); }
      plot(g, cx, cy, cw, ch, { xmin: 0, xmax: p.L, ymin: Tmin - pad, ymax: Tmax + pad, xticks: 4, yticks: 4, xlabel: 'Position along the rod x (cm)', ylabel: 'T (°C)', ylo: 58, title: 'Temperature distribution T(x)',
        series: showChart ? [{ points: [[0, p.Th], [p.L, p.Tc]], color: C.muted, width: 2, dash: [8, 6] }, { points: pts, color: C.red, width: 4 }] : [] });
      if (showChart) {
        D.text(g, 'dashed: steady (linear)', cx + cw - 8, cy + 18, { size: 16, color: C.muted, align: 'right', weight: 700 });
        if (step === 1) D.focus(g, cx, cy, cw, ch, t);
      } else D.text(g, 'appears in step 2', cx + cw / 2, cy + ch / 2, { size: 17, color: C.faint, align: 'center' });
      // info panel
      const s = c.state; const lines = [
        { t: `k = ${m.k} W/m·K` },
        { t: `ΔT = ${fmt(Math.abs(dT), 3)} K,  L = ${fmt(p.L / 100, 3)} m` },
        { t: `Q/t = kAΔT/L = ${s.heatFlow}`, color: step >= 3 ? C.red : C.ink, weight: 800 },
        { t: `R = L/(kA) = ${s.thermalResistance}`, color: step >= 3 ? C.blue : C.ink },
        { t: `dT/dx = ${s.gradient}` },
        { t: `α = k/(ρc) = ${s.diffusivity}` },
        { t: `t ≈ L²/α ≈ ${s.warmupTime}`, color: step >= 4 ? C.amber : C.ink, weight: 800 },
      ];
      panel(g, 660, 232, 320, "Fourier's law", lines, { lh: 36 });
      if (step === 3) D.focus(g, 660, 300, 320, 110, t);
      if (step === 4) D.focus(g, 660, 450, 320, 90, t);
      if (p.mode === 'transient' && step >= 1) {
        const tn = (step === 1 ? prog : 1) * p.tf * ((p.L / 100) ** 2) / (m.k / (m.rho * m.c));
        D.tag(g, `t = ${fmtTime(tn)}`, 600, 250, { bg: C.amber, size: 17, align: 'right' });
      }
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 2. Heat Convection Simulator
  // ─────────────────────────────────────────────────────────────
  const H_RANGES = [
    { key: 'natural-air', label: 'Natural, air/gas', lo: 2, hi: 25, color: C.cyan },
    { key: 'natural-water', label: 'Natural, water', lo: 50, hi: 1000, color: C.blue },
    { key: 'forced-air', label: 'Forced, air/gas', lo: 25, hi: 250, color: C.amber },
    { key: 'forced-water', label: 'Forced, water', lo: 100, hi: 20000, color: C.red },
  ];
  S['ep-heat-convection'] = {
    approx: "Newton's law of cooling with a single average heat-transfer coefficient h. Typical h ranges are textbook values (Incropera); the real h depends on geometry, speed and fluid properties. The circulation pattern is a simplified two-cell picture.",
    modes: [{ key: 'natural', label: 'Natural (free) convection' }, { key: 'forced', label: 'Forced convection (pump / stirrer / fan)' }],
    params: [
      { key: 'fluid', label: 'Fluid', type: 'select', options: [{ value: 'water', label: 'Water' }, { value: 'air', label: 'Air' }], default: 'water' },
      { key: 'Ts', label: 'Heater / surface temperature T_s', type: 'range', min: 20, max: 300, step: 1, default: 60, unit: '°C' },
      { key: 'Tf', label: 'Fluid (bulk) temperature T∞', type: 'range', min: 0, max: 80, step: 1, default: 20, unit: '°C' },
      { key: 'h', label: 'Heat-transfer coefficient h', type: 'range', min: 2, max: 5000, step: 1, default: 300, unit: 'W/m²·K', help: 'Depends on the fluid and on how fast it moves past the surface.' },
      { key: 'A', label: 'Heated surface area A', type: 'range', min: 0.001, max: 2, step: 0.001, default: 0.05, unit: 'm²' },
    ],
    examples: [
      { label: 'Kettle element in still water', values: { mode: 'natural', fluid: 'water', Ts: 90, Tf: 25, h: 500, A: 0.02 } },
      { label: 'Room radiator (natural air)', values: { mode: 'natural', fluid: 'air', Ts: 60, Tf: 20, h: 8, A: 1.5 } },
      { label: 'CPU heat sink with a fan', values: { mode: 'forced', fluid: 'air', Ts: 70, Tf: 30, h: 100, A: 0.05 } },
      { label: 'Stirred water bath', values: { mode: 'forced', fluid: 'water', Ts: 50, Tf: 20, h: 2000, A: 0.05 } },
    ],
    validate(p) {
      const w = []; const r = H_RANGES.find((x) => x.key === `${p.mode}-${p.fluid}`);
      if (r && (p.h < r.lo || p.h > r.hi)) w.push(`h = ${p.h} W/m²·K is outside the typical range for ${r.label.toLowerCase()} convection (${r.lo}–${r.hi} W/m²·K).`);
      if (p.Ts <= p.Tf) w.push('The surface is not hotter than the fluid — heat flows from the fluid into the surface (or not at all).');
      if (p.fluid === 'water' && p.Ts > 100) w.push('Water at 1 atm boils at 100 °C — above this, boiling (not simple convection) takes over.');
      return w;
    },
    compute(p) {
      const dT = p.Ts - p.Tf; const q = p.h * p.A * dT; const flux = p.h * dT;
      const r = H_RANGES.find((x) => x.key === `${p.mode}-${p.fluid}`) || H_RANGES[0];
      const fl = p.fluid === 'water' ? 'water' : 'air';
      const formulas = [
        { name: "Newton's law of cooling (convection)", formula: 'q = h·A·(T_s − T∞)', given: `h = ${p.h} W/m²·K, A = ${fmt(p.A, 3)} m², T_s = ${p.Ts} °C, T∞ = ${p.Tf} °C`,
          calc: `q = ${p.h} × ${fmt(p.A, 3)} × (${p.Ts} − ${p.Tf}) = ${p.h} × ${fmt(p.A, 3)} × ${dT}`, result: fmt(q, 3), unit: 'watts (W)' },
        { name: 'Heat flux (per unit area)', formula: 'q″ = h·(T_s − T∞)', given: `h = ${p.h} W/m²·K, ΔT = ${dT} K`, calc: `${p.h} × ${dT}`, result: fmt(flux, 3), unit: 'W/m²' },
        { name: 'Convective resistance', formula: 'R_conv = 1 / (h·A)', given: `h = ${p.h}, A = ${fmt(p.A, 3)} m²`, calc: `1 / (${p.h} × ${fmt(p.A, 3)})`, result: fmt(1 / (p.h * p.A), 3), unit: 'K/W' },
      ];
      const inRange = p.h >= r.lo && p.h <= r.hi;
      return {
        formulas,
        readouts: [
          { label: 'Heat transfer q', value: `${fmt(q, 3)} W`, tone: q >= 0 ? 'info' : 'warn' },
          { label: 'ΔT', value: `${dT} K` },
          { label: 'Heat flux', value: `${fmt(flux, 3)} W/m²` },
          { label: 'Typical h here', value: `${r.lo}–${r.hi} W/m²·K`, tone: inRange ? 'good' : 'warn' },
        ],
        state: { mode: p.mode, fluid: fl, surfaceTemp: `${p.Ts} °C`, fluidTemp: `${p.Tf} °C`, h: `${p.h} W/m²·K`, area: `${p.A} m²`, heatRate: `${fmt(q, 3)} W`, heatFlux: `${fmt(flux, 3)} W/m²`, typicalRange: `${r.lo}–${r.hi} W/m²·K`, hInTypicalRange: inRange },
        explain: {
          what: `The heater at ${p.Ts} °C warms the ${fl} next to it. ${p.mode === 'natural' ? 'Warm fluid rises and cool fluid sinks, forming a convection current' : 'A pump/stirrer pushes the fluid past the surface, carrying heat away faster'}. The heat carried away is q = hAΔT = ${fmt(q, 3)} W.`,
          why: p.mode === 'natural' ? 'Heated fluid expands, its density drops, and buoyancy pushes it up; cooler, denser fluid sinks to replace it. The moving fluid carries energy with it.' : 'Forced motion thins the thermal boundary layer at the surface, so the temperature gradient there is steeper and h is larger than in natural convection.',
          param: `Surface temperature T_s = ${p.Ts} °C, fluid temperature T∞ = ${p.Tf} °C, coefficient h = ${p.h} W/m²·K and area A = ${p.A} m².`,
          effect: `q is proportional to h, A and (T_s − T∞): doubling any one of them doubles the heat transfer. Stirring/fans (forced convection) raise h, typically ${r.key.startsWith('natural') ? 'several times' : 'well'} above natural convection.`,
        },
      };
    },
    steps(p, c) {
      const s = c.state;
      return [
        { title: 'The fluid is heated from below', text: `The heater at ${s.surfaceTemp} warms the layer of ${s.fluid} touching it (by conduction).` },
        { title: 'Hot fluid rises ↑', text: 'The warm fluid expands, becomes less dense and buoyancy lifts it upward.' },
        { title: 'Cool fluid sinks ↓', text: `At the top and near the walls the fluid cools to about ${s.fluidTemp}, becomes denser and sinks back down.` },
        { title: p.mode === 'natural' ? 'A convection current forms' : 'Forced flow: the pump/stirrer drives the current', text: p.mode === 'natural' ? 'Rising and sinking fluid join into closed loops — the convection current — which carries heat through the whole container.' : 'The stirrer moves the fluid much faster than buoyancy alone, so heat is carried away more quickly.' },
        { title: "Newton's law of cooling", text: `q = hA(T_s − T∞) = ${s.h} × ${s.area} × ΔT = ${s.heatRate}.` },
        { title: 'Natural vs forced convection', text: `Typical h for this case: ${s.typicalRange}. Forced convection gives larger h than natural convection with the same fluid.` },
      ];
    },
    draw(g, S2) {
      const { p, c, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff');
      const water = p.fluid === 'water'; const forced = p.mode === 'forced'; const dT = p.Ts - p.Tf; const heating = dT > 0;
      const bx = 160, by = 80, bw = 380, bh = 340;
      // container
      D.rect(g, bx, by, bw, bh, { fill: water ? '#dbeafe' : '#f1f5f9' });
      D.poly(g, [[bx, by - 20], [bx, by + bh], [bx + bw, by + bh], [bx + bw, by - 20]], { stroke: C.ink, width: 4 });
      D.text(g, water ? 'Water' : 'Air', bx + 12, by + 20, { size: 17, weight: 800, color: '#1e3a8a' });
      D.text(g, `T∞ = ${p.Tf} °C`, bx + bw - 12, by + 20, { size: 17, weight: 800, color: C.blue, align: 'right' });
      // heater
      const glow = step >= 0 ? 0.5 + 0.5 * Math.sin(t * 4) : 0;
      D.rect(g, bx + 110, by + bh + 6, bw - 220, 18, { fill: heating ? C.red : C.blue, r: 6, alpha: 0.75 + 0.25 * glow });
      for (let k = 0; k < 5; k++) { const fx = bx + 125 + k * 32; D.poly(g, [[fx, by + bh + 50], [fx + 10, by + bh + 28], [fx + 20, by + bh + 50]], { fill: heating ? C.orange : C.faint, close: true, stroke: false, alpha: 0.8 }); }
      D.text(g, `Heater  T_s = ${p.Ts} °C`, bx + bw / 2, by + bh + 70, { size: 18, weight: 800, color: C.red, align: 'center' });
      // warm bottom layer
      if (heating) D.rect(g, bx + 2, by + bh - 34, bw - 4, 32, { fill: '#fecaca', alpha: 0.55 });
      if (step === 0) D.focus(g, bx, by + bh - 36, bw, 90, t);
      // particles on two cells
      const cxL = bx + bw * 0.27, cxR = bx + bw * 0.73, cyc = by + bh * 0.52, a = bw * 0.2, b = bh * 0.38;
      const speed = (forced ? 1.1 : 0.45) * (0.5 + 0.25 * Math.log10(Math.max(2, p.h))) * (heating ? 1 : 0.25) * (step === 0 ? 0.25 : 1);
      for (let cell = 0; cell < 2; cell++) {
        for (let i = 0; i < 16; i++) {
          const ph0 = (i / 16) * Math.PI * 2 + cell * 0.2; const rr = 0.55 + 0.4 * ((i * 7) % 5) / 4;
          const phi = cell === 0 ? ph0 - speed * t : ph0 + speed * t;
          const px = (cell === 0 ? cxL : cxR) + a * rr * Math.cos(phi); const py = cyc + b * rr * Math.sin(phi);
          const hot = cell === 0 ? 0.5 + 0.5 * Math.cos(phi) : 0.5 - 0.5 * Math.cos(phi);
          const vert = Math.sin(phi) > 0.6 ? 1 : 0; // bottom part gets heated
          const f = heating ? clamp(0.15 + 0.7 * hot + 0.15 * vert, 0, 1) : 0.2;
          D.circle(g, px, py, 7, { fill: D.heat(f), stroke: '#fff', width: 1.5 });
        }
      }
      // hot rising arrow and cool sinking arrows
      if (step >= 1 && heating) {
        const f = step === 1 ? prog : 1;
        D.arrow(g, bx + bw / 2, by + bh - 40, bx + bw / 2, by + bh - 40 - 230 * f, { color: C.red, width: 7, head: 22 });
        D.tag(g, 'Hot Fluid ↑', bx + bw / 2, by + 150, { bg: C.red, size: 18, align: 'center' });
        D.text(g, 'less dense', bx + bw / 2, by + 180, { size: 16, weight: 800, color: C.red, align: 'center', halo: true });
        if (step === 1) D.focus(g, bx + bw / 2 - 70, by + 60, 140, bh - 90, t);
      }
      if (step >= 2 && heating) {
        const f = step === 2 ? prog : 1;
        [bx + 22, bx + bw - 22].forEach((xx) => D.arrow(g, xx, by + 70, xx, by + 70 + 230 * f, { color: C.blue, width: 7, head: 22 }));
        D.tag(g, 'Cool Fluid ↓', bx - 10, by + 200, { bg: C.blue, size: 18, align: 'right' });
        D.tag(g, 'Cool Fluid ↓', bx + bw + 10, by + 200, { bg: C.blue, size: 18 });
        D.text(g, 'denser', bx - 10, by + 232, { size: 16, weight: 800, color: C.blue, align: 'right' });
        D.text(g, 'denser', bx + bw + 10, by + 232, { size: 16, weight: 800, color: C.blue });
        if (step === 2) { D.focus(g, bx - 150, by + 60, 170, 250, t); }
      }
      if (step >= 3 && heating) {
        arcArrow(g, cxL, cyc, a * 1.05, b * 1.05, 0.2, -2.6, C.violet, 3.5);
        arcArrow(g, cxR, cyc, a * 1.05, b * 1.05, Math.PI - 0.2, Math.PI + 2.6, C.violet, 3.5);
        D.tag(g, 'Convection Current', bx + bw / 2, by - 40, { bg: C.violet, size: 19, align: 'center' });
        if (forced) {
          // stirrer
          const sx = bx + 70, sy = by + bh - 70; const ang = t * 6;
          D.line(g, sx, by - 30, sx, sy, { color: C.ink, width: 4 });
          for (let k = 0; k < 2; k++) { const aa = ang + k * Math.PI; D.line(g, sx, sy, sx + 30 * Math.cos(aa), sy + 8 * Math.sin(aa), { color: C.ink, width: 7 }); }
          D.tag(g, water ? 'Stirrer (forced flow)' : 'Fan (forced flow)', sx + 10, by + 52, { bg: C.ink, size: 16 });
        }
        if (heating) { D.tag(g, 'Hot Fluid ↑', bx + bw / 2, by + 150, { bg: C.red, size: 18, align: 'center' }); D.text(g, 'less dense', bx + bw / 2, by + 180, { size: 16, weight: 800, color: C.red, align: 'center', halo: true }); }
        if (step === 3) D.focus(g, bx, by - 58, bw, bh + 50, t);
      }
      if (!heating) D.tag(g, 'T_s ≤ T∞: no upward convection current', bx + bw / 2, by + 120, { bg: C.muted, size: 17, align: 'center' });
      // Newton's law panel
      const s = c.state; const px0 = 700;
      panel(g, px0, 30, 280, "Newton's law of cooling", [
        { t: 'q = h·A·(T_s − T∞)', weight: 800, color: C.violet },
        { t: `h = ${p.h} W/m²·K` },
        { t: `A = ${p.A} m²,  ΔT = ${dT} K` },
        { t: `q = ${s.heatRate}`, weight: 800, color: C.red, size: 20 },
      ], { lh: 30 });
      if (step === 4) D.focus(g, px0, 30, 280, 170, t);
      // typical h ranges (log scale 1 … 20 000)
      const gx = px0 + 8, gw = 262, gy = 248; const lx = (v) => gx + (Math.log10(clamp(v, 1, 20000)) / Math.log10(20000)) * gw;
      D.text(g, 'Typical h (W/m²·K, log scale)', px0, gy - 20, { size: 17, weight: 800 });
      H_RANGES.forEach((r, i) => {
        const yy = gy + 18 + i * 56; const active = r.key === `${p.mode}-${p.fluid}`;
        D.text(g, `${r.label}: ${r.lo}–${r.hi}`, gx, yy, { size: 16, weight: active ? 800 : 600, color: active ? C.ink : C.muted, halo: true });
        D.rect(g, gx, yy + 14, gw, 14, { fill: '#f1f5f9', r: 7 });
        D.rect(g, lx(r.lo), yy + 14, lx(r.hi) - lx(r.lo), 14, { fill: r.color, r: 7, alpha: active ? 1 : 0.45 });
      });
      const ay = gy + 18 + 4 * 56;
      [1, 10, 100, 1000, 10000].forEach((v, i) => D.text(g, ['1', '10', '100', '1k', '10k'][i], lx(v), ay + 2, { size: 16, color: C.muted, align: 'center' }));
      H_RANGES.forEach((r, i) => { const yy = gy + 18 + i * 56; D.line(g, lx(p.h), yy + 8, lx(p.h), yy + 34, { color: C.ink, width: 4 }); });
      D.tag(g, `h = ${p.h}`, clamp(lx(p.h), gx + 40, gx + gw - 40), ay + 30, { bg: C.ink, size: 16, align: 'center' });
      if (step === 5) D.focus(g, px0, gy - 36, 280, 290, t);
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 3. Thermal Radiation Visualizer
  // ─────────────────────────────────────────────────────────────
  /** Relative Planck spectral radiance B_λ(T), λ in metres. */
  function planck(lam, T) { const x = (HPL * CL) / (lam * KB * T); if (x > 700) return 0; return (2 * HPL * CL * CL) / Math.pow(lam, 5) / (Math.expm1(x)); }
  /** Approximate apparent colour of a black body (Tanner Helland fit), with glow fading below ~1000 K. */
  function bodyColor(T) {
    const t = clamp(T, 1000, 40000) / 100; let r, gg, b;
    if (t <= 66) { r = 255; gg = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; } else { r = 329.7 * Math.pow(t - 60, -0.1332); gg = 288.12 * Math.pow(t - 60, -0.0755); b = 255; }
    const k = clamp((T - 750) / 700, 0, 1); // visible glow intensity
    const base = [51, 65, 85];
    const mix = (u, v) => Math.round(u + (clamp(v, 0, 255) - u) * k);
    return `rgb(${mix(base[0], r)},${mix(base[1], gg)},${mix(base[2], b)})`;
  }
  function band(lamUm) { return lamUm < 0.38 ? 'ultraviolet' : lamUm <= 0.75 ? 'visible' : 'infrared'; }

  S['ep-thermal-radiation'] = {
    approx: 'Grey-body model: ε is taken as the same at all wavelengths. The spectrum curve is the ideal black-body (Planck) shape, drawn relative to its own peak. Net exchange assumes the object is small compared with surroundings at T₀.',
    params: [
      { key: 'T', label: 'Object temperature T', type: 'range', min: 200, max: 6500, step: 10, default: 3000, unit: 'K' },
      { key: 'eps', label: 'Emissivity ε', type: 'range', min: 0.01, max: 1, step: 0.01, default: 0.9, help: '1 = perfect black body; polished metals are low (≈ 0.05), skin and soot are high (≈ 0.95+).' },
      { key: 'A', label: 'Surface area A', type: 'range', min: 0.1, max: 20000, step: 0.1, default: 100, unit: 'cm²' },
      { key: 'T0', label: 'Surroundings temperature T₀', type: 'range', min: 0, max: 1000, step: 1, default: 300, unit: 'K' },
      { key: 'cmp', label: 'Show curve for 0.8 T (comparison)', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Human body (skin 307 K, 1.8 m²)', values: { T: 310, eps: 0.98, A: 18000, T0: 293 } },
      { label: 'Tungsten lamp filament (≈ 60 W)', values: { T: 2800, eps: 0.35, A: 0.5, T0: 300 } },
      { label: 'Red-hot iron bar (1100 K)', values: { T: 1100, eps: 0.7, A: 200, T0: 300 } },
      { label: "Sun's surface, 1 cm² (5778 K)", values: { T: 5780, eps: 1, A: 1, T0: 3 } },
    ],
    validate(p) { const w = []; if (p.T < p.T0) w.push('The object is colder than its surroundings — it absorbs more radiation than it emits (net power is negative).'); return w; },
    compute(p) {
      const A = p.A * 1e-4; const P = p.eps * SIGMA * A * Math.pow(p.T, 4); const Pnet = p.eps * SIGMA * A * (Math.pow(p.T, 4) - Math.pow(p.T0, 4));
      const lam = WIEN / p.T; const lamUm = lam * 1e6; const E = p.eps * SIGMA * Math.pow(p.T, 4);
      const formulas = [
        { name: 'Stefan–Boltzmann law (emitted power)', formula: 'P = ε·σ·A·T⁴', given: `ε = ${p.eps}, σ = 5.670 × 10⁻⁸ W/m²K⁴, A = ${fmt(A, 3)} m², T = ${p.T} K`,
          calc: `P = ${p.eps} × 5.670 × 10⁻⁸ × ${fmt(A, 3)} × ${p.T}⁴ = ${p.eps} × 5.670 × 10⁻⁸ × ${fmt(A, 3)} × ${fmt(Math.pow(p.T, 4), 4)}`, result: fmt(P, 3), unit: 'watts (W)' },
        { name: 'Net power exchanged with surroundings', formula: 'P_net = ε·σ·A·(T⁴ − T₀⁴)', given: `T = ${p.T} K, T₀ = ${p.T0} K`,
          calc: `${p.eps} × 5.670 × 10⁻⁸ × ${fmt(A, 3)} × (${fmt(Math.pow(p.T, 4), 4)} − ${fmt(Math.pow(p.T0, 4), 4)})`, result: fmt(Pnet, 3), unit: 'watts (W)' },
        { name: "Wien's displacement law", formula: 'λ_max · T = b = 2.898 × 10⁻³ m·K', given: `T = ${p.T} K`, calc: `λ_max = 2.898 × 10⁻³ / ${p.T}`, result: `${fmt(lam, 4)} m = ${fmt(lamUm, 4)} µm (${band(lamUm)})`, unit: 'metres (m)' },
        { name: 'Emissive power per unit area', formula: 'E = ε·σ·T⁴', given: `ε = ${p.eps}, T = ${p.T} K`, calc: `${p.eps} × 5.670 × 10⁻⁸ × ${p.T}⁴`, result: fmt(E, 3), unit: 'W/m²' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Emitted P', value: `${fmt(P, 3)} W`, tone: 'info' },
          { label: 'Net P', value: `${fmt(Pnet, 3)} W`, tone: Pnet >= 0 ? 'warn' : 'info' },
          { label: 'λ_max', value: `${fmt(lamUm, 3)} µm`, tone: 'good' },
          { label: 'Peak in', value: band(lamUm) },
        ],
        state: { temperature: `${p.T} K`, emissivity: p.eps, area: `${p.A} cm²`, surroundings: `${p.T0} K`, emittedPower: `${fmt(P, 3)} W`, netPower: `${fmt(Pnet, 3)} W`, lambdaMax: `${fmt(lamUm, 4)} µm`, peakRegion: band(lamUm), emissivePower: `${fmt(E, 3)} W/m²` },
        explain: {
          what: `An object at ${p.T} K (area ${p.A} cm², ε = ${p.eps}) emits ${fmt(P, 3)} W of electromagnetic radiation. Its spectrum peaks at λ_max = ${fmt(lamUm, 3)} µm, in the ${band(lamUm)}. After absorbing radiation from surroundings at ${p.T0} K the net loss is ${fmt(Pnet, 3)} W.`,
          why: 'Charged particles in every body above 0 K vibrate thermally and emit electromagnetic waves. Radiation needs no medium, so it crosses vacuum (that is how sunlight reaches Earth). Hotter bodies emit far more (∝ T⁴) and at shorter wavelengths (λ_max ∝ 1/T).',
          param: 'Temperature T, emissivity ε, area A and surroundings temperature T₀.',
          effect: `Doubling T multiplies the power by 2⁴ = 16 and halves λ_max. At ${p.T} K the glow colour is ${p.T < 800 ? 'invisible (infrared only)' : p.T < 1300 ? 'dull red' : p.T < 3500 ? 'orange-yellow' : p.T < 6500 ? 'yellow-white' : 'bluish white'}. Lower ε reduces power in proportion.`,
        },
      };
    },
    steps(p, c) {
      const s = c.state;
      return [
        { title: 'Every warm body radiates', text: `The object at ${s.temperature} emits electromagnetic radiation because its charged particles vibrate thermally.` },
        { title: 'Radiation needs no medium', text: 'The energy travels as electromagnetic waves at the speed of light — even through vacuum.' },
        { title: 'Stefan–Boltzmann law', text: `P = εσAT⁴ = ${s.emittedPower}. The power grows as the fourth power of temperature.` },
        { title: 'The spectrum (Planck curve)', text: 'The energy is spread over many wavelengths; the curve shows how much is emitted at each wavelength. Only a small part may fall in the visible band.' },
        { title: "Wien's law: the peak shifts", text: `λ_max = b/T = ${s.lambdaMax} (${s.peakRegion}). Hotter → peak moves to shorter wavelength → colour changes red → yellow → white.` },
        { title: 'Net exchange with surroundings', text: `The object also absorbs radiation from surroundings at ${s.surroundings}: P_net = εσA(T⁴ − T₀⁴) = ${s.netPower}.` },
      ];
    },
    draw(g, S2) {
      const { p, c, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff');
      const ox = 200, oy = 210, R = 72; const col = bodyColor(p.T); const glowK = clamp((p.T - 750) / 1500, 0, 1);
      // surroundings box
      D.rect(g, 20, 30, 380, 350, { fill: '#f8fafc', stroke: C.line, width: 1.5, r: 12 });
      D.text(g, `Surroundings T₀ = ${p.T0} K`, 36, 52, { size: 17, weight: 800, color: C.muted });
      if (glowK > 0) {
        const gr = g.createRadialGradient(ox, oy, R * 0.8, ox, oy, R * 2.1); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.save(); g.globalAlpha = 0.55 * glowK; g.fillStyle = gr; g.beginPath(); g.arc(ox, oy, R * 2.1, 0, Math.PI * 2); g.fill(); g.restore();
      }
      D.atom(g, ox, oy, R, /^rgb/.test(col) ? rgbToHex(col) : col);
      D.text(g, `${p.T} K`, ox, oy, { size: 24, weight: 800, color: '#fff', align: 'center', halo: 'rgba(0,0,0,0.45)' });
      if (step === 0) D.focus(g, ox - R, oy - R, 2 * R, 2 * R, t);
      // radiation arrows
      if (step >= 1) {
        const lamUm = (WIEN / p.T) * 1e6; const wcol = D.wavelengthColor(lamUm * 1000); const f = step === 1 ? prog : 1;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + 0.2; const r0 = R + 12; const r1 = R + 12 + (70 + 30 * (k % 2)) * f;
          D.wave(g, ox + r0 * Math.cos(a), oy + r0 * Math.sin(a), ox + r1 * Math.cos(a), oy + r1 * Math.sin(a), { amp: 6, wavelength: clamp(6 + lamUm * 6, 8, 40), color: wcol, width: 3, arrow: true, phase: t * 8 });
        }
        D.text(g, 'EM waves — no medium needed (works in vacuum)', 210, 362, { size: 16, weight: 800, color: C.violet, align: 'center' });
        if (step === 1) D.focus(g, 30, 60, 360, 320, t);
      }
      // Stefan–Boltzmann box
      const s = c.state;
      if (step >= 2) {
        panel(g, 20, 396, 380, 'Stefan–Boltzmann:  P = εσAT⁴', [
          { t: `P = ${s.emittedPower}`, weight: 800, color: C.red, size: 19 },
          step >= 5 ? { t: `P_net = εσA(T⁴ − T₀⁴) = ${s.netPower}`, weight: 800, color: C.blue } : { t: `ε = ${p.eps}, A = ${p.A} cm²`, color: C.muted },
        ], { lh: 32 });
        if (step === 2) D.focus(g, 20, 396, 380, 112, t);
        if (step === 5) D.focus(g, 20, 460, 380, 50, t);
      }
      // Planck chart
      const lamMax = WIEN / p.T; const lmUm = lamMax * 1e6;
      const xmax = clamp(Math.ceil(lmUm * 5), 2, 60);
      const pts = []; const pts2 = []; const Bmax = planck(lamMax, p.T) || 1;
      for (let i = 1; i <= 240; i++) {
        const l = (xmax * i) / 240; pts.push([l, planck(l * 1e-6, p.T) / Bmax]);
        pts2.push([l, planck(l * 1e-6, 0.8 * p.T) / Bmax]);
      }
      const cx = 500, cy = 60, cw = 470, ch = 300;
      const f3 = step === 3 ? prog : step > 3 ? 1 : 0;
      plot(g, cx, cy, cw, ch, { xmin: 0, xmax, ymin: 0, ymax: 1.1, xticks: 5, yticks: 2, yfmt: (v) => fmt(v, 2), xlabel: 'Wavelength λ (µm)', ylabel: 'Relative B_λ(T)', ylo: 44, title: 'Black-body spectrum (Planck)',
        under: (X, Y) => {
          for (let nm = 380; nm < 750; nm += 5) D.rect(g, X(nm / 1000), cy, X((nm + 5) / 1000) - X(nm / 1000) + 0.5, ch, { fill: D.wavelengthColor(nm), alpha: 0.28 });
        },
        series: step >= 3 ? [
          ...(p.cmp ? [{ points: pts2.slice(0, Math.max(2, Math.round(240 * f3))), color: C.muted, width: 2.5, dash: [8, 6] }] : []),
          { points: pts.slice(0, Math.max(2, Math.round(240 * f3))), color: C.red, width: 4, fill: C.red, fillAlpha: 0.12 },
        ] : [] });
      const X = (v) => cx + (v / xmax) * cw;
      if (X(0.75) - X(0.38) > 6) D.text(g, 'visible', clamp(X(0.565), cx + 30, cx + cw - 30), cy + ch - 14, { size: 16, weight: 800, color: C.violet, align: 'center', halo: true });
      if (step < 3) D.text(g, 'spectrum appears in step 4', cx + cw / 2, cy + ch / 2, { size: 17, color: C.faint, align: 'center' });
      if (step >= 3 && p.cmp) D.text(g, `dashed: 0.8 T = ${Math.round(0.8 * p.T)} K`, cx + cw - 10, cy + 20, { size: 16, weight: 700, color: C.muted, align: 'right' });
      if (step === 3) D.focus(g, cx, cy, cw, ch, t);
      if (step >= 4) {
        const xm = X(lmUm); D.line(g, xm, cy, xm, cy + ch, { color: C.amber, width: 2.5, dash: [6, 5] });
        D.tag(g, `λ_max = ${fmt(lmUm, 3)} µm`, clamp(xm, cx + 90, cx + cw - 90), cy + 50, { bg: C.amber, size: 17, align: 'center' });
        panel(g, 470, 430, 510, "Wien's displacement law", [{ t: `λ_max = b/T = 2.898 × 10⁻³ / ${p.T} = ${fmt(lmUm, 4)} µm  (${s.peakRegion})`, weight: 800, color: C.amber, size: 17 }], { lh: 30 });
        if (step === 4) D.focus(g, 470, 430, 510, 80, t);
      }
    },
  };
  function rgbToHex(rgb) { const m = rgb.match(/\d+/g) || [0, 0, 0]; return '#' + m.slice(0, 3).map((v) => clamp(Number(v), 0, 255).toString(16).padStart(2, '0')).join(''); }

  // ─────────────────────────────────────────────────────────────
  // 4. Thermal Conductivity Comparison (Ingen-Hausz experiment)
  // ─────────────────────────────────────────────────────────────
  /** Rod with x = 0 held at Th, far end insulated, initially at T0. tau = αt/L². */
  function rodInsulated(x, tau, Th, T0) {
    if (tau <= 0) return x <= 0 ? Th : T0;
    let s = 0;
    for (let m = 0; m < 400; m++) {
      const n = 2 * m + 1; const e = Math.exp(-(n * n * Math.PI * Math.PI * tau) / 4); if (e < 1e-7) break;
      s += (4 / (n * Math.PI)) * Math.sin((n * Math.PI * x) / 2) * e;
    }
    return Th - (Th - T0) * s;
  }
  const T_ROOM = 25; const T_WAX = 55;
  const TIME_OPTS = [[10, '10 s'], [60, '1 min'], [300, '5 min'], [1800, '30 min'], [7200, '2 h'], [43200, '12 h'], [259200, '3 days']];

  S['ep-thermal-conductivity'] = {
    approx: 'Rods are treated as one-dimensional with no heat loss from their sides and the far end insulated (exact series solution). Real Ingen-Hausz rods lose heat to the air, so wax melts over a shorter length. t ≈ L²/α is an order-of-magnitude warm-up time.',
    modes: [{ key: 'wax', label: 'Wax beads (Ingen-Hausz)' }, { key: 'thermo', label: 'Thermometers at the far ends' }],
    params: [
      { key: 'L', label: 'Rod length L', type: 'range', min: 5, max: 50, step: 1, default: 20, unit: 'cm' },
      { key: 'A', label: 'Cross-sectional area A', type: 'range', min: 0.1, max: 5, step: 0.1, default: 1, unit: 'cm²' },
      { key: 'dT', label: 'Source temperature above room (ΔT)', type: 'range', min: 40, max: 400, step: 5, default: 75, unit: 'K', help: `Room = ${T_ROOM} °C, so ΔT = 75 K means a 100 °C source (boiling water).` },
      { key: 'time', label: 'Elapsed time t', type: 'select', options: TIME_OPTS.map(([v, l]) => ({ value: v, label: l })), default: 300 },
      { key: 'cu', label: 'Show copper', type: 'toggle', default: true },
      { key: 'al', label: 'Show aluminium', type: 'toggle', default: true },
      { key: 'brass', label: 'Show brass', type: 'toggle', default: true },
      { key: 'steel', label: 'Show steel', type: 'toggle', default: true },
      { key: 'glass', label: 'Show glass', type: 'toggle', default: true },
      { key: 'wood', label: 'Show wood', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Classic class demo: boiling-water tank, 20 cm rods, 5 min', values: { L: 20, A: 1, dT: 75, time: 300, cu: true, al: true, brass: true, steel: true, glass: true, wood: true } },
      { label: 'Metals only, 30 cm rods, 2 h (near steady state)', values: { L: 30, A: 1, dT: 75, time: 7200, cu: true, al: true, brass: true, steel: true, glass: false, wood: false } },
      { label: 'Insulators only: glass vs wood, 12 h', values: { L: 10, A: 1, dT: 75, time: 43200, cu: false, al: false, brass: false, steel: false, glass: true, wood: true } },
    ],
    validate(p) {
      const w = [];
      if (!MAT_KEYS.some((k) => p[k])) w.push('Select at least one material to compare.');
      if (T_ROOM + p.dT < T_WAX && p.mode === 'wax') w.push(`The source (${T_ROOM + p.dT} °C) is below the wax melting point (${T_WAX} °C) — no wax can melt.`);
      return w;
    },
    compute(p) {
      const L = p.L / 100; const A = p.A * 1e-4; const tSel = Number(p.time) || 300; const Th = T_ROOM + p.dT;
      const shown = MAT_KEYS.filter((k) => p[k]); const list = shown.length ? shown : ['cu'];
      const rows = list.map((k) => {
        const m = MAT[k]; const alpha = m.k / (m.rho * m.c); const Q = (m.k * A * p.dT) / L; const tD = (L * L) / alpha;
        const tau = (alpha * tSel) / (L * L); const Tend = rodInsulated(1, tau, Th, T_ROOM);
        let melt = 0; for (let i = 1; i <= 10; i++) if (rodInsulated(i / 10, tau, Th, T_ROOM) >= T_WAX) melt = i;
        return { k, name: m.name, kk: m.k, alpha, Q, tD, Tend, melt };
      });
      const fastest = rows.reduce((a, b) => (b.alpha > a.alpha ? b : a)); const slowest = rows.reduce((a, b) => (b.alpha < a.alpha ? b : a));
      const first = rows[0];
      const formulas = [
        { name: "Steady heat flow (Fourier's law) for each rod", formula: 'Q/t = k·A·ΔT / L', given: `A = ${fmt(A, 3)} m², ΔT = ${p.dT} K, L = ${fmt(L, 3)} m`,
          calc: rows.map((r) => `${r.name}: ${r.kk} × ${fmt(A, 3)} × ${p.dT} / ${fmt(L, 3)} = ${fmt(r.Q, 3)} W`).join(';  '), result: `${fastest.name}: ${fmt(fastest.Q, 3)} W … ${slowest.name}: ${fmt(slowest.Q, 3)} W`, unit: 'watts (W)' },
        { name: 'Thermal diffusivity', formula: 'α = k / (ρ·c)', given: rows.map((r) => `${r.name}: ρ = ${MAT[r.k].rho} kg/m³, c = ${MAT[r.k].c} J/kg·K`).join('; '),
          calc: rows.map((r) => `${r.name}: ${fmt(r.alpha, 3)}`).join(';  '), result: `largest: ${fastest.name} (${fmt(fastest.alpha, 3)} m²/s)`, unit: 'm²/s' },
        { name: 'Warm-up time scale (order of magnitude)', formula: 't ≈ L² / α', given: `L = ${fmt(L, 3)} m`,
          calc: rows.map((r) => `${r.name}: ${fmt(L * L, 3)} / ${fmt(r.alpha, 3)} ≈ ${fmtTime(r.tD)}`).join(';  '), result: `${fastest.name} warms first (${fmtTime(fastest.tD)}); ${slowest.name} last (${fmtTime(slowest.tD)})`, unit: 'seconds (s)' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Warms first', value: fastest.name, tone: 'good' },
          { label: 'Slowest', value: slowest.name, tone: 'bad' },
          { label: `Q/t (${first.name})`, value: `${fmt(first.Q, 3)} W`, tone: 'info' },
          { label: 'Elapsed time', value: fmtTime(tSel) },
        ],
        state: {
          source: `${Th} °C`, rodLength: `${p.L} cm`, area: `${p.A} cm²`, elapsed: fmtTime(tSel), fastest: fastest.name, slowest: slowest.name,
          rods: rows.map((r) => `${r.name}: k = ${r.kk} W/m·K, α = ${fmt(r.alpha, 3)} m²/s, Q/t = ${fmt(r.Q, 3)} W, t≈L²/α = ${fmtTime(r.tD)}, far end ${fmt(r.Tend, 3)} °C, wax melted ${r.melt * 10} %`).join(' | '),
          ratio: `${fmt(fastest.alpha / slowest.alpha, 3)}`,
        },
        explain: {
          what: `Identical ${p.L} cm rods touch the same ${Th} °C source. After ${fmtTime(tSel)} ${fastest.name.toLowerCase()} has warmed furthest along its length and ${slowest.name.toLowerCase()} the least.`,
          why: 'How fast a rod warms up depends on the thermal diffusivity α = k/(ρc): a high conductivity k lets heat in quickly, while a large heat capacity ρc soaks it up. Metals (free electrons) have α hundreds of times larger than glass or wood.',
          param: `Rod length L = ${p.L} cm, area A = ${p.A} cm², source ΔT = ${p.dT} K, elapsed time ${fmtTime(tSel)} and the chosen materials.`,
          effect: `Warm-up time grows as L² (double the length → 4× longer). The steady heat flow Q/t is ∝ k·A·ΔT/L, so ${fastest.name.toLowerCase()} carries about ${fmt(fastest.Q / Math.max(1e-12, slowest.Q), 3)}× more heat than ${slowest.name.toLowerCase()}.`,
        },
      };
    },
    steps(p, c) {
      const s = c.state;
      return [
        { title: 'Identical rods, same hot source', text: `Rods of the same length (${s.rodLength}) and area (${s.area}) are fixed to a source at ${s.source}. ${p.mode === 'wax' ? `Wax beads (melting point ${T_WAX} °C) are stuck along each rod.` : 'A thermometer touches the far end of each rod.'}` },
        { title: 'Heat flows into the rods', text: `The clock runs to ${s.elapsed}. Heat spreads along each rod at a different rate.` },
        { title: 'Which end warms first?', text: `${s.fastest} warms first; ${s.slowest} is slowest (α differs ${s.ratio}×).` },
        { title: 'Steady heat flow Q/t = kAΔT/L', text: 'The bars (log scale) compare the heat flow once the temperatures stop changing — proportional to k.' },
        { title: 'Time scale t ≈ L²/α', text: 'α = k/(ρc) is the thermal diffusivity. The column t ≈ L²/α shows the order-of-magnitude time for each rod to warm through.' },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff');
      const L = p.L / 100; const tSel = Number(p.time) || 300; const Th = T_ROOM + p.dT;
      const tNow = step === 0 ? 0 : step === 1 ? tSel * prog * prog : tSel;
      const shown = MAT_KEYS.filter((k) => p[k]);
      // source tank
      D.rect(g, 20, 60, 110, 420, { fill: D.heat(0.9), r: 12, stroke: C.ink, width: 2 });
      D.text(g, 'HOT', 75, 250, { size: 20, weight: 800, color: '#fff', align: 'center' });
      D.text(g, `${Th} °C`, 75, 280, { size: 20, weight: 800, color: '#fff', align: 'center' });
      D.text(g, 'Rod (colour = temperature)', 150, 30, { size: 17, weight: 800 });
      D.text(g, 't ≈ L²/α', 640, 30, { size: 17, weight: 800, align: 'center', color: step >= 4 ? C.amber : C.ink });
      D.text(g, 'Q/t (W, log scale)', 720, 30, { size: 17, weight: 800, color: step >= 3 ? C.red : C.ink });
      if (!shown.length) { D.text(g, 'Select at least one material', 500, 280, { size: 22, weight: 800, color: C.red, align: 'center' }); return; }
      const rows = shown.map((k) => { const m = MAT[k]; const alpha = m.k / (m.rho * m.c); return { k, m, alpha, Q: (m.k * p.A * 1e-4 * p.dT) / L, tD: (L * L) / alpha }; });
      const maxA = Math.max(...rows.map((r) => r.alpha)); const minA = Math.min(...rows.map((r) => r.alpha));
      const lQ = rows.map((r) => Math.log10(r.Q)); const qlo = Math.floor(Math.min(...lQ)) - 0.2; const qhi = Math.max(Math.ceil(Math.max(...lQ)), qlo + 1.2);
      const rowH = Math.min(70, 420 / rows.length); const y0 = 60 + rowH / 2 + 8;
      const x0 = 150, x1 = 560;
      rows.forEach((r, i) => {
        const y = y0 + i * rowH; const tau = (r.alpha * tNow) / (L * L);
        const best = r.alpha === maxA && step >= 2 && rows.length > 1; const worst = r.alpha === minA && step >= 2 && rows.length > 1;
        D.text(g, `${r.m.name}  (k = ${r.m.k})`, x0, y - 22, { size: 16, weight: 800, color: best ? C.green : worst ? C.red : C.ink });
        const N = 60;
        for (let j = 0; j < N; j++) { const T = rodInsulated((j + 0.5) / N, tau, Th, T_ROOM); D.rect(g, x0 + (j * (x1 - x0)) / N, y - 9, (x1 - x0) / N + 0.8, 18, { fill: D.heat((T - T_ROOM) / (Th - T_ROOM)) }); }
        D.rect(g, x0, y - 9, x1 - x0, 18, { stroke: r.m.color, width: 3 });
        if (p.mode === 'wax') {
          for (let b = 1; b <= 10; b++) {
            const xb = x0 + ((x1 - x0) * b) / 10 - 8; const T = rodInsulated(b / 10, tau, Th, T_ROOM);
            if (T >= T_WAX) D.circle(g, xb, y + 18, 6, { stroke: C.faint, width: 2, dash: [3, 3] });
            else D.circle(g, xb, y + 18, 6, { fill: '#fde68a', stroke: C.amber, width: 2 });
          }
        } else {
          const Te = rodInsulated(1, tau, Th, T_ROOM); const f = clamp((Te - T_ROOM) / (Th - T_ROOM), 0, 1);
          D.rect(g, x1 + 4, y - 14, 10, 28, { fill: '#fff', stroke: C.ink, width: 1.5, r: 5 });
          D.rect(g, x1 + 6, y + 12 - 24 * f, 6, 24 * f + 2, { fill: C.red, r: 3 });
          D.text(g, `${fmt(Te, 3)} °C`, x1 - 4, y - 22, { size: 16, weight: 800, color: C.red, align: 'right' });
        }
        if (best) D.tag(g, 'warms first', x1 - (p.mode === 'thermo' ? 90 : 4), y - 24, { bg: C.green, size: 16, align: 'right' });
        D.text(g, fmtTime(r.tD), 640, y, { size: 17, weight: 800, align: 'center', color: step >= 4 ? C.amber : C.muted });
        const bx = 720, bw = 170; const len = clamp((Math.log10(r.Q) - qlo) / (qhi - qlo), 0.02, 1) * bw;
        if (step >= 3) {
          const f = step === 3 ? prog : 1;
          D.rect(g, bx, y - 11, len * f, 22, { fill: r.m.color, r: 4 });
          D.text(g, `${fmt(r.Q, 2)} W`, bx + len * f + 6, y, { size: 16, weight: 800 });
        } else D.rect(g, bx, y - 11, bw, 22, { fill: '#f1f5f9', r: 4 });
        if (step === 2 && (best || worst)) D.focus(g, x0, y - 32, x1 - x0, 60, t);
      });
      if (step === 3) D.focus(g, 715, 44, 270, rows.length * rowH + 16, t);
      if (step === 4) D.focus(g, 590, 44, 100, rows.length * rowH + 16, t);
      D.tag(g, `Elapsed time t = ${fmtTime(tNow)}`, 150, 522, { bg: step === 1 ? C.amber : C.ink, size: 18 });
      if (p.mode === 'wax') {
        D.circle(g, 470, 522, 7, { fill: '#fde68a', stroke: C.amber, width: 2 }); D.text(g, 'wax bead', 484, 522, { size: 16, weight: 700 });
        D.circle(g, 600, 522, 7, { stroke: C.faint, width: 2, dash: [3, 3] }); D.text(g, `melted (T ≥ ${T_WAX} °C)`, 614, 522, { size: 16, weight: 700 });
      } else D.text(g, 'Thermometer reads the far-end temperature', 470, 522, { size: 16, weight: 700 });
      if (step === 1) D.focus(g, x0, 44, x1 - x0 + 20, rows.length * rowH + 16, t);
      if (step === 0) D.focus(g, 20, 60, 110, 420, t);
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Solar Thermal Power Simulator
  // ─────────────────────────────────────────────────────────────
  const T_COND = 313; // condenser ≈ 40 °C
  const SOLAR = {
    trough: { name: 'Parabolic trough', fluid: 'synthetic oil', Thot: 663, label: '≈ 390 °C' },
    tower: { name: 'Solar power tower', fluid: 'molten salt', Thot: 838, label: '≈ 565 °C' },
  };
  function fmtP(W) { const a = Math.abs(W); if (a >= 1e6) return `${fmt(W / 1e6, 3)} MW`; if (a >= 1e3) return `${fmt(W / 1e3, 3)} kW`; return `${fmt(W, 3)} W`; }

  S['ep-solar-thermal'] = {
    conceptual: true,
    approx: 'Plant drawing is schematic. The energy chain uses single average efficiencies: P_thermal = η_col·G·A and P_electric = η_turbine·P_thermal. The Carnot limit uses typical hot-fluid temperatures (oil ≈ 390 °C, molten salt ≈ 565 °C) and a 40 °C condenser. Daily energy assumes the stated number of full-sun hours.',
    modes: [{ key: 'trough', label: 'Parabolic trough' }, { key: 'tower', label: 'Solar power tower (heliostats)' }],
    params: [
      { key: 'G', label: 'Direct normal irradiance G', type: 'range', min: 100, max: 1100, step: 10, default: 850, unit: 'W/m²', help: 'Clear-sky direct sunlight is ≈ 800–1000 W/m²; cloud reduces it sharply.' },
      { key: 'A', label: 'Collector (mirror) area A', type: 'range', min: 1000, max: 600000, step: 1000, default: 200000, unit: 'm²' },
      { key: 'etaC', label: 'Collector efficiency η_col (optical × thermal)', type: 'range', min: 0.2, max: 0.8, step: 0.01, default: 0.55 },
      { key: 'etaT', label: 'Power-block (turbine) efficiency η_turbine', type: 'range', min: 0.15, max: 0.5, step: 0.01, default: 0.37 },
      { key: 'hours', label: 'Full-sun hours per day', type: 'range', min: 2, max: 12, step: 0.5, default: 8, unit: 'h' },
      { key: 'storage', label: 'Thermal storage tanks', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Large trough field, clear day', values: { mode: 'trough', G: 900, A: 500000, etaC: 0.55, etaT: 0.37 } },
      { label: 'Tower with heliostat field', values: { mode: 'tower', G: 950, A: 300000, etaC: 0.5, etaT: 0.42 } },
      { label: 'Small demo trough, hazy sky', values: { mode: 'trough', G: 450, A: 5000, etaC: 0.45, etaT: 0.25 } },
    ],
    validate(p) {
      const w = []; const s = SOLAR[p.mode] || SOLAR.trough; const carnot = 1 - T_COND / s.Thot;
      if (p.etaT > carnot) w.push(`η_turbine = ${p.etaT} is above the Carnot limit ${fmt(carnot, 3)} for ${s.fluid} at ${s.label} with a 40 °C condenser — impossible.`);
      if (p.G < 300) w.push('Below ≈ 300 W/m² of direct sunlight most concentrating plants cannot reach operating temperature (scattered light from clouds cannot be focused).');
      return w;
    },
    compute(p) {
      const s = SOLAR[p.mode] || SOLAR.trough; const Pin = p.G * p.A; const Pth = p.etaC * Pin; const Pel = p.etaT * Pth; const eta = p.etaC * p.etaT;
      const carnot = 1 - T_COND / s.Thot; const Eday = (Pel * p.hours) / 1e6; // MWh
      const formulas = [
        { name: 'Solar power reaching the mirrors', formula: 'P_sun = G·A', given: `G = ${p.G} W/m², A = ${p.A} m²`, calc: `${p.G} × ${p.A}`, result: fmt(Pin, 3), unit: `watts (W) = ${fmtP(Pin)}` },
        { name: 'Thermal power into the fluid', formula: 'P_thermal = η_col·G·A', given: `η_col = ${p.etaC}`, calc: `${p.etaC} × ${fmt(Pin, 3)}`, result: fmt(Pth, 3), unit: `watts (W) = ${fmtP(Pth)}` },
        { name: 'Electrical output', formula: 'P_electric = η_turbine·P_thermal', given: `η_turbine = ${p.etaT}`, calc: `${p.etaT} × ${fmt(Pth, 3)}`, result: fmt(Pel, 3), unit: `watts (W) = ${fmtP(Pel)}` },
        { name: 'Overall solar-to-electric efficiency', formula: 'η = η_col × η_turbine', given: `η_col = ${p.etaC}, η_turbine = ${p.etaT}`, calc: `${p.etaC} × ${p.etaT} = ${fmt(eta, 3)}`, result: `${fmt(eta * 100, 3)} %`, unit: '—' },
        { name: 'Carnot limit for the turbine', formula: 'η_Carnot = 1 − T_cold / T_hot', given: `T_hot ≈ ${s.Thot} K (${s.fluid}), T_cold ≈ ${T_COND} K`, calc: `1 − ${T_COND}/${s.Thot}`, result: `${fmt(carnot * 100, 3)} %`, unit: '—' },
        { name: 'Energy per day', formula: 'E = P_electric × t', given: `t = ${p.hours} h`, calc: `${fmtP(Pel)} × ${p.hours} h`, result: fmt(Eday, 3), unit: 'MWh' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Sunlight in', value: fmtP(Pin) },
          { label: 'Thermal', value: fmtP(Pth), tone: 'warn' },
          { label: 'Electric', value: fmtP(Pel), tone: 'good' },
          { label: 'Overall η', value: `${fmt(eta * 100, 3)} %`, tone: 'info' },
        ],
        state: { plant: s.name, fluid: s.fluid, DNI: `${p.G} W/m²`, collectorArea: `${p.A} m²`, sunPower: fmtP(Pin), thermalPower: fmtP(Pth), electricPower: fmtP(Pel), overallEfficiency: `${fmt(eta * 100, 3)} %`, carnotLimit: `${fmt(carnot * 100, 3)} %`, dailyEnergy: `${fmt(Eday, 3)} MWh`, storage: p.storage },
        explain: {
          what: `${fmtP(Pin)} of direct sunlight hits ${p.A} m² of mirrors. The ${s.name.toLowerCase()} concentrates it and heats ${s.fluid} (${fmtP(Pth)} thermal); steam drives a turbine to give ${fmtP(Pel)} of electricity (${fmt(eta * 100, 3)} % overall).`,
          why: 'Curved or tracking mirrors focus direct sunlight onto a small receiver, producing a high temperature. A heat engine (steam turbine) turns part of that heat into work — limited by the Carnot efficiency — and the generator turns the work into electricity.',
          param: `Irradiance G = ${p.G} W/m², collector area A = ${p.A} m², η_col = ${p.etaC}, η_turbine = ${p.etaT}.`,
          effect: `Power is proportional to G and A: a cloud halving G halves the output. Hotter fluid (tower/molten salt) allows a higher Carnot limit (${fmt((1 - T_COND / SOLAR.tower.Thot) * 100, 3)} % vs ${fmt((1 - T_COND / SOLAR.trough.Thot) * 100, 3)} % for trough oil). Storage lets the plant keep running after sunset.`,
        },
      };
    },
    steps(p, c) {
      const s = c.state;
      return [
        { title: 'Direct sunlight reaches the field', text: `G = ${s.DNI} on ${s.collectorArea} of mirrors → ${s.sunPower}.` },
        { title: p.mode === 'tower' ? 'Heliostats aim sunlight at the tower' : 'Parabolic mirrors focus sunlight on the tube', text: p.mode === 'tower' ? 'Hundreds of flat tracking mirrors (heliostats) reflect sunlight onto one receiver at the top of the tower.' : 'Each trough is a parabola; parallel sunlight is reflected to its focal line where the receiver tube runs.' },
        { title: 'The heat-transfer fluid is heated', text: `${s.fluid} flowing through the receiver collects P_thermal = η_col·G·A = ${s.thermalPower}.` },
        { title: 'Heat exchanger makes steam', text: 'The hot fluid boils water in the heat exchanger (steam generator) and returns, cooler, to the collectors.' },
        { title: 'Turbine and generator make electricity', text: `Steam spins the turbine; the generator gives P_electric = η_turbine·P_thermal = ${s.electricPower} (Carnot limit ${s.carnotLimit}).` },
        { title: p.storage ? 'Storage and daily energy' : 'Daily energy', text: `${p.storage ? 'Hot fluid stored in insulated tanks lets the plant run after sunset. ' : ''}Energy per day ≈ ${s.dailyEnergy}.` },
      ];
    },
    draw(g, S2) {
      const { p, c, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff'); const s = c.state; const tower = p.mode === 'tower'; const sol = SOLAR[p.mode] || SOLAR.trough;
      D.rect(g, 0, 0, 1000, 330, { fill: '#f0f9ff' }); D.rect(g, 0, 330, 1000, 100, { fill: '#f7fee7' });
      const sunX = 60, sunY = 60; D.circle(g, sunX, sunY, 32, { fill: '#fde047', stroke: C.amber, width: 3 });
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + t * 0.2; D.line(g, sunX + 40 * Math.cos(a), sunY + 40 * Math.sin(a), sunX + 52 * Math.cos(a), sunY + 52 * Math.sin(a), { color: C.amber, width: 3 }); }
      D.text(g, `G = ${p.G} W/m²`, 110, 40, { size: 18, weight: 800, color: C.amber });
      const f0 = step === 0 ? prog : 1;
      let recv;
      if (!tower) {
        const fl = 26; const vy = 310; const fy = vy - fl;
        [110, 230, 350].forEach((cx) => {
          const pts = []; for (let x = -45; x <= 45; x += 3) pts.push([cx + x, vy - (x * x) / (4 * fl)]);
          D.poly(g, pts, { stroke: '#64748b', width: 5 });
          D.line(g, cx, vy + 2, cx, vy + 20, { color: C.ink, width: 3 });
          [-35, -12, 12, 35].forEach((x) => {
            const my = vy - (x * x) / (4 * fl);
            D.line(g, cx + x, 110, cx + x, 110 + (my - 110) * f0, { color: C.amber, width: 2, alpha: 0.8 });
            if (step >= 1) { const f1 = step === 1 ? prog : 1; D.line(g, cx + x, my, cx + x - x * f1, my + (fy - my) * f1, { color: C.orange, width: 2, alpha: 0.9 }); }
          });
        });
        D.line(g, 110, fy, 350, fy, { color: step >= 2 ? C.red : '#475569', width: 5 });
        [110, 230, 350].forEach((cx) => D.circle(g, cx, fy, 6, { fill: step >= 2 ? C.red : '#475569', stroke: C.ink, width: 1.5 }));
        D.text(g, 'Parabolic troughs (receiver tube at focus)', 230, 352, { size: 16, weight: 800, align: 'center' });
        recv = [350, fy];
      } else {
        const tx = 250, top = 120; D.rect(g, tx - 10, top, 20, 210, { fill: '#94a3b8', stroke: C.ink, width: 1.5 });
        D.rect(g, tx - 20, top - 30, 40, 34, { fill: step >= 2 ? C.red : '#475569', r: 6, stroke: C.ink, width: 2 });
        D.text(g, 'Receiver', tx + 26, top - 14, { size: 16, weight: 800 });
        [80, 130, 180, 320, 370, 420].forEach((hx) => {
          const hy = 305; const aim = Math.atan2(top - 13 - hy, tx - hx); const nrm = (aim - Math.PI / 2) / 2; // mirror normal bisects sun (up) and target directions
          const ta = nrm + Math.PI / 2;
          D.line(g, hx - 18 * Math.cos(ta), hy - 18 * Math.sin(ta), hx + 18 * Math.cos(ta), hy + 18 * Math.sin(ta), { color: '#475569', width: 5 });
          D.line(g, hx, hy, hx, hy + 22, { color: C.ink, width: 2 });
          D.line(g, hx, 110, hx, 110 + (hy - 110) * f0, { color: C.amber, width: 2, alpha: 0.8 });
          if (step >= 1) { const f1 = step === 1 ? prog : 1; D.line(g, hx, hy, hx + (tx - hx) * f1, hy + (top - 13 - hy) * f1, { color: C.orange, width: 2 }); }
        });
        D.text(g, 'Heliostats (tracking mirrors) → tower', 250, 352, { size: 16, weight: 800, align: 'center' });
        recv = [tx + 20, top - 13];
      }
      if (step === 0) D.focus(g, 30, 20, 330, 60, t);
      if (step === 1) D.focus(g, 50, 100, 400, 250, t);
      // HTF loop
      const hx0 = 500, hy0 = 130, hxW = 90, hxH = 130;
      const hot = [[recv[0], recv[1]], [460, recv[1]], [460, hy0 + 30], [hx0, hy0 + 30]];
      const cold = [[hx0, hy0 + hxH - 25], [440, hy0 + hxH - 25], [440, 385], [60, 385], [60, tower ? 305 : recv[1]], [tower ? 60 : 110, tower ? 305 : recv[1]]];
      D.poly(g, hot, { stroke: step >= 2 ? C.red : C.faint, width: 7 });
      D.poly(g, cold, { stroke: step >= 2 ? C.blue : C.faint, width: 7 });
      D.rect(g, hx0, hy0, hxW, hxH, { fill: '#e2e8f0', stroke: C.ink, width: 2, r: 8 });
      for (let k = 0; k < 4; k++) D.poly(g, [[hx0 + 15, hy0 + 30 + k * 24], [hx0 + 75, hy0 + 42 + k * 24]], { stroke: C.muted, width: 2 });
      D.text(g, 'Heat', hx0 + hxW / 2, hy0 - 32, { size: 16, weight: 800, align: 'center' });
      D.text(g, 'exchanger', hx0 + hxW / 2, hy0 - 12, { size: 16, weight: 800, align: 'center' });
      if (step >= 2) {
        const loop = [...hot, ...cold];
        const segs = []; let tot = 0; for (let i = 1; i < loop.length; i++) { const l = Math.hypot(loop[i][0] - loop[i - 1][0], loop[i][1] - loop[i - 1][1]); segs.push(l); tot += l; }
        for (let k = 0; k < 16; k++) {
          let d = ((t * 60 + (k * tot) / 16) % tot); let q = loop[0];
          for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const f = d / (segs[i] || 1); q = [loop[i][0] + (loop[i + 1][0] - loop[i][0]) * f, loop[i][1] + (loop[i + 1][1] - loop[i][1]) * f]; break; } d -= segs[i]; }
          D.circle(g, q[0], q[1], 4.5, { fill: '#fff', stroke: C.ink, width: 1.5 });
        }
        D.tag(g, `Hot ${sol.fluid} ${sol.label}`, tower ? 330 : 300, tower ? 72 : 200, { bg: C.red, size: 16, align: 'center' });
        D.tag(g, `P_thermal = ${s.thermalPower}`, 250, 412, { bg: C.orange, size: 17, align: 'center' });
        if (step === 2) D.focus(g, 40, 180, 480, 250, t);
      }
      // steam loop
      const tbx = 650, tby = 150; const steamOn = step >= 3;
      D.poly(g, [[hx0 + hxW, hy0 + 30], [tbx, hy0 + 30], [tbx, tby + 10]], { stroke: steamOn ? '#94a3b8' : C.faint, width: 7 });
      D.poly(g, [[tbx + 90, tby + 80], [tbx + 90, 300], [tbx + 30, 300]], { stroke: steamOn ? C.cyan : C.faint, width: 6 });
      D.poly(g, [[tbx - 30, 300], [hx0 + hxW + 20, 300], [hx0 + hxW + 20, hy0 + hxH - 20], [hx0 + hxW, hy0 + hxH - 20]], { stroke: steamOn ? C.blue : C.faint, width: 6 });
      D.rect(g, tbx - 30, 285, 60, 30, { fill: '#e0f2fe', stroke: C.ink, width: 2, r: 6 });
      D.text(g, 'Condenser', tbx, 336, { size: 16, weight: 800, align: 'center' });
      if (steamOn) {
        for (let k = 0; k < 5; k++) { const ph = (t * 0.8 + k / 5) % 1; D.circle(g, hx0 + hxW + ph * (tbx - hx0 - hxW), hy0 + 20 - 6 * Math.sin(ph * 12 + k), 5, { fill: '#e2e8f0', stroke: C.muted, width: 1 }); }
        D.tag(g, 'Steam', 615, 112, { bg: C.muted, size: 16, align: 'center' });
        if (step === 3) D.focus(g, hx0 - 10, hy0 - 50, 170, 190, t);
      }
      D.poly(g, [[tbx, tby + 10], [tbx + 110, tby - 15], [tbx + 110, tby + 95], [tbx, tby + 70]], { fill: step >= 4 ? '#cbd5e1' : '#e2e8f0', close: true, stroke: C.ink, width: 2 });
      if (step >= 4) for (let k = 0; k < 4; k++) { const a = t * 6 + (k * Math.PI) / 2; D.line(g, tbx + 55, tby + 40, tbx + 55 + 22 * Math.cos(a), tby + 40 + 22 * Math.sin(a), { color: C.ink, width: 3 }); }
      D.text(g, 'Turbine', tbx + 55, tby - 34, { size: 16, weight: 800, align: 'center' });
      D.line(g, tbx + 110, tby + 40, tbx + 140, tby + 40, { color: C.ink, width: 5 });
      D.circle(g, tbx + 175, tby + 40, 34, { fill: step >= 4 ? '#bbf7d0' : '#f1f5f9', stroke: C.ink, width: 2 });
      D.text(g, 'G', tbx + 175, tby + 40, { size: 22, weight: 800, align: 'center' });
      D.text(g, 'Generator', tbx + 175, tby - 12, { size: 16, weight: 800, align: 'center' });
      const gx = 920; D.poly(g, [[gx - 25, 290], [gx, 170], [gx + 25, 290]], { stroke: C.ink, width: 3 }); D.line(g, gx - 30, 195, gx + 30, 195, { color: C.ink, width: 3 });
      D.line(g, tbx + 209, tby + 40, gx - 25, 195, { color: step >= 4 ? C.amber : C.faint, width: 3 });
      D.text(g, 'Grid', gx, 312, { size: 16, weight: 800, align: 'center' });
      if (step >= 4) {
        D.tag(g, `P_electric = ${s.electricPower}`, 830, 100, { bg: C.green, size: 18, align: 'center' });
        if (step === 4) D.focus(g, tbx - 10, tby - 50, 300, 170, t);
      }
      if (p.storage) {
        const on = step >= 5;
        [[470, 'Hot', C.red, '#fecaca'], [560, 'Cold', C.blue, '#bfdbfe']].forEach(([x, lab, col, fill]) => {
          D.rect(g, x, 345, 70, 56, { fill: on ? fill : '#f1f5f9', stroke: col, width: 2.5, r: 10 });
          D.text(g, lab, x + 35, 363, { size: 16, weight: 800, align: 'center', color: col });
          D.text(g, 'tank', x + 35, 385, { size: 16, weight: 800, align: 'center', color: col });
        });
        D.text(g, 'Thermal storage', 550, 418, { size: 16, weight: 800, align: 'center', color: C.muted });
        if (step === 5) D.focus(g, 465, 340, 170, 90, t);
      }
      // energy chain
      const yb = 452; const Pin = p.G * p.A; const Pth = p.etaC * Pin; const Pel = p.etaT * Pth;
      [['Sunlight G·A', Pin, C.amber, 0], ['Thermal η_col·G·A', Pth, C.orange, 2], ['Electric η_t·P_th', Pel, C.green, 4]].forEach(([lab, P, col, needStep], i) => {
        const x = 20 + i * 330; const w = 300 * (P / Pin);
        D.rect(g, x, yb + 30, 300, 26, { fill: '#f1f5f9', r: 6 });
        D.rect(g, x, yb + 30, Math.max(4, w), 26, { fill: col, r: 6, alpha: step >= needStep ? 1 : 0.25 });
        D.text(g, `${lab} = ${fmtP(P)}`, x, yb + 10, { size: 16, weight: 800, color: step >= needStep ? C.ink : C.faint });
        if (i < 2) D.arrow(g, x + 304, yb + 43, x + 326, yb + 43, { color: C.muted, width: 3, head: 10 });
      });
      if (step >= 5) D.tag(g, `≈ ${s.dailyEnergy} per day`, 980, 30, { bg: C.violet, size: 17, align: 'right' });
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 6. Microwave Heating Simulator
  // ─────────────────────────────────────────────────────────────
  const F_MW = 2.45e9;
  const FOODS = { water: { name: 'Water', c: 4186 }, milk: { name: 'Milk', c: 3930 } };
  S['ep-microwave'] = {
    approx: 'Energy balance only: t = mcΔT/(ηP). The absorption efficiency η lumps together reflection, uneven heating and losses to the air and container; evaporation and boiling are ignored (target ≤ 100 °C). The rotating-molecule picture is conceptual and slowed down about a billion times.',
    params: [
      { key: 'P', label: 'Microwave output power P', type: 'range', min: 300, max: 1500, step: 10, default: 800, unit: 'W' },
      { key: 'eta', label: 'Absorption efficiency η', type: 'range', min: 0.3, max: 1, step: 0.01, default: 0.7, help: 'Fraction of the microwave power absorbed by the food.' },
      { key: 'food', label: 'Food', type: 'select', options: [{ value: 'water', label: 'Water (c = 4186 J/kg·K)' }, { value: 'milk', label: 'Milk (c ≈ 3930 J/kg·K)' }], default: 'water' },
      { key: 'm', label: 'Mass m', type: 'range', min: 50, max: 2000, step: 10, default: 250, unit: 'g' },
      { key: 'Ti', label: 'Initial temperature', type: 'range', min: 0, max: 60, step: 1, default: 20, unit: '°C' },
      { key: 'Tf', label: 'Target temperature', type: 'range', min: 25, max: 100, step: 1, default: 70, unit: '°C' },
      { key: 'spots', label: 'Show standing-wave hot spots', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Cup of tea water (250 g, 20 → 90 °C, 800 W)', values: { food: 'water', m: 250, Ti: 20, Tf: 90, P: 800, eta: 0.7 } },
      { label: 'Glass of cold milk (200 g, 5 → 60 °C)', values: { food: 'milk', m: 200, Ti: 5, Tf: 60, P: 900, eta: 0.65 } },
      { label: 'Big bowl of water (1 kg, 1200 W)', values: { food: 'water', m: 1000, Ti: 20, Tf: 80, P: 1200, eta: 0.75 } },
    ],
    validate(p) { const w = []; if (p.Tf <= p.Ti) w.push('The target temperature must be higher than the initial temperature (no heating needed).'); return w; },
    compute(p) {
      const fd = FOODS[p.food] || FOODS.water; const m = p.m / 1000; const dT = Math.max(0, p.Tf - p.Ti); const Q = m * fd.c * dT; const Pabs = p.eta * p.P; const tt = Q / Pabs; const rate = Pabs / (m * fd.c);
      const lam = CL / F_MW;
      const formulas = [
        { name: 'Microwave wavelength', formula: 'λ = c / f', given: 'c = 2.998 × 10⁸ m/s, f = 2.45 GHz', calc: '2.998 × 10⁸ / 2.45 × 10⁹', result: `${fmt(lam, 3)} m = ${fmt(lam * 100, 3)} cm`, unit: 'metres (m)' },
        { name: 'Heat needed', formula: 'Q = m·c·ΔT', given: `m = ${fmt(m, 3)} kg, c = ${fd.c} J/kg·K, ΔT = ${dT} K`, calc: `${fmt(m, 3)} × ${fd.c} × ${dT}`, result: fmt(Q, 4), unit: 'joules (J)' },
        { name: 'Power absorbed by the food', formula: 'P_abs = η·P', given: `η = ${p.eta}, P = ${p.P} W`, calc: `${p.eta} × ${p.P}`, result: fmt(Pabs, 3), unit: 'watts (W)' },
        { name: 'Heating time', formula: 't = m·c·ΔT / (η·P)', given: `Q = ${fmt(Q, 4)} J, P_abs = ${fmt(Pabs, 3)} W`, calc: `${fmt(Q, 4)} / ${fmt(Pabs, 3)}`, result: fmt(tt, 3), unit: `seconds (s) ≈ ${fmtTime(tt)}` },
        { name: 'Heating rate', formula: 'dT/dt = η·P / (m·c)', given: `η·P = ${fmt(Pabs, 3)} W, m·c = ${fmt(m * fd.c, 4)} J/K`, calc: `${fmt(Pabs, 3)} / ${fmt(m * fd.c, 4)}`, result: fmt(rate, 3), unit: 'K/s (°C per second)' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Heating time', value: fmtTime(tt), tone: 'info' },
          { label: 'Heat needed Q', value: `${fmt(Q / 1000, 3)} kJ` },
          { label: 'Absorbed power', value: `${fmt(Pabs, 3)} W` },
          { label: 'λ at 2.45 GHz', value: `${fmt(lam * 100, 3)} cm`, tone: 'good' },
        ],
        state: { food: fd.name, specificHeat: `${fd.c} J/kg·K`, mass: `${p.m} g`, initialTemp: `${p.Ti} °C`, targetTemp: `${p.Tf} °C`, power: `${p.P} W`, efficiency: p.eta, absorbedPower: `${fmt(Pabs, 3)} W`, heatNeeded: `${fmt(Q, 4)} J`, time: `${fmt(tt, 3)} s (${fmtTime(tt)})`, heatingRate: `${fmt(rate, 3)} K/s`, frequency: '2.45 GHz', wavelength: `${fmt(lam * 100, 3)} cm`, hotSpotSpacing: `${fmt(lam * 50, 3)} cm` },
        explain: {
          what: `The ${p.P} W magnetron sends 2.45 GHz microwaves (λ ≈ ${fmt(lam * 100, 3)} cm) into the cavity. The ${p.m} g of ${fd.name.toLowerCase()} absorbs ${fmt(Pabs, 3)} W and warms from ${p.Ti} °C to ${p.Tf} °C in about ${fmtTime(tt)}.`,
          why: 'Water molecules are electric dipoles. The oscillating electric field keeps twisting them back and forth 2.45 billion times a second; they bump into neighbours, and this molecular friction turns the field energy into heat (dielectric heating).',
          param: `Power P = ${p.P} W, absorption efficiency η = ${p.eta}, mass m = ${p.m} g, temperatures ${p.Ti} → ${p.Tf} °C.`,
          effect: 'Heating time is proportional to mass and to the temperature rise, and inversely proportional to the absorbed power: double the mass → twice the time; double the power → half the time.',
        },
      };
    },
    steps(p, c) {
      const s = c.state;
      return [
        { title: 'The magnetron makes microwaves', text: `The magnetron generates ${s.power} of microwaves at f = 2.45 GHz.` },
        { title: 'Waveguide and cavity', text: `The waveguide carries the waves into the metal cavity. They reflect from the walls and form standing waves with λ = c/f ≈ ${s.wavelength}; hot spots are about λ/2 ≈ ${s.hotSpotSpacing} apart (the turntable evens this out).` },
        { title: 'Water dipoles follow the field', text: 'Each water molecule (O slightly negative, H side slightly positive) tries to line up with the electric field, which reverses 2.45 × 10⁹ times per second.' },
        { title: 'Molecular friction → heat', text: `The rotating molecules collide with neighbours; the field energy becomes random thermal motion. Absorbed power η·P = ${s.absorbedPower}.` },
        { title: 'Temperature rises steadily', text: `Q = mcΔT = ${s.heatNeeded}; t = mcΔT/(ηP) = ${s.time}. Heating rate ${s.heatingRate}.` },
      ];
    },
    draw(g, S2) {
      const { p, c, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1); const s = c.state;
      D.clear(g, '#ffffff');
      const fd = FOODS[p.food] || FOODS.water; const m = p.m / 1000; const Pabs = p.eta * p.P; const tt = (m * fd.c * Math.max(0, p.Tf - p.Ti)) / Pabs;
      const tNow = step < 4 ? 0 : step === 4 ? tt * prog : tt; const Tnow = p.Ti + (Pabs * tNow) / (m * fd.c);
      // oven
      D.rect(g, 20, 40, 460, 290, { fill: '#e2e8f0', stroke: C.ink, width: 3, r: 14 });
      const cx0 = 40, cy0 = 100, cw = 320, chh = 210;
      D.rect(g, cx0, cy0, cw, chh, { fill: '#f8fafc', stroke: '#64748b', width: 3 });
      D.text(g, 'Metal cavity', cx0 + 10, cy0 + 20, { size: 16, weight: 800, color: C.muted });
      if (step >= 1 && p.spots) {
        const kx = (2 * Math.PI) / 122.4; // 10 px per cm, λ = 12.24 cm
        for (let x = 0; x < cw; x += 4) { const I = Math.pow(Math.sin(kx * x), 2); D.rect(g, cx0 + x, cy0 + 30, 4, chh - 34, { fill: C.red, alpha: 0.18 * I }); }
        D.text(g, `hot spots ≈ λ/2 = ${s.hotSpotSpacing} apart`, cx0 + cw / 2, cy0 + chh - 14, { size: 16, weight: 800, color: C.red, align: 'center', halo: true });
      }
      D.rect(g, 375, 55, 95, 70, { fill: step === 0 ? '#fde68a' : '#cbd5e1', stroke: C.ink, width: 2, r: 8 });
      D.text(g, 'Magnetron', 422, 140, { size: 16, weight: 800, align: 'center' });
      D.rect(g, 200, 58, 175, 30, { fill: '#cbd5e1', stroke: C.ink, width: 2 });
      D.text(g, 'Waveguide', 287, 46, { size: 16, weight: 800, align: 'center' });
      D.rect(g, 200, 88, 30, 12, { fill: '#cbd5e1', stroke: C.ink, width: 1.5 });
      D.wave(g, 372, 73, 206, 73, { amp: 8, wavelength: 26, color: C.violet, width: 3, arrow: true, phase: t * 10 });
      if (step >= 1) D.wave(g, 215, 100, 215, 180, { amp: 8, wavelength: 26, color: C.violet, width: 3, arrow: true, phase: t * 10 });
      if (step === 0) D.focus(g, 200, 50, 275, 80, t);
      if (step === 1) D.focus(g, cx0, cy0, cw, chh, t);
      const fT = clamp(Tnow / 100, 0, 1);
      D.poly(g, [[150, 248], [250, 248], [236, 285], [164, 285]], { fill: D.heat(0.15 + 0.85 * fT), close: true, stroke: C.ink, width: 2 });
      D.rect(g, 110, 288, 180, 8, { fill: '#94a3b8', r: 4 });
      D.text(g, `${p.m} g ${fd.name.toLowerCase()}`, 200, 232, { size: 16, weight: 800, align: 'center', halo: true });
      D.text(g, `f = 2.45 GHz · λ = c/f = ${s.wavelength}`, 250, 356, { size: 18, weight: 800, color: C.violet, align: 'center' });
      panel(g, 20, 380, 460, 'Energy balance', [
        { t: `P_abs = η·P = ${p.eta} × ${p.P} W = ${s.absorbedPower}` },
        { t: `Q = m·c·ΔT = ${fmt(m, 3)} × ${fd.c} × ${Math.max(0, p.Tf - p.Ti)} = ${fmt((m * fd.c * Math.max(0, p.Tf - p.Ti)) / 1000, 3)} kJ` },
        { t: `t = Q / P_abs = ${fmt(tt, 3)} s  (${fmtTime(tt)})`, weight: 800, color: step >= 4 ? C.red : C.ink },
      ], { lh: 30 });
      // zoom: dipoles
      const zx = 510, zy = 30, zw = 470, zh = 280;
      D.rect(g, zx, zy, zw, zh, { fill: '#f8fafc', stroke: C.line, width: 1.5, r: 12 });
      D.text(g, 'Zoom: water molecules (slowed ≈ 10⁹×)', zx + 14, zy + 22, { size: 17, weight: 800 });
      const w = 2.2; const E = Math.sin(w * t); const on = step >= 2;
      D.line(g, zx + 45, zy + 70, zx + 45, zy + 250, { color: C.line, width: 2 });
      if (on) D.arrow(g, zx + 45, zy + 160, zx + 45, zy + 160 - 85 * E, { color: C.blue, width: 6, head: 18 });
      D.text(g, 'E', zx + 70, zy + 60, { size: 20, weight: 800, color: C.blue });
      D.text(g, on ? (E > 0 ? 'field ↑' : 'field ↓') : 'no field', zx + 30, zy + 262, { size: 16, weight: 800, color: C.blue });
      const heatF = clamp(Tnow / 100, 0, 1);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) {
        const mx = zx + 150 + j * 70; const my = zy + 80 + i * 72; const k = i * 5 + j;
        const jitter = (step >= 3 ? 0.35 : 0.15) * Math.sin(3.7 * k + t * (step >= 3 ? 9 : 2));
        // δ+ (H side) points along E: up when E > 0 (angle −π/2), down when E < 0 (+π/2); random start with no field
        const ang = on ? -(Math.PI / 2) * clamp(1.4 * Math.sin(w * t - 0.25 - 0.08 * k), -1, 1) + jitter : k * 1.3 + 0.3 * Math.sin(t + k);
        const dx = Math.cos(ang), dy = Math.sin(ang);
        const h1 = ang + rad(52), h2 = ang - rad(52);
        D.circle(g, mx + 20 * Math.cos(h1), my + 20 * Math.sin(h1), 8, { fill: '#f1f5f9', stroke: C.ink, width: 1.5 });
        D.circle(g, mx + 20 * Math.cos(h2), my + 20 * Math.sin(h2), 8, { fill: '#f1f5f9', stroke: C.ink, width: 1.5 });
        D.circle(g, mx, my, 13, { fill: step >= 3 ? D.heat(0.3 + 0.7 * heatF) : C.red, stroke: C.ink, width: 1.5 });
        if (on && k === 7) D.arrow(g, mx - dx * 10, my - dy * 10, mx + dx * 34, my + dy * 34, { color: C.violet, width: 3, head: 10 });
      }
      if (on) D.text(g, 'H side (δ+) turns to follow E', zx + zw - 14, zy + 262, { size: 16, weight: 800, color: C.violet, align: 'right' });
      if (step >= 3) {
        for (let k = 0; k < 6; k++) { const sx = zx + 185 + (k % 3) * 140 + 10 * Math.sin(t * 5 + k); const sy = zy + 115 + Math.floor(k / 3) * 72; D.text(g, '✶', sx, sy, { size: 18, color: C.orange, align: 'center' }); }
        D.tag(g, 'friction → heat', zx + zw - 14, zy + 22, { bg: C.orange, size: 16, align: 'right' });
      }
      if (step === 2 || step === 3) D.focus(g, zx, zy, zw, zh, t);
      // thermometer + chart
      const thx = 535, thTop = 350, thBot = 505;
      D.rect(g, thx - 8, thTop, 16, thBot - thTop, { fill: '#fff', stroke: C.ink, width: 2, r: 8 }); D.circle(g, thx, thBot + 10, 14, { fill: C.red, stroke: C.ink, width: 2 });
      const fl = clamp(Tnow / 100, 0, 1); D.rect(g, thx - 4, thBot - (thBot - thTop - 6) * fl, 8, (thBot - thTop - 6) * fl + 6, { fill: C.red });
      D.tag(g, `${fmt(Tnow, 3)} °C`, thx - 20, thTop - 18, { bg: C.red, size: 16 });
      const cX = 650, cY = 350, cW = 320, cH = 130; const tmax = Math.max(1, tt * 1.15);
      const ser = [{ points: [[0, p.Ti], [tt, p.Tf]], color: C.faint, width: 2, dash: [6, 5] }];
      if (step >= 4) ser.push({ points: [[0, p.Ti], [Math.max(tNow, 1e-9), Tnow]], color: C.red, width: 4 });
      const { X, Y } = plot(g, cX, cY, cW, cH, { xmin: 0, xmax: tmax, ymin: 0, ymax: 100, xticks: 3, yticks: 2, xlabel: 'time t (s)', ylabel: 'T (°C)', ylo: 44, series: ser, xfmt: (v) => fmt(v, 2) });
      if (step >= 4) { D.circle(g, X(tNow), Y(Tnow), 6, { fill: C.red, stroke: '#fff', width: 2 }); if (prog >= 1 || step > 4) D.tag(g, `t = ${fmtTime(tt)}`, clamp(X(tt), cX + 70, cX + cW - 70), clamp(Y(p.Tf) + 26, cY + 20, cY + cH - 14), { bg: C.ink, size: 16, align: 'center' }); }
      if (step === 4) D.focus(g, 510, 330, 470, 210, t);
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 7. Surface Tension Simulator
  // ─────────────────────────────────────────────────────────────
  const LIQ_ST = {
    water: { name: 'Water', T: 0.0728, theta: 0, rho: 998, color: '#93c5fd' },
    ethanol: { name: 'Ethanol', T: 0.0223, theta: 0, rho: 789, color: '#c7d2fe' },
    soap: { name: 'Soap solution', T: 0.025, theta: 0, rho: 1000, color: '#a5f3fc' },
    mercury: { name: 'Mercury', T: 0.485, theta: 140, rho: 13534, color: '#94a3b8' },
  };
  const waterST = (Tc) => 0.0756 - 1.67e-4 * Tc; // ≈ 75.6 mN/m at 0 °C, 72.2 at 20 °C, 58.9 at 100 °C
  function stProps(p) {
    const L = LIQ_ST[p.liq] || LIQ_ST.water; const T = p.liq === 'water' ? waterST(p.temp ?? 20) : L.T;
    return { ...L, T };
  }
  const capH = (T, theta, rho, r) => (2 * T * Math.cos(rad(theta))) / (rho * GRAV * r);

  S['ep-surface-tension'] = {
    approx: 'Capillary rise formula (Jurin\'s law) for a narrow, clean, circular glass tube; the meniscus is treated as a spherical cap and the small liquid volume in the meniscus is ignored. Water\'s surface tension vs temperature uses a linear fit (75.6 mN/m at 0 °C → 58.9 mN/m at 100 °C). Tube width in the drawing is enlarged; heights are to scale.',
    params: [
      { key: 'liq', label: 'Liquid', type: 'select', options: [
        { value: 'water', label: 'Water (T ≈ 0.072 N/m, θ ≈ 0°)' }, { value: 'ethanol', label: 'Ethanol (T ≈ 0.022 N/m, θ ≈ 0°)' },
        { value: 'soap', label: 'Soap solution (T ≈ 0.025 N/m, typical)' }, { value: 'mercury', label: 'Mercury (T ≈ 0.485 N/m, θ ≈ 140°)' }], default: 'water' },
      { key: 'r', label: 'Tube radius r', type: 'range', min: 0.1, max: 2, step: 0.05, default: 0.5, unit: 'mm' },
      { key: 'temp', label: 'Water temperature', type: 'range', min: 0, max: 100, step: 1, default: 20, unit: '°C', showIf: (p) => p.liq === 'water', help: 'Surface tension decreases as temperature rises.' },
      { key: 'forces', label: 'Show molecular force arrows', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Water in a 0.5 mm radius glass tube (≈ 29 mm)', values: { liq: 'water', r: 0.5, temp: 20 } },
      { label: 'Mercury in glass (capillary depression)', values: { liq: 'mercury', r: 0.5 } },
      { label: 'Hot water (80 °C) in a fine 0.2 mm tube', values: { liq: 'water', r: 0.2, temp: 80 } },
      { label: 'Ethanol, 1 mm tube', values: { liq: 'ethanol', r: 1 } },
    ],
    validate(p) { const w = []; if (p.r > 1.5) w.push('For wide tubes (r ≳ 1.5 mm) the meniscus is no longer a spherical cap, so Jurin\'s law becomes less accurate.'); return w; },
    compute(p) {
      const L = stProps(p); const r = p.r / 1000; const h = capH(L.T, L.theta, L.rho, r); const cos = Math.cos(rad(L.theta));
      const F = 2 * Math.PI * r * L.T * cos; const dP = (2 * L.T * cos) / r;
      const rise = h > 1e-6 ? 'rise' : h < -1e-6 ? 'depression' : 'no change';
      const formulas = [
        { name: 'Capillary rise (Jurin\'s law)', formula: 'h = 2T·cosθ / (ρ·g·r)', given: `T = ${fmt(L.T, 3)} N/m, θ = ${L.theta}°, ρ = ${L.rho} kg/m³, g = 9.81 m/s², r = ${fmt(r, 3)} m`,
          calc: `h = 2 × ${fmt(L.T, 3)} × cos ${L.theta}° / (${L.rho} × 9.81 × ${fmt(r, 3)}) = ${fmt(2 * L.T * cos, 3)} / ${fmt(L.rho * GRAV * r, 3)}`, result: `${fmt(h, 3)} m = ${fmt(h * 1000, 3)} mm`, unit: 'metres (m)' },
        { name: 'Upward pull of surface tension (force balance)', formula: 'F = 2πr·T·cosθ = πr²·h·ρ·g', given: `r = ${fmt(r, 3)} m`, calc: `2π × ${fmt(r, 3)} × ${fmt(L.T, 3)} × ${fmt(cos, 3)}`, result: fmt(F, 3), unit: 'newtons (N)' },
        { name: 'Pressure difference across the meniscus', formula: 'ΔP = 2T·cosθ / r', given: `T = ${fmt(L.T, 3)} N/m, r = ${fmt(r, 3)} m`, calc: `2 × ${fmt(L.T, 3)} × ${fmt(cos, 3)} / ${fmt(r, 3)}`, result: fmt(dP, 3), unit: 'pascals (Pa)' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Surface tension T', value: `${fmt(L.T * 1000, 3)} mN/m`, tone: 'info' },
          { label: 'Contact angle θ', value: `${L.theta}°` },
          { label: rise === 'depression' ? 'Depression' : 'Rise h', value: `${fmt(Math.abs(h) * 1000, 3)} mm`, tone: rise === 'depression' ? 'bad' : 'good' },
          { label: 'Meniscus', value: L.theta < 90 ? 'concave' : L.theta > 90 ? 'convex' : 'flat' },
        ],
        state: { liquid: L.name, surfaceTension: `${fmt(L.T, 3)} N/m`, contactAngle: `${L.theta}°`, density: `${L.rho} kg/m³`, radius: `${p.r} mm`, height: `${fmt(h * 1000, 3)} mm`, effect: rise, meniscus: L.theta < 90 ? 'concave' : L.theta > 90 ? 'convex' : 'flat', force: `${fmt(F, 3)} N`, temperature: p.liq === 'water' ? `${p.temp} °C` : '≈ 20 °C' },
        explain: {
          what: `${L.name} in a glass tube of radius ${p.r} mm shows capillary ${rise}: the level inside is ${fmt(Math.abs(h) * 1000, 3)} mm ${h >= 0 ? 'above' : 'below'} the outside level, with a ${L.theta < 90 ? 'concave (curved down in the middle)' : 'convex (curved up)'} meniscus.`,
          why: `A molecule inside the liquid is pulled equally in all directions, but a molecule at the surface is pulled only inward, so the surface behaves like a stretched skin with tension T. ${L.theta < 90 ? 'The liquid wets glass (adhesion > cohesion, θ < 90°), so the surface pulls the column up until its weight balances 2πrT cosθ.' : 'The liquid does not wet glass (cohesion > adhesion, θ > 90°), so cosθ < 0 and the column is pushed down.'}`,
          param: `Liquid (T, θ, ρ) and tube radius r = ${p.r} mm${p.liq === 'water' ? `, water temperature ${p.temp} °C` : ''}.`,
          effect: `h ∝ 1/r: halving the radius doubles the rise (${fmt(Math.abs(h) * 2000, 3)} mm at r = ${fmt(p.r / 2, 3)} mm). Hotter water has lower surface tension, so it rises less.`,
        },
      };
    },
    steps(p, c) {
      const s = c.state;
      return [
        { title: 'Molecules inside the liquid', text: 'A molecule deep inside is attracted equally by neighbours on all sides — the net force is zero.' },
        { title: 'Molecules at the surface', text: `A surface molecule has no liquid above it, so it feels a net inward pull. The surface acts like a stretched skin: surface tension T = ${s.surfaceTension}.` },
        { title: 'A narrow tube is dipped in', text: `${s.liquid} meets glass at a contact angle θ = ${s.contactAngle}, so the meniscus is ${s.meniscus}.` },
        { title: s.effect === 'depression' ? 'Capillary depression' : 'Capillary rise', text: `Upward pull 2πrT cosθ balances the column weight πr²hρg: h = 2T cosθ/(ρgr) = ${s.height}.` },
        { title: 'Thinner tube → bigger effect', text: `h is inversely proportional to r. The graph shows h for tube radii from 0.1 to 2 mm; the dot is r = ${s.radius}.` },
      ];
    },
    draw(g, S2) {
      const { p, c, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff'); const L = stProps(p); const hmm = capH(L.T, L.theta, L.rho, p.r / 1000) * 1000;
      // ── molecules panel
      const mx = 20, my = 30, mw = 410, mh = 250; const surfY = 100;
      D.rect(g, mx, my, mw, mh, { fill: '#f8fafc', stroke: C.line, width: 1.5, r: 12 });
      D.rect(g, mx + 2, surfY, mw - 4, my + mh - surfY - 2, { fill: L.color, alpha: 0.45 });
      D.line(g, mx + 2, surfY, mx + mw - 2, surfY, { color: '#1e3a8a', width: 3 });
      D.text(g, 'Air', mx + 14, my + 26, { size: 17, weight: 800, color: C.muted });
      D.text(g, 'Surface', mx + mw - 14, surfY - 16, { size: 16, weight: 800, color: '#1e3a8a', align: 'right' });
      for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) {
        const x = mx + 30 + i * 44; const y = surfY + 14 + j * 42; D.circle(g, x + 2 * Math.sin(t * 3 + i + j), y + 2 * Math.cos(t * 2.3 + i * j), 12, { fill: L.color, stroke: '#1e3a8a', width: 1.5 });
      }
      const inX = mx + 30 + 2 * 44, inY = surfY + 14 + 2 * 42; const suX = mx + 30 + 6 * 44, suY = surfY + 14;
      D.circle(g, inX, inY, 13, { fill: C.green, stroke: C.ink, width: 2 }); D.circle(g, suX, suY, 13, { fill: C.red, stroke: C.ink, width: 2 });
      if (p.forces) {
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; D.arrow(g, inX + 15 * Math.cos(a), inY + 15 * Math.sin(a), inX + 38 * Math.cos(a), inY + 38 * Math.sin(a), { color: C.green, width: 2.5, head: 9 }); }
        if (step >= 1) {
          for (let k = 0; k < 5; k++) { const a = (k / 4) * Math.PI; D.arrow(g, suX + 15 * Math.cos(a), suY + 15 * Math.sin(a), suX + 36 * Math.cos(a), suY + 36 * Math.sin(a), { color: C.red, width: 2.5, head: 9 }); }
          D.arrow(g, suX, suY + 14, suX, suY + 78, { color: C.red, width: 6, head: 16 });
        }
      }
      D.text(g, 'inside: net force = 0', inX, inY + 58, { size: 16, weight: 800, color: C.green, align: 'center', halo: true });
      if (step >= 1) D.text(g, 'surface: net inward pull', suX - 8, surfY - 16, { size: 16, weight: 800, color: C.red, align: 'right', halo: true });
      if (step === 0) D.focus(g, inX - 50, inY - 50, 100, 100, t);
      if (step === 1) D.focus(g, suX - 50, surfY - 34, 100, 124, t);
      // ── h vs r chart
      const cx = 90, cy = 330, cw = 330, ch = 150; const rs = []; for (let i = 0; i <= 80; i++) { const r = 0.1 + (1.9 * i) / 80; rs.push([r, capH(L.T, L.theta, L.rho, r / 1000) * 1000]); }
      const hmax = Math.max(...rs.map((q) => q[1])); const hmin = Math.min(...rs.map((q) => q[1]));
      const ylo = Math.min(0, hmin) * 1.1, yhi = Math.max(0, hmax) * 1.1 || 1;
      const showC = step >= 4;
      const { X, Y } = plot(g, cx, cy, cw, ch, { xmin: 0, xmax: 2, ymin: ylo, ymax: yhi === ylo ? ylo + 1 : yhi, xticks: 4, yticks: 2, xlabel: 'tube radius r (mm)', ylabel: 'h (mm)', ylo: 60, title: 'h ∝ 1/r',
        series: showC ? [{ points: rs, color: C.blue, width: 3.5 }] : [] });
      if (showC) { D.circle(g, X(p.r), Y(hmm), 7, { fill: C.red, stroke: '#fff', width: 2 }); D.tag(g, `${fmt(hmm, 3)} mm`, clamp(X(p.r) + 12, cx + 10, cx + cw - 110), clamp(Y(hmm) - 18, cy + 16, cy + ch - 16), { bg: C.red, size: 16 }); if (step === 4) D.focus(g, cx, cy, cw, ch, t); }
      else D.text(g, 'appears in step 5', cx + cw / 2, cy + ch / 2, { size: 17, color: C.faint, align: 'center' });
      // ── capillary tube
      const rise = hmm >= 0; const surf = rise ? 445 : 170; const scale = clamp(280 / Math.max(1e-6, Math.abs(hmm)), 0.5, 20); // px per mm
      const tx = 700, tw = 34; // inner half width 17 (enlarged)
      const bx0 = 470, bx1 = 980; const bBot = 540;
      D.rect(g, bx0, surf, bx1 - bx0, bBot - surf, { fill: L.color, alpha: 0.6 });
      D.poly(g, [[bx0, surf - 30], [bx0, bBot], [bx1, bBot], [bx1, surf - 30]], { stroke: C.ink, width: 3 });
      D.text(g, `${L.name}  (T = ${fmt(L.T * 1000, 3)} mN/m, θ = ${L.theta}°)`, bx0 + 12, rise ? 30 : 470, { size: 17, weight: 800 });
      const showTube = step >= 2;
      if (showTube) {
        const hf = step === 3 ? ease01(prog) : step > 3 ? 1 : 0;
        const colTop = surf - hmm * scale * hf; // meniscus contact level
        const tubeTop = 60, tubeBot = bBot - 30;
        // liquid inside the tube
        D.rect(g, tx - tw / 2, Math.min(colTop, tubeBot), tw, tubeBot - Math.min(colTop, tubeBot), { fill: L.color });
        if (!rise) D.rect(g, tx - tw / 2, surf, tw, Math.max(0, colTop - surf), { fill: '#ffffff' });
        // meniscus
        const theta = rad(L.theta); const sag = (tw / 2) * (1 - Math.sin(theta)) / Math.max(0.2, Math.abs(Math.cos(theta))) * Math.sign(Math.cos(theta));
        const depth = clamp(sag, -tw / 2, tw / 2) * 0.9;
        g.save(); g.beginPath(); g.moveTo(tx - tw / 2, colTop); g.quadraticCurveTo(tx, colTop + 2 * depth, tx + tw / 2, colTop);
        if (depth > 0) { g.lineTo(tx + tw / 2, colTop - 1); g.fillStyle = '#ffffff'; g.fill(); }
        else { g.lineTo(tx + tw / 2, colTop + 4); g.lineTo(tx - tw / 2, colTop + 4); g.closePath(); g.fillStyle = L.color; g.fill(); }
        g.restore();
        g.save(); g.beginPath(); g.moveTo(tx - tw / 2, colTop); g.quadraticCurveTo(tx, colTop + 2 * depth, tx + tw / 2, colTop); g.strokeStyle = '#1e3a8a'; g.lineWidth = 2.5; g.stroke(); g.restore();
        // glass walls
        D.rect(g, tx - tw / 2 - 6, tubeTop, 6, tubeBot - tubeTop, { fill: '#e0f2fe', stroke: '#0369a1', width: 1.5 });
        D.rect(g, tx + tw / 2, tubeTop, 6, tubeBot - tubeTop, { fill: '#e0f2fe', stroke: '#0369a1', width: 1.5 });
        D.text(g, 'Glass tube', tx + tw / 2 + 14, tubeTop + 12, { size: 16, weight: 800, color: '#0369a1' });
        D.text(g, `r = ${p.r} mm (width enlarged)`, tx + tw / 2 + 14, tubeTop + 34, { size: 16, weight: 700, color: C.muted });
        D.text(g, L.theta < 90 ? 'concave meniscus' : L.theta > 90 ? 'convex meniscus' : 'flat', tx + tw / 2 + 14, colTop + (rise ? -4 : 0) + 0, { size: 16, weight: 800, color: '#1e3a8a', halo: true });
        if (step === 2) D.focus(g, tx - 40, Math.min(colTop, surf) - 40, 80, Math.abs(colTop - surf) + 80, t);
        // ruler (mm)
        const rx = tx - 95; const span = Math.abs(hmm) * 1.1 + 2; const tick = span > 40 ? 10 : span > 15 ? 5 : span > 5 ? 2 : 1;
        D.line(g, rx, surf, rx, surf - Math.sign(hmm || 1) * span * scale, { color: C.ink, width: 2 });
        for (let v = 0; v <= span; v += tick) { const yy = surf - Math.sign(hmm || 1) * v * scale; if (yy < 40 || yy > 535) continue; D.line(g, rx - 8, yy, rx, yy, { color: C.ink, width: 2 }); D.text(g, `${v}`, rx - 12, yy, { size: 16, weight: 600, color: C.muted, align: 'right' }); }
        D.text(g, 'mm', rx - 12, surf + (rise ? 20 : -20), { size: 16, weight: 800, color: C.muted, align: 'right' });
        D.line(g, rx, surf, bx1 - 10, surf, { color: C.muted, width: 1.5, dash: [6, 5] });
        if (step >= 3) {
          const dx = tx + tw / 2 + 60;
          if (Math.abs(colTop - surf) > 6) D.arrow(g, dx, surf, dx, colTop, { color: rise ? C.green : C.red, width: 4, head: 14 });
          D.tag(g, `${rise ? 'h' : 'depression'} = ${fmt(Math.abs(hmm) * hf, 3)} mm`, dx + 14, (surf + colTop) / 2, { bg: rise ? C.green : C.red, size: 18 });
          D.text(g, `outside level`, bx1 - 14, surf + (rise ? 18 : -16), { size: 16, weight: 700, color: C.muted, align: 'right' });
          if (step === 3) D.focus(g, dx - 20, Math.min(surf, colTop) - 10, 240, Math.abs(colTop - surf) + 20, t);
        }
      } else {
        D.text(g, 'The tube is dipped in at step 3', 725, 300, { size: 17, color: C.faint, align: 'center' });
      }
    },
  };
  function ease01(x) { return D.ease(x); }

  // ─────────────────────────────────────────────────────────────
  // 8. Viscosity Simulator
  // ─────────────────────────────────────────────────────────────
  const LIQ_V = {
    water: { name: 'Water', eta: 1.0e-3, rho: 998, color: '#bfdbfe', note: '≈ 1.0 × 10⁻³' },
    olive: { name: 'Olive oil', eta: 0.084, rho: 910, color: '#d9f99d', note: '≈ 0.08' },
    castor: { name: 'Castor oil', eta: 0.99, rho: 961, color: '#fef08a', note: '≈ 1.0' },
    glycerine: { name: 'Glycerine', eta: 1.41, rho: 1261, color: '#e0e7ff', note: '≈ 1.4' },
    honey: { name: 'Honey', eta: 6, rho: 1420, color: '#fcd34d', note: '≈ 2–10 (6 used)' },
  };
  const liqVOptions = Object.entries(LIQ_V).map(([k, v]) => ({ value: k, label: `${v.name} (η ${v.note} Pa·s)` }));
  /** Drag coefficient for a sphere (Stokes for Re < 0.1, Schiller–Naumann up to Re ≈ 800, Newton regime above). */
  function cd(Re) { if (Re < 1e-9) return 24 / 1e-9; if (Re < 800) return (24 / Re) * (1 + 0.15 * Math.pow(Re, 0.687)); return 0.44; }
  function ballFall(liqKey, p) {
    const L = LIQ_V[liqKey] || LIQ_V.water; const r = p.r / 1000; const dRho = p.rhoS - L.rho;
    const vS = (2 * r * r * dRho * GRAV) / (9 * L.eta);
    const net = (4 / 3) * Math.PI * r * r * r * Math.abs(dRho) * GRAV;
    const drag = (v) => 0.5 * cd((L.rho * v * 2 * r) / L.eta) * L.rho * v * v * Math.PI * r * r;
    let lo = 0, hi = Math.max(vS, 100); for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (drag(mid) > net) hi = mid; else lo = mid; }
    const v = (lo + hi) / 2; const Re = (L.rho * v * 2 * r) / L.eta; const ReS = (L.rho * vS * 2 * r) / L.eta;
    const H = p.H / 100; const tFall = v > 0 ? H / v : Infinity; const F = (L.eta * (p.Ap * 1e-4) * (p.vp / 100)) / (p.gap / 1000);
    const tau = (p.rhoS * 2 * r * r) / (9 * L.eta); // Stokes relaxation time
    return { L, vS, v, Re, ReS, tFall, F, stokesOK: Re <= 1, tau, dRho };
  }
  S['ep-viscosity'] = {
    approx: "Stokes' law v_t = 2r²(ρ_s − ρ_f)g/(9η) holds only for Reynolds number Re ≲ 1 and a ball far from the walls. When Re > 1 the fall speed and time are instead estimated from the standard sphere drag curve (Schiller–Naumann correlation), which is also approximate. Fall times ignore the short acceleration phase. Viscosities are typical values at about 20 °C (honey varies a lot: 2–10 Pa·s).",
    modes: [{ key: 'compare', label: 'Side-by-side compare' }, { key: 'low', label: 'Low viscosity' }, { key: 'high', label: 'High viscosity' }],
    params: [
      { key: 'liqA', label: 'Low-viscosity liquid', type: 'select', options: liqVOptions, default: 'water', showIf: (p) => p.mode !== 'high' },
      { key: 'liqB', label: 'High-viscosity liquid', type: 'select', options: liqVOptions, default: 'glycerine', showIf: (p) => p.mode !== 'low' },
      { key: 'r', label: 'Ball radius r', type: 'range', min: 0.25, max: 5, step: 0.05, default: 1, unit: 'mm' },
      { key: 'rhoS', label: 'Ball density ρ_s', type: 'range', min: 2000, max: 11400, step: 10, default: 7850, unit: 'kg/m³', help: 'Steel ≈ 7850, glass ≈ 2500, lead ≈ 11 340 kg/m³.' },
      { key: 'H', label: 'Fall height (tube length)', type: 'range', min: 10, max: 100, step: 1, default: 30, unit: 'cm' },
      { key: 'vp', label: 'Top-plate speed v', type: 'range', min: 1, max: 50, step: 1, default: 5, unit: 'cm/s' },
      { key: 'gap', label: 'Gap between plates d', type: 'range', min: 1, max: 20, step: 0.5, default: 5, unit: 'mm' },
      { key: 'Ap', label: 'Plate area A', type: 'range', min: 10, max: 500, step: 10, default: 100, unit: 'cm²' },
    ],
    examples: [
      { label: 'Steel ball: water vs glycerine', values: { mode: 'compare', liqA: 'water', liqB: 'glycerine', r: 1, rhoS: 7850, H: 30 } },
      { label: 'Classic lab: 1 mm steel ball in glycerine', values: { mode: 'high', liqB: 'glycerine', r: 1, rhoS: 7850, H: 50 } },
      { label: 'Olive oil vs honey, glass bead', values: { mode: 'compare', liqA: 'olive', liqB: 'honey', r: 2, rhoS: 2500, H: 30 } },
      { label: 'Tiny steel ball in water (Stokes almost fails)', values: { mode: 'low', liqA: 'water', r: 0.25, rhoS: 7850, H: 20 } },
    ],
    validate(p) {
      const w = []; const list = p.mode === 'low' ? ['liqA'] : p.mode === 'high' ? ['liqB'] : ['liqA', 'liqB'];
      list.forEach((k) => { const b = ballFall(p[k], p); if (!b.stokesOK) w.push(`${b.L.name}: Re = ${fmt(b.Re, 3)} > 1 — Stokes' law is not accurate here (it predicts ${fmt(b.vS, 3)} m/s, real ≈ ${fmt(b.v, 3)} m/s).`); });
      if (p.mode === 'compare' && LIQ_V[p.liqA].eta > LIQ_V[p.liqB].eta) w.push('The "low-viscosity" liquid is actually more viscous than the "high-viscosity" one.');
      return w;
    },
    compute(p) {
      const keys = p.mode === 'low' ? ['liqA'] : p.mode === 'high' ? ['liqB'] : ['liqA', 'liqB'];
      const res = keys.map((k) => ({ k, ...ballFall(p[k], p) }));
      const r = p.r / 1000; const formulas = [];
      res.forEach((b) => {
        formulas.push({ name: `${b.L.name}: Newton's law of viscosity`, formula: 'F = η·A·(dv/dy) = η·A·v/d', given: `η = ${fmt(b.L.eta, 3)} Pa·s, A = ${fmt(p.Ap * 1e-4, 3)} m², v = ${fmt(p.vp / 100, 3)} m/s, d = ${fmt(p.gap / 1000, 3)} m`,
          calc: `${fmt(b.L.eta, 3)} × ${fmt(p.Ap * 1e-4, 3)} × ${fmt(p.vp / 100, 3)} / ${fmt(p.gap / 1000, 3)}`, result: fmt(b.F, 3), unit: 'newtons (N)' });
        formulas.push({ name: `${b.L.name}: Stokes' terminal velocity`, formula: 'v_t = 2r²(ρ_s − ρ_f)g / (9η)', given: `r = ${fmt(r, 3)} m, ρ_s = ${p.rhoS} kg/m³, ρ_f = ${b.L.rho} kg/m³, η = ${fmt(b.L.eta, 3)} Pa·s`,
          calc: `2 × (${fmt(r, 3)})² × ${b.dRho} × 9.81 / (9 × ${fmt(b.L.eta, 3)})`, result: fmt(b.vS, 3), unit: 'm/s' });
        formulas.push({ name: `${b.L.name}: Reynolds number check`, formula: 'Re = ρ_f·v·D / η   (Stokes valid if Re ≲ 1)', given: `v = ${fmt(b.v, 3)} m/s, D = ${fmt(2 * r, 3)} m`,
          calc: `${b.L.rho} × ${fmt(b.v, 3)} × ${fmt(2 * r, 3)} / ${fmt(b.L.eta, 3)}`, result: `${fmt(b.Re, 3)} → ${b.stokesOK ? 'Stokes OK' : `Stokes NOT valid; drag-curve estimate v ≈ ${fmt(b.v, 3)} m/s`}`, unit: '— (dimensionless)' });
        formulas.push({ name: `${b.L.name}: time to fall ${p.H} cm`, formula: 't = H / v', given: `H = ${fmt(p.H / 100, 3)} m, v = ${fmt(b.v, 3)} m/s`, calc: `${fmt(p.H / 100, 3)} / ${fmt(b.v, 3)}`, result: fmt(b.tFall, 3), unit: 'seconds (s)' });
      });
      const readouts = res.map((b) => ({ label: `${b.L.name} v`, value: `${fmt(b.v, 3)} m/s`, tone: b.stokesOK ? 'good' : 'warn' }));
      res.forEach((b) => readouts.push({ label: `${b.L.name} fall`, value: fmtTime(b.tFall) }));
      const A = res[0]; const B = res[res.length - 1];
      const ratioT = B.tFall / A.tFall;
      const state = { mode: p.mode, ballRadius: `${p.r} mm`, ballDensity: `${p.rhoS} kg/m³`, fallHeight: `${p.H} cm` };
      res.forEach((b, i) => { const n = i === 0 && keys[0] === 'liqA' ? 'low' : 'high'; state[`${n}Liquid`] = `${b.L.name} (η ≈ ${fmt(b.L.eta, 3)} Pa·s)`; state[`${n}StokesVelocity`] = `${fmt(b.vS, 3)} m/s`; state[`${n}Velocity`] = `${fmt(b.v, 3)} m/s`; state[`${n}Re`] = fmt(b.Re, 3); state[`${n}StokesValid`] = b.stokesOK; state[`${n}FallTime`] = fmtTime(b.tFall); state[`${n}Force`] = `${fmt(b.F, 3)} N`; });
      if (res.length === 2) state.fallTimeRatio = fmt(ratioT, 3);
      const one = res[0];
      return {
        formulas, readouts, state,
        explain: {
          what: res.length === 2 ? `A ${p.r} mm steel-like ball (ρ = ${p.rhoS} kg/m³) falls ${p.H} cm in ${A.L.name.toLowerCase()} in ${fmtTime(A.tFall)} but takes ${fmtTime(B.tFall)} in ${B.L.name.toLowerCase()} — about ${fmt(ratioT, 3)}× longer. Moving the top plate at ${p.vp} cm/s needs ${fmt(A.F, 3)} N in ${A.L.name.toLowerCase()} and ${fmt(B.F, 3)} N in ${B.L.name.toLowerCase()}.`
            : `In ${one.L.name.toLowerCase()} (η ≈ ${fmt(one.L.eta, 3)} Pa·s) the ball reaches a terminal velocity of ${fmt(one.v, 3)} m/s and falls ${p.H} cm in ${fmtTime(one.tFall)}. Re = ${fmt(one.Re, 3)}, so Stokes' law ${one.stokesOK ? 'is valid' : 'is NOT accurate'}.`,
          why: 'Viscosity is internal friction between liquid layers sliding over each other. A falling ball speeds up until the upward viscous drag plus buoyancy equals its weight; then it moves at constant (terminal) velocity. The larger η, the larger the drag at a given speed, so the slower the ball.',
          param: `Liquid viscosity η and density ρ_f, ball radius r = ${p.r} mm, ball density ρ_s = ${p.rhoS} kg/m³, fall height ${p.H} cm.`,
          effect: 'In the Stokes regime v_t ∝ r²(ρ_s − ρ_f)/η: doubling r makes the ball 4× faster, doubling η makes it 2× slower. For viscous flow between plates, F ∝ η: the same push moves a thick liquid much more slowly.',
        },
      };
    },
    steps(p, c) {
      const s = c.state; const cmp = p.mode === 'compare';
      const lo = s.lowLiquid || s.highLiquid; const hi = s.highLiquid || s.lowLiquid;
      return [
        { title: 'Liquid layers slide over each other', text: 'The bottom plate is fixed and the top plate moves. Each layer moves a little faster than the one below — a velocity gradient dv/dy.' },
        { title: "Newton's law of viscosity", text: `F = ηA·v/d. ${cmp ? `${lo}: F = ${s.lowForce}; ${hi}: F = ${s.highForce}.` : `F = ${s.lowForce || s.highForce}.`} Higher η → more force for the same flow.` },
        { title: 'Drop a ball: three forces', text: 'Weight (down), buoyancy (up) and viscous drag (up, 6πηrv in Stokes\' law). Drag grows with speed.' },
        { title: 'Terminal velocity', text: cmp ? `Stokes: v_t = 2r²(ρ_s − ρ_f)g/9η. ${lo}: ${s.lowVelocity} (Re = ${s.lowRe}); ${hi}: ${s.highVelocity} (Re = ${s.highRe}).` : `v_t = ${s.lowVelocity || s.highVelocity}, Re = ${s.lowRe || s.highRe} — ${(s.lowStokesValid ?? s.highStokesValid) ? 'Stokes\' law is valid' : 'Re > 1, Stokes\' law is not accurate'}.` },
        { title: cmp ? 'Which falls faster?' : 'Time to fall', text: cmp ? `The ball takes ${s.lowFallTime} in the low-viscosity liquid and ${s.highFallTime} in the high-viscosity liquid (${s.fallTimeRatio}× longer).` : `The ball falls ${p.H} cm in ${s.lowFallTime || s.highFallTime}.` },
      ];
    },
    stepDuration: 5,
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff');
      const keys = p.mode === 'low' ? ['liqA'] : p.mode === 'high' ? ['liqB'] : ['liqA', 'liqB'];
      const res = keys.map((k) => ballFall(p[k], p));
      const tMax = Math.max(...res.map((b) => b.tFall));
      // animation clock: the slowest ball takes ~4 s of screen time
      const anim = step < 3 ? 0 : step === 3 ? prog : step === 4 ? prog : 1;
      const playT = step >= 4 && prog >= 1 ? ((t * 0.25) % 1.25) : anim;
      const realT = Math.min(1, playT) * tMax;
      if (res.length === 2) {
        D.tag(g, `${res[1].L.name} is ${fmt(res[1].L.eta / res[0].L.eta, 3)}× more viscous → ball takes ${fmt(res[1].tFall / res[0].tFall, 3)}× longer`, 500, 22, { bg: C.violet, size: 17, align: 'center' });
        drawVisc(g, 20, res[0], 'LOW VISCOSITY', C.green, realT, p, step, prog, t);
        D.line(g, 500, 44, 500, 545, { color: C.line, width: 2 });
        drawVisc(g, 510, res[1], 'HIGH VISCOSITY', C.red, realT, p, step, prog, t);
      } else {
        const b = res[0];
        drawVisc(g, 20, b, p.mode === 'low' ? 'LOW VISCOSITY' : 'HIGH VISCOSITY', p.mode === 'low' ? C.green : C.red, realT, p, step, prog, t);
        // v(t) chart (drag-curve integration)
        const r = p.r / 1000; const m = p.rhoS * (4 / 3) * Math.PI * r * r * r; const Vb = (4 / 3) * Math.PI * r * r * r;
        const fnet = (v) => (m - b.L.rho * Vb) * GRAV - 0.5 * cd(Math.max(1e-9, (b.L.rho * v * 2 * r) / b.L.eta)) * b.L.rho * v * v * Math.PI * r * r;
        const T = Math.max(5 * b.v / GRAV * (p.rhoS / (p.rhoS - b.L.rho)), 6 * b.tau, 1e-4); const pts = [[0, 0]]; let v = 0; const n = 400; const dt = T / n;
        for (let i = 1; i <= n; i++) { const a = fnet(v) / m; v = Math.min(b.v * 1.02, v + a * dt); pts.push([i * dt, v]); }
        plot(g, 590, 80, 380, 200, { xmin: 0, xmax: T, ymin: 0, ymax: b.v * 1.2, xticks: 3, yticks: 3, xlabel: 'time (s)', ylabel: 'speed (m/s)', ylo: 62, title: 'Ball speed → terminal velocity', series: step >= 2 ? [{ points: pts, color: C.blue, width: 3.5 }] : [], xfmt: (x) => fmt(x, 2), yfmt: (y) => fmt(y, 2) });
        if (step >= 2) D.tag(g, `v_t ≈ ${fmt(b.v, 3)} m/s`, 960, 100, { bg: C.blue, size: 16, align: 'right' });
        panel(g, 530, 360, 450, 'Stokes check', [
          { t: `Stokes v_t = 2r²(ρ_s−ρ_f)g/9η = ${fmt(b.vS, 3)} m/s` },
          { t: `Re = ρ_f·v·D/η = ${fmt(b.Re, 3)}`, weight: 800, color: b.stokesOK ? C.green : C.red },
          { t: b.stokesOK ? 'Re ≲ 1 → Stokes\' law valid' : `Re > 1 → Stokes NOT valid; drag curve: ${fmt(b.v, 3)} m/s`, color: b.stokesOK ? C.green : C.red, weight: 800, size: 16 },
        ], { lh: 30 });
        if (step === 3) D.focus(g, 530, 360, 450, 140, t);
      }
    },
  };
  function drawVisc(g, x0, b, title, col, realT, p, step, prog, t) {
    const L = b.L;
    D.text(g, title, x0 + 10, 58, { size: 20, weight: 800, color: col });
    D.text(g, `${L.name}, η ${L.note} Pa·s`, x0 + 10, 84, { size: 17, weight: 700, color: C.ink });
    // layers
    const lx = x0 + 10, lw = 240, top = 118, bot = 262;
    D.rect(g, lx, top, lw, bot - top, { fill: L.color, alpha: 0.7 });
    D.rect(g, lx, bot, lw, 10, { fill: '#334155' }); D.text(g, 'fixed plate', lx + lw / 2, bot + 24, { size: 16, weight: 700, color: C.muted, align: 'center' });
    const plateShift = ((t * 30 * (step >= 0 ? 1 : 0)) % 40);
    D.rect(g, lx - 10 + plateShift * 0.25, top - 12, lw, 10, { fill: '#334155' });
    D.arrow(g, lx + lw - 70, top - 26, lx + lw + 8, top - 26, { color: C.ink, width: 3, head: 12 });
    D.text(g, `v = ${p.vp} cm/s`, lx + lw - 76, top - 26, { size: 16, weight: 800, align: 'right' });
    const nL = 6;
    for (let i = 0; i < nL; i++) {
      const fy = (i + 0.5) / nL; const y = bot - fy * (bot - top); const len = 12 + fy * 150;
      D.line(g, lx, y - (bot - top) / nL / 2, lx + lw, y - (bot - top) / nL / 2, { color: '#ffffff', width: 1.5, alpha: 0.9 });
      D.arrow(g, lx + 8, y, lx + 8 + len, y, { color: col, width: 3, head: 10 });
      const px = lx + ((t * 40 * fy) % lw); D.circle(g, px, y + 6, 3.5, { fill: C.ink, alpha: 0.5 });
    }
    if (step === 0) D.focus(g, lx, top - 14, lw, bot - top + 26, t);
    if (step >= 1) {
      D.text(g, `F = ηAv/d = ${fmt(b.F, 3)} N`, lx, 316, { size: 17, weight: 800, color: col });
      if (step === 1) D.focus(g, lx - 4, 300, 250, 32, t);
    }
    // Stokes info lines under the layers
    if (step >= 3) {
      D.text(g, `Stokes: v_t = ${fmt(b.vS, 3)} m/s`, lx, 356, { size: 16, weight: 700 });
      D.text(g, `Re = ${fmt(b.Re, 3)}`, lx, 384, { size: 16, weight: 800, color: b.stokesOK ? C.green : C.red });
      D.text(g, b.stokesOK ? 'Stokes valid (Re ≲ 1)' : 'Re > 1: Stokes NOT valid', lx, 410, { size: 16, weight: 800, color: b.stokesOK ? C.green : C.red });
      if (!b.stokesOK) D.text(g, `drag-curve v ≈ ${fmt(b.v, 3)} m/s`, lx, 436, { size: 16, weight: 700 });
    }
    // falling-ball tube
    const tx = x0 + 300, tw = 110, tTop = 118, tBot = 478;
    D.rect(g, tx, tTop, tw, tBot - tTop, { fill: L.color, alpha: 0.75 });
    D.poly(g, [[tx, tTop - 10], [tx, tBot], [tx + tw, tBot], [tx + tw, tTop - 10]], { stroke: C.ink, width: 3 });
    const y0 = tTop + 14, y1 = tBot - 14; const frac = clamp((b.v * realT) / (p.H / 100), 0, 1);
    const by = y0 + (y1 - y0) * frac; const br = clamp(p.r * 4, 5, 16); const bxc = tx + tw / 2;
    D.line(g, tx - 10, y0, tx, y0, { color: C.ink, width: 2 }); D.line(g, tx - 10, y1, tx, y1, { color: C.ink, width: 2 });
    D.text(g, `${p.H} cm`, tx - 14, (y0 + y1) / 2, { size: 16, weight: 800, align: 'right', color: C.muted });
    D.atom(g, bxc, by, br, '#64748b');
    if (step === 2) {
      const fy = y0 + (y1 - y0) * 0.35;
      D.atom(g, bxc, fy, br, '#64748b');
      D.arrow(g, bxc, fy + br, bxc, fy + br + 60, { color: C.ink, width: 4, head: 12 }); D.text(g, 'W', bxc + 10, fy + br + 50, { size: 17, weight: 800 });
      D.arrow(g, bxc - 12, fy - br, bxc - 12, fy - br - 36, { color: C.blue, width: 4, head: 12 }); D.text(g, 'B', bxc - 36, fy - br - 30, { size: 17, weight: 800, color: C.blue });
      D.arrow(g, bxc + 12, fy - br, bxc + 12, fy - br - 50, { color: C.red, width: 4, head: 12 }); D.text(g, 'F_d', bxc + 20, fy - br - 44, { size: 17, weight: 800, color: C.red });
      D.focus(g, tx, fy - 80, tw, 160, t);
    }
    if (step >= 3) {
      D.text(g, `v ≈ ${fmt(b.v, 3)} m/s`, bxc, tBot + 22, { size: 17, weight: 800, align: 'center', color: col });
      D.text(g, `t = ${fmtTime(Math.min(realT, b.tFall))}${frac >= 1 ? ' ✓' : ''}`, bxc, tBot + 48, { size: 17, weight: 800, align: 'center' });
      if (step === 4 && frac >= 1) D.tag(g, `fell in ${fmtTime(b.tFall)}`, bxc, y1 - 30, { bg: col, size: 16, align: 'center' });
    }
    if (step === 3) D.focus(g, tx, tTop, tw, tBot - tTop, t);
  }

  // ─────────────────────────────────────────────────────────────
  // 9. Fluid Flow Visualizer
  // ─────────────────────────────────────────────────────────────
  const FLUIDS = {
    water: { name: 'Water', rho: 998, eta: 1.0e-3 },
    air: { name: 'Air', rho: 1.2, eta: 1.8e-5 },
    blood: { name: 'Blood (typical)', rho: 1060, eta: 3.5e-3 },
    olive: { name: 'Olive oil', rho: 910, eta: 0.084 },
    glycerine: { name: 'Glycerine', rho: 1261, eta: 1.41 },
  };
  const regime = (Re) => (Re < 2000 ? 'laminar' : Re <= 4000 ? 'transitional' : 'turbulent');
  const turbFac = (Re) => clamp((Re - 2000) / 2000, 0, 1);
  const hashN = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  S['ep-fluid-flow'] = {
    approx: 'Circular pipe, incompressible steady flow. Regime limits 2000 / 4000 are the usual engineering guide values (the real transition depends on inlet disturbances). Turbulent eddies are drawn with a deterministic pseudo-random pattern; the turbulent profile uses the 1/7-power law. Animation speed is scaled for viewing; relative speeds are correct.',
    params: [
      { key: 'fluid', label: 'Fluid', type: 'select', options: Object.entries(FLUIDS).map(([k, f]) => ({ value: k, label: `${f.name} (ρ = ${f.rho} kg/m³, η = ${fmt(f.eta, 2)} Pa·s)` })), default: 'water' },
      { key: 'v', label: 'Mean velocity v₁ (wide section)', type: 'range', min: 0.001, max: 5, step: 0.001, default: 0.05, unit: 'm/s' },
      { key: 'D', label: 'Pipe diameter D₁', type: 'range', min: 0.5, max: 30, step: 0.1, default: 2, unit: 'cm' },
      { key: 'ratio', label: 'Constriction D₂/D₁ (1 = no narrowing)', type: 'range', min: 0.3, max: 1, step: 0.01, default: 0.6 },
    ],
    examples: [
      { label: 'Tap water, slow (laminar)', values: { fluid: 'water', v: 0.05, D: 2, ratio: 0.6 } },
      { label: 'Water main (turbulent)', values: { fluid: 'water', v: 1.5, D: 10, ratio: 0.7 } },
      { label: 'Laminar in wide part, turbulent in the nozzle', values: { fluid: 'water', v: 0.08, D: 2, ratio: 0.4 } },
      { label: 'Glycerine: always laminar', values: { fluid: 'glycerine', v: 2, D: 5, ratio: 0.5 } },
    ],
    validate() { return []; },
    compute(p) {
      const f = FLUIDS[p.fluid] || FLUIDS.water; const D1 = p.D / 100; const D2 = D1 * p.ratio; const A1 = (Math.PI * D1 * D1) / 4; const A2 = (Math.PI * D2 * D2) / 4;
      const v2 = (p.v * A1) / A2; const Q = A1 * p.v; const Re1 = (f.rho * p.v * D1) / f.eta; const Re2 = (f.rho * v2 * D2) / f.eta;
      const formulas = [
        { name: 'Reynolds number (wide section)', formula: 'Re = ρ·v·D / η', given: `ρ = ${f.rho} kg/m³, v = ${p.v} m/s, D = ${fmt(D1, 3)} m, η = ${fmt(f.eta, 3)} Pa·s`,
          calc: `${f.rho} × ${p.v} × ${fmt(D1, 3)} / ${fmt(f.eta, 3)}`, result: `${fmt(Re1, 3)} → ${regime(Re1)}`, unit: '— (dimensionless)' },
        { name: 'Volume flow rate', formula: 'Q = A·v = (πD²/4)·v', given: `D = ${fmt(D1, 3)} m, v = ${p.v} m/s`, calc: `(π × ${fmt(D1, 3)}² / 4) × ${p.v} = ${fmt(A1, 3)} × ${p.v}`, result: `${fmt(Q, 3)} m³/s = ${fmt(Q * 1000, 3)} L/s`, unit: 'm³/s' },
        { name: 'Continuity equation', formula: 'A₁v₁ = A₂v₂  →  v₂ = v₁·(D₁/D₂)²', given: `v₁ = ${p.v} m/s, D₂/D₁ = ${p.ratio}`, calc: `v₂ = ${p.v} × (1/${p.ratio})² = ${p.v} × ${fmt(1 / (p.ratio * p.ratio), 3)}`, result: fmt(v2, 3), unit: 'm/s' },
        { name: 'Reynolds number in the narrow section', formula: 'Re₂ = ρ·v₂·D₂ / η = Re₁·(D₁/D₂)', given: `v₂ = ${fmt(v2, 3)} m/s, D₂ = ${fmt(D2, 3)} m`, calc: `${f.rho} × ${fmt(v2, 3)} × ${fmt(D2, 3)} / ${fmt(f.eta, 3)}`, result: `${fmt(Re2, 3)} → ${regime(Re2)}`, unit: '— (dimensionless)' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Re (wide)', value: fmt(Re1, 3), tone: Re1 < 2000 ? 'good' : Re1 <= 4000 ? 'warn' : 'bad' },
          { label: 'Regime', value: regime(Re1), tone: Re1 < 2000 ? 'good' : Re1 <= 4000 ? 'warn' : 'bad' },
          { label: 'v₂ (narrow)', value: `${fmt(v2, 3)} m/s`, tone: 'info' },
          { label: 'Flow rate Q', value: `${fmt(Q * 1000, 3)} L/s` },
        ],
        state: { fluid: f.name, density: `${f.rho} kg/m³`, viscosity: `${fmt(f.eta, 3)} Pa·s`, v1: `${p.v} m/s`, D1: `${p.D} cm`, D2: `${fmt(p.D * p.ratio, 3)} cm`, v2: `${fmt(v2, 3)} m/s`, flowRate: `${fmt(Q, 3)} m³/s (${fmt(Q * 1000, 3)} L/s)`, Re1: fmt(Re1, 3), Re2: fmt(Re2, 3), regime1: regime(Re1), regime2: regime(Re2) },
        explain: {
          what: `${f.name} flows at ${p.v} m/s through a ${p.D} cm pipe (Re = ${fmt(Re1, 3)}, ${regime(Re1)}). In the narrow part (D₂ = ${fmt(p.D * p.ratio, 3)} cm) it speeds up to ${fmt(v2, 3)} m/s and Re becomes ${fmt(Re2, 3)} (${regime(Re2)}).`,
          why: 'Re = ρvD/η compares inertial forces (which amplify disturbances) with viscous forces (which smooth them out). Low Re → smooth parallel layers (laminar); high Re → swirling eddies (turbulent). The same volume per second must pass every section, so a narrower section means a higher speed (continuity).',
          param: `Fluid (ρ, η), mean velocity v₁ = ${p.v} m/s, diameter D₁ = ${p.D} cm and constriction ratio D₂/D₁ = ${p.ratio}.`,
          effect: 'Raising v or D, or using a less viscous fluid, increases Re and pushes the flow towards turbulence. Halving the diameter makes the fluid 4× faster (area ÷ 4) and doubles Re.',
        },
      };
    },
    steps(p, c) {
      const s = c.state;
      return [
        { title: 'Fluid enters the pipe', text: `${s.fluid} flows at v₁ = ${s.v1} in a ${s.D1} pipe. Volume flow rate Q = A·v = ${s.flowRate}.` },
        { title: 'Reynolds number', text: `Re = ρvD/η = ${s.Re1}. Below 2000 → laminar; 2000–4000 → transitional; above 4000 → turbulent.` },
        { title: s.regime1 === 'laminar' ? 'Laminar flow: smooth streamlines' : s.regime1 === 'turbulent' ? 'Turbulent flow: eddies and mixing' : 'Transitional flow: bursts of eddies', text: s.regime1 === 'laminar' ? 'Fluid moves in parallel layers that do not mix.' : 'Fluid particles swirl and mix across the pipe as they move along.' },
        { title: 'Velocity profile across the pipe', text: s.regime1 === 'laminar' ? 'Laminar: parabolic profile — fastest at the centre (2× the mean), zero at the wall.' : 'Turbulent: flatter profile — mixing evens out the speed; it drops sharply only near the wall.' },
        { title: 'Continuity: faster in the narrow part', text: `A₁v₁ = A₂v₂ → v₂ = ${s.v2} (${s.D1} → ${s.D2}).` },
        { title: 'Re in the narrow section', text: `Re₂ = ${s.Re2} → ${s.regime2}. ${s.regime2 !== s.regime1 ? 'The flow changes regime in the constriction!' : 'Same regime as in the wide section.'}` },
      ];
    },
    stepDuration: 4,
    draw(g, S2) {
      const { p, c, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff');
      const f = FLUIDS[p.fluid] || FLUIDS.water; const Re1 = (f.rho * p.v * (p.D / 100)) / f.eta;
      const cy = 205, H1 = 95; const H2 = H1 * p.ratio; const xa = 30, xb = 970;
      const n0 = 400, n1 = 460, n2 = 610, n3 = 670;
      const hh = (x) => { if (x <= n0 || x >= n3) return H1; if (x >= n1 && x <= n2) return H2; const u = x < n1 ? (x - n0) / (n1 - n0) : (n3 - x) / (n3 - n2); return H1 + (H2 - H1) * (0.5 - 0.5 * Math.cos(Math.PI * u)); };
      const ReAt = (x) => Re1 * (H1 / hh(x));
      // pipe walls
      const top = []; const bot = []; for (let x = xa; x <= xb; x += 5) { top.push([x, cy - hh(x)]); bot.push([x, cy + hh(x)]); }
      D.poly(g, [...top, ...bot.slice().reverse()], { fill: p.fluid === 'air' ? '#f1f5f9' : '#dbeafe', close: true, stroke: false });
      D.poly(g, top, { stroke: C.ink, width: 5 }); D.poly(g, bot, { stroke: C.ink, width: 5 });
      // streamline particles
      const V0 = 70; // px/s mean speed in the wide section
      const prof = (s, x) => { const tf = turbFac(ReAt(x)); const lam = 2 * (1 - s * s); const tur = (60 / 49) * Math.pow(Math.max(0, 1 - Math.abs(s)), 1 / 7); return lam * (1 - tf) + tur * tf; };
      const nS = 8; const moving = step >= 0;
      for (let j = 0; j < nS; j++) {
        const s = -0.875 + j * 0.25;
        const xs = []; const ts = [0]; for (let x = xa; x <= xb; x += 6) xs.push(x);
        for (let i = 1; i < xs.length; i++) { const xm = (xs[i] + xs[i - 1]) / 2; const v = V0 * Math.pow(H1 / hh(xm), 2) * prof(s, xm); ts.push(ts[i - 1] + 6 / Math.max(3, v)); }
        const Tt = ts[ts.length - 1];
        if (turbFac(Re1) < 0.5 && step >= 2) D.poly(g, xs.map((x) => [x, cy + s * hh(x)]), { stroke: '#93c5fd', width: 1.5, alpha: 0.9 });
        const np = 9;
        for (let k = 0; k < np; k++) {
          const tau = ((moving ? t : 0) + (k * Tt) / np + hashN(j * 13 + k) * 0.3 * Tt / np) % Tt;
          let lo = 0, hi = ts.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ts[mid] <= tau) lo = mid; else hi = mid; }
          const x = xs[lo] + ((tau - ts[lo]) / Math.max(1e-6, ts[hi] - ts[lo])) * (xs[hi] - xs[lo]);
          const tf = turbFac(ReAt(x)); const burst = tf > 0 && tf < 1 ? (Math.sin(t * 1.3 + j) > 0 ? 1 : 0.3) : 1;
          const wig = tf * burst * 0.32 * (Math.sin(0.045 * x + 3.1 * t + j * 1.7 + k) + 0.6 * Math.sin(0.11 * x - 4.3 * t + k * 2.3 + hashN(j * 7 + k) * 6));
          const ss = clamp(s + wig, -0.93, 0.93); const y = cy + ss * hh(x);
          D.circle(g, x, y, 4.5, { fill: tf > 0.5 ? C.red : tf > 0 ? C.amber : C.blue, alpha: 0.9 });
        }
      }
      // eddies in turbulent parts
      for (let e = 0; e < 14; e++) {
        const ex = xa + 30 + hashN(e + 3) * (xb - xa - 60); const tf = turbFac(ReAt(ex)); if (tf <= 0.2) continue;
        const ey = cy + (hashN(e + 11) - 0.5) * 1.3 * hh(ex); const rr = 10 + hashN(e + 5) * 10; const a0 = t * (3 + e % 3);
        g.save(); g.globalAlpha = 0.6 * tf; g.beginPath(); g.arc(ex, ey, rr, a0, a0 + 4.5); g.strokeStyle = C.red; g.lineWidth = 2.5; g.stroke(); g.restore();
      }
      if (step === 0) D.focus(g, xa, cy - H1, 180, 2 * H1, t);
      if (step === 2) D.focus(g, xa, cy - H1, n0 - xa, 2 * H1, t);
      // labels above
      const s = c.state;
      D.tag(g, `v₁ = ${s.v1}, D₁ = ${s.D1}`, 40, 60, { bg: C.blue, size: 17 });
      if (step >= 4 && p.ratio < 1) {
        D.tag(g, `v₂ = ${s.v2}`, (n1 + n2) / 2, cy - H2 - 26, { bg: C.orange, size: 17, align: 'center' });
        D.text(g, `D₂ = ${s.D2}`, (n1 + n2) / 2, cy + H2 + 22, { size: 16, weight: 800, align: 'center', color: C.orange, halo: true });
        if (step === 4) D.focus(g, n0, cy - H1, n3 - n0, 2 * H1, t);
      }
      D.tag(g, `Q = A·v = ${fmt((Math.PI * (p.D / 100) ** 2 / 4) * p.v * 1000, 3)} L/s`, 960, 60, { bg: C.violet, size: 17, align: 'right' });
      if (step === 0) D.focus(g, 700, 44, 270, 34, t);
      // velocity profile arrows
      if (step >= 3) {
        const px = 150; const tf = turbFac(Re1); const vmax = Math.max(2 * (1 - tf) + (60 / 49) * tf, 1);
        D.line(g, px, cy - H1, px, cy + H1, { color: C.ink, width: 2, dash: [5, 4] });
        const tip = [];
        for (let i = -8; i <= 8; i++) { const sv = i / 9; const len = (95 * prof(sv, px)) / vmax; const y = cy + sv * H1; D.arrow(g, px, y, px + len, y, { color: C.green, width: 2.5, head: 8 }); tip.push([px + len, y]); }
        D.poly(g, [[px, cy - H1], ...tip, [px, cy + H1]], { stroke: C.green, width: 2, dash: [4, 3] });
        D.tag(g, tf < 0.5 ? 'parabolic (laminar)' : 'flat (turbulent)', px + 60, cy + H1 + 24, { bg: C.green, size: 16, align: 'center' });
        if (step === 3) D.focus(g, px - 10, cy - H1, 130, 2 * H1, t);
      }
      // regime bar (log Re 10¹…10⁶)
      const rx0 = 90, rx1 = 910, ry = 408; const lx = (Re) => rx0 + ((Math.log10(clamp(Re, 10, 1e6)) - 1) / 5) * (rx1 - rx0);
      D.text(g, 'Reynolds number Re = ρvD/η (log scale)', rx0, ry - 34, { size: 17, weight: 800, color: step === 1 ? C.violet : C.ink });
      D.rect(g, rx0, ry - 12, lx(2000) - rx0, 24, { fill: '#bbf7d0' }); D.rect(g, lx(2000), ry - 12, lx(4000) - lx(2000), 24, { fill: '#fde68a' }); D.rect(g, lx(4000), ry - 12, rx1 - lx(4000), 24, { fill: '#fecaca' });
      D.text(g, 'laminar', (rx0 + lx(2000)) / 2, ry, { size: 16, weight: 800, color: C.green, align: 'center' });
      D.text(g, 'turbulent', (lx(4000) + rx1) / 2, ry, { size: 16, weight: 800, color: C.red, align: 'center' });
      [10, 100, 1000, 2000, 4000, 1e4, 1e5, 1e6].forEach((v) => { if (v === 2000 || v === 4000) return; D.text(g, v >= 1e4 ? `10${D.sup(Math.round(Math.log10(v)))}` : String(v), lx(v), ry + 28, { size: 16, color: C.muted, align: 'center' }); });
      D.text(g, '2000', lx(2000) - 4, ry + 28, { size: 16, color: C.amber, align: 'right', weight: 800 }); D.text(g, '4000', lx(4000) + 4, ry + 28, { size: 16, color: C.amber, weight: 800 });
      if (step >= 1) {
        D.line(g, lx(Re1), ry - 20, lx(Re1), ry + 14, { color: C.blue, width: 4 });
        D.tag(g, `Re₁ = ${s.Re1}`, clamp(lx(Re1), rx0 + 60, rx1 - 60), ry - 58 + 0, { bg: C.blue, size: 16, align: 'center' });
        if (step === 1) D.focus(g, rx0, ry - 50, rx1 - rx0, 90, t);
      }
      if (step >= 5 && p.ratio < 1) {
        const Re2 = Re1 / p.ratio; D.line(g, lx(Re2), ry - 14, lx(Re2), ry + 20, { color: C.orange, width: 4 });
        D.tag(g, `Re₂ = ${s.Re2} (narrow)`, clamp(lx(Re2), rx0 + 90, rx1 - 90), ry + 60, { bg: C.orange, size: 16, align: 'center' });
        if (step === 5) D.focus(g, rx0, ry - 20, rx1 - rx0, 100, t);
      }
      // bottom line: continuity
      D.text(g, `A₁v₁ = A₂v₂:  ${s.v1} × (${s.D1})² = v₂ × (${s.D2})²  →  v₂ = ${s.v2}`, 500, 530, { size: 17, weight: 800, align: 'center', color: step >= 4 ? C.orange : C.muted });
    },
  };
})();
