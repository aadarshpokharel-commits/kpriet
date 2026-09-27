import { type Request, type Response } from 'express';
import { ApiResponse } from '../utils/apiResponse.js';
import { AdminService } from '../services/admin.service.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  assignDepartmentHodSchema,
  updateUserStatusSchema,
} from '../validators/academic.validators.js';

export class AdminController {
  static async getInstitutionOverview(req: Request, res: Response) {
    const data = await AdminService.getInstitutionOverview();
    ApiResponse.ok(res, 'Institution overview retrieved successfully.', data);
  }

  static async getDepartmentOverview(req: Request, res: Response) {
    const departmentId = req.query.departmentId as string | undefined;
    const data = await AdminService.getDepartmentOverview(departmentId);
    ApiResponse.ok(res, 'Department overview retrieved.', data);
  }

  static async getFacultyDirectory(req: Request, res: Response) {
    const { departmentId, approvalStatus, accountStatus, search, page, limit } = req.query;
    const data = await AdminService.getFacultyDirectory({
      departmentId: departmentId as string,
      approvalStatus: approvalStatus as string,
      accountStatus: accountStatus as string,
      search: search as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    ApiResponse.ok(res, 'Faculty directory retrieved.', data);
  }

  static async getStudentDirectory(req: Request, res: Response) {
    const { departmentId, semesterNumber, accountStatus, search, page, limit } = req.query;
    const data = await AdminService.getStudentDirectory({
      departmentId: departmentId as string,
      semesterNumber: semesterNumber ? Number(semesterNumber) : undefined,
      accountStatus: accountStatus as string,
      search: search as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    ApiResponse.ok(res, 'Student directory retrieved.', data);
  }

  static async getAcademicActivity(req: Request, res: Response) {
    const data = await AdminService.getAcademicActivity();
    ApiResponse.ok(res, 'Academic activity metrics retrieved.', data);
  }

  static async getAuditLogs(req: Request, res: Response) {
    const { action, entityType, departmentId, search, startDate, endDate, page, limit } = req.query;
    const data = await AdminService.getAuditLogs({
      action: action as string,
      entityType: entityType as string,
      departmentId: departmentId as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
    });
    ApiResponse.ok(res, 'Audit logs retrieved.', data);
  }

  // ─── PRIVILEGED ACTIONS ───

  static async createDepartment(req: Request, res: Response) {
    const validated = createDepartmentSchema.parse(req.body);
    const meta = { ip: req.ip, userAgent: req.get('user-agent') };
    const dept = await AdminService.createDepartment((req as any).user._id, validated, meta);
    ApiResponse.created(res, 'Department created successfully.', dept);
  }

  static async updateDepartment(req: Request, res: Response) {
    const validated = updateDepartmentSchema.parse(req.body);
    const meta = { ip: req.ip, userAgent: req.get('user-agent') };
    const dept = await AdminService.updateDepartment(
      (req as any).user._id,
      req.params.id as string,
      validated,
      meta
    );
    ApiResponse.ok(res, 'Department updated successfully.', dept);
  }

  static async assignDepartmentHod(req: Request, res: Response) {
    const validated = assignDepartmentHodSchema.parse(req.body);
    const meta = { ip: req.ip, userAgent: req.get('user-agent') };
    const dept = await AdminService.assignDepartmentHod(
      (req as any).user._id,
      req.params.id as string,
      validated.hodUserId,
      meta
    );
    ApiResponse.ok(res, 'Head of Department assigned successfully.', dept);
  }

  static async toggleDepartmentStatus(req: Request, res: Response) {
    const { status } = req.body;
    const meta = { ip: req.ip, userAgent: req.get('user-agent') };
    const dept = await AdminService.toggleDepartmentStatus(
      (req as any).user._id,
      req.params.id as string,
      status,
      meta
    );
    ApiResponse.ok(res, `Department status set to ${status}.`, dept);
  }

  static async updateUserStatus(req: Request, res: Response) {
    const validated = updateUserStatusSchema.parse(req.body);
    const meta = { ip: req.ip, userAgent: req.get('user-agent') };
    const user = await AdminService.updateUserStatus(
      (req as any).user._id,
      req.params.userId as string,
      validated.accountStatus,
      validated.reason,
      meta
    );
    ApiResponse.ok(res, `User status updated to ${validated.accountStatus}.`, user);
  }
}
