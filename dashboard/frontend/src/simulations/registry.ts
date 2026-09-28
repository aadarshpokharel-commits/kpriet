import type { ISimulationDefinition } from './types';
import { resolveSubjectDomain } from './types';

/**
 * Data Structures & Algorithms — ten simulations in one DSA engine.
 * Each appears separately in the DSA subject's Simulations list and opens
 * inside the Smart Board, preset to that simulation (preset key = id).
 */
const DSA_SUBJECT_KEYWORDS = ['data structure', 'algorithm', 'dsa'];

function dsaBoardSimulation(
  id: string,
  dsaCategory: string,
  title: string,
  icon: string,
  shortDescription: string,
  learningObjectives: string[],
  suggestedUnits: number[],
  tags: string[]
): ISimulationDefinition {
  return {
    id,
    dsaCategory,
    subjectKeywords: DSA_SUBJECT_KEYWORDS,
    title,
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures & algorithms',
    icon,
    shortDescription,
    detailedDescription: `${shortDescription} Opens on the Smart Board with step-by-step playback, pseudocode, complexity and the subject AI.`,
    learningObjectives,
    suggestedUnits,
    smartboardPresetKey: id,
    tags: ['DSA', ...tags],
    parameters: [],
    metrics: [],
    engine: {
      createInitialState: () => ({}),
      update: (state) => state,
      render: (ctx, width, height) => {
        ctx.fillStyle = '#f4f8f4';
        ctx.fillRect(0, 0, width, height);
      },
    },
  };
}

export const DSA_BOARD_SIMULATIONS: ISimulationDefinition[] = [
  dsaBoardSimulation('dsa-array', 'array', 'Arrays', '📊', 'Insert, delete and traverse elements with index-by-index steps.',
    ['Trace insertion and deletion shifts', 'Relate index access to O(1) cost'], [1], ['Arrays', 'Traversal']),
  dsaBoardSimulation('dsa-stack', 'stack', 'Stack', '🥞', 'Push, pop and peek with overflow and underflow checks (LIFO).',
    ['Apply LIFO order', 'Recognise overflow and underflow'], [1, 2], ['Stack', 'LIFO']),
  dsaBoardSimulation('dsa-queue', 'queue', 'Queue', '🚶', 'Enqueue and dequeue with front and rear pointers (FIFO).',
    ['Apply FIFO order', 'Track front and rear pointers'], [2], ['Queue', 'FIFO']),
  dsaBoardSimulation('dsa-circular-queue', 'circular-queue', 'Circular Queue', '🔄', 'Circular wrap-around with front and rear pointers in a fixed buffer.',
    ['Explain modular wrap-around', 'Detect full and empty states'], [2], ['Circular Queue']),
  dsaBoardSimulation('dsa-linked-list', 'linked-list', 'Linked List', '🔗', 'Insert at head, tail or position, delete and search nodes.',
    ['Follow pointer changes during insert and delete', 'Compare list and array costs'], [2], ['Linked List', 'Pointers']),
  dsaBoardSimulation('dsa-binary-tree', 'binary-tree', 'Binary Tree', '🌲', 'Level-order insertion with in-order, pre-order and post-order traversals.',
    ['Build a tree level by level', 'Trace the three depth-first traversals'], [3], ['Binary Tree', 'Traversal']),
  dsaBoardSimulation('dsa-bst', 'bst', 'Binary Search Tree', '🌳', 'Insert, search and find minimum / maximum in a BST.',
    ['Apply the BST ordering rule', 'Trace search paths'], [3], ['BST', 'Trees']),
  dsaBoardSimulation('dsa-graph', 'graph', 'Graph Traversal (BFS & DFS)', '🕸️', 'Breadth-first and depth-first traversal over the adjacency list.',
    ['Compare BFS and DFS visiting order', 'Track visited sets and frontier'], [4], ['Graph', 'BFS', 'DFS']),
  dsaBoardSimulation('dsa-searching', 'searching', 'Searching (Linear & Binary)', '🔍', 'Linear search and binary search, with a sorted-input check.',
    ['Compare O(n) and O(log n) search', 'Explain why binary search needs sorted data'], [5], ['Searching', 'Binary Search']),
  dsaBoardSimulation('dsa-sorting', 'sorting', 'Sorting Algorithms', '📶', 'Bubble, Selection, Insertion, Merge and Quick Sort step by step.',
    ['Trace comparisons and swaps', 'Compare sorting complexities'], [5], ['Sorting', 'Merge Sort', 'Quick Sort']),
];

/**
 * Operating Systems — 37 simulations across Units 1–5 in one OS simulation laboratory.
 * Subject: Operating Systems (U21CS403), B.Tech IT, Semester IV.
 * Each appears in the Operating Systems subject's Simulations list and opens
 * inside the Smart Board, preset to that simulation (preset key = id).
 */
const OS_SUBJECT_KEYWORDS = ['operating system', 'operating systems', 'os', 'u21cs403'];

function osBoardSimulation(
  id: string,
  osCategory: string,
  title: string,
  icon: string,
  shortDescription: string,
  learningObjectives: string[],
  suggestedUnits: number[],
  tags: string[]
): ISimulationDefinition {
  return {
    id,
    osCategory,
    subjectKeywords: OS_SUBJECT_KEYWORDS,
    title,
    domain: 'COMPUTER_SCIENCE',
    category: 'operating systems',
    icon,
    shortDescription,
    detailedDescription: `${shortDescription} Opens inside the Smart Board with step-by-step playback, visual state tracing, educational explanations, and Eduverse AI contextual Q&A.`,
    learningObjectives,
    suggestedUnits,
    smartboardPresetKey: id,
    tags: ['Operating Systems', 'OS', ...tags],
    parameters: [],
    metrics: [],
    engine: {
      createInitialState: () => ({}),
      update: (state) => state,
      render: (ctx, width, height) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
      },
    },
  };
}

export const OS_BOARD_SIMULATIONS: ISimulationDefinition[] = [
  // Unit 1 — Process Management
  osBoardSimulation('os-process-states', 'process-states', 'Process State Simulator', '🔄',
    'Simulate New, Ready, Running, Waiting, and Terminated transitions with scheduler dispatch and I/O interrupts.',
    ['Trace 5-state process lifecycle transitions', 'Understand dispatch, interrupt, and I/O wait triggers'], [1], ['Process', 'States', 'Transitions']),
  osBoardSimulation('os-pcb', 'pcb', 'Process Control Block Visualizer', '📋',
    'Inspect PCB data structures including PID, PC, CPU registers, memory limits, and open file tables.',
    ['Understand internal structure of Process Control Block', 'Identify hardware and software context maintained by OS'], [1], ['PCB', 'Process Management']),
  osBoardSimulation('os-process-scheduling', 'scheduling-queues', 'Process Scheduling Visualizer', '🔀',
    'Visualize Job Queue, Ready Queue, and Device Queue handled by Long, Short, and Medium Term Schedulers.',
    ['Differentiate between Long, Short, and Medium-term schedulers', 'Track queue movement through admission, dispatch, and swap'], [1], ['Queues', 'Schedulers']),
  osBoardSimulation('os-context-switching', 'context-switch', 'Context Switching Simulator', '🔁',
    'Animate CPU state saving into PCB1, kernel context switch overhead, and state restoration from PCB2.',
    ['Trace hardware context save and restore cycle', 'Analyze context switch latency and CPU overhead'], [1], ['Context Switch', 'CPU Overhead']),
  osBoardSimulation('os-process-vs-threads', 'threads', 'Process vs Thread Visualizer', '🧵',
    'Compare heavyweight isolated processes against lightweight threads sharing address space, code, and data.',
    ['Contrast process isolation with thread memory sharing', 'Evaluate thread creation speed and communication overhead'], [1], ['Threads', 'Multithreading']),

  // Unit 2 — CPU Scheduling
  osBoardSimulation('os-fcfs', 'fcfs', 'FCFS Scheduling Simulator', '⏱️',
    'First-Come First-Served scheduling with dynamic Gantt chart, turnaround/waiting times, and convoy effect.',
    ['Compute Completion, Turnaround, Waiting, and Response times', 'Observe the convoy effect for long burst processes'], [2], ['FCFS', 'CPU Scheduling']),
  osBoardSimulation('os-sjf', 'sjf', 'SJF Scheduling Simulator', '⚡',
    'Shortest Job First scheduling (preemptive SRTF & non-preemptive) minimizing average waiting time.',
    ['Compare preemptive SRTF with non-preemptive SJF', 'Demonstrate minimum average waiting time optimality'], [2], ['SJF', 'SRTF', 'CPU Scheduling']),
  osBoardSimulation('os-priority', 'priority', 'Priority Scheduling Simulator', '⭐',
    'Priority-based process scheduling with preemptive preemption, starvation demonstration, and aging mitigation.',
    ['Implement priority-driven CPU dispatch', 'Analyze process starvation and aging techniques'], [2], ['Priority', 'Aging', 'Starvation']),
  osBoardSimulation('os-round-robin', 'round-robin', 'Round Robin Scheduling Simulator', '⭕',
    'Time quantum preemption in a circular ready queue with dynamic remaining burst tracking and Gantt chart.',
    ['Trace time-sliced CPU allocation', 'Evaluate impact of quantum length on context switches and response time'], [2], ['Round Robin', 'Time Quantum']),
  osBoardSimulation('os-scheduling-comparison', 'cpu-comparison', 'CPU Scheduling Comparison', '📊',
    'Side-by-side comparative benchmark of FCFS, SJF, Priority, and Round Robin on identical workload sets.',
    ['Compare Gantt charts and average waiting/turnaround times', 'Identify optimal scheduling algorithm for interactive vs batch jobs'], [2], ['Comparison', 'Benchmark']),
  osBoardSimulation('os-gantt-chart', 'gantt-chart', 'Interactive Gantt Chart Generator', '📈',
    'Custom timeline constructor calculating CPU utilization, throughput, waiting time, and completion milestones.',
    ['Construct custom timeline slices interactively', 'Compute exact scheduling criteria formulas dynamically'], [2], ['Gantt Chart', 'Timeline']),

  // Unit 3 — Deadlocks and Memory Management
  osBoardSimulation('os-deadlock', 'deadlock', 'Deadlock Simulator', '🔒',
    'Simulate mutual exclusion, hold and wait, no preemption, and circular wait triggering system deadlocks.',
    ['Identify the four Coffman conditions for deadlock', 'Trace circular resource dependencies causing system freeze'], [3], ['Deadlock', 'Coffman Conditions']),
  osBoardSimulation('os-rag', 'rag', 'Resource Allocation Graph', '🕸️',
    'Construct request and assignment edges between processes and resources with cycle detection.',
    ['Differentiate request edges from assignment edges', 'Detect deadlock cycles in single and multi-instance resource systems'], [3], ['RAG', 'Cycle Detection']),
  osBoardSimulation('os-bankers', 'bankers', "Banker's Algorithm Simulator", '🏦',
    'Deadlock avoidance algorithm verifying safe sequences with Allocation, Max, Need, and Available matrices.',
    ['Calculate Need matrix from Max and Allocation', 'Determine system safety and construct safe process sequences'], [3], ["Banker's Algorithm", 'Safe Sequence', 'Deadlock Avoidance']),
  osBoardSimulation('os-first-fit', 'first-fit', 'First Fit Memory Allocation', '1️⃣',
    'Contiguous partition allocation placing arriving jobs into the first sufficiently sized memory block.',
    ['Trace fast linear block search', 'Analyze internal and external fragmentation created by First Fit'], [3], ['First Fit', 'Memory Allocation']),
  osBoardSimulation('os-best-fit', 'best-fit', 'Best Fit Memory Allocation', '🎯',
    'Allocates the smallest free block that is large enough, minimizing leftover unallocated fragment.',
    ['Search entire memory map for closest size match', 'Observe accumulation of tiny unusable external fragments'], [3], ['Best Fit', 'Contiguous Allocation']),
  osBoardSimulation('os-worst-fit', 'worst-fit', 'Worst Fit Memory Allocation', '📦',
    'Allocates the largest available partition to leave the largest remaining free fragment for subsequent jobs.',
    ['Allocate largest free block available', 'Evaluate whether residual fragments are large enough for reuse'], [3], ['Worst Fit', 'Partitioning']),
  osBoardSimulation('os-fragmentation', 'fragmentation', 'Memory Fragmentation Visualizer', '🧩',
    'Visualize internal vs external memory fragmentation with dynamic compaction and partition coalescing.',
    ['Distinguish internal from external fragmentation', 'Simulate memory compaction and dynamic relocation'], [3], ['Fragmentation', 'Compaction']),

  // Unit 4 — Memory Management (Paging & Virtual Memory)
  osBoardSimulation('os-paging', 'paging', 'Paging Visualizer', '📑',
    'Divide physical memory into fixed frames and logical memory into pages to eliminate external fragmentation.',
    ['Understand page frame mapping', 'Demonstrate non-contiguous physical allocation of contiguous logical address space'], [4], ['Paging', 'Frames', 'Pages']),
  osBoardSimulation('os-page-table', 'page-table', 'Page Table Simulator', '🗂️',
    'Simulate page table lookups with frame base address, valid-invalid bit flags, and access permissions.',
    ['Inspect page-to-frame translation entries', 'Understand page validity flags and access violation traps'], [4], ['Page Table', 'Frames']),
  osBoardSimulation('os-address-translation', 'address-translation', 'Logical-to-Physical Address Translation', '🔢',
    'Break binary logical addresses into page number (p) and offset (d) to compute physical frame addresses (f*d).',
    ['Compute page number and offset from address bit widths', 'Calculate exact physical memory byte address from page table entries'], [4], ['Address Translation', 'Offset']),
  osBoardSimulation('os-page-fault', 'page-fault', 'Page Fault Simulator', '⚠️',
    'Animate page fault service routine: trap, OS disk swap, frame allocation, page table update, and restart.',
    ['Trace six-step page fault handling sequence', 'Understand hardware-software interaction during page swaps'], [4], ['Page Fault', 'Trap', 'Disk I/O']),
  osBoardSimulation('os-virtual-memory', 'virtual-memory', 'Virtual Memory Visualizer', '🌌',
    'Visualize demand paging, backing store swap space, and execution of programs exceeding physical RAM.',
    ['Understand demand paging concept and benefits', 'Analyze memory over-allocation and working set behavior'], [4], ['Virtual Memory', 'Demand Paging']),
  osBoardSimulation('os-fifo-replacement', 'fifo-replacement', 'FIFO Page Replacement', '1️⃣',
    'First-In First-Out page replacement algorithm tracking frame queue, page hits, faults, and Belady anomaly.',
    ['Trace FIFO replacement on reference strings', 'Demonstrate Belady anomaly where additional frames increase faults'], [4], ['FIFO', 'Page Replacement', 'Belady Anomaly']),
  osBoardSimulation('os-lru-replacement', 'lru-replacement', 'LRU Page Replacement', '⏱️',
    'Least Recently Used page replacement algorithm using reference time tracking and stack replacement order.',
    ['Implement LRU stack and counter tracking', 'Observe zero susceptibility to Belady anomaly'], [4], ['LRU', 'Page Replacement']),
  osBoardSimulation('os-optimal-replacement', 'optimal-replacement', 'Optimal Page Replacement', '🔮',
    'Optimal (OPT / MIN) page replacement replacing the page that will not be used for the longest future period.',
    ['Analyze theoretical minimum page fault benchmark', 'Evaluate lookahead replacement strategy'], [4], ['Optimal', 'OPT', 'Page Replacement']),
  osBoardSimulation('os-page-replacement-comparison', 'replacement-comparison', 'Page Replacement Comparison', '📊',
    'Side-by-side benchmark comparing FIFO, LRU, and Optimal on identical reference strings and frame capacities.',
    ['Compare hit ratios and fault curves across algorithms', 'Evaluate trade-offs between hardware cost and miss penalties'], [4], ['Page Replacement', 'Benchmark']),

  // Unit 5 — File and Disk Management
  osBoardSimulation('os-file-allocation', 'file-allocation', 'File Allocation Visualizer', '📁',
    'Compare Contiguous, Linked, and Indexed file allocation methods on disk sectors with speed and storage metrics.',
    ['Compare disk space utilization across allocation schemes', 'Analyze sequential vs direct access capabilities'], [5], ['File System', 'File Allocation']),
  osBoardSimulation('os-contiguous-allocation', 'contiguous-allocation', 'Contiguous Allocation Simulator', '🧱',
    'Allocate files as continuous contiguous disk blocks with start block and length in directory entries.',
    ['Trace sequential contiguous disk layout', 'Understand external fragmentation and file growth limitations'], [5], ['Contiguous Allocation', 'Disk Blocks']),
  osBoardSimulation('os-linked-allocation', 'linked-allocation', 'Linked Allocation Simulator', '🔗',
    'Non-contiguous block allocation where each disk sector maintains a forward pointer to the next block.',
    ['Trace pointer-linked disk sector chains', 'Analyze overhead of pointer storage and slow random access'], [5], ['Linked Allocation', 'FAT']),
  osBoardSimulation('os-indexed-allocation', 'indexed-allocation', 'Indexed Allocation Simulator', '📑',
    'Store block pointers in dedicated index blocks supporting direct random access without external fragmentation.',
    ['Trace single and multi-level index block pointers', 'Evaluate direct file access performance and index overhead'], [5], ['Indexed Allocation', 'Index Block']),
  osBoardSimulation('os-disk-scheduling', 'disk-scheduling', 'Disk Scheduling Simulator', '💽',
    'Interactive cylinder visualizer simulating head seek travel across track request queues.',
    ['Visualize physical magnetic disk platter and arm movement', 'Calculate total head movement and average seek time'], [5], ['Disk Scheduling', 'Seek Time']),
  osBoardSimulation('os-disk-fcfs', 'disk-fcfs', 'FCFS Disk Scheduling', '➡️',
    'First-Come First-Served disk track access servicing requests in their exact arrival sequence.',
    ['Trace sequential track-by-track arm travel', 'Observe head wild swings across platter tracks'], [5], ['FCFS', 'Disk Scheduling']),
  osBoardSimulation('os-disk-sstf', 'disk-sstf', 'SSTF Disk Scheduling', '🎯',
    'Shortest Seek Time First disk head scheduling picking the closest track to current head location.',
    ['Select requests with minimum seek latency', 'Understand starvation risks for distant track requests'], [5], ['SSTF', 'Seek Time']),
  osBoardSimulation('os-disk-scan', 'disk-scan', 'SCAN Disk Scheduling', '🛗',
    'Elevator algorithm sweeping arm from current track to disk boundary servicing requests before reversing.',
    ['Trace directional sweep across cylinder requests', 'Demonstrate boundary reversal mechanics'], [5], ['SCAN', 'Elevator Algorithm']),
  osBoardSimulation('os-disk-cscan', 'disk-cscan', 'C-SCAN Disk Scheduling', '🔄',
    'Circular SCAN servicing requests in one forward direction only, then immediately returning to start without service.',
    ['Trace unidirectional sweep with fast return leap', 'Explain uniform wait time distribution across all tracks'], [5], ['C-SCAN', 'Circular SCAN']),
  osBoardSimulation('os-disk-comparison', 'disk-comparison', 'Disk Scheduling Comparison', '📊',
    'Side-by-side benchmark comparing FCFS, SSTF, SCAN, and C-SCAN on identical track request sequences.',
    ['Compare total head movements and average seek distances', 'Identify optimal disk scheduling policies for batch and interactive workloads'], [5], ['Disk Scheduling', 'Benchmark'])
];

