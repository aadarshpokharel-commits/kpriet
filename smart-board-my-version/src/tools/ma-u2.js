'use strict';

/* Engineering Mathematics — Unit II: Functions of Several Variables. */
(function () {
  const D = window.EPDraw; const M = window.MACore; const { Num, Expr, Solve, Plot, ParseError } = M; const { define, F } = window.MAFrame;
  const f = (v) => Num.fmt(v); const d4 = (v) => Num.fmt(v, { digits: 5 });
  const num = (v, name) => { if (!Number.isFinite(v)) throw new ParseError(`${name} is not defined at this point (division by zero or log of a non-positive number).`); return v; };
  const pt = (x, y) => `(${f(x)}, ${f(y)})`;

  // ── shared visualisation for f(x,y): contour (2-D) or surface (3-D) with marked points ──
  function fieldView(g, box, fx, S, o = {}) {
    const [x0, x1] = o.xr, [y0, y1] = o.yr;
    if ((S.p.view || 'contour') === 'surface') {
      D.rect(g, box[0], box[1], box[2], box[3], { fill: '#ffffff', stroke: '#cbd5e1', r: 8 });
      const sc = Math.min(box[2], box[3]) / 2.6; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; const span = Math.max(x1 - x0, y1 - y0) / 2;
      let zmin = Infinity, zmax = -Infinity; for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) { const z = fx(x0 + (x1 - x0) * i / 20, y0 + (y1 - y0) * j / 20); if (Number.isFinite(z)) { zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); } }
      const zs = (zmax - zmin) || 1; const map = (p) => [(p[0] - cx) / span, (p[1] - cy) / span, ((p[2] - zmin) / zs - 0.5) * 1.2];
      const P = Plot.cam(S.view, box[0] + box[2] / 2, box[1] + box[3] / 2 + 10, sc);
      g.save(); g.beginPath(); g.rect(box[0], box[1], box[2], box[3]); g.clip();
      Plot.surface(g, P, fx, [x0, x1], [y0, y1], { n: 28, map, zclamp: [zmin, zmax], alpha: o.alpha || 0.92 });
      if (o.extra3) o.extra3(g, P, map);
      (o.points || []).forEach((q) => { const z = fx(q.x, q.y); if (!Number.isFinite(z)) return; const v = P(map([q.x, q.y, Math.max(zmin, Math.min(zmax, z))])); D.circle(g, v.x, v.y, 8, { fill: q.color || '#dc2626', stroke: '#fff', width: 2 }); if (q.label) D.tag(g, q.label, v.x + 10, v.y - 14, { bg: q.color || '#dc2626', size: 14 }); });
      g.restore();
      D.text(g, 'Drag to rotate · wheel / pinch to zoom', box[0] + 12, box[1] + box[3] - 14, { size: 14, color: '#64748b' });
      return null;
    }
    const A = Plot.axes(g, box, [x0, x1], [y0, y1], { equal: o.equal !== false, xl: 'x', yl: 'y' });
    Plot.contour(g, A, fx, { n: 64, clampQ: true });
    if (o.extra2) o.extra2(g, A);
    (o.points || []).forEach((q) => Plot.point(g, A, q.x, q.y, q.label, { color: q.color }));
    return A;
  }
  const VIEW_PARAM = { key: 'view', label: 'Visualization', type: 'select', options: [{ value: 'contour', label: 'Contour map (2-D)' }, { value: 'surface', label: 'Surface (3-D)' }], default: 'contour' };
  const RANGE_PARAM = (def = 3) => ({ key: 'L', label: 'Plot / search window ±', type: 'range', min: 1, max: 10, step: 0.5, default: def });

  // ─────────────── 1. Partial derivatives ───────────────
  define('ma-partial', {
    view3d: true, initialView: { yaw: 0.6, pitch: 0.55, zoom: 1 },
    params: [{ key: 'fx', label: 'f(x, y) =', type: 'text', default: 'x^2*y + 3*x*y^2', placeholder: 'e.g. x^2 y + sin(x y)' }, { key: 'a', label: 'Point x = a', type: 'range', min: -3, max: 3, step: 0.25, default: 1 }, { key: 'b', label: 'Point y = b', type: 'range', min: -3, max: 3, step: 0.25, default: 1 }, VIEW_PARAM],
    examples: [{ label: 'x²y + 3xy²', values: { fx: 'x^2*y + 3*x*y^2', a: 1, b: 1 } }, { label: 'e^(xy)', values: { fx: 'exp(x*y)', a: 0.5, b: 1 } }, { label: 'sin(x)cos(y)', values: { fx: 'sin(x)*cos(y)', a: 1, b: 0.5 } }, { label: 'ln(x² + y²)', values: { fx: 'ln(x^2 + y^2)', a: 1, b: 2 } }],
    inputOf: (p) => ({ f: p.fx, point: [p.a, p.b] }),
    solve(p) {
      const u = Expr.fn(p.fx); const ux = u.d('x'), uy = u.d('y'); const uxx = ux.d('x'), uyy = uy.d('y'), uxy = ux.d('y'), uyx = uy.d('x');
      const v = num(u(p.a, p.b), 'f'); const vx = num(ux(p.a, p.b), 'fₓ'), vy = num(uy(p.a, p.b), 'f_y');
      const steps = [
        { title: 'The function', text: `f(x, y) = ${u.str}`, lines: [`f(x, y) = ${u.str}`, `f${pt(p.a, p.b)} = ${d4(v)}`] },
        { title: '∂f/∂x — treat y as a constant', text: `fₓ = ${ux.str}`, lines: ['Freeze y and differentiate with respect to x:', { t: `fₓ = ∂f/∂x = ${ux.str}`, b: true, c: '#1d4ed8' }, `fₓ${pt(p.a, p.b)} = ${Expr.subStr(ux.ast, { x: p.a, y: p.b })} = ${d4(vx)}`] },
        { title: '∂f/∂y — treat x as a constant', text: `f_y = ${uy.str}`, lines: ['Freeze x and differentiate with respect to y:', { t: `f_y = ∂f/∂y = ${uy.str}`, b: true, c: '#dc2626' }, `f_y${pt(p.a, p.b)} = ${Expr.subStr(uy.ast, { x: p.a, y: p.b })} = ${d4(vy)}`] },
        { title: 'Second-order partial derivatives', text: 'fₓₓ, f_yy, fₓ_y, f_yₓ', lines: [`fₓₓ = ${uxx.str}`, `f_yy = ${uyy.str}`, `fₓ_y = ∂/∂y(fₓ) = ${uxy.str}`, `f_yₓ = ∂/∂x(f_y) = ${uyx.str}`, `At ${pt(p.a, p.b)}: fₓₓ = ${d4(uxx(p.a, p.b))}, f_yy = ${d4(uyy(p.a, p.b))}, fₓ_y = ${d4(uxy(p.a, p.b))}`] },
        { title: 'Mixed derivatives agree (Clairaut)', text: 'fₓ_y = f_yₓ for smooth functions', lines: [`fₓ_y${pt(p.a, p.b)} = ${d4(uxy(p.a, p.b))},  f_yₓ${pt(p.a, p.b)} = ${d4(uyx(p.a, p.b))}  ✓`, 'The order of differentiation does not matter.'] },
      ];
      return {
        steps, u, ux, uy, a: p.a, b: p.b, v, vx, vy,
        formulas: [F('Partial derivative', '∂f/∂x = lim_{h→0} [f(x+h, y) − f(x, y)]/h', `f = ${u.str}`, `fₓ = ${ux.str}`, `fₓ${pt(p.a, p.b)} = ${d4(vx)}`), F('Partial derivative', '∂f/∂y (x held fixed)', '', `f_y = ${uy.str}`, `f_y${pt(p.a, p.b)} = ${d4(vy)}`)],
        readouts: [{ label: 'fₓ', value: d4(vx), tone: 'info' }, { label: 'f_y', value: d4(vy), tone: 'info' }, { label: 'f', value: d4(v) }],
        state: { function: u.str, point: pt(p.a, p.b), fx: ux.str, fy: uy.str, fxx: uxx.str, fyy: uyy.str, fxy: uxy.str, valueFx: d4(vx), valueFy: d4(vy) },
        explain: { what: `At ${pt(p.a, p.b)} f changes at rate ${d4(vx)} per unit x (y fixed) and ${d4(vy)} per unit y (x fixed).`, why: 'A partial derivative is the slope of the curve cut from the surface by a plane that keeps the other variable constant.', param: 'The function and the point (a, b).', effect: 'Moving the point changes the slices, so the tangent slopes fₓ and f_y change.' },
      };
    },
    plot(g, box, sol, S) {
      const [bx, by, bw, bh] = box; const L = Math.max(2, Math.abs(sol.a) + 2, Math.abs(sol.b) + 2);
      const top = [bx, by, bw, bh * 0.56]; const A = fieldView(g, top, sol.u, S, { xr: [sol.a - L, sol.a + L], yr: [sol.b - L * 0.6, sol.b + L * 0.6], equal: false, points: [{ x: sol.a, y: sol.b, label: `(${f(sol.a)}, ${f(sol.b)})` }], extra2: (gg, Ax) => { Plot.clip(gg, Ax, () => { D.line(gg, Ax.X(sol.a - L), Ax.Y(sol.b), Ax.X(sol.a + L), Ax.Y(sol.b), { color: '#1d4ed8', width: 2.5, dash: [8, 5] }); D.line(gg, Ax.X(sol.a), Ax.Y(sol.b - L), Ax.X(sol.a), Ax.Y(sol.b + L), { color: '#dc2626', width: 2.5, dash: [8, 5] }); }); } });
      const half = (bw - 10) / 2; const y2 = by + bh * 0.58, h2 = bh * 0.42;
      const slice = (bb, fn, c0, slope, col, lab, show) => { let lo = Infinity, hi = -Infinity; for (let i = 0; i <= 60; i++) { const z = fn(c0 - L + (2 * L * i) / 60); if (Number.isFinite(z)) { lo = Math.min(lo, z); hi = Math.max(hi, z); } } if (!Number.isFinite(lo)) return; const pad = (hi - lo) * 0.15 + 0.5; const Ax = Plot.axes(g, bb, [c0 - L, c0 + L], [lo - pad, hi + pad], {}); Plot.curve(g, Ax, fn, { color: col }); if (show) { const z0 = fn(c0); Plot.curve(g, Ax, (t) => z0 + slope * (t - c0), { color: '#0f172a', width: 1.8, dash: [6, 4], range: [c0 - L * 0.6, c0 + L * 0.6] }); Plot.point(g, Ax, c0, z0, `slope ${d4(slope)}`, { color: col }); } D.text(g, lab, bb[0] + 8, bb[1] + 14, { size: 14, weight: 800, color: col }); };
      slice([bx, y2, half, h2], (x) => sol.u(x, sol.b), sol.a, sol.vx, '#1d4ed8', `y = ${f(sol.b)} frozen: z = f(x, ${f(sol.b)})`, S.step >= 1);
      slice([bx + half + 10, y2, half, h2], (y) => sol.u(sol.a, y), sol.b, sol.vy, '#dc2626', `x = ${f(sol.a)} frozen: z = f(${f(sol.a)}, y)`, S.step >= 2);
      return A;
    },
  });

  // ─────────────── 2. Total derivative ───────────────
  define('ma-total-derivative', {
    params: [{ key: 'u', label: 'u = f(x, y) =', type: 'text', default: 'x^2 + y^2' }, { key: 'xt', label: 'x = x(t) =', type: 'text', default: 'cos(t)' }, { key: 'yt', label: 'y = y(t) =', type: 'text', default: 'sin(t) + t' }, { key: 't0', label: 't =', type: 'range', min: -3, max: 3, step: 0.1, default: 1 }],
    examples: [{ label: 'u = x² + y², x = cos t, y = sin t + t', values: { u: 'x^2 + y^2', xt: 'cos(t)', yt: 'sin(t) + t', t0: 1 } }, { label: 'u = xy, x = eᵗ, y = t²', values: { u: 'x*y', xt: 'exp(t)', yt: 't^2', t0: 1 } }, { label: 'u = x² y, x = t², y = 2t', values: { u: 'x^2*y', xt: 't^2', yt: '2*t', t0: 1 } }, { label: 'u = ln(x + y), x = t, y = t³', values: { u: 'ln(x + y)', xt: 't', yt: 't^3', t0: 1.5 } }],
    inputOf: (p) => ({ u: p.u, x: p.xt, y: p.yt, t: p.t0 }),
    solve(p) {
      const u = Expr.fn(p.u); const X = Expr.fn(p.xt, ['t']); const Y = Expr.fn(p.yt, ['t']);
      const ux = u.d('x'), uy = u.d('y'), xd = X.d('t'), yd = Y.d('t'); const t = p.t0; const x = num(X(t), 'x(t)'), y = num(Y(t), 'y(t)');
      const a = num(ux(x, y), 'uₓ'), b = num(xd(t), "x′"), c = num(uy(x, y), 'u_y'), d = num(yd(t), "y′"); const tot = a * b + c * d;
      const comp = (s) => u(X(s), Y(s)); const h = 1e-5; const direct = (comp(t + h) - comp(t - h)) / (2 * h);
      const steps = [
        { title: 'Dependent and independent variables', text: 'u depends on x and y, which both depend on t.', lines: [`u = ${u.str}`, `x = ${X.str},   y = ${Y.str}`, 'u → (x, y) → t: u is ultimately a function of t alone.'] },
        { title: 'Partial derivatives of u', text: '', lines: [`∂u/∂x = ${ux.str}`, `∂u/∂y = ${uy.str}`] },
        { title: 'Derivatives of x and y', text: '', lines: [`dx/dt = ${xd.str}`, `dy/dt = ${yd.str}`] },
        { title: 'Chain rule (total derivative)', text: 'du/dt = uₓ·dx/dt + u_y·dy/dt', lines: ['du/dt = (∂u/∂x)(dx/dt) + (∂u/∂y)(dy/dt)', `= (${ux.str})(${xd.str}) + (${uy.str})(${yd.str})`] },
        { title: `Evaluate at t = ${f(t)}`, text: '', lines: [`x = ${d4(x)},  y = ${d4(y)}`, `∂u/∂x = ${d4(a)},  dx/dt = ${d4(b)}  → contribution ${d4(a * b)}`, `∂u/∂y = ${d4(c)},  dy/dt = ${d4(d)}  → contribution ${d4(c * d)}`, { t: `du/dt = ${d4(a * b)} + ${d4(c * d)} = ${d4(tot)}`, b: true, c: '#15803d' }] },
        { title: 'Check by direct substitution', text: 'Substitute x(t), y(t) into u and differentiate.', lines: [`u(t) = u(x(t), y(t));   numerical du/dt at t = ${f(t)}: ${d4(direct)}`, Math.abs(direct - tot) < 1e-4 * Math.max(1, Math.abs(tot)) ? { t: 'Both methods agree ✓', b: true, c: '#15803d' } : 'Values differ — check the functions.'] },
      ];
      return { steps, u, X, Y, t, x, y, tot, comp, formulas: [F('Total derivative', 'du/dt = (∂u/∂x)(dx/dt) + (∂u/∂y)(dy/dt)', `t = ${f(t)}, (x, y) = (${d4(x)}, ${d4(y)})`, `${d4(a)}×${d4(b)} + ${d4(c)}×${d4(d)}`, d4(tot), 'units of u per unit t')], readouts: [{ label: 'du/dt', value: d4(tot), tone: 'good' }, { label: 'uₓ·x′', value: d4(a * b) }, { label: 'u_y·y′', value: d4(c * d) }], state: { u: u.str, x: X.str, y: Y.str, t, partials: { ux: ux.str, uy: uy.str }, totalDerivative: d4(tot) }, explain: { what: `As t increases through ${f(t)}, u changes at rate ${d4(tot)}, made of ${d4(a * b)} through x and ${d4(c * d)} through y.`, why: 'Partial derivatives measure change along one variable; the total derivative adds the contributions of every path from t to u (chain rule).', param: 'u, x(t), y(t) and t.', effect: 'At a t where the path crosses level curves of u tangentially, du/dt becomes zero.' } };
    },
    plot(g, box, sol, S) {
      const [bx, by, bw, bh] = box; const ts = []; for (let i = 0; i <= 120; i++) ts.push(sol.t - 2.5 + (5 * i) / 120);
      const xs = ts.map(sol.X), ys = ts.map(sol.Y); const fin = (a) => a.filter(Number.isFinite);
      const xr = [Math.min(...fin(xs)) - 0.5, Math.max(...fin(xs)) + 0.5], yr = [Math.min(...fin(ys)) - 0.5, Math.max(...fin(ys)) + 0.5];
      const A = Plot.axes(g, [bx, by, bw, bh * 0.52], xr, yr, { xl: 'x', yl: 'y' }); Plot.contour(g, A, sol.u, { n: 50, clampQ: true });
      Plot.param(g, A, sol.X, sol.Y, sol.t - 2.5, sol.t + 2.5, { color: '#0f172a', width: 3 }); Plot.point(g, A, sol.x, sol.y, `t = ${f(sol.t)}`);
      const us = ts.map(sol.comp); const B = Plot.axes(g, [bx, by + bh * 0.56, bw, bh * 0.44], [ts[0], ts[ts.length - 1]], [Math.min(...fin(us)) - 0.5, Math.max(...fin(us)) + 0.5], { xl: 't', yl: 'u' });
      Plot.curve(g, B, sol.comp, { color: '#7c3aed' }); if (S.step >= 4) { const u0 = sol.comp(sol.t); Plot.curve(g, B, (t) => u0 + sol.tot * (t - sol.t), { color: '#15803d', dash: [6, 4], range: [sol.t - 1, sol.t + 1] }); Plot.point(g, B, sol.t, u0, `du/dt = ${d4(sol.tot)}`, { color: '#15803d' }); }
      D.text(g, 'path (x(t), y(t)) over the contours of u', bx + 12, by + 16, { size: 14, color: '#475569' });
    },
  });

  // ─────────────── 3. Jacobian ───────────────
  define('ma-jacobian', {
    modes: [{ key: 'two', label: 'u(x,y), v(x,y)' }, { key: 'three', label: 'u, v, w of (x, y, z)' }],
    params: [{ key: 'u', label: 'u =', type: 'text', default: 'x^2 - y^2' }, { key: 'v', label: 'v =', type: 'text', default: '2*x*y' }, { key: 'w', label: 'w =', type: 'text', default: 'x + y + z', showIf: (p) => p.mode === 'three' }, { key: 'a', label: 'Point x', type: 'range', min: -3, max: 3, step: 0.25, default: 1 }, { key: 'b', label: 'Point y', type: 'range', min: -3, max: 3, step: 0.25, default: 0.5 }, { key: 'c', label: 'Point z', type: 'range', min: -3, max: 3, step: 0.25, default: 1, showIf: (p) => p.mode === 'three' }],
    examples: [{ label: 'u = x² − y², v = 2xy', values: { mode: 'two', u: 'x^2 - y^2', v: '2*x*y' } }, { label: 'Polar: x·cos y, x·sin y', values: { mode: 'two', u: 'x*cos(y)', v: 'x*sin(y)', a: 2, b: 0.5 } }, { label: 'u = x + y, v = x − y', values: { mode: 'two', u: 'x + y', v: 'x - y' } }, { label: 'u = yz, v = zx, w = xy', values: { mode: 'three', u: 'y*z', v: 'z*x', w: 'x*y' } }],
    inputOf: (p) => ({ u: p.u, v: p.v, w: p.mode === 'three' ? p.w : undefined }),
    solve(p) {
      const three = p.mode === 'three'; const vars = three ? ['x', 'y', 'z'] : ['x', 'y']; const pt0 = three ? [p.a, p.b, p.c] : [p.a, p.b];
      const fs = [Expr.fn(p.u, vars), Expr.fn(p.v, vars)].concat(three ? [Expr.fn(p.w, vars)] : []); const names = ['u', 'v', 'w'];
      const J = fs.map((fn) => vars.map((x) => fn.d(x))); const Jv = J.map((r) => r.map((d, j) => num(d(...pt0), `∂${names[0]}/∂${vars[j]}`)));
      const det = window.MACore.Mat.det(Jv);
      // symbolic determinant for 2×2
      let detStr = '';
      if (!three) { const ast = Expr.simp(Expr.simp({ op: '-', a: { op: '*', a: J[0][0].ast, b: J[1][1].ast }, b: { op: '*', a: J[0][1].ast, b: J[1][0].ast } })); detStr = Expr.str(ast); }
      const steps = [
        { title: 'Functions', text: '', lines: fs.map((fn, i) => `${names[i]} = ${fn.str}`) },
        { title: 'Partial derivatives', text: '', lines: fs.flatMap((fn, i) => vars.map((x, j) => `∂${names[i]}/∂${x} = ${J[i][j].str}`)) },
        { title: 'Jacobian matrix', text: `J = ∂(${names.slice(0, fs.length).join(',')})/∂(${vars.join(',')})`, lines: J.map((r, i) => `${i === 0 ? 'J = ' : '    '}[ ${r.map((d) => d.str).join('    ')} ]`) },
        { title: 'Determinant', text: three ? 'Expand along the first row.' : '|J| = uₓv_y − u_yvₓ', lines: three ? [`At (${pt0.map(f).join(', ')}):`, ...Jv.map((r, i) => `${i === 0 ? 'J = ' : '    '}[ ${r.map(d4).join('   ')} ]`), { t: `|J| = ${d4(det)}`, b: true, c: '#15803d' }] : [`|J| = (${J[0][0].str})(${J[1][1].str}) − (${J[0][1].str})(${J[1][0].str})`, { t: `|J| = ${detStr}`, b: true, c: '#1d4ed8' }, `At (${pt0.map(f).join(', ')}): |J| = ${d4(det)}`] },
        { title: 'Meaning', text: 'Local area (volume) scale factor.', lines: [`A small ${three ? 'box' : 'square'} near the point is mapped to a region ${d4(Math.abs(det))} times as large.`, Math.abs(det) < 1e-9 ? 'J = 0: the functions are dependent here (the map folds).' : det < 0 ? 'Negative sign: orientation is reversed.' : 'Positive sign: orientation is preserved.'] },
      ];
      return { steps, three, fs, pt0, det, formulas: [F('Jacobian', three ? 'J = ∂(u,v,w)/∂(x,y,z) = det[∂(uᵢ)/∂(xⱼ)]' : 'J = ∂(u,v)/∂(x,y) = uₓv_y − u_yvₓ', `point (${pt0.map(f).join(', ')})`, three ? '' : detStr, d4(det), 'scale factor')], readouts: [{ label: '|J|', value: d4(det), tone: 'good' }, { label: 'Point', value: `(${pt0.map(f).join(', ')})` }], state: { functions: fs.map((fn, i) => `${names[i]} = ${fn.str}`), jacobianSymbolic: detStr || undefined, jacobianValue: d4(det), point: pt0 }, explain: { what: `The Jacobian at the point is ${d4(det)}.`, why: 'The Jacobian determinant is how much the transformation stretches small areas (volumes); it appears in change of variables in multiple integrals.', param: 'The transformation and the point.', effect: 'Where |J| = 0 the transformation is not locally invertible.' } };
    },
    plot(g, box, sol, S) {
      if (sol.three) { D.tag(g, `|J| = ${d4(sol.det)} at (${sol.pt0.map(f).join(', ')})`, box[0] + box[2] / 2, box[1] + 200, { bg: '#16a34a', size: 18, align: 'center' }); return; }
      const [a, b] = sol.pt0; const hsq = 0.5; const [U, V] = sol.fs;
      const half = (box[2] - 10) / 2;
      const A = Plot.axes(g, [box[0], box[1] + 20, half, box[3] - 40], [a - 1.5, a + 1.5], [b - 1.5, b + 1.5], { equal: true, xl: 'x', yl: 'y' });
      const img = []; for (let i = 0; i <= 40; i++) { const t = i / 40; img.push([a - hsq / 2 + hsq * t, b - hsq / 2]); } for (let i = 0; i <= 40; i++) { const t = i / 40; img.push([a + hsq / 2, b - hsq / 2 + hsq * t]); } for (let i = 0; i <= 40; i++) { const t = i / 40; img.push([a + hsq / 2 - hsq * t, b + hsq / 2]); } for (let i = 0; i <= 40; i++) { const t = i / 40; img.push([a - hsq / 2, b + hsq / 2 - hsq * t]); }
      D.poly(g, img.map(([x, y]) => [A.X(x), A.Y(y)]), { fill: '#bfdbfe', close: true, stroke: '#1d4ed8', width: 2 });
      const mapped = img.map(([x, y]) => [U(x, y), V(x, y)]).filter((q) => q.every(Number.isFinite)); const us = mapped.map((q) => q[0]), vs = mapped.map((q) => q[1]);
      const cu = (Math.min(...us) + Math.max(...us)) / 2, cv = (Math.min(...vs) + Math.max(...vs)) / 2; const R = Math.max(Math.max(...us) - Math.min(...us), Math.max(...vs) - Math.min(...vs), 0.5) * 1.4;
      const B = Plot.axes(g, [box[0] + half + 10, box[1] + 20, half, box[3] - 40], [cu - R, cu + R], [cv - R, cv + R], { equal: true, xl: 'u', yl: 'v' });
      if (S.step >= 3) D.poly(g, mapped.map(([u, v]) => [B.X(u), B.Y(v)]), { fill: '#fecaca', close: true, stroke: '#dc2626', width: 2 });
      D.text(g, `square (area ${f(hsq * hsq)})`, box[0] + 10, box[1] + 12, { size: 14, color: '#1d4ed8', weight: 700 });
      D.text(g, `image ≈ |J| × area = ${d4(Math.abs(sol.det) * hsq * hsq)}`, box[0] + half + 20, box[1] + 12, { size: 14, color: '#dc2626', weight: 700 });
    },
  });

  // ─────────────── 4. Taylor series for two variables (flagship) ───────────────
  const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1)); const binom = (n, k) => fact(n) / (fact(k) * fact(n - k));
  define('ma-taylor2', {
    view3d: true, initialView: { yaw: 0.6, pitch: 0.5, zoom: 1 },
    params: [{ key: 'fx', label: 'f(x, y) =', type: 'text', default: 'exp(x)*sin(y)' }, { key: 'a', label: 'Expansion point a', type: 'range', min: -3, max: 3, step: 0.25, default: 0 }, { key: 'b', label: 'Expansion point b', type: 'range', min: -3, max: 3, step: 0.25, default: 0 }, { key: 'n', label: 'Taylor order', type: 'range', min: 1, max: 4, step: 1, default: 2 }, { key: 'tx', label: 'Compare at x =', type: 'range', min: -3, max: 3, step: 0.05, default: 0.3 }, { key: 'ty', label: 'Compare at y =', type: 'range', min: -3, max: 3, step: 0.05, default: 0.4 }, { key: 'view', label: 'Visualization', type: 'select', options: [{ value: 'surface', label: 'Surfaces (3-D)' }, { value: 'slices', label: 'Slices through (a, b)' }, { value: 'error', label: 'Error map |f − T|' }], default: 'surface' }],
    examples: [{ label: 'eˣ sin y about (0, 0)', values: { fx: 'exp(x)*sin(y)', a: 0, b: 0, n: 3 } }, { label: 'eˣ cos y about (0, 0)', values: { fx: 'exp(x)*cos(y)', a: 0, b: 0, n: 2 } }, { label: 'x²y + 3y − 2 about (1, −2)', values: { fx: 'x^2*y + 3*y - 2', a: 1, b: -2, n: 3, tx: 1.1, ty: -1.9 } }, { label: 'ln(1 + x + y) about (0, 0)', values: { fx: 'ln(1 + x + y)', a: 0, b: 0, n: 3, tx: 0.2, ty: 0.1 } }],
    inputOf: (p) => ({ f: p.fx, expansionPoint: [p.a, p.b], order: p.n }),
    solve(p) {
      const u = Expr.fn(p.fx); const n = Math.round(p.n); const a = p.a, b = p.b;
      // derivative table ∂^(i+j) f / ∂x^i ∂y^j
      const der = {}; der['0,0'] = u; for (let k = 1; k <= n; k++) for (let i = 0; i <= k; i++) { const j = k - i; der[`${i},${j}`] = i > 0 ? der[`${i - 1},${j}`].d('x') : der[`${i},${j - 1}`].d('y'); }
      const val = {}; Object.entries(der).forEach(([k, fn]) => { val[k] = num(fn(a, b), `∂f at (a, b) [${k}]`); });
      const nm = (i, j) => (i + j === 0 ? 'f' : 'f' + 'ₓ'.repeat(i) + (j ? '_' + 'y'.repeat(j) : ''));
      const h = a === 0 ? 'x' : `(x ${a < 0 ? '+' : '−'} ${f(Math.abs(a))})`, kk = b === 0 ? 'y' : `(y ${b < 0 ? '+' : '−'} ${f(Math.abs(b))})`;
      const termStrs = []; const orderPolys = [];
      for (let k = 0; k <= n; k++) {
        const parts = [];
        for (let i = k; i >= 0; i--) { const j = k - i; const c = (binom(k, i) * val[`${i},${j}`]) / fact(k); if (Math.abs(c) < 1e-12) continue; const mon = `${i ? h + (i > 1 ? Num.sup(i) : '') : ''}${j ? kk + (j > 1 ? Num.sup(j) : '') : ''}`; parts.push({ c, mon }); }
        orderPolys.push(parts);
      }
      const polyStr = (upto) => { const all = orderPolys.slice(0, upto + 1).flat(); if (!all.length) return '0'; return all.map((t, idx) => { const cs = Math.abs(t.c) === 1 && t.mon ? '' : f(Math.abs(t.c)); return `${idx === 0 ? (t.c < 0 ? '−' : '') : t.c < 0 ? ' − ' : ' + '}${cs}${t.mon}`; }).join(''); };
      const T = (x, y, upto = n) => { let s = 0; for (let k = 0; k <= upto; k++) for (let i = 0; i <= k; i++) { const j = k - i; s += (binom(k, i) * val[`${i},${j}`] * Math.pow(x - a, i) * Math.pow(y - b, j)) / fact(k); } return s; };
      const fx0 = u(p.tx, p.ty); const tx0 = T(p.tx, p.ty);
      const steps = [
        { title: 'Original function', text: `f(x, y) = ${u.str}`, lines: [`f(x, y) = ${u.str}`, `Expand about (a, b) = ${pt(a, b)} up to order ${n}.`, `h = x − a,  k = y − b`] },
        { title: 'Partial derivatives', text: 'All derivatives up to the chosen order.', lines: Object.entries(der).filter(([k]) => k !== '0,0').map(([k, fn]) => { const [i, j] = k.split(',').map(Number); return `${nm(i, j)} = ${fn.str}`; }) },
        { title: `Evaluate at (a, b) = ${pt(a, b)}`, text: '', lines: Object.keys(der).map((k) => { const [i, j] = k.split(',').map(Number); return `${nm(i, j)}${pt(a, b)} = ${d4(val[k])}`; }) },
        ...orderPolys.map((parts, k) => ({ title: k === 0 ? 'Order 0 term' : `Order ${k} terms (1/${k}!)(h∂ₓ + k∂_y)${k > 1 ? Num.sup(k) : ''} f`, text: parts.length ? parts.map((t) => `${f(t.c)}${t.mon}`).join(' + ') : 'all zero', lines: parts.length ? parts.map((t) => `${f(t.c)} ${t.mon || ''}`.trim()) : ['All terms of this order vanish at (a, b).'] })),
        { title: `Taylor polynomial T${Num.sub(n)}(x, y)`, text: polyStr(n), lines: [{ t: `T${Num.sub(n)} = ${polyStr(n)}`, b: true, c: '#15803d' }] },
        { title: 'Compare the approximation', text: `At ${pt(p.tx, p.ty)}: f = ${d4(fx0)}, T = ${d4(tx0)}`, lines: [`f${pt(p.tx, p.ty)} = ${d4(fx0)}`, ...Array.from({ length: n }, (_, k) => `T${Num.sub(k + 1)}${pt(p.tx, p.ty)} = ${d4(T(p.tx, p.ty, k + 1))}   error = ${d4(Math.abs(fx0 - T(p.tx, p.ty, k + 1)))}`), { t: `Order ${n} error = ${d4(Math.abs(fx0 - tx0))}`, b: true }] },
      ];
      return { steps, u, T, a, b, n, fx0, tx0, formulas: [F('Taylor series (two variables)', 'f(a+h, b+k) = f + (h fₓ + k f_y) + (1/2!)(h² fₓₓ + 2hk fₓ_y + k² f_yy) + …', `(a, b) = ${pt(a, b)}, order ${n}`, '', `T${Num.sub(n)} = ${polyStr(n)}`), F('Approximation error', '|f(x, y) − Tₙ(x, y)|', `(x, y) = ${pt(p.tx, p.ty)}`, `${d4(fx0)} − ${d4(tx0)}`, d4(Math.abs(fx0 - tx0)))], readouts: [{ label: 'Order', value: String(n), tone: 'info' }, { label: 'f', value: d4(fx0) }, { label: `T${Num.sub(n)}`, value: d4(tx0) }, { label: 'Error', value: d4(Math.abs(fx0 - tx0)), tone: Math.abs(fx0 - tx0) < 0.01 ? 'good' : 'warn' }], state: { function: u.str, expansionPoint: pt(a, b), order: n, taylorPolynomial: polyStr(n), comparePoint: pt(p.tx, p.ty), fValue: d4(fx0), taylorValue: d4(tx0), error: d4(Math.abs(fx0 - tx0)) }, explain: { what: `Near ${pt(a, b)} the function is replaced by the polynomial T${Num.sub(n)} built from its derivatives at that point.`, why: 'Matching the value and all partial derivatives up to order n makes the polynomial agree with f to within terms of order n + 1 in the distance from (a, b).', param: 'The function, the expansion point, the order and the comparison point.', effect: 'A higher order or a comparison point closer to (a, b) makes the error smaller; far away the polynomial drifts from the function.' } };
    },
    plot(g, box, sol, S) {
      const R = 1.6; const xr = [sol.a - R, sol.a + R], yr = [sol.b - R, sol.b + R]; const view = S.p.view;
      const upto = Math.min(sol.n, Math.max(0, S.step - 3));
      if (view === 'slices') {
        const half = (box[3] - 10) / 2;
        const one = (bb, fnA, fnT, c0, lab) => { const vals = []; for (let i = 0; i <= 60; i++) { const s = c0 - R + (2 * R * i) / 60; vals.push(fnA(s)); } const fin = vals.filter(Number.isFinite); const lo = Math.min(...fin), hi = Math.max(...fin); const pad = (hi - lo) * 0.2 + 0.3; const A = Plot.axes(g, bb, [c0 - R, c0 + R], [lo - pad, hi + pad], {}); Plot.curve(g, A, fnA, { color: '#2563eb', width: 3 }); if (S.step >= 3) Plot.curve(g, A, fnT, { color: '#16a34a', width: 3, dash: [9, 5] }); D.text(g, lab, bb[0] + 10, bb[1] + 14, { size: 14, weight: 800 }); };
        one([box[0], box[1], box[2], half], (x) => sol.u(x, sol.b), (x) => sol.T(x, sol.b, upto), sol.a, `y = ${f(sol.b)}: f (blue) vs T${Num.sub(upto)} (green dashed)`);
        one([box[0], box[1] + half + 10, box[2], half], (y) => sol.u(sol.a, y), (y) => sol.T(sol.a, y, upto), sol.b, `x = ${f(sol.a)}: f vs T${Num.sub(upto)}`);
        return;
      }
      if (view === 'error') { const A = Plot.axes(g, box, xr, yr, { equal: true, xl: 'x', yl: 'y' }); Plot.contour(g, A, (x, y) => Math.log10(Math.abs(sol.u(x, y) - sol.T(x, y, upto)) + 1e-12), { n: 60, clampQ: true }); Plot.point(g, A, sol.a, sol.b, '(a, b)'); D.text(g, `log₁₀ |f − T${Num.sub(upto)}|: blue = tiny error near (a, b)`, box[0] + 12, box[1] + 16, { size: 14, color: '#0f172a', weight: 700, halo: true }); return; }
      fieldView(g, box, sol.u, { ...S, p: { view: 'surface' } }, { xr, yr, alpha: 0.75, points: [{ x: sol.a, y: sol.b, label: '(a, b)' }], extra3: (gg, P, map) => { if (S.step < 3) return; const n = 16; for (let i = 0; i <= n; i++) { const pts1 = [], pts2 = []; for (let j = 0; j <= n; j++) { const x = xr[0] + ((xr[1] - xr[0]) * i) / n, y = yr[0] + ((yr[1] - yr[0]) * j) / n; const x2 = xr[0] + ((xr[1] - xr[0]) * j) / n, y2 = yr[0] + ((yr[1] - yr[0]) * i) / n; const z1 = sol.T(x, y, upto), z2 = sol.T(x2, y2, upto); const q1 = P(map([x, y, z1])), q2 = P(map([x2, y2, z2])); pts1.push([q1.x, q1.y]); pts2.push([q2.x, q2.y]); } D.poly(gg, pts1, { stroke: '#16a34a', width: 1.4 }); D.poly(gg, pts2, { stroke: '#16a34a', width: 1.4 }); } } });
      D.text(g, `surface = f · green mesh = T${Num.sub(upto)}`, box[0] + 12, box[1] + 16, { size: 14, color: '#0f172a', weight: 700 });
    },
  });

  // ─────────────── 5. Extreme values (flagship) ───────────────
  function classify(r, s, t) { const Dd = r * t - s * s; if (Math.abs(Dd) < 1e-9) return { kind: 'test fails', col: '#64748b', Dd }; if (Dd < 0) return { kind: 'saddle point', col: '#d97706', Dd }; return r > 0 ? { kind: 'minimum', col: '#2563eb', Dd } : { kind: 'maximum', col: '#dc2626', Dd }; }
  define('ma-extrema', {
    view3d: true, initialView: { yaw: 0.6, pitch: 0.55, zoom: 1 },
    params: [{ key: 'fx', label: 'f(x, y) =', type: 'text', default: 'x^3 + y^3 - 3*x*y' }, RANGE_PARAM(3), VIEW_PARAM],
    examples: [{ label: 'x³ + y³ − 3xy', values: { fx: 'x^3 + y^3 - 3*x*y', L: 3 } }, { label: 'x³ + 3xy² − 15x² − 15y² + 72x', values: { fx: 'x^3 + 3*x*y^2 - 15*x^2 - 15*y^2 + 72*x', L: 8 } }, { label: 'x⁴ + y⁴ − 2x² + 4xy − 2y²', values: { fx: 'x^4 + y^4 - 2*x^2 + 4*x*y - 2*y^2', L: 2.5 } }, { label: 'sin x + sin y + sin(x + y)', values: { fx: 'sin(x) + sin(y) + sin(x + y)', L: 3 } }],
    inputOf: (p) => ({ f: p.fx, window: p.L }),
    solve(p) {
      const u = Expr.fn(p.fx); const ux = u.d('x'), uy = u.d('y'); const r = ux.d('x'), s = ux.d('y'), t = uy.d('y');
      const L = p.L; const cps = Solve.newtonGrid(([x, y]) => [ux(x, y), uy(x, y)], [[-L, L], [-L, L]], 11).sort((A, B) => A[0] - B[0] || A[1] - B[1]);
      const rows = cps.map(([x, y]) => { const R = r(x, y), Sv = s(x, y), Tv = t(x, y); const c = classify(R, Sv, Tv); return { x, y, R, S: Sv, T: Tv, ...c, val: u(x, y) }; });
      const steps = [
        { title: 'The function', text: `f = ${u.str}`, lines: [`f(x, y) = ${u.str}`, `Search window: −${f(L)} ≤ x, y ≤ ${f(L)}`] },
        { title: 'First partial derivatives = 0', text: 'Critical-point equations', lines: [{ t: `fₓ = ${ux.str} = 0`, b: true }, { t: `f_y = ${uy.str} = 0`, b: true }] },
        { title: 'Solve for the critical points', text: `${rows.length} critical point(s)`, lines: rows.length ? rows.map((q, i) => `P${Num.sub(i + 1)} = ${pt(q.x, q.y)}   (fₓ = ${d4(ux(q.x, q.y))}, f_y = ${d4(uy(q.x, q.y))})`) : ['No critical point in this window — enlarge the window.'] },
        { title: 'Second partial derivatives', text: 'r = fₓₓ, s = fₓ_y, t = f_yy', lines: [`r = fₓₓ = ${r.str}`, `s = fₓ_y = ${s.str}`, `t = f_yy = ${t.str}`] },
        { title: 'Second derivative test', text: 'Δ = rt − s² at each point', lines: rows.map((q, i) => `P${Num.sub(i + 1)}: r = ${d4(q.R)}, s = ${d4(q.S)}, t = ${d4(q.T)}, rt − s² = ${d4(q.Dd)}`) },
        { title: 'Classification', text: rows.map((q) => q.kind).join(', ') || '—', lines: [...rows.map((q, i) => ({ t: `P${Num.sub(i + 1)} ${pt(q.x, q.y)}: ${q.Dd > 1e-9 ? `rt − s² > 0 and r ${q.R > 0 ? '> 0' : '< 0'}` : q.Dd < -1e-9 ? 'rt − s² < 0' : 'rt − s² = 0'} ⇒ ${q.kind.toUpperCase()}${q.kind.startsWith('max') || q.kind.startsWith('min') ? `, f = ${d4(q.val)}` : ''}`, b: true, c: q.col })), 'Rule: rt − s² > 0, r < 0 → maximum;  r > 0 → minimum;  rt − s² < 0 → saddle;  = 0 → further investigation.'] },
      ];
      return { steps, u, rows, L, formulas: [F('Critical points', 'fₓ = 0 and f_y = 0', `f = ${u.str}`, `fₓ = ${ux.str}, f_y = ${uy.str}`, rows.map((q) => pt(q.x, q.y)).join(', ') || 'none'), F('Second derivative test', 'Δ = rt − s²  (r = fₓₓ, s = fₓ_y, t = f_yy)', '', rows.map((q) => `Δ${pt(q.x, q.y)} = ${d4(q.Dd)}`).join('; '), rows.map((q) => q.kind).join(', ') || '—')], readouts: [{ label: 'Critical points', value: String(rows.length), tone: 'info' }, { label: 'Maxima', value: String(rows.filter((q) => q.kind === 'maximum').length), tone: 'bad' }, { label: 'Minima', value: String(rows.filter((q) => q.kind === 'minimum').length), tone: 'info' }, { label: 'Saddles', value: String(rows.filter((q) => q.kind === 'saddle point').length), tone: 'warn' }], state: { function: u.str, fx: ux.str, fy: uy.str, fxx: r.str, fxy: s.str, fyy: t.str, criticalPoints: rows.map((q) => ({ point: pt(q.x, q.y), r: d4(q.R), s: d4(q.S), t: d4(q.T), discriminant: d4(q.Dd), classification: q.kind, value: d4(q.val) })) }, explain: { what: `f has ${rows.length} critical point(s) in the window: ${rows.map((q) => `${pt(q.x, q.y)} ${q.kind}`).join('; ') || 'none'}.`, why: 'At an extreme value the surface has a horizontal tangent plane (fₓ = f_y = 0); the sign of rt − s² tells whether the surface curves the same way in every direction (max/min) or opposite ways (saddle).', param: 'The function and the search window.', effect: 'A maximum is surrounded by closed level curves with values decreasing outward; at a saddle the level curves cross.' } };
    },
    plot(g, box, sol, S) {
      const L = sol.L; const pts = S.step >= 2 ? sol.rows.map((q, i) => ({ x: q.x, y: q.y, color: S.step >= 5 ? q.col : '#0f172a', label: S.step >= 5 ? `P${i + 1} ${q.kind}` : `P${i + 1}` })) : [];
      fieldView(g, box, sol.u, S, { xr: [-L, L], yr: [-L, L], points: pts, extra2: (gg, A) => { if (S.step === 1 || S.step === 2) { Plot.implicit(gg, A, (x, y) => sol.u.d('x')(x, y), { color: '#1d4ed8' }); Plot.implicit(gg, A, (x, y) => sol.u.d('y')(x, y), { color: '#dc2626' }); D.text(gg, 'blue: fₓ = 0   red: f_y = 0 — critical points where they cross', A.box[0] + 10, A.box[1] + 16, { size: 14, weight: 700, halo: true }); } } });
    },
  });

  // ─────────────── 6. Lagrange multipliers (flagship) ───────────────
  define('ma-lagrange', {
    view3d: true, initialView: { yaw: 0.6, pitch: 0.55, zoom: 1 },
    modes: [{ key: 'two', label: 'f(x, y) with g(x, y) = c' }, { key: 'three', label: 'f(x, y, z) with g(x, y, z) = c' }],
    params: [{ key: 'fx', label: 'Objective f =', type: 'text', default: 'x*y' }, { key: 'gx', label: 'Constraint g =', type: 'text', default: 'x^2 + y^2' }, { key: 'c', label: 'g = c, c =', type: 'range', min: -20, max: 50, step: 0.5, default: 8 }, RANGE_PARAM(4), { key: 'view', label: 'Visualization', type: 'select', options: [{ value: 'contour', label: 'Level curves + constraint (2-D)' }, { value: 'surface', label: 'Surface (3-D)' }], default: 'contour', showIf: (p) => p.mode !== 'three' }],
    examples: [{ label: 'max/min xy on x² + y² = 8', values: { mode: 'two', fx: 'x*y', gx: 'x^2 + y^2', c: 8, L: 4 } }, { label: 'min x² + y² on x + y = 4', values: { mode: 'two', fx: 'x^2 + y^2', gx: 'x + y', c: 4, L: 5 } }, { label: 'max xyz on x + y + z = 12', values: { mode: 'three', fx: 'x*y*z', gx: 'x + y + z', c: 12, L: 12 } }, { label: 'min x² + y² + z² on x + 2y + 3z = 14', values: { mode: 'three', fx: 'x^2 + y^2 + z^2', gx: 'x + 2*y + 3*z', c: 14, L: 6 } }],
    inputOf: (p) => ({ objective: p.fx, constraint: `${p.gx} = ${p.c}` }),
    solve(p) {
      const three = p.mode === 'three'; const vars = three ? ['x', 'y', 'z'] : ['x', 'y'];
      const u = Expr.fn(p.fx, vars), g = Expr.fn(p.gx, vars); const fu = vars.map((v) => u.d(v)), gu = vars.map((v) => g.d(v)); const L = p.L;
      const Fsys = (q) => { const X = q.slice(0, vars.length), lam = q[vars.length]; return [...fu.map((fd, i) => fd(...X) - lam * gu[i](...X)), g(...X) - p.c]; };
      const box = [...vars.map(() => [-L, L]), [-Math.max(10, L * L), Math.max(10, L * L)]];
      const sols = Solve.newtonGrid(Fsys, box, three ? 5 : 9).map((q) => ({ X: q.slice(0, vars.length), lam: q[vars.length], val: u(...q.slice(0, vars.length)) })).sort((A, B) => B.val - A.val);
      if (!sols.length) throw new ParseError('No candidate points found in the window — enlarge the window or check that the constraint curve passes through it.');
      const vmax = sols[0].val, vmin = sols[sols.length - 1].val;
      const tag = (s) => (sols.length > 1 && Math.abs(s.val - vmax) < 1e-9 ? 'maximum' : sols.length > 1 && Math.abs(s.val - vmin) < 1e-9 ? 'minimum' : 'extreme (single candidate)');
      const ptS = (X) => `(${X.map(d4).join(', ')})`;
      const steps = [
        { title: 'Objective and constraint', text: `optimise f = ${u.str} subject to ${g.str} = ${f(p.c)}`, lines: [`f = ${u.str}`, `constraint: ${g.str} = ${f(p.c)}`] },
        { title: 'Lagrangian', text: 'F = f − λ(g − c)', lines: [`F(${vars.join(', ')}, λ) = ${u.str} − λ(${g.str} − ${f(p.c)})`] },
        { title: 'Partial derivatives', text: '', lines: [...vars.map((v, i) => `f_${v} = ${fu[i].str},   g_${v} = ${gu[i].str}`)] },
        { title: 'Lagrange equations ∇f = λ∇g', text: '', lines: [...vars.map((v, i) => ({ t: `${fu[i].str} = λ(${gu[i].str})`, b: true })), { t: `${g.str} = ${f(p.c)}`, b: true }] },
        { title: 'Solve the system', text: `${sols.length} candidate(s)`, lines: sols.map((s, i) => `P${Num.sub(i + 1)} = ${ptS(s.X)},  λ = ${d4(s.lam)}`) },
        { title: 'Evaluate f at the candidates', text: 'Largest = constrained maximum, smallest = minimum', lines: sols.map((s, i) => ({ t: `f(P${Num.sub(i + 1)}) = ${d4(s.val)}  → ${tag(s)}`, b: true, c: tag(s) === 'maximum' ? '#dc2626' : tag(s) === 'minimum' ? '#2563eb' : '#15803d' })) },
      ];
      return { steps, three, u, g, c: p.c, sols, L, tag, formulas: [F('Lagrange condition', '∇f = λ∇g,  g = c', `f = ${u.str}, g = ${g.str} = ${f(p.c)}`, sols.map((s) => `${ptS(s.X)}, λ = ${d4(s.lam)}`).join('; '), sols.map((s) => `f = ${d4(s.val)} (${tag(s)})`).join('; '))], readouts: [{ label: 'Candidates', value: String(sols.length), tone: 'info' }, { label: 'max f', value: d4(vmax), tone: 'bad' }, { label: 'min f', value: d4(vmin), tone: 'good' }], state: { objective: u.str, constraint: `${g.str} = ${f(p.c)}`, candidates: sols.map((s) => ({ point: ptS(s.X), lambda: d4(s.lam), value: d4(s.val), type: tag(s) })) }, explain: { what: `Among the points satisfying the constraint, f is largest (${d4(vmax)}) and smallest (${d4(vmin)}) at the candidates found.`, why: 'At a constrained extreme the level curve of f just touches the constraint curve, so their normals (gradients) are parallel: ∇f = λ∇g.', param: 'Objective, constraint and the constant c.', effect: 'Changing c moves the constraint curve; λ measures how fast the optimum value changes with c.' } };
    },
    plot(g, box, sol, S) {
      if (sol.three) { const P = Plot.cam(S.view, box[0] + box[2] / 2, box[1] + box[3] / 2, Math.min(box[2], box[3]) / 3 / Math.max(1, ...sol.sols.map((s) => Math.max(...s.X.map(Math.abs))))); Plot.axes3(g, P, Math.max(1, ...sol.sols.map((s) => Math.max(...s.X.map(Math.abs)))) * 1.2, { neg: true }); sol.sols.forEach((s, i) => { const v = P(s.X); D.circle(g, v.x, v.y, 8, { fill: '#dc2626', stroke: '#fff', width: 2 }); D.tag(g, `P${i + 1} f = ${d4(s.val)}`, v.x + 10, v.y - 14, { bg: '#dc2626', size: 14 }); }); D.text(g, 'Candidate points in (x, y, z) — drag to rotate', box[0] + 12, box[1] + 18, { size: 14, color: '#475569' }); return; }
      const L = sol.L; const pts = S.step >= 4 ? sol.sols.map((s, i) => ({ x: s.X[0], y: s.X[1], color: sol.tag(s) === 'maximum' ? '#dc2626' : '#2563eb', label: `P${i + 1}: f = ${d4(s.val)}` })) : [];
      fieldView(g, box, sol.u, S, { xr: [-L, L], yr: [-L, L], points: pts, extra2: (gg, A) => { Plot.implicit(gg, A, (x, y) => sol.g(x, y) - sol.c, { color: '#0f172a' }); if (S.step >= 4) sol.sols.forEach((s) => { const [x, y] = s.X; const gx = sol.g.d('x')(x, y), gy = sol.g.d('y')(x, y); const fx = sol.u.d('x')(x, y), fy = sol.u.d('y')(x, y); const k = 0.6 / Math.max(1e-9, Math.hypot(gx, gy)); const kf = 0.6 / Math.max(1e-9, Math.hypot(fx, fy)); D.arrow(gg, A.X(x), A.Y(y), A.X(x + gx * k), A.Y(y + gy * k), { color: '#0f172a', width: 2.5 }); D.arrow(gg, A.X(x), A.Y(y), A.X(x + fx * kf * 1.4), A.Y(y + fy * kf * 1.4), { color: '#16a34a', width: 2.5 }); }); D.text(gg, 'black curve: g = c · green ∇f ∥ black ∇g at the optimum', A.box[0] + 10, A.box[1] + 16, { size: 14, weight: 700, halo: true }); } });
    },
  });
})();
