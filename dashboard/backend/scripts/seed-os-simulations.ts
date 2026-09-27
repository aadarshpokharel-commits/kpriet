import mongoose from 'mongoose';
import { Subject, Content, User, Semester, Department } from '../src/models/index.js';
import { ContentType, ContentStatus } from '../src/types/academic.types.js';

interface OsSimSpec {
  id: string;
  category: string;
  title: string;
  unit: number;
  description: string;
  tags: string[];
}

const OS_SIMULATIONS: OsSimSpec[] = [
  // Unit 1 — Process Management
  {
    id: 'os-process-states',
    category: 'process-states',
    title: 'Process State Simulator',
    unit: 1,
    description: 'Simulate New, Ready, Running, Waiting, and Terminated transitions with scheduler dispatch and I/O interrupts.',
    tags: ['Process', 'States', 'Transitions', 'Lifecycle']
  },
  {
    id: 'os-pcb',
    category: 'pcb',
    title: 'Process Control Block Visualizer',
    unit: 1,
    description: 'Inspect PCB data structures including PID, PC, CPU registers, memory limits, and open file tables.',
    tags: ['PCB', 'Process Management', 'Registers']
  },
  {
    id: 'os-process-scheduling',
    category: 'scheduling-queues',
    title: 'Process Scheduling Visualizer',
    unit: 1,
    description: 'Visualize Job Queue, Ready Queue, and Device Queue handled by Long, Short, and Medium Term Schedulers.',
    tags: ['Queues', 'Schedulers', 'Job Queue', 'Ready Queue']
  },
  {
    id: 'os-context-switching',
    category: 'context-switch',
    title: 'Context Switching Simulator',
    unit: 1,
    description: 'Animate CPU state saving into PCB1, kernel context switch overhead, and state restoration from PCB2.',
    tags: ['Context Switch', 'CPU Overhead', 'State Save']
  },
  {
    id: 'os-process-vs-threads',
    category: 'threads',
    title: 'Process vs Thread Visualizer',
    unit: 1,
    description: 'Compare heavyweight isolated processes against lightweight threads sharing address space, code, and data.',
    tags: ['Threads', 'Multithreading', 'Memory Sharing']
  },

  // Unit 2 — CPU Scheduling
  {
    id: 'os-fcfs',
    category: 'fcfs',
    title: 'FCFS Scheduling Simulator',
    unit: 2,
    description: 'First-Come First-Served scheduling with dynamic Gantt chart, turnaround/waiting times, and convoy effect.',
    tags: ['FCFS', 'CPU Scheduling', 'Convoy Effect', 'Gantt Chart']
  },
  {
    id: 'os-sjf',
    category: 'sjf',
    title: 'SJF Scheduling Simulator',
    unit: 2,
    description: 'Shortest Job First scheduling (preemptive SRTF & non-preemptive) minimizing average waiting time.',
    tags: ['SJF', 'SRTF', 'Preemptive', 'Non-preemptive']
  },
  {
    id: 'os-priority',
    category: 'priority',
    title: 'Priority Scheduling Simulator',
    unit: 2,
    description: 'Priority-based process scheduling with preemptive preemption, starvation demonstration, and aging mitigation.',
    tags: ['Priority', 'Aging', 'Starvation', 'Gantt Chart']
  },
  {
    id: 'os-round-robin',
    category: 'round-robin',
    title: 'Round Robin Scheduling Simulator',
    unit: 2,
    description: 'Time quantum preemption in a circular ready queue with dynamic remaining burst tracking and Gantt chart.',
    tags: ['Round Robin', 'Time Quantum', 'Circular Queue']
  },
  {
    id: 'os-scheduling-comparison',
    category: 'cpu-comparison',
    title: 'CPU Scheduling Comparison',
    unit: 2,
    description: 'Side-by-side comparative benchmark of FCFS, SJF, Priority, and Round Robin on identical workload sets.',
    tags: ['Comparison', 'Benchmark', 'Metrics', 'Turnaround Time']
  },
  {
    id: 'os-gantt-chart',
    category: 'gantt-chart',
    title: 'Interactive Gantt Chart Generator',
    unit: 2,
    description: 'Custom timeline constructor calculating CPU utilization, throughput, waiting time, and completion milestones.',
    tags: ['Gantt Chart', 'Timeline', 'CPU Utilization', 'Throughput']
  },

  // Unit 3 — Deadlocks and Memory Management
  {
    id: 'os-deadlock',
    category: 'deadlock',
    title: 'Deadlock Simulator',
    unit: 3,
    description: 'Simulate mutual exclusion, hold and wait, no preemption, and circular wait triggering system deadlocks.',
    tags: ['Deadlock', 'Coffman Conditions', 'Mutual Exclusion', 'Circular Wait']
  },
  {
    id: 'os-rag',
    category: 'rag',
    title: 'Resource Allocation Graph',
    unit: 3,
    description: 'Construct request and assignment edges between processes and resources with cycle detection.',
    tags: ['RAG', 'Cycle Detection', 'Graph', 'Edges']
  },
  {
    id: 'os-bankers',
    category: 'bankers',
    title: "Banker's Algorithm Simulator",
    unit: 3,
    description: "Deadlock avoidance algorithm verifying safe sequences with Allocation, Max, Need, and Available matrices.",
    tags: ["Banker's Algorithm", 'Safe Sequence', 'Deadlock Avoidance', 'Need Matrix']
  },
  {
    id: 'os-first-fit',
    category: 'first-fit',
    title: 'First Fit Memory Allocation',
    unit: 3,
    description: 'Contiguous partition allocation placing arriving jobs into the first sufficiently sized memory block.',
    tags: ['First Fit', 'Memory Allocation', 'Partitions']
  },
  {
    id: 'os-best-fit',
    category: 'best-fit',
    title: 'Best Fit Memory Allocation',
    unit: 3,
    description: 'Allocates the smallest free block that is large enough, minimizing leftover unallocated fragment.',
    tags: ['Best Fit', 'Contiguous Allocation', 'Memory Management']
  },
  {
    id: 'os-worst-fit',
    category: 'worst-fit',
    title: 'Worst Fit Memory Allocation',
    unit: 3,
    description: 'Allocates the largest available partition to leave the largest remaining free fragment for subsequent jobs.',
    tags: ['Worst Fit', 'Partitioning', 'Residual Blocks']
  },
  {
    id: 'os-fragmentation',
    category: 'fragmentation',
    title: 'Memory Fragmentation Visualizer',
    unit: 3,
    description: 'Visualize internal vs external memory fragmentation with dynamic compaction and partition coalescing.',
    tags: ['Fragmentation', 'Compaction', 'Internal Fragmentation', 'External Fragmentation']
  },

  // Unit 4 — Memory Management (Paging & Virtual Memory)
  {
    id: 'os-paging',
    category: 'paging',
    title: 'Paging Visualizer',
    unit: 4,
    description: 'Divide physical memory into fixed frames and logical memory into pages to eliminate external fragmentation.',
    tags: ['Paging', 'Frames', 'Pages', 'Memory Mapping']
  },
  {
    id: 'os-page-table',
    category: 'page-table',
    title: 'Page Table Simulator',
    unit: 4,
    description: 'Simulate page table lookups with frame base address, valid-invalid bit flags, and access permissions.',
    tags: ['Page Table', 'Frames', 'Valid Bit', 'Permissions']
  },
  {
    id: 'os-address-translation',
    category: 'address-translation',
    title: 'Logical-to-Physical Address Translation',
    unit: 4,
    description: 'Break binary logical addresses into page number (p) and offset (d) to compute physical frame addresses (f*d).',
    tags: ['Address Translation', 'Offset', 'Page Number', 'Physical Address']
  },
  {
    id: 'os-page-fault',
    category: 'page-fault',
    title: 'Page Fault Simulator',
    unit: 4,
    description: 'Animate page fault service routine: trap, OS disk swap, frame allocation, page table update, and restart.',
    tags: ['Page Fault', 'Trap', 'Disk I/O', 'Service Routine']
  },
  {
    id: 'os-virtual-memory',
    category: 'virtual-memory',
    title: 'Virtual Memory Visualizer',
    unit: 4,
    description: 'Visualize demand paging, backing store swap space, and execution of programs exceeding physical RAM.',
    tags: ['Virtual Memory', 'Demand Paging', 'Swap Space', 'Working Set']
  },
  {
    id: 'os-fifo-replacement',
    category: 'fifo-replacement',
    title: 'FIFO Page Replacement',
    unit: 4,
    description: "First-In First-Out page replacement algorithm tracking frame queue, page hits, faults, and Belady anomaly.",
    tags: ['FIFO', 'Page Replacement', "Belady's Anomaly", 'Hit Ratio']
  },
  {
    id: 'os-lru-replacement',
    category: 'lru-replacement',
    title: 'LRU Page Replacement',
    unit: 4,
    description: 'Least Recently Used page replacement algorithm using reference time tracking and stack replacement order.',
    tags: ['LRU', 'Page Replacement', 'Stack', 'Hit Ratio']
  },
  {
    id: 'os-optimal-replacement',
    category: 'optimal-replacement',
    title: 'Optimal Page Replacement',
    unit: 4,
    description: 'Optimal (OPT / MIN) page replacement replacing the page that will not be used for the longest future period.',
    tags: ['Optimal', 'OPT', 'Page Replacement', 'Benchmark']
  },
  {
    id: 'os-page-replacement-comparison',
    category: 'replacement-comparison',
    title: 'Page Replacement Comparison',
    unit: 4,
    description: 'Side-by-side benchmark comparing FIFO, LRU, and Optimal on identical reference strings and frame capacities.',
    tags: ['Page Replacement', 'Comparison', 'Hit Ratios', 'Fault Curves']
  },

  // Unit 5 — File and Disk Management
  {
    id: 'os-file-allocation',
    category: 'file-allocation',
    title: 'File Allocation Visualizer',
    unit: 5,
    description: 'Compare Contiguous, Linked, and Indexed file allocation methods on disk sectors with speed and storage metrics.',
    tags: ['File System', 'File Allocation', 'Sectors', 'Contiguous', 'Linked', 'Indexed']
  },
  {
    id: 'os-contiguous-allocation',
    category: 'contiguous-allocation',
    title: 'Contiguous Allocation Simulator',
    unit: 5,
    description: 'Allocate files as continuous contiguous disk blocks with start block and length in directory entries.',
    tags: ['Contiguous Allocation', 'Disk Blocks', 'Directory']
  },
  {
    id: 'os-linked-allocation',
    category: 'linked-allocation',
    title: 'Linked Allocation Simulator',
    unit: 5,
    description: 'Non-contiguous block allocation where each disk sector maintains a forward pointer to the next block.',
    tags: ['Linked Allocation', 'FAT', 'Disk Pointers']
  },
  {
    id: 'os-indexed-allocation',
    category: 'indexed-allocation',
    title: 'Indexed Allocation Simulator',
    unit: 5,
    description: 'Store block pointers in dedicated index blocks supporting direct random access without external fragmentation.',
    tags: ['Indexed Allocation', 'Index Block', 'Direct Access']
  },
  {
    id: 'os-disk-scheduling',
    category: 'disk-scheduling',
    title: 'Disk Scheduling Simulator',
    unit: 5,
    description: 'Interactive cylinder visualizer simulating head seek travel across track request queues.',
    tags: ['Disk Scheduling', 'Seek Time', 'Cylinder', 'Platter']
  },
  {
    id: 'os-disk-fcfs',
    category: 'disk-fcfs',
    title: 'FCFS Disk Scheduling',
    unit: 5,
    description: 'First-Come First-Served disk track access servicing requests in their exact arrival sequence.',
    tags: ['FCFS', 'Disk Scheduling', 'Head Travel']
  },
  {
    id: 'os-disk-sstf',
    category: 'disk-sstf',
    title: 'SSTF Disk Scheduling',
    unit: 5,
    description: 'Shortest Seek Time First disk head scheduling picking the closest track to current head location.',
    tags: ['SSTF', 'Seek Time', 'Proximity']
  },
  {
    id: 'os-disk-scan',
    category: 'disk-scan',
    title: 'SCAN Disk Scheduling',
    unit: 5,
    description: 'Elevator algorithm sweeping arm from current track to disk boundary servicing requests before reversing.',
    tags: ['SCAN', 'Elevator Algorithm', 'Boundary Sweep']
  },
  {
    id: 'os-disk-cscan',
    category: 'disk-cscan',
    title: 'C-SCAN Disk Scheduling',
    unit: 5,
    description: 'Circular SCAN servicing requests in one forward direction only, then immediately returning to start without service.',
    tags: ['C-SCAN', 'Circular SCAN', 'Uniform Wait']
  },
  {
    id: 'os-disk-comparison',
    category: 'disk-comparison',
    title: 'Disk Scheduling Comparison',
    unit: 5,
    description: 'Side-by-side benchmark comparing FCFS, SSTF, SCAN, and C-SCAN on identical track request sequences.',
    tags: ['Disk Scheduling', 'Comparison', 'Total Seek Distance']
  }
];

