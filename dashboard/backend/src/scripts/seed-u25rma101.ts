import { connectDatabase, disconnectDatabase } from '../database/connection.js';
import { U25Rma101SeedService } from '../services/u25rma101-seed.service.js';
import { logger } from '../config/logger.js';

async function run() {
  try {
    logger.info('Connecting to MongoDB for U25RMA101 seeding...');
    await connectDatabase();
    const result = await U25Rma101SeedService.seedU25Rma101();
    logger.info({
      subject: result.subject.subjectCode,
      teacher: result.teacher.name,
      units: result.curriculumUnitsCount,
      enrollments: result.syncedEnrollmentsCount,
    }, 'U25RMA101 seeding completed successfully.');
    await disconnectDatabase();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during U25RMA101 seeding.');
    await disconnectDatabase();
    process.exit(1);
  }
}

run();
