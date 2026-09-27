import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Parsed, type-safe request input set by the validate() middleware. */
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
      /** Authenticated user entity set by the authenticate middleware. */
      user?: import('../models/User.js').IUser;
      /** Decoded JWT token payload. */
      token?: import('../security/token.utils.js').DecodedToken;
    }
  }
}

export {};
