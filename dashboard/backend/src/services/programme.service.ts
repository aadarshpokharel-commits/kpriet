import mongoose, { Types } from 'mongoose';
import { logger } from '../config/logger.js';
import {
  DEFAULT_REGULATION_LABEL,
  PROGRAMME_MASTER_SEED,
  type IProgrammeMasterSeed,
} from '../constants/programme-master.data.js';
import {
  AcademicFile,
  AuditLog,
  CurriculumUnit,
  Department,
  KnowledgeChunk,
  KnowledgeDocument,
  Programme,
  Semester,
  StudentEnrollment,
  Subject,
  TeacherAssignment,
  User,
  type IDepartment,
} from '../models/index.js';
import {
  AccountStatus,
  ApprovalStatus,
  AuditAction,
  EnrollmentStatus,
  SemesterStatus,
  TeacherAssignmentStatus,
  UserRole,
} from '../types/academic.types.js';
import { ApiError } from '../utils/ApiError.js';

const log = logger.child({ component: 'ProgrammeService' });

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

/** The connection enables `sanitizeFilter`; query operators must be explicitly trusted. */
const q = <T extends object>(operator: T): T => mongoose.trusted(operator) as T;

/** Minimal shape of the authenticated user this service needs. */
export interface IProgrammeActor {
  _id: Types.ObjectId | string;
  role: UserRole | string;
  department?: Types.ObjectId | string | null;
}

