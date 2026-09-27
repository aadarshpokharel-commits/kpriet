import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { logger } from '../config/logger.js';
import {
  Department,
  Programme,
  Semester,
  Subject,
  CurriculumUnit,
  TeacherAssignment,
  StudentEnrollment,
  User,
} from '../models/index.js';
import {
  ProgrammeType,
  AccountStatus,
  ApprovalStatus,
  TeacherAssignmentStatus,
  UserRole,
} from '../types/academic.types.js';

const log = logger.child({ component: 'U25Rma101SeedService' });

export const U25RMA101_SYLLABUS = [
  {
    unitNumber: 1,
    unitCode: 'UNIT I',
    title: 'DIFFERENTIAL CALCULUS',
    description: "Functions of two variables; Partial derivatives; Total derivatives; Taylor's formula for functions of two variables; Extreme Values.",
    syllabusText: "DIFFERENTIAL CALCULUS — Functions of two variables; Partial derivatives; Total derivatives; Taylor's formula for functions of two variables; Extreme Values.",
    topics: [
      'Functions of two variables',
      'Partial derivatives',
      'Total derivatives',
      "Taylor's formula for functions of two variables",
      'Extreme Values',
    ],
    hours: 12,
  },
  {
    unitNumber: 2,
    unitCode: 'UNIT II',
    title: 'INTEGRAL CALCULUS',
    description: "Double integrals; Double integrals over rectangles; Double integrals over general regions; Fubini's theorem (statement only); Area and Volume by double integration; Reversing the order of integration.",
    syllabusText: "INTEGRAL CALCULUS — Double integrals; Double integrals over rectangles; Double integrals over general regions; Fubini's theorem (statement only); Area and Volume by double integration; Reversing the order of integration.",
    topics: [
      'Double integrals',
      'Double integrals over rectangles',
      'Double integrals over general regions',
      "Fubini's theorem (statement only)",
      'Area and Volume by double integration',
      'Reversing the order of integration',
    ],
    hours: 12,
  },
  {
    unitNumber: 3,
    unitCode: 'UNIT III',
    title: 'VECTOR CALCULUS',
    description: "Differentiation in vector field; Gradient of a scalar field; Directional derivative; Divergence of a vector field; Curl of a vector field; Integration in vector field; Line integrals; Work; Circulation and flux; Path independence; Conservative fields; Green's theorem; Gauss divergence theorem; Stokes' theorem.",
    syllabusText: "VECTOR CALCULUS — Differentiation in vector field; Gradient of a scalar field; Directional derivative; Divergence of a vector field; Curl of a vector field; Integration in vector field; Line integrals; Work; Circulation and flux; Path independence; Conservative fields; Green's theorem; Gauss divergence theorem; Stokes' theorem.",
    topics: [
      'Differentiation in vector field',
      'Gradient of a scalar field',
      'Directional derivative',
      'Divergence of a vector field',
      'Curl of a vector field',
      'Integration in vector field',
      'Line integrals',
      'Work',
      'Circulation and flux',
      'Path independence',
      'Conservative fields',
      "Green's theorem",
      'Gauss divergence theorem',
      "Stokes' theorem",
    ],
    hours: 12,
  },
  {
    unitNumber: 4,
    unitCode: 'UNIT IV',
    title: 'FIRST ORDER LINEAR ORDINARY DIFFERENTIAL EQUATIONS',
    description: 'Basic concepts of ordinary differential equations; Separable and exact differential equations; Integrating factors and first-order linear differential equations; Mathematical modelling of real-world problems.',
    syllabusText: 'FIRST ORDER LINEAR ORDINARY DIFFERENTIAL EQUATIONS — Basic concepts of ordinary differential equations; Separable and exact differential equations; Integrating factors and first-order linear differential equations; Mathematical modelling of real-world problems.',
    topics: [
      'Basic concepts of ordinary differential equations',
      'Separable and exact differential equations',
      'Integrating factors and first-order linear differential equations',
      'Mathematical modelling of real-world problems',
    ],
    hours: 12,
  },
  {
    unitNumber: 5,
    unitCode: 'UNIT V',
    title: 'SECOND ORDER LINEAR DIFFERENTIAL EQUATIONS',
    description: 'Homogeneous linear equations of second order; Linearity principle; Second order homogeneous equations with constant coefficients; Euler–Cauchy equation; Non-homogeneous linear second-order solution by variation of parameters.',
    syllabusText: 'SECOND ORDER LINEAR DIFFERENTIAL EQUATIONS — Homogeneous linear equations of second order; Linearity principle; Second order homogeneous equations with constant coefficients; Euler–Cauchy equation; Non-homogeneous linear second-order solution by variation of parameters.',
    topics: [
      'Homogeneous linear equations of second order',
      'Linearity principle',
      'Second order homogeneous equations with constant coefficients',
      'Euler–Cauchy equation',
      'Non-homogeneous linear second-order solution by variation of parameters',
    ],
    hours: 12,
  },
];

