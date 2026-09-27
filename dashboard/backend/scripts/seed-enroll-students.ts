import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  Department,
  Semester,
  Subject,
  User,
  StudentEnrollment,
} from '../src/models/index.js';
import {
  UserRole,
  AccountStatus,
  ApprovalStatus,
  EnrollmentStatus,
} from '../src/types/academic.types.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduverse';

// Diverse South Indian names for realistic KPRIET student profiles
const STUDENT_NAMES = [
  'Aadhavan K',
  'Ananya Ramesh',
  'Balaji S',
  'Divya Bharathi M',
  'Harish Kumar V',
  'Kaviya Priya N',
  'Naveen Raj P',
  'Pooja Devi R',
  'Sanjay Vignesh T',
  'Swetha M',
];

async function seedEnrollStudents() {
  console.log('🔄 Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected successfully.');

  const itDept = await Department.findOne({
    $or: [{ code: 'IT' }, { _id: '6ab40430dcfcae09aed4df2a' }],
  });

  if (!itDept) {
    console.error('❌ IT Department not found!');
    process.exit(1);
  }

  console.log(`📌 IT Department: ${itDept.name} (${itDept._id})`);

  const passwordHash = await bcrypt.hash('Student@123', 10);
  let totalStudentsCreated = 0;
  let totalEnrollmentsCreated = 0;

  for (let sem = 1; sem <= 8; sem++) {
    // 1. Locate Semester document
    const semDoc = await Semester.findOne({
      department: itDept._id,
      semesterNumber: sem,
    });

    if (!semDoc) {
      console.warn(`⚠️ Semester ${sem} not found for IT department. Skipping.`);
      continue;
    }

    // 2. Locate all subjects in this semester
    const subjects = await Subject.find({
      department: itDept._id,
      semester: semDoc._id,
    });

    const subjectIds = subjects.map((s) => s._id);
    console.log(`\n📚 Semester ${sem}: Found ${subjects.length} subjects.`);

    if (subjects.length === 0) {
      console.warn(`⚠️ No subjects found for Semester ${sem}`);
      continue;
    }

    // Determine batch year based on semester
    // Sem 1-2: 2024 batch (24IT...), Sem 3-4: 2023 batch (23IT...), Sem 5-6: 2022 batch (22IT...), Sem 7-8: 2021 batch (21IT...)
    const batchYear = sem <= 2 ? 24 : sem <= 4 ? 23 : sem <= 6 ? 22 : 21;
    const academicYear = semDoc.academicYear || '2024-2025';

    // 3. Create or update 10 students for this semester
    const semStudents: any[] = [];
    for (let i = 1; i <= 10; i++) {
      const padNum = String(i).padStart(2, '0');
      const rollNumber = `${batchYear}IT${sem}${padNum}`;
      const email = `${rollNumber.toLowerCase()}@kpriet.ac.in`;
      const name = `${STUDENT_NAMES[i - 1]}`;

      const student = await User.findOneAndUpdate(
        { $or: [{ collegeEmail: email }, { identifier: rollNumber }] },
        {
          $set: {
            name,
            collegeEmail: email,
            passwordHash,
            role: UserRole.STUDENT,
            department: itDept._id,
            identifier: rollNumber,
            profile: {
              designation: 'Undergraduate Scholar',
              batch: `20${batchYear}-20${batchYear + 4}`,
              section: 'A',
              specialization: 'Information Technology',
              bio: `B.Tech IT Student at KPRIET, Semester ${sem}.`,
            },
            accountStatus: AccountStatus.ACTIVE,
            approvalStatus: ApprovalStatus.APPROVED,
            approvedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      semStudents.push(student);
      totalStudentsCreated++;

      // 4. Enroll student into ALL subjects of this semester
      await StudentEnrollment.findOneAndUpdate(
        {
          student: student._id,
          semester: semDoc._id,
        },
        {
          $set: {
            student: student._id,
            department: itDept._id,
            semester: semDoc._id,
            academicYear,
            enrolledSubjects: subjectIds,
            status: EnrollmentStatus.APPROVED,
            requestedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            approvedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 days ago
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      totalEnrollmentsCreated++;
    }

    // Clean up any stale enrollments for this semester from prior test runs
    const validStudentIds = semStudents.map((s) => s._id);
    const deletedStale = await StudentEnrollment.deleteMany({
      semester: semDoc._id,
      student: { $nin: validStudentIds },
    });
    if (deletedStale.deletedCount > 0) {
      console.log(`  🧹 Cleaned up ${deletedStale.deletedCount} stale/duplicate enrollments in Sem ${sem}`);
    }

    console.log(`  ✔ Enrolled 10 students into all ${subjects.length} subjects in Semester ${sem}`);
  }

  // 5. Verify enrollment counts per subject
  console.log('\n=============================================');
  console.log('🔍 VERIFYING ENROLLMENT COUNTS PER SUBJECT');
  console.log('=============================================');

  const allSubjects = await Subject.find({ department: itDept._id }).sort({
    semesterNumber: 1,
    subjectCode: 1,
  });

  let verifiedCount = 0;
  for (const s of allSubjects) {
    const enrolledCount = await StudentEnrollment.countDocuments({
      status: EnrollmentStatus.APPROVED,
      enrolledSubjects: s._id,
    });
    if (enrolledCount !== 10) {
      console.warn(`⚠️ [Sem ${s.semesterNumber}] ${s.subjectCode}: ${enrolledCount} students (expected 10)`);
    } else {
      verifiedCount++;
    }
  }

  console.log(`\n🎉 Verification Complete: ${verifiedCount} of ${allSubjects.length} subjects have EXACTLY 10 enrolled students!`);
  console.log(`- Total Students Upserted: ${totalStudentsCreated}`);
  console.log(`- Total Semester Enrollments: ${totalEnrollmentsCreated}`);
  console.log('=============================================\n');

  await mongoose.disconnect();
}

seedEnrollStudents().catch((err) => {
  console.error('❌ Error enrolling students:', err);
  process.exit(1);
});
