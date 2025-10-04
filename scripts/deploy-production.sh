#!/bin/bash

# DataKiln Production Deployment Script
# This script handles automated deployment of the DataKiln application stack

set -e  # Exit on any error

# Configuration
PROJECT_NAME="datakiln"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."

    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi

    # Check if Docker Compose is available
    if ! command -v docker-compose > /dev/null 2>&1 && ! docker compose version > /dev/null 2>&1; then
        log_error "Docker Compose is not available."
        exit 1
    fi

    # Check if required files exist
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_error "Docker Compose file '$DOCKER_COMPOSE_FILE' not found."
        exit 1
    fi

    if [ ! -f "$ENV_FILE" ]; then
        log_warning "Environment file '$ENV_FILE' not found. Using defaults."
    fi

    # Check available disk space (require at least 5GB)
    AVAILABLE_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 5 ]; then
        log_error "Insufficient disk space. At least 5GB required."
        exit 1
    fi

    log_success "Pre-deployment checks passed."
}

# Create backup
create_backup() {
    log_info "Creating backup..."

    mkdir -p "$BACKUP_DIR"

    # Backup database if running
    if docker ps | grep -q "${PROJECT_NAME}-postgres"; then
        log_info "Backing up PostgreSQL database..."
        docker exec "${PROJECT_NAME}-postgres" pg_dump -U datakiln datakiln > "${BACKUP_DIR}/database.sql" 2>/dev/null || true
    fi

    # Backup data directories
    if [ -d "./backend/data" ]; then
        cp -r ./backend/data "${BACKUP_DIR}/backend-data"
    fi

    if [ -d "./backend/logs" ]; then
        cp -r ./backend/logs "${BACKUP_DIR}/backend-logs"
    fi

    log_success "Backup created at $BACKUP_DIR"
}

# Stop existing services
stop_services() {
    log_info "Stopping existing services..."

    if docker-compose ps | grep -q "Up"; then
        docker-compose down --timeout 30
        log_success "Services stopped successfully."
    else
        log_info "No running services to stop."
    fi
}

# Pull latest images
pull_images() {
    log_info "Pulling latest Docker images..."
    docker-compose pull
    log_success "Images pulled successfully."
}

# Start services
start_services() {
    log_info "Starting services..."

    # Start with a timeout
    timeout 300 docker-compose up -d

    if [ $? -eq 0 ]; then
        log_success "Services started successfully."
    else
        log_error "Failed to start services within timeout."
        exit 1
    fi
}

# Health checks
health_checks() {
    log_info "Running health checks..."

    # Wait for services to be healthy
    max_attempts=30
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        log_info "Health check attempt $attempt/$max_attempts..."

        # Check backend health
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log_success "Backend health check passed."
            backend_healthy=true
        else
            backend_healthy=false
        fi

        # Check frontend health
        if curl -f http://localhost/health > /dev/null 2>&1; then
            log_success "Frontend health check passed."
            frontend_healthy=true
        else
            frontend_healthy=false
        fi

        # Check database connectivity
        if docker-compose exec -T postgres pg_isready -U datakiln -d datakiln > /dev/null 2>&1; then
            log_success "Database health check passed."
            db_healthy=true
        else
            db_healthy=false
        fi

        if [ "$backend_healthy" = true ] && [ "$frontend_healthy" = true ] && [ "$db_healthy" = true ]; then
            log_success "All health checks passed!"
            return 0
        fi

        sleep 10
        ((attempt++))
    done

    log_error "Health checks failed after $max_attempts attempts."
    return 1
}

# Rollback function
rollback() {
    log_error "Deployment failed. Initiating rollback..."

    # Stop failed services
    docker-compose down --timeout 30

    # Restore from backup if available
    if [ -d "$BACKUP_DIR" ]; then
        log_info "Restoring from backup..."

        if [ -f "${BACKUP_DIR}/database.sql" ]; then
            docker-compose exec -T postgres psql -U datakiln -d datakiln < "${BACKUP_DIR}/database.sql" || true
        fi

        if [ -d "${BACKUP_DIR}/backend-data" ]; then
            cp -r "${BACKUP_DIR}/backend-data"/* ./backend/data/ 2>/dev/null || true
        fi
    fi

    # Try to start previous version
    log_info "Attempting to start previous version..."
    docker-compose up -d || true

    log_error "Rollback completed. Manual intervention may be required."
    exit 1
}

# Post-deployment tasks
post_deployment_tasks() {
    log_info "Running post-deployment tasks..."

    # Clean up old images
    log_info "Cleaning up unused Docker images..."
    docker image prune -f

    # Update monitoring
    log_info "Updating monitoring configuration..."
    # Add any monitoring updates here

    log_success "Post-deployment tasks completed."
}

# Main deployment function
deploy() {
    log_info "Starting DataKiln production deployment..."

    pre_deployment_checks
    if ! $SKIP_BACKUP; then
        create_backup
    fi
    stop_services
    pull_images
    start_services

    if ! $SKIP_HEALTH_CHECK && health_checks; then
        post_deployment_tasks
        log_success "Deployment completed successfully!"
        log_info "Application is available at:"
        log_info "  Frontend: http://localhost"
        log_info "  Backend API: http://localhost:3000"
        log_info "  Monitoring: http://localhost:9090 (Prometheus), http://localhost:3001 (Grafana)"
    else
        rollback
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "DataKiln Production Deployment Script"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  --no-backup         Skip backup creation"
    echo "  --no-health-check   Skip health checks after deployment"
    echo "  --rollback-only     Only perform rollback operations"
    echo ""
    echo "Environment variables:"
    echo "  DOCKER_COMPOSE_FILE  Path to docker-compose file (default: docker-compose.yml)"
    echo "  ENV_FILE            Path to environment file (default: .env)"
}

# Parse command line arguments
SKIP_BACKUP=false
SKIP_HEALTH_CHECK=false
ROLLBACK_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        --no-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --no-health-check)
            SKIP_HEALTH_CHECK=true
            shift
            ;;
        --rollback-only)
            ROLLBACK_ONLY=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Override defaults from environment
DOCKER_COMPOSE_FILE="${DOCKER_COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"

# Main execution
if [ "$ROLLBACK_ONLY" = true ]; then
    rollback
else
    deploy
fi