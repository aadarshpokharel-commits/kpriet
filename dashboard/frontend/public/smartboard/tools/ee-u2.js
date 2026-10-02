'use strict';

/* U25EEG02 — Unit II: DC Motor (7 simulations). Conceptual machine models, no detailed machine design. */
(function () {
  const S = (window.EESims = window.EESims || {});
  const D = window.EPDraw; const K = window.EEKit; const KINDS = window.EEChallengeKinds; const C = D.C;
  const { si, n } = K;
  const F = (name, formula, given, calc, result, unit) => ({ name, formula, given, calc, result, unit: unit || '—' });
  const pick = (rand, arr) => arr[Math.floor(rand() * arr.length) % arr.length];
  const focusIf = (g, on, x, y, w, h, t) => { if (on) D.focus(g, x, y, w, h, t); };
  const bg = (g) => { D.clear(g, '#f8fafc'); };
  const RPM = 60 / (2 * Math.PI);

  /** Shared "identify the part" challenge: pick a part at random; the student must select it. */
  const identifyChallenge = (parts) => ({
    make(rand, p) { let pt = pick(rand, parts); if (pt.key === p.part) pt = parts[(parts.indexOf(pt) + 1) % parts.length]; return { kind: 'select-match', prompt: `Identify the part that ${pt.task}. Tap it on the drawing (or choose it in "Selected part").`, target: 1, unit: '(1 = correct part)', tolerance: 0, meta: { key: 'part', expected: pt.key }, hint: 'Read the function of each part in the Explain tab.' }; },
    evaluate(p, c, ch) { const v = KINDS['select-match'](p, ch && ch.meta); const sel = parts.find((x) => x.key === p.part); return { value: v, text: `Selected: ${sel ? sel.name : p.part}`, calculation: v ? 'The selected part performs this function.' : 'That part has a different job — try again.' }; },
  });
  window.EEIdentifyChallenge = identifyChallenge;

  // ───────────────────────── 9. DC motor construction ─────────────────────────
  const DC_PARTS = [
    { key: 'yoke', name: 'Yoke (frame)', fn: 'Outer iron frame: supports the poles, protects the machine and carries the magnetic flux between the poles.', task: 'provides mechanical support and the return path for the magnetic flux' },
    { key: 'poles', name: 'Poles & pole shoes', fn: 'Iron cores bolted to the yoke; the pole shoes spread the flux evenly over the armature and hold the field winding.', task: 'spreads the magnetic flux over the armature surface' },
    { key: 'field', name: 'Field winding', fn: 'Copper coils on the poles. Current in them magnetises the poles and produces the main field flux Φ.', task: 'produces the main magnetic field when current flows in it' },
    { key: 'armature', name: 'Armature core & winding', fn: 'Laminated slotted iron drum on the shaft; the conductors in its slots carry the armature current and experience the force.', task: 'carries the current-carrying conductors that experience force' },
    { key: 'commutator', name: 'Commutator', fn: 'Copper segments insulated by mica; reverses the current in each armature coil as it passes a brush so the torque is always in one direction.', task: 'reverses the coil current every half turn so torque stays unidirectional' },
    { key: 'brushes', name: 'Brushes', fn: 'Carbon blocks pressed on the commutator; they connect the rotating armature to the stationary external DC supply.', task: 'connects the rotating armature to the stationary supply' },
    { key: 'shaft', name: 'Shaft & bearings', fn: 'Steel shaft carrying the armature and commutator; it transmits the mechanical torque to the load.', task: 'transmits the mechanical output to the load' },
  ];
  function wrapText(g, str, x, y, w, size, lh) { const words = str.split(' '); let line = ''; words.forEach((wd) => { if (D.textWidth(g, line + wd, size) > w) { D.text(g, line, x, y, { size, weight: 600 }); y += lh; line = ''; } line += wd + ' '; }); D.text(g, line, x, y, { size, weight: 600 }); return y; }
  window.EEWrapText = wrapText;
  function dcMachine(g, cx, cy, R, ang, sel, t, o = {}) {
    const hi = (k) => sel === k; const glow = 0.5 + 0.5 * Math.sin(t * 5);
    D.circle(g, cx, cy, R, { fill: hi('yoke') ? '#fde68a' : '#94a3b8' }); D.circle(g, cx, cy, R - 26, { fill: '#f8fafc' });
    if (hi('yoke')) D.circle(g, cx, cy, R, { stroke: '#f59e0b', width: 4 + glow * 3 });
    [[-1, 'N', C.red], [1, 'S', C.blue]].forEach(([s, lab, col]) => {
      const x0 = cx + s * (R - 26); const x1 = cx + s * (R * 0.52);
      D.rect(g, Math.min(x0, x1), cy - 34, Math.abs(x1 - x0), 68, { fill: hi('poles') ? '#fde68a' : '#cbd5e1', stroke: '#64748b', width: 1.5 });
      D.rect(g, x1 - (s > 0 ? 14 : 0), cy - 62, 14, 124, { fill: hi('poles') ? '#fbbf24' : '#94a3b8', r: 3 });
      for (let k = 0; k < 5; k++) { const xx = Math.min(x0, x1) + 10 + (k * (Math.abs(x1 - x0) - 20)) / 4; D.rect(g, xx - 7, cy - 48, 14, 14, { fill: hi('field') ? '#f97316' : '#b45309', r: 3 }); D.rect(g, xx - 7, cy + 34, 14, 14, { fill: hi('field') ? '#f97316' : '#b45309', r: 3 }); }
      D.text(g, lab, cx + s * (R * 0.75), cy, { size: 26, weight: 900, align: 'center', color: col });
    });
    const ra = R * 0.46;
    D.circle(g, cx, cy, ra, { fill: hi('armature') ? '#bfdbfe' : '#e2e8f0', stroke: '#475569', width: 2 });
    for (let k = 0; k < 12; k++) { const a = ang + (k * Math.PI) / 6; D.circle(g, cx + Math.cos(a) * (ra - 12), cy + Math.sin(a) * (ra - 12), 7, { fill: hi('armature') ? '#2563eb' : '#b45309', stroke: '#fff', width: 1.5 }); }
    const rc = ra * 0.42;
    for (let k = 0; k < 8; k++) { const a0 = ang + (k * Math.PI) / 4; g.save(); g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, rc, a0 + 0.05, a0 + Math.PI / 4 - 0.05); g.closePath(); g.fillStyle = hi('commutator') ? '#f59e0b' : '#d97706'; g.fill(); g.restore(); }
    [-1, 1].forEach((s) => { D.rect(g, cx - 12, cy + s * (rc + 2) - (s < 0 ? 26 : 0), 24, 26, { fill: hi('brushes') ? '#111827' : '#374151', r: 3, stroke: hi('brushes') ? '#facc15' : undefined, width: 3 }); });
    D.circle(g, cx, cy, 11, { fill: hi('shaft') ? '#facc15' : '#1f2937', stroke: '#fff', width: 2 });
    if (o.flux) for (let k = -2; k <= 2; k++) D.arrow(g, cx - R * 0.5, cy + k * 16, cx + R * 0.5, cy + k * 16, { color: 'rgba(220,38,38,0.35)', width: 2, head: 9 });
  }
  const hitPart = (x, y, cx, cy, R) => {
    const d = Math.hypot(x - cx, y - cy); const ra = R * 0.46, rc = ra * 0.42;
    if (d < 14) return 'shaft';
    if (Math.abs(x - cx) < 14 && Math.abs(y - cy) > rc - 4 && Math.abs(y - cy) < rc + 30) return 'brushes';
    if (d < rc) return 'commutator';
    if (d < ra) return 'armature';
    if (d > R - 28 && d <= R + 4) return 'yoke';
    if (Math.abs(y - cy) < 62 && d > ra && d < R - 26) return Math.abs(y - cy) > 30 && Math.abs(y - cy) < 50 ? 'field' : 'poles';
    return null;
  };
  S['ee-dc-construction'] = {
    live: true, conceptual: true,
    params: [
      { key: 'part', label: 'Selected part', type: 'select', default: 'armature', options: DC_PARTS.map((q) => ({ value: q.key, label: q.name })) },
      { key: 'rotate', label: 'Rotate the armature', type: 'toggle', default: true },
      { key: 'flux', label: 'Show field flux', type: 'toggle', default: false },
    ],
    onClick(x, y) { const k = hitPart(x, y, 330, 285, 230); return k ? { params: { part: k }, toast: DC_PARTS.find((q) => q.key === k).name } : null; },
    compute(p) {
      const part = DC_PARTS.find((q) => q.key === p.part) || DC_PARTS[0];
      return {
        part, formulas: [],
        readouts: [{ label: 'Selected', value: part.name, tone: 'good' }, { label: 'Parts', value: String(DC_PARTS.length) }],
        state: { view: 'Cross-section of a two-pole DC motor', selectedPart: part.name, function: part.fn, rotating: p.rotate, showingFlux: p.flux },
        explain: { what: `${part.name}: ${part.fn}`, why: 'A DC motor needs a magnetic field (poles + field winding), current-carrying conductors (armature), a way to feed and reverse the current (brushes + commutator) and a way to deliver torque (shaft).', param: 'Tap any part of the drawing or choose it from the list.', effect: 'The selected part is highlighted and its function is shown.' },
      };
    },
    steps: () => DC_PARTS.map((q) => ({ title: q.name, text: q.fn })),
    draw(g, S) {
      const { p, c, step, t, playing } = S; bg(g);
      const sel = playing || S.st < S.dur ? DC_PARTS[step].key : p.part;
      dcMachine(g, 330, 285, 230, p.rotate ? t * 0.9 : 0, sel, t, { flux: p.flux });
      const part = DC_PARTS.find((q) => q.key === sel) || c.part;
      D.text(g, 'Tap a part to identify it', 330, 30, { size: 15, weight: 700, align: 'center', color: C.muted });
      D.rect(g, 620, 90, 360, 250, { fill: '#fff', stroke: C.line, r: 14 });
      D.text(g, part.name, 640, 125, { size: 22, weight: 900, color: C.green });
      wrapText(g, part.fn, 640, 165, 320, 16, 24);
      D.text(g, 'Parts', 640, 380, { size: 14, weight: 800, color: C.muted });
      DC_PARTS.forEach((q, i) => D.tag(g, q.name.split(' (')[0].split(' &')[0], 640 + (i % 2) * 170, 410 + Math.floor(i / 2) * 32, { bg: q.key === sel ? C.green : '#64748b', size: 12 }));
    },
    challenge: identifyChallenge(DC_PARTS),
  };

  // ───────────────────────── 10. DC motor working principle ─────────────────────────
  S['ee-dc-working'] = {
    live: true,
    params: [
      { key: 'field', label: 'Field direction', type: 'select', default: 'normal', options: [{ value: 'normal', label: 'N on the left → S on the right' }, { value: 'reverse', label: 'Reversed (S left, N right)' }] },
      { key: 'current', label: 'Armature current direction', type: 'select', default: 'normal', options: [{ value: 'normal', label: 'Normal' }, { value: 'reverse', label: 'Reversed' }] },
      { key: 'I', label: 'Armature current I', type: 'range', min: 0, max: 10, step: 0.5, default: 5, unit: 'A' },
      { key: 'B', label: 'Flux density B', type: 'range', min: 0.1, max: 1.2, step: 0.05, default: 0.8, unit: 'T' },
      { key: 'commutator', label: 'Commutator reverses the coil current', type: 'toggle', default: true },
    ],
    stepDuration: 3.5,
    examples: [{ label: 'Reverse the field', values: { field: 'reverse', current: 'normal' } }, { label: 'Reverse both', values: { field: 'reverse', current: 'reverse' } }, { label: 'No commutator', values: { commutator: false } }],
    compute(p) {
      const l = 0.2, r = 0.05; const F1 = p.B * p.I * l; const Tmax = 2 * F1 * r; const dir = KINDS['dc-rotation-dir'](p);
      return {
        F1, Tmax, dir,
        formulas: [F('Force on a conductor', 'F = B·I·l (Fleming’s left-hand rule)', `B = ${p.B} T, I = ${p.I} A, l = 0.2 m`, `${p.B} × ${p.I} × 0.2`, `${n(F1)} N`, 'N'), F('Torque on the coil', 'T = 2·F·r·sin θ', 'r = 0.05 m', `2 × ${n(F1)} × 0.05`, `${n(Tmax, 3)} N·m (max)`, 'N·m')],
        readouts: [{ label: 'Force', value: `${n(F1)} N` }, { label: 'T_max', value: `${n(Tmax, 3)} N·m` }, { label: 'Rotation', value: p.I === 0 ? 'none' : dir > 0 ? 'clockwise ↻' : 'anticlockwise ↺', tone: 'good' }],
        state: { field: p.field === 'normal' ? 'N left, S right' : 'S left, N right', armatureCurrent: `${p.I} A ${p.current}`, forcePerConductor: `${n(F1)} N`, maxTorque: `${n(Tmax, 3)} N·m`, rotation: dir > 0 ? 'clockwise' : 'anticlockwise', commutator: p.commutator ? 'on (torque stays one way)' : 'off (torque reverses every half turn — coil only oscillates)' },
        explain: { what: `Each conductor feels a ${n(F1)} N force; the two forces are opposite, forming a couple that turns the armature ${dir > 0 ? 'clockwise' : 'anticlockwise'}.`, why: 'A current-carrying conductor in a magnetic field experiences a force F = BIl (Fleming’s left-hand rule). The commutator reverses the coil current every half turn so the couple always acts in the same direction.', param: 'Field direction, current direction, current and flux density.', effect: 'Reversing either the field or the current reverses the rotation; reversing both leaves it unchanged. More current or flux gives more torque.' },
      };
    },
    steps: (p, c) => [
      { title: 'Current-carrying conductor', text: 'Current flows in the armature coil: into the page (⊗) on one side, out of it (⊙) on the other.' },
      { title: 'Magnetic field', text: `The poles set up a field of ${p.B} T from N to S across the armature.` },
      { title: 'Force', text: `Fleming’s left-hand rule: F = BIl = ${n(c.F1)} N on each conductor, in opposite directions.` },
      { title: 'Torque', text: `The two forces form a couple: T = 2Fr·sin θ, up to ${n(c.Tmax, 3)} N·m.` },
      { title: 'Rotation', text: p.commutator ? `The commutator reverses the coil current every half turn, so the armature keeps rotating ${c.dir > 0 ? 'clockwise' : 'anticlockwise'}.` : 'Without the commutator the torque reverses every half turn — the coil only rocks to and fro.' },
    ],
    draw(g, S) {
      const { p, c, step, t } = S; bg(g);
      const cx = 330, cy = 280, R = 150; const Nleft = p.field === 'normal';
      D.rect(g, 40, cy - 110, 110, 220, { fill: Nleft ? '#fecaca' : '#bfdbfe', stroke: Nleft ? C.red : C.blue, r: 14 }); D.text(g, Nleft ? 'N' : 'S', 95, cy, { size: 44, weight: 900, align: 'center', color: Nleft ? C.red : C.blue });
      D.rect(g, 510, cy - 110, 110, 220, { fill: Nleft ? '#bfdbfe' : '#fecaca', stroke: Nleft ? C.blue : C.red, r: 14 }); D.text(g, Nleft ? 'S' : 'N', 565, cy, { size: 44, weight: 900, align: 'center', color: Nleft ? C.blue : C.red });
      const fdir = Nleft ? 1 : -1;
      if (step >= 1) for (let k = -3; k <= 3; k++) { const y = cy + k * 30; const off = (((t * 60 * fdir) % 40) + 40) % 40; D.line(g, 160, y, 500, y, { color: 'rgba(220,38,38,0.2)', width: 2 }); for (let x = 160 + off; x < 500; x += 40) D.arrow(g, x - fdir * 8, y, x + fdir * 8, y, { color: 'rgba(220,38,38,0.5)', width: 2, head: 8 }); }
      // Conductor with conventional current into the page (⊗) in a field pointing +x gets F = I l × B pointing −y on screen?  l = −z, B = +x → l×B = (−z)×x = −y (math) = up on screen.
      const iSign = p.current === 'normal' ? 1 : -1; // normal: left-side conductor carries current into the page
      const spin = p.I === 0 ? 0 : 1.2 * Math.sqrt((p.I * p.B) / 4);
      const ang = p.commutator ? c.dir * spin * t : (p.I ? 0.4 * Math.sin(t * 2) : 0);
      const a1 = [cx - R * 0.7 * Math.cos(ang), cy - R * 0.7 * Math.sin(ang)], a2 = [cx + R * 0.7 * Math.cos(ang), cy + R * 0.7 * Math.sin(ang)];
      D.circle(g, cx, cy, R * 0.75, { stroke: '#cbd5e1', width: 2, dash: [6, 6] }); D.line(g, a1[0], a1[1], a2[0], a2[1], { color: '#94a3b8', width: 6 });
      const left = a1[0] <= a2[0] ? a1 : a2, right = left === a1 ? a2 : a1; // commutator: the conductor on the left always carries "into" current
      const leftInto = p.commutator ? iSign > 0 : (left === a1 ? iSign > 0 : iSign < 0);
      const drawCond = (q, into) => { D.circle(g, q[0], q[1], 20, { fill: '#fde68a', stroke: '#b45309', width: 3 }); if (into) { D.line(g, q[0] - 9, q[1] - 9, q[0] + 9, q[1] + 9, { color: '#7c2d12', width: 3 }); D.line(g, q[0] + 9, q[1] - 9, q[0] - 9, q[1] + 9, { color: '#7c2d12', width: 3 }); } else D.circle(g, q[0], q[1], 5, { fill: '#7c2d12' }); };
      if (p.I > 0) { drawCond(left, leftInto); drawCond(right, !leftInto); } else { D.circle(g, left[0], left[1], 20, { fill: '#e2e8f0' }); D.circle(g, right[0], right[1], 20, { fill: '#e2e8f0' }); }
      if (step >= 2 && p.I > 0) {
        const up = (leftInto ? 1 : -1) * fdir; const f = 20 + Math.min(70, c.F1 * 60);
        D.arrow(g, left[0], left[1] - 24 * up, left[0], left[1] - (24 + f) * up, { color: C.green, width: 4, head: 14 });
        D.arrow(g, right[0], right[1] + 24 * up, right[0], right[1] + (24 + f) * up, { color: C.green, width: 4, head: 14 });
        D.tag(g, 'F = BIl', left[0] - 90, left[1] - 30 * up, { bg: C.green, size: 12 });
      }
      if (step >= 3 && p.I > 0 && p.commutator) { const cw = c.dir > 0; g.save(); g.strokeStyle = C.violet; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R * 0.95, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5); g.stroke(); g.restore(); const e = cw ? -Math.PI / 2 + 0.5 : -Math.PI / 2 - 0.5; const s0 = cw ? e - 0.12 : e + 0.12; D.arrow(g, cx + R * 0.95 * Math.cos(s0), cy + R * 0.95 * Math.sin(s0), cx + R * 0.95 * Math.cos(e), cy + R * 0.95 * Math.sin(e), { color: C.violet, head: 16 }); D.tag(g, 'Torque', cx, cy - R * 0.95 - 22, { bg: C.violet, size: 12, align: 'center' }); }
      D.circle(g, cx, cy, 10, { fill: '#1f2937' });
      const chain = ['Current', 'Magnetic field', 'Force', 'Torque', 'Rotation'];
      chain.forEach((w, i) => { D.tag(g, w, 810, 90 + i * 70, { bg: i <= step ? [C.orange, C.red, C.green, C.violet, C.blue][i] : '#94a3b8', size: 16, align: 'center' }); if (i < 4) D.arrow(g, 810, 106 + i * 70, 810, 142 + i * 70, { color: i < step ? C.ink : '#cbd5e1', width: 3, head: 10 }); });
      D.tag(g, p.I === 0 ? 'No current → no force' : !p.commutator ? 'No commutator → coil rocks, no steady rotation' : c.dir > 0 ? 'Rotation: clockwise ↻' : 'Rotation: anticlockwise ↺', 330, 520, { bg: p.commutator && p.I ? C.green : C.red, size: 16, align: 'center' });
      D.text(g, '⊗ current into the page   ⊙ out of the page', 810, 470, { size: 13, weight: 700, align: 'center', color: C.muted });
      focusIf(g, step === 0, cx - 170, cy - 170, 340, 340, t);
    },
    challenge: {
      make(rand, p) { const cur = KINDS['dc-rotation-dir'](p); const want = -cur; return { kind: 'dc-rotation-dir', prompt: `The armature now turns ${cur > 0 ? 'clockwise' : 'anticlockwise'}. Make it rotate ${want > 0 ? 'clockwise' : 'anticlockwise'} by changing the field and/or the current direction.`, target: want, unit: '(+1 clockwise, −1 anticlockwise)', tolerance: 0, hint: 'Reversing one of them reverses the rotation; reversing both does not.' }; },
      evaluate(p) { const v = KINDS['dc-rotation-dir'](p); return { value: v, text: v > 0 ? 'clockwise' : 'anticlockwise', calculation: `field ${p.field}, current ${p.current} → ${v > 0 ? 'clockwise' : 'anticlockwise'}` }; },
    },
  };

  // ───────────────────────── 11. DC motor types ─────────────────────────
  S['ee-dc-types'] = {
    live: true,
    modes: [{ key: 'shunt', label: 'Shunt motor' }, { key: 'series', label: 'Series motor' }, { key: 'compound', label: 'Compound motor (long shunt)' }],
    params: [
      { key: 'V', label: 'Supply voltage V', type: 'range', min: 100, max: 440, step: 10, default: 220, unit: 'V' },
      { key: 'Ia', label: 'Armature current Ia', type: 'range', min: 1, max: 50, step: 1, default: 20, unit: 'A' },
      { key: 'Ra', label: 'Armature resistance Ra', type: 'range', min: 0.1, max: 2, step: 0.05, default: 0.5, unit: 'Ω' },
      { key: 'Rsh', label: 'Shunt field resistance Rsh', type: 'range', min: 50, max: 440, step: 10, default: 110, unit: 'Ω', showIf: (p) => p.mode !== 'series' },
      { key: 'Rse', label: 'Series field resistance Rse', type: 'range', min: 0.05, max: 1, step: 0.05, default: 0.2, unit: 'Ω', showIf: (p) => p.mode !== 'shunt' },
    ],
    compute(p) {
      const shunt = p.mode === 'shunt', series = p.mode === 'series';
      const Ish = series ? 0 : p.V / p.Rsh; const IL = series ? p.Ia : p.Ia + Ish; const Ise = shunt ? 0 : p.Ia;
      const Eb = p.V - p.Ia * (p.Ra + (shunt ? 0 : p.Rse));
      const conn = shunt ? 'Field winding (many turns of thin wire, high Rsh) in parallel with the armature' : series ? 'Field winding (few turns of thick wire, low Rse) in series with the armature' : 'Series field in series with the armature, shunt field across both (long shunt)';
      return {
        Ish, IL, Ise, Eb, conn,
        formulas: [F('Currents', shunt ? 'I_L = I_a + I_sh,  I_sh = V/R_sh' : series ? 'I_L = I_a = I_se' : 'I_L = I_a + I_sh,  I_se = I_a', `V = ${p.V} V, Ia = ${p.Ia} A`, !series ? `I_sh = ${p.V}/${p.Rsh} = ${n(Ish)} A` : 'one path for all current', `I_L = ${n(IL)} A`, 'A'), F('Back EMF', shunt ? 'E_b = V − I_a·R_a' : 'E_b = V − I_a(R_a + R_se)', `Ra = ${p.Ra} Ω${shunt ? '' : `, Rse = ${p.Rse} Ω`}`, `${p.V} − ${p.Ia} × ${shunt ? p.Ra : n(p.Ra + p.Rse)}`, `${n(Eb)} V`, 'V')],
        readouts: [{ label: 'I_L', value: si(IL, 'A') }, { label: 'I_a', value: si(p.Ia, 'A') }, { label: 'I_sh', value: si(Ish, 'A') }, { label: 'E_b', value: si(Eb, 'V'), tone: 'good' }],
        state: { motorType: p.mode, connection: conn, lineCurrent: si(IL, 'A'), armatureCurrent: si(p.Ia, 'A'), shuntFieldCurrent: si(Ish, 'A'), seriesFieldCurrent: si(Ise, 'A'), backEmf: si(Eb, 'V') },
        explain: { what: `${conn}. Line current ${si(IL, 'A')}, back EMF ${si(Eb, 'V')}.`, why: shunt ? 'A shunt field sees the full supply voltage, so its current (and flux) is nearly constant — the speed stays nearly constant with load.' : series ? 'The whole load current passes through the series field, so the flux rises with load — very high starting torque, but the speed rises dangerously at no load.' : 'A compound motor combines a shunt field (steady flux) with a series field (extra flux on load) — good starting torque with a definite no-load speed.', param: 'Motor type, supply voltage, armature current and winding resistances.', effect: 'Changing the connection changes which windings carry which current, and therefore how the flux and speed respond to load.' },
      };
    },
    steps: (p, c) => [
      { title: 'Supply', text: `A ${p.V} V DC supply feeds the motor; the line current is ${n(c.IL)} A.` },
      { title: 'Field connection', text: c.conn + '.' },
      { title: 'Current paths', text: p.mode === 'series' ? 'All the line current passes through the field and the armature.' : `The line current divides: ${n(c.Ish)} A through the shunt field, ${p.Ia} A through the armature.` },
      { title: 'Back EMF', text: `E_b = ${n(c.Eb)} V opposes the supply as the armature turns.` },
    ],
    draw(g, S) {
      const { p, c, step, t } = S; bg(g);
      const top = 110, bot = 430, xL = 110; const shunt = p.mode === 'shunt', series = p.mode === 'series';
      const xa = 560, xs = 330;
      K.wire(g, [[xL, 230], [xL, top], [xa, top]]); K.wire(g, [[xL, 310], [xL, bot], [xa, bot]]); K.cell(g, [xL, 310], [xL, 230], { label: 'V', value: `${p.V} V`, labelOffset: 44 });
      if (!shunt) { K.coil(g, [xa, top], [xa, 230], { label: 'Series field', value: `${p.Rse} Ω`, turns: 3, color: C.orange, labelSide: 'other' }); K.wire(g, [[xa, 230], [xa, 244]]); } else K.wire(g, [[xa, top], [xa, 244]]);
      K.motor(g, xa, 290, 46, { text: 'A', angle: t * 3 }); D.text(g, 'Armature', xa + 58, 290, { size: 14, weight: 800 }); K.wire(g, [[xa, 336], [xa, bot]]);
      if (!series) { K.wire(g, [[xs, top], [xs, 200]]); K.coil(g, [xs, 200], [xs, 340], { label: 'Shunt field', value: `${p.Rsh} Ω`, turns: 7, color: C.green, labelSide: 'other' }); K.wire(g, [[xs, 340], [xs, bot]]); K.node(g, xs, top, { r: 5 }); K.node(g, xs, bot, { r: 5 }); }
      K.flow(g, [[xL, 230], [xL, top], [xs, top]], t, c.IL, { ref: 10 });
      K.flow(g, [[xs, top], [xa, top], [xa, bot], [xs, bot]], t, p.Ia, { ref: 10, color: C.blue });
      if (!series) K.flow(g, [[xs, top], [xs, bot]], t, c.Ish, { ref: 1, color: C.green });
      K.flow(g, [[xs, bot], [xL, bot], [xL, 310]], t, c.IL, { ref: 10 });
      K.currentArrow(g, [xL + 30, top], [xL + 120, top], `I_L = ${n(c.IL)} A`);
      if (!series) D.tag(g, `I_sh = ${n(c.Ish)} A`, xs + 12, 385, { bg: C.green, size: 12 });
      D.tag(g, `I_a = ${p.Ia} A`, xa + 12, 385, { bg: C.blue, size: 12 });
      focusIf(g, step === 1, (series ? xa : xs) - 60, 140, 120, 220, t);
      K.infoBox(g, 720, 150, [{ t: shunt ? 'SHUNT MOTOR' : series ? 'SERIES MOTOR' : 'COMPOUND (long shunt)', b: true, c: C.green }, `E_b = ${n(c.Eb)} V`, shunt ? 'Speed ≈ constant' : series ? 'High starting torque' : 'Good torque, safe no-load speed', shunt ? 'Use: lathes, fans, pumps' : series ? 'Use: cranes, traction, hoists' : 'Use: presses, shears, rolling mills', series ? '⚠ Never start on no load' : ''], { w: 260 });
    },
    challenge: {
      make(rand) { const target = pick(rand, [22, 24, 25, 30, 35]); return { kind: 'dc-shunt-il', prompt: `In the SHUNT motor, set the armature current so that the line current drawn from the supply is ${target} A.`, target, unit: 'A', tolerance: 0.2, hint: 'I_L = I_a + V/R_sh', setup: { mode: 'shunt', V: 220, Rsh: 110, Ia: 10 } }; },
      evaluate(p) { const v = KINDS['dc-shunt-il'](p); return { value: v, text: p.mode === 'shunt' ? `I_L = ${n(v)} A` : 'Not a shunt motor — select the shunt motor', calculation: `I_L = ${p.Ia} + ${p.V}/${p.Rsh} = ${n(v, 4)} A` }; },
    },
  };

  // ───────────────────────── 12. DC motor torque ─────────────────────────
  S['ee-dc-torque'] = {
    live: true,
    params: [
      { key: 'K', label: 'Machine constant K (= PZ/2πA)', type: 'range', min: 50, max: 400, step: 10, default: 200 },
      { key: 'phi', label: 'Flux per pole Φ', type: 'range', min: 0.005, max: 0.05, step: 0.001, default: 0.02, unit: 'Wb' },
      { key: 'Ia', label: 'Armature current Ia', type: 'range', min: 0, max: 60, step: 1, default: 20, unit: 'A' },
    ],
    examples: [{ label: 'Weaker field', values: { phi: 0.01 } }, { label: 'Heavy load current', values: { Ia: 50 } }],
    compute(p) {
      const T = KINDS['dc-torque'](p);
      return {
        T,
        formulas: [F('Armature torque', 'T = K·Φ·I_a  (T ∝ Φ I_a),  K = PZ/(2πA)', `K = ${p.K}, Φ = ${p.phi} Wb, Ia = ${p.Ia} A`, `${p.K} × ${p.phi} × ${p.Ia}`, `${n(T, 4)} N·m`, 'N·m')],
        readouts: [{ label: 'Torque T', value: `${n(T, 4)} N·m`, tone: 'good' }, { label: 'KΦ', value: n(p.K * p.phi, 4) }],
        state: { K: p.K, flux: `${p.phi} Wb`, armatureCurrent: `${p.Ia} A`, torque: `${n(T, 4)} N·m`, graph: `T–Ia straight line with slope KΦ = ${n(p.K * p.phi, 4)} N·m/A` },
        explain: { what: `T = ${p.K} × ${p.phi} × ${p.Ia} = ${n(T, 4)} N·m.`, why: 'Each armature conductor feels F = BIl; the total torque is proportional to the flux (B) and to the current in the conductors.', param: 'Flux Φ, armature current Ia and the constant K.', effect: 'Doubling Φ or Ia doubles the torque. For a shunt motor (Φ constant) T ∝ Ia; for a series motor (Φ ∝ Ia) T ∝ Ia².' },
      };
    },
    steps: (p, c) => [
      { title: 'Force on each conductor', text: 'F = B·I·l on every armature conductor under a pole.' },
      { title: 'Sum over all conductors', text: 'Adding the moments of all Z conductors gives T = (PZ/2πA)·Φ·Ia = K·Φ·Ia.' },
      { title: 'Calculate', text: `T = ${p.K} × ${p.phi} × ${p.Ia} = ${n(c.T, 4)} N·m.` },
      { title: 'Torque response', text: 'The graph shows T rising linearly with Ia; the slope is KΦ, so a stronger field gives a steeper line.' },
    ],
    draw(g, S) {
      const { p, c, step, t } = S; bg(g);
      const cx = 240, cy = 290; const w = c.T / 40;
      D.circle(g, cx, cy, 150, { fill: '#e2e8f0', stroke: '#475569', width: 3 }); D.circle(g, cx, cy, 20, { fill: '#1f2937' });
      g.save(); g.translate(cx, cy); g.rotate(t * Math.min(4, 0.3 + w) * (c.T > 0 ? 1 : 0)); for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); D.rect(g, 60, -8, 70, 16, { fill: '#b45309', r: 4 }); } g.restore();
      const arcLen = Math.min(Math.PI * 1.6, 0.3 + c.T / 25);
      if (c.T > 0) { g.save(); g.strokeStyle = C.violet; g.lineWidth = 6 + Math.min(10, c.T / 10); g.beginPath(); g.arc(cx, cy, 180, -Math.PI / 2, -Math.PI / 2 + arcLen); g.stroke(); g.restore(); D.arrow(g, cx + 180 * Math.cos(-Math.PI / 2 + arcLen - 0.1), cy + 180 * Math.sin(-Math.PI / 2 + arcLen - 0.1), cx + 180 * Math.cos(-Math.PI / 2 + arcLen), cy + 180 * Math.sin(-Math.PI / 2 + arcLen), { color: C.violet, head: 20 }); }
      D.tag(g, `T = ${n(c.T, 3)} N·m`, cx, 70, { bg: C.violet, size: 16, align: 'center' });
      const xmax = 60;
      D.chart(g, 540, 80, 420, 320, { xmin: 0, xmax, ymin: 0, ymax: Math.max(10, p.K * p.phi * xmax * 1.55), xlabel: 'Armature current Ia (A)', ylabel: 'Torque T (N·m)', title: 'Torque response T = KΦIa', series: [{ points: [[0, 0], [xmax, p.K * p.phi * xmax]], color: C.violet, width: 3 }, { points: [[0, 0], [xmax, p.K * p.phi * 0.5 * xmax]], color: '#94a3b8', width: 2, dash: [6, 5] }, { points: [[0, 0], [xmax, p.K * p.phi * 1.5 * xmax]], color: '#94a3b8', width: 2, dash: [2, 5] }], marks: [{ point: [p.Ia, c.T], label: `${p.Ia} A → ${n(c.T, 3)} N·m`, color: C.orange }] });
      D.text(g, 'grey: 0.5Φ (dashed) and 1.5Φ (dotted)', 960, 62, { size: 13, weight: 700, align: 'right', color: C.muted });
      K.infoBox(g, 540, 470, [{ t: 'T ∝ Φ · Ia', b: true, size: 18, c: C.violet }, `${p.K} × ${p.phi} Wb × ${p.Ia} A`], { w: 420 });
      focusIf(g, step === 2, 530, 460, 440, 80, t);
    },
    challenge: {
      make(rand) { const target = pick(rand, [60, 80, 100, 120, 150]); return { kind: 'dc-torque', prompt: `Produce a torque of ${target} N·m by adjusting the flux and/or armature current.`, target, unit: 'N·m', tolerance: 1, hint: 'T = K·Φ·Ia — with K = 200 and Φ = 0.02 Wb each ampere gives 4 N·m.', setup: { K: 200, phi: 0.01, Ia: 10 } }; },
      evaluate(p) { const v = KINDS['dc-torque'](p); return { value: v, text: `T = ${n(v, 4)} N·m`, calculation: `T = ${p.K} × ${p.phi} × ${p.Ia} = ${n(v, 4)} N·m` }; },
    },
  };

  // ───────────────────────── 13. DC motor characteristics ─────────────────────────
  S['ee-dc-characteristics'] = {
    modes: [{ key: 'shunt', label: 'Shunt motor' }, { key: 'series', label: 'Series motor' }],
    params: [
      { key: 'V', label: 'Supply voltage V', type: 'range', min: 110, max: 440, step: 10, default: 220, unit: 'V' },
      { key: 'Ra', label: 'Armature (+ series field) resistance', type: 'range', min: 0.1, max: 2, step: 0.05, default: 0.5, unit: 'Ω' },
      { key: 'kphi', label: 'KΦ (shunt) / KΦ at rated current (series)', type: 'range', min: 0.5, max: 3, step: 0.05, default: 1.4, unit: 'V·s/rad' },
      { key: 'Ia', label: 'Operating armature current Ia', type: 'range', min: 2, max: 60, step: 1, default: 20, unit: 'A' },
      { key: 'Irated', label: 'Rated current (series flux reference)', type: 'range', min: 10, max: 60, step: 1, default: 30, unit: 'A', showIf: (p) => p.mode === 'series' },
    ],
    compute(p) {
      const shunt = p.mode === 'shunt';
      const kf = (I) => (shunt ? p.kphi : p.kphi * Math.min(1.3, I / p.Irated) + 1e-3);
      const speed = (I) => ((p.V - I * p.Ra) / kf(I)) * RPM; const torque = (I) => kf(I) * I;
      const N = speed(p.Ia), T = torque(p.Ia);
      const Is = Array.from({ length: 58 }, (_, i) => 3 + i);
      return {
        N, T, curves: { TI: Is.map((I) => [I, torque(I)]), NI: Is.map((I) => [I, speed(I)]), NT: Is.map((I) => [torque(I), speed(I)]) },
        formulas: [F('Speed', 'N = (V − I_a R_a) / (KΦ) × 60/2π', `V = ${p.V} V, Ia = ${p.Ia} A, Ra = ${p.Ra} Ω, KΦ = ${n(kf(p.Ia), 4)}`, `(${p.V} − ${p.Ia} × ${p.Ra}) / ${n(kf(p.Ia), 4)} × 9.549`, `${n(N, 4)} rpm`, 'rpm'), F('Torque', shunt ? 'T = KΦ·Ia (Φ constant → T ∝ Ia)' : 'T = KΦ·Ia with Φ ∝ Ia → T ∝ Ia²', '', `${n(kf(p.Ia), 4)} × ${p.Ia}`, `${n(T, 4)} N·m`, 'N·m')],
        readouts: [{ label: 'Speed N', value: `${n(N, 4)} rpm`, tone: 'good' }, { label: 'Torque T', value: `${n(T, 4)} N·m` }, { label: 'Ia', value: `${p.Ia} A` }],
        state: { motor: p.mode, operatingPoint: { armatureCurrent: `${p.Ia} A`, speed: `${n(N, 4)} rpm`, torque: `${n(T, 4)} N·m` }, curves: shunt ? 'T–Ia straight line; N–Ia slightly drooping; N–T slightly drooping' : 'T–Ia parabola (T ∝ Ia²); N–Ia hyperbola (N ∝ 1/Ia); very high speed at light load' },
        explain: { what: `At Ia = ${p.Ia} A the ${p.mode} motor runs at ${n(N, 4)} rpm with ${n(T, 4)} N·m.`, why: shunt ? 'With constant flux the torque is proportional to Ia and the speed only drops by the small Ia·Ra voltage — nearly constant speed.' : 'The flux grows with the load current, so torque rises like Ia² while the speed falls roughly as 1/Ia — at light load the speed becomes dangerously high.', param: 'Supply voltage, resistance, flux constant and the operating current.', effect: shunt ? 'More load → slightly lower speed, proportionally more torque.' : 'Less load → speed rises sharply; never run a series motor without load.' },
      };
    },
    steps: (p) => [
      { title: 'Torque vs armature current', text: p.mode === 'shunt' ? 'Φ is constant, so T ∝ Ia — a straight line.' : 'Φ ∝ Ia (before saturation), so T ∝ Ia² — a parabola.' },
      { title: 'Speed vs armature current', text: p.mode === 'shunt' ? 'N ∝ (V − IaRa)/Φ drops only slightly with load.' : 'N ∝ (V − IaRa)/Ia — falls steeply as the load current rises.' },
      { title: 'Speed vs torque (mechanical characteristic)', text: p.mode === 'shunt' ? 'Almost flat: a constant-speed motor.' : 'High torque at low speed — ideal for traction and cranes.' },
    ],
    draw(g, S) {
      const { p, c, step } = S; bg(g);
      const cols = [C.violet, C.blue, C.green];
      const box = (i, x, y, w, h, pts, xl, yl, title, mark) => { const xmax = Math.max(...pts.map((q) => q[0])); const ymax = Math.max(...pts.map((q) => q[1])); D.chart(g, x, y, w, h, { xmin: 0, xmax, ymin: 0, ymax: ymax * 1.05, xlabel: xl, ylabel: yl, title, series: [{ points: pts, color: cols[i], width: step === i ? 4 : 2.5 }], marks: [{ point: mark, color: C.orange }], xticks: 4, yticks: 3, ylabelOffset: 50 }); if (step === i) D.rect(g, x - 60, y - 28, w + 72, h + 76, { stroke: '#facc15', width: 3, r: 12, dash: [8, 6] }); };
      box(0, 80, 70, 240, 210, c.curves.TI, 'Ia (A)', 'Torque (N·m)', 'T – Ia', [p.Ia, c.T]);
      box(1, 410, 70, 240, 210, c.curves.NI, 'Ia (A)', 'Speed (rpm)', 'N – Ia', [p.Ia, c.N]);
      box(2, 740, 70, 240, 210, c.curves.NT, 'Torque (N·m)', 'Speed (rpm)', 'N – T', [c.T, c.N]);
      K.infoBox(g, 80, 390, [{ t: `${p.mode === 'shunt' ? 'SHUNT' : 'SERIES'} MOTOR — operating point`, b: true, c: C.green }, `Ia = ${p.Ia} A   N = ${n(c.N, 4)} rpm   T = ${n(c.T, 4)} N·m`, p.mode === 'shunt' ? 'Nearly constant speed; T ∝ Ia' : 'T ∝ Ia²; N ∝ 1/Ia; never start without load'], { w: 560 });
    },
    challenge: {
      make(rand) { const target = pick(rand, [1200, 1300, 1400, 1450]); return { kind: 'dc-shunt-speed', prompt: `For the SHUNT motor, adjust KΦ (field) so that it runs at ${target} rpm at the chosen armature current.`, target, unit: 'rpm', tolerance: 15, hint: 'N = (V − IaRa)/KΦ × 9.549 — a weaker field (smaller KΦ) runs faster.', setup: { mode: 'shunt', V: 220, Ra: 0.5, Ia: 20, kphi: 2 } }; },
      evaluate(p) { const v = KINDS['dc-shunt-speed'](p); return { value: v, text: p.mode === 'shunt' ? `N = ${n(v, 4)} rpm` : 'Select the shunt motor', calculation: `N = (${p.V} − ${p.Ia}×${p.Ra}) / ${p.kphi} × 60/2π = ${n(v, 4)} rpm` }; },
    },
  };

  // ───────────────────────── 14. DC motor starters ─────────────────────────
  const STUDS = 5; const SCX = 330, SCY = 320, SR = 170; const SA0 = Math.PI * 1.15, SA1 = Math.PI * 1.85;
  S['ee-dc-starters'] = {
    live: true,
    modes: [{ key: 'three', label: 'Three-point starter (shunt motor)' }, { key: 'two', label: 'Two-point starter (series motor)' }],
    params: [
      { key: 'pos', label: 'Starter handle position (0 = OFF, 5 = RUN)', type: 'range', min: 0, max: STUDS, step: 1, default: 0 },
      { key: 'V', label: 'Supply voltage V', type: 'range', min: 110, max: 440, step: 10, default: 220, unit: 'V' },
      { key: 'Ra', label: 'Armature resistance Ra', type: 'range', min: 0.2, max: 2, step: 0.1, default: 0.5, unit: 'Ω' },
      { key: 'Rst', label: 'Total starting resistance', type: 'range', min: 0, max: 20, step: 0.5, default: 8, unit: 'Ω' },
    ],
    stepDuration: 3,
    onPointer(type, x, y, st) {
      if (type !== 'down' && type !== 'move') return null; const d = Math.hypot(x - SCX, y - SCY); if (d < 60 || d > 230) return null;
      let a = Math.atan2(y - SCY, x - SCX); if (a < 0) a += Math.PI * 2; if (a < SA0 - 0.3 || a > SA1 + 0.3) return null;
      const pos = Math.round(((Math.min(SA1, Math.max(SA0, a)) - SA0) / (SA1 - SA0)) * STUDS); return pos !== st.p.pos ? { params: { pos } } : { redraw: true };
    },
    compute(p) {
      const Rleft = p.pos === 0 ? Infinity : (p.Rst * (STUDS - p.pos)) / (STUDS - 1);
      const Eb = p.pos <= 1 ? 0 : (p.V * 0.9 * (p.pos - 1)) / (STUDS - 1);
      const I = p.pos === 0 ? 0 : (p.V - Eb) / (p.Ra + Rleft);
      const Idirect = p.V / p.Ra; const Ist = KINDS['starter-ist'](p);
      const stateText = p.pos === 0 ? 'OFF' : p.pos === 1 ? 'Starting position — all resistance in circuit' : p.pos < STUDS ? 'Resistance being cut out as the speed builds up' : 'RUN — all resistance removed, held by the no-volt coil';
      return {
        Rleft, Eb, I, Idirect, Ist, stateText,
        formulas: [F('Starting current without a starter', 'I = V / R_a  (E_b = 0 at standstill)', `V = ${p.V} V, Ra = ${p.Ra} Ω`, `${p.V} / ${p.Ra}`, `${n(Idirect, 4)} A (dangerous)`, 'A'), F('Starting current with the starter', 'I_st = V / (R_a + R_st)', `R_st = ${p.Rst} Ω`, `${p.V} / (${p.Ra} + ${p.Rst})`, `${n(Ist, 4)} A`, 'A'), F('Current at this handle position', 'I = (V − E_b)/(R_a + R_remaining)', `E_b ≈ ${n(Eb)} V, R_remaining = ${Number.isFinite(Rleft) ? n(Rleft) : 'open'} Ω`, p.pos ? `(${p.V} − ${n(Eb)}) / (${p.Ra} + ${n(Rleft)})` : 'handle OFF', `${n(I, 4)} A`, 'A')],
        readouts: [{ label: 'Handle', value: p.pos === 0 ? 'OFF' : p.pos === STUDS ? 'RUN' : `stud ${p.pos}`, tone: p.pos === STUDS ? 'good' : '' }, { label: 'R in circuit', value: Number.isFinite(Rleft) ? si(Rleft, 'Ω') : 'open' }, { label: 'Current', value: si(I, 'A') }, { label: 'E_b', value: si(Eb, 'V') }],
        state: { starter: p.mode === 'three' ? 'Three-point (L, F, A terminals) for a shunt motor' : 'Two-point for a series motor', handlePosition: p.pos, circuitState: stateText, resistanceInCircuit: Number.isFinite(Rleft) ? si(Rleft, 'Ω') : 'open circuit', current: si(I, 'A'), directOnLineCurrent: si(Idirect, 'A') },
        explain: { what: `${stateText}; current ${si(I, 'A')}.`, why: `At standstill there is no back EMF, so without a starter the current would be V/Ra = ${n(Idirect, 3)} A. The starter adds resistance at first and removes it stud by stud as the back EMF builds up. The no-volt coil holds the handle in RUN and releases it if the supply fails${p.mode === 'three' ? ' or the field circuit opens' : ''}; the overload coil trips it on excess current.`, param: 'Handle position (drag it on the drawing), supply voltage, armature and starting resistance.', effect: 'Moving the handle too fast gives large current peaks; the resistance must be cut out gradually.' },
      };
    },
    steps: () => [
      { title: 'OFF', text: 'The handle rests on the OFF stud; the motor is disconnected.' },
      { title: 'Starting position', text: 'The handle touches stud 1: all the starting resistance is in series with the armature, limiting the current.' },
      { title: 'Resistance gradually removed', text: 'As the motor speeds up, back EMF rises and the handle is moved stud by stud, cutting out resistance.' },
      { title: 'Operating condition', text: 'In RUN all resistance is out; the no-volt coil holds the handle; the overload release protects the motor.' },
    ],
    draw(g, S) {
      const { p, c, step, t, playing } = S; bg(g);
      const pos = playing || S.st < S.dur ? [0, 1, 3, STUDS][step] : p.pos;
      g.save(); g.strokeStyle = '#fed7aa'; g.lineWidth = 18; g.beginPath(); g.arc(SCX, SCY, SR, SA0 + (SA1 - SA0) / STUDS, SA1); g.stroke(); g.restore();
      for (let k = 0; k <= STUDS; k++) { const a = SA0 + ((SA1 - SA0) * k) / STUDS; D.circle(g, SCX + SR * Math.cos(a), SCY + SR * Math.sin(a), 13, { fill: k === 0 ? '#e2e8f0' : k === STUDS ? '#bbf7d0' : '#fdba74', stroke: C.ink, width: 2 }); D.text(g, k === 0 ? 'OFF' : k === STUDS ? 'RUN' : String(k), SCX + (SR + 36) * Math.cos(a), SCY + (SR + 36) * Math.sin(a), { size: 14, weight: 800, align: 'center' }); }
      const ah = SA0 + ((SA1 - SA0) * pos) / STUDS; D.line(g, SCX, SCY, SCX + SR * Math.cos(ah), SCY + SR * Math.sin(ah), { color: C.ink, width: 10 }); D.circle(g, SCX + SR * Math.cos(ah), SCY + SR * Math.sin(ah), 16, { fill: C.red, stroke: '#fff', width: 3 }); D.circle(g, SCX, SCY, 14, { fill: C.ink });
      const nx = SCX + SR * Math.cos(SA1), ny = SCY + SR * Math.sin(SA1);
      D.rect(g, nx - 34, ny + 34, 68, 32, { fill: pos === STUDS ? '#bbf7d0' : '#fff', stroke: C.green, r: 8 }); D.text(g, 'NVC', nx, ny + 50, { size: 13, weight: 800, align: 'center', color: C.green });
      D.rect(g, 80, 440, 100, 36, { fill: '#fff', stroke: C.red, r: 8 }); D.text(g, 'Overload', 130, 458, { size: 13, weight: 800, align: 'center', color: C.red });
      D.text(g, p.mode === 'three' ? 'Three-point: L (line), F (field), A (armature); NVC in the field circuit' : 'Two-point: NVC in series with the series motor', SCX, 530, { size: 14, weight: 700, align: 'center', color: C.muted });
      K.motor(g, 560, 440, 40, { angle: pos ? t * (pos / STUDS) * 6 : 0 });
      D.text(g, 'Drag the red handle', SCX, 60, { size: 14, weight: 700, align: 'center', color: C.muted });
      const pts = []; for (let k = 1; k <= STUDS; k++) { const Rl = (p.Rst * (STUDS - k)) / (STUDS - 1); const EbPrev = k <= 1 ? 0 : (p.V * 0.9 * (k - 2)) / (STUDS - 1); const EbNow = k <= 1 ? 0 : (p.V * 0.9 * (k - 1)) / (STUDS - 1); pts.push([k - 0.02, (p.V - EbPrev) / (p.Ra + Rl)], [k + 0.98, (p.V - EbNow) / (p.Ra + Rl)]); }
      D.chart(g, 680, 80, 290, 250, { xmin: 0, xmax: STUDS + 1, ymin: 0, ymax: Math.max(...pts.map((q) => q[1])) * 1.15, xlabel: 'Handle position', ylabel: 'Current (A)', title: 'Current as the handle moves', xticks: STUDS + 1, series: [{ points: pts, color: C.orange, width: 3 }], marks: [{ x: pos, color: C.red, label: pos === 0 ? 'OFF' : `pos ${pos}` }] });
      K.infoBox(g, 680, 400, [{ t: c.stateText, b: true, size: 13, c: pos === STUDS ? C.green : C.ink }, `Without starter: ${n(c.Idirect, 3)} A`, `With starter: ${n(c.Ist, 3)} A at start`], { w: 300 });
    },
    challenge: {
      make(rand) { const target = pick(rand, [20, 25, 30, 40]); return { kind: 'starter-ist', prompt: `Choose the total starting resistance so that the starting current of the 220 V motor (Ra = 0.5 Ω) is limited to ${target} A.`, target, unit: 'A', tolerance: 0.5, hint: 'I_st = V / (Ra + R_st) → R_st = V/I_st − Ra', setup: { V: 220, Ra: 0.5, Rst: 2 } }; },
      evaluate(p) { const v = KINDS['starter-ist'](p); return { value: v, text: `I_st = ${n(v, 4)} A`, calculation: `I_st = ${p.V}/(${p.Ra} + ${p.Rst}) = ${n(v, 4)} A` }; },
    },
  };

  // ───────────────────────── 15. DC motor speed control ─────────────────────────
  S['ee-dc-speed'] = {
    live: true, conceptual: true,
    modes: [{ key: 'armature', label: 'Armature control (series resistance)' }, { key: 'field', label: 'Field control (field rheostat)' }],
    params: [
      { key: 'Rx', label: 'Extra armature resistance Rx', type: 'range', min: 0, max: 5, step: 0.1, default: 0, unit: 'Ω', showIf: (p) => p.mode === 'armature' },
      { key: 'field', label: 'Field strength (Φ as % of rated)', type: 'range', min: 50, max: 100, step: 1, default: 100, unit: '%', showIf: (p) => p.mode === 'field' },
      { key: 'V', label: 'Supply V', type: 'range', min: 110, max: 440, step: 10, default: 220, unit: 'V' },
      { key: 'Ia', label: 'Load (armature) current', type: 'range', min: 5, max: 40, step: 1, default: 20, unit: 'A' },
      { key: 'Ra', label: 'Armature resistance Ra', type: 'range', min: 0.2, max: 1, step: 0.05, default: 0.5, unit: 'Ω' },
    ],
    compute(p) {
      const cfg = Object.assign({}, p, { Rx: p.mode === 'armature' ? p.Rx : 0, field: p.mode === 'field' ? p.field : 100 }); const ratio = KINDS['dc-speed-ratio'](cfg);
      const N = 1500 * ratio;
      return {
        ratio, N,
        formulas: [F('Speed equation', 'N ∝ E_b / Φ = (V − I_a(R_a + R_x)) / Φ', p.mode === 'armature' ? `R_x = ${p.Rx} Ω` : `Φ = ${p.field}% of rated`, `N/N_rated = ${n(ratio, 4)}`, `${n(N, 4)} rpm (rated 1500 rpm)`, 'rpm')],
        readouts: [{ label: 'Speed', value: `${n(N, 4)} rpm`, tone: ratio > 1.001 ? 'good' : ratio < 0.999 ? 'bad' : '' }, { label: 'vs rated', value: ratio > 1.001 ? 'above ▲' : ratio < 0.999 ? 'below ▼' : 'rated' }],
        state: { method: p.mode === 'armature' ? 'Armature (rheostatic) control' : 'Field (flux) control', setting: p.mode === 'armature' ? `R_x = ${p.Rx} Ω` : `Φ = ${p.field}%`, speed: `${n(N, 4)} rpm`, speedRatio: n(ratio, 4) },
        explain: { what: p.mode === 'armature' ? `Adding ${p.Rx} Ω in the armature lowers the back EMF, so the speed is ${n(N, 4)} rpm.` : `The field at ${p.field}% gives ${n(N, 4)} rpm.`, why: 'The motor settles where the back EMF E_b = KΦN balances V − IaR. Less voltage across the armature → lower speed; less flux → the armature must spin faster to generate the same back EMF.', param: p.mode === 'armature' ? 'Extra armature resistance.' : 'Field current (flux).', effect: p.mode === 'armature' ? 'Armature control only gives speeds BELOW rated and wastes power in the resistance.' : 'Field control gives speeds ABOVE rated efficiently (small field current), but torque per ampere falls.' },
      };
    },
    steps: (p) => [
      { title: 'Speed depends on E_b / Φ', text: 'N ∝ (V − IaRa)/Φ.' },
      { title: p.mode === 'armature' ? 'Add resistance in the armature' : 'Weaken the field', text: p.mode === 'armature' ? 'A rheostat in series with the armature reduces the voltage across it.' : 'A rheostat in series with the shunt field reduces I_f and so Φ.' },
      { title: 'New speed', text: p.mode === 'armature' ? 'Speed falls below rated.' : 'Speed rises above rated.' },
    ],
    draw(g, S) {
      const { p, c, t } = S; bg(g);
      K.wire(g, [[90, 240], [90, 110], [480, 110]]); K.wire(g, [[90, 320], [90, 440], [480, 440]]); K.cell(g, [90, 320], [90, 240], { label: 'V', value: `${p.V} V`, labelOffset: 44 });
      K.wire(g, [[280, 110], [280, 170]]); K.coil(g, [280, 170], [280, 300], { label: 'Shunt field', turns: 6, color: C.green, labelSide: 'other' }); K.resistor(g, [280, 300], [280, 440], { label: 'Field rheostat', value: p.mode === 'field' ? `Φ ${p.field}%` : 'fixed', color: p.mode === 'field' ? C.red : undefined, labelSide: 'other', body: 60 });
      K.resistor(g, [480, 110], [480, 230], { label: 'R_x', value: p.mode === 'armature' ? `${p.Rx} Ω` : '0 Ω', color: p.mode === 'armature' ? C.red : undefined, body: 60, labelSide: 'other' });
      K.wire(g, [[480, 230], [480, 254]]); K.motor(g, 480, 300, 46, { angle: t * c.ratio * 5 }); K.wire(g, [[480, 346], [480, 440]]);
      const dx = 790, dy = 300, r = 150;
      g.save(); g.lineWidth = 16; g.strokeStyle = '#fee2e2'; g.beginPath(); g.arc(dx, dy, r, Math.PI, Math.PI * 1.5); g.stroke(); g.strokeStyle = '#dcfce7'; g.beginPath(); g.arc(dx, dy, r, Math.PI * 1.5, Math.PI * 2); g.stroke(); g.restore();
      for (let k = 0; k <= 4; k++) { const v = 0.5 + k * 0.25; const a = Math.PI + (v - 0.5) * Math.PI; D.text(g, `${Math.round(v * 1500)}`, dx + (r + 28) * Math.cos(a), dy + (r + 28) * Math.sin(a), { size: 13, weight: 700, align: 'center', color: C.muted }); }
      const a = Math.PI + (Math.max(0.5, Math.min(1.5, c.ratio)) - 0.5) * Math.PI; D.line(g, dx, dy, dx + (r - 10) * Math.cos(a), dy + (r - 10) * Math.sin(a), { color: C.red, width: 6 }); D.circle(g, dx, dy, 12, { fill: C.ink });
      D.text(g, `${n(c.N, 4)} rpm`, dx, dy + 44, { size: 24, weight: 900, align: 'center', color: c.ratio > 1.001 ? C.green : c.ratio < 0.999 ? C.red : C.ink });
      D.text(g, 'rated 1500 rpm', dx, dy + 72, { size: 13, weight: 700, align: 'center', color: C.muted });
      K.infoBox(g, 640, 420, [{ t: p.mode === 'armature' ? 'Armature control → BELOW rated' : 'Field control → ABOVE rated', b: true, c: p.mode === 'armature' ? C.red : C.green }, 'N ∝ (V − Ia(Ra + Rx)) / Φ'], { w: 330 });
    },
    challenge: {
      make(rand) { const target = pick(rand, [1.1, 1.2, 1.25, 1.3]); return { kind: 'dc-speed-ratio', prompt: `Run the motor at ${Math.round(target * 100)}% of its rated speed. Pick the right control method and set it.`, target, unit: '× rated', tolerance: 0.02, hint: 'Only field weakening can raise the speed above rated.', setup: { mode: 'armature', Rx: 1, field: 100 } }; },
      evaluate(p) { const cfg = Object.assign({}, p, { Rx: p.mode === 'armature' ? p.Rx : 0, field: p.mode === 'field' ? p.field : 100 }); const v = KINDS['dc-speed-ratio'](cfg); return { value: v, text: `N = ${n(v * 1500, 4)} rpm (${n(v * 100, 3)}% of rated)`, calculation: `N/N_rated = (V − Ia(Ra+Rx))/Φ ÷ (V − IaRa) = ${n(v, 4)}` }; },
    },
  };
})();
