'use strict';

/*
 * Engineering Graphics — Unit 3 "Orthographic Projection" (points, lines, planes/laminae) and
 * Unit 4 "Projection of Solids" (prism, pyramid, cylinder, cone in all standard positions,
 * change-of-position / 2- and 3-stage method). First-angle projection (BIS SP 46), mm.
 *
 * Model coordinates follow EGGeom: x along XY, y = distance in front of the VP, z = height above the HP.
 */
(function () {
  const S = (window.EGSims = window.EGSims || {});
  const D = window.EPDraw; const G = window.EGGeom;
  const { C, fmt, clamp } = D;
  const rad = G.rad, deg = G.deg;
  const VCOL = { fv: '#2563eb', tv: '#16a34a', sv: '#d97706' };
  const SUBS = ['', '₁', '₂', '₃'];
  const LET = 'abcdefghijklmnopqrstuvwxyz';
  const POLY = { 3: 'triangular', 4: 'square', 5: 'pentagonal', 6: 'hexagonal' };
  const f3 = (v) => fmt(v, 3);
  const f4 = (v) => fmt(v, 4);

  // ───────────────────────── shared drawing helpers ─────────────────────────
  /** Collision-free label placer: tries positions around a point, skips a label rather than overlapping. */
  function labeler(g, rect) {
    const boxes = [];
    const fits = (b) => b.x0 >= rect[0] && b.x1 <= rect[0] + rect[2] && b.y0 >= rect[1] && b.y1 <= rect[1] + rect[3] &&
      !boxes.some((q) => b.x0 < q.x1 && b.x1 > q.x0 && b.y0 < q.y1 && b.y1 > q.y0);
    const L = {
      block(x0, y0, x1, y1) { boxes.push({ x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1) }); },
      put(str, x, y, ux, uy, o = {}) {
        const size = o.size || 15; const w = D.textWidth(g, str, size, 700) + 4; const h = size + 2;
        let l = Math.hypot(ux, uy); if (!(l > 1e-6)) { ux = 0.7; uy = -0.7; l = 1; } ux /= l; uy /= l;
        const angs = o.angs || [0, 0.55, -0.55, 1.1, -1.1, 1.65, -1.65, 2.3, -2.3, Math.PI];
        const rs = o.rs || [9, 17, 27];
        let first = null;
        const put = (cx, cy, b) => { boxes.push(b); D.text(g, str, cx, cy, { size, weight: o.weight || 700, color: o.color || C.ink, align: 'center', halo: true }); };
        for (const r of rs) {
          for (const a of angs) {
            const c = Math.cos(a), s = Math.sin(a); const dx = ux * c - uy * s, dy = ux * s + uy * c;
            const cx = x + dx * (r + (w / 2) * Math.abs(dx)), cy = y + dy * (r + (h / 2) * Math.abs(dy));
            const b = { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
            if (!first) first = [cx, cy, b];
            if (fits(b)) { put(cx, cy, b); return true; }
          }
        }
        if (o.force && first) { put(first[0], first[1], first[2]); return true; }
        return false;
      },
    };
    return L;
  }
  /** Partial line A→B (fraction f). */
  function pline(g, A, B, f, style) { if (f <= 0) return; D.line(g, A[0], A[1], A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, style); }
  /** Angle arc at (cx,cy) from screen angle a0 to a1 (short way) with a label. */
  function arcMark(g, cx, cy, r, a0, a1, label, col, lab) {
    let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    if (Math.abs(d) < 0.01) return;
    g.save(); g.beginPath(); g.arc(cx, cy, r, a0, a0 + d, d < 0); g.strokeStyle = col; g.lineWidth = 1.8; g.stroke(); g.restore();
    if (label) {
      const am = a0 + d / 2; const lx = cx + Math.cos(am) * (r + 4), ly = cy + Math.sin(am) * (r + 4);
      if (lab) lab.put(label, lx, ly, Math.cos(am), Math.sin(am), { color: col, size: 15, rs: [3, 12, 22], force: true });
      else D.text(g, label, lx + Math.cos(am) * 16, ly + Math.sin(am) * 10, { size: 15, weight: 800, color: col, align: 'center', halo: true });
    }
  }
  /** Dimension on the side of the segment that points towards `side` (a screen vector). */
  function dimTo(g, a, b, text, side, off, o = {}) {
    const dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy); if (L < 6) return;
    const nx = -dy / L, ny = dx / L; const sg = nx * side[0] + ny * side[1] >= 0 ? 1 : -1;
    G.dim(g, a, b, text, { offset: sg * off, size: o.size || 15, color: o.color });
  }
  function panel(g, x, y, w, h, title) {
    D.rect(g, x, y, w, h, { fill: '#f8fafc', stroke: '#cbd5e1', width: 1.5, r: 10 });
    D.text(g, title, x + 14, y + 22, { size: 17, weight: 800 });
  }
  /** Reference planes for any quadrant: HP (z = 0), VP (y = 0), optional PP (x = pp); optional rotation of HP/PP (first-angle opening). */
  function planes3(g, P, xr, yr, zr, o = {}) {
    const hpRot = o.hpRot || 0, ppRot = o.ppRot || 0;
    const hpM = (q) => [q[0], q[1] * Math.cos(hpRot), -q[1] * Math.sin(hpRot)];
    const ppM = (q) => [o.pp + q[1] * Math.sin(ppRot), q[1] * Math.cos(ppRot), q[2]];
    const quad = (pts, fill) => D.poly(g, pts.map((p) => { const q = P(p); return [q.x, q.y]; }), { fill, close: true, stroke: '#64748b', width: 1, alpha: 0.32 });
    if (o.vp !== false) quad([[xr[0], 0, zr[0]], [xr[1], 0, zr[0]], [xr[1], 0, zr[1]], [xr[0], 0, zr[1]]], '#bfdbfe');
    if (o.hp !== false) quad([[xr[0], yr[0], 0], [xr[1], yr[0], 0], [xr[1], yr[1], 0], [xr[0], yr[1], 0]].map(hpM), '#bbf7d0');
    if (o.pp != null) quad([[o.pp, yr[0], zr[0]], [o.pp, yr[1], zr[0]], [o.pp, yr[1], zr[1]], [o.pp, yr[0], zr[1]]].map(ppM), '#fde68a');
    const a = P([xr[0], 0, 0]), b = P([xr[1], 0, 0]);
    D.line(g, a.x, a.y, b.x, b.y, { color: '#0f172a', width: 2 });
    D.text(g, 'X', a.x - 8, a.y, { size: 16, weight: 800, align: 'right', halo: true });
    D.text(g, 'Y', b.x + 8, b.y, { size: 16, weight: 800, halo: true });
    const tg = (label, q, bg) => { const s = P(q); D.tag(g, label, s.x, s.y, { bg, size: 14, align: 'center' }); };
    if (o.vp !== false) tg('VP', [xr[0] + 14, 0, zr[1] - 8], '#1d4ed8');
    if (o.hp !== false) tg('HP', hpM([xr[0] + 14, yr[1] - 8, 0]), '#15803d');
    if (o.pp != null) tg('PP', ppM([o.pp, yr[1] - 10, zr[1] - 8]), '#b45309');
  }
  /** Arc in 3-D at A from direction dRef towards dTo, with label. */
  function arc3(g, P, A, dRef, dTo, r, col, label) {
    const u = G.norm(dRef); const t = G.norm(dTo); let w = G.sub(t, G.mul(u, G.dot(t, u))); const wl = G.len(w); if (wl < 1e-6) return;
    w = G.mul(w, 1 / wl); const ang = Math.acos(clamp(G.dot(t, u), -1, 1)); const pts = [];
    for (let i = 0; i <= 18; i++) { const a = (ang * i) / 18; const q = P(G.add(A, G.add(G.mul(u, r * Math.cos(a)), G.mul(w, r * Math.sin(a))))); pts.push([q.x, q.y]); }
    D.poly(g, pts, { stroke: col, width: 2.2 });
    if (label) { const a = ang / 2; const q = P(G.add(A, G.add(G.mul(u, r * 1.5 * Math.cos(a)), G.mul(w, r * 1.5 * Math.sin(a))))); D.text(g, label, q.x, q.y, { size: 15, weight: 800, color: col, align: 'center', halo: true }); }
  }
  /** Joins 2-D segments that share end points into polylines (so dashes of many short facet edges read as dashes). */
  function chains(segs) {
    const left = segs.slice(); const out = []; const eq = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
    while (left.length) {
      const c = left.shift().slice(); let grown = true;
      while (grown) {
        grown = false;
        for (let i = 0; i < left.length; i++) {
          const [a, b] = left[i]; const e = c[c.length - 1], s0 = c[0];
          if (eq(a, e)) c.push(b); else if (eq(b, e)) c.push(a); else if (eq(b, s0)) c.unshift(a); else if (eq(a, s0)) c.unshift(b); else continue;
          left.splice(i, 1); grown = true; break;
        }
      }
      out.push(c);
    }
    return out;
  }
  function dashedChains(g, segs, M, f, style) {
    if (f <= 0) return;
    chains(segs).forEach((c) => { const n = Math.max(2, Math.ceil(c.length * f)); D.poly(g, c.slice(0, n).map(M), { stroke: style.color, width: style.width, dash: style.dash, alpha: style.alpha }); });
  }
  function boundsOf(pts) {
    const b = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    pts.forEach((p) => { for (let i = 0; i < 3; i++) { b.min[i] = Math.min(b.min[i], p[i]); b.max[i] = Math.max(b.max[i], p[i]); } });
    return b;
  }
  const shiftPts = (pts, d) => pts.map((q) => [q[0] + d[0], q[1] + d[1], q[2] + d[2]]);
  function memo(fn) { let k = null, v = null; return (p) => { const key = JSON.stringify(p); if (key !== k) { k = key; v = fn(p); } return v; }; }

  // ───────────── shared multi-stage sheet (change-of-position method) ─────────────
  /**
   * stage = { pts:[3-D], names:[str|null], proj:[indices], views:{fv:{visible,hidden}, tv:{visible,hidden}} (2-D view coords),
   *           axis:[A,B]|null, annot:{fv?:{i:[A,B],label}, tv?:{...}}, b: bounds }
   */
  function stageLayout(stages, X0, X1, T, B, maxS) {
    const n = stages.length; const gap = 44; const padL = 30, padR = 26;
    const ws = stages.map((st) => Math.max(st.b.max[0] - st.b.min[0], 8));
    let up = 4, down = 4;
    stages.forEach((st) => { up = Math.max(up, st.b.max[2], -st.b.min[1]); down = Math.max(down, st.b.max[1], -st.b.min[2]); });
    const sumW = ws.reduce((a, b) => a + b, 0);
    const minPx = n > 1 ? 118 : 0;
    let s = Math.min(maxS || 3, (X1 - X0 - padL - padR - gap * (n - 1)) / sumW, (B - T) / (up + down));
    const pxW = () => ws.map((w) => Math.max(w * s, minPx));
    while (s > 0.3 && pxW().reduce((a, b) => a + b, 0) + gap * (n - 1) > X1 - X0 - padL - padR) s *= 0.95;
    const wp = pxW(); const used = wp.reduce((a, b) => a + b, 0) + gap * (n - 1);
    let x = X0 + padL + (X1 - X0 - padL - padR - used) / 2;
    const cols = ws.map((w, k) => { const c = x + (wp[k] - w * s) / 2 - stages[k].b.min[0] * s; x += wp[k] + gap; return c; });
    const Y0 = T + (B - T - (up + down) * s) / 2 + up * s;
    const M = {
      s, Y0, cols, ws, up, down, X0, X1,
      fv3: (k, q) => [cols[k] + q[0] * s, Y0 - q[2] * s],
      tv3: (k, q) => [cols[k] + q[0] * s, Y0 + q[1] * s],
      fv2: (k, q) => [cols[k] + q[0] * s, Y0 - q[1] * s],
      tv2: (k, q) => [cols[k] + q[0] * s, Y0 + q[1] * s],
    };
    M.map3 = (k, v, q) => (v === 'fv' ? M.fv3(k, q) : M.tv3(k, q));
    M.map2 = (k, v, q) => (v === 'fv' ? M.fv2(k, q) : M.tv2(k, q));
    M.rect = (k, v) => {
      const pts = stages[k].pts.map((q) => M.map3(k, v, q)); const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
      const x0 = Math.min(...xs), y0 = Math.min(...ys); return [x0 - 6, y0 - 6, Math.max(...xs) - x0 + 12, Math.max(...ys) - y0 + 12];
    };
    return M;
  }
  /** Progress of every (stage, view) drawing event for the current step. plan[step] = [[k, view, 'proj'?], ...] */
  function eventProgress(plan, step, prog) {
    const ev = {};
    plan.forEach((evs, si) => evs.forEach((e, j) => {
      const key = e[0] + e[1];
      if (si < step) ev[key] = { f: 1, cur: false, proj: !!e[2] };
      else if (si === step) ev[key] = { f: clamp(prog * evs.length - j, 0, 1), cur: true, proj: !!e[2] };
    }));
    return ev;
  }
  /** Draws all stage views of the sheet for the current step; returns the labeler for further labels. */
  function drawStageSheet(g, S2, stages, plan, lay, o) {
    const { step, st, dur, t, p } = S2; const prog = clamp(st / dur, 0, 1);
    const ev = eventProgress(plan, step, prog); const final = step >= plan.length - 1; const last = stages.length - 1;
    const lab = labeler(g, [lay.X0, 40, lay.X1 - lay.X0 + 8, 515]);
    G.xyLine(g, lay.X0 + 14, lay.X1 - 10, lay.Y0);
    lab.block(lay.X0, lay.Y0 - 10, lay.X0 + 26, lay.Y0 + 10); lab.block(lay.X1 - 12, lay.Y0 - 10, lay.X1 + 10, lay.Y0 + 10);
    // stage headings
    stages.forEach((stg, k) => {
      const cx = lay.cols[k] + (stg.b.min[0] + lay.ws[k] / 2) * lay.s;
      const active = ev['' + k + 'fv'] || ev['' + k + 'tv'];
      const title = o.titles[k];
      D.text(g, title, cx, 52, { size: 15, weight: 800, align: 'center', color: active ? (active.cur ? C.blue : C.ink) : C.faint });
      const w = D.textWidth(g, title, 15, 800); lab.block(cx - w / 2, 43, cx + w / 2, 61);
    });
    const other = { fv: 'tv', tv: 'fv' };
    const drawn = [];
    // projectors first (under the views)
    stages.forEach((stg, k) => ['tv', 'fv'].forEach((v) => {
      const e = ev['' + k + v]; if (!e || !e.proj || !p.showProj) return;
      const fp = e.cur ? clamp(e.f * 2, 0, 1) : 1; const style = { ...G.LINE.projector, alpha: e.cur ? 0.95 : 0.4 };
      stg.proj.forEach((i) => {
        const A = lay.map3(k, other[v], stg.pts[i]), B = lay.map3(k, v, stg.pts[i]);
        pline(g, A, B, fp, style);
        if (k > 0 && ev['' + (k - 1) + v]) { const Pp = lay.map3(k - 1, v, stages[k - 1].pts[i]); pline(g, Pp, B, fp, { ...style, color: '#7c3aed' }); }
      });
    }));
    // views
    stages.forEach((stg, k) => ['tv', 'fv'].forEach((v) => {
      const e = ev['' + k + v]; if (!e) return;
      const fl = e.proj && e.cur ? clamp(e.f * 2 - 1, 0, 1) : e.f; if (fl <= 0) return;
      const V = stg.views[v]; const M = (q) => lay.map2(k, v, q);
      const isFinal = final && k === last;
      const col = e.cur ? VCOL[v] : C.ink; const w = e.cur || isFinal ? 2.6 : 1.9;
      if (V.fill && fl >= 1) D.poly(g, V.fill.map(M), { fill: v === 'fv' ? '#dbeafe' : '#dcfce7', close: true, stroke: false, alpha: 0.45 });
      if (p.showHidden !== false) dashedChains(g, V.hidden, M, fl, { ...G.LINE.hidden, color: e.cur ? VCOL[v] : G.LINE.hidden.color });
      V.visible.forEach(([a, b]) => pline(g, M(a), M(b), fl, { color: col, width: w, alpha: e.cur || isFinal ? 1 : 0.8 }));
      if (stg.axis && fl >= 1) {
        const [A, B] = stg.axis.map((q) => lay.map3(k, v, q)); const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
        if (L > 2) G.seg(g, [A[0] - (dx / L) * 10, A[1] - (dy / L) * 10], [B[0] + (dx / L) * 10, B[1] + (dy / L) * 10], G.LINE.centre);
      }
      drawn.push({ k, v, e, fl, isFinal });
      if (e.cur) { const r = lay.rect(k, v); D.focus(g, r[0], r[1], r[2], r[3], t); }
    }));
    // angle annotations (after the stage's view is complete)
    drawn.forEach(({ k, v, fl }) => {
      const an = stages[k].annot && stages[k].annot[v]; if (!an || fl < 1) return;
      const A = lay.map3(k, v, an.i[0]), B = lay.map3(k, v, an.i[1]);
      const dx = B[0] - A[0], dy = B[1] - A[1]; if (Math.hypot(dx, dy) < 8) return;
      const ref = dx >= 0 ? 0 : Math.PI; const len = Math.min(70, Math.max(40, Math.hypot(dx, dy) * 0.6));
      D.line(g, A[0], A[1], A[0] + Math.cos(ref) * (len + 14), A[1], { color: '#b45309', width: 1.2, dash: [5, 4] });
      arcMark(g, A[0], A[1], len * 0.6, ref, Math.atan2(dy, dx), an.label, '#b45309', lab);
    });
    if (final) {
      const k = last;
      [['fv', 'Final FV'], ['tv', 'Final TV']].forEach(([v, txt]) => {
        const r = lay.rect(k, v); const y = v === 'fv' ? r[1] - 14 : r[1] + r[3] + 14;
        const w = D.textWidth(g, txt, 14, 700) + 16; const cx = r[0] + r[2] / 2;
        if (y > 40 && y < 548) { lab.block(cx - w / 2, y - 11, cx + w / 2, y + 11); D.tag(g, txt, cx, y, { bg: VCOL[v], size: 14, align: 'center' }); }
      });
    }
    // labels: current views first, then the final views
    const labelViews = drawn.filter((d) => d.fl >= 1 && (d.e.cur || d.isFinal)).sort((a, b) => (b.e.cur ? 1 : 0) - (a.e.cur ? 1 : 0));
    labelViews.forEach(({ k, v }) => {
      const stg = stages[k]; const pts = stg.pts.map((q) => lay.map3(k, v, q));
      const c = pts.reduce((s, q) => [s[0] + q[0] / pts.length, s[1] + q[1] / pts.length], [0, 0]);
      const groups = [];
      stg.names.forEach((nm, i) => {
        if (!nm) return; const q = pts[i]; const gp = groups.find((gg) => Math.hypot(gg.q[0] - q[0], gg.q[1] - q[1]) < 4);
        const txt = nm + SUBS[k] + (v === 'fv' ? '′' : '');
        if (gp) gp.t.push(txt); else groups.push({ q, t: [txt] });
      });
      groups.forEach((gp) => { lab.block(gp.q[0] - 3, gp.q[1] - 3, gp.q[0] + 3, gp.q[1] + 3); });
      groups.forEach((gp) => {
        D.circle(g, gp.q[0], gp.q[1], 2.6, { fill: VCOL[v] });
        lab.put(gp.t.slice(0, 3).join(',') + (gp.t.length > 3 ? '…' : ''), gp.q[0], gp.q[1], gp.q[0] - c[0], gp.q[1] - c[1] || (v === 'fv' ? -1 : 1), { size: 14, color: v === 'fv' ? '#1e3a8a' : '#14532d' });
      });
    });
    return lab;
  }

  // ═════════════════════════ 1. ORTHOGRAPHIC PROJECTION ═════════════════════════
  function quadrant(h, f) {
    if (h === 0 && f === 0) return { q: 0, name: 'on the XY line (on both HP and VP)', short: 'on XY' };
    if (h === 0) return { q: 0, name: f > 0 ? 'on the HP, in front of the VP' : 'on the HP, behind the VP', short: 'on HP' };
    if (f === 0) return { q: 0, name: h > 0 ? 'on the VP, above the HP' : 'on the VP, below the HP', short: 'on VP' };
    if (h > 0 && f > 0) return { q: 1, name: 'first quadrant (I)', short: 'I quadrant' };
    if (h > 0) return { q: 2, name: 'second quadrant (II)', short: 'II quadrant' };
    if (f < 0) return { q: 3, name: 'third quadrant (III)', short: 'III quadrant' };
    return { q: 4, name: 'fourth quadrant (IV)', short: 'IV quadrant' };
  }
  const where = (v, pos, neg, zero) => (v > 0 ? pos : v < 0 ? neg : zero);

  // ─── lines ───
  function lineGeom(p) {
    const L = p.L; const th = clamp(p.theta, 0, 90); const ph = clamp(Math.min(p.phi, 90 - th), 0, 90);
    const dz = L * Math.sin(rad(th)), dy = L * Math.sin(rad(ph)); const dx = Math.sqrt(Math.max(0, L * L - dz * dz - dy * dy));
    const A = [0, p.af, p.ah]; const B = [dx, p.af + dy, p.ah + dz]; const d = [dx, dy, dz];
    const fvL = Math.hypot(dx, dz), tvL = Math.hypot(dx, dy);
    const alpha = dx < 1e-9 && dz < 1e-9 ? 0 : deg(Math.atan2(dz, dx)); const beta = dx < 1e-9 && dy < 1e-9 ? 0 : deg(Math.atan2(dy, dx));
    const trace = (t) => { const P = G.add(A, G.mul(d, t)); return { P, t, show: P[0] >= -1.3 * L && P[0] <= 1.8 * L && Math.abs(P[1]) <= 1.3 * L + 20 && Math.abs(P[2]) <= 1.3 * L + 20 }; };
    const ht = dz > 1e-6 ? trace(-p.ah / dz) : null; const vt = dy > 1e-6 ? trace(-p.af / dy) : null;
    return { L, th, ph, dx, dy, dz, A, B, fvL, tvL, alpha, beta, ht, vt, limited: p.theta + p.phi > 90 };
  }
  // ─── planes (laminae) ───
  const SHAPES = [
    { value: 'triangle', label: 'Equilateral triangle', n: 3 }, { value: 'square', label: 'Square', n: 4 },
    { value: 'pentagon', label: 'Regular pentagon', n: 5 }, { value: 'hexagon', label: 'Regular hexagon', n: 6 },
    { value: 'circle', label: 'Circle', n: 0 },
  ];
  function laminaLocal(p) {
    const sh = SHAPES.find((s) => s.value === p.shape) || SHAPES[2];
    if (!sh.n) {
      const r = p.d / 2; const pts = []; const names = [];
      for (let k = 0; k < 48; k++) { const a = Math.PI + (2 * Math.PI * k) / 48; pts.push([r + r * Math.cos(a), r * Math.sin(a)]); names.push(k % 4 === 0 ? String(k / 4 + 1) : null); }
      return { pts, names, rest: 'point', n: 0, label: `circle of Ø${p.d} mm`, area: Math.PI * r * r, name: 'circular lamina' };
    }
    const n = sh.n, a = p.a; const R = G.circumR(n, a); const rin = a / (2 * Math.tan(Math.PI / n)); const pts = [];
    if (p.prest === 'corner') { for (let k = 0; k < n; k++) { const t = Math.PI + (2 * Math.PI * k) / n; pts.push([R + R * Math.cos(t), R * Math.sin(t)]); } }
    else { for (let k = 0; k < n; k++) { const t = Math.PI - Math.PI / n + (2 * Math.PI * k) / n; pts.push([rin + R * Math.cos(t), R * Math.sin(t)]); } }
    return { pts: pts.map(([u, v]) => [Math.abs(u) < 1e-9 ? 0 : u, v]), names: pts.map((_, i) => LET[i]), rest: p.prest === 'corner' ? 'corner' : 'edge', n, label: `${sh.label.toLowerCase()} of side ${a} mm`, area: (n * a * a) / (4 * Math.tan(Math.PI / n)), name: `${POLY[n]} lamina` };
  }
  function laminaPose(p, loc, ft, fr) {
    const al = rad(p.alpha) * ft; const psi = (loc.rest === 'edge' ? rad(90 - p.beta) : rad(p.beta)) * fr;
    let pts = loc.pts.map(([u, v]) => G.rotZ([u * Math.cos(al), v, u * Math.sin(al)], psi));
    const b = boundsOf(pts); pts = shiftPts(pts, [-b.min[0], p.front - b.min[1], 0]);
    return pts;
  }
  function laminaStage(pts, names) {
    const n = pts.length; const segs = (m) => pts.map((q, i) => [m(q), m(pts[(i + 1) % n])]);
    const fvs = segs((q) => [q[0], q[2]]).filter(([a, b]) => Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-6);
    const tvs = segs((q) => [q[0], q[1]]).filter(([a, b]) => Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-6);
    const proj = names.map((nm, i) => (nm ? i : -1)).filter((i) => i >= 0);
    return { pts, names, proj, views: { fv: { visible: fvs, hidden: [], fill: pts.map((q) => [q[0], q[2]]) }, tv: { visible: tvs, hidden: [], fill: pts.map((q) => [q[0], q[1]]) } }, axis: null, b: boundsOf(pts) };
  }
  function planeGeom(p) {
    const loc = laminaLocal(p);
    const p1 = laminaPose(p, loc, 0, 0), p2 = laminaPose(p, loc, 1, 0), p3 = laminaPose(p, loc, 1, 1);
    const stages = [laminaStage(p1, loc.names), laminaStage(p2, loc.names), laminaStage(p3, loc.names)];
    // annotations: α in stage-2 FV at the resting point, β in stage-3 TV along the resting edge / symmetry line
    const n = loc.pts.length; const far = loc.pts.reduce((bi, q, i) => (q[0] > loc.pts[bi][0] ? i : bi), 0);
    const restI = loc.rest === 'edge' ? [0, 1] : [0, far];
    stages[1].annot = { fv: { i: [p2[0], p2[far]], label: `α = ${p.alpha}°` } };
    if (loc.rest === 'edge') {
      const A = p3[0], B = p3[1]; const lo = A[1] > B[1] ? [B, A] : [A, B];
      stages[2].annot = { tv: { i: [lo[1], lo[0]], label: `β = ${p.beta}°` } };
    } else stages[2].annot = { tv: { i: [p3[0], p3[far]], label: `β = ${p.beta}°` } };
    // surface normal (final) → inclination with VP; true inclination of edge / symmetry line with VP
    const e1 = G.sub(p3[Math.max(1, Math.floor(n / 3))], p3[0]), e2 = G.sub(p3[Math.max(2, Math.floor((2 * n) / 3))], p3[0]); const nrm = G.norm(G.cross(e1, e2));
    const delta = deg(Math.acos(clamp(Math.abs(nrm[1]), 0, 1)));
    const lineDir = G.norm(G.sub(p3[restI[1]], p3[restI[0]])); const lineVP = deg(Math.asin(clamp(Math.abs(lineDir[1]), 0, 1)));
    const lineHP = deg(Math.asin(clamp(Math.abs(lineDir[2]), 0, 1)));
    const areaTV = G.polyArea2(p3.map((q) => [q[0], q[1]])), areaFV = G.polyArea2(p3.map((q) => [q[0], q[2]]));
    const widthTrue = Math.max(...loc.pts.map((q) => q[0]));
    return { loc, stages, delta, lineVP, lineHP, areaTV, areaFV, widthTrue, widthTV: widthTrue * Math.cos(rad(p.alpha)) };
  }

  const ORTHO_PLAN = [[[0, 'tv']], [[0, 'fv', 'proj']], [[1, 'fv']], [[1, 'tv', 'proj']], [[2, 'tv']], [[2, 'fv', 'proj']], []];
  const PANEL_W = { point: 486, line: 400, plane: 360 };
  const orthoPlane = memo(planeGeom);
  const orthoLine = memo(lineGeom);

  function pointLayout(p) {
    const s = 2.5; const Y0 = 285; const ax = p.showSide ? 640 : 745; const X1 = ax + p.dpp * s;
    return { s, Y0, ax, X1, A1: [ax, Y0 - p.h * s], A0: [ax, Y0 + p.f * s], A2: [X1 + p.f * s, Y0 - p.h * s] };
  }
  function lineLayout(m, p) {
    const xs = [0, m.L * Math.cos(rad(m.th)), m.L * Math.cos(rad(m.ph)), m.dx];
    const zs = [0, p.ah, p.ah + m.dz]; const ys = [0, p.af, p.af + m.dy];
    const tr = p.showTraces ? [m.ht, m.vt].filter((q) => q && q.show) : [];
    tr.forEach((q) => { xs.push(q.P[0]); zs.push(q.P[2]); ys.push(q.P[1]); });
    const xmin = Math.min(...xs), xmax = Math.max(...xs);
    const up = Math.max(8, ...zs, ...ys.map((v) => -v)), down = Math.max(8, ...ys, ...zs.map((v) => -v));
    const X0 = 424, X1 = 985, T = 72, B = 520;
    const s = Math.min(3.4, (X1 - X0 - 150) / Math.max(10, xmax - xmin), (B - T) / (up + down));
    const ox = X0 + 70 + (X1 - X0 - 150 - (xmax - xmin) * s) / 2 - xmin * s;
    const Y0 = T + (B - T - (up + down) * s) / 2 + up * s;
    return { s, ox, Y0, X0, X1, F: (x, z) => [ox + x * s, Y0 - z * s], T: (x, y) => [ox + x * s, Y0 + y * s] };
  }

  const ortho = {
    view3d: true,
    initialView: { yaw: 0.62, pitch: 0.36, zoom: 1 },
    approx: 'Exact first-angle projection. A circular lamina is drawn as a 48-sided polygon (12 numbered division points, as in the hand method). Traces are shown only when they fall on the sheet.',
    modes: [{ key: 'point', label: 'Projection of points' }, { key: 'line', label: 'Projection of lines' }, { key: 'plane', label: 'Projection of planes (laminae)' }],
    tools: [{ key: 'orbit', label: '🎥 Orbit camera', title: 'Drag in the 3-D panel to look around' }, { key: 'rotate', label: '🔄 Move / tilt object', title: 'Drag in the 3-D panel: point → changes its distances; line → θ and φ; lamina → α and β' }],
    initUi: () => ({ tool: 'orbit' }),
    saveUi: (ui) => ({ tool: ui.tool }),
    restoreUi: (saved, ui) => Object.assign(ui, { tool: saved && saved.tool === 'rotate' ? 'rotate' : 'orbit' }),
    params: [
      { key: 'h', label: 'Point A: height above (+) / below (−) HP', type: 'range', min: -50, max: 50, step: 1, default: 25, unit: 'mm', showIf: (p) => p.mode === 'point' },
      { key: 'f', label: 'Point A: in front of (+) / behind (−) VP', type: 'range', min: -50, max: 50, step: 1, default: 20, unit: 'mm', showIf: (p) => p.mode === 'point' },
      { key: 'dpp', label: 'Distance of A from the PP', type: 'range', min: 10, max: 60, step: 1, default: 30, unit: 'mm', showIf: (p) => p.mode === 'point' && p.showSide },
      { key: 'showSide', label: 'Show side view (PP)', type: 'toggle', default: true, showIf: (p) => p.mode === 'point' },
      { key: 'L', label: 'True length of AB', type: 'range', min: 30, max: 100, step: 1, default: 70, unit: 'mm', showIf: (p) => p.mode === 'line' },
      { key: 'theta', label: 'Inclination to HP θ', type: 'range', min: 0, max: 90, step: 1, default: 30, unit: '°', showIf: (p) => p.mode === 'line' },
      { key: 'phi', label: 'Inclination to VP φ', type: 'range', min: 0, max: 90, step: 1, default: 45, unit: '°', help: 'θ + φ must not exceed 90°.', showIf: (p) => p.mode === 'line' },
      { key: 'ah', label: 'End A above HP', type: 'range', min: 0, max: 40, step: 1, default: 15, unit: 'mm', showIf: (p) => p.mode === 'line' },
      { key: 'af', label: 'End A in front of VP', type: 'range', min: 0, max: 40, step: 1, default: 20, unit: 'mm', showIf: (p) => p.mode === 'line' },
      { key: 'showTraces', label: 'Show traces HT / VT', type: 'toggle', default: true, showIf: (p) => p.mode === 'line' },
      { key: 'shape', label: 'Lamina', type: 'select', options: SHAPES.map(({ value, label }) => ({ value, label })), default: 'pentagon', showIf: (p) => p.mode === 'plane' },
      { key: 'a', label: 'Side of the lamina a', type: 'range', min: 20, max: 50, step: 1, default: 30, unit: 'mm', showIf: (p) => p.mode === 'plane' && p.shape !== 'circle' },
      { key: 'd', label: 'Diameter of the circle', type: 'range', min: 30, max: 80, step: 1, default: 60, unit: 'mm', showIf: (p) => p.mode === 'plane' && p.shape === 'circle' },
      { key: 'prest', label: 'Lamina rests on the HP on', type: 'select', options: [{ value: 'edge', label: 'an edge (side)' }, { value: 'corner', label: 'a corner' }], default: 'edge', showIf: (p) => p.mode === 'plane' && p.shape !== 'circle' },
      { key: 'alpha', label: 'Surface inclined to HP α', type: 'range', min: 0, max: 90, step: 1, default: 45, unit: '°', showIf: (p) => p.mode === 'plane' },
      { key: 'beta', label: 'Resting edge / symmetry line (TV) to XY β', type: 'range', min: 0, max: 90, step: 1, default: 30, unit: '°', help: 'Edge case: the resting edge lies on the HP, so β is also its true inclination to the VP. Corner / circle: β is the angle the TV of the line through the resting point and the centre makes with XY.', showIf: (p) => p.mode === 'plane' },
      { key: 'front', label: 'Nearest point in front of VP', type: 'range', min: 0, max: 30, step: 1, default: 10, unit: 'mm', showIf: (p) => p.mode === 'plane' },
      { key: 'showProj', label: 'Show projectors', type: 'toggle', default: true },
      { key: 'showPlanes', label: 'Show reference planes', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Point 25 mm above HP, 20 mm in front of VP (I quadrant)', values: { mode: 'point', h: 25, f: 20, dpp: 30, showSide: true } },
      { label: 'Point 30 mm below HP, 20 mm behind VP (III quadrant)', values: { mode: 'point', h: -30, f: -20, dpp: 35, showSide: true } },
      { label: 'Line AB 70 mm, θ = 30°, φ = 45°, A 15 mm above HP, 20 mm in front of VP', values: { mode: 'line', L: 70, theta: 30, phi: 45, ah: 15, af: 20, showTraces: true } },
      { label: 'Pentagon 30 mm on an edge, α = 45°, edge 30° to VP', values: { mode: 'plane', shape: 'pentagon', a: 30, prest: 'edge', alpha: 45, beta: 30, front: 10 } },
      { label: 'Circle Ø60 on the rim, α = 45°, diameter TV 30° to XY', values: { mode: 'plane', shape: 'circle', d: 60, alpha: 45, beta: 30, front: 10 } },
    ],
    validate(p) {
      const w = [];
      if (p.mode === 'line' && p.theta + p.phi > 90) w.push(`θ + φ = ${p.theta + p.phi}° > 90° is impossible for a straight line — φ is limited to ${90 - p.theta}°.`);
      if (p.mode === 'line' && p.theta + p.phi === 90 && p.theta > 0 && p.phi > 0) w.push('θ + φ = 90°: the line lies in a profile plane — FV and TV are both perpendicular to XY (use a side view for true length).');
      if (p.mode === 'plane' && p.alpha === 0) w.push('α = 0°: the lamina lies flat on the HP — the TV is its true shape and the FV a line on XY.');
      if (p.mode === 'plane' && p.alpha === 90) w.push('α = 90°: the lamina is perpendicular to the HP — its TV is a straight line.');
      return w;
    },
    compute(p) {
      if (p.mode === 'line') return computeLine(p);
      if (p.mode === 'plane') return computePlane(p);
      return computePoint(p);
    },
    steps(p) {
      if (p.mode === 'line') {
        const m = orthoLine(p);
        return [
          { title: 'Locate the end A', text: `a′ is ${p.ah} mm above XY (A above HP) and a is ${p.af} mm below XY (A in front of VP), on one vertical projector.` },
          { title: 'Assume AB ∥ VP, inclined θ to HP', text: `Draw a′b₁′ = TL = ${p.L} mm at θ = ${m.th}°. Its TV ab₁ = L cos θ = ${f4(m.tvL)} mm is the TV length.` },
          { title: 'Assume AB ∥ HP, inclined φ to VP', text: `Draw ab₂ = ${p.L} mm at φ = ${f3(m.ph)}°. Its FV a′b₂′ = L cos φ = ${f4(m.fvL)} mm is the FV length.` },
          { title: 'Locus lines of B', text: 'Horizontal through b₁′ = locus of b′ (height of B); horizontal through b₂ = locus of b (distance of B from the VP).' },
          { title: 'Swing the lengths onto the loci', text: 'Centre a′, radius a′b₂′ → cuts the locus of b′ at b′. Centre a, radius ab₁ → cuts the locus of b at b. b and b′ lie on one projector.' },
          { title: 'Final projections a′b′ and ab', text: `FV a′b′ = ${f4(m.fvL)} mm at α = ${f3(m.alpha)}°, TV ab = ${f4(m.tvL)} mm at β = ${f3(m.beta)}° to XY (α ≥ θ, β ≥ φ).` },
          { title: 'Traces HT and VT', text: 'Extend a′b′ to meet XY at h′ and project down to ab (extended): HT. Extend ab to meet XY at v and project up to a′b′ (extended): VT.' },
        ];
      }
      if (p.mode === 'plane') {
        const m = orthoPlane(p); const edge = m.loc.rest === 'edge'; const what = edge ? 'resting edge' : m.loc.rest === 'corner' ? 'line through the resting corner and the centre' : 'diameter through the resting point';
        return [
          { title: 'Stage 1 — true shape in the TV', text: `Assume the ${m.loc.name} lies on the HP: the TV is its true shape (${m.loc.label}) with the ${edge ? 'resting edge perpendicular to XY' : `${what} parallel to XY`}.` },
          { title: 'Stage 1 — FV is a line on XY', text: 'Project every corner up: the whole lamina appears as a line (edge view) on XY.' },
          { title: 'Stage 2 — tilt the edge view by α', text: `Redraw the FV line at α = ${p.alpha}° to XY, keeping the ${edge ? 'resting edge' : 'resting point'} on XY.` },
          { title: 'Stage 2 — new TV by projectors', text: `Vertical projectors from the tilted FV meet horizontal projectors from the stage-1 TV: the TV narrows to ${f4(m.widthTV)} mm (= ${f4(m.widthTrue)} × cos ${p.alpha}°).` },
          { title: 'Stage 3 — rotate the TV by β', text: `Reproduce the stage-2 TV with the ${what} at β = ${p.beta}° to XY (shape unchanged).` },
          { title: 'Stage 3 — final FV by projectors', text: 'Vertical projectors from the final TV meet horizontal projectors (heights) from the stage-2 FV → final FV.' },
          { title: 'Final projections', text: `Surface ∠HP = ${p.alpha}°, surface ∠VP = ${f3(m.delta)}°. TV area = ${f4(m.areaTV)} mm², FV area = ${f4(m.areaFV)} mm² (true area ${f4(m.loc.area)} mm²).` },
        ];
      }
      const q = quadrant(p.h, p.f);
      const st = [
        { title: 'Reference planes and quadrants', text: 'The HP and VP meet at XY and divide space into four quadrants (I: above HP & in front of VP, II: above & behind, III: below & behind, IV: below & in front).' },
        { title: 'Position of point A', text: `A is ${Math.abs(p.h)} mm ${where(p.h, 'above', 'below', 'on')} the HP and ${Math.abs(p.f)} mm ${where(p.f, 'in front of', 'behind', 'on')} the VP → ${q.name}.` },
        { title: 'Front view a′ on the VP', text: `Projector ⟂ VP: a′ is ${Math.abs(p.h)} mm ${where(p.h, 'above', 'below', 'on')} XY.` },
        { title: 'Top view a on the HP', text: `Projector ⟂ HP: a is ${Math.abs(p.f)} mm from XY (in the HP, ${where(p.f, 'in front of', 'behind', 'on')} the VP).` },
        { title: 'Rotate the HP 90° about XY', text: `The front half of the HP turns down, the back half turns up: a ends ${where(p.f, 'below', 'above', 'on')} XY, on the same projector as a′.` },
      ];
      if (p.showSide) st.push({ title: 'Side view a″ on the PP', text: `The PP (${p.dpp} mm from A) is rotated about its line with the VP: a″ is ${Math.abs(p.f)} mm ${where(p.f, 'right of', 'left of', 'on')} X₁Y₁, level with a′.` });
      st.push({ title: 'Result', text: `A lies in the ${q.name}. FV ${where(p.h, 'above', 'below', 'on')} XY, TV ${where(p.f, 'below', 'above', 'on')} XY.` });
      return st;
    },
    onPointer(type, x, y, S2) {
      const { p, ui } = S2; const pw = PANEL_W[p.mode] || 400;
      if (type === 'down') {
        if (p.mode === 'point' && x > pw + 10) {
          const lay = pointLayout(p); const near = (q) => Math.hypot(q[0] - x, q[1] - y) < 18;
          const which = near(lay.A1) ? 'fv' : near(lay.A0) ? 'tv' : p.showSide && near(lay.A2) ? 'sv' : null;
          if (!which) return null;
          ui.pdrag = which; return { toast: which === 'fv' ? 'Drag a′ up/down: height of A (snaps to 5 mm)' : which === 'tv' ? 'Drag a up/down: distance of A from the VP' : 'Drag a″: height and distance from the VP' };
        }
        if (x > pw + 8 || ui.tool !== 'rotate') return null;
        ui.drag = { x, y, h: p.h, f: p.f, theta: p.theta, phi: p.phi, alpha: p.alpha, beta: p.beta }; return { redraw: true };
      }
      if (type === 'move' && ui.pdrag) {
        const lay = pointLayout(p); const snap = (v) => clamp(Math.round(v / 5) * 5, -50, 50);
        if (ui.pdrag === 'fv') { const h = snap((lay.Y0 - y) / lay.s); return h !== p.h ? { params: { h } } : null; }
        if (ui.pdrag === 'tv') { const f = snap((y - lay.Y0) / lay.s); return f !== p.f ? { params: { f } } : null; }
        const h = snap((lay.Y0 - y) / lay.s), f = snap((x - lay.X1) / lay.s); return h !== p.h || f !== p.f ? { params: { h, f } } : null;
      }
      if (type === 'up' && ui.pdrag) { ui.pdrag = null; return { recompute: true }; }
      if (!ui.drag) return null;
      if (type === 'move') {
        const dx = x - ui.drag.x, dy = ui.drag.y - y; const k = 0.4;
        if (p.mode === 'point') { const h = Math.round(clamp(ui.drag.h + dy * 0.3, -50, 50)); const f = Math.round(clamp(ui.drag.f + dx * 0.3, -50, 50)); return h !== p.h || f !== p.f ? { params: { h, f } } : null; }
        if (p.mode === 'line') { const theta = Math.round(clamp(ui.drag.theta + dy * k, 0, 90)); const phi = Math.round(clamp(ui.drag.phi + dx * k, 0, 90 - theta)); return theta !== p.theta || phi !== p.phi ? { params: { theta, phi } } : null; }
        const alpha = Math.round(clamp(ui.drag.alpha + dy * k, 0, 90)); const beta = Math.round(clamp(ui.drag.beta + dx * k, 0, 90));
        return alpha !== p.alpha || beta !== p.beta ? { params: { alpha, beta } } : null;
      }
      if (type === 'up') { ui.drag = null; return { recompute: true }; }
      return null;
    },
    draw(g, S2) {
      D.clear(g, '#ffffff');
      if (S2.p.mode === 'line') drawLine(g, S2); else if (S2.p.mode === 'plane') drawPlane(g, S2); else drawPoint(g, S2);
      D.text(g, S2.ui.tool === 'rotate' ? (S2.p.mode === 'point' ? 'Drag in 3-D: ↕ height, ↔ distance from VP' : S2.p.mode === 'line' ? 'Drag in 3-D: ↕ θ, ↔ φ — views update' : 'Drag in 3-D: ↕ α, ↔ β — views update') : 'Drag to orbit · wheel / pinch to zoom · ✋ to pan', (PANEL_W[S2.p.mode] + 16) / 2, 540, { size: 14, color: C.muted, align: 'center' });
    },
  };

  // ─── point: compute & draw ───
  function computePoint(p) {
    const q = quadrant(p.h, p.f); const dist = Math.hypot(p.h, p.f);
    const formulas = [
      { name: 'Front view a′ (on VP)', formula: 'a′ is h above (+) / below (−) XY', given: `h = ${p.h} mm`, calc: `a′ ${Math.abs(p.h)} mm ${where(p.h, 'above', 'below', 'on')} XY`, result: String(p.h), unit: 'mm' },
      { name: 'Top view a (on HP, after rotation)', formula: 'a is f below (+ in front) / above (− behind) XY', given: `f = ${p.f} mm`, calc: `a ${Math.abs(p.f)} mm ${where(p.f, 'below', 'above', 'on')} XY`, result: String(p.f), unit: 'mm' },
      { name: 'Shortest distance of A from XY', formula: 'd = √(h² + f²)', given: `h = ${p.h} mm, f = ${p.f} mm`, calc: `√(${p.h}² + ${p.f}²)`, result: f4(dist), unit: 'mm' },
    ];
    if (p.showSide) formulas.push({ name: 'Left side view a″ (on PP)', formula: 'a″: level with a′, f from X₁Y₁ (away from FV if in front)', given: `f = ${p.f} mm, PP ${p.dpp} mm from A`, calc: `a″ ${Math.abs(p.f)} mm ${where(p.f, 'right of', 'left of', 'on')} X₁Y₁`, result: String(p.f), unit: 'mm' });
    return {
      formulas,
      readouts: [
        { label: 'Quadrant', value: q.short, tone: 'info' },
        { label: 'a′ (FV)', value: `${Math.abs(p.h)} mm ${where(p.h, 'above', 'below', 'on')} XY` },
        { label: 'a (TV)', value: `${Math.abs(p.f)} mm ${where(p.f, 'below', 'above', 'on')} XY` },
        { label: 'Distance from XY', value: `${f3(dist)} mm`, tone: 'good' },
      ],
      state: { mode: 'Projection of points', point: 'A', heightAboveHP: `${p.h} mm`, distanceInFrontOfVP: `${p.f} mm`, quadrant: q.name, frontView: `a′ ${Math.abs(p.h)} mm ${where(p.h, 'above', 'below', 'on')} XY`, topView: `a ${Math.abs(p.f)} mm ${where(p.f, 'below', 'above', 'on')} XY`, sideView: p.showSide ? `a″ on PP ${p.dpp} mm from A` : 'not shown', projection: 'first angle' },
      explain: {
        what: `Point A is ${Math.abs(p.h)} mm ${where(p.h, 'above', 'below', 'on')} the HP and ${Math.abs(p.f)} mm ${where(p.f, 'in front of', 'behind', 'on')} the VP, i.e. ${q.name}. Its FV a′, TV a${p.showSide ? ' and side view a″' : ''} are found with projectors perpendicular to each plane.`,
        why: 'After projecting, the HP is rotated 90° clockwise about XY into the plane of the VP (its front half goes down). So a height above the HP shows above XY, and a distance in front of the VP shows below XY; for points behind the VP or below the HP the views change side.',
        param: `Height h = ${p.h} mm and distance f = ${p.f} mm (negative values move the point into the II, III or IV quadrant)${p.showSide ? `, PP distance ${p.dpp} mm` : ''}.`,
        effect: 'Changing h moves only a′ (and a″) up or down; changing f moves only a (and a″ sideways). a′ and a always lie on one vertical projector. In the II and IV quadrants both views fall on the same side of XY and may overlap — which is why first-angle drawings use the I quadrant.',
      },
    };
  }
  function drawPoint(g, S2) {
    const { p, step, st, dur, t, view } = S2; const prog = clamp(st / dur, 0, 1);
    const keys = ['planes', 'pos', 'fv', 'tv', 'rot'].concat(p.showSide ? ['side'] : [], ['final']);
    const cur = keys[Math.min(step, keys.length - 1)]; const has = (k) => keys.indexOf(k) >= 0 && keys.indexOf(k) <= step;
    const pf = (k) => (cur === k ? prog : has(k) ? 1 : 0);
    const PW = PANEL_W.point; const h = p.h, f = p.f, d = p.dpp;
    // ── 3-D ──
    panel(g, 8, 8, PW, 544, 'Point A in space — HP, VP' + (p.showSide ? ', PP' : '') + ' and quadrants');
    g.save(); g.beginPath(); g.rect(10, 40, PW - 4, 480); g.clip();
    const xr = [-60, p.showSide ? d : 45], yr = [-62, 62], zr = [-62, 62];
    const P = G.camera(view, PW / 2 + 8, 285, 2.9, [(xr[0] + xr[1]) / 2, 0, 0], 170);
    const hpRot = has('rot') ? (Math.PI / 2) * pf('rot') : 0;
    const ppRot = has('side') ? (Math.PI / 2) * clamp(pf('side') * 2 - 1, 0, 1) : 0;
    if (p.showPlanes) {
      planes3(g, P, xr, yr, zr, { hpRot, pp: p.showSide ? d : null, ppRot });
      if (!has('rot')) [['I', 36, 36], ['II', -36, 36], ['III', -36, -36], ['IV', 36, -36]].forEach(([lb, yy, zz]) => {
        const q = P([xr[0] + 12, yy, zz]); const qq = quadrant(zz, yy).q === quadrant(h, f).q && step >= 1;
        D.tag(g, `${lb} Q`, q.x, q.y, { bg: qq ? '#b91c1c' : '#64748b', size: 14, align: 'center' });
      });
    } else planes3(g, P, xr, [0, 0.01], [0, 0.01], { hp: false, vp: false });
    const A = [0, f, h];
    const a1 = [0, 0, h]; const a0 = [0, f * Math.cos(hpRot), -f * Math.sin(hpRot)]; const a2 = [d + f * Math.sin(ppRot), f * Math.cos(ppRot), h];
    const pt = (q, col, label, dx = 10, dy = -12) => { const s = P(q); D.circle(g, s.x, s.y, 5, { fill: col, stroke: '#fff', width: 1.5 }); D.text(g, label, s.x + dx, s.y + dy, { size: 17, weight: 800, color: col, halo: true }); };
    const seg3 = (a, b, style, fr = 1) => { const A2 = P(a), B2 = P(b); pline(g, [A2.x, A2.y], [B2.x, B2.y], fr, style); };
    if (has('pos')) {
      const foot = [0, 0, 0];
      seg3(A, [0, f, 0], { color: '#b91c1c', width: 1.4, dash: [4, 4] });
      seg3(A, [0, 0, h], { color: '#b91c1c', width: 1.4, dash: [4, 4] });
      seg3([0, f, 0], foot, { color: C.muted, width: 1.2 }); seg3([0, 0, h], foot, { color: C.muted, width: 1.2 });
      if (cur === 'pos') {
        const m1 = P([0, f / 2, h]), m2 = P([0, f, h / 2]);
        D.tag(g, `${Math.abs(f)} mm ${where(f, 'in front of', 'behind', 'on')} VP`, m1.x, m1.y - 14, { bg: '#1d4ed8', size: 14, align: 'center' });
        D.tag(g, `${Math.abs(h)} mm ${where(h, 'above', 'below', 'on')} HP`, m2.x + 8, m2.y + 16, { bg: '#15803d', size: 14, align: 'left' });
      }
    }
    if (has('fv')) { seg3(A, a1, { color: VCOL.fv, width: 2, dash: [5, 4] }, pf('fv')); if (pf('fv') >= 1) pt(a1, VCOL.fv, 'a′', -30, -12); }
    if (has('tv')) {
      if (!has('rot') || cur === 'rot') seg3(A, [0, f, 0], { color: VCOL.tv, width: 2, dash: [5, 4] }, pf('tv'));
      if (pf('tv') >= 1) { pt(a0, VCOL.tv, 'a', -24, 14); if (has('rot')) seg3(a1, a0, { ...G.LINE.projector, width: 1.6 }); }
    }
    if (has('side')) {
      const fs = clamp(pf('side') * 2, 0, 1); if (ppRot === 0) seg3(A, [d, f, h], { color: VCOL.sv, width: 2, dash: [5, 4] }, fs);
      if (fs >= 1) { pt(a2, VCOL.sv, 'a″', 10, -14); if (ppRot > 0) seg3(a1, a2, { ...G.LINE.projector, width: 1.4 }); }
    }
    if (step >= 1) pt(A, '#b91c1c', 'A', 10, -14);
    if (cur === 'rot') { const q = P([xr[1] - 6, 30 * Math.cos(hpRot), -30 * Math.sin(hpRot)]); D.arrow(g, q.x, q.y - 30, q.x, q.y + 4, { color: '#15803d', width: 3 }); D.tag(g, 'HP turns about XY', q.x, q.y - 44, { bg: '#15803d', size: 14, align: 'center' }); }
    g.restore();
    if (step === 0) D.focus(g, 22, 50, PW - 30, 460, t);
    // ── sheet ──
    const lay = pointLayout(p); const X0 = PW + 18; const lab = labeler(g, [X0, 40, 990 - X0, 515]);
    D.text(g, 'Orthographic drawing (first angle)', X0 + 6, 26, { size: 17, weight: 800 });
    G.xyLine(g, X0 + 22, 972, lay.Y0); lab.block(X0 + 4, lay.Y0 - 12, X0 + 20, lay.Y0 + 12);
    if (has('side')) {
      D.line(g, lay.X1, 70, lay.X1, 500, { color: C.ink, width: 1.4 });
      D.text(g, 'X₁', lay.X1, 60, { size: 15, weight: 800, align: 'center' }); D.text(g, 'Y₁', lay.X1, 512, { size: 15, weight: 800, align: 'center' });
      lab.block(lay.X1 - 12, 50, lay.X1 + 12, 520);
      const r = 150; D.line(g, lay.X1 - r * 0.9, lay.Y0 - r * 0.9, lay.X1 + r, lay.Y0 + r, { color: C.muted, width: 1.1, dash: [10, 4, 2, 4] });
      D.text(g, '45°', lay.X1 + 40, lay.Y0 + 22, { size: 14, color: C.muted });
    }
    const A1 = lay.A1, A0 = lay.A0, A2 = lay.A2;
    if (has('fv')) {
      const fr = pf('fv'); pline(g, [lay.ax, lay.Y0], A1, fr, { color: VCOL.fv, width: 1.3 });
      if (fr >= 1) { dimTo(g, [lay.ax, lay.Y0], A1, `${Math.abs(h)}`, [-1, 0], 28); }
    }
    if (has('tv')) {
      const fr = pf('tv'); pline(g, [lay.ax, lay.Y0], A0, fr, { color: VCOL.tv, width: 1.3 });
      if (fr >= 1) dimTo(g, [lay.ax, lay.Y0], A0, `${Math.abs(f)}`, [-1, 0], 64);
    }
    if (has('tv') && p.showProj) D.line(g, A1[0], Math.min(A1[1], A0[1], lay.Y0) - 14, A1[0], Math.max(A1[1], A0[1], lay.Y0) + 14, G.LINE.projector);
    if (has('side')) {
      const fs = pf('side'); const M = [lay.X1 + f * lay.s, lay.Y0 + f * lay.s];
      if (p.showProj) { pline(g, A1, A2, fs, G.LINE.projector); pline(g, A0, M, fs, G.LINE.projector); pline(g, M, A2, fs, G.LINE.projector); }
      if (fs >= 1) dimTo(g, [lay.X1, A2[1]], A2, `${Math.abs(f)}`, [0, -1], 22);
    }
    const dotL = (q, col, txt, ux, uy) => { D.circle(g, q[0], q[1], 5, { fill: col, stroke: '#fff', width: 1.5 }); lab.block(q[0] - 5, q[1] - 5, q[0] + 5, q[1] + 5); return () => lab.put(txt, q[0], q[1], ux, uy, { size: 18, color: col, force: true }); };
    const todo = [];
    if (has('fv') && pf('fv') >= 1) todo.push(dotL(A1, VCOL.fv, 'a′', 1, -0.6));
    if (has('tv') && pf('tv') >= 1) todo.push(dotL(A0, VCOL.tv, 'a', 1, 0.6));
    if (has('side') && pf('side') >= 1) todo.push(dotL(A2, VCOL.sv, 'a″', 1, -0.6));
    todo.forEach((fn) => fn());
    if (cur === 'fv') D.focus(g, A1[0] - 20, Math.min(A1[1], lay.Y0) - 20, 40, Math.abs(A1[1] - lay.Y0) + 40, t);
    if (cur === 'tv' || cur === 'rot') D.focus(g, A0[0] - 20, Math.min(A0[1], lay.Y0) - 20, 40, Math.abs(A0[1] - lay.Y0) + 40, t);
    if (cur === 'side') D.focus(g, A2[0] - 22, A2[1] - 22, 44, 44, t);
    if (step < 2) D.text(g, 'Views appear here as you step through', 750, 470, { size: 16, color: C.faint, align: 'center' });
    if (cur === 'final') {
      const q = quadrant(h, f);
      D.tag(g, `A: ${q.name}`, X0 + 12, 500, { bg: '#b91c1c', size: 16 });
      D.text(g, `FV ${where(h, 'above', 'below', 'on')} XY  ·  TV ${where(f, 'below', 'above', 'on')} XY`, 750, 530, { size: 16, weight: 700, align: 'center' });
    }
  }

  // ─── line: compute & draw ───
  function computeLine(p) {
    const m = orthoLine(p);
    const htTxt = m.ht ? `HT ${f3(Math.abs(m.ht.P[1]))} mm ${m.ht.P[1] >= 0 ? 'in front of' : 'behind'} VP, ${f3(-m.ht.P[0])} mm left of a` : 'none (AB ∥ HP)';
    const vtTxt = m.vt ? `VT ${f3(Math.abs(m.vt.P[2]))} mm ${m.vt.P[2] >= 0 ? 'above' : 'below'} HP, ${f3(-m.vt.P[0])} mm left of a` : 'none (AB ∥ VP)';
    return {
      formulas: [
        { name: 'Length of the front view', formula: 'a′b′ = L cos φ', given: `L = ${p.L} mm, φ = ${f3(m.ph)}°`, calc: `${p.L} × cos ${f3(m.ph)}°`, result: f4(m.fvL), unit: 'mm' },
        { name: 'Length of the top view', formula: 'ab = L cos θ', given: `L = ${p.L} mm, θ = ${m.th}°`, calc: `${p.L} × cos ${m.th}°`, result: f4(m.tvL), unit: 'mm' },
        { name: 'Components of AB', formula: 'Δz = L sin θ, Δy = L sin φ, Δx = √(L² − Δz² − Δy²)', given: `L = ${p.L} mm`, calc: `Δz = ${f4(m.dz)}, Δy = ${f4(m.dy)}`, result: `Δx = ${f4(m.dx)}`, unit: 'mm' },
        { name: 'Apparent angle of the FV with XY', formula: 'tan α = Δz / Δx', given: `Δz = ${f4(m.dz)} mm, Δx = ${f4(m.dx)} mm`, calc: m.dx > 1e-6 ? `α = tan⁻¹(${f4(m.dz / m.dx)})` : 'Δx = 0 → FV ⟂ XY', result: f3(m.alpha), unit: '°' },
        { name: 'Apparent angle of the TV with XY', formula: 'tan β = Δy / Δx', given: `Δy = ${f4(m.dy)} mm, Δx = ${f4(m.dx)} mm`, calc: m.dx > 1e-6 ? `β = tan⁻¹(${f4(m.dy / m.dx)})` : 'Δx = 0 → TV ⟂ XY', result: f3(m.beta), unit: '°' },
        { name: 'Traces', formula: 'HT: z = 0 on AB extended;  VT: y = 0 on AB extended', given: `A (${p.ah} above HP, ${p.af} in front of VP)`, calc: `${htTxt}; ${vtTxt}`, result: `${m.ht ? 'HT' : '—'} / ${m.vt ? 'VT' : '—'}`, unit: '' },
      ],
      readouts: [
        { label: 'FV a′b′', value: `${f3(m.fvL)} mm`, tone: 'info' },
        { label: 'TV ab', value: `${f3(m.tvL)} mm`, tone: 'good' },
        { label: 'α (FV ∠XY)', value: `${f3(m.alpha)}°` },
        { label: 'β (TV ∠XY)', value: `${f3(m.beta)}°` },
      ],
      state: { mode: 'Projection of lines', trueLength: `${p.L} mm`, inclinationHP: `${m.th}°`, inclinationVP: `${f3(m.ph)}°`, endA: `${p.ah} mm above HP, ${p.af} mm in front of VP`, frontViewLength: `${f4(m.fvL)} mm`, topViewLength: `${f4(m.tvL)} mm`, apparentAngleFV: `${f3(m.alpha)}°`, apparentAngleTV: `${f3(m.beta)}°`, horizontalTrace: htTxt, verticalTrace: vtTxt, method: 'rotating-line (locus) method, first angle' },
      explain: {
        what: `A line AB, ${p.L} mm long, is inclined θ = ${m.th}° to the HP and φ = ${f3(m.ph)}° to the VP. Its FV a′b′ is ${f4(m.fvL)} mm at α = ${f3(m.alpha)}° and its TV ab is ${f4(m.tvL)} mm at β = ${f3(m.beta)}° to XY.`,
        why: 'Neither view shows the true length when the line is inclined to both planes. By first making the line parallel to one plane at a time we get the true angles and the view lengths (L cos θ, L cos φ); B must also lie on its two locus lines, so swinging those lengths about a′ and a finds b′ and b.',
        param: `True length L, θ (with HP), φ (with VP) and the position of end A (${p.ah} mm above HP, ${p.af} mm in front of VP).`,
        effect: 'Increasing θ shortens the TV (L cos θ) and steepens the FV; increasing φ shortens the FV (L cos φ) and steepens the TV. The apparent angles are never smaller than the true ones (α ≥ θ, β ≥ φ). When θ + φ = 90° both views become perpendicular to XY.',
      },
    };
  }
  function drawLine(g, S2) {
    const { p, step, st, dur, t, view } = S2; const prog = clamp(st / dur, 0, 1);
    const keys = ['end', 'theta', 'phi', 'locus', 'arcs', 'final', 'traces'];
    const cur = keys[Math.min(step, 6)]; const has = (k) => keys.indexOf(k) <= step; const pf = (k) => (cur === k ? prog : has(k) ? 1 : 0);
    const m = orthoLine(p); const PW = PANEL_W.line; const L = m.L;
    // ── 3-D ──
    panel(g, 8, 8, PW, 544, 'Line AB in the first quadrant');
    g.save(); g.beginPath(); g.rect(10, 40, PW - 4, 480); g.clip();
    const tr = p.showTraces ? [m.ht, m.vt].filter((q) => q && q.show) : [];
    const pts = [m.A, m.B, [0, 0, 0]].concat(tr.map((q) => q.P)); const b = boundsOf(pts);
    const xr = [b.min[0] - 12, b.max[0] + 14], yr = [Math.min(0, b.min[1]) - (b.min[1] < 0 ? 12 : 0), b.max[1] + 14], zr = [Math.min(0, b.min[2]) - (b.min[2] < 0 ? 12 : 0), b.max[2] + 14];
    const size = Math.max(xr[1] - xr[0], yr[1] - yr[0], zr[1] - zr[0]);
    const P = G.camera(view, PW / 2 + 8, 290, 250 / size, [(xr[0] + xr[1]) / 2, (yr[0] + yr[1]) / 2, (zr[0] + zr[1]) / 2], size * 1.6);
    if (p.showPlanes) planes3(g, P, xr, yr, zr);
    const s3 = (q) => { const r = P(q); return [r.x, r.y]; };
    const L3 = (a, c, style) => { const A = s3(a), B = s3(c); D.line(g, A[0], A[1], B[0], B[1], style); };
    const A = m.A, B = m.B; const a1q = [A[0], 0, A[2]], b1q = [B[0], 0, B[2]], a0q = [A[0], A[1], 0], b0q = [B[0], B[1], 0];
    if (p.showProj) [[A, a1q], [B, b1q], [A, a0q], [B, b0q], [a1q, [0, 0, 0]], [a0q, [0, 0, 0]], [b1q, [B[0], 0, 0]], [b0q, [B[0], 0, 0]]].forEach(([u, v]) => L3(u, v, { color: '#64748b', width: 1, dash: [4, 4], alpha: 0.8 }));
    if (step >= 1) { L3(a1q, b1q, { color: VCOL.fv, width: 3 }); L3(a0q, b0q, { color: VCOL.tv, width: 3 }); }
    if (has('traces') && tr.length) {
      tr.forEach((q) => { L3(q.t < 0 ? q.P : B, q.t < 0 ? A : q.P, { color: '#b91c1c', width: 1.4, dash: [6, 4] }); });
      if (m.ht && m.ht.show) { const q = s3(m.ht.P); D.circle(g, q[0], q[1], 5, { fill: '#7c3aed' }); D.text(g, 'HT', q[0] + 8, q[1] + 14, { size: 15, weight: 800, color: '#7c3aed', halo: true }); }
      if (m.vt && m.vt.show) { const q = s3(m.vt.P); D.circle(g, q[0], q[1], 5, { fill: '#7c3aed' }); D.text(g, 'VT', q[0] + 8, q[1] - 14, { size: 15, weight: 800, color: '#7c3aed', halo: true }); }
    }
    L3(A, B, { color: '#b91c1c', width: 4 });
    if (cur === 'theta' || cur === 'final') { L3(A, [B[0], B[1], A[2]], { color: '#b45309', width: 1.4, dash: [5, 4] }); arc3(g, P, A, [B[0], B[1] - A[1], 0], G.sub(B, A), L * 0.3, '#b45309', `θ = ${m.th}°`); }
    if (cur === 'phi' || cur === 'final') { L3(A, [B[0], A[1], B[2]], { color: '#7c3aed', width: 1.4, dash: [5, 4] }); arc3(g, P, A, [B[0], 0, B[2] - A[2]], G.sub(B, A), L * 0.45, '#7c3aed', `φ = ${f3(m.ph)}°`); }
    [[A, 'A', '#b91c1c'], [B, 'B', '#b91c1c'], [a1q, 'a′', VCOL.fv], [b1q, 'b′', VCOL.fv], [a0q, 'a', VCOL.tv], [b0q, 'b', VCOL.tv]].forEach(([q, lb, col], i) => {
      if (i >= 2 && step < 1) return; const s = s3(q); D.circle(g, s[0], s[1], 4, { fill: col }); D.text(g, lb, s[0] + (i % 2 ? 9 : -9), s[1] - 12, { size: 16, weight: 800, color: col, align: i % 2 ? 'left' : 'right', halo: true });
    });
    g.restore();
    D.text(g, `TL ${L} mm · θ = ${m.th}° · φ = ${f3(m.ph)}°`, PW / 2 + 8, 516, { size: 15, weight: 700, align: 'center' });
    // ── sheet ──
    const lay = lineLayout(m, p); const F = lay.F, T = lay.T; const X0 = lay.X0; const lab = labeler(g, [X0, 40, 990 - X0, 515]);
    D.text(g, 'Projections of AB (first angle)', X0 + 6, 26, { size: 17, weight: 800 });
    G.xyLine(g, X0 + 20, 975, lay.Y0); lab.block(X0, lay.Y0 - 12, X0 + 18, lay.Y0 + 12); lab.block(975, lay.Y0 - 12, 990, lay.Y0 + 12);
    const cA1 = F(0, p.ah), cA0 = T(0, p.af);
    const b1p = F(L * Math.cos(rad(m.th)), p.ah + m.dz), b1 = T(L * Math.cos(rad(m.th)), p.af);
    const b2 = T(L * Math.cos(rad(m.ph)), p.af + m.dy), b2p = F(L * Math.cos(rad(m.ph)), p.ah);
    const bp = F(m.dx, p.ah + m.dz), bb = T(m.dx, p.af + m.dy);
    const CONS = G.LINE.construction; const labels = [];
    // end A
    pline(g, [cA1[0], Math.min(cA1[1], lay.Y0) - 4], [cA0[0], Math.max(cA0[1], lay.Y0) + 4], 1, G.LINE.projector);
    if (pf('end') >= 1 && step < 5) { dimTo(g, [cA1[0], lay.Y0], cA1, `${p.ah}`, [-1, 0], 26); dimTo(g, [cA0[0], lay.Y0], cA0, `${p.af}`, [-1, 0], 26); }
    labels.push([cA1, 'a′', VCOL.fv, [-1, -0.6]], [cA0, 'a', VCOL.tv, [-1, 0.6]]);
    if (has('theta')) {
      const fr = pf('theta'); pline(g, cA1, b1p, clamp(fr * 2, 0, 1), { color: '#b45309', width: 2 });
      if (fr > 0.5) { pline(g, b1p, b1, clamp(fr * 2 - 1, 0, 1), G.LINE.projector); pline(g, cA0, b1, clamp(fr * 2 - 1, 0, 1), { color: '#b45309', width: 2 }); }
      if (fr >= 1) { D.line(g, cA1[0], cA1[1], cA1[0] + 60, cA1[1], { ...CONS, dash: [4, 4] }); arcMark(g, cA1[0], cA1[1], 34, 0, Math.atan2(b1p[1] - cA1[1], b1p[0] - cA1[0]), 'θ', '#b45309', lab); labels.push([b1p, 'b₁′', '#b45309', [0.3, -1]], [b1, 'b₁', '#b45309', [0.6, 1]]); }
      if (cur === 'theta' && fr >= 1) { const mid = [(cA1[0] + b1p[0]) / 2, (cA1[1] + b1p[1]) / 2]; lab.put(`TL ${L}`, mid[0], mid[1], -0.5, -1, { color: '#b45309', size: 15 }); }
    }
    if (has('phi')) {
      const fr = pf('phi'); pline(g, cA0, b2, clamp(fr * 2, 0, 1), { color: '#7c3aed', width: 2 });
      if (fr > 0.5) { pline(g, b2, b2p, clamp(fr * 2 - 1, 0, 1), G.LINE.projector); pline(g, cA1, b2p, clamp(fr * 2 - 1, 0, 1), { color: '#7c3aed', width: 2 }); }
      if (fr >= 1) { D.line(g, cA0[0], cA0[1], cA0[0] + 60, cA0[1], { ...CONS, dash: [4, 4] }); arcMark(g, cA0[0], cA0[1], 34, 0, Math.atan2(b2[1] - cA0[1], b2[0] - cA0[0]), 'φ', '#7c3aed', lab); labels.push([b2, 'b₂', '#7c3aed', [0.4, 1]], [b2p, 'b₂′', '#7c3aed', [0.8, 0.5]]); }
      if (cur === 'phi' && fr >= 1) { const mid = [(cA0[0] + b2[0]) / 2, (cA0[1] + b2[1]) / 2]; lab.put(`TL ${L}`, mid[0], mid[1], -0.6, 1, { color: '#7c3aed', size: 15 }); }
    }
    if (has('locus')) {
      const fr = pf('locus'); const xa = X0 + 30, xb = 970;
      pline(g, [xa, b1p[1]], [xb, b1p[1]], fr, { ...CONS, dash: [10, 4, 2, 4] }); pline(g, [xa, b2[1]], [xb, b2[1]], fr, { ...CONS, dash: [10, 4, 2, 4] });
      if (fr >= 1) { lab.put('locus of b′', xb - 50, b1p[1], 0, -1, { size: 14, color: C.muted, rs: [4, 12] }); lab.put('locus of b', xb - 50, b2[1], 0, 1, { size: 14, color: C.muted, rs: [4, 12] }); }
    }
    if (has('arcs')) {
      const fr = pf('arcs'); const arc = (c, r, a0, a1, col) => { const d = (a1 - a0) * fr; if (r < 1 || Math.abs(d) < 1e-3) return; g.save(); g.beginPath(); g.arc(c[0], c[1], r, a0, a0 + d, d < 0); g.strokeStyle = col; g.lineWidth = 1.4; g.setLineDash([6, 4]); g.stroke(); g.restore(); };
      arc(cA1, m.fvL * lay.s, Math.atan2(b2p[1] - cA1[1], b2p[0] - cA1[0]), Math.atan2(bp[1] - cA1[1], bp[0] - cA1[0]), '#2563eb');
      arc(cA0, m.tvL * lay.s, Math.atan2(b1[1] - cA0[1], b1[0] - cA0[0]), Math.atan2(bb[1] - cA0[1], bb[0] - cA0[0]), '#16a34a');
      if (fr >= 1) { D.line(g, bp[0], bp[1], bb[0], bb[1], G.LINE.projector); }
    }
    if (has('final')) {
      const fr = pf('final'); pline(g, cA1, bp, fr, { color: '#0f172a', width: 3 }); pline(g, cA0, bb, fr, { color: '#0f172a', width: 3 });
      if (fr >= 1) {
        if (m.fvL * lay.s > 30 && m.dx > 1) arcMark(g, cA1[0], cA1[1], 58, 0, Math.atan2(bp[1] - cA1[1], bp[0] - cA1[0]), `α ${f3(m.alpha)}°`, '#1d4ed8', lab);
        if (m.tvL * lay.s > 30 && m.dx > 1) arcMark(g, cA0[0], cA0[1], 58, 0, Math.atan2(bb[1] - cA0[1], bb[0] - cA0[0]), `β ${f3(m.beta)}°`, '#15803d', lab);
      }
    }
    if (has('arcs') && pf('arcs') >= 1) labels.push([bp, 'b′', VCOL.fv, [1, -0.5]], [bb, 'b', VCOL.tv, [1, 0.5]]);
    if (has('traces') && p.showTraces) {
      const fr = pf('traces');
      if (m.ht && m.ht.show) {
        const hp1 = F(m.ht.P[0], 0), hT = T(m.ht.P[0], m.ht.P[1]);
        pline(g, cA1, hp1, fr, { color: '#b91c1c', width: 1.4, dash: [7, 4] }); pline(g, cA0, hT, fr, { color: '#b91c1c', width: 1.4, dash: [7, 4] });
        if (fr >= 1) { D.line(g, hp1[0], hp1[1], hT[0], hT[1], G.LINE.projector); labels.push([hp1, 'h′', '#7c3aed', [-1, -1]], [hT, 'HT', '#7c3aed', [-1, 0.4]]); }
      }
      if (m.vt && m.vt.show) {
        const v0 = T(m.vt.P[0], 0), vT = F(m.vt.P[0], m.vt.P[2]);
        pline(g, cA0, v0, fr, { color: '#b91c1c', width: 1.4, dash: [7, 4] }); pline(g, cA1, vT, fr, { color: '#b91c1c', width: 1.4, dash: [7, 4] });
        if (fr >= 1) { D.line(g, v0[0], v0[1], vT[0], vT[1], G.LINE.projector); labels.push([v0, 'v', '#7c3aed', [-1, 1]], [vT, 'VT', '#7c3aed', [-1, -0.4]]); }
      }
      const off = [m.ht && !m.ht.show ? 'HT' : null, m.vt && !m.vt.show ? 'VT' : null].filter(Boolean);
      if (!m.ht || !m.vt || off.length) D.text(g, [!m.ht ? 'No HT (AB ∥ HP)' : null, !m.vt ? 'No VT (AB ∥ VP)' : null, off.length ? `${off.join(', ')} off the sheet` : null].filter(Boolean).join(' · '), 700, 540, { size: 15, color: '#b91c1c', align: 'center', weight: 700 });
    }
    labels.forEach(([q]) => lab.block(q[0] - 4, q[1] - 4, q[0] + 4, q[1] + 4));
    labels.forEach(([q, txt, col, dir]) => { D.circle(g, q[0], q[1], 4, { fill: col }); lab.put(txt, q[0], q[1], dir[0], dir[1], { size: 16, color: col, force: true }); });
    // focus
    if (cur === 'end') D.focus(g, cA1[0] - 22, Math.min(cA1[1], lay.Y0) - 16, 44, Math.abs(cA0[1] - Math.min(cA1[1], lay.Y0)) + 32, t);
    if (cur === 'theta') D.focus(g, cA1[0] - 10, b1p[1] - 10, Math.max(b1p[0], b1[0]) - cA1[0] + 20, b1[1] - b1p[1] + 20, t);
    if (cur === 'phi') D.focus(g, cA1[0] - 10, b2p[1] - 10, Math.max(b2p[0], b2[0]) - cA1[0] + 20, b2[1] - b2p[1] + 20, t);
    if (cur === 'arcs' || cur === 'final') D.focus(g, Math.min(bp[0], cA1[0]) - 14, Math.min(bp[1], cA1[1]) - 14, Math.abs(bp[0] - cA1[0]) + 28, Math.max(bb[1], cA0[1]) - Math.min(bp[1], cA1[1]) + 28, t);
  }

  // ─── plane: compute & draw ───
  function computePlane(p) {
    const m = orthoPlane(p); const edge = m.loc.rest === 'edge'; const cA = Math.cos(rad(p.alpha));
    const lineName = edge ? 'resting edge' : m.loc.rest === 'corner' ? 'line (resting corner → centre)' : 'diameter through the resting point';
    const formulas = [
      { name: 'True area of the lamina', formula: m.loc.n ? 'A = n a² / (4 tan(180°/n))' : 'A = π d² / 4', given: m.loc.n ? `n = ${m.loc.n}, a = ${p.a} mm` : `d = ${p.d} mm`, calc: m.loc.n ? `${m.loc.n} × ${p.a}² / (4 tan ${f3(180 / m.loc.n)}°)` : `π × ${p.d}² / 4`, result: f4(m.loc.area), unit: 'mm²' },
      { name: 'Stage 2: width of the TV (⟂ to the resting edge)', formula: 'w_TV = w cos α', given: `w = ${f4(m.widthTrue)} mm, α = ${p.alpha}°`, calc: `${f4(m.widthTrue)} × ${f4(cA)}`, result: f4(m.widthTV), unit: 'mm' },
      { name: 'Area of the TV', formula: 'A_TV = A cos α', given: `A = ${f4(m.loc.area)} mm²`, calc: `${f4(m.loc.area)} × cos ${p.alpha}°`, result: f4(m.areaTV), unit: 'mm²' },
      { name: 'Inclination of the surface to the VP', formula: edge ? 'cos δ = sin α · cos β' : 'cos δ = sin α · sin β', given: `α = ${p.alpha}°, β = ${p.beta}°`, calc: `δ = cos⁻¹(${f4(Math.cos(rad(m.delta)))})`, result: f3(m.delta), unit: '°' },
      { name: 'Area of the FV', formula: 'A_FV = A cos δ', given: `δ = ${f3(m.delta)}°`, calc: `${f4(m.loc.area)} × cos ${f3(m.delta)}°`, result: f4(m.areaFV), unit: 'mm²' },
    ];
    if (!edge) formulas.push({ name: `True inclination of the ${lineName} to the VP`, formula: 'sin φ = cos α · sin β', given: `α = ${p.alpha}°, β = ${p.beta}°`, calc: `φ = sin⁻¹(${f4(Math.sin(rad(m.lineVP)))})`, result: f3(m.lineVP), unit: '°' });
    return {
      formulas,
      readouts: [
        { label: 'Lamina', value: m.loc.name, tone: 'info' },
        { label: 'Surface ∠HP', value: `${p.alpha}°` },
        { label: 'Surface ∠VP', value: `${f3(m.delta)}°` },
        { label: edge ? 'Edge ∠VP' : 'Line ∠VP (true)', value: `${f3(m.lineVP)}°`, tone: 'good' },
      ],
      state: { mode: 'Projection of planes', lamina: m.loc.label, restsOn: edge ? 'an edge on the HP' : m.loc.rest === 'corner' ? 'a corner on the HP' : 'a point of the rim on the HP', surfaceInclinationHP: `${p.alpha}°`, tvAngleOfRestingLine: `${p.beta}°`, surfaceInclinationVP: `${f3(m.delta)}°`, restingLineTrueAngleVP: `${f3(m.lineVP)}°`, trueArea: `${f4(m.loc.area)} mm²`, areaTV: `${f4(m.areaTV)} mm²`, areaFV: `${f4(m.areaFV)} mm²`, method: 'three-stage (change of position) method' },
      explain: {
        what: `A ${m.loc.label} rests on ${edge ? 'an edge' : m.loc.rest === 'corner' ? 'a corner' : 'a rim point'} on the HP with its surface at α = ${p.alpha}° to the HP; the TV of the ${lineName} makes β = ${p.beta}° with XY. It is drawn in three stages.`,
        why: 'A lamina inclined to both planes shows its true shape in neither view. We start from a simple position (true shape in the TV), tilt the edge view (FV) by α, then turn the TV by β — each change of position keeps one view\'s shape and gives the other by projectors.',
        param: `Shape and size, α (surface to HP), β (plan angle of the ${lineName}) and the resting condition.`,
        effect: `Larger α narrows the TV (w cos α = ${f4(m.widthTV)} mm) and raises the FV; changing β only turns the TV, but it changes the FV shape completely (surface ∠VP δ = ${f3(m.delta)}°, FV area ${f4(m.areaFV)} mm²).`,
      },
    };
  }
  function drawPlane(g, S2) {
    const { p, step, st, dur, t, view } = S2; const prog = clamp(st / dur, 0, 1);
    const m = orthoPlane(p); const PW = PANEL_W.plane;
    const ft = step < 2 ? 0 : step === 2 ? prog : 1; const fr = step < 4 ? 0 : step === 4 ? prog : 1;
    const pose = laminaPose(p, m.loc, ft, fr);
    panel(g, 8, 8, PW, 544, `Lamina — stage ${step < 2 ? 1 : step < 4 ? 2 : 3}`);
    g.save(); g.beginPath(); g.rect(10, 40, PW - 4, 470); g.clip();
    const all = m.stages.reduce((a, s2) => a.concat(s2.pts), []); const b = boundsOf(all);
    const xr = [-10, b.max[0] + 12], yr = [0, b.max[1] + 12], zr = [0, Math.max(b.max[2], 20) + 12];
    const size = Math.max(xr[1] - xr[0], yr[1], zr[1]);
    const P = G.camera(view, PW / 2 + 8, 285, 215 / size, [b.max[0] / 2, b.max[1] / 2, b.max[2] / 2], size * 1.6);
    if (p.showPlanes) planes3(g, P, xr, yr, zr);
    const sc = (q) => { const r = P(q); return [r.x, r.y]; };
    D.poly(g, pose.map((q) => sc([q[0], 0, q[2]])), { close: true, stroke: VCOL.fv, width: 2.2, fill: '#bfdbfe', alpha: 0.9 });
    D.poly(g, pose.map((q) => sc([q[0], q[1], 0])), { close: true, stroke: VCOL.tv, width: 2.2, fill: '#bbf7d0', alpha: 0.9 });
    const viewNow = step === 0 || step === 3 || step === 4 ? 'tv' : 'fv';
    if (p.showProj) pose.forEach((q, i) => { if (!m.loc.names[i]) return; const A = sc(q), B = sc(viewNow === 'tv' ? [q[0], q[1], 0] : [q[0], 0, q[2]]); D.line(g, A[0], A[1], B[0], B[1], { color: VCOL[viewNow], width: 1, dash: [4, 4], alpha: 0.8 }); });
    D.poly(g, pose.map(sc), { close: true, fill: '#fcd34d', stroke: '#92400e', width: 2.4, alpha: 0.85 });
    pose.forEach((q, i) => { const nm = m.loc.names[i]; if (!nm || (m.loc.n === 0 && i % 12)) return; const s = sc(q); D.text(g, nm.toUpperCase(), s[0], s[1] - 12, { size: 15, weight: 800, color: '#92400e', align: 'center', halo: true }); });
    g.restore();
    D.text(g, `α = ${p.alpha}° to HP · β = ${p.beta}° · δ = ${f3(m.delta)}° to VP`, PW / 2 + 8, 518, { size: 15, weight: 700, align: 'center' });
    if (step === 2 || step === 4) D.focus(g, 22, 50, PW - 30, 450, t);
    const X0 = PW + 16; D.text(g, 'Three-stage method (first angle)', X0 + 6, 26, { size: 17, weight: 800 });
    const lay = stageLayout(m.stages, X0, 990, 78, 524, 4);
    drawStageSheet(g, S2, m.stages, ORTHO_PLAN, lay, { titles: ['Stage 1: true shape', 'Stage 2: tilt α', 'Stage 3: turn β'] });
  }

  S['eg-orthographic'] = ortho;

  // ═════════════════════════ 2. PROJECTION OF SOLIDS ═════════════════════════
  const SOLIDS = [{ value: 'prism', label: 'Prism' }, { value: 'pyramid', label: 'Pyramid' }, { value: 'cylinder', label: 'Cylinder' }, { value: 'cone', label: 'Cone' }];
  const SMODES = [
    { key: 'perpHP', label: 'Axis perpendicular to HP' }, { key: 'perpVP', label: 'Axis perpendicular to VP' },
    { key: 'inclHP', label: 'Axis inclined to HP (2-stage)' }, { key: 'inclVP', label: 'Axis inclined to VP (2-stage)' },
    { key: 'both', label: 'Axis inclined to HP and VP (3-stage)' },
  ];
  const PLANS = {
    perpHP: [[], [[0, 'tv']], [[0, 'fv', 'proj']], []],
    perpVP: [[], [[0, 'fv']], [[0, 'tv', 'proj']], []],
    inclHP: [[], [[0, 'tv'], [0, 'fv', 'proj']], [[1, 'fv']], [[1, 'tv', 'proj']], []],
    inclVP: [[], [[0, 'fv'], [0, 'tv', 'proj']], [[1, 'tv']], [[1, 'fv', 'proj']], []],
    both: [[], [[0, 'tv'], [0, 'fv', 'proj']], [[1, 'fv']], [[1, 'tv', 'proj']], [[2, 'tv']], [[2, 'fv', 'proj']], []],
  };
  const SPW = { 1: 450, 2: 380, 3: 330 };
  const isCurved = (p) => p.obj === 'cylinder' || p.obj === 'cone';
  const isPointed = (p) => p.obj === 'pyramid' || p.obj === 'cone';
  function solidName(p) { return p.obj === 'prism' || p.obj === 'pyramid' ? `${POLY[p.n] || p.n + '-sided'} ${p.obj}` : p.obj; }
  function solidDims(p) { return isCurved(p) ? `base Ø${p.d} mm, axis ${p.h} mm` : `base edge ${p.a} mm, axis ${p.h} mm`; }
  const rest = (T, f) => { const b = G.bounds(T); return G.mapSolid(T, (q) => [q[0] - b.min[0], q[1] - b.min[1] + f, q[2] - b.min[2]]); };
  const rotSolid = (T, fn) => G.mapSolid(T, fn);

  function solidGeom(p) {
    const curved = isCurved(p); const n = curved ? 48 : Math.round(p.n); const stepA = 360 / n;
    const base = G.solid(curved ? { type: p.obj, d: p.d, h: p.h } : { type: p.obj, n, a: p.a, h: p.h });
    const R = base.R; const rin = curved ? R : p.a / (2 * Math.tan(Math.PI / n));
    const spinE = curved ? 0 : ((90 % stepA) + stepA) % stepA; const spinC = curved ? 0 : spinE + 180 / n;
    const spinVE = curved ? 0 : ((180 % stepA) + stepA) % stepA; const spinVC = curved ? 0 : spinVE + 180 / n;
    const mode = p.mode; const restKind = curved ? (p.rest === 'corner' ? 'edge' : p.rest === 'face' ? 'lateral' : p.rest) : p.rest;
    const out = { R, rin, curved, n, restKind };
    out.thetaMin = !isPointed(p) ? 0 : deg(Math.atan((restKind === 'corner' || curved ? R : rin) / p.h));
    out.semi = isPointed(p) ? deg(Math.atan(R / p.h)) : 0;
    let s1, tilt = 0, theta = 90, spin = 0;
    if (mode === 'perpVP' || mode === 'inclVP') {
      spin = mode === 'perpVP' ? p.spin : p.vrest === 'corner' ? spinVC : spinVE;
      s1 = rest(rotSolid(rotSolid(base, (q) => G.rotZ(q, rad(spin))), (q) => G.rotX(q, rad(-90))), p.front);
      theta = 0;
    } else {
      spin = mode === 'perpHP' ? p.spin : restKind === 'corner' || restKind === 'lateral' ? spinC : spinE;
      s1 = rest(rotSolid(base, (q) => G.rotZ(q, rad(spin))), p.front);
    }
    const stages = [s1];
    let beta = 0, phi = 0, phiUsed = 0;
    if (mode === 'inclHP' || mode === 'both') {
      if (restKind === 'lateral' || restKind === 'face') {
        if (isPointed(p)) { const g2 = deg(Math.atan((restKind === 'face' ? rin : R) / p.h)); tilt = 90 + g2; theta = g2; }
        else { tilt = 90; theta = 0; }
      } else { theta = Math.max(p.theta, out.thetaMin); tilt = 90 - theta; }
      stages.push(rest(rotSolid(s1, (q) => G.rotY(q, rad(tilt))), p.front));
    }
    if (mode === 'both') {
      if (p.phiType === 'plan') { beta = p.phi; }
      else {
        phiUsed = Math.min(p.phi, 90 - theta); const c = Math.cos(rad(theta));
        beta = c < 1e-6 ? 0 : deg(Math.asin(clamp(Math.sin(rad(phiUsed)) / c, 0, 1)));
      }
      stages.push(rest(rotSolid(stages[1], (q) => G.rotZ(q, rad(beta))), p.front));
    }
    if (mode === 'inclVP') { phi = p.phi; stages.push(rest(rotSolid(s1, (q) => G.rotZ(q, rad(-(90 - phi)))), p.front)); }
    out.tilt = tilt; out.theta = theta; out.beta = beta; out.spin = spin; out.phiUsed = phiUsed;
    const names = base.verts.map((_, i) => {
      if (p.obj === 'prism') return i < n ? LET[i] : String(i - n + 1);
      if (p.obj === 'pyramid') return i < n ? LET[i] : 'o';
      if (p.obj === 'cone') return i === n ? 'o' : null;
      return null;
    });
    const projIdx = base.verts.map((_, i) => i).filter((i) => !curved || (i < n && i % 6 === 0) || (p.obj === 'cone' && i === n) || (p.obj === 'cylinder' && i >= n && (i - n) % 6 === 0));
    out.stages = stages.map((T) => ({ solid: T, pts: T.verts, names, proj: projIdx, views: { fv: G.view(T, 'front'), tv: G.view(T, 'top') }, axis: T.axis, b: G.bounds(T) }));
    if (mode === 'inclHP' || mode === 'both') { const [A, B] = stages[1].axis; out.stages[1].annot = { fv: { i: A[2] <= B[2] ? [A, B] : [B, A], label: `θ = ${f3(theta)}°` } }; }
    if (mode === 'both') { const [A, B] = stages[2].axis; out.stages[2].annot = { tv: { i: A[1] <= B[1] ? [A, B] : [B, A], label: `β = ${f3(beta)}°` } }; }
    if (mode === 'inclVP') { const [A, B] = stages[1].axis; out.stages[1].annot = { tv: { i: A[1] <= B[1] ? [A, B] : [B, A], label: `φ = ${phi}°` } }; }
    const Fs = stages[stages.length - 1]; const [A, B] = Fs.axis; const dv = G.sub(B, A); const L = G.len(dv);
    const cl = (v) => (Math.abs(v) < 1e-7 ? 0 : v);
    out.final = { L, thetaHP: cl(deg(Math.asin(clamp(Math.abs(dv[2]) / L, 0, 1)))), phiVP: cl(deg(Math.asin(clamp(Math.abs(dv[1]) / L, 0, 1)))), fvLen: Math.hypot(dv[0], dv[2]), tvLen: Math.hypot(dv[0], dv[1]), alphaFV: cl(deg(Math.atan2(cl(Math.abs(dv[2])), Math.abs(dv[0])))), betaTV: cl(deg(Math.atan2(cl(Math.abs(dv[1])), Math.abs(dv[0])))) };
    out.s1 = s1;
    return out;
  }
  const solidM = memo(solidGeom);
  /** Pose of the solid in the 3-D panel for fractions of the stage-2 (tilt) and stage-3 (turn) changes. */
  function solidPose(p, m, ft, fr) {
    if (p.mode === 'perpHP' || p.mode === 'perpVP') return m.s1;
    if (p.mode === 'inclVP') return fr > 0 ? rest(rotSolid(m.s1, (q) => G.rotZ(q, rad(-(90 - p.phi) * fr))), p.front) : m.s1;
    let T = ft > 0 ? rest(rotSolid(m.s1, (q) => G.rotY(q, rad(m.tilt * ft))), p.front) : m.s1;
    if (p.mode === 'both' && fr > 0) T = rest(rotSolid(T, (q) => G.rotZ(q, rad(m.beta * fr))), p.front);
    return T;
  }
  function solidStepPose(p, step, prog) {
    const md = p.mode;
    if (md === 'inclHP' || md === 'both') return { ft: step < 2 ? 0 : step === 2 ? prog : 1, fr: step < 4 ? 0 : step === 4 ? prog : 1 };
    if (md === 'inclVP') return { ft: 0, fr: step < 2 ? 0 : step === 2 ? prog : 1 };
    return { ft: 0, fr: 0 };
  }
  function restLabel(p, m) {
    const k = m.restKind;
    if (p.mode === 'perpHP') return 'standing on its base on the HP';
    if (p.mode === 'perpVP') return 'base parallel to the VP, lowest point on the HP';
    if (p.mode === 'inclVP') return `lowest base ${m.curved ? 'point' : p.vrest === 'corner' ? 'corner' : 'edge'} on the HP`;
    if (k === 'corner') return 'resting on a base corner on the HP';
    if (k === 'edge') return m.curved ? 'resting on a point of its base rim on the HP' : 'resting on a base edge on the HP';
    if (k === 'face') return p.obj === 'pyramid' ? 'lying on a triangular face on the HP' : 'lying on a rectangular face on the HP';
    return p.obj === 'cone' || p.obj === 'cylinder' ? 'lying on a generator on the HP' : p.obj === 'pyramid' ? 'lying on a slant edge on the HP' : 'lying on a longitudinal edge on the HP';
  }

  S['eg-projection-solids'] = {
    view3d: true,
    initialView: { yaw: 0.7, pitch: 0.38, zoom: 1 },
    approx: 'Exact change-of-position construction with EGGeom. Cylinders and cones are modelled with 48 facets, so only their outline generators appear in the views (as on a hand drawing); 8 generator points per circle are projected.',
    modes: SMODES,
    tools: [{ key: 'orbit', label: '🎥 Orbit camera', title: 'Drag in the 3-D panel to look around the solid' }, { key: 'rotate', label: '🔄 Rotate object', title: 'Drag the solid: up/down changes the axis angle with the HP (θ), left/right the angle with the VP (φ) or the rotation about the axis' }],
    initUi: () => ({ tool: 'orbit' }),
    saveUi: (ui) => ({ tool: ui.tool }),
    restoreUi: (saved, ui) => Object.assign(ui, { tool: saved && saved.tool === 'rotate' ? 'rotate' : 'orbit' }),
    params: [
      { key: 'obj', label: 'Solid', type: 'select', options: SOLIDS, default: 'pyramid' },
      { key: 'n', label: 'Number of base sides', type: 'range', min: 3, max: 6, step: 1, default: 5, showIf: (p) => !isCurved(p) },
      { key: 'a', label: 'Base edge a', type: 'range', min: 15, max: 40, step: 1, default: 30, unit: 'mm', showIf: (p) => !isCurved(p) },
      { key: 'd', label: 'Base diameter d', type: 'range', min: 20, max: 60, step: 1, default: 50, unit: 'mm', showIf: (p) => isCurved(p) },
      { key: 'h', label: 'Axis length h', type: 'range', min: 30, max: 80, step: 1, default: 60, unit: 'mm' },
      { key: 'spin', label: 'Rotation about the axis (base edge to XY)', type: 'range', min: 0, max: 90, step: 5, default: 0, unit: '°', showIf: (p) => (p.mode === 'perpHP' || p.mode === 'perpVP') && !isCurved(p) },
      { key: 'rest', label: 'Resting on the HP on', type: 'select', options: [{ value: 'edge', label: 'a base edge (rim point)' }, { value: 'corner', label: 'a base corner' }, { value: 'lateral', label: 'a slant / longitudinal edge or generator' }, { value: 'face', label: 'a lateral face' }], default: 'edge', showIf: (p) => p.mode === 'inclHP' || p.mode === 'both' },
      { key: 'vrest', label: 'Lowest part of the base on the HP', type: 'select', options: [{ value: 'edge', label: 'a base edge' }, { value: 'corner', label: 'a base corner' }], default: 'edge', showIf: (p) => p.mode === 'inclVP' && !isCurved(p) },
      { key: 'theta', label: 'Axis inclined to HP θ', type: 'range', min: 0, max: 90, step: 1, default: 30, unit: '°', showIf: (p) => (p.mode === 'inclHP' || p.mode === 'both') && (p.rest === 'edge' || p.rest === 'corner') },
      { key: 'phiType', label: 'Inclination with the VP given as', type: 'select', options: [{ value: 'true', label: 'true angle φ of the axis with the VP' }, { value: 'plan', label: 'angle β of the TV of the axis with XY' }], default: 'true', showIf: (p) => p.mode === 'both' },
      { key: 'phi', label: 'Axis angle with VP φ (or plan angle β)', type: 'range', min: 0, max: 90, step: 1, default: 30, unit: '°', showIf: (p) => p.mode === 'inclVP' || p.mode === 'both' },
      { key: 'front', label: 'Nearest point in front of VP', type: 'range', min: 0, max: 40, step: 1, default: 10, unit: 'mm' },
      { key: 'showHidden', label: 'Show hidden edges', type: 'toggle', default: true },
      { key: 'showProj', label: 'Show projectors', type: 'toggle', default: true },
      { key: 'showPlanes', label: 'Show reference planes', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Hexagonal prism 25 × 60 standing on its base, an edge ∥ VP', values: { mode: 'perpHP', obj: 'prism', n: 6, a: 25, h: 60, spin: 0 } },
      { label: 'Pentagonal pyramid 30 × 60, base edge on HP, axis 30° to HP', values: { mode: 'inclHP', obj: 'pyramid', n: 5, a: 30, h: 60, rest: 'edge', theta: 30 } },
      { label: 'Cone Ø50 × 60 lying on a generator on the HP', values: { mode: 'inclHP', obj: 'cone', d: 50, h: 60, rest: 'lateral' } },
      { label: 'Cylinder Ø40 × 60, axis ∥ HP and 30° to VP', values: { mode: 'inclVP', obj: 'cylinder', d: 40, h: 60, phi: 30 } },
      { label: 'Square pyramid 35 × 60, base corner on HP, axis 45° to HP and 30° to VP', values: { mode: 'both', obj: 'pyramid', n: 4, a: 35, h: 60, rest: 'corner', theta: 45, phiType: 'true', phi: 30 } },
    ],
    validate(p) {
      const w = []; const m = solidM(p);
      if ((p.mode === 'inclHP' || p.mode === 'both') && (p.rest === 'edge' || p.rest === 'corner') && isPointed(p) && p.theta < m.thetaMin) w.push(`θ = ${p.theta}° is too small: the ${p.obj} would tip onto its ${p.obj === 'cone' ? 'generator' : m.restKind === 'corner' ? 'slant edge' : 'face'} — θ is limited to ${f3(m.thetaMin)}°.`);
      if (p.mode === 'both' && p.phiType === 'true' && m.theta + p.phi > 90) w.push(`θ + φ = ${f3(m.theta + p.phi)}° > 90° is impossible — φ is limited to ${f3(90 - m.theta)}°.`);
      if ((p.mode === 'inclHP' || p.mode === 'both') && (p.rest === 'corner' || p.rest === 'face') && isCurved(p)) w.push(`A ${p.obj} has no ${p.rest === 'corner' ? 'corners' : 'flat lateral faces'} — shown ${p.rest === 'corner' ? 'resting on a rim point' : 'lying on a generator'} instead.`);
      if (p.front === 0) w.push('The solid touches the VP — its TV touches XY.');
      return w;
    },
    compute(p) {
      const m = solidM(p); const name = solidName(p); const F = m.final; const md = p.mode;
      const formulas = [];
      formulas.push(isCurved(p)
        ? { name: 'Base radius', formula: 'R = d / 2', given: `d = ${p.d} mm`, calc: `${p.d} / 2`, result: f4(m.R), unit: 'mm' }
        : { name: 'Circumradius of the base', formula: 'R = a / (2 sin(180°/n))', given: `a = ${p.a} mm, n = ${p.n}`, calc: `${p.a} / (2 sin ${f3(180 / p.n)}°)`, result: f4(m.R), unit: 'mm' });
      if (isPointed(p)) formulas.push({ name: p.obj === 'cone' ? 'Semi-vertical angle and slant height' : 'Angle between axis and slant edge', formula: 'tan γ = R / h ,  l = √(R² + h²)', given: `R = ${f4(m.R)} mm, h = ${p.h} mm`, calc: `γ = tan⁻¹(${f4(m.R / p.h)})`, result: `γ = ${f3(m.semi)}°, l = ${f4(Math.hypot(m.R, p.h))} mm`, unit: '°, mm' });
      if ((md === 'inclHP' || md === 'both') && (m.restKind === 'lateral' || m.restKind === 'face')) formulas.push({ name: 'Axis angle when lying on the HP', formula: isPointed(p) ? `θ = tan⁻¹(${m.restKind === 'face' ? 'r' : 'R'} / h)` : 'θ = 0 (axis ∥ HP)', given: isPointed(p) ? `${m.restKind === 'face' ? `r (apothem) = ${f4(m.rin)}` : `R = ${f4(m.R)}`} mm, h = ${p.h} mm` : 'solid lies on its side', calc: isPointed(p) ? `tan⁻¹(${f4((m.restKind === 'face' ? m.rin : m.R) / p.h)})` : 'axis horizontal', result: f3(m.theta), unit: '°' });
      else if ((md === 'inclHP' || md === 'both') && isPointed(p)) formulas.push({ name: 'Smallest θ when resting on the base', formula: `θ_min = tan⁻¹(${m.restKind === 'corner' || isCurved(p) ? 'R' : 'r'} / h)`, given: `${m.restKind === 'corner' || isCurved(p) ? `R = ${f4(m.R)}` : `r (apothem) = ${f4(m.rin)}`} mm, h = ${p.h} mm`, calc: `tan⁻¹(${f4((m.restKind === 'corner' || isCurved(p) ? m.R : m.rin) / p.h)})`, result: f3(m.thetaMin), unit: '°' });
      if (md === 'both') formulas.push(p.phiType === 'plan'
        ? { name: 'True angle of the axis with the VP', formula: 'sin φ = cos θ · sin β', given: `θ = ${f3(m.theta)}°, β = ${p.phi}°`, calc: `${f4(Math.cos(rad(m.theta)))} × ${f4(Math.sin(rad(p.phi)))}`, result: f3(F.phiVP), unit: '°' }
        : { name: 'Plan angle of the axis (stage 3 rotation)', formula: 'sin β = sin φ / cos θ', given: `φ = ${f3(m.phiUsed)}°, θ = ${f3(m.theta)}°`, calc: `${f4(Math.sin(rad(m.phiUsed)))} / ${f4(Math.cos(rad(m.theta)))}`, result: f3(m.beta), unit: '°' });
      formulas.push({ name: 'Length of the axis in the FV', formula: 'l_FV = h cos φ', given: `h = ${p.h} mm, φ = ${f3(F.phiVP)}°`, calc: `${p.h} × cos ${f3(F.phiVP)}°`, result: f4(F.fvLen), unit: 'mm' });
      formulas.push({ name: 'Length of the axis in the TV', formula: 'l_TV = h cos θ', given: `h = ${p.h} mm, θ = ${f3(F.thetaHP)}°`, calc: `${p.h} × cos ${f3(F.thetaHP)}°`, result: f4(F.tvLen), unit: 'mm' });
      if (md === 'both') formulas.push({ name: 'Apparent angle of the axis in the final FV', formula: 'tan α = Δz / Δx', given: 'axis components in the final position', calc: `α = tan⁻¹(${f4(Math.tan(rad(F.alphaFV)))})`, result: f3(F.alphaFV), unit: '°' });
      const orient = md === 'perpHP' ? 'axis perpendicular to the HP' : md === 'perpVP' ? 'axis perpendicular to the VP' : md === 'inclHP' ? `axis inclined ${f3(F.thetaHP)}° to the HP and parallel to the VP` : md === 'inclVP' ? `axis parallel to the HP and inclined ${p.phi}° to the VP` : `axis inclined ${f3(F.thetaHP)}° to the HP and ${f3(F.phiVP)}° to the VP (TV of axis at β = ${f3(m.beta)}° to XY)`;
      const nst = m.stages.length; const lastS = m.stages[nst - 1];
      return {
        formulas,
        readouts: [
          { label: 'Solid', value: name, tone: 'info' },
          { label: 'Axis ∠HP θ', value: `${f3(F.thetaHP)}°` },
          { label: 'Axis ∠VP φ', value: `${f3(F.phiVP)}°` },
          { label: nst > 1 ? `${nst}-stage method` : 'Simple position', value: `TV axis ${f3(F.tvLen)} mm`, tone: 'good' },
        ],
        state: { mode: SMODES.find((s2) => s2.key === md).label, currentObject: name, dimensions: solidDims(p), restingCondition: restLabel(p, m), currentOrientation: orient, axisAngleHP: `${f3(F.thetaHP)}°`, axisAngleVP: `${f3(F.phiVP)}°`, planAngleOfAxis: `${f3(F.betaTV)}°`, axisLengthFV: `${f4(F.fvLen)} mm`, axisLengthTV: `${f4(F.tvLen)} mm`, stages: nst, finalFV: `${lastS.views.fv.visible.length} visible / ${lastS.views.fv.hidden.length} hidden edges`, finalTV: `${lastS.views.tv.visible.length} visible / ${lastS.views.tv.hidden.length} hidden edges`, projection: 'first angle' },
        explain: {
          what: `A ${name} (${solidDims(p)}) is ${restLabel(p, m)} with its ${orient}. ${nst > 1 ? `It is drawn by the change-of-position method in ${nst} stages.` : 'This is a simple position, so one view shows the base in true shape.'}`,
          why: nst > 1 ? 'A solid inclined to a plane shows no true shape in the views, so we first draw it in a simple position (axis ⟂ to a plane, base in true shape), then tilt one view to the required angle and get the other view by projectors; a third stage turns the TV for the inclination to the VP.' : 'The base is parallel to one reference plane, so that view shows it in true shape; the other view is projected from it with heights (or depths) of the solid.',
          param: `Solid type and size, resting condition, θ (axis to HP)${md === 'both' || md === 'inclVP' ? ', φ (axis to VP)' : ''}${md.startsWith('perp') ? ', rotation about the axis' : ''}.`,
          effect: `The axis appears ${f4(F.fvLen)} mm long in the FV (h cos φ) and ${f4(F.tvLen)} mm in the TV (h cos θ). Increasing θ lengthens the FV of the axis and shortens its TV; ${md === 'both' ? `turning the TV by β = ${f3(m.beta)}° changes the whole FV shape but not the heights of the corners.` : 'moving the solid away from a plane moves its view away from XY without changing its shape.'}`,
        },
      };
    },
    steps(p) {
      const m = solidM(p); const name = solidName(p); const md = p.mode;
      const s1 = { title: 'Stage 1 — simple position', text: md === 'perpVP' || md === 'inclVP' ? `The ${name} is placed with its axis ⟂ VP (base ∥ VP), ${p.front} mm in front of the VP, ${restLabel(p, m)}.` : `The ${name} stands on its base on the HP (axis ⟂ HP), ${p.front} mm in front of the VP${md !== 'perpHP' ? `, with the ${m.restKind === 'corner' ? 'resting corner' : m.restKind === 'edge' ? 'resting edge' : 'resting side'} at the right` : ''}.` };
      if (md === 'perpHP') return [s1,
        { title: 'Top view first — true shape of the base', text: `The base is ∥ HP, so the TV is the true ${isCurved(p) ? 'circle' : 'polygon'}${isCurved(p) ? '' : ` (edge ${p.a} mm, turned ${p.spin}°)`}.` },
        { title: 'Front view by projectors', text: `Vertical projectors from every corner; the height ${p.h} mm gives the ${isPointed(p) ? 'apex' : 'top face'}.` },
        { title: 'Final views — visible and hidden', text: 'Edges hidden behind the solid are dashed; the axis is a chain line.' }];
      if (md === 'perpVP') return [s1,
        { title: 'Front view first — true shape of the base', text: 'The base is ∥ VP, so the FV is its true shape.' },
        { title: 'Top view by projectors', text: `Vertical projectors from every corner; the axis length ${p.h} mm is measured ⟂ XY in the TV.` },
        { title: 'Final views — visible and hidden', text: 'Edges hidden from the observer are dashed; the axis is a chain line.' }];
      const st = [s1, { title: 'Stage 1 — views of the simple position', text: md === 'inclVP' ? 'FV = true shape of the base; TV by vertical projectors (axis ⟂ XY).' : 'TV = true shape of the base; FV by vertical projectors (axis ⟂ XY).' }];
      if (md === 'inclVP') {
        st.push({ title: 'Stage 2 — turn the TV by φ', text: `Redraw the stage-1 TV with the axis at φ = ${p.phi}° to XY (axis ∥ HP, so the TV shows the true angle).` });
        st.push({ title: 'Stage 2 — new FV by projectors', text: 'Vertical projectors from the new TV meet horizontal projectors (heights) from the stage-1 FV.' });
      } else {
        st.push({ title: 'Stage 2 — tilt the FV', text: m.restKind === 'lateral' || m.restKind === 'face' ? `Redraw the stage-1 FV so that it is ${restLabel(p, m)}: the axis is then at θ = ${f3(m.theta)}° to the HP.` : `Redraw the stage-1 FV turned about the ${m.restKind === 'corner' ? 'resting corner' : 'resting edge'} so the axis makes θ = ${f3(m.theta)}° with XY.` });
        st.push({ title: 'Stage 2 — new TV by projectors', text: 'Vertical projectors from the tilted FV meet horizontal projectors from the stage-1 TV (distances from the VP are unchanged).' });
      }
      if (md === 'both') {
        st.push({ title: 'Stage 3 — turn the TV by β', text: p.phiType === 'plan' ? `Reproduce the stage-2 TV with its axis at β = ${p.phi}° to XY.` : `Reproduce the stage-2 TV with its axis at β = sin⁻¹(sin φ / cos θ) = ${f3(m.beta)}° to XY, so that the true angle with the VP is φ = ${f3(m.phiUsed)}°.` });
        st.push({ title: 'Stage 3 — final FV by projectors', text: 'Vertical projectors from the final TV meet horizontal projectors (heights) from the stage-2 FV.' });
      }
      st.push({ title: 'Final projections', text: `Axis: θ = ${f3(m.final.thetaHP)}° to HP, φ = ${f3(m.final.phiVP)}° to VP; FV length ${f4(m.final.fvLen)} mm, TV length ${f4(m.final.tvLen)} mm. Hidden edges dashed.` });
      return st;
    },
    onPointer(type, x, y, S2) {
      const { p, ui } = S2; const m = solidM(p); const PW = SPW[m.stages.length];
      if (type === 'down') {
        if (x > PW + 14) {
          if (m.stages.length < 2) return null;
          const lay = stageLayout(m.stages, PW + 14, 990, 78, 524, 3);
          const k = lay.cols.findIndex((c, i) => x >= c + m.stages[i].b.min[0] * lay.s - 20 && x <= c + m.stages[i].b.max[0] * lay.s + 20);
          if (k < 0) return null;
          const plan = PLANS[p.mode]; const sIdx = plan.findIndex((evs) => evs.some((e) => e[0] === k));
          return sIdx >= 0 ? { step: sIdx, toast: `Stage ${k + 1}` } : null;
        }
        if (ui.tool !== 'rotate') return null;
        ui.drag = { x, y, theta: p.theta, phi: p.phi, spin: p.spin }; return { redraw: true };
      }
      if (!ui.drag) return null;
      if (type === 'move') {
        const dx = x - ui.drag.x, dy = ui.drag.y - y; const out = {};
        if (p.mode === 'perpHP' || p.mode === 'perpVP') { if (!isCurved(p)) out.spin = clamp(Math.round((ui.drag.spin + dx * 0.4) / 5) * 5, 0, 90); }
        else {
          if ((p.mode === 'inclHP' || p.mode === 'both') && (p.rest === 'edge' || p.rest === 'corner')) out.theta = Math.round(clamp(ui.drag.theta + dy * 0.4, 0, 90));
          if (p.mode === 'inclVP' || p.mode === 'both') { const th = out.theta == null ? m.theta : Math.max(out.theta, m.thetaMin); out.phi = Math.round(clamp(ui.drag.phi + dx * 0.4, 0, p.mode === 'both' && p.phiType === 'true' ? 90 - th : 90)); }
        }
        const changed = Object.keys(out).some((k) => out[k] !== p[k]);
        return changed ? { params: out } : null;
      }
      if (type === 'up') { ui.drag = null; return { recompute: true }; }
      return null;
    },
    draw(g, S2) {
      const { p, step, st, dur, t, view } = S2; const prog = clamp(st / dur, 0, 1);
      const m = solidM(p); const nst = m.stages.length; const PW = SPW[nst]; const plan = PLANS[p.mode];
      D.clear(g, '#ffffff');
      // ── 3-D ──
      const { ft, fr } = solidStepPose(p, step, prog); const pose = solidPose(p, m, ft, fr);
      const stageNow = p.mode === 'both' ? (step < 2 ? 1 : step < 4 ? 2 : 3) : nst > 1 ? (step < 2 ? 1 : 2) : 1;
      panel(g, 8, 8, PW, 544, nst > 1 ? `3-D solid — stage ${stageNow} of ${nst}` : '3-D solid — simple position');
      g.save(); g.beginPath(); g.rect(10, 40, PW - 4, 460); g.clip();
      const bs = m.stages.map((s2) => s2.b); const bx = Math.max(...bs.map((b) => b.max[0])), by = Math.max(...bs.map((b) => b.max[1])), bz = Math.max(...bs.map((b) => b.max[2]));
      const size = Math.max(bx + 30, by + 20, bz + 20);
      const P = G.camera(view, PW / 2 + 8, 290, (PW * 0.5) / size, [bx / 2, by / 2, bz / 2], size * 1.6);
      if (p.showPlanes) G.drawPlanes3(g, P, { x: [-14, bx + 14], y: [0, by + 16], z: [0, bz + 16] }, {});
      const fvP = G.view(pose, 'front'), tvP = G.view(pose, 'top');
      fvP.visible.forEach(([a, c]) => { const A = P([a[0], 0, a[1]]), B = P([c[0], 0, c[1]]); D.line(g, A.x, A.y, B.x, B.y, { color: VCOL.fv, width: 2 }); });
      tvP.visible.forEach(([a, c]) => { const A = P([a[0], a[1], 0]), B = P([c[0], c[1], 0]); D.line(g, A.x, A.y, B.x, B.y, { color: VCOL.tv, width: 2 }); });
      const evs = plan[step] || []; const curV = evs.length ? evs[Math.min(evs.length - 1, Math.floor(prog * evs.length))][1] : null;
      if (p.showProj && curV) {
        const k = evs[0][0]; m.stages[k].proj.forEach((i) => {
          const q = pose.verts[i]; if (!q) return; const target = curV === 'fv' ? [q[0], 0, q[2]] : [q[0], q[1], 0]; const A = P(q), B = P(target);
          D.line(g, A.x, A.y, B.x, B.y, { color: VCOL[curV], width: 1.1, dash: [4, 4], alpha: 0.85 });
        });
      }
      G.drawSolid3(g, pose, P, { fill: '#93c5fd', showHidden: p.showHidden, alpha: 0.88 });
      if (pose.axis) { const A = P(pose.axis[0]), B = P(pose.axis[1]); D.line(g, A.x, A.y, B.x, B.y, { ...G.LINE.centre, width: 1.6 }); }
      g.restore();
      const F = m.final;
      const info = nst === 1 ? `${solidName(p)} — ${restLabel(p, m)}` : `θ = ${f3(F.thetaHP)}° to HP · φ = ${f3(F.phiVP)}° to VP${p.mode === 'both' ? ` · β = ${f3(m.beta)}°` : ''}`;
      D.text(g, info, PW / 2 + 8, 512, { size: 15, weight: 700, align: 'center' });
      D.text(g, S2.ui.tool === 'rotate' ? (nst === 1 ? 'Drag ↔ to turn the solid about its axis' : 'Drag ↕ θ  ·  ↔ φ — views regenerate') : 'Drag to orbit · wheel / pinch zoom · ✋ pan', PW / 2 + 8, 538, { size: 14, color: C.muted, align: 'center' });
      if (step === 0 || (nst > 1 && (step === 2 || (p.mode === 'both' && step === 4)))) D.focus(g, 22, 50, PW - 30, 440, t);
      // ── sheet ──
      const X0 = PW + 14;
      D.text(g, nst > 1 ? `Change-of-position method — ${nst} stages` : 'Projections (first angle)', X0 + 6, 26, { size: 17, weight: 800 });
      const lay = stageLayout(m.stages, X0, 990, 78, 524, 3);
      const titles = nst === 1 ? ['Simple position'] : p.mode === 'inclVP' ? ['Stage 1: axis ⟂ VP', 'Stage 2: turn φ'] : nst === 2 ? ['Stage 1: axis ⟂ HP', 'Stage 2: tilt θ'] : ['Stage 1: axis ⟂ HP', 'Stage 2: tilt θ', 'Stage 3: turn β'];
      drawStageSheet(g, S2, m.stages, plan, lay, { titles });
      if (step === 0) D.text(g, 'Views appear here as you step through', (X0 + 990) / 2, 470, { size: 16, color: C.faint, align: 'center' });
    },
  };
})();
