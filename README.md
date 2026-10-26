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
client contracts. It covers the full lifecycle: client manpower requirements,
assigning names (requirement matching), PE approval for partially matched
workers, availability checks on the Manpower Calendar, training and medical
bookings, offshore mobilization/demobilization, and post-project review,
plus ongoing training and medical compliance tracking for every worker.

**Client contracts currently supported:**

| Client | Notes |
|--------|-------|
| Chevron | Primary active contract (Chevron Training Matrix) |
| Others | Additional clients can be added via `Client` / `Contract` records |

---

## 📸 Screenshots

> Screenshots use test data or have employee names and IDs blurred.

### Overview

#### 🏠 My Dashboard
KPIs, pending work (unfilled positions, PE approvals, projects starting in 30
days, bookings awaiting HR, D-MOB in 7 days), worker status, and certification
compliance by type.
![My Dashboard](screenshots/dashboard.png)

#### 🛡️ Compliance Center
Click a status count to filter; training alerts and medical status in separate columns.
![Compliance Center](screenshots/compliance-center.png)

#### 📊 Analytics & Reports
![Reports](screenshots/reports.png)

### Operations

#### 📋 Manpower Requirements
Every open position request across projects, with progress, filters, and
search by position, project, location, or worker name (Thai / English).
![Manpower Requirements](screenshots/manpower-requirements.png)

#### 👥 Assign Names
Match workers against client requirements (% match) and shortlist candidates.
![Assign Names](screenshots/allocation.png)

#### ✅ PE Approvals
Workers below 100% match, grouped by project and position, approved or rejected by the Project Engineer.
![PE Approvals](screenshots/pe-approvals.png)

#### 📅 Manpower Calendar
Projects with staffing progress and each worker's timeline, used to check availability.
![Manpower Calendar](screenshots/manpower-calendar.png)

#### 🎓 Training Bookings
Training requests for workers with missing, expired, or expiring records.
![Training Bookings](screenshots/training-bookings.png)

#### 🩺 Medical Bookings
![Medical Bookings](screenshots/medical-bookings.png)

#### 🚀 Mobilization
![Mobilization](screenshots/mobilization.png)

#### ⭐ Post-Project Review
![Post-Project Review](screenshots/post-project-review.png)

#### 👷 Worker Pool
Worker list with search and filters by department, position, status, availability, and mobilization.
![Worker Pool](screenshots/workers.png)

#### 🪪 Worker Detail
![Worker Detail](screenshots/worker-detail.png)

#### 💬 Project Detail & Discussion
Position requests, employee timeline, and PE ↔ Manpower discussion with attachments.
![Project Detail](screenshots/project-detail.png)

#### 📄 CV Summary Export
![CV Summary](screenshots/cv-summary.png)

### Settings

#### 🧩 Training Matrix
Position-to-training requirements per contract (Mandatory / Assigned).
![Training Matrix](screenshots/training-matrix.png)

### Admin

#### 🕵️ Audit Log
Who did what and when, with filters, before/after changes, and CSV export.
![Audit Log](screenshots/audit-log.png)

#### 📥 Data Import
Upload HR Excel files (Training Record or PE Tracking), preview what will change, then confirm.
![Data Import](screenshots/data-import.png)

### 📱 Worker App

<table>
  <tr>
    <td align="center"><img src="screenshots/worker-app-login.png" width="240" alt="Worker App login"><br><sub>Login (Employee ID + PIN)</sub></td>
    <td align="center"><img src="screenshots/worker-app-change-pin.png" width="240" alt="Worker App set new PIN"><br><sub>Set new PIN (first login)</sub></td>
    <td align="center"><img src="screenshots/worker-app-pending.png" width="240" alt="Worker App pending confirmation"><br><sub>Job offer: confirm / decline</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="screenshots/worker-app-job-timeline.png" width="240" alt="Worker App job timeline"><br><sub>My job: progress timeline</sub></td>
    <td align="center"><img src="screenshots/worker-app-readiness.png" width="240" alt="Worker App readiness"><br><sub>My readiness: medical &amp; training</sub></td>
    <td></td>
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

## Navigation

The sidebar follows the manpower workflow. Each menu item can have tabs,
shown at the top of the page.

