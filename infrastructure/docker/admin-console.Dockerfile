# Multi-stage Dockerfile for IdentityHub Admin Console (Next.js)
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.9
WORKDIR /app

# Dependencies stage
FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin-console/package.json ./apps/admin-console/
COPY packages ./packages

RUN pnpm install --frozen-lockfile

# Build stage
FROM dependencies AS builder
COPY apps/admin-console ./apps/admin-console
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter admin-console build

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/admin-console/node_modules ./apps/admin-console/node_modules
COPY --from=builder /app/apps/admin-console/.next ./apps/admin-console/.next
COPY --from=builder /app/apps/admin-console/public ./apps/admin-console/public
COPY --from=builder /app/apps/admin-console/package.json ./apps/admin-console/package.json

EXPOSE 3000

CMD ["pnpm", "--filter", "admin-console", "start"]
