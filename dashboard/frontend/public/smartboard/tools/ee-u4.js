'use strict';

/* U25EEG02 — Unit IV: Semiconductor Devices (6 simulations). Ideal-diode / Shockley and first-order transistor models. */
(function () {
  const S = (window.EESims = window.EESims || {});
  const D = window.EPDraw; const K = window.EEKit; const KINDS = window.EEChallengeKinds; const C = D.C;
  const { si, n } = K;
  const F = (name, formula, given, calc, result, unit) => ({ name, formula, given, calc, result, unit: unit || '—' });
  const pick = (rand, arr) => arr[Math.floor(rand() * arr.length) % arr.length];
  const focusIf = (g, on, x, y, w, h, t) => { if (on) D.focus(g, x, y, w, h, t); };
  const bg = (g) => D.clear(g, '#f8fafc');
  const VT = 0.02585;
  const MAT = { si: { Vk: 0.7, Is: 1e-13, name: 'Silicon' }, ge: { Vk: 0.3, Is: 1e-7, name: 'Germanium' } };
  const hash = (k) => { const x = Math.sin(k * 127.1) * 43758.5453; return x - Math.floor(x); };

  /** P | depletion | N block with animated carriers. drift > 0 → carriers cross the junction (forward bias). */
  function pnBlock(g, x, y, w, h, W, drift, t, o = {}) {
    const mid = x + w / 2; const dl = mid - W / 2, dr = mid + W / 2;
    D.rect(g, x, y, dl - x, h, { fill: '#fee2e2' }); D.rect(g, dr, y, x + w - dr, h, { fill: '#dbeafe' }); D.rect(g, dl, y, W, h, { fill: '#e5e7eb' });
    D.rect(g, x, y, w, h, { stroke: C.ink, width: 2.5, r: 8 });
    D.text(g, 'P', x + 30, y + 26, { size: 26, weight: 900, color: C.red }); D.text(g, 'N', x + w - 30, y + 26, { size: 26, weight: 900, color: C.blue, align: 'right' });
    if (W > 12) D.text(g, 'depletion region', mid, y - 14, { size: 13, weight: 800, align: 'center', color: C.muted });
    // fixed ions in the depletion region
    const rows = 5; for (let r = 0; r < rows; r++) for (let k = 0; k < Math.max(1, Math.floor(W / 22)); k++) { const yy = y + ((r + 0.5) * h) / rows; D.text(g, '−', dl + 8 + k * 11, yy, { size: 18, weight: 900, color: '#991b1b', align: 'center' }); D.text(g, '+', dr - 8 - k * 11, yy, { size: 16, weight: 900, color: '#1e3a8a', align: 'center' }); }
    // mobile carriers: holes in P (○), electrons in N (●)
    const count = 26;
    for (let k = 0; k < count; k++) {
      const ry = y + 12 + hash(k + 1) * (h - 24); const jitter = Math.sin(t * 3 + k) * 3;
      // holes move right, electrons left when forward biased
      const span = w * 0.9; const speed = drift * 60;
      let hx = x + 10 + ((hash(k + 50) * span + speed * t) % span); if (drift <= 0.01) hx = x + 10 + hash(k + 50) * (dl - x - 20);
      if (drift > 0.01 || hx < dl - 6) D.circle(g, hx, ry + jitter, 6, { fill: '#fff', stroke: C.red, width: 2.4, alpha: hx > dr ? 0.5 : 1 });
      let ex = x + w - 10 - ((hash(k + 90) * span + speed * t) % span); if (drift <= 0.01) ex = dr + 10 + hash(k + 90) * (x + w - dr - 20);
      if (drift > 0.01 || ex > dr + 6) D.circle(g, ex, y + 12 + hash(k + 7) * (h - 24) - jitter, 5, { fill: C.blue, alpha: ex < dl ? 0.5 : 1 });
    }
    if (o.legend !== false) { D.circle(g, x + 10, y + h + 22, 6, { fill: '#fff', stroke: C.red, width: 2.4 }); D.text(g, 'hole', x + 22, y + h + 22, { size: 13, weight: 700 }); D.circle(g, x + 80, y + h + 22, 5, { fill: C.blue }); D.text(g, 'electron', x + 92, y + h + 22, { size: 13, weight: 700 }); D.text(g, '− + fixed ions', x + 170, y + h + 22, { size: 13, weight: 700, color: C.muted }); }
    return { dl, dr };
  }

  // ───────────────────────── 23. PN junction ─────────────────────────
  S['ee-pn-junction'] = {
    live: true,
    params: [
      { key: 'bias', label: 'Bias', type: 'select', default: 'forward', options: [{ value: 'forward', label: 'Forward bias (P to +)' }, { value: 'reverse', label: 'Reverse bias (P to −)' }] },
      { key: 'Vs', label: 'Battery voltage', type: 'range', min: 0, max: 10, step: 0.1, default: 2, unit: 'V' },
      { key: 'R', label: 'Series resistance R', type: 'range', min: 50, max: 2000, step: 10, default: 100, unit: 'Ω' },
      { key: 'material', label: 'Material', type: 'select', default: 'si', options: [{ value: 'si', label: 'Silicon (V_k ≈ 0.7 V)' }, { value: 'ge', label: 'Germanium (V_k ≈ 0.3 V)' }] },
    ],
    examples: [{ label: 'Below the knee', values: { bias: 'forward', Vs: 0.4 } }, { label: 'Reverse biased', values: { bias: 'reverse', Vs: 6 } }],
    compute(p) {
      const m = MAT[p.material] || MAT.si; const fwd = p.bias === 'forward';
      const ImA = KINDS['diode-current-ma'](p); const Vd = fwd ? (p.Vs > m.Vk ? m.Vk : p.Vs) : -p.Vs;
      const Vbi = m.Vk + 0.05; const W0 = 60; const W = Math.max(8, Math.min(200, W0 * Math.sqrt(Math.max(0.02, Vbi - Vd) / Vbi)));
      const conducting = ImA > 0.001;
      return {
        ImA, Vd, W, conducting, m,
        formulas: [F('Diode current (constant-voltage model)', fwd ? 'I = (V_s − V_k) / R  for V_s > V_k' : 'Reverse: I ≈ I_s (a few nA/µA)', `V_s = ${p.Vs} V, R = ${p.R} Ω, V_k = ${m.Vk} V`, fwd ? (p.Vs > m.Vk ? `(${p.Vs} − ${m.Vk}) / ${p.R}` : `${p.Vs} V < V_k → no conduction`) : 'reverse saturation only', fwd ? `${n(ImA, 4)} mA` : '≈ 0 (leakage)', 'mA'), F('Depletion width', 'W ∝ √(V_bi − V_D)', `V_D = ${n(Vd, 3)} V`, '', fwd ? (conducting ? 'narrow' : 'slightly narrower') : 'wider', '—')],
        readouts: [{ label: 'Bias', value: fwd ? 'forward' : 'reverse' }, { label: 'Current', value: fwd ? `${n(ImA, 4)} mA` : '≈ 0 (nA)', tone: conducting ? 'good' : '' }, { label: 'V_D', value: `${n(Vd, 3)} V` }, { label: 'Depletion', value: W > 70 ? 'wide' : W < 40 ? 'narrow' : 'normal' }],
        state: { material: m.name, bias: p.bias, sourceVoltage: `${p.Vs} V`, diodeVoltage: `${n(Vd, 3)} V`, current: fwd ? `${n(ImA, 4)} mA` : 'reverse leakage only', depletionRegion: W > 70 ? 'widened' : W < 40 ? 'narrowed' : 'about equilibrium width', carriers: fwd && conducting ? 'holes and electrons cross the junction and recombine' : 'majority carriers pulled away from the junction' },
        explain: { what: fwd ? (conducting ? `Forward bias above the knee: the depletion region shrinks and ${n(ImA, 3)} mA flows.` : `Only ${p.Vs} V — below the ${m.Vk} V knee, the barrier still blocks most carriers.`) : `Reverse bias: the depletion region widens and only a tiny leakage current flows.`, why: 'The depletion region is a barrier of fixed ions created by diffusion. Forward bias pushes holes and electrons toward the junction and lowers the barrier; reverse bias pulls them away and raises it.', param: 'Bias direction, battery voltage, series resistance and material.', effect: 'Above the knee voltage the current rises steeply and is limited only by R; in reverse the current stays near zero until breakdown.' },
      };
    },
    steps: (p, c) => [
      { title: 'The PN junction', text: 'P-type (holes) and N-type (electrons) meet; diffusion leaves a depletion region of fixed ions.' },
      { title: p.bias === 'forward' ? 'Forward bias' : 'Reverse bias', text: p.bias === 'forward' ? 'P side connected to +: carriers are pushed toward the junction.' : 'P side connected to −: carriers are pulled away from the junction.' },
      { title: 'Depletion region', text: c.W < 40 ? 'The depletion region narrows — the barrier is lowered.' : c.W > 70 ? 'The depletion region widens — the barrier is raised.' : 'The barrier is still in place.' },
      { title: 'Current', text: c.conducting ? `Carriers cross and recombine: I = ${n(c.ImA, 3)} mA.` : 'Almost no current flows.' },
    ],
    draw(g, S) {
      const { p, c, step, t } = S; bg(g);
      const fwd = p.bias === 'forward'; const drift = c.conducting ? Math.min(1.5, 0.2 + c.ImA / 20) : 0;
      const blk = pnBlock(g, 120, 90, 520, 180, c.W, step >= 1 ? drift : 0, t);
      // external circuit: battery below, R, ammeter
      K.wire(g, [[120, 180], [70, 180], [70, 420], [250, 420]]); K.wire(g, [[640, 180], [690, 180], [690, 420], [470, 420]]);
      const posLeft = fwd; K.cell(g, posLeft ? [330, 420] : [250, 420], posLeft ? [250, 420] : [330, 420], { label: 'V_s', value: `${p.Vs} V`, labelOffset: 34 });
      K.resistor(g, [330, 420], [470, 420], { label: 'R', value: `${p.R} Ω`, labelSide: 'other' });
      K.meter(g, 690, 300, 'A', fwd ? `${n(c.ImA, 3)} mA` : '≈ 0');
      if (c.conducting) K.flow(g, [[250, 420], [70, 420], [70, 180], [120, 180]], t, c.ImA / 1000, { ref: 0.01 });
      D.text(g, posLeft ? '+' : '−', 100, 160, { size: 22, weight: 900, color: posLeft ? C.red : C.blue }); D.text(g, posLeft ? '−' : '+', 660, 160, { size: 22, weight: 900, color: posLeft ? C.blue : C.red });
      focusIf(g, step === 2, blk.dl - 10, 80, blk.dr - blk.dl + 20, 200, t);
      // mini V-I
      const m = c.m; const pts = []; for (let v = -1; v <= 1.0001; v += 0.01) pts.push([v, Math.min(60, m.Is * (Math.exp(v / VT) - 1) * 1000)]);
      D.chart(g, 760, 90, 210, 190, { xmin: -1, xmax: 1, ymin: -5, ymax: 60, xticks: 4, yticks: 3, xlabel: 'V_D (V)', ylabel: 'I (mA)', title: 'V-I', series: [{ points: pts, color: C.violet, width: 2.5 }], marks: [{ point: [Math.max(-1, c.Vd), fwd ? Math.min(60, c.ImA) : 0], color: C.orange }], ylabelOffset: 34 });
      K.infoBox(g, 760, 330, [{ t: fwd ? 'FORWARD BIAS' : 'REVERSE BIAS', b: true, c: fwd ? C.green : C.red }, `depletion ${c.W < 40 ? 'narrow' : c.W > 70 ? 'wide' : 'normal'}`, c.conducting ? `I = ${n(c.ImA, 3)} mA` : 'I ≈ 0'], { w: 210 });
    },
    challenge: {
      make(rand) { const target = pick(rand, [5, 10, 15, 20]); return { kind: 'diode-current-ma', prompt: `Forward-bias the silicon diode so that a current of ${target} mA flows. Choose the battery voltage and series resistance.`, target, unit: 'mA', tolerance: 0.3, hint: 'I = (V_s − 0.7) / R', setup: { bias: 'reverse', Vs: 2, R: 500, material: 'si' } }; },
      evaluate(p) { const v = KINDS['diode-current-ma'](p); return { value: v, text: `I = ${n(v, 4)} mA`, calculation: p.bias === 'reverse' ? 'Reverse biased → I ≈ 0' : `I = (${p.Vs} − ${(MAT[p.material] || MAT.si).Vk}) / ${p.R} = ${n(v, 4)} mA` }; },
    },
  };

  // ───────────────────────── 24. PN junction V-I ─────────────────────────
  S['ee-pn-vi'] = {
    params: [
      { key: 'material', label: 'Material', type: 'select', default: 'si', options: [{ value: 'si', label: 'Silicon' }, { value: 'ge', label: 'Germanium' }] },
      { key: 'V', label: 'Applied diode voltage V_D', type: 'range', min: -60, max: 0.85, step: 0.01, default: 0.65, unit: 'V' },
      { key: 'Vbr', label: 'Reverse breakdown voltage', type: 'range', min: 20, max: 50, step: 1, default: 40, unit: 'V' },
    ],
    compute(p) {
      const m = MAT[p.material] || MAT.si; const Rz = 20;
      const I = p.V >= -p.Vbr ? m.Is * (Math.exp(Math.min(p.V, 1.2) / VT) - 1) : -((-p.V - p.Vbr) / Rz) - m.Is;
      const region = p.V >= m.Vk * 0.85 ? 'forward conduction (above the knee)' : p.V >= 0 ? 'forward, below the knee (very small current)' : p.V >= -p.Vbr ? 'reverse — saturation current only' : 'reverse breakdown (avalanche)';
      return {
        I, region, m, Rz,
        formulas: [F('Diode equation (Shockley)', 'I = I_s (e^{V/V_T} − 1),  V_T = 25.85 mV', `I_s = ${D.fmt(m.Is, 2)} A, V = ${p.V} V`, p.V >= -p.Vbr ? `${D.fmt(m.Is, 2)} × (e^{${p.V}/0.02585} − 1)` : `breakdown: (|V| − ${p.Vbr}) / ${Rz} Ω`, si(I, 'A'), 'A')],
        readouts: [{ label: 'V_D', value: `${p.V} V` }, { label: 'I', value: si(I, 'A'), tone: Math.abs(I) > 1e-3 ? 'good' : '' }, { label: 'Region', value: region }],
        state: { material: m.name, voltage: `${p.V} V`, current: si(I, 'A'), region, kneeVoltage: `${m.Vk} V`, breakdownVoltage: `${p.Vbr} V` },
        explain: { what: `At ${p.V} V the ${m.name} diode is in ${region}; I = ${si(I, 'A')}.`, why: 'The current depends exponentially on the forward voltage because the barrier lowers linearly with V while the number of carriers able to cross grows exponentially. In reverse only thermally generated minority carriers flow until the field is strong enough for avalanche breakdown.', param: 'Material, applied voltage and breakdown voltage.', effect: 'Every ~60 mV of extra forward voltage multiplies the current by ten; germanium turns on earlier but leaks more in reverse.' },
      };
    },
    steps: (p, c) => [
      { title: 'Forward region', text: `Current is tiny until the knee (≈ ${c.m.Vk} V), then rises steeply.` },
      { title: 'Reverse region', text: `Only the reverse saturation current I_s ≈ ${D.fmt(c.m.Is, 2)} A flows.` },
      { title: 'Breakdown', text: `At −${p.Vbr} V avalanche breakdown makes the reverse current rise sharply — the diode can be damaged.` },
      { title: 'Operating point', text: `V = ${p.V} V → I = ${si(c.I, 'A')} (${c.region}).` },
    ],
    draw(g, S) {
      const { p, c, step } = S; bg(g);
      const m = c.m; const fwd = []; for (let v = 0; v <= 0.9; v += 0.005) fwd.push([v, Math.min(100, m.Is * (Math.exp(v / VT) - 1) * 1000)]);
      D.chart(g, 90, 70, 380, 330, { xmin: 0, xmax: 0.9, ymin: 0, ymax: 100, xlabel: 'Forward voltage (V)', ylabel: 'Forward current (mA)', title: `Forward characteristic — ${m.name}`, series: [{ points: fwd, color: C.violet, width: step === 0 ? 4 : 3 }], marks: [{ x: m.Vk, label: `knee ≈ ${m.Vk} V`, color: C.muted }, ...(p.V >= 0 ? [{ point: [p.V, Math.min(100, c.I * 1000)], label: si(c.I, 'A'), color: C.orange }] : [])] });
      const rev = []; for (let v = -60; v <= 0; v += 0.25) { const I = v >= -p.Vbr ? -m.Is * 1e6 : -((-v - p.Vbr) / c.Rz) * 1e6; rev.push([v, Math.max(-100, I / 1000)]); }
      D.chart(g, 570, 70, 380, 330, { xmin: -60, xmax: 0, ymin: -100, ymax: 5, xlabel: 'Reverse voltage (V)', ylabel: 'Reverse current (mA)', title: 'Reverse characteristic', series: [{ points: rev, color: C.red, width: step >= 1 && step <= 2 ? 4 : 3 }], marks: [{ x: -p.Vbr, label: `V_BR = −${p.Vbr} V`, color: C.red }, ...(p.V < 0 ? [{ point: [p.V, Math.max(-100, c.I * 1000)], label: si(c.I, 'A'), color: C.orange }] : [])] });
      K.infoBox(g, 90, 460, [{ t: c.region, b: true, c: C.green }, `V = ${p.V} V, I = ${si(c.I, 'A')}  (reverse saturation ${D.fmt(m.Is, 2)} A)`], { w: 860 });
    },
    challenge: {
      make(rand) { const target = pick(rand, [2, 5, 10, 20]); return { kind: 'diode-shockley-ma', prompt: `Set the voltage across the silicon diode so that the forward current is ${target} mA.`, target, unit: 'mA', tolerance: target * 0.1, hint: 'Look at the forward curve — the current grows ten-fold for about 60 mV.', setup: { material: 'si', V: 0.5 } }; },
      evaluate(p) { const v = KINDS['diode-shockley-ma'](p); return { value: v, text: `I = ${n(v, 4)} mA`, calculation: `I = I_s(e^{${p.V}/0.02585} − 1) = ${n(v, 4)} mA` }; },
    },
  };

  // ───────────────────────── 25. Zener diode ─────────────────────────
  S['ee-zener'] = {
    live: true,
    params: [
      { key: 'Vin', label: 'Input voltage V_in', type: 'range', min: 0, max: 30, step: 0.5, default: 15, unit: 'V' },
      { key: 'Vz', label: 'Zener voltage V_Z', type: 'select', default: 9.1, options: [3.3, 5.1, 6.2, 9.1, 12].map((v) => ({ value: v, label: `${v} V` })) },
      { key: 'Rs', label: 'Series resistor R_s', type: 'range', min: 50, max: 2000, step: 10, default: 220, unit: 'Ω' },
      { key: 'RL', label: 'Load resistance R_L', type: 'range', min: 100, max: 10000, step: 50, default: 1000, unit: 'Ω' },
    ],
    compute(p) {
      const Vz = Number(p.Vz); const Vth = (p.Vin * p.RL) / (p.Rs + p.RL); const on = Vth >= Vz;
      const Vout = on ? Vz : Vth; const Is = (p.Vin - Vout) / p.Rs; const IL = Vout / p.RL; const Iz = on ? Is - IL : 0;
      return {
        Vz, Vth, on, Vout, Is, IL, Iz,
        formulas: [F('Is the Zener in breakdown?', 'V_open = V_in · R_L / (R_s + R_L)  ≥ V_Z ?', `V_in = ${p.Vin} V`, `${p.Vin} × ${p.RL}/(${p.Rs}+${p.RL}) = ${n(Vth, 4)} V`, on ? 'yes → V_out = V_Z' : 'no → Zener off', 'V'), F('Currents', 'I_s = (V_in − V_out)/R_s;  I_L = V_out/R_L;  I_Z = I_s − I_L', '', `I_s = ${n(Is * 1000, 4)} mA, I_L = ${n(IL * 1000, 4)} mA`, `I_Z = ${n(Iz * 1000, 4)} mA`, 'mA')],
        readouts: [{ label: 'V_out', value: si(Vout, 'V'), tone: on ? 'good' : 'bad' }, { label: 'I_Z', value: si(Iz, 'A') }, { label: 'I_L', value: si(IL, 'A') }, { label: 'State', value: on ? 'regulating (breakdown)' : 'off' }],
        state: { input: `${p.Vin} V`, zenerVoltage: `${Vz} V`, seriesResistor: `${p.Rs} Ω`, load: `${p.RL} Ω`, inBreakdown: on, outputVoltage: si(Vout, 'V'), zenerCurrent: si(Iz, 'A'), loadCurrent: si(IL, 'A') },
        explain: { what: on ? `The Zener is in reverse breakdown and holds the output at ${Vz} V; the extra ${n(Iz * 1000, 3)} mA flows through it.` : `The input is too low: the divider gives only ${n(Vth, 3)} V < V_Z, so the Zener is off.`, why: 'A Zener diode is heavily doped so it breaks down at a sharp, well-defined reverse voltage without damage. In breakdown its voltage hardly changes while its current changes a lot, so it absorbs the excess current and keeps V_out fixed.', param: 'Input voltage, Zener voltage, series and load resistance.', effect: 'Raising V_in raises I_Z but not V_out; lowering R_L takes current from the Zener — if I_Z reaches zero regulation is lost.' },
      };
    },
    steps: (p, c) => [
      { title: 'Reverse biased Zener', text: 'The Zener is connected in reverse across the load, with R_s in series.' },
      { title: 'Breakdown region', text: `Below ${c.Vz} V it blocks; at V_Z it conducts in reverse with an almost constant voltage.` },
      { title: 'Voltage variation', text: c.on ? `Any input above the threshold appears across R_s; V_out stays ${c.Vz} V.` : `The input must rise until the open-circuit voltage reaches ${c.Vz} V.` },
      { title: 'Currents', text: `I_s = ${n(c.Is * 1000, 3)} mA = I_Z ${n(c.Iz * 1000, 3)} mA + I_L ${n(c.IL * 1000, 3)} mA.` },
    ],
    draw(g, S) {
      const { p, c, step, t } = S; bg(g);
      K.wire(g, [[80, 250], [80, 120], [150, 120]]); K.resistor(g, [150, 120], [300, 120], { label: 'R_s', value: `${p.Rs} Ω` }); K.wire(g, [[300, 120], [480, 120], [480, 200]]); K.wire(g, [[80, 330], [80, 440], [480, 440], [480, 380]]);
      K.cell(g, [80, 330], [80, 250], { label: 'V_in', value: `${p.Vin} V`, labelOffset: 44 });
      K.wire(g, [[330, 120], [330, 220]]); K.zener(g, [330, 340], [330, 220], { label: 'Zener', value: `V_Z = ${c.Vz} V`, on: c.on, labelSide: 'other' }); K.wire(g, [[330, 340], [330, 440]]);
      K.resistor(g, [480, 200], [480, 380], { label: 'R_L', value: `${p.RL} Ω`, labelSide: 'other' }); K.node(g, 330, 120, { r: 5 }); K.node(g, 330, 440, { r: 5 });
      K.flow(g, [[80, 250], [80, 120], [330, 120]], t, c.Is, { ref: 0.02 }); if (c.on) K.flow(g, [[330, 120], [330, 440]], t, c.Iz, { ref: 0.02, color: C.green }); K.flow(g, [[330, 120], [480, 120], [480, 440], [330, 440]], t, c.IL, { ref: 0.02, color: C.blue }); K.flow(g, [[330, 440], [80, 440], [80, 330]], t, c.Is, { ref: 0.02 });
      D.tag(g, `V_out = ${n(c.Vout, 3)} V`, 480, 480, { bg: c.on ? C.green : C.red, size: 14, align: 'center' });
      if (c.on) D.tag(g, `I_Z = ${n(c.Iz * 1000, 3)} mA`, 340, 390, { bg: C.green, size: 12 });
      // Zener characteristic (reverse region)
      const Vz = c.Vz; const rz = 5; const pts = []; for (let v = 0; v <= Vz + 1.5; v += 0.02) pts.push([-v, v < Vz ? -0.001 : -((v - Vz) / rz) * 1000]);
      D.chart(g, 620, 70, 340, 200, { xmin: -(Vz + 1.5), xmax: 0.5, ymin: -60, ymax: 5, xlabel: 'V (V)', ylabel: 'I (mA)', title: 'Zener reverse characteristic', xticks: 4, yticks: 3, series: [{ points: pts, color: C.violet, width: 3 }], marks: [{ x: -Vz, label: `−V_Z`, color: C.red }, ...(c.on ? [{ point: [-(Vz + (c.Iz * rz)), -Math.min(60, c.Iz * 1000)], color: C.orange }] : [])] });
      // regulation: Vout vs Vin
      const reg = []; for (let v = 0; v <= 30; v += 0.25) { const vt = (v * p.RL) / (p.Rs + p.RL); reg.push([v, Math.min(vt, Vz)]); }
      D.chart(g, 620, 330, 340, 170, { xmin: 0, xmax: 30, ymin: 0, ymax: Math.max(14, Vz * 1.3), xlabel: 'V_in (V)', ylabel: 'V_out (V)', title: 'Regulation: V_out vs V_in', xticks: 5, yticks: 3, series: [{ points: reg, color: C.green, width: 3 }], marks: [{ point: [p.Vin, c.Vout], color: C.orange }] });
      focusIf(g, step === 1, 290, 210, 90, 140, t);
    },
    challenge: {
      make(rand) { const target = pick(rand, [5, 8, 10, 15, 20]); return { kind: 'zener-iz-ma', prompt: `With V_Z = 9.1 V, adjust the input or resistors so that the Zener current is ${target} mA while it regulates.`, target, unit: 'mA', tolerance: 0.5, hint: 'I_Z = (V_in − V_Z)/R_s − V_Z/R_L', setup: { Vz: 9.1, Vin: 12, Rs: 470, RL: 1000 } }; },
      evaluate(p) { const v = KINDS['zener-iz-ma'](Object.assign({}, p, { Vz: Number(p.Vz) })); return { value: v, text: `I_Z = ${n(v, 4)} mA`, calculation: `I_Z = (${p.Vin} − ${p.Vz})/${p.Rs} − ${p.Vz}/${p.RL} = ${n(v, 4)} mA` }; },
    },
  };

  // ───────────────────────── 26. BJT ─────────────────────────
  const bjtSolve = (p) => { const IB = Math.max(0, (p.VBB - 0.7) / (p.RB * 1000)); const ICsat = p.VCC / (p.RC * 1000); const ICa = p.beta * IB; const IC = Math.min(ICa, ICsat); const region = IB <= 0 ? 'cut-off' : ICa >= ICsat ? 'saturation' : 'active'; return { IB, IC, IE: IB + IC, VCE: region === 'saturation' ? 0.2 : p.VCC - IC * p.RC * 1000, region, ICsat }; };
  S['ee-bjt'] = {
    live: true,
    modes: [{ key: 'npn', label: 'NPN' }, { key: 'pnp', label: 'PNP' }],
    params: [
      { key: 'VBB', label: 'Base supply V_BB', type: 'range', min: 0, max: 5, step: 0.05, default: 2, unit: 'V' },
      { key: 'RB', label: 'Base resistor R_B', type: 'range', min: 10, max: 500, step: 5, default: 100, unit: 'kΩ' },
      { key: 'VCC', label: 'Collector supply V_CC', type: 'range', min: 3, max: 20, step: 0.5, default: 12, unit: 'V' },
      { key: 'RC', label: 'Collector resistor R_C', type: 'range', min: 0.5, max: 10, step: 0.1, default: 2, unit: 'kΩ' },
      { key: 'beta', label: 'Current gain β', type: 'range', min: 50, max: 300, step: 5, default: 100 },
    ],
    examples: [{ label: 'Cut-off', values: { VBB: 0.5 } }, { label: 'Saturation', values: { VBB: 5, RB: 20 } }],
    compute(p) {
      const r = bjtSolve(p); const npn = p.mode !== 'pnp';
      return {
        r, npn,
        formulas: [F('Base current', 'I_B = (V_BB − V_BE) / R_B,  V_BE ≈ 0.7 V', `V_BB = ${p.VBB} V, R_B = ${p.RB} kΩ`, `(${p.VBB} − 0.7) / ${p.RB} kΩ`, si(r.IB, 'A'), 'A'), F('Collector current', 'I_C = β I_B  (limited to V_CC/R_C in saturation)', `β = ${p.beta}`, `${p.beta} × ${si(r.IB, 'A')}`, si(r.IC, 'A'), 'A'), F('Emitter current and V_CE', 'I_E = I_B + I_C;  V_CE = V_CC − I_C R_C', '', `I_E = ${si(r.IE, 'A')}`, `V_CE = ${n(r.VCE, 4)} V`, 'V')],
        readouts: [{ label: 'Region', value: r.region, tone: r.region === 'active' ? 'good' : '' }, { label: 'I_B', value: si(r.IB, 'A') }, { label: 'I_C', value: si(r.IC, 'A') }, { label: 'I_E', value: si(r.IE, 'A') }, { label: 'V_CE', value: `${n(r.VCE, 3)} V` }],
        state: { type: npn ? 'NPN' : 'PNP', configuration: 'common emitter', baseCurrent: si(r.IB, 'A'), collectorCurrent: si(r.IC, 'A'), emitterCurrent: si(r.IE, 'A'), VCE: `${n(r.VCE, 3)} V`, region: r.region },
        explain: { what: `${si(r.IB, 'A')} into the base controls ${si(r.IC, 'A')} in the collector — the transistor is in ${r.region}.`, why: npn ? 'In an NPN transistor the forward-biased base–emitter junction injects electrons into the thin, lightly doped base; most of them are swept into the collector by the reverse-biased collector junction, so a small base current controls a large collector current (I_C = βI_B).' : 'In a PNP transistor holes are injected from the emitter; all polarities and current directions are reversed but I_C = βI_B still holds.', param: 'Base drive (V_BB, R_B), collector circuit (V_CC, R_C) and β.', effect: 'More base current → more collector current until V_CE falls to ≈ 0.2 V (saturation); with V_BB below 0.7 V the transistor is cut off.' },
      };
    },
    steps: (p, c) => [
      { title: 'Terminals', text: 'Emitter (heavily doped), base (thin, lightly doped), collector (large).' },
      { title: 'Base current', text: `The base–emitter junction is forward biased: I_B = ${si(c.r.IB, 'A')}.` },
      { title: 'Collector current', text: `I_C = β I_B = ${si(c.r.IC, 'A')} (${c.r.region}).` },
      { title: 'Emitter current', text: `I_E = I_B + I_C = ${si(c.r.IE, 'A')}.` },
    ],
    draw(g, S) {
      const { p, c, step, t } = S; bg(g);
      const r = c.r; const npn = c.npn; const s = npn ? 1 : -1;
      const tx = 420, ty = 290; const T = K.bjt(g, tx, ty, { type: npn ? 'npn' : 'pnp' });
      // base loop
      K.wire(g, [[T.b[0], T.b[1]], [300, ty]]); K.resistor(g, [300, ty], [180, ty], { label: 'R_B', value: `${p.RB} kΩ` }); K.wire(g, [[180, ty], [120, ty], [120, 340]]); K.cell(g, npn ? [120, 420] : [120, 340], npn ? [120, 340] : [120, 420], { label: 'V_BB', value: `${p.VBB} V`, labelOffset: 44 }); K.wire(g, [[120, 420], [120, 480], [T.e[0], 480], [T.e[0], T.e[1]]]);
      // collector loop
      K.wire(g, [[T.c[0], T.c[1]], [T.c[0], 170]]); K.resistor(g, [T.c[0], 170], [T.c[0], 80], { label: 'R_C', value: `${p.RC} kΩ`, labelSide: 'other' }); K.wire(g, [[T.c[0], 80], [620, 80], [620, 250]]); K.cell(g, npn ? [620, 330] : [620, 250], npn ? [620, 250] : [620, 330], { label: 'V_CC', value: `${p.VCC} V`, labelOffset: 44, labelSide: 'other' }); K.wire(g, [[620, 330], [620, 480], [T.e[0], 480]]);
      K.ground(g, 360, 480);
      // current flows (conventional: NPN into base & collector, out of emitter)
      if (step >= 1) K.flow(g, [[120, 340], [120, ty], [T.b[0], ty]], t, s * r.IB * 1000, { ref: 0.02, color: C.violet });
      if (step >= 2) K.flow(g, [[620, 250], [620, 80], [T.c[0], 80], [T.c[0], T.c[1] + 30]], t, s * r.IC, { ref: 0.003, color: C.red });
      if (step >= 3) K.flow(g, [[T.e[0], T.e[1]], [T.e[0], 480], [620, 480], [620, 330]], t, s * r.IE, { ref: 0.003, color: C.blue });
      D.tag(g, `I_B ${si(r.IB, 'A')}`, 200, ty + 30, { bg: C.violet, size: 12 }); D.tag(g, `I_C ${si(r.IC, 'A')}`, T.c[0] + 12, 200, { bg: C.red, size: 12 }); D.tag(g, `I_E ${si(r.IE, 'A')}`, T.e[0] + 12, 440, { bg: C.blue, size: 12 });
      // internal view
      const ix = 700, iy = 110; const lay = npn ? [['N', '#dbeafe', 'Emitter'], ['P', '#fee2e2', 'Base'], ['N', '#dbeafe', 'Collector']] : [['P', '#fee2e2', 'Emitter'], ['N', '#dbeafe', 'Base'], ['P', '#fee2e2', 'Collector']];
      const widths = [90, 30, 130]; let x0 = ix;
      lay.forEach(([l, col, name], i) => { D.rect(g, x0, iy, widths[i], 90, { fill: col, stroke: C.ink, width: 1.5 }); D.text(g, l, x0 + widths[i] / 2, iy + 45, { size: 20, weight: 900, align: 'center' }); D.text(g, name, x0 + widths[i] / 2, iy + 106, { size: 12, weight: 800, align: 'center', color: C.muted }); x0 += widths[i]; });
      if (r.IB > 0) for (let k = 0; k < 10; k++) { const u = ((t * 0.6 + k / 10) % 1); const x = ix + u * 250; const yy = iy + 20 + (k % 5) * 12; const lost = k === 0 && x > ix + 90 && x < ix + 120; D.circle(g, x, lost ? yy + (x - ix - 90) : yy, 4.5, { fill: npn ? C.blue : '#fff', stroke: npn ? undefined : C.red, width: 2 }); }
      D.text(g, npn ? 'electrons: emitter → base → collector' : 'holes: emitter → base → collector', ix + 125, iy - 14, { size: 12, weight: 700, align: 'center', color: C.muted });
      K.infoBox(g, 700, 260, [{ t: `${npn ? 'NPN' : 'PNP'} — ${r.region.toUpperCase()}`, b: true, c: r.region === 'active' ? C.green : C.red }, `I_C = β I_B = ${p.beta} × ${si(r.IB, 'A')}`, `I_E = I_B + I_C = ${si(r.IE, 'A')}`, `V_CE = ${n(r.VCE, 3)} V`], { w: 280 });
      focusIf(g, step === 0, tx - 60, ty - 70, 120, 140, t);
    },
    challenge: {
      make(rand) { const target = pick(rand, [2, 3, 4, 5]); return { kind: 'bjt-ic-ma', prompt: `Bias the transistor (β = 100) so that the collector current is ${target} mA in the active region.`, target, unit: 'mA', tolerance: 0.1, hint: 'I_C = β(V_BB − 0.7)/R_B — keep I_C below V_CC/R_C to stay active.', setup: { mode: 'npn', VBB: 1, RB: 200, VCC: 12, RC: 2, beta: 100 } }; },
      evaluate(p) { const v = KINDS['bjt-ic-ma'](p); return { value: v, text: `I_C = ${n(v, 4)} mA`, calculation: `I_B = (${p.VBB} − 0.7)/${p.RB} kΩ; I_C = min(${p.beta}·I_B, ${p.VCC}/${p.RC} kΩ) = ${n(v, 4)} mA` }; },
    },
  };

  // ───────────────────────── 27. BJT characteristics ─────────────────────────
  S['ee-bjt-characteristics'] = {
    modes: [{ key: 'ce', label: 'Common emitter (CE)' }, { key: 'cb', label: 'Common base (CB)' }],
    params: [
      { key: 'VCC', label: 'Supply V_CC', type: 'range', min: 5, max: 20, step: 0.5, default: 12, unit: 'V' },
      { key: 'RC', label: 'Load R_C', type: 'range', min: 0.5, max: 10, step: 0.1, default: 2, unit: 'kΩ' },
      { key: 'IB', label: 'Base current I_B (CE)', type: 'range', min: 0, max: 60, step: 1, default: 30, unit: 'µA', showIf: (p) => p.mode !== 'cb' },
      { key: 'IE', label: 'Emitter current I_E (CB)', type: 'range', min: 0, max: 6, step: 0.1, default: 3, unit: 'mA', showIf: (p) => p.mode === 'cb' },
      { key: 'beta', label: 'β', type: 'range', min: 50, max: 250, step: 5, default: 100 },
    ],
    compute(p) {
      const ce = p.mode !== 'cb'; const alpha = p.beta / (p.beta + 1);
      const IC = ce ? Math.min(p.beta * p.IB * 1e-6, p.VCC / (p.RC * 1000)) : Math.min(alpha * p.IE * 1e-3, p.VCC / (p.RC * 1000)); const VCE = p.VCC - IC * p.RC * 1000;
      return {
        IC, VCE, alpha, ce,
        formulas: [F('Load line', 'V_CE = V_CC − I_C R_C', `V_CC = ${p.VCC} V, R_C = ${p.RC} kΩ`, `end points: (V_CC, 0) and (0, V_CC/R_C = ${n(p.VCC / p.RC, 3)} mA)`, 'straight line', '—'), F('Q-point', ce ? 'I_C = β I_B' : 'I_C = α I_E,  α = β/(β+1)', ce ? `I_B = ${p.IB} µA, β = ${p.beta}` : `I_E = ${p.IE} mA, α = ${n(alpha, 4)}`, ce ? `${p.beta} × ${p.IB} µA` : `${n(alpha, 4)} × ${p.IE} mA`, `I_C = ${n(IC * 1000, 4)} mA, V_${ce ? 'CE' : 'CB'} = ${n(VCE, 4)} V`, 'mA')],
        readouts: [{ label: 'I_C', value: `${n(IC * 1000, 4)} mA`, tone: 'good' }, { label: ce ? 'V_CE' : 'V_CB', value: `${n(VCE, 4)} V` }, { label: 'α', value: n(alpha, 4) }],
        state: { configuration: ce ? 'CE' : 'CB', qPoint: { IC: `${n(IC * 1000, 4)} mA`, V: `${n(VCE, 4)} V` }, input: ce ? `I_B = ${p.IB} µA` : `I_E = ${p.IE} mA`, loadLine: `V_CC = ${p.VCC} V, R_C = ${p.RC} kΩ` },
        explain: { what: `The Q-point is where the load line crosses the curve for ${ce ? `I_B = ${p.IB} µA` : `I_E = ${p.IE} mA`}: I_C = ${n(IC * 1000, 3)} mA, V = ${n(VCE, 3)} V.`, why: ce ? 'CE input characteristic looks like a diode (I_B vs V_BE). In the active region I_C = βI_B, almost independent of V_CE (the curves are nearly flat).' : 'CB input characteristic is I_E vs V_EB; I_C ≈ αI_E, so the output curves are flat and very close to I_E.', param: 'Configuration, supply, load resistor and input current.', effect: 'Raising the input current moves the Q-point up the load line toward saturation; lowering it moves toward cut-off.' },
      };
    },
    steps: (p) => [
      { title: 'Input characteristic', text: p.mode !== 'cb' ? 'I_B vs V_BE (V_CE constant): like a forward-biased diode.' : 'I_E vs V_EB (V_CB constant): like a forward-biased diode.' },
      { title: 'Output characteristic', text: p.mode !== 'cb' ? 'I_C vs V_CE for several I_B: cut-off, active and saturation regions.' : 'I_C vs V_CB for several I_E: I_C ≈ αI_E.' },
      { title: 'Load line and Q-point', text: 'The DC load line V = V_CC − I_C R_C intersects the curve for the chosen input current.' },
    ],
    draw(g, S) {
      const { p, c, step } = S; bg(g);
      const ce = c.ce;
      const inPts = (shift) => { const a = []; for (let v = 0; v <= 1; v += 0.01) a.push([v, Math.min(ce ? 100 : 8, 1e-14 * (Math.exp(Math.max(0, v - shift) / VT) - 1) * (ce ? 1e6 / p.beta : 1e3))]); return a; };
      D.chart(g, 80, 70, 330, 300, { xmin: 0, xmax: 1, ymin: 0, ymax: ce ? 100 : 8, xlabel: ce ? 'V_BE (V)' : 'V_EB (V)', ylabel: ce ? 'I_B (µA)' : 'I_E (mA)', title: 'Input characteristic', series: [{ points: inPts(0), color: C.violet, width: step === 0 ? 4 : 2.5 }, { points: inPts(0.05), color: '#a78bfa', width: 2, dash: [6, 5] }] });
      D.text(g, ce ? 'solid V_CE = 1 V, dashed V_CE = 10 V' : 'solid V_CB = 0, dashed V_CB = 10 V', 245, 450, { size: 12, weight: 700, align: 'center', color: C.muted });
      const fam = ce ? [10, 20, 30, 40, 50, 60] : [1, 2, 3, 4, 5, 6]; const curves = fam.map((x) => { const Ic = ce ? p.beta * x * 1e-3 : c.alpha * x; const pts = []; for (let v = 0; v <= 20; v += 0.1) { const knee = ce ? 1 - Math.exp(-v / 0.25) : 1; pts.push([v, Ic * knee * (1 + (ce ? v / 100 : 0))]); } return { points: pts, color: '#94a3b8', width: 1.8 }; });
      const cur = ce ? p.IB : p.IE; const IcQ = c.IC * 1000;
      const out = []; for (let v = 0; v <= 20; v += 0.1) out.push([v, (ce ? p.beta * cur * 1e-3 * (1 - Math.exp(-v / 0.25)) * (1 + v / 100) : c.alpha * cur)]);
      const ymax = Math.max(8, p.VCC / p.RC * 1.1, (ce ? p.beta * 0.06 : 6.5));
      D.chart(g, 520, 70, 420, 300, { xmin: 0, xmax: 20, ymin: 0, ymax, xlabel: ce ? 'V_CE (V)' : 'V_CB (V)', ylabel: 'I_C (mA)', title: 'Output characteristics + load line', series: [...curves, { points: out, color: C.blue, width: step >= 1 ? 3.5 : 2.5 }, ...(step >= 2 ? [{ points: [[0, p.VCC / p.RC], [p.VCC, 0]], color: C.red, width: 3 }] : [])], marks: step >= 2 ? [{ point: [c.VCE, IcQ], label: `Q (${n(c.VCE, 3)} V, ${n(IcQ, 3)} mA)`, color: C.orange }] : [] });
      fam.forEach((x) => D.text(g, `${x}${ce ? ' µA' : ' mA'}`, 944, 70 + 300 - ((ce ? p.beta * x * 1e-3 * 1.2 : c.alpha * x) / ymax) * 300, { size: 11, weight: 700, color: C.muted }));
      K.infoBox(g, 520, 460, [{ t: `${ce ? 'CE' : 'CB'} configuration — Q-point`, b: true, c: C.green }, `I_C = ${n(IcQ, 4)} mA, V = ${n(c.VCE, 4)} V`], { w: 420 });
    },
    challenge: {
      make(rand) { const target = pick(rand, [4, 5, 6, 7, 8]); return { kind: 'bjt-vce', prompt: `In CE, choose I_B so that the Q-point sits at V_CE = ${target} V (V_CC = 12 V, R_C = 2 kΩ, β = 100).`, target, unit: 'V', tolerance: 0.2, hint: 'V_CE = V_CC − βI_B R_C', setup: { mode: 'ce', VCC: 12, RC: 2, beta: 100, IB: 10 } }; },
      evaluate(p) { const v = KINDS['bjt-vce'](p); return { value: v, text: p.mode === 'cb' ? 'The task is for the CE configuration' : `V_CE = ${n(v, 4)} V`, calculation: `I_C = ${p.beta} × ${p.IB} µA; V_CE = ${p.VCC} − I_C × ${p.RC} kΩ = ${n(v, 4)} V` }; },
    },
  };

  // ───────────────────────── 28. FET ─────────────────────────
  S['ee-fet'] = {
    live: true,
    params: [
      { key: 'VGS', label: 'Gate–source voltage V_GS', type: 'range', min: -6, max: 0, step: 0.1, default: -1, unit: 'V' },
      { key: 'VDS', label: 'Drain–source voltage V_DS', type: 'range', min: 0, max: 15, step: 0.1, default: 8, unit: 'V' },
      { key: 'IDSS', label: 'I_DSS', type: 'range', min: 2, max: 20, step: 0.5, default: 10, unit: 'mA' },
      { key: 'VP', label: 'Pinch-off voltage V_P', type: 'range', min: -6, max: -1, step: 0.1, default: -4, unit: 'V' },
    ],
    compute(p) {
      const cut = p.VGS <= p.VP; const k = 1 - p.VGS / p.VP; const Vsat = p.VGS - p.VP;
      const ohmic = !cut && p.VDS < Vsat; const ID = cut ? 0 : ohmic ? p.IDSS * (2 * k * (p.VDS / -p.VP) - (p.VDS / p.VP) ** 2) : p.IDSS * k * k;
      const region = cut ? 'cut-off (channel pinched off by the gate)' : ohmic ? 'ohmic (voltage-controlled resistor)' : 'saturation (constant current)';
      return {
        ID, region, Vsat, cut, k,
        formulas: [F('Shockley’s equation (saturation)', 'I_D = I_DSS (1 − V_GS / V_P)²', `I_DSS = ${p.IDSS} mA, V_GS = ${p.VGS} V, V_P = ${p.VP} V`, `${p.IDSS} × (1 − ${p.VGS}/${p.VP})²`, `${n(p.IDSS * k * k * (cut ? 0 : 1), 4)} mA`, 'mA'), F('Region', 'saturation when V_DS ≥ V_GS − V_P', `V_DS = ${p.VDS} V, V_GS − V_P = ${n(Vsat, 3)} V`, '', region, '—')],
        readouts: [{ label: 'I_D', value: `${n(ID, 4)} mA`, tone: 'good' }, { label: 'Region', value: region.split(' (')[0] }, { label: 'V_DS(sat)', value: `${n(Math.max(0, Vsat), 3)} V` }],
        state: { device: 'n-channel JFET', VGS: `${p.VGS} V`, VDS: `${p.VDS} V`, drainCurrent: `${n(ID, 4)} mA`, region, channel: cut ? 'fully pinched off' : `about ${n(Math.max(0.05, k) * 100, 2)}% open` },
        explain: { what: `With V_GS = ${p.VGS} V the channel is ${cut ? 'closed' : `partly narrowed`}; I_D = ${n(ID, 3)} mA (${region}).`, why: 'The gate–channel junction is reverse biased. A more negative V_GS widens its depletion regions into the channel, leaving a narrower path for electrons — the gate controls the current with a voltage and draws almost no current (very high input resistance).', param: 'V_GS, V_DS, I_DSS and V_P.', effect: 'I_D is largest (I_DSS) at V_GS = 0 and falls to zero at V_GS = V_P; above V_DS(sat) the current hardly changes with V_DS.' },
      };
    },
    steps: (p, c) => [
      { title: 'Structure', text: 'An n-type channel between source and drain with p-type gate regions on both sides.' },
      { title: 'Gate voltage', text: `V_GS = ${p.VGS} V reverse-biases the gate junction; the depletion regions grow into the channel.` },
      { title: 'Channel narrows', text: c.cut ? 'At V_GS ≤ V_P the channel is pinched off — no current.' : 'Fewer electrons can pass from source to drain.' },
      { title: 'Drain current', text: `I_D = ${n(c.ID, 4)} mA (${c.region}).` },
    ],
    draw(g, S) {
      const { p, c, step, t } = S; bg(g);
      const x = 120, y = 150, w = 440, h = 170; const frac = Math.max(0, Math.min(1, p.VGS / p.VP)); // 0 open → 1 pinched
      D.rect(g, x, y, w, h, { fill: '#dbeafe', stroke: C.ink, width: 2.5, r: 6 });
      // depletion regions (tapered toward the drain by V_DS)
      const dep = (sx, top) => { const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; const extra = Math.min(0.5, (p.VDS / 30) * u); const d = Math.min(0.5, (0.12 + 0.38 * Math.sqrt(Math.min(1, frac + extra))) * (step >= 1 ? 1 : 0.3)); pts.push([sx + u * w, top ? y + d * h : y + h - d * h]); } const edge = top ? y : y + h; D.poly(g, [[sx, edge], ...pts, [sx + w, edge]], { fill: '#e5e7eb', stroke: '#9ca3af', close: true }); };
      dep(x, true); dep(x, false);
      D.rect(g, x + 120, y - 30, 200, 30, { fill: '#fecaca', stroke: C.red, r: 4 }); D.rect(g, x + 120, y + h, 200, 30, { fill: '#fecaca', stroke: C.red, r: 4 }); D.text(g, 'P gate', x + 220, y - 15, { size: 13, weight: 800, align: 'center', color: C.red }); D.text(g, 'P gate', x + 220, y + h + 15, { size: 13, weight: 800, align: 'center', color: C.red });
      D.text(g, 'SOURCE', x - 10, y + h / 2, { size: 14, weight: 900, align: 'right' }); D.text(g, 'DRAIN', x + w + 10, y + h / 2, { size: 14, weight: 900 }); D.text(g, 'n-channel', x + w / 2, y + h / 2 - 50, { size: 13, weight: 800, align: 'center', color: C.blue });
      if (!c.cut && step >= 3) for (let k = 0; k < 24; k++) { const u = (t * (0.1 + c.ID / 40) + k / 24) % 1; const yy = y + h / 2 + Math.sin(k * 7) * h * 0.18 * (1 - frac * 0.8); D.circle(g, x + u * w, yy, 4.5, { fill: C.blue }); }
      D.tag(g, `V_GS = ${p.VGS} V`, x + 220, y - 58, { bg: C.red, size: 13, align: 'center' }); D.tag(g, `I_D = ${n(c.ID, 3)} mA`, x + w / 2, y + h + 58, { bg: C.blue, size: 14, align: 'center' });
      K.fet(g, 200, 450, {});
      // transfer & output characteristics
      const tr = []; for (let v = p.VP; v <= 0.0001; v += 0.05) tr.push([v, p.IDSS * (1 - v / p.VP) ** 2]);
      D.chart(g, 660, 70, 300, 180, { xmin: -6, xmax: 0, ymin: 0, ymax: 20, xlabel: 'V_GS (V)', ylabel: 'I_D (mA)', title: 'Transfer characteristic', xticks: 6, yticks: 4, series: [{ points: tr, color: C.violet, width: 3 }], marks: [{ point: [p.VGS, c.cut ? 0 : p.IDSS * c.k * c.k], color: C.orange }, { x: p.VP, color: C.red, label: 'V_P' }] });
      const fam = [0, -1, -2, -3].filter((v) => v > p.VP).map((vg) => { const kk = 1 - vg / p.VP; const vs = vg - p.VP; const pts = []; for (let v = 0; v <= 15; v += 0.1) pts.push([v, v < vs ? p.IDSS * (2 * kk * (v / -p.VP) - (v / p.VP) ** 2) : p.IDSS * kk * kk]); return { points: pts, color: vg === Math.round(p.VGS) ? C.blue : '#94a3b8', width: 2 }; });
      const cur = []; if (!c.cut) { for (let v = 0; v <= 15; v += 0.1) cur.push([v, v < c.Vsat ? p.IDSS * (2 * c.k * (v / -p.VP) - (v / p.VP) ** 2) : p.IDSS * c.k * c.k]); }
      D.chart(g, 660, 320, 300, 180, { xmin: 0, xmax: 15, ymin: 0, ymax: 20, xlabel: 'V_DS (V)', ylabel: 'I_D (mA)', title: 'Output characteristics', xticks: 5, yticks: 4, series: [...fam, { points: cur, color: C.blue, width: 3 }], marks: [{ point: [p.VDS, c.ID], color: C.orange }] });
      focusIf(g, step === 2, x + 100, y - 10, 240, h + 20, t);
    },
    challenge: {
      make(rand) { const target = pick(rand, [2.5, 4, 5, 6.4]); return { kind: 'fet-id-ma', prompt: `Set V_GS so that the drain current is ${target} mA (I_DSS = 10 mA, V_P = −4 V, keep V_DS in saturation).`, target, unit: 'mA', tolerance: 0.15, hint: 'I_D = I_DSS(1 − V_GS/V_P)² → V_GS = V_P(1 − √(I_D/I_DSS))', setup: { IDSS: 10, VP: -4, VGS: 0, VDS: 10 } }; },
      evaluate(p) { const v = KINDS['fet-id-ma'](p); return { value: v, text: Number.isFinite(v) ? `I_D = ${n(v, 4)} mA` : 'V_DS is in the ohmic region — raise V_DS into saturation', calculation: `I_D = ${p.IDSS} × (1 − ${p.VGS}/${p.VP})² = ${n(v, 4)} mA` }; },
    },
  };
})();
