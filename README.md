# PlaceCampus

**Unified Placement & Student Readiness Platform**

PlaceCampus connects students, faculty, placement teams and recruiters in one system. Students build a *verified* skill profile from evidence, assessments and mock interviews. The platform turns that into a placement-readiness score, matches students against drive requirements, and gives each student a personalised preparation plan. Placement teams run drives end to end, and recruiters see only the candidates and fields they have been granted.

---

## Contents

- [Features by role](#features-by-role)
- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Demo accounts](#demo-accounts)
- [Environment variables](#environment-variables)
- [Authentication and roles](#authentication-and-roles)
- [Web routes](#web-routes)
- [API overview](#api-overview)
- [Testing and quality checks](#testing-and-quality-checks)
- [Git workflow](#git-workflow)
- [Project documents](#project-documents)
- [Known limitations and roadmap](#known-limitations-and-roadmap)

---

## Features by role

### Student
- **Dashboard:** readiness, skills, applications and upcoming activity at a glance.
- **Profile:** academic details, resume and profile completion.
- **Evidence:** upload certificates, projects and internships through a multi-step wizard. Each item is checked automatically (OCR, rules and AI-assisted analysis) and sent to faculty when a human needs to look.
- **Skills:** a verified skill profile built from approved evidence, with technology logos and four categories.
- **Assessments:** take skill assessments and review results.
- **Mock interviews:** book live interview slots published by faculty, join, cancel, and receive feedback that feeds into readiness.
- **Readiness:** an overall placement-readiness score with a breakdown and suggestions.
- **Placement drives:** browse drives, check eligibility in a modal, see the skill match, and apply within the application window.
- **Applications:** track the status of every application.
- **Preparation plans:** a personalised plan per drive, built from skill gaps, with tasks to complete and progress tracking.
- **Notifications:** a header bell with an unread badge leads to the full notifications page, with tabs, search, category filter and mark-as-read.

### Faculty
- **Review queue:** approve, reject or request resubmission of student evidence, and set verified skill levels.
- **Mock interviews:** publish availability slots, start interviews, mark no-shows and submit evaluations.

### Placement Officer
- **Drives:** create, edit, publish and close placement drives, with eligibility rules and skill requirements.
- **Applications:** review each drive's applications and move them through the stages.
- **Recruiter access:** request access for a recruiter to a drive's candidates.

### Placement Head
- Placement analytics, approvals, and decisions on recruiter access grants.

### Recruiter
- Separate login. Sees only drives with an approved, unexpired grant, and only the candidate fields released for that drive.

### Administrator
- Admin console with platform analytics and notifications.

---

## Tech stack

| Layer | Technology |
|---|---|
| Web | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI, TanStack Query, react-hook-form and zod, sonner (toasts), lucide-react and simple-icons, GSAP |
| API | NestJS, Mongoose (MongoDB), Bull queues (Redis), Passport JWT, class-validator, Swagger/OpenAPI, event emitter |
| Document processing | pdf-parse, tesseract.js (OCR), an optional AI provider for evidence analysis |
| Shared | `@placecampus/shared-types`: TypeScript types and enums used by both web and API |
| Infrastructure | MongoDB 7 and Redis 7 through Docker Compose |
| Tooling | pnpm workspaces, Vitest, ESLint (web), oxlint (API), Prettier, Husky and lint-staged, commitlint, GitHub Actions CI |

---

## Repository structure

```
PlaceCampus/
├── apps/
│   ├── web/                     # Next.js frontend (port 3000)
│   │   ├── app/                 # Routes: (auth), student, faculty, placement, placement-head, recruiter, admin
│   │   ├── features/            # Feature modules: components, hooks and helpers per domain
│   │   ├── components/          # Shared UI and layout (navbar, user menu, brand)
│   │   ├── lib/                 # API client, route helpers, utilities
│   │   └── public/images/       # Logos and the login illustration
│   └── api/                     # NestJS backend (port 4000)
│       └── src/
│           ├── auth/            # Campus and recruiter login, sessions, active-role switching
│           ├── users/ students/ faculty/
│           ├── evidence/ verification/ storage/
│           ├── skills/ assessments/ interviews/ readiness/
│           ├── drives/ eligibility/ matching/ applications/ preparation/
│           ├── recruiter/ recruiter-access/
│           ├── notifications/ analytics/ audit/
│           ├── common/          # Health check, pipes, shared utilities
│           ├── config/          # App, database, Redis, JWT and DNS configuration
│           └── database/seed/   # Demo accounts and skill taxonomy seeds
├── packages/
│   └── shared-types/            # Types and enums shared by web and API
├── docs/
│   ├── architecture.md
│   ├── git-workflow.md
│   ├── atlas-search-index.json
│   └── evaluation/              # Master implementation plan, rubric, project statement
├── docker-compose.yml           # MongoDB and Redis
├── .env.example                 # Environment template
└── .github/workflows/ci.yml     # Lint, typecheck and build on every push and pull request
```

---

## Getting started

### Prerequisites

- **Node.js 20 LTS or newer.** Next.js 16 needs Node 20.9+.
- **pnpm 9.** Run `corepack enable` to use the version pinned in `package.json`, or install it with `npm i -g pnpm`.
- **Docker** for local MongoDB and Redis. Alternatively, use your own MongoDB (Atlas works) and Redis.

### 1. Clone and install

```bash
git clone https://github.com/PANJA-ABHISHEK/PlaceCampus.git
cd PlaceCampus
pnpm install
```

### 2. Configure the environment

```bash
cp .env.example .env
```

Then edit `.env`. At minimum, set `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET` and `JWT_REFRESH_SECRET`. See [Environment variables](#environment-variables).

### 3. Start MongoDB and Redis

```bash
pnpm run docker:up      # stop them with: pnpm run docker:down
```

### 4. Seed the data

```bash
# Demo accounts, one per role
pnpm --filter @placecampus/api run seed:demo

# Skill taxonomy (run after the API has been built by the command above)
pnpm --filter @placecampus/api exec node dist/database/seed/skills.seed.js
```

The demo seed refuses to run in production unless `ENABLE_DEMO_SEED=true` is set.

### 5. Run the app

```bash
pnpm run dev            # web and API together
# or separately:
pnpm run dev:web
pnpm run dev:api
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| API (base path) | http://localhost:4000/api/v1 |
| Health check | http://localhost:4000/api/v1/health |
| Swagger API docs | http://localhost:4000/api/docs |

The web app calls the API at `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:4000/api/v1`.

---

## Demo accounts

All demo accounts share one password: the value of `DEMO_ACCOUNT_PASSWORD` when you ran the seed, or the seed script's development default, `PlaceCampus@Demo123`. **Change it in any shared or deployed environment.**

| Role | Email | Sign in at |
|---|---|---|
| Student | `student.demo@placecampus.local` | `/login` |
| Faculty | `faculty.demo@placecampus.local` | `/login` |
| Placement Officer | `placement.demo@placecampus.local` | `/login` |
| Placement Head | `head.demo@placecampus.local` | `/login` |
| Administrator | `admin.demo@placecampus.local` | `/login` |
| Recruiter | `recruiter.demo@placecampus.local` | `/recruiter/login` |

---

## Environment variables

These are the variables the API reads. Everything else in `.env.example` is reserved for planned integrations.

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | | `development` or `production` |
| `PORT` | | API port (default `4000`) |
| `FRONTEND_URL` | | Allowed CORS origin for the web app (default `http://localhost:3000`) |
| `BACKEND_URL` | | The API's public URL |
| `MONGODB_URI` | ✓ | MongoDB connection string |
| `MONGODB_DNS_SERVERS` | | Comma-separated DNS servers to use when resolving `mongodb+srv` (useful on networks that block SRV lookups) |
| `REDIS_URL` | ✓ | Redis for background queues, such as evidence verification |
| `JWT_SECRET` | ✓ | Signing secret for access tokens |
| `JWT_REFRESH_SECRET` | ✓ | Secret for refresh tokens |
| `JWT_EXPIRES_IN` | | Access-token lifetime (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | | Refresh-session lifetime (default `7d`) |
| `AI_API_KEY` | | Key for AI-assisted evidence analysis. **If unset, a built-in mock analysis is used.** |
| `AI_PROVIDER`, `AI_MODEL` | | AI provider and model (defaults `openai` and `gpt-4o-mini`) |
| `DEMO_ACCOUNT_PASSWORD` | | Password given to seeded demo accounts |
| `ENABLE_DEMO_SEED` | | Must be `true` to allow seeding when `NODE_ENV=production` |
| `NEXT_PUBLIC_API_URL` | | (web) API base URL (default `http://localhost:4000/api/v1`) |

Never commit `.env`; it is already listed in `.gitignore`.

---

## Authentication and roles

**Login.** The login form asks only for email and password. The role always comes from the account on the server, never from anything the user selects or from the URL.

**Two separate logins.**

| Login | Page | Endpoint | Who can use it |
|---|---|---|---|
| Campus | `/login` | `POST /auth/login` | Student, Faculty, Placement Officer, Placement Head, Administrator |
| Recruiter | `/recruiter/login` | `POST /recruiter/auth/login` | Recruiters only |

A recruiter who tries the campus login, or a campus user who tries the recruiter login, is told which page to use and is not signed in.

**Redirect after login** is based on the role the API returns:

| Role | Dashboard |
|---|---|
| `student` | `/student/dashboard` |
| `faculty` | `/faculty/dashboard` |
| `placement_officer` | `/placement/dashboard` |
| `placement_head` | `/placement-head/dashboard` |
| `recruiter` | `/recruiter/dashboard` |
| `admin` | `/admin/dashboard` |

**Multiple roles.** A person can hold more than one campus role, for example Faculty and Placement Officer: the primary role is stored in `role` on the user and any extra ones in `roles`. For such users the login response has `requiresRoleSelection: true`. The session has no permissions until they choose a role on `/select-role`, which calls `POST /auth/active-role`. Switching roles replaces the session and writes an audit entry. A "Switch role" link appears in the portal for these users. Recruiters can never hold campus roles.

**Sessions.** A short-lived JWT access token is sent as a Bearer header. The refresh token lives in an httpOnly cookie and is rotated on every refresh. Role-based access control is enforced on the API with a roles guard on each endpoint.

---

## Web routes

| Area | Routes |
|---|---|
| Public | `/` (landing page), `/login`, `/recruiter/login`, `/forgot-password`, `/select-role` |
| Student | `/student/dashboard`, `/student/profile`, `/student/evidence` (and `/new`, `/[id]`), `/student/skills`, `/student/assessments` (and `/[id]/attempt`), `/student/interviews`, `/student/readiness`, `/student/drives` (and `/[id]`), `/student/applications` (and `/[id]`), `/student/preparation` (and `/[id]`), `/student/notifications` |
| Faculty | `/faculty/dashboard`, `/faculty/reviews` (and `/[id]`), `/faculty/interviews` (and `/[id]`), `/faculty/notifications` |
| Placement Officer | `/placement/dashboard`, `/placement/drives` (and `/new`, `/[id]`), `/placement/applications` (and `/[id]`), `/placement/notifications` |
| Placement Head | `/placement-head/dashboard`, `/placement-head/analytics`, `/placement-head/notifications` |
| Recruiter | `/recruiter/dashboard`, `/recruiter/drives`, `/recruiter/drives/[id]/candidates` (and `/[applicationId]`), `/recruiter/notifications` |
| Admin | `/admin/dashboard`, `/admin/analytics`, `/admin/notifications` |

The auth pages are full-screen: an animated illustration on the left, the form on the right, and no site header or footer. `/faculty-login` redirects to `/login`.

---

## API overview

All routes are under `/api/v1`. Full request and response schemas are in **Swagger** at `/api/docs`.

| Group | Main endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /recruiter/auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/active-role`, `POST /auth/forgot-password` |
| Students | `GET/PATCH /students/me/profile` |
| Evidence | `POST /evidence`, `GET /evidence/me`, `GET/PATCH/DELETE /evidence/:id`, `POST /evidence/:id/document`, `GET /evidence/:id/document/download`, `/evidence/:evidenceId/verification` |
| Faculty reviews | `GET /faculty/reviews`, `GET /faculty/reviews/:id`, `PATCH /faculty/reviews/:id/approve` / `reject` / `request-resubmission` |
| Skills | `GET /skills/taxonomy`, `GET /skills/clusters`, `GET /student/skills` |
| Assessments | `GET /assessments`, `POST /assessments/:id/start`, `POST /student/assessments/:attemptId/submit`, `GET /student/assessments` |
| Interviews | Student: `GET /student/interview-slots`, `POST /student/interview-slots/:id/book`, `GET /student/interviews`, `POST /student/interviews/:id/cancel`. Faculty: `GET/POST /faculty/interview-slots`, `GET /faculty/interviews`, `POST /faculty/interviews/:id/start` / `no-show` / `evaluate` |
| Readiness | `GET /student/readiness`, `GET /student/readiness/history` |
| Drives | `/placement/drives` (create, update, publish, close), `GET /student/drives`, `GET /student/drives/:id` |
| Eligibility and matching | `GET /student/drives/:id/eligibility`, `GET /student/drives/:id/match`, `GET /placement/drives/:id/matching-summary` |
| Applications | `POST /drives/:driveId/applications`, `GET /applications/me`, `PATCH /applications/:id/withdraw`, `GET /placement/drives/:driveId/applications`, `PATCH /placement/applications/:id/review` |
| Preparation | `POST /preparation/plans/drive/:driveId`, `GET /preparation/plans/me`, `GET /preparation/plans/:id`, `PATCH /preparation/plans/:id/items/:itemId/status`, `POST /preparation/plans/:id/regenerate` |
| Recruiter | `GET /recruiter/drives`, `GET /recruiter/drives/:driveId/candidates`, `GET /recruiter/drives/:driveId/candidates/:applicationId` (grant-scoped) |
| Recruiter access | `/placement/drives/:driveId/recruiter-access`, `/placement/recruiter-access` |
| Notifications | `GET /notifications/me`, `GET /notifications/me/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/me/read-all` |
| Analytics | `GET /analytics/overview`, `/readiness`, `/skills`, `/placements`, `/evidence`, `/preparation` |
| Health | `GET /health` |

Domain events, such as an application being submitted, an interview being booked or evaluated, or evidence being verified, trigger notifications and readiness recalculation through the event emitter. Evidence verification runs on a Bull queue backed by Redis.

---

## Testing and quality checks

```bash
pnpm --filter @placecampus/api test        # API unit tests (Vitest)
pnpm --filter @placecampus/api test:e2e    # API end-to-end tests
pnpm typecheck                             # all packages
pnpm lint                                  # ESLint (web) and oxlint (API)
pnpm build                                 # production build of every package
pnpm format                                # Prettier
```

**CI:** GitHub Actions (`.github/workflows/ci.yml`) installs dependencies with the frozen lockfile, then runs lint, typecheck and build on Node 18 and 20 for pushes and pull requests.

**Commits** follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:` and so on), enforced by commitlint with Husky hooks.

---

## Git workflow

```
main          ← production-ready; updated from development
development   ← integration branch
feature/* | fix/* | chore/*   ← branch from development and open a PR back into it
```

See [docs/git-workflow.md](docs/git-workflow.md) for branch naming, pull-request rules and team branches.

---

## Project documents

| Document | Description |
|---|---|
| [docs/evaluation/PLACECAMPUS_MASTER_IMPLEMENTATION_PLAN.md](docs/evaluation/PLACECAMPUS_MASTER_IMPLEMENTATION_PLAN.md) | The full product and technical specification: roles, data model, verification, readiness, drives, recruiter access and APIs. **The source of truth.** |
| [docs/architecture.md](docs/architecture.md) | System architecture overview |
| [docs/git-workflow.md](docs/git-workflow.md) | Branching and contribution workflow |
| `docs/evaluation/` | Evaluation rubric and the official project statement |
| `apps/api/README.md`, `apps/web/README.md` | Notes specific to each app |

---

## Known limitations and roadmap

These are known gaps between the current code and the master implementation plan:

- **Faculty–student assignment is not implemented yet.** Every faculty member sees one shared evidence-review queue, and any student can book any faculty interview slot. Planned: assignment records (mentor, evidence reviewer, interviewer, project guide), spreadsheet import, department-based routing with load balancing, a personal queue per reviewer, a 30-minute review lock, and deadlines with escalation to a Review Coordinator.
- **Account provisioning.** The plan calls for Administrator-created accounts with email invitations and no public sign-up. A legacy `/register` page and `POST /auth/register` still exist, and invitation emails are not implemented.
- **Email delivery.** Forgot-password returns a generic confirmation, but no email is sent yet.
- **"Remember me"** on the login form is not wired up yet.
- **File storage** writes uploads to a local `uploads/` folder in development (git-ignored). S3-compatible storage is planned.
- **AI analysis** falls back to a mock response when `AI_API_KEY` is not set.
- **Recruiter cookies.** Recruiter sessions use the same refresh cookie as campus sessions (tagged by audience). The plan calls for separate recruiter cookies.

---

*PlaceCampus is a private academic project. All rights reserved.*
