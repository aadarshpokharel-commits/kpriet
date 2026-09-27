import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import {
  Department,
  Question,
  QuestionBank,
  Quiz,
  QuizAnswer,
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
  BloomsTaxonomy,
  DifficultyLevel,
  EnrollmentStatus,
  ProgrammeType,
  QuestionType,
  QuizAttemptStatus,
  QuizNavigationRule,
  QuizStatus,
  TeacherAssignmentStatus,
  UserRole,
} from '../src/types/academic.types.js';

describe('Quiz Creation & Assessment Engine Integration Tests (Module 08)', () => {
  const app = createApp();

  let dept: any;
  let sem: any;
  let subject: any;
  let otherSubject: any;

  let teacher: any;
  let teacherToken: string;

  let otherTeacher: any;
  let otherTeacherToken: string;

  let enrolledStudent: any;
  let enrolledStudentToken: string;

  let nonEnrolledStudent: any;
  let nonEnrolledStudentToken: string;

  let createdQuizId: string;
  let questionBankItemId: string;
  let studentAttemptId: string;

  beforeAll(async () => {
    await connectDatabase();

    // 1. Department
    dept = await Department.findOne({ code: 'QUIZ_ENG' });
    if (!dept) {
      dept = await Department.create({
        name: 'Quiz Assessment Engineering',
        code: 'QUIZ_ENG',
        programmeType: ProgrammeType.UG,
        description: 'Testing Quiz Engine',
        status: 'ACTIVE',
      });
    }

    // 2. Semester
    sem = await Semester.findOne({ department: dept._id, semesterNumber: 3 });
    if (!sem) {
      sem = await Semester.create({
        semesterNumber: 3,
        academicYear: '2024-2025',
        regulation: 'R2021',
        department: dept._id,
        status: 'ACTIVE',
      });
    }

    // 3. Subject with syllabus units
    subject = await Subject.findOne({ subjectCode: 'QZ301' });
    if (!subject) {
      subject = await Subject.create({
        subjectName: 'Data Structures and Algorithms',
        subjectCode: 'QZ301',
        department: dept._id,
        semester: sem._id,
        semesterNumber: 3,
        credits: 4,
        status: 'ACTIVE',
        syllabus: [
          {
            unitNumber: 1,
            title: 'Linear Data Structures',
            topics: ['Arrays', 'Linked Lists', 'Stacks', 'Queues'],
            hours: 10,
          },
          {
            unitNumber: 2,
            title: 'Non-Linear Data Structures',
            topics: ['Binary Trees', 'AVL Trees', 'Heaps'],
            hours: 12,
          },
          {
            unitNumber: 3,
            title: 'Graph Algorithms',
            topics: ['BFS', 'DFS', 'Dijkstra', 'MST'],
            hours: 10,
          },
        ],
      });
    }

    otherSubject = await Subject.findOne({ subjectCode: 'QZ302' });
    if (!otherSubject) {
      otherSubject = await Subject.create({
        subjectName: 'Computer Architecture',
        subjectCode: 'QZ302',
        department: dept._id,
        semester: sem._id,
        semesterNumber: 3,
        credits: 3,
        status: 'ACTIVE',
      });
    }

    // 4. Teachers
    teacher = await User.findOne({ collegeEmail: 'prof.quiz@kpriet.ac.in' });
    if (!teacher) {
      teacher = await User.create({
        name: 'Prof. Quiz Master',
        collegeEmail: 'prof.quiz@kpriet.ac.in',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
        role: UserRole.TEACHER,
        accountStatus: AccountStatus.ACTIVE,
        approvalStatus: ApprovalStatus.APPROVED,
        department: dept._id,
        identifier: 'FAC_QZ_01',
      });
    }
    teacherToken = generateAccessToken(teacher);

    otherTeacher = await User.findOne({ collegeEmail: 'prof.other@kpriet.ac.in' });
    if (!otherTeacher) {
      otherTeacher = await User.create({
        name: 'Prof. Other',
        collegeEmail: 'prof.other@kpriet.ac.in',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
        role: UserRole.TEACHER,
        accountStatus: AccountStatus.ACTIVE,
        approvalStatus: ApprovalStatus.APPROVED,
        department: dept._id,
        identifier: 'FAC_QZ_02',
      });
    }
    otherTeacherToken = generateAccessToken(otherTeacher);

    // Assign main teacher to subject QZ301
    await TeacherAssignment.findOneAndUpdate(
      { teacher: teacher._id, subject: subject._id },
      {
        department: dept._id,
        semester: sem._id,
        status: TeacherAssignmentStatus.ACTIVE,
        academicYear: '2024-2025',
        section: 'ALL',
      },
      { upsert: true }
    );

    // 5. Students
    enrolledStudent = await User.findOne({ collegeEmail: '23qz001@kpriet.ac.in' });
    if (!enrolledStudent) {
      enrolledStudent = await User.create({
        name: 'Enrolled Quiz Student',
        collegeEmail: '23qz001@kpriet.ac.in',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.ACTIVE,
        department: dept._id,
        identifier: '23QZ001',
      });
    }
    enrolledStudentToken = generateAccessToken(enrolledStudent);

    await StudentEnrollment.findOneAndUpdate(
      { student: enrolledStudent._id, semester: sem._id },
      {
        department: dept._id,
        enrolledSubjects: [subject._id],
        status: EnrollmentStatus.APPROVED,
      },
      { upsert: true }
    );

    nonEnrolledStudent = await User.findOne({ collegeEmail: '23qz999@kpriet.ac.in' });
    if (!nonEnrolledStudent) {
      nonEnrolledStudent = await User.create({
        name: 'Foreign Student',
        collegeEmail: '23qz999@kpriet.ac.in',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.ACTIVE,
        department: dept._id,
        identifier: '23QZ999',
      });
    }
    nonEnrolledStudentToken = generateAccessToken(nonEnrolledStudent);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  // ═════════════════════════════════════════════════════════════════════
  // 1. QUIZ CREATION & AUTHORIZATION
  // ═════════════════════════════════════════════════════════════════════

  describe('1. Quiz Creation & Authorization', () => {
    it('allows assigned teacher to create a combined-unit quiz with custom settings', async () => {
      const res = await request(app)
        .post('/api/v1/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'DSA Midterm Assessment: Units 1 & 2',
          description: 'Comprehensive evaluation covering Stacks, Queues, and Trees',
          subjectId: subject._id.toString(),
          curriculumUnits: [1, 2],
          difficultyLevel: DifficultyLevel.MIXED,
          durationMinutes: 45,
          totalMarks: 25,
          passingMarks: 10,
          negativeMarkingEnabled: true,
          negativeMarksPerQuestion: 0.25,
          fullscreenRequired: true,
          navigationRule: QuizNavigationRule.FREE,
          status: QuizStatus.PUBLISHED,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('DSA Midterm Assessment: Units 1 & 2');
      expect(res.body.data.curriculumUnits).toEqual([1, 2]);
      expect(res.body.data.difficultyLevel).toBe(DifficultyLevel.MIXED);
      expect(res.body.data.fullscreenRequired).toBe(true);
      expect(res.body.data.status).toBe(QuizStatus.PUBLISHED);

      createdQuizId = res.body.data._id;
    });

    it('rejects quiz creation by a teacher not assigned to the subject', async () => {
      const res = await request(app)
        .post('/api/v1/quizzes')
        .set('Authorization', `Bearer ${otherTeacherToken}`)
        .send({
          title: 'Unauthorized Quiz',
          subjectId: subject._id.toString(),
          curriculumUnits: [1],
        });

      expect(res.status).toBe(403);
    });

    it('rejects quiz creation by a student role', async () => {
      const res = await request(app)
        .post('/api/v1/quizzes')
        .set('Authorization', `Bearer ${enrolledStudentToken}`)
        .send({
          title: 'Student Attempting Quiz Creation',
          subjectId: subject._id.toString(),
        });

      expect(res.status).toBe(403);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 2. QUESTION MANAGEMENT (ALL 8 QUESTION FORMATS)
  // ═════════════════════════════════════════════════════════════════════

  describe('2. Question Management', () => {
    it('adds Multiple Choice (MCQ) question', async () => {
      const res = await request(app)
        .post(`/api/v1/quizzes/${createdQuizId}/questions`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          questionText: 'What is the worst-case time complexity of searching in a Binary Search Tree?',
          questionType: QuestionType.MCQ,
          options: [
            { id: 'opt_1', text: 'O(1)' },
            { id: 'opt_2', text: 'O(log n)' },
            { id: 'opt_3', text: 'O(n)' },
            { id: 'opt_4', text: 'O(n log n)' },
          ],
          correctAnswers: 'opt_3',
          marks: 1,
          negativeMarks: 0.25,
          explanation: 'In a skewed BST, search complexity degenerates to O(n).',
          chapterOrUnit: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.questionType).toBe(QuestionType.MCQ);
      expect(res.body.data.orderIndex).toBe(1);
    });

    it('adds Numerical question with configured tolerance', async () => {
      const res = await request(app)
        .post(`/api/v1/quizzes/${createdQuizId}/questions`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          questionText: 'What is the maximum number of nodes in a binary tree of height 4 (counting root as height 0)?',
          questionType: QuestionType.NUMERICAL,
          options: [],
          correctAnswers: 31,
          numericalTolerance: 0,
          marks: 2,
          chapterOrUnit: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.questionType).toBe(QuestionType.NUMERICAL);
      expect(res.body.data.correctAnswers).toBe(31);
    });

    it('adds Multiple Correct question', async () => {
      const res = await request(app)
        .post(`/api/v1/quizzes/${createdQuizId}/questions`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          questionText: 'Which of the following are self-balancing binary search trees?',
          questionType: QuestionType.MULTIPLE_CORRECT,
          options: [
            { id: 'mc_1', text: 'AVL Tree' },
            { id: 'mc_2', text: 'Red-Black Tree' },
            { id: 'mc_3', text: 'Binary Heap' },
            { id: 'mc_4', text: 'Splay Tree' },
          ],
          correctAnswers: ['mc_1', 'mc_2', 'mc_4'],
          marks: 2,
          chapterOrUnit: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.questionType).toBe(QuestionType.MULTIPLE_CORRECT);
    });

    it('adds Fill in the Blank question', async () => {
      const res = await request(app)
        .post(`/api/v1/quizzes/${createdQuizId}/questions`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          questionText: 'A queue operates on the principle of ______-in, first-out.',
          questionType: QuestionType.FILL_IN_THE_BLANK,
          options: [],
          correctAnswers: 'first',
          marks: 1,
          chapterOrUnit: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.questionType).toBe(QuestionType.FILL_IN_THE_BLANK);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 3. REUSABLE QUESTION BANK
  // ═════════════════════════════════════════════════════════════════════

  describe('3. Reusable Question Bank', () => {
    it('creates a reusable question bank item tagged with unit, difficulty, and Bloom taxonomy', async () => {
      const res = await request(app)
        .post(`/api/v1/quizzes/subjects/${subject._id}/question-bank`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          subjectId: subject._id.toString(),
          questionText: 'Given an array representing a min-heap [3, 8, 10, 15, 12, 17], what is the element at root after inserting 2?',
          questionType: QuestionType.NUMERICAL,
          correctAnswers: 2,
          marks: 2,
          chapterOrUnits: [2],
          difficulty: DifficultyLevel.HARD,
          bloomsTaxonomy: BloomsTaxonomy.APPLY,
          tags: ['heaps', 'priority-queue', 'algorithms'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.difficulty).toBe(DifficultyLevel.HARD);
      expect(res.body.data.bloomsTaxonomy).toBe(BloomsTaxonomy.APPLY);

      questionBankItemId = res.body.data._id;
    });

    it('queries question bank filtered by unit and difficulty', async () => {
      const res = await request(app)
        .get(`/api/v1/quizzes/subjects/${subject._id}/question-bank?unit=2&difficulty=HARD`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('duplicates a question bank item', async () => {
      const res = await request(app)
        .post(`/api/v1/quizzes/question-bank/${questionBankItemId}/duplicate`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(201);
      expect(res.body.data.questionText).toContain('(Copy)');
    });

    it('imports questions from question bank directly into an active quiz', async () => {
      const res = await request(app)
        .post(`/api/v1/quizzes/${createdQuizId}/import-bank`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          questionBankIds: [questionBankItemId],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.importedCount).toBe(1);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 4. AI QUIZ GENERATION
  // ═════════════════════════════════════════════════════════════════════

  describe('4. AI Quiz Generation', () => {
    it('generates domain questions calibrated to curriculum units and difficulty', async () => {
      const res = await request(app)
        .post('/api/v1/quizzes/generate-ai')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          subjectId: subject._id.toString(),
          curriculumUnits: [1, 2],
          difficulty: DifficultyLevel.MEDIUM,
          questionCount: 3,
          questionTypes: [QuestionType.MCQ, QuestionType.FILL_IN_THE_BLANK],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.generatedCount).toBe(3);
      expect(res.body.data.questions[0].questionText).toContain(subject.subjectCode);
    }, 30000);
  });

  // ═════════════════════════════════════════════════════════════════════
  // 5. STUDENT ASSESSMENT ENGINE & STRICT SECURITY
  // ═════════════════════════════════════════════════════════════════════

  describe('5. Student Assessment Flow & Security', () => {
    it('blocks a non-enrolled student from attempting the quiz', async () => {
      const res = await request(app)
        .post(`/api/v1/quizzes/${createdQuizId}/start`)
        .set('Authorization', `Bearer ${nonEnrolledStudentToken}`);

      expect(res.status).toBe(403);
    });

    it('starts quiz attempt for enrolled student with correct answers strictly stripped', async () => {
      const res = await request(app)
        .post(`/api/v1/quizzes/${createdQuizId}/start`)
        .set('Authorization', `Bearer ${enrolledStudentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attempt._id).toBeDefined();
      expect(res.body.data.quiz.fullscreenRequired).toBe(true);

      studentAttemptId = res.body.data.attempt._id;

      // Verify answer key security
      const firstQ = res.body.data.questions[0];
      expect(firstQ.correctAnswers).toBeUndefined();
      expect(firstQ.explanation).toBeUndefined();
      expect(firstQ.numericalTolerance).toBeUndefined();
    });

    it('recovers existing in-progress session if student rejoins without multiple attempt penalties', async () => {
      const res = await request(app)
        .post(`/api/v1/quizzes/${createdQuizId}/start`)
        .set('Authorization', `Bearer ${enrolledStudentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.attempt._id).toBe(studentAttemptId);
    });

    it('autosaves draft answers during the active attempt', async () => {
      const res = await request(app)
        .post(`/api/v1/quizzes/attempts/${studentAttemptId}/autosave`)
        .set('Authorization', `Bearer ${enrolledStudentToken}`)
        .send({
          answersDraft: { q1: 'opt_3' },
          timeSpentSeconds: 120,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });

    it('records fullscreen exit security event and increments violation counter', async () => {
      const res = await request(app)
        .post(`/api/v1/quizzes/attempts/${studentAttemptId}/security-event`)
        .set('Authorization', `Bearer ${enrolledStudentToken}`)
        .send({
          eventType: 'FULLSCREEN_EXIT',
          details: 'Student escaped browser fullscreen mode',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fullscreenViolationsCount).toBe(1);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 6. AUTO-GRADING ENGINE & RESULTS
  // ═════════════════════════════════════════════════════════════════════

  describe('6. Auto-Grading Engine & Submission', () => {
    it('submits quiz attempt and executes auto-grading across all objective formats', async () => {
      // Find all questions in the quiz
      const questions = await Question.find({ quiz: createdQuizId });

      const answersPayload: Record<string, any> = {};
      for (const q of questions) {
        if (q.questionType === QuestionType.MCQ) {
          answersPayload[q._id.toString()] = 'opt_3'; // correct
        } else if (q.questionType === QuestionType.NUMERICAL) {
          answersPayload[q._id.toString()] = 31; // correct
        } else if (q.questionType === QuestionType.MULTIPLE_CORRECT) {
          answersPayload[q._id.toString()] = ['mc_1', 'mc_2', 'mc_4']; // correct
        } else if (q.questionType === QuestionType.FILL_IN_THE_BLANK) {
          answersPayload[q._id.toString()] = '  FIRST  '; // case-insensitive trimmed correct
        }
      }

      const res = await request(app)
        .post(`/api/v1/quizzes/attempts/${studentAttemptId}/submit`)
        .set('Authorization', `Bearer ${enrolledStudentToken}`)
        .send({
          answers: answersPayload,
          timeSpentSeconds: 450,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(QuizAttemptStatus.SUBMITTED);
      expect(res.body.data.totalScore).toBeGreaterThanOrEqual(5);

      // Verify QuizResult record exists in database
      const resultDoc = await QuizResult.findOne({ attempt: studentAttemptId });
      expect(resultDoc).toBeDefined();
      expect(resultDoc!.score).toBe(res.body.data.totalScore);
    });

    it('allows student to review attempt with answers and explanations after submission', async () => {
      const res = await request(app)
        .get(`/api/v1/quizzes/attempts/${studentAttemptId}/review`)
        .set('Authorization', `Bearer ${enrolledStudentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attempt.totalScore).toBeDefined();
      expect(res.body.data.questions[0].correctAnswers).toBeDefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // 7. TEACHER ANALYTICS
  // ═════════════════════════════════════════════════════════════════════

  describe('7. Teacher Analytics & Statistics', () => {
    it('returns comprehensive teacher analytics and question success rates', async () => {
      const res = await request(app)
        .get(`/api/v1/quizzes/${createdQuizId}/analytics`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats.totalAttempts).toBe(1);
      expect(res.body.data.stats.averageScore).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.questionStats)).toBe(true);
      expect(Array.isArray(res.body.data.attempts)).toBe(true);
      expect(res.body.data.attempts[0].fullscreenViolationsCount).toBe(1);
    });
  });
});
