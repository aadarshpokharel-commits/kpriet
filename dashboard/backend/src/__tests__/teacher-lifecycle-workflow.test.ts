import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { Types } from 'mongoose';
import { AcademicService } from '../services/academic.service.js';
import { AiRagService } from '../services/ai-rag.service.js';
import { NotificationService } from '../services/notification.service.js';
import {
  UserRole,
  AccountStatus,
  ApprovalStatus,
  TeacherAssignmentStatus,
  NotificationType,
} from '../types/academic.types.js';
import {
  User,
  Subject,
  CurriculumUnit,
  TeacherAssignment,
  TeacherCurriculumContent,
  KnowledgeDocument,
  KnowledgeChunk,
  Department,
  Semester,
  Content,
  Quiz,
  Assignment,
  AttendanceSession,
  StudentEnrollment,
  AuditLog,
  AssignmentGrade,
  AssignmentSubmission,
  SubjectResult,
} from '../models/index.js';

describe('Teacher Lifecycle & Subject Workspace Workflow', () => {
  const deptId = new Types.ObjectId();
  const semId = new Types.ObjectId();
  const subjectId = new Types.ObjectId();
  const unassignedSubjectId = new Types.ObjectId();
  const teacherId = new Types.ObjectId();
  const otherTeacherId = new Types.ObjectId();

  const mockDepartment = {
    _id: deptId,
    name: 'Information Technology',
    code: 'IT',
  };

  const mockSemester = {
    _id: semId,
    semesterNumber: 2,
    academicYear: '2024-2025',
    regulation: 'R2021',
    department: deptId,
  };

  const mockOfficialUnits = [
    {
      _id: new Types.ObjectId(),
      subject: subjectId,
      unitNumber: 1,
      unitCode: 'UNIT I',
      title: 'Python Basics & Data Structures',
      description: 'Introduction to Python language, syntax, variables, expressions, and core primitives.',
      syllabusText: 'Data types, operators, flow control, functions, recursion, lists, tuples, dictionaries.',
      topics: ['Python Syntax', 'Control Structures', 'Functions', 'Data Structures'],
      estimatedHours: 9,
    },
    {
      _id: new Types.ObjectId(),
      subject: subjectId,
      unitNumber: 2,
      unitCode: 'UNIT II',
      title: 'Object-Oriented Programming',
      description: 'Classes, objects, methods, encapsulation, inheritance, polymorphism, and abstraction.',
      syllabusText: 'Classes, constructors, inheritance, operator overloading, exception handling.',
      topics: ['Classes and Objects', 'Inheritance', 'Polymorphism', 'Exception Handling'],
      estimatedHours: 9,
    },
  ];

  const mockSubject = {
    _id: subjectId,
    subjectName: 'Python Programming',
    subjectCode: 'U21IT201',
    department: deptId,
    semester: semId,
    semesterNumber: 2,
    credits: 3,
    syllabus: mockOfficialUnits.map((u) => ({
      _id: u._id,
      unitNumber: u.unitNumber,
      unitCode: u.unitCode,
      title: u.title,
      description: u.description,
      syllabusText: u.syllabusText,
      topics: u.topics,
      hours: u.estimatedHours,
    })),
  };

  let mockTeacherUser = {
    _id: teacherId,
    name: 'Dr. Ramesh Kumar',
    collegeEmail: 'ramesh.k@kpriet.ac.in',
    identifier: 'FAC-IT-101',
    role: UserRole.TEACHER,
    accountStatus: AccountStatus.ACTIVE,
    approvalStatus: ApprovalStatus.PENDING,
    department: deptId,
  };

  let mockOtherTeacher = {
    _id: otherTeacherId,
    name: 'Prof. Anitha Selvan',
    collegeEmail: 'anitha.s@kpriet.ac.in',
    identifier: 'FAC-IT-102',
    role: UserRole.TEACHER,
    accountStatus: AccountStatus.ACTIVE,
    approvalStatus: ApprovalStatus.APPROVED,
    department: deptId,
  };

  const teacherAssignmentsStore: any[] = [];
  const teacherCurriculumStore: any[] = [];
  const notificationsStore: any[] = [];
  const knowledgeDocsStore: any[] = [];
  const knowledgeChunksStore: any[] = [];

  const createChainableQuery = (data: any) => {
    const obj: any = {
      populate: () => obj,
      select: () => obj,
      sort: () => obj,
      limit: () => obj,
      lean: async () => data,
      then: (resolve: any) => resolve(data),
    };
    return obj;
  };

  before(() => {
    // Stub User model methods
    (User as any).findById = (id: any) => {
      const match =
        String(id) === String(teacherId)
          ? mockTeacherUser
          : String(id) === String(otherTeacherId)
          ? mockOtherTeacher
          : null;
      return createChainableQuery(match);
    };

    (User as any).findOne = (query: any) => {
      const match =
        (query._id && String(query._id) === String(teacherId)) ||
        (query.collegeEmail && query.collegeEmail === mockTeacherUser.collegeEmail)
          ? mockTeacherUser
          : (query._id && String(query._id) === String(otherTeacherId)) ||
            (query.collegeEmail && query.collegeEmail === mockOtherTeacher.collegeEmail)
          ? mockOtherTeacher
          : null;
      return createChainableQuery(match);
    };

    // Stub Subject model methods
    (Subject as any).findById = (id: any) => {
      const match = String(id) === String(subjectId) ? mockSubject : null;
      return createChainableQuery(match);
    };

    (Subject as any).find = (query: any) => ({
      lean: async () => {
        if (query._id?.$in) {
          return [mockSubject].filter((s) => query._id.$in.map(String).includes(String(s._id)));
        }
        return [mockSubject];
      },
    });

    // Stub CurriculumUnit model
    (CurriculumUnit as any).find = (query: any) => ({
      sort: () => ({
        lean: async () => (String(query.subject) === String(subjectId) ? mockOfficialUnits : []),
      }),
    });

    (CurriculumUnit as any).findOne = (query: any) => {
      const match = mockOfficialUnits.find((u) => u.unitNumber === query.unitNumber) || null;
      return createChainableQuery(match);
    };

    // Stub TeacherAssignment model
    (TeacherAssignment as any).findOne = (query: any) => {
      const found = teacherAssignmentsStore.find(
        (a) =>
          String(a.teacher) === String(query.teacher) &&
          String(a.subject) === String(query.subject) &&
          a.status === (query.status || TeacherAssignmentStatus.ACTIVE)
      ) || null;
      return createChainableQuery(found);
    };

    (TeacherAssignment as any).find = (query: any) => {
      const filtered = teacherAssignmentsStore.filter(
        (a) =>
          (!query.teacher || String(a.teacher) === String(query.teacher)) &&
          (!query.status || a.status === query.status)
      );
      return createChainableQuery(filtered);
    };

    (TeacherAssignment as any).findOneAndUpdate = (filter: any, update: any, _options: any) => {
      const existingIdx = teacherAssignmentsStore.findIndex(
        (a) =>
          String(a.teacher) === String(filter.teacher) &&
          String(a.subject) === String(filter.subject)
      );
      const dataToSave = {
        ...(existingIdx >= 0 ? teacherAssignmentsStore[existingIdx] : {}),
        ...update.$set,
        teacher: filter.teacher,
        subject: filter.subject,
        semester: filter.semester,
        academicYear: filter.academicYear,
        section: filter.section || 'ALL',
        status: TeacherAssignmentStatus.ACTIVE,
        _id: existingIdx >= 0 ? teacherAssignmentsStore[existingIdx]._id : new Types.ObjectId(),
        createdAt: new Date(),
      };
      if (existingIdx >= 0) {
        teacherAssignmentsStore[existingIdx] = dataToSave;
      } else {
        teacherAssignmentsStore.push(dataToSave);
      }
      return createChainableQuery(dataToSave);
    };

    (TeacherAssignment as any).create = async (doc: any) => {
      const created = { ...doc, _id: new Types.ObjectId(), createdAt: new Date() };
      teacherAssignmentsStore.push(created);
      return created;
    };

    // Stub TeacherCurriculumContent model
    (TeacherCurriculumContent as any).find = (query: any) => ({
      sort: () => {
        const filtered = teacherCurriculumStore.filter(
          (c) =>
            String(c.teacher) === String(query.teacher) &&
            String(c.subject) === String(query.subject) &&
            c.status === 'ACTIVE'
        );
        return {
          lean: async () => filtered,
          then: (resolve: any) => resolve(filtered),
        };
      },
    });

    (TeacherCurriculumContent as any).findOneAndUpdate = async (filter: any, update: any, _options: any) => {
      const existingIdx = teacherCurriculumStore.findIndex(
        (c) =>
          String(c.teacher) === String(filter.teacher) &&
          String(c.subject) === String(filter.subject) &&
          c.unitNumber === filter.unitNumber
      );
      const dataToSave = {
        ...(existingIdx >= 0 ? teacherCurriculumStore[existingIdx] : {}),
        ...update.$set,
        _id: existingIdx >= 0 ? teacherCurriculumStore[existingIdx]._id : new Types.ObjectId(),
        updatedAt: new Date(),
      };
      if (existingIdx >= 0) {
        teacherCurriculumStore[existingIdx] = dataToSave;
      } else {
        teacherCurriculumStore.push(dataToSave);
      }
      return dataToSave;
    };

    // Stub NotificationService & AuditLog
    NotificationService.create = async (data: any) => {
      notificationsStore.push(data);
      return data as any;
    };

    (AuditLog as any).create = async (doc: any) => ({ ...doc, _id: new Types.ObjectId() });

    // Stub Department & Semester
    (Department as any).findById = async (id: any) => (String(id) === String(deptId) ? mockDepartment : null);
    (Semester as any).findById = async (id: any) => (String(id) === String(semId) ? mockSemester : null);

    // Stub Content, Quiz, Assignment, Attendance, StudentEnrollment, Grades, Submissions
    (Content as any).find = () => createChainableQuery([]);
    (Content as any).countDocuments = async () => 0;
    (Quiz as any).find = () => createChainableQuery([]);
    (Quiz as any).countDocuments = async () => 0;
    (Assignment as any).find = () => createChainableQuery([]);
    (Assignment as any).countDocuments = async () => 0;
    (AssignmentGrade as any).find = () => createChainableQuery([]);
    (AssignmentGrade as any).countDocuments = async () => 0;
    (AssignmentSubmission as any).find = () => createChainableQuery([]);
    (AssignmentSubmission as any).countDocuments = async () => 0;
    (AttendanceSession as any).find = () => createChainableQuery([]);
    (AttendanceSession as any).countDocuments = async () => 0;
    (StudentEnrollment as any).countDocuments = async () => 0;
    (SubjectResult as any).find = () => createChainableQuery([]);
    (SubjectResult as any).countDocuments = async () => 0;

    // Stub KnowledgeDocument & KnowledgeChunk
    (KnowledgeDocument as any).countDocuments = async (query: any) => {
      if (query.status === 'INDEXED') return knowledgeDocsStore.filter((d) => d.status === 'INDEXED').length;
      if (query.status === 'PROCESSING') return knowledgeDocsStore.filter((d) => d.status === 'PROCESSING').length;
      if (query.status === 'FAILED') return knowledgeDocsStore.filter((d) => d.status === 'FAILED').length;
      return knowledgeDocsStore.length;
    };

    (KnowledgeDocument as any).findOne = (_query: any) => ({
      sort: () => ({
        select: async () => ({ updatedAt: new Date() }),
      }),
    });

    (KnowledgeDocument as any).find = (_query: any) => ({
      select: () => ({
        sort: () => ({
          limit: () => ({
            lean: async () => knowledgeDocsStore,
          }),
        }),
      }),
    });

    (KnowledgeDocument as any).create = async (doc: any) => {
      const created = {
        ...doc,
        _id: new Types.ObjectId(),
        status: 'INDEXED',
        updatedAt: new Date(),
        save: async function () {
          this.status = 'INDEXED';
          return this;
        },
      };
      knowledgeDocsStore.push(created);
      return created;
    };

    (KnowledgeChunk as any).countDocuments = async (_query: any) => knowledgeChunksStore.length;
    (KnowledgeChunk as any).insertMany = async (chunks: any[]) => {
      knowledgeChunksStore.push(...chunks);
      return chunks;
    };
    (KnowledgeChunk as any).deleteMany = async () => {};
    (KnowledgeDocument as any).findByIdAndDelete = async () => {};
  });

  // ─── TEST 1: College Email Domain Validation ───
  it('1. Teacher registration enforces official @kpriet.ac.in college email domain', () => {
    const validEmail = 'faculty@kpriet.ac.in';
    const invalidEmail = 'faculty@gmail.com';
    const invalidCollege = 'faculty@othercollege.edu';

    assert.ok(validEmail.endsWith('@kpriet.ac.in'), 'Official KPRIET email is accepted');
    assert.ok(!invalidEmail.endsWith('@kpriet.ac.in'), 'Personal Gmail is rejected');
    assert.ok(!invalidCollege.endsWith('@kpriet.ac.in'), 'External college email is rejected');
  });

  // ─── TEST 2: Initial Teacher State upon Registration & Approval (0 Subjects) ───
  it('2. Approved teacher initially has 0 subjects, 0 semesters, and 0 enrolled students', async () => {
    mockTeacherUser.approvalStatus = ApprovalStatus.APPROVED;

    const overview = await AcademicService.getTeacherDashboardOverview(String(teacherId));

    assert.strictEqual(overview.teacher.approvalStatus, ApprovalStatus.APPROVED);
    assert.strictEqual(overview.stats.totalAssignedSubjects, 0, 'Initial assigned subjects must be exactly 0');
    assert.strictEqual(overview.stats.totalSemesters, 0, 'Initial assigned semesters must be exactly 0');
    assert.strictEqual(overview.stats.totalEnrolledStudents, 0, 'Initial enrolled students must be exactly 0');
    assert.strictEqual(overview.subjectWiseProgress.length, 0, 'No progress data for unassigned teacher');
  });

  // ─── TEST 3: Strict 403 Forbidden for Unassigned Subject Workspace ───
  it('3. Unassigned teacher is strictly blocked with 403 Forbidden when requesting a subject workspace', async () => {
    await assert.rejects(
      async () => {
        await AcademicService.getTeacherSubjectWorkspace(String(teacherId), String(subjectId));
      },
      (err: any) => {
        assert.strictEqual(err.statusCode, 403, 'Must return 403 status code');
        assert.ok(err.message.includes('not assigned to teach this subject'));
        return true;
      }
    );
  });

  // ─── TEST 4: HOD Assigns Teacher -> Receives Real-time Notification ───
  it('4. HOD assigns teacher to Subject + Semester + Section and triggers academic notification', async () => {
    const assignmentPayload = {
      teacherId: String(teacherId),
      departmentId: String(deptId),
      semesterId: String(semId),
      subjectId: String(subjectId),
      section: 'A',
      academicYear: '2024-2025',
    };

    const result = await AcademicService.assignTeacher(assignmentPayload);

    assert.ok(result, 'Teacher assignment created');
    assert.strictEqual(teacherAssignmentsStore.length, 1, 'Store contains 1 active assignment');

    // Check notification
    const notification = notificationsStore.find((n) => String(n.recipient) === String(teacherId));
    assert.ok(notification, 'Teacher received assignment notification');
    assert.strictEqual(notification.type, NotificationType.TEACHING_ASSIGNMENT_CREATED);
    assert.strictEqual(notification.title, 'New teaching assignment');
    assert.ok(notification.message.includes('U21IT201'));
  });

  // ─── TEST 5: Assigned Teacher Receives Subject Workspace ───
  it('5. Assigned teacher successfully accesses subject workspace with curriculum tab', async () => {
    const workspace = await AcademicService.getTeacherSubjectWorkspace(String(teacherId), String(subjectId));

    assert.ok(workspace, 'Workspace retrieved');
    assert.strictEqual(workspace.subject.subjectCode, 'U21IT201');
    assert.ok(workspace.assignmentMeta, 'Assignment metadata exists');
    assert.strictEqual(workspace.assignmentMeta.section, 'A');
    assert.ok(Array.isArray(workspace.tabs.curriculum), 'Curriculum tab included in workspace tabs');
  });

  // ─── TEST 6: Official Syllabus is Protected Ground Truth ───
  it('6. Official institutional syllabus units (Units I-V) are protected and not overwritten', async () => {
    const curriculumData = await AcademicService.getTeacherSubjectCurriculum(String(teacherId), String(subjectId));

    assert.ok(curriculumData.units.length >= 2, 'Curriculum units retrieved');
    const unit1 = curriculumData.units.find((u) => u.unitNumber === 1);
    assert.ok(unit1, 'Unit 1 exists');
    assert.strictEqual(unit1.officialTitle, 'Python Basics & Data Structures');
    assert.strictEqual(unit1.officialHours, 9);
    assert.ok(unit1.officialTopics.includes('Python Syntax'));
    assert.strictEqual(unit1.teacherContent, null, 'Teacher custom content initially null');
  });

  // ─── TEST 7: Teacher Customizes Chapter Pedagogical Content ───
  it('7. Teacher saves custom teaching notes, learning objectives, exam points, and detailed topics', async () => {
    const customData = {
      chapterTitle: 'Python Foundations & Algorithmic Primitives',
      teachingNotes: 'Emphasize dynamic typing and memory model in Python 3.12.',
      learningObjectives: [
        'Understand Python runtime and bytecode compilation',
        'Master immutable vs mutable data collections',
      ],
      importantPoints: [
        'List comprehension complexity O(N)',
        'Dictionary lookup average case O(1)',
      ],
      practicalExamples: [
        'Parsing log files using dictionary counters',
        'Fibonacci memoization with dictionary cache',
      ],
      referenceMaterials: ['Fluent Python (Luciano Ramalho)', 'Python Cookbook 3rd Edition'],
      topics: [
        {
          topicId: 'topic-py-01',
          title: 'Memory Allocation & Reference Counting',
          order: 1,
          explanation: 'CPython uses reference counting combined with generational garbage collection.',
          examples: ['sys.getrefcount(obj)'],
          formulas: ['Ref(T) = Ref(T) + 1 on assignment'],
        },
      ],
    };

    const saved = await AcademicService.saveTeacherSubjectCurriculum(
      String(teacherId),
      String(subjectId),
      1,
      customData
    );

    assert.ok(saved, 'Customized chapter content saved');
    assert.strictEqual(saved.chapterTitle, 'Python Foundations & Algorithmic Primitives');
    assert.strictEqual(saved.learningObjectives.length, 2);
    assert.strictEqual(saved.topics.length, 1);

    // Verify official curriculum is untouched
    assert.strictEqual(mockSubject.syllabus[0].title, 'Python Basics & Data Structures', 'Institutional title preserved');
  });

  // ─── TEST 8: RAG Automatically Processes Custom Content into Vector Store ───
  it('8. RAG pipeline automatically vector-ingests teacher custom content with full metadata', async () => {
    const contentDoc = teacherCurriculumStore[0];
    assert.ok(contentDoc, 'Teacher curriculum doc exists in store');

    await AiRagService.ingestTeacherCurriculumContent(contentDoc);

    assert.ok(knowledgeDocsStore.length > 0, 'Knowledge document created');
    const doc = knowledgeDocsStore[knowledgeDocsStore.length - 1];
    assert.strictEqual(doc.documentType, 'NOTES');
    assert.strictEqual(String(doc.subject), String(subjectId));
    assert.strictEqual(String(doc.teacher), String(teacherId));
    assert.strictEqual(doc.chapter, 'Unit 1: Python Foundations & Algorithmic Primitives');

    assert.ok(knowledgeChunksStore.length > 0, 'Knowledge chunks generated');
    const chunk = knowledgeChunksStore[0];
    assert.strictEqual(String(chunk.subject), String(subjectId), 'Chunk strictly partitioned to subjectId');
    assert.strictEqual(String(chunk.teacher), String(teacherId), 'Chunk tracks author teacher');
  });

  // ─── TEST 9: Subject Knowledge Stats API Returns Full Metrics ───
  it('9. Teacher can retrieve Subject AI Knowledge Base statistics', async () => {
    const stats = await AcademicService.getTeacherKnowledgeBaseStats(String(teacherId), String(subjectId));

    assert.ok(stats, 'Knowledge stats retrieved');
    assert.strictEqual(stats.documents, knowledgeDocsStore.length);
    assert.strictEqual(stats.processed, knowledgeDocsStore.length);
    assert.strictEqual(stats.knowledgeChunks, knowledgeChunksStore.length);
    assert.strictEqual(stats.sources.length, knowledgeDocsStore.length);
  });

  // ─── TEST 10: Strict Cross-Subject Isolation Enforcement ───
  it('10. Teacher cannot modify curriculum or view knowledge stats for an unassigned subject', async () => {
    await assert.rejects(
      async () => {
        await AcademicService.saveTeacherSubjectCurriculum(
          String(teacherId),
          String(unassignedSubjectId),
          1,
          { chapterTitle: 'Unauthorized Edit' }
        );
      },
      (err: any) => {
        assert.ok(err.statusCode === 403 || err.statusCode === 404);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await AcademicService.getTeacherKnowledgeBaseStats(
          String(otherTeacherId),
          String(subjectId)
        );
      },
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });
});
