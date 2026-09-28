'use strict';

/* Engineering Mathematics — Unit I: Matrices. */
(function () {
  const D = window.EPDraw; const M = window.MACore; const { Num, Mat, Poly, Work, Plot, ParseError } = M; const { define, F } = window.MAFrame;
  const f = (v) => Num.fmt(v);
  const rowStr = (r) => r.map(f).join('   ');
  /** Matrix as text lines: "A = [ 4  1 ]" / "    [ 2  3 ]" */
  function mLines(label, A, o = {}) {
    const cols = A[0].map((_, j) => Math.max(...A.map((r) => f(r[j]).length)));
    const body = A.map((r) => r.map((v, j) => f(v).padStart(cols[j])).join('   '));
    const pad = ' '.repeat(label.length + 3);
    return body.map((b, i) => ({ t: `${i === 0 ? label + ' = ' : pad}[ ${b} ]`, c: o.c, b: o.b }));
  }
  function square(A, max = 3) { if (A.length !== A[0].length) throw new ParseError('The matrix must be square (same number of rows and columns).'); if (A.length > max || A.length < 2) throw new ParseError(`Use a 2×2${max > 2 ? ' or 3×3' : ''} matrix.`); return A; }
  const vecStr = (v) => `(${v.map(f).join(', ')})`;
  const matStrInline = (A) => `[${A.map(rowStr).join(' ; ')}]`;
  window.MAUtil = { mLines, square, vecStr, matStrInline };

  /** det(A − λI) expansion text for 2×2 / 3×3 (textbook S₁, S₂, S₃ method). */
  function charSteps(A) {
    const n = A.length; const cp = Mat.charPoly(A); const lines = [];
    const AL = A.map((r, i) => r.map((v, j) => (i === j ? `${f(v)}−λ` : f(v))));
    lines.push(`A − λI = [ ${AL.map((r) => r.join('  ')).join(' ; ')} ]`);
    if (n === 2) {
      lines.push(`det(A − λI) = (${f(A[0][0])} − λ)(${f(A[1][1])} − λ) − (${f(A[0][1])})(${f(A[1][0])})`);
      lines.push(`= λ² − (${f(A[0][0])} + ${f(A[1][1])})λ + (${f(A[0][0] * A[1][1])} − ${f(A[0][1] * A[1][0])})`);
      lines.push({ t: `Characteristic equation:  ${Poly.str(cp)} = 0`, b: true, c: '#1d4ed8' });
      return { lines, cp, S: [Mat.trace(A), Mat.det(A)] };
    }
    const S1 = Mat.trace(A); const m = [Mat.det(Mat.minor(A, 0, 0)), Mat.det(Mat.minor(A, 1, 1)), Mat.det(Mat.minor(A, 2, 2))]; const S2 = m[0] + m[1] + m[2]; const S3 = Mat.det(A);
    lines.push('λ³ − S₁λ² + S₂λ − S₃ = 0');
    lines.push(`S₁ = sum of diagonal = ${f(A[0][0])} + ${f(A[1][1])} + ${f(A[2][2])} = ${f(S1)}`);
    lines.push(`S₂ = sum of minors of diagonal elements = ${f(m[0])} + ${f(m[1])} + ${f(m[2])} = ${f(S2)}`);
    lines.push(`S₃ = |A| = ${f(S3)}`);
    lines.push({ t: `Characteristic equation:  ${Poly.str(cp)} = 0`, b: true, c: '#1d4ed8' });
    return { lines, cp, S: [S1, S2, S3] };
  }
  function factorStr(roots) { const g = Poly.group(roots); if (g.some((x) => Math.abs(x.root.im) > 1e-9 || !Num.frac(x.root.re, 24))) return null; return g.map((x) => { const r = x.root.re; const t = r === 0 ? 'λ' : `(λ ${r < 0 ? '+' : '−'} ${f(Math.abs(r))})`; return x.mult > 1 ? `${t}${Num.sup(x.mult)}` : t; }).join(''); }
  function eigenVecSteps(A, lam, vecs) {
    const n = A.length; const B = Mat.add(A, Mat.scale(Mat.I(n), lam), -1); const L = [];
    L.push(`(A − ${f(lam)}I)X = 0:`); L.push(...mLines('A − ' + f(lam) + 'I', B));
    if (n === 2) { const r = Math.abs(B[0][0]) + Math.abs(B[0][1]) > 1e-9 ? B[0] : B[1]; L.push(`⇒ ${f(r[0])}x₁ + ${f(r[1])}x₂ = 0`); }
    else if (vecs.length === 1) { const [r1, r2] = [B[0], B[1]]; L.push('Cross-multiplication of rows 1 and 2 gives x₁ : x₂ : x₃'); L.push(`= ${f(r1[1] * r2[2] - r1[2] * r2[1])} : ${f(-(r1[0] * r2[2] - r1[2] * r2[0]))} : ${f(r1[0] * r2[1] - r1[1] * r2[0])}`); }
    else L.push(`Rank of (A − ${f(lam)}I) = ${n - vecs.length} ⇒ ${vecs.length} independent solutions`);
    vecs.forEach((v, k) => L.push({ t: `X${vecs.length > 1 ? Num.sub(k + 1) : ''} = ${vecStr(v)}ᵀ`, b: true, c: '#15803d' }));
    return L;
  }
  window.MAUtil.charSteps = charSteps; window.MAUtil.factorStr = factorStr;
  const A_PARAM = (def, label = 'Matrix A (rows separated by ;)') => ({ key: 'A', label, type: 'text', default: def, placeholder: 'e.g. 4 1; 2 3', help: 'Numbers separated by spaces, rows by semicolons. Fractions like 1/2 allowed.' });

  // ── 2-D transformation view: unit circle → ellipse, eigen directions, probe vector ──
  function transformPlot(g, box, A, pairs, S, o = {}) {
    const R = Math.max(2.2, ...A.flat().map(Math.abs)) * 1.25;
    const Ax = Plot.axes(g, box, [-R, R], [-R, R], { equal: true, xl: 'x', yl: 'y' });
    Plot.param(g, Ax, (t) => Math.cos(t), (t) => Math.sin(t), 0, 2 * Math.PI, { color: '#94a3b8', width: 1.5, dash: [5, 4] });
    Plot.param(g, Ax, (t) => A[0][0] * Math.cos(t) + A[0][1] * Math.sin(t), (t) => A[1][0] * Math.cos(t) + A[1][1] * Math.sin(t), 0, 2 * Math.PI, { color: '#7c3aed', width: 2 });
    (pairs || []).forEach((p, k) => (p.vectors || []).forEach((v) => {
      const u = Mat.normalize(v); const col = ['#16a34a', '#ea580c', '#0891b2'][k % 3];
      Plot.clip(g, Ax, () => D.line(g, Ax.X(-u[0] * R * 2), Ax.Y(-u[1] * R * 2), Ax.X(u[0] * R * 2), Ax.Y(u[1] * R * 2), { color: col, width: 1.3, dash: [8, 5] }));
      const Au = Mat.mv(A, u);
      D.arrow(g, Ax.X(0), Ax.Y(0), Ax.X(Au[0]), Ax.Y(Au[1]), { color: col, width: 4, head: 14 });
      D.arrow(g, Ax.X(0), Ax.Y(0), Ax.X(u[0]), Ax.Y(u[1]), { color: '#0f172a', width: 2.5, head: 11 });
      D.tag(g, `λ = ${f(p.value.re)}: AX = ${f(p.value.re)}X`, Ax.X(Au[0]) + 8, Ax.Y(Au[1]) - 14, { bg: col, size: 14 });
    }));
    if (o.probe != null) {
      const th = (o.probe * Math.PI) / 180; const v = [Math.cos(th), Math.sin(th)]; const Av = Mat.mv(A, v);
      D.arrow(g, Ax.X(0), Ax.Y(0), Ax.X(v[0]), Ax.Y(v[1]), { color: '#2563eb', width: 3, head: 12 });
      D.arrow(g, Ax.X(0), Ax.Y(0), Ax.X(Av[0]), Ax.Y(Av[1]), { color: '#dc2626', width: 3, head: 12 });
      const cross = v[0] * Av[1] - v[1] * Av[0]; const along = Math.abs(cross) < 0.03 * Math.hypot(...Av);
      D.tag(g, along ? 'v and Av are parallel → eigen-direction!' : 'v (blue) → Av (red): direction changes', box[0] + box[2] / 2, box[1] + box[3] - 18, { bg: along ? '#16a34a' : '#334155', size: 15, align: 'center' });
    }
    D.text(g, 'dashed circle = unit vectors v · purple = their images Av', box[0] + 12, box[1] + 18, { size: 14, color: '#475569' });
  }

  // ─────────────── 1. Matrix operations ───────────────
  define('ma-matrix-ops', {
    params: [
      { key: 'op', label: 'Operation', type: 'select', options: [{ value: 'add', label: 'A + B' }, { value: 'sub', label: 'A − B' }, { value: 'scalar', label: 'k · A (scalar multiple)' }, { value: 'mul', label: 'A × B (product)' }, { value: 'trans', label: 'Aᵀ (transpose)' }], default: 'mul' },
      A_PARAM('1 2; 3 4'),
      { key: 'B', label: 'Matrix B', type: 'text', default: '5 6; 7 8', showIf: (p) => ['add', 'sub', 'mul'].includes(p.op) },
      { key: 'k', label: 'Scalar k', type: 'range', min: -5, max: 5, step: 0.5, default: 2, showIf: (p) => p.op === 'scalar' },
    ],
    examples: [
      { label: '2×2 product', values: { op: 'mul', A: '1 2; 3 4', B: '5 6; 7 8' } },
      { label: '2×3 times 3×2', values: { op: 'mul', A: '1 0 2; -1 3 1', B: '3 1; 2 1; 1 0' } },
      { label: '3×3 sum', values: { op: 'add', A: '1 2 3; 0 1 4; 5 6 0', B: '1 0 0; 0 1 0; 0 0 1' } },
      { label: 'Transpose of 2×3', values: { op: 'trans', A: '1 2 3; 4 5 6' } },
    ],
    inputOf: (p) => ({ operation: p.op, A: p.A, B: p.B, k: p.k }),
    solve(p) {
      const A = Mat.parse(p.A); const needB = ['add', 'sub', 'mul'].includes(p.op); const B = needB ? Mat.parse(p.B) : null;
      const steps = [{ title: 'Input matrices', text: `A is ${A.length}×${A[0].length}${B ? `, B is ${B.length}×${B[0].length}` : ''}.`, lines: [...mLines('A', A), ...(B ? mLines('B', B) : []), ...(p.op === 'scalar' ? [`k = ${f(p.k)}`] : [])] }];
      let R; let rule;
      if (p.op === 'add' || p.op === 'sub') {
        if (A.length !== B.length || A[0].length !== B[0].length) throw new ParseError(`A (${A.length}×${A[0].length}) and B (${B.length}×${B[0].length}) must have the same order to ${p.op === 'add' ? 'add' : 'subtract'}.`);
        const s = p.op === 'add' ? 1 : -1; R = Mat.add(A, B, s); rule = `(A ${s > 0 ? '+' : '−'} B)ᵢⱼ = aᵢⱼ ${s > 0 ? '+' : '−'} bᵢⱼ`;
        steps.push({ title: 'Check the order', text: 'Both matrices have the same order.', lines: [`Order of A = order of B = ${A.length}×${A[0].length} ✓`, rule] });
        steps.push({ title: 'Combine corresponding entries', text: 'Each entry is found separately.', lines: A.map((r, i) => r.map((v, j) => `c${Num.sub(i + 1)}${Num.sub(j + 1)} = ${f(v)} ${s > 0 ? '+' : '−'} ${f(B[i][j])} = ${f(R[i][j])}`).join('   ')) });
      } else if (p.op === 'scalar') {
        R = Mat.scale(A, p.k); rule = '(kA)ᵢⱼ = k·aᵢⱼ';
        steps.push({ title: 'Multiply every entry by k', text: rule, lines: A.map((r, i) => r.map((v, j) => `${f(p.k)}×${f(v)} = ${f(R[i][j])}`).join('   ')) });
      } else if (p.op === 'trans') {
        R = Mat.T(A); rule = '(Aᵀ)ᵢⱼ = aⱼᵢ';
        steps.push({ title: 'Rows become columns', text: rule, lines: A.map((r, i) => `Row ${i + 1} of A (${rowStr(r)}) → column ${i + 1} of Aᵀ`) });
      } else {
        if (A[0].length !== B.length) throw new ParseError(`A×B needs columns of A (${A[0].length}) = rows of B (${B.length}).`);
        R = Mat.mul(A, B); rule = 'cᵢⱼ = Σₖ aᵢₖ bₖⱼ (row i of A · column j of B)';
        steps.push({ title: 'Check compatibility', text: `(${A.length}×${A[0].length})(${B.length}×${B[0].length}) → ${A.length}×${B[0].length}`, lines: [`Columns of A = rows of B = ${A[0].length} ✓`, `Result is ${A.length}×${B[0].length}`, rule] });
        A.forEach((r, i) => steps.push({ title: `Row ${i + 1} of the product`, text: `Row ${i + 1} of A with each column of B.`, lines: B[0].map((_, j) => `c${Num.sub(i + 1)}${Num.sub(j + 1)} = ${r.map((v, k) => `(${f(v)})(${f(B[k][j])})`).join(' + ')} = ${f(R[i][j])}`) }));
      }
      steps.push({ title: 'Result', text: 'The completed matrix.', lines: mLines(p.op === 'trans' ? 'Aᵀ' : p.op === 'scalar' ? 'kA' : p.op === 'mul' ? 'AB' : p.op === 'add' ? 'A + B' : 'A − B', R, { b: true, c: '#15803d' }) });
      const BA = p.op === 'mul' && B.length === B[0].length && A.length === A[0].length && A.length === B.length ? Mat.mul(B, A) : null;
      return {
        steps, A, B, R, op: p.op,
        formulas: [F('Rule', rule, `A${B ? ', B' : ''}${p.op === 'scalar' ? `, k = ${f(p.k)}` : ''}`, '', matStrInline(R), 'matrix')].concat(BA ? [F('Commutativity check', 'AB = BA ?', '', `BA = ${matStrInline(BA)}`, JSON.stringify(BA) === JSON.stringify(R) ? 'AB = BA here' : 'AB ≠ BA (matrix product is not commutative)', '—')] : []),
        readouts: [{ label: 'Operation', value: { add: 'A + B', sub: 'A − B', scalar: 'kA', mul: 'AB', trans: 'Aᵀ' }[p.op], tone: 'info' }, { label: 'Result order', value: `${R.length}×${R[0].length}`, tone: 'good' }],
        state: { A: matStrInline(A), B: B ? matStrInline(B) : undefined, result: matStrInline(R) },
        explain: { what: `Computing ${{ add: 'A + B', sub: 'A − B', scalar: 'kA', mul: 'AB', trans: 'Aᵀ' }[p.op]} entry by entry.`, why: p.op === 'mul' ? 'Each product entry is the dot product of a row of A with a column of B, so the inner dimensions must match.' : p.op === 'trans' ? 'Transposing reflects the matrix in its leading diagonal.' : 'Addition, subtraction and scalar multiples act on corresponding entries.', param: 'The entries of A, B and the operation.', effect: 'Changing one entry of A changes only the result entries that use that entry (a whole row of AB for a product).' },
      };
    },
    plot(g, box, sol, S) {
      const [bx, by, bw] = box; D.text(g, 'Matrices', bx + 10, by + 18, { size: 16, weight: 800 });
      const cur = S.step; const i = sol.op === 'mul' ? cur - 2 : -1; const last = cur >= S.steps.length - 1;
      const cw = Math.max(40, Math.min(58, (bw - 80) / (sol.A[0].length + (sol.B ? sol.B[0].length : 0)) / 1.15));
      let x = bx + 30; const y = by + 70;
      D.text(g, 'A', x + 10, y - 16, { size: 16, weight: 800 }); x += Work.matrix(g, sol.A, x, y, { cw, cellColor: (r) => (r === i ? '#dc2626' : '#0f172a') }) + 30;
      if (sol.B) { D.text(g, sol.op === 'mul' ? '×' : sol.op === 'add' ? '+' : '−', x - 15, y + 30, { size: 22, weight: 800, align: 'center' }); D.text(g, 'B', x + 10, y - 16, { size: 16, weight: 800 }); Work.matrix(g, sol.B, x, y, { cw }); }
      const Rrow = sol.R.map((r, ri) => r.map((v) => (sol.op !== 'mul' || ri <= i || last ? v : '·')));
      const ry = y + Math.max(sol.A.length, sol.B ? sol.B.length : 0) * 30 + 50; D.text(g, '=', bx + 14, ry + 24, { size: 22, weight: 800 });
      if (last || sol.op === 'mul') Work.matrix(g, Rrow, bx + 30, ry, { cw, cellColor: (r) => (r === i ? '#dc2626' : '#15803d') });
      if (i >= 0 && i < sol.A.length) D.tag(g, `Row ${i + 1} of A · each column of B`, bx + bw / 2, by + box[3] - 24, { bg: '#dc2626', size: 15, align: 'center' });
    },
  });

  // ─────────────── 2. Eigenvalues & eigenvectors (flagship) ───────────────
  define('ma-eigen', {
    params: [A_PARAM('4 1; 2 3'), { key: 'probe', label: 'Test vector direction v', type: 'range', min: 0, max: 360, step: 1, default: 30, unit: '°', help: 'Turn v until v and Av point the same way — that is an eigenvector.' }, { key: 'showGeo', label: 'Show geometric view', type: 'toggle', default: true }],
    examples: [
      { label: 'A = [4 1; 2 3] (λ = 5, 2)', values: { A: '4 1; 2 3' } },
      { label: 'Symmetric 2×2', values: { A: '2 1; 1 2' } },
      { label: 'Rotation (complex λ)', values: { A: '0 -1; 1 0' } },
      { label: '3×3: [2 0 1; 0 2 0; 1 0 2]', values: { A: '2 0 1; 0 2 0; 1 0 2' } },
      { label: '3×3 textbook: [8 -6 2; -6 7 -4; 2 -4 3]', values: { A: '8 -6 2; -6 7 -4; 2 -4 3' } },
    ],
    inputOf: (p) => ({ A: p.A }),
    solve(p) {
      const A = square(Mat.parse(p.A)); const n = A.length; const ch = charSteps(A); const E = Mat.eigen(A); const roots = Poly.roots(ch.cp);
      const fac = factorStr(roots);
      const steps = [
        { title: 'Matrix', text: `A is ${n}×${n}.`, lines: mLines('A', A) },
        { title: 'Characteristic equation det(A − λI) = 0', text: `${Poly.str(ch.cp)} = 0`, lines: ch.lines },
        { title: 'Eigenvalues (roots)', text: roots.map((r) => Num.cfmt(r)).join(', '), lines: [...(fac ? [`${Poly.str(ch.cp)} = ${fac} = 0`] : ['Solving the characteristic polynomial numerically']), ...E.pairs.map((pr, k) => ({ t: `λ${Num.sub(k + 1)} = ${Num.cfmt(pr.value)}${pr.mult > 1 ? `  (repeated ${pr.mult} times)` : ''}`, b: true, c: '#1d4ed8' })), `Check: Σλ = ${f(roots.reduce((s, r) => s + r.re, 0))} = trace(A) = ${f(Mat.trace(A))},  Πλ = |A| = ${f(Mat.det(A))}`] },
      ];
      const real = E.pairs.filter((pr) => Math.abs(pr.value.im) < 1e-9);
      real.forEach((pr) => steps.push({ title: `Eigenvector for λ = ${f(pr.value.re)}`, text: `Solve (A − ${f(pr.value.re)}I)X = 0.`, lines: eigenVecSteps(A, pr.value.re, pr.vectors) }));
      if (real.length < E.pairs.length) steps.push({ title: 'Complex eigenvalues', text: 'No real eigen-directions.', lines: ['The eigenvalues are complex, so no real vector keeps its direction —', 'the transformation turns every vector (it contains a rotation).'] });
      const verif = []; real.forEach((pr) => pr.vectors.forEach((v) => { const Av = Mat.mv(A, v); verif.push(`A${vecStr(v)}ᵀ = ${vecStr(Av)}ᵀ = ${f(pr.value.re)}·${vecStr(v)}ᵀ ✓`); }));
      steps.push({ title: 'Verification & geometry', text: 'AX = λX: eigenvectors keep their direction and are only stretched by λ.', lines: verif.length ? verif : ['No real eigenvectors to verify.'] });
      const nVec = real.reduce((s, pr) => s + pr.vectors.length, 0);
      return {
        steps, A, pairs: E.pairs, n,
        formulas: [
          F('Characteristic equation', 'det(A − λI) = 0', `A = ${matStrInline(A)}`, n === 3 ? `λ³ − (${f(ch.S[0])})λ² + (${f(ch.S[1])})λ − (${f(ch.S[2])})` : `λ² − (${f(ch.S[0])})λ + (${f(ch.S[1])})`, `${Poly.str(ch.cp)} = 0`),
          F('Eigenvalues', 'roots of the characteristic equation', '', fac ? `${fac} = 0` : 'numerical roots', roots.map(Num.cfmt).join(', ')),
          F('Properties', 'Σλᵢ = trace A,  Πλᵢ = |A|', `trace = ${f(Mat.trace(A))}, |A| = ${f(Mat.det(A))}`, '', 'verified'),
        ],
        readouts: [{ label: 'Eigenvalues', value: roots.map(Num.cfmt).join(', '), tone: 'info' }, { label: 'Independent eigenvectors', value: String(nVec), tone: nVec === n ? 'good' : 'warn' }, { label: '|A|', value: f(Mat.det(A)) }],
        state: { matrix: matStrInline(A), characteristicEquation: `${Poly.str(ch.cp)} = 0`, eigenvalues: roots.map(Num.cfmt), eigenvectors: real.map((pr) => ({ lambda: f(pr.value.re), vectors: pr.vectors.map(vecStr) })) },
        explain: { what: `A has eigenvalues ${roots.map(Num.cfmt).join(', ')}. For each real λ the non-zero solutions of (A − λI)X = 0 are the eigenvectors.`, why: 'AX = λX means (A − λI)X = 0 must have a non-zero solution, which happens only when A − λI is singular: det(A − λI) = 0.', param: 'The entries of A (and the test-vector direction in the picture).', effect: 'Changing an entry changes the characteristic polynomial, so the eigenvalues move; symmetric matrices always give real eigenvalues with perpendicular eigenvectors.' },
      };
    },
    plot(g, box, sol, S) {
      const realPairs = sol.pairs.filter((p) => Math.abs(p.value.im) < 1e-9);
      if (sol.n === 2) { if (S.p.showGeo) transformPlot(g, box, sol.A, S.step >= 3 ? realPairs : [], S, { probe: S.p.probe }); else Work.matrix(g, sol.A, box[0] + 80, box[1] + 80, { cw: 70, label: 'A' }); return; }
      const P = Plot.cam({ yaw: 0.7 + S.t * 0.15, pitch: 0.45, zoom: 1 }, box[0] + box[2] / 2, box[1] + box[3] / 2 + 20, 120);
      Plot.axes3(g, P, 1.3, { neg: true });
      const s = 1 / Math.max(1, ...realPairs.map((q) => Math.abs(q.value.re)));
      (S.step >= 3 ? realPairs : []).forEach((pr, k) => pr.vectors.forEach((v) => { const u = Mat.normalize(v); const Au = Mat.mv(sol.A, u); const a = P([0, 0, 0]), b = P(u), c = P(Au.map((x) => x * s)); const col = ['#16a34a', '#ea580c', '#0891b2'][k % 3]; D.arrow(g, a.x, a.y, c.x, c.y, { color: col, width: 5, head: 14, alpha: 0.6 }); D.arrow(g, a.x, a.y, b.x, b.y, { color: '#0f172a', width: 2.5, head: 11 }); D.tag(g, `λ = ${f(pr.value.re)}`, c.x + 6, c.y - 12, { bg: col, size: 14 }); }));
      D.text(g, 'Eigenvectors X (black) and AX (scaled, coloured) lie on the same line', box[0] + 12, box[1] + 18, { size: 14, color: '#475569' });
    },
  });

  // ─────────────── 3. Cayley–Hamilton ───────────────
  define('ma-cayley-hamilton', {
    params: [A_PARAM('1 2; 3 4'), { key: 'inverse', label: 'Also find A⁻¹ using the theorem', type: 'toggle', default: true }],
    examples: [{ label: '2×2 [1 2; 3 4]', values: { A: '1 2; 3 4' } }, { label: '3×3 [1 0 3; 2 1 -1; 1 -1 1]', values: { A: '1 0 3; 2 1 -1; 1 -1 1' } }, { label: '3×3 [2 -1 1; -1 2 -1; 1 -1 2]', values: { A: '2 -1 1; -1 2 -1; 1 -1 2' } }],
    inputOf: (p) => ({ A: p.A }),
    solve(p) {
      const A = square(Mat.parse(p.A)); const n = A.length; const ch = charSteps(A); const cp = ch.cp; const I = Mat.I(n);
      const pw = [I, A]; for (let k = 2; k <= n; k++) pw.push(Mat.mul(pw[k - 1], A));
      let Z = Mat.scale(I, 0); cp.forEach((c, k) => { Z = Mat.add(Z, Mat.scale(pw[n - k], c)); });
      const pA = cp.map((c, k) => (Math.abs(c) > 1e-12 ? `${k === 0 ? '' : c < 0 ? ' − ' : ' + '}${Math.abs(c) === 1 && n - k > 0 ? '' : f(Math.abs(c))}${n - k === 0 ? 'I' : n - k === 1 ? 'A' : 'A' + Num.sup(n - k)}` : '')).join('');
      const steps = [{ title: 'Matrix', text: `${n}×${n} matrix`, lines: mLines('A', A) }, { title: 'Characteristic polynomial', text: `${Poly.str(cp)} = 0`, lines: ch.lines }];
      steps.push({ title: 'Powers of A', text: n === 2 ? 'A² = A·A' : 'A² = A·A and A³ = A²·A', lines: [...mLines('A²', pw[2]), ...(n === 3 ? mLines('A³', pw[3]) : [])] });
      steps.push({ title: 'Substitute A for λ', text: `p(A) = ${pA}`, lines: [`Replace λᵏ by Aᵏ and the constant term c by cI:`, { t: `p(A) = ${pA}`, b: true }] });
      const zero = Z.every((r) => r.every((v) => Math.abs(v) < 1e-7));
      steps.push({ title: 'Verify p(A) = 0', text: zero ? 'Every entry is zero — the theorem holds.' : 'Non-zero entries (numerical issue).', lines: [...mLines('p(A)', Z.map((r) => r.map((v) => (Math.abs(v) < 1e-9 ? 0 : v))), { b: true, c: zero ? '#15803d' : '#b91c1c' }), { t: zero ? 'p(A) = O  ✓  A satisfies its own characteristic equation.' : 'Check the input.', b: true, c: '#15803d' }] });
      let inv = null;
      if (p.inverse) {
        const detA = Mat.det(A);
        if (Math.abs(detA) < 1e-12) steps.push({ title: 'Inverse', text: '|A| = 0 so A⁻¹ does not exist.', lines: ['|A| = 0 → A is singular, no inverse.'] });
        else {
          let T = Mat.scale(I, 0); for (let k = 0; k < n; k++) T = Mat.add(T, Mat.scale(pw[n - 1 - k], cp[k]));
          inv = Mat.scale(T, -1 / cp[n]);
          const check = Mat.mul(A, inv);
          steps.push({ title: 'A⁻¹ from the theorem', text: 'Multiply p(A) = O by A⁻¹.', lines: [`${pA} = O`, `Multiply by A⁻¹:  ${cp.slice(0, n).map((c, k) => (Math.abs(c) > 1e-12 ? `${k === 0 ? '' : c < 0 ? ' − ' : ' + '}${Math.abs(c) === 1 && n - 1 - k > 0 ? '' : f(Math.abs(c))}${n - 1 - k === 0 ? 'I' : n - 1 - k === 1 ? 'A' : 'A' + Num.sup(n - 1 - k)}` : '')).join('')} ${cp[n] < 0 ? '−' : '+'} ${f(Math.abs(cp[n]))}A⁻¹ = O`, `⇒ A⁻¹ = −(1/${f(cp[n])}) × (${cp.slice(0, n).map((c, k) => (Math.abs(c) > 1e-12 ? `${k === 0 ? '' : c < 0 ? ' − ' : ' + '}${Math.abs(c) === 1 && n - 1 - k > 0 ? '' : f(Math.abs(c))}${n - 1 - k === 0 ? 'I' : n - 1 - k === 1 ? 'A' : 'A' + Num.sup(n - 1 - k)}` : '')).join('')})`, ...mLines('A⁻¹', inv, { b: true, c: '#15803d' }), `Check: A·A⁻¹ = ${matStrInline(check.map((r) => r.map((v) => Math.round(v * 1e9) / 1e9)))} = I ✓`] });
        }
      }
      return {
        steps, A, Z, inv, pw, n,
        formulas: [F('Cayley–Hamilton theorem', 'Every square matrix satisfies its characteristic equation: p(A) = O', `p(λ) = ${Poly.str(cp)}`, `p(A) = ${pA}`, zero ? 'O (zero matrix) ✓' : 'check', 'matrix'), ...(inv ? [F('Inverse', n === 2 ? 'A⁻¹ = (S₁I − A)/|A|' : 'A⁻¹ = (A² − S₁A + S₂I)/S₃', `|A| = ${f(Mat.det(A))}`, '', matStrInline(inv), 'matrix')] : [])],
        readouts: [{ label: 'p(λ)', value: Poly.str(cp), tone: 'info' }, { label: 'p(A)', value: zero ? 'O ✓' : '≠ O', tone: zero ? 'good' : 'bad' }, { label: '|A|', value: f(Mat.det(A)) }],
        state: { matrix: matStrInline(A), characteristicPolynomial: Poly.str(cp), pOfA: zero ? 'zero matrix' : 'non-zero', inverse: inv ? matStrInline(inv) : 'not requested / does not exist' },
        explain: { what: 'We compute the characteristic polynomial, replace λ by A (and the constant by a multiple of I) and check that the result is the zero matrix.', why: 'The Cayley–Hamilton theorem guarantees p(A) = O for every square matrix, which lets us write A⁻¹ and higher powers of A as combinations of lower powers.', param: 'The entries of A.', effect: 'Any change to A changes p(λ), but p(A) is still the zero matrix — the theorem always holds.' },
      };
    },
    plot(g, box, sol, S) {
      const [bx, by] = box; D.text(g, 'p(A) evaluated', bx + 10, by + 18, { size: 16, weight: 800 });
      const cw = sol.n === 3 ? 54 : 70; let y = by + 60;
      Work.matrix(g, sol.A, bx + 60, y, { cw, label: 'A' }); if (S.step >= 2) Work.matrix(g, sol.pw[2], bx + 60 + (sol.n * cw + 70), y, { cw, label: 'A²' });
      y += sol.n * 30 + 60;
      if (S.step >= 4) Work.matrix(g, sol.Z.map((r) => r.map((v) => (Math.abs(v) < 1e-9 ? 0 : v))), bx + 90, y, { cw, label: 'p(A)', color: '#15803d' });
      if (sol.inv && S.step >= 5) Work.matrix(g, sol.inv.map((r) => r.map((v) => f(v))), bx + 90 + sol.n * cw + 90, y, { cw, label: 'A⁻¹', color: '#1d4ed8' });
      if (S.step >= 4) D.tag(g, 'A satisfies its own characteristic equation', bx + box[2] / 2, by + box[3] - 24, { bg: '#16a34a', size: 15, align: 'center' });
    },
  });

  // ─────────────── 4. Diagonalization ───────────────
  define('ma-diagonalization', {
    params: [A_PARAM('4 1; 2 3'), { key: 'orth', label: 'Use orthogonal reduction (symmetric A)', type: 'toggle', default: false }],
    examples: [{ label: '2×2 [4 1; 2 3]', values: { A: '4 1; 2 3', orth: false } }, { label: 'Symmetric 3×3 (orthogonal)', values: { A: '6 -2 2; -2 3 -1; 2 -1 3', orth: true } }, { label: 'Not diagonalizable [2 1; 0 2]', values: { A: '2 1; 0 2', orth: false } }, { label: '3×3 [1 1 3; 1 5 1; 3 1 1]', values: { A: '1 1 3; 1 5 1; 3 1 1', orth: true } }],
    inputOf: (p) => ({ A: p.A, orthogonal: p.orth }),
    solve(p) {
      const A = square(Mat.parse(p.A)); const n = A.length; const ch = charSteps(A); const E = Mat.eigen(A);
      if (E.pairs.some((pr) => Math.abs(pr.value.im) > 1e-9)) throw new ParseError('This matrix has complex eigenvalues — it cannot be diagonalised over the real numbers.');
      const steps = [{ title: 'Matrix', text: '', lines: mLines('A', A) }, { title: 'Eigenvalues', text: E.pairs.map((x) => f(x.value.re)).join(', '), lines: [...ch.lines, ...E.pairs.map((x, k) => ({ t: `λ${Num.sub(k + 1)} = ${f(x.value.re)}${x.mult > 1 ? ` (×${x.mult})` : ''}`, b: true, c: '#1d4ed8' }))] }];
      E.pairs.forEach((pr) => steps.push({ title: `Eigenvector for λ = ${f(pr.value.re)}`, text: '', lines: eigenVecSteps(A, pr.value.re, pr.vectors) }));
      const cols = []; const vals = []; E.pairs.forEach((pr) => pr.vectors.forEach((v) => { cols.push(v); vals.push(pr.value.re); }));
      if (cols.length < n) {
        steps.push({ title: 'Not diagonalizable', text: `Only ${cols.length} independent eigenvector(s) for a ${n}×${n} matrix.`, lines: ['A repeated eigenvalue gives fewer eigenvectors than its multiplicity,', 'so no invertible modal matrix P exists: A is NOT diagonalizable.'] });
        return { steps, A, n, ok2: false, formulas: [F('Condition', 'A is diagonalizable ⇔ it has n independent eigenvectors', `n = ${n}`, `independent eigenvectors = ${cols.length}`, 'Not diagonalizable')], readouts: [{ label: 'Diagonalizable', value: 'NO', tone: 'bad' }], state: { matrix: matStrInline(A), diagonalizable: false }, explain: { what: 'The eigenvectors do not span the space.', why: 'A defective (repeated) eigenvalue has too few eigenvectors.', param: 'Entries of A.', effect: 'Changing an off-diagonal entry can separate the repeated eigenvalue and make A diagonalizable.' } };
      }
      const orth = p.orth && Mat.isSymmetric(A);
      let P = Mat.T(cols); let Pinv;
      if (orth) {
        const ortho = []; cols.forEach((v) => { let w = v.slice(); ortho.forEach((u) => { const d = w.reduce((s, x, i) => s + x * u[i], 0); w = w.map((x, i) => x - d * u[i]); }); ortho.push(Mat.normalize(w)); });
        P = Mat.T(ortho); Pinv = Mat.T(P);
        steps.push({ title: 'Normalised modal matrix N', text: 'Divide each eigenvector by its length (orthonormal columns).', lines: [...ortho.map((u, k) => `e${Num.sub(k + 1)} = ${vecStr(u)}`), ...mLines('N', P)] });
      } else {
        Pinv = Mat.inv(P);
        steps.push({ title: 'Modal matrix P and P⁻¹', text: 'Eigenvectors as columns.', lines: [...mLines('P', P), `|P| = ${f(Mat.det(P))} ≠ 0`, ...mLines('P⁻¹', Pinv)] });
      }
      const Dm = Mat.mul(Mat.mul(Pinv, A), P).map((r) => r.map((v) => (Math.abs(v) < 1e-9 ? 0 : v)));
      steps.push({ title: orth ? 'D = Nᵀ A N' : 'D = P⁻¹ A P', text: 'The diagonal holds the eigenvalues in the same order as the columns.', lines: [...mLines('D', Dm, { b: true, c: '#15803d' }), `Diagonal entries = ${vals.map(f).join(', ')} ✓`] });
      const back = Mat.mul(Mat.mul(P, Dm), Pinv);
      steps.push({ title: 'Verify A = P D P⁻¹', text: 'Transforming back recovers A.', lines: [...mLines(orth ? 'N D Nᵀ' : 'P D P⁻¹', back.map((r) => r.map((v) => Math.round(v * 1e9) / 1e9))), 'A = PDP⁻¹ ⇒ Aᵏ = P Dᵏ P⁻¹ (easy powers).'] });
      return {
        steps, A, P, Dm, n, ok2: true, orth, vals,
        formulas: [F('Diagonalisation', orth ? 'D = Nᵀ A N (N orthogonal: N⁻¹ = Nᵀ)' : 'D = P⁻¹ A P', `P = ${matStrInline(P)}`, '', matStrInline(Dm), 'matrix'), F('Powers', 'Aᵏ = P Dᵏ P⁻¹', '', '', 'computed by powering the diagonal only')],
        readouts: [{ label: 'Diagonalizable', value: 'YES', tone: 'good' }, { label: 'D', value: `diag(${vals.map(f).join(', ')})`, tone: 'info' }, { label: 'Method', value: orth ? 'orthogonal' : 'similarity' }],
        state: { matrix: matStrInline(A), modalMatrix: matStrInline(P), diagonal: matStrInline(Dm), orthogonal: orth },
        explain: { what: `A becomes the diagonal matrix of its eigenvalues ${vals.map(f).join(', ')} in the basis of its eigenvectors.`, why: 'In the eigenvector basis A only stretches each basis vector by its eigenvalue, so its matrix there is diagonal.', param: 'Entries of A and whether the orthogonal (symmetric) method is used.', effect: p.orth && !Mat.isSymmetric(A) ? 'Orthogonal reduction needs a symmetric matrix — the ordinary P⁻¹AP method was used.' : 'For a symmetric matrix the eigenvectors are perpendicular, so P can be orthogonal and P⁻¹ = Pᵀ.' },
        warnings: p.orth && !Mat.isSymmetric(A) ? ['Orthogonal reduction needs a symmetric matrix — using P⁻¹AP instead.'] : [],
      };
    },
    plot(g, box, sol, S) {
      const [bx, by] = box; D.text(g, 'Similarity transformation', bx + 10, by + 18, { size: 16, weight: 800 });
      if (!sol.ok2) { D.tag(g, 'Not diagonalizable', bx + box[2] / 2, by + 200, { bg: '#dc2626', size: 18, align: 'center' }); return; }
      if (sol.n === 2) transformPlot(g, [bx, by + 28, box[2], 320], sol.A, sol.vals.map((v, k) => ({ value: { re: v, im: 0 }, vectors: [Mat.T(sol.P)[k]] })), S);
      const y = sol.n === 2 ? by + 372 : by + 60; const cw = sol.n === 3 ? 60 : 62;
      let x = bx + 50; x += Work.matrix(g, sol.P.map((r) => r.map((v) => Num.dec(v, 3))), x, y, { cw, label: sol.orth ? 'N' : 'P' }) + 70;
      if (S.step >= S.steps.length - 2) Work.matrix(g, sol.Dm, x, y, { cw, label: 'D', color: '#15803d' });
    },
  });

  // ─────────────── 5. Orthogonal transformation ───────────────
  define('ma-orthogonal', {
    modes: [{ key: 'rotation', label: 'Rotation (orthogonal matrix)' }, { key: 'reflection', label: 'Reflection' }, { key: 'quadratic', label: 'Quadratic form → canonical form' }],
    params: [
      { key: 'theta', label: 'Angle θ', type: 'range', min: -180, max: 180, step: 1, default: 40, unit: '°', showIf: (p) => p.mode !== 'quadratic' },
      { key: 'u', label: 'Vector u', type: 'text', default: '2 1', showIf: (p) => p.mode !== 'quadratic' },
      { key: 'v', label: 'Vector v', type: 'text', default: '-1 2', showIf: (p) => p.mode !== 'quadratic' },
      { key: 'Q', label: 'Symmetric matrix of the quadratic form', type: 'text', default: '3 1; 1 3', showIf: (p) => p.mode === 'quadratic', help: 'Q = XᵀAX. For 3x² + 2xy + 3y² enter 3 1; 1 3 (off-diagonal = half the xy coefficient).' },
    ],
    examples: [{ label: 'Rotation by 40°', values: { mode: 'rotation', theta: 40, u: '2 1', v: '-1 2' } }, { label: 'Reflection in y = x', values: { mode: 'reflection', theta: 45, u: '2 0.5', v: '0 1.5' } }, { label: 'Q = 3x² + 2xy + 3y²', values: { mode: 'quadratic', Q: '3 1; 1 3' } }, { label: '3-variable form', values: { mode: 'quadratic', Q: '3 -1 1; -1 5 -1; 1 -1 3' } }],
    inputOf: (p) => (p.mode === 'quadratic' ? { quadraticFormMatrix: p.Q } : { theta: p.theta, u: p.u, v: p.v }),
    solve(p) {
      if (p.mode === 'quadratic') {
        const A = square(Mat.parse(p.Q)); if (!Mat.isSymmetric(A)) throw new ParseError('The matrix of a quadratic form must be symmetric (aᵢⱼ = aⱼᵢ).');
        const n = A.length; const vars = ['x', 'y', 'z'].slice(0, n); const terms = [];
        for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { const c = i === j ? A[i][i] : 2 * A[i][j]; if (Math.abs(c) > 1e-12) terms.push(`${c < 0 ? '− ' : terms.length ? '+ ' : ''}${Math.abs(c) === 1 ? '' : f(Math.abs(c))}${vars[i]}${i === j ? '²' : vars[j]}`); }
        const E = Mat.eigen(A); const ch = charSteps(A); const vals = []; const vecs = [];
        E.pairs.forEach((pr) => pr.vectors.forEach((v) => { vals.push(pr.value.re); vecs.push(v); }));
        const ortho = []; vecs.forEach((v) => { let w = v.slice(); ortho.forEach((u) => { const d = w.reduce((s, x, i) => s + x * u[i], 0); w = w.map((x, i) => x - d * u[i]); }); ortho.push(Mat.normalize(w)); });
        const N = Mat.T(ortho); const Dm = Mat.mul(Mat.mul(Mat.T(N), A), N).map((r) => r.map((v) => (Math.abs(v) < 1e-9 ? 0 : v)));
        const Yv = ['y₁', 'y₂', 'y₃'].slice(0, n); const canon = vals.map((l, k) => `${k && l >= 0 ? '+ ' : l < 0 ? '− ' : ''}${f(Math.abs(l))}${Yv[k]}²`).join(' ');
        const pos = vals.filter((l) => l > 1e-9).length, neg = vals.filter((l) => l < -1e-9).length, zer = n - pos - neg;
        const nature = neg === 0 && zer === 0 ? 'positive definite' : pos === 0 && zer === 0 ? 'negative definite' : neg === 0 ? 'positive semi-definite' : pos === 0 ? 'negative semi-definite' : 'indefinite';
        const steps = [
          { title: 'Quadratic form and its matrix', text: `Q = ${terms.join(' ')}`, lines: [`Q = ${terms.join(' ')} = XᵀAX`, ...mLines('A', A)] },
          { title: 'Eigenvalues of A', text: vals.map(f).join(', '), lines: [...ch.lines, ...vals.map((l, k) => ({ t: `λ${Num.sub(k + 1)} = ${f(l)}`, b: true, c: '#1d4ed8' }))] },
          { title: 'Orthonormal eigenvectors', text: 'Normalised eigenvectors form the orthogonal matrix N.', lines: [...ortho.map((u, k) => `e${Num.sub(k + 1)} = ${vecStr(u)}`), ...mLines('N', N), 'NᵀN = I (orthogonal)'] },
          { title: 'Orthogonal transformation X = NY', text: 'NᵀAN = D (diagonal).', lines: mLines('NᵀAN', Dm) },
          { title: 'Canonical form & nature', text: `Q = ${canon}; ${nature}`, lines: [{ t: `Canonical form:  Q = ${canon}`, b: true, c: '#15803d' }, `Rank = ${pos + neg}, index = ${pos}, signature = ${pos - neg}`, { t: `Nature: ${nature}`, b: true }] },
        ];
        return { steps, mode: 'quadratic', A, N, vals, n, formulas: [F('Orthogonal reduction', 'X = NY ⇒ XᵀAX = Yᵀ(NᵀAN)Y = Σ λᵢyᵢ²', '', '', canon), F('Nature', 'signs of the eigenvalues', vals.map(f).join(', '), `rank ${pos + neg}, index ${pos}, signature ${pos - neg}`, nature)], readouts: [{ label: 'Canonical form', value: canon, tone: 'info' }, { label: 'Nature', value: nature, tone: 'good' }], state: { quadraticForm: terms.join(' '), eigenvalues: vals.map(f), canonicalForm: canon, nature }, explain: { what: 'An orthogonal change of variables X = NY removes all the cross terms of the quadratic form.', why: 'A symmetric matrix has orthonormal eigenvectors, so NᵀAN is diagonal and lengths are preserved (N is a rotation/reflection).', param: 'The symmetric matrix of the form.', effect: 'The eigenvalue signs decide the nature: all positive → positive definite (an ellipse/ellipsoid level set), mixed → indefinite (hyperbola).' } };
      }
      const th = (p.theta * Math.PI) / 180; const c = Math.cos(th), s = Math.sin(th);
      const Q = p.mode === 'rotation' ? [[c, -s], [s, c]] : [[Math.cos(2 * th), Math.sin(2 * th)], [Math.sin(2 * th), -Math.cos(2 * th)]];
      const pv = (t) => { const v = String(t).trim().split(/[\s,;]+/).map(Number); if (v.length !== 2 || v.some((x) => !Number.isFinite(x))) throw new ParseError('Vectors need two numbers, e.g. 2 1'); return v; };
      const u = pv(p.u), v = pv(p.v); const Qu = Mat.mv(Q, u), Qv = Mat.mv(Q, v);
      const len = (w) => Math.hypot(...w); const dot = (a, b) => a[0] * b[0] + a[1] * b[1]; const ang = (a, b) => (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (len(a) * len(b) || 1)))) * 180) / Math.PI;
      const QtQ = Mat.mul(Mat.T(Q), Q).map((r) => r.map((x) => Math.round(x * 1e9) / 1e9));
      const steps = [
        { title: p.mode === 'rotation' ? `Rotation matrix for θ = ${p.theta}°` : `Reflection in the line at ${p.theta}°`, text: '', lines: [p.mode === 'rotation' ? 'Q = [cos θ  −sin θ ; sin θ  cos θ]' : 'Q = [cos 2θ  sin 2θ ; sin 2θ  −cos 2θ]', ...mLines('Q', Q.map((r) => r.map((x) => Number(x.toFixed(4)))))] },
        { title: 'Q is orthogonal', text: 'QᵀQ = I and |Q| = ±1', lines: [...mLines('QᵀQ', QtQ), `|Q| = ${f(Math.round(Mat.det(Q) * 1e9) / 1e9)}  (${p.mode === 'rotation' ? '+1: rotation' : '−1: reflection'})`] },
        { title: 'Transform the vectors', text: 'u′ = Qu, v′ = Qv', lines: [`u′ = Q${vecStr(u)} = (${Qu.map((x) => Num.dec(x, 3)).join(', ')})`, `v′ = Q${vecStr(v)} = (${Qv.map((x) => Num.dec(x, 3)).join(', ')})`] },
        { title: 'Lengths and angles are preserved', text: 'Dot products are unchanged.', lines: [`|u| = ${Num.dec(len(u), 4)},  |u′| = ${Num.dec(len(Qu), 4)}`, `|v| = ${Num.dec(len(v), 4)},  |v′| = ${Num.dec(len(Qv), 4)}`, `angle(u, v) = ${Num.dec(ang(u, v), 3)}°,  angle(u′, v′) = ${Num.dec(ang(Qu, Qv), 3)}°`, { t: 'u·v = u′·v′ = ' + Num.dec(dot(u, v), 4) + ' ✓', b: true, c: '#15803d' }] },
      ];
      return { steps, mode: p.mode, Q, u, v, Qu, Qv, th, formulas: [F('Orthogonal matrix', 'QᵀQ = I ⇒ |Qx| = |x|,  Qx·Qy = x·y', `θ = ${p.theta}°`, '', `|Q| = ${Num.dec(Mat.det(Q), 3)}`)], readouts: [{ label: '|u| = |u′|', value: Num.dec(len(u), 4), tone: 'good' }, { label: 'angle kept', value: `${Num.dec(ang(u, v), 3)}°`, tone: 'good' }, { label: '|Q|', value: Num.dec(Mat.det(Q), 3), tone: 'info' }], state: { transformation: p.mode, theta: p.theta, Q: matStrInline(Q.map((r) => r.map((x) => Number(x.toFixed(4))))), u: vecStr(u), uImage: vecStr(Qu.map((x) => Number(x.toFixed(4)))) }, explain: { what: `Every vector is ${p.mode === 'rotation' ? `rotated by ${p.theta}°` : `reflected in the line at ${p.theta}°`}.`, why: 'Because QᵀQ = I, dot products (and hence lengths and angles) do not change: an orthogonal transformation moves figures rigidly.', param: 'The angle θ and the vectors.', effect: 'Changing θ turns the image vectors, but their lengths and the angle between them stay the same.' } };
    },
    plot(g, box, sol, S) {
      if (sol.mode === 'quadratic') {
        if (sol.n !== 2) { D.text(g, 'Canonical form reached — 3-variable form (see the working)', box[0] + box[2] / 2, box[1] + 200, { size: 16, align: 'center', color: '#475569' }); return; }
        const A = sol.A; const Ax = Plot.axes(g, box, [-2, 2], [-2, 2], { equal: true, xl: 'x', yl: 'y' });
        Plot.contour(g, Ax, (x, y) => A[0][0] * x * x + 2 * A[0][1] * x * y + A[1][1] * y * y, { fill: false, levels: [1, 2, 3], lineColor: '#7c3aed' });
        Mat.T(sol.N).forEach((e, k) => { D.arrow(g, Ax.X(0), Ax.Y(0), Ax.X(e[0] * 1.5), Ax.Y(e[1] * 1.5), { color: ['#16a34a', '#ea580c'][k], width: 3.5 }); D.tag(g, `y${Num.sub(k + 1)}-axis (λ = ${f(sol.vals[k])})`, Ax.X(e[0] * 1.5) + 6, Ax.Y(e[1] * 1.5) - 12, { bg: ['#16a34a', '#ea580c'][k], size: 14 }); });
        D.text(g, 'Level curves Q = 1, 2, 3 and the new (principal) axes', box[0] + 12, box[1] + 18, { size: 14, color: '#475569' });
        return;
      }
      const R = Math.max(2.5, ...[...sol.u, ...sol.v].map(Math.abs)) * 1.3; const Ax = Plot.axes(g, box, [-R, R], [-R, R], { equal: true, xl: 'x', yl: 'y' });
      if (sol.mode === 'reflection') Plot.clip(g, Ax, () => D.line(g, Ax.X(-R * 2 * Math.cos(sol.th)), Ax.Y(-R * 2 * Math.sin(sol.th)), Ax.X(R * 2 * Math.cos(sol.th)), Ax.Y(R * 2 * Math.sin(sol.th)), { color: '#94a3b8', width: 2, dash: [8, 5] }));
      const k = S.step >= 2 ? (S.step === 2 ? Math.min(1, S.st / S.dur) : 1) : 0; const Qk = sol.mode === 'rotation' ? [[Math.cos(sol.th * k), -Math.sin(sol.th * k)], [Math.sin(sol.th * k), Math.cos(sol.th * k)]] : Mat.add(Mat.scale(Mat.I(2), 1 - k), Mat.scale(sol.Q, k));
      const tri = (Mx, col, alpha) => Plot.clip(g, Ax, () => { const a = Mat.mv(Mx, sol.u), b = Mat.mv(Mx, sol.v); D.poly(g, [[Ax.X(0), Ax.Y(0)], [Ax.X(a[0]), Ax.Y(a[1])], [Ax.X(b[0]), Ax.Y(b[1])]], { fill: col, close: true, alpha, stroke: col, width: 1 }); D.arrow(g, Ax.X(0), Ax.Y(0), Ax.X(a[0]), Ax.Y(a[1]), { color: col, width: 3.5 }); D.arrow(g, Ax.X(0), Ax.Y(0), Ax.X(b[0]), Ax.Y(b[1]), { color: col, width: 3.5 }); });
      tri(Mat.I(2), '#2563eb', 0.15); if (S.step >= 2) tri(Qk, '#dc2626', 0.2);
      D.text(g, 'blue: u, v    red: Qu, Qv (same lengths, same angle)', box[0] + 12, box[1] + 18, { size: 14, color: '#475569' });
    },
  });

  // ─────────────── 6. Matrix applications ───────────────
  define('ma-matrix-applications', {
    modes: [{ key: 'system', label: 'System of linear equations' }, { key: 'markov', label: 'Population / Markov model' }],
    params: [
      { key: 'eq', label: 'Augmented matrix [A | B]', type: 'text', default: '1 1 1 6; 1 2 3 14; 1 4 9 36', showIf: (p) => p.mode !== 'markov', help: 'x + y + z = 6, x + 2y + 3z = 14, x + 4y + 9z = 36 → 1 1 1 6; 1 2 3 14; 1 4 9 36' },
      { key: 'P', label: 'Transition matrix (columns sum to 1)', type: 'text', default: '0.9 0.2; 0.1 0.8', showIf: (p) => p.mode === 'markov' },
      { key: 'x0', label: 'Initial population', type: 'text', default: '600 400', showIf: (p) => p.mode === 'markov' },
      { key: 'years', label: 'Years to simulate', type: 'range', min: 1, max: 30, step: 1, default: 10, showIf: (p) => p.mode === 'markov' },
    ],
    examples: [{ label: '3 equations, 3 unknowns', values: { mode: 'system', eq: '1 1 1 6; 1 2 3 14; 1 4 9 36' } }, { label: 'Electrical circuit currents', values: { mode: 'system', eq: '10 -4 0 12; -4 12 -5 0; 0 -5 9 6' } }, { label: '2 equations (lines meet)', values: { mode: 'system', eq: '2 1 5; 1 -3 -1' } }, { label: 'City ↔ suburb migration', values: { mode: 'markov', P: '0.95 0.03; 0.05 0.97', x0: '600 400', years: 20 } }],
    inputOf: (p) => (p.mode === 'markov' ? { P: p.P, x0: p.x0, years: p.years } : { augmented: p.eq }),
    solve(p) {
      if (p.mode === 'markov') {
        const P = square(Mat.parse(p.P), 3); const x0 = String(p.x0).trim().split(/[\s,;]+/).map(Number);
        if (x0.length !== P.length || x0.some((v) => !Number.isFinite(v))) throw new ParseError(`Enter ${P.length} starting values.`);
        if (P.some((r) => r.some((v) => v < 0)) || Mat.T(P).some((c) => Math.abs(c.reduce((a, b) => a + b, 0) - 1) > 1e-6)) throw new ParseError('Each column of the transition matrix must be non-negative and sum to 1.');
        const hist = [x0]; for (let k = 0; k < p.years; k++) hist.push(Mat.mv(P, hist[k]));
        const E = Mat.eigen(P); const one = E.pairs.find((pr) => Math.abs(pr.value.re - 1) < 1e-6 && pr.vectors && pr.vectors.length); const ss = one ? one.vectors[0].map((v) => v / one.vectors[0].reduce((a, b) => a + b, 0)) : null; const total = x0.reduce((a, b) => a + b, 0);
        const steps = [
          { title: 'Input', text: 'Fractions moving between groups each year.', lines: [...mLines('P', P), `x₀ = ${vecStr(x0)}ᵀ`] },
          { title: 'Matrix formulation', text: 'x_{k+1} = P x_k', lines: ['x_{k+1} = P x_k  ⇒  x_k = Pᵏ x₀', `x₁ = P x₀ = ${vecStr(hist[1].map((v) => Number(v.toFixed(2))))}ᵀ`, ...(hist[2] ? [`x₂ = P x₁ = ${vecStr(hist[2].map((v) => Number(v.toFixed(2))))}ᵀ`] : [])] },
          { title: `After ${p.years} years`, text: '', lines: [`x_${p.years} = ${vecStr(hist[p.years].map((v) => Number(v.toFixed(2))))}ᵀ`] },
          { title: 'Steady state (eigenvector for λ = 1)', text: 'Px = x', lines: ss ? [`(P − I)x = 0 ⇒ x ∝ ${vecStr(one.vectors[0])}`, { t: `Long-run split = ${vecStr(ss.map((v) => Number((v * total).toFixed(2))))}  (${ss.map((v) => Num.dec(v * 100, 3) + '%').join(', ')})`, b: true, c: '#15803d' }] : ['No steady state found.'] },
        ];
        return { steps, mode: 'markov', hist, ss, total, formulas: [F('Markov model', 'x_{k+1} = P x_k,  steady state: P x = x', `x₀ = ${vecStr(x0)}`, '', ss ? vecStr(ss.map((v) => Number((v * total).toFixed(2)))) : '—')], readouts: [{ label: `Year ${p.years}`, value: vecStr(hist[p.years].map((v) => Math.round(v))), tone: 'info' }, { label: 'Steady state', value: ss ? vecStr(ss.map((v) => Math.round(v * total))) : '—', tone: 'good' }], state: { model: 'Markov', P: matStrInline(P), x0: vecStr(x0), afterYears: vecStr(hist[p.years].map((v) => Number(v.toFixed(2)))), steadyState: ss ? vecStr(ss.map((v) => Number((v * total).toFixed(2)))) : null }, explain: { what: 'Each year the population vector is multiplied by the transition matrix.', why: 'The steady state is the eigenvector of P for eigenvalue 1 (normalised to the total), because it does not change when multiplied by P.', param: 'Transition fractions, starting population and number of years.', effect: 'The long-run split depends only on P, not on the starting numbers.' } };
      }
      const Aug = Mat.parse(p.eq); const n = Aug.length; if (Aug[0].length !== n + 1 || n > 4) throw new ParseError('Enter n equations (n ≤ 4) with n unknowns + the right-hand side: n rows of n+1 numbers.');
      const A = Aug.map((r) => r.slice(0, n)), B = Aug.map((r) => r[n]); const d = Mat.det(A); const names = ['x', 'y', 'z', 'w'].slice(0, n);
      const eqs = A.map((r, i) => r.map((c, j) => `${j && c >= 0 ? '+ ' : c < 0 ? '− ' : ''}${Math.abs(c) === 1 ? '' : f(Math.abs(c))}${names[j]}`).join(' ') + ` = ${f(B[i])}`);
      const steps = [{ title: 'Input equations', text: '', lines: eqs }, { title: 'Matrix formulation AX = B', text: '', lines: [...mLines('A', A), `B = ${vecStr(B)}ᵀ`, `|A| = ${f(d)}`] }];
      if (Math.abs(d) < 1e-12) { steps.push({ title: 'Singular system', text: '|A| = 0', lines: ['|A| = 0: the system has no unique solution (either none or infinitely many).'] }); return { steps, mode: 'system', A, B, X: null, names, formulas: [F('Condition', 'unique solution ⇔ |A| ≠ 0', '', '', 'no unique solution')], readouts: [{ label: '|A|', value: '0', tone: 'bad' }], state: { equations: eqs, determinant: 0 }, explain: { what: 'The coefficient matrix is singular.', why: 'Its rows are dependent.', param: 'Coefficients.', effect: 'Change a coefficient to make |A| ≠ 0.' } }; }
      const Mx = Aug.map((r) => r.slice()); const log = [];
      for (let c = 0; c < n; c++) { let pr = c; for (let r = c + 1; r < n; r++) if (Math.abs(Mx[r][c]) > Math.abs(Mx[pr][c])) pr = r; if (pr !== c) { [Mx[c], Mx[pr]] = [Mx[pr], Mx[c]]; log.push(`R${c + 1} ↔ R${pr + 1}`); } for (let r = c + 1; r < n; r++) { const fct = Mx[r][c] / Mx[c][c]; if (Math.abs(fct) < 1e-12) continue; Mx[r] = Mx[r].map((v, k) => v - fct * Mx[c][k]); log.push(`R${r + 1} → R${r + 1} − (${f(fct)})R${c + 1}`); } }
      const X = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) X[i] = (Mx[i][n] - Mx[i].slice(i + 1, n).reduce((s, v, k) => s + v * X[i + 1 + k], 0)) / Mx[i][i];
      steps.push({ title: 'Gauss elimination', text: 'Reduce to upper-triangular form.', lines: [...log, ...mLines('[U | c]', Mx.map((r) => r.map((v) => Number(v.toFixed(4)))))] });
      steps.push({ title: 'Back substitution', text: '', lines: X.map((v, i) => ({ t: `${names[i]} = ${f(v)}`, b: true, c: '#15803d' })).concat([`Check: AX = ${vecStr(Mat.mv(A, X).map((v) => Math.round(v * 1e9) / 1e9))} = B ✓`]) });
      return { steps, mode: 'system', A, B, X, names, formulas: [F('Solution', 'X = A⁻¹B (Gauss elimination)', `|A| = ${f(d)}`, '', names.map((nm, i) => `${nm} = ${f(X[i])}`).join(', '))], readouts: [{ label: 'Solution', value: names.map((nm, i) => `${nm}=${f(X[i])}`).join(' '), tone: 'good' }, { label: '|A|', value: f(d) }], state: { equations: eqs, solution: Object.fromEntries(names.map((nm, i) => [nm, f(X[i])])) }, explain: { what: 'The equations are written as AX = B and solved by elimination.', why: 'Row operations do not change the solution set, so the triangular system gives the unknowns by back substitution.', param: 'Coefficients and right-hand sides.', effect: 'If |A| becomes 0 the system no longer has a unique solution.' } };
    },
    plot(g, box, sol, S) {
      if (sol.mode === 'markov') { const H = sol.hist; const ymax = Math.max(...H.flat()) * 1.1; const A = Plot.axes(g, [box[0] + 40, box[1] + 30, box[2] - 60, box[3] - 70], [0, H.length - 1], [0, ymax], { xl: 'year', yl: 'population' }); H[0].forEach((_, k) => { const col = ['#2563eb', '#dc2626', '#16a34a'][k]; D.poly(g, H.map((x, i) => [A.X(i), A.Y(x[k])]), { stroke: col, width: 3 }); if (sol.ss) Plot.clip(g, A, () => D.line(g, A.X(0), A.Y(sol.ss[k] * sol.total), A.X(H.length - 1), A.Y(sol.ss[k] * sol.total), { color: col, dash: [6, 5], width: 1.5 })); }); D.text(g, 'Populations over time (dashed = steady state)', box[0] + 12, box[1] + 16, { size: 14, color: '#475569' }); return; }
      if (sol.A.length === 2 && sol.X) { const A = Plot.axes(g, box, [sol.X[0] - 5, sol.X[0] + 5], [sol.X[1] - 5, sol.X[1] + 5], { equal: true, xl: 'x', yl: 'y' }); sol.A.forEach((r, i) => Plot.curve(g, A, (x) => (sol.B[i] - r[0] * x) / r[1], { color: ['#2563eb', '#dc2626'][i] })); if (S.step >= 2) Plot.point(g, A, sol.X[0], sol.X[1], `(${f(sol.X[0])}, ${f(sol.X[1])})`); return; }
      Work.matrix(g, sol.A, box[0] + 70, box[1] + 60, { cw: 60, label: 'A' });
      if (sol.X && S.step >= S.steps.length - 1) sol.X.forEach((v, i) => D.tag(g, `${sol.names[i]} = ${f(v)}`, box[0] + box[2] / 2, box[1] + 280 + i * 42, { bg: '#16a34a', size: 18, align: 'center' }));
    },
  });
})();
