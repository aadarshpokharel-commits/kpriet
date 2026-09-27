import mongoose, { Types } from 'mongoose';
import {
  Quiz,
  Question,
  QuestionBank,
  QuizAttempt,
  QuizAnswer,
  QuizResult,
  Subject,
  TeacherAssignment,
  StudentEnrollment,
  AuditLog,
  User,
} from '../models/index.js';
import type {
  IQuestion,
  IQuestionBankItem,
  IOptionItem,
} from '../models/index.js';
import {
  QuestionType,
  QuizStatus,
  QuizAttemptStatus,
  DifficultyLevel,
  BloomsTaxonomy,
  QuizNavigationRule,
  AuditAction,
  NotificationType,
  EnrollmentStatus,
} from '../types/academic.types.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';
import { AiQuizService } from './ai-quiz.service.js';
import { NotificationService } from './notification.service.js';


export class QuizService {
  // ═════════════════════════════════════════════════════════════════════
  // 1. QUIZ CREATION & MANAGEMENT (TEACHER)
  // ═════════════════════════════════════════════════════════════════════

  static async createQuiz(teacherId: string, payload: any) {
    const subject = await Subject.findById(payload.subjectId).populate(
      'department semester'
    );
    if (!subject) {
      throw ApiError.notFound('Subject not found');
    }

    // Verify teacher assignment
    const assignment = await TeacherAssignment.findOne({
      teacher: teacherId,
      subject: payload.subjectId,
      status: 'ACTIVE',
    });
    if (!assignment) {
      throw ApiError.forbidden(
        'You are not authorized to create quizzes for this subject'
      );
    }

    const durationMinutes = payload.durationMinutes || payload.duration || 30;
    const maxAttempts = payload.maxAttempts || payload.attemptsAllowed || 1;
    const allowMultipleAttempts =
      payload.allowMultipleAttempts !== undefined
        ? payload.allowMultipleAttempts
        : maxAttempts > 1;

    const quiz = await Quiz.create({
      title: payload.title,
      description: payload.description,
      department: (subject as any).department._id || subject.department,
      semester: (subject as any).semester._id || subject.semester,
      subject: subject._id,
      teacher: teacherId,
      curriculumUnits: payload.curriculumUnits || [1],
      topics: Array.isArray(payload.topics) ? payload.topics : [],
      difficultyLevel: payload.difficultyLevel || DifficultyLevel.MEDIUM,
      sourceNotes: payload.sourceNotes || [],
      durationMinutes,
      totalMarks: payload.totalMarks || 20,
      passingMarks: payload.passingMarks || 10,
      instructions: payload.instructions,
      startTime: payload.startTime ? new Date(payload.startTime) : undefined,
      endTime: payload.endTime ? new Date(payload.endTime) : undefined,
      allowMultipleAttempts,
      maxAttempts,
      randomizeQuestions: payload.randomizeQuestions || false,
      randomizeOptions: payload.randomizeOptions || false,
      negativeMarkingEnabled: payload.negativeMarkingEnabled || false,
      negativeMarksPerQuestion: payload.negativeMarksPerQuestion || 0,
      showResultImmediately: payload.showResultImmediately !== false,
      showAnswersAfterSubmission: payload.showAnswersAfterSubmission !== false,
      fullscreenRequired: payload.fullscreenRequired !== false,
      maxWarnings: payload.maxWarnings ?? 3,
      tabSwitchDetection: payload.tabSwitchDetection !== false,
      autoSubmitOnMaxViolations: payload.autoSubmitOnMaxViolations !== false,
      blockCopyPaste: payload.blockCopyPaste !== false,
      navigationRule: payload.navigationRule || QuizNavigationRule.FREE,
      status: payload.status || QuizStatus.DRAFT,
    });

    await AuditLog.create({
      userId: teacherId,
      action: AuditAction.QUIZ_CREATE,
      entityType: 'Quiz',
      entityId: quiz._id,
      description: `Created quiz "${quiz.title}" for subject ${subject.subjectCode}`,
    });

    if (quiz.status === QuizStatus.PUBLISHED) {
      this.notifyEnrolledStudentsOfQuiz(quiz, teacherId).catch(() => {});
    }

    return quiz;

  }

  static async getSubjectQuizzes(subjectId: string, user: any) {
    const isTeacher = user.role === 'TEACHER' || user.role === 'HOD';

    const filter: any = { subject: subjectId };
    if (!isTeacher) {
      filter.status = QuizStatus.PUBLISHED;
    }

    const quizzes = await Quiz.find(filter)
      .populate('teacher', 'name collegeEmail identifier')
      .sort({ createdAt: -1 })
      .lean();

    // Attach questions count and attempt statistics
    const enriched = await Promise.all(
      quizzes.map(async (q) => {
        const questionCount = await Question.countDocuments({ quiz: q._id });
        const attemptsCount = await QuizAttempt.countDocuments({ quiz: q._id });

        let myAttempt: any = null;
        if (user.role === 'STUDENT') {
          myAttempt = await QuizAttempt.findOne({
            quiz: q._id,
            student: user._id,
          })
            .sort({ attemptNumber: -1 })
            .lean();
        }

        return {
          ...q,
          questionCount,
          attemptsCount,
          myAttempt: myAttempt
            ? {
                attemptId: myAttempt._id,
                status: myAttempt.status,
                totalScore: myAttempt.totalScore,
                isGraded: myAttempt.isGraded,
                submittedAt: myAttempt.submittedAt,
              }
            : null,
        };
      })
    );

    return enriched;
  }

  static async getQuizById(quizId: string, user: any) {
    const quiz = await Quiz.findById(quizId)
      .populate('subject', 'subjectName subjectCode credits')
      .populate('teacher', 'name collegeEmail identifier')
      .lean();

    if (!quiz) {
      throw ApiError.notFound('Quiz not found');
    }

    const isTeacher = user.role === 'TEACHER' || user.role === 'HOD';

    // Verify student enrollment if student
    if (user.role === 'STUDENT') {
      const enrollment = await StudentEnrollment.findOne({
        student: user._id,
        status: 'APPROVED',
        enrolledSubjects: mongoose.trusted({ $in: [quiz.subject._id || quiz.subject] }),
      });
      if (!enrollment) {
        throw ApiError.forbidden(
          'You are not enrolled in the subject for this quiz'
        );
      }
    }

    // Load questions
    const rawQuestions = await Question.find({ quiz: quiz._id })
      .sort({ orderIndex: 1 })
      .lean();

    // Check if student has submitted attempt
    let studentHasSubmitted = false;
    if (user.role === 'STUDENT') {
      const finishedAttempt = await QuizAttempt.findOne({
        quiz: quiz._id,
        student: user._id,
        status: mongoose.trusted({
          $in: [QuizAttemptStatus.SUBMITTED, QuizAttemptStatus.TIMED_OUT],
        }),
      });
      if (finishedAttempt) {
        studentHasSubmitted = true;
      }
    }

    // Strip answers if student hasn't submitted, or if teacher hid answers
    const questions = rawQuestions.map((q) => {
      if (!isTeacher && (!studentHasSubmitted || !quiz.showAnswersAfterSubmission)) {
        const { correctAnswers, explanation, numericalTolerance, ...safeQuestion } = q;
        return safeQuestion;
      }
      return q;
    });

    return {
      ...quiz,
      questions,
      totalQuestions: questions.length,
    };
  }

