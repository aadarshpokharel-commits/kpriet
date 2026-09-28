'use strict';

/*
 * Engineering Physics simulation engine (U21PH101).
 *
 * One page, 46 simulations (tools/ep-sims-u1..u5.js). Standalone it shows the
 * library (Unit → Topic → Simulation) or a preview; inside the Smart Board
 * (embedded=1&lock=1) it runs one simulation full screen with large touch
 * controls and reports the full context (subject, unit, topic, simulation,
 * parameters, step, state, formulas) to the board for the existing AI/RAG.
 *
 * Simulation definition (window.EPSims[id]):
 *   conceptual?: boolean                 – labelled "Conceptual Visualization"
 *   approx?: string                      – note about approximations used
 *   modes?: [{key,label}]                – visualization modes (value in p.mode)
 *   params: [{key,label,type:'range'|'number'|'select'|'toggle',min,max,step,default,unit,options:[{value,label}],help,showIf(p)}]
 *   examples?: [{label, values}]         – "Generate Example"
 *   validate?(p) → string[]              – warnings for invalid combinations
 *   steps(p, c) → [{title, text}]
 *   compute(p) → {formulas:[{name,formula,given,calc,result,unit}], readouts:[{label,value,tone}], state:{}, explain:{what,why,param,effect}}
 *   draw(g, S)  S = {p, c, step, st, t, dur, mode, view, playing, D}
 *   stepDuration?: number                – seconds per step while playing (default 4)
 *   view3d?: boolean                     – drag to rotate, wheel/buttons to zoom
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  const $ = (id) => document.getElementById(id);
  const CAT = window.EduverseEPCatalog;
  const SIMS = window.EPSims || {};
  const D = window.EPDraw;
  const embedded = params.get('embedded') === '1';
  const locked = params.get('lock') === '1';
  const preview = params.get('preview') === '1';
  const ctx = {
    subjectId: params.get('subjectId') || '', subjectName: params.get('subjectName') || CAT.subject.name,
    subjectCode: params.get('subjectCode') || CAT.subject.code, departmentId: params.get('departmentId') || '',
    departmentName: params.get('departmentName') || CAT.subject.department, semesterId: params.get('semesterId') || '',
    semesterNumber: params.get('semesterNumber') || String(CAT.subject.semester), role: (params.get('role') || 'teacher').toLowerCase(),
  };
  const isTeacher = ctx.role !== 'student';
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const SPEEDS = [0.5, 1, 1.5, 2];
  const parseJson = (v) => { try { const o = JSON.parse(v || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };

  let sim = null; let spec = null; let p = {}; let defaults = {}; let calc = null; let steps = [];
  let step = 0; let st = 0; let t = 0; let playing = false; let transient = false; let speed = 1; let raf = 0; let last = 0;
  let view = { yaw: -0.6, pitch: 0.42, zoom: 1 }; let autoRotate = false; let exampleIndex = -1;
  let showFormula = true; let showExplain = true; let toastTimer = null; let postTimer = null;
  let g = null; let canvas = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function toast(msg) { const el = $('ep-toast'); el.textContent = msg; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3200); }
  const dur = () => (spec && spec.stepDuration) || 4;

  // ─── Library ───
  function renderLibrary() {
    const lib = $('ep-library');
    lib.innerHTML = CAT.units.map((u) => {
      const sims = CAT.simulations.filter((s) => s.unit === u.unit);
      const topics = Array.from(new Set(sims.map((s) => s.topic)));
      return `<section class="ep-unit"><h2><span>Unit ${u.unit}</span> ${esc(u.title)} <small>${sims.length} simulations</small></h2><div class="ep-grid">` +
        topics.map((tp) => sims.filter((s) => s.topic === tp).map((s) =>
          `<article class="ep-sim-card"><div class="ep-sim-icon">${s.icon}</div><div class="ep-sim-body"><span class="ep-sim-topic">${esc(s.topic)}</span><h4>${esc(s.title)}</h4><p>${esc(s.description)}</p>` +
          `<div class="ep-sim-actions"><button type="button" class="ep-btn" data-open="${s.id}">👁 Preview</button>${embedded ? '' : `<button type="button" class="ep-btn ep-btn-primary" data-board="${s.id}">🖥 Launch Smart Board</button>`}</div></div></article>`).join('')).join('') + '</div></section>';
    }).join('');
    lib.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openSim(b.dataset.open, true)));
    lib.querySelectorAll('[data-board]').forEach((b) => b.addEventListener('click', () => launchBoard(b.dataset.board)));
  }
  function showLibrary() {
    pause(); sim = null; spec = null;
    $('ep-library').classList.remove('hidden'); $('ep-player').classList.add('hidden');
    document.querySelectorAll('.ep-player-only').forEach((el) => el.classList.add('hidden'));
    $('ep-title').textContent = 'Engineering Physics Interactive Laboratory';
    $('ep-subtitle').textContent = `${ctx.subjectCode} · ${CAT.simulations.length} interactive simulations in ${CAT.units.length} units`;
    $('ep-crumbs').textContent = `Semester ${ROMAN[Number(ctx.semesterNumber)] || ctx.semesterNumber} › ${ctx.subjectName} › Simulations`;
    $('ep-concept').classList.add('hidden');
    document.title = 'Engineering Physics Simulations · Eduverse';
  }

  // ─── Parameters ───
  const visibleParams = () => (spec.params || []).filter((d) => !d.showIf || d.showIf(p));
  function clampParam(d, v) {
    if (d.type === 'toggle') return Boolean(v);
    if (d.type === 'select') return d.options.some((o) => String(o.value) === String(v)) ? d.options.find((o) => String(o.value) === String(v)).value : d.default;
    let n = Number(v); if (!Number.isFinite(n)) n = d.default;
    if (d.min != null) n = Math.max(d.min, n); if (d.max != null) n = Math.min(d.max, n);
    return n;
  }
  function renderParams() {
    const form = $('ep-params');
    const list = visibleParams();
    if (!list.length) { form.innerHTML = '<p class="ep-hint">No parameters — step through the simulation.</p>'; return; }
    form.innerHTML = list.map((d) => {
      const id = `ep-in-${d.key}`; const v = p[d.key]; const unit = d.unit ? `<em>${esc(d.unit)}</em>` : '';
      const help = d.help ? `<small>${esc(d.help)}</small>` : '';
      if (d.type === 'select') return `<label class="ep-field" for="${id}"><span>${esc(d.label)}</span><select id="${id}" data-key="${d.key}">${d.options.map((o) => `<option value="${esc(o.value)}"${String(v) === String(o.value) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${help}</label>`;
      if (d.type === 'toggle') return `<label class="ep-field ep-toggle" for="${id}"><span>${esc(d.label)}</span><input id="${id}" type="checkbox" role="switch" data-key="${d.key}"${v ? ' checked' : ''}>${help}</label>`;
      if (d.type === 'range') return `<label class="ep-field" for="${id}"><span>${esc(d.label)} <b id="${id}-v">${esc(D.fmt(v, 4))}</b>${unit}</span><div class="ep-range"><input id="${id}" type="range" data-key="${d.key}" min="${d.min}" max="${d.max}" step="${d.step || 1}" value="${v}"><input type="number" class="ep-num" data-num="${d.key}" min="${d.min}" max="${d.max}" step="${d.step || 1}" value="${v}" aria-label="${esc(d.label)} value"></div>${help}</label>`;
      return `<label class="ep-field" for="${id}"><span>${esc(d.label)}${unit}</span><input id="${id}" type="number" data-key="${d.key}" min="${d.min ?? ''}" max="${d.max ?? ''}" step="${d.step || 'any'}" value="${v}">${help}</label>`;
    }).join('');
    form.querySelectorAll('[data-key]').forEach((el) => {
      const d = spec.params.find((x) => x.key === el.dataset.key);
      const evt = el.type === 'range' ? 'input' : 'change';
      el.addEventListener(evt, () => setParam(d, el.type === 'checkbox' ? el.checked : el.value, el.type !== 'range' || false));
    });
    form.querySelectorAll('[data-num]').forEach((el) => {
      const d = spec.params.find((x) => x.key === el.dataset.num);
      el.addEventListener('change', () => setParam(d, el.value, true));
    });
  }
  function setParam(d, value, rerender) {
    const before = visibleParams().map((x) => x.key).join();
    p[d.key] = clampParam(d, value);
    exampleIndex = -1;
    const after = visibleParams().map((x) => x.key).join();
    if (rerender || before !== after || d.type === 'select' || d.type === 'toggle') renderParams();
    else {
      const b = $(`ep-in-${d.key}-v`); if (b) b.textContent = D.fmt(p[d.key], 4);
      const n = document.querySelector(`[data-num="${d.key}"]`); if (n && document.activeElement !== n) n.value = p[d.key];
    }
    recompute(true);
  }
  function generateExample() {
    const ex = spec.examples || [];
    if (ex.length) {
      exampleIndex = (exampleIndex + 1) % ex.length;
      p = Object.assign({}, defaults, ex[exampleIndex].values || {});
      (spec.params || []).forEach((d) => { p[d.key] = clampParam(d, p[d.key]); });
      toast(`Example: ${ex[exampleIndex].label}`);
    } else {
      (spec.params || []).forEach((d) => {
        if (d.type === 'range' || d.type === 'number') {
          const lo = d.min ?? 0; const hi = d.max ?? lo + 10; const s = d.step || 1;
          p[d.key] = clampParam(d, Math.round((lo + Math.random() * (hi - lo)) / s) * s);
        }
      });
      toast('Random example generated within the valid ranges.');
    }
    renderParams(); recompute(false);
  }
  function resetParams() { p = Object.assign({}, defaults); exampleIndex = -1; renderParams(); recompute(false); }

  // ─── Compute & panels ───
  function recompute(keepStep) {
    try { calc = spec.compute(Object.assign({}, p)) || {}; } catch (err) { console.error(err); calc = { formulas: [], readouts: [], state: {}, explain: {} }; toast('Could not calculate with these values.'); }
    try { steps = spec.steps(Object.assign({}, p), calc) || []; } catch (err) { console.error(err); steps = []; }
    if (!steps.length) steps = [{ title: sim.title, text: sim.description }];
    if (!keepStep) { step = 0; st = playing ? 0 : dur(); }
    step = Math.min(step, steps.length - 1);
    const warnings = spec.validate ? spec.validate(Object.assign({}, p)) || [] : [];
    $('ep-warn').innerHTML = warnings.map((w) => `<p>⚠ ${esc(w)}</p>`).join('');
    $('ep-warn').classList.toggle('hidden', !warnings.length);
    renderReadouts(); renderFormulas(); renderExplain(); renderSteps(); draw(); schedulePost();
  }
  function renderReadouts() {
    $('ep-readouts').innerHTML = (calc.readouts || []).map((r) => `<div class="ep-chip ${r.tone ? 'tone-' + r.tone : ''}"><span>${esc(r.label)}</span><b>${esc(r.value)}</b></div>`).join('');
  }
  function renderFormulas() {
    const list = calc.formulas || [];
    $('ep-formulas').innerHTML = list.length ? list.map((f) => `
      <div class="ep-formula">
        <h4>${esc(f.name)}</h4>
        <dl>
          <div><dt>Formula</dt><dd class="ep-math">${esc(f.formula)}</dd></div>
          ${f.given ? `<div><dt>Given</dt><dd>${esc(f.given)}</dd></div>` : ''}
          ${f.calc ? `<div><dt>Calculation</dt><dd class="ep-math">${esc(f.calc)}</dd></div>` : ''}
          <div class="ep-result"><dt>Result</dt><dd><b>${esc(f.result)}</b></dd></div>
          <div><dt>Units</dt><dd>${esc(f.unit || '—')}</dd></div>
        </dl>
      </div>`).join('') + (spec.approx ? `<p class="ep-approx">≈ ${esc(spec.approx)}</p>` : '') : `<p class="ep-hint">${spec.conceptual ? 'Conceptual visualization — no quantitative formula is needed here.' : 'No formula for this view.'}</p>${spec.approx ? `<p class="ep-approx">≈ ${esc(spec.approx)}</p>` : ''}`;
  }
  function renderExplain() {
    const e = calc.explain || {};
    const rows = [['What is happening?', e.what], ['Why is it happening?', e.why], ['What parameter is changing?', e.param], ['What happens when it changes?', e.effect]];
    $('ep-explain').innerHTML = rows.map(([q, a]) => `<div class="ep-qa"><dt>${q}</dt><dd>${esc(a || '—')}</dd></div>`).join('');
  }
  function renderSteps() {
    $('ep-steps').innerHTML = steps.map((s, i) => `<li class="${i === step ? 'current' : i < step ? 'done' : ''}"><button type="button" data-step="${i}"><span class="ep-step-no">${i + 1}</span><span><b>${esc(s.title)}</b><small>${esc(s.text)}</small></span></button></li>`).join('');
    $('ep-steps').querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => goStep(Number(b.dataset.step), true)));
    const cur = $('ep-steps').querySelector('li.current'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    const s = steps[step] || {};
    $('ep-banner-no').textContent = `Step ${step + 1} of ${steps.length}`;
    $('ep-banner-title').textContent = s.title || '';
    $('ep-banner-text').textContent = s.text || '';
    $('ep-progress-fill').style.width = `${steps.length > 1 ? (100 * step) / (steps.length - 1) : 100}%`;
    $('ep-prev').disabled = step === 0; $('ep-next').disabled = step >= steps.length - 1;
  }

  // ─── Timeline ───
  function goStep(i, animate) {
    step = Math.max(0, Math.min(steps.length - 1, i)); st = 0;
    if (!playing) { transient = Boolean(animate); if (!animate) st = dur(); }
    renderSteps(); schedulePost(); ensureLoop(); draw();
  }
  function play() {
    if (step >= steps.length - 1 && st >= dur()) { step = 0; st = 0; renderSteps(); }
    playing = true; transient = false; $('ep-play').innerHTML = '⏸ Pause'; $('ep-play').classList.add('active'); $('ep-play').setAttribute('aria-pressed', 'true'); ensureLoop();
  }
  function pause() {
    playing = false; transient = false;
    if ($('ep-play')) { $('ep-play').innerHTML = '▶ Play'; $('ep-play').classList.remove('active'); $('ep-play').setAttribute('aria-pressed', 'false'); }
  }
  function reset() { pause(); t = 0; step = 0; st = 0; view = { yaw: -0.6, pitch: 0.42, zoom: 1 }; renderSteps(); draw(); schedulePost(); }
  function ensureLoop() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  function loop(now) {
    raf = 0;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const running = playing || transient || autoRotate;
    if (playing || transient) {
      t += dt * speed; st += dt * speed;
      if (playing && st >= dur() && step < steps.length - 1) { step++; st = 0; renderSteps(); schedulePost(); }
      if (transient && st >= dur()) { st = dur(); transient = false; }
    }
    if (autoRotate && spec && spec.view3d) view.yaw += dt * 0.5;
    draw();
    if (running && sim) raf = requestAnimationFrame(loop);
  }
  function setSpeed(v) {
    speed = v;
    document.querySelectorAll('[data-speed]').forEach((b) => { const on = Number(b.dataset.speed) === v; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
  }

  // ─── Canvas ───
  function fitCanvas() {
    const box = $('ep-canvas-wrap'); if (!box || !canvas) return;
    const r = box.getBoundingClientRect(); if (r.width < 10 || r.height < 10) return;
    const k = Math.min(r.width / D.W, r.height / D.H);
    const w = Math.floor(D.W * k); const h = Math.floor(D.H * k); const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    g.__base = [k * dpr, 0, 0, k * dpr, 0, 0];
    draw();
  }
  function draw() {
    if (!spec || !g || !calc) return;
    g.setTransform(...(g.__base || [1, 0, 0, 1, 0, 0]));
    try {
      g.save();
      spec.draw(g, { p, c: calc, step, st, t, dur: dur(), mode: p.mode, view, playing, D, steps });
      g.restore();
    } catch (err) {
      console.error(err);
      g.restore(); D.clear(g, '#fff'); D.text(g, 'Drawing error — see console', 500, 280, { align: 'center', color: D.C.red });
    }
  }
  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * D.W, y: ((e.clientY - r.top) / r.height) * D.H };
  }
  function wireCanvas() {
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (!spec) return;
      if (spec.view3d) { drag = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch }; canvas.setPointerCapture(e.pointerId); }
      if (spec.onClick) { const pt = canvasPoint(e); const res = spec.onClick(pt.x, pt.y, { p, c: calc, step, view }); if (res && res.params) { Object.assign(p, res.params); renderParams(); recompute(true); } if (res && res.toast) toast(res.toast); }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      view.yaw = drag.yaw + (e.clientX - drag.x) * 0.01;
      view.pitch = D.clamp(drag.pitch + (e.clientY - drag.y) * 0.01, -1.45, 1.45);
      draw();
    });
    const end = () => { drag = null; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', (e) => { if (!spec || !spec.view3d) return; e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });
  }
  function zoom(f) { view.zoom = D.clamp(view.zoom * f, 0.4, 3); draw(); }

  // ─── Open a simulation ───
  function openSim(id, fromLibrary) {
    const s = CAT.get(id);
    if (!s || !SIMS[id]) { toast('Simulation not found.'); showLibrary(); return; }
    pause(); sim = s; spec = SIMS[id];
    defaults = {}; (spec.params || []).forEach((d) => { defaults[d.key] = d.default; });
    if (spec.modes && spec.modes.length && defaults.mode == null) defaults.mode = spec.modes[0].key;
    const cfg = fromLibrary ? {} : parseJson(params.get('config'));
    const published = cfg.defaultParameters && typeof cfg.defaultParameters === 'object' ? cfg.defaultParameters : cfg;
    (spec.params || []).forEach((d) => { if (published[d.key] != null) defaults[d.key] = clampParam(d, published[d.key]); });
    const vm = cfg.visualizationMode || published.mode;
    if (vm && spec.modes && spec.modes.some((m) => m.key === vm)) defaults.mode = vm;
    p = Object.assign({}, defaults);
    const stt = fromLibrary ? {} : parseJson(params.get('state'));
    if (stt.parameters && typeof stt.parameters === 'object') (spec.params || []).forEach((d) => { if (stt.parameters[d.key] != null) p[d.key] = clampParam(d, stt.parameters[d.key]); });
    if (stt.mode && spec.modes && spec.modes.some((m) => m.key === stt.mode)) p.mode = stt.mode;
    view = { yaw: -0.6, pitch: 0.42, zoom: 1 }; autoRotate = false; t = 0; exampleIndex = -1;

    $('ep-library').classList.add('hidden'); $('ep-player').classList.remove('hidden');
    document.querySelectorAll('.ep-player-only').forEach((el) => el.classList.remove('hidden'));
    $('ep-library-btn').classList.toggle('hidden', locked);
    $('ep-launch-board').classList.toggle('hidden', embedded && locked);
    $('ep-publish').classList.toggle('hidden', !(isTeacher && window.parent !== window && !locked));
    $('ep-title').textContent = s.title;
    $('ep-subtitle').textContent = s.description;
    $('ep-crumbs').textContent = `Semester ${ROMAN[Number(ctx.semesterNumber)] || ctx.semesterNumber} › ${ctx.subjectName} › Unit ${s.unit} — ${s.unitTitle} › ${s.topic}`;
    $('ep-concept').classList.toggle('hidden', !spec.conceptual);
    $('ep-view3d').classList.toggle('hidden', !spec.view3d);
    const modeSel = $('ep-mode');
    if (spec.modes && spec.modes.length > 1) {
      modeSel.innerHTML = spec.modes.map((m) => `<option value="${esc(m.key)}"${m.key === p.mode ? ' selected' : ''}>${esc(m.label)}</option>`).join('');
      $('ep-mode-wrap').classList.remove('hidden');
    } else $('ep-mode-wrap').classList.add('hidden');
    $('ep-examples').classList.toggle('hidden', !(spec.params || []).some((d) => d.type !== 'toggle'));
    $('ep-ai-q').placeholder = `Ask about this step of the ${s.title}…`;
    $('ep-student-note').classList.toggle('hidden', isTeacher);
    document.title = `${s.title} · Eduverse`;
    renderParams();
    recompute(false);
    if (stt.step) { step = Math.max(0, Math.min(steps.length - 1, Number(stt.step) - 1)); }
    st = dur(); renderSteps();
    requestAnimationFrame(fitCanvas);
  }

  // ─── Context for the Smart Board and the AI ───
  function paramSummary() {
    const out = {};
    (spec.params || []).filter((d) => !d.showIf || d.showIf(p)).forEach((d) => {
      const v = p[d.key];
      const label = d.type === 'select' ? ((d.options.find((o) => String(o.value) === String(v)) || {}).label || v) : d.type === 'toggle' ? (v ? 'On' : 'Off') : `${v}${d.unit ? ' ' + d.unit : ''}`;
      out[d.label] = label;
    });
    if (spec.modes && spec.modes.length > 1) out['Visualization mode'] = (spec.modes.find((m) => m.key === p.mode) || {}).label || p.mode;
    return out;
  }
  function snapshot() {
    const s = steps[step] || {};
    const readouts = {}; (calc.readouts || []).forEach((r) => { readouts[r.label] = r.value; });
    return {
      engine: 'engineering-physics', simulationType: CAT.simulationType, simulationSubtype: sim.subtype,
      department: ctx.departmentName, semester: ctx.semesterNumber, subject: ctx.subjectName, subjectCode: ctx.subjectCode,
      unit: `Unit ${sim.unit} — ${sim.unitTitle}`, topic: sim.topic, simulation: sim.title, simulationId: sim.id,
      conceptualVisualization: Boolean(spec.conceptual), visualizationMode: p.mode || '',
      parameters: paramSummary(), step: step + 1, totalSteps: steps.length,
      currentStep: { title: s.title, explanation: s.text },
      currentState: Object.assign({}, readouts, calc.state || {}),
      formulas: (calc.formulas || []).map((f) => `${f.name}: ${f.formula}; ${f.given ? 'given ' + f.given + '; ' : ''}${f.calc ? f.calc + '; ' : ''}result ${f.result} ${f.unit || ''}`.trim()),
      explanation: calc.explain || {},
    };
  }
  function schedulePost() { clearTimeout(postTimer); postTimer = setTimeout(postState, 120); }
  function postState() {
    if (!sim || window.parent === window) return;
    try { window.parent.postMessage({ type: 'EDUVERSE_SIM_STATE', context: snapshot() }, window.location.origin); } catch (e) { /* ignore */ }
  }
  function getToken() { try { return localStorage.getItem('eduverse_token') || sessionStorage.getItem('token') || ''; } catch (e) { return ''; } }
  async function askAI() {
    if (!sim) return;
    const snap = snapshot();
    const question = $('ep-ai-q').value.trim() || `Explain step ${snap.step} of the ${sim.title}: ${snap.currentStep.title}`;
    const selection = { type: 'Engineering Physics simulation state', content: JSON.stringify(snap).slice(0, 7500), source: 'ep-simulation' };
    const answer = $('ep-ai-answer');
    if (embedded) {
      window.parent.postMessage({ type: 'EDUVERSE_SIM_ASK_AI', question, selection, context: snap }, window.location.origin);
      answer.textContent = 'Opened the Smart Board AI panel with this step and state.'; answer.classList.remove('hidden'); return;
    }
    if (!ctx.subjectId) { toast('Open this simulation from the Engineering Physics subject workspace to ask the subject AI.'); return; }
    $('ep-ask-ai').disabled = true; answer.classList.remove('hidden'); answer.textContent = 'Thinking about this step…';
    try {
      const token = getToken();
      const res = await fetch('/api/v1/ai/query', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ subjectId: ctx.subjectId, question, chapter: sim.unit, topic: sim.topic, boardContext: { subjectId: ctx.subjectId, departmentId: ctx.departmentId, semesterId: ctx.semesterId, currentTopic: sim.topic, currentLesson: sim.title, selectedObjectType: selection.type, selectedObjectContent: selection.content } }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || 'AI could not answer right now.');
      const r = payload.data || payload; answer.textContent = [r.directAnswer, r.explanation, r.additionalExplanation].filter(Boolean).join('\n\n') || r.answer || 'No answer was returned.';
    } catch (e) { answer.textContent = e.message || 'Could not contact the AI service.'; }
    finally { $('ep-ask-ai').disabled = false; }
  }
  function configFor() { return { defaultParameters: Object.assign({}, p), visualizationMode: p.mode || '' }; }
  function launchBoard(id) {
    const s = CAT.get(id || (sim && sim.id)); if (!s) return;
    const same = sim && sim.id === s.id;
    const context = { topic: s.topic, category: s.id, config: same ? configFor() : {}, state: same ? { step: step + 1, mode: p.mode || '' } : {} };
    if (window.parent !== window) window.parent.postMessage({ type: 'EDUVERSE_SIM_LAUNCH_SMARTBOARD', simKey: s.id, title: s.title, context }, window.location.origin);
    else {
      const q = new URLSearchParams({ subjectId: ctx.subjectId, subjectName: ctx.subjectName, subjectCode: ctx.subjectCode, departmentName: ctx.departmentName, semesterNumber: ctx.semesterNumber, role: ctx.role, preset: s.id, title: s.title, topic: s.topic, config: JSON.stringify(context.config), state: JSON.stringify(context.state) });
      window.location.href = `index.html?${q.toString()}`;
    }
  }
  function publish() {
    if (!sim || !isTeacher || window.parent === window) return;
    $('ep-publish').disabled = true;
    window.parent.postMessage({ type: 'EDUVERSE_SIM_PUBLISH', simKey: sim.id, title: sim.title, unit: sim.unit, topic: sim.topic, config: Object.assign({ simulationType: CAT.simulationType, simulationSubtype: sim.subtype }, configFor(), { steps: steps.map((s) => s.title) }) }, window.location.origin);
    setTimeout(() => { $('ep-publish').disabled = false; }, 2500);
  }

  // ─── Wire up ───
  function init() {
    if (embedded && locked) document.body.classList.add('ep-board');
    if (preview) document.body.classList.add('ep-preview');
    canvas = $('ep-canvas'); g = canvas.getContext('2d');
    wireCanvas();
    $('ep-play').addEventListener('click', () => { if (playing) pause(); else play(); });
    $('ep-prev').addEventListener('click', () => { pause(); goStep(step - 1, true); });
    $('ep-next').addEventListener('click', () => { pause(); goStep(step + 1, true); });
    $('ep-reset').addEventListener('click', reset);
    document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
    $('ep-mode').addEventListener('change', () => { p.mode = $('ep-mode').value; renderParams(); recompute(true); });
    $('ep-examples').addEventListener('click', generateExample);
    $('ep-reset-params').addEventListener('click', resetParams);
    $('ep-toggle-formula').addEventListener('click', () => { showFormula = !showFormula; applyPanels(); });
    $('ep-toggle-explain').addEventListener('click', () => { showExplain = !showExplain; applyPanels(); });
    $('ep-library-btn').addEventListener('click', showLibrary);
    $('ep-launch-board').addEventListener('click', () => launchBoard());
    $('ep-publish').addEventListener('click', publish);
    $('ep-ask-ai').addEventListener('click', askAI);
    $('ep-rot-l').addEventListener('click', () => { view.yaw -= 0.35; draw(); });
    $('ep-rot-r').addEventListener('click', () => { view.yaw += 0.35; draw(); });
    $('ep-zoom-in').addEventListener('click', () => zoom(1.15));
    $('ep-zoom-out').addEventListener('click', () => zoom(1 / 1.15));
    $('ep-view-reset').addEventListener('click', () => { view = { yaw: -0.6, pitch: 0.42, zoom: 1 }; autoRotate = false; $('ep-auto-rot').classList.remove('active'); draw(); });
    $('ep-auto-rot').addEventListener('click', () => { autoRotate = !autoRotate; $('ep-auto-rot').classList.toggle('active', autoRotate); ensureLoop(); });
    $('ep-fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('ep-app').requestFullscreen(); } catch (e) { toast('Full screen is not available here.'); } });
    document.addEventListener('keydown', (e) => {
      if (!sim || /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return;
      if (e.key === 'ArrowRight') { pause(); goStep(step + 1, true); } else if (e.key === 'ArrowLeft') { pause(); goStep(step - 1, true); } else if (e.key === ' ') { e.preventDefault(); if (playing) pause(); else play(); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    window.addEventListener('resize', fitCanvas);
    if (window.ResizeObserver) new ResizeObserver(fitCanvas).observe($('ep-canvas-wrap'));
    window.addEventListener('message', (e) => {
      if (e.origin !== window.location.origin || !e.data || e.data.type !== 'EDUVERSE_SIM_PUBLISH_RESULT') return;
      toast(e.data.ok ? `Published — students now start from these settings.` : (e.data.message || 'Could not publish.'));
    });
    setSpeed(1); applyPanels();
    renderLibrary();
    const id = params.get('sim') || params.get('simulationId') || params.get('category') || '';
    if (id && CAT.get(id)) openSim(id, false); else showLibrary();
  }
  function applyPanels() {
    $('ep-formula-card').classList.toggle('hidden', !showFormula);
    $('ep-explain-card').classList.toggle('hidden', !showExplain);
    $('ep-bottom').classList.toggle('hidden', !showFormula && !showExplain);
    document.querySelector('.ep-layout').classList.toggle('no-right', !showFormula && !showExplain);
    $('ep-toggle-formula').classList.toggle('active', showFormula); $('ep-toggle-formula').setAttribute('aria-pressed', String(showFormula));
    $('ep-toggle-explain').classList.toggle('active', showExplain); $('ep-toggle-explain').setAttribute('aria-pressed', String(showExplain));
    requestAnimationFrame(fitCanvas);
  }

  window.EPEngine = {
    getPng: () => { try { return canvas.toDataURL('image/png'); } catch (e) { return ''; } },
    snapshot: () => (sim ? snapshot() : null),
    // test hooks
    _state: () => ({ sim: sim && sim.id, step, steps: steps.length, st, t, playing, p: Object.assign({}, p), calc }),
    _open: (id) => openSim(id, true),
    _set: (key, v) => { const d = spec.params.find((x) => x.key === key); if (d) setParam(d, v, true); else { p[key] = v; recompute(true); } },
    _goto: (i) => { pause(); goStep(i, false); },
    _drawAt: (i, stv, tv) => { step = i; st = stv; t = tv; draw(); },
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
