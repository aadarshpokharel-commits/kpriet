/**
 * assign-sem1-teacher.ts
 * Assigns IT.SEM1.TEACHER to every subject in IT Semester 1.
 * Run: npx tsx --env-file=.env scripts/assign-sem1-teacher.ts
 */

import 'dotenv/config';
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import { Department, Semester, Subject, User, TeacherAssignment } from '../src/models/index.js';
import { TeacherAssignmentStatus } from '../src/types/academic.types.js';

const MONGO_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/eduverse';

async function main() {
  console.log('\n🔗 Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected.\n');

  /* ── 1. Find the IT department ── */
  const itDept = await Department.findOne({
    $or: [
      { code: { $regex: /^IT$/i } },
      { name: { $regex: /information technology/i } },
    ],
  }).lean();

  if (!itDept) throw new Error('IT Department not found in DB.');
  console.log(`📂 Department: ${itDept.name} (${itDept._id})`);

  /* ── 2. Find Semester 1 ── */
  const sem1 = await Semester.findOne({
    department: itDept._id,
    semesterNumber: 1,
  }).lean();

  if (!sem1) throw new Error('Semester 1 not found for IT department.');
  console.log(`📅 Semester: ${sem1.name || 'Semester 1'} (${sem1._id})`);

  /* ── 3. Find the demo teacher ── */
  const teacher = await User.findOne({
    $or: [
      { staffId: 'IT.SEM1.TEACHER' },
      { identifier: { $regex: /it\.sem1\.teacher/i } },
      { email: { $regex: /it\.sem1\.teacher/i } },
    ],
  }).lean();

  if (!teacher) throw new Error('Teacher IT.SEM1.TEACHER not found in DB.');
  console.log(`👤 Teacher: ${teacher.name} (${teacher._id})\n`);

  /* ── 4. Fetch ALL subjects in Semester 1 ── */
  let subjects = await Subject.find({
    department: itDept._id,
    $or: [{ semester: sem1._id }, { semesterNumber: 1 }],
  }).lean();

  if (subjects.length === 0) {
    // Try searching without department filter just in case
    subjects = await Subject.find({
      $or: [{ semester: sem1._id }, { semesterNumber: 1 }],
    }).lean();
  }

  if (subjects.length === 0) {
    const allCount = await Subject.countDocuments();
    const allSubjects = await Subject.find().limit(5).lean();
    console.warn(`⚠️ No subjects found for IT Semester 1. Total subjects in DB: ${allCount}`);
    console.log('Sample subjects in DB:', allSubjects.map((s: any) => ({ code: s.subjectCode, sem: s.semesterNumber, semId: s.semester, dept: s.department })));
    process.exit(0);
  }

  console.log(`📚 Found ${subjects.length} subjects in IT Semester 1:`);
  subjects.forEach(s => console.log(`   • ${s.subjectCode} — ${(s as any).subjectName || (s as any).name}`));

  /* ── 5. Upsert TeacherAssignment for each subject ── */
  const academicYear = (sem1 as any).academicYear || '2025-2026';
  let created = 0, updated = 0;

  for (const subject of subjects) {
    const filter = {
      teacher: teacher._id,
      subject: subject._id,
      semester: sem1._id,
      academicYear,
    };
    const update = {
      $set: {
        teacher: teacher._id,
        subject: subject._id,
        department: itDept._id,
        semester: sem1._id,
        academicYear,
        section: 'ALL',
        isCoordinator: true,
        status: TeacherAssignmentStatus.ACTIVE,
      },
    };

    const subName = (subject as any).subjectName || (subject as any).name || subject.subjectCode;
    const existing = await TeacherAssignment.findOne(filter).lean();
    if (existing) {
      await TeacherAssignment.updateOne({ _id: existing._id }, update);
      updated++;
      console.log(`   ↺  Updated: ${subject.subjectCode} — ${subName}`);
    } else {
      await TeacherAssignment.create({ ...filter, ...update.$set });
      created++;
      console.log(`   ✔  Assigned: ${subject.subjectCode} — ${subName}`);
    }
  }

  /* ── 6. Summary ── */
  const total = await TeacherAssignment.countDocuments({
    teacher: teacher._id,
    status: TeacherAssignmentStatus.ACTIVE,
  });

  console.log('\n════════════════════════════════════════');
  console.log('✅ DONE!');
  console.log(`   Newly assigned : ${created}`);
  console.log(`   Already existed: ${updated}`);
  console.log(`   Total active assignments for this teacher: ${total}`);
  console.log('════════════════════════════════════════\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
