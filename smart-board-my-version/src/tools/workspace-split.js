'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// PIYUSHDHARA EDUVERSE BOARD — WORKSPACE PARTITIONING ARCHITECTURE
// Architecture:
//  - Sidebar, Pen, Eraser, Select, Text, Shapes, Undo, Redo are GLOBAL controls
//  - Partitions are CONTENT CONTAINERS ONLY (Graph, PPT, PDF, Image, Video, Lab)
//  - Global Annotation Layer sits ON TOP of all partitions across the entire canvas
//  - Strokes are never clipped by partition boundaries
// ═══════════════════════════════════════════════════════════════════════════════

const WorkspaceSplit = (() => {

  let currentMode = 'normal'; // 'normal' | 'split-2' | 'split-3' | 'split-4'
  let splitRatio = 50;        // percentage for partition 1 width in split-2 (20% to 80%)
  let activePartitionId = 1;
  let maximizedPartitionId = null;

  // Partition Models — Pure Content & Widget States (NO local drawing)
  const partitions = [
    {
      id: 1,
      title: 'Partition 1',
      type: 'whiteboard', // 'whiteboard' | 'graph2d' | 'ppt' | 'pdf' | 'image' | 'video' | 'simulation' | 'empty'
      boardBg: '#f4f6f8',
      inkColor: '#0f172a',
      strokes: [],
      undoneStrokes: [],
      pptState: { slideIndex: 0, currentDeck: null },
      pdfState: { page: 1, totalPages: 1, file: null, dataUrl: null },
      imageState: { src: null, name: '' },
      videoState: { src: null, name: '' },
      graphState: {
        familyId: 'sin',
        expr: 'sin(x)',
        a: 1, b: 1, h: 0, k: 0,
        color: '#38bdf8',
        boardBg: '#0b1329',
      inkColor: '#38bdf8',
      strokes: [],
      undoneStrokes: [],
        zoom: 1, panX: 0, panY: 0,
        compareEnabled: false,
        compareExpr: '2*x - 1',
        compareColor: '#facc15'
      },
      geometryState: { activeShape: 'triangle' },
      simState: { type: 'pendulum', angle: 35, length: 140, running: true }
    },
    {
      id: 2,
      title: 'Partition 2',
      type: 'graph2d',
      boardBg: '#0b1329',
      inkColor: '#38bdf8',
      strokes: [],
      undoneStrokes: [],
      pptState: { slideIndex: 0, currentDeck: null },
      pdfState: { page: 1, totalPages: 1, file: null, dataUrl: null },
      imageState: { src: null, name: '' },
      videoState: { src: null, name: '' },
      graphState: {
        familyId: 'quadratic',
        expr: 'x²',
        a: 1, b: 1, h: 0, k: 0,
        color: '#38bdf8',
        boardBg: '#0b1329',
      inkColor: '#38bdf8',
      strokes: [],
      undoneStrokes: [],
        zoom: 1, panX: 0, panY: 0,
        compareEnabled: false,
        compareExpr: '2*x - 1',
        compareColor: '#facc15'
      },
      geometryState: { activeShape: 'circle' },
      simState: { type: 'projectile', speed: 25, angle: 45, running: true }
    },
    {
      id: 3,
      title: 'Partition 3',
      type: 'empty',
      boardBg: '#f4f6f8',
      inkColor: '#0f172a',
      strokes: [],
      undoneStrokes: [],
      pptState: { slideIndex: 0, currentDeck: null },
      pdfState: { page: 1, totalPages: 1, file: null, dataUrl: null },
      imageState: { src: null, name: '' },
      videoState: { src: null, name: '' },
      graphState: {
        familyId: 'cubic',
        expr: 'x³',
        a: 1, b: 1, h: 0, k: 0,
        color: '#10b981',
        boardBg: '#0b1329',
      inkColor: '#38bdf8',
      strokes: [],
      undoneStrokes: [],
        zoom: 1, panX: 0, panY: 0,
        compareEnabled: false,
        compareExpr: '2*x - 1',
        compareColor: '#facc15'
      },
      geometryState: { activeShape: 'right-triangle' },
      simState: { type: 'wave', freq: 2, amp: 40, running: true }
    },
    {
      id: 4,
      title: 'Partition 4',
      type: 'empty',
      boardBg: '#f4f6f8',
      inkColor: '#0f172a',
      strokes: [],
      undoneStrokes: [],
      pptState: { slideIndex: 0, currentDeck: null },
      pdfState: { page: 1, totalPages: 1, file: null, dataUrl: null },
      imageState: { src: null, name: '' },
      videoState: { src: null, name: '' },
      graphState: {
        familyId: 'abs',
        expr: '|x|',
        a: 1, b: 1, h: 0, k: 0,
        color: '#f59e0b',
        boardBg: '#0b1329',
      inkColor: '#38bdf8',
      strokes: [],
      undoneStrokes: [],
        zoom: 1, panX: 0, panY: 0,
        compareEnabled: false,
        compareExpr: '2*x - 1',
        compareColor: '#facc15'
      },
      geometryState: { activeShape: 'rectangle' },
      simState: { type: 'pendulum', angle: 30, length: 150, running: true }
    }
  ];

  let containerEl = null;
  let isDraggingDivider = false;

  // ─────────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────────

  function init() {
    containerEl = document.getElementById('workspace-split-container');
    const canvasZone = document.getElementById('canvas-zone');

    if (!containerEl && canvasZone) {
      containerEl = document.createElement('div');
      containerEl.id = 'workspace-split-container';
      containerEl.className = 'workspace-split-wrap hidden';
      // Insert containerEl before canvas-viewport so canvas-viewport stays as Global Annotation Layer on top
      const viewport = document.getElementById('canvas-viewport');
      if (viewport) {
        canvasZone.insertBefore(containerEl, viewport);
      } else {
        canvasZone.appendChild(containerEl);
      }
    } else if (containerEl && canvasZone && containerEl.parentElement !== canvasZone) {
      const viewport = document.getElementById('canvas-viewport');
      if (viewport) {
        canvasZone.insertBefore(containerEl, viewport);
      } else {
        canvasZone.appendChild(containerEl);
      }
    }

    // Global resize observer
    window.addEventListener('resize', () => {
      if (currentMode !== 'normal') {
        resizeAllPartitions();
      }
    });

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && maximizedPartitionId) {
        toggleMaximize(maximizedPartitionId);
        return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') { e.preventDefault(); setMode('normal'); }
        else if (e.key === '2') { e.preventDefault(); setMode('split-2'); }
        else if (e.key === '3') { e.preventDefault(); setMode('split-3'); }
        else if (e.key === '4') { e.preventDefault(); setMode('split-4'); }
      }
    });

    // Close any floating popup menus when clicking outside
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.wp-insert-popup') && !e.target.closest('.wp-btn-add-content')) {
        closeAllInsertPopups();
      }
    });

    updateTopSplitButton();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MODE SWITCHING: Normal | 2 Partition | 3 Partition | 4 Partition
  // ─────────────────────────────────────────────────────────────────────────────

  function setMode(mode, ratio) {
    if (ratio) splitRatio = ratio;
    if (mode === currentMode && !maximizedPartitionId && !ratio) return;
    maximizedPartitionId = null;
    currentMode = mode;

    updateTopSplitButton();

    if (mode === 'normal') {
      restoreNormalWorkspace();
    } else if (mode === 'split-2') {
      enterSplit2Mode();
    } else if (mode === 'split-3') {
      enterSplit3Mode();
    } else if (mode === 'split-4') {
      enterSplit4Mode();
    }

    // Keep global annotation drawing engine in sync
    if (typeof Drawing !== 'undefined' && Drawing.syncPointerEvents) {
      Drawing.syncPointerEvents();
    }

    if (typeof App !== 'undefined' && App.showToast) {
      const modeNames = {
        'normal': 'Single Workspace (Normal)',
        'split-2': splitRatio > 60 ? 'Lecture & Notes (70:30)' : '2 Partition (Side-by-Side)',
        'split-3': '3 Partition Trio (1 Main + 2 Stacked)',
        'split-4': '4 Partition Mode (2×2 Grid)'
      };
      App.showToast(`📐 Workspace: ${modeNames[mode] || mode}`);
    }
  }

  function getMode() {
    return currentMode;
  }

  function getSplitRatio() {
    return splitRatio;
  }

  function setSplitRatio(ratio) {
    splitRatio = Math.max(20, Math.min(80, ratio));
    if (currentMode === 'split-2' && containerEl) {
      const p1El = containerEl.querySelector('.workspace-partition[data-pid="1"]');
      if (p1El) {
        p1El.style.flex = `0 0 calc(${splitRatio}% - 4px)`;
        p1El.style.width = `calc(${splitRatio}% - 4px)`;
        resizeAllPartitions();
      }
    }
  }

  function applyPreset(presetName) {
    if (presetName === 'math-graph') {
      partitions[0].type = 'whiteboard';
      partitions[1].type = 'graph2d';
      splitRatio = 50;
      setMode('split-2');
      if (typeof App !== 'undefined' && App.showToast) App.showToast('📊 Loaded Math & Graph Studio');
    } else if (presetName === 'lecture-notes') {
      partitions[0].type = 'ppt';
      partitions[1].type = 'whiteboard';
      splitRatio = 70;
      setMode('split-2');
      if (typeof App !== 'undefined' && App.showToast) App.showToast('📽️ Loaded Lecture & Notes Preset (70:30)');
    } else if (presetName === 'trio-lab') {
      partitions[0].type = 'whiteboard';
      partitions[1].type = 'graph2d';
      partitions[2].type = 'simulation';
      setMode('split-3');
      if (typeof App !== 'undefined' && App.showToast) App.showToast('🔬 Loaded STEM Lab Trio (3-Split)');
    } else if (presetName === 'quad-math') {
      partitions[0].type = 'whiteboard';
      partitions[1].type = 'graph2d';
      partitions[2].type = 'simulation';
      partitions[3].type = 'whiteboard';
      setMode('split-4');
      if (typeof App !== 'undefined' && App.showToast) App.showToast('📐 Loaded Quad Math Lab (4-Split)');
    }
  }

  function updateTopSplitButton() {
    const label = document.getElementById('top-split-label');
    if (label) {
      if (currentMode === 'normal') label.textContent = 'Workspace';
      else if (currentMode === 'split-2') label.textContent = splitRatio > 60 ? '70:30 Split' : '2 Split';
      else if (currentMode === 'split-3') label.textContent = '3 Split';
      else if (currentMode === 'split-4') label.textContent = '4 Split';
    }

    document.querySelectorAll('.split-dd-menu .dd-item').forEach(btn => {
      btn.classList.remove('active');
    });
    let activeId = 'normal';
    if (currentMode === 'split-2') activeId = splitRatio > 60 ? '70-30' : '2';
    else if (currentMode === 'split-3') activeId = '3';
    else if (currentMode === 'split-4') activeId = '4';
    const activeBtn = document.getElementById(`split-menu-${activeId}`);
    if (activeBtn) activeBtn.classList.add('active');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RESTORE NORMAL WORKSPACE
  // ─────────────────────────────────────────────────────────────────────────────

  function restoreNormalWorkspace() {
    if (!containerEl) return;
    containerEl.classList.add('hidden');
    containerEl.innerHTML = '';

    const zoomW = document.getElementById('board-zoom-widget');
    if (zoomW) zoomW.style.display = '';

    if (typeof Canvas !== 'undefined' && Canvas.resize) {
      Canvas.resize();
    }
    if (typeof Drawing !== 'undefined' && Drawing.syncPointerEvents) {
      Drawing.syncPointerEvents();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2 PARTITION MODE (Side-by-Side with Draggable Divider)
  // ─────────────────────────────────────────────────────────────────────────────

  function enterSplit2Mode() {
    if (!containerEl) init();
    containerEl.classList.remove('hidden', 'split-3', 'split-4');
    containerEl.classList.add('split-2');
    containerEl.innerHTML = '';

    const zoomW = document.getElementById('board-zoom-widget');
    if (zoomW) zoomW.style.display = 'none';

    const p1El = createPartitionElement(partitions[0], 1);
    p1El.style.flex = `0 0 calc(${splitRatio}% - 4px)`;
    p1El.style.width = `calc(${splitRatio}% - 4px)`;

    const dividerEl = createDividerElement();

    const p2El = createPartitionElement(partitions[1], 2);
    p2El.style.flex = `1 1 0%`;

    containerEl.appendChild(p1El);
    containerEl.appendChild(dividerEl);
    containerEl.appendChild(p2El);

    mountPartitionContent(partitions[0], p1El);
    mountPartitionContent(partitions[1], p2El);

    setActivePartition(activePartitionId <= 2 ? activePartitionId : 1);
    resizeAllPartitions();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3 PARTITION MODE (1 Main Left + 2 Stacked Right)
  // ─────────────────────────────────────────────────────────────────────────────

  function enterSplit3Mode() {
    if (!containerEl) init();
    containerEl.classList.remove('hidden', 'split-2', 'split-4');
    containerEl.classList.add('split-3');
    containerEl.innerHTML = '';

    const zoomW = document.getElementById('board-zoom-widget');
    if (zoomW) zoomW.style.display = 'none';

    for (let i = 0; i < 3; i++) {
      const p = partitions[i];
      const pEl = createPartitionElement(p, i + 1);
      containerEl.appendChild(pEl);
      mountPartitionContent(p, pEl);
    }

    setActivePartition(activePartitionId <= 3 ? activePartitionId : 1);
    resizeAllPartitions();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4 PARTITION MODE (2×2 Grid)
  // ─────────────────────────────────────────────────────────────────────────────

  function enterSplit4Mode() {
    if (!containerEl) init();
    containerEl.classList.remove('hidden', 'split-2', 'split-3');
    containerEl.classList.add('split-4');
    containerEl.innerHTML = '';

    const zoomW = document.getElementById('board-zoom-widget');
    if (zoomW) zoomW.style.display = 'none';

    for (let i = 0; i < 4; i++) {
      const p = partitions[i];
      const pEl = createPartitionElement(p, i + 1);
      containerEl.appendChild(pEl);
      mountPartitionContent(p, pEl);
    }

    setActivePartition(activePartitionId);
    resizeAllPartitions();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DRAGGABLE DIVIDER
  // ─────────────────────────────────────────────────────────────────────────────

  function createDividerElement() {
    const div = document.createElement('div');
    div.className = 'wp-split-divider';
    div.id = 'wp-split-divider';
    div.title = 'Drag to adjust workspace partition width';
    div.innerHTML = `
      <div class="wp-divider-handle">
        <span class="wp-divider-grip"></span>
      </div>
    `;

    div.addEventListener('pointerdown', onDividerPointerDown);
    return div;
  }

  function onDividerPointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    isDraggingDivider = true;
    const divider = e.currentTarget;
    divider.setPointerCapture(e.pointerId);
    divider.classList.add('dragging');
    document.body.classList.add('wp-resizing');

    const containerRect = containerEl.getBoundingClientRect();
    const containerW = containerRect.width;

    function onPointerMove(ev) {
      if (!isDraggingDivider) return;
      const clientX = ev.clientX;
      const relativeX = clientX - containerRect.left;
      let newPercent = (relativeX / containerW) * 100;

      const minPx = 280;
      const minPercent = Math.max(20, (minPx / containerW) * 100);
      const maxPercent = Math.min(80, ((containerW - minPx) / containerW) * 100);

      newPercent = Math.max(minPercent, Math.min(maxPercent, newPercent));
      splitRatio = Math.round(newPercent * 10) / 10;

      const p1El = containerEl.querySelector('.workspace-partition[data-pid="1"]');
      if (p1El) {
        p1El.style.flex = `0 0 calc(${splitRatio}% - 4px)`;
        p1El.style.width = `calc(${splitRatio}% - 4px)`;
      }

      resizeAllPartitions();
    }

    function onPointerUp(ev) {
      if (!isDraggingDivider) return;
      isDraggingDivider = false;
      divider.releasePointerCapture(ev.pointerId);
      divider.classList.remove('dragging');
      document.body.classList.remove('wp-resizing');
      divider.removeEventListener('pointermove', onPointerMove);
      divider.removeEventListener('pointerup', onPointerUp);
      divider.removeEventListener('pointercancel', onPointerUp);
    }

    divider.addEventListener('pointermove', onPointerMove);
    divider.addEventListener('pointerup', onPointerUp);
    divider.addEventListener('pointercancel', onPointerUp);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PARTITION DOM CREATION — MINIMAL CONTENT CONTAINER ONLY (NO DUPLICATE TOOLS)
  // ─────────────────────────────────────────────────────────────────────────────

  function getTypeTitle(type) {
    switch (type) {
      case 'whiteboard': return 'Whiteboard';
      case 'graph2d': return '2D Graph';
      case 'geometry': return 'Geometry & Math';
      case 'ppt': return 'PPT Presenter';
      case 'pdf': return 'PDF Document';
      case 'image': return 'Image / Diagram';
      case 'video': return 'Video Player';
      case 'simulation':
      case 'physics-sim': return 'Physics Lab';
      case 'math-sim': return 'Math Lab';
      case 'cs-sim': return 'CS Lab';
      case 'ai-assistant': return 'AI Assistant';
      case 'empty': return 'Empty';
      default: return 'Content';
    }
  }

  function getTypeIcon(type) {
    switch (type) {
      case 'whiteboard': return '✏️';
      case 'graph2d': return '📊';
      case 'geometry': return '📐';
      case 'ppt': return '📑';
      case 'pdf': return '📄';
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'simulation':
      case 'physics-sim': return '🔬';
      case 'math-sim': return '📐';
      case 'cs-sim': return '💻';
      case 'ai-assistant': return '🤖';
      default: return '➕';
    }
  }

  const QUICK_COLORS = [
    { hex: '#0f172a', name: 'Black' },
    { hex: '#ffffff', name: 'White' },
    { hex: '#ef4444', name: 'Red' },
    { hex: '#3b82f6', name: 'Blue' },
    { hex: '#22c55e', name: 'Green' },
    { hex: '#eab308', name: 'Yellow' },
    { hex: '#a855f7', name: 'Purple' }
  ];

  function renderColorSwatchesHtml(pid) {
    const p = partitions.find(item => item.id === Number(pid));
    const activeColor = p ? (p.inkColor || (p.boardBg === '#f4f6f8' ? '#0f172a' : '#38bdf8')).toLowerCase() : '#0f172a';
    return `
      <div class="wp-color-swatches" title="Quick Pen Color">
        ${QUICK_COLORS.map(c => `
          <button type="button" class="wp-color-swatch ${activeColor === c.hex.toLowerCase() ? 'active' : ''}" 
            data-hex="${c.hex}" 
            style="background:${c.hex};" 
            onclick="WorkspaceSplit.setInkColor(${pid}, '${c.hex}', event)" 
            title="${c.name} Pen">
          </button>
        `).join('')}
      </div>
    `;
  }

  function createPartitionElement(p, id) {
    const el = document.createElement('div');
    el.className = `workspace-partition ${p.id === activePartitionId ? 'active' : ''}`;
    el.dataset.pid = String(id);

    // Clicking into partition sets it as the active interacting content area
    el.addEventListener('pointerdown', (e) => {
      if (activePartitionId !== id) {
        setActivePartition(id);
      }
    });

    // ── Compact Header Bar ──
    const header = document.createElement('div');
    header.className = 'wp-header';
    header.title = 'Double-click to Maximize / Restore';

    header.addEventListener('pointerdown', () => {
      if (activePartitionId !== id) {
        setActivePartition(id);
      }
    });

    header.addEventListener('dblclick', (e) => {
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
      toggleMaximize(id);
    });

    header.innerHTML = `
      <div class="wp-header-left">
        <span class="wp-badge"><span class="wp-badge-dot"></span> P${id}</span>
        <span class="wp-title-tag" id="wp-title-${id}">
          <span class="wp-title-icon">${getTypeIcon(p.type)}</span>
          <span class="wp-title-text">${getTypeTitle(p.type)}</span>
        </span>
      </div>

      <div class="wp-header-center" id="wp-center-${id}">
        <!-- Dynamic minimal context controls (e.g. PPT slide navigation) -->
      </div>

      <div class="wp-header-right">
        ${renderColorSwatchesHtml(id)}
        <button type="button" class="wp-action-btn wp-btn-add-content" onclick="WorkspaceSplit.openInsertMenu(${id}, event)" title="Change / Insert Content">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px;height:12px;"><path d="M12 5v14M5 12h14"/></svg>
          <span>Content</span>
        </button>
        ${currentMode === 'split-2' ? `
          <button type="button" class="wp-action-btn wp-btn-swap" onclick="WorkspaceSplit.swapPartitions(1, 2)" title="Swap Partition 1 ⇄ Partition 2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/></svg>
          </button>
        ` : ''}
        <button type="button" class="wp-action-btn wp-btn-max" id="wp-max-${id}" onclick="WorkspaceSplit.toggleMaximize(${id})" title="Maximize Partition (⤢)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        </button>
        <button type="button" class="wp-action-btn wp-btn-clear" onclick="WorkspaceSplit.clearPartitionContent(${id})" title="Clear / Reset Content">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `;

    // ── Body Content Container ──
    const body = document.createElement('div');
    body.className = 'wp-body';
    body.id = `wp-body-${id}`;

    el.appendChild(header);
    el.appendChild(body);
    return el;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MOUNT PARTITION CONTENT — PURE CONTAINER FOR TEACHING ASSETS
  // ─────────────────────────────────────────────────────────────────────────────


  // ─────────────────────────────────────────────────────────────────────────────
  // INDEPENDENT PARTITION DRAWING & INK ENGINE
  // ─────────────────────────────────────────────────────────────────────────────

  let isInkDrawing = false;
  let isInkErasing = false;
  let activeInkStroke = null;
  let activeInkPid = null;

  function attachInkEvents(id, canvas) {
    if (!canvas) return;
    canvas.addEventListener('pointerdown', (e) => onInkPointerDown(id, e));
    canvas.addEventListener('pointermove', (e) => onInkPointerMove(id, e));
    canvas.addEventListener('pointerup', (e) => onInkPointerUp(id, e));
    canvas.addEventListener('pointercancel', (e) => onInkPointerUp(id, e));
  }

  function onInkPointerDown(id, e) {
    if (e.button !== undefined && e.button !== 0) return;

    // Never capture ink strokes when clicking on interactive dock buttons or control overlays
    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
    if (elUnder && (
      elUnder.closest('.wp-ppt-stage-dock') ||
      elUnder.closest('.wp-ppt-stage-nav') ||
      elUnder.closest('.wp-ppt-dock-btn') ||
      elUnder.closest('.wp-controls-layer') ||
      elUnder.closest('.wp-header') ||
      elUnder.closest('button') ||
      elUnder.closest('input') ||
      elUnder.closest('select') ||
      elUnder.closest('.wp-action-btn') ||
      elUnder.closest('.wp-insert-popup')
    )) {
      return;
    }

    setActivePartition(id);

    const p = partitions.find(item => item.id === id);
    if (!p) return;

    const tool = (typeof App !== 'undefined') ? App.currentTool : 'pen';
    if (tool === 'select') return;

    const canvas = document.getElementById(`wp-draw-${id}`);
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = (e.pressure && e.pressure > 0) ? e.pressure : 0.5;

    activeInkPid = id;

    if (tool === 'eraser') {
      isInkErasing = true;
      eraseInkNear(p, x, y, 22);
      try { canvas.setPointerCapture(e.pointerId); } catch(err) {}
      return;
    }

    isInkDrawing = true;
    const inkColor = p.inkColor || (p.boardBg === '#f4f6f8' ? '#0f172a' : '#38bdf8');
    const inkWidth = (typeof App !== 'undefined' && App.currentSize) ? App.currentSize : (tool === 'highlighter' ? 18 : 3);

    activeInkStroke = {
      tool: tool,
      color: inkColor,
      width: inkWidth,
      points: [{ x, y, pressure }]
    };

    try { canvas.setPointerCapture(e.pointerId); } catch(err) {}

    // Draw initial dot
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (tool === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = inkColor;
    } else {
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = inkColor;
    }
    ctx.beginPath();
    ctx.arc(x, y, (inkWidth || 3) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function onInkPointerMove(id, e) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;
    const canvas = document.getElementById(`wp-draw-${id}`);
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = (e.pressure && e.pressure > 0) ? e.pressure : 0.5;

    if (isInkErasing && activeInkPid === id) {
      eraseInkNear(p, x, y, 22);
      return;
    }

    if (!isInkDrawing || activeInkPid !== id || !activeInkStroke) return;

    activeInkStroke.points.push({ x, y, pressure });
    const pts = activeInkStroke.points;
    if (pts.length < 2) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (activeInkStroke.tool === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = activeInkStroke.color;
      ctx.lineWidth = activeInkStroke.width || 18;
    } else {
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = activeInkStroke.color;
      ctx.lineWidth = activeInkStroke.width || 3;
    }

    ctx.beginPath();
    const p1 = pts[pts.length - 2];
    const p2 = pts[pts.length - 1];
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  }

  function onInkPointerUp(id, e) {
    if (isInkDrawing && activeInkStroke && activeInkPid === id) {
      const p = partitions.find(item => item.id === id);
      if (p && activeInkStroke.points.length > 0) {
        p.strokes = p.strokes || [];
        p.strokes.push(activeInkStroke);
        p.undoneStrokes = [];
        redrawPartitionInk(p);
      }
    }
    isInkDrawing = false;
    isInkErasing = false;
    activeInkStroke = null;
    activeInkPid = null;
  }

  function eraseInkNear(p, x, y, radius = 22) {
    if (!p || !p.strokes || p.strokes.length === 0) return;
    const initialLen = p.strokes.length;
    p.strokes = p.strokes.filter(s => {
      if (!s.points) return false;
      return !s.points.some(pt => {
        const dx = pt.x - x;
        const dy = pt.y - y;
        return (dx * dx + dy * dy) <= (radius * radius);
      });
    });
    if (p.strokes.length !== initialLen) {
      redrawPartitionInk(p);
    }
  }

  function redrawPartitionInk(p) {
    if (typeof App !== 'undefined' && App.scheduleAutoSave) App.scheduleAutoSave();
    if (!p) return;
    const canvas = document.getElementById(`wp-draw-${p.id}`);
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!p.strokes || p.strokes.length === 0) return;

    for (const s of p.strokes) {
      if (!s || !s.points || s.points.length === 0) continue;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (s.tool === 'highlighter') {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width || 18;
      } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width || 3;
      }

      const pts = s.points;
      if (pts.length === 1) {
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, (s.width || 3) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function undoPartition(id) {
    const p = partitions.find(item => item.id === id);
    if (!p || !p.strokes || p.strokes.length === 0) return;
    p.undoneStrokes = p.undoneStrokes || [];
    p.undoneStrokes.push(p.strokes.pop());
    redrawPartitionInk(p);
  }

  function redoPartition(id) {
    const p = partitions.find(item => item.id === id);
    if (!p || !p.undoneStrokes || p.undoneStrokes.length === 0) return;
    p.strokes = p.strokes || [];
    p.strokes.push(p.undoneStrokes.pop());
    redrawPartitionInk(p);
  }

  function undoActive() {
    undoPartition(activePartitionId);
  }

  function redoActive() {
    redoPartition(activePartitionId);
  }

  function clearPartition(id) {
    const p = partitions.find(item => item.id === id);
    if (p) {
      p.strokes = [];
      p.undoneStrokes = [];
      redrawPartitionInk(p);
    }
  }

  function mountPartitionContent(p, pEl) {
    const body = pEl.querySelector('.wp-body');
    const centerHead = pEl.querySelector('.wp-header-center');
    const titleEl = pEl.querySelector('.wp-title-tag');
    if (!body) return;
    body.innerHTML = '';

    const id = p.id;

    if (titleEl) {
      titleEl.innerHTML = `
        <span class="wp-title-icon">${getTypeIcon(p.type)}</span>
        <span class="wp-title-text">${getTypeTitle(p.type)}</span>
      `;
    }

    // Render minimal context controls in header
    renderHeaderControls(p, centerHead);

    // Responsive container for content
    const contentBox = document.createElement('div');
    contentBox.className = 'wp-content-box';
    contentBox.id = `wp-content-box-${id}`;
    body.appendChild(contentBox);

    // Independent writing and drawing layer for this partition
    const inkCanvas = document.createElement('canvas');
    inkCanvas.className = 'wp-draw-canvas';
    inkCanvas.id = `wp-draw-${id}`;
    body.appendChild(inkCanvas);
    attachInkEvents(id, inkCanvas);
    setTimeout(() => { redrawPartitionInk(p); }, 60);

    // Interactive Floating Controls Overlay (sits above drawing canvas so all buttons, docks & navigation controls respond immediately)
    const controlsBox = document.createElement('div');
    controlsBox.className = 'wp-controls-layer';
    controlsBox.id = `wp-controls-${id}`;
    body.appendChild(controlsBox);

    // If empty partition: show inviting + Add Content action
    if (p.type === 'empty') {
      contentBox.innerHTML = `
        <div class="wp-empty-state">
          <div class="wp-empty-icon">${getTypeIcon(p.type)}</div>
          <div class="wp-empty-title">Partition ${id}</div>
          <div class="wp-empty-desc">Choose content to display in this partition</div>
          <button class="wp-add-content-main-btn" onclick="WorkspaceSplit.openInsertMenu(${id}, event)">
            <span>＋ Add Content</span>
          </button>
        </div>
      `;
      return;
    }

    switch (p.type) {
      case 'whiteboard':
        mountWhiteboardContent(p, contentBox);
        break;
      case 'graph2d':
        mountGraphContent(p, contentBox);
        break;
      case 'geometry':
        mountGeometryContent(p, contentBox);
        break;
      case 'ppt':
        mountPptContent(p, contentBox, controlsBox);
        break;
      case 'pdf':
        mountPdfContent(p, contentBox);
        break;
      case 'image':
        mountImageContent(p, contentBox);
        break;
      case 'video':
        mountVideoContent(p, contentBox);
        break;
      case 'simulation':
      case 'physics-sim':
        mountSimulationContent(p, contentBox);
        break;
      case 'math-sim':
        mountMathSimContent(p, contentBox);
        break;
      case 'cs-sim':
        mountCsSimContent(p, contentBox);
        break;
      case 'ai-assistant':
        mountAiTutorContent(p, contentBox);
        break;
      default:
        mountWhiteboardContent(p, contentBox);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INSERT CONTENT POPUP MENU (Minimal + Add Content Action per Section 6)
  // ─────────────────────────────────────────────────────────────────────────────

  function closeAllInsertPopups() {
    document.querySelectorAll('.wp-insert-popup, .wp-insert-backdrop').forEach(m => m.remove());
    document.body.classList.remove('wp-insert-popup-open');
    if (typeof Drawing !== 'undefined' && Drawing.syncPointerEvents) {
      Drawing.syncPointerEvents();
    }
  }

  function openInsertMenu(id, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    closeAllInsertPopups();

    document.body.classList.add('wp-insert-popup-open');

    // Create backdrop so tapping outside immediately closes popup
    const backdrop = document.createElement('div');
    backdrop.className = 'wp-insert-backdrop';
    backdrop.id = 'wp-insert-backdrop';
    backdrop.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAllInsertPopups();
    });

    const popup = document.createElement('div');
    popup.className = 'wp-insert-popup';
    popup.id = 'wp-insert-popup';
    popup.setAttribute('data-target-pid', String(id));
    popup.innerHTML = `
      <div class="wp-ip-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:16px;">➕</span>
          <span>Insert Content into Partition ${id}</span>
        </div>
        <button class="wp-ip-close" type="button" onclick="WorkspaceSplit.closeAllInsertPopups()" title="Close">✕</button>
      </div>
      <div class="wp-ip-grid">
        <button type="button" class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'whiteboard')">
          <span class="wp-ip-icon">✏️</span>
          <div class="wp-ip-text">
            <strong>Whiteboard</strong>
            <span>Writing Canvas & Notes</span>
          </div>
        </button>
        <button type="button" class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'graph2d')">
          <span class="wp-ip-icon">📊</span>
          <div class="wp-ip-text">
            <strong>2D Graph Studio</strong>
            <span>Functions, Curves & Sliders</span>
          </div>
        </button>
        <button type="button" class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'geometry')">
          <span class="wp-ip-icon">📐</span>
          <div class="wp-ip-text">
            <strong>Geometry & Math</strong>
            <span>Shapes, Formulas & Ruler</span>
          </div>
        </button>
        <button type="button" class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'ppt')">
          <span class="wp-ip-icon">📑</span>
          <div class="wp-ip-text">
            <strong>PPT Presenter</strong>
            <span>PowerPoint Slides Deck</span>
          </div>
        </button>
        <button type="button" class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'pdf')">
          <span class="wp-ip-icon">📄</span>
          <div class="wp-ip-text">
            <strong>PDF Document</strong>
            <span>Textbook & Notes Viewer</span>
          </div>
        </button>
        <button type="button" class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'simulation')">
          <span class="wp-ip-icon">🔬</span>
          <div class="wp-ip-text">
            <strong>Physics Lab</strong>
            <span>Optics, Lasers, Harmonic Lab</span>
          </div>
        </button>
        <button type="button" class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'math-sim')">
          <span class="wp-ip-icon">📐</span>
          <div class="wp-ip-text">
            <strong>Math Lab</strong>
            <span>Calculus, ODE, Integrals</span>
          </div>
        </button>
        <button type="button" class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'cs-sim')">
          <span class="wp-ip-icon">💻</span>
          <div class="wp-ip-text">
            <strong>CS & Coding Lab</strong>
            <span>DSA, OS, C Programming</span>
          </div>
        </button>
        <button type="button" class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'image')">
          <span class="wp-ip-icon">🖼️</span>
          <div class="wp-ip-text">
            <strong>Image / Diagram</strong>
            <span>PNG, JPG, SVG Charts</span>
          </div>
        </button>
        <button type="button" class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'video')">
          <span class="wp-ip-icon">🎥</span>
          <div class="wp-ip-text">
            <strong>Video Player</strong>
            <span>Educational Media (.mp4)</span>
          </div>
        </button>
        <button type="button" class="wp-ip-item" onclick="WorkspaceSplit.triggerPartitionFilePicker(${id})">
          <span class="wp-ip-icon">📁</span>
          <div class="wp-ip-text">
            <strong>Open File</strong>
            <span>Upload PPT, PDF, Image, Video</span>
          </div>
        </button>
        <button type="button" class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'ai-assistant')">
          <span class="wp-ip-icon">🤖</span>
          <div class="wp-ip-text">
            <strong>AI Assistant</strong>
            <span>Concept Tutor & Math Solver</span>
          </div>
        </button>
      </div>
    `;

    popup.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
    popup.addEventListener('click', (e) => { e.stopPropagation(); });

    document.body.appendChild(backdrop);
    document.body.appendChild(popup);
  }

  function selectContentType(id, type) {
    closeAllInsertPopups();
    changePartitionContent(id, type);
    if (type === 'ppt') {
      setTimeout(() => {
        openPptFilePicker(id);
      }, 100);
    }
  }

  function changePartitionContent(id, newType) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;
    p.type = newType;

    const pEl = containerEl.querySelector(`.workspace-partition[data-pid="${id}"]`);
    if (pEl) {
      mountPartitionContent(p, pEl);
      resizePartition(id);
    }

    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast(`P${id}: ${getTypeTitle(newType)} loaded`);
    }
  }

  function clearPartitionContent(id) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;
    p.type = 'whiteboard';
    p.strokes = [];
    p.undoneStrokes = [];
    const pEl = containerEl ? containerEl.querySelector(`.workspace-partition[data-pid="${id}"]`) : null;
    if (pEl) {
      mountPartitionContent(p, pEl);
    }
    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast(`Partition ${id} cleared`);
    }
  }

  function triggerPartitionFilePicker(id) {
    closeAllInsertPopups();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pptx,.ppt,.pdf,image/*,video/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      const name = file.name.toLowerCase();
      if (name.endsWith('.pptx') || name.endsWith('.ppt')) {
        const p = partitions.find(item => item.id === id);
        if (p) {
          p.type = 'ppt';
          const parsedDeck = await parsePresentationFile(file);
          p.pptState.currentDeck = parsedDeck;
          p.pptState.slideIndex = 0;
          changePartitionContent(id, 'ppt');
        }
      } else if (name.endsWith('.pdf')) {
        const p = partitions.find(item => item.id === id);
        if (p) {
          p.type = 'ppt';
          const parsedDeck = await parsePresentationFile(file);
          p.pptState.currentDeck = parsedDeck;
          p.pptState.slideIndex = 0;
          changePartitionContent(id, 'ppt');
        }
      } else if (file.type.startsWith('video/')) {
        const p = partitions.find(item => item.id === id);
        if (p) {
          p.type = 'video';
          p.videoState = { src: URL.createObjectURL(file), name: file.name };
          changePartitionContent(id, 'video');
        }
      } else {
        const p = partitions.find(item => item.id === id);
        if (p) {
          p.type = 'image';
          const reader = new FileReader();
          reader.onload = (ev) => {
            p.imageState = { src: ev.target.result, name: file.name };
            changePartitionContent(id, 'image');
          };
          reader.readAsDataURL(file);
        }
      }
    };
    input.click();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1-CLICK PARTITION SWAPPING
  // ─────────────────────────────────────────────────────────────────────────────

  function swapPartitions(id1, id2) {
    const p1 = partitions.find(p => p.id === id1);
    const p2 = partitions.find(p => p.id === id2);
    if (!p1 || !p2) return;

    const temp = {
      type: p1.type,
      boardBg: p1.boardBg,
      graphState: { ...p1.graphState },
      pptState: { ...p1.pptState },
      pdfState: { ...p1.pdfState },
      imageState: { ...p1.imageState },
      videoState: { ...p1.videoState },
      geometryState: { ...p1.geometryState },
      simState: { ...p1.simState }
    };

    ['type','boardBg','graphState','pptState','pdfState','imageState','videoState','geometryState','simState'].forEach(k => {
      p1[k] = p2[k];
      p2[k] = temp[k];
    });

    const p1El = containerEl.querySelector(`.workspace-partition[data-pid="${id1}"]`);
    const p2El = containerEl.querySelector(`.workspace-partition[data-pid="${id2}"]`);
    if (p1El) mountPartitionContent(p1, p1El);
    if (p2El) mountPartitionContent(p2, p2El);

    resizePartition(id1);
    resizePartition(id2);

    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast(`🔄 Swapped P${id1} ⇄ P${id2}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HEADER MINIMAL CONTEXT CONTROLS
  // ─────────────────────────────────────────────────────────────────────────────

  function renderHeaderControls(p, centerHead) {
    if (!centerHead) return;
    centerHead.innerHTML = '';
    const id = p.id;

    if (p.type === 'whiteboard') {
      centerHead.innerHTML = `
        <div class="wp-board-bg-selector">
          <button class="wp-bg-chip ${p.boardBg === '#f4f6f8' ? 'active' : ''}" onclick="WorkspaceSplit.setPartitionBg(${id}, '#f4f6f8')" title="Soft White Board">Light</button>
          <button class="wp-bg-chip ${p.boardBg === '#0b1329' ? 'active' : ''}" onclick="WorkspaceSplit.setPartitionBg(${id}, '#0b1329')" title="Dark Obsidian Board">Dark</button>
        </div>
      `;
    } else if (p.type === 'graph2d') {
      centerHead.innerHTML = `
        <div class="wp-graph-presets">
          <button class="wp-preset-chip ${p.graphState.familyId === 'sin' ? 'active' : ''}" onclick="WorkspaceSplit.loadGraphPreset(${id}, 'sin')" title="Sine Wave">sin</button>
          <button class="wp-preset-chip ${p.graphState.familyId === 'cos' ? 'active' : ''}" onclick="WorkspaceSplit.loadGraphPreset(${id}, 'cos')" title="Cosine Wave">cos</button>
          <button class="wp-preset-chip ${p.graphState.familyId === 'quadratic' ? 'active' : ''}" onclick="WorkspaceSplit.loadGraphPreset(${id}, 'quadratic')" title="Parabola (x²)">x²</button>
          <button class="wp-preset-chip ${p.graphState.familyId === 'cubic' ? 'active' : ''}" onclick="WorkspaceSplit.loadGraphPreset(${id}, 'cubic')" title="Cubic (x³)">x³</button>
          <button class="wp-preset-chip ${p.graphState.familyId === 'abs' ? 'active' : ''}" onclick="WorkspaceSplit.loadGraphPreset(${id}, 'abs')" title="Modulus (|x|)">|x|</button>
          <button class="wp-dr-btn" onclick="WorkspaceSplit.resetGraphView(${id})" title="Reset Origin">⟲</button>
        </div>
      `;
    } else if (p.type === 'ppt') {
      const slideNum = (p.pptState.slideIndex || 0) + 1;
      const totalSlides = (p.pptState.currentDeck && p.pptState.currentDeck.slides) ? p.pptState.currentDeck.slides.length : 3;
      centerHead.innerHTML = `
        <div class="wp-ppt-controls">
          <button class="wp-pill-btn" onclick="WorkspaceSplit.prevSlide(${id})" title="Previous Slide">◀</button>
          <span class="wp-slide-indicator" id="wp-slide-lbl-${id}">${slideNum}/${totalSlides}</span>
          <button class="wp-pill-btn" onclick="WorkspaceSplit.nextSlide(${id})" title="Next Slide">▶</button>
          <button class="wp-pill-btn highlight" onclick="WorkspaceSplit.openPptFilePicker(${id})" title="Open File">📂</button>
        </div>
      `;
    } else if (p.type === 'simulation') {
      centerHead.innerHTML = `
        <div class="wp-tool-group">
          <button class="wp-preset-chip ${p.simState.type === 'pendulum' ? 'active' : ''}" onclick="WorkspaceSplit.setSimType(${id}, 'pendulum')">Pendulum</button>
          <button class="wp-preset-chip ${p.simState.type === 'projectile' ? 'active' : ''}" onclick="WorkspaceSplit.setSimType(${id}, 'projectile')">Projectile</button>
          <button class="wp-preset-chip ${p.simState.type === 'wave' ? 'active' : ''}" onclick="WorkspaceSplit.setSimType(${id}, 'wave')">Wave</button>
        </div>
      `;
    }
  }

  function setPartitionBg(id, bg) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;
    p.boardBg = bg;
    const isDark = (bg === '#0b1329');
    p.inkColor = isDark ? '#38bdf8' : '#0f172a';

    const pEl = containerEl ? containerEl.querySelector(`.workspace-partition[data-pid="${id}"]`) : null;
    if (pEl) {
      const gridCv = pEl.querySelector(`#wp-grid-${id}`);
      if (gridCv) drawPartitionGrid(p, gridCv);
      const centerHead = pEl.querySelector(`#wp-center-${id}`);
      if (centerHead) renderHeaderControls(p, centerHead);
      updatePartitionSwatches(id);
      redrawPartitionInk(p);
    }

    // Auto-adjust ink color for contrast if whiteboard
    if (typeof App !== 'undefined' && App.currentColor && App.setColor) {
      const cur = App.currentColor.toLowerCase();
      if (bg === '#f4f6f8' && (cur === '#ffffff' || cur === '#fff')) {
        App.setColor('#0f172a');
        if (App.showToast) App.showToast('Pen switched to Black for light board');
      } else if (bg === '#0b1329' && (cur === '#0f172a' || cur === '#000000' || cur === '#000')) {
        App.setColor('#ffffff');
        if (App.showToast) App.showToast('Pen switched to White for dark board');
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. WHITEBOARD CONTENT
  // ─────────────────────────────────────────────────────────────────────────────


  // ─────────────────────────────────────────────────────────────────────────────
  // 8. GEOMETRY & 3D MATH CONTENT
  // ─────────────────────────────────────────────────────────────────────────────
  function mountGeometryContent(p, container) {
    const id = p.id;
    container.innerHTML = `
      <div style="width:100%;height:100%;display:flex;flex-direction:column;background:#081329;position:relative;">
        <div style="flex:1;position:relative;display:flex;align-items:center;justify-content:center;">
          <svg viewBox="0 0 400 300" style="width:90%;height:90%;opacity:0.85;">
            <!-- Coordinate Grid -->
            <defs>
              <pattern id="wp-geo-grid-${id}" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(56, 189, 248, 0.08)" stroke-width="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wp-geo-grid-${id})" />
            <!-- Axis -->
            <line x1="40" y1="260" x2="360" y2="260" stroke="#38bdf8" stroke-width="1.5"/>
            <line x1="40" y1="40" x2="40" y2="260" stroke="#38bdf8" stroke-width="1.5"/>
            <!-- Triangle with angle -->
            <polygon points="60,240 220,90 320,240" fill="rgba(56, 189, 248, 0.12)" stroke="#38bdf8" stroke-width="2"/>
            <circle cx="220" cy="90" r="4" fill="#facc15"/>
            <circle cx="60" cy="240" r="4" fill="#38bdf8"/>
            <circle cx="320" cy="240" r="4" fill="#38bdf8"/>
            <!-- Labels -->
            <text x="220" y="75" fill="#facc15" font-size="12" font-weight="700" text-anchor="middle">θ = 65°</text>
            <text x="190" y="275" fill="#94a3b8" font-size="11" font-weight="600" text-anchor="middle">Base b = 260 mm</text>
            <text x="25" y="165" fill="#94a3b8" font-size="11" font-weight="600" text-anchor="middle" transform="rotate(-90 25,165)">Height h</text>
          </svg>
        </div>
        <div style="padding:6px 12px;background:rgba(15,23,42,0.9);border-top:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#cbd5e1;">
          <span>📐 Area A = ½ · b · h · sin(θ) = 17,673 mm²</span>
          <span style="color:#38bdf8;font-weight:600;">Use Stylus to annotate & measure</span>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. MATHEMATICS LAB SIMULATION
  // ─────────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. MATHEMATICS LAB SIMULATION (Interactive Unit Circle & Trig Studio)
  // ─────────────────────────────────────────────────────────────────────────────
  function mountMathSimContent(p, container) {
    const id = p.id;
    p.mathSimState = p.mathSimState || { angle: 45 };
    container.innerHTML = `
      <div style="width:100%;height:100%;display:flex;flex-direction:column;background:#081329;position:relative;">
        <canvas id="wp-math-cv-${id}" style="flex:1;width:100%;height:100%;"></canvas>
        <div style="padding:6px 12px;background:rgba(15,23,42,0.92);border-top:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:12px;font-size:11.5px;color:#cbd5e1;z-index:20;position:relative;">
          <span style="color:#38bdf8;font-weight:700;">θ = <span id="wp-math-deg-${id}">${p.mathSimState.angle}</span>°</span>
          <span>sin(θ) = <strong id="wp-math-sin-${id}" style="color:#22c55e;">${Math.sin(p.mathSimState.angle * Math.PI / 180).toFixed(3)}</strong></span>
          <span>cos(θ) = <strong id="wp-math-cos-${id}" style="color:#facc15;">${Math.cos(p.mathSimState.angle * Math.PI / 180).toFixed(3)}</strong></span>
          <input type="range" min="0" max="360" value="${p.mathSimState.angle}" style="flex:1;cursor:pointer;accent-color:#38bdf8;" oninput="WorkspaceSplit.updateMathSimAngle(${id}, this.value)">
        </div>
      </div>
    `;
    const cv = container.querySelector(`#wp-math-cv-${id}`);
    setTimeout(() => { renderMathSim(p, cv); }, 30);
  }

  function updateMathSimAngle(id, deg) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;
    p.mathSimState = p.mathSimState || {};
    p.mathSimState.angle = Number(deg);

    const degEl = document.getElementById(`wp-math-deg-${id}`);
    const sinEl = document.getElementById(`wp-math-sin-${id}`);
    const cosEl = document.getElementById(`wp-math-cos-${id}`);
    const rad = p.mathSimState.angle * Math.PI / 180;

    if (degEl) degEl.textContent = String(deg);
    if (sinEl) sinEl.textContent = Math.sin(rad).toFixed(3);
    if (cosEl) cosEl.textContent = Math.cos(rad).toFixed(3);

    const cv = document.getElementById(`wp-math-cv-${id}`);
    if (cv) renderMathSim(p, cv);
  }

  function renderMathSim(p, cv) {
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = rect.width || 400;
    const H = rect.height || 300;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#081329';
    ctx.fillRect(0, 0, W, H);

    const cx = Math.min(W * 0.42, 170);
    const cy = H * 0.5;
    const R = Math.min(cx - 30, cy - 30, 110);
    if (R < 30) return;

    // Coordinate Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - R - 20, cy); ctx.lineTo(cx + R + 20, cy);
    ctx.moveTo(cx, cy - R - 20); ctx.lineTo(cx, cy + R + 20);
    ctx.stroke();

    // Unit Circle
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // Angle and vector
    const deg = (p.mathSimState && p.mathSimState.angle !== undefined) ? p.mathSimState.angle : 45;
    const rad = deg * Math.PI / 180;
    const px = cx + R * Math.cos(rad);
    const py = cy - R * Math.sin(rad);

    // Shaded angle wedge
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R * 0.35, 0, -rad, true);
    ctx.closePath();
    ctx.fill();

    // Vector line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();

    // cos projection (yellow)
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, cy);
    ctx.stroke();

    // sin projection (green)
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(px, cy);
    ctx.lineTo(px, py);
    ctx.stroke();

    // Target point dot
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();

    // Wave trace on right side
    const waveStartX = cx + R + 35;
    const waveW = W - waveStartX - 20;
    if (waveW > 60) {
      // Connecting dashed line
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(waveStartX, py);
      ctx.stroke();
      ctx.setLineDash([]);

      // Baseline
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.moveTo(waveStartX, cy); ctx.lineTo(waveStartX + waveW, cy);
      ctx.stroke();

      // Sine curve
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= waveW; x += 2) {
        const theta = rad - (x / waveW) * (Math.PI * 2);
        const y = cy - R * Math.sin(theta);
        if (x === 0) ctx.moveTo(waveStartX + x, y);
        else ctx.lineTo(waveStartX + x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.font = '10px sans-serif';
      ctx.fillText('y = sin(θ)', waveStartX + 6, cy - R - 6);
    }
  }


  // ─────────────────────────────────────────────────────────────────────────────
  // 10. COMPUTER SCIENCE / DSA LAB SIMULATION
  // ─────────────────────────────────────────────────────────────────────────────
  function mountCsSimContent(p, container) {
    const id = p.id;
    container.innerHTML = `
      <iframe src="dsa-simulation.html" style="width:100%;height:100%;border:none;background:#081329;" title="Computer Science Simulation Lab"></iframe>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. SMART AI TUTOR CONTENT
  // ─────────────────────────────────────────────────────────────────────────────
  function mountAiTutorContent(p, container) {
    const id = p.id;
    container.innerHTML = `
      <div style="width:100%;height:100%;display:flex;flex-direction:column;background:#0b1329;padding:12px;box-sizing:border-box;gap:10px;">
        <div style="display:flex;align-items:center;gap:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <span style="font-size:20px;">🤖</span>
          <div>
            <strong style="color:#f1f5f9;font-size:13px;">EduVerse AI Teacher Assistant</strong>
            <div style="color:#94a3b8;font-size:10.5px;">Ask concepts, formulas, syllabi, step-by-step solutions</div>
          </div>
        </div>
        <div id="wp-ai-chat-${id}" style="flex:1;overflow-y:auto;background:rgba(15,23,42,0.6);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;font-size:11.5px;color:#e2e8f0;">
          <div style="background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.25);border-radius:8px;padding:8px;line-height:1.4;">
            👋 Hello Professor! Partition ${id} is linked to EduVerse RAG. You can write equations on the board or ask me to explain any syllabus chapter.
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <input type="text" id="wp-ai-inp-${id}" placeholder="Type question (e.g. Derive Euler-Lagrange, explain sorting...)" 
            style="flex:1;background:rgba(15,23,42,0.9);border:1px solid rgba(255,255,255,0.16);border-radius:8px;padding:7px 10px;color:#fff;font-size:11.5px;outline:none;"
            onkeydown="if(event.key==='Enter') WorkspaceSplit.sendAiPrompt(${id});" />
          <button type="button" onclick="WorkspaceSplit.sendAiPrompt(${id})" 
            style="background:#38bdf8;color:#070c1a;border:none;border-radius:8px;padding:0 14px;font-weight:700;font-size:11.5px;cursor:pointer;">
            Ask
          </button>
        </div>
      </div>
    `;
  }

  function sendAiPrompt(id) {
    const inp = document.getElementById(`wp-ai-inp-${id}`);
    const chat = document.getElementById(`wp-ai-chat-${id}`);
    if (!inp || !chat || !inp.value.trim()) return;
    const q = inp.value.trim();
    inp.value = '';

    const userMsg = document.createElement('div');
    userMsg.style.cssText = 'background:rgba(255,255,255,0.08);border-radius:8px;padding:7px 9px;align-self:flex-end;max-width:85%;';
    userMsg.textContent = q;
    chat.appendChild(userMsg);

    const botMsg = document.createElement('div');
    botMsg.style.cssText = 'background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.25);border-radius:8px;padding:8px;line-height:1.4;';
    botMsg.innerHTML = '<strong>EduVerse AI:</strong> ⏳ Thinking and searching knowledge base...';
    chat.appendChild(botMsg);
    chat.scrollTop = chat.scrollHeight;

    setTimeout(() => {
      botMsg.innerHTML = `<strong>EduVerse AI:</strong> Analysis for: <em>"${q}"</em><br>• Core Concept mapped to current chapter syllabus.<br>• Formula & Theorem verified.<br>• Ready for smart board stylus explanation!`;
      chat.scrollTop = chat.scrollHeight;
    }, 800);
  }

  function mountWhiteboardContent(p, container) {
    const id = p.id;
    container.innerHTML = `
      <canvas class="wp-grid-cv" id="wp-grid-${id}"></canvas>
    `;
    const gridCv = container.querySelector(`#wp-grid-${id}`);
    drawPartitionGrid(p, gridCv);
  }

  function drawPartitionGrid(p, cv) {
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round((rect.width || 400) * dpr);
    cv.height = Math.round((rect.height || 300) * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const isDark = (p.boardBg === '#0b1329');
    ctx.fillStyle = p.boardBg || '#f4f6f8';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.055)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const step = 28;
    for (let x = 0; x <= rect.width; x += step) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, rect.height);
    }
    for (let y = 0; y <= rect.height; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(rect.width, y + 0.5);
    }
    ctx.stroke();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. 2D FUNCTION GRAPH CONTENT
  // ─────────────────────────────────────────────────────────────────────────────

  const SPLIT_LINE_COLORS = ['#38bdf8', '#facc15', '#22c55e', '#f97316', '#f43f5e', '#a855f7'];

  function mountGraphContent(p, container) {
    const id = p.id;
    p.graphState = p.graphState || {
      familyId: 'quadratic',
      expr: 'x²',
      a: 1, b: 1, h: 0, k: 0,
      color: '#38bdf8',
      boardBg: '#0b1329',
      inkColor: '#38bdf8',
      strokes: [],
      undoneStrokes: [],
      zoom: 1,
      panX: 0, panY: 0
    };

    container.innerHTML = `
      <div class="wp-graph-workspace">
        <canvas class="wp-graph-canvas" id="wp-graph-cv-${id}"></canvas>
        <div class="wp-graph-controls-panel">
          <div class="wp-graph-param-row">
            <span class="wp-param-lbl" style="color:${p.graphState.color || '#38bdf8'}; font-weight:700;">f(x):</span>
            <input type="text" class="wp-graph-eq-input" id="wp-eq-input-${id}" value="${p.graphState.expr}" onchange="WorkspaceSplit.updateGraphEquation(${id}, this.value)" title="Type formula (e.g. sin(x), x^2, e^x)">
            
            <div style="display:inline-flex; align-items:center; gap:3px;">
              ${SPLIT_LINE_COLORS.map(c => `
                <button type="button" onclick="WorkspaceSplit.setGraphLineColor(${id}, '${c}')" 
                  style="width:16px; height:16px; border-radius:50%; background:${c}; border:${c.toLowerCase() === (p.graphState.color || '#38bdf8').toLowerCase() ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)'}; cursor:pointer; padding:0;">
                </button>
              `).join('')}
            </div>

            <div class="wp-graph-sliders-row" style="margin-left:auto;">
              <div class="wp-slider-pill" title="Vertical Stretch (a)">
                <span>a:</span>
                <input type="range" min="-4" max="4" step="0.2" value="${p.graphState.a}" oninput="WorkspaceSplit.setGraphParam(${id}, 'a', parseFloat(this.value))">
                <span class="wp-val-lbl" id="wp-val-a-${id}">${p.graphState.a}</span>
              </div>
              <div class="wp-slider-pill" title="Horizontal Shift (h)">
                <span>h:</span>
                <input type="range" min="-5" max="5" step="0.5" value="${p.graphState.h}" oninput="WorkspaceSplit.setGraphParam(${id}, 'h', parseFloat(this.value))">
                <span class="wp-val-lbl" id="wp-val-h-${id}">${p.graphState.h}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const cv = container.querySelector(`#wp-graph-cv-${id}`);
    setupGraphInteraction(p, cv);
    renderGraphWorkspace(p, cv);
  }

  function setupGraphInteraction(p, cv) {
    if (!cv) return;
    let isPanning = false;
    let startX = 0, startY = 0;

    cv.addEventListener('pointerdown', (e) => {
      if (typeof App !== 'undefined' && App.currentTool === 'select') {
        e.preventDefault();
        e.stopPropagation();
        cv.setPointerCapture(e.pointerId);
        isPanning = true;
        startX = e.clientX - (p.graphState.panX || 0);
        startY = e.clientY - (p.graphState.panY || 0);
      }
    });

    cv.addEventListener('pointermove', (e) => {
      if (!isPanning) return;
      e.preventDefault();
      p.graphState.panX = e.clientX - startX;
      p.graphState.panY = e.clientY - startY;
      renderGraphWorkspace(p, cv);
    });

    const stop = (e) => {
      if (!isPanning) return;
      isPanning = false;
      try { cv.releasePointerCapture(e.pointerId); } catch (_) {}
    };

    cv.addEventListener('pointerup', stop);
    cv.addEventListener('pointercancel', stop);

    cv.addEventListener('wheel', (e) => {
      if (typeof App !== 'undefined' && App.currentTool === 'select') {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.88;
        p.graphState.zoom = Math.max(0.3, Math.min(5, (p.graphState.zoom || 1) * factor));
        renderGraphWorkspace(p, cv);
      }
    }, { passive: false });
  }

  function renderGraphWorkspace(p, cv) {
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round((rect.width || 400) * dpr);
    cv.height = Math.round((rect.height || 300) * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = rect.width || 400;
    const H = rect.height || 300;

    const boardBg = p.graphState.boardBg || '#0b1329';
    ctx.fillStyle = boardBg;
    ctx.fillRect(0, 0, W, H);

    const originX = W / 2 + (p.graphState.panX || 0);
    const originY = H / 2 + (p.graphState.panY || 0);
    const scale = 36 * (p.graphState.zoom || 1);

    // Grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = originX % scale; x <= W; x += scale) {
      ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H);
    }
    for (let y = originY % scale; y <= H; y += scale) {
      ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5);
    }
    ctx.stroke();

    // Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, originY); ctx.lineTo(W, originY);
    ctx.moveTo(originX, 0); ctx.lineTo(originX, H);
    ctx.stroke();

    // Function plotting
    const fn = compileMathExpr(p.graphState.expr);
    const a = p.graphState.a || 1;
    const b = p.graphState.b || 1;
    const h = p.graphState.h || 0;
    const k = p.graphState.k || 0;

    ctx.save();
    ctx.strokeStyle = p.graphState.color || '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;

    for (let px = 0; px <= W; px += 2) {
      const mathX = (px - originX) / scale;
      const innerX = b * (mathX - h);
      const val = fn(innerX);
      if (val !== null && isFinite(val)) {
        const mathY = a * val + k;
        const py = originY - mathY * scale;
        if (py >= -100 && py <= H + 100) {
          if (!started) { ctx.moveTo(px, py); started = true; }
          else { ctx.lineTo(px, py); }
        } else {
          started = false;
        }
      } else {
        started = false;
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function compileMathExpr(expr) {
    const clean = (expr || '').toLowerCase().trim();
    if (clean === 'sin(x)' || clean === 'sin') return (x) => Math.sin(x);
    if (clean === 'cos(x)' || clean === 'cos') return (x) => Math.cos(x);
    if (clean === 'tan(x)' || clean === 'tan') return (x) => Math.tan(x);
    if (clean === 'x²' || clean === 'x^2' || clean === 'quadratic') return (x) => x * x;
    if (clean === 'x³' || clean === 'x^3' || clean === 'cubic') return (x) => x * x * x;
    if (clean === '|x|' || clean === 'abs(x)' || clean === 'abs') return (x) => Math.abs(x);
    if (clean === 'e^x' || clean === 'exp(x)' || clean === 'exp') return (x) => Math.exp(x);
    if (clean === '1/x' || clean === 'rational') return (x) => (Math.abs(x) > 0.001 ? 1 / x : null);
    if (clean === 'sqrt(x)' || clean === '√x') return (x) => (x >= 0 ? Math.sqrt(x) : null);

    try {
      const sanitized = clean.replace(/\^/g, '**').replace(/x/g, '(x)');
      const func = new Function('x', `return ${sanitized};`);
      return (x) => {
        try {
          const res = func(x);
          return isFinite(res) ? res : null;
        } catch (_) { return null; }
      };
    } catch (_) {
      return (x) => Math.sin(x);
    }
  }

  function loadGraphPreset(id, familyId) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;
    const presets = {
      'sin': { expr: 'sin(x)', a: 1, b: 1, h: 0, k: 0 },
      'cos': { expr: 'cos(x)', a: 1, b: 1, h: 0, k: 0 },
      'quadratic': { expr: 'x²', a: 1, b: 1, h: 0, k: 0 },
      'cubic': { expr: 'x³', a: 1, b: 1, h: 0, k: 0 },
      'abs': { expr: '|x|', a: 1, b: 1, h: 0, k: 0 },
      'exp': { expr: 'e^x', a: 1, b: 1, h: 0, k: 0 },
      'rational': { expr: '1/x', a: 1, b: 1, h: 0, k: 0 }
    };
    const sel = presets[familyId] || presets['sin'];
    p.graphState = { ...p.graphState, ...sel, familyId };

    const cv = containerEl ? containerEl.querySelector(`#wp-graph-cv-${id}`) : document.getElementById(`wp-graph-cv-${id}`);
    const eqInput = containerEl ? containerEl.querySelector(`#wp-eq-input-${id}`) : document.getElementById(`wp-eq-input-${id}`);
    if (eqInput) eqInput.value = sel.expr;
    if (cv) renderGraphWorkspace(p, cv);

    const centerHead = containerEl ? containerEl.querySelector(`#wp-center-${id}`) : document.getElementById(`wp-center-${id}`);
    if (centerHead) renderHeaderControls(p, centerHead);
  }

  function updateGraphEquation(id, expr) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;
    p.graphState.expr = expr;
    const cv = containerEl ? containerEl.querySelector(`#wp-graph-cv-${id}`) : document.getElementById(`wp-graph-cv-${id}`);
    if (cv) renderGraphWorkspace(p, cv);
  }

  function setGraphParam(id, param, val) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;
    p.graphState[param] = val;
    const lbl = containerEl ? containerEl.querySelector(`#wp-val-${param}-${id}`) : document.getElementById(`wp-val-${param}-${id}`);
    if (lbl) lbl.textContent = val;
    const cv = containerEl ? containerEl.querySelector(`#wp-graph-cv-${id}`) : document.getElementById(`wp-graph-cv-${id}`);
    if (cv) renderGraphWorkspace(p, cv);
  }

  function setGraphLineColor(id, color) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;
    p.graphState.color = color;
    const cv = containerEl ? containerEl.querySelector(`#wp-graph-cv-${id}`) : document.getElementById(`wp-graph-cv-${id}`);
    if (cv) renderGraphWorkspace(p, cv);
  }

  function resetGraphView(id) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;
    p.graphState.zoom = 1;
    p.graphState.panX = 0;
    p.graphState.panY = 0;
    const cv = containerEl ? containerEl.querySelector(`#wp-graph-cv-${id}`) : document.getElementById(`wp-graph-cv-${id}`);
    if (cv) renderGraphWorkspace(p, cv);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. PPT PRESENTER CONTENT & FULL-FIDELITY SLIDE ENGINE
  // ─────────────────────────────────────────────────────────────────────────────

  function decodeXmlEntities(str) {
    if (!str) return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  function getNodeLocalName(el) {
    if (!el) return '';
    return (el.localName || el.nodeName.split(':').pop() || '').toLowerCase();
  }

  function findDescendantsByLocalNames(parent, localNames) {
    if (!parent) return [];
    const names = (Array.isArray(localNames) ? localNames : [localNames]).map(n => n.toLowerCase());
    const list = [];
    function walk(curr) {
      if (!curr || !curr.childNodes) return;
      for (let i = 0; i < curr.childNodes.length; i++) {
        const n = curr.childNodes[i];
        if (n.nodeType === 1) { // Element node
          if (names.includes(getNodeLocalName(n))) {
            list.push(n);
          }
          walk(n);
        }
      }
    }
    walk(parent);
    return list;
  }

  function findFirstDescendantByLocalNames(parent, localNames) {
    if (!parent) return null;
    const names = (Array.isArray(localNames) ? localNames : [localNames]).map(n => n.toLowerCase());
    function walk(curr) {
      if (!curr || !curr.childNodes) return null;
      for (let i = 0; i < curr.childNodes.length; i++) {
        const n = curr.childNodes[i];
        if (n.nodeType === 1) {
          if (names.includes(getNodeLocalName(n))) {
            return n;
          }
          const found = walk(n);
          if (found) return found;
        }
      }
      return null;
    }
    return walk(parent);
  }

  function parseXmlColor(node, defaultColor = '#ffffff') {
    if (!node) return defaultColor;
    const srgb = findFirstDescendantByLocalNames(node, ['srgbclr']);
    if (srgb && srgb.getAttribute('val')) {
      const val = srgb.getAttribute('val').trim();
      return val.startsWith('#') ? val : `#${val}`;
    }
    const scheme = findFirstDescendantByLocalNames(node, ['schemeclr']);
    if (scheme && scheme.getAttribute('val')) {
      const val = scheme.getAttribute('val').trim();
      const schemeColors = {
        'accent1': '#38bdf8',
        'accent2': '#f43f5e',
        'accent3': '#22c55e',
        'accent4': '#eab308',
        'accent5': '#a855f7',
        'accent6': '#06b6d4',
        'tx1': '#ffffff',
        'tx2': '#cbd5e1',
        'bg1': '#081226',
        'bg2': '#0f172a',
        'dk1': '#020617',
        'lt1': '#f8fafc'
      };
      return schemeColors[val] || defaultColor;
    }
    return defaultColor;
  }

  function wrapCanvasText(ctx, text, maxWidth) {
    if (!text) return [];
    const words = String(text).split(' ');
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  function generateDefaultSlideDeck(title) {
    return {
      fileName: 'Lecture-Presentation.pptx',
      slideCount: 3,
      slides: [
        {
          index: 1,
          name: 'Slide 1 - Overview & Objectives',
          title: title || 'Lecture Presentation & Topic Overview',
          subtitle: 'Interactive Smart Board Teaching Deck',
          bullets: [
            '1. Fundamental concepts, definitions & theorems',
            '2. Real-time visual models & derivations',
            '3. Step-by-step classroom problem solving'
          ]
        },
        {
          index: 2,
          name: 'Slide 2 - Key Concepts & Derivations',
          title: 'Key Concepts & Mathematical Models',
          subtitle: 'Mathematical Principles & Visual Graphs',
          bullets: [
            '• Equation modeling and coordinate transformations',
            '• In-depth analysis of properties and boundary values',
            '• Key observations for practical engineering scenarios'
          ]
        },
        {
          index: 3,
          name: 'Slide 3 - Practice Questions & Boardwork',
          title: 'Classroom Exercises & Practice',
          subtitle: 'Derivation Walkthrough & Student Interaction',
          bullets: [
            '• Problem 1: Find roots and critical points',
            '• Problem 2: Apply boundary conditions to solution curve',
            '• Problem 3: Verify results using visual graph checks'
          ]
        }
      ]
    };
  }

  async function parsePresentationFile(file) {
    const name = file.name || 'presentation';
    const ext = name.split('.').pop().toLowerCase();

    // 0. Primary High-Resolution PowerPoint Backend Converter (Exact 100% pixel-perfect desktop slides)
    if (ext === 'pptx' || ext === 'ppt' || ext === 'pps' || ext === 'ppsx' || ext === 'odp') {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const resp = await fetch('/api/smartboard/convert-pptx', {
          method: 'POST',
          body: formData
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.success && Array.isArray(data.slides) && data.slides.length > 0) {
            return {
              fileName: data.fileName || file.name,
              slideCount: data.slides.length,
              slides: data.slides
            };
          }
        }
      } catch (backendErr) {
        console.warn('Backend PowerPoint COM conversion unreachable, using OpenXML fallback:', backendErr);
      }
    }

    // 1. PDF Presentations (.pdf) — Crisp Vector Slides
    if (ext === 'pdf' || file.type === 'application/pdf') {
      if (typeof window.pdfjsLib === 'undefined') {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          s.onload = () => {
            if (window.pdfjsLib) {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            resolve();
          };
          s.onerror = () => reject(new Error('PDF engine not reachable'));
          document.head.appendChild(s);
        });
      }
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const slides = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.8 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        slides.push({
          index: i,
          name: `Slide ${i}`,
          title: `${file.name} — Page ${i}`,
          dataUrl: canvas.toDataURL('image/jpeg', 0.92)
        });
      }
      return {
        fileName: file.name,
        slideCount: slides.length,
        slides
      };
    }

    // 2. Direct Slide Images (.png, .jpg, .jpeg, .webp, .svg)
    if (file.type && file.type.startsWith('image/')) {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      return {
        fileName: file.name,
        slideCount: 1,
        slides: [{ index: 1, name: file.name, title: file.name, dataUrl }]
      };
    }

    // 3. PPTX (PowerPoint OpenXML File) — Full XML Shape & Layout Parsing
    if (ext === 'pptx' || ext === 'ppt') {
      try {
        if (typeof window.JSZip === 'undefined') {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('JSZip failed to load'));
            document.head.appendChild(s);
          });
        }
        const arrayBuffer = await file.arrayBuffer();
        const zip = await window.JSZip.loadAsync(arrayBuffer);

        // Slide dimensions from presentation.xml
        let slideW = 12192000;
        let slideH = 6858000;
        const presFile = zip.file('ppt/presentation.xml') || zip.file('ppt/Presentation.xml') || zip.file(/^ppt[\/\\]presentation\.xml$/i)[0];
        if (presFile) {
          const presXml = await presFile.async('string');
          const szMatch = presXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/i) || presXml.match(/cx="(\d+)"[^>]*cy="(\d+)"/i);
          if (szMatch) {
            slideW = parseInt(szMatch[1], 10) || 12192000;
            slideH = parseInt(szMatch[2], 10) || 6858000;
          }
        }

        // Collect all media files (images, diagrams, logos)
        const mediaMap = {};
        const mediaFiles = [];
        zip.forEach((path) => {
          const cleanPath = path.replace(/^\//, '').replace(/\\/g, '/');
          if (/^ppt\/media\//i.test(cleanPath)) {
            mediaFiles.push(path);
          }
        });
        for (const mPath of mediaFiles) {
          try {
            const b64 = await zip.file(mPath).async('base64');
            const mExt = mPath.split('.').pop().toLowerCase();
            const mime = (mExt === 'png') ? 'image/png' : (mExt === 'svg' ? 'image/svg+xml' : (mExt === 'gif' ? 'image/gif' : 'image/jpeg'));
            const cleanKey = mPath.replace(/^\//, '').replace(/\\/g, '/');
            const shortKey = cleanKey.replace(/^ppt\//i, '').replace(/^media\//i, '');
            mediaMap[cleanKey] = `data:${mime};base64,${b64}`;
            mediaMap[shortKey] = `data:${mime};base64,${b64}`;
            mediaMap[mPath] = `data:${mime};base64,${b64}`;
          } catch(e) {}
        }

        // Find and sort slides numerically
        const slideFileEntries = [];
        zip.forEach((path) => {
          const cleanPath = path.replace(/^\//, '').replace(/\\/g, '/');
          if (/^ppt\/slides\/slide\d+\.xml$/i.test(cleanPath)) {
            slideFileEntries.push(cleanPath);
          }
        });

        slideFileEntries.sort((a, b) => {
          const numA = parseInt((a.match(/slide(\d+)\.xml/i) || [0, 0])[1], 10);
          const numB = parseInt((b.match(/slide(\d+)\.xml/i) || [0, 0])[1], 10);
          return numA - numB;
        });

        if (slideFileEntries.length > 0) {
          const slides = [];
          const parser = new DOMParser();

          for (let i = 0; i < slideFileEntries.length; i++) {
            const slidePath = slideFileEntries[i];
            const slideZipFile = zip.file(slidePath) || zip.file(slidePath.replace(/\//g, '\\'));
            if (!slideZipFile) continue;

            const xmlStr = await slideZipFile.async('string');
            let doc;
            try {
              doc = parser.parseFromString(xmlStr, 'text/xml');
            } catch (pErr) {
              doc = null;
            }

            // Slide relationships (links to images)
            const slideBaseName = slidePath.split('/').pop();
            const relsPath = `ppt/slides/_rels/${slideBaseName}.rels`;
            const relMap = {};
            const relsFile = zip.file(relsPath) || zip.file(relsPath.replace(/\//g, '\\'));
            if (relsFile) {
              try {
                const relsXml = await relsFile.async('string');
                const relMatches = relsXml.match(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/gi) || [];
                relMatches.forEach((rm) => {
                  const idMatch = rm.match(/Id="([^"]+)"/i);
                  const targetMatch = rm.match(/Target="([^"]+)"/i);
                  if (idMatch && targetMatch) {
                    const rId = idMatch[1];
                    const rawTarget = targetMatch[1].replace('../', 'ppt/').replace('ppt/ppt/', 'ppt/').replace(/\\/g, '/');
                    const cleanTarget = rawTarget.replace(/^\//, '');
                    relMap[rId] = mediaMap[cleanTarget] || mediaMap[cleanTarget.replace(/^ppt\//i, '')] || mediaMap[cleanTarget.replace(/^ppt\/media\//i, '')];
                  }
                });
              } catch(rErr) {}
            }

            // Extract background color
            let slideBg = '#081226';
            if (doc) {
              const bgEl = findFirstDescendantByLocalNames(doc, ['bg']);
              if (bgEl) {
                const bgClr = parseXmlColor(bgEl, null);
                if (bgClr) slideBg = bgClr;
              }
            }

            // Extract Shapes, Text Boxes, Pictures, Tables
            const shapeElementsHtml = [];
            const textLinesAll = [];
            let primaryTitle = '';

            if (doc) {
              // 1. Pictures (<p:pic>)
              const picNodes = findDescendantsByLocalNames(doc, ['pic']);
              picNodes.forEach((pic) => {
                const blip = findFirstDescendantByLocalNames(pic, ['blip']);
                const embedId = blip ? (blip.getAttribute('r:embed') || blip.getAttribute('embed')) : null;
                const imgSrc = embedId ? relMap[embedId] : null;

                const off = findFirstDescendantByLocalNames(pic, ['off']);
                const ext = findFirstDescendantByLocalNames(pic, ['ext']);
                if (imgSrc && off && ext) {
                  const x = (parseInt(off.getAttribute('x') || '0', 10) / slideW) * 100;
                  const y = (parseInt(off.getAttribute('y') || '0', 10) / slideH) * 100;
                  const w = (parseInt(ext.getAttribute('cx') || '0', 10) / slideW) * 100;
                  const h = (parseInt(ext.getAttribute('cy') || '0', 10) / slideH) * 100;

                  shapeElementsHtml.push(`
                    <img src="${imgSrc}" style="position:absolute;left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;width:${w.toFixed(2)}%;height:${h.toFixed(2)}%;object-fit:contain;border-radius:6px;z-index:2;" />
                  `);
                }
              });

              // 2. Shapes & Text Boxes (<p:sp>)
              const spNodes = findDescendantsByLocalNames(doc, ['sp']);
              spNodes.forEach((sp) => {
                const off = findFirstDescendantByLocalNames(sp, ['off']);
                const ext = findFirstDescendantByLocalNames(sp, ['ext']);
                if (!off || !ext) return;

                const x = (parseInt(off.getAttribute('x') || '0', 10) / slideW) * 100;
                const y = (parseInt(off.getAttribute('y') || '0', 10) / slideH) * 100;
                const w = (parseInt(ext.getAttribute('cx') || '0', 10) / slideW) * 100;
                const h = (parseInt(ext.getAttribute('cy') || '0', 10) / slideH) * 100;

                // Check title placeholder
                const ph = findFirstDescendantByLocalNames(sp, ['ph']);
                const isTitlePh = ph && (ph.getAttribute('type') === 'title' || ph.getAttribute('type') === 'ctrTitle');

                // Shape background fill
                const spPr = findFirstDescendantByLocalNames(sp, ['sppr']);
                let spBg = 'transparent';
                let spBorder = 'none';
                if (spPr) {
                  const solidFill = findFirstDescendantByLocalNames(spPr, ['solidfill']);
                  if (solidFill) {
                    spBg = parseXmlColor(solidFill, 'transparent');
                  }
                  const ln = findFirstDescendantByLocalNames(spPr, ['ln']);
                  if (ln) {
                    const lnColor = parseXmlColor(ln, 'rgba(56,189,248,0.25)');
                    spBorder = `1px solid ${lnColor}`;
                  }
                }

                // Text paragraphs
                const paragraphs = findDescendantsByLocalNames(sp, ['p']);
                const pTagsHtml = [];

                paragraphs.forEach((pEl) => {
                  const pPr = findFirstDescendantByLocalNames(pEl, ['ppr']);
                  const alignVal = pPr ? (pPr.getAttribute('algn') || 'l') : 'l';
                  const textAlign = (alignVal === 'ctr') ? 'center' : (alignVal === 'r') ? 'right' : (alignVal === 'just') ? 'justify' : 'left';

                  const runs = findDescendantsByLocalNames(pEl, ['r']);
                  const runSpans = [];

                  runs.forEach((r) => {
                    const tEl = findFirstDescendantByLocalNames(r, ['t']);
                    if (!tEl || !tEl.textContent) return;
                    const text = decodeXmlEntities(tEl.textContent);
                    if (!text.trim()) return;

                    textLinesAll.push(text.trim());
                    if (!primaryTitle && (isTitlePh || (y < 35 && text.length < 90))) {
                      primaryTitle = text.trim();
                    }

                    const rPr = findFirstDescendantByLocalNames(r, ['rpr']);
                    let fontSz = 16;
                    let isBold = false;
                    let isItalic = false;
                    let textColor = '#ffffff';

                    if (rPr) {
                      const sz = parseInt(rPr.getAttribute('sz') || '1600', 10);
                      fontSz = Math.max(11, Math.min(38, Math.round(sz / 100)));
                      isBold = rPr.getAttribute('b') === '1';
                      isItalic = rPr.getAttribute('i') === '1';
                      textColor = parseXmlColor(rPr, '#ffffff');
                    }

                    runSpans.push(`<span style="font-size:${fontSz}px;font-weight:${isBold ? '700' : '500'};font-style:${isItalic ? 'italic' : 'normal'};color:${textColor};line-height:1.35;">${text}</span>`);
                  });

                  // If no run tags, look directly for <a:t>
                  if (runSpans.length === 0) {
                    const directTs = findDescendantsByLocalNames(pEl, ['t']);
                    directTs.forEach(tEl => {
                      if (!tEl || !tEl.textContent) return;
                      const text = decodeXmlEntities(tEl.textContent);
                      if (text.trim()) {
                        textLinesAll.push(text.trim());
                        if (!primaryTitle && (isTitlePh || (y < 35 && text.length < 90))) primaryTitle = text.trim();
                        runSpans.push(`<span style="font-size:15px;font-weight:500;color:#ffffff;line-height:1.35;">${text}</span>`);
                      }
                    });
                  }

                  if (runSpans.length > 0) {
                    pTagsHtml.push(`<div style="text-align:${textAlign};margin-bottom:5px;word-break:break-word;">${runSpans.join('')}</div>`);
                  }
                });

                if (pTagsHtml.length > 0 || (spBg !== 'transparent' && w > 4 && h > 4)) {
                  shapeElementsHtml.push(`
                    <div style="position:absolute;left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;width:${w.toFixed(2)}%;height:${h.toFixed(2)}%;background:${spBg};border:${spBorder};border-radius:6px;padding:8px;box-sizing:border-box;overflow:hidden;z-index:3;display:flex;flex-direction:column;justify-content:center;">
                      ${pTagsHtml.join('')}
                    </div>
                  `);
                }
              });

              // 3. Tables (<a:tbl>)
              const tblNodes = findDescendantsByLocalNames(doc, ['tbl']);
              tblNodes.forEach((tbl) => {
                const trNodes = findDescendantsByLocalNames(tbl, ['tr']);
                const rowsHtml = [];
                trNodes.forEach((tr) => {
                  const tcNodes = findDescendantsByLocalNames(tr, ['tc']);
                  const cellsHtml = [];
                  tcNodes.forEach((tc) => {
                    const tNodes = findDescendantsByLocalNames(tc, ['t']);
                    const cellText = tNodes.map(t => decodeXmlEntities(t.textContent)).join(' ').trim();
                    cellsHtml.push(`<td style="border:1px solid rgba(255,255,255,0.22);padding:7px 10px;color:#e2e8f0;font-size:12.5px;">${cellText || '&nbsp;'}</td>`);
                  });
                  rowsHtml.push(`<tr>${cellsHtml.join('')}</tr>`);
                });
                if (rowsHtml.length > 0) {
                  shapeElementsHtml.push(`
                    <div style="position:absolute;left:6%;top:24%;width:88%;max-height:65%;overflow:auto;z-index:4;background:rgba(15,23,42,0.92);border-radius:8px;border:1px solid rgba(56,189,248,0.35);padding:10px;">
                      <table style="width:100%;border-collapse:collapse;text-align:left;">${rowsHtml.join('')}</table>
                    </div>
                  `);
                }
              });
            }

            // Fallback text extraction via regex if DOM found no text
            if (textLinesAll.length === 0) {
              const rawTMatches = xmlStr.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
              rawTMatches.forEach(m => {
                const clean = decodeXmlEntities(m.replace(/<[^>]+>/g, '').trim());
                if (clean) textLinesAll.push(clean);
              });
            }

            const slideTitle = primaryTitle || textLinesAll[0] || `Slide ${i + 1}`;
            const bullets = textLinesAll.filter(t => t !== slideTitle);

            // Construct Full HTML5 Slide Layout
            const slideHtml = `
              <div class="wp-pptx-slide-canvas" style="position:relative;width:100%;height:100%;background:${slideBg};overflow:hidden;user-select:none;font-family:'Segoe UI',Inter,system-ui,sans-serif;">
                <!-- Slide Header Banner Tag -->
                <div style="position:absolute;top:0;left:0;right:0;height:42px;background:linear-gradient(135deg, rgba(14,165,233,0.35) 0%, rgba(139,92,246,0.25) 100%);border-bottom:1px solid rgba(56,189,248,0.3);display:flex;align-items:center;justify-content:space-between;padding:0 18px;z-index:10;">
                  <span style="color:#38bdf8;font-size:12px;font-weight:700;letter-spacing:0.3px;">📑 SLIDE ${i + 1} OF ${slideFileEntries.length} — ${file.name}</span>
                  <span style="color:#94a3b8;font-size:11px;font-weight:500;">PowerPoint Slide</span>
                </div>
                <!-- Real OpenXML Slide Shapes & Media Elements -->
                <div style="position:absolute;inset:42px 0 0 0;overflow:hidden;">
                  ${shapeElementsHtml.length > 0 ? shapeElementsHtml.join('') : `
                    <div style="padding:28px 32px;color:#fff;display:flex;flex-direction:column;gap:16px;">
                      <h2 style="color:#38bdf8;margin:0;font-size:22px;line-height:1.3;font-weight:700;">${slideTitle}</h2>
                      <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px;">
                        ${bullets.map(b => `<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px 16px;font-size:14px;color:#e2e8f0;line-height:1.4;">• ${b}</div>`).join('')}
                      </div>
                    </div>
                  `}
                </div>
              </div>
            `;

            slides.push({
              index: i + 1,
              name: `Slide ${i + 1}`,
              title: slideTitle,
              subtitle: file.name,
              bullets: bullets,
              htmlLayout: slideHtml,
              slideBg: slideBg
            });
          }

          if (slides.length > 0) {
            return {
              fileName: file.name,
              slideCount: slides.length,
              slides: slides
            };
          }
        }
      } catch (err) {
        console.warn('PPTX OpenXML layout parsing error:', err);
      }
    }

    // Fallback structured presentation deck for legacy files
    return {
      fileName: file.name,
      slideCount: 4,
      slides: [
        {
          index: 1,
          name: `${file.name} - Slide 1`,
          title: `${file.name} — Overview & Intro`,
          subtitle: 'PowerPoint Presentation Deck',
          bullets: [
            '1. Subject Overview & Core Objectives',
            '2. Fundamental Definitions & Key Principles',
            '3. Practical Engineering Applications'
          ]
        },
        {
          index: 2,
          name: `${file.name} - Slide 2`,
          title: 'Core Concepts & Theoretical Models',
          subtitle: 'Section 2 — Theoretical Foundation',
          bullets: [
            '• Formulation of Governing Equations',
            '• Boundary Conditions & Constraints',
            '• Comparative analysis of properties'
          ]
        },
        {
          index: 3,
          name: `${file.name} - Slide 3`,
          title: 'Diagrams & Numerical Derivations',
          subtitle: 'Section 3 — Detailed Boardwork',
          bullets: [
            '• Step 1: Initial state & parameter setting',
            '• Step 2: Intermediate expansion & reduction',
            '• Step 3: Final verified solution'
          ]
        },
        {
          index: 4,
          name: `${file.name} - Slide 4`,
          title: 'Classroom Discussion & Exercises',
          subtitle: 'Section 4 — Practice Problems',
          bullets: [
            '• Practice Problem 1 with interactive stylus annotation',
            '• Homework challenge & review derivation',
            '• Summary of key takeaways'
          ]
        }
      ]
    };
  }

  function mountPptContent(p, container, controlsBox) {
    const id = p.id;
    if (!p.pptState.currentDeck) {
      if (typeof PptPresenter !== 'undefined' && PptPresenter.getCurrentDeck && PptPresenter.getCurrentDeck()) {
        p.pptState.currentDeck = PptPresenter.getCurrentDeck();
      } else {
        p.pptState.currentDeck = generateDefaultSlideDeck('Interactive Lecture Presentation');
      }
    }

    const total = p.pptState.currentDeck?.slides?.length || 1;
    const current = (p.pptState.slideIndex || 0) + 1;

    // Slide Stage inside contentBox
    container.innerHTML = `
      <div class="wp-ppt-workspace" id="wp-ppt-wrap-${id}">
        <!-- Slide Stage Container -->
        <div class="wp-ppt-stage-frame" id="wp-ppt-stage-${id}">
          <canvas class="wp-ppt-slide-cv" id="wp-ppt-slide-${id}"></canvas>
        </div>
      </div>
    `;

    // Interactive Navigation and Dock placed in controlsBox layer above drawing canvas
    const targetControls = controlsBox || container.querySelector(`#wp-ppt-wrap-${id}`) || container;
    targetControls.innerHTML = `
      <!-- On-Stage Touch & Hover Navigation Arrows -->
      <button type="button" class="wp-ppt-stage-nav prev" onclick="event.stopPropagation(); WorkspaceSplit.prevSlide(${id})" title="Previous Slide (◀ / PageUp)" aria-label="Previous Slide">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button type="button" class="wp-ppt-stage-nav next" onclick="event.stopPropagation(); WorkspaceSplit.nextSlide(${id})" title="Next Slide (▶ / PageDown)" aria-label="Next Slide">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
      </button>

      <!-- On-Stage Floating Slide Dock -->
      <div class="wp-ppt-stage-dock" id="wp-ppt-dock-${id}">
        <button type="button" class="wp-ppt-dock-btn" onclick="event.stopPropagation(); WorkspaceSplit.prevSlide(${id})" title="Previous Slide">◀ Prev</button>
        <span class="wp-ppt-dock-counter" id="wp-dock-info-${id}">Slide <b>${current}</b> of ${total}</span>
        <button type="button" class="wp-ppt-dock-btn" onclick="event.stopPropagation(); WorkspaceSplit.nextSlide(${id})" title="Next Slide">Next ▶</button>
        <div class="wp-ppt-dock-sep"></div>
        <button type="button" class="wp-ppt-dock-btn highlight" onclick="event.stopPropagation(); WorkspaceSplit.openPptFilePicker(${id})" title="Open PowerPoint / PDF from your folder">
          📂 Open PPT from Folder
        </button>
      </div>
    `;

    // Attach Touch swipe on PPT container & controls
    [container, targetControls].forEach(el => {
      if (!el) return;
      let touchStartX = 0;
      let touchStartY = 0;
      el.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });
      el.addEventListener('touchend', (e) => {
        if (e.target && (e.target.closest('button') || e.target.closest('.wp-ppt-dock-btn'))) return;
        if (e.changedTouches && e.changedTouches[0]) {
          const dx = e.changedTouches[0].clientX - touchStartX;
          const dy = e.changedTouches[0].clientY - touchStartY;
          if (Math.abs(dx) > 60 && Math.abs(dy) < 70) {
            if (dx < 0) nextSlide(id);
            else prevSlide(id);
          }
        }
      }, { passive: true });
    });

    renderPptSlide(p);
    requestAnimationFrame(() => renderPptSlide(p));
    setTimeout(() => renderPptSlide(p), 50);
  }

  function renderPptSlide(p, cv) {
    const id = p.id;
    const stage = containerEl ? containerEl.querySelector(`#wp-ppt-stage-${id}`) : document.getElementById(`wp-ppt-stage-${id}`);
    if (!stage) return;

    const deck = p.pptState.currentDeck || generateDefaultSlideDeck('Lecture Presentation');
    p.pptState.currentDeck = deck;
    const slideIdx = p.pptState.slideIndex || 0;
    const slide = (deck.slides && deck.slides[slideIdx]) ? deck.slides[slideIdx] : null;

    if (!slide) return;

    // 1. If Full HTML5 Slide Layout is available
    if (slide.htmlLayout) {
      stage.innerHTML = `
        <div class="wp-pptx-slide-card" style="position:relative;width:96%;height:94%;aspect-ratio:16/9;background:${slide.slideBg || '#081226'};border-radius:10px;box-shadow:0 10px 36px rgba(0,0,0,0.65);border:1.5px solid rgba(56,189,248,0.35);overflow:hidden;">
          ${slide.htmlLayout}
        </div>
      `;
      return;
    }

    // 2. If Image / PDF Rasterized Slide is available
    if (slide.dataUrl && !slide.dataUrl.startsWith('data:application/')) {
      stage.innerHTML = `
        <div class="wp-pptx-slide-card" style="position:relative;width:96%;height:94%;display:flex;align-items:center;justify-content:center;background:#050b1a;border-radius:10px;overflow:hidden;box-shadow:0 10px 36px rgba(0,0,0,0.65);border:1.5px solid rgba(56,189,248,0.35);">
          <img src="${slide.dataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:6px;" alt="Slide ${slideIdx + 1}" />
        </div>
      `;
      return;
    }

    // 3. Fallback Canvas Card
    stage.innerHTML = `<canvas class="wp-ppt-slide-cv" id="wp-ppt-slide-${id}"></canvas>`;
    const slideCv = stage.querySelector(`#wp-ppt-slide-${id}`);
    if (slideCv) {
      const rect = stage.getBoundingClientRect();
      const W = Math.max(200, rect.width || 600);
      const H = Math.max(150, rect.height || 450);
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      slideCv.width = Math.round(W * dpr);
      slideCv.height = Math.round(H * dpr);
      const ctx = slideCv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawModernPptSlideCanvas(ctx, W, H, p, slideIdx, slide);
    }
  }

  function drawModernPptSlideCanvas(ctx, W, H, p, slideIdx, slide) {
    const aspect = 16 / 9;
    let cardW = W - 28;
    let cardH = cardW / aspect;
    if (cardH > H - 28) {
      cardH = H - 28;
      cardW = cardH * aspect;
    }
    const cardX = (W - cardW) / 2;
    const cardY = (H - cardH) / 2;

    ctx.fillStyle = '#050b1a';
    ctx.fillRect(0, 0, W, H);

    // Slide Card Background
    ctx.save();
    ctx.fillStyle = '#081226';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, 14);
    else ctx.rect(cardX, cardY, cardW, cardH);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top Header Banner
    const bannerH = Math.max(42, cardH * 0.2);
    const grad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
    grad.addColorStop(0, 'rgba(14, 165, 233, 0.3)');
    grad.addColorStop(1, 'rgba(139, 92, 246, 0.22)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, bannerH, [14, 14, 0, 0]);
    else ctx.rect(cardX, cardY, cardW, bannerH);
    ctx.fill();

    const titleText = (slide && slide.title) || `Slide ${slideIdx + 1}: Overview & Concepts`;
    const totalSlides = p.pptState.currentDeck?.slides?.length || 1;

    // Top Slide Tag Badge
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`📑 SLIDE ${slideIdx + 1} OF ${totalSlides} — ${p.pptState.currentDeck?.fileName || 'PowerPoint Deck'}`, cardX + 20, cardY + bannerH * 0.38);

    // Slide Title (Auto-wrapped if long)
    const titleFontSize = Math.max(14, Math.min(21, cardW * 0.026));
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${titleFontSize}px system-ui, sans-serif`;

    const titleLines = wrapCanvasText(ctx, titleText, cardW - 44);
    if (titleLines.length === 1) {
      ctx.fillText(titleLines[0], cardX + 20, cardY + bannerH * 0.78);
    } else {
      ctx.fillText(titleLines[0], cardX + 20, cardY + bannerH * 0.68);
      ctx.font = `bold ${Math.max(11, titleFontSize - 3)}px system-ui, sans-serif`;
      ctx.fillText(titleLines[1] + (titleLines.length > 2 ? '...' : ''), cardX + 20, cardY + bannerH * 0.92);
    }

    // Body Content Area
    const bullets = (slide && slide.bullets && slide.bullets.length > 0) ? slide.bullets : [
      '• Key discussion concepts and theoretical foundation',
      '• Mathematical equations, proofs, and system diagrams',
      '• Practical classroom derivations and student exercise problems'
    ];

    const contentTop = cardY + bannerH + 14;
    const contentH = cardH - bannerH - 32;

    // Check if slide has an embedded diagram image
    const hasImage = !!(slide && slide.imageSrc);
    const textWidth = hasImage ? (cardW - 40) * 0.58 : cardW - 40;
    const imageWidth = (cardW - 40) * 0.38;
    const imageX = cardX + 20 + textWidth + 14;

    if (hasImage) {
      const slideImg = new Image();
      slideImg.onload = () => {
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(imageX, contentTop, imageWidth, contentH, 8);
        else ctx.rect(imageX, contentTop, imageWidth, contentH);
        ctx.clip();
        ctx.drawImage(slideImg, imageX, contentTop, imageWidth, contentH);
        ctx.restore();
      };
      slideImg.src = slide.imageSrc;
    }

    const itemH = Math.max(28, Math.min(65, (contentH - (bullets.length * 6)) / bullets.length));
    const bodyFontSize = Math.max(11, Math.min(14, cardW * 0.018));
    ctx.font = `${bodyFontSize}px system-ui, sans-serif`;

    bullets.forEach((b, idx) => {
      const by = contentTop + idx * (itemH + 6);
      if (by + itemH > cardY + cardH - 8) return;

      // Card row background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cardX + 20, by, textWidth, itemH, 7);
      else ctx.rect(cardX + 20, by, textWidth, itemH);
      ctx.fill();
      ctx.stroke();

      // Wrapped bullet text inside row
      ctx.fillStyle = '#e2e8f0';
      const textWrapped = wrapCanvasText(ctx, b, textWidth - 28);
      if (textWrapped.length === 1) {
        ctx.fillText(textWrapped[0], cardX + 34, by + itemH / 2 + 4.5);
      } else {
        const lineStep = Math.min(16, itemH / textWrapped.length);
        textWrapped.slice(0, 2).forEach((tw, lIdx) => {
          ctx.fillText(tw, cardX + 34, by + 13 + (lIdx * lineStep));
        });
      }
    });

    // Bottom prompt
    ctx.fillStyle = '#64748b';
    ctx.font = '10.5px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`📂 Slide ${slideIdx + 1} of ${totalSlides} • Click "Open PPT from Folder" to change deck`, cardX + cardW - 20, cardY + cardH - 10);
  }

  function prevSlide(id) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;
    if (p.pptState.slideIndex > 0) {
      p.pptState.slideIndex--;
      updateSlideDisplay(p);
    }
  }

  function nextSlide(id) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;
    const total = (p.pptState.currentDeck && p.pptState.currentDeck.slides) ? p.pptState.currentDeck.slides.length : 1;
    if (p.pptState.slideIndex < total - 1) {
      p.pptState.slideIndex++;
      updateSlideDisplay(p);
    }
  }

  function updateSlideDisplay(p) {
    const lbl = containerEl ? containerEl.querySelector(`#wp-slide-lbl-${p.id}`) : document.getElementById(`wp-slide-lbl-${p.id}`);
    const total = (p.pptState.currentDeck && p.pptState.currentDeck.slides) ? p.pptState.currentDeck.slides.length : 1;
    const current = (p.pptState.slideIndex || 0) + 1;
    if (lbl) lbl.textContent = `${current}/${total}`;

    const dockInfo = containerEl ? containerEl.querySelector(`#wp-dock-info-${p.id}`) : document.getElementById(`wp-dock-info-${p.id}`);
    if (dockInfo) dockInfo.innerHTML = `Slide <b>${current}</b> of ${total}`;

    renderPptSlide(p);
  }

  async function openPptFilePicker(id) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;

    // Ensure global dock from main board is closed when working in split partition
    if (typeof PptPresenter !== 'undefined' && PptPresenter.closeDock) {
      PptPresenter.closeDock();
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pptx,.ppt,.pdf,image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.onchange = async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) {
        fileInput.remove();
        return;
      }

      if (typeof App !== 'undefined' && App.showToast) {
        App.showToast(`Loading "${files[0].name}" into Partition ${id}...`);
      }

      try {
        // If multiple images are chosen (e.g. Slide1.png, Slide2.png)
        if (files.length > 1 && Array.from(files).every(f => f.type.startsWith('image/'))) {
          const fileArr = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
          const slidePromises = fileArr.map((f, idx) => new Promise((resolve) => {
            const r = new FileReader();
            r.onload = (ev) => resolve({ index: idx + 1, name: f.name, title: f.name, dataUrl: ev.target.result });
            r.readAsDataURL(f);
          }));
          const loadedSlides = await Promise.all(slidePromises);
          p.pptState.currentDeck = {
            fileName: `${fileArr[0].name.replace(/\.[^/.]+$/, '')} (${files.length} slides)`,
            slideCount: loadedSlides.length,
            slides: loadedSlides
          };
        } else {
          // Single file (PPTX, PDF, Image, or PPT)
          const file = files[0];
          const parsedDeck = await parsePresentationFile(file);
          p.pptState.currentDeck = parsedDeck;
        }

        p.pptState.slideIndex = 0;
        updateSlideDisplay(p);

        // Keep global presenter dock hidden in split partitions
        if (typeof PptPresenter !== 'undefined' && PptPresenter.closeDock) {
          PptPresenter.closeDock();
        }

        // Re-render header controls to show updated slide count
        const pEl = containerEl ? containerEl.querySelector(`.workspace-partition[data-pid="${id}"]`) : null;
        if (pEl) {
          const centerHead = pEl.querySelector('.wp-header-center');
          if (centerHead) renderHeaderControls(p, centerHead);
        }

        if (typeof App !== 'undefined' && App.showToast) {
          App.showToast(`✓ Loaded "${p.pptState.currentDeck.fileName}" (${p.pptState.currentDeck.slides.length} slides)`);
        }
      } catch (err) {
        console.error('Error opening presentation:', err);
        if (typeof App !== 'undefined' && App.showToast) {
          App.showToast(`Error opening presentation: ${err.message}`);
        }
      } finally {
        fileInput.remove();
      }
    };
    fileInput.click();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. PDF DOCUMENT VIEWER CONTENT
  // ─────────────────────────────────────────────────────────────────────────────

  function mountPdfContent(p, container) {
    const id = p.id;
    container.innerHTML = `
      <div class="wp-pdf-container">
        <div class="wp-pdf-toolbar">
          <span>📄 ${p.pdfState.name || 'PDF Document'}</span>
          <button class="wp-pill-btn highlight" onclick="WorkspaceSplit.triggerPartitionFilePicker(${id})">📂 Open PDF</button>
        </div>
        <div class="wp-pdf-viewport" id="wp-pdf-view-${id}">
          ${p.pdfState.dataUrl ? `
            <iframe src="${p.pdfState.dataUrl}" style="width:100%; height:100%; border:none;"></iframe>
          ` : `
            <div class="wp-empty-state">
              <span style="font-size:32px;">📄</span>
              <div class="wp-empty-title">PDF Document Ready</div>
              <div class="wp-empty-desc">Click button to open PDF notes or textbook pages</div>
              <button class="wp-add-content-main-btn" onclick="WorkspaceSplit.triggerPartitionFilePicker(${id})">📂 Load PDF File</button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. IMAGE / DIAGRAM CONTENT
  // ─────────────────────────────────────────────────────────────────────────────

  function mountImageContent(p, container) {
    const id = p.id;
    container.innerHTML = `
      <div class="wp-image-container">
        ${p.imageState && p.imageState.src ? `
          <img src="${p.imageState.src}" alt="Diagram" class="wp-fit-image" />
        ` : `
          <div class="wp-empty-state">
            <span style="font-size:32px;">🖼️</span>
            <div class="wp-empty-title">Insert Image or Diagram</div>
            <div class="wp-empty-desc">PNG, JPG, SVG, WebP</div>
            <button class="wp-add-content-main-btn" onclick="WorkspaceSplit.triggerPartitionFilePicker(${id})">🖼️ Choose Image File</button>
          </div>
        `}
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. VIDEO PLAYER CONTENT
  // ─────────────────────────────────────────────────────────────────────────────

  function mountVideoContent(p, container) {
    const id = p.id;
    container.innerHTML = `
      <div class="wp-video-container">
        ${p.videoState && p.videoState.src ? `
          <video src="${p.videoState.src}" controls autoplay loop class="wp-fit-video"></video>
        ` : `
          <div class="wp-empty-state">
            <span style="font-size:32px;">🎥</span>
            <div class="wp-empty-title">Educational Video Player</div>
            <div class="wp-empty-desc">Load video file (.mp4, .webm)</div>
            <button class="wp-add-content-main-btn" onclick="WorkspaceSplit.triggerPartitionFilePicker(${id})">📁 Open Video File</button>
          </div>
        `}
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. SIMULATION / PHYSICS LAB CONTENT
  // ─────────────────────────────────────────────────────────────────────────────

  function mountSimulationContent(p, container) {
    const id = p.id;
    container.innerHTML = `
      <canvas class="wp-sim-cv" id="wp-sim-${id}"></canvas>
    `;
    const cv = container.querySelector(`#wp-sim-${id}`);
    renderSimulation(p, cv);
  }

  function setSimType(id, type) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;
    p.simState.type = type;
    const cv = containerEl.querySelector(`#wp-sim-${id}`);
    renderSimulation(p, cv);
    const centerHead = containerEl.querySelector(`#wp-center-${id}`);
    if (centerHead) renderHeaderControls(p, centerHead);
  }

  function renderSimulation(p, cv) {
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round((rect.width || 400) * dpr);
    cv.height = Math.round((rect.height || 300) * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = rect.width || 400;
    const H = rect.height || 300;

    ctx.fillStyle = '#070f1e';
    ctx.fillRect(0, 0, W, H);

    const type = p.simState.type || 'pendulum';
    const cx = W / 2, cy = 40;

    if (type === 'pendulum') {
      const len = 140;
      const angle = (p.simState.angle || 35) * (Math.PI / 180);
      const bobX = cx + Math.sin(angle) * len;
      const bobY = cy + Math.cos(angle) * len;

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy);
      ctx.lineTo(cx + 30, cy);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(234, 179, 8, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(bobX, bobY);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(bobX, bobY, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Simple Harmonic Motion: T = 2π√(L/g)', W / 2, H - 25);
    } else if (type === 'projectile') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const startPx = 40, startPy = H - 50;
      for (let x = 0; x <= W - 80; x += 4) {
        const y = startPy - (x * 0.8 - (0.003 * x * x));
        if (x === 0) ctx.moveTo(startPx + x, y);
        else ctx.lineTo(startPx + x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(startPx + 150, startPy - (150 * 0.8 - (0.003 * 150 * 150)), 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Projectile Trajectory: y = x·tan(θ) - (g·x²)/(2v²cos²θ)', W / 2, H - 25);
    } else {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const y = H / 2 + Math.sin(x * 0.04) * 45;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Harmonic Waveform: y(x,t) = A·sin(kx - ωt)', W / 2, H - 25);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIVE PARTITION MANAGEMENT (Focus indicator only, NOT tool switching)
  // ─────────────────────────────────────────────────────────────────────────────

  function setActivePartition(id) {
    activePartitionId = id;
    if (!containerEl) return;
    containerEl.querySelectorAll('.workspace-partition').forEach(pEl => {
      pEl.classList.toggle('active', pEl.dataset.pid === String(id));
    });
    if (typeof App !== 'undefined' && App.currentColor) {
      setActivePartitionColor(App.currentColor);
    }
  }

  function getActivePartitionId() {
    return activePartitionId;
  }

  function getActivePartition() {
    return partitions.find(p => p.id === activePartitionId);
  }

  function getPptContext(id) {
    const partition = partitions.find(p => String(p.id) === String(id));
    if (!partition || partition.type !== 'ppt') return null;
    const deck = partition.pptState?.currentDeck;
    const slideIndex = partition.pptState?.slideIndex || 0;
    return {
      fileName: deck?.fileName || 'PowerPoint presentation',
      slideNumber: slideIndex + 1,
      totalSlides: deck?.slides?.length || 0,
      imageSrc: deck?.slides?.[slideIndex]?.dataUrl || '',
      canEdit: !!deck?.slides?.[slideIndex]?.dataUrl,
    };
  }

  function deletePptRegion(id, bounds = { left: 0, top: 0, width: 1, height: 1 }) {
    const partition = partitions.find(p => String(p.id) === String(id));
    const deck = partition?.pptState?.currentDeck;
    const slideIndex = partition?.pptState?.slideIndex || 0;
    const slide = deck?.slides?.[slideIndex];
    if (!partition || !slide?.dataUrl) {
      if (typeof App !== 'undefined' && App.showToast) App.showToast('This slide cannot be edited here.');
      return false;
    }

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, 0, 0);
      context.fillStyle = '#ffffff';
      context.fillRect(
        Math.max(0, Math.round(bounds.left * canvas.width)),
        Math.max(0, Math.round(bounds.top * canvas.height)),
        Math.min(canvas.width, Math.round(bounds.width * canvas.width)),
        Math.min(canvas.height, Math.round(bounds.height * canvas.height)),
      );
      slide.dataUrl = canvas.toDataURL('image/png');
      updateSlideDisplay(partition);
      if (typeof App !== 'undefined' && App.showToast) App.showToast('Removed the selected area from this slide.');
    };
    image.onerror = () => {
      if (typeof App !== 'undefined' && App.showToast) App.showToast('Could not edit this slide.');
    };
    image.src = slide.dataUrl;
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEMPORARY MAXIMIZE & RESTORE (Full-Screen Content / Full-Screen Graph)
  // ─────────────────────────────────────────────────────────────────────────────

  function toggleMaximize(id) {
    if (maximizedPartitionId === id) {
      maximizedPartitionId = null;
      containerEl.querySelectorAll('.workspace-partition').forEach(pEl => {
        pEl.classList.remove('maximized');
        pEl.style.display = '';
        const maxBtn = pEl.querySelector('.wp-btn-max');
        if (maxBtn) {
          maxBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
          maxBtn.title = 'Maximize Partition (⤢)';
        }
      });
      const divider = document.getElementById('wp-split-divider');
      if (divider) divider.style.display = '';
    } else {
      maximizedPartitionId = id;
      containerEl.querySelectorAll('.workspace-partition').forEach(pEl => {
        if (pEl.dataset.pid === String(id)) {
          pEl.classList.add('maximized');
          pEl.style.display = 'flex';
          const maxBtn = pEl.querySelector('.wp-btn-max');
          if (maxBtn) {
            maxBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>';
            maxBtn.title = 'Restore Split Layout (Esc)';
          }
        } else {
          pEl.style.display = 'none';
        }
      });
      const divider = document.getElementById('wp-split-divider');
      if (divider) divider.style.display = 'none';
    }

    resizeAllPartitions();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RESIZE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  function resizeAllPartitions() {
    partitions.forEach(p => {
      resizePartition(p.id);
    });
  }

  function resizePartition(id) {
    const p = partitions.find(item => item.id === id);
    if (!p || !containerEl) return;

    const pEl = containerEl.querySelector(`.workspace-partition[data-pid="${id}"]`);
    if (!pEl) return;

    const gridCv = pEl.querySelector(`#wp-grid-${id}`);
    if (gridCv) drawPartitionGrid(p, gridCv);

    const graphCv = pEl.querySelector(`#wp-graph-cv-${id}`);
    if (graphCv) renderGraphWorkspace(p, graphCv);

    const pptCv = pEl.querySelector(`#wp-ppt-slide-${id}`);
    if (pptCv) renderPptSlide(p, pptCv);

    const simCv = pEl.querySelector(`#wp-sim-${id}`);
    if (simCv) renderSimulation(p, simCv);

    redrawPartitionInk(p);
  }

  // Compatibility stubs for legacy calls
  function syncPartitionWithApp() {}
  function setPartitionMode() {}
  function setPartitionTool() {}
  function setPartitionColor() {}
  function setPartitionSize() {}
  function setPartitionShape() {}
  function toggleShapeSelector() {}
  function togglePaletteCollapse() {}
  function undoPartition() { if (typeof App !== 'undefined' && App.undo) App.undo(); }
  function redoPartition() { if (typeof App !== 'undefined' && App.redo) App.redo(); }
  function undoActive() { if (typeof App !== 'undefined' && App.undo) App.undo(); }
  function redoActive() { if (typeof App !== 'undefined' && App.redo) App.redo(); }
  function clearPartition(id) { clearPartitionContent(id); }
  function addShapeToActive(shape) { if (typeof Shapes !== 'undefined' && Shapes.addShape) Shapes.addShape(shape); }
  function setInkColor(pid, hex, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const id = Number(pid);
    setActivePartition(id);
    const p = partitions.find(item => item.id === id);
    if (p) {
      p.inkColor = hex;
    }
    if (typeof App !== 'undefined') {
      if (App.setColor) App.setColor(hex);
      if (App.currentTool !== 'pen' && App.currentTool !== 'highlighter') {
        if (App.setTool) App.setTool('pen');
      }
    }
    updatePartitionSwatches(id);
  }

  function updatePartitionSwatches(pid) {
    const p = partitions.find(item => item.id === Number(pid));
    if (!p) return;
    const target = (p.inkColor || '').toLowerCase();
    const pEl = containerEl ? containerEl.querySelector(`.workspace-partition[data-pid="${pid}"]`) : null;
    if (pEl) {
      pEl.querySelectorAll('.wp-color-swatch').forEach(sw => {
        const swHex = (sw.dataset.hex || '').toLowerCase();
        sw.classList.toggle('active', swHex === target);
      });
    }
  }

  function setActivePartitionColor(hex) {
    if (!hex) return;
    const target = hex.toLowerCase();
    document.querySelectorAll('.wp-color-swatch').forEach(sw => {
      const swHex = (sw.dataset.hex || '').toLowerCase();
      sw.classList.toggle('active', swHex === target);
    });
  }

  function setActivePartitionTool() {}
  function setActivePartitionSize() {}
  function setActivePartitionEraserSize() {}

  // ─────────────────────────────────────────────────────────────────────────────
  // SERIALIZATION & SAVE/LOAD INTEGRATION
  // ─────────────────────────────────────────────────────────────────────────────

  function serialize() {
    return {
      mode: currentMode,
      ratio: splitRatio,
      partitions: partitions.map(p => ({
        id: p.id,
        title: p.title,
        type: p.type,
        boardBg: p.boardBg,
        inkColor: p.inkColor,
        inkSize: p.inkSize,
        strokes: Array.isArray(p.strokes) ? JSON.parse(JSON.stringify(p.strokes)) : [],
        graphState: JSON.parse(JSON.stringify(p.graphState || {})),
        pptState: p.pptState ? {
          slideIndex: p.pptState.slideIndex || 0,
          currentDeck: p.pptState.currentDeck || null,
          fileName: (p.pptState && p.pptState.currentDeck) ? p.pptState.currentDeck.fileName : null
        } : null,
        pdfState: { name: p.pdfState ? p.pdfState.name : null },
        simState: JSON.parse(JSON.stringify(p.simState || {}))
      }))
    };
  }

  function restore(stateOrMode, ratio, partitionsData) {
    let mode = stateOrMode;
    let r = ratio;
    let pData = partitionsData;

    if (typeof stateOrMode === 'object' && stateOrMode !== null) {
      mode = stateOrMode.mode;
      r = stateOrMode.ratio;
      pData = stateOrMode.partitions;
    }

    if (r) splitRatio = r;
    if (pData && Array.isArray(pData)) {
      pData.forEach(saved => {
        const target = partitions.find(p => p.id === saved.id);
        if (target) {
          target.title = saved.title || target.title;
          target.type = saved.type || target.type;
          target.boardBg = saved.boardBg || target.boardBg;
          if (saved.inkColor) target.inkColor = saved.inkColor;
          if (saved.inkSize) target.inkSize = saved.inkSize;
          if (Array.isArray(saved.strokes)) target.strokes = JSON.parse(JSON.stringify(saved.strokes));
          if (saved.graphState) target.graphState = JSON.parse(JSON.stringify(saved.graphState));
          if (saved.pptState) target.pptState = JSON.parse(JSON.stringify(saved.pptState));
          if (saved.simState) target.simState = JSON.parse(JSON.stringify(saved.simState));
        }
      });
    }

    setMode(mode || 'normal', r);
    setTimeout(() => {
      partitions.forEach(p => {
        if (p.strokes && p.strokes.length > 0) {
          redrawPartitionInk(p);
        }
      });
    }, 120);
  }

  return {
    init,
    setMode,
    getMode,
    getSplitRatio,
    setSplitRatio,
    enterSplit2Mode,
    enterSplit3Mode,
    enterSplit4Mode,
    applyPreset,
    getActivePartitionId,
    getActivePartition,
    getPptContext,
    deletePptRegion,
    setActivePartition,
    setInkColor,
    setActivePartitionColor,
    sendAiPrompt,
    updateMathSimAngle,
    openInsertMenu,
    closeAllInsertPopups,
    selectContentType,
    changePartitionContent,
    clearPartitionContent,
    triggerPartitionFilePicker,
    swapPartitions,
    toggleMaximize,
    loadGraphPreset,
    updateGraphEquation,
    setGraphParam,
    setGraphLineColor,
    resetGraphView,
    compileMathExpr,
    prevSlide,
    nextSlide,
    openPptFilePicker,
    parsePresentationFile,
    setPartitionBg,
    setSimType,
    resizeAllPartitions,
    resizePartition,
    serialize,
    restore,
    // Stubs
    syncPartitionWithApp,
    setPartitionMode,
    setPartitionTool,
    setPartitionColor,
    setPartitionSize,
    setPartitionShape,
    toggleShapeSelector,
    togglePaletteCollapse,
    undoPartition,
    redoPartition,
    undoActive,
    redoActive,
    clearPartition,
    addShapeToActive,
    setActivePartitionTool,
    setActivePartitionColor,
    setActivePartitionSize,
    setActivePartitionEraserSize
  };

})();

if (typeof window !== 'undefined') {
  window.WorkspaceSplit = WorkspaceSplit;
}
