import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { ensureAllIndexes } from '../src/database/ensure-indexes.js';
import {
  Department,
  Semester,
  StudentEnrollment,
  Subject,
  TeacherAssignment,
  User,
} from '../src/models/index.js';
import {
  ApprovalStatus,
  EnrollmentStatus,
  ProgrammeType,
  TeacherAssignmentStatus,
  UserRole,
} from '../src/types/academic.types.js';

const app = createApp();

describe('Secure Authentication System (Backend Integration)', () => {
  let testDept: any;
  let testSemester: any;
  let mathSubject: any;
  let physicsSubject: any;
  let studentEmail: string;
  let studentRoll: string;
  let teacherEmail: string;
  let teacherId: string;
  const sharedPassword = 'SecurePassword123!';

  let studentAccessToken: string;
  let studentRefreshToken: string;
  let teacherAccessToken: string;

  beforeAll(async () => {
    await connectDatabase();
    await Department.deleteMany({ code: /^AUTH_/ });
    await ensureAllIndexes();

    // 1. Create test department
    testDept = await Department.create({
      name: 'Auth Test Department',
      code: 'AUTH_' + Math.floor(Math.random() * 89999 + 10000),
      programmeType: ProgrammeType.UG,
    });

    // 2. Create test semester
    testSemester = await Semester.create({
      semesterNumber: 1,
      academicYear: '2024-2025',
      regulation: 'R2021',
      department: testDept._id,
    });

    // 3. Create two subjects
    mathSubject = await Subject.create({
      subjectName: 'Auth Test Mathematics',
      subjectCode: 'AMATH_' + Math.floor(Math.random() * 89999 + 10000),
      department: testDept._id,
      semester: testSemester._id,
      semesterNumber: 1,
      credits: 4,
    });

    physicsSubject = await Subject.create({
      subjectName: 'Auth Test Physics',
      subjectCode: 'APHY_' + Math.floor(Math.random() * 89999 + 10000),
      department: testDept._id,
      semester: testSemester._id,
      semesterNumber: 1,
      credits: 3,
    });

    const rnd = Math.floor(Math.random() * 899 + 100);
    studentRoll = `24IT${rnd}`;
    studentEmail = `24it${rnd}@kpriet.ac.in`;

    teacherId = `EMP_AUTH_${rnd}`;
    teacherEmail = `faculty.auth.${rnd}@kpriet.ac.in`;
  });

  afterAll(async () => {
    await Department.deleteMany({ code: /^AUTH_/ });
    await User.deleteMany({ collegeEmail: studentEmail });
    await User.deleteMany({ collegeEmail: teacherEmail });
    if (mathSubject?._id) await Subject.findByIdAndDelete(mathSubject._id);
    if (physicsSubject?._id) await Subject.findByIdAndDelete(physicsSubject._id);
    if (testSemester?._id) await Semester.findByIdAndDelete(testSemester._id);
    await disconnectDatabase();
  });

  // -------------------------------------------------------------------------
  // 1. REGISTRATION TESTS
  // -------------------------------------------------------------------------
  describe('Student & Teacher Registration', () => {
    it('successfully registers a valid student with KPRIET roll email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/student')
        .send({
          name: 'Priyanka R',
          collegeEmail: studentEmail,
          password: sharedPassword,
          departmentId: String(testDept._id),
          studentIdentifier: studentRoll,
          currentSemesterNumber: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(UserRole.STUDENT);
      expect(res.body.data.user.collegeEmail).toBe(studentEmail.toLowerCase());
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.accessToken).toBeDefined();

      studentAccessToken = res.body.data.accessToken;

      // Verify cookies set
      const cookies = (res.headers['set-cookie'] || []) as unknown as string[];
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies) && cookies.some((c: string) => c.includes('refreshToken='))).toBe(true);
    });

    it('rejects registration with non-KPRIET external email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/student')
        .send({
          name: 'Hacker User',
          collegeEmail: 'hacker@gmail.com',
          password: sharedPassword,
          departmentId: String(testDept._id),
          studentIdentifier: '24IT999',
          currentSemesterNumber: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects duplicate student email registration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/student')
        .send({
          name: 'Duplicate Student',
          collegeEmail: studentEmail,
          password: sharedPassword,
          departmentId: String(testDept._id),
          studentIdentifier: studentRoll,
          currentSemesterNumber: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects public registration attempts attempting role injection (e.g. choosing ADMIN)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/student')
        .send({
          name: 'Sneaky User',
          collegeEmail: `24it888@kpriet.ac.in`,
          password: sharedPassword,
          departmentId: String(testDept._id),
          studentIdentifier: '24IT888',
          currentSemesterNumber: 1,
          role: 'ADMIN',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('registers a teacher with PENDING approval status', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/teacher')
        .send({
          name: 'Dr. Test Faculty',
          collegeEmail: teacherEmail,
          password: sharedPassword,
          departmentId: String(testDept._id),
          employeeIdentifier: teacherId,
          designation: 'Associate Professor',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approvalStatus).toBe(ApprovalStatus.PENDING);
      expect(res.body.message).toContain('pending HOD approval');
    });
  });

  // -------------------------------------------------------------------------
  // 2. LOGIN & AUTHENTICATION TESTS
  // -------------------------------------------------------------------------
  describe('Login & Session Management', () => {
    it('successfully signs in with valid student credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          collegeEmail: studentEmail,
          password: sharedPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      studentAccessToken = res.body.data.accessToken;

      const setCookie = (res.headers['set-cookie'] || []) as unknown as string[];
      const refreshCookie = Array.isArray(setCookie) ? setCookie.find((c: string) => c.startsWith('refreshToken=')) : undefined;
      if (refreshCookie) {
        studentRefreshToken = refreshCookie.split(';')[0]?.replace('refreshToken=', '') || '';
      }
    });

    it('returns generic error on invalid password without revealing user existence', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          collegeEmail: studentEmail,
          password: 'IncorrectPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid college email or password.');
    });

    it('returns generic error for non-existent account without enumeration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          collegeEmail: 'nonexistent.user@kpriet.ac.in',
          password: sharedPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid college email or password.');
    });

    it('returns 401 unauthenticated when accessing protected endpoint without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns current user profile when valid token provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.collegeEmail).toBe(studentEmail.toLowerCase());
      expect(res.body.data.user.role).toBe(UserRole.STUDENT);
    });

    it('rejects expired or tampered token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer invalid.tampered.token`);

      expect(res.status).toBe(401);
    });

    it('logs out and clears cookies', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${studentAccessToken}`)
        .send({ refreshToken: studentRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Signed out');
    });
  });

  // -------------------------------------------------------------------------
  // 3. ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSION TESTS
  // -------------------------------------------------------------------------
  describe('RBAC & Subject Authorization Guards', () => {
    let teacherDoc: any;

    beforeAll(async () => {
      // Approve teacher account and assign to Mathematics subject
      teacherDoc = await User.findOne({ collegeEmail: teacherEmail });
      teacherDoc.approvalStatus = ApprovalStatus.APPROVED;
      await teacherDoc.save();

      // Assign teacher to Math subject
      await TeacherAssignment.create({
        teacher: teacherDoc._id,
        subject: mathSubject._id,
        department: testDept._id,
        semester: testSemester._id,
        academicYear: '2024-2025',
        section: 'A',
        status: TeacherAssignmentStatus.ACTIVE,
      });

      // Login as teacher
      const tLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ collegeEmail: teacherEmail, password: sharedPassword });

      teacherAccessToken = tLogin.body.data.accessToken;
    });

    it('allows student to access student test route', async () => {
      const res = await request(app)
        .get('/api/v1/auth/test/student')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Student access granted');
    });

    it('forbids student from accessing teacher route (403)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/test/teacher')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('forbids teacher from accessing HOD route (403)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/test/hod')
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows teacher to access their ASSIGNED subject', async () => {
      const res = await request(app)
        .get(`/api/v1/auth/test/subject/${mathSubject._id}`)
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Subject access granted');
    });

    it('strictly forbids teacher from accessing ANOTHER subject they are not assigned to (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/auth/test/subject/${physicsSubject._id}`)
        .set('Authorization', `Bearer ${teacherAccessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.message).toContain('not assigned to teach this subject');
    });
  });
});
