# Eduverse Dashboard — Architecture (foundation phase)

This phase delivers the foundation only: configuration, API layer, error handling, validation, security middleware, logging, database connection and the dashboard shell. **Authentication, roles and academic modules are not implemented yet.**

---

## 1. Principles

1. **The backend is the authority.** Every permission decision is made by the API. Frontend guards only decide what to show.
2. **Nothing academic is hardcoded in the frontend.** Roles, departments, semesters, subjects and teacher assignments come from the API.
3. **No secrets in code or in the browser bundle.** All config comes from validated environment variables; the app refuses to start on invalid config.
4. **One response shape** for every endpoint (below).
5. **The public website is untouched.** The dashboard is a separate app in `dashboard/`.

## 2. API response contract

```ts
// success
{ success: true,  message: string, data?: T }
// failure
{ success: false, message: string, error: { code: ErrorCode, details?: unknown, requestId?: string } }
```

Defined in `backend/src/types/api.types.ts` and mirrored in `frontend/src/types/api.types.ts`. **Change both together.**

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod or Mongoose validation failed; `details` = `[{ location, path, message }]` |
| `INVALID_JSON` | 400 | Malformed request body |
| `INVALID_ID` | 400 | Bad ObjectId / cast failure |
| `BAD_REQUEST` | 400 | Other client mistakes |
| `UNAUTHENTICATED` | 401 | Not signed in (auth phase) |
| `FORBIDDEN` | 403 | Signed in, lacks permission (auth phase) |
| `NOT_FOUND` / `ROUTE_NOT_FOUND` | 404 | Missing resource / unknown route |
| `CONFLICT` / `DUPLICATE_KEY` | 409 | Uniqueness conflicts (field names only, never values) |
| `PAYLOAD_TOO_LARGE` | 413 | Body over `JSON_BODY_LIMIT` |
| `RATE_LIMITED` | 429 | Includes `Retry-After` |
| `SERVICE_UNAVAILABLE` | 503 | e.g. database unreachable |
| `INTERNAL_ERROR` | 500 | Unexpected; generic message, stack logged server-side only |

Every response carries an `X-Request-Id` header, matching `error.requestId`, so a user-reported error can be found in the logs.

## 3. Backend (`dashboard/backend`)

```
src/
├── server.ts            Boot: listen → connect DB (retries) → graceful shutdown on SIGINT/SIGTERM
├── app.ts               createApp(): middleware order, routes, 404, error handler (no I/O; used by tests)
├── config/
│   ├── env.ts           Zod-validated env — the ONLY reader of process.env
│   └── logger.ts        pino: JSON in prod, pretty in dev, silent in tests; redacts secrets
├── database/
│   └── connection.ts    Mongoose connect/retry/disconnect, status + ping; strictQuery + sanitizeFilter
├── security/
│   ├── cors.ts          Allow-list from CORS_ORIGINS, credentials on, "*" rejected
│   └── helmet.ts        Locked-down headers for a JSON-only API; HSTS in production
├── middleware/
│   ├── requestLogger.ts Request id + one structured log line per request
│   ├── rateLimiter.ts   createRateLimiter() factory + global API limiter
│   ├── validate.ts      validate({ params, query, body }) with Zod → req.validated
│   ├── notFound.ts
│   └── errorHandler.ts  Normalises every error into the contract above
├── routes/
│   ├── index.ts         API root router (mounted at API_PREFIX)
│   └── health.routes.ts
├── controllers/         Thin: read validated input → call service → sendSuccess()
├── services/            Business logic (empty — filled per module)
├── models/              Mongoose schemas (empty — filled per module)
├── validators/          Zod request schemas per module (empty)
├── utils/               ApiError, apiResponse
└── types/               api.types.ts, express.d.ts (req.validated)
tests/app.test.ts        Contract, security headers, CORS, validation (supertest)
scripts/db-check.ts      npm run db:check
```

**Middleware order:** request id/logging → helmet → CORS → rate limit → compression → body parsers (size-limited) → cookies → routes → 404 → error handler.

**Adding a module** (e.g. departments):

```
models/department.model.ts
validators/department.validators.ts      Zod schemas for params/query/body
services/department.service.ts           all DB access and rules
controllers/department.controller.ts     no DB calls here
routes/department.routes.ts              router.post('/', authenticate, authorize('department:create'),
                                                     validate({ body: createDepartmentSchema }), create)
routes/index.ts                          apiRouter.use('/departments', departmentRoutes)
```

Express 5 forwards rejected promises from async handlers to the error handler automatically, so no `asyncHandler` wrapper is needed. Throw `ApiError.*` for expected failures.

**Health endpoints (public by design, expose no data):**
- `GET /api/v1/health`: liveness, 200 while the process runs
- `GET /api/v1/health/ready`: readiness, 200 with DB ping latency, or 503

## 4. Frontend (`dashboard/frontend`)

