# DataKiln Production Deployment Guide

This guide provides comprehensive instructions for deploying DataKiln to production environments with Docker, monitoring, and automated deployment capabilities.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Environment Setup](#environment-setup)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Monitoring & Observability](#monitoring--observability)
7. [Security Considerations](#security-considerations)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)
10. [Scaling & Performance](#scaling--performance)

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+), macOS, or Windows with WSL2
- **CPU**: 2+ cores (4+ recommended for production)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Disk**: 20GB+ available space
- **Network**: Stable internet connection

### Software Dependencies

- **Docker**: 20.10+ with Docker Compose
- **Node.js**: 18+ (for local development)
- **Git**: For version control
- **curl/wget**: For health checks and downloads

### API Keys & Services

Before deployment, ensure you have:

- **AI API Keys**: Gemini, Perplexity, Anthropic, OpenAI, Google AI
- **Domain**: Registered domain name for production
- **SSL Certificate**: For HTTPS (Let's Encrypt recommended)
- **SMTP Service**: For email notifications (optional)

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │  React Frontend │    │ Node.js Backend │
│   (Port 80/443) │◄──►│   (Port 80)     │◄──►│   (Port 3000)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   Prometheus     │    │    Puppeteer    │
│   (Port 5432)   │    │   (Port 9090)    │    │   Browser Auto   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Redis       │    │     Grafana     │    │   Node Exporter │
│   (Port 6379)   │    │   (Port 3001)    │    │   (Port 9100)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Service Descriptions

- **Backend**: Node.js/Fastify API server with Puppeteer for browser automation
- **Frontend**: React/Vite SPA served by Nginx
- **Database**: PostgreSQL for persistent data storage
- **Cache**: Redis for session and workflow state caching
- **Monitoring**: Prometheus for metrics collection, Grafana for visualization
- **Reverse Proxy**: Nginx for load balancing and SSL termination

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/datakiln.git
cd datakiln
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` with your production values:

```bash
# Essential settings
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com

# Database
POSTGRES_PASSWORD=your-secure-db-password

# API Keys
GEMINI_API_KEY=your-gemini-key
# ... other API keys

# Monitoring
GRAFANA_ADMIN_PASSWORD=your-grafana-admin-password
```

### 3. SSL Certificate Setup (Production)

```bash
# Using Let's Encrypt
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/private.key
```

## Configuration

### Docker Compose Configuration

The `docker-compose.yml` file includes:

- **Backend service** with Puppeteer support
- **Frontend service** with Nginx
- **PostgreSQL** database with persistent volumes
- **Redis** cache
- **Prometheus** monitoring
- **Grafana** dashboards
- **Node Exporter** for system metrics

### Environment Variables

Key configuration options in `.env`:

```bash
# Application
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security
ALLOWED_ORIGINS=https://yourdomain.com
API_KEY_REQUIRED=true

# Performance
MAX_PARALLEL_WORKFLOWS=10
DEFAULT_TIMEOUT_MS=300000

# Monitoring
ENABLE_PROMETHEUS_METRICS=true
```

### Nginx Configuration

Frontend includes `nginx.conf` with:

- SPA routing support
- API proxy to backend
- WebSocket proxy for real-time features
- Security headers
- Gzip compression
- SSL/TLS configuration

## Deployment

### Automated Deployment

Use the provided deployment script:

```bash
# Make script executable (first time only)
chmod +x scripts/deploy-production.sh

# Deploy to production
./scripts/deploy-production.sh
```

The script performs:
1. Pre-deployment health checks
2. Database backup
3. Service stop/start with zero-downtime
4. Health verification
5. Post-deployment cleanup

### Manual Deployment

```bash
# 1. Pull latest changes
git pull origin main

# 2. Build and start services
docker-compose up -d --build

# 3. Run health checks
curl http://localhost:3000/health
curl http://localhost/health

# 4. Check logs
docker-compose logs -f
```

### Blue-Green Deployment

For zero-downtime deployments:

```bash
# Deploy new version alongside existing
docker-compose up -d --scale backend=2 frontend=2

# Test new version
curl http://localhost:3001/health  # New backend
curl http://localhost:81/health    # New frontend

# Switch traffic (update nginx config)
docker-compose up -d --scale backend=1 frontend=1
```

## Monitoring & Observability

### Accessing Monitoring

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Application Metrics**: http://localhost:3000/metrics

### Key Metrics to Monitor

#### Application Metrics
- Request latency (p95, p99)
- Error rates by endpoint
- Workflow execution times
- Active connections

#### System Metrics
- CPU usage
- Memory consumption
- Disk I/O
- Network traffic

#### Business Metrics
- Workflows created/executed
- API calls to external services
- User sessions
- Error rates

### Alerting

Configure alerts in Prometheus for:
- Service downtime
- High error rates (>5%)
- Resource exhaustion (>90% usage)
- Slow response times (>2s)

## Security Considerations

### Network Security

```bash
# Firewall configuration
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw --force enable
```

### Container Security

- Non-root user execution
- Read-only root filesystem where possible
- No privileged containers
- Regular security updates

### Application Security

- Input validation and sanitization
- Rate limiting (100 req/min default)
- CORS configuration
- Helmet.js security headers
- Audit logging enabled

### Secrets Management

- Never commit secrets to Git
- Use environment variables
- Rotate API keys regularly
- Use Docker secrets for sensitive data

## Backup & Recovery

### Automated Backups

The deployment script creates backups automatically:

```bash
# Manual backup
./scripts/deploy-production.sh --no-backup  # Skip backup

# Restore from backup
docker-compose exec postgres psql -U datakiln -d datakiln < backup.sql
```

### Backup Strategy

- **Database**: Daily automated backups
- **Configuration**: Version controlled
- **Logs**: Rotated and archived
- **User Data**: Regular exports

### Disaster Recovery

1. **Service Failure**: Docker auto-restart
2. **Node Failure**: Deploy to backup node
3. **Data Loss**: Restore from backup
4. **Full Recovery**: Rebuild from Git + backup

## Troubleshooting

### Common Issues

#### Backend Not Starting
```bash
# Check logs
docker-compose logs backend

# Check health
curl http://localhost:3000/health

# Check environment
docker-compose exec backend env
```

#### Frontend Not Loading
```bash
# Check nginx logs
docker-compose logs frontend

# Test nginx config
docker-compose exec frontend nginx -t

# Check static files
docker-compose exec frontend ls -la /usr/share/nginx/html
```

#### Database Connection Issues
```bash
# Test connection
docker-compose exec postgres pg_isready -U datakiln -d datakiln

# Check logs
docker-compose logs postgres
```

#### High Memory Usage
```bash
# Check container stats
docker stats

# Monitor Puppeteer processes
docker-compose exec backend ps aux | grep puppeteer
```

### Debug Commands

```bash
# View all logs
docker-compose logs -f

# Enter container
docker-compose exec backend sh

# Check resource usage
docker stats

# Restart specific service
docker-compose restart backend
```

## Scaling & Performance

### Horizontal Scaling

```bash
# Scale backend services
docker-compose up -d --scale backend=3

# Load balancer configuration needed
```

### Vertical Scaling

- Increase CPU/memory limits in docker-compose.yml
- Optimize Node.js memory usage
- Configure Puppeteer for lower memory footprint

### Performance Optimization

#### Backend Optimization
- Cluster mode with PM2
- Connection pooling
- Caching strategies
- Database query optimization

#### Frontend Optimization
- Code splitting
- Asset optimization
- CDN usage
- Service worker caching

#### Database Optimization
- Connection pooling
- Query optimization
- Indexing strategy
- Read replicas (future)

### Benchmarking

```bash
# Load testing
ab -n 1000 -c 10 http://localhost:3000/health

# Memory profiling
docker-compose exec backend node --inspect --expose-gc
```

## Maintenance Procedures

### Regular Tasks

- **Daily**: Monitor dashboards, check logs
- **Weekly**: Update dependencies, security patches
- **Monthly**: Full backup verification, performance review
- **Quarterly**: Security audit, architecture review

### Update Procedure

1. Test updates in staging environment
2. Create backup
3. Deploy using automated script
4. Monitor for 24 hours
5. Rollback if issues detected

### Log Management

```bash
# View recent logs
docker-compose logs --tail=100 -f

# Export logs
docker-compose logs > logs_$(date +%Y%m%d).txt

# Log rotation (configured in docker-compose.yml)
```

## Support & Resources

### Documentation
- [API Documentation](./backend/README.md)
- [Frontend Guide](./frontend/README.md)
- [Architecture Spec](./DATA_KILN_SPEC_V40.md)

### Community Resources
- GitHub Issues for bug reports
- Discussions for questions
- Wiki for advanced topics

### Emergency Contacts
- On-call engineer: [contact info]
- Infrastructure provider: [support details]

---

## Quick Start Checklist

- [ ] Environment file configured
- [ ] SSL certificates installed
- [ ] API keys set
- [ ] Domain configured
- [ ] Firewall rules applied
- [ ] Monitoring alerts configured
- [ ] Backup schedule verified
- [ ] Deployment script tested

Run deployment:
```bash
./scripts/deploy-production.sh
```

Verify deployment:
```bash
curl https://yourdomain.com/health
open https://yourdomain.com
```