# API image. Build from the repository root (npm workspaces):
#   docker build -f apps/api/Dockerfile -t supports-api .
# The same image runs the API, the migrations and the seed (see docker-compose.yml).

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# The root workspace provides TypeScript.
RUN npm ci --workspace @supports/shared --workspace @supports/api --include-workspace-root
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @supports/shared && npm run build -w @supports/api

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --workspace @supports/shared --workspace @supports/api --include-workspace-root=false \
  && npm cache clean --force
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist
# tsc does not copy SQL files; migrate.js reads them next to itself.
COPY apps/api/src/db/migrations apps/api/dist/db/migrations

WORKDIR /app/apps/api
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
