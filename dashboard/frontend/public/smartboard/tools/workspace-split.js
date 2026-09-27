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
      case 'ppt': return 'PPT Presenter';
      case 'pdf': return 'PDF Document';
      case 'image': return 'Image / Diagram';
      case 'video': return 'Video Player';
      case 'simulation': return 'Physics Lab';
      case 'empty': return 'Empty';
      default: return 'Content';
    }
  }

  function getTypeIcon(type) {
    switch (type) {
      case 'whiteboard': return '✏️';
      case 'graph2d': return '📊';
      case 'ppt': return '📑';
      case 'pdf': return '📄';
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'simulation': return '🧪';
      default: return '➕';
    }
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
        <button class="wp-action-btn wp-btn-add-content" onclick="WorkspaceSplit.openInsertMenu(${id}, event)" title="Change / Insert Content">
          <span>＋ Content</span>
        </button>
        ${currentMode === 'split-2' ? `
          <button class="wp-action-btn wp-btn-swap" onclick="WorkspaceSplit.swapPartitions(1, 2)" title="Swap Partition 1 ⇄ Partition 2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/></svg>
          </button>
        ` : ''}
        <button class="wp-action-btn wp-btn-max" id="wp-max-${id}" onclick="WorkspaceSplit.toggleMaximize(${id})" title="Maximize Partition (⤢)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        </button>
        <button class="wp-action-btn wp-btn-clear" onclick="WorkspaceSplit.clearPartitionContent(${id})" title="Clear / Reset Content">
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
      case 'ppt':
        mountPptContent(p, contentBox);
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
        mountSimulationContent(p, contentBox);
        break;
      default:
        mountWhiteboardContent(p, contentBox);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INSERT CONTENT POPUP MENU (Minimal + Add Content Action per Section 6)
  // ─────────────────────────────────────────────────────────────────────────────

  function closeAllInsertPopups() {
    document.querySelectorAll('.wp-insert-popup').forEach(m => m.remove());
  }

  function openInsertMenu(id, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    closeAllInsertPopups();

    const pEl = containerEl.querySelector(`.workspace-partition[data-pid="${id}"]`);
    if (!pEl) return;

    const popup = document.createElement('div');
    popup.className = 'wp-insert-popup';
    popup.innerHTML = `
      <div class="wp-ip-header">
        <span>Insert Content</span>
        <button class="wp-ip-close" onclick="WorkspaceSplit.closeAllInsertPopups()">✕</button>
      </div>
      <div class="wp-ip-grid">
        <button class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'graph2d')">
          <span class="wp-ip-icon">📊</span>
          <div class="wp-ip-text">
            <strong>Graph</strong>
            <span>2D Function Curves</span>
          </div>
        </button>
        <button class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'ppt')">
          <span class="wp-ip-icon">📑</span>
          <div class="wp-ip-text">
            <strong>PPT</strong>
            <span>PowerPoint Presenter</span>
          </div>
        </button>
        <button class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'pdf')">
          <span class="wp-ip-icon">📄</span>
          <div class="wp-ip-text">
            <strong>PDF</strong>
            <span>Document Viewer</span>
          </div>
        </button>
        <button class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'image')">
          <span class="wp-ip-icon">🖼️</span>
          <div class="wp-ip-text">
            <strong>Image</strong>
            <span>Diagram / Picture</span>
          </div>
        </button>
        <button class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'video')">
          <span class="wp-ip-icon">🎥</span>
          <div class="wp-ip-text">
            <strong>Video</strong>
            <span>Educational Media</span>
          </div>
        </button>
        <button class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'simulation')">
          <span class="wp-ip-icon">🧪</span>
          <div class="wp-ip-text">
            <strong>Simulation</strong>
            <span>Physics Lab</span>
          </div>
        </button>
        <button class="wp-ip-item" onclick="WorkspaceSplit.triggerPartitionFilePicker(${id})">
          <span class="wp-ip-icon">📁</span>
          <div class="wp-ip-text">
            <strong>File</strong>
            <span>Open PPT / PDF / Image</span>
          </div>
        </button>
        <button class="wp-ip-item" onclick="WorkspaceSplit.selectContentType(${id}, 'whiteboard')">
          <span class="wp-ip-icon">✏️</span>
          <div class="wp-ip-text">
            <strong>Whiteboard</strong>
            <span>Clean Background</span>
          </div>
        </button>
      </div>
    `;

    pEl.appendChild(popup);
  }

  function selectContentType(id, type) {
    closeAllInsertPopups();
    changePartitionContent(id, type);
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
    p.type = 'empty';
    const pEl = containerEl.querySelector(`.workspace-partition[data-pid="${id}"]`);
    if (pEl) {
      mountPartitionContent(p, pEl);
    }
    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast(`Partition ${id} reset`);
    }
  }

  function triggerPartitionFilePicker(id) {
    closeAllInsertPopups();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pptx,.ppt,.pdf,image/*,video/*';
    input.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const name = file.name.toLowerCase();
      if (name.endsWith('.pptx') || name.endsWith('.ppt')) {
        const p = partitions.find(item => item.id === id);
        if (p) {
          p.type = 'ppt';
          const reader = new FileReader();
          reader.onload = (ev) => {
            p.pptState.currentDeck = {
              fileName: file.name,
              slides: [{ index: 1, name: 'Slide 1', dataUrl: ev.target.result }]
            };
            p.pptState.slideIndex = 0;
            changePartitionContent(id, 'ppt');
          };
          reader.readAsDataURL(file);
        }
      } else if (name.endsWith('.pdf')) {
        const p = partitions.find(item => item.id === id);
        if (p) {
          p.type = 'pdf';
          p.pdfState = { file, name: file.name, page: 1, totalPages: 1 };
          changePartitionContent(id, 'pdf');
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
    const gridCv = containerEl.querySelector(`#wp-grid-${id}`);
    if (gridCv) drawPartitionGrid(p, gridCv);
    const centerHead = containerEl.querySelector(`#wp-center-${id}`);
    if (centerHead) renderHeaderControls(p, centerHead);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. WHITEBOARD CONTENT
  // ─────────────────────────────────────────────────────────────────────────────

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
  // 3. PPT PRESENTER CONTENT
  // ─────────────────────────────────────────────────────────────────────────────

  function mountPptContent(p, container) {
    const id = p.id;
    container.innerHTML = `
      <div class="wp-ppt-workspace">
        <canvas class="wp-ppt-slide-cv" id="wp-ppt-slide-${id}"></canvas>
      </div>
    `;
    const slideCv = container.querySelector(`#wp-ppt-slide-${id}`);
    renderPptSlide(p, slideCv);
  }

  function renderPptSlide(p, cv) {
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round((rect.width || 400) * dpr);
    cv.height = Math.round((rect.height || 300) * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = rect.width || 400;
    const H = rect.height || 300;

    const deck = p.pptState.currentDeck;
    const slideIdx = p.pptState.slideIndex || 0;

    if (deck && deck.slides && deck.slides[slideIdx]) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, W, H); };
      img.src = deck.slides[slideIdx].dataUrl;
    } else {
      ctx.fillStyle = '#081329';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(201, 168, 76, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, W - 32, H - 32);

      ctx.fillStyle = '#e8c96b';
      ctx.font = 'bold 18px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PowerPoint Presenter', W / 2, H / 2 - 25);

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText(`Slide ${slideIdx + 1}: Interactive Lecture Deck`, W / 2, H / 2 + 5);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('Click 📂 Open File in header to load slides (.pptx)', W / 2, H / 2 + 35);
    }
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
    const total = (p.pptState.currentDeck && p.pptState.currentDeck.slides) ? p.pptState.currentDeck.slides.length : 3;
    if (p.pptState.slideIndex < total - 1) {
      p.pptState.slideIndex++;
      updateSlideDisplay(p);
    }
  }

  function updateSlideDisplay(p) {
    const lbl = containerEl.querySelector(`#wp-slide-lbl-${p.id}`);
    const total = (p.pptState.currentDeck && p.pptState.currentDeck.slides) ? p.pptState.currentDeck.slides.length : 3;
    if (lbl) lbl.textContent = `${p.pptState.slideIndex + 1}/${total}`;
    const cv = containerEl.querySelector(`#wp-ppt-slide-${p.id}`);
    renderPptSlide(p, cv);
  }

  async function openPptFilePicker(id) {
    const p = partitions.find(item => item.id === id);
    if (!p) return;

    if (window.electronAPI && typeof window.electronAPI.uploadPptx === 'function') {
      try {
        const res = await window.electronAPI.uploadPptx();
        if (res && res.success && res.slides && res.slides.length > 0) {
          p.pptState.currentDeck = res;
          p.pptState.slideIndex = 0;
          updateSlideDisplay(p);
          if (typeof App !== 'undefined' && App.showToast) App.showToast(`Loaded PPT deck in Partition ${id}`);
        }
      } catch (err) {
        console.warn('PPT picker error:', err);
      }
    } else {
      const fileInput = document.getElementById('ppt-file-input');
      if (fileInput) {
        fileInput.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            p.pptState.currentDeck = {
              fileName: file.name,
              slides: [{ index: 1, name: 'Slide 1', dataUrl: ev.target.result }]
            };
            p.pptState.slideIndex = 0;
            updateSlideDisplay(p);
          };
          reader.readAsDataURL(file);
        };
        fileInput.click();
      }
    }
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
  function setActivePartitionTool() {}
  function setActivePartitionColor() {}
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
        graphState: JSON.parse(JSON.stringify(p.graphState || {})),
        pptState: {
          slideIndex: p.pptState ? p.pptState.slideIndex : 0,
          fileName: (p.pptState && p.pptState.currentDeck) ? p.pptState.currentDeck.fileName : null
        },
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
          target.type = saved.type || target.type;
          target.boardBg = saved.boardBg || target.boardBg;
          if (saved.graphState) target.graphState = JSON.parse(JSON.stringify(saved.graphState));
          if (saved.simState) target.simState = JSON.parse(JSON.stringify(saved.simState));
        }
      });
    }

    setMode(mode || 'normal', r);
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
