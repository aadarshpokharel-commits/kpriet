import { Types } from 'mongoose';
import { logger } from '../config/logger.js';
import { ProgrammeService } from './programme.service.js';
import {
  Department,
  Programme,
  Semester,
  Subject,
  CurriculumUnit,
  ProfessionalElective,
  OpenElective,
  TeacherAssignment,
  StudentEnrollment,
  User,
} from '../models/index.js';
import {
  IT_DEPARTMENT_SEED,
  IT_PROGRAMME_SEED,
  IT_SEMESTERS_SEED,
  IT_SUBJECTS_SEED,
  IT_PROFESSIONAL_ELECTIVES_SEED,
  IT_OPEN_ELECTIVES_SEED,
} from '../constants/it-curriculum-data.js';
import {
  SemesterStatus,
  TeacherAssignmentStatus,
  UserRole,
} from '../types/academic.types.js';

const log = logger.child({ component: 'CurriculumSeedService' });

export class CurriculumSeedService {
  /**
   * Idempotent Seeder for the complete B.Tech Information Technology (R2021 CBCS) Curriculum.
   * Ensures 0 duplicates on multiple executions.
   */
  static async seedCompleteITCurriculum(): Promise<{
    department: any;
    programme: any;
    semestersCount: number;
    subjectsCount: number;
    unitsCount: number;
    pecsCount: number;
    oecsCount: number;
    assignmentsCount: number;
  }> {
    log.info('Starting idempotent seeding of IT R2021 CBCS Curriculum...');

    // 1. Programme / Department — owned by the central programme master.
    //    The IT record keeps its existing _id; the name, code and active flag
    //    come from the master (an administrator's deactivation is never undone here).
    let department = await Department.findOne({ code: IT_DEPARTMENT_SEED.code });
    if (!department || department.isProgramme !== true) {
      await ProgrammeService.seedProgrammeMaster();
      department = await Department.findOne({ code: IT_DEPARTMENT_SEED.code });
    }
    if (!department) {
      throw new Error('Programme master is missing the Information Technology programme.');
    }

    // 2. Degree programme (B.E. Information Technology) linked to the programme master
    const programme = await Programme.findOneAndUpdate(
      { code: IT_PROGRAMME_SEED.code, department: department._id },
      {
        $set: {
          name: `${department.type || IT_PROGRAMME_SEED.degree} ${department.name}`,
          code: IT_PROGRAMME_SEED.code,
          degree: department.type || IT_PROGRAMME_SEED.degree,
          department: department._id,
          programmeType: IT_PROGRAMME_SEED.programmeType,
          durationYears: IT_PROGRAMME_SEED.durationYears,
          totalSemesters: IT_PROGRAMME_SEED.totalSemesters,
          description: IT_PROGRAMME_SEED.description,
        },
        $setOnInsert: { status: 'ACTIVE' },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 3. Semesters 1 through 8
    const semesterMap = new Map<number, any>();
    for (const semData of IT_SEMESTERS_SEED) {
      const sem = await Semester.findOneAndUpdate(
        {
          department: department._id,
          semesterNumber: semData.semesterNumber,
          regulation: semData.regulation,
          academicYear: semData.academicYear,
        },
        {
          department: department._id,
          programme: programme._id,
          semesterNumber: semData.semesterNumber,
          academicYear: semData.academicYear,
          regulation: semData.regulation,
          status: SemesterStatus.ACTIVE,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      semesterMap.set(semData.semesterNumber, sem);
    }

    // 4. Subjects & Embedded Units
    let totalSubjects = 0;
    let totalUnits = 0;

    for (const subData of IT_SUBJECTS_SEED) {
      const semester = semesterMap.get(subData.semesterNumber);
      if (!semester) continue;

      // Map syllabus units with ObjectIds
      const mappedSyllabus = subData.syllabus.map((u, idx) => ({
        unitNumber: u.unitNumber || idx + 1,
        unitCode: u.unitCode || `UNIT ${idx + 1}`,
        title: u.title,
        description: u.description || '',
        syllabusText: u.syllabusText || u.description || '',
        topics: u.topics || [],
        hours: u.hours || 9,
      }));

      const subject = await Subject.findOneAndUpdate(
        {
          subjectCode: subData.subjectCode,
          department: department._id,
          semester: semester._id,
        },
        {
          subjectName: subData.subjectName,
          subjectCode: subData.subjectCode,
          department: department._id,
          semester: semester._id,
          semesterNumber: subData.semesterNumber,
          credits: subData.credits,
          category: subData.category,
          isElectiveSlot: subData.isElectiveSlot || false,
          electiveSlotType: subData.electiveSlotType || undefined,
          electiveSlotCode: subData.electiveSlotCode || undefined,
          practicalInfo: subData.practicalInfo || undefined,
          syllabus: mappedSyllabus,
          status: 'ACTIVE',
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      totalSubjects++;

      // 5. Seed separate CurriculumUnit documents
      for (const u of subData.syllabus) {
        await CurriculumUnit.findOneAndUpdate(
          {
            subject: subject._id,
            unitNumber: u.unitNumber,
          },
          {
            subject: subject._id,
            subjectCode: subject.subjectCode,
            department: department._id,
            programme: programme._id,
            semester: semester._id,
            semesterNumber: subject.semesterNumber,
            unitNumber: u.unitNumber,
            unitCode: u.unitCode,
            title: u.title,
            description: u.description,
            syllabusText: u.syllabusText,
            topics: u.topics,
            estimatedHours: u.hours || 9,
            order: u.unitNumber,
            status: 'ACTIVE',
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        totalUnits++;
      }
    }

    // 4b. Clean up legacy mock/dummy subjects for this department that are not in the R2021 curriculum
    const validCodes = new Set(IT_SUBJECTS_SEED.map((s) => s.subjectCode.toUpperCase()));
    const allDeptSubjects = await Subject.find({ department: department._id });
    const staleSubjects = allDeptSubjects.filter((s) => !validCodes.has((s.subjectCode || '').toUpperCase()));
    if (staleSubjects.length > 0) {
      for (const staleSub of staleSubjects) {
        await Subject.findByIdAndDelete(staleSub._id);
        await CurriculumUnit.deleteMany({ subject: staleSub._id });
      }
      log.info({ count: staleSubjects.length }, 'Cleaned up stale non-curriculum subjects');
    }

    // 6. Professional Electives (48 courses across 6 verticals)
    let totalPecs = 0;
    for (const pecData of IT_PROFESSIONAL_ELECTIVES_SEED) {
      await ProfessionalElective.findOneAndUpdate(
        {
          code: pecData.code,
          department: department._id,
        },
        {
          code: pecData.code,
          name: pecData.name,
          department: department._id,
          programme: programme._id,
          vertical: pecData.vertical,
          verticalNumber: pecData.verticalNumber,
          verticalName: pecData.verticalName,
          credits: pecData.credits,
          category: 'PEC',
          sourcePage: pecData.sourcePage || undefined,
          syllabusSummary: pecData.syllabusSummary,
          topics: pecData.topics,
          slots: pecData.slots,
          semesters: pecData.semesters,
          status: 'ACTIVE',
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      totalPecs++;
    }

    // 7. Open Electives (8 courses)
    let totalOecs = 0;
    for (const oecData of IT_OPEN_ELECTIVES_SEED) {
      await OpenElective.findOneAndUpdate(
        {
          code: oecData.code,
          department: department._id,
          semesterNumber: oecData.semesterNumber,
        },
        {
          code: oecData.code,
          name: oecData.name,
          department: department._id,
          programme: programme._id,
          group: oecData.group,
          slot: oecData.slot,
          semesterNumber: oecData.semesterNumber,
          credits: oecData.credits,
          category: 'OEC',
          syllabusSummary: oecData.syllabusSummary,
          topics: oecData.topics,
          status: 'ACTIVE',
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      totalOecs++;
    }

    // 8. Auto-assign Demo Teaching Faculty to a representative set of courses across semesters
    let totalAssignments = 0;
    const demoTeacher = await User.findOne({
      role: UserRole.TEACHER,
      $or: [
        { collegeEmail: 'faculty@kpriet.ac.in' },
        { collegeEmail: 'teacher@kpriet.ac.in' },
      ],
    });

    if (demoTeacher) {
      const demoSubjects = await Subject.find({
        department: department._id,
        subjectCode: {
          $in: [
            'U21MA101', // Sem 1: Calculus and Differential Equations
            'U21CSG02', // Sem 2: Python Programming
            'U21CSG03', // Sem 3: Data Structures
            'U21AD303', // Sem 3: Programming Using Java
            'U21CS401', // Sem 4: Design and Analysis of Algorithms
            'U21CS403', // Sem 4: Operating Systems
            'U21ITG01', // Sem 5: Software Engineering
            'U21ITG02', // Sem 5: Information Security
            'U21IT601', // Sem 6: Machine Learning Techniques
            'U21IT702', // Sem 7: Cloud Computing
          ],
        },
      });

      for (const sub of demoSubjects) {
        await TeacherAssignment.findOneAndUpdate(
          {
            teacher: demoTeacher._id,
            subject: sub._id,
            semester: sub.semester,
            academicYear: '2024-2025',
            section: 'A',
          },
          {
            teacher: demoTeacher._id,
            subject: sub._id,
            semester: sub.semester,
            department: department._id,
            academicYear: '2024-2025',
            section: 'A',
            isCoordinator: true,
            status: TeacherAssignmentStatus.ACTIVE,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        totalAssignments++;
      }
    }

    // 9. Sync Student Enrollments: Ensure all students enrolled in any semester have all authoritative curriculum subjects for that semester
    let syncedEnrollments = 0;
    for (let semNum = 1; semNum <= 8; semNum++) {
      const semDoc = semesterMap.get(semNum);
      if (!semDoc) continue;

      const semSubjects = await Subject.find({
        department: department._id,
        semester: semDoc._id,
        status: 'ACTIVE',
      });
      const semSubjectIds = semSubjects.map((s) => s._id);

      if (semSubjectIds.length > 0) {
        const res = await StudentEnrollment.updateMany(
          {
            department: department._id,
            semester: semDoc._id,
          },
          {
            $set: {
              enrolledSubjects: semSubjectIds,
            },
          }
        );
        syncedEnrollments += res.modifiedCount;
      }
    }

    log.info(
      {
        totalSubjects,
        totalUnits,
        totalPecs,
        totalOecs,
        totalAssignments,
        syncedEnrollments,
      },
      'Completed IT R2021 CBCS curriculum seeding successfully.'
    );

    return {
      department,
      programme,
      semestersCount: semesterMap.size,
      subjectsCount: totalSubjects,
      unitsCount: totalUnits,
      pecsCount: totalPecs,
      oecsCount: totalOecs,
      assignmentsCount: totalAssignments,
    };
  }
}
