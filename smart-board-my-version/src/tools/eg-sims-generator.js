'use strict';

/* Engineering Graphics — Flagship: 3D Object → Projection Generator. */
(function () {
  const S = (window.EGSims = window.EGSims || {});
  const D = window.EPDraw; const G = window.EGGeom;
  const { C, fmt, clamp } = D;

  const OBJECTS = [
    { value: 'prism', label: 'Prism' }, { value: 'pyramid', label: 'Pyramid' },
    { value: 'cylinder', label: 'Cylinder' }, { value: 'cone', label: 'Cone' },
    { value: 'cube', label: 'Cube' }, { value: 'cuboid', label: 'Cuboid (rectangular block)' },
  ];
  const POLY = { 3: 'triangular', 4: 'square', 5: 'pentagonal', 6: 'hexagonal', 7: 'heptagonal', 8: 'octagonal' };
  const VIEW_COL = { front: '#2563eb', top: '#16a34a', side: '#d97706' };
  const VIEW_SHORT = { front: 'FV', top: 'TV', side: 'LSV' };

  function objectName(p) {
    if (p.obj === 'prism' || p.obj === 'pyramid') return `${POLY[p.n] || p.n + '-sided'} ${p.obj}`;
    return p.obj;
  }
  function specOf(p) {
    if (p.obj === 'prism' || p.obj === 'pyramid') return { type: p.obj, n: p.n, a: p.a, h: p.h };
    if (p.obj === 'cylinder' || p.obj === 'cone') return { type: p.obj, d: p.d, h: p.h };
    if (p.obj === 'cube') return { type: 'cube', a: p.a };
    return { type: 'cuboid', l: p.a * 1.6, w: p.a, h: p.h };
  }
  /** Builds the placed solid and its three views. */
  function build(p) {
    const base = G.solid(specOf(p));
    const solid = G.place(base, { spin: p.spin, tiltHP: p.tiltHP, rotVP: p.rotVP, front: p.front, above: p.above, x: 0 });
    const views = { front: G.view(solid, 'front'), top: G.view(solid, 'top'), side: G.view(solid, 'side') };
    const b = G.bounds(solid);
    const [A, B] = solid.axis; const d = G.sub(B, A); const L = G.len(d);
    const theta = G.deg(Math.asin(clamp(Math.abs(d[2]) / L, 0, 1))); // with HP
    const phi = G.deg(Math.asin(clamp(Math.abs(d[1]) / L, 0, 1)));   // with VP
    return { solid, views, b, axisL: L, theta, phi, fvLen: Math.hypot(d[0], d[2]), tvLen: Math.hypot(d[0], d[1]), svLen: Math.hypot(d[1], d[2]) };
  }
  /** Sheet layout (first-angle): FV above XY, TV below, LSV to the right of the FV. */
  function layout(m) {
    const X0 = 530, X1 = 975, TOP = 62, BOT = 532, gap = 40;
    const w = m.b.max[0] - m.b.min[0], ymax = m.b.max[1], zmax = m.b.max[2];
    const s = Math.min(3.4, (X1 - X0 - gap) / (w + ymax), (BOT - TOP - 24) / (zmax + ymax));
    const Y0 = TOP + zmax * s + 12; const xl = X0; const xr = xl + w * s; const X1p = xr + gap;
    return {
      s, Y0, xl, xr, X1p,
      F: ([x, z]) => [xl + (x - m.b.min[0]) * s, Y0 - z * s],
      T: ([x, y]) => [xl + (x - m.b.min[0]) * s, Y0 + y * s],
      Sd: ([y, z]) => [X1p + y * s, Y0 - z * s],
      rect: {
        front: [xl - 8, Y0 - zmax * s - 8, w * s + 16, zmax * s + 8],
        top: [xl - 8, Y0, w * s + 16, ymax * s + 8],
        side: [X1p - 4, Y0 - zmax * s - 8, ymax * s + 12, zmax * s + 8],
      },
    };
  }
  /** Representative points for projectors (all corners; for curved solids every 8th point on each circle + apex). */
  function projectorPoints(solid) {
    const n = solid.verts.length; const curved = solid.kind === 'cylinder' || solid.kind === 'cone';
    return solid.verts.filter((_, i) => !curved || i % 8 === 0 || (solid.kind === 'cone' && i === n - 1));
  }
  window.EGGenerator = { build, layout, specOf, objectName, OBJECTS, VIEW_COL, VIEW_SHORT };

  S['eg-projection-generator'] = {
    view3d: true,
    initialView: { yaw: 0.72, pitch: 0.4, zoom: 1 },
    tools: [{ key: 'orbit', label: '🎥 Orbit camera', title: 'Drag in the 3-D panel to look around the object' }, { key: 'rotate', label: '🔄 Rotate object', title: 'Drag the object: left/right turns it in plan, up/down changes its angle with the HP' }],
    initUi: () => ({ tool: 'orbit' }),
    saveUi: (ui) => ({ tool: ui.tool }),
    restoreUi: (saved, ui) => Object.assign(ui, { tool: saved.tool === 'rotate' ? 'rotate' : 'orbit' }),
    params: [
      { key: 'obj', label: 'Object', type: 'select', options: OBJECTS, default: 'cylinder' },
      { key: 'n', label: 'Number of sides of the base', type: 'range', min: 3, max: 8, step: 1, default: 6, showIf: (p) => p.obj === 'prism' || p.obj === 'pyramid' },
      { key: 'a', label: 'Base edge a', type: 'range', min: 15, max: 50, step: 1, default: 30, unit: 'mm', showIf: (p) => p.obj !== 'cylinder' && p.obj !== 'cone' },
      { key: 'd', label: 'Base diameter d', type: 'range', min: 20, max: 70, step: 1, default: 40, unit: 'mm', showIf: (p) => p.obj === 'cylinder' || p.obj === 'cone' },
      { key: 'h', label: 'Axis length (height) h', type: 'range', min: 20, max: 90, step: 1, default: 60, unit: 'mm', showIf: (p) => p.obj !== 'cube' },
      { key: 'view', label: 'Select view', type: 'select', options: [{ value: 'all', label: 'All three views' }, { value: 'front', label: 'Front view (FV)' }, { value: 'top', label: 'Top view (TV)' }, { value: 'side', label: 'Left side view (LSV)' }], default: 'all' },
      { key: 'tiltHP', label: 'Axis inclination to HP θ', type: 'range', min: 0, max: 90, step: 1, default: 90, unit: '°', help: '90° = axis perpendicular to the HP (standing upright); 0° = lying on the HP.' },
      { key: 'rotVP', label: 'Axis plan angle with XY', type: 'range', min: 0, max: 90, step: 1, default: 0, unit: '°', help: 'Turns the object about a vertical axis — the TV of the axis makes this angle with XY.' },
      { key: 'spin', label: 'Rotation about its own axis', type: 'range', min: 0, max: 180, step: 5, default: 0, unit: '°', showIf: (p) => p.obj !== 'cylinder' && p.obj !== 'cone' },
      { key: 'front', label: 'Distance in front of VP', type: 'range', min: 0, max: 40, step: 1, default: 12, unit: 'mm' },
      { key: 'above', label: 'Height above HP', type: 'range', min: 0, max: 30, step: 1, default: 0, unit: 'mm' },
      { key: 'showProj', label: 'Show projection lines', type: 'toggle', default: true },
      { key: 'showHidden', label: 'Show hidden edges', type: 'toggle', default: true },
      { key: 'showPlanes', label: 'Show reference planes', type: 'toggle', default: true },
    ],
    examples: [
      { label: 'Cylinder standing on its base', values: { obj: 'cylinder', d: 40, h: 60, tiltHP: 90, rotVP: 0, view: 'all' } },
      { label: 'Hexagonal prism, axis inclined 45° to HP', values: { obj: 'prism', n: 6, a: 25, h: 60, tiltHP: 45, rotVP: 0, spin: 0, view: 'all' } },
      { label: 'Square pyramid, axis inclined to HP and VP', values: { obj: 'pyramid', n: 4, a: 35, h: 60, tiltHP: 50, rotVP: 35, spin: 45, view: 'all' } },
      { label: 'Cone lying on the HP — top view', values: { obj: 'cone', d: 50, h: 70, tiltHP: 0, rotVP: 30, view: 'top' } },
    ],
    validate(p) {
      const w = [];
      if (p.front === 0) w.push('The object touches the VP (distance in front of VP = 0) — its TV touches the XY line.');
      return w;
    },
    compute(p) {
      const m = build(p);
      const name = objectName(p);
      const orient = p.tiltHP === 90 ? 'axis perpendicular to the HP' : p.tiltHP === 0 && p.rotVP === 0 ? 'axis parallel to both HP and VP' : p.tiltHP === 0 ? `axis parallel to the HP, at ${p.rotVP}° to XY in plan` : p.rotVP === 0 ? `axis inclined ${p.tiltHP}° to the HP and parallel to the VP` : `axis inclined to both HP (θ = ${fmt(m.theta, 3)}°) and VP (φ = ${fmt(m.phi, 3)}°)`;
      const vcount = (k) => `${m.views[k].visible.length} visible / ${m.views[k].hidden.length} hidden edges`;
      const selected = p.view === 'all' ? 'FV, TV and LSV' : `${VIEW_SHORT[p.view]}`;
      const L = m.axisL;
      const formulas = [
        { name: 'Axis inclinations (from the placed object)', formula: 'sin θ = Δz / L ,  sin φ = Δy / L', given: `L = ${fmt(L, 4)} mm (true length of the axis)`, calc: `θ = ${fmt(m.theta, 4)}°,  φ = ${fmt(m.phi, 4)}°`, result: `θ = ${fmt(m.theta, 3)}° with HP, φ = ${fmt(m.phi, 3)}° with VP`, unit: 'degrees (°)' },
        { name: 'Length of the axis in the front view', formula: 'l_FV = L cos φ', given: `L = ${fmt(L, 4)} mm, φ = ${fmt(m.phi, 3)}°`, calc: `${fmt(L, 4)} × cos ${fmt(m.phi, 3)}°`, result: fmt(m.fvLen, 4), unit: 'mm' },
        { name: 'Length of the axis in the top view', formula: 'l_TV = L cos θ', given: `L = ${fmt(L, 4)} mm, θ = ${fmt(m.theta, 3)}°`, calc: `${fmt(L, 4)} × cos ${fmt(m.theta, 3)}°`, result: fmt(m.tvLen, 4), unit: 'mm' },
        { name: 'Length of the axis in the side view', formula: 'l_SV = √(Δy² + Δz²)', given: 'Δy, Δz = axis components parallel to the PP', calc: '', result: fmt(m.svLen, 4), unit: 'mm' },
      ];
      const readouts = [
        { label: 'Object', value: name, tone: 'info' },
        { label: 'Axis ∠HP', value: `${fmt(m.theta, 3)}°` },
        { label: 'Axis ∠VP', value: `${fmt(m.phi, 3)}°` },
        { label: 'View', value: selected, tone: 'good' },
      ];
      const dims = p.obj === 'cylinder' || p.obj === 'cone' ? `Ø${p.d} mm × ${p.h} mm` : p.obj === 'cube' ? `${p.a} mm cube` : p.obj === 'cuboid' ? `${fmt(p.a * 1.6, 3)} × ${p.a} × ${p.h} mm` : `base edge ${p.a} mm, axis ${p.h} mm`;
      const state = {
        currentObject: name, dimensions: dims,
        currentOrientation: orient, axisAngleWithHP: `${fmt(m.theta, 3)}°`, axisAngleWithVP: `${fmt(m.phi, 3)}°`, rotationAboutAxis: `${p.spin || 0}°`,
        position: `${p.above} mm above HP, ${p.front} mm in front of VP (first quadrant, first-angle projection)`,
        currentView: p.view === 'all' ? 'Front, top and left side views' : VIEW_SHORT[p.view],
        frontView: vcount('front'), topView: vcount('top'), sideView: vcount('side'),
        axisLengthFV: `${fmt(m.fvLen, 4)} mm`, axisLengthTV: `${fmt(m.tvLen, 4)} mm`,
      };
      const curved = p.obj === 'cylinder' || p.obj === 'cone';
      return {
        formulas, readouts, state,
        explain: {
          what: `A ${name} (${dims}) is placed in the first quadrant with its ${orient}. Parallel projectors from every corner meet the VP, HP and profile plane to give the ${selected}.`,
          why: 'In orthographic projection the projectors are perpendicular to the plane of projection, so a view shows lines and faces parallel to that plane in true size and foreshortens inclined ones. Opening the HP and PP into the plane of the VP gives the first-angle layout: TV below XY, LSV to the right of the FV.',
          param: `Object and size, axis inclination to the HP (θ = ${fmt(m.theta, 3)}°), plan angle (${p.rotVP}°)${curved ? '' : `, rotation about the axis (${p.spin || 0}°)`}, distances from the reference planes and the selected view.`,
          effect: `Tilting the axis shortens its view on the plane it is inclined to (l_TV = L cos θ = ${fmt(m.tvLen, 4)} mm). Turning it in plan changes the FV (l_FV = L cos φ = ${fmt(m.fvLen, 4)} mm). Moving the object away from a plane moves that view away from XY but never changes its shape.`,
        },
      };
    },
    steps(p) {
      const one = p.view !== 'all'; const v = VIEW_SHORT[p.view];
      const st = [
        { title: 'Place the object in the first quadrant', text: `The ${objectName(p)} is ${p.above} mm above the HP and ${p.front} mm in front of the VP.` },
        { title: 'Rotate / inspect the object', text: `Axis at ${p.tiltHP}° to the HP and ${p.rotVP}° in plan. Use "Rotate object" and drag — every view updates.` },
      ];
      if (one) {
        st.push({ title: `Select the view: ${v}`, text: `Projectors are drawn perpendicular to the ${G.VIEWS[p.view].plane} from every corner.` });
        st.push({ title: `Generate the ${v}`, text: 'Join the projected corners: visible edges thick, hidden edges dashed, axis as a chain line.' });
        st.push({ title: 'Final engineering drawing', text: p.view === 'front' ? 'The VP is the drawing sheet — the FV is drawn above XY.' : p.view === 'top' ? 'The HP is rotated 90° downwards about XY — the TV lies below XY.' : 'The PP is rotated 90° about its line with the VP — the LSV lies to the right of the FV.' });
      } else {
        st.push({ title: 'Front view on the VP', text: 'Projectors ⟂ VP from every corner give the FV (drawn above XY).' });
        st.push({ title: 'Top view on the HP', text: 'Projectors ⟂ HP give the TV; the HP is rotated down, so the TV lies below XY.' });
        st.push({ title: 'Left side view on the PP', text: 'Projectors ⟂ PP give the LSV, placed to the right of the FV (first-angle).' });
        st.push({ title: 'Projection lines between the views', text: 'Vertical projectors link FV and TV; horizontal ones link FV and LSV; the 45° mitre line transfers widths from TV to LSV.' });
        st.push({ title: 'Final engineering drawing', text: 'Visible edges thick, hidden edges dashed, axes as chain lines, XY and X₁Y₁ reference lines labelled.' });
      }
      return st;
    },
    onPointer(type, x, y, S2) {
      const { p, ui } = S2;
      if (type === 'down') {
        if (x > 500) { // pick a view on the sheet
          const lay = layout(build(p));
          const hit = Object.entries(lay.rect).find(([, r]) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]);
          if (hit) return { params: { view: p.view === hit[0] ? 'all' : hit[0] }, toast: p.view === hit[0] ? 'Showing all three views' : `Selected: ${G.VIEWS[hit[0]].name}` };
          return null;
        }
        if (ui.tool !== 'rotate') return null;
        ui.drag = { x, y, tilt: p.tiltHP, rot: p.rotVP };
        return { redraw: true };
      }
      if (!ui.drag) return null;
      if (type === 'move') {
        const tilt = Math.round(clamp(ui.drag.tilt + (ui.drag.y - y) * 0.45, 0, 90));
        const rot = Math.round(clamp(ui.drag.rot + (x - ui.drag.x) * 0.45, 0, 90));
        if (tilt === p.tiltHP && rot === p.rotVP) return null;
        return { params: { tiltHP: tilt, rotVP: rot } };
      }
      if (type === 'up') { ui.drag = null; return { recompute: true }; }
      return null;
    },
    draw(g, S2) {
      const { p, step, st, dur, view, t } = S2; const prog = clamp(st / dur, 0, 1);
      const m = build(p); const lay = layout(m); const one = p.view !== 'all';
      const shown = (k) => (one ? k === p.view && step >= 3 : (k === 'front' && step >= 2) || (k === 'top' && step >= 3) || (k === 'side' && step >= 4));
      const current = one ? (step === 2 || step === 3 ? p.view : null) : step === 2 ? 'front' : step === 3 ? 'top' : step === 4 ? 'side' : null;
      const finalStep = step >= (one ? 4 : 6);
      D.clear(g, '#ffffff');

      // ── 3-D panel ──
      D.rect(g, 8, 8, 486, 544, { fill: '#f8fafc', stroke: '#cbd5e1', width: 1.5, r: 10 });
      D.text(g, '3-D object in the first quadrant', 22, 30, { size: 17, weight: 800 });
      g.save(); g.beginPath(); g.rect(10, 44, 482, 480); g.clip();
      const b = m.b; const px = b.max[0] + 16;
      const size = Math.max(b.max[0] - b.min[0] + 30, b.max[1] + 20, b.max[2] + 20);
      const P = G.camera(view, 250, 290, 230 / size, [(b.min[0] + px) / 2, b.max[1] / 2, b.max[2] / 2], size * 1.6);
      const box = { x: [b.min[0] - 14, px], y: [0, b.max[1] + 16], z: [0, b.max[2] + 16] };
      if (p.showPlanes) G.drawPlanes3(g, P, box, { pp: !one || p.view === 'side', px });
      const on3 = { front: ([x, z]) => [x, 0, z], top: ([x, y]) => [x, y, 0], side: ([y, z]) => [px, y, z] };
      ['front', 'top', 'side'].forEach((k) => {
        if (!shown(k) && current !== k) return;
        const f = current === k ? prog : 1;
        m.views[k].visible.forEach(([a, c]) => { const A = P(on3[k](a)), B = P(on3[k](c)); D.line(g, A.x, A.y, A.x + (B.x - A.x) * f, A.y + (B.y - A.y) * f, { color: VIEW_COL[k], width: 2.2 }); });
      });
      G.drawSolid3(g, m.solid, P, { fill: '#93c5fd', showHidden: p.showHidden, alpha: 0.88 });
      if (p.showProj && current) {
        projectorPoints(m.solid).forEach((q) => {
          const target = current === 'front' ? [q[0], 0, q[2]] : current === 'top' ? [q[0], q[1], 0] : [px, q[1], q[2]];
          const A = P(q), B = P(target);
          D.line(g, A.x, A.y, A.x + (B.x - A.x) * prog, A.y + (B.y - A.y) * prog, { color: VIEW_COL[current], width: 1.2, dash: [4, 4], alpha: 0.85 });
          if (prog >= 1) D.circle(g, B.x, B.y, 2.6, { fill: VIEW_COL[current] });
        });
        const eyeDir = current === 'front' ? [0, 1, 0] : current === 'top' ? [0, 0, 1] : [-1, 0, 0];
        const c0 = G.centroid(m.solid.verts); const E0 = P(G.add(c0, G.mul(eyeDir, size * 0.62))); const E1 = P(G.add(c0, G.mul(eyeDir, size * 0.36)));
        D.arrow(g, E0.x, E0.y, E1.x, E1.y, { color: VIEW_COL[current], width: 3.5, head: 16 });
        D.tag(g, `Look for the ${VIEW_SHORT[current]}`, E0.x, E0.y - 16, { bg: VIEW_COL[current], size: 14, align: 'center' });
      }
      g.restore();
      D.text(g, S2.ui.tool === 'rotate' ? 'Drag the object to rotate it — views update live' : 'Drag to orbit · wheel / pinch to zoom · ✋ to pan', 250, 540, { size: 15, color: C.muted, align: 'center' });
      if (finalStep) D.text(g, 'Visible — thick · Hidden — dashed · Axis — chain', 250, 516, { size: 15, color: C.ink, align: 'center', weight: 700 });
      if (step === 1) D.focus(g, 20, 50, 460, 460, t);

      // ── Drawing sheet ──
      D.text(g, one ? `Engineering drawing — ${G.VIEWS[p.view].name}` : 'Engineering drawing (first-angle projection)', 512, 30, { size: 17, weight: 800 });
      G.xyLine(g, 522, 978, lay.Y0);
      const xTrace = lay.X1p;
      if (!one || p.view === 'side') { D.line(g, xTrace, 52, xTrace, 540, { color: '#0f172a', width: 1.3 }); D.text(g, 'X₁', xTrace, 46, { size: 14, weight: 800, align: 'center' }); D.text(g, 'Y₁', xTrace + 8, 538, { size: 14, weight: 800 }); }
      const maps = { front: lay.F, top: lay.T, side: lay.Sd };
      const allOut = !one && step >= 5;
      if (p.showProj && allOut) {
        projectorPoints(m.solid).forEach((q) => {
          const f = lay.F([q[0], q[2]]), tt = lay.T([q[0], q[1]]), sv = lay.Sd([q[1], q[2]]);
          D.line(g, f[0], f[1], tt[0], tt[1], G.LINE.projector);
          D.line(g, f[0], f[1], sv[0], sv[1], G.LINE.projector);
          const mx = sv[0]; const my = lay.Y0 + (sv[0] - xTrace); // on the 45° mitre through (X₁, XY)
          D.line(g, tt[0], tt[1], mx, my, G.LINE.projector); D.line(g, mx, my, sv[0], sv[1], G.LINE.projector);
        });
        const L = (m.b.max[1] + 20) * lay.s; D.line(g, xTrace, lay.Y0, xTrace + L, lay.Y0 + L, { color: C.muted, width: 1.2, dash: [10, 4, 2, 4] });
        D.text(g, '45° mitre', xTrace + 18, lay.Y0 + 40, { size: 14, color: C.muted });
      }
      ['front', 'top', 'side'].forEach((k) => {
        if (!(shown(k) || current === k)) return;
        const V = m.views[k]; const f = current === k ? prog : 1; const M = maps[k];
        if (p.showHidden) V.hidden.forEach(([a, c]) => { const A = M(a), B = M(c); D.line(g, A[0], A[1], A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, G.LINE.hidden); });
        V.visible.forEach(([a, c]) => { const A = M(a), B = M(c); D.line(g, A[0], A[1], A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, { color: finalStep ? '#0f172a' : VIEW_COL[k], width: 2.6 }); });
        if (V.axis && f >= 1) { const [A, B] = V.axis.map(M); const dx = B[0] - A[0], dy = B[1] - A[1], Lx = Math.hypot(dx, dy); if (Lx > 2) G.seg(g, [A[0] - (dx / Lx) * 10, A[1] - (dy / Lx) * 10], [B[0] + (dx / Lx) * 10, B[1] + (dy / Lx) * 10], G.LINE.centre); }
        const r = lay.rect[k];
        D.tag(g, VIEW_SHORT[k], r[0] + r[2] / 2, k === 'top' ? Math.min(546, r[1] + r[3] + 14) : Math.max(54, r[1] - 12), { bg: VIEW_COL[k], size: 14, align: 'center' });
        if (current === k) D.focus(g, r[0], r[1], r[2], r[3], t);
      });
      if (step < 2) D.text(g, 'Views appear here as you step through', 750, 300, { size: 17, color: C.faint, align: 'center' });
      
    },
  };
})();
