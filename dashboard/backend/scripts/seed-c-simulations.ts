import mongoose from 'mongoose';
import { Subject, Content, User, Semester, Department } from '../src/models/index.js';
import { ContentType, ContentStatus } from '../src/types/academic.types.js';

interface CSimSpec {
  id: string;
  category: string;
  title: string;
  unit: number;
  description: string;
  tags: string[];
}

const C_SIMULATIONS: CSimSpec[] = [
  // Unit 1 — Problem Solving & C Basics
  {
    id: 'c-execution',
    category: 'execution',
    title: 'C Program Execution Visualizer (Flagship)',
    unit: 1,
    description: 'Execute C source code statement-by-statement with active line highlighting, live stack memory allocation, and real-time output terminal.',
    tags: ['C Programming', 'Execution', 'Compiler', 'Memory Layout', 'Flagship']
  },
  {
    id: 'c-memory',
    category: 'memory',
    title: 'Variable & Memory Visualizer',
    unit: 1,
    description: 'Visualize data types (char, int, float, double), byte sizes, stack frame growth, and hexadecimal addresses (0x7ffe...).',
    tags: ['Variables', 'Data Types', 'Memory Stack', 'Addresses', 'Bytes']
  },
  {
    id: 'c-number-systems',
    category: 'number-systems',
    title: 'Number System Simulator',
    unit: 1,
    description: 'Interactive converter between Decimal, Binary, Octal, and Hexadecimal with step-by-step division, remainder extraction, and bitwise layout.',
    tags: ['Number Systems', 'Binary', 'Hexadecimal', 'Conversion', 'Bits']
  },
  {
    id: 'c-flowchart',
    category: 'flowchart',
    title: 'Algorithm & Flowchart Builder',
    unit: 1,
    description: 'Construct and step through standard algorithms with Sequence, Decision Diamonds, Loops, and animated active path flow.',
    tags: ['Algorithm', 'Flowchart', 'Logic', 'Control Flow', 'Diagram']
  },

  // Unit 2 — Control Structures & Arrays
  {
    id: 'c-if-else',
    category: 'if-else',
    title: 'If-Else Execution Simulator',
    unit: 2,
    description: 'Simulate relational conditions, boolean true/false evaluation, branch routing, and dead-code skipping.',
    tags: ['If-Else', 'Branching', 'Conditions', 'Decision Making', 'Relational']
  },
  {
    id: 'c-loops',
    category: 'loops',
    title: 'Loop Visualizer (for / while / do-while)',
    unit: 2,
    description: 'Trace loop initialization, condition testing, body iteration, and loop counter updates with boundary checks.',
    tags: ['Loops', 'Iteration', 'For', 'While', 'Do-While', 'Counters']
  },
  {
    id: 'c-arrays',
    category: 'arrays',
    title: 'Array Visualizer (1D & 2D)',
    unit: 2,
    description: 'Inspect 1D arrays and 2D matrices with zero-based index access, contiguous memory offsets, and element mutations.',
    tags: ['Arrays', '1D Array', '2D Array', 'Indexing', 'Memory Offsets']
  },
  {
    id: 'c-searching',
    category: 'searching',
    title: 'Searching Visualizer (Linear & Binary)',
    unit: 2,
    description: 'Step through Linear Search and Binary Search with active key comparisons, low/mid/high pointers, and comparison counters.',
    tags: ['Searching', 'Binary Search', 'Linear Search', 'Comparisons', 'Divide & Conquer']
  },
  {
    id: 'c-sorting',
    category: 'sorting',
    title: 'Sorting Visualizer (Bubble, Selection, Insertion)',
    unit: 2,
    description: 'Visualize element comparisons, in-place swaps, pass milestones, and sorted partition boundaries.',
    tags: ['Sorting', 'Bubble Sort', 'Selection Sort', 'Insertion Sort', 'Swaps']
  },

  // Unit 3 — Pointers & Strings
  {
    id: 'c-pointers',
    category: 'pointers',
    title: 'Pointer Visualizer',
    unit: 3,
    description: 'Visualize variables, address-of operator (&), pointer variables (*ptr), dereferencing, and pointer arithmetic (+4 bytes).',
    tags: ['Pointers', 'Addresses', 'Dereferencing', 'Memory', 'Indirection']
  },
  {
    id: 'c-pass-by-value-ref',
    category: 'pass-by-value-ref',
    title: 'Pass-by-Value vs Pass-by-Reference',
    unit: 3,
    description: 'Side-by-side stack frame comparison of function parameter passing: isolated value copies vs direct caller memory mutation via pointers.',
    tags: ['Functions', 'Pointers', 'Pass by Value', 'Pass by Reference', 'Swap']
  },
  {
    id: 'c-strings',
    category: 'strings',
    title: 'String Visualizer & Operations',
    unit: 3,
    description: 'Inspect character arrays with index markers, explicit null character sentinel (\\0), and string functions (strlen, strcpy).',
    tags: ['Strings', 'Char Array', 'Null Terminator', 'strlen', 'strcpy']
  },

  // Unit 4 — Functions & Recursion
  {
    id: 'c-call-stack',
    category: 'call-stack',
    title: 'Function Call / Call Stack Visualizer',
    unit: 4,
    description: 'Simulate function invocation, parameter passing, activation records, local variables, return values, and stack frame push/pop.',
    tags: ['Functions', 'Call Stack', 'Stack Frames', 'Activation Record', 'Push Pop']
  },
  {
    id: 'c-recursion',
    category: 'recursion',
    title: 'Recursion Visualizer',
    unit: 4,
    description: 'Trace recursive function call tree expansion, base condition verification, and return value unwinding (Factorial / Fibonacci).',
    tags: ['Recursion', 'Base Case', 'Stack Tree', 'Factorial', 'Fibonacci']
  },

  // Unit 5 — Structures, Unions & Files
  {
    id: 'c-structures-unions',
    category: 'structures-unions',
    title: 'Structure & Union Visualizer',
    unit: 5,
    description: 'Compare struct contiguous member memory layout against union overlapping shared memory with member overwriting.',
    tags: ['Structures', 'Unions', 'Memory Layout', 'Padding', 'Shared Memory']
  },
  {
    id: 'c-file-io',
    category: 'file-io',
    title: 'File Processing Simulator',
    unit: 5,
    description: 'Simulate file stream operations: fopen (modes r/w/a), fputs, fread, fseek, file position indicators, and fclose.',
    tags: ['File I/O', 'fopen', 'fclose', 'Streams', 'File Pointer', 'EOF']
  }
];

