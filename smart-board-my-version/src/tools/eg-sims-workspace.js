'use strict';

/*
 * Engineering Graphics — Unit 1: 3D Engineering Drawing Workspace (eg-drawing-workspace).
 * A small CAD-like drafting board on a BIS drawing sheet (A4 / A3, mm, first-angle projection):
 * Line / Circle / Arc / Polygon / Rectangle / Dimension, snapping (grid, endpoint, midpoint, centre,
 * quadrant, intersection), ortho, selection with grips, move / rotate / mirror / delete, undo / redo,
 * and "Generate views" which inserts the exact FV, TV and LSV of a solid (EGGenerator.build + EGGeom.view)
 * as ordinary editable objects.
 *
 * Objects are stored in SHEET millimetres, origin at the lower-left corner of the sheet, y upwards:
 *   {id, t:'line', a:[x,y], b:[x,y], lt}          {id, t:'circle', c, r, lt}
 *   {id, t:'arc', c, r, a0, a1, lt}  (anticlockwise from a0 to a1, radians)
 *   {id, t:'poly', kind:'polygon'|'rectangle'|'curve', pts:[[x,y]…], closed, lt}
 *   {id, t:'dim', kind:'aligned'|'horizontal'|'vertical', a, b, p}   {id, t:'dim', kind:'radius'|'diameter', c, r, ang}
 *   {id, t:'label', p, text}
 */
