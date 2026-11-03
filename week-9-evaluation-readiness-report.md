# PlaceCampus Week 9 Evaluation Readiness Report

**Audit date:** 2026-11-01  
**Scope:** Source and document review, non-destructive Atlas inspection, API checks, automated tests/builds, and browser checks.  
**Status vocabulary:** IMPLEMENTED = code exists; TESTED = automated/API check passed; BROWSER-VERIFIED = executed in Chrome; SCAFFOLDED = partial path/UI; NOT WORKING = a demonstrated defect; BLOCKED BY ENVIRONMENT = required service/configuration unavailable.

## A. Executive summary

PlaceCampus is a substantial application with a working Nest API, a Next.js UI, MongoDB Atlas data, and six active demo accounts. The API health endpoint, Atlas connection, all six role logins/dashboard routes/session refreshes, student-to-analytics denial, placement-head analytics access, mobile landing-page width, and automated builds/tests were verified.

The project is **not yet ready to claim complete P06/Week 9 workflow compliance**. Redis refused connections, so background document verification and other queue-dependent flows were not exercised. No feature-workflow records were created or changed in Atlas; end-to-end record persistence therefore remains unverified. Browser authentication checks created refresh-session records and invoked logout to revoke those test sessions. Several implementation-plan/P06 gaps remain, including no dated preparation checkpoints, hard-coded readiness weighting, missing 5,000-student performance evidence, and incomplete recruiter audit/access-negative coverage.

During the audit I fixed the recruiter name-only field-release leak, made logout revoke the refresh session, associated login labels with their inputs, removed web lint errors, and upgraded Next.js from 16.4.0 to the patched 16.4.1. This continuation also removed student self-edit access to institution-controlled academic fields, routed AI verification recommendations through mandatory faculty review, and implemented recruiter candidate name/status search. Regression tests, API suite, typechecks, and production builds pass. Browser verification confirmed academic fields are no longer editable and an API attempt to patch CGPA is rejected with 400.

## B. Repository and architecture verification

Reviewed the official project statement PDF, the added Week 5/Week 9 rubric document, `docs/evaluation/PLACECAMPUS_MASTER_IMPLEMENTATION_PLAN.md`, `README.md`, `docs/architecture.md`, and root `implementation_plan.md`. The expected Steps 14–19 reports were **not found** in the workspace; their contents were not inferred.

The official P06 statement and rubric were treated as evaluation authority. The master implementation plan was treated as the technical roadmap. The root `implementation_plan.md` describes the older SkillBridge product and is inconsistent with PlaceCampus. `README.md` describes Next.js 15 while `apps/web/package.json` now pins Next.js 16.4.1. `docs/architecture.md` is a design description, not evidence that its planned services are running.

The workspace is a pnpm 9.1.0 monorepo with `apps/web`, `apps/api`, and `packages/shared-types`. Existing Git status before audit contained user-created untracked `.corepack-cache/` and `docs/evaluation/`; these were preserved. No database reset, destructive seed, or existing-record deletion was performed. `demo-accounts.seed.ts` updates an existing demo account’s password, role, and active state; it was not run.

Key implementation areas reviewed include `apps/api/src/app.module.ts`, `apps/api/src/main.ts`, feature controllers/services/schemas under `apps/api/src/`, role layouts under `apps/web/app/`, and API hooks under `apps/web/features/`.

## C. M1–M10 functionality matrix