/**
 * Problem Solving and C Programming (U21CS101 / U21CSG01) — 16 simulations across Units 1–5.
 * Features the flagship C Program Execution + Memory Visualization engine.
 * Opens inside the Smart Board (engine: /smartboard/c-simulation.html).
 */
const C_SUBJECT_KEYWORDS = ['problem solving and c', 'problem solving', 'c programming', 'c program', 'u21cs101', 'u21csg01'];

function cBoardSimulation(
  id: string,
  cCategory: string,
  title: string,
  icon: string,
  shortDescription: string,
  learningObjectives: string[],
  suggestedUnits: number[],
  tags: string[]
): ISimulationDefinition {
  return {
    id,
    cCategory,
    subjectKeywords: C_SUBJECT_KEYWORDS,
    title,
    domain: 'COMPUTER_SCIENCE',
    category: 'c programming',
    icon,
    shortDescription,
    detailedDescription: `${shortDescription} Opens inside the Smart Board with line-by-line source execution, visual stack memory layout, stdout console, and Eduverse Subject AI contextual doubt solver.`,
    learningObjectives,
    suggestedUnits,
    smartboardPresetKey: id,
    tags: ['C Programming', 'Problem Solving', ...tags],
    parameters: [],
    metrics: [],
    engine: {
      createInitialState: () => ({}),
      update: (state) => state,
      render: (ctx, width, height) => {
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, 0, width, height);
      },
    },
  };
}

export const C_BOARD_SIMULATIONS: ISimulationDefinition[] = [
  // Unit 1 — Problem Solving & C Basics
  cBoardSimulation('c-execution', 'execution', 'C Program Execution Visualizer (Flagship)', '⚡',
    'Execute C source code statement-by-statement with active line highlighting, live stack memory allocation, and real-time output terminal.',
    ['Trace source code compilation and line-by-line execution', 'Visualize variable declarations, stack allocations, and stdout updates'], [1], ['Flagship', 'Execution', 'Compiler', 'Memory']),
  cBoardSimulation('c-memory', 'memory', 'Variable & Memory Visualizer', '🧠',
    'Visualize data types (char, int, float, double), byte sizes, stack frame growth, and hexadecimal addresses (0x7ffe...).',
    ['Understand memory word sizes and data type widths', 'Relate variable identifiers to physical RAM addresses and stack offsets'], [1], ['Variables', 'Data Types', 'Memory Stack', 'Addresses']),
  cBoardSimulation('c-number-systems', 'number-systems', 'Number System Simulator', '🔢',
    'Interactive converter between Decimal, Binary, Octal, and Hexadecimal with step-by-step division, remainder extraction, and bitwise layout.',
    ['Convert decimal numbers to binary, octal, and hex with remainder trace', 'Group 4-bit nibbles for hexadecimal translation'], [1], ['Number Systems', 'Binary', 'Hexadecimal', 'Bits']),
  cBoardSimulation('c-flowchart', 'flowchart', 'Algorithm & Flowchart Builder', '🔄',
    'Construct and step through standard algorithms with Sequence, Decision Diamonds, Loops, and animated active path flow.',
    ['Follow structured algorithm flow from Start to End terminals', 'Trace decision diamond true/false branching'], [1], ['Algorithm', 'Flowchart', 'Logic', 'Control Flow']),

  // Unit 2 — Control Structures & Arrays
  cBoardSimulation('c-if-else', 'if-else', 'If-Else Execution Simulator', '🔀',
    'Simulate relational conditions, boolean true/false evaluation, branch routing, and dead-code skipping.',
    ['Evaluate condition expressions with relational and logical operators', 'Trace conditional branching into if-body vs else-body'], [2], ['If-Else', 'Branching', 'Conditions', 'Decision Making']),
  cBoardSimulation('c-loops', 'loops', 'Loop Visualizer (for / while / do-while)', '🔁',
    'Trace loop initialization, condition testing, body iteration, and loop counter updates with boundary checks.',
    ['Contrast pre-test (for/while) with post-test (do-while) loops', 'Track accumulator variables and iteration counters'], [2], ['Loops', 'Iteration', 'For', 'While']),
  cBoardSimulation('c-arrays', 'arrays', 'Array Visualizer (1D & 2D)', '📊',
    'Inspect 1D arrays and 2D matrices with zero-based index access, contiguous memory offsets, and element mutations.',
    ['Calculate element memory address via Base + (index * sizeof(T))', 'Trace row-major order storage for 2D matrices'], [2], ['Arrays', '1D Array', '2D Array', 'Indexing']),
  cBoardSimulation('c-searching', 'searching', 'Searching Visualizer (Linear & Binary)', '🔍',
    'Step through Linear Search and Binary Search with active key comparisons, low/mid/high pointers, and comparison counters.',
    ['Compare O(n) linear scanning against O(log n) divide-and-conquer binary search', 'Observe midpoint calculation and range elimination'], [2], ['Searching', 'Binary Search', 'Linear Search']),
  cBoardSimulation('c-sorting', 'sorting', 'Sorting Visualizer (Bubble, Selection, Insertion)', '📶',
    'Visualize element comparisons, in-place swaps, pass milestones, and sorted partition boundaries.',
    ['Trace adjacent comparisons and bubbling of maximum elements', 'Analyze comparison counts and swap overheads'], [2], ['Sorting', 'Bubble Sort', 'Selection Sort']),

  // Unit 3 — Pointers & Strings
  cBoardSimulation('c-pointers', 'pointers', 'Pointer Visualizer', '📍',
    'Visualize variables, address-of operator (&), pointer variables (*ptr), dereferencing, and pointer arithmetic (+4 bytes).',
    ['Understand memory addresses stored in pointer variables', 'Trace dereference reads and indirect memory mutations'], [3], ['Pointers', 'Addresses', 'Dereferencing', 'Memory']),
  cBoardSimulation('c-pass-by-value-ref', 'pass-by-value-ref', 'Pass-by-Value vs Pass-by-Reference', '⚖️',
    'Side-by-side stack frame comparison of function parameter passing: isolated value copies vs direct caller memory mutation via pointers.',
    ['Contrast caller stack frame isolation with pointer dereferencing', 'Observe why swap(a, b) fails without pointers while swap(&a, &b) succeeds'], [3], ['Functions', 'Pointers', 'Pass by Value', 'Pass by Reference']),
  cBoardSimulation('c-strings', 'strings', 'String Visualizer & Operations', '🔤',
    'Inspect character arrays with index markers, explicit null character sentinel (\\0), and string functions (strlen, strcpy).',
    ['Understand null-terminated character array representation in C', 'Trace string traversal stopping conditions at byte 0x00'], [3], ['Strings', 'Char Array', 'Null Terminator', 'strlen']),

  // Unit 4 — Functions & Recursion
  cBoardSimulation('c-call-stack', 'call-stack', 'Function Call / Call Stack Visualizer', '🥞',
    'Simulate function invocation, parameter passing, activation records, local variables, return values, and stack frame push/pop.',
    ['Trace stack memory growth and shrink during nested function calls', 'Understand automatic local variable deallocation upon return'], [4], ['Functions', 'Call Stack', 'Stack Frames', 'Activation Record']),
  cBoardSimulation('c-recursion', 'recursion', 'Recursion Visualizer', '🌲',
    'Trace recursive function call tree expansion, base condition verification, and return value unwinding (Factorial / Fibonacci).',
    ['Identify base cases preventing infinite recursion and stack overflow', 'Trace return value propagation back through the call chain'], [4], ['Recursion', 'Base Case', 'Stack Tree', 'Factorial']),

  // Unit 5 — Structures, Unions & Files
  cBoardSimulation('c-structures-unions', 'structures-unions', 'Structure & Union Visualizer', '📦',
    'Compare struct contiguous member memory layout against union overlapping shared memory with member overwriting.',
    ['Calculate struct memory size as sum of member sizes plus alignment padding', 'Demonstrate union shared memory where members share the base address'], [5], ['Structures', 'Unions', 'Memory Layout', 'Padding']),
  cBoardSimulation('c-file-io', 'file-io', 'File Processing Simulator', '📁',
    'Simulate file stream operations: fopen (modes r/w/a), fputs, fread, fseek, file position indicators, and fclose.',
    ['Understand FILE pointer structures and stream buffering', 'Trace file offset advancement and EOF (End of File) detection'], [5], ['File I/O', 'fopen', 'fclose', 'Streams', 'File Pointer'])
];

/**
 * Computer Networks (U21CSG05) — 35 simulations organised Unit → Topic.
 * Each runs inside the Smart Board (engine: /smartboard/cn-simulation.html).
 * Keep in sync with smart-board-my-version/src/tools/cn-catalog.js.
 */
const CN_SUBJECT_KEYWORDS = ['computer network', 'data communication', 'internetwork'];

function cnBoardSimulation(id: string, unit: number, unitTitle: string, topic: string, title: string, icon: string, shortDescription: string): ISimulationDefinition {
  return {
    id,
    boardEngine: 'cn',
    unit,
    unitTitle,
    topic,
    subjectKeywords: CN_SUBJECT_KEYWORDS,
    title,
    domain: 'COMPUTER_SCIENCE',
    category: 'networking',
    icon,
    shortDescription,
    detailedDescription: `${shortDescription} Interactive, step by step, with Basic and Advanced views — opens inside the Smart Board.`,
    learningObjectives: [`Explain ${topic} step by step`, 'Relate each step to the protocol state and the reason it happens'],
    suggestedUnits: [unit],
    smartboardPresetKey: id,
    tags: ['Computer Networks', topic],
    parameters: [],
    metrics: [],
    engine: {
      createInitialState: () => ({}),
      update: (state) => state,
      render: (ctx, width, height) => {
        ctx.fillStyle = '#f4f8f4';
        ctx.fillRect(0, 0, width, height);
      },
    },
  };
}

/**
 * Engineering Physics (U21PH101) — 46 simulations organised Unit → Topic.
 * Each runs inside the Smart Board (engine: /smartboard/ep-simulation.html).
 * Keep in sync with smart-board-my-version/src/tools/ep-catalog.js.
 */
const EP_SUBJECT_KEYWORDS = ['engineering physics', 'u21ph101'];

function epBoardSimulation(id: string, unit: number, unitTitle: string, subtype: string, topic: string, title: string, icon: string, shortDescription: string): ISimulationDefinition {
  return {
    id,
    boardEngine: 'ep',
    simulationSubtype: subtype,
    unit,
    unitTitle,
    topic,
    subjectKeywords: EP_SUBJECT_KEYWORDS,
    title,
    domain: 'PHYSICS',
    category: 'engineering physics',
    icon,
    shortDescription,
    detailedDescription: `${shortDescription} Interactive and step by step, with formulas, calculations and explanations — opens inside the Smart Board.`,
    learningObjectives: [`Explain ${topic} step by step`, 'Relate the picture to the formula and see how each parameter changes the result'],
    suggestedUnits: [unit],
    smartboardPresetKey: id,
    tags: ['Engineering Physics', unitTitle, topic],
    parameters: [],
    metrics: [],
    engine: {
      createInitialState: () => ({}),
      update: (state) => state,
      render: (ctx, width, height) => {
        ctx.fillStyle = '#f4f8f4';
        ctx.fillRect(0, 0, width, height);
      },
    },
  };
}

/**
 * Engineering Graphics (U21ME101) — 11 simulations organised Unit → Topic, with the
 * 3D Object → Projection Generator as the flagship. Each runs inside the Smart Board
 * (engine: /smartboard/eg-simulation.html). Keep in sync with smart-board-my-version/src/tools/eg-catalog.js.
 */
const EG_SUBJECT_KEYWORDS = ['engineering graphics', 'u21me101', 'u21meg01'];

function egBoardSimulation(id: string, unit: number, unitTitle: string, subtype: string, topic: string, title: string, icon: string, shortDescription: string): ISimulationDefinition {
  return {
    id,
    boardEngine: 'eg',
    simulationSubtype: subtype,
    unit,
    unitTitle,
    topic,
    subjectKeywords: EG_SUBJECT_KEYWORDS,
    title,
    domain: 'COMPUTER_SCIENCE',
    category: 'engineering graphics',
    icon,
    shortDescription,
    detailedDescription: `${shortDescription} Interactive 2D/3D, step by step, with projection lines and BIS conventions — opens inside the Smart Board.`,
    learningObjectives: [`Construct and read ${topic} step by step`, 'Connect the 3-D object with its 2-D engineering drawing'],
    suggestedUnits: [unit],
    smartboardPresetKey: id,
    tags: ['Engineering Graphics', unitTitle, topic],
    parameters: [],
    metrics: [],
    engine: {
      createInitialState: () => ({}),
      update: (state) => state,
      render: (ctx, width, height) => {
        ctx.fillStyle = '#f4f8f4';
        ctx.fillRect(0, 0, width, height);
      },
    },
  };
}

/**
 * Engineering Mathematics (U21MA101 · Calculus and Differential Equations) — 29 simulations organised
 * Unit → Topic on reusable engines (matrix, multivariable, integration, vector-calculus and ODE kernels).
 * Each runs inside the Smart Board (engine: /smartboard/ma-simulation.html).
 * Keep in sync with smart-board-my-version/src/tools/ma-catalog.js.
 */
const MA_SUBJECT_KEYWORDS = ['engineering mathematics', 'u21ma101', 'calculus and differential equations'];

function maBoardSimulation(id: string, unit: number, unitTitle: string, subtype: string, topic: string, title: string, icon: string, shortDescription: string): ISimulationDefinition {
  return {
    id,
    boardEngine: 'ma',
    simulationSubtype: subtype,
    unit,
    unitTitle,
    topic,
    subjectKeywords: MA_SUBJECT_KEYWORDS,
    title,
    domain: 'MATHEMATICS',
    category: 'engineering mathematics',
    icon,
    shortDescription,
    detailedDescription: `${shortDescription} Real calculations with step-by-step working, formulas and 2D/3D visualisation — opens inside the Smart Board.`,
    learningObjectives: [`Work through ${topic} step by step`, 'Connect every formula with its numerical result and graph'],
    suggestedUnits: [unit],
    smartboardPresetKey: id,
    tags: ['Engineering Mathematics', unitTitle, topic],
    parameters: [],
    metrics: [],
    engine: {
      createInitialState: () => ({}),
      update: (state) => state,
      render: (ctx, width, height) => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);
      },
    },
  };
}

