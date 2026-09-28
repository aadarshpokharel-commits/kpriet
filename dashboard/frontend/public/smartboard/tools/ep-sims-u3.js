'use strict';

/* Engineering Physics — Unit 3: Ultrasonics. */
(function () {
  const S = (window.EPSims = window.EPSims || {});
  const D = window.EPDraw;
  const { C, fmt, rad, deg, clamp } = D;

  // ─── shared helpers (private) ───
  const TX = (g, s, x, y, o) => D.text(g, s, x, y, Object.assign({ size: 18, weight: 700 }, o || {}));
  const nice = (v) => { if (!(v > 0) || !Number.isFinite(v)) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))); const m = v / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e; };
  const prog = (S2) => clamp(S2.st / (S2.dur || 1), 0, 1);

  /** Chart frame with 16 px tick labels. Returns {X, Y}. */
  function plot(g, x, y, w, h, o) {
    const xmin = o.xmin ?? 0, xmax = o.xmax ?? 1, ymin = o.ymin ?? 0, ymax = o.ymax ?? 1;
    const X = (v) => x + ((v - xmin) / ((xmax - xmin) || 1)) * w;
    const Y = (v) => y + h - ((v - ymin) / ((ymax - ymin) || 1)) * h;
    D.rect(g, x, y, w, h, { fill: o.bg || '#ffffff', stroke: o.border || C.line, width: 1.5, r: 4 });
    const nt = o.xticks ?? 4;
    for (let i = 0; i <= nt; i++) {
      const v = xmin + ((xmax - xmin) * i) / nt;
      if (i > 0 && i < nt) D.line(g, X(v), y + 2, X(v), y + h - 2, { color: o.gridColor || '#eef2f7', width: 1 });
      D.line(g, X(v), y + h, X(v), y + h + 5, { color: C.faint, width: 1.5 });
      D.text(g, o.xfmt ? o.xfmt(v) : fmt(v, 3), X(v), y + h + 17, { size: 16, color: C.muted, align: 'center', weight: 600 });
    }
    if (o.xlabel) D.text(g, o.xlabel, x + w / 2, y + h + 40, { size: 16, color: C.muted, align: 'center', weight: 700 });
    if (o.title) D.text(g, o.title, x, y - 16, { size: 18, weight: 800 });
    return { X, Y };
  }
  function clipTo(g, x, y, w, h, fn) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); try { fn(); } finally { g.restore(); } }
  /** RF echo pulse: gaussian envelope × cosine. */
  const rf = (tt, t0, amp, sig, per) => amp * Math.exp(-Math.pow((tt - t0) / sig, 2)) * Math.cos((2 * Math.PI * (tt - t0)) / per);
  const bump = (tt, t0, amp, sig) => amp * Math.exp(-Math.pow((tt - t0) / sig, 2));
  function trace(g, P, xmin, xmax, fn, o = {}) {
    const pts = []; const n = o.n || 600;
    for (let i = 0; i <= n; i++) { const v = xmin + ((xmax - xmin) * i) / n; pts.push([P.X(v), P.Y(fn(v))]); }
    D.poly(g, pts, { stroke: o.color || C.green, width: o.width || 2.5 });
  }
  /** Sound wavefront arcs travelling in direction ang (radians) from (x, y). */
  function fronts(g, x, y, ang, n, gap, phase, o = {}) {
    const spr = o.spread || 0.55; const maxR = n * gap;
    for (let i = 0; i < n; i++) {
      const r = ((((i + phase) % n) + n) % n) * gap + (o.r0 || 12);
      g.save(); g.globalAlpha = clamp((o.alpha ?? 1) * (1 - r / (maxR + 40)), 0.1, 1);
      g.beginPath(); g.arc(x, y, r, ang - spr, ang + spr); g.strokeStyle = o.color || C.blue; g.lineWidth = o.width || 3; g.stroke(); g.restore();
    }
  }
  function arcDeg(g, x, y, r, a0, a1, color) { g.save(); g.beginPath(); g.arc(x, y, r, Math.min(a0, a1), Math.max(a0, a1)); g.strokeStyle = color; g.lineWidth = 2.5; g.stroke(); g.restore(); }
  /** Vertical coil (inductor) from y1 to y2 at x. */
  function coil(g, x, y1, y2, o = {}) {
    const n = o.turns || 6; const h = (y2 - y1) / n; const side = o.side || 1;
    g.save(); g.beginPath(); g.moveTo(x, y1);
    for (let i = 0; i < n; i++) g.arc(x, y1 + h * (i + 0.5), h / 2, -Math.PI / 2, Math.PI / 2, side < 0);
    g.strokeStyle = o.color || C.ink; g.lineWidth = 2.5; g.stroke(); g.restore();
  }
  /** Places labels (sorted by y) so that they are at least gap apart. */
  function spread(ys, gap, lo, hi) {
    const out = ys.slice();
    for (let i = 1; i < out.length; i++) if (out[i] - out[i - 1] < gap) out[i] = out[i - 1] + gap;
    if (out.length && out[out.length - 1] > hi) { out[out.length - 1] = hi; for (let i = out.length - 2; i >= 0; i--) if (out[i + 1] - out[i] < gap) out[i] = out[i + 1] - gap; }
    if (out.length && out[0] < lo) out[0] = lo;
    return out;
  }
  function stepTag(g, str, x, y, color, align) { return D.tag(g, str, x, y, { bg: color || C.ink, size: 18, align: align || 'center' }); }

  // ─────────────────────────────────────────────────────────────
  // 1. Piezoelectric Effect Simulator
  // ─────────────────────────────────────────────────────────────
  const EPS0 = 8.854e-12;
  const PIEZO = {
    quartz: { name: 'Quartz (SiO₂)', short: 'Quartz', d: 2.3e-12, er: 4.5 },
    bto: { name: 'Barium titanate (BaTiO₃)', short: 'BaTiO₃', d: 190e-12, er: 1700 },
    pzt5a: { name: 'PZT-5A ceramic', short: 'PZT-5A', d: 374e-12, er: 1700 },
    pzt5h: { name: 'PZT-5H ceramic', short: 'PZT-5H', d: 593e-12, er: 3400 },
  };
  const piezoV = (m, p) => (m.d * p.F) / ((EPS0 * m.er * p.A * 1e-6) / (p.t * 1e-3));

  S['ep-piezo-effect'] = {
    approx: 'Ideal parallel-plate crystal: open-circuit voltage V = Q/C with no charge leakage; typical handbook d and εᵣ values. The ion lattice is a schematic and every deformation in the picture is hugely exaggerated (real Δt is only nanometres).',
    modes: [{ key: 'direct', label: 'Direct Effect' }, { key: 'inverse', label: 'Inverse Effect' }],
    params: [
      { key: 'mat', label: 'Crystal material', type: 'select', default: 'quartz', options: [
        { value: 'quartz', label: 'Quartz — d = 2.3 pC/N, εᵣ = 4.5' }, { value: 'bto', label: 'Barium titanate — d ≈ 190 pC/N, εᵣ ≈ 1700' },
        { value: 'pzt5a', label: 'PZT-5A — d ≈ 374 pC/N, εᵣ ≈ 1700' }, { value: 'pzt5h', label: 'PZT-5H — d ≈ 593 pC/N, εᵣ ≈ 3400' }] },
      { key: 'F', label: 'Applied force F', type: 'range', min: 0, max: 200, step: 1, default: 50, unit: 'N', help: 'Force pressing on (or pulling) the electrode faces.', showIf: (p) => p.mode !== 'inverse' },
      { key: 'stress', label: 'Type of stress', type: 'select', default: 'comp', options: [{ value: 'comp', label: 'Compression (push)' }, { value: 'tens', label: 'Tension (pull)' }], showIf: (p) => p.mode !== 'inverse' },
      { key: 'V', label: 'Applied voltage V', type: 'range', min: -1000, max: 1000, step: 10, default: 500, unit: 'V', help: '+ : field along the poling direction (crystal expands); − : field opposite (crystal contracts). For AC this is the peak voltage.', showIf: (p) => p.mode === 'inverse' },
      { key: 'drive', label: 'Voltage type', type: 'select', default: 'dc', options: [{ value: 'dc', label: 'DC (steady)' }, { value: 'ac', label: 'AC (alternating)' }], showIf: (p) => p.mode === 'inverse' },
      { key: 'A', label: 'Electrode area A', type: 'range', min: 25, max: 400, step: 5, default: 100, unit: 'mm²' },
      { key: 't', label: 'Crystal thickness t', type: 'range', min: 0.5, max: 10, step: 0.1, default: 1, unit: 'mm' },
      { key: 'showCharges', label: 'Show charge centres', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Quartz disc pressed with 50 N (direct)', values: { mode: 'direct', mat: 'quartz', F: 50, stress: 'comp', A: 100, t: 1 } },
      { label: 'Gas-lighter PZT element struck with 200 N (≈ 2 kV)', values: { mode: 'direct', mat: 'pzt5a', F: 200, stress: 'comp', A: 25, t: 10 } },
      { label: 'Quartz plate with 1000 V DC (inverse, Δt = 2.3 nm)', values: { mode: 'inverse', mat: 'quartz', V: 1000, drive: 'dc', A: 100, t: 1 } },
      { label: 'PZT ultrasonic transducer, 200 V AC (inverse)', values: { mode: 'inverse', mat: 'pzt5h', V: 200, drive: 'ac', A: 315, t: 2 } },
    ],
    validate(p) {
      if (p.mode === 'inverse' && p.V === 0) return ['V = 0: no electric field, so the crystal does not deform.'];
      if (p.mode !== 'inverse' && p.F === 0) return ['F = 0: no stress, so no charge appears.'];
      return [];
    },
    compute(p) {
      const m = PIEZO[p.mat] || PIEZO.quartz; const A = p.A * 1e-6; const t = p.t * 1e-3;
      const Cap = (EPS0 * m.er * A) / t;
      const capF = { name: 'Capacitance of the crystal', formula: 'C = ε₀ εᵣ A / t', given: `ε₀ = 8.854 × 10⁻¹² F/m, εᵣ = ${m.er}, A = ${p.A} mm² = ${fmt(A, 3)} m², t = ${p.t} mm = ${fmt(t, 3)} m`, calc: `C = 8.854 × 10⁻¹² × ${m.er} × ${fmt(A, 3)} / ${fmt(t, 3)}`, result: `${fmt(Cap * 1e12, 3)} pF`, unit: 'picofarad (pF)' };
      if (p.mode === 'inverse') {
        const ac = p.drive === 'ac'; const V = p.V; const dt = m.d * V; const E = V / t; const strain = dt / t;
        const change = V > 0 ? 'expands' : V < 0 ? 'contracts' : 'does not change';
        const formulas = [
          { name: 'Electric field in the crystal', formula: 'E = V / t', given: `V = ${V} V, t = ${fmt(t, 3)} m`, calc: `E = ${V} / ${fmt(t, 3)}`, result: fmt(E, 3), unit: 'V/m' },
          { name: 'Change in thickness (inverse effect)', formula: 'Δt = d × V', given: `d = ${fmt(m.d * 1e12, 3)} pC/N = ${fmt(m.d, 3)} m/V, V = ${V} V`, calc: `Δt = ${fmt(m.d, 3)} × ${V} = ${fmt(dt, 3)} m`, result: `${fmt(dt * 1e9, 3)} nm${ac ? ' (peak)' : ''}`, unit: 'nanometre (nm)' },
          { name: 'Strain', formula: 'strain = Δt / t', given: `Δt = ${fmt(dt, 3)} m, t = ${fmt(t, 3)} m`, calc: `${fmt(dt, 3)} / ${fmt(t, 3)}`, result: fmt(strain, 3), unit: '— (ratio)' },
          capF,
        ];
        return {
          formulas,
          readouts: [
            { label: 'Applied voltage', value: `${V} V ${ac ? 'AC' : 'DC'}`, tone: 'info' },
            { label: 'Field E', value: `${fmt(E, 3)} V/m` },
            { label: 'Thickness change Δt', value: `${ac ? '±' : V > 0 ? '+' : ''}${fmt(ac ? Math.abs(dt) * 1e9 : dt * 1e9, 3)} nm`, tone: V === 0 ? 'warn' : 'good' },
            { label: 'Crystal', value: ac ? 'vibrates' : change },
          ],
          state: { mode: 'inverse', material: m.name, d_pC_per_N: m.d * 1e12, voltage_V: V, drive: ac ? 'AC' : 'DC', field_V_per_m: fmt(E, 3), deltaT_nm: fmt(dt * 1e9, 3), strain: fmt(strain, 3), crystal: ac ? 'vibrates' : change },
          explain: {
            what: V === 0 ? 'No voltage is applied, so nothing happens.' : `${ac ? 'An alternating' : 'A steady'} voltage of ${Math.abs(V)} V across the ${p.t} mm ${m.short} crystal makes a field of ${fmt(Math.abs(E), 3)} V/m. The crystal ${ac ? `vibrates with a thickness change of ±${fmt(Math.abs(dt) * 1e9, 3)} nm` : `${change} by ${fmt(Math.abs(dt) * 1e9, 3)} nm`}.`,
            why: 'The electric field pushes the positive ions one way and the negative ions the other way inside the crystal. Because the crystal has no centre of symmetry, this shift changes its dimensions (inverse or converse piezoelectric effect).',
            param: `Voltage V (sign and size), voltage type (${ac ? 'AC' : 'DC'}), material coefficient d = ${fmt(m.d * 1e12, 3)} pC/N.`,
            effect: 'Δt is proportional to V: doubling V doubles Δt, reversing V turns expansion into contraction. With AC the crystal expands and contracts at the supply frequency — this is how ultrasonic transducers make sound.',
          },
        };
      }
      const s = p.stress === 'tens' ? -1 : 1;
      const Q = m.d * p.F; const V = Q / Cap; const sigma = p.F / A;
      const Vfs = (m.d * 200) / Cap;
      const top = p.F === 0 ? '0' : s > 0 ? '+' : '−'; const bot = p.F === 0 ? '0' : s > 0 ? '−' : '+';
      const formulas = [
        { name: 'Mechanical stress', formula: 'σ = F / A', given: `F = ${p.F} N, A = ${fmt(A, 3)} m²`, calc: `σ = ${p.F} / ${fmt(A, 3)}`, result: fmt(sigma, 3), unit: 'N/m² (Pa)' },
        { name: 'Charge produced (direct effect)', formula: 'Q = d × F', given: `d = ${fmt(m.d * 1e12, 3)} pC/N, F = ${p.F} N`, calc: `Q = ${fmt(m.d * 1e12, 3)} × ${p.F} pC`, result: `${fmt(Q * 1e12, 3)} pC`, unit: 'picocoulomb (pC)' },
        capF,
        { name: 'Voltage across the faces', formula: 'V = Q / C', given: `Q = ${fmt(Q, 3)} C, C = ${fmt(Cap, 3)} F`, calc: `V = ${fmt(Q, 3)} / ${fmt(Cap, 3)}`, result: `${fmt(V, 3)} V (top face ${top === '0' ? 'neutral' : top})`, unit: 'volt (V)' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Force', value: `${p.F} N ${s > 0 ? 'push' : 'pull'}`, tone: 'info' },
          { label: 'Charge Q', value: `${fmt(Q * 1e12, 3)} pC` },
          { label: 'Voltage V', value: `${fmt(V, 3)} V`, tone: p.F ? 'good' : 'warn' },
          { label: 'Top face', value: top === '0' ? 'neutral' : `${top} (bottom ${bot})` },
        ],
        state: { mode: 'direct', material: m.name, d_pC_per_N: m.d * 1e12, force_N: p.F, stress: s > 0 ? 'compression' : 'tension', charge_pC: fmt(Q * 1e12, 3), capacitance_pF: fmt(Cap * 1e12, 3), voltage_V: fmt(V, 3), topFace: top, bottomFace: bot, fullScale_V: Vfs },
        explain: {
          what: p.F === 0 ? 'No force acts on the crystal, so the charge centres coincide and no voltage appears.' : `A ${s > 0 ? 'compressive' : 'tensile'} force of ${p.F} N on the ${m.short} crystal produces Q = ${fmt(Q * 1e12, 3)} pC on its faces; the crystal (C = ${fmt(Cap * 1e12, 3)} pF) then shows ${fmt(V, 3)} V, top face ${top}.`,
          why: 'Stress distorts the ion lattice. In a crystal without a centre of symmetry the centres of positive and negative charge no longer coincide, so each cell becomes a small dipole and bound charges appear on the opposite faces.',
          param: `Force F, compression or tension, material (d = ${fmt(m.d * 1e12, 3)} pC/N), area A and thickness t.`,
          effect: 'Q grows linearly with F. V = Q/C, so a thicker crystal or a smaller area (smaller C) gives a larger voltage. Changing compression to tension reverses the polarity of the voltage.',
        },
      };
    },
    steps(p, c) {
      const st = c.state;
      if (p.mode === 'inverse') {
        return [
          { title: 'Crystal between two electrodes', text: `A ${p.t} mm ${st.material} plate sits between metal electrodes. With no voltage the charge centres coincide.` },
          { title: 'Apply a voltage', text: `V = ${p.V} V (${st.drive}) sets up a field E = V/t = ${st.field_V_per_m} V/m inside the crystal.` },
          { title: 'Ions are pushed by the field', text: 'Positive ions move towards the negative electrode and negative ions towards the positive one — the charge centres separate.' },
          { title: 'The thickness changes', text: `Δt = d × V = ${st.deltaT_nm} nm: the crystal ${st.drive === 'AC' ? 'changes thickness back and forth' : st.crystal}. (The picture exaggerates this.)` },
          { title: st.drive === 'AC' ? 'AC voltage → vibration → ultrasound' : 'Reversing the voltage reverses the change', text: st.drive === 'AC' ? 'The crystal expands and contracts at the supply frequency and sends sound waves into the surroundings. At MHz frequencies this is ultrasound.' : 'A negative voltage contracts the crystal. Switching the supply to AC makes it vibrate — the basis of ultrasonic generators.' },
        ];
      }
      return [
        { title: 'Crystal with no stress', text: `A ${st.material} crystal between two electrodes. The centres of + and − charge coincide, so the voltmeter reads 0 V.` },
        { title: `Apply a ${st.stress} force`, text: `F = ${p.F} N acts on the faces (stress σ = F/A).` },
        { title: 'Charge centres separate', text: 'The lattice distorts; + and − charge centres shift apart and every cell becomes a tiny dipole.' },
        { title: 'Charges appear on the faces', text: `Q = d × F = ${st.charge_pC} pC. Top face ${st.topFace}, bottom face ${st.bottomFace}.` },
        { title: 'Voltage across the crystal', text: `V = Q/C = ${st.charge_pC} pC / ${st.capacitance_pF} pF = ${st.voltage_V} V.` },
        { title: 'Reverse the stress → reverse the polarity', text: 'Compression gives one polarity, tension gives the opposite polarity. An alternating force gives an alternating voltage (microphones, pressure sensors, gas lighters).' },
      ];
    },
    draw(g, S2) {
      const { p, c, step, t } = S2; const pr = prog(S2); const inv = p.mode === 'inverse';
      const m = PIEZO[p.mat] || PIEZO.quartz;
      D.clear(g, '#ffffff');
      TX(g, inv ? 'Inverse piezoelectric effect: voltage → strain' : 'Direct piezoelectric effect: stress → voltage', 20, 28, { size: 22, weight: 800 });
      const cx = 480; const W0 = 300; const H0 = 170; const yMid = 235;
      let frac = 0; let sgn = 1;
      if (!inv) { frac = p.F / 200; sgn = p.stress === 'tens' ? -1 : 1; }
      else { frac = Math.abs(p.V) / 1000; sgn = p.V >= 0 ? 1 : -1; }
      let k = 0;
      if (!inv) k = step === 0 ? 0 : step === 1 ? pr : 1;
      else k = step < 2 ? 0 : step === 2 ? pr : 1;
      const ac = inv && p.drive === 'ac';
      const osc = ac && step >= 3 ? Math.sin(t * 6) : 1;
      let hgt = H0;
      if (!inv) hgt = H0 - sgn * 26 * frac * k;
      else if (step >= 3) hgt = H0 + sgn * 28 * frac * (step === 3 ? pr : 1) * osc;
      const top = yMid - hgt / 2; const bot = yMid + hgt / 2; const x0 = cx - W0 / 2; const x1 = cx + W0 / 2;
      // crystal & electrodes
      D.rect(g, x0, top, W0, hgt, { fill: '#ede9fe', stroke: C.violet, width: 2.5 });
      D.rect(g, x0 - 10, top - 14, W0 + 20, 14, { fill: C.metal, stroke: C.muted, width: 1.5 });
      D.rect(g, x0 - 10, bot, W0 + 20, 14, { fill: C.metal, stroke: C.muted, width: 1.5 });
      // lattice cells (schematic)
      const dip = 9 * Math.sqrt(frac) * k * (inv ? -sgn * osc : sgn);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const hx = cx + (i - 1) * 95; const hy = yMid + (j - 0.5) * hgt * 0.5; const R = 27; const sy = hgt / H0;
        const ions = [];
        for (let q = 0; q < 6; q++) {
          const a = -Math.PI / 2 + (q * Math.PI) / 3; const plus = q % 2 === 0;
          ions.push([hx + R * Math.cos(a), hy + R * Math.sin(a) * sy + (plus ? -dip : dip), plus]);
        }
        D.poly(g, ions.map((o) => [o[0], o[1]]), { close: true, stroke: '#a78bfa', width: 1.5 });
        ions.forEach(([ix, iy, plus]) => { D.circle(g, ix, iy, 9, { fill: plus ? '#fca5a5' : '#93c5fd', stroke: plus ? C.red : C.blue, width: 1.5 }); TX(g, plus ? '+' : '−', ix, iy, { size: 16, weight: 800, align: 'center', color: plus ? '#7f1d1d' : '#1e3a8a' }); });
        if (p.showCharges) {
          const pc = [hx, hy - dip]; const nc = [hx, hy + dip];
          D.line(g, pc[0] - 6, pc[1], pc[0] + 6, pc[1], { color: C.red, width: 3 }); D.line(g, pc[0], pc[1] - 6, pc[0], pc[1] + 6, { color: C.red, width: 3 });
          D.circle(g, nc[0], nc[1], 5, { stroke: C.blue, width: 3 });
        }
      }
      if (p.showCharges) TX(g, '✚ = + centre   ◯ = − centre', 20, 245 + (inv ? 0 : 0), { size: 16, color: C.muted, weight: 700 });
      TX(g, m.short, x1 - 8, top + 18, { size: 16, align: 'right', color: C.violet, weight: 800, halo: true });
      if (step === 2) D.focus(g, x0 + 8, top + 8, W0 - 16, hgt - 16, t);

      // left info panel
      const info = inv
        ? [`Material: ${m.short}`, `d = ${fmt(m.d * 1e12, 3)} pC/N`, `t = ${p.t} mm`, `V = ${p.V} V ${ac ? 'AC' : 'DC'}`]
        : [`Material: ${m.short}`, `d = ${fmt(m.d * 1e12, 3)} pC/N`, `εᵣ = ${m.er}`, `A = ${p.A} mm², t = ${p.t} mm`];
      info.forEach((s2, i) => TX(g, s2, 20, 80 + i * 30, { size: 17, color: i === 0 ? C.violet : C.ink }));

      if (!inv) {
        if (step >= 1 && p.F > 0) {
          const L = 30 + 30 * frac; const a = step === 1 ? pr : 1;
          [cx - 90, cx + 90].forEach((axx) => {
            if (sgn > 0) { D.arrow(g, axx, top - 18 - L - 8, axx, top - 18 - (1 - a) * 10, { color: C.orange, width: 5, head: 16 }); D.arrow(g, axx, bot + 18 + L + 8, axx, bot + 18 + (1 - a) * 10, { color: C.orange, width: 5, head: 16 }); }
            else { D.arrow(g, axx, top - 18, axx, top - 18 - L * a - 8, { color: C.orange, width: 5, head: 16 }); D.arrow(g, axx, bot + 18, axx, bot + 18 + L * a + 8, { color: C.orange, width: 5, head: 16 }); }
          });
          TX(g, `F = ${p.F} N`, cx, top - 40, { size: 18, color: C.orange, align: 'center', weight: 800, halo: true });
          TX(g, `F = ${p.F} N`, cx, bot + 42, { size: 18, color: C.orange, align: 'center', weight: 800, halo: true });
          if (step === 1) D.focus(g, cx - 120, top - 90, 240, 80, t);
        }
        if (step >= 3 && p.F > 0) {
          const ts = sgn > 0 ? '+' : '−'; const bs = sgn > 0 ? '−' : '+';
          for (let i = 0; i < 7; i++) {
            const x = x0 + 22 + i * 43;
            TX(g, ts, x, top + 11, { size: 20, weight: 900, align: 'center', color: ts === '+' ? C.red : C.blue });
            TX(g, bs, x, bot - 11, { size: 20, weight: 900, align: 'center', color: bs === '+' ? C.red : C.blue });
          }
          if (step === 3) D.focus(g, x0 - 12, top - 16, W0 + 24, hgt + 32, t);
        }
        // centre-zero voltmeter
        const mx = 860, my = 235, mr = 88;
        D.poly(g, [[x1 + 10, top - 7], [720, top - 7], [720, my - 25], [mx - mr + 2, my - 25]], { width: 2.5 });
        D.poly(g, [[x1 + 10, bot + 7], [700, bot + 7], [700, my + 25], [mx - mr + 2, my + 25]], { width: 2.5 });
        D.circle(g, mx, my, mr, { fill: '#f8fafc', stroke: C.ink, width: 3 });
        for (let i = -4; i <= 4; i++) { const a = -Math.PI / 2 + rad(i * 14); D.line(g, mx + (mr - 14) * Math.cos(a), my + (mr - 14) * Math.sin(a), mx + (mr - 4) * Math.cos(a), my + (mr - 4) * Math.sin(a), { color: C.muted, width: i === 0 ? 3 : 1.5 }); }
        TX(g, '−', mx - 58, my - 40, { size: 20, color: C.blue, align: 'center' }); TX(g, '+', mx + 58, my - 40, { size: 20, color: C.red, align: 'center' }); TX(g, '0', mx, my - 58, { size: 16, align: 'center', color: C.muted });
        const Vfs = nice(Math.abs(c.state.fullScale_V) || 1);
        const vReal = sgn * piezoV(m, p);
        const ang = -Math.PI / 2 + rad(56 * clamp((step >= 4 ? vReal * (step === 4 ? pr : 1) : 0) / (Vfs || 1), -1, 1));
        D.line(g, mx, my + 10, mx + (mr - 18) * Math.cos(ang), my + 10 + (mr - 18) * Math.sin(ang), { color: C.red, width: 4 });
        D.circle(g, mx, my + 10, 7, { fill: C.ink });
        TX(g, 'V', mx, my + 45, { size: 22, weight: 800, align: 'center' });
        TX(g, `Voltmeter, scale ±${fmt(Vfs, 3)} V`, mx, my + mr + 20, { size: 16, align: 'center', color: C.muted });
        if (step >= 4) { stepTag(g, `reads ${fmt(Math.abs(vReal) * (step === 4 ? pr : 1), 3)} V`, mx, my + mr + 52, p.F ? C.green : C.muted); if (step === 4) D.focus(g, mx - mr, my - mr, mr * 2, mr * 2, t); }
        if (step >= 3) stepTag(g, `Q = d·F = ${c.state.charge_pC} pC`, 980, 470, C.violet, 'right');
        if (step >= 4) stepTag(g, `V = Q/C = ${c.state.voltage_V} V`, 980, 515, C.green, 'right');
        if (step >= 5) {
          TX(g, 'Polarity depends on the stress', 20, 390, { size: 17, weight: 800 });
          [['Compression', '+', '−', 30], ['Tension', '−', '+', 165]].forEach(([lab, a, b, x]) => {
            const cur = (lab === 'Compression') === (sgn > 0);
            D.rect(g, x, 440, 110, 55, { fill: '#ede9fe', stroke: cur ? C.hi : C.violet, width: cur ? 4 : 2 });
            TX(g, `${a} ${a} ${a}`, x + 55, 452, { size: 18, align: 'center', color: a === '+' ? C.red : C.blue, weight: 900 });
            TX(g, `${b} ${b} ${b}`, x + 55, 483, { size: 18, align: 'center', color: b === '+' ? C.red : C.blue, weight: 900 });
            TX(g, lab, x + 55, 520, { size: 16, align: 'center', color: C.muted });
            if (lab === 'Compression') D.arrow(g, x + 55, 412, x + 55, 436, { color: C.orange, width: 3, head: 10 });
            else D.arrow(g, x + 55, 436, x + 55, 412, { color: C.orange, width: 3, head: 10 });
          });
        }
        return;
      }
      // ─ inverse: source ─
      const sx = 860, sy = 235;
      D.poly(g, [[x1 + 10, top - 7], [720, top - 7], [720, sy - 70], [sx, sy - 70], [sx, sy - 42]], { width: 2.5 });
      D.poly(g, [[x1 + 10, bot + 7], [720, bot + 7], [720, sy + 70], [sx, sy + 70], [sx, sy + 42]], { width: 2.5 });
      D.circle(g, sx, sy, 42, { fill: '#fff', stroke: C.ink, width: 3 });
      if (ac) D.wave(g, sx - 24, sy, sx + 24, sy, { amp: 10, wavelength: 48, color: C.ink, width: 3 });
      else { D.line(g, sx - 22, sy - 8, sx + 22, sy - 8, { color: C.ink, width: 4 }); D.line(g, sx - 12, sy + 8, sx + 12, sy + 8, { color: C.ink, width: 4 }); }
      TX(g, ac ? 'AC source' : 'DC supply', sx, sy + 95, { size: 17, align: 'center' });
      TX(g, `${ac ? '±' : ''}${Math.abs(p.V)} V`, sx, sy + 120, { size: 20, weight: 800, align: 'center', color: C.blue });
      if (step >= 1 && p.V !== 0) {
        const topPlus = ac ? Math.sin(t * 6) >= 0 : p.V > 0;
        for (let i = 0; i < 7; i++) {
          const x = x0 + 22 + i * 43;
          TX(g, topPlus ? '+' : '−', x, top - 26, { size: 20, weight: 900, align: 'center', color: topPlus ? C.red : C.blue });
          TX(g, topPlus ? '−' : '+', x, bot + 28, { size: 20, weight: 900, align: 'center', color: topPlus ? C.blue : C.red });
        }
        [x0 - 30, x1 + 30].forEach((axx) => { if (topPlus) D.arrow(g, axx, top + 20, axx, bot - 20, { color: C.amber, width: 3 }); else D.arrow(g, axx, bot - 20, axx, top + 20, { color: C.amber, width: 3 }); });
        TX(g, 'E', x0 - 50, yMid, { size: 20, weight: 800, color: C.amber, align: 'center' });
        if (step === 1) D.focus(g, x0 - 60, top - 40, W0 + 120, hgt + 80, t);
      }
      if (step >= 3) {
        const lx = x0 - 70;
        D.line(g, lx - 12, yMid - H0 / 2, x0 - 12, yMid - H0 / 2, { color: C.muted, width: 2, dash: [4, 4] }); D.line(g, lx - 12, yMid + H0 / 2, x0 - 12, yMid + H0 / 2, { color: C.muted, width: 2, dash: [4, 4] });
        TX(g, 'original', lx - 16, yMid - H0 / 2, { size: 16, align: 'right', color: C.muted });
        stepTag(g, `Δt = d·V = ${ac ? '±' : ''}${ac ? fmt(Math.abs(Number(p.V) * m.d) * 1e9, 3) : c.state.deltaT_nm} nm`, 980, 470, C.green, 'right');
        TX(g, 'deformation drawn ~10⁶–10⁸× larger', 980, 515, { size: 16, align: 'right', color: C.muted });
        if (step === 3) D.focus(g, x0 - 12, top - 16, W0 + 24, hgt + 32, t);
      }
      if (step >= 4) {
        if (ac && p.V !== 0) {
          fronts(g, x0 + 40, top - 30, -Math.PI / 2, 3, 18, (t * 1.5) % 3, { color: C.blue, spread: 0.6, r0: 4 });
          TX(g, 'Ultrasonic waves', 20, 420, { size: 18, weight: 800, color: C.blue });
          TX(g, 'The crystal vibrates at the AC', 20, 452, { size: 17 });
          TX(g, 'frequency and radiates sound.', 20, 478, { size: 17 });
        } else {
          TX(g, 'DC → a steady change only.', 20, 420, { size: 18, weight: 800, color: C.amber });
          TX(g, 'Use AC to make the crystal', 20, 452, { size: 17 });
          TX(g, 'vibrate and emit ultrasound.', 20, 478, { size: 17 });
        }
      }
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 2. Piezoelectric Generator Simulator
  // ─────────────────────────────────────────────────────────────
  const QZ = { Y: 7.9e10, rho: 2650 };
  const QMECH = 25; // display quality factor of the resonance curve
  const TOL = 0.02;
  function genCalc(p) {
    const v = Math.sqrt(QZ.Y / QZ.rho); const t = p.t * 1e-3; const P = Number(p.p) || 1;
    const fc = (P / (2 * t)) * v; const L = p.L * 1e-6; const Cc = p.C * 1e-12;
    const ft = 1 / (2 * Math.PI * Math.sqrt(L * Cc));
    const r = ft / fc; const amp = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / QMECH, 2)) / QMECH;
    const Cres = 1 / (Math.pow(2 * Math.PI * fc, 2) * L);
    return { v, fc, ft, r, amp: clamp(amp, 0, 1), Cres, match: Math.abs(ft - fc) / fc <= TOL, P };
  }
  const fHz = (f) => (f >= 1e6 ? `${fmt(f / 1e6, 4)} MHz` : `${fmt(f / 1e3, 4)} kHz`);

  S['ep-piezo-generator'] = {
    approx: `Crystal natural frequency from the thickness-mode formula f = (p/2t)√(Y/ρ) with quartz Y = 7.9 × 10¹⁰ N/m², ρ = 2650 kg/m³. The resonance curve uses a display quality factor Q = ${QMECH} (real quartz is far sharper); "resonance" means the tank frequency is within ±${TOL * 100} % of the crystal frequency.`,
    params: [
      { key: 't', label: 'Crystal thickness t', type: 'range', min: 0.5, max: 10, step: 0.05, default: 2, unit: 'mm' },
      { key: 'p', label: 'Mode of vibration p', type: 'select', default: '1', options: [{ value: '1', label: 'Fundamental (p = 1)' }, { value: '3', label: '3rd overtone (p = 3)' }, { value: '5', label: '5th overtone (p = 5)' }] },
      { key: 'L', label: 'Tank inductance L₁', type: 'range', min: 1, max: 100, step: 1, default: 20, unit: 'µH' },
      { key: 'C', label: 'Variable capacitor C₁', type: 'range', min: 10, max: 1000, step: 1, default: 680, unit: 'pF', help: 'Turn the variable capacitor to tune the oscillator.' },
    ],
    examples: [
      { label: '2 mm quartz plate, tuned (≈ 1.37 MHz)', values: { t: 2, p: '1', L: 20, C: 680 } },
      { label: '1 mm quartz plate, tuned (≈ 2.73 MHz)', values: { t: 1, p: '1', L: 10, C: 340 } },
      { label: '2 mm plate, detuned (C = 400 pF)', values: { t: 2, p: '1', L: 20, C: 400 } },
      { label: '3 mm plate, 3rd overtone (≈ 2.73 MHz)', values: { t: 3, p: '3', L: 10, C: 340 } },
    ],
    validate(p) {
      const k = genCalc(p);
      if (k.Cres * 1e12 < 10 || k.Cres * 1e12 > 1000) return [`With L₁ = ${p.L} µH the capacitor would need ${fmt(k.Cres * 1e12, 3)} pF for resonance, outside the 10–1000 pF range — change L₁.`];
      return [];
    },
    compute(p) {
      const k = genCalc(p); const lamW = 1480 / k.ft;
      const formulas = [
        { name: 'Frequency of the tank (oscillator) circuit', formula: 'f = 1 / (2π√(L₁C₁))', given: `L₁ = ${p.L} µH, C₁ = ${p.C} pF`, calc: `f = 1 / (2π√(${fmt(p.L * 1e-6, 3)} × ${fmt(p.C * 1e-12, 3)}))`, result: fHz(k.ft), unit: 'hertz (Hz)' },
        { name: 'Natural frequency of the quartz plate', formula: 'f = (p / 2t) √(Y / ρ)', given: `p = ${k.P}, t = ${p.t} mm, Y = 7.9 × 10¹⁰ N/m², ρ = 2650 kg/m³`, calc: `√(Y/ρ) = ${fmt(k.v, 4)} m/s; f = ${k.P} × ${fmt(k.v, 4)} / (2 × ${fmt(p.t * 1e-3, 3)})`, result: fHz(k.fc), unit: 'hertz (Hz)' },
        { name: 'Resonance condition', formula: 'f(tank) = f(crystal)', given: `${fHz(k.ft)} vs ${fHz(k.fc)}`, calc: `difference = ${fmt(((k.ft - k.fc) / k.fc) * 100, 3)} % (tolerance ±${TOL * 100} %)`, result: k.match ? 'Resonance: YES' : 'Resonance: NO', unit: '—' },
        { name: 'Capacitance needed for resonance', formula: 'C₁ = 1 / (4π² f² L₁)', given: `f = ${fHz(k.fc)}, L₁ = ${p.L} µH`, calc: `C₁ = 1 / (4π² × (${fmt(k.fc, 4)})² × ${fmt(p.L * 1e-6, 3)})`, result: `${fmt(k.Cres * 1e12, 4)} pF`, unit: 'picofarad (pF)' },
        { name: 'Wavelength of the ultrasound in water', formula: 'λ = v / f', given: `v(water) ≈ 1480 m/s, f = ${fHz(k.ft)}`, calc: `λ = 1480 / ${fmt(k.ft, 4)}`, result: `${fmt(lamW * 1e3, 3)} mm`, unit: 'millimetre (mm)' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Tank frequency', value: fHz(k.ft), tone: 'info' },
          { label: 'Crystal frequency', value: fHz(k.fc) },
          { label: 'Relative amplitude', value: `${fmt(k.amp * 100, 3)} %` },
          { label: 'Resonance', value: k.match ? 'YES' : 'NO', tone: k.match ? 'good' : 'bad' },
        ],
        state: { tankFrequency: fHz(k.ft), crystalFrequency: fHz(k.fc), resonance: k.match ? 'YES' : 'NO', capacitanceForResonance_pF: fmt(k.Cres * 1e12, 4), amplitudePercent: fmt(k.amp * 100, 3), thickness_mm: p.t, overtone: k.P, L_uH: p.L, C_pF: p.C, waveVelocityInQuartz: `${fmt(k.v, 4)} m/s` },
        explain: {
          what: k.match ? `The oscillator runs at ${fHz(k.ft)}, matching the natural frequency ${fHz(k.fc)} of the ${p.t} mm quartz plate, so the crystal resonates and emits strong ultrasonic waves.` : `The oscillator runs at ${fHz(k.ft)} but the crystal's natural frequency is ${fHz(k.fc)}, so the crystal vibrates only weakly (${fmt(k.amp * 100, 3)} % of the resonant amplitude). Set C₁ ≈ ${fmt(k.Cres * 1e12, 4)} pF to reach resonance.`,
          why: 'The alternating voltage from the secondary coil L₂ is applied to plates A and B. By the inverse piezoelectric effect the quartz expands and contracts. The response is largest when the driving frequency equals the crystal\'s own mechanical resonance frequency.',
          param: 'Crystal thickness t, overtone p, tank inductance L₁ and variable capacitor C₁.',
          effect: 'A thinner crystal has a higher natural frequency (f ∝ 1/t). Increasing C₁ or L₁ lowers the oscillator frequency. Resonance needs both to be equal.',
        },
      };
    },
    steps(p, c) {
      const s = c.state;
      return [
        { title: 'Oscillator and tank circuit', text: `The transistor oscillator keeps the tank circuit L₁C₁ oscillating at f = 1/(2π√(L₁C₁)) = ${s.tankFrequency}.` },
        { title: 'Voltage applied to the crystal', text: 'The secondary coil L₂ picks up this oscillation and applies an alternating voltage to plates A and B on the quartz crystal.' },
        { title: 'Natural frequency of the crystal', text: `For a ${p.t} mm plate (p = ${s.overtone}) f = (p/2t)√(Y/ρ) = ${s.crystalFrequency}.` },
        { title: 'Tune the variable capacitor', text: `Resonance needs C₁ ≈ ${s.capacitanceForResonance_pF} pF. Now C₁ = ${p.C} pF → Resonance: ${s.resonance}.` },
        { title: s.resonance === 'YES' ? 'Resonance → strong ultrasonic waves' : 'Off resonance → weak vibration', text: s.resonance === 'YES' ? 'The crystal vibrates with maximum amplitude and sends intense ultrasonic waves into the medium.' : `The crystal vibrates at only ${s.amplitudePercent} % of the resonant amplitude. Adjust C₁ until the frequencies match.` },
        { title: 'Advantages and limitations', text: 'Advantages: frequencies up to about 500 MHz, very stable output, compact. Limitations: quartz is costly and hard to cut and shape; high frequencies need very thin, fragile plates.' },
      ];
    },
    draw(g, S2) {
      const { p, c, step, t } = S2; const pr = prog(S2); const k = genCalc(p);
      D.clear(g, '#ffffff');
      TX(g, 'Piezoelectric ultrasonic generator', 20, 28, { size: 22, weight: 800 });
      D.rect(g, 30, 110, 150, 150, { fill: '#f1f5f9', stroke: C.ink, width: 2.5, r: 8 });
      TX(g, 'Transistor', 105, 160, { size: 18, align: 'center' }); TX(g, 'oscillator', 105, 185, { size: 18, align: 'center' }); TX(g, '+ battery', 105, 215, { size: 16, align: 'center', color: C.muted });
      D.line(g, 180, 125, 300, 125, { width: 2.5 }); D.line(g, 180, 255, 300, 255, { width: 2.5 });
      D.line(g, 225, 125, 225, 182, { width: 2.5 }); D.line(g, 225, 198, 225, 255, { width: 2.5 });
      D.line(g, 203, 182, 247, 182, { width: 4 }); D.line(g, 203, 198, 247, 198, { width: 4 });
      D.arrow(g, 205, 215, 247, 165, { width: 2, head: 9, color: C.blue });
      coil(g, 300, 145, 235, { turns: 5 }); D.line(g, 300, 125, 300, 145, { width: 2.5 }); D.line(g, 300, 235, 300, 255, { width: 2.5 });
      D.line(g, 322, 140, 322, 240, { color: C.muted, width: 2 }); D.line(g, 328, 140, 328, 240, { color: C.muted, width: 2 });
      coil(g, 350, 145, 235, { turns: 5, side: -1 });
      TX(g, 'Tank circuit', 250, 92, { size: 17, align: 'center', color: C.blue });
      TX(g, `C₁ = ${p.C} pF`, 190, 285, { size: 17, color: C.blue });
      TX(g, `L₁ = ${p.L} µH`, 190, 312, { size: 17, color: C.blue });
      TX(g, 'L₂', 372, 190, { size: 17, color: C.muted });
      if (step === 0) D.focus(g, 190, 110, 150, 160, t);
      const xa = 467, xb = 553;
      D.poly(g, [[350, 145], [350, 100], [xa, 100], [xa, 110]], { width: 2.5 });
      D.poly(g, [[350, 235], [350, 285], [xb, 285], [xb, 270]], { width: 2.5 });
      const vib = step >= 1 ? (step === 1 ? pr : 1) * (0.25 + 0.75 * k.amp) : 0;
      const dw = 6 * vib * Math.sin(t * 14);
      D.rect(g, 472 - dw, 110, 76 + 2 * dw, 160, { fill: '#ede9fe', stroke: C.violet, width: 2.5 });
      D.rect(g, xa - 5 - dw, 110, 10, 160, { fill: C.metal, stroke: C.muted, width: 1.5 });
      D.rect(g, xb - 5 + dw, 110, 10, 160, { fill: C.metal, stroke: C.muted, width: 1.5 });
      TX(g, 'Quartz', 510, 180, { size: 17, align: 'center', color: C.violet, weight: 800 });
      TX(g, 'A', 450, 128, { size: 18, align: 'right', weight: 800 }); TX(g, 'B', 570, 128, { size: 18, weight: 800 });
      D.arrow(g, 505, 318, 472, 318, { width: 2, head: 9, color: C.muted }); D.arrow(g, 515, 318, 548, 318, { width: 2, head: 9, color: C.muted });
      TX(g, `t = ${p.t} mm`, 510, 340, { size: 17, align: 'center', color: C.muted });
      if (step === 1 || step === 2) D.focus(g, 440, 104, 140, 172, t);
      if (step >= 1) {
        const A0 = step >= 4 ? k.amp : 0.25 * k.amp; const sp = 34;
        clipTo(g, 575, 90, 405, 200, () => {
          for (let i = 0; i < 13; i++) {
            const x = 580 + ((i * sp + t * 60) % (13 * sp));
            D.line(g, x, 110, x, 270, { color: C.blue, width: 1.5 + 4 * A0, alpha: clamp((0.15 + 0.85 * A0) * (1 - (x - 580) / 460), 0.05, 1) });
          }
        });
        TX(g, step >= 4 ? (k.match ? 'Strong ultrasonic waves →' : 'Weak waves (off resonance) →') : 'Ultrasonic waves →', 780, 80, { size: 18, align: 'center', color: C.blue, weight: 800 });
        if (step === 4) D.focus(g, 580, 100, 390, 180, t);
      }
      TX(g, `f(tank) = 1/(2π√(L₁C₁)) = ${c.state.tankFrequency}`, 20, 385, { size: 18, color: C.blue });
      if (step >= 2) TX(g, `f(crystal) = (p/2t)√(Y/ρ) = ${c.state.crystalFrequency}`, 20, 420, { size: 18, color: C.violet });
      if (step >= 3) { stepTag(g, `Resonance: ${c.state.resonance}`, 20, 465, k.match ? C.green : C.red, 'left'); if (!k.match) TX(g, `Set C₁ ≈ ${c.state.capacitanceForResonance_pF} pF`, 20, 505, { size: 17, color: C.red }); }
      if (step >= 5) {
        D.rect(g, 540, 360, 440, 185, { fill: '#f8fafc', stroke: C.line, r: 10 });
        TX(g, 'Advantages', 555, 382, { size: 18, weight: 800, color: C.green });
        TX(g, '✓ up to ≈ 500 MHz   ✓ stable frequency', 555, 410, { size: 17 });
        TX(g, '✓ compact, efficient', 555, 436, { size: 17 });
        TX(g, 'Limitations', 555, 470, { size: 18, weight: 800, color: C.red });
        TX(g, '✗ quartz is costly, hard to cut/shape', 555, 498, { size: 17 });
        TX(g, '✗ very thin plates break easily', 555, 524, { size: 17 });
        return;
      }
      if (step >= 3) {
        const x = 560, y = 390, w = 410, h = 95; const lo = k.fc * 0.6, hi = k.fc * 1.4;
        const P = plot(g, x, y, w, h, { xmin: lo / 1e6, xmax: hi / 1e6, ymin: 0, ymax: 1.1, xticks: 4, xfmt: (v) => fmt(v, 3), xlabel: 'frequency (MHz)', title: 'Crystal amplitude vs frequency' });
        clipTo(g, x, y, w, h, () => trace(g, P, lo / 1e6, hi / 1e6, (fm) => { const r = (fm * 1e6) / k.fc; return 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / QMECH, 2)) / QMECH; }, { color: C.violet, n: 300 }));
        D.line(g, P.X(k.fc / 1e6), y, P.X(k.fc / 1e6), y + h, { color: C.violet, width: 2, dash: [6, 5] });
        if (k.ft >= lo && k.ft <= hi) { D.line(g, P.X(k.ft / 1e6), y, P.X(k.ft / 1e6), y + h, { color: C.blue, width: 2.5 }); D.circle(g, P.X(k.ft / 1e6), P.Y(k.amp), 7, { fill: k.match ? C.green : C.red, stroke: '#fff', width: 2 }); }
        else D.tag(g, k.ft < lo ? '← f(tank) off scale' : 'f(tank) off scale →', k.ft < lo ? x + 6 : x + w - 6, y + 22, { bg: C.blue, size: 16, align: k.ft < lo ? 'left' : 'right' });
        if (step === 3) D.focus(g, x, y, w, h, t);
      }
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 3. Acoustic Grating Visualizer
  // ─────────────────────────────────────────────────────────────
  const LIQ = { water: { name: 'Water', v: 1480 }, kerosene: { name: 'Kerosene', v: 1324 }, ethanol: { name: 'Ethanol', v: 1160 }, glycerine: { name: 'Glycerine', v: 1920 } };
  const LIGHT = { na: { name: 'Sodium lamp', nm: 589.3 }, hene: { name: 'He-Ne laser', nm: 632.8 }, green: { name: 'Green laser', nm: 532 } };
  function gratCalc(p) {
    const f = p.f * 1e6; const lam = (LIGHT[p.lam] || LIGHT.na).nm * 1e-9; const n = Math.round(p.n) || 1; const Dm = p.Dscr;
    let v; let thN;
    if (p.mode === 'reverse') { thN = Math.atan((p.xMeas * 1e-3) / Dm); v = (f * n * lam) / Math.sin(thN); }
    else v = (LIQ[p.liq] || LIQ.water).v;
    const Lam = v / f; const s1 = lam / Lam;
    if (p.mode !== 'reverse') { const sN = n * s1; thN = sN < 1 ? Math.asin(sN) : Math.PI / 2; }
    const th1 = s1 < 1 ? Math.asin(s1) : Math.PI / 2;
    return { f, lam, n, v, Lam, thN, th1, xN: Dm * Math.tan(Math.min(thN, 1.5)) };
  }
  S['ep-acoustic-grating'] = {
    approx: 'The liquid is treated as an ideal plane grating with element d = Λ (ultrasonic wavelength). Real diffraction angles are only a fraction of a degree, so the angles in the picture are greatly exaggerated and the band spacing is not to scale.',
    modes: [{ key: 'forward', label: 'Predict θ (known v)' }, { key: 'reverse', label: 'Find v (measured θ)' }],
    params: [
      { key: 'f', label: 'Ultrasonic frequency f', type: 'range', min: 1, max: 20, step: 0.1, default: 5, unit: 'MHz' },
      { key: 'liq', label: 'Liquid in the tank', type: 'select', default: 'water', options: [{ value: 'water', label: 'Water — v ≈ 1480 m/s' }, { value: 'kerosene', label: 'Kerosene — v ≈ 1324 m/s' }, { value: 'ethanol', label: 'Ethanol — v ≈ 1160 m/s' }, { value: 'glycerine', label: 'Glycerine — v ≈ 1920 m/s' }], showIf: (p) => p.mode !== 'reverse' },
      { key: 'lam', label: 'Light source', type: 'select', default: 'na', options: [{ value: 'na', label: 'Sodium lamp λ = 589.3 nm' }, { value: 'hene', label: 'He-Ne laser λ = 632.8 nm' }, { value: 'green', label: 'Green laser λ = 532 nm' }] },
      { key: 'n', label: 'Order n', type: 'range', min: 1, max: 5, step: 1, default: 1 },
      { key: 'Dscr', label: 'Lens-to-screen distance D (focal length)', type: 'range', min: 0.3, max: 3, step: 0.1, default: 1, unit: 'm' },
      { key: 'xMeas', label: 'Measured distance of order n from centre xₙ', type: 'range', min: 0.1, max: 40, step: 0.01, default: 1.99, unit: 'mm', showIf: (p) => p.mode === 'reverse' },
    ],
    examples: [
      { label: 'Water, 5 MHz, sodium light', values: { mode: 'forward', f: 5, liq: 'water', lam: 'na', n: 1, Dscr: 1 } },
      { label: 'Kerosene, 10 MHz, He-Ne laser, 2nd order', values: { mode: 'forward', f: 10, liq: 'kerosene', lam: 'hene', n: 2, Dscr: 1 } },
      { label: 'Measure v in water: x₁ = 2.0 mm at 5 MHz', values: { mode: 'reverse', f: 5, lam: 'na', n: 1, Dscr: 1, xMeas: 2.0 } },
      { label: 'Measure v in kerosene: x₂ = 8.9 mm at 10 MHz', values: { mode: 'reverse', f: 10, lam: 'na', n: 2, Dscr: 1, xMeas: 8.9 } },
    ],
    validate(p) {
      const k = gratCalc(p); const out = [];
      if (p.mode === 'reverse' && (k.v < 500 || k.v > 3000)) out.push(`The measured xₙ gives v = ${fmt(k.v, 4)} m/s, which is not realistic for a liquid (≈ 1000–2000 m/s). Check xₙ, n and D.`);
      if (k.n * k.lam >= k.Lam) out.push('nλ ≥ d: this order cannot exist.');
      return out;
    },
    compute(p) {
      const k = gratCalc(p); const li = LIGHT[p.lam] || LIGHT.na; const rev = p.mode === 'reverse'; const liq = LIQ[p.liq] || LIQ.water;
      const formulas = [];
      if (rev) {
        formulas.push({ name: 'Diffraction angle from the screen', formula: 'tan θₙ = xₙ / D', given: `xₙ = ${p.xMeas} mm, D = ${p.Dscr} m, n = ${k.n}`, calc: `θₙ = tan⁻¹(${fmt(p.xMeas * 1e-3, 3)} / ${p.Dscr})`, result: `${fmt(deg(k.thN), 4)}°`, unit: 'degrees (°)' });
        formulas.push({ name: 'Velocity of ultrasound in the liquid', formula: 'v = f nλ / sin θₙ', given: `f = ${p.f} MHz, n = ${k.n}, λ = ${li.nm} nm`, calc: `v = ${fmt(k.f, 3)} × ${k.n} × ${fmt(k.lam, 4)} / sin ${fmt(deg(k.thN), 4)}°`, result: fmt(k.v, 4), unit: 'm/s' });
        formulas.push({ name: 'Grating element (ultrasonic wavelength)', formula: 'd = Λ = v / f', given: `v = ${fmt(k.v, 4)} m/s, f = ${fmt(k.f, 3)} Hz`, calc: `Λ = ${fmt(k.v, 4)} / ${fmt(k.f, 3)}`, result: `${fmt(k.Lam * 1e6, 4)} µm`, unit: 'micrometre (µm)' });
      } else {
        formulas.push({ name: 'Grating element (ultrasonic wavelength)', formula: 'd = Λ = v / f', given: `v = ${k.v} m/s (${liq.name}), f = ${p.f} MHz`, calc: `Λ = ${k.v} / ${fmt(k.f, 3)}`, result: `${fmt(k.Lam * 1e6, 4)} µm`, unit: 'micrometre (µm)' });
        formulas.push({ name: 'Diffraction condition', formula: 'd sin θₙ = nλ', given: `n = ${k.n}, λ = ${li.nm} nm, d = ${fmt(k.Lam * 1e6, 4)} µm`, calc: `sin θₙ = ${k.n} × ${fmt(k.lam, 4)} / ${fmt(k.Lam, 4)} = ${fmt((k.n * k.lam) / k.Lam, 4)}`, result: `θₙ = ${fmt(deg(k.thN), 4)}°`, unit: 'degrees (°)' });
        formulas.push({ name: 'Position of the order on the screen', formula: 'xₙ = D tan θₙ', given: `D = ${p.Dscr} m`, calc: `xₙ = ${p.Dscr} × tan ${fmt(deg(k.thN), 4)}°`, result: `${fmt(k.xN * 1e3, 4)} mm`, unit: 'millimetre (mm)' });
        formulas.push({ name: 'Measuring θ gives the velocity', formula: 'v = f nλ / sin θₙ', given: `θₙ = ${fmt(deg(k.thN), 4)}°`, calc: `v = ${fmt(k.f, 3)} × ${k.n} × ${fmt(k.lam, 4)} / sin θₙ`, result: fmt((k.f * k.n * k.lam) / Math.max(Math.sin(k.thN), 1e-12), 4), unit: 'm/s' });
      }
      return {
        formulas,
        readouts: [
          { label: 'Grating element d = Λ', value: `${fmt(k.Lam * 1e6, 4)} µm`, tone: 'info' },
          { label: `Angle θ (n = ${k.n})`, value: `${fmt(deg(k.thN), 3)}°` },
          { label: `Position x (n = ${k.n})`, value: `${fmt(k.xN * 1e3, 3)} mm` },
          { label: 'Sound velocity v', value: `${fmt(k.v, 4)} m/s`, tone: 'good' },
        ],
        state: { mode: rev ? 'find v from measured angle' : 'predict angle', liquid: rev ? 'unknown (measured)' : liq.name, frequency_MHz: p.f, lightWavelength_nm: li.nm, order: k.n, gratingElement_um: fmt(k.Lam * 1e6, 4), angle_deg: fmt(deg(k.thN), 4), position_mm: fmt(k.xN * 1e3, 4), velocity_m_per_s: fmt(k.v, 4) },
        explain: {
          what: rev ? `Order ${k.n} is measured ${p.xMeas} mm from the centre at D = ${p.Dscr} m, so θ = ${fmt(deg(k.thN), 3)}° and the sound velocity is v = f·nλ/sin θ = ${fmt(k.v, 4)} m/s.` : `${p.f} MHz ultrasound in ${liq.name.toLowerCase()} forms a grating with d = Λ = ${fmt(k.Lam * 1e6, 4)} µm. ${li.name} light (${li.nm} nm) is diffracted; order ${k.n} appears at θ = ${fmt(deg(k.thN), 3)}° (${fmt(k.xN * 1e3, 3)} mm on the screen).`,
          why: 'The transducer and reflector set up standing ultrasonic waves. Compressions (denser liquid, higher refractive index) and rarefactions alternate with period Λ, so the liquid behaves like a plane transmission grating for light.',
          param: `Ultrasonic frequency f, liquid (sound velocity v), light wavelength λ, order n${rev ? ' and the measured position xₙ' : ''}.`,
          effect: 'Higher f → smaller Λ → larger diffraction angles (orders spread out). A faster liquid gives a larger Λ and smaller angles. Longer λ gives larger angles.',
        },
      };
    },
    steps(p, c) {
      const s = c.state; const rev = p.mode === 'reverse';
      return [
        { title: 'Transducer sends ultrasound into the liquid', text: `A quartz transducer driven at f = ${p.f} MHz sends ultrasonic waves up through the liquid.` },
        { title: 'Standing waves: compressions and rarefactions', text: `The reflector sends the wave back, forming standing waves. The pattern repeats every Λ = v/f = ${s.gratingElement_um} µm.` },
        { title: 'The liquid acts as a grating', text: `Dense layers have a higher refractive index than rare layers, so the liquid works like a diffraction grating with element d = Λ = ${s.gratingElement_um} µm.` },
        { title: 'Monochromatic light passes through', text: `Parallel ${s.lightWavelength_nm} nm light crosses the tank at right angles to the sound waves.` },
        { title: 'Diffraction orders on the screen', text: `d sin θₙ = nλ: order ${s.order} appears at θ = ${s.angle_deg}°, x = ${s.position_mm} mm from the centre.` },
        { title: rev ? 'Calculate the velocity of ultrasound' : 'Measure θ to find the velocity', text: `v = f nλ / sin θₙ = ${s.velocity_m_per_s} m/s${rev ? ' for the liquid in the tank.' : ' — measuring the angle gives the velocity of ultrasound in the liquid.'}` },
      ];
    },
    draw(g, S2) {
      const { p, step, t } = S2; const pr = prog(S2); const k = gratCalc(p); const li = LIGHT[p.lam] || LIGHT.na; const col = D.wavelengthColor(li.nm); const rev = p.mode === 'reverse';
      D.clear(g, '#ffffff');
      TX(g, 'Acoustic grating', 20, 28, { size: 22, weight: 800 });
      const tx0 = 230, tx1 = 470, ty0 = 80, ty1 = 420; const yc = 250;
      D.rect(g, tx0, ty0, tx1 - tx0, ty1 - ty0, { fill: '#e0f2fe', stroke: '#0369a1', width: 3 });
      const sp = clamp(36 * (k.Lam / 296e-6), 9, 120);
      const front = step === 0 ? ty1 - pr * (ty1 - ty0) : ty0;
      for (let y = ty0 + 2; y < ty1 - 2; y += 2) {
        if (y < front) continue;
        const ph = (2 * Math.PI * (ty1 - y)) / sp;
        const dens = step === 0 ? Math.cos(ph - t * 4) : Math.cos(ph) * Math.cos(t * 3);
        g.fillStyle = dens > 0 ? `rgba(30,64,175,${0.45 * dens})` : `rgba(255,255,255,${-0.6 * dens})`;
        g.fillRect(tx0 + 2, y, tx1 - tx0 - 4, 2);
      }
      D.rect(g, tx0 - 8, ty0 - 16, tx1 - tx0 + 16, 14, { fill: C.metal, stroke: C.muted, width: 1.5 });
      TX(g, 'Reflector', tx1 + 14, ty0 - 9, { size: 16, color: C.muted });
      D.rect(g, tx0 + 20, ty1, tx1 - tx0 - 40, 22, { fill: '#ede9fe', stroke: C.violet, width: 2 });
      TX(g, `Quartz transducer, f = ${p.f} MHz`, (tx0 + tx1) / 2, ty1 + 42, { size: 17, align: 'center', color: C.violet });
      TX(g, rev ? 'Liquid: v to be found' : `${(LIQ[p.liq] || LIQ.water).name}: v = ${fmt(k.v, 4)} m/s`, (tx0 + tx1) / 2, ty1 + 72, { size: 17, align: 'center', color: '#0369a1' });
      if (step === 0) { D.arrow(g, tx1 - 30, ty1 - 10, tx1 - 30, Math.max(ty0 + 20, front + 10), { color: C.violet, width: 3 }); D.focus(g, tx0 + 14, ty1 - 6, tx1 - tx0 - 28, 34, t); }
      if (step >= 1) {
        const yA = ty0 + 16; const yB = yA + sp;
        D.line(g, tx0 + 20, yA, tx0 + 34, yA, { color: C.red, width: 2.5 }); D.line(g, tx0 + 20, yB, tx0 + 34, yB, { color: C.red, width: 2.5 }); D.line(g, tx0 + 27, yA, tx0 + 27, yB, { color: C.red, width: 2.5 });
        TX(g, `d = Λ = ${fmt(k.Lam * 1e6, 3)} µm`, tx0 + 42, yA + Math.min(sp, 60) / 2, { size: 16, color: C.red, weight: 800, halo: true });
        if (step === 1 || step === 2) D.focus(g, tx0, ty0, tx1 - tx0, ty1 - ty0, t);
        if (step >= 2) { TX(g, 'dark = compression', tx0 + 10, ty1 - 44, { size: 16, halo: true, color: '#1e3a8a' }); TX(g, 'light = rarefaction', tx0 + 10, ty1 - 20, { size: 16, halo: true, color: C.muted }); }
      }
      D.circle(g, 60, yc, 24, { fill: '#fef9c3', stroke: C.amber, width: 3 });
      TX(g, li.name, 60, yc + 50, { size: 16, align: 'center', color: C.muted });
      TX(g, `λ = ${li.nm} nm`, 60, yc + 74, { size: 16, align: 'center', color: C.muted });
      const lens = (x, y1, y2) => { g.save(); g.beginPath(); g.ellipse(x, (y1 + y2) / 2, 12, (y2 - y1) / 2, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(191,219,254,0.8)'; g.fill(); g.strokeStyle = C.blue; g.lineWidth = 2; g.stroke(); g.restore(); };
      lens(160, yc - 75, yc + 75); lens(610, yc - 80, yc + 80);
      TX(g, 'Lens', 610, yc + 100, { size: 16, align: 'center', color: C.blue });
      const scx = 900; D.rect(g, scx, 60, 14, 400, { fill: '#e2e8f0', stroke: C.muted, width: 1.5 });
      TX(g, 'Screen', scx + 7, 480, { size: 16, align: 'center', color: C.muted });
      for (let i = -2; i <= 2; i++) D.line(g, 84, yc + i * 5, 160, yc + i * 28, { color: col, width: 2, alpha: 0.8 });
      if (step >= 3) {
        const bf = step === 3 ? pr : 1; const xe = 160 + (610 - 160) * bf;
        for (let i = -2; i <= 2; i++) D.line(g, 160, yc + i * 28, xe, yc + i * 28, { color: col, width: 2.5, alpha: 0.75 });
        if (step === 3) D.focus(g, 150, yc - 70, 470, 140, t);
      }
      const pxPer = clamp(45 * (Math.sin(k.th1) / 0.00199), 12, 400);
      if (step >= 4) {
        for (let m = -5; m <= 5; m++) {
          const ys = yc - m * pxPer; if (ys < 70 || ys > 450) continue;
          const I = m === 0 ? 1 : 0.55 / (1 + 0.25 * Math.abs(m));
          D.poly(g, [[610, yc - 80], [scx, ys], [610, yc + 80]], { fill: col, close: true, stroke: false, alpha: 0.1 * I + 0.02 });
          D.line(g, 610, yc, scx, ys, { color: col, width: 2, alpha: 0.4 + 0.5 * I });
          D.circle(g, scx + 7, ys, 6 + 5 * I, { fill: col, stroke: C.ink, width: 1 });
          if ((Math.abs(m) === k.n || m === 0) && pxPer >= 18) TX(g, m === 0 ? 'n = 0' : `n = ${m > 0 ? '+' : '−'}${Math.abs(m)}`, scx + 24, ys, { size: 16, weight: 800, color: Math.abs(m) === k.n ? C.red : C.ink });
        }
        const ysN = yc - k.n * pxPer;
        if (ysN >= 70) D.circle(g, scx + 7, ysN, 17, { stroke: C.red, width: 3 });
        else D.tag(g, `order ${k.n} lies beyond this screen`, scx - 10, 90, { bg: C.red, size: 16, align: 'right' });
        TX(g, 'angles exaggerated', 760, 470, { size: 16, align: 'center', color: C.muted });
        if (step === 4) D.focus(g, scx - 8, 64, 80, 392, t);
      }
      const tags = [];
      if (step >= 4) tags.push([`θ = ${fmt(deg(k.thN), 3)}°  (n = ${k.n}, x = ${fmt(k.xN * 1e3, 3)} mm)`, C.blue]);
      if (step >= 5) tags.push([`v = f·nλ/sin θ = ${fmt(k.v, 4)} m/s`, C.green]);
      if (tags.length === 1) stepTag(g, tags[0][0], 980, 28, tags[0][1], 'right');
      if (tags.length === 2) { stepTag(g, tags[0][0], 540, 520, tags[0][1], 'left'); stepTag(g, tags[1][0], 980, 28, tags[1][1], 'right'); }
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 4. SONAR Simulator
  // ─────────────────────────────────────────────────────────────
  function sonarCalc(p) {
    const beyond = p.d > p.depth; const dEff = beyond ? p.depth : p.d;
    const tObj = (2 * dEff) / p.v; const tBed = (2 * p.depth) / p.v;
    return { beyond, dEff, tObj, tBed, dCalc: (p.v * tObj) / 2 };
  }
  S['ep-sonar'] = {
    approx: 'Straight vertical sound path with a constant speed of sound; refraction by temperature/salinity layers and the pulse length are ignored.',
    params: [
      { key: 'd', label: 'Object distance (below the transducer)', type: 'range', min: 10, max: 6000, step: 10, default: 750, unit: 'm' },
      { key: 'depth', label: 'Water depth (to the sea bed)', type: 'range', min: 50, max: 6000, step: 10, default: 1200, unit: 'm' },
      { key: 'v', label: 'Wave speed in water', type: 'range', min: 1400, max: 1600, step: 1, default: 1500, unit: 'm/s', help: 'Sea water ≈ 1500 m/s, fresh water ≈ 1480 m/s.' },
      { key: 'obj', label: 'Target', type: 'select', default: 'sub', options: [{ value: 'sub', label: 'Submarine' }, { value: 'fish', label: 'Fish shoal' }] },
    ],
    examples: [
      { label: 'Submarine at 750 m, sea 1200 m deep', values: { d: 750, depth: 1200, v: 1500, obj: 'sub' } },
      { label: 'Fish shoal at 60 m over a 150 m shelf', values: { d: 60, depth: 150, v: 1500, obj: 'fish' } },
      { label: 'Deep ocean: sea bed 4000 m, target 2500 m', values: { d: 2500, depth: 4000, v: 1500, obj: 'sub' } },
      { label: 'Invalid: object deeper than the sea bed', values: { d: 900, depth: 600, v: 1500, obj: 'sub' } },
    ],
    validate: (p) => (p.d > p.depth ? [`Object distance (${p.d} m) is greater than the water depth (${p.depth} m) — the object would be under the sea bed, so the echo comes from the sea bed.`] : []),
    compute(p) {
      const k = sonarCalc(p); const nm = p.obj === 'fish' ? 'fish shoal' : 'submarine';
      const formulas = [
        { name: 'Time of flight (pulse down and echo up)', formula: 't = 2d / v', given: `d = ${fmt(k.dEff, 4)} m${k.beyond ? ' (sea bed)' : ''}, v = ${p.v} m/s`, calc: `t = 2 × ${fmt(k.dEff, 4)} / ${p.v}`, result: fmt(k.tObj, 4), unit: 'second (s)' },
        { name: 'Distance calculated from the echo', formula: 'd = v × t / 2', given: `v = ${p.v} m/s, t = ${fmt(k.tObj, 4)} s`, calc: `d = ${p.v} × ${fmt(k.tObj, 4)} / 2`, result: fmt(k.dCalc, 4), unit: 'metre (m)' },
        { name: 'Sea-bed echo (water depth)', formula: 't(bed) = 2h / v', given: `h = ${p.depth} m`, calc: `t = 2 × ${p.depth} / ${p.v}`, result: fmt(k.tBed, 4), unit: 'second (s)' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Time of flight', value: `${fmt(k.tObj, 4)} s`, tone: 'info' },
          { label: 'Calculated distance', value: `${fmt(k.dCalc, 4)} m`, tone: k.beyond ? 'warn' : 'good' },
          { label: 'Sea-bed echo', value: `${fmt(k.tBed, 4)} s` },
          { label: 'Echo from', value: k.beyond ? 'sea bed' : nm, tone: k.beyond ? 'bad' : undefined },
        ],
        state: { objectDistance_m: p.d, waterDepth_m: p.depth, speed_m_per_s: p.v, timeOfFlight_s: fmt(k.tObj, 4), calculatedDistance_m: fmt(k.dCalc, 4), seaBedEcho_s: fmt(k.tBed, 4), echoFrom: k.beyond ? 'sea bed (object deeper than water)' : nm },
        explain: {
          what: k.beyond ? `The ${nm} is set deeper (${p.d} m) than the sea bed (${p.depth} m), so the pulse is reflected by the sea bed after ${fmt(k.tObj, 4)} s, giving ${fmt(k.dCalc, 4)} m.` : `The pulse reaches the ${nm} ${p.d} m below and the echo returns after t = ${fmt(k.tObj, 4)} s. d = v t / 2 = ${fmt(k.dCalc, 4)} m. The sea-bed echo arrives later at ${fmt(k.tBed, 4)} s.`,
          why: 'Ultrasound travels through water at a known speed and is reflected where the acoustic impedance changes (steel hull, fish swim-bladders, rock). The pulse travels the distance twice — down and back — hence the factor 2.',
          param: 'Object distance d, water depth h and speed of sound v.',
          effect: 'A deeper object gives a longer time of flight (t ∝ d). A faster wave speed shortens t. Using the wrong v gives a wrong distance.',
        },
      };
    },
    steps(p, c) {
      const s = c.state; const bed = s.echoFrom.startsWith('sea');
      return [
        { title: 'Transducer sends an ultrasonic pulse', text: 'A piezoelectric transducer under the ship sends a short ultrasonic pulse downwards; the echo-sounder clock starts at t = 0.' },
        { title: 'The pulse travels down', text: `The pulse travels through the water at v = ${p.v} m/s.` },
        { title: bed ? 'Echo from the sea bed' : `Echo from the ${s.echoFrom}`, text: bed ? 'The object is below the sea bed, so the sea bed reflects the pulse first.' : 'Part of the pulse is reflected back towards the ship as an echo.' },
        { title: 'Echo received — time of flight', text: `The same transducer receives the echo. Time of flight t = ${s.timeOfFlight_s} s.` },
        { title: 'Calculate the distance', text: `d = v × t / 2 = ${p.v} × ${s.timeOfFlight_s} / 2 = ${s.calculatedDistance_m} m.` },
        { title: 'Sea-bed echo gives the water depth', text: `The sea bed returns ${bed ? 'the' : 'a later'} echo at ${s.seaBedEcho_s} s → depth = ${p.depth} m.` },
      ];
    },
    draw(g, S2) {
      const { p, step, t } = S2; const pr = prog(S2); const k = sonarCalc(p);
      D.clear(g, '#ffffff');
      const L = 20, R = 640, ySurf = 150, yBed = 490;
      D.rect(g, L, 40, R - L, ySurf - 40, { fill: '#f0f9ff' });
      g.save(); const grd = g.createLinearGradient(0, ySurf, 0, yBed); grd.addColorStop(0, '#93c5fd'); grd.addColorStop(1, '#1e3a8a'); g.fillStyle = grd; g.fillRect(L, ySurf, R - L, yBed - ySurf); g.restore();
      const bedPts = [[L, yBed]]; for (let x = L; x <= R; x += 20) bedPts.push([x, yBed + 6 * Math.sin(x / 37)]); bedPts.push([R, 545], [L, 545]);
      D.poly(g, bedPts, { fill: '#d6b37a', close: true, stroke: '#92400e', width: 2 });
      TX(g, `Sea bed (depth ${p.depth} m)`, 440, 525, { size: 17, align: 'center', color: '#78350f', weight: 800 });
      TX(g, 'SONAR', 30, 62, { size: 22, weight: 800 });
      const sx = 250;
      D.poly(g, [[sx - 110, ySurf - 22], [sx + 110, ySurf - 22], [sx + 90, ySurf + 8], [sx - 90, ySurf + 8]], { fill: '#475569', close: true, stroke: C.ink, width: 2 });
      D.rect(g, sx - 50, ySurf - 55, 80, 33, { fill: '#e2e8f0', stroke: C.ink, width: 2 });
      D.rect(g, sx - 12, ySurf + 8, 24, 12, { fill: C.violet, stroke: C.ink, width: 1.5 });
      TX(g, 'Transducer', sx - 20, ySurf + 30, { size: 16, align: 'right', color: '#fff', weight: 800, halo: 'rgba(15,23,42,0.45)' });
      if (step === 0 || step === 3) D.focus(g, sx - 20, ySurf + 2, 40, 24, t);
      const yOf = (d) => ySurf + 24 + (clamp(d, 0, p.depth) / p.depth) * (yBed - ySurf - 24);
      D.line(g, R - 60, yOf(0), R - 60, yOf(p.depth), { color: '#fff', width: 2 });
      [0, 0.5, 1].forEach((f) => { const y = yOf(p.depth * f); D.line(g, R - 66, y, R - 54, y, { color: '#fff', width: 2 }); TX(g, `${fmt(p.depth * f, 4)} m`, R - 70, y + (f === 1 ? -12 : 0), { size: 16, align: 'right', color: '#fff', halo: 'rgba(15,23,42,0.5)' }); });
      const yT = k.beyond ? yBed : yOf(p.d);
      if (!k.beyond) {
        if (p.obj === 'fish') {
          for (let i = 0; i < 9; i++) { const fx = sx - 55 + (i % 5) * 26 + (i > 4 ? 13 : 0); const fy = yT - 8 + (i > 4 ? 16 : 0); g.save(); g.beginPath(); g.ellipse(fx, fy, 10, 5, 0, 0, Math.PI * 2); g.fillStyle = '#fbbf24'; g.fill(); g.restore(); D.poly(g, [[fx + 9, fy], [fx + 16, fy - 5], [fx + 16, fy + 5]], { fill: '#fbbf24', close: true, stroke: false }); }
        } else {
          g.save(); g.beginPath(); g.ellipse(sx, yT, 75, 16, 0, 0, Math.PI * 2); g.fillStyle = '#334155'; g.fill(); g.strokeStyle = '#0f172a'; g.lineWidth = 1.5; g.stroke(); g.restore();
          D.rect(g, sx - 12, yT - 30, 26, 16, { fill: '#334155' });
        }
        TX(g, p.obj === 'fish' ? 'Fish shoal' : 'Submarine', sx + 90, yT, { size: 17, color: '#fff', weight: 800, halo: 'rgba(15,23,42,0.6)' });
      } else if (step >= 2) {
        D.tag(g, `Object (${p.d} m) would be below the sea bed!`, sx + 30, yBed - 40, { bg: C.red, size: 16, align: 'center' });
      }
      const y0 = ySurf + 24; const yH = yT - (k.beyond ? 4 : 18);
      const drawFront = (y, up, color) => { for (let i = 0; i < 3; i++) { const yy = y + (up ? 1 : -1) * i * 12; g.save(); g.beginPath(); g.ellipse(sx, yy, 46 - i * 8, 10, 0, up ? Math.PI : 0, up ? 2 * Math.PI : Math.PI); g.strokeStyle = color; g.lineWidth = 3.5 - i; g.globalAlpha = 1 - i * 0.3; g.stroke(); g.restore(); } };
      if (step === 0) drawFront(y0 + 10 + 30 * pr, false, C.hi);
      if (step === 1) { const y = y0 + (yH - y0) * pr; D.line(g, sx, y0, sx, y, { color: C.hi, width: 2, dash: [6, 6] }); drawFront(Math.max(y, y0 + 10), false, C.hi); }
      if (step === 2) { D.line(g, sx, y0, sx, yH, { color: C.hi, width: 2, dash: [6, 6] }); const y = yH - (yH - y0) * pr; drawFront(y, true, C.orange); D.focus(g, sx - 90, yT - 34, 180, 60, t); }
      if (step >= 3) {
        D.arrow(g, sx - 25, y0 + 8, sx - 25, yH, { color: C.hi, width: 3 }); D.arrow(g, sx + 25, yH, sx + 25, y0 + 8, { color: C.orange, width: 3 });
        if (yH - y0 > 60) { TX(g, 'pulse', sx - 32, (y0 + yH) / 2, { size: 16, align: 'right', color: '#fff', weight: 800, halo: 'rgba(15,23,42,0.5)' }); TX(g, 'echo', sx + 32, (y0 + yH) / 2, { size: 16, color: '#fff', weight: 800, halo: 'rgba(15,23,42,0.5)' }); }
      }
      if (step >= 4) {
        const xd = 70; D.line(g, xd, y0, xd, yT, { color: '#fff', width: 2.5 }); D.line(g, xd - 8, y0, xd + 8, y0, { color: '#fff', width: 2.5 }); D.line(g, xd - 8, yT, xd + 8, yT, { color: '#fff', width: 2.5 });
        D.tag(g, `d = ${fmt(k.dCalc, 4)} m`, xd + 12, clamp((y0 + yT) / 2, y0 + 14, yBed - 14), { bg: C.green, size: 17, align: 'left' });
      }
      if (step >= 5) {
        const k2 = (t * 0.5) % 1; const yb = y0 + (yBed - y0) * (k2 < 0.5 ? k2 * 2 : 2 - k2 * 2);
        D.circle(g, sx + 60, yb, 6, { fill: '#fff', stroke: C.orange, width: 2 });
        D.focus(g, L + 10, yBed - 12, R - L - 20, 50, t);
      }
      // echo-sounder display
      const px = 680, pw = 290;
      D.rect(g, px - 14, 40, pw + 28, 505, { fill: '#f8fafc', stroke: C.line, r: 12 });
      TX(g, 'Echo sounder display', px, 68, { size: 18, weight: 800 });
      const tmax = nice(k.tBed * 1.15);
      const P = plot(g, px, 100, pw, 150, { xmin: 0, xmax: tmax, xticks: 4, xlabel: 'time (s)', bg: '#052e16', border: '#14532d', gridColor: '#14532d', xfmt: (v) => fmt(v, 3) });
      const sig = tmax * 0.01;
      const tNow = step === 0 ? 0 : step === 1 ? (k.tObj / 2) * pr : step === 2 ? k.tObj / 2 + (k.tObj / 2) * pr : step <= 4 ? k.tObj + sig * 3 : tmax;
      const tDraw = Math.max(tNow, sig * 3);
      clipTo(g, px, 100, pw, 150, () => trace(g, P, 0, Math.min(tmax, tDraw), (x) => rf(x, sig * 1.5, 0.9, sig, sig * 1.2) + (k.beyond ? 0 : rf(x, k.tObj, 0.6, sig, sig * 1.2)) + rf(x, k.tBed, 0.8, sig, sig * 1.2), { color: '#4ade80', n: 700 }));
      if (step >= 1 && step <= 2) D.line(g, P.X(tNow), 100, P.X(tNow), 250, { color: C.hi, width: 2 });
      if (step >= 3) { D.line(g, P.X(k.tObj), 100, P.X(k.tObj), 250, { color: C.hi, width: 2, dash: [5, 4] }); D.tag(g, `t = ${fmt(k.tObj, 3)} s`, clamp(P.X(k.tObj), px + 60, px + pw - 60), 118, { bg: C.amber, size: 16, align: 'center' }); }
      if (step >= 5 && !k.beyond) D.tag(g, `sea bed ${fmt(k.tBed, 3)} s`, clamp(P.X(k.tBed), px + 75, px + pw - 75), 232, { bg: '#92400e', size: 16, align: 'center' });
      TX(g, 'Time of flight', px, 320, { size: 17, color: C.muted });
      TX(g, step >= 3 ? `t = ${fmt(k.tObj, 4)} s` : step >= 1 ? `t = ${fmt(tNow, 3)} s …` : 't = 0 s (start)', px, 350, { size: 24, weight: 800, color: C.amber });
      TX(g, 'Calculated distance', px, 395, { size: 17, color: C.muted });
      TX(g, step >= 4 ? `d = v·t/2 = ${fmt(k.dCalc, 4)} m` : 'd = v·t/2 = ?', px, 425, { size: 22, weight: 800, color: C.green });
      TX(g, `v = ${p.v} m/s`, px, 465, { size: 17 });
      TX(g, k.beyond ? 'Echo from: sea bed' : `Echo from: ${p.obj === 'fish' ? 'fish shoal' : 'submarine'}`, px, 495, { size: 17, color: k.beyond ? C.red : C.ink });
      if (step === 3 || step === 4) D.focus(g, px - 6, 300, pw + 12, step === 3 ? 65 : 140, t);
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Ultrasonic NDT Simulator (pulse-echo)
  // ─────────────────────────────────────────────────────────────
  const METAL = { steel: { name: 'Steel', v: 5900 }, al: { name: 'Aluminium', v: 6320 } };
  const BLOCK_L = 200; const FLAW_X = 130; const PROBE_D = 10;
  function ndtCalc(p) {
    const v = (METAL[p.mat] || METAL.steel).v; const T = p.T; const x = Math.min(p.x, T * 0.97);
    const a = Math.max(p.pos - PROBE_D / 2, FLAW_X - p.len / 2); const b = Math.min(p.pos + PROBE_D / 2, FLAW_X + p.len / 2);
    const cover = p.flaw !== false ? clamp((b - a) / PROBE_D, 0, 1) : 0;
    return { v, T, x, cover, detected: cover > 0.05, tF: (2 * x * 1e-3) / v, tB: (2 * T * 1e-3) / v };
  }
  S['ep-ndt'] = {
    approx: 'Straight longitudinal-wave beam as wide as the 10 mm probe, no beam spread or attenuation; echo heights are schematic (flaw echo ∝ fraction of the beam it intercepts, and the back-wall echo is shadowed by the same fraction).',
    params: [
      { key: 'mat', label: 'Specimen material', type: 'select', default: 'steel', options: [{ value: 'steel', label: 'Steel — v ≈ 5900 m/s' }, { value: 'al', label: 'Aluminium — v ≈ 6320 m/s' }] },
      { key: 'T', label: 'Block thickness T', type: 'range', min: 10, max: 200, step: 1, default: 50, unit: 'mm' },
      { key: 'flaw', label: 'Flaw present', type: 'toggle', default: true },
      { key: 'x', label: 'Flaw depth x', type: 'range', min: 2, max: 195, step: 0.5, default: 20, unit: 'mm', showIf: (p) => p.flaw !== false },
      { key: 'len', label: 'Flaw length', type: 'range', min: 4, max: 40, step: 1, default: 16, unit: 'mm', showIf: (p) => p.flaw !== false },
      { key: 'pos', label: 'Probe position along the block', type: 'range', min: 5, max: 195, step: 1, default: 130, unit: 'mm', help: `The flaw is centred at ${FLAW_X} mm. Move the probe to scan the block.` },
    ],
    examples: [
      { label: 'Steel plate 50 mm, crack at 20 mm (probe over it)', values: { mat: 'steel', T: 50, flaw: true, x: 20, len: 16, pos: 130 } },
      { label: 'Same plate, probe away from the flaw', values: { mat: 'steel', T: 50, flaw: true, x: 20, len: 16, pos: 60 } },
      { label: 'Aluminium 100 mm casting, void at 65 mm', values: { mat: 'al', T: 100, flaw: true, x: 65, len: 24, pos: 128 } },
      { label: 'Sound steel plate (no flaw), 30 mm', values: { mat: 'steel', T: 30, flaw: false, x: 10, len: 16, pos: 130 } },
    ],
    validate: (p) => (p.flaw !== false && p.x >= p.T ? [`Flaw depth (${p.x} mm) must be less than the block thickness (${p.T} mm) — it is drawn just above the back wall.`] : []),
    compute(p) {
      const k = ndtCalc(p); const m = METAL[p.mat] || METAL.steel; const fl = p.flaw !== false;
      const formulas = [
        { name: 'Back-wall echo time', formula: 't(B) = 2T / v', given: `T = ${p.T} mm = ${fmt(p.T * 1e-3, 3)} m, v = ${k.v} m/s`, calc: `t = 2 × ${fmt(p.T * 1e-3, 3)} / ${k.v}`, result: `${fmt(k.tB * 1e6, 4)} µs`, unit: 'microsecond (µs)' },
      ];
      if (fl) {
        formulas.push({ name: 'Flaw echo time', formula: 't(F) = 2x / v', given: `x = ${fmt(k.x, 4)} mm, v = ${k.v} m/s`, calc: `t = 2 × ${fmt(k.x * 1e-3, 3)} / ${k.v}`, result: k.detected ? `${fmt(k.tF * 1e6, 4)} µs` : 'no echo — flaw not under the probe', unit: k.detected ? 'microsecond (µs)' : '—' });
        formulas.push({ name: 'Depth of the flaw from the echo', formula: 'x = v × t / 2', given: `t = ${fmt(k.tF * 1e6, 4)} µs`, calc: `x = ${k.v} × ${fmt(k.tF, 4)} / 2`, result: k.detected ? `${fmt((k.v * k.tF * 1e3) / 2, 4)} mm` : 'no flaw echo at this probe position', unit: k.detected ? 'millimetre (mm)' : '—' });
      }
      formulas.push({ name: 'Ratio method (from the CRO)', formula: 'x = T × t(F) / t(B)', given: `T = ${p.T} mm`, calc: fl && k.detected ? `x = ${p.T} × ${fmt(k.tF * 1e6, 4)} / ${fmt(k.tB * 1e6, 4)}` : 'no flaw echo', result: fl && k.detected ? `${fmt((p.T * k.tF) / k.tB, 4)} mm` : '—', unit: fl && k.detected ? 'mm' : '—' });
      const verdict = !fl ? 'No flaw' : k.detected ? 'Flaw detected' : 'Not under probe';
      return {
        formulas,
        readouts: [
          { label: 'Back-wall echo', value: `${fmt(k.tB * 1e6, 4)} µs`, tone: 'info' },
          { label: 'Flaw echo', value: fl && k.detected ? `${fmt(k.tF * 1e6, 4)} µs` : 'none' },
          { label: 'Flaw depth', value: fl && k.detected ? `${fmt(k.x, 4)} mm` : '—' },
          { label: 'Result', value: verdict, tone: !fl ? 'good' : k.detected ? 'bad' : 'warn' },
        ],
        state: { material: m.name, velocity_m_per_s: k.v, thickness_mm: p.T, flawPresent: fl, flawDepth_mm: fl ? k.x : '—', probePosition_mm: p.pos, flawCentre_mm: FLAW_X, beamCoverage: `${fmt(k.cover * 100, 3)} %`, flawEcho_us: fl && k.detected ? fmt(k.tF * 1e6, 4) : 'none', backWallEcho_us: fmt(k.tB * 1e6, 4), verdict },
        explain: {
          what: !fl ? `The ${m.name.toLowerCase()} block has no flaw: the CRO shows only the initial pulse and the back-wall echo at ${fmt(k.tB * 1e6, 4)} µs.` : k.detected ? `The probe at ${p.pos} mm is above the flaw. A flaw echo appears at ${fmt(k.tF * 1e6, 4)} µs, before the back-wall echo at ${fmt(k.tB * 1e6, 4)} µs, so the flaw is at x = v t / 2 = ${fmt(k.x, 4)} mm.` : `The probe at ${p.pos} mm is not above the flaw (centred at ${FLAW_X} mm), so only the back-wall echo is seen. Move the probe to scan the block.`,
          why: 'A crack or void is filled with air, whose acoustic impedance is very different from metal, so it reflects the ultrasonic pulse strongly. The couplant (gel/oil) removes the air gap between probe and metal so the pulse can enter.',
          param: 'Material (sound velocity), thickness T, flaw depth x, and probe position.',
          effect: 'A deeper flaw moves the flaw echo to the right (later), closer to the back-wall echo. A thicker block delays the back-wall echo. Aluminium is faster than steel so all echoes come earlier.',
        },
      };
    },
    steps(p, c) {
      const s = c.state; const fl = s.flawPresent; const det = s.flawEcho_us !== 'none'; const len = p.len || 16;
      return [
        { title: 'Probe, couplant and specimen', text: `A piezoelectric probe sits on a ${s.thickness_mm} mm ${s.material.toLowerCase()} block with a thin couplant layer (gel/oil) to remove air.` },
        { title: 'Pulse sent — initial pulse on the CRO', text: `The probe sends a short ultrasonic pulse into the block (v = ${s.velocity_m_per_s} m/s). The CRO shows the initial pulse at t = 0.` },
        { title: fl ? (det ? 'Echo from the flaw' : 'No flaw in the beam') : 'No flaw — pulse passes through', text: fl ? (det ? `The flaw reflects part of the pulse; the flaw echo arrives at ${s.flawEcho_us} µs.` : `The flaw is at ${FLAW_X} mm but the probe is at ${p.pos} mm, so the beam misses it.`) : 'The pulse travels through sound metal without reflection.' },
        { title: 'Back-wall echo', text: `The rest of the pulse reflects from the bottom face and returns at ${s.backWallEcho_us} µs.` },
        { title: 'Locate the flaw depth', text: fl && det ? `x = v × t / 2 = ${s.velocity_m_per_s} m/s × ${s.flawEcho_us} µs / 2 = ${s.flawDepth_mm} mm.` : 'No echo between the initial pulse and the back-wall echo → no flaw below this position.' },
        { title: 'Scan the probe along the block', text: fl ? `Moving the probe along the surface maps where the flaw echo appears — here from about ${FLAW_X - len / 2 - PROBE_D / 2} to ${FLAW_X + len / 2 + PROBE_D / 2} mm.` : 'Moving the probe over the whole surface shows no flaw echo anywhere → the part passes the test.' },
      ];
    },
    draw(g, S2) {
      const { p, step, t } = S2; const pr = prog(S2); const k = ndtCalc(p); const m = METAL[p.mat] || METAL.steel; const fl = p.flaw !== false;
      D.clear(g, '#ffffff');
      TX(g, 'Pulse-echo ultrasonic testing', 20, 28, { size: 22, weight: 800 });
      const bx0 = 40, bx1 = 600, by0 = 200; const bh = 60 + ((p.T - 10) / 190) * 200; const by1 = by0 + bh;
      const X = (mm) => bx0 + (mm / BLOCK_L) * (bx1 - bx0); const Yd = (mm) => by0 + (mm / p.T) * bh;
      D.rect(g, bx0, by0, bx1 - bx0, bh, { fill: p.mat === 'al' ? '#e5e7eb' : '#cbd5e1', stroke: C.ink, width: 2.5 });
      if (step >= 5 && fl) { const a = FLAW_X - p.len / 2 - PROBE_D / 2; const b = FLAW_X + p.len / 2 + PROBE_D / 2; D.rect(g, X(a), by0 - 4, X(b) - X(a), 6, { fill: C.red }); TX(g, 'flaw echo seen here', (X(a) + X(b)) / 2, 150, { size: 16, align: 'center', color: C.red, weight: 800 }); D.line(g, (X(a) + X(b)) / 2, 160, (X(a) + X(b)) / 2, by0 - 6, { color: C.red, width: 1.5 }); }
      const fw = (X(p.len) - X(0)) / 2;
      if (fl) { g.save(); g.beginPath(); g.ellipse(X(FLAW_X), Yd(k.x), fw, 6, 0, 0, Math.PI * 2); g.fillStyle = '#7f1d1d'; g.fill(); g.restore(); TX(g, 'Flaw', X(FLAW_X) + fw + 8, Yd(k.x), { size: 16, color: '#7f1d1d', weight: 800, halo: true }); }
      const pxc = X(p.pos); const pw = X(PROBE_D) - X(0);
      D.rect(g, pxc - pw / 2 - 6, by0 - 8, pw + 12, 8, { fill: '#7dd3fc' });
      D.rect(g, pxc - pw / 2, by0 - 52, pw, 44, { fill: C.violet, stroke: C.ink, width: 2, r: 4 });
      D.line(g, pxc, by0 - 52, pxc, 80, { color: C.ink, width: 2.5 });
      TX(g, 'Probe', pxc + pw / 2 + 8, by0 - 38, { size: 16, weight: 800, color: C.violet });
      TX(g, 'Couplant', pxc - pw / 2 - 12, by0 - 12, { size: 16, align: 'right', color: '#0369a1', weight: 800 });
      TX(g, 'to pulser / CRO', pxc + 10, 80, { size: 16, color: C.muted });
      if (step === 0) D.focus(g, pxc - pw / 2 - 10, by0 - 56, pw + 20, 60, t);
      const yStop = fl && k.detected ? Yd(k.x) : by1;
      if (step >= 1) D.rect(g, pxc - pw / 2, by0, pw, bh, { fill: C.hi, alpha: 0.2 });
      const pulse = (y, color) => D.line(g, pxc - pw / 2, y, pxc + pw / 2, y, { color, width: 5 });
      if (step === 1) pulse(by0 + (yStop - by0) * pr, C.amber);
      if (step === 2) { if (fl && k.detected) pulse(yStop - (yStop - by0) * pr, C.red); else pulse(by0 + (by1 - by0) * pr, C.amber); }
      if (step === 3) { const f2 = pr * 2; pulse(f2 < 1 ? yStop + (by1 - yStop) * f2 : by1 - (by1 - by0) * (f2 - 1), C.blue); }
      if (step >= 2 && fl && k.detected) D.arrow(g, pxc - pw / 2 - 10, Yd(k.x), pxc - pw / 2 - 10, by0 + 6, { color: C.red, width: 2.5, head: 9 });
      if (step >= 3) D.arrow(g, pxc + pw / 2 + 10, by1 - 2, pxc + pw / 2 + 10, by0 + 6, { color: C.blue, width: 2.5, head: 9 });
      if (step === 2 && fl) D.focus(g, X(FLAW_X) - fw - 6, Yd(k.x) - 12, 2 * fw + 12, 24, t);
      if (step === 3) D.focus(g, bx0, by1 - 10, bx1 - bx0, 20, t);
      D.line(g, bx0 + 16, by0 + 4, bx0 + 16, by1 - 4, { color: C.ink, width: 2 }); D.line(g, bx0 + 10, by0 + 4, bx0 + 22, by0 + 4, { color: C.ink, width: 2 }); D.line(g, bx0 + 10, by1 - 4, bx0 + 22, by1 - 4, { color: C.ink, width: 2 });
      TX(g, `T = ${p.T} mm`, bx0 + 26, (by0 + by1) / 2, { size: 17, weight: 800, halo: true });
      if (step >= 4 && fl && k.detected) { const yy = Yd(k.x) + 28 > by1 - 12 ? Yd(k.x) - 28 : Yd(k.x) + 28; D.tag(g, `x = v·t/2 = ${fmt(k.x, 4)} mm`, X(FLAW_X), yy, { bg: C.red, size: 17, align: 'center' }); }
      TX(g, '0 mm', bx0, by1 + 20, { size: 16, color: C.muted }); TX(g, `${BLOCK_L} mm`, bx1, by1 + 20, { size: 16, align: 'right', color: C.muted });
      TX(g, `${m.name} block, v = ${k.v} m/s (height not to scale)`, bx0, by1 + 46, { size: 17, color: C.muted });
      // CRO
      const cx0 = 640, cw = 330, cy0 = 110, chh = 250;
      TX(g, 'CRO (A-scan)', cx0, 82, { size: 18, weight: 800 });
      const tmax = k.tB * 1e6 * 1.2; const sig = tmax * 0.012;
      const P = plot(g, cx0, cy0, cw, chh, { xmin: 0, xmax: tmax, ymin: -1, ymax: 1.25, xticks: 4, xlabel: 'time (µs)', bg: '#052e16', border: '#14532d', gridColor: '#14532d', xfmt: (v) => fmt(v, 3) });
      const tEnd = step === 0 ? 0 : step === 1 ? sig * 3 : step === 2 ? (fl && k.detected ? k.tF * 1e6 + sig * 3 : sig * 3) : tmax;
      const aF = fl ? 0.75 * k.cover : 0; const aB = 0.9 * (1 - 0.75 * k.cover);
      if (tEnd > 0) clipTo(g, cx0, cy0, cw, chh, () => trace(g, P, 0, tEnd, (x) => rf(x, sig * 1.5, 1.0, sig, sig * 1.1) + rf(x, k.tF * 1e6, aF, sig, sig * 1.1) + (step >= 3 ? rf(x, k.tB * 1e6, aB, sig, sig * 1.1) : 0), { color: '#4ade80', n: 700 }));
      if (step >= 1) D.tag(g, 'initial pulse', cx0 + 8, cy0 + 20, { bg: C.amber, size: 16, align: 'left' });
      if (step >= 2 && fl && k.detected) { D.line(g, P.X(k.tF * 1e6), cy0, P.X(k.tF * 1e6), cy0 + chh, { color: C.red, width: 2, dash: [5, 4] }); D.tag(g, `flaw ${fmt(k.tF * 1e6, 3)} µs`, clamp(P.X(k.tF * 1e6), cx0 + 70, cx0 + cw - 70), cy0 + chh - 18, { bg: C.red, size: 16, align: 'center' }); }
      if (step >= 3) { D.line(g, P.X(k.tB * 1e6), cy0, P.X(k.tB * 1e6), cy0 + chh, { color: C.blue, width: 2, dash: [5, 4] }); D.tag(g, `back wall ${fmt(k.tB * 1e6, 3)} µs`, cx0 + cw - 6, cy0 + 52, { bg: C.blue, size: 16, align: 'right' }); }
      if (step === 1 || step === 2) D.focus(g, cx0, cy0, cw, chh, t);
      if (step >= 4) {
        if (fl && k.detected) { TX(g, 'x = v·t/2', cx0, 440, { size: 18, color: C.muted }); TX(g, `= ${k.v} m/s × ${fmt(k.tF * 1e6, 4)} µs / 2`, cx0, 470, { size: 18 }); TX(g, `= ${fmt(k.x, 4)} mm`, cx0, 505, { size: 24, weight: 800, color: C.red }); }
        else TX(g, fl ? 'No flaw echo here — move the probe' : 'No flaw echo → block is sound', cx0, 455, { size: 18, weight: 800, color: fl ? C.amber : C.green });
        if (step === 4) D.focus(g, cx0 - 6, 425, cw + 12, 100, t);
      }
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 6. Ultrasonic Scanning Simulator (A / B / T-M)
  // ─────────────────────────────────────────────────────────────
  const V_TISSUE = 1540;
  const TIS = { fat: { name: 'Fat', Z: 1.38, col: '#fde68a' }, muscle: { name: 'Muscle', Z: 1.70, col: '#fca5a5' }, soft: { name: 'Soft tissue', Z: 1.63, col: '#fbcfe8' }, bone: { name: 'Bone', Z: 7.8, col: '#e7e5e4' } };
  function scanCalc(p) {
    const layers = [{ k: 'fat', th: p.fat }, { k: 'muscle', th: p.muscle }, { k: 'soft', th: p.organ }];
    if (p.bone !== false) layers.push({ k: 'bone', th: 15 });
    const ifs = []; let depth = 0; let trans = 1;
    for (let i = 0; i < layers.length - 1; i++) {
      depth += layers[i].th; const Z1 = TIS[layers[i].k].Z; const Z2 = TIS[layers[i + 1].k].Z;
      const R = Math.pow((Z2 - Z1) / (Z2 + Z1), 2); const eff = R * trans * trans; trans *= 1 - R;
      ifs.push({ a: layers[i].k, b: layers[i + 1].k, d: depth, R, eff, dB: 10 * Math.log10(Math.max(eff, 1e-9)), t: (2 * depth * 1e-3) / V_TISSUE });
    }
    const total = layers.reduce((s, l) => s + l.th, 0) + (p.bone !== false ? 0 : 10);
    return { layers, ifs, total, tm: p.mode === 'tm' };
  }
  const hgtDB = (dB) => clamp((dB + 50) / 50, 0.06, 1);
  S['ep-ultrasonic-scanning'] = {
    approx: 'Echo strength = R × (transmission through the earlier boundaries)², attenuation in tissue ignored; drawn on a log (dB) scale so the weak soft-tissue echoes stay visible. v = 1540 m/s throughout; the bone layer is drawn 15 mm thick. B-scan and T-M images are conceptual pictures built from these echo depths.',
    modes: [{ key: 'a', label: 'A-scan' }, { key: 'b', label: 'B-scan' }, { key: 'tm', label: 'T-M (M-mode)' }],
    params: [
      { key: 'fat', label: 'Fat layer thickness', type: 'range', min: 2, max: 30, step: 1, default: 10, unit: 'mm' },
      { key: 'muscle', label: 'Muscle layer thickness', type: 'range', min: 5, max: 40, step: 1, default: 20, unit: 'mm' },
      { key: 'organ', label: 'Organ (soft tissue) thickness', type: 'range', min: 10, max: 80, step: 1, default: 40, unit: 'mm' },
      { key: 'bone', label: 'Bone behind the organ', type: 'toggle', default: true },
      { key: 'amp', label: 'Wall movement amplitude', type: 'range', min: 1, max: 10, step: 0.5, default: 5, unit: 'mm', showIf: (p) => p.mode === 'tm' },
      { key: 'hr', label: 'Heart rate', type: 'range', min: 40, max: 180, step: 1, default: 72, unit: 'bpm', showIf: (p) => p.mode === 'tm' },
    ],
    examples: [
      { label: 'Abdomen: thin fat, organ, bone behind', values: { fat: 10, muscle: 20, organ: 40, bone: true } },
      { label: 'Thick fat layer', values: { fat: 30, muscle: 15, organ: 40, bone: true } },
      { label: 'Heart wall in M-mode, 72 bpm', values: { mode: 'tm', fat: 5, muscle: 15, organ: 20, bone: true, amp: 6, hr: 72 } },
      { label: 'No bone: deep organ only', values: { fat: 8, muscle: 25, organ: 70, bone: false } },
    ],
    validate: () => [],
    compute(p) {
      const k = scanCalc(p);
      const formulas = [
        { name: 'Acoustic impedance', formula: 'Z = ρ v', given: 'fat 1.38, muscle 1.70, soft tissue 1.63, bone ≈ 7.8 MRayl (1 MRayl = 10⁶ kg m⁻² s⁻¹)', calc: 'e.g. soft tissue: 1060 kg/m³ × 1540 m/s ≈ 1.63 × 10⁶', result: 'values used in the table', unit: 'MRayl' },
      ];
      k.ifs.forEach((f, i) => {
        const Z1 = TIS[f.a].Z, Z2 = TIS[f.b].Z;
        formulas.push({ name: `Interface ${i + 1}: ${TIS[f.a].name} → ${TIS[f.b].name}`, formula: 'R = ((Z₂ − Z₁)/(Z₂ + Z₁))² ;  t = 2d / v', given: `Z₁ = ${Z1}, Z₂ = ${Z2} MRayl, d = ${fmt(f.d, 4)} mm, v = 1540 m/s`, calc: `R = (${fmt(Z2 - Z1, 3)} / ${fmt(Z2 + Z1, 3)})² ;  t = 2 × ${fmt(f.d * 1e-3, 3)} / 1540`, result: `R = ${fmt(f.R * 100, 3)} %,  t = ${fmt(f.t * 1e6, 4)} µs`, unit: '% of intensity, µs' });
      });
      if (k.tm) formulas.push({ name: 'Wall motion (T-M mode)', formula: 'period T = 60 / HR', given: `HR = ${p.hr} bpm, amplitude = ${p.amp} mm`, calc: `T = 60 / ${p.hr}`, result: `${fmt(60 / p.hr, 3)} s`, unit: 'second (s)' });
      const strongest = k.ifs.reduce((a, b) => (b.eff > a.eff ? b : a), k.ifs[0]);
      const modeName = { a: 'A-scan', b: 'B-scan', tm: 'T-M scan' }[p.mode] || 'A-scan';
      return {
        formulas,
        readouts: [
          { label: 'Mode', value: modeName, tone: 'info' },
          { label: 'Echoes', value: `${k.ifs.length}` },
          { label: 'Strongest echo', value: `${TIS[strongest.a].name}→${TIS[strongest.b].name} (${fmt(strongest.R * 100, 3)} %)` },
          { label: 'Deepest echo time', value: `${fmt(k.ifs[k.ifs.length - 1].t * 1e6, 4)} µs` },
        ],
        state: { mode: modeName, interfaces: k.ifs.map((f) => `${TIS[f.a].name}→${TIS[f.b].name}: depth ${fmt(f.d, 4)} mm, R ${fmt(f.R * 100, 3)} %, echo ${fmt(f.t * 1e6, 4)} µs`).join('; '), speed_m_per_s: V_TISSUE, heartRate_bpm: k.tm ? p.hr : '—' },
        explain: {
          what: `${modeName}: the probe sends pulses into fat (${p.fat} mm), muscle (${p.muscle} mm) and soft tissue (${p.organ} mm)${p.bone !== false ? ' with bone behind' : ''}. Echoes return from ${k.ifs.length} boundaries; the deepest at ${fmt(k.ifs[k.ifs.length - 1].t * 1e6, 4)} µs.`,
          why: 'At every boundary the acoustic impedance Z = ρv changes, so a fraction R = ((Z₂−Z₁)/(Z₂+Z₁))² of the intensity is reflected. The echo time t = 2d/v tells the depth of the boundary.',
          param: `Layer thicknesses, bone on/off${k.tm ? ', wall amplitude and heart rate' : ''}, display mode.`,
          effect: 'Thicker layers push echoes later in time (deeper). Soft-tissue boundaries reflect only about 0.04–1 %, but soft tissue → bone reflects about 43 %, so bone gives a very bright echo and a dark shadow behind it.',
        },
      };
    },
    steps(p, c) {
      const mode = p.mode || 'a';
      const ifaceText = c.state.interfaces.split('; ').map((s) => { const [nm, rest] = s.split(': '); const r = (rest || '').split(', ')[1] || ''; return `${nm} ${r}`; }).join('; ');
      const last = mode === 'a' ? { title: 'A-scan: amplitude vs time', text: 'Each echo is a spike; its position gives depth (d = v t / 2) and its height shows how strongly the boundary reflects. Used for eye (ophthalmic) measurements and to find the brain mid-line.' }
        : mode === 'b' ? { title: 'B-scan: sweep the probe', text: 'The probe is moved across the body. Every echo becomes a bright dot at its depth, so the dots from many positions build a 2-D cross-section image.' }
          : { title: 'T-M scan: depth vs time', text: `The probe is held still over the heart. Echo depths are plotted against time, so the moving wall draws a wave with period ${fmt(60 / (p.hr || 72), 3)} s (${p.hr} bpm).` };
      return [
        { title: 'Probe sends a short pulse', text: 'A piezoelectric probe with coupling gel sends a short ultrasonic pulse (v = 1540 m/s) into the body.' },
        { title: 'Echoes at tissue boundaries', text: `Part of the pulse reflects at each boundary: ${ifaceText}.` },
        { title: 'Echo time gives depth', text: 't = 2d/v, so the echo from a deeper boundary arrives later.' },
        last,
        { title: 'Reading the scan', text: mode === 'tm' ? 'Straight lines = still structures; wavy lines = moving structures (heart valves, walls). The wave period gives the heart rate.' : 'Bright echoes = large impedance change (bone). Weak echoes = soft-tissue boundaries. Almost nothing reaches beyond bone (acoustic shadow).' },
      ];
    },
    draw(g, S2) {
      const { p, step, t } = S2; const pr = prog(S2); const k = scanCalc(p); const mode = p.mode || 'a';
      D.clear(g, '#ffffff');
      const top = 110, bot = 520; const dmax = k.total * 1.05;
      const Yd = (d) => top + (d / dmax) * (bot - top);
      const wall = (tt) => (k.tm ? p.amp * Math.sin((2 * Math.PI * p.hr * tt) / 60) : 0);
      TX(g, { a: 'A-scan', b: 'B-scan', tm: 'T-M (M-mode) scan' }[mode], 20, 28, { size: 22, weight: 800 });
      const ifDepth = (i, u, tt) => {
        const f = k.ifs[i]; if (!f) return 0; let d = f.d;
        if (mode === 'b') {
          const s1 = 0.25 * p.fat * Math.sin(Math.PI * u); const s2 = 0.2 * p.muscle * Math.cos(2 * Math.PI * u); const s3 = -0.2 * p.organ * Math.sin(Math.PI * u);
          d += i === 0 ? s1 : i === 1 ? s1 + s2 : s1 + s2 + s3;
        }
        if (k.tm && i >= 1) d += wall(tt);
        return d;
      };
      const lx0 = 30, lx1 = mode === 'b' ? 420 : 250;
      const nL = k.layers.length;
      for (let i = 0; i < nL; i++) {
        const pts = []; const N = 40;
        for (let j = 0; j <= N; j++) { const u = j / N; pts.push([lx0 + (lx1 - lx0) * u, i === 0 ? top : Yd(ifDepth(i - 1, u, t))]); }
        for (let j = N; j >= 0; j--) { const u = j / N; pts.push([lx0 + (lx1 - lx0) * u, i === nL - 1 ? bot : Yd(ifDepth(i, u, t))]); }
        D.poly(g, pts, { fill: TIS[k.layers[i].k].col, close: true, stroke: '#9ca3af', width: 1 });
      }
      D.rect(g, lx0, top, lx1 - lx0, bot - top, { stroke: C.muted, width: 2 });
      if (mode === 'b') {
        k.layers.forEach((l, i) => { const y0 = i === 0 ? top : Yd(ifDepth(i - 1, 0.06, 0)); const y1 = i === nL - 1 ? bot : Yd(ifDepth(i, 0.06, 0)); if (y1 - y0 > 22) TX(g, TIS[l.k].name, lx0 + 8, (y0 + y1) / 2, { size: 16, halo: true }); });
      } else {
        const mids = k.layers.map((l, i) => ((i === 0 ? top : Yd(ifDepth(i - 1, 0.5, t))) + (i === nL - 1 ? bot : Yd(ifDepth(i, 0.5, t)))) / 2);
        const ys = spread(mids, 24, top + 10, bot - 10);
        k.layers.forEach((l, i) => { D.line(g, lx1, mids[i], lx1 + 12, ys[i], { color: C.muted, width: 1.5 }); TX(g, `${TIS[l.k].name}  Z = ${TIS[l.k].Z}`, lx1 + 16, ys[i], { size: 16 }); });
        TX(g, 'Z in MRayl', lx1 + 16, top - 12, { size: 16, color: C.muted });
      }
      const u0 = mode === 'b' ? (step < 3 ? 0.5 : step === 3 ? pr : 1) : 0.5; const pxp = lx0 + 26 + (lx1 - lx0 - 52) * u0;
      D.rect(g, pxp - 26, top - 44, 52, 36, { fill: C.violet, stroke: C.ink, width: 2, r: 5 });
      D.rect(g, pxp - 30, top - 8, 60, 8, { fill: '#7dd3fc' });
      TX(g, 'Probe', pxp + (mode === 'b' && u0 > 0.7 ? -34 : 34), top - 30, { size: 16, weight: 800, color: C.violet, align: mode === 'b' && u0 > 0.7 ? 'right' : 'left' });
      if (mode === 'b' && step >= 3) D.arrow(g, lx0 + 40, top - 58, lx1 - 40, top - 58, { color: C.violet, width: 2.5 });
      if (step === 0) D.focus(g, pxp - 32, top - 48, 64, 52, t);
      const deepest = k.ifs[k.ifs.length - 1].d;
      const uP = (pxp - lx0) / (lx1 - lx0);
      if (step === 0) { const y = top + 10 + 60 * pr; D.line(g, pxp - 20, y, pxp + 20, y, { color: C.amber, width: 5 }); D.arrow(g, pxp, top + 4, pxp, Math.max(top + 20, y - 4), { color: C.amber, width: 2.5, head: 9 }); }
      if (step >= 1) {
        D.line(g, pxp, top, pxp, Yd(ifDepth(k.ifs.length - 1, uP, t)), { color: C.amber, width: 2, dash: [6, 5] });
        const ys = k.ifs.map((f, i) => Yd(ifDepth(i, uP, t)));
        const ly = spread(ys.map((y) => y - 12), 22, top + 10, bot - 10);
        k.ifs.forEach((f, i) => {
          const y = ys[i]; const h = hgtDB(f.dB);
          D.arrow(g, pxp + 6, y - 2, pxp + 14, y - 24, { color: C.orange, width: 1.5 + 3 * h, head: 8 });
          if (step === 1 || step === 2) TX(g, step === 1 ? `R = ${fmt(f.R * 100, 2)} %` : `t = ${fmt(f.t * 1e6, 3)} µs`, pxp - 10, ly[i], { size: 16, align: 'right', weight: 800, halo: true });
        });
        if (step === 1 || step === 2) D.focus(g, pxp - 115, top, 150, Yd(deepest) - top + 10, t);
      }
      const dx0 = 480, dx1 = 970, dy0 = 80;
      if (mode === 'a') {
        const dy1 = 320;
        const tmax = nice(((deepest * 2e-3) / V_TISSUE) * 1e6 * 1.15);
        const P = plot(g, dx0, dy0, dx1 - dx0, dy1 - dy0, { xmin: 0, xmax: tmax, ymin: -0.05, ymax: 1.2, xticks: 4, xlabel: 'time (µs)', bg: '#052e16', border: '#14532d', gridColor: '#14532d', xfmt: (v) => fmt(v, 3), title: 'Echo strength (log scale) vs time' });
        const sig = tmax * 0.008;
        const tEnd = step === 3 ? Math.max(sig * 3, tmax * pr) : step >= 1 ? tmax : sig * 3;
        clipTo(g, dx0, dy0, dx1 - dx0, dy1 - dy0, () => trace(g, P, 0, tEnd, (x) => bump(x, sig * 1.5, 1, sig) + (step >= 1 ? k.ifs.reduce((s, f) => s + bump(x, f.t * 1e6, hgtDB(f.dB), sig), 0) : 0), { color: '#4ade80', n: 700 }));
        k.ifs.forEach((f, i) => { if (step < 1 || f.t * 1e6 > tEnd) return; const x = P.X(f.t * 1e6); const y = Math.max(dy0 + 14, P.Y(hgtDB(f.dB)) - 18); D.circle(g, x, y, 12, { fill: '#fff', stroke: C.orange, width: 2 }); TX(g, String(i + 1), x, y + 1, { size: 16, align: 'center', weight: 800 }); });
        if (step === 3) D.focus(g, dx0, dy0, dx1 - dx0, dy1 - dy0, t);
        TX(g, 'boundary', dx0 + 30, 400, { size: 16, color: C.muted }); TX(g, 'R', dx0 + 370, 400, { size: 16, color: C.muted, align: 'right' }); TX(g, 'echo time', dx1, 400, { size: 16, color: C.muted, align: 'right' });
        k.ifs.forEach((f, i) => {
          const y = 430 + i * 30;
          TX(g, `${i + 1}`, dx0 + 6, y, { size: 17, color: C.orange, weight: 800 });
          TX(g, `${TIS[f.a].name} → ${TIS[f.b].name}`, dx0 + 30, y, { size: 17 });
          TX(g, `${fmt(f.R * 100, 3)} %`, dx0 + 370, y, { size: 17, align: 'right', color: C.orange });
          TX(g, `${fmt(f.t * 1e6, 4)} µs`, dx1, y, { size: 17, align: 'right', color: C.blue });
        });
      } else {
        const iy0 = dy0, iy1 = 400; const IY = (d) => iy0 + (d / dmax) * (iy1 - iy0);
        TX(g, mode === 'b' ? 'B-scan image (brightness = echo strength)' : 'T-M image: depth vs time', dx0, dy0 - 18, { size: 18, weight: 800 });
        D.rect(g, dx0, iy0, dx1 - dx0, iy1 - iy0, { fill: '#0b0b0b', stroke: C.ink, width: 1.5 });
        [0, 0.5, 1].forEach((f) => TX(g, `${fmt(dmax * f, 3)} mm`, dx0 - 6, clamp(IY(dmax * f), iy0 + 8, iy1 - 8), { size: 16, align: 'right', color: C.muted }));
        const doneF = step < 3 ? 0 : step === 3 ? pr : 1;
        if (mode === 'b') {
          const cols = 100; const cw = (dx1 - dx0) / cols;
          for (let j = 0; j < cols * doneF; j++) {
            const u = ((j + 0.5) / cols) * ((lx1 - lx0 - 52) / (lx1 - lx0)) + 26 / (lx1 - lx0);
            k.ifs.forEach((f, i) => { const b = hgtDB(f.dB); g.fillStyle = `rgba(255,255,255,${0.25 + 0.75 * b})`; g.fillRect(dx0 + j * cw, IY(ifDepth(i, u, 0)) - 1 - 2 * b, cw + 0.5, 2 + 4 * b); });
          }
          if (step >= 3 && doneF < 1) D.line(g, dx0 + (dx1 - dx0) * doneF, iy0, dx0 + (dx1 - dx0) * doneF, iy1, { color: C.hi, width: 2 });
          if (step < 3) TX(g, 'image builds as the probe sweeps', (dx0 + dx1) / 2, (iy0 + iy1) / 2, { size: 17, align: 'center', color: '#e5e7eb' });
          TX(g, 'probe position across the body →', (dx0 + dx1) / 2, iy1 + 22, { size: 16, align: 'center', color: C.muted });
        } else {
          const T = 3; const cols = 150; const cw = (dx1 - dx0) / cols;
          for (let j = 0; j < cols * doneF; j++) {
            const tt = ((j + 0.5) / cols) * T;
            k.ifs.forEach((f, i) => { const b = hgtDB(f.dB); g.fillStyle = `rgba(255,255,255,${0.25 + 0.75 * b})`; g.fillRect(dx0 + j * cw, IY(ifDepth(i, 0.5, tt)) - 1 - 2 * b, cw + 0.5, 2 + 4 * b); });
          }
          if (step < 3) TX(g, 'trace is recorded while the probe stays still', (dx0 + dx1) / 2, (iy0 + iy1) / 2, { size: 17, align: 'center', color: '#e5e7eb' });
          [0, 1, 2, 3].forEach((s) => TX(g, `${s} s`, dx0 + ((dx1 - dx0) * s) / 3 + (s === 0 ? 12 : s === 3 ? -12 : 0), iy1 + 18, { size: 16, align: 'center', color: C.muted }));
          TX(g, 'time →', (dx0 + dx1) / 2 + 80, iy1 + 18, { size: 16, align: 'center', color: C.muted });
          if (step >= 4) {
            const Tp = 60 / p.hr; const xa = dx0 + ((dx1 - dx0) * (0.25 * Tp)) / T; const xb = xa + ((dx1 - dx0) * Tp) / T; const y = IY(ifDepth(1, 0.5, 0.25 * Tp)) - 22;
            if (xb <= dx1) { D.arrow(g, (xa + xb) / 2, y, xa, y, { color: C.hi, width: 2.5 }); D.arrow(g, (xa + xb) / 2, y, xb, y, { color: C.hi, width: 2.5 }); TX(g, `T = ${fmt(Tp, 3)} s`, (xa + xb) / 2, y - 16, { size: 16, align: 'center', color: C.hi, weight: 800 }); }
          }
        }
        if (step === 3) D.focus(g, dx0, iy0, dx1 - dx0, iy1 - iy0, t);
        TX(g, k.ifs.map((f, i) => `${i + 1}: R = ${fmt(f.R * 100, 2)} %`).join('   '), dx0 - 60, 470, { size: 17, color: C.orange });
        TX(g, 'v = 1540 m/s,  depth d = v·t/2', dx0 - 60, 500, { size: 17, color: C.muted });
      }
      if (step >= 4) {
        const bone = k.ifs.find((f) => f.b === 'bone');
        if (mode !== 'tm') D.tag(g, bone ? `Bone echo strongest: R = ${fmt(bone.R * 100, 3)} %` : 'Weak soft-tissue echoes only', 720, 28, { bg: bone ? C.red : C.blue, size: 17, align: 'center' });
        else D.tag(g, `Heart rate ${p.hr} bpm → wavy trace`, 720, 28, { bg: C.red, size: 17, align: 'center' });
      }
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 7. Doppler / Fetal Heartbeat Concept Visualizer
  // ─────────────────────────────────────────────────────────────
  const C_T = 1540;
  function dopCalc(p) {
    const f0 = p.f0 * 1e6; const v = p.v * 1e-2; const cs = Math.cos(rad(p.theta));
    return { f0, v, cs, dfMax: (2 * f0 * v * cs) / C_T, T: 60 / p.hr };
  }
  S['ep-fetal-doppler'] = {
    conceptual: true,
    approx: 'Conceptual model: the heart wall moves with a simple sinusoidal velocity v(t) = v·sin(2πt/T); real wall motion is more complex. c = 1540 m/s in soft tissue; attenuation and the mother\'s own tissue motion are ignored.',
    params: [
      { key: 'f0', label: 'Probe frequency f₀', type: 'range', min: 2, max: 3, step: 0.05, default: 2.5, unit: 'MHz' },
      { key: 'v', label: 'Peak heart-wall speed v', type: 'range', min: 1, max: 20, step: 0.5, default: 5, unit: 'cm/s' },
      { key: 'theta', label: 'Beam angle θ (beam vs wall motion)', type: 'range', min: 0, max: 85, step: 1, default: 20, unit: '°' },
      { key: 'hr', label: 'Fetal heart rate', type: 'range', min: 80, max: 200, step: 1, default: 140, unit: 'bpm', help: 'Normal fetal heart rate is about 110–160 bpm.' },
    ],
    examples: [
      { label: 'Normal fetus: 140 bpm, 2.5 MHz probe', values: { f0: 2.5, v: 5, theta: 20, hr: 140 } },
      { label: 'Slow heart rate (≈ 100 bpm)', values: { f0: 2, v: 4, theta: 30, hr: 100 } },
      { label: 'Fast heart rate (≈ 180 bpm)', values: { f0: 3, v: 6, theta: 15, hr: 180 } },
      { label: 'Poor probe angle (θ = 80°)', values: { f0: 2.5, v: 5, theta: 80, hr: 140 } },
    ],
    validate: (p) => (p.theta > 75 ? [`θ = ${p.theta}°: cos θ is small, so the Doppler shift is weak — tilt the probe so the beam is more in line with the wall motion.`] : []),
    compute(p) {
      const k = dopCalc(p); const normal = p.hr >= 110 && p.hr <= 160; const audible = k.dfMax >= 20;
      const formulas = [
        { name: 'Doppler shift from the moving wall', formula: 'Δf = 2 f₀ v cos θ / c', given: `f₀ = ${p.f0} MHz, v = ${p.v} cm/s = ${fmt(k.v, 3)} m/s, θ = ${p.theta}°, c = 1540 m/s`, calc: `Δf = 2 × ${fmt(k.f0, 3)} × ${fmt(k.v, 3)} × ${fmt(k.cs, 3)} / 1540`, result: fmt(k.dfMax, 4), unit: 'hertz (Hz)' },
        { name: 'Received frequency (wall moving towards probe)', formula: 'f = f₀ + Δf', given: `f₀ = ${fmt(k.f0, 4)} Hz`, calc: `${fmt(k.f0, 4)} + ${fmt(k.dfMax, 4)}`, result: `${((k.f0 + k.dfMax) / 1e6).toFixed(6)} MHz`, unit: 'MHz' },
        { name: 'Heartbeat period', formula: 'T = 60 / HR', given: `HR = ${p.hr} bpm`, calc: `T = 60 / ${p.hr}`, result: fmt(k.T, 3), unit: 'second (s)' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'Probe f₀', value: `${p.f0} MHz`, tone: 'info' },
          { label: 'Doppler shift Δf', value: `${fmt(k.dfMax, 3)} Hz`, tone: audible ? 'good' : 'warn' },
          { label: 'Heart rate', value: `${p.hr} bpm`, tone: normal ? 'good' : 'warn' },
          { label: 'Rate check', value: normal ? 'normal (110–160)' : p.hr < 110 ? 'below normal' : 'above normal', tone: normal ? 'good' : 'bad' },
        ],
        state: { probeFrequency_MHz: p.f0, wallSpeed_cm_per_s: p.v, beamAngle_deg: p.theta, dopplerShift_Hz: fmt(k.dfMax, 4), audible: audible ? 'yes' : 'too low', heartRate_bpm: p.hr, period_s: fmt(k.T, 3), rateCheck: normal ? 'normal' : p.hr < 110 ? 'below normal' : 'above normal' },
        explain: {
          what: `The probe sends ${p.f0} MHz ultrasound to the fetal heart. The wall moving at up to ${p.v} cm/s returns an echo shifted by up to ${fmt(k.dfMax, 3)} Hz. The shift rises and falls ${p.hr} times a minute, which the monitor shows as the heart rate.`,
          why: 'A reflector moving towards the probe compresses the reflected waves (higher frequency); moving away stretches them (lower). The shift is doubled because the wall both receives and re-sends the wave. Since v ≪ c, Δf is tiny compared with f₀ — only tens to hundreds of hertz, which lies in the audible range, so the machine simply plays Δf through a loudspeaker.',
          param: 'Probe frequency f₀, wall speed v, beam angle θ and heart rate.',
          effect: 'Δf is proportional to f₀, v and cos θ: a larger angle weakens the signal (Δf = 0 at 90°). Changing the heart rate changes how often the Doppler signal repeats, not its size.',
        },
      };
    },
    steps(p, c) {
      const s = c.state;
      return [
        { title: 'Probe sends ultrasound', text: `A ${p.f0} MHz transducer on the mother's abdomen (with gel) sends a continuous ultrasonic beam.` },
        { title: 'Beam reaches the fetal heart', text: `The beam meets the moving heart wall at θ = ${p.theta}° to its motion.` },
        { title: 'Moving wall shifts the frequency', text: 'Wall moving towards the probe → higher echo frequency; moving away → lower. This is the Doppler effect.' },
        { title: 'Δf is in the audible range', text: `Δf = 2 f₀ v cos θ / c = ${s.dopplerShift_Hz} Hz — the machine mixes the echo with f₀ and plays the difference Δf as sound.` },
        { title: 'Heartbeat waveform and rate', text: `Δf repeats every T = ${s.period_s} s, so the heart rate is ${p.hr} bpm (${s.rateCheck}).` },
      ];
    },
    draw(g, S2) {
      const { p, step, t } = S2; const pr = prog(S2); const k = dopCalc(p);
      D.clear(g, '#ffffff');
      TX(g, 'Fetal heartbeat by Doppler ultrasound', 20, 28, { size: 22, weight: 800 });
      const ax = 230, ay = 340;
      g.save(); g.beginPath(); g.ellipse(ax, ay, 200, 195, 0, Math.PI, 2 * Math.PI); g.lineTo(ax + 200, 545); g.lineTo(ax - 200, 545); g.closePath(); g.fillStyle = '#fde2cf'; g.fill(); g.strokeStyle = '#c2410c'; g.lineWidth = 2.5; g.stroke(); g.restore();
      g.save(); g.beginPath(); g.ellipse(ax, ay + 60, 150, 135, 0, 0, Math.PI * 2); g.fillStyle = '#fecdd3'; g.fill(); g.strokeStyle = '#e11d48'; g.lineWidth = 2; g.stroke(); g.restore();
      TX(g, "Mother's abdomen", 40, 530, { size: 16, color: '#9a3412' });
      TX(g, 'Uterus', ax + 95, ay + 150, { size: 16, color: '#be123c' });
      const hx = ax, hy = 400; const beat = 1 + 0.12 * Math.max(0, Math.sin((2 * Math.PI * t) / k.T));
      g.save(); g.translate(hx, hy); g.scale(1.3 * beat, 1.3 * beat); g.beginPath(); g.moveTo(0, 12); g.bezierCurveTo(-30, -8, -18, -30, 0, -14); g.bezierCurveTo(18, -30, 30, -8, 0, 12); g.fillStyle = '#dc2626'; g.fill(); g.restore();
      TX(g, 'Fetal heart', hx + 36, hy + 30, { size: 16, weight: 800, color: '#991b1b' });
      const py = 145;
      D.rect(g, ax - 22, py - 50, 44, 50, { fill: C.violet, stroke: C.ink, width: 2, r: 6 });
      D.rect(g, ax - 28, py - 2, 56, 8, { fill: '#7dd3fc' });
      TX(g, `Probe f₀ = ${p.f0} MHz`, ax + 32, py - 32, { size: 17, weight: 800, color: C.violet });
      TX(g, 'gel', ax - 34, py + 4, { size: 16, align: 'right', color: '#0369a1' });
      if (step === 0) D.focus(g, ax - 30, py - 54, 60, 64, t);
      const b0 = py + 8, b1 = hy - 24; const yEnd = b0 + (b1 - b0) * (step === 0 ? pr : 1);
      if (yEnd > b0 + 1) clipTo(g, ax - 40, b0, 80, yEnd - b0, () => { for (let y = b0 + ((t * 40) % 16); y < yEnd; y += 16) D.line(g, ax - 14, y, ax + 14, y, { color: C.blue, width: 2.5, alpha: 0.85 }); });
      TX(g, 'f₀', ax - 22, (b0 + b1) / 2 - 30, { size: 18, align: 'right', color: C.blue, weight: 800 });
      if (step >= 2) {
        clipTo(g, ax + 20, b0, 60, b1 - b0, () => { for (let y = b1 - ((t * 40) % 13); y > b0; y -= 13) D.line(g, ax + 30, y, ax + 56, y, { color: C.orange, width: 2.5 }); });
        D.arrow(g, ax + 43, b1 - 10, ax + 43, b0 + 30, { color: C.orange, width: 3 });
        TX(g, 'echo f₀ ± Δf', ax + 64, (b0 + b1) / 2 + 20, { size: 16, weight: 800, color: C.orange, halo: true });
        if (step === 2) D.focus(g, ax + 18, b0 + 10, 160, b1 - b0 - 10, t);
      }
      if (step >= 1) {
        const th = rad(p.theta); const L = 60; const dx = L * Math.sin(th), dy = L * Math.cos(th);
        D.arrow(g, hx, hy, hx - dx, hy - dy, { color: C.green, width: 3 }); D.arrow(g, hx, hy, hx + dx, hy + dy, { color: C.green, width: 3 });
        TX(g, 'wall motion', hx + dx + 8, hy + dy + 12, { size: 16, weight: 800, color: C.green, halo: true });
        if (p.theta > 0) arcDeg(g, hx, hy, 40, -Math.PI / 2 - th, -Math.PI / 2, C.ink);
        TX(g, `θ = ${p.theta}°`, hx - 50, hy - 58, { size: 16, weight: 800, halo: true, align: 'right' });
        if (step === 1) D.focus(g, hx - 110, hy - 75, 200, 150, t);
      }
      const x0 = 520, w = 450, y0 = 90, h = 200; const Tt = 3;
      const ym = Math.max(k.dfMax * 1.3, 1);
      if (step >= 2) {
        const P = plot(g, x0, y0, w, h, { xmin: 0, xmax: Tt, ymin: -ym, ymax: ym, xticks: 3, xfmt: (v) => `${fmt(v, 2)} s`, xlabel: 'time', title: 'Doppler shift Δf vs time' });
        D.line(g, x0, P.Y(0), x0 + w, P.Y(0), { color: C.faint, width: 1.5 });
        TX(g, `+${fmt(k.dfMax, 3)} Hz`, x0 - 6, P.Y(k.dfMax), { size: 16, align: 'right', color: C.muted });
        TX(g, `−${fmt(k.dfMax, 3)} Hz`, x0 - 6, P.Y(-k.dfMax), { size: 16, align: 'right', color: C.muted });
        TX(g, '0', x0 - 6, P.Y(0), { size: 16, align: 'right', color: C.muted });
        const tEnd = step === 2 ? Math.max(0.02, Tt * pr) : Tt;
        clipTo(g, x0, y0, w, h, () => trace(g, P, 0, tEnd, (x) => k.dfMax * Math.sin((2 * Math.PI * x) / k.T), { color: C.red, n: 500 }));
        if (step >= 4) {
          const t1 = k.T / 4, t2 = t1 + k.T; const yy = P.Y(k.dfMax) - 12;
          D.arrow(g, (P.X(t1) + P.X(t2)) / 2, yy, P.X(t1), yy, { width: 2 }); D.arrow(g, (P.X(t1) + P.X(t2)) / 2, yy, P.X(t2), yy, { width: 2 });
          D.tag(g, `T = ${fmt(k.T, 3)} s`, P.X(t2) + 8, yy, { bg: C.ink, size: 16, align: 'left' });
          D.focus(g, x0, y0, w, h, t);
        } else {
          TX(g, '+ : wall towards probe', x0 + w - 8, y0 + 16, { size: 16, align: 'right', color: C.muted, halo: true });
        }
        TX(g, '− : wall away from probe', x0 + w - 8, y0 + h - 16, { size: 16, align: 'right', color: C.muted, halo: true });
      } else {
        D.rect(g, x0, y0, w, h, { fill: '#f8fafc', stroke: C.line, r: 6 });
        TX(g, 'The Doppler signal appears when the', x0 + w / 2, y0 + h / 2 - 14, { size: 17, align: 'center', color: C.muted });
        TX(g, 'echo from the moving wall returns', x0 + w / 2, y0 + h / 2 + 14, { size: 17, align: 'center', color: C.muted });
      }
      const iy = 370;
      TX(g, `f₀ = ${p.f0} MHz,  v = ${p.v} cm/s,  c = 1540 m/s`, x0, iy, { size: 17 });
      if (step >= 3) {
        stepTag(g, `Δf = 2f₀v cosθ / c = ${fmt(k.dfMax, 3)} Hz`, x0, iy + 40, C.blue, 'left');
        TX(g, k.dfMax >= 20 ? '✓ audible (20 Hz – 20 kHz) → heard as sound' : '✗ below 20 Hz — too low to hear', x0, iy + 80, { size: 17, color: k.dfMax >= 20 ? C.green : C.red, weight: 800 });
        if (step === 3) D.focus(g, x0 - 4, iy + 22, w, 76, t);
      }
      if (step >= 4) {
        const normal = p.hr >= 110 && p.hr <= 160;
        stepTag(g, `Heart rate = 60 / T = ${p.hr} bpm`, x0, iy + 125, normal ? C.green : C.red, 'left');
        TX(g, normal ? 'normal: 110–160 bpm' : 'outside 110–160 bpm', x0 + 4, iy + 155, { size: 16, color: normal ? C.green : C.red, align: 'left' });
      }
    },
  };
})();
