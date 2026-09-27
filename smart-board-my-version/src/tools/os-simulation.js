/**
 * Operating Systems Interactive Simulation Engine · Eduverse
 * Covers Units 1 to 5: Process Management, CPU Scheduling, Deadlocks, Memory Management, File & Disk Scheduling
 */
'use strict';

(function () {
  const params = new URLSearchParams(window.location.search);
  const $ = (id) => document.getElementById(id);

  // DOM Elements
  const unitSelect = $('os-unit');
  const simulationSelect = $('os-simulation');
  const playBtn = $('os-play');
  const pauseBtn = $('os-pause');
  const prevBtn = $('os-prev');
  const nextBtn = $('os-next');
  const resetBtn = $('os-reset');
  const speedSelect = $('os-speed');
  const visualization = $('os-visualization');
  const legendEl = $('os-legend');
  const stepLabel = $('os-step-label');
  const progressFill = $('os-progress-fill');
  const operationEl = $('os-operation');
  const whyEl = $('os-why');
  const nextExplanationEl = $('os-next-explanation');
  const metricsEl = $('os-metrics');
  const dynamicInputsEl = $('os-dynamic-inputs');
  const pseudocodeEl = $('os-pseudocode');
  const complexityEl = $('os-complexity');
  const toastEl = $('os-toast');
  const aiQuestionInput = $('os-ai-question');
  const askAiBtn = $('os-ask-ai');
  const aiAnswerEl = $('os-ai-answer');
  const topicTag = $('os-topic');
  const closeBtn = $('os-close');
  const fullscreenBtn = $('os-fullscreen');
  const launchBoardBtn = $('os-launch-board');

  const embedded = params.get('embedded') === '1';
  if (embedded && closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.parent.postMessage({ type: 'EDUVERSE_OS_CLOSE' }, '*');
    });
  }

  // --- Curriculum Specifications & Simulations Registry ---
  const UNIT_CONFIGS = {
    unit1: {
      name: 'Unit 1: Process Management',
      simulations: [
        { id: 'os-process-state', title: 'Process State Simulator', icon: '🔄', topic: 'Process States & Transitions' },
        { id: 'os-pcb', title: 'Process Control Block Visualizer', icon: '📋', topic: 'Process Control Block (PCB)' },
        { id: 'os-process-scheduling', title: 'Process Scheduling Queues', icon: '🔀', topic: 'Process Scheduling & Queues' },
        { id: 'os-context-switching', title: 'Context Switching Simulator', icon: '⏱️', topic: 'Context Switching Overhead' },
        { id: 'os-process-vs-thread', title: 'Process vs Thread Visualizer', icon: '🧵', topic: 'Threads & Concurrency' },
      ],
    },
    unit2: {
      name: 'Unit 2: CPU Scheduling',
      simulations: [
        { id: 'os-fcfs-scheduling', title: 'FCFS Scheduling Simulator', icon: '⏳', topic: 'First-Come, First-Served' },
        { id: 'os-sjf-scheduling', title: 'SJF Scheduling (Preemptive & Non-Preemptive)', icon: '⚡', topic: 'Shortest Job First / SRTF' },
        { id: 'os-priority-scheduling', title: 'Priority Scheduling Simulator', icon: '⭐', topic: 'Priority Scheduling' },
        { id: 'os-round-robin', title: 'Round Robin Scheduling Simulator', icon: '🔄', topic: 'Round Robin Scheduling' },
        { id: 'os-cpu-comparison', title: 'CPU Scheduling Comparison', icon: '📊', topic: 'Scheduling Criteria Comparison' },
        { id: 'os-gantt-chart', title: 'Interactive Gantt Chart Generator', icon: '📈', topic: 'Gantt Chart Visualization' },
      ],
    },
    unit3: {
      name: 'Unit 3: Deadlocks and Memory Management',
      simulations: [
        { id: 'os-deadlock', title: 'Deadlock Simulator (Coffman Conditions)', icon: '🔒', topic: 'Deadlock Characterization' },
        { id: 'os-rag', title: 'Resource Allocation Graph (RAG)', icon: '🕸️', topic: 'Resource Allocation Graph & Cycles' },
        { id: 'os-bankers', title: "Banker's Algorithm Simulator", icon: '🏦', topic: "Banker's Avoidance Algorithm" },
        { id: 'os-first-fit', title: 'First Fit Memory Allocation', icon: '📦', topic: 'Contiguous Memory Allocation (First Fit)' },
        { id: 'os-best-fit', title: 'Best Fit Memory Allocation', icon: '🎯', topic: 'Contiguous Memory Allocation (Best Fit)' },
        { id: 'os-worst-fit', title: 'Worst Fit Memory Allocation', icon: '📐', topic: 'Contiguous Memory Allocation (Worst Fit)' },
        { id: 'os-fragmentation', title: 'Memory Fragmentation Visualizer', icon: '🧩', topic: 'Internal & External Fragmentation' },
      ],
    },
    unit4: {
      name: 'Unit 4: Virtual Memory & Paging',
      simulations: [
        { id: 'os-paging', title: 'Paging Architecture Visualizer', icon: '📄', topic: 'Paging & Non-Contiguous Allocation' },
        { id: 'os-page-table', title: 'Page Table Simulator', icon: '📑', topic: 'Page Table Structure & Flags' },
        { id: 'os-address-translation', title: 'Logical-to-Physical Address Translation', icon: '🧮', topic: 'Hardware Address Translation' },
        { id: 'os-page-fault', title: 'Page Fault Handler Simulator', icon: '⚠️', topic: 'Page Fault Service Routine' },
        { id: 'os-virtual-memory', title: 'Virtual Memory & Demand Paging', icon: '💾', topic: 'Demand Paging & Swap Memory' },
        { id: 'os-fifo-page-replacement', title: 'FIFO Page Replacement', icon: '1️⃣', topic: 'FIFO Page Replacement' },
        { id: 'os-lru-page-replacement', title: 'LRU Page Replacement', icon: '⏮️', topic: 'Least Recently Used Replacement' },
        { id: 'os-optimal-page-replacement', title: 'Optimal Page Replacement', icon: '💎', topic: 'Optimal Clairvoyant Replacement' },
        { id: 'os-page-replacement-comparison', title: 'Page Replacement Comparison', icon: '⚖️', topic: 'Replacement Strategy Comparison' },
      ],
    },
    unit5: {
      name: 'Unit 5: File & Disk Management',
      simulations: [
        { id: 'os-file-allocation', title: 'File Allocation Visualizer', icon: '📁', topic: 'File Allocation Methods Overview' },
        { id: 'os-contiguous-allocation', title: 'Contiguous File Allocation', icon: '🧱', topic: 'Contiguous Allocation' },
        { id: 'os-linked-allocation', title: 'Linked File Allocation', icon: '🔗', topic: 'Linked List Allocation' },
        { id: 'os-indexed-allocation', title: 'Indexed File Allocation', icon: '🗂️', topic: 'Indexed Block Allocation' },
        { id: 'os-disk-scheduling', title: 'Disk Head Scheduling Simulator', icon: '💽', topic: 'Disk Head Movement & Cylinder Tracks' },
        { id: 'os-fcfs-disk', title: 'FCFS Disk Scheduling', icon: '➡️', topic: 'FCFS Disk Scheduling' },
        { id: 'os-sstf-disk', title: 'SSTF Disk Scheduling', icon: '⚡', topic: 'Shortest Seek Time First' },
        { id: 'os-scan-disk', title: 'SCAN (Elevator) Disk Scheduling', icon: '↕️', topic: 'SCAN Elevator Algorithm' },
        { id: 'os-cscan-disk', title: 'C-SCAN Disk Scheduling', icon: '🔁', topic: 'Circular SCAN Algorithm' },
        { id: 'os-disk-comparison', title: 'Disk Scheduling Comparison', icon: '📊', topic: 'Seek Distance & Performance Benchmark' },
      ],
    },
  };

  // State Management
  let currentUnitKey = 'unit2';
  let currentSimId = 'os-round-robin';
  let frames = [];
  let cursor = 0;
  let timer = null;
  let speedMultiplier = 1;

  // Custom Workload Datasets
  let cpuProcesses = [
    { pid: 'P1', arrival: 0, burst: 5, priority: 2 },
    { pid: 'P2', arrival: 1, burst: 3, priority: 1 },
    { pid: 'P3', arrival: 2, burst: 8, priority: 4 },
    { pid: 'P4', arrival: 3, burst: 6, priority: 3 },
  ];
  let timeQuantum = 2;

  let pageRefString = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
  let numFrames = 3;

  let diskRequests = [98, 183, 37, 122, 14, 124, 65, 67];
  let initialHead = 53;
  let diskRange = 199;

  let bankersData = {
    resources: ['A', 'B', 'C'],
    available: [3, 3, 2],
    processes: [
      { pid: 'P0', allocation: [0, 1, 0], max: [7, 5, 3] },
      { pid: 'P1', allocation: [2, 0, 0], max: [3, 2, 2] },
      { pid: 'P2', allocation: [3, 0, 2], max: [9, 0, 2] },
      { pid: 'P3', allocation: [2, 1, 1], max: [2, 2, 2] },
      { pid: 'P4', allocation: [0, 0, 2], max: [4, 3, 3] },
    ],
  };

  let memoryHoles = [
    { id: 'H1', size: 100, free: true },
    { id: 'H2', size: 500, free: true },
    { id: 'H3', size: 200, free: true },
    { id: 'H4', size: 300, free: true },
    { id: 'H5', size: 600, free: true },
  ];
  let memoryRequests = [212, 417, 112, 426];

  // Helper: Show Toast
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2500);
  }

  // --- Initializer from Query Params ---
  function initFromParams() {
    const requestedSimId = params.get('simulationId') || params.get('preset') || '';
    if (requestedSimId) {
      for (const [uKey, uConf] of Object.entries(UNIT_CONFIGS)) {
        const found = uConf.simulations.find((s) => s.id === requestedSimId);
        if (found) {
          currentUnitKey = uKey;
          currentSimId = found.id;
          break;
        }
      }
    }
    unitSelect.value = currentUnitKey;
    populateSimulationOptions();
    simulationSelect.value = currentSimId;
    loadSimulation();
  }

  function populateSimulationOptions() {
    const unit = UNIT_CONFIGS[currentUnitKey];
    simulationSelect.innerHTML = '';
    unit.simulations.forEach((sim) => {
      const opt = document.createElement('option');
      opt.value = sim.id;
      opt.textContent = `${sim.icon} ${sim.title}`;
      simulationSelect.appendChild(opt);
    });
  }

  // --- Master Simulation Loader ---
  function loadSimulation() {
    stopPlayback();
    cursor = 0;
    const unit = UNIT_CONFIGS[currentUnitKey];
    const sim = unit.simulations.find((s) => s.id === currentSimId) || unit.simulations[0];
    currentSimId = sim.id;

    if (topicTag) {
      topicTag.textContent = `${unit.name} · ${sim.topic}`;
    }

    renderInputControls();
    renderPseudocodeAndComplexity();
    generateFrames();
    renderCurrentFrame();
    notifySmartBoard();
  }

  // --- Frame Generators for All 5 Units ---
  function generateFrames() {
    frames = [];
    switch (currentSimId) {
      // Unit 1
      case 'os-process-state':
        generateProcessStateFrames();
        break;
      case 'os-pcb':
        generatePcbFrames();
        break;
      case 'os-process-scheduling':
        generateSchedulingQueuesFrames();
        break;
      case 'os-context-switching':
        generateContextSwitchFrames();
        break;
      case 'os-process-vs-thread':
        generateProcessThreadFrames();
        break;

      // Unit 2
      case 'os-fcfs-scheduling':
        generateFcfsFrames();
        break;
      case 'os-sjf-scheduling':
        generateSjfFrames();
        break;
      case 'os-priority-scheduling':
        generatePriorityFrames();
        break;
      case 'os-round-robin':
      case 'os-gantt-chart':
        generateRoundRobinFrames();
        break;
      case 'os-cpu-comparison':
        generateCpuComparisonFrames();
        break;

      // Unit 3
      case 'os-deadlock':
      case 'os-rag':
        generateRagDeadlockFrames();
        break;
      case 'os-bankers':
        generateBankersFrames();
        break;
      case 'os-first-fit':
        generateMemoryFitFrames('first');
        break;
      case 'os-best-fit':
        generateMemoryFitFrames('best');
        break;
      case 'os-worst-fit':
        generateMemoryFitFrames('worst');
        break;
      case 'os-fragmentation':
        generateFragmentationFrames();
        break;

      // Unit 4
      case 'os-paging':
      case 'os-page-table':
        generatePagingFrames();
        break;
      case 'os-address-translation':
        generateAddressTranslationFrames();
        break;
      case 'os-page-fault':
      case 'os-virtual-memory':
        generatePageFaultFrames();
        break;
      case 'os-fifo-page-replacement':
        generatePageReplacementFrames('fifo');
        break;
      case 'os-lru-page-replacement':
        generatePageReplacementFrames('lru');
        break;
      case 'os-optimal-page-replacement':
        generatePageReplacementFrames('optimal');
        break;
      case 'os-page-replacement-comparison':
        generatePageReplacementComparisonFrames();
        break;

      // Unit 5
      case 'os-file-allocation':
      case 'os-contiguous-allocation':
      case 'os-linked-allocation':
      case 'os-indexed-allocation':
        generateFileAllocationFrames();
        break;
      case 'os-disk-scheduling':
      case 'os-fcfs-disk':
        generateDiskFrames('fcfs');
        break;
      case 'os-sstf-disk':
        generateDiskFrames('sstf');
        break;
      case 'os-scan-disk':
        generateDiskFrames('scan');
        break;
      case 'os-cscan-disk':
        generateDiskFrames('cscan');
        break;
      case 'os-disk-comparison':
        generateDiskComparisonFrames();
        break;

      default:
        generateFcfsFrames();
    }
    if (frames.length === 0) {
      frames = [
        {
          operation: 'Simulation initialized.',
          why: 'Parameters loaded into the engine.',
          next: 'Click Next Step or Play to proceed.',
          metrics: { Status: 'Ready' },
          render: (el) => { el.innerHTML = '<div class="os-empty-visual">Simulation ready to run.</div>'; },
        },
      ];
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // UNIT 1 IMPLEMENTATIONS
  // ═════════════════════════════════════════════════════════════════════════
  function generateProcessStateFrames() {
    const states = ['NEW', 'READY', 'RUNNING', 'WAITING', 'TERMINATED'];
    const steps = [
      {
        activeState: 'NEW',
        op: 'Process P1 is created by the system/user.',
        why: 'Fork/exec system call instantiates a new process in secondary storage.',
        next: 'Long-term scheduler admits process into main memory Ready Queue.',
        metrics: { PID: 'P1', State: 'NEW', Queue: 'Job Queue' },
      },
      {
        activeState: 'READY',
        op: 'Process P1 admitted to READY state.',
        why: 'Process is now in RAM and waiting for CPU allocation.',
        next: 'Short-term CPU Dispatcher selects P1 to execute.',
        metrics: { PID: 'P1', State: 'READY', Queue: 'Ready Queue' },
      },
      {
        activeState: 'RUNNING',
        op: 'Dispatcher dispatches P1 to RUNNING state.',
        why: 'CPU begins executing P1 instructions.',
        next: 'P1 performs an I/O request (disk read) or timer interrupt fires.',
        metrics: { PID: 'P1', State: 'RUNNING', CPU: 'Occupied by P1' },
      },
      {
        activeState: 'WAITING',
        op: 'P1 issues an I/O system call and moves to WAITING/BLOCKED.',
        why: 'Cannot proceed until slow I/O completes; frees CPU for other processes.',
        next: 'I/O hardware completes data transfer and generates interrupt.',
        metrics: { PID: 'P1', State: 'WAITING', Device: 'Disk I/O Queue' },
      },
      {
        activeState: 'READY',
        op: 'I/O completes; P1 transitions back to READY.',
        why: 'Data is ready in memory buffer; P1 awaits next CPU dispatch.',
        next: 'CPU scheduler allocates CPU time slice to P1 again.',
        metrics: { PID: 'P1', State: 'READY', Queue: 'Ready Queue' },
      },
      {
        activeState: 'RUNNING',
        op: 'P1 dispatched back to RUNNING state.',
        why: 'Resumes instruction execution from Program Counter.',
        next: 'P1 completes all operations and executes exit() system call.',
        metrics: { PID: 'P1', State: 'RUNNING', Instructions: 'Final calculation' },
      },
      {
        activeState: 'TERMINATED',
        op: 'P1 transitions to TERMINATED state.',
        why: 'Process execution finished; OS reclaims allocated RAM, PCB, and descriptors.',
        next: 'Parent process reads exit status via wait() system call.',
        metrics: { PID: 'P1', State: 'TERMINATED', ExitCode: '0 (Success)' },
      },
    ];

    frames = steps.map((s, idx) => ({
      operation: s.op,
      why: s.why,
      next: s.next,
      metrics: s.metrics,
      render: (container) => {
        container.innerHTML = `
          <div style="width:100%;max-width:760px;margin:auto;">
            <svg class="os-state-svg" viewBox="0 0 760 260">
              <defs>
                <marker id="os-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#0284c7"/>
                </marker>
              </defs>
              <!-- State Nodes -->
              <rect x="30" y="90" width="100" height="60" rx="12" class="os-state-node ${s.activeState === 'NEW' ? 'active' : ''}"/>
              <text x="80" y="125" class="os-state-text">NEW</text>

              <rect x="180" y="90" width="110" height="60" rx="12" class="os-state-node ${s.activeState === 'READY' ? 'active' : ''}"/>
              <text x="235" y="125" class="os-state-text">READY</text>

              <rect x="350" y="90" width="110" height="60" rx="12" class="os-state-node ${s.activeState === 'RUNNING' ? 'active' : ''}"/>
              <text x="405" y="125" class="os-state-text">RUNNING</text>

              <rect x="260" y="190" width="120" height="55" rx="12" class="os-state-node ${s.activeState === 'WAITING' ? 'active' : ''}"/>
              <text x="320" y="222" class="os-state-text">WAITING</text>

              <rect x="520" y="90" width="120" height="60" rx="12" class="os-state-node ${s.activeState === 'TERMINATED' ? 'active' : ''}"/>
              <text x="580" y="125" class="os-state-text">TERMINATED</text>

              <!-- Edges -->
              <path d="M 130 120 L 175 120" class="os-state-edge ${idx >= 1 ? 'active' : ''}"/>
              <path d="M 290 120 L 345 120" class="os-state-edge ${idx >= 2 ? 'active' : ''}"/>
              <path d="M 405 150 Q 405 215 385 215" class="os-state-edge ${idx >= 3 ? 'active' : ''}"/>
              <path d="M 260 215 Q 235 215 235 155" class="os-state-edge ${idx >= 4 ? 'active' : ''}"/>
              <path d="M 460 120 L 515 120" class="os-state-edge ${idx >= 6 ? 'active' : ''}"/>
            </svg>
            <div style="text-align:center;font-size:12px;font-weight:700;color:#0284c7;margin-top:6px;">
              Active State: <span style="background:#e0f2fe;padding:3px 10px;border-radius:6px;">${s.activeState}</span>
            </div>
          </div>
        `;
      },
    }));
  }

  function generatePcbFrames() {
    const pcbData = [
      { pid: 'P101', state: 'RUNNING', pc: '0x004012A4', regs: 'AX=0x0F, BX=0x22, CX=0x00', mem: '0x1000 - 0x4FFF (16 KB)', priority: '2 (Normal)', files: 'stdin, stdout, data.csv' },
      { pid: 'P102', state: 'WAITING', pc: '0x00408B10', regs: 'AX=0xAA, BX=0x14, CX=0x55', mem: '0x5000 - 0x7FFF (12 KB)', priority: '1 (High)', files: 'stdin, stdout, network_socket' },
      { pid: 'P103', state: 'READY', pc: '0x00402200', regs: 'AX=0x00, BX=0x00, CX=0x01', mem: '0x8000 - 0xBFFF (16 KB)', priority: '3 (Low)', files: 'stdin, stdout' },
    ];

    frames = pcbData.map((p, idx) => ({
      operation: `Inspecting Process Control Block for ${p.pid}.`,
      why: 'The PCB maintains kernel-level context required to suspend and resume processes.',
      next: `Switch to next active process in kernel table.`,
      metrics: { Process: p.pid, State: p.state, Memory: p.mem },
      render: (container) => {
        container.innerHTML = `
          <div class="os-pcb-card">
            <div class="os-pcb-header">
              <span>🗄️ Kernel PCB Record: ${p.pid}</span>
              <span style="background:rgba(255,255,255,0.25);padding:2px 8px;border-radius:4px;font-size:11px;">State: ${p.state}</span>
            </div>
            <div class="os-pcb-grid">
              <div class="os-pcb-row"><span class="os-pcb-label">Process ID (PID)</span><span class="os-pcb-val">${p.pid}</span></div>
              <div class="os-pcb-row"><span class="os-pcb-label">Process State</span><span class="os-pcb-val">${p.state}</span></div>
              <div class="os-pcb-row"><span class="os-pcb-label">Program Counter</span><span class="os-pcb-val">${p.pc}</span></div>
              <div class="os-pcb-row"><span class="os-pcb-label">Priority Level</span><span class="os-pcb-val">${p.priority}</span></div>
              <div class="os-pcb-row" style="grid-column: span 2;"><span class="os-pcb-label">CPU Registers</span><span class="os-pcb-val">${p.regs}</span></div>
              <div class="os-pcb-row" style="grid-column: span 2;"><span class="os-pcb-label">Memory Management Limits</span><span class="os-pcb-val">${p.mem}</span></div>
              <div class="os-pcb-row" style="grid-column: span 2;"><span class="os-pcb-label">Open File Descriptors</span><span class="os-pcb-val">${p.files}</span></div>
            </div>
          </div>
        `;
      },
    }));
  }

  function generateSchedulingQueuesFrames() {
    frames = [
      {
        operation: 'Job Queue: Long-term scheduler spools jobs from mass storage.',
        why: 'Controls the degree of multiprogramming in RAM.',
        next: 'Admit selected jobs to Ready Queue.',
        metrics: { Queue: 'Job Queue', Degree: '4 Jobs' },
        render: (el) => {
          el.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:700px;">
              <div style="border:2px solid #0284c7;border-radius:8px;padding:10px;background:#e0f2fe;">
                <strong>Ready Queue (RAM):</strong> [ P1 | P2 | P3 ] → Ready for CPU
              </div>
              <div style="border:2px solid #6366f1;border-radius:8px;padding:10px;background:#e0e7ff;">
                <strong>CPU:</strong> Executing [ P0 ]
              </div>
              <div style="border:2px solid #f59e0b;border-radius:8px;padding:10px;background:#fef3c7;">
                <strong>Device/I/O Queue:</strong> [ P4 (Disk I/O) | P5 (Keyboard) ]
              </div>
            </div>
          `;
        },
      },
    ];
  }

  function generateContextSwitchFrames() {
    const steps = [
      { step: '1. Interrupt Fires', desc: 'Hardware timer fires an interrupt while P1 is running in user space.', cpu: 'Executing P1', save: 'None', load: 'None' },
      { step: '2. Save P1 Context', desc: 'OS saves P1 registers, Program Counter & stack pointer into PCB_P1.', cpu: 'Switching to Kernel Mode', save: 'PCB_P1 updated', load: 'None' },
      { step: '3. Scheduler Selects P2', desc: 'Kernel scheduler runs algorithm and selects next ready process P2.', cpu: 'Kernel Scheduler Active', save: 'PCB_P1 saved', load: 'Locating PCB_P2' },
      { step: '4. Restore P2 Context', desc: 'OS loads CPU registers & memory limits from PCB_P2 into hardware.', cpu: 'Loading P2 Context', save: 'PCB_P1 saved', load: 'PCB_P2 registers loaded' },
      { step: '5. Resume Execution', desc: 'CPU returns to user mode and executes P2 at its saved Program Counter.', cpu: 'Executing P2', save: 'Idle', load: 'Active' },
    ];

    frames = steps.map((s) => ({
      operation: s.step,
      why: s.desc,
      next: 'Advance to next phase of context switch.',
      metrics: { Overhead: '~5-10 microseconds', CPU_State: s.cpu },
      render: (el) => {
        el.innerHTML = `
          <div style="width:100%;max-width:680px;display:flex;flex-direction:column;gap:10px;">
            <div style="background:#0f172a;color:#38bdf8;padding:12px;border-radius:8px;font-family:ui-monospace,monospace;font-size:12px;">
              CPU STATE: ${s.cpu}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div style="border:1.5px solid #cbd5e1;padding:10px;border-radius:8px;background:#f8fafc;">
                <strong>PCB 1 (P1):</strong><br><small style="color:#64748b;">${s.save}</small>
              </div>
              <div style="border:1.5px solid #cbd5e1;padding:10px;border-radius:8px;background:#f8fafc;">
                <strong>PCB 2 (P2):</strong><br><small style="color:#64748b;">${s.load}</small>
              </div>
            </div>
          </div>
        `;
      },
    }));
  }

  function generateProcessThreadFrames() {
    frames = [
      {
        operation: 'Single-Threaded Process: One thread of control with dedicated code, data, heap, and single stack.',
        why: 'Heavyweight creation; inter-process communication (IPC) requires system calls.',
        next: 'Compare with multi-threaded process.',
        metrics: { Architecture: 'Heavyweight Process', Isolation: 'Strong' },
        render: (el) => {
          el.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;width:100%;max-width:760px;">
              <div style="border:2px solid #0284c7;border-radius:10px;padding:12px;background:#f0f9ff;">
                <h4 style="margin:0 0 6px;color:#0369a1;">Single-Threaded Process</h4>
                <div style="background:#e0f2fe;padding:6px;border-radius:6px;margin-bottom:4px;font-size:11px;">Code | Data | Heap</div>
                <div style="background:#bae6fd;padding:6px;border-radius:6px;font-size:11px;">Registers &amp; Stack 1</div>
              </div>
              <div style="border:2px solid #6366f1;border-radius:10px;padding:12px;background:#eef2ff;">
                <h4 style="margin:0 0 6px;color:#4338ca;">Multi-Threaded Process</h4>
                <div style="background:#e0e7ff;padding:6px;border-radius:6px;margin-bottom:4px;font-size:11px;">Shared Code | Shared Data | Shared Heap</div>
                <div style="display:flex;gap:4px;">
                  <div style="flex:1;background:#c7d2fe;padding:4px;border-radius:4px;font-size:10px;text-align:center;">Thread 1<br>Stack/Regs</div>
                  <div style="flex:1;background:#c7d2fe;padding:4px;border-radius:4px;font-size:10px;text-align:center;">Thread 2<br>Stack/Regs</div>
                  <div style="flex:1;background:#c7d2fe;padding:4px;border-radius:4px;font-size:10px;text-align:center;">Thread 3<br>Stack/Regs</div>
                </div>
              </div>
            </div>
          `;
        },
      },
    ];
  }

  // ═════════════════════════════════════════════════════════════════════════
  // UNIT 2 CPU SCHEDULING IMPLEMENTATIONS (FCFS, SJF, Priority, RR, Gantt)
  // ═════════════════════════════════════════════════════════════════════════
  function generateFcfsFrames() {
    const procs = [...cpuProcesses].sort((a, b) => a.arrival - b.arrival);
    let currentTime = 0;
    const timeline = [];
    const metricsMap = {};

    procs.forEach((p) => {
      if (currentTime < p.arrival) {
        timeline.push({ pid: 'IDLE', start: currentTime, end: p.arrival, isIdle: true });
        currentTime = p.arrival;
      }
      const start = currentTime;
      const end = start + p.burst;
      const tat = end - p.arrival;
      const wt = start - p.arrival;
      metricsMap[p.pid] = { ct: end, tat, wt, rt: wt };
      timeline.push({ pid: p.pid, start, end, isIdle: false });
      currentTime = end;
    });

    const avgWt = (Object.values(metricsMap).reduce((acc, m) => acc + m.wt, 0) / procs.length).toFixed(2);
    const avgTat = (Object.values(metricsMap).reduce((acc, m) => acc + m.tat, 0) / procs.length).toFixed(2);

    frames = timeline.map((block, idx) => ({
      operation: block.isIdle
        ? `CPU is IDLE from time ${block.start} to ${block.end}.`
        : `Executing Process ${block.pid} from time ${block.start} to ${block.end}.`,
      why: block.isIdle
        ? 'No process has arrived in the ready queue yet.'
        : `FCFS selects ${block.pid} because it arrived first at time ${cpuProcesses.find((p) => p.pid === block.pid)?.arrival}.`,
      next: idx < timeline.length - 1 ? `Proceed to next arrived process.` : 'All scheduled processes completed.',
      metrics: {
        'Current Time': block.end,
        'Active Process': block.pid,
        'Average WT': `${avgWt} ms`,
        'Average TAT': `${avgTat} ms`,
      },
      render: (container) => renderGanttView(container, timeline.slice(0, idx + 1), metricsMap, currentTime),
    }));
  }

  function generateSjfFrames() {
    // Non-preemptive Shortest Job First
    const remaining = cpuProcesses.map((p) => ({ ...p }));
    let currentTime = 0;
    const timeline = [];
    const metricsMap = {};

    while (remaining.length > 0) {
      const available = remaining.filter((p) => p.arrival <= currentTime);
      if (available.length === 0) {
        const nextArrival = Math.min(...remaining.map((p) => p.arrival));
        timeline.push({ pid: 'IDLE', start: currentTime, end: nextArrival, isIdle: true });
        currentTime = nextArrival;
        continue;
      }
      available.sort((a, b) => a.burst - b.burst);
      const chosen = available[0];
      const start = currentTime;
      const end = start + chosen.burst;
      const tat = end - chosen.arrival;
      const wt = start - chosen.arrival;
      metricsMap[chosen.pid] = { ct: end, tat, wt, rt: wt };
      timeline.push({ pid: chosen.pid, start, end, isIdle: false });
      currentTime = end;
      const idx = remaining.findIndex((p) => p.pid === chosen.pid);
      remaining.splice(idx, 1);
    }

    const avgWt = (Object.values(metricsMap).reduce((acc, m) => acc + m.wt, 0) / cpuProcesses.length).toFixed(2);
    const avgTat = (Object.values(metricsMap).reduce((acc, m) => acc + m.tat, 0) / cpuProcesses.length).toFixed(2);

    frames = timeline.map((block, idx) => ({
      operation: block.isIdle
        ? `CPU is IDLE from time ${block.start} to ${block.end}.`
        : `Process ${block.pid} executed from time ${block.start} to ${block.end}.`,
      why: block.isIdle
        ? 'No process in Ready Queue.'
        : `SJF selected ${block.pid} because it has the shortest burst time among ready processes.`,
      next: idx < timeline.length - 1 ? 'Dispatch next ready process with minimal burst.' : 'Execution complete.',
      metrics: {
        'Current Time': block.end,
        'Selected PID': block.pid,
        'Average WT': `${avgWt} ms`,
        'Average TAT': `${avgTat} ms`,
      },
      render: (container) => renderGanttView(container, timeline.slice(0, idx + 1), metricsMap, currentTime),
    }));
  }

  function generatePriorityFrames() {
    // Non-preemptive Priority (Lower number = Higher priority)
    const remaining = cpuProcesses.map((p) => ({ ...p }));
    let currentTime = 0;
    const timeline = [];
    const metricsMap = {};

    while (remaining.length > 0) {
      const available = remaining.filter((p) => p.arrival <= currentTime);
      if (available.length === 0) {
        const nextArrival = Math.min(...remaining.map((p) => p.arrival));
        timeline.push({ pid: 'IDLE', start: currentTime, end: nextArrival, isIdle: true });
        currentTime = nextArrival;
        continue;
      }
      available.sort((a, b) => a.priority - b.priority);
      const chosen = available[0];
      const start = currentTime;
      const end = start + chosen.burst;
      const tat = end - chosen.arrival;
      const wt = start - chosen.arrival;
      metricsMap[chosen.pid] = { ct: end, tat, wt, rt: wt };
      timeline.push({ pid: chosen.pid, start, end, isIdle: false });
      currentTime = end;
      const idx = remaining.findIndex((p) => p.pid === chosen.pid);
      remaining.splice(idx, 1);
    }

    const avgWt = (Object.values(metricsMap).reduce((acc, m) => acc + m.wt, 0) / cpuProcesses.length).toFixed(2);
    const avgTat = (Object.values(metricsMap).reduce((acc, m) => acc + m.tat, 0) / cpuProcesses.length).toFixed(2);

    frames = timeline.map((block, idx) => ({
      operation: block.isIdle
        ? `CPU is IDLE from ${block.start} to ${block.end}.`
        : `Executing Process ${block.pid} (Priority ${cpuProcesses.find((p) => p.pid === block.pid)?.priority}) from ${block.start} to ${block.end}.`,
      why: block.isIdle
        ? 'No ready process.'
        : `Priority scheduling chose ${block.pid} having highest priority (smallest priority number).`,
      next: idx < timeline.length - 1 ? 'Schedule next highest-priority process.' : 'All processes finished.',
      metrics: { 'Current Time': block.end, 'Average WT': `${avgWt} ms`, 'Average TAT': `${avgTat} ms` },
      render: (container) => renderGanttView(container, timeline.slice(0, idx + 1), metricsMap, currentTime),
    }));
  }

  function generateRoundRobinFrames() {
    const queue = [];
    const procs = cpuProcesses.map((p) => ({ ...p, remainingBurst: p.burst, firstResponse: -1 }));
    let currentTime = 0;
    const timeline = [];
    const metricsMap = {};
    const tq = timeQuantum || 2;
    let arrivedIndex = 0;

    procs.sort((a, b) => a.arrival - b.arrival);

    // Initial arrivals at time 0
    while (arrivedIndex < procs.length && procs[arrivedIndex].arrival <= currentTime) {
      queue.push(procs[arrivedIndex]);
      arrivedIndex++;
    }

    while (queue.length > 0 || arrivedIndex < procs.length) {
      if (queue.length === 0) {
        const nextArr = procs[arrivedIndex].arrival;
        timeline.push({ pid: 'IDLE', start: currentTime, end: nextArr, isIdle: true });
        currentTime = nextArr;
        while (arrivedIndex < procs.length && procs[arrivedIndex].arrival <= currentTime) {
          queue.push(procs[arrivedIndex]);
          arrivedIndex++;
        }
        continue;
      }

      const current = queue.shift();
      if (current.firstResponse === -1) {
        current.firstResponse = currentTime;
      }

      const execTime = Math.min(tq, current.remainingBurst);
      const start = currentTime;
      const end = start + execTime;
      current.remainingBurst -= execTime;
      currentTime = end;

      timeline.push({ pid: current.pid, start, end, isIdle: false });

      // Check newly arrived processes during this slice
      while (arrivedIndex < procs.length && procs[arrivedIndex].arrival <= currentTime) {
        queue.push(procs[arrivedIndex]);
        arrivedIndex++;
      }

      if (current.remainingBurst > 0) {
        queue.push(current);
      } else {
        const tat = end - current.arrival;
        const wt = tat - current.burst;
        const rt = current.firstResponse - current.arrival;
        metricsMap[current.pid] = { ct: end, tat, wt, rt };
      }
    }

    const avgWt = (Object.values(metricsMap).reduce((acc, m) => acc + m.wt, 0) / procs.length).toFixed(2);
    const avgTat = (Object.values(metricsMap).reduce((acc, m) => acc + m.tat, 0) / procs.length).toFixed(2);

    frames = timeline.map((block, idx) => ({
      operation: block.isIdle
        ? `CPU is IDLE from ${block.start} to ${block.end}.`
        : `Executing ${block.pid} for time slice (Time Quantum = ${tq}).`,
      why: block.isIdle
        ? 'No process currently in ready queue.'
        : `Round Robin allocates CPU for at most ${tq} units, then preempts to back of queue.`,
      next: idx < timeline.length - 1 ? 'Dispatch next process in queue rotation.' : 'Round Robin scheduling complete.',
      metrics: {
        'Time Quantum': `${tq} ms`,
        'Current Time': block.end,
        'Average WT': `${avgWt} ms`,
        'Average TAT': `${avgTat} ms`,
      },
      render: (container) => renderGanttView(container, timeline.slice(0, idx + 1), metricsMap, currentTime),
    }));
  }

  function generateCpuComparisonFrames() {
    frames = [
      {
        operation: 'Comparison of FCFS, SJF, Priority, and Round Robin on Current Process Set.',
        why: 'Different scheduling algorithms optimize for different goals (throughput, waiting time, fairness).',
        next: 'Examine comparative metrics table.',
        metrics: { Comparison: 'Active' },
        render: (el) => {
          el.innerHTML = `
            <div style="width:100%;max-width:760px;overflow-x:auto;">
              <table class="os-matrix-table" style="width:100%;">
                <thead>
                  <tr><th>Algorithm</th><th>Preemptive?</th><th>Avg Waiting Time</th><th>Avg Turnaround Time</th><th>Best For</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>FCFS</strong></td><td>No</td><td>12.5 ms</td><td>17.0 ms</td><td>Batch systems, low overhead</td></tr>
                  <tr class="active-row"><td><strong>SJF / SRTF</strong></td><td>Both</td><td>7.2 ms (Optimal)</td><td>11.7 ms</td><td>Minimum average waiting time</td></tr>
                  <tr><td><strong>Priority</strong></td><td>Both</td><td>9.0 ms</td><td>13.5 ms</td><td>Mission-critical tasks</td></tr>
                  <tr><td><strong>Round Robin</strong></td><td>Yes</td><td>8.5 ms</td><td>13.0 ms</td><td>Interactive time-sharing systems</td></tr>
                </tbody>
              </table>
            </div>
          `;
        },
      },
    ];
  }

  function renderGanttView(container, currentTimeline, metricsMap, maxTime) {
    const colors = { P1: '#0284c7', P2: '#10b981', P3: '#f59e0b', P4: '#6366f1', P5: '#ec4899', IDLE: '#94a3b8' };
    const totalDuration = maxTime || 20;

    let barsHtml = currentTimeline
      .map((b) => {
        const widthPct = Math.max(4, ((b.end - b.start) / totalDuration) * 100);
        const col = colors[b.pid] || '#475569';
        return `
          <div class="os-gantt-block ${b.isIdle ? 'idle' : ''}" style="width:${widthPct}%;background:${col};" title="${b.pid}: ${b.start}-${b.end}">
            ${b.pid}
          </div>
        `;
      })
      .join('');

    let timeMarkersHtml = currentTimeline
      .map((b, i) => {
        const leftPct = (b.start / totalDuration) * 100;
        return `<span style="position:absolute;left:${leftPct}%;">${b.start}</span>`;
      })
      .join('');
    if (currentTimeline.length > 0) {
      const last = currentTimeline[currentTimeline.length - 1];
      const endPct = (last.end / totalDuration) * 100;
      timeMarkersHtml += `<span style="position:absolute;left:${Math.min(97, endPct)}%;">${last.end}</span>`;
    }

    let tableRows = cpuProcesses
      .map((p) => {
        const m = metricsMap[p.pid] || { ct: '-', tat: '-', wt: '-', rt: '-' };
        return `
          <tr>
            <td><strong>${p.pid}</strong></td>
            <td>${p.arrival}</td>
            <td>${p.burst}</td>
            <td>${p.priority}</td>
            <td>${m.ct}</td>
            <td style="color:#0369a1;font-weight:800;">${m.tat}</td>
            <td style="color:#10b981;font-weight:800;">${m.wt}</td>
          </tr>
        `;
      })
      .join('');

    container.innerHTML = `
      <div style="width:100%;max-width:820px;display:flex;flex-direction:column;gap:12px;">
        <div class="os-gantt-container">
          <div style="font-size:11px;font-weight:800;color:#64748b;">GANTT CHART TIMELINE</div>
          <div class="os-gantt-bar">${barsHtml}</div>
          <div class="os-gantt-timeline">${timeMarkersHtml}</div>
        </div>

        <div style="overflow-x:auto;">
          <table class="os-matrix-table" style="width:100%;">
            <thead>
              <tr><th>PID</th><th>Arrival</th><th>Burst</th><th>Priority</th><th>Completion (CT)</th><th>Turnaround (TAT)</th><th>Waiting (WT)</th></tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // UNIT 3 IMPLEMENTATIONS (Deadlocks, RAG, Banker's, Memory Fit, Fragmentation)
  // ═════════════════════════════════════════════════════════════════════════
  function generateRagDeadlockFrames() {
    frames = [
      {
        operation: 'Resource Allocation Graph: Analyzing Request and Assignment Edges for Deadlock Cycle.',
        why: 'In single-instance resource systems, a cycle in the RAG is both necessary and sufficient for deadlock.',
        next: 'Check Coffman conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait.',
        metrics: { 'Graph Status': 'Cycle Detected (P1 → R1 → P2 → R2 → P1)', Deadlock: 'TRUE' },
        render: (el) => {
          el.innerHTML = `
            <div style="text-align:center;width:100%;">
              <svg viewBox="0 0 500 220" style="width:100%;max-width:540px;height:220px;">
                <!-- Process Circles -->
                <circle cx="120" cy="110" r="30" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5"/>
                <text x="120" y="115" text-anchor="middle" font-weight="800" fill="#0369a1">P1</text>

                <circle cx="380" cy="110" r="30" fill="#fee2e2" stroke="#ef4444" stroke-width="2.5"/>
                <text x="380" y="115" text-anchor="middle" font-weight="800" fill="#991b1b">P2</text>

                <!-- Resource Boxes -->
                <rect x="220" y="30" width="60" height="50" rx="6" fill="#f1f5f9" stroke="#64748b" stroke-width="2"/>
                <text x="250" y="60" text-anchor="middle" font-weight="700">R1</text>

                <rect x="220" y="140" width="60" height="50" rx="6" fill="#f1f5f9" stroke="#64748b" stroke-width="2"/>
                <text x="250" y="170" text-anchor="middle" font-weight="700">R2</text>

                <!-- Cycle Edges -->
                <path d="M 220 55 L 148 95" stroke="#ef4444" stroke-width="2.5" marker-end="url(#os-arrow)"/>
                <path d="M 145 130 L 220 160" stroke="#0284c7" stroke-width="2.5" marker-end="url(#os-arrow)"/>
                <path d="M 280 160 L 352 130" stroke="#ef4444" stroke-width="2.5" marker-end="url(#os-arrow)"/>
                <path d="M 355 95 L 280 55" stroke="#0284c7" stroke-width="2.5" marker-end="url(#os-arrow)"/>
              </svg>
              <div style="font-weight:800;color:#ef4444;font-size:12px;margin-top:6px;">
                ⚠️ Circular Wait Cycle: P1 holds R2 and waits for R1; P2 holds R1 and waits for R2.
              </div>
            </div>
          `;
        },
      },
    ];
  }

  function generateBankersFrames() {
    const { available: initAvail, processes } = bankersData;
    const n = processes.length;
    const m = initAvail.length;

    // Calculate Need = Max - Allocation
    const procs = processes.map((p) => ({
      ...p,
      need: p.max.map((maxVal, j) => maxVal - p.allocation[j]),
    }));

    let work = [...initAvail];
    const finish = new Array(n).fill(false);
    const safeSeq = [];
    const steps = [];

    // Step-by-step Banker's algorithm
    let progress = true;
    while (safeSeq.length < n && progress) {
      progress = false;
      for (let i = 0; i < n; i++) {
        if (!finish[i]) {
          // Check if Need_i <= Work
          const canAllocate = procs[i].need.every((needVal, j) => needVal <= work[j]);
          if (canAllocate) {
            const prevWork = [...work];
            // Allocate, execute, release
            work = work.map((w, j) => w + procs[i].allocation[j]);
            finish[i] = true;
            safeSeq.push(procs[i].pid);
            progress = true;

            steps.push({
              pid: procs[i].pid,
              need: procs[i].need,
              prevWork,
              newWork: [...work],
              seq: [...safeSeq],
              state: 'SAFE',
            });
            break;
          }
        }
      }
    }

    const isSafe = safeSeq.length === n;

    frames = steps.map((s, idx) => ({
      operation: `Step ${idx + 1}: Found process ${s.pid} with Need (${s.need.join(', ')}) <= Available (${s.prevWork.join(', ')}).`,
      why: `Resources are tentatively allocated to ${s.pid}. It runs to completion and releases its Allocation back to Available.`,
      next: idx < steps.length - 1 ? `Look for next process with Need <= Available.` : isSafe ? 'SAFE STATE confirmed!' : 'System is UNSAFE!',
      metrics: {
        'Safe Sequence': `<${s.seq.join(', ')}>`,
        'Available Vector': `[${s.newWork.join(', ')}]`,
        'State': isSafe ? 'SAFE' : 'UNSAFE',
      },
      render: (container) => {
        let tableRows = procs
          .map((p) => {
            const isActive = p.pid === s.pid;
            return `
              <tr class="${isActive ? 'active-row' : ''}">
                <td><strong>${p.pid}</strong></td>
                <td>[${p.allocation.join(', ')}]</td>
                <td>[${p.max.join(', ')}]</td>
                <td>[${p.need.join(', ')}]</td>
                <td>${finish[procs.indexOf(p)] ? '✅ Finished' : '⏳ Waiting'}</td>
              </tr>
            `;
          })
          .join('');

        container.innerHTML = `
          <div style="width:100%;max-width:760px;overflow-x:auto;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:12px;">
              <span>Available Vector: <strong style="color:#0284c7;">[${s.newWork.join(', ')}]</strong></span>
              <span style="font-weight:800;color:${isSafe ? '#10b981' : '#ef4444'};">
                ${isSafe ? '🛡️ SAFE STATE' : '⚠️ UNSAFE STATE'}
              </span>
            </div>
            <table class="os-matrix-table" style="width:100%;">
              <thead>
                <tr><th>PID</th><th>Allocation (A,B,C)</th><th>Max (A,B,C)</th><th>Need (Max - Alloc)</th><th>Finish Status</th></tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
            <div style="margin-top:10px;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:11.5px;color:#166534;">
              <strong>Current Safe Sequence:</strong> &lt; ${s.seq.join(', ')} &gt;
            </div>
          </div>
        `;
      },
    }));
  }

  function generateMemoryFitFrames(strategy) {
    const holes = memoryHoles.map((h) => ({ ...h }));
    const allocations = [];

    memoryRequests.forEach((req, rIdx) => {
      let chosenIdx = -1;
      if (strategy === 'first') {
        chosenIdx = holes.findIndex((h) => h.free && h.size >= req);
      } else if (strategy === 'best') {
        let minDiff = Infinity;
        holes.forEach((h, i) => {
          if (h.free && h.size >= req && h.size - req < minDiff) {
            minDiff = h.size - req;
            chosenIdx = i;
          }
        });
      } else if (strategy === 'worst') {
        let maxDiff = -1;
        holes.forEach((h, i) => {
          if (h.free && h.size >= req && h.size - req > maxDiff) {
            maxDiff = h.size - req;
            chosenIdx = i;
          }
        });
      }

      if (chosenIdx !== -1) {
        const leftover = holes[chosenIdx].size - req;
        holes[chosenIdx].free = false;
        holes[chosenIdx].allocatedTo = `P${rIdx + 1} (${req}K)`;
        allocations.push({
          req,
          pid: `P${rIdx + 1}`,
          hole: holes[chosenIdx].id,
          leftover,
          holes: JSON.parse(JSON.stringify(holes)),
        });
      }
    });

    frames = allocations.map((a, idx) => ({
      operation: `Allocating Process ${a.pid} (${a.req} KB) using ${strategy.toUpperCase()} FIT.`,
      why: `${strategy.toUpperCase()} Fit chose hole ${a.hole} (leftover internal fragment: ${a.leftover} KB).`,
      next: idx < allocations.length - 1 ? 'Process next incoming memory request.' : 'All requests processed.',
      metrics: { Request: `${a.req} KB`, AssignedHole: a.hole, Leftover: `${a.leftover} KB` },
      render: (container) => {
        const blocksHtml = a.holes
          .map((h) => {
            const isAlloc = !h.free;
            return `
              <div class="os-mem-block ${isAlloc ? 'allocated' : 'free'}" style="flex:${h.size};">
                <span>${h.id} (${h.size}K)</span>
                <small>${isAlloc ? h.allocatedTo : 'FREE'}</small>
              </div>
            `;
          })
          .join('');

        container.innerHTML = `
          <div style="width:100%;max-width:800px;">
            <div style="font-size:11px;font-weight:800;color:#64748b;margin-bottom:4px;">PHYSICAL MEMORY PARTITIONS</div>
            <div class="os-memory-bar">${blocksHtml}</div>
            <div style="font-size:11.5px;color:#0f172a;margin-top:8px;">
              Allocated <strong>${a.pid}</strong> of size <strong>${a.req} KB</strong> into <strong>${a.hole}</strong>.
            </div>
          </div>
        `;
      },
    }));
  }

  function generateFragmentationFrames() {
    frames = [
      {
        operation: 'Memory Fragmentation Analysis: Internal vs External Fragmentation.',
        why: 'Internal fragmentation occurs inside fixed partitions; External fragmentation exists when total free memory exceeds request but is non-contiguous.',
        next: 'Demonstrate Compaction to combine free holes.',
        metrics: { 'Internal Frag': '64 KB', 'External Frag': '350 KB', 'Free Total': '414 KB' },
        render: (el) => {
          el.innerHTML = `
            <div style="width:100%;max-width:760px;display:flex;flex-direction:column;gap:12px;">
              <div class="os-memory-bar">
                <div class="os-mem-block allocated" style="flex:200;">P1 (160K)<small>Internal: 40K</small></div>
                <div class="os-mem-block free" style="flex:100;">Hole (100K)</div>
                <div class="os-mem-block allocated" style="flex:300;">P2 (276K)<small>Internal: 24K</small></div>
                <div class="os-mem-block free" style="flex:250;">Hole (250K)</div>
              </div>
              <div style="background:#fef2f2;border:1px solid #fecaca;padding:10px 14px;border-radius:8px;font-size:11.5px;color:#991b1b;">
                <strong>External Fragmentation:</strong> Free memory = 100K + 250K = 350K. But a process of 300K cannot be accommodated because free blocks are separated! Compaction slides P2 to join holes into a contiguous 350K block.
              </div>
            </div>
          `;
        },
      },
    ];
  }

  // ═════════════════════════════════════════════════════════════════════════
  // UNIT 4 IMPLEMENTATIONS (Paging, Page Table, Address Translation, Replacement)
  // ═════════════════════════════════════════════════════════════════════════
  function generatePagingFrames() {
    frames = [
      {
        operation: 'Paging Architecture: Logical Pages mapped non-contiguously to Physical Frames.',
        why: 'Eliminates external fragmentation by dividing memory into fixed-size units (pages & frames).',
        next: 'Translate address using Page Table.',
        metrics: { PageSize: '4 KB', Pages: '4', Frames: '8' },
        render: (el) => {
          el.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;width:100%;max-width:780px;">
              <div style="border:1.5px solid #0284c7;border-radius:8px;padding:10px;background:#f0f9ff;">
                <h4 style="margin:0 0 6px;color:#0369a1;">Logical Memory</h4>
                <div style="padding:6px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;margin-bottom:4px;">Page 0</div>
                <div style="padding:6px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;margin-bottom:4px;">Page 1</div>
                <div style="padding:6px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;margin-bottom:4px;">Page 2</div>
                <div style="padding:6px;border:1px solid #cbd5e1;background:#fff;border-radius:4px;">Page 3</div>
              </div>
              <div style="border:1.5px solid #6366f1;border-radius:8px;padding:10px;background:#eef2ff;">
                <h4 style="margin:0 0 6px;color:#4338ca;">Page Table</h4>
                <table class="os-matrix-table" style="width:100%;">
                  <tr><th>Page</th><th>Frame</th><th>Valid</th></tr>
                  <tr><td>0</td><td>5</td><td>1</td></tr>
                  <tr><td>1</td><td>2</td><td>1</td></tr>
                  <tr><td>2</td><td>6</td><td>1</td></tr>
                  <tr><td>3</td><td>-</td><td>0 (Disk)</td></tr>
                </table>
              </div>
              <div style="border:1.5px solid #10b981;border-radius:8px;padding:10px;background:#f0fdf4;">
                <h4 style="margin:0 0 6px;color:#15803d;">Physical RAM</h4>
                <div style="padding:4px;font-size:10px;">Frame 2: <strong>Page 1</strong></div>
                <div style="padding:4px;font-size:10px;">Frame 5: <strong>Page 0</strong></div>
                <div style="padding:4px;font-size:10px;">Frame 6: <strong>Page 2</strong></div>
              </div>
            </div>
          `;
        },
      },
    ];
  }

  function generateAddressTranslationFrames() {
    const pageSize = 1024; // 1 KB
    const logicalAddr = 5350;
    const pageNum = Math.floor(logicalAddr / pageSize); // 5
    const offset = logicalAddr % pageSize; // 230
    const frameNum = 8;
    const physicalAddr = frameNum * pageSize + offset; // 8422

    frames = [
      {
        operation: `Address Translation: Logical Address ${logicalAddr} (Page Size: ${pageSize} bytes).`,
        why: 'CPU breaks logical address into Page Number (p) and Offset (d).',
        next: `Look up Page Table for Frame number (f).`,
        metrics: { LogicalAddress: logicalAddr, Page: pageNum, Offset: offset, Frame: frameNum, PhysicalAddress: physicalAddr },
        render: (el) => {
          el.innerHTML = `
            <div style="width:100%;max-width:760px;display:flex;flex-direction:column;gap:12px;">
              <div style="background:#ffffff;border:1.5px solid #cbd5e1;border-radius:10px;padding:14px;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
                <h4 style="margin:0 0 8px;color:#0284c7;">Address Translation Steps:</h4>
                <div style="font-family:ui-monospace,monospace;font-size:12px;line-height:1.8;">
                  1. Page Number <strong>p</strong> = ⌊5350 / 1024⌋ = <strong>${pageNum}</strong><br>
                  2. Page Offset <strong>d</strong> = 5350 mod 1024 = <strong>${offset}</strong><br>
                  3. Look up Page Table at index ${pageNum} → <strong>Frame ${frameNum}</strong><br>
                  4. Physical Address = (Frame × PageSize) + Offset = (${frameNum} × 1024) + ${offset} = <strong style="color:#10b981;font-size:14px;">${physicalAddr}</strong>
                </div>
              </div>
            </div>
          `;
        },
      },
    ];
  }

  function generatePageFaultFrames() {
    const steps = [
      { step: '1. Memory Reference', desc: 'CPU attempts to load instruction from virtual address in Page 4.' },
      { step: '2. Page Table Trap', desc: 'Page table lookup indicates valid bit is 0 (Invalid / Page on Disk). Hardware traps to OS.' },
      { step: '3. Operating System Intervention', desc: 'OS saves user registers and checks if reference is valid in process virtual address space.' },
      { step: '4. Disk Read I/O', desc: 'OS brings missing page from disk backing store into an available physical RAM frame.' },
      { step: '5. Update Page Table', desc: 'OS sets frame number in page table and switches valid bit to 1.' },
      { step: '6. Restart Instruction', desc: 'CPU context restored; instruction that caused page fault restarts successfully.' },
    ];

    frames = steps.map((s, idx) => ({
      operation: s.step,
      why: s.desc,
      next: idx < steps.length - 1 ? 'Advance to next page fault service step.' : 'Page now resident in physical memory.',
      metrics: { FaultStatus: 'In Progress', Step: `${idx + 1} of 6` },
      render: (el) => {
        el.innerHTML = `
          <div style="width:100%;max-width:680px;background:#fff;border:1px solid #cbd5e1;border-radius:10px;padding:16px;">
            <div style="font-size:14px;font-weight:800;color:#0284c7;margin-bottom:8px;">${s.step}</div>
            <p style="font-size:12.5px;color:#334155;line-height:1.6;margin:0;">${s.desc}</p>
          </div>
        `;
      },
    }));
  }

  function generatePageReplacementFrames(algo) {
    const ref = [...pageRefString];
    const framesCount = numFrames || 3;
    const history = [];
    const memory = [];
    let hits = 0;
    let faults = 0;

    // Tracker for LRU
    const lastUsed = {};

    ref.forEach((page, stepIdx) => {
      const isHit = memory.includes(page);
      if (isHit) {
        hits++;
        lastUsed[page] = stepIdx;
      } else {
        faults++;
        if (memory.length < framesCount) {
          memory.push(page);
        } else {
          let replaceIdx = 0;
          if (algo === 'fifo') {
            replaceIdx = 0; // oldest in queue
          } else if (algo === 'lru') {
            let oldestStep = Infinity;
            memory.forEach((mPage, mIdx) => {
              if (lastUsed[mPage] < oldestStep) {
                oldestStep = lastUsed[mPage];
                replaceIdx = mIdx;
              }
            });
          } else if (algo === 'optimal') {
            let furthest = -1;
            memory.forEach((mPage, mIdx) => {
              const nextOccurrence = ref.slice(stepIdx + 1).indexOf(mPage);
              if (nextOccurrence === -1) {
                replaceIdx = mIdx;
                furthest = Infinity;
              } else if (nextOccurrence > furthest && furthest !== Infinity) {
                furthest = nextOccurrence;
                replaceIdx = mIdx;
              }
            });
          }
          memory.splice(replaceIdx, 1);
          memory.push(page);
        }
        lastUsed[page] = stepIdx;
      }

      history.push({
        page,
        isHit,
        memorySnapshot: [...memory],
        hits,
        faults,
        total: stepIdx + 1,
      });
    });

    frames = history.map((h, idx) => ({
      operation: `Reference Page ${h.page}: ${h.isHit ? 'PAGE HIT ✅' : 'PAGE FAULT ❌'}`,
      why: h.isHit
        ? `Page ${h.page} is already loaded in physical frame memory.`
        : `Page ${h.page} not in memory; loaded into frame using ${algo.toUpperCase()} policy.`,
      next: idx < history.length - 1 ? 'Reference next page in workload stream.' : 'Page replacement stream finished.',
      metrics: {
        'Current Page': h.page,
        'Page Faults': h.faults,
        'Page Hits': h.hits,
        'Hit Ratio': `${Math.round((h.hits / h.total) * 100)}%`,
        'Fault Ratio': `${Math.round((h.faults / h.total) * 100)}%`,
      },
      render: (container) => {
        const frameCells = h.memorySnapshot
          .map((p) => `<div style="padding:10px 16px;border:2px solid #0284c7;border-radius:8px;background:#e0f2fe;font-weight:800;font-size:14px;">${p}</div>`)
          .join('');

        container.innerHTML = `
          <div style="width:100%;max-width:760px;display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-weight:700;">Incoming Page:</span>
              <span style="font-size:20px;font-weight:900;color:${h.isHit ? '#10b981' : '#ef4444'};">${h.page}</span>
              <span style="padding:3px 10px;border-radius:6px;font-size:11px;font-weight:800;background:${h.isHit ? '#dcfce7;color:#15803d' : '#fee2e2;color:#b91c1c'};">
                ${h.isHit ? 'HIT' : 'FAULT'}
              </span>
            </div>
            <div style="font-size:11px;font-weight:800;color:#64748b;">PHYSICAL FRAMES (${framesCount} Slots)</div>
            <div style="display:flex;gap:10px;">${frameCells}</div>
          </div>
        `;
      },
    }));
  }

  function generatePageReplacementComparisonFrames() {
    frames = [
      {
        operation: 'Comparison of FIFO, LRU, and Optimal Page Replacement Algorithms.',
        why: 'Optimal provides the theoretical lowest fault rate; LRU approximates Optimal; FIFO can suffer from Belady\'s Anomaly.',
        next: 'Analyze comparative benchmark results.',
        metrics: { 'Algorithm Comparison': 'Active' },
        render: (el) => {
          el.innerHTML = `
            <div style="width:100%;max-width:760px;">
              <table class="os-matrix-table" style="width:100%;">
                <thead>
                  <tr><th>Algorithm</th><th>Page Faults</th><th>Page Hits</th><th>Hit Ratio</th><th>Hardware Support</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>FIFO</strong></td><td>15</td><td>5</td><td>25%</td><td>Simple Queue</td></tr>
                  <tr class="active-row"><td><strong>LRU</strong></td><td>12</td><td>8</td><td>40%</td><td>Counters / Stack</td></tr>
                  <tr><td><strong>Optimal (OPT)</strong></td><td>9 (Minimal)</td><td>11</td><td>55%</td><td>Theoretical (Future knowledge)</td></tr>
                </tbody>
              </table>
            </div>
          `;
        },
      },
    ];
  }

  // ═════════════════════════════════════════════════════════════════════════
  // UNIT 5 IMPLEMENTATIONS (File Allocation, Disk Scheduling: FCFS, SSTF, SCAN, C-SCAN)
  // ═════════════════════════════════════════════════════════════════════════
  function generateFileAllocationFrames() {
    frames = [
      {
        operation: 'File Allocation Methods Comparison: Contiguous vs Linked vs Indexed.',
        why: 'Contiguous offers fast sequential/direct access but causes external fragmentation. Linked avoids fragmentation but has slow random access. Indexed supports direct access via an index block.',
        next: 'Explore disk scheduling policies.',
        metrics: { Methods: 'Contiguous, Linked, Indexed' },
        render: (el) => {
          el.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;width:100%;max-width:800px;">
              <div style="border:1.5px solid #0284c7;border-radius:8px;padding:10px;background:#f0f9ff;">
                <h4 style="margin:0 0 6px;color:#0369a1;">Contiguous</h4>
                <div style="font-size:11px;color:#334155;">File blocks: [ 12, 13, 14, 15 ]<br>Directory: Start=12, Length=4<br>Fast access, fragmentation.</div>
              </div>
              <div style="border:1.5px solid #6366f1;border-radius:8px;padding:10px;background:#eef2ff;">
                <h4 style="margin:0 0 6px;color:#4338ca;">Linked</h4>
                <div style="font-size:11px;color:#334155;">Pointers: 9 → 16 → 1 → 25<br>Directory: Start=9, End=25<br>No fragmentation, slow seek.</div>
              </div>
              <div style="border:1.5px solid #10b981;border-radius:8px;padding:10px;background:#f0fdf4;">
                <h4 style="margin:0 0 6px;color:#15803d;">Indexed</h4>
                <div style="font-size:11px;color:#334155;">Index Block 19: [7, 14, 21, 35]<br>Directory: Index Block=19<br>Direct access without frag.</div>
              </div>
            </div>
          `;
        },
      },
    ];
  }

  function generateDiskFrames(algo) {
    const queue = [...diskRequests];
    let head = initialHead || 53;
    let totalMovement = 0;
    const history = [{ head, seek: 0, total: 0 }];

    if (algo === 'fcfs') {
      queue.forEach((req) => {
        const seek = Math.abs(req - head);
        totalMovement += seek;
        head = req;
        history.push({ head, seek, total: totalMovement });
      });
    } else if (algo === 'sstf') {
      const rem = [...queue];
      while (rem.length > 0) {
        rem.sort((a, b) => Math.abs(a - head) - Math.abs(b - head));
        const nextReq = rem.shift();
        const seek = Math.abs(nextReq - head);
        totalMovement += seek;
        head = nextReq;
        history.push({ head, seek, total: totalMovement });
      }
    } else if (algo === 'scan') {
      // Elevator moving upwards
      const sorted = [...queue].sort((a, b) => a - b);
      const right = sorted.filter((r) => r >= head);
      const left = sorted.filter((r) => r < head).reverse();
      const sequence = [...right, diskRange, ...left];
      sequence.forEach((req) => {
        const seek = Math.abs(req - head);
        totalMovement += seek;
        head = req;
        history.push({ head, seek, total: totalMovement });
      });
    } else if (algo === 'cscan') {
      // Circular SCAN
      const sorted = [...queue].sort((a, b) => a - b);
      const right = sorted.filter((r) => r >= head);
      const left = sorted.filter((r) => r < head);
      const sequence = [...right, diskRange, 0, ...left];
      sequence.forEach((req) => {
        const seek = Math.abs(req - head);
        totalMovement += seek;
        head = req;
        history.push({ head, seek, total: totalMovement });
      });
    }

    const avgSeek = (totalMovement / queue.length).toFixed(2);

    frames = history.map((h, idx) => ({
      operation: idx === 0 ? `Initial Disk Head at track ${h.head}.` : `Disk arm moves to track ${h.head} (Seek distance: ${h.seek} cylinders).`,
      why: idx === 0 ? 'Starting position of read/write head.' : `${algo.toUpperCase()} chose track ${h.head} based on seek criteria.`,
      next: idx < history.length - 1 ? 'Move disk arm to next scheduled cylinder request.' : 'All disk I/O requests serviced.',
      metrics: {
        'Current Track': h.head,
        'Seek Distance': `${h.seek} cylinders`,
        'Total Head Movement': `${h.total} cylinders`,
        'Average Seek': `${avgSeek} cylinders`,
      },
      render: (container) => {
        // Draw disk head line graph on SVG
        const points = history.slice(0, idx + 1).map((pt, i) => {
          const x = (pt.head / diskRange) * 700 + 40;
          const y = (i / history.length) * 160 + 30;
          return `${x},${y}`;
        }).join(' ');

        container.innerHTML = `
          <div style="width:100%;max-width:800px;">
            <svg class="os-disk-svg" viewBox="0 0 780 230">
              <!-- Disk track line markers -->
              <line x1="40" y1="20" x2="740" y2="20" stroke="#cbd5e1" stroke-width="2"/>
              <text x="40" y="15" font-size="10" fill="#64748b">Track 0</text>
              <text x="740" y="15" font-size="10" fill="#64748b" text-anchor="end">Track ${diskRange}</text>

              <!-- Polyline of head path -->
              <polyline fill="none" stroke="#0284c7" stroke-width="3" points="${points}"/>

              <!-- Head marker -->
              <circle cx="${(h.head / diskRange) * 700 + 40}" cy="${(idx / history.length) * 160 + 30}" r="6" fill="#ef4444" stroke="#fff" stroke-width="2"/>
            </svg>
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:6px;">
              <span>Total Head Movement: <strong style="color:#0284c7;">${h.total} cylinders</strong></span>
              <span>Average Seek: <strong>${avgSeek} cylinders</strong></span>
            </div>
          </div>
        `;
      },
    }));
  }

  function generateDiskComparisonFrames() {
    frames = [
      {
        operation: 'Benchmark Comparison of Disk Scheduling Algorithms (Queue: 98, 183, 37, 122, 14, 124, 65, 67, Start: 53).',
        why: 'SSTF minimizes local seek time but can cause starvation; SCAN and C-SCAN provide fair bounds.',
        next: 'Analyze total head movement.',
        metrics: { 'Benchmark Comparison': 'Active' },
        render: (el) => {
          el.innerHTML = `
            <div style="width:100%;max-width:760px;">
              <table class="os-matrix-table" style="width:100%;">
                <thead>
                  <tr><th>Algorithm</th><th>Total Head Movement</th><th>Average Seek</th><th>Starvation Risk</th></tr>
                </thead>
                <tbody>
                  <tr><td><strong>FCFS</strong></td><td>640 cylinders</td><td>80.0 cylinders</td><td>None</td></tr>
                  <tr class="active-row"><td><strong>SSTF</strong></td><td>236 cylinders</td><td>29.5 cylinders</td><td>High (distant tracks)</td></tr>
                  <tr><td><strong>SCAN</strong></td><td>208 cylinders</td><td>26.0 cylinders</td><td>None</td></tr>
                  <tr><td><strong>C-SCAN</strong></td><td>382 cylinders</td><td>47.7 cylinders</td><td>None (Uniform wait)</td></tr>
                </tbody>
              </table>
            </div>
          `;
        },
      },
    ];
  }

  // --- Dynamic Input Controls Renderers ---
  function renderInputControls() {
    if (!dynamicInputsEl) return;
    dynamicInputsEl.innerHTML = '';

    if (['os-fcfs-scheduling', 'os-sjf-scheduling', 'os-priority-scheduling', 'os-round-robin', 'os-cpu-comparison', 'os-gantt-chart'].includes(currentSimId)) {
      dynamicInputsEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px;width:100%;">
          <div style="display:flex;gap:10px;align-items:center;">
            <label class="os-field" style="max-width:120px;">Time Quantum
              <input type="number" id="input-tq" value="${timeQuantum}" min="1" max="10">
            </label>
            <span style="font-size:11px;color:#64748b;margin-top:14px;">(Used by Round Robin)</span>
          </div>
          <div style="font-size:11px;font-weight:700;color:#64748b;margin-top:4px;">Processes (PID, Arrival, Burst, Priority):</div>
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;">
            ${cpuProcesses.map((p, i) => `
              <div style="border:1px solid #cbd5e1;padding:6px;border-radius:6px;background:#f8fafc;font-size:11px;">
                <strong>${p.pid}</strong>: Arr <input type="number" class="proc-arr" data-idx="${i}" value="${p.arrival}" style="width:40px;">
                Burst <input type="number" class="proc-burst" data-idx="${i}" value="${p.burst}" style="width:40px;">
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (currentSimId.includes('page-replacement')) {
      dynamicInputsEl.innerHTML = `
        <div style="display:flex;gap:10px;width:100%;">
          <label class="os-field os-grow">Reference String (Comma Separated)
            <input type="text" id="input-ref-str" value="${pageRefString.join(', ')}">
          </label>
          <label class="os-field" style="width:110px;">Frames
            <input type="number" id="input-num-frames" value="${numFrames}" min="2" max="6">
          </label>
        </div>
      `;
    } else if (currentSimId.includes('disk')) {
      dynamicInputsEl.innerHTML = `
        <div style="display:flex;gap:10px;width:100%;">
          <label class="os-field os-grow">Disk Requests (Cylinders)
            <input type="text" id="input-disk-req" value="${diskRequests.join(', ')}">
          </label>
          <label class="os-field" style="width:110px;">Initial Head
            <input type="number" id="input-head-pos" value="${initialHead}" min="0" max="${diskRange}">
          </label>
        </div>
      `;
    }
  }

  function readCustomInputs() {
    const tqInput = $('input-tq');
    if (tqInput) timeQuantum = Number(tqInput.value) || 2;

    const arrInputs = document.querySelectorAll('.proc-arr');
    const burstInputs = document.querySelectorAll('.proc-burst');
    arrInputs.forEach((el, i) => {
      if (cpuProcesses[i]) cpuProcesses[i].arrival = Number(el.value) || 0;
    });
    burstInputs.forEach((el, i) => {
      if (cpuProcesses[i]) cpuProcesses[i].burst = Math.max(1, Number(el.value) || 1);
    });

    const refInput = $('input-ref-str');
    if (refInput) {
      pageRefString = refInput.value.split(',').map((v) => Number(v.trim())).filter((v) => !isNaN(v));
    }
    const framesInput = $('input-num-frames');
    if (framesInput) {
      numFrames = Math.max(2, Math.min(6, Number(framesInput.value) || 3));
    }

    const diskReqInput = $('input-disk-req');
    if (diskReqInput) {
      diskRequests = diskReqInput.value.split(',').map((v) => Number(v.trim())).filter((v) => !isNaN(v));
    }
    const headInput = $('input-head-pos');
    if (headInput) {
      initialHead = Number(headInput.value) || 53;
    }
  }

  // --- Pseudocode & Complexity Registry ---
  function renderPseudocodeAndComplexity() {
    if (!pseudocodeEl || !complexityEl) return;
    const pseudocodeMap = {
      'os-fcfs-scheduling': [
        'order ready queue by arrival time',
        'while processes remain:',
        '    dispatch head process to CPU',
        '    execute until completion (non-preemptive)',
        '    update turnaround & waiting metrics',
      ],
      'os-round-robin': [
        'maintain FIFO ready queue',
        'allocate CPU for time quantum q',
        'if process finishes before q:',
        '    terminate and compute completion time',
        'else:',
        '    preempt and append to back of queue',
      ],
      'os-bankers': [
        'let Work = Available, Finish[i] = false for all i',
        'find i such that Finish[i] == false and Need[i] <= Work',
        'if no such i exists: system is UNSAFE (deadlock possible)',
        'Work = Work + Allocation[i]; Finish[i] = true',
        'repeat until all Finish[i] are true -> SAFE STATE',
      ],
      'os-lru-page-replacement': [
        'for each page reference in string:',
        '    if page present in frame: HIT, update timestamp',
        '    else: FAULT',
        '        if free frame available: allocate page',
        '        else: replace page with oldest timestamp (LRU)',
      ],
      'os-scan-disk': [
        'move arm in direction (e.g. towards highest track)',
        'service requests encountered on the way',
        'at disk boundary: reverse direction',
        'service remaining requests on return sweep',
      ],
    };

    const lines = pseudocodeMap[currentSimId] || [
      'initialize algorithm data structures',
      'fetch next pending request/process',
      'evaluate scheduling/allocation condition',
      'execute operation and update metrics',
    ];

    pseudocodeEl.innerHTML = lines.map((l) => `<li>${l}</li>`).join('');

    complexityEl.innerHTML = `
      <div class="os-complexity-row"><span>Time Complexity</span><span>O(n log n)</span></div>
      <div class="os-complexity-row"><span>Space Overhead</span><span>O(n)</span></div>
      <div class="os-complexity-row"><span>Scheduling Category</span><span>Preemptive / Priority</span></div>
    `;
  }

  // --- Frame Render & Playback Pipeline ---
  function renderCurrentFrame() {
    if (!frames || frames.length === 0) return;
    const f = frames[cursor];

    if (visualization && f.render) {
      f.render(visualization);
    }
    if (operationEl) operationEl.textContent = f.operation || '';
    if (whyEl) whyEl.textContent = f.why || '';
    if (nextExplanationEl) nextExplanationEl.textContent = f.next || '';

    if (stepLabel) stepLabel.textContent = `Step ${cursor + 1} of ${frames.length}`;
    if (progressFill) progressFill.style.width = `${((cursor + 1) / frames.length) * 100}%`;

    if (metricsEl && f.metrics) {
      metricsEl.innerHTML = Object.entries(f.metrics)
        .map(([k, v]) => `<div class="os-metric">${k}: <strong>${v}</strong></div>`)
        .join('');
    }

    if (prevBtn) prevBtn.disabled = cursor === 0;
    if (nextBtn) nextBtn.disabled = cursor >= frames.length - 1;
    notifySmartBoard();
  }

  function nextStep() {
    if (cursor < frames.length - 1) {
      cursor++;
      renderCurrentFrame();
    } else {
      stopPlayback();
    }
  }

  function prevStep() {
    if (cursor > 0) {
      cursor--;
      renderCurrentFrame();
    }
  }

  function startPlayback() {
    if (timer) clearInterval(timer);
    playBtn.disabled = true;
    pauseBtn.disabled = false;
    const interval = Math.max(300, 1400 / speedMultiplier);
    timer = setInterval(() => {
      if (cursor < frames.length - 1) {
        nextStep();
      } else {
        stopPlayback();
      }
    }, interval);
  }

  function stopPlayback() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (playBtn) playBtn.disabled = false;
    if (pauseBtn) pauseBtn.disabled = true;
  }

  function resetSimulation() {
    stopPlayback();
    cursor = 0;
    renderCurrentFrame();
    showToast('Simulation reset to beginning.');
  }

  // Notify Smart Board parent frame of current state
  function notifySmartBoard() {
    if (!embedded || window.parent === window) return;
    const f = frames[cursor] || {};
    window.parent.postMessage(
      {
        type: 'EDUVERSE_OS_STATE',
        context: {
          simulation: simulationSelect?.options[simulationSelect?.selectedIndex]?.text || 'Operating Systems Lab',
          topic: topicTag?.textContent || 'Operating Systems',
          currentStep: cursor + 1,
          totalSteps: frames.length,
          operation: f.operation,
          metrics: f.metrics,
          state: {
            simulationId: currentSimId,
            cursor,
            metrics: f.metrics,
          },
        },
      },
      '*'
    );
  }

  // Ask AI about this step
  if (askAiBtn) {
    askAiBtn.addEventListener('click', () => {
      const q = aiQuestionInput?.value.trim() || 'Explain this Operating Systems simulation step and state.';
      const f = frames[cursor] || {};
      const contextSnapshot = {
        simulation: simulationSelect?.options[simulationSelect?.selectedIndex]?.text,
        unit: UNIT_CONFIGS[currentUnitKey].name,
        currentStep: cursor + 1,
        totalSteps: frames.length,
        operation: f.operation,
        why: f.why,
        metrics: f.metrics,
      };

      if (embedded && window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'EDUVERSE_OS_ASK_AI',
            question: q,
            selection: {
              type: 'Operating Systems Simulation State',
              content: JSON.stringify(contextSnapshot, null, 2),
            },
          },
          '*'
        );
      } else {
        // Standalone demonstration answer
        if (aiAnswerEl) {
          aiAnswerEl.classList.remove('hidden');
          aiAnswerEl.innerHTML = `
            <strong>💡 Eduverse AI Pedagogical Breakdown:</strong><br>
            At step ${cursor + 1}, ${f.operation}<br><br>
            <strong>Core Principle:</strong> ${f.why}<br><br>
            <strong>Kernel Action:</strong> ${f.next}
          `;
        }
      }
    });
  }

  // --- Event Listeners ---
  unitSelect.addEventListener('change', (e) => {
    currentUnitKey = e.target.value;
    populateSimulationOptions();
    currentSimId = simulationSelect.value;
    loadSimulation();
  });

  simulationSelect.addEventListener('change', (e) => {
    currentSimId = e.target.value;
    loadSimulation();
  });

  playBtn.addEventListener('click', startPlayback);
  pauseBtn.addEventListener('click', stopPlayback);
  nextBtn.addEventListener('click', nextStep);
  prevBtn.addEventListener('click', prevStep);
  resetBtn.addEventListener('click', resetSimulation);

  speedSelect.addEventListener('change', (e) => {
    speedMultiplier = Number(e.target.value) || 1;
    if (timer) {
      stopPlayback();
      startPlayback();
    }
  });

  const applyBtn = $('os-apply');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      readCustomInputs();
      generateFrames();
      cursor = 0;
      renderCurrentFrame();
      showToast('Custom workload parameters applied.');
    });
  }

  const randomBtn = $('os-randomize');
  if (randomBtn) {
    randomBtn.addEventListener('click', () => {
      cpuProcesses.forEach((p) => {
        p.burst = Math.floor(Math.random() * 8) + 2;
        p.arrival = Math.floor(Math.random() * 5);
      });
      diskRequests = Array.from({ length: 8 }, () => Math.floor(Math.random() * 190) + 5);
      renderInputControls();
      generateFrames();
      cursor = 0;
      renderCurrentFrame();
      showToast('Randomized workload parameters generated.');
    });
  }

  const exampleBtn = $('os-example');
  if (exampleBtn) {
    exampleBtn.addEventListener('click', () => {
      cpuProcesses = [
        { pid: 'P1', arrival: 0, burst: 5, priority: 2 },
        { pid: 'P2', arrival: 1, burst: 3, priority: 1 },
        { pid: 'P3', arrival: 2, burst: 8, priority: 4 },
        { pid: 'P4', arrival: 3, burst: 6, priority: 3 },
      ];
      timeQuantum = 2;
      pageRefString = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];
      numFrames = 3;
      diskRequests = [98, 183, 37, 122, 14, 124, 65, 67];
      initialHead = 53;
      renderInputControls();
      generateFrames();
      cursor = 0;
      renderCurrentFrame();
      showToast('Standard textbook example parameters restored.');
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        fullscreenBtn.textContent = 'Exit Fullscreen';
      } else {
        document.exitFullscreen().catch(() => {});
        fullscreenBtn.textContent = '⛶ Fullscreen';
      }
    });
  }

  if (launchBoardBtn) {
    launchBoardBtn.addEventListener('click', () => {
      const q = new URLSearchParams({
        subjectCode: 'U21CS403',
        subjectName: 'Operating Systems',
        preset: currentSimId,
        title: simulationSelect?.options[simulationSelect?.selectedIndex]?.text || 'Operating Systems Simulation',
      });
      window.open(`/smartboard/index.html?${q.toString()}`, '_blank');
    });
  }

  // Boot Engine
  initFromParams();
})();
