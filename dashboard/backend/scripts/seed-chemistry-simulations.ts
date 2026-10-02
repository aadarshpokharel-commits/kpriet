import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Subject, Content, User, Department, Semester } from '../src/models/index.js';
import { ContentType, ContentStatus } from '../src/types/academic.types.js';
import { CHEM_SIMULATION_TEMPLATES } from '../src/constants/chemistry.simulations.catalog.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduverse';

async function seedChemistrySimulations() {
  console.log('🔄 Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB.');

  // 1. Locate Department (S&H or IT fallback)
  let dept = await Department.findOne({
    $or: [{ code: 'SH' }, { code: 'S&H' }, { name: /Science and Humanities/i }, { code: 'IT' }],
  });
  if (!dept) {
    dept = await Department.findOne();
  }
  if (!dept) throw new Error('No valid department found in database!');
  console.log(`🏛️ Using Department: ${dept.name} (${dept.code})`);

  // 2. Locate or fallback Semester 1
  let semester = await Semester.findOne({
    department: dept._id,
    semesterNumber: 1,
  });
  if (!semester) {
    semester = await Semester.findOne({ semesterNumber: 1 });
  }
  if (!semester) {
    semester = await Semester.create({
      semesterNumber: 1,
      academicYear: '2025-2026',
      regulation: 'R2025',
      department: dept._id,
      status: 'ACTIVE',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-12-20'),
    });
  }
  console.log(`📅 Using Semester: Semester ${semester.semesterNumber} (${semester.academicYear || 'R2025'})`);

  // 3. Locate Teacher
  let teacher = await User.findOne({
    $or: [
      { collegeEmail: 'chemistry.teacher@kpriet.ac.in' },
      { collegeEmail: 'chem.teacher@kpriet.ac.in' },
      { collegeEmail: 'physics.teacher@kpriet.ac.in' },
    ],
  });
  if (!teacher) teacher = await User.findOne({ role: 'TEACHER' });
  if (!teacher) teacher = await User.findOne();
  if (!teacher) throw new Error('No valid teacher user found!');
  console.log(`👨‍🏫 Using Teacher: ${teacher.name} (${teacher.collegeEmail})`);

  // 4. Authoritative Subject: U25CY103 — Engineering Chemistry (R2025 CBCS, Semester I, BSC, 3 credits)
  const subjectPayload = {
    subjectName: 'Engineering Chemistry',
    subjectCode: 'U25CY103',
    department: dept._id,
    semester: semester._id,
    semesterNumber: 1,
    credits: 3,
    category: 'BSC',
    description: 'Engineering Chemistry curriculum covering atomic & molecular structure, stereochemistry, organic reactions, polymers, coordination complexes, thermodynamics, electrochemistry, kinetics, surface chemistry, spectroscopy, and practical laboratory experiments.',
    icon: '⚗️',
    color: '#06B6D4',
    status: 'ACTIVE',
    syllabus: [
      {
        unitNumber: 1,
        title: 'Molecular Structure, Bonding and Reactivity',
        topics: [
          'Schrödinger equation and molecular orbitals',
          'de Broglie matter waves and wave-particle duality',
          'Conformational analysis and Newman projections',
          'Chirality, optical activity and enantiomers',
          'Acids, bases and pH buffer systems'
        ],
        hours: 9
      },
      {
        unitNumber: 2,
        title: 'Organic Reactions and Synthesis of Drug Molecules',
        topics: [
          'Nucleophilic substitution (SN1 vs SN2)',
          'Elimination reactions (E1 and E2)',
          'Electrophilic aromatic substitution (SEAr)',
          'Diazotization and azo dye synthesis'
        ],
        hours: 9
      },
      {
        unitNumber: 3,
        title: 'Polymers and Coordination Chemistry',
        topics: [
          'Chain-growth and step-growth polymerization',
          'Polymer molecular weights (Mn, Mw, PDI)',
          'Glass transition (Tg) and melting (Tm)',
          'Injection, extrusion and compression molding',
          'Crystal field theory (CFT), colour and magnetism'
        ],
        hours: 9
      },
      {
        unitNumber: 4,
        title: 'Thermodynamics, Electrochemistry and Kinetics',
        topics: [
          'Gibbs free energy and reaction spontaneity (ΔG = ΔH − TΔS)',
          'Galvanic cells, electrodes and Nernst EMF equation',
          'Water phase diagram and binary eutectic equilibria',
          'Reaction kinetics, order and half-life',
          'Michaelis-Menten enzyme kinetics'
        ],
        hours: 9
      },
      {
        unitNumber: 5,
        title: 'Surface Chemistry, Spectroscopy and Chromatography',
        topics: [
          'Langmuir and Freundlich adsorption isotherms',
          'Surfactants and critical micelle concentration (CMC)',
          'Beer-Lambert law and UV-Vis spectroscopy',
          'Infrared (IR) and NMR spectroscopic interpretation',
          'TLC, HPLC and Gas Chromatography separation'
        ],
        hours: 9
      },
      {
        unitNumber: 6,
        title: 'Engineering Chemistry Laboratory',
        topics: [
          'Determination of pKa of weak acids by pH titration',
          'Preparation of 1-phenylazo-2-naphthol (Sudan I dye)',
          'Qualitative tests for carboxylic acids, aldehydes and amines',
          'Viscosity-average molecular weight of polymers via Ostwald viscometer',
          'Reaction kinetics of acid-catalyzed ester hydrolysis',
          'Cell EMF measurement using calomel and glass electrodes',
          'Distribution coefficient of iodine between water and CCl4',
          'Verification of Beer-Lambert law using KMnO4/CuSO4'
        ],
        hours: 30
      }
    ]
  };

  const u25Subject = await Subject.findOneAndUpdate(
    { subjectCode: 'U25CY103' },
    { $set: subjectPayload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`📌 Upserted Subject [${u25Subject.subjectCode}]: ${u25Subject.subjectName} (ID: ${u25Subject._id})`);

  // Target subjects: U25CY103 and U21CY101 (if present)
  const targetSubjects = [u25Subject];
  const u21Subject = await Subject.findOne({ subjectCode: 'U21CY101' });
  if (u21Subject) {
    targetSubjects.push(u21Subject);
    console.log(`📌 Found existing legacy Subject [${u21Subject.subjectCode}]: ${u21Subject.subjectName}`);
  }

  // 5. Upsert all 30 simulation items idempotently into Content
  for (const targetSub of targetSubjects) {
    console.log(`\n🧪 Seeding 30 simulations for [${targetSub.subjectCode}] (${targetSub.subjectName})...`);
    let created = 0;
    let updated = 0;

    for (const sim of CHEM_SIMULATION_TEMPLATES) {
      const existing = await Content.findOne({
        subject: targetSub._id,
        contentType: ContentType.SIMULATIONS,
        $or: [
          { 'simulationConfig.smartboardPresetId': sim.id },
          { title: sim.title },
        ],
      });

      const payload = {
        title: sim.title,
        description: sim.description,
        contentType: ContentType.SIMULATIONS,
        department: targetSub.department || dept._id,
        semester: targetSub.semester || semester._id,
        subject: targetSub._id,
        teacher: teacher._id,
        chapterOrUnit: sim.unit || 1,
        topic: sim.topic,
        status: ContentStatus.PUBLISHED,
        tags: sim.tags || ['Engineering Chemistry', targetSub.subjectCode],
        publishedAt: new Date(),
        version: 1,
        simulationConfig: {
          type: 'smartboard-chem-lab',
          smartboardPresetId: sim.id,
          simulationType: 'engineering-chemistry',
          simulationSubtype: 'chemistry',
          category: 'engineering-chemistry',
          initialParams: {
            simulationId: sim.id,
            category: 'engineering-chemistry',
            topic: sim.topic || sim.title,
            unit: sim.unit || 1,
          },
          controls: ['run', 'pause', 'reset', 'step', 'stamp', 'ai-explain'],
        },
      };

      if (existing) {
        await Content.updateOne({ _id: existing._id }, { $set: payload });
        updated++;
      } else {
        await Content.create(payload);
        created++;
      }
    }

    console.log(`✅ [${targetSub.subjectCode}] Seeded: ${created} created, ${updated} updated. Total: ${CHEM_SIMULATION_TEMPLATES.length}`);
  }

  await mongoose.disconnect();
  console.log('\n🎉 Finished seeding Engineering Chemistry simulations.');
}

seedChemistrySimulations().catch((err) => {
  console.error('❌ Error during seeding:', err);
  process.exit(1);
});
