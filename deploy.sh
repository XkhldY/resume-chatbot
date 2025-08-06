#!/bin/bash

# Production Deployment Script for Document Chatbot
#
# Automated deployment script with health checks, rollback capability,
# and monitoring integration.

set -e

# Configuration
APP_NAME="document-chatbot"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"
LOG_FILE="./deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Pre-deployment checks
pre_deploy_checks() {
    log "Running pre-deployment checks..."
    
    # Check if required files exist
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        exit 1
    fi
    
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file not found: $ENV_FILE"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running"
        exit 1
    fi
    
    # Check if required environment variables are set
    source "$ENV_FILE"
    if [[ -z "$GEMINI_API_KEY" ]]; then
        error "GEMINI_API_KEY not set in environment file"
        exit 1
    fi
    
    log "Pre-deployment checks passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="${APP_NAME}-$(date +%Y%m%d-%H%M%S)"
    
    # Backup database
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_dump \
        -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "${BACKUP_DIR}/${BACKUP_NAME}-db.sql" || true
    
    # Backup document files
    docker run --rm -v "${APP_NAME}_document-storage:/data" -v "${PWD}/${BACKUP_DIR}:/backup" \
        alpine tar czf "/backup/${BACKUP_NAME}-documents.tar.gz" -C /data . || true
    
    # Backup ChromaDB
    docker run --rm -v "${APP_NAME}_chroma-data:/data" -v "${PWD}/${BACKUP_DIR}:/backup" \
        alpine tar czf "/backup/${BACKUP_NAME}-chroma.tar.gz" -C /data . || true
    
    log "Backup created: $BACKUP_NAME"
    echo "$BACKUP_NAME" > "${BACKUP_DIR}/latest-backup.txt"
}

# Deploy application
deploy() {
    log "Starting deployment..."
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Build custom images
    log "Building custom images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
    
    # Stop existing services gracefully
    log "Stopping existing services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --timeout 30
    
    # Start services
    log "Starting services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    log "Deployment completed"
}

# Health checks
health_checks() {
    log "Running health checks..."
    
    # Wait for services to start
    log "Waiting for services to start..."
    sleep 30
    
    # Check backend health
    log "Checking backend health..."
    for i in {1..30}; do
        if curl -f http://localhost/api/health >/dev/null 2>&1; then
            log "Backend is healthy"
            break
        fi
        if [[ $i -eq 30 ]]; then
            error "Backend health check failed"
            return 1
        fi
        sleep 10
    done
    
    # Check frontend health
    log "Checking frontend health..."
    for i in {1..30}; do
        if curl -f http://localhost >/dev/null 2>&1; then
            log "Frontend is healthy"
            break
        fi
        if [[ $i -eq 30 ]]; then
            error "Frontend health check failed"
            return 1
        fi
        sleep 10
    done
    
    # Check database connectivity
    log "Checking database connectivity..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_isready -U "$POSTGRES_USER" >/dev/null 2>&1; then
        log "Database is healthy"
    else
        error "Database health check failed"
        return 1
    fi
    
    log "All health checks passed"
}

# Rollback function
rollback() {
    log "Starting rollback..."
    
    if [[ ! -f "${BACKUP_DIR}/latest-backup.txt" ]]; then
        error "No backup found for rollback"
        exit 1
    fi
    
    BACKUP_NAME=$(cat "${BACKUP_DIR}/latest-backup.txt")
    
    # Stop current services
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --timeout 30
    
    # Restore database
    if [[ -f "${BACKUP_DIR}/${BACKUP_NAME}-db.sql" ]]; then
        log "Restoring database..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d postgres
        sleep 20
        cat "${BACKUP_DIR}/${BACKUP_NAME}-db.sql" | docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres \
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    fi
    
    # Restore documents
    if [[ -f "${BACKUP_DIR}/${BACKUP_NAME}-documents.tar.gz" ]]; then
        log "Restoring documents..."
        docker run --rm -v "${APP_NAME}_document-storage:/data" -v "${PWD}/${BACKUP_DIR}:/backup" \
            alpine sh -c "cd /data && tar xzf /backup/${BACKUP_NAME}-documents.tar.gz"
    fi
    
    # Restore ChromaDB
    if [[ -f "${BACKUP_DIR}/${BACKUP_NAME}-chroma.tar.gz" ]]; then
        log "Restoring ChromaDB..."
        docker run --rm -v "${APP_NAME}_chroma-data:/data" -v "${PWD}/${BACKUP_DIR}:/backup" \
            alpine sh -c "cd /data && tar xzf /backup/${BACKUP_NAME}-chroma.tar.gz"
    fi
    
    # Start services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    log "Rollback completed"
}

# Cleanup old backups
cleanup_backups() {
    log "Cleaning up old backups..."
    find "$BACKUP_DIR" -name "${APP_NAME}-*" -type f -mtime +30 -delete
    log "Old backups cleaned up"
}

# Main deployment process
main() {
    log "Starting deployment process for $APP_NAME"
    
    case "${1:-deploy}" in
        "deploy")
            pre_deploy_checks
            create_backup
            deploy
            if ! health_checks; then
                error "Health checks failed, initiating rollback"
                rollback
                exit 1
            fi
            cleanup_backups
            log "Deployment completed successfully"
            ;;
        "rollback")
            rollback
            ;;
        "backup")
            create_backup
            ;;
        "health")
            health_checks
            ;;
        *)
            echo "Usage: $0 [deploy|rollback|backup|health]"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"