FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ── Stage 1: Instalar dependencias ─────────────
FROM base AS deps
RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install

# ── Stage 2: Construir API + Web ───────────────
FROM base AS builder
RUN npm install -g pnpm@9

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

COPY apps/api/ ./apps/api/
COPY apps/web/ ./apps/web/
COPY package.json ./

# Build API
WORKDIR /app/apps/api
RUN npx prisma generate
RUN pnpm run build

# Build Web
WORKDIR /app/apps/web
RUN pnpm run build

# ── Stage 3: Produccion ────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar API compilada
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Copiar Web compilada (standalone)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copiar script de inicio
COPY start.sh ./
RUN chmod +x start.sh

# Generar Prisma Client en runner
WORKDIR /app/apps/api
RUN npx prisma generate

WORKDIR /app

USER nextjs

EXPOSE 3003 3004

CMD ["./start.sh"]
