'use strict';

/*
 * Engineering Mathematics kernel (U25MA102) — reusable engines shared by every MA simulation.
 *   • Expr   : parser → AST, evaluation, symbolic differentiation, simplification, pretty printing
 *   • Poly   : polynomial roots (Durand–Kerner, complex), formatting
 *   • Mat    : determinant, characteristic polynomial (Faddeev–LeVerrier), eigen-pairs, null space, products
 *   • Solve  : Newton systems (critical points, Lagrange), numeric integration (Simpson, nested with variable limits)
 *   • Num    : number/fraction formatting
 *   • Plot   : 2-D axes, curves, contours (marching squares), vector fields, 3-D surfaces and curves
 *   • Work   : the "working" panel that prints the step-by-step mathematics
 */
(function () {
  const D = window.EPDraw;

  // ───────────────────────── Numbers ─────────────────────────
  const EPS = 1e-9;
  const Num = {
    /** Rational approximation p/q (q ≤ maxDen) when |x − p/q| < tol. */
    frac(x, maxDen = 64, tol = 1e-9) {
      if (!Number.isFinite(x)) return null;
      let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x;
      for (let i = 0; i < 24; i++) {
        const a = Math.floor(b); const h2 = a * h1 + h0, k2 = a * k1 + k0;
        if (k2 > maxDen) break;
        h0 = h1; h1 = h2; k0 = k1; k1 = k2;
        if (Math.abs(x - h1 / k1) < tol * Math.max(1, Math.abs(x))) return [h1, k1];
        if (Math.abs(b - a) < 1e-15) break; b = 1 / (b - a);
      }
      return null;
    },
    /** Clean display: integers, simple fractions, √ of small integers, else 4 significant decimals. */
    fmt(x, o = {}) {
      if (x == null || Number.isNaN(x)) return '—';
      if (!Number.isFinite(x)) return x > 0 ? '∞' : '−∞';
      if (Math.abs(x) < 1e-10) return '0';
      const r = Math.round(x);
      if (Math.abs(x - r) < 1e-9) return (r < 0 ? '−' : '') + Math.abs(r);
      if (o.frac !== false) { const f = Num.frac(x, o.maxDen || 2000); if (f) return (f[0] < 0 ? '−' : '') + `${Math.abs(f[0])}/${f[1]}`; }
      if (o.pi !== false) { const q = x / Math.PI; const fq = Num.frac(q, 24, 1e-10); if (fq && Math.abs(q) > 1e-6) { const [a, b] = fq; const num = Math.abs(a) === 1 ? 'π' : `${Math.abs(a)}π`; return (a < 0 ? '−' : '') + (b === 1 ? num : `${num}/${b}`); } }
      if (o.surd !== false) { for (let k = 2; k <= 50; k++) { const s = Math.sqrt(k); if (Math.abs(s - Math.round(s)) < 1e-12) continue; const m = x / s; const f = Num.frac(m, 12); if (f && Math.abs(m - f[0] / f[1]) < 1e-10) { const c = f[1] === 1 ? (Math.abs(f[0]) === 1 ? '' : String(Math.abs(f[0]))) : `${Math.abs(f[0])}/${f[1]}·`; return (x < 0 ? '−' : '') + (f[1] === 1 ? `${c}√${k}` : `(${Math.abs(f[0])}√${k})/${f[1]}`); } } }
      const d = o.digits || 4; const a = Math.abs(x);
      const s = a >= 1e5 || a < 1e-3 ? x.toExponential(d - 1) : String(Number(x.toPrecision(d)));
      return s.replace('-', '−');
    },
    dec(x, d = 4) { if (!Number.isFinite(x)) return Num.fmt(x); return String(Number(x.toFixed(d))).replace('-', '−'); },
    cfmt(z) { // complex {re, im}
      const re = Math.abs(z.re) < 1e-9 ? 0 : z.re, im = Math.abs(z.im) < 1e-9 ? 0 : z.im;
      if (!im) return Num.fmt(re);
      const is = Num.fmt(Math.abs(im)); const imS = is === '1' ? 'i' : `${is}i`;
      return re ? `${Num.fmt(re)} ${im < 0 ? '−' : '+'} ${imS}` : (im < 0 ? '−' : '') + imS;
    },
    sup(n) { const m = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }; return String(n).split('').map((c) => m[c] || c).join(''); },
    sub(n) { const m = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' }; return String(n).split('').map((c) => m[c] || c).join(''); },
    close: (a, b, t = 1e-6) => Math.abs(a - b) <= t * Math.max(1, Math.abs(a), Math.abs(b)),
  };

  // ───────────────────────── Expressions ─────────────────────────
  const FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, ln: Math.log, log: Math.log, sqrt: Math.sqrt, abs: Math.abs,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x), cosec: (x) => 1 / Math.sin(x), cot: (x) => 1 / Math.tan(x),
  };
  const CONSTS = { pi: Math.PI, e: Math.E };
  class ParseError extends Error {}
  function tokenize(src, vars) {
    const s = String(src).replace(/\s+/g, '').replace(/\*\*/g, '^').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/²/g, '^2').replace(/³/g, '^3');
    const out = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/[0-9.]/.test(c)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; if (s[j] === 'e' && /[0-9+-]/.test(s[j + 1] || '') && !/[a-z]/i.test(s[j + 1])) { j++; if (/[+-]/.test(s[j])) j++; while (j < s.length && /[0-9]/.test(s[j])) j++; } const v = Number(s.slice(i, j)); if (!Number.isFinite(v)) throw new ParseError(`Bad number "${s.slice(i, j)}"`); out.push({ t: 'num', v }); i = j; continue; }
      if (/[a-z_]/i.test(c)) {
        let j = i; while (j < s.length && /[a-z_0-9]/i.test(s[j])) j++;
        const word = s.slice(i, j).toLowerCase();
        if (FUNCS[word] || CONSTS[word] != null || vars.includes(word)) out.push({ t: FUNCS[word] ? 'fn' : 'id', v: word });
        else {
          // split into known pieces: e.g. "xy" → x·y, "2xsinx" handled by the loop, "xe" → x·e
          let k = 0; const w = word; let ok = true;
          while (k < w.length) {
            const fn = Object.keys(FUNCS).sort((a, b) => b.length - a.length).find((f) => w.startsWith(f, k));
            if (fn) { out.push({ t: 'fn', v: fn }); k += fn.length; continue; }
            const cn = ['pi'].find((f) => w.startsWith(f, k));
            if (cn) { out.push({ t: 'id', v: cn }); k += cn.length; continue; }
            if (vars.includes(w[k]) || w[k] === 'e') { out.push({ t: 'id', v: w[k] }); k++; continue; }
            ok = false; break;
          }
          if (!ok) throw new ParseError(`Unknown name "${word}" — use ${vars.join(', ')}, numbers and sin, cos, tan, exp, ln, sqrt`);
        }
        i = j; continue;
      }
      if ('+-*/^(),'.includes(c)) { out.push({ t: c }); i++; continue; }
      if (c === '[' || c === '{') { out.push({ t: '(' }); i++; continue; }
      if (c === ']' || c === '}') { out.push({ t: ')' }); i++; continue; }
      throw new ParseError(`Unexpected character "${c}"`);
    }
    // implicit multiplication: 2x, x(…), )(, )x, 2sin, x sin
    const res = [];
    for (let k = 0; k < out.length; k++) {
      const a = res[res.length - 1], b = out[k];
      if (a && (a.t === 'num' || a.t === 'id' || a.t === ')') && (b.t === 'num' || b.t === 'id' || b.t === 'fn' || b.t === '(')) res.push({ t: '*' });
      res.push(b);
    }
    return res;
  }
  /** Parses an expression in the given variables → AST {op, …}. */
  function parse(src, vars = ['x', 'y']) {
    if (src == null || !String(src).trim()) throw new ParseError('Enter an expression.');
    const tk = tokenize(src, vars); let i = 0;
    const peek = () => tk[i]; const eat = (t) => { if (!tk[i] || tk[i].t !== t) throw new ParseError(`Expected "${t}"`); i++; };
    function expr() { let n = term(); while (peek() && (peek().t === '+' || peek().t === '-')) { const o = tk[i++].t; n = { op: o, a: n, b: term() }; } return n; }
    function term() { let n = unary(); while (peek() && (peek().t === '*' || peek().t === '/')) { const o = tk[i++].t; n = { op: o, a: n, b: unary() }; } return n; }
    function unary() { if (peek() && peek().t === '-') { i++; return { op: 'neg', a: unary() }; } if (peek() && peek().t === '+') { i++; return unary(); } return power(); }
    function power() { const b = atom(); if (peek() && peek().t === '^') { i++; return { op: '^', a: b, b: unary() }; } return b; }
    function atom() {
      const t = peek(); if (!t) throw new ParseError('Expression ends too early.');
      if (t.t === 'num') { i++; return { op: 'num', v: t.v }; }
      if (t.t === 'id') { i++; return CONSTS[t.v] != null && !vars.includes(t.v) ? { op: 'const', name: t.v, v: CONSTS[t.v] } : { op: 'var', name: t.v }; }
      if (t.t === 'fn') { i++; if (peek() && peek().t === '(') { eat('('); const a = expr(); eat(')'); return { op: 'fn', name: t.v, a }; } return { op: 'fn', name: t.v, a: power() }; }
      if (t.t === '(') { i++; const a = expr(); eat(')'); return a; }
      throw new ParseError(`Unexpected "${t.t}"`);
    }
    const ast = expr(); if (i < tk.length) throw new ParseError(`Unexpected "${tk[i].t === 'num' ? tk[i].v : tk[i].v || tk[i].t}"`);
    return ast;
  }
  function evaluate(n, env) {
    switch (n.op) {
      case 'num': return n.v; case 'const': return n.v;
      case 'var': { const v = env[n.name]; if (v == null) throw new ParseError(`No value for ${n.name}`); return v; }
      case 'neg': return -evaluate(n.a, env);
      case '+': return evaluate(n.a, env) + evaluate(n.b, env);
      case '-': return evaluate(n.a, env) - evaluate(n.b, env);
      case '*': return evaluate(n.a, env) * evaluate(n.b, env);
      case '/': return evaluate(n.a, env) / evaluate(n.b, env);
      case '^': { const a = evaluate(n.a, env), b = evaluate(n.b, env); if (a < 0 && Number.isInteger(b)) return Math.pow(a, b); if (a < 0) { const f = Num.frac(b, 9); if (f && f[1] % 2 === 1) return (f[0] % 2 ? -1 : 1) * Math.pow(-a, b); } return Math.pow(a, b); }
      case 'fn': return FUNCS[n.name](evaluate(n.a, env));
      default: throw new ParseError('Bad expression');
    }
  }
  const N = (v) => ({ op: 'num', v });
  const isNum = (n, v) => n.op === 'num' && (v == null || Math.abs(n.v - v) < 1e-15);
  function simp(n) {
    if (!n || n.op === 'num' || n.op === 'var' || n.op === 'const') return n;
    if (n.op === 'neg') { const a = simp(n.a); if (a.op === 'num') return N(-a.v); if (a.op === 'neg') return a.a; return { op: 'neg', a }; }
    if (n.op === 'fn') { const a0 = simp(n.a); if ((n.name === 'ln' || n.name === 'log') && a0.op === 'fn' && a0.name === 'exp') return a0.a; if ((n.name === 'ln' || n.name === 'log') && a0.op === '^' && a0.a.op === 'const' && a0.a.name === 'e') return a0.b; if (n.name === 'exp' && a0.op === 'fn' && (a0.name === 'ln' || a0.name === 'log')) return a0.a; }
    if (n.op === 'fn') { const a = simp(n.a); if (a.op === 'num') { const v = FUNCS[n.name](a.v); if (Number.isInteger(v)) return N(v); } return { op: 'fn', name: n.name, a }; }
    const a = simp(n.a), b = simp(n.b);
    if (a.op === 'num' && b.op === 'num') { const v = evaluate({ op: n.op, a, b }, {}); if (Number.isFinite(v) && (Number.isInteger(v) || n.op !== '/')) return N(v); }
    switch (n.op) {
      case '+': if (isNum(a, 0)) return b; if (isNum(b, 0)) return a; if (b.op === 'neg') return simp({ op: '-', a, b: b.a }); if (b.op === 'num' && b.v < 0) return { op: '-', a, b: N(-b.v) }; break;
      case '-': if (isNum(b, 0)) return a; if (isNum(a, 0)) return simp({ op: 'neg', a: b }); if (b.op === 'neg') return simp({ op: '+', a, b: b.a }); if (same(a, b)) return N(0); break;
      case '*':
        if (isNum(a, 0) || isNum(b, 0)) return N(0); if (isNum(a, 1)) return b; if (isNum(b, 1)) return a;
        if (isNum(a, -1)) return simp({ op: 'neg', a: b }); if (isNum(b, -1)) return simp({ op: 'neg', a });
        if (b.op === 'num' && a.op !== 'num') return simp({ op: '*', a: b, b: a });
        if (a.op === 'num' && b.op === '*' && b.a.op === 'num') return simp({ op: '*', a: N(a.v * b.a.v), b: b.b });
        if (b.op === '*' && b.a.op === 'num') return simp({ op: '*', a: b.a, b: { op: '*', a, b: b.b } });
        if (a.op === '*' && a.a.op === 'num' && b.op !== 'num') return simp({ op: '*', a: a.a, b: { op: '*', a: a.b, b } });
        if (a.op === 'neg') return simp({ op: 'neg', a: { op: '*', a: a.a, b } });
        if (b.op === 'neg') return simp({ op: 'neg', a: { op: '*', a, b: b.a } });
        if (same(a, b)) return { op: '^', a, b: N(2) };
        break;
      case '/': if (isNum(a, 0)) return N(0); if (isNum(b, 1)) return a; if (same(a, b)) return N(1); break;
      case '^': if (isNum(b, 0)) return N(1); if (isNum(b, 1)) return a; if (isNum(a, 0)) return N(0); if (isNum(a, 1)) return N(1); break;
      default:
    }
    return { op: n.op, a, b };
  }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function deriv(n, x) {
    const d = (m) => deriv(m, x);
    switch (n.op) {
      case 'num': case 'const': return N(0);
      case 'var': return N(n.name === x ? 1 : 0);
      case 'neg': return { op: 'neg', a: d(n.a) };
      case '+': case '-': return { op: n.op, a: d(n.a), b: d(n.b) };
      case '*': return { op: '+', a: { op: '*', a: d(n.a), b: n.b }, b: { op: '*', a: n.a, b: d(n.b) } };
      case '/': return { op: '/', a: { op: '-', a: { op: '*', a: d(n.a), b: n.b }, b: { op: '*', a: n.a, b: d(n.b) } }, b: { op: '^', a: n.b, b: N(2) } };
      case '^': {
        const bConst = !has(n.b, x); const aConst = !has(n.a, x);
        if (bConst) return { op: '*', a: { op: '*', a: n.b, b: { op: '^', a: n.a, b: { op: '-', a: n.b, b: N(1) } } }, b: d(n.a) };
        if (aConst) return { op: '*', a: { op: '*', a: n, b: { op: 'fn', name: 'ln', a: n.a } }, b: d(n.b) };
        return { op: '*', a: n, b: { op: '+', a: { op: '*', a: d(n.b), b: { op: 'fn', name: 'ln', a: n.a } }, b: { op: '/', a: { op: '*', a: n.b, b: d(n.a) }, b: n.a } } };
      }
      case 'fn': {
        const u = n.a, du = d(u); let g;
        switch (n.name) {
          case 'sin': g = { op: 'fn', name: 'cos', a: u }; break;
          case 'cos': g = { op: 'neg', a: { op: 'fn', name: 'sin', a: u } }; break;
          case 'tan': g = { op: '^', a: { op: 'fn', name: 'cos', a: u }, b: N(-2) }; break;
          case 'exp': g = { op: 'fn', name: 'exp', a: u }; break;
          case 'ln': case 'log': g = { op: '/', a: N(1), b: u }; break;
          case 'sqrt': g = { op: '/', a: N(1), b: { op: '*', a: N(2), b: { op: 'fn', name: 'sqrt', a: u } } }; break;
          case 'sinh': g = { op: 'fn', name: 'cosh', a: u }; break;
          case 'cosh': g = { op: 'fn', name: 'sinh', a: u }; break;
          case 'tanh': g = { op: '^', a: { op: 'fn', name: 'cosh', a: u }, b: N(-2) }; break;
          case 'asin': g = { op: '/', a: N(1), b: { op: 'fn', name: 'sqrt', a: { op: '-', a: N(1), b: { op: '^', a: u, b: N(2) } } } }; break;
          case 'acos': g = { op: 'neg', a: { op: '/', a: N(1), b: { op: 'fn', name: 'sqrt', a: { op: '-', a: N(1), b: { op: '^', a: u, b: N(2) } } } } }; break;
          case 'atan': g = { op: '/', a: N(1), b: { op: '+', a: N(1), b: { op: '^', a: u, b: N(2) } } }; break;
          case 'abs': g = { op: '/', a: u, b: { op: 'fn', name: 'abs', a: u } }; break;
          case 'sec': g = { op: '*', a: { op: 'fn', name: 'sec', a: u }, b: { op: 'fn', name: 'tan', a: u } }; break;
          case 'csc': case 'cosec': g = { op: 'neg', a: { op: '*', a: { op: 'fn', name: 'csc', a: u }, b: { op: 'fn', name: 'cot', a: u } } }; break;
          case 'cot': g = { op: 'neg', a: { op: '^', a: { op: 'fn', name: 'csc', a: u }, b: N(2) } }; break;
          default: throw new ParseError(`Cannot differentiate ${n.name}`);
        }
        return { op: '*', a: g, b: du };
      }
      default: throw new ParseError('Bad expression');
    }
  }
  function has(n, x) { if (!n) return false; if (n.op === 'var') return n.name === x; return has(n.a, x) || has(n.b, x); }
  const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3, '^': 4 };
  function str(n, parentPrec = 0, rightSide = false) {
    let s, p;
    switch (n.op) {
      case 'num': { s = Num.fmt(n.v, { surd: false }); p = n.v < 0 ? 3 : (s.includes('/') ? 2 : 9); break; }
      case 'const': s = n.name === 'pi' ? 'π' : n.name; p = 9; break;
      case 'var': s = n.name; p = 9; break;
      case 'neg': s = '−' + str(n.a, 3); p = 3; break;
      case 'fn': s = `${n.name}(${str(n.a)})`; p = 9; break;
      case '^': {
        const base = str(n.a, 5);
        if (n.b.op === 'num' && Number.isInteger(n.b.v) && n.b.v >= 0 && n.b.v < 100) s = base + Num.sup(n.b.v);
        else s = `${base}^${str(n.b, 5)}`;
        p = 4; break;
      }
      case '*': {
        const A = str(n.a, 2), B = str(n.b, 2, true);
        const implicit = /^[0-9a-zπ⁰¹²³⁴⁵⁶⁷⁸⁹]+$/i.test(A) && /^[a-zπ(]/i.test(B) && !(/[a-zπ⁰¹²³⁴⁵⁶⁷⁸⁹]$/i.test(A) && /^[a-z]{2,}\(/i.test(B));
        s = implicit ? A + B : `${A}·${B}`; p = 2; break;
      }
      default: s = `${str(n.a, PREC[n.op])} ${n.op === '-' ? '−' : n.op} ${str(n.b, PREC[n.op] + (n.op === '-' || n.op === '/' ? 0.5 : 0), true)}`; p = PREC[n.op];
    }
    return p < parentPrec || (rightSide && p === parentPrec && (n.op === '-' || n.op === '+') && parentPrec > 1) ? `(${s})` : s;
  }
  /** Compiled expression helper. */
  function fn(src, vars = ['x', 'y']) {
    const ast = simp(parse(src, vars));
    const f = (...args) => { const env = {}; vars.forEach((v, i) => { env[v] = args[i]; }); return evaluate(ast, env); };
    f.ast = ast; f.vars = vars; f.str = str(ast); f.src = src;
    f.d = (v) => { const a = simp(simp(deriv(ast, v))); const g = (...args) => { const env = {}; vars.forEach((w, i) => { env[w] = args[i]; }); return evaluate(a, env); }; g.ast = a; g.str = str(a); g.vars = vars; g.d = (w) => fromAst(simp(simp(deriv(a, w))), vars); return g; };
    return f;
  }
  function fromAst(a, vars) { const g = (...args) => { const env = {}; vars.forEach((w, i) => { env[w] = args[i]; }); return evaluate(a, env); }; g.ast = a; g.str = str(a); g.vars = vars; g.d = (w) => fromAst(simp(simp(deriv(a, w))), vars); return g; }
  /** Substitutes numbers for variables and prints the arithmetic, e.g. "2(1) + 3(2)". */
  function subStr(n, env) {
    const sub = (m) => (m.op === 'var' && env[m.name] != null ? { op: 'num', v: env[m.name], sub: true } : m.a ? { ...m, a: sub(m.a), b: m.b ? sub(m.b) : undefined } : m);
    const s = sub(n);
    const pr = (m, pp = 0, rs = false) => {
      if (m.op === 'num' && m.sub) { const t = Num.fmt(m.v, { surd: false }); return `(${t})`; }
      if (m.op === 'num' || m.op === 'var' || m.op === 'const') return str(m);
      if (m.op === 'neg') return '−' + pr(m.a, 3);
      if (m.op === 'fn') return `${m.name}(${pr(m.a)})`;
      if (m.op === '^') return pr(m.a, 5) + (m.b.op === 'num' && Number.isInteger(m.b.v) && m.b.v >= 0 ? Num.sup(m.b.v) : `^${pr(m.b, 5)}`);
      if (m.op === '*') return `${pr(m.a, 2)}${pr(m.b, 2, true).startsWith('(') ? '' : '·'}${pr(m.b, 2, true)}`;
      const p = PREC[m.op]; const t = `${pr(m.a, p)} ${m.op === '-' ? '−' : m.op} ${pr(m.b, p + 0.5, true)}`; return p < pp ? `(${t})` : t;
    };
    return pr(s);
  }
  /** Replaces variables by ASTs: subst(ast, {x: astX, …}). */
  function subst(n, map) { if (!n) return n; if (n.op === 'var' && map[n.name]) return map[n.name]; return n.a ? { ...n, a: subst(n.a, map), b: n.b ? subst(n.b, map) : undefined } : n; }
  const Expr = { parse, evaluate, deriv, simp, str, fn, fromAst, subStr, ParseError, has, subst };

  // ───────────────────────── Polynomials ─────────────────────────
  const C = { add: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }), sub: (a, b) => ({ re: a.re - b.re, im: a.im - b.im }), mul: (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }), div: (a, b) => { const d = b.re * b.re + b.im * b.im || 1e-300; return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }; }, abs: (a) => Math.hypot(a.re, a.im) };
  const Poly = {
    /** coefs highest degree first. Returns complex roots {re, im}, cleaned (real where |im| tiny), sorted. */
    roots(coefs) {
      let c = coefs.slice(); while (c.length > 1 && Math.abs(c[0]) < 1e-14) c.shift();
      const n = c.length - 1; if (n < 1) return [];
      if (n === 1) return [{ re: -c[1] / c[0], im: 0 }];
      if (n === 2) { const [a, b, cc] = c; const disc = b * b - 4 * a * cc; if (disc >= -1e-12) { const s = Math.sqrt(Math.max(0, disc)); return [{ re: (-b + s) / (2 * a), im: 0 }, { re: (-b - s) / (2 * a), im: 0 }].sort((p, q) => q.re - p.re); } const s = Math.sqrt(-disc); return [{ re: -b / (2 * a), im: s / (2 * a) }, { re: -b / (2 * a), im: -s / (2 * a) }]; }
      const a0 = c[0]; c = c.map((v) => v / a0);
      let z = Array.from({ length: n }, (_, k) => { const r = 1 + Math.max(...c.slice(1).map(Math.abs)); return { re: r * 0.4 * Math.cos(2 * Math.PI * k / n + 0.4), im: r * 0.4 * Math.sin(2 * Math.PI * k / n + 0.4) }; });
      const ev = (x) => c.reduce((acc, co) => C.add(C.mul(acc, x), { re: co, im: 0 }), { re: 0, im: 0 });
      for (let it = 0; it < 500; it++) {
        let moved = 0;
        z = z.map((zi, i) => { let den = { re: 1, im: 0 }; z.forEach((zj, j) => { if (i !== j) den = C.mul(den, C.sub(zi, zj)); }); const dz = C.div(ev(zi), den); moved = Math.max(moved, C.abs(dz)); return C.sub(zi, dz); });
        if (moved < 1e-14) break;
      }
      // polish with Newton, clean
      const dc = c.slice(0, -1).map((v, k) => v * (n - k));
      const evd = (x) => dc.reduce((acc, co) => C.add(C.mul(acc, x), { re: co, im: 0 }), { re: 0, im: 0 });
      z = z.map((r) => { for (let k = 0; k < 6; k++) { const dv = evd(r); if (C.abs(dv) < 1e-14) break; r = C.sub(r, C.div(ev(r), dv)); } return r; });
      // snap to exact rational roots (multiple roots converge slowly: accuracy ~ ε^(1/m))
      const scale = Math.max(...c.map(Math.abs));
      z = z.map((r) => {
        if (Math.abs(r.im) < 1e-2) { const f = Num.frac(r.re, 24, 1e-2); if (f) { const q = f[0] / f[1]; if (Math.abs(Poly.evalAt(c, q)) < 1e-9 * scale) return { re: q, im: 0 }; } }
        return { re: Math.abs(r.re - Math.round(r.re)) < 1e-7 ? Math.round(r.re) : r.re, im: Math.abs(r.im) < 1e-7 ? 0 : r.im };
      });
      return z.sort((p, q) => (q.re - p.re) || (q.im - p.im));
    },
    /** Pretty polynomial in variable v from coefficients (highest first). */
    str(coefs, v = 'λ') {
      const n = coefs.length - 1; const parts = [];
      coefs.forEach((co, k) => {
        const p = n - k; if (Math.abs(co) < 1e-12) return;
        const a = Math.abs(co); const cs = (a === 1 && p > 0) ? '' : Num.fmt(a, { surd: false });
        const term = p === 0 ? cs || '1' : `${cs}${v}${p > 1 ? Num.sup(p) : ''}`;
        parts.push({ sign: co < 0 ? '−' : '+', term });
      });
      if (!parts.length) return '0';
      return parts.map((t, i) => (i === 0 ? (t.sign === '−' ? '−' : '') + t.term : ` ${t.sign} ${t.term}`)).join('');
    },
    evalAt(coefs, x) { return coefs.reduce((a, c) => a * x + c, 0); },
    /** Groups equal roots → [{root, mult}] */
    group(roots, tol = 1e-6) { const out = []; roots.forEach((r) => { const g = out.find((o) => Math.abs(o.root.re - r.re) < tol && Math.abs(o.root.im - r.im) < tol); if (g) g.mult++; else out.push({ root: r, mult: 1 }); }); return out; },
  };

  // ───────────────────────── Matrices ─────────────────────────
  const Mat = {
    /** Parses "4 1; 2 3" or "[[4,1],[2,3]]" or rows on new lines. */
    parse(src) {
      const s = String(src || '').trim().replace(/^\[\[|\]\]$/g, '').replace(/\]\s*,\s*\[/g, ';').replace(/[[\]]/g, '');
      const rows = s.split(/;|\n|\|/).map((r) => r.trim()).filter(Boolean).map((r) => r.split(/[\s,]+/).filter(Boolean).map((t) => { const v = Number(t.replace('−', '-')); if (!Number.isFinite(v)) { const f = /^(-?\d+)\/(\d+)$/.exec(t); if (f) return Number(f[1]) / Number(f[2]); throw new ParseError(`"${t}" is not a number`); } return v; }));
      if (!rows.length) throw new ParseError('Enter the matrix rows separated by ";" e.g. 4 1; 2 3');
      if (rows.some((r) => r.length !== rows[0].length)) throw new ParseError('Every row must have the same number of entries.');
      return rows;
    },
    str: (A) => A.map((r) => r.map((v) => Num.fmt(v)).join('  ')).join(' ; '),
    I: (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))),
    add: (A, B, s = 1) => A.map((r, i) => r.map((v, j) => v + s * B[i][j])),
    scale: (A, k) => A.map((r) => r.map((v) => v * k)),
    mul: (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0))),
    T: (A) => A[0].map((_, j) => A.map((r) => r[j])),
    mv: (A, v) => A.map((r) => r.reduce((s, a, k) => s + a * v[k], 0)),
    det(A) { const n = A.length; if (n === 1) return A[0][0]; if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0]; let d = 0; for (let j = 0; j < n; j++) d += (j % 2 ? -1 : 1) * A[0][j] * Mat.det(A.slice(1).map((r) => r.filter((_, k) => k !== j))); return d; },
    trace: (A) => A.reduce((s, r, i) => s + r[i], 0),
    minor: (A, i, j) => A.filter((_, r) => r !== i).map((r) => r.filter((_, k) => k !== j)),
    inv(A) { const n = A.length; const M = A.map((r, i) => [...r, ...Mat.I(n)[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; if (Math.abs(M[p][c]) < 1e-12) return null; [M[c], M[p]] = [M[p], M[c]]; const pv = M[c][c]; M[c] = M[c].map((v) => v / pv); for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; M[r] = M[r].map((v, k) => v - f * M[c][k]); } } return M.map((r) => r.slice(n)); },
    /** Characteristic polynomial coefficients of det(λI − A) (monic, highest first) by Faddeev–LeVerrier. */
    charPoly(A) {
      const n = A.length; let M = Mat.I(n).map((r) => r.map(() => 0)); const c = [1];
      for (let k = 1; k <= n; k++) { M = Mat.add(Mat.mul(A, M), Mat.scale(Mat.I(n), c[k - 1])); const ck = -Mat.trace(Mat.mul(A, M)) / k; c.push(ck); }
      return c.map((v) => (Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v) : v));
    },
    /** Null space basis of A (tolerant Gaussian elimination). */
    nullSpace(A, tol = 1e-7) {
      const m = A.length, n = A[0].length; const M = A.map((r) => r.slice()); const piv = []; let row = 0;
      for (let c = 0; c < n && row < m; c++) {
        let p = row; for (let r = row + 1; r < m; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
        if (Math.abs(M[p][c]) < tol) continue;
        [M[row], M[p]] = [M[p], M[row]]; const pv = M[row][c]; M[row] = M[row].map((v) => v / pv);
        for (let r = 0; r < m; r++) if (r !== row) { const f = M[r][c]; M[r] = M[r].map((v, k) => v - f * M[row][k]); }
        piv.push(c); row++;
      }
      const free = [...Array(n).keys()].filter((c) => !piv.includes(c));
      return free.map((fc) => { const v = Array(n).fill(0); v[fc] = 1; piv.forEach((pc, r) => { v[pc] = -M[r][fc]; }); return Mat.nice(v); });
    },
    /** Scales a vector to small integers when possible. */
    nice(v) {
      const nz = v.filter((x) => Math.abs(x) > 1e-9); if (!nz.length) return v;
      for (let s = 1; s <= 60; s++) { const w = v.map((x) => x * s / Math.min(...nz.map(Math.abs))); if (w.every((x) => Math.abs(x - Math.round(x)) < 1e-6)) { let r = w.map(Math.round); const g = r.reduce((a, b) => gcd(a, Math.abs(b)), 0) || 1; r = r.map((x) => x / g); if (r.find((x) => x !== 0) < 0) r = r.map((x) => -x); return r.map((x) => x + 0); } }
      const k = nz[0] < 0 ? -1 : 1; return v.map((x) => (x * k) / Math.hypot(...v));
    },
    /** Real eigen-pairs; complex eigenvalues returned with vectors = null. */
    eigen(A) {
      const cp = Mat.charPoly(A); const roots = Poly.roots(cp); const groups = Poly.group(roots);
      return { charPoly: cp, pairs: groups.map((g) => ({ value: g.root, mult: g.mult, vectors: Math.abs(g.root.im) < 1e-9 ? Mat.nullSpace(Mat.add(A, Mat.scale(Mat.I(A.length), g.root.re), -1), 1e-6) : null })) };
    },
    isSymmetric: (A) => A.every((r, i) => r.every((v, j) => Math.abs(v - A[j][i]) < 1e-9)),
    normalize: (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; },
  };
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }

  // ───────────────────────── Solvers & integration ─────────────────────────
  const Solve = {
    /** Newton's method for a system F(v)=0 with numeric Jacobian. */
    newton(F, x0, it = 60) {
      let x = x0.slice(); const n = x.length;
      for (let k = 0; k < it; k++) {
        const f = F(x); if (f.some((v) => !Number.isFinite(v))) return null;
        if (Math.max(...f.map(Math.abs)) < 1e-12) return x;
        const J = Array.from({ length: n }, () => Array(n).fill(0)); const h = 1e-6;
        for (let j = 0; j < n; j++) { const xp = x.slice(); xp[j] += h; const xm = x.slice(); xm[j] -= h; const fp = F(xp), fm = F(xm); for (let i = 0; i < n; i++) J[i][j] = (fp[i] - fm[i]) / (2 * h); }
        const Ji = Mat.inv(J); if (!Ji) return null;
        const dx = Mat.mv(Ji, f); x = x.map((v, i) => v - dx[i]);
        if (Math.max(...dx.map(Math.abs)) < 1e-13) break;
      }
      const f = F(x); return f.every((v) => Math.abs(v) < 1e-7) ? x : null;
    },
    /** All solutions in a box from a grid of Newton seeds (deduplicated). */
    newtonGrid(F, box, seeds = 9) {
      const n = box.length; const out = [];
      const rec = (k, cur) => {
        if (k === n) { const r = Solve.newton(F, cur); if (r && r.every((v, i) => v >= box[i][0] - 1e-6 && v <= box[i][1] + 1e-6) && !out.some((o) => o.every((v, i) => Math.abs(v - r[i]) < 1e-5))) out.push(r.map((v) => (Math.abs(v - Math.round(v)) < 1e-8 ? Math.round(v) : v))); return; }
        const [a, b] = box[k]; const m = k >= 2 ? 3 : seeds;
        for (let s = 0; s < m; s++) rec(k + 1, [...cur, a + ((b - a) * (s + 0.5)) / m]);
      };
      rec(0, []); return out;
    },
    simpson(f, a, b, n = 64) { if (a === b) return 0; if (n % 2) n++; const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h); return (s * h) / 3; },
    /** ∫_{a}^{b} ∫_{g1(x)}^{g2(x)} f(x, y) dy dx */
    double(f, a, b, g1, g2, n = 60) { return Solve.simpson((x) => Solve.simpson((y) => f(x, y), g1(x), g2(x), n), a, b, n); },
    triple(f, a, b, g1, g2, h1, h2, n = 24) { return Solve.simpson((x) => Solve.simpson((y) => Solve.simpson((z) => f(x, y, z), h1(x, y), h2(x, y), n), g1(x), g2(x), n), a, b, n); },
    /** RK4 for y' = F(t, Y) (Y array). */
    rk4(F, t0, Y0, t1, steps = 400) { const h = (t1 - t0) / steps; let t = t0; let Y = Y0.slice(); const pts = [[t, ...Y]]; for (let i = 0; i < steps; i++) { const k1 = F(t, Y); const k2 = F(t + h / 2, Y.map((v, j) => v + (h / 2) * k1[j])); const k3 = F(t + h / 2, Y.map((v, j) => v + (h / 2) * k2[j])); const k4 = F(t + h, Y.map((v, j) => v + h * k3[j])); Y = Y.map((v, j) => v + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])); t += h; pts.push([t, ...Y]); } return pts; },
  };

  // ───────────────────────── Plotting ─────────────────────────
  const Plot = {
    /** 2-D axes in box [x, y, w, h] for world ranges; returns {X, Y, inv}. Keeps aspect when equal=true. */
    axes(g, box, xr, yr, o = {}) {
      let [bx, by, bw, bh] = box; let [x0, x1] = xr, [y0, y1] = yr;
      if (o.equal) { const sx = bw / (x1 - x0), sy = bh / (y1 - y0); const s = Math.min(sx, sy); const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; x0 = cx - bw / s / 2; x1 = cx + bw / s / 2; y0 = cy - bh / s / 2; y1 = cy + bh / s / 2; }
      const X = (x) => bx + ((x - x0) / (x1 - x0)) * bw; const Y = (y) => by + bh - ((y - y0) / (y1 - y0)) * bh;
      const inv = (px, py) => [x0 + ((px - bx) / bw) * (x1 - x0), y0 + ((by + bh - py) / bh) * (y1 - y0)];
      D.rect(g, bx, by, bw, bh, { fill: o.bg || '#ffffff', stroke: '#cbd5e1', width: 1.2, r: 6 });
      const step = (r) => { const raw = r / 6; const p = Math.pow(10, Math.floor(Math.log10(raw))); return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw); };
      const sx = step(x1 - x0), sy = step(y1 - y0);
      g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip();
      for (let x = Math.ceil(x0 / sx) * sx; x <= x1; x += sx) D.line(g, X(x), by, X(x), by + bh, { color: '#eef2f7', width: 1 });
      for (let y = Math.ceil(y0 / sy) * sy; y <= y1; y += sy) D.line(g, bx, Y(y), bx + bw, Y(y), { color: '#eef2f7', width: 1 });
      if (y0 <= 0 && y1 >= 0) D.line(g, bx, Y(0), bx + bw, Y(0), { color: '#64748b', width: 1.6 });
      if (x0 <= 0 && x1 >= 0) D.line(g, X(0), by, X(0), by + bh, { color: '#64748b', width: 1.6 });
      g.restore();
      const ty = y0 <= 0 && y1 >= 0 ? Math.min(by + bh - 10, Y(0) + 14) : by + bh - 10; const tx = x0 <= 0 && x1 >= 0 ? Math.max(bx + 12, X(0) - 6) : bx + 12;
      for (let x = Math.ceil(x0 / sx) * sx; x <= x1 + 1e-9; x += sx) if (Math.abs(x) > 1e-9 && X(x) > bx + 14 && X(x) < bx + bw - 14) D.text(g, Num.dec(x, 3), X(x), ty, { size: 14, color: '#64748b', align: 'center', weight: 600 });
      for (let y = Math.ceil(y0 / sy) * sy; y <= y1 + 1e-9; y += sy) if (Math.abs(y) > 1e-9 && Y(y) > by + 12 && Y(y) < by + bh - 12) D.text(g, Num.dec(y, 3), tx, Y(y), { size: 14, color: '#64748b', align: x0 <= 0 && x1 >= 0 ? 'right' : 'left', weight: 600 });
      if (o.xl) D.text(g, o.xl, bx + bw - 8, (y0 <= 0 && y1 >= 0 ? Y(0) : by + bh) - 12, { size: 16, weight: 800, align: 'right', color: '#334155' });
      if (o.yl) D.text(g, o.yl, (x0 <= 0 && x1 >= 0 ? X(0) : bx) + 8, by + 14, { size: 16, weight: 800, color: '#334155' });
      return { X, Y, inv, xr: [x0, x1], yr: [y0, y1], box };
    },
    clip(g, A, fnDraw) { const [bx, by, bw, bh] = A.box; g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip(); fnDraw(); g.restore(); },
    /** Plots y = f(x); breaks at non-finite/jumps. */
    curve(g, A, f, o = {}) {
      Plot.clip(g, A, () => {
        const [x0, x1] = o.range || A.xr; const n = o.n || 400; let pts = []; const flush = () => { if (pts.length > 1) D.poly(g, pts, { stroke: o.color || '#2563eb', width: o.width || 2.6, dash: o.dash }); pts = []; };
        const ylim = (A.yr[1] - A.yr[0]) * 4;
        for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n; let y; try { y = f(x); } catch (e) { y = NaN; } if (!Number.isFinite(y) || Math.abs(y) > Math.abs(A.yr[0]) + ylim) { flush(); continue; } pts.push([A.X(x), A.Y(y)]); }
        flush();
      });
    },
    param(g, A, fx, fy, t0, t1, o = {}) { Plot.clip(g, A, () => { const n = o.n || 300; const pts = []; for (let i = 0; i <= n; i++) { const t = t0 + ((t1 - t0) * i) / n; const x = fx(t), y = fy(t); if (Number.isFinite(x) && Number.isFinite(y)) pts.push([A.X(x), A.Y(y)]); } D.poly(g, pts, { stroke: o.color || '#2563eb', width: o.width || 2.6, dash: o.dash, fill: o.fill, close: o.close, alpha: o.alpha }); }); },
    /** Filled contour map + contour lines of f(x,y) (marching squares). */
    contour(g, A, f, o = {}) {
      const n = o.n || 70; const [x0, x1] = A.xr, [y0, y1] = A.yr; const Z = []; let zmin = Infinity, zmax = -Infinity;
      for (let i = 0; i <= n; i++) { Z.push([]); for (let j = 0; j <= n; j++) { let z; try { z = f(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * j) / n); } catch (e) { z = NaN; } if (!Number.isFinite(z)) z = NaN; else { zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); } Z[i].push(z); } }
      if (!Number.isFinite(zmin)) return { zmin: 0, zmax: 0 };
      if (o.clampQ) { const all = Z.flat().filter(Number.isFinite).sort((a, b) => a - b); zmin = all[Math.floor(all.length * 0.02)]; zmax = all[Math.floor(all.length * 0.98)]; }
      const col = (z) => { const t = (z - zmin) / (zmax - zmin || 1); return heatSoft(t); };
      Plot.clip(g, A, () => {
        const cw = (A.X(x1) - A.X(x0)) / n, ch = (A.Y(y0) - A.Y(y1)) / n;
        if (o.fill !== false) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const z = Z[i][j]; if (Number.isNaN(z)) continue; g.fillStyle = col(z); g.fillRect(A.X(x0) + i * cw - 0.3, A.Y(y0) - (j + 1) * ch - 0.3, cw + 0.6, ch + 0.6); }
        const levels = o.levels || Array.from({ length: 12 }, (_, k) => zmin + ((zmax - zmin) * (k + 0.5)) / 12);
        g.strokeStyle = o.lineColor || 'rgba(15,23,42,0.45)'; g.lineWidth = 1.1;
        levels.forEach((lv) => {
          g.beginPath();
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            const c = [Z[i][j], Z[i + 1][j], Z[i + 1][j + 1], Z[i][j + 1]]; if (c.some(Number.isNaN)) continue;
            const P = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]; const pts = [];
            for (let e = 0; e < 4; e++) { const a = c[e] - lv, b = c[(e + 1) % 4] - lv; if ((a < 0) !== (b < 0)) { const t = a / (a - b); const pa = P[e], pb = P[(e + 1) % 4]; pts.push([A.X(x0) + (pa[0] + (pb[0] - pa[0]) * t) * cw, A.Y(y0) - (pa[1] + (pb[1] - pa[1]) * t) * ch]); } }
            if (pts.length >= 2) { g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[1][0], pts[1][1]); if (pts.length === 4) { g.moveTo(pts[2][0], pts[2][1]); g.lineTo(pts[3][0], pts[3][1]); } }
          }
          g.stroke();
        });
      });
      return { zmin, zmax, Z };
    },
    /** Level set g(x,y)=0 drawn as a curve (marching squares on sign). */
    implicit(g, A, fz, o = {}) { Plot.contour(g, A, fz, { fill: false, levels: [0], lineColor: o.color || '#dc2626', n: o.n || 90 }); },
    field(g, A, P, Q, o = {}) {
      const n = o.n || 13; const [x0, x1] = A.xr, [y0, y1] = A.yr; const vs = [];
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * j) / n; let u, v; try { u = P(x, y); v = Q(x, y); } catch (e) { continue; } if (Number.isFinite(u) && Number.isFinite(v)) vs.push([x, y, u, v]); }
      const mx = Math.max(1e-9, ...vs.map((q) => Math.hypot(q[2], q[3]))); const L = ((A.X(x1) - A.X(x0)) / n) * 0.8;
      Plot.clip(g, A, () => vs.forEach(([x, y, u, v]) => { const m = Math.hypot(u, v); if (m < 1e-12) return; const k = (L * (0.35 + 0.65 * m / mx)) / m; D.arrow(g, A.X(x), A.Y(y), A.X(x) + u * k, A.Y(y) - v * k, { color: o.color || 'rgba(37,99,235,0.55)', width: 1.4, head: 7 }); }));
    },
    point(g, A, x, y, label, o = {}) { const px = A.X(x), py = A.Y(y); D.circle(g, px, py, o.r || 7, { fill: o.color || '#dc2626', stroke: '#fff', width: 2 }); if (label) D.tag(g, label, px + 10, py - 16, { bg: o.color || '#dc2626', size: 14 }); },
    // ── 3-D ──
    /** 3-D camera for math axes (x right, y depth, z up) with the engine view. */
    cam(view, cx, cy, scale) { return D.projector({ yaw: view.yaw, pitch: view.pitch, zoom: view.zoom }, cx + (view.panX || 0), cy + (view.panY || 0), scale); },
    axes3(g, P, r, o = {}) { const lab = o.labels || ['x', 'y', 'z']; [[r, 0, 0], [0, r, 0], [0, 0, r]].forEach((v, i) => { const a = P([-v[0] * (o.neg ? 1 : 0), -v[1] * (o.neg ? 1 : 0), -v[2] * (o.neg ? 1 : 0)]), b = P(v); D.arrow(g, a.x, a.y, b.x, b.y, { color: ['#dc2626', '#16a34a', '#2563eb'][i], width: 2, head: 10 }); D.text(g, lab[i], b.x + 6, b.y - 6, { size: 17, weight: 800, color: ['#dc2626', '#16a34a', '#2563eb'][i], halo: true }); }); },
    /** Surface z = f(x,y) over [x0,x1]×[y0,y1] (model units scaled by s, z by zs) painted back-to-front. */
    surface(g, P, f, xr, yr, o = {}) {
      const n = o.n || 26; const pts = []; let zmin = Infinity, zmax = -Infinity;
      for (let i = 0; i <= n; i++) { pts.push([]); for (let j = 0; j <= n; j++) { const x = xr[0] + ((xr[1] - xr[0]) * i) / n, y = yr[0] + ((yr[1] - yr[0]) * j) / n; let z; try { z = f(x, y); } catch (e) { z = NaN; } if (Number.isFinite(z)) { zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); } pts[i].push([x, y, z]); } }
      const zc = o.zclamp || [zmin, zmax]; const map = o.map || ((p) => p);
      const quads = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const q = [pts[i][j], pts[i + 1][j], pts[i + 1][j + 1], pts[i][j + 1]]; if (q.some((p) => !Number.isFinite(p[2]))) continue;
        const pr = q.map((p) => P(map([p[0], p[1], Math.max(zc[0], Math.min(zc[1], p[2]))]))); const zm = (q[0][2] + q[2][2]) / 2;
        quads.push({ pr, depth: pr.reduce((s, v) => s + v.depth, 0) / 4, t: (zm - zc[0]) / (zc[1] - zc[0] || 1) });
      }
      quads.sort((a, b) => b.depth - a.depth).forEach((q) => D.poly(g, q.pr.map((v) => [v.x, v.y]), { fill: o.color ? o.color(q.t) : heatSoft(q.t), close: true, stroke: 'rgba(15,23,42,0.18)', width: 0.7, alpha: o.alpha == null ? 0.9 : o.alpha }));
      return { zmin, zmax };
    },
    poly3(g, P, pts, o = {}) { D.poly(g, pts.map((p) => { const q = P(p); return [q.x, q.y]; }), o); },
  };
  function heatSoft(t) { t = Math.max(0, Math.min(1, t)); const stops = [[0, [49, 94, 180]], [0.25, [86, 160, 220]], [0.5, [170, 220, 200]], [0.75, [250, 214, 120]], [1, [228, 110, 70]]]; for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const [a0, c0] = stops[i - 1], [a1, c1] = stops[i]; const k = (t - a0) / (a1 - a0); return `rgb(${Math.round(c0[0] + (c1[0] - c0[0]) * k)},${Math.round(c0[1] + (c1[1] - c0[1]) * k)},${Math.round(c0[2] + (c1[2] - c0[2]) * k)})`; } return 'rgb(228,110,70)'; }
  Plot.heat = heatSoft;

  // ───────────────────────── Working panel ─────────────────────────
  const MATH_FONT = '"Cambria Math","STIX Two Math",Cambria,Georgia,serif';
  const Work = {
    /**
     * Draws the step-by-step working in box [x,y,w,h]. steps = [{title, lines:[string|{t, c, b}]}]; shows steps 0..cur,
     * highlights the current one and scrolls so the current step is visible.
     */
    draw(g, box, steps, cur, o = {}) {
      const [bx, by, bw, bh] = box;
      D.rect(g, bx, by, bw, bh, { fill: '#ffffff', stroke: '#cbd5e1', width: 1.2, r: 10 });
      D.text(g, o.title || 'Working', bx + 14, by + 20, { size: 16, weight: 800, color: '#15803d' });
      const lh = o.lineHeight || 24; const blocks = [];
      steps.slice(0, cur + 1).forEach((s, i) => { const lines = [{ t: `${i + 1}. ${s.title}`, head: true, i }, ...(s.lines || []).map((l) => (typeof l === 'string' ? { t: l, i } : { ...l, i }))]; blocks.push(...lines); });
      // wrap
      g.save(); const wrapped = [];
      blocks.forEach((l) => { g.font = `${l.head ? 800 : l.b ? 700 : 500} ${l.head ? 16 : o.size || 17}px ${l.head ? D.FONT : MATH_FONT}`; const words = String(l.t).split(' '); let line = ''; words.forEach((w) => { const tst = line ? line + ' ' + w : w; if (g.measureText(tst).width > bw - 36 && line) { wrapped.push({ ...l, t: line }); line = '   ' + w; } else line = tst; }); wrapped.push({ ...l, t: line }); });
      g.restore();
      const avail = Math.floor((bh - 44) / lh); let start = Math.max(0, wrapped.length - avail);
      const firstCur = wrapped.findIndex((l) => l.i === cur); if (firstCur >= 0 && firstCur < start) start = firstCur;
      g.save(); g.beginPath(); g.rect(bx + 2, by + 32, bw - 4, bh - 36); g.clip();
      const curRows = wrapped.map((l, k) => (l.i === cur ? k : -1)).filter((k) => k >= start);
      if (curRows.length) { const y0 = by + 40 + (curRows[0] - start) * lh - 4; const y1 = by + 40 + (curRows[curRows.length - 1] - start + 1) * lh; D.rect(g, bx + 6, y0, bw - 12, Math.min(y1, by + bh - 4) - y0, { fill: '#fefce8', stroke: '#facc15', width: 2, r: 8 }); }
      wrapped.slice(start, start + avail).forEach((l, k) => {
        const y = by + 40 + k * lh + lh / 2 - 2;
        g.font = `${l.head ? 800 : l.b ? 700 : 500} ${l.head ? 16 : o.size || 17}px ${l.head ? D.FONT : MATH_FONT}`; g.fillStyle = l.head ? (l.i === cur ? '#854d0e' : '#15803d') : l.c || (l.i === cur ? '#0f172a' : '#475569'); g.textBaseline = 'middle'; g.textAlign = 'left';
        g.fillText(l.t, bx + 16, y);
      });
      if (start > 0) D.text(g, '⋮ earlier steps above', bx + bw - 14, by + 20, { size: 14, color: '#94a3b8', align: 'right' });
      g.restore();
    },
    /** Matrix drawn with brackets at (x, y) top-left; returns width. */
    matrix(g, A, x, y, o = {}) {
      const size = o.size || 18; const cw = o.cw || 58; const rh = size + 12; const n = A.length, m = A[0].length;
      const w = m * cw + 16, h = n * rh + 6;
      g.save(); g.strokeStyle = o.color || '#0f172a'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x + 8, y); g.lineTo(x, y); g.lineTo(x, y + h); g.lineTo(x + 8, y + h); g.stroke();
      g.beginPath(); g.moveTo(x + w - 8, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x + w - 8, y + h); g.stroke(); g.restore();
      A.forEach((r, i) => r.forEach((v, j) => D.text(g, typeof v === 'string' ? v : Num.fmt(v), x + 8 + cw * j + cw / 2, y + 3 + rh * i + rh / 2, { size, align: 'center', weight: 600, font: MATH_FONT, color: o.cellColor ? o.cellColor(i, j) : o.color || '#0f172a' })));
      if (o.label) D.text(g, o.label, x - 8, y + h / 2, { size: size + 1, align: 'right', weight: 800, font: MATH_FONT });
      return w;
    },
    FONT: MATH_FONT,
  };


  // ───────────────────────── Multivariate polynomials (exact symbolic integration) ─────────────────────────
  /** Polynomial in n variables: Map "e1,e2,…" → coefficient. */
  const MPoly = {
    zero: () => new Map(),
    konst(c, n) { const m = new Map(); if (Math.abs(c) > 1e-15) m.set(Array(n).fill(0).join(','), c); return m; },
    variable(i, n) { const e = Array(n).fill(0); e[i] = 1; return new Map([[e.join(','), 1]]); },
    add(a, b, s = 1) { const m = new Map(a); b.forEach((c, k) => { const v = (m.get(k) || 0) + s * c; if (Math.abs(v) < 1e-13) m.delete(k); else m.set(k, v); }); return m; },
    mul(a, b) { const m = new Map(); a.forEach((ca, ka) => b.forEach((cb, kb) => { const e = ka.split(',').map((x, i) => Number(x) + Number(kb.split(',')[i])).join(','); const v = (m.get(e) || 0) + ca * cb; if (Math.abs(v) < 1e-13) m.delete(e); else m.set(e, v); })); return m; },
    pow(a, k, n) { let r = MPoly.konst(1, n); for (let i = 0; i < k; i++) r = MPoly.mul(r, a); return r; },
    /** AST → polynomial, or null when the expression is not a polynomial in vars. */
    fromAst(ast, vars) {
      const n = vars.length;
      const go = (t) => {
        switch (t.op) {
          case 'num': return MPoly.konst(t.v, n);
          case 'const': return MPoly.konst(t.v, n);
          case 'var': { const i = vars.indexOf(t.name); return i < 0 ? null : MPoly.variable(i, n); }
          case 'neg': { const a = go(t.a); return a && MPoly.add(MPoly.zero(), a, -1); }
          case '+': case '-': { const a = go(t.a), b = go(t.b); return a && b ? MPoly.add(a, b, t.op === '+' ? 1 : -1) : null; }
          case '*': { const a = go(t.a), b = go(t.b); return a && b ? MPoly.mul(a, b) : null; }
          case '/': { const a = go(t.a), b = go(t.b); if (!a || !b) return null; if (b.size === 1 && b.has(Array(n).fill(0).join(','))) { const c = b.get(Array(n).fill(0).join(',')); const m = new Map(); a.forEach((v, k) => m.set(k, v / c)); return m; } return null; }
          case '^': { const a = go(t.a); if (!a || t.b.op !== 'num' || !Number.isInteger(t.b.v) || t.b.v < 0 || t.b.v > 12) return null; return MPoly.pow(a, t.b.v, n); }
          default: return null;
        }
      };
      try { return go(ast); } catch (e) { return null; }
    },
    /** ∫ p d(var i) (antiderivative) */
    integrate(p, i) { const m = new Map(); p.forEach((c, k) => { const e = k.split(',').map(Number); e[i] += 1; m.set(e.join(','), c / e[i]); }); return m; },
    /** substitute var i := q (polynomial in the same variable set) */
    subst(p, i, q, n) { let r = MPoly.zero(); p.forEach((c, k) => { const e = k.split(',').map(Number); const pw = e[i]; e[i] = 0; const mono = new Map([[e.join(','), c]]); r = MPoly.add(r, MPoly.mul(mono, MPoly.pow(q, pw, n))); }); return r; },
    evalAt(p, x) { let s = 0; p.forEach((c, k) => { s += c * k.split(',').reduce((acc, e, i) => acc * Math.pow(x[i], Number(e)), 1); }); return s; },
    str(p, vars) {
      if (!p.size) return '0';
      const terms = [...p.entries()].map(([k, c]) => ({ e: k.split(',').map(Number), c })).sort((A, B) => { const da = A.e.reduce((s, v) => s + v, 0), db = B.e.reduce((s, v) => s + v, 0); return db - da || B.e.join('').localeCompare(A.e.join('')); });
      return terms.map((t, idx) => { const mono = t.e.map((ex, i) => (ex ? vars[i] + (ex > 1 ? Num.sup(ex) : '') : '')).join(''); const a = Math.abs(t.c); const cs = a === 1 && mono ? '' : Num.fmt(a, { surd: false }); const sign = t.c < 0 ? (idx ? ' − ' : '−') : idx ? ' + ' : ''; return sign + (cs && mono && cs.includes('/') ? `(${cs})` : cs) + mono; }).join('');
    },
  };

  /** Common helper: parses safely, returning {ok, value, error}. */
  function safe(fnc) { try { return { ok: true, value: fnc() }; } catch (e) { return { ok: false, error: e instanceof ParseError ? e.message : (e && e.message) || 'Invalid input' }; } }

  window.MACore = { Num, Expr, Poly, Mat, Solve, Plot, Work, MPoly, safe, ParseError, Complex: C };
})();
