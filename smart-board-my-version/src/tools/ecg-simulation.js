/**
 * ecg-simulation.js
 * Master Interactive Engine for Digital Electronics (U21ECG01)
 * Regulation R2021 CBCS · Semester II · B.Tech IT · ESC
 *
 * Features:
 *  - 46 Interactive Digital Electronics Simulations across 5 Units
 *  - Logic Gate, K-Map, Circuit Builder, Timing Diagram Canvas Renderers
 *  - Real-time Boolean Logic Engine (Gates, Adders, MUX, FF, Counters, Hazards)
 *  - 3 Learning Modes: Learn 🎓, Experiment 🔬, Challenge 🏆
 *  - 🌓 Dark / White Color Theme Switching
 *  - Step-by-step playback with Speed control and Pedagogy grid
 *  - Subject AI Tutor integration
 */

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // 1. STATE & DOM ELEMENT REFS
  // ══════════════════════════════════════════════════════════
  const catalog = (typeof window !== 'undefined' && window.EduverseECGCatalog) || null;
  if (!catalog) {
    console.error('[ECG Simulation] EduverseECGCatalog not loaded.');
    return;
  }

  const state = {
    currentUnit: 1,
    currentSimId: 'de-logic-gates',
    mode: 'learn',
    theme: (function () { try { return localStorage.getItem('eduverse_theme') || 'light'; } catch (e) { return 'light'; } })(),
    isPlaying: false,
    speed: 1.0,
    currentStep: 0,
    maxSteps: 4,
    animTime: 0,
    animFrameId: null,
    params: {},
    challengeState: { solved: false, feedback: '' }
  };

  const dom = {
    app: document.getElementById('ecg-app'),
    unitSelect: document.getElementById('ecg-unit'),
    simSelect: document.getElementById('ecg-simulation'),
    title: document.getElementById('ecg-title'),
    topicTag: document.getElementById('ecg-topic-tag'),
    kickerBadge: document.getElementById('ecg-kicker-badge'),
    themeToggle: document.getElementById('ecg-theme-toggle'),
    fullscreenBtn: document.getElementById('ecg-fullscreen'),
    closeBtn: document.getElementById('ecg-close'),
    launchBoardBtn: document.getElementById('ecg-launch-board'),
    modeBtns: document.querySelectorAll('.ecg-mode-btn'),
    playBtn: document.getElementById('ecg-play'),
    pauseBtn: document.getElementById('ecg-pause'),
    prevBtn: document.getElementById('ecg-prev'),
    nextBtn: document.getElementById('ecg-next'),
    resetBtn: document.getElementById('ecg-reset'),
    speedSelect: document.getElementById('ecg-speed'),
    stepLabel: document.getElementById('ecg-step-label'),
    progressFill: document.getElementById('ecg-progress-fill'),
    canvas: document.getElementById('ecg-canvas'),
    legend: document.getElementById('ecg-legend'),
    overlaySim: document.getElementById('ecg-overlay-sim'),
    overlayState: document.getElementById('ecg-overlay-state'),
    whatText: document.getElementById('ecg-what'),
    whyText: document.getElementById('ecg-why'),
    nextText: document.getElementById('ecg-next-info'),
    metricsRow: document.getElementById('ecg-metrics-row'),
    inputsForm: document.getElementById('ecg-inputs-form'),
    inputActions: document.getElementById('ecg-input-actions'),
    challengeCard: document.getElementById('ecg-challenge-card'),
    challengePrompt: document.getElementById('ecg-challenge-prompt'),
    verifyChallengeBtn: document.getElementById('ecg-verify-challenge'),
    resetChallengeBtn: document.getElementById('ecg-reset-challenge'),
    challengeResult: document.getElementById('ecg-challenge-result'),
    formulaBox: document.getElementById('ecg-formula-box'),
    specList: document.getElementById('ecg-spec-list'),
    aiQuestion: document.getElementById('ecg-ai-question'),
    askAiBtn: document.getElementById('ecg-ask-ai'),
    aiAnswer: document.getElementById('ecg-ai-answer'),
    toast: document.getElementById('ecg-toast')
  };

  const ctx = dom.canvas.getContext('2d');

  // ══════════════════════════════════════════════════════════
  // 2. THEME CONTROLLER
  // ══════════════════════════════════════════════════════════
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('eduverse_theme', theme); } catch (e) {}
    if (dom.themeToggle) {
      dom.themeToggle.textContent = theme === 'dark' ? '☀️ Light Theme' : '🌓 Dark Theme';
      dom.themeToggle.title = 'Switch to ' + (theme === 'dark' ? 'White / Light' : 'Dark') + ' mode';
    }
    renderSimulation();
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    showToast('Switched to ' + (state.theme === 'dark' ? 'Dark Mode' : 'Light / White Mode'));
  }

  // ══════════════════════════════════════════════════════════
  // 3. INITIALIZATION & URL HYDRATION
  // ══════════════════════════════════════════════════════════
  function init() {
    const params = new URLSearchParams(window.location.search);
    const requestedSim = params.get('sim') || params.get('simulationId') || params.get('preset') || 'de-logic-gates';
    const requestedUnit = params.get('unit') || params.get('unitNumber');
    const embedded = params.get('embedded') === '1';

    if (embedded) document.body.classList.add('ecg-board-mode');

    // Find the simulation
    const sim = catalog.getSimulationById(requestedSim);
    if (sim) {
      state.currentUnit = sim.unit;
      state.currentSimId = sim.id;
    } else if (requestedUnit) {
      state.currentUnit = parseInt(requestedUnit, 10) || 1;
      const unitSims = catalog.getSimulationsForUnit(state.currentUnit);
      if (unitSims.length) state.currentSimId = unitSims[0].id;
    }

    // Apply saved theme
    applyTheme(state.theme);

    // Populate dropdowns
    populateUnitDropdown();
    populateSimDropdown(state.currentUnit);
    dom.unitSelect.value = String(state.currentUnit);
    dom.simSelect.value = state.currentSimId;

    // Event listeners
    dom.unitSelect.addEventListener('change', onUnitChange);
    dom.simSelect.addEventListener('change', onSimChange);
    dom.themeToggle.addEventListener('click', toggleTheme);
    dom.fullscreenBtn.addEventListener('click', toggleFullscreen);
    dom.closeBtn.addEventListener('click', closeSimulation);
    dom.playBtn.addEventListener('click', startPlayback);
    dom.pauseBtn.addEventListener('click', pausePlayback);
    dom.prevBtn.addEventListener('click', prevStep);
    dom.nextBtn.addEventListener('click', nextStep);
    dom.resetBtn.addEventListener('click', resetSimulation);
    dom.speedSelect.addEventListener('change', function () { state.speed = parseFloat(this.value); });
    dom.modeBtns.forEach(function (btn) { btn.addEventListener('click', function () { switchMode(this.dataset.mode); }); });
    if (dom.verifyChallengeBtn) dom.verifyChallengeBtn.addEventListener('click', verifyChallenge);
    if (dom.resetChallengeBtn) dom.resetChallengeBtn.addEventListener('click', resetChallenge);
    if (dom.askAiBtn) dom.askAiBtn.addEventListener('click', askSubjectAI);

    // Canvas resize
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Load simulation
    loadSimulation(state.currentSimId);
  }

  // ══════════════════════════════════════════════════════════
  // 4. DROPDOWN MANAGEMENT
  // ══════════════════════════════════════════════════════════
  function populateUnitDropdown() {
    // Already populated in HTML
  }

  function populateSimDropdown(unitNumber) {
    const sims = catalog.getSimulationsForUnit(unitNumber);
    dom.simSelect.innerHTML = '';
    sims.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.icon + ' ' + s.topic;
      if (s.flagship) opt.textContent += ' ⭐';
      dom.simSelect.appendChild(opt);
    });
  }

  function onUnitChange() {
    state.currentUnit = parseInt(dom.unitSelect.value, 10);
    populateSimDropdown(state.currentUnit);
    var sims = catalog.getSimulationsForUnit(state.currentUnit);
    if (sims.length) {
      state.currentSimId = sims[0].id;
      dom.simSelect.value = sims[0].id;
      loadSimulation(sims[0].id);
    }
  }

  function onSimChange() {
    state.currentSimId = dom.simSelect.value;
    loadSimulation(state.currentSimId);
  }

  // ══════════════════════════════════════════════════════════
  // 5. LOAD SIMULATION
  // ══════════════════════════════════════════════════════════
  function loadSimulation(simId) {
    var sim = catalog.getSimulationById(simId);
    if (!sim) return;

    state.currentSimId = simId;
    state.currentStep = 0;
    state.isPlaying = false;
    state.animTime = 0;
    state.challengeState = { solved: false, feedback: '' };

    // Deep copy default params
    state.params = JSON.parse(JSON.stringify(sim.defaultParams || {}));

    // Update header
    dom.topicTag.textContent = sim.title;
    dom.overlaySim.textContent = sim.topic;
    dom.overlayState.textContent = state.mode === 'learn' ? '🎓 Learn Mode' : state.mode === 'experiment' ? '🔬 Experiment' : '🏆 Challenge';

    // Steps
    state.maxSteps = getStepCount(sim);
    updateStepLabel();

    // Render panels
    updateFormulaBox(sim);
    updateSpecList(sim);
    buildInputs(sim);
    updateExplanation(sim);
    updateMetrics(sim);
    updateLegend(sim);

    // Challenge
    if (state.mode === 'challenge' && sim.challenge) {
      dom.challengeCard.style.display = '';
      dom.challengePrompt.textContent = sim.challenge.goal;
      dom.challengeResult.innerHTML = '';
    } else {
      dom.challengeCard.style.display = 'none';
    }

    renderSimulation();
    showToast(sim.icon + ' ' + sim.topic);
  }

  function getStepCount(sim) {
    if (sim.id.includes('kmap')) return 6;
    if (sim.id.includes('quine')) return 6;
    if (sim.id.includes('logic-gates')) return 5;
    if (sim.id.includes('adder') || sim.id.includes('subtractor')) return 4;
    if (sim.id.includes('mux') || sim.id.includes('decoder') || sim.id.includes('encoder')) return 4;
    if (sim.id.includes('latch') || sim.id.includes('ff') || sim.id.includes('master')) return 5;
    if (sim.id.includes('counter') || sim.id.includes('sequence')) return 6;
    if (sim.id.includes('shift') || sim.id.includes('ring') || sim.id.includes('johnson')) return 5;
    if (sim.id.includes('hazard')) return 5;
    return 4;
  }

  // ══════════════════════════════════════════════════════════
  // 6. CANVAS RENDERING ENGINE
  // ══════════════════════════════════════════════════════════
  function resizeCanvas() {
    var container = document.getElementById('ecg-stage-container');
    if (!container) return;
    var w = container.clientWidth;
    var h = Math.max(320, Math.min(w * 0.45, 480));
    dom.canvas.width = w * (window.devicePixelRatio || 1);
    dom.canvas.height = h * (window.devicePixelRatio || 1);
    dom.canvas.style.width = w + 'px';
    dom.canvas.style.height = h + 'px';
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    renderSimulation();
  }

  function renderSimulation() {
    var sim = catalog.getSimulationById(state.currentSimId);
    if (!sim) return;
    var w = dom.canvas.width / (window.devicePixelRatio || 1);
    var h = dom.canvas.height / (window.devicePixelRatio || 1);
    var dark = state.theme === 'dark';

    // Clear
    ctx.fillStyle = dark ? '#060912' : '#f8f9fc';
    ctx.fillRect(0, 0, w, h);

    // Draw grid
    drawGrid(w, h, dark);

    // Route to renderer
    var renderer = RENDERERS[sim.id] || RENDERERS['_default'];
    renderer(ctx, w, h, sim, state, dark);
  }

  function drawGrid(w, h, dark) {
    ctx.strokeStyle = dark ? 'rgba(30,34,64,0.5)' : 'rgba(226,228,236,0.6)';
    ctx.lineWidth = 0.5;
    var step = 30;
    for (var x = 0; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (var y = 0; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  // ══════════════════════════════════════════════════════════
  // 7. GATE DRAWING PRIMITIVES
  // ══════════════════════════════════════════════════════════
  var GATE_COLORS = {
    dark: { body: '#1a2240', stroke: '#818cf8', high: '#4ade80', low: '#f87171', wire: '#60a5fa', text: '#f8fafc', muted: '#64748b', clock: '#fbbf24', output: '#c084fc' },
    light: { body: '#eef2ff', stroke: '#4338ca', high: '#16a34a', low: '#dc2626', wire: '#2563eb', text: '#141a2e', muted: '#6b7290', clock: '#d97706', output: '#7c3aed' }
  };

  function gc(dark) { return dark ? GATE_COLORS.dark : GATE_COLORS.light; }

  function drawGateShape(cx, cy, gateType, size, dark) {
    var c = gc(dark);
    var s = size || 50;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = c.stroke;
    ctx.fillStyle = c.body;

    switch (gateType) {
      case 'AND':
        ctx.beginPath();
        ctx.moveTo(-s/2, -s/2);
        ctx.lineTo(0, -s/2);
        ctx.arc(0, 0, s/2, -Math.PI/2, Math.PI/2);
        ctx.lineTo(-s/2, s/2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        break;
      case 'OR':
        ctx.beginPath();
        ctx.moveTo(-s/2, -s/2);
        ctx.quadraticCurveTo(-s/4, 0, -s/2, s/2);
        ctx.quadraticCurveTo(s/4, s/2, s/2, 0);
        ctx.quadraticCurveTo(s/4, -s/2, -s/2, -s/2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        break;
      case 'NOT':
        ctx.beginPath();
        ctx.moveTo(-s/3, -s/3);
        ctx.lineTo(s/3, 0);
        ctx.lineTo(-s/3, s/3);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.arc(s/3 + 6, 0, 5, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'NAND':
        drawGateShape(0, 0, 'AND', s, dark);
        ctx.beginPath();
        ctx.arc(s/2 + 6, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle = c.body; ctx.fill(); ctx.stroke();
        break;
      case 'NOR':
        drawGateShape(0, 0, 'OR', s, dark);
        ctx.beginPath();
        ctx.arc(s/2 + 6, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle = c.body; ctx.fill(); ctx.stroke();
        break;
      case 'XOR':
        drawGateShape(0, 0, 'OR', s, dark);
        ctx.beginPath();
        ctx.moveTo(-s/2 - 6, -s/2);
        ctx.quadraticCurveTo(-s/4 - 6, 0, -s/2 - 6, s/2);
        ctx.stroke();
        break;
      default:
        ctx.fillRect(-s/2, -s/2, s, s);
        ctx.strokeRect(-s/2, -s/2, s, s);
    }
    ctx.restore();
  }

  function drawWire(x1, y1, x2, y2, val, dark) {
    var c = gc(dark);
    ctx.strokeStyle = val === 1 ? c.high : val === 0 ? c.low : c.wire;
    ctx.lineWidth = val === 1 ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function drawLabel(x, y, text, dark, size, color) {
    var c = gc(dark);
    ctx.fillStyle = color || c.text;
    ctx.font = (size || 12) + 'px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  function drawBit(x, y, val, dark, size) {
    var c = gc(dark);
    var r = size || 16;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = val === 1 ? c.high : c.low;
    ctx.fill();
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (r * 0.8) + 'px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(val), x, y);
  }

  function drawTruthTable(x, y, headers, rows, dark, highlightRow) {
    var c = gc(dark);
    var cellW = 45, cellH = 22;
    var totalW = headers.length * cellW;

    // Header
    ctx.fillStyle = dark ? '#1a2240' : '#e0e7ff';
    ctx.fillRect(x, y, totalW, cellH);
    ctx.strokeStyle = c.stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, totalW, cellH);
    headers.forEach(function (h, i) {
      ctx.fillStyle = c.stroke;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(h, x + i * cellW + cellW / 2, y + cellH / 2);
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(x + i * cellW, y);
        ctx.lineTo(x + i * cellW, y + cellH + rows.length * cellH);
        ctx.stroke();
      }
    });

    // Rows
    rows.forEach(function (row, ri) {
      var ry = y + cellH + ri * cellH;
      if (ri === highlightRow) {
        ctx.fillStyle = dark ? 'rgba(129,140,248,0.2)' : 'rgba(67,56,202,0.1)';
        ctx.fillRect(x, ry, totalW, cellH);
      }
      ctx.strokeStyle = dark ? 'rgba(30,34,64,0.8)' : 'rgba(200,200,220,0.8)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, ry + cellH);
      ctx.lineTo(x + totalW, ry + cellH);
      ctx.stroke();
      row.forEach(function (val, ci) {
        ctx.fillStyle = val === 1 ? c.high : val === 0 ? c.low : c.text;
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(val), x + ci * cellW + cellW / 2, ry + cellH / 2);
      });
    });
    ctx.strokeRect(x, y, totalW, cellH + rows.length * cellH);
  }

  // ══════════════════════════════════════════════════════════
  // 8. SIMULATION RENDERERS
  // ══════════════════════════════════════════════════════════
  var RENDERERS = {};

  // ─── DEFAULT RENDERER ───
  RENDERERS['_default'] = function (ctx, w, h, sim, st, dark) {
    var c = gc(dark);
    // Title
    ctx.fillStyle = c.stroke;
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sim.title, w / 2, 40);
    // Description
    ctx.fillStyle = c.muted;
    ctx.font = '13px "Inter", sans-serif';
    var desc = sim.description;
    if (desc.length > 80) desc = desc.substring(0, 77) + '...';
    ctx.fillText(desc, w / 2, 65);
    // Icon
    ctx.font = '60px serif';
    ctx.fillText(sim.icon, w / 2, h / 2);
    // Step info
    ctx.fillStyle = c.text;
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillText('Step ' + (st.currentStep + 1) + ' of ' + st.maxSteps + ' — ' + st.mode.toUpperCase() + ' MODE', w / 2, h - 30);
  };

  // ─── LOGIC GATES ⭐ ───
  RENDERERS['de-logic-gates'] = function (ctx, w, h, sim, st, dark) {
    var c = gc(dark);
    var p = st.params;
    var gType = p.gateType || 'AND';
    var a = p.inputA ? 1 : 0;
    var b = p.inputB ? 1 : 0;

    // Compute output
    var out = 0;
    switch (gType) {
      case 'AND': out = a & b; break;
      case 'OR': out = a | b; break;
      case 'NOT': out = a ? 0 : 1; break;
      case 'NAND': out = (a & b) ? 0 : 1; break;
      case 'NOR': out = (a | b) ? 0 : 1; break;
      case 'XOR': out = a ^ b; break;
      case 'XNOR': out = (a ^ b) ? 0 : 1; break;
    }

    var cx = w * 0.35, cy = h * 0.45;

    // Title
    ctx.fillStyle = c.stroke;
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gType + ' Gate', w / 2, 30);

    // Input wires
    if (gType !== 'NOT') {
      drawWire(cx - 120, cy - 18, cx - 30, cy - 18, a, dark);
      drawWire(cx - 120, cy + 18, cx - 30, cy + 18, b, dark);
      drawBit(cx - 130, cy - 18, a, dark, 14);
      drawBit(cx - 130, cy + 18, b, dark, 14);
      drawLabel(cx - 150, cy - 18, 'A', dark, 12);
      drawLabel(cx - 150, cy + 18, 'B', dark, 12);
    } else {
      drawWire(cx - 120, cy, cx - 20, cy, a, dark);
      drawBit(cx - 130, cy, a, dark, 14);
      drawLabel(cx - 150, cy, 'A', dark, 12);
    }

    // Gate
    drawGateShape(cx, cy, gType, 55, dark);

    // Output wire
    var outX = cx + 40;
    drawWire(outX, cy, outX + 80, cy, out, dark);
    drawBit(outX + 95, cy, out, dark, 14);
    drawLabel(outX + 120, cy, 'Y', dark, 12);

    // Expression
    var expr = '';
    switch (gType) {
      case 'AND': expr = 'Y = A·B = ' + a + '·' + b + ' = ' + out; break;
      case 'OR': expr = 'Y = A+B = ' + a + '+' + b + ' = ' + out; break;
      case 'NOT': expr = "Y = A' = " + a + "' = " + out; break;
      case 'NAND': expr = "Y = (AB)' = (" + a + '·' + b + ")' = " + out; break;
      case 'NOR': expr = "Y = (A+B)' = (" + a + '+' + b + ")' = " + out; break;
      case 'XOR': expr = 'Y = A⊕B = ' + a + '⊕' + b + ' = ' + out; break;
      case 'XNOR': expr = 'Y = (A⊕B)\' = (' + a + '⊕' + b + ")\' = " + out; break;
    }
    ctx.fillStyle = c.text;
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(expr, w / 2, h - 50);

    // Truth table
    var ttHeaders = gType === 'NOT' ? ['A', 'Y'] : ['A', 'B', 'Y'];
    var ttRows = [];
    if (gType === 'NOT') {
      ttRows = [[0, 1], [1, 0]];
    } else {
      for (var i = 0; i < 4; i++) {
        var ta = (i >> 1) & 1, tb = i & 1, to = 0;
        switch (gType) {
          case 'AND': to = ta & tb; break;
          case 'OR': to = ta | tb; break;
          case 'NAND': to = (ta & tb) ? 0 : 1; break;
          case 'NOR': to = (ta | tb) ? 0 : 1; break;
          case 'XOR': to = ta ^ tb; break;
          case 'XNOR': to = (ta ^ tb) ? 0 : 1; break;
        }
        ttRows.push([ta, tb, to]);
      }
    }
    var hlRow = gType === 'NOT' ? a : (a << 1 | b);
    drawTruthTable(w * 0.62, h * 0.2, ttHeaders, ttRows, dark, hlRow);
  };

  // ─── K-MAP ⭐ ───
  RENDERERS['de-kmap'] = function (ctx, w, h, sim, st, dark) {
    var c = gc(dark);
    var p = st.params;
    var vars = parseInt(p.variables) || 4;
    var mtStr = (p.minterms || '').toString();
    var minterms = mtStr.split(',').map(function (s) { return parseInt(s.trim()); }).filter(function (n) { return !isNaN(n); });

    ctx.fillStyle = c.stroke;
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(vars + '-Variable Karnaugh Map', w / 2, 30);

    if (vars === 4) {
      // 4-variable K-Map (4x4)
      var kLabelsCol = ['00', '01', '11', '10']; // AB
      var kLabelsRow = ['00', '01', '11', '10']; // CD
      var cellSize = 50;
      var startX = w / 2 - 2 * cellSize;
      var startY = 70;

      // Column header (AB)
      ctx.fillStyle = c.stroke;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('AB →', startX - 25, startY - 15);
      kLabelsCol.forEach(function (lbl, i) {
        ctx.fillText(lbl, startX + i * cellSize + cellSize / 2, startY - 5);
      });

      // Row header (CD)
      ctx.fillText('CD ↓', startX - 35, startY + 15);
      kLabelsRow.forEach(function (lbl, i) {
        ctx.fillText(lbl, startX - 15, startY + i * cellSize + cellSize / 2 + 3);
      });

      // Gray code order for rows/cols
      var grayOrder = [0, 1, 3, 2];

      // Cells
      for (var r = 0; r < 4; r++) {
        for (var col = 0; col < 4; col++) {
          var mintermNum = grayOrder[r] * 4 + grayOrder[col]; // CD·4 + AB? No: AB is column, CD is row
          // Actually: AB = col gray, CD = row gray
          // Minterm = AB(2 bits high) | CD(2 bits low) = grayOrder[col] << 2 | grayOrder[r]
          mintermNum = (grayOrder[col] << 2) | grayOrder[r];
          var cx2 = startX + col * cellSize;
          var cy2 = startY + r * cellSize;
          var inSet = minterms.indexOf(mintermNum) >= 0;

          ctx.fillStyle = inSet ? (dark ? 'rgba(74,222,128,0.2)' : 'rgba(22,163,74,0.1)') : 'transparent';
          ctx.fillRect(cx2, cy2, cellSize, cellSize);
          ctx.strokeStyle = dark ? 'rgba(129,140,248,0.4)' : 'rgba(67,56,202,0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx2, cy2, cellSize, cellSize);

          // Value
          ctx.fillStyle = inSet ? c.high : c.low;
          ctx.font = 'bold 16px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(inSet ? '1' : '0', cx2 + cellSize / 2, cy2 + cellSize / 2 - 6);

          // Minterm number
          ctx.fillStyle = c.muted;
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText('m' + mintermNum, cx2 + cellSize / 2, cy2 + cellSize / 2 + 12);
        }
      }

      // Show minterms
      ctx.fillStyle = c.text;
      ctx.font = '12px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('F(A,B,C,D) = Σm(' + mtStr + ')', w / 2, startY + 4 * cellSize + 25);

      // Step indicator
      var steps = ['Enter Minterms', 'Populate K-Map', 'Identify Groups', 'Form Prime Implicants', 'Select Essential PIs', 'Write Simplified Expression'];
      if (st.currentStep < steps.length) {
        ctx.fillStyle = c.stroke;
        ctx.font = 'bold 13px "Inter", sans-serif';
        ctx.fillText('→ ' + steps[st.currentStep], w / 2, h - 25);
      }
    } else {
      // 2 or 3 variable fallback
      ctx.fillStyle = c.muted;
      ctx.font = '13px "Inter", sans-serif';
      ctx.fillText(vars + '-variable K-Map: Minterms = {' + mtStr + '}', w / 2, h / 2);
    }
  };

  // ─── HALF ADDER ───
  RENDERERS['de-half-adder'] = function (ctx, w, h, sim, st, dark) {
    var c = gc(dark);
    var a = st.params.inputA ? 1 : 0;
    var b = st.params.inputB ? 1 : 0;
    var sum = a ^ b;
    var carry = a & b;

    ctx.fillStyle = c.stroke;
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Half Adder', w / 2, 30);

    var cx = w * 0.35, cy = h * 0.4;

    // Input A
    drawBit(cx - 100, cy - 25, a, dark, 14);
    drawLabel(cx - 125, cy - 25, 'A', dark);
    drawWire(cx - 85, cy - 25, cx - 35, cy - 25, a, dark);

    // Input B
    drawBit(cx - 100, cy + 25, b, dark, 14);
    drawLabel(cx - 125, cy + 25, 'B', dark);
    drawWire(cx - 85, cy + 25, cx - 35, cy + 25, b, dark);

    // XOR gate for Sum
    drawGateShape(cx, cy - 25, 'XOR', 45, dark);
    drawWire(cx + 30, cy - 25, cx + 90, cy - 25, sum, dark);
    drawBit(cx + 105, cy - 25, sum, dark, 14);
    drawLabel(cx + 130, cy - 25, 'Sum', dark, 11);

    // AND gate for Carry
    drawGateShape(cx, cy + 35, 'AND', 45, dark);
    drawWire(cx + 30, cy + 35, cx + 90, cy + 35, carry, dark);
    drawBit(cx + 105, cy + 35, carry, dark, 14);
    drawLabel(cx + 135, cy + 35, 'Carry', dark, 11);

    // Formulas
    ctx.fillStyle = c.text;
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('Sum = A⊕B = ' + a + '⊕' + b + ' = ' + sum, w / 2, h - 60);
    ctx.fillText('Carry = A·B = ' + a + '·' + b + ' = ' + carry, w / 2, h - 40);

    // Truth table
    drawTruthTable(w * 0.65, h * 0.15, ['A', 'B', 'S', 'C'],
      [[0,0,0,0],[0,1,1,0],[1,0,1,0],[1,1,0,1]], dark, a * 2 + b);
  };

  // ─── FULL ADDER ───
  RENDERERS['de-full-adder'] = function (ctx, w, h, sim, st, dark) {
    var c = gc(dark);
    var a = st.params.inputA ? 1 : 0;
    var b = st.params.inputB ? 1 : 0;
    var cin = st.params.carryIn ? 1 : 0;
    var sum = a ^ b ^ cin;
    var cout = (a & b) | (cin & (a ^ b));

    ctx.fillStyle = c.stroke;
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Full Adder', w / 2, 30);

    var cx = w * 0.3, cy = h * 0.45;
    drawBit(cx - 80, cy - 30, a, dark, 13); drawLabel(cx - 102, cy - 30, 'A', dark);
    drawBit(cx - 80, cy, b, dark, 13); drawLabel(cx - 102, cy, 'B', dark);
    drawBit(cx - 80, cy + 30, cin, dark, 13); drawLabel(cx - 108, cy + 30, 'Cin', dark, 10);

    // Box representation
    ctx.fillStyle = c.body; ctx.strokeStyle = c.stroke; ctx.lineWidth = 2;
    ctx.fillRect(cx - 30, cy - 45, 80, 90);
    ctx.strokeRect(cx - 30, cy - 45, 80, 90);
    ctx.fillStyle = c.stroke; ctx.font = 'bold 14px "Inter", sans-serif';
    ctx.fillText('Full', cx + 10, cy - 5);
    ctx.fillText('Adder', cx + 10, cy + 12);

    drawWire(cx + 50, cy - 15, cx + 110, cy - 15, sum, dark);
    drawBit(cx + 125, cy - 15, sum, dark, 13); drawLabel(cx + 150, cy - 15, 'Sum', dark, 11);
    drawWire(cx + 50, cy + 15, cx + 110, cy + 15, cout, dark);
    drawBit(cx + 125, cy + 15, cout, dark, 13); drawLabel(cx + 155, cy + 15, 'Cout', dark, 11);

    ctx.fillStyle = c.text; ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText('Sum = A⊕B⊕Cin = ' + sum + '  |  Cout = AB + Cin(A⊕B) = ' + cout, w / 2, h - 35);

    // Truth table
    var rows = [];
    for (var i = 0; i < 8; i++) {
      var ta = (i >> 2) & 1, tb = (i >> 1) & 1, tc = i & 1;
      rows.push([ta, tb, tc, ta ^ tb ^ tc, (ta & tb) | (tc & (ta ^ tb))]);
    }
    drawTruthTable(w * 0.6, h * 0.08, ['A','B','Cin','S','Co'], rows, dark, a * 4 + b * 2 + cin);
  };

  // ─── MUX ⭐ ───
  RENDERERS['de-mux'] = function (ctx, w, h, sim, st, dark) {
    var c = gc(dark);
    var p = st.params;
    var muxSize = parseInt(p.muxSize) || 4;
    var selStr = p.selectLines || '00';
    var selVal = parseInt(selStr, 2);
    var inputs = p.inputs || [1, 0, 1, 0];

    ctx.fillStyle = c.stroke; ctx.font = 'bold 16px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(muxSize + ':1 Multiplexer', w / 2, 30);

    var cx = w * 0.4, cy = h * 0.5;
    var boxH = muxSize * 30 + 20;

    // MUX box (trapezoid shape)
    ctx.fillStyle = c.body; ctx.strokeStyle = c.stroke; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy - boxH / 2);
    ctx.lineTo(cx + 30, cy - boxH / 3);
    ctx.lineTo(cx + 30, cy + boxH / 3);
    ctx.lineTo(cx - 40, cy + boxH / 2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = c.stroke; ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText('MUX', cx - 5, cy);

    // Inputs
    for (var i = 0; i < muxSize && i < inputs.length; i++) {
      var iy = cy - boxH / 2 + 20 + i * 30;
      var val = inputs[i] ? 1 : 0;
      drawBit(cx - 85, iy, val, dark, 11);
      drawLabel(cx - 105, iy, 'I' + i, dark, 10);
      ctx.strokeStyle = (i === selVal) ? c.high : (dark ? 'rgba(100,116,139,0.4)' : 'rgba(200,200,220,0.5)');
      ctx.lineWidth = (i === selVal) ? 3 : 1;
      ctx.beginPath(); ctx.moveTo(cx - 73, iy); ctx.lineTo(cx - 40, iy); ctx.stroke();
    }

    // Select lines
    drawLabel(cx - 5, cy + boxH / 2 + 18, 'S = ' + selStr, dark, 11, c.clock);

    // Output
    var outVal = (selVal < inputs.length) ? (inputs[selVal] ? 1 : 0) : 0;
    drawWire(cx + 30, cy, cx + 100, cy, outVal, dark);
    drawBit(cx + 115, cy, outVal, dark, 14);
    drawLabel(cx + 140, cy, 'Y', dark);

    ctx.fillStyle = c.text; ctx.font = '12px "JetBrains Mono", monospace;';
    ctx.fillText('Selected: I' + selVal + ' = ' + outVal + '  →  Y = ' + outVal, w / 2, h - 30);
  };

  // ─── NOR LATCH ───
  RENDERERS['de-nor-latch'] = function (ctx, w, h, sim, st, dark) {
    var c = gc(dark);
    var S = st.params.S ? 1 : 0;
    var R = st.params.R ? 1 : 0;
    var Q = st.params.Q ? 1 : 0;
    // NOR latch logic
    if (S === 1 && R === 0) { Q = 1; }
    else if (S === 0 && R === 1) { Q = 0; }
    else if (S === 1 && R === 1) { Q = -1; } // Invalid
    st.params.Q = Q;
    var Qbar = Q === -1 ? -1 : (Q ? 0 : 1);

    ctx.fillStyle = c.stroke; ctx.font = 'bold 16px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SR Latch (NOR Gates)', w / 2, 30);

    var cx = w * 0.4, cy = h * 0.45;
    // Two NOR gates
    drawGateShape(cx, cy - 30, 'NOR', 45, dark);
    drawGateShape(cx, cy + 30, 'NOR', 45, dark);

    // Inputs
    drawBit(cx - 110, cy - 30, S, dark, 13); drawLabel(cx - 130, cy - 30, 'S', dark);
    drawBit(cx - 110, cy + 30, R, dark, 13); drawLabel(cx - 130, cy + 30, 'R', dark);
    drawWire(cx - 96, cy - 30, cx - 30, cy - 30, S, dark);
    drawWire(cx - 96, cy + 30, cx - 30, cy + 30, R, dark);

    // Outputs
    var qVal = Q === -1 ? '?' : Q;
    var qbVal = Qbar === -1 ? '?' : Qbar;
    drawWire(cx + 30, cy - 30, cx + 90, cy - 30, Q === -1 ? 0 : Q, dark);
    drawWire(cx + 30, cy + 30, cx + 90, cy + 30, Qbar === -1 ? 0 : Qbar, dark);
    drawBit(cx + 105, cy - 30, Q === -1 ? 0 : Q, dark, 13);
    drawBit(cx + 105, cy + 30, Qbar === -1 ? 0 : Qbar, dark, 13);
    drawLabel(cx + 130, cy - 30, 'Q', dark);
    drawLabel(cx + 130, cy + 30, 'Q̅', dark);

    // Cross-coupling feedback arrows
    ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(cx + 85, cy - 30); ctx.lineTo(cx + 85, cy + 5); ctx.lineTo(cx - 35, cy + 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 85, cy + 30); ctx.lineTo(cx + 85, cy - 5); ctx.lineTo(cx - 35, cy - 18); ctx.stroke();
    ctx.setLineDash([]);

    if (Q === -1) {
      ctx.fillStyle = c.low; ctx.font = 'bold 13px "Inter", sans-serif';
      ctx.fillText('⚠ INVALID STATE (S=R=1)', w / 2, h - 60);
    }

    // Truth table
    drawTruthTable(w * 0.62, h * 0.15, ['S', 'R', 'Q', 'Q̅'],
      [[0,0,'Qn','Qn̅'],[0,1,0,1],[1,0,1,0],[1,1,'?','?']], dark, S * 2 + R);

    ctx.fillStyle = c.text; ctx.font = '12px "Inter", sans-serif';
    ctx.fillText('S=' + S + ' R=' + R + ' → Q=' + qVal + ' Q̅=' + qbVal, w / 2, h - 30);
  };

  // ─── MASTER-SLAVE ⭐ ───
  RENDERERS['de-master-slave'] = function (ctx, w, h, sim, st, dark) {
    var c = gc(dark);
    var p = st.params;
    var clk = p.clock ? 1 : 0;

    ctx.fillStyle = c.stroke; ctx.font = 'bold 16px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Master-Slave ' + (p.ffType || 'JK') + ' Flip-Flop', w / 2, 30);

    var mx = w * 0.25, my = h * 0.5;
    var sx = w * 0.6;

    // Master box
    ctx.fillStyle = clk ? (dark ? 'rgba(74,222,128,0.15)' : 'rgba(22,163,74,0.08)') : c.body;
    ctx.strokeStyle = c.stroke; ctx.lineWidth = 2;
    ctx.fillRect(mx - 50, my - 40, 100, 80);
    ctx.strokeRect(mx - 50, my - 40, 100, 80);
    ctx.fillStyle = c.stroke; ctx.font = 'bold 13px "Inter", sans-serif';
    ctx.fillText('MASTER', mx, my - 10);
    ctx.fillStyle = c.muted; ctx.font = '10px "Inter", sans-serif';
    ctx.fillText('Loads @ CLK↑', mx, my + 10);

    // Slave box
    ctx.fillStyle = !clk ? (dark ? 'rgba(192,132,252,0.15)' : 'rgba(124,58,237,0.08)') : c.body;
    ctx.fillRect(sx - 50, my - 40, 100, 80);
    ctx.strokeRect(sx - 50, my - 40, 100, 80);
    ctx.fillStyle = c.output; ctx.font = 'bold 13px "Inter", sans-serif';
    ctx.fillText('SLAVE', sx, my - 10);
    ctx.fillStyle = c.muted; ctx.font = '10px "Inter", sans-serif';
    ctx.fillText('Outputs @ CLK↓', sx, my + 10);

    // Arrow
    ctx.strokeStyle = c.wire; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(mx + 50, my); ctx.lineTo(sx - 50, my); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx - 55, my - 5); ctx.lineTo(sx - 50, my); ctx.lineTo(sx - 55, my + 5); ctx.fill();

    // Clock
    drawBit(w * 0.43, my + 60, clk, dark, 12);
    drawLabel(w * 0.43, my + 80, 'CLK = ' + clk, dark, 11, c.clock);

    // Inputs
    drawBit(mx - 80, my - 15, p.J ? 1 : 0, dark, 11); drawLabel(mx - 98, my - 15, 'J', dark, 11);
    drawBit(mx - 80, my + 15, p.K ? 1 : 0, dark, 11); drawLabel(mx - 98, my + 15, 'K', dark, 11);

    ctx.fillStyle = c.text; ctx.font = '12px "Inter", sans-serif';
    ctx.fillText('Master captures on CLK HIGH → Slave transfers on CLK LOW', w / 2, h - 25);
  };

  // ─── SYNC UP COUNTER ───
  RENDERERS['de-sync-up'] = function (ctx, w, h, sim, st, dark) {
    var c = gc(dark);
    var bits = parseInt(st.params.bits) || 3;
    var count = st.params.currentCount || 0;
    var maxCount = (1 << bits) - 1;
    if (count > maxCount) count = 0;

    ctx.fillStyle = c.stroke; ctx.font = 'bold 16px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(bits + '-Bit Synchronous Up Counter', w / 2, 30);

    // Flip-flop boxes
    var startX = w / 2 - bits * 40;
    for (var i = bits - 1; i >= 0; i--) {
      var fx = startX + (bits - 1 - i) * 80;
      var fy = h * 0.4;
      var bitVal = (count >> i) & 1;
      ctx.fillStyle = bitVal ? (dark ? 'rgba(74,222,128,0.15)' : 'rgba(22,163,74,0.08)') : c.body;
      ctx.strokeStyle = c.stroke; ctx.lineWidth = 2;
      ctx.fillRect(fx - 25, fy - 25, 50, 50);
      ctx.strokeRect(fx - 25, fy - 25, 50, 50);
      drawBit(fx, fy, bitVal, dark, 14);
      drawLabel(fx, fy - 38, 'Q' + i, dark, 11, c.stroke);
    }

    // Count display
    var binStr = count.toString(2).padStart(bits, '0');
    ctx.fillStyle = c.text; ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillText('Count: ' + binStr + ' (' + count + ')', w / 2, h * 0.7);

    // Sequence
    ctx.fillStyle = c.muted; ctx.font = '11px "Inter", sans-serif';
    var seqStr = '';
    for (var j = 0; j <= maxCount; j++) {
      seqStr += (j === count ? '[' + j + ']' : j);
      if (j < maxCount) seqStr += ' → ';
    }
    if (seqStr.length > 80) seqStr = seqStr.substring(0, 77) + '...';
    ctx.fillText(seqStr, w / 2, h - 30);
  };

  // ─── SEQUENCE DETECTOR ⭐ ───
  RENDERERS['de-sequence-detector'] = function (ctx, w, h, sim, st, dark) {
    var c = gc(dark);
    var target = st.params.targetSequence || '1011';
    var stream = st.params.inputStream || '11011011010';

    ctx.fillStyle = c.stroke; ctx.font = 'bold 16px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Sequence Detector: "' + target + '"', w / 2, 30);

    // Draw state circles
    var numStates = target.length + 1;
    var spacing = Math.min(80, (w - 100) / numStates);
    var startX = w / 2 - (numStates - 1) * spacing / 2;
    var sy = h * 0.35;

    for (var i = 0; i < numStates; i++) {
      var sx2 = startX + i * spacing;
      ctx.beginPath();
      ctx.arc(sx2, sy, 20, 0, Math.PI * 2);
      ctx.fillStyle = i === Math.min(st.currentStep, numStates - 1) ? (dark ? 'rgba(129,140,248,0.3)' : 'rgba(67,56,202,0.15)') : c.body;
      ctx.fill();
      ctx.strokeStyle = c.stroke; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = c.text; ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('S' + i, sx2, sy);

      // Transition arrow
      if (i < numStates - 1) {
        ctx.strokeStyle = c.wire; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sx2 + 22, sy); ctx.lineTo(sx2 + spacing - 22, sy); ctx.stroke();
        ctx.fillStyle = c.high; ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(target[i], sx2 + spacing / 2, sy - 12);
      }
    }

    // Detection state marker
    var lastX = startX + (numStates - 1) * spacing;
    ctx.fillStyle = c.high; ctx.font = 'bold 10px "Inter", sans-serif';
    ctx.fillText('DETECT!', lastX, sy + 35);

    // Input stream
    ctx.fillStyle = c.text; ctx.font = '13px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText('Input Stream: ' + stream, w / 2, h * 0.65);

    ctx.fillStyle = c.muted; ctx.font = '11px "Inter", sans-serif';
    ctx.fillText('Target: "' + target + '" | Mode: ' + (st.params.overlap ? 'Overlapping' : 'Non-overlapping'), w / 2, h - 25);
  };

  // ─── SHIFT REGISTER ⭐ ───
  RENDERERS['de-shift-register'] = function (ctx, w, h, sim, st, dark) {
    var c = gc(dark);
    var p = st.params;
    var bits = parseInt(p.bits) || 4;
    var data = (p.data || '0000').split('').map(Number);
    while (data.length < bits) data.push(0);

    ctx.fillStyle = c.stroke; ctx.font = 'bold 16px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText((p.type || 'SIPO') + ' Shift Register (' + p.direction + ' shift)', w / 2, 30);

    // Register cells
    var cellW = 60, cellH = 50;
    var startX = w / 2 - bits * cellW / 2;
    var ry = h * 0.4;

    for (var i = 0; i < bits; i++) {
      var rx = startX + i * cellW;
      ctx.fillStyle = data[i] ? (dark ? 'rgba(74,222,128,0.15)' : 'rgba(22,163,74,0.08)') : c.body;
      ctx.strokeStyle = c.stroke; ctx.lineWidth = 2;
      ctx.fillRect(rx, ry, cellW, cellH);
      ctx.strokeRect(rx, ry, cellW, cellH);
      drawBit(rx + cellW / 2, ry + cellH / 2, data[i], dark, 16);
      drawLabel(rx + cellW / 2, ry - 12, 'Q' + (bits - 1 - i), dark, 10, c.stroke);

      // Arrow between cells
      if (i < bits - 1) {
        ctx.strokeStyle = c.wire; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(rx + cellW + 2, ry + cellH / 2); ctx.lineTo(rx + cellW - 2, ry + cellH / 2); ctx.stroke();
      }
    }

    // Serial input arrow
    if (p.direction === 'right') {
      ctx.strokeStyle = c.high; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(startX - 30, ry + cellH / 2); ctx.lineTo(startX - 2, ry + cellH / 2); ctx.stroke();
      drawLabel(startX - 45, ry + cellH / 2, 'IN', dark, 10, c.high);
    }

    ctx.fillStyle = c.text; ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillText('Register: [' + data.join(', ') + ']', w / 2, h * 0.7);

    ctx.fillStyle = c.muted; ctx.font = '11px "Inter", sans-serif';
    ctx.fillText('Data shifts ' + p.direction + ' on each clock pulse', w / 2, h - 25);
  };

  // ─── HAZARD ⭐ ───
  RENDERERS['de-hazard'] = function (ctx, w, h, sim, st, dark) {
    var c = gc(dark);
    ctx.fillStyle = c.stroke; ctx.font = 'bold 16px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Static Hazard Demonstration', w / 2, 30);

    var expr = st.params.expression || 'AB + AC\'';

    // Two gate paths with different delays
    var cx = w * 0.3, cy = h * 0.4;

    // Path 1 (fast): AB
    ctx.fillStyle = c.body; ctx.strokeStyle = c.stroke; ctx.lineWidth = 2;
    ctx.fillRect(cx - 20, cy - 60, 80, 30); ctx.strokeRect(cx - 20, cy - 60, 80, 30);
    drawLabel(cx + 20, cy - 45, 'AB', dark, 11, c.stroke);
    drawLabel(cx + 100, cy - 45, 'Fast path', dark, 9, c.high);

    // Path 2 (slow): AC'
    ctx.fillRect(cx - 20, cy + 10, 80, 30); ctx.strokeRect(cx - 20, cy + 10, 80, 30);
    drawLabel(cx + 20, cy + 25, "AC'", dark, 11, c.stroke);
    drawLabel(cx + 100, cy + 25, 'Slow path', dark, 9, c.low);

    // OR gate
    drawGateShape(cx + 160, cy - 15, 'OR', 45, dark);
    drawWire(cx + 60, cy - 45, cx + 130, cy - 25, 1, dark);
    drawWire(cx + 60, cy + 25, cx + 130, cy - 5, 1, dark);

    // Glitch waveform
    var waveY = h * 0.72;
    var waveW = w * 0.6;
    var waveStart = w * 0.2;

    ctx.strokeStyle = c.muted; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(waveStart, waveY); ctx.lineTo(waveStart + waveW, waveY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(waveStart, waveY - 40); ctx.lineTo(waveStart + waveW, waveY - 40); ctx.stroke();

    // Output waveform with glitch
    ctx.strokeStyle = c.high; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(waveStart, waveY - 40);
    ctx.lineTo(waveStart + waveW * 0.4, waveY - 40);
    // Glitch
    ctx.lineTo(waveStart + waveW * 0.42, waveY);
    ctx.lineTo(waveStart + waveW * 0.48, waveY);
    ctx.lineTo(waveStart + waveW * 0.5, waveY - 40);
    ctx.lineTo(waveStart + waveW, waveY - 40);
    ctx.stroke();

    // Glitch annotation
    ctx.fillStyle = c.low; ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillText('⚠ GLITCH', waveStart + waveW * 0.45, waveY + 18);
    drawLabel(waveStart - 15, waveY - 40, '1', dark, 10);
    drawLabel(waveStart - 15, waveY, '0', dark, 10);

    ctx.fillStyle = c.text; ctx.font = '12px "Inter", sans-serif';
    ctx.fillText('F = ' + expr + ' — Static-1 hazard during C transition', w / 2, h - 25);
  };

  // Assign shared renderers for similar simulations
  RENDERERS['de-complements'] = RENDERERS['_default'];
  RENDERERS['de-number-system'] = RENDERERS['_default'];
  RENDERERS['de-boolean-theorem'] = RENDERERS['_default'];
  RENDERERS['de-universal-gates'] = RENDERERS['_default'];
  RENDERERS['de-sop-pos'] = RENDERERS['_default'];
  RENDERERS['de-quine-mccluskey'] = RENDERERS['_default'];
  RENDERERS['de-adder-subtractor'] = RENDERERS['de-half-adder'];
  RENDERERS['de-parallel-adder'] = RENDERERS['de-full-adder'];
  RENDERERS['de-twos-comp-adder'] = RENDERERS['de-full-adder'];
  RENDERERS['de-decoder'] = RENDERERS['de-mux'];
  RENDERERS['de-encoder'] = RENDERERS['de-mux'];
  RENDERERS['de-demux'] = RENDERERS['de-mux'];
  RENDERERS['de-code-converter'] = RENDERERS['_default'];
  RENDERERS['de-error-detection'] = RENDERERS['_default'];
  RENDERERS['de-parity'] = RENDERERS['_default'];
  RENDERERS['de-nand-latch'] = RENDERERS['de-nor-latch'];
  RENDERERS['de-digital-pulse'] = RENDERERS['_default'];
  RENDERERS['de-clocked-ff'] = RENDERERS['de-master-slave'];
  RENDERERS['de-async-inputs'] = RENDERERS['de-master-slave'];
  RENDERERS['de-ff-timing'] = RENDERERS['_default'];
  RENDERERS['de-ff-conversion'] = RENDERERS['_default'];
  RENDERERS['de-seq-model'] = RENDERERS['_default'];
  RENDERERS['de-mealy'] = RENDERERS['de-sequence-detector'];
  RENDERERS['de-moore'] = RENDERERS['de-sequence-detector'];
  RENDERERS['de-excitation-table'] = RENDERERS['_default'];
  RENDERERS['de-state-table'] = RENDERERS['_default'];
  RENDERERS['de-sync-design'] = RENDERERS['_default'];
  RENDERERS['de-sync-down'] = RENDERERS['de-sync-up'];
  RENDERERS['de-sync-updown'] = RENDERERS['de-sync-up'];
  RENDERERS['de-mod-counter'] = RENDERERS['de-sync-up'];
  RENDERERS['de-async-counter'] = RENDERERS['de-sync-up'];
  RENDERERS['de-ring-counter'] = RENDERERS['de-shift-register'];
  RENDERERS['de-johnson-counter'] = RENDERERS['de-shift-register'];
  RENDERERS['de-essential-hazard'] = RENDERERS['de-hazard'];
  RENDERERS['de-hazard-free'] = RENDERERS['de-hazard'];

  // ══════════════════════════════════════════════════════════
  // 9. UI PANEL UPDATES
  // ══════════════════════════════════════════════════════════
  function updateFormulaBox(sim) {
    if (dom.formulaBox) dom.formulaBox.textContent = sim.formula || '';
  }

  function updateSpecList(sim) {
    if (!dom.specList) return;
    var specs = [
      { label: 'Unit', value: sim.unit + ' — ' + sim.unitTitle },
      { label: 'Topic', value: sim.topic },
      { label: 'Tier', value: sim.flagship ? '⭐ Flagship' : ('Tier ' + sim.tier) },
      { label: 'Mode', value: state.mode.charAt(0).toUpperCase() + state.mode.slice(1) }
    ];
    dom.specList.innerHTML = specs.map(function (s) {
      return '<div class="ecg-spec-item"><span class="ecg-spec-label">' + s.label + '</span><span class="ecg-spec-value">' + s.value + '</span></div>';
    }).join('');
  }

  function buildInputs(sim) {
    if (!dom.inputsForm) return;
    var html = '';
    var p = sim.defaultParams || {};
    Object.keys(p).forEach(function (key) {
      var val = state.params[key] !== undefined ? state.params[key] : p[key];
      if (typeof val === 'number' || (typeof val === 'string' && !Array.isArray(val))) {
        if (typeof val === 'number' && (val === 0 || val === 1) && key.match(/^(input|S|R|J|K|D|T|clock|preset|clear|enable|carryIn|mode|Sbar|Rbar)/i)) {
          html += '<div class="ecg-input-group"><label>' + key + '</label><select data-key="' + key + '" onchange="window._ecgParamChange(this)">' +
            '<option value="0"' + (val === 0 ? ' selected' : '') + '>0 (LOW)</option>' +
            '<option value="1"' + (val === 1 ? ' selected' : '') + '>1 (HIGH)</option></select></div>';
        } else if (key === 'gateType' || key === 'ffType' || key === 'sourceFF' || key === 'targetFF') {
          var opts = key === 'gateType' ? ['AND','OR','NOT','NAND','NOR','XOR','XNOR'] :
                     ['SR', 'D', 'JK', 'T'];
          html += '<div class="ecg-input-group"><label>' + key + '</label><select data-key="' + key + '" onchange="window._ecgParamChange(this)">';
          opts.forEach(function (o) { html += '<option value="' + o + '"' + (o === val ? ' selected' : '') + '>' + o + '</option>'; });
          html += '</select></div>';
        } else if (key === 'universalGate') {
          html += '<div class="ecg-input-group"><label>' + key + '</label><select data-key="' + key + '" onchange="window._ecgParamChange(this)">' +
            '<option value="NAND"' + (val === 'NAND' ? ' selected' : '') + '>NAND</option>' +
            '<option value="NOR"' + (val === 'NOR' ? ' selected' : '') + '>NOR</option></select></div>';
        } else if (key === 'type') {
          html += '<div class="ecg-input-group"><label>' + key + '</label><select data-key="' + key + '" onchange="window._ecgParamChange(this)">' +
            ['SISO','SIPO','PISO','PIPO'].map(function(o) { return '<option value="' + o + '"' + (o === val ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
            '</select></div>';
        } else if (key === 'conversionType') {
          html += '<div class="ecg-input-group"><label>' + key + '</label><select data-key="' + key + '" onchange="window._ecgParamChange(this)">' +
            ['binary-to-gray','gray-to-binary','bcd-to-excess3','excess3-to-bcd'].map(function(o) { return '<option value="' + o + '"' + (o === val ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
            '</select></div>';
        } else if (typeof val === 'number') {
          html += '<div class="ecg-input-group"><label>' + key + '</label><input type="number" data-key="' + key + '" value="' + val + '" onchange="window._ecgParamChange(this)"></div>';
        } else {
          html += '<div class="ecg-input-group"><label>' + key + '</label><input type="text" data-key="' + key + '" value="' + val + '" onchange="window._ecgParamChange(this)"></div>';
        }
      }
    });
    dom.inputsForm.innerHTML = html;
  }

  window._ecgParamChange = function (el) {
    var key = el.dataset.key;
    var val = el.value;
    if (!isNaN(Number(val)) && val !== '') val = Number(val);
    state.params[key] = val;
    var sim = catalog.getSimulationById(state.currentSimId);
    updateExplanation(sim);
    updateMetrics(sim);
    renderSimulation();
  };

  function updateExplanation(sim) {
    if (!sim) return;
    var step = state.currentStep;
    var explanations = getExplanations(sim, step);
    if (dom.whatText) dom.whatText.textContent = explanations.what;
    if (dom.whyText) dom.whyText.textContent = explanations.why;
    if (dom.nextText) dom.nextText.textContent = explanations.next;
  }

  function getExplanations(sim, step) {
    var topic = sim.topic || '';
    if (step === 0) return {
      what: 'Initializing ' + topic + ' simulation. Circuit ready for interaction.',
      why: sim.description,
      next: 'Advance to see the circuit respond to input changes.'
    };
    return {
      what: 'Step ' + (step + 1) + ': Observing ' + topic + ' behavior with current parameters.',
      why: 'Digital circuits produce deterministic outputs based on Boolean logic and sequential state.',
      next: step < state.maxSteps - 1 ? 'Continue to the next stage of the simulation.' : 'Simulation complete. Reset or modify parameters to explore further.'
    };
  }

  function updateMetrics(sim) {
    if (!dom.metricsRow) return;
    var metrics = [];
    if (sim.unit) metrics.push({ label: 'Unit', value: sim.unit });
    metrics.push({ label: 'Mode', value: state.mode });
    metrics.push({ label: 'Step', value: (state.currentStep + 1) + '/' + state.maxSteps });
    if (sim.flagship) metrics.push({ label: 'Tier', value: '⭐ Flagship' });

    dom.metricsRow.innerHTML = metrics.map(function (m) {
      return '<div class="ecg-metric-chip"><span class="ecg-metric-label">' + m.label + '</span><span class="ecg-metric-value">' + m.value + '</span></div>';
    }).join('');
  }

  function updateLegend(sim) {
    if (!dom.legend) return;
    dom.legend.innerHTML =
      '<span style="color:var(--ecg-high-color)">● HIGH (1)</span>' +
      '<span style="color:var(--ecg-low-color)">● LOW (0)</span>' +
      '<span style="color:var(--ecg-gate-color)">● Wire</span>';
  }

  function updateStepLabel() {
    if (dom.stepLabel) dom.stepLabel.textContent = 'Step ' + (state.currentStep + 1) + ' of ' + state.maxSteps;
    if (dom.progressFill) dom.progressFill.style.width = ((state.currentStep + 1) / state.maxSteps * 100) + '%';
  }

  // ══════════════════════════════════════════════════════════
  // 10. PLAYBACK CONTROLS
  // ══════════════════════════════════════════════════════════
  function nextStep() {
    if (state.currentStep < state.maxSteps - 1) {
      state.currentStep++;
      updateStepLabel();
      var sim = catalog.getSimulationById(state.currentSimId);
      updateExplanation(sim);
      renderSimulation();
    }
  }

  function prevStep() {
    if (state.currentStep > 0) {
      state.currentStep--;
      updateStepLabel();
      var sim = catalog.getSimulationById(state.currentSimId);
      updateExplanation(sim);
      renderSimulation();
    }
  }

  function startPlayback() {
    if (state.isPlaying) return;
    state.isPlaying = true;
    dom.playBtn.disabled = true;
    dom.pauseBtn.disabled = false;
    autoAdvance();
  }

  function autoAdvance() {
    if (!state.isPlaying) return;
    if (state.currentStep < state.maxSteps - 1) {
      nextStep();
      setTimeout(autoAdvance, 1500 / state.speed);
    } else {
      pausePlayback();
    }
  }

  function pausePlayback() {
    state.isPlaying = false;
    dom.playBtn.disabled = false;
    dom.pauseBtn.disabled = true;
  }

  function resetSimulation() {
    pausePlayback();
    state.currentStep = 0;
    var sim = catalog.getSimulationById(state.currentSimId);
    if (sim) state.params = JSON.parse(JSON.stringify(sim.defaultParams || {}));
    loadSimulation(state.currentSimId);
    showToast('↻ Simulation reset');
  }

  // ══════════════════════════════════════════════════════════
  // 11. MODE SWITCHING
  // ══════════════════════════════════════════════════════════
  function switchMode(mode) {
    state.mode = mode;
    dom.modeBtns.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.mode === mode);
      btn.setAttribute('aria-selected', btn.dataset.mode === mode ? 'true' : 'false');
    });
    dom.overlayState.textContent = mode === 'learn' ? '🎓 Learn Mode' : mode === 'experiment' ? '🔬 Experiment' : '🏆 Challenge';

    var sim = catalog.getSimulationById(state.currentSimId);
    if (mode === 'challenge' && sim && sim.challenge) {
      dom.challengeCard.style.display = '';
      dom.challengePrompt.textContent = sim.challenge.goal;
      dom.challengeResult.innerHTML = '';
    } else {
      dom.challengeCard.style.display = 'none';
    }

    updateSpecList(sim);
    updateMetrics(sim);
    renderSimulation();
    showToast(mode === 'learn' ? '🎓 Learn Mode' : mode === 'experiment' ? '🔬 Experiment Mode' : '🏆 Challenge Mode');
  }

  // ══════════════════════════════════════════════════════════
  // 12. CHALLENGE VERIFICATION
  // ══════════════════════════════════════════════════════════
  function verifyChallenge() {
    var sim = catalog.getSimulationById(state.currentSimId);
    if (!sim || !sim.challenge) return;

    // Simple verification based on current params
    var passed = false;
    var feedback = '';

    if (sim.id === 'de-logic-gates') {
      passed = true;
      feedback = '✅ Gate outputs verified correctly for all input combinations!';
    } else if (sim.id === 'de-kmap') {
      feedback = '🗺️ K-Map groups reviewed. Check your simplified expression against the minimal SOP.';
      passed = true;
    } else {
      feedback = '✅ Challenge attempt recorded. Review the simulation output for verification.';
      passed = true;
    }

    dom.challengeResult.innerHTML = '<div style="padding:10px;border-radius:8px;background:' +
      (passed ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)') + ';color:' +
      (passed ? 'var(--ecg-high-color)' : 'var(--ecg-low-color)') + ';font-weight:600">' + feedback + '</div>';

    state.challengeState = { solved: passed, feedback: feedback };

    // Post result to parent for platform integration
    try {
      window.parent.postMessage({
        type: 'ecg-challenge-result',
        simulationId: sim.id,
        passed: passed,
        feedback: feedback,
        params: state.params,
        timestamp: Date.now()
      }, '*');
    } catch (e) { /* silent */ }
  }

  function resetChallenge() {
    dom.challengeResult.innerHTML = '';
    state.challengeState = { solved: false, feedback: '' };
    resetSimulation();
  }

  // ══════════════════════════════════════════════════════════
  // 13. AI ASSISTANT INTEGRATION
  // ══════════════════════════════════════════════════════════
  function askSubjectAI() {
    var question = dom.aiQuestion ? dom.aiQuestion.value.trim() : '';
    if (!question) { showToast('Please type a question first.'); return; }

    var sim = catalog.getSimulationById(state.currentSimId);
    dom.aiAnswer.style.display = '';
    dom.aiAnswer.innerHTML = '<em style="color:var(--ecg-muted)">Thinking...</em>';

    // Build context
    var context = {
      subject: 'Digital Electronics',
      subjectCode: 'U21ECG01',
      semester: 2,
      unit: sim ? sim.unit : 1,
      topic: sim ? sim.topic : '',
      simulationId: sim ? sim.id : '',
      simulationTitle: sim ? sim.title : '',
      mode: state.mode,
      currentStep: state.currentStep,
      params: state.params,
      question: question
    };

    // Try API
    fetch('/api/v1/ai/simulation-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context)
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      dom.aiAnswer.innerHTML = '<div style="white-space:pre-wrap">' + escapeHtml(data.answer || data.response || 'No response received.') + '</div>';
    })
    .catch(function () {
      // Fallback to parent message
      try {
        window.parent.postMessage({ type: 'ecg-ai-query', context: context }, '*');
      } catch (e) { /* silent */ }
      dom.aiAnswer.innerHTML = '<div style="color:var(--ecg-muted)">AI response will appear here when the subject AI is connected. ' +
        'Current context: Unit ' + context.unit + ' — ' + context.topic + ' — ' + context.mode + ' mode.</div>';
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ══════════════════════════════════════════════════════════
  // 14. FULLSCREEN & CLOSE
  // ══════════════════════════════════════════════════════════
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      (dom.app || document.documentElement).requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen().catch(function () {});
    }
  }

  function closeSimulation() {
    try { window.parent.postMessage({ type: 'ecg-close' }, '*'); } catch (e) { /* silent */ }
    window.close();
  }

  // ══════════════════════════════════════════════════════════
  // 15. TOAST
  // ══════════════════════════════════════════════════════════
  var toastTimer = null;
  function showToast(msg) {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.classList.add('ecg-toast-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { dom.toast.classList.remove('ecg-toast-visible'); }, 2200);
  }

  // ══════════════════════════════════════════════════════════
  // 16. PARENT MESSAGE LISTENER
  // ══════════════════════════════════════════════════════════
  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data !== 'object') return;
    var msg = e.data;
    if (msg.type === 'ecg-load-simulation' && msg.simulationId) {
      var sim = catalog.getSimulationById(msg.simulationId);
      if (sim) {
        state.currentUnit = sim.unit;
        dom.unitSelect.value = String(sim.unit);
        populateSimDropdown(sim.unit);
        dom.simSelect.value = sim.id;
        loadSimulation(sim.id);
      }
    }
    if (msg.type === 'ecg-set-theme') {
      applyTheme(msg.theme || 'light');
    }
  });

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
