'use strict';

/* U25EEG02 — Unit V: Applications of Semiconductor Devices (7 simulations). */
(function () {
  const S = (window.EESims = window.EESims || {});
  const D = window.EPDraw; const K = window.EEKit; const KINDS = window.EEChallengeKinds; const C = D.C;
  const { si, n } = K;
  const F = (name, formula, given, calc, result, unit) => ({ name, formula, given, calc, result, unit: unit || '—' });
  const pick = (rand, arr) => arr[Math.floor(rand() * arr.length) % arr.length];
  const focusIf = (g, on, x, y, w, h, t) => { if (on) D.focus(g, x, y, w, h, t); };
  const bg = (g) => D.clear(g, '#f8fafc');
  const VIS = 0.25; // displayed AC cycles per second (slowed down)
  const VdParam = { key: 'Vd', label: 'Diode model', type: 'select', default: 0.7, options: [{ value: 0, label: 'Ideal diode (0 V)' }, { value: 0.7, label: 'Silicon (0.7 V drop)' }] };
  const hw = (Vm, Vd) => (u) => Math.max(0, Vm * Math.sin(2 * Math.PI * u) - Vd);
  const fw = (Vm, drop) => (u) => Math.max(0, Vm * Math.abs(Math.sin(2 * Math.PI * u)) - drop);

  // ───────────────────────── 29. Half-wave rectifier ─────────────────────────
  S['ee-half-wave'] = {
    live: true,
    params: [
      { key: 'Vm', label: 'Peak input voltage V_m', type: 'range', min: 2, max: 50, step: 0.5, default: 12, unit: 'V' },
      { key: 'f', label: 'Supply frequency', type: 'select', default: 50, options: [{ value: 50, label: '50 Hz' }, { value: 60, label: '60 Hz' }] },
      VdParam,
      { key: 'RL', label: 'Load R_L', type: 'range', min: 100, max: 10000, step: 100, default: 1000, unit: 'Ω' },
    ],
    stepDuration: 4,
    compute(p) {
      const Vd = Number(p.Vd); const Vp = Math.max(0, p.Vm - Vd); const Vdc = KINDS['hw-vdc'](Object.assign({}, p, { Vd })); const Vrms = Vp / 2; const Idc = Vdc / p.RL;
      return {
        Vd, Vp, Vdc, Vrms, Idc,
        formulas: [F('Average (DC) output', 'V_dc = V_p / π  (V_p = V_m − V_D)', `V_m = ${p.Vm} V, V_D = ${Vd} V`, `${n(Vp)} / π`, si(Vdc, 'V'), 'V'), F('RMS output', 'V_rms = V_p / 2', '', `${n(Vp)} / 2`, si(Vrms, 'V'), 'V'), F('Figures of merit', 'ripple factor γ = 1.21,  η_max = 40.6 %,  PIV = V_m,  f_out = f', `f = ${p.f} Hz`, '', `f_out = ${p.f} Hz, PIV = ${p.Vm} V`, '—')],
        readouts: [{ label: 'V_dc', value: si(Vdc, 'V'), tone: 'good' }, { label: 'V_rms', value: si(Vrms, 'V') }, { label: 'I_dc', value: si(Idc, 'A') }, { label: 'Ripple γ', value: '1.21' }, { label: 'f_out', value: `${p.f} Hz` }],
        state: { circuit: 'AC source → diode → load R_L', inputPeak: `${p.Vm} V`, diodeDrop: `${Vd} V`, outputPeak: si(Vp, 'V'), dcOutput: si(Vdc, 'V'), rmsOutput: si(Vrms, 'V'), rippleFactor: 1.21, outputFrequency: `${p.f} Hz`, waveform: 'positive half cycles pass (minus the diode drop); negative half cycles are blocked (output 0)' },
        explain: { what: `Only the positive half cycles reach the load; the average output is ${si(Vdc, 'V')}.`, why: 'During the positive half cycle the anode is positive, the diode is forward biased and conducts; during the negative half cycle it is reverse biased and blocks, so the load current flows in one direction only.', param: 'Peak input, frequency, diode model and load.', effect: 'The output is pulsating DC with large ripple (γ = 1.21) at the supply frequency — it needs a filter for most uses.' },
      };
    },
    steps: (p, c) => [
      { title: 'The circuit', text: 'AC source → diode → load resistor.' },
      { title: 'Positive half cycle', text: `Anode positive → diode forward biased → conducts; v_out = v_in − ${c.Vd} V.` },
      { title: 'Negative half cycle', text: 'Anode negative → diode reverse biased → blocks; v_out = 0.' },
      { title: 'Output waveform', text: 'Pulsating DC: half-sine pulses separated by gaps.' },
      { title: 'Average value', text: `V_dc = V_p/π = ${n(c.Vdc, 4)} V; ripple factor 1.21; f_out = ${p.f} Hz.` },
    ],
    draw(g, S) {
      const { p, c, step, t } = S; bg(g);
      const u = S.playing || step === 0 || step >= 3 ? (t * VIS) % 1 : step === 1 ? 0.25 : 0.75;
      const vin = p.Vm * Math.sin(2 * Math.PI * u); const on = vin > c.Vd; const vout = on ? vin - c.Vd : 0;
      K.wire(g, [[100, 250], [100, 110], [240, 110]]); K.diode(g, [240, 110], [360, 110], { label: 'D', value: on ? 'ON (forward)' : 'OFF (reverse)', on, glow: on }); K.wire(g, [[360, 110], [480, 110], [480, 180]]); K.resistor(g, [480, 180], [480, 330], { label: 'R_L', value: `${p.RL} Ω`, labelSide: 'other', heat: on ? Math.min(0.5, vout / p.Vm) : 0 }); K.wire(g, [[480, 330], [480, 420], [100, 420], [100, 330]]);
      K.ac(g, [100, 330], [100, 250], { label: 'v_in', value: `${n(vin, 3)} V`, labelOffset: 48, phase: 2 * Math.PI * u });
      K.polarity(g, vin >= 0 ? [70, 225] : [70, 355], vin >= 0 ? [70, 355] : [70, 225]);
      if (on) K.flow(g, [[100, 250], [100, 110], [480, 110], [480, 420], [100, 420], [100, 330]], t, vout / p.RL, { ref: 0.005 });
      D.tag(g, `v_out = ${n(vout, 3)} V`, 300, 460, { bg: on ? C.green : '#94a3b8', size: 14, align: 'center' });
      const mk = [{ x: u, color: C.orange }];
      K.scope(g, 640, 80, 330, 170, [{ fn: (x) => p.Vm * Math.sin(2 * Math.PI * x), color: '#94a3b8', width: 2.5 }], { t0: 0, t1: 2, ymax: p.Vm * 1.15, xfmt: (v) => `${n(v, 2)}T`, marks: [...mk, { x: u + 1, color: C.orange }], title: 'Input v_in', yticks: 2 });
      K.scope(g, 640, 320, 330, 170, [{ fn: hw(p.Vm, c.Vd), color: C.green, width: 3, fill: C.green, fillAlpha: 0.15 }, { fn: () => c.Vdc, color: C.red, dash: [6, 5], width: 2 }], { t0: 0, t1: 2, ymin: -p.Vm * 0.15, ymax: p.Vm * 1.15, xfmt: (v) => `${n(v, 2)}T`, marks: [...mk, { x: u + 1, color: C.orange }], title: `Output v_out (red dashed: V_dc = ${n(c.Vdc, 3)} V)`, yticks: 2 });
      focusIf(g, step === 1 || step === 2, 220, 70, 160, 80, t);
      D.text(g, on ? 'Positive half: diode conducts' : 'Negative half: diode blocks', 300, 510, { size: 17, weight: 800, align: 'center', color: on ? C.green : C.red });
    },
    challenge: {
      make(rand) { const target = pick(rand, [3, 5, 6, 9, 12]); return { kind: 'hw-vdc', prompt: `Using a silicon diode, set the peak input so that the half-wave rectifier gives a DC (average) output of ${target} V.`, target, unit: 'V', tolerance: 0.1, hint: 'V_dc = (V_m − 0.7)/π → V_m = πV_dc + 0.7', setup: { Vm: 5, Vd: 0.7 } }; },
      evaluate(p) { const v = KINDS['hw-vdc'](Object.assign({}, p, { Vd: Number(p.Vd) })); return { value: v, text: `V_dc = ${n(v, 4)} V`, calculation: `V_dc = (${p.Vm} − ${p.Vd})/π = ${n(v, 4)} V` }; },
    },
  };

  // ───────────────────────── 30. Full-wave rectifier ─────────────────────────
  S['ee-full-wave'] = {
    live: true,
    modes: [{ key: 'centertap', label: 'Centre-tapped (2 diodes)' }, { key: 'bridge', label: 'Bridge (4 diodes)' }],
    params: [
      { key: 'Vm', label: 'Peak secondary voltage V_m (each half for centre-tap)', type: 'range', min: 2, max: 50, step: 0.5, default: 12, unit: 'V' },
      { key: 'f', label: 'Supply frequency', type: 'select', default: 50, options: [{ value: 50, label: '50 Hz' }, { value: 60, label: '60 Hz' }] },
      VdParam,
      { key: 'RL', label: 'Load R_L', type: 'range', min: 100, max: 10000, step: 100, default: 1000, unit: 'Ω' },
    ],
    stepDuration: 4,
    compute(p) {
      const Vd = Number(p.Vd); const nd = p.mode === 'bridge' ? 2 : 1; const drop = nd * Vd; const Vp = Math.max(0, p.Vm - drop); const Vdc = KINDS['fw-vdc'](Object.assign({}, p, { Vd })); const Vrms = Vp / Math.SQRT2;
      return {
        Vd, drop, Vp, Vdc, Vrms, nd,
        formulas: [F('Average (DC) output', 'V_dc = 2V_p / π', `V_p = V_m − ${nd}·V_D = ${n(Vp)} V`, `2 × ${n(Vp)} / π`, si(Vdc, 'V'), 'V'), F('RMS output', 'V_rms = V_p / √2', '', `${n(Vp)} / 1.414`, si(Vrms, 'V'), 'V'), F('Figures of merit', 'γ = 0.482,  η_max = 81.2 %,  f_out = 2f', `f = ${p.f} Hz`, '', `f_out = ${2 * p.f} Hz, PIV = ${p.mode === 'bridge' ? 'V_m' : '2V_m'}`, '—')],
        readouts: [{ label: 'V_dc', value: si(Vdc, 'V'), tone: 'good' }, { label: 'V_rms', value: si(Vrms, 'V') }, { label: 'Ripple γ', value: '0.482' }, { label: 'f_out', value: `${2 * p.f} Hz` }, { label: 'PIV', value: p.mode === 'bridge' ? `${p.Vm} V` : `${2 * p.Vm} V` }],
        state: { type: p.mode === 'bridge' ? 'bridge rectifier' : 'centre-tapped full-wave rectifier', inputPeak: `${p.Vm} V`, diodesConductingPerHalf: nd, dcOutput: si(Vdc, 'V'), rmsOutput: si(Vrms, 'V'), outputFrequency: `${2 * p.f} Hz`, rippleFactor: 0.482, conduction: p.mode === 'bridge' ? 'positive half: D1 & D3; negative half: D2 & D4' : 'positive half: D1; negative half: D2' },
        explain: { what: `Both half cycles drive current through the load in the same direction: V_dc = ${si(Vdc, 'V')}, output frequency ${2 * p.f} Hz.`, why: p.mode === 'bridge' ? 'In each half cycle a different pair of diodes is forward biased, and each pair steers the current through the load from the same end.' : 'The centre tap gives two anti-phase voltages; each diode conducts on the half cycle when its end of the winding is positive.', param: 'Rectifier type, peak voltage, diode model and load.', effect: 'Compared with half-wave: double the DC output, lower ripple (0.482) and twice the ripple frequency, which is easier to filter.' },
      };
    },
    steps: (p) => [
      { title: 'The circuit', text: p.mode === 'bridge' ? 'Four diodes in a bridge; the load sits across the other diagonal.' : 'A centre-tapped secondary, two diodes and the load returned to the centre tap.' },
      { title: 'Positive half cycle', text: p.mode === 'bridge' ? 'D1 and D3 conduct; D2 and D4 are reverse biased.' : 'D1 conducts (top end positive); D2 is reverse biased.' },
      { title: 'Negative half cycle', text: p.mode === 'bridge' ? 'D2 and D4 conduct; current in the load is still in the same direction.' : 'D2 conducts (bottom end positive); load current direction unchanged.' },
      { title: 'Output waveform', text: 'Every half cycle becomes a positive pulse — the output frequency doubles.' },
    ],
    draw(g, S) {
      const { p, c, step, t } = S; bg(g);
      const u = S.playing || step === 0 || step >= 3 ? (t * VIS) % 1 : step === 1 ? 0.25 : 0.75;
      const vin = p.Vm * Math.sin(2 * Math.PI * u); const pos = vin >= 0; const vout = Math.max(0, Math.abs(vin) - c.drop); const I = vout / p.RL;
      if (p.mode === 'bridge') {
        const T = [300, 110], L = [200, 250], Rr = [400, 250], B = [300, 390];
        // L and B are the AC corners, T is the + output, Rr the − output
        const on1 = pos && vout > 0, on2 = !pos && vout > 0;
        K.wire(g, [[80, 200], [80, 110], [140, 110], [140, 250], [200, 250]]); K.wire(g, [[80, 300], [80, 480], [300, 480], [300, 390]]); K.ac(g, [80, 300], [80, 200], { label: 'v_in', value: `${n(vin, 3)} V`, labelOffset: 44, phase: 2 * Math.PI * u });
        K.diode(g, L, T, { label: 'D1', on: on1, glow: on1 }); K.diode(g, B, T, { label: 'D2', on: on2, glow: on2, labelSide: 'other' }); K.diode(g, Rr, B, { label: 'D3', on: on1, glow: on1, labelSide: 'other' }); K.diode(g, Rr, L, { label: 'D4', on: on2, glow: on2 });
        [T, L, Rr, B].forEach((q) => K.node(g, q[0], q[1], { r: 5 }));
        K.wire(g, [T, [560, 110], [560, 180]]); K.resistor(g, [560, 180], [560, 330], { label: 'R_L', value: `${p.RL} Ω`, labelSide: 'other' }); K.wire(g, [[560, 330], [560, 250], [400, 250]]);
        D.text(g, '+', 300, 88, { size: 20, weight: 900, align: 'center', color: C.red }); D.text(g, '−', 420, 232, { size: 22, weight: 900, color: C.blue });
        if (vout > 0) { const path = pos ? [[80, 200], [80, 110], [140, 110], [140, 250], L, T, [560, 110], [560, 330], [560, 250], Rr, B, [300, 480], [80, 480], [80, 300]] : [[80, 300], [80, 480], [300, 480], B, T, [560, 110], [560, 330], [560, 250], Rr, L, [140, 250], [140, 110], [80, 110], [80, 200]]; K.flow(g, path, t, I, { ref: 0.005, color: pos ? C.orange : C.violet }); }
      } else {
        // transformer secondary with centre tap
        D.rect(g, 150, 110, 24, 300, { fill: '#94a3b8', r: 4 }); K.coil(g, [120, 120], [120, 400], { turns: 9, color: '#b45309' }); K.coil(g, [200, 120], [200, 400], { turns: 9, color: '#2563eb' });
        K.wire(g, [[60, 120], [120, 120]]); K.wire(g, [[60, 400], [120, 400]]); K.ac(g, [60, 330], [60, 190], { phase: 2 * Math.PI * u }); D.text(g, 'mains', 60, 360, { size: 13, weight: 800, align: 'center', color: C.muted }); K.wire(g, [[60, 120], [60, 190]]); K.wire(g, [[60, 330], [60, 400]]);
        const on1 = pos && vout > 0, on2 = !pos && vout > 0;
        K.wire(g, [[200, 120], [260, 120]]); K.diode(g, [260, 120], [380, 120], { label: 'D1', on: on1, glow: on1 }); K.wire(g, [[200, 400], [260, 400]]); K.diode(g, [260, 400], [380, 400], { label: 'D2', on: on2, glow: on2, labelSide: 'other' });
        K.wire(g, [[380, 120], [480, 120], [480, 400], [380, 400]]); K.node(g, 480, 260, { r: 5 }); K.wire(g, [[480, 260], [640, 260], [640, 290]]);
        K.wire(g, [[200, 260], [240, 260], [240, 470], [640, 470], [640, 420]]); K.resistor(g, [640, 290], [640, 420], { label: 'R_L', value: `${p.RL} Ω`, labelSide: 'other' });
        D.tag(g, 'centre tap', 208, 245, { bg: C.ink, size: 11 });
        if (vout > 0) { const path = pos ? [[200, 120], [480, 120], [480, 260], [640, 260], [640, 470], [240, 470], [240, 260], [200, 260]] : [[200, 400], [480, 400], [480, 260], [640, 260], [640, 470], [240, 470], [240, 260], [200, 260]]; K.flow(g, path, t, I, { ref: 0.005, color: pos ? C.orange : C.violet }); }
      }
      D.tag(g, pos ? 'Positive half cycle' : 'Negative half cycle', 330, 530, { bg: pos ? C.orange : C.violet, size: 15, align: 'center' });
      const mk = [{ x: u, color: C.orange }, { x: u + 1, color: C.orange }];
      K.scope(g, 700, 80, 270, 160, [{ fn: (x) => p.Vm * Math.sin(2 * Math.PI * x), color: '#94a3b8', width: 2.5 }], { t0: 0, t1: 2, ymax: p.Vm * 1.15, xfmt: (v) => `${n(v, 2)}T`, marks: mk, title: 'Input', yticks: 2, xticks: 2 });
      K.scope(g, 700, 320, 270, 170, [{ fn: fw(p.Vm, c.drop), color: C.green, width: 3, fill: C.green, fillAlpha: 0.15 }, { fn: () => c.Vdc, color: C.red, dash: [6, 5], width: 2 }], { t0: 0, t1: 2, ymin: -p.Vm * 0.15, ymax: p.Vm * 1.15, xfmt: (v) => `${n(v, 2)}T`, marks: mk, title: `Output (V_dc ${n(c.Vdc, 3)} V)`, yticks: 2, xticks: 2 });
    },
    challenge: {
      make(rand) { const target = pick(rand, [6, 8, 10, 15]); return { kind: 'fw-vdc', prompt: `Using the BRIDGE rectifier with silicon diodes, set the peak voltage so that V_dc = ${target} V.`, target, unit: 'V', tolerance: 0.1, hint: 'Two diodes conduct at a time: V_dc = 2(V_m − 1.4)/π', setup: { mode: 'centertap', Vm: 5, Vd: 0.7 } }; },
      evaluate(p) { const v = p.mode === 'bridge' ? KINDS['fw-vdc'](Object.assign({}, p, { Vd: Number(p.Vd) })) : NaN; return { value: v, text: p.mode === 'bridge' ? `V_dc = ${n(v, 4)} V` : 'Centre-tapped circuit selected — the task asks for the bridge rectifier', calculation: `V_dc = 2(${p.Vm} − 2×${p.Vd})/π = ${n(v, 4)} V` }; },
    },
  };

  // ───────────────────────── 31. Rectifier comparison ─────────────────────────
  S['ee-rectifier-compare'] = {
    live: true,
    params: [
      { key: 'Vm', label: 'Peak voltage V_m', type: 'range', min: 2, max: 50, step: 0.5, default: 12, unit: 'V' },
      { key: 'f', label: 'Supply frequency', type: 'select', default: 50, options: [{ value: 50, label: '50 Hz' }, { value: 60, label: '60 Hz' }] },
      VdParam,
    ],
    compute(p) {
      const Vd = Number(p.Vd); const hV = KINDS['hw-vdc'](Object.assign({}, p, { Vd })); const fV = KINDS['fw-vdc'](Object.assign({}, p, { Vd, mode: 'centertap' }));
      const rows = [['Diodes conducting', 'one, positive half only', 'one per half (centre-tap) / two (bridge)'], ['Output pulses per cycle', '1', '2'], ['V_dc', `V_m/π = ${n(hV, 3)} V`, `2V_m/π = ${n(fV, 3)} V`], ['Ripple factor γ', '1.21', '0.482'], ['Output frequency', `${p.f} Hz`, `${2 * p.f} Hz`], ['Max efficiency', '40.6 %', '81.2 %'], ['PIV', 'V_m', '2V_m (CT) / V_m (bridge)']];
      return {
        hV, fV, rows,
        formulas: [F('Half-wave', 'V_dc = V_p/π,  γ = 1.21', `V_m = ${p.Vm} V`, '', `${n(hV, 4)} V`, 'V'), F('Full-wave', 'V_dc = 2V_p/π,  γ = 0.482', '', '', `${n(fV, 4)} V`, 'V')],
        readouts: [{ label: 'Half-wave V_dc', value: si(hV, 'V') }, { label: 'Full-wave V_dc', value: si(fV, 'V'), tone: 'good' }, { label: 'Ratio', value: n(fV / Math.max(1e-9, hV), 3) }],
        state: { comparison: Object.fromEntries(rows.map((r) => [r[0], { halfWave: r[1], fullWave: r[2] }])) },
        explain: { what: `For the same ${p.Vm} V peak the full-wave rectifier gives ${n(fV, 3)} V DC against ${n(hV, 3)} V for half-wave.`, why: 'Full-wave uses both half cycles, so there are twice as many pulses: the average doubles, the ripple is smaller and its frequency is twice the supply frequency.', param: 'Peak voltage, frequency and diode model.', effect: 'Full-wave output is easier to filter (higher ripple frequency, smaller ripple) and uses the transformer better.' },
      };
    },
    steps: () => [{ title: 'Diode operation', text: 'Half-wave: conduction on one half cycle. Full-wave: conduction on both.' }, { title: 'Output waveforms', text: 'One pulse per cycle vs two pulses per cycle.' }, { title: 'Ripple and frequency', text: 'γ = 1.21 at f vs γ = 0.482 at 2f.' }],
    draw(g, S) {
      const { p, c, t, step } = S; bg(g); const u = (t * VIS) % 2; const Vd = Number(p.Vd);
      K.scope(g, 80, 70, 390, 170, [{ fn: (x) => p.Vm * Math.sin(2 * Math.PI * x), color: '#cbd5e1', width: 2 }, { fn: hw(p.Vm, Vd), color: C.blue, width: 3, fill: C.blue, fillAlpha: 0.15 }, { fn: () => c.hV, color: C.red, dash: [6, 5], width: 2 }], { t0: 0, t1: 2, ymin: -p.Vm * 1.1, ymax: p.Vm * 1.1, xfmt: (v) => `${n(v, 2)}T`, marks: [{ x: u, color: C.orange }], title: 'HALF-WAVE', yticks: 2, xticks: 4 });
      K.scope(g, 560, 70, 390, 170, [{ fn: (x) => p.Vm * Math.sin(2 * Math.PI * x), color: '#cbd5e1', width: 2 }, { fn: fw(p.Vm, Vd), color: C.green, width: 3, fill: C.green, fillAlpha: 0.15 }, { fn: () => c.fV, color: C.red, dash: [6, 5], width: 2 }], { t0: 0, t1: 2, ymin: -p.Vm * 1.1, ymax: p.Vm * 1.1, xfmt: (v) => `${n(v, 2)}T`, marks: [{ x: u, color: C.orange }], title: 'FULL-WAVE', yticks: 2, xticks: 4 });
      const y0 = 300; const cols = [80, 360, 650]; D.rect(g, 70, y0 - 22, 880, 32, { fill: '#e2e8f0', r: 6 });
      ['Feature', 'Half wave', 'Full wave'].forEach((h, i) => D.text(g, h, cols[i], y0 - 6, { size: 15, weight: 900 }));
      c.rows.forEach((r, i) => { const y = y0 + 22 + i * 30; const hl = (step === 0 && i === 0) || (step === 1 && i === 1) || (step === 2 && (i === 3 || i === 4)); if (hl) D.rect(g, 70, y - 14, 880, 28, { fill: '#fef3c7', r: 6 }); D.text(g, r[0], cols[0], y, { size: 14, weight: 800 }); D.text(g, r[1], cols[1], y, { size: 14, weight: 700, color: C.blue }); D.text(g, r[2], cols[2], y, { size: 14, weight: 700, color: C.green }); });
    },
    challenge: {
      make(rand) { const target = pick(rand, [5, 8, 10, 12]); return { kind: 'fw-vdc', prompt: `Set the peak voltage so that the (centre-tapped) full-wave output V_dc = ${target} V with silicon diodes.`, target, unit: 'V', tolerance: 0.1, hint: 'V_dc = 2(V_m − 0.7)/π', setup: { Vm: 5, Vd: 0.7 } }; },
      evaluate(p) { const v = KINDS['fw-vdc'](Object.assign({}, p, { Vd: Number(p.Vd), mode: 'centertap' })); return { value: v, text: `V_dc = ${n(v, 4)} V`, calculation: `V_dc = 2(${p.Vm} − ${p.Vd})/π = ${n(v, 4)} V` }; },
    },
  };

  // ───────────────────────── 32. Filter ─────────────────────────
  S['ee-filter'] = {
    live: true,
    params: [
      { key: 'rect', label: 'Rectifier', type: 'select', default: 'full', options: [{ value: 'half', label: 'Half-wave' }, { value: 'full', label: 'Full-wave' }] },
      { key: 'useC', label: 'Capacitor filter connected', type: 'toggle', default: true },
      { key: 'C', label: 'Filter capacitor C', type: 'range', min: 10, max: 4700, step: 10, default: 470, unit: 'µF', showIf: (p) => p.useC },
      { key: 'RL', label: 'Load R_L', type: 'range', min: 50, max: 5000, step: 10, default: 500, unit: 'Ω' },
      { key: 'Vm', label: 'Rectified peak V_m', type: 'range', min: 5, max: 40, step: 0.5, default: 12, unit: 'V' },
      { key: 'f', label: 'Supply frequency', type: 'select', default: 50, options: [{ value: 50, label: '50 Hz' }, { value: 60, label: '60 Hz' }] },
    ],
    compute(p) {
      const f = Number(p.f); const fr = f * (p.rect === 'half' ? 1 : 2);
      let Vr, Vdc, gamma;
      if (p.useC) { Vr = KINDS['filter-ripple'](Object.assign({}, p, { f })); Vdc = p.Vm - Vr / 2; gamma = Vr / (2 * Math.sqrt(3) * Vdc); }
      else { Vdc = (p.rect === 'half' ? 1 : 2) * p.Vm / Math.PI; gamma = p.rect === 'half' ? 1.21 : 0.482; Vr = p.Vm; }
      const Idc = Vdc / p.RL;
      return {
        fr, Vr, Vdc, gamma, Idc,
        formulas: p.useC ? [F('Ripple (peak-to-peak)', 'V_r = I_dc / (f_r C)', `I_dc = ${si(Idc, 'A')}, f_r = ${fr} Hz, C = ${p.C} µF`, `${n(Idc, 4)} / (${fr} × ${p.C}e-6)`, si(Vr, 'V'), 'V'), F('DC output', 'V_dc = V_m − V_r/2', '', `${p.Vm} − ${n(Vr, 4)}/2`, si(Vdc, 'V'), 'V'), F('Ripple factor', 'γ = V_r / (2√3 V_dc) = 1/(4√3 f_r C R_L) for FW', '', '', n(gamma, 4), '—')] : [F('Unfiltered', p.rect === 'half' ? 'V_dc = V_m/π, γ = 1.21' : 'V_dc = 2V_m/π, γ = 0.482', '', '', si(Vdc, 'V'), 'V')],
        readouts: [{ label: 'V_dc', value: si(Vdc, 'V'), tone: 'good' }, { label: 'Ripple V_r', value: si(Vr, 'V') }, { label: 'γ', value: n(gamma, 3), tone: gamma < 0.05 ? 'good' : gamma > 0.4 ? 'bad' : '' }, { label: 'f_ripple', value: `${fr} Hz` }],
        state: { rectifier: p.rect, filter: p.useC ? `${p.C} µF capacitor across the load` : 'none', load: `${p.RL} Ω`, dcOutput: si(Vdc, 'V'), ripplePeakToPeak: si(Vr, 'V'), rippleFactor: n(gamma, 4), rippleFrequency: `${fr} Hz`, waveform: p.useC ? 'capacitor charges to the peak, then discharges slowly through R_L until the next pulse — sawtooth ripple' : 'unfiltered pulsating DC' },
        explain: { what: p.useC ? `The capacitor fills in the gaps between pulses: ripple ${si(Vr, 'V')} p-p, γ = ${n(gamma, 3)}.` : 'Without a filter the output falls to zero between pulses.', why: 'The capacitor charges through the diode near each peak and supplies the load while the rectifier output falls; it discharges only a little if its time constant R_L·C is long compared with the time between pulses.', param: 'Rectifier type, capacitor, load, peak voltage and frequency.', effect: 'Larger C, lighter load (larger R_L) or full-wave (double ripple frequency) → smaller ripple.' },
      };
    },
    steps: (p) => [{ title: 'Rectifier output', text: 'Pulsating DC with large ripple.' }, { title: 'Filter', text: p.useC ? 'A capacitor across the load stores charge at each peak.' : 'Connect the capacitor to smooth the output.' }, { title: 'Filtered output', text: 'The capacitor discharges slowly between peaks — only a small ripple remains.' }],
    draw(g, S) {
      const { p, c, step } = S; bg(g);
      const fr = c.fr; const T = 1 / fr; const Tn = (x) => x / (Number(p.f)); // x in supply cycles → seconds
      const rectOut = (x) => (p.rect === 'half' ? Math.max(0, p.Vm * Math.sin(2 * Math.PI * x)) : p.Vm * Math.abs(Math.sin(2 * Math.PI * x)));
      // simulate capacitor voltage over 3 cycles
      const N = 720, cycles = 3; const pts = []; let vc = 0; const tau = p.RL * p.C * 1e-6;
      for (let i = 0; i <= N; i++) { const x = (i / N) * cycles; const vr = rectOut(x); const dt = Tn(cycles / N); if (!p.useC) vc = vr; else { vc = Math.max(vr, vc * Math.exp(-dt / tau)); } pts.push([x, vc]); }
      void T;
      // circuit
      K.wire(g, [[60, 150], [60, 110], [160, 110]]); D.rect(g, 160, 80, 120, 60, { fill: '#fff', stroke: C.ink, r: 10 }); D.text(g, p.rect === 'half' ? 'Half-wave' : 'Full-wave', 220, 102, { size: 13, weight: 800, align: 'center' }); D.text(g, 'rectifier', 220, 120, { size: 13, weight: 700, align: 'center', color: C.muted });
      K.ac(g, [60, 230], [60, 150], { labelOffset: 30 }); K.wire(g, [[60, 230], [60, 300], [440, 300]]); K.wire(g, [[280, 110], [440, 110]]);
      if (p.useC) { K.wire(g, [[340, 110], [340, 170]]); K.capacitor(g, [340, 170], [340, 240], { label: 'C', value: `${p.C} µF`, labelSide: 'other', color: step >= 1 ? C.blue : undefined }); K.wire(g, [[340, 240], [340, 300]]); }
      K.wire(g, [[440, 110], [440, 150]]); K.resistor(g, [440, 150], [440, 260], { label: 'R_L', value: `${p.RL} Ω`, labelSide: 'other', body: 60 }); K.wire(g, [[440, 260], [440, 300]]);
      K.infoBox(g, 530, 90, [{ t: `V_dc = ${n(c.Vdc, 4)} V`, b: true, c: C.green }, `ripple V_r = ${n(c.Vr, 3)} V p-p`, `γ = ${n(c.gamma, 3)}  f_r = ${c.fr} Hz`, p.useC ? `R_L·C = ${n(p.RL * p.C * 1e-3, 3)} ms` : 'no filter'], { w: 260 });
      // waveform
      D.chart(g, 90, 360, 860, 150, { xmin: 0, xmax: cycles, ymin: 0, ymax: p.Vm * 1.15, xticks: 6, yticks: 2, xfmt: (v) => `${n(v, 2)}T`, title: 'Rectifier output (grey) and filtered output (green)', series: [{ points: Array.from({ length: 361 }, (_, i) => { const x = (i / 360) * cycles; return [x, rectOut(x)]; }), color: '#94a3b8', width: 2 }, ...(step >= 1 ? [{ points: pts, color: C.green, width: 3.5 }] : [])], marks: [{ y: c.Vdc, color: C.red, label: `V_dc ${n(c.Vdc, 3)} V` }] });
    },
    challenge: {
      make(rand) { const target = pick(rand, [0.5, 1, 1.5, 2]); return { kind: 'filter-ripple', prompt: `Full-wave, 50 Hz, V_m = 12 V, R_L = 500 Ω: choose C so that the peak-to-peak ripple is ${target} V.`, target, unit: 'V', tolerance: target * 0.05, hint: 'V_r ≈ V_dc / (f_r C R_L) with f_r = 100 Hz → C ≈ V_dc / (100 × 500 × V_r).', setup: { rect: 'full', useC: true, C: 100, RL: 500, Vm: 12, f: 50 } }; },
      evaluate(p) { const v = p.useC ? KINDS['filter-ripple'](Object.assign({}, p, { f: Number(p.f) })) : NaN; return { value: v, text: p.useC ? `V_r = ${n(v, 4)} V` : 'No capacitor connected', calculation: `V_r = V_dc/(f_r C R_L) with C = ${p.C} µF → ${n(v, 4)} V` }; },
    },
  };

  // ───────────────────────── 33. Voltage regulator ─────────────────────────
  S['ee-regulator'] = {
    live: true,
    params: [
      { key: 'Vin', label: 'Input voltage V_in', type: 'range', min: 0, max: 30, step: 0.25, default: 12, unit: 'V' },
      { key: 'Vset', label: 'Regulated output (78xx)', type: 'select', default: 5, options: [{ value: 5, label: '5 V (7805)' }, { value: 9, label: '9 V (7809)' }, { value: 12, label: '12 V (7812)' }] },
      { key: 'RL', label: 'Load R_L', type: 'range', min: 5, max: 1000, step: 5, default: 100, unit: 'Ω' },
      { key: 'ripple', label: 'Input ripple', type: 'range', min: 0, max: 3, step: 0.1, default: 1, unit: 'V p-p' },
    ],
    compute(p) {
      const Vset = Number(p.Vset); const Vout0 = KINDS['regulator-vout'](Object.assign({}, p, { Vset })); const IL = Math.min(1, Vout0 / p.RL); const Vout = IL >= 1 ? p.RL * 1 : Vout0; const regulating = p.Vin - 2 >= Vset && Vout0 / p.RL < 1;
      const Pd = (p.Vin - Vout) * (Vout / p.RL);
      return {
        Vset, Vout, IL: Vout / p.RL, regulating, Pd,
        formulas: [F('Output', 'V_out = V_set while V_in ≥ V_set + dropout (≈ 2 V)', `V_in = ${p.Vin} V, V_set = ${Vset} V`, `${p.Vin} − ${Vset} = ${n(p.Vin - Vset, 3)} V headroom`, si(Vout, 'V'), 'V'), F('Load current and regulator dissipation', 'I_L = V_out/R_L;  P_D = (V_in − V_out)·I_L', `R_L = ${p.RL} Ω`, `(${p.Vin} − ${n(Vout)}) × ${n(Vout / p.RL, 4)}`, si(Pd, 'W'), 'W')],
        readouts: [{ label: 'V_out', value: si(Vout, 'V'), tone: regulating ? 'good' : 'bad' }, { label: 'State', value: regulating ? 'regulating' : p.Vin - 2 < Vset ? 'drop-out' : 'current limit' }, { label: 'I_L', value: si(Vout / p.RL, 'A') }, { label: 'P_D', value: si(Pd, 'W') }],
        state: { input: `${p.Vin} V (± ${p.ripple / 2} V ripple)`, regulator: `78${String(Vset).padStart(2, '0')} fixed ${Vset} V`, load: `${p.RL} Ω`, output: si(Vout, 'V'), regulating, headroom: `${n(p.Vin - Vset, 3)} V`, dissipation: si(Pd, 'W') },
        explain: { what: regulating ? `The regulator holds ${Vset} V; the extra ${n(p.Vin - Vset, 3)} V is dropped inside it (${si(Pd, 'W')} of heat).` : p.Vin - 2 < Vset ? `The input is too low (needs ≥ ${Vset + 2} V) — the output follows the input instead of staying at ${Vset} V.` : 'The load demands more than the 1 A current limit.', why: 'Inside, an error amplifier compares a fraction of the output with a reference and adjusts the series pass transistor so the output stays constant whatever the input or load does (within limits).', param: 'Input voltage, regulator type, load and input ripple.', effect: 'Line regulation: V_out constant as V_in changes; load regulation: V_out constant as the load changes — until drop-out or current limit.' },
      };
    },
    steps: () => [{ title: 'Input', text: 'Unregulated DC with ripple from the rectifier/filter.' }, { title: 'Regulator', text: 'Reference + error amplifier + pass transistor keep the output fixed.' }, { title: 'Load', text: 'Steady output voltage for the load.' }],
    draw(g, S) {
      const { p, c, step, t } = S; bg(g);
      const blk = (x, lab, sub, on) => { D.rect(g, x, 110, 170, 110, { fill: on ? '#dcfce7' : '#fff', stroke: C.ink, width: 2.5, r: 14 }); D.text(g, lab, x + 85, 150, { size: 17, weight: 900, align: 'center' }); D.text(g, sub, x + 85, 180, { size: 13, weight: 700, align: 'center', color: C.muted }); };
      blk(60, 'INPUT', `${p.Vin} V ± ${n(p.ripple / 2, 2)} V`, step === 0); blk(340, 'REGULATOR', `78${String(c.Vset).padStart(2, '0')}`, step === 1); blk(620, 'LOAD', `${p.RL} Ω`, step === 2);
      D.arrow(g, 232, 165, 336, 165, { color: C.ink, width: 4, head: 16 }); D.arrow(g, 512, 165, 616, 165, { color: c.regulating ? C.green : C.red, width: 4, head: 16 });
      D.tag(g, `V_out = ${n(c.Vout, 3)} V`, 565, 130, { bg: c.regulating ? C.green : C.red, size: 13, align: 'center' });
      K.flow(g, [[232, 200], [336, 200]], t, c.IL, { ref: 0.1 }); K.flow(g, [[512, 200], [616, 200]], t, c.IL, { ref: 0.1, color: C.green });
      // waveforms: input with ripple vs output
      const tt = t * 0.5;
      D.chart(g, 80, 280, 400, 200, { xmin: 0, xmax: 2, ymin: 0, ymax: 32, xticks: 2, yticks: 4, xfmt: () => '', title: 'Input (orange) and output (green) vs time', series: [{ points: Array.from({ length: 121 }, (_, i) => { const x = (i / 120) * 2; return [x, p.Vin + (p.ripple / 2) * Math.sin(2 * Math.PI * 3 * (x + tt))]; }), color: C.orange, width: 2.5 }, { points: Array.from({ length: 121 }, (_, i) => { const x = (i / 120) * 2; const vi = p.Vin + (p.ripple / 2) * Math.sin(2 * Math.PI * 3 * (x + tt)); return [x, Math.min(c.Vset, Math.max(0, vi - 2), p.RL)]; }), color: C.green, width: 3 }] });
      const line = Array.from({ length: 121 }, (_, i) => { const v = (i / 120) * 30; return [v, Math.min(c.Vset, Math.max(0, v - 2))]; });
      D.chart(g, 560, 280, 400, 200, { xmin: 0, xmax: 30, ymin: 0, ymax: 14, xticks: 6, yticks: 3, xlabel: 'V_in (V)', ylabel: 'V_out (V)', title: 'Line regulation', series: [{ points: line, color: C.violet, width: 3 }], marks: [{ point: [p.Vin, c.Vout], color: C.orange }, { x: c.Vset + 2, color: C.red, label: 'drop-out' }] });
    },
    challenge: {
      make() { return { kind: 'regulator-headroom', prompt: 'For the 7805 (5 V) regulator, lower the input to the minimum voltage that still gives a regulated 5 V output.', target: 2, unit: 'V headroom (V_in − V_out)', tolerance: 0.25, hint: 'A 78xx needs about 2 V more at its input than at its output.', setup: { Vset: 5, Vin: 15, RL: 100 } }; },
      evaluate(p) { const v = KINDS['regulator-headroom'](Object.assign({}, p, { Vset: Number(p.Vset) })); return { value: v, text: `V_in = ${p.Vin} V (headroom ${n(v, 3)} V)`, calculation: `V_in − V_set = ${p.Vin} − ${p.Vset} = ${n(v, 3)} V` }; },
    },
  };

  // ───────────────────────── 34. Series and shunt regulators ─────────────────────────
  S['ee-series-shunt'] = {
    live: true, conceptual: true,
    modes: [{ key: 'series', label: 'Series regulator' }, { key: 'shunt', label: 'Shunt regulator' }],
    params: [
      { key: 'Vin', label: 'Input voltage V_in', type: 'range', min: 5, max: 30, step: 0.5, default: 15, unit: 'V' },
      { key: 'Vz', label: 'Zener reference V_Z', type: 'range', min: 3.3, max: 12, step: 0.1, default: 6.2, unit: 'V' },
      { key: 'Rs', label: 'Series resistor R_s', type: 'range', min: 20, max: 1000, step: 10, default: 100, unit: 'Ω' },
      { key: 'RL', label: 'Load R_L', type: 'range', min: 20, max: 2000, step: 10, default: 200, unit: 'Ω' },
    ],
    compute(p) {
      const series = p.mode === 'series'; let Vout, IL, Ipass, Ish, P, ok;
      if (series) { Vout = Math.min(p.Vz - 0.7, p.Vin - 1); IL = Vout / p.RL; Ipass = IL; Ish = 0; P = (p.Vin - Vout) * IL; ok = p.Vin - 1 >= p.Vz - 0.7; }
      else { Vout = p.Vz + 0.7; IL = Vout / p.RL; const Is = (p.Vin - Vout) / p.Rs; Ish = Is - IL; ok = Ish > 0; if (!ok) { Vout = (p.Vin * p.RL) / (p.Rs + p.RL); IL = Vout / p.RL; Ish = 0; } Ipass = (p.Vin - Vout) / p.Rs; P = (p.Vin - Vout) * Ipass + Vout * Ish; }
      return {
        series, Vout, IL, Ipass, Ish, P, ok,
        formulas: series ? [F('Series regulator', 'V_out = V_Z − V_BE;  V_CE = V_in − V_out', `V_Z = ${p.Vz} V, V_in = ${p.Vin} V`, `${p.Vz} − 0.7`, si(Vout, 'V'), 'V'), F('Pass transistor dissipation', 'P = V_CE × I_L', '', `${n(p.Vin - Vout)} × ${n(IL, 4)}`, si(P, 'W'), 'W')] : [F('Shunt regulator', 'V_out = V_Z + V_BE;  I_sh = (V_in − V_out)/R_s − V_out/R_L', `R_s = ${p.Rs} Ω, R_L = ${p.RL} Ω`, `(${p.Vin} − ${n(Vout)})/${p.Rs} − ${n(Vout)}/${p.RL}`, `I_sh = ${si(Ish, 'A')}`, 'A')],
        readouts: [{ label: 'V_out', value: si(Vout, 'V'), tone: ok ? 'good' : 'bad' }, { label: 'I_L', value: si(IL, 'A') }, { label: series ? 'I_pass' : 'I_shunt', value: si(series ? Ipass : Ish, 'A') }, { label: 'Losses', value: si(P, 'W') }],
        state: { type: series ? 'series (pass transistor between input and load)' : 'shunt (transistor across the load, R_s in series)', output: si(Vout, 'V'), loadCurrent: si(IL, 'A'), shuntCurrent: si(Ish, 'A'), regulating: ok, losses: si(P, 'W') },
        explain: { what: series ? `The pass transistor in series drops ${n(p.Vin - Vout, 3)} V so the load sees ${n(Vout, 3)} V.` : `The shunt element across the load takes ${si(Ish, 'A')} so that R_s drops the excess voltage and the load sees ${n(Vout, 3)} V.`, why: series ? 'If the input rises, the transistor’s V_CE rises by the same amount (its base is held by the Zener), so the output stays constant.' : 'If the input rises or the load falls, the shunt element draws more current; the extra drop across R_s keeps the output constant.', param: 'Regulator type, input voltage, reference, series resistor and load.', effect: series ? 'Efficient at light load — its current is only the load current.' : 'Simple and short-circuit proof, but wastes power: the shunt current flows even with no load.' },
      };
    },
    steps: (p) => [{ title: 'Arrangement', text: p.mode === 'series' ? 'Control element (transistor) in series between input and load.' : 'Control element in parallel (shunt) with the load; R_s in series.' }, { title: 'Reference', text: 'A Zener diode provides a stable reference voltage.' }, { title: 'Operation', text: p.mode === 'series' ? 'The transistor absorbs changes in input voltage.' : 'The shunt element absorbs changes in load current.' }],
    draw(g, S) {
      const { p, c, step, t } = S; bg(g);
      K.wire(g, [[80, 230], [80, 120]]); K.wire(g, [[80, 310], [80, 440], [640, 440]]); K.cell(g, [80, 310], [80, 230], { label: 'V_in', value: `${p.Vin} V`, labelOffset: 44 });
      if (c.series) {
        K.wire(g, [[80, 120], [270, 120]]); D.rect(g, 270, 90, 110, 60, { fill: '#fef3c7', stroke: C.orange, r: 10, width: 2.5 }); D.text(g, 'Pass transistor (series)', 325, 74, { size: 13, weight: 800, align: 'center', color: C.orange }); K.wire(g, [[380, 120], [640, 120], [640, 200]]);
        K.wire(g, [[200, 120], [200, 180]]); K.resistor(g, [200, 180], [200, 260], { label: 'R', value: 'bias', labelSide: 'other', body: 50 }); K.wire(g, [[200, 260], [325, 260], [325, 150]]); K.zener(g, [325, 440], [325, 300], { label: 'V_Z', value: `${p.Vz} V`, on: true }); K.wire(g, [[325, 300], [325, 260]]);
        K.flow(g, [[80, 230], [80, 120], [640, 120], [640, 440], [80, 440], [80, 310]], t, c.IL, { ref: 0.05 });
      } else {
        K.wire(g, [[80, 120], [160, 120]]); K.resistor(g, [160, 120], [300, 120], { label: 'R_s', value: `${p.Rs} Ω` }); K.wire(g, [[300, 120], [640, 120], [640, 200]]);
        K.wire(g, [[430, 120], [430, 200]]); D.rect(g, 380, 200, 100, 120, { fill: '#fef3c7', stroke: C.orange, r: 10, width: 2.5 }); D.text(g, 'Shunt', 430, 250, { size: 14, weight: 800, align: 'center' }); D.text(g, 'Q + Zener', 430, 270, { size: 12, weight: 700, align: 'center', color: C.muted }); K.wire(g, [[430, 320], [430, 440]]);
        K.flow(g, [[80, 230], [80, 120], [430, 120]], t, c.Ipass, { ref: 0.05 }); if (c.Ish > 0) K.flow(g, [[430, 120], [430, 440]], t, c.Ish, { ref: 0.05, color: C.orange }); K.flow(g, [[430, 120], [640, 120], [640, 440], [430, 440]], t, c.IL, { ref: 0.05, color: C.blue });
        D.tag(g, `I_sh = ${si(c.Ish, 'A')}`, 440, 360, { bg: C.orange, size: 12 });
      }
      K.resistor(g, [640, 200], [640, 360], { label: 'R_L', value: `${p.RL} Ω`, labelSide: 'other' }); K.wire(g, [[640, 360], [640, 440]]);
      D.tag(g, `V_out = ${n(c.Vout, 3)} V`, 680, 280, { bg: c.ok ? C.green : C.red, size: 14 });
      K.infoBox(g, 700, 90, [{ t: c.series ? 'SERIES REGULATOR' : 'SHUNT REGULATOR', b: true, c: C.green }, `I_L = ${si(c.IL, 'A')}`, `losses = ${si(c.P, 'W')}`, c.series ? 'efficient; protect against short circuit' : 'simple; wastes power at light load'], { w: 270 });
      focusIf(g, step === 1, c.series ? 290 : 370, c.series ? 290 : 190, 80, 150, t);
    },
    challenge: {
      make(rand) { const target = pick(rand, [10, 20, 30]); return { kind: 'shunt-current-ma', prompt: `In the SHUNT regulator (V_Z = 6.2 V, so V_out = 6.9 V), choose R_s so that the shunt element carries ${target} mA with the given load.`, target, unit: 'mA', tolerance: 1, hint: 'I_sh = (V_in − V_out)/R_s − V_out/R_L', setup: { mode: 'series', Vin: 15, Vz: 6.2, Rs: 100, RL: 200 } }; },
      evaluate(p) { const v = KINDS['shunt-current-ma'](p); return { value: v, text: p.mode === 'shunt' ? `I_sh = ${n(v, 4)} mA` : 'Series regulator selected — switch to the shunt regulator', calculation: `I_sh = (${p.Vin} − ${n(p.Vz + 0.7)})/${p.Rs} − ${n(p.Vz + 0.7)}/${p.RL} = ${n(v, 4)} mA` }; },
    },
  };

  // ───────────────────────── 35. CE / CB / CC ─────────────────────────
  const CONF = {
    ce: { name: 'Common Emitter', common: 'Emitter', input: 'Base', output: 'Collector', Ri: 'medium (≈ 1 kΩ)', Ro: 'medium (≈ 10–50 kΩ)', Ai: 'β (high)', Av: 'high', phase: '180°', use: 'general-purpose amplifier' },
    cb: { name: 'Common Base', common: 'Base', input: 'Emitter', output: 'Collector', Ri: 'very low (≈ 20–50 Ω)', Ro: 'very high (≈ 1 MΩ)', Ai: 'α (< 1)', Av: 'high', phase: '0°', use: 'high-frequency / impedance matching' },
    cc: { name: 'Common Collector (emitter follower)', common: 'Collector', input: 'Base', output: 'Emitter', Ri: 'very high (≈ 100 kΩ+)', Ro: 'very low (≈ 25 Ω)', Ai: 'β + 1 (high)', Av: '≈ 1', phase: '0°', use: 'buffer / impedance matching' },
  };
  S['ee-configurations'] = {
    live: true,
    modes: [{ key: 'ce', label: 'Common Emitter (CE)' }, { key: 'cb', label: 'Common Base (CB)' }, { key: 'cc', label: 'Common Collector (CC)' }],
    params: [{ key: 'beta', label: 'Transistor β', type: 'range', min: 20, max: 300, step: 1, default: 100 }, { key: 'Iin', label: 'Input current', type: 'range', min: 1, max: 100, step: 1, default: 20, unit: 'µA (CE, CC) / ×0.1 mA (CB)' }],
    compute(p) {
      const cf = CONF[p.mode] || CONF.ce; const Ai = KINDS['config-current-gain'](p); const Iin = p.mode === 'cb' ? p.Iin * 1e-4 : p.Iin * 1e-6; const Iout = Ai * Iin;
      return {
        cf, Ai, Iin, Iout,
        formulas: [F('Current gain', p.mode === 'ce' ? 'A_i = I_C / I_B = β' : p.mode === 'cb' ? 'A_i = I_C / I_E = α = β/(β+1)' : 'A_i = I_E / I_B = β + 1', `β = ${p.beta}`, p.mode === 'cb' ? `${p.beta}/(${p.beta}+1)` : p.mode === 'cc' ? `${p.beta} + 1` : `${p.beta}`, n(Ai, 4), '—'), F('Output current', 'I_out = A_i × I_in', `I_in = ${si(Iin, 'A')}`, `${n(Ai, 4)} × ${si(Iin, 'A')}`, si(Iout, 'A'), 'A')],
        readouts: [{ label: 'Configuration', value: cf.name, tone: 'good' }, { label: 'Current gain', value: n(Ai, 4) }, { label: 'Voltage gain', value: cf.Av }, { label: 'Phase', value: cf.phase }],
        state: { configuration: cf.name, commonTerminal: cf.common, inputTerminal: cf.input, outputTerminal: cf.output, inputResistance: cf.Ri, outputResistance: cf.Ro, currentGain: n(Ai, 4), voltageGain: cf.Av, phaseShift: cf.phase, application: cf.use },
        explain: { what: `${cf.name}: input at the ${cf.input.toLowerCase()}, output at the ${cf.output.toLowerCase()}, ${cf.common.toLowerCase()} common to both. Current gain ${n(Ai, 4)}.`, why: 'The same transistor behaves differently depending on which terminal is shared: the gains and impedances follow from I_E = I_B + I_C and I_C = βI_B.', param: 'Configuration, β and the input current.', effect: 'CE: high voltage and current gain with 180° phase shift; CB: current gain < 1 but low input resistance; CC: voltage gain ≈ 1 but high input and low output resistance (buffer).' },
      };
    },
    steps: (p) => { const cf = CONF[p.mode] || CONF.ce; return [{ title: 'Common terminal', text: `The ${cf.common.toLowerCase()} is shared by input and output.` }, { title: 'Input and output', text: `Input: ${cf.input}–${cf.common}; output: ${cf.output}–${cf.common}.` }, { title: 'Current path', text: `Current gain ${cf.Ai}; voltage gain ${cf.Av}; phase ${cf.phase}.` }, { title: 'Characteristics', text: `R_in ${cf.Ri}, R_out ${cf.Ro}. Used for ${cf.use}.` }]; },
    draw(g, S) {
      const { p, c, step, t } = S; bg(g); const cf = c.cf; const mode = p.mode;
      const tx = 300, ty = 280; const T = K.bjt(g, tx, ty, {});
      const inCol = C.violet, outCol = C.red, comCol = C.green;
      const term = { b: T.b, c: T.c, e: T.e };
      const key = { ce: ['b', 'c', 'e'], cb: ['e', 'c', 'b'], cc: ['b', 'e', 'c'] }[mode];
      const [ti, to, tc] = key.map((k) => term[k]);
      // input source on the left, output load on the right, common rail at the bottom
      const railY = 470;
      K.wire(g, [ti, [ti[0] - 60 < 120 ? 120 : ti[0] - 60, ti[1]]]); const ix = 120; K.wire(g, [[ix, ti[1]], [ix, ti[1]]]);
      K.wire(g, [[ti[0], ti[1]], [ix, ti[1]], [ix, ti[1] + 40]]); K.ac(g, [ix, ti[1] + 110], [ix, ti[1] + 40], { label: 'input', labelOffset: 40, phase: t * 3, color: inCol }); K.wire(g, [[ix, ti[1] + 110], [ix, railY]]);
      const ox = 560; K.wire(g, [to, [ox, to[1]], [ox, to[1] + 30]]); K.resistor(g, [ox, to[1] + 30], [ox, Math.min(railY - 30, to[1] + 170)], { label: 'load', labelSide: 'other', color: outCol }); K.wire(g, [[ox, Math.min(railY - 30, to[1] + 170)], [ox, railY]]);
      K.wire(g, [tc, [tc[0], railY]]); D.line(g, ix, railY, ox, railY, { color: comCol, width: 5 }); K.ground(g, 340, railY);
      D.tag(g, `INPUT: ${cf.input}`, ti[0] - 10, ti[1] - 26, { bg: inCol, size: 12, align: 'right' }); D.tag(g, `OUTPUT: ${cf.output}`, to[0] + 14, to[1] - 18, { bg: outCol, size: 12 }); D.tag(g, `COMMON: ${cf.common}`, 340, railY + 44, { bg: comCol, size: 13, align: 'center' });
      if (step >= 2) { K.flow(g, [[ix, ti[1] + 40], [ix, ti[1]], ti], t, c.Iin * 1000, { ref: 0.02, color: inCol }); K.flow(g, [[ox, to[1] + 30], [ox, to[1]], to], t, -c.Iout * 1000, { ref: 0.5, color: outCol }); }
      // table
      const rows = [['Common', cf.common], ['Input / Output', `${cf.input} / ${cf.output}`], ['Input resistance', cf.Ri], ['Output resistance', cf.Ro], ['Current gain', `${cf.Ai} = ${n(c.Ai, 4)}`], ['Voltage gain', cf.Av], ['Phase shift', cf.phase], ['Use', cf.use]];
      D.rect(g, 640, 70, 340, 300, { fill: '#fff', stroke: C.line, r: 12 }); D.text(g, cf.name, 656, 94, { size: 16, weight: 900, color: C.green });
      rows.forEach((r, i) => { D.text(g, r[0], 656, 128 + i * 30, { size: 13, weight: 800, color: C.muted }); D.text(g, r[1], 800, 128 + i * 30, { size: 13, weight: 700 }); });
      // characteristic sketch
      const ch = mode === 'cc' ? { title: 'Output follows input (A_v ≈ 1)', series: [{ points: [[0, 0], [10, 9.3]], color: C.violet, width: 3 }], xl: 'v_in', yl: 'v_out' } : { title: mode === 'ce' ? 'Output: I_C vs V_CE (I_B steps)' : 'Output: I_C vs V_CB (I_E steps)', series: [1, 2, 3, 4].map((k) => ({ points: Array.from({ length: 41 }, (_, i) => { const v = i * 0.25; return [v, k * (mode === 'ce' ? 1 - Math.exp(-v / 0.4) : 1) * (1 + (mode === 'ce' ? v / 60 : 0))]; }), color: '#94a3b8', width: 2 })), xl: mode === 'ce' ? 'V_CE' : 'V_CB', yl: 'I_C' };
      D.chart(g, 690, 410, 280, 110, { xmin: 0, xmax: 10, ymin: 0, ymax: mode === 'cc' ? 10 : 4.6, xticks: 2, yticks: 2, xfmt: () => '', yfmt: false, title: ch.title, series: ch.series });
      focusIf(g, step === 0, tc[0] - 30, tc[1] - 20, 60, 40, t);
    },
    challenge: {
      make(rand) { const opts = [{ t: 101, mode: 'cc', b: 100 }, { t: 0.99, mode: 'cb', b: 99 }, { t: 150, mode: 'ce', b: 150 }]; const o = pick(rand, opts); return { kind: 'config-current-gain', prompt: `Choose the configuration and β so that the current gain is ${o.t}.`, target: o.t, unit: '', tolerance: o.t < 1 ? 0.001 : 0.5, hint: 'CE: β; CB: α = β/(β+1); CC: β + 1.', setup: { mode: 'ce', beta: 50 } }; },
      evaluate(p) { const v = KINDS['config-current-gain'](p); return { value: v, text: `${(CONF[p.mode] || CONF.ce).name}: A_i = ${n(v, 4)}`, calculation: p.mode === 'cb' ? `α = ${p.beta}/(${p.beta}+1) = ${n(v, 4)}` : p.mode === 'cc' ? `β + 1 = ${n(v, 4)}` : `β = ${p.beta}` }; },
    },
  };
})();
