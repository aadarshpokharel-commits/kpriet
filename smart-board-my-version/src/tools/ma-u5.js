'use strict';

/* Engineering Mathematics — Unit V: Ordinary Differential Equations (reusable linear-ODE engine). */
(function () {
  const D = window.EPDraw; const M = window.MACore; const { Num, Expr, Poly, Mat, Solve, Plot, MPoly, ParseError } = M; const { define, F } = window.MAFrame;
  const f = (v) => Num.fmt(v); const d4 = (v) => Num.dec(v, 5);
  const N = (v) => ({ op: 'num', v });

  // ───────────────────────── ODE engine ─────────────────────────
  const Ode = {
    /** Parses "y'' - 3y' + 2y = e^(2x)" or "(D^2 - 3D + 2)y = …" → {coefs (highest first), order, rhs}. */
    parse(src, v = 'x') {
      const s = String(src || '').replace(/\s+/g, '').replace(/−/g, '-').replace(/[’′]/g, "'").replace(/″/g, "''");
      const parts = s.split('='); if (parts.length > 2) throw new ParseError('Use one "=" sign.');
      const lhs = parts[0]; const rhs = parts.length === 2 ? parts[1] : '0';
      let coefs = null; const op = /^\((.+)\)y$/i.exec(lhs);
      if (op) { const P = MPoly.fromAst(Expr.parse(op[1].toLowerCase(), ['d']), ['d']); if (!P) throw new ParseError('The operator must be a polynomial in D, e.g. (D^2 - 3D + 2)y'); const deg = Math.max(...[...P.keys()].map(Number)); coefs = Array.from({ length: deg + 1 }, (_, k) => P.get(String(deg - k)) || 0); }
      else {
        const re = /([+-]?)(\d*\.?\d*(?:\/\d+)?)\*?(?:y(?:\^\((\d+)\)|('*)))/gy; const map = {}; let m; let pos = 0; re.lastIndex = 0;
        while (pos < lhs.length) { re.lastIndex = pos; m = re.exec(lhs); if (!m || m.index !== pos) throw new ParseError(`Could not read the left side near "${lhs.slice(pos, pos + 8)}". Write it like y'' - 3y' + 2y (numbers × y, y', y'', …).`); const c = (m[1] === '-' ? -1 : 1) * (m[2] ? (m[2].includes('/') ? Number(m[2].split('/')[0]) / Number(m[2].split('/')[1]) : Number(m[2])) : 1); const k = m[3] ? Number(m[3]) : (m[4] || '').length; map[k] = (map[k] || 0) + c; pos = re.lastIndex; }
        const n = Math.max(...Object.keys(map).map(Number)); coefs = Array.from({ length: n + 1 }, (_, k) => map[n - k] || 0);
      }
      while (coefs.length > 1 && Math.abs(coefs[0]) < 1e-14) coefs.shift();
      const order = coefs.length - 1; if (order < 1) throw new ParseError('The equation must contain a derivative of y.');
      if (order > 6) throw new ParseError('Orders up to 6 are supported.');
      const rhsFn = Expr.fn(rhs, [v]);
      return { coefs, order, rhs: rhsFn, v };
    },
    lhsStr(coefs, v = 'x', mode = 'prime') { const n = coefs.length - 1; return coefs.map((c, k) => { const o = n - k; if (Math.abs(c) < 1e-14) return ''; const yy = mode === 'D' ? (o === 0 ? 'y' : `D${o > 1 ? Num.sup(o) : ''}y`) : o === 0 ? 'y' : o <= 3 ? 'y' + "'".repeat(o) : `y⁽${o}⁾`; const a = Math.abs(c); return `${c < 0 ? ' − ' : k ? ' + ' : ''}${a === 1 ? '' : f(a)}${yy}`; }).join('').replace(/^ \+ /, ''); },
    /** Complementary-function basis from auxiliary roots. Returns [{str, xstr}] (str uses variable v). */
    basis(roots, v = 'x', back = null) {
      const g = Poly.group(roots, 1e-6); const out = []; const vv = v;
      g.forEach(({ root, mult }) => {
        if (root.im < -1e-9) return; // conjugate handled with the positive one
        for (let j = 0; j < mult; j++) {
          const xp = j === 0 ? '' : j === 1 ? `${vv}*` : `${vv}^${j}*`;
          const ex = Math.abs(root.re) < 1e-12 ? '' : `exp(${root.re}*${vv})`;
          if (Math.abs(root.im) < 1e-9) out.push({ src: `${xp}${ex || '1'}`.replace(/\*$/, ''), a: root.re, b: 0, j, trig: null });
          else { out.push({ src: `${xp}${ex ? ex + '*' : ''}cos(${root.im}*${vv})`, a: root.re, b: root.im, j, trig: 'cos' }); out.push({ src: `${xp}${ex ? ex + '*' : ''}sin(${root.im}*${vv})`, a: root.re, b: root.im, j, trig: 'sin' }); }
        }
      });
      return out.map((q) => ({ ...q, fn: Expr.fn(q.src, [vv]), pretty: prettyTerm(q, vv, back) }));
    },
    /** CF text in textbook form. */
    cfStr(roots, v = 'x', back = null) {
      const g = Poly.group(roots, 1e-6); let k = 0; const parts = [];
      const X = back ? back.x : v; const E = (a) => (back ? back.pow(a) : Math.abs(a) < 1e-12 ? '' : `e${supExp(a, v)}`);
      g.forEach(({ root, mult }) => {
        if (root.im < -1e-9) return;
        const poly = (s) => { const cs = []; for (let j = 0; j < mult; j++) { k++; cs.push(`${s}${Num.sub(k)}${j === 0 ? '' : j === 1 ? (back ? back.z : X) : `${back ? back.z : X}${Num.sup(j)}`}`); } return mult > 1 ? `(${cs.join(' + ')})` : cs[0]; };
        if (Math.abs(root.im) < 1e-9) parts.push(`${poly('c')}${E(root.re)}`);
        else { const bz = back ? `${f(root.im)} ${back.z}` : `${f(root.im)}${v}`; const A = poly('c'), B = poly('c'); parts.push(`${E(root.re)}${E(root.re) ? '[' : ''}${A} cos(${bz.replace(/^1 ?/, '')}) + ${B} sin(${bz.replace(/^1 ?/, '')})${E(root.re) ? ']' : ''}`); }
      });
      return parts.join(' + ');
    },
    /** Classifies RHS terms c·x^m·e^{ax}·{cos|sin}(bx). */
    rhsTerms(fn, v) {
      const terms = []; const walk = (n, sgn) => { if (n.op === '+' || n.op === '-') { walk(n.a, sgn); walk(n.b, n.op === '-' ? -sgn : sgn); } else if (n.op === 'neg') walk(n.a, -sgn); else terms.push({ n, sgn }); };
      walk(expand(fn.ast), 1);
      const lin = (u) => { const P = MPoly.fromAst(u, [v]); if (!P) return null; const deg = Math.max(0, ...[...P.keys()].map(Number)); if (deg > 1) return null; return { a: P.get('1') || 0, c: P.get('0') || 0 }; };
      return terms.map(({ n, sgn }) => {
        const t = { c: sgn, m: 0, a: 0, b: 0, trig: null };
        const fac = (u) => {
          if (u.op === '*') { fac(u.a); fac(u.b); return; }
          if (u.op === '/') { fac(u.a); if (u.b.op === 'num') { t.c /= u.b.v; return; } throw new ParseError('Division by a variable in the right side — use Variation of Parameters.'); }
          if (u.op === 'neg') { t.c = -t.c; fac(u.a); return; }
          if (u.op === 'num' || u.op === 'const') { t.c *= u.v; return; }
          if (u.op === 'var' && u.name === v) { t.m += 1; return; }
          if (u.op === '^' && u.a.op === 'var' && u.a.name === v && u.b.op === 'num' && Number.isInteger(u.b.v) && u.b.v >= 0) { t.m += u.b.v; return; }
          if (u.op === '^' && u.b.op === 'num' && u.a.op === 'fn' && u.a.name === 'exp') { const L = lin(u.a.a); if (!L) throw new ParseError('Unsupported exponential.'); t.a += L.a * u.b.v; t.c *= Math.exp(L.c * u.b.v); return; }
          if ((u.op === 'fn' && u.name === 'exp') || (u.op === '^' && u.a.op === 'const' && u.a.name === 'e')) { const L = lin(u.op === 'fn' ? u.a : u.b); if (!L) throw new ParseError('Exponent must be linear in ' + v + '.'); t.a += L.a; t.c *= Math.exp(L.c); return; }
          if (u.op === '^' && u.a.op === 'num' && u.a.v > 0) { const L = lin(u.b); if (!L) throw new ParseError('Unsupported power.'); t.a += L.a * Math.log(u.a.v); t.c *= Math.pow(u.a.v, L.c); return; }
          if (u.op === 'fn' && (u.name === 'sin' || u.name === 'cos')) { const L = lin(u.a); if (!L || Math.abs(L.c) > 1e-12 || t.trig) throw new ParseError('Use sin(bx) / cos(bx) (one trig factor per term).'); t.trig = u.name; t.b = L.a; return; }
          throw new ParseError(`The right side term "${Expr.str(u)}" is not of the form xᵐ·e^{ax}·cos/sin(bx) — use the Variation of Parameters simulator.`);
        };
        fac(n); if (t.trig && Math.abs(t.b) < 1e-12) { if (t.trig === 'sin') t.c = 0; t.trig = null; }
        if (t.trig === 'sin' && t.b < 0) { t.b = -t.b; t.c = -t.c; } if (t.trig === 'cos' && t.b < 0) t.b = -t.b;
        return t;
      }).filter((t) => Math.abs(t.c) > 1e-14);
    },
    /** Particular integral by undetermined coefficients (collocation). Returns {src, pretty, trial, fn} or null for f = 0. */
    particular(coefs, rhsFn, roots, v = 'x', back = null) {
      const terms = Ode.rhsTerms(rhsFn, v); if (!terms.length) return null;
      const groups = new Map(); terms.forEach((t) => { const key = `${t.a.toFixed(9)}|${t.b.toFixed(9)}`; const g = groups.get(key) || { a: t.a, b: t.b, m: 0 }; g.m = Math.max(g.m, t.m); groups.set(key, g); });
      const basis = []; const trialParts = [];
      groups.forEach((g) => {
        const s = roots.filter((r) => Math.abs(r.re - g.a) < 1e-6 && Math.abs(Math.abs(r.im) - g.b) < 1e-6 && (g.b === 0 ? Math.abs(r.im) < 1e-6 : r.im > 0)).length;
        for (let j = 0; j <= g.m; j++) { const pw = s + j; const xp = pw === 0 ? '' : pw === 1 ? `${v}*` : `${v}^${pw}*`; const ex = Math.abs(g.a) < 1e-12 ? '' : `exp(${g.a}*${v})*`; if (g.b === 0) basis.push({ src: `${xp}${ex}1`.replace(/\*1$/, '') || '1', pw, a: g.a, b: 0, trig: null }); else { basis.push({ src: `${xp}${ex}cos(${g.b}*${v})`, pw, a: g.a, b: g.b, trig: 'cos' }); basis.push({ src: `${xp}${ex}sin(${g.b}*${v})`, pw, a: g.a, b: g.b, trig: 'sin' }); } }
        trialParts.push({ s, m: g.m, a: g.a, b: g.b });
      });
      const L = (fn, x) => { let d = fn; const vals = [fn(x)]; for (let k = 1; k < coefs.length; k++) { d = d.d(v); vals.push(d(x)); } return coefs.reduce((acc, c, k) => acc + c * vals[coefs.length - 1 - k], 0); };
      const B = basis.map((q) => Expr.fn(q.src.replace(/^$/, '1'), [v])); const nU = B.length; const xs = Array.from({ length: nU * 3 + 3 }, (_, i) => -0.9 + (1.8 * i) / (nU * 3 + 2) + 0.013);
      const A = xs.map((x) => B.map((b) => L(b, x))); const y = xs.map((x) => rhsFn(x));
      const At = Mat.T(A); const AtA = Mat.mul(At, A); const inv = Mat.inv(AtA); if (!inv) throw new ParseError('Could not determine the particular integral (singular system).');
      let c = Mat.mv(inv, Mat.mv(At, y)); c = c.map((v0) => { const fr = Num.frac(v0, 1000, 1e-7); return fr ? fr[0] / fr[1] : Math.abs(v0) < 1e-10 ? 0 : v0; });
      const res = Math.max(...xs.map((x, i) => Math.abs(A[i].reduce((s, a, k) => s + a * c[k], 0) - y[i]))); if (res > 1e-6 * Math.max(1, ...y.map(Math.abs))) throw new ParseError('The trial solution does not fit this right side.');
      const used = basis.map((q, k) => ({ ...q, c: c[k] })).filter((q) => Math.abs(q.c) > 1e-12);
      const src = used.map((q) => `(${q.c})*(${q.src || '1'})`).join(' + ') || '0'; const fn = Expr.fn(src, [v]);
      const pretty = used.map((q, i) => coefStr(q.c, prettyTerm({ a: q.a, b: q.b, j: q.pw, trig: q.trig }, v, back), i === 0)).join('');
      const trial = trialParts.map((t) => `${t.s ? (back ? back.z : v) + (t.s > 1 ? Num.sup(t.s) : '') + '·' : ''}(${t.m ? `A₀ + … + Aₘ${back ? back.z : v}${Num.sup(t.m)}` : 'A'})${Math.abs(t.a) > 1e-12 ? (back ? back.pow(t.a) : `e${supExp(t.a, v)}`) : ''}${t.b ? `·[cos, sin](${f(t.b)}${back ? back.z : v})` : ''}`).join(' + ');
      return { src, fn, pretty, trial, resonance: trialParts.some((t) => t.s > 0), trialParts, terms };
    },
    /** Solves for constants from initial conditions at x0: vals = [y(x0), y'(x0), …]. */
    constants(basis, yp, x0, vals) {
      const n = basis.length; const A = []; const b = [];
      for (let k = 0; k < n; k++) { A.push(basis.map((q) => { let d = q.fn; for (let j = 0; j < k; j++) d = d.d(q.fn.vars[0]); return d(x0); })); let dp = yp ? yp.fn : null; for (let j = 0; j < k && dp; j++) dp = dp.d(yp.fn.vars[0]); b.push(vals[k] - (dp ? dp(x0) : 0)); }
      const inv = Mat.inv(A); if (!inv) throw new ParseError('The initial conditions do not determine the constants.');
      return Mat.mv(inv, b).map((c) => { const fr = Num.frac(c, 1000, 1e-8); return fr ? fr[0] / fr[1] : c; });
    },
  };
  function expand(n) {
    if (!n || !n.op) return n; const isSum = (u) => u && (u.op === '+' || u.op === '-');
    if (n.op === '+' || n.op === '-') return { op: n.op, a: expand(n.a), b: expand(n.b) };
    if (n.op === 'neg') { const a = expand(n.a); return isSum(a) ? expand({ op: a.op, a: { op: 'neg', a: a.a }, b: { op: 'neg', a: a.b } }) : { op: 'neg', a }; }
    if (n.op === '*') { const a = expand(n.a), b = expand(n.b); if (isSum(a)) return expand({ op: a.op, a: { op: '*', a: a.a, b }, b: { op: '*', a: a.b, b } }); if (isSum(b)) return expand({ op: b.op, a: { op: '*', a, b: b.a }, b: { op: '*', a, b: b.b } }); return { op: '*', a, b }; }
    if (n.op === '/') { const a = expand(n.a), b = expand(n.b); if (isSum(a) && b.op === 'num') return expand({ op: a.op, a: { op: '/', a: a.a, b }, b: { op: '/', a: a.b, b } }); return { op: '/', a, b }; }
    if (n.op === '^' && n.b.op === 'num' && Number.isInteger(n.b.v) && n.b.v >= 2 && n.b.v <= 5) { const a = expand(n.a); if (isSum(a)) { let r = a; for (let k = 1; k < n.b.v; k++) r = expand({ op: '*', a: r, b: a }); return r; } return { op: '^', a, b: n.b }; }
    return n;
  }
  function coefStr(c, t, first) { const a = Math.abs(c); const fr = Num.fmt(a); const cs = a === 1 && t !== '1' ? '' : fr.includes('/') && t !== '1' ? `(${fr})` : fr; return `${first ? (c < 0 ? '−' : '') : c < 0 ? ' − ' : ' + '}${cs}${t === '1' ? (cs ? '' : '1') : t}`; }
  const joinPlus = (a, b) => (b.startsWith('−') ? `${a} − ${b.slice(1)}` : `${a} + ${b}`);
  function supExp(a, v) { const s = Num.fmt(a, { pi: false, surd: false }); return (s === '1' ? '' : s === '−1' ? '⁻' : s.split('').map((ch) => ({ '−': '⁻', '/': 'ᐟ', '.': '·' }[ch] || Num.sup(ch))).join('')) + ({ x: 'ˣ', z: 'ᶻ', t: 'ᵗ' }[v] || v); }
  function prettyTerm(q, v, back) {
    const X = back ? back.z : v; const pw = q.j || 0; const xp = pw === 0 ? '' : pw === 1 ? (back ? `(${X})` : X) : back ? `(${X})${Num.sup(pw)}` : `${X}${Num.sup(pw)}`;
    const ex = Math.abs(q.a) < 1e-12 ? '' : back ? back.pow(q.a) : `e${supExp(q.a, v)}`;
    const tr = q.trig ? `${q.trig}(${Num.fmt(q.b, { pi: false }) === '1' ? '' : Num.fmt(q.b, { pi: false })}${X})` : '';
    return (back ? `${ex}${xp}${tr}` : `${xp}${ex}${tr}`) || '1';
  }
  /** tabulates f on [a,b] once and interpolates linearly (fast repeated plotting). */
  function gridFn(fn, a, b, n) { const h = (b - a) / n; const ys = Array.from({ length: n + 1 }, (_, i) => { try { return fn(a + i * h); } catch (e) { return NaN; } }); return (x) => { if (x < a || x > b) return fn(x); const t = (x - a) / h; const i = Math.min(n - 1, Math.floor(t)); return ys[i] + (ys[i + 1] - ys[i]) * (t - i); }; }
  window.MAOde = Ode;

  // ───── shared solution view: roots in the complex plane + solution curve ─────
  function rootsPlot(g, box, roots) {
    const R = Math.max(2, ...roots.map((r) => Math.max(Math.abs(r.re), Math.abs(r.im)))) * 1.3; const A = Plot.axes(g, box, [-R, R], [-R, R], { equal: true, xl: 'Re', yl: 'Im' });
    Poly.group(roots, 1e-6).forEach(({ root, mult }) => Plot.point(g, A, root.re, root.im, `${Num.cfmt(root)}${mult > 1 ? ` (×${mult})` : ''}`, { color: Math.abs(root.im) > 1e-9 ? '#7c3aed' : root.re > 0 ? '#dc2626' : '#2563eb' }));
    D.text(g, 'roots of the auxiliary equation', box[0] + 10, box[1] + 14, { size: 14, weight: 700, color: '#475569' });
  }
  function curvePlot(g, box, fn, o = {}) {
    const [x0, x1] = o.xr; const ys = []; for (let i = 0; i <= 200; i++) { const y = fn(x0 + ((x1 - x0) * i) / 200); if (Number.isFinite(y)) ys.push(y); }
    if (!ys.length) return; let lo = Math.min(...ys), hi = Math.max(...ys); if (hi - lo < 1e-6) { lo -= 1; hi += 1; } const pad = (hi - lo) * 0.12; lo = Math.max(lo - pad, o.clip ? -o.clip : -Infinity); hi = Math.min(hi + pad, o.clip || Infinity);
    const A = Plot.axes(g, box, [x0, x1], [lo, hi], { xl: o.xl || 'x', yl: 'y' });
    (o.extra || []).forEach((e) => Plot.curve(g, A, e.fn, { color: e.color, width: 2, dash: e.dash }));
    Plot.curve(g, A, fn, { color: o.color || '#dc2626', width: 3.5 });
    if (o.ic) Plot.point(g, A, o.ic[0], o.ic[1], o.icLabel || `y(${f(o.ic[0])}) = ${f(o.ic[1])}`, { color: '#0f172a' });
    if (o.title) D.text(g, o.title, box[0] + 10, box[1] + 14, { size: 14, weight: 800, color: '#0f172a', halo: true });
    return A;
  }

  /** Full constant-coefficient solution with steps (used by several simulations). */
  function solveConstant(eq, p, o = {}) {
    const v = eq.v; const roots = Poly.roots(eq.coefs); const back = o.back || null;
    const basis = Ode.basis(roots, v, back); const cf = Ode.cfStr(roots, v, back); const pi = Ode.particular(eq.coefs, eq.rhs, roots, v, back);
    const aux = Poly.str(eq.coefs, 'm'); const fac = window.MAUtil && window.MAUtil.factorStr ? window.MAUtil.factorStr(roots) : null;
    const g = Poly.group(roots, 1e-6); const cases = g.map(({ root, mult }) => (Math.abs(root.im) > 1e-9 ? (root.im > 0 ? `m = ${Num.cfmt(root)} (complex pair α ± iβ, α = ${f(root.re)}, β = ${f(root.im)})` : null) : `m = ${f(root.re)}${mult > 1 ? ` repeated ${mult} times` : ''} (real)`)).filter(Boolean);
    const steps = [];
    steps.push({ title: 'Auxiliary (characteristic) equation', text: `${aux} = 0`, lines: [`Replace D by m: ${aux} = 0`, ...(fac ? [`${aux} = ${fac.replace(/λ/g, 'm')}`] : [])] });
    steps.push({ title: 'Roots and their type', text: roots.map(Num.cfmt).join(', '), lines: cases });
    steps.push({ title: 'Complementary function (CF)', text: cf, lines: ['Distinct real m → c·e^{mx};  repeated m → (c₁ + c₂x + …)e^{mx};  α ± iβ → e^{αx}(c₁cos βx + c₂sin βx)'.replace(/x/g, back ? back.z : v), { t: `y_c = ${cf}`, b: true, c: '#1d4ed8' }] });
    if (pi) steps.push({ title: 'Particular integral (PI)', text: pi.pretty, lines: [`Right side: ${eq.rhs.str}`, `Trial solution: y_p = ${pi.trial}${pi.resonance ? '   (multiplied by a power of ' + (back ? back.z : v) + ' because the right side matches a root: resonance)' : ''}`, 'Substitute y_p into the equation and compare coefficients:', { t: `y_p = ${pi.pretty}`, b: true, c: '#1d4ed8' }] });
    const gen = `y = ${pi ? joinPlus(cf, pi.pretty) : cf}`;
    steps.push({ title: 'General solution', text: gen, lines: [{ t: gen, b: true, c: '#15803d' }] });
    let consts = null, sol = null;
    if (o.ic) {
      const vals = o.ic.vals.slice(0, eq.order); consts = Ode.constants(basis, pi, o.ic.x0, vals);
      sol = (x) => basis.reduce((s, q, i) => s + consts[i] * q.fn(x), 0) + (pi ? pi.fn(x) : 0);
      const labels = ['y', "y'", "y''", "y'''", 'y⁽⁴⁾', 'y⁽⁵⁾'];
      const finalStr = basis.map((q, i) => ({ c: consts[i], t: q.pretty })).filter((q) => Math.abs(q.c) > 1e-12).map((q, i) => coefStr(q.c, q.t, i === 0)).join(''); const finalStr2 = pi ? (finalStr ? joinPlus(finalStr, pi.pretty) : pi.pretty) : finalStr || '0';
      steps.push({ title: 'Apply the initial conditions', text: vals.map((val, k) => `${labels[k]}(${f(o.ic.x0)}) = ${f(val)}`).join(', '), lines: [vals.map((val, k) => `${labels[k]}(${f(o.ic.x0)}) = ${f(val)}`).join(',  '), `Solve for the constants: ${consts.map((c, i) => `c${Num.sub(i + 1)} = ${f(c)}`).join(', ')}`] });
      steps.push({ title: 'Particular solution & curve', text: finalStr2, lines: [{ t: `y = ${finalStr2}`, b: true, c: '#15803d' }, `Check: y(${f(o.ic.x0)}) = ${d4(sol(o.ic.x0))}`] });
      return { steps, roots, basis, cf, pi, gen, consts, sol, finalStr: finalStr2, aux };
    }
    return { steps, roots, basis, cf, pi, gen, aux };
  }
  const IC_PARAMS = (n, show = () => true) => [{ key: 'useIC', label: 'Use initial conditions', type: 'toggle', default: true, showIf: show }, { key: 'x0', label: 'at x₀ =', type: 'range', min: -2, max: 2, step: 0.25, default: 0, showIf: (p) => show(p) && p.useIC }, ...[["y0", 'y(x₀)', 1], ['y1', "y'(x₀)", 0], ['y2', "y''(x₀)", 0], ['y3', "y'''(x₀)", 0]].slice(0, n).map(([k, l, d]) => ({ key: k, label: l, type: 'range', min: -5, max: 5, step: 0.25, default: d, showIf: (p) => show(p) && p.useIC }))];
  const icOf = (p, order) => (p.useIC ? { x0: p.x0, vals: [p.y0, p.y1, p.y2, p.y3].slice(0, order).map((v) => (v == null ? 0 : v)) } : null);
  function odeResult(eq, r, p, title) {
    const u = r.sol;
    return {
      formulas: [F('Auxiliary equation', 'replace D → m in f(D)y = X', Ode.lhsStr(eq.coefs, eq.v), `${r.aux} = 0`, r.roots.map(Num.cfmt).join(', ')), F('General solution', 'y = CF + PI', '', r.pi ? `PI = ${r.pi.pretty}` : 'homogeneous: PI = 0', r.gen.replace('y = ', ''))].concat(r.sol ? [F('Initial-value solution', 'constants from the initial conditions', `x₀ = ${f(p.x0)}`, r.consts.map((c, i) => `c${Num.sub(i + 1)} = ${f(c)}`).join(', '), r.finalStr)] : []),
      readouts: [{ label: 'Order', value: String(eq.order), tone: 'info' }, { label: 'Roots', value: r.roots.map(Num.cfmt).join(', ') }, ...(u ? [{ label: `y(${f(p.x0 + 1)})`, value: d4(u(p.x0 + 1)), tone: 'good' }] : [])],
      state: { equation: `${Ode.lhsStr(eq.coefs, eq.v)} = ${eq.rhs.str}`, method: title, auxiliaryEquation: `${r.aux} = 0`, roots: r.roots.map(Num.cfmt), complementaryFunction: r.cf, particularIntegral: r.pi ? r.pi.pretty : '0', generalSolution: r.gen, initialConditions: u ? `x₀ = ${p.x0}: ${[p.y0, p.y1, p.y2, p.y3].slice(0, eq.order).join(', ')}` : 'none', solution: r.finalStr || r.gen },
      explain: { what: `The equation is solved as y = CF + PI: CF = ${r.cf}${r.pi ? `, PI = ${r.pi.pretty}` : ''}.`, why: 'For constant coefficients e^{mx} turns every derivative into a power of m, so the homogeneous solutions come from the roots of the auxiliary equation; the PI copies the form of the right side.', param: 'Coefficients, right side and the initial conditions.', effect: 'Negative real parts give decaying solutions, positive ones grow; complex roots oscillate. The initial conditions pick one curve from the family.' },
    };
  }

  // ─────────────── 1. Second-order ODE solver (flagship curves) ───────────────
  define('ma-ode2', {
    params: [{ key: 'eq', label: 'Differential equation', type: 'text', default: "y'' - 3y' + 2y = e^(3x)", placeholder: "y'' + 4y = sin(2x)   or   (D^2 - 3D + 2)y = x^2", help: "Use y, y', y'' (or D-operator form). Right side: polynomials, e^(ax), sin(bx), cos(bx) and products." }, ...IC_PARAMS(2), { key: 'span', label: 'Plot to x₀ +', type: 'range', min: 1, max: 12, step: 0.5, default: 3 }],
    examples: [{ label: "y'' − 3y' + 2y = e^{3x}", values: { eq: "y'' - 3y' + 2y = e^(3x)", useIC: true, x0: 0, y0: 1, y1: 0 } }, { label: "y'' + 4y = sin 2x (resonance)", values: { eq: "y'' + 4y = sin(2x)", useIC: true, x0: 0, y0: 0, y1: 1, span: 10 } }, { label: "y'' + 2y' + 5y = 0 (damped)", values: { eq: "y'' + 2y' + 5y = 0", useIC: true, x0: 0, y0: 2, y1: 0, span: 5 } }, { label: "(D² − 4D + 4)y = x² e^{2x}", values: { eq: '(D^2 - 4D + 4)y = x^2*exp(2x)', useIC: true, x0: 0, y0: 1, y1: 1, span: 2 } }],
    inputOf: (p) => ({ equation: p.eq, initialConditions: p.useIC ? { x0: p.x0, y0: p.y0, y1: p.y1 } : null }),
    solve(p) {
      const eq = Ode.parse(p.eq); if (eq.order !== 2) throw new ParseError(`This is an order-${eq.order} equation — use the Higher-Order ODE Solver.`);
      const r = solveConstant(eq, p, { ic: icOf(p, 2) });
      const steps = [{ title: 'Identify the equation', text: `Order 2, linear, constant coefficients`, lines: [`${Ode.lhsStr(eq.coefs)} = ${eq.rhs.str}`, `Operator form: (${Poly.str(eq.coefs, 'D')})y = ${eq.rhs.str}`, 'Order = 2 (highest derivative y″), linear with constant coefficients.'] }, ...r.steps, ...(r.sol ? [] : [{ title: 'Solution curves', text: 'Switch on initial conditions to pick one curve.', lines: ['The general solution is a two-parameter family of curves.'] }])];
      return { steps, eq, r, p, ...odeResult(eq, r, p, 'auxiliary equation + undetermined coefficients') };
    },
    plot(g, box, sol, S) {
      const [bx, by, bw, bh] = box; rootsPlot(g, [bx, by, bw * 0.4, bh * 0.4], sol.r.roots);
      const x0 = sol.p.useIC ? sol.p.x0 : 0; const fam = [];
      if (!sol.r.sol) { [-1, 0, 1].forEach((c1) => [-1, 1].forEach((c2) => fam.push((x) => c1 * sol.r.basis[0].fn(x) + c2 * sol.r.basis[1].fn(x) + (sol.r.pi ? sol.r.pi.fn(x) : 0)))); }
      const show = S.step >= S.steps.length - 1 || !sol.r.sol; const main = sol.r.sol || fam[0];
      if (show || S.step >= S.steps.length - 2) curvePlot(g, [bx, by + bh * 0.44, bw, bh * 0.56], main, { xr: [x0 - 0.5, x0 + sol.p.span], clip: 1e6, ic: sol.r.sol ? [x0, sol.p.y0] : null, extra: sol.r.sol ? [] : fam.slice(1).map((fn) => ({ fn, color: '#94a3b8' })), title: sol.r.sol ? 'solution curve (change the initial conditions to see it update)' : 'members of the solution family' });
      D.text(g, sol.r.pi ? `CF: ${sol.r.cf}` : `y = ${sol.r.cf}`, bx + bw * 0.42, by + 30, { size: 15, weight: 700, color: '#1d4ed8' });
      if (sol.r.pi) D.text(g, `PI: ${sol.r.pi.pretty}`, bx + bw * 0.42, by + 58, { size: 15, weight: 700, color: '#7c3aed' });
    },
  });

  // ─────────────── 2. Higher-order ODE solver ───────────────
  define('ma-ode-higher', {
    params: [{ key: 'eq', label: 'Differential equation', type: 'text', default: "y''' - 6y'' + 11y' - 6y = 0", help: "e.g. y'''' - y = 0,  (D^3 - 3D^2 + 3D - 1)y = e^x" }, ...IC_PARAMS(4), { key: 'span', label: 'Plot to x₀ +', type: 'range', min: 1, max: 12, step: 0.5, default: 2 }],
    examples: [{ label: "y‴ − 6y″ + 11y′ − 6y = 0", values: { eq: "y''' - 6y'' + 11y' - 6y = 0" } }, { label: '(D³ − 3D² + 3D − 1)y = eˣ (triple root)', values: { eq: '(D^3 - 3D^2 + 3D - 1)y = exp(x)' } }, { label: "y'''' − y = 0", values: { eq: "y'''' - y = 0", span: 6 } }, { label: '(D⁴ + 8D² + 16)y = 0 (repeated complex)', values: { eq: '(D^4 + 8D^2 + 16)y = 0', span: 6 } }],
    inputOf: (p) => ({ equation: p.eq }),
    solve(p) {
      const eq = Ode.parse(p.eq); const r = solveConstant(eq, p, { ic: icOf(p, eq.order) });
      const steps = [{ title: 'Identify the equation', text: `Order ${eq.order}`, lines: [`${Ode.lhsStr(eq.coefs)} = ${eq.rhs.str}`, `(${Poly.str(eq.coefs, 'D')})y = ${eq.rhs.str}`, `Order ${eq.order}, linear, constant coefficients → ${eq.order} arbitrary constants.`] }, ...r.steps];
      return { steps, eq, r, p, ...odeResult(eq, r, p, 'characteristic equation') };
    },
    plot(g, box, sol, S) {
      const [bx, by, bw, bh] = box; rootsPlot(g, [bx, by, bw * 0.45, bh * 0.45], sol.r.roots);
      const x0 = sol.p.useIC ? sol.p.x0 : 0;
      if (sol.r.sol) curvePlot(g, [bx, by + bh * 0.5, bw, bh * 0.5], sol.r.sol, { xr: [x0 - 0.5, x0 + sol.p.span], clip: 1e6, ic: [x0, sol.p.y0], title: 'solution satisfying the initial conditions' });
      else sol.r.basis.slice(0, 4).forEach((q, i) => { if (i === 0) curvePlot(g, [bx, by + bh * 0.5, bw, bh * 0.5], q.fn, { xr: [-1, 2], clip: 50, extra: sol.r.basis.slice(1, 4).map((w, k) => ({ fn: w.fn, color: ['#2563eb', '#16a34a', '#7c3aed'][k] })), title: 'basis solutions of the CF' }); });
      D.text(g, `y_c = ${sol.r.cf}`, bx + bw * 0.47, by + 30, { size: 15, weight: 700, color: '#1d4ed8' });
    },
  });

  // ─────────────── 3. Constant-coefficient simulator (all root cases, sliders) ───────────────
  define('ma-ode-constant', {
    params: [{ key: 'a', label: "Coefficient of y'' (a)", type: 'range', min: 0.5, max: 3, step: 0.5, default: 1 }, { key: 'b', label: "Coefficient of y' (b)", type: 'range', min: -6, max: 6, step: 0.25, default: 2 }, { key: 'c', label: 'Coefficient of y (c)', type: 'range', min: -6, max: 12, step: 0.25, default: 5 }, { key: 'rhs', label: 'Right side X(x)', type: 'text', default: '0' }, ...IC_PARAMS(2), { key: 'span', label: 'Plot to x₀ +', type: 'range', min: 1, max: 12, step: 0.5, default: 6 }],
    examples: [{ label: 'Distinct real roots (overdamped)', values: { a: 1, b: 5, c: 4, rhs: '0' } }, { label: 'Repeated root (critical)', values: { a: 1, b: 4, c: 4, rhs: '0' } }, { label: 'Complex roots (oscillation)', values: { a: 1, b: 1, c: 9, rhs: '0' } }, { label: 'Forced: y″ + 4y = cos 3x', values: { a: 1, b: 0, c: 4, rhs: 'cos(3x)', y0: 0, y1: 0, span: 12 } }],
    inputOf: (p) => ({ a: p.a, b: p.b, c: p.c, rhs: p.rhs }),
    solve(p) {
      const eq = { coefs: [p.a, p.b, p.c], order: 2, rhs: Expr.fn(p.rhs, ['x']), v: 'x' }; const disc = p.b * p.b - 4 * p.a * p.c;
      const r = solveConstant(eq, p, { ic: icOf(p, 2) });
      const kind = Math.abs(disc) < 1e-12 ? 'equal roots' : disc > 0 ? 'real and distinct roots' : 'complex roots';
      const steps = [{ title: 'Equation', text: `${Ode.lhsStr(eq.coefs)} = ${eq.rhs.str}`, lines: [`${Ode.lhsStr(eq.coefs)} = ${eq.rhs.str}`, `Discriminant b² − 4ac = ${f(p.b * p.b)} − ${f(4 * p.a * p.c)} = ${f(disc)} → ${kind}`] }, ...r.steps];
      const res = odeResult(eq, r, p, 'root cases'); res.readouts.push({ label: 'Case', value: kind, tone: disc < 0 ? 'warn' : 'info' });
      return { steps, eq, r, p, disc, ...res };
    },
    plot(g, box, sol, S) {
      const [bx, by, bw, bh] = box; rootsPlot(g, [bx, by, bw * 0.4, bh * 0.4], sol.r.roots);
      D.text(g, sol.disc > 1e-12 ? 'Real distinct: sum of exponentials' : sol.disc < -1e-12 ? 'Complex: oscillation × e^{αx}' : 'Repeated: (c₁ + c₂x)e^{mx}', bx + bw * 0.42, by + 30, { size: 15, weight: 800, color: '#7c3aed' });
      D.text(g, `y_c = ${sol.r.cf}`, bx + bw * 0.42, by + 58, { size: 14, weight: 700, color: '#1d4ed8' });
      const x0 = sol.p.useIC ? sol.p.x0 : 0; const fn = sol.r.sol || ((x) => sol.r.basis[0].fn(x));
      curvePlot(g, [bx, by + bh * 0.44, bw, bh * 0.56], fn, { xr: [x0, x0 + sol.p.span], clip: 1e5, ic: sol.r.sol ? [x0, sol.p.y0] : null, title: 'drag the sliders — the curve updates live' });
    },
  });

  // ─────────────── Euler–Cauchy & Legendre (x = eᶻ / ax + b = eᶻ) ───────────────
  function thetaPoly(k) { let P = [1]; for (let j = 0; j < k; j++) { const Q = Array(P.length + 1).fill(0); P.forEach((c, i) => { Q[i] += c; Q[i + 1] -= j * c; }); P = Q; } return P; } // θ(θ−1)…(θ−k+1), highest first
  function addPoly(A, B) { const n = Math.max(A.length, B.length); const a = Array(n - A.length).fill(0).concat(A), b = Array(n - B.length).fill(0).concat(B); return a.map((v, i) => v + b[i]); }
  /** coefficients c_k of (ax+b)^k y^(k) (k = 0…n) → θ-polynomial (highest first), with a^k scaling. */
  function reduceToConstant(ck, a) { let P = [0]; ck.forEach((c, k) => { if (!c) return; P = addPoly(P, thetaPoly(k).map((v) => v * c * Math.pow(a, k))); }); while (P.length > 1 && Math.abs(P[0]) < 1e-14) P.shift(); return P; }
  function transformSolve(p, kind) {
    const a = kind === 'legendre' ? p.la : 1, b = kind === 'legendre' ? p.lb : 0; const ck = [p.c0, p.c1, p.c2].concat(p.order3 ? [p.c3] : []);
    if (!ck[ck.length - 1]) throw new ParseError('The leading coefficient cannot be 0.');
    const coefs = reduceToConstant(ck, a); const u = kind === 'legendre' ? (b === 0 ? `(${a === 1 ? '' : a === -1 ? '−' : f(a)}x)` : `(${a === 1 ? '' : a === -1 ? '−' : f(a)}x ${b < 0 ? '−' : '+'} ${f(Math.abs(b))})`) : 'x';
    const base = kind === 'legendre' ? u : 'x';
    const rhsX = Expr.fn(p.rhs, ['x']); const rhsZ = Expr.fromAst(Expr.simp(Expr.subst(rhsX.ast, { x: kind === 'legendre' ? { op: '/', a: { op: '-', a: { op: 'fn', name: 'exp', a: { op: 'var', name: 'z' } }, b: N(b) }, b: N(a) } : { op: 'fn', name: 'exp', a: { op: 'var', name: 'z' } } })), ['z']);
    const back = { z: `log ${base.replace(/[()]/g, '') === 'x' ? 'x' : base}`.replace('log', 'ln'), x: base, pow: (m) => Math.abs(m) < 1e-12 ? '' : `${base}${Num.fmt(m, { pi: false }) === '1' ? '' : '^' + (Num.fmt(m, { pi: false }).length > 1 ? `(${Num.fmt(m, { pi: false })})` : Num.fmt(m, { pi: false }))}`.replace(/\^\((\d)\)$/, (_, d) => Num.sup(d)).replace(/\^(\d)$/, (_, d) => Num.sup(d)) };
    back.z = `ln ${base}`;
    const eq = { coefs, order: coefs.length - 1, rhs: rhsZ, v: 'z' };
    const r = solveConstant(eq, p, { back });
    const terms = ck.map((c, k) => (c ? `${c < 0 ? ' − ' : k === ck.length - 1 ? '' : ' + '}${Math.abs(c) === 1 ? '' : f(Math.abs(c))}${k ? (k === 1 ? u : `${u}${Num.sup(k)}`) : ''}y${"'".repeat(k)}` : '')).reverse().join('').replace(/^ \+ /, '');
    const Dsub = kind === 'legendre' ? `${u} = eᶻ ⇒ z = ln ${u};  ${u}·y′ = ${f(a)}θy,  ${u}²·y″ = ${f(a * a)}θ(θ − 1)y  (θ = d/dz)` : 'x = eᶻ ⇒ z = ln x;  x·y′ = θy,  x²·y″ = θ(θ − 1)y,  x³y‴ = θ(θ − 1)(θ − 2)y  (θ = d/dz)';
    const steps = [
      { title: kind === 'legendre' ? "Legendre's linear equation" : 'Euler–Cauchy equation', text: `${terms} = ${rhsX.str}`, lines: [`${terms} = ${rhsX.str}`, 'Variable coefficients, but each derivative is multiplied by the matching power of ' + u + '.'] },
      { title: 'Transformation', text: kind === 'legendre' ? `${u} = eᶻ` : 'x = eᶻ', lines: [Dsub] },
      { title: 'Reduced constant-coefficient equation', text: `(${Poly.str(coefs, 'θ')})y = ${rhsZ.str}`, lines: [{ t: `(${Poly.str(coefs, 'θ')})y = ${rhsZ.str}`, b: true }, 'This has constant coefficients in z.'] },
      ...r.steps.map((s) => ({ ...s, lines: s.lines })),
      { title: `Back to ${kind === 'legendre' ? 'x' : 'x'}`, text: `e^{mz} = ${base}^m, z = ln ${base}`, lines: [`Replace e^{mz} by ${base}^m and z by ln ${base}:`, { t: r.gen, b: true, c: '#15803d' }] },
    ];
    const sampleC = [1, 0.5, -0.5, 0.3];
    const curve = (x) => { const zz = kind === 'legendre' ? Math.log(a * x + b) : Math.log(x); return r.basis.reduce((s, q, i) => s + sampleC[i % 4] * q.fn(zz), 0) + (r.pi ? r.pi.fn(zz) : 0); };
    return { steps, r, coefs, curve, a, b, kind, base, eqText: `${terms} = ${rhsX.str}`, formulas: [F('Substitution', kind === 'legendre' ? `${u} = eᶻ,  (${u})ᵏDᵏ = aᵏθ(θ−1)…(θ−k+1)` : 'x = eᶻ,  xᵏDᵏ = θ(θ−1)…(θ−k+1)', `θ = d/dz`, `(${Poly.str(coefs, 'θ')})y = ${rhsZ.str}`, r.gen)], readouts: [{ label: 'Auxiliary roots', value: r.roots.map(Num.cfmt).join(', '), tone: 'info' }], state: { equation: `${terms} = ${rhsX.str}`, transformation: kind === 'legendre' ? `${u} = e^z` : 'x = e^z', reducedEquation: `(${Poly.str(coefs, 'θ')})y = ${rhsZ.str}`, roots: r.roots.map(Num.cfmt), solution: r.gen }, explain: { what: `The substitution ${kind === 'legendre' ? u + ' = eᶻ' : 'x = eᶻ'} turns the variable-coefficient equation into one with constant coefficients in z.`, why: `Because ${u}·d/dx = ${kind === 'legendre' ? f(a) + '·' : ''}d/dz, every term ${u}ᵏ y⁽ᵏ⁾ becomes a polynomial in θ = d/dz acting on y.`, param: 'The coefficients and the right side.', effect: `A root m gives ${base}^m; complex roots α ± iβ give ${base}^α[cos(β ln ${base}), sin(β ln ${base})].` } };
  }
  const EC_PARAMS = (kind) => [
    ...(kind === 'legendre' ? [{ key: 'la', label: 'a in (ax + b)', type: 'range', min: -3, max: 3, step: 1, default: 1 }, { key: 'lb', label: 'b in (ax + b)', type: 'range', min: -3, max: 5, step: 1, default: 1 }] : []),
    { key: 'order3', label: 'Third-order equation', type: 'toggle', default: false },
    { key: 'c3', label: `coefficient of ${kind === 'legendre' ? '(ax+b)³' : 'x³'}y‴`, type: 'range', min: -3, max: 3, step: 1, default: 1, showIf: (p) => p.order3 },
    { key: 'c2', label: `coefficient of ${kind === 'legendre' ? '(ax+b)²' : 'x²'}y″`, type: 'range', min: -3, max: 3, step: 1, default: 1 },
    { key: 'c1', label: `coefficient of ${kind === 'legendre' ? '(ax+b)' : 'x'}y′`, type: 'range', min: -8, max: 8, step: 1, default: kind === 'legendre' ? 1 : -3 },
    { key: 'c0', label: 'coefficient of y', type: 'range', min: -15, max: 15, step: 1, default: kind === 'legendre' ? 1 : 4 },
    { key: 'rhs', label: 'Right side f(x)', type: 'text', default: kind === 'legendre' ? '0' : 'x^2' },
  ];

  define('ma-euler-cauchy', {
    params: EC_PARAMS('euler'),
    examples: [{ label: 'x²y″ − 3xy′ + 4y = x² (repeated root)', values: { order3: false, c2: 1, c1: -3, c0: 4, rhs: 'x^2' } }, { label: 'x²y″ + xy′ + y = 0 (complex)', values: { order3: false, c2: 1, c1: 1, c0: 1, rhs: '0' } }, { label: 'x²y″ − 2xy′ − 4y = x⁴', values: { order3: false, c2: 1, c1: -2, c0: -4, rhs: 'x^4' } }, { label: 'x²y″ + 4xy′ + 2y = ln x', values: { order3: false, c2: 1, c1: 4, c0: 2, rhs: 'ln(x)' } }],
    inputOf: (p) => ({ c2: p.c2, c1: p.c1, c0: p.c0, rhs: p.rhs }),
    solve(p) { return transformSolve(p, 'euler'); },
    plot(g, box, sol, S) { rootsPlot(g, [box[0], box[1], box[2] * 0.45, box[3] * 0.42], sol.r.roots); D.text(g, `y = ${sol.r.cf.slice(0, 60)}`, box[0] + box[2] * 0.47, box[1] + 30, { size: 14, weight: 700, color: '#1d4ed8' }); curvePlot(g, [box[0], box[1] + box[3] * 0.46, box[2], box[3] * 0.54], sol.curve, { xr: [0.05, 4], clip: 1e4, title: 'a member of the solution family (x > 0)' }); },
  });
  define('ma-legendre', {
    modes: [{ key: 'linear', label: "Legendre's linear equation" }, { key: 'poly', label: "Legendre's differential equation → Pₙ(x)" }],
    params: [...EC_PARAMS('legendre').map((q) => ({ ...q, showIf: (p) => p.mode !== 'poly' && (!q.showIf || q.showIf(p)) })), { key: 'n', label: 'n (degree)', type: 'range', min: 0, max: 6, step: 1, default: 3, showIf: (p) => p.mode === 'poly' }],
    examples: [{ label: '(x + 1)²y″ + (x + 1)y′ + y = 0', values: { mode: 'linear', la: 1, lb: 1, c2: 1, c1: 1, c0: 1, rhs: '0' } }, { label: '(2x + 3)²y″ − 2(2x + 3)y′ − 12y = 6x', values: { mode: 'linear', la: 2, lb: 3, c2: 1, c1: -2, c0: -12, rhs: '6*x' } }, { label: 'Legendre polynomial P₃', values: { mode: 'poly', n: 3 } }, { label: 'Legendre polynomial P₅', values: { mode: 'poly', n: 5 } }],
    inputOf: (p) => (p.mode === 'poly' ? { n: p.n } : { a: p.la, b: p.lb, c2: p.c2, c1: p.c1, c0: p.c0, rhs: p.rhs }),
    solve(p) {
      if (p.mode !== 'poly') { if (!p.la) throw new ParseError('a must not be 0 in (ax + b).'); return transformSolve(p, 'legendre'); }
      const n = Math.round(p.n); const P = [[1], [0, 1]]; for (let k = 1; k < n; k++) { const next = Array(k + 2).fill(0); P[k].forEach((c, i) => { next[i + 1] += ((2 * k + 1) * c) / (k + 1); }); P[k - 1].forEach((c, i) => { next[i] -= (k * c) / (k + 1); }); P.push(next); }
      const coef = P[n]; const str = (cs) => cs.map((c, i) => ({ c, i })).filter((t) => Math.abs(t.c) > 1e-12).reverse().map((t, j) => coefStr(t.c, t.i ? 'x' + (t.i > 1 ? Num.sup(t.i) : '') : '1', j === 0)).join('') || '0';
      const Pn = (x) => coef.reduce((s, c, i) => s + c * Math.pow(x, i), 0); const h = 1e-4; const resid = [-0.7, 0.2, 0.6].map((x) => { const d1 = (Pn(x + h) - Pn(x - h)) / (2 * h), d2 = (Pn(x + h) - 2 * Pn(x) + Pn(x - h)) / (h * h); return (1 - x * x) * d2 - 2 * x * d1 + n * (n + 1) * Pn(x); });
      const orth = n > 0 ? Solve.simpson((x) => Pn(x) * coef.length && P[n - 1].reduce((s, c, i) => s + c * Math.pow(x, i), 0) * Pn(x), -1, 1, 200) : 0; const norm = Solve.simpson((x) => Pn(x) * Pn(x), -1, 1, 400);
      const steps = [
        { title: "Legendre's differential equation", text: `(1 − x²)y″ − 2xy′ + ${n * (n + 1)}y = 0`, lines: [`(1 − x²)y″ − 2xy′ + n(n + 1)y = 0 with n = ${n}`] },
        { title: 'Series / recurrence', text: 'Bonnet recurrence', lines: ['(k + 1)P_{k+1} = (2k + 1)x P_k − k P_{k−1},  P₀ = 1, P₁ = x', ...P.slice(0, n + 1).map((cs, k) => `P${Num.sub(k)}(x) = ${str(cs)}`)] },
        { title: `Polynomial solution Pₙ, n = ${n}`, text: str(coef), lines: [{ t: `P${Num.sub(n)}(x) = ${str(coef)}`, b: true, c: '#15803d' }, `Rodrigues: Pₙ = (1/(2ⁿ n!)) dⁿ/dxⁿ (x² − 1)ⁿ`] },
        { title: 'Check', text: 'Pₙ satisfies the equation', lines: [`Residual at x = −0.7, 0.2, 0.6: ${resid.map((v) => Num.dec(v, 6)).join(', ')} ≈ 0 ✓`, `P${Num.sub(n)}(1) = ${d4(Pn(1))},  ∫₋₁¹ Pₙ² dx = ${d4(norm)} = 2/(2n + 1) = ${d4(2 / (2 * n + 1))}`] },
      ];
      return { steps, mode: 'poly', P, n, Pn, formulas: [F("Legendre polynomial", 'Pₙ(x) from (k+1)P_{k+1} = (2k+1)xP_k − kP_{k−1}', `n = ${n}`, '', str(coef)), F('Orthogonality', '∫₋₁¹ Pₙ² dx = 2/(2n + 1)', '', d4(norm), d4(2 / (2 * n + 1)))], readouts: [{ label: `P${Num.sub(n)}(x)`, value: str(coef), tone: 'info' }, { label: 'Pₙ(1)', value: d4(Pn(1)) }], state: { equation: `(1 − x²)y″ − 2xy′ + ${n * (n + 1)}y = 0`, n, polynomial: str(coef) }, explain: { what: `For n = ${n} Legendre's equation has the polynomial solution P${Num.sub(n)}(x).`, why: 'When n is a whole number one of the power-series solutions terminates, giving a polynomial.', param: 'The degree n.', effect: 'Higher n gives more oscillations on [−1, 1]; all Pₙ(1) = 1 and different Pₙ are orthogonal.' } };
    },
    plot(g, box, sol, S) {
      if (sol.mode === 'poly') { const A = Plot.axes(g, box, [-1.1, 1.1], [-1.2, 1.2], { xl: 'x', yl: 'Pₙ' }); sol.P.forEach((cs, k) => { if (k > sol.n) return; Plot.curve(g, A, (x) => cs.reduce((s, c, i) => s + c * Math.pow(x, i), 0), { color: k === sol.n ? '#dc2626' : '#94a3b8', width: k === sol.n ? 3.5 : 1.5, range: [-1, 1] }); }); D.text(g, `P₀ … P${Num.sub(sol.n)} (red = P${Num.sub(sol.n)})`, box[0] + 12, box[1] + 16, { size: 14, weight: 700 }); return; }
      rootsPlot(g, [box[0], box[1], box[2] * 0.45, box[3] * 0.42], sol.r.roots); const xmin = (-sol.b / sol.a) + (sol.a > 0 ? 0.05 : -4), xmax = sol.a > 0 ? -sol.b / sol.a + 4 : -sol.b / sol.a - 0.05;
      curvePlot(g, [box[0], box[1] + box[3] * 0.46, box[2], box[3] * 0.54], sol.curve, { xr: [Math.min(xmin, xmax), Math.max(xmin, xmax)], clip: 1e4, title: `a member of the family (${sol.base} > 0)` });
    },
  });

  // ─────────────── Variable-coefficient hub ───────────────
  define('ma-ode-variable', {
    modes: [{ key: 'euler', label: 'Euler–Cauchy (x = eᶻ)' }, { key: 'legendre', label: 'Legendre linear ((ax+b) = eᶻ)' }, { key: 'reduction', label: 'Reduction of order (one solution known)' }],
    params: [
      ...EC_PARAMS('legendre').map((q) => ({ ...q, showIf: (p) => p.mode !== 'reduction' && (q.key === 'la' || q.key === 'lb' ? p.mode === 'legendre' : true) && (!q.showIf || q.showIf(p)) })),
      { key: 'Px', label: "P(x) in y″ + P(x)y′ + Q(x)y = 0", type: 'text', default: '-2/x', showIf: (p) => p.mode === 'reduction' },
      { key: 'Qx', label: 'Q(x) =', type: 'text', default: '2/x^2', showIf: (p) => p.mode === 'reduction' },
      { key: 'y1', label: 'Known solution y₁(x) =', type: 'text', default: 'x', showIf: (p) => p.mode === 'reduction' },
    ],
    examples: [{ label: 'x²y″ − 2xy′ + 2y = 0 with y₁ = x', values: { mode: 'reduction', Px: '-2/x', Qx: '2/x^2', y1: 'x' } }, { label: "y″ − (2/x)y′ … Euler form", values: { mode: 'euler', order3: false, c2: 1, c1: -2, c0: 2, rhs: 'x^3' } }, { label: 'Legendre: (x + 2)²y″ − (x + 2)y′ + y = 3x + 4', values: { mode: 'legendre', la: 1, lb: 2, c2: 1, c1: -1, c0: 1, rhs: '3*x + 4' } }, { label: "xy″ − (x+1)y′ + y = 0, y₁ = eˣ", values: { mode: 'reduction', Px: '-(x + 1)/x', Qx: '1/x', y1: 'exp(x)' } }],
    inputOf: (p) => ({ mode: p.mode }),
    solve(p) {
      if (p.mode === 'euler') return transformSolve(p, 'euler');
      if (p.mode === 'legendre') { if (!p.la) throw new ParseError('a must not be 0.'); return transformSolve(p, 'legendre'); }
      const P = Expr.fn(p.Px, ['x']), Q = Expr.fn(p.Qx, ['x']), y1 = Expr.fn(p.y1, ['x']); const y1d = y1.d('x'), y1dd = y1d.d('x');
      const res = [0.7, 1.3, 2.1].map((x) => y1dd(x) + P(x) * y1d(x) + Q(x) * y1(x)); if (res.some((v) => !Number.isFinite(v) || Math.abs(v) > 1e-6)) throw new ParseError(`y₁ = ${y1.str} does not satisfy the equation (residual ${res.map((v) => Num.dec(v, 4)).join(', ')}).`);
      const x0 = 1; const expP = (x) => Math.exp(-Solve.simpson(P, x0, x, 60)); const vprime = (x) => expP(x) / (y1(x) * y1(x)); const v = (x) => Solve.simpson(vprime, x0, x, 80);
      const grid = gridFn((x) => y1(x) * v(x), 0.6, 3.6, 120); const y2 = grid;
      const steps = [
        { title: 'Equation in normal form', text: `y″ + (${P.str})y′ + (${Q.str})y = 0`, lines: [`y″ + P(x)y′ + Q(x)y = 0,  P = ${P.str},  Q = ${Q.str}`] },
        { title: 'Check the known solution', text: `y₁ = ${y1.str}`, lines: [`y₁ = ${y1.str},  y₁′ = ${y1d.str},  y₁″ = ${y1dd.str}`, `y₁″ + Py₁′ + Qy₁ = 0 ✓ (checked at x = 0.7, 1.3, 2.1)`] },
        { title: 'Assume y₂ = v(x)·y₁', text: 'Substituting gives a first-order equation for v′', lines: ['y₁v″ + (2y₁′ + Py₁)v′ = 0', '⇒ v′ = e^{−∫P dx} / y₁²'] },
        { title: 'Compute v′ and v', text: 'v′ = e^{−∫P dx}/y₁²', lines: [`e^{−∫P dx} evaluated from x₀ = 1;  v′(x) = e^{−∫P}/(${y1.str})²`, `v(2) = ${d4(v(2))},  v(3) = ${d4(v(3))} (numerical integration)`] },
        { title: 'Second solution and general solution', text: 'y = c₁y₁ + c₂y₂', lines: [`y₂(x) = y₁(x)·v(x)  (e.g. y₂(2) = ${d4(y2(2))})`, { t: `y = c₁(${y1.str}) + c₂·y₂(x)`, b: true, c: '#15803d' }, `Wronskian W(y₁, y₂) = y₁²v′ = e^{−∫P} ≠ 0 → independent`] },
      ];
      return { steps, mode: 'reduction', y1, y2, formulas: [F('Reduction of order', 'y₂ = y₁ ∫ e^{−∫P dx}/y₁² dx', `P = ${P.str}, y₁ = ${y1.str}`, '', 'computed numerically')], readouts: [{ label: 'y₂(2)', value: d4(y2(2)), tone: 'info' }], state: { equation: `y'' + (${P.str})y' + (${Q.str})y = 0`, knownSolution: y1.str, method: 'reduction of order', y2At2: d4(y2(2)) }, explain: { what: 'A second independent solution is built from the known one.', why: 'Writing y₂ = v y₁ removes the v term (because y₁ is a solution) and leaves a first-order equation for v′.', param: 'P, Q and the known solution.', effect: 'The general solution is c₁y₁ + c₂y₂.' } };
    },
    plot(g, box, sol, S) {
      if (sol.mode === 'reduction') { curvePlot(g, box, sol.y2, { xr: [1, 3.5], extra: [{ fn: sol.y1, color: '#2563eb' }], title: 'y₁ (blue) and the constructed y₂ (red)' }); return; }
      rootsPlot(g, [box[0], box[1], box[2] * 0.45, box[3] * 0.42], sol.r.roots); const x0 = sol.kind === 'legendre' ? -sol.b / sol.a : 0; const xr = sol.kind === 'legendre' && sol.a < 0 ? [x0 - 4, x0 - 0.05] : [x0 + 0.05, x0 + 4];
      curvePlot(g, [box[0], box[1] + box[3] * 0.46, box[2], box[3] * 0.54], sol.curve, { xr, clip: 1e4, title: 'a member of the solution family' });
    },
  });

  // ─────────────── Variation of parameters ───────────────
  define('ma-variation-params', {
    params: [{ key: 'b', label: "y'' + b·y' + c·y = f(x):  b =", type: 'range', min: -4, max: 4, step: 1, default: 0 }, { key: 'c', label: 'c =', type: 'range', min: -4, max: 9, step: 1, default: 1 }, { key: 'fx', label: 'f(x) =', type: 'text', default: 'sec(x)' }, { key: 'x0', label: 'x₀ (start of integration / IC)', type: 'range', min: -1, max: 1, step: 0.25, default: 0 }, { key: 'y0', label: 'y(x₀)', type: 'range', min: -3, max: 3, step: 0.25, default: 0 }, { key: 'y1', label: "y'(x₀)", type: 'range', min: -3, max: 3, step: 0.25, default: 0 }],
    examples: [{ label: 'y″ + y = sec x', values: { b: 0, c: 1, fx: 'sec(x)' } }, { label: 'y″ + y = tan x', values: { b: 0, c: 1, fx: 'tan(x)' } }, { label: 'y″ − 2y′ + y = eˣ/x', values: { b: -2, c: 1, fx: 'exp(x)/x', x0: 1 } }, { label: 'y″ + 4y = cosec 2x', values: { b: 0, c: 4, fx: 'csc(2x)', x0: 0.5 } }],
    inputOf: (p) => ({ equation: `y'' + ${p.b}y' + ${p.c}y = ${p.fx}` }),
    solve(p) {
      const roots = Poly.roots([1, p.b, p.c]); const basis = Ode.basis(roots, 'x'); if (basis.length !== 2) throw new ParseError('Could not form two complementary solutions.');
      const [Y1, Y2] = basis.map((q) => q.fn); const fx = Expr.fn(p.fx, ['x']);
      const Wast = Expr.simp(Expr.simp({ op: '-', a: { op: '*', a: Y1.ast, b: Y2.d('x').ast }, b: { op: '*', a: Y1.d('x').ast, b: Y2.ast } })); let W = Expr.fromAst(Wast, ['x']); { const ws = [0.3, 0.9, 1.7].map((x) => W(x)); if (ws.every((w) => Math.abs(w - ws[0]) < 1e-9)) { W = Expr.fn(Num.fmt(ws[0], { pi: false, surd: false }).replace('−', '-'), ['x']); } else if ([0.3, 0.9, 1.7].every((x) => Math.abs(W(x) / Math.exp(-p.b * x) - ws[0] / Math.exp(-p.b * 0.3)) < 1e-9)) { const k = ws[0] / Math.exp(-p.b * 0.3); W = Expr.fn(`${k}*exp(${-p.b}*x)`, ['x']); } }
      if (Math.abs(W(p.x0)) < 1e-12) throw new ParseError('The Wronskian vanishes — y₁, y₂ are not independent.');
      const u1p = (x) => (-Y2(x) * fx(x)) / W(x), u2p = (x) => (Y1(x) * fx(x)) / W(x);
      if (!Number.isFinite(u1p(p.x0)) || !Number.isFinite(u2p(p.x0))) throw new ParseError(`f(x) is not defined at x₀ = ${p.x0}; choose another x₀.`);
      const u1 = (x) => Solve.simpson(u1p, p.x0, x, 120), u2 = (x) => Solve.simpson(u2p, p.x0, x, 120); const yp = (x) => u1(x) * Y1(x) + u2(x) * Y2(x);
      // constants from the ICs (yp(x0) = yp'(x0) = 0 by construction)
      const M2 = [[Y1(p.x0), Y2(p.x0)], [Y1.d('x')(p.x0), Y2.d('x')(p.x0)]]; const cs = Mat.mv(Mat.inv(M2), [p.y0, p.y1]);
      const yExact = (x) => cs[0] * Y1(x) + cs[1] * Y2(x) + yp(x);
      const span = p.fx.includes('sec') || p.fx.includes('tan') || p.fx.includes('csc') ? 1.4 : 3; const rkY = Solve.rk4((t, Yv) => [Yv[1], fx(t) - p.b * Yv[1] - p.c * Yv[0]], p.x0, [p.y0, p.y1], p.x0 + span, 600); const rkP = Solve.rk4((t, Yv) => [Yv[1], fx(t) - p.b * Yv[1] - p.c * Yv[0]], p.x0, [0, 0], p.x0 + span, 600);
      const interp = (pts) => (x) => { const t = ((x - p.x0) / span) * 600; if (t < 0 || t > 600) return NaN; const i = Math.min(599, Math.floor(t)); return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * (t - i); };
      const y = interp(rkY); const ypPlot = interp(rkP);
      // cross-check with RK4
      const rk = Solve.rk4((t, Yv) => [Yv[1], fx(t) - p.b * Yv[1] - p.c * Yv[0]], p.x0, [p.y0, p.y1], p.x0 + 1, 400); const chk = rk[rk.length - 1][1]; const yv = yExact(p.x0 + 1);
      const steps = [
        { title: 'The equation', text: `${Ode.lhsStr([1, p.b, p.c])} = ${fx.str}`, lines: [`y″ + (${p.b})y′ + (${p.c})y = ${fx.str}`, 'f(x) is not of exponential/polynomial/trig form → use variation of parameters.'] },
        { title: 'Complementary solutions', text: `y₁ = ${basis[0].pretty}, y₂ = ${basis[1].pretty}`, lines: [`Auxiliary: m² + (${p.b})m + (${p.c}) = 0 → m = ${roots.map(Num.cfmt).join(', ')}`, { t: `y₁ = ${basis[0].pretty},   y₂ = ${basis[1].pretty}`, b: true }] },
        { title: 'Wronskian', text: `W = ${W.str}`, lines: ['W = y₁y₂′ − y₁′y₂', { t: `W = ${W.str}`, b: true }] },
        { title: 'Parameters u₁′ and u₂′', text: 'u₁′ = −y₂f/W, u₂′ = y₁f/W', lines: [`u₁′ = −(${basis[1].pretty})(${fx.str}) / (${W.str})`, `u₂′ = (${basis[0].pretty})(${fx.str}) / (${W.str})`] },
        { title: 'Integrate', text: 'u₁ = ∫u₁′ dx, u₂ = ∫u₂′ dx', lines: [`Integrated from x₀ = ${f(p.x0)} (numerically):`, `u₁(${f(p.x0 + 1)}) = ${d4(u1(p.x0 + 1))},   u₂(${f(p.x0 + 1)}) = ${d4(u2(p.x0 + 1))}`] },
        { title: 'Particular solution', text: 'y_p = u₁y₁ + u₂y₂', lines: [{ t: 'y_p = u₁y₁ + u₂y₂', b: true }, `y_p(${f(p.x0 + 1)}) = ${d4(yp(p.x0 + 1))}`] },
        { title: 'Final solution', text: 'y = c₁y₁ + c₂y₂ + y_p', lines: [`With y(${f(p.x0)}) = ${f(p.y0)}, y′(${f(p.x0)}) = ${f(p.y1)}: c₁ = ${d4(cs[0])}, c₂ = ${d4(cs[1])}`, { t: `y(${f(p.x0 + 1)}) = ${d4(yv)}   (Runge–Kutta check: ${d4(chk)})`, b: true, c: '#15803d' }] },
      ];
      return { steps, y, yp: ypPlot, span, Y1, Y2, p, formulas: [F('Variation of parameters', 'y_p = −y₁∫(y₂f/W)dx + y₂∫(y₁f/W)dx', `y₁ = ${basis[0].pretty}, y₂ = ${basis[1].pretty}`, `W = ${W.str}`, `y(${f(p.x0 + 1)}) = ${d4(yv)}`)], readouts: [{ label: 'W', value: W.str, tone: 'info' }, { label: `y(${f(p.x0 + 1)})`, value: d4(yv), tone: 'good' }, { label: 'RK4 check', value: d4(chk) }], state: { equation: `${Ode.lhsStr([1, p.b, p.c])} = ${fx.str}`, y1: basis[0].pretty, y2: basis[1].pretty, wronskian: W.str, u1prime: `−y2 f / W`, u2prime: `y1 f / W`, value: d4(yv) }, explain: { what: 'The constants of the complementary function are replaced by functions u₁(x), u₂(x) chosen so that the equation is satisfied.', why: 'Imposing u₁′y₁ + u₂′y₂ = 0 leaves a 2×2 linear system whose determinant is the Wronskian, giving u₁′ and u₂′ directly.', param: 'b, c, f(x) and the initial conditions.', effect: 'This works for any continuous f(x), e.g. sec x or tan x, where undetermined coefficients fails.' } };
    },
    plot(g, box, sol, S) { const x0 = sol.p.x0; curvePlot(g, box, sol.y, { xr: [x0, x0 + sol.span], extra: [{ fn: sol.yp, color: '#7c3aed', dash: [6, 4] }], ic: [x0, sol.p.y0], title: 'y (red) and the particular part y_p (purple dashed)' }); },
  });
})();