async function seedCSimulations() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduverse';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoUri);

    // Locate IT Department
    const itDept = await Department.findOne({
      $or: [{ code: 'IT' }, { name: { $regex: /information technology/i } }]
    });

    if (!itDept) {
      throw new Error('IT Department not found in database!');
    }

    // Locate Semester 1
    let sem1 = await Semester.findOne({
      department: itDept._id,
      semesterNumber: 1,
    });
    if (!sem1) {
      sem1 = await Semester.findOne({ semesterNumber: 1 });
    }

    // Locate Subject: Problem Solving and C Programming (U21CS101 / U21CSG01)
    let cSubject = await Subject.findOne({
      department: itDept._id,
      $or: [
        { subjectCode: { $in: ['U25CSG02', 'U21CS101', 'U21CSG01'] } },
        { subjectName: { $regex: /c programming|problem solving/i } }
      ]
    });

    if (!cSubject) {
      cSubject = await Subject.findOne({
        $or: [
          { subjectCode: { $in: ['U25CSG02', 'U21CS101', 'U21CSG01'] } },
          { subjectName: { $regex: /c programming|problem solving/i } }
        ]
      });
    }

    if (!cSubject) {
      throw new Error('C Programming subject (U21CS101 / U21CSG01) not found in database!');
    }

    console.log(`Found Subject: [${cSubject.subjectCode}] ${cSubject.subjectName} (${cSubject._id})`);

    // Locate Teacher for Semester 1
    let teacher = null;
    if (cSubject.assignedTeacher) {
      teacher = await User.findById(cSubject.assignedTeacher);
    }
    if (!teacher) {
      teacher = await User.findOne({ email: 'it.sem1.teacher@kpriet.ac.in' });
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

    for (const sim of C_SIMULATIONS) {
      const existing = await Content.findOne({
        subject: cSubject._id,
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
        semester: sem1 ? sem1._id : cSubject.semester,
        subject: cSubject._id,
        teacher: teacher._id,
        chapterOrUnit: sim.unit,
        tags: sim.tags,
        simulationConfig: {
          type: 'smartboard-c-lab',
          smartboardPresetId: sim.id,
          category: sim.category,
          domain: 'COMPUTER_SCIENCE',
          initialParams: {
            simulationId: sim.id,
            category: sim.category,
            topic: sim.title,
            unit: sim.unit,
          },
          controls: ['run', 'pause', 'next', 'prev', 'reset', 'speed', 'code', 'ai-explain']
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

    console.log(`\n🎉 Problem Solving and C Programming Simulations Seeded Successfully!`);
    console.log(`   Total Simulations: ${C_SIMULATIONS.length}`);
    console.log(`   Newly Created: ${createdCount}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Subject: [${cSubject.subjectCode}] ${cSubject.subjectName}`);
    console.log(`   All 5 Units covered with Smart Board & Memory Engine integration!`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding C Programming simulations:', error);
    process.exit(1);
  }
}

seedCSimulations();
