FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ── Instalar dependencias de API por separado ──
COPY apps/api/package.json ./apps/api/
WORKDIR /app/apps/api
RUN npm install

# ── Instalar dependencias de Web por separado ──
WORKDIR /app
COPY apps/web/package.json ./apps/web/
WORKDIR /app/apps/web
RUN npm install

# ── Copiar codigo fuente ───────────────────────
WORKDIR /app
COPY apps/api/ ./apps/api/
COPY apps/web/ ./apps/web/

# ── Build API ──────────────────────────────────
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# ── Build Web ──────────────────────────────────
WORKDIR /app/apps/web
RUN npm run build

# ── Produccion ─────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Web (standalone)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Start script
COPY start.sh ./
RUN chmod +x start.sh

# Prisma generate en runner
WORKDIR /app/apps/api
RUN npx prisma generate

WORKDIR /app

USER nextjs

EXPOSE 3003 3004

CMD ["./start.sh"]
