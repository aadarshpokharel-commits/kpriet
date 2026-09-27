import type { Request, Response } from 'express';
import { ProgrammeService } from '../services/programme.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

function programmeParam(req: Request): string {
  return String((req.validated?.params as any)?.programmeId ?? req.params.programmeId);
}

function query(req: Request): Record<string, any> {
  return (req.validated?.query as Record<string, any>) ?? {};
}

function meta(req: Request) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

export class ProgrammeController {
  /** GET /programmes — public list of active programmes (registration, pickers). */
  static async list(req: Request, res: Response) {
    const programmes = await ProgrammeService.listProgrammes({
      search: query(req).search,
      departmentId: query(req).departmentId,
    });
    ApiResponse.ok(res, 'Programmes retrieved successfully.', programmes);
  }

  /** GET /programmes/manage — admin view: all programmes (incl. inactive) with statistics. */
  static async listForAdmin(_req: Request, res: Response) {
    const programmes = await ProgrammeService.listProgrammesWithStats();
    ApiResponse.ok(res, 'Programme master retrieved successfully.', programmes);
  }

  /** GET /programmes/:programmeId */
  static async get(req: Request, res: Response) {
    const programme = await ProgrammeService.getProgramme(programmeParam(req));
    ApiResponse.ok(res, 'Programme retrieved successfully.', programme);
  }

  /** GET /programmes/:programmeId/registration-options — public. */
  static async registrationOptions(req: Request, res: Response) {
    const data = await ProgrammeService.getRegistrationOptions(programmeParam(req));
    ApiResponse.ok(res, 'Registration options retrieved successfully.', data);
  }

  static async semesters(req: Request, res: Response) {
    const dept = await ProgrammeService.resolveProgramme(programmeParam(req));
    await ProgrammeService.assertProgrammeAccess(req.user as any, dept, 'catalog');
    const data = await ProgrammeService.getSemesters(dept, req.user as any, query(req));
    ApiResponse.ok(res, 'Programme semesters retrieved successfully.', data);
  }

  static async subjects(req: Request, res: Response) {
    const dept = await ProgrammeService.resolveProgramme(programmeParam(req));
    await ProgrammeService.assertProgrammeAccess(req.user as any, dept, 'catalog');
    const data = await ProgrammeService.getSubjects(dept, req.user as any, query(req));
    ApiResponse.ok(res, 'Programme subjects retrieved successfully.', data);
  }

  static async curriculum(req: Request, res: Response) {
    const dept = await ProgrammeService.resolveProgramme(programmeParam(req));
    await ProgrammeService.assertProgrammeAccess(req.user as any, dept, 'catalog');
    const data = await ProgrammeService.getCurriculum(dept, req.user as any, query(req));
    ApiResponse.ok(res, 'Programme curriculum retrieved successfully.', data);
  }

  static async teachers(req: Request, res: Response) {
    const dept = await ProgrammeService.resolveProgramme(programmeParam(req));
    await ProgrammeService.assertProgrammeAccess(req.user as any, dept, 'roster');
    const data = await ProgrammeService.getTeachers(dept, query(req));
    ApiResponse.ok(res, 'Programme teachers retrieved successfully.', data);
  }

  static async students(req: Request, res: Response) {
    const dept = await ProgrammeService.resolveProgramme(programmeParam(req));
    await ProgrammeService.assertProgrammeAccess(req.user as any, dept, 'roster');
    const data = await ProgrammeService.getStudents(dept, query(req));
    ApiResponse.ok(res, 'Programme students retrieved successfully.', data);
  }

  static async stats(req: Request, res: Response) {
    const dept = await ProgrammeService.resolveProgramme(programmeParam(req));
    await ProgrammeService.assertProgrammeAccess(req.user as any, dept, 'roster');
    const [programme, stats] = await Promise.all([
      ProgrammeService.getProgramme(dept.code),
      ProgrammeService.getStats(dept),
    ]);
    ApiResponse.ok(res, 'Programme statistics retrieved successfully.', { programme, stats });
  }

  static async setStatus(req: Request, res: Response) {
    const { isActive } = req.validated?.body as { isActive: boolean };
    const data = await ProgrammeService.setActive(programmeParam(req), isActive, req.user as any, meta(req));
    ApiResponse.ok(res, isActive ? 'Programme activated.' : 'Programme deactivated (records retained).', data);
  }

  static async updateDetails(req: Request, res: Response) {
    const data = await ProgrammeService.updateProgrammeDetails(
      programmeParam(req),
      req.validated?.body as any,
      req.user as any,
      meta(req)
    );
    ApiResponse.ok(res, 'Programme details updated.', data);
  }
}
