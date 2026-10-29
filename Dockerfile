FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

RUN node scripts/runtime/apply-default-runtime-authority-fix.mjs \
    && node --check backend/server.js \
    && npm run ci:build \
    && npm run test:agent-runtime \
    && npm run test:ed-narsg \
    && npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:5000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "scripts/runtime/container-entrypoint.mjs"]
