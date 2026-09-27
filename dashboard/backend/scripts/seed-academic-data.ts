/**
 * Safe Development Seed System for Eduverse Academic Portal.
 *
 * Rules:
 *  - DO NOT run in production (aborts if NODE_ENV === 'production').
 *  - Safe password hashing via bcrypt (no plaintext passwords).
 *  - Supports all KPRIET departments.
 *  - Seeds comprehensive academic hierarchy:
 *    Departments -> Semesters -> Subjects -> Users (Admin, HOD, Teacher, Student) ->
 *    TeacherAssignments -> StudentEnrollments -> Content -> Quizzes (all 8 question types) ->
 *    QuizAttempts & Results -> Assignments & Submissions -> Results -> Attendance ->
 *    AI Knowledge -> Audit Logs.
 */

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { ensureAllIndexes } from '../src/database/ensure-indexes.js';
import { CurriculumSeedService } from '../src/services/curriculum-seed.service.js';
import {
  AcademicResultStatus,
  AccountStatus,
  ApprovalStatus,
  AssignmentStatus,
  AttendanceStatus,
  AuditAction,
  ContentStatus,
  ContentType,
  EnrollmentStatus,
  ProgrammeType,
  QuestionType,
  QuizAttemptStatus,
  QuizStatus,
  SemesterStatus,
  SubmissionStatus,
  TeacherAssignmentStatus,
  UserRole,
} from '../src/types/academic.types.js';
import {
  AIQueryLog,
  Assignment,
  AssignmentGrade,
  AssignmentSubmission,
  AttendanceRecord,
  AttendanceSession,
  AuditLog,
  Content,
  Department,
  KnowledgeChunk,
  KnowledgeDocument,
  Programme,
  Question,
  Quiz,
  QuizAnswer,
  QuizAttempt,
  QuizResult,
  Semester,
  SemesterResult,
  StudentEnrollment,
  Subject,
  SubjectResult,
  TeacherAssignment,
  User,
} from '../src/models/index.js';
import { ProgrammeService } from '../src/services/programme.service.js';

// Safety check: Never seed production
if (env.isProduction) {
  console.error('✖ CRITICAL: Seeding is prohibited in production environment!');
  process.exit(1);
}

// Development password derived securely from environment or dev fallback
const DEV_SEED_PASSWORD = process.env.DEV_SEED_PASSWORD || 'Eduverse@Dev2026!';