| Section | Menu | Tabs (route) |
|---------|------|--------------|
| **Overview** | My Dashboard | `/` |
| | Compliance | Compliance Center `/compliance` |
| | Reports | Analytics & Reports `/reports` |
| **Operations** | Manpower Requirements | Requirements `/requirements` |
| | Assign Names | Assign Names `/allocation` · PE Approvals `/pe-approvals` |
| | Manpower Calendar | `/projects-overview` |
| | Training Bookings | Bookings `/requests-history` · Training Courses `/certifications` |
| | Medical Bookings | `/medical-bookings` |
| | Worker Schedule | Mobilization `/mobilization` · Post-Project Review `/review` |
| | Worker Pool | Workers `/workers` |
| **Settings** | Projects & Positions | Projects `/projects` · Positions `/positions` |
| | Training Matrix | Training Matrix `/training-matrix` · Matrix Editor `/positions/matrix` · Trainings `/trainings` |
| | Departments | `/divisions` |
| **Admin** | Users & Roles | Users `/users` · Bulk Set PIN `/workers/bulk-set-pin` |
| | Audit Log | `/audit-logs` |
| | Data Import | `/data-import` |

> The menu is defined in `frontend/src/components/layout/sidebarMenu.js`;
> route access is enforced in `AppRouter.jsx` (`ProtectedRoute allowRoles`).
> Keep both in sync when adding a page.

---

## Features

### Overview
- **My Dashboard:** total workers, ready for deployment, currently on-site
  (live from `Assignment` records), and certification alerts; a pending-work
  panel with direct links (unfilled positions, PE approvals, projects starting
  in 30 days, training/medical bookings awaiting HR, D-MOB in 7 days); worker
  status and certification compliance charts. Panels a role cannot access are
  hidden
- **Compliance Center:** worker-centric overview that keeps training alerts
  and medical status in separate columns, click-to-filter status counts, plus
  client requirement gap analysis (Mandatory / Assigned / Others) and PE
  Tracking export
- **Analytics & Reports:** workforce, compliance, and project reports

### Operations
- **Manpower Requirements:** all position requests across projects with
  filled / required progress, filters (project, status, location, date), and
  search by position, project, location, or assigned worker name (Thai /
  English); new requirements can be created from this page
- **Assign Names:** match workers against client requirements (% match),
  shortlist (Proposed → Approved), and export CV Summary / Roster
  (MOB–D-MOB) / Skill Matrix (print & Excel) for client submission
- **PE Approvals:** workers below 100% match can be submitted with a reason;
  the Project Engineer approves or rejects each worker, grouped by
  project and position
- **Manpower Calendar:** in-progress / upcoming / completed projects with
  staffing progress and the employee timeline, used to check availability
  before assigning names
- **Training Bookings / Medical Bookings:** training and medical check-up
  requests for workers with missing, expired, or expiring records, tracked
  as pending / completed; Training Courses shows one training across every
  worker, including bulk certificate entry
- **Worker Schedule:**
  - *Mobilization:* pre-mobilization checklist (PPE, alcohol test, blood
    pressure, baggage inspection, pre-field training, transport/hotel/vessel
    booking), then deploy to site with D-MOB calculated from the MOB date
  - *Post-Project Review:* per-worker rating and rehire recommendation, with
    review progress, reviewer name and date, row filter, and Save all
- **Worker Pool:** worker profiles (Employee ID / internal code, position,
  department, passport & work permit, photo, CV/resume details, offshore
  roster data), Add / Edit Worker with tabbed form, and Worker Detail with
  deployment history and document export
- **Project Discussion:** PE ↔ Manpower message thread with file attachments
  on each project

### Settings
- **Projects & Positions:** Master Project Register (ON Number), project
  activation per contract, and the position list
- **Training Matrix:** position-to-training requirements per contract
  (Mandatory / Assigned), Matrix Editor, and the central `GlobalTraining`
  catalog with per-client `TrainingStandard` and expiry buckets (Expired /
  Critical / Warning / Upcoming / Valid)
- **Departments:** department list used across worker records

### Worker App
- Login with Employee ID + PIN, with lockout after repeated failed attempts
- Forced PIN change on first login; self-service PIN change with rules
  (no repeated digits, sequences, Employee ID, or birth date)
- Readiness view, job confirmation, and leave requests

### Admin & System
- **Role-based access control (RBAC):** one primary role plus optional extra
  roles per user; access is the union of all roles
- **Users & Roles:** users, roles, extra roles, and links to worker records
- **Bulk Set PIN:** issue Worker App PINs to many workers at once (PINs are
  shown once and exported to Excel; handle the file as confidential)
- **Audit Log:** automatic record of who did what (create, update, delete,
  approve, upload, login/logout, failed login) across the MMS and the
  Worker App. Passwords, PINs, and tokens are redacted. The admin page has
  filters, a detail view with before/after changes, and CSV export