(function () {
  const SIMS = (window.EGSims = window.EGSims || {});
  const D = window.EPDraw; const G = window.EGGeom;
  const { C, fmt, clamp } = D;
  const TAU = Math.PI * 2;

  // ─── Small vector helpers (2-D, mm) ───
  const v2 = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, k) => [a[0] * k, a[1] * k], len: (a) => Math.hypot(a[0], a[1]), dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), mid: (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const n2pi = (a) => { a %= TAU; return a < 0 ? a + TAU : a; };
  const r2 = (v) => Math.round(v * 100) / 100;
  const nice = (v) => { const x = Math.round(v * 10) / 10; return Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : x.toFixed(1); };
  const degs = (r) => (r * 180) / Math.PI;
  function segDist(q, a, b) {
    const d = v2.sub(b, a); const L2 = d[0] * d[0] + d[1] * d[1]; if (L2 < 1e-12) return v2.dist(q, a);
    const t = clamp(((q[0] - a[0]) * d[0] + (q[1] - a[1]) * d[1]) / L2, 0, 1);
    return v2.dist(q, [a[0] + d[0] * t, a[1] + d[1] * t]);
  }
  function circum(a, b, c) {
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    if (Math.abs(d) < 1e-9) return null;
    const a2 = a[0] * a[0] + a[1] * a[1], b2 = b[0] * b[0] + b[1] * b[1], c2 = c[0] * c[0] + c[1] * c[1];
    const x = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d;
    const y = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d;
    return [x, y];
  }
  const sweepOf = (o) => { const s = n2pi(o.a1 - o.a0); return s < 1e-9 ? TAU : s; };
  const inSweep = (o, a) => n2pi(a - o.a0) <= sweepOf(o) + 1e-9;
  const onCirc = (c, r, a) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];

  // ─── Sheet ───
  const SHEETS = {
    A4: { W: 297, H: 210, tbW: 150, tbH: 36 },
    A3: { W: 420, H: 297, tbW: 180, tbH: 44 },
  };
  const SCALES = { '1:1': 1, '1:2': 0.5, '2:1': 2 };
  const TOP = 44; // canvas strip reserved for the command prompt
  function sheet(p) {
    const s = SHEETS[p.sheet] || SHEETS.A4;
    const k = Math.min(960 / s.W, (552 - TOP) / s.H);
    const X0 = (1000 - s.W * k) / 2; const Y1 = TOP + s.H * k;
    const frame = { x0: 20, y0: 10, x1: s.W - 10, y1: s.H - 10 };
    const tb = { x: frame.x1 - s.tbW, y: frame.y0, w: s.tbW, h: s.tbH };
    return { ...s, k, X0, Y1, frame, tb };
  }
  const ratioOf = (p) => SCALES[p.scale] || 1;

  // ─── Line types (BIS SP 46) ───
  const LT = {
    visible: { label: 'Visible — thick', short: 'Visible', style: G.LINE.visible },
    hidden: { label: 'Hidden — dashed', short: 'Hidden', style: G.LINE.hidden },
    centre: { label: 'Centre — chain', short: 'Centre', style: G.LINE.centre },
    construction: { label: 'Construction — thin', short: 'Constr.', style: G.LINE.construction },
    thin: { label: 'Thin continuous (XY)', short: 'Thin', style: { color: '#0f172a', width: 1.4 } },
  };
  const ltStyle = (lt) => (LT[lt] || LT.visible).style;

  const TOOLS = [
    { key: 'select', label: '↖ Select', title: 'Select objects (click / Shift-click / drag a window); drag a grip to edit (S)' },
    { key: 'line', label: '╱ Line', title: 'Line: first point, end point — Shift = ortho (L)' },
    { key: 'circle', label: '◯ Circle', title: 'Circle: centre, then radius (C)' },
    { key: 'arc', label: '◠ Arc', title: 'Arc: centre–start–end or 3-point (A)' },
    { key: 'polygon', label: '⬡ Polygon', title: 'Regular polygon: centre, then a vertex (P)' },
    { key: 'rect', label: '▭ Rect', title: 'Rectangle: two opposite corners (R)' },
    { key: 'dim', label: '↔ Dim', title: 'Dimension: two points then placement; click a circle / arc for Ø / R (D)' },
    { key: 'move', label: '✥ Move', title: 'Move the selection: drag, or base point then destination (M)' },
  ];
  const TOOL_NAME = { select: 'Select', line: 'Line', circle: 'Circle', arc: 'Arc', polygon: 'Polygon', rect: 'Rectangle', dim: 'Dimension', move: 'Move' };
  const ACTIONS = [
    { key: 'undo', label: '↶ Undo', title: 'Undo (Ctrl+Z)' },
    { key: 'redo', label: '↷ Redo', title: 'Redo (Ctrl+Y)' },
    { key: 'rotL', label: '⟲ 15°', title: 'Rotate the selection 15° anticlockwise about its centre' },
    { key: 'rotR', label: '⟳ 15°', title: 'Rotate the selection 15° clockwise about its centre' },
    { key: 'mirror', label: '⇋ Mirror', title: 'Mirror the selection about a vertical line through its centre' },
    { key: 'del', label: '🗑 Delete', title: 'Delete the selection (Delete key)' },
    { key: 'clear', label: '✖ Clear', title: 'Clear the whole drawing (press twice to confirm)' },
    { key: 'gen', label: '⧉ Generate views', title: 'Insert the exact FV, TV and LSV of the chosen solid as editable lines' },
  ];

  // ─── UI state ───
  function ensureUi(ui) {
    if (!ui) return { tool: 'select', objects: [], sel: [], pts: [], undo: [], redo: [], nextId: 1 };
    if (!ui.tool) ui.tool = 'select';
    if (!Array.isArray(ui.objects)) ui.objects = [];
    if (!Array.isArray(ui.sel)) ui.sel = [];
    if (!Array.isArray(ui.pts)) ui.pts = [];
    if (!Array.isArray(ui.undo)) ui.undo = [];
    if (!Array.isArray(ui.redo)) ui.redo = [];
    if (!ui.nextId) ui.nextId = ui.objects.reduce((m, o) => Math.max(m, o.id || 0), 0) + 1;
    return ui;
  }
  const byId = (ui, id) => ui.objects.find((o) => o.id === id);
  const selObjs = (ui) => ui.objects.filter((o) => ui.sel.includes(o.id));
  function pushUndo(ui, before) {
    ui.undo.push(before == null ? JSON.stringify(ui.objects) : before);
    if (ui.undo.length > 80) ui.undo.shift();
    ui.redo = [];
  }
  function addObj(ui, o) { o.id = ui.nextId++; ui.objects.push(o); return o; }
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ─── Object geometry ───
  function polyEdges(o) { const e = []; const n = o.pts.length; for (let i = 0; i + 1 < n; i++) e.push([o.pts[i], o.pts[i + 1]]); if (o.closed && n > 2) e.push([o.pts[n - 1], o.pts[0]]); return e; }
  function centroid(pts) { return v2.mul(pts.reduce((s, q) => v2.add(s, q), [0, 0]), 1 / Math.max(1, pts.length)); }
  /** Dimension geometry in mm: dimension-line ends and the drawn value. */
  function dimGeom(o) {
    if (o.kind === 'radius' || o.kind === 'diameter') {
      const P1 = onCirc(o.c, o.r, o.ang); const P2 = o.kind === 'diameter' ? onCirc(o.c, o.r, o.ang + Math.PI) : o.c;
      return { radial: true, P1, P2, value: o.kind === 'diameter' ? 2 * o.r : o.r };
    }
    const a = o.a, b = o.b, p = o.p;
    if (o.kind === 'horizontal') return { A: [a[0], p[1]], B: [b[0], p[1]], value: Math.abs(b[0] - a[0]) };
    if (o.kind === 'vertical') return { A: [p[0], a[1]], B: [p[0], b[1]], value: Math.abs(b[1] - a[1]) };
    const d = v2.sub(b, a); const L = v2.len(d) || 1; const nrm = [-d[1] / L, d[0] / L];
    const off = (p[0] - a[0]) * nrm[0] + (p[1] - a[1]) * nrm[1];
    return { A: v2.add(a, v2.mul(nrm, off)), B: v2.add(b, v2.mul(nrm, off)), value: L };
  }
  function dimText(o, ratio) { const g = dimGeom(o); const v = nice(g.value / ratio); return o.kind === 'diameter' ? `Ø${v}` : o.kind === 'radius' ? `R${v}` : v; }
  function objPoints(o) {
    if (o.t === 'line') return [o.a, o.b];
    if (o.t === 'circle') return [[o.c[0] - o.r, o.c[1] - o.r], [o.c[0] + o.r, o.c[1] + o.r]];
    if (o.t === 'arc') { const s = sweepOf(o); const out = []; for (let i = 0; i <= 16; i++) out.push(onCirc(o.c, o.r, o.a0 + (s * i) / 16)); return out; }
    if (o.t === 'poly') return o.pts;
    if (o.t === 'dim') { const g = dimGeom(o); return g.radial ? [g.P1, g.P2] : [o.a, o.b, g.A, g.B]; }
    if (o.t === 'label') return [o.p];
    return [];
  }
  function bboxOf(list) {
    const b = [Infinity, Infinity, -Infinity, -Infinity];
    list.forEach((o) => objPoints(o).forEach((q) => { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); }));
    return Number.isFinite(b[0]) ? b : [0, 0, 0, 0];
  }
  function hitDist(o, q) {
    if (o.t === 'line') return segDist(q, o.a, o.b);
    if (o.t === 'circle') return Math.abs(v2.dist(q, o.c) - o.r);
    if (o.t === 'arc') return inSweep(o, ang(o.c, q)) ? Math.abs(v2.dist(q, o.c) - o.r) : Math.min(v2.dist(q, onCirc(o.c, o.r, o.a0)), v2.dist(q, onCirc(o.c, o.r, o.a1)));
    if (o.t === 'poly') return Math.min(...polyEdges(o).map(([a, b]) => segDist(q, a, b)));
    if (o.t === 'dim') { const g = dimGeom(o); return g.radial ? segDist(q, g.P1, g.P2) : Math.min(segDist(q, g.A, g.B), v2.dist(q, v2.mid(g.A, g.B)) - 3); }
    if (o.t === 'label') return v2.dist(q, o.p) - 3;
    return Infinity;
  }
  /** Applies a point map (and, for arcs / radial dims, the matching angle change) to an object in place. */
  function mapObj(o, f, dAng, mirror) {
    if (o.t === 'line') { o.a = f(o.a); o.b = f(o.b); }
    else if (o.t === 'circle') o.c = f(o.c);
    else if (o.t === 'arc') { o.c = f(o.c); if (mirror) { const a0 = Math.PI - o.a1, a1 = Math.PI - o.a0; o.a0 = n2pi(a0); o.a1 = n2pi(a1); } else { o.a0 = n2pi(o.a0 + dAng); o.a1 = n2pi(o.a1 + dAng); } }
    else if (o.t === 'poly') o.pts = o.pts.map(f);
    else if (o.t === 'dim') {
      if (o.kind === 'radius' || o.kind === 'diameter') { o.c = f(o.c); o.ang = mirror ? n2pi(Math.PI - o.ang) : n2pi(o.ang + dAng); }
      else {
        o.a = f(o.a); o.b = f(o.b); o.p = f(o.p);
        if (dAng) { const q = Math.round(degs(dAng)); if (q % 180 === 0) { /* unchanged */ } else if (q % 90 === 0) o.kind = o.kind === 'horizontal' ? 'vertical' : o.kind === 'vertical' ? 'horizontal' : o.kind; else o.kind = 'aligned'; }
      }
    } else if (o.t === 'label') o.p = f(o.p);
  }
  function rotAbout(c, a) { const cs = Math.cos(a), sn = Math.sin(a); return (q) => [c[0] + (q[0] - c[0]) * cs - (q[1] - c[1]) * sn, c[1] + (q[0] - c[0]) * sn + (q[1] - c[1]) * cs]; }

  // ─── Snapping ───
  function snapCandidates(ui, exclude) {
    const out = []; const segs = []; const circs = [];
    ui.objects.forEach((o) => {
      if (exclude && exclude.includes(o.id)) return;
      if (o.t === 'line') { out.push({ pt: o.a, kind: 'Endpoint', r: 0 }, { pt: o.b, kind: 'Endpoint', r: 0 }, { pt: v2.mid(o.a, o.b), kind: 'Midpoint', r: 3 }); segs.push([o.a, o.b]); }
      else if (o.t === 'circle') { out.push({ pt: o.c, kind: 'Centre', r: 2 }); for (let i = 0; i < 4; i++) out.push({ pt: onCirc(o.c, o.r, (i * Math.PI) / 2), kind: 'Quadrant', r: 4 }); circs.push(o); }
      else if (o.t === 'arc') {
        const s = sweepOf(o);
        out.push({ pt: onCirc(o.c, o.r, o.a0), kind: 'Endpoint', r: 0 }, { pt: onCirc(o.c, o.r, o.a1), kind: 'Endpoint', r: 0 }, { pt: onCirc(o.c, o.r, o.a0 + s / 2), kind: 'Midpoint', r: 3 }, { pt: o.c, kind: 'Centre', r: 2 });
        for (let i = 0; i < 4; i++) if (inSweep(o, (i * Math.PI) / 2)) out.push({ pt: onCirc(o.c, o.r, (i * Math.PI) / 2), kind: 'Quadrant', r: 4 });
        circs.push(o);
      } else if (o.t === 'poly') {
        o.pts.forEach((q) => out.push({ pt: q, kind: 'Endpoint', r: 0 }));
        polyEdges(o).forEach(([a, b]) => { segs.push([a, b]); if (o.kind !== 'curve') out.push({ pt: v2.mid(a, b), kind: 'Midpoint', r: 3 }); });
        if (o.kind !== 'curve' && o.closed) out.push({ pt: centroid(o.pts), kind: 'Centre', r: 2 });
      }
    });
    return { out, segs, circs };
  }
  function segSeg(a, b, c, d) {
    const r = v2.sub(b, a), s = v2.sub(d, c); const den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-12) return null;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den; const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 ? [a[0] + r[0] * t, a[1] + r[1] * t] : null;
  }
  function segCirc(a, b, o) {
    const d = v2.sub(b, a); const f = v2.sub(a, o.c); const A = d[0] * d[0] + d[1] * d[1]; const B = 2 * (f[0] * d[0] + f[1] * d[1]); const Cc = f[0] * f[0] + f[1] * f[1] - o.r * o.r;
    const disc = B * B - 4 * A * Cc; if (A < 1e-12 || disc < 0) return [];
    const sq = Math.sqrt(disc); const res = [];
    [(-B - sq) / (2 * A), (-B + sq) / (2 * A)].forEach((t) => { if (t >= -1e-9 && t <= 1 + 1e-9) { const q = [a[0] + d[0] * t, a[1] + d[1] * t]; if (o.t !== 'arc' || inSweep(o, ang(o.c, q))) res.push(q); } });
    return res;
  }
  function circCirc(o1, o2) {
    const d = v2.dist(o1.c, o2.c); if (d < 1e-9 || d > o1.r + o2.r || d < Math.abs(o1.r - o2.r)) return [];
    const a = (o1.r * o1.r - o2.r * o2.r + d * d) / (2 * d); const h = Math.sqrt(Math.max(0, o1.r * o1.r - a * a));
    const m = v2.add(o1.c, v2.mul(v2.sub(o2.c, o1.c), a / d)); const ux = (o2.c[1] - o1.c[1]) / d, uy = -(o2.c[0] - o1.c[0]) / d;
    return [[m[0] + ux * h, m[1] + uy * h], [m[0] - ux * h, m[1] - uy * h]].filter((q) => (o1.t !== 'arc' || inSweep(o1, ang(o1.c, q))) && (o2.t !== 'arc' || inSweep(o2, ang(o2.c, q))));
  }
  /** Returns {pt, kind, src?} — object snaps within tol, else grid; ortho from `base` (object snaps are projected onto the ortho line). */
  function snapPoint(q, ui, p, tol, o = {}) {
    const ortho = o.base && (p.ortho || o.shift);
    let best = null;
    if (p.snap) {
      const { out, segs, circs } = snapCandidates(ui, o.exclude);
      out.forEach((c) => { const d = v2.dist(q, c.pt); if (d <= tol) { const sc = d + c.r * tol * 0.04; if (!best || sc < best.sc) best = { ...c, sc }; } });
      const nearS = segs.filter(([a, b]) => segDist(q, a, b) <= tol); const nearC = circs.filter((c) => hitDist(c, q) <= tol);
      const xs = [];
      for (let i = 0; i < nearS.length; i++) for (let j = i + 1; j < nearS.length; j++) { const x = segSeg(nearS[i][0], nearS[i][1], nearS[j][0], nearS[j][1]); if (x) xs.push(x); }
      nearS.forEach(([a, b]) => nearC.forEach((c) => xs.push(...segCirc(a, b, c))));
      for (let i = 0; i < nearC.length; i++) for (let j = i + 1; j < nearC.length; j++) xs.push(...circCirc(nearC[i], nearC[j]));
      xs.forEach((x) => { const d = v2.dist(q, x); if (d <= tol) { const sc = d + tol * 0.04; if (!best || sc < best.sc) best = { pt: x, kind: 'Intersection', sc }; } });
    }
    if (ortho) {
      const b = o.base; const horiz = Math.abs(q[0] - b[0]) >= Math.abs(q[1] - b[1]);
      if (best) return { pt: horiz ? [best.pt[0], b[1]] : [b[0], best.pt[1]], kind: `${best.kind} · ortho`, src: best.pt };
      const gs = p.snapGrid ? p.gridStep : 0; const rnd = (v) => (gs ? Math.round(v / gs) * gs : v);
      return { pt: horiz ? [rnd(q[0]), b[1]] : [b[0], rnd(q[1])], kind: horiz ? 'Ortho — horizontal' : 'Ortho — vertical' };
    }
    if (best) return { pt: best.pt, kind: best.kind };
    if (p.snapGrid) { const gs = p.gridStep; return { pt: [Math.round(q[0] / gs) * gs, Math.round(q[1] / gs) * gs], kind: 'Grid' }; }
    return { pt: q, kind: '' };
  }

  // ─── Views of a solid → drawing objects ───
  const gen = () => window.EGGenerator;
  function solidParams(p) { return { obj: p.obj, n: p.n, a: p.a, d: p.d, h: p.h, spin: p.spin || 0, tiltHP: p.tiltHP, rotVP: p.rotVP, front: 10, above: 0 }; }
  function solidName(p) { return gen() ? gen().objectName(solidParams(p)) : String(p.obj); }
  /** Merges view segments into lines / circles / arcs / curves (chains of short facets of curved solids). */
  function mergeSegs(segs) {
    const key = (q) => `${Math.round(q[0] * 1000)},${Math.round(q[1] * 1000)}`;
    const nodes = new Map();
    segs.forEach((s, i) => [0, 1].forEach((e) => { const k = key(s[e]); if (!nodes.has(k)) nodes.set(k, []); nodes.get(k).push({ i, e }); }));
    const link = segs.map(() => [null, null]);
    const dirAway = (s, e) => { const a = s[e], b = s[1 - e]; const L = v2.dist(a, b) || 1; return [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; };
    nodes.forEach((list) => {
      const pairs = [];
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        if (list[i].i === list[j].i) continue;
        const u = dirAway(segs[list[i].i], list[i].e), w = dirAway(segs[list[j].i], list[j].e); const cs = u[0] * w[0] + u[1] * w[1];
        if (cs < -0.866) pairs.push({ a: list[i], b: list[j], cs });
      }
      pairs.sort((x, y) => x.cs - y.cs); const used = new Set();
      pairs.forEach(({ a, b }) => { const ka = `${a.i}:${a.e}`, kb = `${b.i}:${b.e}`; if (used.has(ka) || used.has(kb)) return; used.add(ka); used.add(kb); link[a.i][a.e] = b; link[b.i][b.e] = a; });
    });
    const seen = new Array(segs.length).fill(false); const out = [];
    segs.forEach((_, i0) => {
      if (seen[i0]) return;
      let i = i0, e = 0, guard = 0; // walk backwards to the start of the chain (or once round a loop)
      while (link[i][e] && guard++ < segs.length) { const nx = link[i][e]; if (nx.i === i0) break; i = nx.i; e = 1 - nx.e; }
      const pts = [segs[i][e]]; let closed = false; let ci = i, ce = e; guard = 0;
      while (guard++ <= segs.length) {
        seen[ci] = true; pts.push(segs[ci][1 - ce]);
        const nx = link[ci][1 - ce]; if (!nx) break;
        if (seen[nx.i]) { closed = true; break; }
        ci = nx.i; ce = nx.e;
      }
      if (closed && pts.length > 2 && key(pts[0]) === key(pts[pts.length - 1])) pts.pop();
      out.push({ pts, closed });
    });
    return out.map(({ pts, closed }) => classify(pts, closed));
  }
  function classify(pts, closed) {
    const n = pts.length;
    if (!closed) {
      const a = pts[0], b = pts[n - 1]; const L = v2.dist(a, b);
      if (n === 2 || (L > 1e-6 && pts.every((q) => segDist(q, a, b) < 1e-3))) return { t: 'line', a, b };
    }
    if (n >= 5) {
      const c = circum(pts[0], pts[Math.floor(n / 3)], pts[Math.floor((2 * n) / 3)]);
      if (c) {
        const R = v2.dist(c, pts[0]);
        if (pts.every((q) => Math.abs(v2.dist(c, q) - R) < 1e-3 * Math.max(1, R))) {
          if (closed) return { t: 'circle', c, r: R };
          const cr = (pts[0][0] - c[0]) * (pts[1][1] - c[1]) - (pts[0][1] - c[1]) * (pts[1][0] - c[0]);
          const s = n2pi(ang(c, pts[0])), e = n2pi(ang(c, pts[n - 1]));
          return cr > 0 ? { t: 'arc', c, r: R, a0: s, a1: e } : { t: 'arc', c, r: R, a0: e, a1: s };
        }
      }
    }
    return { t: 'poly', kind: 'curve', pts, closed };
  }
  let layoutCache = { key: '', val: null };
  /** Exact first-angle layout of FV / TV / LSV on the sheet (mm) — used by the guided demo and by "Generate views". */
  function viewLayout(p) {
    const Gn = gen(); if (!Gn) return null;
    const ck = JSON.stringify([solidParams(p), p.sheet, p.scale]);
    if (layoutCache.key === ck) return layoutCache.val;
    const sg = sheet(p); const r = ratioOf(p);
    const m = Gn.build(solidParams(p)); const b = m.b; const f = sg.frame;
    const w = (b.max[0] - b.min[0]) * r, ymin = b.min[1] * r, ymax = b.max[1] * r, zmin = b.min[2] * r, zmax = b.max[2] * r;
    const x0 = f.x0 + 22; const xs = x0 + w + 20;
    // keep the TV (and the mitre below the LSV) clear of the title block when possible
    const hi = f.y1 - 30 - zmax; const loTb = f.y0 + sg.tb.h + 12 + ymax; const loFree = f.y0 + 16 + ymax;
    const clashTb = xs + ymax + 8 > sg.tb.x; const lo = clashTb && loTb <= hi ? loTb : loFree;
    const yXY = lo <= hi ? (clashTb && loTb <= hi ? lo + (hi - lo) * 0.3 : (lo + hi) / 2) : lo;
    const fits = lo <= hi + 1e-9 && xs + ymax + 14 <= f.x1;
    const F = ([x, z]) => [x0 + (x - b.min[0]) * r, yXY + z * r];
    const T = ([x, y]) => [x0 + (x - b.min[0]) * r, yXY - y * r];
    const Sd = ([y, z]) => [xs + y * r, yXY + z * r];
    const maps = { front: F, top: T, side: Sd };
    const views = {};
    ['front', 'top', 'side'].forEach((k) => {
      const V = m.views[k]; const M = maps[k]; const objs = [];
      const mapSeg = ([a, c]) => [M(a), M(c)];
      mergeSegs(V.visible.map(mapSeg)).forEach((o) => objs.push({ ...o, lt: 'visible' }));
      mergeSegs(V.hidden.map(mapSeg)).forEach((o) => objs.push({ ...o, lt: 'hidden' }));
      if (V.axis) {
        const [A, B] = V.axis.map(M); const L = v2.dist(A, B);
        if (L > 1e-3) { const u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L]; objs.push({ t: 'line', a: v2.sub(A, v2.mul(u, 5)), b: v2.add(B, v2.mul(u, 5)), lt: 'centre' }); }
        else {
          const bb = bboxOf(objs); const hx = (bb[2] - bb[0]) / 2 + 5, hy = (bb[3] - bb[1]) / 2 + 5;
          objs.push({ t: 'line', a: [A[0] - hx, A[1]], b: [A[0] + hx, A[1]], lt: 'centre' }, { t: 'line', a: [A[0], A[1] - hy], b: [A[0], A[1] + hy], lt: 'centre' });
        }
      }
      // drop duplicates (e.g. the two coinciding base circles of an upright cylinder) and hidden lines under visible ones
      const sig = (o) => (o.t === 'line' ? [o.a, o.b].map((q) => q.map((v) => Math.round(v * 100)).join(',')).sort().join('|') : o.t === 'circle' ? `c${o.c.map((v) => Math.round(v * 100))},${Math.round(o.r * 100)}` : o.t === 'arc' ? `a${o.c.map((v) => Math.round(v * 100))},${Math.round(o.r * 100)},${Math.round(o.a0 * 1000)},${Math.round(o.a1 * 1000)}` : `p${o.pts.map((q) => q.map((v) => Math.round(v * 100)).join(',')).join('|')}`);
      const seen = new Set();
      views[k] = objs.filter((o) => { const s0 = sig(o); if (seen.has(s0)) return false; seen.add(s0); return true; });
    });
    const fvTop = yXY + zmax, fvBot = yXY + zmin, tvTop = yXY - ymin, tvBot = yXY - ymax;
    const svL = xs + ymin, svR = xs + ymax;
    const xy = { t: 'line', a: [x0 - 12, yXY], b: [svR + 12, yXY], lt: 'thin' };
    const x1y1 = { t: 'line', a: [xs, fvTop + 4], b: [xs, tvBot - 4], lt: 'thin' };
    const labels = [
      { t: 'label', p: [x0 - 17, yXY], text: 'X' }, { t: 'label', p: [svR + 17, yXY], text: 'Y' },
      { t: 'label', p: [x0 + w / 2, fvTop + 22], text: 'FV' }, { t: 'label', p: [x0 + w / 2, tvBot - 8], text: 'TV' }, { t: 'label', p: [(svL + svR) / 2, fvTop + 22], text: 'LSV' },
    ];
    const xyLabels = [{ t: 'label', p: [xs, fvTop + 9], text: 'X₁' }, { t: 'label', p: [xs, tvBot - 9], text: 'Y₁' }];
    // projectors (every corner; every 8th point on circles)
    const curved = m.solid.kind === 'cylinder' || m.solid.kind === 'cone'; const nv = m.solid.verts.length;
    const pp = m.solid.verts.filter((_, i) => !curved || i % 8 === 0 || (m.solid.kind === 'cone' && i === nv - 1));
    const uniq = (arr) => { const s = new Set(); return arr.filter((sg2) => { const kk = sg2.map((q) => q.map((v) => Math.round(v * 20)).join(',')).join('|'); if (s.has(kk)) return false; s.add(kk); return true; }); };
    const projFT = uniq(pp.map((q) => [F([q[0], q[2]]), T([q[0], q[1]])]));
    const projFS = uniq(pp.map((q) => [F([q[0], q[2]]), Sd([q[1], q[2]])]));
    const projTS = uniq(pp.map((q) => [T([q[0], q[1]]), [xs + q[1] * r, yXY - q[1] * r], Sd([q[1], q[2]])]));
    const mitre = { a: [xs, yXY], b: [xs + ymax + 6, yXY - ymax - 6] };
    // dimensions (true size = drawn ÷ scale)
    const dims = [];
    dims.push({ t: 'dim', kind: 'horizontal', a: [x0, fvTop], b: [x0 + w, fvTop], p: [x0, fvTop + 8] });
    if (fvTop - fvBot > 1e-3) dims.push({ t: 'dim', kind: 'vertical', a: [x0, fvBot], b: [x0, fvTop], p: [x0 - 9, fvBot] });
    const circle = views.top.find((o) => o.t === 'circle');
    if (circle) dims.push({ t: 'dim', kind: 'diameter', c: circle.c, r: circle.r, ang: -Math.PI / 4 });
    else if (tvTop - tvBot > 1e-3) dims.push({ t: 'dim', kind: 'vertical', a: [x0, tvBot], b: [x0, tvTop], p: [x0 - 9, tvBot] });
    if (svR - svL > 1e-3) dims.push({ t: 'dim', kind: 'horizontal', a: [svL, fvTop], b: [svR, fvTop], p: [svL, fvTop + 8] });
    const rects = {
      front: [x0 - 4, fvBot - 2, w + 8, fvTop - fvBot + 4], top: [x0 - 4, tvBot - 2, w + 8, tvTop - tvBot + 4], side: [svL - 4, fvBot - 2, svR - svL + 8, fvTop - fvBot + 4],
    };
    const val = { m, r, x0, xs, yXY, w, fits, views, xy, x1y1, labels, xyLabels, projFT, projFS, projTS, mitre, dims, rects, name: solidName(p) };
    layoutCache = { key: ck, val };
    return val;
  }

  // ─── Rendering ───
  function mapper(sg, W) { return (q) => W.toScreen(sg.X0 + q[0] * sg.k, sg.Y1 - q[1] * sg.k); }
  function toMM(sg, W, x, y) { const [wx, wy] = W.toWorld(x, y); return [(wx - sg.X0) / sg.k, (sg.Y1 - wy) / sg.k]; }
  /** Strokes an object; f (0..1) draws only a part of it (animation). */
  function strokeObj(g, o, M, pxmm, style, f = 1) {
    if (f <= 0) return;
    g.save(); g.beginPath();
    if (o.t === 'line') { const a = M(o.a), b0 = M(o.b); g.moveTo(a[0], a[1]); g.lineTo(a[0] + (b0[0] - a[0]) * f, a[1] + (b0[1] - a[1]) * f); }
    else if (o.t === 'circle') { const c = M(o.c); g.moveTo(c[0] + o.r * pxmm, c[1]); g.arc(c[0], c[1], Math.max(0.5, o.r * pxmm), 0, f >= 1 ? -TAU + 1e-6 : -TAU * f, true); if (f >= 1) g.closePath(); }
    else if (o.t === 'arc') { const c = M(o.c); const s = sweepOf(o) * f; const st = M(onCirc(o.c, o.r, o.a0)); g.moveTo(st[0], st[1]); g.arc(c[0], c[1], Math.max(0.5, o.r * pxmm), -o.a0, -(o.a0 + s), true); }
    else if (o.t === 'poly') {
      const pts = o.pts.concat(o.closed ? [o.pts[0]] : []); const nE = Math.max(1, pts.length - 1); const upto = f * nE;
      const s0 = M(pts[0]); g.moveTo(s0[0], s0[1]);
      for (let i = 1; i < pts.length; i++) { const fr = clamp(upto - (i - 1), 0, 1); if (fr <= 0) break; const a = M(pts[i - 1]), b0 = M(pts[i]); g.lineTo(a[0] + (b0[0] - a[0]) * fr, a[1] + (b0[1] - a[1]) * fr); }
    }
    g.strokeStyle = style.color; g.lineWidth = style.width; g.lineCap = 'round'; g.lineJoin = 'round';
    if (style.dash) g.setLineDash(style.dash); if (style.alpha != null) g.globalAlpha = style.alpha;
    g.stroke(); g.restore();
  }
  function drawDim(g, o, M, ratio, z, col, alpha) {
    col = col || G.LINE.dim.color; const txt = dimText(o, ratio); const gm = dimGeom(o); const size = Math.max(9, 15 * z);
    g.save(); if (alpha != null) g.globalAlpha = alpha;
    if (gm.radial) {
      const P1 = M(gm.P1), P2 = M(gm.P2); const d = [P1[0] - P2[0], P1[1] - P2[1]]; const L = Math.hypot(d[0], d[1]) || 1; const u = [d[0] / L, d[1] / L];
      if (o.kind === 'diameter') { const c = [(P1[0] + P2[0]) / 2, (P1[1] + P2[1]) / 2]; D.arrow(g, c[0], c[1], P1[0], P1[1], { color: col, width: 1.2, head: 11 }); D.arrow(g, c[0], c[1], P2[0], P2[1], { color: col, width: 1.2, head: 11 }); }
      else D.arrow(g, P2[0], P2[1], P1[0], P1[1], { color: col, width: 1.2, head: 11 });
      const E = [P1[0] + u[0] * 24, P1[1] + u[1] * 24]; D.line(g, P1[0], P1[1], E[0], E[1], { color: col, width: 1 });
      const tw = D.textWidth(g, txt, size, 700); const right = u[0] >= 0;
      D.line(g, E[0], E[1], E[0] + (right ? 1 : -1) * (tw + 8), E[1], { color: col, width: 1 });
      D.text(g, txt, E[0] + (right ? 4 : -4), E[1] - size * 0.62, { size, color: col, weight: 700, align: right ? 'left' : 'right', halo: true });
      g.restore(); return;
    }
    const a = M(o.a), b = M(o.b), A = M(gm.A), B = M(gm.B);
    const ext = (p0, P) => { const d = [P[0] - p0[0], P[1] - p0[1]]; const L = Math.hypot(d[0], d[1]); if (L < 2) return; const u = [d[0] / L, d[1] / L]; D.line(g, p0[0] + u[0] * 3, p0[1] + u[1] * 3, P[0] + u[0] * 5, P[1] + u[1] * 5, { color: col, width: 1 }); };
    ext(a, A); ext(b, B);
    const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    if (Math.hypot(B[0] - A[0], B[1] - A[1]) > 1) { D.arrow(g, mid[0], mid[1], A[0], A[1], { color: col, width: 1.2, head: 10 }); D.arrow(g, mid[0], mid[1], B[0], B[1], { color: col, width: 1.2, head: 10 }); }
    let an = Math.atan2(B[1] - A[1], B[0] - A[0]); if (an > Math.PI / 2 + 1e-6) an -= Math.PI; if (an < -Math.PI / 2 - 1e-6) an += Math.PI;
    // text on the side of the dimension line away from the measured feature
    let side = [A[0] - a[0], A[1] - a[1]]; let sl = Math.hypot(side[0], side[1]);
    if (sl < 1) { side = [Math.sin(an), -Math.cos(an)]; sl = 1; }
    const nx = side[0] / sl, ny = side[1] / sl;
    D.text(g, txt, mid[0] + nx * size * 0.72, mid[1] + ny * size * 0.72, { size, color: col, weight: 700, align: 'center', rotate: Math.abs(an) > 1e-3 ? an : 0, halo: true });
    g.restore();
  }
  function drawLabel(g, o, M, z, col) { const q = M(o.p); D.text(g, o.text, q[0], q[1], { size: Math.max(9, 17 * z), weight: 800, color: col || C.ink, align: 'center', halo: true }); }
  function drawObj(g, o, M, pxmm, ratio, z, opt = {}) {
    if (o.t === 'dim') return drawDim(g, o, M, ratio, z, opt.color, opt.alpha);
    if (o.t === 'label') return drawLabel(g, o, M, z, opt.color);
    const st = { ...ltStyle(o.lt) }; if (opt.color && o.lt !== 'centre') st.color = opt.color; if (opt.alpha != null) st.alpha = opt.alpha;
    strokeObj(g, o, M, pxmm, st, opt.f == null ? 1 : opt.f);
  }
  function gripsOf(o) {
    if (o.t === 'line') return [{ pt: o.a, set: (x, q) => { x.a = q; } }, { pt: o.b, set: (x, q) => { x.b = q; } }];
    if (o.t === 'circle') return [{ pt: o.c, set: (x, q) => { x.c = q; } }, { pt: [o.c[0] + o.r, o.c[1]], set: (x, q) => { x.r = Math.max(0.5, v2.dist(x.c, q)); } }];
    if (o.t === 'arc') return [{ pt: o.c, set: (x, q) => { x.c = q; } }, { pt: onCirc(o.c, o.r, o.a0), set: (x, q) => { x.a0 = n2pi(ang(x.c, q)); x.r = Math.max(0.5, v2.dist(x.c, q)); } }, { pt: onCirc(o.c, o.r, o.a1), set: (x, q) => { x.a1 = n2pi(ang(x.c, q)); x.r = Math.max(0.5, v2.dist(x.c, q)); } }];
    if (o.t === 'poly') return o.pts.map((pt, i) => ({ pt, set: (x, q) => { x.pts[i] = q; } }));
    if (o.t === 'dim') { if (o.kind === 'radius' || o.kind === 'diameter') return [{ pt: onCirc(o.c, o.r, o.ang), set: (x, q) => { x.ang = n2pi(ang(x.c, q)); } }]; return [{ pt: o.a, set: (x, q) => { x.a = q; } }, { pt: o.b, set: (x, q) => { x.b = q; } }, { pt: dimGeom(o).A, set: (x, q) => { x.p = q; } }]; }
    if (o.t === 'label') return [{ pt: o.p, set: (x, q) => { x.p = q; } }];
    return [];
  }
  function snapMarker(g, s, kind) {
    const [x, y] = s; const col = '#ea580c'; const k = kind.split(' ·')[0];
    g.save(); g.strokeStyle = col; g.lineWidth = 2.2; g.beginPath();
    if (k === 'Endpoint') g.rect(x - 7, y - 7, 14, 14);
    else if (k === 'Midpoint') { g.moveTo(x, y - 8); g.lineTo(x + 8, y + 6); g.lineTo(x - 8, y + 6); g.closePath(); }
    else if (k === 'Centre') g.arc(x, y, 7, 0, TAU);
    else if (k === 'Quadrant') { g.moveTo(x, y - 8); g.lineTo(x + 8, y); g.lineTo(x, y + 8); g.lineTo(x - 8, y); g.closePath(); }
    else if (k === 'Intersection') { g.moveTo(x - 7, y - 7); g.lineTo(x + 7, y + 7); g.moveTo(x + 7, y - 7); g.lineTo(x - 7, y + 7); }
    else { g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.moveTo(x, y - 6); g.lineTo(x, y + 6); }
    g.stroke(); g.restore();
  }

  // ─── Command state ───
  const NEED = { line: 2, circle: 2, rect: 2, polygon: 2, arc: 3, dim: 3 };
  function prompt(ui, p) {
    const n = ui.pts.length; const t = ui.tool;
    if (t === 'line') return n === 0 ? 'Pick the first point (click–click or drag) · Shift / Ortho = horizontal & vertical' : 'Pick the end point · Esc cancels';
    if (t === 'circle') return n === 0 ? 'Pick the centre' : 'Pick a point on the circle (sets the radius)';
    if (t === 'arc') return p.arcMode === '3p' ? ['3-point: pick the start point', '3-point: pick a point on the arc', '3-point: pick the end point'][n] : ['Pick the centre', 'Pick the start point (sets the radius)', 'Pick the end point (the arc runs anticlockwise)'][n];
    if (t === 'polygon') return n === 0 ? `n = ${p.polyN}: pick the centre` : `n = ${p.polyN}: pick a vertex (circumradius)`;
    if (t === 'rect') return n === 0 ? 'Pick the first corner' : 'Pick the opposite corner';
    if (t === 'dim') return ['Pick the first point — or click a circle / arc for Ø / R', 'Pick the second point', `Place the dimension line (${p.dimMode === 'aligned' ? 'aligned' : 'horizontal / vertical'})`][n];
    if (t === 'move') return ui.drag && ui.drag.pending ? 'Pick the destination point · Esc cancels' : ui.sel.length ? `Drag the ${ui.sel.length} selected object(s), or click a base point then the destination` : 'Click an object to pick it up, then drag';
    return ui.sel.length ? `${ui.sel.length} selected — drag to move · blue grips edit · Delete · ⟲ ⟳ rotate · Shift-click adds` : 'Click an object · drag a window to select several · ✋ / right-drag / two fingers pan';
  }
  function finishCommand(ui, p) {
    const P = ui.pts; const lt = LT[p.lineType] ? p.lineType : 'visible'; const t = ui.tool; let o = null; let msg = '';
    if (t === 'line') o = { t: 'line', a: P[0], b: P[1], lt };
    else if (t === 'circle') { const r = v2.dist(P[0], P[1]); if (r > 1e-6) o = { t: 'circle', c: P[0], r, lt }; }
    else if (t === 'rect') { const [a, b] = P; if (Math.abs(a[0] - b[0]) > 1e-6 && Math.abs(a[1] - b[1]) > 1e-6) o = { t: 'poly', kind: 'rectangle', pts: [a, [b[0], a[1]], b, [a[0], b[1]]], closed: true, lt }; else msg = 'A rectangle needs width and height — pick a diagonal corner.'; }
    else if (t === 'polygon') { const n = clamp(Math.round(p.polyN), 3, 12); const R = v2.dist(P[0], P[1]); const a0 = ang(P[0], P[1]); if (R > 1e-6) o = { t: 'poly', kind: 'polygon', pts: Array.from({ length: n }, (_, i) => onCirc(P[0], R, a0 + (TAU * i) / n)), closed: true, lt }; }
    else if (t === 'arc') {
      if (p.arcMode === '3p') {
        const c = circum(P[0], P[1], P[2]);
        if (!c) msg = 'The three points are in a line — no arc passes through them.';
        else {
          const r = v2.dist(c, P[0]); const s = n2pi(ang(c, P[0])), m = n2pi(ang(c, P[1])), e = n2pi(ang(c, P[2]));
          o = n2pi(m - s) <= n2pi(e - s) ? { t: 'arc', c, r, a0: s, a1: e, lt } : { t: 'arc', c, r, a0: e, a1: s, lt };
        }
      } else {
        const r = v2.dist(P[0], P[1]); const a0 = n2pi(ang(P[0], P[1])), a1 = n2pi(ang(P[0], P[2]));
        if (r < 1e-6) msg = 'The start point is at the centre — radius 0.'; else if (Math.abs(a1 - a0) < 1e-6) msg = 'Start and end directions coincide — pick a different end point.'; else o = { t: 'arc', c: P[0], r, a0, a1, lt };
      }
    } else if (t === 'dim') {
      const [a, b, pl] = P;
      let kind = 'aligned';
      if (p.dimMode !== 'aligned') {
        const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]);
        const outX = Math.max(0, Math.min(a[0], b[0]) - pl[0], pl[0] - Math.max(a[0], b[0]));
        const outY = Math.max(0, Math.min(a[1], b[1]) - pl[1], pl[1] - Math.max(a[1], b[1]));
        kind = dx < 1e-6 ? 'vertical' : dy < 1e-6 ? 'horizontal' : outY >= outX ? 'horizontal' : 'vertical';
      }
      o = { t: 'dim', kind, a, b, p: pl };
    }
    ui.pts = [];
    if (!o) return { recompute: true, toast: msg || 'Nothing drawn.' };
    pushUndo(ui); addObj(ui, o);
    return { recompute: true };
  }

  // ─── Actions ───
  function deleteSel(ui) {
    if (!ui.sel.length) return { toast: 'Nothing selected — click an object first.' };
    pushUndo(ui); const n = ui.sel.length; ui.objects = ui.objects.filter((o) => !ui.sel.includes(o.id)); ui.sel = [];
    return { recompute: true, toast: `Deleted ${n} object(s).` };
  }
  function cancel(ui) {
    if (ui.drag && ui.drag.before) ui.objects = JSON.parse(ui.drag.before);
    const had = ui.pts.length || ui.drag; ui.pts = []; ui.drag = null; ui.cur = null;
    if (!had) ui.sel = [];
    return had ? { recompute: true, toast: 'Command cancelled.' } : { recompute: true };
  }
  function transformSel(ui, kind) {
    const list = selObjs(ui); if (!list.length) return { toast: 'Select the objects to transform first.' };
    pushUndo(ui); const b = bboxOf(list); const c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    if (kind === 'mirror') list.forEach((o) => mapObj(o, (q) => [2 * c[0] - q[0], q[1]], 0, true));
    else { const a = ((kind === 'rotL' ? 15 : -15) * Math.PI) / 180; list.forEach((o) => mapObj(o, rotAbout(c, a), a, false)); }
    return { recompute: true, toast: kind === 'mirror' ? `Mirrored ${list.length} object(s) about x = ${nice(c[0])} mm.` : `Rotated ${list.length} object(s) ${kind === 'rotL' ? '15° anticlockwise' : '15° clockwise'} about their centre.` };
  }
  function generateViews(ui, p) {
    const L = viewLayout(p); if (!L) return { toast: 'View generator not available.' };
    pushUndo(ui);
    const ids = [];
    const put = (o) => { const x = addObj(ui, clone(o)); ids.push(x.id); };
    put(L.xy); put(L.x1y1);
    ['front', 'top', 'side'].forEach((k) => L.views[k].forEach(put));
    L.labels.forEach(put); L.xyLabels.forEach(put);
    ui.sel = ids; ui.genName = L.name; ui.pts = [];
    return { recompute: true, toast: `Inserted FV, TV and LSV of a ${L.name} (${ids.length} objects, first angle, scale ${p.scale}). They are selected — ✥ Move to place them, then ↔ Dim.${L.fits ? '' : ' They do not fit the frame — try A3 or 1:2.'}` };
  }

  // ─── Summary (for compute) ───
  function lengthOf(o) {
    if (o.t === 'line') return v2.dist(o.a, o.b);
    if (o.t === 'circle') return TAU * o.r;
    if (o.t === 'arc') return o.r * sweepOf(o);
    if (o.t === 'poly') return polyEdges(o).reduce((s, [a, b]) => s + v2.dist(a, b), 0);
    return 0;
  }
  function describe(o, ratio) {
    const T = (v) => `${nice(v / ratio)} mm`;
    if (!o) return 'none';
    if (o.t === 'line') return `${o.lt} line, L = ${T(lengthOf(o))} at ${nice(degs(ang(o.a, o.b)))}°`;
    if (o.t === 'circle') return `${o.lt} circle, Ø${nice((2 * o.r) / ratio)} mm`;
    if (o.t === 'arc') return `${o.lt} arc, R${nice(o.r / ratio)} mm, ${nice(degs(sweepOf(o)))}°`;
    if (o.t === 'poly') return o.kind === 'polygon' ? `regular ${o.pts.length}-gon, side ${T(v2.dist(o.pts[0], o.pts[1]))}` : o.kind === 'rectangle' ? `rectangle ${T(v2.dist(o.pts[0], o.pts[1]))} × ${T(v2.dist(o.pts[1], o.pts[2]))}` : `curve (${o.pts.length} points)`;
    if (o.t === 'dim') return `${o.kind} dimension ${dimText(o, ratio)}`;
    if (o.t === 'label') return `label "${o.text}"`;
    return String(o.t);
  }
  const scaleName = (ratio) => (ratio === 1 ? '1:1' : ratio === 0.5 ? '1:2' : '2:1');
  function objFormulas(o, ratio) {
    const k = 1 / ratio; const sc = ratio === 1 ? '' : ` (true size = drawn × ${fmt(k, 3)}, scale ${scaleName(ratio)})`;
    if (o.t === 'line') {
      const dx = (o.b[0] - o.a[0]) * k, dy = (o.b[1] - o.a[1]) * k; const L = Math.hypot(dx, dy); const th = degs(Math.atan2(dy, dx));
      return [
        { name: 'Length of the selected line', formula: 'L = √(Δx² + Δy²)', given: `Δx = ${nice(dx)} mm, Δy = ${nice(dy)} mm${sc}`, calc: `√(${nice(dx)}² + ${nice(dy)}²)`, result: fmt(L, 4), unit: 'mm' },
        { name: 'Inclination to the horizontal (XY)', formula: 'θ = atan2(Δy, Δx)', given: `Δx = ${nice(dx)} mm, Δy = ${nice(dy)} mm`, calc: `atan2(${nice(dy)}, ${nice(dx)})`, result: fmt(th, 4), unit: '°' },
      ];
    }
    if (o.t === 'circle') {
      const r = o.r * k;
      return [
        { name: 'Circumference of the circle', formula: 'C = π d = 2 π r', given: `r = ${nice(r)} mm${sc}`, calc: `2 × π × ${nice(r)}`, result: fmt(TAU * r, 4), unit: 'mm' },
        { name: 'Area of the circle', formula: 'A = π r²', given: `r = ${nice(r)} mm`, calc: `π × ${nice(r)}²`, result: fmt(Math.PI * r * r, 4), unit: 'mm²' },
      ];
    }
    if (o.t === 'arc') {
      const r = o.r * k; const s = sweepOf(o);
      return [
        { name: 'Included angle of the arc', formula: 'θ = end angle − start angle (anticlockwise)', given: `start ${nice(degs(o.a0))}°, end ${nice(degs(o.a1))}°`, calc: `${nice(degs(o.a1))}° − ${nice(degs(o.a0))}° (mod 360°)`, result: fmt(degs(s), 4), unit: '°' },
        { name: 'Arc length', formula: 's = r θ  (θ in radians)', given: `r = ${nice(r)} mm${sc}, θ = ${fmt(s, 4)} rad`, calc: `${nice(r)} × ${fmt(s, 4)}`, result: fmt(r * s, 4), unit: 'mm' },
        { name: 'Chord length', formula: 'c = 2 r sin(θ/2)', given: `r = ${nice(r)} mm`, calc: `2 × ${nice(r)} × sin(${fmt(degs(s) / 2, 4)}°)`, result: fmt(2 * r * Math.sin(s / 2), 4), unit: 'mm' },
        { name: 'Sector area', formula: 'A = ½ r² θ', given: `r = ${nice(r)} mm, θ = ${fmt(s, 4)} rad`, calc: `0.5 × ${nice(r)}² × ${fmt(s, 4)}`, result: fmt(0.5 * r * r * s, 4), unit: 'mm²' },
      ];
    }
    if (o.t === 'poly' && o.kind === 'polygon') {
      const n = o.pts.length; const R = v2.dist(centroid(o.pts), o.pts[0]) * k; const a = 2 * R * Math.sin(Math.PI / n);
      return [
        { name: `Side of the regular ${n}-gon`, formula: 'a = 2 R sin(180°/n)', given: `R = ${nice(R)} mm (circumradius)${sc}, n = ${n}`, calc: `2 × ${nice(R)} × sin(${fmt(180 / n, 4)}°)`, result: fmt(a, 4), unit: 'mm' },
        { name: 'Perimeter', formula: 'P = n a', given: `n = ${n}, a = ${fmt(a, 4)} mm`, calc: `${n} × ${fmt(a, 4)}`, result: fmt(n * a, 4), unit: 'mm' },
        { name: 'Area', formula: 'A = ½ n R² sin(360°/n)', given: `n = ${n}, R = ${nice(R)} mm`, calc: `0.5 × ${n} × ${nice(R)}² × sin(${fmt(360 / n, 4)}°)`, result: fmt(0.5 * n * R * R * Math.sin(TAU / n), 4), unit: 'mm²' },
        { name: 'Interior angle', formula: 'α = (n − 2) × 180° / n', given: `n = ${n}`, calc: `(${n} − 2) × 180 / ${n}`, result: fmt(((n - 2) * 180) / n, 4), unit: '°' },
      ];
    }
    if (o.t === 'poly' && o.kind === 'rectangle') {
      const l = v2.dist(o.pts[0], o.pts[1]) * k, w = v2.dist(o.pts[1], o.pts[2]) * k;
      return [
        { name: 'Perimeter of the rectangle', formula: 'P = 2 (l + w)', given: `l = ${nice(l)} mm, w = ${nice(w)} mm${sc}`, calc: `2 × (${nice(l)} + ${nice(w)})`, result: fmt(2 * (l + w), 4), unit: 'mm' },
        { name: 'Area', formula: 'A = l × w', given: `l = ${nice(l)} mm, w = ${nice(w)} mm`, calc: `${nice(l)} × ${nice(w)}`, result: fmt(l * w, 4), unit: 'mm²' },
        { name: 'Diagonal', formula: 'd = √(l² + w²)', given: `l = ${nice(l)} mm, w = ${nice(w)} mm`, calc: `√(${nice(l)}² + ${nice(w)}²)`, result: fmt(Math.hypot(l, w), 4), unit: 'mm' },
      ];
    }
    if (o.t === 'poly') return [{ name: 'Length of the curve (sum of its chords)', formula: 'L = Σ √(Δxᵢ² + Δyᵢ²)', given: `${o.pts.length} points${sc}`, calc: `${polyEdges(o).length} chords`, result: fmt(lengthOf(o) * k, 4), unit: 'mm' }];
    if (o.t === 'dim') {
      const gm = dimGeom(o);
      const f = o.kind === 'diameter' ? 'Ø = 2 r' : o.kind === 'radius' ? 'R = r' : o.kind === 'horizontal' ? 'D = |x₂ − x₁|' : o.kind === 'vertical' ? 'D = |y₂ − y₁|' : 'D = √(Δx² + Δy²)';
      return [{ name: `${o.kind[0].toUpperCase()}${o.kind.slice(1)} dimension`, formula: `${f}  (true size = drawn ÷ scale)`, given: `drawn ${nice(gm.value)} mm, scale ${scaleName(ratio)}`, calc: `${nice(gm.value)} ÷ ${ratio}`, result: dimText(o, ratio), unit: 'mm' }];
    }
    return [];
  }

  SIMS['eg-drawing-workspace'] = {
    view2d: true,
    initialView: { zoom: 1 },
    stepDuration: 4,
    approx: 'Curved solids are built from 48 flat facets: circles in the generated views are exact, inclined circles (ellipses) are inserted as fine polylines. Lengths come from the stored sheet coordinates; true size = drawn size ÷ drawing scale.',
    tools: TOOLS,
    actions: ACTIONS,
    initUi: () => ensureUi({ tool: 'select', objects: [] }),
    saveUi(ui) {
      const R = (v) => (Array.isArray(v) ? v.map(R) : typeof v === 'number' ? r2(v) : v);
      const keep = ['t', 'kind', 'a', 'b', 'c', 'r', 'a0', 'a1', 'pts', 'closed', 'p', 'ang', 'lt', 'text'];
      const objects = (ui.objects || []).slice(0, 300).map((o) => { const x = {}; keep.forEach((k) => { if (o[k] != null) x[k] = R(o[k]); }); return x; });
      return { tool: ui.tool, objects };
    },
    restoreUi(saved, ui) {
      ensureUi(ui);
      if (saved && TOOLS.some((t) => t.key === saved.tool)) ui.tool = saved.tool;
      if (saved && Array.isArray(saved.objects)) {
        const okPt = (q) => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite);
        ui.objects = saved.objects.filter((o) => o && typeof o === 'object' && (
          (o.t === 'line' && okPt(o.a) && okPt(o.b)) || (o.t === 'circle' && okPt(o.c) && o.r > 0) || (o.t === 'arc' && okPt(o.c) && o.r > 0 && Number.isFinite(o.a0) && Number.isFinite(o.a1)) ||
          (o.t === 'poly' && Array.isArray(o.pts) && o.pts.length >= 2 && o.pts.every(okPt)) || (o.t === 'label' && okPt(o.p) && typeof o.text === 'string') ||
          (o.t === 'dim' && ((okPt(o.a) && okPt(o.b) && okPt(o.p)) || (okPt(o.c) && o.r > 0 && Number.isFinite(o.ang))))));
        ui.objects.forEach((o, i) => { o.id = i + 1; if (o.t !== 'dim' && o.t !== 'label' && !LT[o.lt]) o.lt = 'visible'; if (o.t === 'poly' && !o.kind) o.kind = 'curve'; });
        ui.nextId = ui.objects.length + 1;
      }
      return ui;
    },
    params: [
      { key: 'lineType', label: 'Line type for new objects', type: 'select', default: 'visible', options: Object.keys(LT).map((k) => ({ value: k, label: LT[k].label })) },
      { key: 'polyN', label: 'Polygon: number of sides n', type: 'range', min: 3, max: 12, step: 1, default: 6 },
      { key: 'arcMode', label: 'Arc construction', type: 'select', default: 'cse', options: [{ value: 'cse', label: 'Centre – start – end' }, { value: '3p', label: 'Three points' }] },
      { key: 'dimMode', label: 'Linear dimension', type: 'select', default: 'linear', options: [{ value: 'linear', label: 'Horizontal / vertical (auto)' }, { value: 'aligned', label: 'Aligned (true length)' }] },
      { key: 'snap', label: 'Object snap (end, mid, centre, quadrant, intersection)', type: 'toggle', default: true },
      { key: 'snapGrid', label: 'Snap to grid', type: 'toggle', default: true },
      { key: 'ortho', label: 'Ortho (horizontal / vertical) — or hold Shift', type: 'toggle', default: false },
      { key: 'grid', label: 'Show grid', type: 'toggle', default: true },
      { key: 'gridStep', label: 'Grid spacing', type: 'select', default: 5, options: [{ value: 1, label: '1 mm' }, { value: 2.5, label: '2.5 mm' }, { value: 5, label: '5 mm' }, { value: 10, label: '10 mm' }] },
      { key: 'sheet', label: 'Drawing sheet', type: 'select', default: 'A4', options: [{ value: 'A4', label: 'A4 (297 × 210 mm)' }, { value: 'A3', label: 'A3 (420 × 297 mm)' }] },
      { key: 'scale', label: 'Drawing scale', type: 'select', default: '1:1', options: [{ value: '1:1', label: '1 : 1 (full size)' }, { value: '1:2', label: '1 : 2 (reducing)' }, { value: '2:1', label: '2 : 1 (enlarging)' }] },
      { key: 'obj', label: 'Solid for “Generate views” and the demo', type: 'select', default: 'cylinder', options: [{ value: 'prism', label: 'Prism' }, { value: 'pyramid', label: 'Pyramid' }, { value: 'cylinder', label: 'Cylinder' }, { value: 'cone', label: 'Cone' }, { value: 'cube', label: 'Cube' }, { value: 'cuboid', label: 'Cuboid (rectangular block)' }] },
      { key: 'n', label: 'Sides of the base', type: 'range', min: 3, max: 8, step: 1, default: 6, showIf: (p) => p.obj === 'prism' || p.obj === 'pyramid' },
      { key: 'a', label: 'Base edge a', type: 'range', min: 15, max: 50, step: 1, default: 30, unit: 'mm', showIf: (p) => p.obj !== 'cylinder' && p.obj !== 'cone' },
      { key: 'd', label: 'Base diameter d', type: 'range', min: 20, max: 70, step: 1, default: 40, unit: 'mm', showIf: (p) => p.obj === 'cylinder' || p.obj === 'cone' },
      { key: 'h', label: 'Axis length h', type: 'range', min: 20, max: 90, step: 1, default: 60, unit: 'mm', showIf: (p) => p.obj !== 'cube' },
      { key: 'tiltHP', label: 'Axis inclination to HP θ', type: 'range', min: 0, max: 90, step: 1, default: 90, unit: '°' },
      { key: 'rotVP', label: 'Axis plan angle with XY', type: 'range', min: 0, max: 90, step: 1, default: 0, unit: '°' },
      { key: 'spin', label: 'Rotation about its own axis', type: 'range', min: 0, max: 180, step: 5, default: 0, unit: '°', showIf: (p) => p.obj !== 'cylinder' && p.obj !== 'cone' },
      { key: 'showDemo', label: 'Show the guided demo in the steps', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Cylinder Ø40 × 60 standing on the HP (A4, 1:1)', values: { obj: 'cylinder', d: 40, h: 60, tiltHP: 90, rotVP: 0, sheet: 'A4', scale: '1:1' } },
      { label: 'Hexagonal prism, axis 45° to the HP', values: { obj: 'prism', n: 6, a: 25, h: 60, tiltHP: 45, rotVP: 0, spin: 0, sheet: 'A4', scale: '1:1' } },
      { label: 'Square pyramid turned 30° about its axis', values: { obj: 'pyramid', n: 4, a: 40, h: 60, tiltHP: 90, rotVP: 0, spin: 30, sheet: 'A4', scale: '1:1' } },
      { label: 'Cone lying on the HP — A3 at 2:1', values: { obj: 'cone', d: 40, h: 60, tiltHP: 0, rotVP: 0, sheet: 'A3', scale: '2:1' } },
    ],
    validate(p) {
      const w = [];
      const L = viewLayout(p);
      if (L && !L.fits) w.push(`The FV, TV and LSV of this ${L.name} do not fit inside the ${p.sheet} frame at scale ${p.scale} — choose A3 or a reducing scale (1:2).`);
      return w;
    },
    compute(p, uiIn) {
      const ui = ensureUi(uiIn); const ratio = ratioOf(p); const sg = sheet(p);
      const cnt = (f) => ui.objects.filter(f).length;
      const lines = cnt((o) => o.t === 'line'), circles = cnt((o) => o.t === 'circle'), arcs = cnt((o) => o.t === 'arc');
      const polygons = cnt((o) => o.t === 'poly' && o.kind === 'polygon'), rects = cnt((o) => o.t === 'poly' && o.kind === 'rectangle'), curves = cnt((o) => o.t === 'poly' && o.kind === 'curve');
      const dims = cnt((o) => o.t === 'dim'), labels = cnt((o) => o.t === 'label');
      const lineLen = ui.objects.filter((o) => o.t === 'line').reduce((s, o) => s + lengthOf(o), 0) / ratio;
      const outline = ui.objects.reduce((s, o) => s + lengthOf(o), 0) / ratio;
      const sel = selObjs(ui); const one = sel.length === 1 ? sel[0] : null;
      const byType = ['visible', 'hidden', 'centre', 'construction', 'thin'].map((k) => [k, cnt((o) => o.lt === k)]).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(', ') || 'none';
      const selText = !sel.length ? 'nothing selected' : one ? describe(one, ratio) : `${sel.length} objects (${[...new Set(sel.map((o) => (o.t === 'poly' ? o.kind : o.t)))].join(', ')})`;
      const lastPt = ui.pts[ui.pts.length - 1];
      const pending = lastPt ? `${TOOL_NAME[ui.tool] || ui.tool}: ${ui.pts.length} point(s) picked, last at (${nice(lastPt[0])}, ${nice(lastPt[1])}) mm on the sheet` : 'none';
      const name = solidName(p);
      let formulas = one ? objFormulas(one, ratio) : [];
      if (!formulas.length && sel.length > 1) {
        const b = bboxOf(sel); const L = sel.reduce((s, o) => s + lengthOf(o), 0) / ratio;
        formulas = [
          { name: 'Size of the selection (bounding box)', formula: 'w = x_max − x_min ,  h = y_max − y_min', given: `${sel.length} objects`, calc: `(${nice(b[2])} − ${nice(b[0])}) ; (${nice(b[3])} − ${nice(b[1])}) drawn, ÷ ${ratio}`, result: `${nice((b[2] - b[0]) / ratio)} × ${nice((b[3] - b[1]) / ratio)}`, unit: 'mm' },
          { name: 'Total length of the selected outlines', formula: 'L = Σ lᵢ', given: `${sel.length} objects`, calc: 'lines + circumferences + arc lengths + perimeters', result: fmt(L, 4), unit: 'mm' },
        ];
      }
      if (!formulas.length) {
        formulas = [
          { name: 'Drawing scale', formula: 'true size = drawn size ÷ scale ratio', given: `scale ${p.scale} (ratio ${ratio})`, calc: `e.g. 40 mm drawn ÷ ${ratio}`, result: `${nice(40 / ratio)} mm true`, unit: 'mm' },
          { name: 'Total length of straight lines', formula: 'L = Σ √(Δx² + Δy²)', given: `${lines} line(s)`, calc: lines ? `sum of ${lines} line lengths ÷ ${ratio}` : 'no lines yet', result: fmt(lineLen, 4), unit: 'mm' },
          { name: 'Total outline length (all objects)', formula: 'L = Σ lines + Σ 2πr + Σ rθ + Σ perimeters', given: `${lines + circles + arcs + polygons + rects + curves} drawn object(s)`, calc: 'from the stored geometry', result: fmt(outline, 4), unit: 'mm' },
        ];
      }
      const readouts = [
        { label: 'Tool', value: TOOL_NAME[ui.tool] || String(ui.tool), tone: 'info' },
        { label: 'Objects', value: String(ui.objects.length) },
        sel.length ? { label: 'Selected', value: one ? describe(one, ratio).split(',')[0] : `${sel.length} objects`, tone: 'good' } : { label: 'Selected', value: '—' },
        { label: 'Snap', value: p.snap ? `objects${p.snapGrid ? ' + grid' : ''}${p.ortho ? ' · ortho' : ''}` : `${p.snapGrid ? 'grid only' : 'off'}${p.ortho ? ' · ortho' : ''}`, tone: p.snap ? 'good' : 'warn' },
      ];
      const state = {
        currentTool: TOOL_NAME[ui.tool] || String(ui.tool), lineTypeForNewObjects: LT[p.lineType] ? LT[p.lineType].label : String(p.lineType),
        lines, circles, arcs, polygons, rectangles: rects, curves, dimensions: dims, labels, totalObjects: ui.objects.length,
        objectsByLineType: byType, selection: selText, pendingCommand: pending,
        totalLineLength: `${fmt(lineLen, 4)} mm (true size)`, totalOutlineLength: `${fmt(outline, 4)} mm (true size)`,
        sheet: `${p.sheet} (${sg.W} × ${sg.H} mm), border 20 mm left / 10 mm elsewhere, title block ${sg.tbW} × ${sg.tbH} mm`,
        sheetScale: String(p.scale), projectionMethod: 'First angle (BIS SP 46)', grid: p.grid ? `${p.gridStep} mm shown` : 'hidden',
        snapping: `object snaps ${p.snap ? 'on' : 'off'}, grid snap ${p.snapGrid ? 'on' : 'off'}, ortho ${p.ortho ? 'on' : 'off (hold Shift)'}`,
        solidForViews: name, generatedViewsInserted: ui.genName || 'none',
      };
      const sz = p.obj === 'cylinder' || p.obj === 'cone' ? `Ø${p.d} × ${p.h} mm` : p.obj === 'cube' ? `${p.a} mm cube` : p.obj === 'cuboid' ? `${nice(p.a * 1.6)} × ${p.a} × ${p.h} mm` : `base edge ${p.a} mm, axis ${p.h} mm`;
      return {
        formulas, readouts, state,
        explain: {
          what: `An ${p.sheet} drawing sheet at scale ${p.scale} holding ${ui.objects.length} object(s): ${lines} line(s), ${circles} circle(s), ${arcs} arc(s), ${polygons + rects} polygon(s)/rectangle(s)${curves ? `, ${curves} curve(s)` : ''} and ${dims} dimension(s). Current tool: ${TOOL_NAME[ui.tool] || ui.tool}; selection: ${selText}.`,
          why: 'Engineering drawings are built from a few exact primitives. Snapping to endpoints, midpoints, centres, quadrants and intersections, and ortho (horizontal / vertical) lines, make the views line up exactly — the job the T-square, set-squares and compass do on paper. Projectors from the FV fix the widths of the TV and the heights of the LSV (first angle: TV below XY, LSV to the right of the FV).',
          param: `Line type for new objects (${LT[p.lineType] ? LT[p.lineType].short : p.lineType}), polygon sides n = ${p.polyN}, arc method (${p.arcMode === '3p' ? '3-point' : 'centre–start–end'}), snapping ${p.snap ? 'on' : 'off'}, grid ${p.gridStep} mm, sheet ${p.sheet} at ${p.scale}; for “Generate views”: ${name} (${sz}), axis ${p.tiltHP}° to the HP, ${p.rotVP}° in plan.`,
          effect: `Changing the scale changes every dimension value (true size = drawn ÷ ${ratio}) but not the lines already drawn. Another solid or orientation changes the generated FV, TV and LSV exactly as the projection rules predict. Rotating a selection by 15° changes its line angles by 15° but never its lengths; mirroring reverses it left-to-right. Save the finished sheet with ⬇ Export (PNG) or 📌 Stamp to Board.`,
        },
      };
    },
    steps(p) {
      const name = solidName(p);
      return [
        { title: 'Set up the sheet and grid', text: `${p.sheet} sheet: 20 mm filing margin on the left, 10 mm border elsewhere, title block with scale ${p.scale} and the first-angle symbol. Grid ${p.gridStep} mm, snapping ${p.snap ? 'on' : 'off'}. Pick a tool and draw — your own objects stay in every step.` },
        { title: 'Draw the XY reference line', text: 'A thin continuous line: the FV goes above it, the TV below it. Use ╱ Line with Shift (ortho) and grid snap for an exactly horizontal line.' },
        { title: `Draw the front view of the ${name}`, text: 'The FV shows lengths (x) and heights (z). Visible edges thick, hidden edges dashed, axis as a chain line — Next demonstrates it.' },
        { title: 'Project the top view', text: 'Vertical projectors drop from every FV corner across XY; the TV shows lengths (x) and depths (y) below XY.' },
        { title: 'Project the left side view', text: 'Horizontal projectors from the FV give the heights; depths come from the TV via the 45° mitre at X₁Y₁. First angle: the LSV lies to the right of the FV.' },
        { title: 'Add dimensions', text: `Use ↔ Dim: overall width, height and depth (Ø for circles). Values show the true size at scale ${p.scale}.` },
        { title: 'Completed drawing — export it', text: '⧉ Generate views inserts these exact views as editable lines. Save the sheet with ⬇ Export (PNG), or 📌 Stamp to Board on the Smart Board.' },
      ];
    },

    onTool(key, S2) { const ui = ensureUi(S2.ui); ui.pts = []; if (ui.drag && ui.drag.before) ui.objects = JSON.parse(ui.drag.before); ui.drag = null; ui.cur = null; return { recompute: true }; },
    onAction(key, S2) {
      const ui = ensureUi(S2.ui); const p = S2.p;
      if (key !== 'clear') ui.clearArm = 0;
      if (key === 'undo' || key === 'redo') {
        const from = key === 'undo' ? ui.undo : ui.redo; const to = key === 'undo' ? ui.redo : ui.undo;
        if (!from.length) return { toast: `Nothing to ${key}.` };
        to.push(JSON.stringify(ui.objects)); ui.objects = JSON.parse(from.pop());
        ui.sel = ui.sel.filter((id) => byId(ui, id)); ui.pts = []; ui.drag = null;
        ui.nextId = ui.objects.reduce((m, o) => Math.max(m, o.id || 0), ui.nextId - 1) + 1;
        return { recompute: true };
      }
      if (key === 'rotL' || key === 'rotR' || key === 'mirror') return transformSel(ui, key);
      if (key === 'del') return deleteSel(ui);
      if (key === 'gen') return generateViews(ui, p);
      if (key === 'clear') {
        if (!ui.objects.length) return { toast: 'The sheet is already empty.' };
        const now = Date.now();
        if (!ui.clearArm || now - ui.clearArm > 5000) { ui.clearArm = now; return { toast: `Press ✖ Clear again to delete all ${ui.objects.length} objects (Undo brings them back).` }; }
        ui.clearArm = 0; pushUndo(ui); ui.objects = []; ui.sel = []; ui.pts = []; ui.genName = '';
        return { recompute: true, toast: 'Drawing cleared.' };
      }
      return null;
    },
    onKey(key, S2) {
      const ui = ensureUi(S2.ui);
      if (key === 'Escape') return cancel(ui);
      if (key === 'Delete' || key === 'Backspace') return deleteSel(ui);
      if (S2.ctrl && (key === 'z' || key === 'Z')) return this.onAction(S2.shift ? 'redo' : 'undo', S2);
      if (S2.ctrl && (key === 'y' || key === 'Y')) return this.onAction('redo', S2);
      if (S2.ctrl) return null;
      const map = { s: 'select', l: 'line', c: 'circle', a: 'arc', p: 'polygon', r: 'rect', d: 'dim', m: 'move' };
      const k = String(key).toLowerCase();
      if (map[k]) { ui.tool = map[k]; return this.onTool(ui.tool, S2); }
      if (k === 'o') return { params: { ortho: !S2.p.ortho }, toast: `Ortho ${S2.p.ortho ? 'off' : 'on'}` };
      return null;
    },

    onPointer(type, x, y, S2) {
      const ui = ensureUi(S2.ui); const p = S2.p; const W = S2.world;
      const sg = sheet(p); const q = toMM(sg, W, x, y); const tol = 12 / (sg.k * W.zoom); const shift = Boolean(S2.shift);
      const tool = ui.tool;
      if (type === 'down') ui.down = { x, y, moved: false };
      if (type === 'move' && ui.down && Math.hypot(x - ui.down.x, y - ui.down.y) > 6) ui.down.moved = true;

      // ── drawing commands ──
      if (NEED[tool]) {
        const base = ui.pts.length && (tool === 'line' || tool === 'polygon' || (tool === 'dim' && ui.pts.length === 1)) ? ui.pts[ui.pts.length - 1] : null;
        const sp = snapPoint(q, ui, p, tol, { base, shift });
        ui.cur = sp;
        if (type === 'down') {
          if (tool === 'dim' && !ui.pts.length) {
            const hit = ui.objects.filter((o) => (o.t === 'circle' || o.t === 'arc') && hitDist(o, q) <= tol).sort((a, b) => hitDist(a, q) - hitDist(b, q))[0];
            if (hit && !/Endpoint|Centre|Intersection|Midpoint/.test(sp.kind)) {
              pushUndo(ui); addObj(ui, { t: 'dim', kind: hit.t === 'circle' ? 'diameter' : 'radius', c: hit.c.slice(), r: hit.r, ang: n2pi(ang(hit.c, q)) });
              ui.down = null; return { recompute: true, toast: `${hit.t === 'circle' ? 'Diameter' : 'Radius'} dimension added.` };
            }
          }
          const last = ui.pts[ui.pts.length - 1];
          if (!last || v2.dist(last, sp.pt) > 1e-6) ui.pts.push(sp.pt);
          if (ui.pts.length >= NEED[tool]) { ui.down = null; return finishCommand(ui, p); }
          return { recompute: true };
        }
        if (type === 'up') {
          const dragged = ui.down && ui.down.moved; ui.down = null;
          if (dragged && ui.pts.length) {
            const last = ui.pts[ui.pts.length - 1];
            if (v2.dist(last, sp.pt) > 1e-6) { ui.pts.push(sp.pt); if (ui.pts.length >= NEED[tool]) return finishCommand(ui, p); }
          }
          return { redraw: true };
        }
        return { redraw: true };
      }

      // ── moving the selection (select-tool drag or move tool) ──
      const moveTo = (target) => {
        const d = ui.drag; const delta = v2.sub(target, d.base); d.delta = delta;
        ui.objects = JSON.parse(d.before).map((o) => { if (ui.sel.includes(o.id)) mapObj(o, (pt) => v2.add(pt, delta), 0, false); return o; });
      };
      const commitMove = () => {
        const d = ui.drag; ui.drag = null; ui.cur = null;
        if (d && d.delta && v2.len(d.delta) > 1e-9) { pushUndo(ui, d.before); return { recompute: true, toast: `Moved ${ui.sel.length} object(s) by (${nice(d.delta[0] / ratioOf(p))}, ${nice(d.delta[1] / ratioOf(p))}) mm.` }; }
        return { recompute: true };
      };
      const hitObj = () => ui.objects.map((o) => ({ o, d: hitDist(o, q) })).filter((h) => h.d <= tol).sort((a, b) => a.d - b.d)[0];

      if (tool === 'move') {
        if (type === 'down') {
          if (ui.drag && ui.drag.pending) { const sp = snapPoint(q, ui, p, tol, { base: ui.drag.base, shift, exclude: ui.sel }); moveTo(sp.pt); return commitMove(); }
          if (!ui.sel.length) { const h = hitObj(); if (!h) { ui.down = null; return { toast: 'Click an object to move (or select objects first).' }; } ui.sel = [h.o.id]; }
          const sp = snapPoint(q, ui, p, tol, {});
          ui.drag = { kind: 'move', base: sp.pt, before: JSON.stringify(ui.objects), delta: [0, 0] }; ui.cur = sp;
          return { recompute: true };
        }
        if (ui.drag && (type === 'move' || type === 'hover')) { const sp = snapPoint(q, ui, p, tol, { base: ui.drag.base, shift, exclude: ui.sel }); ui.cur = sp; moveTo(sp.pt); return { redraw: true }; }
        if (type === 'up' && ui.drag) {
          const dragged = ui.down && ui.down.moved; ui.down = null;
          if (dragged) return commitMove();
          ui.drag.pending = true; return { redraw: true };
        }
        ui.cur = snapPoint(q, ui, p, tol, {}); return { redraw: true };
      }

      // ── select tool ──
      if (type === 'down') {
        ui.cur = null;
        for (const o of selObjs(ui)) {
          const gi = gripsOf(o).findIndex((gp) => v2.dist(gp.pt, q) <= tol);
          if (gi >= 0) { ui.drag = { kind: 'grip', id: o.id, gi, before: JSON.stringify(ui.objects) }; return { redraw: true }; }
        }
        const h = hitObj();
        if (h) {
          if (shift) { ui.sel = ui.sel.includes(h.o.id) ? ui.sel.filter((i) => i !== h.o.id) : ui.sel.concat(h.o.id); return { recompute: true }; }
          if (!ui.sel.includes(h.o.id)) ui.sel = [h.o.id];
          const sp = snapPoint(q, ui, p, tol, {});
          ui.drag = { kind: 'move', base: sp.pt, before: JSON.stringify(ui.objects), delta: [0, 0] };
          return { recompute: true };
        }
        if (!shift) ui.sel = [];
        ui.drag = { kind: 'box', a: q, b: q };
        return { recompute: true };
      }
      if (type === 'move' && ui.drag) {
        if (ui.drag.kind === 'box') { ui.drag.b = q; return { redraw: true }; }
        if (ui.drag.kind === 'move') { if (!ui.down || !ui.down.moved) return null; const sp = snapPoint(q, ui, p, tol, { base: ui.drag.base, shift, exclude: ui.sel }); ui.cur = sp; moveTo(sp.pt); return { redraw: true }; }
        if (ui.drag.kind === 'grip') {
          const sp = snapPoint(q, ui, p, tol, { exclude: [ui.drag.id] }); ui.cur = sp;
          const orig = JSON.parse(ui.drag.before); const o = orig.find((zz) => zz.id === ui.drag.id);
          if (o) { const gp = gripsOf(o)[ui.drag.gi]; if (gp) gp.set(o, sp.pt); }
          ui.objects = orig; return { redraw: true };
        }
      }
      if (type === 'up') {
        const d = ui.drag; ui.cur = null; ui.down = null;
        if (!d) return null;
        if (d.kind === 'box') {
          ui.drag = null;
          const x0 = Math.min(d.a[0], d.b[0]), x1 = Math.max(d.a[0], d.b[0]), y0 = Math.min(d.a[1], d.b[1]), y1 = Math.max(d.a[1], d.b[1]);
          if (x1 - x0 < tol * 0.5 && y1 - y0 < tol * 0.5) return { recompute: true };
          const inside = ui.objects.filter((o) => { const b = bboxOf([o]); return b[0] >= x0 && b[2] <= x1 && b[1] >= y0 && b[3] <= y1; }).map((o) => o.id);
          ui.sel = [...new Set(ui.sel.concat(inside))];
          return { recompute: true, toast: inside.length ? `${inside.length} object(s) selected (window).` : 'No object lies completely inside the window.' };
        }
        if (d.kind === 'move') return commitMove();
        ui.drag = null;
        if (d.kind === 'grip' && d.before !== JSON.stringify(ui.objects)) pushUndo(ui, d.before);
        return { recompute: true };
      }
      if (type === 'hover') { const h = hitObj(); const id = h ? h.o.id : 0; if (id !== ui.hover) { ui.hover = id; return { redraw: true }; } return null; }
      return null;
    },

    draw(g, S2) {
      const { p, step, st, dur, t } = S2; const ui = ensureUi(S2.ui); const W = S2.world; const z = W.zoom;
      const sg = sheet(p); const M = mapper(sg, W); const pxmm = sg.k * z; const ratio = ratioOf(p); const prog = clamp(st / dur, 0, 1);
      D.clear(g, '#dde3ea');
      // ── paper, grid, border ──
      const P0 = M([0, sg.H]), P1 = M([sg.W, 0]);
      D.rect(g, P0[0] + 4, P0[1] + 5, P1[0] - P0[0], P1[1] - P0[1], { fill: 'rgba(15,23,42,0.18)' });
      D.rect(g, P0[0], P0[1], P1[0] - P0[0], P1[1] - P0[1], { fill: '#ffffff', stroke: '#94a3b8', width: 1 });
      const f = sg.frame; const F0 = M([f.x0, f.y1]), F1 = M([f.x1, f.y0]);
      if (p.grid) {
        const gs = Number(p.gridStep) || 5; const major = gs < 5 ? 10 : 50;
        g.save(); g.beginPath(); g.rect(F0[0], F0[1], F1[0] - F0[0], F1[1] - F0[1]); g.clip();
        const drawSet = (stepMM, col) => {
          g.beginPath();
          for (let xx = Math.ceil(f.x0 / stepMM) * stepMM; xx <= f.x1 + 1e-9; xx += stepMM) { const a = M([xx, f.y0]), b = M([xx, f.y1]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
          for (let yy = Math.ceil(f.y0 / stepMM) * stepMM; yy <= f.y1 + 1e-9; yy += stepMM) { const a = M([f.x0, yy]), b = M([f.x1, yy]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
          g.strokeStyle = col; g.lineWidth = 1; g.stroke();
        };
        if (gs * pxmm >= 5) drawSet(gs, '#e6edf5');
        if (major * pxmm >= 5) drawSet(major, '#c9d5e3');
        g.restore();
      }
      D.rect(g, F0[0], F0[1], F1[0] - F0[0], F1[1] - F0[1], { stroke: C.ink, width: 2.2 });
      // title block: 4 rows; first-angle symbol cell at the right of rows 3–4
      const tb = sg.tb; const T0 = M([tb.x, tb.y + tb.h]), T1 = M([tb.x + tb.w, tb.y]);
      const tw = T1[0] - T0[0], th = T1[1] - T0[1]; const rh = th / 4; const ts = 14 * z;
      const symW = tw * 0.28; const midX = T0[0] + (tw - symW) * 0.46;
      D.rect(g, T0[0], T0[1], tw, th, { fill: '#ffffff', stroke: C.ink, width: 1.8 });
      [1, 2, 3].forEach((i) => D.line(g, T0[0], T0[1] + rh * i, i === 3 ? T1[0] - symW : T1[0], T0[1] + rh * i, { color: C.ink, width: 1 }));
      D.line(g, T1[0] - symW, T0[1] + rh * 2, T1[0] - symW, T1[1], { color: C.ink, width: 1 });
      D.line(g, midX, T0[1] + rh * 2, midX, T1[1], { color: C.ink, width: 1 });
      if (ts >= 8) {
        const tx = T0[0] + 6;
        D.text(g, 'ENGINEERING GRAPHICS · U21ME101', tx, T0[1] + rh * 0.5, { size: ts, weight: 800 });
        const title = ui.genName ? `Projections of a ${ui.genName}` : step >= 1 && p.showDemo ? `Projections of a ${solidName(p)}` : 'Drawing workspace — sheet 1';
        D.text(g, title.length > 44 ? `${title.slice(0, 43)}…` : title, tx, T0[1] + rh * 1.5, { size: ts, weight: 700 });
        D.text(g, `Scale ${p.scale}`, tx, T0[1] + rh * 2.5, { size: ts, weight: 700 });
        D.text(g, `Sheet ${p.sheet}`, midX + 6, T0[1] + rh * 2.5, { size: ts, weight: 700 });
        D.text(g, 'Units: mm', tx, T0[1] + rh * 3.5, { size: ts, weight: 600 });
        D.text(g, 'First angle', midX + 6, T0[1] + rh * 3.5, { size: ts, weight: 700 });
        // first-angle projection symbol: truncated cone (narrow end left) and its view from the left drawn on the RIGHT
        const cy = T0[1] + rh * 3; const sh = Math.min(rh * 0.8, symW * 0.2);
        const x0 = T1[0] - symW + symW * 0.12; const x1 = x0 + sh * 2;
        D.poly(g, [[x0, cy - sh * 0.55], [x1, cy - sh], [x1, cy + sh], [x0, cy + sh * 0.55]], { close: true, stroke: C.ink, width: 1.4 });
        const ccx = T1[0] - symW * 0.12 - sh; D.circle(g, ccx, cy, sh, { stroke: C.ink, width: 1.4 }); D.circle(g, ccx, cy, sh * 0.55, { stroke: C.ink, width: 1.4 });
        D.line(g, x0 - 3, cy, ccx + sh + 3, cy, { color: '#b91c1c', width: 0.9, dash: [6, 2, 1.5, 2] });
        D.line(g, ccx, cy - sh - 3, ccx, cy + sh + 3, { color: '#b91c1c', width: 0.9, dash: [6, 2, 1.5, 2] });
      }

      // ── guided demo (steps 2…7) ──
      const L = p.showDemo && step >= 1 ? viewLayout(p) : null;
      if (L) {
        const final = step >= 6; const VC = { front: '#2563eb', top: '#16a34a', side: '#d97706' };
        const frac = (i, n, cur) => (cur ? clamp(prog * n - i, 0, 1) : 1);
        const drawGroup = (list, col, cur) => list.forEach((o, i) => drawObj(g, o, M, pxmm, ratio, z, { color: final ? null : col, f: frac(i, list.length, cur) }));
        const proj = (segs, cur, alpha) => segs.forEach((sgm) => { const n = sgm.length - 1; for (let i = 0; i < n; i++) { const a = M(sgm[i]), b = M(sgm[i + 1]); const fr = cur ? clamp(prog * 1.6 * n - i, 0, 1) : 1; if (fr > 0) D.line(g, a[0], a[1], a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr, { ...G.LINE.projector, alpha }); } });
        const pa = final ? 0.4 : 0.85;
        if (step >= 3) proj(L.projFT, step === 3, pa);
        if (step >= 4) {
          proj(L.projFS, step === 4, pa); proj(L.projTS, step === 4, pa);
          const a = M(L.mitre.a), b = M(L.mitre.b); D.line(g, a[0], a[1], b[0], b[1], { color: C.muted, width: 1.2, dash: [10, 4, 2, 4] });
          if (!final) { const mm = M([L.mitre.a[0] + (L.mitre.b[0] - L.mitre.a[0]) * 0.55, L.mitre.a[1] + (L.mitre.b[1] - L.mitre.a[1]) * 0.55]); D.text(g, '45° mitre', mm[0] + 10, mm[1] - 4, { size: 14, color: C.muted, weight: 700, halo: true }); }
        }
        drawGroup([L.xy], C.ink, step === 1); if (step > 1 || prog >= 1) L.labels.slice(0, 2).forEach((o) => drawLabel(g, o, M, z));
        if (step >= 2) { drawGroup(L.views.front, VC.front, step === 2); if (step > 2 || prog >= 1) drawLabel(g, L.labels[2], M, z, final ? null : VC.front); }
        if (step >= 3) { drawGroup(L.views.top, VC.top, step === 3); if (step > 3 || prog >= 1) drawLabel(g, L.labels[3], M, z, final ? null : VC.top); }
        if (step >= 4) { drawGroup([L.x1y1], C.ink, step === 4); drawGroup(L.views.side, VC.side, step === 4); if (step > 4 || prog >= 1) { drawLabel(g, L.labels[4], M, z, final ? null : VC.side); L.xyLabels.forEach((o) => drawLabel(g, o, M, z)); } }
        if (step >= 5) L.dims.forEach((o, i) => { if (step > 5 || prog * L.dims.length >= i) drawDim(g, o, M, ratio, z); });
        const box = (r) => { const a = M([r[0], r[1] + r[3]]), b = M([r[0] + r[2], r[1]]); return [a[0], a[1], b[0] - a[0], b[1] - a[1]]; };
        if (step === 1) { const a = M(L.xy.a), b = M(L.xy.b); D.focus(g, a[0], a[1] - 12, b[0] - a[0], 24, t); }
        if (step === 2) D.focus(g, ...box(L.rects.front), t);
        if (step === 3) D.focus(g, ...box(L.rects.top), t);
        if (step === 4) D.focus(g, ...box(L.rects.side), t);
        if (step === 5) { const b = bboxOf(L.dims.concat(Object.values(L.views).flat())); D.focus(g, ...box([b[0] - 6, b[1] - 3, b[2] - b[0] + 12, b[3] - b[1] + 14]), t); }
        if (final) { const a = M([tb.x, tb.y + tb.h]); D.tag(g, 'Save it: ⬇ Export (PNG) · 📌 Stamp to Board', a[0] + tw / 2, a[1] - 20, { bg: C.green, size: 14, align: 'center' }); }
      }
      if (step === 0 && !ui.objects.length) D.focus(g, F0[0], F0[1], F1[0] - F0[0], F1[1] - F0[1], t);

      // ── user objects ──
      const selSet = new Set(ui.sel);
      ui.objects.forEach((o) => {
        if (selSet.has(o.id)) {
          if (o.t !== 'dim' && o.t !== 'label') strokeObj(g, o, M, pxmm, { color: '#fb923c', width: 8, alpha: 0.45 });
          else { const b = bboxOf([o]); const a = M([b[0], b[3]]), c = M([b[2], b[1]]); D.rect(g, a[0] - 10, a[1] - 12, c[0] - a[0] + 20, c[1] - a[1] + 24, { fill: 'rgba(251,146,60,0.18)', stroke: '#fb923c', width: 1.5, r: 6 }); }
        } else if (o.id === ui.hover && ui.tool === 'select' && o.t !== 'dim' && o.t !== 'label') strokeObj(g, o, M, pxmm, { color: '#60a5fa', width: 7, alpha: 0.35 });
        drawObj(g, o, M, pxmm, ratio, z, {});
      });
      if (ui.tool === 'select' || ui.tool === 'move') selObjs(ui).forEach((o) => gripsOf(o).forEach((gp) => { const s = M(gp.pt); D.rect(g, s[0] - 5, s[1] - 5, 10, 10, { fill: '#2563eb', stroke: '#ffffff', width: 1.5 }); }));

      // ── rubber band preview, snap marker, tooltip ──
      let tip = '';
      const cur = ui.cur; const cp = cur ? cur.pt : null; const PV = { color: '#ea580c', width: 1.4, dash: [7, 4] };
      if (NEED[ui.tool] && cp && ui.pts.length) {
        const P = ui.pts; const lt = { ...ltStyle(p.lineType), color: '#ea580c' };
        const T = (v) => nice(v / ratio);
        if (ui.tool === 'line') { strokeObj(g, { t: 'line', a: P[0], b: cp }, M, pxmm, lt); tip = `L = ${T(v2.dist(P[0], cp))} mm · θ = ${nice(degs(ang(P[0], cp)))}°`; }
        if (ui.tool === 'circle') { const r = v2.dist(P[0], cp); strokeObj(g, { t: 'circle', c: P[0], r }, M, pxmm, lt); strokeObj(g, { t: 'line', a: P[0], b: cp }, M, pxmm, PV); tip = `R = ${T(r)} mm · Ø ${T(2 * r)} mm`; }
        if (ui.tool === 'rect') { const a = P[0]; strokeObj(g, { t: 'poly', pts: [a, [cp[0], a[1]], cp, [a[0], cp[1]]], closed: true }, M, pxmm, lt); tip = `${T(Math.abs(cp[0] - a[0]))} × ${T(Math.abs(cp[1] - a[1]))} mm`; }
        if (ui.tool === 'polygon') { const n = clamp(Math.round(p.polyN), 3, 12); const R = v2.dist(P[0], cp); const a0 = ang(P[0], cp); strokeObj(g, { t: 'poly', pts: Array.from({ length: n }, (_, i) => onCirc(P[0], R, a0 + (TAU * i) / n)), closed: true }, M, pxmm, lt); strokeObj(g, { t: 'line', a: P[0], b: cp }, M, pxmm, PV); tip = `R = ${T(R)} mm · side = ${T(2 * R * Math.sin(Math.PI / n))} mm`; }
        if (ui.tool === 'arc') {
          if (p.arcMode === '3p') {
            if (P.length === 1) { strokeObj(g, { t: 'line', a: P[0], b: cp }, M, pxmm, PV); tip = `chord ${T(v2.dist(P[0], cp))} mm`; }
            else { const c = circum(P[0], P[1], cp); if (c) { const r = v2.dist(c, P[0]); const s = n2pi(ang(c, P[0])), m = n2pi(ang(c, P[1])), e = n2pi(ang(c, cp)); const o = n2pi(m - s) <= n2pi(e - s) ? { t: 'arc', c, r, a0: s, a1: e } : { t: 'arc', c, r, a0: e, a1: s }; strokeObj(g, o, M, pxmm, lt); tip = `R = ${T(r)} mm · ${nice(degs(sweepOf(o)))}°`; } else tip = 'points in a line'; }
          } else if (P.length === 1) { const r = v2.dist(P[0], cp); strokeObj(g, { t: 'line', a: P[0], b: cp }, M, pxmm, PV); strokeObj(g, { t: 'circle', c: P[0], r }, M, pxmm, { color: '#fdba74', width: 1, dash: [4, 4] }); tip = `R = ${T(r)} mm`; }
          else { const r = v2.dist(P[0], P[1]); const o = { t: 'arc', c: P[0], r, a0: n2pi(ang(P[0], P[1])), a1: n2pi(ang(P[0], cp)) }; strokeObj(g, o, M, pxmm, lt); strokeObj(g, { t: 'line', a: P[0], b: cp }, M, pxmm, PV); tip = `R = ${T(r)} mm · ${nice(degs(sweepOf(o)))}° anticlockwise`; }
        }
        if (ui.tool === 'dim') {
          if (P.length === 1) { strokeObj(g, { t: 'line', a: P[0], b: cp }, M, pxmm, PV); tip = `${T(v2.dist(P[0], cp))} mm`; }
          else { const tmp = ensureUi({ tool: 'dim', pts: [P[0], P[1], cp], objects: [] }); finishCommand(tmp, p); const o = tmp.objects[0]; if (o) { drawDim(g, o, M, ratio, z, '#ea580c'); tip = `${o.kind}: ${dimText(o, ratio)} mm`; } }
        }
        ui.pts.forEach((q) => { const s = M(q); D.circle(g, s[0], s[1], 4, { fill: '#ea580c' }); });
      }
      if (ui.drag && ui.drag.kind === 'box') { const a = M(ui.drag.a), b = M(ui.drag.b); D.rect(g, Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), { fill: 'rgba(37,99,235,0.08)', stroke: '#2563eb', width: 1.5, dash: [6, 4] }); }
      if (ui.drag && ui.drag.kind === 'move' && ui.drag.delta && v2.len(ui.drag.delta) > 1e-9) tip = `Δx = ${nice(ui.drag.delta[0] / ratio)} · Δy = ${nice(ui.drag.delta[1] / ratio)} mm`;
      if (cur && cur.kind && cp && (NEED[ui.tool] || ui.tool === 'move' || (ui.drag && ui.drag.kind !== 'box'))) {
        const s = M(cp);
        if (cur.src) { const s0 = M(cur.src); D.line(g, s0[0], s0[1], s[0], s[1], { color: '#ea580c', width: 1, dash: [3, 4] }); snapMarker(g, s0, cur.kind); snapMarker(g, s, 'Grid'); }
        else snapMarker(g, s, cur.kind);
        const lbl = cur.kind; const lw = D.textWidth(g, lbl, 14, 700) + 16;
        const lx = s[0] + 12 + lw > 992 ? s[0] - 12 - lw : s[0] + 12; const up = s[1] - 24 >= TOP + 10; const ly = up ? s[1] - 22 : s[1] + 22;
        D.tag(g, lbl, lx, ly, { bg: '#ea580c', size: 14 });
        if (tip) { const tw2 = D.textWidth(g, tip, 15, 700) + 16; const tx = s[0] + 14 + tw2 > 992 ? s[0] - 14 - tw2 : s[0] + 14; const ty = up ? s[1] + 24 : s[1] + 52; D.tag(g, tip, tx, Math.min(546, ty), { bg: C.ink, size: 15 }); }
      }

      // ── HUD (screen space, not zoomed) ──
      D.rect(g, 0, 0, 1000, TOP - 4, { fill: 'rgba(248,250,252,0.95)' });
      D.line(g, 0, TOP - 4, 1000, TOP - 4, { color: '#cbd5e1', width: 1 });
      const tagW = D.tag(g, TOOL_NAME[ui.tool] || String(ui.tool), 10, 20, { bg: C.blue, size: 15 });
      const full = prompt(ui, p); let pr = full; const maxW = 978 - tagW - 22;
      while (pr.length > 10 && D.textWidth(g, `${pr}…`, 15, 700) > maxW) pr = pr.slice(0, -1);
      D.text(g, pr === full ? pr : `${pr}…`, 22 + tagW, 20, { size: 15, weight: 700, color: C.ink });
      const pan = (x0, y0, w, h) => D.rect(g, x0, y0, w, h, { fill: 'rgba(255,255,255,0.93)', stroke: '#cbd5e1', width: 1, r: 8 });
      const lw0 = Math.max(118, Math.min(150, sg.X0 - 14)); const lx0 = 6;
      // left palette: drafting aids
      pan(lx0, TOP + 4, lw0, 178);
      D.text(g, 'Drafting aids', lx0 + 8, TOP + 20, { size: 14, weight: 800 });
      const chip = (label, on, yy) => { D.circle(g, lx0 + 14, yy, 5, { fill: on ? C.green : '#cbd5e1' }); D.text(g, label, lx0 + 26, yy, { size: 14, weight: 700, color: on ? C.ink : C.muted }); };
      chip('Object snap', p.snap, TOP + 44); chip(`Grid snap ${p.gridStep}`, p.snapGrid, TOP + 68); chip('Ortho (Shift)', p.ortho, TOP + 92); chip('Grid shown', p.grid, TOP + 116);
      D.text(g, `${p.sheet} · ${p.scale} · ${Math.round(z * 100)}%`, lx0 + 8, TOP + 142, { size: 14, weight: 700, color: C.muted });
      D.text(g, `${ui.objects.length} object${ui.objects.length === 1 ? '' : 's'}`, lx0 + 8, TOP + 164, { size: 14, weight: 700, color: C.muted });
      // right palette: line types
      const rx0 = 1000 - lw0 - 6;
      pan(rx0, TOP + 4, lw0, 186);
      D.text(g, 'Line types', rx0 + 8, TOP + 20, { size: 14, weight: 800 });
      ['visible', 'hidden', 'centre', 'construction', 'thin'].forEach((k, i) => {
        const yy = TOP + 44 + i * 25; const on = p.lineType === k;
        if (on) D.rect(g, rx0 + 3, yy - 11, lw0 - 6, 22, { fill: '#dbeafe', r: 5 });
        D.line(g, rx0 + 8, yy, rx0 + 40, yy, { ...ltStyle(k), alpha: 1 });
        D.text(g, LT[k].short, rx0 + 46, yy, { size: 14, weight: on ? 800 : 600 });
      });
      const yd = TOP + 44 + 5 * 25;
      D.line(g, rx0 + 8, yd, rx0 + 40, yd, { color: G.LINE.dim.color, width: 1.2 });
      D.text(g, 'Dimension', rx0 + 46, yd, { size: 14, weight: 600, color: G.LINE.dim.color });
    },
  };
})();
