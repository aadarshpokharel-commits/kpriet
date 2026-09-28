'use strict';

/*
 * Drawing helpers for the Engineering Physics simulations (canvas 2D).
 * Logical canvas: 1000 × 560. Every simulation draws with these helpers so
 * the look stays consistent on the Smart Board.
 */
(function () {
  const W = 1000;
  const H = 560;
  const FONT = '"Plus Jakarta Sans","Inter","Segoe UI",system-ui,sans-serif';
  const C = {
    ink: '#0f172a', muted: '#475569', faint: '#94a3b8', line: '#cbd5e1', bg: '#f8fafc', panel: '#ffffff',
    green: '#15803d', greenSoft: '#dcfce7', red: '#dc2626', redSoft: '#fee2e2', blue: '#2563eb', blueSoft: '#dbeafe',
    amber: '#d97706', amberSoft: '#fef3c7', violet: '#7c3aed', cyan: '#0891b2', pink: '#db2777', orange: '#ea580c',
    laser: '#ef4444', photon: '#f59e0b', core: '#bae6fd', clad: '#e0f2fe', glass: '#dbeafe', water: '#bfdbfe', metal: '#cbd5e1',
    hi: '#facc15',
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;

  /** Formats a number with sensible significant figures (no fake precision). */
  function fmt(v, digits = 3) {
    if (v == null || Number.isNaN(v)) return '—';
    if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) {
      const e = Math.floor(Math.log10(a));
      const m = v / Math.pow(10, e);
      return `${Number(m.toFixed(Math.max(0, digits - 1)))} × 10${sup(e)}`;
    }
    const p = a >= 100 ? Math.max(0, digits - 3) : a >= 10 ? Math.max(0, digits - 2) : Math.max(0, digits - 1);
    return String(Number(v.toFixed(Math.min(6, p + (a < 1 ? 1 : 0)))));
  }
  function sup(n) {
    const m = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
    return String(n).split('').map((c) => m[c] || c).join('');
  }

  function clear(g, color) { g.setTransform(...(g.__base || [1, 0, 0, 1, 0, 0])); g.fillStyle = color || C.bg; g.fillRect(0, 0, W, H); }

  function text(g, str, x, y, o = {}) {
    g.save();
    g.font = `${o.weight || 600} ${o.size || 16}px ${o.font || FONT}`;
    g.fillStyle = o.color || C.ink;
    g.textAlign = o.align || 'left';
    g.textBaseline = o.baseline || 'middle';
    if (o.rotate) { g.translate(x, y); g.rotate(o.rotate); x = 0; y = 0; }
    if (o.halo) { g.lineWidth = 4; g.strokeStyle = o.halo === true ? 'rgba(255,255,255,0.9)' : o.halo; g.lineJoin = 'round'; g.strokeText(String(str), x, y); }
    g.fillText(String(str), x, y);
    g.restore();
  }
  function textWidth(g, str, size = 16, weight = 600) { g.save(); g.font = `${weight} ${size}px ${FONT}`; const w = g.measureText(String(str)).width; g.restore(); return w; }

  function line(g, x1, y1, x2, y2, o = {}) {
    g.save(); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
    g.strokeStyle = o.color || C.ink; g.lineWidth = o.width || 2; g.lineCap = 'round';
    if (o.dash) g.setLineDash(o.dash); if (o.alpha != null) g.globalAlpha = o.alpha;
    g.stroke(); g.restore();
  }
  function poly(g, pts, o = {}) {
    if (!pts.length) return;
    g.save(); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    if (o.close) g.closePath();
    if (o.alpha != null) g.globalAlpha = o.alpha;
    if (o.fill) { g.fillStyle = o.fill; g.fill(); }
    if (o.stroke !== false && (o.stroke || !o.fill)) { g.strokeStyle = o.stroke || C.ink; g.lineWidth = o.width || 2; g.lineJoin = 'round'; if (o.dash) g.setLineDash(o.dash); g.stroke(); }
    g.restore();
  }
  function arrow(g, x1, y1, x2, y2, o = {}) {
    const color = o.color || C.ink; const w = o.width || 2.5; const head = o.head || 11;
    const a = Math.atan2(y2 - y1, x2 - x1);
    g.save(); if (o.alpha != null) g.globalAlpha = o.alpha;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6);
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round'; if (o.dash) g.setLineDash(o.dash); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.moveTo(x2, y2);
    g.lineTo(x2 - head * Math.cos(a - 0.42), y2 - head * Math.sin(a - 0.42));
    g.lineTo(x2 - head * Math.cos(a + 0.42), y2 - head * Math.sin(a + 0.42));
    g.closePath(); g.fillStyle = color; g.fill();
    g.restore();
  }
  function rect(g, x, y, w, h, o = {}) {
    g.save(); if (o.alpha != null) g.globalAlpha = o.alpha;
    g.beginPath();
    const r = Math.min(o.r || 0, Math.abs(w) / 2, Math.abs(h) / 2);
    if (r) { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); } else g.rect(x, y, w, h);
    if (o.fill) { g.fillStyle = o.fill; g.fill(); }
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.width || 2; if (o.dash) g.setLineDash(o.dash); g.stroke(); }
    g.restore();
  }
  function circle(g, x, y, r, o = {}) {
    g.save(); if (o.alpha != null) g.globalAlpha = o.alpha;
    g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
    if (o.fill) { g.fillStyle = o.fill; g.fill(); }
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.width || 2; if (o.dash) g.setLineDash(o.dash); g.stroke(); }
    g.restore();
  }
  /** Shaded sphere (atom). */
  function atom(g, x, y, r, color, o = {}) {
    g.save(); if (o.alpha != null) g.globalAlpha = o.alpha;
    const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.35, color); grad.addColorStop(1, shade(color, -0.35));
    g.beginPath(); g.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); g.fillStyle = grad; g.fill();
    g.lineWidth = 1; g.strokeStyle = shade(color, -0.5); g.stroke();
    if (o.label) text(g, o.label, x, y, { size: Math.max(10, r * 0.8), color: '#fff', align: 'center', weight: 800 });
    g.restore();
  }
  function shade(hex, f) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
    const n = parseInt(m[1], 16); let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    const t = f < 0 ? 0 : 255; const p = Math.abs(f);
    r = Math.round((t - r) * p + r); gg = Math.round((t - gg) * p + gg); b = Math.round((t - b) * p + b);
    return `rgb(${r},${gg},${b})`;
  }
  /** Rounded label chip. */
  function tag(g, str, x, y, o = {}) {
    const size = o.size || 14; const pad = o.pad || 8; const w = textWidth(g, str, size, 700) + pad * 2; const h = size + pad * 1.2;
    const ax = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    rect(g, ax, y - h / 2, w, h, { fill: o.bg || C.ink, r: h / 2, stroke: o.border, width: 1.5 });
    text(g, str, ax + w / 2, y + 0.5, { size, color: o.color || '#fff', align: 'center', weight: 700 });
    return w;
  }
  /** Highlight ring used to point at the part of the picture the current step is about. */
  function focus(g, x, y, w, h, t) {
    const pulse = 0.5 + 0.5 * Math.sin((t || 0) * 5);
    rect(g, x - 6, y - 6, w + 12, h + 12, { stroke: C.hi, width: 3 + pulse * 2, r: 12, dash: [10, 6] });
  }
  /** Sinusoidal wave between two points (for light / sound). */
  function wave(g, x1, y1, x2, y2, o = {}) {
    const len = Math.hypot(x2 - x1, y2 - y1); if (len < 1) return;
    const a = Math.atan2(y2 - y1, x2 - x1); const amp = o.amp == null ? 8 : o.amp; const wl = o.wavelength || 30; const ph = o.phase || 0;
    g.save(); g.translate(x1, y1); g.rotate(a); g.beginPath();
    for (let s = 0; s <= len; s += 2) { const y = amp * Math.sin((2 * Math.PI * s) / wl - ph); if (s === 0) g.moveTo(s, y); else g.lineTo(s, y); }
    g.strokeStyle = o.color || C.photon; g.lineWidth = o.width || 2.5; if (o.alpha != null) g.globalAlpha = o.alpha; g.stroke();
    if (o.arrow) { g.beginPath(); g.moveTo(len + 4, 0); g.lineTo(len - 8, -6); g.lineTo(len - 8, 6); g.closePath(); g.fillStyle = o.color || C.photon; g.fill(); }
    g.restore();
  }
  /** Photon: a short wave packet with an arrow head. */
  function photon(g, x, y, angle, o = {}) {
    const len = o.len || 46; const dx = Math.cos(angle) * len; const dy = Math.sin(angle) * len;
    wave(g, x - dx / 2, y - dy / 2, x + dx / 2, y + dy / 2, { amp: o.amp || 6, wavelength: o.wavelength || 14, color: o.color || C.photon, width: o.width || 2.5, arrow: true, phase: o.phase || 0, alpha: o.alpha });
  }
  /** Maps 0..1 to a cold→hot colour (blue → cyan → yellow → red). */
  function heat(f) {
    f = clamp(f, 0, 1);
    const stops = [[0, [37, 99, 235]], [0.35, [6, 182, 212]], [0.6, [250, 204, 21]], [0.8, [249, 115, 22]], [1, [220, 38, 38]]];
    for (let i = 1; i < stops.length; i++) {
      if (f <= stops[i][0]) {
        const [a0, c0] = stops[i - 1]; const [a1, c1] = stops[i]; const t = (f - a0) / (a1 - a0);
        return `rgb(${Math.round(lerp(c0[0], c1[0], t))},${Math.round(lerp(c0[1], c1[1], t))},${Math.round(lerp(c0[2], c1[2], t))})`;
      }
    }
    return 'rgb(220,38,38)';
  }
  /** Visible colour of a wavelength in nm (approximate); IR/UV shown as dark red / violet. */
  function wavelengthColor(nm) {
    if (nm >= 700) return '#b91c1c'; if (nm < 380) return '#6d28d9';
    let r = 0, gg = 0, b = 0;
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { gg = (nm - 440) / 50; b = 1; } else if (nm < 510) { gg = 1; b = -(nm - 510) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; gg = 1; } else if (nm < 645) { r = 1; gg = -(nm - 645) / 65; } else { r = 1; }
    return `rgb(${Math.round(r * 255)},${Math.round(gg * 255)},${Math.round(b * 255)})`;
  }
  /** Simple x–y chart. series: [{points:[[x,y]...], color, width, dash, fill}], marks: [{x, label, color}] */
  function chart(g, x, y, w, h, o = {}) {
    const xmin = o.xmin ?? 0, xmax = o.xmax ?? 1, ymin = o.ymin ?? 0, ymax = o.ymax ?? 1;
    const X = (v) => x + ((v - xmin) / (xmax - xmin || 1)) * w; const Y = (v) => y + h - ((v - ymin) / (ymax - ymin || 1)) * h;
    rect(g, x, y, w, h, { fill: o.bg || '#ffffff', stroke: C.line, width: 1.5, r: 6 });
    const ticks = o.xticks || 5;
    for (let i = 0; i <= ticks; i++) { const v = xmin + ((xmax - xmin) * i) / ticks; line(g, X(v), y + h, X(v), y + h + 5, { color: C.faint, width: 1.5 }); text(g, o.xfmt ? o.xfmt(v) : fmt(v, 3), X(v), y + h + 16, { size: 14, color: C.muted, align: 'center', weight: 600 }); }
    const yt = o.yticks ?? 4;
    for (let i = 0; i <= yt; i++) { const v = ymin + ((ymax - ymin) * i) / yt; line(g, x, Y(v), x + w, Y(v), { color: '#eef2f7', width: 1 }); if (o.yfmt !== false) text(g, o.yfmt ? o.yfmt(v) : fmt(v, 3), x - 6, Y(v), { size: 14, color: C.muted, align: 'right', weight: 600 }); }
    if (o.xlabel) text(g, o.xlabel, x + w / 2, y + h + 36, { size: 15, color: C.muted, align: 'center', weight: 700 });
    if (o.ylabel) text(g, o.ylabel, x - (o.ylabelOffset || 40), y + h / 2, { size: 15, color: C.muted, align: 'center', weight: 700, rotate: -Math.PI / 2 });
    if (o.title) text(g, o.title, x + 6, y - 12, { size: 14, weight: 800 });
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    (o.series || []).forEach((s) => {
      if (!s.points || !s.points.length) return;
      const pts = s.points.map(([a, b]) => [X(a), Y(b)]);
      if (s.fill) poly(g, [[pts[0][0], Y(ymin)], ...pts, [pts[pts.length - 1][0], Y(ymin)]], { fill: s.fill, close: true, stroke: false, alpha: s.fillAlpha ?? 0.25 });
      if (s.bars) pts.forEach(([px, py]) => line(g, px, Y(ymin), px, py, { color: s.color || C.blue, width: s.width || 3 }));
      else poly(g, pts, { stroke: s.color || C.blue, width: s.width || 2.5, dash: s.dash });
      (s.dots ? pts : []).forEach(([px, py]) => circle(g, px, py, 4, { fill: s.color || C.blue }));
    });
    g.restore();
    (o.marks || []).forEach((m) => {
      if (m.x != null) { line(g, X(m.x), y, X(m.x), y + h, { color: m.color || C.red, width: 2, dash: [6, 5] }); if (m.label) tag(g, m.label, X(m.x), y + 14, { bg: m.color || C.red, size: 12, align: 'center' }); }
      if (m.y != null) { line(g, x, Y(m.y), x + w, Y(m.y), { color: m.color || C.red, width: 2, dash: [6, 5] }); if (m.label) tag(g, m.label, x + w - 4, Y(m.y) - 12, { bg: m.color || C.red, size: 12, align: 'right' }); }
      if (m.point) { circle(g, X(m.point[0]), Y(m.point[1]), 7, { fill: m.color || C.red, stroke: '#fff', width: 2 }); if (m.label) tag(g, m.label, X(m.point[0]) + 10, Y(m.point[1]) - 16, { bg: m.color || C.red, size: 12 }); }
    });
    return { X, Y };
  }
  /** Energy level diagram helper: draws a horizontal level with a label. */
  function level(g, x1, x2, y, label, o = {}) {
    line(g, x1, y, x2, y, { color: o.color || C.ink, width: o.width || 3 });
    if (label) text(g, label, x1 - 10, y, { size: o.size || 15, align: 'right', color: o.color || C.ink, weight: 700 });
  }

  // ─── 3D (orthographic-perspective) ───
  /** view = {yaw, pitch, zoom}; returns projector. Unit of the model is arbitrary; scale is pixels per unit. */
  function projector(view, cx, cy, scale) {
    const yaw = view.yaw, pitch = view.pitch, zoom = view.zoom || 1;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const s = scale * zoom; const dist = 9;
    return function (p) {
      // model axes: x → right, y → depth, z → up
      let x = p[0], y = p[1], z = p[2];
      const x1 = x * cyw - y * syw; const y1 = x * syw + y * cyw;
      const y2 = y1 * cp - z * sp; const z2 = y1 * sp + z * cp;
      const persp = dist / (dist + y2);
      return { x: cx + x1 * s * persp, y: cy - z2 * s * persp, depth: y2, k: persp * zoom };
    };
  }
  function axes3(g, P, len, o = {}) {
    const O = P([0, 0, 0]); const labels = o.labels || ['X', 'Y', 'Z']; const colors = [C.red, C.green, C.blue];
    [[len, 0, 0], [0, len, 0], [0, 0, len]].forEach((v, i) => {
      const E = P(v); arrow(g, O.x, O.y, E.x, E.y, { color: colors[i], width: 2.5, head: 10 });
      text(g, labels[i], E.x + (E.x - O.x) * 0.08, E.y + (E.y - O.y) * 0.08, { size: 17, weight: 800, color: colors[i], align: 'center', halo: true });
    });
  }
  function cube3(g, P, a, o = {}) {
    const [x0, y0, z0] = o.origin || [0, 0, 0];
    const v = [[0, 0, 0], [a, 0, 0], [a, a, 0], [0, a, 0], [0, 0, a], [a, 0, a], [a, a, a], [0, a, a]].map(([x, y, z]) => P([x + x0, y + y0, z + z0]));
    const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    e.forEach(([i, j]) => line(g, v[i].x, v[i].y, v[j].x, v[j].y, { color: o.color || C.ink, width: o.width || 2, dash: o.dash, alpha: o.alpha }));
  }
  /** Parallelepiped from three edge vectors. */
  function cell3(g, P, A, B, Cc, o = {}) {
    const add = (...vs) => vs.reduce((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]);
    const O = [0, 0, 0];
    const pts = [O, A, add(A, B), B, Cc, add(A, Cc), add(A, B, Cc), add(B, Cc)].map(P);
    const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    e.forEach(([i, j]) => line(g, pts[i].x, pts[i].y, pts[j].x, pts[j].y, { color: o.color || C.ink, width: o.width || 2, dash: o.dash, alpha: o.alpha }));
    return pts;
  }
  /** Draws atoms sorted back-to-front. atoms: [{p:[x,y,z], r, color, label, alpha}] */
  function atoms3(g, P, atoms, baseR) {
    atoms.map((a) => ({ a, q: P(a.p) })).sort((u, v) => v.q.depth - u.q.depth)
      .forEach(({ a, q }) => atom(g, q.x, q.y, (a.r || 1) * baseR * q.k, a.color || C.blue, { alpha: a.alpha, label: a.label }));
  }

  window.EPDraw = { W, H, C, FONT, clamp, lerp, ease, rad, deg, fmt, sup, clear, text, textWidth, line, poly, arrow, rect, circle, atom, shade, tag, focus, wave, photon, heat, wavelengthColor, chart, level, projector, axes3, cube3, cell3, atoms3 };
})();
