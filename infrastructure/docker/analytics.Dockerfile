# Multi-stage Dockerfile for Analytics Client App (Next.js)
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.9
WORKDIR /app

# Dependencies stage
FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client-apps/analytics/package.json ./apps/client-apps/analytics/
COPY packages ./packages

RUN pnpm install --frozen-lockfile

# Build stage
FROM dependencies AS builder
COPY apps/client-apps/analytics ./apps/client-apps/analytics
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter analytics-client build

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/client-apps/analytics/node_modules ./apps/client-apps/analytics/node_modules
COPY --from=builder /app/apps/client-apps/analytics/.next ./apps/client-apps/analytics/.next
COPY --from=builder /app/apps/client-apps/analytics/public ./apps/client-apps/analytics/public
COPY --from=builder /app/apps/client-apps/analytics/package.json ./apps/client-apps/analytics/package.json

EXPOSE 3002

CMD ["pnpm", "--filter", "analytics-client", "start"]
