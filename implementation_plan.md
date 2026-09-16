# SkillBridge – Phase 1: Production Monorepo Setup

## Goal

Set up a production-ready npm workspaces monorepo with Next.js frontend, NestJS backend, shared types package, MongoDB, Redis, Docker, strict TypeScript, ESLint, Prettier, and Git hooks.

## Environment

- **Node.js**: v24.20.0
- **npm**: v11.19.0
- **OS**: Windows

---

## Proposed Changes

### 1. Root Monorepo (`skillbridge/`)

#### [NEW] `package.json`
Root workspace manifest with npm workspaces pointing to `apps/*` and `packages/*`. Scripts for dev, build, lint, typecheck, test across all workspaces.

#### [NEW] `.gitignore`
Standard Node.js/Next.js/NestJS gitignore with `node_modules`, `dist`, `.next`, `.env`, coverage, Docker volumes.

#### [NEW] `.env.example`
All required environment variables with placeholder values for MongoDB, Redis, JWT, AI, Cloudinary.

#### [NEW] `.prettierrc`
Consistent code formatting: single quotes, trailing commas, 2-space indent, 100 print width.

#### [NEW] `.prettierignore`
Skip `node_modules`, `dist`, `.next`, `coverage`.

#### [NEW] `.commitlintrc.json`
Conventional commits enforcement configuration.

#### [NEW] `.lintstagedrc.json`
Run ESLint + Prettier on staged `.ts` and `.tsx` files.

---

### 2. Shared TypeScript Config (`packages/tsconfig/`)

#### [NEW] `packages/tsconfig/package.json`
Package manifest for shared tsconfig.

#### [NEW] `packages/tsconfig/base.json`
Base strict TypeScript config: `strict: true`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `forceConsistentCasingInFileNames`, ES2022 target.

#### [NEW] `packages/tsconfig/nextjs.json`
Extends base with Next.js-specific settings: JSX preserve, module resolution bundler, incremental, Next.js plugin.

#### [NEW] `packages/tsconfig/nestjs.json`
Extends base with NestJS-specific settings: decorator metadata, CommonJS module output, declaration emit.

---

### 3. Shared ESLint Config (`packages/eslint-config/`)

#### [NEW] `packages/eslint-config/package.json`
Package manifest with dependencies on `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-config-prettier`.

#### [NEW] `packages/eslint-config/base.js`
Shared ESLint base rules: no `any`, no `@ts-ignore`, no unused vars, consistent type imports.

#### [NEW] `packages/eslint-config/nextjs.js`
Extends base + `next/core-web-vitals` for frontend linting.

#### [NEW] `packages/eslint-config/nestjs.js`
Extends base with NestJS-appropriate rules.

---

### 4. Shared Types (`packages/shared-types/`)

#### [NEW] `packages/shared-types/package.json`
Package manifest, main entry pointing to compiled output.

#### [NEW] `packages/shared-types/tsconfig.json`
Extends base tsconfig, compiles to `dist/`.

#### [NEW] `packages/shared-types/src/index.ts`
Re-exports all shared types.

#### [NEW] `packages/shared-types/src/api.ts`
`ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>`, `ApiPaginationQuery`.

#### [NEW] `packages/shared-types/src/auth.ts`
`UserRole` enum, `LoginRequest`, `RegisterRequest`, `AuthTokens`, `TokenPayload`.

#### [NEW] `packages/shared-types/src/user.ts`
`IUser`, `IStudentProfile`, `IFacultyProfile`, `IRecruiterProfile`.

#### [NEW] `packages/shared-types/src/skill.ts`
`SkillLevel` enum, `ISkill`, `ISkillClaim`, `ISkillCluster`.

#### [NEW] `packages/shared-types/src/evidence.ts`
`EvidenceType` enum, `VerificationStatus` enum, `IEvidence`.

#### [NEW] `packages/shared-types/src/drive.ts`
`DriveStatus` enum, `IPlacementDrive`, `IDriveRequirement`, `CriterionStatus` enum.

#### [NEW] `packages/shared-types/src/eligibility.ts`
`IEligibilityResult`, `IEligibilityCriterion`.

#### [NEW] `packages/shared-types/src/readiness.ts`
`IReadinessResult`, `IReadinessDimension`, `IReadinessConfig`.

#### [NEW] `packages/shared-types/src/matching.ts`
`ISkillGap`, `GapPriority` enum, `GapStatus` enum.

#### [NEW] `packages/shared-types/src/preparation.ts`
`IPreparationPlan`, `IPreparationTask`, `TaskStatus` enum.

#### [NEW] `packages/shared-types/src/notification.ts`
`NotificationType` enum, `INotification`.

#### [NEW] `packages/shared-types/src/audit.ts`
`IAuditLog`, `AuditAction` enum.

---

### 5. Next.js Frontend (`apps/web/`)

#### [NEW] Created via `create-next-app`
Next.js 15 with App Router, TypeScript, Tailwind CSS, ESLint, `@/` import alias. Initialized with `--skip-install` to control dependency installation at root.

#### [MODIFY] `apps/web/tsconfig.json`
Extend from `@skillbridge/tsconfig/nextjs.json`.

#### [MODIFY] `apps/web/package.json`
- Add `@skillbridge/shared-types` workspace dependency
- Add `typecheck` script

