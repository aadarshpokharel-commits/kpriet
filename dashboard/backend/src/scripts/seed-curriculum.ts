import { connectDatabase, disconnectDatabase } from '../database/connection.js';
import { CurriculumSeedService } from '../services/curriculum-seed.service.js';
import { logger } from '../config/logger.js';

async function run() {
  try {
    logger.info('Connecting to MongoDB for curriculum seeding...');
    await connectDatabase();
    const result = await CurriculumSeedService.seedCompleteITCurriculum();
    logger.info({ result }, 'Curriculum seeding finished successfully.');
    await disconnectDatabase();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during curriculum seeding.');
    await disconnectDatabase();
    process.exit(1);
  }
}

run();
