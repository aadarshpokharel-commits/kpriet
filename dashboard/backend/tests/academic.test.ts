import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import {
  Department,
  Programme,
  Semester,
  StudentEnrollment,
  Subject,
  TeacherAssignment,
  User,
} from '../src/models/index.js';
import {
  AccountStatus,
  ApprovalStatus,
  EnrollmentStatus,
  ProgrammeType,
  SemesterStatus,
  TeacherAssignmentStatus,
  UserRole,
} from '../src/types/academic.types.js';
import { generateAccessToken } from '../src/security/token.utils.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';

describe('Academic Hierarchy & RBAC Integration Tests', () => {
  const app = createApp();

  // Test Entities
  let itDeptId: string;
  let adDeptId: string;

  let hodUser: any;
  let hodToken: string;

  let teacherUser: any;
  let teacherToken: string;

  let unassignedTeacher: any;
  let unassignedTeacherToken: string;

  let studentUser: any;
  let studentToken: string;

  let sem1: any;
  let sem2: any;
  let sem3: any;

  let subjectA: any;
  let subjectB: any;
  let subjectC: any;
  let subjectD: any;

  beforeAll(async () => {
    await connectDatabase();

    // Clean up test collections safely without interfering with parallel test suites
    const testUsers = await User.find({ collegeEmail: /@kpriet-test\.ac\.in$/ }, '_id');
    for (const u of testUsers) {
      await TeacherAssignment.deleteMany({ teacher: u._id });
      await StudentEnrollment.deleteMany({ student: u._id });
    }
    await User.deleteMany({ collegeEmail: /@kpriet-test\.ac\.in$/ });
    await Programme.deleteMany({ code: /^TEST-/ });
    await Subject.deleteMany({ subjectCode: /^TEST-/ });

    // 1. Setup Departments
    let itDept = await Department.findOne({ code: 'IT' });
    if (!itDept) {
      itDept = await Department.create({
        name: 'Information Technology',
        code: 'IT',
        programmeType: ProgrammeType.UG,
        status: 'ACTIVE',
      });
    }
    itDeptId = String(itDept._id);

    let adDept = await Department.findOne({ code: 'AD' });
    if (!adDept) {
      adDept = await Department.create({
        name: 'Artificial Intelligence & Data Science',
        code: 'AD',
        programmeType: ProgrammeType.UG,
        status: 'ACTIVE',
      });
    }
    adDeptId = String(adDept._id);

    // 2. Setup HOD
    hodUser = await User.create({
      name: 'Dr. IT HOD',
      collegeEmail: 'hod.it@kpriet-test.ac.in',
      passwordHash: 'dummy',
      role: UserRole.HOD,
      department: itDept._id,
      identifier: 'HODIT01',
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    });
    hodToken = generateAccessToken(hodUser);

    // 3. Setup Teachers
    teacherUser = await User.create({
      name: 'Prof. Multi-Subject Faculty',
      collegeEmail: 'faculty.multi@kpriet-test.ac.in',
      passwordHash: 'dummy',
      role: UserRole.TEACHER,
      department: itDept._id,
      identifier: 'FACIT01',
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    });
    teacherToken = generateAccessToken(teacherUser);

    unassignedTeacher = await User.create({
      name: 'Prof. Unassigned Teacher',
      collegeEmail: 'unassigned@kpriet-test.ac.in',
      passwordHash: 'dummy',
      role: UserRole.TEACHER,
      department: itDept._id,
      identifier: 'FACIT02',
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    });
    unassignedTeacherToken = generateAccessToken(unassignedTeacher);

    // 4. Setup Student
    studentUser = await User.create({
      name: 'Student Roll 040',
      collegeEmail: '24it040@kpriet-test.ac.in',
      passwordHash: 'dummy',
      role: UserRole.STUDENT,
      department: itDept._id,
      identifier: '24IT040',
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    });
    studentToken = generateAccessToken(studentUser);

    // 5. Setup Semesters (Sem 1, Sem 2, Sem 3)
    sem1 = await Semester.findOneAndUpdate(
      { department: itDept._id, semesterNumber: 1, academicYear: '2024-2025' },
      { regulation: 'R2021', status: SemesterStatus.ACTIVE },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    sem2 = await Semester.findOneAndUpdate(
      { department: itDept._id, semesterNumber: 2, academicYear: '2024-2025' },
      { regulation: 'R2021', status: SemesterStatus.ACTIVE },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    sem3 = await Semester.findOneAndUpdate(
      { department: itDept._id, semesterNumber: 3, academicYear: '2024-2025' },
      { regulation: 'R2021', status: SemesterStatus.ACTIVE },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 6. Setup Subjects
    subjectA = await Subject.create({
      subjectName: 'Test Subject A',
      subjectCode: 'TEST-A101',
      department: itDept._id,
      semester: sem1._id,
      semesterNumber: 1,
      credits: 4,
      syllabus: [
        { unitNumber: 1, title: 'Introduction', topics: ['Basics', 'Fundamentals'], hours: 8 },
        { unitNumber: 2, title: 'Advanced Concepts', topics: ['Deep Dive'], hours: 10 },
      ],
      status: 'ACTIVE',
    });

    subjectB = await Subject.create({
      subjectName: 'Test Subject B',
      subjectCode: 'TEST-B201',
      department: itDept._id,
      semester: sem2._id,
      semesterNumber: 2,
      credits: 3,
      syllabus: [{ unitNumber: 1, title: 'Unit 1', topics: ['Topic 1'], hours: 6 }],
      status: 'ACTIVE',
    });

    subjectC = await Subject.create({
      subjectName: 'Test Subject C',
      subjectCode: 'TEST-C301',
      department: itDept._id,
      semester: sem3._id,
      semesterNumber: 3,
      credits: 3,
      syllabus: [{ unitNumber: 1, title: 'Unit 1', topics: ['Topic 1'], hours: 6 }],
      status: 'ACTIVE',
    });

    subjectD = await Subject.create({
      subjectName: 'Test Subject D',
      subjectCode: 'TEST-D102',
      department: itDept._id,
      semester: sem1._id,
      semesterNumber: 1,
      credits: 3,
      syllabus: [{ unitNumber: 1, title: 'Unit 1', topics: ['Topic 1'], hours: 6 }],
      status: 'ACTIVE',
    });

    // 7. Enroll student in Semester 1 with subjectA and subjectD
    await StudentEnrollment.create({
      student: studentUser._id,
      department: itDept._id,
      semester: sem1._id,
      academicYear: '2024-2025',
      enrolledSubjects: [subjectA._id, subjectD._id],
      status: EnrollmentStatus.APPROVED,
    });
  });

  afterAll(async () => {
    if (teacherUser?._id) {
      await TeacherAssignment.deleteMany({ teacher: teacherUser._id });
    }
    if (unassignedTeacher?._id) {
      await TeacherAssignment.deleteMany({ teacher: unassignedTeacher._id });
    }
    if (studentUser?._id) {
      await StudentEnrollment.deleteMany({ student: studentUser._id });
    }
    await User.deleteMany({ collegeEmail: /@kpriet-test\.ac\.in$/ });
    await Programme.deleteMany({ code: /^TEST-/ });
    await Subject.deleteMany({ subjectCode: /^TEST-/ });
    await disconnectDatabase();
  });

  describe('1. Department Live Metrics', () => {
    it('returns live database counts for HOD department overview', async () => {
      const res = await request(app)
        .get(`/api/v1/departments/${itDeptId}/stats`)
        .set('Authorization', `Bearer ${hodToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.facultyCount).toBeGreaterThanOrEqual(2);
      expect(res.body.data.studentCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.activeSubjectCount).toBeGreaterThanOrEqual(4);
      expect(res.body.data.activeSemesterCount).toBeGreaterThanOrEqual(3);
    });

    it('denies student access to department admin stats', async () => {
      const res = await request(app)
        .get(`/api/v1/departments/${itDeptId}/stats`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('2. Programme Hierarchy', () => {
    it('allows HOD to create a programme under their department', async () => {
      const res = await request(app)
        .post('/api/v1/programmes')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({
          name: 'B.Tech. Information Technology',
          code: 'TEST-BTECH-IT',
          degree: 'B.Tech',
          departmentId: itDeptId,
          programmeType: ProgrammeType.UG,
          durationYears: 4,
          totalSemesters: 8,
          description: 'Premier undergraduate degree in IT',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('TEST-BTECH-IT');
    });

    it('lists programmes filtered by department', async () => {
      const res = await request(app)
        .get(`/api/v1/programmes?departmentId=${itDeptId}`)
        .set('Authorization', `Bearer ${hodToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Student Future Semester Access Restriction', () => {
    it('allows student to access their current semester (Semester 1)', async () => {
      const res = await request(app)
        .get(`/api/v1/semesters/${sem1._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.semesterNumber).toBe(1);
    });

    it('STRICTLY BLOCKS student from accessing future semester (Semester 2) with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/semesters/${sem2._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/future semester/i);
    });

    it('STRICTLY BLOCKS student from accessing future semester (Semester 3) with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/semesters/${sem3._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/future semester/i);
    });

    it('automatically scopes student semester list to current/past semesters only', async () => {
      const res = await request(app)
        .get('/api/v1/semesters')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      // Student is in Semester 1, so no returned semester should exceed 1
      res.body.data.forEach((s: any) => {
        expect(s.semesterNumber).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('4. Subject & Chapter Operations', () => {
    it('allows HOD to add a chapter to a subject syllabus', async () => {
      const res = await request(app)
        .post(`/api/v1/subjects/${subjectA._id}/chapters`)
        .set('Authorization', `Bearer ${hodToken}`)
        .send({
          unitNumber: 3,
          title: 'Unit 3: Modern System Architecture',
          description: 'Distributed architectures and patterns',
          topics: ['Microservices', 'Event-Driven Systems'],
          hours: 9,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Unit 3: Modern System Architecture');
      expect(res.body.data._id).toBeDefined();
    });

    it('enforces student subject isolation: student cannot access unenrolled subject B', async () => {
      const res = await request(app)
        .get(`/api/v1/subjects/${subjectB._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not enrolled/i);
    });

    it('allows student to access enrolled subject A', async () => {
      const res = await request(app)
        .get(`/api/v1/subjects/${subjectA._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subjectCode).toBe('TEST-A101');
    });
  });

  describe('5. Teacher Assignment Across Multiple Subjects & Multiple Semesters', () => {
    it('assigns teacher to Subject A (Semester 1)', async () => {
      const res = await request(app)
        .post('/api/v1/assignments/teachers')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({
          teacherId: String(teacherUser._id),
          subjectId: String(subjectA._id),
          departmentId: itDeptId,
          semesterId: String(sem1._id),
          academicYear: '2024-2025',
          section: 'A',
        });

      expect(res.status).toBe(201);
    });

    it('assigns teacher to Subject B (Semester 2)', async () => {
      const res = await request(app)
        .post('/api/v1/assignments/teachers')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({
          teacherId: String(teacherUser._id),
          subjectId: String(subjectB._id),
          departmentId: itDeptId,
          semesterId: String(sem2._id),
          academicYear: '2024-2025',
          section: 'A',
        });

      expect(res.status).toBe(201);
    });

    it('assigns teacher to Subject C (Semester 3)', async () => {
      const res = await request(app)
        .post('/api/v1/assignments/teachers')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({
          teacherId: String(teacherUser._id),
          subjectId: String(subjectC._id),
          departmentId: itDeptId,
          semesterId: String(sem3._id),
          academicYear: '2024-2025',
          section: 'A',
        });

      expect(res.status).toBe(201);
    });

    it('assigns teacher to Subject D (Semester 1)', async () => {
      const res = await request(app)
        .post('/api/v1/assignments/teachers')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({
          teacherId: String(teacherUser._id),
          subjectId: String(subjectD._id),
          departmentId: itDeptId,
          semesterId: String(sem1._id),
          academicYear: '2024-2025',
          section: 'B',
        });

      expect(res.status).toBe(201);
    });

    it('correctly retrieves all 4 multi-semester assignments for the teacher', async () => {
      const res = await request(app)
        .get(`/api/v1/assignments/teachers?teacherId=${teacherUser._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(4);

      const assignedSubjectCodes = res.body.data.map((a: any) => a.subject.subjectCode);
      expect(assignedSubjectCodes).toContain('TEST-A101');
      expect(assignedSubjectCodes).toContain('TEST-B201');
      expect(assignedSubjectCodes).toContain('TEST-C301');
      expect(assignedSubjectCodes).toContain('TEST-D102');
    });

    it('allows assigned teacher to access Subject B (Semester 2)', async () => {
      const res = await request(app)
        .get(`/api/v1/subjects/${subjectB._id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subjectCode).toBe('TEST-B201');
    });

    it('enforces teacher subject isolation: unassigned teacher cannot access Subject B', async () => {
      const res = await request(app)
        .get(`/api/v1/subjects/${subjectB._id}`)
        .set('Authorization', `Bearer ${unassignedTeacherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not assigned/i);
    });

    it('returns only assigned subjects when teacher lists subjects', async () => {
      const res = await request(app)
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(4);
      const codes = res.body.data.map((s: any) => s.subjectCode);
      expect(codes).toContain('TEST-A101');
      expect(codes).toContain('TEST-B201');
      expect(codes).toContain('TEST-C301');
      expect(codes).toContain('TEST-D102');
    });

    it('returns empty array when unassigned teacher lists subjects', async () => {
      const res = await request(app)
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${unassignedTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('returns only enrolled subjects when student lists subjects', async () => {
      const res = await request(app)
        .get('/api/v1/subjects')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      const codes = res.body.data.map((s: any) => s.subjectCode);
      expect(codes).toContain('TEST-A101');
      expect(codes).toContain('TEST-D102');
      expect(codes).not.toContain('TEST-B201');
      expect(codes).not.toContain('TEST-C301');
    });
  });

  describe('6. Student Enrollment Management & HOD Review', () => {
    let newEnrollmentId: string;

    it('allows student to submit an enrollment request for next semester', async () => {
      const res = await request(app)
        .post('/api/v1/enrollments/request')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          departmentId: itDeptId,
          semesterId: String(sem2._id),
          academicYear: '2024-2025',
          enrolledSubjectIds: [String(subjectB._id)],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(EnrollmentStatus.PENDING);
      newEnrollmentId = String(res.body.data._id);
    });

    it('allows HOD to view pending enrollment requests in their department', async () => {
      const res = await request(app)
        .get(`/api/v1/enrollments?departmentId=${itDeptId}&status=${EnrollmentStatus.PENDING}`)
        .set('Authorization', `Bearer ${hodToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('allows HOD to approve student enrollment request', async () => {
      const res = await request(app)
        .put(`/api/v1/enrollments/${newEnrollmentId}/review`)
        .set('Authorization', `Bearer ${hodToken}`)
        .send({
          status: EnrollmentStatus.APPROVED,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(EnrollmentStatus.APPROVED);
    });
  });
});
