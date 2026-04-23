# syntax=docker/dockerfile:1

# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.31.0 --activate
WORKDIR /app

# ─── Dependencias + Prisma Client ─────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN --mount=type=cache,id=pnpm-smartbite,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm prisma generate

# ─── Desarrollo ───────────────────────────────────────────────────────────────
# Conecta a Supabase CLI en el host (host.docker.internal).
# Pre-requisito: supabase start corriendo en el host.
FROM deps AS dev
COPY . .
EXPOSE 3000 9229

# ─── Testing e2e ──────────────────────────────────────────────────────────────
# Usado por docker-compose.test.yml con su propio PostgreSQL aislado.
FROM deps AS test
ENV NODE_ENV=test
COPY . .

# ─── Build (compilación para producción) ──────────────────────────────────────
FROM deps AS builder
COPY . .
RUN pnpm build

# ─── Producción ───────────────────────────────────────────────────────────────
FROM base AS prod
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN --mount=type=cache,id=pnpm-smartbite,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

RUN pnpm prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
