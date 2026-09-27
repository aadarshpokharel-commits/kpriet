/**
 * Programme Master integration tests.
 *
 * Verifies that the 14 official B.E. programmes are one centralised,
 * database-driven master that every flow uses: registration, HOD approval,
 * teacher assignment, student subject filtering, curriculum, Smart Board,
 * RAG isolation, statistics and admin activation — for EVERY programme.
 *
 * Uses its own database so the programme seeder never touches fixtures of
 * other suites running in parallel.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.MONGODB_URI = (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduverse_test').replace(
  /\/[^/?]+(\?|$)/,
  '/eduverse_programme_master_test$1'
);
process.env.RATE_LIMIT_MAX = '100000';

const OFFICIAL = [
  ['AIDS', 'Artificial Intelligence and Data Science'],
  ['BME', 'Biomedical Engineering'],
  ['CHE', 'Chemical Engineering'],
  ['CIV', 'Civil Engineering'],
  ['CSBS', 'Computer Science and Business Systems'],
  ['CSE', 'Computer Science and Engineering'],
  ['AIML', 'Computer Science Engineering (AI & ML)'],
  ['CYBER', 'CSE (Cyber Security)'],
  ['EEE', 'Electrical & Electronics Engineering'],
  ['ECE', 'Electronics & Communication Engineering'],
  ['VLSI', 'Electronics Engineering (VLSI Design and Technology)'],
  ['IT', 'Information Technology'],
  ['ME', 'Mechanical Engineering'],
  ['MTR', 'Mechatronics Engineering'],
] as const;

const YEAR = '2026-2027';
const PASSWORD = 'Strong@Pass1';

// Lazily imported after the env overrides above.
let app: any;
let models: any;
let ProgrammeService: any;
let AiRagService: any;
let generateAccessToken: (u: any) => string;
let disconnectDatabase: () => Promise<void>;

let adminToken: string;
let legacyAdId: string;
let legacySubjectId: string;

interface Ctx {
  code: string;
  name: string;
  deptId: string;
  hod: any;
  hodToken: string;
  semesterId: string;
  subjectId: string;
  teacherId: string;
  teacherToken: string;
  studentId: string;
  studentToken: string;
}
const ctx: Record<string, Ctx> = {};

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
const letters = (code: string) => code.toLowerCase().replace(/[^a-z]/g, '').slice(0, 4);

beforeAll(async () => {
  const mongoose = (await import('mongoose')).default;
  const db = await import('../src/database/connection.js');
  disconnectDatabase = db.disconnectDatabase;
  await db.connectDatabase();
  await mongoose.connection.db!.dropDatabase();

  models = await import('../src/models/index.js');
  ({ ProgrammeService } = await import('../src/services/programme.service.js'));
  ({ AiRagService } = await import('../src/services/ai-rag.service.js'));
  ({ generateAccessToken } = await import('../src/security/token.utils.js'));
  const { createApp } = await import('../src/app.js');
  app = createApp();

  const { Department, Semester, Subject, User } = models;

  // Legacy data created by an older seed: code "AD", a supporting SH department.
  const ad = await Department.create({ name: 'Artificial Intelligence & Data Science', code: 'AD', status: 'ACTIVE' });
  legacyAdId = String(ad._id);
  const legacySem = await Semester.create({
    semesterNumber: 1,
    academicYear: '2024-2025',
    regulation: 'R2021',
    department: ad._id,
  });
  const legacySub = await Subject.create({
    subjectName: 'Foundations of Data Science',
    subjectCode: 'U21AD101',
    department: ad._id,
    semester: legacySem._id,
    semesterNumber: 1,
    credits: 3,
  });
  legacySubjectId = String(legacySub._id);
  await Department.create({ name: 'Science & Humanities', code: 'SH', status: 'ACTIVE' });

  // Seed twice: must be idempotent.
  await ProgrammeService.seedProgrammeMaster();
  await ProgrammeService.seedProgrammeMaster();

  const admin = await User.create({
    name: 'Programme Admin',
    collegeEmail: 'programme.admin@kpriet.ac.in',
    passwordHash: 'x'.repeat(60),
    role: 'ADMIN',
    identifier: 'PM-ADMIN-1',
    accountStatus: 'ACTIVE',
    approvalStatus: 'APPROVED',
  });
  adminToken = generateAccessToken(admin);
}, 60_000);

afterAll(async () => {
  await disconnectDatabase?.();
});

describe('1. Programme master seed & migration', () => {
  it('creates exactly the 14 official programmes with stable codes and exact names', async () => {
    const programmes = await models.Department.find({ isProgramme: true }).sort({ displayOrder: 1 }).lean();
    expect(programmes.map((p: any) => [p.code, p.name])).toEqual(OFFICIAL.map(([c, n]) => [c, n]));
    for (const [code] of OFFICIAL) {
      expect(await models.Programme.countDocuments({ code })).toBe(1);
    }
  });

  it('is idempotent (no duplicates after repeated runs)', async () => {
    await ProgrammeService.seedProgrammeMaster();
    expect(await models.Department.countDocuments({ isProgramme: true })).toBe(14);
    expect(await models.Department.countDocuments({ code: 'AIDS' })).toBe(1);
  });

  it('migrates a legacy code in place, preserving its _id and linked academic records', async () => {
    const aids = await models.Department.findOne({ code: 'AIDS' }).lean();
    expect(String(aids._id)).toBe(legacyAdId);
    expect(aids.legacyCodes).toContain('AD');
    const sub = await models.Subject.findById(legacySubjectId).lean();
    expect(String(sub.department)).toBe(legacyAdId);
    // Legacy code still resolves
    expect((await ProgrammeService.resolveProgramme('AD')).code).toBe('AIDS');
  });

  it('keeps supporting departments out of the programme list', async () => {
    const sh = await models.Department.findOne({ code: 'SH' }).lean();
    expect(sh.isProgramme).toBe(false);
  });
});

describe('2. Public programme API', () => {
  it('GET /programmes returns all 14 active programmes in official order', async () => {
    const res = await request(app).get('/api/v1/programmes');
    expect(res.status).toBe(200);
    expect(res.body.data.map((p: any) => p.programmeId)).toEqual(OFFICIAL.map(([c]) => c));
    const first = res.body.data[0];
    expect(first).toMatchObject({ programmeId: 'AIDS', type: 'B.E.', isActive: true });
    expect(res.body.data.every((p: any) => p.name && p.shortName && p.id)).toBe(true);
  });

  it('legacy /auth/departments returns the same master list', async () => {
    const res = await request(app).get('/api/v1/auth/departments');
    expect(res.body.data.map((p: any) => p.code)).toEqual(OFFICIAL.map(([c]) => c));
  });

  it('supports search', async () => {
    const res = await request(app).get('/api/v1/programmes?search=vlsi');
    expect(res.body.data.map((p: any) => p.programmeId)).toEqual(['VLSI']);
  });
});

describe('3. Full academic lifecycle for every one of the 14 programmes', () => {
  it.each(OFFICIAL.map(([code, name], index) => [code, name, index]))(
    '%s — %s',
    async (code, name, index) => {
      const { Department, User } = models;
      const dept = await Department.findOne({ code }).lean();
      const deptId = String(dept._id);
      const n = String(100 + Number(index));

      // HOD associated with the programme (never typed — referenced by id)
      const hod = await User.create({
        name: `HOD ${code}`,
        collegeEmail: `hod.${letters(code)}${n}@kpriet.ac.in`,
        passwordHash: 'x'.repeat(60),
        role: 'HOD',
        department: dept._id,
        identifier: `HOD-${code}-${n}`,
        accountStatus: 'ACTIVE',
        approvalStatus: 'APPROVED',
      });
      await Department.updateOne({ _id: dept._id }, { $set: { hod: hod._id } });
      const hodToken = generateAccessToken(hod);

      // Semester created by the HOD using the programme id
      const semRes = await request(app)
        .post('/api/v1/academic/semesters')
        .set(bearer(hodToken))
        .send({ semesterNumber: 1, academicYear: YEAR, regulation: 'R2021', programmeId: code });
      expect(semRes.status, JSON.stringify(semRes.body)).toBe(201);
      const semesterId = String(semRes.body.data._id);
      expect(String(semRes.body.data.department)).toBe(deptId);

      // Subject with Unit → Topic
      const subRes = await request(app)
        .post('/api/v1/academic/subjects')
        .set(bearer(hodToken))
        .send({
          subjectName: `Core Subject ${code}`,
          subjectCode: `T${letters(code).toUpperCase()}101`,
          programmeId: code,
          semesterId,
          semesterNumber: 1,
          credits: 4,
          syllabus: [{ unitNumber: 1, title: `Unit One ${code}`, topics: [`Topic ${code}`] }],
        });
      expect(subRes.status, JSON.stringify(subRes.body)).toBe(201);
      const subjectId = String(subRes.body.data._id);

      // Registration options expose the programme's academic years
      const optRes = await request(app).get(`/api/v1/programmes/${code}/registration-options`);
      expect(optRes.status).toBe(200);
      expect(optRes.body.data.academicYears).toContain(YEAR);

      // Teacher registration → PENDING, stored with programme id, no subjects
      const tEmail = `faculty.${letters(code)}${n}@kpriet.ac.in`;
      const tReg = await request(app).post('/api/v1/auth/register/teacher').send({
        name: `Teacher ${code}`,
        collegeEmail: tEmail,
        password: PASSWORD,
        programmeId: code,
        employeeIdentifier: `FAC-${code}-${n}`,
        designation: 'Assistant Professor',
      });
      expect(tReg.status, JSON.stringify(tReg.body)).toBe(201);
      const teacher = await User.findOne({ collegeEmail: tEmail });
      expect(String(teacher.department)).toBe(deptId);
      expect(teacher.approvalStatus).toBe('PENDING');
      expect(await models.TeacherAssignment.countDocuments({ teacher: teacher._id })).toBe(0);

      // Pending teacher cannot be assigned
      const early = await request(app)
        .post('/api/v1/academic/assignments/teachers')
        .set(bearer(hodToken))
        .send({ teacherId: String(teacher._id), subjectId, section: 'A' });
      expect(early.status).toBe(400);

      // HOD approves
      const review = await request(app)
        .put(`/api/v1/academic/departments/${deptId}/faculty/${teacher._id}/review`)
        .set(bearer(hodToken))
        .send({ status: 'APPROVED' });
      expect(review.status, JSON.stringify(review.body)).toBe(200);

      // HOD assigns Semester + Subject + Section (programme derived from subject)
      const assign = await request(app)
        .post('/api/v1/academic/assignments/teachers')
        .set(bearer(hodToken))
        .send({ teacherId: String(teacher._id), subjectId, section: 'A' });
      expect(assign.status, JSON.stringify(assign.body)).toBe(201);
      const asg = await models.TeacherAssignment.findOne({ teacher: teacher._id }).lean();
      expect(String(asg.department)).toBe(deptId);
      expect(String(asg.semester)).toBe(semesterId);
      expect(asg.academicYear).toBe(YEAR);

      const approvedTeacher = await User.findById(teacher._id);
      const teacherToken = generateAccessToken(approvedTeacher);

      // Teacher dashboard is programme-aware (Programme → Semester → Subject)
      const tSubs = await request(app).get('/api/v1/academic/teachers/assigned-subjects').set(bearer(teacherToken));
      expect(tSubs.status).toBe(200);
      expect(tSubs.body.data.programmes[0]).toMatchObject({ programmeId: code, name });
      expect(tSubs.body.data.programmes[0].semesters[0].subjects[0]._id).toBe(subjectId);

      // Student registration → programme + semester + academic year
      const sId = `24${letters(code)}${n}`.toUpperCase();
      const sReg = await request(app).post('/api/v1/auth/register/student').send({
        name: `Student ${code}`,
        collegeEmail: `${sId.toLowerCase()}@kpriet.ac.in`,
        password: PASSWORD,
        programmeId: code,
        studentIdentifier: sId,
        currentSemesterNumber: 1,
        academicYear: YEAR,
      });
      expect(sReg.status, JSON.stringify(sReg.body)).toBe(201);
      const student = await User.findOne({ identifier: sId });
      expect(String(student.department)).toBe(deptId);
      const enrollment = await models.StudentEnrollment.findOne({ student: student._id }).lean();
      expect(String(enrollment.department)).toBe(deptId);
      expect(String(enrollment.semester)).toBe(semesterId);
      expect(enrollment.academicYear).toBe(YEAR);
      expect(enrollment.enrolledSubjects.map(String)).toEqual([subjectId]);
      const studentToken = generateAccessToken(student);

      // Student dashboard shows the programme dynamically
      const overview = await request(app).get('/api/v1/academic/students/dashboard-overview').set(bearer(studentToken));
      expect(overview.status).toBe(200);
      expect(overview.body.data.programme).toMatchObject({ programmeId: code, name, type: 'B.E.' });

      ctx[code] = {
        code,
        name,
        deptId,
        hod,
        hodToken,
        semesterId,
        subjectId,
        teacherId: String(teacher._id),
        teacherToken,
        studentId: String(student._id),
        studentToken,
      };
    },
    30_000
  );
});

describe('4. Programme isolation (IT vs. every other programme)', () => {
  it('students only see subjects of their own programme', async () => {
    for (const [code] of OFFICIAL) {
      const c = ctx[code]!;
      const own = await request(app).get(`/api/v1/programmes/${code}/subjects`).set(bearer(c.studentToken));
      expect(own.status).toBe(200);
      expect(own.body.data.map((s: any) => s._id)).toEqual([c.subjectId]);

      const other = code === 'IT' ? 'CIV' : 'IT';
      const cross = await request(app).get(`/api/v1/programmes/${other}/subjects`).set(bearer(c.studentToken));
      expect(cross.status).toBe(403);

      const direct = await request(app)
        .get(`/api/v1/academic/subjects/${ctx[other]!.subjectId}`)
        .set(bearer(c.studentToken));
      expect(direct.status).toBe(403);

      const listed = await request(app).get('/api/v1/academic/subjects').set(bearer(c.studentToken));
      expect(listed.body.data.map((s: any) => String(s._id))).toEqual([c.subjectId]);
    }
  });

  it('changing the programme changes semesters, subjects, teachers, students and curriculum', async () => {
    const seen = new Set<string>();
    for (const [code] of OFFICIAL) {
      const c = ctx[code]!;
      const get = (p: string) => request(app).get(`/api/v1/programmes/${code}/${p}`).set(bearer(adminToken));
      const [sems, subs, teachers, students, curriculum] = await Promise.all([
        get('semesters'),
        get('subjects'),
        get('teachers'),
        get('students'),
        get('curriculum'),
      ]);
      // AIDS additionally owns the legacy (migrated "AD") semester + subject.
      const legacy = code === 'AIDS';
      expect(sems.body.data.map((s: any) => s._id)).toEqual(
        legacy ? expect.arrayContaining([c.semesterId]) : [c.semesterId]
      );
      expect(subs.body.data.map((s: any) => s._id).sort()).toEqual(
        legacy ? [c.subjectId, legacySubjectId].sort() : [c.subjectId]
      );
      expect(teachers.body.data.map((t: any) => String(t._id))).toEqual(
        expect.arrayContaining([c.teacherId])
      );
      expect(teachers.body.data.every((t: any) => ['TEACHER', 'HOD'].includes(t.role))).toBe(true);
      expect(students.body.data.map((s: any) => String(s._id))).toEqual([c.studentId]);

      const tree = curriculum.body.data;
      expect(tree.programme.programmeId).toBe(code);
      const sem = tree.regulations[0].academicYears[0].semesters[0];
      expect(sem.subjects[0].units[0].topics[0].title).toBe(`Topic ${code}`);

      const signature = subs.body.data.map((s: any) => s._id).join();
      expect(seen.has(signature)).toBe(false);
      seen.add(signature);
    }
  });

  it('HODs manage only their own programme', async () => {
    const itc = ctx.IT!;
    const cse = ctx.CSE!;
    const assign = await request(app)
      .post('/api/v1/academic/assignments/teachers')
      .set(bearer(itc.hodToken))
      .send({ teacherId: itc.teacherId, subjectId: cse.subjectId, section: 'B' });
    expect(assign.status).toBe(403);

    const roster = await request(app).get('/api/v1/programmes/CSE/teachers').set(bearer(itc.hodToken));
    expect(roster.status).toBe(403);

    const subject = await request(app)
      .post('/api/v1/academic/subjects')
      .set(bearer(itc.hodToken))
      .send({ subjectName: 'Rogue', subjectCode: 'ROGUE1', programmeId: 'CSE', semesterId: cse.semesterId, semesterNumber: 1, credits: 1 });
    expect(subject.status).toBe(403);
  });

  it('rejects a subject whose semester belongs to another programme', async () => {
    const res = await request(app)
      .post('/api/v1/academic/subjects')
      .set(bearer(adminToken))
      .send({ subjectName: 'Mismatch', subjectCode: 'MIS101', programmeId: 'IT', semesterId: ctx.CSE!.semesterId, semesterNumber: 1, credits: 1 });
    expect(res.status).toBe(400);
  });

  it('rejects a teacher assignment whose academic year does not match the subject', async () => {
    const itc = ctx.IT!;
    const res = await request(app)
      .post('/api/v1/academic/assignments/teachers')
      .set(bearer(itc.hodToken))
      .send({ teacherId: itc.teacherId, subjectId: itc.subjectId, section: 'C', academicYear: '2020-2021' });
    expect(res.status).toBe(400);
  });

  it('supports a teacher assigned to multiple programmes', async () => {
    const itTeacher = ctx.IT!;
    const cse = ctx.CSE!;
    const res = await request(app)
      .post('/api/v1/academic/assignments/teachers')
      .set(bearer(cse.hodToken))
      .send({ teacherId: itTeacher.teacherId, subjectId: cse.subjectId, section: 'B' });
    expect(res.status, JSON.stringify(res.body)).toBe(201);

    const subs = await request(app).get('/api/v1/academic/teachers/assigned-subjects').set(bearer(itTeacher.teacherToken));
    expect(subs.body.data.programmes.map((p: any) => p.programmeId).sort()).toEqual(['CSE', 'IT']);

    // …and may read the curriculum of the programme it teaches in, but not rosters.
    const cur = await request(app).get('/api/v1/programmes/CSE/subjects').set(bearer(itTeacher.teacherToken));
    expect(cur.status).toBe(200);
    expect(cur.body.data.map((s: any) => s._id)).toEqual([cse.subjectId]);
    const roster = await request(app).get('/api/v1/programmes/CSE/students').set(bearer(itTeacher.teacherToken));
    expect(roster.status).toBe(403);
  });
});

describe('5. HOD statistics', () => {
  it('reports programme-scoped counts for every programme', async () => {
    for (const [code] of OFFICIAL) {
      const res = await request(app).get(`/api/v1/programmes/${code}/stats`).set(bearer(ctx[code]!.hodToken));
      expect(res.status).toBe(200);
      expect(res.body.data.programme.programmeId).toBe(code);
      const legacy = code === 'AIDS'; // owns the migrated legacy semester + subject
      expect(res.body.data.stats).toMatchObject({
        teachers: 1,
        pendingTeacherApprovals: 0,
        students: 1,
        subjects: legacy ? 2 : 1,
        activeSemesters: legacy ? 2 : 1,
      });
      expect(res.body.data.stats.academicYears).toEqual(legacy ? [YEAR, '2024-2025'] : [YEAR]);
    }
  });
});

describe('6. Smart Board receives the programme context', () => {
  it('includes programme, semester, subject, unit and topic for every programme', async () => {
    for (const [code, name] of OFFICIAL) {
      const c = ctx[code]!;
      const res = await request(app)
        .post('/api/v1/academic/smartboard/session')
        .set(bearer(c.teacherToken))
        .send({ subjectId: c.subjectId, focus: { unitNumber: 1, topic: `Topic ${code}` } });
      expect(res.status, JSON.stringify(res.body)).toBe(201);
      const data = res.body.data;
      expect(data.programme).toMatchObject({ programmeId: code, name, type: 'B.E.' });
      expect(data.semester.semesterNumber).toBe(1);
      expect(data.subject.id).toBe(c.subjectId);
      expect(data.focus).toMatchObject({ unitNumber: 1, unitTitle: `Unit One ${code}`, topic: `Topic ${code}` });
      expect(data.boardUrl).toContain(`programmeId=${code}`);
    }
  });

  it('refuses a Smart Board session for another programme’s subject', async () => {
    const res = await request(app)
      .post('/api/v1/academic/smartboard/session')
      .set(bearer(ctx.IT!.hodToken))
      .send({ subjectId: ctx.CIV!.subjectId });
    expect(res.status).toBe(403);
  });
});

describe('7. RAG knowledge is programme-scoped', () => {
  it('derives programme + semester for knowledge records and never retrieves another programme’s chunks', async () => {
    const { KnowledgeDocument, KnowledgeChunk, Subject } = models;
    for (const [code] of OFFICIAL) {
      const c = ctx[code]!;
      const doc = await KnowledgeDocument.create({
        title: `Notes ${code}`,
        documentType: 'NOTES',
        subject: c.subjectId,
        status: 'INDEXED',
        chunkCount: 1,
      });
      expect(String(doc.department)).toBe(c.deptId);
      expect(String(doc.semester)).toBe(c.semesterId);
      const chunk = await KnowledgeChunk.create({
        document: doc._id,
        chunkIndex: 0,
        content: `Shared keyword eigenvalue explanation for ${code}`,
        subject: c.subjectId,
        embedding: [],
      });
      expect(String(chunk.department)).toBe(c.deptId);
    }

    for (const [code] of OFFICIAL) {
      const c = ctx[code]!;
      const subject = await Subject.findById(c.subjectId).lean();
      const own = await AiRagService.retrieveRelevantChunks(c.subjectId, 'eigenvalue explanation', undefined, 20, {
        departmentId: subject.department,
        semesterId: subject.semester,
      });
      expect(own.chunks.length).toBe(1);
      expect(own.chunks.every((ch: any) => String(ch.department) === c.deptId)).toBe(true);

      const other = code === 'IT' ? ctx.CIV! : ctx.IT!;
      const leaked = await AiRagService.retrieveRelevantChunks(c.subjectId, 'eigenvalue explanation', undefined, 20, {
        departmentId: other.deptId,
      });
      expect(leaked.chunks.length).toBe(0);
    }
  });

  it('refuses AI queries from a student of another programme', async () => {
    const res = await request(app)
      .post('/api/v1/ai/query')
      .set(bearer(ctx.CIV!.studentToken))
      .send({ subjectId: ctx.IT!.subjectId, question: 'Explain eigenvalues' });
    expect(res.status).toBe(403);
  });
});

describe('8. Admin programme management', () => {
  it('lists every programme with HOD and statistics', async () => {
    const res = await request(app).get('/api/v1/programmes/manage').set(bearer(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(14);
    const itc = res.body.data.find((p: any) => p.programmeId === 'IT');
    expect(itc.hod.name).toBe('HOD IT');
    expect(itc.stats.students).toBe(1);
  });

  it('is admin-only', async () => {
    const res = await request(app).get('/api/v1/programmes/manage').set(bearer(ctx.IT!.hodToken));
    expect(res.status).toBe(403);
  });

  it('deactivates (archives) without deleting records, then reactivates', async () => {
    const off = await request(app)
      .patch('/api/v1/programmes/MTR/status')
      .set(bearer(adminToken))
      .send({ isActive: false });
    expect(off.status).toBe(200);
    expect(off.body.data.isActive).toBe(false);

    const list = await request(app).get('/api/v1/programmes');
    expect(list.body.data.map((p: any) => p.programmeId)).not.toContain('MTR');

    const reg = await request(app).post('/api/v1/auth/register/student').send({
      name: 'Late Student',
      collegeEmail: '24mtr999@kpriet.ac.in',
      password: PASSWORD,
      programmeId: 'MTR',
      studentIdentifier: '24MTR999',
      currentSemesterNumber: 1,
    });
    expect(reg.status).toBe(400);

    // Records retained
    expect(await models.Subject.countDocuments({ department: ctx.MTR!.deptId })).toBe(1);
    expect(await models.User.countDocuments({ department: ctx.MTR!.deptId, role: 'STUDENT' })).toBe(1);

    const on = await request(app)
      .patch('/api/v1/programmes/MTR/status')
      .set(bearer(adminToken))
      .send({ isActive: true });
    expect(on.body.data.isActive).toBe(true);
    const again = await request(app).get('/api/v1/programmes');
    expect(again.body.data.map((p: any) => p.programmeId)).toContain('MTR');
  });

  it('does not allow renaming or re-coding an official programme outside the master', async () => {
    const res = await request(app)
      .put(`/api/v1/admin/departments/${ctx.ME!.deptId}`)
      .set(bearer(adminToken))
      .send({ name: 'Mech Engg' });
    expect(res.status).toBe(400);

    const details = await request(app)
      .patch('/api/v1/programmes/ME')
      .set(bearer(adminToken))
      .send({ name: 'Mech Engg' });
    expect(details.status).toBe(400);

    const site = await request(app)
      .patch('/api/v1/programmes/ME')
      .set(bearer(adminToken))
      .send({ officialWebsite: 'https://kpriet.ac.in/mechanical' });
    expect(site.status).toBe(200);
    expect(site.body.data.officialWebsite).toBe('https://kpriet.ac.in/mechanical');
    expect(site.body.data.name).toBe('Mechanical Engineering');
  });

  it('keeps an admin-customised website when the seed runs again', async () => {
    await ProgrammeService.seedProgrammeMaster();
    const me = await models.Department.findOne({ code: 'ME' }).lean();
    expect(me.officialWebsite).toBe('https://kpriet.ac.in/mechanical');
  });
});

describe('9. Registration validation', () => {
  it('rejects an unknown programme', async () => {
    const res = await request(app).post('/api/v1/auth/register/teacher').send({
      name: 'Ghost',
      collegeEmail: 'ghost.teacher@kpriet.ac.in',
      password: PASSWORD,
      programmeId: 'NOPE',
      employeeIdentifier: 'FAC-GHOST',
    });
    expect(res.status).toBe(400);
  });

  it('requires a programme', async () => {
    const res = await request(app).post('/api/v1/auth/register/teacher').send({
      name: 'Ghost',
      collegeEmail: 'ghost2.teacher@kpriet.ac.in',
      password: PASSWORD,
      employeeIdentifier: 'FAC-GHOST2',
    });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('programme');
  });

  it('rejects registering into a supporting (non-programme) department', async () => {
    const sh = await models.Department.findOne({ code: 'SH' }).lean();
    const res = await request(app).post('/api/v1/auth/register/teacher').send({
      name: 'SH Faculty',
      collegeEmail: 'sh.faculty@kpriet.ac.in',
      password: PASSWORD,
      departmentId: String(sh._id),
      employeeIdentifier: 'FAC-SH-1',
    });
    expect(res.status).toBe(400);
  });
});
