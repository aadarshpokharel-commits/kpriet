'use strict';

/*
 * Electrical & Electronics drawing kit (U25EEG02) — circuit symbols, animated current flow, SI formatting
 * and the challenge formulas shared by every EE simulation. Canvas space is EPDraw's 1000 × 560.
 *
 * Two-terminal parts are drawn between terminal points a → b (any direction):
 *   resistor, cell (DC source), ac (AC source), diode, zener, capacitor, coil, lamp, switch, fuse
 * Three-terminal devices return their terminal coordinates: bjt → {b, c, e}, fet → {g, d, s}.
 * flow(g, path, t, amps) animates charge dots along a polyline (speed ∝ current, direction by sign).
 */
(function () {
  const D = window.EPDraw; const C = D.C;
  const INK = '#1e293b'; const WIRE = '#334155';

  // ── SI formatting ──
  function si(v, unit, digits = 3) {
    if (v == null || Number.isNaN(v)) return '—';
    if (!Number.isFinite(v)) return (v > 0 ? '∞ ' : '−∞ ') + unit;
    const a = Math.abs(v);
    const P = [[1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n']];
    let pr = P.find(([m]) => a >= m * 0.9995) || P[P.length - 1];
    if (a === 0) pr = [1, ''];
    if (unit === 'Ω' && pr[1] === 'm') pr = [1, ''];
    const x = v / pr[0];
    const ax = Math.abs(x);
    const dp = ax >= 100 ? Math.max(0, digits - 3) : ax >= 10 ? Math.max(0, digits - 2) : Math.max(0, digits - 1);
    return `${Number(x.toFixed(dp)).toString().replace('-', '−')} ${pr[1]}${unit}`;
  }
  const n = (v, d = 3) => D.fmt(v, d).replace('-', '−');

  // ── geometry ──
  function frame(g, a, b, fn) {
    const dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy); const ang = Math.atan2(dy, dx);
    g.save(); g.translate(a[0], a[1]); g.rotate(ang); fn(L); g.restore();
    return { L, ang, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], nx: -dy / (L || 1), ny: dx / (L || 1) };
  }
  function stroke(g, color, w) { g.strokeStyle = color || INK; g.lineWidth = w || 3; g.lineCap = 'round'; g.lineJoin = 'round'; }
  function leads(g, L, body, o) { stroke(g, o.leadColor || WIRE, o.width || 3); const s = (L - body) / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(s, 0); g.moveTo(L - s, 0); g.lineTo(L, 0); g.stroke(); return s; }
  function label(g, f, o, dflt = 26) {
    if (!o.label && !o.value) return;
    const off = o.labelOffset == null ? dflt : o.labelOffset; const side = o.labelSide === 'other' ? -1 : 1;
    // keep labels on the upper / left side of the part
    let nx = f.nx * side, ny = f.ny * side; if (ny > 0.01 || (Math.abs(ny) < 0.01 && nx > 0)) { nx = -nx; ny = -ny; }
    const x = f.mid[0] + nx * off, y = f.mid[1] + ny * off;
    const al = Math.abs(nx) > 0.7 ? (nx < 0 ? 'right' : 'left') : 'center';
    if (o.label) D.text(g, o.label, x, y - (o.value ? 9 : 0), { size: o.size || 15, weight: 800, align: al, color: o.labelColor || INK, halo: true });
    if (o.value) D.text(g, o.value, x, y + (o.label ? 10 : 0), { size: (o.size || 15) - 1, weight: 700, align: al, color: o.valueColor || C.blue, halo: true });
  }

  // ── two-terminal parts ──
  function wire(g, pts, o = {}) { D.poly(g, pts, { stroke: o.color || WIRE, width: o.width || 3, dash: o.dash }); }
  function resistor(g, a, b, o = {}) {
    const f = frame(g, a, b, (L) => {
      const body = Math.min(o.body || 70, L - 10); const s = leads(g, L, body, o);
      if (o.box) { g.fillStyle = o.fill || '#fff'; g.fillRect(s, -9, body, 18); stroke(g, o.color || INK, 2.6); g.strokeRect(s, -9, body, 18); }
      else { stroke(g, o.color || INK, o.width || 3); g.beginPath(); g.moveTo(s, 0); const k = 6; for (let i = 0; i < k; i++) g.lineTo(s + ((i + 0.5) * body) / k, i % 2 ? 9 : -9); g.lineTo(s + body, 0); g.stroke(); }
      if (o.heat) { g.globalAlpha = Math.min(0.55, o.heat); g.fillStyle = '#f97316'; g.fillRect(s, -12, body, 24); g.globalAlpha = 1; }
    });
    label(g, f, o);
    return f;
  }
  function cell(g, a, b, o = {}) { // DC source: a = negative, b = positive terminal
    const f = frame(g, a, b, (L) => {
      const body = 22; const s = leads(g, L, body, o);
      stroke(g, o.color || INK, 3); g.beginPath(); g.moveTo(s + 4, -9); g.lineTo(s + 4, 9); g.stroke();
      stroke(g, o.color || INK, 3); g.beginPath(); g.moveTo(s + body - 2, -18); g.lineTo(s + body - 2, 18); g.stroke();
      g.save(); g.rotate(0); g.restore();
    });
    label(g, f, Object.assign({ labelOffset: 34 }, o));
    const px = b[0] + (a[0] - b[0]) * 0.28 + f.nx * 16, py = b[1] + (a[1] - b[1]) * 0.28 + f.ny * 16; if (o.signs !== false) D.text(g, '+', px, py, { size: 16, weight: 900, align: 'center', color: C.red });
    return f;
  }
  function ac(g, a, b, o = {}) {
    const f = frame(g, a, b, (L) => {
      const r = o.r || 22; const s = leads(g, L, 2 * r, o);
      g.beginPath(); g.arc(s + r, 0, r, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); stroke(g, o.color || INK, 3); g.stroke();
      g.beginPath(); for (let i = 0; i <= 20; i++) { const x = s + r - r * 0.6 + (1.2 * r * i) / 20; const y = -Math.sin((i / 20) * Math.PI * 2 + (o.phase || 0)) * r * 0.38; if (i) g.lineTo(x, y); else g.moveTo(x, y); } stroke(g, o.color || C.blue, 2.6); g.stroke();
    });
    label(g, f, Object.assign({ labelOffset: 40 }, o));
    return f;
  }
  function diode(g, a, b, o = {}) { // anode a → cathode b
    const on = o.on; const col = o.color || (on ? '#15803d' : INK);
    const f = frame(g, a, b, (L) => {
      const body = 30; const s = leads(g, L, body, o);
      g.beginPath(); g.moveTo(s, -14); g.lineTo(s + body - 6, 0); g.lineTo(s, 14); g.closePath(); g.fillStyle = on ? '#bbf7d0' : (o.fill || '#fff'); g.fill(); stroke(g, col, 2.8); g.stroke();
      stroke(g, col, 3.4); g.beginPath(); g.moveTo(s + body - 6, -15); g.lineTo(s + body - 6, 15);
      if (o.zener) { g.moveTo(s + body - 6, -15); g.lineTo(s + body - 12, -19); g.moveTo(s + body - 6, 15); g.lineTo(s + body, 19); }
      g.stroke();
      if (o.glow) { g.globalAlpha = 0.25; g.fillStyle = '#22c55e'; g.beginPath(); g.arc(s + body / 2, 0, 24, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    });
    label(g, f, Object.assign({ labelOffset: 30 }, o));
    return f;
  }
  const zener = (g, a, b, o = {}) => diode(g, a, b, Object.assign({ zener: true }, o));
  function capacitor(g, a, b, o = {}) {
    const f = frame(g, a, b, (L) => {
      const body = 14; leads(g, L, body, o); const s = (L - body) / 2;
      stroke(g, o.color || INK, 3.4); g.beginPath(); g.moveTo(s, -16); g.lineTo(s, 16); g.moveTo(s + body, -16); g.lineTo(s + body, 16); g.stroke();
      if (o.charge) { g.globalAlpha = Math.min(0.5, Math.abs(o.charge)); g.fillStyle = '#60a5fa'; g.fillRect(s + 2, -15, body - 4, 30); g.globalAlpha = 1; }
    });
    label(g, f, Object.assign({ labelOffset: 30 }, o));
    return f;
  }
  function coil(g, a, b, o = {}) {
    const f = frame(g, a, b, (L) => {
      const turns = o.turns || 4; const body = Math.min(L - 10, o.body || turns * 16); const s = leads(g, L, body, o);
      stroke(g, o.color || '#b45309', 3); g.beginPath(); const w = body / turns;
      for (let i = 0; i < turns; i++) g.arc(s + w * i + w / 2, 0, w / 2, Math.PI, 0, false);
      g.stroke();
    });
    label(g, f, o);
    return f;
  }
  function lamp(g, a, b, o = {}) {
    const f = frame(g, a, b, (L) => {
      const r = 18; const s = leads(g, L, 2 * r, o);
      if (o.glow) { const gr = g.createRadialGradient(s + r, 0, 2, s + r, 0, r * 2.6); gr.addColorStop(0, `rgba(250,204,21,${Math.min(0.9, o.glow)})`); gr.addColorStop(1, 'rgba(250,204,21,0)'); g.fillStyle = gr; g.beginPath(); g.arc(s + r, 0, r * 2.6, 0, Math.PI * 2); g.fill(); }
      g.beginPath(); g.arc(s + r, 0, r, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); stroke(g, INK, 2.8); g.stroke();
      g.beginPath(); g.moveTo(s + r - 12, -12); g.lineTo(s + r + 12, 12); g.moveTo(s + r + 12, -12); g.lineTo(s + r - 12, 12); g.stroke();
    });
    label(g, f, Object.assign({ labelOffset: 34 }, o));
    return f;
  }
  function sw(g, a, b, o = {}) {
    const f = frame(g, a, b, (L) => {
      const body = 40; const s = leads(g, L, body, o);
      D.circle(g, s, 0, 4, { fill: INK }); D.circle(g, s + body, 0, 4, { fill: INK });
      stroke(g, o.closed ? '#15803d' : INK, 3); g.beginPath(); g.moveTo(s, 0); if (o.closed) g.lineTo(s + body, 0); else g.lineTo(s + body - 4, -20); g.stroke();
    });
    label(g, f, Object.assign({ labelOffset: 28 }, o));
    return f;
  }
  function motor(g, x, y, r = 30, o = {}) {
    D.circle(g, x, y, r, { fill: o.fill || '#fff', stroke: INK, width: 3 });
    D.text(g, o.text || 'M', x, y + 1, { size: r * 0.9, weight: 900, align: 'center', color: INK });
    if (o.angle != null) { g.save(); g.translate(x, y); g.rotate(o.angle); D.line(g, 0, 0, r * 0.75, 0, { color: C.red, width: 3 }); g.restore(); }
  }
  function node(g, x, y, o = {}) {
    D.circle(g, x, y, o.r || 6, { fill: o.color || INK, stroke: '#fff', width: 2 });
    if (o.label) D.tag(g, o.label, x + (o.dx ?? 10), y + (o.dy ?? -18), { bg: o.bg || INK, size: o.size || 13 });
  }
  function ground(g, x, y, o = {}) {
    stroke(g, o.color || INK, 3); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 12);
    [[18, 12], [12, 19], [6, 26]].forEach(([w, yy]) => { g.moveTo(x - w, y + yy); g.lineTo(x + w, y + yy); }); g.stroke();
  }
  function meter(g, x, y, letter, value, o = {}) {
    D.circle(g, x, y, o.r || 20, { fill: '#fff', stroke: o.color || C.violet, width: 2.6 });
    D.text(g, letter, x, y + 1, { size: 17, weight: 900, align: 'center', color: o.color || C.violet });
    if (value) D.tag(g, value, x, y + (o.r || 20) + 16, { bg: o.color || C.violet, size: 13, align: 'center' });
  }
  /** Polarity marks ⊕ ⊖ beside a part. */
  function polarity(g, plus, minus, o = {}) {
    D.text(g, '+', plus[0], plus[1], { size: o.size || 18, weight: 900, align: 'center', color: o.plusColor || C.red, halo: true });
    D.text(g, '−', minus[0], minus[1], { size: o.size || 18, weight: 900, align: 'center', color: o.minusColor || C.blue, halo: true });
  }

  // ── three-terminal devices ──
  function bjt(g, x, y, o = {}) { // base on the left, collector up, emitter down
    const pnp = o.type === 'pnp'; const r = o.r || 34; const col = o.color || INK;
    D.circle(g, x, y, r, { fill: o.fill || '#fff', stroke: col, width: 2.6 });
    D.line(g, x - 12, y - 20, x - 12, y + 20, { color: col, width: 4.5 });
    D.line(g, x - 12, y - 8, x + 16, y - 26, { color: col, width: 3 });
    const e1 = [x - 12, y + 8], e2 = [x + 16, y + 26];
    if (!pnp) D.arrow(g, e1[0], e1[1], e2[0], e2[1], { color: col, width: 3, head: 11 });
    else { D.line(g, e1[0], e1[1], e2[0], e2[1], { color: col, width: 3 }); D.arrow(g, e2[0] - 6, e2[1] - 4, e1[0] + 3, e1[1] + 2, { color: col, width: 0.1, head: 12 }); }
    D.line(g, x - r - 26, y, x - 12, y, { color: WIRE, width: 3 });
    D.line(g, x + 16, y - 26, x + 16, y - r - 24, { color: WIRE, width: 3 });
    D.line(g, x + 16, y + 26, x + 16, y + r + 24, { color: WIRE, width: 3 });
    const t = { b: [x - r - 26, y], c: [x + 16, y - r - 24], e: [x + 16, y + r + 24] };
    if (o.labels !== false) { D.text(g, 'B', t.b[0] + 6, y - 14, { size: 14, weight: 900, color: C.violet }); D.text(g, 'C', t.c[0] + 10, t.c[1] + 10, { size: 14, weight: 900, color: C.red }); D.text(g, 'E', t.e[0] + 10, t.e[1] - 10, { size: 14, weight: 900, color: C.blue }); }
    return t;
  }
  function fet(g, x, y, o = {}) { // n-channel JFET: gate left, drain up, source down
    const col = o.color || INK; const pch = o.type === 'p';
    D.circle(g, x, y, 34, { fill: '#fff', stroke: col, width: 2.6 });
    D.line(g, x + 4, y - 22, x + 4, y + 22, { color: col, width: 4.5 });
    D.line(g, x + 4, y - 14, x + 18, y - 14, { color: col, width: 3 }); D.line(g, x + 18, y - 14, x + 18, y - 58, { color: WIRE, width: 3 });
    D.line(g, x + 4, y + 14, x + 18, y + 14, { color: col, width: 3 }); D.line(g, x + 18, y + 14, x + 18, y + 58, { color: WIRE, width: 3 });
    if (!pch) D.arrow(g, x - 60, y + 14, x + 2, y + 14, { color: col, width: 3, head: 11 }); else { D.line(g, x - 60, y + 14, x + 4, y + 14, { color: col, width: 3 }); D.arrow(g, x + 2, y + 14, x - 22, y + 14, { color: col, width: 0.1, head: 12 }); }
    const t = { g: [x - 60, y + 14], d: [x + 18, y - 58], s: [x + 18, y + 58] };
    if (o.labels !== false) { D.text(g, 'G', t.g[0] + 4, t.g[1] - 14, { size: 14, weight: 900, color: C.violet }); D.text(g, 'D', t.d[0] + 10, t.d[1] + 12, { size: 14, weight: 900, color: C.red }); D.text(g, 'S', t.s[0] + 10, t.s[1] - 12, { size: 14, weight: 900, color: C.blue }); }
    return t;
  }

  // ── animated current ──
  function pathLen(path) { let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); return L; }
  function pointAt(path, d) {
    for (let i = 1; i < path.length; i++) {
      const seg = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      if (d <= seg || i === path.length - 1) { const k = seg ? Math.min(1, d / seg) : 0; return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * k, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * k]; }
      d -= seg;
    }
    return path[path.length - 1];
  }
  /**
   * Charge dots moving along a path. amps sets speed (log-scaled, direction by sign); ref = a "typical" current.
   * o.electrons → dots move against conventional current (shown in blue).
   */
  function flow(g, path, t, amps, o = {}) {
    if (!path || path.length < 2 || !amps || !Number.isFinite(amps)) return;
    const L = pathLen(path); if (L < 4) return;
    const ref = o.ref || 1; const mag = Math.min(3, Math.abs(amps) / ref);
    const speed = (o.speed || 70) * Math.max(0.12, Math.sqrt(mag)) * (amps > 0 ? 1 : -1) * (o.electrons ? -1 : 1);
    const gap = o.gap || 34; const off = ((t * speed) % gap + gap) % gap;
    const color = o.color || (o.electrons ? '#2563eb' : '#f59e0b');
    for (let d = off; d < L; d += gap) { const [x, y] = pointAt(path, d); D.circle(g, x, y, o.r || 4.5, { fill: color, stroke: '#fff', width: 1.2, alpha: o.alpha }); }
  }
  /** Arrow showing the conventional current direction at the middle of a segment. */
  function currentArrow(g, a, b, text, o = {}) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    D.arrow(g, mx - ux * 16, my - uy * 16, mx + ux * 16, my + uy * 16, { color: o.color || C.orange, width: 3.4, head: 13 });
    if (text) D.tag(g, text, mx + (o.dx ?? (Math.abs(uy) > 0.5 ? 16 : 0)), my + (o.dy ?? (Math.abs(uy) > 0.5 ? 0 : -22)), { bg: o.color || C.orange, size: 13, align: Math.abs(uy) > 0.5 ? 'left' : 'center' });
  }
  /** Small legend / info box in a corner. */
  function infoBox(g, x, y, lines, o = {}) {
    const w = o.w || 260; const lh = o.lh || 22; const h = lines.length * lh + 16;
    D.rect(g, x, y, w, h, { fill: o.fill || 'rgba(255,255,255,0.94)', stroke: o.stroke || C.line, width: 1.5, r: 10 });
    lines.forEach((ln, i) => { const obj = typeof ln === 'string' ? { t: ln } : ln; D.text(g, obj.t, x + 12, y + 8 + lh * i + lh / 2, { size: obj.size || 14, weight: obj.b ? 800 : 600, color: obj.c || INK }); });
    return h;
  }
  /** Sine-like waveform strip for rectifier / AC plots: fn(t) sampled over [t0,t1]. */
  function scope(g, x, y, w, h, fns, o = {}) {
    const ymax = o.ymax || 1; const ymin = o.ymin == null ? -ymax : o.ymin; const t0 = o.t0 || 0, t1 = o.t1 || 1;
    return D.chart(g, x, y, w, h, { xmin: t0, xmax: t1, ymin, ymax, xticks: o.xticks || 4, yticks: o.yticks ?? 2, title: o.title, xlabel: o.xlabel, ylabel: o.ylabel, xfmt: o.xfmt || ((v) => `${n(v * 1000, 3)} ms`), yfmt: o.yfmt, ylabelOffset: o.ylabelOffset,
      series: fns.map((f) => ({ points: Array.from({ length: 241 }, (_, i) => { const tt = t0 + ((t1 - t0) * i) / 240; return [tt, f.fn(tt)]; }), color: f.color, width: f.width || 2.6, dash: f.dash, fill: f.fill, fillAlpha: f.fillAlpha })),
      marks: o.marks });
  }

  // ── challenge formulas (mirrored server-side in the dashboard backend: ee-challenge.evaluator.ts) ──
  const on = (v, d = true) => (v == null ? d : v === true || v === 'true' || v === 1 || v === '1');
  const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const res = (cfg, k, count) => Array.from({ length: count }, (_, i) => num(cfg[`${k}${i + 1}`]));
  const solve2 = (a, b, c, d, e, f) => { const det = a * d - b * c; return Math.abs(det) < 1e-12 ? [NaN, NaN] : [(e * d - b * f) / det, (a * f - e * c) / det]; };
  const KINDS = {
    'ohm-current': (c) => num(c.V) / num(c.R),
    'ohm-voltage': (c) => num(c.I) * num(c.R),
    'series-req': (c) => res(c, 'R', Math.round(num(c.count, 3))).reduce((s, r) => s + r, 0),
    'series-current': (c) => num(c.V) / res(c, 'R', Math.round(num(c.count, 3))).reduce((s, r) => s + r, 0),
    'parallel-req': (c) => 1 / res(c, 'R', Math.round(num(c.count, 3))).reduce((s, r) => s + 1 / r, 0),
    'parallel-current': (c) => res(c, 'R', Math.round(num(c.count, 3))).reduce((s, r) => s + num(c.V) / r, 0),
    'kcl-imbalance': (c) => { const nin = Math.round(num(c.nin, 2)), nout = Math.round(num(c.nout, 2)); let s = 0; for (let i = 1; i <= nin; i++) s += num(c[`in${i}`]); for (let i = 1; i <= nout; i++) s -= num(c[`out${i}`]); return s; },
    'kvl-vr2': (c) => { const E = num(c.E1) + (on(c.useE2, false) ? num(c.E2) * (c.e2dir === 'aid' ? 1 : -1) : 0); return (E * num(c.R2)) / (num(c.R1) + num(c.R2) + num(c.R3)); },
    'star-ra': (c) => (num(c.Rab) * num(c.Rca)) / (num(c.Rab) + num(c.Rbc) + num(c.Rca)),
    'delta-rab': (c) => num(c.Ra) + num(c.Rb) + (num(c.Ra) * num(c.Rb)) / num(c.Rc),
    'nodal-v1': (c) => nodal(c)[0],
    'mesh-i1': (c) => mesh(c)[0],
    'dc-torque': (c) => num(c.K) * num(c.phi) * num(c.Ia),
    'dc-backemf-speed': (c) => { const Eb = num(c.V) - num(c.Ia) * num(c.Ra); return (Eb * 60) / (2 * Math.PI * num(c.K) * num(c.phi)); },
    'transformer-v2': (c) => (num(c.V1) * num(c.N2)) / num(c.N1),
    'transformer-i1': (c) => (num(c.V1) * num(c.N2) / num(c.N1)) ** 2 / num(c.RL) / num(c.V1),
    'im-rotor-speed': (c) => ((120 * num(c.f)) / num(c.P)) * (1 - num(c.s) / 100),
    'diode-current-ma': (c) => { const Vk = c.material === 'ge' ? 0.3 : 0.7; const fwd = c.bias !== 'reverse'; return fwd && num(c.Vs) > Vk ? ((num(c.Vs) - Vk) / num(c.R)) * 1000 : 0; },
    'zener-iz-ma': (c) => { const Vin = num(c.Vin), Vz = num(c.Vz); if (Vin * num(c.RL) / (num(c.Rs) + num(c.RL)) < Vz) return 0; return ((Vin - Vz) / num(c.Rs) - Vz / num(c.RL)) * 1000; },
    'bjt-ic-ma': (c) => { const IB = Math.max(0, (num(c.VBB) - 0.7) / (num(c.RB) * 1000)); const ICsat = num(c.VCC) / (num(c.RC) * 1000); return Math.min(num(c.beta) * IB, ICsat) * 1000; },
    'fet-id-ma': (c) => { if (c.VDS != null && num(c.VDS) < num(c.VGS) - num(c.VP)) return NaN; const r = 1 - num(c.VGS) / num(c.VP); return num(c.VGS) <= num(c.VP) ? 0 : num(c.IDSS) * r * r; },
    'hw-vdc': (c) => (num(c.Vm) - num(c.Vd, 0.7)) / Math.PI,
    'fw-vdc': (c) => (2 * (num(c.Vm) - num(c.Vd, 0.7) * (c.mode === 'bridge' ? 2 : 1))) / Math.PI,
    'filter-ripple': (c) => { const fr = num(c.f, 50) * (c.rect === 'half' ? 1 : 2); const k = num(c.RL) * fr * num(c.C) * 1e-6; const Vdc = num(c.Vm) / (1 + 1 / (2 * k)); return Vdc / k; },
    'regulator-vout': (c) => Math.min(num(c.Vset), Math.max(0, num(c.Vin) - 2)),
    'select-match': (c, meta) => (meta && String(c[meta.key]) === String(meta.expected) ? 1 : 0),
    'dc-rotation-dir': (c) => (c.field === 'reverse' ? -1 : 1) * (c.current === 'reverse' ? -1 : 1),
    'dc-shunt-il': (c) => (c.mode && c.mode !== 'shunt' ? NaN : num(c.Ia) + num(c.V) / num(c.Rsh)),
    'dc-shunt-speed': (c) => (c.mode && c.mode !== 'shunt' ? NaN : 1) * ((num(c.V) - num(c.Ia) * num(c.Ra)) / num(c.kphi)) * 60 / (2 * Math.PI),
    'starter-ist': (c) => num(c.V) / (num(c.Ra) + num(c.Rst)),
    'dc-speed-ratio': (c) => { const Rx = c.mode === 'field' ? 0 : num(c.Rx); const fl = c.mode === 'armature' ? 100 : num(c.field, 100); return ((num(c.V) - num(c.Ia) * (num(c.Ra) + Rx)) / (fl / 100)) / (num(c.V) - num(c.Ia) * num(c.Ra)); },
    'im-smax': (c) => num(c.R2) / num(c.X2),
    'diode-shockley-ma': (c) => { const Is = c.material === 'ge' ? 1e-7 : 1e-13; return Is * (Math.exp(num(c.V) / 0.02585) - 1) * 1000; },
    'bjt-vce': (c) => { if (c.mode === 'cb') return NaN; const IC = Math.min(num(c.beta) * num(c.IB) * 1e-6, num(c.VCC) / (num(c.RC) * 1000)); return num(c.VCC) - IC * num(c.RC) * 1000; },
    'regulator-headroom': (c) => num(c.Vin) - num(c.Vset),
    'shunt-current-ma': (c) => { if (c.mode && c.mode !== 'shunt') return NaN; const Vo = num(c.Vz) + 0.7; return ((num(c.Vin) - Vo) / num(c.Rs) - Vo / num(c.RL)) * 1000; },
    'stepud-v2': (c) => num(c.V1) * (c.mode === 'down' ? 1 / num(c.k, 1) : num(c.k, 1)),
    'im-torque-ratio': (c) => { const s = num(c.s) / 100, R2 = num(c.R2), X2 = num(c.X2); return (2 * s * R2 * X2) / (R2 * R2 + (s * X2) ** 2); },
    'config-current-gain': (c) => { const b = num(c.beta); const m = c.mode || c.config; return m === 'cb' ? b / (b + 1) : m === 'cc' ? b + 1 : b; },
  };
  /** Two-node DC network used by nodal analysis (see ee-u1.js). */
  function nodal(c) {
    const useR5 = on(c.useR5), useE2 = useR5 && on(c.useE2);
    const R1 = num(c.R1), R2 = num(c.R2), R3 = num(c.R3), R4 = num(c.R4), R5 = num(c.R5, 1e9), E1 = num(c.E1), E2 = useE2 ? num(c.E2) : 0;
    const g5 = useR5 ? 1 / R5 : 0;
    // node 1: (V1-E1)/R1 + V1/R2 + (V1-V2)/R3 = 0 ; node 2: (V2-V1)/R3 + V2/R4 + (V2-E2)/R5' = 0 (E2 through R5)
    const a = 1 / R1 + 1 / R2 + 1 / R3, b = -1 / R3, cc = -1 / R3, d = 1 / R3 + 1 / R4 + g5;
    return solve2(a, b, cc, d, E1 / R1, E2 * g5);
  }
  /** Two-mesh DC network used by mesh analysis (see ee-u1.js). */
  function mesh(c) {
    const R1 = num(c.R1), R2 = num(c.R2), R3 = num(c.R3), E1 = num(c.E1), E2 = num(c.E2);
    // mesh 1: E1 = I1(R1+R3) − I2 R3 ; mesh 2: −E2 = −I1 R3 + I2(R2+R3)
    return solve2(R1 + R3, -R3, -R3, R2 + R3, E1, -E2);
  }

  window.EEKit = { si, n, frame, wire, resistor, cell, ac, diode, zener, capacitor, coil, lamp, sw, motor, node, ground, meter, polarity, bjt, fet, flow, pathLen, pointAt, currentArrow, infoBox, scope, nodal, mesh, solve2, INK, WIRE };
  window.EEChallengeKinds = KINDS;
})();
