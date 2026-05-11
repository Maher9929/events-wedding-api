#!/usr/bin/env bash

set -Eeuo pipefail

ENVIRONMENT="${1:-production}"
DEFAULT_COMPOSE_FILE="docker-compose.yml"
if [ "$ENVIRONMENT" = "production" ]; then
  DEFAULT_COMPOSE_FILE="docker-compose.prod.yml"
fi
COMPOSE_FILE="${COMPOSE_FILE:-$DEFAULT_COMPOSE_FILE}"
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost}"
RUN_PREDEPLOY_CHECK="${RUN_PREDEPLOY_CHECK:-false}"

log() {
  printf '%s\n' "$1"
}

fail() {
  log "[FAIL] $1"
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required."
}

wait_for_url() {
  local name="$1"
  local url="$2"
  local attempts="${3:-30}"

  log "Waiting for $name at $url"

  for attempt in $(seq 1 "$attempts"); do
    if curl --fail --silent --show-error "$url" >/dev/null; then
      log "[OK] $name is ready."
      return 0
    fi

    log "Attempt $attempt/$attempts failed. Retrying in 5 seconds..."
    sleep 5
  done

  fail "$name did not become ready."
}

log "Deploying Doha Events to $ENVIRONMENT"

require_command docker
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required."

if [ ! -f ".env" ]; then
  fail ".env is missing. Copy .env.example, fill real production values, then retry."
fi

if [ "$RUN_PREDEPLOY_CHECK" = "true" ] && command -v npm >/dev/null 2>&1; then
  log "Running predeploy checks..."
  npm run predeploy:check -- --skip-docker
else
  log "[WARN] Predeploy checks not run by deploy.sh. Run npm run predeploy:check before release."
fi

log "Validating Docker Compose file..."
docker compose -f "$COMPOSE_FILE" config >/dev/null

log "Building and starting services..."
docker compose -f "$COMPOSE_FILE" up -d --build --remove-orphans

wait_for_url "backend" "$BACKEND_URL/health"
wait_for_url "frontend" "$FRONTEND_URL"

log "Running containers:"
docker compose -f "$COMPOSE_FILE" ps

log "Recent logs:"
docker compose -f "$COMPOSE_FILE" logs --tail=80

log "Deployment finished successfully."
