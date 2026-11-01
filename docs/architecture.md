# PlaceCampus Architecture

## Overview

PlaceCampus is a unified platform for tracking student readiness, verifying skills, and connecting graduates with opportunities. The architecture is designed for scale, maintainability, and clean separation of concerns.

## Monorepo Structure

We use a pnpm workspace to manage multiple applications and shared packages within a single repository.

```
placecampus/
├── apps/
│   ├── web/                # Next.js Frontend
│   └── api/                # NestJS Backend
├── packages/
│   ├── shared-types/       # Type definitions shared between apps
│   └── eslint-config/      # Shared linting rules
├── .github/workflows/      # CI/CD Pipelines
├── docker-compose.yml      # Local infrastructure (MongoDB, Redis)
└── package.json            # Root workspace configuration
```

## Frontend (`apps/web`)

- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS + custom CSS variables (Design Tokens)
- **Component System**: shadcn/ui (Radix primitives)
- **Forms & Validation**: React Hook Form + Zod
- **Data Fetching**: TanStack Query + native `fetch` client
- **Charts**: Recharts
- **Animations**:
  - GSAP / ScrollTrigger (Complex hero motion, parallax)
  - AOS (Scroll-triggered section reveals)
  - Swiper (Carousels)

### UI Architecture

The UI is built on a robust token system defined in `globals.css` and mirrored in `lib/tokens.ts`. This ensures strict consistency for colors, typography, spacing, and animations across the application, including complex interactive elements and charts.

## Backend (`apps/api`)

- **Framework**: NestJS 12
- **Runtime**: Node.js
- **Database**: MongoDB (via Mongoose)
- **Caching & Queues**: Redis + BullMQ
- **Authentication**: JWT, Passport
- **Validation**: `class-validator` & `class-transformer`
- **Documentation**: Swagger / OpenAPI

### API Design Principles

- **Modular Design**: Features are encapsulated in their own NestJS modules (e.g., `AuthModule`, `UsersModule`).
- **Thin Controllers**: Controllers handle HTTP requests and delegate business logic to services.
- **Global Validation**: DTOs strictly validate incoming requests.
- **Unified Error Handling**: A global exception filter ensures a consistent error response structure across all endpoints.

## Infrastructure

- **Local Dev**: Docker Compose provides MongoDB and Redis instances.
- **Production Storage**: Object storage (S3-compatible) is intended for handling document uploads (resumes, evidence).
- **Background Jobs**: BullMQ handles asynchronous tasks like AI verification processing and readiness recalculations.

## Authentication & Authorization (Step 4)

- **Authentication**: JWT-based stateless authentication with `httpOnly` secure cookies for refresh tokens.
- **RBAC**: Role-based access control using the `@Roles()` decorator. Institutional roles include Student, Faculty, Recruiter, etc.
- **Token Rotation**: The backend implements strict refresh-token rotation to mitigate token theft while maintaining user sessions securely.

## Student Profile Foundation (Step 5)

- **Schema Mapping**: `StudentProfile` has a strict 1:1 relationship with the base `User` document. Identifiable data like emails remain in `User`, whereas domain data (CGPA, resume, bio) resides in `StudentProfile`.
- **API Integration**: Handled cleanly with React Hook Form + Zod locally, syncing upstream through TanStack Query (`useStudentProfile`).
- **Dashboard**: Features an authentic progress calculator reflecting genuine populated database attributes, rather than fabricated demonstration data.

## Future AI & Document Processing

The architecture includes placeholders and configuration readiness for:

- AI-based skill verification.
- OCR for processing uploaded certificates/evidence.

_This document reflects the foundational architecture setup and auth/profile milestones up to Step 5._
