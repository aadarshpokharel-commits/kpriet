import mongoose from 'mongoose';
import { Department, Semester, Subject, User, Content, TeacherAssignment } from '../src/models/index.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/eduverse');

  const itDepts = await Department.find({
    $or: [{ code: 'IT' }, { shortName: 'IT' }, { name: /Information Technology/i }],
  });
  console.log(
    'IT Departments found:',
    itDepts.map((d) => ({ id: d._id, code: d.code, name: d.name, shortName: d.shortName }))
  );

  if (itDepts.length > 0) {
    const deptId = itDepts[0]._id;
    const sems = await Semester.find({ department: deptId }).sort({ semesterNumber: 1 });
    console.log(
      'IT Semesters:',
      sems.map((s) => ({
        id: s._id,
        num: s.semesterNumber,
        year: s.academicYear,
        reg: s.regulation,
        status: s.status,
      }))
    );

    const subjects = await Subject.find({ department: deptId }).sort({
      semesterNumber: 1,
      subjectCode: 1,
    });
    console.log('Total IT Subjects:', subjects.length);
    const bySem: Record<number, any[]> = {};
    subjects.forEach((s) => {
      bySem[s.semesterNumber] = bySem[s.semesterNumber] || [];
      bySem[s.semesterNumber].push({
        id: s._id,
        code: s.subjectCode,
        name: s.subjectName,
        credits: s.credits,
        units: s.syllabus?.length || 0,
        syllabus: s.syllabus?.map((u) => ({
          unitNumber: u.unitNumber,
          title: u.title,
          topics: u.topics,
        })),
      });
    });
    console.log('IT Subjects by Semester:');
    for (let sem = 1; sem <= 8; sem++) {
      console.log(`\n=== SEMESTER ${sem} (${bySem[sem]?.length || 0} subjects) ===`);
      (bySem[sem] || []).forEach((s) => {
        console.log(`  - [${s.code}] ${s.name} (${s.units} units)`);
      });
    }

    const existingTeachers = await User.find({
      $or: [
        { department: deptId, role: 'TEACHER' },
        { identifier: /^IT\.SEM/i },
        { collegeEmail: /^it\.sem/i },
      ],
    });
    console.log(
      '\nExisting IT Teachers:',
      existingTeachers.map((t) => ({
        id: t._id,
        name: t.name,
        email: t.collegeEmail,
        identifier: t.identifier,
        approval: t.approvalStatus,
        status: t.accountStatus,
      }))
    );

    const existingSimulations = await Content.find({
      department: deptId,
      contentType: 'SIMULATIONS',
    }).populate('subject', 'subjectCode subjectName semesterNumber');
    console.log('\nExisting IT Simulations:', existingSimulations.length);
    existingSimulations.forEach((sim: any) => {
      console.log(
        `  - [Sem ${sim.subject?.semesterNumber}] ${sim.subject?.subjectCode}: ${sim.title} (type: ${sim.simulationConfig?.type})`
      );
    });
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
