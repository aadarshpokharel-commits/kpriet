'use strict';

/* Engineering Mathematics — Unit IV: Line and Surface Integrals (unified vector-calculus engine). */
(function () {
  const D = window.EPDraw; const M = window.MACore; const { Num, Expr, Solve, Plot, MPoly, ParseError } = M; const { define, F } = window.MAFrame;
  const d5 = (v) => Num.fmt(v, { digits: 6 }); const V3 = ['x', 'y', 'z']; const V2 = ['x', 'y'];
  const agree = (a, b) => Math.abs(a - b) <= 2e-4 * Math.max(1, Math.abs(a), Math.abs(b));

  // ───── Vector-calculus engine ─────
  const VC = {
    field(P, Q, R, vars) { const fs = [Expr.fn(P, vars), Expr.fn(Q, vars)].concat(R != null ? [Expr.fn(R, vars)] : []); return fs; },
    curl3([P, Q, R]) { const c = [[R.d('y'), Q.d('z')], [P.d('z'), R.d('x')], [Q.d('x'), P.d('y')]].map(([a, b]) => Expr.fromAst(Expr.simp(Expr.simp({ op: '-', a: a.ast, b: b.ast })), V3)); return c; },
    div3([P, Q, R]) { return Expr.fromAst(Expr.simp(Expr.simp({ op: '+', a: { op: '+', a: P.d('x').ast, b: Q.d('y').ast }, b: R.d('z').ast })), V3); },
    /** ∫ F·dr along r(t) = pieces [{x(t), y(t), z(t)?, t0, t1, name}] (numeric Simpson per piece). */
    lineIntegral(Fv, pieces, dim) {
      return pieces.map((pc) => {
        const g = (t) => { const r = pc.r(t), dr = pc.dr(t); const env = dim === 3 ? r : [r[0], r[1]]; return Fv.reduce((s, Fi, i) => s + Fi(...env) * dr[i], 0); };
        return { ...pc, value: Solve.simpson(g, pc.t0, pc.t1, 400), integrand: g };
      });
    },
    /** Numeric flux ∬ F·(r_u × r_v) du dv over a parametric patch. */
    flux(Fv, patch) { return Solve.simpson((u) => Solve.simpson((v) => { const r = patch.r(u, v), n = patch.n(u, v); return Fv[0](...r) * n[0] + Fv[1](...r) * n[1] + Fv[2](...r) * n[2]; }, patch.v0, patch.v1, 48), patch.u0, patch.u1, 48); },
    /** Symbolic integrand along a curve (substitute x(t), y(t), z(t), multiply by derivatives). */
    curveIntegrandStr(Fv, curve, dim) {
      try {
        const map = { x: Expr.fn(curve.xs, ['t']).ast, y: Expr.fn(curve.ys, ['t']).ast }; if (dim === 3) map.z = Expr.fn(curve.zs, ['t']).ast;
        const ds = ['xs', 'ys', 'zs'].slice(0, dim).map((k) => Expr.fn(curve[k], ['t']).d('t').ast);
        let sum = null; Fv.forEach((Fi, i) => { const term = { op: '*', a: Expr.subst(Fi.ast, map), b: ds[i] }; sum = sum ? { op: '+', a: sum, b: term } : term; });
        return Expr.str(Expr.simp(Expr.simp(sum)));
      } catch (e) { return null; }
    },
  };
  window.MAVectorCalc = VC;

  const arrowField2 = (g, A, Fv, o = {}) => Plot.field(g, A, (x, y) => Fv[0](x, y), (x, y) => Fv[1](x, y), { n: o.n || 12, color: o.color });
  /** Draws an oriented closed/open 2-D path with direction arrows. */
  function pathArrows(g, A, pieces, o = {}) {
    pieces.forEach((pc) => {
      const pts = []; for (let i = 0; i <= 120; i++) { const t = pc.t0 + ((pc.t1 - pc.t0) * i) / 120; const r = pc.r(t); pts.push([A.X(r[0]), A.Y(r[1])]); }
      D.poly(g, pts, { stroke: o.color || '#0f172a', width: o.width || 3.5 });
      [0.3, 0.7].forEach((fr) => { const t = pc.t0 + (pc.t1 - pc.t0) * fr; const r = pc.r(t), dr = pc.dr(t); const L = Math.hypot(dr[0], dr[1]) || 1; D.arrow(g, A.X(r[0]), A.Y(r[1]), A.X(r[0]) + (dr[0] / L) * 18, A.Y(r[1]) - (dr[1] / L) * 18, { color: o.color || '#0f172a', width: 3, head: 13 }); });
    });
  }

  // ─────────────── 1. Line integral ───────────────
  define('ma-line-integral', {
    modes: [{ key: 'vector', label: 'Vector field: ∫ F·dr' }, { key: 'scalar', label: 'Scalar field: ∫ f ds' }],
    params: [
      { key: 'P', label: 'F₁ = P(x, y) =', type: 'text', default: 'x*y', showIf: (p) => p.mode !== 'scalar' },
      { key: 'Q', label: 'F₂ = Q(x, y) =', type: 'text', default: 'x^2', showIf: (p) => p.mode !== 'scalar' },
      { key: 'fs', label: 'f(x, y) =', type: 'text', default: 'x + y', showIf: (p) => p.mode === 'scalar' },
      { key: 'xs', label: 'x(t) =', type: 'text', default: 't' }, { key: 'ys', label: 'y(t) =', type: 'text', default: 't^2' },
      { key: 't0', label: 't from', type: 'text', default: '0' }, { key: 't1', label: 't to', type: 'text', default: '1' },
    ],
    examples: [{ label: '∫ xy dx + x² dy along y = x², 0→1', values: { mode: 'vector', P: 'x*y', Q: 'x^2', xs: 't', ys: 't^2', t0: '0', t1: '1' } }, { label: 'Work of F = (−y, x) round the unit circle', values: { mode: 'vector', P: '-y', Q: 'x', xs: 'cos(t)', ys: 'sin(t)', t0: '0', t1: '2*pi' } }, { label: 'Gradient field F = (2x, 2y): path independent', values: { mode: 'vector', P: '2*x', Q: '2*y', xs: 't', ys: 'sin(3*t)', t0: '0', t1: '2' } }, { label: 'Mass of a wire ∫ (x + y) ds on a segment', values: { mode: 'scalar', fs: 'x + y', xs: 't', ys: '2*t', t0: '0', t1: '1' } }],
    inputOf: (p) => ({ field: p.mode === 'scalar' ? p.fs : `F = (${p.P}, ${p.Q})`, curve: `(${p.xs}, ${p.ys})`, t: [p.t0, p.t1] }),
    solve(p) {
      const X = Expr.fn(p.xs, ['t']), Y = Expr.fn(p.ys, ['t']); const Xd = X.d('t'), Yd = Y.d('t'); const t0 = Expr.fn(p.t0, [])(), t1 = Expr.fn(p.t1, [])(); if (!(t1 > t0)) throw new ParseError('Need t to > t from.');
      const piece = { r: (t) => [X(t), Y(t)], dr: (t) => [Xd(t), Yd(t)], t0, t1 };
      let value, integrandStr, g, Fv = null, fsc = null;
      if (p.mode === 'scalar') {
        fsc = Expr.fn(p.fs, V2); g = (t) => fsc(X(t), Y(t)) * Math.hypot(Xd(t), Yd(t)); value = Solve.simpson(g, t0, t1, 400);
        integrandStr = `f(x(t), y(t))·√(x′² + y′²) = (${Expr.str(Expr.simp(Expr.subst(fsc.ast, { x: X.ast, y: Y.ast })))})·√((${Xd.str})² + (${Yd.str})²)`;
      } else {
        Fv = VC.field(p.P, p.Q, null, V2); const [res] = VC.lineIntegral(Fv, [piece], 2); value = res.value; g = res.integrand;
        integrandStr = VC.curveIntegrandStr(Fv, { xs: p.xs, ys: p.ys }, 2) || 'P x′ + Q y′';
      }
      // exact when the t-integrand is a polynomial
      let exact = null; try { const ast = p.mode === 'scalar' ? null : Expr.parse(integrandStr.replace(/·/g, '*').replace(/−/g, '-'), ['t']); const P1 = ast && MPoly.fromAst(Expr.simp(ast), ['t']); if (P1) { const I1 = MPoly.integrate(P1, 0); exact = { anti: MPoly.str(I1, ['t']), value: MPoly.evalAt(I1, [t1]) - MPoly.evalAt(I1, [t0]) }; } } catch (e) { exact = null; }
      const final = exact ? exact.value : value;
      const steps = [
        { title: 'The curve (parametrisation)', text: `r(t) = (${X.str}, ${Y.str}), ${Num.fmt(t0)} ≤ t ≤ ${Num.fmt(t1)}`, lines: [`x = ${X.str},  y = ${Y.str}`, `t from ${Num.fmt(t0)} to ${Num.fmt(t1)} (the direction of traversal)`] },
        { title: 'Derivatives', text: '', lines: [`dx = ${Xd.str} dt`, `dy = ${Yd.str} dt`, ...(p.mode === 'scalar' ? [`ds = √(x′² + y′²) dt`] : [])] },
        { title: 'The field on the curve', text: '', lines: p.mode === 'scalar' ? [`f = ${fsc.str}`, `f(r(t)) = ${Expr.str(Expr.simp(Expr.subst(fsc.ast, { x: X.ast, y: Y.ast })))}`] : [`F = (${Fv[0].str}, ${Fv[1].str})`, `P(r(t)) = ${Expr.str(Expr.simp(Expr.subst(Fv[0].ast, { x: X.ast, y: Y.ast })))}`, `Q(r(t)) = ${Expr.str(Expr.simp(Expr.subst(Fv[1].ast, { x: X.ast, y: Y.ast })))}`] },
        { title: 'Integrand in t', text: '', lines: [p.mode === 'scalar' ? '∫ f ds = ∫ f(r(t)) |r′(t)| dt' : '∫ F·dr = ∫ (P x′ + Q y′) dt', { t: `= ∫ ${integrandStr} dt`, b: true }] },
        { title: 'Integrate', text: exact ? `antiderivative ${exact.anti}` : 'Simpson’s rule', lines: exact ? [`Antiderivative: ${exact.anti}`, `[…]t=${Num.fmt(t1)} − […]t=${Num.fmt(t0)}`, { t: `= ${Num.fmt(exact.value)}`, b: true, c: '#15803d' }] : [`Numerical integration (Simpson, 400 sub-intervals)`, { t: `= ${d5(value)}`, b: true, c: '#15803d' }] },
      ];
      return { steps, mode: p.mode, piece, Fv, fsc, g, t0, t1, value: final, formulas: [F(p.mode === 'scalar' ? 'Scalar line integral' : 'Line integral (work)', p.mode === 'scalar' ? '∫_C f ds = ∫ f(r(t)) |r′(t)| dt' : '∫_C F·dr = ∫ (P dx/dt + Q dy/dt) dt', `r(t) = (${X.str}, ${Y.str})`, integrandStr, Num.fmt(final))], readouts: [{ label: p.mode === 'scalar' ? '∫ f ds' : '∫ F·dr', value: Num.fmt(final), tone: 'good' }], state: { field: p.mode === 'scalar' ? fsc.str : `(${Fv[0].str}, ${Fv[1].str})`, curve: `(${X.str}, ${Y.str}), t ∈ [${Num.fmt(t0)}, ${Num.fmt(t1)}]`, integrand: integrandStr, value: d5(final) }, explain: { what: `Along the curve the ${p.mode === 'scalar' ? 'values of f are added per unit length' : 'tangential component of F is accumulated (work done)'}: total ${Num.fmt(final)}.`, why: 'Parametrising the curve turns the line integral into an ordinary integral in t.', param: 'The field and the curve.', effect: p.mode === 'scalar' ? 'Reversing the direction does not change ∫ f ds.' : 'Reversing the direction changes the sign of ∫ F·dr; for a gradient field only the end points matter.' } };
    },
    plot(g, box, sol, S) {
      const [bx, by, bw, bh] = box; const pts = []; for (let i = 0; i <= 200; i++) pts.push(sol.piece.r(sol.t0 + ((sol.t1 - sol.t0) * i) / 200));
      const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]); const pad = 0.6; const A = Plot.axes(g, [bx, by, bw, bh * 0.66], [Math.min(...xs) - pad, Math.max(...xs) + pad], [Math.min(...ys) - pad, Math.max(...ys) + pad], { equal: true, xl: 'x', yl: 'y' });
      if (sol.mode === 'vector') arrowField2(g, A, sol.Fv); else Plot.contour(g, A, sol.fsc, { n: 50, clampQ: true });
      pathArrows(g, A, [sol.piece]);
      const k = S.step >= 4 ? Math.min(1, S.step === 4 ? S.st / S.dur : 1) : 0; const tt = sol.t0 + (sol.t1 - sol.t0) * k; const r = sol.piece.r(tt); Plot.point(g, A, r[0], r[1], S.step >= 4 ? `t = ${Num.dec(tt, 2)}` : 'start', { color: '#dc2626' });
      // accumulation graph
      const N = 120; const cum = [0]; for (let i = 1; i <= N; i++) { const a = sol.t0 + ((sol.t1 - sol.t0) * (i - 1)) / N, b = a + (sol.t1 - sol.t0) / N; cum.push(cum[i - 1] + Solve.simpson(sol.g, a, b, 4)); }
      const B = Plot.axes(g, [bx, by + bh * 0.7, bw, bh * 0.3], [sol.t0, sol.t1], [Math.min(0, ...cum) - 0.1, Math.max(0, ...cum) + 0.1], { xl: 't' });
      const upto = Math.round(N * (S.step >= 4 ? k : 0)); if (upto > 0) D.poly(g, cum.slice(0, upto + 1).map((v, i) => [B.X(sol.t0 + ((sol.t1 - sol.t0) * i) / N), B.Y(v)]), { stroke: '#15803d', width: 3 });
      D.text(g, `running total ${sol.mode === 'scalar' ? '∫ f ds' : '∫ F·dr'} = ${Num.dec(cum[upto] || 0, 4)}`, bx + 10, by + bh * 0.7 + 14, { size: 14, weight: 800, color: '#15803d' });
    },
  });

  // ─────────────── Surfaces z = g(x, y) over a disc or rectangle ───────────────
  function surfacePatch(gz, region) {
    // parametrise by (u, v): disc → polar (r, θ); rectangle → (x, y). n = (−g_x, −g_y, 1)·Jacobian (upward)
    const gx = gz.d('x'), gy = gz.d('y');
    if (region.type === 'hemi') { const a = region.R; return { r: (u, v) => [a * Math.sin(u) * Math.cos(v), a * Math.sin(u) * Math.sin(v), a * Math.cos(u)], n: (u, v) => { const s = Math.sin(u); return [a * a * s * s * Math.cos(v), a * a * s * s * Math.sin(v), a * a * s * Math.cos(u)]; }, u0: 0, u1: Math.PI / 2, v0: 0, v1: 2 * Math.PI, gx, gy }; }
    if (region.type === 'disc') return { r: (u, v) => [u * Math.cos(v), u * Math.sin(v), gz(u * Math.cos(v), u * Math.sin(v))], n: (u, v) => { const x = u * Math.cos(v), y = u * Math.sin(v); return [-gx(x, y) * u, -gy(x, y) * u, u]; }, u0: 0, u1: region.R, v0: 0, v1: 2 * Math.PI, gx, gy };
    return { r: (u, v) => [u, v, gz(u, v)], n: (u, v) => [-gx(u, v), -gy(u, v), 1], u0: region.x0, u1: region.x1, v0: region.y0, v1: region.y1, gx, gy };
  }
  function boundaryOf(gz, region) {
    if (region.type === 'disc' || region.type === 'hemi') { const R = region.R; return [{ name: 'circle', r: (t) => [R * Math.cos(t), R * Math.sin(t), gz(R * Math.cos(t), R * Math.sin(t))], dr: (t) => { const h = 1e-5; const a = [R * Math.cos(t + h), R * Math.sin(t + h)], b = [R * Math.cos(t - h), R * Math.sin(t - h)]; return [(a[0] - b[0]) / (2 * h), (a[1] - b[1]) / (2 * h), (gz(a[0], a[1]) - gz(b[0], b[1])) / (2 * h)]; }, t0: 0, t1: 2 * Math.PI }]; }
    const { x0, x1, y0, y1 } = region; const seg = (A, B, name) => ({ name, r: (t) => { const x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t; return [x, y, gz(x, y)]; }, dr: (t) => { const h = 1e-5; const p1 = [A[0] + (B[0] - A[0]) * (t + h), A[1] + (B[1] - A[1]) * (t + h)], p0 = [A[0] + (B[0] - A[0]) * (t - h), A[1] + (B[1] - A[1]) * (t - h)]; return [B[0] - A[0], B[1] - A[1], (gz(...p1) - gz(...p0)) / (2 * h)]; }, t0: 0, t1: 1 });
    return [seg([x0, y0], [x1, y0], 'bottom edge'), seg([x1, y0], [x1, y1], 'right edge'), seg([x1, y1], [x0, y1], 'top edge'), seg([x0, y1], [x0, y0], 'left edge')];
  }
  const SURF_OPTS = [{ value: 'hemisphere', label: 'Hemisphere z = √(a² − x² − y²)' }, { value: 'paraboloid', label: 'Paraboloid z = a² − x² − y² (z ≥ 0)' }, { value: 'plane', label: 'Plane z = c over a rectangle' }, { value: 'custom', label: 'Custom z = g(x, y) over a rectangle' }];
  function surfaceFrom(p) {
    const a = p.a; if (p.surf === 'hemisphere') return { gz: Expr.fn(`sqrt(max0)`.replace('max0', `${a * a} - x^2 - y^2 + 1e-12`)), region: { type: 'hemi', R: a }, name: `z = √(${Num.fmt(a * a)} − x² − y²)` };
    if (p.surf === 'paraboloid') return { gz: Expr.fn(`${a * a} - x^2 - y^2`), region: { type: 'disc', R: a }, name: `z = ${Num.fmt(a * a)} − x² − y²` };
    if (p.surf === 'plane') return { gz: Expr.fn(String(p.c)), region: { type: 'rect', x0: 0, x1: a, y0: 0, y1: a }, name: `z = ${Num.fmt(p.c)}, 0 ≤ x, y ≤ ${Num.fmt(a)}` };
    return { gz: Expr.fn(p.g), region: { type: 'rect', x0: 0, x1: a, y0: 0, y1: a }, name: `z = ${Expr.fn(p.g).str}, 0 ≤ x, y ≤ ${Num.fmt(a)}` };
  }
  function draw3dSurface(g, box, S, sd, o = {}) {
    D.rect(g, box[0], box[1], box[2], box[3], { fill: '#fff', stroke: '#cbd5e1', r: 8 });
    const patch = surfacePatch(sd.gz, sd.region); const pts = [];
    for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) pts.push(patch.r(patch.u0 + ((patch.u1 - patch.u0) * i) / 10, patch.v0 + ((patch.v1 - patch.v0) * j) / 10));
    const ext = Math.max(...pts.flat().map(Math.abs).filter(Number.isFinite), 1); const sc = Math.min(box[2], box[3]) / 2.9 / ext;
    const P = Plot.cam(S.view, box[0] + box[2] / 2, box[1] + box[3] / 2 + 30, sc * ext); const m = (q) => q.map((v) => v / ext);
    g.save(); g.beginPath(); g.rect(box[0], box[1], box[2], box[3]); g.clip();
    Plot.axes3(g, (q) => P(q), 1.25);
    const n = 20; const quads = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const us = [i, i + 1, i + 1, i].map((k) => patch.u0 + ((patch.u1 - patch.u0) * k) / n), vs = [j, j, j + 1, j + 1].map((k) => patch.v0 + ((patch.v1 - patch.v0) * k) / n); const qs = us.map((u, k) => P(m(patch.r(u, vs[k])))); if (qs.some((q) => !Number.isFinite(q.x))) continue; quads.push({ qs, depth: qs.reduce((s, q) => s + q.depth, 0) / 4, t: (i + j) / (2 * n) }); }
    quads.sort((q1, q2) => q2.depth - q1.depth).forEach((q) => D.poly(g, q.qs.map((v) => [v.x, v.y]), { fill: o.fill ? o.fill(q.t) : '#93c5fd', close: true, stroke: 'rgba(15,23,42,0.2)', width: 0.6, alpha: 0.78 }));
    if (o.normals) for (let i = 1; i < 6; i++) for (let j = 0; j < 8; j++) { const u = patch.u0 + ((patch.u1 - patch.u0) * i) / 6, v = patch.v0 + ((patch.v1 - patch.v0) * (j + 0.5)) / 8; const r = patch.r(u, v); let nn = patch.n(u, v); const L = Math.hypot(...nn) || 1; nn = nn.map((c) => (c / L) * ext * 0.18); const A0 = P(m(r)), B0 = P(m(r.map((c, k) => c + nn[k]))); D.arrow(g, A0.x, A0.y, B0.x, B0.y, { color: '#dc2626', width: 2, head: 8 }); }
    if (o.field) for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) for (let k = 0; k <= 2; k++) { const q = [-ext + (2 * ext * i) / 4, -ext + (2 * ext * j) / 4, (ext * k) / 2]; const v = o.field.map((Fi) => Fi(...q)); const L = Math.hypot(...v); if (!Number.isFinite(L) || L < 1e-9) continue; const s = (ext * 0.16) / L; const A0 = P(m(q)), B0 = P(m(q.map((c, t) => c + v[t] * s))); D.arrow(g, A0.x, A0.y, B0.x, B0.y, { color: 'rgba(22,163,74,0.6)', width: 1.4, head: 7 }); }
    if (o.boundary) o.boundary.forEach((pc) => { const pp = []; for (let i = 0; i <= 80; i++) { const t = pc.t0 + ((pc.t1 - pc.t0) * i) / 80; const q = P(m(pc.r(t))); pp.push([q.x, q.y]); } D.poly(g, pp, { stroke: '#0f172a', width: 3.5 }); [0.25, 0.75].forEach((fr) => { const t = pc.t0 + (pc.t1 - pc.t0) * fr; const r = pc.r(t), dr = pc.dr(t); const L = Math.hypot(...dr) || 1; const A0 = P(m(r)), B0 = P(m(r.map((c, k) => c + (dr[k] / L) * ext * 0.15))); D.arrow(g, A0.x, A0.y, B0.x, B0.y, { color: '#0f172a', width: 3, head: 12 }); }); });
    g.restore();
    D.text(g, o.caption || 'Drag to rotate · wheel/pinch to zoom', box[0] + 12, box[1] + 18, { size: 14, color: '#475569' });
  }
  const FIELD3 = (dP, dQ, dR) => [{ key: 'P', label: 'F₁ = P(x, y, z) =', type: 'text', default: dP }, { key: 'Q', label: 'F₂ = Q =', type: 'text', default: dQ }, { key: 'R', label: 'F₃ = R =', type: 'text', default: dR }];

  // ─────────────── 2. Surface integral ───────────────
  define('ma-surface-integral', {
    view3d: true, initialView: { yaw: 0.6, pitch: 0.4, zoom: 1 },
    params: [...FIELD3('x', 'y', 'z'), { key: 'surf', label: 'Surface', type: 'select', options: SURF_OPTS, default: 'hemisphere' }, { key: 'a', label: 'Size a', type: 'range', min: 0.5, max: 3, step: 0.25, default: 1 }, { key: 'c', label: 'Plane height c', type: 'range', min: 0, max: 3, step: 0.25, default: 1, showIf: (p) => p.surf === 'plane' }, { key: 'g', label: 'z = g(x, y) =', type: 'text', default: 'x + y', showIf: (p) => p.surf === 'custom' }],
    examples: [{ label: 'Flux of F = (x, y, z) through the unit hemisphere (= 2π)', values: { P: 'x', Q: 'y', R: 'z', surf: 'hemisphere', a: 1 } }, { label: 'Flux of (0, 0, z) through the paraboloid', values: { P: '0', Q: '0', R: 'z', surf: 'paraboloid', a: 1 } }, { label: 'Flux of (x, y, 2) through z = 1 over [0, 2]²', values: { P: 'x', Q: 'y', R: '2', surf: 'plane', a: 2, c: 1 } }],
    inputOf: (p) => ({ field: `(${p.P}, ${p.Q}, ${p.R})`, surface: p.surf, a: p.a }),
    solve(p) {
      const Fv = VC.field(p.P, p.Q, p.R, V3); const sd = surfaceFrom(p); const patch = surfacePatch(sd.gz, sd.region); const val = VC.flux(Fv, patch);
      const disc = sd.region.type !== 'rect';
      const steps = [
        { title: 'Surface and orientation', text: sd.name, lines: [`S: ${sd.name}`, 'Upward orientation (normal with positive z-component).'] },
        { title: 'Normal vector', text: 'For z = g(x, y): n dS = (−g_x, −g_y, 1) dx dy', lines: [`g_x = ${patch.gx.str},  g_y = ${patch.gy.str}`, 'n dS = (−g_x, −g_y, 1) dA'] },
        { title: 'Field on the surface', text: '', lines: [`F = (${Fv.map((q) => q.str).join(', ')})`, 'F·n dS = (−P g_x − Q g_y + R) dA with z = g(x, y)'] },
        { title: 'Projection and limits', text: disc ? 'Disc — polar coordinates' : 'Rectangle', lines: sd.region.type === 'hemi' ? ['Spherical parametrisation: r(φ, θ) = a(sin φ cos θ, sin φ sin θ, cos φ), 0 ≤ φ ≤ π/2', 'n dS = a² sin φ (sin φ cos θ, sin φ sin θ, cos φ) dφ dθ'] : disc ? [`D: x² + y² ≤ ${Num.fmt(sd.region.R ** 2)}  →  0 ≤ r ≤ ${Num.fmt(sd.region.R)}, 0 ≤ θ ≤ 2π,  dA = r dr dθ`] : [`D: ${Num.fmt(sd.region.x0)} ≤ x ≤ ${Num.fmt(sd.region.x1)},  ${Num.fmt(sd.region.y0)} ≤ y ≤ ${Num.fmt(sd.region.y1)}`] },
        { title: 'Evaluate the flux', text: d5(val), lines: [{ t: `∬_S F·n dS = ${d5(val)}${Math.abs(val / Math.PI - Math.round((val / Math.PI) * 12) / 12) < 1e-4 && Math.abs(val) > 1e-6 ? `  (= ${Num.fmt(Math.round((val / Math.PI) * 12) / 12)}π)` : ''}`, b: true, c: '#15803d' }, '(numerical double integration)'] },
      ];
      return { steps, Fv, sd, val, formulas: [F('Flux', '∬_S F·n dS = ∬_D (−P g_x − Q g_y + R) dA', `S: ${sd.name}`, '', d5(val))], readouts: [{ label: 'Flux', value: d5(val), tone: 'good' }], state: { field: Fv.map((q) => q.str), surface: sd.name, flux: d5(val) }, explain: { what: `The net amount of F passing upward through the surface is ${d5(val)}.`, why: 'Only the component of F along the normal crosses the surface; n dS combines the normal direction with the area element.', param: 'Field, surface and its size.', effect: 'Reversing the orientation changes the sign of the flux.' } };
    },
    plot(g, box, sol, S) { draw3dSurface(g, box, S, sol.sd, { normals: S.step >= 1, field: S.step >= 2 ? sol.Fv : null, caption: 'surface, red normals, green field — drag to rotate' }); },
  });

  // ─────────────── 3. Green's theorem ───────────────
  const REG2 = [{ value: 'rect', label: 'Rectangle [0, a] × [0, b]' }, { value: 'circle', label: 'Circle of radius a' }, { value: 'triangle', label: 'Triangle (0,0), (a,0), (0,b)' }, { value: 'parabola', label: 'Between y = x² and y = x' }];
  function region2(p) {
    const a = p.a, b = p.b;
    if (p.reg === 'circle') return { name: `circle x² + y² = ${Num.fmt(a * a)}`, pieces: [{ name: 'circle', r: (t) => [a * Math.cos(t), a * Math.sin(t)], dr: (t) => [-a * Math.sin(t), a * Math.cos(t)], t0: 0, t1: 2 * Math.PI }], dbl: (fn) => Solve.simpson((r) => Solve.simpson((th) => fn(r * Math.cos(th), r * Math.sin(th)) * r, 0, 2 * Math.PI, 64), 0, a, 64), lim: { x: [-a, a], y: [-a, a] }, desc: [`0 ≤ r ≤ ${Num.fmt(a)}, 0 ≤ θ ≤ 2π (polar)`] };
    const seg = (A, B, name) => ({ name, r: (t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t], dr: () => [B[0] - A[0], B[1] - A[1]], t0: 0, t1: 1 });
    if (p.reg === 'triangle') return { name: `triangle (0,0), (${Num.fmt(a)},0), (0,${Num.fmt(b)})`, pieces: [seg([0, 0], [a, 0], 'OA'), seg([a, 0], [0, b], 'AB'), seg([0, b], [0, 0], 'BO')], dbl: (fn) => Solve.double(fn, 0, a, () => 0, (x) => b * (1 - x / a), 64), lim: { x: [0, a], y: [0, b] }, desc: [`0 ≤ x ≤ ${Num.fmt(a)},  0 ≤ y ≤ ${Num.fmt(b)}(1 − x/${Num.fmt(a)})`], iter: { ylo: '0', yhi: `${b}*(1 - x/${a})`, xlo: '0', xhi: String(a) } };
    if (p.reg === 'parabola') return { name: 'region between y = x² and y = x', pieces: [{ name: 'y = x² (0→1)', r: (t) => [t, t * t], dr: (t) => [1, 2 * t], t0: 0, t1: 1 }, { name: 'y = x (1→0)', r: (t) => [1 - t, 1 - t], dr: () => [-1, -1], t0: 0, t1: 1 }], dbl: (fn) => Solve.double(fn, 0, 1, (x) => x * x, (x) => x, 64), lim: { x: [0, 1], y: [0, 1] }, desc: ['0 ≤ x ≤ 1,  x² ≤ y ≤ x'], iter: { ylo: 'x^2', yhi: 'x', xlo: '0', xhi: '1' } };
    return { name: `rectangle [0, ${Num.fmt(a)}] × [0, ${Num.fmt(b)}]`, pieces: [seg([0, 0], [a, 0], 'bottom'), seg([a, 0], [a, b], 'right'), seg([a, b], [0, b], 'top'), seg([0, b], [0, 0], 'left')], dbl: (fn) => Solve.double(fn, 0, a, () => 0, () => b, 64), lim: { x: [0, a], y: [0, b] }, desc: [`0 ≤ x ≤ ${Num.fmt(a)},  0 ≤ y ≤ ${Num.fmt(b)}`], iter: { ylo: '0', yhi: String(b), xlo: '0', xhi: String(a) } };
  }
  define('ma-green', {
    params: [{ key: 'P', label: 'P(x, y) =', type: 'text', default: 'x^2 - y' }, { key: 'Q', label: 'Q(x, y) =', type: 'text', default: 'x + y^2' }, { key: 'reg', label: 'Closed curve / region', type: 'select', options: REG2, default: 'rect' }, { key: 'a', label: 'a', type: 'range', min: 0.5, max: 4, step: 0.25, default: 2, showIf: (p) => p.reg !== 'parabola' }, { key: 'b', label: 'b', type: 'range', min: 0.5, max: 4, step: 0.25, default: 1, showIf: (p) => p.reg === 'rect' || p.reg === 'triangle' }],
    examples: [{ label: '∮ (x² − y)dx + (x + y²)dy, rectangle', values: { P: 'x^2 - y', Q: 'x + y^2', reg: 'rect', a: 2, b: 1 } }, { label: 'Area by Green: P = −y/2, Q = x/2 on a circle', values: { P: '-y/2', Q: 'x/2', reg: 'circle', a: 2 } }, { label: '(3x² − 8y²)dx + (4y − 6xy)dy between y = x², y = x', values: { P: '3*x^2 - 8*y^2', Q: '4*y - 6*x*y', reg: 'parabola' } }, { label: 'xy dx + x² dy on a triangle', values: { P: 'x*y', Q: 'x^2', reg: 'triangle', a: 1, b: 1 } }],
    inputOf: (p) => ({ P: p.P, Q: p.Q, region: p.reg, a: p.a, b: p.b }),
    solve(p) {
      const Fv = VC.field(p.P, p.Q, null, V2); const rg = region2(p);
      const curlZ = Expr.fromAst(Expr.simp(Expr.simp({ op: '-', a: Fv[1].d('x').ast, b: Fv[0].d('y').ast })), V2);
      const pieces = VC.lineIntegral(Fv, rg.pieces, 2); const lhs = pieces.reduce((s, q) => s + q.value, 0);
      let rhs = rg.dbl((x, y) => curlZ(x, y)); let exactR = null;
      if (rg.iter) { try { const P2 = MPoly.fromAst(curlZ.ast, V2); if (P2) { const r = MPoly.fromAst(Expr.fn(rg.iter.yhi, V2).ast, V2), l = MPoly.fromAst(Expr.fn(rg.iter.ylo, V2).ast, V2); const I = MPoly.integrate(P2, 1); const inner = MPoly.add(MPoly.subst(I, 1, r, 2), MPoly.subst(I, 1, l, 2), -1); const O = MPoly.integrate(inner, 0); const xa = Expr.fn(rg.iter.xlo, [])(), xb = Expr.fn(rg.iter.xhi, [])(); exactR = MPoly.evalAt(O, [xb, 0]) - MPoly.evalAt(O, [xa, 0]); rhs = exactR; } } catch (e) { /* numeric */ } }
      const ok = agree(lhs, rhs);
      const steps = [
        { title: "Green's theorem", text: '∮_C P dx + Q dy = ∬_R (∂Q/∂x − ∂P/∂y) dA', lines: [`P = ${Fv[0].str},  Q = ${Fv[1].str}`, `C: boundary of the ${rg.name}, taken anticlockwise (region on the left).`] },
        { title: 'Boundary orientation', text: `${rg.pieces.length} piece(s)`, lines: rg.pieces.map((pc) => `• ${pc.name}`) },
        { title: 'Left side: line integral round C', text: `${d5(lhs)}`, lines: [...pieces.map((pc) => `∫ over ${pc.name} = ${d5(pc.value)}`), { t: `∮_C = ${d5(lhs)}`, b: true, c: '#1d4ed8' }] },
        { title: 'Right side: ∂Q/∂x − ∂P/∂y', text: curlZ.str, lines: [`∂Q/∂x = ${Fv[1].d('x').str},  ∂P/∂y = ${Fv[0].d('y').str}`, { t: `∂Q/∂x − ∂P/∂y = ${curlZ.str}`, b: true }] },
        { title: 'Right side: double integral over R', text: d5(rhs), lines: [...rg.desc, { t: `∬_R (${curlZ.str}) dA = ${exactR != null ? Num.fmt(rhs) : d5(rhs)}`, b: true, c: '#1d4ed8' }] },
        { title: 'Verification', text: ok ? 'Both sides agree' : 'Mismatch', lines: [`Line integral = ${d5(lhs)}`, `Double integral = ${d5(rhs)}`, { t: ok ? 'Equal ✓  Green’s theorem verified.' : 'Not equal — check that the curve is closed and the functions are smooth inside.', b: true, c: ok ? '#15803d' : '#b91c1c' }] },
      ];
      return { steps, Fv, rg, curlZ, lhs, rhs, ok, formulas: [F("Green's theorem", '∮_C (P dx + Q dy) = ∬_R (Q_x − P_y) dA', `P = ${Fv[0].str}, Q = ${Fv[1].str}, R = ${rg.name}`, `Q_x − P_y = ${curlZ.str}`, `LHS = ${d5(lhs)}, RHS = ${d5(rhs)}`)], readouts: [{ label: '∮ P dx + Q dy', value: d5(lhs), tone: 'info' }, { label: '∬ (Q_x − P_y) dA', value: d5(rhs), tone: 'info' }, { label: 'Verified', value: ok ? 'YES' : 'NO', tone: ok ? 'good' : 'bad' }], state: { P: Fv[0].str, Q: Fv[1].str, region: rg.name, curlZ: curlZ.str, lineIntegral: d5(lhs), doubleIntegral: d5(rhs), verified: ok }, explain: { what: `The circulation of F round the boundary (${d5(lhs)}) equals the total “spin” Q_x − P_y inside the region (${d5(rhs)}).`, why: 'Inside the region neighbouring circulations cancel along shared edges, so only the outer boundary is left.', param: 'P, Q and the region.', effect: 'If Q_x = P_y everywhere, the circulation round every closed curve is zero (conservative field).' } };
    },
    plot(g, box, sol, S) {
      const { lim } = sol.rg; const pad = 0.6; const A = Plot.axes(g, box, [lim.x[0] - pad, lim.x[1] + pad], [lim.y[0] - pad, lim.y[1] + pad], { equal: true, xl: 'x', yl: 'y' });
      if (S.step >= 3) { const pts = []; sol.rg.pieces.forEach((pc) => { for (let i = 0; i <= 60; i++) { const r = pc.r(pc.t0 + ((pc.t1 - pc.t0) * i) / 60); pts.push([A.X(r[0]), A.Y(r[1])]); } }); g.save(); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip(); Plot.contour(g, A, sol.curlZ, { n: 50, clampQ: true }); g.restore(); }
      arrowField2(g, A, sol.Fv, { n: 12 });
      pathArrows(g, A, sol.rg.pieces, { color: S.step === 2 ? '#1d4ed8' : '#0f172a' });
      D.text(g, S.step >= 3 ? 'colour inside = Q_x − P_y (spin density)' : 'arrows = field F; boundary traversed anticlockwise', box[0] + 12, box[1] + 16, { size: 14, weight: 700, halo: true });
      if (S.step >= 5) D.tag(g, `${d5(sol.lhs)} = ${d5(sol.rhs)} ${sol.ok ? '✓' : '✗'}`, box[0] + box[2] / 2, box[1] + box[3] - 22, { bg: sol.ok ? '#16a34a' : '#dc2626', size: 17, align: 'center' });
    },
  });

  // ─────────────── 4. Stokes' theorem ───────────────
  define('ma-stokes', {
    view3d: true, initialView: { yaw: 0.6, pitch: 0.4, zoom: 1 },
    params: [...FIELD3('-y', 'x', 'z'), { key: 'surf', label: 'Surface S (boundary C)', type: 'select', options: SURF_OPTS, default: 'hemisphere' }, { key: 'a', label: 'Size a', type: 'range', min: 0.5, max: 3, step: 0.25, default: 1 }, { key: 'c', label: 'Plane height c', type: 'range', min: 0, max: 3, step: 0.25, default: 1, showIf: (p) => p.surf === 'plane' }, { key: 'g', label: 'z = g(x, y) =', type: 'text', default: 'x + y', showIf: (p) => p.surf === 'custom' }],
    examples: [{ label: 'F = (−y, x, z) on the unit hemisphere (= 2π)', values: { P: '-y', Q: 'x', R: 'z', surf: 'hemisphere', a: 1 } }, { label: 'F = (y, z, x) on a paraboloid', values: { P: 'y', Q: 'z', R: 'x', surf: 'paraboloid', a: 1 } }, { label: 'F = (x², xy, 0) on a square plane', values: { P: 'x^2', Q: 'x*y', R: '0', surf: 'plane', a: 2, c: 0 } }, { label: 'F = (y², x², z) on z = x + y', values: { P: 'y^2', Q: 'x^2', R: 'z', surf: 'custom', g: 'x + y', a: 1 } }],
    inputOf: (p) => ({ field: `(${p.P}, ${p.Q}, ${p.R})`, surface: p.surf, a: p.a }),
    solve(p) {
      const Fv = VC.field(p.P, p.Q, p.R, V3); const sd = surfaceFrom(p); const patch = surfacePatch(sd.gz, sd.region); const curl = VC.curl3(Fv);
      const bnd = boundaryOf(sd.gz, sd.region); const pcs = VC.lineIntegral(Fv, bnd, 3); const lhs = pcs.reduce((s, q) => s + q.value, 0); const rhs = VC.flux(curl, patch); const ok = agree(lhs, rhs);
      const steps = [
        { title: "Stokes' theorem", text: '∮_C F·dr = ∬_S (∇×F)·n dS', lines: [`F = (${Fv.map((q) => q.str).join(', ')})`, `S: ${sd.name} (upward normal)`, 'C: its boundary, anticlockwise seen from above (right-hand rule).'] },
        { title: 'Curl of F', text: '', lines: ['∇×F = (R_y − Q_z,  P_z − R_x,  Q_x − P_y)', { t: `∇×F = (${curl.map((q) => q.str).join(', ')})`, b: true }] },
        { title: 'Boundary circulation', text: d5(lhs), lines: [...pcs.map((pc) => `∫ over ${pc.name} = ${d5(pc.value)}`), { t: `∮_C F·dr = ${d5(lhs)}`, b: true, c: '#1d4ed8' }] },
        { title: 'Flux of the curl through S', text: d5(rhs), lines: [`n dS = (−g_x, −g_y, 1) dA,  g_x = ${patch.gx.str}, g_y = ${patch.gy.str}`, { t: `∬_S (∇×F)·n dS = ${d5(rhs)}`, b: true, c: '#1d4ed8' }] },
        { title: 'Verification', text: ok ? 'Both sides agree' : 'Mismatch', lines: [`Circulation = ${d5(lhs)}`, `Curl flux = ${d5(rhs)}`, { t: ok ? "Equal ✓  Stokes' theorem verified." : 'Not equal — check the field for singularities on S.', b: true, c: ok ? '#15803d' : '#b91c1c' }] },
      ];
      return { steps, Fv, sd, curl, bnd, lhs, rhs, ok, formulas: [F("Stokes' theorem", '∮_C F·dr = ∬_S (∇×F)·n dS', `F = (${Fv.map((q) => q.str).join(', ')}), S: ${sd.name}`, `∇×F = (${curl.map((q) => q.str).join(', ')})`, `LHS = ${d5(lhs)}, RHS = ${d5(rhs)}`)], readouts: [{ label: '∮ F·dr', value: d5(lhs), tone: 'info' }, { label: '∬ curl F·n dS', value: d5(rhs), tone: 'info' }, { label: 'Verified', value: ok ? 'YES' : 'NO', tone: ok ? 'good' : 'bad' }], state: { field: Fv.map((q) => q.str), curl: curl.map((q) => q.str), surface: sd.name, circulation: d5(lhs), curlFlux: d5(rhs), verified: ok }, explain: { what: `The circulation of F round C (${d5(lhs)}) equals the flux of ∇×F through the surface (${d5(rhs)}).`, why: 'Stokes’ theorem generalises Green’s theorem to curved surfaces: the tiny circulations (curl) over the surface add up to the circulation round its edge.', param: 'Field and surface.', effect: 'Any surface with the same boundary gives the same curl flux — try the hemisphere and the paraboloid with the same a.' } };
    },
    plot(g, box, sol, S) { draw3dSurface(g, box, S, sol.sd, { normals: S.step >= 3, boundary: sol.bnd, field: S.step >= 1 ? sol.curl : null, fill: (t) => M.Plot.heat(t * 0.6 + 0.2), caption: 'boundary C (black, oriented), normals (red), curl F (green)' }); },
  });

  // ─────────────── 5. Gauss divergence theorem ───────────────
  function closedSurface(p) {
    const a = p.a, h = p.h;
    if (p.solid === 'sphere') return { name: `sphere x² + y² + z² = ${Num.fmt(a * a)}`, faces: [{ name: 'sphere', r: (u, v) => [a * Math.sin(u) * Math.cos(v), a * Math.sin(u) * Math.sin(v), a * Math.cos(u)], n: (u, v) => { const s = Math.sin(u); return [a * a * s * s * Math.cos(v), a * a * s * s * Math.sin(v), a * a * s * Math.cos(u)]; }, u0: 0, u1: Math.PI, v0: 0, v1: 2 * Math.PI }], vol: (fn) => Solve.simpson((r) => Solve.simpson((u) => Solve.simpson((v) => fn(r * Math.sin(u) * Math.cos(v), r * Math.sin(u) * Math.sin(v), r * Math.cos(u)) * r * r * Math.sin(u), 0, 2 * Math.PI, 24), 0, Math.PI, 24), 0, a, 24), desc: ['spherical coordinates: dV = r² sin φ dr dφ dθ'] };
    if (p.solid === 'cylinder') return { name: `cylinder x² + y² ≤ ${Num.fmt(a * a)}, 0 ≤ z ≤ ${Num.fmt(h)}`, faces: [{ name: 'curved side', r: (u, v) => [a * Math.cos(u), a * Math.sin(u), v], n: (u) => [a * Math.cos(u), a * Math.sin(u), 0], u0: 0, u1: 2 * Math.PI, v0: 0, v1: h }, { name: `top z = ${Num.fmt(h)}`, r: (u, v) => [u * Math.cos(v), u * Math.sin(v), h], n: (u) => [0, 0, u], u0: 0, u1: a, v0: 0, v1: 2 * Math.PI }, { name: 'bottom z = 0', r: (u, v) => [u * Math.cos(v), u * Math.sin(v), 0], n: (u) => [0, 0, -u], u0: 0, u1: a, v0: 0, v1: 2 * Math.PI }], vol: (fn) => Solve.simpson((r) => Solve.simpson((th) => Solve.simpson((z) => fn(r * Math.cos(th), r * Math.sin(th), z) * r, 0, h, 24), 0, 2 * Math.PI, 24), 0, a, 24), desc: ['cylindrical coordinates: dV = r dr dθ dz'] };
    const b = h; const face = (name, r, n, u1, v1) => ({ name, r, n: () => n, u0: 0, u1, v0: 0, v1 });
    return { name: `box [0, ${Num.fmt(a)}]² × [0, ${Num.fmt(b)}]`, faces: [face(`x = ${Num.fmt(a)}`, (u, v) => [a, u, v], [1, 0, 0], a, b), face('x = 0', (u, v) => [0, u, v], [-1, 0, 0], a, b), face(`y = ${Num.fmt(a)}`, (u, v) => [u, a, v], [0, 1, 0], a, b), face('y = 0', (u, v) => [u, 0, v], [0, -1, 0], a, b), face(`z = ${Num.fmt(b)}`, (u, v) => [u, v, b], [0, 0, 1], a, a), face('z = 0', (u, v) => [u, v, 0], [0, 0, -1], a, a)], vol: (fn) => Solve.triple(fn, 0, a, () => 0, () => a, () => 0, () => b, 24), box: [a, a, b], desc: [`0 ≤ x ≤ ${Num.fmt(a)}, 0 ≤ y ≤ ${Num.fmt(a)}, 0 ≤ z ≤ ${Num.fmt(b)}`] };
  }
  define('ma-gauss', {
    view3d: true, initialView: { yaw: 0.6, pitch: 0.4, zoom: 1 },
    params: [...FIELD3('x^2', 'y^2', 'z^2'), { key: 'solid', label: 'Closed surface', type: 'select', options: [{ value: 'box', label: 'Rectangular box' }, { value: 'sphere', label: 'Sphere' }, { value: 'cylinder', label: 'Closed cylinder' }], default: 'box' }, { key: 'a', label: 'Size a (side / radius)', type: 'range', min: 0.5, max: 3, step: 0.25, default: 1 }, { key: 'h', label: 'Height', type: 'range', min: 0.5, max: 3, step: 0.25, default: 1, showIf: (p) => p.solid !== 'sphere' }],
    examples: [{ label: 'F = (x², y², z²) over the unit cube (= 3)', values: { P: 'x^2', Q: 'y^2', R: 'z^2', solid: 'box', a: 1, h: 1 } }, { label: 'F = (x, y, z) over a sphere (= 4πa³)', values: { P: 'x', Q: 'y', R: 'z', solid: 'sphere', a: 1 } }, { label: 'F = (x³, y³, z³) over a cylinder', values: { P: 'x^3', Q: 'y^3', R: 'z^3', solid: 'cylinder', a: 1, h: 2 } }, { label: 'F = (4xz, −y², yz) over the unit cube (= 3/2)', values: { P: '4*x*z', Q: '-y^2', R: 'y*z', solid: 'box', a: 1, h: 1 } }],
    inputOf: (p) => ({ field: `(${p.P}, ${p.Q}, ${p.R})`, surface: p.solid, a: p.a, h: p.h }),
    solve(p) {
      const Fv = VC.field(p.P, p.Q, p.R, V3); const cs = closedSurface(p); const div = VC.div3(Fv);
      const faces = cs.faces.map((fc) => ({ ...fc, flux: VC.flux(Fv, fc) })); const lhs = faces.reduce((s, q) => s + q.flux, 0);
      let rhs = cs.vol((x, y, z) => div(x, y, z)); let exact = false;
      if (cs.box) { const P3 = MPoly.fromAst(div.ast, V3); if (P3) { let I = P3; [[2, cs.box[2]], [1, cs.box[1]], [0, cs.box[0]]].forEach(([i, up]) => { const A = MPoly.integrate(I, i); I = MPoly.add(MPoly.subst(A, i, MPoly.konst(up, 3), 3), MPoly.subst(A, i, MPoly.konst(0, 3), 3), -1); }); rhs = MPoly.evalAt(I, [0, 0, 0]); exact = true; } }
      const ok = agree(lhs, rhs); const piStr = (v) => (Math.abs(v) > 1e-9 && Math.abs(v / Math.PI - Math.round((v / Math.PI) * 60) / 60) < 1e-5 ? `  (= ${Num.fmt(Math.round((v / Math.PI) * 60) / 60)}π)` : '');
      const steps = [
        { title: 'Gauss divergence theorem', text: '∯_S F·n dS = ∭_V ∇·F dV', lines: [`F = (${Fv.map((q) => q.str).join(', ')})`, `V: ${cs.name};  S: its closed boundary with OUTWARD normals`] },
        { title: 'Divergence', text: div.str, lines: ['∇·F = ∂P/∂x + ∂Q/∂y + ∂R/∂z', { t: `∇·F = ${div.str}`, b: true }] },
        { title: 'Flux through each face', text: `${faces.length} face(s)`, lines: [...faces.map((fc) => `through ${fc.name}: ${d5(fc.flux)}`), { t: `∯_S F·n dS = ${d5(lhs)}${piStr(lhs)}`, b: true, c: '#1d4ed8' }] },
        { title: 'Volume integral of the divergence', text: d5(rhs), lines: [...cs.desc, { t: `∭_V (${div.str}) dV = ${exact ? Num.fmt(rhs) : d5(rhs)}${piStr(rhs)}`, b: true, c: '#1d4ed8' }] },
        { title: 'Verification', text: ok ? 'Both sides agree' : 'Mismatch', lines: [`Surface flux = ${d5(lhs)}`, `Volume integral = ${d5(rhs)}`, { t: ok ? 'Equal ✓  Gauss divergence theorem verified.' : 'Not equal — check the field for singularities inside V.', b: true, c: ok ? '#15803d' : '#b91c1c' }] },
      ];
      return { steps, Fv, cs, faces, div, lhs, rhs, ok, p, formulas: [F('Gauss divergence theorem', '∯_S F·n dS = ∭_V ∇·F dV', `F = (${Fv.map((q) => q.str).join(', ')}), V: ${cs.name}`, `∇·F = ${div.str}`, `LHS = ${d5(lhs)}, RHS = ${d5(rhs)}`)], readouts: [{ label: 'Flux out', value: d5(lhs), tone: 'info' }, { label: '∭ ∇·F dV', value: d5(rhs), tone: 'info' }, { label: 'Verified', value: ok ? 'YES' : 'NO', tone: ok ? 'good' : 'bad' }], state: { field: Fv.map((q) => q.str), divergence: div.str, surface: cs.name, faceFluxes: faces.map((fc) => `${fc.name}: ${d5(fc.flux)}`), totalFlux: d5(lhs), volumeIntegral: d5(rhs), verified: ok }, explain: { what: `The net outward flux (${d5(lhs)}) equals the total source strength ∇·F inside (${d5(rhs)}).`, why: 'Divergence measures outflow per unit volume; adding it over the solid counts everything that leaves through the boundary.', param: 'Field and closed surface.', effect: 'A divergence-free field has zero net flux through every closed surface.' } };
    },
    plot(g, box, sol, S) {
      D.rect(g, box[0], box[1], box[2], box[3], { fill: '#fff', stroke: '#cbd5e1', r: 8 });
      const ext = Math.max(sol.p.a, sol.p.solid === 'sphere' ? sol.p.a : sol.p.h) * 1.1; const P = Plot.cam(S.view, box[0] + box[2] / 2, box[1] + box[3] / 2 + 20, Math.min(box[2], box[3]) / 3.4); const m = (q) => q.map((v) => v / ext);
      g.save(); g.beginPath(); g.rect(box[0], box[1], box[2], box[3]); g.clip(); Plot.axes3(g, P, 1.2);
      const quads = []; sol.faces.forEach((fc, fi) => { const n = 12; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const us = [i, i + 1, i + 1, i].map((k) => fc.u0 + ((fc.u1 - fc.u0) * k) / n), vs = [j, j, j + 1, j + 1].map((k) => fc.v0 + ((fc.v1 - fc.v0) * k) / n); const qs = us.map((u, k) => P(m(fc.r(u, vs[k])))); quads.push({ qs, depth: qs.reduce((s, q) => s + q.depth, 0) / 4, fi }); } });
      quads.sort((q1, q2) => q2.depth - q1.depth).forEach((q) => D.poly(g, q.qs.map((v) => [v.x, v.y]), { fill: ['#bfdbfe', '#fde68a', '#bbf7d0', '#fecaca', '#ddd6fe', '#fed7aa'][q.fi % 6], close: true, stroke: 'rgba(15,23,42,0.18)', width: 0.6, alpha: 0.55 }));
      if (S.step >= 2) sol.faces.forEach((fc) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const u = fc.u0 + ((fc.u1 - fc.u0) * (i + 0.5)) / 3, v = fc.v0 + ((fc.v1 - fc.v0) * (j + 0.5)) / 3; const r = fc.r(u, v); let nn = fc.n(u, v); const L = Math.hypot(...nn) || 1; nn = nn.map((c) => (c / L) * ext * 0.25); const A0 = P(m(r)), B0 = P(m(r.map((c, k) => c + nn[k]))); D.arrow(g, A0.x, A0.y, B0.x, B0.y, { color: '#dc2626', width: 2, head: 8 }); const v3 = sol.Fv.map((Fi) => Fi(...r)); const L2 = Math.hypot(...v3); if (L2 > 1e-9) { const C0 = P(m(r.map((c, k) => c + (v3[k] / L2) * ext * 0.3))); D.arrow(g, A0.x, A0.y, C0.x, C0.y, { color: '#16a34a', width: 1.8, head: 8 }); } } });
      g.restore();
      D.text(g, 'faces of S, outward normals (red), field F (green)', box[0] + 12, box[1] + 18, { size: 14, color: '#475569' });
      if (S.step >= 4) D.tag(g, `${d5(sol.lhs)} = ${d5(sol.rhs)} ${sol.ok ? '✓' : '✗'}`, box[0] + box[2] / 2, box[1] + box[3] - 22, { bg: sol.ok ? '#16a34a' : '#dc2626', size: 17, align: 'center' });
    },
  });
})();