export class U25Rma101SeedService {
  /**
   * Idempotent integration of U25RMA101 (Multivariable Calculus and Applications)
   * for IT Department -> Semester I, with Mathematics Teacher.
   */
  static async seedU25Rma101(): Promise<{
    subject: any;
    teacher: any;
    assignment: any;
    curriculumUnitsCount: number;
    syncedEnrollmentsCount: number;
  }> {
    log.info('Seeding U25RMA101 Multivariable Calculus and Applications...');

    // 1. Resolve IT Department (must exist)
    const itDept = await Department.findOne({ code: 'IT' });
    if (!itDept) {
      throw new Error('IT Department record not found in database.');
    }

    // 2. Resolve IT Programme (linked to IT Department)
    const itProgramme = await Programme.findOne({ department: itDept._id });

    // 3. Resolve IT Semester 1
    const itSem1 = await Semester.findOne({
      department: itDept._id,
      semesterNumber: 1,
    });
    if (!itSem1) {
      throw new Error('IT Semester 1 record not found in database.');
    }

    // 4. Ensure Supporting Department: Mathematics
    //    (isProgramme: false ensures it never leaks into the 14 B.E. degree programmes)
    const mathDept = await Department.findOneAndUpdate(
      { code: 'MATH' },
      {
        $set: {
          name: 'Mathematics',
          code: 'MATH',
          shortName: 'Math',
          type: 'Department',
          programmeType: ProgrammeType.UG,
          isProgramme: false,
          description: 'Department of Mathematics — Faculty of Science and Humanities',
        },
        $setOnInsert: {
          status: 'ACTIVE',
          isActive: true,
          displayOrder: 998,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 5. Create or update Mathematics Teacher
    //    Display Name: Mathematics Teacher
    //    Username: math.teacher
    //    Password: Math@12345 (securely bcrypt hashed)
    //    Role: Teacher
    //    Department: Mathematics (home department)
    const mathPasswordHash = await bcrypt.hash('Math@12345', 10);
    const mathTeacher = await User.findOneAndUpdate(
      { collegeEmail: 'math.teacher@kpriet.ac.in' },
      {
        $set: {
          name: 'Mathematics Teacher',
          collegeEmail: 'math.teacher@kpriet.ac.in',
          passwordHash: mathPasswordHash,
          role: UserRole.TEACHER,
          department: mathDept._id,
          identifier: 'math.teacher',
          profile: {
            designation: 'Assistant Professor (Mathematics)',
            specialization: 'Multivariable Calculus & Differential Equations',
          },
          accountStatus: AccountStatus.ACTIVE,
          approvalStatus: ApprovalStatus.APPROVED,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 6. Create or update Subject: U25RMA101
    //    Subject Code: U25RMA101
    //    Subject Name: Multivariable Calculus and Applications
    //    Department: IT
    //    Semester: I
    //    Category: BSC
    //    L-T-P-J-C: 3-1-0-0-4
    //    Total Contact Periods: 60
    const subject = await Subject.findOneAndUpdate(
      {
        subjectCode: 'U25RMA101',
        department: itDept._id,
        semester: itSem1._id,
      },
      {
        $set: {
          subjectName: 'Multivariable Calculus and Applications',
          subjectCode: 'U25RMA101',
          department: itDept._id,
          semester: itSem1._id,
          semesterNumber: 1,
          credits: 4,
          category: 'BSC',
          isElectiveSlot: false,
          practicalInfo: 'L-T-P-J-C: 3-1-0-0-4 | Total Contact Periods: 60',
          description: 'Multivariable Calculus and Applications for Information Technology students.',
          icon: '📐',
          color: '#2563eb',
          syllabus: U25RMA101_SYLLABUS,
          status: 'ACTIVE',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 7. Seed CurriculumUnit documents for each of the 5 units
    let curriculumUnitsCount = 0;
    for (const unit of U25RMA101_SYLLABUS) {
      await CurriculumUnit.findOneAndUpdate(
        {
          subject: subject._id,
          unitNumber: unit.unitNumber,
        },
        {
          $set: {
            subject: subject._id,
            subjectCode: 'U25RMA101',
            department: itDept._id,
            programme: itProgramme?._id,
            semester: itSem1._id,
            semesterNumber: 1,
            unitNumber: unit.unitNumber,
            unitCode: unit.unitCode,
            title: unit.title,
            description: unit.description,
            syllabusText: unit.syllabusText,
            topics: unit.topics,
            estimatedHours: unit.hours,
            order: unit.unitNumber,
            status: 'ACTIVE',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      curriculumUnitsCount++;
    }

    // 8. Teacher Subject Assignment
    //    Teacher: Mathematics Teacher
    //    Context: IT -> Semester I -> U25RMA101
    const assignment = await TeacherAssignment.findOneAndUpdate(
      {
        teacher: mathTeacher._id,
        subject: subject._id,
        semester: itSem1._id,
        academicYear: '2024-2025',
        section: 'A',
      },
      {
        $set: {
          teacher: mathTeacher._id,
          subject: subject._id,
          department: itDept._id,
          semester: itSem1._id,
          academicYear: '2024-2025',
          section: 'A',
          isCoordinator: true,
          status: TeacherAssignmentStatus.ACTIVE,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 9. Sync Student Enrollment:
    //    Ensure all IT Semester 1 enrolled students have U25RMA101 in enrolledSubjects
    const enrollRes = await StudentEnrollment.updateMany(
      {
        department: itDept._id,
        semester: itSem1._id,
      },
      {
        $addToSet: {
          enrolledSubjects: subject._id,
        },
      }
    );

    log.info(
      {
        subjectCode: subject.subjectCode,
        teacher: mathTeacher.name,
        unitsCount: curriculumUnitsCount,
        syncedEnrollments: enrollRes.modifiedCount,
      },
      'Successfully integrated U25RMA101 and Mathematics Teacher.'
    );

    return {
      subject,
      teacher: mathTeacher,
      assignment,
      curriculumUnitsCount,
      syncedEnrollmentsCount: enrollRes.modifiedCount,
    };
  }
}
