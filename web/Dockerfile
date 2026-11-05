# Web image for production. Build from the web/ folder:
#   docker build --build-arg SITE_URL=https://example.sslip.io -t nepnha-web web
# SITE_URL is read at build time (image config in next.config.ts) and again at run time (canonical, sitemap).
# Pages are rendered on the first request, so the build does not need the API.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG SITE_URL
RUN test -n "$SITE_URL" || (echo "Build arg SITE_URL is required" >&2; exit 1)
ENV SITE_URL=$SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules node_modules
COPY . .
RUN npx next build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
# The standalone server serves static files only when they sit next to it.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
