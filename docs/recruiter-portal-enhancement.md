# Recruiter portal: features and demo data

## What the recruiter portal shows

Every recruiter screen reads real database records, scoped to the drives the signed-in recruiter holds an active access grant for. A grant's `releasedFields` decide which student details appear. No screen uses hardcoded or front-end placeholder data.

| Page | What it shows |
| --- | --- |
| Dashboard | Eight KPIs: active drives, total applications (with unique students), pending reviews (applied + under review), shortlisted, interviews scheduled, offers released, selected, and expiring access. Also the application pipeline with per-stage counts, conversion rates, total applications, overall selection rate and rejections shown separately. Recent drives, drive overview, an activity feed built from application and interview records, and upcoming interviews. |
| Assigned drives | One card per drive: logo, company, role, CTC, location, eligible branches, minimum CGPA, applicants, shortlisted (including later stages), interviews and deadline. Lifecycle is Active, Upcoming, Completed or Expired. Search, status filter, sorting and pagination. **View details** opens the drive's header and its registered applicants. |
| Candidates | All applications across assigned drives. Search by name, registration number or email. Filter by drive, company, status, branch, CGPA range, graduation year and skill. Compare up to three candidates. Each row has a preview panel and a full profile showing projects, internships, resume, skill match, and placement application and interview history. |
| Shortlists | Shortlisted applications across drives, with the same search and filters. Supports comparison, recruiter notes, and moving a candidate to the next stage or rejecting them. Each change is saved to the database and audited. |
| Interviews | Recruiter interviews with round, time, interviewer, meeting link, status and structured feedback. |
| Analytics & reports | Application trends, hiring trends (shortlists, offers, selections), drive-wise applicants, branch distribution, the recruitment funnel, selection analytics and interview analytics. Filters cover date range, company, drive, branch and status. A drive report table can be downloaded as CSV. |

Stage changes and notes are limited to grants with `canManageApplications`, on demo records, when `DEMO_MODE=true`. Real placement workflows still own status transitions for live data. Allowed moves are Applied → Under review → Shortlisted → Interview scheduled → Offer released → Selected. Rejection is allowed from any open stage.

### Funnel definitions

- **Count**: applications currently at a stage.
- **Reached**: active applications at that stage or a later one. Rejected and withdrawn applications are excluded.
- **Conversion**: reached(stage) ÷ reached(previous stage). It never exceeds 100%.
- **Selection rate**: selected ÷ all applications.
- **Rejection rate**: rejected ÷ all applications.
- **Interview conversion**: applications with an offer or selection ÷ applications that reached the interview stage.
- **Interview success rate**: completed rounds with an *Advance* recommendation ÷ completed rounds that have a recommendation.

Applications and unique students are reported separately, because one student can apply to several drives.

## API

