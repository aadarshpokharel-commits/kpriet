'use strict';

/* Engineering Physics — Unit 5: Crystal Physics. */
(function () {
  const S = (window.EPSims = window.EPSims || {});
  const D = window.EPDraw;
  const { C, fmt, rad, deg, clamp } = D;
  const lerp = D.lerp; const ease = D.ease;
  const NA = 6.022e23; // Avogadro number (1/mol)
  const RHO_SI = 2329; // density of silicon (kg/m³)

  // ─── small vector helpers (model space: x right, y depth, z up) ───
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = (a) => Math.sqrt(dot(a, a));
  const unit = (a) => { const l = len(a) || 1; return mul(a, 1 / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const vlerp = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

  /** Projector centred on model point ctr. */
  function projAt(view, cx, cy, scale, ctr) {
    const P0 = D.projector(view, cx, cy, scale);
    return (v) => P0([v[0] - ctr[0], v[1] - ctr[1], v[2] - ctr[2]]);
  }
  function lab3(g, P, v, str, o = {}) {
    const q = P(v);
    D.text(g, str, q.x + (o.dx || 0), q.y + (o.dy || 0), { size: o.size || 17, weight: 800, color: o.color || C.ink, align: o.align || 'center', halo: true });
  }
  function seg3(g, P, a, b, o) { const A = P(a); const B = P(b); D.line(g, A.x, A.y, B.x, B.y, o); }
  function arrow3(g, P, a, b, o) { const A = P(a); const B = P(b); D.arrow(g, A.x, A.y, B.x, B.y, o); }
  /** Arc between directions u and v around O (radius r); returns a point for the label. */
  function arc3(g, P, O, u, v, r, color) {
    const uu = unit(u); const vv = unit(v); const pts = [];
    for (let i = 0; i <= 24; i++) { const k = i / 24; const w = unit(add(mul(uu, 1 - k), mul(vv, k))); const q = P(add(O, mul(w, r))); pts.push([q.x, q.y]); }
    D.poly(g, pts, { stroke: color, width: 3 });
    return add(O, mul(unit(add(uu, vv)), r * 1.55));
  }
  /** Parallelepiped edges from origin O with edge vectors A, B, Cv. */
  function edges3(g, P, O, A, B, Cv, o = {}) {
    const v = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]
      .map(([i, j, k]) => P(add(O, add(add(mul(A, i), mul(B, j)), mul(Cv, k)))));
    const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    e.forEach(([i, j]) => D.line(g, v[i].x, v[i].y, v[j].x, v[j].y, { color: o.color || C.ink, width: o.width || 2, dash: o.dash, alpha: o.alpha }));
    return v;
  }
  function faces3(g, P, O, A, B, Cv, fill, alpha) {
    const pt = (i, j, k) => { const q = P(add(O, add(add(mul(A, i), mul(B, j)), mul(Cv, k)))); return [q.x, q.y]; };
    const F = [[[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
      [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]], [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]];
    F.forEach((f) => D.poly(g, f.map((q) => pt(...q)), { fill, alpha, close: true, stroke: false }));
  }
  /** Convex hull of projected points (for clipping atoms to the cell outline). */
  function hull(pts) {
    const p = pts.map((q) => [q.x, q.y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = []; const up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  function panel(g, x, y, w, h, title, o = {}) {
    D.rect(g, x, y, w, h, { fill: o.fill || '#f8fafc', stroke: o.stroke || C.line, width: o.bw || 1.5, r: 12 });
    if (title) D.text(g, title, x + 14, y + 24, { size: 18, weight: 800, color: o.color || C.ink });
  }
  /** Text that shrinks (down to 16 px) to fit a width. */
  function fitText(g, str, x, y, maxW, o = {}) {
    let size = o.size || 18;
    while (size > 16 && D.textWidth(g, str, size, o.weight || 700) > maxW) size -= 1;
    D.text(g, str, x, y, Object.assign({}, o, { size }));
  }
  /** Plot frame with 16 px ticks. */
  function plot(g, x, y, w, h, o) {
    D.rect(g, x, y, w, h, { fill: '#ffffff', stroke: C.line, width: 1.5 });
    const X = (v) => x + ((v - o.xmin) / (o.xmax - o.xmin)) * w; const Y = (v) => y + h - ((v - o.ymin) / (o.ymax - o.ymin)) * h;
    (o.xticks || []).forEach((v) => { D.line(g, X(v), y + h, X(v), y + h + 6, { color: C.faint, width: 1.5 }); D.text(g, o.fx ? o.fx(v) : String(v), X(v), y + h + 18, { size: 16, color: C.muted, align: 'center' }); });
    if (o.xlabel) D.text(g, o.xlabel, x + w, y + h + 40, { size: 16, color: C.muted, align: 'right', weight: 700 });
    if (o.ylabel) D.text(g, o.ylabel, x - 14, y + h / 2, { size: 16, color: C.muted, align: 'center', weight: 700, rotate: -Math.PI / 2 });
    return { X, Y };
  }
  const bar = (n) => (n < 0 ? `${-n}̄` : String(n));

  // ─── Unit cell geometry ───
  function cellVecs(a, b, c, al, be, ga) {
    const ca = Math.cos(rad(al)); const cb = Math.cos(rad(be)); const cg = Math.cos(rad(ga)); const sg = Math.sin(rad(ga)) || 1e-6;
    const root = 1 - ca * ca - cb * cb - cg * cg + 2 * ca * cb * cg;
    const cx = cb; const cy = (ca - cb * cg) / sg; const cz2 = 1 - cx * cx - cy * cy;
    const ok = root > 1e-6;
    const cz = Math.sqrt(Math.max(cz2, 0.0025));
    return { A: [a, 0, 0], B: [b * cg, b * sg, 0], C: [c * cx, c * cy, c * cz], root, ok };
  }
  function classify(a, b, c, al, be, ga) {
    const eq = (x, y) => Math.abs(x - y) < 0.011; const r90 = (x) => Math.abs(x - 90) < 0.5; const aeq = (x, y) => Math.abs(x - y) < 0.5;
    const ab = eq(a, b); const bc = eq(b, c); const ac = eq(a, c);
    if (r90(al) && r90(be) && r90(ga)) { if (ab && bc) return 'Cubic'; if (ab || bc || ac) return 'Tetragonal'; return 'Orthorhombic'; }
    if (r90(al) && r90(be) && Math.abs(ga - 120) < 0.5 && ab) return 'Hexagonal';
    if (ab && bc && aeq(al, be) && aeq(be, ga)) return 'Trigonal (rhombohedral)';
    if (r90(al) && r90(ga) && !r90(be)) return 'Monoclinic';
    return 'Triclinic';
  }
  function relations(a, b, c, al, be, ga) {
    const e = (x, y) => (Math.abs(x - y) < 0.011 ? '=' : '≠'); const ea = (x, y) => (Math.abs(x - y) < 0.5 ? '=' : '≠');
    return { len: `a ${e(a, b)} b ${e(b, c)} c`, ang: `α ${ea(al, be)} β ${ea(be, ga)} γ` };
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Unit Cell 3D Visualizer
  // ─────────────────────────────────────────────────────────────
  S['ep-unit-cell'] = {
    view3d: true,
    approx: 'Atoms are drawn only at the lattice points (corners), with a small fixed radius so that the cell edges stay visible. The shape (lengths and angles) is drawn to scale.',
    params: [
      { key: 'a', label: 'Axial length a', type: 'range', min: 1, max: 12, step: 0.01, default: 4, unit: 'Å', help: 'Edge of the unit cell along the X axis.' },
      { key: 'b', label: 'Axial length b', type: 'range', min: 1, max: 12, step: 0.01, default: 5, unit: 'Å' },
      { key: 'c', label: 'Axial length c', type: 'range', min: 1, max: 12, step: 0.01, default: 6, unit: 'Å' },
      { key: 'al', label: 'Interaxial angle α (between b and c)', type: 'range', min: 40, max: 140, step: 0.5, default: 90, unit: '°' },
      { key: 'be', label: 'Interaxial angle β (between a and c)', type: 'range', min: 40, max: 140, step: 0.5, default: 90, unit: '°' },
      { key: 'ga', label: 'Interaxial angle γ (between a and b)', type: 'range', min: 40, max: 140, step: 0.5, default: 90, unit: '°' },
      { key: 'showAtoms', label: 'Show atoms', type: 'toggle', default: true },
      { key: 'showCell', label: 'Show unit cell', type: 'toggle', default: true },
      { key: 'repeat', label: 'Repeat cell (2 × 2 × 2 lattice)', type: 'toggle', default: false },
    ],
    examples: [
      { label: 'Cubic — copper cell (a = 3.615 Å)', values: { a: 3.615, b: 3.615, c: 3.615, al: 90, be: 90, ga: 90 } },
      { label: 'Tetragonal — rutile TiO₂ (a = 4.594, c = 2.959 Å)', values: { a: 4.594, b: 4.594, c: 2.959, al: 90, be: 90, ga: 90 } },
      { label: 'Orthorhombic — aragonite CaCO₃', values: { a: 4.96, b: 7.97, c: 5.74, al: 90, be: 90, ga: 90 } },
      { label: 'Monoclinic — β-sulfur (β = 96.7°)', values: { a: 10.9, b: 10.96, c: 11.02, al: 90, be: 96.7, ga: 90 } },
      { label: 'Triclinic — CuSO₄·5H₂O', values: { a: 6.12, b: 10.7, c: 5.97, al: 82.3, be: 107.4, ga: 102.6 } },
      { label: 'Hexagonal — magnesium (a = 3.21, c = 5.21 Å)', values: { a: 3.21, b: 3.21, c: 5.21, al: 90, be: 90, ga: 120 } },
    ],
    validate(p) {
      const v = cellVecs(p.a, p.b, p.c, p.al, p.be, p.ga);
      return v.ok ? [] : [`Impossible angle set: 1 − cos²α − cos²β − cos²γ + 2cosα·cosβ·cosγ = ${v.root.toFixed(4)} ≤ 0, so no real cell exists (e.g. one angle is larger than the sum of the other two).`];
    },
    compute(p) {
      const v = cellVecs(p.a, p.b, p.c, p.al, p.be, p.ga);
      const V = v.ok ? p.a * p.b * p.c * Math.sqrt(v.root) : 0;
      const sys = classify(p.a, p.b, p.c, p.al, p.be, p.ga); const rel = relations(p.a, p.b, p.c, p.al, p.be, p.ga);
      const given = `a = ${p.a} Å, b = ${p.b} Å, c = ${p.c} Å, α = ${p.al}°, β = ${p.be}°, γ = ${p.ga}°`;
      const formulas = [
        { name: 'Volume of the unit cell', formula: 'V = abc √(1 − cos²α − cos²β − cos²γ + 2 cosα cosβ cosγ)', given,
          calc: `V = ${p.a} × ${p.b} × ${p.c} × √(${v.root.toFixed(4)})`, result: v.ok ? fmt(V, 4) : 'No real cell (value under √ ≤ 0)', unit: v.ok ? 'Å³' : '—' },
        { name: 'Volume in SI units', formula: '1 Å = 10⁻¹⁰ m  ⇒  1 Å³ = 10⁻³⁰ m³', given: `V = ${fmt(V, 4)} Å³`, calc: `V = ${fmt(V, 4)} × 10⁻³⁰ m³`, result: v.ok ? fmt(V * 1e-30, 4) : '—', unit: 'm³' },
        { name: 'Crystal system', formula: 'Compare the axial lengths and the interaxial angles', given, calc: `${rel.len};  ${rel.ang}`, result: sys, unit: '—' },
      ];
      const readouts = [
        { label: 'Crystal system', value: sys, tone: 'info' },
        { label: 'Cell volume V', value: v.ok ? `${fmt(V, 4)} Å³` : 'impossible', tone: v.ok ? 'good' : 'bad' },
        { label: 'Lengths', value: rel.len },
        { label: 'Angles', value: rel.ang },
      ];
      return {
        formulas, readouts,
        state: { a: `${p.a} Å`, b: `${p.b} Å`, c: `${p.c} Å`, alpha: `${p.al}°`, beta: `${p.be}°`, gamma: `${p.ga}°`, crystalSystem: sys, volume: v.ok ? `${fmt(V, 4)} Å³` : 'impossible angle set', validCell: v.ok, repeated: Boolean(p.repeat) },
        explain: {
          what: v.ok ? `The unit cell has edges a = ${p.a} Å, b = ${p.b} Å, c = ${p.c} Å and angles α = ${p.al}°, β = ${p.be}°, γ = ${p.ga}°. Its volume is ${fmt(V, 4)} Å³ and it belongs to the ${sys} system.` : 'These three angles cannot form a real parallelepiped — the cell collapses, so no volume exists.',
          why: 'A unit cell is the smallest repeating block of a crystal. Six lattice parameters (three edge lengths and three angles) fix its shape completely; stacking copies of it by translation builds the whole crystal.',
          param: 'Axial lengths a, b, c (Å) and interaxial angles α (b–c), β (a–c), γ (a–b).',
          effect: 'Longer edges increase the volume in proportion. Angles away from 90° tilt the cell (V gets smaller); equal lengths and special angles (90°, 120°) change the crystal system.',
        },
      };
    },
    steps(p, c) {
      const ok = c.state.validCell;
      return [
        { title: 'Lattice parameters a, b, c', text: `Three edge vectors start at one corner: a = ${p.a} Å (X), b = ${p.b} Å, c = ${p.c} Å.` },
        { title: 'Interaxial angles α, β, γ', text: `α = ${p.al}° lies between b and c, β = ${p.be}° between a and c, γ = ${p.ga}° between a and b.` },
        { title: 'Complete the unit cell', text: ok ? `The three vectors span a parallelepiped with a lattice point (atom) at each of its 8 corners — a ${c.state.crystalSystem} cell.` : 'These angles cannot close a real cell — check the warning.' },
        { title: 'Volume of the unit cell', text: ok ? `V = abc√(1 − cos²α − cos²β − cos²γ + 2cosα cosβ cosγ) = ${c.state.volume}.` : 'The value under the square root is ≤ 0, so V has no real value.' },
        { title: 'Repeat by translation → crystal lattice', text: 'Copies of the cell shifted by whole multiples of a, b and c fill space without gaps — this is the crystal lattice.' },
      ];
    },
    draw(g, S2) {
      const { p, c, step, st, t, dur, view } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff');
      const v = cellVecs(p.a, p.b, p.c, p.al, p.be, p.ga); const A = v.A; const B = v.B; const Cv = v.C;
      const O = [0, 0, 0]; const ABC = add(add(A, B), Cv);
      const pt = (i, j, k) => add(add(mul(A, i), mul(B, j)), mul(Cv, k));
      const fitR = (n) => { const ctr = mul(ABC, n / 2); let R = 0; for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) for (let k = 0; k <= n; k++) R = Math.max(R, len(sub(pt(i, j, k), ctr))); return { ctr, R }; };
      const f1 = fitR(1); const f2 = fitR(2);
      const kRep = p.repeat ? 1 : step === 4 ? ease(prog) : 0;
      const R = lerp(f1.R, f2.R, kRep); const ctr = vlerp(f1.ctr, f2.ctr, kRep);
      const Rn = Math.max(R, 0.1); const scale = 205 / Rn;
      const P0 = D.projector(view, 320, 295, 205);
      const P = (q) => P0(mul(sub(q, ctr), 1 / Rn)); // normalised model so perspective is size-independent
      D.text(g, 'Unit cell — lattice parameters a, b, c, α, β, γ', 20, 26, { size: 20, weight: 800 });
      const showRep = (p.repeat && step >= 2) || step === 4;
      const minE = Math.min(p.a, p.b, p.c);
      // repeated lattice
      if (showRep) {
        const cells = []; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) if (i + j + k) cells.push([i, j, k]);
        cells.forEach((q, idx) => {
          const f = step === 4 && !p.repeat ? clamp(prog * 9 - idx - 1, 0, 1) : 1; if (f <= 0) return;
          if (p.showCell) edges3(g, P, pt(...q), A, B, Cv, { color: C.faint, width: 1.5, alpha: f });
        });
        if (p.showAtoms) {
          const at = [];
          for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) for (let k = 0; k <= 2; k++) {
            const inFirst = i <= 1 && j <= 1 && k <= 1; if (inFirst) continue;
            const idx = Math.max(0, (i === 2 ? 1 : 0) + (j === 2 ? 2 : 0) + (k === 2 ? 4 : 0));
            const f = step === 4 && !p.repeat ? clamp(prog * 9 - idx, 0, 1) : 1; if (f <= 0) continue;
            at.push({ p: pt(i, j, k), r: 0.1 * minE * f, color: '#60a5fa', alpha: 0.8 });
          }
          D.atoms3(g, P, at, scale);
        }
        if (step === 4) {
          arrow3(g, P, pt(0.5, 0.5, 0.5), pt(1.5, 0.5, 0.5), { color: C.red, width: 3 });
          arrow3(g, P, pt(0.5, 0.5, 0.5), pt(0.5, 1.5, 0.5), { color: C.green, width: 3 });
          arrow3(g, P, pt(0.5, 0.5, 0.5), pt(0.5, 0.5, 1.5), { color: C.blue, width: 3 });
          D.tag(g, 'T = n₁a + n₂b + n₃c  (n₁, n₂, n₃ integers)', 320, 525, { bg: C.violet, size: 17, align: 'center' });
        }
      }
      if (step >= 3 && v.ok) faces3(g, P, O, A, B, Cv, C.blue, 0.07);
      if (step >= 2 && p.showCell) edges3(g, P, O, A, B, Cv, { color: C.ink, width: 2.5, alpha: 0.85 });
      if (step >= 2 && p.showAtoms) {
        const at = []; for (let i = 0; i <= 1; i++) for (let j = 0; j <= 1; j++) for (let k = 0; k <= 1; k++) at.push({ p: pt(i, j, k), r: 0.1 * minE * (step === 2 ? ease(clamp(prog * 1.5, 0, 1)) : 1), color: C.blue, alpha: 0.85 });
        D.atoms3(g, P, at, scale);
      }
      if (step >= 2 && p.showCell) edges3(g, P, O, A, B, Cv, { color: C.ink, width: 2.5, alpha: 0.55 });
      // edge vectors a, b, c
      const f0 = step === 0 ? ease(prog) : 1;
      const vecs = [[A, C.red, `a = ${p.a} Å`], [B, C.green, `b = ${p.b} Å`], [Cv, C.blue, `c = ${p.c} Å`]];
      vecs.forEach(([E, col]) => { if (f0 > 0.02) arrow3(g, P, O, mul(E, f0), { color: col, width: 4.5, head: 15 }); });
      if (f0 >= 1 && step < 4) {
        const q0 = P(O);
        vecs.forEach(([E, col, s]) => { const q = P(E); const dx = q.x - q0.x; const dy = q.y - q0.y; const l = Math.hypot(dx, dy) || 1; D.tag(g, s, q.x + (dx / l) * 34, q.y + (dy / l) * 22, { bg: col, size: 17, align: 'center' }); });
      }
      if (step === 0) { const q = P(O); D.focus(g, q.x - 30, q.y - 30, 60, 60, t); }
      // angles
      if (step >= 1 && step < 4) {
        const r = 0.3 * minE;
        const la = arc3(g, P, O, B, Cv, r, C.violet); const lb = arc3(g, P, O, A, Cv, r, C.orange); const lg = arc3(g, P, O, A, B, r, C.pink);
        lab3(g, P, la, `α = ${p.al}°`, { color: C.violet }); lab3(g, P, lb, `β = ${p.be}°`, { color: C.orange }); lab3(g, P, lg, `γ = ${p.ga}°`, { color: C.pink });
      }
      if (!v.ok) D.tag(g, 'Impossible angle set — no real cell (value under √ ≤ 0)', 320, 490, { bg: C.red, size: 18, align: 'center' });
      else if (step === 3) D.tag(g, `V = ${c.state.volume}`, 320, 490, { bg: C.blue, size: 22, align: 'center' });
      // right panel
      const x0 = 650; panel(g, x0, 50, 330, 470, 'Crystal system');
      D.text(g, c.state.crystalSystem, x0 + 14, 104, { size: 22, weight: 800, color: C.blue });
      const rel = relations(p.a, p.b, p.c, p.al, p.be, p.ga);
      const rowsL = [
        ['Lengths', `a = ${p.a},  b = ${p.b},  c = ${p.c} Å`, step >= 0],
        ['', rel.len, step >= 0],
        ['Angles', `α = ${p.al}°,  β = ${p.be}°,  γ = ${p.ga}°`, step >= 1],
        ['', rel.ang, step >= 1],
        ['Volume', v.ok ? `V = ${c.state.volume}` : 'impossible (√ of a negative)', step >= 3],
        ['Lattice', 'Translation T = n₁a + n₂b + n₃c', step >= 4],
      ];
      let y = 144;
      rowsL.forEach(([l, val, on]) => {
        if (l) { D.text(g, l, x0 + 14, y, { size: 16, color: C.muted, weight: 700 }); y += 24; }
        fitText(g, on ? val : '…', x0 + 14, y, 300, { size: 18, weight: 800, color: on ? C.ink : C.faint }); y += l ? 36 : 40;
      });
      D.text(g, 'Drag to rotate · wheel / ± to zoom', x0 + 14, 500, { size: 16, color: C.muted });
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 2–4. SC, BCC, FCC (shared factory)
  // ─────────────────────────────────────────────────────────────
  const CORNERS = []; for (let i = 0; i <= 1; i++) for (let j = 0; j <= 1; j++) for (let k = 0; k <= 1; k++) CORNERS.push([i, j, k]);
  const FACES = [[0.5, 0.5, 0], [0.5, 0.5, 1], [0.5, 0, 0.5], [0.5, 1, 0.5], [0, 0.5, 0.5], [1, 0.5, 0.5]];
  const CUBIC = {
    sc: { name: 'Simple cubic (SC)', n: 1, cn: 6, rf: 0.5, rTxt: 'r = a/2', rel: 'a = 2r', along: 'cube edge', apfTxt: 'π/6', nTxt: 'n = 8 × ⅛ = 1',
      atoms: CORNERS.map((q) => ({ p: q, type: 'corner' })) },
    bcc: { name: 'Body-centred cubic (BCC)', n: 2, cn: 8, rf: Math.sqrt(3) / 4, rTxt: 'r = √3·a/4', rel: '√3·a = 4r', along: 'body diagonal', apfTxt: '√3π/8', nTxt: 'n = 8 × ⅛ + 1 = 2',
      atoms: CORNERS.map((q) => ({ p: q, type: 'corner' })).concat([{ p: [0.5, 0.5, 0.5], type: 'body' }]) },
    fcc: { name: 'Face-centred cubic (FCC)', n: 4, cn: 12, rf: Math.sqrt(2) / 4, rTxt: 'r = √2·a/4', rel: '√2·a = 4r', along: 'face diagonal', apfTxt: 'π/(3√2)', nTxt: 'n = 8 × ⅛ + 6 × ½ = 4',
      atoms: CORNERS.map((q) => ({ p: q, type: 'corner' })).concat(FACES.map((q) => ({ p: q, type: 'face' }))) },
  };
  const TYPE_COL = { corner: C.blue, body: C.red, face: C.green };
  const TYPE_FRAC = { corner: '⅛', body: '1', face: '½' };
  // nearest-neighbour picture: reference atom and its neighbours (ghosts lie outside the cell)
  const NEIGH = {
    sc: { ref: [1, 0, 1], nb: [[0, 0, 1], [1, 1, 1], [1, 0, 0], [2, 0, 1], [1, -1, 1], [1, 0, 2]], zoom: 0.62 },
    bcc: { ref: [0.5, 0.5, 0.5], nb: CORNERS, zoom: 1 },
    fcc: { ref: [0.5, 0.5, 1], nb: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1], [0.5, 0, 0.5], [0.5, 1, 0.5], [0, 0.5, 0.5], [1, 0.5, 0.5], [0.5, 0, 1.5], [0.5, 1, 1.5], [0, 0.5, 1.5], [1, 0.5, 1.5]], zoom: 0.74 },
  };
  const TOUCH = { sc: [[0, 0, 1], [1, 0, 1]], bcc: [[0, 0, 0], [1, 1, 1]], fcc: [[0, 0, 0], [1, 0, 1]] };

  function cubicCalc(kind, p) {
    const k = CUBIC[kind]; const r = k.rf * p.a; const apf = (k.n * (4 / 3) * Math.PI * Math.pow(k.rf, 3));
    const aCm = p.a * 1e-8; const Vc = aCm * aCm * aCm; const mass = (k.n * p.M) / NA; const rho = mass / Vc;
    return { r, apf, Vc, mass, rho, nn: 2 * r };
  }

  function cubicSim(kind, examples) {
    const k = CUBIC[kind];
    return {
      view3d: true,
      approx: 'Hard-sphere model: atoms are rigid spheres that just touch along the ' + k.along + '. Density uses the ideal cell (no vacancies or impurities).',
      modes: [{ key: 'points', label: 'Lattice points (small atoms)' }, { key: 'hard', label: 'Hard-sphere (touching) model' }, { key: 'cut', label: 'Atoms cut by the cell' }],
      params: [
        { key: 'a', label: 'Lattice constant a', type: 'range', min: 2, max: 6, step: 0.005, default: examples[0].values.a, unit: 'Å', help: 'Edge length of the cubic unit cell.' },
        { key: 'M', label: 'Atomic mass M', type: 'range', min: 1, max: 250, step: 0.01, default: examples[0].values.M, unit: 'g/mol' },
        { key: 'showAtoms', label: 'Show atoms', type: 'toggle', default: true },
        { key: 'showCell', label: 'Show unit cell', type: 'toggle', default: true },
      ],
      examples,
      validate: () => [],
      compute(p) {
        const q = cubicCalc(kind, p);
        const formulas = [
          { name: 'Atoms per unit cell', formula: kind === 'sc' ? 'n = N_corner/8' : kind === 'bcc' ? 'n = N_corner/8 + N_body' : 'n = N_corner/8 + N_face/2',
            given: kind === 'sc' ? '8 corner atoms, each shared by 8 cells' : kind === 'bcc' ? '8 corner atoms (shared by 8 cells) + 1 body atom (not shared)' : '8 corner atoms (shared by 8) + 6 face atoms (shared by 2)',
            calc: k.nTxt, result: String(k.n), unit: 'atoms / cell' },
          { name: 'Atomic radius (atoms touch along the ' + k.along + ')', formula: `${k.rel}  ⇒  ${k.rTxt}`, given: `a = ${p.a} Å`, calc: `r = ${fmt(k.rf, 4)} × ${p.a}`, result: fmt(q.r, 4), unit: 'Å' },
          { name: 'Coordination number', formula: 'CN = number of nearest neighbours', given: `nearest-neighbour distance 2r = ${fmt(q.nn, 4)} Å`, calc: kind === 'sc' ? '±a along X, Y, Z → 6' : kind === 'bcc' ? 'body atom touches the 8 corners → 8' : '4 in its plane + 4 above + 4 below → 12', result: String(k.cn), unit: '—' },
          { name: 'Atomic packing factor', formula: 'APF = n × (4/3)πr³ / a³', given: `n = ${k.n}, ${k.rTxt}`, calc: `APF = ${k.apfTxt}`, result: fmt(q.apf, 3), unit: '— (fraction of volume filled)' },
          { name: 'Density', formula: 'ρ = nM / (N_A a³)', given: `n = ${k.n}, M = ${p.M} g/mol, N_A = 6.022 × 10²³ /mol, a = ${p.a} Å = ${fmt(p.a * 1e-8, 4)} cm`,
            calc: `ρ = ${k.n} × ${p.M} / (6.022 × 10²³ × ${fmt(q.Vc, 4)} cm³)`, result: `${fmt(q.rho, 4)} g/cm³ = ${fmt(q.rho * 1000, 4)}`, unit: 'kg/m³' },
        ];
        const readouts = [
          { label: 'Atoms / cell n', value: String(k.n), tone: 'info' },
          { label: 'Coordination no.', value: String(k.cn) },
          { label: 'Radius r', value: `${fmt(q.r, 4)} Å` },
          { label: 'APF', value: fmt(q.apf, 3), tone: 'good' },
          { label: 'Density ρ', value: `${fmt(q.rho, 4)} g/cm³` },
        ];
        return {
          formulas, readouts,
          state: { structure: k.name, latticeConstant: `${p.a} Å`, atomicMass: `${p.M} g/mol`, atomsPerCell: k.n, coordinationNumber: k.cn, atomicRadius: `${fmt(q.r, 4)} Å`, APF: fmt(q.apf, 3), density: `${fmt(q.rho, 4)} g/cm³`, model: p.mode },
          explain: {
            what: `${k.name}: ${k.nTxt.replace('n = ', '')} atoms per cell, each atom has ${k.cn} nearest neighbours, r = ${fmt(q.r, 4)} Å and ${fmt(q.apf * 100, 3)} % of the cell volume is filled. With M = ${p.M} g/mol the density is ${fmt(q.rho, 4)} g/cm³.`,
            why: `Atoms touch along the ${k.along} (${k.rel}), so r is fixed by a. The packing factor depends only on the arrangement, not on a; the density needs both the mass in the cell (nM/N_A) and its volume a³.`,
            param: 'Lattice constant a (Å), atomic mass M (g/mol) and the display model.',
            effect: 'Larger a → larger atoms (r ∝ a) and much lower density (ρ ∝ 1/a³). Larger M → proportionally higher density. APF and CN never change for a given structure.',
          },
        };
      },
      steps(p, c) {
        const st = c.state;
        return [
          { title: kind === 'sc' ? 'Atoms at the 8 corners' : kind === 'bcc' ? 'Atoms at the corners and the body centre' : 'Atoms at the corners and the 6 face centres', text: `Build the cubic cell of edge a = ${p.a} Å.` },
          { title: 'Count the atoms per unit cell', text: `A corner atom is shared by 8 cells${kind === 'fcc' ? ', a face atom by 2' : ''}${kind === 'bcc' ? ', the body atom belongs to this cell only' : ''}: ${k.nTxt}.` },
          { title: 'Relation between a and r', text: `The atoms touch along the ${k.along}: ${k.rel}, so ${k.rTxt} = ${st.atomicRadius}.` },
          { title: `Coordination number = ${k.cn}`, text: `Each atom has ${k.cn} nearest neighbours at distance 2r = ${fmt(2 * cubicCalc(kind, p).r, 4)} Å (highlighted).` },
          { title: `Atomic packing factor = ${st.APF}`, text: `APF = n(4/3)πr³/a³ = ${k.apfTxt} = ${st.APF}: ${fmt(Number(st.APF) * 100, 3)} % of the space is filled by atoms.` },
          { title: `Density ρ = ${st.density}`, text: `ρ = nM/(N_A a³) = ${k.n} × ${p.M} / (6.022×10²³ × (${p.a}×10⁻⁸ cm)³) = ${st.density}.` },
        ];
      },
      draw(g, S2) {
        const { p, step, st, t, dur, view } = S2; const prog = clamp(st / dur, 0, 1);
        D.clear(g, '#ffffff');
        const q = cubicCalc(kind, p); const nb = NEIGH[kind];
        const zk = step === 3 ? lerp(1, nb.zoom, ease(Math.min(1, prog * 2))) : 1;
        const scale = 225 * zk; const P = projAt(view, 320, 290, scale, [0.5, 0.5, 0.5]);
        const modeLbl = { points: 'lattice points', hard: 'hard-sphere model', cut: 'atoms cut by the cell' }[p.mode] || '';
        D.text(g, `${k.name} — ${modeLbl}`, 20, 26, { size: 20, weight: 800 });
        let rr = p.mode === 'points' ? 0.08 : k.rf;
        if (step === 4 && p.mode === 'points') rr = lerp(0.08, k.rf, ease(prog));
        const cut = p.mode === 'cut';
        const cubeV = CORNERS.map((v) => P(v));
        if (p.showCell) D.cube3(g, P, 1, { color: C.faint, width: 1.5 });
        const hiRef = step === 3; const touch = TOUCH[kind];
        const onTouch = (a) => step === 2 && len(cross(sub(a, touch[0]), sub(touch[1], touch[0]))) < 1e-6 && dot(sub(a, touch[0]), sub(touch[1], touch[0])) >= -1e-9 && len(sub(a, touch[0])) <= len(sub(touch[1], touch[0])) + 1e-9;
        const list = k.atoms.map((a, i) => {
          let appear = 1;
          if (step === 0) appear = a.type === 'corner' ? clamp(prog * 2.2 - i * 0.12, 0, 1) : clamp(prog * 2.2 - 1.1, 0, 1);
          const isRef = hiRef && len(sub(a.p, nb.ref)) < 1e-6; const isNb = hiRef && nb.nb.some((n) => len(sub(n, a.p)) < 1e-6);
          let color = TYPE_COL[a.type]; let alpha = rr > 0.2 ? 0.78 : 1;
          if (hiRef) { color = isRef ? C.red : isNb ? C.amber : color; alpha = isRef || isNb ? 0.9 : 0.25; }
          if (onTouch(a.p)) color = C.orange;
          return { p: a.p, r: rr * ease(appear), color, alpha };
        }).filter((a) => a.r > 0.001);
        if (p.showAtoms) {
          if (cut) { g.save(); const h = hull(cubeV); g.beginPath(); h.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip(); D.atoms3(g, P, list, scale); g.restore(); }
          else D.atoms3(g, P, list, scale);
        } else list.forEach((a) => { const s = P(a.p); D.circle(g, s.x, s.y, 4.5, { fill: a.color }); });
        if (hiRef) {
          const ref = nb.ref; const fr = clamp(prog * 2 - 0.3, 0, 1);
          const ghosts = nb.nb.filter((n) => n.some((x) => x < 0 || x > 1)).map((n) => ({ p: n, r: (p.mode === 'points' ? 0.08 : k.rf) * fr, color: C.amber, alpha: 0.45 }));
          if (p.showAtoms && fr > 0) D.atoms3(g, P, ghosts, scale);
          if (fr > 0) nb.nb.forEach((n) => seg3(g, P, ref, vlerp(ref, n, fr), { color: C.red, width: 2.5, dash: [6, 5] }));
          const rq = P(ref); D.tag(g, `CN = ${k.cn}`, rq.x + 20, rq.y - 36, { bg: C.red, size: 20 });
        }
        if (p.showCell) D.cube3(g, P, 1, { color: C.ink, width: 2.5, alpha: 0.75 });
        if (step === 1 || (cut && step >= 1 && step !== 3)) {
          k.atoms.forEach((a) => { const pos = add(a.p, mul(sub([0.5, 0.5, 0.5], a.p), 0.28)); lab3(g, P, pos, TYPE_FRAC[a.type], { size: 20, color: shadeFor(a.type) }); });
        }
        if (step === 2) {
          const f = ease(prog); const A1 = vlerp(touch[0], touch[1], f);
          seg3(g, P, touch[0], A1, { color: C.orange, width: 5 });
          const m = P(vlerp(touch[0], touch[1], 0.5));
          D.circle(g, m.x, m.y, 5, { fill: C.orange });
          D.tag(g, `Atoms touch along the ${k.along}:  ${k.rel}  →  r = ${fmt(q.r, 4)} Å`, 320, 525, { bg: C.orange, size: 18, align: 'center' });
        }
        if (step === 0) D.tag(g, `a = ${p.a} Å`, 320, 525, { bg: C.ink, size: 20, align: 'center' });
        if (step === 1) D.tag(g, `${k.nTxt} atom${k.n > 1 ? 's' : ''} per cell`, 320, 525, { bg: C.blue, size: 20, align: 'center' });
        if (step === 4) D.tag(g, `APF = ${k.apfTxt} = ${fmt(q.apf, 3)}  →  ${fmt(q.apf * 100, 3)} % filled`, 320, 525, { bg: C.green, size: 20, align: 'center' });
        if (step === 5) {
          D.tag(g, `mass in cell = nM/N_A = ${fmt(q.mass, 4)} g`, 320, 485, { bg: C.violet, size: 18, align: 'center' });
          D.tag(g, `V = a³ = ${fmt(q.Vc, 4)} cm³   →   ρ = ${fmt(q.rho, 4)} g/cm³`, 320, 527, { bg: C.blue, size: 18, align: 'center' });
        }
        const x0 = 650; panel(g, x0, 44, 330, 496, 'Properties');
        const rows = [
          ['Atoms per unit cell', k.nTxt, 1, C.blue],
          [`Atomic radius (${k.along})`, `${k.rTxt} = ${fmt(q.r, 4)} Å`, 2, C.orange],
          ['Coordination number', `CN = ${k.cn}`, 3, C.red],
          ['Atomic packing factor', `APF = ${k.apfTxt} = ${fmt(q.apf, 3)}`, 4, C.green],
          ['Density ρ = nM/(N_A a³)', `ρ = ${fmt(q.rho, 4)} g/cm³`, 5, C.violet],
        ];
        let y = 100;
        rows.forEach(([l, v, s, col]) => {
          if (step === s) D.rect(g, x0 + 6, y - 16, 318, 64, { fill: '#fef9c3', stroke: C.hi, width: 2, r: 8 });
          D.text(g, l, x0 + 16, y, { size: 16, color: C.muted, weight: 700 });
          fitText(g, step >= s ? v : '?', x0 + 16, y + 26, 300, { size: 20, weight: 800, color: step >= s ? col : C.faint });
          y += 68;
        });
        y += 2; D.text(g, 'Atoms:', x0 + 16, y, { size: 16, weight: 800 });
        const leg = [['corner', 'corner — shared by 8 (⅛)']].concat(kind === 'bcc' ? [['body', 'body centre — 1 whole']] : kind === 'fcc' ? [['face', 'face centre — shared by 2 (½)']] : []);
        leg.forEach(([ty, s], i) => { D.atom(g, x0 + 30, y + 28 + i * 28, 9, TYPE_COL[ty]); D.text(g, s, x0 + 46, y + 28 + i * 28, { size: 16, color: C.muted }); });
        if (step === 0) D.focus(g, x0 + 10, y - 14, 310, 28 + leg.length * 28, t);
      },
    };
  }
  function shadeFor(type) { return type === 'corner' ? '#1e3a8a' : type === 'face' ? '#14532d' : '#7f1d1d'; }

  S['ep-simple-cubic'] = cubicSim('sc', [
    { label: 'Polonium α-Po (a = 3.35 Å, M = 209 g/mol)', values: { a: 3.35, M: 209, mode: 'points' } },
    { label: 'Polonium — hard-sphere model', values: { a: 3.35, M: 209, mode: 'hard' } },
    { label: 'Polonium — atoms cut by the cell (⅛ each)', values: { a: 3.35, M: 209, mode: 'cut' } },
  ]);
  S['ep-bcc'] = cubicSim('bcc', [
    { label: 'α-Iron (a = 2.87 Å, M = 55.85 g/mol)', values: { a: 2.87, M: 55.85 } },
    { label: 'Sodium (a = 4.29 Å, M = 22.99 g/mol)', values: { a: 4.29, M: 22.99 } },
    { label: 'Chromium (a = 2.91 Å, M = 52.00 g/mol)', values: { a: 2.91, M: 52.0 } },
    { label: 'Tungsten (a = 3.165 Å, M = 183.84 g/mol)', values: { a: 3.165, M: 183.84 } },
  ]);
  S['ep-fcc'] = cubicSim('fcc', [
    { label: 'Copper (a = 3.615 Å, M = 63.55 g/mol)', values: { a: 3.615, M: 63.55 } },
    { label: 'Aluminium (a = 4.05 Å, M = 26.98 g/mol)', values: { a: 4.05, M: 26.98 } },
    { label: 'Gold (a = 4.078 Å, M = 196.97 g/mol)', values: { a: 4.078, M: 196.97 } },
    { label: 'Silver (a = 4.086 Å, M = 107.87 g/mol)', values: { a: 4.086, M: 107.87 } },
  ]);

  // ─────────────────────────────────────────────────────────────
  // 5. Bravais Lattice Visualizer
  // ─────────────────────────────────────────────────────────────
  const SYSTEMS = [
    { key: 'cubic', name: 'Cubic', rel: 'a = b = c', ang: 'α = β = γ = 90°', lat: ['P', 'I', 'F'], abc: [1, 1, 1], ang3: [90, 90, 90] },
    { key: 'tetra', name: 'Tetragonal', rel: 'a = b ≠ c', ang: 'α = β = γ = 90°', lat: ['P', 'I'], abc: [1, 1, 1.45], ang3: [90, 90, 90] },
    { key: 'ortho', name: 'Orthorhombic', rel: 'a ≠ b ≠ c', ang: 'α = β = γ = 90°', lat: ['P', 'I', 'C', 'F'], abc: [0.8, 1.05, 1.35], ang3: [90, 90, 90] },
    { key: 'hex', name: 'Hexagonal', rel: 'a = b ≠ c', ang: 'α = β = 90°, γ = 120°', lat: ['P'], abc: [1, 1, 1.6], ang3: [90, 90, 120] },
    { key: 'trig', name: 'Trigonal (rhombohedral)', rel: 'a = b = c', ang: 'α = β = γ ≠ 90° (< 120°)', lat: ['R'], abc: [1, 1, 1], ang3: [70, 70, 70] },
    { key: 'mono', name: 'Monoclinic', rel: 'a ≠ b ≠ c', ang: 'α = γ = 90° ≠ β', lat: ['P', 'C'], abc: [0.85, 1.1, 1.3], ang3: [90, 110, 90] },
    { key: 'tri', name: 'Triclinic', rel: 'a ≠ b ≠ c', ang: 'α ≠ β ≠ γ ≠ 90°', lat: ['P'], abc: [0.9, 1.1, 1.3], ang3: [80, 105, 95] },
  ];
  const CENTRING = {
    P: { name: 'Primitive (P)', extra: [], n: '8 × ⅛ = 1', count: 1, what: 'lattice points only at the 8 corners' },
    R: { name: 'Rhombohedral primitive (R)', extra: [], n: '8 × ⅛ = 1', count: 1, what: 'lattice points only at the 8 corners' },
    I: { name: 'Body-centred (I)', extra: [[0.5, 0.5, 0.5]], n: '8 × ⅛ + 1 = 2', count: 2, what: 'one extra point at the body centre' },
    F: { name: 'Face-centred (F)', extra: FACES, n: '8 × ⅛ + 6 × ½ = 4', count: 4, what: 'one extra point at the centre of each of the 6 faces' },
    C: { name: 'Base-centred (C)', extra: [[0.5, 0.5, 0], [0.5, 0.5, 1]], n: '8 × ⅛ + 2 × ½ = 2', count: 2, what: 'extra points at the centres of the two opposite (a–b) faces' },
  };
  const LAT_LABEL = { P: 'P (simple)', I: 'I (body-centred)', F: 'F (face-centred)', C: 'C (base-centred)', R: 'R (rhombohedral)' };
  const BRAVAIS = []; SYSTEMS.forEach((s) => s.lat.forEach((l) => BRAVAIS.push({ value: `${s.key}-${l}`, label: `${s.name} — ${LAT_LABEL[l]}`, sys: s, l })));
  const findBravais = (v) => BRAVAIS.find((b) => b.value === v) || BRAVAIS[0];

  S['ep-bravais'] = {
    view3d: true,
    approx: 'Axial lengths are drawn in representative ratios (e.g. tetragonal c/a = 1.45, rhombohedral α = 70°, monoclinic β = 110°) — only the relations between them (equal / unequal, 90° / 120°) define each system.',
    params: [
      { key: 'lat', label: 'Bravais lattice (14)', type: 'select', options: BRAVAIS.map((b) => ({ value: b.value, label: b.label })), default: 'cubic-P' },
      { key: 'showAtoms', label: 'Show lattice points (atoms)', type: 'toggle', default: true },
      { key: 'showCell', label: 'Show unit cell', type: 'toggle', default: true },
      { key: 'prism', label: 'Show hexagonal prism (3 cells)', type: 'toggle', default: true, showIf: (p) => p.lat === 'hex-P' },
    ],
    examples: [
      { label: 'Copper, aluminium — cubic F (FCC)', values: { lat: 'cubic-F' } },
      { label: 'α-Iron, sodium — cubic I (BCC)', values: { lat: 'cubic-I' } },
      { label: 'White tin (β-Sn) — tetragonal I', values: { lat: 'tetra-I' } },
      { label: 'Magnesium, zinc — hexagonal P', values: { lat: 'hex-P', prism: true } },
      { label: 'Calcite, bismuth — trigonal R', values: { lat: 'trig-R' } },
      { label: 'CuSO₄·5H₂O — triclinic P', values: { lat: 'tri-P' } },
    ],
    validate: () => [],
    compute(p) {
      const b = findBravais(p.lat); const s = b.sys; const cen = CENTRING[b.l];
      const formulas = [
        { name: 'Axial relations of the crystal system', formula: `${s.rel};  ${s.ang}`, given: `System: ${s.name}`, calc: `Allowed lattices: ${s.lat.join(', ')}`, result: `${s.name} ${b.l}`, unit: '—' },
        { name: 'Lattice points per conventional cell', formula: 'n = N_corner/8 + N_face/2 + N_body', given: `${cen.name}: ${cen.what}`, calc: `n = ${cen.n}`, result: String(cen.count), unit: 'lattice points / cell' },
        { name: 'Counting all Bravais lattices', formula: 'cubic 3 + tetragonal 2 + orthorhombic 4 + hexagonal 1 + trigonal 1 + monoclinic 2 + triclinic 1', given: '7 crystal systems', calc: '3 + 2 + 4 + 1 + 1 + 2 + 1', result: '14', unit: 'Bravais lattices' },
      ];
      const readouts = [
        { label: 'Crystal system', value: s.name, tone: 'info' },
        { label: 'Centring', value: cen.name },
        { label: 'Lattice points / cell', value: String(cen.count), tone: 'good' },
        { label: 'Axes', value: s.rel },
      ];
      return {
        formulas, readouts,
        state: { bravaisLattice: b.label, crystalSystem: s.name, centring: cen.name, axialLengths: s.rel, axialAngles: s.ang, latticePointsPerCell: cen.count, latticesInThisSystem: s.lat.join(', ') },
        explain: {
          what: `${b.label}: ${s.rel}, ${s.ang}, with ${cen.what} — ${cen.count} lattice point${cen.count > 1 ? 's' : ''} per cell.`,
          why: 'Bravais showed that there are only 14 distinct ways of arranging points periodically in 3D. Every crystal is one of these lattices with a group of atoms (the basis) placed at each point.',
          param: 'The chosen Bravais lattice (crystal system + centring type).',
          effect: 'Changing the system changes the cell shape (lengths and angles); changing the centring adds body, face or base points and changes the number of lattice points per cell (1, 2 or 4).',
        },
      };
    },
    steps(p, c) {
      const b = findBravais(p.lat); const s = b.sys; const cen = CENTRING[b.l];
      return [
        { title: `Crystal system: ${s.name}`, text: `Three crystal axes a, b, c define the ${s.name.toLowerCase()} system.` },
        { title: 'Axial lengths and interaxial angles', text: `${s.rel};  ${s.ang}.` },
        { title: 'Lattice points at the 8 corners', text: 'Every Bravais lattice has lattice points at the corners of its unit cell.' },
        { title: b.l === 'P' || b.l === 'R' ? 'No extra points — primitive cell' : `Centring: ${cen.name}`, text: b.l === 'P' || b.l === 'R' ? 'Primitive: only the corner points belong to this lattice.' : `Add ${cen.what}.` },
        { title: `${cen.count} lattice point${cen.count > 1 ? 's' : ''} per cell — one of the 14`, text: `n = ${cen.n}. The ${s.name} system has ${s.lat.length} Bravais lattice${s.lat.length > 1 ? 's' : ''} (${s.lat.join(', ')}); all 7 systems give 14.${s.key === 'hex' ? ' Three such cells form the hexagonal prism.' : ''}` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur, view } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff');
      const b = findBravais(p.lat); const s = b.sys; const cen = CENTRING[b.l];
      const v = cellVecs(s.abc[0], s.abc[1], s.abc[2], s.ang3[0], s.ang3[1], s.ang3[2]); const A = v.A; const B = v.B; const Cv = v.C;
      const pt = (q) => add(add(mul(A, q[0]), mul(B, q[1])), mul(Cv, q[2]));
      const hex = s.key === 'hex' && p.prism && step >= 4;
      const ctr = hex ? mul(Cv, 0.5) : mul(add(add(A, B), Cv), 0.5);
      let R = 0; CORNERS.forEach((q) => { R = Math.max(R, len(sub(pt(q), mul(add(add(A, B), Cv), 0.5)))); });
      if (s.key === 'hex' && p.prism) R = Math.max(R, Math.hypot(1, 0.8));
      const scale = 200 / R; const P0 = D.projector(view, 310, 295, 200); const P = (q) => P0(mul(sub(q, ctr), 1 / R));
      D.text(g, `${s.name} — ${LAT_LABEL[b.l]}`, 20, 26, { size: 20, weight: 800 });
      const O = [0, 0, 0];
      if (hex) {
        const hx = [A, add(A, B), B, mul(A, -1), mul(add(A, B), -1), mul(B, -1)];
        const fr = step === 4 ? ease(prog) : 1;
        for (let i = 0; i < 6; i++) { const a0 = hx[i]; const a1 = hx[(i + 1) % 6]; seg3(g, P, a0, a1, { color: C.cyan, width: 2, alpha: fr }); seg3(g, P, add(a0, Cv), add(a1, Cv), { color: C.cyan, width: 2, alpha: fr }); seg3(g, P, a0, add(a0, Cv), { color: C.cyan, width: 2, alpha: fr, dash: [6, 5] }); }
        seg3(g, P, O, Cv, { color: C.cyan, width: 1.5, dash: [4, 5], alpha: fr });
        if (p.showAtoms) D.atoms3(g, P, hx.concat(hx.map((q) => add(q, Cv))).concat([O, Cv]).map((q) => ({ p: q, r: 0.075, color: '#22d3ee', alpha: 0.85 * fr + 0.01 })), scale);
        D.tag(g, 'Hexagonal prism = 3 primitive cells (γ = 120°)', 310, 525, { bg: C.cyan, size: 18, align: 'center' });
      }
      if (step >= 2 && p.showCell) edges3(g, P, O, A, B, Cv, { color: C.ink, width: 2.5, alpha: 0.85 });
      if (step === 2 && !p.showCell) edges3(g, P, O, A, B, Cv, { color: C.faint, width: 1.5, dash: [5, 5] });
      if (step >= 2) {
        const at = CORNERS.map((q, i) => ({ p: pt(q), r: 0.09 * (step === 2 ? clamp(prog * 3 - i * 0.2, 0, 1) : 1), color: C.blue, alpha: 0.9 }));
        if (step >= 3) cen.extra.forEach((q) => at.push({ p: pt(q), r: 0.09 * (step === 3 ? ease(prog) : 1), color: b.l === 'I' ? C.red : C.green, alpha: 0.9 }));
        if (p.showAtoms) D.atoms3(g, P, at.filter((a) => a.r > 0.002), scale);
        else at.forEach((a) => { if (a.r > 0.002) { const q = P(a.p); D.circle(g, q.x, q.y, 4, { fill: a.color }); } });
      }
      if (step >= 2 && p.showCell) edges3(g, P, O, A, B, Cv, { color: C.ink, width: 2, alpha: 0.45 });
      // axes
      const f0 = step === 0 ? ease(prog) : 1;
      [[A, C.red, 'a'], [B, C.green, 'b'], [Cv, C.blue, 'c']].forEach(([E, col, nm]) => {
        if (f0 > 0.02) arrow3(g, P, O, mul(E, f0 * (step === 0 ? 1.25 : 1)), { color: col, width: 4, head: 14 });
        if (f0 >= 1 && step <= 3) { const q = P(mul(E, step === 0 ? 1.34 : 0.55)); D.tag(g, nm, q.x + (step === 0 ? 0 : -18), q.y + (step === 0 ? 0 : -14), { bg: col, size: 18, align: 'center' }); }
      });
      if (step >= 1 && step <= 3) {
        const r = 0.28;
        const la = arc3(g, P, O, B, Cv, r, C.violet); const lb = arc3(g, P, O, A, Cv, r, C.orange); const lg = arc3(g, P, O, A, B, r, C.pink);
        lab3(g, P, la, `α ${s.ang3[0]}°`, { color: C.violet }); lab3(g, P, lb, `β ${s.ang3[1]}°`, { color: C.orange }); lab3(g, P, lg, `γ ${s.ang3[2]}°`, { color: C.pink });
      }
      if (step === 1) D.tag(g, `${s.rel};   ${s.ang}`, 310, 525, { bg: C.violet, size: 19, align: 'center' });
      if (step === 3) D.tag(g, b.l === 'P' || b.l === 'R' ? 'Primitive — no extra lattice points' : `${cen.name}: ${cen.what}`, 310, 525, { bg: b.l === 'I' ? C.red : b.l === 'P' || b.l === 'R' ? C.blue : C.green, size: 17, align: 'center' });
      if (step === 4 && !hex) D.tag(g, `n = ${cen.n} lattice point${cen.count > 1 ? 's' : ''} per cell`, 310, 525, { bg: C.ink, size: 19, align: 'center' });
      // table of the 7 systems
      const x0 = 612; panel(g, x0, 44, 370, 500, '7 crystal systems → 14 lattices');
      let y = 96;
      SYSTEMS.forEach((sy) => {
        const on = sy.key === s.key;
        if (on) { D.rect(g, x0 + 6, y - 16, 358, 62, { fill: '#fef9c3', stroke: C.hi, width: 2, r: 8 }); if (step === 4) D.focus(g, x0 + 8, y - 14, 354, 58, t); }
        D.text(g, sy.name, x0 + 16, y, { size: 17, weight: 800, color: on ? C.ink : C.muted });
        const lt = sy.lat.join(', '); D.text(g, lt, x0 + 354, y, { size: 17, weight: 800, align: 'right', color: on ? C.blue : C.faint });
        fitText(g, `${sy.rel},  ${sy.ang}`, x0 + 16, y + 26, 340, { size: 16, weight: 600, color: on ? C.ink : C.muted });
        y += 62;
      });
      D.text(g, 'Total: 3 + 2 + 4 + 1 + 1 + 2 + 1 = 14', x0 + 16, y + 2, { size: 17, weight: 800, color: step === 4 ? C.green : C.muted });
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 6. Miller Indices 3D Visualizer
  // ─────────────────────────────────────────────────────────────
  const CUBE_EDGES = []; CORNERS.forEach((a) => CORNERS.forEach((b) => { const d = sub(b, a); if (d[0] + d[1] + d[2] === 1 && Math.min(...d) === 0) CUBE_EDGES.push([a, b]); }));
  /** Polygon where the plane n·r = d cuts the unit cube (sorted around its centroid). */
  function planePoly(n, dv) {
    const pts = []; const push = (q) => { if (!pts.some((r) => len(sub(r, q)) < 1e-6)) pts.push(q); };
    CUBE_EDGES.forEach(([a, b]) => {
      const fa = dot(n, a) - dv; const fb = dot(n, b) - dv;
      if (Math.abs(fa) < 1e-9) push(a); if (Math.abs(fb) < 1e-9) push(b);
      if (fa * fb < 0) push(add(a, mul(sub(b, a), fa / (fa - fb))));
    });
    if (pts.length < 3) return pts;
    const cen = mul(pts.reduce((s, q) => add(s, q), [0, 0, 0]), 1 / pts.length);
    const nn = unit(n); const u = unit(sub(pts[0], cen)); const w = cross(nn, u);
    return pts.sort((p1, p2) => Math.atan2(dot(sub(p1, cen), w), dot(sub(p1, cen), u)) - Math.atan2(dot(sub(p2, cen), w), dot(sub(p2, cen), u)));
  }
  const FR = { 1: '1', 2: '½', 3: '⅓' };
  const interceptTxt = (h) => (h === 0 ? '∞' : `${h < 0 ? '−' : ''}${FR[Math.abs(h)]}`);
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

  S['ep-miller'] = {
    view3d: true,
    approx: 'Cubic unit cell (a = b = c, all angles 90°). For a negative index the origin is moved to the opposite corner of the cell, as in textbooks, so that the plane cuts the drawn cube.',
    params: [
      { key: 'h', label: 'Miller index h', type: 'range', min: -3, max: 3, step: 1, default: 1 },
      { key: 'k', label: 'Miller index k', type: 'range', min: -3, max: 3, step: 1, default: 1 },
      { key: 'l', label: 'Miller index l', type: 'range', min: -3, max: 3, step: 1, default: 1 },
      { key: 'a', label: 'Lattice constant a', type: 'range', min: 2, max: 6, step: 0.005, default: 3.615, unit: 'Å' },
      { key: 'showDir', label: 'Show direction [h k l] (normal)', type: 'toggle', default: true },
      { key: 'showAtoms', label: 'Show corner atoms', type: 'toggle', default: false },
      { key: 'showCell', label: 'Show unit cell', type: 'toggle', default: true },
    ],
    examples: [
      { label: '(1 0 0) — cube face, Cu (a = 3.615 Å)', values: { h: 1, k: 0, l: 0, a: 3.615 } },
      { label: '(1 1 0) — diagonal plane', values: { h: 1, k: 1, l: 0, a: 3.615 } },
      { label: '(1 1 1) — close-packed plane of Cu', values: { h: 1, k: 1, l: 1, a: 3.615 } },
      { label: '(2 1 0) in NaCl (a = 5.64 Å)', values: { h: 2, k: 1, l: 0, a: 5.64 } },
      { label: '(1̄ 1 2) — negative index', values: { h: -1, k: 1, l: 2, a: 3.615 } },
    ],
    validate: (p) => (p.h === 0 && p.k === 0 && p.l === 0 ? ['(0 0 0) is not a plane — at least one Miller index must be non-zero.'] : []),
    compute(p) {
      const { h, k, l } = p; const zero = h === 0 && k === 0 && l === 0;
      const s2 = h * h + k * k + l * l; const d = zero ? 0 : p.a / Math.sqrt(s2);
      const hkl = `(${bar(h)} ${bar(k)} ${bar(l)})`; const g0 = gcd(gcd(Math.abs(h), Math.abs(k)), Math.abs(l));
      const ic = [h, k, l].map(interceptTxt);
      const formulas = [
        { name: 'Intercepts on X, Y, Z (in units of a, b, c)', formula: 'x = a/h,  y = b/k,  z = c/l  (index 0 → ∞: plane ∥ axis)', given: `h = ${h}, k = ${k}, l = ${l}`, calc: zero ? '—' : `x = ${ic[0]}a,  y = ${ic[1]}b,  z = ${ic[2]}c`, result: zero ? 'not a plane' : `${ic[0]}, ${ic[1]}, ${ic[2]}`, unit: 'a, b, c' },
        { name: 'Reciprocals → Miller indices', formula: '(h k l) = (1/x  1/y  1/z), cleared of fractions', given: zero ? '—' : `intercepts ${ic.join(', ')}`, calc: zero ? '—' : `1/${ic[0]}, 1/${ic[1]}, 1/${ic[2]} = ${h}, ${k}, ${l}`, result: zero ? '—' : hkl, unit: '—' },
        { name: 'Interplanar spacing (cubic)', formula: 'd = a / √(h² + k² + l²)', given: `a = ${p.a} Å`, calc: zero ? '—' : `d = ${p.a} / √(${h * h} + ${k * k} + ${l * l}) = ${p.a} / √${s2}`, result: zero ? '—' : fmt(d, 4), unit: 'Å' },
      ];
      const readouts = [
        { label: 'Plane', value: zero ? '(0 0 0) — invalid' : hkl, tone: zero ? 'bad' : 'info' },
        { label: 'Intercepts', value: zero ? '—' : `${ic[0]}a, ${ic[1]}b, ${ic[2]}c` },
        { label: 'd spacing', value: zero ? '—' : `${fmt(d, 4)} Å`, tone: 'good' },
        { label: 'Normal direction', value: zero ? '—' : `[${bar(h)} ${bar(k)} ${bar(l)}]` },
      ];
      return {
        formulas, readouts,
        state: { plane: zero ? 'none' : hkl, h, k, l, intercepts: zero ? 'none' : `${ic[0]}a, ${ic[1]}b, ${ic[2]}c`, dSpacing: zero ? 'none' : `${fmt(d, 4)} Å`, latticeConstant: `${p.a} Å`, commonFactor: g0, valid: !zero },
        explain: {
          what: zero ? '(0 0 0) does not describe a plane.' : `The plane ${hkl} cuts the axes at ${ic[0]}a, ${ic[1]}b and ${ic[2]}c. Parallel planes of this family are d = ${fmt(d, 4)} Å apart.`,
          why: 'Miller indices are the reciprocals of the intercepts (in units of the lattice constants), cleared of fractions. A zero index means the intercept is at infinity — the plane is parallel to that axis.',
          param: 'The Miller indices h, k, l and the lattice constant a.',
          effect: `Larger indices → the plane cuts the axes closer to the origin and the planes are packed closer: d = a/√(h²+k²+l²) decreases.${g0 > 1 ? ` Here all indices share the factor ${g0}, so the plane is parallel to (${bar(h / g0)} ${bar(k / g0)} ${bar(l / g0)}) with ${g0}× smaller spacing.` : ''}`,
        },
      };
    },
    steps(p, c) {
      const st = c.state; const { h, k, l } = p;
      if (!st.valid) return [{ title: 'Axes and unit cube', text: 'X, Y, Z axes along the cube edges.' }, { title: '(0 0 0) is not a plane', text: 'All intercepts would be infinite — choose at least one non-zero index.' }, { title: 'Try again', text: 'Set h, k or l to a non-zero value.' }, { title: 'Hint', text: 'Start with (1 0 0), (1 1 0) or (1 1 1).' }];
      const neg = h < 0 || k < 0 || l < 0;
      return [
        { title: 'Coordinate axes X, Y, Z and the unit cube', text: `The cube edge is a = ${p.a} Å.${neg ? ' A negative index: the origin O′ is moved to the neighbouring corner.' : ''}` },
        { title: 'Step 1 — find the intercepts', text: `The plane cuts X, Y, Z at ${st.intercepts} (∞ means parallel to that axis).` },
        { title: 'Step 2 — take the reciprocals', text: `1/(${[h, k, l].map(interceptTxt).join(')  1/(')}) = ${h}, ${k}, ${l}.` },
        { title: `Step 3 — clear fractions → ${st.plane}`, text: `The Miller indices of the shaded plane are ${st.plane}.` },
        { title: `Direction [${bar(h)} ${bar(k)} ${bar(l)}] is normal to the plane`, text: 'In a cubic crystal the direction with the same indices is perpendicular to the plane.' },
        { title: `Interplanar spacing d = ${st.dSpacing}`, text: `d = a/√(h² + k² + l²) = ${p.a}/√${h * h + k * k + l * l} = ${st.dSpacing} between neighbouring parallel planes.` },
      ];
    },
    draw(g, S2) {
      const { p, c, step, st, t, dur, view } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff');
      const { h, k, l } = p; const zero = h === 0 && k === 0 && l === 0;
      const P = projAt(view, 310, 300, 235, [0.5, 0.5, 0.5]);
      D.text(g, zero ? 'Miller indices' : `Miller indices — plane ${c.state.plane}`, 20, 26, { size: 20, weight: 800 });
      if (p.showCell) D.cube3(g, P, 1, { color: C.ink, width: 2, alpha: 0.7 });
      D.axes3(g, P, 1.42);
      lab3(g, P, [0, 0, 0], 'O', { dx: -16, dy: 14, size: 18 });
      if (p.showAtoms) D.atoms3(g, P, CORNERS.map((q) => ({ p: q, r: 0.07, color: C.blue, alpha: 0.85 })), 235);
      if (zero) { D.tag(g, '(0 0 0) is not a plane — choose a non-zero index', 310, 520, { bg: C.red, size: 19, align: 'center' }); }
      const n = [h, k, l]; const Op = n.map((x) => (x < 0 ? 1 : 0)); const dv = zero ? 0 : 1 + dot(n, Op);
      const neg = Op.some((x) => x);
      if (!zero && neg) { const q = P(Op); D.circle(g, q.x, q.y, 7, { fill: C.violet, stroke: '#fff', width: 2 }); D.text(g, 'O′', q.x + 12, q.y + 14, { size: 18, weight: 800, color: C.violet, halo: true }); }
      if (!zero) {
        // intercept markers
        if (step >= 1) {
          const cols = [C.red, C.green, C.blue]; const nm = ['x', 'y', 'z'];
          n.forEach((idx, i) => {
            if (idx === 0) {
              const e = [0, 0, 0]; e[i] = 1.42; const base = Op.slice(); const q = P(add(base, mul(unit(e), 0.001)));
              const tip = P(add(Op, e)); D.text(g, `${nm[i]} = ∞ (∥ ${'XYZ'[i]})`, tip.x + 6, tip.y + 20, { size: 17, weight: 800, color: cols[i], halo: true, align: 'center' }); void q;
              return;
            }
            const e = [0, 0, 0]; e[i] = 1 / idx; const pos = add(Op, e);
            const f = step === 1 ? clamp(prog * 3 - i * 0.6, 0, 1) : 1; if (f <= 0) return;
            seg3(g, P, Op, pos, { color: cols[i], width: 5, alpha: 0.6 * f });
            const q = P(pos); D.circle(g, q.x, q.y, 8 * f, { fill: cols[i], stroke: '#fff', width: 2 });
            const cq = P([0.5, 0.5, 0.5]); const dx = q.x - cq.x; const dy = q.y - cq.y; const dl = Math.hypot(dx, dy) || 1;
            D.text(g, `${nm[i]} = ${interceptTxt(idx)} a`, q.x + (dx / dl) * 44, q.y + (dy / dl) * 26, { size: 17, weight: 800, color: cols[i], halo: true, align: 'center' });
          });
        }
        // plane
        if (step >= 2) {
          const poly = planePoly(n, dv).map((q) => { const s = P(q); return [s.x, s.y]; });
          if (poly.length >= 3) {
            if (step === 2) D.poly(g, poly, { close: true, stroke: C.violet, width: 3, dash: [8, 6], alpha: ease(prog) });
            else { D.poly(g, poly, { close: true, fill: C.violet, alpha: 0.28, stroke: false }); D.poly(g, poly, { close: true, stroke: C.violet, width: 3 }); }
          }
          if (step === 3 || step === 4) { const cen = planePoly(n, dv).reduce((s, q) => add(s, q), [0, 0, 0]); const m = planePoly(n, dv).length || 1; const q = P(mul(cen, 1 / m)); D.tag(g, c.state.plane, q.x, q.y, { bg: C.violet, size: 22, align: 'center' }); }
        }
        // normal direction
        if (step >= 4 && p.showDir) {
          const m = Math.max(Math.abs(h), Math.abs(k), Math.abs(l)); const dir = mul(n, 1 / m);
          const f = step === 4 ? ease(prog) : 1;
          arrow3(g, P, Op, add(Op, mul(dir, f)), { color: C.orange, width: 5, head: 16 });
          if (f > 0.9) lab3(g, P, add(Op, mul(dir, 1.08)), `[${bar(h)} ${bar(k)} ${bar(l)}]`, { color: C.orange, size: 20 });
        }
        // spacing to the neighbouring plane
        if (step >= 5) {
          let d2 = dv + 1; let poly2 = planePoly(n, d2); if (poly2.length < 3) { d2 = dv - 1; poly2 = planePoly(n, d2); }
          if (poly2.length >= 3) {
            const pp = poly2.map((q) => { const s = P(q); return [s.x, s.y]; });
            D.poly(g, pp, { close: true, fill: C.cyan, alpha: 0.18, stroke: false }); D.poly(g, pp, { close: true, stroke: C.cyan, width: 2.5, dash: [7, 5] });
            const p1 = planePoly(n, dv); const cen = mul(p1.reduce((s, q) => add(s, q), [0, 0, 0]), 1 / Math.max(1, p1.length));
            const nn = unit(n); const dist = (d2 - dv) / len(n); const q2 = add(cen, mul(nn, dist));
            const A1 = P(cen); const B1 = P(q2); D.arrow(g, A1.x, A1.y, B1.x, B1.y, { color: C.cyan, width: 3.5 }); D.arrow(g, B1.x, B1.y, A1.x, A1.y, { color: C.cyan, width: 3.5 });
            D.tag(g, `d = ${c.state.dSpacing}`, (A1.x + B1.x) / 2 + 16, (A1.y + B1.y) / 2, { bg: C.cyan, size: 19 });
          }
        }
      }
      if (step === 0) { const q = P([0, 0, 0]); D.focus(g, q.x - 30, q.y - 30, 60, 60, t); }
      // right panel: the procedure table
      const x0 = 612; panel(g, x0, 44, 370, 500, 'Finding the Miller indices');
      const cx = [x0 + 196, x0 + 262, x0 + 328];
      D.text(g, 'Axis', x0 + 16, 92, { size: 16, weight: 800, color: C.muted });
      ['X', 'Y', 'Z'].forEach((a, i) => D.text(g, a, cx[i], 92, { size: 18, weight: 800, align: 'center', color: [C.red, C.green, C.blue][i] }));
      const rowsT = [
        ['Intercepts', zero ? ['—', '—', '—'] : n.map((x) => (x === 0 ? '∞' : `${interceptTxt(x)}`)), 1],
        ['Reciprocals', zero ? ['—', '—', '—'] : n.map((x) => (x === 0 ? '0' : String(x).replace('-', '−'))), 2],
        ['Miller indices', zero ? ['—', '—', '—'] : n.map((x) => bar(x)), 3],
      ];
      let y = 132;
      rowsT.forEach(([lbl, vals, s]) => {
        if (step === s) D.rect(g, x0 + 6, y - 20, 358, 40, { fill: '#fef9c3', stroke: C.hi, width: 2, r: 8 });
        D.text(g, lbl, x0 + 16, y, { size: 17, weight: 800, color: step >= s ? C.ink : C.faint });
        vals.forEach((v2, i) => fitText(g, step >= s ? v2 : '?', cx[i], y, 64, { size: 20, weight: 800, align: 'center', color: step >= s ? C.ink : C.faint }));
        y += 50;
      });
      y += 6;
      D.text(g, 'Plane', x0 + 16, y, { size: 16, weight: 700, color: C.muted });
      D.text(g, step >= 3 && !zero ? c.state.plane : '?', x0 + 196, y, { size: 24, weight: 800, color: step >= 3 ? C.violet : C.faint });
      y += 44;
      D.text(g, 'Normal direction', x0 + 16, y, { size: 16, weight: 700, color: C.muted });
      D.text(g, step >= 4 && !zero ? `[${bar(h)} ${bar(k)} ${bar(l)}]` : '?', x0 + 196, y, { size: 22, weight: 800, color: step >= 4 ? C.orange : C.faint });
      y += 44;
      if (step === 5) D.rect(g, x0 + 6, y - 18, 358, 90, { fill: '#ecfeff', stroke: C.cyan, width: 2, r: 8 });
      D.text(g, 'Spacing d = a / √(h² + k² + l²)', x0 + 16, y, { size: 17, weight: 800, color: step >= 5 ? C.ink : C.faint });
      D.text(g, step >= 5 && !zero ? `= ${p.a} / √${h * h + k * k + l * l}` : '', x0 + 16, y + 28, { size: 18, weight: 700 });
      D.text(g, step >= 5 && !zero ? `= ${c.state.dSpacing}` : '', x0 + 16, y + 56, { size: 22, weight: 800, color: C.cyan });
      if (neg && !zero) D.text(g, 'O′ = shifted origin (negative index)', x0 + 16, 520, { size: 16, weight: 700, color: C.violet });
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 7. Bragg's Law Simulator
  // ─────────────────────────────────────────────────────────────
  const N_PLANES = 8; // number of planes used for the schematic intensity curve
  function braggI(d, lam, thDeg) {
    const phi = (2 * Math.PI * 2 * d * Math.sin(rad(thDeg))) / lam; const sh = Math.sin(phi / 2);
    if (Math.abs(sh) < 1e-6) return 1;
    const v = Math.sin((N_PLANES * phi) / 2) / (N_PLANES * sh); return v * v;
  }
  function braggCalc(p) {
    const path = 2 * p.d * Math.sin(rad(p.theta)); const ratio = path / p.lam; const m = Math.round(ratio);
    const cons = m >= 1 && Math.abs(ratio - m) <= 0.03;
    const sn = (p.n * p.lam) / (2 * p.d); const thn = sn <= 1 ? deg(Math.asin(sn)) : null;
    const nmax = Math.floor((2 * p.d) / p.lam); const angles = [];
    for (let n = 1; n <= Math.min(nmax, 6); n++) angles.push(deg(Math.asin((n * p.lam) / (2 * p.d))));
    let phase = ((ratio % 1) + 1) % 1 * 360;
    return { path, ratio, m, cons, sn, thn, nmax, angles, phase, I: braggI(p.d, p.lam, p.theta) };
  }
  S['ep-bragg'] = {
    approx: `The intensity curve is schematic: it is the interference of ${N_PLANES} identical, equally spaced planes (no atomic form factor, absorption or thermal effects), so real peak heights and widths differ. The ray picture is drawn to scale (40 px per Å).`,
    params: [
      { key: 'lam', label: 'X-ray wavelength λ', type: 'range', min: 0.5, max: 3, step: 0.0001, default: 1.5406, unit: 'Å', help: 'Cu Kα = 1.5406 Å, Mo Kα = 0.7107 Å.' },
      { key: 'd', label: 'Crystal (interplanar) spacing d', type: 'range', min: 1, max: 5, step: 0.001, default: 2.82, unit: 'Å' },
      { key: 'theta', label: 'Glancing angle θ', type: 'range', min: 2, max: 88, step: 0.1, default: 15.9, unit: '°', help: 'Angle between the X-ray beam and the atomic planes.' },
      { key: 'n', label: 'Order of diffraction n', type: 'range', min: 1, max: 5, step: 1, default: 1 },
    ],
    examples: [
      { label: 'Cu Kα on NaCl (200), d = 2.82 Å — 1st order', values: { lam: 1.5406, d: 2.82, theta: 15.9, n: 1 } },
      { label: 'Same crystal, 2nd order (θ₂ ≈ 33.1°)', values: { lam: 1.5406, d: 2.82, theta: 33.1, n: 2 } },
      { label: 'Cu Kα on Si (111), d = 3.1356 Å', values: { lam: 1.5406, d: 3.1356, theta: 14.2, n: 1 } },
      { label: 'Off the Bragg angle — destructive (θ = 20°)', values: { lam: 1.5406, d: 2.82, theta: 20, n: 1 } },
      { label: 'Mo Kα on NaCl (200)', values: { lam: 0.7107, d: 2.82, theta: 7.2, n: 1 } },
    ],
    validate(p) {
      const w = [];
      if (p.lam > 2 * p.d) w.push(`λ = ${p.lam} Å is larger than 2d = ${fmt(2 * p.d, 4)} Å — no Bragg reflection is possible from these planes at any angle.`);
      else if (p.n * p.lam > 2 * p.d) w.push(`No diffraction in order n = ${p.n}: nλ = ${fmt(p.n * p.lam, 4)} Å > 2d = ${fmt(2 * p.d, 4)} Å (sin θ would exceed 1). Highest possible order is ${Math.floor((2 * p.d) / p.lam)}.`);
      return w;
    },
    compute(p) {
      const q = braggCalc(p);
      const formulas = [
        { name: 'Path difference between rays from neighbouring planes', formula: 'Δ = 2d sin θ', given: `d = ${p.d} Å, θ = ${p.theta}°`, calc: `Δ = 2 × ${p.d} × sin ${p.theta}° = 2 × ${p.d} × ${Math.sin(rad(p.theta)).toFixed(4)}`, result: fmt(q.path, 4), unit: 'Å' },
        { name: 'Compare with whole wavelengths', formula: 'Δ / λ  (integer → in phase)', given: `λ = ${p.lam} Å`, calc: `${fmt(q.path, 4)} / ${p.lam} = ${q.ratio.toFixed(3)}  → phase difference ${fmt(q.phase, 3)}°`, result: q.cons ? `≈ ${q.m} → constructive` : 'not an integer → waves cancel', unit: 'wavelengths' },
        { name: "Bragg's law — Bragg angle for order n", formula: 'nλ = 2d sin θₙ  ⇒  θₙ = sin⁻¹(nλ / 2d)', given: `n = ${p.n}, λ = ${p.lam} Å, d = ${p.d} Å`, calc: `sin θₙ = ${p.n} × ${p.lam} / (2 × ${p.d}) = ${q.sn.toFixed(4)}`, result: q.thn != null ? `θ${p.n} = ${fmt(q.thn, 4)}` : 'sin θ > 1 → no diffraction in this order', unit: q.thn != null ? 'degrees (°)' : '—' },
        { name: 'All Bragg angles', formula: 'n = 1, 2, … up to n_max = ⌊2d/λ⌋', given: `2d/λ = ${fmt((2 * p.d) / p.lam, 4)}`, calc: q.angles.length ? q.angles.map((a, i) => `θ${i + 1} = ${fmt(a, 4)}°`).join(', ') : 'none', result: `n_max = ${q.nmax}`, unit: 'orders' },
      ];
      const readouts = [
        { label: 'Path difference 2d sinθ', value: `${fmt(q.path, 4)} Å`, tone: 'info' },
        { label: '2d sinθ / λ', value: q.ratio.toFixed(3) },
        { label: `Bragg angle θ${p.n}`, value: q.thn != null ? `${fmt(q.thn, 4)}°` : 'none', tone: q.thn != null ? undefined : 'warn' },
        { label: 'Constructive', value: q.cons ? `YES (n = ${q.m})` : 'NO', tone: q.cons ? 'good' : 'bad' },
      ];
      return {
        formulas, readouts,
        state: { wavelength: `${p.lam} Å`, spacing: `${p.d} Å`, glancingAngle: `${p.theta}°`, order: p.n, pathDifference: `${fmt(q.path, 4)} Å`, pathOverWavelength: Number(q.ratio.toFixed(3)), phaseDifference: `${fmt(q.phase, 3)}°`, braggAngleForOrder: q.thn != null ? `${fmt(q.thn, 4)}°` : 'none (nλ > 2d)', allBraggAngles: q.angles.map((a) => `${fmt(a, 4)}°`).join(', ') || 'none', constructive: q.cons ? 'YES' : 'NO' },
        explain: {
          what: q.cons ? `At θ = ${p.theta}° the ray reflected from the lower plane travels 2d sinθ = ${fmt(q.path, 4)} Å farther — ${q.m} whole wavelength${q.m > 1 ? 's' : ''}. The reflected waves are in phase and give a strong diffracted beam (order ${q.m}).` : `At θ = ${p.theta}° the extra path is ${fmt(q.path, 4)} Å = ${q.ratio.toFixed(3)} λ — not a whole number of wavelengths, so the waves from many planes cancel and no diffracted beam is seen.`,
          why: 'X-rays are scattered by every atomic plane. Rays from neighbouring planes differ in path by 2d sinθ; they reinforce only when this equals a whole number of wavelengths: nλ = 2d sinθ.',
          param: 'Wavelength λ, interplanar spacing d, glancing angle θ and the order n.',
          effect: `Increasing θ increases the path difference; peaks occur only at θₙ = sin⁻¹(nλ/2d)${q.angles.length ? ` (here ${q.angles.slice(0, 4).map((a) => fmt(a, 3) + '°').join(', ')})` : ''}. A larger d or a shorter λ moves the peaks to smaller angles and allows more orders.`,
        },
      };
    },
    steps(p, c) {
      const st = c.state;
      return [
        { title: 'X-rays fall on the crystal planes', text: `A parallel beam of wavelength λ = ${p.lam} Å strikes planes d = ${p.d} Å apart at glancing angle θ = ${p.theta}°.` },
        { title: 'Each plane reflects part of the beam', text: 'Rays are reflected at the same angle θ from the first and the second plane (like a mirror).' },
        { title: 'Extra path Δ = 2d sin θ', text: `The lower ray travels d sinθ extra on the way in and d sinθ on the way out: Δ = ${st.pathDifference}.` },
        { title: 'Compare the path difference with nλ', text: `Δ/λ = ${st.pathOverWavelength} → phase difference ${st.phaseDifference}. Bragg angle for n = ${p.n}: ${st.braggAngleForOrder}.` },
        { title: st.constructive === 'YES' ? 'Waves in phase → constructive interference' : 'Waves out of phase → no reflection', text: st.constructive === 'YES' ? 'Crests meet crests, the amplitudes add and a strong diffracted beam leaves the crystal.' : 'Crests meet troughs; with many planes the reflected waves cancel.' },
        { title: 'Diffraction peaks at the Bragg angles', text: `Intensity vs θ shows sharp peaks only at ${st.allBraggAngles}. The marker shows the present angle.` },
      ];
    },
    draw(g, S2) {
      const { p, c, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff');
      const q = braggCalc(p); const K = 40; const th = rad(p.theta);
      const dpx = p.d * K; const lpx = p.lam * K;
      const y1 = 205; const y2 = y1 + dpx; const x0 = 320;
      D.text(g, "Bragg's law  nλ = 2d sin θ", 20, 26, { size: 20, weight: 800 });
      // planes of atoms
      const planes = [y1, y2]; if (y2 + dpx < 500) planes.push(y2 + dpx);
      planes.forEach((y, i) => {
        D.line(g, 30, y, 600, y, { color: C.faint, width: 1.5, dash: [4, 6] });
        for (let x = 40; x <= 590; x += 40) D.atom(g, x, y, 8, C.blue);
        D.text(g, `plane ${i + 1}`, 604, y, { size: 16, color: C.muted, weight: 700 });
      });
      D.line(g, 580, y1, 580, y2, { color: C.ink, width: 2 }); D.text(g, `d = ${p.d} Å`, 572, (y1 + y2) / 2, { size: 17, weight: 800, align: 'right', halo: true });
      const u = [Math.cos(th), Math.sin(th)]; const v = [Math.cos(th), -Math.sin(th)];
      const L = Math.min(260, (y1 - 60) / Math.max(Math.sin(th), 0.05));
      const A = [x0, y1]; const B = [x0, y2];
      const proj = (P0, dir) => { const w = [A[0] - P0[0], A[1] - P0[1]]; const s = w[0] * dir[0] + w[1] * dir[1]; return [P0[0] + dir[0] * s, P0[1] + dir[1] * s]; };
      const M = proj(B, u); const N = proj(B, v);
      const S1 = [A[0] - L * u[0], A[1] - L * u[1]]; const S2p = [M[0] - L * u[0], M[1] - L * u[1]];
      const E1 = [A[0] + L * v[0], A[1] + L * v[1]]; const E2 = [N[0] + L * v[0], N[1] + L * v[1]];
      const pathLen = 2 * p.d * Math.sin(th) * K;
      const inF = step === 0 ? prog : 1; const outF = step === 1 ? prog : step >= 1 ? 1 : 0;
      const ph = t * 2 * Math.PI * 0.8;
      const segW = (P1, P2, f, s0, col) => {
        const Q = [P1[0] + (P2[0] - P1[0]) * f, P1[1] + (P2[1] - P1[1]) * f];
        D.line(g, P1[0], P1[1], Q[0], Q[1], { color: col, width: 1.5, alpha: 0.6 });
        if (f > 0.02) D.wave(g, P1[0], P1[1], Q[0], Q[1], { amp: 7, wavelength: lpx, phase: -2 * Math.PI * s0 / lpx + ph, color: col, width: 2.5 });
      };
      // ray 1 (red) and ray 2 (violet)
      segW(S1, A, inF, 0, C.laser);
      segW(S2p, M, inF, 0, C.violet);
      if (inF >= 1) segW(M, B, 1, L, C.violet);
      if (outF > 0) { segW(A, E1, outF, L, C.laser); segW(B, N, 1, L + pathLen / 2, C.violet); segW(N, E2, outF, L + pathLen, C.violet); }
      if (inF >= 1) { D.arrow(g, S1[0], S1[1], S1[0] + u[0] * 60, S1[1] + u[1] * 60, { color: C.laser, width: 3 }); D.arrow(g, S2p[0], S2p[1], S2p[0] + u[0] * 60, S2p[1] + u[1] * 60, { color: C.violet, width: 3 }); }
      if (outF >= 1) { D.arrow(g, E1[0] - v[0] * 50, E1[1] - v[1] * 50, E1[0], E1[1], { color: C.laser, width: 3 }); D.arrow(g, E2[0] - v[0] * 50, E2[1] - v[1] * 50, E2[0], E2[1], { color: C.violet, width: 3 }); }
      D.text(g, 'Incident X-rays', S1[0] + 4, S1[1] - 22, { size: 17, weight: 800, color: C.laser, halo: true });
      if (outF >= 1) D.text(g, 'Reflected rays', E1[0] - 4, E1[1] - 22, { size: 17, weight: 800, color: C.laser, halo: true, align: 'right' });
      // θ arc
      g.save(); g.beginPath(); g.arc(A[0], A[1], 58, Math.PI, Math.PI + th); g.strokeStyle = C.amber; g.lineWidth = 3; g.stroke(); g.restore();
      D.text(g, `θ = ${p.theta}°`, A[0] - 66, A[1] - 16 - 10 * Math.sin(th), { size: 17, weight: 800, color: C.amber, align: 'right', halo: true });
      // path difference
      if (step >= 2) {
        D.line(g, A[0], A[1], M[0], M[1], { color: C.muted, width: 2, dash: [5, 5] }); D.line(g, A[0], A[1], N[0], N[1], { color: C.muted, width: 2, dash: [5, 5] });
        const f = step === 2 ? ease(prog) : 1;
        D.line(g, M[0], M[1], M[0] + (B[0] - M[0]) * f, M[1] + (B[1] - M[1]) * f, { color: C.orange, width: 7 });
        if (f > 0.5) D.line(g, B[0], B[1], B[0] + (N[0] - B[0]) * (f - 0.5) * 2, B[1] + (N[1] - B[1]) * (f - 0.5) * 2, { color: C.orange, width: 7 });
        D.text(g, 'd sinθ', (M[0] + B[0]) / 2 - 12, (M[1] + B[1]) / 2 + 4, { size: 16, weight: 800, color: C.orange, halo: true, align: 'right' });
        D.text(g, 'd sinθ', (N[0] + B[0]) / 2 + 12, (N[1] + B[1]) / 2 + 4, { size: 16, weight: 800, color: C.orange, halo: true });
        D.tag(g, `Δ = 2d sinθ = ${fmt(q.path, 4)} Å`, 320, 515, { bg: C.orange, size: 19, align: 'center' });
        if (step === 2) D.focus(g, Math.min(M[0], N[0]) - 10, Math.min(M[1], N[1]) - 10, Math.abs(N[0] - M[0]) + 20, B[1] - Math.min(M[1], N[1]) + 20, t);
      }
      if (step >= 3) {
        D.tag(g, `Δ/λ = ${q.ratio.toFixed(3)}  →  ${q.cons ? `= ${q.m} (whole number)` : 'not a whole number'}`, 320, 475, { bg: q.cons ? C.green : C.red, size: 18, align: 'center' });
      }
      // right: superposition
      const rx = 660; const rw = 320;
      if (step >= 3) {
        panel(g, rx - 10, 44, rw + 20, 250, 'Waves leaving the crystal');
        const wl = 64; const amp = 16; const ph2 = 2 * Math.PI * q.ratio;
        D.wave(g, rx, 100, rx + rw, 100, { amp, wavelength: wl, phase: ph, color: C.laser, width: 2.5 }); D.text(g, 'ray 1', rx, 124, { size: 16, weight: 700, color: C.laser });
        D.wave(g, rx, 160, rx + rw, 160, { amp, wavelength: wl, phase: ph + ph2, color: C.violet, width: 2.5 }); D.text(g, `ray 2 (shift ${fmt(q.phase, 3)}°)`, rx, 184, { size: 16, weight: 700, color: C.violet });
        const A2 = 2 * Math.abs(Math.cos(ph2 / 2));
        if (step >= 4) {
          g.save(); g.beginPath();
          for (let s = 0; s <= rw; s += 2) { const yv = 238 + amp * (Math.sin((2 * Math.PI * s) / wl - ph) + Math.sin((2 * Math.PI * s) / wl - ph - ph2)); if (s === 0) g.moveTo(rx + s, yv); else g.lineTo(rx + s, yv); }
          g.strokeStyle = q.cons ? C.green : C.red; g.lineWidth = 3; g.stroke(); g.restore();
          D.text(g, `sum: amplitude ${fmt(A2, 2)} × single`, rx, 278, { size: 16, weight: 800, color: q.cons ? C.green : C.red });
          if (step === 4) D.focus(g, rx - 6, 205, rw + 12, 80, t);
        }
      }
      // intensity plot
      if (step >= 5) {
        const px = 690; const py = 330; const pw = 280; const ph3 = 130;
        D.text(g, 'Intensity vs θ (schematic)', px - 40, py - 16, { size: 17, weight: 800 });
        const { X, Y } = plot(g, px, py, pw, ph3, { xmin: 0, xmax: 90, ymin: 0, ymax: 1.15, xticks: [0, 30, 60, 90], fx: (v2) => `${v2}°` });
        const pts = []; for (let a = 0.2; a <= 90; a += 0.2) pts.push([X(a), Y(braggI(p.d, p.lam, a))]);
        g.save(); g.beginPath(); g.rect(px, py, pw, ph3); g.clip(); D.poly(g, pts, { stroke: C.blue, width: 2 }); g.restore();
        q.angles.slice(0, 4).forEach((a, i) => D.text(g, `n=${i + 1}`, X(a), py - 0 + 14 + (i % 2) * 18, { size: 16, weight: 800, color: C.blue, align: 'center', halo: true }));
        D.line(g, X(p.theta), py, X(p.theta), py + ph3, { color: q.cons ? C.green : C.red, width: 2.5, dash: [5, 4] });
        D.circle(g, X(p.theta), Y(q.I), 6, { fill: q.cons ? C.green : C.red, stroke: '#fff', width: 2 });
      }
      const ok = q.cons;
      if (p.lam > 2 * p.d) D.tag(g, 'No diffraction: λ > 2d', 820, 520, { bg: C.red, size: 18, align: 'center' });
      else if (step >= 4) D.tag(g, ok ? `Constructive: YES (n = ${q.m})` : 'Constructive: NO', 820, 520, { bg: ok ? C.green : C.red, size: 20, align: 'center' });
      else if (p.n * p.lam > 2 * p.d) D.tag(g, `No diffraction for n = ${p.n}: nλ > 2d`, 820, 520, { bg: C.red, size: 18, align: 'center' });
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 8. X-Ray Diffraction Simulator
  // ─────────────────────────────────────────────────────────────
  function multiplicity(h, k, l) {
    const set = new Set(); const perms = [[h, k, l], [h, l, k], [k, h, l], [k, l, h], [l, h, k], [l, k, h]];
    perms.forEach(([a, b, c]) => { for (const sa of [1, -1]) for (const sb of [1, -1]) for (const sc of [1, -1]) set.add(`${a * sa},${b * sb},${c * sc}`); });
    return set.size;
  }
  const ALLOWED = {
    sc: () => true,
    bcc: (h, k, l) => (h + k + l) % 2 === 0,
    fcc: (h, k, l) => (h % 2 === k % 2) && (k % 2 === l % 2),
  };
  const STRUCT_NAME = { sc: 'Simple cubic (SC)', bcc: 'Body-centred cubic (BCC)', fcc: 'Face-centred cubic (FCC)' };
  const RULE = { sc: 'all (h k l) allowed', bcc: 'h + k + l even', fcc: 'h, k, l all odd or all even' };
  const SEQ = { sc: '1, 2, 3, 4, 5, 6, 8, 9 …', bcc: '2, 4, 6, 8, 10, 12 …', fcc: '3, 4, 8, 11, 12, 16 …' };
  function xrdPeaks(struct, a, lam) {
    const by = new Map();
    for (let h = 0; h <= 6; h++) for (let k = 0; k <= h; k++) for (let l = 0; l <= k; l++) {
      if (h + k + l === 0 || !ALLOWED[struct](h, k, l)) continue;
      const s = h * h + k * k + l * l; if (s > 36) continue;
      const d = a / Math.sqrt(s); const x = lam / (2 * d); if (x >= 1) continue;
      const tth = 2 * deg(Math.asin(x)); if (tth < 10 || tth > 140) continue;
      const m = multiplicity(h, k, l);
      if (by.has(s)) { const e = by.get(s); e.m += m; e.alt.push(`${h}${k}${l}`); } else by.set(s, { s, hkl: `${h}${k}${l}`, alt: [], d, tth, m });
    }
    const list = [...by.values()].sort((p1, p2) => p1.tth - p2.tth).slice(0, 16);
    list.forEach((e) => { const th = rad(e.tth / 2); e.raw = e.m * (1 + Math.cos(2 * th) ** 2) / (Math.sin(th) ** 2 * Math.cos(th)); });
    const mx = Math.max(1e-9, ...list.map((e) => e.raw)); list.forEach((e) => { e.I = (100 * e.raw) / mx; });
    return list;
  }
  const xrdCache = { key: '', peaks: [] };
  function peaksFor(p) { const key = `${p.struct}|${p.a}|${p.lam}`; if (xrdCache.key !== key) { xrdCache.key = key; xrdCache.peaks = xrdPeaks(p.struct, p.a, p.lam); } return xrdCache.peaks; }
  S['ep-xrd'] = {
    approx: 'Peak positions are exact (Bragg’s law). Relative heights are approximate: multiplicity × Lorentz-polarisation factor (1 + cos²2θ)/(sin²θ cosθ) only — no atomic form factor, temperature or absorption corrections. Peaks are drawn with a fixed width.',
    params: [
      { key: 'struct', label: 'Crystal structure', type: 'select', options: [{ value: 'sc', label: 'Simple cubic (SC)' }, { value: 'bcc', label: 'Body-centred cubic (BCC)' }, { value: 'fcc', label: 'Face-centred cubic (FCC)' }], default: 'fcc' },
      { key: 'a', label: 'Lattice constant a', type: 'range', min: 2, max: 6, step: 0.001, default: 3.615, unit: 'Å' },
      { key: 'lam', label: 'X-ray wavelength', type: 'select', options: [{ value: 1.5406, label: 'Cu Kα — 1.5406 Å' }, { value: 0.7107, label: 'Mo Kα — 0.7107 Å' }], default: 1.5406 },
      { key: 'labels', label: 'Label peaks with (h k l)', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Copper — FCC, a = 3.615 Å (Cu Kα)', values: { struct: 'fcc', a: 3.615, lam: 1.5406 } },
      { label: 'α-Iron — BCC, a = 2.87 Å (Cu Kα)', values: { struct: 'bcc', a: 2.87, lam: 1.5406 } },
      { label: 'Polonium — SC, a = 3.35 Å (Cu Kα)', values: { struct: 'sc', a: 3.35, lam: 1.5406 } },
      { label: 'Aluminium — FCC, a = 4.05 Å (Mo Kα)', values: { struct: 'fcc', a: 4.05, lam: 0.7107 } },
    ],
    validate: () => [],
    compute(p) {
      const pk = peaksFor(p); const f = pk[0];
      const formulas = [
        { name: 'Interplanar spacing (cubic)', formula: 'd = a / √(h² + k² + l²)', given: `a = ${p.a} Å${f ? `, first peak (${f.hkl}), h²+k²+l² = ${f.s}` : ''}`, calc: f ? `d = ${p.a} / √${f.s}` : '—', result: f ? fmt(f.d, 4) : '—', unit: 'Å' },
        { name: "Peak position from Bragg's law", formula: '2θ = 2 sin⁻¹(λ / 2d)', given: `λ = ${p.lam} Å`, calc: f ? `2θ = 2 sin⁻¹(${p.lam} / (2 × ${fmt(f.d, 4)})) = 2 sin⁻¹(${(p.lam / (2 * f.d)).toFixed(4)})` : '—', result: f ? fmt(f.tth, 4) : 'no peak in 10°–140°', unit: 'degrees (°)' },
        { name: 'Selection (extinction) rule', formula: RULE[p.struct], given: STRUCT_NAME[p.struct], calc: `allowed h² + k² + l² = ${SEQ[p.struct]}`, result: pk.map((e) => `(${e.hkl})`).slice(0, 6).join(' '), unit: '—' },
        { name: 'Relative intensity (approximate)', formula: 'I ∝ m × (1 + cos²2θ) / (sin²θ cosθ)', given: 'm = multiplicity of the {hkl} family', calc: pk.slice(0, 4).map((e) => `(${e.hkl}) m=${e.m}`).join(', ') || '—', result: pk.slice(0, 4).map((e) => fmt(e.I, 3)).join(', ') || '—', unit: '% of strongest' },
      ];
      const strongest = pk.reduce((b, e) => (!b || e.I > b.I ? e : b), null);
      const readouts = [
        { label: 'Structure', value: STRUCT_NAME[p.struct], tone: 'info' },
        { label: 'Peaks (10°–140°)', value: String(pk.length) },
        { label: 'First peak', value: f ? `(${f.hkl}) at ${fmt(f.tth, 4)}°` : 'none' },
        { label: 'Strongest', value: strongest ? `(${strongest.hkl})` : '—', tone: 'good' },
      ];
      return {
        formulas, readouts,
        state: { structure: STRUCT_NAME[p.struct], latticeConstant: `${p.a} Å`, wavelength: `${p.lam} Å`, selectionRule: RULE[p.struct], peaks: pk.slice(0, 8).map((e) => `(${e.hkl}) d=${fmt(e.d, 4)} Å 2θ=${fmt(e.tth, 4)}°`).join('; ') || 'none', numberOfPeaks: pk.length },
        explain: {
          what: `A ${STRUCT_NAME[p.struct]} crystal with a = ${p.a} Å and λ = ${p.lam} Å gives ${pk.length} peaks between 10° and 140°${f ? `, the first at 2θ = ${fmt(f.tth, 4)}° from the (${f.hkl}) planes` : ''}.`,
          why: `The detector records a peak whenever a family of planes (hkl) satisfies λ = 2d sinθ. In ${p.struct.toUpperCase()} some families cancel completely (${RULE[p.struct]}), so the sequence of peaks is a fingerprint of the structure.`,
          param: 'Structure (SC / BCC / FCC), lattice constant a and X-ray wavelength.',
          effect: 'A larger a (bigger d) moves every peak to smaller 2θ. A shorter wavelength (Mo Kα) squeezes the pattern to low angles and shows more peaks. Changing the structure changes which peaks are missing.',
        },
      };
    },
    steps(p, c) {
      const st = c.state;
      return [
        { title: 'X-ray tube produces a monochromatic beam', text: `Electrons hit a target that emits characteristic X-rays λ = ${p.lam} Å.` },
        { title: 'The beam strikes the powdered sample', text: 'A powder contains tiny crystals in every orientation, so every (hkl) family is somewhere at the right angle.' },
        { title: 'The detector sweeps through 2θ', text: 'The sample turns by θ while the detector turns by 2θ and records the diffracted intensity.' },
        { title: 'Peaks appear at the Bragg angles', text: `Only allowed reflections appear (${st.selectionRule}); ${st.numberOfPeaks} peaks lie between 10° and 140°.` },
        { title: 'Index the peaks with (h k l)', text: 'Each peak position gives d = λ/(2 sinθ) = a/√(h² + k² + l²).' },
        { title: 'Identify the structure', text: `Allowed h² + k² + l² for ${p.struct.toUpperCase()}: ${SEQ[p.struct]} — this sequence identifies the lattice.` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff');
      const pk = peaksFor(p);
      D.text(g, `X-ray diffractometer — ${STRUCT_NAME[p.struct]}, a = ${p.a} Å`, 20, 24, { size: 20, weight: 800 });
      // detector angle
      let det = 10;
      if (step === 2) det = 10 + 130 * prog; else if (step > 2) det = 75 - 65 * Math.cos(t * 0.35);
      const recordTo = step < 2 ? 10 : step === 2 ? det : 140;
      // schematic
      const O = [250, 200]; const R = 130;
      g.save(); g.beginPath(); g.arc(O[0], O[1], R, Math.PI, 2 * Math.PI); g.strokeStyle = C.line; g.lineWidth = 2; g.setLineDash([6, 6]); g.stroke(); g.restore();
      // tube
      D.rect(g, 30, O[1] - 22, 70, 44, { fill: '#334155', r: 8 }); D.text(g, 'X-ray tube', 65, O[1] + 40, { size: 16, weight: 800, align: 'center' });
      const bf = step === 0 ? prog : 1;
      D.line(g, 100, O[1], 100 + (O[0] - 100) * bf, O[1], { color: C.laser, width: 4 });
      if (bf >= 1) D.arrow(g, 100, O[1], 175, O[1], { color: C.laser, width: 4 });
      D.text(g, `λ = ${p.lam} Å`, 110, O[1] - 18, { size: 16, weight: 800, color: C.laser });
      if (step === 0) D.focus(g, 26, O[1] - 26, 78, 52, t);
      // sample (rotated by θ)
      const th = rad(det / 2);
      if (step >= 1) {
        const sx = Math.cos(th) * 40; const sy = -Math.sin(th) * 40;
        D.line(g, O[0] - sx, O[1] - sy, O[0] + sx, O[1] + sy, { color: C.ink, width: 8 });
        D.text(g, 'powder sample', O[0] + 10, O[1] + 34, { size: 16, weight: 800, align: 'center' });
        if (step === 1) D.focus(g, O[0] - 48, O[1] - 30, 96, 60, t);
        D.line(g, O[0], O[1], O[0] + R + 30, O[1], { color: C.laser, width: 1.5, dash: [5, 5], alpha: 0.6 });
      }
      if (step >= 2) {
        const a2 = rad(det); const Dp = [O[0] + R * Math.cos(a2), O[1] - R * Math.sin(a2)];
        D.line(g, O[0], O[1], Dp[0], Dp[1], { color: C.amber, width: 3 });
        g.save(); g.translate(Dp[0], Dp[1]); g.rotate(-a2); D.rect(g, -6, -16, 40, 32, { fill: C.green, r: 6 }); g.restore();
        D.text(g, 'detector', Dp[0] + 26 * Math.cos(a2), Dp[1] - 26 * Math.sin(a2) - 24, { size: 16, weight: 800, color: C.green, align: 'center', halo: true });
        g.save(); g.beginPath(); g.arc(O[0], O[1], 60, -a2, 0); g.strokeStyle = C.amber; g.lineWidth = 3; g.stroke(); g.restore();
        D.text(g, `2θ = ${fmt(det, 3)}°`, O[0] + 70, O[1] - 16, { size: 17, weight: 800, color: C.amber, halo: true });
      }
      // peak table
      const tx = 480; panel(g, tx, 40, 500, 260, 'Allowed reflections  (' + RULE[p.struct] + ')');
      const cols = [tx + 20, tx + 110, tx + 200, tx + 300, tx + 410];
      ['(h k l)', 'h²+k²+l²', 'd (Å)', '2θ (°)', 'I (%)'].forEach((h, i) => D.text(g, h, cols[i], 76, { size: 16, weight: 800, color: C.muted }));
      const shown = pk.slice(0, 7);
      shown.forEach((e, i) => {
        const y = 104 + i * 26; const on = step >= 3 && e.tth <= recordTo + 0.01;
        const col = on ? C.ink : C.faint;
        D.text(g, `(${e.hkl.split('').join(' ')})`, cols[0], y, { size: 16, weight: 800, color: on ? C.blue : C.faint });
        D.text(g, String(e.s), cols[1] + 20, y, { size: 16, weight: 700, color: col });
        D.text(g, fmt(e.d, 4), cols[2], y, { size: 16, weight: 700, color: col });
        D.text(g, fmt(e.tth, 4), cols[3], y, { size: 16, weight: 700, color: col });
        D.text(g, fmt(e.I, 3), cols[4], y, { size: 16, weight: 700, color: col });
      });
      if (pk.length > 7) D.text(g, `+ ${pk.length - 7} more peaks up to 140°`, tx + 20, 104 + 7 * 26 - 4, { size: 16, color: C.muted });
      if (step === 4) D.focus(g, tx + 8, 90, 484, Math.min(7, pk.length) * 26 + 4, t);
      // pattern
      const px = 70; const py = 350; const pw = 900; const ph = 140;
      const { X, Y } = plot(g, px, py, pw, ph, { xmin: 10, xmax: 140, ymin: 0, ymax: 118, xticks: [10, 30, 50, 70, 90, 110, 130], fx: (v) => `${v}°`, xlabel: '2θ (degrees)', ylabel: 'Intensity' });
      if (step >= 2) {
        const pts = []; const w = 0.35;
        for (let x = 10; x <= Math.min(recordTo, 140); x += 0.1) { let I = 1.5; pk.forEach((e) => { const z = (x - e.tth) / w; if (Math.abs(z) < 5) I += e.I * Math.exp(-z * z); }); pts.push([X(x), Y(Math.min(I, 118))]); }
        if (pts.length > 1) { g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip(); D.poly(g, pts, { stroke: C.blue, width: 2.2 }); g.restore(); }
        D.line(g, X(det), py, X(det), py + ph, { color: C.amber, width: 2, dash: [5, 4] });
      }
      if (step >= 3 && p.labels) {
        let lastX = -99; let lvl = 0;
        pk.forEach((e) => {
          if (e.tth > recordTo + 0.01) return;
          const x = X(e.tth); lvl = x - lastX < 46 ? (lvl + 1) % 3 : 0; if (x - lastX < 18) return; lastX = x;
          const y = Math.max(py - 12 - lvl * 0, Y(e.I) - 14 - lvl * 18);
          D.text(g, e.hkl, x, Math.max(py + 10, y), { size: 16, weight: 800, color: C.violet, align: 'center', halo: true });
        });
      }
      if (step === 5) D.tag(g, `h²+k²+l² sequence ${SEQ[p.struct]}  →  ${p.struct.toUpperCase()}`, 500, 318, { bg: C.green, size: 18, align: 'center' });
      if (step === 3) D.tag(g, `${pk.length} allowed peaks  (${RULE[p.struct]})`, 500, 318, { bg: C.blue, size: 18, align: 'center' });
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 9. Czochralski Crystal Growth Simulator
  // ─────────────────────────────────────────────────────────────
  function czCalc(p) {
    const L = p.rate * p.time; const Dm = p.dia / 1000; const V = Math.PI * (Dm / 2) ** 2 * (L / 1000); const m = RHO_SI * V;
    return { L, V, m, perMin: p.rate / 60, turns: p.rpm * 60 * p.time };
  }
  const CZ_STAGES = ['Molten silicon', 'Seed crystal', 'Rotation + pulling', 'Single crystal', 'Silicon ingot'];
  S['ep-czochralski'] = {
    approx: 'Drawing is schematic (not to scale; the ingot length on screen is compressed). Calculations give the cylindrical body only — neck, shoulder and tail are ignored. ρ(Si) = 2329 kg/m³, melting point 1414 °C.',
    params: [
      { key: 'rate', label: 'Pull rate', type: 'range', min: 30, max: 120, step: 1, default: 60, unit: 'mm/h', help: 'Typical 0.5–2 mm/min (30–120 mm/h).' },
      { key: 'rpm', label: 'Crystal rotation', type: 'range', min: 5, max: 30, step: 1, default: 15, unit: 'rpm' },
      { key: 'dia', label: 'Target diameter', type: 'select', options: [{ value: 100, label: '100 mm (4″)' }, { value: 150, label: '150 mm (6″)' }, { value: 200, label: '200 mm (8″)' }, { value: 300, label: '300 mm (12″)' }], default: 200 },
      { key: 'time', label: 'Growth time (body)', type: 'range', min: 1, max: 50, step: 0.5, default: 20, unit: 'h' },
    ],
    examples: [
      { label: '200 mm ingot — 60 mm/h for 20 h', values: { dia: 200, rate: 60, time: 20, rpm: 15 } },
      { label: '300 mm ingot — 40 mm/h for 40 h', values: { dia: 300, rate: 40, time: 40, rpm: 10 } },
      { label: '150 mm ingot — 80 mm/h for 15 h', values: { dia: 150, rate: 80, time: 15, rpm: 20 } },
      { label: '100 mm ingot — 100 mm/h for 10 h', values: { dia: 100, rate: 100, time: 10, rpm: 25 } },
    ],
    validate(p) {
      const q = czCalc(p); const w = [];
      if (q.L > 2500) w.push(`Ingot length ${fmt(q.L, 4)} mm is longer than a typical puller allows (≈ 2–2.5 m); the melt charge would also run out.`);
      if (p.dia >= 300 && p.rate > 72) w.push('Large (300 mm) crystals are normally pulled slower (about 0.5–1.2 mm/min) to keep the diameter and the defect density under control.');
      return w;
    },
    compute(p) {
      const q = czCalc(p);
      const formulas = [
        { name: 'Pull rate in mm/min', formula: 'v (mm/min) = v (mm/h) / 60', given: `v = ${p.rate} mm/h`, calc: `${p.rate} / 60`, result: fmt(q.perMin, 3), unit: 'mm/min' },
        { name: 'Ingot (body) length', formula: 'L = v × t', given: `v = ${p.rate} mm/h, t = ${p.time} h`, calc: `L = ${p.rate} × ${p.time}`, result: fmt(q.L, 4), unit: 'mm' },
        { name: 'Ingot volume', formula: 'V = π (D/2)² L', given: `D = ${p.dia} mm = ${p.dia / 1000} m, L = ${fmt(q.L / 1000, 4)} m`, calc: `V = π × (${p.dia / 2000})² × ${fmt(q.L / 1000, 4)}`, result: fmt(q.V, 4), unit: 'm³' },
        { name: 'Ingot mass', formula: 'm = ρ_Si × V', given: 'ρ_Si = 2329 kg/m³', calc: `m = 2329 × ${fmt(q.V, 4)}`, result: fmt(q.m, 4), unit: 'kg' },
        { name: 'Number of crystal rotations', formula: 'N = rpm × 60 × t', given: `${p.rpm} rpm, t = ${p.time} h`, calc: `N = ${p.rpm} × 60 × ${p.time}`, result: fmt(q.turns, 4), unit: 'turns' },
      ];
      const readouts = [
        { label: 'Pull rate', value: `${fmt(q.perMin, 3)} mm/min`, tone: 'info' },
        { label: 'Ingot length L', value: `${fmt(q.L, 4)} mm` },
        { label: 'Diameter', value: `${p.dia} mm` },
        { label: 'Ingot mass', value: `${fmt(q.m, 3)} kg`, tone: 'good' },
      ];
      return {
        formulas, readouts,
        state: { pullRate: `${p.rate} mm/h (${fmt(q.perMin, 3)} mm/min)`, rotation: `${p.rpm} rpm (crucible rotates the opposite way)`, diameter: `${p.dia} mm`, growthTime: `${p.time} h`, ingotLength: `${fmt(q.L, 4)} mm`, ingotMass: `${fmt(q.m, 4)} kg`, meltTemperature: '1414 °C (melting point of Si)' },
        explain: {
          what: `A <100> seed is dipped into molten silicon (1414 °C) and pulled up at ${p.rate} mm/h while rotating at ${p.rpm} rpm. In ${p.time} h a ${p.dia} mm single-crystal ingot ${fmt(q.L, 4)} mm long (≈ ${fmt(q.m, 3)} kg) grows.`,
          why: 'Silicon atoms from the melt freeze onto the seed and copy its crystal orientation, so the whole ingot is one crystal. Rotating the crystal and crucible in opposite directions stirs the melt and keeps the temperature and dopant uniform; the pull rate and heater power set the diameter.',
          param: 'Pull rate, rotation speed, target diameter and growth time.',
          effect: 'Longer time or faster pulling → longer, heavier ingot (L = v·t, m ∝ D²L). A larger diameter needs a slower pull rate; pulling too fast makes the crystal thinner and can create defects.',
        },
      };
    },
    steps(p, c) {
      const st = c.state;
      return [
        { title: 'Molten silicon', text: 'High-purity polysilicon is melted in a quartz crucible by graphite heaters, just above 1414 °C, in argon.' },
        { title: 'Seed crystal', text: 'A small single-crystal seed (e.g. <100>) is lowered until it just touches the melt surface.' },
        { title: 'Rotation + pulling', text: `The seed is pulled up at ${st.pullRate} while rotating at ${p.rpm} rpm; the crucible turns the other way. A thin neck removes dislocations.` },
        { title: 'Single crystal grows', text: `The diameter widens (shoulder) to ${p.dia} mm and the body grows with the seed's orientation.` },
        { title: 'Silicon ingot', text: `A tail is formed and the ingot is lifted out: L = ${st.ingotLength}, m = ${st.ingotMass}.` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff');
      const q = czCalc(p);
      D.text(g, 'Czochralski (CZ) crystal puller — schematic', 20, 24, { size: 20, weight: 800 });
      const cx = 310; const W = p.dia * 0.55; const Bpx = clamp(q.L * 0.1, 20, 190);
      const neck = 40; const sh = W * 0.35; const tail = W * 0.4;
      // growth amount
      let G = 0; let lift = 0;
      if (step === 2) G = neck * ease(prog);
      if (step === 3) G = neck + (sh + Bpx) * ease(prog);
      if (step >= 4) { G = neck + sh + Bpx + tail * ease(Math.min(1, prog * 2)); lift = 30 * ease(clamp(prog * 2 - 1, 0, 1)); }
      const total = neck + sh + Bpx + tail;
      const ym = 380 + 30 * (G / total);
      // chamber
      D.rect(g, 60, 44, 500, 496, { fill: '#f1f5f9', stroke: '#64748b', width: 3, r: 10 });
      D.text(g, 'Argon atmosphere', 76, 64, { size: 16, weight: 700, color: C.muted });
      // heaters
      const glow = 0.75 + 0.25 * Math.sin(t * 3);
      [[110, 330], [488, 330]].forEach(([x, y]) => D.rect(g, x, y, 22, 180, { fill: D.heat(0.8 * glow + 0.1), r: 4 }));
      D.text(g, 'graphite heater', 499, 318, { size: 16, weight: 800, color: C.orange, align: 'center' });
      // crucible
      D.rect(g, 150, 330, 320, 184, { fill: '#e2e8f0', stroke: '#94a3b8', width: 4, r: 18 });
      D.rect(g, 158, ym, 304, 506 - ym, { fill: D.heat(0.78), r: 12 });
      D.line(g, 158, ym, 462, ym, { color: '#fde68a', width: 2 });
      D.text(g, 'Molten Si  1414 °C', 310, 470, { size: 18, weight: 800, color: '#fff', align: 'center' });
      D.text(g, 'quartz crucible', 310, 530, { size: 16, weight: 800, color: C.muted, align: 'center' });
      if (step === 0) D.focus(g, 150, 330, 320, 184, t);
      // crystal
      const prof = [[0, 3], [neck, 3], [neck + sh, W / 2], [neck + sh + Bpx, W / 2], [total, W * 0.12]];
      const wAt = (s) => { for (let i = 1; i < prof.length; i++) if (s <= prof[i][0]) { const k = (s - prof[i - 1][0]) / (prof[i][0] - prof[i - 1][0] || 1); return lerp(prof[i - 1][1], prof[i][1], k); } return prof[prof.length - 1][1]; };
      const bottom = ym - lift; const topY = bottom - G;
      let seedBottom = topY;
      if (step <= 1) seedBottom = step === 0 ? 150 : lerp(150, ym, ease(prog));
      D.line(g, cx, 44, cx, seedBottom - 22, { color: '#475569', width: 4 });
      D.rect(g, cx - 12, seedBottom - 34, 24, 14, { fill: '#475569', r: 3 });
      D.rect(g, cx - 5, seedBottom - 22, 10, 22, { fill: '#94a3b8', stroke: '#475569', width: 1.5 });
      if (step >= 1 && step <= 2) D.text(g, 'seed crystal <100>', cx + 16, seedBottom - 14, { size: 16, weight: 800, color: C.ink, halo: true });
      if (step === 1) D.focus(g, cx - 20, seedBottom - 40, 40, 44, t);
      if (G > 0.5) {
        const left = []; const right = [];
        for (let s = 0; s <= G; s += 2) { const w = wAt(s); left.push([cx - w, topY + s]); right.push([cx + w, topY + s]); }
        const w2 = wAt(G); left.push([cx - w2, bottom]); right.push([cx + w2, bottom]);
        const outline = left.concat(right.reverse());
        D.poly(g, outline, { close: true, fill: '#cbd5e1', stroke: '#475569', width: 2 });
        g.save(); g.beginPath(); outline.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
        const period = 26; const off = (t * p.rpm * 1.2) % period;
        for (let x = cx - W / 2 - period; x < cx + W / 2 + period; x += period) D.rect(g, x + off, topY, 8, G + 2, { fill: '#ffffff', alpha: 0.35 });
        g.restore();
        if (step >= 3) {
          const lx = cx + W / 2 + 14;
          [['neck', topY + neck / 2], ['shoulder', topY + neck + sh / 2], ['body', topY + neck + sh + Math.min(Bpx, G - neck - sh) / 2]].forEach(([s, y]) => { if (y < bottom) D.text(g, s, lx, y, { size: 16, weight: 800, color: C.muted, halo: true }); });
          if (step >= 4) D.text(g, 'tail', lx, bottom - tail / 2, { size: 16, weight: 800, color: C.muted, halo: true });
        }
      }
      // rotation + pulling indicators
      if (step >= 2) {
        const ay = seedBottom - 60;
        g.save(); g.beginPath(); g.ellipse(cx, ay, 34, 10, 0, 0.2, Math.PI * 1.8); g.strokeStyle = C.blue; g.lineWidth = 3; g.stroke(); g.restore();
        D.arrow(g, cx + 26, ay - 7, cx + 34, ay - 1, { color: C.blue, width: 3 });
        D.text(g, `${p.rpm} rpm`, cx - 44, ay, { size: 16, weight: 800, color: C.blue, align: 'right', halo: true });
        D.arrow(g, cx + 50, ay + 30, cx + 50, ay - 20, { color: C.green, width: 4 });
        D.text(g, `pull ${p.rate} mm/h`, cx + 62, ay + 6, { size: 16, weight: 800, color: C.green, halo: true });
        g.save(); g.beginPath(); g.ellipse(310, 522, 120, 10, 0, Math.PI * 1.15, Math.PI * 1.85, false); g.restore();
        D.arrow(g, 390, 524, 230, 524, { color: C.violet, width: 3 });
        D.text(g, 'crucible rotates opposite', 310, 548 - 12, { size: 16, weight: 800, color: C.violet, align: 'center', halo: true });
        if (step === 2) D.focus(g, cx - 60, ay - 40, 200, ym - ay + 50, t);
      }
      if (step === 3) D.focus(g, cx - W / 2 - 10, topY - 6, W + 20, G + 12, t);
      if (step >= 4) {
        const yb1 = topY + neck + sh; const yb2 = yb1 + Bpx; const xl = cx - W / 2 - 18;
        D.arrow(g, xl, (yb1 + yb2) / 2, xl, yb1, { color: C.ink, width: 2 }); D.arrow(g, xl, (yb1 + yb2) / 2, xl, yb2, { color: C.ink, width: 2 });
        D.text(g, `L = ${fmt(q.L, 4)} mm`, xl - 8, (yb1 + yb2) / 2, { size: 17, weight: 800, align: 'right', halo: true });
        D.arrow(g, cx, yb1 + 14, cx - W / 2, yb1 + 14, { color: C.ink, width: 2 }); D.arrow(g, cx, yb1 + 14, cx + W / 2, yb1 + 14, { color: C.ink, width: 2 });
        D.text(g, `D = ${p.dia} mm`, cx, yb1 + 32, { size: 17, weight: 800, align: 'center', halo: true });
      }
      // process flow panel
      const fx = 590; panel(g, fx, 44, 390, 496, 'Process flow');
      CZ_STAGES.forEach((s, i) => {
        const y = 76 + i * 56; const on = i === step; const done = i < step;
        D.rect(g, fx + 16, y, 358, 40, { fill: on ? '#fef9c3' : done ? C.greenSoft : '#ffffff', stroke: on ? C.hi : done ? C.green : C.line, width: on ? 3 : 1.5, r: 10 });
        D.text(g, `${i + 1}. ${s}`, fx + 30, y + 20, { size: 18, weight: 800, color: on || done ? C.ink : C.muted });
        if (i < 4) D.arrow(g, fx + 195, y + 40, fx + 195, y + 55, { color: C.muted, width: 2, head: 8 });
      });
      const rows = [
        [`Pull rate v = ${p.rate} mm/h = ${fmt(q.perMin, 3)} mm/min`, C.green],
        [`L = v × t = ${p.rate} × ${p.time} = ${fmt(q.L, 4)} mm`, C.ink],
        [`m = ρπ(D/2)²L = ${fmt(q.m, 4)} kg`, C.blue],
        [`Rotation ${p.rpm} rpm → ${fmt(q.turns, 4)} turns`, C.violet],
      ];
      rows.forEach(([s, col], i) => fitText(g, s, fx + 18, 380 + i * 38, 356, { size: 18, weight: 800, color: col }));
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 10. Silicon Wafer Formation Simulator
  // ─────────────────────────────────────────────────────────────
  function waferCalc(p) {
    const pitch = p.t + p.kerf; const N = Math.max(0, Math.floor((p.L * 1000) / pitch)); const kerfPct = (100 * p.kerf) / pitch;
    const area = Math.PI * (p.dia / 2000) ** 2; const mW = RHO_SI * area * p.t * 1e-6; const mK = RHO_SI * area * p.kerf * 1e-6 * N;
    return { pitch, N, kerfPct, mW, mK };
  }
  const WF_STAGES = ['Ingot', 'Grind', 'Slice', 'Lap', 'Etch', 'Polish', 'Clean'];
  S['ep-wafer'] = {
    approx: 'Process pictures are schematic. Wafer count uses N = ⌊L / (t + kerf)⌋ with t the as-cut thickness; material removed later by lapping, etching and polishing (tens of µm) is not subtracted.',
    params: [
      { key: 'L', label: 'Usable ingot length L', type: 'range', min: 100, max: 2000, step: 10, default: 1000, unit: 'mm' },
      { key: 't', label: 'Wafer thickness t', type: 'range', min: 200, max: 1000, step: 5, default: 725, unit: 'µm', help: 'SEMI standard: 725 µm for 200 mm, 775 µm for 300 mm.' },
      { key: 'kerf', label: 'Kerf loss (saw cut width)', type: 'range', min: 80, max: 400, step: 5, default: 180, unit: 'µm', help: 'Wire saw ≈ 120–200 µm, ID diamond saw ≈ 300 µm.' },
      { key: 'dia', label: 'Wafer diameter', type: 'select', options: [{ value: 100, label: '100 mm' }, { value: 150, label: '150 mm' }, { value: 200, label: '200 mm' }, { value: 300, label: '300 mm' }], default: 200 },
    ],
    examples: [
      { label: '200 mm wafers, wire saw (725 µm, kerf 180 µm)', values: { dia: 200, t: 725, kerf: 180, L: 1000 } },
      { label: '300 mm wafers, diamond wire (775 µm, kerf 150 µm)', values: { dia: 300, t: 775, kerf: 150, L: 1500 } },
      { label: '150 mm wafers (675 µm, kerf 200 µm)', values: { dia: 150, t: 675, kerf: 200, L: 800 } },
      { label: '100 mm wafers, ID diamond saw (525 µm, kerf 300 µm)', values: { dia: 100, t: 525, kerf: 300, L: 500 } },
    ],
    validate(p) { const q = waferCalc(p); const w = []; if (q.kerfPct > 35) w.push(`Kerf loss is ${fmt(q.kerfPct, 3)} % of the silicon — a thinner saw wire would save material.`); return w; },
    compute(p) {
      const q = waferCalc(p);
      const formulas = [
        { name: 'Pitch (silicon used per wafer)', formula: 'pitch = t + kerf', given: `t = ${p.t} µm, kerf = ${p.kerf} µm`, calc: `${p.t} + ${p.kerf}`, result: String(q.pitch), unit: 'µm' },
        { name: 'Number of wafers', formula: 'N = ⌊L / (t + kerf)⌋', given: `L = ${p.L} mm = ${p.L * 1000} µm`, calc: `N = ⌊${p.L * 1000} / ${q.pitch}⌋ = ⌊${((p.L * 1000) / q.pitch).toFixed(2)}⌋`, result: String(q.N), unit: 'wafers' },
        { name: 'Material lost as kerf', formula: 'kerf % = kerf / (t + kerf) × 100', given: `kerf = ${p.kerf} µm`, calc: `${p.kerf} / ${q.pitch} × 100`, result: fmt(q.kerfPct, 3), unit: '%' },
        { name: 'Mass of one wafer', formula: 'm = ρ_Si π (D/2)² t', given: `ρ = 2329 kg/m³, D = ${p.dia} mm, t = ${p.t} µm`, calc: `m = 2329 × π × (${p.dia / 2000})² × ${p.t}×10⁻⁶`, result: fmt(q.mW * 1000, 4), unit: 'g' },
      ];
      const readouts = [
        { label: 'Wafers per ingot', value: String(q.N), tone: 'good' },
        { label: 'Pitch t + kerf', value: `${q.pitch} µm` },
        { label: 'Kerf loss', value: `${fmt(q.kerfPct, 3)} %`, tone: q.kerfPct > 25 ? 'warn' : 'info' },
        { label: 'Wafer mass', value: `${fmt(q.mW * 1000, 3)} g` },
      ];
      return {
        formulas, readouts,
        state: { ingotLength: `${p.L} mm`, diameter: `${p.dia} mm`, waferThickness: `${p.t} µm`, kerf: `${p.kerf} µm`, wafers: q.N, kerfLossPercent: `${fmt(q.kerfPct, 3)} %`, siliconLostToKerf: `${fmt(q.mK, 3)} kg`, waferMass: `${fmt(q.mW * 1000, 3)} g` },
        explain: {
          what: `A ${p.L} mm long, ${p.dia} mm ingot is sliced into ${q.N} wafers of ${p.t} µm. Each cut destroys ${p.kerf} µm of silicon, so ${fmt(q.kerfPct, 3)} % (${fmt(q.mK, 3)} kg) of the ingot becomes sawdust.`,
          why: 'Every wafer uses its own thickness plus the width of the saw cut (kerf). The rough sawn surfaces are then flattened (lapping), the damaged layer is removed chemically (etching) and one side is mirror-polished for making chips.',
          param: 'Ingot length, wafer thickness, kerf loss and diameter.',
          effect: 'Thinner wafers or a thinner saw → more wafers per ingot. A thicker kerf wastes more silicon. Larger diameters need thicker wafers (725 µm → 775 µm) so they do not bend or break.',
        },
      };
    },
    steps(p, c) {
      const st = c.state; const notch = p.dia >= 200;
      return [
        { title: 'Single-crystal ingot', text: `The CZ ingot has a cone at each end and a slightly uneven diameter.` },
        { title: 'Crop the ends and grind to diameter', text: `The seed and tail cones are cut off and the ingot is ground to exactly ${p.dia} mm; a ${notch ? 'notch' : 'flat'} marks the crystal orientation.` },
        { title: 'Slice with a wire saw', text: `The ingot is cut into ${p.t} µm slices; each cut removes ${p.kerf} µm (kerf) → ${st.wafers} wafers.` },
        { title: 'Lapping', text: 'Both faces are ground flat and parallel with an abrasive slurry, removing saw marks.' },
        { title: 'Etching', text: 'A chemical etch removes the damaged surface layer left by sawing and lapping.' },
        { title: 'Polishing', text: 'Chemical-mechanical polishing gives a flat, mirror-smooth surface.' },
        { title: 'Cleaning & inspection → wafers', text: `Wafers are cleaned, inspected for flatness and particles, and packed: ${st.wafers} wafers per ingot.` },
      ];
    },
    stepDuration: 4,
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#ffffff');
      const q = waferCalc(p);
      D.text(g, 'From ingot to polished wafers', 20, 24, { size: 20, weight: 800 });
      // ingot
      const R = p.dia * 0.22; const cy = 150; const x0 = 70; const lenPx = clamp(p.L * 0.27, 60, 520); const ex = R * 0.32;
      const cropped = step >= 1; const coneL = R * 0.9;
      const cf = step === 1 ? ease(prog) : step > 1 ? 1 : 0;
      if (!cropped || cf < 1) {
        const al = 1 - cf; const sh = 40 * cf;
        D.poly(g, [[x0 - sh, cy - R], [x0 - coneL - sh, cy - 6], [x0 - coneL - sh, cy + 6], [x0 - sh, cy + R]], { fill: '#94a3b8', close: true, alpha: al, stroke: '#475569' });
        D.poly(g, [[x0 + lenPx + sh, cy - R], [x0 + lenPx + coneL + sh, cy - R * 0.2], [x0 + lenPx + coneL + sh, cy + R * 0.2], [x0 + lenPx + sh, cy + R]], { fill: '#94a3b8', close: true, alpha: al, stroke: '#475569' });
      }
      // how many visible slices already separated (slicing step)
      const sliceF = step === 2 ? ease(prog) : step > 2 ? 1 : 0;
      const bodyEnd = x0 + lenPx * (1 - 0.35 * sliceF);
      const grad = g.createLinearGradient(0, cy - R, 0, cy + R); grad.addColorStop(0, '#e2e8f0'); grad.addColorStop(0.35, '#f8fafc'); grad.addColorStop(1, '#64748b');
      g.save(); g.fillStyle = grad; g.beginPath();
      if (!cropped) { for (let x = x0; x <= bodyEnd; x += 6) g.lineTo(x, cy - R - 3 * Math.sin(x * 0.08)); for (let x = bodyEnd; x >= x0; x -= 6) g.lineTo(x, cy + R + 3 * Math.sin(x * 0.08)); }
      else g.rect(x0, cy - R, bodyEnd - x0, 2 * R);
      g.fill(); g.strokeStyle = '#475569'; g.lineWidth = 2; g.stroke(); g.restore();
      g.save(); g.beginPath(); g.ellipse(bodyEnd, cy, ex, R, 0, 0, Math.PI * 2); g.fillStyle = '#cbd5e1'; g.fill(); g.strokeStyle = '#475569'; g.lineWidth = 2; g.stroke(); g.restore();
      if (cropped) {
        if (p.dia >= 200) D.circle(g, bodyEnd, cy + R - 3, 4, { fill: '#ffffff', stroke: '#475569', width: 1.5 });
        else D.line(g, bodyEnd - ex * 0.5, cy + R * 0.86, bodyEnd + ex * 0.5, cy + R * 0.86, { color: '#475569', width: 3 });
        D.text(g, p.dia >= 200 ? 'notch' : 'flat', bodyEnd + ex + 8, cy + R - 4, { size: 16, weight: 800, color: C.muted });
      }
      D.text(g, `L = ${p.L} mm,  D = ${p.dia} mm`, x0, cy + R + 26, { size: 17, weight: 800 });
      if (step === 0) D.focus(g, x0 - coneL - 6, cy - R - 6, lenPx + 2 * coneL + 12, 2 * R + 12, t);
      if (step === 1) { D.focus(g, x0 - 10, cy - R - 10, lenPx + 20, 2 * R + 20, t); D.text(g, 'grind ↻', x0 + lenPx / 2, cy - R - 22, { size: 17, weight: 800, color: C.orange, align: 'center' }); }
      // slicing
      if (step >= 2) {
        const nShow = Math.round(14 * sliceF); const gap = 12;
        for (let i = 0; i < nShow; i++) {
          const x = bodyEnd + 26 + i * gap; if (x > 640) break;
          g.save(); g.beginPath(); g.ellipse(x, cy, ex, R, 0, 0, Math.PI * 2); g.fillStyle = '#e2e8f0'; g.fill(); g.strokeStyle = '#475569'; g.lineWidth = 1.5; g.stroke(); g.restore();
        }
        if (step === 2) {
          const wx = bodyEnd - 4 + 3 * Math.sin(t * 20);
          D.line(g, wx, cy - R - 30, wx, cy + R + 30, { color: C.red, width: 2 });
          D.text(g, 'wire saw', wx, cy - R - 42, { size: 16, weight: 800, color: C.red, align: 'center' });
          D.focus(g, bodyEnd - 30, cy - R - 12, 300, 2 * R + 24, t);
        }
      }
      // right panel: close-up
      const px = 668; panel(g, px, 44, 312, 250, step === 2 ? 'Slicing — to scale' : step >= 3 ? 'Wafer surface (edge view)' : 'Cross-section');
      if (step <= 1) {
        g.save(); g.beginPath(); g.ellipse(px + 156, 170, 80, 80, 0, 0, Math.PI * 2); g.fillStyle = '#e2e8f0'; g.fill(); g.strokeStyle = '#475569'; g.lineWidth = 2; g.stroke(); g.restore();
        if (step === 1) { if (p.dia >= 200) D.circle(g, px + 156, 250, 6, { fill: '#f8fafc', stroke: '#475569', width: 2 }); else D.line(g, px + 116, 239, px + 196, 239, { color: '#475569', width: 4 }); }
        D.text(g, `Ø ${p.dia} mm`, px + 156, 170, { size: 20, weight: 800, align: 'center' });
      } else if (step === 2) {
        const k = 250 / (3 * q.pitch); let x = px + 30;
        for (let i = 0; i < 3; i++) {
          D.rect(g, x, 90, p.t * k, 150, { fill: '#cbd5e1', stroke: '#475569', width: 1.5 });
          D.rect(g, x + p.t * k, 90, p.kerf * k, 150, { fill: C.redSoft });
          x += q.pitch * k;
        }
        D.text(g, `wafer ${p.t} µm`, px + 30, 258, { size: 16, weight: 800 });
        D.text(g, `kerf ${p.kerf} µm`, px + 300, 258, { size: 16, weight: 800, color: C.red, align: 'right' });
        D.text(g, `${fmt(q.kerfPct, 3)} % of Si lost as kerf`, px + 156, 278, { size: 16, weight: 800, color: C.red, align: 'center' });
      } else {
        const rough = step === 3 ? lerp(10, 2, ease(prog)) : step === 4 ? lerp(2, 1, ease(prog)) : step === 5 ? lerp(1, 0, ease(prog)) : 0;
        const tpx = 90; const y0 = 150;
        g.save(); g.beginPath(); g.moveTo(px + 20, y0 + tpx);
        for (let x = 0; x <= 272; x += 3) g.lineTo(px + 20 + x, y0 + (step <= 3 ? rough * Math.sin(x * 0.7) * Math.cos(x * 0.13) : rough * Math.sin(x * 0.3)));
        g.lineTo(px + 292, y0 + tpx); g.closePath();
        const gr = g.createLinearGradient(0, y0, 0, y0 + tpx); gr.addColorStop(0, step >= 5 ? '#f8fafc' : '#cbd5e1'); gr.addColorStop(1, '#64748b'); g.fillStyle = gr; g.fill(); g.strokeStyle = '#475569'; g.lineWidth = 2; g.stroke(); g.restore();
        if (step === 4) { D.rect(g, px + 20, y0 - 3, 272, 8, { fill: C.amber, alpha: 0.4 * (1 - prog) }); D.text(g, 'damaged layer etched away', px + 156, y0 - 30, { size: 16, weight: 800, color: C.amber, align: 'center' }); }
        if (step === 3) D.text(g, 'abrasive slurry → flat & parallel', px + 156, y0 - 30, { size: 16, weight: 800, color: C.orange, align: 'center' });
        if (step >= 5) { D.line(g, px + 60, y0 - 50, px + 150, y0, { color: C.cyan, width: 2.5 }); D.line(g, px + 150, y0, px + 240, y0 - 50, { color: C.cyan, width: 2.5 }); D.text(g, 'mirror finish', px + 156, y0 - 60, { size: 16, weight: 800, color: C.cyan, align: 'center' }); }
        if (step === 6) D.text(g, '✔ flatness, particles, thickness', px + 156, y0 + tpx + 30, { size: 16, weight: 800, color: C.green, align: 'center' });
        if (step !== 6) D.text(g, `t = ${p.t} µm`, px + 156, y0 + tpx + 30, { size: 17, weight: 800, align: 'center' });
      }
      // wafer stack
      const sx = 60; const sy = 470;
      panel(g, 30, 310, 460, 180, null);
      const nDraw = step >= 6 ? Math.min(22, q.N) : step >= 2 ? Math.min(22, Math.round(q.N * sliceF)) : 0;
      for (let i = 0; i < nDraw; i++) {
        const y = sy - i * 6 - (step === 6 ? 0 : 0);
        g.save(); g.beginPath(); g.ellipse(sx + 110, y, 100, 24, 0, 0, Math.PI * 2); g.fillStyle = step >= 5 ? '#f1f5f9' : '#cbd5e1'; g.fill(); g.strokeStyle = '#64748b'; g.lineWidth = 1; g.stroke(); g.restore();
      }
      D.text(g, step >= 2 ? `N = ⌊L/(t + kerf)⌋` : 'Wafers: —', 290, 350, { size: 17, weight: 800 });
      D.text(g, step >= 2 ? `= ⌊${p.L * 1000} µm / ${q.pitch} µm⌋` : '', 290, 380, { size: 16, weight: 700 });
      D.text(g, step >= 2 ? `${q.N} wafers` : '', 290, 420, { size: 26, weight: 800, color: C.green });
      D.text(g, step >= 2 ? `each ≈ ${fmt(q.mW * 1000, 3)} g` : '', 290, 456, { size: 16, weight: 700, color: C.muted });
      if (step === 6) D.focus(g, 36, 316, 448, 168, t);
      // numbers
      panel(g, 510, 310, 470, 180, 'Silicon budget');
      [[`Pitch = t + kerf = ${q.pitch} µm`, C.ink], [`Kerf loss = ${fmt(q.kerfPct, 3)} % (${fmt(q.mK, 3)} kg of Si)`, C.red], [`Wafer: Ø ${p.dia} mm × ${p.t} µm`, C.blue], [p.dia >= 200 ? 'Orientation mark: notch' : 'Orientation mark: flat', C.muted]]
        .forEach(([s, col], i) => fitText(g, s, 526, 362 + i * 32, 440, { size: 18, weight: 800, color: col }));
      // flow chips
      WF_STAGES.forEach((s, i) => {
        const w = 130; const x = 30 + i * 136; const on = i === step; const done = i < step;
        D.rect(g, x, 506, w, 40, { fill: on ? '#fef9c3' : done ? C.greenSoft : '#ffffff', stroke: on ? C.hi : done ? C.green : C.line, width: on ? 3 : 1.5, r: 10 });
        D.text(g, `${i + 1}. ${s}`, x + w / 2, 526, { size: 17, weight: 800, align: 'center', color: on || done ? C.ink : C.muted });
      });
    },
  };
})();
