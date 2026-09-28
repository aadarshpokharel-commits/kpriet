'use strict';

/* Engineering Physics — Unit 2: Fiber Optics. */
(function () {
  const S = (window.EPSims = window.EPSims || {});
  const D = window.EPDraw;
  const { C, fmt, rad, deg, clamp } = D;

  /** Snell / Fresnel helpers shared by the fibre simulations. */
  const Optics = {
    critical: (n1, n2) => (n1 > n2 ? deg(Math.asin(n2 / n1)) : null),
    refract: (n1, n2, thetaDeg) => { const s = (n1 * Math.sin(rad(thetaDeg))) / n2; return s >= 1 ? null : deg(Math.asin(s)); },
    reflectance(n1, n2, thetaDeg) {
      const ti = rad(thetaDeg); const s = (n1 * Math.sin(ti)) / n2; if (s >= 1) return 1;
      const tt = Math.asin(s); const ci = Math.cos(ti); const ct = Math.cos(tt);
      const rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct); const rp = (n2 * ci - n1 * ct) / (n2 * ci + n1 * ct);
      return (rs * rs + rp * rp) / 2;
    },
    na: (n1, n2) => (n1 > n2 ? Math.sqrt(n1 * n1 - n2 * n2) : 0),
  };
  window.EPOptics = Optics;

  /** Point at fraction f along a polyline. */
  function along(pts, f) {
    const segs = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
    let d = clamp(f, 0, 1) * total;
    for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const k = segs[i] ? d / segs[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } d -= segs[i]; }
    return pts[pts.length - 1];
  }
  /** Draws the first fraction f of a polyline. */
  function partial(g, pts, f, o) {
    const segs = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
    let d = clamp(f, 0, 1) * total; const out = [pts[0]];
    for (let i = 0; i < segs.length && d > 0; i++) { if (d >= segs[i]) { out.push(pts[i + 1]); d -= segs[i]; } else { const k = d / segs[i]; out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]); d = 0; } }
    D.poly(g, out, o);
  }
  window.EPPath = { along, partial };

  // ─────────────────────────────────────────────────────────────
  // 1. Total Internal Reflection Simulator (reference implementation)
  // ─────────────────────────────────────────────────────────────
  S['ep-tir'] = {
    modes: [{ key: 'boundary', label: 'Single boundary' }, { key: 'fiber', label: 'Inside a fibre' }],
    params: [
      { key: 'theta', label: 'Incident angle θ (from the normal)', type: 'range', min: 0, max: 89, step: 0.5, default: 75, unit: '°', help: 'Angle between the ray and the normal at the core–cladding boundary.' },
      { key: 'n1', label: 'Core refractive index n₁', type: 'range', min: 1.30, max: 1.70, step: 0.01, default: 1.48 },
      { key: 'n2', label: 'Cladding refractive index n₂', type: 'range', min: 1.00, max: 1.65, step: 0.01, default: 1.46 },
      { key: 'showNormal', label: 'Show normal and angles', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Silica fibre, steep ray (TIR)', values: { n1: 1.48, n2: 1.46, theta: 84 } },
      { label: 'Silica fibre, ray below θc (leaks)', values: { n1: 1.48, n2: 1.46, theta: 70 } },
      { label: 'Glass → air (θc ≈ 41.8°)', values: { n1: 1.50, n2: 1.00, theta: 50 } },
      { label: 'Water → air (θc ≈ 48.8°)', values: { n1: 1.33, n2: 1.00, theta: 40 } },
    ],
    validate: (p) => (p.n1 <= p.n2 ? ['n₁ must be greater than n₂ for total internal reflection — light is going into a denser (or equal) medium, so it always refracts.'] : []),
    compute(p) {
      const tc = Optics.critical(p.n1, p.n2);
      const tir = tc != null && p.theta > tc;
      const tr = Optics.refract(p.n1, p.n2, p.theta);
      const R = Optics.reflectance(p.n1, p.n2, p.theta);
      const formulas = [
        { name: 'Critical angle', formula: 'θc = sin⁻¹(n₂ / n₁)', given: `n₁ = ${p.n1.toFixed(2)}, n₂ = ${p.n2.toFixed(2)}`,
          calc: tc != null ? `θc = sin⁻¹(${p.n2.toFixed(2)} / ${p.n1.toFixed(2)}) = sin⁻¹(${(p.n2 / p.n1).toFixed(4)})` : 'n₂ / n₁ ≥ 1, so sin⁻¹ has no value',
          result: tc != null ? fmt(tc, 4) : 'No critical angle', unit: tc != null ? 'degrees (°)' : '—' },
        { name: "Snell's law at the boundary", formula: 'n₁ sin θ₁ = n₂ sin θ₂', given: `θ₁ = ${p.theta}°`,
          calc: `sin θ₂ = ${p.n1.toFixed(2)} × sin ${p.theta}° / ${p.n2.toFixed(2)} = ${((p.n1 * Math.sin(rad(p.theta))) / p.n2).toFixed(4)}`,
          result: tr != null ? `θ₂ = ${fmt(tr, 4)}` : 'sin θ₂ > 1 → no refracted ray (TIR)', unit: tr != null ? 'degrees (°)' : '—' },
        { name: 'Comparison', formula: 'TIR when n₁ > n₂ and θ > θc', given: `θ = ${p.theta}°, θc = ${tc != null ? fmt(tc, 4) + '°' : '—'}`,
          calc: tc != null ? `${p.theta}° ${tir ? '>' : '≤'} ${fmt(tc, 4)}°` : 'n₁ ≤ n₂', result: tir ? 'TIR: YES' : 'TIR: NO', unit: '—' },
      ];
      const readouts = [
        { label: 'Incident angle', value: `${p.theta}°`, tone: 'info' },
        { label: 'Critical angle', value: tc != null ? `${fmt(tc, 4)}°` : 'none' },
        { label: 'Reflected power', value: `${fmt(R * 100, 3)} %` },
        { label: 'TIR', value: tir ? 'YES' : 'NO', tone: tir ? 'good' : 'bad' },
      ];
      return {
        formulas, readouts,
        state: { incidentAngle: `${p.theta}°`, criticalAngle: tc != null ? `${fmt(tc, 4)}°` : 'none (n₁ ≤ n₂)', refractedAngle: tr != null ? `${fmt(tr, 4)}°` : 'none', reflectedPower: `${fmt(R * 100, 3)} %`, TIR: tir ? 'YES' : 'NO', n1: p.n1, n2: p.n2 },
        explain: {
          what: tir ? `The ray hits the core–cladding boundary at ${p.theta}°, which is larger than the critical angle ${fmt(tc, 4)}°, so all of the light is reflected back into the core.` : tc != null ? `The ray hits the boundary at ${p.theta}°, below the critical angle ${fmt(tc, 4)}°. Part of the light refracts into the cladding at ${fmt(tr, 4)}° and only ${fmt(R * 100, 3)} % is reflected.` : 'Light is going from a less dense (or equal) medium into a denser one, so it always refracts — there is no critical angle.',
          why: "Snell's law n₁ sin θ₁ = n₂ sin θ₂ needs sin θ₂ = (n₁/n₂) sin θ₁. When this is greater than 1 there is no refracted angle, so the energy has nowhere to go but back into the core.",
          param: 'Incident angle θ, core index n₁ and cladding index n₂.',
          effect: 'Increasing θ past θc switches refraction to total internal reflection. Increasing n₁ or decreasing n₂ lowers θc, so more rays are trapped.',
        },
      };
    },
    steps(p, c) {
      const tir = c.state.TIR === 'YES';
      return [
        { title: p.mode === 'fiber' ? 'Light enters the fibre' : 'Light travels in the denser medium', text: `The ray travels through the core (n₁ = ${p.n1.toFixed(2)}).` },
        { title: 'The ray reaches the core–cladding boundary', text: `It meets the boundary at θ = ${p.theta}° from the normal.` },
        { title: 'Compare the incident angle with the critical angle', text: c.state.criticalAngle === 'none (n₁ ≤ n₂)' ? 'n₁ ≤ n₂, so there is no critical angle.' : `θc = sin⁻¹(n₂/n₁) = ${c.state.criticalAngle}. θ is ${tir ? 'greater' : 'not greater'} than θc.` },
        { title: tir ? 'Total internal reflection occurs' : 'Refraction — light leaks into the cladding', text: tir ? 'All the light is reflected back into the core (angle of reflection = angle of incidence).' : `The refracted ray leaves at ${c.state.refractedAngle}; only ${c.state.reflectedPower} is reflected.` },
        { title: tir ? 'The ray continues through the fibre' : 'The signal becomes weaker', text: tir ? 'The ray keeps reflecting at each boundary and is guided along the core.' : 'At every reflection more light escapes, so the ray is not guided.' },
      ];
    },
    draw(g, S2) {
      const { p, c, step, st, t, dur } = S2;
      const prog = clamp(st / dur, 0, 1);
      const tc = Optics.critical(p.n1, p.n2); const tir = c.state.TIR === 'YES';
      const tr = Optics.refract(p.n1, p.n2, p.theta); const R = Optics.reflectance(p.n1, p.n2, p.theta);
      D.clear(g, '#ffffff');
      if (p.mode === 'fiber') return drawFiber(g, p, step, prog, t, tc, tir, R);
      // Single boundary: core above, cladding below
      const Y = 330; const O = [500, Y];
      D.rect(g, 0, 0, 1000, Y, { fill: '#dbeafe' }); D.rect(g, 0, Y, 1000, 560 - Y, { fill: '#f0f9ff' });
      D.line(g, 0, Y, 1000, Y, { color: '#1e3a8a', width: 3 });
      D.text(g, `Core (denser)  n₁ = ${p.n1.toFixed(2)}`, 20, 30, { size: 17, weight: 800, color: '#1e3a8a' });
      D.text(g, `Cladding (rarer)  n₂ = ${p.n2.toFixed(2)}`, 20, Y + 30, { size: 17, weight: 800, color: '#0369a1' });
      const L = 300; const th = rad(p.theta);
      const A = [O[0] - L * Math.sin(th), Y - L * Math.cos(th)];
      const Rf = [O[0] + L * Math.sin(th), Y - L * Math.cos(th)];
      const Tr = tr != null ? [O[0] + 230 * Math.sin(rad(tr)), Y + 230 * Math.cos(rad(tr))] : null;
      if (p.showNormal) { D.line(g, 500, Y - 290, 500, Y + 210, { color: C.muted, width: 2, dash: [8, 7] }); D.text(g, 'Normal', 508, 44, { size: 14, color: C.muted }); }
      // critical angle guide
      if (tc != null && step >= 2) {
        const tcr = rad(tc);
        D.line(g, 500, Y, 500 - 290 * Math.sin(tcr), Y - 290 * Math.cos(tcr), { color: C.amber, width: 2.5, dash: [5, 6] });
        D.line(g, 500, Y, 500 + 290 * Math.sin(tcr), Y - 290 * Math.cos(tcr), { color: C.amber, width: 2.5, dash: [5, 6], alpha: 0.5 });
        D.tag(g, `θc = ${fmt(tc, 4)}°`, 500 - 290 * Math.sin(tcr) - 10, Y - 290 * Math.cos(tcr) - 16, { bg: C.amber, size: 14, align: 'right' });
      }
      // incident ray
      const incF = step === 0 ? prog : 1;
      const ix = A[0] + (O[0] - A[0]) * incF; const iy = A[1] + (O[1] - A[1]) * incF;
      D.line(g, A[0], A[1], ix, iy, { color: C.laser, width: 5 });
      if (incF < 1) D.circle(g, ix, iy, 8, { fill: C.laser });
      else D.arrow(g, A[0], A[1], A[0] + (O[0] - A[0]) * 0.55, A[1] + (O[1] - A[1]) * 0.55, { color: C.laser, width: 5, head: 16 });
      if (step >= 1 && p.showNormal) {
        arc(g, 500, Y, 70, -Math.PI / 2 - th, -Math.PI / 2, C.laser); D.text(g, `θ = ${p.theta}°`, 500 - 80 * Math.sin(th / 2) - 20, Y - 80 * Math.cos(th / 2) - 14, { size: 16, weight: 800, color: C.laser, align: 'right', halo: true });
      }
      if (step === 1) D.focus(g, 440, Y - 50, 120, 100, t);
      if (step === 2) {
        D.tag(g, tc == null ? 'n₁ ≤ n₂ → no critical angle' : `θ = ${p.theta}°  ${tir ? '>' : '≤'}  θc = ${fmt(tc, 4)}°`, 750, 120, { bg: tir ? C.green : C.red, size: 18, align: 'center' });
      }
      if (step >= 3) {
        const f = step === 3 ? prog : 1;
        // reflected
        const rw = 1.5 + 4.5 * R;
        D.line(g, O[0], O[1], O[0] + (Rf[0] - O[0]) * f, O[1] + (Rf[1] - O[1]) * f, { color: C.laser, width: rw, alpha: 0.35 + 0.65 * R });
        if (f >= 1) D.arrow(g, O[0], O[1], O[0] + (Rf[0] - O[0]) * 0.6, O[1] + (Rf[1] - O[1]) * 0.6, { color: C.laser, width: rw, head: 14, alpha: 0.35 + 0.65 * R });
        if (Tr) {
          const tw = 1.5 + 4.5 * (1 - R);
          D.line(g, O[0], O[1], O[0] + (Tr[0] - O[0]) * f, O[1] + (Tr[1] - O[1]) * f, { color: C.orange, width: tw });
          if (p.showNormal) { arc(g, 500, Y, 60, Math.PI / 2 - rad(tr), Math.PI / 2, C.orange); D.text(g, `θ₂ = ${fmt(tr, 4)}°`, 520 + 70 * Math.sin(rad(tr) / 2), Y + 80, { size: 16, weight: 800, color: C.orange, halo: true }); }
          D.text(g, 'Refracted ray (light leaks out)', Tr[0] + 10, Tr[1] - 10, { size: 15, color: C.orange, weight: 800 });
        }
        D.text(g, tir ? 'Totally reflected ray' : `Partly reflected (${fmt(R * 100, 3)} %)`, Rf[0] - 10, Rf[1] - 18, { size: 15, weight: 800, color: C.laser, align: 'right', halo: true });
        D.tag(g, tir ? 'TIR: YES' : 'TIR: NO', 880, 40, { bg: tir ? C.green : C.red, size: 20, align: 'center' });
      }
      if (step >= 4) {
        const k = (t * 0.35) % 1; const pt = k < 0.5 ? [A[0] + (O[0] - A[0]) * k * 2, A[1] + (O[1] - A[1]) * k * 2] : [O[0] + (Rf[0] - O[0]) * (k - 0.5) * 2, O[1] + (Rf[1] - O[1]) * (k - 0.5) * 2];
        D.circle(g, pt[0], pt[1], 7, { fill: '#fff', stroke: C.laser, width: 3 });
      }
    },
  };

  function arc(g, x, y, r, a0, a1, color) {
    g.save(); g.beginPath(); g.arc(x, y, r, Math.min(a0, a1), Math.max(a0, a1)); g.strokeStyle = color; g.lineWidth = 2.5; g.stroke(); g.restore();
  }
  window.EPArc = arc;

  function drawFiber(g, p, step, prog, t, tc, tir, R) {
    const top = 200; const bot = 360; const x0 = 90; const x1 = 960;
    D.rect(g, 40, top - 70, 940, 70, { fill: '#e0f2fe' }); D.rect(g, 40, bot, 940, 70, { fill: '#e0f2fe' });
    D.rect(g, 40, top, 940, bot - top, { fill: '#bae6fd' });
    D.line(g, 40, top, 980, top, { color: '#0369a1', width: 2 }); D.line(g, 40, bot, 980, bot, { color: '#0369a1', width: 2 });
    D.text(g, `Cladding n₂ = ${p.n2.toFixed(2)}`, 60, top - 40, { size: 15, weight: 800, color: '#0369a1' });
    D.text(g, `Core n₁ = ${p.n1.toFixed(2)}`, 60, (top + bot) / 2 - 58, { size: 15, weight: 800, color: '#1e3a8a' });
    D.text(g, `Cladding n₂ = ${p.n2.toFixed(2)}`, 60, bot + 40, { size: 15, weight: 800, color: '#0369a1' });
    // ray: angle to the axis = 90° − θ
    const phi = rad(90 - p.theta); const pts = [[x0, (top + bot) / 2]]; let x = x0; let y = (top + bot) / 2; let dir = -1; let power = 1; const powers = [1]; let leak = null;
    for (let i = 0; i < 40 && x < x1; i++) {
      const yT = dir < 0 ? top : bot; const dx = Math.abs(yT - y) / Math.max(1e-3, Math.tan(phi));
      if (x + dx > x1) { pts.push([x1, y + (dir * (x1 - x) * Math.tan(phi))]); powers.push(power); break; }
      x += dx; y = yT; pts.push([x, y]);
      if (!tir && !leak) leak = [x, y, dir];
      power *= tir ? 1 : R; powers.push(power); dir = -dir;
      if (power < 0.02) break;
    }
    const f = step === 0 ? prog * 0.18 : step === 1 ? 0.18 + prog * 0.07 : step >= 4 ? 1 : 0.25 + (step === 3 ? prog * 0.2 : 0);
    // colour segments by power
    const segs = [];
    for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1], pts[i], powers[i - 1]]);
    const total = segs.reduce((s, [a, b]) => s + Math.hypot(b[0] - a[0], b[1] - a[1]), 0); let dleft = f * total;
    segs.forEach(([a, b, pw]) => {
      if (dleft <= 0) return; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); const k = Math.min(1, dleft / l); dleft -= l;
      D.line(g, a[0], a[1], a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, { color: C.laser, width: 1.5 + 4 * pw, alpha: 0.25 + 0.75 * pw });
    });
    const first = pts[1];
    if (first && step >= 1) {
      D.line(g, first[0], first[1] - 60, first[0], first[1] + 60, { color: C.muted, width: 2, dash: [6, 6] });
      D.text(g, `θ = ${p.theta}°`, first[0] + 10, first[1] + (first[1] === top ? 30 : -30), { size: 15, weight: 800, color: C.laser, halo: true });
      if (step === 1) D.focus(g, first[0] - 50, first[1] - 40, 100, 80, t);
    }
    if (step >= 2) D.tag(g, tc == null ? 'n₁ ≤ n₂ → no critical angle' : `θ = ${p.theta}°  ${tir ? '>' : '≤'}  θc = ${fmt(tc, 4)}°`, 500, 80, { bg: tir ? C.green : C.red, size: 18, align: 'center' });
    if (step >= 3 && leak) {
      const tr = Optics.refract(p.n1, p.n2, p.theta);
      if (tr != null) { const ex = leak[0] + 70 * Math.sin(rad(tr)); const ey = leak[1] + leak[2] * 70 * Math.cos(rad(tr)); D.arrow(g, leak[0], leak[1], ex, ey, { color: C.orange, width: 3 }); D.text(g, 'Light leaks into the cladding', ex + 8, ey, { size: 14, weight: 800, color: C.orange, halo: true }); }
    }
    D.tag(g, tir ? 'TIR: YES — light is guided' : 'TIR: NO — light escapes', 830, 500, { bg: tir ? C.green : C.red, size: 16, align: 'center' });
    if (step >= 4 && tir) { const k = (t * 0.12) % 1; const q = along(pts, k); D.circle(g, q[0], q[1], 7, { fill: '#fff', stroke: C.laser, width: 3 }); }
  }
  // ═════════════════════════════════════════════════════════════
  // Shared helpers for the Unit-2 fibre simulations
  // ═════════════════════════════════════════════════════════════
  const CL = 2.998e8; // speed of light, m/s
  const nf = (v) => String(Number(Number(v).toFixed(4)));
  const nParam = (key, label, min, max, def, help) => ({ key, label, type: 'range', min, max, step: 0.001, default: def, help });
  const nWarn = (p) => (p.n1 <= p.n2 ? ['n₁ must be greater than n₂: with n₁ ≤ n₂ there is no critical angle, no total internal reflection and no guiding (NA = 0).'] : []);
  /** Time with an automatic unit. */
  function tfmt(s) {
    const a = Math.abs(s);
    if (a === 0) return '0 s';
    if (a < 1e-9) return `${fmt(s * 1e12, 3)} ps`;
    if (a < 1e-6) return `${fmt(s * 1e9, 3)} ns`;
    if (a < 1e-3) return `${fmt(s * 1e6, 3)} µs`;
    return `${fmt(s * 1e3, 3)} ms`;
  }
  /** Zig-zag ray between two horizontal boundaries. ang = angle to the axis (rad), dir = +1 downwards, −1 upwards. */
  function zig(xs, ys, xe, top, bot, ang, dir) {
    const pts = [[xs, ys]]; const tn = Math.tan(Math.abs(ang)); let x = xs; let y = ys;
    if (tn < 1e-4) { pts.push([xe, ys]); return pts; }
    for (let i = 0; i < 300; i++) {
      const yT = dir < 0 ? top : bot; const dx = Math.abs(yT - y) / tn;
      if (x + dx >= xe) { pts.push([xe, y + dir * (xe - x) * tn]); break; }
      x += dx; y = yT; pts.push([x, y]); dir = -dir;
    }
    return pts;
  }
  function pathLen(pts, n) { let s = 0; for (let i = 1; i < Math.min(pts.length, n == null ? pts.length : n + 1); i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
  /** Draws the first `dist` pixels of a polyline, each segment with its own power (0..1) → width/alpha. */
  function powerPath(g, pts, powers, dist, color, wmax) {
    let d = dist; const w = wmax || 5;
    for (let i = 1; i < pts.length && d > 0; i++) {
      const a = pts[i - 1]; const b = pts[i]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); const k = l ? Math.min(1, d / l) : 1; d -= l;
      const pw = powers ? powers[i - 1] : 1;
      D.line(g, a[0], a[1], a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, { color, width: 1.5 + (w - 1.5) * pw, alpha: 0.25 + 0.75 * pw });
    }
  }
  /** Horizontal fibre: cladding–core–cladding. */
  function fibreBody(g, x0, x1, yc, hc, hcl, o = {}) {
    D.rect(g, x0, yc - hc - hcl, x1 - x0, hcl, { fill: '#e0f2fe' }); D.rect(g, x0, yc + hc, x1 - x0, hcl, { fill: '#e0f2fe' });
    D.rect(g, x0, yc - hc, x1 - x0, 2 * hc, { fill: o.coreFill || '#bae6fd' });
    D.line(g, x0, yc - hc, x1, yc - hc, { color: '#0369a1', width: 2 }); D.line(g, x0, yc + hc, x1, yc + hc, { color: '#0369a1', width: 2 });
    D.line(g, x0, yc - hc - hcl, x1, yc - hc - hcl, { color: '#7dd3fc', width: 1.5 }); D.line(g, x0, yc + hc + hcl, x1, yc + hc + hcl, { color: '#7dd3fc', width: 1.5 });
    if (o.face) D.line(g, x0, yc - hc - hcl, x0, yc + hc + hcl, { color: '#1e3a8a', width: 3 });
    if (o.clad) D.text(g, o.clad, x1 - 12, yc - hc - hcl / 2, { size: 16, weight: 800, color: '#0369a1', align: 'right' });
    if (o.core) D.text(g, o.core, x1 - 12, yc + hc - 16, { size: 16, weight: 800, color: '#1e3a8a', align: 'right', halo: true });
  }
  /** Gaussian-like pulse. */
  function pulse(g, xc, base, sigma, amp, color, o = {}) {
    const pts = []; const s = Math.max(2, sigma);
    for (let x = xc - 3.5 * s; x <= xc + 3.5 * s; x += Math.max(1, s / 12)) pts.push([x, base - amp * Math.exp(-((x - xc) ** 2) / (2 * s * s))]);
    D.poly(g, [[pts[0][0], base], ...pts, [pts[pts.length - 1][0], base]], { fill: o.fill || color, alpha: 0.25, stroke: false, close: true });
    D.poly(g, pts, { stroke: color, width: 3 });
  }
  const tirTag = (g, tir, x, y, size, extra) => D.tag(g, `TIR: ${tir ? 'YES' : 'NO'}${extra ? ' — ' + extra : ''}`, x, y, { bg: tir ? C.green : C.red, size: size || 20, align: 'center' });

  // ─────────────────────────────────────────────────────────────
  // 2. Acceptance Angle Simulator
  // ─────────────────────────────────────────────────────────────
  function accCalc(p) {
    const n0 = Number(p.n0) || 1; const n1 = p.n1; const n2 = p.n2; const th = p.theta;
    const tc = Optics.critical(n1, n2); const NA = Optics.na(n1, n2);
    const sa = NA / n0; const ta = tc == null ? 0 : sa >= 1 ? 90 : deg(Math.asin(sa));
    const tr = deg(Math.asin(clamp((n0 * Math.sin(rad(th))) / n1, 0, 1)));
    const phi = 90 - tr; const tir = tc != null && phi >= tc - 1e-9;
    const R = tir ? 1 : Optics.reflectance(n1, n2, phi);
    const tt = tir ? null : Optics.refract(n1, n2, phi);
    return { n0, n1, n2, th, tc, NA, sa, ta, tr, phi, tir, R, tt };
  }
  S['ep-acceptance-angle'] = {
    params: [
      { key: 'theta', label: 'Launch angle θᵢ (from the fibre axis)', type: 'range', min: 0, max: 60, step: 0.5, default: 10, unit: '°', help: 'Angle between the incoming ray and the fibre axis, measured outside the fibre at the end face.' },
      { key: 'n0', label: 'Outside medium n₀', type: 'select', options: [{ value: 1, label: 'Air (n₀ = 1.00)' }, { value: 1.33, label: 'Water (n₀ = 1.33)' }], default: 1 },
      nParam('n1', 'Core refractive index n₁', 1.40, 1.70, 1.48),
      nParam('n2', 'Cladding refractive index n₂', 1.30, 1.65, 1.46),
      { key: 'showCone', label: 'Show acceptance cone', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Silica multimode fibre — ray inside the cone', values: { n1: 1.48, n2: 1.46, n0: 1, theta: 10 } },
      { label: 'Same fibre — ray outside the cone (leaks)', values: { n1: 1.48, n2: 1.46, n0: 1, theta: 20 } },
      { label: 'Plastic optical fibre (PMMA, NA ≈ 0.5)', values: { n1: 1.49, n2: 1.402, n0: 1, theta: 25 } },
      { label: 'Silica fibre dipped in water (cone shrinks)', values: { n1: 1.48, n2: 1.46, n0: 1.33, theta: 12 } },
    ],
    validate(p) {
      const w = nWarn(p); const q = accCalc(p);
      if (!w.length && q.sa >= 1) w.push(`NA = ${fmt(q.NA, 3)} ≥ n₀ = ${q.n0}: every ray that enters the end face is guided (θa = 90°).`);
      return w;
    },
    compute(p) {
      const q = accCalc(p);
      const formulas = [
        { name: 'Critical angle (core–cladding)', formula: 'θc = sin⁻¹(n₂ / n₁)', given: `n₁ = ${nf(q.n1)}, n₂ = ${nf(q.n2)}`,
          calc: q.tc != null ? `θc = sin⁻¹(${nf(q.n2)} / ${nf(q.n1)}) = sin⁻¹(${(q.n2 / q.n1).toFixed(4)})` : 'n₂ / n₁ ≥ 1 → no critical angle', result: q.tc != null ? fmt(q.tc, 4) : 'none', unit: q.tc != null ? 'degrees (°)' : '—' },
        { name: 'Numerical aperture', formula: 'NA = √(n₁² − n₂²)', given: `n₁ = ${nf(q.n1)}, n₂ = ${nf(q.n2)}`,
          calc: `NA = √(${nf(q.n1)}² − ${nf(q.n2)}²) = √(${(q.n1 * q.n1 - q.n2 * q.n2).toFixed(4)})`, result: fmt(q.NA, 3), unit: 'no unit' },
        { name: 'Acceptance angle', formula: 'sin θa = NA / n₀ = √(n₁² − n₂²) / n₀', given: `NA = ${fmt(q.NA, 3)}, n₀ = ${q.n0}`,
          calc: q.sa >= 1 ? `NA / n₀ = ${fmt(q.sa, 3)} ≥ 1 → every entering ray is accepted` : `θa = sin⁻¹(${fmt(q.NA, 3)} / ${q.n0}) = sin⁻¹(${q.sa.toFixed(4)})`, result: fmt(q.ta, 4), unit: 'degrees (°)' },
        { name: "Snell's law at the end face", formula: 'n₀ sin θᵢ = n₁ sin θr', given: `θᵢ = ${q.th}°`,
          calc: `sin θr = ${q.n0} × sin ${q.th}° / ${nf(q.n1)} = ${Math.sin(rad(q.tr)).toFixed(4)}`, result: `θr = ${fmt(q.tr, 4)}`, unit: 'degrees (°)' },
        { name: 'Angle at the core–cladding boundary', formula: 'φ = 90° − θr ;  TIR if φ ≥ θc  (⇔ θᵢ ≤ θa)', given: `θr = ${fmt(q.tr, 4)}°, θc = ${q.tc != null ? fmt(q.tc, 4) + '°' : '—'}`,
          calc: `φ = 90° − ${fmt(q.tr, 4)}° = ${fmt(q.phi, 4)}° ${q.tir ? '≥' : '<'} ${q.tc != null ? fmt(q.tc, 4) + '°' : 'θc (none)'}`, result: q.tir ? 'TIR: YES — ray is guided' : 'TIR: NO — ray leaks', unit: '—' },
      ];
      const readouts = [
        { label: 'Launch angle θᵢ', value: `${q.th}°`, tone: 'info' },
        { label: 'Critical angle', value: q.tc != null ? `${fmt(q.tc, 4)}°` : 'none' },
        { label: 'Acceptance angle', value: `${fmt(q.ta, 4)}°` },
        { label: 'NA', value: fmt(q.NA, 3) },
        { label: 'TIR', value: q.tir ? 'YES' : 'NO', tone: q.tir ? 'good' : 'bad' },
      ];
      return {
        formulas, readouts,
        state: { launchAngle: `${q.th}°`, n0: q.n0, n1: q.n1, n2: q.n2, criticalAngle: q.tc != null ? `${fmt(q.tc, 4)}°` : 'none', NA: fmt(q.NA, 3), acceptanceAngle: `${fmt(q.ta, 4)}°`, refractedAngle: `${fmt(q.tr, 4)}°`, angleAtCladding: `${fmt(q.phi, 4)}°`, TIR: q.tir ? 'YES' : 'NO' },
        explain: {
          what: q.tir ? `The ray enters at θᵢ = ${q.th}°, which is inside the acceptance cone (θa = ${fmt(q.ta, 4)}°). It bends to θr = ${fmt(q.tr, 4)}° in the core and meets the cladding at φ = ${fmt(q.phi, 4)}°, larger than θc = ${fmt(q.tc, 4)}°, so it is totally reflected and guided.`
            : q.tc == null ? 'n₁ ≤ n₂, so there is no critical angle — no ray can be guided.' : `The ray enters at θᵢ = ${q.th}°, outside the acceptance cone (θa = ${fmt(q.ta, 4)}°). Inside, it meets the cladding at φ = ${fmt(q.phi, 4)}°, smaller than θc = ${fmt(q.tc, 4)}°, so part of the light refracts into the cladding at every reflection and the ray dies out.`,
          why: 'A steeper launch angle gives a steeper ray inside the core, which means a smaller angle φ with the normal at the core–cladding boundary. TIR needs φ ≥ θc; the largest launch angle that still satisfies this is the acceptance angle, sin θa = √(n₁² − n₂²)/n₀.',
          param: 'Launch angle θᵢ, outside medium n₀, core index n₁ and cladding index n₂.',
          effect: 'Increasing θᵢ beyond θa makes the ray leak. A larger index difference (n₁ − n₂) widens the cone; a denser outside medium (water) narrows it because sin θa = NA/n₀.',
        },
      };
    },
    steps(p, c) {
      const q = accCalc(p);
      return [
        { title: 'Light arrives at the fibre end face', text: `A ray in ${q.n0 > 1 ? 'water' : 'air'} (n₀ = ${q.n0}) meets the end face at θᵢ = ${q.th}° from the axis.` },
        { title: 'Refraction at the end face', text: `n₀ sin θᵢ = n₁ sin θr gives θr = ${fmt(q.tr, 4)}° — the ray bends towards the axis.` },
        { title: 'Ray meets the core–cladding boundary', text: `Its angle with the normal there is φ = 90° − θr = ${fmt(q.phi, 4)}°.` },
        { title: 'Compare with the critical angle', text: q.tc == null ? 'n₁ ≤ n₂ — there is no critical angle.' : `θc = ${fmt(q.tc, 4)}°. φ ${q.tir ? '≥' : '<'} θc, which is the same as θᵢ ${q.tir ? '≤' : '>'} θa = ${fmt(q.ta, 4)}°.` },
        { title: q.tir ? 'TIR — the ray is guided' : 'No TIR — the ray leaks out', text: q.tir ? 'The ray zig-zags down the core by total internal reflection.' : `At each hit only ${fmt(q.R * 100, 3)} % is reflected; the rest refracts into the cladding and is lost.` },
        { title: 'The acceptance cone', text: `Every ray inside a cone of half-angle θa = ${fmt(q.ta, 4)}° (NA = n₀ sin θa = ${fmt(q.NA, 3)}) is guided; rays outside it leak.` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1); const q = accCalc(p);
      D.clear(g, '#ffffff');
      const E = 330; const Y = 290; const top = 210; const bot = 370; const X1 = 980;
      const k = q.tc == null ? 1 : clamp(Math.tan(rad(22)) / Math.tan(rad(Math.max(0.5, 90 - q.tc))), 1, 5);
      const dA = (a) => (a >= 89.99 ? Math.PI / 2 : Math.atan(k * Math.tan(rad(a))));
      // outside medium
      D.rect(g, 20, 20, E - 20, 520, { fill: q.n0 > 1 ? '#e0f2fe' : '#f8fafc', r: 8 });
      D.text(g, q.n0 > 1 ? 'Water  n₀ = 1.33' : 'Air  n₀ = 1.00', 36, 44, { size: 18, weight: 800, color: C.muted });
      fibreBody(g, E, X1, Y, 80, 55, { face: true, clad: `Cladding n₂ = ${nf(q.n2)}`, core: `Core n₁ = ${nf(q.n1)}` });
      D.line(g, 30, Y, X1, Y, { color: C.faint, width: 1.5, dash: [8, 6] });
      D.text(g, 'Axis', 36, Y + 18, { size: 16, color: C.muted });
      // acceptance cone
      const aa = dA(q.ta);
      if (p.showCone && step >= 3 && q.tc != null) {
        g.save(); g.beginPath(); g.rect(20, 20, E - 20, 520); g.clip();
        g.beginPath(); g.moveTo(E, Y); g.arc(E, Y, 300, Math.PI - aa, Math.PI + aa); g.closePath();
        g.globalAlpha = step >= 5 ? 0.55 : 0.3; g.fillStyle = C.greenSoft; g.fill(); g.restore();
        [-1, 1].forEach((s) => D.line(g, E, Y, E - 300 * Math.cos(aa), Y + s * 300 * Math.sin(aa), { color: C.green, width: 2.5, dash: [8, 6] }));
        const lx = Math.max(95, E - 250 * Math.cos(aa)); const ly = Math.min(470, Y + 250 * Math.sin(aa) + 24);
        D.tag(g, `θa = ${fmt(q.ta, 3)}°`, lx, ly, { bg: C.green, size: 17, align: 'center' });
        D.text(g, `Acceptance cone  2θa = ${fmt(2 * q.ta, 3)}°`, 36, 512, { size: 17, weight: 800, color: C.green });
        if (step === 5) D.focus(g, 26, Y - 150, E - 40, 300, t);
      }
      // incoming ray
      const al = dA(q.th); const L = al < 1e-3 ? 290 : Math.min(290, 225 / Math.sin(al));
      const S0 = [E - L * Math.cos(al), Y - L * Math.sin(al)];
      const inF = step === 0 ? prog : 1;
      D.line(g, S0[0], S0[1], S0[0] + (E - S0[0]) * inF, S0[1] + (Y - S0[1]) * inF, { color: C.laser, width: 5 });
      if (inF >= 1) {
        D.arrow(g, S0[0], S0[1], S0[0] + (E - S0[0]) * 0.55, S0[1] + (Y - S0[1]) * 0.55, { color: C.laser, width: 5, head: 16 });
        if (al > 0.01) arc(g, E, Y, 80, Math.PI, Math.PI + al, C.laser);
        D.text(g, `θᵢ = ${q.th}°`, E - 92 * Math.cos(al / 2) - 6, Y - 92 * Math.sin(al / 2) - 12, { size: 18, weight: 800, color: C.laser, align: 'right', halo: true });
      } else D.circle(g, S0[0] + (E - S0[0]) * inF, S0[1] + (Y - S0[1]) * inF, 8, { fill: C.laser });
      if (step === 0) D.focus(g, E - 60, Y - 60, 120, 120, t);
      // inside the fibre
      const be = dA(q.tr); const pts = zig(E, Y, X1 - 4, top, bot, be, 1);
      const powers = []; let pw = 1; for (let i = 1; i < pts.length; i++) { powers.push(pw); pw *= q.tir ? 1 : q.R; }
      const H = pts.length > 2 ? pts[1] : null; const dH = pathLen(pts, 1); const total = pathLen(pts);
      let dist = 0;
      if (step === 1) dist = dH * prog; else if (step === 2 || step === 3) dist = dH; else if (step === 4) dist = dH + (total - dH) * prog; else if (step >= 5) dist = total;
      if (step >= 1) {
        powerPath(g, pts, powers, dist, C.laser, 5);
        if (be > 0.01) arc(g, E, Y, 64, 0, be, C.orange);
        D.text(g, `θr = ${fmt(q.tr, 3)}°`, E + 14, Y - 24, { size: 17, weight: 800, color: C.orange, halo: true });
        if (step === 1) D.focus(g, E - 10, Y - 40, 190, 100, t);
      }
      if (step >= 2) {
        if (H) {
          D.line(g, H[0], H[1] - 110, H[0], H[1] + 45, { color: C.muted, width: 2, dash: [6, 6] });
          arc(g, H[0], H[1], 50, Math.PI + be, 1.5 * Math.PI, C.violet);
          D.text(g, `φ = ${fmt(q.phi, 3)}°`, H[0] - 12, H[1] + 30, { size: 17, weight: 800, color: C.violet, align: 'right', halo: true });
          if (step === 2) D.focus(g, H[0] - 120, H[1] - 90, 160, 110, t);
        } else D.tag(g, 'Ray almost parallel to the axis — meets the boundary far along the fibre', 655, 470, { bg: C.muted, size: 16, align: 'center' });
      }
      if (step >= 3 && q.tc != null) {
        const s1 = `φ = ${fmt(q.phi, 3)}° ${q.tir ? '≥' : '<'} θc = ${fmt(q.tc, 3)}°   ⇔   θᵢ = ${q.th}° ${q.tir ? '≤' : '>'} θa = ${fmt(q.ta, 3)}°`;
        D.tag(g, s1, 655, 470, { bg: q.tir ? C.green : C.red, size: 17, align: 'center' });
      } else if (step >= 3) D.tag(g, 'n₁ ≤ n₂ → no critical angle, nothing is guided', 655, 470, { bg: C.red, size: 17, align: 'center' });
      if (step >= 4 && !q.tir && H && q.tt != null) {
        const ga = dA(90 - q.tt); const ex = H[0] + 120 * Math.cos(ga); const ey = H[1] + 120 * Math.sin(ga);
        D.arrow(g, H[0], H[1], ex, ey, { color: C.orange, width: 4, head: 14 });
        D.text(g, 'Light leaks out', ex + 8, Math.min(ey, 505), { size: 17, weight: 800, color: C.orange, halo: true });
      }
      // top tags
      D.tag(g, `NA = ${fmt(q.NA, 3)}`, 420, 60, { bg: C.blue, size: 18, align: 'center' });
      D.tag(g, q.tc != null ? `θc = ${fmt(q.tc, 4)}°` : 'θc: none', 590, 60, { bg: C.amber, size: 18, align: 'center' });
      D.tag(g, `θa = ${fmt(q.ta, 4)}°`, 755, 60, { bg: C.green, size: 18, align: 'center' });
      if (step >= 3) tirTag(g, q.tir, 905, 60, 18);
      if (k > 1.01) D.text(g, `Transverse scale ×${fmt(k, 2)} (angles exaggerated); all numbers exact`, 655, 522, { size: 16, color: C.muted, align: 'center' });
      if (step >= 5 && q.tir) { const qq = along(pts, (t * 0.12) % 1); D.circle(g, qq[0], qq[1], 7, { fill: '#fff', stroke: C.laser, width: 3 }); }
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 3. Numerical Aperture Simulator
  // ─────────────────────────────────────────────────────────────
  function naCalc(p) {
    const n0 = Number(p.n0) || 1; const n1 = p.n1; const n2 = p.n2;
    const NA = Optics.na(n1, n2); const tc = Optics.critical(n1, n2);
    const Dl = (n1 - n2) / n1; const NAa = Dl > 0 ? n1 * Math.sqrt(2 * Dl) : 0;
    const sa = Math.min(1, NA / n0); const ta = deg(Math.asin(sa));
    return { n0, n1, n2, NA, tc, Dl, NAa, sa, ta, eta: sa * sa };
  }
  const NA_REFS = [
    { name: 'Telecom single-mode', na: 0.14 },
    { name: 'Multimode (50 µm)', na: 0.20 },
    { name: 'Plastic optical fibre', na: 0.50 },
  ];
  S['ep-numerical-aperture'] = {
    params: [
      nParam('n1', 'Core refractive index n₁', 1.40, 1.70, 1.48),
      nParam('n2', 'Cladding refractive index n₂', 1.30, 1.65, 1.46),
      { key: 'n0', label: 'Outside medium n₀', type: 'select', options: [{ value: 1, label: 'Air (n₀ = 1.00)' }, { value: 1.33, label: 'Water (n₀ = 1.33)' }], default: 1 },
      { key: 'showRef', label: 'Show single-mode reference cone', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Telecom single-mode (SMF, NA ≈ 0.12)', values: { n1: 1.468, n2: 1.463, n0: 1 } },
      { label: 'Multimode silica (NA ≈ 0.20)', values: { n1: 1.48, n2: 1.4665, n0: 1 } },
      { label: 'Plastic optical fibre, PMMA (NA ≈ 0.50)', values: { n1: 1.49, n2: 1.402, n0: 1 } },
      { label: 'Glass fibre with low-index cladding (NA ≈ 0.66)', values: { n1: 1.62, n2: 1.48, n0: 1 } },
    ],
    validate: (p) => nWarn(p),
    compute(p) {
      const q = naCalc(p);
      const formulas = [
        { name: 'Numerical aperture', formula: 'NA = √(n₁² − n₂²)', given: `n₁ = ${nf(q.n1)}, n₂ = ${nf(q.n2)}`, calc: `NA = √(${(q.n1 * q.n1).toFixed(4)} − ${(q.n2 * q.n2).toFixed(4)}) = √(${(q.n1 * q.n1 - q.n2 * q.n2).toFixed(4)})`, result: fmt(q.NA, 3), unit: 'no unit' },
        { name: 'Acceptance angle', formula: 'NA = n₀ sin θa  →  θa = sin⁻¹(NA / n₀)', given: `n₀ = ${q.n0}`, calc: NA_calc(q), result: fmt(q.ta, 4), unit: 'degrees (°)' },
        { name: 'Fractional index difference', formula: 'Δ = (n₁ − n₂) / n₁', given: `n₁ = ${nf(q.n1)}, n₂ = ${nf(q.n2)}`, calc: `Δ = ${fmt(q.n1 - q.n2, 3)} / ${nf(q.n1)}`, result: `${fmt(q.Dl, 3)} (= ${fmt(q.Dl * 100, 3)} %)`, unit: 'no unit' },
        { name: 'Approximate NA', formula: 'NA ≈ n₁ √(2Δ)', given: `Δ = ${fmt(q.Dl, 3)}`, calc: `NA ≈ ${nf(q.n1)} × √(2 × ${fmt(q.Dl, 3)})`, result: fmt(q.NAa, 3), unit: 'no unit' },
        { name: 'Light-gathering (Lambertian LED)', formula: 'fraction accepted η = sin²θa = (NA / n₀)²', given: `NA = ${fmt(q.NA, 3)}`, calc: `η = (${fmt(q.NA, 3)} / ${q.n0})²`, result: `${fmt(q.eta * 100, 3)} %`, unit: '% of the source light' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'NA', value: fmt(q.NA, 3), tone: 'info' },
          { label: 'Acceptance angle', value: `${fmt(q.ta, 4)}°` },
          { label: 'Critical angle', value: q.tc != null ? `${fmt(q.tc, 4)}°` : 'none' },
          { label: 'Δ', value: `${fmt(q.Dl * 100, 3)} %` },
          { label: 'Light gathered', value: `${fmt(q.eta * 100, 3)} %`, tone: q.NA > 0 ? 'good' : 'bad' },
        ],
        state: { n1: q.n1, n2: q.n2, n0: q.n0, NA: fmt(q.NA, 3), acceptanceAngle: `${fmt(q.ta, 4)}°`, fullCone: `${fmt(2 * q.ta, 4)}°`, criticalAngle: q.tc != null ? `${fmt(q.tc, 4)}°` : 'none', delta: fmt(q.Dl, 3), NAapprox: fmt(q.NAa, 3), lightGathered: `${fmt(q.eta * 100, 3)} %` },
        explain: {
          what: `With n₁ = ${nf(q.n1)} and n₂ = ${nf(q.n2)} the numerical aperture is ${fmt(q.NA, 3)}, so the fibre accepts light inside a cone of half-angle ${fmt(q.ta, 4)}° (full cone ${fmt(2 * q.ta, 4)}°). It collects about ${fmt(q.eta * 100, 3)} % of the light of a wide-angle (Lambertian) LED.`,
          why: 'NA comes from TIR: the steepest guided ray meets the cladding exactly at θc. Snell\'s law at the end face then gives n₀ sin θa = √(n₁² − n₂²). A bigger index step lets steeper rays be trapped.',
          param: 'Core index n₁, cladding index n₂ and the outside medium n₀.',
          effect: `Raising n₁ or lowering n₂ increases NA and widens the cone (more light collected, but more modal dispersion). Telecom single-mode fibres use a small NA (≈ 0.12–0.14); plastic fibres use NA ≈ 0.5 to collect light easily.`,
        },
      };
    },
    steps(p) {
      const q = naCalc(p);
      return [
        { title: 'Core and cladding', text: `The core (n₁ = ${nf(q.n1)}) is slightly denser than the cladding (n₂ = ${nf(q.n2)}).` },
        { title: 'Critical angle inside the fibre', text: q.tc != null ? `Rays that hit the cladding at more than θc = ${fmt(q.tc, 4)}° are trapped by TIR.` : 'n₁ ≤ n₂: no critical angle, no guiding.' },
        { title: 'Numerical aperture', text: `NA = √(n₁² − n₂²) = ${fmt(q.NA, 3)}.` },
        { title: 'The acceptance cone', text: `NA = n₀ sin θa → θa = ${fmt(q.ta, 4)}°. Green rays inside the cone are guided; red rays outside leak.` },
        { title: 'Light-gathering power ∝ NA²', text: `This fibre accepts ≈ ${fmt(q.eta * 100, 3)} % of an LED's light; compare it with standard fibres.` },
        { title: 'Fractional index difference Δ', text: `Δ = (n₁ − n₂)/n₁ = ${fmt(q.Dl * 100, 3)} %, and NA ≈ n₁√(2Δ) = ${fmt(q.NAa, 3)}.` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1); const q = naCalc(p);
      D.clear(g, '#ffffff');
      const A = [430, 200]; const hc = 40;
      D.rect(g, 20, 20, 410, 330, { fill: q.n0 > 1 ? '#e0f2fe' : '#f8fafc', r: 8 });
      D.text(g, q.n0 > 1 ? 'Water  n₀ = 1.33' : 'Air  n₀ = 1.00', 36, 42, { size: 17, weight: 800, color: C.muted, halo: true });
      fibreBody(g, A[0], 980, A[1], hc, 30, { face: true });
      D.text(g, `Core n₁ = ${nf(q.n1)} (inner band)`, 968, A[1] + hc + 48, { size: 16, weight: 800, color: '#1e3a8a', align: 'right' });
      D.text(g, `Cladding n₂ = ${nf(q.n2)}`, 968, A[1] - hc - 15, { size: 16, weight: 800, color: '#0369a1', align: 'right' });
      if (step === 0) { D.focus(g, A[0], A[1] - 70, 550, 140, t); D.text(g, `Core n₁ = ${nf(q.n1)}  ${q.n1 > q.n2 ? '>' : '≤'}  cladding n₂ = ${nf(q.n2)}`, 705, 70, { size: 20, weight: 800, align: 'center', color: '#1e3a8a' }); }
      const aa = rad(q.ta); const clip = () => { g.save(); g.beginPath(); g.rect(20, 20, 410, 330); g.clip(); };
      if (step >= 3 && q.NA > 0) {
        clip(); g.beginPath(); g.moveTo(A[0], A[1]); g.arc(A[0], A[1], 420, Math.PI - aa, Math.PI + aa); g.closePath(); g.globalAlpha = 0.5; g.fillStyle = C.greenSoft; g.fill(); g.restore();
        clip(); [-1, 1].forEach((s) => D.line(g, A[0], A[1], A[0] - 420 * Math.cos(aa), A[1] + s * 420 * Math.sin(aa), { color: C.green, width: 3 })); g.restore();
        if (p.showRef) {
          const ar = Math.asin(Math.min(1, 0.14 / q.n0));
          clip(); [-1, 1].forEach((s) => D.line(g, A[0], A[1], A[0] - 380 * Math.cos(ar), A[1] + s * 380 * Math.sin(ar), { color: C.muted, width: 2, dash: [5, 5] })); g.restore();
          D.text(g, 'SMF cone (NA 0.14)', 36, Math.max(64, A[1] - 380 * Math.sin(ar) - 18), { size: 16, color: C.muted, weight: 800, halo: true });
        }
        // fan of rays
        const fan = [-60, -45, -32, -20, -10, 10, 20, 32, 45, 60];
        const f = step === 3 ? prog : 1;
        fan.forEach((a) => {
          const ok = Math.abs(a) <= q.ta + 1e-9; const ar = rad(a); const s0 = [A[0] - 330 * Math.cos(ar), A[1] - 330 * Math.sin(ar)];
          const col = ok ? C.green : C.red; const tr = Math.asin(clamp((q.n0 * Math.sin(Math.abs(ar))) / q.n1, 0, 1));
          const pts = [s0];
          if (ok) zig(A[0], A[1], 975, A[1] - hc, A[1] + hc, tr, a < 0 ? 1 : -1).forEach((pt) => pts.push(pt));
          else {
            const dir = a < 0 ? 1 : -1; const H = [A[0] + hc / Math.max(1e-3, Math.tan(tr)), A[1] + dir * hc];
            pts.push(A); if (H[0] < 975) { pts.push(H); pts.push([H[0] + 50 * Math.cos(tr), H[1] + dir * 50]); }
          }
          clip(); D.line(g, s0[0], s0[1], A[0], A[1], { color: col, width: 2.5, alpha: ok ? 0.95 : 0.7 }); g.restore();
          const inner = pts.slice(1); if (f >= 1) powerPath(g, inner, null, pathLen(inner) * 1, col, 2.2);
        });
        D.tag(g, `θa = ${fmt(q.ta, 3)}°`, 190, 70, { bg: C.green, size: 18, align: 'center' });
        D.tag(g, `Full cone 2θa = ${fmt(2 * q.ta, 3)}°`, 215, 328, { bg: C.green, size: 17, align: 'center' });
        if (step === 3) D.focus(g, 30, 30, 390, 310, t);
      }
      // info tags over the fibre
      if (step >= 1) D.tag(g, q.tc != null ? `θc = sin⁻¹(n₂/n₁) = ${fmt(q.tc, 4)}°` : 'n₁ ≤ n₂ → no θc', 705, 60, { bg: C.amber, size: 17, align: 'center' });
      if (step >= 2) { D.text(g, `NA = √(n₁² − n₂²) = ${fmt(q.NA, 3)}`, 705, 110, { size: 22, weight: 800, color: C.blue, align: 'center' }); if (step === 2) D.focus(g, 540, 92, 330, 36, t); }
      if (step >= 5) { D.tag(g, `Δ = ${fmt(q.Dl * 100, 3)} %   NA ≈ n₁√(2Δ) = ${fmt(q.NAa, 3)}`, 640, 325, { bg: C.violet, size: 17, align: 'center' }); if (step === 5) D.focus(g, 455, 307, 370, 36, t); }
      // light-gathering bars
      if (step >= 4) {
        const rows = [...NA_REFS.map((r) => ({ name: `${r.name} (NA ${r.na})`, eta: Math.min(1, (r.na / q.n0) ** 2), col: C.faint })), { name: `This fibre (NA ${fmt(q.NA, 3)})`, eta: q.eta, col: C.blue }];
        const scale = Math.max(0.3, q.eta);
        D.text(g, 'Light gathered ∝ NA²  (fraction of a wide-angle LED\'s light accepted)', 30, 378, { size: 17, weight: 800 });
        rows.forEach((r, i) => {
          const y = 412 + i * 36; const w = (r.eta / scale) * 430;
          D.text(g, r.name, 30, y, { size: 17, weight: i === 3 ? 800 : 700, color: i === 3 ? C.blue : C.ink });
          D.rect(g, 340, y - 12, 430, 24, { fill: '#f1f5f9', r: 5 });
          D.rect(g, 340, y - 12, Math.max(3, w), 24, { fill: i === 3 ? C.blue : '#94a3b8', r: 5 });
          D.text(g, `${fmt(r.eta * 100, 3)} %`, 785, y, { size: 17, weight: 800, color: i === 3 ? C.blue : C.muted });
        });
        if (step === 4) D.focus(g, 24, 392, 880, 140, t);
      }
    },
  };
  function NA_calc(q) { return q.NA / q.n0 >= 1 ? `NA / n₀ = ${fmt(q.NA / q.n0, 3)} ≥ 1 → θa = 90°` : `θa = sin⁻¹(${fmt(q.NA, 3)} / ${q.n0}) = sin⁻¹(${(q.NA / q.n0).toFixed(4)})`; }

  // ─────────────────────────────────────────────────────────────
  // 4. Single Mode vs Multimode Fiber
  // ─────────────────────────────────────────────────────────────
  function smCalc(p) {
    const a = p.d / 2; const lam = Number(p.lambda) || 1310; const NA = Optics.na(p.n1, p.n2);
    const V = (2 * Math.PI * a * NA) / (lam / 1000); const single = V < 2.405;
    const modes = single ? 1 : Math.max(2, Math.round((V * V) / 2));
    const Dl = p.n1 > p.n2 ? (p.n1 - p.n2) / p.n1 : 0;
    const dt = single ? 0 : (p.L * 1000 * p.n1 * Dl) / CL; // s
    const dmax = NA > 0 ? (2.405 * (lam / 1000)) / (Math.PI * NA) : 0; // µm
    const lc = (2 * Math.PI * a * NA * 1000) / 2.405; // nm
    return { a, lam, NA, V, single, modes, Dl, dt, dmax, lc, tc: Optics.critical(p.n1, p.n2) };
  }
  S['ep-single-multi-mode'] = {
    params: [
      { key: 'd', label: 'Core diameter 2a', type: 'range', min: 4, max: 100, step: 0.1, default: 8.2, unit: 'µm' },
      { key: 'lambda', label: 'Wavelength λ', type: 'select', options: [{ value: 850, label: '850 nm' }, { value: 1310, label: '1310 nm' }, { value: 1550, label: '1550 nm' }], default: 1310 },
      nParam('n1', 'Core refractive index n₁', 1.44, 1.52, 1.468),
      nParam('n2', 'Cladding refractive index n₂', 1.40, 1.51, 1.463),
      { key: 'L', label: 'Fibre length L', type: 'range', min: 0.1, max: 10, step: 0.1, default: 1, unit: 'km' },
    ],
    examples: [
      { label: 'Telecom SMF at 1310 nm (8.2 µm core)', values: { d: 8.2, lambda: 1310, n1: 1.468, n2: 1.463, L: 1 } },
      { label: 'Same SMF used at 850 nm (few-mode)', values: { d: 8.2, lambda: 850, n1: 1.468, n2: 1.463, L: 1 } },
      { label: 'Multimode 50 µm at 850 nm (NA 0.20)', values: { d: 50, lambda: 850, n1: 1.48, n2: 1.4665, L: 1 } },
      { label: 'Multimode 62.5 µm at 1310 nm (NA 0.28)', values: { d: 62.5, lambda: 1310, n1: 1.49, n2: 1.464, L: 2 } },
    ],
    validate: (p) => nWarn(p),
    compute(p) {
      const q = smCalc(p);
      const formulas = [
        { name: 'Numerical aperture', formula: 'NA = √(n₁² − n₂²)', given: `n₁ = ${nf(p.n1)}, n₂ = ${nf(p.n2)}`, calc: `NA = √(${(p.n1 * p.n1 - p.n2 * p.n2).toFixed(5)})`, result: fmt(q.NA, 3), unit: 'no unit' },
        { name: 'V-number (normalised frequency)', formula: 'V = (2πa / λ) · NA', given: `a = ${fmt(q.a, 3)} µm, λ = ${q.lam} nm = ${q.lam / 1000} µm`, calc: `V = 2π × ${fmt(q.a, 3)} × ${fmt(q.NA, 3)} / ${q.lam / 1000}`, result: fmt(q.V, 3), unit: 'no unit' },
        { name: 'Single-mode condition', formula: 'single mode if V < 2.405', given: `V = ${fmt(q.V, 3)}`, calc: `${fmt(q.V, 3)} ${q.single ? '<' : '≥'} 2.405`, result: q.single ? 'Single-mode: YES' : 'Single-mode: NO (multimode)', unit: '—' },
        { name: 'Number of modes (step index)', formula: 'N ≈ V² / 2', given: `V = ${fmt(q.V, 3)}`, calc: q.single ? 'V < 2.405 → only the fundamental mode LP₀₁' : `N ≈ ${fmt(q.V, 3)}² / 2`, result: q.single ? '1' : `≈ ${q.modes}`, unit: 'modes' },
        { name: 'Largest single-mode core', formula: '2a_max = 2.405 λ / (π NA)', given: `λ = ${q.lam} nm, NA = ${fmt(q.NA, 3)}`, calc: `2a_max = 2.405 × ${q.lam / 1000} / (π × ${fmt(q.NA, 3)})`, result: fmt(q.dmax, 3), unit: 'µm' },
        { name: 'Modal dispersion (step index, ray model)', formula: 'Δt = L n₁ Δ / c,   Δ = (n₁ − n₂)/n₁', given: `L = ${p.L} km, Δ = ${fmt(q.Dl * 100, 3)} %`, calc: q.single ? 'single mode → no intermodal delay' : `Δt = ${p.L * 1000} × ${nf(p.n1)} × ${fmt(q.Dl, 3)} / 2.998×10⁸`, result: q.single ? '0' : tfmt(q.dt), unit: q.single ? 's' : 'time spread' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'V-number', value: fmt(q.V, 3), tone: 'info' },
          { label: 'Modes', value: q.single ? '1' : `≈ ${q.modes}` },
          { label: 'NA', value: fmt(q.NA, 3) },
          { label: 'Single-mode', value: q.single ? 'YES' : 'NO', tone: q.single ? 'good' : 'warn' },
        ],
        state: { coreDiameter: `${p.d} µm`, wavelength: `${q.lam} nm`, NA: fmt(q.NA, 3), V: fmt(q.V, 3), singleMode: q.single ? 'YES' : 'NO', modes: q.modes, maxSingleModeCore: `${fmt(q.dmax, 3)} µm`, cutoffWavelength: `${fmt(q.lc, 3)} nm`, modalSpread: q.single ? 'none' : tfmt(q.dt), length: `${p.L} km` },
        explain: {
          what: q.single ? `V = ${fmt(q.V, 3)} is below 2.405, so the ${p.d} µm core carries only one mode at ${q.lam} nm. Light travels essentially along one path and the pulse stays sharp.` : `V = ${fmt(q.V, 3)} is above 2.405, so the ${p.d} µm core carries about ${q.modes} modes at ${q.lam} nm. Each mode (ray angle) takes a different time, so after ${p.L} km a pulse spreads by about ${tfmt(q.dt)}.`,
          why: 'The V-number compares the core size with the wavelength (times NA). A small core compared with λ can only hold the fundamental mode; a large core holds many modes whose zig-zag paths have different lengths.',
          param: 'Core diameter, wavelength, n₁, n₂ and length.',
          effect: `Increasing the core or NA, or decreasing λ, increases V and the number of modes. For these indices the core must be smaller than ${fmt(q.dmax, 3)} µm for single-mode operation at ${q.lam} nm (cut-off wavelength ${fmt(q.lc, 3)} nm).`,
        },
      };
    },
    steps(p) {
      const q = smCalc(p);
      return [
        { title: 'Core size and wavelength', text: `Core diameter 2a = ${p.d} µm, λ = ${q.lam} nm, cladding 125 µm.` },
        { title: 'Numerical aperture', text: `NA = √(n₁² − n₂²) = ${fmt(q.NA, 3)}.` },
        { title: 'V-number', text: `V = 2πa·NA/λ = ${fmt(q.V, 3)}.` },
        { title: q.single ? 'V < 2.405 → single-mode' : 'V ≥ 2.405 → multimode', text: q.single ? 'Only the fundamental mode LP₀₁ propagates.' : `About V²/2 ≈ ${q.modes} modes propagate.` },
        { title: q.single ? 'One path along the axis' : 'Many zig-zag paths', text: q.single ? 'All the light travels along the axis — one path, one travel time.' : 'Rays at different angles travel different distances.' },
        { title: 'Pulse at the output', text: q.single ? `After ${p.L} km the pulse is not broadened by modal dispersion.` : `After ${p.L} km the pulse spreads by ≈ ${tfmt(q.dt)} (modal dispersion).` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1); const q = smCalc(p);
      D.clear(g, '#ffffff');
      const yc = 175; const s = 1.6; const hc = Math.max(3, (p.d / 2) * s); const hcl = 62.5 * s - hc; const x0 = 60; const x1 = 960;
      fibreBody(g, x0, x1, yc, hc, hcl, { face: true });
      D.text(g, 'Cladding 125 µm', x1 - 12, yc - hc - hcl / 2, { size: 16, weight: 800, color: '#0369a1', align: 'right' });
      D.text(g, `Core 2a = ${p.d} µm`, x1 - 12, yc + hc + Math.min(hcl / 2, 24), { size: 16, weight: 800, color: '#1e3a8a', align: 'right', halo: true });
      D.text(g, `λ = ${q.lam} nm`, x0, 34, { size: 18, weight: 800, color: D.wavelengthColor(q.lam) });
      D.text(g, '(fibre cross-section drawn to scale)', x0 + D.textWidth(g, `λ = ${q.lam} nm`, 18, 800) + 12, 34, { size: 16, color: C.muted });
      if (step === 0) D.focus(g, x0, yc - hc - 4, 300, 2 * hc + 8, t);
      if (step >= 1) D.tag(g, `NA = ${fmt(q.NA, 3)}`, 640, 34, { bg: C.blue, size: 18, align: 'center' });
      if (step >= 2) { D.tag(g, `V = 2πa·NA/λ = ${fmt(q.V, 3)}`, 850, 34, { bg: C.violet, size: 18, align: 'center' }); if (step === 2) D.focus(g, 730, 18, 240, 32, t); }
      // rays
      if (step >= 4 || step === 3) {
        const f = step === 4 ? prog : 1; const tmax = q.tc != null ? rad(90 - q.tc) : 0;
        if (q.single) {
          D.rect(g, x0, yc - hc, (x1 - x0) * f, 2 * hc, { fill: C.laser, alpha: 0.18 });
          D.line(g, x0, yc, x0 + (x1 - x0) * f, yc, { color: C.laser, width: 4 });
        } else {
          const nR = Math.min(q.modes, 6); const cols = [C.laser, C.orange, C.green, C.blue, C.violet, C.pink];
          for (let i = 0; i < nR; i++) {
            const ang = (i / (nR - 1 || 1)) * tmax * 0.95; const pts = zig(x0, yc, x1, yc - hc, yc + hc, ang, i % 2 ? 1 : -1);
            powerPath(g, pts, null, pathLen(pts) * f, cols[i], 3);
          }
        }
        if (step === 4) D.focus(g, x0, yc - hc - 4, x1 - x0, 2 * hc + 8, t);
      }
      if (step >= 3) {
        D.tag(g, q.single ? `V = ${fmt(q.V, 3)} < 2.405 → Single-mode: YES (1 mode)` : `V = ${fmt(q.V, 3)} ≥ 2.405 → Single-mode: NO (≈ ${q.modes} modes)`, 500, 305, { bg: q.single ? C.green : C.amber, size: 18, align: 'center' });
        if (step === 3) D.focus(g, 170, 285, 660, 40, t);
      }
      if (step < 5) {
        D.text(g, `Core 2a = ${p.d} µm  vs  λ = ${q.lam / 1000} µm  →  core is ${fmt(p.d / (q.lam / 1000), 3)} wavelengths wide`, 500, 370, { size: 18, weight: 700, align: 'center', color: C.muted });
        if (step >= 2) {
          const gx = 80; const gw = 840; const gy = 450; const vmax = Math.max(6, q.V * 1.15); const X = (v) => gx + (Math.min(v, vmax) / vmax) * gw;
          D.rect(g, gx, gy - 14, X(2.405) - gx, 28, { fill: C.greenSoft }); D.rect(g, X(2.405), gy - 14, gx + gw - X(2.405), 28, { fill: C.amberSoft });
          D.rect(g, gx, gy - 14, gw, 28, { stroke: C.line, width: 1.5 });
          D.line(g, X(2.405), gy - 26, X(2.405), gy + 26, { color: C.red, width: 3 });
          D.text(g, '2.405', X(2.405), gy + 40, { size: 16, weight: 800, color: C.red, align: 'center' });
          D.text(g, 'single-mode', gx + 6, gy, { size: 16, weight: 800, color: C.green });
          D.text(g, 'multimode', gx + gw - 6, gy, { size: 16, weight: 800, color: C.amber, align: 'right' });
          D.text(g, '0', gx, gy + 40, { size: 16, color: C.muted, align: 'center' }); D.text(g, fmt(vmax, 3), gx + gw, gy + 40, { size: 16, color: C.muted, align: 'center' });
          D.poly(g, [[X(q.V), gy - 16], [X(q.V) - 10, gy - 34], [X(q.V) + 10, gy - 34]], { fill: C.violet, close: true });
          D.tag(g, `V = ${fmt(q.V, 3)}`, clamp(X(q.V), 130, 870), gy - 52, { bg: C.violet, size: 17, align: 'center' });
        }
      }
      // pulses
      if (step >= 5) {
        const base = 505; const amp = 110;
        D.line(g, 40, base, 960, base, { color: C.line, width: 2 });
        D.text(g, 'Input pulse', 150, 355, { size: 17, weight: 800, align: 'center' });
        pulse(g, 150, base, 10, amp, C.blue);
        D.arrow(g, 250, base - 50, 420, base - 50, { color: C.muted, width: 3 });
        D.text(g, `after ${p.L} km`, 335, base - 72, { size: 17, weight: 700, color: C.muted, align: 'center' });
        const ns = q.dt * 1e9; const sig = q.single ? 10 : 10 + 80 * (1 - Math.exp(-ns / 60));
        const xo = 650; const k = prog;
        const sigNow = 10 + (sig - 10) * k;
        pulse(g, xo, base, sigNow, amp * Math.max(0.3, Math.sqrt(10 / sigNow)), q.single ? C.green : C.orange);
        D.text(g, 'Output pulse', xo, 355, { size: 17, weight: 800, align: 'center' });
        D.tag(g, q.single ? 'No modal dispersion — pulse stays sharp' : `Modal dispersion Δt ≈ ${tfmt(q.dt)}`, xo, 392, { bg: q.single ? C.green : C.orange, size: 17, align: 'center' });
        D.text(g, '(pulse widths are qualitative)', 960, 540, { size: 16, color: C.muted, align: 'right' });
        D.focus(g, 440, 340, 430, 170, t);
      }
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Step Index vs Graded Index Fiber
  // ─────────────────────────────────────────────────────────────
  function sgCalc(p) {
    const Dl = p.delta / 100; const n2 = p.n1 * (1 - Dl); const NA = p.n1 * Math.sqrt(2 * Dl);
    const dtS = (p.L * 1000 * p.n1 * Dl) / CL; const dtG = (p.L * 1000 * p.n1 * Dl * Dl) / (8 * CL);
    return { Dl, n2, NA, dtS, dtG, ratio: 8 / Dl };
  }
  const SG_K = 6; // transverse exaggeration of ray angles in the drawing
  S['ep-step-graded-index'] = {
    modes: [{ key: 'step', label: 'Step index' }, { key: 'graded', label: 'Graded index' }, { key: 'compare', label: 'Compare both' }],
    approx: 'Ray (geometric-optics) model. Graded-index spread assumes the optimum parabolic profile, Δt/L ≈ n₁Δ²/(8c). Ray angles are drawn exaggerated ×6 across the fibre; the times are calculated exactly from the formulas.',
    params: [
      nParam('n1', 'Core (axis) refractive index n₁', 1.44, 1.52, 1.48),
      { key: 'delta', label: 'Index difference Δ = (n₁ − n₂)/n₁', type: 'range', min: 0.2, max: 3, step: 0.05, default: 1, unit: '%' },
      { key: 'L', label: 'Fibre length L', type: 'range', min: 0.1, max: 10, step: 0.1, default: 1, unit: 'km' },
    ],
    examples: [
      { label: 'Typical multimode silica (Δ = 1 %)', values: { n1: 1.48, delta: 1, L: 1 } },
      { label: 'Low-Δ fibre (Δ = 0.3 %)', values: { n1: 1.465, delta: 0.3, L: 1 } },
      { label: 'High-NA fibre, 5 km link (Δ = 2 %)', values: { n1: 1.50, delta: 2, L: 5 } },
    ],
    validate: () => [],
    compute(p) {
      const q = sgCalc(p);
      const formulas = [
        { name: 'Cladding index', formula: 'n₂ = n₁ (1 − Δ)', given: `n₁ = ${nf(p.n1)}, Δ = ${p.delta} %`, calc: `n₂ = ${nf(p.n1)} × (1 − ${fmt(q.Dl, 3)})`, result: fmt(q.n2, 5), unit: 'no unit' },
        { name: 'Graded-index profile', formula: 'n(r) = n₁ √(1 − 2Δ (r/a)²)  for r ≤ a', given: `Δ = ${fmt(q.Dl, 3)}`, calc: `n(0) = ${nf(p.n1)},  n(a) = ${nf(p.n1)} × √(1 − ${fmt(2 * q.Dl, 3)}) = ${fmt(p.n1 * Math.sqrt(1 - 2 * q.Dl), 5)}`, result: 'parabolic', unit: '—' },
        { name: 'Numerical aperture', formula: 'NA ≈ n₁ √(2Δ)', given: `Δ = ${fmt(q.Dl, 3)}`, calc: `NA ≈ ${nf(p.n1)} × √(${fmt(2 * q.Dl, 3)})`, result: fmt(q.NA, 3), unit: 'no unit' },
        { name: 'Modal spread — step index', formula: 'Δt ≈ L n₁ Δ / c', given: `L = ${p.L} km`, calc: `Δt = ${p.L * 1000} × ${nf(p.n1)} × ${fmt(q.Dl, 3)} / 2.998×10⁸`, result: tfmt(q.dtS), unit: 'time spread' },
        { name: 'Modal spread — graded index', formula: 'Δt ≈ L n₁ Δ² / (8c)', given: `L = ${p.L} km`, calc: `Δt = ${p.L * 1000} × ${nf(p.n1)} × ${fmt(q.Dl, 3)}² / (8 × 2.998×10⁸)`, result: tfmt(q.dtG), unit: 'time spread' },
        { name: 'Improvement', formula: 'Δt_step / Δt_graded = 8 / Δ', given: `Δ = ${fmt(q.Dl, 3)}`, calc: `8 / ${fmt(q.Dl, 3)}`, result: fmt(q.ratio, 3), unit: 'times smaller' },
      ];
      const m = p.mode;
      return {
        formulas,
        readouts: [
          { label: 'NA', value: fmt(q.NA, 3), tone: 'info' },
          { label: 'n₂', value: fmt(q.n2, 5) },
          { label: 'Step-index spread', value: tfmt(q.dtS), tone: m === 'graded' ? undefined : 'warn' },
          { label: 'Graded-index spread', value: tfmt(q.dtG), tone: m === 'step' ? undefined : 'good' },
        ],
        state: { mode: m, n1: p.n1, n2: fmt(q.n2, 5), delta: `${p.delta} %`, NA: fmt(q.NA, 3), length: `${p.L} km`, stepSpread: tfmt(q.dtS), gradedSpread: tfmt(q.dtG), improvement: `${fmt(q.ratio, 3)}×` },
        explain: {
          what: m === 'graded' ? `In the graded-index fibre the index falls smoothly from ${nf(p.n1)} on the axis; rays bend back in smooth curves and arrive almost together — spread only ≈ ${tfmt(q.dtG)} over ${p.L} km.`
            : m === 'step' ? `In the step-index fibre the core has a constant index ${nf(p.n1)}; rays zig-zag by TIR, and steep rays travel a longer path, so a pulse spreads by ≈ ${tfmt(q.dtS)} over ${p.L} km.`
              : `Over ${p.L} km a step-index fibre spreads a pulse by ≈ ${tfmt(q.dtS)} but an optimum graded-index fibre only by ≈ ${tfmt(q.dtG)} — about ${fmt(q.ratio, 3)} times less.`,
          why: 'In a step-index core every ray moves at the same speed c/n₁, so longer zig-zag paths arrive later. In a graded core the steep rays spend time in the outer, lower-index region where light is faster, which compensates for their longer path.',
          param: 'Axis index n₁, index difference Δ and length L.',
          effect: 'Step-index spread grows with Δ; graded-index spread grows with Δ² and is 8/Δ times smaller. Both grow in proportion to the length L.',
        },
      };
    },
    steps(p) {
      const q = sgCalc(p); const m = p.mode;
      return [
        { title: 'Refractive-index profile', text: m === 'graded' ? 'n(r) is largest on the axis and falls parabolically to n₂ at the core edge.' : m === 'step' ? `n = ${nf(p.n1)} everywhere in the core, dropping suddenly to n₂ = ${fmt(q.n2, 5)}.` : 'Step: constant n₁ then a sudden drop. Graded: a smooth parabola.' },
        { title: 'Rays enter at different angles', text: `Three rays (axial, medium, steep) are launched within the NA = ${fmt(q.NA, 3)}.` },
        { title: m === 'graded' ? 'Curved (sinusoidal) paths' : m === 'step' ? 'Zig-zag paths by TIR' : 'Zig-zag vs curved paths', text: m === 'graded' ? 'Continuous refraction bends the rays back towards the axis — they refocus periodically.' : m === 'step' ? 'Rays reflect sharply at the core–cladding boundary.' : 'Sharp reflections (step) versus smooth bending (graded).' },
        { title: 'Travel times', text: m === 'graded' ? 'Steep rays go further but faster (lower n away from the axis) — they keep up with the axial ray.' : m === 'step' ? 'All rays move at c/n₁, so the steep ray falls behind the axial ray.' : 'In the step fibre the steep ray falls behind; in the graded fibre all rays stay together.' },
        { title: 'Output pulse width', text: m === 'graded' ? `Spread after ${p.L} km ≈ ${tfmt(q.dtG)}.` : m === 'step' ? `Spread after ${p.L} km ≈ ${tfmt(q.dtS)}.` : `Step ≈ ${tfmt(q.dtS)} vs graded ≈ ${tfmt(q.dtG)} — ${fmt(q.ratio, 3)}× less.` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1); const q = sgCalc(p);
      D.clear(g, '#ffffff');
      const rowsDef = p.mode === 'compare' ? [{ kind: 'step', yc: 120, a: 45 }, { kind: 'graded', yc: 335, a: 45 }] : [{ kind: p.mode === 'graded' ? 'graded' : 'step', yc: 200, a: 62 }];
      const cmp = p.mode === 'compare';
      const fx0 = cmp ? 240 : 290; const fx1 = cmp ? 715 : 975;
      rowsDef.forEach((row) => {
        const { kind, yc, a } = row; const hcl = cmp ? 24 : 32;
        const title = kind === 'step' ? 'Step-index fibre' : 'Graded-index fibre';
        D.text(g, title, fx0, yc - a - hcl - 20, { size: 19, weight: 800, color: kind === 'step' ? C.orange : C.green });
        // profile plot
        const px0 = 30; const pw = cmp ? 170 : 220; const nx = (n) => px0 + 45 + ((n - q.n2) / (p.n1 - q.n2)) * (pw - 85);
        const r0 = yc; const rr = a * 1.45;
        D.rect(g, px0, r0 - rr - 8, pw, 2 * rr + 16, { fill: '#f8fafc', stroke: C.line, width: 1.5, r: 6 });
        D.line(g, px0 + 18, r0 + rr, px0 + 18, r0 - rr, { color: C.muted, width: 1.5 });
        D.text(g, 'r', px0 + 25, r0 - rr + 8, { size: 16, weight: 800, color: C.muted });
        D.line(g, px0 + 10, r0, px0 + pw - 8, r0, { color: C.faint, width: 1, dash: [4, 4] });
        const prof = [];
        if (kind === 'step') prof.push([nx(q.n2), r0 - rr], [nx(q.n2), r0 - a], [nx(p.n1), r0 - a], [nx(p.n1), r0 + a], [nx(q.n2), r0 + a], [nx(q.n2), r0 + rr]);
        else { prof.push([nx(q.n2), r0 - rr]); for (let i = -40; i <= 40; i++) { const rn = i / 40; const n = p.n1 * Math.sqrt(1 - 2 * q.Dl * rn * rn); prof.push([nx(Math.max(q.n2, n)), r0 + rn * a]); } prof.push([nx(q.n2), r0 + rr]); }
        D.poly(g, prof, { stroke: kind === 'step' ? C.orange : C.green, width: 3.5 });
        D.text(g, 'n₂', nx(q.n2), r0 + rr + 20 > yc + a + hcl + 30 ? r0 + rr + 18 : r0 + rr + 18, { size: 16, weight: 800, color: C.muted, align: 'center' });
        D.text(g, 'n₁', nx(p.n1), r0 + rr + 18, { size: 16, weight: 800, color: C.muted, align: 'center' });
        D.text(g, 'n(r)', px0 + pw - 30, r0 - rr + 8, { size: 16, weight: 800, color: C.muted });
        if (step === 0) D.focus(g, px0, r0 - rr - 8, pw, 2 * rr + 16, t);
        // fibre body
        const fill = kind === 'graded' ? (() => { const gr = g.createLinearGradient(0, yc - a, 0, yc + a); gr.addColorStop(0, '#e0f2fe'); gr.addColorStop(0.5, '#7dd3fc'); gr.addColorStop(1, '#e0f2fe'); return gr; })() : '#bae6fd';
        fibreBody(g, fx0, fx1, yc, a, hcl, { face: true, coreFill: fill });
        // rays
        const fr = [0, 0.55, 0.95]; const cols = [C.blue, C.green, C.laser];
        const smax = SG_K * Math.sqrt(2 * q.Dl); const P = (2 * Math.PI * a) / smax;
        const paths = fr.map((f, i) => {
          if (kind === 'step') return zig(fx0, yc, fx1, yc - a, yc + a, Math.atan(f * smax), i === 1 ? 1 : -1);
          const pts = []; for (let x = fx0; x <= fx1; x += 3) pts.push([x, yc - (i === 1 ? -1 : 1) * f * a * Math.sin((2 * Math.PI * (x - fx0)) / P)]); return pts;
        });
        if (step >= 1) {
          const f = step === 1 ? 0.15 * prog : step === 2 ? 0.15 + 0.85 * prog : 1;
          paths.forEach((pts, i) => powerPath(g, pts, null, pathLen(pts) * f, cols[i], 3.5));
          if (step === 2) D.focus(g, fx0, yc - a - 4, fx1 - fx0, 2 * a + 8, t);
        }
        // travel-time dots
        if (step === 3) {
          const span = fx1 - fx0; const T = prog;
          paths.forEach((pts, i) => {
            const slope = Math.atan(fr[i] * smax); const xf = kind === 'step' ? T * Math.cos(slope) : T * (1 - 0.01 * fr[i]);
            const xx = fx0 + span * xf;
            let pt = pts[pts.length - 1]; for (let j = 1; j < pts.length; j++) if (pts[j][0] >= xx) { const u = (xx - pts[j - 1][0]) / (pts[j][0] - pts[j - 1][0] || 1); pt = [pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u]; break; }
            D.circle(g, pt[0], pt[1], 8, { fill: '#fff', stroke: cols[i], width: 4 });
          });
          if (step === 3 && !cmp) D.text(g, kind === 'step' ? 'Axial ray arrives first; steep ray lags behind' : 'All rays keep pace — they arrive together', (fx0 + fx1) / 2, yc + a + hcl + 26, { size: 17, weight: 800, align: 'center', color: kind === 'step' ? C.orange : C.green });
        }
        // output pulse
        if (step >= 4) {
          const dt = kind === 'step' ? q.dtS : q.dtG; const ns = dt * 1e9; const sig = 8 + (cmp ? 24 : 60) * (1 - Math.exp(-ns / 60));
          if (cmp) {
            const xc = 855; const base = yc + 50;
            D.rect(g, 735, yc - a - 30, 245, 2 * a + 100, { fill: '#f8fafc', stroke: C.line, width: 1.5, r: 8 });
            D.text(g, 'Output pulse', xc, yc - a - 12, { size: 16, weight: 800, align: 'center' });
            const sg = 8 + (sig - 8) * prog; pulse(g, xc, base, sg, 70 * Math.max(0.3, Math.sqrt(8 / sg)), kind === 'step' ? C.orange : C.green);
            D.text(g, `Δt ≈ ${tfmt(dt)}`, xc, base + 24, { size: 18, weight: 800, align: 'center', color: kind === 'step' ? C.orange : C.green });
          } else {
            const base = 505; const amp = 100;
            D.line(g, 40, base, 960, base, { color: C.line, width: 2 });
            D.text(g, 'Input pulse', 150, 372, { size: 17, weight: 800, align: 'center' }); pulse(g, 150, base, 8, amp, C.blue);
            D.arrow(g, 240, base - 45, 420, base - 45, { color: C.muted, width: 3 }); D.text(g, `after ${p.L} km`, 330, base - 66, { size: 17, weight: 700, color: C.muted, align: 'center' });
            const sg = 8 + (sig - 8) * prog; pulse(g, 660, base, sg, amp * Math.max(0.3, Math.sqrt(8 / sg)), kind === 'step' ? C.orange : C.green);
            D.tag(g, `Output spread Δt ≈ ${tfmt(dt)}`, 660, 372, { bg: kind === 'step' ? C.orange : C.green, size: 18, align: 'center' });
            D.focus(g, 440, 352, 440, 158, t);
          }
        }
      });
      if (cmp) {
        if (step >= 4) { D.tag(g, `Graded index: ${fmt(q.ratio, 3)}× less modal spread (8/Δ)`, 500, 510, { bg: C.ink, size: 18, align: 'center' }); D.focus(g, 730, 40, 255, 440, t); }
        else D.text(g, `Δ = ${p.delta} %   NA = ${fmt(q.NA, 3)}   L = ${p.L} km`, 500, 510, { size: 18, weight: 800, align: 'center', color: C.muted });
      } else if (step < 4) D.text(g, `Δ = ${p.delta} %   NA = ${fmt(q.NA, 3)}   L = ${p.L} km   (ray angles drawn ×${SG_K})`, 630, 380, { size: 17, weight: 700, align: 'center', color: C.muted });
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 6. Optical Fiber Communication Simulator
  // ─────────────────────────────────────────────────────────────
  const ATT = { 850: 2.5, 1310: 0.35, 1550: 0.2 };
  function fcCalc(p) {
    const lam = Number(p.band) || 1550; const al = ATT[lam] || 0.2;
    const fib = al * p.L; const prx = p.ptx - fib - p.loss; const margin = prx - p.sens;
    const Lmax = (p.ptx - p.loss - p.sens) / al; const ok = margin >= 0;
    const nRep = !ok && Lmax > 0 ? Math.ceil(p.L / Lmax) - 1 : 0;
    const mw = (dbm) => Math.pow(10, dbm / 10);
    return { lam, al, fib, prx, margin, Lmax, ok, nRep, ptxmW: mw(p.ptx), prxmW: mw(prx) };
  }
  function pw(mW) { return mW >= 1 ? `${fmt(mW, 3)} mW` : mW >= 1e-3 ? `${fmt(mW * 1e3, 3)} µW` : `${fmt(mW * 1e6, 3)} nW`; }
  S['ep-fiber-communication'] = {
    approx: 'Simple power budget: attenuation is uniform along the fibre, connector/splice losses are lumped (half at each end in the graph). Dispersion, noise and ageing margins are ignored. Pulse heights in the animation follow the power in dB.',
    params: [
      { key: 'ptx', label: 'Transmitted power P_tx', type: 'range', min: -10, max: 10, step: 0.5, default: 0, unit: 'dBm', help: '0 dBm = 1 mW, 10 dBm = 10 mW, −10 dBm = 0.1 mW.' },
      { key: 'band', label: 'Wavelength (attenuation)', type: 'select', options: [{ value: 850, label: '850 nm — 2.5 dB/km (multimode, LED/VCSEL)' }, { value: 1310, label: '1310 nm — 0.35 dB/km (laser)' }, { value: 1550, label: '1550 nm — 0.2 dB/km (laser)' }], default: 1550 },
      { key: 'L', label: 'Fibre length L', type: 'range', min: 0.5, max: 150, step: 0.5, default: 60, unit: 'km' },
      { key: 'loss', label: 'Connector + splice losses', type: 'range', min: 0, max: 10, step: 0.1, default: 2, unit: 'dB' },
      { key: 'sens', label: 'Receiver sensitivity', type: 'range', min: -45, max: -10, step: 1, default: -28, unit: 'dBm', help: 'Typical: PIN photodiode ≈ −20 to −28 dBm, APD ≈ −30 to −40 dBm.' },
    ],
    examples: [
      { label: '1550 nm long-haul with APD (80 km)', values: { ptx: 3, band: 1550, L: 80, loss: 2, sens: -34 } },
      { label: '1310 nm metro link with PIN (40 km)', values: { ptx: 0, band: 1310, L: 40, loss: 2, sens: -25 } },
      { label: '850 nm campus LAN, multimode (2 km)', values: { ptx: -3, band: 850, L: 2, loss: 1.5, sens: -17 } },
      { label: 'Too long: 1310 nm, 120 km with PIN', values: { ptx: 0, band: 1310, L: 120, loss: 2, sens: -25 } },
    ],
    validate: () => [],
    compute(p) {
      const q = fcCalc(p);
      const formulas = [
        { name: 'Power in dBm', formula: 'P(dBm) = 10 log₁₀(P / 1 mW)', given: `P_tx = ${p.ptx} dBm`, calc: `P_tx = 10^(${p.ptx}/10) mW`, result: pw(q.ptxmW), unit: 'optical power' },
        { name: 'Fibre attenuation', formula: 'Loss = α L', given: `α = ${q.al} dB/km (λ = ${q.lam} nm), L = ${p.L} km`, calc: `${q.al} × ${p.L}`, result: fmt(q.fib, 4), unit: 'dB' },
        { name: 'Received power (power budget)', formula: 'P_rx = P_tx − αL − losses', given: `losses = ${p.loss} dB`, calc: `P_rx = ${p.ptx} − ${fmt(q.fib, 4)} − ${p.loss}`, result: `${fmt(q.prx, 4)} dBm (${pw(q.prxmW)})`, unit: 'dBm' },
        { name: 'Link margin', formula: 'Margin = P_rx − sensitivity', given: `sensitivity = ${p.sens} dBm`, calc: `${fmt(q.prx, 4)} − (${p.sens})`, result: `${fmt(q.margin, 4)} → ${q.ok ? 'Link OK' : 'Link fails'}`, unit: 'dB' },
        { name: 'Longest span without a repeater', formula: 'L_max = (P_tx − losses − sensitivity) / α', given: `α = ${q.al} dB/km`, calc: `(${p.ptx} − ${p.loss} − (${p.sens})) / ${q.al}`, result: q.Lmax > 0 ? fmt(q.Lmax, 4) : '0 (budget too small)', unit: 'km' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'P_tx', value: `${p.ptx} dBm`, tone: 'info' },
          { label: 'Fibre loss', value: `${fmt(q.fib, 4)} dB` },
          { label: 'P_rx', value: `${fmt(q.prx, 4)} dBm` },
          { label: 'Margin', value: `${fmt(q.margin, 4)} dB`, tone: q.margin >= 3 ? 'good' : q.ok ? 'warn' : 'bad' },
          { label: 'Link', value: q.ok ? 'OK' : 'FAILS', tone: q.ok ? 'good' : 'bad' },
        ],
        state: { wavelength: `${q.lam} nm`, attenuation: `${q.al} dB/km`, length: `${p.L} km`, Ptx: `${p.ptx} dBm (${pw(q.ptxmW)})`, fibreLoss: `${fmt(q.fib, 4)} dB`, otherLosses: `${p.loss} dB`, Prx: `${fmt(q.prx, 4)} dBm (${pw(q.prxmW)})`, sensitivity: `${p.sens} dBm`, margin: `${fmt(q.margin, 4)} dB`, link: q.ok ? 'OK' : 'fails', maxSpan: `${fmt(Math.max(0, q.Lmax), 4)} km`, repeatersNeeded: q.nRep },
        explain: {
          what: `${pw(q.ptxmW)} (${p.ptx} dBm) is launched at ${q.lam} nm. The fibre loses ${fmt(q.fib, 4)} dB over ${p.L} km and connectors lose ${p.loss} dB, so ${fmt(q.prx, 4)} dBm (${pw(q.prxmW)}) reaches the photodetector. ${q.ok ? `That is ${fmt(q.margin, 4)} dB above the sensitivity, so the link works.` : `That is ${fmt(-q.margin, 4)} dB below the sensitivity, so the link fails${q.nRep ? ` — about ${q.nRep} repeater(s) are needed (span ≤ ${fmt(q.Lmax, 3)} km)` : ''}.`}`,
          why: 'Losses in decibels simply add: every kilometre removes α dB (absorption and Rayleigh scattering), every connector and splice removes a little more. The receiver needs at least its sensitivity to detect the bits correctly.',
          param: 'Transmitted power, wavelength (attenuation α), fibre length, connector/splice losses and receiver sensitivity.',
          effect: 'Longer fibre or higher α lowers the received power linearly in dB. 1550 nm has the lowest loss (≈ 0.2 dB/km), which is why long-haul links use it; a more sensitive receiver (APD) or more power increases the maximum span.',
        },
      };
    },
    steps(p) {
      const q = fcCalc(p);
      return [
        { title: 'Information source', text: 'Voice, video or data is turned into an electrical binary signal (1s and 0s).' },
        { title: 'Transmitter: modulator + light source', text: `The modulator switches the ${q.lam === 850 ? 'LED / VCSEL' : 'laser diode'} on and off: P_tx = ${p.ptx} dBm = ${pw(q.ptxmW)}.` },
        { title: 'Channel coupler launches light into the fibre', text: `Connectors and splices together lose ${p.loss} dB.` },
        { title: 'Light pulses travel and get weaker', text: `α = ${q.al} dB/km × ${p.L} km = ${fmt(q.fib, 4)} dB of attenuation${q.nRep ? `; repeaters would be needed every ≤ ${fmt(q.Lmax, 3)} km` : ''}.` },
        { title: 'Photodetector (PIN / APD)', text: `P_rx = ${fmt(q.prx, 4)} dBm = ${pw(q.prxmW)} is converted back into current. Sensitivity = ${p.sens} dBm.` },
        { title: q.ok ? 'Receiver output — Link OK' : 'Receiver output — Link fails', text: q.ok ? `Margin = ${fmt(q.margin, 4)} dB: the amplifier recovers the original bits.` : `Margin = ${fmt(q.margin, 4)} dB: the signal is too weak and bits are lost.` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1); const q = fcCalc(p);
      D.clear(g, '#ffffff');
      const blk = (x, y, w, h, l1, l2, col, on, hl) => {
        D.rect(g, x, y, w, h, { fill: on ? col + '22' : '#f8fafc', stroke: on ? col : C.line, width: on ? 2.5 : 1.5, r: 10 });
        D.text(g, l1, x + w / 2, l2 ? y + h / 2 - 11 : y + h / 2, { size: 17, weight: 800, align: 'center', color: on ? C.ink : C.faint });
        if (l2) D.text(g, l2, x + w / 2, y + h / 2 + 12, { size: 16, weight: 700, align: 'center', color: on ? C.muted : C.faint });
        if (hl) D.focus(g, x, y, w, h, t);
      };
      const FY = 252; const fx0 = 262; const fx1 = 758;
      // transmitter column
      blk(20, 40, 210, 64, 'Information source', 'binary data', '#475569', step >= 0, step === 0);
      blk(20, 130, 210, 64, 'Modulator', 'electrical driver', '#7c3aed', step >= 1, step === 1);
      blk(20, 220, 210, 64, 'Light source', q.lam === 850 ? 'LED / VCSEL' : 'Laser diode', '#dc2626', step >= 1, step === 1);
      D.arrow(g, 125, 104, 125, 128, { color: step >= 1 ? C.ink : C.faint, width: 2.5 }); D.arrow(g, 125, 194, 125, 218, { color: step >= 1 ? C.ink : C.faint, width: 2.5 });
      D.text(g, 'TRANSMITTER', 125, 300, { size: 16, weight: 800, color: C.muted, align: 'center' });
      // coupler
      D.poly(g, [[232, 236], [262, 246], [262, 258], [232, 268]], { fill: step >= 2 ? C.amber : C.line, close: true, stroke: false });
      D.text(g, 'coupler', 247, 214, { size: 16, weight: 700, color: C.muted, align: 'center' });
      if (step === 2) D.focus(g, 222, 200, 60, 72, t);
      // fibre
      D.rect(g, fx0, FY - 9, fx1 - fx0, 18, { fill: '#e0f2fe', stroke: '#0369a1', width: 1.5, r: 9 });
      D.line(g, fx0, FY, fx1, FY, { color: '#7dd3fc', width: 4 });
      D.text(g, `Optical fibre  L = ${p.L} km`, (fx0 + fx1) / 2, FY - 50, { size: 17, weight: 800, align: 'center', color: '#0369a1' });
      // repeaters
      const nr = Math.min(q.nRep, 6);
      for (let i = 1; i <= nr; i++) { const x = fx0 + ((fx1 - fx0) * i) / (nr + 1); D.rect(g, x - 14, FY - 16, 28, 32, { fill: '#fff', stroke: C.violet, width: 2.5, r: 5 }); D.text(g, 'R', x, FY, { size: 16, weight: 800, color: C.violet, align: 'center' }); }
      if (nr && step >= 3) D.tag(g, `Needs ${q.nRep} repeater${q.nRep > 1 ? 's' : ''} (span ≤ ${fmt(q.Lmax, 3)} km)`, 510, 128, { bg: C.violet, size: 16, align: 'center' });
      // pulses (binary data)
      const bits = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1];
      const Pfloor = Math.min(p.sens, q.prx) - 4;
      const ampAt = (fx) => { const P = p.ptx - p.loss / 2 - q.al * p.L * fx; return clamp((P - Pfloor) / (p.ptx - Pfloor || 1), 0.06, 1); };
      if (step >= 1) {
        const span = fx1 - fx0; const spd = step >= 3 ? 70 : 0;
        bits.forEach((b, i) => {
          if (!b) return; let x = step >= 3 ? fx0 + ((t * spd + i * 50) % span) : null;
          if (step < 3) { const xs = 60 + i * 17; D.rect(g, xs, 18, 12, 14, { fill: C.ink, r: 2 }); return; }
          const a = ampAt((x - fx0) / span); D.rect(g, x - 9, FY - 5 - 26 * a, 18, 10 + 52 * a, { fill: C.laser, alpha: 0.2 + 0.8 * a, r: 4 });
        });
      }
      if (step >= 1) D.tag(g, `P_tx = ${p.ptx} dBm = ${pw(q.ptxmW)}`, 250, 330, { bg: C.blue, size: 16, align: 'left' });
      if (step >= 3) D.text(g, `αL = ${q.al} dB/km × ${p.L} km = ${fmt(q.fib, 4)} dB`, (fx0 + fx1) / 2, FY + 48, { size: 17, weight: 800, align: 'center', color: C.orange });
      if (step === 3) D.focus(g, fx0, FY - 50, fx1 - fx0, 100, t);
      // receiver column
      blk(770, 220, 210, 64, 'Photodetector', 'PIN / APD', '#15803d', step >= 4, step === 4);
      blk(770, 310, 210, 64, 'Amplifier', 'receiver + decision', '#0891b2', step >= 5, step === 5);
      blk(770, 400, 210, 64, 'Output', 'information', '#475569', step >= 5, false);
      D.arrow(g, fx1, FY, 768, FY, { color: step >= 4 ? C.ink : C.faint, width: 2.5 });
      D.arrow(g, 875, 284, 875, 308, { color: step >= 5 ? C.ink : C.faint, width: 2.5 }); D.arrow(g, 875, 374, 875, 398, { color: step >= 5 ? C.ink : C.faint, width: 2.5 });
      D.text(g, 'RECEIVER', 875, 200, { size: 16, weight: 800, color: C.muted, align: 'center' });
      if (step >= 4) D.tag(g, `P_rx = ${fmt(q.prx, 4)} dBm = ${pw(q.prxmW)}`, 770, 330, { bg: q.ok ? C.green : C.red, size: 16, align: 'right' });
      if (step >= 5) {
        bits.forEach((b, i) => { const x = 790 + i * 17; const bad = !q.ok && (i * 7) % 3 === 0; D.rect(g, x, 490, 12, b ? 26 : 6, { fill: bad ? C.red : C.ink, r: 2, alpha: bad ? 0.8 : 1 }); });
        D.text(g, q.ok ? 'Bits recovered' : 'Bit errors', 875, 535, { size: 16, weight: 800, align: 'center', color: q.ok ? C.green : C.red });
      }
      // link status
      if (step >= 4) D.tag(g, q.ok ? `LINK OK — margin ${fmt(q.margin, 3)} dB` : `LINK FAILS — ${fmt(-q.margin, 3)} dB short`, 510, 70, { bg: q.ok ? C.green : C.red, size: 22, align: 'center' });
      else D.text(g, `λ = ${q.lam} nm,  α = ${q.al} dB/km`, 510, 70, { size: 20, weight: 800, align: 'center', color: C.muted });
      // power budget graph
      const gx = 330; const gy = 370; const gw = 400; const gh = 115;
      const ymax = p.ptx + 2; const ymin = Math.min(p.sens, q.prx) - 4;
      const X = (km) => gx + (km / p.L) * gw; const Yy = (dbm) => gy + gh - ((dbm - ymin) / (ymax - ymin)) * gh;
      D.rect(g, gx, gy, gw, gh, { fill: '#fff', stroke: C.line, width: 1.5 });
      D.text(g, 'Power along the link (dBm)', gx, gy - 16, { size: 16, weight: 800 });
      [ymax, ymin].forEach((v) => D.text(g, fmt(v, 3), gx - 8, Yy(v), { size: 16, color: C.muted, align: 'right' }));
      D.text(g, '0 km', gx, gy + gh + 16, { size: 16, color: C.muted, align: 'center' }); D.text(g, `${p.L} km`, gx + gw, gy + gh + 16, { size: 16, color: C.muted, align: 'center' });
      D.line(g, gx, Yy(p.sens), gx + gw, Yy(p.sens), { color: C.red, width: 2, dash: [7, 5] });
      D.text(g, `sensitivity ${p.sens} dBm`, gx + gw - 6, Yy(p.sens) + (Yy(p.sens) > gy + gh - 20 ? -14 : 14), { size: 16, weight: 700, color: C.red, align: 'right', halo: true });
      const fShow = step < 1 ? 0 : step === 1 ? 0.02 : step === 2 ? 0.05 : step === 3 ? prog : 1;
      const line = [[0, p.ptx], [0, p.ptx - p.loss / 2], [p.L, p.ptx - p.loss / 2 - q.fib], [p.L, q.prx]].map(([a, b]) => [X(a), Yy(b)]);
      if (fShow > 0) powerPath(g, line, null, pathLen(line) * fShow, C.blue, 3.5);
      if (step >= 4) { D.circle(g, X(p.L), Yy(q.prx), 7, { fill: q.ok ? C.green : C.red, stroke: '#fff', width: 2 }); }
      // budget table
      const rows = [['Power budget', '', C.ink, 800], ['P_tx', `${p.ptx} dBm`, C.blue, 700], ['− fibre αL', `${fmt(q.fib, 4)} dB`, C.orange, 700], ['− connectors', `${p.loss} dB`, C.orange, 700], ['= P_rx', `${fmt(q.prx, 4)} dBm`, q.ok ? C.green : C.red, 800], ['Margin', `${fmt(q.margin, 4)} dB`, q.ok ? C.green : C.red, 800]];
      rows.forEach(([s, v, col, w], i) => { if (step >= [1, 1, 3, 2, 4, 5][i]) { D.text(g, s, 24, 372 + i * 30, { size: 17, weight: w, color: col }); if (v) D.text(g, v, 240, 372 + i * 30, { size: 17, weight: 800, color: col, align: 'right' }); } });
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 7. Fiber Bending Loss Simulator
  // ─────────────────────────────────────────────────────────────
  function bdCalc(p) {
    const aMm = p.a / 1000; const tc = Optics.critical(p.n1, p.n2);
    const s = p.R / (p.R + aMm); const th = deg(Math.asin(s));
    const sc = tc != null ? Math.sin(rad(tc)) : 1; const Rc = tc != null ? (aMm * sc) / (1 - sc) : Infinity;
    const tir = tc != null && th >= tc - 1e-9;
    const Rf = tir ? 1 : Optics.reflectance(p.n1, p.n2, th);
    return { aMm, tc, s, th, Rc, tir, Rf };
  }
  S['ep-bending-loss'] = {
    approx: 'Macrobending ray-optics model: a ray travelling along the fibre axis meets the outer core boundary of the bend at θ with sin θ = R/(R + a) (tangent-line geometry, R measured to the fibre axis). Real single-mode fibres show measurable bend loss at larger radii (≈ 10–30 mm) because of wave effects that this ray model does not include. The bend is drawn schematically (not to scale); all numbers are exact for the model.',
    params: [
      { key: 'R', label: 'Bending radius R', type: 'range', min: 0.2, max: 30, step: 0.1, default: 5, unit: 'mm' },
      { key: 'a', label: 'Core radius a', type: 'range', min: 2, max: 500, step: 1, default: 25, unit: 'µm' },
      nParam('n1', 'Core refractive index n₁', 1.40, 1.60, 1.48),
      nParam('n2', 'Cladding refractive index n₂', 1.30, 1.59, 1.46),
    ],
    examples: [
      { label: 'Multimode silica, gentle bend (R = 5 mm)', values: { R: 5, a: 25, n1: 1.48, n2: 1.46 } },
      { label: 'Multimode silica, very tight bend (R = 1 mm)', values: { R: 1, a: 25, n1: 1.48, n2: 1.46 } },
      { label: 'Plastic fibre 1 mm core, R = 5 mm (leaks)', values: { R: 5, a: 490, n1: 1.49, n2: 1.402 } },
      { label: 'Plastic fibre 1 mm core, R = 20 mm (guided)', values: { R: 20, a: 490, n1: 1.49, n2: 1.402 } },
    ],
    validate: (p) => nWarn(p),
    compute(p) {
      const q = bdCalc(p);
      const formulas = [
        { name: 'Critical angle', formula: 'θc = sin⁻¹(n₂ / n₁)', given: `n₁ = ${nf(p.n1)}, n₂ = ${nf(p.n2)}`, calc: q.tc != null ? `θc = sin⁻¹(${(p.n2 / p.n1).toFixed(4)})` : 'n₂/n₁ ≥ 1', result: q.tc != null ? fmt(q.tc, 4) : 'none', unit: q.tc != null ? 'degrees (°)' : '—' },
        { name: 'Incident angle at the bend', formula: 'sin θ = R / (R + a)', given: `R = ${p.R} mm, a = ${p.a} µm = ${fmt(q.aMm, 3)} mm`, calc: `sin θ = ${p.R} / (${p.R} + ${fmt(q.aMm, 3)}) = ${q.s.toFixed(5)}`, result: fmt(q.th, 4), unit: 'degrees (°)' },
        { name: 'TIR test', formula: 'guided if θ ≥ θc', given: `θ = ${fmt(q.th, 4)}°`, calc: q.tc != null ? `${fmt(q.th, 4)}° ${q.tir ? '≥' : '<'} ${fmt(q.tc, 4)}°` : 'no θc', result: q.tir ? 'TIR: YES' : 'TIR: NO — light leaks', unit: '—' },
        { name: 'Critical bending radius', formula: 'R_c = a sin θc / (1 − sin θc)', given: `a = ${fmt(q.aMm, 3)} mm, sin θc = ${q.tc != null ? (p.n2 / p.n1).toFixed(4) : '—'}`, calc: q.tc != null ? `R_c = ${fmt(q.aMm, 3)} × ${(p.n2 / p.n1).toFixed(4)} / ${(1 - p.n2 / p.n1).toFixed(4)}` : '—', result: Number.isFinite(q.Rc) ? fmt(q.Rc, 3) : 'no guiding', unit: 'mm' },
      ];
      const Rcs = Number.isFinite(q.Rc) ? `${fmt(q.Rc, 3)} mm` : '∞';
      return {
        formulas,
        readouts: [
          { label: 'Critical angle', value: q.tc != null ? `${fmt(q.tc, 4)}°` : 'none' },
          { label: 'Angle at bend', value: `${fmt(q.th, 4)}°`, tone: 'info' },
          { label: 'R vs R_c', value: `${p.R} ${q.tir ? '≥' : '<'} ${Rcs}` },
          { label: 'TIR', value: q.tir ? 'YES' : 'NO', tone: q.tir ? 'good' : 'bad' },
        ],
        state: { bendRadius: `${p.R} mm`, coreRadius: `${p.a} µm`, n1: p.n1, n2: p.n2, criticalAngle: q.tc != null ? `${fmt(q.tc, 4)}°` : 'none', incidentAngleAtBend: `${fmt(q.th, 4)}°`, criticalBendRadius: Rcs, TIR: q.tir ? 'YES' : 'NO', reflectedFraction: `${fmt(q.Rf * 100, 3)} %` },
        explain: {
          what: q.tir ? `With R = ${p.R} mm the axial ray meets the outer core wall at θ = ${fmt(q.th, 4)}°, above θc = ${fmt(q.tc, 4)}°, so it is still totally reflected and the light goes round the bend.` : q.tc == null ? 'n₁ ≤ n₂ — nothing is guided even in a straight fibre.' : `With R = ${p.R} mm the axial ray meets the outer core wall at θ = ${fmt(q.th, 4)}°, below θc = ${fmt(q.tc, 4)}°, so it refracts out of the core — this is bending (radiation) loss.`,
          why: 'In a straight fibre the ray hits the wall at a large (grazing) angle. In a bend the outer wall turns towards the ray, so it strikes more steeply; the tighter the bend (small R), the smaller θ becomes.',
          param: 'Bend radius R, core radius a and the indices n₁, n₂.',
          effect: `Below R_c = ${Number.isFinite(q.Rc) ? fmt(q.Rc, 3) + ' mm' : '∞'} light escapes. A thicker core (bigger a) or a smaller index difference raises R_c, so such fibres must be bent more gently.`,
        },
      };
    },
    steps(p) {
      const q = bdCalc(p); const Rcs = Number.isFinite(q.Rc) ? `${fmt(q.Rc, 3)} mm` : '∞';
      return [
        { title: 'Light is guided in the straight part', text: 'A ray travels along the axis of the core.' },
        { title: `The fibre bends with radius R = ${p.R} mm`, text: 'The ray keeps going straight while the fibre curves away from it.' },
        { title: 'Angle of incidence at the outer wall', text: `sin θ = R/(R + a) = ${q.s.toFixed(5)} → θ = ${fmt(q.th, 4)}°.` },
        { title: 'Compare with the critical angle', text: q.tc != null ? `θc = ${fmt(q.tc, 4)}°: θ is ${q.tir ? 'larger — TIR' : 'smaller — no TIR'}.` : 'n₁ ≤ n₂: no critical angle.' },
        { title: q.tir ? 'Light stays guided round the bend' : 'Light leaks out of the bend', text: q.tir ? 'The ray hugs the outer wall by repeated TIR and leaves the bend.' : `Only ${fmt(q.Rf * 100, 3)} % is reflected at each hit — the rest radiates out.` },
        { title: 'Critical bending radius', text: `R_c = a sin θc/(1 − sin θc) = ${Rcs}. Bends tighter than this leak (R = ${p.R} mm).` },
      ];
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1); const q = bdCalc(p);
      D.clear(g, '#ffffff');
      // schematic geometry: compressed display angle, TIR in the drawing ⇔ TIR in the model
      const tc = q.tc != null ? q.tc : 90;
      const thd = q.th >= tc ? 45 + 15 * clamp((q.th - tc) / Math.max(0.5, 90 - tc), 0, 1) : 45 - 25 * clamp((tc - q.th) / Math.max(1, tc - 30), 0, 1);
      const ad = 30; const cl = 16; const sd = Math.sin(rad(thd)); const Rd = clamp((ad * sd) / (1 - sd), ad + cl + 12, 205);
      const O = [250, 290]; const Ro = Rd + ad; const Ri = Rd - ad;
      // fibre body: straight bottom, U-bend, straight top
      const ring = (r0, r1, fill) => { g.save(); g.beginPath(); g.arc(O[0], O[1], r1, -Math.PI / 2, Math.PI / 2); g.arc(O[0], O[1], r0, Math.PI / 2, -Math.PI / 2, true); g.closePath(); g.fillStyle = fill; g.fill(); g.restore(); };
      ring(Ri - cl, Ro + cl, '#e0f2fe'); ring(Ri, Ro, '#bae6fd');
      [1, -1].forEach((sg) => { const yA = O[1] + sg * Rd; D.rect(g, 30, yA - ad - cl, O[0] - 30, 2 * (ad + cl), { fill: '#e0f2fe' }); D.rect(g, 30, yA - ad, O[0] - 30, 2 * ad, { fill: '#bae6fd' }); });
      g.save(); g.strokeStyle = '#0369a1'; g.lineWidth = 2;
      [Ri, Ro].forEach((r) => { g.beginPath(); g.arc(O[0], O[1], r, -Math.PI / 2, Math.PI / 2); g.stroke(); });
      g.restore();
      [1, -1].forEach((sg) => { const yA = O[1] + sg * Rd; D.line(g, 30, yA - ad, O[0], yA - ad, { color: '#0369a1', width: 2 }); D.line(g, 30, yA + ad, O[0], yA + ad, { color: '#0369a1', width: 2 }); });
      // centre and R
      D.circle(g, O[0], O[1], 5, { fill: C.ink });
      if (step >= 1) {
        D.arrow(g, O[0], O[1], O[0] + Rd * Math.cos(rad(-35)), O[1] + Rd * Math.sin(rad(-35)), { color: C.violet, width: 2.5 });
        D.text(g, `Bend radius R = ${p.R} mm (centre → axis)`, 40, O[1] - Ro - cl - 22, { size: 17, weight: 800, color: C.violet, halo: true });
        if (step === 1) D.focus(g, O[0] - 10, O[1] - Ro - cl, Ro + cl + 20, 2 * (Ro + cl), t);
      }
      D.text(g, `Core radius a = ${p.a} µm`, 40, O[1] + Rd + ad + cl + 20 > 530 ? 530 : O[1] + Rd + ad + cl + 20, { size: 16, weight: 800, color: '#1e3a8a' });
      D.text(g, 'Bend drawn schematically — not to scale', 590, 540, { size: 16, weight: 700, color: C.muted });
      // ray
      const Y0 = O[1] + Rd; const Qx = O[0] + Math.sqrt(Ro * Ro - Rd * Rd); const Q = [Qx, Y0];
      const straight = [[40, Y0], [O[0], Y0], Q];
      const f0 = step === 0 ? prog : 1;
      if (step === 0) powerPath(g, straight.slice(0, 2), null, (O[0] - 40) * f0, C.laser, 5);
      else if (step === 1) powerPath(g, straight, null, pathLen(straight) * (0.6 + 0.4 * prog), C.laser, 5);
      else powerPath(g, straight, null, pathLen(straight), C.laser, 5);
      if (step >= 1) D.arrow(g, 60, Y0, 140, Y0, { color: C.laser, width: 5, head: 16 });
      // normal and angle at Q
      const nrm = [(Q[0] - O[0]) / Ro, (Q[1] - O[1]) / Ro];
      if (step >= 2) {
        D.line(g, Q[0] - 80 * nrm[0], Q[1] - 80 * nrm[1], Q[0] + 45 * nrm[0], Q[1] + 45 * nrm[1], { color: C.muted, width: 2, dash: [6, 6] });
        let a0 = Math.PI; let a1 = Math.atan2(-nrm[1], -nrm[0]); if (a1 - a0 > Math.PI) a1 -= 2 * Math.PI; if (a0 - a1 > Math.PI) a1 += 2 * Math.PI;
        arc(g, Q[0], Q[1], 38, a0, a1, C.laser);
        D.text(g, `θ = ${fmt(q.th, 4)}°`, Q[0] + 16, Q[1] + 44, { size: 17, weight: 800, color: C.laser, halo: true });
        if (step === 2) D.focus(g, Q[0] - 60, Q[1] - 50, 170, 110, t);
      }
      // after the hit
      if (step >= 4) {
        const f = step === 4 ? prog : 1;
        let P = Q; let d = [1, 0]; const pts = [Q]; const pws = []; let pwr = 1;
        const leaks = [];
        for (let i = 0; i < 40; i++) {
          const n = [(P[0] - O[0]) / Ro, (P[1] - O[1]) / Ro]; const dn = d[0] * n[0] + d[1] * n[1];
          if (!q.tir) { const tg = [d[0] - dn * n[0], d[1] - dn * n[1]]; const tl = Math.hypot(tg[0], tg[1]) || 1; const so = Math.min(1, Math.sin(Math.acos(Math.abs(dn))) / Math.sin(rad(45))); const co = Math.sqrt(1 - so * so); leaks.push([P, [n[0] * co + (tg[0] / tl) * so, n[1] * co + (tg[1] / tl) * so], pwr * (1 - q.Rf)]); }
          d = [d[0] - 2 * dn * n[0], d[1] - 2 * dn * n[1]];
          pwr *= q.tir ? 1 : q.Rf; if (pwr < 0.03) break;
          // next hit on the outer circle
          const fx = P[0] - O[0]; const fy = P[1] - O[1]; const b = fx * d[0] + fy * d[1]; const cc = fx * fx + fy * fy - Ro * Ro; const s = -b + Math.sqrt(Math.max(0, b * b - cc));
          const N = [P[0] + d[0] * s, P[1] + d[1] * s];
          if (N[0] < O[0] || s < 1e-6) { const s2 = (O[0] - P[0]) / (d[0] || -1e-6); const E = [P[0] + d[0] * s2, P[1] + d[1] * s2]; pts.push(E); pws.push(pwr); zig(E[0], E[1], 2 * E[0] - 40, O[1] - Rd - ad, O[1] - Rd + ad, Math.atan2(Math.abs(d[1]), Math.abs(d[0])), d[1] > 0 ? 1 : -1).slice(1).forEach((pt) => { pts.push([2 * E[0] - pt[0], pt[1]]); pws.push(pwr); }); break; }
          pts.push(N); pws.push(pwr); P = N;
        }
        // (zig above was generated in +x; mirrored to run towards −x)
        powerPath(g, pts, pws, pathLen(pts) * f, C.laser, 5);
        if (f >= 1) leaks.forEach(([L0, dir, w], i) => { if (w > 0.03) D.arrow(g, L0[0], L0[1], L0[0] + dir[0] * (70 + 50 * w), L0[1] + dir[1] * (70 + 50 * w), { color: C.orange, width: 1.5 + 3 * w, head: 12, alpha: 0.4 + 0.6 * w }); if (i === 0) D.text(g, 'Light leaks out', clamp(L0[0] + dir[0] * 125, 30, 520), clamp(L0[1] + dir[1] * 125 + 18, 40, 540), { size: 17, weight: 800, color: C.orange, halo: true }); });
        if (step >= 5 && q.tir) { const k = (t * 0.15) % 1; const qq = along([[40, Y0], ...pts], k); D.circle(g, qq[0], qq[1], 7, { fill: '#fff', stroke: C.laser, width: 3 }); }
      }
      // right panel
      const Rcs = Number.isFinite(q.Rc) ? `${fmt(q.Rc, 3)} mm` : '∞';
      if (step >= 3) tirTag(g, q.tir, 780, 44, 22, q.tir ? 'guided' : 'leaks');
      D.text(g, q.tc != null ? `Critical angle θc = ${fmt(q.tc, 4)}°` : 'No critical angle (n₁ ≤ n₂)', 590, 94, { size: 18, weight: 800, color: C.amber });
      D.text(g, `Angle at bend θ = ${fmt(q.th, 4)}°`, 590, 126, { size: 18, weight: 800, color: C.laser });
      if (step >= 3) { D.tag(g, `θ ${q.tir ? '≥' : '<'} θc`, 930, 110, { bg: q.tir ? C.green : C.red, size: 17, align: 'center' }); if (step === 3) D.focus(g, 584, 76, 396, 66, t); }
      D.text(g, `R = ${p.R} mm   vs   R_c = ${Rcs}`, 590, 160, { size: 18, weight: 800, color: step >= 5 ? (q.tir ? C.green : C.red) : C.ink });
      // chart θ(R)
      const cx = 660; const cy = 215; const cw = 300; const ch = 225;
      const xmax = Math.min(30, Math.max(2 * p.R, Number.isFinite(q.Rc) ? 3 * q.Rc : 0, 1));
      const th0 = deg(Math.asin(0.01 * xmax / (0.01 * xmax + q.aMm)));
      const ymin = Math.max(0, Math.floor(Math.min(th0, q.tc != null ? q.tc : 90, q.th) / 5) * 5 - 5); const ymax = 90;
      const X = (r) => cx + (r / xmax) * cw; const Yc = (a) => cy + ch - ((a - ymin) / (ymax - ymin)) * ch;
      D.rect(g, cx, cy, cw, ch, { fill: '#fff', stroke: C.line, width: 1.5 });
      D.text(g, 'θ at bend vs R', cx, cy - 16, { size: 16, weight: 800 });
      const curve = []; for (let i = 0; i <= 120; i++) { const r = 0.005 * xmax + (i / 120) * xmax * 0.995; curve.push([X(r), Yc(deg(Math.asin(r / (r + q.aMm))))]); }
      g.save(); g.beginPath(); g.rect(cx, cy, cw, ch); g.clip(); D.poly(g, curve, { stroke: C.blue, width: 3 }); g.restore();
      if (q.tc != null) { D.line(g, cx, Yc(q.tc), cx + cw, Yc(q.tc), { color: C.amber, width: 2, dash: [6, 5] }); D.text(g, 'θc', cx + cw - 8, Yc(q.tc) + 14, { size: 16, weight: 800, color: C.amber, align: 'right' }); }
      if (Number.isFinite(q.Rc) && q.Rc <= xmax) { D.line(g, X(q.Rc), cy, X(q.Rc), cy + ch, { color: C.red, width: 2, dash: [6, 5] }); D.text(g, 'R_c', X(q.Rc) + 6, cy + ch - 14, { size: 16, weight: 800, color: C.red }); }
      D.circle(g, X(Math.min(p.R, xmax)), Yc(q.th), 8, { fill: q.tir ? C.green : C.red, stroke: '#fff', width: 2 });
      D.text(g, `${ymax}°`, cx - 6, cy, { size: 16, color: C.muted, align: 'right' }); D.text(g, `${ymin}°`, cx - 6, cy + ch, { size: 16, color: C.muted, align: 'right' });
      D.text(g, '0', cx, cy + ch + 16, { size: 16, color: C.muted, align: 'center' }); D.text(g, `${fmt(xmax, 3)} mm`, cx + cw, cy + ch + 16, { size: 16, color: C.muted, align: 'right' });
      D.text(g, 'Bending radius R', cx + cw / 2, cy + ch + 40, { size: 16, weight: 700, color: C.muted, align: 'center' });
      if (step >= 5) D.focus(g, cx - 50, cy - 30, cw + 60, ch + 80, t);
      D.text(g, 'sin θ = R / (R + a)', 590, 508, { size: 18, weight: 800, color: C.blue });
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 8. Fiber Optic Endoscopy Visualizer (conceptual)
  // ─────────────────────────────────────────────────────────────
  const ENDO_STEPS = {
    illumination: ['tube', 'illum', 'incoh', 'light', 'tir'],
    imaging: ['tube', 'image', 'tir', 'view', 'res'],
    both: ['tube', 'illum', 'light', 'image', 'tir', 'view', 'res'],
  };
  function enCalc(p) {
    const NA = Optics.na(p.n1, p.n2); const tc = Optics.critical(p.n1, p.n2); const ta = deg(Math.asin(Math.min(1, NA)));
    const N = Number(p.fibres) || 30000; const side = Math.round(Math.sqrt(N));
    return { NA, tc, ta, N, side, grid: N <= 10000 ? 9 : N <= 30000 ? 13 : 18 };
  }
  /** Tissue picture seen by the endoscope (u, v in 0..1). */
  function tissue(u, v) {
    const lesion = Math.hypot(u - 0.62, v - 0.42) < 0.2;
    const vessel = Math.abs(v - (0.72 + 0.09 * Math.sin(u * 7))) < 0.05;
    return lesion ? '#9f1239' : vessel ? '#be123c' : (u + v) % 0.5 < 0.25 ? '#fda4af' : '#fecdd3';
  }
  function drawGrid(g, x, y, s, n, o = {}) {
    const c = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const col = tissue((i + 0.5) / n, (j + 0.5) / n);
      if (o.round) D.circle(g, x + (i + 0.5) * c, y + (j + 0.5) * c, c * 0.46, { fill: col }); else D.rect(g, x + i * c, y + j * c, c + 0.5, c + 0.5, { fill: col });
    }
    D.rect(g, x, y, s, s, { stroke: C.ink, width: 2 });
  }
  S['ep-endoscopy'] = {
    conceptual: true,
    approx: 'Conceptual visualization: fibre counts and the picture are schematic (each drawn circle stands for many fibres). The NA and acceptance angle are calculated from n₁ and n₂ with n₀ = 1 (air).',
    modes: [{ key: 'both', label: 'Both paths' }, { key: 'illumination', label: 'Illumination path' }, { key: 'imaging', label: 'Imaging path' }],
    params: [
      { key: 'fibres', label: 'Fibres in the imaging bundle', type: 'select', options: [{ value: 10000, label: '10 000 fibres' }, { value: 30000, label: '30 000 fibres' }, { value: 50000, label: '50 000 fibres' }], default: 30000 },
      nParam('n1', 'Fibre core index n₁', 1.45, 1.75, 1.62),
      nParam('n2', 'Fibre cladding index n₂', 1.40, 1.70, 1.52),
    ],
    examples: [
      { label: 'Flexible gastroscope (30 000 fibres)', values: { fibres: 30000, n1: 1.62, n2: 1.52 } },
      { label: 'Thin bronchoscope (10 000 fibres)', values: { fibres: 10000, n1: 1.62, n2: 1.52 } },
      { label: 'High-resolution scope (50 000 fibres, NA ≈ 0.66)', values: { fibres: 50000, n1: 1.62, n2: 1.48 } },
    ],
    validate: (p) => nWarn(p),
    compute(p) {
      const q = enCalc(p);
      const formulas = [
        { name: 'Numerical aperture of each fibre', formula: 'NA = √(n₁² − n₂²)', given: `n₁ = ${nf(p.n1)}, n₂ = ${nf(p.n2)}`, calc: `NA = √(${(p.n1 * p.n1 - p.n2 * p.n2).toFixed(4)})`, result: fmt(q.NA, 3), unit: 'no unit' },
        { name: 'Acceptance angle (in air)', formula: 'θa = sin⁻¹(NA)', given: `NA = ${fmt(q.NA, 3)}`, calc: q.NA >= 1 ? 'NA ≥ 1 → θa = 90°' : `θa = sin⁻¹(${fmt(q.NA, 3)})`, result: fmt(q.ta, 4), unit: 'degrees (°)' },
        { name: 'Critical angle (TIR in each fibre)', formula: 'θc = sin⁻¹(n₂ / n₁)', given: `n₂/n₁ = ${(p.n2 / p.n1).toFixed(4)}`, calc: q.tc != null ? `θc = sin⁻¹(${(p.n2 / p.n1).toFixed(4)})` : 'n₁ ≤ n₂', result: q.tc != null ? fmt(q.tc, 4) : 'none', unit: q.tc != null ? 'degrees (°)' : '—' },
        { name: 'Image resolution (idea)', formula: 'one fibre = one pixel → ≈ √N × √N pixels', given: `N = ${q.N.toLocaleString('en-US')} fibres`, calc: `√${q.N} ≈ ${q.side}`, result: `≈ ${q.side} × ${q.side}`, unit: 'pixels' },
      ];
      return {
        formulas,
        readouts: [
          { label: 'NA', value: fmt(q.NA, 3), tone: 'info' },
          { label: 'Acceptance angle', value: `${fmt(q.ta, 4)}°` },
          { label: 'Critical angle', value: q.tc != null ? `${fmt(q.tc, 4)}°` : 'none' },
          { label: 'Pixels', value: `≈ ${q.side} × ${q.side}` },
          { label: 'TIR', value: q.tc != null ? 'YES' : 'NO', tone: q.tc != null ? 'good' : 'bad' },
        ],
        state: { mode: p.mode, fibres: q.N, NA: fmt(q.NA, 3), acceptanceAngle: `${fmt(q.ta, 4)}°`, criticalAngle: q.tc != null ? `${fmt(q.tc, 4)}°` : 'none', pixels: `${q.side} × ${q.side}` },
        explain: {
          what: p.mode === 'illumination' ? 'Light from the lamp travels down the illumination bundle by total internal reflection and floods the inside of the body with light.' : p.mode === 'imaging' ? `The objective lens forms a picture on the end of the coherent bundle. Each of the ${q.N.toLocaleString('en-US')} fibres carries one small patch (pixel) of that picture back to the eyepiece or camera.` : `An endoscope has two bundles: an incoherent one that carries light in, and a coherent one (${q.N.toLocaleString('en-US')} fibres) that carries the image out, pixel by pixel.`,
          why: `Each fibre guides light by TIR (θc = ${q.tc != null ? fmt(q.tc, 4) + '°' : '—'}) and accepts light within θa = ${fmt(q.ta, 4)}° (NA = ${fmt(q.NA, 3)}). In the imaging bundle the fibres keep the same positions at both ends, so the pattern of brightness is reproduced.`,
          param: 'Number of fibres in the imaging bundle and the fibre indices n₁, n₂.',
          effect: 'More fibres → more pixels → a sharper image. A larger NA collects more light, so the image is brighter.',
        },
      };
    },
    steps(p) {
      const q = enCalc(p);
      const T = {
        tube: { title: 'Inside the endoscope', text: 'A flexible tube holds two fibre bundles: one to carry light in, one to carry the image out.' },
        illum: { title: 'Illumination bundle carries light in', text: 'Light from the lamp enters the fibres within the acceptance angle and is guided by TIR to the tip.' },
        incoh: { title: 'Incoherent bundle is enough for light', text: 'The illumination fibres are jumbled — their order does not matter because they only carry brightness.' },
        light: { title: 'Light illuminates the tissue', text: 'At the tip the light spreads out and lights up the inside of the organ.' },
        image: { title: 'Objective lens forms an image', text: 'The lens focuses the lit tissue onto the end face of the coherent (imaging) bundle.' },
        tir: { title: 'Each fibre guides light by TIR', text: `θc = ${q.tc != null ? fmt(q.tc, 4) + '°' : '—'}; light within θa = ${fmt(q.ta, 4)}° (NA = ${fmt(q.NA, 3)}) is trapped in each fibre.` },
        view: { title: 'Image at the eyepiece / camera', text: 'Fibres are in the same order at both ends, so every pixel arrives in the right place.' },
        res: { title: 'Resolution = number of fibres', text: `${q.N.toLocaleString('en-US')} fibres → about ${q.side} × ${q.side} pixels.` },
      };
      return ENDO_STEPS[p.mode || 'both'].map((k) => T[k]);
    },
    draw(g, S2) {
      const { p, step, st, t, dur } = S2; const prog = clamp(st / dur, 0, 1); const q = enCalc(p);
      D.clear(g, '#ffffff');
      const ids = ENDO_STEPS[p.mode || 'both'] || ENDO_STEPS.both; const cur = ids[Math.min(step, ids.length - 1)]; const has = (k) => ids.slice(0, step + 1).includes(k);
      const showI = p.mode !== 'imaging'; const showM = p.mode !== 'illumination';
      // insertion tube
      D.rect(g, 250, 150, 590, 150, { fill: '#f1f5f9', stroke: '#64748b', width: 3, r: 24 });
      D.text(g, 'Flexible insertion tube', 545, 318, { size: 16, weight: 700, color: C.muted, align: 'center' });
      if (cur === 'tube') D.focus(g, 250, 150, 590, 150, t);
      // tissue (organ wall)
      const tx = 905; const ty = 100; const tw = 75; const th = 250;
      D.rect(g, tx, ty, tw, th, { fill: '#fecdd3', r: 6 }); D.rect(g, tx, ty, 14, th, { fill: '#fda4af' });
      [0.25, 0.8].forEach((v) => { const pts = []; for (let x = tx; x <= tx + tw; x += 3) pts.push([x, ty + v * th + 6 * Math.sin((x - tx) / 9)]); D.poly(g, pts, { stroke: '#be123c', width: 3 }); });
      g.save(); g.beginPath(); g.ellipse(tx + 12, ty + 0.45 * th, 16, 30, 0, 0, Math.PI * 2); g.fillStyle = '#9f1239'; g.fill(); g.restore();
      D.text(g, 'Tissue', tx + tw / 2, ty - 16, { size: 17, weight: 800, color: '#9f1239', align: 'center' });
      // illumination bundle (top)
      const iy = 190; const my = 262;
      const aI = showI ? 1 : 0.25; const aM = showM ? 1 : 0.25;
      D.rect(g, 20, 160, 190, 60, { fill: C.amberSoft, stroke: C.amber, width: 2.5, r: 10, alpha: aI });
      D.text(g, 'Light source', 115, 180, { size: 17, weight: 800, align: 'center', color: showI ? C.ink : C.faint });
      D.text(g, '(lamp / LED)', 115, 202, { size: 16, weight: 700, align: 'center', color: showI ? C.muted : C.faint });
      g.save(); g.globalAlpha = aI;
      for (let k = 0; k < 5; k++) { // jumbled strands
        const pts = []; for (let x = 210; x <= 850; x += 8) pts.push([x, iy - 12 + k * 6 + 7 * Math.sin((x / 70) + k * 1.7) * Math.sin(x / 190 + k)]);
        D.poly(g, pts, { stroke: k % 2 ? '#f59e0b' : '#fbbf24', width: 3 });
      }
      g.restore();
      D.text(g, 'Illumination bundle (incoherent)', 545, 162 + 0, { size: 16, weight: 800, color: showI ? C.amber : C.faint, align: 'center', halo: true });
      // imaging bundle (bottom)
      g.save(); g.globalAlpha = aM;
      for (let k = 0; k < 5; k++) D.line(g, 230, my - 12 + k * 6, 830, my - 12 + k * 6, { color: ['#60a5fa', '#3b82f6', '#2563eb', '#3b82f6', '#60a5fa'][k], width: 3 });
      g.restore();
      D.text(g, 'Imaging bundle (coherent)', 545, 292, { size: 16, weight: 800, color: showM ? C.blue : C.faint, align: 'center', halo: true });
      // objective lens at tip
      g.save(); g.globalAlpha = aM; g.beginPath(); g.ellipse(862, my, 9, 32, 0, 0, Math.PI * 2); g.fillStyle = '#bfdbfe'; g.fill(); g.strokeStyle = C.blue; g.lineWidth = 2; g.stroke(); g.restore();
      // camera / eyepiece
      D.rect(g, 20, 235, 190, 60, { fill: C.blueSoft, stroke: C.blue, width: 2.5, r: 10, alpha: aM });
      D.text(g, 'Eyepiece / camera', 115, 265, { size: 17, weight: 800, align: 'center', color: showM ? C.ink : C.faint });
      if (showM) D.arrow(g, 230, my, 212, my, { color: C.blue, width: 3 });
      // illumination light flow
      if (showI && has('illum')) {
        D.arrow(g, 210, iy, 245, iy, { color: C.amber, width: 4 });
        const k = cur === 'illum' ? prog : 1;
        for (let i = 0; i < 6; i++) { const x = 250 + (((t * 0.25 + i / 6) % 1) * 590) * (cur === 'illum' ? k : 1); D.circle(g, x, iy + 6 * Math.sin(i * 2 + t * 3), 6, { fill: C.photon, alpha: 0.9 }); }
        if (cur === 'illum') D.focus(g, 20, 160, 830, 50, t);
      }
      if (showI && has('incoh') && cur === 'incoh') { D.tag(g, 'Fibres jumbled — order does not matter for light', 545, 120, { bg: C.amber, size: 17, align: 'center' }); D.focus(g, 250, 170, 590, 45, t); }
      if (showI && has('light')) {
        const k = cur === 'light' ? prog : 1;
        [-50, -20, 10, 40].forEach((dy) => D.arrow(g, 840, iy, 840 + 60 * k, iy + dy * k + 10 * k, { color: C.photon, width: 3 }));
        g.save(); g.globalAlpha = 0.25 * k; g.beginPath(); g.moveTo(840, iy); g.lineTo(905, iy - 90); g.lineTo(905, iy + 120); g.closePath(); g.fillStyle = C.hi; g.fill(); g.restore();
        if (cur === 'light') D.focus(g, 835, 100, 150, 250, t);
      }
      // imaging: rays from tissue through lens
      if (showM && has('image')) {
        const k = cur === 'image' ? prog : 1;
        [[905, 225], [905, 300]].forEach(([x, y], i) => { const tgt = [840, my + (i ? -16 : 16)]; D.line(g, x, y, x + (862 - x) * k, y + (my - y) * k, { color: C.blue, width: 2.5 }); if (k >= 1) D.line(g, 862, my, tgt[0], tgt[1], { color: C.blue, width: 2.5 }); });
        if (cur === 'image') D.focus(g, 830, 215, 150, 100, t);
      }
      if (showM && has('view')) {
        const off = (t * 0.25) % 1; for (let i = 0; i < 5; i++) { const x = 830 - ((off + i / 5) % 1) * 600; D.circle(g, x, my + (i - 2) * 6, 5, { fill: C.blue, alpha: 0.8 }); }
      }
      // bottom band: grids and TIR inset
      if (showM && (has('image') || has('view'))) {
        const s = 150;
        D.text(g, 'Tip: fibre-end image', 820, 362, { size: 16, weight: 800, align: 'center', color: C.blue });
        drawGrid(g, 745, 380, s, q.grid, { round: true });
        D.arrow(g, 820, 322, 820, 346, { color: C.blue, width: 2.5 });
      }
      if (showM && has('view')) {
        D.text(g, 'Monitor (same order)', 125, 362, { size: 16, weight: 800, align: 'center', color: C.blue });
        drawGrid(g, 50, 380, 150, q.grid);
        D.arrow(g, 115, 297, 115, 346, { color: C.blue, width: 2.5 });
        if (cur === 'view') D.focus(g, 44, 374, 162, 162, t);
      }
      if (has('res') && cur === 'res') D.focus(g, 739, 374, 162, 162, t);
      if (has('tir')) {
        const x0 = 260; const x1 = 690; const yc = 450; const hc = 22;
        D.rect(g, x0 - 20, 360, x1 - x0 + 40, 180, { fill: '#f8fafc', stroke: C.line, width: 1.5, r: 10 });
        D.text(g, 'Zoom: one fibre (core + cladding)', x0, 378, { size: 16, weight: 800 });
        fibreBody(g, x0, x1, yc, hc, 12, { face: true });
        const pts = zig(x0, yc, x1, yc - hc, yc + hc, rad(22), -1);
        powerPath(g, pts, null, pathLen(pts) * (cur === 'tir' ? prog : 1), showI && !showM ? C.photon : C.laser, 4);
        D.text(g, `NA = ${fmt(q.NA, 3)}   θa = ${fmt(q.ta, 3)}°   θc = ${q.tc != null ? fmt(q.tc, 3) + '°' : '—'}`, (x0 + x1) / 2, 508, { size: 17, weight: 800, align: 'center', color: C.blue });
        tirTag(g, q.tc != null, (x0 + x1) / 2 + 150, 378, 16);
        if (cur === 'tir') D.focus(g, x0 - 20, 360, x1 - x0 + 40, 180, t);
      }
      if (has('res')) D.tag(g, `${q.N.toLocaleString('en-US')} fibres → ≈ ${q.side} × ${q.side} pixels`, 545, 110, { bg: C.ink, size: 18, align: 'center' });
      D.tag(g, 'Conceptual — not to scale', 545, 40, { bg: C.muted, size: 16, align: 'center' });
    },
  };
})();
