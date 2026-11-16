# PlaceCampus API — build from the REPO ROOT as the Docker context:
#   docker build -f apps/api/Dockerfile .
# (On Render: Root Directory = empty, Docker Build Context = ".",
#  Dockerfile Path = "apps/api/Dockerfile")

# ─── Stage 1: Build ─────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable

# Workspace manifests + lockfile first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile --filter "@placecampus/api..."

# Sources needed by the API
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

RUN pnpm --filter @placecampus/api build

# ─── Stage 2: Runtime ───────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# pnpm node_modules are symlinked into the workspace, so keep the same layout.
# shared-types is consumed as TypeScript source (Node 24 strips types at runtime).
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-types ./packages/shared-types
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json

# StorageService writes to <cwd>/../../uploads
RUN mkdir -p /app/uploads && chown nestjs:nodejs /app/uploads

USER nestjs
WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/main.js"]
