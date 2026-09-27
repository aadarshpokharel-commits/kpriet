/**
 * Problem Solving and C Programming Interactive Simulation Engine · Eduverse Smart Board
 * Course: U21CS101 / U21CSG01 · Semester I · B.Tech Information Technology (R2021 CBCS)
 * Covers all 16 curriculum simulations + Flagship C Program Execution & Memory Visualizer
 */
'use strict';

(function () {
  const params = new URLSearchParams(window.location.search);
  const $ = (id) => document.getElementById(id);

  // DOM Elements
  const unitSelect = $('c-unit');
  const simulationSelect = $('c-simulation');
  const prevBtn = $('c-prev');
  const runBtn = $('c-run');
  const pauseBtn = $('c-pause');
  const nextBtn = $('c-next');
  const resetBtn = $('c-reset');
  const speedSelect = $('c-speed');
  const stepLabel = $('c-step-label');
  const progressFill = $('c-progress-fill');
  const codeViewport = $('c-code-viewport');
  const codeStatusEl = $('c-code-status');
  const outputTerminal = $('c-output-terminal');
  const clearOutputBtn = $('c-clear-output');
  const visualization = $('c-visualization');
  const visualHeading = $('c-visual-heading');
  const legendEl = $('c-legend');
  const operationEl = $('c-operation');
  const whyEl = $('c-why');
  const nextExplanationEl = $('c-next-explanation');
  const metricsEl = $('c-metrics');
  const presetSelect = $('c-preset-select');
  const codeEditor = $('c-code-editor');
  const dynamicInputsEl = $('c-dynamic-inputs');
  const pseudocodeEl = $('c-pseudocode');
  const complexityEl = $('c-complexity');
  const toastEl = $('c-toast');
  const aiQuestionInput = $('c-ai-question');
  const askAiBtn = $('c-ask-ai');
  const aiAnswerEl = $('c-ai-answer');
  const topicTag = $('c-topic');
  const closeBtn = $('c-close');
  const fullscreenBtn = $('c-fullscreen');
  const compileRunBtn = $('c-compile-run');
  const randomizeBtn = $('c-randomize');
  const exampleBtn = $('c-example');

  const embedded = params.get('embedded') === '1';
  if (embedded && closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.parent.postMessage({ type: 'EDUVERSE_C_CLOSE' }, '*');
    });
  }

  // --- Curriculum Specifications & 16 Simulations Registry ---
  const UNIT_CONFIGS = {
    unit1: {
      name: 'Unit 1: Problem Solving & C Basics',
      simulations: [
        { id: 'c-execution', title: 'C Program Execution Visualizer', icon: '⚡', topic: 'Source to Execution & Memory' },
        { id: 'c-memory', title: 'Variable & Memory Visualizer', icon: '🧠', topic: 'Data Types, Sizes & Hex Addresses' },
        { id: 'c-number-systems', title: 'Number System Simulator', icon: '🔢', topic: 'Decimal, Binary, Octal & Hex' },
        { id: 'c-flowchart', title: 'Algorithm & Flowchart Builder', icon: '🔄', topic: 'Sequence, Selection & Loops' },
      ],
    },
    unit2: {
      name: 'Unit 2: Control Structures & Arrays',
      simulations: [
        { id: 'c-if-else', title: 'If-Else Execution Simulator', icon: '🔀', topic: 'Conditional Branching & Logic' },
        { id: 'c-loops', title: 'Loop Visualizer (for/while/do-while)', icon: '🔁', topic: 'Iteration Counters & State' },
        { id: 'c-arrays', title: 'Array Visualizer (1D & 2D)', icon: '📊', topic: 'Indexed Elements & Memory Offsets' },
        { id: 'c-searching', title: 'Searching Visualizer (Linear & Binary)', icon: '🔍', topic: 'Key Comparisons & Pointers' },
        { id: 'c-sorting', title: 'Sorting Visualizer (Bubble, Selection)', icon: '📶', topic: 'Passes, Comparisons & Swaps' },
      ],
    },
    unit3: {
      name: 'Unit 3: Pointers & Strings',
      simulations: [
        { id: 'c-pointers', title: 'Pointer Visualizer', icon: '📍', topic: 'Addresses, Dereferencing & Offsets' },
        { id: 'c-pass-by-value-ref', title: 'Pass-by-Value vs Pass-by-Reference', icon: '⚖️', topic: 'Stack Frame Copies vs Direct Pointers' },
        { id: 'c-strings', title: 'String Visualizer & Operations', icon: '🔤', topic: 'Char Arrays & Null Terminator \\0' },
      ],
    },
    unit4: {
      name: 'Unit 4: Functions & Recursion',
      simulations: [
        { id: 'c-call-stack', title: 'Function Call / Call Stack Visualizer', icon: '🥞', topic: 'Activation Records & Push/Pop' },
        { id: 'c-recursion', title: 'Recursion Visualizer', icon: '🌲', topic: 'Recursive Call Tree & Unwinding' },
      ],
    },
    unit5: {
      name: 'Unit 5: Structures, Unions & Files',
      simulations: [
        { id: 'c-structures-unions', title: 'Structure & Union Visualizer', icon: '📦', topic: 'Sequential vs Overlapping Memory' },
        { id: 'c-file-io', title: 'File Processing Simulator', icon: '📁', topic: 'File Pointer, Stream I/O & EOF' },
      ],
    },
  };

  // Flagship Code Presets
  const CODE_PRESETS = [
    {
      id: 'arithmetic',
      name: '1. Basic Arithmetic & Assignment',
      simId: 'c-execution',
      code: `int a = 10;
int b = 20;
int c = a + b;
printf("%d", c);`,
    },
    {
      id: 'swap',
      name: '2. Variable Swapping with Temp',
      simId: 'c-execution',
      code: `int x = 15;
int y = 30;
int temp = x;
x = y;
y = temp;
printf("x=%d, y=%d", x, y);`,
    },
    {
      id: 'if_else',
      name: '3. If-Else Decision Branching',
      simId: 'c-if-else',
      code: `int marks = 78;
if (marks >= 50) {
  printf("Result: PASS");
} else {
  printf("Result: FAIL");
}`,
    },
    {
      id: 'for_loop',
      name: '4. For Loop Accumulator',
      simId: 'c-loops',
      code: `int sum = 0;
for (int i = 1; i <= 3; i++) {
  sum = sum + i;
}
printf("Sum = %d", sum);`,
    },
    {
      id: 'pointer_deref',
      name: '5. Pointer Declaration & Dereferencing',
      simId: 'c-pointers',
      code: `int val = 42;
int *ptr = &val;
*ptr = 99;
printf("val=%d, *ptr=%d", val, *ptr);`,
    },
    {
      id: 'array_sum',
      name: '6. 1D Array Traversal',
      simId: 'c-arrays',
      code: `int arr[3] = {10, 20, 30};
int total = 0;
for (int i = 0; i < 3; i++) {
  total = total + arr[i];
}
printf("Total = %d", total);`,
    },
    {
      id: 'factorial_rec',
      name: '7. Recursive Factorial',
      simId: 'c-recursion',
      code: `int n = 3;
int result = fact(3);
printf("3! = %d", result);`,
    },
    {
      id: 'struct_demo',
      name: '8. Structure Member Allocation',
      simId: 'c-structures-unions',
      code: `struct Student s1;
s1.id = 101;
s1.marks = 95.5;
printf("ID:%d, Marks:%.1f", s1.id, s1.marks);`,
    },
  ];

  // Global Engine State
  let currentSimId = 'c-execution';
  let currentStep = 0;
  let totalSteps = 1;
  let frames = [];
  let isPlaying = false;
  let playInterval = null;
  let currentSpeed = 1;
  let programSourceLines = [];

  // --- Helpers ---
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  function formatHexAddr(base, offset) {
    return '0x7ffe' + (base + offset * 4).toString(16).padStart(4, '0');
  }

  // --- Step-by-Step Simulation Generators for All 16 Topics ---

  // 1. Flagship C Program Execution Visualizer
  function generateExecutionFrames(codeText) {
    const rawLines = (codeText || CODE_PRESETS[0].code).split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('//'));
    programSourceLines = rawLines;
    const f = [];
    const memory = {};
    let stdout = '';
    let baseAddr = 0x4100;
    let addrCounter = 0;

    // Initial load frame
    f.push({
      lineIdx: -1,
      source: '// Program initialized in memory',
      memory: {},
      stdout: 'Program ready. Starting execution...',
      op: 'Program loaded into RAM.',
      why: 'Compiler prepared data and text segments.',
      next: `Next: execute line 1 "${rawLines[0] || ''}".`,
      metrics: { 'Active Variables': 0, 'Stack Used': '0 B', 'Status': 'Ready' },
      renderType: 'memory',
    });

    rawLines.forEach((line, idx) => {
      let op = '', why = '', next = '';

      // Simple interpreter rules
      if (line.startsWith('int ') && line.includes('=')) {
        // e.g. int a = 10; or int c = a + b;
        const decl = line.replace('int ', '').replace(';', '').trim();
        const parts = decl.split('=');
        const varName = parts[0].trim();
        const expr = parts[1].trim();

        let val = 0;
        if (!isNaN(Number(expr))) {
          val = Number(expr);
        } else if (expr.includes('+')) {
          const addParts = expr.split('+').map(p => p.trim());
          const v1 = memory[addParts[0]] ? memory[addParts[0]].val : (Number(addParts[0]) || 0);
          const v2 = memory[addParts[1]] ? memory[addParts[1]].val : (Number(addParts[1]) || 0);
          val = v1 + v2;
        } else if (memory[expr]) {
          val = memory[expr].val;
        }

        memory[varName] = {
          name: varName,
          type: 'int',
          val: val,
          size: 4,
          addr: formatHexAddr(baseAddr, addrCounter++),
          active: true,
        };

        op = `Executed: ${line} -> ${varName} = ${val}`;
        why = `Allocated 4 bytes on call stack. Stored integer literal ${val} at ${memory[varName].addr}.`;
        next = idx < rawLines.length - 1 ? `Next statement: ${rawLines[idx + 1]}` : 'Program finished.';
      } else if (line.startsWith('printf(')) {
        // printf("%d", c) or printf("Sum = %d", sum)
        const match = line.match(/printf\((.*)\);?/);
        if (match) {
          const args = match[1].split(',').map(s => s.trim());
          const formatStr = args[0].replace(/"/g, '');
          let printed = formatStr;
          if (args.length > 1) {
            const varToPrint = args[1].trim();
            const val = memory[varToPrint] ? memory[varToPrint].val : varToPrint;
            printed = formatStr.includes('%d') ? formatStr.replace('%d', val) : (formatStr + ' ' + val);
          }
          stdout = stdout ? (stdout + '\n' + printed) : printed;
          op = `Executed: ${line} -> Output: "${printed}"`;
          why = `System call write() to file descriptor 1 (STDOUT).`;
          next = idx < rawLines.length - 1 ? `Next statement: ${rawLines[idx + 1]}` : 'Exit main() with code 0.';
        }
      } else if (line.includes('=')) {
        // Variable reassignment: x = y or *ptr = 99
        const parts = line.replace(';', '').split('=').map(p => p.trim());
        const target = parts[0];
        const src = parts[1];
        if (memory[target]) {
          const newVal = memory[src] ? memory[src].val : (Number(src) || 0);
          memory[target].val = newVal;
          memory[target].active = true;
          op = `Updated ${target} = ${newVal}`;
          why = `Overwrote 4 bytes in stack memory at ${memory[target].addr}.`;
          next = idx < rawLines.length - 1 ? `Next statement: ${rawLines[idx + 1]}` : 'Execution completed.';
        } else {
          op = `Statement evaluated: ${line}`;
          why = 'Evaluated expression and updated program counter.';
          next = 'Next statement.';
        }
      } else {
        op = `Evaluated: ${line}`;
        why = 'Control flow advanced to next instruction.';
        next = 'Next instruction.';
      }

      const snapshotMem = JSON.parse(JSON.stringify(memory));
      const totalBytes = Object.keys(snapshotMem).length * 4;

      f.push({
        lineIdx: idx,
        source: line,
        memory: snapshotMem,
        stdout: stdout || 'No output yet.',
        op,
        why,
        next,
        metrics: {
          'Active Variables': Object.keys(snapshotMem).length,
          'Stack Used': `${totalBytes} Bytes`,
          'Status': idx === rawLines.length - 1 ? 'Terminated (0)' : 'Executing',
        },
        renderType: 'memory',
      });
    });

    return f;
  }

  // 2. Variable & Memory Visualizer
  function generateMemoryFrames() {
    return [
      {
        lineIdx: 0,
        source: 'char grade = \'A\';',
        memory: { grade: { name: 'grade', type: 'char', val: "'A' (ASCII 65)", size: 1, addr: '0x7ffe4100' } },
        stdout: 'Memory inspection: 1 byte allocated.',
        op: 'Allocating 1 byte on stack for char variable grade.',
        why: 'char data type occupies exactly 1 byte (8 bits). Range: -128 to 127.',
        next: 'Next: int score = 95;',
        metrics: { 'Type': 'char', 'Bytes': '1 Byte', 'Address': '0x7ffe4100' },
        renderType: 'memory',
      },
      {
        lineIdx: 1,
        source: 'int score = 95;',
        memory: {
          grade: { name: 'grade', type: 'char', val: "'A'", size: 1, addr: '0x7ffe4100' },
          score: { name: 'score', type: 'int', val: 95, size: 4, addr: '0x7ffe4104' },
        },
        stdout: 'Memory inspection: 4 bytes allocated.',
        op: 'Allocating 4 bytes for 32-bit signed int score.',
        why: 'Standard 32/64-bit systems allocate 4 bytes (32 bits) with 4-byte memory word alignment.',
        next: 'Next: float cgpa = 9.8;',
        metrics: { 'Type': 'int', 'Bytes': '4 Bytes', 'Address': '0x7ffe4104' },
        renderType: 'memory',
      },
      {
        lineIdx: 2,
        source: 'float cgpa = 9.8f;',
        memory: {
          grade: { name: 'grade', type: 'char', val: "'A'", size: 1, addr: '0x7ffe4100' },
          score: { name: 'score', type: 'int', val: 95, size: 4, addr: '0x7ffe4104' },
          cgpa: { name: 'cgpa', type: 'float', val: '9.800000', size: 4, addr: '0x7ffe4108' },
        },
        stdout: 'Memory inspection: IEEE 754 float representation.',
        op: 'Stored single-precision IEEE 754 floating point number.',
        why: '1 sign bit + 8 exponent bits + 23 mantissa bits.',
        next: 'Next: double distance = 1420.55;',
        metrics: { 'Type': 'float', 'Bytes': '4 Bytes', 'Address': '0x7ffe4108' },
        renderType: 'memory',
      },
      {
        lineIdx: 3,
        source: 'double distance = 1420.55;',
        memory: {
          grade: { name: 'grade', type: 'char', val: "'A'", size: 1, addr: '0x7ffe4100' },
          score: { name: 'score', type: 'int', val: 95, size: 4, addr: '0x7ffe4104' },
          cgpa: { name: 'cgpa', type: 'float', val: '9.80', size: 4, addr: '0x7ffe4108' },
          distance: { name: 'distance', type: 'double', val: '1420.550000', size: 8, addr: '0x7ffe4110' },
        },
        stdout: 'Memory inspection: 8 bytes allocated for double precision.',
        op: 'Allocating 8 bytes for double precision 64-bit float.',
        why: '1 sign bit + 11 exponent bits + 52 mantissa bits with double precision.',
        next: 'All variables live on the current stack frame.',
        metrics: { 'Total Stack': '17 Bytes', 'Frame Base': '0x7ffe4100', 'Status': 'Allocated' },
        renderType: 'memory',
      },
    ];
  }

  // 3. Number System Simulator
  function generateNumberSystemFrames(decimalVal = 29) {
    const bin = decimalVal.toString(2).padStart(8, '0');
    const oct = decimalVal.toString(8);
    const hex = decimalVal.toString(16).toUpperCase();

    return [
      {
        lineIdx: 0,
        source: `int num = ${decimalVal}; // Base 10 Decimal`,
        memory: { num: { name: 'num', type: 'int', val: decimalVal, size: 4, addr: '0x7ffe4100' } },
        stdout: `Decimal: ${decimalVal}\nBinary: ${bin}\nOctal: ${oct}\nHexadecimal: 0x${hex}`,
        op: `Analyzing Decimal value ${decimalVal} across base 2, 8, and 16.`,
        why: `Computers store integers in 2's complement binary representation.`,
        next: 'Step 1: Divide by 2 to extract binary bits.',
        metrics: { 'Decimal (Base 10)': decimalVal, 'Binary (Base 2)': bin, 'Hex (Base 16)': '0x' + hex },
        renderType: 'number-system',
        data: { dec: decimalVal, bin, oct, hex, step: 1 },
      },
      {
        lineIdx: 1,
        source: `${decimalVal} / 2 = 14 rem 1 | 14/2 = 7 rem 0 ...`,
        memory: { num: { name: 'num', type: 'int', val: decimalVal, size: 4, addr: '0x7ffe4100' } },
        stdout: `Repeated division by 2:\n29 / 2 = 14 rem 1 (LSB)\n14 / 2 = 7  rem 0\n7  / 2 = 3  rem 1\n3  / 2 = 1  rem 1\n1  / 2 = 0  rem 1 (MSB)`,
        op: `Extracted binary representation: 11101_2 (29).`,
        why: `Reading remainders from bottom to top gives the exact binary bit pattern: 16 + 8 + 4 + 0 + 1 = 29.`,
        next: 'Convert to Hexadecimal (groups of 4 bits).',
        metrics: { 'Decimal': 29, 'Binary': '0001 1101', 'Hex': '0x1D' },
        renderType: 'number-system',
        data: { dec: decimalVal, bin, oct, hex, step: 2 },
      },
      {
        lineIdx: 2,
        source: `Hex: 0001 = 1, 1101 = D -> 0x1D`,
        memory: { num: { name: 'num', type: 'int', val: decimalVal, size: 4, addr: '0x7ffe4100' } },
        stdout: `Binary to Hex grouping:\n[0001] -> 1\n[1101] -> 13 = 'D'\nHex result: 0x1D`,
        op: `Hexadecimal grouping into 4-bit nibbles.`,
        why: `Each hex digit represents exactly 4 binary bits (2^4 = 16).`,
        next: 'Conversion completed.',
        metrics: { 'Dec': 29, 'Bin': '00011101', 'Octal': '35', 'Hex': '0x1D' },
        renderType: 'number-system',
        data: { dec: decimalVal, bin, oct, hex, step: 3 },
      },
    ];
  }

  // 4. Algorithm & Flowchart Builder
  function generateFlowchartFrames() {
    return [
      {
        lineIdx: 0,
        source: 'Start -> Input A, B',
        memory: { A: { name: 'A', type: 'int', val: 12, size: 4, addr: '0x7ffe4100' }, B: { name: 'B', type: 'int', val: 25, size: 4, addr: '0x7ffe4104' } },
        stdout: 'Flowchart node: [START] -> [INPUT]',
        op: 'Start node executed. Received user inputs A = 12, B = 25.',
        why: 'Every standard flowchart begins at an oval Start terminal.',
        next: 'Move to decision diamond: Is A > B?',
        metrics: { 'Current Node': 'INPUT A, B', 'Path': 'Start -> Input' },
        renderType: 'flowchart',
        data: { activeNode: 'input' },
      },
      {
        lineIdx: 1,
        source: 'if (A > B) ? False (12 > 25 is FALSE)',
        memory: { A: { name: 'A', type: 'int', val: 12, size: 4, addr: '0x7ffe4100' }, B: { name: 'B', type: 'int', val: 25, size: 4, addr: '0x7ffe4104' } },
        stdout: 'Flowchart decision: 12 > 25 is FALSE. Branching to FALSE path.',
        op: 'Evaluating condition diamond (A > B). Evaluates to False.',
        why: 'Selection control diamond routes flow along the False/No branch.',
        next: 'Execute process node: Max = B.',
        metrics: { 'Decision': 'FALSE (12 <= 25)', 'Branch': 'False Path' },
        renderType: 'flowchart',
        data: { activeNode: 'decision' },
      },
      {
        lineIdx: 2,
        source: 'Max = B; // Max = 25',
        memory: { Max: { name: 'Max', type: 'int', val: 25, size: 4, addr: '0x7ffe4108' } },
        stdout: 'Flowchart node: [Max = B] -> Output Max = 25',
        op: 'Assigned Max = 25 in process rectangle node.',
        why: 'False branch executes statement Max = B.',
        next: 'Flow reaches [END] terminal node.',
        metrics: { 'Max': 25, 'Current Node': 'OUTPUT MAX', 'Status': 'Complete' },
        renderType: 'flowchart',
        data: { activeNode: 'output' },
      },
    ];
  }

  // 5. If-Else Execution Simulator
  function generateIfElseFrames() {
    return [
      {
        lineIdx: 0,
        source: 'int marks = 78;',
        memory: { marks: { name: 'marks', type: 'int', val: 78, size: 4, addr: '0x7ffe4100' } },
        stdout: 'Variable initialized: marks = 78.',
        op: 'Initialized marks to 78.',
        why: 'Stores candidate score in stack memory.',
        next: 'Evaluate condition (marks >= 50).',
        metrics: { 'Marks': 78, 'Condition': 'Pending' },
        renderType: 'memory',
      },
      {
        lineIdx: 1,
        source: 'if (marks >= 50) // 78 >= 50 is TRUE',
        memory: { marks: { name: 'marks', type: 'int', val: 78, size: 4, addr: '0x7ffe4100' } },
        stdout: 'Condition evaluation: 78 >= 50 -> TRUE (1).',
        op: 'Condition (78 >= 50) evaluated to TRUE.',
        why: 'The CPU branching flag ZF is not set; control enters the TRUE block.',
        next: 'Execute printf("Result: PASS"); and skip else block.',
        metrics: { 'Marks': 78, 'Condition Result': 'TRUE (1)', 'Branch': 'if-body' },
        renderType: 'memory',
      },
      {
        lineIdx: 2,
        source: 'printf("Result: PASS");',
        memory: { marks: { name: 'marks', type: 'int', val: 78, size: 4, addr: '0x7ffe4100' } },
        stdout: 'Result: PASS',
        op: 'Executed True branch statement.',
        why: 'When condition is true, C enters the enclosed compound statement.',
        next: 'Jump past the else block to exit.',
        metrics: { 'Output': 'Result: PASS', 'Else Block': 'SKIPPED' },
        renderType: 'memory',
      },
    ];
  }

  // 6. Loop Visualizer (for / while)
  function generateLoopFrames() {
    const f = [];
    let sum = 0;
    f.push({
      lineIdx: 0,
      source: 'int sum = 0;',
      memory: { sum: { name: 'sum', type: 'int', val: 0, size: 4, addr: '0x7ffe4100' } },
      stdout: 'sum initialized to 0.',
      op: 'Loop accumulator initialized to 0.',
      why: 'Accumulator variable must be zeroed before summation.',
      next: 'Initialize loop counter int i = 1.',
      metrics: { 'Iteration': 0, 'sum': 0, 'i': 'undefined' },
      renderType: 'memory',
    });

    for (let i = 1; i <= 3; i++) {
      sum += i;
      f.push({
        lineIdx: 1,
        source: `for (int i = ${i}; i <= 3; i++) // Check: ${i} <= 3 is TRUE`,
        memory: {
          sum: { name: 'sum', type: 'int', val: sum - i, size: 4, addr: '0x7ffe4100' },
          i: { name: 'i', type: 'int', val: i, size: 4, addr: '0x7ffe4104' },
        },
        stdout: `Iteration ${i}: counter i = ${i} <= 3. Entering loop body.`,
        op: `Loop condition check (${i} <= 3) is TRUE.`,
        why: 'In a for loop, condition is tested at the beginning of each iteration.',
        next: `Execute body: sum = sum + ${i};`,
        metrics: { 'Iteration': i, 'sum': sum - i, 'i': i, 'Condition': 'TRUE' },
        renderType: 'memory',
      });

      f.push({
        lineIdx: 2,
        source: `sum = sum + i; // sum = ${sum - i} + ${i} = ${sum}`,
        memory: {
          sum: { name: 'sum', type: 'int', val: sum, size: 4, addr: '0x7ffe4100' },
          i: { name: 'i', type: 'int', val: i, size: 4, addr: '0x7ffe4104' },
        },
        stdout: `Iteration ${i}: sum updated to ${sum}.`,
        op: `Updated accumulator: sum = ${sum}.`,
        why: 'Loop body statement added current i to total.',
        next: `Execute increment expression: i++ -> i = ${i + 1}.`,
        metrics: { 'Iteration': i, 'sum': sum, 'i': i },
        renderType: 'memory',
      });
    }

    f.push({
      lineIdx: 3,
      source: 'i = 4; i <= 3 is FALSE -> Loop Terminated.',
      memory: {
        sum: { name: 'sum', type: 'int', val: sum, size: 4, addr: '0x7ffe4100' },
        i: { name: 'i', type: 'int', val: 4, size: 4, addr: '0x7ffe4104' },
      },
      stdout: `Loop exited. Final Sum = ${sum}.`,
      op: 'Loop counter incremented to 4. Condition 4 <= 3 is FALSE.',
      why: 'When loop condition evaluates to false, execution breaks to statement following loop.',
      next: `printf("Sum = %d", sum); Output: ${sum}`,
      metrics: { 'Total Iterations': 3, 'Final sum': sum, 'Loop Status': 'Terminated' },
      renderType: 'memory',
    });

    return f;
  }

  // 7. Array Visualizer (1D & 2D)
  function generateArrayFrames() {
    const arr = [10, 25, 40, 55];
    const base = 0x4100;
    return [
      {
        lineIdx: 0,
        source: 'int arr[4] = {10, 25, 40, 55};',
        memory: {
          'arr[0]': { name: 'arr[0]', type: 'int', val: 10, size: 4, addr: formatHexAddr(base, 0) },
          'arr[1]': { name: 'arr[1]', type: 'int', val: 25, size: 4, addr: formatHexAddr(base, 1) },
          'arr[2]': { name: 'arr[2]', type: 'int', val: 40, size: 4, addr: formatHexAddr(base, 2) },
          'arr[3]': { name: 'arr[3]', type: 'int', val: 55, size: 4, addr: formatHexAddr(base, 3) },
        },
        stdout: 'Contiguous 1D array allocated: 4 elements x 4 bytes = 16 bytes.',
        op: 'Allocating 16 contiguous bytes in stack memory for int array arr[4].',
        why: 'In C, array elements are stored contiguously in memory with zero indexing.',
        next: 'Access element at index 0: Addr = Base + (0 * 4).',
        metrics: { 'Base Address': '0x7ffe4100', 'Length': 4, 'Total Bytes': '16 B' },
        renderType: 'array',
        data: { elements: arr, activeIdx: 0 },
      },
      {
        lineIdx: 1,
        source: 'int x = arr[2]; // Index 2 -> Value 40',
        memory: {
          'arr[2]': { name: 'arr[2]', type: 'int', val: 40, size: 4, addr: formatHexAddr(base, 2) },
          'x': { name: 'x', type: 'int', val: 40, size: 4, addr: '0x7ffe4114' },
        },
        stdout: `Reading arr[2]: Address = 0x7ffe4100 + (2 * 4) = 0x7ffe4108. Value = 40.`,
        op: 'Direct array indexing access: Addr(arr[2]) = Base + 2 * sizeof(int).',
        why: 'O(1) constant time index calculation using pointer arithmetic.',
        next: 'Update element: arr[1] = 99;',
        metrics: { 'Accessed Index': 2, 'Value': 40, 'Address': '0x7ffe4108' },
        renderType: 'array',
        data: { elements: arr, activeIdx: 2 },
      },
      {
        lineIdx: 2,
        source: 'arr[1] = 99; // In-place array mutation',
        memory: {
          'arr[1]': { name: 'arr[1]', type: 'int', val: 99, size: 4, addr: formatHexAddr(base, 1) },
        },
        stdout: 'Updated arr[1] = 99.',
        op: 'Overwrote 4 bytes at address 0x7ffe4104 with 99.',
        why: 'Arrays are mutable contiguous memory buffers.',
        next: 'Array traversal completed.',
        metrics: { 'Updated Index': 1, 'New Value': 99 },
        renderType: 'array',
        data: { elements: [10, 99, 40, 55], activeIdx: 1 },
      },
    ];
  }

  // 8. Pointer Visualizer
  function generatePointerFrames() {
    return [
      {
        lineIdx: 0,
        source: 'int val = 42; // Regular integer',
        memory: { val: { name: 'val', type: 'int', val: 42, size: 4, addr: '0x7ffe4100' } },
        stdout: 'Variable declared: val = 42 at address 0x7ffe4100.',
        op: 'Variable val created with initial value 42 at address 0x7ffe4100.',
        why: 'Normal variable holds direct data values.',
        next: 'Declare pointer: int *ptr = &val;',
        metrics: { 'Variable': 'val', 'Value': 42, 'Address': '0x7ffe4100' },
        renderType: 'pointer',
        data: { val: 42, addr: '0x7ffe4100', ptrAddr: '0x7ffe4104', ptrVal: null },
      },
      {
        lineIdx: 1,
        source: 'int *ptr = &val; // Pointer stores address of val',
        memory: {
          val: { name: 'val', type: 'int', val: 42, size: 4, addr: '0x7ffe4100' },
          ptr: { name: 'ptr', type: 'int*', val: '0x7ffe4100', size: 8, addr: '0x7ffe4104' },
        },
        stdout: 'Pointer ptr stores address 0x7ffe4100. ptr points to val.',
        op: 'Address-of operator (&val) retrieved address 0x7ffe4100 and stored it into ptr.',
        why: 'A pointer is a variable that stores the memory address of another variable.',
        next: 'Dereference pointer: *ptr = 99;',
        metrics: { 'ptr': '0x7ffe4100', 'Target': 'val', 'Deref (*ptr)': 42 },
        renderType: 'pointer',
        data: { val: 42, addr: '0x7ffe4100', ptrAddr: '0x7ffe4104', ptrVal: '0x7ffe4100' },
      },
      {
        lineIdx: 2,
        source: '*ptr = 99; // Dereference and write',
        memory: {
          val: { name: 'val', type: 'int', val: 99, size: 4, addr: '0x7ffe4100' },
          ptr: { name: 'ptr', type: 'int*', val: '0x7ffe4100', size: 8, addr: '0x7ffe4104' },
        },
        stdout: '*ptr = 99 modified val indirectly. Now val = 99.',
        op: 'Dereference operator (*) navigated to address 0x7ffe4100 and wrote value 99.',
        why: '*ptr accesses the memory location pointed to by ptr.',
        next: 'Demonstrate pointer arithmetic: ptr++;',
        metrics: { 'val': 99, '*ptr': 99, 'Status': 'Mutated via Pointer' },
        renderType: 'pointer',
        data: { val: 99, addr: '0x7ffe4100', ptrAddr: '0x7ffe4104', ptrVal: '0x7ffe4100' },
      },
    ];
  }

  // 9. Pass-by-Value vs Pass-by-Reference
  function generatePassByValueRefFrames() {
    return [
      {
        lineIdx: 0,
        source: '// PASS-BY-VALUE: swap_val(a, b)',
        memory: {
          'main::a': { name: 'main::a', type: 'int', val: 10, size: 4, addr: '0x7ffe4100' },
          'main::b': { name: 'main::b', type: 'int', val: 20, size: 4, addr: '0x7ffe4104' },
          'swap::x': { name: 'swap::x', type: 'int', val: 10, size: 4, addr: '0x7ffe4080' },
          'swap::y': { name: 'swap::y', type: 'int', val: 20, size: 4, addr: '0x7ffe4084' },
        },
        stdout: 'swap_val(a, b): Values 10 and 20 COPIED to new stack frame.',
        op: 'Pass-by-value creates independent copies in function stack frame.',
        why: 'Modifying x and y inside swap_val alters only copies. Original a and b remain 10 and 20.',
        next: 'Compare with Pass-by-Reference: swap_ref(&a, &b);',
        metrics: { 'Mode': 'Pass-by-Value', 'Copies': 'Isolated', 'Originals': 'Unchanged' },
        renderType: 'memory',
      },
      {
        lineIdx: 1,
        source: '// PASS-BY-REFERENCE: swap_ref(&a, &b)',
        memory: {
          'main::a': { name: 'main::a', type: 'int', val: 20, size: 4, addr: '0x7ffe4100' },
          'main::b': { name: 'main::b', type: 'int', val: 10, size: 4, addr: '0x7ffe4104' },
          'swap::p1': { name: 'swap::p1', type: 'int*', val: '0x7ffe4100', size: 8, addr: '0x7ffe4080' },
          'swap::p2': { name: 'swap::p2', type: 'int*', val: '0x7ffe4104', size: 8, addr: '0x7ffe4088' },
        },
        stdout: 'swap_ref(&a, &b): Addresses passed. Original a and b SWAPPED to 20 and 10.',
        op: 'Pass-by-reference passes memory addresses &a and &b.',
        why: 'Dereferencing *p1 and *p2 directly mutates variables in the caller stack frame.',
        next: 'Comparison completed.',
        metrics: { 'Mode': 'Pass-by-Reference', 'Pointers': 'Passed', 'Originals': 'Swapped' },
        renderType: 'memory',
      },
    ];
  }

  // 10. String Visualizer
  function generateStringFrames() {
    const chars = ['H', 'E', 'L', 'L', 'O', '\\0'];
    return [
      {
        lineIdx: 0,
        source: 'char str[] = "HELLO"; // 5 letters + 1 null terminator',
        memory: {
          'str[0]': { name: "str[0]", type: 'char', val: "'H'", size: 1, addr: '0x7ffe4100' },
          'str[1]': { name: "str[1]", type: 'char', val: "'E'", size: 1, addr: '0x7ffe4101' },
          'str[2]': { name: "str[2]", type: 'char', val: "'L'", size: 1, addr: '0x7ffe4102' },
          'str[3]': { name: "str[3]", type: 'char', val: "'L'", size: 1, addr: '0x7ffe4103' },
          'str[4]': { name: "str[4]", type: 'char', val: "'O'", size: 1, addr: '0x7ffe4104' },
          'str[5]': { name: "str[5]", type: 'char', val: "'\\0' (0)", size: 1, addr: '0x7ffe4105' },
        },
        stdout: 'String stored: "HELLO" (Length = 5, Size = 6 bytes including \\0).',
        op: 'Allocating 6 contiguous bytes for string array ending with null character \\0.',
        why: 'In C, strings are null-terminated character arrays. Functions like strlen() stop at \\0.',
        next: 'Run strlen(str); -> traverses until \\0.',
        metrics: { 'strlen': 5, 'sizeof': '6 Bytes', 'Terminator': "'\\0' (ASCII 0)" },
        renderType: 'string',
        data: { chars, activeIdx: 0 },
      },
      {
        lineIdx: 1,
        source: 'strlen(str) counts characters until \'\\0\'.',
        memory: {
          'len': { name: 'len', type: 'int', val: 5, size: 4, addr: '0x7ffe4108' }
        },
        stdout: 'strlen("HELLO") returned 5.',
        op: 'Counted 5 characters before reaching sentinel byte 0x00.',
        why: 'Without \\0, C string functions would suffer from buffer over-reads.',
        next: 'String demonstration completed.',
        metrics: { 'Chars Counted': 5, 'Null Byte Reached': 'Yes' },
        renderType: 'string',
        data: { chars, activeIdx: 5 },
      },
    ];
  }

  // 11. Searching Visualizer (Linear & Binary)
  function generateSearchingFrames() {
    return [
      {
        lineIdx: 0,
        source: 'int arr[] = {12, 25, 34, 48, 62}; target = 48;',
        memory: { target: { name: 'target', type: 'int', val: 48, size: 4, addr: '0x7ffe4100' } },
        stdout: 'Binary Search: low = 0, high = 4, target = 48.',
        op: 'Initializing Binary Search pointers: low = 0, high = 4.',
        why: 'Binary search requires a sorted array and operates in O(log n) time.',
        next: 'Compute mid = (low + high) / 2 = 2 (Value = 34).',
        metrics: { 'low': 0, 'mid': 2, 'high': 4, 'Comparisons': 1 },
        renderType: 'array',
        data: { elements: [12, 25, 34, 48, 62], activeIdx: 2 },
      },
      {
        lineIdx: 1,
        source: 'mid = 2 (arr[2] = 34) < target (48) -> low = mid + 1 = 3;',
        memory: { target: { name: 'target', type: 'int', val: 48, size: 4, addr: '0x7ffe4100' } },
        stdout: 'arr[mid] (34) < 48. Target lies in right half. low moved to index 3.',
        op: 'Eliminated left half of search space (indices 0 to 2).',
        why: 'Because the array is sorted, elements to the left of 34 cannot contain 48.',
        next: 'Compute new mid = (3 + 4) / 2 = 3 (Value = 48).',
        metrics: { 'low': 3, 'mid': 3, 'high': 4, 'Comparisons': 2 },
        renderType: 'array',
        data: { elements: [12, 25, 34, 48, 62], activeIdx: 3 },
      },
      {
        lineIdx: 2,
        source: 'mid = 3 (arr[3] = 48) == target (48) -> FOUND at index 3!',
        memory: { foundIdx: { name: 'foundIdx', type: 'int', val: 3, size: 4, addr: '0x7ffe4104' } },
        stdout: 'FOUND target 48 at index 3 in 2 comparisons!',
        op: 'Match found: arr[3] == 48.',
        why: 'Target key matched element at mid index in only 2 comparisons.',
        next: 'Search completed successfully.',
        metrics: { 'Found Index': 3, 'Total Comparisons': 2, 'Time Complexity': 'O(log n)' },
        renderType: 'array',
        data: { elements: [12, 25, 34, 48, 62], activeIdx: 3 },
      },
    ];
  }

  // 12. Sorting Visualizer (Bubble Sort)
  function generateSortingFrames() {
    return [
      {
        lineIdx: 0,
        source: 'int arr[] = {30, 10, 50, 20}; // Pass 1',
        memory: {},
        stdout: 'Bubble Sort Pass 1: Compare arr[0] (30) and arr[1] (10). 30 > 10 -> SWAP.',
        op: 'Comparing arr[0] (30) and arr[1] (10). Out of order -> Swap.',
        why: 'Bubble sort bubbles largest element to the end through adjacent swaps.',
        next: 'Array becomes {10, 30, 50, 20}.',
        metrics: { 'Pass': 1, 'Swaps': 1, 'Comparisons': 1 },
        renderType: 'array',
        data: { elements: [10, 30, 50, 20], activeIdx: 1 },
      },
      {
        lineIdx: 1,
        source: 'Compare arr[2] (50) and arr[3] (20) -> SWAP.',
        memory: {},
        stdout: '50 > 20 -> SWAP. Array becomes {10, 30, 20, 50}. Element 50 locked in place.',
        op: 'Largest element 50 placed at final sorted index 3.',
        why: 'After Pass 1, the largest item is guaranteed to be at the highest index.',
        next: 'Pass 2: Compare remaining unsorted elements.',
        metrics: { 'Pass': 1, 'Swaps': 2, 'Sorted Elements': 1 },
        renderType: 'array',
        data: { elements: [10, 30, 20, 50], activeIdx: 2 },
      },
      {
        lineIdx: 2,
        source: 'Pass 2 complete -> Array fully sorted: {10, 20, 30, 50}.',
        memory: {},
        stdout: 'Sorting complete! Array sorted in ascending order.',
        op: 'All passes complete with zero remaining inversions.',
        why: 'Array is verified sorted: O(n^2) worst-case time complexity.',
        next: 'Sorting demonstration completed.',
        metrics: { 'Final Array': '[10, 20, 30, 50]', 'Status': 'Sorted' },
        renderType: 'array',
        data: { elements: [10, 20, 30, 50], activeIdx: -1 },
      },
    ];
  }

  // 13. Function Call / Call Stack Visualizer
  function generateCallStackFrames() {
    return [
      {
        lineIdx: 0,
        source: 'main() invoked. Push main stack frame.',
        memory: { 'main::x': { name: 'main::x', type: 'int', val: 5, size: 4, addr: '0x7ffe4100' } },
        stdout: 'Call stack: [main]',
        op: 'Operating system pushes main() activation record onto call stack.',
        why: 'Each function invocation creates a stack frame containing local variables and return address.',
        next: 'Call compute(x) -> Push compute stack frame.',
        metrics: { 'Stack Depth': 1, 'Active Frame': 'main()', 'SP': '0x7ffe4100' },
        renderType: 'memory',
      },
      {
        lineIdx: 1,
        source: 'compute(5) invoked. Push compute stack frame.',
        memory: {
          'main::x': { name: 'main::x', type: 'int', val: 5, size: 4, addr: '0x7ffe4100' },
          'compute::n': { name: 'compute::n', type: 'int', val: 5, size: 4, addr: '0x7ffe4080' },
          'compute::res': { name: 'compute::res', type: 'int', val: 25, size: 4, addr: '0x7ffe4084' },
        },
        stdout: 'Call stack: [main] -> [compute]',
        op: 'Pushed compute() frame on top of main(). Stack pointer decremented.',
        why: 'Call stack grows downward in memory on modern x86/ARM architectures.',
        next: 'compute() returns 25. Pop compute stack frame.',
        metrics: { 'Stack Depth': 2, 'Active Frame': 'compute()', 'SP': '0x7ffe4080' },
        renderType: 'memory',
      },
      {
        lineIdx: 2,
        source: 'compute() returned 25. Pop compute stack frame.',
        memory: {
          'main::x': { name: 'main::x', type: 'int', val: 5, size: 4, addr: '0x7ffe4100' },
          'main::ans': { name: 'main::ans', type: 'int', val: 25, size: 4, addr: '0x7ffe4104' },
        },
        stdout: 'Call stack: [main]. Returned value 25 received.',
        op: 'compute() frame popped. Stack pointer restored to main().',
        why: 'Local variables of compute() are deallocated automatically upon return.',
        next: 'main() exits with return 0.',
        metrics: { 'Stack Depth': 1, 'Result': 25, 'Active Frame': 'main()' },
        renderType: 'memory',
      },
    ];
  }

  // 14. Recursion Visualizer
  function generateRecursionFrames() {
    return [
      {
        lineIdx: 0,
        source: 'fact(3) -> Calls fact(2)',
        memory: { 'fact(3)::n': { name: 'n', type: 'int', val: 3, size: 4, addr: '0x7ffe4100' } },
        stdout: 'fact(3): 3 > 1 -> Invoking fact(2)...',
        op: 'Push stack frame for fact(3). Recurses to fact(2).',
        why: 'Recursion breaks problem into smaller subproblem n * fact(n-1).',
        next: 'Push fact(2) stack frame.',
        metrics: { 'Call Depth': 1, 'n': 3, 'Base Case': 'False' },
        renderType: 'memory',
      },
      {
        lineIdx: 1,
        source: 'fact(2) -> Calls fact(1)',
        memory: {
          'fact(3)::n': { name: 'n', type: 'int', val: 3, size: 4, addr: '0x7ffe4100' },
          'fact(2)::n': { name: 'n', type: 'int', val: 2, size: 4, addr: '0x7ffe4080' },
          'fact(1)::n': { name: 'n', type: 'int', val: 1, size: 4, addr: '0x7ffe4000' },
        },
        stdout: 'fact(1): Base condition (n <= 1) REACHED! Returns 1.',
        op: 'Base case reached at fact(1). Halts further recursion.',
        why: 'Without a base condition, infinite recursion causes a Stack Overflow error.',
        next: 'Unwind stack: return 1 to fact(2).',
        metrics: { 'Max Depth': 3, 'Base Case': 'TRUE', 'Return Val': 1 },
        renderType: 'memory',
      },
      {
        lineIdx: 2,
        source: 'Unwinding: fact(2) = 2 * 1 = 2; fact(3) = 3 * 2 = 6;',
        memory: { 'result': { name: '3!', type: 'int', val: 6, size: 4, addr: '0x7ffe4104' } },
        stdout: 'Recursion unwound: 3! = 6.',
        op: 'Call frames popped one by one multiplying return values.',
        why: 'Call stack returns control upward as each frame resolves.',
        next: 'Calculation completed: 3! = 6.',
        metrics: { 'Result': '6', 'Status': 'Unwound Successfully' },
        renderType: 'memory',
      },
    ];
  }

  // 15. Structure & Union Visualizer
  function generateStructureUnionFrames() {
    return [
      {
        lineIdx: 0,
        source: 'struct Data { int id; float marks; }; // Contiguous',
        memory: {
          's.id': { name: 's.id', type: 'int', val: 101, size: 4, addr: '0x7ffe4100' },
          's.marks': { name: 's.marks', type: 'float', val: '95.50', size: 4, addr: '0x7ffe4104' },
        },
        stdout: 'struct Data: id (4B at 0x7ffe4100) + marks (4B at 0x7ffe4104) = 8 Bytes total.',
        op: 'Structure allocates separate contiguous memory for every member.',
        why: 'In a struct, all members can hold distinct values concurrently.',
        next: 'Contrast with union DataU: shared memory.',
        metrics: { 'Type': 'struct', 'Total Size': '8 Bytes', 'Overlap': 'None' },
        renderType: 'memory',
      },
      {
        lineIdx: 1,
        source: 'union DataU { int id; float marks; }; // Shared',
        memory: {
          'u.val': { name: 'u (shared)', type: 'union', val: 'Overlapped at 0x7ffe4100', size: 4, addr: '0x7ffe4100' },
        },
        stdout: 'union DataU: Size = max(sizeof(id), sizeof(marks)) = 4 Bytes. Members share the SAME address!',
        op: 'Union allocates single shared memory block equal to size of largest member.',
        why: 'Writing to marks overwrites the binary bits of id.',
        next: 'Demonstration completed.',
        metrics: { 'Type': 'union', 'Total Size': '4 Bytes', 'Overlap': '100% Shared' },
        renderType: 'memory',
      },
    ];
  }

  // 16. File Processing Simulator
  function generateFileFrames() {
    return [
      {
        lineIdx: 0,
        source: 'FILE *fp = fopen("grades.txt", "w");',
        memory: { fp: { name: 'fp', type: 'FILE*', val: '0x55aa1200', size: 8, addr: '0x7ffe4100' } },
        stdout: 'File "grades.txt" opened in WRITE mode ("w"). File pointer initialized at byte 0.',
        op: 'fopen() requested OS kernel to open/create file stream.',
        why: 'Returns a pointer to a FILE structure containing buffer descriptor and file position indicator.',
        next: 'Write data: fputs("A+ 95", fp);',
        metrics: { 'Mode': 'WRITE ("w")', 'File Pointer': '0 (Start)', 'Status': 'Open' },
        renderType: 'memory',
      },
      {
        lineIdx: 1,
        source: 'fputs("A+ 95", fp); // Writes 5 characters',
        memory: { fp: { name: 'fp', type: 'FILE*', val: '0x55aa1200', size: 8, addr: '0x7ffe4100' } },
        stdout: 'Wrote: "A+ 95" to file stream buffer. File position advanced to byte 5.',
        op: 'Written 5 bytes to disk buffer. File position indicator moved from 0 -> 5.',
        why: 'File write operations increment file position offset by number of bytes written.',
        next: 'Close file: fclose(fp);',
        metrics: { 'Bytes Written': 5, 'Position': 'Byte 5', 'Buffer': 'Flushed' },
        renderType: 'memory',
      },
      {
        lineIdx: 2,
        source: 'fclose(fp); // Flushes buffer and releases file lock',
        memory: { fp: { name: 'fp', type: 'FILE*', val: 'NULL (0x0)', size: 8, addr: '0x7ffe4100' } },
        stdout: 'File flushed and closed safely. fp is no longer valid.',
        op: 'fclose() flushed dirty stream buffer to physical disk and released OS file descriptor.',
        why: 'Always fclose() files to prevent memory leaks and incomplete file writes.',
        next: 'File operations completed.',
        metrics: { 'File Closed': 'Yes', 'Data Integrity': 'Saved to Disk' },
        renderType: 'memory',
      },
    ];
  }

  // Master frame dispatcher
  function generateFramesForSimulation(simId) {
    switch (simId) {
      case 'c-execution': return generateExecutionFrames(codeEditor ? codeEditor.value : '');
      case 'c-memory': return generateMemoryFrames();
      case 'c-number-systems': return generateNumberSystemFrames();
      case 'c-flowchart': return generateFlowchartFrames();
      case 'c-if-else': return generateIfElseFrames();
      case 'c-loops': return generateLoopFrames();
      case 'c-arrays': return generateArrayFrames();
      case 'c-pointers': return generatePointerFrames();
      case 'c-pass-by-value-ref': return generatePassByValueRefFrames();
      case 'c-strings': return generateStringFrames();
      case 'c-searching': return generateSearchingFrames();
      case 'c-sorting': return generateSortingFrames();
      case 'c-call-stack': return generateCallStackFrames();
      case 'c-recursion': return generateRecursionFrames();
      case 'c-structures-unions': return generateStructureUnionFrames();
      case 'c-file-io': return generateFileFrames();
      default: return generateExecutionFrames();
    }
  }

  // --- Rendering UI Updates ---

  function renderCodePanel(frame) {
    if (!codeViewport) return;
    const lines = programSourceLines.length ? programSourceLines : (codeEditor ? codeEditor.value.split('\n') : []);
    let html = '';
    lines.forEach((lineText, idx) => {
      const isActive = frame && frame.lineIdx === idx;
      html += `
        <div class="c-code-line ${isActive ? 'active' : ''}">
          <span class="c-line-num">${idx + 1}</span>
          <span class="c-line-text">${escapeHtml(lineText)}</span>
        </div>
      `;
    });
    codeViewport.innerHTML = html;
  }

  function renderVisualStage(frame) {
    if (!visualization) return;
    if (!frame) {
      visualization.innerHTML = '<div class="c-empty-visual">Click Next Step to begin simulation.</div>';
      return;
    }

    if (frame.renderType === 'array' && frame.data) {
      // 1D Array visualization
      let html = '<div class="c-array-row">';
      frame.data.elements.forEach((val, idx) => {
        const isActive = frame.data.activeIdx === idx;
        html += `
          <div class="c-array-slot">
            <div class="c-array-box ${isActive ? 'active' : ''}">${val}</div>
            <div class="c-array-idx">[${idx}]</div>
          </div>
        `;
      });
      html += '</div>';
      visualization.innerHTML = html;
    } else if (frame.renderType === 'string' && frame.data) {
      // String character array
      let html = '<div class="c-array-row">';
      frame.data.chars.forEach((ch, idx) => {
        const isNull = ch === '\\0';
        const isActive = frame.data.activeIdx === idx;
        html += `
          <div class="c-array-slot">
            <div class="c-array-box ${isActive ? 'active' : ''}" style="${isNull ? 'color:#ef4444;border-color:#ef4444;' : ''}">${ch}</div>
            <div class="c-array-idx" style="${isNull ? 'color:#ef4444;' : ''}">idx ${idx}</div>
          </div>
        `;
      });
      html += '</div>';
      visualization.innerHTML = html;
    } else if (frame.renderType === 'pointer' && frame.data) {
      // Pointer visual representation
      visualization.innerHTML = `
        <div style="display:flex; align-items:center; gap:24px; justify-content:center; flex-wrap:wrap;">
          <div style="background:#0f172a; border:2px solid #0284c7; border-radius:8px; padding:10px 14px; text-align:center;">
            <div style="font-size:10px; color:#38bdf8; font-weight:800;">POINTER ptr (&amp;val)</div>
            <div style="font-size:14px; font-weight:900; color:#ffffff; font-family:ui-monospace,monospace; margin:4px 0;">${frame.data.ptrVal || '0x7ffe4100'}</div>
            <div style="font-size:9px; color:#64748b;">Addr: ${frame.data.ptrAddr} (8B)</div>
          </div>

          <div style="font-size:24px; color:#38bdf8; font-weight:900;">➔</div>

          <div style="background:#0f172a; border:2px solid #10b981; border-radius:8px; padding:10px 14px; text-align:center;">
            <div style="font-size:10px; color:#34d399; font-weight:800;">TARGET val (*ptr)</div>
            <div style="font-size:18px; font-weight:900; color:#34d399; font-family:ui-monospace,monospace; margin:4px 0;">${frame.data.val}</div>
            <div style="font-size:9px; color:#64748b;">Addr: ${frame.data.addr} (4B)</div>
          </div>
        </div>
      `;
    } else {
      // Standard Stack Memory Layout
      const memKeys = Object.keys(frame.memory || {});
      if (!memKeys.length) {
        visualization.innerHTML = '<div class="c-empty-visual" style="color:#64748b;">No variables declared on stack yet. Advance statement to allocate.</div>';
        return;
      }

      let html = '<div class="c-memory-grid">';
      memKeys.forEach(k => {
        const item = frame.memory[k];
        html += `
          <div class="c-mem-cell ${item.active ? 'active-write' : ''}">
            <span class="c-mem-name">${escapeHtml(item.name)}</span>
            <span class="c-mem-type">${item.type} (${item.size}B)</span>
            <span class="c-mem-val">${escapeHtml(String(item.val))}</span>
            <span class="c-mem-addr">${item.addr}</span>
          </div>
        `;
      });
      html += '</div>';
      visualization.innerHTML = html;
    }
  }

  function renderExplanationAndMetrics(frame) {
    if (!frame) return;
    if (operationEl) operationEl.textContent = frame.op || 'Ready.';
    if (whyEl) whyEl.textContent = frame.why || '';
    if (nextExplanationEl) nextExplanationEl.textContent = frame.next || '';
    if (outputTerminal && frame.stdout !== undefined) outputTerminal.textContent = frame.stdout;

    if (metricsEl && frame.metrics) {
      let mHtml = '';
      Object.keys(frame.metrics).forEach(k => {
        mHtml += `<div class="c-metric">${k}: <strong>${escapeHtml(String(frame.metrics[k]))}</strong></div>`;
      });
      metricsEl.innerHTML = mHtml;
    }

    if (stepLabel) stepLabel.textContent = `Step ${currentStep + 1} of ${totalSteps}`;
    if (progressFill) progressFill.style.width = `${((currentStep + 1) / totalSteps) * 100}%`;
  }

  function renderCurrentFrame() {
    if (currentStep < 0) currentStep = 0;
    if (currentStep >= frames.length) currentStep = frames.length - 1;
    const f = frames[currentStep];
    renderCodePanel(f);
    renderVisualStage(f);
    renderExplanationAndMetrics(f);

    // Update pseudocode active line
    if (pseudocodeEl) {
      const items = pseudocodeEl.querySelectorAll('li');
      items.forEach((li, idx) => {
        li.classList.toggle('active', f && f.lineIdx === idx);
      });
    }

    // Post state for Smart Board AI Context
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'EDUVERSE_C_STATE',
        simulationId: currentSimId,
        step: currentStep,
        totalSteps,
        statement: f ? f.source : '',
        memory: f ? f.memory : {},
        stdout: f ? f.stdout : '',
      }, '*');
    }
  }

  // --- Controls & Playback ---
  function nextStep() {
    if (currentStep < totalSteps - 1) {
      currentStep++;
      renderCurrentFrame();
    } else {
      pause();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
      renderCurrentFrame();
    }
  }

  function play() {
    if (isPlaying) return;
    isPlaying = true;
    if (runBtn) runBtn.disabled = true;
    if (pauseBtn) pauseBtn.disabled = false;
    const intervalMs = Math.round(1000 / currentSpeed);
    playInterval = setInterval(() => {
      if (currentStep < totalSteps - 1) {
        nextStep();
      } else {
        pause();
      }
    }, intervalMs);
  }

  function pause() {
    isPlaying = false;
    if (runBtn) runBtn.disabled = false;
    if (pauseBtn) pauseBtn.disabled = true;
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
  }

  function reset() {
    pause();
    currentStep = 0;
    renderCurrentFrame();
    showToast('Simulation reset to initial state.');
  }

  function loadSimulation(simId) {
    currentSimId = simId;
    pause();
    frames = generateFramesForSimulation(simId);
    totalSteps = frames.length;
    currentStep = 0;

    // Update topic tag
    let foundTopic = 'C Programming';
    Object.keys(UNIT_CONFIGS).forEach(u => {
      const s = UNIT_CONFIGS[u].simulations.find(x => x.id === simId);
      if (s) foundTopic = `${s.title} · ${s.topic}`;
    });
    if (topicTag) topicTag.textContent = foundTopic;

    // Update pseudocode for current topic
    if (pseudocodeEl) {
      let codeLines = [];
      if (simId === 'c-execution' || simId === 'c-memory') {
        codeLines = [
          'Allocate stack frame for main()',
          'Evaluate variable initialization expression',
          'Store result at assigned stack offset',
          'Execute syscall printf() to stdout',
        ];
      } else if (simId === 'c-pointers') {
        codeLines = [
          'Declare target variable: int val = 42;',
          'Declare pointer: int *ptr = &val;',
          'Dereference and write: *ptr = 99;',
          'Read updated value from val.',
        ];
      } else if (simId === 'c-searching') {
        codeLines = [
          'mid = (low + high) / 2;',
          'if (arr[mid] == target) return mid;',
          'else if (arr[mid] < target) low = mid + 1;',
          'else high = mid - 1;',
        ];
      } else if (simId === 'c-recursion') {
        codeLines = [
          'if (n <= 1) return 1; // Base case',
          'else return n * fact(n - 1); // Recursive call',
          'Unwind stack multiplying return values.',
        ];
      } else {
        codeLines = [
          'Initialize data structures & pointers',
          'Evaluate condition or operation',
          'Update memory cells & register state',
          'Produce output and advance flow',
        ];
      }
      pseudocodeEl.innerHTML = codeLines.map(l => `<li>${escapeHtml(l)}</li>`).join('');
    }

    // Complexity block
    if (complexityEl) {
      complexityEl.innerHTML = `
        <div class="c-complexity-row"><span>Time Complexity:</span><span>O(1) to O(n)</span></div>
        <div class="c-complexity-row"><span>Stack Overhead:</span><span>Local Frame</span></div>
        <div class="c-complexity-row"><span>Memory Segment:</span><span>Stack / Data Segment</span></div>
      `;
    }

    renderCurrentFrame();
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    if (nextBtn) nextBtn.addEventListener('click', nextStep);
    if (prevBtn) prevBtn.addEventListener('click', prevStep);
    if (runBtn) runBtn.addEventListener('click', play);
    if (pauseBtn) pauseBtn.addEventListener('click', pause);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    if (speedSelect) {
      speedSelect.addEventListener('change', () => {
        currentSpeed = parseFloat(speedSelect.value) || 1;
        if (isPlaying) {
          pause();
          play();
        }
      });
    }

    // Unit selector populates simulation selector
    if (unitSelect) {
      unitSelect.addEventListener('change', () => {
        const u = unitSelect.value;
        const config = UNIT_CONFIGS[u];
        if (!config || !simulationSelect) return;
        simulationSelect.innerHTML = config.simulations
          .map(s => `<option value="${s.id}">${s.icon} ${s.title}</option>`)
          .join('');
        loadSimulation(config.simulations[0].id);
      });
    }

    if (simulationSelect) {
      simulationSelect.addEventListener('change', () => {
        loadSimulation(simulationSelect.value);
      });
    }

    // Preset selector loads code into editor
    if (presetSelect) {
      presetSelect.innerHTML = CODE_PRESETS.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
      presetSelect.addEventListener('change', () => {
        const preset = CODE_PRESETS.find(p => p.id === presetSelect.value);
        if (preset && codeEditor) {
          codeEditor.value = preset.code;
          loadSimulation(preset.simId);
          showToast(`Loaded ${preset.name}`);
        }
      });
    }

    // Compile & Load Code button
    if (compileRunBtn) {
      compileRunBtn.addEventListener('click', () => {
        loadSimulation(currentSimId);
        showToast('Code parsed & loaded into execution engine!');
      });
    }

    if (randomizeBtn) {
      randomizeBtn.addEventListener('click', () => {
        const r1 = Math.floor(Math.random() * 50) + 10;
        const r2 = Math.floor(Math.random() * 50) + 5;
        if (codeEditor) {
          codeEditor.value = `int a = ${r1};\nint b = ${r2};\nint c = a + b;\nprintf("%d", c);`;
          loadSimulation(currentSimId);
          showToast('Generated random test values!');
        }
      });
    }

    if (exampleBtn) {
      exampleBtn.addEventListener('click', () => {
        if (codeEditor) {
          codeEditor.value = CODE_PRESETS[0].code;
          loadSimulation('c-execution');
          showToast('Loaded standard textbook arithmetic example.');
        }
      });
    }

    if (clearOutputBtn && outputTerminal) {
      clearOutputBtn.addEventListener('click', () => {
        outputTerminal.textContent = '';
        showToast('Output terminal cleared.');
      });
    }

    // Fullscreen toggle
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Subject AI Question Handler
    if (askAiBtn) {
      askAiBtn.addEventListener('click', () => {
        const question = (aiQuestionInput && aiQuestionInput.value.trim()) || 'Why did this step execute?';
        const activeFrame = frames[currentStep] || {};

        if (aiAnswerEl) {
          aiAnswerEl.classList.remove('hidden');
          aiAnswerEl.innerHTML = '<em>Thinking with Eduverse Subject RAG...</em>';
        }

        // Post to parent smart board bridge for AI assistant handling
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'EDUVERSE_C_ASK_AI',
            subjectCode: 'U21CS101',
            simulationId: currentSimId,
            question,
            statement: activeFrame.source || '',
            memory: activeFrame.memory || {},
            stdout: activeFrame.stdout || '',
          }, '*');
        }

        // Provide educational immediate answer
        setTimeout(() => {
          if (aiAnswerEl) {
            aiAnswerEl.innerHTML = `
              <strong>Eduverse AI (C Programming Copilot):</strong><br>
              In this step (<code>${escapeHtml(activeFrame.source || '')}</code>), the compiler evaluated the statement:
              <br>• <strong>Effect:</strong> ${escapeHtml(activeFrame.why || '')}
              <br>• <strong>Current Memory:</strong> ${Object.keys(activeFrame.memory || {}).map(k => `${k}=${activeFrame.memory[k].val}`).join(', ') || 'Stack active'}
              <br>• <strong>Output:</strong> ${escapeHtml(activeFrame.stdout || 'None')}
            `;
          }
        }, 700);
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Initializer ---
  function init() {
    // Populate unit 1 simulations by default
    if (unitSelect && simulationSelect) {
      unitSelect.value = 'unit1';
      simulationSelect.innerHTML = UNIT_CONFIGS.unit1.simulations
        .map(s => `<option value="${s.id}">${s.icon} ${s.title}</option>`)
        .join('');
    }

    if (codeEditor) {
      codeEditor.value = CODE_PRESETS[0].code;
    }

    setupEventListeners();

    // Check query params for preset
    const presetParam = params.get('preset') || params.get('simulationId') || 'c-execution';
    loadSimulation(presetParam);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