| Module | Observed implementation/evidence | Readiness |
|---|---|---|
| M1 Skill Taxonomy | Skill, cluster, equivalence, and role-mapping collections exist in Atlas. Unique indexes exist for normalized skill names, cluster names, equivalence pairs, and role/skill mappings. `skills` and normalization services/controllers are present. No taxonomy CRUD/persistence workflow was written during this audit. | IMPLEMENTED; persistence flow unverified |
| M2 Evidence Ingestion | Evidence schema/controller/service and student evidence pages exist. Storage service is local filesystem-backed; configured S3-compatible credentials are placeholders. Upload size/type/ownership behavior was not exercised with a real upload. | IMPLEMENTED/SCAFFOLDED; upload flow unverified |
| M3 Evidence Verification | Verification records, extractor/provider services, queue wiring, and faculty review routes exist. AI VERIFIED/REJECTED outputs now become NEEDS_REVIEW recommendations, with regression tests confirming the faculty decision remains final. Redis is unavailable, so background processing was not demonstrated. | Human-only final decision implemented and unit-tested; queue BLOCKED BY ENVIRONMENT; live workflow unverified |
| M4 Student Skill Profile | Student skill profile collection has a unique student index; verified-evidence event aggregation exists. Evidence path is the demonstrated trigger in code. Aggregation from assessment/interview results and a full cross-source duplicate test were not established. | IMPLEMENTED/PARTIAL; aggregation unverified |
| M5 Assessment and Mock Interviews | Assessment, attempt, interview, rubric APIs and UI routes exist; backend unit suite passes. MCQ submission and faculty rubric were not executed end-to-end against Atlas. | IMPLEMENTED; browser/persistence flow unverified |
| M6 Readiness Engine | Snapshot schema, service, and dashboard routes exist. Current engine uses hard-coded factor weights and includes CGPA/academics, differing from the P06 four-dimension separation and stated plan. Calculation is synchronous in the current event path; no 5K async benchmark was found. | IMPLEMENTED/PARTIAL; requirement mismatch |
| M7 Placement Drives and Eligibility | Drive CRUD/publish routes, eligibility service, student drive view, and application creation/status routes exist. Application uniqueness index exists. Actual create/publish/eligible/apply/status-transition persistence was not exercised. | IMPLEMENTED; workflow unverified |
| M8 Skill Matching and Gap Analysis | Matching service, drive/student endpoints, snapshots, and recruiter/placement views exist. Matching relies on direct skill IDs; taxonomy equivalence expansion was not established. Cohort summary is incomplete/placeholder per code review. | IMPLEMENTED/PARTIAL |
| M9 Preparation Planning | Plan generation, item status, history/regeneration endpoints, and student pages exist. Plan tasks lack dated checkpoints/deadlines required by the roadmap; supported assessment checkpoints were not proven to be connected. | IMPLEMENTED/PARTIAL; P06 mismatch |
| M10 Recruiter Portal and Reporting | Drive grants, expiry/revocation, candidate listing/detail, released-field mapping, audit events, and analytics endpoints exist. Candidate search now filters by candidate name within the selected drive and optional application status; search is honored only when the recruiter grant releases student names. Readiness scores were removed from recruiter grant options, API payloads, and views per the roadmap's privacy rule. Unit tests cover query behavior, hidden-name grants, and readiness-score exclusion. Audit coverage is not comprehensive. | IMPLEMENTED/PARTIAL; search/privacy regressions fixed; live drive flow unverified |
| Notifications | Owner-scoped list/unread/read routes and notification service exist. A real event-to-unread-to-read workflow was not executed. | IMPLEMENTED; workflow unverified |

## D. Six-role authentication/RBAC matrix

All six existing accounts were found active in Atlas and their credentials (password read from `.env` without printing it) successfully authenticated. In Chrome, each role reached the configured dashboard and remained authenticated after a reload/refresh-cookie exchange.

| Role | Demo account email | Dashboard browser check | Refresh retention | Additional check |
|---|---|---|---|---|
| STUDENT | `student.demo@placecampus.local` | BROWSER-VERIFIED `/student/dashboard` | Passed | Student token received 403 on analytics; student logout/reload returned to login |
| FACULTY | `faculty.demo@placecampus.local` | BROWSER-VERIFIED `/faculty/dashboard` | Passed | Full faculty review authorization matrix unverified |
| PLACEMENT_OFFICER | `placement.demo@placecampus.local` | BROWSER-VERIFIED `/placement/dashboard` | Passed | Officer/head permission separation not fully tested |
| PLACEMENT_HEAD | `head.demo@placecampus.local` | BROWSER-VERIFIED `/placement-head/dashboard` | Passed | Analytics endpoint returned 200 |
| RECRUITER | `recruiter.demo@placecampus.local` | BROWSER-VERIFIED `/recruiter/dashboard` | Passed | Cross-drive/application and field-release negative cases not all run in browser |
| ADMIN | `admin.demo@placecampus.local` | BROWSER-VERIFIED `/admin/dashboard` | Passed | Admin-only API breadth not fully tested |

The dashboard layouts contain client-side role guards. A student browser session attempting `/admin/dashboard` redirected to `/`. Unauthenticated `/auth/me`, `/student/assessments`, and `/notifications/me` returned 401. The API returned 403 for a student token on `/analytics/overview` and 200 for a placement-head token.

