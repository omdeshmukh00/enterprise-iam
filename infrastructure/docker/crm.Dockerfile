# Multi-stage Dockerfile for CRM Client App (Next.js)
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.9
WORKDIR /app

# Dependencies stage
FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client-apps/crm/package.json ./apps/client-apps/crm/
COPY packages ./packages

RUN pnpm install --frozen-lockfile

# Build stage
FROM dependencies AS builder
COPY apps/client-apps/crm ./apps/client-apps/crm
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter crm-client build

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/client-apps/crm/node_modules ./apps/client-apps/crm/node_modules
COPY --from=builder /app/apps/client-apps/crm/.next ./apps/client-apps/crm/.next
COPY --from=builder /app/apps/client-apps/crm/public ./apps/client-apps/crm/public
COPY --from=builder /app/apps/client-apps/crm/package.json ./apps/client-apps/crm/package.json

EXPOSE 3001

CMD ["pnpm", "--filter", "crm-client", "start"]