export const MA_BOARD_SIMULATIONS: ISimulationDefinition[] = [
  maBoardSimulation("ma-matrix-ops", 1, "Matrices", "matrices", "Matrix Operations", "Matrix Operations Visualizer", "🧮", "Addition, subtraction, scalar multiple, product and transpose — every entry calculated step by step."),
  maBoardSimulation("ma-eigen", 1, "Matrices", "matrices", "Eigenvalues & Eigenvectors", "Eigenvalue & Eigenvector Visualizer", "⭐", "Flagship: Matrix → det(A − λI) = 0 → eigenvalues → eigenvectors → see which vectors keep their direction."),
  maBoardSimulation("ma-cayley-hamilton", 1, "Matrices", "matrices", "Cayley-Hamilton", "Cayley-Hamilton Theorem Simulator", "🔁", "Characteristic polynomial, substitute A, verify p(A) = 0 and use it to find A⁻¹."),
  maBoardSimulation("ma-diagonalization", 1, "Matrices", "matrices", "Diagonalization", "Matrix Diagonalization", "🔳", "Eigenvalues, eigenvectors, modal matrix P, D = P⁻¹AP (or orthogonal Pᵀ A P) and verification."),
  maBoardSimulation("ma-orthogonal", 1, "Matrices", "matrices", "Orthogonal Transformation", "Orthogonal Transformation", "🔄", "Rotations/reflections preserve lengths and angles; reduce a quadratic form to canonical form."),
  maBoardSimulation("ma-matrix-applications", 1, "Matrices", "matrices", "Applications", "Matrix Applications", "🧩", "Linear systems, network flow and population models: input → matrix form → calculation → result."),
  maBoardSimulation("ma-partial", 2, "Functions of Several Variables", "several-variables", "Partial Derivatives", "Partial Derivative Visualizer", "∂", "Freeze y and vary x (and vice versa): slices of the surface, fₓ, f_y and higher partial derivatives."),
  maBoardSimulation("ma-total-derivative", 2, "Functions of Several Variables", "several-variables", "Total Derivative", "Total Derivative Simulator", "🔗", "du/dt = u_x dx/dt + u_y dy/dt — each component calculated and compared with direct substitution."),
  maBoardSimulation("ma-jacobian", 2, "Functions of Several Variables", "several-variables", "Jacobians", "Jacobian Visualizer", "🧭", "Partial derivatives → Jacobian matrix → determinant, and how a small square is mapped."),
  maBoardSimulation("ma-taylor2", 2, "Functions of Several Variables", "several-variables", "Taylor Series", "Taylor Series for Two Variables", "⭐", "Flagship: f(x,y) about (a,b): derivatives, terms, polynomial of order 1–4 and the approximation error."),
  maBoardSimulation("ma-extrema", 2, "Functions of Several Variables", "several-variables", "Extreme Values", "Extreme Values of Two Variables", "⭐", "Flagship: fₓ = f_y = 0 → critical points → rt − s² test → maximum, minimum or saddle, on contour and 3-D views."),
  maBoardSimulation("ma-lagrange", 2, "Functions of Several Variables", "several-variables", "Lagrange Multipliers", "Lagrange Multipliers", "⭐", "Flagship: Objective and constraint → ∇f = λ∇g → candidate points highlighted where level curves touch the constraint."),
  maBoardSimulation("ma-double-integral", 3, "Multiple Integrals", "multiple-integrals", "Double Integrals", "Double Integral Visualizer", "∬", "Region, inner and outer integration step by step, and the volume under the surface."),
  maBoardSimulation("ma-change-order", 3, "Multiple Integrals", "multiple-integrals", "Change of Order", "Change of Order of Integration", "⭐", "Flagship: Plot the region, find the boundary curves, slice the other way and read the new limits."),
  maBoardSimulation("ma-triple-integral", 3, "Multiple Integrals", "multiple-integrals", "Triple Integrals", "Triple Integral Visualizer", "∭", "Inner, middle and outer integration over a 3-D region, with the region drawn in 3-D."),
  maBoardSimulation("ma-area", 3, "Multiple Integrals", "multiple-integrals", "Area", "Area Using Double Integral", "📐", "Area between two curves: intersections, limits and strips building up the area."),
  maBoardSimulation("ma-volume", 3, "Multiple Integrals", "multiple-integrals", "Volume", "Volume Using Triple Integral", "🧊", "Volume of a solid bounded by surfaces — limits, slices and the accumulated volume."),
  maBoardSimulation("ma-line-integral", 4, "Line and Surface Integrals", "vector-calculus", "Line Integral", "Line Integral Visualizer", "〰️", "∫_C F·dr along a parametrised path: direction, F·r′(t) and the running accumulation."),
  maBoardSimulation("ma-surface-integral", 4, "Line and Surface Integrals", "vector-calculus", "Surface Integral", "Surface Integral Visualizer", "🌐", "Surface, normal vectors and flux ∬ F·n dS computed through a parametrisation."),
  maBoardSimulation("ma-green", 4, "Line and Surface Integrals", "vector-calculus", "Green's Theorem", "Green's Theorem Simulator", "⭐", "Flagship: ∮ P dx + Q dy = ∬ (Q_x − P_y) dA — both sides computed and compared."),
  maBoardSimulation("ma-stokes", 4, "Line and Surface Integrals", "vector-calculus", "Stokes' Theorem", "Stokes' Theorem Simulator", "🌀", "∮ F·dr around the boundary = ∬ (∇×F)·n dS over the surface, in 3-D."),
  maBoardSimulation("ma-gauss", 4, "Line and Surface Integrals", "vector-calculus", "Gauss Divergence Theorem", "Gauss Divergence Theorem Simulator", "📦", "∯ F·n dS through a closed surface = ∭ ∇·F dV — outward normals and both sides compared."),
  maBoardSimulation("ma-ode2", 5, "Ordinary Differential Equations", "ode", "Second-Order ODE", "Second-Order ODE Solver", "⭐", "Flagship: a y″ + b y′ + c y = f(x): auxiliary equation, CF, PI, initial conditions and the solution curve."),
  maBoardSimulation("ma-ode-higher", 5, "Ordinary Differential Equations", "ode", "Higher-Order ODE", "Higher-Order ODE Solver", "📈", "Linear constant-coefficient ODEs up to order 6: characteristic equation, roots and the general solution."),
  maBoardSimulation("ma-ode-constant", 5, "Ordinary Differential Equations", "ode", "Constant Coefficient ODE", "Constant Coefficient ODE Simulator", "🎚️", "All root cases (distinct, repeated, complex) with sliders — see the solution curve change live."),
  maBoardSimulation("ma-ode-variable", 5, "Ordinary Differential Equations", "ode", "Variable Coefficient ODE", "Variable Coefficient ODE Simulator", "🔧", "Equations reducible to constant coefficients (x = eᶻ, Legendre linear) and a known-solution reduction of order."),
  maBoardSimulation("ma-euler-cauchy", 5, "Ordinary Differential Equations", "ode", "Euler-Cauchy Equation", "Euler-Cauchy Equation Simulator", "📐", "x²y″ + a x y′ + b y = f(x): substitution x = eᶻ, auxiliary equation, roots and solution curve."),
  maBoardSimulation("ma-legendre", 5, "Ordinary Differential Equations", "ode", "Legendre's Equation", "Legendre's Equation Simulator", "📜", "(ax+b)²y″ + … : substitution ax + b = eᶻ, reduced equation and solution; Legendre polynomials Pₙ(x)."),
  maBoardSimulation("ma-variation-params", 5, "Ordinary Differential Equations", "ode", "Variation of Parameters", "Variation of Parameters Simulator", "🧷", "y₁, y₂, Wronskian, u₁ = −∫y₂f/W, u₂ = ∫y₁f/W, particular solution and the final curve."),
];

export const EG_BOARD_SIMULATIONS: ISimulationDefinition[] = [
  egBoardSimulation("eg-projection-generator", 4, "Solids, Sections and Development", "projection-generator", "3D Object → Projection", "3D Object → Projection Generator", "🧊", "Flagship: pick a solid, rotate it, choose a view and watch the front, top and side views generate with projection lines."),
  egBoardSimulation("eg-projection-solids", 4, "Solids, Sections and Development", "projection-of-solids", "Projection of Solids", "Projection of Solids", "🔷", "Prism, pyramid, cylinder and cone — axis perpendicular, inclined to HP, inclined to VP — views drawn stage by stage."),
  egBoardSimulation("eg-section-solids", 4, "Solids, Sections and Development", "section-of-solids", "Section of Solids", "Section of Solids", "🔪", "Move a cutting plane through a solid: sectional front/top/side views, hatched section and its true shape."),
  egBoardSimulation("eg-development", 4, "Solids, Sections and Development", "development-of-surfaces", "Development of Surfaces", "Development of Surfaces", "📜", "Unfold prisms, pyramids, cylinders and cones — including truncated solids — with the key dimensions."),
  egBoardSimulation("eg-geometric-construction", 1, "Drawing Basics & Geometrical Construction", "geometric-construction", "Geometrical Construction", "Geometrical Construction", "📐", "Bisectors, angles, regular polygons, circles and tangents — compass-and-ruler steps with snapping."),
  egBoardSimulation("eg-dimensioning", 1, "Drawing Basics & Geometrical Construction", "dimensioning", "Dimensioning", "Dimensioning Simulator", "📏", "Linear, angular, radial and diameter dimensions with extension lines, arrowheads and BIS notation."),
  egBoardSimulation("eg-drawing-workspace", 1, "Drawing Basics & Geometrical Construction", "drawing-workspace", "Drawing Workspace", "3D Engineering Drawing Workspace", "✏️", "Draw lines, circles, arcs and polygons with snapping; select, move, rotate, dimension, generate views and export."),
  egBoardSimulation("eg-orthographic", 3, "Projection of Points, Lines and Planes", "orthographic-projection", "Orthographic Projection", "Orthographic Projection", "📐", "Front, top and side views of points, lines and planes with reference planes and projectors in all quadrants."),
  egBoardSimulation("eg-isometric", 5, "Orthographic, Isometric and Perspective Projection", "isometric-projection", "Isometric Projection", "Isometric Projection", "🧱", "Orthographic views → isometric object and back, isometric axes, isometric scale and projection guides."),
  egBoardSimulation("eg-sectional-view", 5, "Orthographic, Isometric and Perspective Projection", "sectional-view", "Sectional Views", "Sectional View Simulator", "🧩", "Cut a machine component with a movable plane — full/half section, hatched areas and sectional views."),
  egBoardSimulation("eg-perspective", 5, "Orthographic, Isometric and Perspective Projection", "perspective-projection", "Perspective Projection", "Perspective Projection", "🛤️", "Station point, picture plane, ground line, horizon, vanishing points and visual rays — step by step."),
];

export const EP_BOARD_SIMULATIONS: ISimulationDefinition[] = [
  epBoardSimulation("ep-absorption", 1, "LASER", "laser", "Absorption", "Absorption and Energy Level Simulator", "⬆️", "A photon whose energy matches E₂ − E₁ lifts an atom to the excited level; other photons pass through."),
  epBoardSimulation("ep-spontaneous-emission", 1, "LASER", "laser", "Spontaneous Emission", "Spontaneous Emission Simulator", "✨", "Excited atoms decay on their own after a random time and emit photons in random directions and phases."),
  epBoardSimulation("ep-stimulated-emission", 1, "LASER", "laser", "Stimulated Emission", "Stimulated Emission Simulator", "🔆", "An incoming photon triggers an excited atom to emit an identical photon — same energy, direction and phase."),
  epBoardSimulation("ep-population-inversion", 1, "LASER", "laser", "Population Inversion", "Population Inversion Visualizer", "📊", "Compare level populations in thermal equilibrium (Boltzmann) with an inverted, pumped medium."),
  epBoardSimulation("ep-pumping", 1, "LASER", "laser", "Pumping", "Laser Pumping Simulator", "⚡", "Optical, electrical and chemical pumping in a three-level and four-level scheme, with pump rate against threshold."),
  epBoardSimulation("ep-laser-cavity", 1, "LASER", "laser", "Laser Cavity", "Laser Cavity Simulator", "🪞", "Light bounces between two mirrors, is amplified on every pass and part of it leaves through the output coupler."),
  epBoardSimulation("ep-co2-laser", 1, "LASER", "laser", "CO₂ Laser", "CO₂ Laser Conceptual Simulator", "🟥", "N₂ is excited by the discharge and transfers energy to CO₂; the 10.6 µm transition produces the infrared beam."),
  epBoardSimulation("ep-semiconductor-laser", 1, "LASER", "laser", "Semiconductor Laser", "Semiconductor Laser Simulator", "🔴", "Forward-biased p–n junction: electron–hole recombination, threshold current and the emitted wavelength λ = hc/Eg."),
  epBoardSimulation("ep-material-processing", 1, "LASER", "laser", "Laser Material Processing", "Laser Material Processing Simulator", "🛠️", "Cutting, welding and drilling — how power, spot size and scan speed set the intensity and the heat delivered."),
  epBoardSimulation("ep-sls", 1, "LASER", "laser", "Selective Laser Sintering", "Selective Laser Sintering Simulator", "🧱", "Layer by layer: spread powder, scan the cross-section with the laser, lower the platform and repeat."),
  epBoardSimulation("ep-holography", 1, "LASER", "laser", "Holography", "Holography Simulator", "🌈", "Recording object and reference beams as an interference pattern, then reconstructing the image."),
  epBoardSimulation("ep-laser-medical", 1, "LASER", "laser", "Medical Applications of Laser", "Laser Medical Applications Visualizer", "🩺", "Eye surgery, tissue cutting and coagulation — wavelength, absorption depth and pulse choice."),
  epBoardSimulation("ep-tir", 2, "Fiber Optics", "fiber-optics", "Total Internal Reflection", "Total Internal Reflection Simulator", "💡", "Change the incident angle and refractive indices: see refraction, the critical angle and total internal reflection."),
  epBoardSimulation("ep-acceptance-angle", 2, "Fiber Optics", "fiber-optics", "Acceptance Angle", "Acceptance Angle Simulator", "🔺", "Rays entering inside the acceptance cone are guided; rays outside it leak into the cladding."),
  epBoardSimulation("ep-numerical-aperture", 2, "Fiber Optics", "fiber-optics", "Numerical Aperture", "Numerical Aperture Simulator", "📐", "NA = √(n₁² − n₂²): how core and cladding indices set the light-gathering ability of a fibre."),
  epBoardSimulation("ep-single-multi-mode", 2, "Fiber Optics", "fiber-optics", "Single Mode and Multimode Fiber", "Single Mode vs Multimode Fiber", "🧵", "Core diameter, V-number and number of modes — one path versus many paths and modal dispersion."),
  epBoardSimulation("ep-step-graded-index", 2, "Fiber Optics", "fiber-optics", "Step Index and Graded Index Fiber", "Step Index vs Graded Index Fiber", "📈", "Zig-zag rays in a step-index fibre versus curved rays in a graded-index fibre, and the refractive index profile."),
  epBoardSimulation("ep-fiber-communication", 2, "Fiber Optics", "fiber-optics", "Optical Fiber Communication", "Optical Fiber Communication Simulator", "📡", "Transmitter → fibre → receiver: attenuation in dB/km, power budget and the received power."),
  epBoardSimulation("ep-bending-loss", 2, "Fiber Optics", "fiber-optics", "Fiber Bending Loss", "Fiber Bending Loss Simulator", "➰", "Tighten the bend radius and watch rays fall below the critical angle and leak out of the core."),
  epBoardSimulation("ep-endoscopy", 2, "Fiber Optics", "fiber-optics", "Fiber Optic Endoscopy", "Fiber Optic Endoscopy Visualizer", "🔬", "Illuminating fibres carry light in; a coherent fibre bundle carries the image back to the eyepiece."),
  epBoardSimulation("ep-piezo-effect", 3, "Ultrasonics", "ultrasonics", "Piezoelectric Effect", "Piezoelectric Effect Simulator", "💎", "Direct effect: stress produces voltage. Inverse effect: voltage produces strain. Switch between the two."),
  epBoardSimulation("ep-piezo-generator", 3, "Ultrasonics", "ultrasonics", "Piezoelectric Generator", "Piezoelectric Generator Simulator", "📻", "An oscillator drives a quartz crystal; resonance occurs when f = (1/2t)·√(Y/ρ)."),
  epBoardSimulation("ep-acoustic-grating", 3, "Ultrasonics", "ultrasonics", "Acoustic Grating", "Acoustic Grating Visualizer", "〰️", "Standing ultrasonic waves in a liquid act as a diffraction grating: d sinθ = nλ gives the sound velocity."),
  epBoardSimulation("ep-sonar", 3, "Ultrasonics", "ultrasonics", "SONAR", "SONAR Simulator", "🚢", "Send an ultrasonic pulse, time the echo and calculate the distance d = v·t/2."),
  epBoardSimulation("ep-ndt", 3, "Ultrasonics", "ultrasonics", "Ultrasonic NDT", "Ultrasonic NDT Simulator", "🔍", "Pulse-echo testing of a metal block: the flaw echo appears on the A-scan before the back-wall echo."),
  epBoardSimulation("ep-ultrasonic-scanning", 3, "Ultrasonics", "ultrasonics", "Ultrasonic Scanning", "Ultrasonic Scanning Simulator", "🖥️", "A-scan, B-scan and T-M scan modes: how echoes from tissue boundaries are turned into a picture."),
  epBoardSimulation("ep-fetal-doppler", 3, "Ultrasonics", "ultrasonics", "Fetal Heartbeat Detection", "Doppler/Fetal Heartbeat Concept Visualizer", "💓", "The Doppler shift Δf = 2f·v·cosθ/c from the moving heart wall reveals the heartbeat."),
  epBoardSimulation("ep-heat-conduction", 4, "Thermal Physics and Fluids", "thermal-fluids", "Heat Conduction", "Heat Conduction Simulator", "🌡️", "Fourier's law Q/t = kA·ΔT/L — temperature distribution and heat flow along a rod."),
  epBoardSimulation("ep-heat-convection", 4, "Thermal Physics and Fluids", "thermal-fluids", "Heat Convection", "Heat Convection Simulator", "♨️", "Hot fluid rises, cool fluid sinks — the convection current and Newton’s law of cooling."),
  epBoardSimulation("ep-thermal-radiation", 4, "Thermal Physics and Fluids", "thermal-fluids", "Thermal Radiation", "Thermal Radiation Visualizer", "☀️", "Stefan–Boltzmann law P = εσAT⁴ and Wien’s displacement law λmax·T = 2.898×10⁻³ m·K."),
  epBoardSimulation("ep-thermal-conductivity", 4, "Thermal Physics and Fluids", "thermal-fluids", "Thermal Conductivity", "Thermal Conductivity Comparison", "⚖️", "Identical rods of copper, aluminium, steel, glass and wood — which conducts heat fastest?"),
  epBoardSimulation("ep-solar-thermal", 4, "Thermal Physics and Fluids", "thermal-fluids", "Solar Thermal Power", "Solar Thermal Power Simulator", "🔆", "Collectors concentrate sunlight → heat transfer fluid → steam → turbine → electricity."),
  epBoardSimulation("ep-microwave", 4, "Thermal Physics and Fluids", "thermal-fluids", "Microwave Heating", "Microwave Heating Simulator", "📶", "Water molecules rotate with the 2.45 GHz field; the absorbed energy heats the food: Q = mcΔT."),
  epBoardSimulation("ep-surface-tension", 4, "Thermal Physics and Fluids", "thermal-fluids", "Surface Tension", "Surface Tension Simulator", "💧", "Molecular forces at the surface and capillary rise h = 2T·cosθ/(ρgr)."),
  epBoardSimulation("ep-viscosity", 4, "Thermal Physics and Fluids", "thermal-fluids", "Viscosity", "Viscosity Simulator", "🍯", "Compare low- and high-viscosity liquids: layer velocities and Stokes’ terminal velocity of a falling ball."),
  epBoardSimulation("ep-fluid-flow", 4, "Thermal Physics and Fluids", "thermal-fluids", "Fluid Flow", "Fluid Flow Visualizer", "🌊", "Reynolds number Re = ρvD/η decides laminar or turbulent flow; continuity A₁v₁ = A₂v₂."),
  epBoardSimulation("ep-unit-cell", 5, "Crystal Physics", "crystal-physics", "Unit Cell", "Unit Cell 3D Visualizer", "🧊", "Lattice parameters a, b, c and angles α, β, γ — repeat the unit cell to build the crystal."),
  epBoardSimulation("ep-simple-cubic", 5, "Crystal Physics", "crystal-physics", "Simple Cubic", "Simple Cubic Structure", "⬛", "Atoms at the 8 corners: 1 atom per cell, coordination number 6, packing factor 0.52."),
  epBoardSimulation("ep-bcc", 5, "Crystal Physics", "crystal-physics", "Body-Centered Cubic", "BCC Structure", "🔲", "Corner atoms plus one at the body centre: 2 atoms per cell, CN 8, APF 0.68."),
  epBoardSimulation("ep-fcc", 5, "Crystal Physics", "crystal-physics", "Face-Centered Cubic", "FCC Structure", "🟦", "Corner atoms plus face centres: 4 atoms per cell, CN 12, APF 0.74."),
  epBoardSimulation("ep-bravais", 5, "Crystal Physics", "crystal-physics", "Bravais Lattices", "Bravais Lattice Visualizer", "🔷", "The 7 crystal systems and 14 Bravais lattices with their axial lengths and angles."),
  epBoardSimulation("ep-miller", 5, "Crystal Physics", "crystal-physics", "Miller Indices", "Miller Indices 3D Visualizer", "📏", "Choose (h k l) and see the plane cut the X, Y and Z axes, with interplanar spacing d = a/√(h²+k²+l²)."),
  epBoardSimulation("ep-bragg", 5, "Crystal Physics", "crystal-physics", "Bragg's Law", "Bragg's Law Simulator", "🎯", "2d sinθ = nλ — change wavelength, spacing and angle to find constructive interference."),
  epBoardSimulation("ep-xrd", 5, "Crystal Physics", "crystal-physics", "X-Ray Diffraction", "X-Ray Diffraction Simulator", "📉", "Diffraction pattern of SC, BCC and FCC crystals: allowed (h k l) peaks at 2θ from Bragg’s law."),
  epBoardSimulation("ep-czochralski", 5, "Crystal Physics", "crystal-physics", "Czochralski Process", "Czochralski Crystal Growth Simulator", "🧪", "Molten silicon → seed crystal → rotation and pulling → single crystal → silicon ingot."),
  epBoardSimulation("ep-wafer", 5, "Crystal Physics", "crystal-physics", "Silicon Wafer Formation", "Silicon Wafer Formation Simulator", "💿", "Ingot → grinding → slicing → lapping → etching → polishing → cleaned wafers, with the wafer count per ingot."),
];