The logout defect was fixed in `apps/web/features/auth/components/auth-provider.tsx`: local logout now calls `/auth/logout` and clears local auth even if the API request fails. Student logout was BROWSER-VERIFIED; the same provider is used across role layouts, but the click-and-reload logout flow was not completed separately for every role. The password source is `.env` key `DEMO_ACCOUNT_PASSWORD`; **the value is intentionally omitted**. Emails/roles are defined in `apps/api/src/database/seed/demo-accounts.seed.ts`.

## E. End-to-end workflow results

| Workflow | Result | Evidence/limitation |
|---|---|---|
| A Student evidence | BLOCKED BY ENVIRONMENT / not end-to-end tested | Redis unavailable; no document was uploaded or persisted. |
| B Faculty review | Not end-to-end tested | UI/API code exists; no verification record was created for review. |
| C Verified skills/readiness | Not end-to-end tested | Static event/service paths reviewed; no approval event and snapshot were created. |
| D Assessment | Not end-to-end tested | Unit tests pass; no attempt was started/submitted against Atlas. |
| E Placement | Not end-to-end tested | Core routes/services exist; no drive/application records were created. |
| F Preparation | Not end-to-end tested | Plan endpoints exist; no plan/task/checkpoint persistence was exercised. |
| G Recruiter security | Partially TESTED | No-grant denial is covered by a backend test; student/head role check and a recruiter API service test passed. Cross-drive, arbitrary-ID, expiry, revocation, and every released-field case were not all executed against live data. |
| H Analytics and notifications | Partially BROWSER/API-VERIFIED | Head analytics overview returned 200; student returned 403. Charts/filters and real event-generated notification/read cycle were not fully exercised. |

No Atlas feature-workflow writes were made. Browser authentication tests created refresh-session records and invoked logout to revoke the test sessions; no existing user/workflow records were modified or deleted. Automated service tests are not a substitute for a live persistence demonstration.

## F. MongoDB and Redis connectivity results

| Service/check | Result |
|---|---|
| MongoDB Atlas URI | Configured in `.env`; the live URI was not printed. |
| Atlas connectivity | Connected successfully to database `placecampus`; the Nest API also started with its configured Mongoose connection. |
| Atlas collections | 19 collections observed, including `users`, `student_profiles`, `skills`, `evidences`, `verification_records`, `studentskillprofiles`, `readinesssnapshots`, `assessments`, `assessmentattempts`, `placementdrives`, `placementapplications`, `recruiter_access_grants`, `audit_logs`, and `refresh_sessions`. |
| Indexes | Live indexes were enumerated read-only. Unique constraints exist for user email, student profile user, skill name/normalized name, skill cluster name, equivalence pair, role-skill mapping, per-student skill profile, and student-drive application. Relevant grant, audit, and snapshot indexes also exist. |
| Redis | BLOCKED BY ENVIRONMENT: `redis://localhost:6379` returned connection refused. Docker Desktop was launched, but the Docker Linux engine pipe remained unavailable. No Redis listener was present. |
| Queues/workers | API starts, but queue-dependent work cannot be called verified while Redis is down. The code uses `@nestjs/bull`/Bull v4, not BullMQ as described in comments/plans. |
| Storage | Current service uses local uploads; S3-compatible `.env` values remain placeholders. |
| AI/OCR/email/search/integrations | AI, OCR, email credentials, search API key, coding and certification keys are placeholders. Those integrations were not verified. |
| Environment validation | No comprehensive startup schema validating all required/placeholder values was found. |

Atlas was inspected without reading student documents or deleting/modifying existing records. The local Mongo service in `docker-compose.yml` was not started or substituted for Atlas.

## G. API/backend tests

- API test suite: **23 test files passed; 94 tests passed**, including recruiter privacy/search, readiness-score exclusion, and academic-field validation/human-review regression tests.
- API TypeScript: `pnpm typecheck` passed.
- API lint: `pnpm lint` exited successfully with existing unused-import/parameter warnings. Recruiter search no longer has an unused-query warning.
- API production build: `pnpm build` passed.
- Live API health: `GET /api/v1/health` returned 200.
- Live auth checks: all six role logins and `/auth/me` returned 200 in the browser test; unauthenticated protected calls returned 401; role-restricted analytics returned 403/200 for student/head as expected.
- Shared types: `tsc -p packages/shared-types/tsconfig.json --noEmit` passed.

