'use strict';

/* U21EEG01 — Unit III: Transformer and AC Motor (7 simulations). Ideal-transformer and simple equivalent-circuit models. */
(function () {
  const S = (window.EESims = window.EESims || {});
  const D = window.EPDraw; const K = window.EEKit; const KINDS = window.EEChallengeKinds; const C = D.C;
  const { si, n } = K;
  const F = (name, formula, given, calc, result, unit) => ({ name, formula, given, calc, result, unit: unit || '—' });
  const pick = (rand, arr) => arr[Math.floor(rand() * arr.length) % arr.length];
  const focusIf = (g, on, x, y, w, h, t) => { if (on) D.focus(g, x, y, w, h, t); };
  const bg = (g) => D.clear(g, '#f8fafc');
  const VIS = 0.35; // visual AC cycles per second (animation is slowed down so the eye can follow it)

  /** Iron core with a primary coil on the left limb and a secondary coil on the right limb. */
  function transformer(g, x, y, w, h, o) {
    const th = 34; const t = o.t || 0; const ph = Math.sin(2 * Math.PI * VIS * t);
    D.rect(g, x, y, w, h, { fill: o.hiCore ? '#fde68a' : '#94a3b8', r: 6 }); D.rect(g, x + th, y + th, w - 2 * th, h - 2 * th, { fill: '#f8fafc', r: 4 });
    for (let k = 1; k < 8; k++) D.line(g, x + (k * w) / 8, y, x + (k * w) / 8, y + th, { color: 'rgba(255,255,255,0.35)', width: 1 }); // laminations
    // flux arrows circulating in the core
    if (o.flux) {
      const path = [[x + th / 2, y + h - th / 2], [x + th / 2, y + th / 2], [x + w - th / 2, y + th / 2], [x + w - th / 2, y + h - th / 2], [x + th / 2, y + h - th / 2]];
      const amp = Math.abs(ph); if (amp > 0.08) K.flow(g, path, t, ph * 2, { ref: 1, color: '#dc2626', r: 3 + amp * 3, gap: 44, speed: 120 });
      D.tag(g, `Φ ${ph >= 0 ? '↻' : '↺'} ${n(Math.abs(ph) * 100, 2)}%`, x + w / 2, y - 18, { bg: '#dc2626', size: 12, align: 'center' });
    }
    const coilOn = (cx, top, bot, turns, col, hi) => { const pitch = (bot - top) / turns; for (let k = 0; k < turns; k++) { const yy = top + pitch * (k + 0.5); D.rect(g, cx - th / 2 - 8, yy - Math.min(5, pitch * 0.35), th + 16, Math.min(10, pitch * 0.7), { fill: hi ? '#fbbf24' : col, r: 4, stroke: '#7c2d12', width: 1 }); } };
    coilOn(x + th / 2, y + th + 10, y + h - th - 10, o.t1, '#b45309', o.hiP); coilOn(x + w - th / 2, y + th + 10, y + h - th - 10, o.t2, '#2563eb', o.hiS);
    return { pTop: [x - 10, y + th + 14], pBot: [x - 10, y + h - th - 14], sTop: [x + w + 10, y + th + 14], sBot: [x + w + 10, y + h - th - 14], phase: ph };
  }
  const turnsFor = (N) => Math.max(2, Math.min(22, Math.round(N / 25)));

  // ───────────────────────── 16. Single-phase transformer ─────────────────────────
  S['ee-transformer'] = {
    live: true,
    params: [
      { key: 'V1', label: 'Primary voltage V₁ (rms)', type: 'range', min: 10, max: 440, step: 5, default: 230, unit: 'V' },
      { key: 'f', label: 'Supply frequency f', type: 'select', default: 50, options: [{ value: 50, label: '50 Hz' }, { value: 60, label: '60 Hz' }] },
      { key: 'N1', label: 'Primary turns N₁', type: 'range', min: 50, max: 1000, step: 10, default: 500 },
      { key: 'N2', label: 'Secondary turns N₂', type: 'range', min: 10, max: 1000, step: 10, default: 100 },
      { key: 'load', label: 'Load connected', type: 'toggle', default: true },
      { key: 'RL', label: 'Load resistance R_L', type: 'range', min: 5, max: 500, step: 5, default: 50, unit: 'Ω', showIf: (p) => p.load },
    ],
    stepDuration: 3.5,
    examples: [{ label: 'Mains adapter 230 → 12 V', values: { V1: 230, N1: 920, N2: 48 } }, { label: 'Step-up 1 : 2', values: { V1: 110, N1: 200, N2: 400 } }],
    compute(p) {
      const f = Number(p.f); const V2 = KINDS['transformer-v2'](p); const I2 = p.load ? V2 / p.RL : 0; const I1 = (V2 * I2) / p.V1; const phim = p.V1 / (4.44 * f * p.N1);
      return {
        f, V2, I2, I1, phim,
        formulas: [F('EMF equation', 'E₁ = 4.44 f N₁ Φm  →  Φm = V₁ / (4.44 f N₁)', `V₁ = ${p.V1} V, f = ${f} Hz, N₁ = ${p.N1}`, `${p.V1} / (4.44 × ${f} × ${p.N1})`, `${n(phim * 1000, 4)} mWb`, 'Wb'), F('Secondary voltage', 'V₂ = V₁ × N₂ / N₁', `N₂ = ${p.N2}`, `${p.V1} × ${p.N2} / ${p.N1}`, si(V2, 'V'), 'V'), F('Currents (ideal)', 'I₂ = V₂/R_L,  V₁I₁ = V₂I₂', p.load ? `R_L = ${p.RL} Ω` : 'no load', p.load ? `I₂ = ${n(V2)}/${p.RL}; I₁ = ${n(V2)}×${n(I2)}/${p.V1}` : 'I₂ = 0', p.load ? `I₂ = ${si(I2, 'A')}, I₁ = ${si(I1, 'A')}` : 'I₁ ≈ small magnetising current', 'A')],
        readouts: [{ label: 'V₂', value: si(V2, 'V'), tone: 'good' }, { label: 'Turns ratio', value: `${p.N1} : ${p.N2}` }, { label: 'Φm', value: `${n(phim * 1000, 3)} mWb` }, { label: 'I₂', value: si(I2, 'A') }, { label: 'I₁', value: si(I1, 'A') }],
        state: { primary: `${p.V1} V, ${f} Hz, ${p.N1} turns`, secondary: `${p.N2} turns → ${si(V2, 'V')}`, peakFlux: `${n(phim * 1000, 4)} mWb`, load: p.load ? `${p.RL} Ω, I₂ = ${si(I2, 'A')}` : 'open circuit', type: V2 > p.V1 ? 'step-up' : V2 < p.V1 ? 'step-down' : 'isolation (1 : 1)', waveform: 'v₁ sinusoidal; flux lags v₁ by 90°; v₂ in phase with v₁ (ideal)' },
        explain: { what: `An alternating ${p.V1} V drives an alternating flux of ${n(phim * 1000, 3)} mWb peak in the core; it induces ${si(V2, 'V')} in the ${p.N2}-turn secondary.`, why: 'By Faraday’s law a changing flux induces an EMF e = −N dΦ/dt in every turn it links. The same core flux links both windings, so the voltage per turn is the same on both sides: V₁/N₁ = V₂/N₂.', param: 'Primary voltage, frequency, turns and load.', effect: 'DC would give no changing flux, so no secondary voltage. More secondary turns → more output voltage; drawing more load current makes the primary draw more current too.' },
      };
    },
    steps: (p, c) => [
      { title: 'AC source applied', text: `${p.V1} V, ${c.f} Hz is applied to the ${p.N1}-turn primary winding.` },
      { title: 'Alternating flux in the core', text: `The primary current sets up flux Φ = Φm sin ωt in the laminated core; Φm = ${n(c.phim * 1000, 3)} mWb.` },
      { title: 'Electromagnetic induction', text: 'The changing flux links the secondary winding and induces e₂ = −N₂ dΦ/dt (Faraday).' },
      { title: 'Secondary voltage', text: `V₂ = V₁ N₂/N₁ = ${n(c.V2)} V.` },
      { title: 'Load current', text: p.load ? `The load draws I₂ = ${si(c.I2, 'A')}; the primary current rises to I₁ = ${si(c.I1, 'A')} (power in = power out).` : 'With no load the primary only draws a small magnetising current.' },
    ],
    draw(g, S) {
      const { p, c, step, t } = S; bg(g);
      const tf = transformer(g, 330, 90, 300, 260, { t, flux: step >= 1, t1: turnsFor(p.N1), t2: turnsFor(p.N2), hiCore: step === 1, hiP: step === 0, hiS: step === 2 || step === 3 });
      const ph = tf.phase;
      K.wire(g, [[150, tf.pTop[1]], [tf.pTop[0], tf.pTop[1]]]); K.wire(g, [[150, tf.pBot[1]], [tf.pBot[0], tf.pBot[1]]]); K.ac(g, [150, tf.pBot[1]], [150, tf.pTop[1]], { label: 'V₁', value: `${p.V1} V ~`, labelOffset: 48, phase: t * 2 * Math.PI * VIS });
      K.wire(g, [[tf.sTop[0], tf.sTop[1]], [820, tf.sTop[1]], [820, 180]]); K.wire(g, [[tf.sBot[0], tf.sBot[1]], [820, tf.sBot[1]], [820, 260]]);
      if (p.load) K.lamp(g, [820, 180], [820, 260], { label: 'Load', value: si(c.I2, 'A'), glow: Math.min(0.9, c.I2 * c.V2 / 60) * Math.abs(ph), labelSide: 'other' }); else { D.circle(g, 820, 180, 5, { fill: C.ink }); D.circle(g, 820, 260, 5, { fill: C.ink }); D.text(g, 'open', 840, 220, { size: 13, weight: 700, color: C.muted }); }
      if (step >= 0) K.flow(g, [[150, tf.pTop[1]], [tf.pTop[0], tf.pTop[1]]], t, ph * Math.max(0.2, c.I1), { ref: 1 });
      if (p.load && step >= 3) K.flow(g, [[tf.sTop[0], tf.sTop[1]], [820, tf.sTop[1]], [820, 180]], t, ph * c.I2, { ref: 1, color: C.blue });
      D.text(g, `N₁ = ${p.N1}`, 350, 380, { size: 15, weight: 800, color: '#b45309' }); D.text(g, `N₂ = ${p.N2}`, 610, 380, { size: 15, weight: 800, color: '#2563eb', align: 'right' });
      D.text(g, 'Primary', 350, 400, { size: 13, weight: 700, color: C.muted }); D.text(g, 'Secondary', 610, 400, { size: 13, weight: 700, color: C.muted, align: 'right' });
      if (step >= 3) D.tag(g, `V₂ = ${n(c.V2)} V`, 820, 300, { bg: C.green, size: 14, align: 'center' });
      // waveforms (display time base)
      const T0 = t * VIS; const cyc = 2;
      K.scope(g, 90, 440, 860, 90, [{ fn: (u) => Math.sin(2 * Math.PI * u), color: '#b45309' }, { fn: (u) => (step >= 1 ? -Math.cos(2 * Math.PI * u) * 0.8 : NaN), color: '#dc2626', dash: [6, 4] }, { fn: (u) => (step >= 3 ? Math.sin(2 * Math.PI * u) * Math.min(1.5, c.V2 / p.V1) : NaN), color: '#2563eb' }], { t0: T0 - cyc, t1: T0, ymax: 1.6, xfmt: () => '', yfmt: false, title: 'v₁ (brown)   Φ (red, lags 90°)   v₂ (blue)' });
      focusIf(g, step === 2, 590, 110, 80, 220, t);
    },
    challenge: {
      make(rand) { const target = pick(rand, [12, 24, 48, 110, 460]); return { kind: 'transformer-v2', prompt: `The primary is connected to 230 V. Choose the turns so that the secondary gives ${target} V.`, target, unit: 'V', tolerance: Math.max(0.3, target * 0.01), hint: 'V₂ = V₁ × N₂/N₁ → N₂/N₁ = V₂/V₁.', setup: { V1: 230, N1: 500, N2: 500 } }; },
      evaluate(p) { const v = KINDS['transformer-v2'](p); return { value: v, text: `V₂ = ${n(v, 4)} V`, calculation: `V₂ = ${p.V1} × ${p.N2}/${p.N1} = ${n(v, 4)} V` }; },
    },
  };

  // ───────────────────────── 17. Turns ratio ─────────────────────────
  S['ee-turns-ratio'] = {
    live: true,
    params: [
      { key: 'N1', label: 'Primary turns N₁', type: 'range', min: 20, max: 1000, step: 10, default: 400 },
      { key: 'N2', label: 'Secondary turns N₂', type: 'range', min: 10, max: 1000, step: 10, default: 100 },
      { key: 'V1', label: 'Primary voltage V₁', type: 'range', min: 10, max: 440, step: 5, default: 240, unit: 'V' },
      { key: 'RL', label: 'Load resistance R_L', type: 'range', min: 2, max: 500, step: 1, default: 30, unit: 'Ω' },
    ],
    compute(p) {
      const a = p.N1 / p.N2; const V2 = KINDS['transformer-v2'](p); const I2 = V2 / p.RL; const I1 = KINDS['transformer-i1'](p);
      return {
        a, V2, I2, I1,
        formulas: [F('Turns ratio', 'a = N₁ / N₂ = V₁ / V₂ = I₂ / I₁', `N₁ = ${p.N1}, N₂ = ${p.N2}`, `${p.N1} / ${p.N2}`, n(a, 4), '—'), F('Secondary voltage', 'V₂ = V₁ / a', `V₁ = ${p.V1} V`, `${p.V1} / ${n(a, 4)}`, si(V2, 'V'), 'V'), F('Currents', 'I₂ = V₂/R_L,  I₁ = I₂ / a', `R_L = ${p.RL} Ω`, `I₂ = ${n(V2)}/${p.RL}; I₁ = ${n(I2)}/${n(a, 4)}`, `I₂ = ${si(I2, 'A')}, I₁ = ${si(I1, 'A')}`, 'A')],
        readouts: [{ label: 'a = N₁/N₂', value: n(a, 4), tone: 'good' }, { label: 'V₂', value: si(V2, 'V') }, { label: 'I₁', value: si(I1, 'A') }, { label: 'I₂', value: si(I2, 'A') }, { label: 'Volts / turn', value: n(p.V1 / p.N1, 4) }],
        state: { N1: p.N1, N2: p.N2, turnsRatio: n(a, 4), V1: `${p.V1} V`, V2: si(V2, 'V'), I1: si(I1, 'A'), I2: si(I2, 'A'), voltsPerTurn: n(p.V1 / p.N1, 4) },
        explain: { what: `With ${p.N1} : ${p.N2} turns, V₂ = ${n(V2)} V and the currents are in the inverse ratio (${si(I1, 'A')} : ${si(I2, 'A')}).`, why: 'Each turn on either winding has the same induced voltage (same core flux), so voltages scale with turns; power in equals power out in an ideal transformer, so currents scale inversely.', param: 'N₁, N₂, V₁ and the load.', effect: 'Doubling N₂ doubles V₂ and halves nothing on the primary side except that I₁ rises for the same load; the side with more turns has more voltage and less current.' },
      };
    },
    steps: (p, c) => [
      { title: 'Volts per turn', text: `Both windings share the same flux, so each turn has ${n(p.V1 / p.N1, 4)} V.` },
      { title: 'Voltage ratio', text: `V₁/V₂ = N₁/N₂ = ${n(c.a, 4)} → V₂ = ${n(c.V2)} V.` },
      { title: 'Current ratio', text: `I₂/I₁ = N₁/N₂ → I₂ = ${n(c.I2)} A, I₁ = ${n(c.I1)} A.` },
    ],
    draw(g, S) {
      const { p, c, step, t } = S; bg(g);
      transformer(g, 300, 90, 320, 260, { t, flux: true, t1: turnsFor(p.N1), t2: turnsFor(p.N2) });
      D.text(g, `N₁ = ${p.N1} turns`, 300, 380, { size: 16, weight: 800, color: '#b45309' }); D.text(g, `N₂ = ${p.N2} turns`, 620, 380, { size: 16, weight: 800, color: '#2563eb', align: 'right' });
      // voltage & current bars
      const bar = (x, v, vmax, col, lab) => { const h = Math.max(4, (v / vmax) * 220); D.rect(g, x, 350 - h, 50, h, { fill: col, r: 6 }); D.text(g, lab, x + 25, 370, { size: 13, weight: 800, align: 'center', color: col }); };
      const vmax = Math.max(p.V1, c.V2); bar(90, p.V1, vmax, '#b45309', `V₁ ${n(p.V1)}`); bar(160, c.I1, Math.max(c.I1, c.I2), '#f59e0b', `I₁ ${n(c.I1)}`);
      bar(690, c.V2, vmax, '#2563eb', `V₂ ${n(c.V2)}`); bar(760, c.I2, Math.max(c.I1, c.I2), '#60a5fa', `I₂ ${n(c.I2)}`);
      D.text(g, 'Voltage & current', 125, 110, { size: 14, weight: 800, align: 'center' }); D.text(g, 'Voltage & current', 760, 110, { size: 14, weight: 800, align: 'center' });
      K.infoBox(g, 280, 420, [{ t: `V₁ / V₂ = N₁ / N₂ = I₂ / I₁ = ${n(c.a, 4)}`, b: true, size: 17, c: C.green }, `${p.V1} / ${n(c.V2)} = ${p.N1} / ${p.N2} = ${n(c.I2)} / ${n(c.I1)}`], { w: 440 });
      focusIf(g, step === 1, 670, 120, 100, 260, t);
    },
    challenge: {
      make(rand) { const target = pick(rand, [0.5, 1, 1.5, 2]); return { kind: 'transformer-i1', prompt: `With a 240 V supply and a 30 Ω load, choose N₁ and N₂ so that the primary draws ${target} A.`, target, unit: 'A', tolerance: 0.03, hint: 'I₁ = V₂² / (R_L V₁) with V₂ = V₁ N₂/N₁.', setup: { V1: 240, RL: 30, N1: 400, N2: 50 } }; },
      evaluate(p) { const v = KINDS['transformer-i1'](p); return { value: v, text: `I₁ = ${n(v, 4)} A`, calculation: `V₂ = ${p.V1}×${p.N2}/${p.N1}; I₁ = V₂²/(R_L V₁) = ${n(v, 4)} A` }; },
    },
  };

  // ───────────────────────── 18. Step-up / step-down ─────────────────────────
  S['ee-step-up-down'] = {
    live: true,
    modes: [{ key: 'down', label: 'Step-down' }, { key: 'up', label: 'Step-up' }],
    params: [
      { key: 'V1', label: 'Input voltage V₁', type: 'range', min: 5, max: 440, step: 5, default: 230, unit: 'V' },
      { key: 'N1', label: 'Primary turns N₁', type: 'range', min: 50, max: 1000, step: 10, default: 400 },
      { key: 'k', label: 'Step factor (voltage multiplied / divided by)', type: 'range', min: 1, max: 20, step: 0.5, default: 4 },
    ],
    compute(p) {
      const V2 = KINDS['stepud-v2'](p); const N2 = p.mode === 'down' ? p.N1 / p.k : p.N1 * p.k;
      return {
        V2, N2,
        formulas: [F(p.mode === 'down' ? 'Step-down transformer' : 'Step-up transformer', 'V₂ = V₁ × N₂/N₁', `V₁ = ${p.V1} V, N₁ = ${p.N1}, N₂ = ${n(N2, 4)}`, `${p.V1} × ${n(N2, 4)} / ${p.N1}`, si(V2, 'V'), 'V')],
        readouts: [{ label: 'Type', value: p.mode === 'down' ? 'Step-down (N₂ < N₁)' : 'Step-up (N₂ > N₁)', tone: 'good' }, { label: 'N₂', value: n(N2, 4) }, { label: 'V₂', value: si(V2, 'V') }],
        state: { type: p.mode === 'down' ? 'step-down' : 'step-up', inputVoltage: `${p.V1} V`, primaryTurns: p.N1, secondaryTurns: n(N2, 4), outputVoltage: si(V2, 'V') },
        explain: { what: p.mode === 'down' ? `The secondary has ${p.k}× fewer turns, so the output is ${si(V2, 'V')}.` : `The secondary has ${p.k}× more turns, so the output is ${si(V2, 'V')}.`, why: 'The induced voltage is proportional to the number of turns linked by the common flux.', param: 'Mode, input voltage, primary turns and the step factor.', effect: p.mode === 'down' ? 'Used in chargers and adapters; the secondary current is higher than the primary current.' : 'Used at power stations to transmit at high voltage and low current (less I²R loss).' },
      };
    },
    steps: (p, c) => [
      { title: 'Choose the transformer type', text: p.mode === 'down' ? 'Step-down: fewer secondary turns.' : 'Step-up: more secondary turns.' },
      { title: 'Turns', text: `N₁ = ${p.N1}, N₂ = ${n(c.N2, 4)}.` },
      { title: 'Output voltage', text: `V₂ = ${p.V1} × ${n(c.N2, 4)}/${p.N1} = ${n(c.V2, 4)} V.` },
    ],
    draw(g, S) {
      const { p, c, t } = S; bg(g);
      transformer(g, 330, 70, 300, 250, { t, flux: true, t1: turnsFor(p.N1), t2: turnsFor(c.N2) });
      D.text(g, p.mode === 'down' ? 'STEP-DOWN' : 'STEP-UP', 120, 60, { size: 24, weight: 900, align: 'center', color: p.mode === 'down' ? C.blue : C.red });
      D.text(g, `Primary ${p.N1} turns`, 320, 345, { size: 15, weight: 800, color: '#b45309', align: 'right' }); D.text(g, `Secondary ${n(c.N2, 4)} turns`, 640, 345, { size: 15, weight: 800, color: '#2563eb' });
      const ph = 2 * Math.PI * VIS * t; const amp1 = 1, amp2 = Math.min(3, c.V2 / p.V1);
      K.scope(g, 60, 390, 400, 130, [{ fn: (u) => amp1 * Math.sin(2 * Math.PI * u), color: '#b45309', width: 3 }], { t0: ph / (2 * Math.PI) - 2, t1: ph / (2 * Math.PI), ymax: Math.max(1.2, amp2 * 1.1), xfmt: () => '', yfmt: false, title: `Input ${p.V1} V` });
      K.scope(g, 540, 390, 400, 130, [{ fn: (u) => amp2 * Math.sin(2 * Math.PI * u), color: '#2563eb', width: 3 }], { t0: ph / (2 * Math.PI) - 2, t1: ph / (2 * Math.PI), ymax: Math.max(1.2, amp2 * 1.1), xfmt: () => '', yfmt: false, title: `Output ${n(c.V2, 4)} V` });
      D.arrow(g, 470, 455, 530, 455, { color: C.ink, width: 4, head: 14 });
    },
    challenge: {
      make(rand) { const target = pick(rand, [11.5, 23, 46, 57.5]); return { kind: 'stepud-v2', prompt: `Convert the 230 V mains to ${target} V. Choose step-up or step-down and the step factor.`, target, unit: 'V', tolerance: 0.3, hint: 'Step factor = 230 / V₂ for a step-down transformer.', setup: { mode: 'up', V1: 230, k: 2 } }; },
      evaluate(p) { const v = KINDS['stepud-v2'](p); return { value: v, text: `V₂ = ${n(v, 4)} V`, calculation: `V₂ = ${p.V1} ${p.mode === 'down' ? '÷' : '×'} ${p.k} = ${n(v, 4)} V` }; },
    },
  };

  // ───────────────────────── 19. Induction motor construction ─────────────────────────
  const IM_PARTS = [
    { key: 'frame', name: 'Frame (yoke)', fn: 'Outer cast-iron body that supports and protects the stator core; it has cooling fins and the terminal box.', task: 'supports and protects the stator core' },
    { key: 'stator', name: 'Stator core', fn: 'Stationary ring of thin, insulated silicon-steel laminations with slots on the inside; laminations reduce eddy-current loss.', task: 'is the laminated stationary core with slots for the windings' },
    { key: 'winding', name: 'Stator winding (3-phase)', fn: 'Three windings (R, Y, B) placed 120° apart in the slots; fed from the 3-phase supply they produce the rotating magnetic field.', task: 'produces the rotating magnetic field from the 3-phase supply' },
    { key: 'airgap', name: 'Air gap', fn: 'Very small radial gap (0.4–4 mm) between stator and rotor; kept small to reduce the magnetising current.', task: 'is kept as small as possible to reduce magnetising current' },
    { key: 'rotor', name: 'Rotor (squirrel cage)', fn: 'Laminated cylinder with copper/aluminium bars short-circuited by end rings; currents induced in the bars produce the torque.', task: 'carries the short-circuited bars in which current is induced' },
    { key: 'shaft', name: 'Shaft', fn: 'Steel shaft carrying the rotor and delivering the mechanical output through the bearings.', task: 'delivers the mechanical output' },
  ];
  const IMC = { x: 330, y: 285, R: 235 };
  function imMachine(g, sel, ang, t) {
    const { x, y, R } = IMC; const hi = (k) => sel === k;
    D.circle(g, x, y, R, { fill: hi('frame') ? '#fde68a' : '#64748b' }); for (let k = 0; k < 24; k++) { const a = (k * Math.PI) / 12; D.line(g, x + Math.cos(a) * R, y + Math.sin(a) * R, x + Math.cos(a) * (R + 10), y + Math.sin(a) * (R + 10), { color: '#475569', width: 6 }); }
    D.circle(g, x, y, R - 28, { fill: hi('stator') ? '#fde68a' : '#cbd5e1' });
    const cols = ['#dc2626', '#eab308', '#2563eb'];
    for (let k = 0; k < 24; k++) { const a = (k * Math.PI) / 12; const ph = Math.floor(k / 4) % 3; D.circle(g, x + Math.cos(a) * (R - 70), y + Math.sin(a) * (R - 70), 11, { fill: hi('winding') ? '#fbbf24' : cols[ph], stroke: '#fff', width: 1.5 }); }
    D.circle(g, x, y, R - 92, { fill: hi('airgap') ? '#fef08a' : '#ffffff' });
    const rr = R - 100; D.circle(g, x, y, rr, { fill: hi('rotor') ? '#bfdbfe' : '#e2e8f0', stroke: '#475569', width: 2 });
    for (let k = 0; k < 18; k++) { const a = ang + (k * Math.PI) / 9; D.circle(g, x + Math.cos(a) * (rr - 14), y + Math.sin(a) * (rr - 14), 7, { fill: hi('rotor') ? '#2563eb' : '#a16207' }); }
    D.circle(g, x, y, 22, { fill: hi('shaft') ? '#facc15' : '#1f2937', stroke: '#fff', width: 2 });
    if (hi('airgap')) D.circle(g, x, y, R - 96, { stroke: '#f59e0b', width: 3 + 2 * Math.sin(t * 5) });
  }
  const imHit = (px, py) => { const d = Math.hypot(px - IMC.x, py - IMC.y); const R = IMC.R; if (d < 24) return 'shaft'; if (d < R - 100) return 'rotor'; if (d < R - 90) return 'airgap'; if (d > R - 84 && d < R - 56) return 'winding'; if (d < R - 28) return 'stator'; if (d < R + 12) return 'frame'; return null; };
  S['ee-im-construction'] = {
    live: true, conceptual: true,
    params: [{ key: 'part', label: 'Selected part', type: 'select', default: 'winding', options: IM_PARTS.map((q) => ({ value: q.key, label: q.name })) }, { key: 'rotate', label: 'Rotate the rotor', type: 'toggle', default: true }],
    onClick(x, y) { const k = imHit(x, y); return k ? { params: { part: k }, toast: IM_PARTS.find((q) => q.key === k).name } : null; },
    compute(p) { const part = IM_PARTS.find((q) => q.key === p.part) || IM_PARTS[0]; return { part, formulas: [], readouts: [{ label: 'Selected', value: part.name, tone: 'good' }], state: { view: 'Cross-section of a 3-phase squirrel-cage induction motor', selectedPart: part.name, function: part.fn }, explain: { what: `${part.name}: ${part.fn}`, why: 'The stator creates a rotating field; the rotor, separated by a small air gap, has induced currents that make it follow the field.', param: 'Tap a part or choose it from the list.', effect: 'The chosen part is highlighted with its function.' } }; },
    steps: () => IM_PARTS.map((q) => ({ title: q.name, text: q.fn })),
    draw(g, S) {
      const { p, c, step, t, playing } = S; bg(g); const sel = playing || S.st < S.dur ? IM_PARTS[step].key : p.part;
      imMachine(g, sel, p.rotate ? t * 0.8 : 0, t); const part = IM_PARTS.find((q) => q.key === sel) || c.part;
      D.rect(g, 620, 90, 360, 250, { fill: '#fff', stroke: C.line, r: 14 }); D.text(g, part.name, 640, 125, { size: 21, weight: 900, color: C.green }); window.EEWrapText(g, part.fn, 640, 165, 320, 16, 24);
      [['R', '#dc2626'], ['Y', '#eab308'], ['B', '#2563eb']].forEach(([l, col], i) => D.tag(g, `Phase ${l}`, 640 + i * 110, 380, { bg: col, size: 13 }));
      IM_PARTS.forEach((q, i) => D.tag(g, q.name.split(' (')[0], 640 + (i % 2) * 170, 430 + Math.floor(i / 2) * 32, { bg: q.key === sel ? C.green : '#64748b', size: 12 }));
    },
    challenge: window.EEIdentifyChallenge(IM_PARTS),
  };

  // ───────────────────────── 20. Induction motor working ─────────────────────────
  S['ee-im-working'] = {
    live: true,
    params: [
      { key: 'f', label: 'Supply frequency f', type: 'select', default: 50, options: [{ value: 50, label: '50 Hz' }, { value: 60, label: '60 Hz' }] },
      { key: 'P', label: 'Number of poles P', type: 'select', default: 4, options: [2, 4, 6, 8].map((v) => ({ value: v, label: `${v} poles` })) },
      { key: 's', label: 'Slip s', type: 'range', min: 0.5, max: 10, step: 0.5, default: 4, unit: '%' },
      { key: 'phasors', label: 'Show each phase field', type: 'toggle', default: true },
      { key: 'reverse', label: 'Swap two supply phases', type: 'toggle', default: false },
    ],
    stepDuration: 4,
    compute(p) {
      const f = Number(p.f), P = Number(p.P); const Ns = (120 * f) / P; const Nr = KINDS['im-rotor-speed'](Object.assign({}, p, { f, P })); const fr = (p.s / 100) * f;
      return {
        Ns, Nr, fr,
        formulas: [F('Synchronous speed', 'N_s = 120 f / P', `f = ${f} Hz, P = ${P}`, `120 × ${f} / ${P}`, `${n(Ns, 4)} rpm`, 'rpm'), F('Rotor speed', 'N_r = N_s (1 − s)', `s = ${p.s}%`, `${n(Ns, 4)} × (1 − ${p.s / 100})`, `${n(Nr, 4)} rpm`, 'rpm'), F('Rotor frequency', 'f_r = s f', '', `${p.s / 100} × ${f}`, `${n(fr, 3)} Hz`, 'Hz')],
        readouts: [{ label: 'N_s', value: `${n(Ns, 4)} rpm` }, { label: 'N_r', value: `${n(Nr, 4)} rpm`, tone: 'good' }, { label: 'Slip', value: `${p.s}%` }, { label: 'Direction', value: p.reverse ? 'reversed ↺' : 'forward ↻' }],
        state: { supply: `3-phase ${f} Hz`, poles: P, synchronousSpeed: `${n(Ns, 4)} rpm`, rotorSpeed: `${n(Nr, 4)} rpm`, slip: `${p.s}%`, rotorFrequency: `${n(fr, 3)} Hz`, rotatingField: 'constant magnitude 1.5 Φm rotating at N_s', direction: p.reverse ? 'reversed' : 'forward' },
        explain: { what: `Three phase currents 120° apart produce one field of constant strength rotating at ${n(Ns, 4)} rpm; the rotor follows at ${n(Nr, 4)} rpm.`, why: 'The rotating field cuts the rotor bars and induces currents in them (Faraday); those currents in the field produce a force that drags the rotor along (Lenz). The rotor can never reach N_s, because then no relative motion → no induced current → no torque.', param: 'Frequency, poles, slip and phase sequence.', effect: 'More poles → slower field; swapping any two phases reverses the field and the motor.' },
      };
    },
    steps: (p, c) => [
      { title: 'Three-phase stator excitation', text: 'Phases R, Y, B are fed with currents 120° apart in time into coils placed 120° apart in space.' },
      { title: 'Rotating magnetic field', text: `Their fields add to one field of constant magnitude (1.5 Φm) rotating at N_s = ${n(c.Ns, 4)} rpm.` },
      { title: 'Rotor interaction', text: 'The field cuts the short-circuited rotor bars and induces currents in them; current × field → force on the bars.' },
      { title: 'Rotor rotation', text: `The rotor turns in the direction of the field at N_r = ${n(c.Nr, 4)} rpm (slip ${p.s}%).` },
    ],
    draw(g, S) {
      const { p, c, step, t } = S; bg(g);
      const cx = 290, cy = 280, R = 210; const dir = p.reverse ? -1 : 1; const w = 2 * Math.PI * VIS; const th = w * t;
      D.circle(g, cx, cy, R, { fill: '#cbd5e1' }); D.circle(g, cx, cy, R - 40, { fill: '#f8fafc' });
      const cols = ['#dc2626', '#eab308', '#2563eb']; const names = ['R', 'Y', 'B'];
      const axes = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]; const phaseOrder = p.reverse ? [0, 2, 1] : [0, 1, 2];
      axes.forEach((a, k) => { const x1 = cx + Math.cos(a) * (R - 20), y1 = cy - Math.sin(a) * (R - 20); const x2 = cx - Math.cos(a) * (R - 20), y2 = cy + Math.sin(a) * (R - 20); D.circle(g, x1, y1, 16, { fill: cols[k] }); D.circle(g, x2, y2, 16, { fill: cols[k] }); D.text(g, names[k], x1, y1, { size: 13, weight: 900, color: '#fff', align: 'center' }); D.text(g, names[k] + "'", x2, y2, { size: 13, weight: 900, color: '#fff', align: 'center' }); });
      // phase currents & field vectors (space vectors along each coil axis)
      const ia = axes.map((_, k) => Math.cos(th - (phaseOrder[k] * 2 * Math.PI) / 3));
      let bx = 0, by = 0; axes.forEach((a, k) => { bx += ia[k] * Math.cos(a); by += ia[k] * Math.sin(a); });
      const L = 90;
      if (p.phasors && step >= 0) axes.forEach((a, k) => D.arrow(g, cx, cy, cx + Math.cos(a) * ia[k] * L, cy - Math.sin(a) * ia[k] * L, { color: cols[k], width: 3, head: 10, alpha: 0.85 }));
      // rotor
      const rr = R - 70; const rotAng = step >= 3 ? dir * -w * (1 - p.s / 100) * t * 0.6 : 0; // slower than field for visibility
      D.circle(g, cx, cy, rr, { fill: '#e2e8f0', stroke: '#475569', width: 2 });
      for (let k = 0; k < 16; k++) { const a = rotAng + (k * Math.PI) / 8; const bxk = cx + Math.cos(a) * (rr - 14), byk = cy + Math.sin(a) * (rr - 14); const induced = step >= 2 ? Math.cos(a + th * dir) : 0; D.circle(g, bxk, byk, 8, { fill: induced > 0.3 ? '#f97316' : induced < -0.3 ? '#60a5fa' : '#a16207' }); }
      D.circle(g, cx, cy, 16, { fill: '#1f2937' });
      if (step >= 1) { D.arrow(g, cx, cy, cx + bx * L * 0.67 * 1.5, cy - by * L * 0.67 * 1.5, { color: C.ink, width: 7, head: 20 }); D.tag(g, 'Resultant field (rotating)', cx, cy + R + 22, { bg: C.ink, size: 13, align: 'center' }); }
      // three-phase currents chart with time cursor
      const T0 = (th / (2 * Math.PI)); const ch = K.scope(g, 560, 80, 400, 200, [0, 1, 2].map((k) => ({ fn: (u) => Math.cos(2 * Math.PI * u - (phaseOrder[k] * 2 * Math.PI) / 3), color: cols[k], width: 2.6 })), { t0: T0 - 1, t1: T0, ymax: 1.2, xfmt: () => '', yfmt: false, title: 'Phase currents i_R, i_Y, i_B (now = right edge)' });
      void ch;
      K.infoBox(g, 560, 330, [{ t: `N_s = 120f/P = ${n(c.Ns, 4)} rpm`, b: true }, { t: `N_r = N_s(1 − s) = ${n(c.Nr, 4)} rpm`, b: true, c: C.green }, `rotor frequency f_r = ${n(c.fr, 3)} Hz`, 'orange / blue bars: induced rotor current', '(animation slowed down to be visible)'], { w: 400 });
      focusIf(g, step === 2, cx - rr, cy - rr, 2 * rr, 2 * rr, t);
    },
    challenge: {
      make(rand) { const target = pick(rand, [1440, 1455, 960, 2910, 720]); return { kind: 'im-rotor-speed', prompt: `Choose the frequency, number of poles and slip so that the rotor runs at ${target} rpm.`, target, unit: 'rpm', tolerance: 5, hint: 'First pick P so that N_s = 120f/P is just above the target, then set the slip.', setup: { f: 50, P: 2, s: 10 } }; },
      evaluate(p) { const v = KINDS['im-rotor-speed'](Object.assign({}, p, { f: Number(p.f), P: Number(p.P) })); return { value: v, text: `N_r = ${n(v, 4)} rpm`, calculation: `N_s = 120×${p.f}/${p.P}; N_r = N_s(1 − ${p.s}/100) = ${n(v, 4)} rpm` }; },
    },
  };

  // ───────────────────────── 21. Induction motor characteristics ─────────────────────────
  S['ee-im-characteristics'] = {
    params: [
      { key: 'R2', label: 'Rotor resistance R₂ (per phase)', type: 'range', min: 0.05, max: 2, step: 0.05, default: 0.2, unit: 'Ω' },
      { key: 'X2', label: 'Rotor standstill reactance X₂', type: 'range', min: 0.2, max: 2, step: 0.05, default: 1, unit: 'Ω' },
      { key: 'E2', label: 'Rotor standstill EMF E₂ (per phase)', type: 'range', min: 20, max: 250, step: 5, default: 100, unit: 'V' },
      { key: 's', label: 'Operating slip s', type: 'range', min: 1, max: 100, step: 1, default: 5, unit: '%' },
      { key: 'Ns', label: 'Synchronous speed N_s', type: 'select', default: 1500, options: [3000, 1500, 1000, 750].map((v) => ({ value: v, label: `${v} rpm` })) },
    ],
    compute(p) {
      const Ns = Number(p.Ns); const ws = (2 * Math.PI * Ns) / 60; const Tf = (s) => (3 / ws) * ((s * p.E2 * p.E2 * p.R2) / (p.R2 * p.R2 + (s * p.X2) ** 2));
      const s = p.s / 100; const T = Tf(s); const sm = Math.min(1, p.R2 / p.X2); const Tmax = Tf(p.R2 / p.X2); const Tst = Tf(1);
      const pts = Array.from({ length: 101 }, (_, i) => { const ss = Math.max(0.001, i / 100); return [ss, Tf(ss)]; });
      return {
        Ns, T, sm, Tmax, Tst, pts, Nr: Ns * (1 - s),
        formulas: [F('Torque', 'T = (3/ω_s)·s E₂² R₂ / (R₂² + (s X₂)²)', `s = ${p.s}%, R₂ = ${p.R2} Ω, X₂ = ${p.X2} Ω, E₂ = ${p.E2} V`, `(3/${n(ws, 4)}) × ${s} × ${p.E2}² × ${p.R2} / (${p.R2}² + (${s}×${p.X2})²)`, `${n(T, 4)} N·m`, 'N·m'), F('Maximum torque', 's_m = R₂ / X₂,  T_max = (3/ω_s)·E₂² / (2X₂)', '', `s_m = ${p.R2}/${p.X2} = ${n(p.R2 / p.X2, 4)}`, `T_max = ${n(Tmax, 4)} N·m`, 'N·m'), F('Starting torque (s = 1)', 'T_st = (3/ω_s)·E₂² R₂ / (R₂² + X₂²)', '', '', `${n(Tst, 4)} N·m`, 'N·m')],
        readouts: [{ label: 'T', value: `${n(T, 4)} N·m`, tone: 'good' }, { label: 'T_max', value: `${n(Tmax, 4)} N·m` }, { label: 's at T_max', value: n(p.R2 / p.X2, 3) }, { label: 'T_start', value: `${n(Tst, 4)} N·m` }, { label: 'Speed', value: `${n(Ns * (1 - s), 4)} rpm` }],
        state: { operatingSlip: `${p.s}%`, torque: `${n(T, 4)} N·m`, maxTorque: `${n(Tmax, 4)} N·m at s = ${n(p.R2 / p.X2, 3)}`, startingTorque: `${n(Tst, 4)} N·m`, graph: 'Torque–slip: T ∝ s for small slip (stable region), T ∝ 1/s for large slip' },
        explain: { what: `At ${p.s}% slip the motor develops ${n(T, 4)} N·m; the maximum ${n(Tmax, 4)} N·m occurs at s = ${n(p.R2 / p.X2, 3)}.`, why: 'For small slip the rotor current (and torque) rise almost in proportion to s; for large slip the rotor reactance sX₂ dominates and the torque falls. Maximum torque occurs when R₂ = sX₂.', param: 'Rotor resistance and reactance, supply EMF and slip.', effect: 'Increasing R₂ does not change T_max but moves it to a higher slip, raising the starting torque (slip-ring motors use this). T ∝ E₂², so voltage dips reduce torque sharply.' },
      };
    },
    steps: (p, c) => [
      { title: 'Low-slip region', text: 'Near synchronous speed T ≈ ∝ s — the normal, stable operating region.' },
      { title: 'Maximum (pull-out) torque', text: `At s_m = R₂/X₂ = ${n(p.R2 / p.X2, 3)}: T_max = ${n(c.Tmax, 4)} N·m.` },
      { title: 'High-slip region', text: `Beyond s_m the torque falls (T ∝ 1/s); starting torque at s = 1 is ${n(c.Tst, 4)} N·m.` },
      { title: 'Operating point', text: `At s = ${p.s}%: T = ${n(c.T, 4)} N·m, speed ${n(c.Nr, 4)} rpm.` },
    ],
    draw(g, S) {
      const { p, c, step } = S; bg(g);
      const ymax = c.Tmax * 1.2;
      D.chart(g, 90, 70, 380, 330, { xmin: 0, xmax: 1, ymin: 0, ymax, xlabel: 'Slip s', ylabel: 'Torque (N·m)', title: 'Torque – slip', series: [{ points: c.pts, color: C.violet, width: 3 }], marks: [{ point: [p.s / 100, c.T], label: `s ${p.s}%`, color: C.orange }, ...(step >= 1 ? [{ point: [p.R2 / p.X2 <= 1 ? p.R2 / p.X2 : 1, p.R2 / p.X2 <= 1 ? c.Tmax : c.Tst], label: 'T_max', color: C.red }] : []), ...(step >= 2 ? [{ point: [1, c.Tst], label: 'T_start', color: C.blue }] : [])] });
      D.chart(g, 570, 70, 380, 330, { xmin: 0, xmax: c.Ns, ymin: 0, ymax, xlabel: 'Speed N (rpm)', ylabel: 'Torque (N·m)', title: 'Torque – speed', series: [{ points: c.pts.map(([s, T]) => [c.Ns * (1 - s), T]), color: C.green, width: 3 }], marks: [{ point: [c.Nr, c.T], label: `${n(c.Nr, 4)} rpm`, color: C.orange }, { x: c.Ns, label: 'N_s', color: C.muted }] });
      K.infoBox(g, 90, 460, [{ t: `T_max = ${n(c.Tmax, 4)} N·m at s = R₂/X₂ = ${n(p.R2 / p.X2, 3)}`, b: true, c: C.red }, `T_start = ${n(c.Tst, 4)} N·m   T(${p.s}%) = ${n(c.T, 4)} N·m`], { w: 860 });
    },
    challenge: {
      make() { return { kind: 'im-smax', prompt: 'Adjust the rotor resistance so that the maximum torque is developed at starting (s_m = 1).', target: 1, unit: 's_m', tolerance: 0.03, hint: 's_m = R₂ / X₂ — make R₂ equal to X₂.', setup: { R2: 0.2, X2: 1 } }; },
      evaluate(p) { const v = KINDS['im-smax'](p); return { value: v, text: `s_m = ${n(v, 4)}`, calculation: `s_m = R₂/X₂ = ${p.R2}/${p.X2} = ${n(v, 4)}` }; },
    },
  };

  // ───────────────────────── 22. Induction motor starters ─────────────────────────
  S['ee-im-starters'] = {
    live: true, conceptual: true,
    modes: [{ key: 'dol', label: 'DOL starter' }, { key: 'stardelta', label: 'Star–Delta starter' }],
    params: [
      { key: 'stage', label: 'Starter state', type: 'select', default: 'start', options: [{ value: 'off', label: 'OFF' }, { value: 'start', label: 'START pressed' }, { value: 'run', label: 'Running' }] },
      { key: 'Ifl', label: 'Full-load current', type: 'range', min: 5, max: 50, step: 1, default: 10, unit: 'A' },
    ],
    compute(p) {
      const dol = p.mode === 'dol'; const Ist = dol ? 6 * p.Ifl : 2 * p.Ifl; const conn = p.stage === 'off' ? 'disconnected' : dol || p.stage === 'run' ? 'delta (full voltage per phase)' : 'star (1/√3 voltage per phase)';
      const I = p.stage === 'off' ? 0 : p.stage === 'start' ? Ist : p.Ifl;
      return {
        Ist, conn, I,
        formulas: [F(dol ? 'DOL starting current' : 'Star–delta starting current', dol ? 'I_st ≈ 5–7 × I_FL (full voltage)' : 'I_st(Y) = ⅓ × I_st(DOL);  T_st(Y) = ⅓ × T_st(DOL)', `I_FL = ${p.Ifl} A`, dol ? `6 × ${p.Ifl}` : `(6 × ${p.Ifl}) / 3`, `${n(Ist)} A`, 'A')],
        readouts: [{ label: 'Winding', value: conn }, { label: 'Line current', value: `${n(I)} A`, tone: p.stage === 'start' && dol ? 'bad' : 'good' }, { label: 'Starting current', value: `${n(Ist)} A` }],
        state: { starter: dol ? 'Direct-on-line' : 'Star–delta', state: p.stage, windingConnection: conn, lineCurrent: `${n(I)} A`, startingCurrent: `${n(Ist)} A (${dol ? 'about 6× full load' : 'one third of DOL'})` },
        explain: { what: dol ? 'The DOL starter switches the full supply voltage straight onto the motor.' : 'The windings start in star (each phase gets V/√3) and are switched to delta once the motor is near full speed.', why: 'At standstill the rotor has no back EMF-like opposition (slip = 1), so the current is 5–7× full load. Star connection reduces the phase voltage to 1/√3, cutting the line current (and torque) to one third.', param: 'Starter type and state.', effect: dol ? 'Simple and cheap; suitable for small motors (up to about 5 kW). Large motors would cause voltage dips.' : 'Lower starting current, but also only ⅓ starting torque — used for motors that start on light load.' },
      };
    },
    steps: (p) => (p.mode === 'dol' ? [
      { title: 'Arrangement', text: 'Supply → main contactor → overload relay → motor, with START / STOP push buttons.' },
      { title: 'START', text: 'The contactor closes and full line voltage reaches the delta-connected windings.' },
      { title: 'Starting current', text: 'The motor draws about 6× full-load current until it accelerates.' },
      { title: 'Running', text: 'Current settles to the load current; the overload relay trips on sustained over-current.' },
    ] : [
      { title: 'Arrangement', text: 'Main, star and delta contactors with a timer and an overload relay.' },
      { title: 'START in star', text: 'The star contactor joins the winding ends; each phase gets V/√3.' },
      { title: 'Reduced starting current', text: 'Line current and torque are one third of DOL values.' },
      { title: 'Switch to delta', text: 'After the timer, star opens and delta closes: full voltage for normal running.' },
    ]),
    draw(g, S) {
      const { p, c, step, t, playing } = S; bg(g);
      const dol = p.mode === 'dol'; const stage = playing || S.st < S.dur ? ['off', 'start', 'start', 'run'][step] : p.stage;
      const lines = [['L1', '#dc2626', 100], ['L2', '#eab308', 130], ['L3', '#2563eb', 160]];
      lines.forEach(([l, col, y]) => { D.line(g, 40, y, 520, y, { color: col, width: 4 }); D.text(g, l, 30, y, { size: 13, weight: 900, color: col, align: 'right' }); });
      // contactor block
      D.rect(g, 180, 80, 90, 100, { fill: stage !== 'off' ? '#dcfce7' : '#fff', stroke: C.ink, r: 10 }); D.text(g, 'Main', 225, 195, { size: 13, weight: 800, align: 'center' });
      D.rect(g, 300, 80, 90, 100, { fill: '#fff', stroke: C.red, r: 10 }); D.text(g, 'Overload', 345, 195, { size: 13, weight: 800, align: 'center', color: C.red });
      // motor winding diagram
      const mx = 330, my = 380, r = 90; const inStar = !dol && stage === 'start';
      const pts = [0, 1, 2].map((k) => [mx + r * Math.cos(-Math.PI / 2 + (k * 2 * Math.PI) / 3), my + r * Math.sin(-Math.PI / 2 + (k * 2 * Math.PI) / 3)]);
      const cols = ['#dc2626', '#eab308', '#2563eb'];
      if (stage === 'off') { D.text(g, 'Motor OFF', mx, my, { size: 18, weight: 800, align: 'center', color: C.muted }); }
      else if (inStar) { pts.forEach((q, k) => K.coil(g, q, [mx, my], { turns: 3, color: cols[k] })); K.node(g, mx, my, { r: 7, label: 'star point', dx: 12, dy: 20 }); }
      else { pts.forEach((q, k) => K.coil(g, q, pts[(k + 1) % 3], { turns: 4, color: cols[k] })); }
      pts.forEach((q, k) => { D.line(g, q[0], q[1], q[0], 220, { color: cols[k], width: 3, dash: [6, 5] }); D.circle(g, q[0], q[1], 6, { fill: cols[k] }); });
      D.tag(g, stage === 'off' ? 'disconnected' : inStar ? 'STAR: V_phase = V_L/√3' : 'DELTA: V_phase = V_L', mx, my + r + 40, { bg: inStar ? C.blue : stage === 'off' ? '#94a3b8' : C.green, size: 14, align: 'center' });
      // current vs time chart
      const Ifl = p.Ifl; const curve = (tt) => { if (dol) return tt < 0.2 ? 0 : tt < 2.2 ? Ifl * (6 - 5 * Math.max(0, (tt - 1.2)) / 1) : Ifl; return tt < 0.2 ? 0 : tt < 2 ? Ifl * 2 * (1 - 0.3 * (tt - 0.2) / 1.8) : tt < 2.3 ? Ifl * 3 * (1 - (tt - 2) / 0.6) : Ifl; };
      const pts2 = Array.from({ length: 121 }, (_, i) => { const tt = (i / 120) * 4; return [tt, Math.max(Ifl, Math.min(Ifl * 6, curve(tt))) * (tt < 0.2 ? 0 : 1)]; });
      const now = stage === 'off' ? 0.1 : stage === 'start' ? 1 : 3.5;
      D.chart(g, 600, 80, 360, 260, { xmin: 0, xmax: 4, ymin: 0, ymax: Ifl * 7, xlabel: 'time (s, conceptual)', ylabel: 'Line current (A)', title: dol ? 'DOL: ≈6 × I_FL at start' : 'Star–delta: ⅓ of DOL, then switch-over', series: [{ points: pts2, color: dol ? C.red : C.blue, width: 3 }, ...(dol ? [] : [{ points: Array.from({ length: 121 }, (_, i) => { const tt = (i / 120) * 4; return [tt, tt < 0.2 ? 0 : tt < 2.2 ? Ifl * (6 - 5 * Math.max(0, tt - 1.2)) : Ifl]; }), color: '#fca5a5', width: 2, dash: [6, 5] }])], marks: [{ x: now, color: C.orange }] });
      K.infoBox(g, 600, 400, [{ t: dol ? 'DOL starter' : 'Star–delta starter', b: true, c: C.green }, `Starting current ≈ ${n(c.Ist)} A`, dol ? 'Simple; small motors' : '⅓ current and ⅓ torque at start', dol ? '' : 'dashed: DOL for comparison'], { w: 360 });
      void t;
    },
    challenge: {
      make() { return { kind: 'select-match', prompt: 'A large motor must start with only one third of the direct-on-line starting current. Select the starter that achieves this.', target: 1, unit: '(1 = correct starter)', tolerance: 0, meta: { key: 'mode', expected: 'stardelta' }, hint: 'Starting in star gives each phase V/√3.', setup: { mode: 'dol' } }; },
      evaluate(p, c, ch) { const v = KINDS['select-match'](p, ch && ch.meta); return { value: v, text: p.mode === 'dol' ? 'DOL starter' : 'Star–delta starter', calculation: p.mode === 'dol' ? 'DOL: I_st ≈ 6 I_FL' : 'Star: I_st = ⅓ I_st(DOL)' }; },
    },
  };
})();
