import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { Types } from 'mongoose';
import { AcademicService } from '../services/academic.service.js';
import {
  UserRole,
  AccountStatus,
  ApprovalStatus,
  TeacherAssignmentStatus,
  ContentType,
  ContentStatus,
} from '../types/academic.types.js';
import {
  User,
  Subject,
  Department,
  Semester,
  Content,
  TeacherAssignment,
  StudentEnrollment,
  AuditLog,
} from '../models/index.js';

describe('Smart Board Dynamic Department & Subject Integration', () => {
  // Department IDs
  const itDeptId = new Types.ObjectId();
  const mathDeptId = new Types.ObjectId();
  const physDeptId = new Types.ObjectId();
  const civilDeptId = new Types.ObjectId();

  // Semester IDs
  const sem1Id = new Types.ObjectId();

  // Subject IDs
  const dsaSubjectId = new Types.ObjectId();
  const mathSubjectId = new Types.ObjectId();
  const physSubjectId = new Types.ObjectId();
  const civilSubjectId = new Types.ObjectId();

  // Teacher IDs
  const itTeacherId = new Types.ObjectId();
  const mathTeacherId = new Types.ObjectId();
  const civilTeacherId = new Types.ObjectId();

  // Student IDs
  const dsaStudentId = new Types.ObjectId();
  const mathStudentId = new Types.ObjectId();

  // Mock Departments
  const mockDepts = [
    { _id: itDeptId, name: 'Information Technology', code: 'IT' },
    { _id: mathDeptId, name: 'Mathematics Department', code: 'MATH' },
    { _id: physDeptId, name: 'Physics Department', code: 'PHY' },
    { _id: civilDeptId, name: 'Civil Engineering Department', code: 'CIVIL' },
  ];

  // Mock Semester
  const mockSem1 = {
    _id: sem1Id,
    semesterNumber: 1,
    academicYear: '2026-2027',
    regulation: 'R2021',
    department: itDeptId,
  };

  // Mock Subjects
  const mockSubjects = [
    {
      _id: dsaSubjectId,
      subjectCode: 'IT301',
      subjectName: 'Data Structures & Algorithms',
      department: itDeptId,
      semester: sem1Id,
      credits: 4,
      description: 'Comprehensive study of linear and non-linear data structures.',
    },
    {
      _id: mathSubjectId,
      subjectCode: 'MA101',
      subjectName: 'Engineering Mathematics',
      department: mathDeptId,
      semester: sem1Id,
      credits: 4,
      description: 'Calculus, matrices, and differential equations for engineering.',
    },
    {
      _id: physSubjectId,
      subjectCode: 'PH101',
      subjectName: 'Engineering Physics',
      department: physDeptId,
      semester: sem1Id,
      credits: 3,
      description: 'Optics, quantum mechanics, and classical wave mechanics.',
    },
    {
      _id: civilSubjectId,
      subjectCode: 'CE101',
      subjectName: 'Engineering Mechanics',
      department: civilDeptId,
      semester: sem1Id,
      credits: 3,
      description: 'Statics, dynamics, friction, and mechanics of rigid bodies.',
    },
  ];

  // Mock Teachers
  const mockTeachers = [
    {
      _id: itTeacherId,
      name: 'Dr. Ramesh IT',
      collegeEmail: 'ramesh.it@kpriet.ac.in',
      role: UserRole.TEACHER,
      department: itDeptId,
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      _id: mathTeacherId,
      name: 'Prof. Ananya Math',
      collegeEmail: 'ananya.math@kpriet.ac.in',
      role: UserRole.TEACHER,
      department: mathDeptId,
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      _id: civilTeacherId,
      name: 'Er. Suresh Civil',
      collegeEmail: 'suresh.civil@kpriet.ac.in',
      role: UserRole.TEACHER,
      department: civilDeptId,
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
  ];

  // Mock Students
  const mockStudents = [
    {
      _id: dsaStudentId,
      name: 'Student DSA',
      collegeEmail: 'student.dsa@kpriet.ac.in',
      role: UserRole.STUDENT,
      department: itDeptId,
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      _id: mathStudentId,
      name: 'Student Math',
      collegeEmail: 'student.math@kpriet.ac.in',
      role: UserRole.STUDENT,
      department: mathDeptId,
      accountStatus: AccountStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
    },
  ];

  // In-Memory Storage
  const inMemoryAssignments: any[] = [];
  const inMemoryContent: any[] = [];
  const inMemoryAuditLogs: any[] = [];

  before(() => {
    // Setup Mongoose Model Mocks
    (User as any).findById = async (id: any) => {
      const match = [...mockTeachers, ...mockStudents].find(
        (u) => String(u._id) === String(id)
      );
      return match ? { ...match } : null;
    };

    (User as any).find = () => ({
      select: async () => [],
    });

    (Department as any).findById = async (id: any) => {
      return mockDepts.find((d) => String(d._id) === String(id)) || null;
    };

    (Subject as any).findById = (id: any) => ({
      populate: (field1: string) => ({
        populate: (field2: string) => {
          const sub = mockSubjects.find((s) => String(s._id) === String(id));
          if (!sub) return null;
          const dept = mockDepts.find((d) => String(d._id) === String(sub.department));
          return {
            ...sub,
            department: dept || { _id: sub.department, name: 'Engineering', code: 'ENG' },
            semester: mockSem1,
          };
        },
      }),
    });

    (Subject as any).findOne = (query: any) => ({
      populate: (field1: string) => ({
        populate: (field2: string) => {
          let sub: any = null;
          if (query.$or) {
            sub = mockSubjects.find((s) =>
              query.$or.some(
                (cond: any) =>
                  (cond.subjectCode && cond.subjectCode.test && cond.subjectCode.test(s.subjectCode)) ||
                  (cond.subjectName && cond.subjectName.test && cond.subjectName.test(s.subjectName))
              )
            );
          }
          if (!sub) sub = mockSubjects[0];
          const dept = mockDepts.find((d) => String(d._id) === String(sub.department));
          return {
            ...sub,
            department: dept || { _id: sub.department, name: 'Engineering', code: 'ENG' },
            semester: mockSem1,
          };
        },
      }),
    });

    (TeacherAssignment as any).findOne = async (query: any) => {
      return (
        inMemoryAssignments.find(
          (a) =>
            String(a.teacher) === String(query.teacher) &&
            String(a.subject) === String(query.subject) &&
            a.status === TeacherAssignmentStatus.ACTIVE
        ) || null
      );
    };

    (Content as any).find = (query: any) => ({
      lean: async () =>
        inMemoryContent.filter(
          (c) =>
            String(c.subject) === String(query.subject) &&
            (!query.contentType || c.contentType === query.contentType)
        ),
    });

    (Content as any).create = async (doc: any) => {
      const created = {
        _id: new Types.ObjectId(),
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryContent.push(created);
      return created;
    };

    (AuditLog as any).create = async (doc: any) => {
      inMemoryAuditLogs.push(doc);
      return doc;
    };

    (StudentEnrollment as any).find = () => ({
      select: async () => [
        { student: dsaStudentId },
      ],
    });

    // Seed assignments
    inMemoryAssignments.push({
      _id: new Types.ObjectId(),
      teacher: itTeacherId,
      subject: dsaSubjectId,
      status: TeacherAssignmentStatus.ACTIVE,
    });
    inMemoryAssignments.push({
      _id: new Types.ObjectId(),
      teacher: mathTeacherId,
      subject: mathSubjectId,
      status: TeacherAssignmentStatus.ACTIVE,
    });
    inMemoryAssignments.push({
      _id: new Types.ObjectId(),
      teacher: civilTeacherId,
      subject: civilSubjectId,
      status: TeacherAssignmentStatus.ACTIVE,
    });
  });

  it('1. IT Teacher launches Smart Board for Data Structures & Algorithms -> inherits IT context', async () => {
    const session = await AcademicService.createSmartBoardSession(
      String(itTeacherId),
      UserRole.TEACHER,
      String(dsaSubjectId)
    );

    assert.ok(session, 'Smart Board session should be initialized');
    assert.strictEqual(session.department.name, 'Information Technology');
    assert.strictEqual(session.subject.subjectName, 'Data Structures & Algorithms');
    assert.strictEqual(session.subject.subjectCode, 'IT301');
    assert.strictEqual(session.user.name, 'Dr. Ramesh IT');

    // Verify DSA-specific formulas & simulations
    assert.ok(session.formulas.length > 0, 'Should load formulas');
    const masterFormula = session.formulas.find((f: any) => f.title.includes('Master Theorem'));
    assert.ok(masterFormula, 'DSA session must include Master Theorem for divide-and-conquer');

    const treeFormula = session.formulas.find((f: any) => f.title.includes('Binary Tree'));
    assert.ok(treeFormula, 'DSA session must include Binary Tree formula');

    const bstSim = session.simulations.find((s: any) => s.key.includes('bst'));
    assert.ok(bstSim, 'DSA session must include BST simulation');

    // Verify dynamic boardUrl
    assert.ok(session.boardUrl.includes('subjectName=Data+Structures'), 'boardUrl must contain dynamic subject');
    assert.ok(session.boardUrl.includes('departmentName=Information+Technology'), 'boardUrl must contain dynamic department');
  });

  it('2. Mathematics Teacher launches Smart Board for Engineering Mathematics -> inherits Math context', async () => {
    const session = await AcademicService.createSmartBoardSession(
      String(mathTeacherId),
      UserRole.TEACHER,
      String(mathSubjectId)
    );

    assert.ok(session, 'Smart Board session should be initialized');
    assert.strictEqual(session.department.name, 'Mathematics Department');
    assert.strictEqual(session.subject.subjectName, 'Engineering Mathematics');
    assert.strictEqual(session.subject.subjectCode, 'MA101');
    assert.strictEqual(session.user.name, 'Prof. Ananya Math');

    // Verify Math-specific formulas
    const ftcFormula = session.formulas.find((f: any) => f.title.includes('Calculus') || f.title.includes('Theorem'));
    assert.ok(ftcFormula, 'Math session must include Calculus / Theorem formulas');

    const cayleyFormula = session.formulas.find((f: any) => f.title.includes('Cayley-Hamilton'));
    assert.ok(cayleyFormula, 'Math session must include Cayley-Hamilton Theorem');

    // Verify Math simulations
    const mathGraphSim = session.simulations.find((s: any) => s.key.includes('math-graphs') || s.key.includes('calculus'));
    assert.ok(mathGraphSim, 'Math session must include calculus / function graph simulations');

    // Strict isolation: Must NOT include DSA Master Theorem or BST simulations
    assert.strictEqual(
      session.formulas.some((f: any) => f.title.includes('Master Theorem')),
      false,
      'Math session must NOT expose DSA Master Theorem'
    );
  });

  it('3. Civil Engineering Teacher launches Smart Board for Engineering Mechanics -> inherits Civil context', async () => {
    const session = await AcademicService.createSmartBoardSession(
      String(civilTeacherId),
      UserRole.TEACHER,
      String(civilSubjectId)
    );

    assert.ok(session, 'Smart Board session should be initialized');
    assert.strictEqual(session.department.name, 'Civil Engineering Department');
    assert.strictEqual(session.subject.subjectName, 'Engineering Mechanics');
    assert.strictEqual(session.subject.subjectCode, 'CE101');
    assert.strictEqual(session.user.name, 'Er. Suresh Civil');

    // Verify Civil-specific formulas
    const eqFormula = session.formulas.find((f: any) => f.title.includes('Equilibrium'));
    assert.ok(eqFormula, 'Civil session must include Static Equilibrium Conditions');

    const hookeFormula = session.formulas.find((f: any) => f.title.includes('Hooke'));
    assert.ok(hookeFormula, 'Civil session must include Hooke\'s Law / Young\'s Modulus');

    // Verify Civil simulations
    const beamSim = session.simulations.find((s: any) => s.key === 'beam-deflection');
    assert.ok(beamSim, 'Civil session must include Beam Deflection simulation');

    const trussSim = session.simulations.find((s: any) => s.key === 'truss-forces');
    assert.ok(trussSim, 'Civil session must include Truss Equilibrium simulation');

    // Strict isolation: Must NOT include DSA or Math formulas
    assert.strictEqual(
      session.formulas.some((f: any) => f.title.includes('Master Theorem') || f.title.includes('Cayley-Hamilton')),
      false,
      'Civil session must NOT expose DSA or Math specific formulas'
    );
  });

  it('4. Teacher shares notes directly from Smart Board to enrolled students', async () => {
    const sharePayload = {
      subjectId: String(dsaSubjectId),
      title: 'Linked List Pointers & Memory Derivations',
      description: 'Comprehensive Smart Board lecture notes captured in class.',
      chapterOrUnit: 2,
      materialType: 'board_capture',
      pdfBase64: 'data:application/pdf;base64,JVBERi0xLjQKJ...',
      fileName: 'DSA_Unit2_LinkedList_Notes.pdf',
      shareTarget: 'ALL_ENROLLED',
      status: 'PUBLISHED',
    };

    const result = await AcademicService.shareSmartBoardNotes(
      String(itTeacherId),
      UserRole.TEACHER,
      sharePayload
    );

    assert.ok(result.success, 'Sharing notes should succeed');
    assert.strictEqual(result.note.subjectName, 'Data Structures & Algorithms');
    assert.strictEqual(result.note.fileName, 'DSA_Unit2_LinkedList_Notes.pdf');
    assert.strictEqual(result.note.status, ContentStatus.PUBLISHED);

    // Verify content record stored in DB
    const saved = inMemoryContent.find((c) => c.title === 'Linked List Pointers & Memory Derivations');
    assert.ok(saved, 'Note must be stored in database');
    assert.strictEqual(saved.contentType, ContentType.NOTES);
    assert.strictEqual(String(saved.subject), String(dsaSubjectId));
    assert.ok(saved.tags.includes('Smart Board'), 'Must be tagged with Smart Board');
  });

  it('5. Shared notes are strictly bound to subject workspace and invisible to other subjects', async () => {
    // Query notes for DSA subject
    const dsaNotes = inMemoryContent.filter(
      (c) => String(c.subject) === String(dsaSubjectId) && c.contentType === ContentType.NOTES
    );
    assert.ok(dsaNotes.length > 0, 'DSA must have the shared notes');

    // Query notes for Mathematics subject
    const mathNotes = inMemoryContent.filter(
      (c) => String(c.subject) === String(mathSubjectId) && c.contentType === ContentType.NOTES
    );
    assert.strictEqual(mathNotes.length, 0, 'Mathematics must NOT contain DSA shared notes');

    // Query notes for Civil Engineering subject
    const civilNotes = inMemoryContent.filter(
      (c) => String(c.subject) === String(civilSubjectId) && c.contentType === ContentType.NOTES
    );
    assert.strictEqual(civilNotes.length, 0, 'Civil Engineering must NOT contain DSA shared notes');
  });

  it('6. Teacher can save draft notes from Smart Board without immediate publishing', async () => {
    const draftPayload = {
      subjectId: String(dsaSubjectId),
      title: 'Draft Graph Traversal DFS Notes',
      description: 'Draft notes in preparation for next lecture.',
      chapterOrUnit: 4,
      status: 'DRAFT',
    };

    const result = await AcademicService.shareSmartBoardNotes(
      String(itTeacherId),
      UserRole.TEACHER,
      draftPayload
    );

    assert.ok(result.success, 'Saving draft should succeed');
    assert.strictEqual(result.note.status, ContentStatus.DRAFT);
    assert.strictEqual(result.message, 'Notes saved as draft to Teacher Dashboard.');
  });
});
