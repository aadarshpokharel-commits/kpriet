import mongoose from 'mongoose';
import { Subject, Content, User, Semester, Department } from '../src/models/index.js';
import { ContentType, ContentStatus } from '../src/types/academic.types.js';
import { ECG_SIMULATION_TEMPLATES, PDC_SIMULATION_TEMPLATES } from '../src/constants/simulations.catalog.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduverse';

async function seedSimulations() {
  console.log('🔄 Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB.');

  const itDept = await Department.findOne({
    $or: [{ code: 'IT' }, { _id: '6ab40430dcfcae09aed4df2a' }],
  });

  if (!itDept) {
    throw new Error('IT Department not found!');
  }

  // Teacher for Semester 2 (both U21ECG01 and U21IT201 are Semester 2)
  let teacher = await User.findOne({ email: 'it.sem2.teacher@kpriet.ac.in' });
  if (!teacher) teacher = await User.findOne({ role: 'TEACHER', department: itDept._id });
  if (!teacher) teacher = await User.findOne({ role: 'TEACHER' });
  if (!teacher) throw new Error('No valid teacher found!');

  console.log(`👨‍🏫 Using Teacher: ${teacher.name} (${teacher.email})`);

  // 1. DIGITAL ELECTRONICS (U21ECG01)
  const deSubject = await Subject.findOne({
    $or: [
      { subjectCode: 'U21ECG01' },
      { subjectName: /Digital Electronics/i }
    ]
  });

  if (deSubject) {
    console.log(`\n📌 Seeding Digital Electronics [${deSubject.subjectCode}] (${deSubject.subjectName})...`);
    let ecgCreated = 0;
    let ecgUpdated = 0;

    for (const sim of ECG_SIMULATION_TEMPLATES) {
      const existing = await Content.findOne({
        subject: deSubject._id,
        contentType: ContentType.SIMULATIONS,
        $or: [
          { 'simulationConfig.smartboardPresetId': sim.id },
          { title: sim.title }
        ]
      });

      const payload = {
        title: sim.title,
        description: sim.description,
        contentType: ContentType.SIMULATIONS,
        department: itDept._id,
        semester: deSubject.semester,
        subject: deSubject._id,
        teacher: teacher._id,
        chapterOrUnit: sim.unit || 1,
        tags: sim.tags || ['Digital Electronics', 'DE', 'U21ECG01', sim.topic],
        simulationConfig: {
          type: 'smartboard-ecg-lab',
          smartboardPresetId: sim.id,
          category: 'digital-electronics',
          domain: 'COMPUTER_SCIENCE',
          initialParams: {
            simulationId: sim.id,
            category: 'digital-electronics',
            topic: sim.topic || sim.title,
            unit: sim.unit || 1,
          },
          controls: ['run', 'pause', 'next', 'prev', 'reset', 'step', 'ai-explain']
        },
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date()
      };

      if (existing) {
        await Content.updateOne({ _id: existing._id }, { $set: payload });
        ecgUpdated++;
      } else {
        await Content.create(payload);
        ecgCreated++;
      }
    }
    console.log(`✅ Digital Electronics: ${ecgCreated} created, ${ecgUpdated} updated. Total: ${ECG_SIMULATION_TEMPLATES.length}`);
  } else {
    console.warn('⚠️ Subject U21ECG01 not found in database.');
  }

  // 2. PRINCIPLES OF DATA COMMUNICATION (U21IT201)
  const pdcSubject = await Subject.findOne({
    $or: [
      { subjectCode: 'U21IT201' },
      { subjectName: /Principles of Data Communication/i }
    ]
  });

  if (pdcSubject) {
    console.log(`\n📌 Seeding Principles of Data Communication [${pdcSubject.subjectCode}] (${pdcSubject.subjectName})...`);
    let pdcCreated = 0;
    let pdcUpdated = 0;

    for (const sim of PDC_SIMULATION_TEMPLATES) {
      const existing = await Content.findOne({
        subject: pdcSubject._id,
        contentType: ContentType.SIMULATIONS,
        $or: [
          { 'simulationConfig.smartboardPresetId': sim.id },
          { title: sim.title }
        ]
      });

      const payload = {
        title: sim.title,
        description: sim.description,
        contentType: ContentType.SIMULATIONS,
        department: itDept._id,
        semester: pdcSubject.semester,
        subject: pdcSubject._id,
        teacher: teacher._id,
        chapterOrUnit: sim.unit || 1,
        tags: sim.tags || ['Principles of Data Communication', 'PDC', 'U21IT201', sim.topic],
        simulationConfig: {
          type: 'smartboard-pdc-lab',
          smartboardPresetId: sim.id,
          category: 'principles of data communication',
          domain: 'COMPUTER_SCIENCE',
          initialParams: {
            simulationId: sim.id,
            category: 'principles of data communication',
            topic: sim.topic || sim.title,
            unit: sim.unit || 1,
          },
          controls: ['run', 'pause', 'next', 'prev', 'reset', 'step', 'ai-explain']
        },
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date()
      };

      if (existing) {
        await Content.updateOne({ _id: existing._id }, { $set: payload });
        pdcUpdated++;
      } else {
        await Content.create(payload);
        pdcCreated++;
      }
    }
    console.log(`✅ Principles of Data Communication: ${pdcCreated} created, ${pdcUpdated} updated. Total: ${PDC_SIMULATION_TEMPLATES.length}`);
  } else {
    console.warn('⚠️ Subject U21IT201 not found in database.');
  }

  await mongoose.disconnect();
  console.log('\n🎉 Finished seeding simulation data to MongoDB!');
}

seedSimulations().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
