import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../src/app.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { requestLogger } from '../src/middleware/requestLogger.js';
import { validate } from '../src/middleware/validate.js';
import { sendSuccess } from '../src/utils/apiResponse.js';

const app = createApp();

describe('response contract', () => {
  it('liveness returns the success envelope', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, message: expect.any(String), data: { status: 'ok' } });
  });

  it('readiness returns 503 with details when the database is down', async () => {
    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', details: { database: { latencyMs: null } } },
    });
  });

  it('unknown routes return ROUTE_NOT_FOUND with a request id', async () => {
    const res = await request(app).get('/api/v1/does-not-exist?x=1');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(res.body.message).not.toContain('?x=1');
    expect(res.headers['x-request-id']).toBe(res.body.error.requestId);
  });

  it('malformed JSON returns INVALID_JSON, not a 500', async () => {
    const res = await request(app).post('/api/v1/health').set('Content-Type', 'application/json').send('{"bad":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('reuses a safe incoming X-Request-Id and rejects unsafe ones', async () => {
    const good = await request(app).get('/api/v1/health').set('X-Request-Id', 'lb-trace-12345');
    expect(good.headers['x-request-id']).toBe('lb-trace-12345');
    const bad = await request(app).get('/api/v1/health').set('X-Request-Id', '<script>');
    expect(bad.headers['x-request-id']).not.toBe('<script>');
  });
});

describe('security headers and CORS', () => {
  it('sets hardening headers and hides the framework', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('allows listed origins with credentials', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not grant CORS to unlisted origins', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sends rate-limit headers on API routes', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['ratelimit-policy']).toBeDefined();
  });
});

describe('validate() middleware', () => {
  const testApp = express();
  testApp.use(requestLogger);
  testApp.use(express.json());
  testApp.post(
    '/items/:id',
    validate({
      params: z.object({ id: z.string().regex(/^[a-f0-9]{24}$/, 'Must be a valid id') }),
      body: z.object({ name: z.string().trim().min(2), semester: z.coerce.number().int().min(1).max(8) }),
    }),
    (req, res) => sendSuccess(res, { message: 'ok', data: req.body }),
  );
  testApp.use(errorHandler);

  it('collects every failing field across locations', async () => {
    const res = await request(testApp).post('/items/nope').send({ name: 'a', semester: 12 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = res.body.error.details.map((d: { location: string; path: string }) => `${d.location}.${d.path}`);
    expect(paths).toEqual(expect.arrayContaining(['params.id', 'body.name', 'body.semester']));
  });

  it('replaces the body with parsed data and strips unknown keys', async () => {
    const res = await request(testApp)
      .post('/items/64b7f0c2a1b2c3d4e5f60718')
      .send({ name: '  Physics  ', semester: '3', role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ name: 'Physics', semester: 3 });
  });
});
