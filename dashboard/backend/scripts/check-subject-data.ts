import mongoose from 'mongoose';
import { Subject, Content, Quiz, Assignment, TeacherCurriculumContent } from '../src/models/index.js';

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/eduverse');
  const subjects = await Subject.find({ department: new mongoose.Types.ObjectId('6ab40430dcfcae09aed4df2a') }).sort({ semesterNumber: 1, subjectCode: 1 });
  console.log(`Total IT Subjects: ${subjects.length}`);
  
  let subjectsWithNoData = 0;
  for (const s of subjects) {
    const contents = await Content.countDocuments({ subject: s._id });
    const quizzes = await Quiz.countDocuments({ subject: s._id });
    const assignments = await Assignment.countDocuments({ subject: s._id });
    const curriculum = await TeacherCurriculumContent.countDocuments({ subject: s._id });
    const total = contents + quizzes + assignments + curriculum;
    if (total === 0) {
      subjectsWithNoData++;
      console.log(`[Sem ${s.semesterNumber}] ${s.subjectCode} - ${s.subjectName}: EMPTY`);
    } else {
      console.log(`[Sem ${s.semesterNumber}] ${s.subjectCode} - ${s.subjectName}: ${contents} content, ${quizzes} quizzes, ${assignments} assignments, ${curriculum} curriculum`);
    }
  }
  console.log(`\nSubjects with 0 data: ${subjectsWithNoData} out of ${subjects.length}`);
  await mongoose.disconnect();
}
check().catch(console.error);
