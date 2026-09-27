import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import {
  Assignment,
  AttendanceRecord,
  AttendanceSession,
  Content,
  Department,
  KnowledgeChunk,
  KnowledgeDocument,
  Quiz,
  Semester,
  SemesterResult,
  StudentEnrollment,
  Subject,
  SubjectResult,
  TeacherAssignment,
  User,
} from '../src/models/index.js';
import { generateAccessToken } from '../src/security/token.utils.js';
import {
  AcademicResultStatus,
  AccountStatus,
  ApprovalStatus,
  AssignmentStatus,
  AttendanceStatus,
  ContentStatus,
  ContentType,
  EnrollmentStatus,
  ProgrammeType,
  QuizStatus,
  SemesterStatus,
  TeacherAssignmentStatus,
  UserRole,
} from '../src/types/academic.types.js';

describe('Student Academic Experience Integration Tests (Module 06)', () => {
  const app = createApp();

  let dept: any;
  let sem1: any;
  let sem2: any;
  let mathSub: any;
  let physicsSub: any;
  let unauthorizedSub: any;

  let student: any;
  let studentToken: string;

  let teacher: any;

  beforeAll(async () => {
    await connectDatabase();

    // Setup Department
    dept = await Department.findOne({ code: 'STUD_EXP' });
    if (!dept) {
      dept = await Department.create({
        name: 'Student Experience Test Dept',
        code: 'STUD_EXP',
        programmeType: ProgrammeType.UG,
        status: 'ACTIVE',
      });
    }

    // Setup Semesters 1 and 2
    sem1 = await Semester.findOneAndUpdate(
      { department: dept._id, semesterNumber: 1, academicYear: '2024-2025' },
      { $set: { regulation: 'R2021', status: SemesterStatus.ACTIVE } },
      { upsert: true, new: true }
    );

    sem2 = await Semester.findOneAndUpdate(
      { department: dept._id, semesterNumber: 2, academicYear: '2024-2025' },
      { $set: { regulation: 'R2021', status: SemesterStatus.UPCOMING } },
      { upsert: true, new: true }
    );

    // Setup Subjects
    mathSub = await Subject.findOneAndUpdate(
      { subjectCode: 'EXP_MA101' },
      {
        $set: {
          subjectName: 'Calculus and Linear Algebra',
          department: dept._id,
          semester: sem1._id,
          semesterNumber: 1,
          credits: 4,
          status: 'ACTIVE',
          syllabus: [
            {
              unitNumber: 1,
              title: 'Matrices and Eigenvalues',
              hours: 9,
              topics: ['Eigenvalues', 'Cayley-Hamilton Theorem', 'Diagonalisation'],
            },
          ],
        },
      },
      { upsert: true, new: true }
    );

    physicsSub = await Subject.findOneAndUpdate(
      { subjectCode: 'EXP_PH101' },
      {
        $set: {
          subjectName: 'Engineering Physics',
          department: dept._id,
          semester: sem1._id,
          semesterNumber: 1,
          credits: 3,
          status: 'ACTIVE',
          syllabus: [
            {
              unitNumber: 1,
              title: 'Quantum Physics and Lasers',
              hours: 9,
              topics: ['Photoelectric Effect', 'Wave Particle Duality', 'Heisenberg Uncertainty'],
            },
          ],
        },
      },
      { upsert: true, new: true }
    );

    // Unauthorized subject
    unauthorizedSub = await Subject.findOneAndUpdate(
      { subjectCode: 'EXP_UNAUTH' },
      {
        $set: {
          subjectName: 'Unauthorized Course',
          department: dept._id,
          semester: sem2._id,
          semesterNumber: 2,
          credits: 3,
          status: 'ACTIVE',
        },
      },
      { upsert: true, new: true }
    );

    // Setup Teacher
    teacher = await User.findOneAndUpdate(
      { collegeEmail: 'exp.teacher@kpriet.ac.in' },
      {
        $set: {
          name: 'Prof. Student Experience Teacher',
          identifier: 'T_EXP01',
          role: UserRole.TEACHER,
          department: dept._id,
          accountStatus: AccountStatus.ACTIVE,
          approvalStatus: ApprovalStatus.APPROVED,
          profile: { designation: 'Assistant Professor', specialization: 'Applied Mathematics' },
        },
      },
      { upsert: true, new: true }
    );

    // Teacher assignment
    await TeacherAssignment.findOneAndUpdate(
      { teacher: teacher._id, subject: mathSub._id, semester: sem1._id },
      {
        $set: {
          department: dept._id,
          academicYear: '2024-2025',
          section: 'A',
          status: TeacherAssignmentStatus.ACTIVE,
        },
      },
      { upsert: true, new: true }
    );

    // Setup Student
    student = await User.findOneAndUpdate(
      { collegeEmail: '24exp001@kpriet.ac.in' },
      {
        $set: {
          name: 'Experience Test Student',
          identifier: '24EXP001',
          role: UserRole.STUDENT,
          department: dept._id,
          accountStatus: AccountStatus.ACTIVE,
          approvalStatus: ApprovalStatus.APPROVED,
          profile: { currentSemester: 1 },
        },
      },
      { upsert: true, new: true }
    );

    studentToken = generateAccessToken({
      _id: student._id,
      role: UserRole.STUDENT,
      department: dept._id,
      collegeEmail: student.collegeEmail,
    } as any);

    // Student approved enrollment for Semester 1 with mathSub and physicsSub
    await StudentEnrollment.findOneAndUpdate(
      { student: student._id, semester: sem1._id },
      {
        $set: {
          department: dept._id,
          academicYear: '2024-2025',
          enrolledSubjects: [mathSub._id, physicsSub._id],
          status: EnrollmentStatus.APPROVED,
          requestedAt: new Date(),
          approvedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // Seed Content (Notes)
    await Content.findOneAndUpdate(
      { title: 'Calculus Unit 1 Notes' },
      {
        $set: {
          description: 'Eigenvalues and characteristic equations',
          contentType: ContentType.NOTES,
          department: dept._id,
          semester: sem1._id,
          subject: mathSub._id,
          teacher: teacher._id,
          chapterOrUnit: 1,
          attachments: [{ name: 'unit1.pdf', url: '/files/unit1.pdf' }],
          status: ContentStatus.PUBLISHED,
        },
      },
      { upsert: true, new: true }
    );

    // Seed Quiz
    await Quiz.findOneAndUpdate(
      { title: 'Calculus Diagnostic Quiz 1' },
      {
        $set: {
          department: dept._id,
          semester: sem1._id,
          subject: mathSub._id,
          teacher: teacher._id,
          durationMinutes: 30,
          totalMarks: 20,
          passingMarks: 10,
          status: QuizStatus.PUBLISHED,
        },
      },
      { upsert: true, new: true }
    );

    // Seed Assignment
    await Assignment.findOneAndUpdate(
      { title: 'Calculus Matrix Assignment 1' },
      {
        $set: {
          description: 'Solve Cayley-Hamilton problems',
          department: dept._id,
          semester: sem1._id,
          subject: mathSub._id,
          teacher: teacher._id,
          dueDate: new Date(Date.now() + 86400000 * 5),
          maxMarks: 20,
          passingMarks: 10,
          status: AssignmentStatus.PUBLISHED,
        },
      },
      { upsert: true, new: true }
    );

    // Seed Attendance Session & Record
    const session = await AttendanceSession.findOneAndUpdate(
      { subject: mathSub._id, date: new Date('2024-09-22') },
      {
        $set: {
          department: dept._id,
          semester: sem1._id,
          teacher: teacher._id,
          period: 1,
          academicYear: '2024-2025',
          totalStudents: 1,
          presentCount: 1,
        },
      },
      { upsert: true, new: true }
    );

    await AttendanceRecord.findOneAndUpdate(
      { session: session._id, student: student._id },
      { $set: { status: AttendanceStatus.PRESENT } },
      { upsert: true, new: true }
    );

    // Seed Knowledge Document & Chunk
    const kDoc = await KnowledgeDocument.findOneAndUpdate(
      { title: 'Calculus Syllabus & Topic Guide' },
      {
        $set: {
          documentType: 'SYLLABUS',
          department: dept._id,
          semester: sem1._id,
          subject: mathSub._id,
          status: 'INDEXED',
        },
      },
      { upsert: true, new: true }
    );

    await KnowledgeChunk.findOneAndUpdate(
      { document: kDoc._id, chunkIndex: 0 },
      {
        $set: {
          content: 'Eigenvalues and Eigenvectors form the foundation of matrix diagonalisation and linear transformations.',
          tokenCount: 15,
        },
      },
      { upsert: true, new: true }
    );
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('1. Student Dashboard Overview API', () => {
    it('should return 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/v1/students/dashboard-overview');
      expect(res.status).toBe(401);
    });

    it('should return full real-time overview for authenticated student', async () => {
      const res = await request(app)
        .get('/api/v1/students/dashboard-overview')
        .set('Authorization', `Bearer ${studentToken}`);

      if (res.status !== 200) {
        console.log('Test 1 failed with:', res.status, res.body);
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.student).toBeDefined();
      expect(data.student.name).toBe('Experience Test Student');
      expect(data.student.identifier).toBe('24EXP001');

      // Current Semester
      expect(data.currentSemester).toBeDefined();
      expect(data.currentSemester.semesterNumber).toBe(1);

      // Enrolled Subjects with assigned faculty
      expect(data.enrolledSubjects).toBeInstanceOf(Array);
      expect(data.enrolledSubjects.length).toBe(2);

      const math = data.enrolledSubjects.find((s: any) => s.subjectCode === 'EXP_MA101');
      expect(math).toBeDefined();
      expect(math.faculty).toBeInstanceOf(Array);
      expect(math.faculty[0].name).toBe('Prof. Student Experience Teacher');

      // Notes, Quizzes, Assignments, Attendance
      expect(data.recentNotes).toBeInstanceOf(Array);
      expect(data.upcomingQuizzes).toBeInstanceOf(Array);
      expect(data.pendingAssignments).toBeInstanceOf(Array);
      expect(data.attendanceSummary).toBeDefined();
      expect(data.attendanceSummary.attendancePercentage).toBeGreaterThanOrEqual(0);
      expect(data.academicProgress).toBeDefined();
      expect(data.academicProgress.creditsEnrolled).toBe(7); // 4 + 3
    });
  });

  describe('2. Subject Workspace API (12 Tabs)', () => {
    it('should return complete workspace for enrolled subject with all categories', async () => {
      const res = await request(app)
        .get(`/api/v1/subjects/${mathSub._id}/workspace`)
        .set('Authorization', `Bearer ${studentToken}`);

      if (res.status !== 200) {
        console.log('Test 2 failed with:', res.status, res.body);
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const workspace = res.body.data;
      expect(workspace.subject).toBeDefined();
      expect(workspace.subject.subjectCode).toBe('EXP_MA101');
      expect(workspace.tabs).toBeDefined();

      // Check key tabs
      expect(workspace.tabs.overview).toBeDefined();
      expect(workspace.tabs.overview.syllabusUnits.length).toBeGreaterThan(0);
      expect(workspace.tabs.notes).toBeInstanceOf(Array);
      expect(workspace.tabs.notes.length).toBeGreaterThan(0);
      expect(workspace.tabs.quizzes).toBeInstanceOf(Array);
      expect(workspace.tabs.assignments).toBeInstanceOf(Array);
      expect(workspace.tabs.aiDoubt).toBeDefined();
      expect(workspace.tabs.progress).toBeDefined();
      expect(workspace.tabs.results).toBeDefined();
    });

    it('should forbid student from accessing unauthorized subjects not in their enrollment', async () => {
      const res = await request(app)
        .get(`/api/v1/subjects/${unauthorizedSub._id}/workspace`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('3. Subject-Scoped AI Doubt Solver API', () => {
    it('should successfully answer course-relevant questions using subject knowledge chunks', async () => {
      const res = await request(app)
        .post(`/api/v1/subjects/${mathSub._id}/ai-doubt`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ query: 'What is the significance of eigenvalues in diagonalisation?' });

      if (res.status !== 200) {
        console.log('Test 3 failed with:', res.status, res.body);
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isSubjectBounded).toBe(true);
      expect(res.body.data.answer).toContain('Eigenvalues');
      expect(res.body.data.citations.length).toBeGreaterThan(0);
    }, 30000);

    it('should enforce strict cross-subject isolation and reject unrelated subject questions', async () => {
      // Asking Quantum Physics question in a Calculus course
      const res = await request(app)
        .post(`/api/v1/subjects/${mathSub._id}/ai-doubt`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ query: 'Explain photoelectric effect and quantum wave particle duality' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.answer).toContain('Subject Boundary Notice');
      expect(res.body.data.answer).toContain('Engineering Physics');
    });

    it('should reject invalid query payloads with validation error', async () => {
      const res = await request(app)
        .post(`/api/v1/subjects/${mathSub._id}/ai-doubt`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ query: 'hi' }); // too short

      expect(res.status).toBe(400);
    });
  });

  describe('4. Next Available Semester & Progression API', () => {
    it('should return next semester details and subjects for enrollment progression', async () => {
      const res = await request(app)
        .get('/api/v1/students/semesters/next-available')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.nextAvailable).toBe(true);
      expect(data.currentSemesterNumber).toBe(1);
      expect(data.nextSemester).toBeDefined();
      expect(data.nextSemester.semesterNumber).toBe(2);
      expect(data.canRequest).toBe(true);
    });
  });

  describe('5. Previous Semesters Historical Archive API', () => {
    it('should return empty list if student is in Semester 1 with no past completed terms', async () => {
      const res = await request(app)
        .get('/api/v1/students/semesters/archive')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(0);
    });
  });
});
