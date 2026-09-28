'use strict';

/* Engineering Graphics — Unit 1: Geometrical Construction and Dimensioning (BIS SP 46). */
(function () {
  const S = (window.EGSims = window.EGSims || {});
  const D = window.EPDraw; const G = window.EGGeom; const { C, fmt, clamp } = D;

  // ─── 2-D vector helpers (model millimetres, y up) ───
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const crs = (a, b) => a[0] * b[1] - a[1] * b[0];
  const len = (a) => Math.hypot(a[0], a[1]);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const nrm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const ang = (a) => Math.atan2(a[1], a[0]);
  const dir = (t) => [Math.cos(t), Math.sin(t)];
  const rot = (a, t) => [a[0] * Math.cos(t) - a[1] * Math.sin(t), a[0] * Math.sin(t) + a[1] * Math.cos(t)];
  const perp = (a) => [-a[1], a[0]];
  const DEG = 180 / Math.PI; const RAD = Math.PI / 180;
  const wrapPi = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a <= -Math.PI) a += 2 * Math.PI; return a; };
  const mm = (x) => { const r = Math.round(x * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); };
  const dg = (x) => `${mm(x)}°`;
  /** Circle–circle intersection; first point lies to the LEFT of c1→c2. */
  function cci(c1, r1, c2, r2) {
    const d = dist(c1, c2); if (d < 1e-9 || d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return null;
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d); const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const u = nrm(sub(c2, c1)); const m = add(c1, mul(u, a)); const q = perp(u);
    return [add(m, mul(q, h)), sub(m, mul(q, h))];
  }
  /** Line–line intersection (point + direction). */
  function lli(p1, d1, p2, d2) { const den = crs(d1, d2); if (Math.abs(den) < 1e-9) return null; return add(p1, mul(d1, crs(sub(p2, p1), d2) / den)); }
  function segDist(p, a, b) { const ab = sub(b, a); const L2 = dot(ab, ab) || 1e-9; const t = clamp(dot(sub(p, a), ab) / L2, 0, 1); return dist(p, add(a, mul(ab, t))); }
  function wrapText(g, str, maxW, size, weight) {
    const words = String(str).split(' '); const lines = []; let cur = '';
    words.forEach((w) => { const tr = cur ? cur + ' ' + w : w; if (D.textWidth(g, tr, size, weight || 600) > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; });
    if (cur) lines.push(cur); return lines;
  }
  /** Screen arrowhead: filled, length L, width L/3 (BIS 3 : 1). */
  function head(g, tip, dx, dy, L, col) {
    const l = Math.hypot(dx, dy) || 1; const ux = dx / l, uy = dy / l; const bx = tip[0] - ux * L, by = tip[1] - uy * L; const w = L / 6;
    g.save(); g.beginPath(); g.moveTo(tip[0], tip[1]); g.lineTo(bx - uy * w, by + ux * w); g.lineTo(bx + uy * w, by - ux * w); g.closePath(); g.fillStyle = col; g.fill(); g.restore();
  }
  function snapMarker(g, x, y, label, col) {
    col = col || '#16a34a';
    g.save(); g.strokeStyle = col; g.lineWidth = 2.2; g.strokeRect(x - 7, y - 7, 14, 14); g.restore();
    D.tag(g, label, x + 12, y - 18, { bg: col, size: 14 });
  }

  // ═══════════════════════════════════ 1. GEOMETRICAL CONSTRUCTION ═══════════════════════════════════
  const GK = 4, GOX = 40, GOY = 530; // 4 px per mm, model origin at the lower-left of the sheet
  const gX = (x) => GOX + x * GK; const gY = (y) => GOY - y * GK; const gP = (p) => [gX(p[0]), gY(p[1])];
  const CMODES = [
    { key: 'bisect', label: 'Bisect a line (perpendicular bisector)' },
    { key: 'angle', label: 'Bisect an angle' },
    { key: 'divide', label: 'Divide a line into n equal parts' },
    { key: 'polyc', label: 'Regular polygon inscribed in a circle' },
    { key: 'polys', label: 'Regular polygon on a given side (general method)' },
    { key: 'circ3', label: 'Circle through three points' },
    { key: 'tangent', label: 'Tangents from an external point to a circle' },
    { key: 'fillet', label: 'Arc tangent to two lines (fillet of radius r)' },
  ];
  const MODE_NAME = Object.fromEntries(CMODES.map((m) => [m.key, m.label]));
  const PDEF = {
    bisect: { A: [30, 50], B: [120, 75] },
    angle: { V: [25, 25], A: [140, 25], B: [90, 110] },
    divide: { A: [25, 95], B: [135, 95] },
    polyc: { O: [80, 64] },
    polys: { A: [55, 15], B: [95, 15] },
    circ3: { A: [25, 30], B: [130, 45], C: [70, 110] },
    tangent: { O: [45, 64], P: [140, 90] },
    fillet: { V: [20, 20], A: [150, 20], B: [85, 110] },
  };
  const POLYN = { 3: 'equilateral triangle', 4: 'square', 5: 'regular pentagon', 6: 'regular hexagon', 7: 'regular heptagon', 8: 'regular octagon', 9: 'regular nonagon', 10: 'regular decagon' };
  const LET = 'ABCDEFGHIJKL';
  const clonePts = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [v[0], v[1]]]));
  const allDefaults = () => Object.fromEntries(Object.entries(PDEF).map(([k, v]) => [k, clonePts(v)]));
  const getPts = (p, ui) => (ui && ui.pts && ui.pts[p.mode]) || PDEF[p.mode] || PDEF.bisect;
  const ptStr = (P) => Object.entries(P).map(([k, v]) => `${k}(${mm(v[0])}, ${mm(v[1])})`).join(', ');

  function builder() {
    const els = []; const keys = [];
    return { els, keys, add(s, e) { e.s = s; els.push(e); return e; }, key(p, name) { if (p) keys.push({ p, name }); } };
  }
  const arcAround = (c, r, target, half) => { const a = ang(sub(target, c)); return { t: 'arc', c, r, a0: a - half, a1: a + half }; };

  /** Builds the complete construction of the current mode. */
  function buildC(p, ui) {
    const mode = MODE_NAME[p.mode] ? p.mode : 'bisect'; const P = getPts({ mode }, ui); const b = builder();
    const out = { mode, P, b, steps: [], rows: [], chips: [], formulas: [], warn: [], state: {}, explain: {} };
    FN[mode](P, p, b, out);
    return out;
  }
  const FN = {};

  FN.bisect = (P, p, b, o) => {
    const A = P.A, B = P.B; const L = dist(A, B); const R = Math.max(Math.round(0.7 * L), Math.ceil(L / 2) + 1);
    const I = cci(A, R, B, R) || [A, B]; const Pp = I[0], Q = I[1]; const M = mid(A, B); const u = nrm(sub(B, A));
    b.add(0, { t: 'seg', a: A, b: B, st: 'given' });
    b.add(0, { t: 'pt', p: A, name: 'A', dir: mul(u, -1), drag: 'A' }); b.add(0, { t: 'pt', p: B, name: 'B', dir: u, drag: 'B' });
    b.add(1, Object.assign(arcAround(A, R, Pp, 0.32), { lab: true })); b.add(1, arcAround(A, R, Q, 0.32));
    b.add(2, Object.assign(arcAround(B, R, Pp, 0.32), { lab: true })); b.add(2, arcAround(B, R, Q, 0.32));
    b.add(2, { t: 'pt', p: Pp, name: 'P', dir: nrm(sub(Pp, M)) }); b.add(2, { t: 'pt', p: Q, name: 'Q', dir: nrm(sub(Q, M)) });
    b.add(3, { t: 'line', a: Pp, b: Q, ext: 6, st: 'cons' });
    b.add(3, { t: 'pt', p: M, name: 'M', dir: nrm(add(u, nrm(sub(Q, M)))) });
    b.add(4, { t: 'seg', a: Pp, b: Q, st: 'final' }); b.add(4, { t: 'right', v: M, d1: u, d2: nrm(sub(Pp, M)) });
    const nq = nrm(sub(Q, M));
    b.add(4, { t: 'note', p: mid(A, M), text: `AM = ${mm(L / 2)} mm`, dir: nq }); b.add(4, { t: 'note', p: mid(M, B), text: `MB = ${mm(L / 2)} mm`, dir: nq });
    b.key(M, 'Midpoint M'); b.key(Pp, 'Arc point P'); b.key(Q, 'Arc point Q');
    const h = Math.sqrt(Math.max(0, R * R - (L / 2) * (L / 2)));
    o.steps = [
      { title: 'Draw the given line AB', text: `AB = ${mm(L)} mm. Drag A or B — the whole construction follows (snaps to the 5 mm grid).` },
      { title: 'Arcs with centre A', text: `Set the compass to R = ${R} mm (more than ½AB = ${mm(L / 2)} mm) and draw arcs above and below AB from A.` },
      { title: 'Arcs with centre B (same radius)', text: `Keep R = ${R} mm; from B cut the first arcs at P and Q.` },
      { title: 'Join P and Q', text: 'The line PQ cuts AB at M — the midpoint of AB.' },
      { title: 'Perpendicular bisector', text: `PQ ⟂ AB and AM = MB = ${mm(L / 2)} mm.` },
    ];
    o.rows = [['AB', `${mm(L)} mm`], ['Compass R (> AB/2)', `${R} mm`], ['AM = MB', `${mm(L / 2)} mm`], ['∠AMP', '90°'], ['PM = QM', `${mm(h)} mm`]];
    o.chips = [{ label: 'AB', value: `${mm(L)} mm` }, { label: 'AM = MB', value: `${mm(L / 2)} mm`, tone: 'good' }, { label: '∠AMP', value: '90°', tone: 'info' }];
    o.formulas = [
      { name: 'Midpoint by the perpendicular bisector', formula: 'AM = MB = AB / 2', given: `AB = ${mm(L)} mm`, calc: `${mm(L)} / 2`, result: mm(L / 2), unit: 'mm' },
      { name: 'Height of the arc intersections above AB', formula: 'PM = √(R² − (AB/2)²)', given: `R = ${R} mm, AB/2 = ${mm(L / 2)} mm`, calc: `√(${R}² − ${mm(L / 2)}²)`, result: mm(h), unit: 'mm' },
    ];
    o.state = { givenLine: `AB = ${mm(L)} mm`, compassRadius: `${R} mm`, midpoint: `M(${mm(M[0])}, ${mm(M[1])})`, result: `AM = MB = ${mm(L / 2)} mm, PQ ⟂ AB` };
    o.explain = {
      what: `Two equal arcs of radius ${R} mm drawn from A and B cross at P and Q; the line PQ bisects AB = ${mm(L)} mm at right angles.`,
      why: 'P and Q are each equidistant from A and B (PA = PB = R), and the locus of points equidistant from A and B is the perpendicular bisector of AB.',
      param: `Positions of A and B (AB = ${mm(L)} mm) and the compass radius R = ${R} mm (any value > AB/2).`,
      effect: 'A longer AB needs a larger compass setting; a larger R moves P and Q further from AB, but M stays at the midpoint.',
    };
  };

  FN.angle = (P, p, b, o) => {
    const V = P.V, A = P.A, B = P.B; const u1 = nrm(sub(A, V)), u2 = nrm(sub(B, V));
    const th = Math.acos(clamp(dot(u1, u2), -1, 1)) * DEG;
    const r1 = Math.max(8, Math.round(0.42 * Math.min(dist(V, A), dist(V, B))));
    const Cp = add(V, mul(u1, r1)), Dp = add(V, mul(u2, r1)); const CD = dist(Cp, Dp);
    const r2 = Math.max(Math.round(Math.max(0.75 * CD, 0.6 * r1)), Math.ceil(CD / 2) + 1);
    const I = cci(Cp, r2, Dp, r2); let E;
    if (I) { const bis = len(add(u1, u2)) > 1e-6 ? nrm(add(u1, u2)) : perp(u1); E = dot(sub(I[0], V), bis) >= dot(sub(I[1], V), bis) ? I[0] : I[1]; } else E = add(V, mul(perp(u1), r1));
    const ue = nrm(sub(E, V)); const Lb = Math.max(dist(V, E) + 12, 0.8 * Math.min(dist(V, A), dist(V, B)));
    const F = add(V, mul(ue, Lb)); const a1 = ang(u1); const dl = wrapPi(ang(u2) - a1); const sg = Math.sign(dl) || 1;
    b.add(0, { t: 'seg', a: V, b: A, st: 'given' }); b.add(0, { t: 'seg', a: V, b: B, st: 'given' });
    b.add(0, { t: 'pt', p: V, name: 'O', dir: mul(ue, -1), drag: 'V' }); b.add(0, { t: 'pt', p: A, name: 'A', dir: u1, drag: 'A' }); b.add(0, { t: 'pt', p: B, name: 'B', dir: u2, drag: 'B' });
    b.add(0, { t: 'angm', v: V, a0: a1, a1: a1 + dl, r: 34, text: `θ = ${dg(th)}`, until: 3 });
    b.add(1, { t: 'arc', c: V, r: r1, a0: a1 - sg * 0.15, a1: a1 + dl + sg * 0.15, lab: true });
    b.add(1, { t: 'pt', p: Cp, name: 'C', dir: mul(perp(u1), -sg) }); b.add(1, { t: 'pt', p: Dp, name: 'D', dir: mul(perp(u2), sg) });
    b.add(2, Object.assign(arcAround(Cp, r2, E, 0.3), { lab: true }));
    b.add(3, arcAround(Dp, r2, E, 0.3)); b.add(3, { t: 'pt', p: E, name: 'E', dir: perp(ue) });
    b.add(4, { t: 'seg', a: V, b: F, st: 'final' });
    b.add(4, { t: 'angm', v: V, a0: a1, a1: a1 + dl / 2, r: 60, text: dg(th / 2), col: '#15803d' });
    b.add(4, { t: 'angm', v: V, a0: a1 + dl / 2, a1: a1 + dl, r: 96, text: dg(th / 2), col: '#15803d' });
    b.key(Cp, 'Arc point C'); b.key(Dp, 'Arc point D'); b.key(E, 'Point E');
    if (th < 5) o.warn.push('The arms are almost on top of each other — open the angle to see the construction.');
    o.steps = [
      { title: 'Draw the given angle AOB', text: `∠AOB = θ = ${dg(th)}. Drag O, A or B to change it.` },
      { title: 'Arc with centre O', text: `With O as centre and any radius (${r1} mm) draw an arc cutting OA at C and OB at D.` },
      { title: 'Arc with centre C', text: `With C as centre and radius ${r2} mm (more than ½CD = ${mm(CD / 2)} mm) draw an arc inside the angle.` },
      { title: 'Arc with centre D (same radius)', text: `With D as centre and the same radius ${r2} mm cut the previous arc at E.` },
      { title: 'Join OE — the bisector', text: `∠AOE = ∠EOB = ${dg(th / 2)}.` },
    ];
    o.rows = [['∠AOB = θ', dg(th)], ['Compass R₁ (from O)', `${r1} mm`], ['Chord CD', `${mm(CD)} mm`], ['Compass R₂ (> CD/2)', `${r2} mm`], ['∠AOE = ∠EOB', dg(th / 2)]];
    o.chips = [{ label: 'θ', value: dg(th) }, { label: 'θ / 2', value: dg(th / 2), tone: 'good' }, { label: 'Compass R₂', value: `${r2} mm`, tone: 'info' }];
    o.formulas = [
      { name: 'Angle bisector', formula: '∠AOE = ∠EOB = θ / 2', given: `θ = ${dg(th)}`, calc: `${mm(th)} / 2`, result: mm(th / 2), unit: 'degrees (°)' },
      { name: 'Chord between the arc points', formula: 'CD = 2 R₁ sin(θ/2)', given: `R₁ = ${r1} mm`, calc: `2 × ${r1} × sin ${mm(th / 2)}°`, result: mm(CD), unit: 'mm' },
    ];
    o.state = { angle: dg(th), compassR1: `${r1} mm`, compassR2: `${r2} mm`, result: `bisector OE, each half = ${dg(th / 2)}` };
    o.explain = {
      what: `An arc from O marks C and D on the arms; equal arcs from C and D meet at E. OE splits θ = ${dg(th)} into two ${dg(th / 2)} angles.`,
      why: 'Triangles OCE and ODE have OC = OD, CE = DE and OE common, so they are congruent (SSS) and ∠COE = ∠DOE.',
      param: `The arm positions (θ = ${dg(th)}) and the compass radii R₁ = ${r1} mm, R₂ = ${r2} mm.`,
      effect: 'The compass radii only move the construction points; the bisector direction depends only on the two arms.',
    };
  };

  FN.divide = (P, p, b, o) => {
    const A = P.A, B = P.B; const n = Math.round(p.n); const L = dist(A, B); const u = nrm(sub(B, A));
    const s = Math.max(4, Math.round((0.85 * L) / n)); let w = rot(u, -30 * RAD); let Cn = add(A, mul(w, n * s));
    if (Cn[1] < 3 || Cn[1] > 125 || Cn[0] < 2 || Cn[0] > 158) { w = rot(u, 30 * RAD); Cn = add(A, mul(w, n * s)); }
    const Ci = []; for (let i = 1; i <= n; i++) Ci.push(add(A, mul(w, i * s)));
    const Di = []; for (let i = 1; i < n; i++) Di.push(add(A, mul(sub(B, A), i / n)));
    const side = crs(u, w) > 0 ? 1 : -1; const nOut = mul(perp(u), -side); // away from the inclined line
    b.add(0, { t: 'seg', a: A, b: B, st: 'given' });
    b.add(0, { t: 'pt', p: A, name: 'A', dir: mul(u, -1), drag: 'A' }); b.add(0, { t: 'pt', p: B, name: 'B', dir: u, drag: 'B' });
    b.add(1, { t: 'seg', a: A, b: add(A, mul(w, n * s + 8)), st: 'cons' });
    b.add(1, { t: 'angm', v: A, a0: ang(u), a1: ang(u) + wrapPi(ang(w) - ang(u)), r: 70, text: '30°' });
    b.add(1, { t: 'pt', p: add(A, mul(w, n * s + 8)), name: 'C', dir: w });
    Ci.forEach((c, i) => { const prev = i === 0 ? A : Ci[i - 1]; b.add(2, Object.assign(arcAround(prev, s, c, 0.3), { lab: i === 0 })); b.add(2, { t: 'num', p: c, text: String(i + 1), dir: mul(perp(w), side) }); });
    b.add(3, { t: 'seg', a: Cn, b: B, st: 'cons', hi: true });
    Di.forEach((d, i) => b.add(4, { t: 'seg', a: Ci[i], b: d, st: 'cons' }));
    b.add(5, { t: 'seg', a: A, b: B, st: 'final' });
    Di.forEach((d) => b.add(5, { t: 'tick', p: d, d: u }));
    b.add(5, { t: 'tick', p: A, d: u }); b.add(5, { t: 'tick', p: B, d: u });
    b.add(5, { t: 'note', p: mid(A, Di[0] || B), text: `${mm(L / n)} mm`, dir: nOut });
    Di.forEach((d, i) => b.key(d, `Division ${i + 1}′`)); b.key(Cn, `Point ${n}`);
    o.steps = [
      { title: 'Draw the given line AB', text: `AB = ${mm(L)} mm is to be divided into n = ${n} equal parts.` },
      { title: 'Draw AC at an acute angle', text: 'From A draw a line AC at any convenient acute angle (here 30°) to AB.' },
      { title: `Step off ${n} equal divisions`, text: `With the compass set to ${s} mm step off ${n} equal lengths 1, 2 … ${n} along AC.` },
      { title: `Join ${n} to B`, text: `Join the last division point ${n} to B.` },
      { title: 'Draw parallels', text: `Through 1, 2 … ${n - 1} draw lines parallel to ${n}B (set-squares) meeting AB.` },
      { title: `AB divided into ${n} equal parts`, text: `Each part = AB / n = ${mm(L)} / ${n} = ${mm(L / n)} mm (similar triangles).` },
    ];
    o.rows = [['AB', `${mm(L)} mm`], ['n', String(n)], ['Compass step on AC', `${s} mm`], ['Each part AB/n', `${mm(L / n)} mm`], ['Ratio AB / A-' + n, fmt(L / (n * s), 3)]];
    o.chips = [{ label: 'AB', value: `${mm(L)} mm` }, { label: 'n', value: String(n) }, { label: 'Each part', value: `${mm(L / n)} mm`, tone: 'good' }];
    o.formulas = [
      { name: 'Equal division (intercept theorem)', formula: 'part = AB / n', given: `AB = ${mm(L)} mm, n = ${n}`, calc: `${mm(L)} / ${n}`, result: mm(L / n), unit: 'mm' },
      { name: 'Similar triangles A-k-k′ and A-n-B', formula: 'Ak′ / AB = Ak / An = k / n', given: `An = ${n} × ${s} = ${n * s} mm`, calc: `scale factor AB / An = ${mm(L)} / ${n * s}`, result: fmt(L / (n * s), 3), unit: '— (ratio)' },
    ];
    o.state = { line: `AB = ${mm(L)} mm`, parts: n, compassStep: `${s} mm`, eachPart: `${mm(L / n)} mm` };
    o.explain = {
      what: `${n} equal steps of ${s} mm on the inclined line are transferred to AB by parallel lines, cutting AB = ${mm(L)} mm into ${n} parts of ${mm(L / n)} mm.`,
      why: 'Lines parallel to nB cut AC and AB proportionally (intercept theorem), so equal steps on AC give equal parts on AB — even when AB/n is not a round number.',
      param: `Line AB (${mm(L)} mm) and the number of parts n = ${n}.`,
      effect: 'More parts give smaller divisions; the angle of AC and the compass step can be anything — the result on AB is the same.',
    };
  };

  FN.polyc = (P, p, b, o) => {
    const O = P.O; const n = Math.round(p.n); const R = p.R; const phi = 360 / n;
    const V = []; for (let k = 0; k < n; k++) V.push(add(O, mul(dir((90 + k * phi) * RAD), R)));
    const a = 2 * R * Math.sin(Math.PI / n); const inter = (180 * (n - 2)) / n;
    b.add(0, { t: 'circle', c: O, r: R, st: 'cons', lab: true }); b.add(0, { t: 'pt', p: O, name: 'O', dir: [-0.7, -0.7], drag: 'O' });
    b.add(1, { t: 'cl', a: add(O, [-R - 8, 0]), b: add(O, [R + 8, 0]) }); b.add(1, { t: 'cl', a: add(O, [0, -R - 8]), b: add(O, [0, R + 8]) });
    b.add(1, { t: 'pt', p: V[0], name: 'A', dir: [0.6, 0.8] });
    b.add(2, { t: 'seg', a: O, b: V[0], st: 'cons' }); b.add(2, { t: 'seg', a: O, b: V[1], st: 'cons' });
    b.add(2, { t: 'angm', v: O, a0: 90 * RAD, a1: (90 + phi) * RAD, r: 30, text: `${dg(phi)}` });
    b.add(2, { t: 'pt', p: V[1], name: 'B', dir: nrm(sub(V[1], O)) });
    for (let k = 1; k < n - 1; k++) { b.add(3, Object.assign(arcAround(V[k], a, V[k + 1], 0.22), { lab: k === 1 })); b.add(3, { t: 'pt', p: V[k + 1], name: LET[k + 1], dir: nrm(sub(V[k + 1], O)) }); }
    b.add(4, { t: 'poly', pts: V, st: 'final' });
    b.add(4, { t: 'note', p: mid(V[n - 1], V[0]), text: `a = ${mm(a)} mm`, dir: nrm(sub(mid(V[n - 1], V[0]), O)) });
    V.forEach((q, i) => b.key(q, `Vertex ${LET[i]}`));
    o.steps = [
      { title: 'Draw the circle', text: `With centre O and radius R = ${mm(R)} mm draw the circle.` },
      { title: 'Centre lines and the first vertex A', text: 'Draw the horizontal and vertical centre lines; the top point is vertex A.' },
      { title: 'Set off the central angle', text: `At O set off 360°/${n} = ${dg(phi)} from OA (protractor) to get B. AB is one side.` },
      { title: 'Step off the side with the compass', text: `Set the compass to AB = ${mm(a)} mm and step round the circle from B: ${LET.slice(2, n).split('').join(', ')}.` },
      { title: `Join the vertices — ${POLYN[n]}`, text: `Side a = 2R sin(180°/${n}) = ${mm(a)} mm, interior angle = ${dg(inter)}.` },
    ];
    o.rows = [['Circle radius R', `${mm(R)} mm`], ['Central angle 360/n', dg(phi)], ['Side a = 2R sin(180/n)', `${mm(a)} mm`], ['Interior angle 180(n−2)/n', dg(inter)], ['Perimeter n·a', `${mm(n * a)} mm`]];
    o.chips = [{ label: 'n', value: `${n} (${POLYN[n]})` }, { label: 'Side a', value: `${mm(a)} mm`, tone: 'good' }, { label: 'Interior ∠', value: dg(inter), tone: 'info' }];
    o.formulas = [
      { name: 'Side of a regular polygon inscribed in a circle', formula: 'a = 2R sin(180° / n)', given: `R = ${mm(R)} mm, n = ${n}`, calc: `2 × ${mm(R)} × sin ${mm(180 / n)}°`, result: mm(a), unit: 'mm' },
      { name: 'Interior angle', formula: 'α = 180°(n − 2) / n', given: `n = ${n}`, calc: `180 × ${n - 2} / ${n}`, result: mm(inter), unit: 'degrees (°)' },
      { name: 'Central angle', formula: 'φ = 360° / n', given: `n = ${n}`, calc: `360 / ${n}`, result: mm(phi), unit: 'degrees (°)' },
    ];
    o.state = { polygon: POLYN[n], circleRadius: `${mm(R)} mm`, centre: `O(${mm(O[0])}, ${mm(O[1])})`, side: `${mm(a)} mm`, interiorAngle: dg(inter) };
    o.explain = {
      what: `A ${POLYN[n]} is inscribed in a circle of radius ${mm(R)} mm: every vertex lies on the circle and each side subtends ${dg(phi)} at the centre.`,
      why: `Equal chords subtend equal central angles, so stepping off the chord a = ${mm(a)} mm with the compass gives equally spaced vertices${n === 6 ? ' (for a hexagon a = R, so the compass is not even reset)' : ''}.`,
      param: `Number of sides n = ${n}, circle radius R = ${mm(R)} mm and centre O.`,
      effect: 'More sides → smaller central angle and side, interior angle closer to 180°. The last compass step must land exactly on A — a good check of accuracy.',
    };
  };

  FN.polys = (P, p, b, o) => {
    const A = P.A, B = P.B; const n = Math.round(p.n); const a = dist(A, B); const a0 = ang(sub(B, A)); const ext = 360 / n;
    const V = [A, B]; for (let j = 2; j < n; j++) V.push(add(V[j - 1], mul(dir(a0 + (j - 1) * ext * RAD), a)));
    const Pp = add(A, mul(dir(a0 + Math.PI), a)); const cen = mul(V.reduce((s, q) => add(s, q), [0, 0]), 1 / n);
    const pk = (k) => add(A, mul(dir(a0 + Math.PI - (k * Math.PI) / n), a)); const inter = (180 * (n - 2)) / n;
    b.add(0, { t: 'seg', a: A, b: B, st: 'given' });
    b.add(0, { t: 'pt', p: A, name: 'A', dir: nrm(sub(A, cen)), drag: 'A' }); b.add(0, { t: 'pt', p: B, name: 'B', dir: nrm(sub(B, cen)), drag: 'B' });
    b.add(1, { t: 'seg', a: A, b: Pp, st: 'cons' }); b.add(1, { t: 'pt', p: Pp, name: 'P', dir: dir(a0 + Math.PI) });
    b.add(1, { t: 'arc', c: A, r: a, a0, a1: a0 + Math.PI, lab: true });
    for (let k = 1; k < n; k++) { const q = pk(k); b.add(2, { t: 'tick', p: q, d: perp(nrm(sub(q, A))), big: true }); b.add(2, { t: 'num', p: q, text: String(k), dir: nrm(sub(q, A)), until: 4 }); }
    b.add(2, { t: 'seg', a: A, b: pk(2), st: 'cons', hi: true });
    b.add(2, { t: 'angm', v: A, a0, a1: a0 + inter * RAD, r: 26, text: dg(inter), until: 4 });
    for (let k = 3; k <= n - 1; k++) { const j = n - k + 1; b.add(3, { t: 'seg', a: A, b: add(A, mul(nrm(sub(V[j], A)), dist(A, V[j]) + 10)), st: 'cons' }); }
    for (let j = 1; j <= n - 3; j++) b.add(4, Object.assign(arcAround(V[j], a, V[j + 1], 0.22), { lab: j === 1 }));
    for (let j = 2; j < n; j++) b.add(4, { t: 'pt', p: V[j], name: LET[j], dir: nrm(sub(V[j], cen)) });
    b.add(5, { t: 'poly', pts: V, st: 'final' });
    b.add(5, { t: 'angm', v: A, a0, a1: a0 + inter * RAD, r: 26, text: dg(inter), col: '#15803d' });
    V.forEach((q, i) => b.key(q, `Vertex ${LET[i]}`)); b.key(Pp, 'Point P');
    o.steps = [
      { title: 'Draw the given side AB', text: `Side AB = ${mm(a)} mm of the ${POLYN[n]}.` },
      { title: 'Extend BA and draw a semicircle', text: `Produce BA to P; with centre A and radius AB = ${mm(a)} mm draw the semicircle from B to P.` },
      { title: `Divide the semicircle into ${n} equal parts`, text: `Mark 1, 2 … from P at 180°/${n} = ${dg(180 / n)} each. Join A–2: this is the second side (∠ = ${dg(inter)}).` },
      { title: 'Draw radial lines from A', text: n > 3 ? `Join A to 3 … ${n - 1} and produce the lines.` : 'For a triangle no more radial lines are needed.' },
      { title: 'Step off AB along the radial lines', text: n > 3 ? `With centre B, radius AB, cut line A-${n - 1} at C; with centre C cut the next line at D, and so on.` : 'Point 2 is already the third vertex C.' },
      { title: `Join the vertices — ${POLYN[n]}`, text: `All sides = ${mm(a)} mm, every interior angle = 180(n−2)/n = ${dg(inter)}.` },
    ];
    const Rc = a / (2 * Math.sin(Math.PI / n));
    o.rows = [['Side AB', `${mm(a)} mm`], ['Division of semicircle 180/n', dg(180 / n)], ['Interior angle 180(n−2)/n', dg(inter)], ['Circumradius a / (2 sin 180/n)', `${mm(Rc)} mm`], ['Perimeter', `${mm(n * a)} mm`]];
    o.chips = [{ label: 'n', value: `${n} (${POLYN[n]})` }, { label: 'Side', value: `${mm(a)} mm` }, { label: 'Interior ∠', value: dg(inter), tone: 'good' }];
    o.formulas = [
      { name: 'Interior angle of a regular polygon', formula: 'α = 180°(n − 2) / n', given: `n = ${n}`, calc: `180 × ${n - 2} / ${n}`, result: mm(inter), unit: 'degrees (°)' },
      { name: 'Circumradius from the side', formula: 'R = a / (2 sin(180° / n))', given: `a = ${mm(a)} mm`, calc: `${mm(a)} / (2 sin ${mm(180 / n)}°)`, result: mm(Rc), unit: 'mm' },
    ];
    o.state = { polygon: POLYN[n], side: `${mm(a)} mm`, interiorAngle: dg(inter), method: 'general method (semicircle divided into n parts)' };
    o.explain = {
      what: `The semicircle on AB is divided into ${n} equal parts; the line A–2 gives the second side at ${dg(inter)} and the radial lines through 3 … ${n - 1} carry the remaining vertices.`,
      why: 'Point 2 is 2 × 180°/n from P, so ∠BA2 = 180° − 360°/n = the interior angle. All vertices of a regular polygon seen from one vertex lie on lines 180°/n apart, which are exactly the radial lines.',
      param: `Side AB = ${mm(a)} mm and the number of sides n = ${n}.`,
      effect: 'More sides → finer division of the semicircle and larger interior angle; the polygon grows because its circumradius a / (2 sin 180°/n) increases.',
    };
  };

  FN.circ3 = (P, p, b, o) => {
    const A = P.A, B = P.B, Cc = P.C; const area2 = crs(sub(B, A), sub(Cc, A));
    const collinear = Math.abs(area2) < 0.02 * dist(A, B) * dist(B, Cc) + 1e-6;
    const bis = (X, Y) => { const L = dist(X, Y); const R = Math.max(Math.round(0.7 * L), Math.ceil(L / 2) + 1); const I = cci(X, R, Y, R) || [X, Y]; return { R, I, M: mid(X, Y), d: perp(nrm(sub(Y, X))) }; };
    const b1 = bis(A, B), b2 = bis(B, Cc);
    const O = collinear ? null : lli(b1.M, b1.d, b2.M, b2.d); const Rr = O ? dist(O, A) : 0;
    const lineThrough = (bb) => { const ts = [dot(sub(bb.I[0], bb.M), bb.d), dot(sub(bb.I[1], bb.M), bb.d)]; if (O) ts.push(dot(sub(O, bb.M), bb.d)); return { a: add(bb.M, mul(bb.d, Math.min(...ts) - 8)), b: add(bb.M, mul(bb.d, Math.max(...ts) + 8)) }; };
    const cg = mul(add(add(A, B), Cc), 1 / 3);
    ['A', 'B', 'C'].forEach((k) => b.add(0, { t: 'pt', p: P[k], name: k, dir: nrm(sub(P[k], O || cg)), drag: k }));
    b.add(1, { t: 'seg', a: A, b: B, st: 'cons' }); b.add(1, { t: 'seg', a: B, b: Cc, st: 'cons' });
    [[b1, A, B, 2], [b2, B, Cc, 3]].forEach(([bb, X, Y, s]) => {
      b.add(s, Object.assign(arcAround(X, bb.R, bb.I[0], 0.25), { lab: true })); b.add(s, arcAround(X, bb.R, bb.I[1], 0.25));
      b.add(s, arcAround(Y, bb.R, bb.I[0], 0.25)); b.add(s, arcAround(Y, bb.R, bb.I[1], 0.25));
      const ln = lineThrough(bb); b.add(s, { t: 'seg', a: ln.a, b: ln.b, st: 'cons' }); b.add(s, { t: 'right', v: bb.M, d1: nrm(sub(Y, X)), d2: bb.d });
    });
    if (O) {
      b.add(4, { t: 'pt', p: O, name: 'O', dir: [0.7, -0.7] }); b.add(4, { t: 'seg', a: O, b: A, st: 'cons', dash: true });
      b.add(5, { t: 'circle', c: O, r: Rr, st: 'final', lab: true }); b.key(O, 'Centre O');
    } else { b.add(4, { t: 'warn', text: 'A, B and C are collinear — the bisectors are parallel, no circle exists.' }); }
    b.key(b1.M, 'Midpoint of AB'); b.key(b2.M, 'Midpoint of BC');
    if (collinear) o.warn.push('The three points are (almost) collinear — no circle can pass through them.');
    o.steps = [
      { title: 'Mark the three points A, B, C', text: 'Drag any point; the circle updates live.' },
      { title: 'Join AB and BC', text: `AB = ${mm(dist(A, B))} mm, BC = ${mm(dist(B, Cc))} mm — two chords of the required circle.` },
      { title: 'Perpendicular bisector of AB', text: `Equal arcs of R = ${b1.R} mm from A and B; join their intersections.` },
      { title: 'Perpendicular bisector of BC', text: `Equal arcs of R = ${b2.R} mm from B and C; join their intersections.` },
      { title: 'Bisectors meet at the centre O', text: O ? `O(${mm(O[0])}, ${mm(O[1])}) is equidistant from A, B and C.` : 'The bisectors are parallel — no centre.' },
      { title: 'Draw the circle', text: O ? `With centre O and radius OA = ${mm(Rr)} mm draw the circle through A, B and C.` : 'No circle through three collinear points.' },
    ];
    const a = dist(B, Cc), bb2 = dist(Cc, A), c = dist(A, B); const area = Math.abs(area2) / 2;
    o.rows = [['AB', `${mm(c)} mm`], ['BC', `${mm(a)} mm`], ['CA', `${mm(bb2)} mm`], ['Radius OA = OB = OC', O ? `${mm(Rr)} mm` : '—'], ['Area of △ABC', `${mm(area)} mm²`]];
    o.chips = [{ label: 'Radius R', value: O ? `${mm(Rr)} mm` : 'no circle', tone: O ? 'good' : 'bad' }, { label: 'Centre O', value: O ? `(${mm(O[0])}, ${mm(O[1])})` : '—' }, { label: 'Diameter', value: O ? `${mm(2 * Rr)} mm` : '—', tone: 'info' }];
    o.formulas = [
      { name: 'Circumradius', formula: 'R = abc / (4Δ)', given: `a = ${mm(a)}, b = ${mm(bb2)}, c = ${mm(c)} mm, Δ = ${mm(area)} mm²`, calc: O ? `${mm(a)} × ${mm(bb2)} × ${mm(c)} / (4 × ${mm(area)})` : 'Δ ≈ 0', result: O ? mm((a * bb2 * c) / (4 * area)) : 'no circle', unit: 'mm' },
      { name: 'Check with the constructed centre', formula: 'OA = OB = OC', given: O ? `O(${mm(O[0])}, ${mm(O[1])})` : '—', calc: O ? `${mm(dist(O, A))}, ${mm(dist(O, B))}, ${mm(dist(O, Cc))}` : '', result: O ? mm(Rr) : '—', unit: 'mm' },
    ];
    o.state = { points: ptStr(P), centre: O ? `O(${mm(O[0])}, ${mm(O[1])})` : 'none (collinear)', radius: O ? `${mm(Rr)} mm` : 'none' };
    o.explain = {
      what: O ? `The perpendicular bisectors of chords AB and BC meet at O; the circle of radius ${mm(Rr)} mm about O passes through all three points.` : 'The points are collinear so the bisectors never meet.',
      why: 'Every point of the perpendicular bisector of a chord is equidistant from its ends, so the common point of two bisectors is equidistant from A, B and C — the centre.',
      param: 'The positions of A, B and C.',
      effect: 'As the points approach a straight line the centre runs far away and the radius grows without limit.',
    };
  };

  FN.tangent = (P, p, b, o) => {
    const O = P.O, Pp = P.P; const r = p.rt; const d = dist(O, Pp); const ok = d > r + 0.5; const M = mid(O, Pp);
    const L = ok ? Math.sqrt(d * d - r * r) : 0; const Rb = Math.max(Math.round(0.65 * d), Math.ceil(d / 2) + 1);
    const I = cci(O, Rb, Pp, Rb) || [O, Pp]; const T = ok ? cci(O, r, M, d / 2) : null; const u = nrm(sub(Pp, O));
    b.add(0, { t: 'circle', c: O, r, st: 'given' }); b.add(0, { t: 'pt', p: O, name: 'O', dir: rot(u, 2.3), drag: 'O' }); b.add(0, { t: 'pt', p: Pp, name: 'P', dir: u, drag: 'P' });
    b.add(0, { t: 'seg', a: O, b: add(O, mul(rot(u, Math.PI), r)), st: 'cons', rlab: `r = ${mm(r)}` });
    b.add(1, { t: 'seg', a: O, b: Pp, st: 'cons' });
    b.add(1, Object.assign(arcAround(O, Rb, I[0], 0.2), { lab: true })); b.add(1, arcAround(O, Rb, I[1], 0.2)); b.add(1, arcAround(Pp, Rb, I[0], 0.2)); b.add(1, arcAround(Pp, Rb, I[1], 0.2));
    b.add(1, { t: 'seg', a: I[0], b: I[1], st: 'cons' }); b.add(1, { t: 'pt', p: M, name: 'M', dir: nrm(add(u, rot(u, -Math.PI / 2))) });
    if (ok && T) {
      b.add(2, { t: 'circle', c: M, r: d / 2, st: 'cons', lab: true });
      b.add(2, { t: 'pt', p: T[0], name: 'T₁', dir: nrm(sub(T[0], M)) }); b.add(2, { t: 'pt', p: T[1], name: 'T₂', dir: nrm(sub(T[1], M)) });
      T.forEach((q) => { const e = add(q, mul(nrm(sub(q, Pp)), 18)); b.add(3, { t: 'seg', a: Pp, b: e, st: 'cons' }); b.add(3, { t: 'seg', a: O, b: q, st: 'cons', dash: true }); b.add(3, { t: 'right', v: q, d1: nrm(sub(O, q)), d2: nrm(sub(Pp, q)) }); });
      T.forEach((q) => b.add(4, { t: 'seg', a: Pp, b: add(q, mul(nrm(sub(q, Pp)), 18)), st: 'final' }));
      b.add(4, { t: 'note', p: mid(Pp, T[0]), text: `PT = ${mm(L)} mm`, dir: nrm(sub(T[0], T[1])) });
      b.key(T[0], 'Tangent point T₁'); b.key(T[1], 'Tangent point T₂');
    } else b.add(2, { t: 'warn', text: 'P is inside (or on) the circle — no tangent can be drawn from it.' });
    b.key(M, 'Midpoint M');
    if (!ok) o.warn.push('Point P must lie outside the circle (OP > r) for tangents to exist.');
    const al = ok ? Math.asin(clamp(r / d, 0, 1)) * DEG : 0;
    o.steps = [
      { title: 'Given circle and external point P', text: `Circle: centre O, r = ${mm(r)} mm. OP = ${mm(d)} mm. Drag O or P.` },
      { title: 'Join OP and bisect it', text: `Arcs of R = ${Rb} mm from O and P give the midpoint M of OP.` },
      { title: 'Semicircle on OP', text: ok ? `With centre M and radius MO = ${mm(d / 2)} mm draw a semicircle cutting the circle at T₁ and T₂.` : 'P is inside the circle — no intersection.' },
      { title: 'Join PT₁ and PT₂', text: '∠OT₁P = ∠OT₂P = 90° (angle in a semicircle), so PT ⟂ radius OT: PT is a tangent.' },
      { title: 'Tangents from P', text: ok ? `Tangent length PT = √(OP² − r²) = ${mm(L)} mm.` : 'No tangents.' },
    ];
    o.rows = [['Radius r', `${mm(r)} mm`], ['OP', `${mm(d)} mm`], ['Tangent length √(OP² − r²)', ok ? `${mm(L)} mm` : '—'], ['∠OPT (half angle)', ok ? dg(al) : '—'], ['∠OTP', ok ? '90°' : '—']];
    o.chips = [{ label: 'OP', value: `${mm(d)} mm` }, { label: 'PT', value: ok ? `${mm(L)} mm` : 'none', tone: ok ? 'good' : 'bad' }, { label: 'Angle between tangents', value: ok ? dg(2 * al) : '—', tone: 'info' }];
    o.formulas = [
      { name: 'Tangent length from an external point', formula: 'PT = √(OP² − r²)', given: `OP = ${mm(d)} mm, r = ${mm(r)} mm`, calc: `√(${mm(d)}² − ${mm(r)}²)`, result: ok ? mm(L) : 'no tangent', unit: 'mm' },
      { name: 'Angle between the two tangents', formula: '2α,  sin α = r / OP', given: `r / OP = ${ok ? fmt(r / d, 3) : '≥ 1'}`, calc: ok ? `2 × asin(${fmt(r / d, 3)})` : '', result: ok ? mm(2 * al) : '—', unit: 'degrees (°)' },
    ];
    o.state = { circle: `centre O, r = ${mm(r)} mm`, OP: `${mm(d)} mm`, tangentLength: ok ? `${mm(L)} mm` : 'no tangent (P inside)' };
    o.explain = {
      what: ok ? `The semicircle on OP meets the circle at T₁, T₂; PT₁ and PT₂ are the two tangents, each ${mm(L)} mm long.` : 'P lies inside the circle, so no tangent can be drawn.',
      why: 'The angle in a semicircle is 90°, so OT ⟂ PT; a line perpendicular to a radius at its end is a tangent.',
      param: `Circle radius r = ${mm(r)} mm and the distance OP = ${mm(d)} mm (drag O or P).`,
      effect: 'Moving P further away makes the tangents longer and the angle between them smaller; as P approaches the circle the tangent length falls to zero.',
    };
  };

  FN.fillet = (P, p, b, o) => {
    const V = P.V, A = P.A, B = P.B; const r = p.rf; const u1 = nrm(sub(A, V)), u2 = nrm(sub(B, V));
    const th = Math.acos(clamp(dot(u1, u2), -1, 1)); const thd = th * DEG; const ok = thd > 8 && thd < 172;
    let n1 = perp(u1); if (dot(n1, u2) < 0) n1 = mul(n1, -1); let n2 = perp(u2); if (dot(n2, u1) < 0) n2 = mul(n2, -1);
    const L1 = dist(V, A), L2 = dist(V, B);
    const O = ok ? lli(add(V, mul(n1, r)), u1, add(V, mul(n2, r)), u2) : null;
    const T1 = O ? add(V, mul(u1, dot(sub(O, V), u1))) : V, T2 = O ? add(V, mul(u2, dot(sub(O, V), u2))) : V;
    const VT = ok ? r / Math.tan(th / 2) : 0;
    b.add(0, { t: 'seg', a: V, b: A, st: 'given' }); b.add(0, { t: 'seg', a: V, b: B, st: 'given' });
    b.add(0, { t: 'pt', p: V, name: 'V', dir: mul(nrm(add(u1, u2)), -1), drag: 'V' }); b.add(0, { t: 'pt', p: A, name: 'A', dir: u1, drag: 'A' }); b.add(0, { t: 'pt', p: B, name: 'B', dir: u2, drag: 'B' });
    b.add(0, { t: 'angm', v: V, a0: ang(u1), a1: ang(u1) + wrapPi(ang(u2) - ang(u1)), r: 30, text: dg(thd), until: 4 });
    if (O) {
      [[u1, n1, L1, 1], [u2, n2, L2, 2]].forEach(([u, nn, L, s]) => {
        const q1 = add(V, mul(u, Math.max(VT + 12, L * 0.5))), q2 = add(V, mul(u, L * 0.92));
        b.add(s, Object.assign(arcAround(q1, r, add(q1, mul(nn, r)), 0.45), { lab: true })); b.add(s, arcAround(q2, r, add(q2, mul(nn, r)), 0.45));
        b.add(s, { t: 'seg', a: q1, b: add(q1, mul(nn, r)), st: 'cons', dash: true });
        b.add(s, { t: 'line', a: add(O, mul(u, -6)), b: add(q2, mul(nn, r)), ext: 2, st: 'cons' });
      });
      b.add(3, { t: 'pt', p: O, name: 'O', dir: nrm(sub(O, V)) });
      b.add(4, { t: 'seg', a: O, b: T1, st: 'cons', dash: true }); b.add(4, { t: 'seg', a: O, b: T2, st: 'cons', dash: true });
      b.add(4, { t: 'right', v: T1, d1: u1, d2: n1 }); b.add(4, { t: 'right', v: T2, d1: u2, d2: n2 });
      b.add(4, { t: 'pt', p: T1, name: 'T₁', dir: mul(n1, -1) }); b.add(4, { t: 'pt', p: T2, name: 'T₂', dir: mul(n2, -1) });
      const s1 = ang(sub(T1, O)), s2 = ang(sub(T2, O));
      b.add(5, { t: 'trim', a: V, b: T1 }); b.add(5, { t: 'trim', a: V, b: T2 });
      b.add(5, { t: 'arc', c: O, r, a0: s1, a1: s1 + wrapPi(s2 - s1), st: 'final', lab: true });
      if (VT < L1) b.add(5, { t: 'seg', a: T1, b: A, st: 'final' }); if (VT < L2) b.add(5, { t: 'seg', a: T2, b: B, st: 'final' });
      b.key(O, 'Centre O'); b.key(T1, 'Tangent point T₁'); b.key(T2, 'Tangent point T₂');
    } else b.add(1, { t: 'warn', text: 'The lines are (almost) parallel — change the angle between them.' });
    if (!ok) o.warn.push('The angle between the lines must be between 8° and 172° for a fillet.');
    else if (VT > Math.min(L1, L2)) o.warn.push(`The fillet (VT = ${mm(VT)} mm) is longer than a given line — reduce r or lengthen the lines.`);
    o.steps = [
      { title: 'Two given lines meeting at V', text: `Angle between VA and VB = ${dg(thd)}. Fillet radius r = ${mm(r)} mm.` },
      { title: 'Line parallel to VA at distance r', text: `From two points on VA draw arcs of radius r = ${mm(r)} mm; draw a line touching both arcs.` },
      { title: 'Line parallel to VB at distance r', text: `Repeat on VB with the same radius ${mm(r)} mm.` },
      { title: 'Centre O of the arc', text: O ? 'The two parallels meet at O, which is r away from both lines.' : 'No intersection — lines parallel.' },
      { title: 'Tangent points T₁ and T₂', text: 'Drop perpendiculars from O to VA and VB: the feet T₁ and T₂ are the points of tangency.' },
      { title: 'Draw the fillet arc', text: O ? `With centre O, radius ${mm(r)} mm draw arc T₁T₂ and trim the corner. VT = r / tan(θ/2) = ${mm(VT)} mm.` : '—' },
    ];
    o.rows = [['Angle θ between lines', dg(thd)], ['Fillet radius r', `${mm(r)} mm`], ['VT₁ = VT₂ = r / tan(θ/2)', ok ? `${mm(VT)} mm` : '—'], ['VO = r / sin(θ/2)', ok ? `${mm(r / Math.sin(th / 2))} mm` : '—'], ['Arc angle 180° − θ', ok ? dg(180 - thd) : '—']];
    o.chips = [{ label: 'θ', value: dg(thd) }, { label: 'r', value: `${mm(r)} mm` }, { label: 'VT', value: ok ? `${mm(VT)} mm` : '—', tone: ok ? 'good' : 'bad' }];
    o.formulas = [
      { name: 'Distance from the corner to the tangent points', formula: 'VT = r / tan(θ/2)', given: `r = ${mm(r)} mm, θ = ${dg(thd)}`, calc: `${mm(r)} / tan ${mm(thd / 2)}°`, result: ok ? mm(VT) : '—', unit: 'mm' },
      { name: 'Distance from the corner to the arc centre', formula: 'VO = r / sin(θ/2)', given: `θ/2 = ${dg(thd / 2)}`, calc: `${mm(r)} / sin ${mm(thd / 2)}°`, result: ok ? mm(r / Math.sin(th / 2)) : '—', unit: 'mm' },
      { name: 'Angle subtended by the fillet arc', formula: 'β = 180° − θ', given: `θ = ${dg(thd)}`, calc: `180 − ${mm(thd)}`, result: ok ? mm(180 - thd) : '—', unit: 'degrees (°)' },
    ];
    o.state = { angleBetweenLines: dg(thd), filletRadius: `${mm(r)} mm`, centre: O ? `O(${mm(O[0])}, ${mm(O[1])})` : 'none', VT: ok ? `${mm(VT)} mm` : '—' };
    o.explain = {
      what: ok ? `An arc of radius ${mm(r)} mm is fitted into the ${dg(thd)} corner so that it touches both lines at T₁ and T₂, ${mm(VT)} mm from V.` : 'The two lines are almost parallel, so no fillet corner exists.',
      why: 'The centre of an arc touching a line lies on a parallel at distance r; touching both lines means it is on both parallels. The radius to a tangent point is perpendicular to the line.',
      param: `Fillet radius r = ${mm(r)} mm and the angle between the lines θ = ${dg(thd)}.`,
      effect: 'A larger r or a sharper angle moves the tangent points further from the corner (VT = r / tan(θ/2)).',
    };
  };

  // ─── drawing of a construction element ───
  const CUR = '#ea580c'; const FINAL = { color: '#0f172a', width: 3.4 }; const GIVEN = { color: '#1e293b', width: 2.1 };
  function styleOf(e, cur) {
    if (e.st === 'final') return FINAL;
    if (e.st === 'given') return GIVEN;
    const base = cur ? { color: CUR, width: 1.8 } : e.hi ? { color: '#475569', width: 1.4 } : { ...G.LINE.construction };
    if (e.dash) base.dash = [6, 5];
    return base;
  }
  function drawEl(g, e, ctx) {
    const cur = e.s === ctx.step; const f = cur ? ctx.prog : 1; const stl = styleOf(e, cur);
    if (e.until != null && ctx.step > e.until) return;
    if (e.t === 'seg' || e.t === 'line') {
      let a = e.a, b2 = e.b; if (e.t === 'line') { const u = nrm(sub(e.b, e.a)); a = sub(e.a, mul(u, e.ext)); b2 = add(e.b, mul(u, e.ext)); }
      const q = add(a, mul(sub(b2, a), f)); D.line(g, gX(a[0]), gY(a[1]), gX(q[0]), gY(q[1]), stl);
      if (e.rlab && f >= 1) { const m = gP(mid(a, b2)); D.text(g, e.rlab, m[0], m[1] - 14, { size: 15, color: C.muted, align: 'center', weight: 700, halo: true }); }
    } else if (e.t === 'arc' || e.t === 'circle') {
      const a0 = e.t === 'circle' ? 0 : e.a0; const a1 = e.t === 'circle' ? 2 * Math.PI : e.a1; const a1f = a0 + (a1 - a0) * f;
      g.save(); g.beginPath(); g.arc(gX(e.c[0]), gY(e.c[1]), e.r * GK, -a0, -a1f, a1f > a0);
      g.strokeStyle = stl.color; g.lineWidth = stl.width; g.globalAlpha = stl.alpha == null ? 1 : stl.alpha; if (stl.dash) g.setLineDash(stl.dash); g.stroke(); g.restore();
      if (e.lab && ctx.showRadii && (cur || (e.st === 'final' && e.s <= ctx.step))) {
        const am = e.t === 'circle' ? -2.4 : (a0 + a1) / 2; const pe = add(e.c, mul(dir(am), e.r));
        D.line(g, gX(e.c[0]), gY(e.c[1]), gX(pe[0]), gY(pe[1]), { color: cur ? CUR : C.muted, width: 1.2, dash: [4, 4] });
        D.circle(g, gX(e.c[0]), gY(e.c[1]), 3, { fill: cur ? CUR : C.muted });
        const lp = gP(add(e.c, mul(dir(am), e.r * 0.55)));
        D.tag(g, `R ${mm(e.r)}`, lp[0], lp[1], { bg: cur ? CUR : '#334155', size: 14, align: 'center' });
      }
    } else if (e.t === 'pt') {
      const q = gP(e.p); const isDrag = e.drag && ctx.tool === 'move';
      if (isDrag) D.circle(g, q[0], q[1], ctx.hover === e.drag || ctx.dragging === e.drag ? 11 : 8, { stroke: '#2563eb', width: 2, fill: 'rgba(37,99,235,0.12)' });
      D.circle(g, q[0], q[1], 4.2, { fill: cur ? CUR : C.ink });
      const d = e.dir || [0.7, 0.7]; const l = len(d) || 1;
      D.text(g, e.name, q[0] + (d[0] / l) * 19, q[1] - (d[1] / l) * 19, { size: 17, weight: 800, align: 'center', color: e.drag ? '#1d4ed8' : C.ink, halo: true });
    } else if (e.t === 'num') {
      const q = gP(e.p); const d = e.dir; const l = len(d) || 1;
      D.text(g, e.text, q[0] + (d[0] / l) * 16, q[1] - (d[1] / l) * 16, { size: 15, weight: 700, align: 'center', color: cur ? CUR : C.muted, halo: true });
    } else if (e.t === 'tick') {
      const n = perp(e.d); const h = e.big ? 2 : 1.6; const a = add(e.p, mul(n, h)), b2 = sub(e.p, mul(n, h));
      D.line(g, gX(a[0]), gY(a[1]), gX(b2[0]), gY(b2[1]), { color: cur ? CUR : C.ink, width: 2.2 });
    } else if (e.t === 'right') {
      const s = 2.6; const p1 = add(e.v, mul(e.d1, s)), p2 = add(p1, mul(e.d2, s)), p3 = add(e.v, mul(e.d2, s));
      D.poly(g, [gP(p1), gP(p2), gP(p3)], { stroke: cur ? CUR : '#15803d', width: 1.6 });
    } else if (e.t === 'angm') {
      const col = cur ? CUR : e.col || '#7c3aed'; const c = gP(e.v);
      g.save(); g.beginPath(); g.arc(c[0], c[1], e.r, -e.a0, -e.a1, e.a1 > e.a0); g.strokeStyle = col; g.lineWidth = 1.6; g.stroke(); g.restore();
      const am = (e.a0 + e.a1) / 2; const tw = D.textWidth(g, e.text, 15, 700);
      const rr = e.r + 10 + (tw / 2) * Math.abs(Math.cos(am)) + 4 * Math.abs(Math.sin(am));
      D.text(g, e.text, c[0] + Math.cos(am) * rr, c[1] - Math.sin(am) * rr, { size: 15, weight: 700, color: col, align: 'center', halo: true });
    } else if (e.t === 'poly') {
      const pts = e.pts.map(gP); const n = pts.length; const k = f * n;
      for (let i = 0; i < n; i++) { if (i >= k) break; const a = pts[i], b2 = pts[(i + 1) % n]; const ff = Math.min(1, k - i); D.line(g, a[0], a[1], a[0] + (b2[0] - a[0]) * ff, a[1] + (b2[1] - a[1]) * ff, stl); }
    } else if (e.t === 'cl') {
      D.line(g, gX(e.a[0]), gY(e.a[1]), gX(e.a[0] + (e.b[0] - e.a[0]) * f), gY(e.a[1] + (e.b[1] - e.a[1]) * f), G.LINE.centre);
    } else if (e.t === 'trim') {
      D.line(g, gX(e.a[0]), gY(e.a[1]), gX(e.b[0]), gY(e.b[1]), { color: '#ffffff', width: 4 });
      D.line(g, gX(e.a[0]), gY(e.a[1]), gX(e.b[0]), gY(e.b[1]), { color: C.faint, width: 1.1, dash: [5, 5] });
    } else if (e.t === 'note') {
      if (f < 0.6) return; const q = gP(e.p); const d = e.dir || [0, 1]; const l = len(d) || 1;
      D.tag(g, e.text, q[0] + (d[0] / l) * 22, q[1] - (d[1] / l) * 22, { bg: '#15803d', size: 14, align: 'center' });
    } else if (e.t === 'warn') {
      ctx.warnText = e.text;
    }
  }

  S['eg-geometric-construction'] = {
    view2d: true,
    modes: CMODES,
    stepDuration: 3.5,
    tools: [
      { key: 'move', label: '✥ Move points', title: 'Drag the blue-ringed points; the construction recomputes live' },
      { key: 'view', label: '🔍 Pan view', title: 'Drag to pan the sheet (wheel / pinch to zoom)' },
    ],
    actions: [
      { key: 'snap', label: '🧲 Snap on/off', title: 'Snap dragged points to the 5 mm grid and to key points' },
      { key: 'resetPts', label: '↺ Reset points', title: 'Put the points of this construction back to their starting positions' },
    ],
    initUi: () => ({ tool: 'move', pts: allDefaults(), drag: null, snapMark: null, hover: null }),
    saveUi: (ui) => ({ tool: ui.tool, pts: ui.pts }),
    restoreUi(saved, ui) {
      if (saved && saved.pts && typeof saved.pts === 'object') Object.keys(PDEF).forEach((m) => { const sp = saved.pts[m]; if (!sp) return; Object.keys(PDEF[m]).forEach((k) => { const q = sp[k]; if (Array.isArray(q) && Number.isFinite(q[0]) && Number.isFinite(q[1])) ui.pts[m][k] = [q[0], q[1]]; }); });
      if (saved && (saved.tool === 'move' || saved.tool === 'view')) ui.tool = saved.tool;
      return ui;
    },
    params: [
      { key: 'n', label: 'Number of parts / sides n', type: 'range', min: 3, max: 10, step: 1, default: 6, showIf: (p) => p.mode === 'divide' || p.mode === 'polyc' || p.mode === 'polys' },
      { key: 'R', label: 'Circle radius R', type: 'range', min: 20, max: 55, step: 1, default: 45, unit: 'mm', showIf: (p) => p.mode === 'polyc' },
      { key: 'rt', label: 'Circle radius r', type: 'range', min: 10, max: 40, step: 1, default: 25, unit: 'mm', showIf: (p) => p.mode === 'tangent' },
      { key: 'rf', label: 'Fillet radius r', type: 'range', min: 5, max: 40, step: 1, default: 20, unit: 'mm', showIf: (p) => p.mode === 'fillet' },
      { key: 'snap', label: 'Snap to grid (5 mm) and key points', type: 'toggle', default: true },
      { key: 'showRadii', label: 'Label compass radii', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Hexagon in a Ø90 circle (side = R)', values: { mode: 'polyc', n: 6, R: 45 } },
      { label: 'Pentagon on a 40 mm side (general method)', values: { mode: 'polys', n: 5 } },
      { label: 'Divide a 110 mm line into 7 parts', values: { mode: 'divide', n: 7 } },
      { label: 'Tangents to a Ø50 circle', values: { mode: 'tangent', rt: 25 } },
    ],
    validate(p, ui) { return buildC(p, ui).warn; },
    compute(p, ui) {
      const m = buildC(p, ui);
      return {
        formulas: m.formulas, readouts: m.chips,
        state: Object.assign({ construction: MODE_NAME[m.mode], givenPoints: ptStr(m.P), snapping: p.snap ? 'on (5 mm grid + key points)' : 'off' }, m.state),
        explain: m.explain,
      };
    },
    steps(p, c, ui) { return buildC(p, ui).steps; },
    onTool(key) { return { redraw: true, toast: key === 'move' ? 'Drag a blue-ringed point to move it' : 'Drag the sheet to pan; wheel or pinch to zoom' }; },
    onAction(key, S2) {
      if (key === 'snap') return { params: { snap: !S2.p.snap }, toast: S2.p.snap ? 'Snapping off' : 'Snapping on — 5 mm grid and key points' };
      if (key === 'resetPts') { S2.ui.pts[S2.p.mode] = clonePts(PDEF[S2.p.mode]); return { recompute: true, toast: 'Points reset' }; }
      return null;
    },
    onPointer(type, x, y, S2) {
      const { p, ui } = S2; const w = S2.world ? S2.world.toWorld(x, y) : [x, y]; const z = S2.world ? S2.world.zoom : 1;
      const m = [(w[0] - GOX) / GK, (GOY - w[1]) / GK]; const pts = ui.pts && ui.pts[p.mode]; if (!pts) return null;
      const near = () => { let best = null, bd = 18 / (GK * z); Object.entries(pts).forEach(([k, q]) => { const d = dist(q, m); if (d < bd) { bd = d; best = k; } }); return best; };
      if (type === 'hover') { if (ui.tool !== 'move') return null; const h = near(); if (h !== ui.hover) { ui.hover = h; return { redraw: true }; } return null; }
      if (type === 'down') {
        if (ui.tool !== 'move' || x > 688) return null;
        const k = near(); if (!k) return null;
        const keys = buildC(p, ui).b.keys.filter((q) => !Object.values(pts).some((g2) => dist(g2, q.p) < 0.5));
        ui.drag = { key: k, keys, grab: sub(pts[k], m) }; ui.hover = k; return { redraw: true };
      }
      if (!ui.drag) return null;
      if (type === 'move') {
        const k = ui.drag.key; let q = add(m, ui.drag.grab); let mark = null;
        if (p.snap) {
          let bd = 12 / (GK * z); ui.drag.keys.forEach((kp) => { const d = dist(kp.p, q); if (d < bd) { bd = d; mark = { p: kp.p, label: kp.name }; } });
          if (mark) q = [mark.p[0], mark.p[1]]; else { q = [Math.round(q[0] / 5) * 5, Math.round(q[1] / 5) * 5]; mark = { p: q, label: `Grid (${q[0]}, ${q[1]})` }; }
        } else q = [Math.round(q[0] * 2) / 2, Math.round(q[1] * 2) / 2];
        q = [clamp(q[0], -60, 220), clamp(q[1], -60, 190)];
        if (Object.entries(pts).some(([k2, o2]) => k2 !== k && dist(o2, q) < 8)) return null; // keep the given points apart
        ui.snapMark = mark;
        if (pts[k][0] === q[0] && pts[k][1] === q[1]) return { redraw: true };
        pts[k] = q; return { recompute: true };
      }
      if (type === 'up') { ui.drag = null; ui.snapMark = null; return { recompute: true }; }
      return null;
    },
    draw(g, S2) {
      const { p, step, st, dur, ui } = S2; const prog = clamp(st / dur, 0, 1);
      const m = buildC(p, ui); const nSteps = m.steps.length; const last = step >= nSteps - 1;
      D.clear(g, '#ffffff');
      // ── zoomable sheet ──
      g.save(); g.beginPath(); g.rect(8, 8, 680, 544); g.clip();
      if (S2.world) S2.world.apply(g);
      for (let xm = -100; xm <= 260; xm += 5) D.line(g, gX(xm), gY(-100), gX(xm), gY(230), { color: xm % 10 === 0 ? '#e2e8f0' : '#f1f5f9', width: 1 });
      for (let ym = -100; ym <= 230; ym += 5) D.line(g, gX(-100), gY(ym), gX(260), gY(ym), { color: ym % 10 === 0 ? '#e2e8f0' : '#f1f5f9', width: 1 });
      const ctx = { step, prog, showRadii: p.showRadii, tool: ui && ui.tool, hover: ui && ui.hover, dragging: ui && ui.drag && ui.drag.key, warnText: null };
      const order = { cl: 0, seg: 1, line: 1, arc: 1, circle: 1, trim: 2, poly: 2, tick: 3, right: 3, angm: 3, num: 4, pt: 5, note: 6, warn: 7 };
      const els = m.b.els.filter((e) => e.s <= step).sort((a, b) => (order[a.t] - order[b.t]) || ((a.st === 'final') - (b.st === 'final')));
      els.forEach((e) => drawEl(g, e, ctx));
      if (ui && ui.snapMark) { const q = gP(ui.snapMark.p); snapMarker(g, q[0], q[1], ui.snapMark.label); }
      g.restore();
      // sheet frame + title
      D.rect(g, 8, 8, 680, 544, { stroke: '#cbd5e1', width: 1.5, r: 8 });
      D.rect(g, 16, 16, D.textWidth(g, MODE_NAME[m.mode], 17, 800) + 20, 30, { fill: 'rgba(255,255,255,0.92)', r: 8 });
      D.text(g, MODE_NAME[m.mode], 26, 31, { size: 17, weight: 800 });
      if (ctx.warnText) { const w2 = Math.min(640, D.textWidth(g, ctx.warnText, 15, 700) + 24); D.rect(g, 348 - w2 / 2, 500, w2, 34, { fill: C.redSoft, stroke: C.red, width: 1.5, r: 8 }); D.text(g, ctx.warnText, 348, 517, { size: 15, weight: 700, color: C.red, align: 'center' }); }
      else D.text(g, ctx.tool === 'move' ? `Drag the blue points · snap ${p.snap ? 'ON' : 'OFF'} · wheel / pinch = zoom` : 'Drag to pan · wheel / pinch to zoom', 348, 536, { size: 14, color: C.muted, align: 'center', halo: true });
      // ── results panel ──
      const X0 = 700, Wp = 290;
      D.rect(g, X0, 8, Wp, 544, { fill: '#f8fafc', stroke: '#cbd5e1', width: 1.5, r: 10 });
      D.text(g, `Step ${step + 1} of ${nSteps}`, X0 + 14, 30, { size: 15, weight: 800, color: CUR });
      const tl = wrapText(g, m.steps[step] ? m.steps[step].title : '', Wp - 28, 16, 800).slice(0, 2);
      tl.forEach((ln, i) => D.text(g, ln, X0 + 14, 54 + i * 20, { size: 16, weight: 800 }));
      let y = 60 + tl.length * 20 + 6;
      D.line(g, X0 + 12, y, X0 + Wp - 12, y, { color: '#e2e8f0', width: 1.5 }); y += 18;
      D.text(g, 'Measured results', X0 + 14, y, { size: 15, weight: 800, color: C.muted }); y += 8;
      m.rows.forEach(([k, v]) => {
        y += 22; D.text(g, k, X0 + 14, y, { size: 14, color: C.muted, weight: 600 });
        y += 20; D.text(g, v, X0 + 24, y, { size: 17, weight: 800, color: last ? '#15803d' : C.ink });
      });
      // legend
      const ly = 440;
      D.line(g, X0 + 12, ly - 16, X0 + Wp - 12, ly - 16, { color: '#e2e8f0', width: 1.5 });
      D.line(g, X0 + 16, ly, X0 + 56, ly, G.LINE.construction); D.text(g, 'construction (thin)', X0 + 66, ly, { size: 14, color: C.muted });
      D.line(g, X0 + 16, ly + 24, X0 + 56, ly + 24, { color: CUR, width: 1.8 }); D.text(g, 'current step / compass arc', X0 + 66, ly + 24, { size: 14, color: C.muted });
      D.line(g, X0 + 16, ly + 48, X0 + 56, ly + 48, FINAL); D.text(g, 'final geometry (thick)', X0 + 66, ly + 48, { size: 14, color: C.muted });
      D.circle(g, X0 + 36, ly + 74, 8, { stroke: '#2563eb', width: 2, fill: 'rgba(37,99,235,0.12)' }); D.text(g, 'draggable point', X0 + 66, ly + 74, { size: 14, color: C.muted });
    },
  };

  // ═══════════════════════════════════ 2. DIMENSIONING ═══════════════════════════════════
  const DIM_AUTO = '#1d4ed8', DIM_CUR = '#ea580c', DIM_USER = '#7c3aed', DIM_SEL = '#dc2626';
  const PT_KIND = { A: 'Endpoint', B: 'Endpoint', C: 'Tangent point', D: 'Tangent point', E: 'Endpoint', F: 'Endpoint', Hc: 'Centre (hole)', Fc: 'Centre (arc)', HL: 'Quadrant', HR: 'Quadrant', HT: 'Quadrant', HB: 'Quadrant' };
  const EDGE_NAME = { bottom: 'bottom edge', right: 'right edge', top: 'top edge', chamfer: 'angled edge', left: 'left edge' };
  function partGeom(p) {
    const W = p.W, H = p.H, R = p.R; const tn = Math.tan(p.theta * RAD);
    const cx = Math.max(5, Math.round(Math.min(0.3 * W, (0.5 * H) / tn))); const vv = cx * tn;
    const hx = Math.round(0.55 * W), hy = Math.round(0.45 * H); const rh = p.d / 2;
    const pts = { A: [0, 0], B: [W, 0], C: [W, H - R], D: [W - R, H], E: [cx, H], F: [0, H - vv], Hc: [hx, hy], Fc: [W - R, H - R], HL: [hx - rh, hy], HR: [hx + rh, hy], HT: [hx, hy + rh], HB: [hx, hy - rh] };
    const edges = { bottom: ['A', 'B'], right: ['B', 'C'], top: ['D', 'E'], chamfer: ['E', 'F'], left: ['F', 'A'] };
    const inside = (q, m) => {
      if (q[0] < m || q[1] < m || q[0] > W - m || q[1] > H - m) return false;
      if (crs(sub(pts.F, pts.E), sub(q, pts.E)) < m * dist(pts.E, pts.F)) return false; // below / right of the angled edge
      if (q[0] > W - R && q[1] > H - R && dist(q, pts.Fc) > R - m) return false;
      return true;
    };
    let fits = true; for (let i = 0; i < 72; i++) if (!inside(add(pts.Hc, mul(dir((i * 5) * RAD), rh)), 1.5)) { fits = false; break; }
    return { W, H, R, cx, vv, hx, hy, rh, pts, edges, fits, theta: p.theta };
  }
  function dimLayout(p, pg) {
    const sc = Math.min(670 / (pg.W + 58), 520 / (pg.H + 50));
    const ox = 20 + 28 * sc + (670 - (pg.W + 58) * sc) / 2; const oy = 20 + (24 + pg.H) * sc + (520 - (pg.H + 50) * sc) / 2;
    const X = (x) => ox + x * sc, Y = (y) => oy - y * sc;
    return { sc, ox, oy, X, Y, P: (q) => [X(q[0]), Y(q[1])], toMM: (sx, sy) => [(sx - ox) / sc, (oy - sy) / sc], tp: clamp(p.th * sc, 14, 28), ap: clamp(p.al * sc, 7, 24) };
  }
  function autoDims(pg) {
    return [
      { id: 'W', type: 'linear', p1: 'A', p2: 'B', axis: 'h', off: -17, s: 1, what: 'overall width' },
      { id: 'H', type: 'linear', p1: 'B', p2: 'D', axis: 'v', off: 17, s: 1, what: 'overall height' },
      { id: 'hx', type: 'linear', p1: 'A', p2: 'Hc', axis: 'h', off: -8, s: 2, what: 'hole centre from the left edge' },
      { id: 'hy', type: 'linear', p1: 'B', p2: 'Hc', axis: 'v', off: 8, s: 2, what: 'hole centre from the bottom edge' },
      { id: 'cx', type: 'linear', p1: 'F', p2: 'E', axis: 'h', off: 8, s: 3, what: 'length of the angled edge along the top' },
      { id: 'ang', type: 'angular', e1: 'top', e2: 'chamfer', flip1: true, rad: 22, s: 4, what: 'angle of the angled edge' },
      { id: 'rad', type: 'radius', arc: 'fillet', ang: 60 * RAD, toY: pg.H + 9, sh: 1, s: 5, what: 'corner radius' },
      { id: 'dia', type: 'diameter', circle: 'hole', ang: 60 * RAD, toY: pg.H + 9, sh: -1, s: 6, what: 'hole diameter' },
    ];
  }
  /** Resolves a dimension definition against the part: geometry (mm), value and text. */
  function resolve(d, pg) {
    const P = pg.pts;
    if (d.type === 'linear' || d.type === 'aligned') {
      const p1 = P[d.p1], p2 = P[d.p2]; if (!p1 || !p2) return null;
      let e1, e2, value;
      if (d.type === 'aligned') { const u = nrm(sub(p2, p1)); const n = perp(u); e1 = add(p1, mul(n, d.off)); e2 = add(p2, mul(n, d.off)); value = dist(p1, p2); }
      else if (d.axis === 'h') { const base = d.off >= 0 ? Math.max(p1[1], p2[1]) : Math.min(p1[1], p2[1]); const yy = base + d.off; e1 = [p1[0], yy]; e2 = [p2[0], yy]; value = Math.abs(p2[0] - p1[0]); }
      else { const base = d.off >= 0 ? Math.max(p1[0], p2[0]) : Math.min(p1[0], p2[0]); const xx = base + d.off; e1 = [xx, p1[1]]; e2 = [xx, p2[1]]; value = Math.abs(p2[1] - p1[1]); }
      return { kind: 'lin', f1: p1, f2: p2, e1, e2, value, text: mm(value), label: `${d.type === 'aligned' ? 'aligned' : d.axis === 'h' ? 'horizontal' : 'vertical'} ${mm(value)} mm` };
    }
    if (d.type === 'angular') {
      const e1 = pg.edges[d.e1], e2 = pg.edges[d.e2]; if (!e1 || !e2) return null;
      const a1 = P[e1[0]], b1 = P[e1[1]], a2 = P[e2[0]], b2 = P[e2[1]];
      const v = lli(a1, nrm(sub(b1, a1)), a2, nrm(sub(b2, a2))); if (!v) return null;
      const far = (a, b) => (dist(a, v) > dist(b, v) ? a : b);
      let d1 = nrm(sub(far(a1, b1), v)); const d2 = nrm(sub(far(a2, b2), v));
      let l1 = Math.max(dist(a1, v), dist(b1, v)); const l2 = Math.max(dist(a2, v), dist(b2, v));
      if (d.flip1) { d1 = mul(d1, -1); l1 = 0; }
      const value = Math.acos(clamp(dot(d1, d2), -1, 1)) * DEG;
      return { kind: 'ang', v, d1, d2, rho: d.rad, l1, l2, value, text: `${mm(value)}°`, label: `angle ${mm(value)}°` };
    }
    if (d.type === 'radius' || d.type === 'diameter') {
      const isR = d.type === 'radius'; const c = isR ? P.Fc : P.Hc; const r = isR ? pg.R : pg.rh;
      const lead = d.toY != null ? Math.max(4, (d.toY - c[1] - r * Math.sin(d.ang)) / Math.max(0.2, Math.sin(d.ang))) : d.lead;
      const sh = d.sh || (Math.cos(d.ang) >= 0 ? 1 : -1);
      return isR ? { kind: 'rad', c, r, ang: d.ang, lead, sh, value: r, text: `R${mm(r)}`, label: `radius R${mm(r)}` }
        : { kind: 'dia', c, r, ang: d.ang, lead, sh, value: 2 * r, text: `Ø${mm(2 * r)}`, label: `diameter Ø${mm(2 * r)}` };
    }
    return null;
  }
  /** Polyline(s) of a resolved dimension (mm) for hit-testing and focus boxes. */
  function shapeOf(r) {
    if (r.kind === 'lin') return [[r.e1, r.e2], [r.f1, r.e1], [r.f2, r.e2]];
    if (r.kind === 'ang') { const a1 = ang(r.d1); const dl = wrapPi(ang(r.d2) - a1); const out = []; for (let i = 0; i < 12; i++) out.push([add(r.v, mul(dir(a1 + (dl * i) / 12), r.rho)), add(r.v, mul(dir(a1 + (dl * (i + 1)) / 12), r.rho))]); return out; }
    const u = dir(r.ang); const end = add(r.c, mul(u, r.r + r.lead)); const st = r.kind === 'dia' ? sub(r.c, mul(u, r.r)) : r.c;
    return [[st, end], [end, add(end, [r.sh * 6, 0])]];
  }
  /** Renders one dimension in BIS style. ph = build-up phase 0..1 (extension lines → dimension line + arrows → value). */
  function renderDim(g, r, L, o) {
    const col = o.col; const tp = L.tp; const ap = L.ap; const sc = L.sc; const uni = o.uni; const ph = o.ph == null ? 1 : o.ph;
    const lw = 1.3; const ext = clamp(ph / 0.35, 0, 1); const showLine = ph > 0.35; const showText = ph > 0.7;
    const T = (s, x, y, rotA, align) => D.text(g, s, x, y, { size: tp, weight: 700, color: col, align: align || 'center', rotate: rotA || 0, halo: true });
    if (r.kind === 'lin') {
      [[r.f1, r.e1], [r.f2, r.e2]].forEach(([f, e]) => {
        const v = sub(e, f); const l = len(v); if (l < 1.2) return; const u = mul(v, 1 / l);
        const a = add(f, mul(u, 1)); const b = add(e, mul(u, 3)); const q = add(a, mul(sub(b, a), ext));
        D.line(g, L.X(a[0]), L.Y(a[1]), L.X(q[0]), L.Y(q[1]), { color: col, width: 1 });
      });
      if (!showLine) return;
      const E1 = L.P(r.e1), E2 = L.P(r.e2); const dx = E2[0] - E1[0], dy = E2[1] - E1[1]; const lpx = Math.hypot(dx, dy) || 1; const ux = dx / lpx, uy = dy / lpx;
      const tw = D.textWidth(g, r.text, tp, 700); const inside = lpx > 2 * ap + 8;
      const M = [(E1[0] + E2[0]) / 2, (E1[1] + E2[1]) / 2];
      const breakIt = uni && showText && lpx > (Math.abs(ux) > 0.3 ? tw : tp) + 2 * ap + 16;
      if (breakIt) { const hw = (Math.abs(ux) > 0.3 ? tw / 2 / Math.abs(ux) : tp / 2 / Math.max(0.3, Math.abs(uy))) + 5; const hwc = Math.min(hw, tw / 2 + 12); D.line(g, E1[0], E1[1], M[0] - ux * hwc, M[1] - uy * hwc, { color: col, width: lw }); D.line(g, M[0] + ux * hwc, M[1] + uy * hwc, E2[0], E2[1], { color: col, width: lw }); }
      else D.line(g, E1[0], E1[1], E2[0], E2[1], { color: col, width: lw });
      if (inside) { head(g, E1, -ux, -uy, ap, col); head(g, E2, ux, uy, ap, col); }
      else { D.line(g, E1[0] - ux * ap * 2, E1[1] - uy * ap * 2, E1[0], E1[1], { color: col, width: lw }); D.line(g, E2[0], E2[1], E2[0] + ux * ap * 2, E2[1] + uy * ap * 2, { color: col, width: lw }); head(g, E1, ux, uy, ap, col); head(g, E2, -ux, -uy, ap, col); }
      if (!showText) return;
      if (uni) {
        if (breakIt) T(r.text, M[0], M[1]);
        else { let nx = -uy, ny = ux; if (ny > 0.1 || (Math.abs(ny) <= 0.1 && nx > 0)) { nx = -nx; ny = -ny; } const off = tp * 0.7 + Math.abs(nx) * (tw / 2); T(r.text, M[0] + nx * off, M[1] + ny * off); }
      } else {
        let phi = Math.atan2(dy, dx); if (phi >= Math.PI / 2 - 1e-6) phi -= Math.PI; if (phi < -Math.PI / 2 - 1e-6) phi += Math.PI;
        const up = [Math.sin(phi), -Math.cos(phi)]; const off = tp * 0.62 + 2;
        T(r.text, M[0] + up[0] * off, M[1] + up[1] * off, Math.abs(phi) > 1e-3 ? phi : 0);
      }
      return;
    }
    if (r.kind === 'ang') {
      const V = L.P(r.v); const rp = r.rho * sc; const a1 = ang(r.d1); const dl = wrapPi(ang(r.d2) - a1); const sg = Math.sign(dl) || 1;
      [[r.d1, r.l1], [r.d2, r.l2]].forEach(([d, l]) => {
        if (r.rho + 3 <= l) return; const a = add(r.v, mul(d, l + 1)), b = add(r.v, mul(d, r.rho + 3)); const q = add(a, mul(sub(b, a), ext));
        D.line(g, L.X(a[0]), L.Y(a[1]), L.X(q[0]), L.Y(q[1]), { color: col, width: 1 });
      });
      if (!showLine) return;
      const small = Math.abs(dl) * rp < 2 * ap + 6; const extA = small ? (ap * 1.8) / rp : 0;
      g.save(); g.beginPath(); g.arc(V[0], V[1], rp, -(a1 - sg * extA), -(a1 + dl + sg * extA), sg > 0); g.strokeStyle = col; g.lineWidth = lw; g.stroke(); g.restore();
      const tip = (aa) => [V[0] + Math.cos(aa) * rp, V[1] - Math.sin(aa) * rp];
      const tan = (aa, s) => [-Math.sin(aa) * s, -Math.cos(aa) * s]; // screen direction of increasing model angle × s
      const k = small ? -1 : 1;
      const t1 = tan(a1, -sg * k), t2 = tan(a1 + dl, sg * k); head(g, tip(a1), t1[0], t1[1], ap, col); head(g, tip(a1 + dl), t2[0], t2[1], ap, col);
      if (!showText) return;
      const am = a1 + dl / 2; const tw = D.textWidth(g, r.text, tp, 700);
      if (uni) { const rr = rp + tp * 0.6 + (tw / 2) * Math.abs(Math.cos(am)) + 4; T(r.text, V[0] + Math.cos(am) * rr, V[1] - Math.sin(am) * rr); }
      else { let phi = wrapPi(-(am - Math.PI / 2)); if (phi >= Math.PI / 2) phi -= Math.PI; if (phi < -Math.PI / 2) phi += Math.PI; const rr = rp + tp * 0.62 + 2; T(r.text, V[0] + Math.cos(am) * rr, V[1] - Math.sin(am) * rr, phi); }
      return;
    }
    // radius / diameter (leader with a horizontal shoulder)
    const u = dir(r.ang); const Cs = L.P(r.c); const q = L.P(add(r.c, mul(u, r.r))); const end = L.P(add(r.c, mul(u, r.r + r.lead)));
    const sd = [u[0], -u[1]];
    const start = r.kind === 'dia' ? L.P(sub(r.c, mul(u, r.r))) : Cs;
    const f = showLine ? 1 : ext; D.line(g, start[0], start[1], start[0] + (end[0] - start[0]) * f, start[1] + (end[1] - start[1]) * f, { color: col, width: lw });
    if (!showLine) return;
    head(g, q, sd[0], sd[1], ap, col);
    if (r.kind === 'dia') head(g, start, -sd[0], -sd[1], ap, col);
    else D.circle(g, Cs[0], Cs[1], 2.5, { fill: col });
    const shl = 6 * sc; const se = [end[0] + r.sh * shl, end[1]]; D.line(g, end[0], end[1], se[0], se[1], { color: col, width: lw });
    if (showText) T(r.text, se[0] + r.sh * 4, se[1] - (uni ? 0 : 0), 0, r.sh > 0 ? 'left' : 'right');
  }

  const DTOOLS = [
    { key: 'select', label: '👆 Select / move', title: 'Click a (violet) dimension to select it, drag it to change its offset; Delete removes it' },
    { key: 'linear', label: '↔ Linear', title: 'Horizontal / vertical dimension: click two key points (or one edge)' },
    { key: 'aligned', label: '⤢ Aligned', title: 'Dimension parallel to the feature: click two key points (or one edge)' },
    { key: 'angular', label: '∠ Angular', title: 'Click two edges that meet' },
    { key: 'radius', label: 'R Radius', title: 'Click the corner arc' },
    { key: 'diameter', label: 'Ø Diameter', title: 'Click the hole' },
  ];
  const TOOL_HINT = { select: 'Click a violet dimension; drag to move it; Delete removes it.', linear: 'Click two key points (or one edge).', aligned: 'Click two key points (or one edge).', angular: 'Click two edges that meet.', radius: 'Click the corner arc.', diameter: 'Click the hole.' };
  let DIM_SEQ = 1;
  function userValid(d) {
    if (!d || typeof d !== 'object') return false;
    if (d.type === 'linear' || d.type === 'aligned') return typeof d.p1 === 'string' && typeof d.p2 === 'string' && Number.isFinite(d.off) && (d.type === 'aligned' || d.axis === 'h' || d.axis === 'v');
    if (d.type === 'angular') return typeof d.e1 === 'string' && typeof d.e2 === 'string' && Number.isFinite(d.rad);
    if (d.type === 'radius' || d.type === 'diameter') return Number.isFinite(d.ang) && Number.isFinite(d.lead);
    return false;
  }
  /** Picks what is under the pointer on the part (mm) — key point, edge, arc or circle. */
  function pickFeature(pg, q, tol) {
    let best = null, bd = tol * 1.2;
    Object.entries(pg.pts).forEach(([k, v]) => { const d = dist(v, q); if (d < bd) { bd = d; best = { kind: 'pt', id: k, p: v, label: PT_KIND[k] || 'Point' }; } });
    if (best) return best;
    bd = tol;
    Object.entries(pg.edges).forEach(([k, [a, b]]) => { const d = segDist(q, pg.pts[a], pg.pts[b]); if (d < bd) { bd = d; best = { kind: 'edge', id: k, label: EDGE_NAME[k] }; } });
    const dh = Math.abs(dist(q, pg.pts.Hc) - pg.rh); if (dh < bd) { bd = dh; best = { kind: 'circle', id: 'hole', label: 'hole (circle)' }; }
    const vf = sub(q, pg.pts.Fc); const df = Math.abs(len(vf) - pg.R); if (df < bd && vf[0] >= -0.5 && vf[1] >= -0.5) { bd = df; best = { kind: 'arc', id: 'fillet', label: 'corner arc' }; }
    return best;
  }
  /** True when b repeats what a already dimensions (BIS: never duplicate). */
  function sameDim(a, b, pg) {
    const ra = resolve(a, pg), rb = resolve(b, pg); if (!ra || !rb || ra.kind !== rb.kind || Math.abs(ra.value - rb.value) > 0.05) return false;
    if (ra.kind === 'lin') {
      const pa = [a.p1, a.p2].sort().join(), pb = [b.p1, b.p2].sort().join();
      if (a.type === 'aligned' || b.type === 'aligned') return pa === pb;
      if (a.axis !== b.axis) return false;
      const k = a.axis === 'h' ? 0 : 1; const sa = [ra.f1[k], ra.f2[k]].sort((x, y) => x - y), sb = [rb.f1[k], rb.f2[k]].sort((x, y) => x - y);
      return Math.abs(sa[0] - sb[0]) + Math.abs(sa[1] - sb[1]) < 0.1;
    }
    if (ra.kind === 'ang') return dist(ra.v, rb.v) < 0.1;
    return true;
  }
  const visibleDims = (p, ui, pg) => (p.showAuto ? autoDims(pg) : []).concat((ui && ui.dims) || []);
  const AUTO_MSG = 'Blue dimensions belong to the step sequence — turn off "Show the step-by-step dimensions" to dimension the part yourself.';

  S['eg-dimensioning'] = {
    view2d: true,
    modes: [{ key: 'aligned', label: 'Aligned system (BIS SP 46)' }, { key: 'uni', label: 'Unidirectional system' }],
    stepDuration: 4,
    tools: DTOOLS,
    actions: [
      { key: 'delete', label: '🗑 Delete selected', title: 'Delete the selected dimension (or press Delete)' },
      { key: 'clear', label: '✖ Clear mine', title: 'Remove all the dimensions you added' },
    ],
    initUi: () => ({ tool: 'select', dims: [], sel: null, pending: null, hoverSnap: null, drag: null }),
    saveUi: (ui) => ({ tool: ui.tool, dims: ui.dims }),
    restoreUi(saved, ui) {
      if (saved && Array.isArray(saved.dims)) ui.dims = saved.dims.filter(userValid).map((d) => Object.assign({}, d, { id: 'u' + DIM_SEQ++ }));
      if (saved && DTOOLS.some((t) => t.key === saved.tool)) ui.tool = saved.tool;
      return ui;
    },
    params: [
      { key: 'W', label: 'Plate width W', type: 'range', min: 60, max: 150, step: 5, default: 100, unit: 'mm' },
      { key: 'H', label: 'Plate height H', type: 'range', min: 40, max: 90, step: 5, default: 60, unit: 'mm' },
      { key: 'd', label: 'Hole diameter Ø', type: 'range', min: 8, max: 30, step: 1, default: 20, unit: 'mm' },
      { key: 'R', label: 'Corner arc (fillet) radius R', type: 'range', min: 5, max: 20, step: 1, default: 12, unit: 'mm' },
      { key: 'theta', label: 'Angle of the angled edge θ', type: 'range', min: 20, max: 60, step: 5, default: 45, unit: '°' },
      { key: 'th', label: 'Text height (on the sheet)', type: 'range', min: 2.5, max: 6, step: 0.5, default: 3.5, unit: 'mm', help: 'BIS recommends 3.5 mm for dimension figures.' },
      { key: 'al', label: 'Arrowhead length (width = length/3)', type: 'range', min: 2, max: 5, step: 0.5, default: 3, unit: 'mm' },
      { key: 'showAuto', label: 'Show the step-by-step dimensions', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Bracket plate 100 × 60, Ø20 hole', values: { W: 100, H: 60, d: 20, R: 12, theta: 45 } },
      { label: 'Long base plate 150 × 50, Ø16 hole', values: { W: 150, H: 50, d: 16, R: 10, theta: 30 } },
      { label: 'Small gusset 70 × 80, 60° edge', values: { W: 70, H: 80, d: 14, R: 8, theta: 60 } },
      { label: 'Unidirectional system, large text', values: { mode: 'uni', th: 5, al: 4 } },
    ],
    validate(p) {
      const pg = partGeom(p); const w = [];
      if (!pg.fits) w.push(`The Ø${p.d} hole does not fit inside the plate with at least 1.5 mm of material — reduce Ø or enlarge the plate.`);
      return w;
    },
    compute(p, ui) {
      const pg = partGeom(p); const uni = p.mode === 'uni'; const autos = p.showAuto ? autoDims(pg) : [];
      const user = ((ui && ui.dims) || []).map((d) => ({ d, r: resolve(d, pg) })).filter((x) => x.r);
      const L = dimLayout(p, pg); const len2 = dist(pg.pts.E, pg.pts.F);
      return {
        formulas: [
          { name: 'Drop of the angled edge', formula: 'v = c · tan θ', given: `c = ${pg.cx} mm, θ = ${p.theta}°`, calc: `${pg.cx} × tan ${p.theta}°`, result: mm(pg.vv), unit: 'mm' },
          { name: 'True length of the angled edge (aligned dimension)', formula: 'l = c / cos θ', given: `c = ${pg.cx} mm, θ = ${p.theta}°`, calc: `${pg.cx} / cos ${p.theta}°`, result: mm(len2), unit: 'mm' },
          { name: 'Arrowhead proportion (BIS 3 : 1)', formula: 'width = length / 3', given: `length = ${p.al} mm`, calc: `${p.al} / 3`, result: mm(p.al / 3), unit: 'mm' },
          { name: 'Hole clearance to the bottom edge', formula: 'e = y_c − Ø/2', given: `y_c = ${pg.hy} mm, Ø = ${p.d} mm`, calc: `${pg.hy} − ${mm(p.d / 2)}`, result: mm(pg.hy - p.d / 2), unit: 'mm' },
        ],
        readouts: [
          { label: 'Part', value: `${p.W} × ${p.H} mm, Ø${p.d}, R${p.R}, ${p.theta}°` },
          { label: 'System', value: uni ? 'Unidirectional' : 'Aligned', tone: 'info' },
          { label: 'Dimensions', value: `${autos.length} step + ${user.length} yours`, tone: 'good' },
          { label: 'Tool', value: (DTOOLS.find((t) => t.key === (ui && ui.tool)) || DTOOLS[0]).label.replace(/^\S+\s/, '') },
        ],
        state: {
          part: `plate ${p.W} × ${p.H} mm with a Ø${p.d} hole centred at (${pg.hx}, ${pg.hy}) mm, corner arc R${p.R}, angled edge ${p.theta}° over ${pg.cx} mm`,
          dimensioningSystem: uni ? 'unidirectional (all figures horizontal, dimension lines broken)' : 'aligned (figures above the dimension line, readable from the bottom or the right)',
          textHeight: `${p.th} mm`, arrowhead: `${p.al} mm × ${mm(p.al / 3)} mm (3:1, filled)`,
          stepDimensions: autos.length ? autos.map((d) => { const r = resolve(d, pg); return `${d.what}: ${r ? r.text : '—'}`; }).join('; ') : 'hidden',
          userDimensions: user.length ? user.map(({ d, r }) => `${d.type} ${r.text}${d.type === 'linear' || d.type === 'aligned' ? ` (${d.p1}–${d.p2}, offset ${mm(d.off)} mm)` : ''}`).join('; ') : 'none',
          selectedDimension: ui && ui.sel ? ((user.find((x) => x.d.id === ui.sel) || {}).r || { label: '—' }).label : 'none',
          currentTool: (ui && ui.tool) || 'select', drawingScale: `1 mm = ${fmt(L.sc, 3)} px on screen`, holeFits: pg.fits ? 'yes' : 'no',
        },
        explain: {
          what: `The ${p.W} × ${p.H} mm plate is dimensioned in the ${uni ? 'unidirectional' : 'aligned'} system: overall sizes, hole location, the angled edge (${pg.cx} mm, ${p.theta}°), the corner R${p.R} and the Ø${p.d} hole.`,
          why: 'Every feature needs exactly one size and one location dimension so the part can be made without scaling the drawing; extension lines carry the size off the object so that dimensions stay outside the view.',
          param: `Part sizes (W, H, Ø, R, θ), text height ${p.th} mm, arrowhead length ${p.al} mm and the dimensioning system.`,
          effect: 'Changing a size moves the feature and the value printed on its dimension; the layout (smaller dimensions inside larger ones) stays the same.',
        },
      };
    },
    steps(p) {
      const pg = partGeom(p); const uni = p.mode === 'uni';
      return [
        { title: 'The part to be dimensioned', text: `Plate ${p.W} × ${p.H} mm (thick outline), Ø${p.d} hole, corner arc R${p.R}, angled edge at ${p.theta}°. Centre lines are thin chain lines.` },
        { title: 'Overall linear dimensions', text: `Overall width ${p.W} and height ${p.H} are placed outside the view, furthest from the object.` },
        { title: 'Extension lines', text: `Extension lines start with a small gap (≈1 mm) from the object and extend ≈3 mm beyond the dimension line. The hole is located by ${pg.hx} and ${pg.hy} — smaller dimensions inside larger ones.` },
        { title: 'Dimension lines with arrowheads', text: `Thin dimension lines end in filled arrowheads (length : width = 3 : 1, here ${p.al} × ${mm(p.al / 3)} mm). The angled edge spans ${pg.cx} mm.` },
        { title: 'Angular dimension', text: `The dimension line is an arc centred on the vertex; the value ${p.theta}° is given in degrees.` },
        { title: 'Radial dimension', text: `R${p.R}: the leader starts from the centre side and the arrowhead touches the arc; the value carries the prefix R.` },
        { title: 'Diameter dimension', text: `Ø${p.d}: the dimension line passes through the centre, arrowheads touch the circle; the value carries the prefix Ø.` },
        { title: 'Complete dimensioned drawing', text: `Every feature dimensioned once in the ${uni ? 'unidirectional' : 'aligned'} system. Add your own with the tools — duplicates are refused.` },
      ];
    },
    onTool(key, S2) { S2.ui.pending = null; S2.ui.hoverSnap = null; if (key !== 'select') S2.ui.sel = null; return { recompute: true, toast: TOOL_HINT[key] }; },
    onAction(key, S2) {
      const ui = S2.ui;
      if (key === 'delete') { if (!ui.sel) return { toast: 'Select one of your (violet) dimensions first.' }; ui.dims = ui.dims.filter((d) => d.id !== ui.sel); ui.sel = null; return { recompute: true, toast: 'Dimension deleted' }; }
      if (key === 'clear') { ui.dims = []; ui.sel = null; ui.pending = null; return { recompute: true, toast: 'Your dimensions were removed' }; }
      return null;
    },
    onKey(key, S2) {
      const ui = S2.ui;
      if ((key === 'Delete' || key === 'Backspace') && ui.sel) { ui.dims = ui.dims.filter((d) => d.id !== ui.sel); ui.sel = null; return { recompute: true, toast: 'Dimension deleted' }; }
      if (key === 'Escape' && (ui.pending || ui.sel)) { ui.pending = null; ui.sel = null; return { recompute: true }; }
      return null;
    },
    onPointer(type, x, y, S2) {
      const { p, ui } = S2; const pg = partGeom(p); const L = dimLayout(p, pg);
      const w = S2.world ? S2.world.toWorld(x, y) : [x, y]; const z = S2.world ? S2.world.zoom : 1; const q = L.toMM(w[0], w[1]); const tol = 12 / (L.sc * z);
      const create = ui.tool !== 'select';
      if (type === 'hover') {
        if (!create) return null; const f = pickFeature(pg, q, tol); const key = f ? f.kind + f.id : '';
        if (key !== (ui.hoverSnap ? ui.hoverSnap.key : '')) { ui.hoverSnap = f ? Object.assign({ key }, f) : null; return { redraw: true }; } return null;
      }
      if (type === 'down') {
        if (x > 700) return null;
        if (!create) {
          let best = null, bd = tol;
          ui.dims.forEach((d) => { const r = resolve(d, pg); if (!r) return; shapeOf(r).forEach(([a, b]) => { const dd = segDist(q, a, b); if (dd < bd) { bd = dd; best = d; } }); });
          if (best) { ui.sel = best.id; ui.drag = { id: best.id }; return { recompute: true }; }
          let auto = null; if (p.showAuto) autoDims(pg).forEach((d) => { if (d.s > S2.step) return; const r = resolve(d, pg); if (r && shapeOf(r).some(([a, b]) => segDist(q, a, b) < tol)) auto = d; });
          if (ui.sel) { ui.sel = null; return auto ? { recompute: true, toast: AUTO_MSG } : { recompute: true }; }
          if (auto) return { toast: AUTO_MSG };
          return null;
        }
        const f = pickFeature(pg, q, tol); if (!f) return { toast: TOOL_HINT[ui.tool] };
        const cen = [pg.W / 2, pg.H / 2]; let nd = null;
        if (ui.tool === 'linear' || ui.tool === 'aligned') {
          let a = null, b = null;
          if (f.kind === 'pt') { if (!ui.pending || ui.pending.kind !== 'pt') { ui.pending = { kind: 'pt', id: f.id }; return { redraw: true, toast: `First point: ${f.label} — now click the second point` }; } if (ui.pending.id === f.id) return { toast: 'Pick a different second point.' }; a = ui.pending.id; b = f.id; }
          else if (f.kind === 'edge') { [a, b] = pg.edges[f.id]; }
          else return { toast: 'Click key points or a straight edge for linear dimensions.' };
          const A = pg.pts[a], B = pg.pts[b]; const m2 = mid(A, B);
          if (ui.tool === 'aligned') { const n = perp(nrm(sub(B, A))); const s = dot(sub(m2, cen), n) >= 0 ? 1 : -1; nd = { type: 'aligned', p1: a, p2: b, off: s * 10 }; }
          else { const dx = Math.abs(B[0] - A[0]), dy = Math.abs(B[1] - A[1]); const axis = dx >= dy ? 'h' : 'v'; const s = axis === 'h' ? (m2[1] >= cen[1] ? 1 : -1) : (m2[0] >= cen[0] ? 1 : -1); nd = { type: 'linear', p1: a, p2: b, axis, off: s * 10 }; }
          if (resolve(nd, pg).value < 0.05) { ui.pending = null; return { redraw: true, toast: 'These points have no distance in that direction.' }; }
        } else if (ui.tool === 'angular') {
          if (f.kind !== 'edge') return { toast: 'Click a straight edge.' };
          if (!ui.pending || ui.pending.kind !== 'edge') { ui.pending = { kind: 'edge', id: f.id }; return { redraw: true, toast: `First edge: ${f.label} — now click the second edge` }; }
          if (ui.pending.id === f.id) return { toast: 'Pick a different edge.' };
          nd = { type: 'angular', e1: ui.pending.id, e2: f.id, rad: 15 };
          const r = resolve(nd, pg); if (!r || r.value < 0.5 || r.value > 179.5) { ui.pending = null; return { redraw: true, toast: 'These edges are parallel — no angle.' }; }
          if (Math.abs(r.value - 90) < 0.05) { ui.pending = null; return { redraw: true, toast: 'A 90° corner is understood — right angles are not dimensioned.' }; }
        } else if (ui.tool === 'radius') {
          if (f.kind === 'circle') return { toast: 'BIS: full circles are dimensioned by their diameter (Ø) — use the Ø tool.' };
          if (f.kind !== 'arc') return { toast: 'Click the corner arc.' };
          nd = { type: 'radius', arc: 'fillet', ang: 45 * RAD, lead: 10 };
        } else if (ui.tool === 'diameter') {
          if (f.kind === 'arc') return { toast: 'BIS: arcs (less than a full circle) are dimensioned by their radius (R).' };
          if (f.kind !== 'circle') return { toast: 'Click the hole.' };
          nd = { type: 'diameter', circle: 'hole', ang: 30 * RAD, lead: 10 };
        }
        ui.pending = null; if (!nd) return null;
        if (visibleDims(p, ui, pg).some((d) => sameDim(d, nd, pg))) return { redraw: true, toast: `Duplicate — ${resolve(nd, pg).text} is already dimensioned. BIS: never repeat a dimension.` };
        nd.id = 'u' + DIM_SEQ++; ui.dims.push(nd); ui.sel = nd.id;
        return { recompute: true, toast: `Added ${resolve(nd, pg).label} — use Select to drag it.` };
      }
      if (!ui.drag) return null;
      const d = ui.dims.find((k) => k.id === ui.drag.id); if (!d) { ui.drag = null; return null; }
      if (type === 'move') {
        if (d.type === 'linear') {
          const A = pg.pts[d.p1], B = pg.pts[d.p2]; const xmin = Math.min(A[0], B[0]), xmax = Math.max(A[0], B[0]), ymin = Math.min(A[1], B[1]), ymax = Math.max(A[1], B[1]);
          if ((q[0] < xmin - 2 || q[0] > xmax + 2) && q[1] > ymin - 1 && q[1] < ymax + 1 && ymax - ymin > 0.05) d.axis = 'v';
          else if ((q[1] < ymin - 2 || q[1] > ymax + 2) && q[0] > xmin - 1 && q[0] < xmax + 1 && xmax - xmin > 0.05) d.axis = 'h';
          const c = d.axis === 'h' ? q[1] : q[0]; const lo = d.axis === 'h' ? ymin : xmin, hi = d.axis === 'h' ? ymax : xmax;
          d.off = Math.round((c >= (lo + hi) / 2 ? Math.max(2, c - hi) : Math.min(-2, c - lo)) * 2) / 2;
        } else if (d.type === 'aligned') { const A = pg.pts[d.p1], B = pg.pts[d.p2]; const n = perp(nrm(sub(B, A))); let off = Math.round(dot(sub(q, A), n) * 2) / 2; if (Math.abs(off) < 2) off = off < 0 ? -2 : 2; d.off = off; }
        else if (d.type === 'angular') { const r = resolve(d, pg); if (r) d.rad = Math.round(clamp(dist(q, r.v), 5, 80) * 2) / 2; }
        else { const c = d.type === 'radius' ? pg.pts.Fc : pg.pts.Hc; const rr = d.type === 'radius' ? pg.R : pg.rh; d.ang = Math.atan2(q[1] - c[1], q[0] - c[0]); d.lead = Math.round(clamp(dist(q, c) - rr, 4, 60) * 2) / 2; d.sh = 0; }
        return { recompute: true };
      }
      if (type === 'up') { ui.drag = null; return { recompute: true }; }
      return null;
    },
    draw(g, S2) {
      const { p, step, st, dur, t } = S2; const ui = S2.ui || {}; const prog = clamp(st / dur, 0, 1); const uni = p.mode === 'uni';
      const pg = partGeom(p); const L = dimLayout(p, pg); const P = pg.pts;
      D.clear(g, '#ffffff');
      g.save(); g.beginPath(); g.rect(8, 8, 690, 544); g.clip();
      if (S2.world) S2.world.apply(g);
      // part: thick visible outline, centre lines
      g.save(); g.beginPath(); g.moveTo(...L.P(P.A)); g.lineTo(...L.P(P.B)); g.lineTo(...L.P(P.C)); g.arc(L.X(P.Fc[0]), L.Y(P.Fc[1]), pg.R * L.sc, 0, -Math.PI / 2, true); g.lineTo(...L.P(P.E)); g.lineTo(...L.P(P.F)); g.closePath();
      g.fillStyle = '#f1f5f9'; g.fill(); g.lineWidth = 2.8; g.strokeStyle = '#0f172a'; g.lineJoin = 'round'; g.stroke(); g.restore();
      D.circle(g, L.X(P.Hc[0]), L.Y(P.Hc[1]), pg.rh * L.sc, { fill: '#ffffff', stroke: pg.fits ? '#0f172a' : C.red, width: 2.8 });
      const e = pg.rh + 3; G.seg(g, L.P(add(P.Hc, [-e, 0])), L.P(add(P.Hc, [e, 0])), G.LINE.centre); G.seg(g, L.P(add(P.Hc, [0, -e])), L.P(add(P.Hc, [0, e])), G.LINE.centre);
      const fc = L.P(P.Fc); D.line(g, fc[0] - 7, fc[1], fc[0] + 7, fc[1], { color: '#b91c1c', width: 1.2 }); D.line(g, fc[0], fc[1] - 7, fc[0], fc[1] + 7, { color: '#b91c1c', width: 1.2 });
      if (step === 0) {
        D.tag(g, 'hole', L.X(P.Hc[0]), L.Y(P.Hc[1] - pg.rh) + 18, { bg: '#334155', size: 14, align: 'center' });
        D.tag(g, 'corner arc', L.X(P.Fc[0]) - 8, L.Y(P.Fc[1]) + 22, { bg: '#334155', size: 14, align: 'right' });
        D.tag(g, 'angled edge', L.X(P.F[0]) + 14, L.Y(P.F[1]) + 18, { bg: '#334155', size: 14 });
        D.focus(g, L.X(0) - 6, L.Y(pg.H) - 6, pg.W * L.sc + 12, pg.H * L.sc + 12, t);
      }
      // dimensions
      if (p.showAuto) {
        const autos = autoDims(pg);
        autos.forEach((d) => { if (d.s > step) return; const r = resolve(d, pg); if (!r) return; const cur = d.s === step; renderDim(g, r, L, { col: cur ? DIM_CUR : DIM_AUTO, uni, ph: cur ? prog : 1 }); });
        const curD = autos.filter((d) => d.s === step).map((d) => resolve(d, pg)).filter(Boolean);
        if (curD.length && step < 7) {
          const pa = []; curD.forEach((r) => shapeOf(r).forEach(([a, b]) => { pa.push(L.P(a), L.P(b)); }));
          const xs = pa.map((q) => q[0]), ys = pa.map((q) => q[1]); const x0 = Math.min(...xs) - 14, y0 = Math.min(...ys) - 14;
          D.focus(g, x0, y0, Math.max(...xs) + 14 - x0, Math.max(...ys) + 14 - y0, t);
        }
      }
      (ui.dims || []).forEach((d) => { const r = resolve(d, pg); if (r) renderDim(g, r, L, { col: d.id === ui.sel ? DIM_SEL : DIM_USER, uni }); });
      // pending pick / hover snap
      if (ui.pending) {
        if (ui.pending.kind === 'pt') { const q = L.P(P[ui.pending.id]); D.circle(g, q[0], q[1], 8, { stroke: DIM_USER, width: 3 }); }
        else { const [a, b] = pg.edges[ui.pending.id]; D.line(g, ...L.P(P[a]), ...L.P(P[b]), { color: DIM_USER, width: 6, alpha: 0.55 }); }
      }
      if (ui.hoverSnap && ui.tool !== 'select') {
        const f = ui.hoverSnap;
        if (f.kind === 'pt') { const q = L.P(f.p); snapMarker(g, q[0], q[1], f.label, '#16a34a'); }
        else if (f.kind === 'edge') { const [a, b] = pg.edges[f.id]; D.line(g, ...L.P(P[a]), ...L.P(P[b]), { color: '#16a34a', width: 5, alpha: 0.55 }); const m2 = L.P(mid(P[a], P[b])); D.tag(g, f.label, m2[0] + 10, m2[1] - 18, { bg: '#16a34a', size: 14 }); }
        else { const c = f.id === 'hole' ? P.Hc : P.Fc; const rr = f.id === 'hole' ? pg.rh : pg.R; D.circle(g, L.X(c[0]), L.Y(c[1]), rr * L.sc, { stroke: '#16a34a', width: 5, alpha: 0.55 }); D.tag(g, f.label, L.X(c[0]) + rr * L.sc + 8, L.Y(c[1]) - rr * L.sc, { bg: '#16a34a', size: 14 }); }
      }
      g.restore();
      D.rect(g, 8, 8, 690, 544, { stroke: '#cbd5e1', width: 1.5, r: 8 });
      D.text(g, `All dimensions in mm · ${uni ? 'unidirectional' : 'aligned'} system`, 353, 540, { size: 14, color: C.muted, align: 'center', halo: true });
      if (!pg.fits) D.tag(g, 'Hole does not fit — see warning', 353, 26, { bg: C.red, size: 14, align: 'center' });

      // ── right panel ──
      const X0 = 708, Wp = 284; const ink = C.ink;
      D.rect(g, X0, 8, Wp, 544, { fill: '#f8fafc', stroke: '#cbd5e1', width: 1.5, r: 10 });
      D.text(g, 'BIS SP 46 — dimensioning', X0 + 14, 30, { size: 16, weight: 800 });
      const para = (str, y0, o = {}) => { const sz = o.size || 14; const lines = wrapText(g, str, Wp - 28, sz, o.weight || 600); lines.forEach((ln, i) => D.text(g, ln, X0 + 14, y0 + i * (sz + 5), { size: sz, weight: o.weight || 600, color: o.color || C.muted })); return y0 + lines.length * (sz + 5); };
      let y = 58;
      if (step >= 1 && step <= 3) {
        // magnified detail (×8): object, gap, extension line, dimension line and arrowhead
        D.text(g, 'Detail (enlarged ×8)', X0 + 14, y, { size: 15, weight: 800, color: DIM_CUR }); y += 14;
        const bx = X0 + 14, by = y, bw = Wp - 28, bh = 176; D.rect(g, bx, by, bw, bh, { fill: '#ffffff', stroke: '#cbd5e1', width: 1, r: 6 });
        const k8 = 8; const objY = by + bh - 34; const x1 = bx + 76;
        D.line(g, bx + 10, objY, x1, objY, { color: ink, width: 3 }); D.line(g, x1, objY, x1, by + bh - 6, { color: ink, width: 3 });
        const gapT = objY - 1 * k8; const dimY = by + 50; const topE = dimY - 3 * k8;
        const cE = step === 2 ? DIM_CUR : DIM_AUTO, cL = step === 3 ? DIM_CUR : DIM_AUTO;
        D.line(g, x1, gapT, x1, topE, { color: cE, width: 1.6 });
        const ap8 = p.al * k8; D.line(g, x1, dimY, bx + bw - 10, dimY, { color: cL, width: 1.6 });
        head(g, [x1, dimY], -1, 0, ap8, cL);
        D.line(g, x1 - 10, objY, x1 - 10, gapT, { color: C.red, width: 1.2 }); D.text(g, 'gap 1', x1 - 14, objY - 12, { size: 14, color: C.red, weight: 700, align: 'right' });
        D.line(g, x1 - 10, dimY, x1 - 10, topE, { color: C.red, width: 1.2 }); D.text(g, '3', x1 - 16, (dimY + topE) / 2, { size: 14, color: C.red, weight: 700, align: 'right' });
        D.text(g, 'extension line', x1 + 10, (gapT + dimY) / 2 + 4, { size: 14, weight: 700, color: step === 2 ? DIM_CUR : C.muted });
        D.text(g, `arrow ${p.al} × ${mm(p.al / 3)} (3 : 1)`, x1 + 8, dimY + 18, { size: 14, weight: 700, color: step === 3 ? DIM_CUR : C.muted });
        D.text(g, 'dimension line', bx + bw - 12, dimY - 14, { size: 14, weight: 700, color: C.muted, align: 'right' });
        D.text(g, 'object', bx + 12, objY + 18, { size: 14, weight: 700, color: C.muted });
        y = by + bh + 22;
        y = para(step === 1 ? 'Overall sizes go outermost so that no extension line crosses a dimension line.' : step === 2 ? 'Extension lines are thin, start ≈1 mm from the object and run ≈3 mm past the dimension line. Centre lines may be extended as extension lines.' : 'Dimension lines are thin, parallel to the measured length, ≈8–10 mm from the object and from each other, ending in filled 3 : 1 arrowheads.', y);
      } else if (step >= 4 && step <= 6) {
        const info = {
          4: ['Angular dimension', `The dimension line is an arc whose centre is the vertex of the angle. Extension lines continue the edges. Value in degrees: ${p.theta}°.`],
          5: ['Radius', `Prefix R. The dimension line runs from the centre side of the arc; its arrowhead touches the arc from inside. R${p.R}.`],
          6: ['Diameter', `Prefix Ø. The dimension line passes through the centre; arrowheads touch the circle. Full circles are given as Ø, arcs as R. Ø${p.d}.`],
        }[step];
        D.text(g, info[0], X0 + 14, y, { size: 16, weight: 800, color: DIM_CUR }); y += 24;
        y = para(info[1], y, { size: 15, color: ink });
        y += 10; y = para(uni ? 'Unidirectional: every figure is horizontal (read from the bottom); dimension lines are broken for the value.' : 'Aligned: figures sit above the dimension line and are read from the bottom or the right side of the sheet.', y);
      } else if (step === 0) {
        y = para('Line types: visible outline — thick continuous; centre lines — thin chain; dimensions — thin continuous.', y, { size: 15, color: ink });
        y += 10; y = para('Step through to see how the part is dimensioned, or pick a tool above and dimension it yourself.', y);
      } else {
        const rules = [
          'No dimension to hidden lines.',
          'Each dimension once only — avoid duplicates.',
          'Smaller dimensions inside, larger ones outside.',
          uni ? 'Unidirectional: figures horizontal, dimension line broken.' : 'Aligned: figures above the line, read from the bottom or right.',
          'Extension lines: 1 mm gap, 3 mm beyond.',
          'Arrowheads filled, length : width = 3 : 1.',
          'R for arcs, Ø for circles; angles in degrees.',
        ];
        const blocks = rules.map((rl) => wrapText(g, rl, Wp - 58, 14, 600));
        const hBox = 34 + blocks.reduce((s, b) => s + b.length * 18 + 5, 0);
        D.rect(g, X0 + 10, y - 16, Wp - 20, hBox, { fill: '#fffbeb', stroke: '#d97706', width: 1.5, r: 8 });
        D.text(g, 'NOTES — rules applied', X0 + 20, y + 2, { size: 15, weight: 800, color: '#b45309' }); y += 24;
        blocks.forEach((lines, i) => { D.text(g, `${i + 1}.`, X0 + 20, y, { size: 14, weight: 800, color: '#b45309' }); lines.forEach((ln, j) => D.text(g, ln, X0 + 40, y + j * 18, { size: 14, color: ink })); y += lines.length * 18 + 5; });
        y += 4;
      }
      // user dimension list
      const yl = Math.max(y + 16, 420);
      D.line(g, X0 + 12, yl - 14, X0 + Wp - 12, yl - 14, { color: '#e2e8f0', width: 1.5 });
      const list = (ui.dims || []).map((d) => ({ d, r: resolve(d, pg) })).filter((x) => x.r);
      D.text(g, `Your dimensions (${list.length})`, X0 + 14, yl + 4, { size: 15, weight: 800, color: DIM_USER });
      const maxRows = Math.max(1, Math.floor((544 - (yl + 24)) / 19));
      if (!list.length) para(ui.tool && ui.tool !== 'select' ? TOOL_HINT[ui.tool] : 'Pick Linear, Aligned, Angular, R or Ø above and click the part.', yl + 26);
      list.slice(-maxRows).forEach(({ d, r }, i) => D.text(g, `${d.id === ui.sel ? '▶ ' : '• '}${r.label}`, X0 + 18, yl + 26 + i * 19, { size: 14, weight: d.id === ui.sel ? 800 : 600, color: d.id === ui.sel ? DIM_SEL : ink }));
    },
  };
})();
