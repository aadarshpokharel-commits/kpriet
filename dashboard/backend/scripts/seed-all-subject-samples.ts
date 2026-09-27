import mongoose from 'mongoose';
import {
  Department,
  Semester,
  Subject,
  User,
  Content,
  Quiz,
  Assignment,
  TeacherCurriculumContent,
} from '../src/models/index.js';
import {
  ContentType,
  ContentStatus,
  AssignmentStatus,
  QuizStatus,
  DifficultyLevel,
  QuizNavigationRule,
  LateSubmissionPolicy,
} from '../src/types/academic.types.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduverse';

async function seedAllSubjectSamples() {
  console.log('🔄 Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected successfully.');

  const itDept = await Department.findOne({
    $or: [{ code: 'IT' }, { _id: '6ab40430dcfcae09aed4df2a' }],
  });

  if (!itDept) {
    console.error('❌ IT Department not found!');
    process.exit(1);
  }

  console.log(`📌 IT Department: ${itDept.name} (${itDept._id})`);

  // Map semester number to teacher user
  const teachersBySem: Record<number, any> = {};
  for (let sem = 1; sem <= 8; sem++) {
    const email = `it.sem${sem}.teacher@kpriet.ac.in`;
    const identifier = `IT.SEM${sem}.TEACHER`;
    const teacher = await User.findOne({
      $or: [{ collegeEmail: email }, { email }, { identifier }],
    });
    if (teacher) {
      teachersBySem[sem] = teacher;
      console.log(`👨‍🏫 Found teacher for Sem ${sem}: ${teacher.name || teacher.fullName} (${teacher._id})`);
    } else {
      console.warn(`⚠️ Warning: No teacher found for ${email} / ${identifier}`);
    }
  }

  // Fetch all subjects in IT department
  const subjects = await Subject.find({ department: itDept._id }).sort({
    semesterNumber: 1,
    subjectCode: 1,
  });

  console.log(`\n📚 Total IT Subjects to inspect & seed: ${subjects.length}\n`);

  let addedContentCount = 0;
  let addedAssignmentCount = 0;
  let addedQuizCount = 0;
  let addedCurriculumCount = 0;
  let updatedSyllabusCount = 0;

  for (const subject of subjects) {
    const sem = subject.semesterNumber;
    const teacher = teachersBySem[sem];

    if (!teacher) {
      console.warn(`⚠️ Skipping ${subject.subjectCode} - no teacher assigned for Sem ${sem}`);
      continue;
    }

    // 1. Ensure Subject has at least 3-5 standard syllabus units
    if (!subject.syllabus || subject.syllabus.length < 2) {
      const isLab = subject.subjectName.toLowerCase().includes('laboratory') || subject.subjectName.toLowerCase().includes('lab');
      const isStudio = subject.subjectName.toLowerCase().includes('studio');
      const isProject = subject.subjectName.toLowerCase().includes('project');

      if (isLab) {
        subject.syllabus = [
          {
            unitNumber: 1,
            title: 'Lab Foundations, Environment Setup & Toolchain',
            topics: ['Tool Installation & Setup', 'Safety Guidelines', 'Basic Syntax / Hello World', 'Debugging Workflows'],
            description: 'Laboratory environment initialization and fundamental verification steps.',
          },
          {
            unitNumber: 2,
            title: 'Core Experimental Modules & Structured Exercises',
            topics: ['Modular Programming', 'Input/Output Validations', 'Control Structures', 'Data Flow Verification'],
            description: 'Hands-on practical implementation of core domain concepts.',
          },
          {
            unitNumber: 3,
            title: 'Complex Problem Implementations & Performance Benchmarking',
            topics: ['Complex Algorithms', 'Memory/Execution Optimization', 'Exception Handling', 'Edge Case Analysis'],
            description: 'Advanced lab problems focusing on efficiency, edge conditions, and testing.',
          },
          {
            unitNumber: 4,
            title: 'Mini-Project / Capstone Practical Implementation',
            topics: ['Problem Statement Formulation', 'Design & Architecture', 'Execution & Integration', 'Final Viva Voce'],
            description: 'Integrated lab project demonstrating mastery across multiple domain modules.',
          },
        ];
      } else if (isStudio || isProject) {
        subject.syllabus = [
          {
            unitNumber: 1,
            title: 'Design Thinking, Problem Identification & Literature Review',
            topics: ['Problem Identification', 'Stakeholder Interviews', 'State of the Art Review', 'Feasibility Study'],
            description: 'Inception, ideation, and formal specification of the project challenge.',
          },
          {
            unitNumber: 2,
            title: 'Architectural Blueprint, Prototyping & Modeling',
            topics: ['System Architecture', 'Component Modeling', 'Interface Specifications', 'Prototype Wireframes'],
            description: 'Detailed architectural decomposition and initial physical/digital prototyping.',
          },
          {
            unitNumber: 3,
            title: 'Sprint Implementation, Testing & Validation',
            topics: ['Agile Iteration Execution', 'Continuous Integration', 'Testing Protocols', 'User Evaluation'],
            description: 'Active sprint execution, system testing, and performance validation.',
          },
          {
            unitNumber: 4,
            title: 'Final Demonstration, Report Preparation & Viva',
            topics: ['Demonstration Setup', 'Technical Documentation', 'Plagiarism Check', 'Project Presentation'],
            description: 'Final viva voce, documentation submission, and product showcase.',
          },
        ];
      } else {
        subject.syllabus = [
          {
            unitNumber: 1,
            title: 'Foundations & Mathematical / Theoretical Principles',
            topics: ['Historical Context & Motivation', 'Core Definitions', 'Theoretical Foundations', 'Standard Models'],
            description: 'Introductory concepts and foundational theory essential for the subject domain.',
          },
          {
            unitNumber: 2,
            title: 'Core Methodologies, Architecture & Analysis',
            topics: ['Primary Methodologies', 'System Architectures', 'Analytical Formulations', 'Component Interaction'],
            description: 'Detailed technical exploration of core architectural patterns and methods.',
          },
          {
            unitNumber: 3,
            title: 'Advanced Techniques & Practical Implementations',
            topics: ['Advanced Paradigms', 'Algorithmic Optimization', 'Implementation Strategies', 'State of the Art'],
            description: 'In-depth study of high-level techniques, algorithms, and engineering patterns.',
          },
          {
            unitNumber: 4,
            title: 'System Integration, Security & Performance Evaluation',
            topics: ['System Integration', 'Security & Reliability', 'Benchmarking & Metrics', 'Scalability'],
            description: 'System-level integration, robust verification, and performance evaluation.',
          },
          {
            unitNumber: 5,
            title: 'Industrial Case Studies, Standards & Emerging Trends',
            topics: ['Industry Case Studies', 'International Standards', 'Emerging Research Frontiers', 'Future Directions'],
            description: 'Real-world case studies, regulatory standards, and contemporary industry developments.',
          },
        ];
      }
      await subject.save();
      updatedSyllabusCount++;
    }

    // 2. Ensure Content exists (Lecture Notes, Reference Materials, Announcements)
    const existingContentCount = await Content.countDocuments({ subject: subject._id });

    // Check if NOTES exist
    const hasNotes = await Content.exists({ subject: subject._id, contentType: ContentType.NOTES });
    if (!hasNotes) {
      await Content.create({
        title: `${subject.subjectCode} - Unit 1: Foundations & Lecture Notes`,
        description: `Comprehensive pedagogical lecture notes covering foundational principles, key definitions, theoretical models, and practical takeaways for ${subject.subjectName}.`,
        contentType: ContentType.NOTES,
        department: itDept._id,
        semester: subject.semester,
        subject: subject._id,
        teacher: teacher._id,
        chapterOrUnit: 1,
        tags: [subject.subjectCode, 'Lecture Notes', 'Unit 1', 'Curriculum Guide'],
        attachments: [
          {
            name: `${subject.subjectCode}_Unit1_Lecture_Notes.pdf`,
            url: `https://kpriet.ac.in/academic-resources/${subject.subjectCode}/notes-u1.pdf`,
            sizeBytes: 2450000,
            mimeType: 'application/pdf',
          },
        ],
        resourceUrls: [],
        viewCount: 18,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      });
      addedContentCount++;
    }

    // Check if MATERIALS exist
    const hasMaterials = await Content.exists({ subject: subject._id, contentType: ContentType.MATERIALS });
    if (!hasMaterials) {
      const isLab = subject.subjectName.toLowerCase().includes('lab');
      await Content.create({
        title: `${subject.subjectCode} - ${isLab ? 'Laboratory Manual & Experiment Guide' : 'Reference Manual & Problem Walkthroughs'}`,
        description: `Supplementary academic reference material, illustrative practice problems, formula sheets, and exam review guidelines for ${subject.subjectName}.`,
        contentType: ContentType.MATERIALS,
        department: itDept._id,
        semester: subject.semester,
        subject: subject._id,
        teacher: teacher._id,
        chapterOrUnit: 2,
        tags: [subject.subjectCode, isLab ? 'Lab Manual' : 'Reference Guide', 'Practice Problems'],
        attachments: [
          {
            name: `${subject.subjectCode}_Study_Guide.pdf`,
            url: `https://kpriet.ac.in/academic-resources/${subject.subjectCode}/manual.pdf`,
            sizeBytes: 3100000,
            mimeType: 'application/pdf',
          },
        ],
        resourceUrls: [],
        viewCount: 12,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      });
      addedContentCount++;
    }

    // Check if ANNOUNCEMENTS exist
    const hasAnnouncement = await Content.exists({ subject: subject._id, contentType: ContentType.ANNOUNCEMENTS });
    if (!hasAnnouncement) {
      await Content.create({
        title: `Welcome to ${subject.subjectName} (${subject.subjectCode})`,
        description: `Welcome students to Semester ${sem} - ${subject.subjectName}. Please review the course syllabus, lecture schedule, evaluation breakdown, and laboratory instructions in this workspace.`,
        contentType: ContentType.ANNOUNCEMENTS,
        department: itDept._id,
        semester: subject.semester,
        subject: subject._id,
        teacher: teacher._id,
        chapterOrUnit: 1,
        tags: [subject.subjectCode, 'Orientation', 'Announcement'],
        attachments: [],
        resourceUrls: [],
        viewCount: 35,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      });
      addedContentCount++;
    }

    // 3. Ensure at least 1 Assignment exists
    const hasAssignment = await Assignment.exists({ subject: subject._id });
    if (!hasAssignment) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // 2 weeks ahead

      await Assignment.create({
        title: `${subject.subjectCode} - Assignment 1: Fundamental Concepts & Problem Solving`,
        description: `Complete the analytical problem set and conceptual questions from Units 1 and 2 of ${subject.subjectName}. Submit your typed or scanned solutions in PDF format.`,
        instructions: 'Ensure all solutions are original, include step-by-step reasoning, and adhere to KPRIET academic honesty guidelines.',
        department: itDept._id,
        semester: subject.semester,
        subject: subject._id,
        teacher: teacher._id,
        chapterOrUnit: 1,
        chapterTitle: 'Foundations & Core Principles',
        topics: ['Fundamental Concepts', 'Analytical Formulations', 'Practical Applications'],
        dueDate,
        lateSubmissionPolicy: LateSubmissionPolicy.ALLOW_WITH_PENALTY,
        latePenaltyPercent: 10,
        maxMarks: 20,
        passingMarks: 10,
        allowedFileTypes: ['.pdf', '.zip'],
        maxFileSizeMB: 25,
        allowTextSubmission: true,
        allowFileSubmission: true,
        allowResubmission: true,
        attachments: [],
        referenceMaterials: [
          {
            title: 'KPRIET Academic Guidelines & Formatting Guide',
            url: 'https://kpriet.ac.in/academic-guidelines.pdf',
            notes: 'Follow standard layout specifications.',
          },
        ],
        rubricCriteria: [
          {
            id: 'crit-1',
            title: 'Conceptual Correctness',
            description: 'Accurate application of theoretical formulas, definitions, and reasoning.',
            maxMarks: 10,
            category: 'correctness',
          },
          {
            id: 'crit-2',
            title: 'Clarity & Completeness of Derivations',
            description: 'Thorough step-by-step problem walkthroughs and complete explanations.',
            maxMarks: 10,
            category: 'completeness',
          },
        ],
        autoEvaluationSettings: {
          enabled: false,
          showCriteriaToStudents: true,
          criteria: {
            correctness: true,
            completeness: true,
            requiredConcepts: true,
            keywordCriteria: false,
            rubricCriteria: true,
            formattingCriteria: false,
            numericalCorrectness: true,
          },
          requiredKeywords: [],
          requiredConcepts: ['Principles', 'Formulas', 'Analysis'],
        },
        manualGradingSetting: {
          requireTeacherApproval: true,
          allowAiPreGrading: true,
        },
        status: AssignmentStatus.PUBLISHED,
      });
      addedAssignmentCount++;
    }

    // 4. Ensure at least 1 Quiz exists
    const hasQuiz = await Quiz.exists({ subject: subject._id });
    if (!hasQuiz) {
      await Quiz.create({
        title: `${subject.subjectCode} - Concept Mastery Check Quiz 1`,
        description: `Formative multiple-choice mastery quiz assessing comprehension of introductory concepts, technical terms, and core frameworks in ${subject.subjectName}.`,
        department: itDept._id,
        semester: subject.semester,
        subject: subject._id,
        teacher: teacher._id,
        curriculumUnits: [1],
        topics: ['Foundations', 'Terminology', 'Frameworks'],
        difficultyLevel: DifficultyLevel.MEDIUM,
        sourceNotes: [
          {
            name: `${subject.subjectCode}_Unit1_Notes`,
            url: `https://kpriet.ac.in/academic-resources/${subject.subjectCode}/notes-u1.pdf`,
          },
        ],
        durationMinutes: 20,
        totalMarks: 10,
        passingMarks: 5,
        instructions: 'Answer all 10 questions. Each question carries 1 mark. You may review your answers before final submission.',
        allowMultipleAttempts: true,
        maxAttempts: 3,
        randomizeQuestions: true,
        randomizeOptions: true,
        negativeMarkingEnabled: false,
        negativeMarksPerQuestion: 0,
        showResultImmediately: true,
        showAnswersAfterSubmission: true,
        fullscreenRequired: false,
        maxWarnings: 3,
        tabSwitchDetection: false,
        autoSubmitOnMaxViolations: false,
        blockCopyPaste: false,
        navigationRule: QuizNavigationRule.FREE,
        status: QuizStatus.PUBLISHED,
      });
      addedQuizCount++;
    }

    // 5. Ensure TeacherCurriculumContent exists
    const hasCurriculum = await TeacherCurriculumContent.exists({
      subject: subject._id,
      teacher: teacher._id,
    });

    if (!hasCurriculum) {
      await TeacherCurriculumContent.create({
        teacher: teacher._id,
        subject: subject._id,
        department: itDept._id,
        semester: subject.semester,
        unitNumber: 1,
        chapterTitle: 'Unit 1: Foundations & Core Concepts',
        teachingNotes: `Teacher instructional plan: Focus on student intuitive understanding through real-world analogies before formalizing mathematical/algorithmic definitions in ${subject.subjectName}.`,
        learningObjectives: [
          'Understand key historical background and technological motivations',
          'Master fundamental terminology and conceptual architecture',
          'Apply analytical principles to introductory test cases',
        ],
        importantPoints: [
          'Emphasize standard notation and naming conventions early',
          'Highlight practical industry applications and case study connections',
        ],
        practicalExamples: [
          'Real-time industrial deployment scenarios',
          'Comparative benchmark evaluations',
        ],
        referenceMaterials: [
          'Prescribed KPRIET R2021 curriculum text',
          'Digital library reference modules and video resources',
        ],
        topics: [
          {
            topicId: 'T1',
            title: 'Overview & Essential Terminology',
            order: 1,
            explanation: `Introduction to the primary goals, scope, and engineering significance of ${subject.subjectName}.`,
          },
          {
            topicId: 'T2',
            title: 'Theoretical Foundations & Framework Analysis',
            order: 2,
            explanation: 'Detailed walkthrough of the underlying models, equations, and system dynamics.',
          },
        ],
        status: 'ACTIVE',
      });
      addedCurriculumCount++;
    }
  }

  console.log('\n=============================================');
  console.log('🎉 SEEDING COMPLETE FOR ALL IT SUBJECTS');
  console.log('=============================================');
  console.log(`- Updated Syllabus for: ${updatedSyllabusCount} subjects`);
  console.log(`- Added Content items: ${addedContentCount}`);
  console.log(`- Added Assignments: ${addedAssignmentCount}`);
  console.log(`- Added Quizzes: ${addedQuizCount}`);
  console.log(`- Added Curriculum Lesson Plans: ${addedCurriculumCount}`);
  console.log('=============================================\n');

  await mongoose.disconnect();
}

seedAllSubjectSamples().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
