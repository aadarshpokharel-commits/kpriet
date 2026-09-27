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
  Quiz,
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
  ContentStatus,
  ContentType,
  EnrollmentStatus,
  ProgrammeType,
  SubmissionStatus,
  TeacherAssignmentStatus,
  UserRole,
} from '../src/types/academic.types.js';

describe('Teacher Dashboard & Workspace Integration Tests (Module 07)', () => {
  const app = createApp();

  let dept: any;
  let sem1: any;
  let sem2: any;
  let mathSub: any;
  let pythonSub: any;
  let unauthorizedSub: any;

  let teacher: any;
  let teacherToken: string;

  let otherTeacher: any;
  let otherTeacherToken: string;

  let student: any;
  let studentToken: string;

  let studentSubmission: any;
  let assignmentDoc: any;

  beforeAll(async () => {
    await connectDatabase();

    // 1. Setup Department
    dept = await Department.findOne({ code: 'TEACH_DASH' });
    if (!dept) {
      dept = await Department.create({
        name: 'Teacher Dashboard Engineering',
        code: 'TEACH_DASH',
        programmeType: ProgrammeType.UG,
        description: 'Testing Teacher Dashboard and Workspace',
        status: 'ACTIVE',
      });
    }

    // 2. Setup Semesters
    sem1 = await Semester.findOne({ department: dept._id, semesterNumber: 1 });
    if (!sem1) {
      sem1 = await Semester.create({
        semesterNumber: 1,
        academicYear: '2024-2025',
        regulation: 'R2021',
        department: dept._id,
        status: 'ACTIVE',
      });
    }

    sem2 = await Semester.findOne({ department: dept._id, semesterNumber: 2 });
    if (!sem2) {
      sem2 = await Semester.create({
        semesterNumber: 2,
        academicYear: '2024-2025',
        regulation: 'R2021',
        department: dept._id,
        status: 'ACTIVE',
      });
    }

    // 3. Setup Subjects
    mathSub = await Subject.findOne({ subjectCode: 'TD_MATH101' });
    if (!mathSub) {
      mathSub = await Subject.create({
        subjectName: 'Discrete Mathematics',
        subjectCode: 'TD_MATH101',
        department: dept._id,
        semester: sem1._id,
        semesterNumber: 1,
        credits: 4,
        syllabus: [
          { unitNumber: 1, title: 'Set Theory & Logic', hours: 9, topics: ['Sets', 'Relations'] },
          { unitNumber: 2, title: 'Combinatorics', hours: 9, topics: ['Permutations', 'Combinations'] },
        ],
        status: 'ACTIVE',
      });
    }

    pythonSub = await Subject.findOne({ subjectCode: 'TD_PY102' });
    if (!pythonSub) {
      pythonSub = await Subject.create({
        subjectName: 'Python Programming Lab',
        subjectCode: 'TD_PY102',
        department: dept._id,
        semester: sem1._id,
        semesterNumber: 1,
        credits: 3,
        syllabus: [
          { unitNumber: 1, title: 'Control Flow', hours: 9, topics: ['Loops', 'Conditionals'] },
        ],
        status: 'ACTIVE',
      });
    }

    unauthorizedSub = await Subject.findOne({ subjectCode: 'TD_UNAUTH999' });
    if (!unauthorizedSub) {
      unauthorizedSub = await Subject.create({
        subjectName: 'Advanced Quantum Robotics',
        subjectCode: 'TD_UNAUTH999',
        department: dept._id,
        semester: sem2._id,
        semesterNumber: 2,
        credits: 4,
        syllabus: [{ unitNumber: 1, title: 'Quantum Gates', hours: 9, topics: ['Qubits'] }],
        status: 'ACTIVE',
      });
    }

    // 4. Setup Teacher
    teacher = await User.findOne({ collegeEmail: 'prof.smith@kpriet.ac.in' });
    if (!teacher) {
      teacher = await User.create({
        name: 'Prof. John Smith',
        collegeEmail: 'prof.smith@kpriet.ac.in',
        passwordHash: '$2b$10$abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        role: UserRole.TEACHER,
        department: dept._id,
        identifier: 'FAC_SMITH_01',
        accountStatus: AccountStatus.ACTIVE,
        approvalStatus: ApprovalStatus.APPROVED,
        profile: { designation: 'Associate Professor' },
      });
    }
    teacherToken = generateAccessToken(teacher);

    // Setup Other Teacher
    otherTeacher = await User.findOne({ collegeEmail: 'prof.other@kpriet.ac.in' });
    if (!otherTeacher) {
      otherTeacher = await User.create({
        name: 'Prof. Other Faculty',
        collegeEmail: 'prof.other@kpriet.ac.in',
        passwordHash: '$2b$10$abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        role: UserRole.TEACHER,
        department: dept._id,
        identifier: 'FAC_OTHER_02',
        accountStatus: AccountStatus.ACTIVE,
        approvalStatus: ApprovalStatus.APPROVED,
      });
    }
    otherTeacherToken = generateAccessToken(otherTeacher);

    // 5. Setup Student
    student = await User.findOne({ collegeEmail: '24td001@kpriet.ac.in' });
    if (!student) {
      student = await User.create({
        name: 'Student TD User',
        collegeEmail: '24td001@kpriet.ac.in',
        passwordHash: '$2b$10$abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        role: UserRole.STUDENT,
        department: dept._id,
        identifier: '24TD001',
        accountStatus: AccountStatus.ACTIVE,
        approvalStatus: ApprovalStatus.APPROVED,
        profile: { currentSemester: 1 },
      });
    }
    studentToken = generateAccessToken(student);

    // 6. Setup Teacher Assignments (Teacher teaches mathSub and pythonSub, but NOT unauthorizedSub)
    await TeacherAssignment.deleteMany({ teacher: teacher._id });
    await TeacherAssignment.create([
      {
        teacher: teacher._id,
        subject: mathSub._id,
        department: dept._id,
        semester: sem1._id,
        academicYear: '2024-2025',
        section: 'A',
        isCoordinator: true,
        status: TeacherAssignmentStatus.ACTIVE,
      },
      {
        teacher: teacher._id,
        subject: pythonSub._id,
        department: dept._id,
        semester: sem1._id,
        academicYear: '2024-2025',
        section: 'ALL',
        isCoordinator: false,
        status: TeacherAssignmentStatus.ACTIVE,
      },
    ]);

    // 7. Setup Student Enrollment in mathSub and pythonSub
    await StudentEnrollment.deleteMany({ student: student._id });
    await StudentEnrollment.create({
      student: student._id,
      department: dept._id,
      semester: sem1._id,
      academicYear: '2024-2025',
      enrolledSubjects: [mathSub._id, pythonSub._id],
      status: EnrollmentStatus.APPROVED,
    });

    // 8. Create an Assignment and Student Submission for Grading tests
    await Assignment.deleteMany({ subject: mathSub._id });
    assignmentDoc = await Assignment.create({
      title: 'Problem Set 1: Logic Gates & Truth Tables',
      description: 'Solve problems on propositional logic and tautology.',
      department: dept._id,
      semester: sem1._id,
      subject: mathSub._id,
      teacher: teacher._id,
      dueDate: new Date(Date.now() + 86400000 * 7),
      maxMarks: 50,
      passingMarks: 20,
      status: AssignmentStatus.PUBLISHED,
    });

    await AssignmentSubmission.deleteMany({ assignment: assignmentDoc._id });
    studentSubmission = await AssignmentSubmission.create({
      assignment: assignmentDoc._id,
      student: student._id,
      submissionFiles: [
        { name: 'logic_solution.pdf', url: 'https://eduverse.kpriet.ac.in/submissions/logic.pdf' },
      ],
      notes: 'Completed all problems including bonus questions.',
      submittedAt: new Date(),
      status: SubmissionStatus.SUBMITTED,
      isGraded: false,
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  // ─── 1. TEACHER DASHBOARD OVERVIEW ───
  describe('1. GET /api/v1/teachers/dashboard-overview', () => {
    it('should return real-time metrics for authenticated teacher', async () => {
      const res = await request(app)
        .get('/api/v1/teachers/dashboard-overview')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teacher.name).toBe('Prof. John Smith');
      expect(res.body.data.stats.totalAssignedSubjects).toBe(2);
      expect(res.body.data.stats.totalEnrolledStudents).toBeGreaterThanOrEqual(1);
      expect(res.body.data.stats.pendingSubmissionsCount).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.data.subjectWiseProgress)).toBe(true);
      expect(res.body.data.subjectWiseProgress.length).toBe(2);
    });

    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/teachers/dashboard-overview');
      expect(res.status).toBe(401);
    });

    it('should reject student tokens with 403', async () => {
      const res = await request(app)
        .get('/api/v1/teachers/dashboard-overview')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ─── 2. ASSIGNED SUBJECTS (SUBJECT SELECTOR) ───
  describe('2. GET /api/v1/teachers/assigned-subjects', () => {
    it('should return only subjects assigned to the teacher', async () => {
      const res = await request(app)
        .get('/api/v1/teachers/assigned-subjects')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { departments, semesters, subjects } = res.body.data;
      expect(departments.some((d: any) => d.code === 'TEACH_DASH')).toBe(true);
      expect(semesters.some((s: any) => s.semesterNumber === 1)).toBe(true);
      expect(subjects.length).toBe(2);
      expect(subjects.some((s: any) => s.subjectCode === 'TD_MATH101')).toBe(true);
      expect(subjects.some((s: any) => s.subjectCode === 'TD_PY102')).toBe(true);
      // Must NOT include unauthorizedSub
      expect(subjects.some((s: any) => s.subjectCode === 'TD_UNAUTH999')).toBe(false);
    });
  });

  // ─── 3. TEACHER SUBJECT WORKSPACE ───
  describe('3. GET /api/v1/teachers/subjects/:id/workspace', () => {
    it('should return teacher workspace data for an assigned subject', async () => {
      const res = await request(app)
        .get(`/api/v1/teachers/subjects/${mathSub._id}/workspace`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subject.subjectCode).toBe('TD_MATH101');
      expect(res.body.data.assignmentMeta.section).toBe('A');
      expect(res.body.data.tabs).toHaveProperty('notes');
      expect(res.body.data.tabs).toHaveProperty('materials');
      expect(res.body.data.tabs).toHaveProperty('quizzes');
      expect(res.body.data.tabs).toHaveProperty('assignments');
      expect(res.body.data.tabs).toHaveProperty('submissions');
      expect(res.body.data.tabs.submissions.length).toBeGreaterThanOrEqual(1);
    });

    it('should deny workspace access if teacher is not assigned to the subject', async () => {
      const res = await request(app)
        .get(`/api/v1/teachers/subjects/${unauthorizedSub._id}/workspace`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── 4. CONTENT CRUD OPERATIONS ───
  describe('4. Content Management (Notes, Announcements, etc.)', () => {
    let createdContentId: string;

    it('should allow teacher to create a Lecture Note for assigned subject', async () => {
      const res = await request(app)
        .post(`/api/v1/teachers/subjects/${mathSub._id}/content`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Unit 1: Foundations of Logic Lecture Handout',
          description: 'Comprehensive slides and notes for Chapter 1.',
          contentType: ContentType.NOTES,
          chapterOrUnit: 1,
          attachments: [
            {
              name: 'unit1_logic.pdf',
              url: 'https://eduverse.kpriet.ac.in/content/unit1_logic.pdf',
              sizeBytes: 1048576,
            },
          ],
          status: ContentStatus.PUBLISHED,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Unit 1: Foundations of Logic Lecture Handout');
      createdContentId = res.body.data._id;
    });

    it('should allow teacher to update and unpublish content', async () => {
      const res = await request(app)
        .put(`/api/v1/teachers/subjects/${mathSub._id}/content/${createdContentId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Unit 1: Foundations of Logic Handout (Revised)',
          status: ContentStatus.DRAFT,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Unit 1: Foundations of Logic Handout (Revised)');
      expect(res.body.data.status).toBe(ContentStatus.DRAFT);
    });

    it('should allow teacher to delete content', async () => {
      const res = await request(app)
        .delete(`/api/v1/teachers/subjects/${mathSub._id}/content/${createdContentId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await Content.findById(createdContentId);
      expect(check).toBeNull();
    });

    it('should reject content creation for unassigned subjects with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/teachers/subjects/${unauthorizedSub._id}/content`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Unauthorized Note',
          contentType: ContentType.NOTES,
        });

      expect(res.status).toBe(403);
    });
  });

  // ─── 5. ASSIGNMENTS & GRADING WORKFLOW ───
  describe('5. Assignment Creation & Grading', () => {
    it('should allow teacher to create a new assignment', async () => {
      const res = await request(app)
        .post(`/api/v1/teachers/subjects/${mathSub._id}/assignments`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Assignment 2: Graph Theory & Trees',
          description: 'Construct Euler paths and Hamiltonian cycles.',
          dueDate: new Date(Date.now() + 86400000 * 14).toISOString(),
          maxMarks: 100,
          passingMarks: 50,
          status: AssignmentStatus.PUBLISHED,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Assignment 2: Graph Theory & Trees');
      expect(res.body.data.maxMarks).toBe(100);
    });

    it('should allow teacher to grade student submission with marks & feedback', async () => {
      const res = await request(app)
        .post('/api/v1/teachers/assignments/grade')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          submissionId: studentSubmission._id.toString(),
          marksObtained: 46,
          feedback: 'Excellent proofs on logic equivalence! Minor notation omission on Question 3.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.marksObtained).toBe(46);
      expect(res.body.data.feedback).toContain('Excellent proofs');

      // Verify submission is updated to isGraded: true
      const updatedSub = await AssignmentSubmission.findById(studentSubmission._id);
      expect(updatedSub?.isGraded).toBe(true);
    });

    it('should reject marks exceeding maximum marks with 400', async () => {
      const res = await request(app)
        .post('/api/v1/teachers/assignments/grade')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          submissionId: studentSubmission._id.toString(),
          marksObtained: 150, // max is 50
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Marks obtained cannot exceed maximum marks');
    });
  });

  // ─── 6. ATTENDANCE RECORDING ───
  describe('6. POST /api/v1/teachers/subjects/:id/attendance', () => {
    it('should record an attendance session and student attendance records', async () => {
      const res = await request(app)
        .post(`/api/v1/teachers/subjects/${mathSub._id}/attendance`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          date: new Date().toISOString(),
          period: 2,
          timeSlot: '10:00 - 11:00 AM',
          topicCovered: 'Predicate Calculus and Quantifiers',
          section: 'A',
          records: [
            {
              studentId: student._id.toString(),
              status: AttendanceStatus.PRESENT,
              remarks: 'Active participant in derivations',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.presentCount).toBe(1);
      expect(res.body.data.recordsCount).toBe(1);

      // Verify stored AttendanceRecord in DB
      const record = await AttendanceRecord.findOne({ student: student._id });
      expect(record).not.toBeNull();
      expect(record?.status).toBe(AttendanceStatus.PRESENT);
    });
  });

  // ─── 7. STUDENT PROGRESS ISOLATION ───
  describe('7. GET /api/v1/teachers/subjects/:id/students-progress', () => {
    it('should return individual enrolled students progress for authorized course', async () => {
      const res = await request(app)
        .get(`/api/v1/teachers/subjects/${mathSub._id}/students-progress`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const item = res.body.data.find((s: any) => s.studentId === student._id.toString());
      expect(item).toBeDefined();
      expect(item.name).toBe('Student TD User');
      expect(item.rollNumber).toBe('24TD001');
      expect(item.attendancePercentage).toBeGreaterThanOrEqual(0);
      expect(item.assignmentAverage).toBeGreaterThanOrEqual(0);
    });

    it('should strictly deny teacher from viewing student progress for an unauthorized course', async () => {
      const res = await request(app)
        .get(`/api/v1/teachers/subjects/${unauthorizedSub._id}/students-progress`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });
  });
});