/** Public programme representation returned by every /programmes endpoint. */
export interface IProgrammeDTO {
  /** Stable programme identifier (the department code, e.g. "IT"). */
  programmeId: string;
  /** MongoDB ObjectId of the programme record (what every academic record references). */
  id: string;
  _id: string;
  code: string;
  name: string;
  shortName: string;
  type: string;
  officialWebsite: string | null;
  icon: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  regulation: string;
  hod: { id: string; name: string; collegeEmail?: string } | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProgrammeSeedReport {
  created: string[];
  updated: string[];
  migrated: Array<{ from: string; to: string }>;
  conflicts: Array<{ code: string; reason: string }>;
  degreeProgrammesCreated: string[];
  backfill: Record<string, number>;
}

function normaliseName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class ProgrammeService {
  // ═══════════════════════════════════════════════════════════════════════
  // 1. SEED + SAFE MIGRATION (idempotent)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Idempotently ensures the 14 official B.E. programmes exist in the
   * `departments` collection.
   *
   * - Existing records are matched by code, then by a legacy code, then by a
   *   legacy/official name, and are updated IN PLACE (their _id is preserved,
   *   so every subject, semester, curriculum unit, enrollment, teacher
   *   assignment and knowledge record stays linked).
   * - Admin decisions (active/inactive, HOD, custom website) are never reset.
   * - Running it any number of times never creates duplicates.
   */
  static async seedProgrammeMaster(): Promise<IProgrammeSeedReport> {
    const report: IProgrammeSeedReport = {
      created: [],
      updated: [],
      migrated: [],
      conflicts: [],
      degreeProgrammesCreated: [],
      backfill: {},
    };

    const allDepartments = await Department.find({}).lean();
    const claimed = new Set<string>();

    for (const seed of PROGRAMME_MASTER_SEED) {
      const match = this.findSeedMatch(seed, allDepartments, claimed);

      if (match.conflict) {
        report.conflicts.push({ code: seed.code, reason: match.conflict });
      }

      if (!match.doc) {
        const created = await Department.create({
          name: seed.name,
          code: seed.code,
          shortName: seed.shortName,
          type: seed.type,
          programmeType: 'UG',
          isProgramme: true,
          isActive: true,
          status: 'ACTIVE',
          displayOrder: seed.displayOrder,
          officialWebsite: seed.officialWebsite,
          icon: seed.icon,
          description: seed.description,
          legacyCodes: [],
        });
        claimed.add(String(created._id));
        report.created.push(seed.code);
        await this.ensureDegreeProgramme(created, seed, report);
        continue;
      }

      const existing = match.doc;
      claimed.add(String(existing._id));
      const previousCode = String(existing.code || '').toUpperCase();

      const legacyCodes = new Set<string>(
        [...((existing as any).legacyCodes || []), ...(previousCode !== seed.code ? [previousCode] : [])]
          .map((c) => String(c).toUpperCase())
          .filter((c) => c && c !== seed.code)
      );

      const isActive =
        typeof (existing as any).isActive === 'boolean'
          ? (existing as any).isActive
          : existing.status !== 'INACTIVE';

      const $set: Record<string, unknown> = {
        name: seed.name,
        code: seed.code,
        shortName: seed.shortName,
        type: seed.type,
        programmeType: 'UG',
        isProgramme: true,
        isActive,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
        displayOrder: seed.displayOrder,
        legacyCodes: [...legacyCodes],
      };
      // Keep values an administrator has customised.
      if (!(existing as any).officialWebsite) $set.officialWebsite = seed.officialWebsite;
      if (!(existing as any).icon) $set.icon = seed.icon;
      if (!existing.description) $set.description = seed.description;

      const changed =
        existing.name !== seed.name ||
        previousCode !== seed.code ||
        (existing as any).isProgramme !== true ||
        (existing as any).shortName !== seed.shortName ||
        (existing as any).type !== seed.type ||
        (existing as any).displayOrder !== seed.displayOrder ||
        typeof (existing as any).isActive !== 'boolean' ||
        Object.keys($set).some((k) => ['officialWebsite', 'icon', 'description'].includes(k));

      if (changed) {
        await Department.updateOne({ _id: existing._id }, { $set });
        if (previousCode !== seed.code) {
          report.migrated.push({ from: previousCode, to: seed.code });
        } else {
          report.updated.push(seed.code);
        }
      }

      const fresh = await Department.findById(existing._id);
      if (fresh) await this.ensureDegreeProgramme(fresh, seed, report);
    }

    // Any department that is not one of the official programmes is a
    // supporting department (e.g. Science & Humanities): never listed as a programme.
    const officialIds = [...claimed].map((id) => new Types.ObjectId(id));
    await Department.updateMany(
      { _id: q({ $nin: officialIds }), isProgramme: q({ $ne: false }) },
      { $set: { isProgramme: false } }
    );
    await Department.updateMany({ isActive: q({ $exists: false }), status: 'INACTIVE' }, { $set: { isActive: false } });
    await Department.updateMany({ isActive: q({ $exists: false }) }, { $set: { isActive: true } });

    report.backfill = await this.backfillAcademicContext();

    log.info(
      {
        created: report.created.length,
        updated: report.updated.length,
        migrated: report.migrated,
        conflicts: report.conflicts,
      },
      'Programme master synchronised'
    );

    return report;
  }

  /** Finds the existing department that corresponds to an official programme. */
  private static findSeedMatch(
    seed: IProgrammeMasterSeed,
    departments: Array<Record<string, any>>,
    claimed: Set<string>
  ): { doc: Record<string, any> | null; conflict?: string } {
    const available = departments.filter((d) => !claimed.has(String(d._id)));
    const code = seed.code.toUpperCase();
    const legacy = new Set(seed.legacyCodes.map((c) => c.toUpperCase()));
    const names = new Set([seed.name, ...seed.legacyNames].map(normaliseName));

    const byCode = available.find((d) => String(d.code).toUpperCase() === code);
    const byLegacyCode = available.filter(
      (d) =>
        legacy.has(String(d.code).toUpperCase()) ||
        (Array.isArray(d.legacyCodes) && d.legacyCodes.map((c: string) => c.toUpperCase()).includes(code))
    );
    const byName = available.filter((d) => names.has(normaliseName(String(d.name || ''))));

    if (byCode) {
      const duplicates = [...byLegacyCode, ...byName].filter((d) => String(d._id) !== String(byCode._id));
      return {
        doc: byCode,
        conflict: duplicates.length
          ? `Kept ${code}; ${duplicates.length} other record(s) (${duplicates
              .map((d) => d.code)
              .join(', ')}) also match this programme and were left untouched for manual review.`
          : undefined,
      };
    }

    const candidates = [...new Map([...byLegacyCode, ...byName].map((d) => [String(d._id), d])).values()];
    if (candidates.length === 0) return { doc: null };
    if (candidates.length === 1) return { doc: candidates[0] ?? null };

    // Several legacy records match: migrate the one that owns the most data.
    return {
      doc: candidates[0] ?? null,
      conflict: `Multiple legacy records (${candidates
        .map((d) => d.code)
        .join(', ')}) match ${code}; migrated ${candidates[0]?.code}, others left for manual review.`,
    };
  }

  /** Every programme has exactly one degree-programme record (e.g. "B.E. Information Technology"). */
  private static async ensureDegreeProgramme(
    dept: IDepartment,
    seed: IProgrammeMasterSeed,
    report: IProgrammeSeedReport
  ): Promise<void> {
    const existing = await Programme.findOne({ department: dept._id, code: seed.code });
    const name = `${seed.type} ${seed.name}`;
    if (!existing) {
      await Programme.create({
        name,
        code: seed.code,
        degree: seed.type,
        department: dept._id,
        programmeType: 'UG',
        durationYears: 4,
        totalSemesters: 8,
        description: `${seed.type} ${seed.name} (${DEFAULT_REGULATION_LABEL})`,
        status: 'ACTIVE',
      });
      report.degreeProgrammesCreated.push(seed.code);
      return;
    }
    if (existing.name !== name || existing.degree !== seed.type) {
      await Programme.updateOne({ _id: existing._id }, { $set: { name, degree: seed.type } });
    }
  }

  /**
   * Safe migration of records that are missing their academic context.
   * Derives the programme (department) and semester from the record's subject,
   * which is the authoritative owner. Never duplicates or deletes anything.
   */
  static async backfillAcademicContext(): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    const missing = (field: string) => ({ $or: [{ [field]: q({ $exists: false }) }, { [field]: null }] });

    // Semester.programme / CurriculumUnit.programme → the department's degree programme
    const degreeProgrammes = await Programme.find({}).select('_id department code').lean();
    const programmeByDept = new Map<string, Types.ObjectId>();
    for (const p of degreeProgrammes) {
      const key = String(p.department);
      const dept = await Department.findById(p.department).select('code').lean();
      // Prefer the programme whose code equals the department code.
      if (!programmeByDept.has(key) || (dept && dept.code === p.code)) {
        programmeByDept.set(key, p._id as Types.ObjectId);
      }
    }
    let semestersLinked = 0;
    let unitsLinked = 0;
    for (const [deptId, programmeId] of programmeByDept) {
      const s = await Semester.updateMany(
        { department: new Types.ObjectId(deptId), ...missing('programme') },
        { $set: { programme: programmeId } }
      );
      semestersLinked += s.modifiedCount ?? 0;
      const u = await CurriculumUnit.updateMany(
        { department: new Types.ObjectId(deptId), ...missing('programme') },
        { $set: { programme: programmeId } }
      );
      unitsLinked += u.modifiedCount ?? 0;
    }
    result.semestersLinkedToProgramme = semestersLinked;
    result.curriculumUnitsLinkedToProgramme = unitsLinked;

    // Resources that carry a subject but no programme/semester context
    const subjectIds = new Set<string>();
    for (const model of [KnowledgeDocument, KnowledgeChunk, AcademicFile] as any[]) {
      const ids: Types.ObjectId[] = await model.distinct('subject', {
        subject: q({ $ne: null }),
        $or: [...missing('department').$or, ...missing('semester').$or],
      });
      ids.forEach((id) => subjectIds.add(String(id)));
    }

    let resourcesLinked = 0;
    for (const subjectId of subjectIds) {
      const subject = await Subject.findById(subjectId).select('department semester').lean();
      if (!subject) continue;
      for (const model of [KnowledgeDocument, KnowledgeChunk, AcademicFile] as any[]) {
        const a = await model.updateMany(
          { subject: subject._id, ...missing('department') },
          { $set: { department: subject.department } }
        );
        const b = await model.updateMany(
          { subject: subject._id, ...missing('semester') },
          { $set: { semester: subject.semester } }
        );
        resourcesLinked += (a.modifiedCount ?? 0) + (b.modifiedCount ?? 0);
      }
    }
    result.resourcesLinkedToProgramme = resourcesLinked;

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. RESOLUTION + DTO
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Resolves a programme from its stable code ("IT"), a legacy code ("AD")
   * or its ObjectId. Throws 404 when it does not exist.
   */
  static async resolveProgramme(
    programmeId: string | Types.ObjectId | null | undefined,
    options: { requireActive?: boolean; requireProgramme?: boolean } = {}
  ): Promise<IDepartment> {
    const { requireActive = false, requireProgramme = true } = options;
    const raw = String(programmeId ?? '').trim();
    if (!raw) throw ApiError.badRequest('Programme is required.');

    let dept: IDepartment | null = null;
    if (OBJECT_ID_RE.test(raw)) {
      dept = await Department.findById(raw);
    }
    if (!dept) {
      const code = raw.toUpperCase();
      dept =
        (await Department.findOne({ code })) ||
        (await Department.findOne({ legacyCodes: code }));
    }

    if (!dept || (requireProgramme && dept.isProgramme === false)) {
      throw ApiError.notFound('Programme not found.');
    }
    if (requireActive && !this.isActive(dept)) {
      throw ApiError.badRequest(`${dept.name} is not currently accepting new registrations or records.`);
    }
    return dept;
  }

  static isActive(dept: Pick<IDepartment, 'isActive' | 'status'>): boolean {
    if (typeof dept.isActive === 'boolean') return dept.isActive && dept.status !== 'INACTIVE';
    return dept.status !== 'INACTIVE';
  }

  static toDTO(dept: any): IProgrammeDTO {
    const hod = dept.hod && typeof dept.hod === 'object' && 'name' in dept.hod ? dept.hod : null;
    return {
      programmeId: dept.code,
      id: String(dept._id),
      _id: String(dept._id),
      code: dept.code,
      name: dept.name,
      shortName: dept.shortName || dept.code,
      type: dept.type || 'B.E.',
      officialWebsite: dept.officialWebsite || null,
      icon: dept.icon || null,
      description: dept.description || null,
      displayOrder: typeof dept.displayOrder === 'number' ? dept.displayOrder : 999,
      isActive: this.isActive(dept),
      regulation: DEFAULT_REGULATION_LABEL,
      hod: hod ? { id: String(hod._id), name: hod.name, collegeEmail: hod.collegeEmail } : null,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. READ APIs
  // ═══════════════════════════════════════════════════════════════════════

  /** Active programmes (or all, for administrators), in official display order. */
  static async listProgrammes(
    options: { includeInactive?: boolean; search?: string; departmentId?: string } = {}
  ) {
    const query: Record<string, unknown> = { isProgramme: q({ $ne: false }) };
    if (options.departmentId && OBJECT_ID_RE.test(options.departmentId)) query._id = options.departmentId;
    if (!options.includeInactive) {
      query.isActive = q({ $ne: false });
      query.status = q({ $ne: 'INACTIVE' });
    }
    if (options.search?.trim()) {
      const re = new RegExp(escapeRegex(options.search.trim()), 'i');
      query.$or = [{ name: re }, { code: re }, { shortName: re }];
    }
    const docs = await Department.find(query)
      .populate('hod', 'name collegeEmail')
      .sort({ displayOrder: 1, name: 1 })
      .lean();
    return docs.map((d) => this.toDTO(d));
  }

  static async getProgramme(programmeId: string) {
    const dept = await this.resolveProgramme(programmeId);
    await dept.populate('hod', 'name collegeEmail');
    return this.toDTO(dept.toObject());
  }

  /**
   * Public registration options for a programme: which academic years and
   * semesters exist in the curriculum. Returns only non-sensitive labels.
   */
  static async getRegistrationOptions(programmeId: string) {
    const dept = await this.resolveProgramme(programmeId, { requireActive: true });
    const semesters = await Semester.find({ department: dept._id })
      .select('semesterNumber academicYear regulation status')
      .sort({ academicYear: -1, semesterNumber: 1 })
      .lean();

    const academicYears = [...new Set(semesters.map((s) => s.academicYear))].sort().reverse();
    const regulations = [...new Set(semesters.map((s) => s.regulation))];
    return {
      programme: this.toDTO(dept.toObject()),
      academicYears,
      regulations,
      semesters: semesters.map((s) => ({
        semesterId: String(s._id),
        semesterNumber: s.semesterNumber,
        academicYear: s.academicYear,
        regulation: s.regulation,
      })),
      semesterNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
      hasCurriculum: semesters.length > 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. AUTHORIZATION (never trusts the programme id sent by the client)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * - catalog (semesters, subjects, curriculum): admins; the HOD of the
   *   programme; teachers of the programme or teaching in it; students of it.
   * - roster (teachers, students, stats): admins and the programme's HOD only.
   */
  static async assertProgrammeAccess(
    user: IProgrammeActor | undefined,
    dept: IDepartment,
    scope: 'catalog' | 'roster'
  ): Promise<void> {
    if (!user) throw ApiError.unauthenticated('Sign in to continue.');
    const role = user.role;
    if (role === UserRole.ADMIN || role === UserRole.PRINCIPAL) return;

    const ownsProgramme = !!user.department && String(user.department) === String(dept._id);

    if (role === UserRole.HOD) {
      if (ownsProgramme) return;
      throw ApiError.forbidden('HODs can only manage their own programme.');
    }

    if (scope === 'roster') {
      throw ApiError.forbidden('Only administrators and the programme HOD can view this information.');
    }

    if (role === UserRole.TEACHER) {
      if (ownsProgramme) return;
      const teachesHere = await TeacherAssignment.exists({
        teacher: user._id,
        department: dept._id,
        status: TeacherAssignmentStatus.ACTIVE,
      });
      if (teachesHere) return;
      throw ApiError.forbidden('You are not assigned to any subject in this programme.');
    }

    if (role === UserRole.STUDENT && ownsProgramme) return;
    throw ApiError.forbidden('You can only view your own programme.');
  }

  /** Programmes a user is authorised to work in (teachers may teach in several). */
  static async getAuthorisedProgrammeIds(user: IProgrammeActor): Promise<string[] | 'ALL'> {
    if (user.role === UserRole.ADMIN || user.role === UserRole.PRINCIPAL) return 'ALL';
    const ids = new Set<string>();
    if (user.department) ids.add(String(user.department));
    if (user.role === UserRole.TEACHER) {
      const depts = await TeacherAssignment.distinct('department', {
        teacher: user._id,
        status: TeacherAssignmentStatus.ACTIVE,
      });
      depts.forEach((d) => ids.add(String(d)));
    }
    return [...ids];
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5. PROGRAMME-SCOPED DATA (/programmes/:programmeId/...)
  // ═══════════════════════════════════════════════════════════════════════

  static async getSemesters(
    dept: IDepartment,
    user: IProgrammeActor,
    filters: { academicYear?: string } = {}
  ) {
    const query: Record<string, unknown> = { department: dept._id };
    if (filters.academicYear) query.academicYear = filters.academicYear;

    let semesters = await Semester.find(query)
      .populate('programme', 'name code degree')
      .sort({ academicYear: -1, semesterNumber: 1 })
      .lean();

    if (user.role === UserRole.STUDENT) {
      const enrollment = await StudentEnrollment.findOne({
        student: user._id,
        department: dept._id,
        status: EnrollmentStatus.APPROVED,
      }).populate('semester', 'semesterNumber');
      const current = (enrollment?.semester as any)?.semesterNumber ?? 1;
      semesters = semesters.filter((s) => s.semesterNumber <= current);
    }

    return semesters.map((s) => ({
      ...s,
      semesterId: String(s._id),
      programmeId: dept.code,
      programmeName: dept.name,
    }));
  }

  static async getSubjects(
    dept: IDepartment,
    user: IProgrammeActor,
    filters: { semesterId?: string; semesterNumber?: number; academicYear?: string } = {}
  ) {
    const query: Record<string, unknown> = { department: dept._id, status: 'ACTIVE' };
    if (filters.semesterId) query.semester = filters.semesterId;
    if (filters.semesterNumber) query.semesterNumber = filters.semesterNumber;
    if (filters.academicYear) {
      const semIds = await Semester.find({ department: dept._id, academicYear: filters.academicYear }).distinct('_id');
      query.semester = filters.semesterId ? filters.semesterId : q({ $in: semIds });
    }

    if (user.role === UserRole.STUDENT) {
      const enrollments = await StudentEnrollment.find({
        student: user._id,
        department: dept._id,
        status: EnrollmentStatus.APPROVED,
      }).select('enrolledSubjects');
      const allowed = enrollments.flatMap((e) => e.enrolledSubjects);
      query._id = q({ $in: allowed });
    } else if (user.role === UserRole.TEACHER && String(user.department) !== String(dept._id)) {
      // A teacher visiting another programme only sees what they teach there.
      const taught = await TeacherAssignment.distinct('subject', {
        teacher: user._id,
        department: dept._id,
        status: TeacherAssignmentStatus.ACTIVE,
      });
      query._id = q({ $in: taught });
    }

    const subjects = await Subject.find(query)
      .populate('semester', 'semesterNumber academicYear regulation')
      .sort({ semesterNumber: 1, subjectCode: 1 })
      .lean();

    return subjects.map((s) => ({ ...s, subjectId: String(s._id), programmeId: dept.code, programmeName: dept.name }));
  }

  static async getTeachers(dept: IDepartment, filters: { approvalStatus?: string } = {}) {
    // Members of the programme plus anyone teaching one of its subjects.
    const assignedTeacherIds = await TeacherAssignment.distinct('teacher', {
      department: dept._id,
      status: TeacherAssignmentStatus.ACTIVE,
    });
    const query: Record<string, unknown> = {
      role: q({ $in: [UserRole.TEACHER, UserRole.HOD] }),
      $or: [{ department: dept._id }, { _id: q({ $in: assignedTeacherIds }) }],
    };
    if (filters.approvalStatus) query.approvalStatus = filters.approvalStatus;

    const teachers = await User.find(query)
      .select('name collegeEmail identifier role department profile approvalStatus accountStatus createdAt')
      .populate('department', 'name code shortName')
      .sort({ name: 1 })
      .lean();

    const assignments = await TeacherAssignment.find({
      department: dept._id,
      status: TeacherAssignmentStatus.ACTIVE,
    })
      .populate('subject', 'subjectName subjectCode semesterNumber')
      .populate('semester', 'semesterNumber academicYear')
      .lean();

    return teachers.map((t) => ({
      ...t,
      homeProgrammeId: (t.department as any)?.code ?? null,
      assignments: assignments
        .filter((a) => String(a.teacher) === String(t._id))
        .map((a) => ({
          assignmentId: String(a._id),
          subject: a.subject,
          semester: a.semester,
          academicYear: a.academicYear,
          section: a.section,
        })),
    }));
  }

  static async getStudents(
    dept: IDepartment,
    filters: { semesterId?: string; academicYear?: string; section?: string } = {}
  ) {
    const enrollmentQuery: Record<string, unknown> = { department: dept._id };
    if (filters.semesterId) enrollmentQuery.semester = filters.semesterId;
    if (filters.academicYear) enrollmentQuery.academicYear = filters.academicYear;

    const enrollments = await StudentEnrollment.find(enrollmentQuery)
      .populate('semester', 'semesterNumber academicYear regulation')
      .lean();

    const studentQuery: Record<string, unknown> = { role: UserRole.STUDENT, department: dept._id };
    if (filters.semesterId || filters.academicYear) {
      studentQuery._id = q({ $in: enrollments.map((e) => e.student) });
    }
    if (filters.section) studentQuery['profile.section'] = filters.section;

    const students = await User.find(studentQuery)
      .select('name collegeEmail identifier profile accountStatus createdAt')
      .sort({ identifier: 1 })
      .lean();

    return students.map((s) => {
      const own = enrollments.filter((e) => String(e.student) === String(s._id));
      const current = own.find((e) => e.status === EnrollmentStatus.APPROVED) || own[0];
      return {
        ...s,
        programmeId: dept.code,
        currentSemester: current?.semester ?? null,
        enrollmentStatus: current?.status ?? null,
        academicYear: current?.academicYear ?? null,
      };
    });
  }

  /** Programme → Regulation → Academic Year → Semester → Subject → Unit → Topic tree. */
  static async getCurriculum(
    dept: IDepartment,
    user: IProgrammeActor,
    filters: { semesterId?: string; academicYear?: string } = {}
  ) {
    const semesters = await this.getSemesters(dept, user, { academicYear: filters.academicYear });
    const selectedSemesters = filters.semesterId
      ? semesters.filter((s) => String(s._id) === String(filters.semesterId))
      : semesters;
    const subjects = await this.getSubjects(dept, user, {
      semesterId: filters.semesterId,
      academicYear: filters.academicYear,
    });
    const units = await CurriculumUnit.find({
      department: dept._id,
      subject: q({ $in: subjects.map((s) => s._id) }),
    })
      .select('subject unitNumber unitCode title topics subtopics hours')
      .sort({ unitNumber: 1 })
      .lean();

    const tree: Record<string, Record<string, any[]>> = {};
    for (const sem of selectedSemesters) {
      const reg = sem.regulation || 'R2021';
      tree[reg] ??= {};
      tree[reg][sem.academicYear] ??= [];
      const semSubjects = subjects.filter((s) => String((s.semester as any)?._id ?? s.semester) === String(sem._id));
      tree[reg][sem.academicYear]!.push({
        semesterId: String(sem._id),
        semesterNumber: sem.semesterNumber,
        status: sem.status,
        subjects: semSubjects.map((sub) => {
          const subUnits = units.filter((u) => String(u.subject) === String(sub._id));
          const syllabus = (sub as any).syllabus || [];
          return {
            subjectId: String(sub._id),
            subjectCode: sub.subjectCode,
            subjectName: sub.subjectName,
            credits: sub.credits,
            units: (subUnits.length ? subUnits : syllabus).map((u: any, idx: number) => ({
              unitId: u._id ? String(u._id) : null,
              unitNumber: u.unitNumber ?? u.chapterNumber ?? idx + 1,
              title: u.title,
              topics: (u.topics || []).map((t: string) => ({ title: t })),
            })),
          };
        }),
      });
    }

    return {
      institution: 'KPR Institute of Engineering and Technology',
      programme: this.toDTO(dept.toObject()),
      regulations: Object.entries(tree).map(([regulation, years]) => ({
        regulation,
        academicYears: Object.entries(years).map(([academicYear, sems]) => ({
          academicYear,
          semesters: sems.sort((a, b) => a.semesterNumber - b.semesterNumber),
        })),
      })),
    };
  }

  static async getStats(dept: IDepartment) {
    const deptId = dept._id;
    const [
      teachers,
      approvedTeachers,
      pendingTeacherApprovals,
      students,
      subjects,
      activeSemesters,
      semesters,
      pendingEnrollments,
      curriculumUnits,
      teacherAssignments,
      knowledgeDocuments,
      academicYears,
    ] = await Promise.all([
      User.countDocuments({ department: deptId, role: UserRole.TEACHER }),
      User.countDocuments({ department: deptId, role: UserRole.TEACHER, approvalStatus: ApprovalStatus.APPROVED }),
      User.countDocuments({ department: deptId, role: UserRole.TEACHER, approvalStatus: ApprovalStatus.PENDING }),
      User.countDocuments({ department: deptId, role: UserRole.STUDENT, accountStatus: q({ $ne: AccountStatus.INACTIVE }) }),
      Subject.countDocuments({ department: deptId, status: 'ACTIVE' }),
      Semester.countDocuments({ department: deptId, status: SemesterStatus.ACTIVE }),
      Semester.countDocuments({ department: deptId }),
      StudentEnrollment.countDocuments({ department: deptId, status: EnrollmentStatus.PENDING }),
      CurriculumUnit.countDocuments({ department: deptId }),
      TeacherAssignment.countDocuments({ department: deptId, status: TeacherAssignmentStatus.ACTIVE }),
      KnowledgeDocument.countDocuments({ department: deptId }),
      Semester.distinct('academicYear', { department: deptId }),
    ]);

    return {
      teachers,
      approvedTeachers,
      pendingTeacherApprovals,
      students,
      subjects,
      activeSemesters,
      semesters,
      pendingEnrollments,
      curriculumUnits,
      teacherAssignments,
      knowledgeDocuments,
      academicYears: academicYears.sort().reverse(),
    };
  }

  /** Admin Programme Management: every programme with its HOD and live statistics. */
  static async listProgrammesWithStats() {
    const programmes = await Department.find({ isProgramme: q({ $ne: false }) })
      .populate('hod', 'name collegeEmail')
      .sort({ displayOrder: 1, name: 1 });

    return Promise.all(
      programmes.map(async (p) => ({
        ...this.toDTO(p.toObject()),
        archivedAt: p.archivedAt ?? null,
        stats: await this.getStats(p),
      }))
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 6. ADMIN MUTATIONS (no hard delete — deactivate = archive)
  // ═══════════════════════════════════════════════════════════════════════

  static async setActive(
    programmeId: string,
    isActive: boolean,
    admin: IProgrammeActor,
    meta: { ip?: string; userAgent?: string } = {}
  ) {
    const dept = await this.resolveProgramme(programmeId);
    const before = this.isActive(dept);
    dept.isActive = isActive;
    dept.status = isActive ? 'ACTIVE' : 'INACTIVE';
    dept.archivedAt = isActive ? null : new Date();
    await dept.save();

    await AuditLog.create({
      user: admin._id,
      action: AuditAction.ADMIN_ACTION,
      entityType: 'Department',
      entityId: String(dept._id),
      department: dept._id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      details: {
        action: isActive ? 'ACTIVATE_PROGRAMME' : 'DEACTIVATE_PROGRAMME',
        programmeId: dept.code,
        before,
        after: isActive,
        note: 'Programme records are retained; deactivation only hides the programme from new registrations and pickers.',
      },
    });

    await dept.populate('hod', 'name collegeEmail');
    return this.toDTO(dept.toObject());
  }

  /** Only presentation fields are editable; the official name and code come from the master seed. */
  static async updateProgrammeDetails(
    programmeId: string,
    data: { officialWebsite?: string | null; description?: string | null; icon?: string | null },
    admin: IProgrammeActor,
    meta: { ip?: string; userAgent?: string } = {}
  ) {
    const dept = await this.resolveProgramme(programmeId);
    if (data.officialWebsite !== undefined) dept.officialWebsite = data.officialWebsite || undefined;
    if (data.description !== undefined) dept.description = data.description || undefined;
    if (data.icon !== undefined) dept.icon = data.icon || undefined;
    await dept.save();

    await AuditLog.create({
      user: admin._id,
      action: AuditAction.ADMIN_ACTION,
      entityType: 'Department',
      entityId: String(dept._id),
      department: dept._id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      details: { action: 'UPDATE_PROGRAMME_DETAILS', programmeId: dept.code, fields: Object.keys(data) },
    });

    await dept.populate('hod', 'name collegeEmail');
    return this.toDTO(dept.toObject());
  }
}
