# Experteam MMS (Manpower Management System)

A web-based manpower management platform for **Experteam Co., Ltd.**, supporting
offshore/onshore workforce planning, training & certification compliance,
medical records, client-side requirement matching, approval workflows, and
mobilization tracking for oil & gas clients (Chevron and others).

The system has two parts:

- **MMS (back-office web app):** used by HR, Manpower, Training, Safety, Project
  Engineers and Admin
- **Worker App (mobile-first):** used by field workers to log in with Employee
  ID + PIN, check readiness, confirm jobs, and submit requests

---

## Overview

MMS is the internal system Experteam uses to manage its workforce across
client contracts. It covers the full lifecycle: worker onboarding, training
and medical compliance tracking, client requirement matching, PE approval
for partially matched workers, project allocation, offshore
mobilization/demobilization, and post-project review.

**Client contracts currently supported:**

| Client | Notes |
|--------|-------|
| Chevron | Primary active contract (Chevron Training Matrix) |
| Others | Additional clients can be added via `Client` / `Contract` records |

---

## 📸 Screenshots

### 🏠 Dashboard
![Dashboard](screenshots/dashboard.png)

### Workforce

#### 👥 Workers
Worker list with search and filters by department, position, status, availability, and mobilization.
![Workers](screenshots/workers.png)

#### 👷 Worker Detail
Full profile with compact sticky header, roster, and document export.
![Worker Detail](screenshots/worker-detail.png)

#### ✏️ Edit Worker
Tabbed form with sticky tabs and save bar.
![Edit Worker](screenshots/edit-worker.png)

### Compliance

#### 🛡️ Compliance Center
![Compliance Center](screenshots/compliance-center.png)

#### 📋 Certifications
![Certifications](screenshots/certifications.png)

#### 🧩 Training Matrix
Position-to-training requirements per contract (Mandatory / Assigned).
![Training Matrix](screenshots/training-matrix.png)

#### 📢 Requests from MP
Training and medical check-up requests raised by Manpower.
![Requests from MP](screenshots/requests-from-mp.png)

#### 🎓 Manage Trainings
![Manage Trainings](screenshots/manage-trainings.png)

### Operations

#### 🗂 Projects
![Projects](screenshots/projects.png)

#### 💬 Project Detail & Discussion
Position requests, employee timeline, and PE ↔ Manpower discussion with attachments.
![Project Detail](screenshots/project-detail.png)

#### 👥 Worker Allocation
![Allocation](screenshots/allocation.png)

#### ✅ PE Approvals
Workers below 100% match, grouped by project and position, approved or rejected by the Project Engineer.
![PE Approvals](screenshots/pe-approvals.png)

#### 📄 CV Summary Export
![CV Summary](screenshots/cv-summary.png)

#### 🚀 Mobilization
![Mobilization](screenshots/mobilization.png)

#### 📊 Projects Overview
![Projects Overview](screenshots/projects-overview.png)

### System

#### 🕵️ Audit Log
Who did what and when, with filters, before/after changes, and CSV export.
![Audit Log](screenshots/audit-log.png)

### 📱 Worker App

<table>
  <tr>
    <td align="center"><img src="screenshots/worker-app-login.png" width="240" alt="Worker App login"><br><sub>Login (Employee ID + PIN)</sub></td>
    <td align="center"><img src="screenshots/worker-app-readiness.png" width="240" alt="Worker App readiness"><br><sub>Readiness</sub></td>
    <td align="center"><img src="screenshots/worker-app-change-pin.png" width="240" alt="Worker App change PIN"><br><sub>Change PIN</sub></td>
  </tr>
</table>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, React Router, Tailwind CSS v4, react-select, Axios, Recharts, lucide-react, react-toastify |
| Backend | Node.js, Express.js, Prisma ORM, PostgreSQL 16, Multer (file uploads), bcryptjs |
| Auth | JWT in HTTP-only cookies (separate sessions for MMS users and Worker App) |
| Development | Docker Compose (frontend / backend / database containers) |
| Production | Ubuntu server, PM2 (backend process), static Vite build for the frontend |

