# Multi-stage Docker build for DataKiln Frontend (React + Vite)
FROM node:18-alpine AS base

# Install dependencies for building
RUN apk add --no-cache git

WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
COPY . ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx && \
    adduser -S datakiln -u 1001 -G nginx

# Set proper permissions
RUN chown -R datakiln:nginx /usr/share/nginx/html && \
    chown -R datakiln:nginx /var/cache/nginx && \
    chown -R datakiln:nginx /var/log/nginx && \
    chown -R datakiln:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown datakiln:nginx /var/run/nginx.pid

# Switch to non-root user
USER datakiln

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]