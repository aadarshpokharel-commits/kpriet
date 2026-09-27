import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import {
  Department,
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
  TeacherAssignmentStatus,
  UserRole,
} from '../src/types/academic.types.js';
import { generateAccessToken } from '../src/security/token.utils.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';

describe('HOD Dashboard & Department Isolation Integration Tests', () => {
  const app = createApp();

  let deptAId: string;
  let deptBId: string;

  let hodA: any;
  let hodAToken: string;

  let hodB: any;
  let hodBToken: string;

  let pendingTeacherDeptA: any;
  let studentDeptA: any;
  let studentDeptB: any;

  let sem1DeptA: any;
  let subjectA1: any;
  let subjectB1: any;

  let assignmentDeptB: any;

  beforeAll(async () => {
    await connectDatabase();

    // 1. Setup Departments A and B
    let deptA = await Department.findOne({ code: 'HOD_IT' });
    if (!deptA) {
      deptA = await Department.create({
        name: 'HOD Test IT Department',
        code: 'HOD_IT',
        programmeType: ProgrammeType.UG,
        status: 'ACTIVE',
      });
    }
    deptAId = String(deptA._id);

    let deptB = await Department.findOne({ code: 'HOD_AD' });
    if (!deptB) {
      deptB = await Department.create({
        name: 'HOD Test AD Department',
        code: 'HOD_AD',
        programmeType: ProgrammeType.UG,
        status: 'ACTIVE',
      });
    }
    deptBId = String(deptB._id);

    // Clean up past test users safely
    const oldUsers = await User.find({ collegeEmail: /@hod-test\.kpriet\.ac\.in$/ }, '_id');
    for (const u of oldUsers) {
      await TeacherAssignment.deleteMany({ teacher: u._id });
      await StudentEnrollment.deleteMany({ student: u._id });
    }
    await User.deleteMany({ collegeEmail: /@hod-test\.kpriet\.ac\.in$/ });

    // 2. Setup HOD for Department A
    hodA = await User.create({
      name: 'Dr. HOD Department A',
      collegeEmail: 'hoda@hod-test.kpriet.ac.in',
      passwordHash: 'dummy',
      role: UserRole.HOD,
      department: deptA._id,
      identifier: 'HOD_A_01',
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    });
    hodAToken = generateAccessToken(hodA);

    // Setup HOD for Department B
    hodB = await User.create({
      name: 'Dr. HOD Department B',
      collegeEmail: 'hodb@hod-test.kpriet.ac.in',
      passwordHash: 'dummy',
      role: UserRole.HOD,
      department: deptB._id,
      identifier: 'HOD_B_01',
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    });
    hodBToken = generateAccessToken(hodB);

    // 3. Setup Pending Teacher in Department A
    pendingTeacherDeptA = await User.create({
      name: 'Prof. Pending Applicant',
      collegeEmail: 'pending.prof@hod-test.kpriet.ac.in',
      passwordHash: 'dummy',
      role: UserRole.TEACHER,
      department: deptA._id,
      identifier: 'FAC_PENDING_01',
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.PENDING,
    });

    // 4. Setup Students
    studentDeptA = await User.create({
      name: 'Student Dept A',
      collegeEmail: 'studenta@hod-test.kpriet.ac.in',
      passwordHash: 'dummy',
      role: UserRole.STUDENT,
      department: deptA._id,
      identifier: '24IT_HODA',
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    });

    studentDeptB = await User.create({
      name: 'Student Dept B',
      collegeEmail: 'studentb@hod-test.kpriet.ac.in',
      passwordHash: 'dummy',
      role: UserRole.STUDENT,
      department: deptB._id,
      identifier: '24AD_HODB',
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    });

    // 5. Setup Semesters & Subjects
    sem1DeptA = await Semester.findOneAndUpdate(
      { department: deptA._id, semesterNumber: 1, academicYear: '2024-2025' },
      { $set: { regulation: 'R2021', status: 'ACTIVE' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    subjectA1 = await Subject.findOneAndUpdate(
      { subjectCode: 'HOD-A101', department: deptA._id, semester: sem1DeptA._id },
      {
        $set: {
          subjectName: 'Department A Subject',
          semesterNumber: 1,
          credits: 3,
          status: 'ACTIVE',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    subjectB1 = await Subject.findOneAndUpdate(
      { subjectCode: 'HOD-B101', department: deptB._id },
      {
        $set: {
          subjectName: 'Department B Subject',
          semester: sem1DeptA._id,
          semesterNumber: 1,
          credits: 4,
          status: 'ACTIVE',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Setup an assignment in Dept B
    assignmentDeptB = await TeacherAssignment.findOneAndUpdate(
      {
        teacher: hodB._id,
        subject: subjectB1._id,
        department: deptB._id,
        semester: sem1DeptA._id,
        academicYear: '2024-2025',
        section: 'A',
      },
      { $set: { status: TeacherAssignmentStatus.ACTIVE } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Setup enrollment for Student A
    await StudentEnrollment.create({
      student: studentDeptA._id,
      department: deptA._id,
      semester: sem1DeptA._id,
      academicYear: '2024-2025',
      enrolledSubjects: [subjectA1._id],
      status: EnrollmentStatus.APPROVED,
    });
  });

  afterAll(async () => {
    if (pendingTeacherDeptA?._id) await TeacherAssignment.deleteMany({ teacher: pendingTeacherDeptA._id });
    if (studentDeptA?._id) await StudentEnrollment.deleteMany({ student: studentDeptA._id });
    if (studentDeptB?._id) await StudentEnrollment.deleteMany({ student: studentDeptB._id });
    if (assignmentDeptB?._id) await TeacherAssignment.findByIdAndDelete(assignmentDeptB._id);
    await User.deleteMany({ collegeEmail: /@hod-test\.kpriet\.ac\.in$/ });
    await Subject.deleteMany({ subjectCode: /^HOD-/ });
    await disconnectDatabase();
  });

  // ─── 1. DEPARTMENT ISOLATION GUARDS ───
  describe('1. Department Isolation Enforcement', () => {
    it('allows HOD A to access Department A live stats', async () => {
      const res = await request(app)
        .get(`/api/v1/departments/${deptAId}/stats`)
        .set('Authorization', `Bearer ${hodAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.facultyCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.studentCount).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.data.semesterDistribution)).toBe(true);
      expect(res.body.data.semesterDistribution.length).toBe(8);
    });

    it('STRICTLY BLOCKS HOD A from accessing Department B stats (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/departments/${deptBId}/stats`)
        .set('Authorization', `Bearer ${hodAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('STRICTLY BLOCKS HOD A from accessing Department B faculty directory (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/departments/${deptBId}/faculty`)
        .set('Authorization', `Bearer ${hodAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('STRICTLY BLOCKS HOD A from accessing Department B students directory (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/departments/${deptBId}/students`)
        .set('Authorization', `Bearer ${hodAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('STRICTLY BLOCKS HOD A from revoking a teacher assignment in Department B', async () => {
      const res = await request(app)
        .delete(`/api/v1/assignments/teachers/${assignmentDeptB._id}`)
        .set('Authorization', `Bearer ${hodAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/outside their department/i);
    });
  });

  // ─── 2. FACULTY REGISTRATION GOVERNANCE ───
  describe('2. Faculty Management & Approval Workflow', () => {
    it('lists pending faculty members under the department', async () => {
      const res = await request(app)
        .get(`/api/v1/departments/${deptAId}/faculty`)
        .set('Authorization', `Bearer ${hodAToken}`);

      expect(res.status).toBe(200);
      const pending = res.body.data.find((f: any) => f.identifier === 'FAC_PENDING_01');
      expect(pending).toBeDefined();
      expect(pending.approvalStatus).toBe(ApprovalStatus.PENDING);
    });

    it('allows HOD to APPROVE a pending teacher registration', async () => {
      const res = await request(app)
        .put(`/api/v1/departments/${deptAId}/faculty/${pendingTeacherDeptA._id}/review`)
        .set('Authorization', `Bearer ${hodAToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(200);
      expect(res.body.data.approvalStatus).toBe(ApprovalStatus.APPROVED);
      expect(res.body.data.accountStatus).toBe(AccountStatus.ACTIVE);
    });

    it('STRICTLY BLOCKS HOD B from approving a teacher in Department A', async () => {
      const res = await request(app)
        .put(`/api/v1/departments/${deptAId}/faculty/${pendingTeacherDeptA._id}/review`)
        .set('Authorization', `Bearer ${hodBToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
    });
  });

  // ─── 3. STUDENT DIRECTORY & SEMESTER PROGRESSION HISTORY ───
  describe('3. Student Directory & Academic History', () => {
    it('retrieves student progression history with current active enrollment and past records', async () => {
      const res = await request(app)
        .get(`/api/v1/departments/${deptAId}/students/${studentDeptA._id}/history`)
        .set('Authorization', `Bearer ${hodAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.student.identifier).toBe('24IT_HODA');
      expect(Array.isArray(res.body.data.enrollments)).toBe(true);
      expect(res.body.data.enrollments.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.enrollments[0].status).toBe(EnrollmentStatus.APPROVED);
    });

    it('STRICTLY BLOCKS HOD A from viewing student history from Department B', async () => {
      const res = await request(app)
        .get(`/api/v1/departments/${deptBId}/students/${studentDeptB._id}/history`)
        .set('Authorization', `Bearer ${hodAToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── 4. SUBJECT LIFECYCLE MANAGEMENT ───
  describe('4. Subject Lifecycle Management', () => {
    it('allows HOD to deactivate a subject (sets status to INACTIVE)', async () => {
      const res = await request(app)
        .patch(`/api/v1/subjects/${subjectA1._id}/status`)
        .set('Authorization', `Bearer ${hodAToken}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('INACTIVE');
    });

    it('allows HOD to reactivate the subject (sets status to ACTIVE)', async () => {
      const res = await request(app)
        .patch(`/api/v1/subjects/${subjectA1._id}/status`)
        .set('Authorization', `Bearer ${hodAToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('STRICTLY BLOCKS HOD A from mutating subject status in Department B', async () => {
      const res = await request(app)
        .patch(`/api/v1/subjects/${subjectB1._id}/status`)
        .set('Authorization', `Bearer ${hodAToken}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(403);
    });
  });
});