---

## Features

### Workforce
- **Worker profiles:** personal details, Employee ID / internal code,
  position, department, passport & work permit, photo upload, CV/resume
  details, offshore roster data (health risk, SSE level, permanent flag)
- **Add / Edit Worker:** tabbed form (Profile & Status, Documents &
  Compliance, CV / Resume Info, PE / Medical Exam) with sticky tabs and
  save bar
- **Worker Detail:** full profile with a compact sticky header when
  scrolling, deployment history, and document export

### Compliance
- **Training compliance:** central `GlobalTraining` catalog plus per-source /
  per-client `TrainingStandard`, with expiry buckets (Expired / Critical /
  Warning / Upcoming / Valid)
- **Training Matrix & Matrix Editor:** position-to-training requirements
  per contract (Mandatory / Assigned)
- **Compliance Center:** worker-centric overview that keeps training alerts
  and medical status in separate columns, plus client requirement gap
  analysis (Mandatory / Assigned / Others)
- **Certifications:** cert-centric view (one training, every worker's
  status), including bulk certificate entry
- **Medical records:** annual check-up and Confined Space records, hospital,
  exam/expiry dates, fitness status, and detailed PE exam results
- **Requests from MP:** training and medical check-up requests raised by
  Manpower, tracked as pending / completed

### Operations
- **Projects:** Master Project Register (ON Number), project activation per
  contract, and position requests with headcount
- **Allocation:** match workers against client requirements (% match),
  shortlist (Proposed → Approved), and export CV Summary / Roster
  (MOB–D-MOB) / Skill Matrix (print & Excel) for client submission
- **PE Approvals:** workers below 100% match can be submitted with a reason;
  the Project Engineer approves or rejects each worker, grouped by
  project and position
- **Mobilization:** pre-mobilization checklist (PPE, alcohol test, blood
  pressure, baggage inspection, pre-field training, transport/hotel/vessel
  booking), then deploy to site with D-MOB calculated from the MOB date
- **Projects Overview:** in-progress / upcoming / completed projects with
  staffing progress and the employee timeline
- **Project Discussion:** PE ↔ Manpower message thread with file attachments
  on each project

### Review & Reports
- **Post-Project Review:** per-worker rating and rehire recommendation
- **Analytics & Reports** and **Dashboard:** total workers, readiness,
  on-site count (live from `Assignment` records), certification alerts,
  and compliance charts

### Worker App
- Login with Employee ID + PIN, with lockout after repeated failed attempts
- Forced PIN change on first login; self-service PIN change with rules
  (no repeated digits, sequences, Employee ID, or birth date)
- Readiness view, job confirmation, and leave requests

### System
- **Role-based access control (RBAC):** sidebar visibility and route
  enforcement per role
- **User Management:** users, roles, and links to worker records
- **Bulk Set PIN:** issue Worker App PINs to many workers at once
- **Audit Log:** automatic record of who did what (create, update, delete,
  approve, upload, login/logout, failed login) across the MMS and the
  Worker App. Passwords, PINs, and tokens are redacted. The admin page has
  filters, a detail view with before/after changes, and CSV export
- **Notifications:** in-app notification bell with links to related pages
- **Standard links:** navigation uses real links, so right-click
  "Open link in new tab" works throughout the app

---

## Roles

| Role | Description |
|------|-------------|
| `admin` | Full system access, user management, Audit Log |
| `project_engineer` | Project operations and PE Approvals (approve/reject partially matched workers) |
| `manpower_supply` | Allocation, mobilization, candidate management |
| `hr_supervisor` | HR supervision: workers, compliance, requests |
| `personal_record_officer` | Worker records and documents |
| `hr_officer` | Worker and training data management |
| `training_officer` | Training records, matrix, and certifications |
| `safety_manager` | Safety compliance, worker and project visibility |
| `safety_officer` | Mobilization safety checks |

> Sidebar visibility is defined in `sidebarMenu.js`; enforcement is in
> `AppRouter.jsx` (`ProtectedRoute allowRoles`). The two must stay in sync.