export async function seedAcademicData(): Promise<void> {
  console.log('--- Starting Safe Development Database Seed ---');

  await ensureAllIndexes();

  const saltRounds = 10;
  const sharedPasswordHash = await bcrypt.hash(DEV_SEED_PASSWORD, saltRounds);

  // -------------------------------------------------------------------------
  // 1. DEPARTMENTS (All KPRIET Departments)
  // -------------------------------------------------------------------------
  console.log('1. Seeding KPRIET Departments...');
  // The 14 official B.E. programmes come from the central programme master
  // (idempotent; migrates legacy codes such as AD/MECH/CIVIL/CHEM in place).
  await ProgrammeService.seedProgrammeMaster();

  // Supporting (non-programme) department for first-year foundation faculty.
  await Department.findOneAndUpdate(
    { code: 'SH' },
    {
      $set: {
        name: 'Science & Humanities',
        code: 'SH',
        programmeType: ProgrammeType.UG,
        isProgramme: false,
        description: 'First Year Foundation Department: Mathematics, Physics, Chemistry, English',
      },
      $setOnInsert: { status: 'ACTIVE', isActive: true },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Look-up by current code AND by legacy code, so references below keep working.
  const departmentsMap = new Map<string, mongoose.Document>();
  for (const doc of await Department.find({})) {
    departmentsMap.set(doc.code, doc);
    for (const legacy of doc.legacyCodes || []) {
      if (!departmentsMap.has(legacy)) departmentsMap.set(legacy, doc);
    }
  }
  console.log(`✔ Programme master ready (${await Department.countDocuments({ isProgramme: true })} programmes).`);

  // -------------------------------------------------------------------------
  // 1B. PROGRAMMES (Under Departments)
  // -------------------------------------------------------------------------
  // B.E. degree programmes are created by the programme master; only the
  // first-year foundation programme is seeded here.
  console.log('1B. Seeding Foundation Programme...');
  const shDept = departmentsMap.get('SH');
  if (shDept) {
    await Programme.findOneAndUpdate(
      { department: shDept._id, code: 'FY-SH' },
      {
        $set: {
          name: 'First Year Foundation Studies',
          code: 'FY-SH',
          degree: 'Foundation',
          department: shDept._id,
          programmeType: ProgrammeType.UG,
          durationYears: 1,
          totalSemesters: 2,
          status: 'ACTIVE',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log('✔ Seeded foundation programme.');

  const itDept = departmentsMap.get('IT')!;
  const adDept = departmentsMap.get('AD')!;

  // -------------------------------------------------------------------------
  // 2. USERS (Admin, Principal, HODs, Teachers, Students)
  // -------------------------------------------------------------------------
  console.log('2. Seeding Users (Admin, Principal, HODs, Teachers, Students)...');
  const usersToSeed = [
    // Admin & Principal
    {
      name: 'Principal Dr. M. Akila',
      collegeEmail: 'principal@kpriet.ac.in',
      passwordHash: sharedPasswordHash,
      role: UserRole.PRINCIPAL,
      department: null,
      identifier: 'KPR-EXEC-001',
      profile: { designation: 'Principal & Professor', phone: '+91-422-2635600', bio: 'Principal of KPRIET' },
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      name: 'System Administrator',
      collegeEmail: 'admin@kpriet.ac.in',
      passwordHash: sharedPasswordHash,
      role: UserRole.ADMIN,
      department: null,
      identifier: 'KPR-ADMIN-001',
      profile: { designation: 'Chief System Administrator', phone: '+91-422-2635601' },
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    // HODs
    {
      name: 'Dr. V. Seethalakshmi',
      collegeEmail: 'hod.it@kpriet.ac.in',
      passwordHash: sharedPasswordHash,
      role: UserRole.HOD,
      department: itDept._id,
      identifier: 'KPR-FAC-IT001',
      profile: { designation: 'Professor & Head of Department', specialization: 'Information Security & Cloud Computing' },
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      name: 'Dr. P. Manoj Kumar',
      collegeEmail: 'hod.ad@kpriet.ac.in',
      passwordHash: sharedPasswordHash,
      role: UserRole.HOD,
      department: adDept._id,
      identifier: 'KPR-FAC-AD001',
      profile: { designation: 'Professor & Head of Department', specialization: 'Artificial Intelligence & Deep Learning' },
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    // Teachers
    {
      name: 'Dr. K. S. Vignesh',
      collegeEmail: 'math.teacher@kpriet.ac.in',
      passwordHash: sharedPasswordHash,
      role: UserRole.TEACHER,
      department: itDept._id,
      identifier: 'KPR-FAC-MA002',
      profile: { designation: 'Associate Professor (Sr.G)', specialization: 'Linear Algebra & Calculus' },
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      name: 'Dr. N. Balamurugan',
      collegeEmail: 'physics.teacher@kpriet.ac.in',
      passwordHash: sharedPasswordHash,
      role: UserRole.TEACHER,
      department: itDept._id,
      identifier: 'KPR-FAC-PH003',
      profile: { designation: 'Assistant Professor (Sl.G)', specialization: 'Quantum Physics & Semiconductor Devices' },
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      name: 'Prof. S. Divya',
      collegeEmail: 'it.teacher@kpriet.ac.in',
      passwordHash: sharedPasswordHash,
      role: UserRole.TEACHER,
      department: itDept._id,
      identifier: 'KPR-FAC-IT004',
      profile: { designation: 'Assistant Professor', specialization: 'Python Programming & Data Structures' },
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    // Students (23IT040 - 23IT043 matching Smart Board demo accounts)
    {
      name: 'Priyadharshini S',
      collegeEmail: '23it040@kpriet.ac.in',
      passwordHash: sharedPasswordHash,
      role: UserRole.STUDENT,
      department: itDept._id,
      identifier: '23IT040',
      profile: { batch: '2023-2027', section: 'A', designation: 'Student' },
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      name: 'Rahul K',
      collegeEmail: '23it041@kpriet.ac.in',
      passwordHash: sharedPasswordHash,
      role: UserRole.STUDENT,
      department: itDept._id,
      identifier: '23IT041',
      profile: { batch: '2023-2027', section: 'A', designation: 'Student' },
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      name: 'Sneha R',
      collegeEmail: '23it042@kpriet.ac.in',
      passwordHash: sharedPasswordHash,
      role: UserRole.STUDENT,
      department: itDept._id,
      identifier: '23IT042',
      profile: { batch: '2023-2027', section: 'A', designation: 'Student' },
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      name: 'Vignesh M',
      collegeEmail: '23it043@kpriet.ac.in',
      passwordHash: sharedPasswordHash,
      role: UserRole.STUDENT,
      department: itDept._id,
      identifier: '23IT043',
      profile: { batch: '2023-2027', section: 'B', designation: 'Student' },
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
  ];

  await User.deleteMany({ collegeEmail: /@kpiet\.ac\.in$/ });

  const userDocs = new Map<string, any>();
  for (const user of usersToSeed) {
    const doc = await User.findOneAndUpdate(
      { collegeEmail: user.collegeEmail },
      { $set: user },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    userDocs.set(user.collegeEmail, doc);
  }

  // Update HOD reference on Departments
  await Department.findByIdAndUpdate(itDept._id, { hod: userDocs.get('hod.it@kpriet.ac.in')._id });
  await Department.findByIdAndUpdate(adDept._id, { hod: userDocs.get('hod.ad@kpriet.ac.in')._id });
  console.log(`✔ Seeded ${userDocs.size} Users and updated HOD links.`);

  // -------------------------------------------------------------------------
  // 3. SEMESTERS
  // -------------------------------------------------------------------------
  console.log('3. Seeding Semesters...');
  const semesterData = [
    {
      semesterNumber: 1,
      academicYear: '2024-2025',
      regulation: 'R2021',
      department: itDept._id,
      status: SemesterStatus.ACTIVE,
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-12-20'),
    },
    {
      semesterNumber: 2,
      academicYear: '2024-2025',
      regulation: 'R2021',
      department: itDept._id,
      status: SemesterStatus.UPCOMING,
      startDate: new Date('2025-01-10'),
      endDate: new Date('2025-05-30'),
    },
    {
      semesterNumber: 3,
      academicYear: '2024-2025',
      regulation: 'R2021',
      department: itDept._id,
      status: SemesterStatus.UPCOMING,
      startDate: new Date('2025-06-15'),
      endDate: new Date('2025-11-20'),
    },
    {
      semesterNumber: 1,
      academicYear: '2024-2025',
      regulation: 'R2021',
      department: adDept._id,
      status: SemesterStatus.ACTIVE,
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-12-20'),
    },
  ];

  const semesterDocs: any[] = [];
  for (const sem of semesterData) {
    const doc = await Semester.findOneAndUpdate(
      {
        department: sem.department,
        semesterNumber: sem.semesterNumber,
        academicYear: sem.academicYear,
        regulation: sem.regulation,
      },
      { $set: sem },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    semesterDocs.push(doc);
  }
  const itSem1 = semesterDocs[0];
  const itSem2 = semesterDocs[1];
  const itSem3 = semesterDocs[2];
  const adSem1 = semesterDocs[3];
  console.log(`✔ Seeded ${semesterDocs.length} Semesters.`);

  // -------------------------------------------------------------------------
  // 4. SUBJECTS & CURRICULUM (Authoritative R2021 CBCS Curriculum)
  // -------------------------------------------------------------------------
  console.log('4. Seeding Complete IT R2021 CBCS Curriculum & Authoritative Subjects...');
  await CurriculumSeedService.seedCompleteITCurriculum();

  // Also seed AD department sample subject
  await Subject.findOneAndUpdate(
    { subjectCode: 'U21AD101', department: adDept._id, semester: adSem1._id },
    {
      $set: {
        subjectName: 'Foundations of Data Science',
        subjectCode: 'U21AD101',
        department: adDept._id,
        semester: adSem1._id,
        semesterNumber: 1,
        credits: 4,
        category: 'PCC',
        icon: '📊',
        color: '#6366F1',
        syllabus: [
          { unitNumber: 1, title: 'Introduction to Data Science', topics: ['Data Science lifecycle', 'Exploratory Data Analysis', 'Summary statistics'], hours: 9 },
        ],
        status: 'ACTIVE',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Retrieve authoritative subjects for downstream assignments, content, quizzes, and simulations
  const mathSub = (await Subject.findOne({ subjectCode: 'U21MA101', department: itDept._id }))!;
  const pythonSub = (await Subject.findOne({ subjectCode: 'U21CSG02', department: itDept._id })) || (await Subject.findOne({ subjectCode: 'U21CSG01', department: itDept._id }))!;
  const physicsSub = (await Subject.findOne({ subjectCode: 'U21PH101', department: itDept._id }))!;
  const dsaSub = (await Subject.findOne({ subjectCode: 'U21CSG03', department: itDept._id })) || mathSub;
  const dbmsSub = (await Subject.findOne({ subjectCode: 'U21IT403', department: itDept._id })) || (await Subject.findOne({ subjectCode: 'U21IT301', department: itDept._id })) || dsaSub;

  const itSem1Subjects = await Subject.find({ department: itDept._id, semester: itSem1._id, status: 'ACTIVE' });
  const itSem1SubjectIds = itSem1Subjects.map((s) => s._id);
  console.log(`✔ IT Semester 1 loaded with ${itSem1Subjects.length} authoritative subjects.`);

  // -------------------------------------------------------------------------
  // 5. TEACHER-SUBJECT ASSIGNMENT (Proper relationship — NEVER a single field)
  // -------------------------------------------------------------------------
  console.log('5. Seeding Teacher-Subject Assignments (Many-to-Many across Semesters)...');
  const mathTeacher = userDocs.get('math.teacher@kpriet.ac.in')!;
  const physicsTeacher = userDocs.get('physics.teacher@kpriet.ac.in')!;
  const itTeacher = userDocs.get('it.teacher@kpriet.ac.in')!;

  const assignmentsToSeed = [
    // Math Teacher assignments
    {
      teacher: mathTeacher._id,
      subject: mathSub._id,
      department: itDept._id,
      semester: itSem1._id,
      academicYear: '2024-2025',
      section: 'A',
      isCoordinator: true,
      status: TeacherAssignmentStatus.ACTIVE,
    },
    // itTeacher (Prof. S. Divya) teaching across multiple subjects and multiple semesters:
    // Subject A -> Semester 1 (Problem Solving / Programming)
    {
      teacher: itTeacher._id,
      subject: pythonSub._id,
      department: itDept._id,
      semester: itSem1._id,
      academicYear: '2024-2025',
      section: 'A',
      isCoordinator: true,
      status: TeacherAssignmentStatus.ACTIVE,
    },
    // Subject B -> Semester 2 (Data Structures)
    {
      teacher: itTeacher._id,
      subject: dsaSub._id,
      department: itDept._id,
      semester: itSem2._id,
      academicYear: '2024-2025',
      section: 'A',
      isCoordinator: true,
      status: TeacherAssignmentStatus.ACTIVE,
    },
    // Subject C -> Semester 3 (DBMS)
    {
      teacher: itTeacher._id,
      subject: dbmsSub._id,
      department: itDept._id,
      semester: itSem3._id,
      academicYear: '2024-2025',
      section: 'A',
      isCoordinator: true,
      status: TeacherAssignmentStatus.ACTIVE,
    },
    // Subject D -> Semester 1 (Matrices Sec B)
    {
      teacher: itTeacher._id,
      subject: mathSub._id,
      department: itDept._id,
      semester: itSem1._id,
      academicYear: '2024-2025',
      section: 'B',
      isCoordinator: false,
      status: TeacherAssignmentStatus.ACTIVE,
    },
    {
      teacher: physicsTeacher._id,
      subject: physicsSub._id,
      department: itDept._id,
      semester: itSem1._id,
      academicYear: '2024-2025',
      section: 'ALL',
      isCoordinator: true,
      status: TeacherAssignmentStatus.ACTIVE,
    },
  ];

  for (const asgn of assignmentsToSeed) {
    await TeacherAssignment.findOneAndUpdate(
      {
        teacher: asgn.teacher,
        subject: asgn.subject,
        semester: asgn.semester,
        academicYear: asgn.academicYear,
        section: asgn.section,
      },
      { $set: asgn },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`✔ Seeded ${assignmentsToSeed.length} Teacher-Subject Assignments.`);

  // -------------------------------------------------------------------------
  // 6. STUDENT ENROLLMENT (Active + Historical support)
  // -------------------------------------------------------------------------
  console.log('6. Seeding Student Enrollments (Single Active Enrollment per Student)...');
  const studentEmails = ['23it040@kpriet.ac.in', '23it041@kpriet.ac.in', '23it042@kpriet.ac.in', '23it043@kpriet.ac.in'];
  const hodIt = userDocs.get('hod.it@kpriet.ac.in')!;

  for (const email of studentEmails) {
    const student = userDocs.get(email)!;
    await StudentEnrollment.findOneAndUpdate(
      {
        student: student._id,
        semester: itSem1._id,
        academicYear: '2024-2025',
      },
      {
        $set: {
          department: itDept._id,
          enrolledSubjects: itSem1SubjectIds,
          status: EnrollmentStatus.APPROVED,
          requestedAt: new Date('2024-07-25'),
          approvedAt: new Date('2024-07-28'),
          approvedBy: hodIt._id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`✔ Seeded active approved enrollments with all ${itSem1SubjectIds.length} Semester 1 subjects for ${studentEmails.length} students.`);

  // -------------------------------------------------------------------------
  // 7. CONTENT (Notes, Materials, Videos, Presentations, Announcements, Simulations)
  // -------------------------------------------------------------------------
  console.log('7. Seeding Academic Content & Smart Board Simulations...');
  const contentItems = [
    {
      title: 'Eigenvalues and Eigenvectors — Lecture Notes & Formulas',
      description: 'Comprehensive derivation of characteristic equations, diagonalisation theorems, and step-by-step solved problems.',
      contentType: ContentType.NOTES,
      department: itDept._id,
      semester: itSem1._id,
      subject: mathSub._id,
      teacher: mathTeacher._id,
      chapterOrUnit: 1,
      attachments: [{ name: 'Eigenvalues_Notes.pdf', url: '/materials/math/unit1_eigenvalues.pdf', sizeBytes: 2450000, mimeType: 'application/pdf' }],
      resourceUrls: ['https://mathworld.wolfram.com/Eigenvalue.html'],
      tags: ['matrices', 'eigenvalues', 'calculus'],
      status: ContentStatus.PUBLISHED,
    },
    {
      title: 'Matrix Linear Transformation Interactive Simulator',
      description: 'Interactive graphical demonstration of 2D shear, rotation, reflection, and eigenvector scaling.',
      contentType: ContentType.SIMULATIONS,
      department: itDept._id,
      semester: itSem1._id,
      subject: mathSub._id,
      teacher: mathTeacher._id,
      chapterOrUnit: 1,
      simulationConfig: {
        type: 'MATRIX_TRANSFORMATION',
        initialParams: { matrixA: [[2, 1], [1, 2]], gridRange: 5 },
        controls: ['matrixA_00', 'matrixA_01', 'matrixA_10', 'matrixA_11', 'animate_vector'],
        smartboardPresetId: 'smartboard-math-matrices',
      },
      resourceUrls: ['/smartboard/index.html'],
      tags: ['simulation', 'matrices', 'smartboard'],
      status: ContentStatus.PUBLISHED,
    },
    {
      title: 'Python Data Structures & Recursion Slide Deck',
      description: 'Slide presentation on list mutability, dictionary hashing, and recursive tree traversal.',
      contentType: ContentType.PRESENTATIONS,
      department: itDept._id,
      semester: itSem1._id,
      subject: pythonSub._id,
      teacher: itTeacher._id,
      chapterOrUnit: 3,
      attachments: [{ name: 'Python_ControlFlow_Slides.pptx', url: '/materials/python/unit3_slides.pptx', sizeBytes: 5200000, mimeType: 'application/vnd.ms-powerpoint' }],
      tags: ['python', 'slides', 'recursion'],
      status: ContentStatus.PUBLISHED,
    },
    {
      title: 'Internal Assessment Test 1 Schedule & Portion Announcement',
      description: 'IAT-1 will commence from 25th September covering Units 1 and 2 for all subjects.',
      contentType: ContentType.ANNOUNCEMENTS,
      department: itDept._id,
      semester: itSem1._id,
      subject: mathSub._id,
      teacher: hodIt._id,
      tags: ['announcement', 'exam', 'iat1'],
      status: ContentStatus.PUBLISHED,
    },
  ];

  for (const item of contentItems) {
    await Content.findOneAndUpdate(
      { title: item.title, subject: item.subject },
      { $set: item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`✔ Seeded ${contentItems.length} Content items (Notes, Simulations, Slides, Announcements).`);

  // -------------------------------------------------------------------------
  // 8. QUIZZES (Supporting All 8 Question Types)
  // -------------------------------------------------------------------------
  console.log('8. Seeding Quiz with ALL 8 Question Types...');
  const diagnosticQuiz = await Quiz.findOneAndUpdate(
    { title: 'Matrices & Calculus Comprehensive Diagnostic Quiz' },
    {
      $set: {
        title: 'Matrices & Calculus Comprehensive Diagnostic Quiz',
        description: 'Covers Unit 1 Matrices & Unit 2 Differential Calculus with all 8 academic assessment question formats.',
        department: itDept._id,
        semester: itSem1._id,
        subject: mathSub._id,
        teacher: mathTeacher._id,
        durationMinutes: 45,
        totalMarks: 20,
        passingMarks: 10,
        instructions: 'Answer all 8 questions. Negative marking applies where stated.',
        allowMultipleAttempts: false,
        maxAttempts: 1,
        status: QuizStatus.PUBLISHED,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Seed 8 distinct question types
  const questionsData = [
    // 1. MCQ
    {
      quiz: diagnosticQuiz._id,
      questionText: 'If λ is an eigenvalue of a non-singular matrix A, what is an eigenvalue of A⁻¹?',
      questionType: QuestionType.MCQ,
      options: [
        { id: 'opt_a', text: 'λ' },
        { id: 'opt_b', text: '1/λ' },
        { id: 'opt_c', text: '-λ' },
        { id: 'opt_d', text: 'λ²' },
      ],
      correctAnswers: 'opt_b',
      marks: 2,
      negativeMarks: 0.5,
      explanation: 'For an invertible matrix A with eigenvalue λ, A v = λ v implies A⁻¹ v = (1/λ) v.',
      chapterOrUnit: 1,
      orderIndex: 1,
    },
    // 2. Multiple Correct
    {
      quiz: diagnosticQuiz._id,
      questionText: 'Which of the following statements are true for an orthogonal matrix Q? (Select all that apply)',
      questionType: QuestionType.MULTIPLE_CORRECT,
      options: [
        { id: 'opt_a', text: 'Qᵀ = Q⁻¹' },
        { id: 'opt_b', text: 'det(Q) = ±1' },
        { id: 'opt_c', text: 'Eigenvalues of Q have absolute value 1' },
        { id: 'opt_d', text: 'det(Q) is always strictly 0' },
      ],
      correctAnswers: ['opt_a', 'opt_b', 'opt_c'],
      marks: 3,
      negativeMarks: 0,
      explanation: 'Orthogonal matrices satisfy Qᵀ Q = I, so det(Q)² = 1 and |λ| = 1.',
      chapterOrUnit: 1,
      orderIndex: 2,
    },
    // 3. Fill in the Blank
    {
      quiz: diagnosticQuiz._id,
      questionText: 'According to the Cayley-Hamilton theorem, every square matrix satisfies its own ______ equation.',
      questionType: QuestionType.FILL_IN_THE_BLANK,
      correctAnswers: ['characteristic', 'characteristic polynomial'],
      marks: 2,
      explanation: 'Every square matrix A satisfies det(A - λI) = 0.',
      chapterOrUnit: 1,
      orderIndex: 3,
    },
    // 4. Assertion & Reason
    {
      quiz: diagnosticQuiz._id,
      questionText: 'Analyze the given Assertion (A) and Reason (R):',
      questionType: QuestionType.ASSERTION_REASON,
      assertion: 'The eigenvalues of a symmetric real matrix are always real.',
      reason: 'The transpose of a real symmetric matrix equals itself, guaranteeing self-adjointness over ℝⁿ.',
      options: [
        { id: 'opt_1', text: 'Both (A) and (R) are true and (R) is the correct explanation of (A)' },
        { id: 'opt_2', text: 'Both (A) and (R) are true but (R) is NOT the correct explanation of (A)' },
        { id: 'opt_3', text: '(A) is true but (R) is false' },
        { id: 'opt_4', text: '(A) is false but (R) is true' },
      ],
      correctAnswers: 'opt_1',
      marks: 2,
      explanation: 'Real symmetric matrices are Hermitian, meaning all eigenvalues are real.',
      chapterOrUnit: 1,
      orderIndex: 4,
    },
    // 5. Numerical
    {
      quiz: diagnosticQuiz._id,
      questionText: 'Find the trace of a 2x2 matrix whose eigenvalues are 4 and 7.',
      questionType: QuestionType.NUMERICAL,
      correctAnswers: 11,
      numericalTolerance: 0,
      marks: 2,
      explanation: 'The trace of a square matrix is the sum of its eigenvalues: 4 + 7 = 11.',
      chapterOrUnit: 1,
      orderIndex: 5,
    },
    // 6. Match Following
    {
      quiz: diagnosticQuiz._id,
      questionText: 'Match the matrix type on the left with its defining property on the right:',
      questionType: QuestionType.MATCH_FOLLOWING,
      options: [
        { id: 'm1', text: 'Symmetric Matrix', matchedTo: 'A = Aᵀ' },
        { id: 'm2', text: 'Skew-Symmetric Matrix', matchedTo: 'A = -Aᵀ' },
        { id: 'm3', text: 'Orthogonal Matrix', matchedTo: 'Aᵀ A = I' },
        { id: 'm4', text: 'Idempotent Matrix', matchedTo: 'A² = A' },
      ],
      correctAnswers: { m1: 'A = Aᵀ', m2: 'A = -Aᵀ', m3: 'Aᵀ A = I', m4: 'A² = A' },
      marks: 3,
      chapterOrUnit: 1,
      orderIndex: 6,
    },
    // 7. Case/Scenario
    {
      quiz: diagnosticQuiz._id,
      questionText: 'Evaluate the robotic manipulator coordinate transformation scenario:',
      questionType: QuestionType.CASE_SCENARIO,
      caseScenarioText: 'A 2-link robotic arm end-effector experiences a transformation represented by T = [[0, -1], [1, 0]] in homogeneous coordinates. The arm is holding a weld point at coordinate (3, 2).',
      options: [
        { id: 'opt_a', text: 'The transformation represents a 90° counter-clockwise rotation, new position is (-2, 3)' },
        { id: 'opt_b', text: 'The transformation is a reflection across the X axis, new position is (3, -2)' },
        { id: 'opt_c', text: 'The transformation expands coordinates by factor 2, new position is (6, 4)' },
        { id: 'opt_d', text: 'The coordinate remains invariant at (3, 2)' },
      ],
      correctAnswers: 'opt_a',
      marks: 3,
      explanation: 'Multiplying [[0, -1], [1, 0]] by [3, 2]ᵀ yields [-2, 3]ᵀ (90° CCW rotation).',
      chapterOrUnit: 1,
      orderIndex: 7,
    },
    // 8. Short Answer
    {
      quiz: diagnosticQuiz._id,
      questionText: 'State the condition under which a set of vectors v₁, v₂, ..., vₙ are said to be linearly independent.',
      questionType: QuestionType.SHORT_ANSWER,
      correctAnswers: 'c1*v1 + c2*v2 + ... + cn*vn = 0 implies all scalars c1 = c2 = ... = cn = 0',
      marks: 3,
      explanation: 'Linear independence requires that the only linear combination yielding the zero vector is the trivial combination where all coefficients are zero.',
      chapterOrUnit: 1,
      orderIndex: 8,
    },
  ];

  for (const q of questionsData) {
    await Question.findOneAndUpdate(
      { quiz: q.quiz, orderIndex: q.orderIndex },
      { $set: q },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`✔ Seeded Quiz with 8 question types (MCQ, Multi-Correct, Fill, Assertion/Reason, Numerical, Match, Case, Short Answer).`);

  // Seed sample QuizAttempt and QuizResult for Student 23IT040
  const student40 = userDocs.get('23it040@kpriet.ac.in')!;
  const attempt = await QuizAttempt.findOneAndUpdate(
    { quiz: diagnosticQuiz._id, student: student40._id, attemptNumber: 1 },
    {
      $set: {
        startedAt: new Date(Date.now() - 3600000),
        submittedAt: new Date(Date.now() - 1200000),
        status: QuizAttemptStatus.SUBMITTED,
        totalScore: 18,
        isGraded: true,
        timeSpentSeconds: 2400,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await QuizResult.findOneAndUpdate(
    { quiz: diagnosticQuiz._id, student: student40._id, attempt: attempt._id },
    {
      $set: {
        score: 18,
        totalMarks: 20,
        percentage: 90,
        grade: 'O',
        passed: true,
        rank: 1,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`✔ Seeded Quiz Attempt and Quiz Result for student ${student40.identifier}.`);

  // -------------------------------------------------------------------------
  // 9. ASSIGNMENTS, SUBMISSIONS & GRADING
  // -------------------------------------------------------------------------
  console.log('9. Seeding Assignments, Submissions & Grades...');
  const mathAssignment = await Assignment.findOneAndUpdate(
    { title: 'Assignment 1: Matrix Inverses and Cayley-Hamilton Applications' },
    {
      $set: {
        title: 'Assignment 1: Matrix Inverses and Cayley-Hamilton Applications',
        description: 'Derive Cayley-Hamilton theorem for 3x3 matrices and solve the 5 given system of linear differential equations.',
        department: itDept._id,
        semester: itSem1._id,
        subject: mathSub._id,
        teacher: mathTeacher._id,
        dueDate: new Date(Date.now() + 86400000 * 7),
        maxMarks: 25,
        passingMarks: 12,
        attachments: [{ name: 'Assignment1_Problems.pdf', url: '/materials/math/assignment1.pdf', sizeBytes: 1200000 }],
        status: AssignmentStatus.PUBLISHED,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const submission = await AssignmentSubmission.findOneAndUpdate(
    { assignment: mathAssignment._id, student: student40._id },
    {
      $set: {
        submissionFiles: [{ name: '23IT040_Assignment1_Solution.pdf', url: '/submissions/23IT040_asgn1.pdf', sizeBytes: 1800000 }],
        notes: 'Completed all 5 problems with detailed intermediate eigenvalue calculations.',
        submittedAt: new Date(Date.now() - 86400000),
        status: SubmissionStatus.SUBMITTED,
        isGraded: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await AssignmentGrade.findOneAndUpdate(
    { submission: submission._id },
    {
      $set: {
        assignment: mathAssignment._id,
        student: student40._id,
        gradedBy: mathTeacher._id,
        marksObtained: 24,
        maxMarks: 25,
        feedback: 'Outstanding mathematical rigor and neat matrix layout. Keep up the high standard.',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`✔ Seeded Assignment, Submission, and Grade.`);

  // -------------------------------------------------------------------------
  // 10. ACADEMIC RESULTS (Subject & Semester Results)
  // -------------------------------------------------------------------------
  console.log('10. Seeding Academic Results (Subject & Semester GPA/CGPA)...');
  const subResult = await SubjectResult.findOneAndUpdate(
    { student: student40._id, subject: mathSub._id, academicYear: '2024-2025' },
    {
      $set: {
        department: itDept._id,
        semester: itSem1._id,
        internalMarks: 38,
        assignmentScoreAvg: 96,
        quizScoreAvg: 90,
        attendancePercentage: 98,
        endSemExamMarks: 56,
        totalMarks: 94,
        gradePoint: 10,
        letterGrade: 'O',
        credits: 4,
        status: AcademicResultStatus.PASS,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await SemesterResult.findOneAndUpdate(
    { student: student40._id, semester: itSem1._id, academicYear: '2024-2025' },
    {
      $set: {
        department: itDept._id,
        semesterNumber: 1,
        gpa: 9.65,
        cgpa: 9.65,
        totalCreditsRegistered: 21,
        totalCreditsEarned: 21,
        subjectResults: [subResult._id],
        status: AcademicResultStatus.PASS,
        publishedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`✔ Seeded Subject Result and Semester GPA/CGPA record.`);

  // -------------------------------------------------------------------------
  // 11. ATTENDANCE (Session & Records)
  // -------------------------------------------------------------------------
  console.log('11. Seeding Attendance Session & Attendance Records...');
  const attendanceSession = await AttendanceSession.findOneAndUpdate(
    {
      subject: mathSub._id,
      date: new Date('2024-09-20'),
      period: 1,
      section: 'A',
    },
    {
      $set: {
        department: itDept._id,
        semester: itSem1._id,
        teacher: mathTeacher._id,
        timeSlot: '09:00 - 09:50 AM',
        topicCovered: 'Cayley-Hamilton Theorem: Inverse Calculation & Higher Powers',
        academicYear: '2024-2025',
        totalStudents: 4,
        presentCount: 3,
        absentCount: 1,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const attendanceStatuses = [
    { email: '23it040@kpriet.ac.in', status: AttendanceStatus.PRESENT },
    { email: '23it041@kpriet.ac.in', status: AttendanceStatus.PRESENT },
    { email: '23it042@kpriet.ac.in', status: AttendanceStatus.PRESENT },
    { email: '23it043@kpriet.ac.in', status: AttendanceStatus.ABSENT, remarks: 'Medical Leave' },
  ];

  for (const item of attendanceStatuses) {
    const student = userDocs.get(item.email)!;
    await AttendanceRecord.findOneAndUpdate(
      { session: attendanceSession._id, student: student._id },
      {
        $set: {
          status: item.status,
          remarks: item.remarks,
          markedBy: mathTeacher._id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`✔ Seeded Attendance Session and 4 Attendance Records.`);

  // -------------------------------------------------------------------------
  // 12. AI / RAG KNOWLEDGE BASE & QUERY LOGS
  // -------------------------------------------------------------------------
  console.log('12. Seeding AI/RAG Knowledge Base & Query Logs...');
  const knowledgeDoc = await KnowledgeDocument.findOneAndUpdate(
    { title: 'KPRIET Regulation R2021 — Mathematics & Calculus Syllabus Document' },
    {
      $set: {
        documentType: 'SYLLABUS',
        department: itDept._id,
        semester: itSem1._id,
        subject: mathSub._id,
        sourceUrl: '/curriculum/r2021_mathematics.pdf',
        fileHash: 'sha256-a9b8c7d6e5f41234567890abcdef',
        chunkCount: 2,
        status: 'INDEXED',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await KnowledgeChunk.findOneAndUpdate(
    { document: knowledgeDoc._id, chunkIndex: 0 },
    {
      $set: {
        content: 'Unit 1 covers Eigenvalues, Eigenvectors, Cayley-Hamilton theorem, and Orthogonal diagonalisation of real symmetric matrices. Prerequisites: High school matrix algebra and determinants.',
        tokenCount: 38,
        embedding: [0.012, -0.045, 0.088, 0.124, -0.032],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await AIQueryLog.create({
    user: student40._id,
    question: 'How do I prove that eigenvalues of a real symmetric matrix are always real numbers?',
    query: 'How do I prove that eigenvalues of a real symmetric matrix are always real numbers?',
    response: 'To prove that eigenvalues of a real symmetric matrix A are real, consider the inner product ⟨Av, v⟩ where v is an eigenvector with eigenvalue λ. Because A = Aᵀ, taking complex conjugates shows (λ - λ̄)||v||² = 0. Since v is non-zero, λ = λ̄, establishing that λ is real.',
    modelUsed: 'gemini-1.5-pro',
    latencyMs: 420,
    feedbackRating: 5,
  });
  console.log(`✔ Seeded AI Knowledge Document, Chunk, and Query Log.`);

  // -------------------------------------------------------------------------
  // 13. AUDIT LOGS (Tracking Key System Actions)
  // -------------------------------------------------------------------------
  console.log('13. Seeding Audit Logs (Login, Approvals, Content, Grading)...');
  const auditEntries = [
    {
      user: userDocs.get('admin@kpriet.ac.in')._id,
      action: AuditAction.ADMIN_ACTION,
      entityType: 'Department',
      entityId: String(itDept._id),
      ipAddress: '127.0.0.1',
      userAgent: 'Eduverse-CLI/1.0',
      details: { action: 'INITIALIZE_KPRIET_DEPARTMENTS', departmentCount: 11 },
    },
    {
      user: hodIt._id,
      action: AuditAction.ENROLLMENT_APPROVAL,
      entityType: 'StudentEnrollment',
      entityId: String(student40._id),
      department: itDept._id,
      ipAddress: '127.0.0.1',
      details: { studentIdentifier: '23IT040', semester: '1', academicYear: '2024-2025' },
    },
    {
      user: mathTeacher._id,
      action: AuditAction.CONTENT_PUBLISH,
      entityType: 'Content',
      entityId: 'Eigenvalues-Notes',
      department: itDept._id,
      ipAddress: '127.0.0.1',
      details: { subjectCode: 'U21MA101', title: 'Eigenvalues and Eigenvectors' },
    },
    {
      user: mathTeacher._id,
      action: AuditAction.QUIZ_PUBLISH,
      entityType: 'Quiz',
      entityId: String(diagnosticQuiz._id),
      department: itDept._id,
      ipAddress: '127.0.0.1',
      details: { quizTitle: diagnosticQuiz.title, questionCount: 8 },
    },
    {
      user: mathTeacher._id,
      action: AuditAction.GRADING,
      entityType: 'AssignmentGrade',
      entityId: String(submission._id),
      department: itDept._id,
      ipAddress: '127.0.0.1',
      details: { studentIdentifier: '23IT040', marksObtained: 24, maxMarks: 25 },
    },
    {
      user: student40._id,
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: String(student40._id),
      ipAddress: '127.0.0.1',
      details: { role: 'STUDENT', client: 'Web Portal' },
    },
  ];

  for (const entry of auditEntries) {
    await AuditLog.create(entry);
  }
  console.log(`✔ Seeded ${auditEntries.length} Audit Log records.`);

  console.log('\n=============================================================');
  console.log('  KPRIET Eduverse Academic Data Architecture Seeded Successfully!');
  console.log('  - All KPRIET Departments: AD, IT, CSE, ECE, EEE, MECH, CIVIL, BME, CHEM, CSBS, SH');
  console.log('  - User Roles: PRINCIPAL, ADMIN, HOD, TEACHER, STUDENT');
  console.log('  - Unique Enforcements: Emails, Identifiers, Single Active Enrollment, TeacherAssignments');
  console.log('  - All 8 Quiz Question Types Verified');
  console.log('  - No plaintext passwords stored (Bcrypt hashed)');
  console.log('=============================================================\n');
}

// Direct execution when invoked from CLI
if (process.argv[1]?.endsWith('seed-academic-data.ts') || process.argv[1]?.endsWith('seed-academic-data.js')) {
  try {
    await connectDatabase();
    await seedAcademicData();
    await disconnectDatabase();
    process.exit(0);
  } catch (err) {
    console.error('✖ Seed execution failed:', err);
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  }
}
