'use strict';

/* U25EEG02 — Unit I: Basic Concepts of Electric Circuits (8 simulations). */
(function () {
  const S = (window.EESims = window.EESims || {});
  const D = window.EPDraw; const K = window.EEKit; const KINDS = window.EEChallengeKinds; const C = D.C;
  const { si, n } = K;
  const F = (name, formula, given, calc, result, unit) => ({ name, formula, given, calc, result, unit: unit || '—' });
  const pick = (rand, arr) => arr[Math.floor(rand() * arr.length) % arr.length];
  const round = (v, d = 2) => Number(v.toFixed(d));
  const focusIf = (g, on, x, y, w, h, t) => { if (on) D.focus(g, x, y, w, h, t); };
  const bgGrid = (g) => { D.clear(g, '#f8fafc'); for (let x = 20; x < 1000; x += 40) D.line(g, x, 0, x, 560, { color: '#eef2f7', width: 1 }); for (let y = 20; y < 560; y += 40) D.line(g, 0, y, 1000, y, { color: '#eef2f7', width: 1 }); };
  const RES = (k, def) => ({ key: k, label: `${k.replace(/(\d)/, (d) => '₀₁₂₃₄₅₆₇₈₉'[d])}`, type: 'range', min: 1, max: 100, step: 1, default: def, unit: 'Ω' });

  // ───────────────────────── 1. Ohm's law ─────────────────────────
  S['ee-ohms-law'] = {
    live: true,
    params: [
      { key: 'solve', label: 'Calculate', type: 'select', default: 'I', options: [{ value: 'I', label: 'Current I = V / R' }, { value: 'V', label: 'Voltage V = I × R' }, { value: 'R', label: 'Resistance R = V / I' }] },
      { key: 'V', label: 'Voltage V', type: 'range', min: 0, max: 24, step: 0.5, default: 12, unit: 'V', showIf: (p) => p.solve !== 'V' },
      { key: 'I', label: 'Current I', type: 'range', min: 0.05, max: 5, step: 0.05, default: 1, unit: 'A', showIf: (p) => p.solve !== 'I' },
      { key: 'R', label: 'Resistance R', type: 'range', min: 1, max: 100, step: 1, default: 10, unit: 'Ω', showIf: (p) => p.solve !== 'R' },
    ],
    examples: [{ label: 'Torch bulb', values: { solve: 'I', V: 3, R: 6 } }, { label: 'Find V', values: { solve: 'V', I: 0.5, R: 24 } }, { label: 'Find R', values: { solve: 'R', V: 12, I: 2 } }],
    compute(p) {
      let V = p.V, I = p.I, R = p.R; let calc;
      if (p.solve === 'I') { I = V / R; calc = `I = ${n(V)} / ${n(R)}`; } else if (p.solve === 'V') { V = I * R; calc = `V = ${n(I)} × ${n(R)}`; } else { R = V / I; calc = `R = ${n(V)} / ${n(I)}`; }
      const P = V * I; const res = p.solve === 'I' ? si(I, 'A') : p.solve === 'V' ? si(V, 'V') : si(R, 'Ω');
      return {
        V, I, R, P,
        formulas: [F("Ohm's law", p.solve === 'I' ? 'I = V / R' : p.solve === 'V' ? 'V = I × R' : 'R = V / I', `V = ${si(V, 'V')}, I = ${si(I, 'A')}, R = ${si(R, 'Ω')}`, calc, res, p.solve === 'I' ? 'A' : p.solve === 'V' ? 'V' : 'Ω'), F('Power in the resistor', 'P = V × I = I²R', `V = ${si(V, 'V')}, I = ${si(I, 'A')}`, `P = ${n(V)} × ${n(I)}`, si(P, 'W'), 'W')],
        readouts: [{ label: 'V', value: si(V, 'V'), tone: p.solve === 'V' ? 'good' : '' }, { label: 'I', value: si(I, 'A'), tone: p.solve === 'I' ? 'good' : '' }, { label: 'R', value: si(R, 'Ω'), tone: p.solve === 'R' ? 'good' : '' }, { label: 'P', value: si(P, 'W') }],
        state: { circuit: 'DC source V across resistor R with an ammeter in series and a voltmeter across R', calculated: p.solve, voltage: si(V, 'V'), current: si(I, 'A'), resistance: si(R, 'Ω'), power: si(P, 'W'), graph: `V–I line through the origin with slope R = ${si(R, 'Ω')}; operating point (${n(V)} V, ${n(I)} A)` },
        explain: { what: `A ${si(V, 'V')} source pushes ${si(I, 'A')} through ${si(R, 'Ω')}.`, why: 'For a fixed resistance the current is proportional to the voltage: V = IR. Resistance opposes the flow, so for the same voltage a smaller R lets more current through.', param: p.solve === 'I' ? 'Voltage V and resistance R.' : p.solve === 'V' ? 'Current I and resistance R.' : 'Voltage V and current I.', effect: 'Doubling V doubles I; doubling R halves I. The V–I graph is a straight line whose slope is R.' },
      };
    },
    steps: (p, c) => [
      { title: 'The circuit', text: `A DC source, a ${si(c.R, 'Ω')} resistor, an ammeter in series and a voltmeter across the resistor.` },
      { title: 'Voltage is applied', text: `The source sets a potential difference of ${si(c.V, 'V')} across R (voltmeter reading).` },
      { title: 'Current flows', text: `Charge flows around the loop; the ammeter reads ${si(c.I, 'A')} — the same everywhere in the loop.` },
      { title: "Ohm's law", text: `V = I × R → ${n(c.V)} = ${n(c.I)} × ${n(c.R)}.` },
      { title: 'V–I graph', text: `All (V, I) pairs for this resistor lie on a straight line; the slope V/I = ${si(c.R, 'Ω')}.` },
    ],
    draw(g, S) {
      const { c, step, t } = S; bgGrid(g);
      const L = 90, R = 520, T = 110, B = 430;
      K.wire(g, [[L, 210], [L, T], [R, T], [R, 200]]); K.wire(g, [[R, 330], [R, B], [L, B], [L, 330]]);
      K.cell(g, [L, 330], [L, 210], { label: 'V', value: si(c.V, 'V'), labelOffset: 40 });
      K.resistor(g, [R, 200], [R, 330], { label: 'R', value: si(c.R, 'Ω'), heat: Math.min(0.5, c.P / 60), labelOffset: 34, labelSide: 'other' });
      K.meter(g, 300, T, 'A', si(c.I, 'A'));
      K.wire(g, [[R, 200], [R + 90, 200], [R + 90, 245]]); K.wire(g, [[R, 330], [R + 90, 330], [R + 90, 285]]); K.meter(g, R + 90, 265, 'V', si(c.V, 'V'), { color: C.green });
      K.flow(g, [[L, 210], [L, T], [R, T], [R, B], [L, B], [L, 330]], t, c.I, { ref: 1 });
      K.currentArrow(g, [L + 60, T], [L + 160, T], `I = ${si(c.I, 'A')}`);
      focusIf(g, step === 1, L - 50, 200, 100, 140, t); focusIf(g, step === 2, 250, T - 30, 100, 60, t); focusIf(g, step === 3, R - 30, 190, 150, 150, t);
      const ch = D.chart(g, 690, 90, 280, 250, { xmin: 0, xmax: Math.max(24, c.V * 1.2), ymin: 0, ymax: Math.max(1, (Math.max(24, c.V * 1.2)) / c.R) * 1.05, xlabel: 'Voltage V (V)', ylabel: 'Current I (A)', title: 'V–I characteristic', series: [{ points: [[0, 0], [Math.max(24, c.V * 1.2), Math.max(24, c.V * 1.2) / c.R]], color: step >= 4 ? C.red : C.blue, width: 3 }], marks: [{ point: [c.V, c.I], label: `(${n(c.V)} V, ${n(c.I)} A)`, color: C.orange }] });
      K.infoBox(g, 690, 400, [{ t: 'V = I × R', b: true, size: 18, c: C.green }, `${n(c.V)} V = ${n(c.I)} A × ${n(c.R)} Ω`, `P = ${si(c.P, 'W')}`], { w: 280 });
      return ch;
    },
    challenge: {
      make(rand) { const target = pick(rand, [0.5, 0.8, 1.2, 1.5, 2, 2.5, 3]); return { kind: 'ohm-current', prompt: `Set the voltage and resistance so that the current in the circuit is exactly ${target} A.`, target, unit: 'A', tolerance: 0.02, hint: 'I = V / R — try a round resistance first, then choose V.', setup: { solve: 'I', V: 5, R: 50 } }; },
      evaluate(p) { const v = KINDS['ohm-current'](p); return { value: v, text: `I = ${si(v, 'A')}`, calculation: `I = V / R = ${n(p.V)} / ${n(p.R)} = ${n(v, 4)} A` }; },
    },
  };

  // ───────────────────────── 2. Series circuit ─────────────────────────
  const seriesParams = (maxN, def) => [
    { key: 'count', label: 'Number of resistors', type: 'range', min: 2, max: maxN, step: 1, default: def },
    { key: 'V', label: 'Supply voltage V', type: 'range', min: 1, max: 48, step: 1, default: 12, unit: 'V' },
    ...[10, 20, 30, 40, 50, 60].slice(0, maxN).map((d, i) => Object.assign(RES(`R${i + 1}`, d), { showIf: (p) => p.count > i })),
  ];
  const seriesPos = (count) => { // points along the loop for count resistors
    const slots = [[[150, 110], [330, 110]], [[370, 110], [550, 110]], [[620, 150], [620, 290]], [[620, 330], [620, 410]], [[550, 450], [370, 450]], [[330, 450], [200, 450]]];
    return slots.slice(0, count);
  };
  S['ee-series'] = {
    live: true,
    params: seriesParams(6, 3),
    actions: [{ key: 'add', label: '➕ Add resistor' }, { key: 'remove', label: '➖ Remove resistor' }],
    onAction(a, st) { const cnt = st.p.count + (a === 'add' ? 1 : -1); if (cnt < 2 || cnt > 6) return { toast: cnt < 2 ? 'A series circuit needs at least two resistors here.' : 'Up to six resistors.' }; return { params: { count: cnt } }; },
    examples: [{ label: 'Voltage divider', values: { count: 2, V: 12, R1: 10, R2: 20 } }, { label: 'Three lamps', values: { count: 3, V: 24, R1: 12, R2: 12, R3: 24 } }],
    compute(p) {
      const Rs = Array.from({ length: p.count }, (_, i) => p[`R${i + 1}`]); const Req = Rs.reduce((a, b) => a + b, 0); const I = p.V / Req; const Vs = Rs.map((r) => I * r);
      return {
        Rs, Req, I, Vs,
        formulas: [F('Equivalent resistance', 'R_eq = R₁ + R₂ + … + Rₙ', Rs.map((r, i) => `R${i + 1} = ${r} Ω`).join(', '), Rs.join(' + '), si(Req, 'Ω'), 'Ω'), F('Circuit current', 'I = V / R_eq', `V = ${p.V} V`, `${p.V} / ${n(Req)}`, si(I, 'A'), 'A'), F('Voltage across each resistor', 'Vₖ = I × Rₖ', `I = ${si(I, 'A')}`, Vs.map((v, i) => `V${i + 1} = ${n(I)} × ${Rs[i]} = ${n(v)}`).join('; '), `ΣV = ${n(Vs.reduce((a, b) => a + b, 0))} V = V`, 'V')],
        readouts: [{ label: 'R_eq', value: si(Req, 'Ω'), tone: 'good' }, { label: 'I', value: si(I, 'A') }, ...Vs.map((v, i) => ({ label: `V${i + 1}`, value: si(v, 'V') }))],
        state: { circuit: `${p.count} resistors in series across ${p.V} V`, resistors: Rs.map((r) => `${r} Ω`), equivalentResistance: si(Req, 'Ω'), current: si(I, 'A'), voltages: Vs.map((v) => si(v, 'V')) },
        explain: { what: `${p.count} resistors carry the same ${si(I, 'A')}; the supply voltage divides as ${Vs.map((v) => n(v)).join(' + ')} V.`, why: 'In series there is only one path, so the current is the same everywhere and the resistances add. Each resistor takes a share of the voltage in proportion to its resistance.', param: 'Number of resistors, their values and the supply voltage.', effect: 'Adding a resistor increases R_eq and reduces the current; the larger resistor always has the larger voltage drop.' },
      };
    },
    steps: (p, c) => [
      { title: 'One path', text: `${p.count} resistors are connected end to end — the charge has only one path.` },
      { title: 'Equivalent resistance', text: `R_eq = ${c.Rs.join(' + ')} = ${n(c.Req)} Ω.` },
      { title: 'Same current everywhere', text: `I = V / R_eq = ${p.V} / ${n(c.Req)} = ${si(c.I, 'A')} through every resistor.` },
      { title: 'Voltage division', text: `Each drop Vₖ = I·Rₖ: ${c.Vs.map((v) => n(v)).join(' V, ')} V.` },
      { title: 'Check with KVL', text: `Sum of drops ${n(c.Vs.reduce((a, b) => a + b, 0))} V = supply ${p.V} V.` },
    ],
    draw(g, S) {
      const { c, p, step, t } = S; bgGrid(g);
      const pos = seriesPos(p.count); const loop = [[90, 230], [90, 110], [620, 110], [620, 450], [90, 450], [90, 330]];
      K.wire(g, loop.slice(0, 3)); K.wire(g, loop.slice(2)); // background wire (parts draw over)
      pos.forEach(([a, b], i) => { D.line(g, a[0], a[1], b[0], b[1], { color: '#f8fafc', width: 8 }); K.resistor(g, a, b, { label: `R${i + 1}`, value: `${p[`R${i + 1}`]} Ω · ${si(c.Vs[i], 'V')}`, heat: Math.min(0.5, (c.Vs[i] * c.I) / 20) }); });
      D.line(g, 90, 235, 90, 325, { color: '#f8fafc', width: 8 }); K.cell(g, [90, 330], [90, 230], { label: 'V', value: `${p.V} V`, labelOffset: 44 });
      K.flow(g, loop, t, c.I, { ref: 0.5 });
      K.currentArrow(g, [100, 110], [150, 110], `I = ${si(c.I, 'A')}`);
      focusIf(g, step === 1, 130, 80, 510, 400, t);
      // voltage-division bar
      const x0 = 700, w = 260; D.text(g, 'How the supply voltage divides', x0, 100, { size: 15, weight: 800 });
      let y = 120; const tot = c.Vs.reduce((a, b) => a + b, 0) || 1; let acc = 0; const cols = [C.blue, C.green, C.orange, C.violet, C.pink, C.cyan];
      c.Vs.forEach((v, i) => { const h = (v / tot) * 300; D.rect(g, x0, y + (acc / tot) * 300, 70, h, { fill: cols[i], stroke: '#fff', width: 2 }); D.text(g, `V${i + 1} = ${n(v)} V`, x0 + 82, y + (acc / tot) * 300 + h / 2, { size: 14, weight: 700, color: cols[i] }); acc += v; });
      D.text(g, `Total ${n(tot)} V = V_supply`, x0, 440, { size: 14, weight: 800, color: step >= 4 ? C.green : C.muted });
      K.infoBox(g, x0, 460, [{ t: `R_eq = ${n(c.Req)} Ω`, b: true, c: C.green }, `I = ${si(c.I, 'A')}`], { w });
    },
    challenge: {
      make(rand) { const target = pick(rand, [45, 60, 75, 90, 110, 150, 175, 200]); return { kind: 'series-req', prompt: `Build a series circuit whose equivalent resistance is ${target} Ω. Add or remove resistors and set their values.`, target, unit: 'Ω', tolerance: 0.5, hint: 'In series R_eq is simply the sum of the resistors.', setup: { count: 2, R1: 10, R2: 10 } }; },
      evaluate(p) { const v = KINDS['series-req'](p); const Rs = Array.from({ length: p.count }, (_, i) => p[`R${i + 1}`]); return { value: v, text: `R_eq = ${n(v)} Ω`, calculation: `R_eq = ${Rs.join(' + ')} = ${n(v)} Ω` }; },
    },
  };

  // ───────────────────────── 3. Parallel circuit ─────────────────────────
  S['ee-parallel'] = {
    live: true,
    params: [
      { key: 'count', label: 'Number of branches', type: 'range', min: 2, max: 5, step: 1, default: 3 },
      { key: 'V', label: 'Supply voltage V', type: 'range', min: 1, max: 48, step: 1, default: 12, unit: 'V' },
      ...[10, 20, 30, 40, 60].map((d, i) => Object.assign(RES(`R${i + 1}`, d), { showIf: (p) => p.count > i })),
    ],
    actions: [{ key: 'add', label: '➕ Add branch' }, { key: 'remove', label: '➖ Remove branch' }],
    onAction(a, st) { const cnt = st.p.count + (a === 'add' ? 1 : -1); if (cnt < 2 || cnt > 5) return { toast: 'Between two and five branches.' }; return { params: { count: cnt } }; },
    examples: [{ label: 'Equal branches', values: { count: 3, V: 12, R1: 30, R2: 30, R3: 30 } }, { label: 'Household loads', values: { count: 4, V: 24, R1: 12, R2: 24, R3: 48, R4: 96 } }],
    compute(p) {
      const Rs = Array.from({ length: p.count }, (_, i) => p[`R${i + 1}`]); const Is = Rs.map((r) => p.V / r); const It = Is.reduce((a, b) => a + b, 0); const Req = p.V / It;
      return {
        Rs, Is, It, Req,
        formulas: [F('Equivalent resistance', '1/R_eq = 1/R₁ + 1/R₂ + … + 1/Rₙ', Rs.map((r, i) => `R${i + 1} = ${r} Ω`).join(', '), `1/R_eq = ${Rs.map((r) => `1/${r}`).join(' + ')} = ${n(1 / Req, 4)}`, si(Req, 'Ω'), 'Ω'), F('Branch currents', 'Iₖ = V / Rₖ (same V across every branch)', `V = ${p.V} V`, Is.map((x, i) => `I${i + 1} = ${p.V}/${Rs[i]} = ${n(x)}`).join('; '), Is.map((x) => si(x, 'A')).join(', '), 'A'), F('Total current', 'I = I₁ + I₂ + … (KCL)', '', Is.map((x) => n(x)).join(' + '), si(It, 'A'), 'A')],
        readouts: [{ label: 'R_eq', value: si(Req, 'Ω'), tone: 'good' }, { label: 'I total', value: si(It, 'A') }, ...Is.map((x, i) => ({ label: `I${i + 1}`, value: si(x, 'A') }))],
        state: { circuit: `${p.count} resistor branches in parallel across ${p.V} V`, resistors: Rs.map((r) => `${r} Ω`), branchCurrents: Is.map((x) => si(x, 'A')), totalCurrent: si(It, 'A'), equivalentResistance: si(Req, 'Ω'), voltageAcrossEachBranch: `${p.V} V` },
        explain: { what: `Every branch has the full ${p.V} V; the currents ${Is.map((x) => n(x)).join(', ')} A add up to ${si(It, 'A')}.`, why: 'Parallel branches share the same two nodes, so they share the voltage. Each branch is an extra path, so the total current grows and the equivalent resistance falls below the smallest branch.', param: 'Number of branches, branch resistances, supply voltage.', effect: 'Adding a branch always lowers R_eq and raises the supply current; the smallest resistance carries the largest current.' },
      };
    },
    steps: (p, c) => [
      { title: 'Several paths', text: `${p.count} branches connect across the same two nodes.` },
      { title: 'Same voltage', text: `Each branch has the full supply ${p.V} V across it.` },
      { title: 'Branch currents', text: c.Is.map((x, i) => `I${i + 1} = ${p.V}/${c.Rs[i]} = ${n(x)} A`).join(', ') + '.' },
      { title: 'Total current (KCL)', text: `I = ${c.Is.map((x) => n(x)).join(' + ')} = ${si(c.It, 'A')}.` },
      { title: 'Equivalent resistance', text: `R_eq = V / I = ${p.V} / ${n(c.It)} = ${si(c.Req, 'Ω')} (smaller than every branch).` },
    ],
    draw(g, S) {
      const { c, p, step, t } = S; bgGrid(g);
      const top = 120, bot = 440, x0 = 90; const xs = Array.from({ length: p.count }, (_, i) => 220 + i * (420 / Math.max(1, p.count - 1 || 1)) * (p.count > 1 ? 1 : 0));
      const xr = xs[xs.length - 1];
      K.wire(g, [[x0, 230], [x0, top], [xr, top]]); K.wire(g, [[x0, 330], [x0, bot], [xr, bot]]);
      K.cell(g, [x0, 330], [x0, 230], { label: 'V', value: `${p.V} V`, labelOffset: 44 });
      const cols = [C.blue, C.green, C.orange, C.violet, C.pink];
      xs.forEach((x, i) => {
        K.wire(g, [[x, top], [x, 210]]); K.wire(g, [[x, 350], [x, bot]]); K.node(g, x, top, { r: 5 }); K.node(g, x, bot, { r: 5 });
        K.resistor(g, [x, 210], [x, 350], { label: `R${i + 1}`, value: `${c.Rs[i]} Ω`, heat: Math.min(0.5, (p.V * c.Is[i]) / 30), labelOffset: 30 });
        K.flow(g, [[x, top], [x, bot]], t, c.Is[i], { ref: 0.4, color: cols[i] });
        D.tag(g, `I${i + 1} = ${si(c.Is[i], 'A')}`, i === xs.length - 1 ? x - 8 : x + 8, 385, { bg: cols[i], size: 12, align: i === xs.length - 1 ? 'right' : 'left' });
      });
      K.flow(g, [[x0, 230], [x0, top], [xs[0], top]], t, c.It, { ref: 0.4 }); K.flow(g, [[xs[0], bot], [x0, bot], [x0, 330]], t, c.It, { ref: 0.4 });
      K.currentArrow(g, [x0 + 10, top], [xs[0] - 10, top], `I = ${si(c.It, 'A')}`);
      focusIf(g, step === 1, 190, 190, xr - 170, 180, t); focusIf(g, step === 3, 90, 90, 140, 60, t);
      // current distribution bars
      const bx = 700; D.text(g, 'Current distribution', bx, 110, { size: 15, weight: 800 });
      const imax = Math.max(...c.Is);
      c.Is.forEach((x, i) => { const w = (x / imax) * 200; D.rect(g, bx, 130 + i * 40, w, 26, { fill: cols[i], r: 6 }); D.text(g, `I${i + 1} ${si(x, 'A')}`, bx + w + 8, 143 + i * 40, { size: 14, weight: 700, color: cols[i] }); });
      K.infoBox(g, bx, 350, [{ t: `R_eq = ${si(c.Req, 'Ω')}`, b: true, c: C.green }, `I total = ${si(c.It, 'A')}`, `V across each = ${p.V} V`], { w: 270 });
    },
    challenge: {
      make(rand) { const target = pick(rand, [5, 6, 7.5, 8, 10, 12, 15, 20]); return { kind: 'parallel-req', prompt: `Construct a parallel circuit with an equivalent resistance of ${target} Ω.`, target, unit: 'Ω', tolerance: Math.max(0.1, target * 0.01), hint: 'Two equal resistors in parallel give half of one; three give a third.', setup: { count: 2, R1: 50, R2: 50 } }; },
      evaluate(p) { const v = KINDS['parallel-req'](p); const Rs = Array.from({ length: p.count }, (_, i) => p[`R${i + 1}`]); return { value: v, text: `R_eq = ${n(v, 4)} Ω`, calculation: `1/R_eq = ${Rs.map((r) => `1/${r}`).join(' + ')} → R_eq = ${n(v, 4)} Ω` }; },
    },
  };

  // ───────────────────────── 4. KCL ─────────────────────────
  const cur = (k, lab, def, show) => ({ key: k, label: lab, type: 'range', min: 0, max: 10, step: 0.1, default: def, unit: 'A', showIf: show });
  S['ee-kcl'] = {
    live: true,
    params: [
      { key: 'nin', label: 'Currents entering', type: 'range', min: 1, max: 3, step: 1, default: 2 },
      { key: 'nout', label: 'Currents leaving', type: 'range', min: 1, max: 3, step: 1, default: 2 },
      cur('in1', 'I₁ entering', 3), cur('in2', 'I₂ entering', 2, (p) => p.nin > 1), cur('in3', 'I₃ entering', 1, (p) => p.nin > 2),
      cur('out1', 'I_a leaving', 4), cur('out2', 'I_b leaving', 1, (p) => p.nout > 1), cur('out3', 'I_c leaving', 1, (p) => p.nout > 2),
    ],
    actions: [{ key: 'addIn', label: '➕ In' }, { key: 'addOut', label: '➕ Out' }, { key: 'rmIn', label: '➖ In' }, { key: 'rmOut', label: '➖ Out' }, { key: 'balance', label: '⚖ Balance last' }],
    onAction(a, st) {
      const p = st.p;
      if (a === 'addIn' && p.nin < 3) return { params: { nin: p.nin + 1 } }; if (a === 'addOut' && p.nout < 3) return { params: { nout: p.nout + 1 } };
      if (a === 'rmIn' && p.nin > 1) return { params: { nin: p.nin - 1 } }; if (a === 'rmOut' && p.nout > 1) return { params: { nout: p.nout - 1 } };
      if (a === 'balance') { const sin = [1, 2, 3].slice(0, p.nin).reduce((s, i) => s + p[`in${i}`], 0); const sout = [1, 2, 3].slice(0, p.nout - 1).reduce((s, i) => s + p[`out${i}`], 0); const need = round(sin - sout, 1); if (need < 0 || need > 10) return { toast: 'Cannot balance with the last current alone — change the others.' }; return { params: { [`out${p.nout}`]: need } }; }
      return { toast: 'Between one and three currents on each side.' };
    },
    examples: [{ label: 'I₁ + I₂ = I₃ + I₄', values: { nin: 2, nout: 2, in1: 3, in2: 2, out1: 4, out2: 1 } }, { label: 'Unbalanced', values: { nin: 2, nout: 1, in1: 2, in2: 2.5, out1: 3 } }],
    compute(p) {
      const ins = [1, 2, 3].slice(0, p.nin).map((i) => p[`in${i}`]); const outs = [1, 2, 3].slice(0, p.nout).map((i) => p[`out${i}`]);
      const sin = ins.reduce((a, b) => a + b, 0), sout = outs.reduce((a, b) => a + b, 0); const diff = sin - sout; const ok = Math.abs(diff) < 0.051;
      const inNames = ['I₁', 'I₂', 'I₃'].slice(0, p.nin), outNames = ['I_a', 'I_b', 'I_c'].slice(0, p.nout);
      return {
        ins, outs, sin, sout, diff, ok, inNames, outNames,
        formulas: [F("Kirchhoff's current law", 'Σ I_entering = Σ I_leaving  (Σ I = 0 at a node)', `${inNames.map((x, i) => `${x} = ${n(ins[i])} A`).join(', ')}; ${outNames.map((x, i) => `${x} = ${n(outs[i])} A`).join(', ')}`, `${inNames.join(' + ')} = ${n(sin)} A;  ${outNames.join(' + ')} = ${n(sout)} A`, ok ? 'KCL satisfied ✓' : `Imbalance ${n(diff)} A ✗`, 'A')],
        readouts: [{ label: 'Σ in', value: si(sin, 'A') }, { label: 'Σ out', value: si(sout, 'A') }, { label: 'KCL', value: ok ? 'satisfied ✓' : `off by ${n(diff)} A`, tone: ok ? 'good' : 'bad' }],
        state: { junction: `${p.nin} currents entering, ${p.nout} leaving`, entering: ins.map((x) => `${n(x)} A`), leaving: outs.map((x) => `${n(x)} A`), sumIn: si(sin, 'A'), sumOut: si(sout, 'A'), kclSatisfied: ok },
        explain: { what: ok ? `${n(sin)} A enters and ${n(sout)} A leaves — KCL is satisfied.` : `${n(sin)} A enters but ${n(sout)} A leaves — ${n(Math.abs(diff))} A would have to pile up at the node.`, why: 'Charge is conserved and a node cannot store charge, so whatever current flows in must flow out at the same instant.', param: 'The entering and leaving branch currents.', effect: 'Changing any one current forces another to change by the same amount to keep ΣI = 0.' },
      };
    },
    steps: (p, c) => [
      { title: 'The junction', text: `A node joins ${p.nin + p.nout} branches: ${c.inNames.join(', ')} enter, ${c.outNames.join(', ')} leave.` },
      { title: 'Add entering currents', text: `Σ I_in = ${c.ins.map((x) => n(x)).join(' + ')} = ${n(c.sin)} A.` },
      { title: 'Add leaving currents', text: `Σ I_out = ${c.outs.map((x) => n(x)).join(' + ')} = ${n(c.sout)} A.` },
      { title: 'Compare', text: c.ok ? 'Σ I_in = Σ I_out → KCL satisfied.' : `They differ by ${n(Math.abs(c.diff))} A → KCL is not satisfied; adjust a current.` },
    ],
    draw(g, S) {
      const { c, p, step, t } = S; bgGrid(g);
      const nx = 340, ny = 280; const cols = [C.blue, C.cyan, C.violet], colsO = [C.orange, C.red, C.pink];
      const inPts = c.ins.map((_, i) => { const a = Math.PI - 0.8 + (1.6 * (i + 0.5)) / c.ins.length; return [nx + Math.cos(a) * 230, ny - Math.sin(a) * 200]; });
      const outPts = c.outs.map((_, i) => { const a = -0.8 + (1.6 * (i + 0.5)) / c.outs.length; return [nx + Math.cos(a) * 230, ny - Math.sin(a) * 200]; });
      inPts.forEach((q, i) => { K.wire(g, [q, [nx, ny]]); K.flow(g, [q, [nx, ny]], t, c.ins[i], { ref: 3, color: cols[i] }); K.currentArrow(g, q, [nx, ny], `${c.inNames[i]} = ${n(c.ins[i])} A`, { color: cols[i], dy: -24 }); focusIf(g, step === 1, q[0] - 30, q[1] - 30, 60, 60, t); });
      outPts.forEach((q, i) => { K.wire(g, [[nx, ny], q]); K.flow(g, [[nx, ny], q], t, c.outs[i], { ref: 3, color: colsO[i] }); K.currentArrow(g, [nx, ny], q, `${c.outNames[i]} = ${n(c.outs[i])} A`, { color: colsO[i], dy: -24 }); focusIf(g, step === 2, q[0] - 30, q[1] - 30, 60, 60, t); });
      K.node(g, nx, ny, { r: 12, color: c.ok ? C.green : C.red, label: 'node', dx: 16, dy: 26 });
      // balance scale
      const bx = 780, by = 230; const tilt = Math.max(-0.35, Math.min(0.35, (c.sout - c.sin) * 0.08));
      D.line(g, bx, by, bx, by + 170, { color: C.ink, width: 5 }); D.poly(g, [[bx - 40, by + 190], [bx + 40, by + 190], [bx, by + 160]], { fill: '#94a3b8', close: true });
      g.save(); g.translate(bx, by); g.rotate(tilt); D.line(g, -150, 0, 150, 0, { color: C.ink, width: 5 });
      D.rect(g, -190, 20, 80, 40, { fill: '#dbeafe', stroke: C.blue, r: 8 }); D.text(g, `IN ${n(c.sin)} A`, -150, 40, { size: 14, weight: 800, align: 'center', color: C.blue });
      D.rect(g, 110, 20, 80, 40, { fill: '#ffedd5', stroke: C.orange, r: 8 }); D.text(g, `OUT ${n(c.sout)} A`, 150, 40, { size: 14, weight: 800, align: 'center', color: C.orange });
      D.line(g, -150, 0, -150, 20, { color: C.ink }); D.line(g, 150, 0, 150, 20, { color: C.ink }); g.restore();
      D.tag(g, c.ok ? 'Σ I_in = Σ I_out  ✓  KCL satisfied' : `KCL not satisfied: difference ${n(c.diff)} A`, bx, 480, { bg: c.ok ? C.green : C.red, size: 15, align: 'center' });
      D.text(g, `${c.inNames.join(' + ')} = ${c.outNames.join(' + ')}`, bx, 110, { size: 18, weight: 800, align: 'center', color: step >= 3 ? (c.ok ? C.green : C.red) : C.ink });
    },
    challenge: {
      make(rand) { const a = round(1 + rand() * 4, 1), b = round(1 + rand() * 3, 1), d = round(0.5 + rand() * 2, 1); return { kind: 'kcl-imbalance', prompt: `I₁ = ${a} A and I₂ = ${b} A enter the node; I_a = ${d} A leaves. Set I_b so that KCL is satisfied (do not change the other currents).`, target: 0, unit: 'A imbalance', tolerance: 0.05, hint: 'I_b = (I₁ + I₂) − I_a', setup: { nin: 2, nout: 2, in1: a, in2: b, out1: d, out2: 0 } }; },
      evaluate(p) { const v = KINDS['kcl-imbalance'](p); return { value: v, text: `I_b = ${n(p.out2)} A (ΣI_in − ΣI_out = ${n(v)} A)`, calculation: `ΣI_in − ΣI_out = ${n(v, 3)} A` }; },
    },
  };

  // ───────────────────────── 5. KVL ─────────────────────────
  S['ee-kvl'] = {
    live: true,
    params: [
      { key: 'E1', label: 'Source E₁', type: 'range', min: 1, max: 30, step: 0.5, default: 12, unit: 'V' },
      { key: 'useE2', label: 'Second source E₂ in the loop', type: 'toggle', default: false },
      { key: 'E2', label: 'Source E₂', type: 'range', min: 0.5, max: 20, step: 0.5, default: 4, unit: 'V', showIf: (p) => p.useE2 },
      { key: 'e2dir', label: 'E₂ connection', type: 'select', default: 'oppose', showIf: (p) => p.useE2, options: [{ value: 'aid', label: 'Aiding E₁' }, { value: 'oppose', label: 'Opposing E₁' }] },
      RES('R1', 10), RES('R2', 20), RES('R3', 30),
    ],
    stepDuration: 3,
    examples: [{ label: 'Single source', values: { E1: 12, useE2: false, R1: 10, R2: 20, R3: 30 } }, { label: 'Two opposing sources', values: { E1: 18, useE2: true, E2: 6, e2dir: 'oppose', R1: 4, R2: 6, R3: 2 } }],
    compute(p) {
      const E2 = p.useE2 ? p.E2 * (p.e2dir === 'aid' ? 1 : -1) : 0; const Rt = p.R1 + p.R2 + p.R3; const I = (p.E1 + E2) / Rt;
      const V1 = I * p.R1, V2 = I * p.R2, V3 = I * p.R3;
      // loop trace clockwise starting at the negative terminal of E1: rise E1, drops, E2
      const items = [{ name: 'E₁', v: p.E1, kind: 'rise' }, { name: 'R₁', v: -V1, kind: 'drop' }, { name: 'R₂', v: -V2, kind: 'drop' }, ...(p.useE2 ? [{ name: 'E₂', v: E2, kind: E2 >= 0 ? 'rise' : 'drop' }] : []), { name: 'R₃', v: -V3, kind: 'drop' }];
      let run = 0; items.forEach((it) => { run += it.v; it.sum = run; });
      return {
        I, V1, V2, V3, items, Rt, E2,
        formulas: [F("Kirchhoff's voltage law", 'Σ V around a closed loop = 0', items.map((it) => `${it.name}: ${it.v >= 0 ? '+' : '−'}${n(Math.abs(it.v))} V`).join(', '), items.map((it) => `${it.v >= 0 ? '+' : '−'} ${n(Math.abs(it.v))}`).join(' ').replace(/^\+ /, ''), `${n(run, 4)} V ≈ 0 ✓`, 'V'), F('Loop current', 'I = ΣE / ΣR', `ΣE = ${n(p.E1 + E2)} V, ΣR = ${Rt} Ω`, `${n(p.E1 + E2)} / ${Rt}`, si(I, 'A'), 'A'), F('Drops', 'V = I × R', `I = ${si(I, 'A')}`, `V₁ = ${n(V1)}, V₂ = ${n(V2)}, V₃ = ${n(V3)}`, `${n(V1 + V2 + V3)} V = ΣE`, 'V')],
        readouts: [{ label: 'I', value: si(I, 'A') }, { label: 'V_R1', value: si(V1, 'V') }, { label: 'V_R2', value: si(V2, 'V') }, { label: 'V_R3', value: si(V3, 'V') }, { label: 'ΣV', value: `${n(run, 3)} V`, tone: 'good' }],
        state: { loop: `E₁ = ${p.E1} V${p.useE2 ? `, E₂ = ${p.E2} V ${p.e2dir === 'aid' ? 'aiding' : 'opposing'}` : ''}, R₁ = ${p.R1} Ω, R₂ = ${p.R2} Ω, R₃ = ${p.R3} Ω`, current: si(I, 'A'), trace: items.map((it) => `${it.name} ${it.kind} ${n(Math.abs(it.v))} V (running sum ${n(it.sum)} V)`), sum: `${n(run, 4)} V` },
        explain: { what: `Going once round the loop: rises ${n(items.filter((i) => i.v > 0).reduce((s, i) => s + i.v, 0))} V, drops ${n(-items.filter((i) => i.v < 0).reduce((s, i) => s + i.v, 0))} V — they cancel.`, why: 'Voltage is energy per charge. A charge that goes round a closed loop returns to the same point, so the energy it gains from the sources must equal the energy it gives up in the resistors.', param: 'Source voltages and resistances.', effect: I < 0 ? 'The net EMF is negative, so the current actually flows anticlockwise.' : 'A bigger resistance takes a bigger share of the drop; the sum always stays at zero.' },
      };
    },
    steps: (p, c) => [
      { title: 'Choose a loop and direction', text: 'Trace clockwise starting at the negative terminal of E₁.' },
      ...c.items.map((it) => ({ title: `${it.name}: voltage ${it.kind}`, text: `${it.v >= 0 ? '+' : '−'}${n(Math.abs(it.v))} V → running sum ${n(it.sum)} V.` })),
      { title: 'Back to the start: ΣV = 0', text: `${c.items.map((it) => `${it.v >= 0 ? '+' : '−'}${n(Math.abs(it.v))}`).join(' ')} = ${n(c.items[c.items.length - 1].sum, 3)} V.` },
    ],
    draw(g, S) {
      const { c, p, step, t } = S; bgGrid(g);
      const L = 100, R = 560, T = 110, B = 440;
      K.wire(g, [[L, 230], [L, T], [180, T]]); K.wire(g, [[300, T], [420, T]]); K.wire(g, [[540, T], [R, T], [R, 200]]); K.wire(g, [[R, 340], [R, B], [p.useE2 ? 420 : 300, B]]); if (p.useE2) K.wire(g, [[340, B], [300, B]]); K.wire(g, [[180, B], [L, B], [L, 330]]);
      const act = (name) => step >= 1 && step <= c.items.length && c.items[step - 1].name === name;
      K.cell(g, [L, 330], [L, 230], { label: 'E₁', value: `${p.E1} V`, labelOffset: 44, color: act('E₁') ? C.green : undefined });
      K.resistor(g, [180, T], [300, T], { label: 'R₁', value: `${p.R1} Ω`, color: act('R₁') ? C.red : undefined });
      K.resistor(g, [420, T], [540, T], { label: 'R₂', value: `${p.R2} Ω`, color: act('R₂') ? C.red : undefined });
      K.resistor(g, [300, B], [180, B], { label: 'R₃', value: `${p.R3} Ω`, color: act('R₃') ? C.red : undefined, labelSide: 'other' });
      if (p.useE2) { const aid = p.e2dir === 'aid'; K.cell(g, aid ? [340, B] : [420, B], aid ? [420, B] : [340, B], { label: 'E₂', value: `${p.E2} V`, labelOffset: 36, color: act('E₂') ? C.green : undefined }); }
      K.wire(g, [[R, 200], [R, 340]]);
      K.flow(g, [[L, 230], [L, T], [R, T], [R, B], [L, B], [L, 330]], t, c.I, { ref: 0.4 });
      // loop-direction arrow
      g.save(); g.strokeStyle = C.violet; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.arc(330, 275, 80, Math.PI * 1.1, Math.PI * 2.75); g.stroke(); g.restore();
      D.arrow(g, 330 + 80 * Math.cos(Math.PI * 2.7), 275 + 80 * Math.sin(Math.PI * 2.7), 330 + 80 * Math.cos(Math.PI * 2.75), 275 + 80 * Math.sin(Math.PI * 2.75), { color: C.violet, head: 14 });
      D.text(g, 'trace', 330, 275, { size: 15, weight: 800, align: 'center', color: C.violet });
      // drop tags
      const tagAt = (x, y, v, on) => D.tag(g, `${v >= 0 ? '+' : '−'}${n(Math.abs(v))} V`, x, y, { bg: v >= 0 ? C.green : C.red, size: 13, align: 'center', border: on ? '#facc15' : undefined });
      tagAt(240, T + 34, -c.V1, act('R₁')); tagAt(480, T + 34, -c.V2, act('R₂')); tagAt(240, B - 34, -c.V3, act('R₃')); tagAt(L + 50, 280, p.E1, act('E₁')); if (p.useE2) tagAt(380, B - 40, c.E2, act('E₂'));
      // running-sum ladder
      const x0 = 650, w = 320; D.text(g, 'Running sum of voltages', x0, 100, { size: 15, weight: 800 });
      const ymax = Math.max(1, ...c.items.map((i) => Math.abs(i.sum)), p.E1);
      const ch = D.chart(g, x0 + 30, 120, w - 40, 250, { xmin: 0, xmax: c.items.length, ymin: -ymax * 0.2, ymax: ymax * 1.1, xticks: c.items.length, xfmt: (v) => (v === 0 ? 'start' : (c.items[Math.round(v) - 1] || {}).name || ''), yticks: 4, series: [{ points: [[0, 0], ...c.items.flatMap((it, i) => [[i + 1, it.sum]])], color: C.violet, width: 3, dots: true }], marks: [{ y: 0, color: C.green }] });
      const shown = Math.min(step, c.items.length); if (shown > 0 && step <= c.items.length) D.circle(g, ch.X(shown), ch.Y(c.items[shown - 1].sum), 10, { stroke: '#facc15', width: 4 });
      K.infoBox(g, x0, 420, [{ t: `I = ${si(c.I, 'A')}`, b: true }, { t: `ΣV = ${n(c.items[c.items.length - 1].sum, 3)} V`, b: true, c: step > c.items.length ? C.green : C.ink }], { w });
    },
    challenge: {
      make(rand) { const target = pick(rand, [3, 4, 5, 6, 8]); return { kind: 'kvl-vr2', prompt: `With E₁ = 12 V, adjust the resistors so that the voltage drop across R₂ is ${target} V.`, target, unit: 'V', tolerance: 0.1, hint: 'V_R2 = E × R₂ / (R₁ + R₂ + R₃) — R₂ must take its share of the loop voltage.', setup: { E1: 12, useE2: false, R1: 10, R2: 5, R3: 10 } }; },
      evaluate(p) { const v = KINDS['kvl-vr2'](p); return { value: v, text: `V_R2 = ${n(v, 4)} V`, calculation: `I = ${n(p.E1)}/(${p.R1}+${p.R2}+${p.R3}); V_R2 = I × ${p.R2} = ${n(v, 4)} V` }; },
    },
  };

  // ───────────────────────── 6. Star–delta ─────────────────────────
  S['ee-star-delta'] = {
    modes: [{ key: 'd2s', label: 'Delta → Star' }, { key: 's2d', label: 'Star → Delta' }],
    params: [
      { key: 'Rab', label: 'Delta R_AB', type: 'range', min: 1, max: 100, step: 1, default: 30, unit: 'Ω', showIf: (p) => p.mode !== 's2d' },
      { key: 'Rbc', label: 'Delta R_BC', type: 'range', min: 1, max: 100, step: 1, default: 30, unit: 'Ω', showIf: (p) => p.mode !== 's2d' },
      { key: 'Rca', label: 'Delta R_CA', type: 'range', min: 1, max: 100, step: 1, default: 30, unit: 'Ω', showIf: (p) => p.mode !== 's2d' },
      { key: 'Ra', label: 'Star R_A', type: 'range', min: 1, max: 100, step: 1, default: 10, unit: 'Ω', showIf: (p) => p.mode === 's2d' },
      { key: 'Rb', label: 'Star R_B', type: 'range', min: 1, max: 100, step: 1, default: 10, unit: 'Ω', showIf: (p) => p.mode === 's2d' },
      { key: 'Rc', label: 'Star R_C', type: 'range', min: 1, max: 100, step: 1, default: 10, unit: 'Ω', showIf: (p) => p.mode === 's2d' },
    ],
    examples: [{ label: 'Balanced 30 Ω delta', values: { mode: 'd2s', Rab: 30, Rbc: 30, Rca: 30 } }, { label: 'Unbalanced delta', values: { mode: 'd2s', Rab: 10, Rbc: 20, Rca: 30 } }, { label: 'Star 5, 10, 20 Ω', values: { mode: 's2d', Ra: 5, Rb: 10, Rc: 20 } }],
    compute(p) {
      let Rab, Rbc, Rca, Ra, Rb, Rc; let formulas;
      if (p.mode === 's2d') {
        ({ Ra, Rb, Rc } = p); const Sx = Ra * Rb + Rb * Rc + Rc * Ra; Rab = Sx / Rc; Rbc = Sx / Ra; Rca = Sx / Rb;
        formulas = [F('Star → Delta', 'R_AB = R_A + R_B + R_A·R_B/R_C (= ΣRR / R_C)', `R_A = ${Ra}, R_B = ${Rb}, R_C = ${Rc} Ω`, `ΣRR = ${Ra}·${Rb} + ${Rb}·${Rc} + ${Rc}·${Ra} = ${n(Sx)}`, `R_AB = ${n(Rab)} Ω, R_BC = ${n(Rbc)} Ω, R_CA = ${n(Rca)} Ω`, 'Ω')];
      } else {
        ({ Rab, Rbc, Rca } = p); const Sm = Rab + Rbc + Rca; Ra = (Rab * Rca) / Sm; Rb = (Rab * Rbc) / Sm; Rc = (Rbc * Rca) / Sm;
        formulas = [F('Delta → Star', 'R_A = R_AB·R_CA / (R_AB + R_BC + R_CA)', `R_AB = ${Rab}, R_BC = ${Rbc}, R_CA = ${Rca} Ω`, `R_A = ${Rab}·${Rca}/${Sm}; R_B = ${Rab}·${Rbc}/${Sm}; R_C = ${Rbc}·${Rca}/${Sm}`, `R_A = ${n(Ra)} Ω, R_B = ${n(Rb)} Ω, R_C = ${n(Rc)} Ω`, 'Ω')];
      }
      // check: resistance seen between A and B must be equal
      const abD = (Rab * (Rbc + Rca)) / (Rab + Rbc + Rca), abS = Ra + Rb;
      formulas.push(F('Check between A and B', 'Delta: R_AB ∥ (R_BC + R_CA)   Star: R_A + R_B', '', `${n(abD)} Ω vs ${n(abS)} Ω`, Math.abs(abD - abS) < 1e-6 ? 'equal ✓' : 'differs', 'Ω'));
      return {
        Rab, Rbc, Rca, Ra, Rb, Rc, abD, formulas,
        readouts: [{ label: 'R_A', value: si(Ra, 'Ω'), tone: p.mode !== 's2d' ? 'good' : '' }, { label: 'R_B', value: si(Rb, 'Ω'), tone: p.mode !== 's2d' ? 'good' : '' }, { label: 'R_C', value: si(Rc, 'Ω'), tone: p.mode !== 's2d' ? 'good' : '' }, { label: 'R_AB', value: si(Rab, 'Ω'), tone: p.mode === 's2d' ? 'good' : '' }, { label: 'R_BC', value: si(Rbc, 'Ω'), tone: p.mode === 's2d' ? 'good' : '' }, { label: 'R_CA', value: si(Rca, 'Ω'), tone: p.mode === 's2d' ? 'good' : '' }],
        state: { conversion: p.mode === 's2d' ? 'Star → Delta' : 'Delta → Star', delta: { Rab: si(Rab, 'Ω'), Rbc: si(Rbc, 'Ω'), Rca: si(Rca, 'Ω') }, star: { Ra: si(Ra, 'Ω'), Rb: si(Rb, 'Ω'), Rc: si(Rc, 'Ω') }, resistanceBetweenAandB: si(abD, 'Ω') },
        explain: { what: `The ${p.mode === 's2d' ? 'star' : 'delta'} network is replaced by an equivalent ${p.mode === 's2d' ? 'delta' : 'star'}; seen from any two terminals both give ${si(abD, 'Ω')} between A and B.`, why: 'Two networks are equivalent if the resistance between every pair of terminals is the same. Solving those three conditions gives the conversion formulas.', param: 'The three resistances of the given network.', effect: 'For a balanced network R_star = R_delta / 3 (and R_delta = 3·R_star).' },
      };
    },
    steps: (p, c) => [
      { title: 'Given network', text: p.mode === 's2d' ? `Star: R_A = ${p.Ra}, R_B = ${p.Rb}, R_C = ${p.Rc} Ω meeting at a centre point.` : `Delta: R_AB = ${p.Rab}, R_BC = ${p.Rbc}, R_CA = ${p.Rca} Ω forming a triangle.` },
      { title: 'Apply the formula', text: p.mode === 's2d' ? 'Each delta resistor = (sum of products of star pairs) / opposite star resistor.' : 'Each star arm = product of the two delta resistors touching that terminal / sum of all three.' },
      { title: 'Equivalent network', text: p.mode === 's2d' ? `R_AB = ${n(c.Rab)}, R_BC = ${n(c.Rbc)}, R_CA = ${n(c.Rca)} Ω.` : `R_A = ${n(c.Ra)}, R_B = ${n(c.Rb)}, R_C = ${n(c.Rc)} Ω.` },
      { title: 'Check', text: `Resistance between A and B is ${n(c.abD)} Ω in both networks.` },
    ],
    draw(g, S) {
      const { c, p, step, t } = S; bgGrid(g);
      const tri = (cx, cy, s) => ({ A: [cx, cy - s], B: [cx - s * 0.87, cy + s * 0.5], C: [cx + s * 0.87, cy + s * 0.5] });
      const drawDelta = (cx, cy, hi) => { const T = tri(cx, cy, 150); K.resistor(g, T.A, T.B, { label: 'R_AB', value: si(c.Rab, 'Ω'), color: hi ? C.red : undefined, body: 80 }); K.resistor(g, T.B, T.C, { label: 'R_BC', value: si(c.Rbc, 'Ω'), color: hi ? C.red : undefined, body: 80, labelSide: 'other' }); K.resistor(g, T.C, T.A, { label: 'R_CA', value: si(c.Rca, 'Ω'), color: hi ? C.red : undefined, body: 80 }); ['A', 'B', 'C'].forEach((k) => K.node(g, T[k][0], T[k][1], { label: k, r: 8, bg: C.violet, dx: k === 'A' ? 12 : k === 'B' ? -34 : 12, dy: k === 'A' ? -10 : 18 })); };
      const drawStar = (cx, cy, hi) => { const T = tri(cx, cy, 150); const O = [cx, cy]; [['A', 'R_A', c.Ra], ['B', 'R_B', c.Rb], ['C', 'R_C', c.Rc]].forEach(([k, lab, v]) => K.resistor(g, T[k], O, { label: lab, value: si(v, 'Ω'), color: hi ? C.green : undefined, body: 70 })); K.node(g, cx, cy, { r: 6, label: 'N', dx: 10, dy: 18 }); ['A', 'B', 'C'].forEach((k) => K.node(g, T[k][0], T[k][1], { label: k, r: 8, bg: C.violet, dx: k === 'A' ? 12 : k === 'B' ? -34 : 12, dy: k === 'A' ? -10 : 18 })); };
      const fromDelta = p.mode !== 's2d';
      D.text(g, fromDelta ? 'Given: DELTA (Δ)' : 'Given: STAR (Y)', 240, 60, { size: 18, weight: 800, align: 'center' });
      D.text(g, fromDelta ? 'Equivalent: STAR (Y)' : 'Equivalent: DELTA (Δ)', 760, 60, { size: 18, weight: 800, align: 'center', color: step >= 2 ? C.green : C.muted });
      if (fromDelta) drawDelta(240, 300, step === 0); else drawStar(240, 300, step === 0);
      g.save(); g.globalAlpha = step >= 2 ? 1 : 0.35; if (fromDelta) drawStar(760, 300, step >= 2); else drawDelta(760, 300, step >= 2); g.restore();
      D.arrow(g, 440, 300, 560, 300, { color: step >= 1 ? C.orange : C.faint, width: 5, head: 18 }); D.text(g, 'convert', 500, 278, { size: 15, weight: 800, align: 'center', color: C.orange });
      D.tag(g, fromDelta ? 'R_A = R_AB·R_CA / ΣR_Δ' : 'R_AB = ΣR_Y R_Y / R_C', 500, 340, { bg: C.ink, size: 13, align: 'center' });
      if (step >= 3) D.tag(g, `R between A–B = ${n(c.abD)} Ω in both ✓`, 500, 520, { bg: C.green, size: 15, align: 'center' });
      focusIf(g, step === 1, 440, 270, 120, 90, t);
    },
    challenge: {
      make(rand, p) { if (p.mode === 's2d') { const target = pick(rand, [30, 40, 50, 60, 80]); return { kind: 'delta-rab', prompt: `Choose star resistors so that the equivalent delta resistor R_AB = ${target} Ω.`, target, unit: 'Ω', tolerance: 0.5, hint: 'R_AB = R_A + R_B + R_A·R_B / R_C', setup: { mode: 's2d', Ra: 5, Rb: 5, Rc: 5 } }; } const target = pick(rand, [5, 8, 10, 12, 15]); return { kind: 'star-ra', prompt: `Choose delta resistors so that the equivalent star arm R_A = ${target} Ω.`, target, unit: 'Ω', tolerance: 0.2, hint: 'R_A = R_AB·R_CA / (R_AB + R_BC + R_CA). A balanced delta of 3R gives R.', setup: { mode: 'd2s', Rab: 20, Rbc: 20, Rca: 20 } }; },
      evaluate(p) { const kind = p.mode === 's2d' ? 'delta-rab' : 'star-ra'; const v = KINDS[kind](p); return { value: v, text: `${kind === 'star-ra' ? 'R_A' : 'R_AB'} = ${n(v, 4)} Ω`, calculation: kind === 'star-ra' ? `R_A = ${p.Rab}×${p.Rca}/(${p.Rab}+${p.Rbc}+${p.Rca}) = ${n(v, 4)} Ω` : `R_AB = ${p.Ra}+${p.Rb}+${p.Ra}×${p.Rb}/${p.Rc} = ${n(v, 4)} Ω` }; },
    },
  };

  // ───────────────────────── 7. Nodal analysis ─────────────────────────
  const NET = { E1: [120, 130], n1: [360, 130], n2: [620, 130], gnd: 440 };
  S['ee-nodal'] = {
    live: true,
    params: [
      { key: 'E1', label: 'Source E₁', type: 'range', min: 1, max: 30, step: 1, default: 20, unit: 'V' },
      RES('R1', 5), RES('R2', 10), RES('R3', 5), RES('R4', 10),
      { key: 'useR5', label: 'Branch R₅ from node 2', type: 'toggle', default: true },
      Object.assign(RES('R5', 5), { showIf: (p) => p.useR5 }),
      { key: 'useE2', label: 'Source E₂ in series with R₅', type: 'toggle', default: true, showIf: (p) => p.useR5 },
      { key: 'E2', label: 'Source E₂', type: 'range', min: 0, max: 30, step: 1, default: 10, unit: 'V', showIf: (p) => p.useR5 && p.useE2 },
    ],
    stepDuration: 3.5,
    examples: [{ label: 'Two sources', values: { E1: 20, E2: 10, R1: 5, R2: 10, R3: 5, R4: 10, R5: 5, useR5: true, useE2: true } }, { label: 'One source', values: { E1: 12, R1: 2, R2: 6, R3: 4, R4: 12, useR5: false } }],
    compute(p) {
      const cfg = Object.assign({}, p, { useE2: p.useR5 && p.useE2 ? 1 : 0, useR5: p.useR5 ? 1 : 0 }); const [V1, V2] = K.nodal(cfg);
      const E2 = cfg.useE2 ? p.E2 : 0;
      const I1 = (p.E1 - V1) / p.R1, I2 = V1 / p.R2, I3 = (V1 - V2) / p.R3, I4 = V2 / p.R4, I5 = p.useR5 ? (V2 - E2) / p.R5 : 0;
      const eq1 = `(V₁ − ${p.E1})/${p.R1} + V₁/${p.R2} + (V₁ − V₂)/${p.R3} = 0`;
      const eq2 = `(V₂ − V₁)/${p.R3} + V₂/${p.R4}${p.useR5 ? ` + (V₂ − ${E2})/${p.R5}` : ''} = 0`;
      const a = 1 / p.R1 + 1 / p.R2 + 1 / p.R3, b = -1 / p.R3, d = 1 / p.R3 + 1 / p.R4 + (p.useR5 ? 1 / p.R5 : 0), r1 = p.E1 / p.R1, r2 = p.useR5 ? E2 / p.R5 : 0;
      return {
        V1, V2, I1, I2, I3, I4, I5, eq1, eq2, a, b, d, r1, r2, E2,
        formulas: [F('KCL at node 1', 'Σ (V₁ − V_other)/R = 0', 'currents leaving node 1', eq1, `${n(a, 4)}·V₁ ${b < 0 ? '−' : '+'} ${n(Math.abs(b), 4)}·V₂ = ${n(r1, 4)}`, 'A'), F('KCL at node 2', 'Σ (V₂ − V_other)/R = 0', 'currents leaving node 2', eq2, `${n(b, 4)}·V₁ + ${n(d, 4)}·V₂ = ${n(r2, 4)}`, 'A'), F('Solve (Cramer’s rule)', '[G]·[V] = [I]', `Δ = ${n(a * d - b * b, 5)}`, `V₁ = (${n(r1, 4)}·${n(d, 4)} − ${n(b, 4)}·${n(r2, 4)})/Δ`, `V₁ = ${n(V1, 4)} V, V₂ = ${n(V2, 4)} V`, 'V')],
        readouts: [{ label: 'V₁', value: si(V1, 'V'), tone: 'good' }, { label: 'V₂', value: si(V2, 'V'), tone: 'good' }, { label: 'I_R3', value: si(I3, 'A') }, { label: 'I_R1', value: si(I1, 'A') }],
        state: { network: `E₁ = ${p.E1} V via R₁ = ${p.R1} Ω to node 1; R₂ = ${p.R2} Ω node 1–ground; R₃ = ${p.R3} Ω node 1–2; R₄ = ${p.R4} Ω node 2–ground${p.useR5 ? `; R₅ = ${p.R5} Ω${cfg.useE2 ? ` with E₂ = ${E2} V` : ''} node 2–ground` : ''}`, referenceNode: 'bottom rail (ground, 0 V)', equations: [eq1, eq2], nodeVoltages: { V1: si(V1, 'V'), V2: si(V2, 'V') }, branchCurrents: { R1: si(I1, 'A'), R2: si(I2, 'A'), R3: si(I3, 'A'), R4: si(I4, 'A'), ...(p.useR5 ? { R5: si(I5, 'A') } : {}) } },
        explain: { what: `With the bottom rail as reference, node 1 sits at ${si(V1, 'V')} and node 2 at ${si(V2, 'V')}.`, why: 'Once the node voltages are known every branch current follows from Ohm’s law; KCL at each unknown node gives exactly as many equations as unknowns.', param: 'Sources and resistances (and which branches are connected).', effect: 'Raising E₁ lifts both node voltages; lowering R₂ pulls node 1 towards ground.' },
      };
    },
    steps: (p, c) => [
      { title: 'The circuit', text: 'A DC network with two principal nodes above the bottom rail.' },
      { title: 'Select the reference node', text: 'The bottom rail is taken as ground (0 V).' },
      { title: 'Unknown node voltages', text: 'Label the other principal nodes V₁ and V₂.' },
      { title: 'KCL at node 1', text: c.eq1 },
      { title: 'KCL at node 2', text: c.eq2 },
      { title: 'Form the equations', text: `${n(c.a, 4)}V₁ ${c.b < 0 ? '−' : '+'} ${n(Math.abs(c.b), 4)}V₂ = ${n(c.r1, 4)};  ${n(c.b, 4)}V₁ + ${n(c.d, 4)}V₂ = ${n(c.r2, 4)}` },
      { title: 'Solve', text: `V₁ = ${n(c.V1, 4)} V, V₂ = ${n(c.V2, 4)} V.` },
      { title: 'Node voltages and currents', text: `I_R1 = ${n(c.I1)} A, I_R2 = ${n(c.I2)} A, I_R3 = ${n(c.I3)} A, I_R4 = ${n(c.I4)} A${p.useR5 ? `, I_R5 = ${n(c.I5)} A` : ''}.` },
    ],
    draw(g, S) {
      const { c, p, step, t } = S; bgGrid(g);
      const G = 440, y = 130, x0 = 100, x1 = 330, x2 = 600, x3 = 830;
      K.wire(g, [[x0, 250], [x0, y], [150, y]]); K.resistor(g, [150, y], [x1, y], { label: 'R₁', value: `${p.R1} Ω`, body: 80 });
      K.resistor(g, [x1, y], [x2, y], { label: 'R₃', value: `${p.R3} Ω`, body: 80 });
      K.wire(g, [[x0, 330], [x0, G], [p.useR5 ? x3 : x2, G]]); K.cell(g, [x0, 330], [x0, 250], { label: 'E₁', value: `${p.E1} V`, labelOffset: 44 });
      K.resistor(g, [x1, y], [x1, G], { label: 'R₂', value: `${p.R2} Ω`, body: 80, labelSide: 'other' }); K.resistor(g, [x2, y], [x2, G], { label: 'R₄', value: `${p.R4} Ω`, body: 80, labelSide: 'other' });
      if (p.useR5) { K.wire(g, [[x2, y], [x3, y], [x3, 170]]); K.resistor(g, [x3, 170], [x3, 290], { label: 'R₅', value: `${p.R5} Ω`, body: 70, labelSide: 'other' }); if (p.useE2) { K.cell(g, [x3, 370], [x3, 290], { label: 'E₂', value: `${p.E2} V`, labelOffset: 40 }); K.wire(g, [[x3, 370], [x3, G]]); } else K.wire(g, [[x3, 290], [x3, G]]); }
      // flows
      K.flow(g, [[x0, 250], [x0, y], [x1, y]], t, c.I1, { ref: 1 }); K.flow(g, [[x1, y], [x1, G]], t, c.I2, { ref: 1, color: C.green }); K.flow(g, [[x1, y], [x2, y]], t, c.I3, { ref: 1, color: C.cyan }); K.flow(g, [[x2, y], [x2, G]], t, c.I4, { ref: 1, color: C.violet }); if (p.useR5) K.flow(g, [[x2, y], [x3, y], [x3, G]], t, c.I5, { ref: 1, color: C.pink });
      // reference & nodes
      if (step >= 1) { K.ground(g, 460, G); D.tag(g, 'Reference 0 V', 470, G + 44, { bg: C.ink, size: 13 }); D.line(g, x0, G, p.useR5 ? x3 : x2, G, { color: step === 1 ? C.amber : '#334155', width: step === 1 ? 6 : 3 }); }
      const nodeCol = (k) => (step === 3 && k === 1) || (step === 4 && k === 2) ? C.red : C.violet;
      if (step >= 2) { K.node(g, x1, y, { r: 9, color: nodeCol(1), label: step >= 6 ? `V₁ = ${n(c.V1, 3)} V` : 'V₁ = ?', bg: step >= 6 ? C.green : nodeCol(1), dx: -40, dy: -30 }); K.node(g, x2, y, { r: 9, color: nodeCol(2), label: step >= 6 ? `V₂ = ${n(c.V2, 3)} V` : 'V₂ = ?', bg: step >= 6 ? C.green : nodeCol(2), dx: -40, dy: -30 }); }
      if (step >= 7) { K.currentArrow(g, [180, y], [300, y], si(c.I1, 'A'), { dy: 30 }); K.currentArrow(g, [x1 + 60, y], [x2 - 60, y], si(c.I3, 'A'), { color: C.cyan, dy: 30 }); }
      // equations panel
      K.infoBox(g, 600, 480, [{ t: step >= 3 ? c.eq1 : 'KCL at node 1 …', size: 13 }, { t: step >= 4 ? c.eq2 : 'KCL at node 2 …', size: 13 }], { w: 390, lh: 20 });
      focusIf(g, step === 3, x1 - 30, y - 30, 60, 60, t); focusIf(g, step === 4, x2 - 30, y - 30, 60, 60, t);
    },
    challenge: {
      make(rand) { const target = pick(rand, [6, 8, 10, 12, 14]); return { kind: 'nodal-v1', prompt: `Adjust the circuit (sources or resistors) so that the node voltage V₁ = ${target} V.`, target, unit: 'V', tolerance: 0.15, hint: 'Write the KCL equation at node 1 — raising E₁ or lowering R₁ raises V₁.', setup: { E1: 20, E2: 10, R1: 10, R2: 10, R3: 10, R4: 10, R5: 10, useR5: true, useE2: true } }; },
      evaluate(p) { const cfg = Object.assign({}, p, { useE2: p.useR5 && p.useE2 ? 1 : 0, useR5: p.useR5 ? 1 : 0 }); const v = KINDS['nodal-v1'](cfg); return { value: v, text: `V₁ = ${n(v, 4)} V`, calculation: `Solving the two KCL equations gives V₁ = ${n(v, 4)} V` }; },
    },
  };

  // ───────────────────────── 8. Mesh analysis ─────────────────────────
  S['ee-mesh'] = {
    live: true,
    params: [
      { key: 'E1', label: 'Source E₁ (left)', type: 'range', min: 0, max: 30, step: 1, default: 20, unit: 'V' },
      { key: 'E2', label: 'Source E₂ (right)', type: 'range', min: 0, max: 30, step: 1, default: 10, unit: 'V' },
      RES('R1', 5), RES('R2', 10), RES('R3', 10),
    ],
    stepDuration: 3.5,
    examples: [{ label: 'Textbook two-mesh', values: { E1: 20, E2: 10, R1: 5, R2: 10, R3: 10 } }, { label: 'Equal sources', values: { E1: 12, E2: 12, R1: 2, R2: 2, R3: 4 } }],
    compute(p) {
      const [I1, I2] = K.mesh(p); const I3 = I1 - I2;
      const eq1 = `${p.E1} = ${p.R1}·I₁ + ${p.R3}·(I₁ − I₂)`; const eq2 = `−${p.E2} = ${p.R2}·I₂ + ${p.R3}·(I₂ − I₁)`;
      return {
        I1, I2, I3, eq1, eq2,
        formulas: [F('KVL in mesh 1', 'ΣE = ΣIR around mesh 1', `E₁ = ${p.E1} V`, eq1, `${p.R1 + p.R3}·I₁ − ${p.R3}·I₂ = ${p.E1}`, 'V'), F('KVL in mesh 2', 'ΣE = ΣIR around mesh 2', `E₂ = ${p.E2} V (opposes I₂)`, eq2, `−${p.R3}·I₁ + ${p.R2 + p.R3}·I₂ = −${p.E2}`, 'V'), F('Solve', '[R]·[I] = [E]', '', `Δ = ${n((p.R1 + p.R3) * (p.R2 + p.R3) - p.R3 * p.R3)}`, `I₁ = ${n(I1, 4)} A, I₂ = ${n(I2, 4)} A, I_R3 = I₁ − I₂ = ${n(I3, 4)} A`, 'A')],
        readouts: [{ label: 'I₁', value: si(I1, 'A'), tone: 'good' }, { label: 'I₂', value: si(I2, 'A'), tone: 'good' }, { label: 'I_R3', value: si(I3, 'A') }],
        state: { network: `E₁ = ${p.E1} V, R₁ = ${p.R1} Ω (mesh 1); R₃ = ${p.R3} Ω shared; R₂ = ${p.R2} Ω, E₂ = ${p.E2} V (mesh 2)`, meshCurrents: { I1: si(I1, 'A'), I2: si(I2, 'A') }, sharedBranchCurrent: si(I3, 'A'), equations: [eq1, eq2] },
        explain: { what: `Mesh currents I₁ = ${si(I1, 'A')} and I₂ = ${si(I2, 'A')} (clockwise); the shared resistor carries their difference ${si(I3, 'A')}.`, why: 'Each mesh current satisfies KVL around its own window; a branch shared by two meshes carries the algebraic sum of both mesh currents.', param: 'E₁, E₂ and the resistances.', effect: I2 < 0 ? 'I₂ is negative: the right mesh current actually flows anticlockwise.' : 'Changing R₃ changes how strongly the two meshes are coupled.' },
      };
    },
    steps: (p, c) => [
      { title: 'The circuit', text: 'Two windows (meshes) share the middle resistor R₃.' },
      { title: 'Identify meshes', text: 'Mesh 1: E₁–R₁–R₃. Mesh 2: R₃–R₂–E₂.' },
      { title: 'Assign mesh currents', text: 'I₁ and I₂ both clockwise.' },
      { title: 'KVL in mesh 1', text: c.eq1 },
      { title: 'KVL in mesh 2', text: c.eq2 },
      { title: 'Solve', text: `I₁ = ${n(c.I1, 4)} A, I₂ = ${n(c.I2, 4)} A.` },
      { title: 'Branch currents', text: `I through R₃ = I₁ − I₂ = ${n(c.I3, 4)} A.` },
    ],
    draw(g, S) {
      const { c, p, step, t } = S; bgGrid(g);
      const L = 120, M = 420, R = 720, T = 120, B = 440;
      K.wire(g, [[L, 240], [L, T], [180, T]]); K.resistor(g, [180, T], [360, T], { label: 'R₁', value: `${p.R1} Ω` }); K.wire(g, [[360, T], [480, T]]); K.resistor(g, [480, T], [660, T], { label: 'R₂', value: `${p.R2} Ω` }); K.wire(g, [[660, T], [R, T], [R, 240]]);
      K.wire(g, [[L, 320], [L, B], [R, B], [R, 320]]); K.cell(g, [L, 320], [L, 240], { label: 'E₁', value: `${p.E1} V`, labelOffset: 44 }); K.cell(g, [R, 320], [R, 240], { label: 'E₂', value: `${p.E2} V`, labelOffset: 44, labelSide: 'other' });
      K.wire(g, [[M, T], [M, 210]]); K.resistor(g, [M, 210], [M, 350], { label: 'R₃', value: `${p.R3} Ω`, labelSide: 'other' }); K.wire(g, [[M, 350], [M, B]]); K.node(g, M, T, { r: 5 }); K.node(g, M, B, { r: 5 });
      if (step >= 1) { D.rect(g, L + 25, T + 25, M - L - 50, B - T - 50, { stroke: C.blue, width: 2.5, dash: [8, 6], r: 16, fill: step === 1 ? 'rgba(37,99,235,0.05)' : undefined }); D.rect(g, M + 25, T + 25, R - M - 50, B - T - 50, { stroke: C.orange, width: 2.5, dash: [8, 6], r: 16, fill: step === 1 ? 'rgba(234,88,12,0.05)' : undefined }); }
      const loopArrow = (cx, cy, col, lab) => { g.save(); g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 55, -Math.PI * 0.4, Math.PI * 1.3); g.stroke(); g.restore(); D.arrow(g, cx + 55 * Math.cos(Math.PI * 1.25), cy + 55 * Math.sin(Math.PI * 1.25), cx + 55 * Math.cos(Math.PI * 1.32), cy + 55 * Math.sin(Math.PI * 1.32), { color: col, head: 16 }); D.text(g, lab, cx, cy, { size: 18, weight: 900, align: 'center', color: col }); };
      if (step >= 2) { loopArrow((L + M) / 2, (T + B) / 2, C.blue, step >= 5 ? `I₁ = ${n(c.I1, 3)} A` : 'I₁'); loopArrow((M + R) / 2, (T + B) / 2, C.orange, step >= 5 ? `I₂ = ${n(c.I2, 3)} A` : 'I₂'); }
      K.flow(g, [[L, 240], [L, T], [M, T], [M, B], [L, B], [L, 320]], t, c.I1, { ref: 1, color: C.blue });
      K.flow(g, [[M, T], [R, T], [R, B], [M, B], [M, T]], t, c.I2, { ref: 1, color: C.orange, gap: 40 });
      if (step >= 6) D.tag(g, `I_R3 = I₁ − I₂ = ${n(c.I3, 3)} A`, M + 14, 280, { bg: C.violet, size: 13 });
      focusIf(g, step === 3, L + 20, T + 20, M - L - 40, B - T - 40, t); focusIf(g, step === 4, M + 20, T + 20, R - M - 40, B - T - 40, t);
      K.infoBox(g, 760, 140, [{ t: 'Mesh equations', b: true }, { t: step >= 3 ? `M1: ${p.R1 + p.R3}I₁ − ${p.R3}I₂ = ${p.E1}` : 'M1: …', size: 13 }, { t: step >= 4 ? `M2: −${p.R3}I₁ + ${p.R2 + p.R3}I₂ = −${p.E2}` : 'M2: …', size: 13 }, ...(step >= 5 ? [{ t: `I₁ = ${n(c.I1, 3)} A`, c: C.blue, b: true }, { t: `I₂ = ${n(c.I2, 3)} A`, c: C.orange, b: true }] : [])], { w: 230, lh: 24 });
    },
    challenge: {
      make(rand) { const target = pick(rand, [1, 1.5, 2, 2.5, 3]); return { kind: 'mesh-i1', prompt: `Adjust the sources or resistors so that the mesh current I₁ = ${target} A.`, target, unit: 'A', tolerance: 0.03, hint: 'Solve the two KVL equations; increasing E₁ increases I₁.', setup: { E1: 10, E2: 10, R1: 5, R2: 5, R3: 5 } }; },
      evaluate(p) { const v = KINDS['mesh-i1'](p); return { value: v, text: `I₁ = ${n(v, 4)} A`, calculation: `From the mesh equations: I₁ = ${n(v, 4)} A` }; },
    },
  };
})();
