import { Router } from 'express';
import { ProgrammeController } from '../controllers/programme.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { UserRole } from '../types/academic.types.js';
import {
  listProgrammesQuerySchema,
  programmeParamsSchema,
  programmeScopedQuerySchema,
  setProgrammeStatusSchema,
  updateProgrammeDetailsSchema,
} from '../validators/programme.validators.js';

/**
 * Centralised Programme Master API — mounted at {API_PREFIX}/programmes.
 *
 * The database is the single source of truth for the 14 official B.E.
 * programmes. Every programme picker, dashboard, RAG query and Smart Board
 * session uses these endpoints (or the ids they return).
 *
 * `:programmeId` accepts the stable programme code (e.g. "IT") or its ObjectId.
 * Authorization is always derived from the signed-in user, never from the
 * programme id supplied by the client.
 */
export const programmeRouter = Router();

const admin = [authenticate, requireRole(UserRole.ADMIN, UserRole.PRINCIPAL)];
const params = validate({ params: programmeParamsSchema });
const scoped = validate({ params: programmeParamsSchema, query: programmeScopedQuerySchema });

// ── Public (registration & sign-up need these before a session exists) ──
programmeRouter.get('/', validate({ query: listProgrammesQuerySchema }), ProgrammeController.list);

// ── Admin programme management ──
programmeRouter.get('/manage', ...admin, ProgrammeController.listForAdmin);

programmeRouter.get('/:programmeId', params, ProgrammeController.get);
programmeRouter.get('/:programmeId/registration-options', params, ProgrammeController.registrationOptions);

// ── Programme-scoped academic data (authenticated + programme authorization) ──
programmeRouter.get('/:programmeId/semesters', authenticate, scoped, ProgrammeController.semesters);
programmeRouter.get('/:programmeId/subjects', authenticate, scoped, ProgrammeController.subjects);
programmeRouter.get('/:programmeId/curriculum', authenticate, scoped, ProgrammeController.curriculum);
programmeRouter.get('/:programmeId/teachers', authenticate, scoped, ProgrammeController.teachers);
programmeRouter.get('/:programmeId/students', authenticate, scoped, ProgrammeController.students);
programmeRouter.get('/:programmeId/stats', authenticate, scoped, ProgrammeController.stats);

programmeRouter.patch(
  '/:programmeId/status',
  ...admin,
  validate({ params: programmeParamsSchema, body: setProgrammeStatusSchema }),
  ProgrammeController.setStatus
);
programmeRouter.patch(
  '/:programmeId',
  ...admin,
  validate({ params: programmeParamsSchema, body: updateProgrammeDetailsSchema }),
  ProgrammeController.updateDetails
);
