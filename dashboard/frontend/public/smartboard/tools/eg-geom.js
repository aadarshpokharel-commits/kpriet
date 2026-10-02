'use strict';

/*
 * Engineering Graphics geometry kernel (U25MEG03) — shared by every EG simulation.
 *
 * Model coordinates (millimetres), first-angle projection:
 *   x → along the XY (reference) line, to the right
 *   y → distance IN FRONT of the VP (towards the observer of the front view)
 *   z → height ABOVE the HP
 *
 * Views (first angle):  FV on VP = (x, z)  drawn above XY;  TV on HP = (x, y) drawn below XY;
 * LSV on the profile plane = (y, z) drawn to the right of the FV (front of the object away from the FV).
 *
 * Solids are convex polyhedra {verts, faces, smooth[], kind}. Curved solids (cylinder, cone) are
 * approximated by many facets flagged `smooth`, so views show only their outlines/silhouettes.
 */
(function () {
  const D = window.EPDraw;
  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const centroid = (pts) => mul(pts.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / Math.max(1, pts.length));

  // ─── Solids ───
  /** Circumradius of a regular n-gon with side a. */
  const circumR = (n, a) => a / (2 * Math.sin(Math.PI / n));
  const SEG = 48;

  /**
   * spec: {type:'prism'|'pyramid'|'cylinder'|'cone'|'cube'|'cuboid', n (sides), a (base edge), d (diameter), h (height), l, w}
   * Built with the axis along +z, base on z = 0, centred on the axis. Base polygon starts with an EDGE parallel
   * to x (phase so one base edge is parallel to VP — the usual textbook starting position).
   */
  function solid(spec) {
    const t = spec.type;
    if (t === 'cube') return solid({ type: 'cuboid', l: spec.a, w: spec.a, h: spec.a });
    if (t === 'cuboid') {
      const l = spec.l, w = spec.w, h = spec.h;
      const base = [[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]];
      return extrude(base, h, false, 'cuboid');
    }
    const curved = t === 'cylinder' || t === 'cone';
    const n = curved ? SEG : Math.max(3, Math.round(spec.n || 4));
    const R = curved ? spec.d / 2 : circumR(n, spec.a);
    const phase = curved ? 0 : -Math.PI / 2 - Math.PI / n; // first edge parallel to x, nearest the VP… (at −y)
    const base = [];
    for (let i = 0; i < n; i++) { const a = phase + (2 * Math.PI * i) / n; base.push([R * Math.cos(a), R * Math.sin(a)]); }
    if (t === 'prism' || t === 'cylinder') return extrude(base, spec.h, curved, t);
    // pyramid / cone
    const verts = base.map(([x, y]) => [x, y, 0]).concat([[0, 0, spec.h]]);
    const apex = n; const faces = []; const smooth = [];
    faces.push(base.map((_, i) => n - 1 - i)); smooth.push(false); // base
    for (let i = 0; i < n; i++) { faces.push([i, (i + 1) % n, apex]); smooth.push(curved); }
    return finish({ verts, faces, smooth, kind: t, apex, baseCount: n, R, axis: [[0, 0, 0], [0, 0, spec.h]] });
  }
  function extrude(base, h, curved, kind) {
    const n = base.length;
    const verts = base.map(([x, y]) => [x, y, 0]).concat(base.map(([x, y]) => [x, y, h]));
    const faces = []; const smooth = [];
    faces.push(base.map((_, i) => n - 1 - i)); smooth.push(false);
    faces.push(base.map((_, i) => n + i)); smooth.push(false);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; faces.push([i, j, n + j, n + i]); smooth.push(curved); }
    const R = Math.max(...base.map(([x, y]) => Math.hypot(x, y)));
    return finish({ verts, faces, smooth, kind, baseCount: n, R, axis: [[0, 0, 0], [0, 0, h]] });
  }
  /** Computes edges (with their two faces) and outward normals. */
  function finish(S) {
    const c = centroid(S.verts);
    S.normals = S.faces.map((f) => {
      const p0 = S.verts[f[0]]; let nrm = [0, 0, 0];
      for (let i = 1; i + 1 < f.length; i++) nrm = add(nrm, cross(sub(S.verts[f[i]], p0), sub(S.verts[f[i + 1]], p0)));
      nrm = norm(nrm);
      if (dot(nrm, sub(centroid(f.map((k) => S.verts[k])), c)) < 0) nrm = mul(nrm, -1);
      return nrm;
    });
    const map = new Map();
    S.faces.forEach((f, fi) => f.forEach((a, k) => {
      const b = f[(k + 1) % f.length]; const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!map.has(key)) map.set(key, { a: Math.min(a, b), b: Math.max(a, b), faces: [] });
      map.get(key).faces.push(fi);
    }));
    S.edges = [...map.values()];
    S.center = c;
    return S;
  }

  // ─── Transformations ───
  function rotX(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
  function rotY(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
  function rotZ(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; }
  function mapSolid(S, fn) {
    const T = { ...S, verts: S.verts.map(fn), axis: S.axis ? S.axis.map(fn) : null };
    return finish(T);
  }
  /**
   * Places a solid in the first quadrant.
   * o = {spin (° about own axis), tiltHP (° axis makes with the HP… 90 = axis vertical), rotVP (° the TV of the axis makes with XY),
   *      rx, ry, rz (free extra rotations in °, applied last), front (mm in front of VP), above (mm above HP), x (mm along XY)}
   * tiltHP: the axis is rotated about the y axis (a line ⟂ VP), so the FV shows the true inclination.
   */
  function place(S, o) {
    o = o || {};
    const spin = rad(o.spin || 0); const tilt = rad(90 - (o.tiltHP == null ? 90 : o.tiltHP)); const rv = rad(o.rotVP || 0);
    let T = mapSolid(S, (p) => rotZ(p, spin));
    T = mapSolid(T, (p) => rotY(p, tilt));
    T = mapSolid(T, (p) => rotZ(p, rv));
    if (o.rx || o.ry || o.rz) T = mapSolid(T, (p) => rotZ(rotY(rotX(p, rad(o.rx || 0)), rad(o.ry || 0)), rad(o.rz || 0)));
    const minZ = Math.min(...T.verts.map((p) => p[2])); const minY = Math.min(...T.verts.map((p) => p[1]));
    const minX = Math.min(...T.verts.map((p) => p[0]));
    const dx = (o.x == null ? 0 : o.x - minX); const dy = (o.front == null ? 10 : o.front) - minY; const dz = (o.above == null ? 0 : o.above) - minZ;
    return mapSolid(T, (p) => [p[0] + dx, p[1] + dy, p[2] + dz]);
  }
  function bounds(S) {
    const b = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    S.verts.forEach((p) => { for (let i = 0; i < 3; i++) { b.min[i] = Math.min(b.min[i], p[i]); b.max[i] = Math.max(b.max[i], p[i]); } });
    return b;
  }

  // ─── Views ───
  /** View definitions: 2-D map + direction TOWARDS the observer (used for visibility). */
  const VIEWS = {
    front: { name: 'Front view (FV)', plane: 'VP', to2d: (p) => [p[0], p[2]], eye: [0, 1, 0], depth: (p) => p[1] },
    top: { name: 'Top view (TV)', plane: 'HP', to2d: (p) => [p[0], p[1]], eye: [0, 0, 1], depth: (p) => p[2] },
    side: { name: 'Left side view (LSV)', plane: 'PP', to2d: (p) => [p[1], p[2]], eye: [-1, 0, 0], depth: (p) => -p[0] },
  };
  /**
   * Orthographic view of a convex solid: returns {visible:[[p2a,p2b]], hidden:[[...]], silhouette, axis} in view 2-D coords.
   * Edges between two smooth (curved) facets are dropped unless they are on the outline.
   */
  function view(S, key) {
    const V = VIEWS[key]; const eps = 1e-7;
    const facing = S.normals.map((n) => dot(n, V.eye) > eps);
    const onEdge = S.normals.map((n) => Math.abs(dot(n, V.eye)) <= eps);
    const visible = []; const hidden = [];
    S.edges.forEach((e) => {
      const [f1, f2] = e.faces; const v1 = facing[f1] || onEdge[f1]; const v2 = f2 == null ? v1 : facing[f2] || onEdge[f2];
      const bothSmooth = S.smooth[f1] && f2 != null && S.smooth[f2];
      const seg = [V.to2d(S.verts[e.a]), V.to2d(S.verts[e.b])];
      if (Math.hypot(seg[0][0] - seg[1][0], seg[0][1] - seg[1][1]) < 1e-6) return;
      if (bothSmooth) {
        // keep only outline generators (one facet towards, the other away from the observer)
        if (facing[f1] !== facing[f2] && !(onEdge[f1] && onEdge[f2])) visible.push(seg);
        return;
      }
      if (v1 || v2) visible.push(seg); else hidden.push(seg);
    });
    // hidden segments that lie on a visible one are not drawn twice
    const hid = hidden.filter((h) => !visible.some((v) => collinearOverlap(v, h)));
    return { visible, hidden: hid, axis: S.axis ? S.axis.map(V.to2d) : null, key, name: V.name };
  }
  function collinearOverlap(a, b) {
    const d = [a[1][0] - a[0][0], a[1][1] - a[0][1]]; const L = Math.hypot(d[0], d[1]); if (L < 1e-9) return false;
    const off = (p) => Math.abs((p[0] - a[0][0]) * d[1] - (p[1] - a[0][1]) * d[0]) / L;
    if (off(b[0]) > 0.05 || off(b[1]) > 0.05) return false;
    const tt = (p) => ((p[0] - a[0][0]) * d[0] + (p[1] - a[0][1]) * d[1]) / (L * L);
    const t0 = tt(b[0]), t1 = tt(b[1]);
    return Math.min(t0, t1) >= -0.01 && Math.max(t0, t1) <= 1.01;
  }

  // ─── Sections ───
  /** Plane {n:[..], d}: points with n·p = d. keep: 'below' keeps n·p ≤ d. */
  function planeFrom(pointOnPlane, normal) { const n = norm(normal); return { n, d: dot(n, pointOnPlane) }; }
  /**
   * Clips a convex solid by a plane. Returns {solid (the kept part, with the cut face flagged in `cut`),
   * section: [3-D points of the section polygon in order]} — section is [] when the plane misses the solid.
   */
  function clip(S, plane, keep) {
    const sgn = keep === 'above' ? -1 : 1; const n = mul(plane.n, sgn); const d = plane.d * sgn;
    const side = (p) => dot(n, p) - d; // ≤ 0 keep
    const newVerts = []; const idx = (p) => {
      for (let i = 0; i < newVerts.length; i++) if (len(sub(newVerts[i], p)) < 1e-6) return i;
      newVerts.push(p); return newVerts.length - 1;
    };
    const faces = []; const smooth = []; const cutPts = [];
    S.faces.forEach((f, fi) => {
      const poly = f.map((k) => S.verts[k]); const out = [];
      for (let i = 0; i < poly.length; i++) {
        const A = poly[i], B = poly[(i + 1) % poly.length]; const sa = side(A), sb = side(B);
        if (sa <= 1e-9) out.push(A);
        if ((sa < -1e-9 && sb > 1e-9) || (sa > 1e-9 && sb < -1e-9)) {
          const t = sa / (sa - sb); const P = add(A, mul(sub(B, A), t)); out.push(P); cutPts.push(P);
        } else if (Math.abs(sa) <= 1e-9) cutPts.push(A);
      }
      if (out.length >= 3) { faces.push(out.map(idx)); smooth.push(S.smooth[fi]); }
    });
    const section = orderPlanar(dedupe(cutPts), plane.n);
    let cutIndex = -1;
    if (section.length >= 3) { faces.push(section.map(idx)); smooth.push(false); cutIndex = faces.length - 1; }
    if (!faces.length) return { solid: null, section: [] };
    const T = finish({ verts: newVerts, faces, smooth, kind: S.kind, axis: S.axis });
    T.cut = cutIndex;
    return { solid: T, section: section.length >= 3 ? section : [] };
  }
  function dedupe(pts) { const out = []; pts.forEach((p) => { if (!out.some((q) => len(sub(p, q)) < 1e-6)) out.push(p); }); return out; }
  /** Orders coplanar points around their centroid (for convex polygons). */
  function orderPlanar(pts, n) {
    if (pts.length < 3) return pts;
    const c = centroid(pts); const { u, v } = basis(n);
    return pts.map((p) => ({ p, a: Math.atan2(dot(sub(p, c), v), dot(sub(p, c), u)) })).sort((a, b) => a.a - b.a).map((o) => o.p);
  }
  /** Orthonormal basis (u, v) of a plane with normal n; u is horizontal when possible (true-shape convention). */
  function basis(n) {
    n = norm(n);
    let u = cross([0, 0, 1], n); if (len(u) < 1e-6) u = [1, 0, 0]; u = norm(u);
    const v = norm(cross(n, u));
    return { u, v, n };
  }
  /** True shape of a planar polygon: 2-D coordinates in the plane (mm). */
  function trueShape(poly, n) {
    if (!poly.length) return [];
    const { u, v } = basis(n); const c = poly[0];
    return poly.map((p) => [dot(sub(p, c), u), dot(sub(p, c), v)]);
  }
  function polyArea2(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; }

  // ─── Drawing helpers (BIS SP 46 line conventions) ───
  const INK = '#0f172a'; const CONS = '#64748b';
  const LINE = {
    visible: { color: INK, width: 2.6 },               // continuous thick — visible outlines
    hidden: { color: INK, width: 1.6, dash: [8, 5] },   // dashed thin — hidden edges
    centre: { color: '#b91c1c', width: 1.3, dash: [18, 4, 3, 4] }, // chain thin — axes / centre lines
    construction: { color: CONS, width: 1.1, alpha: 0.75 },        // continuous thin — construction & projectors
    projector: { color: '#2563eb', width: 1.1, dash: [3, 4], alpha: 0.85 },
    cutting: { color: '#b91c1c', width: 2.2, dash: [20, 5, 4, 5] }, // chain thick at ends — cutting plane
    dim: { color: '#1d4ed8', width: 1.2 },
  };
  function seg(g, a, b, style) { D.line(g, a[0], a[1], b[0], b[1], style); }
  /** Draws a view (from `view()`) mapped to the screen by `M(p2)`. */
  function drawView(g, V, M, o = {}) {
    if (o.hidden !== false) V.hidden.forEach(([a, b]) => seg(g, M(a), M(b), LINE.hidden));
    V.visible.forEach(([a, b]) => seg(g, M(a), M(b), o.color ? { ...LINE.visible, color: o.color } : LINE.visible));
    if (o.axis !== false && V.axis) {
      const [a, b] = V.axis.map(M); const dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy);
      if (L > 2) { const ex = (dx / L) * 12, ey = (dy / L) * 12; seg(g, [a[0] - ex, a[1] - ey], [b[0] + ex, b[1] + ey], LINE.centre); }
    }
  }
  /** 45° section lining (hatching) of a 2-D polygon (screen coordinates), BIS spacing ~3 mm scaled. */
  function hatch(g, pts, o = {}) {
    if (!pts || pts.length < 3) return;
    g.save(); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => g.lineTo(p[0], p[1])); g.closePath();
    if (o.fill) { g.fillStyle = o.fill; g.fill(); }
    g.clip(o.rule || 'nonzero');
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const sp = o.spacing || 9; const ang = rad(o.angle == null ? 45 : o.angle);
    const dx = Math.cos(ang), dy = -Math.sin(ang); const L = Math.hypot(x1 - x0, y1 - y0) + 20;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; const nx = -dy, ny = dx;
    g.strokeStyle = o.color || INK; g.lineWidth = o.width || 1.1;
    for (let k = -L; k <= L; k += sp) { g.beginPath(); g.moveTo(cx + nx * k - dx * L, cy + ny * k - dy * L); g.lineTo(cx + nx * k + dx * L, cy + ny * k + dy * L); g.stroke(); }
    g.restore();
    D.poly(g, pts, { close: true, stroke: o.outline || INK, width: o.outlineWidth || 2.4 });
  }
  /** Dimension (aligned, BIS): extension lines + dimension line with arrowheads + text above the line. */
  function dim(g, a, b, text, o = {}) {
    const off = o.offset == null ? 30 : o.offset; const col = o.color || LINE.dim.color;
    const dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1; const nx = -dy / L, ny = dx / L;
    const A = [a[0] + nx * off, a[1] + ny * off], B = [b[0] + nx * off, b[1] + ny * off];
    const gap = 4, over = 6; const s = Math.sign(off) || 1;
    D.line(g, a[0] + nx * gap * s, a[1] + ny * gap * s, A[0] + nx * over * s, A[1] + ny * over * s, { color: col, width: 1 });
    D.line(g, b[0] + nx * gap * s, b[1] + ny * gap * s, B[0] + nx * over * s, B[1] + ny * over * s, { color: col, width: 1 });
    D.arrow(g, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2, A[0], A[1], { color: col, width: 1.2, head: 11 });
    D.arrow(g, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2, B[0], B[1], { color: col, width: 1.2, head: 11 });
    let ang = Math.atan2(dy, dx); if (ang > Math.PI / 2 + 1e-6 || ang < -Math.PI / 2 - 1e-6) ang += Math.PI;
    const tx = (A[0] + B[0]) / 2 + nx * 11 * s, ty = (A[1] + B[1]) / 2 + ny * 11 * s;
    D.text(g, text, tx, ty, { size: o.size || 16, color: col, align: 'center', weight: 700, rotate: Math.abs(ang) > 1e-3 ? ang : 0, halo: true });
  }
  /** XY reference line with labels. */
  function xyLine(g, x0, x1, y, o = {}) {
    D.line(g, x0, y, x1, y, { color: INK, width: 1.8 });
    D.text(g, o.left || 'X', x0 - 6, y, { size: 17, weight: 800, align: 'right' });
    D.text(g, o.right || 'Y', x1 + 6, y, { size: 17, weight: 800 });
  }
  /** Auto scale: fits a set of 2-D model boxes into a screen rectangle. */
  function fitScale(wMM, hMM, wPx, hPx, max) { return Math.min(max || 6, wPx / Math.max(1, wMM), hPx / Math.max(1, hMM)); }

  // ─── 3-D scene helpers ───
  /**
   * Projector for model coords (x, y front, z up) using the engine's view (yaw/pitch/zoom/pan).
   * pxPerMM sets the size; `center` (model point) is kept at (cx, cy); `unit` (mm) normalises depth for perspective.
   */
  function camera(view, cx, cy, pxPerMM, center, unit) {
    const u = unit || 80; const c = center || [0, 0, 0];
    const P = D.projector({ yaw: view.yaw, pitch: view.pitch, zoom: view.zoom }, cx + (view.panX || 0), cy + (view.panY || 0), pxPerMM * u);
    return (p) => P([(p[0] - c[0]) / u, -(p[1] - c[1]) / u, (p[2] - c[2]) / u]);
  }
  /** Shaded 3-D solid (painter's order), edges on top; hidden edges dashed faintly. */
  function drawSolid3(g, S, P, o = {}) {
    const fillCol = o.fill || '#93c5fd'; const faces = S.faces.map((f, i) => {
      const pts = f.map((k) => P(S.verts[k])); const c = centroid(f.map((k) => S.verts[k]));
      const toward = P(add(c, mul(S.normals[i], 0.5))).depth < P(c).depth;
      return { i, pts, depth: pts.reduce((s, q) => s + q.depth, 0) / pts.length, toward };
    });
    const light = norm([-0.4, 0.6, 0.8]);
    faces.filter((f) => !f.toward && o.showHidden !== false).forEach(() => {});
    S.edges.forEach((e) => {
      const hiddenEdge = e.faces.every((fi) => !faces[fi].toward);
      if (!hiddenEdge || o.showHidden === false) return;
      if (e.faces.length === 2 && S.smooth[e.faces[0]] && S.smooth[e.faces[1]]) return;
      const a = P(S.verts[e.a]), b = P(S.verts[e.b]); D.line(g, a.x, a.y, b.x, b.y, { color: '#475569', width: 1.2, dash: [6, 5], alpha: 0.7 });
    });
    faces.filter((f) => f.toward).sort((a, b) => b.depth - a.depth).forEach((f) => {
      const shade = 0.55 + 0.45 * Math.max(0, dot(S.normals[f.i], light));
      const col = S.cut === f.i ? (o.cutFill || '#fca5a5') : D.shade(fillCol, -(1 - shade) * 0.8);
      D.poly(g, f.pts.map((q) => [q.x, q.y]), { fill: col, close: true, stroke: false, alpha: o.alpha == null ? 0.92 : o.alpha });
      if (S.cut === f.i && o.hatchCut !== false) hatch(g, f.pts.map((q) => [q.x, q.y]), { spacing: 8, width: 1, outlineWidth: 2 });
    });
    S.edges.forEach((e) => {
      const vis = e.faces.some((fi) => faces[fi].toward); if (!vis) return;
      if (e.faces.length === 2 && S.smooth[e.faces[0]] && S.smooth[e.faces[1]] && faces[e.faces[0]].toward === faces[e.faces[1]].toward) return;
      const a = P(S.verts[e.a]), b = P(S.verts[e.b]); D.line(g, a.x, a.y, b.x, b.y, { color: o.edge || INK, width: o.edgeWidth || 2 });
    });
  }
  /** Semi-transparent reference planes VP (x–z at y = 0), HP (x–y at z = 0), PP (y–z at x = px). */
  function drawPlanes3(g, P, box, o = {}) {
    const [x0, x1] = box.x, [y0, y1] = box.y, [z0, z1] = box.z;
    const quad = (pts, fill, label, lp) => { D.poly(g, pts.map((p) => { const q = P(p); return [q.x, q.y]; }), { fill, close: true, stroke: '#64748b', width: 1, alpha: 0.35 }); if (label) { const q = P(lp); D.tag(g, label, q.x, q.y, { bg: '#334155', size: 14, align: 'center' }); } };
    if (o.hp !== false) quad([[x0, 0, 0], [x1, 0, 0], [x1, y1, 0], [x0, y1, 0]], '#bbf7d0', 'HP', [x0 + 18, y1 - 6, 0]);
    if (o.vp !== false) quad([[x0, 0, 0], [x1, 0, 0], [x1, 0, z1], [x0, 0, z1]], '#bfdbfe', 'VP', [x0 + 18, 0, z1 - 8]);
    if (o.pp && o.px != null) quad([[o.px, 0, 0], [o.px, y1, 0], [o.px, y1, z1], [o.px, 0, z1]], '#fde68a', 'PP', [o.px, y1 - 10, z1 - 8]);
    const a = P([x0, 0, 0]), b = P([x1, 0, 0]); D.line(g, a.x, a.y, b.x, b.y, { color: INK, width: 2 });
    D.text(g, 'X', a.x - 8, a.y, { size: 16, weight: 800, align: 'right', halo: true }); D.text(g, 'Y', b.x + 8, b.y, { size: 16, weight: 800, halo: true });
  }

  window.EGGeom = {
    rad, deg, add, sub, mul, dot, cross, len, norm, centroid, circumR,
    solid, place, bounds, mapSolid, rotX, rotY, rotZ, VIEWS, view, planeFrom, clip, basis, trueShape, orderPlanar, polyArea2,
    LINE, seg, drawView, hatch, dim, xyLine, fitScale, camera, drawSolid3, drawPlanes3,
  };
})();