- **Data Import (admin):** upload HR Excel files from the browser, with a
  preview step before anything is saved
  - *Training Record* (sheet "Record"): trainings, medical check-ups, and
    passports; matches workers by Employee ID, then by name
  - *PE Tracking*: annual health-exam results and follow-up fields; matches
    workers by Thai name, then English name; rows before / after the
    "New SSE" marker set Permanent Worker / SSE Level
  - Columns are found by header text, unchanged dates are skipped, blank
    cells never erase existing data, and files are processed in memory only
- **Notifications:** in-app notification bell with links to related pages
- **Standard links:** navigation uses real links, so right-click
  "Open link in new tab" works throughout the app

---

## Roles

| Role | Description |
|------|-------------|
| `admin` | Full system access, Users & Roles, Audit Log, Data Import (primary role only) |
| `manpower_supply` | All operations and settings menus |
| `hr_supervisor` | All operations and settings menus |
| `personal_record_officer` | All operations and settings menus |
| `hr_officer` | All operations and settings menus |
| `training_officer` | All operations and settings menus |
| `project_engineer` | Projects, Assign Names, PE Approvals, Manpower Calendar, Mobilization, Post-Project Review |
| `safety_manager` | Dashboard, Compliance, Projects, Assign Names, Worker Pool, Mobilization, Training Courses |
| `safety_officer` | Dashboard, Mobilization safety checks |

> A user can hold extra roles (for example `manpower_supply` +
> `project_engineer`). Check roles with the helpers in `backend/utils/roles.js`,
> not `user.role.name`, which only returns the primary role.

---

## Manpower Workflow

```
Client requirement → Manpower Requirements (project + position + headcount)
↓
Assign Names: search & match workers (% match vs client requirements)
├─ check availability on the Manpower Calendar
├─ 100% match → Approve (Proposed → Approved)
└─ < 100% match → submit to PE Approvals → PE approves / rejects
↓
Generate CV Summary / Roster / Skill Matrix → send to client
↓
Missing / expiring items → Training Bookings / Medical Bookings
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
│   │   │   ├── layout/            # Layout, Navbar, Sidebar, MenuTabs, sidebarMenu.js
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
│   │   │   ├── projects/          # ManpowerRequirements, NewRequirementModal, Project,
│   │   │   │                      #   ProjectDetail, EditProject, Allocation, PEApprovals,
│   │   │   │                      #   ProjectsOverview, Mobilization, PostProjectReview,
│   │   │   │                      #   AnalyticsReports
│   │   │   ├── worker/            # Worker App pages (login, readiness, PIN change, ...)
│   │   │   └── admin/             # AdminUsers, AuditLogs, DataImport
│   │   ├── routes/                # AppRouter, WorkerAppRouter
│   │   └── App.jsx
│   └── vite.config.js
│
├── backend/
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   ├── middleware/                # userAuth, workerAuth, auditTrail
│   ├── utils/                     # roles, expiryStatus, auditLogger
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

### UI conventions

- Pages use divider lines (`border-y` / `border-b border-gray-200`) instead of
  cards; modals and drawers keep their own box
- Primary button and section accent: navy `#2B2F78` (hover `#22265f`)
- Section heading: left bar `border-l-[3px] border-[#2B2F78] pl-2.5`
- Filter labels: `text-xs font-semibold uppercase tracking-[0.4px] text-gray-500`
- When a menu has two or more tabs, the tab already names the page, so the
  page omits its own `h1`
- Use named Tailwind breakpoints (`sm` / `md` / `lg` / `xl` / `2xl`);
  arbitrary `min-[...]` breakpoints are ordered before them and get overridden

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

# Backend: apply pending migrations (only when schema.prisma changed)
cd backend
npx prisma migrate deploy
npx prisma generate
npm install                      # only when backend/package.json changed

# Restart: the PM2 process runs as root, so always use sudo
sudo pm2 restart mms-backend
sudo pm2 logs mms-backend --lines 30

# Frontend: rebuild static files
cd ../frontend
npm install                      # only when frontend/package.json changed
npm run build
```

- Skip `migrate deploy` / `generate` when `schema.prisma` has not changed.
- Run `npm install` / `npm run build` without `sudo`. Files created by root
  break the next `git pull`; if that happens, run
  `sudo chown -R <deploy-user>:<deploy-user> .` in the repo root.
- Without `sudo`, `pm2` reports "Process not found" for `mms-backend`.

> Data Import uploads Excel files up to 20 MB. If nginx sits in front of the
> backend, set `client_max_body_size 20M;` in the server block, otherwise
> uploads fail with HTTP 413.

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
