# SkillBridge

**Evidence-Based Placement Skill Matching and Readiness Analysis System**

A production-quality full-stack platform that creates verified, evidence-based skill profiles for students, matches them against placement drive requirements, and provides explainable readiness analysis.

---

## 🏗️ Architecture

```
skillbridge/
├── apps/
│   ├── web/          → Next.js 16 frontend (TypeScript, Tailwind CSS)
│   └── api/          → NestJS 12 backend (TypeScript, REST API)
├── packages/
│   ├── shared-types/ → Shared TypeScript interfaces and enums
│   ├── eslint-config/→ Shared ESLint configurations
│   └── tsconfig/     → Shared TypeScript configurations
├── docs/             → Project documentation
└── docker-compose.yml → MongoDB + Redis + API + Web
```

### Key Design Decision: Eligibility ≠ Readiness

These are **completely separate engines**:

| Concept       | Engine       | Nature          | Purpose                          |
|---------------|-------------|-----------------|----------------------------------|
| **Eligibility** | Deterministic | Pass/Fail rules | Can the student apply?           |
| **Readiness**   | Configurable  | Weighted scores | How prepared is the student?     |

A student can be eligible but not ready, ready but not eligible, both, or neither.

---

## 🛠️ Tech Stack

| Layer     | Technology                                      |
|-----------|------------------------------------------------|
| Frontend  | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend   | NestJS 12, TypeScript, REST API                |
| Database  | MongoDB 7                                       |
| Cache     | Redis 7                                         |
| Auth      | JWT (Access + Refresh tokens)                   |
| AI        | LLM abstraction layer                           |
| Testing   | Vitest, Supertest                               |
| Infra     | Docker, Docker Compose                          |

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker & Docker Compose (for MongoDB + Redis)
- Git

### 1. Clone and Install

```bash
git clone <repository-url>
cd skillbridge
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Infrastructure

```bash
# Start MongoDB and Redis
docker compose up mongodb redis -d
```

### 4. Build Shared Types

```bash
npm run build:types
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend API (port 4000)
npm run dev:api

# Terminal 2: Frontend (port 3000)
npm run dev:web
```

Or run both:

```bash
npm run dev
```

### 6. Verify

- Frontend: http://localhost:3000
- API Health: http://localhost:4000/api/health

---

## 📋 Available Scripts

| Script              | Description                                |
|--------------------|--------------------------------------------|
| `npm run dev`      | Start both frontend and backend            |
| `npm run dev:web`  | Start Next.js dev server                   |
| `npm run dev:api`  | Start NestJS in watch mode                 |
| `npm run build`    | Production build all workspaces            |
| `npm run build:types` | Build shared types package              |
| `npm run lint`     | Run ESLint across all workspaces           |
| `npm run typecheck`| TypeScript type checking                   |
| `npm run test`     | Run tests across all workspaces            |
| `npm run format`   | Format code with Prettier                  |

---

## 🔑 Environment Variables

See [.env.example](.env.example) for all required variables:

| Variable               | Description                    |
|------------------------|--------------------------------|
| `MONGODB_URI`          | MongoDB connection string      |
| `REDIS_HOST`           | Redis hostname                 |
| `JWT_SECRET`           | JWT signing secret             |
| `JWT_REFRESH_SECRET`   | Refresh token signing secret   |
| `AI_API_KEY`           | LLM API key                    |
| `NEXT_PUBLIC_API_URL`  | Backend API URL for frontend   |

---

## 👥 Team Structure

| Developer | Module                                              |
|-----------|-----------------------------------------------------|
| Dev 1     | Authentication + RBAC + User Management             |
| Dev 2     | Student Portal + Evidence + Skill Profile           |
| Dev 3     | Placement Drives + Eligibility + Readiness + Matching |
| Dev 4     | Recruiter Portal + Analytics + Notifications         |

---

## 🌿 Git Workflow

```
main ← development ← feature/*
```

1. Create feature branch from `development`: `feature/auth-rbac`
2. Implement + test + lint
3. Push and create Pull Request → `development`
4. Teammate reviews and approves
5. Merge into `development`
6. Periodically merge `development` → `main`

See [docs/git-workflow.md](docs/git-workflow.md) for detailed guidelines.

---

## 🐳 Docker

### Development (infrastructure only)

```bash
docker compose up mongodb redis -d
```

### Full Stack

```bash
docker compose up --build
```

---

## 📖 Documentation

| Document                                        | Description              |
|------------------------------------------------|--------------------------|
| [Architecture](docs/architecture.md)           | System architecture       |
| [Git Workflow](docs/git-workflow.md)           | Branch strategy & PR flow |
| [API](docs/api.md)                             | API endpoints (Phase 2+)  |
| [Security](docs/security.md)                   | Auth & RBAC (Phase 2+)    |

---

## 🎓 Academic Project

This is a 4-member academic team project built with production-grade engineering practices including monorepo architecture, strict TypeScript, shared type contracts, automated linting, and containerized deployment.

**License:** UNLICENSED (Academic Use)