All routes are under `/api/v1`. Each one requires a recruiter JWT and active grants, and returns only data from assigned drives. Requesting a drive the recruiter has no access to returns 403 and is audit-logged.

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/recruiter/dashboard/stats` | KPI values. Status-based KPIs are `null` when no drive releases `applicationStatus`. |
| GET | `/recruiter/dashboard/pipeline` | Funnel; see the definitions above. |
| GET | `/recruiter/dashboard/activities?limit=` | Recent applications, status decisions and interview events. |
| GET | `/recruiter/dashboard/summary` | Per-drive applicant, status and interview counts, plus `lifecycle`. |
| GET | `/recruiter/drives` | Assigned drives with grant fields and `lifecycle`. |
| GET | `/recruiter/drives/:driveId` | One drive with its counts. |
| GET | `/recruiter/drives/:driveId/applicants` | Same filters as `/recruiter/candidates`, fixed to one drive. |
| GET | `/recruiter/drives/:driveId/candidates[/export]` | Existing per-drive listing and CSV export. |
| GET/PATCH | `/recruiter/drives/:driveId/candidates/:applicationId` | Candidate detail; PATCH changes the demo stage and saves recruiter notes. |
| GET | `/recruiter/candidates` | Cross-drive list. Query parameters: `page`, `limit` (≤100), `q`, `driveId`, `company`, `status`, `department`, `minCgpa`, `maxCgpa`, `graduationYear`, `skill`. |
| GET | `/recruiter/candidates/:applicationId` | Profile plus application and interview history on accessible drives. |
| GET | `/recruiter/shortlists` | Same as `/recruiter/candidates` with `status=SHORTLISTED`. |
| GET | `/recruiter/interviews` (+ POST/PATCH) | Existing interview scheduling and feedback routes. |
| GET | `/recruiter/analytics` | All analytics sections in one response. |
| GET | `/recruiter/analytics/overview` \| `/applications` \| `/drives` \| `/branches` | Individual sections. Query parameters: `from`, `to` (YYYY-MM-DD), `driveId`, `company`, `department`, `status`. |

A filter on a released field applies only to drives that release that field. For example, a branch filter excludes drives that do not share `department`. Hidden data therefore cannot be inferred from filter results.

## Demo dataset

`apps/api/src/database/seed/recruiter-demo.seed.ts` creates a fictional, connected dataset. Every record is tagged `isDemoData: true` and `demoDatasetId: "recruiter-portal-demo-v1"`.

| Records | Contents |
| --- | --- |
| Accounts | **Demo Recruiter** (Demo Technologies, active) and a demo placement officer, who is the grantor. |
| Students | 200 synthetic students. Each has a name, a `DEMO-<year>-<branch>-<nnn>` registration number, an `@example.com` email, a synthetic phone number, a fictional institute, a branch (CSE, IT, ECE, EE, ME or Civil), CGPA, graduation year, skills, projects, internships for some students, a placeholder resume URL and a registration date. |
| Companies and drives | 8 fictional employers and drives: 3 Active, 2 Upcoming, 2 Completed and 1 Expired. Each drive has a logo placeholder, industry, description, CTC, employment type, location, eligible branches, minimum CGPA, an optional batch year, required skills, and opening and deadline dates. All drives are assigned to Demo Recruiter. |
| Applications | About 284 applications from about 147 distinct students. Each is unique per student and drive and meets the drive's eligibility rules. Statuses follow each drive's lifecycle; stronger profiles progress further. Each has an applied date, a decision date (`reviewedAt`), screening notes and a skill-match snapshot. |
| Interviews | About 294 interview rounds (Technical 1, Technical 2, Managerial, HR) on applications at the interview stage or later. Completed rounds carry scores and a recommendation; about 30 are upcoming with meeting-link placeholders. |
| Notifications | 18 notifications built from seeded events: new application, shortlisted, interview scheduled or rescheduled, offer released, selected, drive closing soon and access expiring. |

All dates are relative to the time the seed runs, so drive lifecycles stay correct. One grant, on an upcoming drive with no applicants, expires 36 hours after seeding so that the *Expiring access* KPI has a value. Re-run the seed before a demo to refresh dates.

### Running it

```powershell
# .env (or shell): use an isolated database whose name contains "demo"
#   MONGODB_URI=mongodb://localhost:27017/placecampus_demo
#   DEMO_MODE=true
#   DEMO_ACCOUNT_PASSWORD=<choose a local password>
corepack pnpm --filter @placecampus/api seed:recruiter-demo   # create or refresh
corepack pnpm --filter @placecampus/api reset:recruiter-demo  # remove only demo-tagged records
```

Sign in at `/recruiter/login` as `recruiter.demo@placecampus.local` with the `DEMO_ACCOUNT_PASSWORD` value.

### Safety

- The seed refuses to run unless `DEMO_MODE=true` is set.
- It refuses to run when `NODE_ENV=production`.
- It refuses any database whose name does not contain `demo`, so it never writes into a real university database.
- It never runs automatically.
- It refuses to overwrite an existing account that is not a demo account.
- **Idempotent**: records are upserted on stable keys (email, student and drive, application and round, notification key). Demo rows that the generator no longer produces are pruned, so repeated runs produce identical counts.
- Reset and pruning delete only records tagged with the dataset ID.
- Demo recruiters see only demo grants, and real recruiters never see demo grants (`RecruiterAccessService`). Real analytics therefore never include demo rows.
- The UI shows *"DEMO ENVIRONMENT — Displaying fictional placement and student records for demonstration purposes."* when the signed-in recruiter's grants are demo grants.

## Verification performed

The following was checked against a throwaway in-memory MongoDB:

- The three seed guards refused as intended.
- Two consecutive seeds produced identical counts, with no duplicate student–drive pairs, no ineligible applications, and no interviews on applications below the interview stage.
- An end-to-end script logged in as Demo Recruiter. It confirmed that KPIs, pipeline, per-drive applicants, cross-drive totals, trend, drive and branch analytics all matched database counts (284). It also tested search, filters and validation, and confirmed that a shortlist stage change and note persisted while an illegal backwards move was rejected.
- Reset removed only demo-tagged records; a pre-existing non-demo user remained.

## Known limitations

- Applications have no separate resume field. The resume reference is the student profile's `resumeUrl`, shown when `resumeUrl` is released.
- Profile images use initials or logo placeholders. The user schema has no avatar field.
- Analytics aggregate in the API process over the recruiter's assigned drives. This suits a recruiter's scope; a portfolio with tens of thousands of applications would need a MongoDB aggregation pipeline.
- Stage changes for live (non-demo) data remain with placement officers.
