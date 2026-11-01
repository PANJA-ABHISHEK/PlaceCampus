# PlaceCampus

Unified Placement & Student Readiness Platform.

## Architecture

This is a modern, modular monorepo containing:

- `apps/web`: Next.js 15 frontend with App Router, Tailwind CSS, shadcn/ui, and GSAP/AOS.
- `apps/api`: NestJS backend providing REST APIs, MongoDB models, and BullMQ queues.
- `packages/shared-types`: Shared TypeScript definitions between web and api.
- `packages/eslint-config`: Shared linting rules.

## Prerequisites

- Node.js 18.17+
- pnpm 8+
- Docker (for local infrastructure)

## Setup

1. Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```
2. Start local infrastructure (MongoDB, Redis):
   ```bash
   pnpm run docker:up
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Seed development demo accounts (after MongoDB and Redis are running):
   ```bash
   pnpm --filter @placecampus/api run seed:demo
   ```
   Set `DEMO_ACCOUNT_PASSWORD` before seeding to choose a local password. The seed command refuses production unless `ENABLE_DEMO_SEED=true` is explicitly set.

## Development

Run both frontend and backend concurrently:

```bash
pnpm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Swagger Docs: http://localhost:4000/api/docs

You can also run them independently:

```bash
pnpm run dev:web
pnpm run dev:api
```

Verify the API with `curl http://localhost:4000/api/v1/health` and open Swagger at `http://localhost:4000/api/docs`. The frontend uses `NEXT_PUBLIC_API_URL` and defaults to `http://localhost:4000/api/v1`.

The seeded development accounts are `student.demo@placecampus.local`, `faculty.demo@placecampus.local`, `placement.demo@placecampus.local`, `head.demo@placecampus.local`, `recruiter.demo@placecampus.local`, and `admin.demo@placecampus.local`. Their password is the value of `DEMO_ACCOUNT_PASSWORD`, or the seed script's development default when unset. Change it for shared environments.

Run verification commands:

```bash
pnpm --filter @placecampus/api test
pnpm --filter @placecampus/api typecheck
pnpm --filter @placecampus/web typecheck
pnpm run build
```
