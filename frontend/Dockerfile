# ===================================================
# Multi-stage Dockerfile for Next.js Frontend (Local Dev / Container Testing)
# ===================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY shared/package*.json ./shared/
COPY frontend/package*.json ./frontend/

RUN npm ci

COPY shared ./shared
COPY frontend ./frontend

RUN npm run build:shared
RUN npm run build:frontend

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 nextjs -G nodejs

COPY package*.json ./
COPY shared/package*.json ./shared/
COPY frontend/package*.json ./frontend/

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder --chown=nextjs:nodejs /app/shared/dist ./shared/dist
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next ./frontend/.next
COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./frontend/public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/next.config.mjs ./frontend/
COPY --from=builder --chown=nextjs:nodejs /app/shared/package.json ./shared/package.json
COPY --from=builder --chown=nextjs:nodejs /app/frontend/package.json ./frontend/package.json

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start:frontend"]
