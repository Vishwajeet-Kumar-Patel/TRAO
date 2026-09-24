# ===================================================
# Stage 1: Multi-stage Builder for TypeScript backend
# ===================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and workspace package files for deterministic dependency install
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Install dependencies for building
RUN npm ci

# Copy shared library source and backend source
COPY shared ./shared
COPY backend ./backend

# Build shared types/schemas first, then compile backend TypeScript
RUN npm run build:shared
RUN npm run build:backend

# ===================================================
# Stage 2: Minimal Production Runtime
# ===================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Security: Create non-root dedicated application user
RUN addgroup -S -g 1001 appgroup && adduser -S -u 1001 appuser -G appgroup

# Copy package manifests for production dependency installation
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Install ONLY production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled artifacts from builder
COPY --from=builder --chown=appuser:appgroup /app/shared/dist ./shared/dist
COPY --from=builder --chown=appuser:appgroup /app/backend/dist ./backend/dist
COPY --from=builder --chown=appuser:appgroup /app/shared/package.json ./shared/package.json
COPY --from=builder --chown=appuser:appgroup /app/backend/package.json ./backend/package.json

# Use non-root user
USER appuser

# Expose production port (dynamically overridden by Render at runtime)
EXPOSE 5000

# Lightweight health check (no heavy LLM/DB operations)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:${PORT:-5000}/health || exit 1

# Start the Express server
CMD ["node", "backend/dist/server.js"]