```
src/
├── main.tsx / App.tsx       QueryClientProvider + RouterProvider
├── config/
│   ├── env.ts               Zod-validated import.meta.env (the ONLY reader)
│   └── navigation.ts        Nav items; each may declare a `permission` key (auth phase)
├── lib/
│   ├── api/client.ts        Axios instance + typed api.get/post/put/patch/delete
│   ├── api/AppApiError.ts   Single UI error type (+ fieldErrors for react-hook-form)
│   ├── api/endpoints.ts     All API paths
│   ├── queryClient.ts       TanStack Query defaults (no retry on 4xx)
│   └── queryKeys.ts         Query-key factory
├── services/                One file per API area; returns typed data
├── hooks/                   useQuery/useMutation wrappers around services
├── schemas/                 Zod schemas (response checks now; forms later)
├── router/
│   ├── index.tsx            Route tree (basename = VITE_BASE_PATH)
│   ├── paths.ts
│   └── guards/              RequireAuth / RequirePermission (auth phase)
├── layouts/DashboardLayout.tsx
├── pages/                   SystemStatusPage, NotFoundPage, RouteErrorPage
├── components/ui/           Button, Spinner, StatusDot
├── components/brand/        BrandLogo (uses the existing logo file)
├── types/                   api.types.ts (mirror of backend)
├── utils/                   cn, format
└── styles/index.css         Design tokens (brand colours/fonts), Tailwind v4
```

**Data flow:** page → hook (TanStack Query) → service → `api` client → backend. Components never call axios directly. Server state lives in TanStack Query, not in component state or localStorage.

**Authentication readiness:** the client sends `withCredentials: true`, and the dev proxy makes `/api` same-origin, so the auth phase can use httpOnly cookies. Tokens will never be kept in localStorage.

## 5. Environment variables

| App | File | Notes |
|---|---|---|
| Backend | `backend/.env` (from `.env.example`) | Validated in `src/config/env.ts`; process exits with a clear list on error |
| Frontend | `frontend/.env.local` (from `.env.example`) | Only `VITE_*` values; public by nature, never secrets |

Key frontend values: `VITE_API_BASE_URL` (path or full URL), `VITE_BASE_PATH` (e.g. `/dashboard/` when served under the public site's domain), `VITE_PUBLIC_SITE_URL` (the "Go to website" link).

## 6. Verification performed

| Check | Result |
|---|---|
| Backend typecheck + build (`tsc`) | ✅ |
| Backend tests (11: contract, 404, invalid JSON, request id, security headers, CORS allow/deny, rate-limit headers, validation) | ✅ 11/11 |
| Backend starts (dev via tsx, prod via `node dist/server.js`) | ✅ |
| Invalid env rejected at boot with readable errors | ✅ |
| DB unreachable → `/health/ready` 503, bounded retries, clean shutdown | ✅ |
| **Successful MongoDB connection** | ⚠️ **Not verifiable in the build sandbox** (MongoDB binaries couldn't be downloaded). Run `npm run db:check` against your database. |
| Frontend typecheck + production build | ✅ |
| Frontend dev server + `/api` proxy to backend | ✅ |
| Production preview: `/` → `/system-status`, unknown route → "Page not found" | ✅ |
| System status page states (all OK / DB connecting / DB down / API down), desktop and 390 px mobile | ✅ |
| Existing public routes | ⏳ **Not verified**: the existing website was not provided. The dashboard does not modify it. |

## 7. Integration checklist and code to preserve

The existing project was **not available** when this foundation was built, so it was not inspected. When `dashboard/` is placed in the project, work through the following.

**Preserve (do not modify or delete):**
- All public pages and routes: Home, Features, Programmes, Students, Teachers, Smart Board, About, Sign In, Create Account
- The existing **Smart Board** and **simulation** implementations
- The **PiyushDhara / Eduverse logo** and brand assets
- Existing reusable UI components, styles and fonts
- Any existing environment variables and deployment configuration

**Integrate:**
1. Copy the existing logo to `frontend/public/brand/logo.png` and the favicon to `frontend/public/brand/favicon.png`.
2. Set the brand colours and font in `frontend/src/styles/index.css` (`@theme`) to the public site's exact values.
3. Check that ports don't clash: the dashboard uses 5173 (dev), 4173 (preview) and 5000 (API).
4. Decide where the dashboard is served from. With `/dashboard/`, set `VITE_BASE_PATH=/dashboard/` and route `/dashboard/*` to `frontend/dist` and `/api/*` to the backend in your reverse proxy.
5. Existing **Sign In / Create Account** and any **demo accounts**: inventory them before the auth phase. The demo accounts must become real seeded users in MongoDB (with hashed passwords), not frontend constants.
6. Existing API calls or hardcoded data (roles, departments, semesters, subjects, teacher assignments): list them. These move to backend models in later phases.
7. Re-run the public site's own build to confirm nothing changed.

## 8. Next phase (not started)

Authentication: User model, argon2 hashing, JWT access plus refresh tokens in httpOnly cookies, `authenticate` and `authorize(permission)` middleware, a stricter rate limit on sign-in, `RequireAuth` and `RequirePermission` guards, and roles and permissions stored in the database.
