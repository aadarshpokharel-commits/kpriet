import { Router } from 'express';
import { academicRouter } from './academic.routes.js';
import { authRouter } from './auth.routes.js';
import { healthRoutes } from './health.routes.js';
import quizRouter from './quiz.routes.js';
import assignmentRouter from './assignment.routes.js';
import { trackingRouter } from './tracking.routes.js';
import { aiRouter } from './ai.routes.js';
import { fileRouter } from './file.routes.js';
import { notificationRouter } from './notification.routes.js';
import { adminRouter } from './admin.routes.js';
import { programmeRouter } from './programme.routes.js';
import { smartboardRouter } from './smartboard.routes.js';

/**
 * API root router, mounted at env.API_PREFIX (default /api/v1).
 */
export const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRouter);
apiRouter.use('/smartboard', smartboardRouter);
apiRouter.use('/smart-board', smartboardRouter);
// Central programme master (14 official B.E. programmes). Mounted before the
// root-level academic router so /programmes resolves here; the legacy
// degree-programme endpoints remain available at /academic/programmes.
apiRouter.use('/programmes', programmeRouter);
apiRouter.use('/academic', academicRouter);
apiRouter.use('/quizzes', quizRouter);
apiRouter.use('/assignments', assignmentRouter);
apiRouter.use('/tracking', trackingRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/files', fileRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/', academicRouter); // Mount directly for /departments, /subjects, /semesters, etc.




