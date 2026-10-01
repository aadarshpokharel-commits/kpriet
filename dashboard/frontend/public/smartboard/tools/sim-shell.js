'use strict';

/*
 * Eduverse SimulationShell — one responsive, single-screen workspace for every simulation engine.
 *
 *   SimulationShell
 *    ├── header      (compact: back · subject · unit/topic · simulation name · actions)
 *    ├── body        (dock A | STAGE | dock B)   ← the stage always gets the largest share
 *    │     docks = tabbed panels (parameters, steps, formula, explanation, state, AI …)
 *    └── controls    (previous · play/pause · next · reset · speed)
 *
 * The engines keep drawing only their own content; the shell only re-arranges their existing DOM
 * nodes (ids, listeners and state are untouched) and owns sizing, docking, full-screen/focus mode,
 * the phone bottom-sheet and Smart Board proportions. A new engine only needs an adapter below.
 *
 * Layouts (from the real viewport, never from physical inch size):
 *   'column' – phones / portrait tablets: header, stage, controls, bottom-sheet dock
 *   'row'    – landscape tablets, desktops, Smart Boards: dock | stage (+ second dock when there is spare width)
 */
(function () {
  const ADAPTERS = {
    // Engineering Physics / Graphics / Mathematics (shared canvas engine)
    ep: {
      root: '#ep-app', header: '.ep-header', title: '#ep-title', actions: '.ep-header-actions', player: '#ep-player',
      stage: ['.ep-center'], controls: ['.ep-controls'], aspect: 1000 / 560,
      stageChrome: ['.ep-stage-top', '.ep-banner', '.ep-warn'],
      panels: [
        { label: 'Inputs', icon: '🎛', el: () => document.querySelector('#ep-params')?.closest('.ep-card'), group: 'a' },
        { label: 'Steps', icon: '🪜', el: () => document.querySelector('#ep-steps')?.closest('.ep-card'), group: 'a' },
        { label: 'Formula', icon: 'ƒ', el: '#ep-formula-card', group: 'b', force: true },
        { label: 'Explain', icon: '💬', el: '#ep-explain-card', group: 'b', force: true },
        { label: 'Challenge', icon: '🏆', el: '#ep-challenge-card', group: 'a' },
        { label: 'AI', icon: '🤖', el: () => document.querySelector('.ep-card.ep-ai'), group: 'a' },
      ],
      hide: ['#ep-toggle-formula', '#ep-toggle-explain', '.ep-layout'],
      fullscreen: ['#ep-fullscreen'],
    },
    // Computer Networks
    cn: {
      root: '#cn-app', header: '.cn-header', title: '#cn-title', actions: '.cn-header-actions', player: '#cn-player',
      stage: ['.cn-center'], controls: ['.cn-toolbar'], aspect: 0,
      stageChrome: ['.cn-stage-head', '.cn-explain'],
      panels: [
        { label: 'Setup', icon: '🎛', el: '.cn-setup', group: 'a' },
        { label: 'State', icon: '📊', el: () => document.querySelector('#cn-state-h')?.closest('.cn-card'), group: 'b' },
        { label: 'Inspector', icon: '🔍', el: () => document.querySelector('#cn-insp-h')?.closest('.cn-card'), group: 'b' },
        { label: 'AI', icon: '🤖', el: '.cn-card.cn-ai', group: 'a' },
      ],
      hide: ['.cn-layout'],
      fullscreen: ['#cn-fullscreen'],
    },
    // Data Structures & Algorithms
    dsa: {
      root: '#dsa-app', header: '.dsa-header', title: '#dsa-title', actions: '.dsa-header-actions', player: null,
      stage: ['.dsa-visual-card'], controls: ['.dsa-toolbar'], aspect: 0,
      stageChrome: ['.dsa-visual-card > .dsa-card-heading', '.dsa-step-progress'],
      panels: [
        { label: 'Input', icon: '🎛', el: '#dsa-input-card', group: 'a' },
        { label: 'Step', icon: '💬', el: '.dsa-operation-card', group: 'b', force: true },
        { label: 'Code', icon: '⌨', el: '#dsa-pseudocode-card', group: 'a', force: true },
        { label: 'Complexity', icon: '⏱', el: '#dsa-complexity-card', group: 'b', force: true },
        { label: 'AI', icon: '🤖', el: '.dsa-ai-card', group: 'a' },
      ],
      hide: ['.dsa-layout'],
      fullscreen: ['#dsa-fullscreen'],
    },
    // Operating Systems
    os: {
      root: '#os-app', header: '.os-master-bar', title: '.os-brand-title', actions: ['.os-bar-selectors', '.os-bar-actions'], player: null,
      stage: ['.os-stage-column'], controls: ['.os-bar-playback', '.os-step-pill'], aspect: 0,
      stageChrome: ['.os-card-header-compact', '.os-explanation-card'],
      panels: [{ label: 'Panel', el: '.os-dock-column', group: 'a', force: true, bare: true }],
      hide: ['.os-workspace'],
      fullscreen: ['#os-fullscreen'],
    },
    // Problem Solving and C Programming (code + memory are the stage)
    c: {
      root: '#c-app', header: '.c-master-bar', title: '.c-brand-title', actions: ['.c-bar-selectors', '.c-bar-actions'], player: null,
      stage: ['.c-code-column', '.c-stage-column'], controls: ['.c-bar-playback', '.c-step-pill'], aspect: 0, stageCols: true,
      stageChrome: ['.c-card-header-compact', '.c-explanation-card'],
      panels: [{ label: 'Panel', el: '.c-dock-column', group: 'a', force: true, bare: true }],
      hide: ['.c-workspace'],
      fullscreen: ['#c-fullscreen', '#fullscreen-btn'],
    },
  };

  const $$ = (sel) => (typeof sel === 'function' ? [sel()].filter(Boolean) : [...document.querySelectorAll(sel)]);
  const one = (sel) => $$(sel)[0] || null;
  const embedded = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const qs = new URLSearchParams(location.search);

  function pickAdapter() { for (const [key, a] of Object.entries(ADAPTERS)) if (document.querySelector(a.root)) return [key, a]; return [null, null]; }

  function el(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  function build() {
    const [key, A] = pickAdapter(); if (!A || document.documentElement.classList.contains('sim-shell')) return;
    const root = one(A.root); const header = one(A.header); if (!root || !header) return;
    const html = document.documentElement;
    html.classList.add('sim-shell'); html.dataset.engine = key; root.classList.add('shell-root'); header.classList.add('shell-header');

    // ── main area: [body][controls] inside the engine's player section (or a new one)
    let main = A.player ? one(A.player) : null;
    if (!main) { main = el('section', 'shell-main-auto'); header.after(main); }
    main.classList.add('shell-main');
    const body = el('div', 'shell-body'); const stage = el('section', 'shell-stage' + (A.stageCols ? ' shell-stage-cols' : ''));
    stage.setAttribute('data-shell', 'stage'); stage.setAttribute('aria-label', 'Simulation');
    const dockA = el('aside', 'shell-dock shell-dock-a'); const dockB = el('aside', 'shell-dock shell-dock-b');
    dockA.setAttribute('aria-label', 'Simulation panels'); dockB.setAttribute('aria-label', 'Formula, state and explanation');
    const controls = el('div', 'shell-controls'); controls.setAttribute('role', 'toolbar'); controls.setAttribute('aria-label', 'Simulation controls');
    body.append(dockA, stage, dockB); main.prepend(body); main.append(controls);

    A.stage.forEach((s) => $$(s).forEach((n) => stage.append(n)));
    A.controls.forEach((s) => $$(s).forEach((n) => { n.classList.add('shell-ctl'); controls.append(n); }));
    A.stageChrome.forEach((s) => $$(s).forEach((n) => n.classList.add('shell-chrome')));

    // ── icon-first control labels (labels hide on phones; engines may rewrite button text → re-wrap)
    const ICON = /^\s*([^\p{L}\p{N}\s]+)\s*(\p{L}.*?)\s*$/u, TRAIL = /^\s*(\p{L}.*?)\s*([^\p{L}\p{N}\s.]+)\s*$/u;
    const wrapLabel = (b) => {
      if (b.querySelector('.shell-lbl') || b.children.length) return;
      const t = b.textContent; let m = ICON.exec(t); let ico, lbl;
      if (m) { ico = m[1]; lbl = m[2]; } else if ((m = TRAIL.exec(t))) { ico = m[2]; lbl = m[1]; } else return;
      b.innerHTML = `<span class="shell-ico" aria-hidden="true">${ico}</span><span class="shell-lbl">${lbl.replace(/</g, '&lt;')}</span>`;
      if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', lbl); if (!b.title) b.title = lbl;
    };
    const wrapAll = () => controls.querySelectorAll('button').forEach(wrapLabel);
    new MutationObserver(() => wrapAll()).observe(controls, { childList: true, subtree: true, characterData: true });

    // ── tabbed docks
    const panels = [];
    A.panels.forEach((p) => { const n = one(p.el); if (!n) return; n.classList.add('shell-panel'); if (p.bare) n.classList.add('shell-panel-bare'); panels.push({ ...p, node: n }); });
    const mkDock = (dock) => {
      const tabs = el('div', 'shell-tabs'); tabs.setAttribute('role', 'tablist');
      const pane = el('div', 'shell-pane');
      const sheet = el('button', 'shell-sheet-btn', '⤢'); sheet.type = 'button'; sheet.title = 'Expand panel'; sheet.setAttribute('aria-label', 'Expand panel');
      sheet.addEventListener('click', () => { const open = !html.classList.contains('shell-sheet-open'); html.classList.toggle('shell-sheet-open', open); sheet.textContent = open ? '⤡' : '⤢'; sheet.setAttribute('aria-label', open ? 'Collapse panel' : 'Expand panel'); relayout(); });
      const hideBtn = el('button', 'shell-dock-hide', '⟨'); hideBtn.type = 'button'; hideBtn.title = 'Hide panels (bigger simulation)'; hideBtn.setAttribute('aria-label', 'Hide panels');
      hideBtn.addEventListener('click', () => { html.classList.toggle('shell-docks-collapsed'); relayout(); });
      const bar = el('div', 'shell-tabbar'); bar.append(tabs, sheet, hideBtn);
      dock.append(bar, pane); return { dock, tabs, pane, active: null };
    };
    const DA = mkDock(dockA), DB = mkDock(dockB);
    const showBtn = el('button', 'shell-dock-show', '⟩ Panels'); showBtn.type = 'button'; showBtn.setAttribute('aria-label', 'Show panels');
    showBtn.addEventListener('click', () => { html.classList.remove('shell-docks-collapsed'); relayout(); });
    stage.append(showBtn);

    let split = false;
    const available = (p) => p.force || !(p.node.classList.contains('hidden') || p.node.hidden);
    function renderDock(D, list) {
      D.tabs.innerHTML = '';
      list.forEach((p) => { if (p.node.parentNode !== D.pane) D.pane.append(p.node); });
      const avail = list.filter(available);
      if (!avail.includes(D.active)) D.active = avail[0] || null;
      const single = list.length === 1 && list[0].bare;
      D.dock.classList.toggle('shell-dock-bare', single);
      avail.forEach((p) => {
        const b = el('button', 'shell-tab' + (p === D.active ? ' active' : ''), `<span class="shell-tab-ico" aria-hidden="true">${p.icon || ''}</span><span class="shell-tab-lbl">${p.label}</span>`);
        b.type = 'button'; b.title = p.label; b.setAttribute('aria-label', p.label); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(p === D.active));
        b.addEventListener('click', () => { D.active = p; renderDocks(); try { sessionStorage.setItem('shell-tab-' + key + '-' + (D === DA ? 'a' : 'b'), p.label); } catch (e) { /* storage blocked */ } });
        D.tabs.append(b);
      });
      list.forEach((p) => p.node.classList.toggle('shell-active', p === D.active));
      // too many tabs for the dock width → icons for the inactive tabs, full label for the active one
      D.tabs.classList.remove('shell-tabs-icons');
      requestAnimationFrame(() => { if (D.tabs.scrollWidth > D.tabs.clientWidth + 2) D.tabs.classList.add('shell-tabs-icons'); });
      D.dock.classList.toggle('shell-empty', !avail.length);
    }
    function renderDocks() {
      const a = panels.filter((p) => !split || p.group !== 'b'); const b = split ? panels.filter((p) => p.group === 'b') : [];
      renderDock(DA, a); renderDock(DB, b);
      html.classList.toggle('shell-split', split && b.length > 0);
    }
    // restore remembered tabs (per viewer, per engine)
    try { ['a', 'b'].forEach((g) => { const lab = sessionStorage.getItem('shell-tab-' + key + '-' + g); const p = panels.find((x) => x.label === lab); if (p) (g === 'a' ? DA : DB).active = p; }); } catch (e) { /* storage blocked */ }
    // engines toggle 'hidden' on their own panels → keep the tab list in sync
    const mo = new MutationObserver(() => renderDocks());
    panels.forEach((p) => mo.observe(p.node, { attributes: true, attributeFilter: ['class', 'hidden'] }));

    // ── hide what the shell replaces
    A.hide.forEach((s) => $$(s).forEach((n) => n.classList.add('shell-hidden')));
    (A.fullscreen || []).forEach((s) => $$(s).forEach((n) => n.classList.add('shell-hidden')));

    // ── compact header additions: back, focus, overflow menu
    const lead = el('div', 'shell-lead');
    if (embedded || qs.get('preview') === '1' || history.length > 1) {
      const back = el('button', 'shell-back', '←'); back.type = 'button'; back.title = 'Back'; back.setAttribute('aria-label', 'Back');
      back.addEventListener('click', () => { if (embedded) window.parent.postMessage({ type: 'EDUVERSE_SIM_CLOSE' }, window.location.origin); else history.back(); });
      lead.append(back);
    }
    header.prepend(lead);
    const tools = el('div', 'shell-tools');
    const more = el('button', 'shell-more', '⋯'); more.type = 'button'; more.title = 'More actions'; more.setAttribute('aria-label', 'More actions'); more.setAttribute('aria-expanded', 'false');
    const focus = el('button', 'shell-focus-btn', '⛶'); focus.type = 'button'; focus.title = 'Full-screen simulation'; focus.setAttribute('aria-label', 'Full-screen simulation');
    tools.append(more, focus); header.append(tools);
    const menu = el('div', 'shell-menu'); menu.setAttribute('role', 'menu');
    const actionNodes = [].concat(A.actions).flatMap((s) => $$(s));
    actionNodes.forEach((n) => n.classList.add('shell-actions'));
    more.addEventListener('click', (e) => { e.stopPropagation(); const open = !html.classList.contains('shell-menu-open'); html.classList.toggle('shell-menu-open', open); more.setAttribute('aria-expanded', String(open)); });
    document.addEventListener('click', (e) => { if (html.classList.contains('shell-menu-open') && !e.target.closest('.shell-actions, .shell-more')) { html.classList.remove('shell-menu-open'); more.setAttribute('aria-expanded', 'false'); } });

    // ── full-screen / focus mode: maximum canvas + floating controls
    const exit = el('button', 'shell-exit', '✕ Exit full screen'); exit.type = 'button'; root.append(exit);
    const setFocus = async (on) => {
      html.classList.toggle('shell-focus', on); focus.textContent = on ? '🗗' : '⛶';
      try { if (on && !document.fullscreenElement && document.fullscreenEnabled) await document.documentElement.requestFullscreen(); else if (!on && document.fullscreenElement) await document.exitFullscreen(); } catch (e) { /* not allowed here – focus layout still applies */ }
      relayout();
    };
    focus.addEventListener('click', () => setFocus(!html.classList.contains('shell-focus')));
    exit.addEventListener('click', () => setFocus(false));
    document.addEventListener('fullscreenchange', () => { const on = Boolean(document.fullscreenElement); if (on !== html.classList.contains('shell-focus')) { html.classList.toggle('shell-focus', on); focus.textContent = on ? '🗗' : '⛶'; relayout(); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && html.classList.contains('shell-focus') && !document.fullscreenElement) setFocus(false); });

    // ── responsive sizing from the real viewport
    let raf = 0; let lastSig = '';
    function relayout() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vw = window.innerWidth, vh = window.innerHeight;
        const column = vw < 640 || (vw < 1300 && vh > vw * 1.1) || (vw < 900 && vh >= 500);
        const layout = column ? 'column' : 'row';
        const size = vw >= 3000 ? 'uhd' : vw >= 2300 ? 'qhd' : vw >= 1800 ? 'board' : vw >= 1100 ? 'desktop' : vw >= 700 ? 'tablet' : 'phone';
        // UI chrome (not the stage) grows gently on very large boards, the stage grows with the space
        const zoom = size === 'uhd' ? Math.min(1.75, Math.max(1.4, vh / 1350)) : size === 'qhd' ? Math.min(1.35, Math.max(1.15, vh / 1150)) : size === 'board' && vh >= 1000 ? 1.05 : 1;
        html.dataset.layout = layout; html.dataset.size = size; html.classList.toggle('shell-short', vh < 560);
        html.style.setProperty('--shell-zoom', String(Math.round(zoom * 100) / 100));
        html.style.setProperty('--shell-aspect', String(A.aspect || 16 / 9));
        const dockW = Math.round(Math.min(380, Math.max(236, vw * (size === 'desktop' || size === 'tablet' ? 0.2 : 0.17))) * zoom);
        html.style.setProperty('--shell-dock', dockW + 'px');
        // second dock only when the stage would otherwise have spare width (ultra-wide / very large boards)
        let wantSplit = false;
        if (layout === 'row' && !html.classList.contains('shell-docks-collapsed') && panels.some((p) => p.group === 'b')) {
          const stageH = Math.max(200, body.getBoundingClientRect().height || vh * 0.8);
          const need = (A.aspect ? stageH * A.aspect : stageH * 1.9) + dockW * 2 + 24;
          wantSplit = vw >= need && vw >= 1500;
        }
        const sig = `${layout}|${size}|${wantSplit}`;
        if (wantSplit !== split || sig !== lastSig) { split = wantSplit; lastSig = sig; }
        renderDocks();
        // ultra-wide: keep the composition centred instead of stretching everything
        const maxBody = layout === 'row' && A.aspect ? Math.round((body.getBoundingClientRect().height || vh) * A.aspect + dockW * (split ? 2 : 1) + 40) : 0;
        html.style.setProperty('--shell-max', layout === 'row' && vw / vh > 2.05 ? Math.max(maxBody, Math.round(vh * 2.3)) + 'px' : 'none');
        window.dispatchEvent(new Event('resize-shell'));
      });
    }
    // engines listen to window 'resize' → re-fit after our layout changes settle
    let fire = 0; const nudge = () => { clearTimeout(fire); fire = setTimeout(() => window.dispatchEvent(new Event('resize')), 30); };
    window.addEventListener('resize-shell', nudge);
    window.addEventListener('resize', (e) => { if (e.isTrusted) relayout(); });
    window.addEventListener('orientationchange', relayout);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', relayout);
    wrapAll(); renderDocks(); relayout();
    /** Engines can bring a panel to the front (e.g. Challenge mode opens the Challenge tab). */
    const activate = (label) => { const pnl = panels.find((x) => x.label === label); if (!pnl || !available(pnl)) return false; const D = split && pnl.group === 'b' ? DB : DA; D.active = pnl; renderDocks(); return true; };
    window.SimulationShell = { adapter: key, relayout, setFocus, activate, panels: () => panels.map((p) => p.label) };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
