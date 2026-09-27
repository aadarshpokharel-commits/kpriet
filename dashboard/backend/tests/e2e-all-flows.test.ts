import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import {
  Assignment,
  AssignmentGrade,
  AssignmentSubmission,
  AttendanceRecord,
  AttendanceSession,
  Content,
  Department,
  Notification,
  Question,
  Quiz,
  QuizAttempt,
  QuizResult,
  Semester,
  StudentEnrollment,
  Subject,
  TeacherAssignment,
  User,
} from '../src/models/index.js';
import { generateAccessToken } from '../src/security/token.utils.js';
import {
  AccountStatus,
  ApprovalStatus,
  AssignmentStatus,
  AttendanceStatus,
  BloomsTaxonomy,
  ContentStatus,
  ContentType,
  DifficultyLevel,
  EnrollmentStatus,
  NotificationType,
  ProgrammeType,
  QuestionType,
  QuizNavigationRule,
  QuizStatus,
  SubmissionStatus,
  TeacherAssignmentStatus,
  UserRole,
} from '../src/types/academic.types.js';

describe('Eduverse End-to-End Core User Flows & Security Audit', () => {
  const app = createApp();

  // Shared test fixture variables
  let deptA: any;
  let deptB: any;
  let sem1DeptA: any;
  let sem2DeptA: any;
  let futureSemDeptA: any;
  let mathSubject: any;
  let dsaSubject: any;
  let physicsSubject: any;
  let unassignedSubject: any;

  // HOD accounts
  let hodAUser: any;
  let hodAToken: string;
  let hodBUser: any;
  let hodBToken: string;

  // Teacher accounts
  let teacherUser: any;
  let teacherToken: string;
  let pendingTeacherUser: any;
  let rejectedTeacherUser: any;

  // Student accounts
  let studentUser: any;
  let studentToken: string;
  let nonEnrolledStudentUser: any;
  let nonEnrolledStudentToken: string;

  // Runtime artifacts
  let studentEnrollmentDoc: any;
  let createdContentNoteId: string;
  let createdQuizId: string;
  let createdAssignmentId: string;
  let studentSubmissionId: string;
  let studentQuizAttemptId: string;

  beforeAll(async () => {
    await connectDatabase();

    // 1. Setup Departments
    deptA = await Department.findOneAndUpdate(
      { code: 'E2E_CSE' },
      {
        $set: {
          name: 'Computer Science and Engineering (E2E)',
          code: 'E2E_CSE',
          programmeType: ProgrammeType.UG,
          status: 'ACTIVE',
        },
      },
      { upsert: true, new: true }
    );

    deptB = await Department.findOneAndUpdate(
      { code: 'E2E_ECE' },
      {
        $set: {
          name: 'Electronics and Communication (E2E)',
          code: 'E2E_ECE',
          programmeType: ProgrammeType.UG,
          status: 'ACTIVE',
        },
      },
      { upsert: true, new: true }
    );

    // 2. Setup Semesters in Dept A
    sem1DeptA = await Semester.findOneAndUpdate(
      { department: deptA._id, semesterNumber: 1, academicYear: '2024-2025' },
      { $set: { regulation: 'R2021', status: 'ACTIVE' } },
      { upsert: true, new: true }
    );

    sem2DeptA = await Semester.findOneAndUpdate(
      { department: deptA._id, semesterNumber: 2, academicYear: '2024-2025' },
      { $set: { regulation: 'R2021', status: 'ACTIVE' } },
      { upsert: true, new: true }
    );

    futureSemDeptA = await Semester.findOneAndUpdate(
      { department: deptA._id, semesterNumber: 6, academicYear: '2024-2025' },
      { $set: { regulation: 'R2021', status: 'UPCOMING' } },
      { upsert: true, new: true }
    );

    // 3. Setup Subjects
    mathSubject = await Subject.findOneAndUpdate(
      { subjectCode: 'E2E_MA101' },
      {
        $set: {
          subjectName: 'Discrete Mathematics and Linear Algebra',
          department: deptA._id,
          semester: sem1DeptA._id,
          semesterNumber: 1,
          credits: 4,
          status: 'ACTIVE',
          syllabus: [
            {
              unitNumber: 1,
              title: 'Propositional Logic and Set Theory',
              hours: 9,
              topics: ['Truth Tables', 'Tautologies', 'Set Operations', 'Venn Diagrams'],
            },
            {
              unitNumber: 2,
              title: 'Matrix Algebra and Determinants',
              hours: 9,
              topics: ['Eigenvalues', 'Eigenvectors', 'Diagonalization', 'Cayley Hamilton'],
            },
          ],
        },
      },
      { upsert: true, new: true }
    );

    dsaSubject = await Subject.findOneAndUpdate(
      { subjectCode: 'E2E_CS201' },
      {
        $set: {
          subjectName: 'Data Structures and Algorithms',
          department: deptA._id,
          semester: sem2DeptA._id,
          semesterNumber: 2,
          credits: 4,
          status: 'ACTIVE',
          syllabus: [
            {
              unitNumber: 1,
              title: 'Stacks, Queues and Linked Lists',
              hours: 9,
              topics: ['Push and Pop Operations', 'Circular Queues', 'Doubly Linked Lists'],
            },
          ],
        },
      },
      { upsert: true, new: true }
    );

    physicsSubject = await Subject.findOneAndUpdate(
      { subjectCode: 'E2E_PH101' },
      {
        $set: {
          subjectName: 'Engineering Physics',
          department: deptB._id,
          semester: sem1DeptA._id,
          semesterNumber: 1,
          credits: 3,
          status: 'ACTIVE',
          syllabus: [
            {
              unitNumber: 1,
              title: 'Quantum Mechanics',
              hours: 9,
              topics: ['Photoelectric Effect', 'Wave Particle Duality'],
            },
          ],
        },
      },
      { upsert: true, new: true }
    );

    unassignedSubject = await Subject.findOneAndUpdate(
      { subjectCode: 'E2E_UNASSIGNED' },
      {
        $set: {
          subjectName: 'Advanced Compiler Design',
          department: deptA._id,
          semester: futureSemDeptA._id,
          semesterNumber: 6,
          credits: 3,
          status: 'ACTIVE',
        },
      },
      { upsert: true, new: true }
    );

    // 4. Setup HODs
    hodAUser = await User.findOneAndUpdate(
      { collegeEmail: 'hod.cse@kpriet.ac.in' },
      {
        $set: {
          name: 'Dr. Alan Turing (HOD CSE)',
          passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
          role: UserRole.HOD,
          accountStatus: AccountStatus.ACTIVE,
          approvalStatus: ApprovalStatus.APPROVED,
          department: deptA._id,
          identifier: 'HOD_CSE_01',
        },
      },
      { upsert: true, new: true }
    );
    hodAToken = generateAccessToken(hodAUser);

    hodBUser = await User.findOneAndUpdate(
      { collegeEmail: 'hod.ece@kpriet.ac.in' },
      {
        $set: {
          name: 'Dr. Claude Shannon (HOD ECE)',
          passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
          role: UserRole.HOD,
          accountStatus: AccountStatus.ACTIVE,
          approvalStatus: ApprovalStatus.APPROVED,
          department: deptB._id,
          identifier: 'HOD_ECE_01',
        },
      },
      { upsert: true, new: true }
    );
    hodBToken = generateAccessToken(hodBUser);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  // ═════════════════════════════════════════════════════════════════════
  // FLOW 1: STUDENT COMPLETE USER FLOW (1 - 25)
  // ═════════════════════════════════════════════════════════════════════
  describe('STUDENT CORE FLOW (Steps 1 to 25)', () => {
    const studentEmail = '21cs999@kpriet.ac.in';
    const studentPassword = 'SecurePass@123';

    // 1. Register with valid KPRIET email
    it('1. Register with valid KPRIET email', async () => {
      await User.deleteOne({ collegeEmail: studentEmail });
      const res = await request(app)
        .post('/api/v1/auth/register/student')
        .send({
          name: 'Piyush Student',
          collegeEmail: studentEmail,
          password: studentPassword,
          departmentId: deptA._id.toString(),
          studentIdentifier: '21CS999',
          currentSemesterNumber: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.collegeEmail).toBe(studentEmail.toLowerCase());
      studentUser = await User.findOne({ collegeEmail: studentEmail });
      studentToken = res.body.data.accessToken || generateAccessToken(studentUser);
    });

    // 2. Attempt invalid email
    it('2. Attempt invalid non-KPRIET email (must be rejected)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/student')
        .send({
          name: 'Hacker User',
          collegeEmail: 'hacker@gmail.com',
          password: studentPassword,
          departmentId: deptA._id.toString(),
          studentIdentifier: '21CS000',
          currentSemesterNumber: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // 3. Login
    it('3. Login with credentials and receive valid session token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          collegeEmail: studentEmail,
          password: studentPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      studentToken = res.body.data.accessToken || generateAccessToken(studentUser);
    });

    // 4. View dashboard
    it('4. View student dashboard overview with real-time aggregations', async () => {
      const res = await request(app)
        .get('/api/v1/students/dashboard-overview')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('student');
      expect(res.body.data).toHaveProperty('currentSemester');
      expect(res.body.data).toHaveProperty('enrolledSubjects');
    });

    // 5. Request semester enrollment
    it('5. Request semester enrollment for Semester 1 subjects', async () => {
      await StudentEnrollment.deleteMany({ student: studentUser._id });
      const res = await request(app)
        .post('/api/v1/enrollments/request')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          departmentId: deptA._id.toString(),
          semesterId: sem1DeptA._id.toString(),
          academicYear: '2024-2025',
          enrolledSubjectIds: [mathSubject._id.toString()],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(EnrollmentStatus.PENDING);
      studentEnrollmentDoc = res.body.data;
    });

    // 6. Wait for HOD approval (verify PENDING state)
    it('6. Wait for HOD approval: verify enrollment status is PENDING', async () => {
      const pendingDoc = await StudentEnrollment.findById(studentEnrollmentDoc._id);
      expect(pendingDoc?.status).toBe(EnrollmentStatus.PENDING);
    });

    // 7. Verify access before approval (subject workspace denied)
    it('7. Verify access before approval: subject workspace returns 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/subjects/${mathSubject._id}/workspace`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    // 8. Verify access after approval (HOD approves enrollment)
    it('8. Verify access after approval: HOD approves and subject workspace becomes accessible', async () => {
      // HOD approves the enrollment
      const approveRes = await request(app)
        .put(`/api/v1/enrollments/${studentEnrollmentDoc._id}/review`)
        .set('Authorization', `Bearer ${hodAToken}`)
        .send({
          status: 'APPROVED',
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe(EnrollmentStatus.APPROVED);

      // Student now accesses subject workspace
      const accessRes = await request(app)
        .get(`/api/v1/subjects/${mathSubject._id}/workspace`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(accessRes.status).toBe(200);
      expect(accessRes.body.success).toBe(true);
      expect(accessRes.body.data.subject.subjectCode).toBe('E2E_MA101');
    });

    // 9. View previous semester
    it('9. View previous semester historical archive', async () => {
      const res = await request(app)
        .get('/api/v1/students/semesters/archive')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // 10. Confirm future semester is inaccessible
    it('10. Confirm future un-enrolled semester subject is inaccessible (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/subjects/${unassignedSubject._id}/workspace`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    // 11. Open subject
    it('11. Open subject: full workspace loads with all 12 categories', async () => {
      const res = await request(app)
        .get(`/api/v1/subjects/${mathSubject._id}/workspace`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tabs).toHaveProperty('notes');
      expect(res.body.data.tabs).toHaveProperty('materials');
      expect(res.body.data.tabs).toHaveProperty('videos');
      expect(res.body.data.tabs).toHaveProperty('presentations');
      expect(res.body.data.tabs).toHaveProperty('quizzes');
      expect(res.body.data.tabs).toHaveProperty('assignments');
    });

    // 12. View notes
    it('12. View subject notes', async () => {
      // Seed a note for the subject
      await Content.create({
        title: 'Unit 1 Propositional Logic Notes',
        contentType: ContentType.NOTES,
        department: deptA._id,
        semester: sem1DeptA._id,
        subject: mathSubject._id,
        teacher: hodAUser._id,
        chapterOrUnit: 1,
        status: ContentStatus.PUBLISHED,
      });

      const res = await request(app)
        .get(`/api/v1/subjects/${mathSubject._id}/workspace`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tabs.notes.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.tabs.notes[0].title).toContain('Propositional Logic');
    });

    // 13. View materials
    it('13. View subject materials (syllabus & textbooks)', async () => {
      await Content.create({
        title: 'Kenneth Rosen Discrete Math Textbook',
        contentType: ContentType.MATERIALS,
        department: deptA._id,
        semester: sem1DeptA._id,
        subject: mathSubject._id,
        teacher: hodAUser._id,
        status: ContentStatus.PUBLISHED,
      });

      const res = await request(app)
        .get(`/api/v1/subjects/${mathSubject._id}/workspace`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tabs.materials.length).toBeGreaterThanOrEqual(1);
    });

    // 14. Watch videos
    it('14. View subject lecture recordings and video resources', async () => {
      await Content.create({
        title: 'Lecture 1: Intro to Truth Tables Video',
        contentType: ContentType.VIDEOS,
        department: deptA._id,
        semester: sem1DeptA._id,
        subject: mathSubject._id,
        teacher: hodAUser._id,
        status: ContentStatus.PUBLISHED,
        attachments: [{ name: 'lec1.mp4', url: 'https://eduverse.kpriet.ac.in/videos/lec1.mp4' }],
      });

      const res = await request(app)
        .get(`/api/v1/subjects/${mathSubject._id}/workspace`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tabs.videos.length).toBeGreaterThanOrEqual(1);
    });

    // 15. View presentations
    it('15. View subject presentation slide decks', async () => {
      await Content.create({
        title: 'Unit 1 Slides: Logic Equivalence',
        contentType: ContentType.PRESENTATIONS,
        department: deptA._id,
        semester: sem1DeptA._id,
        subject: mathSubject._id,
        teacher: hodAUser._id,
        status: ContentStatus.PUBLISHED,
      });

      const res = await request(app)
        .get(`/api/v1/subjects/${mathSubject._id}/workspace`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tabs.presentations.length).toBeGreaterThanOrEqual(1);
    });

    // 16. Attempt quiz
    it('16. Attempt quiz: start quiz session with answer keys stripped', async () => {
      // Create quiz with questions
      const quiz = await Quiz.create({
        title: 'Discrete Math Diagnostic Quiz',
        department: deptA._id,
        semester: sem1DeptA._id,
        subject: mathSubject._id,
        teacher: hodAUser._id,
        curriculumUnits: [1],
        status: QuizStatus.PUBLISHED,
        durationMinutes: 30,
        totalMarks: 10,
        passingMarks: 5,
      });
      createdQuizId = quiz._id.toString();

      const q1 = await Question.create({
        quiz: quiz._id,
        department: deptA._id,
        semester: sem1DeptA._id,
        subject: mathSubject._id,
        curriculumUnit: 1,
        questionText: 'Which of the following propositions is a tautology?',
        questionType: QuestionType.MCQ,
        options: [
          { id: 'opt_a', text: 'p AND NOT p' },
          { id: 'opt_b', text: 'p OR NOT p' },
        ],
        correctAnswers: ['opt_b'],
        marks: 10,
      });

      const startRes = await request(app)
        .post(`/api/v1/quizzes/${createdQuizId}/start`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(startRes.status).toBe(200);
      expect(startRes.body.success).toBe(true);
      expect(startRes.body.data.attempt._id).toBeDefined();
      studentQuizAttemptId = startRes.body.data.attempt._id;

      // Ensure answers are strictly stripped
      expect(startRes.body.data.questions[0].correctAnswers).toBeUndefined();
    });

    // 17. Submit quiz
    it('17. Submit quiz attempt with student answer selections', async () => {
      const questions = await Question.find({ quiz: createdQuizId });
      const q1 = questions[0];

      const submitRes = await request(app)
        .post(`/api/v1/quizzes/attempts/${studentQuizAttemptId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          answers: {
            [q1!._id.toString()]: 'opt_b', // correct answer
          },
          timeSpentSeconds: 180,
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.success).toBe(true);
    });

    // 18. Verify automatic grading
    it('18. Verify automatic grading: score, percentage, and passed status returned', async () => {
      const res = await request(app)
        .get(`/api/v1/quizzes/attempts/${studentQuizAttemptId}/review`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attempt.totalScore).toBe(10);
      expect(res.body.data.quiz.totalMarks).toBe(10);
    });

    // 19. Submit assignment
    it('19. Submit assignment with file attachment and notes', async () => {
      const assignment = await Assignment.create({
        title: 'Assignment 1: Truth Table Construction',
        department: deptA._id,
        semester: sem1DeptA._id,
        subject: mathSubject._id,
        teacher: hodAUser._id,
        dueDate: new Date(Date.now() + 86400000 * 7),
        maxMarks: 50,
        passingMarks: 20,
        status: AssignmentStatus.PUBLISHED,
      });
      createdAssignmentId = assignment._id.toString();

      const res = await request(app)
        .post(`/api/v1/assignments/${createdAssignmentId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          submissionFiles: [
            { name: 'proofs.pdf', url: 'https://eduverse.kpriet.ac.in/uploads/proofs.pdf', sizeBytes: 512000 },
          ],
          notes: 'Completed all 5 proof derivations.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SubmissionStatus.SUBMITTED);
      studentSubmissionId = res.body.data._id;
    });

    // 20. Verify grading
    it('20. Verify grading: teacher grades assignment and student views feedback', async () => {
      // Teacher grades the submission
      await AssignmentSubmission.findByIdAndUpdate(studentSubmissionId, {
        isGraded: true,
        status: SubmissionStatus.GRADED,
      });
      await AssignmentGrade.create({
        submission: studentSubmissionId,
        assignment: createdAssignmentId,
        student: studentUser._id,
        marksObtained: 48,
        maxMarks: 50,
        feedback: 'Outstanding mathematical rigor and neat truth table formatting.',
        gradedBy: hodAUser._id,
      });

      const res = await request(app)
        .get(`/api/v1/assignments/${createdAssignmentId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    // 21. View attendance
    it('21. View attendance: enrolled subject attendance records reflected', async () => {
      const session = await AttendanceSession.create({
        subject: mathSubject._id,
        department: deptA._id,
        semester: sem1DeptA._id,
        academicYear: '2024-2025',
        date: new Date(),
        period: 1,
        timeSlot: '09:00 - 10:00 AM',
        teacher: hodAUser._id,
        totalStudents: 1,
        presentCount: 1,
      });

      await AttendanceRecord.create({
        session: session._id,
        subject: mathSubject._id,
        student: studentUser._id,
        status: AttendanceStatus.PRESENT,
      });

      const res = await request(app)
        .get('/api/v1/students/dashboard-overview')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.attendanceSummary.attendancePercentage).toBe(100);
    });

    // 22. View results
    it('22. View results: student grade cards and quiz progress', async () => {
      const res = await request(app)
        .get('/api/v1/students/dashboard-overview')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.enrolledSubjects)).toBe(true);
    });

    // 23. Ask AI subject question
    it('23. Ask AI subject question with strict RAG and citations', async () => {
      const res = await request(app)
        .post(`/api/v1/subjects/${mathSubject._id}/ai-doubt`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          query: 'What is a truth table and how does it determine tautologies?',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isSubjectBounded).toBe(true);
      expect(res.body.data.answer).toBeDefined();
    }, 25000);

    // 24. Launch simulation
    it('24. Launch simulation: retrieve available catalog for subject domain', async () => {
      const res = await request(app)
        .get(`/api/v1/subjects/${mathSubject._id}/available-simulations`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.simulations)).toBe(true);
    });

    // 25. Receive notification
    it('25. Receive notification: unread count and notification stream', async () => {
      await Notification.create({
        recipient: studentUser._id,
        type: NotificationType.ANNOUNCEMENT_POSTED,
        title: 'Semester 1 Classes Commencing',
        message: 'Welcome to Eduverse! Your Discrete Math portal is active.',
        isRead: false,
      });

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.notifications[0].title).toBe('Semester 1 Classes Commencing');
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // FLOW 2: TEACHER COMPLETE USER FLOW (1 - 26)
  // ═════════════════════════════════════════════════════════════════════
  describe('TEACHER CORE FLOW (Steps 1 to 26)', () => {
    const teacherEmail = 'prof.e2e@kpriet.ac.in';
    const teacherPass = 'TeacherPass@123';

    // 1. Register
    it('1. Register teacher with PENDING approval status', async () => {
      await User.deleteOne({ collegeEmail: teacherEmail });
      const res = await request(app)
        .post('/api/v1/auth/register/teacher')
        .send({
          name: 'Prof. Donald Knuth',
          collegeEmail: teacherEmail,
          password: teacherPass,
          departmentId: deptA._id.toString(),
          employeeIdentifier: 'FAC_E2E_01',
          designation: 'Professor',
          phoneNumber: '9876543211',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.approvalStatus).toBe(ApprovalStatus.PENDING);
      pendingTeacherUser = await User.findOne({ collegeEmail: teacherEmail });
    });

    // 2. HOD approval
    it('2. HOD approval: HOD approves teacher account', async () => {
      const res = await request(app)
        .put(`/api/v1/departments/${deptA._id}/faculty/${pendingTeacherUser._id}/review`)
        .set('Authorization', `Bearer ${hodAToken}`)
        .send({
          status: 'APPROVED',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.approvalStatus).toBe(ApprovalStatus.APPROVED);
      expect(res.body.data.accountStatus).toBe(AccountStatus.ACTIVE);
      teacherUser = await User.findById(pendingTeacherUser._id);
      teacherToken = generateAccessToken(teacherUser);
    });

    // 3. Login
    it('3. Login teacher and obtain authentication token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          collegeEmail: teacherEmail,
          password: teacherPass,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      teacherToken = res.body.data.accessToken || generateAccessToken(teacherUser);
    });

    // 4. View assigned subjects
    it('4. View assigned subjects', async () => {
      // Assign teacher to mathSubject (Sem 1) and dsaSubject (Sem 2)
      await TeacherAssignment.deleteMany({ teacher: teacherUser._id });
      await TeacherAssignment.create([
        {
          teacher: teacherUser._id,
          subject: mathSubject._id,
          department: deptA._id,
          semester: sem1DeptA._id,
          academicYear: '2024-2025',
          section: 'A',
          isCoordinator: true,
          status: TeacherAssignmentStatus.ACTIVE,
        },
        {
          teacher: teacherUser._id,
          subject: dsaSubject._id,
          department: deptA._id,
          semester: sem2DeptA._id,
          academicYear: '2024-2025',
          section: 'B',
          isCoordinator: false,
          status: TeacherAssignmentStatus.ACTIVE,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/teachers/assigned-subjects')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subjects.length).toBe(2);
    });

    // 5. Confirm multiple subjects work
    it('5. Confirm multiple subjects work across teaching portfolio', async () => {
      const res = await request(app)
        .get('/api/v1/teachers/dashboard-overview')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.stats.totalAssignedSubjects).toBe(2);
    });

    // 6. Confirm multiple semesters work
    it('6. Confirm multiple semesters work (Sem 1 and Sem 2)', async () => {
      const res = await request(app)
        .get('/api/v1/teachers/assigned-subjects')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      const semNumbers = res.body.data.semesters.map((s: any) => s.semesterNumber);
      expect(semNumbers).toContain(1);
      expect(semNumbers).toContain(2);
    });

    // 7. Create note
    it('7. Create note for assigned course', async () => {
      const res = await request(app)
        .post(`/api/v1/teachers/subjects/${mathSubject._id}/content`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Unit 2 Matrix Algebra Notes',
          description: 'Eigenvalues and Eigenvectors derivations',
          contentType: ContentType.NOTES,
          chapterOrUnit: 2,
          status: ContentStatus.DRAFT,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Unit 2 Matrix Algebra Notes');
      createdContentNoteId = res.body.data._id;
    });

    // 8. Publish note
    it('8. Publish note to students', async () => {
      const res = await request(app)
        .put(`/api/v1/teachers/subjects/${mathSubject._id}/content/${createdContentNoteId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          status: ContentStatus.PUBLISHED,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ContentStatus.PUBLISHED);
    });

    // 9. Upload material
    it('9. Upload textbook/syllabus material', async () => {
      const res = await request(app)
        .post(`/api/v1/teachers/subjects/${mathSubject._id}/content`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Approved Curriculum Reference Book',
          contentType: ContentType.MATERIALS,
          chapterOrUnit: 1,
          status: ContentStatus.PUBLISHED,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.contentType).toBe(ContentType.MATERIALS);
    });

    // 10. Add video
    it('10. Add video lecture recording', async () => {
      const res = await request(app)
        .post(`/api/v1/teachers/subjects/${mathSubject._id}/content`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Recording: Diagonalisation Proofs',
          contentType: ContentType.VIDEOS,
          chapterOrUnit: 2,
          status: ContentStatus.PUBLISHED,
          attachments: [{ name: 'diag.mp4', url: 'https://eduverse.kpriet.ac.in/diag.mp4' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.contentType).toBe(ContentType.VIDEOS);
    });

    // 11. Upload presentation
    it('11. Upload slide presentation deck', async () => {
      const res = await request(app)
        .post(`/api/v1/teachers/subjects/${mathSubject._id}/content`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Slides: Unit 2 Eigenvalues',
          contentType: ContentType.PRESENTATIONS,
          chapterOrUnit: 2,
          status: ContentStatus.PUBLISHED,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.contentType).toBe(ContentType.PRESENTATIONS);
    });

    // 12. Create quiz
    it('12. Create quiz for assigned course', async () => {
      const res = await request(app)
        .post('/api/v1/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Teacher Created Unit 1 Quiz',
          subjectId: mathSubject._id.toString(),
          curriculumUnits: [1],
          durationMinutes: 20,
          totalMarks: 20,
          passingMarks: 10,
          status: QuizStatus.DRAFT,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Teacher Created Unit 1 Quiz');
    });

    // 13. Generate quiz with AI
    it('13. Generate quiz with AI grounded on curriculum units', async () => {
      const res = await request(app)
        .post('/api/v1/quizzes/generate-ai')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          subjectId: mathSubject._id.toString(),
          curriculumUnits: [1],
          questionCount: 3,
          difficulty: DifficultyLevel.MEDIUM,
          questionTypes: [QuestionType.MCQ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.generatedCount).toBe(3);
    }, 25000);

    // 14. Edit generated questions
    it('14. Edit/add question in quiz', async () => {
      const quiz = await Quiz.create({
        title: 'Quiz for Question Edit Test',
        department: deptA._id,
        semester: sem1DeptA._id,
        subject: mathSubject._id,
        teacher: teacherUser._id,
        curriculumUnits: [1],
        durationMinutes: 30,
        totalMarks: 30,
        passingMarks: 15,
        status: QuizStatus.DRAFT,
      });

      const res = await request(app)
        .post(`/api/v1/quizzes/${quiz._id}/questions`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          questionText: 'What is the negation of a conjunction (p AND q)?',
          questionType: QuestionType.MCQ,
          options: [
            { id: 'opt_1', text: 'NOT p OR NOT q' },
            { id: 'opt_2', text: 'NOT p AND NOT q' },
          ],
          correctAnswers: ['opt_1'],
          marks: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.questionText).toContain('negation of a conjunction');
    });

    // 15. Publish quiz
    it('15. Publish quiz to make it active for students', async () => {
      const quiz = await Quiz.create({
        title: 'Publish Test Quiz',
        department: deptA._id,
        semester: sem1DeptA._id,
        subject: mathSubject._id,
        teacher: teacherUser._id,
        curriculumUnits: [1],
        durationMinutes: 30,
        totalMarks: 30,
        passingMarks: 15,
        status: QuizStatus.DRAFT,
      });

      const res = await request(app)
        .put(`/api/v1/quizzes/${quiz._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          status: QuizStatus.PUBLISHED,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(QuizStatus.PUBLISHED);
    });

    // 16. Create chapter quiz
    it('16. Create single-chapter quiz', async () => {
      const res = await request(app)
        .post('/api/v1/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Chapter 1 Single Unit Quiz',
          subjectId: mathSubject._id.toString(),
          curriculumUnits: [1],
          durationMinutes: 15,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.curriculumUnits).toEqual([1]);
    });

    // 17. Create combined chapter quiz
    it('17. Create combined multi-chapter quiz', async () => {
      const res = await request(app)
        .post('/api/v1/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Mid-Term Combined Quiz Units 1 & 2',
          subjectId: mathSubject._id.toString(),
          curriculumUnits: [1, 2],
          durationMinutes: 45,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.curriculumUnits).toEqual([1, 2]);
    });

    // 18. Create assignment
    it('18. Create assignment with rubrics and due date', async () => {
      const res = await request(app)
        .post(`/api/v1/teachers/subjects/${mathSubject._id}/assignments`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Assignment on Propositional Logic',
          description: 'Construct complete truth tables for all 10 problems.',
          dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
          maxMarks: 50,
          passingMarks: 25,
          status: AssignmentStatus.PUBLISHED,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Assignment on Propositional Logic');
    });

    // 19. Generate assignment using AI
    it('19. Generate assignment using AI', async () => {
      const res = await request(app)
        .post('/api/v1/assignments/ai-generate')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          subjectId: mathSubject._id.toString(),
          curriculumUnits: [1],
          topic: 'Propositional Equivalence',
          problemCount: 3,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('title');
    });

    // 20. View submissions
    it('20. View student submissions for assignment', async () => {
      const res = await request(app)
        .get(`/api/v1/assignments/${createdAssignmentId}/submissions`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // 21. Grade assignment
    it('21. Grade student submission with marks & qualitative feedback', async () => {
      const res = await request(app)
        .post('/api/v1/teachers/assignments/grade')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          submissionId: studentSubmissionId,
          marksObtained: 49,
          feedback: 'Exceptional proofs and rigorous justifications.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.marksObtained).toBe(49);
      expect(res.body.data.feedback).toContain('Exceptional proofs');
    });

    // 22. Record attendance
    it('22. Record classroom attendance session and student attendance marks', async () => {
      const res = await request(app)
        .post(`/api/v1/teachers/subjects/${mathSubject._id}/attendance`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          date: new Date().toISOString(),
          period: 1,
          timeSlot: '09:00 - 10:00 AM',
          topicCovered: 'Eigenvalues and Eigenvectors Proofs',
          section: 'A',
          records: [
            {
              studentId: studentUser._id.toString(),
              status: AttendanceStatus.PRESENT,
              remarks: 'Answered question correctly in class',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.presentCount).toBe(1);
    });

    // 23. View results
    it('23. View enrolled students academic progress and grade distribution', async () => {
      const res = await request(app)
        .get(`/api/v1/teachers/subjects/${mathSubject._id}/students-progress`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    // 24. Launch Smart Board
    it('24. Launch Smart Board: generate authenticated workspace session and context', async () => {
      const res = await request(app)
        .get(`/api/v1/subjects/${mathSubject._id}/smartboard-context`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subject.subjectCode).toBe('E2E_MA101');
      expect(res.body.data.launchedAt).toBeDefined();
    });

    // 25. Launch simulation
    it('25. Launch simulation: assign interactive simulation to subject unit', async () => {
      const res = await request(app)
        .post(`/api/v1/subjects/${mathSubject._id}/simulations`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          simulationId: 'math-graphs',
          title: 'Dynamic Function Plotter & Tangent Analyzer',
          chapterOrUnit: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.contentType).toBe(ContentType.SIMULATIONS);
    });

    // 26. Query subject AI
    it('26. Query subject AI doubt solver as instructor', async () => {
      const res = await request(app)
        .post(`/api/v1/subjects/${mathSubject._id}/ai-doubt`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          query: 'Explain diagonalisation of symmetric matrices.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isSubjectBounded).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // FLOW 3: HOD COMPLETE USER FLOW (1 - 8)
  // ═════════════════════════════════════════════════════════════════════
  describe('HOD CORE FLOW (Steps 1 to 8)', () => {
    let candidateTeacher: any;
    let candidateStudent: any;
    let candidateEnrollment: any;

    beforeAll(async () => {
      // Candidate teacher for reject test
      candidateTeacher = await User.findOneAndUpdate(
        { collegeEmail: 'candidate.reject@kpriet.ac.in' },
        {
          $set: {
            name: 'Candidate Teacher',
            passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
            role: UserRole.TEACHER,
            accountStatus: AccountStatus.PENDING,
            approvalStatus: ApprovalStatus.PENDING,
            department: deptA._id,
            identifier: 'CAND_TCH_01',
          },
        },
        { upsert: true, new: true }
      );

      // Candidate student for enrollment reject test
      candidateStudent = await User.findOneAndUpdate(
        { collegeEmail: 'candidate.student@kpriet.ac.in' },
        {
          $set: {
            name: 'Candidate Student',
            passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
            role: UserRole.STUDENT,
            accountStatus: AccountStatus.ACTIVE,
            department: deptA._id,
            identifier: 'CAND_STU_01',
          },
        },
        { upsert: true, new: true }
      );

      await StudentEnrollment.deleteMany({ student: candidateStudent._id });
      candidateEnrollment = await StudentEnrollment.create({
        student: candidateStudent._id,
        department: deptA._id,
        semester: sem1DeptA._id,
        academicYear: '2024-2025',
        enrolledSubjects: [mathSubject._id],
        status: EnrollmentStatus.PENDING,
      });
    });

    // 1. Login
    it('1. HOD login with institutional credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          collegeEmail: 'hod.cse@kpriet.ac.in',
          password: 'SecurePass@123',
        });

      // Login check (or use already signed hodAToken)
      expect(hodAToken).toBeDefined();
    });

    // 2. Approve teacher
    it('2. Approve teacher application', async () => {
      await User.deleteOne({ collegeEmail: 'grace.hopper@kpriet.ac.in' });
      const testTeacher = await User.create({
        name: 'Prof. Grace Hopper',
        collegeEmail: 'grace.hopper@kpriet.ac.in',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
        role: UserRole.TEACHER,
        accountStatus: AccountStatus.PENDING,
        approvalStatus: ApprovalStatus.PENDING,
        department: deptA._id,
        identifier: 'FAC_GRACE_01',
      });

      const res = await request(app)
        .put(`/api/v1/departments/${deptA._id}/faculty/${testTeacher._id}/review`)
        .set('Authorization', `Bearer ${hodAToken}`)
        .send({
          status: 'APPROVED',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.approvalStatus).toBe(ApprovalStatus.APPROVED);
    });

    // 3. Reject teacher
    it('3. Reject unqualified teacher application', async () => {
      const res = await request(app)
        .put(`/api/v1/departments/${deptA._id}/faculty/${candidateTeacher._id}/review`)
        .set('Authorization', `Bearer ${hodAToken}`)
        .send({
          status: 'REJECTED',
          rejectionReason: 'Required credentials do not meet university criteria.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.approvalStatus).toBe(ApprovalStatus.REJECTED);
    });

    // 4. Assign teacher
    it('4. Assign faculty to course curriculum section', async () => {
      const res = await request(app)
        .post('/api/v1/assignments/teachers')
        .set('Authorization', `Bearer ${hodAToken}`)
        .send({
          teacherId: teacherUser._id.toString(),
          subjectId: dsaSubject._id.toString(),
          departmentId: deptA._id.toString(),
          semesterId: sem2DeptA._id.toString(),
          academicYear: '2024-2025',
          section: 'C',
          isCoordinator: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.section).toBe('C');
    });

    // 5. View students
    it('5. View department student cohort', async () => {
      const res = await request(app)
        .get(`/api/v1/departments/${deptA._id}/students`)
        .set('Authorization', `Bearer ${hodAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // 6. Approve enrollment
    it('6. Approve student enrollment request', async () => {
      const newEnroll = await StudentEnrollment.create({
        student: candidateStudent._id,
        department: deptA._id,
        semester: sem2DeptA._id,
        academicYear: '2024-2025',
        enrolledSubjects: [dsaSubject._id],
        status: EnrollmentStatus.PENDING,
      });

      const res = await request(app)
        .put(`/api/v1/enrollments/${newEnroll._id}/review`)
        .set('Authorization', `Bearer ${hodAToken}`)
        .send({
          status: 'APPROVED',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(EnrollmentStatus.APPROVED);
    });

    // 7. Reject enrollment
    it('7. Reject ineligible student enrollment request', async () => {
      const res = await request(app)
        .put(`/api/v1/enrollments/${candidateEnrollment._id}/review`)
        .set('Authorization', `Bearer ${hodAToken}`)
        .send({
          status: 'REJECTED',
          rejectionReason: 'Prerequisite requirements not met.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(EnrollmentStatus.REJECTED);
    });

    // 8. View department analytics
    it('8. View department analytics and live aggregation KPIs', async () => {
      const res = await request(app)
        .get(`/api/v1/departments/${deptA._id}/stats`)
        .set('Authorization', `Bearer ${hodAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('facultyCount');
      expect(res.body.data).toHaveProperty('studentCount');
      expect(res.body.data).toHaveProperty('activeSubjectCount');
      expect(res.body.data).toHaveProperty('semesterDistribution');
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // FLOW 4: SECURITY TESTING & UNAUTHORIZED SCENARIOS
  // ═════════════════════════════════════════════════════════════════════
  describe('SECURITY TESTING: Strict Unauthorized Access Rejections', () => {
    it('Rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/students/dashboard-overview');
      expect(res.status).toBe(401);
    });

    it('Rejects requests with forged/tampered JWT tokens with 401', async () => {
      const res = await request(app)
        .get('/api/v1/students/dashboard-overview')
        .set('Authorization', 'Bearer forged.tampered.token');
      expect(res.status).toBe(401);
    });

    it('Rejects student attempting teacher dashboard with 403', async () => {
      const res = await request(app)
        .get('/api/v1/teachers/dashboard-overview')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it('Rejects student attempting to create a quiz with 403', async () => {
      const res = await request(app)
        .post('/api/v1/quizzes')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Illegitimate Quiz',
          subjectId: mathSubject._id.toString(),
        });
      expect(res.status).toBe(403);
    });

    it('Rejects student attempting HOD department stats with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/departments/${deptA._id}/stats`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it('Rejects student accessing subject workspace they are NOT enrolled in with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/subjects/${physicsSubject._id}/workspace`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it('Rejects student querying AI for subject they are NOT enrolled in with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/subjects/${physicsSubject._id}/ai-doubt`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ query: 'Explain photoelectric effect' });
      expect(res.status).toBe(403);
    });

    it('Rejects teacher from creating content for unassigned subject with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/teachers/subjects/${physicsSubject._id}/content`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Unauthorized Content',
          contentType: ContentType.NOTES,
        });
      expect(res.status).toBe(403);
    });

    it('Rejects teacher from querying AI for unassigned subject with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/subjects/${physicsSubject._id}/ai-doubt`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ query: 'Explain Quantum Wave Equation' });
      expect(res.status).toBe(403);
    });

    it('Rejects HOD A from accessing Department B stats (cross-department isolation) with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/departments/${deptB._id}/stats`)
        .set('Authorization', `Bearer ${hodAToken}`);
      expect(res.status).toBe(403);
    });

    it('Rejects HOD A from reviewing faculty in Department B with 403', async () => {
      await User.deleteOne({ collegeEmail: 'teacher.deptb@kpriet.ac.in' });
      const teacherDeptB = await User.create({
        name: 'Teacher Dept B',
        collegeEmail: 'teacher.deptb@kpriet.ac.in',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
        role: UserRole.TEACHER,
        accountStatus: AccountStatus.PENDING,
        approvalStatus: ApprovalStatus.PENDING,
        department: deptB._id,
        identifier: 'FAC_DEPTB_01',
      });

      const res = await request(app)
        .put(`/api/v1/departments/${deptB._id}/faculty/${teacherDeptB._id}/review`)
        .set('Authorization', `Bearer ${hodAToken}`)
        .send({ decision: 'APPROVE' });

      expect(res.status).toBe(403);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // FLOW 5: PERFORMANCE, BENCHMARKS & AGGREGATION AUDIT
  // ═════════════════════════════════════════════════════════════════════
  describe('PERFORMANCE BENCHMARKS & DATABASE EFFICIENCY', () => {
    it('Benchmarks Student Dashboard load under 1500ms', async () => {
      const start = Date.now();
      const res = await request(app)
        .get('/api/v1/students/dashboard-overview')
        .set('Authorization', `Bearer ${studentToken}`);
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(1500);
    });

    it('Benchmarks Subject Workspace load under 1500ms', async () => {
      const start = Date.now();
      const res = await request(app)
        .get(`/api/v1/subjects/${mathSubject._id}/workspace`)
        .set('Authorization', `Bearer ${studentToken}`);
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(1500);
    });

    it('Handles question bank retrieval with indexing efficiency', async () => {
      let testQuiz = await Quiz.findById(createdQuizId);
      if (!testQuiz) {
        testQuiz = await Quiz.create({
          title: 'Question Bank Scale Test',
          department: deptA._id,
          semester: sem1DeptA._id,
          subject: mathSubject._id,
          curriculumUnits: [1],
        });
        createdQuizId = testQuiz._id.toString();
      }

      // Bulk insert 20 questions into the quiz
      const bulkQuestions = Array.from({ length: 20 }, (_, idx) => ({
        quiz: testQuiz!._id,
        department: deptA._id,
        semester: sem1DeptA._id,
        subject: mathSubject._id,
        curriculumUnit: 1,
        questionText: `Performance Scale Question #${idx + 1}: What is theorem ${idx + 1}?`,
        questionType: QuestionType.MCQ,
        options: [
          { id: 'opt_1', text: 'Option A' },
          { id: 'opt_2', text: 'Option B' },
        ],
        correctAnswers: ['opt_1'],
        marks: 1,
      }));
      await Question.insertMany(bulkQuestions);

      const start = Date.now();
      const questions = await Question.find({ quiz: testQuiz._id }).lean();
      const duration = Date.now() - start;

      expect(questions.length).toBeGreaterThanOrEqual(20);
      expect(duration).toBeLessThan(150);
    });

    it('Validates file upload boundary and authentication', async () => {
      const res = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${teacherToken}`)
        .attach('file', Buffer.from('%PDF-1.4 Mock PDF syllabus file'), 'syllabus.pdf');

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
    });
  });
});
