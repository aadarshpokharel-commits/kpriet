import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { ensureAllIndexes } from '../src/database/ensure-indexes.js';
import {
  Assignment,
  AssignmentGrade,
  AssignmentSubmission,
  AttendanceRecord,
  AttendanceSession,
  AuditLog,
  Content,
  Department,
  Question,
  Quiz,
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

describe('Academic Data Architecture (MongoDB / Mongoose)', () => {
  beforeAll(async () => {
    await connectDatabase();
    await Department.deleteMany({ code: /^TD_/ });
    await ensureAllIndexes();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('Department Model', () => {
    it('creates a department with valid fields and enforces unique code', async () => {
      const uniqueCode = 'TD_' + Math.floor(Math.random() * 89999 + 10000);
      const dept = await Department.create({
        name: 'Test Department of Innovation',
        code: uniqueCode,
        programmeType: ProgrammeType.UG,
        description: 'Test Department',
        status: 'ACTIVE',
      });

      expect(dept._id).toBeDefined();
      expect(dept.code).toBe(uniqueCode);
      expect(dept.programmeType).toBe('UG');

      // Test duplicate code constraint
      await expect(
        Department.create({
          name: 'Duplicate Department',
          code: uniqueCode,
          programmeType: ProgrammeType.UG,
        })
      ).rejects.toThrow();

      await Department.findByIdAndDelete(dept._id);
    });
  });

  describe('User Model', () => {
    it('hashes passwords, validates college email, and does not return password in JSON', async () => {
      const email = `test.student.${Date.now()}@kpriet.ac.in`;
      const plainPassword = 'SecretPassword123!';
      const hash = await bcrypt.hash(plainPassword, 10);

      // Create a dummy department for student
      const dept = await Department.create({
        name: 'Temporary Department',
        code: 'TD_' + Math.floor(Math.random() * 89999 + 10000),
        programmeType: ProgrammeType.UG,
      });

      const user = await User.create({
        name: 'Test Student One',
        collegeEmail: email,
        passwordHash: hash,
        role: UserRole.STUDENT,
        department: dept._id,
        identifier: 'TEST_ID_' + Date.now(),
        accountStatus: AccountStatus.ACTIVE,
        approvalStatus: ApprovalStatus.APPROVED,
      });

      expect(user._id).toBeDefined();
      expect(await user.comparePassword(plainPassword)).toBe(true);
      expect(await user.comparePassword('WrongPassword')).toBe(false);

      // Verify toJSON transforms passwordHash away
      const json = user.toJSON();
      expect(json.passwordHash).toBeUndefined();

      // Verify invalid email rejected
      await expect(
        User.create({
          name: 'Bad Email User',
          collegeEmail: 'invalid-email-no-domain',
          passwordHash: hash,
          role: UserRole.STUDENT,
          department: dept._id,
          identifier: 'TEST_BAD_' + Date.now(),
        })
      ).rejects.toThrow();

      // Cleanup
      await User.findByIdAndDelete(user._id);
      await Department.findByIdAndDelete(dept._id);
    });
  });

  describe('Teacher-Subject Assignment & Student Enrollment Constraints', () => {
    it('supports multiple assignments per teacher without single-field restriction', async () => {
      const dept = await Department.create({
        name: 'Dept Multi',
        code: 'TD_' + Math.floor(Math.random() * 89999 + 10000),
        programmeType: ProgrammeType.UG,
      });

      const sem = await Semester.create({
        semesterNumber: 1,
        academicYear: '2024-2025',
        regulation: 'R2021',
        department: dept._id,
        status: SemesterStatus.ACTIVE,
      });

      const sub1 = await Subject.create({
        subjectName: 'Subject One',
        subjectCode: 'SUB1_' + Date.now(),
        department: dept._id,
        semester: sem._id,
        semesterNumber: 1,
        credits: 3,
      });

      const sub2 = await Subject.create({
        subjectName: 'Subject Two',
        subjectCode: 'SUB2_' + Date.now(),
        department: dept._id,
        semester: sem._id,
        semesterNumber: 1,
        credits: 4,
      });

      const teacher = await User.create({
        name: 'Dr. Multi Teacher',
        collegeEmail: `teacher.${Date.now()}@kpriet.ac.in`,
        passwordHash: 'dummyhash',
        role: UserRole.TEACHER,
        department: dept._id,
        identifier: 'TEACH_' + Date.now(),
      });

      // Teacher assigned to subject 1
      const asgn1 = await TeacherAssignment.create({
        teacher: teacher._id,
        subject: sub1._id,
        department: dept._id,
        semester: sem._id,
        academicYear: '2024-2025',
        section: 'A',
      });

      // Teacher assigned to subject 2 (demonstrating many-to-many relationship)
      const asgn2 = await TeacherAssignment.create({
        teacher: teacher._id,
        subject: sub2._id,
        department: dept._id,
        semester: sem._id,
        academicYear: '2024-2025',
        section: 'B',
      });

      expect(asgn1._id).toBeDefined();
      expect(asgn2._id).toBeDefined();

      // Duplicate assignment of same subject + section for same teacher should fail
      await expect(
        TeacherAssignment.create({
          teacher: teacher._id,
          subject: sub1._id,
          department: dept._id,
          semester: sem._id,
          academicYear: '2024-2025',
          section: 'A',
        })
      ).rejects.toThrow();

      // Cleanup
      await TeacherAssignment.deleteMany({ teacher: teacher._id });
      await Subject.findByIdAndDelete(sub1._id);
      await Subject.findByIdAndDelete(sub2._id);
      await Semester.findByIdAndDelete(sem._id);
      await User.findByIdAndDelete(teacher._id);
      await Department.findByIdAndDelete(dept._id);
    });
  });

  describe('Quiz with 8 Question Formats', () => {
    it('supports all 8 required assessment question formats', async () => {
      const dept = await Department.create({
        name: 'Dept Quiz',
        code: 'TD_' + Math.floor(Math.random() * 89999 + 10000),
        programmeType: ProgrammeType.UG,
      });
      const sem = await Semester.create({
        semesterNumber: 1,
        academicYear: '2024-2025',
        regulation: 'R2021',
        department: dept._id,
      });
      const sub = await Subject.create({
        subjectName: 'Quiz Subject',
        subjectCode: 'QSUB_' + Date.now(),
        department: dept._id,
        semester: sem._id,
        semesterNumber: 1,
        credits: 3,
      });
      const teacher = await User.create({
        name: 'Teacher Quiz',
        collegeEmail: `tquiz.${Date.now()}@kpriet.ac.in`,
        passwordHash: 'dummy',
        role: UserRole.TEACHER,
        department: dept._id,
        identifier: 'TQ_' + Date.now(),
      });

      const quiz = await Quiz.create({
        title: 'Diagnostic Test',
        department: dept._id,
        semester: sem._id,
        subject: sub._id,
        teacher: teacher._id,
        durationMinutes: 30,
        totalMarks: 24,
      });

      const questionTypes: QuestionType[] = [
        QuestionType.MCQ,
        QuestionType.MULTIPLE_CORRECT,
        QuestionType.FILL_IN_THE_BLANK,
        QuestionType.ASSERTION_REASON,
        QuestionType.NUMERICAL,
        QuestionType.MATCH_FOLLOWING,
        QuestionType.CASE_SCENARIO,
        QuestionType.SHORT_ANSWER,
      ];

      for (let i = 0; i < questionTypes.length; i++) {
        const q = await Question.create({
          quiz: quiz._id,
          questionText: `Test question for ${questionTypes[i]}`,
          questionType: questionTypes[i],
          correctAnswers: 'Sample Correct Answer',
          marks: 3,
          orderIndex: i + 1,
        });
        expect(q._id).toBeDefined();
        expect(q.questionType).toBe(questionTypes[i]);
      }

      const count = await Question.countDocuments({ quiz: quiz._id });
      expect(count).toBe(8);

      // Cleanup
      await Question.deleteMany({ quiz: quiz._id });
      await Quiz.findByIdAndDelete(quiz._id);
      await Subject.findByIdAndDelete(sub._id);
      await Semester.findByIdAndDelete(sem._id);
      await User.findByIdAndDelete(teacher._id);
      await Department.findByIdAndDelete(dept._id);
    });
  });
});
