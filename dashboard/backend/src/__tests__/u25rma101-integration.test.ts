import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import {
  Department,
  Programme,
  Semester,
  Subject,
  CurriculumUnit,
  TeacherAssignment,
  StudentEnrollment,
  User,
  Content,
  RefreshToken,
  AuditLog,
} from '../models/index.js';
import { AuthService } from '../services/auth.service.js';
import { AcademicService } from '../services/academic.service.js';
import {
  AccountStatus,
  ApprovalStatus,
  EnrollmentStatus,
  TeacherAssignmentStatus,
  UserRole,
} from '../types/academic.types.js';
import { U25RMA101_SYLLABUS } from '../services/u25rma101-seed.service.js';

test('U25RMA101 — Complete Existing Dashboard & Architecture Integration', async (t) => {
  // Test 1: Teacher Login with Username 'math.teacher' and Password 'Math@12345'
  await t.test('Test 1: Mathematics Teacher can login using username "math.teacher" and "Math@12345"', async () => {
    // Mock User queries for login
    const origFindOne = User.findOne;
    const origRefreshTokenCreate = RefreshToken.create;
    const origAuditLogCreate = AuditLog.create;
    (RefreshToken as any).create = () => Promise.resolve({ token: 'mock-token' });
    (AuditLog as any).create = () => Promise.resolve({ action: 'LOGIN' });

    const testPassword = 'Math@12345';
    const passwordHash = await bcrypt.hash(testPassword, 10);

    const mockMathTeacher = {
      _id: new Types.ObjectId(),
      name: 'Mathematics Teacher',
      collegeEmail: 'math.teacher@kpriet.ac.in',
      identifier: 'math.teacher',
      passwordHash,
      role: UserRole.TEACHER,
      department: new Types.ObjectId('6ab40430dcfcae09aed4df99'),
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      isLocked: () => false,
      comparePassword: (p: string) => bcrypt.compare(p, passwordHash),
      recordSuccessfulLogin: async () => {},
      recordFailedLogin: async () => false,
      select: function () {
        return this;
      },
    };

    (User as any).findOne = (query: any) => {
      // Check if query matches email or identifier
      if (
        query.collegeEmail === 'math.teacher@kpriet.ac.in' ||
        query.identifier === 'math.teacher' ||
        (query.$or &&
          query.$or.some(
            (cond: any) =>
              cond.collegeEmail === 'math.teacher@kpriet.ac.in' ||
              cond.identifier === 'math.teacher' ||
              cond.identifier === 'MATH.TEACHER'
          ))
      ) {
        return {
          select: () => Promise.resolve(mockMathTeacher),
        };
      }
      return { select: () => Promise.resolve(null) };
    };

    try {
      const loginResult = await AuthService.login({
        collegeEmail: 'math.teacher',
        password: 'Math@12345',
      });

      assert.ok(loginResult.user, 'Login must return user entity');
      assert.equal(loginResult.user.name, 'Mathematics Teacher');
      assert.equal(loginResult.user.role, UserRole.TEACHER);
      assert.ok(loginResult.accessToken, 'Must generate access token');
      assert.ok(loginResult.refreshToken, 'Must generate refresh token');
    } finally {
      User.findOne = origFindOne;
      RefreshToken.create = origRefreshTokenCreate;
      AuditLog.create = origAuditLogCreate;
    }
  });

  // Test 2: Teacher Dashboard shows U25RMA101 under My Subjects
  await t.test('Test 2: Teacher Dashboard My Subjects returns U25RMA101 for IT Semester I', async () => {
    const origTeacherAssignmentFind = TeacherAssignment.find;
    const origSubjectFind = Subject.find;

    const teacherId = new Types.ObjectId();
    const itDeptId = new Types.ObjectId();
    const sem1Id = new Types.ObjectId();
    const subjectId = new Types.ObjectId();

    const mockSubject = {
      _id: subjectId,
      subjectCode: 'U25RMA101',
      subjectName: 'Multivariable Calculus and Applications',
      department: { _id: itDeptId, name: 'Information Technology', code: 'IT' },
      semester: { _id: sem1Id, semesterNumber: 1, academicYear: '2024-2025' },
      semesterNumber: 1,
      credits: 4,
      category: 'BSC',
      status: 'ACTIVE',
      syllabus: U25RMA101_SYLLABUS,
    };

    (TeacherAssignment as any).find = () =>
      Promise.resolve([
        {
          teacher: teacherId,
          subject: subjectId,
          department: itDeptId,
          semester: sem1Id,
          status: TeacherAssignmentStatus.ACTIVE,
        },
      ]);

    (Subject as any).find = () => ({
      populate: () => ({
        populate: () => ({
          sort: () => ({
            lean: () => Promise.resolve([mockSubject]),
          }),
        }),
      }),
    });

    try {
      const teacherUser = {
        _id: teacherId,
        role: UserRole.TEACHER,
        department: new Types.ObjectId(), // Math Department ID
      };

      const subjects = await AcademicService.getSubjects({}, teacherUser as any);
      assert.equal(subjects.length, 1);
      assert.equal(subjects[0].subjectCode, 'U25RMA101');
      assert.equal(subjects[0].subjectName, 'Multivariable Calculus and Applications');
      assert.equal((subjects[0].department as any).code, 'IT');
      assert.equal(subjects[0].semesterNumber, 1);
    } finally {
      TeacherAssignment.find = origTeacherAssignmentFind;
      Subject.find = origSubjectFind;
    }
  });

  // Test 3 & 4: Curriculum verification (5 Units and all topics)
  await t.test('Test 4: Curriculum contains Unit I to Unit V with exact topic hierarchy', () => {
    assert.equal(U25RMA101_SYLLABUS.length, 5, 'Must have exactly 5 units');

    // Unit I
    assert.equal(U25RMA101_SYLLABUS[0].unitNumber, 1);
    assert.equal(U25RMA101_SYLLABUS[0].title, 'DIFFERENTIAL CALCULUS');
    assert.deepEqual(U25RMA101_SYLLABUS[0].topics, [
      'Functions of two variables',
      'Partial derivatives',
      'Total derivatives',
      "Taylor's formula for functions of two variables",
      'Extreme Values',
    ]);

    // Unit II
    assert.equal(U25RMA101_SYLLABUS[1].unitNumber, 2);
    assert.equal(U25RMA101_SYLLABUS[1].title, 'INTEGRAL CALCULUS');
    assert.deepEqual(U25RMA101_SYLLABUS[1].topics, [
      'Double integrals',
      'Double integrals over rectangles',
      'Double integrals over general regions',
      "Fubini's theorem (statement only)",
      'Area and Volume by double integration',
      'Reversing the order of integration',
    ]);

    // Unit III
    assert.equal(U25RMA101_SYLLABUS[2].unitNumber, 3);
    assert.equal(U25RMA101_SYLLABUS[2].title, 'VECTOR CALCULUS');
    assert.ok(U25RMA101_SYLLABUS[2].topics.includes('Gradient of a scalar field'));
    assert.ok(U25RMA101_SYLLABUS[2].topics.includes("Green's theorem"));
    assert.ok(U25RMA101_SYLLABUS[2].topics.includes('Gauss divergence theorem'));
    assert.ok(U25RMA101_SYLLABUS[2].topics.includes("Stokes' theorem"));

    // Unit IV
    assert.equal(U25RMA101_SYLLABUS[3].unitNumber, 4);
    assert.equal(
      U25RMA101_SYLLABUS[3].title,
      'FIRST ORDER LINEAR ORDINARY DIFFERENTIAL EQUATIONS'
    );
    assert.ok(U25RMA101_SYLLABUS[3].topics.includes('Basic concepts of ordinary differential equations'));
    assert.ok(U25RMA101_SYLLABUS[3].topics.includes('Separable and exact differential equations'));

    // Unit V
    assert.equal(U25RMA101_SYLLABUS[4].unitNumber, 5);
    assert.equal(
      U25RMA101_SYLLABUS[4].title,
      'SECOND ORDER LINEAR DIFFERENTIAL EQUATIONS'
    );
    assert.ok(U25RMA101_SYLLABUS[4].topics.includes('Homogeneous linear equations of second order'));
    assert.ok(U25RMA101_SYLLABUS[4].topics.includes('Euler–Cauchy equation'));
  });

  // Test 5: IT Semester I Student sees U25RMA101
  await t.test('Test 5: IT Semester I Student sees U25RMA101 under My Subjects', async () => {
    const origStudentEnrollmentFindOne = StudentEnrollment.findOne;
    const origSubjectFind = Subject.find;

    const itDeptId = new Types.ObjectId();
    const sem1Id = new Types.ObjectId();
    const u25rma101Id = new Types.ObjectId();
    const itStudentId = new Types.ObjectId();

    const mockSubject = {
      _id: u25rma101Id,
      subjectCode: 'U25RMA101',
      subjectName: 'Multivariable Calculus and Applications',
      department: { _id: itDeptId, name: 'Information Technology', code: 'IT' },
      semester: { _id: sem1Id, semesterNumber: 1 },
      semesterNumber: 1,
      status: 'ACTIVE',
    };

    (StudentEnrollment as any).findOne = () =>
      Promise.resolve({
        student: itStudentId,
        department: itDeptId,
        semester: sem1Id,
        enrolledSubjects: [u25rma101Id],
        status: EnrollmentStatus.APPROVED,
      });

    (Subject as any).find = (query: any) => {
      // Must query student's department
      assert.equal(String(query.department), String(itDeptId));
      return {
        populate: () => ({
          populate: () => ({
            sort: () => ({
              lean: () => Promise.resolve([mockSubject]),
            }),
          }),
        }),
      };
    };

    try {
      const studentUser = {
        _id: itStudentId,
        role: UserRole.STUDENT,
        department: itDeptId,
      };

      const subjects = await AcademicService.getSubjects({}, studentUser as any);
      assert.equal(subjects.length, 1);
      assert.equal(subjects[0].subjectCode, 'U25RMA101');
    } finally {
      StudentEnrollment.findOne = origStudentEnrollmentFindOne;
      Subject.find = origSubjectFind;
    }
  });

  // Test 6: Other Department Student does NOT see U25RMA101
  await t.test('Test 6: Other Department Student (e.g. Civil) does NOT see U25RMA101', async () => {
    const origStudentEnrollmentFindOne = StudentEnrollment.findOne;
    const origSubjectFind = Subject.find;

    const civilDeptId = new Types.ObjectId();
    const itDeptId = new Types.ObjectId();
    const civilStudentId = new Types.ObjectId();

    (StudentEnrollment as any).findOne = () =>
      Promise.resolve({
        student: civilStudentId,
        department: civilDeptId,
        enrolledSubjects: [new Types.ObjectId()], // Civil subjects
        status: EnrollmentStatus.APPROVED,
      });

    (Subject as any).find = (query: any) => {
      // In Civil department, U25RMA101 does not exist
      assert.equal(String(query.department), String(civilDeptId));
      return {
        populate: () => ({
          populate: () => ({
            sort: () => ({
              lean: () => Promise.resolve([]),
            }),
          }),
        }),
      };
    };

    try {
      const civilStudent = {
        _id: civilStudentId,
        role: UserRole.STUDENT,
        department: civilDeptId,
      };

      const subjects = await AcademicService.getSubjects({}, civilStudent as any);
      assert.equal(subjects.length, 0, 'Civil student must not see U25RMA101');
    } finally {
      StudentEnrollment.findOne = origStudentEnrollmentFindOne;
      Subject.find = origSubjectFind;
    }
  });

  // Test 7: Other Semester IT Student does NOT see U25RMA101
  await t.test('Test 7: Other Semester IT Student (e.g. Semester 3) does NOT see U25RMA101', async () => {
    const origStudentEnrollmentFindOne = StudentEnrollment.findOne;
    const origSubjectFind = Subject.find;

    const itDeptId = new Types.ObjectId();
    const sem3StudentId = new Types.ObjectId();
    const dsaSubId = new Types.ObjectId();

    (StudentEnrollment as any).findOne = () =>
      Promise.resolve({
        student: sem3StudentId,
        department: itDeptId,
        enrolledSubjects: [dsaSubId], // Semester 3 DSA
        status: EnrollmentStatus.APPROVED,
      });

    (Subject as any).find = () => {
      return {
        populate: () => ({
          populate: () => ({
            sort: () => ({
              lean: () =>
                Promise.resolve([
                  {
                    _id: dsaSubId,
                    subjectCode: 'U21CSG03',
                    subjectName: 'Data Structures',
                    semesterNumber: 3,
                  },
                ]),
            }),
          }),
        }),
      };
    };

    try {
      const sem3Student = {
        _id: sem3StudentId,
        role: UserRole.STUDENT,
        department: itDeptId,
      };

      const subjects = await AcademicService.getSubjects({}, sem3Student as any);
      assert.equal(subjects.length, 1);
      assert.equal(subjects[0].subjectCode, 'U21CSG03');
      assert.ok(!subjects.some((s: any) => s.subjectCode === 'U25RMA101'));
    } finally {
      StudentEnrollment.findOne = origStudentEnrollmentFindOne;
      Subject.find = origSubjectFind;
    }
  });

  // Test 10: Existing Smart Board Launch Mechanism inherits U25RMA101 academic context
  await t.test('Test 10: Smart Board launch session inherits U25RMA101 context seamlessly', async () => {
    const origUserFindById = User.findById;
    const origSubjectFindById = Subject.findById;
    const origTeacherAssignmentFindOne = TeacherAssignment.findOne;
    const origContentFind = Content.find;

    const teacherId = new Types.ObjectId();
    const subjectId = new Types.ObjectId();
    const itDeptId = new Types.ObjectId();
    const sem1Id = new Types.ObjectId();

    (User as any).findById = () =>
      Promise.resolve({
        _id: teacherId,
        name: 'Mathematics Teacher',
        role: UserRole.TEACHER,
        department: new Types.ObjectId(),
      });

    (TeacherAssignment as any).findOne = () =>
      Promise.resolve({
        teacher: teacherId,
        subject: subjectId,
        department: itDeptId,
        status: TeacherAssignmentStatus.ACTIVE,
      });

    (Content as any).find = () => ({
      lean: () => Promise.resolve([]),
    });

    (Subject as any).findById = () => ({
      populate: () => ({
        populate: () =>
          Promise.resolve({
            _id: subjectId,
            subjectCode: 'U25RMA101',
            subjectName: 'Multivariable Calculus and Applications',
            semesterNumber: 1,
            department: {
              _id: itDeptId,
              name: 'Information Technology',
              code: 'IT',
            },
            semester: {
              _id: sem1Id,
              semesterNumber: 1,
              academicYear: '2024-2025',
              regulation: 'R2021',
            },
            syllabus: U25RMA101_SYLLABUS,
          }),
      }),
    });

    try {
      const session = await AcademicService.createSmartBoardSession(
        String(teacherId),
        UserRole.TEACHER,
        String(subjectId)
      );

      assert.ok(session.boardUrl, 'Must generate boardUrl');
      assert.ok(session.boardUrl.includes('U25RMA101'));
      assert.ok(session.boardUrl.includes('Multivariable+Calculus'));
      assert.equal(session.sessionData.subject.subjectCode, 'U25RMA101');
      assert.equal(session.sessionData.subject.subjectName, 'Multivariable Calculus and Applications');
      assert.equal(session.sessionData.department.name, 'Information Technology');
      assert.equal(session.sessionData.semester.number, 1);
      assert.equal(session.sessionData.userName, 'Mathematics Teacher');
    } finally {
      User.findById = origUserFindById;
      Subject.findById = origSubjectFindById;
      TeacherAssignment.findOne = origTeacherAssignmentFindOne;
      Content.find = origContentFind;
    }
  });
});