The API test runner reported that `vite-tsconfig-paths` is redundant with Vite’s native TS path support; this is a warning, not a test failure.

## H. Frontend checks and browser results

- Web TypeScript: passed.
- Web lint: **0 errors, 52 warnings**. Warnings include unused imports/values, `<img>` optimization, and React Compiler skips around React Hook Form `watch()` usage.
- Web production build: passed on Next.js **16.4.1**; all 37 static pages generated and dashboard/feature routes compiled. The workspace dev server was restarted and reported Next.js 16.4.1 at `http://localhost:3001`.
- Browser: desktop Chrome verified all six UI logins, dashboard destinations, and session refresh retention. The API CORS origin was temporarily set in the API process to `http://localhost:3001` because the current workspace Next server was on port 3001 while port 3000 was already occupied. `.env` was not changed.
- Browser: student logout revoked the refresh session; reloading a protected student dashboard returned to `/login` and refresh returned 401.
- Browser: `/student/profile` displayed the institution-managed academic details notice and exposed only personal contact/social fields as inputs. A bearer-authenticated `PATCH /api/v1/students/me/profile` attempt containing `{ "cgpa": 10 }` returned 400; logout returned 200.
- Browser: mobile landing page at 390×844 had document width 390 (no horizontal overflow).
- Not fully browser-tested: every role’s sidebar links, all feature screens at desktop/mobile widths, forms/error/empty states, charts/filters, and each role’s own logout click.

Changes made to remove the initial frontend lint errors are in faculty interview pages, placement application pages, recruiter candidate/access pages, student assessment pages, and recruiter hooks. Login labels in `apps/web/features/auth/components/auth-input.tsx` now target their corresponding inputs.

## I. Security findings

**Fixed during this audit:**

- Recruiter payload returned `email` whenever `studentName` was released, although email was not a releasable field. Removed that field and added a regression test in `apps/api/src/recruiter/recruiter.service.spec.ts`.
- Logout only cleared client state; the refresh cookie/session remained usable after reload. Logout now calls the server endpoint and the student browser logout/reload test passed.
- Login labels now reference generated input IDs, improving accessible name/label behavior.
- Next.js 16.4.0 emitted a build-time security warning. The official Next.js advisory identifies critical App Router vulnerabilities and says 16.4.1 is patched; the dependency and lockfile were updated, and the local dev server was restarted and confirmed on 16.4.1. [Next.js security update, October 14, 2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026).
- Student profile update validation now rejects institution-controlled academic fields. The API DTO and shared update type expose only student-editable personal fields; the profile UI renders academic details read-only. Browser/API checks confirmed the notice and 400 rejection for a forged CGPA update.
- Verification engine AI outcomes are now recommendations only; even AI VERIFIED/REJECTED outcomes are returned as NEEDS_REVIEW pending faculty review. Unit tests cover both AI outcomes and insufficient extraction.
- Recruiter candidate search is implemented and scoped to applications in the selected drive. Search is only enabled when the grant permits student-name release; backend tests cover matching and hidden-name behavior.
- Recruiter readiness-score release has been removed from the API allow-list, field-release UI, candidate payload type, list and detail screens. Regression tests verify that readiness remains unavailable even if a legacy grant contains that field.

**Remaining security/policy risks:**

- Recruiter search, academic profile protection, and human-final verification have regression coverage; recruiter arbitrary-ID, cross-drive, expired/revoked grant, audit coverage, and a live candidate-drive workflow still need verification.
- Some audit logging paths are fail-open; they may not record every recruiter request/denial.
- No full cross-student record isolation suite was run against live HTTP endpoints.
- `.env` contains secrets and placeholders; it was not printed or committed by this audit. An Atlas credential was pasted in the conversation earlier; rotate that database credential and update `.env`. Its value is omitted from this report.

## J. Week 5 rubric readiness (25 marks)

