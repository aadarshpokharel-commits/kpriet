'use strict';

/*
 * Computer Networks simulation — SVG scene renderer.
 * A scene is a list of parts; each part draws inside its own box of the
 * 1000 × 560 view box. Parts: seq, layers, topo, fields, bits, table, chart,
 * window, bar, callout. Elements with `info` become clickable (Inspector).
 */
(function (root) {
  const W = 1000;
  const H = 560;
  const C = {
    ink: '#17271f', muted: '#62746a', line: '#cfdcd2', soft: '#f3f8f4', green: '#197449', greenSoft: '#e3f3e8',
    amber: '#c77a12', amberSoft: '#fff1d6', red: '#c0392b', redSoft: '#fde6e3', blue: '#2563eb', blueSoft: '#e4edff',
    violet: '#7c3aed', violetSoft: '#efe7ff', teal: '#0f8a8a', tealSoft: '#dcf5f3', white: '#ffffff', grey: '#94a39a',
  };
  const TONES = {
    green: [C.green, C.greenSoft], amber: [C.amber, C.amberSoft], red: [C.red, C.redSoft], blue: [C.blue, C.blueSoft],
    violet: [C.violet, C.violetSoft], teal: [C.teal, C.tealSoft], grey: [C.grey, '#f1f4f2'],
  };
  const tone = (name) => TONES[name] || TONES.green;

  function esc(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fit(text, maxChars) {
    const s = String(text == null ? '' : text);
    return s.length > maxChars ? s.slice(0, Math.max(1, maxChars - 1)) + '…' : s;
  }

  function Renderer(opts) {
    const infos = [];
    const speed = opts.speed || 1;
    const advanced = !!opts.advanced;
    const dur = Math.max(0.35, 0.95 / speed).toFixed(2);
    const out = [];

    function info(item) {
      if (!item) return '';
      infos.push(item);
      return ` data-info="${infos.length - 1}" style="cursor:pointer"`;
    }
    function text(x, y, t, o = {}) {
      const size = o.size || 13;
      const anchor = o.anchor || 'middle';
      const weight = o.weight || 600;
      const fill = o.fill || C.ink;
      const fam = o.mono ? 'ui-monospace,SFMono-Regular,Menlo,monospace' : 'Inter,Segoe UI,system-ui,sans-serif';
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="middle" font-family="${fam}"${o.extra || ''}>${esc(t)}</text>`;
    }
    function rect(x, y, w, h, o = {}) {
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="${o.r == null ? 8 : o.r}" fill="${o.fill || C.white}" stroke="${o.stroke || C.line}" stroke-width="${o.sw || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.opacity != null ? ` opacity="${o.opacity}"` : ''}${o.extra || ''}/>`;
    }
    function line(x1, y1, x2, y2, o = {}) {
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${o.stroke || C.line}" stroke-width="${o.sw || 2}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.marker ? ` marker-end="url(#${o.marker})"` : ''}${o.opacity != null ? ` opacity="${o.opacity}"` : ''}/>`;
    }
    // A moving token (packet) from (x1,y1) to (x2,y2)
    function mover(x1, y1, x2, y2, label, color = C.green) {
      const w = Math.max(38, Math.min(170, String(label || '').length * 8.4 + 20));
      return `<g><animateMotion dur="${dur}s" fill="freeze" path="M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}"/>` +
        `<rect x="${(-w / 2).toFixed(1)}" y="-14" width="${w.toFixed(1)}" height="28" rx="14" fill="${color}" stroke="#fff" stroke-width="2"/>` +
        (label ? text(0, 0.5, fit(label, 20), { size: 13, fill: '#fff', weight: 800 }) : '') + '</g>';
    }
    function titleOf(p, b) {
      return p.title ? text(b[0] + 4, b[1] + 11, p.title, { size: 14.5, anchor: 'start', weight: 800, fill: C.green }) : '';
    }

    // ─── Sequence (ladder) diagram ───
    function seq(p) {
      const b = p.box || [20, 10, W - 40, H - 20];
      const top = b[1] + (p.title ? 26 : 6);
      const actors = p.actors || [];
      const n = Math.max(1, actors.length);
      const colW = b[2] / n;
      const xs = actors.map((_, i) => b[0] + colW * (i + 0.5));
      let s = titleOf(p, b);
      const headH = 48;
      actors.forEach((a, i) => {
        const w = Math.min(colW - 16, 190);
        const act = (p.activeActors || []).includes(i);
        s += `<g${info(a.info ? { title: a.name, body: a.info } : null)}>` + rect(xs[i] - w / 2, top, w, headH, { fill: act ? C.greenSoft : C.white, stroke: act ? C.green : C.line, sw: act ? 2.5 : 1.5 }) +
          text(xs[i], top + (a.sub ? 17 : headH / 2), fit(a.name, 20), { size: 16.5, weight: 800 }) +
          (a.sub ? text(xs[i], top + 35, fit(a.sub, 24), { size: 12, fill: C.muted, weight: 600, mono: true }) : '') + '</g>';
        const st = p.states && p.states[i];
        if (st) s += rect(xs[i] - 78, top + headH + 5, 156, 24, { r: 12, fill: C.violetSoft, stroke: C.violet, sw: 1.2 }) + text(xs[i], top + headH + 17.5, fit(st, 20), { size: 13, fill: C.violet, weight: 800, mono: true });
      });
      const laneTop = top + headH + (p.states ? 36 : 8);
      const laneBottom = b[1] + b[3] - 4;
      xs.forEach((x) => { s += line(x, laneTop, x, laneBottom, { stroke: '#b9c8bd', sw: 2, dash: '5 5' }); });
      const msgs = p.msgs || [];
      const rows = Math.max(msgs.length, p.minRows || 5);
      const gap = Math.max(18, Math.min(62, (laneBottom - laneTop - 16) / rows));
      const drop = Math.min(gap * 0.5, 28);
      let y = laneTop + 10;
      msgs.forEach((m, i) => {
        const isCur = i === p.cur;
        const faded = p.cur != null && p.cur >= 0 && i < p.cur ? 0.62 : 1;
        if (m.note != null) {
          const x = xs[m.at] ?? xs[0];
          const [fg, bg] = tone(m.tone || 'amber');
          const w = Math.min(colW * 0.95, Math.max(90, String(m.note).length * 8 + 20));
          s += `<g opacity="${isCur ? 1 : faded}"${info(m.info ? { title: m.note, body: m.info } : null)}>` + rect(x - w / 2, y - 11, w, 24, { r: 7, fill: bg, stroke: fg, sw: isCur ? 2 : 1 }) + text(x, y + 1, fit(m.note, 34), { size: 13, fill: fg, weight: 800 }) + '</g>';
          y += gap; return;
        }
        const x1 = xs[m.from]; const x2 = xs[m.to];
        const [fg] = tone(m.tone || (m.lost ? 'red' : isCur ? 'green' : 'grey'));
        const color = isCur ? (m.lost ? C.red : fg) : (m.lost ? C.red : '#5d7a67');
        const y2 = y + drop;
        const endX = m.lost ? x1 + (x2 - x1) * 0.58 : x2;
        const endY = m.lost ? y + drop * 0.58 : y2;
        s += `<g opacity="${faded}"${info(m.info ? { title: m.label, body: m.info } : null)}>`;
        s += line(x1, y, endX, endY, { stroke: color, sw: isCur ? 3 : 2, marker: m.lost ? null : (isCur ? 'cnArrowCur' : 'cnArrow'), dash: m.dashed ? '7 5' : null });
        if (m.lost) s += text(endX, endY, '✕', { size: 20, fill: C.red, weight: 900 });
        const mx = (x1 + x2) / 2; const my = (y + y2) / 2;
        const maxLabel = Math.max(8, Math.floor((Math.abs(x2 - x1) - 24) / 8.6));
        const lw = Math.min(Math.abs(x2 - x1) - 16, Math.min(String(m.label).length, maxLabel) * 8.6 + 18);
        s += rect(mx - lw / 2, my - 24, lw, 22, { r: 6, fill: isCur ? C.greenSoft : '#fffffff0', stroke: isCur ? C.green : '#dfe8e2', sw: 1 });
        s += text(mx, my - 13, fit(m.label, maxLabel), { size: 14, weight: 800, fill: m.lost ? C.red : C.ink });
        if (m.detail && advanced) s += text(mx, my + 12, fit(m.detail, Math.floor(Math.abs(x2 - x1) / 7.4)), { size: 12, fill: C.muted, weight: 700, mono: true });
        s += '</g>';
        if (isCur && !m.noAnim) s += mover(x1, y, endX, endY, m.token || m.label, m.lost ? C.red : C.green);
        y += gap;
      });
      return s;
    }

    // ─── Layer stacks (OSI / TCP-IP) ───
    function layers(p) {
      const b = p.box || [20, 10, W - 40, H - 20];
      let s = titleOf(p, b);
      const stacks = p.stacks || [];
      const top = b[1] + (p.title ? 26 : 4);
      const n = stacks.length;
      const reservePdu = p.pdu ? 330 : 0;
      const availW = b[2] - reservePdu;
      const colW = Math.min(250, (availW - (n - 1) * (p.mapping ? 120 : 60)) / n);
      const gapX = n > 1 ? (availW - colW * n) / (n - 1) : 0;
      const bottomReserve = p.wire ? 46 : 8;
      const pos = [];
      stacks.forEach((st, si) => {
        const x = b[0] + (n === 1 ? (availW - colW) / 2 : si * (colW + gapX));
        s += text(x + colW / 2, top + 10, st.title, { size: 16, weight: 800, fill: C.green });
        const areaTop = top + 26;
        const areaH = b[1] + b[3] - bottomReserve - areaTop;
        const units = st.layers.reduce((a, l) => a + (l.span || 1), 0);
        const unitH = areaH / units;
        let y = areaTop;
        pos[si] = [];
        st.layers.forEach((l, li) => {
          const h = unitH * (l.span || 1) - 5;
          const act = st.active === li;
          const done = (st.done || []).includes(li);
          const [fg, bg] = tone(l.tone || 'green');
          s += `<g${info(l.info ? { title: l.name, body: l.info } : null)}>` + rect(x, y, colW, h, { fill: act ? fg : done ? bg : C.white, stroke: act || done ? fg : C.line, sw: act ? 3 : 1.5 });
          s += text(x + colW / 2, y + h / 2 - (l.sub ? 9 : 0), fit(l.name, 22), { size: h < 34 ? 13 : 16, weight: 800, fill: act ? '#fff' : C.ink });
          if (l.sub) s += text(x + colW / 2, y + h / 2 + 12, fit(advanced && l.subAdv ? l.subAdv : l.sub, 30), { size: 12, weight: 600, fill: act ? '#e8fff0' : C.muted });
          if (l.num != null) s += text(x + 12, y + 12, l.num, { size: 10, weight: 800, fill: act ? '#fff' : C.grey });
          s += '</g>';
          pos[si][li] = [x, y, colW, h];
          y += unitH * (l.span || 1);
        });
      });
      (p.mapping || []).forEach(([li, lj]) => {
        const a = pos[0] && pos[0][li]; const c = pos[1] && pos[1][lj];
        if (!a || !c) return;
        s += line(a[0] + a[2] + 4, a[1] + a[3] / 2, c[0] - 4, c[1] + c[3] / 2, { stroke: p.mapHl && p.mapHl.includes(li) ? C.green : '#b8c9bd', sw: p.mapHl && p.mapHl.includes(li) ? 3 : 1.5, dash: '4 4' });
      });
      if (p.wire && n >= 2) {
        const yw = b[1] + b[3] - 20;
        const x1 = b[0] + colW / 2; const x2 = b[0] + (n - 1) * (colW + gapX) + colW / 2;
        s += line(x1, yw, x2, yw, { stroke: p.wire.active ? C.amber : '#9fb3a5', sw: 5 });
        s += text((x1 + x2) / 2, yw - 13, p.wire.label || 'Physical medium', { size: 11, fill: C.muted, weight: 700 });
        if (p.wire.active) s += mover(x1, yw, x2, yw, p.wire.token || '0101…', C.amber);
      }
      if (p.pdu) {
        const px = b[0] + b[2] - reservePdu + 18; const pw = reservePdu - 18;
        const py = top + 40;
        s += text(px, py - 16, p.pdu.caption || 'Protocol data unit', { size: 14, weight: 800, anchor: 'start', fill: C.green });
        const parts = p.pdu.parts || [];
        const total = parts.reduce((a, q) => a + (q.w || 1), 0) || 1;
        let x = px;
        parts.forEach((q) => {
          const w = pw * (q.w || 1) / total;
          const [fg, bg] = tone(q.tone || 'green');
          s += `<g${info(q.info ? { title: q.t, body: q.info } : null)}>` + rect(x, py, w - 3, 54, { r: 7, fill: q.hl ? fg : bg, stroke: fg, sw: q.hl ? 2.5 : 1.2 }) + text(x + (w - 3) / 2, py + 27, fit(q.t, Math.max(3, Math.floor(w / 8.5))), { size: 13, weight: 800, fill: q.hl ? '#fff' : fg }) + '</g>';
          x += w;
        });
        (p.pdu.notes || []).forEach((t, i) => { s += text(px, py + 82 + i * 22, fit(t, 40), { size: 13, anchor: 'start', fill: C.muted, weight: 600 }); });
      }
      return s;
    }

    // ─── Topology / network graph ───
    const ICON = { pc: '💻', laptop: '💻', server: '🗄️', switch: '🔀', hub: '⭘', router: '⇄', cloud: '☁️', ap: '📶', modem: '📟', firewall: '🧱', dns: '📖', mail: '✉️', phone: '📱', building: '🏢', city: '🏙️', net: '🌐' };
    function topo(p) {
      const b = p.box || [20, 10, W - 40, H - 20];
      let s = titleOf(p, b);
      const top = b[1] + (p.title ? 22 : 0);
      const ih = b[3] - (p.title ? 22 : 0);
      const P = {};
      (p.nodes || []).forEach((nd) => { P[nd.id] = [b[0] + 44 + nd.x * (b[2] - 88), top + 40 + nd.y * (ih - 100)]; });
      (p.links || []).forEach((l) => {
        const a = P[l.a]; const c = P[l.b]; if (!a || !c) return;
        const color = l.broken ? C.red : l.hl ? C.green : l.tone ? tone(l.tone)[0] : '#9fb3a5';
        s += `<g${info(l.info ? { title: l.label || 'Link', body: l.info } : null)}>` + line(a[0], a[1], c[0], c[1], { stroke: color, sw: l.hl ? 4.5 : l.w || 2.5, dash: l.broken ? '6 6' : l.dashed ? '4 5' : null, opacity: l.dim ? 0.35 : 1 });
        if (l.broken) s += text((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, '✕', { size: 20, fill: C.red, weight: 900 });
        if (l.label) {
          const mx = (a[0] + c[0]) / 2; const my = (a[1] + c[1]) / 2;
          const lw = String(l.label).length * 8.2 + 14;
          s += rect(mx - lw / 2, my - 12, lw, 24, { r: 7, fill: l.hl ? C.greenSoft : '#ffffffee', stroke: l.hl ? C.green : C.line, sw: 1 }) + text(mx, my, l.label, { size: 13, weight: 800, fill: l.hl ? C.green : C.muted, mono: true });
        }
        s += '</g>';
      });
      (p.nodes || []).forEach((nd) => {
        const [x, y] = P[nd.id];
        const r = nd.r || 29;
        const [fg, bg] = tone(nd.tone || (nd.hl ? 'green' : 'grey'));
        const fill = nd.hl ? bg : nd.bad ? C.redSoft : C.white;
        const stroke = nd.bad ? C.red : nd.hl ? fg : '#9fb3a5';
        s += `<g opacity="${nd.dim ? 0.38 : 1}"${info(nd.info ? { title: nd.label, body: nd.info } : null)}>`;
        s += nd.kind === 'router' ? `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${nd.hl ? 3 : 2}"/>` : rect(x - r, y - r * 0.82, r * 2, r * 1.64, { r: 10, fill, stroke, sw: nd.hl ? 3 : 2 });
        s += nd.kind === 'router' && !nd.icon ? text(x, y + 1, '⇄', { size: Math.round(r * 1.05), weight: 900, fill: nd.bad ? C.red : C.green }) : text(x, y + 1, nd.icon || ICON[nd.kind] || '•', { size: Math.round(r * 0.9), weight: 400 });
        s += text(x, y + r + 14, fit(nd.label, 22), { size: 14.5, weight: 800 });
        if (nd.sub) s += text(x, y + r + 31, fit(nd.sub, 28), { size: 12, weight: 600, fill: C.muted, mono: true });
        if (nd.badge) { const bw = String(nd.badge).length * 7.8 + 14; s += rect(x - bw / 2, y - r - 25, bw, 21, { r: 10, fill: nd.badgeTone === 'red' ? C.red : C.violet, stroke: 'none' }) + text(x, y - r - 14.5, nd.badge, { size: 12, weight: 800, fill: '#fff' }); }
        s += '</g>';
      });
      (p.packets || []).forEach((pk) => {
        const a = P[pk.from]; const c = P[pk.to]; if (!a || !c) return;
        if (pk.lost) { const mx = a[0] + (c[0] - a[0]) * 0.55; const my = a[1] + (c[1] - a[1]) * 0.55; s += mover(a[0], a[1], mx, my, pk.label, C.red) + text(mx, my - 22, '✕', { size: 18, fill: C.red, weight: 900 }); }
        else s += mover(a[0], a[1], c[0], c[1], pk.label, pk.color || (pk.tone ? tone(pk.tone)[0] : C.green));
      });
      return s;
    }

    // ─── Header / frame fields ───
    function fields(p) {
      const b = p.box || [20, 10, W - 40, H - 20];
      let s = titleOf(p, b);
      const top = b[1] + (p.title ? 26 : 4);
      const width = p.width || 32;
      const rows = p.rows || [];
      const scaleH = p.ruler ? 18 : 0;
      if (p.ruler) {
        for (let i = 0; i <= width; i += (p.rulerStep || 8)) s += text(b[0] + (b[2] * i) / width, top + 6, i, { size: 9.5, fill: C.grey, weight: 700, mono: true });
      }
      const rowH = Math.min(62, (b[3] - (p.title ? 26 : 4) - scaleH - 6) / Math.max(1, rows.length));
      rows.forEach((row, ri) => {
        let x = b[0];
        const y = top + scaleH + ri * rowH;
        row.forEach((f) => {
          const w = (b[2] * f.bits) / width;
          const [fg, bg] = tone(f.tone || 'green');
          const hl = f.hl;
          s += `<g opacity="${f.dim ? 0.4 : 1}"${info({ title: f.name, body: f.info || `${f.name}${f.value != null ? ` = ${f.value}` : ''}` })}>`;
          s += rect(x + 1, y + 1, w - 2, rowH - 4, { r: 5, fill: hl ? fg : f.done ? bg : C.white, stroke: hl || f.done ? fg : C.line, sw: hl ? 2.8 : 1.2 });
          const maxc = Math.max(2, Math.floor(w / (w < 60 ? 7 : 8.4)));
          const showVal = f.value != null && (advanced || f.alwaysValue);
          s += text(x + w / 2, y + rowH / 2 - (showVal ? 10 : 1), fit(f.name, maxc), { size: w < 60 ? 11 : 14, weight: 800, fill: hl ? '#fff' : C.ink });
          if (showVal) s += text(x + w / 2, y + rowH / 2 + 11, fit(f.value, maxc), { size: w < 60 ? 10.5 : 12.5, weight: 700, fill: hl ? '#effff4' : C.muted, mono: true });
          s += '</g>';
          x += w;
        });
      });
      if (p.caption) s += text(b[0], top + scaleH + rows.length * rowH + 14, p.caption, { size: 11.5, anchor: 'start', fill: C.muted, weight: 600 });
      return s;
    }

    // ─── Bit / character rows ───
    const CELL = {
      hl: [C.green, '#fff', C.green], new: [C.amberSoft, C.amber, C.amber], flag: [C.violetSoft, C.violet, C.violet], err: [C.redSoft, C.red, C.red],
      ok: [C.greenSoft, C.green, C.green], dim: ['#f4f6f5', '#aab6ae', '#dde4df'], esc: [C.blueSoft, C.blue, C.blue], plain: [C.white, C.ink, C.line],
    };
    function bits(p) {
      const b = p.box || [20, 10, W - 40, H - 20];
      let s = titleOf(p, b);
      const top = b[1] + (p.title ? 26 : 4);
      const rows = p.rows || [];
      const labelW = p.labelW != null ? p.labelW : 150;
      const maxCells = Math.max(1, ...rows.map((r) => (r.indent || 0) + r.cells.length));
      const cell = Math.min(p.cell || 36, (b[2] - labelW - 6) / maxCells);
      const rowH = Math.min(cell + 10, (b[3] - (p.title ? 26 : 4)) / Math.max(1, rows.length));
      const cs = Math.min(cell, rowH - 6);
      rows.forEach((r, ri) => {
        const y = top + ri * rowH;
        if (r.label) s += text(b[0], y + cs / 2, fit(r.label, Math.floor(labelW / 7.6)), { size: 13, anchor: 'start', weight: 700, fill: r.labelTone ? tone(r.labelTone)[0] : C.muted });
        r.cells.forEach((c, ci) => {
          const x = b[0] + labelW + ((r.indent || 0) + ci) * cell;
          const [bg, fg, st] = CELL[c.cls || 'plain'] || CELL.plain;
          s += rect(x + 1, y, cs - 2, cs, { r: 4, fill: bg, stroke: st, sw: c.cls === 'hl' ? 2 : 1.2 }) + text(x + cs / 2, y + cs / 2 + 0.5, c.t, { size: Math.max(9, Math.min(16, cs * 0.5)), weight: 800, fill: fg, mono: true });
        });
        if (r.note) s += text(b[0] + labelW + ((r.indent || 0) + r.cells.length) * cell + 10, y + cs / 2, r.note, { size: 13, anchor: 'start', weight: 700, fill: r.noteTone ? tone(r.noteTone)[0] : C.muted });
      });
      return s;
    }

    // ─── Table ───
    function table(p) {
      const b = p.box || [20, 10, W - 40, H - 20];
      let s = titleOf(p, b);
      const top = b[1] + (p.title ? 24 : 2);
      const cols = p.cols || [];
      const rows = p.rows || [];
      const weights = cols.map((c, ci) => Math.max(String(c).length, ...rows.map((r) => String(r[ci] == null ? '' : r[ci]).length), 3));
      const tw = weights.reduce((a, v) => a + v, 0);
      const rowH = Math.min(p.rowH || 34, (b[3] - (p.title ? 24 : 2)) / Math.max(2, rows.length + 1));
      const fs = rowH < 22 ? 10.5 : rowH < 28 ? 12 : 13.5;
      const cw = fs * 0.62;
      let x = b[0];
      const xs = weights.map((w) => { const cx = x; x += (b[2] * w) / tw; return cx; });
      s += rect(b[0], top, b[2], rowH, { r: 6, fill: C.green, stroke: C.green });
      cols.forEach((c, ci) => { s += text(xs[ci] + 8, top + rowH / 2, fit(c, Math.floor(((b[2] * weights[ci]) / tw - 10) / cw)), { size: fs, anchor: 'start', weight: 800, fill: '#fff' }); });
      rows.forEach((r, ri) => {
        const y = top + (ri + 1) * rowH;
        const hl = Array.isArray(p.hl) ? p.hl.includes(ri) : p.hl === ri;
        const cls = (p.rowTone && p.rowTone[ri]) || (hl ? 'green' : null);
        const [fg, bg] = cls ? tone(cls) : [C.line, ri % 2 ? '#fafcfa' : C.white];
        s += `<g${info(p.rowInfo && p.rowInfo[ri] ? { title: String(r[0]), body: p.rowInfo[ri] } : null)}>` + rect(b[0], y, b[2], rowH, { r: 4, fill: bg, stroke: cls ? fg : '#e5ece7', sw: hl ? 2 : 1 });
        r.forEach((v, ci) => { s += text(xs[ci] + 8, y + rowH / 2, fit(v, Math.floor(((b[2] * weights[ci]) / tw - 10) / cw)), { size: fs, anchor: 'start', weight: ci === 0 ? 800 : 600, fill: cls && hl ? C.ink : C.ink, mono: p.mono !== false }); });
        s += '</g>';
      });
      if (!rows.length) s += text(b[0] + b[2] / 2, top + rowH * 1.6, p.empty || '(empty)', { size: 12, fill: C.grey, weight: 700 });
      return s;
    }

    // ─── Line chart ───
    function chart(p) {
      const b = p.box || [20, 10, W - 40, H - 20];
      let s = titleOf(p, b);
      const L = b[0] + 46; const T = b[1] + (p.title ? 30 : 10); const R = b[0] + b[2] - 12; const B = b[1] + b[3] - 34;
      const xMax = p.xMax || 10; const yMax = p.yMax || 10;
      const X = (v) => L + ((R - L) * v) / xMax; const Y = (v) => B - ((B - T) * v) / yMax;
      s += line(L, B, R, B, { stroke: '#8fa597', sw: 1.8 }) + line(L, T, L, B, { stroke: '#8fa597', sw: 1.8 });
      const ys = p.yStep || Math.max(1, Math.ceil(yMax / 8));
      for (let v = 0; v <= yMax; v += ys) s += line(L, Y(v), R, Y(v), { stroke: '#edf2ee', sw: 1 }) + text(L - 8, Y(v), v, { size: 12, anchor: 'end', fill: C.muted, mono: true });
      const xs = p.xStep || Math.max(1, Math.ceil(xMax / 16));
      for (let v = 0; v <= xMax; v += xs) s += text(X(v), B + 13, v, { size: 12, fill: C.muted, mono: true });
      if (p.xLabel) s += text((L + R) / 2, B + 28, p.xLabel, { size: 13, fill: C.muted, weight: 700 });
      if (p.yLabel) s += text(L + 4, T + 8, p.yLabel, { size: 13, fill: C.muted, weight: 700, anchor: 'start' });
      (p.hlines || []).forEach((h) => { s += line(L, Y(h.y), R, Y(h.y), { stroke: h.color || C.amber, sw: 1.6, dash: '6 5' }) + text(R - 4, Y(h.y) - 10, h.label, { size: 13, anchor: 'end', fill: h.color || C.amber, weight: 800 }); });
      (p.marks || []).forEach((m) => { s += line(X(m.x), T, X(m.x), B, { stroke: m.color || C.red, sw: 1.5, dash: '3 4' }) + text(X(m.x), T + 8, m.label, { size: 12.5, fill: m.color || C.red, weight: 800 }); });
      (p.series || []).forEach((se) => {
        if (!se.pts.length) return;
        s += `<polyline fill="none" stroke="${se.color || C.green}" stroke-width="3" stroke-linejoin="round" points="${se.pts.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')}"/>`;
        se.pts.forEach(([x, y], i) => { s += `<circle cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="${i === se.pts.length - 1 ? 7 : 4}" fill="${i === se.pts.length - 1 ? C.amber : se.color || C.green}" stroke="#fff" stroke-width="1.5"/>`; });
      });
      if (p.cur) s += text(X(p.cur[0]) + 10, Y(p.cur[1]) - 16, p.curLabel || `${p.cur[1]}`, { size: 15, anchor: 'start', fill: C.amber, weight: 900 });
      return s;
    }

    // ─── Sequence-number window strip ───
    const WIN = {
      acked: [C.greenSoft, C.green, 'Acked'], sent: [C.amberSoft, C.amber, 'Sent'], usable: [C.blueSoft, C.blue, 'Usable'], notyet: ['#f4f6f5', '#aab6ae', 'Not allowed'],
      lost: [C.redSoft, C.red, 'Lost'], buffered: [C.violetSoft, C.violet, 'Buffered'], recv: [C.greenSoft, C.green, 'Received'], expected: [C.blueSoft, C.blue, 'Expected'],
      discard: [C.redSoft, C.red, 'Discarded'], read: ['#e9eeea', '#6f8176', 'Read'],
    };
    function windowStrip(p) {
      const b = p.box || [20, 10, W - 40, 120];
      let s = titleOf(p, b);
      const top = b[1] + (p.title ? 26 : 4);
      const cells = p.cells || [];
      const cw = Math.min(58, (b[2] - 10) / Math.max(1, cells.length));
      const ch = Math.min(46, b[3] - (p.title ? 26 : 4) - 36);
      const x0 = b[0] + (b[2] - cw * cells.length) / 2;
      cells.forEach((c, i) => {
        const [bg, fg] = WIN[c.st] || WIN.notyet;
        s += rect(x0 + i * cw + 1, top + 14, cw - 2, ch, { r: 5, fill: bg, stroke: fg, sw: c.hl ? 3 : 1.3 }) + text(x0 + i * cw + cw / 2, top + 14 + ch / 2, c.t, { size: Math.min(14, cw * 0.36), weight: 800, fill: fg, mono: true });
      });
      [p.win, p.win2].filter(Boolean).forEach((w, k) => {
        const x1 = x0 + w.from * cw; const x2 = x0 + Math.min(cells.length, w.from + w.size) * cw;
        const col = k ? C.violet : C.ink;
        s += `<rect x="${x1.toFixed(1)}" y="${(top + 8).toFixed(1)}" width="${Math.max(0, x2 - x1).toFixed(1)}" height="${(ch + 12).toFixed(1)}" rx="8" fill="none" stroke="${col}" stroke-width="3"/>`;
        s += text((x1 + x2) / 2, top + 1, w.label || 'Window', { size: 13, weight: 800, fill: col });
      });
      if (p.legend !== false) {
        const used = Array.from(new Set(cells.map((c) => c.st)));
        let lx = b[0] + 4;
        used.forEach((k) => { const [bg, fg, lbl] = WIN[k] || WIN.notyet; s += rect(lx, top + ch + 24, 12, 12, { r: 3, fill: bg, stroke: fg, sw: 1.2 }) + text(lx + 17, top + ch + 30, lbl, { size: 12, anchor: 'start', fill: C.muted, weight: 700 }); lx += 28 + lbl.length * 7.4; });
      }
      return s;
    }

    // ─── Horizontal stacked bar (buffers) ───
    function bar(p) {
      const b = p.box || [20, 10, W - 40, 90];
      let s = titleOf(p, b);
      const top = b[1] + (p.title ? 26 : 4);
      const total = p.total || 1;
      const h = Math.min(44, b[3] - (p.title ? 26 : 4) - 30);
      s += rect(b[0], top, b[2], h, { r: 8, fill: '#f6f8f7', stroke: '#b5c5ba', sw: 1.5 });
      let x = b[0];
      (p.segs || []).forEach((sg) => {
        const w = (b[2] * sg.v) / total; if (w <= 0) return;
        const [fg, bg] = tone(sg.tone || 'green');
        s += rect(x, top, w, h, { r: 6, fill: bg, stroke: fg, sw: 1.5 });
        if (w > 44) s += text(x + w / 2, top + h / 2, fit(`${sg.label} ${sg.v}`, Math.floor(w / 8)), { size: 13, weight: 800, fill: fg });
        x += w;
      });
      if (p.caption) s += text(b[0], top + h + 17, p.caption, { size: 13, anchor: 'start', weight: 700, fill: C.muted });
      return s;
    }

    // ─── Callout box ───
    function callout(p) {
      const b = p.box || [20, 10, 400, 120];
      const [fg, bg] = tone(p.tone || 'green');
      let s = rect(b[0], b[1], b[2], b[3], { r: 10, fill: bg, stroke: fg, sw: 1.6 });
      let y = b[1] + 18;
      if (p.title) { s += text(b[0] + 14, y, p.title, { size: 14.5, weight: 800, anchor: 'start', fill: fg }); y += 24; }
      const maxc = Math.floor((b[2] - 28) / (p.mono ? 8 : 7.4));
      (p.lines || []).forEach((l) => { if (y < b[1] + b[3] - 8) { s += text(b[0] + 14, y, fit(l, maxc), { size: 13, weight: 600, anchor: 'start', fill: C.ink, mono: !!p.mono }); y += p.lineH ? p.lineH + 2 : 22; } });
      return s;
    }

    const PARTS = { seq, layers, topo, fields, bits, table, chart, window: windowStrip, bar, callout };
    (opts.scene || []).forEach((part) => { const fn = PARTS[part.type]; if (fn) out.push(fn(part)); });

    const defs = `<defs><marker id="cnArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#5d7a67"/></marker>` +
      `<marker id="cnArrowCur" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.green}"/></marker></defs>`;
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(opts.label || 'Network simulation')}">${defs}<rect width="${W}" height="${H}" fill="#fbfdfb"/>${out.join('')}</svg>`,
      infos,
    };
  }

  root.CNRender = { render: (opts) => Renderer(opts), W, H };
})(typeof window !== 'undefined' ? window : globalThis);