async function seedOsSimulations() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduverse';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoUri);

    // Locate IT Department
    const itDept = await Department.findOne({
      $or: [{ code: 'IT' }, { name: { $regex: /information technology/i } }]
    });

    if (!itDept) {
      throw new Error('IT Department not found in database!');
    }

    // Locate Semester 4
    let sem4 = await Semester.findOne({
      department: itDept._id,
      semesterNumber: 4,
    });

    if (!sem4) {
      sem4 = await Semester.findOne({ semesterNumber: 4 });
    }

    // Locate Operating Systems Subject (U21CS403)
    let osSubject = await Subject.findOne({
      subjectCode: 'U21CS403',
      department: itDept._id,
    });

    if (!osSubject) {
      osSubject = await Subject.findOne({ subjectCode: 'U21CS403' });
    }

    if (!osSubject) {
      // Fallback search by title
      osSubject = await Subject.findOne({
        subjectName: { $regex: /operating systems/i },
        department: itDept._id,
      });
    }

    if (!osSubject) {
      throw new Error('Operating Systems subject (U21CS403) not found in database!');
    }

    console.log(`Found Subject: [${osSubject.subjectCode}] ${osSubject.subjectName} (${osSubject._id})`);

    // Locate Teacher (assigned to subject or IT Sem 4 demo teacher)
    let teacher = null;
    if (osSubject.assignedTeacher) {
      teacher = await User.findById(osSubject.assignedTeacher);
    }
    if (!teacher) {
      teacher = await User.findOne({ email: 'it.sem4.teacher@kpriet.ac.in' });
    }
    if (!teacher) {
      teacher = await User.findOne({ role: 'TEACHER', department: itDept._id });
    }
    if (!teacher) {
      teacher = await User.findOne({ role: 'TEACHER' });
    }

    if (!teacher) {
      throw new Error('No valid teacher account found to associate with simulations!');
    }

    console.log(`Using Teacher: ${teacher.name} (${teacher.email})`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const sim of OS_SIMULATIONS) {
      const existing = await Content.findOne({
        subject: osSubject._id,
        contentType: ContentType.SIMULATIONS,
        $or: [
          { 'simulationConfig.smartboardPresetId': sim.id },
          { title: sim.title }
        ]
      });

      const payload = {
        title: sim.title,
        description: sim.description,
        contentType: ContentType.SIMULATIONS,
        department: itDept._id,
        semester: sem4 ? sem4._id : osSubject.semester,
        subject: osSubject._id,
        teacher: teacher._id,
        chapterOrUnit: sim.unit,
        tags: sim.tags,
        simulationConfig: {
          type: 'smartboard-os-lab',
          smartboardPresetId: sim.id,
          category: sim.category,
          domain: 'COMPUTER_SCIENCE',
          initialParams: {
            simulationId: sim.id,
            category: sim.category,
            topic: sim.title,
            unit: sim.unit,
          },
          controls: ['play', 'pause', 'step-forward', 'step-backward', 'reset', 'speed', 'config', 'ai-explain']
        },
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date()
      };

      if (existing) {
        await Content.updateOne({ _id: existing._id }, { $set: payload });
        updatedCount++;
      } else {
        await Content.create(payload);
        createdCount++;
      }
    }

    console.log(`\n🎉 Operating Systems Simulations Seeded Successfully!`);
    console.log(`   Total Simulations: ${OS_SIMULATIONS.length}`);
    console.log(`   Newly Created: ${createdCount}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Subject: [${osSubject.subjectCode}] ${osSubject.subjectName}`);
    console.log(`   All 5 Units covered with Smart Board integration!`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Operating Systems simulations:', error);
    process.exit(1);
  }
}

seedOsSimulations();