  static async updateQuiz(teacherId: string, quizId: string, payload: any) {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw ApiError.notFound('Quiz not found');
    }

    // Verify authorization
    const assignment = await TeacherAssignment.findOne({
      teacher: teacherId,
      subject: quiz.subject,
      status: 'ACTIVE',
    });
    if (!assignment && quiz.teacher.toString() !== teacherId) {
      throw ApiError.forbidden('You are not authorized to update this quiz');
    }

    Object.assign(quiz, payload);
    if (payload.duration || payload.durationMinutes) {
      quiz.durationMinutes = payload.durationMinutes || payload.duration;
    }
    if (payload.attemptsAllowed || payload.maxAttempts) {
      quiz.maxAttempts = payload.maxAttempts || payload.attemptsAllowed;
      if (payload.allowMultipleAttempts === undefined) {
        quiz.allowMultipleAttempts = quiz.maxAttempts > 1;
      }
    }
    await quiz.save();

    await AuditLog.create({
      userId: teacherId,
      action: AuditAction.QUIZ_PUBLISH,
      entityType: 'Quiz',
      entityId: quiz._id,
      description: `Updated quiz "${quiz.title}" (status: ${quiz.status})`,
    });

    if (quiz.status === QuizStatus.PUBLISHED) {
      this.notifyEnrolledStudentsOfQuiz(quiz, teacherId).catch(() => {});
    }