#### [NEW] `apps/web/.eslintrc.js`
Use `@skillbridge/eslint-config/nextjs`.

#### [NEW] `apps/web/app/layout.tsx`
Root layout with Inter font, metadata, basic shell.

#### [NEW] `apps/web/app/page.tsx`
Landing page placeholder with project branding.

---

### 6. NestJS Backend (`apps/api/`)

#### [NEW] Created via `@nestjs/cli new`
NestJS with strict TypeScript, npm package manager. Initialized with `--skip-install`.

#### [MODIFY] `apps/api/tsconfig.json`
Extend from `@skillbridge/tsconfig/nestjs.json`.

#### [MODIFY] `apps/api/package.json`
- Add `@skillbridge/shared-types` workspace dependency
- Add `typecheck` script
- Add `@nestjs/config` for environment variable management

#### [NEW] `apps/api/.eslintrc.js`
Use `@skillbridge/eslint-config/nestjs`.

#### [NEW] `apps/api/src/config/configuration.ts`
Typed configuration factory for MongoDB, Redis, JWT, AI, file upload settings.

#### [MODIFY] `apps/api/src/app.module.ts`
Import `ConfigModule.forRoot()` with validation schema.

#### [NEW] `apps/api/src/common/filters/http-exception.filter.ts`
Global exception filter using `ApiError` shape from shared types.

#### [NEW] `apps/api/src/common/interceptors/response.interceptor.ts`
Transform all successful responses into `ApiResponse<T>` shape.

---

### 7. Docker (`docker-compose.yml`, Dockerfiles)

#### [NEW] `docker-compose.yml`
Services: `web` (Next.js, port 3000), `api` (NestJS, port 4000), `mongodb` (port 27017 with volume), `redis` (port 6379 with volume). Uses `.env` for configuration.

#### [NEW] `apps/web/Dockerfile`
Multi-stage build: deps → build → production. Uses Node 24 alpine.

#### [NEW] `apps/api/Dockerfile`
Multi-stage build: deps → build → production. Uses Node 24 alpine.

#### [NEW] `.dockerignore`
Exclude `node_modules`, `.next`, `dist`, `.git`, `.env`.

---

### 8. Git Hooks (Husky + lint-staged + commitlint)

Configured via Husky `pre-commit` (runs lint-staged) and `commit-msg` (runs commitlint).

---

### 9. Documentation

#### [NEW] `README.md`
Project overview, architecture diagram (text), tech stack, installation, environment setup, development commands, Git workflow, team module distribution.

#### [NEW] `docs/architecture.md`
Detailed architecture documentation.

#### [NEW] `docs/git-workflow.md`
Branch strategy, PR process, review guidelines.

---

## File Structure After Phase 1

```
skillbridge/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── .eslintrc.js
│   │
│   └── api/                          # NestJS backend
│       ├── src/
│       │   ├── config/
│       │   │   └── configuration.ts
│       │   ├── common/
│       │   │   ├── filters/
│       │   │   │   └── http-exception.filter.ts
│       │   │   └── interceptors/
│       │   │       └── response.interceptor.ts
│       │   ├── app.module.ts
│       │   ├── app.controller.ts
│       │   ├── app.service.ts
│       │   └── main.ts
│       ├── test/
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       ├── nest-cli.json
│       ├── package.json
│       ├── Dockerfile
│       └── .eslintrc.js
│
├── packages/
│   ├── shared-types/                  # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   ├── user.ts
│   │   │   ├── skill.ts
│   │   │   ├── evidence.ts
│   │   │   ├── drive.ts
│   │   │   ├── eligibility.ts
│   │   │   ├── readiness.ts
│   │   │   ├── matching.ts
│   │   │   ├── preparation.ts
│   │   │   ├── notification.ts
│   │   │   └── audit.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── eslint-config/                 # Shared ESLint config
│   │   ├── base.js
│   │   ├── nextjs.js
│   │   ├── nestjs.js
│   │   └── package.json
│   │
│   └── tsconfig/                      # Shared TypeScript configs
│       ├── base.json
│       ├── nextjs.json
│       ├── nestjs.json
│       └── package.json
│
├── docs/
│   ├── architecture.md
│   └── git-workflow.md
│
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── .gitignore
├── .prettierrc
├── .prettierignore
├── .commitlintrc.json
├── .lintstagedrc.json
├── package.json
└── README.md
```

---

## Verification Plan

### Automated Tests
```bash
npm run typecheck          # TypeScript compilation check across all workspaces
npm run lint               # ESLint across all workspaces
npm run build              # Production build of frontend + backend
npm test                   # Jest tests (NestJS default test suite)
```

### Manual Verification
- `npm run dev` starts both frontend (port 3000) and backend (port 4000)
- Frontend loads in browser
- Backend `/api` health endpoint responds
- `docker compose up` starts all services
- Shared types are importable from both apps

---

## Open Questions

> [!IMPORTANT]
> **shadcn/ui initialization**: Should I initialize shadcn/ui during Phase 1 with the base components (Button, Card, Input, etc.), or defer it to Phase 2 when we start building the authentication UI? Initializing now would establish the component system early for the team.

> [!NOTE]
> **Package manager**: The plan uses **npm workspaces** (native to npm 11.19.0). If you prefer **pnpm** instead, let me know before I proceed. npm workspaces are simpler and require no additional tooling.
