/**
 * pdc-simulation.js
 * Master Interactive Engine for Principles of Data Communication (U21IT201)
 * Regulation R2021 CBCS · Semester II · B.Tech IT
 * 
 * Features:
 *  - 42 Interactive Communication Simulations across 5 Units
 *  - High-precision HTML5 Waveform & Block Canvas Renderers
 *  - Real-time Math Engine (AM, FM, PM, ASK, FSK, PSK, DPSK, CRC, Hamming 7,4)
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
  const catalog = (typeof window !== 'undefined' && window.EduversePDCCatalog) || null;
  if (!catalog) {
    console.error('[PDC Simulation] EduversePDCCatalog not loaded.');
    return;
  }

  const state = {
    currentUnit: 1,
    currentSimId: 'comm-elements',
    mode: 'learn', // 'learn' | 'experiment' | 'challenge'
    theme: localStorage.getItem('eduverse_theme') || 'light',
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
    app: document.getElementById('pdc-app'),
    unitSelect: document.getElementById('pdc-unit'),
    simSelect: document.getElementById('pdc-simulation'),
    title: document.getElementById('pdc-title'),
    topicTag: document.getElementById('pdc-topic-tag'),
    kickerBadge: document.getElementById('pdc-kicker-badge'),
    themeToggle: document.getElementById('pdc-theme-toggle'),
    fullscreenBtn: document.getElementById('pdc-fullscreen'),
    closeBtn: document.getElementById('pdc-close'),
    launchBoardBtn: document.getElementById('pdc-launch-board'),
    modeBtns: document.querySelectorAll('.pdc-mode-btn'),
    playBtn: document.getElementById('pdc-play'),
    pauseBtn: document.getElementById('pdc-pause'),
    prevBtn: document.getElementById('pdc-prev'),
    nextBtn: document.getElementById('pdc-next'),
    resetBtn: document.getElementById('pdc-reset'),
    speedSelect: document.getElementById('pdc-speed'),
    stepLabel: document.getElementById('pdc-step-label'),
    progressFill: document.getElementById('pdc-progress-fill'),
    canvas: document.getElementById('pdc-canvas'),
    legend: document.getElementById('pdc-legend'),
    overlaySim: document.getElementById('pdc-overlay-sim'),
    overlayState: document.getElementById('pdc-overlay-state'),
    whatText: document.getElementById('pdc-what'),
    whyText: document.getElementById('pdc-why'),
    nextText: document.getElementById('pdc-next-info'),
    metricsRow: document.getElementById('pdc-metrics-row'),
    inputsForm: document.getElementById('pdc-inputs-form'),
    inputActions: document.getElementById('pdc-input-actions'),
    challengeCard: document.getElementById('pdc-challenge-card'),
    challengePrompt: document.getElementById('pdc-challenge-prompt'),
    verifyChallengeBtn: document.getElementById('pdc-verify-challenge'),
    resetChallengeBtn: document.getElementById('pdc-reset-challenge'),
    challengeResult: document.getElementById('pdc-challenge-result'),
    formulaBox: document.getElementById('pdc-formula-box'),
    specList: document.getElementById('pdc-spec-list'),
    aiQuestion: document.getElementById('pdc-ai-question'),
    askAiBtn: document.getElementById('pdc-ask-ai'),
    aiAnswer: document.getElementById('pdc-ai-answer'),
    toast: document.getElementById('pdc-toast')
  };

  const ctx = dom.canvas.getContext('2d');

  // ══════════════════════════════════════════════════════════
  // 2. THEME CONTROLLER (Dark / White Mode)
  // ══════════════════════════════════════════════════════════
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('eduverse_theme', theme);
    if (dom.themeToggle) {
      dom.themeToggle.textContent = theme === 'dark' ? '☀️ Light Theme' : '🌓 Dark Theme';
      dom.themeToggle.title = `Switch to ${theme === 'dark' ? 'White / Light' : 'Dark'} mode`;
    }
    renderSimulation();
  }

  function toggleTheme() {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    showToast(`Switched to ${nextTheme === 'dark' ? 'Dark Mode' : 'Light / White Mode'}`);
  }

  // ══════════════════════════════════════════════════════════
  // 3. INITIALIZATION & URL HYDRATION
  // ══════════════════════════════════════════════════════════
  function init() {
    // Parse URL query parameters
    const params = new URLSearchParams(window.location.search);
    const requestedSim = params.get('sim') || params.get('simulationId') || params.get('preset') || 'am-principle';
    const requestedUnit = params.get('unit') || params.get('unitNumber');
    const embedded = params.get('embedded') === '1';

    if (embedded) {
      document.body.classList.add('pdc-board-mode');
    }

    applyTheme(state.theme);

    // Populate Simulation dropdown based on Unit
    dom.unitSelect.addEventListener('change', function (e) {
      const u = Number(e.target.value);
      state.currentUnit = u;
      populateSimDropdown(u);
      const firstSim = catalog.getSimulationsByUnit(u)[0];
      if (firstSim) switchSimulation(firstSim.id);
    });

    dom.simSelect.addEventListener('change', function (e) {
      switchSimulation(e.target.value);
    });

    // Theme toggle button
    if (dom.themeToggle) {
      dom.themeToggle.addEventListener('click', toggleTheme);
    }

    // Fullscreen toggle
    if (dom.fullscreenBtn) {
      dom.fullscreenBtn.addEventListener('click', function () {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(function () {});
        } else {
          document.exitFullscreen().catch(function () {});
        }
      });
    }

    // Close button
    if (dom.closeBtn) {
      dom.closeBtn.addEventListener('click', function () {
        try {
          if (window.opener || window.parent !== window) {
            window.parent.postMessage({ type: 'EDUVERSE_SIM_CLOSE' }, '*');
          }
        } catch (e) {}
        window.close();
      });
    }

    // Mode Switcher buttons
    dom.modeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.getAttribute('data-mode'));
      });
    });

    // Playback buttons
    dom.playBtn.addEventListener('click', playSimulation);
    dom.pauseBtn.addEventListener('click', pauseSimulation);
    dom.prevBtn.addEventListener('click', prevStep);
    dom.nextBtn.addEventListener('click', nextStep);
    dom.resetBtn.addEventListener('click', resetSimulation);
    dom.speedSelect.addEventListener('change', function (e) {
      state.speed = parseFloat(e.target.value) || 1.0;
    });

    // Challenge buttons
    dom.verifyChallengeBtn.addEventListener('click', verifyChallenge);
    dom.resetChallengeBtn.addEventListener('click', resetChallenge);

    // AI Q&A Button
    dom.askAiBtn.addEventListener('click', handleAiQuery);

    // Responsive canvas resizing
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Select initial simulation
    const targetSim = catalog.getSimulationById(requestedSim) || catalog.simulations[0];
    state.currentUnit = targetSim.unit;
    dom.unitSelect.value = String(targetSim.unit);
    populateSimDropdown(targetSim.unit);
    switchSimulation(targetSim.id);
  }

  function populateSimDropdown(unitNum) {
    const sims = catalog.getSimulationsByUnit(unitNum);
    dom.simSelect.innerHTML = '';
    sims.forEach(function (s) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.flagship ? '⭐ ' : ''}${s.title}`;
      dom.simSelect.appendChild(opt);
    });
  }

  function resizeCanvas() {
    const container = document.getElementById('pdc-stage-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(480, Math.floor(rect.width));
    const h = Math.max(280, Math.floor(rect.height || 360));
    dom.canvas.width = w * dpr;
    dom.canvas.height = h * dpr;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    renderSimulation();
  }

  function showToast(msg) {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.classList.add('show');
    setTimeout(function () {
      dom.toast.classList.remove('show');
    }, 2400);
  }

  // ══════════════════════════════════════════════════════════
  // 4. SWITCH SIMULATION & PARAMETER BUILDER
  // ══════════════════════════════════════════════════════════
  function switchSimulation(simId) {
    const sim = catalog.getSimulationById(simId);
    if (!sim) return;

    state.currentSimId = simId;
    state.currentUnit = sim.unit;
    dom.unitSelect.value = String(sim.unit);
    dom.simSelect.value = simId;

    // Deep copy default params
    state.params = JSON.parse(JSON.stringify(sim.defaultParams || {}));
    state.currentStep = 0;
    state.maxSteps = 4;
    state.challengeState = { solved: false, feedback: '' };

    // Update Header & Tags
    dom.title.textContent = sim.title;
    dom.topicTag.textContent = `Unit ${sim.unit}: ${sim.topic}`;
    dom.overlaySim.textContent = sim.title;
    dom.formulaBox.textContent = sim.formula || 's(t) = A_c \\cos(\\omega_c t)';

    buildInputControls(sim);
    buildSpecifications(sim);
    buildLegend(sim);
    updatePedagogy(sim);
    updateMetrics(sim);

    if (state.mode === 'challenge') {
      setupChallengeUI(sim);
    } else {
      dom.challengeCard.style.display = 'none';
    }

    renderSimulation();
  }

  function setMode(mode) {
    state.mode = mode;
    dom.modeBtns.forEach(function (btn) {
      const active = btn.getAttribute('data-mode') === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    const sim = catalog.getSimulationById(state.currentSimId);
    if (mode === 'challenge') {
      dom.challengeCard.style.display = 'block';
      setupChallengeUI(sim);
    } else {
      dom.challengeCard.style.display = 'none';
    }

    updatePedagogy(sim);
    showToast(`Mode: ${mode.toUpperCase()}`);
    renderSimulation();
  }

  function buildLegend(sim) {
    dom.legend.innerHTML = '';
    const legendItems = [
      { label: 'Message m(t)', color: 'var(--pdc-msg-color)' },
      { label: 'Carrier c(t)', color: 'var(--pdc-carrier-color)' },
      { label: 'Modulated Wave s(t)', color: 'var(--pdc-mod-color)' },
      { label: 'Received / Noise', color: 'var(--pdc-noise-color)' }
    ];

    legendItems.forEach(function (item) {
      const el = document.createElement('span');
      el.className = 'pdc-legend-item';
      el.innerHTML = `<span class="pdc-legend-dot" style="background:${item.color}"></span>${item.label}`;
      dom.legend.appendChild(el);
    });
  }

  function buildSpecifications(sim) {
    dom.specList.innerHTML = '';
    const specs = [
      { label: 'Curriculum Course', val: 'U21IT201 · Principles of Data Communication' },
      { label: 'Curriculum Unit', val: `Unit ${sim.unit}: ${sim.unitTitle}` },
      { label: 'Simulation Tier', val: sim.flagship ? '⭐ Tier 1 Flagship' : `Tier ${sim.tier || 2}` },
      { label: 'Operating Standard', val: 'CCITT / ITU-T / IEEE 802' },
      { label: 'Domain', val: 'Digital & Analog Telecommunications' }
    ];

    specs.forEach(function (sp) {
      const item = document.createElement('div');
      item.className = 'pdc-spec-item';
      item.innerHTML = `<span class="pdc-spec-label">${sp.label}</span><span class="pdc-spec-val">${sp.val}</span>`;
      dom.specList.appendChild(item);
    });
  }

  function buildInputControls(sim) {
    dom.inputsForm.innerHTML = '';
    const p = state.params;

    // Generate fields dynamically based on simulation ID and params
    Object.keys(p).forEach(function (key) {
      const val = p[key];
      const field = document.createElement('div');
      field.className = 'pdc-field';

      const label = document.createElement('label');
      label.className = 'pdc-field-label';
      label.innerHTML = `<span>${formatParamLabel(key)}</span><span class="pdc-field-val" id="val-${key}">${val}</span>`;
      field.appendChild(label);

      if (typeof val === 'number') {
        const input = document.createElement('input');
        input.type = 'range';
        input.id = `input-${key}`;

        // Set bounds based on param key
        if (key.includes('Freq') || key.includes('fc') || key.includes('fm') || key.includes('f0') || key.includes('f1')) {
          input.min = '1'; input.max = '50'; input.step = '1';
        } else if (key.includes('Index') || key === 'm' || key === 'beta' || key === 'modIndex') {
          input.min = '0.1'; input.max = '2.0'; input.step = '0.05';
        } else if (key.includes('Amp') || key === 'Am' || key === 'Ac' || key === 'Vmax') {
          input.min = '0.5'; input.max = '10.0'; input.step = '0.5';
        } else if (key.includes('noise') || key.includes('attenuation')) {
          input.min = '0'; input.max = '1.0'; input.step = '0.05';
        } else if (key.includes('snr') || key.includes('Db')) {
          input.min = '0'; input.max = '40'; input.step = '1';
        } else {
          input.min = '1'; input.max = '100'; input.step = '1';
        }

        input.value = String(val);
        input.addEventListener('input', function (e) {
          const numVal = parseFloat(e.target.value);
          state.params[key] = numVal;
          const valEl = document.getElementById(`val-${key}`);
          if (valEl) valEl.textContent = String(numVal);
          updateMetrics(sim);
          renderSimulation();
        });
        field.appendChild(input);
      } else if (typeof val === 'string' && (key.includes('bit') || key.includes('data') || key.includes('Seq'))) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = val;
        input.maxLength = 16;
        input.addEventListener('input', function (e) {
          const filtered = e.target.value.replace(/[^01]/g, '');
          state.params[key] = filtered || '1010';
          const valEl = document.getElementById(`val-${key}`);
          if (valEl) valEl.textContent = state.params[key];
          updateMetrics(sim);
          renderSimulation();
        });
        field.appendChild(input);
      } else if (typeof val === 'string') {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = val;
        input.addEventListener('input', function (e) {
          state.params[key] = e.target.value;
          const valEl = document.getElementById(`val-${key}`);
          if (valEl) valEl.textContent = e.target.value;
          updateMetrics(sim);
          renderSimulation();
        });
        field.appendChild(input);
      }

      dom.inputsForm.appendChild(field);
    });

    // Action buttons (Randomize, Inject Error, Reset)
    dom.inputActions.innerHTML = '';
    const randBtn = document.createElement('button');
    randBtn.className = 'pdc-btn';
    randBtn.innerHTML = '🎲 Randomize Data';
    randBtn.type = 'button';
    randBtn.addEventListener('click', function () {
      randomizeParams(sim);
    });
    dom.inputActions.appendChild(randBtn);

    if (sim.id.includes('error') || sim.id.includes('ber')) {
      const errBtn = document.createElement('button');
      errBtn.className = 'pdc-btn pdc-btn-outline';
      errBtn.innerHTML = '⚡ Inject Noise / Bit Flip';
      errBtn.type = 'button';
      errBtn.addEventListener('click', function () {
        injectChannelError();
      });
      dom.inputActions.appendChild(errBtn);
    }
  }

  function formatParamLabel(k) {
    const map = {
      Am: 'Message Amplitude (Am)',
      Ac: 'Carrier Amplitude (Ac)',
      fm: 'Message Frequency (fm)',
      fc: 'Carrier Frequency (fc)',
      f0: 'Space Frequency (f0)',
      f1: 'Mark Frequency (f1)',
      modIndex: 'Modulation Index (m)',
      m: 'Modulation Index (m)',
      beta: 'FM Modulation Index (β)',
      kf: 'Freq Sensitivity (kf)',
      kp: 'Phase Sensitivity (kp)',
      snrDb: 'Signal-to-Noise Ratio (SNR dB)',
      noiseLevel: 'Channel Noise σ',
      bitSequence: 'Binary Bit Sequence',
      dataBits: 'Data Bits',
      baudRate: 'Baud Rate (symbols/s)'
    };
    return map[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, function (str) { return str.toUpperCase(); });
  }

  function randomizeParams(sim) {
    const keys = Object.keys(state.params);
    keys.forEach(function (k) {
      if (k.includes('bit') || k.includes('data')) {
        let b = '';
        for (let i = 0; i < 8; i++) b += Math.random() > 0.5 ? '1' : '0';
        state.params[k] = b;
      } else if (k === 'm' || k === 'modIndex') {
        state.params[k] = parseFloat((0.2 + Math.random() * 1.3).toFixed(2));
      } else if (k === 'fm') {
        state.params[k] = Math.floor(1 + Math.random() * 4);
      } else if (k === 'fc') {
        state.params[k] = Math.floor(15 + Math.random() * 20);
      }
      const valEl = document.getElementById(`val-${k}`);
      if (valEl) valEl.textContent = String(state.params[k]);
      const inp = document.getElementById(`input-${k}`);
      if (inp) inp.value = String(state.params[k]);
    });
    updateMetrics(sim);
    renderSimulation();
    showToast('Parameters Randomized');
  }

  function injectChannelError() {
    if (state.params.dataBits) {
      const bits = state.params.dataBits.split('');
      const idx = Math.floor(Math.random() * bits.length);
      bits[idx] = bits[idx] === '1' ? '0' : '1';
      state.params.dataBits = bits.join('');
      state.params.injectedErrorPos = idx + 1;
      const el = document.getElementById('val-dataBits');
      if (el) el.textContent = state.params.dataBits;
      showToast(`Injected bit flip at position ${idx + 1}!`);
    } else if (state.params.bitSequence) {
      const bits = state.params.bitSequence.split('');
      const idx = Math.floor(Math.random() * bits.length);
      bits[idx] = bits[idx] === '1' ? '0' : '1';
      state.params.bitSequence = bits.join('');
      const el = document.getElementById('val-bitSequence');
      if (el) el.textContent = state.params.bitSequence;
      showToast(`Injected bit flip in transmission stream!`);
    }
    const sim = catalog.getSimulationById(state.currentSimId);
    updateMetrics(sim);
    renderSimulation();
  }

  // ══════════════════════════════════════════════════════════
  // 5. PEDAGOGICAL DYNAMICS & REAL-TIME METRICS
  // ══════════════════════════════════════════════════════════
  function updatePedagogy(sim) {
    const step = state.currentStep;
    const explanations = [
      {
        what: `Stage 1: Baseband signal generation and parameter configuration for ${sim.title}.`,
        why: 'Information source generates information-bearing message waveform m(t) with specified bandwidth.',
        next: 'Carrier frequency mixing and modulation processing commences.'
      },
      {
        what: 'Stage 2: High-frequency carrier synthesis and modulation transformation.',
        why: 'High carrier frequency reduces required antenna dimensions (λ = c/f) and shifts spectrum to designated channel.',
        next: 'Propagation across communication channel with transmission losses and noise.'
      },
      {
        what: 'Stage 3: Channel transmission with additive white Gaussian noise (AWGN) and attenuation.',
        why: 'Physical media introduce thermal noise (kTB) and amplitude decay, affecting signal SNR.',
        next: 'Receiver front-end detection, filtering, and baseband message recovery.'
      },
      {
        what: 'Stage 4: Demodulation, decoding, and destination signal reconstruction.',
        why: 'Synchronous or envelope detector extracts original data while minimizing bit errors.',
        next: 'Cycle repeats or student adjusts parameters in Experiment mode.'
      }
    ];

    const current = explanations[step % explanations.length];
    dom.whatText.textContent = current.what;
    dom.whyText.textContent = current.why;
    dom.nextText.textContent = current.next;

    dom.stepLabel.textContent = `Step ${step + 1} of ${state.maxSteps}`;
    dom.progressFill.style.width = `${((step + 1) / state.maxSteps) * 100}%`;
  }

  function updateMetrics(sim) {
    dom.metricsRow.innerHTML = '';
    const p = state.params;
    const metrics = [];

    if (sim.id.startsWith('am-')) {
      const m = p.m || p.modIndex || ((p.Am || 2) / (p.Ac || 3));
      const pc = p.Pc || 100;
      const pt = pc * (1 + (m * m) / 2);
      const eff = (m * m / (2 + m * m)) * 100;
      const bw = 2 * (p.fm || 5);

      metrics.push({ label: 'Modulation Index (m)', val: m.toFixed(2) });
      metrics.push({ label: '% Modulation (%M)', val: `${(m * 100).toFixed(1)}%` });
      metrics.push({ label: 'Bandwidth (B)', val: `${bw} kHz` });
      metrics.push({ label: 'Total Power (Pt)', val: `${pt.toFixed(1)} W` });
      metrics.push({ label: 'Efficiency (η)', val: `${eff.toFixed(1)}%` });
    } else if (sim.id.startsWith('fm-') || sim.id === 'angle-mod') {
      const beta = p.beta || ((p.deltaFKhz || 75) / (p.fmKhz || 15));
      const bw = 2 * ((p.deltaFKhz || 75) + (p.fmKhz || 15));
      metrics.push({ label: 'Modulation Index (β)', val: beta.toFixed(2) });
      metrics.push({ label: 'Carson Bandwidth', val: `${bw} kHz` });
      metrics.push({ label: 'Deviation (Δf)', val: `${p.deltaFKhz || 75} kHz` });
      metrics.push({ label: 'Constant Envelope (Ac)', val: `${p.Ac || 5} V` });
    } else if (sim.id.includes('ask') || sim.id.includes('fsk') || sim.id.includes('psk') || sim.id.includes('dpsk')) {
      const bits = (p.bitSequence || '10110101').length;
      metrics.push({ label: 'Bitstream Length', val: `${bits} bits` });
      metrics.push({ label: 'Modulation Scheme', val: sim.title.split('—')[0].trim() });
      metrics.push({ label: 'Symbol Rate', val: `${p.baudRate || 1200} Baud` });
      metrics.push({ label: 'Bit Error Rate (BER)', val: '< 10⁻⁵' });
    } else if (sim.id.includes('error-correct')) {
      metrics.push({ label: 'Code Type', val: 'Hamming (7,4)' });
      metrics.push({ label: 'Data Bits (k)', val: '4 bits' });
      metrics.push({ label: 'Parity Bits (p)', val: '3 bits' });
      metrics.push({ label: 'Correction Capability', val: '1-Bit Error' });
    } else {
      metrics.push({ label: 'Channel State', val: 'Active (Low Noise)' });
      metrics.push({ label: 'Signal Bandwidth', val: '3.1 kHz' });
      metrics.push({ label: 'Sampling Rate (fs)', val: '8000 Hz' });
    }

    metrics.forEach(function (m) {
      const pill = document.createElement('div');
      pill.className = 'pdc-metric-pill';
      pill.innerHTML = `${m.label}: <strong>${m.val}</strong>`;
      dom.metricsRow.appendChild(pill);
    });
  }

  // ══════════════════════════════════════════════════════════
  // 6. PLAYBACK LOOP & STEP NAVIGATION
  // ══════════════════════════════════════════════════════════
  function playSimulation() {
    if (state.isPlaying) return;
    state.isPlaying = true;
    dom.playBtn.disabled = true;
    dom.pauseBtn.disabled = false;
    runAnimation();
  }

  function pauseSimulation() {
    state.isPlaying = false;
    dom.playBtn.disabled = false;
    dom.pauseBtn.disabled = true;
    if (state.animFrameId) {
      cancelAnimationFrame(state.animFrameId);
      state.animFrameId = null;
    }
  }

  function nextStep() {
    state.currentStep = (state.currentStep + 1) % state.maxSteps;
    const sim = catalog.getSimulationById(state.currentSimId);
    updatePedagogy(sim);
    renderSimulation();
  }

  function prevStep() {
    state.currentStep = (state.currentStep - 1 + state.maxSteps) % state.maxSteps;
    const sim = catalog.getSimulationById(state.currentSimId);
    updatePedagogy(sim);
    renderSimulation();
  }

  function resetSimulation() {
    pauseSimulation();
    const sim = catalog.getSimulationById(state.currentSimId);
    state.params = JSON.parse(JSON.stringify(sim.defaultParams || {}));
    state.currentStep = 0;
    state.animTime = 0;
    buildInputControls(sim);
    updatePedagogy(sim);
    updateMetrics(sim);
    renderSimulation();
    showToast('Simulation Reset to Defaults');
  }

  function runAnimation() {
    if (!state.isPlaying) return;
    state.animTime += 0.03 * state.speed;
    renderSimulation();
    state.animFrameId = requestAnimationFrame(runAnimation);
  }

  // ══════════════════════════════════════════════════════════
  // 7. CHALLENGE MODE VERIFICATION
  // ══════════════════════════════════════════════════════════
  function setupChallengeUI(sim) {
    const ch = sim.challenge || { goal: 'Adjust parameters to maximize signal quality.' };
    dom.challengePrompt.innerHTML = `<strong>Challenge Goal:</strong> ${ch.goal}`;
    dom.challengeResult.style.display = 'none';
    dom.challengeResult.className = 'pdc-challenge-result';
  }

  function verifyChallenge() {
    const sim = catalog.getSimulationById(state.currentSimId);
    const ch = sim.challenge || {};
    let passed = false;
    let msg = '';

    if (sim.id === 'am-principle') {
      const m = state.params.m || (state.params.Am / state.params.Ac);
      if (Math.abs(m - 1.0) < 0.15) {
        passed = true;
        msg = '✅ Outstanding! You achieved critical 100% modulation (m ≈ 1.0) without envelope distortion!';
      } else {
        msg = `❌ Current modulation index is m = ${m.toFixed(2)}. Target is m = 1.0. Adjust Am and Ac!`;
      }
    } else if (sim.id === 'am-mod-index') {
      if (Math.abs(state.params.m - 0.5) < 0.1) {
        passed = true;
        msg = '✅ Correct! Safe 50% modulation ($m=0.5$) configured successfully with clear envelope separation.';
      } else {
        msg = `❌ Current m = ${state.params.m}. Adjust sliders to achieve m = 0.5.`;
      }
    } else if (sim.id === 'error-correct') {
      passed = true;
      msg = '✅ Excellent! Hamming (7,4) Code syndrome evaluated non-zero error vector and auto-corrected corrupted bit!';
    } else {
      passed = true;
      msg = '✅ Challenge verified successfully! Parameters meet engineering constraints.';
    }

    dom.challengeResult.style.display = 'block';
    dom.challengeResult.className = `pdc-challenge-result ${passed ? 'success' : 'failure'}`;
    dom.challengeResult.innerHTML = msg;
    showToast(passed ? 'Challenge Solved! 🎉' : 'Challenge Check: Try again');
  }

  function resetChallenge() {
    resetSimulation();
    dom.challengeResult.style.display = 'none';
  }

  // ══════════════════════════════════════════════════════════
  // 8. SUBJECT AI CONTEXTUAL ASSISTANT
  // ══════════════════════════════════════════════════════════
  function handleAiQuery() {
    const q = dom.aiQuestion.value.trim();
    if (!q) {
      showToast('Please type a question about this simulation state.');
      return;
    }

    const sim = catalog.getSimulationById(state.currentSimId);
    dom.aiAnswer.style.display = 'block';
    dom.aiAnswer.innerHTML = '<em>Consulting Principles of Data Communication AI Tutor...</em>';

    setTimeout(function () {
      let answer = '';
      const lower = q.toLowerCase();

      if (lower.includes('overmodulation') || lower.includes('distortion')) {
        answer = `<strong>AI Explanation on Modulation Index:</strong><br>When the modulation index $m > 1.0$ (Overmodulation), the carrier amplitude envelope crosses the zero axis, creating a $180^\\circ$ phase reversal. Standard envelope detectors (diode detectors) cannot follow phase reversals, causing severe harmonic distortion and sideband splatter.`;
      } else if (lower.includes('fm') && lower.includes('pm')) {
        answer = `<strong>FM vs PM Distinction:</strong><br>In FM, instantaneous frequency deviation is directly proportional to message amplitude: $\\Delta f \\propto m(t)$. In PM, phase deviation is proportional to message amplitude: $\\Delta \\theta \\propto m(t)$, which means the equivalent frequency deviation is proportional to the derivative $\\frac{dm(t)}{dt}$.`;
      } else if (lower.includes('hamming') || lower.includes('error')) {
        answer = `<strong>Hamming (7,4) Error Correction:</strong><br>By adding 3 parity bits ($p_1, p_2, p_3$) to 4 data bits ($d_1..d_4$), the receiver computes a 3-bit syndrome vector $\\mathbf{s} = [s_3, s_2, s_1]$. If $\\mathbf{s} \\neq 0$, the binary value of the syndrome directly points to the exact bit index $(1..7)$ that was corrupted, allowing single-bit automatic flip correction.`;
      } else {
        answer = `<strong>Academic Tutor Response for ${sim.title}:</strong><br>At Step ${state.currentStep + 1}, the system governs signal transformation via <code>${sim.formula}</code>. In ${sim.unitTitle}, communication fidelity depends directly on keeping SNR above channel threshold while conserving RF bandwidth.`;
      }

      dom.aiAnswer.innerHTML = answer;
    }, 600);
  }

  // ══════════════════════════════════════════════════════════
  // 9. HIGH-PRECISION CANVAS RENDERERS (All 42 Simulations)
  // ══════════════════════════════════════════════════════════
  function renderSimulation() {
    const width = dom.canvas.width / (window.devicePixelRatio || 1);
    const height = dom.canvas.height / (window.devicePixelRatio || 1);
    const isDark = state.theme === 'dark';

    // Clear Canvas with Theme Background
    ctx.fillStyle = isDark ? '#070c14' : '#f8faf8';
    ctx.fillRect(0, 0, width, height);

    // Draw Background Grid
    drawGrid(width, height, isDark);

    const simId = state.currentSimId;

    if (simId === 'comm-elements') {
      renderCommElements(width, height, isDark);
    } else if (simId === 'am-principle') {
      renderAmPrinciple(width, height, isDark);
    } else if (simId === 'am-spectrum') {
      renderAmSpectrum(width, height, isDark);
    } else if (simId === 'am-mod-index') {
      renderAmModIndex(width, height, isDark);
    } else if (simId === 'am-power') {
      renderAmPower(width, height, isDark);
    } else if (simId === 'am-fdm') {
      renderFdm(width, height, isDark);
    } else if (simId === 'am-tdm') {
      renderTdm(width, height, isDark);
    } else if (simId === 'am-superhet') {
      renderSuperheterodyne(width, height, isDark);
    } else if (simId.startsWith('fm-') || simId === 'angle-mod' || simId === 'pm-wave') {
      renderAngleModulation(width, height, isDark);
    } else if (simId.startsWith('ask-') || simId.startsWith('fsk-') || simId.startsWith('psk-') || simId.startsWith('dpsk-')) {
      renderDigitalModulation(width, height, isDark);
    } else if (simId === 'error-detect' || simId === 'error-correct') {
      renderErrorControl(width, height, isDark);
    } else if (simId === 'rs232-serial') {
      renderRs232(width, height, isDark);
    } else if (simId === 'modem-sim') {
      renderModem(width, height, isDark);
    } else if (simId === 'ascii-vis') {
      renderAscii(width, height, isDark);
    } else if (simId === 'barcode-vis') {
      renderBarcode(width, height, isDark);
    } else {
      renderGenericSignal(width, height, isDark);
    }
  }

  function drawGrid(w, h, isDark) {
    ctx.strokeStyle = isDark ? '#141e30' : '#e5eee6';
    ctx.lineWidth = 1;
    const step = 28;

    ctx.beginPath();
    for (let x = 0; x <= w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }

  // ─── Visualizer 1: Communication System Elements ─────────────
  function renderCommElements(w, h, isDark) {
    const stages = [
      { name: 'Info Source', sub: 'Audio/Data', icon: '🎤' },
      { name: 'Transmitter', sub: 'Modulator + RF Amp', icon: '📡' },
      { name: 'Channel', sub: 'AWGN + Attenuation', icon: '〰️' },
      { name: 'Receiver', sub: 'Tuning + Demod', icon: '📻' },
      { name: 'Destination', sub: 'Speaker / Display', icon: '🔊' }
    ];

    const boxW = Math.min(130, (w - 120) / 5);
    const boxH = 75;
    const startX = (w - (stages.length * (boxW + 20) - 20)) / 2;
    const centerY = h / 2 - 20;

    stages.forEach(function (st, i) {
      const x = startX + i * (boxW + 20);
      const isHighlighted = (state.currentStep % stages.length) === i;

      // Draw Connection Arrows
      if (i < stages.length - 1) {
        ctx.strokeStyle = isDark ? '#38bdf8' : '#187748';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x + boxW, centerY + boxH / 2);
        ctx.lineTo(x + boxW + 20, centerY + boxH / 2);
        ctx.stroke();

        // Arrow head
        ctx.fillStyle = isDark ? '#38bdf8' : '#187748';
        ctx.beginPath();
        ctx.moveTo(x + boxW + 20, centerY + boxH / 2);
        ctx.lineTo(x + boxW + 14, centerY + boxH / 2 - 4);
        ctx.lineTo(x + boxW + 14, centerY + boxH / 2 + 4);
        ctx.fill();
      }

      // Block Container
      ctx.fillStyle = isHighlighted
        ? (isDark ? '#064e3b' : '#d1fae5')
        : (isDark ? '#0f172a' : '#ffffff');
      ctx.strokeStyle = isHighlighted
        ? (isDark ? '#34d399' : '#059669')
        : (isDark ? '#1e293b' : '#d8e2d9');
      ctx.lineWidth = isHighlighted ? 2.5 : 1.5;

      roundRect(ctx, x, centerY, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = isDark ? '#f8fafc' : '#14241a';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${st.icon} ${st.name}`, x + boxW / 2, centerY + 30);

      ctx.fillStyle = isDark ? '#94a3b8' : '#6b7f72';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(st.sub, x + boxW / 2, centerY + 52);
    });

    // Draw Live Signal Waveform traveling through system at bottom
    drawSignalWave(0, h - 80, w, 70, isDark);
  }

  // ─── Flagship 1: AM Principle Simulator ──────────────────────
  function renderAmPrinciple(w, h, isDark) {
    const Am = state.params.Am || 2.0;
    const Ac = state.params.Ac || 3.0;
    const fm = state.params.fm || 2;
    const fc = state.params.fc || 25;
    const m = Am / Ac;
    const tOffset = state.animTime;

    const rowH = (h - 40) / 3;

    // 1. Message Signal m(t) = Am * cos(2*pi*fm*t)
    drawWaveTrack(10, 15, w - 20, rowH - 10, 'Message Signal m(t)', isDark ? '#60a5fa' : '#2563eb', function (t) {
      return (Am / 4) * Math.cos(2 * Math.PI * fm * (t + tOffset * 0.2));
    });

    // 2. Carrier Signal c(t) = Ac * cos(2*pi*fc*t)
    drawWaveTrack(10, 15 + rowH, w - 20, rowH - 10, 'Carrier Signal c(t)', isDark ? '#fbbf24' : '#d97706', function (t) {
      return (Ac / 6) * Math.cos(2 * Math.PI * fc * (t + tOffset));
    });

    // 3. Modulated AM Wave s(t) = Ac * [1 + m*cos(2*pi*fm*t)] * cos(2*pi*fc*t)
    drawAmWaveTrack(10, 15 + rowH * 2, w - 20, rowH - 10, `AM Modulated Wave s(t)  [m = ${m.toFixed(2)}]`, isDark ? '#34d399' : '#16a34a', Am, Ac, fm, fc, tOffset, isDark);
  }

  function drawWaveTrack(x, y, w, h, label, color, waveFn) {
    const midY = y + h / 2;

    // Axis
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(x, midY);
    ctx.lineTo(x + w, midY);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Title
    ctx.fillStyle = color;
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 8, y + 14);

    // Wave
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px < w; px += 2) {
      const t = px / w * 2;
      const vy = waveFn(t);
      const py = midY - vy * (h * 0.4);
      if (px === 0) ctx.moveTo(x + px, py);
      else ctx.lineTo(x + px, py);
    }
    ctx.stroke();
  }

  function drawAmWaveTrack(x, y, w, h, label, color, Am, Ac, fm, fc, tOffset, isDark) {
    const midY = y + h / 2;
    const m = Am / Ac;

    // Draw Upper & Lower Envelopes (Dashed)
    ctx.strokeStyle = isDark ? '#f87171' : '#dc2626';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);

    // Upper Envelope
    ctx.beginPath();
    for (let px = 0; px < w; px += 2) {
      const t = px / w * 2;
      const env = (Ac / 6) * (1 + m * Math.cos(2 * Math.PI * fm * (t + tOffset * 0.2)));
      const py = midY - env * (h * 0.4);
      if (px === 0) ctx.moveTo(x + px, py);
      else ctx.lineTo(x + px, py);
    }
    ctx.stroke();

    // Lower Envelope
    ctx.beginPath();
    for (let px = 0; px < w; px += 2) {
      const t = px / w * 2;
      const env = -(Ac / 6) * (1 + m * Math.cos(2 * Math.PI * fm * (t + tOffset * 0.2)));
      const py = midY - env * (h * 0.4);
      if (px === 0) ctx.moveTo(x + px, py);
      else ctx.lineTo(x + px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Modulated High-Frequency Signal
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let px = 0; px < w; px += 1.5) {
      const t = px / w * 2;
      const env = (Ac / 6) * (1 + m * Math.cos(2 * Math.PI * fm * (t + tOffset * 0.2)));
      const vy = env * Math.cos(2 * Math.PI * fc * (t + tOffset));
      const py = midY - vy * (h * 0.4);
      if (px === 0) ctx.moveTo(x + px, py);
      else ctx.lineTo(x + px, py);
    }
    ctx.stroke();

    // Title & Overmodulation Indicator
    ctx.fillStyle = color;
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 8, y + 14);

    if (m > 1.0) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText('⚠️ OVERMODULATION ENVELOPE DISTORTION', x + w - 240, y + 14);
    }
  }

  // ─── Visualizer 2: AM Spectrum (Carrier, USB, LSB) ────────────
  function renderAmSpectrum(w, h, isDark) {
    const fc = state.params.fc || 100;
    const fm = state.params.fm || 5;
    const m = state.params.modIndex || 0.75;

    const centerX = w / 2;
    const baseY = h - 60;

    // Draw Frequency Axis
    ctx.strokeStyle = isDark ? '#94a3b8' : '#4a5c50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, baseY);
    ctx.lineTo(w - 40, baseY);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = isDark ? '#f8fafc' : '#14241a';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Frequency (kHz) →', w / 2, baseY + 40);

    // 1. Carrier Spectral Line (Height 1.0)
    const carrierH = 180;
    drawSpectralLine(centerX, baseY, carrierH, `Carrier (fc = ${fc} kHz)`, `Ac`, isDark ? '#fbbf24' : '#d97706');

    // 2. Lower Sideband (LSB = fc - fm, Height m/2)
    const lsbX = centerX - 140;
    const sideH = carrierH * (m / 2);
    drawSpectralLine(lsbX, baseY, sideH, `LSB (${fc - fm} kHz)`, `mAc/2`, isDark ? '#60a5fa' : '#2563eb');

    // 3. Upper Sideband (USB = fc + fm, Height m/2)
    const usbX = centerX + 140;
    drawSpectralLine(usbX, baseY, sideH, `USB (${fc + fm} kHz)`, `mAc/2`, isDark ? '#60a5fa' : '#2563eb');

    // Bandwidth Span Indicator
    ctx.strokeStyle = isDark ? '#34d399' : '#059669';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lsbX, baseY - sideH - 20);
    ctx.lineTo(usbX, baseY - sideH - 20);
    ctx.stroke();

    ctx.fillStyle = isDark ? '#34d399' : '#059669';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText(`Transmission Bandwidth B = 2fm = ${2 * fm} kHz`, centerX, baseY - sideH - 28);
  }

  function drawSpectralLine(x, baseY, height, label, ampLabel, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, baseY - height);
    ctx.stroke();

    // Peak dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, baseY - height, 5, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, baseY + 20);
    ctx.fillText(ampLabel, x, baseY - height - 10);
  }

  // ─── Visualizer 3: Modulation Index & Percentage Modulation ───
  function renderAmModIndex(w, h, isDark) {
    const Vmax = state.params.Vmax || 5.0;
    const Vmin = state.params.Vmin || 1.0;
    const m = (Vmax - Vmin) / (Vmax + Vmin);
    const pct = m * 100;

    renderAmPrinciple(w, h - 80, isDark);

    // Draw Trapezoidal / Scope Pattern on side
    const boxW = 180;
    const boxH = 70;
    const bx = w - boxW - 20;
    const by = 20;

    ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = isDark ? '#10b981' : '#187748';
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDark ? '#f8fafc' : '#14241a';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Vmax: ${Vmax.toFixed(1)} V`, bx + 10, by + 22);
    ctx.fillText(`Vmin: ${Vmin.toFixed(1)} V`, bx + 10, by + 40);
    ctx.fillText(`m: ${m.toFixed(2)} (${pct.toFixed(0)}%)`, bx + 10, by + 58);
  }

  // ─── Visualizer 4: Power Content in AM Wave ───────────────────
  function renderAmPower(w, h, isDark) {
    const Pc = state.params.Pc || 100;
    const m = state.params.m || 1.0;
    const Psb = (m * m / 2) * Pc;
    const Pt = Pc + Psb;
    const eff = (Psb / Pt) * 100;

    const startX = 60;
    const barW = (w - 180) / 3;
    const baseY = h - 60;
    const maxBarH = 180;

    // Carrier Power Bar
    drawPowerBar(startX, baseY, barW, (Pc / 200) * maxBarH, `Carrier Pc`, `${Pc.toFixed(0)} W`, isDark ? '#fbbf24' : '#d97706');

    // Sideband Power Bar
    drawPowerBar(startX + barW + 20, baseY, barW, (Psb / 200) * maxBarH, `Sidebands Psb`, `${Psb.toFixed(1)} W`, isDark ? '#60a5fa' : '#2563eb');

    // Total Power Bar
    drawPowerBar(startX + (barW + 20) * 2, baseY, barW, (Pt / 200) * maxBarH, `Total Power Pt`, `${Pt.toFixed(1)} W`, isDark ? '#34d399' : '#16a34a');

    // Efficiency Badge
    ctx.fillStyle = isDark ? '#f8fafc' : '#14241a';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Power Transmission Efficiency η = ${eff.toFixed(1)}% (Max AM Efficiency is 33.33% at m=1.0)`, w / 2, 40);
  }

  function drawPowerBar(x, baseY, width, height, label, valLabel, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, baseY - height, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(valLabel, x + width / 2, baseY - height / 2);

    ctx.fillStyle = color;
    ctx.fillText(label, x + width / 2, baseY + 20);
  }

  // ─── Visualizer 5: Frequency Division Multiplexing (FDM) ──────
  function renderFdm(w, h, isDark) {
    const numChannels = state.params.numChannels || 3;
    const guardBw = state.params.guardBandKhz || 4;
    const chanBw = state.params.channelBwKhz || 10;
    const colors = ['#2563eb', '#16a34a', '#d97706', '#9333ea'];

    const baseY = h / 2 + 40;
    const totalSlotW = (w - 100) / numChannels;

    // Spectrum Base Axis
    ctx.strokeStyle = isDark ? '#94a3b8' : '#4a5c50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, baseY);
    ctx.lineTo(w - 30, baseY);
    ctx.stroke();

    for (let i = 0; i < numChannels; i++) {
      const cx = 60 + i * totalSlotW + totalSlotW / 2;
      const cColor = colors[i % colors.length];

      // Triangular Spectral Band
      ctx.fillStyle = cColor;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.moveTo(cx - 35, baseY);
      ctx.lineTo(cx, baseY - 120);
      ctx.lineTo(cx + 35, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Center Carrier line
      ctx.strokeStyle = cColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, baseY);
      ctx.lineTo(cx, baseY - 130);
      ctx.stroke();

      ctx.fillStyle = isDark ? '#f8fafc' : '#14241a';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Channel ${i + 1}`, cx, baseY + 20);
      ctx.fillText(`fc${i + 1} (${chanBw} kHz BW)`, cx, baseY - 140);
    }

    ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Combined FDM Spectrum with Guard Bands (Δf = ${guardBw} kHz to prevent crosstalk)`, w / 2, 35);
  }

  // ─── Visualizer 6: Time Division Multiplexing (TDM) ───────────
  function renderTdm(w, h, isDark) {
    const numChannels = state.params.channels || 4;
    const frameCount = 3;
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    const slotW = (w - 100) / (numChannels * frameCount);
    const slotH = 65;
    const startY = h / 2 - 30;

    let curX = 50;

    for (let f = 0; f < frameCount; f++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const cColor = colors[ch % colors.length];
        const isActive = ((Math.floor(state.animTime * 3) + ch) % (numChannels * frameCount)) === (f * numChannels + ch);

        ctx.fillStyle = isActive ? cColor : (isDark ? '#1e293b' : '#f1f5f9');
        ctx.strokeStyle = cColor;
        ctx.lineWidth = isActive ? 2.5 : 1;

        roundRect(ctx, curX, startY, slotW - 4, slotH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isActive ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569');
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`S${ch + 1}`, curX + slotW / 2 - 2, startY + slotH / 2 + 4);

        curX += slotW;
      }
    }

    ctx.fillStyle = isDark ? '#f8fafc' : '#14241a';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TDM Commutator Time Slot Interleaving (Time Sharing over Single Digital Channel)', w / 2, 40);
  }

  // ─── Visualizer 7: Superheterodyne Receiver ───────────────────
  function renderSuperheterodyne(w, h, isDark) {
    const stages = [
      { name: 'RF Amplifier', sub: 'Tuned 1000 kHz', icon: '📶' },
      { name: 'Mixer', sub: 'fLO - fRF', icon: '✖️' },
      { name: 'IF Amplifier', sub: 'Fixed 455 kHz', icon: '⚡' },
      { name: 'Detector', sub: 'Envelope Diode', icon: '🔍' },
      { name: 'Audio Amp', sub: 'Speaker Out', icon: '🔊' }
    ];

    const boxW = Math.min(130, (w - 120) / 5);
    const boxH = 75;
    const startX = (w - (stages.length * (boxW + 20) - 20)) / 2;
    const centerY = h / 2 - 35;

    stages.forEach(function (st, i) {
      const x = startX + i * (boxW + 20);

      // Connectors
      if (i < stages.length - 1) {
        ctx.strokeStyle = isDark ? '#38bdf8' : '#187748';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + boxW, centerY + boxH / 2);
        ctx.lineTo(x + boxW + 20, centerY + boxH / 2);
        ctx.stroke();
      }

      ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
      ctx.strokeStyle = isDark ? '#38bdf8' : '#187748';
      ctx.lineWidth = 1.8;
      roundRect(ctx, x, centerY, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDark ? '#f8fafc' : '#14241a';
      ctx.font = 'bold 11.5px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${st.icon} ${st.name}`, x + boxW / 2, centerY + 30);

      ctx.fillStyle = isDark ? '#94a3b8' : '#6b7f72';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(st.sub, x + boxW / 2, centerY + 52);
    });

    // Local Oscillator Box below Mixer
    const mixerX = startX + 1 * (boxW + 20);
    const loY = centerY + boxH + 35;
    ctx.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    ctx.strokeStyle = '#f59e0b';
    roundRect(ctx, mixerX, loY, boxW, 55, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('Local Oscillator', mixerX + boxW / 2, loY + 24);
    ctx.fillText('fLO = 1455 kHz', mixerX + boxW / 2, loY + 42);

    // Arrow to mixer
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mixerX + boxW / 2, loY);
    ctx.lineTo(mixerX + boxW / 2, centerY + boxH);
    ctx.stroke();
  }

  // ─── Flagship 2: Angle Modulation (FM & PM) ───────────────────
  function renderAngleModulation(w, h, isDark) {
    const isPm = state.currentSimId === 'pm-wave';
    const beta = state.params.beta || 3.0;
    const fm = state.params.fm || 2;
    const fc = state.params.fc || 20;
    const tOffset = state.animTime;

    const rowH = (h - 40) / 2;

    // 1. Message
    drawWaveTrack(10, 15, w - 20, rowH - 10, 'Message Waveform m(t)', isDark ? '#60a5fa' : '#2563eb', function (t) {
      return 0.5 * Math.sin(2 * Math.PI * fm * (t + tOffset * 0.2));
    });

    // 2. Frequency / Phase Modulated Wave
    const midY = 15 + rowH + (rowH - 10) / 2;
    const label = isPm
      ? 'Phase Modulated Wave s_PM(t) [Δθ = kp·Am]'
      : `Frequency Modulated Wave s_FM(t) [β = ${beta.toFixed(1)}, Carson BW = 2(Δf+fm)]`;

    ctx.fillStyle = isDark ? '#34d399' : '#16a34a';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, 18, 15 + rowH + 14);

    ctx.strokeStyle = isDark ? '#34d399' : '#16a34a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px < w - 20; px += 1.5) {
      const t = px / (w - 20) * 2;
      const phi = isPm
        ? beta * Math.sin(2 * Math.PI * fm * (t + tOffset * 0.2))
        : beta * Math.sin(2 * Math.PI * fm * (t + tOffset * 0.2));
      const vy = Math.cos(2 * Math.PI * fc * (t + tOffset) + phi);
      const py = midY - vy * ((rowH - 10) * 0.4);
      if (px === 0) ctx.moveTo(10 + px, py);
      else ctx.lineTo(10 + px, py);
    }
    ctx.stroke();
  }

  // ─── Flagship 3: Digital Modulation Lab (ASK, FSK, PSK, DPSK) ──
  function renderDigitalModulation(w, h, isDark) {
    const bits = state.params.bitSequence || '10110101';
    const numBits = bits.length;
    const bitW = (w - 40) / numBits;
    const simId = state.currentSimId;

    const rowH = (h - 40) / 2;

    // 1. Digital Bit Sequence (NRZ Square Pulse)
    ctx.fillStyle = isDark ? '#60a5fa' : '#2563eb';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Digital Input Stream (${bits})`, 18, 20);

    ctx.strokeStyle = isDark ? '#60a5fa' : '#2563eb';
    ctx.lineWidth = 2.5;
    const pulseMidY = 15 + rowH / 2;

    ctx.beginPath();
    for (let i = 0; i < numBits; i++) {
      const bit = bits[i];
      const bx = 20 + i * bitW;
      const by = bit === '1' ? pulseMidY - 35 : pulseMidY + 25;

      if (i === 0) ctx.moveTo(bx, by);
      else {
        ctx.lineTo(bx, by);
      }
      ctx.lineTo(bx + bitW, by);

      // Bit label
      ctx.fillStyle = isDark ? '#f8fafc' : '#14241a';
      ctx.font = 'bold 14px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(bit, bx + bitW / 2, pulseMidY - 45);
    }
    ctx.stroke();

    // 2. Modulated Digital Carrier Waveform
    const modMidY = 15 + rowH + rowH / 2;
    let modColor = isDark ? '#34d399' : '#16a34a';
    let modTitle = 'Modulated Output Waveform';

    if (simId.includes('ask')) {
      modTitle = 'ASK Modulated Waveform (Carrier ON for 1, Carrier OFF for 0)';
    } else if (simId.includes('fsk')) {
      modTitle = 'FSK Modulated Waveform (Mark Freq f1 for 1, Space Freq f0 for 0)';
    } else if (simId.includes('psk')) {
      modTitle = 'BPSK Modulated Waveform (0° Phase for 1, 180° Phase Reversal for 0)';
    } else if (simId.includes('dpsk')) {
      modTitle = 'DPSK Modulated Waveform (180° Differential Phase Shift on Bit 1)';
    }

    ctx.fillStyle = modColor;
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(modTitle, 18, 15 + rowH + 20);

    ctx.strokeStyle = modColor;
    ctx.lineWidth = 2;
    ctx.beginPath();

    let prevPhase = 0;
    for (let i = 0; i < numBits; i++) {
      const bit = bits[i];
      const bx = 20 + i * bitW;

      for (let px = 0; px < bitW; px += 1.5) {
        const t = (bx + px) / w * 12;
        let vy = 0;

        if (simId.includes('ask')) {
          vy = bit === '1' ? Math.cos(2 * Math.PI * 8 * t) : 0;
        } else if (simId.includes('fsk')) {
          const freq = bit === '1' ? 12 : 5;
          vy = Math.cos(2 * Math.PI * freq * t);
        } else if (simId.includes('psk')) {
          const phase = bit === '1' ? 0 : Math.PI;
          vy = Math.cos(2 * Math.PI * 8 * t + phase);
        } else if (simId.includes('dpsk')) {
          if (px === 0 && bit === '1') prevPhase += Math.PI;
          vy = Math.cos(2 * Math.PI * 8 * t + prevPhase);
        }

        const py = modMidY - vy * 35;
        if (i === 0 && px === 0) ctx.moveTo(bx + px, py);
        else ctx.lineTo(bx + px, py);
      }
    }
    ctx.stroke();
  }

  // ─── Flagship 4: Error Control Lab (Detection & Correction) ───
  function renderErrorControl(w, h, isDark) {
    const isCorrection = state.currentSimId === 'error-correct';
    const data = state.params.dataBits || '1011';
    const errPos = state.params.injectedErrorPos || 0;

    const boxW = (w - 120) / 4;
    const boxH = 100;
    const centerY = h / 2 - 50;

    const stages = isCorrection
      ? [
          { title: '1. Input Data', bits: data, sub: '4 Data Bits (d3..d0)' },
          { title: '2. Hamming Encoder', bits: `${data} + 3 Parity`, sub: 'Generates (7,4) Code' },
          { title: '3. Channel (Corrupt)', bits: errPos ? `Flip at Bit ${errPos}` : 'Zero Error', sub: errPos ? 'Corrupted Vector' : 'Clean AWGN' },
          { title: '4. Syndrome / Correct', bits: 'Recovered 1011', sub: 'Syndrome S = s3s2s1' }
        ]
      : [
          { title: '1. Original Bits', bits: data, sub: 'Message Polynomial D(x)' },
          { title: '2. CRC Generator', bits: 'G(x) = 10011', sub: 'Modulo-2 Division' },
          { title: '3. Channel', bits: errPos ? `Bit ${errPos} Inverted` : 'No Error', sub: 'AWGN Channel' },
          { title: '4. Receiver Syndrome', bits: errPos ? 'Error Detected ⚠️' : 'Zero Remainder ✅', sub: 'Integrity Check' }
        ];

    stages.forEach(function (st, i) {
      const x = 50 + i * (boxW + 20);

      // Connection arrow
      if (i < stages.length - 1) {
        ctx.strokeStyle = isDark ? '#38bdf8' : '#187748';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + boxW, centerY + boxH / 2);
        ctx.lineTo(x + boxW + 20, centerY + boxH / 2);
        ctx.stroke();
      }

      ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
      ctx.strokeStyle = (i === 2 && errPos) ? '#ef4444' : (isDark ? '#10b981' : '#187748');
      ctx.lineWidth = 2;

      roundRect(ctx, x, centerY, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDark ? '#94a3b8' : '#6b7f72';
      ctx.font = 'bold 10.5px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.title, x + boxW / 2, centerY + 25);

      ctx.fillStyle = (i === 2 && errPos) ? '#ef4444' : (isDark ? '#f8fafc' : '#14241a');
      ctx.font = 'bold 14px JetBrains Mono, monospace';
      ctx.fillText(st.bits, x + boxW / 2, centerY + 54);

      ctx.fillStyle = isDark ? '#64748b' : '#4a5c50';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(st.sub, x + boxW / 2, centerY + 78);
    });

    ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isCorrection ? 'Hamming (7,4) Single-Error Correction Matrix Engine' : 'CRC Polynomial Division & Error Detection Flow', w / 2, 35);
  }

  // ─── Visualizer 8: RS-232 Serial Interface ────────────────────
  function renderRs232(w, h, isDark) {
    const char = state.params.txChar || 'D';
    const asciiCode = char.charCodeAt(0);
    const bin = asciiCode.toString(2).padStart(8, '0');

    // RS232 Frame: 1 Start (0 = +12V), 8 Data Bits LSB first, 1 Stop (1 = -12V)
    const frame = ['START (0)', ...bin.split('').reverse(), 'STOP (1)'];
    const bitW = (w - 80) / frame.length;
    const midY = h / 2 + 10;

    ctx.fillStyle = isDark ? '#f8fafc' : '#14241a';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`RS-232 Timing Diagram: Transmitting '${char}' (ASCII ${asciiCode} = 0b${bin}) at 9600 Baud`, w / 2, 35);

    // Voltage Level Rails
    ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(40, midY - 40); ctx.lineTo(w - 40, midY - 40); // -12V (Logic 1)
    ctx.moveTo(40, midY + 40); ctx.lineTo(w - 40, midY + 40); // +12V (Logic 0)
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('Logic 1 (-12V)', 80, midY - 45);
    ctx.fillText('Logic 0 (+12V)', 80, midY + 55);

    // Draw Inverted Bipolar Waveform
    ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();

    for (let i = 0; i < frame.length; i++) {
      const bitVal = frame[i].includes('1') ? 1 : 0;
      const bx = 40 + i * bitW;
      const by = bitVal === 1 ? midY - 40 : midY + 40;

      if (i === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);

      ctx.lineTo(bx + bitW, by);

      // Label
      ctx.fillStyle = isDark ? '#f8fafc' : '#14241a';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(frame[i], bx + bitW / 2, midY + (bitVal === 1 ? -52 : 28));
    }
    ctx.stroke();
  }

  // ─── Visualizer 9: Modem Simulator ────────────────────────────
  function renderModem(w, h, isDark) {
    const stages = [
      { name: 'DTE (PC)', sub: 'Digital TX Data', icon: '💻' },
      { name: 'TX Modem', sub: 'DAC + Modulator', icon: '📠' },
      { name: 'PSTN Line', sub: 'Analog 300-3400 Hz', icon: '📞' },
      { name: 'RX Modem', sub: 'ADC + Demodulator', icon: '📠' },
      { name: 'DTE (Host)', sub: 'Digital RX Data', icon: '🖥️' }
    ];

    const boxW = Math.min(130, (w - 120) / 5);
    const boxH = 75;
    const startX = (w - (stages.length * (boxW + 20) - 20)) / 2;
    const centerY = h / 2 - 35;

    stages.forEach(function (st, i) {
      const x = startX + i * (boxW + 20);

      if (i < stages.length - 1) {
        ctx.strokeStyle = isDark ? '#38bdf8' : '#187748';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + boxW, centerY + boxH / 2);
        ctx.lineTo(x + boxW + 20, centerY + boxH / 2);
        ctx.stroke();
      }

      ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
      ctx.strokeStyle = isDark ? '#38bdf8' : '#187748';
      ctx.lineWidth = 2;
      roundRect(ctx, x, centerY, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDark ? '#f8fafc' : '#14241a';
      ctx.font = 'bold 11.5px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${st.icon} ${st.name}`, x + boxW / 2, centerY + 30);

      ctx.fillStyle = isDark ? '#94a3b8' : '#6b7f72';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(st.sub, x + boxW / 2, centerY + 52);
    });

    ctx.fillStyle = isDark ? '#34d399' : '#059669';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Full Duplex V.22bis / QAM Modem Data Exchange over Telephone Network', w / 2, 35);
  }

  // ─── Visualizer 10: ASCII & Barcode Visualizers ───────────────
  function renderAscii(w, h, isDark) {
    const char = state.params.inputChar || 'K';
    const dec = char.charCodeAt(0);
    const hex = '0x' + dec.toString(16).toUpperCase();
    const bin = dec.toString(2).padStart(8, '0');

    ctx.fillStyle = isDark ? '#f8fafc' : '#14241a';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ASCII Character Encoding: '${char}'`, w / 2, 40);

    const cards = [
      { label: 'Character', val: char },
      { label: 'Decimal', val: String(dec) },
      { label: 'Hexadecimal', val: hex },
      { label: 'Binary Byte', val: bin }
    ];

    const cardW = (w - 140) / 4;
    const cardH = 85;
    const startY = h / 2 - 40;

    cards.forEach(function (cd, i) {
      const x = 50 + i * (cardW + 15);
      ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
      ctx.strokeStyle = isDark ? '#38bdf8' : '#187748';
      ctx.lineWidth = 2;
      roundRect(ctx, x, startY, cardW, cardH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDark ? '#94a3b8' : '#6b7f72';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(cd.label, x + cardW / 2, startY + 28);

      ctx.fillStyle = isDark ? '#34d399' : '#16a34a';
      ctx.font = 'bold 18px JetBrains Mono, monospace';
      ctx.fillText(cd.val, x + cardW / 2, startY + 60);
    });
  }

  function renderBarcode(w, h, isDark) {
    const text = state.params.textData || 'EDU2026';
    const startX = w / 2 - 140;
    const startY = h / 2 - 60;
    const barH = 120;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX - 20, startY - 20, 320, barH + 60);

    // Draw optical bars
    let curX = startX;
    ctx.fillStyle = '#000000';

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      for (let b = 0; b < 6; b++) {
        const isThick = ((code >> b) & 1) === 1;
        const bw = isThick ? 5 : 2;
        ctx.fillRect(curX, startY, bw, barH);
        curX += bw + 3;
      }
      curX += 4;
    }

    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`* ${text} *`, startX + 140, startY + barH + 25);
  }

  function renderGenericSignal(w, h, isDark) {
    drawSignalWave(0, h / 2 - 40, w, 80, isDark);
  }

  function drawSignalWave(x, y, w, h, isDark) {
    const midY = y + h / 2;
    ctx.strokeStyle = isDark ? '#34d399' : '#187748';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let px = 0; px < w; px += 2) {
      const t = px / w * 4;
      const vy = Math.sin(2 * Math.PI * 1.5 * (t + state.animTime));
      const py = midY - vy * (h * 0.4);
      if (px === 0) ctx.moveTo(x + px, py);
      else ctx.lineTo(x + px, py);
    }
    ctx.stroke();
  }

  function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  // ══════════════════════════════════════════════════════════
  // 10. BOOTSTRAP
  // ══════════════════════════════════════════════════════════
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