| Criterion | Required functionality | Source / test evidence | Remaining issues | Readiness estimate |
|---|---|---|---|---|
| Architecture & Design (5) | Coherent app/service/database architecture and documented design. | `apps/api/src/app.module.ts`, `apps/web/app/`, `packages/shared-types/`, `docs/architecture.md`; API boot and live Atlas connection passed. | Root plan is SkillBridge; architecture is partly aspirational; Redis/storage topology differs. | Partial |
| React Routing & Implementation (5) | Working routes/layouts for the application and role areas. | `apps/web/app/`; build generated 37 static pages plus dynamic routes; six role dashboards loaded in Chrome. | Full navigation/mobile checks and wrong-role route checks across every role incomplete. | Partial to good |
| Rendering / Data Fetching (5) | Rendered pages fetch and show application data with usable states. | `apps/web/lib/api-client.ts`, `apps/web/features/*/hooks/`; real auth/analytics requests and dashboard pages loaded. | Full loading/error/empty/data-persistence UI checks absent; some preview values are hard-coded. | Partial |
| Initial Backend & Database (3) | API service and initial database integration. | `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/database/`; health 200, Atlas collections/indexes inspected, tests/build pass. | Redis down; no live feature persistence test or migrations. | Good foundation, partial proof |
| Product Workflow (3) | A demonstrable end-to-end placement/readiness workflow. | Feature routes in `apps/web/app/` and services in `apps/api/src/`; 94 unit tests passed. | No complete A–H data workflow run; major dependencies/config are missing. | Partial/low |
| Documentation (4) | Accurate project, architecture, roadmap, and evaluation documentation. | `README.md`, `docs/architecture.md`, `docs/evaluation/official project statement.pdf`, rubric and master plan reviewed. | Steps 14–19 missing; README/plan version and product inconsistencies. | Partial |

## K. Week 9 rubric readiness (30 marks)

| Criterion | Required functionality | Source / test evidence | Remaining issues | Readiness estimate |
|---|---|---|---|---|
| Backend/API & Database (6) | Correct APIs, persistence, model/index behavior, and reliable backend tests. | `apps/api/src/*/*.controller.ts`, `*.service.ts`, `*/schemas/`; 94 API tests, typecheck/build, Atlas connection/index inspection, live health 200. | No live CRUD persistence proof; Redis queues unavailable; no 5K benchmark. | Partial to good |
| Authentication & Authorization (7) | Six-role login/session lifecycle, route/API policy enforcement, and negative checks. | `apps/api/src/auth/`, `apps/web/features/auth/`, six role layouts; all six UI logins/dashboard/refresh checks; student logout; unauthenticated 401; student analytics 403/head 200. | Full permissions matrix and cross-student/recruiter-negative tests incomplete. | Good core proof, partial matrix |
| Server Actions & CRUD (5) | CRUD operations with validated requests and persisted results. | REST controllers/services in `apps/api/src/`, DTOs and schemas; API suite passed. | No evidence of Next Server Actions; actual feature CRUD persistence was not run. | Partial/low |
| Product Functionality (4) | Integrated evidence, assessment, readiness, placement, prep, recruiter, and reporting workflows. | `apps/web/app/`, `apps/api/src/`; all role dashboards load; feature routes compile. | Workflows A–H not end-to-end verified; some panels/features are placeholders. | Partial |
| Performance & Security (3) | Secure data access, stable services, and required performance under target load. | `apps/web/package.json` (Next.js 16.4.1); recruiter regression test; auth/logout checks. | Redis down, 5K target unmeasured, auth/data-security negative matrix incomplete. | Partial |
| Code Quality & Viva (5) | Maintainable implementation, build/lint/type safety, and explainable design decisions. | API/web TypeScript and builds pass; API tests pass; web lint has 0 errors. | 52 web warnings; API warnings; root plan and README drift; provider/queue terminology inconsistent. | Partial to good |

These are readiness estimates, not guaranteed marks or examiner approval.

## L. Remaining defects and blockers

1. Start Redis before demonstrating document verification or queue-backed work; currently localhost:6379 refuses connections.
2. Run controlled, uniquely tagged live CRUD/persistence workflows against Atlas and verify each read-after-write without resetting data.
3. Align automatic evidence verification with P06 human approval and add approval/rejection/resubmission history tests.
4. Extend academic-field protection checks to every institution-managed eligibility and verified-skill/readiness field, including live API role/path isolation.
5. Verify recruiter search and the remaining approved fields in a live authorized drive; test arbitrary/cross-drive/expired/revoked access and comprehensive audit events. Readiness scores are deliberately excluded from recruiter access.
6. Add dated preparation checkpoints and connect assessment checkpoints where supported.
7. Match by canonical skill/equivalency rules; test duplicate prevention and coverage/priorities.
8. Run performance benchmark against the P06 5,000-student/15-minute requirement and produce a supply-demand report.
9. Fill real S3/AI/OCR/email/search/integration credentials before demonstrating those integrations; no fallback behavior was proven for them.
10. Locate/restore the missing Steps 14–19 reports if they are required evidence for the evaluation.