---

## Manpower Workflow

```
Project activated from Master Project Register (ON Number)
↓
Position Requests created (position + headcount)
↓
Allocation: search & match workers (% match vs client requirements)
↓
Shortlist candidates (Proposed)
├─ 100% match → Approve (Proposed → Approved)
└─ < 100% match → submit to PE Approvals → PE approves / rejects
↓
Generate CV Summary / Roster / Skill Matrix → send to client
↓
Worker confirms the job in the Worker App
↓
Mobilization: pre-mobilization checklist (PPE, alcohol test, BP, briefing, travel)
↓
Deploy to site → Assignment created (MOB / D-MOB)
↓
Post-Project Review (after demobilization)
```

---

## Project Structure

```
MMS/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/            # Layout, Navbar, Sidebar, sidebarMenu.js
│   │   │   ├── worker-layout/     # Worker App layout
│   │   │   ├── print/             # CV / Roster / Skill Matrix print components
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/               # AppContext, WorkerAppContext
│   │   ├── hooks/                 # useStickyState
│   │   ├── pages/
│   │   │   ├── auth/              # Login, ResetPassword
│   │   │   ├── dashboard/         # Dashboard
│   │   │   ├── workers/           # Workers, AddWorker, EditWorker, WorkerDetail, BulkSetPin
│   │   │   ├── compliance/        # ComplianceDashboard, Certifications, BulkAddCertification,
│   │   │   │                      #   RequestsHistory, TrainingRequestDetail, MedicalRequestDetail
│   │   │   ├── training/          # TrainingMatrix, ManageTrainings
│   │   │   ├── positions/         # ManagePositions, ManageDivisions, MatrixEditor
│   │   │   ├── projects/          # Project, ProjectDetail, EditProject, Allocation,
│   │   │   │                      #   PEApprovals, Mobilization, ProjectsOverview,
│   │   │   │                      #   PostProjectReview, AnalyticsReports
│   │   │   ├── worker/            # Worker App pages (login, readiness, PIN change, ...)
│   │   │   └── admin/             # AdminUsers, AuditLogs
│   │   ├── routes/                # AppRouter, WorkerAppRouter
│   │   └── App.jsx
│   └── vite.config.js
│
├── backend/
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   ├── middleware/                # userAuth, workerAuth, auditTrail
│   ├── utils/                     # expiryStatus, auditLogger
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seeds/
│   ├── scripts/                   # data import / setup scripts
│   ├── uploads/                   # worker photos, certificates, attachments
│   └── server.js
│
├── screenshots/
└── compose.yaml
```

---

## Getting Started (Development, Docker)

### 1. Clone the repository

```bash
git clone https://github.com/expt-software/MMS.git
cd MMS
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

### 3. Run migrations and seed data

```bash
docker exec -it chevron-backend npx prisma migrate dev
docker exec -it chevron-backend npx prisma generate
docker exec -it chevron-backend node prisma/seed.js
```

> ⚠️ **After any backend change** (`services/`, `controllers/`, `routes/`,
> `middleware/`, `server.js`, or `schema.prisma`), restart the backend
> container. Node does not hot-reload:
> ```bash
> docker restart chevron-backend
> ```
> Frontend changes hot-reload automatically through Vite.

---

## Production Deployment

```bash
cd <repo-root>
git pull origin main

# Backend: apply pending migrations, then restart
cd backend
npx prisma migrate deploy
npx prisma generate
pm2 restart mms-backend

# Frontend: rebuild static files
cd ../frontend
npm install
npm run build
```

Skip `migrate deploy` / `generate` when `schema.prisma` has not changed.

---

## Environment Variables

**`backend/.env`**

```env
PORT=4100
DATABASE_URL=postgresql://user:password@chevron-db:5432/manpower_db
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5175

# Optional: delete audit log entries older than N days (unset = keep forever)
AUDIT_RETENTION_DAYS=730
```

**`frontend/.env`**

```env
VITE_BACKEND_URL=http://localhost:4100
```
