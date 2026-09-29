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

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://23it040_db_user:q2zUTOiG8a8Konpp@cluster0.mxbtbyz.mongodb.net/eduverse?retryWrites=true&w=majority&appName=Cluster0';

async function seedItSemesterStudents() {
  console.log('🚀 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✔ Connected to MongoDB successfully.');

  const itDept = await Department.findOne({
    $or: [{ code: 'IT' }, { shortName: 'IT' }, { name: /Information Technology/i }],
  });

  if (!itDept) {
    throw new Error('❌ IT Department not found in database.');
  }

  console.log(`✔ Found IT Department: ${itDept.name} (${itDept._id})`);

  const DEMO_PASSWORD = 'Demo@IT12345';
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  console.log('✔ Password hashed using bcrypt');

  const createdStudents = [];

  for (let sem = 1; sem <= 8; sem++) {
    const semDoc = await Semester.findOne({
      department: itDept._id,
      semesterNumber: sem,
    });

    if (!semDoc) {
      console.warn(`⚠️ Semester ${sem} not found for IT department. Skipping.`);
      continue;
    }

    const subjects = await Subject.find({
      department: itDept._id,
      semester: semDoc._id,
    });

    const subjectIds = subjects.map((s) => s._id);

    const username = `it.sem${sem}.student`;
    const email = `${username}@kpriet.ac.in`;
    const identifier = `IT.SEM${sem}.STUDENT`;
    const name = `IT Semester ${sem} Student`;

    const student = await User.findOneAndUpdate(
      { collegeEmail: email },
      {
        $set: {
          name,
          collegeEmail: email,
          identifier,
          passwordHash,
          role: UserRole.STUDENT,
          department: itDept._id,
          accountStatus: AccountStatus.ACTIVE,
          approvalStatus: ApprovalStatus.APPROVED,
          approvedAt: new Date(),
          profile: {
            designation: 'Undergraduate Scholar',
            batch: '2024-2028',
            section: 'A',
            specialization: 'Information Technology',
            bio: `B.Tech IT Student at KPRIET, Semester ${sem}.`,
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

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
          academicYear: semDoc.academicYear || '2024-2025',
          enrolledSubjects: subjectIds,
          status: EnrollmentStatus.APPROVED,
          approvedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    createdStudents.push({ sem, email, name, subjectsCount: subjects.length });
    console.log(`  ✔ [Sem ${sem}] Student created & enrolled: ${name} (${email}) in ${subjects.length} subjects`);
  }

  console.log('\n=============================================');
  console.log('🎉 ALL 8 IT SEMESTER STUDENT ACCOUNTS SEEDED');
  console.log('=============================================');
  createdStudents.forEach((s) => {
    console.log(`Semester ${s.sem}: ${s.email} | Password: ${DEMO_PASSWORD} | Subjects: ${s.subjectsCount}`);
  });

  await mongoose.disconnect();
  console.log('\n✔ Disconnected from MongoDB.');
}

seedItSemesterStudents().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
