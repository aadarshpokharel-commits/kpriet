import type { RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import type { ValidationIssue } from '../types/api.types.js';

interface RequestSchemas {
  params?: ZodTypeAny;
  query?: ZodTypeAny;
  body?: ZodTypeAny;
}

const LOCATIONS = ['params', 'query', 'body'] as const;

/**
 * Validates params, query and body against Zod schemas.
 * All failures are collected and returned together as VALIDATION_ERROR.
 * Parsed values (with defaults/coercion applied, unknown keys stripped)
 * are placed on req.validated; req.body is also replaced with the parsed body.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const issues: ValidationIssue[] = [];
    const validated: NonNullable<Express.Request['validated']> = {};

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location] ?? {});
      if (result.success) {
        validated[location] = result.data;
      } else {
        for (const issue of result.error.issues) {
          issues.push({ location, path: issue.path.join('.'), message: issue.message });
        }
      }
    }

    if (issues.length > 0) return next(ApiError.validation(issues));

    req.validated = validated;
    if (validated.body !== undefined) req.body = validated.body;
    return next();
  };
}

/** Typed accessor for controllers: const q = getValidated(req, 'query', listQuerySchema). */
export function getValidated<S extends ZodTypeAny>(
  req: Express.Request,
  location: keyof RequestSchemas,
  _schema: S,
): z.infer<S> {
  return req.validated?.[location] as z.infer<S>;
}
