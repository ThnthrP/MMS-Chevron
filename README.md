# Manpower Management System (MMS)

A web-based workforce management platform for multi-company offshore operations, supporting manpower workflows, training compliance, medical records, and workforce deployment.

---

## Overview

MMS is a multi-company workforce management system designed for offshore and industrial operations under **EXPERTEAM** and **CES**.

**Supported offshore clients:**

| Client | Description |
|--------|-------------|
| Chevron | Offshore platform operations |
| Erawan (PTTEP) | Erawan offshore campaign |
| PTT | PTT onshore/offshore |
| Valeura | Valeura offshore |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite), React Router v6, Tailwind CSS, Axios |
| Backend | Node.js, Express.js, Prisma ORM, PostgreSQL |
| Auth | JWT (HTTP-only cookie), OTP email reset |

---

## Features

- **Multi-company isolation** — users can only access their own company data
- **Role-based access control (RBAC)** — middleware-enforced per resource and action
- **Dynamic sidebar & dashboard** — rendered by company + role combination
- **Training compliance** — global training normalization, client-specific matrix, expiry tracking
- **Medical records** — hospital, expiry, offshore medical requirements
- **Workforce import pipeline** — Excel import for employees, trainings, and training matrix per client
- **Manpower workflow** — request → candidate proposal → approval → deployment → assignment

---

## Roles

| Role | Full Name | Description |
|------|-----------|-------------|
| `admin` | Administrator | Full system access |
| `pe` | Project Engineer | Creates manpower requests |
| `pe_head` | Project Engineer Head | PE approval override |
| `manpower` | Manpower Coordinator | Candidate and manpower management |
| `hr` | Human Resources | Employee management |
| `safety` | Safety Officer | Safety compliance and certification review |
| `nurse` | Occupational Health Nurse | Medical records and fitness checks |
| `ta` | Technical Authority | Release and technical approval |
| `expert` | Subject Matter Expert | Training and qualification review |
| `bd` | Business Development | Customer and business relationship management |

---

## Manpower Workflow

```
PE creates request
    ↓
Manpower proposes candidates
    ↓
PE approves / rejects candidates
    ↓
Safety + Medical checks
    ↓
Deployment
    ↓
Assignment created
    ↓
WorkflowLog records actions
```

---

## Project Structure

```
mms/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/       # Layout, Navbar, Sidebar, sidebarMenu
│   │   │   ├── guards/       # ProtectedRoute, AdminRoute, RoleRoute
│   │   │   └── ui/
│   │   ├── context/          # AppContext, AuthContext, CompanyContext
│   │   ├── pages/
│   │   │   ├── shared/
│   │   │   ├── expert/
│   │   │   ├── ces/
│   │   │   └── system/
│   │   ├── routes/
│   │   └── services/         # api, auth, employee, training, medical
│   └── .env
│
└── backend/
    ├── controllers/
    ├── middleware/
    ├── routes/
    ├── services/
    ├── utils/
    ├── prisma/
    │   ├── schema.prisma
    │   ├── seed.js
    │   └── seeds/
    │       ├── common/        # seedClients, seedContracts, seedGlobalTrainings, seedTrainingStandards, seedPositions
    │       ├── erawan/        # seedClientTrainings
    │       ├── chevron/
    │       ├── ptt/
    │       └── valeura/
    ├── scripts/
    │   ├── common/            # debugExcel
    │   ├── erawan/            # importEmployees, importMatrix
    │   ├── chevron/
    │   ├── ptt/
    │   └── valeura/
    └── .env
```

---

## Getting Started

### 1. Clone repository

```bash
git clone https://github.com/your-username/mms.git
cd mms
```

### 2. Backend setup

```bash
cd backend
npm install
npx prisma migrate dev
node prisma/seed.js
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

**`backend/.env`**

```env
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/manpower_db
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
SENDER_EMAIL=your_email@gmail.com
SENDER_PASSWORD=your_app_password
```

**`frontend/.env`**

```env
VITE_BACKEND_URL=http://localhost:4000
```

---

## Seed Order

```bash
node prisma/seeds/common/seedClients.js
node prisma/seeds/common/seedContracts.js
node prisma/seeds/common/seedGlobalTrainings.js
node prisma/seeds/common/seedTrainingStandards.js
node prisma/seeds/common/seedPositions.js
node prisma/seeds/erawan/seedClientTrainings.js   # repeat per client
```

---

## Import Scripts

```bash
# Employees
node scripts/erawan/importEmployees.js

# Employee trainings
node scripts/erawan/importEmployeeTrainings.js

# Training matrix (PositionRequirement)
node scripts/erawan/importMatrix.js
```

---

## Development Status

| Module | Status |
|--------|--------|
| Authentication (JWT) | ✅ Done |
| RBAC | ✅ Done |
| Multi-company isolation | ✅ Done |
| Workforce import pipeline | ✅ Done |
| Training system | ✅ Done |
| Medical system | ✅ Done |
| Dynamic sidebar | 🔄 In progress |
| Dashboard system | 🔄 In progress |
| Deployment workflow | 🔄 In progress |
| Notification system | ⏳ Planned |

---

## Planned Features

- Email reminders for training expiry
- Offshore deployment planner
- Workforce analytics dashboard
- Docker + cloud deployment
- Mobile responsive optimization
