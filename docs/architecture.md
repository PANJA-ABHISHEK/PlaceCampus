# SkillBridge Architecture

## System Overview

SkillBridge is a modular monorepo consisting of a Next.js frontend, NestJS backend, and shared TypeScript packages. The system is designed around evidence-based skill verification and placement readiness analysis.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                         │
│                                                           │
│   Next.js 16 (App Router)                                │
│   ├── Server Components (data fetching, SEO)             │
│   ├── Client Components (interactivity, forms)           │
│   ├── TanStack Query (server state management)           │
│   └── React Hook Form + Zod (validation)                 │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                       API LAYER                           │
│                                                           │
│   NestJS 12 (REST API)                                   │
│   ├── Auth Guards (JWT + RBAC)                           │
│   ├── Validation Pipes (class-validator DTOs)            │
│   ├── Response Interceptor (ApiResponse<T>)              │
│   ├── Exception Filter (ApiError)                        │
│   └── Module-based architecture                          │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                     SERVICE LAYER                         │
│                                                           │
│   ├── Eligibility Engine (deterministic rules)           │
│   ├── Readiness Engine (configurable weights)            │
│   ├── Matching Engine (skill gap analysis)               │
│   ├── AI Service (LLM abstraction)                       │
│   └── Notification Service                               │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                      DATA LAYER                           │
│                                                           │
│   ├── MongoDB 7 (Mongoose ODM)                           │
│   │   ├── Users, Profiles                                │
│   │   ├── Skills, Evidence, Claims                       │
│   │   ├── Drives, Eligibility, Readiness                 │
│   │   └── Audit Logs                                     │
│   │                                                       │
│   ├── Redis 7 (Caching + Queues)                         │
│   │   ├── Session cache                                  │
│   │   ├── API response cache                             │
│   │   └── BullMQ job queues                              │
│   │                                                       │
│   └── Cloud Storage (Cloudinary)                         │
│       └── File uploads (resumes, certificates)           │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## Module Architecture (Backend)

Each NestJS module follows this pattern:

```
module/
├── module.module.ts       → Module declaration
├── module.controller.ts   → HTTP route handlers
├── module.service.ts      → Business logic
├── dto/                   → Request/response DTOs
├── schemas/               → Mongoose schemas
├── guards/                → Module-specific guards
└── interfaces/            → Module-specific types
```

## Core Engine Separation

### Eligibility Engine
- **Input**: Student profile + Drive eligibility criteria
- **Logic**: Deterministic rule evaluation (CGPA ≥ X, backlogs ≤ Y, branch ∈ [A, B])
- **Output**: `EligibilityResult` with pass/fail per criterion
- **Rule**: NO AI involvement. Pure boolean logic.

### Readiness Engine
- **Input**: Student verified skills + Drive skill requirements + Assessment scores + Interview scores
- **Logic**: Weighted multi-dimensional scoring
- **Output**: `ReadinessResult` with per-dimension percentages + explanation
- **Rule**: Weights are configurable. Every result is explainable.

### Matching Engine
- **Input**: Student skill claims (verified) + Drive skill requirements
- **Output**: Skill-by-skill gap analysis with priority ranking
- **Rule**: Only verified evidence contributes to official skill levels.

## Data Flow

```
Evidence Submission
       ↓
AI Skill Extraction (suggestions only)
       ↓
Taxonomy Matching
       ↓
Skill Claim Created (PENDING)
       ↓
Faculty Review
       ↓
   ┌───┴───┐
   ↓       ↓
VERIFIED  REJECTED
   ↓
Skill Profile Updated
   ↓
Readiness Recalculated
```

## RBAC Model

| Role               | Scope                                         |
|--------------------|-----------------------------------------------|
| STUDENT            | Own profile, evidence, skills, readiness      |
| FACULTY            | Assigned students, evidence verification      |
| PLACEMENT_OFFICER  | Drives, criteria, eligibility, analytics      |
| PLACEMENT_HEAD     | Institutional admin, approvals, analytics     |
| RECRUITER          | Approved drives only, authorized candidates   |
| ADMIN              | System config, taxonomy, user management      |

## Shared Types Package

The `@skillbridge/shared-types` package serves as the contract layer between frontend and backend, containing:

- API response wrappers (`ApiResponse<T>`, `ApiError`)
- Domain enums (`UserRole`, `SkillLevel`, `VerificationStatus`)
- Entity interfaces (`IUser`, `ISkill`, `IEvidence`, `IPlacementDrive`)
- Engine result types (`IEligibilityResult`, `IReadinessResult`, `ISkillGap`)

Both apps depend on this package, ensuring type consistency across the stack.
