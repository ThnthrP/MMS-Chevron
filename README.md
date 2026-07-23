# Experteam MMS (Manpower Management System)

A web-based manpower management platform for **Experteam Co., Ltd.**, supporting
offshore/onshore workforce planning, training & certification compliance,
medical records, client-side requirement matching, and mobilization tracking
for oil & gas clients (Chevron and others).

---

## Overview

MMS is the internal system Experteam uses to manage its workforce across
client contracts — from worker onboarding, training compliance tracking,
and client requirement matching, through project allocation and offshore
mobilization/demobilization.

**Client contracts currently supported:**

| Client | Notes |
|--------|-------|
| Chevron | Primary active contract (Chevron Matrix) |
| Others | Additional clients can be added via `Client`/`Contract` records |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite), React Router v6, react-select, Axios, Recharts |
| Backend | Node.js, Express.js, Prisma ORM, PostgreSQL |
| Auth | JWT (HTTP-only cookie) |
| Deployment | Docker Compose (dev & production), True IDC VMware Cloud VM |

---

## Features

- **Role-based access control (RBAC)** — routes and pages gated per role
- **Worker profiles** — personal details, CV info, passport/work permit, photo upload
- **Training compliance** — centralized `GlobalTraining` + per-source/client
  `TrainingStandard`, expiry tracking (Expired / Critical / Warning / Valid buckets)
- **Compliance Center** — worker-centric compliance overview with client
  requirement gap analysis (Mandatory / Assigned / Others)
- **Certifications** — cert-centric view: pick a training, see every worker's
  status for that specific cert (Expired / Critical / Warning / Valid / Missing)
- **Manage Trainings** — CRUD for the global training catalog and its
  standard (source, training hours, validity in years, no-expiry flag)
- **Medical records** — hospital, exam/expiry dates, fitness status
- **Project & Allocation workflow** — position requests → worker matching
  (% match against client requirements) → shortlist (Proposed → Approved)
  → CV Summary / Roster (MOB–D-MOB) / Skill Matrix export for client submission
- **Mobilization** — checklist (PPE, safety induction, medical fit) → deploy
  to site, with D-MOB auto-calculated from MOB date
- **Dashboard** — total workers, ready-for-deployment, currently on-site
  (live from `Assignment` records), certification alerts, compliance-by-type chart

---

## Roles

| Role | Full Name | Description |
|------|-----------|-------------|
| `admin` | Administrator | Full system access |
| `pe` | Project Engineer | Creates project/position requests |
| `pe_head` | Project Engineer Head | PE approval override |
| `manpower` | Manpower Coordinator | Allocation, mobilization, candidate management |
| `hr` | Human Resources | Employee & training data management |
| `safety` | Safety Officer | Safety compliance & certification review |
| `nurse` | Occupational Health Nurse | Medical records and fitness checks |
| `ta` | Technical Authority | Mobilization technical approval |
| `expert` | Subject Matter Expert | Training/qualification review, allocation matching |
| `bd` | Business Development | Reports & analytics |

---

## Manpower Workflow

```
Project + Position Request created
↓
Allocation: search & match workers (% match vs client requirements)
↓
Shortlist candidate (Proposed)
↓
Approve candidate (Proposed → Approved)
↓
Generate CV Summary / Roster / Skill Matrix → send to client
↓
Mobilization: checklist (PPE, safety induction, medical fit)
↓
Deploy to site → Assignment created (MOB / D-MOB)
↓
Post-Project Review (after demobilization)
```

---

## Project Structure

```
MMS-Chevron/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Layout, Sidebar, sidebarMenu.js
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/              # AppContext
│   │   ├── hooks/                 # useStickyState
│   │   ├── pages/
│   │   │   ├── auth/              # Login, Profile, ResetPassword
│   │   │   ├── dashboard/         # AdminDashboard
│   │   │   ├── workers/           # Workers, AddWorker, EditWorker, WorkerDetail
│   │   │   ├── compliance/        # ComplianceDashboard, Certifications
│   │   │   ├── training/          # TrainingMatrix, ManageTrainings
│   │   │   ├── positions/         # ManagePositions, ManageDivisions, MatrixEditor
│   │   │   ├── projects/          # Project, ProjectDetail, EditProject,
│   │   │   │                      #   Allocation, Mobilization, PostProjectReview,
│   │   │   │                      #   AnalyticsReports
│   │   │   └── admin/             # AdminUsers
│   │   ├── routes/                # AppRouter
│   │   └── App.jsx
│   └── vite.config.js             # usePolling enabled for Docker on Windows (dev only)
│
└── backend/
├── controllers/
├── services/
├── routes/
├── prisma/
│   ├── schema.prisma
│   └── seeds/                 # seedTrainingStandards.js, etc.
├── uploads/                   # worker photos, branding assets (logo, ISO badges)
└── server.js
```

---

> **Routing note:** all app routes are mounted at root (`/`) — the previous
> `/admin` path prefix has been removed from both the frontend router and
> every internal `navigate()` call.

---

## Getting Started (Docker)

### 1. Clone repository

```bash
git clone https://github.com/your-org/MMS-Chevron.git
cd MMS-Chevron
```

### 2. Start containers

```bash
docker compose up -d
```

| Container | Service | Port |
|-----------|---------|------|
| `chevron-frontend` | Vite dev server | `5175` |
| `chevron-backend` | Express API | `4100` |
| `chevron-db` | PostgreSQL | `5434` (host) → `5432` (container) |

### 3. Run migrations & seed

```bash
docker exec -it chevron-backend npx prisma migrate dev
docker exec -it chevron-backend node prisma/seed.js
```

> ⚠️ **After any backend code change** (`services/`, `controllers/`, `routes/`,
> `server.js`, or `schema.prisma`), you must restart the backend container —
> Node does not hot-reload:
> ```bash
> docker compose restart backend
> ```
> Frontend changes hot-reload automatically via Vite + `usePolling` (Windows
> bind-mount workaround, dev only — remove for production builds served via nginx).

---

## Environment Variables

**`backend/.env`**

```env
PORT=4100
DATABASE_URL=postgresql://user:password@chevron-db:5432/manpower_db
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5175
```

**`frontend/.env`**

```env
VITE_BACKEND_URL=http://localhost:4100
```

---

## Development Status

| Module | Status |
|--------|--------|
| Authentication (JWT) | ✅ Done |
| RBAC | ✅ Done |
| Worker profiles & CV data | ✅ Done |
| Training compliance (GlobalTraining + TrainingStandard) | ✅ Done |
| Compliance Center (worker-centric) | ✅ Done |
| Certifications (cert-centric view) | ✅ Done |
| Manage Trainings (CRUD) | ✅ Done |
| Medical records | ✅ Done |
| Allocation (matching, shortlist, Proposed/Approved) | ✅ Done |
| CV Summary / Roster / Skill Matrix export | ✅ Done (Skill Matrix data cleanup in progress) |
| Mobilization (deploy to site) | ✅ Done |
| Dashboard (on-site count, cert compliance chart) | ✅ Done |
| Post-Project Review | 🔄 In progress |
| Production build (nginx static, non-dev containers) | ⏳ Planned |
| Nightly DB backup to on-prem NAS | ⏳ Planned |
| Notification / email reminders | ⏳ Planned |

---

## Planned Features

- Production deployment (static frontend build served via nginx, remove
  `usePolling` dev workaround)
- Nightly `pg_dump` backup to on-prem NAS for disaster recovery
- Email reminders for training expiry
- `mobilizationStatus` auto-sync with `Assignment` create/delete
- Mobile-responsive layout optimization
