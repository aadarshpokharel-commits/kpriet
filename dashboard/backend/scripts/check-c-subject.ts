import mongoose from 'mongoose';
import { Subject, Department, Semester, User } from '../src/models/index.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/eduverse');
  const subs = await Subject.find({
    $or: [
      { subjectCode: { $in: ['U21CS101', 'U21CSG01'] } },
      { subjectName: { $regex: /c programming|problem solving/i } }
    ]
  }).populate('department').populate('semester');

  console.log('Found C subjects:', subs.map(s => ({
    id: s._id,
    code: s.subjectCode,
    name: s.subjectName,
    sem: s.semesterNumber,
    dept: s.department?.name || s.department?.code
  })));

  // If code is U21CSG01, or if U21CS101 doesn't exist, check
  const sem1 = await Semester.findOne({ semesterNumber: 1 });
  const itDept = await Department.findOne({ $or: [{ code: 'IT' }, { name: { $regex: /information technology/i } }] });
  console.log('IT Dept:', itDept?._id, 'Sem 1:', sem1?._id);

  await mongoose.disconnect();
  process.exit(0);
}

run();
