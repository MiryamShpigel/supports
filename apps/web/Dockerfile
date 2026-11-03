# Web image: the Angular build served by nginx, which also forwards /api to the API.
# Build from the repository root (npm workspaces):
#   docker build -f apps/web/Dockerfile -t supports-web .

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# The root workspace provides TypeScript.
RUN npm ci --workspace @supports/shared --workspace @supports/web --include-workspace-root
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @supports/shared && npm run build -w @supports/web

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist/web/browser /usr/share/nginx/html
EXPOSE 80