## M. Exact local startup and verification commands

Use PowerShell from the repository root. Keep the two application commands in separate terminals.

```powershell
$env:COREPACK_HOME = 'C:\Users\Asus\Desktop\PlaceCampus 2\.corepack-cache'
corepack pnpm install --frozen-lockfile
docker compose up -d redis
```

Terminal 1 (API):

```powershell
$env:COREPACK_HOME = 'C:\Users\Asus\Desktop\PlaceCampus 2\.corepack-cache'
corepack pnpm --filter @placecampus/api start:dev
```

Terminal 2 (web; use 3000 when free):

```powershell
$env:COREPACK_HOME = 'C:\Users\Asus\Desktop\PlaceCampus 2\.corepack-cache'
corepack pnpm --filter @placecampus/web dev -- --port 3000
```

Check API health and Swagger at `http://localhost:4000/api/v1/health` and `http://localhost:4000/api/docs`. The configured database remains Atlas from `.env`; do not start the compose MongoDB service as a silent replacement. The root demo seed command was not run because it overwrites existing demo account password/role fields.

## N. Recommended live demonstration sequence

**Demo accounts:** use the six emails in section D. Password source: `.env` → `DEMO_ACCOUNT_PASSWORD` (value intentionally omitted). Do not rerun the seed unless you intentionally want its password/role updates.

1. Start Redis, API, and web using section M. Show `/api/v1/health` and the Swagger page.
2. Sign in as the demo student at `http://localhost:3000/login`; show the student dashboard and logout/reload behavior.
3. Show a negative permission check through DevTools: student token requesting `GET /api/v1/analytics/overview` returns 403; `GET /api/v1/notifications/me` without auth returns 401.
4. Sign in as placement head and show `GET /api/v1/analytics/overview` returns 200. Label aggregate/chart/filter data as live only after confirming its source in the response.
5. Demonstrate evidence → faculty review → skill/readiness, assessment, drive/application, preparation, recruiter grant, and notification flows only after running the corresponding live persistence checks and confirming Redis is healthy.
6. For recruiter, show only an authorised drive and an applicant, then demonstrate revoked/expired grant denial and released fields. Do not claim these checks passed based on this audit alone.

Useful endpoints include `/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/health`, `/api/v1/student/evidence`, `/api/v1/faculty/reviews`, `/api/v1/student/assessments`, `/api/v1/student/drives`, `/api/v1/applications/me`, `/api/v1/preparation/plans/me`, `/api/v1/recruiter/drives`, `/api/v1/analytics/overview`, and `/api/v1/notifications/me` (exact permissions/payloads are in Swagger).

**External-service fallback:** Redis-down document verification has no verified inline fallback; do not present queued verification as working while Redis is unavailable. S3/AI/OCR/email/search credentials are placeholders, so do not claim those integrations work. If Atlas is unavailable, report the outage and stop the persistence demo; do not switch to a fresh local Mongo database.

## O. Features that remain unverified

- Live Atlas create/read/update persistence for evidence, skill claims, faculty decisions, assessment attempts, readiness snapshots, drives/applications, prep tasks, recruiter grants, and notifications.
- Redis connectivity, Bull workers, queue retry/failure handling, and PDF/image extraction.
- Real AI/OCR, object storage, SMTP/email delivery, search, coding-platform, and certification integrations.
- P06 5,000-student scale target, async readiness recalculation, complete factor contribution math, and supply-demand output.
- Full field-level recruiter tests, arbitrary student/application IDs, cross-drive denial, grant expiry/revocation, and audit completeness against live API requests.
- Complete faculty/placement-officer/admin permission matrix; sidebar navigation and every feature route at desktop and mobile sizes.
- Assessment scoring/readiness updates, evidence approval/readiness refresh, application state transition persistence, preparation regeneration/history, and event-generated notification read flow.
- Steps 14–19 reports, which were missing from the repository at audit time.
