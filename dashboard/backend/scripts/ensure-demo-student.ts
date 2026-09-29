import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, StudentEnrollment, Semester, Subject, Department } from '../src/models/index.js';
import { UserRole, AccountStatus, ApprovalStatus, EnrollmentStatus } from '../src/types/academic.types.js';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://23it040_db_user:q2zUTOiG8a8Konpp@cluster0.mxbtbyz.mongodb.net/eduverse?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const hash = await bcrypt.hash('Eduverse@Dev2026!', 10);
  const itDept = await Department.findOne({
    $or: [{ code: 'IT' }, { shortName: 'IT' }, { name: /Information Technology/i }],
  });
  const sem1Doc = await Semester.findOne({
    department: itDept?._id,
    semesterNumber: 1,
  });
  const subjects = sem1Doc ? await Subject.find({ department: itDept?._id, semester: sem1Doc._id }) : [];

  const student = await User.findOneAndUpdate(
    { collegeEmail: 'student@kpriet.ac.in' },
    {
      $set: {
        name: 'Demo Student',
        collegeEmail: 'student@kpriet.ac.in',
        identifier: 'DEMO.STUDENT',
        passwordHash: hash,
        role: UserRole.STUDENT,
        department: itDept?._id || null,
        accountStatus: AccountStatus.ACTIVE,
        approvalStatus: ApprovalStatus.APPROVED,
        approvedAt: new Date(),
        profile: {
          designation: 'Undergraduate Scholar',
          batch: '2024-2028',
          section: 'A',
          specialization: 'Information Technology',
          bio: 'Demo Student for KPRIET Eduverse Platform.',
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (sem1Doc && itDept) {
    await StudentEnrollment.findOneAndUpdate(
      { student: student._id, semester: sem1Doc._id },
      {
        $set: {
          student: student._id,
          department: itDept._id,
          semester: sem1Doc._id,
          academicYear: sem1Doc.academicYear || '2024-2025',
          enrolledSubjects: subjects.map((s) => s._id),
          status: EnrollmentStatus.APPROVED,
          approvedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log('✔ student@kpriet.ac.in initialized successfully');
  await mongoose.disconnect();
}

main().catch(console.error);
