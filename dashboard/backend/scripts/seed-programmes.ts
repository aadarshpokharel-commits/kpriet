/**
 * npm run db:seed:programmes
 *
 * Idempotently synchronises the 14 official B.E. programmes into the
 * `departments` collection and safely migrates legacy department codes
 * (e.g. AD → AIDS, MECH → ME, CIVIL → CIV, CHEM → CHE) IN PLACE so every
 * existing subject, curriculum unit, enrollment, teacher assignment and RAG
 * record keeps pointing at the same programme. Safe to run any number of
 * times; it never creates duplicates and never deletes data.
 *
 * Also runs automatically on every API start.
 */
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { ProgrammeService } from '../src/services/programme.service.js';

try {
  await connectDatabase();
  const report = await ProgrammeService.seedProgrammeMaster();
  const programmes = await ProgrammeService.listProgrammes({ includeInactive: true });

  console.log('\n✔ Programme master synchronised');
  console.log(`  created:  ${report.created.join(', ') || '—'}`);
  console.log(`  updated:  ${report.updated.join(', ') || '—'}`);
  console.log(
    `  migrated: ${report.migrated.map((m) => `${m.from} → ${m.to}`).join(', ') || '—'}`
  );
  if (report.conflicts.length) {
    console.log('  ⚠ needs manual review:');
    report.conflicts.forEach((c) => console.log(`    - ${c.code}: ${c.reason}`));
  }
  console.log(`  backfill: ${JSON.stringify(report.backfill)}`);
  console.log(`\n  ${programmes.length} programmes in the master:`);
  programmes.forEach((p) =>
    console.log(`    ${p.code.padEnd(6)} ${p.name}${p.isActive ? '' : '  (inactive)'}`)
  );

  await disconnectDatabase();
  process.exit(0);
} catch (err) {
  console.error('✖ Programme seeding failed:', err);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
}
