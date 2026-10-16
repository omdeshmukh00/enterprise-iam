# Multi-stage Dockerfile for IdentityHub Identity Server
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.9
WORKDIR /app

# Dependencies stage
FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/identity-server/package.json ./apps/identity-server/
COPY packages ./packages

RUN pnpm install --frozen-lockfile

# Build stage
FROM dependencies AS builder
COPY apps/identity-server ./apps/identity-server
RUN pnpm --filter identity-server db:generate
RUN pnpm --filter identity-server build

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/identity-server/node_modules ./apps/identity-server/node_modules
COPY --from=builder /app/apps/identity-server/dist ./apps/identity-server/dist
COPY --from=builder /app/apps/identity-server/prisma ./apps/identity-server/prisma
COPY --from=builder /app/apps/identity-server/package.json ./apps/identity-server/package.json
COPY packages ./packages

EXPOSE 5000

CMD ["node", "apps/identity-server/dist/server.js"]
