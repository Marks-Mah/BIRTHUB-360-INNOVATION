FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @birthub/worker... build
RUN pnpm deploy --filter @birthub/worker --prod /prod/worker

FROM node:22-alpine AS runner
RUN apk add --no-cache wget
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /prod/worker ./
USER node
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1
CMD ["pnpm", "start"]
