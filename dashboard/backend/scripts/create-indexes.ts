/**
 * npm run db:indexes
 * Connects to MongoDB, synchronizes all indexes across all academic domain models, and exits.
 */
import { connectDatabase, disconnectDatabase, pingDatabase } from '../src/database/connection.js';
import { ensureAllIndexes } from '../src/database/ensure-indexes.js';

try {
  console.log('Connecting to MongoDB to build/sync indexes...');
  await connectDatabase();
  const ping = await pingDatabase();
  console.log(`Connected (ping: ${ping} ms). Synchronizing indexes...`);

  await ensureAllIndexes();

  console.log('✔ All indexes successfully created and synchronized with MongoDB.');
  await disconnectDatabase();
  process.exit(0);
} catch (err) {
  console.error('✖ Error synchronizing indexes:', err);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
}
