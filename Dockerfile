# Multi-stage Docker build for DataKiln Backend (Node.js + Puppeteer)
FROM node:18-alpine AS base

# Install system dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S datakiln -u 1001

# Set Puppeteer to skip downloading Chromium (we installed it manually)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
COPY backend/ ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# Production stage
FROM base AS production

# Copy production dependencies
COPY --from=deps --chown=datakiln:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=datakiln:nodejs /app/dist ./dist
COPY --from=builder --chown=datakiln:nodejs /app/package*.json ./

# Create data directories
RUN mkdir -p /app/data /app/logs && \
    chown -R datakiln:nodejs /app

# Switch to non-root user
USER datakiln

# Environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data \
    LOG_DIR=/app/logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]