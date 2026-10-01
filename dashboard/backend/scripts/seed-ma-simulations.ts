import mongoose from 'mongoose';
import { Subject, Content, User, Department } from '../src/models/index.js';
import { ContentType, ContentStatus } from '../src/types/academic.types.js';
import { MA_SIMULATION_TEMPLATES, RMA_SIMULATION_TEMPLATES } from '../src/constants/simulations.catalog.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduverse';

async function seedSimulations() {
  console.log('🔄 Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB.');

  const itDept = await Department.findOne({
    $or: [{ code: 'IT' }, { code: 'SH' }, { _id: '6ab40430dcfcae09aed4df2a' }],
  });

  let teacher = await User.findOne({ email: 'it.sem2.teacher@kpriet.ac.in' });
  if (!teacher) teacher = await User.findOne({ role: 'TEACHER' });
  if (!teacher) throw new Error('No valid teacher found!');

  console.log(`👨‍🏫 Using Teacher: ${teacher.name} (${teacher.email})`);

  // 1. HIGHER MATHEMATICS (U25RMA101)
  const rmaSubject = await Subject.findOne({
    $or: [
      { subjectCode: 'U25RMA101' },
      { subjectCode: /RMA101/i },
      { subjectName: /Higher Mathematics/i }
    ]
  });

  if (rmaSubject) {
    console.log(`\n📌 Seeding Higher Mathematics [${rmaSubject.subjectCode}] (${rmaSubject.subjectName})...`);
    let created = 0;
    let updated = 0;

    for (const sim of RMA_SIMULATION_TEMPLATES) {
      const existing = await Content.findOne({
        subject: rmaSubject._id,
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
        department: rmaSubject.department || (itDept ? itDept._id : undefined),
        semester: rmaSubject.semester,
        subject: rmaSubject._id,
        teacher: teacher._id,
        chapterOrUnit: sim.unit || 1,
        status: ContentStatus.PUBLISHED,
        tags: sim.tags || ['Higher Mathematics', 'U25RMA101'],
        publishedAt: new Date(),
        version: 1,
        simulationConfig: {
          type: 'smartboard-ma-lab',
          smartboardPresetId: sim.id,
          category: 'higher-mathematics',
          domain: 'MATHEMATICS',
          initialParams: {
            simulationId: sim.id,
            category: 'higher-mathematics',
            topic: sim.topic || sim.title,
            unit: sim.unit || 1,
          },
          controls: ['run', 'pause', 'reset', 'step', 'stamp', 'ai-explain']
        }
      };

      if (existing) {
        await Content.updateOne({ _id: existing._id }, { $set: payload });
        updated++;
      } else {
        await Content.create(payload);
        created++;
      }
    }
    console.log(`✅ Higher Mathematics (U25RMA101) Seeded: ${created} created, ${updated} updated. Total: ${RMA_SIMULATION_TEMPLATES.length}`);
  } else {
    console.log('⚠️ U25RMA101 subject record not found in MongoDB.');
  }

  // 2. ENGINEERING MATHEMATICS (U21MA101)
  const maSubject = await Subject.findOne({
    $or: [
      { subjectCode: { $in: ['U25MA102', 'U21MA101'] } },
      { subjectName: /Engineering Mathematics/i },
      { subjectName: /Calculus and Differential Equations/i }
    ]
  });

  if (maSubject) {
    console.log(`\n📌 Seeding Engineering Mathematics [${maSubject.subjectCode}] (${maSubject.subjectName})...`);
    let created = 0;
    let updated = 0;

    for (const sim of MA_SIMULATION_TEMPLATES) {
      const existing = await Content.findOne({
        subject: maSubject._id,
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
        department: maSubject.department || (itDept ? itDept._id : undefined),
        semester: maSubject.semester,
        subject: maSubject._id,
        teacher: teacher._id,
        chapterOrUnit: sim.unit || 1,
        status: ContentStatus.PUBLISHED,
        tags: sim.tags || ['Matrices and Calculus', 'U25MA102'],
        publishedAt: new Date(),
        version: 1,
        simulationConfig: {
          type: 'smartboard-ma-lab',
          smartboardPresetId: sim.id,
          category: 'engineering-mathematics',
          domain: 'MATHEMATICS',
          initialParams: {
            simulationId: sim.id,
            category: 'engineering-mathematics',
            topic: sim.topic || sim.title,
            unit: sim.unit || 1,
          },
          controls: ['run', 'pause', 'reset', 'step', 'ai-explain']
        }
      };

      if (existing) {
        await Content.updateOne({ _id: existing._id }, { $set: payload });
        updated++;
      } else {
        await Content.create(payload);
        created++;
      }
    }
    console.log(`✅ Engineering Mathematics (U21MA101) Seeded: ${created} created, ${updated} updated. Total: ${MA_SIMULATION_TEMPLATES.length}`);
  }

  await mongoose.disconnect();
  console.log('\n🎉 Finished seeding Mathematics simulations.');
}

seedSimulations().catch(err => {
  console.error('❌ Error during seeding:', err);
  process.exit(1);
});
