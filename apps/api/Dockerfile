# ─── Stage 1: Dependencies ───────────────────
FROM node:24-alpine AS deps
WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json* ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api/package.json ./apps/api/

# Install all dependencies
RUN npm ci --workspace=packages/shared-types --workspace=apps/api --include-workspace-root

# ─── Stage 2: Build ─────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .

# Build shared types first, then api
RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=apps/api

# ─── Stage 3: Production ────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built artifacts
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./package.json

USER nestjs

EXPOSE 4000

CMD ["node", "dist/main.js"]
