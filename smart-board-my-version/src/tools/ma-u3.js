'use strict';

/* Engineering Mathematics — Unit III: Multiple Integrals. */
(function () {
  const D = window.EPDraw; const M = window.MACore; const { Num, Expr, Solve, Plot, MPoly, ParseError } = M; const { define, F } = window.MAFrame;
  const f = (v) => Num.fmt(v); const d5 = (v) => Num.fmt(v, { digits: 6 });
  const V2 = ['x', 'y']; const V3 = ['x', 'y', 'z'];

  /**
   * Iterated integral engine. levels: [{v, lo, hi}] from INNER to OUTER; lo/hi are expression strings in the outer variables.
   * Returns {value, lines:[…per level…], exact:boolean}. Exact (polynomial) when every integrand/limit is a polynomial.
   */
  function iterate(fSrc, levels, vars) {
    const fexp = Expr.fn(fSrc, vars); const limits = levels.map((L) => ({ v: L.v, lo: Expr.fn(L.lo, vars), hi: Expr.fn(L.hi, vars) }));
    limits.forEach((L, k) => { const inner = levels.slice(0, k + 1).map((q) => q.v); [L.lo, L.hi].forEach((e) => inner.forEach((iv) => { if (Expr.has(e.ast, iv)) throw new ParseError(`The limits of ${L.v} cannot contain ${iv} (it is integrated first).`); })); });
    const n = vars.length; let P = MPoly.fromAst(fexp.ast, vars); const lines = []; let exact = Boolean(P);
    const lp = limits.map((L) => [MPoly.fromAst(L.lo.ast, vars), MPoly.fromAst(L.hi.ast, vars)]); if (lp.some(([a, b]) => !a || !b)) exact = false;
    if (exact) {
      limits.forEach((L, k) => {
        const i = vars.indexOf(L.v); const Fp = MPoly.integrate(P, i); const up = MPoly.subst(Fp, i, lp[k][1], n), lo = MPoly.subst(Fp, i, lp[k][0], n); const R = MPoly.add(up, lo, -1);
        lines.push({ level: k, v: L.v, integrand: MPoly.str(P, vars), anti: MPoly.str(Fp, vars), lo: L.lo.str, hi: L.hi.str, result: MPoly.str(R, vars) });
        P = R;
      });
      const value = MPoly.evalAt(P, Array(n).fill(0));
      return { value, lines, exact: true, fexp, limits };
    }
    // numeric nested Simpson (inner → outer) with the same limits
    const N = n === 3 ? 28 : 64;
    const rec = (k, env) => {
      const L = limits[k]; const vals = vars.map((v) => env[v] || 0);
      const a = L.lo(...vals), b = L.hi(...vals); if (!Number.isFinite(a) || !Number.isFinite(b)) throw new ParseError(`The limits of ${L.v} are not defined in the region.`);
      return Solve.simpson((t) => { const e = { ...env, [L.v]: t }; return k === 0 ? fexp(...vars.map((v) => e[v])) : rec(k - 1, e); }, a, b, N);
    };
    const value = rec(limits.length - 1, {});
    limits.forEach((L, k) => lines.push({ level: k, v: L.v, numeric: true, lo: L.lo.str, hi: L.hi.str }));
    if (!Number.isFinite(value)) throw new ParseError('The integral does not converge numerically for these limits.');
    return { value, lines, exact: false, fexp, limits };
  }
  function iterLines(res, vars, label = ['Inner', 'Middle', 'Outer']) {
    const names = res.lines.length === 2 ? ['Inner', 'Outer'] : label;
    return res.lines.map((L, k) => (L.numeric
      ? { title: `${names[k]} integration (d${L.v})`, text: 'Not a polynomial: evaluated numerically (Simpson’s rule).', lines: [`∫ … d${L.v}  from ${L.v} = ${L.lo} to ${L.v} = ${L.hi}`, 'Simpson’s rule with fine sub-intervals (accurate to ≈ 6 significant figures).'] }
      : { title: `${names[k]} integration with respect to ${L.v}`, text: `limits ${L.lo} → ${L.hi}`, lines: [`∫ (${L.integrand}) d${L.v}  from ${L.lo} to ${L.hi}`, `Antiderivative: ${L.anti}`, `[ … ]${L.v}=${L.hi}  −  [ … ]${L.v}=${L.lo}`, { t: `= ${L.result}`, b: true, c: k === res.lines.length - 1 ? '#15803d' : '#1d4ed8' }] }));
  }
  const exactNote = (res) => (res.exact ? 'exact (polynomial integration)' : 'numerical (Simpson)');

  // ─────────────── 1. Double integral ───────────────
  define('ma-double-integral', {
    view3d: true, initialView: { yaw: 0.6, pitch: 0.5, zoom: 1 },
    params: [
      { key: 'fx', label: 'Integrand f(x, y) =', type: 'text', default: 'x*y' },
      { key: 'order', label: 'Order', type: 'select', options: [{ value: 'dydx', label: '∫∫ f dy dx (y inner)' }, { value: 'dxdy', label: '∫∫ f dx dy (x inner)' }], default: 'dydx' },
      { key: 'ilo', label: 'Inner lower limit', type: 'text', default: 'x^2' }, { key: 'ihi', label: 'Inner upper limit', type: 'text', default: '2 - x' },
      { key: 'olo', label: 'Outer lower limit', type: 'text', default: '0' }, { key: 'ohi', label: 'Outer upper limit', type: 'text', default: '1' },
      { key: 'view', label: 'Visualization', type: 'select', options: [{ value: 'region', label: 'Region with strips (2-D)' }, { value: 'volume', label: 'Volume under the surface (3-D)' }], default: 'region' },
    ],
    examples: [{ label: '∫₀¹∫_{x²}^{2−x} xy dy dx', values: { fx: 'x*y', order: 'dydx', ilo: 'x^2', ihi: '2 - x', olo: '0', ohi: '1' } }, { label: '∫₀¹∫₀² (x² + y²) dy dx', values: { fx: 'x^2 + y^2', order: 'dydx', ilo: '0', ihi: '2', olo: '0', ohi: '1' } }, { label: '∫₀¹∫_y^{√y}… dx dy', values: { fx: 'x + y', order: 'dxdy', ilo: 'y', ihi: 'sqrt(y)', olo: '0', ohi: '1' } }, { label: '∫₀^π∫₀^{sin x} y dy dx', values: { fx: 'y', order: 'dydx', ilo: '0', ihi: 'sin(x)', olo: '0', ohi: 'pi' } }],
    inputOf: (p) => ({ integrand: p.fx, order: p.order, inner: [p.ilo, p.ihi], outer: [p.olo, p.ohi] }),
    solve(p) {
      const inner = p.order === 'dydx' ? 'y' : 'x', outer = p.order === 'dydx' ? 'x' : 'y';
      const oA = Expr.fn(p.olo, []), oB = Expr.fn(p.ohi, []); const a = oA(), b = oB(); if (!(b > a)) throw new ParseError('The outer upper limit must be greater than the lower limit (numbers).');
      const res = iterate(p.fx, [{ v: inner, lo: p.ilo, hi: p.ihi }, { v: outer, lo: p.olo, hi: p.ohi }], V2);
      const L0 = res.limits[0]; const wrap = (e) => { const fn = (o) => (inner === 'y' ? e(o, 0) : e(0, o)); fn.str = e.str; return fn; }; const lo = wrap(L0.lo), hi = wrap(L0.hi);
      const steps = [
        { title: 'The integral', text: '', lines: [`I = ∫_{${outer}=${oA.str}}^{${oB.str}} ∫_{${inner}=${lo.str}}^{${hi.str}} (${res.fexp.str}) d${inner} d${outer}`] },
        { title: 'Region of integration', text: `${inner} from ${lo.str} to ${hi.str}, ${outer} from ${oA.str} to ${oB.str}`, lines: [`R: ${oA.str} ≤ ${outer} ≤ ${oB.str},  ${lo.str} ≤ ${inner} ≤ ${hi.str}`, `Strips parallel to the ${inner}-axis, stacked along ${outer}.`] },
        ...iterLines(res, V2),
        { title: 'Result', text: `I = ${d5(res.value)}`, lines: [{ t: `I = ${Num.fmt(res.value)}${Num.fmt(res.value).includes('/') || Num.fmt(res.value).includes('√') ? `  ≈ ${Num.dec(res.value, 6)}` : ''}`, b: true, c: '#15803d' }, `(${exactNote(res)})`] },
      ];
      return { steps, res, inner, outer, a, b, lo, hi, formulas: [F('Double integral', `∬_R f dA = ∫_${outer}∫_${inner} f d${inner} d${outer}`, `f = ${res.fexp.str}`, res.exact ? res.lines.map((l) => `∫d${l.v} → ${l.result}`).join(' ; ') : 'Simpson’s rule', Num.fmt(res.value), 'square units × f')], readouts: [{ label: 'I', value: Num.fmt(res.value), tone: 'good' }, { label: 'Method', value: res.exact ? 'exact' : 'numeric' }], state: { integrand: res.fexp.str, order: `d${inner} d${outer}`, limits: { [inner]: [lo.str, hi.str], [outer]: [oA.str, oB.str] }, value: d5(res.value), method: exactNote(res) }, explain: { what: `The integral adds f over the region: first along each strip in ${inner}, then the strips along ${outer}.`, why: 'A double integral is the limit of Σ f ΔA; iterating turns it into two ordinary integrals.', param: 'Integrand, limits and order.', effect: 'With f = 1 the double integral gives the area of R; otherwise the volume under z = f above R.' } };
    },
    plot(g, box, sol, S) { regionPlot(g, box, sol, S, S.p.view); },
  });
  /** Region (inner var between curves) with animated strips, or 3-D volume under f. */
  function regionPlot(g, box, sol, S, view) {
    const { inner, a, b, lo, hi } = sol; const xs = []; for (let i = 0; i <= 80; i++) { const t = a + ((b - a) * i) / 80; xs.push([t, lo(t), hi(t)]); }
    const vals = xs.flatMap((q) => [q[1], q[2]]).filter(Number.isFinite); const c0 = Math.min(...vals), c1 = Math.max(...vals);
    const toXY = (o, i) => (inner === 'y' ? [o, i] : [i, o]);
    if (view === 'volume' && sol.res) {
      const fx = sol.res.fexp; const xr = inner === 'y' ? [a, b] : [c0, c1], yr = inner === 'y' ? [c0, c1] : [a, b]; const span = Math.max(xr[1] - xr[0], yr[1] - yr[0]) / 2; const cx = (xr[0] + xr[1]) / 2, cy = (yr[0] + yr[1]) / 2;
      let zmax = 0; xs.forEach(([o, l, h]) => { for (let k = 0; k <= 8; k++) { const [x, y] = toXY(o, l + ((h - l) * k) / 8); const z = fx(x, y); if (Number.isFinite(z)) zmax = Math.max(zmax, Math.abs(z)); } }); zmax = zmax || 1;
      const map = (q) => [(q[0] - cx) / span, (q[1] - cy) / span, (q[2] / zmax) * 0.9];
      const P = Plot.cam(S.view, box[0] + box[2] / 2, box[1] + box[3] / 2 + 40, Math.min(box[2], box[3]) / 2.8);
      D.rect(g, box[0], box[1], box[2], box[3], { fill: '#fff', stroke: '#cbd5e1', r: 8 });
      g.save(); g.beginPath(); g.rect(box[0], box[1], box[2], box[3]); g.clip();
      const base = [...xs.map(([o, l]) => toXY(o, l)), ...xs.slice().reverse().map(([o, , h]) => toXY(o, h))];
      Plot.poly3(g, P, base.map(([x, y]) => map([x, y, 0])), { fill: '#bbf7d0', close: true, stroke: '#15803d', width: 1.5 });
      const nS = Math.max(1, Math.round(24 * Math.min(1, (S.step + 1) / S.steps.length + (S.st / S.dur) * 0.2)));
      for (let k = 0; k < nS; k++) { const o = a + ((b - a) * (k + 0.5)) / 24; const l = lo(o), h = hi(o); const top = []; for (let m = 0; m <= 12; m++) { const iv = l + ((h - l) * m) / 12; const [x, y] = toXY(o, iv); top.push(map([x, y, fx(x, y)])); } const bot = top.map((q) => [q[0], q[1], 0]).reverse(); Plot.poly3(g, P, [...top, ...bot], { fill: M.Plot.heat(k / 24), close: true, stroke: 'rgba(15,23,42,0.35)', width: 0.8, alpha: 0.85 }); }
      g.restore(); D.text(g, 'Slices of the volume under z = f(x, y) — drag to rotate', box[0] + 12, box[1] + 18, { size: 14, color: '#475569' }); return;
    }
    const xr = inner === 'y' ? [a, b] : [c0, c1], yr = inner === 'y' ? [c0, c1] : [a, b]; const padX = (xr[1] - xr[0]) * 0.15 || 1, padY = (yr[1] - yr[0]) * 0.15 || 1;
    const A = Plot.axes(g, box, [xr[0] - padX, xr[1] + padX], [yr[0] - padY, yr[1] + padY], { equal: true, xl: 'x', yl: 'y' });
    const poly = [...xs.map(([o, l]) => toXY(o, l)), ...xs.slice().reverse().map(([o, , h]) => toXY(o, h))].filter((q) => q.every(Number.isFinite));
    Plot.clip(g, A, () => D.poly(g, poly.map(([x, y]) => [A.X(x), A.Y(y)]), { fill: '#bbf7d0', close: true, stroke: '#15803d', width: 2.5, alpha: 0.9 }));
    const nStrip = S.step >= 1 ? Math.max(1, Math.round(12 * Math.min(1, S.step >= 2 ? 1 : S.st / S.dur))) : 0;
    Plot.clip(g, A, () => { for (let k = 0; k < nStrip; k++) { const o = a + ((b - a) * (k + 0.5)) / 12; const [x1, y1] = toXY(o, lo(o)), [x2, y2] = toXY(o, hi(o)); D.line(g, A.X(x1), A.Y(y1), A.X(x2), A.Y(y2), { color: '#1d4ed8', width: 3, alpha: 0.7 }); } });
    const lab = (fn, name, col) => { const o = a + (b - a) * 0.5; const [x, y] = toXY(o, fn(o)); D.tag(g, name, A.X(x), A.Y(y) - (inner === 'y' ? 14 : 0), { bg: col, size: 14, align: 'center' }); };
    lab(lo, `${inner} = ${lo.str}`, '#dc2626'); lab(hi, `${inner} = ${hi.str}`, '#7c3aed');
    D.text(g, `strips parallel to the ${inner}-axis (inner d${inner})`, box[0] + 12, box[1] + 16, { size: 14, color: '#1d4ed8', weight: 700 });
  }

  // ─────────────── 2. Change of order (flagship) ───────────────
  /** Tries to solve y = g(x) for x symbolically; returns {str, fn} or null. */
  function invert(gfn, xsample) {
    const P = MPoly.fromAst(gfn.ast, ['x', 'y']);
    if (P) {
      const terms = [...P.entries()].map(([k, c]) => ({ e: Number(k.split(',')[0]), c })); const deg = Math.max(...terms.map((t) => t.e));
      if (deg === 1) { const m = (terms.find((t) => t.e === 1) || {}).c || 0; const c0 = (terms.find((t) => t.e === 0) || {}).c || 0; if (Math.abs(m) > 1e-12) { let str; if (m === 1) str = c0 ? `y ${c0 > 0 ? '−' : '+'} ${f(Math.abs(c0))}` : 'y'; else if (m === -1) str = c0 ? `${f(c0)} − y` : '−y'; else if (m > 0) str = c0 ? `(y ${c0 > 0 ? '−' : '+'} ${f(Math.abs(c0))})/${f(m)}` : `y/${f(m)}`; else str = c0 ? `(${f(c0)} − y)/${f(-m)}` : `−y/${f(-m)}`; return { str, fn: (y) => (y - c0) / m }; } }
      if (terms.length === 1 && deg >= 2) { const k = terms[0].c; const sign = xsample < 0 ? -1 : 1; const root = deg === 2 ? '√' : `${Num.sup(deg)}√`; return { str: `${sign < 0 ? '−' : ''}${root}(${k === 1 ? 'y' : `y/${f(k)}`})`, fn: (y) => sign * Math.pow(y / k, 1 / deg) } ; }
    }
    const ast = gfn.ast;
    if (ast.op === 'fn' && ast.name === 'sqrt') { const inn = MPoly.fromAst(ast.a, ['x', 'y']); if (inn) { const terms = [...inn.entries()].map(([k, c]) => ({ e: Number(k.split(',')[0]), c })); if (Math.max(...terms.map((t) => t.e)) === 1) { const m = terms.find((t) => t.e === 1).c; const c0 = (terms.find((t) => t.e === 0) || {}).c || 0; return { str: c0 ? `(y² ${c0 > 0 ? '−' : '+'} ${f(Math.abs(c0))})/${f(m)}` : m === 1 ? 'y²' : `y²/${f(m)}`, fn: (y) => (y * y - c0) / m }; } if (terms.length === 2 && terms.some((t) => t.e === 2 && t.c < 0) && terms.some((t) => t.e === 0)) { const r2 = terms.find((t) => t.e === 0).c / -terms.find((t) => t.e === 2).c; const sign = xsample < 0 ? -1 : 1; return { str: `${sign < 0 ? '−' : ''}√(${f(r2)} − y²)`, fn: (y) => sign * Math.sqrt(Math.max(0, r2 - y * y)) }; } } }
    if (ast.op === 'fn' && (ast.name === 'exp' || ast.name === 'ln' || ast.name === 'log') && ast.a.op === 'var') return ast.name === 'exp' ? { str: 'ln(y)', fn: Math.log } : { str: 'eʸ', fn: Math.exp };
    return null;
  }
  define('ma-change-order', {
    params: [
      { key: 'fx', label: 'Integrand f(x, y) =', type: 'text', default: 'x*y' },
      { key: 'ylo', label: 'y from (lower curve, in x)', type: 'text', default: 'x^2' }, { key: 'yhi', label: 'y to (upper curve, in x)', type: 'text', default: '2 - x' },
      { key: 'a', label: 'x from a =', type: 'text', default: '0' }, { key: 'b', label: 'x to b =', type: 'text', default: '1' },
    ],
    examples: [{ label: '∫₀¹∫_{x²}^{2−x} xy dy dx (splits)', values: { fx: 'x*y', ylo: 'x^2', yhi: '2 - x', a: '0', b: '1' } }, { label: '∫₀¹∫_{x}^{√x} (x + y) dy dx', values: { fx: 'x + y', ylo: 'x', yhi: 'sqrt(x)', a: '0', b: '1' } }, { label: '∫₀^a∫_{x}^{a} … (triangle), a = 2', values: { fx: 'x^2 + y^2', ylo: 'x', yhi: '2', a: '0', b: '2' } }, { label: '∫₀³∫₀^{√(9−x²)} … (quarter disc)', values: { fx: '1', ylo: '0', yhi: 'sqrt(9 - x^2)', a: '0', b: '3' } }, { label: '∫₀¹∫₀^{eˣ} … dy dx', values: { fx: 'x', ylo: '0', yhi: 'exp(x)', a: '0', b: '1' } }],
    inputOf: (p) => ({ integrand: p.fx, original: `∫_{x=${p.a}}^{${p.b}} ∫_{y=${p.ylo}}^{${p.yhi}} f dy dx` }),
    solve(p) {
      const fexp = Expr.fn(p.fx); const g1 = Expr.fn(p.ylo, ['x']), g2 = Expr.fn(p.yhi, ['x']); const a = Expr.fn(p.a, [])(), b = Expr.fn(p.b, [])();
      if (!(b > a)) throw new ParseError('Need b > a for the x-limits.');
      const N = 600; const X = Array.from({ length: N + 1 }, (_, i) => a + ((b - a) * i) / N);
      X.forEach((x) => { const l = g1(x), h = g2(x); if (!Number.isFinite(l) || !Number.isFinite(h)) throw new ParseError(`The curves are not defined at x = ${Num.dec(x, 3)}.`); if (l > h + 1e-9) throw new ParseError(`The lower curve is above the upper curve at x = ${Num.dec(x, 3)} — swap them or change the x-limits.`); });
      const ymin = Math.min(...X.map(g1)), ymax = Math.max(...X.map(g2));
      // horizontal scan
      const ids = (y) => { const inside = X.map((x) => g1(x) <= y + 1e-12 && y <= g2(x) + 1e-12); const first = inside.indexOf(true), last = inside.lastIndexOf(true); if (first < 0) return null; const gaps = inside.slice(first, last + 1).some((v) => !v); const xl = X[first], xr = X[last]; const whichL = first === 0 ? 'a' : Math.abs(g1(xl) - y) < Math.abs(g2(xl) - y) ? 'g1' : 'g2'; const whichR = last === N ? 'b' : Math.abs(g1(xr) - y) < Math.abs(g2(xr) - y) ? 'g1' : 'g2'; return { key: `${whichL}|${whichR}`, whichL, whichR, gaps }; };
      const Ny = 400; const pieces = []; let cur = null;
      for (let j = 0; j <= Ny; j++) { const y = ymin + ((ymax - ymin) * (j + 0.5)) / (Ny + 1); const r = ids(y); if (!r) continue; if (r.gaps) throw new ParseError('For some y the region has two separate x-intervals — this region cannot be written with a single dx strip; split it first.'); if (!cur || cur.key !== r.key) { cur = { ...r, y0: y, y1: y }; pieces.push(cur); } else cur.y1 = y; }
      // snap break points to key heights
      const keys = [ymin, ymax, g1(a), g1(b), g2(a), g2(b)]; const snap = (y) => { const k = keys.find((q) => Math.abs(q - y) < (ymax - ymin) / Ny * 2.5); if (k != null) return k; const fr = Num.frac(y, 12, 1e-3); return fr ? fr[0] / fr[1] : y; };
      pieces.forEach((pc, i) => { pc.y0 = i === 0 ? ymin : snap(pc.y0); pc.y1 = i === pieces.length - 1 ? ymax : snap(pc.y1); });
      for (let i = pieces.length - 1; i >= 0; i--) if (pieces[i].y1 - pieces[i].y0 < (ymax - ymin) * 0.01 && pieces.length > 1) pieces.splice(i, 1);
      for (let i = 1; i < pieces.length; i++) { if (pieces[i].key === pieces[i - 1].key) { pieces[i - 1].y1 = pieces[i].y1; pieces.splice(i, 1); i--; continue; } pieces[i].y0 = pieces[i - 1].y1; }
      if (pieces.length) { pieces[0].y0 = ymin; pieces[pieces.length - 1].y1 = ymax; }
      const bnd = (which, pc) => {
        if (which === 'a') return { str: Num.fmt(a), fn: () => a, desc: `line x = ${Num.fmt(a)}` };
        if (which === 'b') return { str: Num.fmt(b), fn: () => b, desc: `line x = ${Num.fmt(b)}` };
        const gf = which === 'g1' ? g1 : g2; const ymid = (pc.y0 + pc.y1) / 2; const xmid = X.reduce((best, x) => (Math.abs(gf(x) - ymid) < Math.abs(gf(best) - ymid) ? x : best), X[0]);
        const inv = invert(gf, xmid); if (inv) return { str: inv.str, fn: inv.fn, desc: `curve y = ${gf.str} → x = ${inv.str}` };
        // numeric inverse on this piece (monotone assumption)
        return { str: `x on y = ${gf.str}`, fn: (y) => { let lo = a, hi = b; const s0 = gf(lo) - y; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if ((gf(m) - y) * s0 > 0) lo = m; else hi = m; } return (lo + hi) / 2; }, desc: `curve y = ${gf.str} (solved numerically for x)` };
      };
      pieces.forEach((pc) => { pc.L = bnd(pc.whichL, pc); pc.R = bnd(pc.whichR, pc); });
      const orig = Solve.double((x, y) => fexp(x, y), a, b, g1, g2, 80);
      const neu = pieces.reduce((s, pc) => s + Solve.simpson((y) => Solve.simpson((x) => fexp(x, y), pc.L.fn(y), pc.R.fn(y), 80), pc.y0, pc.y1, 80), 0);
      const newStr = pieces.map((pc) => `∫_{y=${Num.fmt(pc.y0)}}^{${Num.fmt(pc.y1)}} ∫_{x=${pc.L.str}}^{${pc.R.str}} f dx dy`).join('  +  ');
      const corners = []; pieces.slice(1).forEach((pc) => corners.push(pc.y0));
      const steps = [
        { title: 'Original integral (dy dx)', text: 'Vertical strips: y from the lower to the upper curve.', lines: [`I = ∫_{x=${Num.fmt(a)}}^{${Num.fmt(b)}} ∫_{y=${g1.str}}^{${g2.str}} (${fexp.str}) dy dx`] },
        { title: 'Plot the region of integration', text: `${Num.fmt(a)} ≤ x ≤ ${Num.fmt(b)},  ${g1.str} ≤ y ≤ ${g2.str}`, lines: [`Lower boundary: y = ${g1.str}`, `Upper boundary: y = ${g2.str}`, `Left/right: x = ${Num.fmt(a)}, x = ${Num.fmt(b)}`, `y ranges from ${Num.fmt(ymin)} to ${Num.fmt(ymax)}`] },
        { title: 'Identify the boundary curves (in terms of y)', text: 'Solve each curve for x.', lines: [...new Set(pieces.flatMap((pc) => [pc.L.desc, pc.R.desc]))] },
        { title: 'Slice horizontally', text: pieces.length > 1 ? `The left/right boundary changes at y = ${corners.map(Num.fmt).join(', ')}, so the region splits into ${pieces.length} parts.` : 'One horizontal strip type covers the region.', lines: pieces.map((pc, i) => `Part ${i + 1}: ${Num.fmt(pc.y0)} ≤ y ≤ ${Num.fmt(pc.y1)},  x from ${pc.L.str} (left) to ${pc.R.str} (right)`) },
        { title: 'New limits and integral (dx dy)', text: newStr, lines: [{ t: `I = ${newStr}`, b: true, c: '#15803d' }] },
        { title: 'Compare both orders', text: 'Same region → same value.', lines: [`Original order: I = ${d5(orig)}`, `Changed order:  I = ${d5(neu)}`, Math.abs(orig - neu) < 1e-4 * Math.max(1, Math.abs(orig)) ? { t: 'Both orders give the same value ✓', b: true, c: '#15803d' } : { t: 'Values differ — the region may need a manual split.', c: '#b91c1c' }] },
      ];
      return { steps, fexp, g1, g2, a, b, ymin, ymax, pieces, orig, neu, formulas: [F('Change of order', '∫_a^b ∫_{g₁(x)}^{g₂(x)} f dy dx = Σ ∫_{c}^{d} ∫_{h₁(y)}^{h₂(y)} f dx dy', `region ${Num.fmt(a)} ≤ x ≤ ${Num.fmt(b)}, ${g1.str} ≤ y ≤ ${g2.str}`, newStr, `${d5(neu)} (= ${d5(orig)})`)], readouts: [{ label: 'Parts', value: String(pieces.length), tone: 'info' }, { label: 'Original', value: d5(orig) }, { label: 'Changed', value: d5(neu), tone: 'good' }], state: { integrand: fexp.str, originalOrder: `∫_{x=${Num.fmt(a)}}^{${Num.fmt(b)}} ∫_{y=${g1.str}}^{${g2.str}} f dy dx`, newOrder: newStr, splitAt: corners.map(Num.fmt), value: d5(neu) }, explain: { what: `The same region is swept by horizontal strips instead of vertical ones${pieces.length > 1 ? `; because the right/left boundary changes at y = ${corners.map(Num.fmt).join(', ')} the integral splits into ${pieces.length} parts` : ''}.`, why: 'Limits describe the region. With dx inner, each horizontal strip runs from the left boundary to the right boundary, which must be written as x in terms of y; where a strip meets a different boundary curve the formula changes.', param: 'The curves and the x-limits.', effect: 'Changing the order never changes the value — only the description of the region (sometimes making the integral much easier).' } };
    },
    plot(g, box, sol, S) {
      const { a, b, ymin, ymax, g1, g2 } = sol; const padX = (b - a) * 0.2 || 1, padY = (ymax - ymin) * 0.15 || 1;
      const A = Plot.axes(g, box, [a - padX, b + padX], [ymin - padY, ymax + padY], { equal: true, xl: 'x', yl: 'y' });
      const X = Array.from({ length: 121 }, (_, i) => a + ((b - a) * i) / 120);
      const poly = [...X.map((x) => [x, g1(x)]), ...X.slice().reverse().map((x) => [x, g2(x)])];
      Plot.clip(g, A, () => D.poly(g, poly.map(([x, y]) => [A.X(x), A.Y(y)]), { fill: '#e0f2fe', close: true, stroke: '#0f172a', width: 2.5 }));
      const cols = ['#bbf7d0', '#fde68a', '#fecaca', '#ddd6fe'];
      if (S.step >= 3) sol.pieces.forEach((pc, i) => { const Y = Array.from({ length: 41 }, (_, k) => pc.y0 + ((pc.y1 - pc.y0) * k) / 40); const pp = [...Y.map((y) => [pc.L.fn(y), y]), ...Y.slice().reverse().map((y) => [pc.R.fn(y), y])]; Plot.clip(g, A, () => D.poly(g, pp.map(([x, y]) => [A.X(x), A.Y(y)]), { fill: cols[i % 4], close: true, stroke: false, alpha: 0.9 })); if (i > 0) Plot.clip(g, A, () => D.line(g, A.X(a - padX), A.Y(pc.y0), A.X(b + padX), A.Y(pc.y0), { color: '#b91c1c', width: 2, dash: [8, 5] })); D.tag(g, `Part ${i + 1}`, A.X((pc.L.fn((pc.y0 + pc.y1) / 2) + pc.R.fn((pc.y0 + pc.y1) / 2)) / 2), A.Y((pc.y0 + pc.y1) / 2), { bg: '#334155', size: 14, align: 'center' }); });
      Plot.curve(g, A, g1, { color: '#dc2626', width: 3, range: [a, b] }); Plot.curve(g, A, g2, { color: '#7c3aed', width: 3, range: [a, b] });
      const prog = S.step === 0 || S.step === 1 ? (S.step === 1 ? Math.min(1, S.st / S.dur) : 1) : 0;
      if (S.step <= 1) Plot.clip(g, A, () => { for (let k = 0; k < Math.round(14 * prog) || (S.step === 0 && k < 14); k++) { const x = a + ((b - a) * (k + 0.5)) / 14; D.line(g, A.X(x), A.Y(g1(x)), A.X(x), A.Y(g2(x)), { color: '#1d4ed8', width: 3, alpha: 0.65 }); } });
      if (S.step >= 3) { const n = S.step === 3 ? Math.round(16 * Math.min(1, S.st / S.dur)) : 16; Plot.clip(g, A, () => { for (let k = 0; k < n; k++) { const y = sol.ymin + ((sol.ymax - sol.ymin) * (k + 0.5)) / 16; const pc = sol.pieces.find((q) => y >= q.y0 - 1e-9 && y <= q.y1 + 1e-9); if (!pc) continue; D.line(g, A.X(pc.L.fn(y)), A.Y(y), A.X(pc.R.fn(y)), A.Y(y), { color: '#15803d', width: 3, alpha: 0.75 }); } }); }
      D.tag(g, `y = ${g1.str}`, A.X(a + (b - a) * 0.75), A.Y(g1(a + (b - a) * 0.75)) + 16, { bg: '#dc2626', size: 14, align: 'center' });
      D.tag(g, `y = ${g2.str}`, A.X(a + (b - a) * 0.3), A.Y(g2(a + (b - a) * 0.3)) - 16, { bg: '#7c3aed', size: 14, align: 'center' });
      D.text(g, S.step <= 1 ? 'Original: vertical strips (dy first)' : S.step >= 3 ? 'New: horizontal strips (dx first)' : 'Boundary curves', box[0] + 12, box[1] + 16, { size: 15, weight: 800, color: S.step >= 3 ? '#15803d' : '#1d4ed8', halo: true });
    },
  });

  // ─────────────── 3. Triple integral ───────────────
  const TRIPLE_PARAMS = (def) => [
    { key: 'fx', label: 'Integrand f(x, y, z) =', type: 'text', default: def.f },
    { key: 'zlo', label: 'z from', type: 'text', default: def.zlo }, { key: 'zhi', label: 'z to', type: 'text', default: def.zhi },
    { key: 'ylo', label: 'y from', type: 'text', default: def.ylo }, { key: 'yhi', label: 'y to', type: 'text', default: def.yhi },
    { key: 'xlo', label: 'x from', type: 'text', default: def.xlo }, { key: 'xhi', label: 'x to', type: 'text', default: def.xhi },
  ];
  function tripleSolve(p, volumeMode) {
    const fsrc = volumeMode ? '1' : p.fx;
    const res = iterate(fsrc, [{ v: 'z', lo: p.zlo, hi: p.zhi }, { v: 'y', lo: p.ylo, hi: p.yhi }, { v: 'x', lo: p.xlo, hi: p.xhi }], V3);
    const [Lz, Ly, Lx] = res.limits; const a = Lx.lo(0, 0, 0), b = Lx.hi(0, 0, 0); if (!(b > a)) throw new ParseError('x-limits must be numbers with upper > lower.');
    const steps = [
      { title: volumeMode ? 'Volume as a triple integral' : 'The triple integral', text: '', lines: [`${volumeMode ? 'V' : 'I'} = ∫_{x=${Lx.lo.str}}^{${Lx.hi.str}} ∫_{y=${Ly.lo.str}}^{${Ly.hi.str}} ∫_{z=${Lz.lo.str}}^{${Lz.hi.str}} ${volumeMode ? '1' : `(${res.fexp.str})`} dz dy dx`] },
      { title: 'The solid (limits)', text: 'z between two surfaces, y between two curves, x between two numbers', lines: [`${Lz.lo.str} ≤ z ≤ ${Lz.hi.str}`, `${Ly.lo.str} ≤ y ≤ ${Ly.hi.str}`, `${Lx.lo.str} ≤ x ≤ ${Lx.hi.str}`] },
      ...iterLines(res, V3),
      { title: volumeMode ? 'Volume' : 'Result', text: Num.fmt(res.value), lines: [{ t: `${volumeMode ? 'V' : 'I'} = ${Num.fmt(res.value)}  ≈ ${Num.dec(res.value, 6)}`, b: true, c: '#15803d' }, `(${exactNote(res)})`] },
    ];
    return { steps, res, a, b, Lx, Ly, Lz, volumeMode, formulas: [F(volumeMode ? 'Volume' : 'Triple integral', volumeMode ? 'V = ∭_E dV = ∫∫∫ dz dy dx' : '∭_E f dV = ∫∫∫ f dz dy dx', `E: ${Lz.lo.str} ≤ z ≤ ${Lz.hi.str}, ${Ly.lo.str} ≤ y ≤ ${Ly.hi.str}, ${Lx.lo.str} ≤ x ≤ ${Lx.hi.str}`, res.exact ? res.lines.map((l) => `∫d${l.v} → ${l.result}`).join(' ; ') : 'Simpson’s rule', Num.fmt(res.value), volumeMode ? 'cubic units' : '—')], readouts: [{ label: volumeMode ? 'V' : 'I', value: Num.fmt(res.value), tone: 'good' }, { label: 'Method', value: res.exact ? 'exact' : 'numeric' }], state: { integrand: res.fexp.str, limits: { z: [Lz.lo.str, Lz.hi.str], y: [Ly.lo.str, Ly.hi.str], x: [Lx.lo.str, Lx.hi.str] }, value: d5(res.value), method: exactNote(res) }, explain: { what: volumeMode ? `The volume of the solid is ${Num.fmt(res.value)} cubic units.` : `The integral of f over the solid is ${Num.fmt(res.value)}.`, why: 'Integrate along z (columns), then y (slabs), then x — each step removes one variable from the limits.', param: 'Integrand and the six limits.', effect: volumeMode ? 'Integrating 1 counts volume; changing the bounding surfaces changes the solid.' : 'With f = 1 the triple integral is the volume; a density f gives mass.' } };
  }
  function solidPlot(g, box, sol, S) {
    const { a, b, Lx, Ly, Lz } = sol; const sample = []; const nx = 14, ny = 10;
    for (let i = 0; i <= nx; i++) { const x = a + ((b - a) * i) / nx; const y0 = Ly.lo(x, 0, 0), y1 = Ly.hi(x, 0, 0); for (let j = 0; j <= ny; j++) { const y = y0 + ((y1 - y0) * j) / ny; sample.push([x, y, Lz.lo(x, y, 0), Lz.hi(x, y, 0)]); } }
    const all = sample.filter((q) => q.every(Number.isFinite)); if (!all.length) return;
    const xr = [a, b], yr = [Math.min(...all.map((q) => q[1])), Math.max(...all.map((q) => q[1]))], zr = [Math.min(...all.map((q) => q[2])), Math.max(...all.map((q) => q[3]))];
    const span = Math.max(xr[1] - xr[0], yr[1] - yr[0], zr[1] - zr[0]) / 2 || 1; const c = [(xr[0] + xr[1]) / 2, (yr[0] + yr[1]) / 2, (zr[0] + zr[1]) / 2];
    const map = (q) => [(q[0] - c[0]) / span, (q[1] - c[1]) / span, (q[2] - c[2]) / span];
    D.rect(g, box[0], box[1], box[2], box[3], { fill: '#fff', stroke: '#cbd5e1', r: 8 });
    const P = Plot.cam(S.view, box[0] + box[2] / 2, box[1] + box[3] / 2 + 10, Math.min(box[2], box[3]) / 4.6);
    g.save(); g.beginPath(); g.rect(box[0], box[1], box[2], box[3]); g.clip();
    const O = map([Math.min(0, xr[0]), Math.min(0, yr[0]), Math.min(0, zr[0])]); [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((d, k) => { const A = P(O), B = P([O[0] + d[0] * 1.3, O[1] + d[1] * 1.3, O[2] + d[2] * 1.3]); D.arrow(g, A.x, A.y, B.x, B.y, { color: ['#dc2626', '#16a34a', '#2563eb'][k], width: 2 }); D.text(g, 'xyz'[k], B.x + 6, B.y, { size: 16, weight: 800, color: ['#dc2626', '#16a34a', '#2563eb'][k] }); });
    // columns (dz), growing with the steps
    const upto = S.step <= 1 ? 0 : S.step >= S.steps.length - 1 ? nx : Math.round(nx * Math.min(1, (S.step - 1) / (S.steps.length - 2) + (S.st / S.dur) * 0.3));
    const cols = []; for (let i = 0; i < upto; i++) { const x = a + ((b - a) * (i + 0.5)) / nx; const y0 = Ly.lo(x, 0, 0), y1 = Ly.hi(x, 0, 0); for (let j = 0; j < ny; j++) { const y = y0 + ((y1 - y0) * (j + 0.5)) / ny; const z0 = Lz.lo(x, y, 0), z1 = Lz.hi(x, y, 0); if (!(z1 > z0)) continue; const top = P(map([x, y, z1])), bot = P(map([x, y, z0])); cols.push({ top, bot, depth: (top.depth + bot.depth) / 2, t: i / nx }); } }
    cols.sort((p1, p2) => p2.depth - p1.depth).forEach((q) => { D.line(g, q.bot.x, q.bot.y, q.top.x, q.top.y, { color: M.Plot.heat(q.t), width: 3.5, alpha: 0.8 }); });
    // boundary surfaces wireframe
    for (let i = 0; i <= nx; i += 2) { const x = a + ((b - a) * i) / nx; const y0 = Ly.lo(x, 0, 0), y1 = Ly.hi(x, 0, 0); ['lo', 'hi'].forEach((w) => { const pts = []; for (let j = 0; j <= ny; j++) { const y = y0 + ((y1 - y0) * j) / ny; const z = Lz[w](x, y, 0); if (Number.isFinite(z)) { const q = P(map([x, y, z])); pts.push([q.x, q.y]); } } D.poly(g, pts, { stroke: w === 'hi' ? '#7c3aed' : '#0f172a', width: 1.4, alpha: 0.8 }); }); }
    g.restore();
    D.text(g, 'z-columns fill the solid step by step — drag to rotate', box[0] + 12, box[1] + 18, { size: 14, color: '#475569' });
  }
  define('ma-triple-integral', {
    view3d: true, initialView: { yaw: 0.7, pitch: 0.45, zoom: 1 },
    params: TRIPLE_PARAMS({ f: 'x*y*z', zlo: '0', zhi: '1 - x - y', ylo: '0', yhi: '1 - x', xlo: '0', xhi: '1' }),
    examples: [{ label: '∭ xyz over the tetrahedron x + y + z ≤ 1', values: { fx: 'x*y*z', zlo: '0', zhi: '1 - x - y', ylo: '0', yhi: '1 - x', xlo: '0', xhi: '1' } }, { label: '∫₀¹∫₀²∫₀³ (x + y + z)', values: { fx: 'x + y + z', zlo: '0', zhi: '3', ylo: '0', yhi: '2', xlo: '0', xhi: '1' } }, { label: 'Octant of a sphere (r = 1), f = 1', values: { fx: '1', zlo: '0', zhi: 'sqrt(1 - x^2 - y^2)', ylo: '0', yhi: 'sqrt(1 - x^2)', xlo: '0', xhi: '1' } }, { label: '∭ (x² + y²) under z = 4 − x² − y² (square base)', values: { fx: 'x^2 + y^2', zlo: '0', zhi: '4 - x^2 - y^2', ylo: '0', yhi: '1', xlo: '0', xhi: '1' } }],
    inputOf: (p) => ({ integrand: p.fx, z: [p.zlo, p.zhi], y: [p.ylo, p.yhi], x: [p.xlo, p.xhi] }),
    solve: (p) => tripleSolve(p, false), plot: solidPlot,
  });

  // ─────────────── 4. Area ───────────────
  define('ma-area', {
    params: [{ key: 'f1', label: 'Curve 1: y =', type: 'text', default: 'x^2' }, { key: 'f2', label: 'Curve 2: y =', type: 'text', default: '2*x' }, { key: 'auto', label: 'Find the limits from the intersections', type: 'toggle', default: true }, { key: 'a', label: 'x from', type: 'range', min: -5, max: 5, step: 0.25, default: 0, showIf: (p) => !p.auto }, { key: 'b', label: 'x to', type: 'range', min: -5, max: 5, step: 0.25, default: 2, showIf: (p) => !p.auto }],
    examples: [{ label: 'y = x² and y = 2x', values: { f1: 'x^2', f2: '2*x', auto: true } }, { label: 'y² = 4x-type: y = √x and y = x²', values: { f1: 'sqrt(x)', f2: 'x^2', auto: true } }, { label: 'y = x and y = x³', values: { f1: 'x', f2: 'x^3', auto: true } }, { label: 'y = sin x, y = 0 on [0, π]', values: { f1: 'sin(x)', f2: '0', auto: false, a: 0, b: 3.25 } }],
    inputOf: (p) => ({ curve1: p.f1, curve2: p.f2 }),
    solve(p) {
      const c1 = Expr.fn(p.f1, ['x']), c2 = Expr.fn(p.f2, ['x']); const diff = (x) => c1(x) - c2(x);
      let a, b;
      if (p.auto) { const roots = []; for (let i = 0; i < 800; i++) { const x0 = -10 + (20 * i) / 800, x1 = x0 + 20 / 800; const d0 = diff(x0), d1 = diff(x1); if (!Number.isFinite(d0) || !Number.isFinite(d1)) continue; if (d0 === 0) roots.push(x0); else if (d0 * d1 < 0) { let lo = x0, hi = x1; for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (diff(lo) * diff(m) <= 0) hi = m; else lo = m; } roots.push((lo + hi) / 2); } } const rr = [...new Set(roots.map((r) => Math.round(r * 1e9) / 1e9))].sort((u, v) => u - v); if (rr.length < 2) throw new ParseError('The curves meet fewer than twice in −10 ≤ x ≤ 10 — switch off automatic limits and choose them.'); a = rr[0]; b = rr[1]; }
      else { a = p.a; b = p.b; if (!(b > a)) throw new ParseError('Choose x to > x from.'); }
      const mid = (a + b) / 2; const upper = c1(mid) >= c2(mid) ? c1 : c2, lower = upper === c1 ? c2 : c1;
      const res = iterate('1', [{ v: 'y', lo: `(${lower === c1 ? p.f1 : p.f2})`, hi: `(${upper === c1 ? p.f1 : p.f2})` }, { v: 'x', lo: String(a), hi: String(b) }], V2);
      const direct = Solve.simpson((x) => Math.abs(c1(x) - c2(x)), a, b, 400);
      const steps = [
        { title: 'Define the region', text: `Between y = ${c1.str} and y = ${c2.str}`, lines: [`Curve 1: y = ${c1.str}`, `Curve 2: y = ${c2.str}`] },
        { title: 'Limits of integration', text: p.auto ? 'Solve curve 1 = curve 2' : 'Chosen x-limits', lines: [p.auto ? `${c1.str} = ${c2.str} ⇒ x = ${Num.fmt(a)}, x = ${Num.fmt(b)}` : `x from ${Num.fmt(a)} to ${Num.fmt(b)}`, `On this interval the upper curve is y = ${upper.str}, the lower is y = ${lower.str}.`] },
        { title: 'Area as a double integral', text: 'A = ∬_R dy dx', lines: [`A = ∫_{${Num.fmt(a)}}^{${Num.fmt(b)}} ∫_{${lower.str}}^{${upper.str}} dy dx = ∫ (${upper.str} − (${lower.str})) dx`] },
        ...iterLines(res, V2),
        { title: 'Area', text: Num.fmt(res.value), lines: [{ t: `A = ${Num.fmt(res.value)}  ≈ ${Num.dec(res.value, 6)} square units`, b: true, c: '#15803d' }, `Check (∫|f₁ − f₂| dx numerically): ${d5(direct)}`] },
      ];
      return { steps, c1, c2, a, b, upper, lower, area: res.value, formulas: [F('Area', 'A = ∬_R dy dx = ∫_a^b [y_upper − y_lower] dx', `a = ${Num.fmt(a)}, b = ${Num.fmt(b)}`, `∫ (${upper.str} − (${lower.str})) dx`, Num.fmt(res.value), 'square units')], readouts: [{ label: 'Area', value: Num.fmt(res.value), tone: 'good' }, { label: 'Limits', value: `${Num.fmt(a)} → ${Num.fmt(b)}` }], state: { curves: [c1.str, c2.str], limits: [Num.fmt(a), Num.fmt(b)], area: d5(res.value) }, explain: { what: `The area enclosed is ${Num.fmt(res.value)} square units.`, why: 'Integrating 1 over the region counts area: the inner integral gives the length of each vertical strip, the outer adds the strips.', param: 'The two curves (and the limits).', effect: 'Where the curves cross, the upper and lower curves swap — the limits come from those intersection points.' } };
    },
    plot(g, box, sol, S) {
      const { a, b, upper, lower } = sol; const X = Array.from({ length: 121 }, (_, i) => a + ((b - a) * i) / 120); const ys = X.flatMap((x) => [upper(x), lower(x)]).filter(Number.isFinite);
      const padX = (b - a) * 0.3 || 1, y0 = Math.min(...ys), y1 = Math.max(...ys), padY = (y1 - y0) * 0.25 || 1;
      const A = Plot.axes(g, box, [a - padX, b + padX], [y0 - padY, y1 + padY], { xl: 'x', yl: 'y' });
      const n = S.step < 2 ? 0 : S.step === 2 ? Math.round(30 * Math.min(1, S.st / S.dur)) : 30;
      Plot.clip(g, A, () => { for (let k = 0; k < n; k++) { const x0 = a + ((b - a) * k) / 30, x1 = x0 + (b - a) / 30; const xm = (x0 + x1) / 2; D.rect(g, A.X(x0), A.Y(upper(xm)), A.X(x1) - A.X(x0), A.Y(lower(xm)) - A.Y(upper(xm)), { fill: '#86efac', stroke: '#15803d', width: 0.8, alpha: 0.85 }); } });
      Plot.curve(g, A, sol.c1, { color: '#2563eb', width: 3 }); Plot.curve(g, A, sol.c2, { color: '#dc2626', width: 3 });
      if (S.step >= 1) { Plot.point(g, A, a, sol.c1(a), `x = ${Num.fmt(a)}`, { color: '#0f172a' }); Plot.point(g, A, b, sol.c1(b), `x = ${Num.fmt(b)}`, { color: '#0f172a' }); }
      if (S.step >= S.steps.length - 1) D.tag(g, `A = ${Num.fmt(sol.area)}`, box[0] + box[2] / 2, box[1] + box[3] - 22, { bg: '#16a34a', size: 18, align: 'center' });
      D.text(g, `blue y = ${sol.c1.str}   red y = ${sol.c2.str}`, box[0] + 12, box[1] + 16, { size: 14, weight: 700 });
    },
  });

  // ─────────────── 5. Volume ───────────────
  define('ma-volume', {
    view3d: true, initialView: { yaw: 0.7, pitch: 0.45, zoom: 1 },
    params: TRIPLE_PARAMS({ f: '1', zlo: '0', zhi: 'c*(1 - x/a - y/b)', ylo: '0', yhi: 'b*(1 - x/a)', xlo: '0', xhi: 'a' }).filter((q) => q.key !== 'fx').map((q) => (['zhi', 'yhi', 'xhi'].includes(q.key) ? { ...q, default: { zhi: '3*(1 - x/1 - y/2)', yhi: '2*(1 - x/1)', xhi: '1' }[q.key] } : q)),
    examples: [{ label: 'Tetrahedron x/1 + y/2 + z/3 ≤ 1', values: { zlo: '0', zhi: '3*(1 - x - y/2)', ylo: '0', yhi: '2*(1 - x)', xlo: '0', xhi: '1' } }, { label: 'Octant of sphere r = 2', values: { zlo: '0', zhi: 'sqrt(4 - x^2 - y^2)', ylo: '0', yhi: 'sqrt(4 - x^2)', xlo: '0', xhi: '2' } }, { label: 'Under paraboloid z = 4 − x² − y² over the unit square', values: { zlo: '0', zhi: '4 - x^2 - y^2', ylo: '0', yhi: '1', xlo: '0', xhi: '1' } }, { label: 'Box 1 × 2 × 3', values: { zlo: '0', zhi: '3', ylo: '0', yhi: '2', xlo: '0', xhi: '1' } }],
    inputOf: (p) => ({ z: [p.zlo, p.zhi], y: [p.ylo, p.yhi], x: [p.xlo, p.xhi] }),
    solve: (p) => tripleSolve(p, true), plot: solidPlot,
  });
})();
