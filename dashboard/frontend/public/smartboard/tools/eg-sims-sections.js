'use strict';

/*
 * Engineering Graphics — Unit 4 & 5:
 *   eg-section-solids   Section of solids (cutting planes ∥ HP, ∥ VP, AIP, AVP) with sectional views and true shape.
 *   eg-sectional-view   Sectional views of machine components (full / half section A–A).
 *   eg-development      Development of lateral surfaces (complete and truncated solids).
 * First-angle projection (BIS SP 46), dimensions in mm.
 */
(function () {
  const S = (window.EGSims = window.EGSims || {});
  const D = window.EPDraw; const G = window.EGGeom;
  const { C, fmt, clamp } = D;

  // ───────────────────────── shared helpers ─────────────────────────
  const POLY = { 3: 'triangular', 4: 'square', 5: 'pentagonal', 6: 'hexagonal', 7: 'heptagonal', 8: 'octagonal' };
  const NGON = { 3: 'triangle', 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon', 9: 'nonagon', 10: 'decagon' };
  const SOLIDS = [{ value: 'prism', label: 'Prism' }, { value: 'pyramid', label: 'Pyramid' }, { value: 'cylinder', label: 'Cylinder' }, { value: 'cone', label: 'Cone' }];
  const RED = '#b91c1c'; const SECT = '#dc2626';
  const PANEL = [8, 8, 356, 544];
  const SHEET = [384, 54, 604, 486];
  const isCurved = (o) => o === 'cylinder' || o === 'cone';
  const solidName = (p) => (isCurved(p.obj) ? p.obj : `${POLY[p.n] || p.n + '-sided'} ${p.obj}`);
  const specOf = (p) => (isCurved(p.obj) ? { type: p.obj, d: p.d, h: p.h } : { type: p.obj, n: p.n, a: p.a, h: p.h });
  const snap1 = (v) => Math.round(v);

  function bbNew() { return { u0: Infinity, u1: -Infinity, v0: Infinity, v1: -Infinity }; }
  function bbAdd(bb, pts, m) {
    const k = m || 0;
    pts.forEach((q) => { bb.u0 = Math.min(bb.u0, q[0] - k); bb.u1 = Math.max(bb.u1, q[0] + k); bb.v0 = Math.min(bb.v0, q[1] - k); bb.v1 = Math.max(bb.v1, q[1] + k); });
    return bb;
  }
  const bbPts = (b) => [[b.u0, b.v0], [b.u1, b.v1]];
  const bbOverlap = (a, b) => a.u0 < b.u1 && b.u0 < a.u1 && a.v0 < b.v1 && b.v0 < a.v1;
  /** Fits a sheet box (mm, v upwards) into a screen rectangle; returns the map and its inverse. */
  function fitBox(bb, rect, maxS) {
    const bw = Math.max(1, bb.u1 - bb.u0), bh = Math.max(1, bb.v1 - bb.v0);
    const s = Math.min(maxS || 4, rect[2] / bw, rect[3] / bh);
    const ox = rect[0] + (rect[2] - bw * s) / 2 - bb.u0 * s; const oy = rect[1] + (rect[3] - bh * s) / 2 + bb.v1 * s;
    return { s, M: (w) => [ox + w[0] * s, oy - w[1] * s], inv: (X, Y) => [(X - ox) / s, (oy - Y) / s] };
  }
  function distSeg(P, A, B) {
    const dx = B[0] - A[0], dy = B[1] - A[1]; const L2 = dx * dx + dy * dy || 1;
    const t = clamp(((P[0] - A[0]) * dx + (P[1] - A[1]) * dy) / L2, 0, 1);
    return Math.hypot(P[0] - A[0] - t * dx, P[1] - A[1] - t * dy);
  }
  function panel(g, title) {
    D.rect(g, PANEL[0], PANEL[1], PANEL[2], PANEL[3], { fill: '#f8fafc', stroke: '#cbd5e1', width: 1.5, r: 10 });
    D.text(g, title, 20, 30, { size: 17, weight: 800 });
  }
  const lerp2 = (A, B, f) => [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f];
  function partialSeg(g, A, B, f, style) { const E = lerp2(A, B, clamp(f, 0, 1)); D.line(g, A[0], A[1], E[0], E[1], style); }
  /** Cutting-plane line: thin chain, thick at the ends, arrows (screen unit vector dir) showing the direction of sight. */
  function cuttingLine(g, A, B, o) {
    o = o || {};
    const dx = B[0] - A[0], dy = B[1] - A[1]; const l = Math.hypot(dx, dy) || 1; const ux = dx / l, uy = dy / l;
    const col = o.color || RED;
    G.seg(g, A, B, { ...G.LINE.cutting, color: col, width: o.width || 1.6 });
    D.line(g, A[0], A[1], A[0] + ux * 18, A[1] + uy * 18, { color: col, width: 4.2 });
    D.line(g, B[0], B[1], B[0] - ux * 18, B[1] - uy * 18, { color: col, width: 4.2 });
    if (o.dir) {
      const ends = o.oneEnd ? [B] : [A, B];
      ends.forEach((E) => {
        D.arrow(g, E[0], E[1], E[0] + o.dir[0] * 28, E[1] + o.dir[1] * 28, { color: col, width: 2.4, head: 12 });
        if (o.letter) D.text(g, o.letter, E[0] + o.dir[0] * 28 + (E === A ? -ux : ux) * 14, E[1] + o.dir[1] * 28 + (E === A ? -uy : uy) * 14, { size: 17, weight: 800, color: col, align: 'center', halo: true });
      });
    }
  }
  function segClipRect(P0, T, r) { // line P0 + t·T clipped to rect r {u0,u1,v0,v1}
    let t0 = -1e9, t1 = 1e9;
    for (let i = 0; i < 2; i++) {
      const lo = i ? r.v0 : r.u0, hi = i ? r.v1 : r.u1;
      if (Math.abs(T[i]) < 1e-12) { if (P0[i] < lo || P0[i] > hi) return null; continue; }
      let a = (lo - P0[i]) / T[i], b = (hi - P0[i]) / T[i]; if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    }
    return t1 > t0 ? [t0, t1] : null;
  }

  // ═════════════════════════ 1. SECTION OF SOLIDS ═════════════════════════
  const PLANE_MODES = [
    { key: 'hp', label: 'Horizontal section plane (∥ HP)' },
    { key: 'vp', label: 'Vertical section plane (∥ VP)' },
    { key: 'aip', label: 'Auxiliary inclined plane (⟂ VP, θ to HP)' },
    { key: 'avp', label: 'Auxiliary vertical plane (⟂ HP, φ to VP)' },
  ];
  const PLANE_SHORT = { hp: 'HP-parallel plane', vp: 'VP-parallel plane', aip: 'AIP', avp: 'AVP' };
  function planeNormal(p) {
    const th = G.rad(p.theta);
    if (p.mode === 'vp') return [0, 1, 0];
    if (p.mode === 'aip') return [-Math.sin(th), 0, Math.cos(th)];
    if (p.mode === 'avp') return [-Math.sin(th), Math.cos(th), 0];
    return [0, 0, 1];
  }
  /** true → the plane is parallel to the axis, so its position is given as an offset from the axis. */
  function usesOffset(p) { const n = planeNormal(p); const ad = p.pose === 'lie' ? [1, 0, 0] : [0, 0, 1]; return Math.abs(G.dot(n, ad)) < 1e-6; }
  const VIEW_KEYS = ['front', 'top', 'side'];

  function cutPointsOf(solid, plane, curved, section) {
    const f = (q) => G.dot(plane.n, q) - plane.d; const pts = [];
    const addP = (q) => { if (!pts.some((r) => G.len(G.sub(r, q)) < 1e-4)) pts.push(q); };
    const segs = [];
    if (!curved) solid.edges.forEach((e) => segs.push([solid.verts[e.a], solid.verts[e.b]]));
    else {
      const N = solid.baseCount;
      for (let i = 0; i < N; i += N / 12) segs.push([solid.verts[i], solid.kind === 'cone' ? solid.verts[N] : solid.verts[N + i]]);
    }
    segs.forEach(([A, B]) => {
      const fa = f(A), fb = f(B);
      if (Math.abs(fa) < 1e-7) addP(A); if (Math.abs(fb) < 1e-7) addP(B);
      if ((fa < -1e-7 && fb > 1e-7) || (fa > 1e-7 && fb < -1e-7)) addP(G.add(A, G.mul(G.sub(B, A), fa / (fa - fb))));
    });
    if (curved) {
      const [A0, A1] = solid.axis; const ad = G.norm(G.sub(A1, A0)); const H = G.len(G.sub(A1, A0));
      section.forEach((q) => { const s = G.dot(G.sub(q, A0), ad); if (Math.abs(s) < 1e-6 || (solid.kind === 'cylinder' && Math.abs(s - H) < 1e-6)) addP(q); });
    }
    return G.orderPlanar(pts, plane.n);
  }

  function build1(p) {
    const curved = isCurved(p.obj);
    const solid = G.place(G.solid(specOf(p)), { spin: curved ? 0 : p.spin, tiltHP: p.pose === 'lie' ? 0 : 90, front: 10, above: 0, x: 0 });
    const [A0, A1] = solid.axis; const H = G.len(G.sub(A1, A0)); const ad = G.norm(G.sub(A1, A0));
    const n = planeNormal(p); const off = usesOffset(p);
    const pos = clamp(p.pos, 0, H);
    const Q = off ? G.add(A0, G.mul(ad, H / 2)) : G.add(A0, G.mul(ad, pos));
    const d = G.dot(n, Q) + (off ? p.off : 0);
    const plane = { n, d };
    const kept = G.clip(solid, plane, 'below'); const rem = G.clip(solid, plane, 'above');
    const section = kept.section.length >= 3 ? kept.section : [];
    const R = curved ? p.d / 2 : G.circumR(p.n, p.a);
    const full = {}; const part = {};
    VIEW_KEYS.forEach((k) => { full[k] = G.view(solid, k); part[k] = kept.solid ? G.view(kept.solid, k) : null; });
    const cuts = section.length ? cutPointsOf(solid, plane, curved, section) : [];
    const ts = section.length ? G.trueShape(section, n) : [];
    const area = ts.length ? G.polyArea2(ts) : 0;
    // shape classification
    const apex = solid.kind === 'cone' || solid.kind === 'pyramid' ? solid.verts[solid.baseCount] : null;
    const throughApex = apex && Math.abs(G.dot(n, apex) - d) < 1e-6;
    const cosNA = Math.abs(G.dot(n, ad)); const beta = G.deg(Math.asin(clamp(cosNA, 0, 1))); // plane ∠ axis
    const alpha = solid.kind === 'cone' ? G.deg(Math.atan(R / H)) : 0; // semi-apex angle
    const onBase = section.some((q) => Math.abs(G.dot(G.sub(q, A0), ad)) < 1e-6);
    const onTop = solid.kind === 'cylinder' || solid.kind === 'prism' ? section.some((q) => Math.abs(G.dot(G.sub(q, A0), ad) - H) < 1e-6) : false;
    let shape = '—'; let conic = '';
    if (section.length) {
      if (!curved) {
        const k = section.length;
        shape = k === 4 && cosNA < 1e-6 && solid.kind === 'prism' ? 'rectangle' : k === 3 ? 'triangle' : (NGON[k] || `${k}-sided polygon`);
        if (cosNA > 1 - 1e-9) shape = `${NGON[k] || k + '-gon'} (∥ base)`;
        if (k === 4) {
          const e = [0, 1, 2, 3].map((i) => G.sub(section[(i + 1) % 4], section[i]));
          const right = [0, 1, 2, 3].every((i) => Math.abs(G.dot(G.norm(e[i]), G.norm(e[(i + 1) % 4]))) < 1e-6);
          if (right) shape = Math.abs(G.len(e[0]) - G.len(e[1])) < 1e-6 ? 'square' : 'rectangle';
        }
      } else if (solid.kind === 'cylinder') {
        shape = cosNA > 1 - 1e-9 ? 'circle' : cosNA < 1e-6 ? 'rectangle' : onBase || onTop ? 'part ellipse (cut by the end face)' : 'ellipse';
      } else {
        if (throughApex) shape = 'isosceles triangle';
        else if (cosNA > 1 - 1e-9) shape = 'circle';
        else if (Math.abs(beta - alpha) < 0.25) { shape = 'parabola'; conic = 'parabola'; }
        else if (beta > alpha) { shape = onBase ? 'part ellipse (cut by the base)' : 'ellipse'; conic = 'ellipse'; }
        else { shape = 'hyperbola'; conic = 'hyperbola'; }
      }
    }
    return { solid, kept: kept.solid, rem: rem.solid, plane, section, cuts, ts, area, full, part, R, H, A0, ad, curved, shape, conic, beta, alpha, throughApex, onBase, n, off, pos };
  }

  /** Sheet layout: FV (x,z) above XY, TV (x,−y) below, LSV right of FV; auxiliary true-shape view off the trace. */
  function layout1(m, p) {
    const b = G.bounds(m.solid); const x0 = b.min[0], x1 = b.max[0], ymax = b.max[1], zmax = b.max[2];
    const xs = x1 + 30;
    const map = { front: (q) => [q[0], q[2]], top: (q) => [q[0], -q[1]], side: (q) => [xs + q[1], q[2]] };
    const vb = {
      front: { u0: x0, u1: x1, v0: 0, v1: zmax }, top: { u0: x0, u1: x1, v0: -ymax, v1: 0 }, side: { u0: xs, u1: xs + ymax, v0: 0, v1: zmax },
    };
    const n = m.n; const eyes = { front: [0, 1, 0], top: [0, 0, 1], side: [-1, 0, 0] };
    const N2 = { front: [n[0], n[2]], top: [n[0], -n[1]], side: [n[1], n[2]] };
    const D2 = { front: m.plane.d, top: m.plane.d, side: m.plane.d + n[1] * xs };
    const edgeOn = VIEW_KEYS.filter((k) => Math.abs(G.dot(n, eyes[k])) < 1e-6);
    const facing = VIEW_KEYS.filter((k) => G.dot(n, eyes[k]) > 1e-6);
    const traces = {};
    edgeOn.forEach((k) => {
      const nn = N2[k]; const L = Math.hypot(nn[0], nn[1]); const N = [nn[0] / L, nn[1] / L]; const dd = D2[k] / L;
      const P0 = [N[0] * dd, N[1] * dd]; const T = [-N[1], N[0]];
      let rng;
      if (m.section.length) {
        const ts = m.section.map((q) => { const w = map[k](q); return (w[0] - P0[0]) * T[0] + (w[1] - P0[1]) * T[1]; });
        rng = [Math.min(...ts) - 9, Math.max(...ts) + 9];
      } else {
        const r = vb[k]; rng = segClipRect(P0, T, { u0: r.u0 - 12, u1: r.u1 + 12, v0: r.v0 - 12, v1: r.v1 + 12 }) || [-10, 10];
      }
      traces[k] = { N, T, P0, A: [P0[0] + T[0] * rng[0], P0[1] + T[1] * rng[0]], B: [P0[0] + T[0] * rng[1], P0[1] + T[1] * rng[1]] };
    });
    const primary = p.mode === 'vp' || p.mode === 'avp' ? 'top' : 'front';
    const bb = bbNew(); VIEW_KEYS.forEach((k) => bbAdd(bb, bbPts(vb[k])));
    Object.values(traces).forEach((tr) => bbAdd(bb, [tr.A, tr.B], 6));
    bbAdd(bb, [[x0 - 14, 0], [xs + ymax + 12, 0]]); bbAdd(bb, [[x0, zmax + 10], [x0, -ymax - 10]]);
    // auxiliary view (true shape) for AIP / AVP
    let aux = null;
    if ((p.mode === 'aip' || p.mode === 'avp') && m.section.length && traces[primary]) {
      const tr = traces[primary]; const depth = primary === 'front' ? (q) => q[1] : (q) => q[2];
      const build = (mv, g0) => {
        const P = (q) => { const w = map[primary](q); const k = g0 + depth(q); return [w[0] + mv[0] * k, w[1] + mv[1] * k]; };
        const pts = m.section.map(P); const cut = m.cuts.map(P);
        const feet = m.section.map((q) => map[primary](q));
        const ts = feet.map((w) => (w[0] - tr.P0[0]) * tr.T[0] + (w[1] - tr.P0[1]) * tr.T[1]);
        const ta = Math.min(...ts) - 10, tb = Math.max(...ts) + 10;
        const base = [tr.P0[0] + mv[0] * g0, tr.P0[1] + mv[1] * g0];
        const x1y1 = [[base[0] + tr.T[0] * ta, base[1] + tr.T[1] * ta], [base[0] + tr.T[0] * tb, base[1] + tr.T[1] * tb]];
        const box = bbAdd(bbAdd(bbNew(), pts, 16), x1y1, 6);
        return { mv, g0, P, pts, cut, x1y1, box };
      };
      let best = null;
      [tr.N, [-tr.N[0], -tr.N[1]]].forEach((mv) => [14, 22, 32, 45, 60, 80, 105, 135].forEach((g0) => {
        const A = build(mv, g0); const over = VIEW_KEYS.some((k) => bbOverlap(A.box, { u0: vb[k].u0 - 4, u1: vb[k].u1 + 4, v0: vb[k].v0 - 4, v1: vb[k].v1 + 4 }));
        const all = bbAdd({ ...bb }, bbPts(A.box)); const sc = Math.min(SHEET[2] / (all.u1 - all.u0), SHEET[3] / (all.v1 - all.v0));
        const score = sc - (over ? 100 : 0);
        if (!best || score > best.score + 1e-9) best = { ...A, score, all };
      }));
      aux = best; bbAdd(bb, bbPts(aux.box));
    }
    const F = fitBox(bb, SHEET, 4);
    return { map, vb, traces, edgeOn, facing, primary, aux, F, xs, x0, x1, ymax, zmax, N2 };
  }

  const ST1 = ['whole', 'plane', 'points', 'sectional', 'hatch', 'true'];
  S['eg-section-solids'] = {
    view3d: true,
    initialView: { yaw: 0.62, pitch: 0.38, zoom: 1 },
    stepDuration: 4,
    modes: PLANE_MODES,
    tools: [{ key: 'orbit', label: '🎥 Orbit camera', title: 'Drag in the 3-D panel to look around' }, { key: 'plane', label: '✂ Move cutting plane', title: 'Drag in the 3-D panel to slide the cutting plane (the trace on the sheet can always be dragged)' }],
    actions: [{ key: 'parabola', label: '∥ generator (parabola)', title: 'Cone + AIP: set θ so that the plane is parallel to an end generator' }, { key: 'axis', label: 'Through the axis', title: 'Make the cutting plane pass through the axis / its mid-point' }],
    initUi: () => ({ tool: 'orbit', drag: null, hover: false }),
    saveUi: (ui) => ({ tool: ui.tool }),
    restoreUi: (s, ui) => Object.assign(ui, { tool: s.tool === 'plane' ? 'plane' : 'orbit' }),
    params: [
      { key: 'obj', label: 'Solid', type: 'select', options: SOLIDS, default: 'cone' },
      { key: 'n', label: 'Number of sides of the base', type: 'range', min: 3, max: 8, step: 1, default: 5, showIf: (p) => !isCurved(p.obj) },
      { key: 'a', label: 'Base edge a', type: 'range', min: 15, max: 45, step: 1, default: 30, unit: 'mm', showIf: (p) => !isCurved(p.obj) },
      { key: 'd', label: 'Base diameter D', type: 'range', min: 30, max: 70, step: 1, default: 50, unit: 'mm', showIf: (p) => isCurved(p.obj) },
      { key: 'h', label: 'Axis length h', type: 'range', min: 40, max: 90, step: 1, default: 60, unit: 'mm' },
      { key: 'pose', label: 'Position of the solid', type: 'select', options: [{ value: 'stand', label: 'Standing on its base on the HP' }, { value: 'lie', label: 'Lying on the HP (axis ∥ HP and VP)' }], default: 'stand' },
      { key: 'spin', label: 'Rotation about the axis', type: 'range', min: 0, max: 180, step: 5, default: 0, unit: '°', showIf: (p) => !isCurved(p.obj), help: '0° = one base edge parallel to the VP.' },
      { key: 'theta', label: 'Inclination of the cutting plane θ', type: 'range', min: 5, max: 85, step: 0.5, default: 45, unit: '°', showIf: (p) => p.mode === 'aip' || p.mode === 'avp', help: 'AIP: angle with the HP (VT makes θ with XY). AVP: angle with the VP (HT makes θ with XY).' },
      { key: 'pos', label: 'Plane cuts the axis at (from the base)', type: 'range', min: 0, max: 90, step: 1, default: 30, unit: 'mm', showIf: (p) => !usesOffset(p), help: 'Drag the VT/HT on the drawing sheet to move the plane (snaps to 1 mm).' },
      { key: 'off', label: 'Distance of the plane from the axis', type: 'range', min: -35, max: 35, step: 1, default: 8, unit: 'mm', showIf: (p) => usesOffset(p), help: 'Measured perpendicular to the plane; 0 = plane contains the axis.' },
      { key: 'showHidden', label: 'Show hidden edges', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Cone Ø50 × 60 cut by an AIP at 45° (ellipse)', values: { mode: 'aip', obj: 'cone', d: 50, h: 60, pose: 'stand', theta: 45, pos: 25 } },
      { label: 'Pentagonal pyramid, AIP 30° through the axis mid-point', values: { mode: 'aip', obj: 'pyramid', n: 5, a: 30, h: 65, pose: 'stand', spin: 0, theta: 30, pos: 32 } },
      { label: 'Hexagonal prism cut by a plane ∥ VP, 8 mm from the axis', values: { mode: 'vp', obj: 'prism', n: 6, a: 25, h: 60, pose: 'stand', spin: 0, off: 8 } },
      { label: 'Cylinder lying on HP, AVP at 40° to the VP', values: { mode: 'avp', obj: 'cylinder', d: 45, h: 70, pose: 'lie', theta: 40, pos: 35 } },
    ],
    validate(p) {
      const w = []; const m = build1(p);
      if (!m.section.length) w.push('The cutting plane does not cut the solid — move it (slider or drag the VT/HT) so that it passes through the solid.');
      if (!usesOffset(p) && p.pos > p.h) w.push(`The plane position (${p.pos} mm) is beyond the axis length ${p.h} mm — it is limited to the axis.`);
      if (m.throughApex) w.push('The plane passes through the apex — the section degenerates to a triangle.');
      return w;
    },
    compute(p) {
      const m = build1(p); const name = solidName(p);
      const off = m.off; const th = p.theta;
      const planeTxt = p.mode === 'hp' ? 'a horizontal plane (∥ HP, ⟂ VP)' : p.mode === 'vp' ? 'a vertical plane (∥ VP, ⟂ HP)' : p.mode === 'aip' ? `an auxiliary inclined plane (⟂ VP, ${th}° to the HP)` : `an auxiliary vertical plane (⟂ HP, ${th}° to the VP)`;
      const where = off ? `${p.off} mm from the axis` : `meeting the axis ${fmt(m.pos, 3)} mm from the base`;
      const tsu = m.ts.map((q) => q[0]), tsv = m.ts.map((q) => q[1]);
      const ext = m.ts.length ? [Math.max(...tsu) - Math.min(...tsu), Math.max(...tsv) - Math.min(...tsv)] : [0, 0];
      const Ltrue = Math.max(ext[0], ext[1]), Wtrue = Math.min(ext[0], ext[1]);
      const formulas = [
        { name: 'Area of the section (true shape)', formula: 'A = ½ |Σ (uᵢ vᵢ₊₁ − uᵢ₊₁ vᵢ)|', given: `${m.ts.length} corners of the true shape (coordinates in the cutting plane)`, calc: m.ts.length ? `shoelace over ${m.ts.length} points` : 'plane misses the solid', result: fmt(m.area, 4), unit: 'mm²' },
        { name: 'True-shape dimensions', formula: 'L = extent along the cutting-plane trace, W = extent across it', given: `section of ${name}`, calc: `L = ${fmt(Ltrue, 4)} mm, W = ${fmt(Wtrue, 4)} mm`, result: `${fmt(Ltrue, 4)} × ${fmt(Wtrue, 4)}`, unit: 'mm' },
      ];
      if (p.mode === 'aip' || p.mode === 'avp') {
        const view = p.mode === 'aip' ? 'TV' : 'FV'; const proj = m.area * Math.cos(G.rad(th));
        formulas.push({ name: `Projected area of the section in the ${view}`, formula: `A_${view} = A cos θ`, given: `A = ${fmt(m.area, 4)} mm², θ = ${th}°`, calc: `${fmt(m.area, 4)} × cos ${th}°`, result: fmt(proj, 4), unit: 'mm²' });
      }
      if (p.obj === 'cone') {
        formulas.push({ name: 'Semi-apex angle of the cone', formula: 'α = tan⁻¹(R / h)', given: `R = ${fmt(m.R, 3)} mm, h = ${p.h} mm`, calc: `tan⁻¹(${fmt(m.R, 3)} / ${p.h})`, result: fmt(m.alpha, 4), unit: '°' });
        formulas.push({ name: 'Type of conic (plane angle with the axis β vs α)', formula: 'β > α → ellipse, β = α → parabola, β < α → hyperbola', given: `β = ${fmt(m.beta, 4)}°, α = ${fmt(m.alpha, 4)}°`, calc: m.throughApex ? 'plane passes through the apex' : `β ${Math.abs(m.beta - m.alpha) < 0.25 ? '=' : m.beta > m.alpha ? '>' : '<'} α`, result: m.shape, unit: '—' });
      }
      if (p.obj === 'cylinder' && m.section.length && !m.onBase && m.shape !== 'rectangle') {
        const cb = Math.cos(G.rad(90 - m.beta)); const ex = Math.PI * m.R * m.R / Math.max(1e-6, cb);
        formulas.push({ name: 'Exact area for a cylinder (check)', formula: 'A = π R² / cos(90° − β)', given: `R = ${fmt(m.R, 3)} mm, β = ${fmt(m.beta, 3)}°`, calc: `π × ${fmt(m.R, 3)}² / ${fmt(cb, 4)}`, result: fmt(ex, 4), unit: 'mm²' });
      }
      const readouts = [
        { label: 'Cutting plane', value: p.mode === 'aip' || p.mode === 'avp' ? `${PLANE_SHORT[p.mode]} ${th}°` : PLANE_SHORT[p.mode], tone: 'info' },
        { label: 'Section', value: m.shape, tone: m.section.length ? 'good' : 'bad' },
        { label: 'True area', value: `${fmt(m.area, 4)} mm²` },
        { label: 'True shape', value: `${fmt(Ltrue, 3)} × ${fmt(Wtrue, 3)} mm` },
      ];
      const dims = isCurved(p.obj) ? `Ø${p.d} mm, axis ${p.h} mm` : `base edge ${p.a} mm, axis ${p.h} mm`;
      const state = {
        solid: name, dimensions: dims, position: p.pose === 'lie' ? 'lying on the HP, axis parallel to HP and VP' : 'standing on its base on the HP, axis vertical',
        cuttingPlane: planeTxt, planePosition: where, removedPart: 'the part between the observer and the cutting plane (on the side the arrows point away from)',
        sectionShape: m.shape, sectionArea: `${fmt(m.area, 4)} mm²`, trueShapeSize: `${fmt(Ltrue, 4)} × ${fmt(Wtrue, 4)} mm`, cutPoints: m.cuts.length,
        sectionalViews: layoutFacing(p).join(', ') || 'none', trueShapeShownIn: p.mode === 'hp' ? 'the sectional top view' : p.mode === 'vp' ? 'the sectional front view' : 'an auxiliary view on X₁Y₁ parallel to the cutting-plane trace',
      };
      if (p.obj === 'cone') { state.semiApexAngle = `${fmt(m.alpha, 4)}°`; state.planeAngleWithAxis = `${fmt(m.beta, 4)}°`; }
      return {
        formulas, readouts, state,
        explain: {
          what: `A ${name} (${dims}) ${p.pose === 'lie' ? 'lies on the HP' : 'stands on the HP'} and is cut by ${planeTxt}, ${where}. The part nearer the observer is removed; the cut surface — a ${m.shape} of ${fmt(m.area, 4)} mm² — is hatched in the sectional view(s).`,
          why: p.mode === 'hp' || p.mode === 'vp' ? `The cutting plane is parallel to the ${p.mode === 'hp' ? 'HP, so the sectional top view' : 'VP, so the sectional front view'} shows the section in its true shape, while in the other views the plane is seen edge-on as a line.` : `The cutting plane is perpendicular to the ${p.mode === 'aip' ? 'VP' : 'HP'}, so it appears as a line (${p.mode === 'aip' ? 'VT' : 'HT'}) in that view, but it is inclined to the other plane — there the section is foreshortened (A cos θ). Projecting on an auxiliary plane parallel to the cutting plane (X₁Y₁ ∥ ${p.mode === 'aip' ? 'VT' : 'HT'}) gives the true shape.`,
          param: `Solid and size, cutting-plane type (${PLANE_SHORT[p.mode]}), ${p.mode === 'aip' || p.mode === 'avp' ? `inclination θ = ${th}°, ` : ''}plane position (${where}).`,
          effect: p.obj === 'cone' ? `For the cone the plane makes β = ${fmt(m.beta, 3)}° with the axis and the semi-apex angle is α = ${fmt(m.alpha, 3)}°: steeper than a generator gives a hyperbola, parallel gives a parabola, flatter gives an ellipse. Moving the plane changes where it meets each generator, so the size of the section changes.` : `Moving the plane changes the points where it meets each ${isCurved(p.obj) ? 'generator' : 'edge'}, so the section grows or shrinks; tilting it (θ) stretches the true shape along the trace (length ≈ width / cos θ for a prism/cylinder).`,
        },
      };
    },
    steps(p, c) {
      const m = build1(p); const trace = p.mode === 'vp' || p.mode === 'avp' ? 'HT' : 'VT';
      return [
        { title: 'Views of the whole solid', text: `Draw the FV, TV and LSV of the ${solidName(p)} ${p.pose === 'lie' ? 'lying on' : 'standing on'} the HP (first-angle projection).` },
        { title: `Draw the cutting plane (${trace})`, text: `The ${PLANE_SHORT[p.mode]} is seen edge-on as its ${trace} — a chain line, thick at the ends, with arrows showing the direction of sight. Drag it on the sheet to move it.` },
        { title: `Locate the cut points on the ${m.curved ? 'generators' : 'edges'}`, text: `Mark where the ${trace} crosses every ${m.curved ? 'generator (12 divisions) and the base circle' : 'edge'} — ${m.cuts.length} points — and project them into the other views.` },
        { title: 'Sectional views', text: 'Remove the part between the observer and the plane (shown thin). Join the projected cut points in order and draw the remaining solid thick.' },
        { title: 'Hatch the section', text: `Section lines at 45°, about 3 mm apart, fill the cut surface in every view where it is seen: ${layoutFacing(p).join(' and ') || '—'}.` },
        { title: 'True shape of the section', text: p.mode === 'hp' ? `The plane is ∥ HP, so the sectional TV is already the true shape: a ${m.shape}, A = ${fmt(m.area, 4)} mm².` : p.mode === 'vp' ? `The plane is ∥ VP, so the sectional FV is the true shape: a ${m.shape}, A = ${fmt(m.area, 4)} mm².` : `Draw X₁Y₁ parallel to the ${trace}, projectors perpendicular to it, and transfer each point's distance from XY. True shape: ${m.shape}, A = ${fmt(m.area, 4)} mm².` },
      ];
    },
    onAction(key, S2) {
      const p = S2.p;
      if (key === 'parabola') {
        if (p.obj !== 'cone') return { toast: 'Choose the cone to get a parabolic section.' };
        const R = p.d / 2; const th = 90 - G.deg(Math.atan(R / p.h));
        const params = { theta: Math.round(th * 100) / 100, pos: Math.round(p.h * 0.35) };
        if (p.pose === 'lie') params.pose = 'stand';
        S2.p.mode = 'aip';
        return { params, toast: `AIP at θ = ${fmt(th, 4)}° — parallel to the end generator → parabola` };
      }
      if (key === 'axis') {
        if (usesOffset(p)) return { params: { off: 0 }, toast: 'Plane now contains the axis' };
        return { params: { pos: Math.round(Math.min(p.h, 90) / 2) }, toast: 'Plane now passes through the mid-point of the axis' };
      }
      return null;
    },
    onPointer(type, x, y, S2) {
      const { p, ui } = S2;
      const m = build1(p); const L = layout1(m, p);
      const hitTrace = () => {
        for (const k of Object.keys(L.traces)) {
          const tr = L.traces[k]; const A = L.F.M(tr.A), B = L.F.M(tr.B);
          if (distSeg([x, y], A, B) < 16) return k;
        }
        return null;
      };
      const paramFor = (dNew) => {
        const base = G.dot(m.n, m.A0);
        if (m.off) return { off: clamp(snap1(dNew - G.dot(m.n, G.add(m.A0, G.mul(m.ad, m.H / 2)))), -35, 35) };
        const k = G.dot(m.n, m.ad); return { pos: clamp(snap1((dNew - base) / k), 0, Math.min(90, p.h)) };
      };
      if (type === 'hover') {
        const h = x > 370 && Boolean(hitTrace());
        if (h !== ui.hover) { ui.hover = h; return { redraw: true }; }
        return null;
      }
      if (type === 'down') {
        const k = x > 370 ? hitTrace() : null;
        if (k) {
          const w = L.F.inv(x, y); const nn = L.traces[k].N;
          ui.drag = { kind: 'sheet', view: k, w0: w, d0: m.plane.d, N: nn, scaleN: Math.hypot(L.N2[k][0], L.N2[k][1]) };
          return { redraw: true };
        }
        if (x < 366 && ui.tool === 'plane' && m.section.length >= 0) {
          ui.drag = { kind: '3d', x, y, d0: m.plane.d };
          return { redraw: true };
        }
        return null;
      }
      if (!ui.drag) return null;
      if (type === 'move') {
        let dNew;
        if (ui.drag.kind === 'sheet') {
          const w = L.F.inv(x, y); const dd = (w[0] - ui.drag.w0[0]) * ui.drag.N[0] + (w[1] - ui.drag.w0[1]) * ui.drag.N[1];
          dNew = ui.drag.d0 + dd * ui.drag.scaleN;
        } else {
          const P = cam1(S2.view, m); const c = G.centroid(m.solid.verts); const a = P(c), b = P(G.add(c, m.n));
          const nx = b.x - a.x, ny = b.y - a.y; const l2 = nx * nx + ny * ny;
          const dmm = l2 > 0.09 ? ((x - ui.drag.x) * nx + (y - ui.drag.y) * ny) / l2 : -(y - ui.drag.y) / 2.5;
          dNew = ui.drag.d0 + dmm;
        }
        const pr = paramFor(dNew); const key = Object.keys(pr)[0];
        if (pr[key] === p[key]) return null;
        return { params: pr };
      }
      if (type === 'up') { ui.drag = null; return { recompute: true }; }
      return null;
    },
    draw(g, S2) {
      const { p, step, st, dur, t, ui } = S2; const prog = clamp(st / dur, 0, 1); const ep = D.ease(prog);
      const key = ST1[Math.min(step, ST1.length - 1)]; const si = ST1.indexOf(key);
      const m = build1(p); const L = layout1(m, p); const M = L.F.M; const sc = L.F.s;
      D.clear(g, '#ffffff');
      draw3d1(g, S2, m, si, ep);

      // ── Drawing sheet ──
      D.text(g, 'Drawing sheet — first-angle projection', 380, 30, { size: 17, weight: 800 });
      const xyA = M([L.x0 - 14, 0]), xyB = M([L.xs + L.ymax + 12, 0]);
      G.xyLine(g, xyA[0], xyB[0], xyA[1]);
      const xsA = M([L.xs, L.zmax + 6]), xsB = M([L.xs, -L.ymax - 4]);
      D.line(g, xsA[0], xsA[1], xsB[0], xsB[1], { color: C.ink, width: 1.2 });
      // views: whole solid (steps 0–2), then the removed part thin + the kept part thick
      const hid = p.showHidden;
      VIEW_KEYS.forEach((k) => {
        const Mk = (w2) => M(k === 'front' ? w2 : k === 'top' ? [w2[0], -w2[1]] : [L.xs + w2[0], w2[1]]);
        if (si < 3) G.drawView(g, m.full[k], Mk, { hidden: hid });
        else {
          m.full[k].visible.concat(m.full[k].hidden).forEach(([a, b]) => G.seg(g, Mk(a), Mk(b), { ...G.LINE.construction, dash: [5, 4] }));
          if (m.part[k]) G.drawView(g, m.part[k], Mk, { hidden: hid, color: si === 3 && step === 3 ? '#1e3a8a' : undefined });
        }
      });
      // hatching of the cut surface
      if (si >= 4 && m.section.length) {
        L.facing.forEach((k) => {
          const pts = m.section.map((q) => M(L.map[k](q)));
          if (Math.abs(G.polyArea2(pts)) < 4) return;
          g.save(); if (si === 4 && step === 4) g.globalAlpha = 0.35 + 0.65 * ep;
          G.hatch(g, pts, { spacing: Math.max(6, 3 * sc), fill: 'rgba(254,226,226,0.55)' });
          g.restore();
        });
      }
      // view names
      const tagAt = (k, txt, col) => {
        const r = L.vb[k]; const cx = (r.u0 + r.u1) / 2;
        if (k === 'top') {
          const P = M([r.u0, (r.v0 + r.v1) / 2]); const w = D.textWidth(g, txt, 14, 700) + 16;
          if (P[0] - 22 - w >= 376) { D.tag(g, txt, P[0] - 22, P[1], { bg: col, size: 14, align: 'right' }); return; }
          const Q = M([cx, r.v0]); D.tag(g, txt, Q[0], Math.min(Q[1] + 30, 530), { bg: col, size: 14, align: 'center' }); return;
        }
        const P = M([cx, r.v1]);
        D.tag(g, txt, P[0], clamp(P[1] - 16, 60, 548), { bg: col, size: 14, align: 'center' });
      };
      const sect = (k) => si >= 3 && L.facing.includes(k) && m.section.length;
      tagAt('front', sect('front') ? 'Sectional FV' : 'FV', '#2563eb');
      tagAt('top', sect('top') ? 'Sectional TV' : 'TV', '#16a34a');
      tagAt('side', sect('side') ? 'Sectional LSV' : 'LSV', '#d97706');
      // cutting-plane trace(s)
      if (si >= 1) {
        Object.entries(L.traces).forEach(([k, tr]) => {
          const A = M(tr.A), B = M(tr.B); const f = si === 1 && step === 1 ? ep : 1;
          const E = lerp2(A, B, f); const dir = [-tr.N[0], tr.N[1]]; // screen direction of sight (towards the kept part)
          const hot = ui.hover || (ui.drag && ui.drag.kind === 'sheet');
          if (hot) D.line(g, A[0], A[1], B[0], B[1], { color: '#facc15', width: 12, alpha: 0.55 });
          cuttingLine(g, A, E, { dir: f >= 1 && k === L.primary ? dir : null, letter: k === L.primary ? 'A' : null, color: RED });
          if (k === L.primary && f >= 1) {
            const lab = k === 'front' ? 'VT' : k === 'top' ? 'HT' : 'trace';
            const up = k === 'front'; const Eu = (tr.B[1] > tr.A[1]) === up ? B : A; const Eo = Eu === B ? A : B;
            const ll = Math.hypot(Eu[0] - Eo[0], Eu[1] - Eo[1]) || 1; const lx = Eu[0] + (Eu[0] - Eo[0]) / ll * 14 - dir[0] * 30; const ly = Eu[1] + (Eu[1] - Eo[1]) / ll * 14 - dir[1] * 30;
            D.tag(g, lab, clamp(lx, 400, 975), clamp(ly, 60, 545), { bg: RED, size: 14, align: 'center' });
          }
        });
        // inclination arc θ between the trace and XY
        const tr = L.traces[L.primary];
        if ((p.mode === 'aip' || p.mode === 'avp') && tr) {
          const up = L.primary === 'front'; const e = (tr.T[1] >= 0) === up ? tr.T : [-tr.T[0], -tr.T[1]];
          const O = M((tr.B[1] > tr.A[1]) === up ? tr.B : tr.A); const r0 = 40;
          const aE = Math.atan2(-e[1], e[0]); const aH = e[0] >= 0 ? 0 : Math.PI;
          D.line(g, O[0], O[1], O[0] + Math.cos(aH) * (r0 + 14), O[1], { color: '#7c3aed', width: 1.2, dash: [6, 4] });
          D.line(g, O[0], O[1], O[0] + Math.cos(aE) * (r0 + 14), O[1] + Math.sin(aE) * (r0 + 14), { color: '#7c3aed', width: 1.2, dash: [6, 4] });
          let s0 = aH, s1 = aE; if (s1 - s0 > Math.PI) s1 -= 2 * Math.PI; if (s0 - s1 > Math.PI) s1 += 2 * Math.PI;
          g.save(); g.beginPath(); g.arc(O[0], O[1], r0, Math.min(s0, s1), Math.max(s0, s1)); g.strokeStyle = '#7c3aed'; g.lineWidth = 1.8; g.stroke(); g.restore();
          const am = (s0 + s1) / 2; D.text(g, `θ = ${p.theta}°`, O[0] + Math.cos(am) * (r0 + 36), O[1] + Math.sin(am) * (r0 + 14), { size: 15, weight: 800, color: '#7c3aed', align: 'center', halo: true });
        }
      }
      // cut points and projectors
      if (si >= 2 && m.cuts.length) {
        const E = L.primary; const f = si === 2 && step === 2 ? ep : 1;
        const areaView = p.mode === 'hp' || p.mode === 'aip' ? 'top' : 'front';
        const others = VIEW_KEYS.filter((k) => k !== E);
        if (si === 2 || si === 5) m.cuts.forEach((q) => {
          const a = M(L.map[E](q));
          others.forEach((k) => {
            const b = M(L.map[k](q));
            if (k === 'side' && E === 'top') { const fv = M(L.map.front(q)); partialSeg(g, fv, b, f, G.LINE.projector); return; }
            partialSeg(g, a, b, f, G.LINE.projector);
          });
        });
        m.cuts.forEach((q) => VIEW_KEYS.forEach((k) => { const a = M(L.map[k](q)); if (k === E || f >= 1) D.circle(g, a[0], a[1], 3.4, { fill: SECT, stroke: '#fff', width: 1 }); }));
        if (f >= 1 && si !== 5) labelPoints(g, m.cuts.map((q) => M(L.map[areaView](q))), m.section.map((q) => M(L.map[areaView](q))), '');
        if (si === 2) {
          const r = L.vb[E]; const P1 = M([r.u0, r.v1]), P2 = M([r.u1, r.v0]);
          D.focus(g, Math.min(P1[0], P2[0]) - 8, Math.min(P1[1], P2[1]) - 8, Math.abs(P2[0] - P1[0]) + 16, Math.abs(P2[1] - P1[1]) + 16, t);
        }
      }
      // true shape
      if (si === 5 && m.section.length) {
        if (L.aux) {
          const A = L.aux; const f = step === 5 ? ep : 1;
          m.cuts.forEach((q) => { const a = M(L.map[L.primary](q)), b = M(A.P(q)); partialSeg(g, a, b, f, G.LINE.projector); });
          const x1 = M(A.x1y1[0]), y1 = M(A.x1y1[1]);
          D.line(g, x1[0], x1[1], y1[0], y1[1], { color: C.ink, width: 1.6 });
          const ux = (y1[0] - x1[0]), uy = (y1[1] - x1[1]); const ul = Math.hypot(ux, uy) || 1;
          D.text(g, 'X₁', x1[0] - ux / ul * 14, x1[1] - uy / ul * 14, { size: 15, weight: 800, align: 'center', halo: true });
          D.text(g, 'Y₁', y1[0] + ux / ul * 14, y1[1] + uy / ul * 14, { size: 15, weight: 800, align: 'center', halo: true });
          if (f >= 1) {
            const pts = A.pts.map(M);
            G.hatch(g, pts, { spacing: Math.max(6, 3 * sc), fill: 'rgba(254,226,226,0.7)', outline: SECT, outlineWidth: 2.8 });
            A.cut.forEach((w) => { const a = M(w); D.circle(g, a[0], a[1], 3.4, { fill: SECT, stroke: '#fff', width: 1 }); });
            labelPoints(g, A.cut.map(M), pts, '');
            dimTrue(g, A, M, L);
            const c0 = pts.reduce((s, q) => [s[0] + q[0] / pts.length, s[1] + q[1] / pts.length], [0, 0]);
            const top = Math.min(...pts.map((q) => q[1]));
            D.tag(g, 'TRUE SHAPE', c0[0], clamp(top - 46, 60, 540), { bg: SECT, size: 14, align: 'center' });
          }
        } else {
          const k = p.mode === 'hp' ? 'top' : 'front'; const pts = m.section.map((q) => M(L.map[k](q)));
          G.hatch(g, pts, { spacing: Math.max(6, 3 * sc), fill: 'rgba(254,226,226,0.7)', outline: SECT, outlineWidth: 2.8 });
          labelPoints(g, m.cuts.map((q) => M(L.map[k](q))), pts, '');
        }
        D.text(g, `${L.aux ? 'True shape' : `True shape = sectional ${p.mode === 'hp' ? 'TV' : 'FV'}`}: ${m.shape} · A = ${fmt(m.area, 4)} mm²`, 986, 546, { size: 15, weight: 800, color: SECT, align: 'right', halo: true });
      }
      if (!m.section.length && si >= 1) D.tag(g, 'Plane misses the solid — move it', 690, 546, { bg: C.red, size: 14, align: 'center' });
      if (ui.hover && !ui.drag) D.tag(g, 'Drag the trace to move the cutting plane', 690, 44, { bg: '#334155', size: 14, align: 'center' });
    },
  };
  function layoutFacing(p) { const n = planeNormal(p); const out = []; if (n[1] > 1e-6) out.push('FV'); if (n[2] > 1e-6) out.push('TV'); if (-n[0] > 1e-6) out.push('LSV'); return out; }

  /** Point numbers placed outside the polygon (away from its centroid). */
  function labelPoints(g, pts, poly, prefix) {
    if (!pts.length) return;
    const src = poly && poly.length ? poly : pts;
    const c = src.reduce((s, q) => [s[0] + q[0] / src.length, s[1] + q[1] / src.length], [0, 0]);
    const placed = [];
    pts.forEach((q, i) => {
      let dx = q[0] - c[0], dy = q[1] - c[1]; const l = Math.hypot(dx, dy);
      if (l < 1e-6) { dx = 0; dy = -1; } else { dx /= l; dy /= l; }
      let X = q[0] + dx * 15, Y = q[1] + dy * 15;
      if (placed.some((r) => Math.hypot(r[0] - X, r[1] - Y) < 15)) { X += dx * 12; Y += dy * 12; }
      if (placed.some((r) => Math.hypot(r[0] - X, r[1] - Y) < 13)) return;
      placed.push([X, Y]);
      D.text(g, `${prefix}${i + 1}`, X, Y, { size: 14, weight: 800, color: '#7f1d1d', align: 'center', halo: true });
    });
  }
  function dimTrue(g, A, M, L) {
    const tr = L.traces[L.primary]; const T = tr.T; const mv = A.mv;
    const pts = A.pts; const tt = pts.map((w) => w[0] * T[0] + w[1] * T[1]); const nn = pts.map((w) => w[0] * mv[0] + w[1] * mv[1]);
    const t0 = Math.min(...tt), t1 = Math.max(...tt), n0 = Math.min(...nn), n1 = Math.max(...nn);
    const at = (tv, nv) => M([T[0] * tv + mv[0] * nv, T[1] * tv + mv[1] * nv]);
    // length along the trace (placed beyond the far side from X1Y1)
    const a = at(t0, n1), b = at(t1, n1); const c = at(t0, n0);
    const side = ((c[0] - a[0]) * (-(b[1] - a[1])) + (c[1] - a[1]) * (b[0] - a[0])) > 0 ? -1 : 1;
    G.dim(g, a, b, `${fmt(t1 - t0, 3)}`, { offset: 26 * side, size: 15 });
    const e = at(t1, n0), f = at(t1, n1); const h0 = at(t0, n0);
    const side2 = ((h0[0] - e[0]) * (-(f[1] - e[1])) + (h0[1] - e[1]) * (f[0] - e[0])) > 0 ? -1 : 1;
    G.dim(g, e, f, `${fmt(n1 - n0, 3)}`, { offset: 26 * side2, size: 15 });
  }
  function cam1(view, m) {
    const b = G.bounds(m.solid); const size = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) + 24;
    return G.camera(view, 186, 290, 235 / size, [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2], size * 1.7);
  }
  function planeQuad(P, m, grow) {
    const { u, v } = G.basis(m.n); const c0 = G.centroid(m.solid.verts);
    const c = G.sub(c0, G.mul(m.n, G.dot(m.n, c0) - m.plane.d));
    const b = G.bounds(m.solid); const r = 0.45 * Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) * (grow || 1);
    return [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([i, j]) => { const q = P(G.add(c, G.add(G.mul(u, r * i), G.mul(v, r * j)))); return [q.x, q.y]; });
  }
  function draw3d1(g, S2, m, si, ep) {
    const { view, p, ui, t, step } = S2;
    panel(g, '3-D model');
    g.save(); g.beginPath(); g.rect(PANEL[0] + 2, 44, PANEL[2] - 4, PANEL[3] - 70); g.clip();
    const P = cam1(view, m); const b = G.bounds(m.solid);
    G.drawPlanes3(g, P, { x: [b.min[0] - 12, b.max[0] + 12], y: [0, b.max[1] + 12], z: [0, b.max[2] + 12] }, { pp: false });
    const fill = '#93c5fd';
    const quad = planeQuad(P, m); const hot = ui.drag && ui.drag.kind === '3d';
    const drawPlane = (alpha) => {
      D.poly(g, quad, { fill: hot ? '#fde047' : '#fca5a5', close: true, stroke: false, alpha });
      D.poly(g, quad, { close: true, stroke: RED, width: 1.6, alpha: Math.min(1, alpha * 3) });
    };
    const depth = (Sd) => (Sd ? P(G.centroid(Sd.verts)).depth : 0);
    if (si === 0) G.drawSolid3(g, m.solid, P, { fill, showHidden: p.showHidden, alpha: 0.9 });
    else if (si <= 2) {
      const parts = [m.kept && { s: m.kept, z: depth(m.kept) }, m.rem && { s: m.rem, z: depth(m.rem) }].filter(Boolean).sort((a, c) => c.z - a.z);
      const pa = si === 1 && step === 1 ? 0.35 * ep : 0.35;
      if (parts[0]) G.drawSolid3(g, parts[0].s, P, { fill, showHidden: false, alpha: 0.9, hatchCut: false, cutFill: '#fecaca' });
      drawPlane(pa);
      if (parts[1]) G.drawSolid3(g, parts[1].s, P, { fill, showHidden: false, alpha: 0.9, hatchCut: false, cutFill: '#fecaca' });
      if (si === 2 && m.section.length) {
        D.poly(g, m.section.map((q) => { const r = P(q); return [r.x, r.y]; }), { close: true, stroke: SECT, width: 2.6 });
        m.cuts.forEach((q) => { const r = P(q); D.circle(g, r.x, r.y, 4, { fill: SECT, stroke: '#fff', width: 1.2 }); });
      }
    } else {
      const sz = Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2]);
      const e = (si === 3 && step === 3 ? ep : 1) * sz * 0.45;
      const remMoved = m.rem ? G.mapSolid(m.rem, (q) => G.add(q, G.mul(m.n, e))) : null; if (remMoved) remMoved.cut = m.rem.cut;
      const ghost = () => { if (remMoved) G.drawSolid3(g, remMoved, P, { fill: '#e2e8f0', alpha: 0.28, showHidden: false, hatchCut: false, cutFill: '#fecaca', edge: '#94a3b8', edgeWidth: 1.2 }); };
      const remFar = remMoved && depth(remMoved) > depth(m.kept);
      if (remFar) ghost();
      if (m.kept) G.drawSolid3(g, m.kept, P, { fill, showHidden: p.showHidden, alpha: 0.92, hatchCut: si >= 4, cutFill: '#fca5a5' });
      drawPlane(0.16);
      if (!remFar) ghost();
      if (remMoved && si < 5) { const c = P(G.centroid(remMoved.verts)); D.tag(g, 'removed part', c.x, c.y, { bg: '#64748b', size: 14, align: 'center' }); }
      if (si === 5 && m.section.length) {
        const c = G.centroid(m.section); const sz2 = sz * 0.55;
        const A = P(G.add(c, G.mul(m.n, sz2))), B = P(G.add(c, G.mul(m.n, sz2 * 0.25)));
        D.arrow(g, A.x, A.y, B.x, B.y, { color: SECT, width: 3.5, head: 16 });
        D.tag(g, 'view ⟂ plane → true shape', A.x, A.y - 16, { bg: SECT, size: 14, align: 'center' });
      }
    }
    const qc = quad.reduce((s, q) => [s[0] + q[0] / 4, s[1] + q[1] / 4], [0, 0]);
    if (si >= 1 && si !== 5) D.tag(g, 'cutting plane', clamp(qc[0], 80, 290), clamp(Math.min(...quad.map((q) => q[1])) - 4, 58, 500), { bg: RED, size: 14, align: 'center' });
    if (si === 1) D.focus(g, Math.min(...quad.map((q) => q[0])), Math.min(...quad.map((q) => q[1])), Math.max(...quad.map((q) => q[0])) - Math.min(...quad.map((q) => q[0])), Math.max(...quad.map((q) => q[1])) - Math.min(...quad.map((q) => q[1])), t);
    void qc;
    g.restore();
    D.text(g, ui.tool === 'plane' ? 'Drag here to slide the plane (1 mm snap)' : 'Drag: orbit · ✂ tool / VT–HT: move plane', 186, 536, { size: 14, color: C.muted, align: 'center' });
  }

  // ═════════════════════════ 2. SECTIONAL VIEWS OF MACHINE COMPONENTS ═════════════════════════
  const box = (x0, y0, z0, x1, y1, z1) => ({ t: 'box', min: [x0, y0, z0], max: [x1, y1, z1] });
  const cyl = (ax, c, r, lo, hi) => ({ t: 'cyl', ax, c, r, lo, hi });
  const COMPS = {
    bearing: {
      label: 'Bearing block', desc: 'base plate 120 × 50 × 15 with two Ø12 bolt holes, upright block and a Ø70 boss with a Ø36 bore',
      solids: [box(0, 0, 0, 120, 50, 15), box(25, 0, 15, 95, 50, 55), cyl(1, [60, 0, 55], 35, 0, 50)],
      holes: [cyl(1, [60, 0, 55], 18, 0, 50), cyl(2, [12, 25, 0], 6, 0, 15), cyl(2, [108, 25, 0], 6, 0, 15)],
      centre: [60, 25, 45], sym: [true, true, false],
    },
    bracket: {
      label: 'Angle bracket with holes', desc: 'L-bracket: base 100 × 60 × 12 with Ø18 and Ø10 holes, upright 14 mm thick with a Ø22 hole',
      solids: [box(0, 0, 0, 100, 60, 12), box(0, 0, 12, 14, 60, 80)],
      holes: [cyl(2, [60, 30, 0], 9, 0, 12), cyl(2, [88, 30, 0], 5, 0, 12), cyl(0, [0, 30, 52], 11, 0, 14)],
      centre: [50, 30, 40], sym: [false, true, false],
    },
    bush: {
      label: 'Flanged bush', desc: 'Ø90 × 14 flange with four Ø10 bolt holes, Ø52 body 50 long, Ø32 bore with a Ø42 counterbore',
      solids: [cyl(2, [50, 50, 0], 45, 0, 14), cyl(2, [50, 50, 0], 26, 14, 64)],
      holes: [cyl(2, [50, 50, 0], 16, 0, 64), cyl(2, [50, 50, 0], 21, 52, 64), cyl(2, [13, 50, 0], 5, 0, 14), cyl(2, [87, 50, 0], 5, 0, 14), cyl(2, [50, 13, 0], 5, 0, 14), cyl(2, [50, 87, 0], 5, 0, 14)],
      centre: [50, 50, 32], sym: [true, true, false],
    },
    stepped: {
      label: 'Stepped block with a slot', desc: 'block 110 × 50 × 22 with a 20 × 12 slot, raised step 50 × 50 × 33 with a Ø18 hole',
      solids: [box(0, 0, 0, 110, 50, 22), box(0, 0, 22, 50, 50, 55)],
      holes: [box(68, 0, 10, 88, 50, 22), cyl(2, [25, 25, 0], 9, 0, 55)],
      centre: [55, 25, 27], sym: [false, true, false],
    },
  };
  const OTH = [[1, 2], [0, 2], [0, 1]];
  function inPrim(pr, q) {
    if (pr.t === 'box') return q[0] > pr.min[0] && q[0] < pr.max[0] && q[1] > pr.min[1] && q[1] < pr.max[1] && q[2] > pr.min[2] && q[2] < pr.max[2];
    const [i, j] = OTH[pr.ax]; const di = q[i] - pr.c[i], dj = q[j] - pr.c[j];
    return di * di + dj * dj < pr.r * pr.r && q[pr.ax] > pr.lo && q[pr.ax] < pr.hi;
  }
  const PID = (axis, sgn, val) => 1000000 + axis * 200000 + (sgn > 0 ? 100000 : 0) + Math.round(val * 10) + 5000;
  const CUTID = 3000000;
  /** Ray (o + t·d) against one primitive: {t0,t1,n0,n1,id0,id1} or null. Normals point out of the primitive. */
  function rayPrim(pr, o, d, pi) {
    let t0 = -1e9, t1 = 1e9, n0 = null, n1 = null, id0 = 0, id1 = 0;
    const slab = (k, lo, hi) => {
      if (Math.abs(d[k]) < 1e-12) return o[k] > lo && o[k] < hi;
      let ta = (lo - o[k]) / d[k], tb = (hi - o[k]) / d[k]; let na = -1, nb = 1, va = lo, vb = hi;
      if (ta > tb) { [ta, tb] = [tb, ta]; na = 1; nb = -1; va = hi; vb = lo; }
      if (ta > t0) { t0 = ta; n0 = [0, 0, 0]; n0[k] = na; id0 = PID(k, na, va); }
      if (tb < t1) { t1 = tb; n1 = [0, 0, 0]; n1[k] = nb; id1 = PID(k, nb, vb); }
      return t0 < t1;
    };
    if (pr.t === 'box') { for (let k = 0; k < 3; k++) if (!slab(k, pr.min[k], pr.max[k])) return null; return { t0, t1, n0, n1, id0, id1 }; }
    const [i, j] = OTH[pr.ax]; const oi = o[i] - pr.c[i], oj = o[j] - pr.c[j];
    const A = d[i] * d[i] + d[j] * d[j]; const B = 2 * (oi * d[i] + oj * d[j]); const Cc = oi * oi + oj * oj - pr.r * pr.r;
    const sid = 2000000 + pi * 10;
    if (A < 1e-12) { if (Cc >= 0) return null; }
    else {
      const disc = B * B - 4 * A * Cc; if (disc <= 0) return null;
      const sq = Math.sqrt(disc); const ta = (-B - sq) / (2 * A), tb = (-B + sq) / (2 * A);
      const nrm = (t) => { const v = [0, 0, 0]; v[i] = (oi + t * d[i]) / pr.r; v[j] = (oj + t * d[j]) / pr.r; return v; };
      t0 = ta; n0 = nrm(ta); id0 = sid; t1 = tb; n1 = nrm(tb); id1 = sid;
    }
    if (!slab(pr.ax, pr.lo, pr.hi)) return null;
    return { t0, t1, n0, n1, id0, id1 };
  }
  const neg = (v) => (v ? [-v[0], -v[1], -v[2]] : v);
  function unionI(list) {
    list.sort((a, b) => a.t0 - b.t0); const out = [];
    list.forEach((q) => {
      const c = out[out.length - 1];
      if (c && q.t0 <= c.t1) { if (q.t1 > c.t1) { c.t1 = q.t1; c.n1 = q.n1; c.id1 = q.id1; } } else out.push({ ...q });
    });
    return out;
  }
  function subtractI(A, B) {
    let cur = A;
    B.forEach((b) => {
      const nx = [];
      cur.forEach((q) => {
        if (b.t1 <= q.t0 || b.t0 >= q.t1) { nx.push(q); return; }
        if (b.t0 > q.t0 + 1e-7) nx.push({ t0: q.t0, n0: q.n0, id0: q.id0, t1: b.t0, n1: neg(b.n0), id1: b.id0 });
        if (b.t1 < q.t1 - 1e-7) nx.push({ t0: b.t1, n0: neg(b.n1), id0: b.id1, t1: q.t1, n1: q.n1, id1: q.id1 });
      });
      cur = nx;
    });
    return cur;
  }
  /** Removed region = intersection of half-spaces {σ(q_k − c) > 0}; as a ray interval. */
  function removedI(conds, o, d) {
    let t0 = -1e9, t1 = 1e9, n0 = null, n1 = null, id0 = CUTID, id1 = CUTID;
    for (const h of conds) {
      const s = h.sg * d[h.k]; const f0 = h.sg * (o[h.k] - h.c);
      const nOut = [0, 0, 0]; nOut[h.k] = -h.sg;
      if (Math.abs(s) < 1e-12) { if (f0 <= 0) return []; continue; }
      const tc = -f0 / s;
      if (s > 0) { if (tc > t0) { t0 = tc; n0 = nOut; id0 = h.id; } } else if (tc < t1) { t1 = tc; n1 = nOut; id1 = h.id; }
    }
    return t0 < t1 ? [{ t0, t1, n0, n1, id0, id1 }] : [];
  }
  function materialI(comp, o, d) {
    const sol = []; const hol = [];
    comp.solids.forEach((pr, k) => { const r = rayPrim(pr, o, d, k); if (r) sol.push(r); });
    comp.holes.forEach((pr, k) => { const r = rayPrim(pr, o, d, 50 + k); if (r) hol.push(r); });
    return subtractI(unionI(sol), unionI(hol));
  }
  function intersectI(A, B) {
    const out = [];
    A.forEach((a) => B.forEach((b) => { const t0 = Math.max(a.t0, b.t0), t1 = Math.min(a.t1, b.t1); if (t0 < t1) out.push({ t0, t1, n0: a.t0 >= b.t0 ? a.n0 : neg(b.n0), id0: a.t0 >= b.t0 ? a.id0 : b.id0 }); }));
    return out.sort((a, b) => a.t0 - b.t0);
  }

  const PLANE2 = { vp: { a: 1, sg: 1, b: 0, view: 'front', cp: 'top' }, hp: { a: 2, sg: 1, b: 0, view: 'top', cp: 'front' }, pp: { a: 0, sg: -1, b: 1, view: 'side', cp: 'top' } };
  function setup2(p) {
    const comp = COMPS[p.comp] || COMPS.bearing; const P2 = PLANE2[p.plane] || PLANE2.vp;
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    comp.solids.forEach((pr) => {
      if (pr.t === 'box') for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pr.min[k]); hi[k] = Math.max(hi[k], pr.max[k]); }
      else for (let k = 0; k < 3; k++) { const a = k === pr.ax ? pr.lo : pr.c[k] - pr.r, b = k === pr.ax ? pr.hi : pr.c[k] + pr.r; lo[k] = Math.min(lo[k], a); hi[k] = Math.max(hi[k], b); }
    });
    const c = comp.centre[P2.a] + p.pos; const ce = c + 0.0137;
    const half = p.mode === 'half'; const mid = comp.centre[P2.b] + 0.0071;
    const conds = [{ k: P2.a, sg: P2.sg, c: ce, id: CUTID }];
    if (half) conds.push({ k: P2.b, sg: 1, c: mid, id: CUTID + 1 });
    const removed = (q) => conds.every((h) => h.sg * (q[h.k] - h.c) > 0);
    const material = (q) => comp.solids.some((pr) => inPrim(pr, q)) && !comp.holes.some((pr) => inPrim(pr, q));
    const cutsObj = c > lo[P2.a] && c < hi[P2.a];
    return { comp, P2, lo, hi, c, ce, half, mid, conds, removed, material, cutsObj };
  }
  const VAX = { front: { a: 1, sg: 1, uv: [0, 2] }, top: { a: 2, sg: 1, uv: [0, 1] }, side: { a: 0, sg: -1, uv: [1, 2] } };
  const memo2 = new Map();
  /** Visible / hidden edges of the component in one view (optionally with the removed part taken away). */
  function edges2(Z, key, cut) {
    const mk = `${Object.keys(COMPS).find((k) => COMPS[k] === Z.comp)}|${key}|${cut ? Z.conds.map((h) => `${h.k},${h.sg},${h.c}`).join(';') : 'full'}`;
    if (memo2.has(mk)) return memo2.get(mk);
    const V = VAX[key]; const eps = 0.06;
    const inside = cut ? (q) => Z.material(q) && !Z.removed(q) : Z.material;
    const cands = [];
    const all = Z.comp.solids.concat(Z.comp.holes);
    all.forEach((pr) => {
      if (pr.t === 'box') {
        for (let e = 0; e < 3; e++) {
          const [i, j] = OTH[e];
          [[pr.min[i], pr.min[j]], [pr.max[i], pr.min[j]], [pr.min[i], pr.max[j]], [pr.max[i], pr.max[j]]].forEach(([vi, vj]) => {
            const A = [0, 0, 0], B = [0, 0, 0]; A[e] = pr.min[e]; B[e] = pr.max[e]; A[i] = B[i] = vi; A[j] = B[j] = vj;
            const d1 = [0, 0, 0], d2 = [0, 0, 0]; d1[i] = 1; d2[j] = 1;
            cands.push({ pts: [A, B], crease: () => [d1, d2] });
          });
        }
      } else {
        const [i, j] = OTH[pr.ax]; const NS = 72;
        [pr.lo, pr.hi].forEach((h) => {
          const pts = []; for (let k = 0; k <= NS; k++) { const a = (2 * Math.PI * k) / NS; const q = [0, 0, 0]; q[pr.ax] = h; q[i] = pr.c[i] + pr.r * Math.cos(a); q[j] = pr.c[j] + pr.r * Math.sin(a); pts.push(q); }
          cands.push({ pts, crease: (m) => { const ax = [0, 0, 0]; ax[pr.ax] = 1; const rd = [0, 0, 0]; rd[i] = (m[i] - pr.c[i]) / pr.r; rd[j] = (m[j] - pr.c[j]) / pr.r; return [ax, rd]; } });
        });
        if (pr.ax !== V.a) {
          const k = 3 - pr.ax - V.a;
          [-1, 1].forEach((s) => { const A = [...pr.c], B = [...pr.c]; A[k] += s * pr.r; B[k] += s * pr.r; A[pr.ax] = pr.lo; B[pr.ax] = pr.hi; const nn = [0, 0, 0]; nn[k] = s; cands.push({ pts: [A, B], sil: nn }); });
        }
      }
    });
    const dir = [0, 0, 0]; dir[V.a] = V.sg;
    const [ua, va] = V.uv; const offs = [[eps, eps], [eps, -eps], [-eps, eps], [-eps, -eps]];
    const blocked = (q) => {
      let I = materialI(Z.comp, q, dir); if (cut) I = subtractI(I, removedI(Z.conds, q, dir));
      return I.some((iv) => iv.t1 > 1e-4);
    };
    const vis = [], hid = [];
    const to2 = (q) => [q[ua], q[va]];
    cands.forEach((cd) => {
      let run = null; let runState = null;
      const flush = () => { if (run && run.length > 1) (runState === 'v' ? vis : hid).push(run); run = null; runState = null; };
      for (let s = 0; s + 1 < cd.pts.length; s++) {
        const A = cd.pts[s], B = cd.pts[s + 1]; const L = G.len(G.sub(B, A)); const np = Math.max(1, Math.ceil(L / 1.5));
        for (let k = 0; k < np; k++) {
          const P0 = G.add(A, G.mul(G.sub(B, A), k / np)), P1 = G.add(A, G.mul(G.sub(B, A), (k + 1) / np)); const m = G.mul(G.add(P0, P1), 0.5);
          let isEdge;
          if (cd.sil) isEdge = inside(G.sub(m, G.mul(cd.sil, eps))) !== inside(G.add(m, G.mul(cd.sil, eps)));
          else {
            const [d1, d2] = cd.crease(m); const f = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => inside(G.add(m, G.add(G.mul(d1, a * eps), G.mul(d2, b * eps)))));
            const cnt = f.filter(Boolean).length; isEdge = cnt === 1 || cnt === 3 || (cnt === 2 && f[0] === f[3]);
          }
          let state = null;
          if (isEdge) {
            const vsb = offs.some(([a, b]) => { const q = [...m]; q[ua] += a; q[va] += b; return !blocked(q); });
            state = vsb ? 'v' : 'h';
          }
          if (state !== runState) { flush(); if (state) { run = [to2(P0)]; runState = state; } }
          if (state) run.push(to2(P1));
        }
      }
      flush();
    });
    const res = { vis, hid };
    if (memo2.size > 40) memo2.clear();
    memo2.set(mk, res);
    return res;
  }
  /** Cross-section of the component by the cutting plane (2-D shapes in view coords of the sectional view). */
  function section2(Z) {
    const a = Z.P2.a; const [ua, va] = VAX[Z.P2.view].uv; const c = Z.ce;
    const shape = (pr) => {
      if (pr.t === 'box') return c > pr.min[a] && c < pr.max[a] ? { t: 'r', u0: pr.min[ua], u1: pr.max[ua], v0: pr.min[va], v1: pr.max[va] } : null;
      if (pr.ax === a) return c > pr.lo && c < pr.hi ? { t: 'c', cu: pr.c[ua], cv: pr.c[va], r: pr.r } : null;
      const dd = c - pr.c[a]; if (Math.abs(dd) >= pr.r) return null; const w = Math.sqrt(pr.r * pr.r - dd * dd);
      const k = 3 - pr.ax - a; const r = { t: 'r' }; const lohi = [pr.lo, pr.hi]; const kk = [pr.c[k] - w, pr.c[k] + w];
      if (ua === pr.ax) { r.u0 = lohi[0]; r.u1 = lohi[1]; r.v0 = kk[0]; r.v1 = kk[1]; } else { r.u0 = kk[0]; r.u1 = kk[1]; r.v0 = lohi[0]; r.v1 = lohi[1]; }
      return r;
    };
    const sol = Z.comp.solids.map(shape).filter(Boolean); const hol = Z.comp.holes.map(shape).filter(Boolean);
    const um = Z.half ? Z.mid : -Infinity; // half section: section only where the b-coordinate > mid (b is the view's u)
    const inS = (s, u, v) => (s.t === 'r' ? u > s.u0 && u < s.u1 && v > s.v0 && v < s.v1 : (u - s.cu) ** 2 + (v - s.cv) ** 2 < s.r * s.r);
    const inSec = (u, v) => u > um && sol.some((s) => inS(s, u, v)) && !hol.some((s) => inS(s, u, v));
    // area by scan lines
    const rows = (list, v) => unionI(list.map((s) => {
      if (s.t === 'r') return v > s.v0 && v < s.v1 ? { t0: s.u0, t1: s.u1 } : null;
      const dv = v - s.cv; if (Math.abs(dv) >= s.r) return null; const w = Math.sqrt(s.r * s.r - dv * dv); return { t0: s.cu - w, t1: s.cu + w };
    }).filter(Boolean));
    let gross = 0, net = 0; const dv = 0.1;
    if (sol.length) {
      const v0 = Math.min(...sol.map((s) => (s.t === 'r' ? s.v0 : s.cv - s.r))), v1 = Math.max(...sol.map((s) => (s.t === 'r' ? s.v1 : s.cv + s.r)));
      const clipU = (I) => I.map((q) => ({ t0: Math.max(q.t0, um), t1: q.t1 })).filter((q) => q.t1 > q.t0);
      for (let v = v0 + dv / 2; v < v1; v += dv) {
        const Sx = clipU(rows(sol, v)); const Nx = subtractI(Sx, clipU(rows(hol, v)));
        Sx.forEach((q) => { gross += (q.t1 - q.t0) * dv; }); Nx.forEach((q) => { net += (q.t1 - q.t0) * dv; });
      }
    }
    // outline pieces
    const outline = [];
    const test = (A, B) => {
      const n = Math.max(1, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / 0.5)); let run = null;
      for (let k = 0; k < n; k++) {
        const P0 = lerp2(A, B, k / n), P1 = lerp2(A, B, (k + 1) / n); const m = lerp2(P0, P1, 0.5);
        const dx = P1[0] - P0[0], dy = P1[1] - P0[1]; const l = Math.hypot(dx, dy) || 1; const nx = -dy / l * 0.05, ny = dx / l * 0.05;
        const e = inSec(m[0] + nx, m[1] + ny) !== inSec(m[0] - nx, m[1] - ny);
        if (e) { if (!run) run = [P0]; run.push(P1); } else if (run) { outline.push(run); run = null; }
      }
      if (run) outline.push(run);
    };
    sol.concat(hol).forEach((s) => {
      if (s.t === 'r') { const P = [[s.u0, s.v0], [s.u1, s.v0], [s.u1, s.v1], [s.u0, s.v1]]; for (let i = 0; i < 4; i++) test(P[i], P[(i + 1) % 4]); }
      else for (let k = 0; k < 96; k++) { const a0 = (2 * Math.PI * k) / 96, a1 = (2 * Math.PI * (k + 1)) / 96; test([s.cu + s.r * Math.cos(a0), s.cv + s.r * Math.sin(a0)], [s.cu + s.r * Math.cos(a1), s.cv + s.r * Math.sin(a1)]); }
    });
    if (Z.half) { const vv = sol.flatMap((s) => (s.t === 'r' ? [s.v0, s.v1] : [s.cv - s.r, s.cv + s.r])); if (vv.length) test([um, Math.min(...vv)], [um, Math.max(...vv)]); }
    return { sol, hol, gross, net, holesArea: gross - net, outline, um, inSec };
  }
  function layout2(Z) {
    const { lo, hi } = Z; const FR = 10; const xs = hi[0] + 34;
    const map = { front: (w) => [w[0], w[1]], top: (w) => [w[0], -(w[1] + FR)], side: (w) => [xs + w[0] + FR, w[1]] };
    const vb = { front: { u0: lo[0], u1: hi[0], v0: lo[2], v1: hi[2] }, top: { u0: lo[0], u1: hi[0], v0: -(hi[1] + FR), v1: -(lo[1] + FR) }, side: { u0: xs + lo[1] + FR, u1: xs + hi[1] + FR, v0: lo[2], v1: hi[2] } };
    const bb = bbNew(); Object.values(vb).forEach((r) => bbAdd(bb, bbPts(r), 16)); bbAdd(bb, [[lo[0] - 26, 0], [xs + hi[1] + FR + 16, 0]]);
    bbAdd(bb, [[lo[0], hi[2] + 30], [lo[0], -(hi[1] + FR) - 34]]);
    const F = fitBox(bb, [384, 50, 604, 494], 3.2);
    return { map, vb, F, xs, FR };
  }
  /** Cutting-plane line(s) in sheet mm: [{A,B,main}] and the sight direction (screen). */
  function cpLines2(Z, L) {
    const { lo, hi, c, P2 } = Z; const e = 12; const mid = Z.mid; const out = [];
    const T = (x, y) => L.map.top([x, y]); const Fm = (x, z) => L.map.front([x, z]);
    if (P2.a === 1) { // plane y = c, seen in TV
      if (!Z.half) out.push({ A: T(lo[0] - e, c), B: T(hi[0] + e, c), main: true });
      else { out.push({ A: T(mid, c), B: T(hi[0] + e, c), main: true }); out.push({ A: T(mid, c), B: T(mid, hi[1] + e), main: false }); }
      return { lines: out, dir: [0, -1], view: 'top' };
    }
    if (P2.a === 2) { // plane z = c, seen in FV
      if (!Z.half) out.push({ A: Fm(lo[0] - e, c), B: Fm(hi[0] + e, c), main: true });
      else { out.push({ A: Fm(mid, c), B: Fm(hi[0] + e, c), main: true }); out.push({ A: Fm(mid, c), B: Fm(mid, hi[2] + e), main: false }); }
      return { lines: out, dir: [0, 1], view: 'front' };
    }
    // plane x = c, seen in TV; removed x < c
    if (!Z.half) out.push({ A: T(c, lo[1] - e), B: T(c, hi[1] + e), main: true });
    else { out.push({ A: T(c, mid), B: T(c, hi[1] + e), main: true }); out.push({ A: T(c, mid), B: T(lo[0] - e, mid), main: false }); }
    return { lines: out, dir: [1, 0], view: 'top' };
  }
  function cam2(view, Z) {
    const { lo, hi } = Z; const size = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) + 30;
    const center = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2]; const unit = size * 1.7; const ppm = 225 / size;
    const cx = 186 + (view.panX || 0), cy = 282 + (view.panY || 0);
    const P = G.camera(view, 186, 282, ppm, center, unit);
    const s = ppm * unit * (view.zoom || 1); const cyw = Math.cos(view.yaw), syw = Math.sin(view.yaw), cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
    const toModel = (x1, y2, z2, pt) => {
      const y1 = y2 * cp + z2 * sp; const qz = -y2 * sp + z2 * cp; const qx = x1 * cyw + y1 * syw; const qy = -x1 * syw + y1 * cyw;
      return pt ? [center[0] + unit * qx, center[1] - unit * qy, center[2] + unit * qz] : [unit * qx, -unit * qy, unit * qz];
    };
    const eye = toModel(0, -9, 0, true);
    const ray = (X, Y) => { const a = (X - cx) / s, b = -(Y - cy) / s; return toModel(a / 9, 1, b / 9, false); };
    return { P, eye, ray };
  }
  let rc2 = null;
  function render3d2(g, Z, view, o) {
    const x0 = PANEL[0] + 2, y0 = 44, W = PANEL[2] - 4, H = PANEL[3] - 76; const res = 0.72;
    const w = Math.round(W * res), h = Math.round(H * res);
    const key = JSON.stringify([Object.keys(COMPS).find((k) => COMPS[k] === Z.comp), Z.conds, o, view.yaw, view.pitch, view.zoom, view.panX, view.panY]);
    if (!rc2 || rc2.key !== key) {
      let cv = rc2 && rc2.cv; if (!cv) { cv = document.createElement('canvas'); }
      cv.width = w; cv.height = h; const cx = cv.getContext('2d'); const img = cx.createImageData(w, h); const px = img.data;
      const cam = cam2(view, Z); const ids = new Int32Array(w * h); const gids = new Int32Array(w * h);
      const Lg = G.norm([-0.4, -0.55, 0.75]); const offv = o.shift ? (() => { const v = [0, 0, 0]; v[Z.P2.a] = Z.P2.sg * o.shift; return v; })() : null;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const X = x0 + (i + 0.5) / res, Y = y0 + (j + 0.5) / res; const d = cam.ray(X, Y); const E = cam.eye;
        const mat = materialI(Z.comp, E, d);
        const kept = o.cut ? subtractI(mat, removedI(Z.conds, E, d)) : mat;
        const hitK = kept.find((q) => q.t1 > 0);
        let col = null; let id = 0;
        if (hitK) {
          const t = Math.max(0, hitK.t0); id = hitK.id0; const n = hitK.n0 || [0, 0, 1];
          const sh = 0.5 + 0.5 * Math.abs(G.dot(n, Lg));
          if (id >= CUTID) {
            const q = G.add(E, G.mul(d, t)); const ax = n[0] ? 0 : n[1] ? 1 : 2; const [ui, vi] = OTH[ax];
            const stripe = o.hatch && ((((q[ui] + q[vi]) % 4) + 4) % 4) < 0.8;
            col = stripe ? [127, 29, 29] : [252, 165, 165].map((v) => v * (0.85 + 0.15 * sh));
          } else col = [147, 197, 253].map((v) => v * sh);
        }
        let gid = 0;
        if (o.ghost) {
          const Eg = offv ? G.sub(E, offv) : E; const mg = offv ? materialI(Z.comp, Eg, d) : mat;
          const gi = intersectI(mg, removedI(Z.conds, Eg, d)).find((q) => q.t1 > 0);
          if (gi && (!hitK || gi.t0 < hitK.t0)) { gid = gi.id0 + 7; const base = col || [248, 250, 252]; col = base.map((v, k) => v * 0.62 + [203, 213, 225][k] * 0.38); if (!hitK) id = -1; }
        }
        const pI = (j * w + i) * 4; ids[j * w + i] = id; gids[j * w + i] = gid;
        if (col) { px[pI] = col[0]; px[pI + 1] = col[1]; px[pI + 2] = col[2]; px[pI + 3] = 255; }
      }
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const k = j * w + i; const a = ids[k]; const r = i + 1 < w ? ids[k + 1] : a; const b = j + 1 < h ? ids[k + w] : a;
        const ga = gids[k]; const gr = i + 1 < w ? gids[k + 1] : ga; const gb = j + 1 < h ? gids[k + w] : ga;
        const pI = k * 4;
        if ((a !== r || a !== b) && (a > 0 || r > 0 || b > 0)) { px[pI] = 15; px[pI + 1] = 23; px[pI + 2] = 42; px[pI + 3] = 255; }
        else if (ga !== gr || ga !== gb) { px[pI] = 100; px[pI + 1] = 116; px[pI + 2] = 139; px[pI + 3] = 255; }
      }
      cx.putImageData(img, 0, 0);
      rc2 = { key, cv };
    }
    g.save(); g.imageSmoothingEnabled = true; g.drawImage(rc2.cv, x0, y0, W, H); g.restore();
  }

  const ST2 = ['object', 'plane', 'remove', 'outline', 'hatch', 'final'];
  const VNAME = { front: 'FV', top: 'TV', side: 'LSV' };
  S['eg-sectional-view'] = {
    view3d: true,
    initialView: { yaw: 0.55, pitch: 0.42, zoom: 1 },
    modes: [{ key: 'full', label: 'Full section' }, { key: 'half', label: 'Half section' }],
    tools: [{ key: 'orbit', label: '🎥 Orbit camera', title: 'Drag in the 3-D panel to look around' }, { key: 'plane', label: '✂ Move cutting plane', title: 'Drag in the 3-D panel to slide the cutting plane A–A (the A–A line on the sheet can always be dragged)' }],
    actions: [{ key: 'centre', label: '⌖ Plane through centre', title: 'Put the cutting plane on the plane of symmetry' }],
    initUi: () => ({ tool: 'orbit', drag: null, hover: false }),
    saveUi: (ui) => ({ tool: ui.tool }),
    restoreUi: (s, ui) => Object.assign(ui, { tool: s.tool === 'plane' ? 'plane' : 'orbit' }),
    params: [
      { key: 'comp', label: 'Machine component', type: 'select', options: Object.keys(COMPS).map((k) => ({ value: k, label: COMPS[k].label })), default: 'bearing' },
      { key: 'plane', label: 'Cutting plane A–A', type: 'select', options: [{ value: 'vp', label: '∥ VP → sectional front view' }, { value: 'hp', label: '∥ HP → sectional top view' }, { value: 'pp', label: '∥ PP → sectional side view' }], default: 'vp' },
      { key: 'pos', label: 'Plane position from the centre plane', type: 'range', min: -50, max: 50, step: 1, default: 0, unit: 'mm', help: 'Drag the A–A line on the sheet (1 mm snap).' },
      { key: 'showHidden', label: 'Hidden lines in the other views', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Bearing block — full section A–A through the bore (sectional FV)', values: { mode: 'full', comp: 'bearing', plane: 'vp', pos: 0 } },
      { label: 'Flanged bush — half section (sectional FV)', values: { mode: 'half', comp: 'bush', plane: 'vp', pos: 0 } },
      { label: 'Angle bracket — sectional top view 6 mm above the base', values: { mode: 'full', comp: 'bracket', plane: 'hp', pos: -34 } },
      { label: 'Stepped block — sectional side view through the slot', values: { mode: 'full', comp: 'stepped', plane: 'pp', pos: 23 } },
    ],
    validate(p) {
      const Z = setup2(p); const w = [];
      if (!Z.cutsObj) w.push('The cutting plane lies outside the component — move it inside to get a section.');
      if (Z.half && !Z.comp.sym[Z.P2.b]) w.push(`A half section is normally used only for symmetrical parts — the ${Z.comp.label.toLowerCase()} is not symmetrical about the dividing centre line.`);
      return w;
    },
    compute(p) {
      const Z = setup2(p); const sec = section2(Z); const cn = Z.comp; const vn = VNAME[Z.P2.view];
      const plTxt = p.plane === 'vp' ? 'parallel to the VP' : p.plane === 'hp' ? 'parallel to the HP' : 'parallel to the profile plane';
      const nHoles = sec.hol.length;
      const formulas = [
        { name: 'Area of the cut material (hatched, true shape)', formula: 'A = A_gross − A_holes = Σ w(v)·Δv', given: `section of the ${cn.label.toLowerCase()} by plane A–A (${plTxt})${Z.half ? ', half section' : ''}`, calc: `${fmt(sec.gross, 4)} − ${fmt(sec.holesArea, 4)}`, result: fmt(sec.net, 4), unit: 'mm²' },
        { name: 'Area of holes / slots cut by A–A (left unhatched)', formula: 'A_holes = gross outline area − material area', given: `${nHoles} hole/slot section(s) cut`, calc: `${fmt(sec.gross, 4)} − ${fmt(sec.net, 4)}`, result: fmt(sec.holesArea, 4), unit: 'mm²' },
        { name: 'Position of the cutting plane', formula: `${'xyz'[Z.P2.a]} = centre + offset`, given: `centre ${fmt(cn.centre[Z.P2.a], 3)} mm, offset ${p.pos} mm`, calc: `${fmt(cn.centre[Z.P2.a], 3)} + (${p.pos})`, result: fmt(Z.c, 4), unit: 'mm' },
      ];
      const readouts = [
        { label: 'Component', value: cn.label, tone: 'info' },
        { label: 'Section', value: `${Z.half ? 'Half' : 'Full'} — sectional ${vn}`, tone: 'good' },
        { label: 'Cut area', value: `${fmt(sec.net, 4)} mm²`, tone: Z.cutsObj ? undefined : 'bad' },
        { label: 'Holes cut', value: String(nHoles) },
      ];
      const state = {
        component: cn.label, componentDescription: cn.desc, sectionType: Z.half ? 'half section (one quarter removed, half shown in section)' : 'full section',
        cuttingPlane: `A–A ${plTxt}, ${p.pos} mm from the centre plane (${'xyz'[Z.P2.a]} = ${fmt(Z.c, 4)} mm)`, sectionalView: `SECTION A–A (sectional ${vn})`,
        cuttingPlaneShownIn: VNAME[cpLines2(Z, layout2(Z)).view], hatchedArea: `${fmt(sec.net, 4)} mm²`, holesAreaUnhatched: `${fmt(sec.holesArea, 4)} mm²`, planeCutsComponent: Z.cutsObj,
        trueShape: 'the hatched area in the sectional view is the true shape because A–A is parallel to that plane of projection',
      };
      return {
        formulas, readouts, state,
        explain: {
          what: `The ${cn.label.toLowerCase()} (${cn.desc}) is cut by the imaginary plane A–A ${plTxt}. The part between the observer and the plane${Z.half ? ' — only one quarter for a half section —' : ''} is removed and the sectional ${vn} shows the cut material hatched at 45° (${fmt(sec.net, 4)} mm²); ${nHoles ? `${nHoles} hole/slot section(s) stay blank` : 'no holes are cut'}.`,
          why: 'A sectional view replaces confusing hidden lines by visible cut surfaces: hatching marks solid material only, so holes, bores and slots stand out as blank areas. Because A–A is parallel to the plane of projection, the hatched region is also the true shape of the section.',
          param: `Component, direction of A–A (${plTxt}), ${Z.half ? 'half' : 'full'} section, plane offset ${p.pos} mm from the centre plane.`,
          effect: `Sliding A–A changes which features it passes through — through the centre of a hole the gap is widest; off-centre the hole section narrows (chord 2√(r² − e²)) and disappears when the plane misses it. A half section keeps the outside on one side of the centre line and shows the inside on the other.`,
        },
      };
    },
    steps(p) {
      const Z = setup2(p); const vn = VNAME[Z.P2.view]; const cpv = VNAME[cpLines2(Z, layout2(Z)).view];
      return [
        { title: 'Component and its views', text: `The ${Z.comp.label.toLowerCase()} with its FV, TV and LSV (hidden features dashed).` },
        { title: 'Cutting plane A–A', text: `A–A (${p.plane === 'vp' ? '∥ VP' : p.plane === 'hp' ? '∥ HP' : '∥ PP'}) is drawn in the ${cpv} as a chain line thick at the ends, lettered A–A, arrows show the direction of sight. Drag it to move it.` },
        { title: Z.half ? 'Remove one quarter' : 'Remove the front part', text: Z.half ? 'For a half section only the quarter in front of A–A and on one side of the centre line is removed.' : 'Imagine the part between the observer and A–A removed.' },
        { title: `Sectional ${vn}: outlines`, text: 'Draw the outline of the cut surface and the visible edges behind it; hidden lines are omitted in a sectional view.' },
        { title: 'Hatch the cut material', text: 'Thin lines at 45°, about 3 mm apart, only on solid material cut by A–A — holes, bores and slots are left blank.' },
        { title: 'SECTION A–A', text: `Title the view "SECTION A–A", add centre lines. Hatched area = ${fmt(section2(Z).net, 4)} mm² (true shape).` },
      ];
    },
    onAction(key) { if (key === 'centre') return { params: { pos: 0 }, toast: 'A–A now lies on the centre plane' }; return null; },
    onPointer(type, x, y, S2) {
      const { p, ui } = S2; const Z = setup2(p); const L = layout2(Z); const cp = cpLines2(Z, L); const main = cp.lines.find((l) => l.main);
      const near = () => main && distSeg([x, y], L.F.M(main.A), L.F.M(main.B)) < 16;
      if (type === 'hover') { const h = x > 370 && near(); if (h !== ui.hover) { ui.hover = h; return { redraw: true }; } return null; }
      if (type === 'down') {
        if (x > 370 && near()) { ui.drag = { kind: 'sheet', pos0: p.pos, w0: L.F.inv(x, y) }; return { redraw: true }; }
        if (x < 366 && ui.tool === 'plane') { ui.drag = { kind: '3d', pos0: p.pos, x, y }; return { redraw: true }; }
        return null;
      }
      if (!ui.drag) return null;
      if (type === 'move') {
        let dmm;
        if (ui.drag.kind === 'sheet') {
          const w = L.F.inv(x, y); const dw = [w[0] - ui.drag.w0[0], w[1] - ui.drag.w0[1]];
          dmm = Z.P2.a === 0 ? dw[0] : Z.P2.a === 1 ? -dw[1] : dw[1];
        } else {
          const cam = cam2(S2.view, Z); const c0 = [(Z.lo[0] + Z.hi[0]) / 2, (Z.lo[1] + Z.hi[1]) / 2, (Z.lo[2] + Z.hi[2]) / 2];
          const e = [0, 0, 0]; e[Z.P2.a] = 1; const A = cam.P(c0), B = cam.P(G.add(c0, e)); const nx = B.x - A.x, ny = B.y - A.y; const l2 = nx * nx + ny * ny;
          dmm = l2 > 0.09 ? ((x - ui.drag.x) * nx + (y - ui.drag.y) * ny) / l2 : -(y - ui.drag.y) / 2;
        }
        const pos = clamp(snap1(ui.drag.pos0 + dmm), -50, 50);
        return pos === p.pos ? null : { params: { pos } };
      }
      if (type === 'up') { ui.drag = null; return { recompute: true }; }
      return null;
    },
    draw(g, S2) {
      const { p, step, st, dur, t, ui, view } = S2; const ep = D.ease(clamp(st / dur, 0, 1));
      const si = Math.min(step, ST2.length - 1);
      const Z = setup2(p); const L = layout2(Z); const M = L.F.M; const sc = L.F.s; const vs = Z.P2.view;
      D.clear(g, '#ffffff');
      // ── 3-D ──
      panel(g, '3-D model');
      const shift = si < 2 ? 0 : (si === 2 && step === 2 ? ep : 1) * 45;
      render3d2(g, Z, view, { cut: si >= 2, ghost: si >= 2, shift, hatch: si >= 4 });
      if (si >= 1) {
        const cam = cam2(view, Z); const a = Z.P2.a; const [i, j] = OTH[a]; const e = 10;
        const q = (u, v) => { const r = [0, 0, 0]; r[a] = Z.c; r[i] = u; r[j] = v; const s = cam.P(r); return [s.x, s.y]; };
        let ui0 = Z.lo[i] - e, ui1 = Z.hi[i] + e; if (Z.half && Z.P2.b === i) ui0 = Z.mid;
        const quad = [q(ui0, Z.lo[j] - e), q(ui1, Z.lo[j] - e), q(ui1, Z.hi[j] + e), q(ui0, Z.hi[j] + e)];
        const hot = ui.drag && ui.drag.kind === '3d';
        D.poly(g, quad, { fill: hot ? '#fde047' : '#fca5a5', close: true, stroke: false, alpha: si === 1 && step === 1 ? 0.3 * ep : 0.22 });
        D.poly(g, quad, { close: true, stroke: RED, width: 1.6 });
        const top = quad.reduce((m2, r) => (r[1] < m2[1] ? r : m2), quad[0]);
        D.tag(g, 'A–A', clamp(top[0], 40, 330), clamp(top[1] - 12, 56, 500), { bg: RED, size: 14, align: 'center' });
      }
      D.text(g, ui.tool === 'plane' ? 'Drag here to slide A–A (1 mm snap)' : 'Drag: orbit · ✂ tool / A–A line: move plane', 186, 536, { size: 14, color: C.muted, align: 'center' });

      // ── Sheet ──
      D.text(g, 'Drawing sheet — first-angle projection', 380, 30, { size: 17, weight: 800 });
      const xyA = M([Z.lo[0] - 20, 0]), xyB = M([L.xs + Z.hi[1] + L.FR + 14, 0]);
      G.xyLine(g, xyA[0], xyB[0], xyA[1]);
      const toS = (k) => (w) => M(L.map[k](w));
      const poly = (pts, Mk, style) => { g.save(); g.beginPath(); pts.forEach((w, n) => { const s = Mk(w); if (n) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); }); g.strokeStyle = style.color; g.lineWidth = style.width; g.lineCap = 'round'; g.lineJoin = 'round'; if (style.dash) g.setLineDash(style.dash); if (style.alpha) g.globalAlpha = style.alpha; g.stroke(); g.restore(); };
      const sectional = si >= 3 && Z.cutsObj;
      ['front', 'top', 'side'].forEach((k) => {
        const Mk = toS(k);
        if (k === vs && si >= 2 && Z.cutsObj) {
          if (si === 2) { const E = edges2(Z, k, false); E.vis.forEach((pl) => poly(pl, Mk, { ...G.LINE.construction, dash: [5, 4] })); return; }
          const sec = section2(Z);
          if (si >= 4) { // hatch
            g.save(); if (si === 4 && step === 4) g.globalAlpha = 0.3 + 0.7 * ep;
            g.beginPath();
            sec.sol.forEach((s) => { if (s.t === 'r') { const A = Mk([s.u0, s.v0]), B = Mk([s.u1, s.v1]); g.rect(Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.abs(B[0] - A[0]), Math.abs(B[1] - A[1])); } else { const c0 = Mk([s.cu, s.cv]); g.moveTo(c0[0] + s.r * sc, c0[1]); g.arc(c0[0], c0[1], s.r * sc, 0, Math.PI * 2); } });
            g.clip();
            if (Z.half) { const um = Mk([sec.um, 0])[0]; g.beginPath(); g.rect(um, 0, 1000, 560); g.clip(); }
            g.fillStyle = 'rgba(254,226,226,0.55)'; g.fillRect(380, 40, 620, 520);
            g.strokeStyle = C.ink; g.lineWidth = 1.1; const sp = Math.max(6, 3 * sc);
            for (let k2 = -600; k2 < 1200; k2 += sp) { g.beginPath(); g.moveTo(380 + k2, 560); g.lineTo(380 + k2 + 520, 40); g.stroke(); }
            g.fillStyle = '#ffffff';
            sec.hol.forEach((s) => { g.beginPath(); if (s.t === 'r') { const A = Mk([s.u0, s.v0]), B = Mk([s.u1, s.v1]); g.rect(Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.abs(B[0] - A[0]), Math.abs(B[1] - A[1])); } else { const c0 = Mk([s.cu, s.cv]); g.arc(c0[0], c0[1], s.r * sc, 0, Math.PI * 2); } g.fill(); });
            g.restore();
          }
          const E = edges2(Z, k, true);
          E.vis.forEach((pl) => poly(pl, Mk, { color: si === 3 && step === 3 ? '#1e3a8a' : C.ink, width: 2.6 }));
          sec.outline.forEach((pl) => poly(pl, Mk, { color: C.ink, width: 2.8 }));
          if (Z.half) { const ys = [Z.lo, Z.hi].map((b) => b[VAX[k].uv[1]]); poly([[sec.um, ys[0] - 6], [sec.um, ys[1] + 6]], Mk, G.LINE.centre); }
          return;
        }
        const E = edges2(Z, k, false);
        if (p.showHidden) E.hid.forEach((pl) => poly(pl, Mk, G.LINE.hidden));
        E.vis.forEach((pl) => poly(pl, Mk, G.LINE.visible));
      });
      // centre lines of holes / cylinders
      if (si >= 5 || si === 0) {
        Z.comp.solids.concat(Z.comp.holes).forEach((pr) => {
          if (pr.t !== 'cyl') return;
          ['front', 'top', 'side'].forEach((k) => {
            const V = VAX[k]; const [ua, va] = V.uv; const Mk = toS(k);
            if (pr.ax === V.a) { const c0 = [pr.c[ua], pr.c[va]]; const r = pr.r + 4; poly([[c0[0] - r, c0[1]], [c0[0] + r, c0[1]]], Mk, G.LINE.centre); poly([[c0[0], c0[1] - r], [c0[0], c0[1] + r]], Mk, G.LINE.centre); }
            else { const A = [0, 0, 0].map((_, n) => pr.c[n]); const B = [...A]; A[pr.ax] = Math.max(pr.lo, Z.lo[pr.ax]) - 4; B[pr.ax] = Math.min(pr.hi, Z.hi[pr.ax]) + 4; poly([[A[ua], A[va]], [B[ua], B[va]]], Mk, G.LINE.centre); }
          });
        });
      }
      // view labels
      const lab = (k, txt, col) => {
        const r = L.vb[k];
        if (k === 'top') {
          const P = M([r.u0, (r.v0 + r.v1) / 2]); const w = D.textWidth(g, txt, k === vs && si >= 5 ? 18 : 14, 800) + 18;
          const gap = si >= 1 && cpLines2(Z, L).view === 'top' ? 52 : 22;
          if (P[0] - gap - w >= 376) { if (k === vs && si >= 5 && Z.cutsObj) title(P[0] - gap - w / 2, P[1]); else D.tag(g, txt, P[0] - gap, P[1], { bg: col, size: 14, align: 'right' }); return; }
          const Q = M([(r.u0 + r.u1) / 2, r.v0]); if (k === vs && si >= 5 && Z.cutsObj) title(Q[0], Math.min(Q[1] + 26, 536)); else D.tag(g, txt, Q[0], Math.min(Q[1] + 18, 546), { bg: col, size: 14, align: 'center' }); return;
        }
        const P = M([(r.u0 + r.u1) / 2, r.v1]);
        if (k === vs && si >= 5 && Z.cutsObj) title(P[0], clamp(P[1] - 22, 56, 546)); else D.tag(g, txt, P[0], clamp(P[1] - 18, 58, 546), { bg: col, size: 14, align: 'center' });
      };
      const title = (x, y) => { const txt = 'SECTION A–A'; D.text(g, txt, x, y, { size: 18, weight: 800, align: 'center', halo: true }); const tw = D.textWidth(g, txt, 18, 800); D.line(g, x - tw / 2, y + 12, x + tw / 2, y + 12, { color: C.ink, width: 1.6 }); };
      ['front', 'top', 'side'].forEach((k) => lab(k, sectional && k === vs ? `Sectional ${VNAME[k]}` : VNAME[k], k === 'front' ? '#2563eb' : k === 'top' ? '#16a34a' : '#d97706'));
      // cutting-plane line A–A
      if (si >= 1) {
        const cp = cpLines2(Z, L); const hot = ui.hover || (ui.drag && ui.drag.kind === 'sheet'); const f = si === 1 && step === 1 ? ep : 1;
        cp.lines.forEach((ln) => {
          const A = M(ln.A), B = M(ln.B);
          if (hot && ln.main) D.line(g, A[0], A[1], B[0], B[1], { color: '#facc15', width: 12, alpha: 0.55 });
          if (Z.half) {
            G.seg(g, A, lerp2(A, B, f), { ...G.LINE.cutting, width: 1.6 });
            const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1;
            if (f >= 1) { D.line(g, B[0], B[1], B[0] - dx / l * 18, B[1] - dy / l * 18, { color: RED, width: 4.2 }); D.line(g, A[0], A[1], A[0] + dx / l * 10, A[1] + dy / l * 10, { color: RED, width: 4.2 }); }
            if (f >= 1 && ln.main) { D.arrow(g, B[0], B[1], B[0] + cp.dir[0] * 28, B[1] + cp.dir[1] * 28, { color: RED, width: 2.4, head: 12 }); }
            if (f >= 1) D.text(g, 'A', B[0] + dx / l * 14 + (ln.main ? cp.dir[0] * 28 : 0), B[1] + dy / l * 14 + (ln.main ? cp.dir[1] * 28 : 0), { size: 17, weight: 800, color: RED, align: 'center', halo: true });
          } else cuttingLine(g, A, lerp2(A, B, f), { dir: f >= 1 ? cp.dir : null, letter: 'A' });
        });
        if (!Z.cutsObj) D.tag(g, 'A–A misses the component', 690, 546, { bg: C.red, size: 14, align: 'center' });
      }
      if (si === 5 && Z.cutsObj) D.text(g, `Hatched area (true shape) = ${fmt(section2(Z).net, 4)} mm²`, 986, 548, { size: 15, weight: 800, color: SECT, align: 'right' });
      // focus
      const fv = si === 1 ? cpLines2(Z, L).view : si >= 2 ? vs : null;
      if (fv && si <= 4) { const r = L.vb[fv]; const A = M([r.u0, r.v1]), B = M([r.u1, r.v0]); D.focus(g, A[0] - 10, A[1] - 10, B[0] - A[0] + 20, B[1] - A[1] + 20, t); }
      if (ui.hover && !ui.drag) D.tag(g, 'Drag A–A to move the cutting plane', 690, 44, { bg: '#334155', size: 14, align: 'center' });
    },
  };

  // ═════════════════════════ 3. DEVELOPMENT OF SURFACES ═════════════════════════
  function clipPoly3(poly, f) { // keep f ≤ 0
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length]; const fa = f(A), fb = f(B);
      if (fa <= 1e-9) out.push(A);
      if ((fa < -1e-9 && fb > 1e-9) || (fa > 1e-9 && fb < -1e-9)) out.push(G.add(A, G.mul(G.sub(B, A), fa / (fa - fb))));
    }
    return out;
  }
  function rotAbout(q, Q, e, a) { // Rodrigues
    const v = G.sub(q, Q); const c = Math.cos(a), s = Math.sin(a);
    const r = G.add(G.add(G.mul(v, c), G.mul(G.cross(e, v), s)), G.mul(e, G.dot(e, v) * (1 - c)));
    return G.add(Q, r);
  }
  function build3(p) {
    const curved = isCurved(p.obj); const trunc = p.mode === 'trunc';
    const solid = G.place(G.solid(specOf(p)), { front: 18, above: 0, x: 0 });
    const N = solid.baseCount; const Hh = p.h;
    const [A0] = solid.axis; const cx = A0[0], cy = A0[1];
    const R = curved ? p.d / 2 : G.circumR(p.n, p.a);
    const pyr = p.obj === 'pyramid' || p.obj === 'cone';
    const Lsl = Math.hypot(Hh, R); // slant edge / slant height of cone (true length by rotation)
    const th = G.rad(trunc ? p.theta : 0); const hc = clamp(p.hc, 1, Hh);
    const n = [-Math.sin(th), 0, Math.cos(th)]; const dpl = G.dot(n, [cx, cy, hc]);
    const f = (q) => (trunc ? G.dot(n, q) - dpl : -1);
    const apex = pyr ? [cx, cy, Hh] : null;
    // seam at the left-most base corner (ties → front), then round via the front
    const ang = (i) => Math.atan2(solid.verts[i][1] - cy, solid.verts[i][0] - cx);
    let k0 = 0; for (let i = 1; i < N; i++) { const a = solid.verts[i], b = solid.verts[k0]; if (a[0] < b[0] - 1e-6 || (Math.abs(a[0] - b[0]) < 1e-6 && a[1] > b[1])) k0 = i; }
    const dirSign = (() => { const i1 = (k0 + 1) % N, i2 = (k0 - 1 + N) % N; return solid.verts[i2][1] >= solid.verts[i1][1] ? -1 : 1; })();
    void ang;
    const seq = []; for (let j = 0; j <= N; j++) seq.push(((k0 + dirSign * j) % N + N) % N);
    const Bv = seq.map((i) => solid.verts[i]);
    const P = curved ? Math.PI * p.d : N * p.a; // stretch-out length (true circle for curved solids)
    // base point at arc length s (true circle for curved)
    const phi0 = Math.atan2(Bv[0][1] - cy, Bv[0][0] - cx);
    const baseAt = (s) => {
      if (curved) { const a = phi0 + dirSign * (s / R); return [cx + R * Math.cos(a), cy + R * Math.sin(a), 0]; }
      const j = clamp(Math.floor(s / p.a), 0, N - 1); const u = (s - j * p.a) / p.a; return G.add(Bv[j], G.mul(G.sub(Bv[j + 1], Bv[j]), u));
    };
    const genEnds = (s) => { const B = baseAt(s); return pyr ? [apex, B] : [B, G.add(B, [0, 0, Hh])]; };
    // kept interval of the generator at s (λ: prism/cyl 0 = base → 1 = top; pyr/cone 0 = apex → 1 = base)
    const interval = (s) => {
      const [X0, X1] = genEnds(s); const f0 = f(X0), f1 = f(X1);
      if (f0 <= 0 && f1 <= 0) return [0, 1];
      if (f0 > 0 && f1 > 0) return pyr ? [1, 1] : [0, 0];
      const lc = f0 / (f0 - f1); return f0 > 0 ? [lc, 1] : [0, lc];
    };
    // development geometry
    let delta = 0, Theta = 0;
    if (p.obj === 'pyramid') { delta = 2 * Math.asin(clamp(p.a / (2 * Lsl), 0, 1)); Theta = N * delta; }
    if (p.obj === 'cone') Theta = (2 * Math.PI * R) / Lsl;
    const dir = (gam) => [Math.sin(gam), -Math.cos(gam)];
    const devBaseRel = (s) => { // relative to O (pyr/cone) or to the strip origin (prism/cyl)
      if (!pyr) return [s, 0];
      if (p.obj === 'cone') { const d2 = dir(-Theta / 2 + s / Lsl); return [Lsl * d2[0], Lsl * d2[1]]; }
      const j = clamp(Math.floor(s / p.a), 0, N - 1); const u = (s - j * p.a) / p.a;
      const W0 = dir(-Theta / 2 + j * delta), W1 = dir(-Theta / 2 + (j + 1) * delta);
      return [Lsl * (W0[0] + (W1[0] - W0[0]) * u), Lsl * (W0[1] + (W1[1] - W0[1]) * u)];
    };
    const devRel = (s, lam) => { if (!pyr) return [s, lam * Hh]; const b = devBaseRel(s); return [b[0] * lam, b[1] * lam]; };
    // sample s values (exact breakpoints for flat faces)
    const ss = [];
    if (curved) { for (let k = 0; k <= 360; k++) ss.push((P * k) / 360); }
    else {
      for (let j = 0; j < N; j++) {
        for (let k = 0; k <= 12; k++) ss.push(j * p.a + (p.a * k) / 12);
        if (trunc) { // where the plane crosses the base edge / top edge of this face
          const fb = (s) => f(baseAt(s)); const ft = (s) => f(pyr ? apex : G.add(baseAt(s), [0, 0, Hh]));
          [fb, ft].forEach((fn) => { const a = fn(j * p.a), b = fn((j + 1) * p.a); if ((a < 0 && b > 0) || (a > 0 && b < 0)) ss.push(j * p.a + (p.a * a) / (a - b)); });
        }
      }
      ss.sort((a, b) => a - b);
    }
    const nGen = curved ? 12 : N; const gens = []; for (let j = 0; j <= nGen; j++) gens.push((P * j) / nGen);
    // cut points on every edge/generator: 3-D point, λ, true distance
    const cuts = trunc ? gens.map((s, j) => {
      const [lo, hi] = interval(s); const [X0, X1] = genEnds(s); const glen = G.len(G.sub(X1, X0));
      const lam = pyr ? lo : hi; const onCut = pyr ? lo > 1e-9 && lo < 1 - 1e-9 : hi < 1 - 1e-9 && hi > 1e-9;
      return { j, s, lam, onCut, q: G.add(X0, G.mul(G.sub(X1, X0), lam)), tl: lam * glen, glen };
    }) : [];
    // FV/TV of the kept solid
    const plane = { n, d: dpl };
    const cl = trunc ? G.clip(solid, plane, 'below') : { solid, section: [] };
    const kept = cl.solid || solid;
    const views = { front: G.view(kept, 'front'), top: G.view(kept, 'top') };
    const full = { front: G.view(solid, 'front'), top: G.view(solid, 'top') };
    // development outline (kept region) in dev-relative coords
    const outline = (sMax, useTrunc) => {
      const up = [], dn = [];
      ss.filter((s) => s <= sMax + 1e-9).concat(sMax < P ? [sMax] : []).forEach((s) => {
        const I = useTrunc ? interval(s) : [0, 1];
        up.push(devRel(s, pyr ? I[0] : I[1])); dn.push(devRel(s, pyr ? I[1] : I[0]));
      });
      return up.concat(dn.reverse());
    };
    const devArea = G.polyArea2(outline(P, trunc));
    // 3-D faces (folded) for the unfolding animation
    const faces = [];
    for (let j = 0; j < N; j++) {
      const a = Bv[j], b = Bv[j + 1];
      const poly = pyr ? [a, b, apex] : [a, b, G.add(b, [0, 0, Hh]), G.add(a, [0, 0, Hh])];
      const ctr = G.centroid(poly); let nn = G.norm(G.cross(G.sub(poly[1], poly[0]), G.sub(poly[2], poly[0])));
      if (G.dot(nn, G.sub(ctr, [cx, cy, Hh / 3])) < 0) nn = G.mul(nn, -1);
      faces.push({ poly, keep: trunc ? clipPoly3(poly, f) : poly, drop: trunc ? clipPoly3(poly, (q) => -f(q)) : [], n: nn, hinge: pyr ? [apex, b] : [b, G.add(b, [0, 0, Hh])], left: pyr ? [apex, a] : [a, G.add(a, [0, 0, Hh])] });
    }
    const hinges = faces.slice(0, N - 1).map((F, j) => {
      const Q = F.hinge[0]; const e = G.norm(G.sub(F.hinge[1], F.hinge[0])); const n2 = faces[j + 1].n;
      const gam = Math.acos(clamp(G.dot(F.n, n2), -1, 1));
      const sgn = G.dot(rotAbout(G.add(Q, n2), Q, e, gam), F.n) - G.dot(Q, F.n) > G.dot(rotAbout(G.add(Q, n2), Q, e, -gam), F.n) - G.dot(Q, F.n) ? 1 : -1;
      return { Q, e, gam: gam * sgn };
    });
    return { solid, curved, trunc, pyr, N, R, Lsl, P, Theta, delta, n, plane, hc, interval, devRel, devBaseRel, outline, ss, gens, nGen, cuts, views, full, kept, faces, hinges, devArea, Bv, apex, cx, cy, Hh, seq, section: cl.section || [] };
  }
  /** Faces of the chain at unfolding progress u (face 0 fixed, last hinge opens first). */
  function unfold3(m, u) {
    const nh = m.hinges.length; const pj = m.hinges.map((_, j) => clamp(u * nh - (nh - 1 - j), 0, 1));
    return m.faces.map((F, k) => {
      const tr = (q) => { let r = q; for (let j = k - 1; j >= 0; j--) if (pj[j] > 0) r = rotAbout(r, m.hinges[j].Q, m.hinges[j].e, m.hinges[j].gam * pj[j]); return r; };
      return { k, keep: F.keep.map(tr), drop: F.drop.map(tr), poly: F.poly, left: F.left, hinge: F.hinge, n: F.n, map: tr };
    });
  }
  function layout3(m) {
    const b = G.bounds(m.solid); const x0 = b.min[0], x1 = b.max[0], ymax = b.max[1];
    const u0 = x1 + 34; let O;
    const bb = bbNew(); bbAdd(bb, [[x0, 0], [x1, m.Hh], [x0, -ymax], [x1, -ymax - 8]]);
    if (!m.pyr) { O = [u0, 0]; bbAdd(bb, [[u0 - 4, -14], [u0 + m.P + 6, m.Hh + 12]]); }
    else {
      const pts = []; for (let k = 0; k <= 60; k++) pts.push(m.devBaseRel((m.P * k) / 60)); pts.push([0, 0]);
      const minU = Math.min(...pts.map((q) => q[0])); O = [u0 - minU + 8, m.Hh];
      bbAdd(bb, pts.map((q) => [O[0] + q[0], O[1] + q[1]]), 22);
    }
    bbAdd(bb, [[x0 - 20, 0]]);
    const F = fitBox(bb, [384, 56, 566, 462], 4);
    const dev = (w) => F.M([O[0] + w[0], O[1] + w[1]]);
    return { F, O, dev, x0, x1, ymax, M: F.M, fv: (q) => F.M([q[0], q[2]]), tv: (q) => F.M([q[0], -q[1]]) };
  }
  const stepKeys3 = (p) => (p.mode === 'trunc' ? ['solid', 'cut', 'tl', 'unfold', 'mark', 'final'] : ['solid', 'divide', 'tl', 'unfold', 'final']);
  function cam3(view, m) {
    const fl = unfold3(m, 1); const pts = m.solid.verts.concat(...fl.map((F) => F.keep.length ? F.keep : F.poly));
    const lo = [0, 1, 2].map((k) => Math.min(...pts.map((q) => q[k]))), hi = [0, 1, 2].map((k) => Math.max(...pts.map((q) => q[k])));
    const size = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) + 20;
    return G.camera(view, 186, 286, 290 / size, [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2], size * 1.8);
  }

  S['eg-development'] = {
    view3d: true,
    initialView: { yaw: 0.5, pitch: 0.42, zoom: 1 },
    stepDuration: 5,
    modes: [{ key: 'full', label: 'Complete solid' }, { key: 'trunc', label: 'Truncated solid (cut by an AIP)' }],
    params: [
      { key: 'obj', label: 'Solid', type: 'select', options: SOLIDS, default: 'cylinder' },
      { key: 'n', label: 'Number of sides of the base', type: 'range', min: 3, max: 8, step: 1, default: 4, showIf: (p) => !isCurved(p.obj) },
      { key: 'a', label: 'Base edge a', type: 'range', min: 15, max: 45, step: 1, default: 30, unit: 'mm', showIf: (p) => !isCurved(p.obj) },
      { key: 'd', label: 'Base diameter D', type: 'range', min: 25, max: 70, step: 1, default: 40, unit: 'mm', showIf: (p) => isCurved(p.obj) },
      { key: 'h', label: 'Height (axis) h', type: 'range', min: 30, max: 90, step: 1, default: 60, unit: 'mm' },
      { key: 'theta', label: 'Cutting plane angle θ with the HP', type: 'range', min: 0, max: 70, step: 1, default: 30, unit: '°', showIf: (p) => p.mode === 'trunc' },
      { key: 'hc', label: 'Plane meets the axis at height', type: 'range', min: 5, max: 90, step: 1, default: 35, unit: 'mm', showIf: (p) => p.mode === 'trunc' },
    ],
    examples: [
      { label: 'Cylinder Ø40 × 60 — rectangle πD × H', values: { mode: 'full', obj: 'cylinder', d: 40, h: 60 } },
      { label: 'Cone Ø50 × 60 — sector θ = 360·r/L', values: { mode: 'full', obj: 'cone', d: 50, h: 60 } },
      { label: 'Square pyramid (a 30, h 60) cut by an AIP at 30°', values: { mode: 'trunc', obj: 'pyramid', n: 4, a: 30, h: 60, theta: 30, hc: 30 } },
      { label: 'Hexagonal prism (a 20, h 60) cut at 40° — truncated', values: { mode: 'trunc', obj: 'prism', n: 6, a: 20, h: 60, theta: 40, hc: 35 } },
    ],
    validate(p) {
      const w = [];
      if (p.mode === 'trunc' && p.hc >= p.h) w.push(`The plane meets the axis at ${p.hc} mm, at or above the top (h = ${p.h} mm) — it is limited to just below the top.`);
      const m = build3(p); if (p.mode === 'trunc' && m.devArea < 1) w.push('The cutting plane removes the whole lateral surface — lower θ or raise the plane.');
      return w;
    },
    compute(p) {
      const m = build3(p); const name = solidName(p);
      const formulas = [];
      if (p.obj === 'prism') {
        formulas.push({ name: 'Length of the stretch-out (perimeter)', formula: 'P = n × a', given: `n = ${p.n}, a = ${p.a} mm`, calc: `${p.n} × ${p.a}`, result: fmt(m.P, 4), unit: 'mm' });
        formulas.push({ name: 'Lateral surface area (complete)', formula: 'A = P × h', given: `P = ${fmt(m.P, 4)} mm, h = ${p.h} mm`, calc: `${fmt(m.P, 4)} × ${p.h}`, result: fmt(m.P * p.h, 5), unit: 'mm²' });
      } else if (p.obj === 'cylinder') {
        formulas.push({ name: 'Length of the stretch-out', formula: 'P = π D', given: `D = ${p.d} mm`, calc: `π × ${p.d}`, result: fmt(m.P, 4), unit: 'mm' });
        formulas.push({ name: 'Width of one division (12 generators)', formula: 'πD / 12', given: `πD = ${fmt(m.P, 4)} mm`, calc: `${fmt(m.P, 4)} / 12`, result: fmt(m.P / 12, 4), unit: 'mm' });
        formulas.push({ name: 'Lateral surface area (complete)', formula: 'A = π D H', given: `D = ${p.d} mm, H = ${p.h} mm`, calc: `π × ${p.d} × ${p.h}`, result: fmt(m.P * p.h, 5), unit: 'mm²' });
      } else if (p.obj === 'pyramid') {
        formulas.push({ name: 'Circum-radius of the base', formula: 'R = a / (2 sin(180°/n))', given: `a = ${p.a} mm, n = ${p.n}`, calc: `${p.a} / (2 sin ${fmt(180 / p.n, 4)}°)`, result: fmt(m.R, 4), unit: 'mm' });
        formulas.push({ name: 'True length of a slant edge (rotation method)', formula: 'L = √(h² + R²)', given: `h = ${p.h} mm, R = ${fmt(m.R, 4)} mm`, calc: `√(${p.h}² + ${fmt(m.R, 4)}²)`, result: fmt(m.Lsl, 4), unit: 'mm' });
        formulas.push({ name: 'Angle of the developed sector', formula: 'Θ = n × 2 sin⁻¹(a / 2L)', given: `n = ${p.n}, a = ${p.a} mm, L = ${fmt(m.Lsl, 4)} mm`, calc: `${p.n} × ${fmt(G.deg(m.delta), 4)}°`, result: fmt(G.deg(m.Theta), 4), unit: '°' });
        const sl = Math.sqrt(Math.max(0, m.Lsl * m.Lsl - p.a * p.a / 4));
        formulas.push({ name: 'Lateral surface area (complete)', formula: 'A = n × ½ a × √(L² − a²/4)', given: `slant height of a face = ${fmt(sl, 4)} mm`, calc: `${p.n} × 0.5 × ${p.a} × ${fmt(sl, 4)}`, result: fmt(p.n * 0.5 * p.a * sl, 5), unit: 'mm²' });
      } else {
        formulas.push({ name: 'Slant height (true length of a generator)', formula: 'L = √(h² + r²)', given: `h = ${p.h} mm, r = ${fmt(m.R, 4)} mm`, calc: `√(${p.h}² + ${fmt(m.R, 4)}²)`, result: fmt(m.Lsl, 4), unit: 'mm' });
        formulas.push({ name: 'Angle of the developed sector', formula: 'θ = 360° × r / L', given: `r = ${fmt(m.R, 4)} mm, L = ${fmt(m.Lsl, 4)} mm`, calc: `360 × ${fmt(m.R, 4)} / ${fmt(m.Lsl, 4)}`, result: fmt(G.deg(m.Theta), 4), unit: '°' });
        formulas.push({ name: 'Arc length of the sector', formula: 'arc = π D = θ L (θ in rad)', given: `D = ${p.d} mm`, calc: `π × ${p.d}`, result: fmt(m.P, 4), unit: 'mm' });
        formulas.push({ name: 'Lateral surface area (complete)', formula: 'A = π r L', given: `r = ${fmt(m.R, 4)} mm, L = ${fmt(m.Lsl, 4)} mm`, calc: `π × ${fmt(m.R, 4)} × ${fmt(m.Lsl, 4)}`, result: fmt(Math.PI * m.R * m.Lsl, 5), unit: 'mm²' });
      }
      if (m.trunc) {
        const lst = m.cuts.filter((c) => c.onCut).map((c) => `${(c.j % m.nGen) + 1}: ${fmt(c.tl, 3)}`).join(', ');
        formulas.push({ name: m.pyr ? 'True distances of the cut points from the apex' : 'Heights of the cut points on the edges/generators', formula: m.pyr ? 'd = λ × (true length of the edge/generator)' : 'z = h_c + (x − x_axis) tan θ', given: `plane θ = ${p.theta}°, meets the axis at ${fmt(m.hc, 3)} mm`, calc: lst || 'plane misses the lateral surface', result: `${m.cuts.filter((c) => c.onCut).length} points`, unit: 'mm' });
        formulas.push({ name: 'Area of the truncated development', formula: 'A = ½ |Σ (xᵢ yᵢ₊₁ − xᵢ₊₁ yᵢ)|', given: 'outline of the kept surface', calc: 'shoelace over the development outline', result: fmt(m.devArea, 5), unit: 'mm²' });
      }
      const readouts = [
        { label: 'Solid', value: name, tone: 'info' },
        m.pyr ? { label: 'Slant L', value: `${fmt(m.Lsl, 4)} mm` } : { label: 'Stretch-out', value: `${fmt(m.P, 4)} mm` },
        m.pyr ? { label: 'Sector angle', value: `${fmt(G.deg(m.Theta), 4)}°`, tone: 'good' } : { label: 'Height', value: `${p.h} mm`, tone: 'good' },
        { label: 'Developed area', value: `${fmt(m.devArea, 5)} mm²` },
      ];
      const shape = p.obj === 'prism' ? `rectangle ${fmt(m.P, 4)} × ${p.h} mm divided into ${p.n} faces` : p.obj === 'cylinder' ? `rectangle πD × H = ${fmt(m.P, 4)} × ${p.h} mm` : p.obj === 'pyramid' ? `${p.n} isosceles triangles in a sector of radius ${fmt(m.Lsl, 4)} mm, angle ${fmt(G.deg(m.Theta), 4)}°` : `sector of radius ${fmt(m.Lsl, 4)} mm, angle ${fmt(G.deg(m.Theta), 4)}°`;
      const state = {
        solid: name, dimensions: isCurved(p.obj) ? `Ø${p.d} mm × ${p.h} mm` : `base edge ${p.a} mm, height ${p.h} mm`, truncated: m.trunc ? `yes — AIP at ${p.theta}° to the HP meeting the axis ${fmt(m.hc, 3)} mm above the base` : 'no',
        development: shape, seam: `along ${isCurved(p.obj) ? 'generator' : 'edge'} 1 (left-most, first in the FV)`, developedArea: `${fmt(m.devArea, 5)} mm²`,
      };
      if (m.trunc) state.cutPoints = m.cuts.filter((c) => c.onCut).map((c) => `${(c.j % m.nGen) + 1}: ${fmt(c.tl, 3)} mm`).join(', ');
      return {
        formulas, readouts, state,
        explain: {
          what: `The lateral surface of the ${name}${m.trunc ? ` (cut by a plane at ${p.theta}°)` : ''} is unrolled onto a flat sheet: ${shape}.${m.trunc ? ' Each cut point is transferred with its true distance and joined by a smooth curve.' : ''}`,
          why: m.pyr ? 'Every line on a development must be a true length. The slant edges / generators of a pyramid or cone are inclined, so their true length is found by rotating them parallel to the VP (L = √(h² + R²)); all of them start at the apex, so the development is a sector.' : 'The edges / generators of an upright prism or cylinder are vertical and parallel to the VP, so the FV shows them in true length; the base unrolls into a straight line equal to the perimeter, so the development is a rectangle.',
          param: `Solid, base size, height${m.trunc ? `, cutting-plane angle θ = ${p.theta}° and its height ${fmt(m.hc, 3)} mm on the axis` : ''}.`,
          effect: m.pyr ? `A taller solid increases L and closes the sector (θ = 360·r/L gets smaller); a wider base opens it.${m.trunc ? ' A steeper cutting plane makes the cut curve rise more steeply around the development.' : ''}` : `A bigger base makes the strip longer (perimeter); a taller solid makes it higher.${m.trunc ? ' A steeper cutting plane gives a taller wave-shaped (sinusoidal for a cylinder) top edge.' : ''}`,
        },
      };
    },
    steps(p) {
      const m = build3(p); const keys = stepKeys3(p); const gn = m.curved ? 'generators' : 'edges';
      const T = {
        solid: { title: 'The solid and its projections', text: `FV and TV of the ${solidName(p)} standing on the HP.` },
        divide: { title: m.curved ? 'Divide the base into 12 parts' : 'Number the edges', text: m.curved ? 'Divide the base circle in the TV into 12 equal parts and draw the generators in the FV; generator 1 is the seam.' : `Number the ${m.N} lateral edges 1…${m.N} in the TV starting at the seam (left-most edge).` },
        cut: { title: 'Cutting plane and cut points', text: `Draw the VT at ${p.theta}° through the axis at ${fmt(m.hc, 3)} mm; number the ${gn} and mark where the VT cuts each of them.` },
        tl: { title: 'True lengths', text: m.pyr ? `Rotate an edge parallel to the VP: true length L = √(h² + R²) = ${fmt(m.Lsl, 4)} mm.${m.trunc ? ' Project each cut point horizontally onto the true-length line.' : ''}` : `The ${gn} are vertical — the FV shows their true length h = ${p.h} mm. The stretch-out equals the perimeter ${fmt(m.P, 4)} mm.` },
        unfold: { title: 'Unfold the lateral surface', text: m.pyr ? `The faces rotate out about the ${gn} one by one; the development is a sector of radius ${fmt(m.Lsl, 4)} mm and angle ${fmt(G.deg(m.Theta), 4)}°.` : `The faces roll out one by one onto a rectangle ${fmt(m.P, 4)} × ${p.h} mm.` },
        mark: { title: 'Locate the cut points and join them', text: m.pyr ? 'Mark each true distance from the apex on its line (arcs from O) and join the points with a smooth curve.' : 'Project each cut point horizontally from the FV to its line on the development and join them with a smooth curve.' },
        final: { title: 'Final development with dimensions', text: m.pyr ? `Radius L = ${fmt(m.Lsl, 4)} mm, sector angle ${fmt(G.deg(m.Theta), 4)}°${p.obj === 'cone' ? ` = 360 × r / L, arc = πD = ${fmt(m.P, 4)} mm` : ''}.` : `Stretch-out ${fmt(m.P, 4)} mm × height ${p.h} mm.` },
      };
      return keys.map((k) => T[k]);
    },
    draw(g, S2) {
      const { p, step, st, dur, t, view } = S2; const ep = D.ease(clamp(st / dur, 0, 1));
      const keys = stepKeys3(p); const key = keys[Math.min(step, keys.length - 1)]; const at = (k) => keys.indexOf(k) >= 0 && step >= keys.indexOf(k);
      const m = build3(p); const L = layout3(m); const M = L.M; const sc = L.F.s;
      D.clear(g, '#ffffff');
      // ── 3-D ──
      panel(g, '3-D model — unfolding');
      g.save(); g.beginPath(); g.rect(PANEL[0] + 2, 44, PANEL[2] - 4, PANEL[3] - 72); g.clip();
      const P3 = cam3(view, m);
      const u = key === 'unfold' ? ep : at('unfold') ? 1 : 0;
      const Pt = (q) => { const r = P3(q); return [r.x, r.y]; };
      // base outline (not developed) and ground
      D.poly(g, m.Bv.slice(0, m.N).map(Pt), { close: true, stroke: '#64748b', width: 1.2, dash: [5, 4], fill: 'rgba(187,247,208,0.35)' });
      const fl = unfold3(m, u);
      const light = G.norm([-0.4, 0.6, 0.8]);
      const faces = [];
      fl.forEach((F) => {
        if (F.keep.length >= 3) faces.push({ F, pts: F.keep, ghost: false });
        if (m.trunc && u === 0 && !at('unfold') && F.drop.length >= 3 && at('cut')) faces.push({ F, pts: F.drop, ghost: true });
      });
      faces.forEach((o) => { o.depth = o.pts.reduce((s, q) => s + P3(q).depth, 0) / o.pts.length; });
      faces.sort((a, b) => b.depth - a.depth).forEach((o) => {
        const sp = o.pts.map(Pt); const nn = G.norm(G.cross(G.sub(o.pts[1], o.pts[0]), G.sub(o.pts[2], o.pts[0])));
        const sh = 0.55 + 0.45 * Math.abs(G.dot(nn, light));
        let area = 0; for (let i = 0; i < sp.length; i++) { const a = sp[i], b = sp[(i + 1) % sp.length]; area += a[0] * b[1] - b[0] * a[1]; }
        const outer = (area > 0) === (G.dot(G.cross(G.sub(o.F.poly[1], o.F.poly[0]), G.sub(o.F.poly[2], o.F.poly[0])), o.F.n) > 0);
        const base = o.ghost ? '#e2e8f0' : outer ? '#93c5fd' : '#fde68a';
        D.poly(g, sp, { fill: D.shade(base, -(1 - sh) * 0.7), close: true, stroke: m.curved ? D.shade(base, -(1 - sh) * 0.7) : '#0f172a', width: m.curved ? 1 : 1.4, alpha: o.ghost ? 0.3 : 0.95 });
        if (m.curved && !o.ghost) {
          // outline (non-hinge) edges + every 4th generator
          const onLine = (q, l) => G.len(G.cross(G.sub(q, l[0]), G.norm(G.sub(l[1], l[0])))) < 1e-6;
          const orig = o.F.k === undefined ? o.pts : m.faces[o.F.k].keep;
          for (let i = 0; i < orig.length; i++) {
            const a = orig[i], b = orig[(i + 1) % orig.length];
            const hingeR = onLine(a, o.F.hinge) && onLine(b, o.F.hinge); const hingeL = onLine(a, o.F.left) && onLine(b, o.F.left);
            const gen = (hingeL && o.F.k % 4 === 0) || (hingeR && (o.F.k + 1) % 4 === 0);
            if ((!hingeR && !hingeL) || (hingeL && o.F.k === 0) || (hingeR && o.F.k === m.N - 1)) D.line(g, sp[i][0], sp[i][1], sp[(i + 1) % sp.length][0], sp[(i + 1) % sp.length][1], { color: C.ink, width: 1.8 });
            else if (gen) D.line(g, sp[i][0], sp[i][1], sp[(i + 1) % sp.length][0], sp[(i + 1) % sp.length][1], { color: '#334155', width: 1, alpha: 0.7 });
          }
        }
      });
      if (m.trunc && at('cut') && !at('unfold')) {
        const cam = P3; const { u: bu, v: bv } = G.basis(m.n); const c = [m.cx, m.cy, m.hc]; const r = Math.max(m.R * 1.6, m.Hh * 0.7);
        const quad = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([i, j]) => { const q = cam(G.add(c, G.add(G.mul(bu, r * i), G.mul(bv, r * j)))); return [q.x, q.y]; });
        D.poly(g, quad, { fill: '#fca5a5', close: true, stroke: RED, width: 1.4, alpha: key === 'cut' ? 0.25 * ep + 0.05 : 0.2 });
        m.cuts.filter((c2) => c2.onCut).forEach((c2) => { const q = cam(c2.q); D.circle(g, q.x, q.y, 3.6, { fill: SECT, stroke: '#fff', width: 1 }); });
      }
      if (key === 'unfold') D.tag(g, `unfolding… ${Math.round(u * 100)} %`, 186, 60, { bg: '#2563eb', size: 14, align: 'center' });
      g.restore();
      D.text(g, 'Blue: outer · yellow: inner surface', 186, 536, { size: 14, color: C.muted, align: 'center' });

      // ── Sheet: FV / TV ──
      D.text(g, 'Drawing sheet — projections and development', 380, 30, { size: 17, weight: 800 });
      const xyA = M([L.x0 - 16, 0]), xyB = M([L.x1 + 12, 0]); G.xyLine(g, xyA[0], xyB[0], xyA[1]);
      const fvM = (w) => M(w), tvM = (w) => M([w[0], -w[1]]);
      if (m.trunc && at('cut')) { G.drawView(g, m.full.front, fvM, { hidden: false, color: '#94a3b8' }); G.drawView(g, m.full.top, tvM, { hidden: false, color: '#94a3b8' }); }
      G.drawView(g, m.trunc && at('cut') ? m.views.front : m.full.front, fvM, { hidden: true });
      G.drawView(g, m.trunc && at('cut') ? m.views.top : m.full.top, tvM, { hidden: true });
      const fvTop = M([(L.x0 + L.x1) / 2, m.Hh]); D.tag(g, 'FV', fvTop[0], Math.max(58, fvTop[1] - 16), { bg: '#2563eb', size: 14, align: 'center' });
      const tvBot = M([(L.x0 + L.x1) / 2, -L.ymax]); D.tag(g, 'TV', tvBot[0], Math.min(546, tvBot[1] + 30), { bg: '#16a34a', size: 14, align: 'center' });
      // numbering in the TV + generators in the FV
      if (at('divide') || at('cut')) {
        m.gens.slice(0, m.nGen).forEach((s, j) => {
          const B = m.pyr ? m.interval && null : null; void B;
          const [X0, X1] = (() => { const b0 = m.devBaseRel; void b0; const bq = baseAtM(m, s); return m.pyr ? [m.apex, bq] : [bq, G.add(bq, [0, 0, m.Hh])]; })();
          const a = M([X0[0], X0[2]]), b = M([X1[0], X1[2]]); D.line(g, a[0], a[1], b[0], b[1], { color: '#64748b', width: 1, alpha: 0.8 });
          const bq = baseAtM(m, s); const c = tvM([m.cx, m.cy]); const q = tvM([bq[0], bq[1]]);
          if (m.curved) D.line(g, c[0], c[1], q[0], q[1], { color: '#64748b', width: 1, alpha: 0.7 });
          const dx = q[0] - c[0], dy = q[1] - c[1], l = Math.hypot(dx, dy) || 1;
          D.text(g, String(j + 1), q[0] + dx / l * 13, q[1] + dy / l * 13, { size: 14, weight: 800, color: '#1e3a8a', align: 'center', halo: true });
        });
      }
      if (m.trunc && at('cut')) {
        const b = G.bounds(m.solid); const tvx = (x) => [x, m.hc + Math.tan(G.rad(p.theta)) * (x - m.cx)];
        const A = M(tvx(b.min[0] - 8)), B = M(tvx(b.max[0] + 8));
        cuttingLine(g, A, key === 'cut' ? lerp2(A, B, ep) : B, {});
        D.tag(g, 'VT', B[0] + 18, B[1] - 12, { bg: RED, size: 14, align: 'center' });
        m.cuts.filter((c) => c.onCut).forEach((c) => { const q = M([c.q[0], c.q[2]]); D.circle(g, q[0], q[1], 3.4, { fill: SECT, stroke: '#fff', width: 1 }); });
        if (key === 'cut') { const r0 = M([L.x0, m.Hh]), r1 = M([L.x1, 0]); D.focus(g, r0[0] - 8, r0[1] - 8, r1[0] - r0[0] + 16, r1[1] - r0[1] + 16, t); }
      }
      // true length construction
      if (at('tl')) {
        if (m.pyr) {
          const A = M([m.cx, m.Hh]), B = M([m.cx + m.R, 0]);
          if (p.obj === 'pyramid') { const f0 = key === 'tl' ? ep : 1; partialSeg(g, A, B, f0, { color: '#7c3aed', width: 2.6 }); const cA = tvM([m.cx, m.cy]); const v0 = tvM([m.Bv[0][0], m.Bv[0][1]]); const rr = Math.hypot(v0[0] - cA[0], v0[1] - cA[1]); g.save(); g.beginPath(); g.arc(cA[0], cA[1], rr, Math.min(0, Math.atan2(v0[1] - cA[1], v0[0] - cA[0])), Math.max(0, Math.atan2(v0[1] - cA[1], v0[0] - cA[0]))); g.strokeStyle = '#7c3aed'; g.setLineDash([4, 4]); g.stroke(); g.restore(); D.line(g, cA[0] + rr, cA[1], B[0], B[1], G.LINE.projector); }
          else D.line(g, A[0], A[1], B[0], B[1], { color: '#7c3aed', width: 3 });
          D.tag(g, `TL = ${fmt(m.Lsl, 4)}`, B[0] + 6, B[1] + 16, { bg: '#7c3aed', size: 14, align: 'left' });
          if (m.trunc) m.cuts.filter((c) => c.onCut).forEach((c) => {
            const z = c.q[2]; const xTL = m.cx + m.R * (1 - z / m.Hh); const a = M([c.q[0], z]), b = M([xTL, z]);
            D.line(g, a[0], a[1], b[0], b[1], G.LINE.projector); D.circle(g, b[0], b[1], 3, { fill: '#7c3aed' });
          });
        } else {
          const A = M([L.x1 + 6, 0]), B = M([L.x1 + 6, m.Hh]);
          G.dim(g, M([L.x0, m.Hh]), M([L.x0, 0]), `h = ${p.h} (TL)`, { offset: 18, size: 14 }); void A; void B;
        }
        if (key === 'tl') { const r0 = M([L.x0, m.Hh]), r1 = M([L.x1, 0]); D.focus(g, r0[0] - 8, r0[1] - 8, r1[0] - r0[0] + 16, r1[1] - r0[1] + 16, t); }
      }
      // development
      if (at('unfold')) {
        const dv = (w) => L.dev(w);
        const sMax = key === 'unfold' ? m.P * ep : m.P;
        const full = m.outline(sMax, false).map(dv);
        const showCut = m.trunc && at('mark');
        D.poly(g, full, { fill: showCut ? 'rgba(226,232,240,0.5)' : 'rgba(191,219,254,0.55)', close: true, stroke: showCut ? '#94a3b8' : C.ink, width: showCut ? 1.4 : 2.6, dash: showCut ? [6, 4] : null });
        // fold lines / generators and numbers
        m.gens.forEach((s, j) => {
          if (s > sMax + 1e-9) return;
          const a = dv(m.devRel(s, 0)), b = dv(m.devRel(s, 1));
          if (j > 0 && j < m.nGen) D.line(g, a[0], a[1], b[0], b[1], { color: '#475569', width: 1, alpha: 0.85 });
          const base = dv(m.devRel(s, m.pyr ? 1 : 0)); const O2 = m.pyr ? dv([0, 0]) : null;
          const ox = m.pyr ? (base[0] - O2[0]) : 0, oy = m.pyr ? (base[1] - O2[1]) : 1; const l = Math.hypot(ox, oy) || 1;
          D.text(g, String((j % m.nGen) + 1), base[0] + ox / l * 13, base[1] + oy / l * 13, { size: 14, weight: 800, color: '#1e3a8a', align: 'center', halo: true });
        });
        if (showCut) {
          const f0 = key === 'mark' ? ep : 1;
          const kept = m.outline(m.P, true).map(dv);
          if (f0 >= 1) D.poly(g, kept, { fill: 'rgba(191,219,254,0.7)', close: true, stroke: C.ink, width: 2.6 });
          // cut curve
          const curve = m.ss.filter((s) => s <= m.P * f0 + 1e-9).map((s) => { const I = m.interval(s); return dv(m.devRel(s, m.pyr ? I[0] : I[1])); });
          D.poly(g, curve, { stroke: SECT, width: 3 });
          m.cuts.filter((c) => c.onCut && c.s <= m.P * f0 + 1e-9).forEach((c) => {
            const q = dv(m.devRel(c.s, c.lam));
            if (!m.pyr) { const fq = M([c.q[0], c.q[2]]); D.line(g, fq[0], fq[1], q[0], q[1], G.LINE.projector); }
            else { const O2 = dv([0, 0]); const r = Math.hypot(q[0] - O2[0], q[1] - O2[1]); const a0 = Math.atan2(q[1] - O2[1], q[0] - O2[0]); g.save(); g.beginPath(); g.arc(O2[0], O2[1], r, a0 - 0.12, a0 + 0.12); g.strokeStyle = '#7c3aed'; g.lineWidth = 1.2; g.stroke(); g.restore(); }
            D.circle(g, q[0], q[1], 3.6, { fill: SECT, stroke: '#fff', width: 1 });
          });
        }
        if (m.pyr) { const O2 = dv([0, 0]); D.circle(g, O2[0], O2[1], 3.5, { fill: C.ink }); D.text(g, 'O', O2[0] - 12, O2[1] - 10, { size: 15, weight: 800, align: 'center', halo: true }); const ap = M([m.cx, m.Hh]); if (at('tl')) D.line(g, ap[0], ap[1], O2[0], O2[1], { ...G.LINE.projector, alpha: 0.5 }); }
        const bbx = full.reduce((b, q) => [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[0]), Math.max(b[3], q[1])], [1e9, 1e9, -1e9, -1e9]);
        D.tag(g, 'DEVELOPMENT', (bbx[0] + bbx[2]) / 2, m.pyr ? clamp(bbx[3] + 30, 58, 530) : clamp(bbx[1] - 16, 58, 540), { bg: '#1e3a8a', size: 14, align: 'center' });
        if (key === 'unfold' || key === 'mark') D.focus(g, bbx[0] - 6, bbx[1] - 6, bbx[2] - bbx[0] + 12, bbx[3] - bbx[1] + 12, t);
      }
      // dimensions
      if (at('final')) {
        const dv = (w) => L.dev(w);
        if (!m.pyr) {
          G.dim(g, dv([0, 0]), dv([m.P, 0]), `${p.obj === 'prism' ? `${p.n} × ${p.a} = ` : 'πD = '}${fmt(m.P, 4)}`, { offset: 34, size: 15 });
          G.dim(g, dv([m.P, 0]), dv([m.P, m.Hh]), `${p.h}`, { offset: 26, size: 15 });
          if (p.obj === 'prism') G.dim(g, dv([0, m.Hh]), dv([p.a, m.Hh]), `${p.a}`, { offset: -20, size: 14 });
        } else {
          const O2 = dv([0, 0]); const W0 = dv(m.devBaseRel(0)); const W1 = dv(m.devBaseRel(m.P));
          G.dim(g, W0, O2, `L = ${fmt(m.Lsl, 4)}`, { offset: -24, size: 15 });
          const a0 = Math.atan2(W0[1] - O2[1], W0[0] - O2[0]), a1 = Math.atan2(W1[1] - O2[1], W1[0] - O2[0]); const r = 34;
          g.save(); g.beginPath(); g.arc(O2[0], O2[1], r, a0, a1, true); g.strokeStyle = '#7c3aed'; g.lineWidth = 2; g.stroke(); g.restore();
          const fullB = m.outline(m.P, false).map(dv); const topY = Math.min(...fullB.map((q) => q[1]));
          D.tag(g, `${p.obj === 'cone' ? 'θ = 360·r/L = ' : 'Θ = '}${fmt(G.deg(m.Theta), 4)}°`, O2[0], m.Theta < 3.4 ? O2[1] - 30 : O2[1] + 52, { bg: '#7c3aed', size: 14, align: 'center' });
          if (p.obj === 'pyramid') { const V1 = dv(m.devBaseRel(p.a)); G.dim(g, W0, V1, `${p.a}`, { offset: 20, size: 14 }); }
          
        }
        D.text(g, `${p.obj === 'cone' ? `arc = πD = ${fmt(m.P, 4)} mm · ` : ''}Developed area = ${fmt(m.devArea, 5)} mm²`, 986, 548, { size: 15, weight: 800, color: '#1e3a8a', align: 'right', halo: true });
      }
    },
  };
  function baseAtM(m, s) { // base point at arc length s along the seam order (true circle for curved solids)
    if (m.curved) { const phi0 = Math.atan2(m.Bv[0][1] - m.cy, m.Bv[0][0] - m.cx); const dirS = (() => { const b1 = m.Bv[1]; const a1 = Math.atan2(b1[1] - m.cy, b1[0] - m.cx); let d = a1 - phi0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.sign(d) || 1; })(); const a = phi0 + dirS * (s / m.R); return [m.cx + m.R * Math.cos(a), m.cy + m.R * Math.sin(a), 0]; }
    const a = m.P / m.N; const j = clamp(Math.floor(s / a), 0, m.N - 1); const u = (s - j * a) / a; return G.add(m.Bv[j], G.mul(G.sub(m.Bv[j + 1], m.Bv[j]), u));
  }
})();