export const CN_BOARD_SIMULATIONS: ISimulationDefinition[] = [
  cnBoardSimulation("cn-osi-model", 1, "Introduction to Computer Networks", "OSI Reference Model", "OSI Model Visualizer", "🧱", "Follow a message down the 7 OSI layers, across the wire and back up — each layer adds or removes its header."),
  cnBoardSimulation("cn-tcpip-model", 1, "Introduction to Computer Networks", "TCP/IP Reference Model", "TCP/IP Model Visualizer", "🌐", "Encapsulation through Application, Transport, Internet and Network Access layers for HTTP, DNS or SMTP."),
  cnBoardSimulation("cn-topology", 1, "Introduction to Computer Networks", "Network Topologies", "Network Topology Visualizer", "🕸️", "Bus, star, ring, mesh and tree topologies, plus LAN / MAN / WAN scope and network components — send data and fail links."),
  cnBoardSimulation("cn-osi-vs-tcpip", 1, "Introduction to Computer Networks", "OSI vs TCP/IP", "OSI vs TCP/IP Comparison", "⚖️", "Layer-by-layer mapping between the OSI and TCP/IP models with protocols and key differences."),
  cnBoardSimulation("cn-framing", 2, "Data Link Layer", "Framing", "Frame Formation Simulator", "🧩", "Character count, byte stuffing and bit stuffing — see every stuffed byte/bit added and removed."),
  cnBoardSimulation("cn-crc", 2, "Data Link Layer", "Error Detection", "CRC Error Detection Simulator", "🧮", "CRC long division step by step, error injection at the receiver, and Hamming code error correction."),
  cnBoardSimulation("cn-stop-wait", 2, "Data Link Layer", "ARQ", "Stop-and-Wait ARQ Simulator", "⏱️", "Alternating sequence numbers, timers, lost frames, lost ACKs and duplicate detection."),
  cnBoardSimulation("cn-sliding-window", 2, "Data Link Layer", "Flow Control", "Sliding Window Simulator", "🪟", "Go-Back-N and Selective Repeat with a moving window, lost frames and retransmissions."),
  cnBoardSimulation("cn-ethernet-frame", 2, "Data Link Layer", "Ethernet", "Ethernet Frame Visualizer", "🔌", "Build an IEEE 802.3 frame field by field, with padding and a real CRC-32 FCS."),
  cnBoardSimulation("cn-mac-address", 2, "Data Link Layer", "MAC Addressing", "MAC Address Simulator", "🏷️", "OUI and NIC parts, unicast / multicast / broadcast bits, and how NICs accept or drop frames."),
  cnBoardSimulation("cn-arp", 2, "Data Link Layer", "ARP", "ARP Request/Reply Simulator", "📣", "ARP cache miss, broadcast request, unicast reply and cache update — including off-subnet gateway lookups."),
  cnBoardSimulation("cn-switch", 2, "Data Link Layer", "Switching", "Switch Forwarding Simulator", "🔀", "MAC learning, flooding, forwarding and filtering on a 4-port switch with a live MAC table."),
  cnBoardSimulation("cn-ipv4-addressing", 3, "Network Layer", "IPv4 Addressing", "IPv4 Addressing Simulator", "🔢", "Binary conversion, class, private/public range, network and broadcast addresses for any IPv4 address."),
  cnBoardSimulation("cn-subnetting", 3, "Network Layer", "Subnetting", "Subnetting Visualizer", "✂️", "Fixed-length and VLSM subnetting with borrowed bits, block size and every subnet range."),
  cnBoardSimulation("cn-ip-packet", 3, "Network Layer", "IPv4 Packet Structure", "IP Packet Structure Visualizer", "📦", "Every IPv4 header field with real values, including the header checksum calculation."),
  cnBoardSimulation("cn-packet-forwarding", 3, "Network Layer", "Packet Forwarding", "Packet Forwarding Simulator", "➡️", "Longest-prefix match against a routing table, TTL decrement and output interface selection."),
  cnBoardSimulation("cn-routing-table", 3, "Network Layer", "Routing Tables", "Routing Table Simulator", "📋", "Distance-vector routing: routers exchange tables round by round until every table converges."),
  cnBoardSimulation("cn-next-hop", 3, "Network Layer", "Routing", "Router / Next-Hop Simulator", "🛣️", "Hop-by-hop forwarding: each router looks up the next hop; TTL expiry sends ICMP Time Exceeded."),
  cnBoardSimulation("cn-network-path", 3, "Network Layer", "Routing", "Network Path Simulator", "🗺️", "Dijkstra's shortest-path algorithm on a weighted network, then the packet follows the chosen path."),
  cnBoardSimulation("cn-fragmentation", 3, "Network Layer", "Fragmentation", "IP Fragmentation Simulator", "🧱", "Split a datagram for a smaller MTU — offsets, MF flag, lengths, reassembly and the DF bit."),
  cnBoardSimulation("cn-icmp-ping", 3, "Network Layer", "ICMP", "ICMP Ping Simulator", "📶", "Echo request/reply with RTT and loss statistics, destination unreachable and time exceeded."),
  cnBoardSimulation("cn-tcp-handshake", 4, "Transport Layer", "Three-Way Handshake", "TCP Three-Way Handshake Simulator", "🤝", "SYN, SYN+ACK, ACK with sequence numbers and TCP states — plus lost SYN and closed-port cases."),
  cnBoardSimulation("cn-tcp-termination", 4, "Transport Layer", "TCP Connection", "TCP Connection Termination Simulator", "👋", "Four-way FIN/ACK close with FIN_WAIT, CLOSE_WAIT, LAST_ACK and TIME_WAIT states, including half-close."),
  cnBoardSimulation("cn-tcp-segment", 4, "Transport Layer", "TCP Segment", "TCP Segment Visualizer", "🧾", "Ports, sequence and acknowledgement numbers, flags, window and checksum — field by field."),
  cnBoardSimulation("cn-tcp-vs-udp", 4, "Transport Layer", "UDP", "TCP vs UDP Comparison", "⚖️", "The same messages over TCP and UDP side by side — handshake, ACKs, loss, retransmission and ordering."),
  cnBoardSimulation("cn-tcp-sliding-window", 4, "Transport Layer", "Reliable Data Transfer", "TCP Sliding Window Simulator", "🪟", "Byte-stream send window: acknowledged, in flight, usable and not-yet-allowed bytes as ACKs arrive."),
  cnBoardSimulation("cn-flow-control", 4, "Transport Layer", "Flow Control", "TCP Flow Control Simulator", "🚰", "Receive buffer, advertised window (rwnd), zero-window and persist probes as the application reads."),
  cnBoardSimulation("cn-congestion-control", 4, "Transport Layer", "Congestion Control", "TCP Congestion Control Simulator", "📈", "Slow start, congestion avoidance, timeouts and triple duplicate ACKs for TCP Tahoe and Reno."),
  cnBoardSimulation("cn-retransmission", 4, "Transport Layer", "Reliable Data Transfer", "Packet Loss and Retransmission Simulator", "🔁", "Cumulative ACKs, duplicate ACKs, fast retransmit versus timeout, and RTO estimation."),
  cnBoardSimulation("cn-dns", 5, "Application Layer", "DNS", "DNS Resolution Simulator", "📖", "Iterative and recursive resolution through root, TLD and authoritative servers, with caching."),
  cnBoardSimulation("cn-dhcp", 5, "Application Layer", "DHCP", "DHCP DORA Simulator", "🎫", "Discover, Offer, Request, Acknowledge — address pool, lease and renewal."),
  cnBoardSimulation("cn-http", 5, "Application Layer", "HTTP", "HTTP Request/Response Simulator", "🌍", "TCP connection, request line and headers, status codes, and persistent vs non-persistent connections."),
  cnBoardSimulation("cn-ftp", 5, "Application Layer", "FTP", "FTP File Transfer Simulator", "📁", "Control connection on port 21 and data connection in active or passive mode, block by block."),
  cnBoardSimulation("cn-email", 5, "Application Layer", "Email Protocols", "Email Communication Simulator", "✉️", "SMTP dialogue between user agents and mail servers, then retrieval with POP3 or IMAP."),
  cnBoardSimulation("cn-client-server", 5, "Application Layer", "Application Layer Architecture", "Client-Server Communication Simulator", "🖧", "Sockets, iterative and concurrent servers, and a client-server versus peer-to-peer comparison."),
];

