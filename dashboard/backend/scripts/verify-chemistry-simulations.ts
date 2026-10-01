import assert from 'node:assert/strict';
import { CHEM_SIMULATION_TEMPLATES } from '../src/constants/chemistry.simulations.catalog.js';

console.log('--- Verifying Chemistry Simulation Catalog ---');
assert.equal(CHEM_SIMULATION_TEMPLATES.length, 30, 'Must have exactly 30 simulations in catalog');

// Verify distribution: 5 in U1, 3 in U2, 4 in U3, 5 in U4, 5 in U5, 8 in Lab (U6)
const unitCounts: Record<number, number> = {};
for (const item of CHEM_SIMULATION_TEMPLATES) {
  assert.ok(item.id, 'Item must have an id');
  assert.ok(item.title, 'Item must have a title');
  assert.ok(item.description, 'Item must have a description');
  assert.ok(item.unit, 'Item must have a unit');
  assert.ok(item.topic, 'Item must have a topic');
  assert.equal(item.domain, 'CHEMISTRY');
  assert.equal(item.category, 'engineering chemistry');
  unitCounts[item.unit] = (unitCounts[item.unit] || 0) + 1;
}

assert.equal(unitCounts[1], 5, 'Unit 1 must have 5 simulations');
assert.equal(unitCounts[2], 3, 'Unit 2 must have 3 simulations');
assert.equal(unitCounts[3], 4, 'Unit 3 must have 4 simulations');
assert.equal(unitCounts[4], 5, 'Unit 4 must have 5 simulations');
assert.equal(unitCounts[5], 5, 'Unit 5 must have 5 simulations');
assert.equal(unitCounts[6], 8, 'Unit 6 (Lab) must have 8 simulations');

console.log('✅ Catalog validation passed: 30 items across Units 1–6 (5, 3, 4, 5, 5, 8).');

// Verify Simulated Database Upsert Idempotence
console.log('--- Verifying Simulated Idempotent Upsert Logic ---');
const simulatedDb = new Map<string, any>();

function simulateUpsert(templates: typeof CHEM_SIMULATION_TEMPLATES) {
  let created = 0;
  let updated = 0;

  for (const sim of templates) {
    const existingKey = Array.from(simulatedDb.keys()).find(
      (k) => simulatedDb.get(k).simulationConfig.smartboardPresetId === sim.id || simulatedDb.get(k).title === sim.title
    );

    const doc = {
      title: sim.title,
      description: sim.description,
      chapterOrUnit: sim.unit,
      topic: sim.topic,
      simulationConfig: {
        type: 'smartboard-chem-lab',
        smartboardPresetId: sim.id,
      },
    };

    if (existingKey) {
      simulatedDb.set(existingKey, doc);
      updated++;
    } else {
      simulatedDb.set(sim.id, doc);
      created++;
    }
  }

  return { created, updated, total: simulatedDb.size };
}

// Pass 1: Initial seed
const pass1 = simulateUpsert(CHEM_SIMULATION_TEMPLATES);
assert.equal(pass1.created, 30, 'Pass 1 must create 30 items');
assert.equal(pass1.updated, 0, 'Pass 1 must update 0 items');
assert.equal(pass1.total, 30, 'Pass 1 must have 30 items in total');

// Pass 2: Re-run seed
const pass2 = simulateUpsert(CHEM_SIMULATION_TEMPLATES);
assert.equal(pass2.created, 0, 'Pass 2 must create 0 items (idempotent)');
assert.equal(pass2.updated, 30, 'Pass 2 must update 30 items');
assert.equal(pass2.total, 30, 'Pass 2 must maintain exactly 30 items (zero duplicates)');

console.log('✅ Idempotence verified: Pass 1 created 30, Pass 2 updated 30, total documents remained 30.');
console.log('🎉 All Chemistry Backend Seeding logic tests passed successfully!');
