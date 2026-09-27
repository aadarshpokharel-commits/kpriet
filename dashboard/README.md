# Eduverse Dashboard

The academic management dashboard for PiyushDhara Eduverse. It sits **beside** the existing public website and does not modify it:

```
<your-project>/
├── ...existing public website (Home, Features, Programmes, Students,
│      Teachers, Smart Board, About, Sign In, Create Account) — unchanged
└── dashboard/
    ├── backend/    Node + Express + TypeScript + MongoDB API
    └── frontend/   React + TypeScript + Vite dashboard app
```

## Quick start

Requires Node 20.11+ and a MongoDB instance (local or Atlas).

```bash
cd dashboard
npm run install:all

cp backend/.env.example backend/.env            # set MONGODB_URI
cp frontend/.env.example frontend/.env.local

npm run db:check        # confirms the API can reach MongoDB
npm run dev:backend     # http://localhost:5000/api/v1/health
npm run dev:frontend    # http://localhost:5173  (second terminal)
```

Open http://localhost:5173. The **System status** page shows whether the dashboard can reach its server and database.

## Commands

| Command | What it does |
|---|---|
| `npm run verify` | Typecheck both apps, run backend tests, build both |
| `npm run build` | Production build of backend (`backend/dist`) and frontend (`frontend/dist`) |
| `npm run db:check` | Connects to MongoDB using `backend/.env`, exits 0 or 1 |
| `npm --prefix backend start` | Run the built API |
| `npm --prefix frontend run preview` | Serve the built frontend locally |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure, conventions and the integration checklist.
