'use strict';

/*
 * Computer Networks simulation engine (U21CSG05).
 * One page, 35 simulations. Standalone it shows the library (Unit → Topic →
 * Simulation) or a preview; inside the Smart Board (embedded=1&lock=1) it runs
 * one simulation full-screen with large touch controls and reports the
 * current step and state to the board (for the AI assistant).
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  const $ = (id) => document.getElementById(id);
  const CAT = window.EduverseCNCatalog;
  const SC = window.CNScenarios || {};
  const embedded = params.get('embedded') === '1';
  const locked = params.get('lock') === '1';
  const preview = params.get('preview') === '1';
  const ctx = {
    subjectId: params.get('subjectId') || '', subjectName: params.get('subjectName') || CAT.subject.name,
    subjectCode: params.get('subjectCode') || CAT.subject.code, departmentId: params.get('departmentId') || '',
    departmentName: params.get('departmentName') || 'Information Technology', semesterId: params.get('semesterId') || '',
    semesterNumber: params.get('semesterNumber') || String(CAT.subject.semester), role: (params.get('role') || 'teacher').toLowerCase(),
  };
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const parseJson = (v) => { try { const o = JSON.parse(v || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };

  let sim = null; let spec = null; let inputs = {}; let view = 'basic'; let frames = []; let cursor = 0; let timer = null; let toastTimer = null; let infos = [];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function toast(msg) { const t = $('cn-toast'); t.textContent = msg; t.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('visible'), 3200); }
  function speed() { return Number($('cn-speed').value || 1); }

  // ─── Library (Unit → Topic → Simulation) ───
  function renderLibrary() {
    const lib = $('cn-library');
    lib.innerHTML = CAT.units.map((u) => {
      const sims = CAT.simulations.filter((s) => s.unit === u.unit);
      return `<section class="cn-unit"><h2><span>Unit ${u.unit}</span> ${esc(u.title)} <small>${sims.length} simulations</small></h2><div class="cn-grid">` +
        sims.map((s) =>
          `<article class="cn-sim-card"><div class="cn-sim-icon">${s.icon}</div><div class="cn-sim-body"><span class="cn-sim-topic">${esc(s.topic)}</span><h4>${esc(s.title)}</h4><p>${esc(s.description)}</p>` +
          `<div class="cn-sim-actions"><button type="button" class="cn-btn" data-open="${s.id}">Preview</button>${embedded ? '' : `<button type="button" class="cn-btn cn-btn-primary" data-board="${s.id}">🖥 Launch Smart Board</button>`}</div></div></article>`).join('') + '</div></section>';
    }).join('');
    lib.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openSim(b.dataset.open, true)));
    lib.querySelectorAll('[data-board]').forEach((b) => b.addEventListener('click', () => launchBoard(b.dataset.board)));
  }
  function showLibrary() {
    stop(); sim = null;
    $('cn-library').classList.remove('hidden'); $('cn-player').classList.add('hidden');
    $('cn-library-btn').classList.add('hidden'); $('cn-launch-board').classList.add('hidden');
    $('cn-title').textContent = 'Computer Networks Simulations';
    $('cn-subtitle').textContent = `${ctx.subjectCode} · ${CAT.simulations.length} interactive simulations in 5 units`;
    $('cn-crumbs').textContent = `Semester ${ROMAN[Number(ctx.semesterNumber)] || ctx.semesterNumber} › ${ctx.subjectName} › Simulations`;
    document.title = 'Computer Networks Simulations · Eduverse';
  }

  // ─── Inputs form ───
  function visibleInputs() { return (spec.inputs || []).filter((i) => !i.showIf || i.showIf(inputs)); }
  function renderInputs() {
    const form = $('cn-inputs');
    const list = visibleInputs();
    if (!list.length) { form.innerHTML = '<p class="cn-hint">This simulation has no inputs — just step through it.</p>'; $('cn-apply').classList.add('hidden'); return; }
    $('cn-apply').classList.remove('hidden');
    form.innerHTML = list.map((i) => {
      const id = `cn-in-${i.key}`; const v = inputs[i.key];
      if (i.type === 'select') return `<label class="cn-field" for="${id}">${esc(i.label)}<select id="${id}" data-key="${i.key}">${i.options.map(([val, lab]) => `<option value="${esc(val)}"${String(v) === String(val) ? ' selected' : ''}>${esc(lab)}</option>`).join('')}</select></label>`;
      if (i.type === 'checkbox') return `<label class="cn-field cn-check" for="${id}"><span>${esc(i.label)}</span><input id="${id}" type="checkbox" data-key="${i.key}"${v ? ' checked' : ''}></label>`;
      return `<label class="cn-field" for="${id}">${esc(i.label)}<input id="${id}" data-key="${i.key}" type="${i.type === 'number' ? 'number' : 'text'}" value="${esc(v)}"${i.max && i.type !== 'number' ? ` maxlength="${i.max}"` : ''}${i.type === 'number' && i.min != null ? ` min="${i.min}"` : ''}${i.type === 'number' && i.max != null ? ` max="${i.max}"` : ''}>${i.help ? `<small>${esc(i.help)}</small>` : ''}</label>`;
    }).join('');
    form.querySelectorAll('select,input[type=checkbox]').forEach((el) => el.addEventListener('change', () => { readInputs(); renderInputs(); apply(); }));
    form.querySelectorAll('input:not([type=checkbox])').forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); readInputs(); apply(); } }));
  }
  function readInputs() {
    $('cn-inputs').querySelectorAll('[data-key]').forEach((el) => {
      const i = spec.inputs.find((x) => x.key === el.dataset.key); if (!i) return;
      inputs[i.key] = i.type === 'checkbox' ? el.checked : i.type === 'number' ? (el.value === '' ? i.default : Number(el.value)) : el.value;
    });
  }
  function apply(keepStep) {
    const prevCursor = cursor;
    try {
      const built = spec.build(Object.assign({}, inputs), { advanced: view === 'advanced' });
      if (!Array.isArray(built) || !built.length) throw new Error('Nothing to show for these inputs.');
      frames = built; cursor = keepStep ? Math.min(prevCursor, frames.length - 1) : 0; stop(); render();
      return true;
    } catch (err) { toast(err.message || 'Please check the inputs.'); return false; }
  }

  // ─── Player ───
  function openSim(id, fromLibrary) {
    const s = CAT.get(id);
    if (!s || !SC[id]) { toast('Simulation not found.'); showLibrary(); return; }
    sim = s; spec = SC[id];
    inputs = {}; (spec.inputs || []).forEach((i) => { inputs[i.key] = i.default; });
    const cfg = parseJson(params.get('config'));
    if (!fromLibrary) (spec.inputs || []).forEach((i) => { if (cfg[i.key] != null) inputs[i.key] = cfg[i.key]; });
    const st = fromLibrary ? {} : parseJson(params.get('state'));
    if (st.view === 'advanced') setView('advanced', true);
    $('cn-library').classList.add('hidden'); $('cn-player').classList.remove('hidden');
    $('cn-library-btn').classList.toggle('hidden', locked);
    $('cn-launch-board').classList.toggle('hidden', embedded && locked);
    $('cn-title').textContent = s.title; $('cn-sim-name').textContent = s.title;
    $('cn-subtitle').textContent = s.description;
    $('cn-crumbs').textContent = `Semester ${ROMAN[Number(ctx.semesterNumber)] || ctx.semesterNumber} › ${ctx.subjectName} › Unit ${s.unit} — ${s.unitTitle} › ${s.topic}`;
    $('cn-topic-note').textContent = `Unit ${s.unit} · ${s.topic}`;
    $('cn-ai-q').placeholder = `Ask about this step of the ${s.title}…`;
    document.title = `${s.title} · Eduverse`;
    renderInputs();
    if (apply() && st.step) { cursor = Math.max(0, Math.min(frames.length - 1, Number(st.step) - 1)); render(); }
  }
  function currentFrame() { return frames[cursor] || { title: '', why: '', scene: [], state: {}, adv: {} }; }
  function render() {
    const f = currentFrame();
    const out = window.CNRender.render({ scene: f.scene, speed: speed(), advanced: view === 'advanced', label: sim.title });
    infos = out.infos;
    const scene = $('cn-scene'); scene.innerHTML = out.svg;
    scene.querySelectorAll('[data-info]').forEach((el) => el.addEventListener('click', () => inspect(infos[Number(el.dataset.info)])));
    $('cn-what').textContent = f.title || '—'; $('cn-why').textContent = f.why || '—';
    $('cn-next-text').textContent = f.next || (cursor < frames.length - 1 ? 'Press Next step.' : 'Simulation complete — change the inputs and apply to try another case.');
    const entries = Object.entries(f.state || {}).concat(view === 'advanced' ? Object.entries(f.adv || {}) : []);
    $('cn-state').innerHTML = entries.length ? entries.map(([k, v]) => `<div class="${view === 'advanced' && f.adv && k in f.adv && !(k in (f.state || {})) ? 'adv' : ''}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('') : '<p class="cn-hint">No state for this step.</p>';
    $('cn-step-label').textContent = `Step ${cursor + 1} of ${frames.length}`;
    $('cn-progress-fill').style.width = `${frames.length > 1 ? (100 * cursor) / (frames.length - 1) : 100}%`;
    $('cn-prev').disabled = cursor === 0; $('cn-next').disabled = cursor >= frames.length - 1;
    postState();
  }
  function inspect(item) {
    if (!item) return;
    $('cn-inspector').innerHTML = `<h3>${esc(item.title)}</h3><p>${esc(item.body).replace(/\n/g, '<br>')}</p>`;
  }
  function moveTo(i) { cursor = Math.max(0, Math.min(frames.length - 1, i)); render(); if (cursor >= frames.length - 1) stop(); }
  function stop() { if (timer) clearInterval(timer); timer = null; $('cn-play').disabled = false; $('cn-pause').disabled = true; }
  function play() {
    if (cursor >= frames.length - 1) moveTo(0);
    stop(); $('cn-play').disabled = true; $('cn-pause').disabled = false;
    timer = setInterval(() => { if (cursor >= frames.length - 1) { stop(); return; } moveTo(cursor + 1); }, Math.max(700, Math.round(1700 / speed())));
  }
  function setView(v, silent) {
    view = v;
    $('cn-view-basic').classList.toggle('active', v === 'basic'); $('cn-view-adv').classList.toggle('active', v === 'advanced');
    $('cn-view-basic').setAttribute('aria-pressed', String(v === 'basic')); $('cn-view-adv').setAttribute('aria-pressed', String(v === 'advanced'));
    if (!silent && spec) apply(true);
  }

  // ─── Context for the Smart Board and the AI ───
  function snapshot() {
    const f = currentFrame();
    return {
      engine: 'computer-networks', department: ctx.departmentName, semester: ctx.semesterNumber, subject: ctx.subjectName, subjectCode: ctx.subjectCode,
      unit: sim ? `Unit ${sim.unit} — ${sim.unitTitle}` : '', topic: sim ? sim.topic : '', simulation: sim ? sim.title : '', simulationId: sim ? sim.id : '',
      view, inputs, step: cursor + 1, totalSteps: frames.length,
      currentStep: { whatIsHappening: f.title, why: f.why, next: f.next },
      currentState: Object.assign({}, f.state || {}, view === 'advanced' ? f.adv || {} : {}),
    };
  }
  function postState() {
    if (!embedded || !sim) return;
    try { window.parent.postMessage({ type: 'EDUVERSE_SIM_STATE', context: snapshot() }, window.location.origin); } catch (e) { /* ignore */ }
  }
  function getToken() { try { return localStorage.getItem('eduverse_token') || sessionStorage.getItem('token') || ''; } catch (e) { return ''; } }
  async function askAI() {
    if (!sim) return;
    const snap = snapshot();
    const question = $('cn-ai-q').value.trim() || `Explain step ${snap.step} of the ${sim.title}: ${snap.currentStep.whatIsHappening}`;
    const selection = { type: 'Computer Networks simulation state', content: JSON.stringify(snap).slice(0, 7500), source: 'cn-simulation' };
    const answer = $('cn-ai-answer');
    if (embedded) {
      window.parent.postMessage({ type: 'EDUVERSE_SIM_ASK_AI', question, selection, context: snap }, window.location.origin);
      answer.textContent = 'Opened the Smart Board AI panel with this step and state.'; answer.classList.remove('hidden'); return;
    }
    if (!ctx.subjectId) { toast('Open this simulation from the Computer Networks subject workspace to ask the subject AI.'); return; }
    $('cn-ask-ai').disabled = true; answer.classList.remove('hidden'); answer.textContent = 'Thinking about this step…';
    try {
      const token = getToken();
      const res = await fetch('/api/v1/ai/query', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ subjectId: ctx.subjectId, question, chapter: sim.unit, topic: sim.topic, boardContext: { subjectId: ctx.subjectId, departmentId: ctx.departmentId, semesterId: ctx.semesterId, currentTopic: sim.topic, currentLesson: sim.title, selectedObjectType: selection.type, selectedObjectContent: selection.content } }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || 'AI could not answer right now.');
      const r = payload.data || payload; answer.textContent = [r.directAnswer, r.explanation, r.additionalExplanation].filter(Boolean).join('\n\n') || r.answer || 'No answer was returned.';
    } catch (e) { answer.textContent = e.message || 'Could not contact the AI service.'; }
    finally { $('cn-ask-ai').disabled = false; }
  }
  function launchBoard(id) {
    const s = CAT.get(id || (sim && sim.id)); if (!s) return;
    const st = sim && sim.id === s.id ? { step: cursor + 1, view } : {};
    const context = { topic: s.topic, category: s.id, config: sim && sim.id === s.id ? inputs : {}, state: st };
    if (window.parent !== window) window.parent.postMessage({ type: 'EDUVERSE_SIM_LAUNCH_SMARTBOARD', simKey: s.id, title: s.title, context }, window.location.origin);
    else {
      const q = new URLSearchParams({ subjectId: ctx.subjectId, subjectName: ctx.subjectName, subjectCode: ctx.subjectCode, departmentName: ctx.departmentName, semesterNumber: ctx.semesterNumber, role: ctx.role, preset: s.id, title: s.title, topic: s.topic, config: JSON.stringify(context.config), state: JSON.stringify(st) });
      window.location.href = `index.html?${q.toString()}`;
    }
  }

  // ─── Wire up ───
  function init() {
    if (embedded && locked) document.body.classList.add('cn-board');
    if (preview) document.body.classList.add('cn-preview');
    $('cn-play').addEventListener('click', play); $('cn-pause').addEventListener('click', stop);
    $('cn-prev').addEventListener('click', () => { stop(); moveTo(cursor - 1); }); $('cn-next').addEventListener('click', () => { stop(); moveTo(cursor + 1); });
    $('cn-reset').addEventListener('click', () => { stop(); moveTo(0); });
    $('cn-speed').addEventListener('change', () => { if (timer) play(); });
    $('cn-apply').addEventListener('click', () => { readInputs(); apply(); });
    $('cn-view-basic').addEventListener('click', () => setView('basic')); $('cn-view-adv').addEventListener('click', () => setView('advanced'));
    $('cn-library-btn').addEventListener('click', showLibrary);
    $('cn-launch-board').addEventListener('click', () => launchBoard());
    $('cn-ask-ai').addEventListener('click', askAI);
    $('cn-fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('cn-app').requestFullscreen(); } catch (e) { toast('Full screen is not available here.'); } });
    document.addEventListener('keydown', (e) => {
      if (!sim || /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return;
      if (e.key === 'ArrowRight') { stop(); moveTo(cursor + 1); } else if (e.key === 'ArrowLeft') { stop(); moveTo(cursor - 1); } else if (e.key === ' ') { e.preventDefault(); if (timer) stop(); else play(); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    renderLibrary();
    const id = params.get('sim') || params.get('category') || '';
    if (id && CAT.get(id)) openSim(id, false); else showLibrary();
  }
  window.CNEngine = { getSvg: () => ($('cn-scene').querySelector('svg') || {}).outerHTML || '', snapshot: () => (sim ? snapshot() : null) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