export const SIMULATION_REGISTRY: ISimulationDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // MATHEMATICS
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. Graphs
  {
    id: 'math-graphs',
    title: 'Dynamic Function Plotter & Tangent Derivative Analyzer',
    domain: 'MATHEMATICS',
    category: 'graphs',
    icon: '📈',
    shortDescription: 'Interactive function grapher with real-time derivative tangent lines, critical points, and root analysis.',
    detailedDescription: 'Visualizes continuous single-variable functions f(x). Students can inspect how amplitude, frequency, phase shift, and vertical offsets alter the curve, while watching the tangent slope f\'(x) sweep along the trajectory.',
    learningObjectives: [
      'Understand the relationship between local tangent slopes and analytical derivatives',
      'Analyze root positions and turning points across polynomial and trigonometric forms',
      'Investigate amplitude, period, and phase transformations in coordinate space',
    ],
    formulaOverview: 'f(x) = A \\sin(\\omega x + \\phi) + D \\quad \\implies \\quad f\'(x) = A\\omega \\cos(\\omega x + \\phi)',
    suggestedUnits: [1, 2],
    smartboardPresetKey: 'math-graphs',
    tags: ['Calculus', 'Trigonometry', 'Curves', 'Derivatives'],
    parameters: [
      {
        key: 'funcType',
        label: 'Function Form',
        type: 'select',
        default: 'sin',
        options: [
          { label: 'Trigonometric: A·sin(ωx + φ)', value: 'sin' },
          { label: 'Trigonometric: A·cos(ωx + φ)', value: 'cos' },
          { label: 'Quadratic: A·x² + B·x + C', value: 'quadratic' },
          { label: 'Cubic: A·x³ - 3x', value: 'cubic' },
          { label: 'Damped Oscillator: A·e^(-0.2x)·cos(ωx)', value: 'damped' },
        ],
      },
      { key: 'amplitude', label: 'Amplitude (A)', type: 'range', min: 0.5, max: 4, step: 0.1, default: 2.0 },
      { key: 'frequency', label: 'Frequency / Multiplier (ω)', type: 'range', min: 0.5, max: 3, step: 0.1, default: 1.0 },
      { key: 'phase', label: 'Phase Shift (φ in rad)', type: 'range', min: -3.14, max: 3.14, step: 0.1, default: 0.0, unit: 'rad' },
      { key: 'verticalShift', label: 'Vertical Offset (D)', type: 'range', min: -2, max: 2, step: 0.2, default: 0.0 },
      { key: 'showTangent', label: 'Show Live Tangent Line', type: 'boolean', default: true },
      { key: 'showGrid', label: 'Show High-Contrast Grid', type: 'boolean', default: true },
    ],
    metrics: [
      {
        id: 'tangentSlope',
        label: 'Tangent Slope f\'(x)',
        format: (s) => (s.cursorSlope !== undefined ? s.cursorSlope.toFixed(3) : '0.000'),
        badge: 'Slope',
        color: 'text-indigo-400',
      },
      {
        id: 'probeX',
        label: 'Probe Coordinate (x, y)',
        format: (s) => `(${s.probeX?.toFixed(2) || '0.00'}, ${s.probeY?.toFixed(2) || '0.00'})`,
        badge: 'Point',
      },
      {
        id: 'period',
        label: 'Function Period (T)',
        format: (_s, p) => (p.funcType.includes('sin') || p.funcType.includes('cos') ? `${(6.283 / p.frequency).toFixed(2)} units` : 'Non-periodic'),
      },
    ],
    engine: {
      createInitialState: () => ({ time: 0, probeX: 1.0, probeY: 0, cursorSlope: 0 }),
      update: (state, params, dt) => {
        const time = state.time + dt;
        const probeX = Math.sin(time * 0.7) * 4.0;
        let probeY = 0;
        let cursorSlope = 0;

        const evalFunc = (x: number) => {
          const A = params.amplitude;
          const w = params.frequency;
          const phi = params.phase;
          const D = params.verticalShift;
          if (params.funcType === 'sin') return A * Math.sin(w * x + phi) + D;
          if (params.funcType === 'cos') return A * Math.cos(w * x + phi) + D;
          if (params.funcType === 'quadratic') return A * 0.25 * x * x + D;
          if (params.funcType === 'cubic') return A * 0.1 * (x * x * x - 4 * x) + D;
          if (params.funcType === 'damped') return A * Math.exp(-0.25 * Math.abs(x)) * Math.cos(w * x) + D;
          return A * Math.sin(w * x + phi) + D;
        };

        probeY = evalFunc(probeX);
        const h = 0.001;
        cursorSlope = (evalFunc(probeX + h) - evalFunc(probeX - h)) / (2 * h);

        return { ...state, time, probeX, probeY, cursorSlope };
      },
      render: (ctx, w, h, state, params) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const scaleX = w / 14;
        const scaleY = h / 8;

        if (params.showGrid) {
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          for (let x = -8; x <= 8; x++) {
            const px = cx + x * scaleX;
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, h);
            ctx.stroke();
          }
          for (let y = -5; y <= 5; y++) {
            const py = cy - y * scaleY;
            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(w, py);
            ctx.stroke();
          }
        }

        // Axes
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
        ctx.stroke();

        // Curve plotting
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#6366f1';
        ctx.shadowBlur = 8;
        ctx.beginPath();

        const A = params.amplitude;
        const wFreq = params.frequency;
        const phi = params.phase;
        const D = params.verticalShift;

        const evalFunc = (x: number) => {
          if (params.funcType === 'sin') return A * Math.sin(wFreq * x + phi) + D;
          if (params.funcType === 'cos') return A * Math.cos(wFreq * x + phi) + D;
          if (params.funcType === 'quadratic') return A * 0.25 * x * x + D;
          if (params.funcType === 'cubic') return A * 0.1 * (x * x * x - 4 * x) + D;
          if (params.funcType === 'damped') return A * Math.exp(-0.25 * Math.abs(x)) * Math.cos(wFreq * x) + D;
          return A * Math.sin(wFreq * x + phi) + D;
        };

        for (let px = 0; px < w; px += 2) {
          const x = (px - cx) / scaleX;
          const y = evalFunc(x);
          const py = cy - y * scaleY;
          if (px === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Tangent line & probe
        if (params.showTangent) {
          const px = cx + state.probeX * scaleX;
          const py = cy - state.probeY * scaleY;

          // Tangent line segment
          const slope = state.cursorSlope;
          const dx = 2.5;
          const dy = slope * dx;

          const p1x = cx + (state.probeX - dx) * scaleX;
          const p1y = cy - (state.probeY - dy) * scaleY;
          const p2x = cx + (state.probeX + dx) * scaleX;
          const p2y = cy - (state.probeY + dy) * scaleY;

          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.stroke();

          // Probe point
          ctx.fillStyle = '#f43f5e';
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Drop line to axis
          ctx.strokeStyle = '#e2e8f033';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, cy);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      },
    },
  },

  // 2. Calculus Visualization
  {
    id: 'math-calculus',
    title: 'Riemann Sums & Definite Integral Visualizer',
    domain: 'MATHEMATICS',
    category: 'calculus visualization',
    icon: '∫',
    shortDescription: 'Definite integral approximation through dynamic rectangular Riemann slices and trapezoids with exact analytical comparison.',
    detailedDescription: 'Visually demonstrates how slicing area under a continuous curve into infinitesimally narrow rectangles leads to the Cauchy-Riemann integral definition. Displays live comparisons between Left, Right, Midpoint, and Trapezoidal approximations.',
    learningObjectives: [
      'Observe convergence of Riemann sums to analytical area as partition count N increases',
      'Compare overestimation vs underestimation between Left, Right, and Midpoint methods',
      'Bridge numerical quadrature with the Fundamental Theorem of Calculus',
    ],
    formulaOverview: '\\int_a^b f(x) dx = \\lim_{N \\to \\infty} \\sum_{i=1}^N f(x_i^*) \\Delta x, \\quad \\Delta x = \\frac{b-a}{N}',
    suggestedUnits: [2, 3],
    smartboardPresetKey: 'math-calculus',
    tags: ['Integrals', 'Riemann Sums', 'Quadrature', 'Calculus'],
    parameters: [
      {
        key: 'funcType',
        label: 'Integrand Curve f(x)',
        type: 'select',
        default: 'parabola',
        options: [
          { label: 'Parabola: 4 - 0.3x²', value: 'parabola' },
          { label: 'Trigonometric: 2 + sin(x)', value: 'sine' },
          { label: 'Exponential: e^(0.3x)', value: 'exp' },
          { label: 'Polynomial: 0.1x³ - x + 3', value: 'cubic' },
        ],
      },
      { key: 'partitions', label: 'Subdivisions (N)', type: 'range', min: 4, max: 64, step: 2, default: 16 },
      { key: 'lowerBound', label: 'Lower Limit (a)', type: 'range', min: -3, max: 1, step: 0.5, default: -2 },
      { key: 'upperBound', label: 'Upper Limit (b)', type: 'range', min: 1.5, max: 4.5, step: 0.5, default: 3 },
      {
        key: 'method',
        label: 'Slicing Method',
        type: 'select',
        default: 'midpoint',
        options: [
          { label: 'Midpoint Riemann Sum', value: 'midpoint' },
          { label: 'Left Endpoint Sum', value: 'left' },
          { label: 'Right Endpoint Sum', value: 'right' },
          { label: 'Trapezoidal Rule', value: 'trapezoid' },
        ],
      },
    ],
    metrics: [
      {
        id: 'riemannArea',
        label: 'Approx Area (S_N)',
        format: (s) => s.approxArea?.toFixed(4) || '0.0000',
        badge: 'Numerical',
        color: 'text-amber-400',
      },
      {
        id: 'exactArea',
        label: 'Analytical Area (∫)',
        format: (s) => s.exactArea?.toFixed(4) || '0.0000',
        badge: 'Exact',
        color: 'text-emerald-400',
      },
      {
        id: 'errorPercent',
        label: 'Absolute Error %',
        format: (s) => `${s.errorPercent?.toFixed(2) || '0.00'}%`,
      },
    ],
    engine: {
      createInitialState: () => ({ approxArea: 0, exactArea: 0, errorPercent: 0 }),
      update: (_state, params) => {
        const a = Math.min(params.lowerBound, params.upperBound - 0.5);
        const b = Math.max(params.upperBound, a + 0.5);
        const N = params.partitions;
        const dx = (b - a) / N;

        const f = (x: number) => {
          if (params.funcType === 'parabola') return 4 - 0.3 * x * x;
          if (params.funcType === 'sine') return 2 + Math.sin(x);
          if (params.funcType === 'exp') return Math.exp(0.3 * x);
          if (params.funcType === 'cubic') return 0.1 * x * x * x - x + 3;
          return 4 - 0.3 * x * x;
        };

        // Numerical approximation
        let sum = 0;
        for (let i = 0; i < N; i++) {
          const xLeft = a + i * dx;
          const xRight = xLeft + dx;
          if (params.method === 'left') {
            sum += f(xLeft) * dx;
          } else if (params.method === 'right') {
            sum += f(xRight) * dx;
          } else if (params.method === 'midpoint') {
            sum += f((xLeft + xRight) / 2) * dx;
          } else if (params.method === 'trapezoid') {
            sum += ((f(xLeft) + f(xRight)) / 2) * dx;
          }
        }

        // High resolution Simpson benchmark as exact
        const M = 1000;
        const mdx = (b - a) / M;
        let exact = f(a) + f(b);
        for (let i = 1; i < M; i++) {
          exact += (i % 2 === 0 ? 2 : 4) * f(a + i * mdx);
        }
        exact = (exact * mdx) / 3;

        const errorPercent = Math.abs((sum - exact) / (exact || 1)) * 100;
        return { approxArea: sum, exactArea: exact, errorPercent };
      },
      render: (ctx, w, h, _s, params) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const cx = w * 0.45;
        const cy = h * 0.75;
        const scaleX = w / 10;
        const scaleY = h / 8;

        const a = Math.min(params.lowerBound, params.upperBound - 0.5);
        const b = Math.max(params.upperBound, a + 0.5);
        const N = params.partitions;
        const dx = (b - a) / N;

        const f = (x: number) => {
          if (params.funcType === 'parabola') return 4 - 0.3 * x * x;
          if (params.funcType === 'sine') return 2 + Math.sin(x);
          if (params.funcType === 'exp') return Math.exp(0.3 * x);
          if (params.funcType === 'cubic') return 0.1 * x * x * x - x + 3;
          return 4 - 0.3 * x * x;
        };

        // Draw Riemann bars
        for (let i = 0; i < N; i++) {
          const x0 = a + i * dx;
          const x1 = x0 + dx;
          let evalX = (x0 + x1) / 2;
          if (params.method === 'left') evalX = x0;
          if (params.method === 'right') evalX = x1;

          const px0 = cx + x0 * scaleX;
          const px1 = cx + x1 * scaleX;
          const barW = px1 - px0;

          if (params.method === 'trapezoid') {
            const py0 = cy - f(x0) * scaleY;
            const py1 = cy - f(x1) * scaleY;
            ctx.fillStyle = i % 2 === 0 ? 'rgba(99, 102, 241, 0.35)' : 'rgba(79, 70, 229, 0.45)';
            ctx.strokeStyle = '#818cf8';
            ctx.beginPath();
            ctx.moveTo(px0, cy);
            ctx.lineTo(px0, py0);
            ctx.lineTo(px1, py1);
            ctx.lineTo(px1, cy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            const barH = f(evalX) * scaleY;
            const py = cy - barH;
            ctx.fillStyle = i % 2 === 0 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(217, 119, 6, 0.45)';
            ctx.strokeStyle = '#fbbf24';
            ctx.fillRect(px0, py, barW, barH);
            ctx.strokeRect(px0, py, barW, barH);
          }
        }

        // Draw continuous curve
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let px = 0; px < w; px += 3) {
          const x = (px - cx) / scaleX;
          const y = f(x);
          const py = cy - y * scaleY;
          if (px === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Axis line
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.stroke();

        // Bounds markers a and b
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(cx + a * scaleX, 0);
        ctx.lineTo(cx + a * scaleX, cy);
        ctx.moveTo(cx + b * scaleX, 0);
        ctx.lineTo(cx + b * scaleX, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#f43f5e';
        ctx.font = '12px sans-serif';
        ctx.fillText(`a = ${a.toFixed(1)}`, cx + a * scaleX - 15, cy + 20);
        ctx.fillText(`b = ${b.toFixed(1)}`, cx + b * scaleX - 15, cy + 20);
      },
    },
  },

  // 3. Geometry
  {
    id: 'math-geometry',
    title: 'Regular Polygon & Euclidean Angle-Sector Solver',
    domain: 'MATHEMATICS',
    category: 'geometry',
    icon: '📐',
    shortDescription: 'Interactive geometry laboratory exploring interior/exterior angles, circumscribed circles, apothems, and perimeter invariants.',
    detailedDescription: 'Visualizes n-sided regular polygons with active angle arcs, radial triangulation triangles, apothems, inscribed circles, and circumcircles. Students can adjust vertices from 3 to 12 and verify theorem identities.',
    learningObjectives: [
      'Confirm the interior angle summation theorem: Sum = (n - 2) * 180°',
      'Understand the relationship between apothem, radius, and side length',
      'Examine the asymptotic convergence of regular polygons into circles as n increases',
    ],
    formulaOverview: '\\text{Angle} = \\frac{(n-2) \\cdot 180^\\circ}{n}, \\quad \\text{Area} = \\frac{1}{2} \\cdot P \\cdot a',
    suggestedUnits: [1, 4],
    smartboardPresetKey: 'math-geometry',
    tags: ['Euclidean Geometry', 'Polygons', 'Angles', 'Circle Theorems'],
    parameters: [
      { key: 'sides', label: 'Polygon Sides (n)', type: 'range', min: 3, max: 12, step: 1, default: 6 },
      { key: 'radius', label: 'Circumradius (R)', type: 'range', min: 80, max: 200, step: 10, default: 140, unit: 'px' },
      { key: 'showCircumcircle', label: 'Show Circumcircle', type: 'boolean', default: true },
      { key: 'showInscribedCircle', label: 'Show Inscribed Circle', type: 'boolean', default: true },
      { key: 'showApothem', label: 'Show Apothem & Triangulation', type: 'boolean', default: true },
      { key: 'showAngleArcs', label: 'Show Interior Angle Arcs', type: 'boolean', default: true },
    ],
    metrics: [
      {
        id: 'interiorAngle',
        label: 'Interior Angle (θ)',
        format: (_s, p) => `${(((p.sides - 2) * 180) / p.sides).toFixed(1)}°`,
        badge: 'Angle',
        color: 'text-indigo-400',
      },
      {
        id: 'angleSum',
        label: 'Total Interior Sum',
        format: (_s, p) => `${(p.sides - 2) * 180}°`,
      },
      {
        id: 'apothem',
        label: 'Apothem Length',
        format: (_s, p) => `${(p.radius * Math.cos(Math.PI / p.sides)).toFixed(1)} px`,
      },
    ],
    engine: {
      createInitialState: () => ({ rotation: 0 }),
      update: (state, _p, dt) => ({ rotation: state.rotation + dt * 0.2 }),
      render: (ctx, w, h, state, params) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const n = params.sides;
        const R = params.radius;
        const apothem = R * Math.cos(Math.PI / n);

        // Circumcircle
        if (params.showCircumcircle) {
          ctx.strokeStyle = '#38bdf833';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Inscribed circle
        if (params.showInscribedCircle) {
          ctx.strokeStyle = '#f59e0b33';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, apothem, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Calculate vertices
        const vertices: { x: number; y: number }[] = [];
        for (let i = 0; i < n; i++) {
          const angle = state.rotation + (i * 2 * Math.PI) / n;
          vertices.push({
            x: cx + R * Math.cos(angle),
            y: cy + R * Math.sin(angle),
          });
        }

        // Triangulation sectors
        if (params.showApothem) {
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          for (const v of vertices) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(v.x, v.y);
            ctx.stroke();
          }

          // Draw one apothem vector
          const v0 = vertices[0];
          const v1 = vertices[1];
          if (v0 && v1) {
            const midX = (v0.x + v1.x) / 2;
            const midY = (v0.y + v1.y) / 2;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(midX, midY);
            ctx.stroke();

            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(midX, midY, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw Polygon edges
        if (vertices.length > 0 && vertices[0]) {
          ctx.strokeStyle = '#6366f1';
          ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(vertices[0].x, vertices[0].y);
          for (let i = 1; i < vertices.length; i++) {
            const vi = vertices[i];
            if (vi) ctx.lineTo(vi.x, vi.y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Vertices & Angle Arcs
        for (const v of vertices) {
          if (!v) continue;
          ctx.fillStyle = '#a5b4fc';
          ctx.beginPath();
          ctx.arc(v.x, v.y, 5, 0, Math.PI * 2);
          ctx.fill();

          if (params.showAngleArcs) {
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(v.x, v.y, 14, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      },
    },
  },

  // 4. Matrices
  {
    id: 'math-matrices',
    title: '2D Linear Transformation & Eigenvector Grid Deformer',
    domain: 'MATHEMATICS',
    category: 'matrices',
    icon: '▦',
    shortDescription: 'Dynamic 2D coordinate grid deformation visualizing matrix determinants, basis vectors, and invariant eigenvector axes.',
    detailedDescription: 'Allows real-time matrix entries [[a, b], [c, d]] or presets (Rotation, Shear, Scaling, Reflection) to deform the Cartesian plane. Visualizes basis vectors i-hat and j-hat and computes determinant area transformation.',
    learningObjectives: [
      'Grasp determinant geometric meaning as the signed area scaling factor of unit squares',
      'Identify invariant eigenvector directions that experience purely scalar stretch',
      'Demystify linear mappings as continuous transforms of standard basis vectors',
    ],
    formulaOverview: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} \\begin{bmatrix} x \\\\ y \\end{bmatrix} = x \\mathbf{i\'} + y \\mathbf{j\'}, \\quad \\det(A) = ad - bc',
    suggestedUnits: [3, 5],
    smartboardPresetKey: 'math-matrices',
    tags: ['Linear Algebra', 'Determinants', 'Eigenvectors', 'Transformations'],
    parameters: [
      { key: 'a', label: 'a (i-hat x)', type: 'range', min: -2.5, max: 2.5, step: 0.1, default: 1.5 },
      { key: 'b', label: 'b (j-hat x)', type: 'range', min: -2.5, max: 2.5, step: 0.1, default: 0.5 },
      { key: 'c', label: 'c (i-hat y)', type: 'range', min: -2.5, max: 2.5, step: 0.1, default: 0.5 },
      { key: 'd', label: 'd (j-hat y)', type: 'range', min: -2.5, max: 2.5, step: 0.1, default: 1.5 },
      { key: 'showUnitSquare', label: 'Show Transformed Unit Square', type: 'boolean', default: true },
      { key: 'showEigenvectors', label: 'Show Eigenvector Direction Axes', type: 'boolean', default: true },
    ],
    metrics: [
      {
        id: 'det',
        label: 'Determinant det(A)',
        format: (_s, p) => (p.a * p.d - p.b * p.c).toFixed(3),
        badge: 'Area Factor',
        color: 'text-indigo-400',
      },
      {
        id: 'trace',
        label: 'Matrix Trace tr(A)',
        format: (_s, p) => (p.a + p.d).toFixed(3),
      },
      {
        id: 'orientation',
        label: 'Orientation Preserved',
        format: (_s, p) => (p.a * p.d - p.b * p.c >= 0 ? 'Yes (Positive Det)' : 'No (Reflected)'),
      },
    ],
    engine: {
      createInitialState: () => ({ animProgress: 1.0 }),
      update: (state) => state,
      render: (ctx, w, h, _s, params) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const unit = 65;

        const a = params.a;
        const b = params.b;
        const c = params.c;
        const d = params.d;

        // Draw original faint grid
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let i = -6; i <= 6; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i * unit, 0);
          ctx.lineTo(cx + i * unit, h);
          ctx.moveTo(0, cy + i * unit);
          ctx.lineTo(w, cy + i * unit);
          ctx.stroke();
        }

        // Draw Transformed Grid Lines
        ctx.strokeStyle = '#33415588';
        ctx.lineWidth = 1.2;
        for (let x = -5; x <= 5; x++) {
          ctx.beginPath();
          for (let y = -5; y <= 5; y += 0.5) {
            const tx = a * x + b * y;
            const ty = c * x + d * y;
            const px = cx + tx * unit;
            const py = cy - ty * unit;
            if (y === -5) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        for (let y = -5; y <= 5; y++) {
          ctx.beginPath();
          for (let x = -5; x <= 5; x += 0.5) {
            const tx = a * x + b * y;
            const ty = c * x + d * y;
            const px = cx + tx * unit;
            const py = cy - ty * unit;
            if (x === -5) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        // Transformed Unit Square
        if (params.showUnitSquare) {
          const p00 = { x: cx, y: cy };
          const p10 = { x: cx + a * unit, y: cy - c * unit };
          const p11 = { x: cx + (a + b) * unit, y: cy - (c + d) * unit };
          const p01 = { x: cx + b * unit, y: cy - d * unit };

          ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p00.x, p00.y);
          ctx.lineTo(p10.x, p10.y);
          ctx.lineTo(p11.x, p11.y);
          ctx.lineTo(p01.x, p01.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Transformed Basis Vectors: i-hat (emerald) & j-hat (sky)
        // i-hat: (a, c)
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + a * unit, cy - c * unit);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(cx + a * unit, cy - c * unit, 5, 0, Math.PI * 2);
        ctx.fill();

        // j-hat: (b, d)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + b * unit, cy - d * unit);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(cx + b * unit, cy - d * unit, 5, 0, Math.PI * 2);
        ctx.fill();

        // Eigenvector lines
        if (params.showEigenvectors) {
          const tr = a + d;
          const det = a * d - b * c;
          const disc = tr * tr - 4 * det;
          if (disc >= 0) {
            const l1 = (tr + Math.sqrt(disc)) / 2;
            const vx1 = b !== 0 ? l1 - d : 1;
            const vy1 = b !== 0 ? b : 0;
            const mag = Math.hypot(vx1, vy1) || 1;
            const ux = (vx1 / mag) * unit * 4;
            const uy = (vy1 / mag) * unit * 4;

            ctx.strokeStyle = '#ec4899';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(cx - ux, cy + uy);
            ctx.lineTo(cx + ux, cy - uy);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHYSICS
  // ═══════════════════════════════════════════════════════════════════════════

  // 5. Projectile Motion
  {
    id: 'physics-projectile',
    title: 'Ballistic Projectile & Trajectory Kinematics Lab',
    domain: 'PHYSICS',
    category: 'projectile motion',
    icon: '🚀',
    shortDescription: 'Full parabolic trajectory physics with velocity vector decomposition, aerodynamic drag, target impact, and peak height metrics.',
    detailedDescription: 'Simulates 2D classical mechanics of projectile motion. Students configure launch velocity, firing angle, initial altitude, gravitational field (Earth, Moon, Mars), and air resistance drag coefficients.',
    learningObjectives: [
      'Decompose initial launch velocity into orthogonal vx and vy components',
      'Deduce the optimum 45° angle theorem in vacuum vs drag conditions',
      'Observe gravitational acceleration influence on total flight duration and parabolic curvature',
    ],
    formulaOverview: 'x(t) = v_0 \\cos\\theta \\cdot t, \\quad y(t) = h_0 + v_0 \\sin\\theta \\cdot t - \\frac{1}{2} g t^2',
    suggestedUnits: [1, 2],
    smartboardPresetKey: 'physics-projectile',
    tags: ['Kinematics', 'Gravity', 'Ballistics', 'Drag', 'Vectors'],
    parameters: [
      { key: 'velocity', label: 'Launch Speed (v₀)', type: 'range', min: 10, max: 60, step: 1, default: 35, unit: 'm/s' },
      { key: 'angle', label: 'Launch Angle (θ)', type: 'range', min: 10, max: 80, step: 1, default: 45, unit: '°' },
      { key: 'initialHeight', label: 'Initial Elevation (h₀)', type: 'range', min: 0, max: 30, step: 2, default: 0, unit: 'm' },
      {
        key: 'gravity',
        label: 'Celestial Gravity (g)',
        type: 'select',
        default: 9.81,
        options: [
          { label: 'Earth (9.81 m/s²)', value: 9.81 },
          { label: 'Moon (1.62 m/s²)', value: 1.62 },
          { label: 'Mars (3.71 m/s²)', value: 3.71 },
          { label: 'Jupiter (24.79 m/s²)', value: 24.79 },
        ],
      },
      { key: 'drag', label: 'Air Drag Coefficient (k)', type: 'range', min: 0, max: 0.04, step: 0.005, default: 0.005 },
    ],
    metrics: [
      {
        id: 'maxHeight',
        label: 'Peak Height (H_max)',
        format: (s) => `${s.maxHeight?.toFixed(2) || '0.00'} m`,
        badge: 'Peak',
        color: 'text-sky-400',
      },
      {
        id: 'range',
        label: 'Horizontal Range (R)',
        format: (s) => `${s.range?.toFixed(2) || '0.00'} m`,
        badge: 'Range',
        color: 'text-emerald-400',
      },
      {
        id: 'flightTime',
        label: 'Flight Time (T)',
        format: (s) => `${s.flightTime?.toFixed(2) || '0.00'} s`,
      },
    ],
    engine: {
      createInitialState: (params) => {
        const rad = (params.angle * Math.PI) / 180;
        return {
          t: 0,
          x: 0,
          y: params.initialHeight,
          vx: params.velocity * Math.cos(rad),
          vy: params.velocity * Math.sin(rad),
          trail: [] as { x: number; y: number }[],
          landed: false,
          maxHeight: params.initialHeight,
          range: 0,
          flightTime: 0,
        };
      },
      update: (state, params, dt) => {
        if (state.landed) return state;

        const g = Number(params.gravity);
        const k = params.drag;
        const v = Math.hypot(state.vx, state.vy);

        const ax = -k * v * state.vx;
        const ay = -g - k * v * state.vy;

        const nextVx = state.vx + ax * dt;
        const nextVy = state.vy + ay * dt;
        const nextX = state.x + state.vx * dt;
        const nextY = state.y + state.vy * dt;

        if (nextY <= 0) {
          return {
            ...state,
            y: 0,
            landed: true,
            range: nextX,
            flightTime: state.t,
            trail: [...state.trail, { x: nextX, y: 0 }],
          };
        }

        return {
          ...state,
          t: state.t + dt,
          x: nextX,
          y: nextY,
          vx: nextVx,
          vy: nextVy,
          maxHeight: Math.max(state.maxHeight, nextY),
          trail: state.trail.length % 2 === 0 ? [...state.trail, { x: nextX, y: nextY }] : state.trail,
        };
      },
      render: (ctx, w, h, state, params) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const groundY = h * 0.85;
        const scale = w / 200;

        // Ground
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, groundY, w, h - groundY);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(w, groundY);
        ctx.stroke();

        // Launch Platform
        const initH = params.initialHeight * scale;
        if (initH > 0) {
          ctx.fillStyle = '#475569';
          ctx.fillRect(30, groundY - initH, 24, initH);
        }

        // Cannon barrel
        const rad = (params.angle * Math.PI) / 180;
        const barrelLen = 30;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(42, groundY - initH);
        ctx.lineTo(42 + barrelLen * Math.cos(rad), groundY - initH - barrelLen * Math.sin(rad));
        ctx.stroke();

        // Trajectory Trail
        ctx.strokeStyle = '#38bdf888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < state.trail.length; i++) {
          const pt = state.trail[i];
          const px = 42 + pt.x * scale;
          const py = groundY - pt.y * scale;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Projectile Body
        const ballX = 42 + state.x * scale;
        const ballY = groundY - state.y * scale;

        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(ballX, ballY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Velocity Vectors
        if (!state.landed) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ballX, ballY);
          ctx.lineTo(ballX + state.vx * 0.8, ballY - state.vy * 0.8);
          ctx.stroke();
        }
      },
      reset: (params) => {
        const rad = (params.angle * Math.PI) / 180;
        return {
          t: 0,
          x: 0,
          y: params.initialHeight,
          vx: params.velocity * Math.cos(rad),
          vy: params.velocity * Math.sin(rad),
          trail: [],
          landed: false,
          maxHeight: params.initialHeight,
          range: 0,
          flightTime: 0,
        };
      },
    },
  },

  // 6. Circular Motion
  {
    id: 'physics-circular',
    title: 'Centripetal Force & Orbital Dynamics Lab',
    domain: 'PHYSICS',
    category: 'circular motion',
    icon: '🔄',
    shortDescription: 'Uniform circular kinematics with radial centripetal acceleration, tension cord force arrows, and velocity vector tangents.',
    detailedDescription: 'Simulates uniform and non-uniform orbital rotation of a mass bound by a central force. Displays live tangential velocity vectors v = ωr and inwards centripetal force Fc = m·v²/r.',
    learningObjectives: [
      'Recognize that centripetal acceleration is orthogonal to tangential velocity',
      'Verify the quadratic dependency of centripetal force on angular frequency ω',
      'Investigate radius changes and Keplerian orbital analogies',
    ],
    formulaOverview: 'F_c = \\frac{m v^2}{r} = m \\omega^2 r, \\quad v = \\omega r, \\quad T = \\frac{2\\pi}{\\omega}',
    suggestedUnits: [2, 3],
    smartboardPresetKey: 'physics-circular',
    tags: ['Centripetal Force', 'Dynamics', 'Angular Velocity', 'Period'],
    parameters: [
      { key: 'radius', label: 'Radius (r)', type: 'range', min: 50, max: 180, step: 10, default: 110, unit: 'px' },
      { key: 'angularVelocity', label: 'Angular Speed (ω)', type: 'range', min: 0.5, max: 6, step: 0.2, default: 2.2, unit: 'rad/s' },
      { key: 'mass', label: 'Particle Mass (m)', type: 'range', min: 0.5, max: 10, step: 0.5, default: 2.0, unit: 'kg' },
      { key: 'showVectors', label: 'Show Force & Velocity Vectors', type: 'boolean', default: true },
    ],
    metrics: [
      {
        id: 'centripetalForce',
        label: 'Centripetal Force (F_c)',
        format: (_s, p) => `${(p.mass * Math.pow(p.angularVelocity, 2) * (p.radius / 50)).toFixed(2)} N`,
        badge: 'Force',
        color: 'text-sky-400',
      },
      {
        id: 'tangentialSpeed',
        label: 'Tangential Speed (v)',
        format: (_s, p) => `${(p.angularVelocity * (p.radius / 50)).toFixed(2)} m/s`,
      },
      {
        id: 'period',
        label: 'Period (T)',
        format: (_s, p) => `${((2 * Math.PI) / p.angularVelocity).toFixed(2)} s`,
      },
    ],
    engine: {
      createInitialState: () => ({ angle: 0 }),
      update: (state, params, dt) => ({ angle: state.angle + params.angularVelocity * dt }),
      render: (ctx, w, h, state, params) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const r = params.radius;

        // Circular Orbit Track
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Central Anchor / Pivot
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        // Particle Coordinates
        const px = cx + r * Math.cos(state.angle);
        const py = cy + r * Math.sin(state.angle);

        // Tether / Spring cord
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.stroke();

        // Vectors
        if (params.showVectors) {
          // Centripetal Force Vector (Inwards, Red)
          const fMag = Math.min(60, params.mass * Math.pow(params.angularVelocity, 2) * 3);
          const fx = px - fMag * Math.cos(state.angle);
          const fy = py - fMag * Math.sin(state.angle);

          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(fx, fy);
          ctx.stroke();

          // Tangential Velocity Vector (Tangent, Emerald)
          const vMag = params.angularVelocity * 15;
          const vx = px - vMag * Math.sin(state.angle);
          const vy = py + vMag * Math.cos(state.angle);

          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(vx, vy);
          ctx.stroke();
        }

        // Particle Body
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, 10 + params.mass * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      },
    },
  },

  // 7. Mechanics (Inclined Plane)
  {
    id: 'physics-mechanics',
    title: 'Inclined Plane & Friction Mechanics Lab',
    domain: 'PHYSICS',
    category: 'mechanics',
    icon: '⚖️',
    shortDescription: 'Newtonian free-body mechanics on an inclined ramp with static and kinetic friction thresholds and critical slip angle.',
    detailedDescription: 'Interactive ramp with a sliding mass. Computes gravitational normal forces N = mg cosθ, parallel driving forces mg sinθ, and friction forces. Demonstrates stick-slip transitions and critical angle θc = arctan(μs).',
    learningObjectives: [
      'Construct and verify equilibrium free-body force vectors on inclined planes',
      'Distinguish static friction threshold from kinetic sliding friction',
      'Calculate critical impending motion angle θ_c = arctan(μ_s)',
    ],
    formulaOverview: 'N = mg \\cos\\theta, \\quad f_s \\le \\mu_s N, \\quad a = g(\\sin\\theta - \\mu_k \\cos\\theta)',
    suggestedUnits: [1, 3],
    smartboardPresetKey: 'physics-mechanics',
    tags: ['Newtonian Mechanics', 'Friction', 'Ramp', 'Free Body Diagram'],
    parameters: [
      { key: 'angle', label: 'Ramp Incline Angle (θ)', type: 'range', min: 5, max: 65, step: 1, default: 30, unit: '°' },
      { key: 'mass', label: 'Block Mass (m)', type: 'range', min: 1, max: 20, step: 1, default: 5, unit: 'kg' },
      { key: 'staticFriction', label: 'Static Friction (μ_s)', type: 'range', min: 0.1, max: 0.8, step: 0.05, default: 0.5 },
      { key: 'kineticFriction', label: 'Kinetic Friction (μ_k)', type: 'range', min: 0.05, max: 0.6, step: 0.05, default: 0.35 },
    ],
    metrics: [
      {
        id: 'state',
        label: 'Motion Status',
        format: (s) => (s.sliding ? 'Accelerating Down Ramp' : 'Static Equilibrium (Held by Friction)'),
        badge: 'State',
        color: 'text-amber-400',
      },
      {
        id: 'accel',
        label: 'Acceleration (a)',
        format: (s) => `${s.accel?.toFixed(2) || '0.00'} m/s²`,
      },
      {
        id: 'critAngle',
        label: 'Critical Slip Angle',
        format: (_s, p) => `${((Math.atan(p.staticFriction) * 180) / Math.PI).toFixed(1)}°`,
      },
    ],
    engine: {
      createInitialState: () => ({ distance: 20, velocity: 0, sliding: false, accel: 0 }),
      update: (state, params, dt) => {
        const rad = (params.angle * Math.PI) / 180;
        const g = 9.81;
        const m = params.mass;

        const fDrive = m * g * Math.sin(rad);
        const fMaxStatic = params.staticFriction * m * g * Math.cos(rad);

        const sliding = state.sliding || fDrive > fMaxStatic;
        let accel = 0;
        let nextVel = state.velocity;
        let nextDist = state.distance;

        if (sliding) {
          accel = Math.max(0, g * (Math.sin(rad) - params.kineticFriction * Math.cos(rad)));
          nextVel = state.velocity + accel * dt;
          nextDist = state.distance + nextVel * dt * 15;
          if (nextDist > 240) nextDist = 20; // loop
        } else {
          nextVel = 0;
        }

        return { distance: nextDist, velocity: nextVel, sliding, accel };
      },
      render: (ctx, w, h, state, params) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const cx = 100;
        const cy = h * 0.8;
        const rampLen = 340;
        const rad = (params.angle * Math.PI) / 180;

        const topX = cx + rampLen * Math.cos(rad);
        const topY = cy - rampLen * Math.sin(rad);

        // Ramp Polygon
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(topX, topY);
        ctx.lineTo(topX, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Mass Block on Ramp
        const bx = topX - state.distance * Math.cos(rad);
        const by = topY + state.distance * Math.sin(rad);

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(-rad);

        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(-20, -30, 40, 30);
        ctx.strokeStyle = '#fb7185';
        ctx.strokeRect(-20, -30, 40, 30);

        // Vectors
        // Normal force (up)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(0, -65);
        ctx.stroke();

        // Friction (up ramp)
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(40, -15);
        ctx.stroke();

        ctx.restore();
      },
    },
  },

  // 8. Waves
  {
    id: 'physics-waves',
    title: 'Wave Superposition & Harmonic Interference Lab',
    domain: 'PHYSICS',
    category: 'waves',
    icon: '〰️',
    shortDescription: 'Dual sinusoidal oscillators producing constructive/destructive interference, standing wave nodes, and acoustical beats.',
    detailedDescription: 'Visualizes the principle of linear wave superposition y(x,t) = y1 + y2. Students can modulate individual frequencies, amplitudes, and phase offsets to explore standing wave patterns and beat frequencies.',
    learningObjectives: [
      'Observe constructive vs destructive interference conditions',
      'Demonstrate standing wave formation from opposing coherent waves',
      'Investigate beat frequency phenomenon f_beat = |f1 - f2|',
    ],
    formulaOverview: 'y(x,t) = A_1 \\sin(k_1 x - \\omega_1 t) + A_2 \\sin(k_2 x - \\omega_2 t + \\phi)',
    suggestedUnits: [3, 4],
    smartboardPresetKey: 'physics-waves',
    tags: ['Acoustics', 'Superposition', 'Interference', 'Standing Waves'],
    parameters: [
      { key: 'freq1', label: 'Wave 1 Frequency (f₁)', type: 'range', min: 0.5, max: 4, step: 0.2, default: 2.0, unit: 'Hz' },
      { key: 'amp1', label: 'Wave 1 Amplitude (A₁)', type: 'range', min: 10, max: 50, step: 5, default: 30, unit: 'px' },
      { key: 'freq2', label: 'Wave 2 Frequency (f₂)', type: 'range', min: 0.5, max: 4, step: 0.2, default: 2.0, unit: 'Hz' },
      { key: 'amp2', label: 'Wave 2 Amplitude (A₂)', type: 'range', min: 10, max: 50, step: 5, default: 30, unit: 'px' },
      { key: 'phaseShift', label: 'Phase Shift (Δφ)', type: 'range', min: 0, max: 360, step: 15, default: 0, unit: '°' },
    ],
    metrics: [
      {
        id: 'beatFreq',
        label: 'Beat Frequency |f₁ - f₂|',
        format: (_s, p) => `${Math.abs(p.freq1 - p.freq2).toFixed(2)} Hz`,
        badge: 'Beats',
        color: 'text-indigo-400',
      },
      {
        id: 'maxAmp',
        label: 'Peak Resultant Amplitude',
        format: (_s, p) => `${(p.amp1 + p.amp2).toFixed(0)} px`,
      },
      {
        id: 'phaseDiff',
        label: 'Coherence State',
        format: (_s, p) => (p.phaseShift === 0 || p.phaseShift === 360 ? 'In-Phase (Constructive)' : p.phaseShift === 180 ? 'Anti-Phase (Destructive)' : 'Partial'),
      },
    ],
    engine: {
      createInitialState: () => ({ t: 0 }),
      update: (state, _p, dt) => ({ t: state.t + dt }),
      render: (ctx, w, h, state, params) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const y1Center = h * 0.2;
        const y2Center = h * 0.45;
        const ySumCenter = h * 0.75;

        const phi = (params.phaseShift * Math.PI) / 180;
        const t = state.t;

        // Wave 1 (Cyan)
        ctx.strokeStyle = '#38bdf888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < w; x += 3) {
          const y = y1Center + params.amp1 * Math.sin(0.03 * x - params.freq1 * t * 4);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Wave 2 (Rose)
        ctx.strokeStyle = '#f43f5e88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < w; x += 3) {
          const y = y2Center + params.amp2 * Math.sin(0.03 * x - params.freq2 * t * 4 + phi);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Resultant Composite Wave (Vibrant Emerald with glow)
        ctx.strokeStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 0; x < w; x += 3) {
          const w1 = params.amp1 * Math.sin(0.03 * x - params.freq1 * t * 4);
          const w2 = params.amp2 * Math.sin(0.03 * x - params.freq2 * t * 4 + phi);
          const y = ySumCenter + (w1 + w2);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTER SCIENCE
  // ═══════════════════════════════════════════════════════════════════════════

  ...DSA_BOARD_SIMULATIONS,
  ...OS_BOARD_SIMULATIONS,
  ...CN_BOARD_SIMULATIONS,
  ...EP_BOARD_SIMULATIONS,
  ...EG_BOARD_SIMULATIONS,
  ...MA_BOARD_SIMULATIONS,
  ...C_BOARD_SIMULATIONS,

  // Older single "Interactive Lab" entry — hidden, kept so saved assignments still open (on the Smart Board)
  {
    id: 'cs-dsa-lab',
    legacy: true,
    title: 'Data Structures & Algorithms Interactive Lab',
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures & algorithms',
    icon: '🧠',
    shortDescription: 'A step-by-step lab for arrays, structures, searching, sorting, trees, and graph traversal.',
    detailedDescription: 'Students can edit input data, choose an operation or algorithm, inspect each state change, and ask the existing subject AI about the current step.',
    learningObjectives: [
      'Trace common data structure operations and algorithm steps',
      'Connect each operation to its pseudocode and complexity',
      'Explain how the current data state changes during execution',
    ],
    suggestedUnits: [1, 2, 3],
    smartboardPresetKey: 'cs-dsa-lab',
    tags: ['DSA', 'Data Structures', 'Algorithms', 'Searching', 'Sorting', 'BFS', 'DFS'],
    parameters: [],
    metrics: [],
    engine: {
      createInitialState: () => ({}),
      update: (state) => state,
      render: (ctx, width, height) => {
        ctx.fillStyle = '#f4f8f4';
        ctx.fillRect(0, 0, width, height);
      },
    },
  },

  // 9. Sorting
  {
    id: 'cs-sorting',
    // Covered by the DSA board simulations above — hidden from the list to avoid duplicates
    legacy: true,
    title: 'Algorithmic Sorting Step-by-Step Race',
    domain: 'COMPUTER_SCIENCE',
    category: 'sorting',
    icon: '📊',
    shortDescription: 'Step-by-step visual race comparing Bubble, Selection, Insertion, and Quick Sort with real-time comparison tallies.',
    detailedDescription: 'Interactive bar visualizer demonstrating sorting algorithm execution. Highlights active comparisons, pivot partitions, and array swaps with live complexity metrics.',
    learningObjectives: [
      'Compare quadratic O(n²) algorithms vs divide-and-conquer O(n log n) approaches',
      'Trace pivot partitioning mechanics in Quicksort',
      'Observe best, worst, and average case performance variations',
    ],
    formulaOverview: 'T_{\\text{Bubble}}(n) = O(n^2), \\quad T_{\\text{Quick}}(n) = O(n \\log n), \\quad \\text{Space} = O(1) \\dots O(\\log n)',
    suggestedUnits: [1, 2],
    smartboardPresetKey: 'cs-sorting',
    tags: ['Algorithms', 'Sorting', 'Complexity', 'Quicksort'],
    parameters: [
      {
        key: 'algorithm',
        label: 'Sorting Algorithm',
        type: 'select',
        default: 'quick',
        options: [
          { label: 'Quick Sort (O(n log n))', value: 'quick' },
          { label: 'Bubble Sort (O(n²))', value: 'bubble' },
          { label: 'Selection Sort (O(n²))', value: 'selection' },
          { label: 'Insertion Sort (O(n²))', value: 'insertion' },
        ],
      },
      { key: 'arraySize', label: 'Array Size (N)', type: 'range', min: 12, max: 40, step: 2, default: 24 },
      { key: 'speed', label: 'Animation Steps / Sec', type: 'range', min: 5, max: 40, step: 5, default: 20 },
    ],
    metrics: [
      {
        id: 'comparisons',
        label: 'Array Comparisons',
        format: (s) => s.comparisons?.toString() || '0',
        badge: 'Comparisons',
        color: 'text-indigo-400',
      },
      {
        id: 'swaps',
        label: 'Element Swaps',
        format: (s) => s.swaps?.toString() || '0',
        badge: 'Swaps',
        color: 'text-rose-400',
      },
      {
        id: 'sorted',
        label: 'Sorted Status',
        format: (s) => (s.isSorted ? 'Array Sorted ✓' : 'Sorting in Progress...'),
      },
    ],
    engine: {
      createInitialState: (params) => {
        const n = params.arraySize;
        const arr = Array.from({ length: n }, (_, i) => Math.floor(((i + 1) / n) * 90) + 10);
        // Shuffle
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = arr[i]!;
          arr[i] = arr[j]!;
          arr[j] = temp;
        }
        return {
          arr,
          i: 0,
          j: 0,
          comparisons: 0,
          swaps: 0,
          isSorted: false,
          activeA: -1,
          activeB: -1,
          stepTimer: 0,
        };
      },
      update: (state, params, dt) => {
        if (state.isSorted) return state;

        const nextTimer = state.stepTimer + dt;
        const stepInterval = 1 / params.speed;
        if (nextTimer < stepInterval) return { ...state, stepTimer: nextTimer };

        const arr = [...state.arr];
        let comparisons = state.comparisons;
        let swaps = state.swaps;
        let i = state.i;
        let j = state.j;
        let activeA = -1;
        let activeB = -1;

        if (params.algorithm === 'bubble') {
          comparisons++;
          activeA = j;
          activeB = j + 1;
          if (arr[j] > arr[j + 1]) {
            [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            swaps++;
          }
          j++;
          if (j >= arr.length - 1 - i) {
            j = 0;
            i++;
            if (i >= arr.length - 1) return { ...state, arr, isSorted: true, comparisons, swaps };
          }
        } else {
          // Default step bubble/selection
          comparisons++;
          activeA = j;
          activeB = j + 1;
          if (arr[j] > arr[j + 1]) {
            [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            swaps++;
          }
          j++;
          if (j >= arr.length - 1) {
            j = 0;
            i++;
            if (i >= arr.length) return { ...state, arr, isSorted: true, comparisons, swaps };
          }
        }

        return { ...state, arr, i, j, comparisons, swaps, activeA, activeB, stepTimer: 0 };
      },
      render: (ctx, w, h, state) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const arr = state.arr;
        const barW = (w - 60) / arr.length;
        const maxVal = 100;
        const chartH = h * 0.7;

        for (let i = 0; i < arr.length; i++) {
          const val = arr[i];
          const barH = (val / maxVal) * chartH;
          const px = 30 + i * barW;
          const py = h * 0.85 - barH;

          if (state.isSorted) {
            ctx.fillStyle = '#10b981';
          } else if (i === state.activeA || i === state.activeB) {
            ctx.fillStyle = '#f43f5e';
          } else {
            ctx.fillStyle = '#6366f1';
          }

          ctx.fillRect(px, py, barW - 3, barH);
        }
      },
    },
  },

  // 10. Data Structures (BST & AVL)
  {
    id: 'cs-datastructures',
    // Covered by the DSA board simulations above — hidden from the list to avoid duplicates
    legacy: true,
    title: 'Binary Search Tree & AVL Tree Explorer',
    domain: 'COMPUTER_SCIENCE',
    category: 'data structures',
    icon: '🌳',
    shortDescription: 'Interactive tree hierarchy demonstrating binary search traversals, AVL height balance factors, and node rotations.',
    detailedDescription: 'Allows visual insertion, search path highlighting, and balance checking in Binary Search Trees. Shows balance factors (h_L - h_R) and animated traversal sequences.',
    learningObjectives: [
      'Observe the logarithmic search property in balanced BSTs vs skewed trees',
      'Understand AVL balance factor invariants: {-1, 0, +1}',
      'Trace In-Order traversal producing sorted monotonic sequences',
    ],
    formulaOverview: 'h = \\lfloor \\log_2 N \\rfloor, \\quad BF = \\text{height}(T_L) - \\text{height}(T_R) \\in \\{-1, 0, 1\\}',
    suggestedUnits: [2, 3],
    smartboardPresetKey: 'cs-datastructures',
    tags: ['Trees', 'Binary Search', 'AVL', 'Data Structures'],
    parameters: [
      { key: 'showBalanceFactors', label: 'Show AVL Balance Factors', type: 'boolean', default: true },
      { key: 'searchValue', label: 'Search Value Highlight', type: 'range', min: 10, max: 90, step: 5, default: 40 },
    ],
    metrics: [
      {
        id: 'nodeCount',
        label: 'Total Nodes',
        format: () => '7 nodes',
        badge: 'Nodes',
      },
      {
        id: 'treeHeight',
        label: 'Tree Height (h)',
        format: () => '3 levels',
      },
      {
        id: 'isBalanced',
        label: 'AVL Balanced',
        format: () => 'Yes (Max BF = 0)',
        color: 'text-emerald-400',
      },
    ],
    engine: {
      createInitialState: () => ({
        nodes: [
          { val: 50, x: 0.5, y: 0.2, left: 1, right: 2, bf: 0 },
          { val: 30, x: 0.28, y: 0.45, left: 3, right: 4, bf: 0 },
          { val: 70, x: 0.72, y: 0.45, left: 5, right: 6, bf: 0 },
          { val: 20, x: 0.16, y: 0.72, left: null, right: null, bf: 0 },
          { val: 40, x: 0.38, y: 0.72, left: null, right: null, bf: 0 },
          { val: 60, x: 0.62, y: 0.72, left: null, right: null, bf: 0 },
          { val: 80, x: 0.84, y: 0.72, left: null, right: null, bf: 0 },
        ],
      }),
      update: (state) => state,
      render: (ctx, w, h, state, params) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const nodes = state.nodes;

        // Draw connecting edges
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        for (const n of nodes) {
          if (n.left !== null) {
            const child = nodes[n.left];
            ctx.beginPath();
            ctx.moveTo(n.x * w, n.y * h);
            ctx.lineTo(child.x * w, child.y * h);
            ctx.stroke();
          }
          if (n.right !== null) {
            const child = nodes[n.right];
            ctx.beginPath();
            ctx.moveTo(n.x * w, n.y * h);
            ctx.lineTo(child.x * w, child.y * h);
            ctx.stroke();
          }
        }

        // Draw Nodes
        for (const n of nodes) {
          const isTarget = n.val === params.searchValue;
          const nx = n.x * w;
          const ny = n.y * h;

          ctx.fillStyle = isTarget ? '#f43f5e' : '#1e293b';
          ctx.strokeStyle = isTarget ? '#fda4af' : '#6366f1';
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.arc(nx, ny, 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(n.val.toString(), nx, ny);

          if (params.showBalanceFactors) {
            ctx.fillStyle = '#38bdf8';
            ctx.font = '10px monospace';
            ctx.fillText(`BF:0`, nx, ny + 30);
          }
        }
      },
    },
  },

  // 11. Algorithms (Pathfinding)
  {
    id: 'cs-algorithms',
    // Covered by the DSA board simulations above — hidden from the list to avoid duplicates
    legacy: true,
    title: 'Graph Pathfinding & Search Visualizer (BFS / DFS / Dijkstra)',
    domain: 'COMPUTER_SCIENCE',
    category: 'algorithms',
    icon: '🧭',
    shortDescription: 'Grid graph pathfinding exploring shortest paths using Breadth-First Search, Depth-First Search, and Dijkstra’s Algorithm.',
    detailedDescription: 'Visualizes frontier expansion, visited cells, and optimal shortest path reconstruction across obstacle mazes.',
    learningObjectives: [
      'Observe FIFO queue frontier in BFS vs LIFO recursion in DFS',
      'Understand Dijkstra’s priority queue relaxation principle on weighted graphs',
      'Verify why BFS guarantees the unweighted shortest path whereas DFS does not',
    ],
    formulaOverview: 'd[v] = \\min_{(u,v) \\in E} \\{d[u] + w(u,v)\\}, \\quad T(V,E) = O(V + E)',
    suggestedUnits: [3, 4],
    smartboardPresetKey: 'cs-algorithms',
    tags: ['Graph Search', 'BFS', 'Dijkstra', 'Pathfinding'],
    parameters: [
      {
        key: 'algorithm',
        label: 'Search Strategy',
        type: 'select',
        default: 'bfs',
        options: [
          { label: 'Breadth-First Search (BFS)', value: 'bfs' },
          { label: 'Dijkstra’s Algorithm', value: 'dijkstra' },
          { label: 'Depth-First Search (DFS)', value: 'dfs' },
        ],
      },
      { key: 'speed', label: 'Exploration Step Speed', type: 'range', min: 10, max: 60, step: 10, default: 30 },
    ],
    metrics: [
      {
        id: 'visitedCount',
        label: 'Visited Cells',
        format: (s) => s.visited?.length.toString() || '0',
        badge: 'Visited',
        color: 'text-sky-400',
      },
      {
        id: 'pathLength',
        label: 'Optimal Path Length',
        format: (s) => (s.pathFound ? `${s.path.length} steps` : 'Searching...'),
        color: 'text-amber-400',
      },
    ],
    engine: {
      createInitialState: () => ({
        gridW: 16,
        gridH: 10,
        start: { x: 2, y: 5 },
        end: { x: 13, y: 5 },
        visited: [] as { x: number; y: number }[],
        path: [] as { x: number; y: number }[],
        queue: [{ x: 2, y: 5 }],
        pathFound: false,
        timer: 0,
      }),
      update: (state, params, dt) => {
        if (state.pathFound || state.queue.length === 0) return state;

        const nextTimer = state.timer + dt;
        if (nextTimer < 1 / params.speed) return { ...state, timer: nextTimer };

        const current = state.queue[0];
        const nextQueue = state.queue.slice(1);
        const visited = [...state.visited, current];

        if (current.x === state.end.x && current.y === state.end.y) {
          // Reconstruct path
          const path: { x: number; y: number }[] = [];
          for (let x = state.start.x; x <= state.end.x; x++) {
            path.push({ x, y: 5 });
          }
          return { ...state, visited, path, pathFound: true, timer: 0 };
        }

        // Neighbors
        const dirs = [
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: -1, y: 0 },
          { x: 0, y: -1 },
        ];
        for (const d of dirs) {
          const nx = current.x + d.x;
          const ny = current.y + d.y;
          if (
            nx >= 0 &&
            nx < state.gridW &&
            ny >= 0 &&
            ny < state.gridH &&
            !visited.some((v) => v.x === nx && v.y === ny) &&
            !nextQueue.some((q: { x: number; y: number }) => q.x === nx && q.y === ny)
          ) {
            nextQueue.push({ x: nx, y: ny });
          }
        }

        return { ...state, visited, queue: nextQueue, timer: 0 };
      },
      render: (ctx, w, h, state) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const cellW = w / state.gridW;
        const cellH = h / state.gridH;

        // Grid lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let x = 0; x <= state.gridW; x++) {
          ctx.beginPath();
          ctx.moveTo(x * cellW, 0);
          ctx.lineTo(x * cellW, h);
          ctx.stroke();
        }
        for (let y = 0; y <= state.gridH; y++) {
          ctx.beginPath();
          ctx.moveTo(0, y * cellH);
          ctx.lineTo(w, y * cellH);
          ctx.stroke();
        }

        // Visited cells (cyan)
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        for (const v of state.visited) {
          ctx.fillRect(v.x * cellW + 1, v.y * cellH + 1, cellW - 2, cellH - 2);
        }

        // Path (gold)
        if (state.pathFound) {
          ctx.fillStyle = '#f59e0b';
          for (const p of state.path) {
            ctx.fillRect(p.x * cellW + 3, p.y * cellH + 3, cellW - 6, cellH - 6);
          }
        }

        // Start (emerald) & End (rose)
        ctx.fillStyle = '#10b981';
        ctx.fillRect(state.start.x * cellW + 2, state.start.y * cellH + 2, cellW - 4, cellH - 4);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(state.end.x * cellW + 2, state.end.y * cellH + 2, cellW - 4, cellH - 4);
      },
    },
  },

  // 12. Networking
  {
    id: 'cs-networking',
    // Replaced by the Computer Networks library above — hidden from the list
    legacy: true,
    subjectKeywords: ['computer network'],
    title: 'IPv4 CIDR Subnetting & Packet Routing Flow',
    domain: 'COMPUTER_SCIENCE',
    category: 'networking',
    icon: '🌐',
    shortDescription: 'Packet flow simulation across router and subnet topologies with CIDR prefix masks, queue delays, and packet loss.',
    detailedDescription: 'Visualizes IPv4 subnet masks (/24 through /30), usable host addresses, and animated packet routing between subnets with router buffer queues.',
    learningObjectives: [
      'Calculate subnet masks, network IDs, and usable host count from CIDR prefixes',
      'Trace packet encapsulation and routing hops across network gateways',
      'Observe queue buffer congestion and packet drop behavior under high transmission rates',
    ],
    formulaOverview: '\\text{Usable Hosts} = 2^{(32 - \\text{CIDR})} - 2, \\quad \\text{Mask} = \\text{CIDR prefix bits}',
    suggestedUnits: [4, 5],
    smartboardPresetKey: 'cs-networking',
    tags: ['Networking', 'CIDR', 'Subnets', 'Routing', 'Packets'],
    parameters: [
      {
        key: 'cidrPrefix',
        label: 'Subnet CIDR Prefix',
        type: 'select',
        default: 26,
        options: [
          { label: '/24 (254 hosts)', value: 24 },
          { label: '/26 (62 hosts)', value: 26 },
          { label: '/28 (14 hosts)', value: 28 },
          { label: '/30 (2 hosts)', value: 30 },
        ],
      },
      { key: 'packetRate', label: 'Packet Rate (pkts/sec)', type: 'range', min: 1, max: 8, step: 1, default: 3 },
      { key: 'packetLoss', label: 'Simulated Drop Rate (%)', type: 'range', min: 0, max: 20, step: 2, default: 0, unit: '%' },
    ],
    metrics: [
      {
        id: 'usableHosts',
        label: 'Usable Hosts / Subnet',
        format: (_s, p) => `${Math.pow(2, 32 - p.cidrPrefix) - 2} addresses`,
        badge: 'Hosts',
        color: 'text-emerald-400',
      },
      {
        id: 'transmitted',
        label: 'Packets Transmitted',
        format: (s) => s.transmittedCount?.toString() || '0',
      },
      {
        id: 'delivered',
        label: 'Packets Delivered',
        format: (s) => s.deliveredCount?.toString() || '0',
        color: 'text-sky-400',
      },
    ],
    engine: {
      createInitialState: () => ({
        packets: [] as { x: number; y: number; progress: number; dropped: boolean }[],
        transmittedCount: 0,
        deliveredCount: 0,
        spawnTimer: 0,
      }),
      update: (state, params, dt) => {
        let spawnTimer = state.spawnTimer + dt;
        let transmittedCount = state.transmittedCount;
        let deliveredCount = state.deliveredCount;
        const packets = [...state.packets];

        if (spawnTimer >= 1 / params.packetRate) {
          spawnTimer = 0;
          transmittedCount++;
          const dropped = Math.random() * 100 < params.packetLoss;
          packets.push({ x: 0.2, y: 0.5, progress: 0, dropped });
        }

        for (let i = packets.length - 1; i >= 0; i--) {
          packets[i].progress += dt * 0.7;
          if (packets[i].progress >= 1.0) {
            if (!packets[i].dropped) deliveredCount++;
            packets.splice(i, 1);
          }
        }

        return { packets, transmittedCount, deliveredCount, spawnTimer };
      },
      render: (ctx, w, h, state) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const routerX = w / 2;
        const routerY = h / 2;
        const hostAX = w * 0.2;
        const hostBX = w * 0.8;

        // Links
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(hostAX, routerY);
        ctx.lineTo(routerX, routerY);
        ctx.lineTo(hostBX, routerY);
        ctx.stroke();

        // Host A
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.fillRect(hostAX - 35, routerY - 30, 70, 60);
        ctx.strokeRect(hostAX - 35, routerY - 30, 70, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Subnet A', hostAX, routerY - 8);
        ctx.fillText('192.168.1.1', hostAX, routerY + 12);

        // Router Gateway
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(routerX, routerY, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Router R1', routerX, routerY + 4);

        // Host B
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.fillRect(hostBX - 35, routerY - 30, 70, 60);
        ctx.strokeRect(hostBX - 35, routerY - 30, 70, 60);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Subnet B', hostBX, routerY - 8);
        ctx.fillText('192.168.1.65', hostBX, routerY + 12);

        // Animated Packets
        for (const pkt of state.packets) {
          const px = hostAX + pkt.progress * (hostBX - hostAX);
          const py = routerY;

          ctx.fillStyle = pkt.dropped && pkt.progress > 0.5 ? '#f43f5e' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CIVIL ENGINEERING
  // ═══════════════════════════════════════════════════════════════════════════

  // 13. Structural Analysis
  {
    id: 'civil-structural',
    title: 'Beam Shear Force & Bending Moment (SFD/BMD) Analyzer',
    domain: 'CIVIL',
    category: 'structural analysis',
    icon: '🏗️',
    shortDescription: 'Structural analysis of simply supported and cantilever beams plotting Shear Force (SFD), Bending Moment (BMD), and elastic deflection.',
    detailedDescription: 'Calculates support reactions RA and RB under point loads and uniformly distributed loads (UDL). Generates continuous shear force diagrams, parabolic bending moment diagrams, and elastic deflection curves.',
    learningObjectives: [
      'Derive support reactions from static equilibrium equations ΣFy = 0 and ΣM = 0',
      'Identify zero-shear inflection locations corresponding to maximum bending moments',
      'Visualize beam elastic deflection under varying load combinations',
    ],
    formulaOverview: 'R_A + R_B = P + wL, \\quad V(x) = R_A - wx, \\quad M(x) = R_A x - \\frac{wx^2}{2}, \\quad M_{\\max} \\text{ at } V=0',
    suggestedUnits: [1, 2],
    smartboardPresetKey: 'civil-structural',
    tags: ['Structures', 'Beams', 'SFD', 'BMD', 'Deflection'],
    parameters: [
      { key: 'spanLength', label: 'Beam Span (L)', type: 'range', min: 4, max: 12, step: 1, default: 8, unit: 'm' },
      { key: 'pointLoad', label: 'Point Load (P)', type: 'range', min: 0, max: 80, step: 5, default: 40, unit: 'kN' },
      { key: 'loadPos', label: 'Point Load Position (a)', type: 'range', min: 1, max: 7, step: 0.5, default: 4, unit: 'm' },
      { key: 'udl', label: 'Distributed Load (w)', type: 'range', min: 0, max: 20, step: 2, default: 10, unit: 'kN/m' },
    ],
    metrics: [
      {
        id: 'ra',
        label: 'Reaction R_A',
        format: (_s, p) => {
          const L = p.spanLength;
          const P = p.pointLoad;
          const a = Math.min(p.loadPos, L);
          const b = L - a;
          const w = p.udl;
          const ra = (P * b) / L + (w * L) / 2;
          return `${ra.toFixed(1)} kN`;
        },
        badge: 'Reaction',
        color: 'text-indigo-400',
      },
      {
        id: 'maxM',
        label: 'Max Bending Moment',
        format: (_s, p) => {
          const L = p.spanLength;
          const P = p.pointLoad;
          const a = Math.min(p.loadPos, L);
          const b = L - a;
          const w = p.udl;
          const ra = (P * b) / L + (w * L) / 2;
          const mMid = ra * a - (w * a * a) / 2;
          return `${mMid.toFixed(1)} kNm`;
        },
        badge: 'Moment',
        color: 'text-emerald-400',
      },
      {
        id: 'maxDeflection',
        label: 'Max Elastic Deflection',
        format: (_s, p) => `${((p.pointLoad + p.udl * p.spanLength) * 0.15).toFixed(1)} mm`,
      },
    ],
    engine: {
      createInitialState: () => ({}),
      update: (s) => s,
      render: (ctx, w, h, _s, params) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const L = params.spanLength;
        const P = params.pointLoad;
        const a = Math.min(params.loadPos, L);
        const b = L - a;
        const udl = params.udl;

        const ra = (P * b) / L + (udl * L) / 2;
        const rb = (P * a) / L + (udl * L) / 2;

        const startX = 60;
        const endX = w - 60;
        const beamW = endX - startX;

        // 1. Physical Beam View
        const beamY = h * 0.22;
        ctx.fillStyle = '#475569';
        ctx.fillRect(startX, beamY - 8, beamW, 16);

        // Supports
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(startX, beamY + 8);
        ctx.lineTo(startX - 12, beamY + 28);
        ctx.lineTo(startX + 12, beamY + 28);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(endX, beamY + 8);
        ctx.lineTo(endX - 12, beamY + 28);
        ctx.lineTo(endX + 12, beamY + 28);
        ctx.closePath();
        ctx.fill();

        // Point Load Arrow
        if (P > 0) {
          const loadX = startX + (a / L) * beamW;
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(loadX, beamY - 50);
          ctx.lineTo(loadX, beamY - 8);
          ctx.stroke();

          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.moveTo(loadX, beamY - 8);
          ctx.lineTo(loadX - 6, beamY - 18);
          ctx.lineTo(loadX + 6, beamY - 18);
          ctx.closePath();
          ctx.fill();
        }

        // 2. Shear Force Diagram (SFD)
        const sfdY = h * 0.52;
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, sfdY);
        ctx.lineTo(endX, sfdY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, sfdY);
        ctx.lineTo(startX, sfdY - ra * 0.7);

        const loadX = startX + (a / L) * beamW;
        ctx.lineTo(loadX, sfdY - (ra - udl * a) * 0.7);
        ctx.lineTo(loadX, sfdY - (ra - udl * a - P) * 0.7);
        ctx.lineTo(endX, sfdY + rb * 0.7);
        ctx.lineTo(endX, sfdY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3. Bending Moment Diagram (BMD)
        const bmdY = h * 0.8;
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, bmdY);
        ctx.lineTo(endX, bmdY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, bmdY);
        for (let px = startX; px <= endX; px += 4) {
          const x = ((px - startX) / beamW) * L;
          let m = ra * x - (udl * x * x) / 2;
          if (x > a) m -= P * (x - a);
          ctx.lineTo(px, bmdY - m * 0.6);
        }
        ctx.lineTo(endX, bmdY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      },
    },
  },

  // 14. Surveying
  {
    id: 'civil-surveying',
    title: 'Theodolite Triangulation & Differential Levelling',
    domain: 'CIVIL',
    category: 'surveying',
    icon: '🔭',
    shortDescription: 'Virtual theodolite setup calculating height of instrument, line of sight collimation, staff readings, and reduced level elevation.',
    detailedDescription: 'Simulates total station and transit theodolite triangulation. Computes Reduced Level (RL) from benchmark backsight readings and vertical trigonometric angles.',
    learningObjectives: [
      'Grasp Height of Instrument (HI = Benchmark RL + Backsight) formulation',
      'Compute vertical displacement V = D tan(α) and target elevation',
      'Verify curvature and refraction error considerations in field surveys',
    ],
    formulaOverview: 'HI = RL_{\\text{BM}} + BS, \\quad V = D \\tan\\alpha, \\quad RL_{\\text{Target}} = HI + V - h_{\\text{staff}}',
    suggestedUnits: [2, 3],
    smartboardPresetKey: 'civil-surveying',
    tags: ['Surveying', 'Theodolite', 'Levelling', 'Triangulation'],
    parameters: [
      { key: 'targetDistance', label: 'Horizontal Distance (D)', type: 'range', min: 20, max: 150, step: 10, default: 80, unit: 'm' },
      { key: 'verticalAngle', label: 'Vertical Angle (α)', type: 'range', min: -15, max: 35, step: 1, default: 12, unit: '°' },
      { key: 'instHeight', label: 'Instrument Height (hi)', type: 'range', min: 1.2, max: 1.8, step: 0.1, default: 1.5, unit: 'm' },
      { key: 'benchmarkRL', label: 'Benchmark Elevation (RL)', type: 'range', min: 80, max: 150, step: 5, default: 100, unit: 'm' },
    ],
    metrics: [
      {
        id: 'targetRL',
        label: 'Target Reduced Level (RL)',
        format: (_s, p) => {
          const rad = (p.verticalAngle * Math.PI) / 180;
          const V = p.targetDistance * Math.tan(rad);
          const rl = p.benchmarkRL + p.instHeight + V;
          return `${rl.toFixed(2)} m`;
        },
        badge: 'Target RL',
        color: 'text-amber-400',
      },
      {
        id: 'verticalDiff',
        label: 'Vertical Height (V)',
        format: (_s, p) => {
          const rad = (p.verticalAngle * Math.PI) / 180;
          return `${(p.targetDistance * Math.tan(rad)).toFixed(2)} m`;
        },
      },
    ],
    engine: {
      createInitialState: () => ({}),
      update: (s) => s,
      render: (ctx, w, h, _s, params) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const groundY = h * 0.78;
        const theoX = 90;
        const staffX = w - 90;

        // Ground terrain
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(w, groundY);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fill();

        // Theodolite Tripod
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(theoX, groundY - 45);
        ctx.lineTo(theoX - 20, groundY);
        ctx.moveTo(theoX, groundY - 45);
        ctx.lineTo(theoX + 20, groundY);
        ctx.stroke();

        // Telescope Body
        const rad = (-params.verticalAngle * Math.PI) / 180;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(theoX - 15 * Math.cos(rad), groundY - 45 - 15 * Math.sin(rad));
        ctx.lineTo(theoX + 25 * Math.cos(rad), groundY - 45 + 25 * Math.sin(rad));
        ctx.stroke();

        // Target Levelling Staff
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(staffX - 4, groundY - 140, 8, 140);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1;
        for (let y = groundY - 140; y < groundY; y += 10) {
          ctx.strokeRect(staffX - 4, y, 8, 5);
        }

        // Line of Sight Ray (Cyan dashed)
        const targetY = groundY - 45 + Math.tan(rad) * (staffX - theoX);
        ctx.strokeStyle = '#38bdf8';
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(theoX, groundY - 45);
        ctx.lineTo(staffX, targetY);
        ctx.stroke();
        ctx.setLineDash([]);
      },
    },
  },

  // 15. Construction Simulations
  {
    id: 'civil-construction',
    title: 'Concrete Slump Test & Stress-Strain Constitutive Lab',
    domain: 'CIVIL',
    category: 'construction simulations',
    icon: '🧱',
    shortDescription: 'Simulates ASTM/IS concrete slump cone release and compressive stress-strain constitutive curves for structural concrete grades.',
    detailedDescription: 'Interactive fresh concrete rheology test. Demonstrates true slump, shear slump, and collapse slump based on water-cement ratio (w/c), alongside compressive strength sigma-epsilon curves.',
    learningObjectives: [
      'Correlate water-cement ratio (w/c) to workability and slump height',
      'Distinguish True Slump from Shear and Collapse failure modes',
      'Analyze concrete constitutive non-linear behavior under axial compression',
    ],
    formulaOverview: 'f_{ck} = \\text{Grade Characteristic Strength (MPa)}, \\quad E_c = 5000 \\sqrt{f_{ck}}',
    suggestedUnits: [3, 4],
    smartboardPresetKey: 'civil-construction',
    tags: ['Concrete', 'Slump Test', 'Workability', 'Stress-Strain', 'Materials'],
    parameters: [
      {
        key: 'grade',
        label: 'Concrete Grade',
        type: 'select',
        default: 'M25',
        options: [
          { label: 'M20 (fck = 20 MPa)', value: 'M20' },
          { label: 'M25 (fck = 25 MPa)', value: 'M25' },
          { label: 'M30 (fck = 30 MPa)', value: 'M30' },
          { label: 'M40 (fck = 40 MPa)', value: 'M40' },
        ],
      },
      { key: 'wcRatio', label: 'Water-Cement Ratio (w/c)', type: 'range', min: 0.35, max: 0.65, step: 0.05, default: 0.48 },
      { key: 'plasticizer', label: 'Superplasticizer Dose (%)', type: 'range', min: 0, max: 1.5, step: 0.25, default: 0.5, unit: '%' },
    ],
    metrics: [
      {
        id: 'slumpVal',
        label: 'Measured Slump',
        format: (_s, p) => {
          const s = Math.round((p.wcRatio - 0.35) * 400 + p.plasticizer * 30);
          return `${Math.min(220, Math.max(20, s))} mm`;
        },
        badge: 'Slump',
        color: 'text-amber-400',
      },
      {
        id: 'workability',
        label: 'Workability Degree',
        format: (_s, p) => {
          const s = (p.wcRatio - 0.35) * 400 + p.plasticizer * 30;
          if (s < 50) return 'Low (Pavement Quality)';
          if (s < 120) return 'Medium (Normal Reinforced Concrete)';
          return 'High (Congested Rebar / Tremie)';
        },
      },
      {
        id: 'elasticModulus',
        label: 'Elastic Modulus (E_c)',
        format: (_s, p) => {
          const fck = Number(p.grade.replace('M', '')) || 25;
          return `${(5000 * Math.sqrt(fck)).toFixed(0)} MPa`;
        },
      },
    ],
    engine: {
      createInitialState: () => ({ coneLift: 0 }),
      update: (state, _p, dt) => ({ coneLift: Math.min(1.0, state.coneLift + dt * 0.6) }),
      render: (ctx, w, h, state, params) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        const leftCx = w * 0.3;
        const rightCx = w * 0.72;
        const baseCy = h * 0.8;

        // Left: Slump Cone Animation
        const sVal = Math.min(220, Math.max(20, (params.wcRatio - 0.35) * 400 + params.plasticizer * 30));
        const slumpDrop = (sVal / 220) * 40 * state.coneLift;

        // Base Plate
        ctx.fillStyle = '#334155';
        ctx.fillRect(leftCx - 80, baseCy, 160, 8);

        // Slumped Concrete mound
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(leftCx - 60, baseCy);
        ctx.lineTo(leftCx - 30, baseCy - (120 - slumpDrop));
        ctx.lineTo(leftCx + 30, baseCy - (120 - slumpDrop));
        ctx.lineTo(leftCx + 60, baseCy);
        ctx.closePath();
        ctx.fill();

        // Lifted Cone (Grey metallic outline)
        const coneY = baseCy - state.coneLift * 140;
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(leftCx - 60, coneY);
        ctx.lineTo(leftCx - 30, coneY - 120);
        ctx.lineTo(leftCx + 30, coneY - 120);
        ctx.lineTo(leftCx + 60, coneY);
        ctx.closePath();
        ctx.stroke();

        // Right: Stress-Strain Curve σ-ε
        const chartW = w * 0.22;
        const chartH = h * 0.55;
        const chartX = rightCx - chartW / 2;
        const chartY = baseCy - chartH;

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(chartX, chartY);
        ctx.lineTo(chartX, baseCy);
        ctx.lineTo(chartX + chartW, baseCy);
        ctx.stroke();

        const fck = Number(params.grade.replace('M', '')) || 25;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let px = 0; px <= chartW; px += 2) {
          const eps = (px / chartW) * 0.0035;
          let sigma = 0;
          if (eps <= 0.002) {
            sigma = 0.67 * fck * (2 * (eps / 0.002) - Math.pow(eps / 0.002, 2));
          } else {
            sigma = 0.67 * fck;
          }
          const py = baseCy - (sigma / 35) * chartH;
          if (px === 0) ctx.moveTo(chartX + px, py);
          else ctx.lineTo(chartX + px, py);
        }
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText('Concrete σ-ε Constitutive Curve', chartX + 10, chartY + 20);
      },
    },
  },
];

/**
 * Simulations for one subject.
 * 1. Only the subject's domain (Maths, Physics, CS, Civil).
 * 2. Simulations tagged with subject words (DSA, Networking, …) appear only in
 *    subjects whose name/code contains one of those words.
 * 3. A subject that matches no tagged simulation gets the untagged (general)
 *    simulations of its domain.
 */
export function getSimulationsForSubject(subject: { subjectName?: string; subjectCode?: string; department?: any }): ISimulationDefinition[] {
  const domain = resolveSubjectDomain(subject);
  const text = `${subject.subjectName || ''} ${subject.subjectCode || ''}`.toLowerCase();
  const inDomain = SIMULATION_REGISTRY.filter((s) => s.domain === domain && !s.legacy);
  const matched = inDomain.filter((s) => s.subjectKeywords?.some((k) => text.includes(k)));
  const list = matched.length ? matched : inDomain.filter((s) => !s.subjectKeywords?.length);
  return [
    ...list.filter((s) => s.dsaCategory || s.osCategory || s.cCategory || s.boardEngine === 'cn' || s.boardEngine === 'ep' || s.boardEngine === 'eg' || s.boardEngine === 'ma'),
    ...list.filter((s) => !s.dsaCategory && !s.osCategory && !s.cCategory && s.boardEngine !== 'cn' && s.boardEngine !== 'ep' && s.boardEngine !== 'eg' && s.boardEngine !== 'ma'),
  ];
}

export function getSimulationsByDomain(domain: string): ISimulationDefinition[] {
  return SIMULATION_REGISTRY.filter((s) => s.domain === domain);
}

export function getSimulationById(id: string): ISimulationDefinition | undefined {
  return SIMULATION_REGISTRY.find((s) => s.id === id);
}
