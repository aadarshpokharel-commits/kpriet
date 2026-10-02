'use strict';

/*
 * Engineering Graphics — Unit 5 pictorial projections:
 *   eg-isometric   — isometric drawing / projection of machine blocks (2-D → 3-D, 3-D → 2-D, free orbit)
 *   eg-perspective — perspective projection by the visual-ray method and the vanishing-point method
 *
 * Isometric model coordinates (mm): x = length (to the right in the FV), y = in front of the VP
 * (towards the observer of the FV), z = height. Blocks occupy [0,L]×[0,W]×[0,H] minus axis-aligned cut boxes.
 * Hidden-line removal is exact ray casting against the (non-convex) solid, refined by bisection.
 */
(function () {
  const S = (window.EGSims = window.EGSims || {});
  const D = window.EPDraw; const G = window.EGGeom;
  const { C, fmt, clamp } = D;
  const rad = G.rad; const deg = G.deg;
  const INK = '#0f172a'; const DIM = '#1d4ed8';
  const K_ISO = Math.sqrt(2 / 3);             // isometric scale factor cos45°/cos30°
  const ISO_PITCH = Math.atan(1 / Math.SQRT2); // 35.264°
  const C30 = Math.cos(Math.PI / 6);
  const lerp3 = (a, b, s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
  const lerp2 = (a, b, s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
  const R = Math.round;

  // ─────────────────────────── shared small drawing helpers ───────────────────────────
  function dimArrows(g, A, B, col) {
    const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    D.arrow(g, M[0], M[1], A[0], A[1], { color: col, width: 1.3, head: 10 });
    D.arrow(g, M[0], M[1], B[0], B[1], { color: col, width: 1.3, head: 10 });
  }
  function readableAngle(a) { if (a > Math.PI / 2 + 1e-6) a -= Math.PI; if (a < -Math.PI / 2 - 1e-6) a += Math.PI; return a; }
  /** Ortho dimension: side 'above'|'below' → horizontal line at y = at; 'left'|'right' → vertical line at x = at; 'in' → between the points. */
  function odim(g, P1, P2, side, at, text, col) {
    col = col || DIM;
    if (side === 'in') {
      dimArrows(g, P1, P2, col);
      const vert = Math.abs(P2[0] - P1[0]) < 1;
      const ang = vert ? 0 : readableAngle(Math.atan2(P2[1] - P1[1], P2[0] - P1[0]));
      D.text(g, text, (P1[0] + P2[0]) / 2 + (vert ? 8 : 0), (P1[1] + P2[1]) / 2 - (vert ? 0 : 12), { size: 15, weight: 700, color: col, align: vert ? 'left' : 'center', halo: true, rotate: ang });
      return;
    }
    if (side === 'above' || side === 'below') {
      const s = side === 'above' ? -1 : 1;
      D.line(g, P1[0], P1[1] + s * 3, P1[0], at + s * 6, { color: col, width: 1 });
      D.line(g, P2[0], P2[1] + s * 3, P2[0], at + s * 6, { color: col, width: 1 });
      dimArrows(g, [P1[0], at], [P2[0], at], col);
      D.text(g, text, (P1[0] + P2[0]) / 2, at - 11, { size: 15, weight: 700, color: col, align: 'center', halo: true });
    } else {
      const s = side === 'left' ? -1 : 1;
      D.line(g, P1[0] + s * 3, P1[1], at + s * 6, P1[1], { color: col, width: 1 });
      D.line(g, P2[0] + s * 3, P2[1], at + s * 6, P2[1], { color: col, width: 1 });
      dimArrows(g, [at, P1[1]], [at, P2[1]], col);
      D.text(g, text, at - 11, (P1[1] + P2[1]) / 2, { size: 15, weight: 700, color: col, align: 'center', halo: true, rotate: -Math.PI / 2 });
    }
  }
  function panel(g, x, y, w, h, title) {
    D.rect(g, x, y, w, h, { fill: '#f8fafc', stroke: '#cbd5e1', width: 1.5, r: 10 });
    if (title) D.text(g, title, x + 14, y + 20, { size: 17, weight: 800 });
  }
  function polyline(g, pts, o) { if (pts.length > 1) D.poly(g, pts, o); }
  function pointInPoly(pt, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function snapMarker(g, sn) {
    if (!sn) return;
    D.rect(g, sn.x - 7, sn.y - 7, 14, 14, { stroke: '#db2777', width: 2.4 });
    D.tag(g, sn.label, sn.x + 12, sn.y - 18, { bg: '#db2777', size: 14 });
  }

  // ═══════════════════════════════ ISOMETRIC ═══════════════════════════════
  const ISO_OBJECTS = [
    { value: 'lblock', label: 'L-block (angle block)' },
    { value: 'step', label: 'Stepped block' },
    { value: 'slot', label: 'Block with a slot' },
    { value: 'tblock', label: 'Inverted T-block' },
    { value: 'corner', label: 'Corner-notched block' },
    { value: 'guide', label: 'Guide block (upright with slot)' },
  ];
  /** Object definition: overall size, cut boxes [x0,x1,y0,y1,z0,z1], optional vertical hole, dimensions for the views (fd) and the isometric (id). */
  function isoDef(p) {
    const L = p.L, W = p.W, H = p.H; const o = { L, W, H, cuts: [], fd: [], id: [], name: (ISO_OBJECTS.find((q) => q.value === p.obj) || ISO_OBJECTS[0]).label };
    let hole = null;
    const fd = (v, a, b, side, lvl, text) => o.fd.push({ v, a, b, side, lvl, text: text || `${fmt(Math.hypot(b[0] - a[0], b[1] - a[1]), 3)}` });
    const id = (a, b, off, text) => o.id.push({ a, b, off, text: text || `${fmt(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), 3)}` });
    const LWdims = () => { id([0, W, 0], [L, W, 0], [0, 12, 0]); id([0, 0, 0], [0, W, 0], [-12, 0, 0]); };
    switch (p.obj) {
      case 'step': {
        const s1 = R(L / 3), s2 = R((2 * L) / 3), z1 = R(H / 3), z2 = R((2 * H) / 3);
        o.cuts = [[0, s2, 0, W, z2, H], [0, s1, 0, W, z1, H]];
        hole = { cx: s1 / 2, cy: W / 2, max: 0.62 * Math.min(s1, W), z0: 0, z1 };
        fd('front', [0, z1], [s1, z1], 'above', 0); fd('front', [s1, z2], [s2, z2], 'above', 0);
        fd('front', [0, 0], [0, z1], 'left', 0); fd('front', [0, 0], [0, z2], 'left', 1);
        LWdims(); id([L, W, 0], [L, W, H], [12, 0, 0]); id([0, 0, 0], [0, 0, z1], [0, -12, 0]);
        o.feat = `steps ${s1} mm and ${s2 - s1} mm wide, ${z1} mm and ${z2} mm high`;
        break;
      }
      case 'slot': {
        const sw = R(0.3 * L), sd = R(0.4 * H), x0 = R((L - sw) / 2), x1 = x0 + sw;
        o.cuts = [[x0, x1, 0, W, H - sd, H]];
        hole = { cx: x0 / 2, cy: W / 2, max: 0.62 * Math.min(x0, W), z0: 0, z1: H };
        fd('front', [x0, H], [x1, H], 'above', 0); fd('front', [(x0 + x1) / 2, H - sd], [(x0 + x1) / 2, H], 'in', 0);
        LWdims(); id([L, W, 0], [L, W, H], [12, 0, 0]); id([x0, W, H], [x1, W, H], [0, 0, 10]);
        o.feat = `slot ${sw} mm wide × ${sd} mm deep through the depth`;
        break;
      }
      case 'tblock': {
        const a = R(L / 3), hb = R(0.35 * H);
        o.cuts = [[0, a, 0, W, hb, H], [L - a, L, 0, W, hb, H]];
        hole = { cx: L / 2, cy: W / 2, max: 0.62 * Math.min(L - 2 * a, W), z0: 0, z1: H };
        fd('front', [a, H], [L - a, H], 'above', 0); fd('front', [0, 0], [0, hb], 'left', 0);
        id([0, W, 0], [L, W, 0], [0, 26, 0]); id([0, 0, 0], [0, W, 0], [-12, 0, 0]);
        id([L - a, W, 0], [L - a, W, H], [0, 12, 0]); id([0, 0, 0], [0, 0, hb], [0, -12, 0]); id([a, W, H], [L - a, W, H], [0, 0, 10]);
        o.feat = `upright stem ${L - 2 * a} mm wide on a ${hb} mm thick base`;
        break;
      }
      case 'corner': {
        const nx = R(L / 2), ny = R(W / 2), nz = R(H / 2);
        o.cuts = [[0, nx, W - ny, W, H - nz, H]];
        hole = { cx: R((nx + L) / 2), cy: W / 2, max: 0.62 * Math.min(L - nx, W), z0: 0, z1: H };
        fd('front', [0, H], [nx, H], 'above', 0); fd('front', [0, H - nz], [0, H], 'left', 0); fd('top', [0, W - ny], [0, W], 'left', 0);
        LWdims(); id([L, W, 0], [L, W, H], [12, 0, 0]); id([0, 0, H - nz], [0, 0, H], [0, -12, 0]); id([0, W - ny, H], [nx, W - ny, H], [0, 0, 10]);
        o.feat = `corner notch ${nx} × ${ny} × ${nz} mm removed at the front-left-top`;
        break;
      }
      case 'guide': {
        const hb = R(0.3 * H), u = R(0.35 * W), sw = R(0.3 * L), sd = Math.min(R(0.3 * H), H - hb - 6), x0 = R((L - sw) / 2), x1 = x0 + sw;
        o.cuts = [[0, L, u, W, hb, H], [x0, x1, 0, u, H - sd, H]];
        hole = { cx: R(L / 4), cy: (u + W) / 2, max: 0.62 * Math.min(W - u, L / 2), z0: 0, z1: hb };
        fd('front', [x0, H], [x1, H], 'above', 0); fd('front', [0, 0], [0, hb], 'left', 0); fd('front', [(x0 + x1) / 2, H - sd], [(x0 + x1) / 2, H], 'in', 0);
        fd('side', [0, H], [u, H], 'above', 0);
        LWdims(); id([0, 0, 0], [0, 0, H], [0, -12, 0]); id([x0, 0, H], [x1, 0, H], [0, 0, 10]); id([L, W, 0], [L, W, hb], [12, 0, 0]);
        o.feat = `${hb} mm base, ${u} mm thick upright at the back with a ${sw} × ${sd} mm slot`;
        break;
      }
      default: { // L-block
        const t = R(0.35 * L), hl = R(0.35 * H);
        o.cuts = [[0, L - t, 0, W, hl, H]];
        hole = { cx: (L - t) / 2, cy: W / 2, max: 0.62 * Math.min(L - t, W), z0: 0, z1: hl };
        fd('front', [L - t, H], [L, H], 'above', 0); fd('front', [0, 0], [0, hl], 'left', 0);
        LWdims(); id([L, W, 0], [L, W, H], [12, 0, 0]); id([L - t, W, H], [L, W, H], [0, 0, 10]); id([0, 0, 0], [0, 0, hl], [0, -12, 0]);
        o.feat = `upright ${t} mm thick, base ${hl} mm thick`;
      }
    }
    // overall dimensions of the views (outermost level)
    const lv = (vs, side) => o.fd.filter((d) => vs.includes(d.v) && d.side === side).reduce((mx, d) => Math.max(mx, d.lvl + 1), 0);
    const aboveF = lv(['front'], 'above'); const leftF = lv(['front', 'top'], 'left');
    fd('front', [0, H], [L, H], 'above', aboveF); fd('front', [0, 0], [0, H], 'left', leftF);
    fd('top', [0, 0], [0, W], 'left', leftF);
    o.hole = null; o.holeMax = hole ? Math.floor(hole.max) : 0;
    if (p.hole && hole) {
      const d = Math.min(p.hd, Math.floor(hole.max));
      o.hole = { cx: hole.cx, cy: hole.cy, r: d / 2, d, z0: hole.z0, z1: hole.z1, clamped: d < p.hd };
      fd('top', [hole.cx - d / 2, hole.cy], [hole.cx + d / 2, hole.cy], 'in', 0, `Ø${fmt(d, 3)}`);
    }
    return o;
  }

  /** Voxel-grid solid (bbox minus cuts): edges, boundary faces and an exact occlusion test. */
  function isoSolid(def) {
    const { L, W, H, cuts } = def; const E = 1e-6;
    const uniq = (arr, max) => [...new Set(arr.map((v) => Math.round(clamp(v, 0, max) * 1e6) / 1e6))].sort((a, b) => a - b);
    const GR = [uniq([0, L, ...cuts.flatMap((c) => [c[0], c[1]])], L), uniq([0, W, ...cuts.flatMap((c) => [c[2], c[3]])], W), uniq([0, H, ...cuts.flatMap((c) => [c[4], c[5]])], H)];
    const inCut = (q) => cuts.some((c) => q[0] > c[0] && q[0] < c[1] && q[1] > c[2] && q[1] < c[3] && q[2] > c[4] && q[2] < c[5]);
    const n = GR.map((a) => a.length - 1);
    const fill = [];
    for (let i = 0; i < n[0]; i++) for (let j = 0; j < n[1]; j++) for (let k = 0; k < n[2]; k++) {
      fill[(i * n[1] + j) * n[2] + k] = !inCut([(GR[0][i] + GR[0][i + 1]) / 2, (GR[1][j] + GR[1][j + 1]) / 2, (GR[2][k] + GR[2][k + 1]) / 2]);
    }
    const F = (i, j, k) => i >= 0 && j >= 0 && k >= 0 && i < n[0] && j < n[1] && k < n[2] && fill[(i * n[1] + j) * n[2] + k];
    const Fa = (idx) => F(idx[0], idx[1], idx[2]);
    // edges: grid-line segments where the four surrounding cells form a crease (merged along each line)
    const edges = [];
    for (let a = 0; a < 3; a++) {
      const b = (a + 1) % 3, c = (a + 2) % 3;
      for (let j = 0; j <= n[b]; j++) for (let k = 0; k <= n[c]; k++) {
        let run = null;
        const flush = () => { if (run) { edges.push(run); run = null; } };
        for (let i = 0; i < n[a]; i++) {
          const cell = (jj, kk) => { const idx = [0, 0, 0]; idx[a] = i; idx[b] = jj; idx[c] = kk; return Fa(idx) ? 1 : 0; };
          const f00 = cell(j - 1, k - 1), f10 = cell(j, k - 1), f01 = cell(j - 1, k), f11 = cell(j, k);
          const cnt = f00 + f10 + f01 + f11;
          const isEdge = cnt === 1 || cnt === 3 || (cnt === 2 && f00 === f11);
          if (!isEdge) { flush(); continue; }
          const P0 = [0, 0, 0], P1 = [0, 0, 0]; P0[a] = GR[a][i]; P1[a] = GR[a][i + 1]; P0[b] = P1[b] = GR[b][j]; P0[c] = P1[c] = GR[c][k];
          if (run) run[1] = P1; else run = [P0, P1];
        }
        flush();
      }
    }
    // boundary faces (for shading in 3-D)
    const faces = [];
    for (let a = 0; a < 3; a++) {
      const b = (a + 1) % 3, c = (a + 2) % 3;
      for (let i = 0; i <= n[a]; i++) for (let j = 0; j < n[b]; j++) for (let k = 0; k < n[c]; k++) {
        const i0 = [0, 0, 0], i1 = [0, 0, 0]; i0[a] = i - 1; i1[a] = i; i0[b] = i1[b] = j; i0[c] = i1[c] = k;
        const f0 = Fa(i0), f1 = Fa(i1); if (f0 === f1) continue;
        const nrm = [0, 0, 0]; nrm[a] = f0 ? 1 : -1;
        const corner = (u, v) => { const q = [0, 0, 0]; q[a] = GR[a][i]; q[b] = GR[b][j + u]; q[c] = GR[c][k + v]; return q; };
        faces.push({ pts: [corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)], n: nrm, axis: a });
      }
    }
    function slab(P, d, box) {
      let t0 = -1e9, t1 = 1e9;
      for (let i = 0; i < 3; i++) {
        const lo = box[2 * i], hi = box[2 * i + 1];
        if (Math.abs(d[i]) < 1e-12) { if (P[i] <= lo || P[i] >= hi) return null; continue; }
        let a = (lo - P[i]) / d[i], b = (hi - P[i]) / d[i]; if (a > b) { const tt = a; a = b; b = tt; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 >= t1) return null;
      }
      return [t0, t1];
    }
    /** True when the ray from P towards the observer (direction d) passes through material. */
    function occluded(P, d) {
      const bb = slab(P, d, [E, L - E, E, W - E, E, H - E]); if (!bb) return false;
      let segs = [[Math.max(bb[0], 1e-5), bb[1]]]; if (segs[0][1] - segs[0][0] <= 1e-5) return false;
      for (const c of cuts) {
        const r = slab(P, d, [c[0] - E, c[1] + E, c[2] - E, c[3] + E, c[4] - E, c[5] + E]); if (!r) continue;
        const out = [];
        segs.forEach(([u, v]) => { if (r[1] <= u || r[0] >= v) out.push([u, v]); else { if (r[0] > u) out.push([u, r[0]]); if (r[1] < v) out.push([r[1], v]); } });
        segs = out; if (!segs.length) return false;
      }
      return segs.some(([u, v]) => v - u > 1e-5);
    }
    return { L, W, H, cuts, GR, edges, faces, occluded };
  }

  /** Splits a 3-D edge into visible / hidden pieces for viewing direction d (towards the observer). */
  function splitVis(sol, A, B, d) {
    const N = 36; const st = [];
    for (let i = 0; i < N; i++) st.push(sol.occluded(lerp3(A, B, (i + 0.5) / N), d));
    const out = []; let s0 = 0;
    for (let i = 0; i < N; i++) {
      if (i < N - 1 && st[i] === st[i + 1]) continue;
      let s1 = 1;
      if (i < N - 1) {
        let lo = (i + 0.5) / N, hi = (i + 1.5) / N;
        for (let k = 0; k < 26; k++) { const mid = (lo + hi) / 2; if (sol.occluded(lerp3(A, B, mid), d) === st[i]) lo = mid; else hi = mid; }
        s1 = (lo + hi) / 2;
      }
      out.push({ s0, s1, hid: st[i] }); s0 = s1;
    }
    return out;
  }
  /** Removes the parts of 2-D segments `segs` already covered by collinear segments in `cover` (and by earlier ones). */
  function subtractCovered(segs, cover) {
    const out = [];
    segs.forEach(([a, b]) => {
      const dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy); if (L < 1e-6) return;
      let ivs = [[0, 1]];
      cover.concat(out).forEach(([p, q]) => {
        const off = (r) => Math.abs((r[0] - a[0]) * dy - (r[1] - a[1]) * dx) / L;
        if (off(p) > 0.02 || off(q) > 0.02) return;
        const tt = (r) => ((r[0] - a[0]) * dx + (r[1] - a[1]) * dy) / (L * L);
        const lo = Math.min(tt(p), tt(q)), hi = Math.max(tt(p), tt(q));
        const nx = []; ivs.forEach(([u, v]) => { if (hi <= u || lo >= v) nx.push([u, v]); else { if (lo > u) nx.push([u, lo]); if (hi < v) nx.push([hi, v]); } });
        ivs = nx;
      });
      ivs.forEach(([u, v]) => { if ((v - u) * L > 0.15) out.push([lerp2(a, b, u), lerp2(a, b, v)]); });
    });
    return out;
  }
  /** Visible / hidden 2-D segments of the solid for direction d, mapped by to2d. */
  function viewOf(sol, d, to2d) {
    const vis = [], hid = [];
    sol.edges.forEach(([A, B]) => {
      const e = G.norm(G.sub(B, A)); if (G.len(G.cross(e, d)) < 1e-6) return;
      splitVis(sol, A, B, d).forEach((pc) => { const s = [to2d(lerp3(A, B, pc.s0)), to2d(lerp3(A, B, pc.s1))]; (pc.hid ? hid : vis).push(s); });
    });
    return { vis, hid: subtractCovered(hid, vis) };
  }
  const DIRS = { front: [0, 1, 0], top: [0, 0, 1], side: [-1, 0, 0], iso: G.norm([-1, 1, 1]) };
  const TO2D = { front: (q) => [q[0], q[2]], top: (q) => [q[0], q[1]], side: (q) => [q[1], q[2]] };
  const isoXY = (q) => [(q[0] + q[1]) * C30, (q[0] - q[1]) / 2 + q[2]]; // isometric DRAWING coordinates (true lengths along axes)

  const isoCache = new Map();
  function isoBuild(p) {
    const key = [p.obj, p.L, p.W, p.H, p.hole ? p.hd : 0].join('|');
    if (isoCache.has(key)) return isoCache.get(key);
    const def = isoDef(p); const sol = isoSolid(def);
    const views = {}; ['front', 'top', 'side'].forEach((k) => { views[k] = viewOf(sol, DIRS[k], TO2D[k]); });
    const iso = viewOf(sol, DIRS.iso, isoXY);
    const h = def.hole;
    if (h) { // hole: hidden generators in FV / LSV (the circle in the TV is drawn separately)
      views.front.hid.push([[h.cx - h.r, h.z0], [h.cx - h.r, h.z1]], [[h.cx + h.r, h.z0], [h.cx + h.r, h.z1]]);
      views.side.hid.push([[h.cy - h.r, h.z0], [h.cy - h.r, h.z1]], [[h.cy + h.r, h.z0], [h.cy + h.r, h.z1]]);
    }
    const m = { def, sol, views, iso, key };
    if (isoCache.size > 60) isoCache.clear();
    isoCache.set(key, m);
    return m;
  }
  function circlePts(h, z, n) { const out = []; for (let i = 0; i <= n; i++) { const a = (2 * Math.PI * i) / n; out.push([h.cx + h.r * Math.cos(a), h.cy + h.r * Math.sin(a), z]); } return out; }

  // ── orthographic sheet (first-angle) ──
  function orthoLayout(m, box) {
    const { L, W, H } = m.def; let yo = 8;
    const lvls = (vs, side) => m.def.fd.filter((d) => vs.includes(d.v) && d.side === side).reduce((a, d) => Math.max(a, d.lvl + 1), 0);
    const topM = 30 + 26 * lvls(['front', 'side'], 'above'); const leftM = 26 + 26 * lvls(['front', 'top'], 'left');
    const gapFS = 34, rightM = 26, botM = 34;
    const fitS = () => Math.min(3.2, (box.w - leftM - gapFS - rightM) / (L + W + yo), (box.h - topM - botM - 26) / (H + W + yo));
    let s = fitS(); yo = Math.max(8, 30 / s); s = fitS(); yo = Math.max(8, 30 / s);
    const usedW = leftM + L * s + gapFS + (W + yo) * s + rightM; const usedH = topM + (H + W + yo) * s + botM;
    const xl = box.x + leftM + Math.max(0, (box.w - usedW) / 2); const Y0 = box.y + topM + H * s + Math.max(0, (box.h - 26 - usedH) / 2) + 6;
    const X1 = xl + L * s + gapFS;
    return {
      s, xl, Y0, X1, yo,
      F: ([x, z]) => [xl + x * s, Y0 - z * s],
      T: ([x, y]) => [xl + x * s, Y0 + (y + yo) * s],
      Sd: ([y, z]) => [X1 + (y + yo) * s, Y0 - z * s],
      rect: { front: [xl, Y0 - H * s, L * s, H * s], top: [xl, Y0 + yo * s, L * s, W * s], side: [X1 + yo * s, Y0 - H * s, W * s, H * s] },
    };
  }
  const VCOL = { front: '#2563eb', top: '#16a34a', side: '#d97706' };
  const VSHORT = { front: 'FV', top: 'TV', side: 'LSV' };
  /** Draws the orthographic views. o: {views:{front:f,...} (0..1 progress or null), color, hidden, dims, proj, focus, t, box} */
  function drawOrtho(g, m, lay, o) {
    const maps = { front: lay.F, top: lay.T, side: lay.Sd };
    const { W, H } = m.def; const h = m.def.hole;
    G.xyLine(g, o.box.x + 24, o.box.x + o.box.w - 24, lay.Y0);
    if (o.views.side != null) {
      D.line(g, lay.X1, lay.Y0 - H * lay.s - 14, lay.X1, lay.Y0 + (W + lay.yo) * lay.s + 16, { color: INK, width: 1.2 });
      D.text(g, 'X₁', lay.X1 - 4, lay.Y0 - H * lay.s - 18, { size: 14, weight: 800, align: 'right' });
      D.text(g, 'Y₁', lay.X1 - 4, lay.Y0 + (W + lay.yo) * lay.s + 14, { size: 14, weight: 800, align: 'right' });
    }
    if (o.proj) { // projectors between views + 45° mitre
      const pts = [];
      m.sol.edges.forEach(([A, B]) => { [A, B].forEach((q) => { if (!pts.some((r) => Math.abs(r[0] - q[0]) + Math.abs(r[1] - q[1]) + Math.abs(r[2] - q[2]) < 1e-6)) pts.push(q); }); });
      if (h) pts.push([h.cx - h.r, h.cy - h.r, h.z1], [h.cx + h.r, h.cy + h.r, h.z1]);
      const fp = o.proj;
      pts.forEach((q) => {
        const f = lay.F([q[0], q[2]]), tt = lay.T([q[0], q[1]]), sv = lay.Sd([q[1], q[2]]);
        if (fp.tv) D.line(g, f[0], f[1], tt[0], f[1] + (tt[1] - f[1]) * fp.tv, G.LINE.projector);
        if (fp.sv) {
          D.line(g, f[0], f[1], f[0] + (sv[0] - f[0]) * fp.sv, sv[1], G.LINE.projector);
          const mx = sv[0], my = lay.Y0 + (sv[0] - lay.X1);
          D.line(g, tt[0], tt[1], tt[0] + (mx - tt[0]) * fp.sv, tt[1], G.LINE.projector);
          D.line(g, mx, my, mx, my + (sv[1] - my) * fp.sv, G.LINE.projector);
        }
      });
      if (fp.sv) { const Lm = (W + lay.yo + 6) * lay.s; D.line(g, lay.X1, lay.Y0, lay.X1 + Lm, lay.Y0 + Lm, { color: C.muted, width: 1.2, dash: [12, 4, 2, 4] }); }
    }
    ['front', 'top', 'side'].forEach((k) => {
      const f = o.views[k]; if (f == null) return;
      const V = m.views[k]; const M = maps[k]; const col = o.color ? o.color(k) : INK;
      const part = ([a, b]) => { const A = M(a), B = M(b); return [A, [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f]]; };
      if (o.hidden) V.hid.forEach((sg) => { const [A, B] = part(sg); D.line(g, A[0], A[1], B[0], B[1], { ...G.LINE.hidden, color: col }); });
      V.vis.forEach((sg) => { const [A, B] = part(sg); D.line(g, A[0], A[1], B[0], B[1], { ...G.LINE.visible, color: col }); });
      if (h && f >= 1) {
        if (k === 'top') {
          const c = lay.T([h.cx, h.cy]); const rr = h.r * lay.s; D.circle(g, c[0], c[1], rr, { stroke: col, width: 2.6 });
          G.seg(g, [c[0] - rr - 8, c[1]], [c[0] + rr + 8, c[1]], G.LINE.centre); G.seg(g, [c[0], c[1] - rr - 8], [c[0], c[1] + rr + 8], G.LINE.centre);
        } else if (o.hidden) {
          const a = k === 'front' ? M([h.cx, h.z0]) : M([h.cy, h.z0]); const b = k === 'front' ? M([h.cx, h.z1]) : M([h.cy, h.z1]);
          G.seg(g, [a[0], a[1] + 8], [b[0], b[1] - 8], G.LINE.centre);
        }
      }
      const r = lay.rect[k];
      const tagY = k === 'top' ? r[1] + r[3] + 17 : lay.Y0 + 15;
      if (f >= 1 || o.focus === k) D.tag(g, VSHORT[k], r[0] + r[2] / 2, tagY, { bg: VCOL[k], size: 14, align: 'center' });
      if (o.focus === k) D.focus(g, r[0], r[1], r[2], r[3], o.t);
    });
    if (o.dims) {
      m.def.fd.forEach((d) => {
        if (o.views[d.v] == null || o.views[d.v] < 1) return;
        const M = maps[d.v]; const A = M(d.a), B = M(d.b); const r = lay.rect[d.v];
        const off = 24 + 26 * d.lvl;
        const at = d.side === 'above' ? r[1] - off : d.side === 'below' ? r[1] + r[3] + off : d.side === 'left' ? r[0] - off : d.side === 'right' ? r[0] + r[2] + off : 0;
        odim(g, A, B, d.side, at, d.text);
      });
    }
  }

  // ── isometric drawing panel ──
  function isoLayout(m, box) {
    const { L, W, H } = m.def; const mg = 18;
    const w = (L + W) * C30 + 2 * mg; const hh = (L + W) / 2 + H + 2 * mg;
    const s = Math.min(3.4, (box.w - 30) / w, (box.h - 30) / hh);
    const c = isoXY([L / 2, W / 2, H / 2]);
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2 + 6;
    const mk2 = (f) => (v) => [cx + (v[0] - c[0]) * s * f, cy - (v[1] - c[1]) * s * f];
    const mk = (f) => { const M2 = mk2(f); return (q) => M2(isoXY(q)); };
    return { s, mk, mk2, cx, cy };
  }
  /** Isometric dimension with extension lines parallel to an isometric axis. */
  function isoDim(g, M, d, col) {
    col = col || DIM; const ext = G.norm(d.off); const o1 = G.add(d.a, d.off), o2 = G.add(d.b, d.off);
    const ov = G.mul(ext, 2.5); const gap = G.mul(ext, 1.2);
    const A0 = M(G.add(d.a, gap)), A1 = M(G.add(o1, ov)), B0 = M(G.add(d.b, gap)), B1 = M(G.add(o2, ov));
    D.line(g, A0[0], A0[1], A1[0], A1[1], { color: col, width: 1 }); D.line(g, B0[0], B0[1], B1[0], B1[1], { color: col, width: 1 });
    const P = M(o1), Q = M(o2); dimArrows(g, P, Q, col);
    const mid = M(G.mul(G.add(o1, o2), 0.5)); const far = M(G.add(G.mul(G.add(o1, o2), 0.5), ext));
    const ang = readableAngle(Math.atan2(Q[1] - P[1], Q[0] - P[0]));
    // text on the side of the dimension line away from the object, offset perpendicular to the line
    const lx = Q[0] - P[0], ly = Q[1] - P[1]; const ll = Math.hypot(lx, ly) || 1; let nx = -ly / ll, ny = lx / ll;
    if (nx * (far[0] - mid[0]) + ny * (far[1] - mid[1]) < 0) { nx = -nx; ny = -ny; }
    D.text(g, d.text, mid[0] + nx * 11, mid[1] + ny * 11, { size: 15, weight: 700, color: col, align: 'center', halo: true, rotate: ang });
  }
  /** Four-centre construction of the isometric circle on a horizontal face (screen coords). */
  function fourCentre(M, h) {
    const z = h.z1; const T = M([h.cx + h.r, h.cy - h.r, z]), Bm = M([h.cx - h.r, h.cy + h.r, z]), Rt = M([h.cx + h.r, h.cy + h.r, z]), Lf = M([h.cx - h.r, h.cy - h.r, z]);
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const mTR = mid(T, Rt), mRB = mid(Rt, Bm), mBL = mid(Bm, Lf), mLT = mid(Lf, T);
    const inter = (p1, p2, p3, p4) => { const d1 = [p2[0] - p1[0], p2[1] - p1[1]], d2 = [p4[0] - p3[0], p4[1] - p3[1]]; const den = d1[0] * d2[1] - d1[1] * d2[0]; if (Math.abs(den) < 1e-9) return p1; const tt = ((p3[0] - p1[0]) * d2[1] - (p3[1] - p1[1]) * d2[0]) / den; return [p1[0] + d1[0] * tt, p1[1] + d1[1] * tt]; };
    const cR = inter(T, mRB, Bm, mTR), cL = inter(T, mBL, Bm, mLT);
    const arcs = [{ c: T, a: mBL, b: mRB }, { c: Bm, a: mTR, b: mLT }, { c: cR, a: mRB, b: mTR }, { c: cL, a: mLT, b: mBL }];
    return { rh: [T, Rt, Bm, Lf], mids: [mTR, mRB, mBL, mLT], centres: [T, Bm, cR, cL], arcs };
  }
  function arcPts(c, a, b) {
    const r = Math.hypot(a[0] - c[0], a[1] - c[1]); const a0 = Math.atan2(a[1] - c[1], a[0] - c[0]); const a1 = Math.atan2(b[1] - c[1], b[0] - c[0]);
    let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const out = []; for (let i = 0; i <= 24; i++) { const an = a0 + (da * i) / 24; out.push([c[0] + r * Math.cos(an), c[1] + r * Math.sin(an)]); }
    return out;
  }
  function boxEdges(b) { // b = [x0,x1,y0,y1,z0,z1]
    const P = (i, j, k) => [b[i], b[2 + j], b[4 + k]]; const E = [];
    for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) E.push([P(0, j, k), P(1, j, k)]);
    for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) E.push([P(i, 0, k), P(i, 1, k)]);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) E.push([P(i, j, 0), P(i, j, 1)]);
    return E;
  }
  /** Draws the isometric (stage flags cumulative). */
  function drawIsoPanel(g, m, p, box, st) {
    const { L, W, H } = m.def; const lay = isoLayout(m, box); const f = p.scale === 'projection' ? K_ISO : 1;
    const M = lay.mk(f); const M2 = lay.mk2(f); const prog = st.prog;
    const segLine = (a, b, style, fr) => { const A = M(a), B = M(b); const k = fr == null ? 1 : fr; D.line(g, A[0], A[1], A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, style); };
    // axes
    if (st.axes) {
      const O = M([0, W, 0]); const fr = st.cur === 'axes' ? prog : 1;
      const ext = 0.25 * Math.max(L, W, H); const al = st.final ? 0.35 : 1;
      if (!st.final) D.line(g, O[0] - 130, O[1], O[0] + 130, O[1], { color: C.faint, width: 1, dash: [4, 4] });
      segLine([0, W, 0], [L + ext, W, 0], { color: '#dc2626', width: 1.8, alpha: al }, fr);
      segLine([0, W, 0], [0, -ext, 0], { color: '#16a34a', width: 1.8, alpha: al }, fr);
      segLine([0, W, 0], [0, W, H + ext], { color: '#2563eb', width: 1.8, alpha: al }, fr);
      if (!st.final && fr >= 1) {
        const ex = M([L + ext, W, 0]), ey = M([0, -ext, 0]), ez = M([0, W, H + ext]);
        D.text(g, 'X', ex[0] + 8, ex[1] - 4, { size: 16, weight: 800, color: '#dc2626', halo: true });
        D.text(g, 'Y', ey[0] - 8, ey[1] - 4, { size: 16, weight: 800, color: '#16a34a', halo: true, align: 'right' });
        D.text(g, 'Z', ez[0], ez[1] - 12, { size: 16, weight: 800, color: '#2563eb', halo: true, align: 'center' });
        if (st.cur === 'axes' || st.cur === 'box') {
          g.save(); g.strokeStyle = C.amber; g.lineWidth = 2; g.beginPath(); g.arc(O[0], O[1], 46, -Math.PI / 6, 0); g.stroke(); g.beginPath(); g.arc(O[0], O[1], 46, Math.PI, Math.PI + Math.PI / 6); g.stroke(); g.restore();
          D.text(g, '30°', O[0] + 54, O[1] - 9, { size: 15, weight: 800, color: C.amber, halo: true });
          D.text(g, '30°', O[0] - 54, O[1] - 9, { size: 15, weight: 800, color: C.amber, halo: true, align: 'right' });
        }
        D.text(g, 'O', O[0], O[1] + 16, { size: 15, weight: 800, halo: true, align: 'center' });
      }
    }
    // enclosing box
    if (st.box) {
      const fr = st.cur === 'box' ? prog : 1;
      boxEdges([0, L, 0, W, 0, H]).forEach(([a, b]) => segLine(a, b, { color: C.muted, width: 1.3, alpha: st.final ? 0.35 : 0.9, dash: st.final ? [4, 4] : undefined }, fr));
      if (st.cur === 'box') { const c = M([L, 0, H]); D.tag(g, `Box ${fmt(L * f, 3)} × ${fmt(W * f, 3)} × ${fmt(H * f, 3)}${f < 1 ? ' (iso)' : ''}`, c[0], c[1] - 18, { bg: '#475569', size: 14, align: 'center' }); }
    }
    // measure: cut boxes as projection guides along the axes
    if (st.measure) {
      const fr = st.cur === 'measure' ? prog : 1;
      m.def.cuts.forEach((c) => boxEdges(c).forEach(([a, b]) => segLine(a, b, { color: '#ea580c', width: 1.2, dash: [5, 4], alpha: st.final ? 0.3 : 0.85 }, fr)));
      if (!st.final) m.def.cuts.forEach((c) => [[c[0], c[3], c[5]], [c[1], c[3], c[4]], [c[1], c[2], c[5]], [c[0], c[2], c[4]]].forEach((q) => { const P = M(q); D.circle(g, P[0], P[1], 3.5, { fill: '#ea580c' }); }));
      if (st.cur === 'measure' && fr >= 1) m.def.id.forEach((d) => isoDim(g, M, d, '#ea580c'));
    }
    if (st.cut && !st.final) {
      m.def.cuts.forEach((c) => {
        const faceSets = [[[c[0], c[3], c[4]], [c[1], c[3], c[4]], [c[1], c[3], c[5]], [c[0], c[3], c[5]]], [[c[0], c[2], c[5]], [c[1], c[2], c[5]], [c[1], c[3], c[5]], [c[0], c[3], c[5]]], [[c[0], c[2], c[4]], [c[0], c[3], c[4]], [c[0], c[3], c[5]], [c[0], c[2], c[5]]]];
        faceSets.forEach((fc) => D.poly(g, fc.map(M), { fill: '#ef4444', close: true, stroke: false, alpha: st.cur === 'cut' ? 0.08 + 0.16 * prog : 0.12 }));
      });
      if (st.cur === 'cut') { const c = m.def.cuts[0]; const P = M([(c[0] + c[1]) / 2, (c[2] + c[3]) / 2, c[5]]); D.tag(g, 'Cut away', P[0], P[1] - 14, { bg: '#dc2626', size: 14, align: 'center' }); }
    }
    // object outline (visible only — hidden lines are omitted in isometric)
    if (st.cut) {
      const fr = st.cur === 'final' ? prog : 1; const col = st.final ? INK : '#334155'; const w = st.final ? 2.8 : 2;
      m.iso.vis.forEach(([a, b]) => { const P = M2(a), Q = M2(b); D.line(g, P[0], P[1], P[0] + (Q[0] - P[0]) * fr, P[1] + (Q[1] - P[1]) * fr, { color: col, width: w }); });
    }
    const h = m.def.hole;
    if (h && st.hole) {
      const fc = fourCentre(M, h);
      if (!st.final || st.cur === 'hole') {
        D.poly(g, fc.rh, { close: true, stroke: C.muted, width: 1.2 });
        fc.centres.forEach((c, i) => { D.circle(g, c[0], c[1], 3.5, { fill: '#7c3aed' }); if (st.cur === 'hole') D.text(g, String(i + 1), c[0] + 6, c[1] - 10, { size: 14, weight: 800, color: '#7c3aed', halo: true }); });
        if (st.cur === 'hole') [[0, 1], [0, 2], [1, 0], [1, 3]].forEach(([ci, mi]) => { const c = fc.centres[ci], mm = fc.mids[mi]; D.line(g, c[0], c[1], mm[0], mm[1], { color: '#7c3aed', width: 1, dash: [4, 4] }); });
        fc.arcs.forEach((a) => polyline(g, arcPts(a.c, a.a, a.b), { stroke: '#7c3aed', width: 2.2 }));
      }
      if (st.final) {
        const top = circlePts(h, h.z1, 96).map(M); const bot = circlePts(h, h.z0, 96).map(M);
        polyline(g, top, { stroke: INK, width: 2.6 });
        let run = []; bot.forEach((q) => { if (pointInPoly(q, top)) run.push(q); else { polyline(g, run, { stroke: INK, width: 2 }); run = []; } }); polyline(g, run, { stroke: INK, width: 2 });
        const e1 = M([h.cx - h.r - 5, h.cy, h.z1]), e2 = M([h.cx + h.r + 5, h.cy, h.z1]), e3 = M([h.cx, h.cy - h.r - 5, h.z1]), e4 = M([h.cx, h.cy + h.r + 5, h.z1]);
        G.seg(g, e1, e2, G.LINE.centre); G.seg(g, e3, e4, G.LINE.centre);
      }
    }
    if (st.final && p.showDims) {
      m.def.id.forEach((d) => isoDim(g, M, d));
      if (h) { const a = M([h.cx + h.r * 0.7071, h.cy + h.r * 0.7071, h.z1]); const a2 = M([h.cx - h.r * 0.7071, h.cy + h.r * 0.7071, h.z1]); const b = [a2[0] - 30, a2[1] + 30]; void a; D.line(g, a2[0], a2[1], b[0], b[1], { color: DIM, width: 1.2 }); D.circle(g, a2[0], a2[1], 2.5, { fill: DIM }); D.text(g, `Ø${fmt(h.d, 3)}`, b[0] - 4, b[1] + 6, { align: 'right', size: 15, weight: 700, color: DIM, halo: true }); }
    }
    return { lay, M, f };
  }
  /** Isometric-scale construction (45° true lengths vs 30° isometric lengths). */
  function drawIsoScale(g, m, box, prog, t) {
    const { L, W, H } = m.def; const Lmax = Math.ceil(Math.max(L, W, H) / 10) * 10;
    const c45 = Math.SQRT1_2; const sc = Math.min(3, (box.w - 260) / (Lmax * c45), (box.h - 160) / (Lmax * c45));
    const O = [box.x + 60, box.y + box.h - 80];
    const P45 = (l) => [O[0] + l * c45 * sc, O[1] - l * c45 * sc]; const P30 = (l) => [O[0] + l * C30 * sc, O[1] - l * 0.5 * sc];
    D.line(g, O[0] - 20, O[1], O[0] + Lmax * c45 * sc + 60, O[1], { color: C.muted, width: 1.2 });
    const E45 = P45(Lmax), E30 = P30(Lmax * K_ISO);
    D.line(g, O[0], O[1], E45[0], E45[1], { color: '#dc2626', width: 2.2 });
    D.line(g, O[0], O[1], O[0] + (E30[0] - O[0]) * 1.06, O[1] + (E30[1] - O[1]) * 1.06, { color: '#2563eb', width: 2.2 });
    const stepMM = (10 * c45 * sc) > 24 ? 10 : 20; const n = Math.round(Lmax / stepMM);
    for (let i = 0; i <= n; i++) {
      const l = i * stepMM; const a = P45(l); const b = P30(l * K_ISO); const fr = clamp(prog * (n + 1) - i, 0, 1);
      D.line(g, a[0] - 4, a[1] - 4, a[0] + 4, a[1] + 4, { color: '#dc2626', width: 1.6 });
      if (fr > 0) D.line(g, a[0], a[1], a[0], a[1] + (b[1] - a[1]) * fr, { color: C.muted, width: 1, dash: [4, 3] });
      if (fr >= 1) { D.circle(g, b[0], b[1], 3, { fill: '#2563eb' }); D.line(g, b[0] + 3, b[1] - 5, b[0] - 3, b[1] + 5, { color: '#2563eb', width: 1.6 }); }
      if (i > 0 && (stepMM === 20 || i % 2 === 0)) D.text(g, String(l), a[0] - 9, a[1] - 7, { size: 14, weight: 700, color: '#dc2626', align: 'right', halo: true });
    }
    D.text(g, '45°', O[0] + 50, O[1] - 20, { size: 15, weight: 800, color: '#dc2626', halo: true });
    D.text(g, '30°', O[0] + 70, O[1] - 7, { size: 15, weight: 800, color: '#2563eb', halo: true });
    D.text(g, 'True scale (45°)', E45[0] + 10, E45[1] - 4, { size: 15, weight: 800, color: '#dc2626', halo: true });
    D.text(g, 'Isometric scale (30°)', E30[0] + 14, E30[1] + 4, { size: 15, weight: 800, color: '#2563eb', halo: true });
    if (prog >= 1) {
      const a = P45(L), b = P30(L * K_ISO); D.line(g, a[0], a[1], b[0], b[1], { color: '#16a34a', width: 2.6 });
      D.tag(g, `L = ${L} → ${fmt(L * K_ISO, 3)} mm`, b[0] + 12, b[1] + 22, { bg: '#16a34a', size: 14 });
    }
    D.text(g, 'Iso length = true length × cos45°/cos30° = 0.816 × true', box.x + box.w / 2, box.y + box.h - 30, { size: 15, weight: 700, align: 'center', color: INK });
    D.focus(g, box.x + 20, box.y + 24, box.w - 40, box.h - 74, t);
  }

  // ── 3-D (orthographic camera, so the snapped view is the exact isometric projection) ──
  function cam3(view, cx, cy, k, c) {
    const yaw = view.yaw, pitch = view.pitch, z = view.zoom || 1;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const P = (q) => {
      const x = q[0] - c[0], y = -(q[1] - c[1]), zz = q[2] - c[2];
      const x1 = x * cyw - y * syw; const y1 = x * syw + y * cyw; const y2 = y1 * cp - zz * sp; const z2 = y1 * sp + zz * cp;
      return [cx + (view.panX || 0) + x1 * k * z, cy + (view.panY || 0) - z2 * k * z, y2];
    };
    P.dir = [-syw * cp, cyw * cp, sp]; // towards the observer, model coordinates
    return P;
  }
  function draw3D(g, m, p, view, box, o) {
    const { L, W, H } = m.def; const sol = m.sol; const dg = Math.hypot(L, W, H);
    const k = (Math.min(box.w, box.h) * 0.6) / dg; const P = cam3(view, box.x + box.w / 2, box.y + box.h / 2 + 8, k, [L / 2, W / 2, H / 2]);
    const dir = P.dir; const light = G.norm([-0.35, 0.55, 0.85]); const base = '#93c5fd';
    g.save(); g.beginPath(); g.rect(box.x + 2, box.y + 32, box.w - 4, box.h - 60); g.clip();
    const gr = [[-8, -8, 0], [L + 8, -8, 0], [L + 8, W + 8, 0], [-8, W + 8, 0]].map(P);
    D.poly(g, gr.map((q) => [q[0], q[1]]), { fill: '#e2e8f0', close: true, stroke: '#cbd5e1', width: 1, alpha: 0.6 });
    const items = [];
    sol.faces.forEach((fc) => {
      if (G.dot(fc.n, dir) <= 1e-9) return;
      const pts = fc.pts.map(P); const dep = pts.reduce((s, q) => s + q[2], 0) / 4;
      const col = D.shade(base, -(1 - (0.5 + 0.5 * Math.max(0, G.dot(fc.n, light)))) * 0.75);
      items.push({ dep, fc, draw: () => D.poly(g, pts.map((q) => [q[0], q[1]]), { fill: col, close: true, stroke: col, width: 0.8 }) });
    });
    const h = m.def.hole;
    if (h && dir[2] > 1e-6) {
      const top = circlePts(h, h.z1, 72).map(P); const bot = circlePts(h, h.z0, 72).map(P);
      let dep = P([h.cx, h.cy, h.z1])[2];
      items.forEach((it) => { const fc = it.fc; if (!fc || fc.n[2] !== 1 || Math.abs(fc.pts[0][2] - h.z1) > 1e-6) return; const xs = fc.pts.map((q) => q[0]), ys = fc.pts.map((q) => q[1]); if (Math.min(...xs) < h.cx + h.r && Math.max(...xs) > h.cx - h.r && Math.min(...ys) < h.cy + h.r && Math.max(...ys) > h.cy - h.r) dep = Math.min(dep, it.dep); });
      dep -= 1e-3;
      items.push({ dep, draw: () => {
        const t2 = top.map((q) => [q[0], q[1]]); D.poly(g, t2, { fill: '#334155', close: true, stroke: false });
        const inside = bot.map((q) => [q[0], q[1]]).filter((q) => pointInPoly(q, t2));
        if (inside.length > 2) D.poly(g, inside, { stroke: '#94a3b8', width: 1.4 });
        D.poly(g, t2, { close: true, stroke: INK, width: 2 });
      } });
    }
    items.sort((a, b) => b.dep - a.dep).forEach((it) => it.draw());
    sol.edges.forEach(([A, B]) => {
      const e = G.norm(G.sub(B, A)); if (G.len(G.cross(e, dir)) < 1e-6) return;
      splitVis(sol, A, B, dir).forEach((pc) => {
        const a = P(lerp3(A, B, pc.s0)), b = P(lerp3(A, B, pc.s1));
        if (pc.hid) { if (o.hidden) D.line(g, a[0], a[1], b[0], b[1], { color: '#475569', width: 1.2, dash: [6, 5], alpha: 0.75 }); } else D.line(g, a[0], a[1], b[0], b[1], { color: INK, width: 2.2 });
      });
    });
    if (o.arrow) {
      const eye = DIRS[o.arrow]; const c0 = [L / 2, W / 2, H / 2];
      const E0 = P(G.add(c0, G.mul(eye, dg * 0.82))), E1 = P(G.add(c0, G.mul(eye, dg * 0.52)));
      D.arrow(g, E0[0], E0[1], E1[0], E1[1], { color: VCOL[o.arrow], width: 3.5, head: 16 });
      D.tag(g, `Look for the ${VSHORT[o.arrow]}`, clamp(E0[0], box.x + 90, box.x + box.w - 90), clamp(E0[1] - 16, box.y + 50, box.y + box.h - 40), { bg: VCOL[o.arrow], size: 14, align: 'center' });
    }
    if (o.diag) { // the three isometric axes from the lowest front-left corner
      const a = P([0, W, 0]);
      [[1, 0, 0], [0, -1, 0], [0, 0, 1]].forEach((v, i) => { const bq = P(G.add([0, W, 0], G.mul(v, Math.max(L, W, H) * 1.25))); D.line(g, a[0], a[1], bq[0], bq[1], { color: ['#dc2626', '#16a34a', '#2563eb'][i], width: 2, dash: [8, 5] }); });
    }
    g.restore();
    // axis triad (bottom-left)
    const T0 = [box.x + 46, box.y + box.h - 58]; const Tp = cam3({ yaw: view.yaw, pitch: view.pitch, zoom: 1 }, T0[0], T0[1], 24, [0, 0, 0]);
    [['X', [1, 0, 0], '#dc2626'], ['Y', [0, 1, 0], '#16a34a'], ['Z', [0, 0, 1], '#2563eb']].forEach(([lab, v, col]) => {
      const q = Tp(v); if (Math.hypot(q[0] - T0[0], q[1] - T0[1]) < 3) { D.circle(g, T0[0], T0[1], 4, { fill: col }); return; }
      D.arrow(g, T0[0], T0[1], q[0], q[1], { color: col, width: 2.2, head: 8 });
      D.text(g, lab, q[0] + (q[0] - T0[0]) * 0.4, q[1] + (q[1] - T0[1]) * 0.4, { size: 14, weight: 800, color: col, align: 'center', halo: true });
    });
    return P;
  }
  function viewAngles(view) {
    let yawD = deg(view.yaw) % 360; if (yawD > 180) yawD -= 360; if (yawD <= -180) yawD += 360;
    const pitchD = deg(view.pitch);
    const isIso = Math.abs(yawD - 45) < 1 && Math.abs(pitchD - deg(ISO_PITCH)) < 1;
    const dir = cam3(view, 0, 0, 1, [0, 0, 0]).dir;
    const fr = (c) => Math.sqrt(Math.max(0, 1 - c * c));
    return { yawD, pitchD, isIso, fx: fr(dir[0]), fy: fr(dir[1]), fz: fr(dir[2]) };
  }

  function isoKeys(p) {
    if (p.mode === 'to2d') return ['obj', 'fv', 'tv', 'sv', 'hidden', 'dims'];
    if (p.mode === 'orbit') return ['orbit', 'snap', 'compare', 'lengths'];
    const k = ['read', 'axes', 'scale', 'box', 'measure', 'cut'];
    if (p.hole) k.push('hole');
    k.push('final');
    return k;
  }

  S['eg-isometric'] = {
    view3d: true,
    initialView: { yaw: 0.5, pitch: 0.45, zoom: 1 },
    approx: 'The isometric circle is shown with the four-centre (four-arc) construction used on the drawing board; the final ellipse drawn is the exact isometric projection of the circle (the four-arc curve differs from it by about 1 % of the diameter). All straight edges and hidden lines are computed exactly.',
    modes: [{ key: 'to3d', label: '2-D → 3-D (views → isometric)' }, { key: 'to2d', label: '3-D → 2-D (object → views)' }, { key: 'orbit', label: '3-D model & isometric position' }],
    actions: [
      { key: 'iso', label: '◆ Snap to isometric view', title: 'Yaw 45°, pitch 35.26° — the body diagonal points at you' },
      { key: 'fv', label: 'FV direction', title: 'Look along the FV arrow' },
      { key: 'tv', label: 'TV direction', title: 'Look from above' },
      { key: 'sv', label: 'LSV direction', title: 'Look from the left' },
    ],
    initUi: () => ({ tipShown: false }),
    params: [
      { key: 'obj', label: 'Machine block', type: 'select', options: ISO_OBJECTS, default: 'lblock' },
      { key: 'L', label: 'Length L (along X)', type: 'range', min: 40, max: 120, step: 1, default: 80, unit: 'mm' },
      { key: 'W', label: 'Width W (along Y)', type: 'range', min: 30, max: 80, step: 1, default: 50, unit: 'mm' },
      { key: 'H', label: 'Height H (along Z)', type: 'range', min: 30, max: 80, step: 1, default: 50, unit: 'mm' },
      { key: 'hole', label: 'Drilled vertical hole', type: 'toggle', default: false },
      { key: 'hd', label: 'Hole diameter', type: 'range', min: 8, max: 30, step: 1, default: 16, unit: 'mm', showIf: (p) => p.hole },
      { key: 'scale', label: 'Isometric', type: 'select', options: [{ value: 'drawing', label: 'Isometric DRAWING (true lengths)' }, { value: 'projection', label: 'Isometric PROJECTION (iso scale 0.816)' }], default: 'drawing' },
      { key: 'showDims', label: 'Show dimensions', type: 'toggle', default: true },
      { key: 'showHidden', label: 'Show hidden edges (views / 3-D)', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'L-block 80 × 50 × 50 with a Ø16 hole — isometric drawing', values: { mode: 'to3d', obj: 'lblock', L: 80, W: 50, H: 50, hole: true, hd: 16, scale: 'drawing' } },
      { label: 'Stepped block — isometric projection (iso scale)', values: { mode: 'to3d', obj: 'step', L: 90, W: 45, H: 60, hole: false, scale: 'projection' } },
      { label: 'Guide block — generate the three views', values: { mode: 'to2d', obj: 'guide', L: 100, W: 60, H: 60, hole: true, hd: 18, scale: 'drawing' } },
      { label: 'T-block — find the isometric position', values: { mode: 'orbit', obj: 'tblock', L: 90, W: 50, H: 60, hole: true, hd: 14, scale: 'projection' } },
    ],
    validate(p) {
      const w = []; const def = isoDef(p);
      if (p.hole && def.hole && def.hole.clamped) w.push(`A Ø${p.hd} mm hole does not fit in the ${def.name.toLowerCase()} — it is limited to Ø${def.hole.d} mm.`);
      return w;
    },
    compute(p) {
      const m = isoBuild(p); const def = m.def; const { L, W, H } = def; const proj = p.scale === 'projection'; const k = proj ? K_ISO : 1;
      const hstr = def.hole ? `, Ø${fmt(def.hole.d, 3)} mm vertical hole` : '';
      const formulas = [
        { name: 'Isometric scale factor', formula: 'k = cos 45° / cos 30° = √(2/3)', given: 'Each principal axis is inclined at 35.26° to the plane of projection; cos 35.26° = √(2/3)', calc: `0.7071 / 0.8660 = ${fmt(K_ISO, 4)}`, result: `k = ${fmt(K_ISO, 4)} (≈ 0.816)`, unit: 'ratio (no unit)' },
        { name: `Foreshortened (isometric) lengths${proj ? '' : ' — needed only for the isometric PROJECTION'}`, formula: "L' = k·L,  W' = k·W,  H' = k·H", given: `L = ${L} mm, W = ${W} mm, H = ${H} mm`, calc: `${fmt(K_ISO, 4)} × ${L},  ${fmt(K_ISO, 4)} × ${W},  ${fmt(K_ISO, 4)} × ${H}`, result: `L' = ${fmt(L * K_ISO, 3)}, W' = ${fmt(W * K_ISO, 3)}, H' = ${fmt(H * K_ISO, 3)}`, unit: 'mm' },
        { name: 'Isometric viewing direction', formula: 'yaw = 45°,  tan(pitch) = 1/√2', given: 'The body diagonal of the enclosing cube points at the observer', calc: 'pitch = atan(0.7071) = 35.26°; the axes appear 120° apart', result: 'yaw 45°, pitch 35.26°', unit: 'degrees (°)' },
      ];
      if (def.hole) {
        const d = def.hole.d; const maj = proj ? d : d / K_ISO; const mn = maj / Math.sqrt(3);
        formulas.push({ name: 'Isometric circle (hole) — ellipse axes', formula: proj ? 'major = d,  minor = d / √3' : 'major = d / 0.816 = 1.225 d,  minor = major / √3 = 0.707 d', given: `d = ${fmt(d, 3)} mm`, calc: `major = ${fmt(maj, 4)},  minor = ${fmt(mn, 4)}`, result: `${fmt(maj, 3)} × ${fmt(mn, 3)}`, unit: 'mm' });
      }
      const readouts = [
        { label: 'Object', value: def.name, tone: 'info' },
        { label: 'Size', value: `${L} × ${W} × ${H} mm` },
        { label: proj ? 'Iso scale' : 'Scale', value: proj ? `× ${fmt(K_ISO, 3)}` : 'true (× 1)', tone: proj ? 'warn' : 'good' },
        { label: "L' · W' · H'", value: `${fmt(L * k, 3)} · ${fmt(W * k, 3)} · ${fmt(H * k, 3)} mm` },
      ];
      const modeTxt = p.mode === 'to2d' ? '3-D object → orthographic views' : p.mode === 'orbit' ? 'free 3-D orbit and the isometric position' : 'orthographic views → isometric';
      const state = {
        currentObject: def.name, dimensions: `${L} × ${W} × ${H} mm`, features: def.feat + hstr, mode: modeTxt,
        isometricType: proj ? 'isometric projection (isometric scale 0.816)' : 'isometric drawing (true lengths)',
        isoLengths: `${fmt(L * k, 3)} × ${fmt(W * k, 3)} × ${fmt(H * k, 3)} mm along the isometric axes`,
        frontView: `${m.views.front.vis.length} visible / ${m.views.front.hid.length} hidden segments`,
        topView: `${m.views.top.vis.length} visible / ${m.views.top.hid.length} hidden segments`,
        sideView: `${m.views.side.vis.length} visible / ${m.views.side.hid.length} hidden segments`,
        isometricVisibleEdges: m.iso.vis.length,
        circleMethod: def.hole ? 'four-centre construction shown; the final ellipse is the exact projection of the circle' : 'no hole',
      };
      return {
        formulas, readouts, state,
        explain: {
          what: p.mode === 'to2d' ? `The ${def.name.toLowerCase()} (${L} × ${W} × ${H} mm${hstr}) is projected on to the VP, HP and profile plane to give the FV, TV and LSV in first-angle projection.` : p.mode === 'orbit' ? `You can turn the ${def.name.toLowerCase()} freely. At yaw 45° and pitch 35.26° its three edges L, W and H are equally inclined to the screen — that is the isometric position.` : `The given FV, TV and LSV of the ${def.name.toLowerCase()} are turned into an ${proj ? 'isometric projection' : 'isometric drawing'} by the box method: draw the enclosing box on the isometric axes, measure along the axes and cut away the unwanted material.`,
          why: 'In isometric projection the object is turned so that its three principal edges make equal angles (35.26°) with the plane of projection. They are therefore shortened equally, by cos 35.26° = 0.816, and appear 120° apart — 30° to the horizontal plus the vertical. Only lines parallel to the isometric axes can be measured.',
          param: `Object (${def.name}), size L = ${L}, W = ${W}, H = ${H} mm${def.hole ? `, hole Ø${fmt(def.hole.d, 3)} mm` : ''}, drawing or projection scale (× ${proj ? '0.816' : '1'}).`,
          effect: `Choosing isometric PROJECTION multiplies every length along the axes by 0.816 (L' = ${fmt(L * K_ISO, 3)} mm), so the picture is ${fmt((1 - K_ISO) * 100, 3)} % smaller than the isometric DRAWING but has exactly the same shape. Changing L, W or H stretches the block along that isometric axis only.`,
        },
      };
    },
    steps(p) {
      const def = isoDef(p); const proj = p.scale === 'projection'; const { L, W, H } = def;
      const T = {
        read: { title: 'Read the given views', text: `FV, TV and LSV (first angle) of the ${def.name.toLowerCase()}: L = ${L}, W = ${W}, H = ${H} mm; ${def.feat}.` },
        axes: { title: 'Draw the isometric axes', text: 'From the lowest front corner O draw a vertical line and two lines at 30° to the horizontal — the three isometric axes, 120° apart.' },
        scale: { title: 'Isometric scale', text: proj ? `True lengths are marked on a 45° line and projected vertically on to a 30° line → × 0.816 (L = ${L} → ${fmt(L * K_ISO, 3)} mm).` : 'An isometric DRAWING uses true lengths; this scale (× 0.816) is needed only for an isometric PROJECTION.' },
        box: { title: 'Enclosing box', text: `Draw the box ${L} × ${W} × ${H} mm${proj ? ` (isometric lengths ${fmt(L * K_ISO, 3)} × ${fmt(W * K_ISO, 3)} × ${fmt(H * K_ISO, 3)} mm)` : ''} with thin lines parallel to the axes.` },
        measure: { title: 'Measure along the isometric axes', text: 'Transfer every size from the views along lines parallel to the axes (projection guides) — never along a non-isometric line.' },
        cut: { title: 'Cut away the unwanted material', text: `Remove the shaded parts (${def.feat}); the outline of the object appears.` },
        hole: { title: 'Isometric circle — four-centre method', text: 'Draw the isometric square (rhombus) round the hole; its two obtuse corners and the two intersections 3, 4 are the centres of the four arcs.' },
        final: { title: 'Final isometric', text: 'Visible edges thick; hidden lines are omitted in isometric; dimensions are placed along the isometric axes and state TRUE sizes.' },
        obj: { title: 'The object in 3-D', text: 'Drag to orbit, or press "Snap to isometric view". The FV, TV and LSV are seen along the three first-angle viewing directions.' },
        fv: { title: 'Front view (on the VP)', text: 'Look along the FV arrow: edges parallel to the VP show their true length. The FV sits above XY.' },
        tv: { title: 'Top view (on the HP)', text: 'Projectors drop vertically from the FV; the TV lies below XY with the front of the object away from XY.' },
        sv: { title: 'Left side view (on the PP)', text: 'Horizontal projectors from the FV and the 45° mitre line from the TV locate the LSV to the right of the FV.' },
        hidden: { title: 'Hidden edges and centre lines', text: 'Edges behind material are dashed; a hole shows as a circle in the TV and as dashed lines with a centre line in the FV and LSV.' },
        dims: { title: 'Dimensioned drawing', text: 'Overall and feature dimensions complete the orthographic drawing.' },
        orbit: { title: 'Orbit the 3-D model freely', text: 'Drag to turn the block. The bars show how much each axis is shortened in the current view.' },
        snap: { title: 'Snap to the isometric position', text: 'Press ◆: yaw 45°, pitch 35.26°. The body diagonal points at you, the axes appear 120° apart and all three bars read 0.816.' },
        compare: { title: 'Isometric projection vs drawing', text: `The projection uses 0.816 × true length, the drawing true lengths — same shape, ${fmt(100 / K_ISO - 100, 3)} % larger.` },
        lengths: { title: 'Foreshortened lengths', text: `L' = ${fmt(L * K_ISO, 3)} mm, W' = ${fmt(W * K_ISO, 3)} mm, H' = ${fmt(H * K_ISO, 3)} mm in the isometric projection.` },
      };
      return isoKeys(p).map((k) => T[k]);
    },
    onAction(key, S2) {
      const v = S2.view;
      if (key === 'iso') { v.yaw = rad(45); v.pitch = ISO_PITCH; v.panX = 0; v.panY = 0; return { redraw: true, toast: 'Isometric view: yaw 45°, pitch 35.26° — the 3-D view is now the exact isometric projection' }; }
      if (key === 'fv') { v.yaw = 0; v.pitch = 0; return { redraw: true, toast: 'Looking along the FV arrow (towards the VP)' }; }
      if (key === 'tv') { v.yaw = 0; v.pitch = Math.PI / 2; return { redraw: true, toast: 'Looking down on the HP (top view)' }; }
      if (key === 'sv') { v.yaw = Math.PI / 2; v.pitch = 0; return { redraw: true, toast: 'Looking from the left (left side view)' }; }
      return null;
    },
    onPointer(type, x, y, S2) {
      if (type !== 'down' || S2.p.mode !== 'to3d') return null;
      if (!S2.ui.tipShown) { S2.ui.tipShown = true; return { toast: 'Choose the mode "3-D → 2-D" or "3-D model" to orbit the object.' }; }
      return null;
    },
    draw(g, S2) {
      const { p, step, st, dur, t, view } = S2; const prog = clamp(st / dur, 0, 1);
      const m = isoBuild(p); const keys = isoKeys(p); const cur = keys[Math.min(step, keys.length - 1)]; const at = (k) => keys.indexOf(k) >= 0 && step >= keys.indexOf(k);
      D.clear(g, '#ffffff');
      if (p.mode !== 'to2d' && p.mode !== 'orbit') {
        const LB = { x: 8, y: 8, w: 422, h: 544 }; const RB = { x: 438, y: 8, w: 554, h: 544 };
        panel(g, LB.x, LB.y, LB.w, LB.h, 'Given: orthographic views (first angle)');
        panel(g, RB.x, RB.y, RB.w, RB.h, cur === 'scale' ? 'Isometric scale construction' : p.scale === 'projection' ? 'Isometric PROJECTION (isometric scale)' : 'Isometric DRAWING (true lengths)');
        const lay = orthoLayout(m, { x: LB.x + 4, y: LB.y + 30, w: LB.w - 8, h: LB.h - 34 });
        drawOrtho(g, m, lay, { views: { front: 1, top: 1, side: 1 }, hidden: p.showHidden, dims: p.showDims, box: { x: LB.x, y: LB.y, w: LB.w }, t, focus: null });
        if (cur === 'read') D.focus(g, LB.x + 10, LB.y + 34, LB.w - 20, LB.h - 44, t);
        if (cur === 'scale') { drawIsoScale(g, m, { x: RB.x, y: RB.y + 26, w: RB.w, h: RB.h - 26 }, prog, t); return; }
        const stg = { prog, cur, axes: at('axes'), box: at('box'), measure: at('measure'), cut: at('cut'), hole: at('hole'), final: at('final') };
        const ib = { x: RB.x + 10, y: RB.y + 34, w: RB.w - 20, h: RB.h - 70 };
        drawIsoPanel(g, m, p, ib, stg);
        if (cur === 'read') D.text(g, 'The isometric is built here step by step', RB.x + RB.w / 2, RB.y + RB.h / 2, { size: 17, color: C.faint, align: 'center' });
        const legend = cur === 'final' ? 'Visible — thick · hidden lines omitted · dimensions = true sizes' : cur === 'read' ? '' : 'Construction — thin · guides parallel to the axes only';
        if (legend) D.text(g, legend, RB.x + RB.w / 2, RB.y + RB.h - 16, { size: 15, weight: 700, color: C.muted, align: 'center' });
        const lay2 = isoLayout(m, ib); const M = lay2.mk(p.scale === 'projection' ? K_ISO : 1);
        if (cur === 'hole' && m.def.hole) { const h = m.def.hole; const c = M([h.cx, h.cy, h.z1]); const r = h.r * lay2.s * 1.3 + 18; D.focus(g, c[0] - r, c[1] - r * 0.75, 2 * r, 1.5 * r, t); }
        if (cur === 'axes') { const O = M([0, m.def.W, 0]); D.focus(g, O[0] - 80, O[1] - 60, 160, 84, t); }
        if (cur === 'cut' || cur === 'measure') { const A = M([0, 0, m.def.H]), B = M([m.def.L, m.def.W, 0]), Lq = M([0, m.def.W, 0]), Rq = M([m.def.L, 0, m.def.H]); void Rq; const x0 = Math.min(A[0], Lq[0]) - 8, x1 = B[0] + 8; D.focus(g, x0, A[1] - 8, x1 - x0, Lq[1] - A[1] + 16, t); }
        return;
      }
      const LB = { x: 8, y: 8, w: 486, h: 544 }; const RB = { x: 502, y: 8, w: 490, h: 544 };
      const va = viewAngles(view);
      panel(g, LB.x, LB.y, LB.w, LB.h, p.mode === 'orbit' ? '3-D model' : '3-D object');
      D.tag(g, va.isIso ? `Isometric ✓  yaw ${fmt(va.yawD, 3)}°  pitch ${fmt(va.pitchD, 3)}°` : `yaw ${fmt(va.yawD, 3)}°  pitch ${fmt(va.pitchD, 3)}°`, LB.x + LB.w - 12, LB.y + 20, { bg: va.isIso ? '#15803d' : '#475569', size: 14, align: 'right' });
      if (p.mode === 'to2d') {
        const arrow = cur === 'fv' ? 'front' : cur === 'tv' ? 'top' : cur === 'sv' ? 'side' : null;
        draw3D(g, m, p, view, LB, { hidden: p.showHidden && at('hidden'), arrow });
        if (cur === 'obj') D.focus(g, LB.x + 20, LB.y + 44, LB.w - 40, LB.h - 84, t);
        D.text(g, 'Drag to orbit · ◆ snaps to the isometric view', LB.x + LB.w / 2, LB.y + LB.h - 14, { size: 15, color: C.muted, align: 'center' });
        panel(g, RB.x, RB.y, RB.w, RB.h, 'Generated views (first-angle projection)');
        const lay = orthoLayout(m, { x: RB.x + 4, y: RB.y + 30, w: RB.w - 8, h: RB.h - 34 });
        const vf = (k) => { const i = keys.indexOf(k); return step > i ? 1 : step === i ? prog : null; };
        drawOrtho(g, m, lay, {
          views: { front: vf('fv'), top: vf('tv'), side: vf('sv') }, hidden: p.showHidden && at('hidden'), dims: p.showDims && at('dims'),
          proj: at('tv') ? { tv: cur === 'tv' ? prog : 1, sv: at('sv') ? (cur === 'sv' ? prog : 1) : 0 } : null,
          color: (k) => (at('hidden') ? INK : VCOL[k]), box: { x: RB.x, y: RB.y, w: RB.w }, t, focus: arrow,
        });
        if (cur === 'hidden') D.text(g, 'Visible — thick · Hidden — dashed · Centre — chain', RB.x + RB.w / 2, RB.y + RB.h - 14, { size: 15, weight: 700, align: 'center' });
        if (step === 0) D.text(g, 'Views appear here as you step through', RB.x + RB.w / 2, RB.y + RB.h / 2, { size: 17, color: C.faint, align: 'center' });
        return;
      }
      // orbit mode
      draw3D(g, m, p, view, LB, { hidden: p.showHidden, diag: cur === 'snap' || va.isIso });
      D.text(g, 'Drag to orbit · ◆ Snap to isometric view', LB.x + LB.w / 2, LB.y + LB.h - 14, { size: 15, color: C.muted, align: 'center' });
      if (cur === 'orbit') D.focus(g, LB.x + 20, LB.y + 44, LB.w - 40, LB.h - 84, t);
      panel(g, RB.x, RB.y, RB.w, RB.h, 'Foreshortening of the axes in this view');
      const bars = [['X (L)', va.fx, '#dc2626'], ['Y (W)', va.fy, '#16a34a'], ['Z (H)', va.fz, '#2563eb']];
      const bx = RB.x + 78, bw = RB.w - 150;
      bars.forEach(([lab, v, col], i) => {
        const y = RB.y + 44 + i * 32;
        D.text(g, lab, RB.x + 16, y + 9, { size: 15, weight: 800, color: col });
        D.rect(g, bx, y, bw, 18, { fill: '#e2e8f0', r: 5 }); D.rect(g, bx, y, Math.max(2, bw * v), 18, { fill: col, r: 5 });
        D.text(g, fmt(v, 3), bx + bw + 10, y + 9, { size: 15, weight: 800 });
      });
      const kx = bx + bw * K_ISO; D.line(g, kx, RB.y + 38, kx, RB.y + 44 + 3 * 32 - 8, { color: INK, width: 1.6, dash: [5, 3] });
      D.text(g, '- - 0.816 = isometric (all three equal)', RB.x + RB.w / 2, RB.y + 44 + 3 * 32 + 6, { size: 14, weight: 700, align: 'center', color: C.muted });
      if (cur === 'snap' || cur === 'orbit') D.focus(g, RB.x + 10, RB.y + 34, RB.w - 20, 124, t);
      const ib = { x: RB.x + 10, y: RB.y + 168, w: RB.w - 20, h: RB.h - 200 };
      const stg = { prog: 1, cur: 'done', axes: false, box: cur === 'compare', measure: false, cut: true, hole: true, final: true };
      if (cur === 'compare') { // ghost of the other scale
        const f2 = p.scale === 'projection' ? 1 : K_ISO; const M2 = isoLayout(m, ib).mk2(f2);
        m.iso.vis.forEach(([a, b]) => { const A = M2(a), B = M2(b); D.line(g, A[0], A[1], B[0], B[1], { color: '#f97316', width: 2, dash: [7, 4] }); });
        D.text(g, `Orange dashed: isometric ${f2 < 1 ? 'PROJECTION × 0.816' : 'DRAWING × 1'}`, RB.x + RB.w / 2, RB.y + RB.h - 38, { size: 15, weight: 700, color: '#ea580c', align: 'center' });
      }
      drawIsoPanel(g, m, { ...p, showDims: p.showDims && cur !== 'compare' }, ib, stg);
      D.text(g, p.scale === 'projection' ? 'Isometric PROJECTION (× 0.816)' : 'Isometric DRAWING (× 1)', RB.x + RB.w / 2, RB.y + RB.h - 14, { size: 15, weight: 800, align: 'center' });
      if (cur === 'lengths') {
        const { L, W, H } = m.def;
        D.tag(g, `L' = ${fmt(L * K_ISO, 3)}  W' = ${fmt(W * K_ISO, 3)}  H' = ${fmt(H * K_ISO, 3)} mm`, RB.x + RB.w / 2, RB.y + 176, { bg: '#1d4ed8', size: 15, align: 'center' });
      }
    },
  };

  // ═══════════════════════════════ PERSPECTIVE ═══════════════════════════════
  // World: X lateral (right), Y depth BEHIND the picture plane (Y = 0 is the PP), Z height above the ground.
  // Station point SP = (xs, −D, h). Central projection on to the PP: k = D/(D + Y), x_p = xs + (X − xs)k, z_p = h + (Z − h)k.
  const P_OBJ = [{ value: 'block', label: 'Rectangular block' }, { value: 'prism', label: 'Square prism' }, { value: 'house', label: 'House-like block (gable roof)' }];
  const LBL = ['A', 'B', 'C', 'D'];
  function pBuild(p) {
    const th = rad(p.theta); const l = p.l; const w = p.obj === 'prism' ? p.l : p.w; const Hh = p.hgt; const roof = p.obj === 'house' ? p.roof : 0;
    const u = [Math.cos(th), Math.sin(th)], v = [-Math.sin(th), Math.cos(th)];
    const A = [0, p.d0], B = [A[0] + u[0] * l, A[1] + u[1] * l], Dp = [A[0] + v[0] * w, A[1] + v[1] * w], Cp = [B[0] + v[0] * w, B[1] + v[1] * w];
    const base = [A, B, Cp, Dp];
    const verts = base.map((q) => [q[0], q[1], 0]).concat(base.map((q) => [q[0], q[1], Hh]));
    let faces;
    if (roof > 0) {
      verts.push([(A[0] + Dp[0]) / 2, (A[1] + Dp[1]) / 2, Hh + roof], [(B[0] + Cp[0]) / 2, (B[1] + Cp[1]) / 2, Hh + roof]);
      faces = [[0, 3, 2, 1], [0, 1, 5, 4], [2, 3, 7, 6], [3, 0, 4, 8, 7], [1, 2, 6, 9, 5], [4, 5, 9, 8], [6, 7, 8, 9]];
    } else faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
    const sol = G.mapSolid({ verts, faces, smooth: faces.map(() => false), kind: 'persp', axis: null }, (q) => q);
    const xs = p.e, Dd = p.D, h = p.h; const SP = [xs, -Dd, h];
    const kk = (q) => Dd / (Dd + q[1]);
    const proj = (q) => { const k = kk(q); return [xs + (q[0] - xs) * k, h + (q[2] - h) * k]; };
    const pv = sol.verts.map(proj);
    const faceVis = sol.faces.map((f, i) => G.dot(sol.normals[i], G.sub(SP, G.centroid(f.map((j) => sol.verts[j])))) > 1e-9);
    const edgeVis = sol.edges.map((e) => e.faces.some((fi) => faceVis[fi]));
    const sideVis = sol.edges.map((e) => e.faces.some((fi) => sol.normals[fi][0] > 1e-9));
    const planVis = sol.edges.map((e) => e.faces.some((fi) => sol.normals[fi][2] > 1e-9));
    // vanishing points on the HL (edges parallel to AB → u, parallel to AD → v)
    const vpx = (dir) => (Math.abs(dir[1]) < 1e-9 ? null : xs + (Dd * dir[0]) / dir[1]);
    const VR = vpx(u), VL = vpx(v);
    // edge families
    const fam = sol.edges.map((e) => {
      const a = sol.verts[e.a], b = sol.verts[e.b]; const d = G.sub(b, a); if (Math.abs(d[2]) > 1e-6) return d[0] === 0 && d[1] === 0 ? 'v' : 'o';
      const L2 = Math.hypot(d[0], d[1]); const c = (d[0] * u[0] + d[1] * u[1]) / L2; return Math.abs(Math.abs(c) - 1) < 1e-6 ? 'u' : Math.abs(c) < 1e-6 ? 'w' : 'o';
    });
    // true-height line for the VP method: the line through A that is closer to perpendicular to the PP
    const useU = p.theta > 45; const tdir = useU ? u : v;
    const T = [A[0] - (A[1] / tdir[1]) * tdir[0], 0];
    const angles = sol.verts.map((q) => deg(Math.atan(Math.hypot(q[0] - xs, q[2] - h) / (Dd + q[1]))));
    const far = sol.verts.reduce((bi, q, i) => (q[1] > sol.verts[bi][1] ? i : bi), 0);
    return { sol, base, pv, faceVis, edgeVis, sideVis, planVis, VR, VL, u, v, fam, T, useU, SP, xs, D: Dd, h, H: Hh, roof, w, l, proj, kk, maxAngle: Math.max(...angles), far };
  }
  function pLayout(m, p) {
    const V = m.sol.verts; const ymax = Math.max(...V.map((q) => q[1])); const zmax = Math.max(...V.map((q) => q[2]));
    let xs = V.map((q) => q[0]).concat(m.pv.map((q) => q[0]), [m.xs, m.T[0]]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const vps = [m.VL, m.VR].filter((x) => x != null);
    const sV = Math.min(3.6, 412 / (ymax + m.D + Math.max(m.h, zmax)), 290 / (m.D + ymax));
    const fitX = (a, b) => 560 / Math.max(1, b - a);
    const s0 = Math.min(sV, fitX(x0, x1));
    const a1 = Math.min(x0, ...vps), b1 = Math.max(x1, ...vps);
    const s1 = Math.min(sV, fitX(a1, b1));
    const withVP = s1 >= 0.55 * s0; const s = withVP ? s1 : s0;
    const lo = withVP ? a1 : x0, hi = withVP ? b1 : x1;
    const ox = 332 - ((lo + hi) / 2) * s;
    const ppY = 56 + ymax * s + 6; const glY = 532; const ppXs = 676 + m.D * s;
    return {
      s, ppY, glY, ppXs, withVP,
      PX: (x) => ox + x * s, PY: (y) => ppY - y * s, QY: (z) => glY - z * s, SX: (y) => ppXs + y * s,
      persp: (q) => [ox + q[0] * s, glY - q[1] * s],
    };
  }
  function pKeys(p) { return p.mode === 'vp' ? ['lines', 'sp', 'vps', 'th', 'tovp', 'rays', 'final'] : ['lines', 'sp', 'rays', 'drop', 'elev', 'join', 'vps']; }
  function pHandles(m, lay) {
    return {
      spPlan: [lay.PX(m.xs), lay.PY(-m.D)], spSide: [lay.SX(-m.D), lay.QY(m.h)],
      rot: [lay.PX(m.base[1][0]), lay.PY(m.base[1][1])],
      plan: m.base.map((q) => [lay.PX(q[0]), lay.PY(q[1])]),
      hlY: lay.QY(m.h),
    };
  }

  S['eg-perspective'] = {
    view2d: true,
    modes: [{ key: 'visual', label: 'Visual-ray method' }, { key: 'vp', label: 'Vanishing-point method' }],
    actions: [
      { key: 'centre', label: '⊙ SP opposite the object', title: 'Put the station point in line with the centre of the object' },
      { key: 'one', label: 'One-point (θ = 0°)', title: 'Face AB parallel to the PP' },
      { key: 'two', label: 'Two-point (θ = 30°)', title: 'Face AB at 30° to the PP' },
      { key: 'touch', label: 'Corner A on the PP', title: 'Object touching the picture plane' },
    ],
    initUi: () => ({ drag: null, snap: null, hover: null }),
    params: [
      { key: 'obj', label: 'Object', type: 'select', options: P_OBJ, default: 'block' },
      { key: 'l', label: 'Length AB (face inclined θ to PP)', type: 'range', min: 20, max: 80, step: 1, default: 50, unit: 'mm' },
      { key: 'w', label: 'Width AD', type: 'range', min: 15, max: 60, step: 1, default: 30, unit: 'mm', showIf: (p) => p.obj !== 'prism' },
      { key: 'hgt', label: 'Height', type: 'range', min: 15, max: 80, step: 1, default: 40, unit: 'mm' },
      { key: 'roof', label: 'Roof rise (ridge above eaves)', type: 'range', min: 5, max: 40, step: 1, default: 15, unit: 'mm', showIf: (p) => p.obj === 'house' },
      { key: 'theta', label: 'Face AB inclined to PP θ', type: 'range', min: 0, max: 80, step: 1, default: 30, unit: '°', help: '0° → face parallel to the PP (one-point perspective); otherwise two-point.' },
      { key: 'D', label: 'SP distance in front of PP', type: 'range', min: 40, max: 200, step: 1, default: 100, unit: 'mm' },
      { key: 'h', label: 'SP height above ground (horizon)', type: 'range', min: 0, max: 120, step: 1, default: 60, unit: 'mm' },
      { key: 'e', label: 'SP lateral offset (right of corner A)', type: 'range', min: -80, max: 120, step: 1, default: 20, unit: 'mm' },
      { key: 'd0', label: 'Corner A behind the PP', type: 'range', min: 0, max: 60, step: 1, default: 0, unit: 'mm' },
      { key: 'showHidden', label: 'Show hidden edges (dashed)', type: 'toggle', default: false },
    ],
    examples: [
      { label: 'Rectangular block 50×30×40, AB at 30° to PP, corner on PP', values: { obj: 'block', l: 50, w: 30, hgt: 40, theta: 30, D: 100, h: 60, e: 20, d0: 0 } },
      { label: 'Square prism, one-point (face parallel to PP), 20 mm behind', values: { obj: 'prism', l: 40, hgt: 50, theta: 0, D: 90, h: 70, e: 20, d0: 20 } },
      { label: 'House block at 45°, eye below the eaves', values: { obj: 'house', l: 60, w: 40, hgt: 35, roof: 20, theta: 45, D: 120, h: 25, e: 10, d0: 10 } },
      { label: 'Tall block seen from above (h = 110 mm)', values: { obj: 'block', l: 40, w: 30, hgt: 50, theta: 60, D: 110, h: 110, e: 0, d0: 5 } },
    ],
    validate(p) {
      const m = pBuild(p); const w = [];
      if (m.maxAngle > 30) w.push(`A corner is ${fmt(m.maxAngle, 3)}° from the central visual ray — outside the 60° cone of vision, so the perspective looks distorted. Move the SP further from the PP.`);
      if (p.h === 0) w.push('SP on the ground: the horizon coincides with the ground line.');
      return w;
    },
    compute(p) {
      const m = pBuild(p); const two = p.theta > 0; const A = m.sol.verts[0]; const Fq = m.sol.verts[m.far];
      const hA = m.H * m.kk(A); const hF = m.H * m.kk(Fq); const pf = m.proj(Fq);
      const vr = m.VR == null ? '∞ (AB ∥ PP)' : `${fmt(m.VR - m.xs, 4)} mm from CV`; const vl = m.VL == null ? '∞' : `${fmt(m.VL - m.xs, 4)} mm from CV`;
      const formulas = [
        { name: 'Central projection on the picture plane', formula: 'x_p = x_s + (x − x_s)·D/(D + y),   z_p = h + (z − h)·D/(D + y)', given: `SP: x_s = ${m.xs}, D = ${m.D}, h = ${m.h} mm; far top corner (${fmt(Fq[0], 3)}, ${fmt(Fq[1], 3)}, ${fmt(Fq[2], 3)}) mm`, calc: `k = ${m.D}/(${m.D} + ${fmt(Fq[1], 3)}) = ${fmt(m.kk(Fq), 4)}`, result: `x_p = ${fmt(pf[0], 4)}, z_p = ${fmt(pf[1], 4)}`, unit: 'mm' },
        { name: 'Perspective height of a vertical edge', formula: 'h_p = H · D / (D + y)', given: `H = ${m.H} mm; corner A at y = ${p.d0} mm, far corner at y = ${fmt(Fq[1], 3)} mm`, calc: `A: ${m.H}×${m.D}/${fmt(m.D + A[1], 4)};  far: ${m.H}×${m.D}/${fmt(m.D + Fq[1], 4)}`, result: `A: ${fmt(hA, 4)} mm${p.d0 === 0 ? ' (true height — A lies in the PP)' : ''};  far: ${fmt(hF, 4)} mm`, unit: 'mm' },
        { name: 'Vanishing points on the horizon', formula: two ? 'CV→VR = D·cot θ,  CV→VL = D·tan θ  (VL·SP·VR = 90°)' : 'θ = 0: edges ⟂ PP vanish at the centre of vision CV; edges ∥ PP stay parallel', given: `D = ${m.D} mm, θ = ${p.theta}°`, calc: two ? `${m.D}·cot ${p.theta}° = ${fmt(m.VR - m.xs, 4)},  ${m.D}·tan ${p.theta}° = ${fmt(m.xs - m.VL, 4)}` : 'x_VP = x_s', result: two ? `VL·VR = 2D / sin 2θ = ${fmt(m.VR - m.VL, 4)}` : `single VP at CV (x = ${m.xs} mm)`, unit: 'mm' },
        { name: 'Cone of vision check', formula: 'α = atan( √((x − x_s)² + (z − h)²) / (D + y) ) ≤ 30°', given: 'largest angle of any corner from the central visual ray', calc: '', result: `${fmt(m.maxAngle, 3)}° ${m.maxAngle <= 30 ? '(inside the 60° cone)' : '(outside — distortion)'}`, unit: 'degrees (°)' },
      ];
      const readouts = [
        { label: 'Type', value: two ? 'Two-point' : 'One-point', tone: 'info' },
        { label: 'VL', value: vl }, { label: 'VR', value: vr },
        { label: 'Height at A', value: `${fmt(hA, 3)} mm`, tone: p.d0 === 0 ? 'good' : undefined },
        { label: 'Cone', value: `${fmt(m.maxAngle, 3)}°`, tone: m.maxAngle > 30 ? 'bad' : 'good' },
      ];
      const nm = (P_OBJ.find((q) => q.value === p.obj) || P_OBJ[0]).label;
      const size = p.obj === 'prism' ? `${p.l} × ${p.l} × ${p.hgt} mm` : `${p.l} × ${p.w} × ${p.hgt} mm${p.obj === 'house' ? ` + ${p.roof} mm roof` : ''}`;
      const state = {
        object: nm, size, method: p.mode === 'vp' ? 'vanishing-point method' : 'visual-ray method', perspectiveType: two ? 'two-point (angular)' : 'one-point (parallel)',
        faceABInclinationToPP: `${p.theta}°`, stationPoint: `D = ${m.D} mm in front of PP, h = ${m.h} mm above GL, ${m.xs} mm right of corner A`,
        objectDistanceBehindPP: `${p.d0} mm`, VL: vl, VR: vr, perspectiveHeightA: `${fmt(hA, 4)} mm`, perspectiveHeightFar: `${fmt(hF, 4)} mm`,
        coneOfVision: `${fmt(m.maxAngle, 3)}°`, visibleEdges: m.edgeVis.filter(Boolean).length, hiddenEdges: m.edgeVis.filter((x) => !x).length,
      };
      return {
        formulas, readouts, state,
        explain: {
          what: `A ${nm.toLowerCase()} (${size}) stands ${p.d0} mm behind the picture plane with face AB at ${p.theta}° to it. Visual rays from the station point (${m.D} mm in front, eye ${m.h} mm high) pierce the PP; the piercing points form the ${two ? 'two' : 'one'}-point perspective.`,
          why: 'A perspective is a central projection: all projectors (visual rays) meet at the eye (SP). Points further behind the PP are scaled by D/(D + y), so far edges look shorter, and parallel receding edges converge to a vanishing point on the horizon — found by a line from the SP parallel to those edges.',
          param: `SP distance D = ${m.D} mm, eye height h = ${m.h} mm, lateral offset ${m.xs} mm, object ${p.d0} mm behind PP, θ = ${p.theta}°, object size.`,
          effect: `Moving the object back reduces every height by D/(D + y) (A: ${fmt(hA, 3)} mm). Raising the eye shows more of the top face; a larger D flattens the perspective and pushes VL/VR apart (VL·VR = ${m.VL != null && m.VR != null ? fmt(m.VR - m.VL, 4) + ' mm' : 'infinite for θ = 0'}).`,
        },
      };
    },
    steps(p) {
      const two = p.theta > 0;
      const T = {
        lines: { title: 'Picture plane, ground line and horizon', text: `Draw the PP in plan, the GL, and the HL ${p.h} mm above the GL. The object's plan is placed ${p.d0} mm behind the PP with AB at ${p.theta}°.` },
        sp: { title: 'Station point in plan and elevation', text: `SP is ${p.D} mm in front of the PP in plan and ${p.h} mm above the GL in the side elevation. CV (centre of vision) lies on the HL opposite the SP. Drag the SP!` },
        rays: { title: p.mode === 'vp' ? 'Visual rays locate the corners' : 'Visual rays in plan', text: p.mode === 'vp' ? 'Rays from SP to each plan corner pierce the PP; verticals dropped from these points cut the lines to the vanishing points.' : 'Join SP to every corner of the plan; each visual ray pierces the PP line at a point.' },
        drop: { title: 'Drop the piercing points', text: 'Project each piercing point vertically down into the perspective area — these are the positions of the vertical edges.' },
        elev: { title: 'Visual rays in the side elevation (heights)', text: 'Rays from SP to each corner in the side elevation pierce the PP at the perspective heights: h_p = H·D/(D + y). Project them horizontally.' },
        join: { title: 'Join the points — the perspective', text: 'The intersections give the perspective corners. Join them: visible edges thick, hidden edges omitted.' },
        vps: { title: two ? 'Vanishing points VL and VR' : 'Vanishing point = CV', text: two ? 'Lines from SP parallel to AB and AD meet the PP; dropped to the HL they give VR and VL. Receding edges converge there.' : 'Edges perpendicular to the PP vanish at CV; edges parallel to the PP stay parallel.' },
        th: { title: 'True-height line', text: p.d0 === 0 ? 'Corner A lies in the PP, so its vertical edge shows the TRUE height.' : 'Extend a face of the plan to meet the PP at T; at T the height is true — the true-height line.' },
        tovp: { title: 'Lines to the vanishing point', text: 'Join the top and bottom of the true-height line to the vanishing point: the edges of that face lie on these lines.' },
        final: { title: 'Complete the perspective', text: 'Join the corners to VL / VR; visible edges thick, hidden edges omitted.' },
      };
      return pKeys(p).map((k) => T[k]);
    },
    onAction(key, S2) {
      const { p } = S2; const m = pBuild(p);
      if (key === 'centre') { const cx = R(m.base.reduce((s, q) => s + q[0], 0) / 4); return { params: { e: clamp(cx, -80, 120) }, toast: 'SP placed opposite the centre of the object' }; }
      if (key === 'one') return { params: { theta: 0 }, toast: 'One-point perspective: face AB parallel to the PP' };
      if (key === 'two') return { params: { theta: 30 }, toast: 'Two-point perspective: AB at 30° to the PP' };
      if (key === 'touch') return { params: { d0: 0 }, toast: 'Corner A touches the PP — its edge shows the true height' };
      return null;
    },
    onPointer(type, x0, y0, S2) {
      const { p, ui } = S2; const [x, y] = S2.world ? S2.world.toWorld(x0, y0) : [x0, y0];
      const m = pBuild(p); const lay = pLayout(m, p); const hd = pHandles(m, lay); const s = lay.s;
      const near = (q, r) => Math.hypot(x - q[0], y - q[1]) <= r;
      if (type === 'hover') {
        const hv = near(hd.spPlan, 18) ? 'spPlan' : near(hd.spSide, 18) ? 'spSide' : near(hd.rot, 14) ? 'rot' : pointInPoly([x, y], hd.plan) ? 'obj' : null;
        if (hv !== ui.hover) { ui.hover = hv; return { redraw: true }; }
        return null;
      }
      if (type === 'down') {
        const kind = near(hd.spPlan, 18) ? 'spPlan' : near(hd.spSide, 18) ? 'spSide' : near(hd.rot, 14) ? 'rot' : pointInPoly([x, y], hd.plan) ? 'obj' : Math.abs(y - hd.hlY) < 8 && x < 650 ? 'hl' : null;
        if (!kind) return null;
        ui.drag = { kind, x, y, e: p.e, D: p.D, h: p.h, d0: p.d0, s, lay }; ui.snap = null;
        return { redraw: true };
      }
      if (!ui.drag) return null;
      if (type === 'up') { ui.drag = null; ui.snap = null; return { recompute: true }; }
      const dg = ui.drag; const L0 = dg.lay; const g5 = (v) => Math.round(v / 5) * 5; let snap = null; const out = {};
      const cornerXs = m.base.map((q, i) => ({ x: q[0], label: `SP in line with ${LBL[i]}` })).concat([{ x: m.base.reduce((a, q) => a + q[0], 0) / 4, label: 'SP opposite the centre' }]);
      if (dg.kind === 'spPlan' || dg.kind === 'spSide') {
        if (dg.kind === 'spPlan') {
          let e = (x - L0.PX(0)) / dg.s; const cand = cornerXs.find((c) => Math.abs(c.x - e) * dg.s < 12);
          if (cand) { e = R(cand.x); snap = { x: L0.PX(cand.x), y: y, label: cand.label }; } else { e = g5(e); }
          out.e = clamp(e, -80, 120); out.D = clamp(g5((y - L0.ppY) / dg.s), 40, 200);
          if (!snap) snap = { x: L0.PX(out.e), y: L0.PY(-out.D), label: 'Grid 5 mm' };
        } else {
          out.D = clamp(g5((L0.ppXs - x) / dg.s), 40, 200); let h = (L0.glY - y) / dg.s;
          if (Math.abs(h - m.H) * dg.s < 12) { h = m.H; snap = { x, y: L0.QY(h), label: 'Eye level = top of object' }; } else if (h * dg.s < 12) { h = 0; snap = { x, y: L0.glY, label: 'Eye on the ground' }; } else h = g5(h);
          out.h = clamp(h, 0, 120); if (!snap) snap = { x: L0.SX(-out.D), y: L0.QY(out.h), label: 'Grid 5 mm' };
        }
      } else if (dg.kind === 'hl') {
        let h = (L0.glY - y) / dg.s; if (Math.abs(h - m.H) * dg.s < 12) { h = m.H; snap = { x, y: L0.QY(h), label: 'Horizon at the top of the object' }; } else h = g5(h);
        out.h = clamp(h, 0, 120);
      } else if (dg.kind === 'obj') {
        const dx = (x - dg.x) / dg.s, dy = (y - dg.y) / dg.s;
        out.e = clamp(R(dg.e - dx), -80, 120); let d0 = dg.d0 - dy;
        if (d0 * dg.s < 12) { d0 = 0; snap = { x: L0.PX(m.base[0][0] - (out.e - p.e)), y: L0.ppY, label: 'Touching PP' }; } else d0 = g5(d0);
        out.d0 = clamp(d0, 0, 60);
      } else if (dg.kind === 'rot') {
        const A = [L0.PX(0), L0.PY(p.d0)]; let th = deg(Math.atan2(A[1] - y, x - A[0]));
        th = clamp(Math.round(th / 5) * 5, 0, 80); out.theta = th; snap = { x, y, label: `θ = ${th}°` };
      }
      ui.snap = snap;
      const changed = Object.keys(out).some((k) => out[k] !== p[k]);
      return changed ? { params: out } : { redraw: true };
    },
    draw(g, S2) {
      const { p, step, st, dur, t, ui } = S2; const prog = clamp(st / dur, 0, 1);
      const m = pBuild(p); const lay = pLayout(m, p); const keys = pKeys(p); const cur = keys[Math.min(step, keys.length - 1)];
      const at = (k) => keys.indexOf(k) >= 0 && step >= keys.indexOf(k); const fr = (k) => (cur === k ? prog : 1);
      D.clear(g, '#ffffff');
      g.save(); if (S2.world) S2.world.apply(g);
      const { PX, PY, QY, SX, s } = lay; const V = m.sol.verts; const hd = pHandles(m, lay);
      const BLUE = '#2563eb', ORANGE = '#ea580c', GREEN = '#16a34a', VIO = '#7c3aed';
      // region labels
      D.tag(g, 'PLAN (top view)', 24, 22, { bg: '#334155', size: 14 });
      D.tag(g, 'SIDE ELEVATION', 672, 22, { bg: '#334155', size: 14 });
      D.tag(g, 'PERSPECTIVE', 24, 548, { bg: '#334155', size: 14 });
      D.line(g, 652, 36, 652, 548, { color: '#e2e8f0', width: 1.5 });
      // PP, GL, HL
      D.line(g, 30, lay.ppY, 640, lay.ppY, { color: INK, width: 2 }); D.text(g, 'PP', 644, lay.ppY, { size: 16, weight: 800 });
      D.line(g, 30, lay.glY, 985, lay.glY, { color: INK, width: 2 }); D.text(g, 'GL', 30, lay.glY - 12, { size: 16, weight: 800 });
      const hlY = QY(m.h);
      if (at('lines')) {
        D.line(g, 30, hlY, 985, hlY, { color: VIO, width: 1.8, dash: [10, 5] }); D.text(g, 'HL', 30, hlY - 12, { size: 16, weight: 800, color: VIO });
        D.line(g, SX(0), 44, SX(0), lay.glY + 8, { color: INK, width: 2 }); D.text(g, 'PP', SX(0) + 6, 50, { size: 16, weight: 800 });
      }
      if (cur === 'lines') { D.focus(g, 28, lay.ppY - 10, 620, 20, t); D.focus(g, 28, Math.min(hlY, lay.glY) - 10, 958, Math.abs(lay.glY - hlY) + 20, t); }
      // plan of the object
      const PL = (q) => [PX(q[0]), PY(q[1])];
      m.sol.edges.forEach((e, i) => { if (!m.planVis[i]) return; const a = PL(V[e.a]), b = PL(V[e.b]); D.line(g, a[0], a[1], b[0], b[1], { color: INK, width: 2.2 }); });
      D.poly(g, hd.plan, { fill: ui.hover === 'obj' || (ui.drag && ui.drag.kind === 'obj') ? '#bfdbfe' : '#dbeafe', close: true, stroke: false, alpha: 0.6 });
      m.base.forEach((q, i) => { const P = PL(q); const c = G.centroid(m.base.map((b) => [b[0], b[1], 0])); const dx = P[0] - PX(c[0]), dy = P[1] - PY(c[1]); const dl = Math.hypot(dx, dy) || 1; D.text(g, LBL[i], P[0] + (dx / dl) * 13, P[1] + (dy / dl) * 13, { size: 15, weight: 800, align: 'center', halo: true }); });
      // rotation handle at B
      D.circle(g, hd.rot[0], hd.rot[1], ui.hover === 'rot' ? 9 : 7, { fill: '#fff', stroke: ORANGE, width: 2.4 });
      if (p.theta > 0) { const A = PL(m.base[0]); g.save(); g.strokeStyle = ORANGE; g.lineWidth = 1.6; g.beginPath(); g.arc(A[0], A[1], 30, -rad(p.theta), 0); g.stroke(); g.restore(); D.line(g, A[0], A[1], A[0] + 44, A[1], { color: ORANGE, width: 1, dash: [4, 3] }); D.text(g, `θ = ${p.theta}°`, A[0] + 48, A[1] + 14, { size: 15, weight: 800, color: ORANGE, halo: true }); }
      // side elevation of the object
      const SE = (q) => [SX(q[1]), QY(q[2])];
      m.sol.edges.forEach((e, i) => { const a = SE(V[e.a]), b = SE(V[e.b]); if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5) return; D.line(g, a[0], a[1], b[0], b[1], m.sideVis[i] ? { color: INK, width: 2.2 } : { ...G.LINE.hidden, width: 1.2 }); });
      // station point
      if (at('sp')) {
        const sp = hd.spPlan, ss = hd.spSide; const act = (k) => ui.hover === k || (ui.drag && ui.drag.kind === k);
        [[sp, 'spPlan'], [ss, 'spSide']].forEach(([q, k]) => { D.circle(g, q[0], q[1], act(k) ? 11 : 8, { fill: '#dc2626', stroke: '#fff', width: 2 }); });
        D.text(g, 'SP', sp[0] + 13, sp[1] + 2, { size: 16, weight: 800, color: '#dc2626', halo: true });
        D.text(g, 'SP', ss[0], ss[1] - 18, { size: 16, weight: 800, color: '#dc2626', halo: true, align: 'center' });
        D.line(g, sp[0], sp[1], sp[0], lay.ppY, { color: '#dc2626', width: 1, dash: [3, 4] });
        odim(g, [sp[0] - 34, lay.ppY], [sp[0] - 34, sp[1]], 'in', 0, `D = ${m.D}`, '#b91c1c');
        if (m.h > 8) odim(g, [ss[0] - 16, lay.glY], [ss[0] - 16, ss[1]], 'in', 0, `h = ${m.h}`, '#b91c1c');
        const cv = [PX(m.xs), hlY]; D.circle(g, cv[0], cv[1], 5, { fill: VIO }); D.text(g, 'CV', cv[0] + 6, cv[1] + 14, { size: 15, weight: 800, color: VIO, halo: true });
        if (cur === 'sp') { D.focus(g, sp[0] - 22, sp[1] - 22, 44, 44, t); D.focus(g, ss[0] - 22, ss[1] - 22, 44, 44, t); }
      }
      // visual rays in plan + piercing points
      const planPts = []; V.forEach((q) => { if (!planPts.some((r) => Math.abs(r[0] - q[0]) + Math.abs(r[1] - q[1]) < 1e-6)) planPts.push(q); });
      const pierce = (q) => m.xs + (q[0] - m.xs) * m.kk(q);
      const hidPt = (q) => !m.sol.edges.some((e, i) => m.edgeVis[i] && (V[e.a] === q || V[e.b] === q));
      if (at('rays')) {
        const f = fr('rays');
        planPts.forEach((q) => { const sp = hd.spPlan, P = PL(q); const hdn = hidPt(q) && !V.some((r) => r !== q && Math.abs(r[0] - q[0]) + Math.abs(r[1] - q[1]) < 1e-6 && !hidPt(r)); D.line(g, sp[0], sp[1], sp[0] + (P[0] - sp[0]) * f, sp[1] + (P[1] - sp[1]) * f, { color: GREEN, width: 1.2, alpha: hdn ? 0.45 : 0.9, dash: hdn ? [5, 4] : undefined }); if (f >= 1) D.circle(g, PX(pierce(q)), lay.ppY, 3.5, { fill: GREEN }); });
        if (cur === 'rays') D.focus(g, Math.min(...planPts.map((q) => PX(q[0])), hd.spPlan[0]) - 10, PY(Math.max(...V.map((q) => q[1]))) - 10, Math.max(...planPts.map((q) => PX(q[0])), hd.spPlan[0]) - Math.min(...planPts.map((q) => PX(q[0])), hd.spPlan[0]) + 20, hd.spPlan[1] - PY(Math.max(...V.map((q) => q[1]))) + 20, t);
      }
      const dropped = p.mode === 'vp' ? at('rays') : at('drop');
      if (dropped) {
        const f = p.mode === 'vp' ? fr('rays') : fr('drop');
        planPts.forEach((q) => { const X = PX(pierce(q)); const yb = Math.max(...V.filter((r) => Math.abs(r[0] - q[0]) + Math.abs(r[1] - q[1]) < 1e-6).map((r) => lay.persp(m.proj(r))[1])); D.line(g, X, lay.ppY, X, lay.ppY + (yb + 6 - lay.ppY) * f, G.LINE.projector); });
      }
      if (p.mode !== 'vp' && at('elev')) {
        const f = fr('elev'); const ss = hd.spSide;
        V.forEach((q) => { const P = SE(q); D.line(g, ss[0], ss[1], ss[0] + (P[0] - ss[0]) * f, ss[1] + (P[1] - ss[1]) * f, { color: ORANGE, width: 1.1, alpha: 0.85 }); });
        if (f >= 1) V.forEach((q) => { const zp = m.proj(q)[1]; D.circle(g, SX(0), QY(zp), 3, { fill: ORANGE }); const X = lay.persp(m.proj(q))[0]; D.line(g, SX(0), QY(zp), X, QY(zp), { color: ORANGE, width: 1, dash: [3, 4], alpha: 0.7 }); });
        if (cur === 'elev') D.focus(g, ss[0] - 14, Math.min(ss[1], QY(m.H + m.roof)) - 14, SX(Math.max(...V.map((q) => q[1]))) - ss[0] + 28, lay.glY - Math.min(ss[1], QY(m.H + m.roof)) + 28, t);
      }
      // vanishing points
      const showVP = at('vps');
      if (showVP) {
        const f = fr('vps'); const sp = hd.spPlan;
        [[m.VR, m.u, 'VR'], [m.VL, m.v, 'VL']].forEach(([vx, dir, nm]) => {
          if (vx == null) return;
          const tgt = [PX(vx), lay.ppY]; const on = tgt[0] >= 24 && tgt[0] <= 648;
          let end = tgt; if (!on) { const X = clamp(tgt[0], 24, 648); const tt = (X - sp[0]) / (tgt[0] - sp[0]); end = [X, sp[1] + (tgt[1] - sp[1]) * tt]; }
          D.line(g, sp[0], sp[1], sp[0] + (end[0] - sp[0]) * f, sp[1] + (end[1] - sp[1]) * f, { color: VIO, width: 1.4, dash: [8, 4] });
          if (f < 1) return;
          if (on) { D.line(g, tgt[0], tgt[1], tgt[0], hlY, { color: VIO, width: 1, dash: [3, 4] }); D.circle(g, tgt[0], hlY, 6, { fill: VIO }); if (p.theta > 0) D.tag(g, nm, tgt[0], hlY - 20, { bg: VIO, size: 14, align: 'center' }); }
          else { const X = clamp(tgt[0], 30, 640); D.arrow(g, X < 330 ? X + 40 : X - 40, hlY, X, hlY, { color: VIO, width: 2.5 }); D.tag(g, `${nm} off sheet (${fmt(vx - m.xs, 3)} mm from CV)`, X < 330 ? X + 46 : X - 46, hlY - 20, { bg: VIO, size: 14, align: X < 330 ? 'left' : 'right' }); }
        });
        if (p.theta > 0 && m.VL != null && m.VR != null && f >= 1) { g.save(); g.strokeStyle = VIO; g.lineWidth = 1.5; const a1 = Math.atan2(-m.v[1], m.v[0]), a2 = Math.atan2(-m.u[1], m.u[0]); g.beginPath(); g.arc(sp[0], sp[1], 22, Math.min(a1, a2), Math.max(a1, a2)); g.stroke(); g.restore(); D.text(g, '90°', sp[0], sp[1] - 34, { size: 14, weight: 800, color: VIO, align: 'center', halo: true }); }
        if (p.theta === 0 && f >= 1) D.text(g, '= VP', PX(m.xs) + 34, hlY + 14, { size: 15, weight: 800, color: VIO, halo: true });
      }
      // VP method: true-height line and lines to VP
      if (p.mode === 'vp' && at('th')) {
        const T = m.T; const X = PX(T[0]); const vpx = m.useU ? m.VR : m.VL; const dirLbl = m.useU ? 'AB' : 'AD';
        const A = PL(m.base[0]); D.line(g, A[0], A[1], X, lay.ppY, { color: '#0891b2', width: 1.4, dash: [6, 4] }); D.circle(g, X, lay.ppY, 4, { fill: '#0891b2' }); D.text(g, 'T', X - 8, lay.ppY - 12, { size: 15, weight: 800, color: '#0891b2', halo: true, align: 'right' });
        D.line(g, X, lay.ppY, X, lay.glY, G.LINE.projector);
        const f = fr('th'); D.line(g, X, lay.glY, X, lay.glY - m.H * s * f, { color: '#0891b2', width: 3.5 });
        if (f >= 1) D.tag(g, `True height ${m.H} mm`, X - 8, QY(m.H / 2), { bg: '#0891b2', size: 14, align: 'right' });
        if (cur === 'th') D.focus(g, X - 16, QY(m.H) - 10, 32, m.H * s + 20, t);
        if (at('tovp') && vpx != null) {
          const f2 = fr('tovp'); const VPp = [PX(vpx), hlY];
          [0, m.H].forEach((z) => { const P0 = [X, QY(z)]; D.line(g, P0[0], P0[1], P0[0] + (VPp[0] - P0[0]) * f2, P0[1] + (VPp[1] - P0[1]) * f2, { color: '#0891b2', width: 1.2, dash: [6, 4] }); });
          if (cur === 'tovp') D.tag(g, `Face through ${dirLbl} lies between these lines`, clamp(X, 200, 460), QY(m.H) - 30, { bg: '#0891b2', size: 14, align: 'center' });
        }
      }
      // perspective
      const joinK = p.mode === 'vp' ? 'final' : 'join';
      const pp = m.pv.map(lay.persp);
      if (at(joinK)) {
        const f = fr(joinK);
        m.sol.faces.forEach((fc, i) => { if (m.faceVis[i]) D.poly(g, fc.map((j) => pp[j]), { fill: '#bfdbfe', close: true, stroke: false, alpha: 0.45 * f }); });
        m.sol.edges.forEach((e, i) => { const a = pp[e.a], b = pp[e.b]; const B = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; if (m.edgeVis[i]) D.line(g, a[0], a[1], B[0], B[1], { color: INK, width: 2.8 }); else if (p.showHidden) D.line(g, a[0], a[1], B[0], B[1], { ...G.LINE.hidden, width: 1.3 }); });
        if (f >= 1) m.base.forEach((q, i) => { const j = i; if (!m.edgeVis.some((v2, k) => v2 && (m.sol.edges[k].a === j || m.sol.edges[k].b === j)) && !p.showHidden) return; const P = pp[j]; D.text(g, LBL[i].toLowerCase(), P[0], P[1] + 14, { size: 15, weight: 800, align: 'center', halo: true, color: '#1e3a8a' }); });
        if (cur === joinK) { const xs = pp.map((q) => q[0]), ys = pp.map((q) => q[1]); D.focus(g, Math.min(...xs) - 8, Math.min(...ys) - 8, Math.max(...xs) - Math.min(...xs) + 16, Math.max(...ys) - Math.min(...ys) + 16, t); }
      } else if (p.mode !== 'vp' && at('elev')) {
        pp.forEach((q) => D.circle(g, q[0], q[1], 3.5, { fill: INK }));
      } else if (p.mode === 'vp' && at('rays')) {
        pp.forEach((q, i) => { if (i < 8 && (Math.abs(V[i][2]) < 1e-9 || Math.abs(V[i][2] - m.H) < 1e-9)) D.circle(g, q[0], q[1], 3.5, { fill: INK }); });
      }
      // convergence check: receding edges extended to the VPs
      if (showVP && fr('vps') >= 1 && at(joinK)) {
        m.sol.edges.forEach((e, i) => {
          const fam = m.fam[i]; const vx = fam === 'u' ? m.VR : fam === 'w' ? m.VL : null; if (vx == null) return; if (!m.edgeVis[i] && !p.showHidden) return;
          const a = pp[e.a], b = pp[e.b]; const Vp = [PX(vx), hlY]; const n = Math.hypot(a[0] - Vp[0], a[1] - Vp[1]) < Math.hypot(b[0] - Vp[0], b[1] - Vp[1]) ? a : b;
          D.line(g, n[0], n[1], Vp[0], Vp[1], { color: VIO, width: 1, dash: [4, 4], alpha: 0.7 });
        });
      }
      if (p.mode === 'vp' && cur === 'final') {
        const vpx = m.useU ? m.VL : m.VR; if (vpx != null) m.sol.edges.forEach((e, i) => { const fam = m.fam[i]; if (fam !== (m.useU ? 'w' : 'u') || !m.edgeVis[i]) return; const a = pp[e.a], b = pp[e.b]; const Vp = [PX(vpx), hlY]; const n = Math.hypot(a[0] - Vp[0], a[1] - Vp[1]) < Math.hypot(b[0] - Vp[0], b[1] - Vp[1]) ? a : b; D.line(g, n[0], n[1], Vp[0], Vp[1], { color: VIO, width: 1, dash: [4, 4], alpha: 0.6 }); });
      }
      // height formula tag for corner A
      if (at(joinK)) {
        const hA = m.H * m.kk(V[0]); const P = pp[4];
        D.tag(g, `h_A = ${m.H}×${m.D}/(${m.D}+${p.d0}) = ${fmt(hA, 3)} mm`, 985, 548, { bg: '#1e3a8a', size: 14, align: 'right' }); void P;
      }
      snapMarker(g, ui.snap);
      g.restore();
      if (!ui.drag) D.text(g, 'Drag: SP (red) · object plan · θ handle · HL', 410, 22, { size: 14, color: C.muted, align: 'center' });
    },
  };
})();
