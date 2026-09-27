/**
 * npm run db:check
 * Connects with the values in .env, pings MongoDB, prints the result and exits.
 * Exit code 0 = reachable, 1 = not reachable. Safe to run in CI.
 */
import { env } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase, pingDatabase } from '../src/database/connection.js';
import mongoose from 'mongoose';

const redacted = env.MONGODB_URI.replace(/\/\/([^@/]+)@/, '//***:***@');
console.log(`Checking MongoDB at ${redacted} ...`);

try {
  await connectDatabase();
  const latency = await pingDatabase();
  const { host, name } = mongoose.connection;
  console.log(`✔ Connected to database "${name}" on ${host} (ping ${latency} ms)`);
  await disconnectDatabase();
  process.exit(0);
} catch (err) {
  console.error(`✖ Could not connect: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