    return quiz;

  }

  static async deleteQuiz(teacherId: string, quizId: string) {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw ApiError.notFound('Quiz not found');
    }

    if (quiz.teacher.toString() !== teacherId) {
      throw ApiError.forbidden('Only the creator can delete this quiz');
    }

    // Remove associated questions and answers
    await Question.deleteMany({ quiz: quiz._id });
    await Quiz.findByIdAndDelete(quiz._id);

    return { message: 'Quiz deleted successfully' };
  }

  static async addQuestionToQuiz(teacherId: string, quizId: string, payload: any) {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw ApiError.notFound('Quiz not found');
    }

    const currentCount = await Question.countDocuments({ quiz: quizId });

    const question = await Question.create({
      quiz: quizId,
      questionText: payload.questionText,
      questionType: payload.questionType,
      options: payload.options || [],
      assertion: payload.assertion,
      reason: payload.reason,
      caseScenarioText: payload.caseScenarioText,
      correctAnswers: payload.correctAnswers,
      numericalTolerance: payload.numericalTolerance || 0,
      marks: payload.marks || 1,
      negativeMarks: payload.negativeMarks || 0,
      explanation: payload.explanation,
      chapterOrUnit: payload.chapterOrUnit || 1,
      orderIndex: currentCount + 1,
    });

    // Update quiz totalMarks automatically
    const allQuestions = await Question.find({ quiz: quizId });
    const totalMarks = allQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
    quiz.totalMarks = totalMarks;
    await quiz.save();

    return question;
  }

  static async importQuestionsFromBank(
    teacherId: string,
    quizId: string,
    questionBankIds: string[]
  ) {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw ApiError.notFound('Quiz not found');
    }

    const bankItems = await QuestionBank.find({
      _id: mongoose.trusted({ $in: questionBankIds }),
    });

    let currentCount = await Question.countDocuments({ quiz: quizId });
    const imported: any[] = [];

    for (const item of bankItems) {
      currentCount++;
      const q = await Question.create({
        quiz: quiz._id,
        questionText: item.questionText,
        questionType: item.questionType,
        options: item.options,
        assertion: item.assertion,
        reason: item.reason,
        caseScenarioText: item.caseScenarioText,
        correctAnswers: item.correctAnswers,
        numericalTolerance: item.numericalTolerance,
        marks: item.marks,
        negativeMarks: item.negativeMarks,
        explanation: item.explanation,
        chapterOrUnit: item.chapterOrUnits[0] || 1,
        orderIndex: currentCount,
      });
      imported.push(q);
    }

    // Recalculate quiz total marks
    const allQuestions = await Question.find({ quiz: quizId });
    quiz.totalMarks = allQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
    await quiz.save();

    return { importedCount: imported.length, questions: imported };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 2. REUSABLE QUESTION BANK
  // ═════════════════════════════════════════════════════════════════════

  static async getQuestionBank(subjectId: string, filters: any = {}) {
    const query: any = { subject: subjectId };

    if (filters.unit) {
      query.chapterOrUnits = Number(filters.unit);
    }
    if (filters.difficulty) {
      query.difficulty = filters.difficulty;
    }
    if (filters.bloomsTaxonomy) {
      query.bloomsTaxonomy = filters.bloomsTaxonomy;
    }
    if (filters.questionType) {
      query.questionType = filters.questionType;
    }
    if (filters.search) {
      query.questionText = { $regex: filters.search, $options: 'i' };
    }

    const items = await QuestionBank.find(query)
      .populate('teacher', 'name identifier')
      .sort({ createdAt: -1 })
      .lean();

    return items;
  }

  static async createQuestionBankItem(teacherId: string, payload: any) {
    const subject = await Subject.findById(payload.subjectId);
    if (!subject) {
      throw ApiError.notFound('Subject not found');
    }

    const item = await QuestionBank.create({
      subject: subject._id,
      department: subject.department,
      teacher: teacherId,
      questionText: payload.questionText,
      questionType: payload.questionType,
      options: payload.options || [],
      assertion: payload.assertion,
      reason: payload.reason,
      caseScenarioText: payload.caseScenarioText,
      correctAnswers: payload.correctAnswers,
      numericalTolerance: payload.numericalTolerance || 0,
      marks: payload.marks || 1,
      negativeMarks: payload.negativeMarks || 0,
      explanation: payload.explanation,
      chapterOrUnits: payload.chapterOrUnits || [1],
      difficulty: payload.difficulty || DifficultyLevel.MEDIUM,
      bloomsTaxonomy: payload.bloomsTaxonomy || BloomsTaxonomy.UNDERSTAND,
      tags: payload.tags || [],
    });

    return item;
  }

  static async updateQuestionBankItem(
    teacherId: string,
    itemId: string,
    payload: any
  ) {
    const item = await QuestionBank.findById(itemId);
    if (!item) {
      throw ApiError.notFound('Question Bank item not found');
    }

    Object.assign(item, payload);
    await item.save();

    return item;
  }

  static async duplicateQuestionBankItem(teacherId: string, itemId: string) {
    const original = await QuestionBank.findById(itemId).lean();
    if (!original) {
      throw ApiError.notFound('Question Bank item not found');
    }

    const { _id, createdAt, updatedAt, ...rest } = original as any;
    const duplicated = await QuestionBank.create({
      ...rest,
      teacher: teacherId,
      questionText: `${rest.questionText} (Copy)`,
    });

    return duplicated;
  }

  static async deleteQuestionBankItem(teacherId: string, itemId: string) {
    const item = await QuestionBank.findById(itemId);
    if (!item) {
      throw ApiError.notFound('Question Bank item not found');
    }

    await QuestionBank.findByIdAndDelete(itemId);
    return { message: 'Question removed from Question Bank' };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 3. AI QUIZ GENERATION
  // ═════════════════════════════════════════════════════════════════════

  static async generateAIQuizQuestions(teacherId: string, payload: any) {
    return AiQuizService.generateQuestions(teacherId, payload);
  }

  static async regenerateSingleAIQuestion(teacherId: string, payload: any) {
    return AiQuizService.regenerateSingleQuestion(teacherId, payload);
  }

  private static buildDomainAIQuestion(
    subject: any,
    unit: any,
    topic: string,
    qType: QuestionType,
    difficulty: DifficultyLevel,
    index: number
  ) {
    const marks = qType === QuestionType.SHORT_ANSWER || qType === QuestionType.CASE_SCENARIO ? 2 : 1;
    const diffTag = difficulty === DifficultyLevel.HARD ? 'Advanced' : difficulty === DifficultyLevel.EASY ? 'Foundational' : 'Standard';

    switch (qType) {
      case QuestionType.MCQ:
        return {
          questionText: `[${subject.subjectCode} Unit ${unit.unitNumber}] Which of the following statements is correct regarding ${topic}?`,
          questionType: QuestionType.MCQ,
          options: [
            { id: 'opt_a', text: `It guarantees deterministic state transitions and optimized throughput for ${topic}.` },
            { id: 'opt_b', text: `It bypasses hardware interrupt handlers and increases bus latency.` },
            { id: 'opt_c', text: `It is strictly forbidden under regulation IEEE 802.3 specifications.` },
            { id: 'opt_d', text: `It requires continuous manual synchronization on each clock cycle.` },
          ],
          correctAnswers: 'opt_a',
          marks,
          negativeMarks: 0.25,
          explanation: `In ${subject.subjectName}, ${topic} ensures deterministic state execution with minimal latency overhead.`,
          chapterOrUnit: unit.unitNumber,
        };

      case QuestionType.FILL_IN_THE_BLANK:
        return {
          questionText: `In ${subject.subjectName}, the primary mechanism used for managing ${topic} is known as ______ protocol.`,
          questionType: QuestionType.FILL_IN_THE_BLANK,
          options: [],
          correctAnswers: 'standard',
          marks,
          negativeMarks: 0,
          explanation: `The standard protocol is the foundational implementation specified in Unit ${unit.unitNumber}.`,
          chapterOrUnit: unit.unitNumber,
        };

      case QuestionType.NUMERICAL:
        return {
          questionText: `Calculate the effective efficiency percentage of a ${topic} system when input power is 250W and useful output is 210W.`,
          questionType: QuestionType.NUMERICAL,
          options: [],
          correctAnswers: 84.0,
          numericalTolerance: 0.5,
          marks: 2,
          negativeMarks: 0,
          explanation: `Efficiency = (Output / Input) * 100 = (210 / 250) * 100 = 84.0%.`,
          chapterOrUnit: unit.unitNumber,
        };

      case QuestionType.MULTIPLE_CORRECT:
        return {
          questionText: `Select ALL valid design principles applicable to ${topic} in ${subject.subjectName}:`,
          questionType: QuestionType.MULTIPLE_CORRECT,
          options: [
            { id: 'opt_1', text: `High modularity and separation of concerns` },
            { id: 'opt_2', text: `Deterministic fault containment` },
            { id: 'opt_3', text: `Arbitrary memory allocation without boundary validation` },
            { id: 'opt_4', text: `Robust logging and exception audit trails` },
          ],
          correctAnswers: ['opt_1', 'opt_2', 'opt_4'],
          marks: 2,
          negativeMarks: 0.5,
          explanation: `Options 1, 2, and 4 represent fundamental best practices for ${topic}. Arbitrary unvalidated allocation is a critical vulnerability.`,
          chapterOrUnit: unit.unitNumber,
        };

      case QuestionType.ASSERTION_REASON:
        return {
          questionText: `Assertion & Reason evaluation for ${topic}:`,
          questionType: QuestionType.ASSERTION_REASON,
          assertion: `Implementing ${topic} minimizes total algorithmic complexity and optimizes memory footprint.`,
          reason: `It utilizes an indexed lookup cache that reduces recursive stack depth.`,
          options: [
            { id: 'ar_1', text: `Both Assertion and Reason are true, and Reason is the correct explanation of Assertion.` },
            { id: 'ar_2', text: `Both Assertion and Reason are true, but Reason is NOT the correct explanation.` },
            { id: 'ar_3', text: `Assertion is true, but Reason is false.` },
            { id: 'ar_4', text: `Assertion is false, but Reason is true.` },
          ],
          correctAnswers: 'ar_1',
          marks: 1.5,
          negativeMarks: 0.25,
          explanation: `Indexed caching directly reduces recursive execution overhead, validating both statements.`,
          chapterOrUnit: unit.unitNumber,
        };

      case QuestionType.MATCH_FOLLOWING:
        return {
          questionText: `Match the components of ${topic} with their corresponding functional characteristics:`,
          questionType: QuestionType.MATCH_FOLLOWING,
          options: [
            { id: 'left_1', text: `Stage 1: Ingestion`, matchedTo: `Buffers raw sensory telemetry` },
            { id: 'left_2', text: `Stage 2: Transformation`, matchedTo: `Normalizes schema attributes` },
            { id: 'left_3', text: `Stage 3: Verification`, matchedTo: `Executes checksum invariants` },
            { id: 'left_4', text: `Stage 4: Persistence`, matchedTo: `Writes to immutable transaction log` },
          ],
          correctAnswers: {
            left_1: 'Buffers raw sensory telemetry',
            left_2: 'Normalizes schema attributes',
            left_3: 'Executes checksum invariants',
            left_4: 'Writes to immutable transaction log',
          },
          marks: 2,
          negativeMarks: 0,
          explanation: `Each stage corresponds to the standard curriculum lifecycle taught in ${unit.title}.`,
          chapterOrUnit: unit.unitNumber,
        };

      case QuestionType.CASE_SCENARIO:
        return {
          questionText: `Analyze the engineering scenario provided and determine the optimal remediation strategy.`,
          questionType: QuestionType.CASE_SCENARIO,
          caseScenarioText: `A distributed industrial monitoring system running ${topic} experiences intermittent heartbeat dropouts during peak load of 15,000 IOPS. Diagnostics indicate thread pool saturation and buffer overflow on the ingestion gateway.`,
          options: [
            { id: 'cs_1', text: `Implement backpressure queueing and scale non-blocking worker threads.` },
            { id: 'cs_2', text: `Disable input telemetry validation to reduce CPU usage.` },
            { id: 'cs_3', text: `Increase hardware clock speed without modifying thread pools.` },
            { id: 'cs_4', text: `Reroute traffic directly to synchronous persistent storage.` },
          ],
          correctAnswers: 'cs_1',
          marks: 2,
          negativeMarks: 0.5,
          explanation: `Backpressure with non-blocking workers addresses buffer overflow and thread saturation safely.`,
          chapterOrUnit: unit.unitNumber,
        };

      case QuestionType.SHORT_ANSWER:
      default:
        return {
          questionText: `Explain the fundamental role of ${topic} in modern engineering systems and describe two real-world failure modes.`,
          questionType: QuestionType.SHORT_ANSWER,
          options: [],
          correctAnswers: 'Requires teacher subjective review against syllabus rubric.',
          marks: 3,
          negativeMarks: 0,
          explanation: `Rubric: 1 mark for clear definition of ${topic}, 2 marks for valid failure mode descriptions.`,
          chapterOrUnit: unit.unitNumber,
        };
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // 4. STUDENT ASSESSMENT ENGINE (TAKE QUIZ, AUTOSAVE, SUBMIT)
  // ═════════════════════════════════════════════════════════════════════

  static async startQuizAttempt(studentId: string, quizId: string) {
    const quiz = await Quiz.findById(quizId).populate('subject');
    if (!quiz) {
      throw ApiError.notFound('Quiz not found');
    }

    if (quiz.status !== QuizStatus.PUBLISHED) {
      throw ApiError.badRequest('This quiz is not currently open for attempts');
    }

    // Check date window if configured
    const now = new Date();
    if (quiz.startTime && now < quiz.startTime) {
      throw ApiError.badRequest(
        `This quiz will open on ${quiz.startTime.toLocaleString()}`
      );
    }
    if (quiz.endTime && now > quiz.endTime) {
      throw ApiError.badRequest(
        `This quiz closed on ${quiz.endTime.toLocaleString()}`
      );
    }

    // Check user role for privileged preview bypass
    const user = await User.findById(studentId);
    const isPrivileged = !!(
      user && ['TEACHER', 'HOD', 'ADMIN', 'PRINCIPAL'].includes(user.role)
    );

    // Verify student enrollment in subject for regular students
    if (!isPrivileged) {
      const subjectId = (quiz.subject as any)?._id || quiz.subject;
      const enrollment = await StudentEnrollment.findOne({
        student: studentId,
        status: 'APPROVED',
        enrolledSubjects: mongoose.trusted({ $in: [subjectId] }),
      });
      if (!enrollment) {
        throw ApiError.forbidden(
          'You are not enrolled in the subject for this quiz'
        );
      }
    }

    // Load and sanitize questions
    const rawQuestions = await Question.find({ quiz: quiz._id })
      .sort({ orderIndex: 1 })
      .lean();

    let processedQuestions = rawQuestions.map((q) => {
      let options = q.options;
      if (quiz.randomizeOptions && options && options.length > 0) {
        options = [...options].sort(() => Math.random() - 0.5);
      }

      // STRICT SECURITY: Remove correct answer, numerical tolerance, explanation
      const {
        correctAnswers,
        explanation,
        numericalTolerance,
        ...studentSafe
      } = q;

      return {
        ...studentSafe,
        options,
      };
    });

    if (quiz.randomizeQuestions) {
      processedQuestions = [...processedQuestions].sort(() => Math.random() - 0.5);
    }

    // Check for existing IN_PROGRESS attempt (Session Recovery!)
    let attempt = await QuizAttempt.findOne({
      quiz: quiz._id,
      student: studentId,
      status: QuizAttemptStatus.IN_PROGRESS,
    });

    if (!attempt) {
      // Check attempt count
      const allAttempts = await QuizAttempt.find({
        quiz: quiz._id,
        student: studentId,
      }).sort({ createdAt: -1 });

      const completedCount = allAttempts.filter(
        (a) =>
          a.status === QuizAttemptStatus.SUBMITTED ||
          a.status === QuizAttemptStatus.GRADED
      ).length;

      const hasReachedLimit =
        (!quiz.allowMultipleAttempts && completedCount >= 1) ||
        (quiz.allowMultipleAttempts && completedCount >= quiz.maxAttempts);

      if (!isPrivileged && hasReachedLimit) {
        const latestCompleted = allAttempts.find(
          (a) =>
            a.status === QuizAttemptStatus.SUBMITTED ||
            a.status === QuizAttemptStatus.GRADED
        );

        let review = null;
        if (latestCompleted) {
          try {
            review = await this.getQuizAttemptReview(
              studentId,
              latestCompleted._id.toString()
            );
          } catch {
            // ignore review loading error
          }
        }

        return {
          isCompleted: true,
          completedAttempt: latestCompleted,
          review,
          attempt: latestCompleted
            ? {
                _id: latestCompleted._id,
                attemptNumber: latestCompleted.attemptNumber,
                startedAt: latestCompleted.startedAt,
                submittedAt: latestCompleted.submittedAt,
                status: latestCompleted.status,
                totalScore: latestCompleted.totalScore,
                isGraded: latestCompleted.isGraded,
                timeSpentSeconds: latestCompleted.timeSpentSeconds || 0,
                fullscreenViolationsCount: latestCompleted.fullscreenViolationsCount || 0,
                tabSwitchCount: (latestCompleted as any).tabSwitchCount || 0,
              }
            : null,
          quiz: {
            _id: quiz._id,
            title: quiz.title,
            description: quiz.description,
            instructions: quiz.instructions,
            durationMinutes: quiz.durationMinutes,
            totalMarks: quiz.totalMarks,
            passingMarks: quiz.passingMarks,
            fullscreenRequired: quiz.fullscreenRequired,
            maxWarnings: quiz.maxWarnings ?? 3,
            tabSwitchDetection: quiz.tabSwitchDetection ?? true,
            autoSubmitOnMaxViolations: quiz.autoSubmitOnMaxViolations ?? true,
            blockCopyPaste: quiz.blockCopyPaste ?? true,
            navigationRule: quiz.navigationRule,
            curriculumUnits: quiz.curriculumUnits,
            totalQuestions: processedQuestions.length,
            showResultImmediately: quiz.showResultImmediately,
            showAnswersAfterSubmission: quiz.showAnswersAfterSubmission,
          },
          questions: processedQuestions,
          timeRemainingSeconds: 0,
          message: !quiz.allowMultipleAttempts
            ? 'You have already attempted this quiz (single attempt only)'
            : `You have reached the maximum allowed attempts (${quiz.maxAttempts})`,
          canRetake:
            isPrivileged ||
            (quiz.allowMultipleAttempts && completedCount < (quiz.maxAttempts || 1)),
          maxAttempts: quiz.maxAttempts || 1,
          completedAttemptsCount: completedCount,
          remainingAttempts: Math.max(0, (quiz.maxAttempts || 1) - completedCount),
        };
      }

      attempt = await QuizAttempt.create({
        quiz: quiz._id,
        student: studentId,
        attemptNumber: completedCount + 1,
        startedAt: new Date(),
        status: QuizAttemptStatus.IN_PROGRESS,
        totalScore: 0,
        isGraded: false,
        fullscreenViolationsCount: 0,
        securityLogs: [],
        answersDraft: {},
      });
    }

    const durationMins = quiz.durationMinutes || 30;
    const timeSpent = attempt.timeSpentSeconds || 0;
    const timeRemainingSeconds = Math.max(0, durationMins * 60 - timeSpent);
    const totalAllowed = quiz.maxAttempts || 1;
    const canRetakeMore =
      isPrivileged ||
      (quiz.allowMultipleAttempts && (attempt.attemptNumber || 1) < totalAllowed);

    return {
      attempt: {
        _id: attempt._id,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        durationMinutes: durationMins,
        fullscreenRequired: quiz.fullscreenRequired,
        navigationRule: quiz.navigationRule,
        answersDraft: attempt.answersDraft || {},
        timeSpentSeconds: timeSpent,
        fullscreenViolationsCount: attempt.fullscreenViolationsCount || 0,
        tabSwitchCount: (attempt as any).tabSwitchCount || 0,
      },
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        instructions: quiz.instructions,
        durationMinutes: durationMins,
        totalMarks: quiz.totalMarks,
        passingMarks: quiz.passingMarks,
        fullscreenRequired: quiz.fullscreenRequired,
        maxWarnings: quiz.maxWarnings ?? 3,
        tabSwitchDetection: quiz.tabSwitchDetection ?? true,
        autoSubmitOnMaxViolations: quiz.autoSubmitOnMaxViolations ?? true,
        blockCopyPaste: quiz.blockCopyPaste ?? true,
        allowMultipleAttempts: quiz.allowMultipleAttempts,
        maxAttempts: totalAllowed,
        navigationRule: quiz.navigationRule,
        curriculumUnits: quiz.curriculumUnits,
        totalQuestions: processedQuestions.length,
        showResultImmediately: quiz.showResultImmediately,
        showAnswersAfterSubmission: quiz.showAnswersAfterSubmission,
      },
      questions: processedQuestions,
      timeRemainingSeconds,
      canRetake: canRetakeMore,
      maxAttempts: totalAllowed,
      completedAttemptsCount: (attempt.attemptNumber || 1) - 1,
      remainingAttempts: Math.max(0, totalAllowed - (attempt.attemptNumber || 1)),
    };
  }

  static async retakeQuizAttempt(studentId: string, quizId: string) {
    const quiz = await Quiz.findById(quizId).populate('subject');
    if (!quiz) {
      throw ApiError.notFound('Quiz not found');
    }

    if (quiz.status !== QuizStatus.PUBLISHED) {
      throw ApiError.badRequest('This quiz is not currently open for attempts');
    }

    const user = await User.findById(studentId);
    const isPrivileged = !!(
      user && ['TEACHER', 'HOD', 'ADMIN', 'PRINCIPAL'].includes(user.role)
    );

    if (!isPrivileged) {
      const subjectId = (quiz.subject as any)?._id || quiz.subject;
      const enrollment = await StudentEnrollment.findOne({
        student: studentId,
        status: 'APPROVED',
        enrolledSubjects: mongoose.trusted({ $in: [subjectId] }),
      });
      if (!enrollment) {
        throw ApiError.forbidden(
          'You are not enrolled in the subject for this quiz'
        );
      }

      if (!quiz.allowMultipleAttempts) {
        throw ApiError.badRequest(
          'Retakes are not permitted for this assessment (single attempt only).'
        );
      }

      const completedCount = await QuizAttempt.countDocuments({
        quiz: quiz._id,
        student: studentId,
        status: {
          $in: [
            QuizAttemptStatus.SUBMITTED,
            QuizAttemptStatus.GRADED,
            QuizAttemptStatus.TIMED_OUT,
          ],
        },
      });

      if (completedCount >= (quiz.maxAttempts || 1)) {
        throw ApiError.badRequest(
          `You have reached the maximum allowed attempts (${quiz.maxAttempts || 1}) for this assessment.`
        );
      }
    }

    // Mark any existing in-progress attempts as abandoned
    await QuizAttempt.updateMany(
      {
        quiz: quiz._id,
        student: studentId,
        status: QuizAttemptStatus.IN_PROGRESS,
      },
      {
        $set: {
          status: QuizAttemptStatus.ABANDONED,
        },
      }
    );

    // Load and sanitize questions
    const rawQuestions = await Question.find({ quiz: quiz._id })
      .sort({ orderIndex: 1 })
      .lean();

    let processedQuestions = rawQuestions.map((q) => {
      let options = q.options;
      if (quiz.randomizeOptions && options && options.length > 0) {
        options = [...options].sort(() => Math.random() - 0.5);
      }

      const {
        correctAnswers,
        explanation,
        numericalTolerance,
        ...studentSafe
      } = q;

      return {
        ...studentSafe,
        options,
      };
    });

    if (quiz.randomizeQuestions) {
      processedQuestions = [...processedQuestions].sort(() => Math.random() - 0.5);
    }

    const previousCount = await QuizAttempt.countDocuments({
      quiz: quiz._id,
      student: studentId,
    });

    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: studentId,
      attemptNumber: previousCount + 1,
      startedAt: new Date(),
      status: QuizAttemptStatus.IN_PROGRESS,
      totalScore: 0,
      isGraded: false,
      fullscreenViolationsCount: 0,
      securityLogs: [],
      answersDraft: {},
    });

    const durationMins = quiz.durationMinutes || 30;
    const timeRemainingSeconds = durationMins * 60;
    const totalAllowed = quiz.maxAttempts || 1;
    const currentAttemptNum = previousCount + 1;
    const canRetakeMore =
      isPrivileged ||
      (quiz.allowMultipleAttempts && currentAttemptNum < totalAllowed);

    return {
      attempt: {
        _id: attempt._id,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        durationMinutes: durationMins,
        fullscreenRequired: quiz.fullscreenRequired,
        navigationRule: quiz.navigationRule,
        answersDraft: {},
        timeSpentSeconds: 0,
        fullscreenViolationsCount: 0,
        tabSwitchCount: 0,
      },
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        instructions: quiz.instructions,
        durationMinutes: durationMins,
        totalMarks: quiz.totalMarks,
        passingMarks: quiz.passingMarks,
        fullscreenRequired: quiz.fullscreenRequired,
        maxWarnings: quiz.maxWarnings ?? 3,
        tabSwitchDetection: quiz.tabSwitchDetection ?? true,
        autoSubmitOnMaxViolations: quiz.autoSubmitOnMaxViolations ?? true,
        blockCopyPaste: quiz.blockCopyPaste ?? true,
        allowMultipleAttempts: quiz.allowMultipleAttempts,
        maxAttempts: totalAllowed,
        navigationRule: quiz.navigationRule,
        curriculumUnits: quiz.curriculumUnits,
        totalQuestions: processedQuestions.length,
        showResultImmediately: quiz.showResultImmediately,
        showAnswersAfterSubmission: quiz.showAnswersAfterSubmission,
      },
      questions: processedQuestions,
      timeRemainingSeconds,
      canRetake: canRetakeMore,
      maxAttempts: totalAllowed,
      completedAttemptsCount: previousCount,
      remainingAttempts: Math.max(0, totalAllowed - currentAttemptNum),
    };
  }

  static async saveAttemptDraft(
    studentId: string,
    attemptId: string,
    payload: any
  ) {
    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      student: studentId,
      status: QuizAttemptStatus.IN_PROGRESS,
    });

    if (!attempt) {
      throw ApiError.badRequest('No active quiz attempt found to autosave');
    }

    attempt.answersDraft = payload.answersDraft || attempt.answersDraft;
    if (payload.timeSpentSeconds !== undefined) {
      attempt.timeSpentSeconds = payload.timeSpentSeconds;
    }
    await attempt.save();

    return { success: true, savedAt: new Date() };
  }

  static async recordSecurityViolation(
    studentId: string,
    attemptId: string,
    payload: any
  ) {
    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      student: studentId,
      status: QuizAttemptStatus.IN_PROGRESS,
    });

    if (!attempt) {
      return { success: false, fullscreenViolationsCount: 0, tabSwitchCount: 0, totalViolations: 0, autoSubmitted: false };
    }

    // Classify event types:
    // VIOLATION events increment counters and may trigger auto-submit
    // INFORMATIONAL events are logged but don't count as violations
    const INFORMATIONAL_EVENTS = [
      'ASSESSMENT_STARTED',
      'FULLSCREEN_ENTERED',
      'RECONNECT',
      'SUBMISSION',
      'TIMEOUT',
    ];

    const isViolation = !INFORMATIONAL_EVENTS.includes(payload.eventType);

    // Increment appropriate violation counter only for violation events
    if (isViolation) {
      if (payload.eventType === 'FULLSCREEN_EXIT') {
        attempt.fullscreenViolationsCount =
          (attempt.fullscreenViolationsCount || 0) + 1;
      } else if (
        payload.eventType === 'TAB_SWITCH' ||
        payload.eventType === 'VISIBILITY_HIDDEN' ||
        payload.eventType === 'DISCONNECT'
      ) {
        attempt.tabSwitchCount = (attempt.tabSwitchCount || 0) + 1;
      }
    }

    // Always log the event in the security audit trail
    attempt.securityLogs.push({
      eventType: payload.eventType,
      timestamp: new Date(),
      details: payload.details,
    });

    // Check if total violations exceed the quiz's maxWarnings (only for violation events)
    const quiz = await Quiz.findById(attempt.quiz);
    const maxWarnings = quiz?.maxWarnings ?? 3;
    const totalViolations =
      (attempt.fullscreenViolationsCount || 0) +
      (attempt.tabSwitchCount || 0);

    let wasAutoSubmitted = false;

    if (
      isViolation &&
      quiz?.autoSubmitOnMaxViolations &&
      totalViolations >= maxWarnings
    ) {
      // Auto-submit the attempt as a violation penalty
      attempt.status = QuizAttemptStatus.SUBMITTED;
      attempt.submittedAt = new Date();
      attempt.autoSubmitted = true;
      attempt.autoSubmitReason = `Auto-submitted: ${totalViolations} security violations exceeded limit of ${maxWarnings}`;
      wasAutoSubmitted = true;

      logger.warn(
        `Quiz attempt ${attemptId} auto-submitted due to ${totalViolations} security violations (limit: ${maxWarnings})`
      );
    }

    await attempt.save();

    return {
      success: true,
      fullscreenViolationsCount: attempt.fullscreenViolationsCount,
      tabSwitchCount: attempt.tabSwitchCount || 0,
      totalViolations,
      maxWarnings,
      autoSubmitted: wasAutoSubmitted,
    };
  }

  static async submitQuizAttempt(
    studentId: string,
    attemptId: string,
    payload: any
  ) {
    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      student: studentId,
      status: QuizAttemptStatus.IN_PROGRESS,
    });

    if (!attempt) {
      throw ApiError.badRequest(
        'Attempt is already submitted, timed out, or not found'
      );
    }

    const quiz = await Quiz.findById(attempt.quiz);
    if (!quiz) {
      throw ApiError.notFound('Quiz not found');
    }

    const questions = await Question.find({ quiz: quiz._id });
    const studentAnswers = payload.answers || {};

    let totalScore = 0;
    let hasSubjective = false;

    // Evaluate each question
    for (const q of questions) {
      const sAns = studentAnswers[q._id.toString()];
      const { isCorrect, marksAwarded, isSubjective } = this.evaluateAnswer(
        q,
        sAns,
        quiz.negativeMarkingEnabled,
        quiz.negativeMarksPerQuestion
      );

      if (isSubjective) {
        hasSubjective = true;
      } else {
        totalScore += marksAwarded;
      }

      // Upsert QuizAnswer
      await QuizAnswer.findOneAndUpdate(
        { attempt: attempt._id, question: q._id },
        {
          student: studentId,
          studentAnswer: sAns !== undefined ? sAns : null,
          isCorrect,
          marksAwarded,
        },
        { upsert: true, new: true }
      );
    }

    // Ensure total score does not drop below 0
    totalScore = Math.max(0, Math.round(totalScore * 100) / 100);

    attempt.status = QuizAttemptStatus.SUBMITTED;
    attempt.submittedAt = new Date();
    attempt.timeSpentSeconds = payload.timeSpentSeconds || attempt.timeSpentSeconds;
    attempt.totalScore = totalScore;
    attempt.isGraded = !hasSubjective;
    await attempt.save();

    // Create QuizResult
    const percentage =
      quiz.totalMarks > 0
        ? Math.round((totalScore / quiz.totalMarks) * 10000) / 100
        : 0;
    const passed = totalScore >= quiz.passingMarks;

    const result = await QuizResult.findOneAndUpdate(
      { attempt: attempt._id },
      {
        quiz: quiz._id,
        attempt: attempt._id,
        student: studentId,
        score: totalScore,
        totalMarks: quiz.totalMarks,
        percentage,
        passed,
        generatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    await AuditLog.create({
      userId: studentId,
      action: AuditAction.QUIZ_SUBMIT,
      entityType: 'QuizAttempt',
      entityId: attempt._id,
      description: `Submitted attempt ${attempt.attemptNumber} for quiz "${quiz.title}" (Score: ${totalScore}/${quiz.totalMarks})`,
    });

    // Notify teacher of quiz completion
    try {
      const student = await User.findById(studentId).select('name identifier');
      await NotificationService.create({
        recipient: quiz.teacher,
        sender: studentId,
        type: NotificationType.QUIZ_COMPLETED,
        title: `Quiz Completed: ${quiz.title}`,
        message: `${student?.name || 'A student'} (${student?.identifier || 'Student'}) completed attempt ${attempt.attemptNumber} on "${quiz.title}" with score ${totalScore}/${quiz.totalMarks} (${percentage}%).`,
        metadata: {
          quizId: String(quiz._id),
          attemptId: String(attempt._id),
          studentId: String(studentId),
          totalScore,
          totalMarks: quiz.totalMarks,
          percentage,
          passed,
        },
        link: `/dashboard`,
      });
    } catch (notifErr) {
      // Non-blocking
    }

    // If result is shown immediately, notify student
    if (quiz.showResultImmediately) {
      try {
        await NotificationService.create({
          recipient: studentId,
          sender: quiz.teacher,
          type: NotificationType.RESULT_PUBLISHED,
          title: `Quiz Result: ${quiz.title}`,
          message: `Your score for "${quiz.title}" is ${totalScore}/${quiz.totalMarks} (${percentage}%) - ${passed ? 'Passed' : 'Needs Improvement'}.`,
          metadata: {
            quizId: String(quiz._id),
            attemptId: String(attempt._id),
            score: totalScore,
            totalMarks: quiz.totalMarks,
            percentage,
            passed,
          },
          link: `/student/subject/${quiz.subject}`,
        });
      } catch (notifErr) {
        // Non-blocking
      }
    }


    return {
      attemptId: attempt._id,
      status: attempt.status,
      totalScore: quiz.showResultImmediately ? totalScore : null,
      totalMarks: quiz.totalMarks,
      percentage: quiz.showResultImmediately ? percentage : null,
      passed: quiz.showResultImmediately ? passed : null,
      isFullyGraded: !hasSubjective,
      showAnswersAfterSubmission: quiz.showAnswersAfterSubmission,
      showResultImmediately: quiz.showResultImmediately,
      timeSpentSeconds: attempt.timeSpentSeconds,
    };
  }

  // Auto-grading algorithm
  private static evaluateAnswer(
    question: IQuestion,
    studentAnswer: any,
    negativeMarkingEnabled: boolean,
    negativePenalty: number
  ): { isCorrect: boolean | null; marksAwarded: number; isSubjective: boolean } {
    if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') {
      return { isCorrect: false, marksAwarded: 0, isSubjective: false };
    }

    const maxMarks = question.marks || 1;
    const penalty = negativeMarkingEnabled
      ? question.negativeMarks || negativePenalty || 0
      : 0;

    switch (question.questionType) {
      case QuestionType.MCQ:
      case QuestionType.ASSERTION_REASON:
      case QuestionType.CASE_SCENARIO: {
        const correct =
          String(studentAnswer).trim() === String(question.correctAnswers).trim();
        return {
          isCorrect: correct,
          marksAwarded: correct ? maxMarks : -penalty,
          isSubjective: false,
        };
      }

      case QuestionType.FILL_IN_THE_BLANK: {
        const sTrim = String(studentAnswer).trim().toLowerCase();
        let correct = false;
        if (Array.isArray(question.correctAnswers)) {
          correct = question.correctAnswers.some(
            (ans) => String(ans).trim().toLowerCase() === sTrim
          );
        } else {
          correct = String(question.correctAnswers).trim().toLowerCase() === sTrim;
        }
        return {
          isCorrect: correct,
          marksAwarded: correct ? maxMarks : -penalty,
          isSubjective: false,
        };
      }

      case QuestionType.NUMERICAL: {
        const sNum = Number(studentAnswer);
        const cNum = Number(question.correctAnswers);
        const tol = question.numericalTolerance || 0;
        if (isNaN(sNum) || isNaN(cNum)) {
          return { isCorrect: false, marksAwarded: -penalty, isSubjective: false };
        }
        const correct = Math.abs(sNum - cNum) <= tol;
        return {
          isCorrect: correct,
          marksAwarded: correct ? maxMarks : -penalty,
          isSubjective: false,
        };
      }

      case QuestionType.MULTIPLE_CORRECT: {
        if (!Array.isArray(studentAnswer) || !Array.isArray(question.correctAnswers)) {
          return { isCorrect: false, marksAwarded: -penalty, isSubjective: false };
        }
        const sortedStudent = [...studentAnswer].map(String).sort();
        const sortedCorrect = [...question.correctAnswers].map(String).sort();
        const isExact =
          sortedStudent.length === sortedCorrect.length &&
          sortedStudent.every((val, idx) => val === sortedCorrect[idx]);

        return {
          isCorrect: isExact,
          marksAwarded: isExact ? maxMarks : -penalty,
          isSubjective: false,
        };
      }

      case QuestionType.MATCH_FOLLOWING: {
        if (typeof studentAnswer !== 'object' || typeof question.correctAnswers !== 'object') {
          return { isCorrect: false, marksAwarded: 0, isSubjective: false };
        }
        const correctPairs: Record<string, string> = question.correctAnswers as any;
        const keys = Object.keys(correctPairs);
        let matches = 0;
        for (const k of keys) {
          if (
            studentAnswer[k] &&
            String(studentAnswer[k]).trim() === String(correctPairs[k]).trim()
          ) {
            matches++;
          }
        }
        const isAllCorrect = matches === keys.length;
        const partialMarks = keys.length > 0 ? (matches / keys.length) * maxMarks : 0;
        return {
          isCorrect: isAllCorrect,
          marksAwarded: isAllCorrect ? maxMarks : partialMarks,
          isSubjective: false,
        };
      }

      case QuestionType.SHORT_ANSWER:
      default:
        // Subjective question requiring teacher grading
        return {
          isCorrect: null,
          marksAwarded: 0,
          isSubjective: true,
        };
    }
  }

  static async getQuizAttemptReview(studentId: string, attemptId: string) {
    const attempt = await QuizAttempt.findById(attemptId)
      .populate('quiz')
      .lean();

    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    const user = await User.findById(studentId);
    const isPrivileged = !!(
      user && ['TEACHER', 'HOD', 'ADMIN', 'PRINCIPAL'].includes(user.role)
    );

    if (!isPrivileged && attempt.student.toString() !== studentId) {
      throw ApiError.forbidden('You can only review your own quiz attempts');
    }

    const quiz = attempt.quiz as any;
    const questions = await Question.find({ quiz: quiz._id })
      .sort({ orderIndex: 1 })
      .lean();

    const answers = await QuizAnswer.find({ attempt: attempt._id }).lean();
    const answerMap = new Map<string, any>(
      answers.map((a) => [a.question.toString(), a])
    );

    const questionsWithAnswers = questions.map((q) => {
      const ans = answerMap.get(q._id.toString());
      if (!quiz.showAnswersAfterSubmission) {
        const { correctAnswers, explanation, ...safeQ } = q;
        return {
          ...safeQ,
          myAnswer: ans ? ans.studentAnswer : null,
          isCorrect: ans ? ans.isCorrect : null,
          marksAwarded: ans ? ans.marksAwarded : 0,
          teacherFeedback: ans ? ans.teacherFeedback : null,
        };
      }

      return {
        ...q,
        myAnswer: ans ? ans.studentAnswer : null,
        isCorrect: ans ? ans.isCorrect : null,
        marksAwarded: ans ? ans.marksAwarded : 0,
        teacherFeedback: ans ? ans.teacherFeedback : null,
      };
    });

    return {
      attempt: {
        _id: attempt._id,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        status: attempt.status,
        totalScore: attempt.totalScore,
        isGraded: attempt.isGraded,
        timeSpentSeconds: attempt.timeSpentSeconds,
        fullscreenViolationsCount: attempt.fullscreenViolationsCount,
        answers: answers.map((a) => ({
          questionId: a.question.toString(),
          studentAnswer: a.studentAnswer,
          isCorrect: a.isCorrect,
          marksAwarded: a.marksAwarded,
          teacherFeedback: a.teacherFeedback,
        })),
      },
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        totalMarks: quiz.totalMarks,
        passingMarks: quiz.passingMarks,
        showAnswersAfterSubmission: quiz.showAnswersAfterSubmission,
      },
      questions: questionsWithAnswers,
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // 5. TEACHER ANALYTICS & MANUAL GRADING
  // ═════════════════════════════════════════════════════════════════════

  static async getQuizAnalytics(teacherId: string, quizId: string) {
    const quiz = await Quiz.findById(quizId)
      .populate('subject', 'subjectName subjectCode')
      .lean();

    if (!quiz) {
      throw ApiError.notFound('Quiz not found');
    }

    const attempts = await QuizAttempt.find({
      quiz: quizId,
      status: mongoose.trusted({
        $in: [QuizAttemptStatus.SUBMITTED, QuizAttemptStatus.TIMED_OUT],
      }),
    })
      .populate('student', 'name collegeEmail identifier')
      .sort({ totalScore: -1 })
      .lean();

    const questions = await Question.find({ quiz: quizId })
      .sort({ orderIndex: 1 })
      .lean();

    const totalAttempts = attempts.length;
    const scores = attempts.map((a) => a.totalScore);
    const avgScore =
      totalAttempts > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / totalAttempts) * 100) /
          100
        : 0;
    const highestScore = totalAttempts > 0 ? Math.max(...scores) : 0;
    const lowestScore = totalAttempts > 0 ? Math.min(...scores) : 0;

    // Question-wise statistics
    const questionStats = await Promise.all(
      questions.map(async (q) => {
        const answers = await QuizAnswer.find({ question: q._id }).lean();
        const correctCount = answers.filter((a) => a.isCorrect === true).length;
        const incorrectCount = answers.filter((a) => a.isCorrect === false).length;
        const pendingCount = answers.filter((a) => a.isCorrect === null).length;
        const totalAnswers = answers.length;
        const successRate =
          totalAnswers > 0
            ? Math.round((correctCount / totalAnswers) * 100)
            : 0;

        return {
          questionId: q._id,
          questionText: q.questionText,
          questionType: q.questionType,
          marks: q.marks,
          correctCount,
          incorrectCount,
          pendingCount,
          totalAnswers,
          successRate,
        };
      })
    );

    return {
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        totalMarks: quiz.totalMarks,
        passingMarks: quiz.passingMarks,
        durationMinutes: quiz.durationMinutes,
        subject: quiz.subject,
      },
      stats: {
        totalAttempts,
        averageScore: avgScore,
        highestScore,
        lowestScore,
      },
      questionStats,
      attempts: attempts.map((a) => ({
        attemptId: a._id,
        student: a.student,
        attemptNumber: a.attemptNumber,
        totalScore: a.totalScore,
        percentage:
          quiz.totalMarks > 0
            ? Math.round((a.totalScore / quiz.totalMarks) * 100)
            : 0,
        timeSpentSeconds: a.timeSpentSeconds,
        fullscreenViolationsCount: a.fullscreenViolationsCount,
        tabSwitchCount: (a as any).tabSwitchCount || 0,
        autoSubmitted: (a as any).autoSubmitted || false,
        autoSubmitReason: (a as any).autoSubmitReason || null,
        securityLogs: (a as any).securityLogs || [],
        isGraded: a.isGraded,
        submittedAt: a.submittedAt,
      })),
    };
  }

  static async gradeSubjectiveAnswer(
    teacherId: string,
    attemptId: string,
    payload: any
  ) {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      throw ApiError.notFound('Attempt not found');
    }

    const quiz = await Quiz.findById(attempt.quiz);
    if (!quiz) {
      throw ApiError.notFound('Quiz not found');
    }

    // Strict Teacher/HOD Authorization Check:
    const user = await User.findById(teacherId);
    if (!user) throw ApiError.unauthenticated('User not found');

    if (user.role === 'TEACHER') {
      if (user.approvalStatus !== 'APPROVED') {
        throw ApiError.forbidden('Teacher account is pending approval.');
      }
      const isAssigned = await TeacherAssignment.exists({
        teacher: teacherId,
        subject: quiz.subject,
        status: 'ACTIVE',
      });
      if (!isAssigned && String(quiz.teacher) !== String(teacherId)) {
        throw ApiError.forbidden('You are not authorized to grade this quiz.');
      }
    } else if (user.role === 'HOD') {
      if (!user.department || String(user.department) !== String(quiz.department)) {
        throw ApiError.forbidden('HOD cannot grade quizzes outside their assigned department.');
      }
    }

    const answer = await QuizAnswer.findOne({
      attempt: attemptId,
      question: payload.questionId,
    });

    if (!answer) {
      throw ApiError.notFound('Answer record not found');
    }

    answer.marksAwarded = payload.marksAwarded;
    answer.isCorrect = payload.marksAwarded > 0;
    answer.teacherFeedback = payload.teacherFeedback;
    await answer.save();

    // Recalculate attempt score
    const allAnswers = await QuizAnswer.find({ attempt: attemptId });
    const newTotalScore = allAnswers.reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
    const anyPending = allAnswers.some((a) => a.isCorrect === null);

    attempt.totalScore = Math.max(0, Math.round(newTotalScore * 100) / 100);
    attempt.isGraded = !anyPending;
    await attempt.save();

    // Update QuizResult
    if (quiz) {
      const percentage =
        quiz.totalMarks > 0
          ? Math.round((attempt.totalScore / quiz.totalMarks) * 10000) / 100
          : 0;
      const passed = attempt.totalScore >= quiz.passingMarks;

      await QuizResult.findOneAndUpdate(
        { attempt: attempt._id },
        {
          score: attempt.totalScore,
          percentage,
          passed,
        }
      );

      // Audit Log for sensitive marks modification action
      await AuditLog.create({
        user: teacherId,
        action: AuditAction.GRADING,
        entityType: 'QuizAnswer',
        entityId: answer._id,
        department: quiz.department,
        description: `Graded subjective answer for quiz "${quiz.title}" (Score: ${payload.marksAwarded})`,
      });

      // Notify student that subjective grading is complete and final result is published
      if (attempt.isGraded) {
        try {
          await NotificationService.create({
            recipient: attempt.student,
            sender: teacherId,
            type: NotificationType.RESULT_PUBLISHED,
            title: `Quiz Result: ${quiz.title}`,
            message: `Your answers for "${quiz.title}" have been graded. Final Score: ${attempt.totalScore}/${quiz.totalMarks}.`,
            metadata: {
              quizId: String(quiz._id),
              attemptId: String(attempt._id),
              totalScore: attempt.totalScore,
              totalMarks: quiz.totalMarks,
            },
            link: `/student/subject/${quiz.subject}`,
          });
        } catch (notifErr) {
          // Non-blocking
        }
      }
    }

    return {
      attemptId: attempt._id,
      totalScore: attempt.totalScore,
      isGraded: attempt.isGraded,
      answer,
    };
  }

  private static async notifyEnrolledStudentsOfQuiz(quiz: any, teacherId: string) {
    try {
      const enrollments = await StudentEnrollment.find({
        enrolledSubjects: quiz.subject,
        status: EnrollmentStatus.APPROVED,
      }).select('student');

      const subject = await Subject.findById(quiz.subject).select('subjectCode subjectName');
      const subCode = subject?.subjectCode || 'Course';

      const notifs = enrollments.map((enr) => ({
        recipient: enr.student,
        sender: teacherId,
        type: NotificationType.QUIZ_PUBLISHED,
        title: `New Quiz Published: ${quiz.title}`,
        message: `A new quiz "${quiz.title}" has been published for ${subCode} (${quiz.durationMinutes} mins, ${quiz.totalMarks} marks).`,
        metadata: {
          quizId: String(quiz._id),
          subjectId: String(quiz.subject),
          durationMinutes: quiz.durationMinutes,
          totalMarks: quiz.totalMarks,
        },
        link: `/student/subject/${quiz.subject}`,
      }));

      await NotificationService.createBulk(notifs);
    } catch (err) {
      // Non-blocking
    }
  }
}

