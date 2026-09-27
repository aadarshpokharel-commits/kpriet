import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { type CookieOptions } from 'express';
import { env } from '../config/env.js';
import { type IUser } from '../models/User.js';
import { type UserRole } from '../types/academic.types.js';

export interface TokenPayload {
  sub: string;
  role: UserRole;
  department?: string | null;
  identifier: string;
  email: string;
  name: string;
}

export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
}

/**
 * Signs a short-lived access JWT for API authentication.
 */
export function generateAccessToken(user: IUser): string {
  const payload: TokenPayload = {
    sub: String(user._id),
    role: user.role,
    department: user.department ? String(user.department) : null,
    identifier: user.identifier,
    email: user.collegeEmail,
    name: user.name,
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
}

/**
 * Generates an opaque crypto-random refresh token and its SHA-256 hash.
 */
export function generateRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(token);
  // Default to 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return { token, tokenHash, expiresAt };
}

/**
 * SHA-256 hash a token for secure database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verifies an access JWT. Returns the decoded payload or null if invalid/expired.
 */
export function verifyAccessToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as DecodedToken;
  } catch {
    return null;
  }
}

/**
 * Standard secure httpOnly cookie configuration for access tokens.
 */
export function getAccessTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'strict' : 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 mins
  };
}

/**
 * Standard secure httpOnly cookie configuration for refresh tokens.
 */
export function getRefreshTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'strict' : 'lax',
    path: '/api/v1/auth', // Scoped to auth endpoints to minimize transmission
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}
