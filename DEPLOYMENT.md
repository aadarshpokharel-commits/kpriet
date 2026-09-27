# Eduverse Academic Platform — Production Deployment Guide

This guide explains how to deploy the **Eduverse Academic Platform** (Backend API, Frontend Dashboard, Smart Board Simulations, and MongoDB Atlas Database).

---

## 1. Prerequisites & Services

1. **MongoDB Atlas Cluster**:
   - Connection URI: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/eduverse?retryWrites=true&w=majority`
   - **Crucial Step (Network Access)**: 
     - Go to [MongoDB Atlas](https://cloud.mongodb.com) → **Network Access** → Click **+ Add IP Address**.
     - Choose **Allow Access from Anywhere (`0.0.0.0/0`)** so your deployment servers (Render, Railway, AWS, etc.) can connect.
     - Click **Confirm**.

2. **Node.js**: v20.11 or higher.

3. **Cloud Hosting Recommendations**:
   - **Backend API**: Render (Web Service), Railway, Fly.io, or VPS (Ubuntu + PM2 + Nginx).
   - **Frontend & Smart Board**: Vercel, Netlify, Render (Static Site), or served directly via backend reverse proxy.

---

## 2. Environment Variables Configuration

### Backend (`dashboard/backend/.env`)

```ini
NODE_ENV=production
PORT=5000
API_PREFIX=/api/v1

# MongoDB Atlas
MONGODB_URI=mongodb+srv://23it040_db_user:<your_password>@cluster0.mxbtbyz.mongodb.net/eduverse?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB_NAME=eduverse
DB_CONNECT_RETRIES=5
DB_CONNECT_RETRY_DELAY_MS=3000

# Allowed Frontend Origins (comma-separated, no trailing slash)
CORS_ORIGINS=https://your-frontend-domain.vercel.app,http://localhost:5173

# Reverse Proxy (Set to 1 if behind Nginx / Render / Cloudflare)
TRUST_PROXY=1

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
JSON_BODY_LIMIT=100kb
LOG_LEVEL=info

# Authentication (Minimum 32-character secure strings)
JWT_ACCESS_SECRET=your_super_secret_jwt_access_key_min_32_characters!
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key_min_32_characters!
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET=your_super_secret_cookie_signing_key_min_32_characters!

# OpenAI Integration (Subject AI & RAG)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### Frontend (`dashboard/frontend/.env.production`)

```ini
VITE_API_BASE_URL=https://your-backend-api.onrender.com/api/v1
VITE_APP_NAME=Eduverse Academic Platform
VITE_API_TIMEOUT_MS=15000
VITE_BASE_PATH=/
```

---

## 3. Database Migration / Seeding to Atlas

Once your Atlas Network Access has `0.0.0.0/0` enabled, run the migration script from `dashboard/backend`:

```bash
cd dashboard/backend
# Migrate local data directly to your Atlas cluster:
npx tsx scripts/migrate-to-atlas.ts
```

Or seed the full curriculum, departments, subjects, students, and simulations directly on Atlas:

```bash
cd dashboard/backend
# Check connectivity
npm run db:check

# Seed academic structures & simulations
npm run db:seed
npx tsx scripts/seed-it-semesters.ts
npx tsx scripts/seed-all-subject-samples.ts
npx tsx scripts/seed-enroll-students.ts
npx tsx scripts/seed-os-simulations.ts
npx tsx scripts/seed-c-simulations.ts
```

---

## 4. Deployment Options

### Option A: Render.com (Recommended for Fast Full-Stack Deploy)

#### 1. Deploy Backend Web Service
- **Build Command**: `cd dashboard/backend && npm install && npm run build`
- **Start Command**: `cd dashboard/backend && npm start`
- Add all Backend Environment Variables in Render Dashboard.

#### 2. Deploy Frontend Static Site
- **Build Command**: `cd dashboard/frontend && npm install && npm run build`
- **Publish Directory**: `dashboard/frontend/dist`
- Add `VITE_API_BASE_URL=https://<your-render-backend-url>/api/v1`

---

### Option B: Monolithic Single-Server Deploy (PM2 + Nginx / Docker)

The backend Express app serves the Smart Board static files at `/smartboard` and API at `/api/v1`.
You can build the frontend and serve it from the backend or an Nginx reverse proxy:

```bash
# Build Backend
cd dashboard/backend
npm install
npm run build

# Build Frontend
cd ../frontend
npm install
npm run build

# Start Backend via PM2
cd ../backend
pm2 start dist/server.js --name "eduverse-api"
```

---

## 5. Verification Checklist

- [ ] MongoDB Atlas Network Access is set to `0.0.0.0/0` (Allow Anywhere).
- [ ] Backend health check responds at `GET /health` or `GET /api/v1/system/status`.
- [ ] Teacher & Student authentication works via official college emails (`it.sem1.teacher@kpriet.ac.in`).
- [ ] Simulations launch inside the Smart Board (`/smartboard/c-simulation.html`, `/smartboard/os-simulation.html`, etc.).
- [ ] Subject AI responds with live simulation state context.
