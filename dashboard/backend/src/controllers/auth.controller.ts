import { type Request, type Response } from 'express';
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from '../security/token.utils.js';
import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class AuthController {
  static async registerStudent(req: Request, res: Response) {
    const input = req.validated?.body as any;
    const meta = {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const { user, accessToken, refreshToken } = await AuthService.registerStudent(
      input,
      meta
    );

    res.cookie('accessToken', accessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    ApiResponse.created(
      res,
      'Student account registered successfully.',
      {
        user,
        accessToken,
      }
    );
  }

  static async registerTeacher(req: Request, res: Response) {
    const input = req.validated?.body as any;
    const meta = {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const result = await AuthService.registerTeacher(input, meta);

    ApiResponse.created(
      res,
      result.message,
      {
        user: result.user,
        approvalStatus: result.user.approvalStatus,
      }
    );
  }

  static async login(req: Request, res: Response) {
    const input = req.validated?.body as any;
    const meta = {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const { user, accessToken, refreshToken } = await AuthService.login(
      input,
      meta
    );

    res.cookie('accessToken', accessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    ApiResponse.ok(res, 'Signed in successfully.', {
      user,
      accessToken,
    });
  }

  static async refresh(req: Request, res: Response) {
    const refreshTokenString =
      req.cookies?.refreshToken || (req.body as any)?.refreshToken;
    const meta = {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const { user, accessToken, refreshToken: newRefreshToken } =
      await AuthService.refreshSession(refreshTokenString, meta);

    res.cookie('accessToken', accessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', newRefreshToken, getRefreshTokenCookieOptions());

    ApiResponse.ok(res, 'Session refreshed successfully.', {
      user,
      accessToken,
    });
  }

  static async logout(req: Request, res: Response) {
    const refreshTokenString =
      req.cookies?.refreshToken || (req.body as any)?.refreshToken;

    await AuthService.logout(refreshTokenString, req.user);

    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });

    ApiResponse.ok(res, 'Signed out successfully.');
  }

  static async me(req: Request, res: Response) {
    const userContext = await AuthService.getCurrentUserContext(
      String(req.user!._id)
    );
    ApiResponse.ok(res, 'User context retrieved successfully.', userContext);
  }

  static async getDepartments(_req: Request, res: Response) {
    const departments = await AuthService.getActiveDepartments();
    ApiResponse.ok(res, 'Active departments retrieved successfully.', departments);
  }

  static async getPublicStats(_req: Request, res: Response) {
    const stats = await AuthService.getPublicStats();
    ApiResponse.ok(res, 'Public institutional stats retrieved successfully.', stats);
  }
}
